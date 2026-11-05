import { Archive, ArrowLeft, CheckCircle2, MessageSquareText, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AnswerBar, CategoryChip, StatusChip, SubjectChip } from '../../components/domain/bits'
import { MistakeSheet } from '../../components/domain/MistakeSheet'
import { Button, ButtonLink, ErrorState, LoadingBlock, NotEnoughData, Panel, PanelHeader } from '../../components/ui/primitives'
import { useToast } from '../../components/ui/toast'
import { useSignedIn } from '../../context/AppContext'
import { formatDate } from '../../domain/dates'
import { RATING_WORDS, SUBJECT_LABEL, TEST_TYPE_LABEL } from '../../domain/labels'
import { scoreTest } from '../../domain/scoring'
import { SUBJECTS } from '../../domain/types'
import { useAsync } from '../../hooks/useAsync'
import { useBase } from '../../hooks/useStudentData'
import { api } from '../../services'

export default function TestDetail() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const { settings, session } = useSignedIn()
  const base = useBase()
  const navigate = useNavigate()
  const toast = useToast()
  const isStudent = session.role === 'student'
  const [sheetOpen, setSheetOpen] = useState(false)
  const [archiving, setArchiving] = useState(false)

  const q = useAsync(
    () => Promise.all([api.getTest(id), api.listMistakes({ testId: id }), api.getReflection(id)]).then(([test, mistakes, reflection]) => ({ test, mistakes, reflection })),
    [id],
  )

  if (q.error) return <ErrorState error={q.error} onRetry={q.reload} />
  if (q.loading || !q.data) return <LoadingBlock rows={4} />
  const { test, mistakes, reflection } = q.data
  const r = scoreTest(test, settings.scheme)

  const archive = async () => {
    if (!window.confirm(`Archive "${test.name}"? It will be hidden from charts and lists. Linked mistakes stay.`)) return
    setArchiving(true)
    try {
      await api.archiveTest(test.id)
      toast('Test archived')
      navigate(`${base}/tests`)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not archive', 'bad')
      setArchiving(false)
    }
  }

  return (
    <div className="space-y-5">
      <Link to={`${base}/tests`} className="inline-flex items-center gap-1 text-sm font-medium text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" /> All tests
      </Link>

      {params.get('saved') && (
        <div className="flex items-start gap-3 rounded-[18px] bg-good-soft p-4" role="status">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-good" />
          <div>
            <p className="font-semibold">Test saved.</p>
            <p className="text-sm text-ink-soft">While it's fresh, log a few mistakes or a quick reflection — or come back later.</p>
          </div>
        </div>
      )}

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[28px] font-bold leading-tight sm:text-[32px]">{test.name}</h1>
          <p className="mt-1 text-ink-soft">
            {formatDate(test.date, true)} · {TEST_TYPE_LABEL[test.type]}
            {test.source && ` · ${test.source}`}
          </p>
        </div>
        <div className="flex gap-2">
          {isStudent ? (
            <ButtonLink to={`/app/tests/${test.id}/edit`} variant="secondary" size="sm">
              <Pencil className="size-4" /> Edit
            </ButtonLink>
          ) : (
            <Button variant="secondary" size="sm" onClick={archive} loading={archiving}>
              <Archive className="size-4" /> Archive
            </Button>
          )}
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        <Panel className="bg-ink text-white sm:p-6" tone="plain" style={{ backgroundColor: 'var(--color-ink)', borderColor: 'transparent' }}>
          <p className="text-sm text-white/65">Score</p>
          <p className="font-display text-6xl font-extrabold tabular">
            {r.score}
            <span className="ml-1 text-2xl font-semibold text-white/50">/ {r.maxScore}</span>
          </p>
          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4 lg:grid-cols-2">
            <Fact label="Accuracy" value={r.accuracy === null ? '—' : `${r.accuracy}%`} />
            <Fact label="Attempted" value={`${r.attemptRate}%`} />
            <Fact label="Lost to negatives" value={`−${r.negative}`} />
            <Fact label="Time" value={test.timeTakenMin ? `${test.timeTakenMin} / ${test.durationMin} min` : `${test.durationMin} min`} />
            {test.difficulty && <Fact label="Felt difficulty" value={`${test.difficulty}/5 · ${test.difficulty >= 4 ? RATING_WORDS.difficulty[1].toLowerCase() : test.difficulty <= 2 ? 'easy' : 'medium'}`} />}
          </dl>
        </Panel>

        <Panel>
          <PanelHeader title="By subject" />
          <ul className="space-y-4">
            {r.subjects.map((s) => (
              <li key={s.subject}>
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <SubjectChip subject={s.subject} />
                  <p className="tabular text-sm text-ink-soft">
                    <span className="font-display text-xl font-bold text-ink">{s.score}</span> / {s.maxScore}
                  </p>
                </div>
                <AnswerBar correct={s.correct} incorrect={s.incorrect} unattempted={s.unattempted} subject={s.subject} />
                <p className="tabular mt-1.5 text-xs text-ink-mute">
                  {s.correct} correct · {s.incorrect} incorrect · {s.unattempted} blank · {s.accuracy === null ? 'no attempts' : `${s.accuracy}% accuracy`}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title="Mistakes from this test"
            sub={mistakes.length ? `${mistakes.length} logged` : undefined}
            action={
              isStudent && (
                <Button size="sm" variant="secondary" onClick={() => setSheetOpen(true)}>
                  <Plus className="size-4" /> Log one
                </Button>
              )
            }
          />
          {mistakes.length === 0 ? (
            <NotEnoughData>
              {isStudent ? 'None logged yet. Even 3–4 of the most annoying ones help a lot.' : 'None logged for this test yet.'}
            </NotEnoughData>
          ) : (
            <ul className="divide-y divide-line">
              {mistakes.map((m) => (
                <li key={m.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <SubjectChip subject={m.subject} />
                    <CategoryChip category={m.category} />
                    <StatusChip status={m.status} />
                  </div>
                  <p className="mt-1.5 font-medium">
                    {m.questionNumber && <span className="text-ink-mute">Q{m.questionNumber} · </span>}
                    {m.chapter} — {m.topic}
                  </p>
                  <p className="text-sm text-ink-soft">{m.whatWentWrong}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title="Reflection"
            action={
              isStudent && (
                <ButtonLink to={`/app/tests/${test.id}/reflection`} size="sm" variant="secondary">
                  {reflection ? <Pencil className="size-4" /> : <MessageSquareText className="size-4" />}
                  {reflection ? 'Edit' : 'Write one'}
                </ButtonLink>
              )
            }
          />
          {!reflection ? (
            <NotEnoughData>{isStudent ? 'Two minutes now saves guessing later: how did it feel, what to change next time?' : 'No reflection written for this test.'}</NotEnoughData>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-4 gap-2">
                {(['difficulty', 'confidence', 'concentration', 'stress'] as const).map((k) => (
                  <div key={k} className="rounded-control bg-paper px-2 py-2 text-center">
                    <p className="font-display text-xl font-bold tabular">{reflection[k]}</p>
                    <p className="text-xs capitalize text-ink-mute">{k}</p>
                  </div>
                ))}
              </div>
              <p>
                <span className="font-medium">{reflection.finishedOnTime ? 'Finished on time.' : "Didn't finish on time."}</span> {reflection.timeNotes}
              </p>
              {SUBJECTS.filter((s) => reflection.subjectNotes[s]).map((s) => (
                <p key={s}>
                  <span className="font-medium">{SUBJECT_LABEL[s]}:</span> {reflection.subjectNotes[s]}
                </p>
              ))}
              {reflection.chaptersToRevise && (
                <p>
                  <span className="font-medium">To revise:</span> {reflection.chaptersToRevise}
                </p>
              )}
              {reflection.nextTarget && (
                <p className="rounded-control bg-brand-50 px-3 py-2 text-brand-900">
                  Next-test target: <span className="font-semibold tabular">{reflection.nextTarget}</span>
                </p>
              )}
              {reflection.comments && <p className="italic text-ink-soft">“{reflection.comments}”</p>}
            </div>
          )}
        </Panel>
      </div>

      {sheetOpen && (
        <MistakeSheet
          tests={[test]}
          defaultTestId={test.id}
          onClose={() => setSheetOpen(false)}
          onSaved={() => {
            setSheetOpen(false)
            q.reload()
          }}
        />
      )}
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-white/55">{label}</dt>
      <dd className="tabular font-semibold">{value}</dd>
    </div>
  )
}
