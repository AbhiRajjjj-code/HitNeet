import { BarChart3, ChevronRight, ClipboardPlus, NotebookPen } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ScoreTrendChart } from '../../components/charts/charts'
import { Delta, SubjectChip } from '../../components/domain/bits'
import { Countdown } from '../../components/domain/Countdown'
import { ScoreTrack } from '../../components/domain/ScoreTrack'
import { TaskItem } from '../../components/domain/TaskItem'
import { ButtonLink, EmptyState, ErrorState, LoadingBlock, NotEnoughData, Panel, PanelHeader, Skeleton } from '../../components/ui/primitives'
import { useSignedIn } from '../../context/AppContext'
import { scoreNote, subjectSnapshots, summarise, taskProgress, trend, MIN_TESTS_FOR_TREND } from '../../domain/analytics'
import { formatDate, todayIST } from '../../domain/dates'
import { SUBJECT_LABEL, SUBJECT_STYLE, TEST_TYPE_LABEL } from '../../domain/labels'
import type { Task } from '../../domain/types'
import { useAsync } from '../../hooks/useAsync'
import { useStudentData } from '../../hooks/useStudentData'
import { api } from '../../services'

/** The student's dashboard (was "Home"): latest score, trend, subjects, next steps. */
export default function Analysis() {
  const { settings } = useSignedIn()
  const { data, error, loading, reload, setData, scored } = useStudentData()
  const today = todayIST()

  const summary = useMemo(() => summarise(scored), [scored])
  const points = useMemo(() => trend(scored.filter((s) => s.test.type === 'full')), [scored])
  const snaps = useMemo(() => subjectSnapshots(scored.filter((s) => s.test.type === 'full')), [scored])
  const latestId = summary.latest?.test.id
  const reflection = useAsync(() => (latestId ? api.getReflection(latestId) : Promise.resolve(null)), [latestId])

  const updateTask = (t: Task) => setData((d) => (d ? { ...d, tasks: d.tasks.map((x) => (x.id === t.id ? t : x)) } : d))

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[30px] font-bold leading-tight sm:text-[34px]">Analysis</h1>
          <p className="text-ink-mute">How your full-syllabus tests are going</p>
        </div>
        <Countdown date={settings.examDate} confirmed={settings.examDateConfirmed} />
      </header>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading || !data ? (
        <>
          <Skeleton className="h-56 w-full rounded-panel" />
          <LoadingBlock rows={2} />
        </>
      ) : !summary.latest ? (
        <EmptyState
          icon={<ClipboardPlus className="size-10" />}
          title="Your first test goes here"
          body="Add a full mock test — it takes about 3 minutes. Mistakes and reflection can wait till later."
          action={<ButtonLink to="/app">Add a test</ButtonLink>}
        />
      ) : (
        <>
          {/* Signature panel */}
          <Panel tone="brand" className="relative overflow-hidden px-5 py-5 sm:px-7 sm:py-6">
            <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3">
              <div>
                <p className="text-sm text-white/75">
                  Latest · {summary.latest.test.name}, {formatDate(summary.latest.test.date)}
                </p>
                <p className="mt-1 font-display text-[56px] font-extrabold leading-none tracking-tight tabular sm:text-[64px]">
                  {summary.latest.result.score}
                  <span className="ml-1 text-2xl font-semibold text-white/55">/ {summary.latest.result.maxScore}</span>
                </p>
              </div>
              <dl className="grid grid-cols-3 gap-x-6 gap-y-1 pt-1 text-white sm:gap-x-8">
                <Stat label="Best" value={summary.best?.result.score ?? '—'} />
                <Stat label="Average" value={summary.average ?? '—'} />
                <Stat label="Tests" value={summary.count} />
              </dl>
            </div>
            <div className="mt-5">
              <ScoreTrack latest={summary.latest} best={summary.best} average={summary.average} target={reflection.data?.nextTarget} />
            </div>
            <p className="mt-4 text-[15px] text-white/90">{scoreNote(summary)}</p>
          </Panel>

          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <Panel>
              <PanelHeader
                title="Score over time"
                sub="Full-syllabus tests"
                action={
                  <Link to="/app/progress" className="flex items-center text-sm font-medium text-brand-700 hover:underline">
                    Details <ChevronRight className="size-4" />
                  </Link>
                }
              />
              {points.length >= 2 ? (
                <ScoreTrendChart data={points} height={220} target={reflection.data?.nextTarget} />
              ) : (
                <NotEnoughData>Two or more full tests are needed to draw a trend.</NotEnoughData>
              )}
            </Panel>

            <Panel>
              <PanelHeader
                title="Next steps"
                sub={(() => {
                  const p = taskProgress(data.tasks, today)
                  return p.total ? `${p.done} of ${p.total} done` : undefined
                })()}
                action={
                  <Link to="/app/plan" className="flex items-center text-sm font-medium text-brand-700 hover:underline">
                    Planner <ChevronRight className="size-4" />
                  </Link>
                }
              />
              <NextTasks tasks={data.tasks} onChange={updateTask} />
            </Panel>
          </div>

          <section aria-labelledby="subj-h">
            <h2 id="subj-h" className="mb-3 text-lg font-semibold">
              By subject
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {snaps.map((s) => (
                <div key={s.subject} className="rounded-[18px] border border-line bg-surface p-4">
                  <div className="flex items-center justify-between">
                    <SubjectChip subject={s.subject} />
                    <Delta value={s.accuracyShift} suffix="% acc" />
                  </div>
                  <p className="mt-3 font-display text-3xl font-bold tabular">
                    {s.latestScore ?? '—'}
                    <span className="ml-1 text-base font-medium text-ink-mute">/ {s.latestMax}</span>
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper">
                    <div
                      className={`h-full rounded-full ${SUBJECT_STYLE[s.subject].bg}`}
                      style={{ width: `${s.latestScore && s.latestMax ? (Math.max(0, s.latestScore) / s.latestMax) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-ink-mute">
                    {s.avgAccuracy !== null ? `${s.avgAccuracy}% average accuracy` : 'No attempts yet'}
                    {s.accuracyShift === null && scored.length < MIN_TESTS_FOR_TREND + 1 ? ' · trend after 4 tests' : ''}
                  </p>
                  <span className="sr-only">{SUBJECT_LABEL[s.subject]}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <Panel>
              <PanelHeader
                title="Recent tests"
                action={
                  <Link to="/app/tests" className="flex items-center text-sm font-medium text-brand-700 hover:underline">
                    All tests <ChevronRight className="size-4" />
                  </Link>
                }
              />
              <ul className="divide-y divide-line">
                {[...scored].reverse().slice(0, 4).map(({ test, result }) => (
                  <li key={test.id}>
                    <Link to={`/app/tests/${test.id}`} className="-mx-2 flex items-center gap-3 rounded-control px-2 py-3 hover:bg-paper">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{test.name}</p>
                        <p className="text-sm text-ink-mute">
                          {formatDate(test.date)} · {TEST_TYPE_LABEL[test.type]}
                        </p>
                      </div>
                      <p className="font-display text-xl font-bold tabular">
                        {result.score}
                        <span className="text-sm font-medium text-ink-mute">/{result.maxScore}</span>
                      </p>
                      <ChevronRight className="size-4 text-ink-mute" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>

            <div className="grid content-start gap-3">
              <QuickAction to="/app" icon={<ClipboardPlus className="size-5" />} title="Add a test" body="About 3 minutes for the basics" />
              <QuickAction to="/app/mistakes?new=1" icon={<NotebookPen className="size-5" />} title="Log a mistake" body="Or a lucky guess worth reviewing" />
              <QuickAction to="/app/progress" icon={<BarChart3 className="size-5" />} title="See progress" body="Trends, subjects, mistake patterns" />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <dt className="text-xs text-white/65">{label}</dt>
      <dd className="font-display text-2xl font-bold tabular">{value}</dd>
    </div>
  )
}

function NextTasks({ tasks, onChange }: { tasks: Task[]; onChange: (t: Task) => void }) {
  const open = tasks
    .filter((t) => t.status === 'pending' || t.status === 'in_progress')
    .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
    .slice(0, 3)
  if (open.length === 0) return <NotEnoughData>Nothing pending. Turn a mistake into a task from the Mistakes page.</NotEnoughData>
  return (
    <div className="-my-1 divide-y divide-line">
      {open.map((t) => (
        <TaskItem key={t.id} task={t} onChange={onChange} />
      ))}
    </div>
  )
}

function QuickAction({ to, icon, title, body }: { to: string; icon: ReactNode; title: string; body: string }) {
  return (
    <Link to={to} className="group flex items-center gap-3 rounded-[18px] border border-line bg-surface p-4 transition-colors hover:border-brand-200 hover:bg-brand-50/50">
      <span className="grid size-10 place-items-center rounded-[12px] bg-brand-50 text-brand-700">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block text-sm text-ink-mute">{body}</span>
      </span>
      <ChevronRight className="size-4 text-ink-mute transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  )
}
