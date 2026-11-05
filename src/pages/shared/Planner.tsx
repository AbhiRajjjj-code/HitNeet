import { ListChecks, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { TaskItem } from '../../components/domain/TaskItem'
import { Button, EmptyState, ErrorState, LoadingBlock, PageHeader, Panel } from '../../components/ui/primitives'
import { Segmented, SelectField, TextField } from '../../components/ui/form'
import { useToast } from '../../components/ui/toast'
import { useSignedIn } from '../../context/AppContext'
import { taskProgress } from '../../domain/analytics'
import { addDays, todayIST } from '../../domain/dates'
import { PRIORITY_LABEL, SUBJECT_LABEL, TASK_STATUS_LABEL } from '../../domain/labels'
import { SUBJECTS, type Priority, type Subject, type Task, type TaskStatus } from '../../domain/types'
import { useAsync } from '../../hooks/useAsync'
import { api } from '../../services'

const ORDER: TaskStatus[] = ['in_progress', 'pending', 'done', 'deferred']

export default function Planner() {
  const { session } = useSignedIn()
  const isStudent = session.role === 'student'
  const today = todayIST()
  const q = useAsync(() => api.listTasks(), [])
  const [show, setShow] = useState<'active' | 'done' | 'deferred'>('active')
  const [adding, setAdding] = useState(false)

  const progress = useMemo(() => taskProgress(q.data ?? [], today), [q.data, today])
  const list = useMemo(() => {
    const tasks = q.data ?? []
    const f = show === 'active' ? (t: Task) => t.status === 'pending' || t.status === 'in_progress' : (t: Task) => t.status === show
    const prio: Record<Priority, number> = { high: 0, medium: 1, low: 2 }
    return tasks
      .filter(f)
      .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || prio[a.priority] - prio[b.priority])
  }, [q.data, show])

  const replace = (t: Task) => q.setData((d) => (d ? (d.some((x) => x.id === t.id) ? d.map((x) => (x.id === t.id ? t : x)) : [...d, t]) : d))

  const changeStatus = async (t: Task, status: TaskStatus) => {
    replace({ ...t, status })
    try {
      replace(await api.setTaskStatus(t.id, status))
    } catch {
      replace(t)
    }
  }

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div>
      <PageHeader
        title={isStudent ? 'Planner' : 'Improvement tasks'}
        sub="Small, specific fixes that come out of tests and mistakes."
        action={
          isStudent && (
            <Button onClick={() => setAdding((v) => !v)} variant={adding ? 'secondary' : 'primary'}>
              <Plus className="size-4" /> {adding ? 'Close' : 'New task'}
            </Button>
          )
        }
      />

      {q.error ? (
        <ErrorState error={q.error} onRetry={q.reload} />
      ) : q.loading || !q.data ? (
        <LoadingBlock rows={4} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_300px] lg:items-start">
          <div className="space-y-4">
            {adding && <NewTask onCreated={(t) => (replace(t), setAdding(false))} />}
            <Segmented
              label="Show"
              value={show}
              onChange={setShow}
              options={[
                { value: 'active', label: `To do (${q.data.filter((t) => t.status === 'pending' || t.status === 'in_progress').length})` },
                { value: 'done', label: `Done (${q.data.filter((t) => t.status === 'done').length})` },
                { value: 'deferred', label: `Later (${q.data.filter((t) => t.status === 'deferred').length})` },
              ]}
            />
            {list.length === 0 ? (
              <EmptyState
                icon={<ListChecks className="size-10" />}
                title={show === 'active' ? 'Nothing to do right now' : 'Nothing here yet'}
                body={show === 'active' ? 'Turn an unresolved mistake into a task from the Mistakes page, or add one here.' : undefined}
              />
            ) : (
              <Panel className="py-1 sm:py-1">
                <ul className="divide-y divide-line">
                  {list.map((t) => (
                    <li key={t.id} className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <TaskItem task={t} onChange={replace} readOnly={!isStudent} />
                        {t.description && <p className="-mt-2 mb-3 pl-9 text-sm text-ink-mute">{t.description}</p>}
                      </div>
                      {isStudent && t.status !== 'done' && (
                        <select
                          aria-label={`Status of ${t.title}`}
                          value={t.status}
                          onChange={(e) => changeStatus(t, e.target.value as TaskStatus)}
                          className="mt-3 h-8 rounded-control border border-line bg-surface px-2 text-xs text-ink-soft"
                        >
                          {ORDER.map((s) => (
                            <option key={s} value={s}>
                              {TASK_STATUS_LABEL[s]}
                            </option>
                          ))}
                        </select>
                      )}
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </div>

          <Panel tone="quiet" className="lg:sticky lg:top-6">
            <p className="text-sm text-ink-soft">Done so far</p>
            <p className="font-display text-4xl font-bold tabular">
              {progress.done}
              <span className="text-xl font-medium text-ink-mute"> of {progress.total}</span>
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-good" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-3 text-sm text-ink-soft">
              {progress.overdue > 0
                ? `${progress.overdue} past the due date — move the date or put it on "Later". Both are fine.`
                : 'Nothing overdue.'}
            </p>
          </Panel>
        </div>
      )}
    </div>
  )
}

function NewTask({ onCreated }: { onCreated: (t: Task) => void }) {
  const toast = useToast()
  const [requestId, setRequestId] = useState(() => crypto.randomUUID())
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState<Subject | ''>('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [due, setDue] = useState(addDays(todayIST(), 3))
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState(false)

  const save = async () => {
    setTouched(true)
    if (!title.trim()) return
    setSaving(true)
    try {
      const t = await api.createTask(
        { title: title.trim(), description: '', subject: subject || null, chapter: '', testId: null, mistakeId: null, priority, status: 'pending', dueDate: due || null },
        requestId,
      )
      toast('Task added')
      setRequestId(crypto.randomUUID())
      onCreated(t)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not add the task', 'bad')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Panel className="grid gap-3 sm:grid-cols-4">
      <TextField
        label="Task"
        placeholder="e.g. 20 PYQs on Thermodynamics"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        error={touched && !title.trim() ? 'Write what you will do.' : undefined}
        className="sm:col-span-4"
        autoFocus
      />
      <SelectField label="Subject" optional value={subject} onChange={(e) => setSubject(e.target.value as Subject | '')}>
        <option value="">General</option>
        {SUBJECTS.map((s) => (
          <option key={s} value={s}>
            {SUBJECT_LABEL[s]}
          </option>
        ))}
      </SelectField>
      <SelectField label="Priority" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
        {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => (
          <option key={p} value={p}>
            {PRIORITY_LABEL[p]}
          </option>
        ))}
      </SelectField>
      <TextField label="Due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
      <div className="flex items-end">
        <Button className="w-full" onClick={save} loading={saving}>
          Add task
        </Button>
      </div>
    </Panel>
  )
}
