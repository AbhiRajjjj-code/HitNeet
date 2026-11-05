import clsx from 'clsx'
import { CalendarCheck, ListPlus, NotebookPen, Pencil, Plus, RotateCcw, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CategoryChip, StatusChip, SubjectChip } from '../../components/domain/bits'
import { MistakeSheet } from '../../components/domain/MistakeSheet'
import { Button, EmptyState, ErrorState, LoadingBlock, PageHeader } from '../../components/ui/primitives'
import { Segmented, SelectField } from '../../components/ui/form'
import { useToast } from '../../components/ui/toast'
import { useSignedIn } from '../../context/AppContext'
import { addDays, formatDate, todayIST } from '../../domain/dates'
import { CATEGORY_LABEL, SUBJECT_LABEL } from '../../domain/labels'
import { SUBJECTS, type Mistake, type MistakeCategory, type MistakeStatus, type Subject } from '../../domain/types'
import { useAsync } from '../../hooks/useAsync'
import { useBase } from '../../hooks/useStudentData'
import { api } from '../../services'

type StatusFilter = 'unresolved' | 'resolved' | 'all'

export default function Mistakes() {
  const { session } = useSignedIn()
  const base = useBase()
  const toast = useToast()
  const isStudent = session.role === 'student'
  const [params, setParams] = useSearchParams()
  const [subject, setSubject] = useState<Subject | 'all'>('all')
  const [category, setCategory] = useState<MistakeCategory | ''>('')
  const [chapter, setChapter] = useState('')
  const [status, setStatus] = useState<StatusFilter>('unresolved')
  const [editing, setEditing] = useState<Mistake | null>(null)
  const sheetOpen = isStudent && (params.get('new') === '1' || editing !== null)

  const q = useAsync(() => Promise.all([api.listMistakes(), api.listTests(), api.listTasks()]).then(([mistakes, tests, tasks]) => ({ mistakes, tests, tasks })), [])

  const chapters = useMemo(
    () => [...new Set((q.data?.mistakes ?? []).filter((m) => subject === 'all' || m.subject === subject).map((m) => m.chapter))].sort(),
    [q.data, subject],
  )
  const list = useMemo(
    () =>
      (q.data?.mistakes ?? []).filter(
        (m) =>
          (subject === 'all' || m.subject === subject) &&
          (!category || m.category === category) &&
          (!chapter || m.chapter === chapter) &&
          (status === 'all' || (status === 'resolved' ? m.status === 'resolved' : m.status !== 'resolved')),
      ),
    [q.data, subject, category, chapter, status],
  )

  const counts = useMemo(() => {
    const ms = q.data?.mistakes ?? []
    return {
      open: ms.filter((m) => m.status !== 'resolved').length,
      resolved: ms.filter((m) => m.status === 'resolved').length,
      lucky: ms.filter((m) => m.luckyGuess).length,
      dueReview: ms.filter((m) => m.status !== 'resolved' && m.reviewDate && m.reviewDate <= todayIST()).length,
    }
  }, [q.data])

  const replace = (m: Mistake) => q.setData((d) => (d ? { ...d, mistakes: d.mistakes.map((x) => (x.id === m.id ? m : x)) } : d))

  const changeStatus = async (m: Mistake, next: MistakeStatus) => {
    replace({ ...m, status: next })
    try {
      replace(await api.setMistakeStatus(m.id, next))
      toast(next === 'resolved' ? 'Marked as sorted' : 'Back on the review list')
    } catch (e) {
      replace(m)
      toast(e instanceof Error ? e.message : 'Could not update', 'bad')
    }
  }

  const makeTask = async (m: Mistake) => {
    try {
      const t = await api.createTask(
        {
          title: `${m.chapter}: ${m.topic || CATEGORY_LABEL[m.category].toLowerCase()}`,
          description: m.correctApproach,
          subject: m.subject,
          chapter: m.chapter,
          testId: m.testId,
          mistakeId: m.id,
          priority: 'medium',
          status: 'pending',
          dueDate: addDays(todayIST(), 5),
        },
        `task-from-${m.id}`, // one task per mistake, even on double-tap
      )
      q.setData((d) => (d ? { ...d, tasks: d.tasks.some((x) => x.id === t.id) ? d.tasks : [...d.tasks, t] } : d))
      toast('Added to your planner')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not create the task', 'bad')
    }
  }

  const closeSheet = () => {
    setEditing(null)
    if (params.get('new')) setParams({}, { replace: true })
  }

  return (
    <div>
      <PageHeader
        title="Mistake journal"
        sub={q.data ? `${counts.open} to review · ${counts.resolved} sorted · ${counts.lucky} lucky guesses` : undefined}
        action={
          isStudent && (
            <Button onClick={() => setParams({ new: '1' })}>
              <Plus className="size-4" /> Log a mistake
            </Button>
          )
        }
      />

      {counts.dueReview > 0 && (
        <p className="mb-4 flex items-center gap-2 rounded-control bg-sky-soft px-4 py-2.5 text-sm">
          <CalendarCheck className="size-4 text-sky" /> {counts.dueReview} {counts.dueReview === 1 ? 'mistake is' : 'mistakes are'} due for a second look.
        </p>
      )}

      <div className="mb-4 space-y-3">
        <Segmented
          label="Subject"
          value={subject}
          onChange={(v) => {
            setSubject(v)
            setChapter('')
          }}
          options={[{ value: 'all' as const, label: 'All subjects' }, ...SUBJECTS.map((s) => ({ value: s, label: SUBJECT_LABEL[s] }))]}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <SelectField label="Type" value={category} onChange={(e) => setCategory(e.target.value as MistakeCategory | '')}>
            <option value="">All types</option>
            {(Object.keys(CATEGORY_LABEL) as MistakeCategory[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </SelectField>
          <SelectField label="Chapter" value={chapter} onChange={(e) => setChapter(e.target.value)}>
            <option value="">All chapters</option>
            {chapters.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </SelectField>
          <SelectField label="Status" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className="col-span-2 sm:col-span-1">
            <option value="unresolved">To review</option>
            <option value="resolved">Sorted</option>
            <option value="all">All</option>
          </SelectField>
        </div>
      </div>

      {q.error ? (
        <ErrorState error={q.error} onRetry={q.reload} />
      ) : q.loading || !q.data ? (
        <LoadingBlock rows={4} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={<NotebookPen className="size-10" />}
          title={q.data.mistakes.length ? 'Nothing matches these filters' : 'No mistakes logged yet'}
          body={
            q.data.mistakes.length
              ? status === 'unresolved'
                ? 'Everything here is sorted. Nice work.'
                : 'Try a different filter.'
              : 'After a test, log the 3–4 that bugged you most. Patterns appear after a few tests.'
          }
          action={isStudent && !q.data.mistakes.length ? <Button onClick={() => setParams({ new: '1' })}>Log a mistake</Button> : undefined}
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {list.map((m) => {
            const test = q.data!.tests.find((t) => t.id === m.testId)
            const hasTask = q.data!.tasks.some((t) => t.mistakeId === m.id)
            return (
              <li key={m.id} className={clsx('flex flex-col rounded-[18px] border bg-surface p-4', m.status === 'resolved' ? 'border-line opacity-80' : 'border-line')}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <SubjectChip subject={m.subject} />
                  <CategoryChip category={m.category} />
                  {m.luckyGuess && (
                    <span className="inline-flex items-center gap-1 rounded-chip bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                      <Sparkles className="size-3" /> Lucky guess
                    </span>
                  )}
                  <span className="ml-auto">
                    <StatusChip status={m.status} />
                  </span>
                </div>
                <p className="mt-2 font-semibold leading-snug">
                  {m.chapter}
                  {m.topic && <span className="font-normal text-ink-soft"> — {m.topic}</span>}
                </p>
                <p className="mt-1 text-sm text-ink-soft">{m.whatWentWrong}</p>
                {m.correctApproach && (
                  <p className="mt-2 rounded-control bg-good-soft/60 px-3 py-2 text-sm">
                    <span className="font-medium text-good">Fix: </span>
                    {m.correctApproach}
                  </p>
                )}
                <p className="mt-2 text-xs text-ink-mute">
                  {test ? (
                    <Link to={`${base}/tests/${test.id}`} className="hover:underline">
                      {test.name}
                    </Link>
                  ) : (
                    'Test'
                  )}
                  {m.questionNumber && ` · Q${m.questionNumber}`} · confidence {m.confidence}/5
                  {m.reviewDate && m.status !== 'resolved' && ` · review ${formatDate(m.reviewDate)}`}
                </p>
                {isStudent && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                    {m.status === 'resolved' ? (
                      <Button size="sm" variant="ghost" onClick={() => changeStatus(m, 'open')}>
                        <RotateCcw className="size-4" /> Reopen
                      </Button>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => changeStatus(m, 'resolved')}>
                        Mark sorted
                      </Button>
                    )}
                    {m.status !== 'resolved' &&
                      (hasTask ? (
                        <span className="inline-flex h-9 items-center px-2 text-sm text-ink-mute">In planner</span>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => makeTask(m)}>
                          <ListPlus className="size-4" /> Make a task
                        </Button>
                      ))}
                    <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setEditing(m)} aria-label="Edit mistake">
                      <Pencil className="size-4" />
                    </Button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {sheetOpen && q.data && (
        <MistakeSheet
          tests={q.data.tests}
          existing={editing ?? undefined}
          onClose={closeSheet}
          onSaved={(m) => {
            q.setData((d) => (d ? { ...d, mistakes: d.mistakes.some((x) => x.id === m.id) ? d.mistakes.map((x) => (x.id === m.id ? m : x)) : [m, ...d.mistakes] } : d))
            closeSheet()
          }}
        />
      )}
    </div>
  )
}
