/**
 * Admin home: everyone who has signed up as a student.
 * Click a student to open their overview (/admin/students/:id).
 */
import { ChevronRight, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingBlock, PageHeader, Panel } from '../../components/ui/primitives'
import { daysBetween, formatDate, todayIST } from '../../domain/dates'
import { useAsync } from '../../hooks/useAsync'
import { api } from '../../services'

function ago(iso: string | null) {
  if (!iso) return 'No activity yet'
  const d = daysBetween(iso.slice(0, 10), todayIST())
  return d <= 0 ? 'Active today' : d === 1 ? 'Active yesterday' : `Active ${d} days ago`
}

export default function Students() {
  const { data, error, loading, reload } = useAsync(() => api.listStudents(), [])

  return (
    <div>
      <PageHeader title="Students" sub={data ? `${data.length} signed up` : undefined} />

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading || !data ? (
        <LoadingBlock rows={4} />
      ) : data.length === 0 ? (
        <EmptyState
          icon={<Users className="size-10" />}
          title="No students yet"
          body="Share the HitNeet link. Anyone who signs up shows up here, and you can open their progress."
        />
      ) : (
        <Panel className="p-0 sm:p-0">
          <ul className="divide-y divide-line">
            {data.map((s) => (
              <li key={s.id}>
                <Link to={`/admin/students/${s.id}`} className="flex items-center gap-4 px-4 py-4 hover:bg-paper sm:px-5">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-50 font-display text-lg font-bold text-brand-700" aria-hidden>
                    {s.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{s.name}</p>
                    <p className="truncate text-sm text-ink-mute">{s.email}</p>
                    <p className="mt-0.5 text-sm text-ink-soft sm:hidden">
                      {s.testCount} test{s.testCount === 1 ? '' : 's'} · {ago(s.lastActivity)}
                    </p>
                  </div>
                  <div className="hidden w-40 text-sm sm:block">
                    <p className="font-medium">
                      {s.testCount} test{s.testCount === 1 ? '' : 's'}
                    </p>
                    <p className="text-ink-mute">{ago(s.lastActivity)}</p>
                  </div>
                  <div className="w-24 text-right">
                    {s.latest ? (
                      <>
                        <p className="font-display text-xl font-bold tabular">
                          {s.latest.score}
                          <span className="text-sm font-medium text-ink-mute">/{s.latest.maxScore}</span>
                        </p>
                        <p className="text-xs text-ink-mute">latest · {formatDate(s.latest.date)}</p>
                      </>
                    ) : (
                      <p className="text-sm text-ink-mute">No full test yet</p>
                    )}
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-ink-mute" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  )
}
