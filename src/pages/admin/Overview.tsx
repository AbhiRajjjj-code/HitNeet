import { ChevronRight, HeartHandshake, Repeat } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ScoreTrendChart } from '../../components/charts/charts'
import { CategoryChip, Delta, SubjectChip } from '../../components/domain/bits'
import { ErrorState, LoadingBlock, NotEnoughData, PageHeader, Panel, PanelHeader } from '../../components/ui/primitives'
import { useSignedIn } from '../../context/AppContext'
import { recurringPatterns, subjectSnapshots, summarise, taskProgress, trend } from '../../domain/analytics'
import { daysBetween, formatDate, todayIST } from '../../domain/dates'
import { useAsync } from '../../hooks/useAsync'
import { useBase, useStudentData } from '../../hooks/useStudentData'
import { api } from '../../services'

export default function AdminOverview() {
  const { settings } = useSignedIn()
  const { data, error, loading, reload, scored, studentId } = useStudentData()
  const base = useBase()
  const student = useAsync(() => api.getStudent(studentId), [studentId])
  const today = todayIST()
  const full = useMemo(() => scored.filter((s) => s.test.type === 'full'), [scored])
  const summary = useMemo(() => summarise(scored), [scored])
  const snaps = useMemo(() => subjectSnapshots(full), [full])
  const patterns = useMemo(() => recurringPatterns(data?.mistakes ?? []), [data])
  const latestId = summary.latest?.test.id
  const reflection = useAsync(() => (latestId ? api.getReflection(latestId) : Promise.resolve(null)), [latestId])

  if (error) return <ErrorState error={error} onRetry={reload} />
  if (loading || !data) return <LoadingBlock rows={4} />

  const tp = taskProgress(data.tasks, today)
  const open = data.mistakes.filter((m) => m.status !== 'resolved').length
  const lastTestDaysAgo = summary.latest ? daysBetween(summary.latest.test.date, today) : null

  return (
    <div className="space-y-5">
      <PageHeader title={student.data ? `${student.data.name}'s progress` : 'Progress'} sub={`${daysBetween(today, settings.examDate)} days to NEET · ${formatDate(settings.examDate, true)}`} />

      <p className="flex items-start gap-2.5 rounded-[18px] bg-brand-50 px-4 py-3 text-sm text-brand-900">
        <HeartHandshake className="mt-0.5 size-5 shrink-0" />
        This view is for spotting where to help. Look at trends over several tests, and talk about patterns rather than single scores.
      </p>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Tests recorded" value={summary.count} note={lastTestDaysAgo !== null ? `last one ${lastTestDaysAgo === 0 ? 'today' : `${lastTestDaysAgo}d ago`}` : undefined} />
        <Kpi label="Latest full test" value={summary.latest?.result.score ?? '—'} note={<Delta value={summary.recentChange} suffix=" vs recent avg" />} />
        <Kpi label="Best" value={summary.best?.result.score ?? '—'} note="out of 720" />
        <Kpi label="Average" value={summary.average ?? '—'} note="full tests" />
      </dl>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Panel>
          <PanelHeader
            title="Score trend"
            action={
              <Link to={`${base}/progress`} className="flex items-center text-sm font-medium text-brand-700 hover:underline">
                Full analytics <ChevronRight className="size-4" />
              </Link>
            }
          />
          {full.length >= 2 ? <ScoreTrendChart data={trend(full)} height={240} /> : <NotEnoughData>Needs two or more full tests.</NotEnoughData>}
        </Panel>
        <Panel>
          <PanelHeader title="Subjects" sub="Average accuracy, change over last 3 tests" />
          <ul className="space-y-3">
            {snaps.map((s) => (
              <li key={s.subject} className="flex items-center justify-between gap-2">
                <SubjectChip subject={s.subject} />
                <span className="flex items-baseline gap-2">
                  <span className="font-display text-xl font-bold tabular">{s.avgAccuracy ?? '—'}%</span>
                  <Delta value={s.accuracyShift} suffix="%" />
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel>
          <PanelHeader
            title="Mistakes to review"
            action={
              <Link to={`${base}/mistakes`} className="flex items-center text-sm font-medium text-brand-700 hover:underline">
                Journal <ChevronRight className="size-4" />
              </Link>
            }
          />
          <p className="font-display text-4xl font-bold tabular">{open}</p>
          <p className="text-sm text-ink-mute">of {data.mistakes.length} logged · {data.mistakes.filter((m) => m.luckyGuess).length} lucky guesses</p>
          <h3 className="mt-4 mb-2 font-sans text-sm font-semibold">Coming up again</h3>
          {patterns.length === 0 ? (
            <NotEnoughData>No repeats across tests yet.</NotEnoughData>
          ) : (
            <ul className="space-y-2">
              {patterns.slice(0, 3).map((p) => (
                <li key={p.chapter} className="flex items-start gap-2 text-sm">
                  <Repeat className="mt-0.5 size-4 shrink-0 text-brand-500" />
                  <span>
                    <span className="font-medium">{p.chapter}</span>
                    <span className="text-ink-mute"> — {p.testCount} tests</span>
                    {p.category && (
                      <span className="ml-1">
                        <CategoryChip category={p.category} />
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title="Tasks"
            action={
              <Link to={`${base}/tasks`} className="flex items-center text-sm font-medium text-brand-700 hover:underline">
                All <ChevronRight className="size-4" />
              </Link>
            }
          />
          <p className="font-display text-4xl font-bold tabular">
            {tp.done}
            <span className="text-xl font-medium text-ink-mute"> / {tp.total}</span>
          </p>
          <p className="text-sm text-ink-mute">done{tp.overdue ? ` · ${tp.overdue} past due date` : ''}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper">
            <div className="h-full rounded-full bg-good" style={{ width: `${tp.total ? (tp.done / tp.total) * 100 : 0}%` }} />
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Latest reflection" sub={summary.latest?.test.name} />
          {!reflection.data ? (
            <NotEnoughData>No reflection for the latest test.</NotEnoughData>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {(['confidence', 'stress', 'concentration', 'difficulty'] as const).map((k) => (
                  <div key={k} className="rounded-control bg-paper px-3 py-2">
                    <span className="capitalize text-ink-mute">{k}</span> <span className="float-right font-semibold tabular">{reflection.data![k]}/5</span>
                  </div>
                ))}
              </div>
              {reflection.data.comments && <p className="mt-3 text-sm italic text-ink-soft">“{reflection.data.comments}”</p>}
              {reflection.data.chaptersToRevise && <p className="mt-2 text-sm">Wants to revise: {reflection.data.chaptersToRevise}</p>}
            </>
          )}
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title="Recent tests"
          action={
            <Link to={`${base}/tests`} className="flex items-center text-sm font-medium text-brand-700 hover:underline">
              History <ChevronRight className="size-4" />
            </Link>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-ink-mute">
                <th className="py-2 font-medium">Test</th>
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 text-right font-medium">Phy</th>
                <th className="py-2 text-right font-medium">Chem</th>
                <th className="py-2 text-right font-medium">Bio</th>
                <th className="py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[...scored].reverse().slice(0, 6).map(({ test, result }) => {
                const by = (s: string) => result.subjects.find((x) => x.subject === s)?.score ?? '—'
                return (
                  <tr key={test.id}>
                    <td className="py-2.5 pr-3">
                      <Link to={`${base}/tests/${test.id}`} className="font-medium hover:underline">
                        {test.name}
                      </Link>
                    </td>
                    <td className="py-2.5 text-ink-mute">{formatDate(test.date)}</td>
                    <td className="tabular py-2.5 text-right">{by('physics')}</td>
                    <td className="tabular py-2.5 text-right">{by('chemistry')}</td>
                    <td className="tabular py-2.5 text-right">{by('biology')}</td>
                    <td className="tabular py-2.5 text-right font-semibold">
                      {result.score}
                      <span className="font-normal text-ink-mute">/{result.maxScore}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}

function Kpi({ label, value, note }: { label: string; value: number | string; note?: ReactNode }) {
  return (
    <div className="rounded-[18px] border border-line bg-surface p-4">
      <dt className="text-sm text-ink-mute">{label}</dt>
      <dd className="mt-1 font-display text-3xl font-bold tabular">{value}</dd>
      {note && <dd className="mt-0.5 text-xs text-ink-mute">{note}</dd>}
    </div>
  )
}
