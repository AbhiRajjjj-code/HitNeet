import { ChevronRight, ClipboardList, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnswerBar } from '../../components/domain/bits'
import { ButtonLink, EmptyState, ErrorState, LoadingBlock, PageHeader, Panel } from '../../components/ui/primitives'
import { SelectField } from '../../components/ui/form'
import { useSignedIn } from '../../context/AppContext'
import { addDays, formatDate, todayIST } from '../../domain/dates'
import { TEST_TYPE_LABEL } from '../../domain/labels'
import { scoreTest } from '../../domain/scoring'
import type { TestType } from '../../domain/types'
import { useAsync } from '../../hooks/useAsync'
import { useBase } from '../../hooks/useStudentData'
import { api } from '../../services'

const RANGES = { all: 'All time', '30': 'Last 30 days', '90': 'Last 90 days' } as const

export default function Tests() {
  const { settings, session } = useSignedIn()
  const base = useBase()
  const isStudent = session.role === 'student'
  const [type, setType] = useState<TestType | ''>('')
  const [source, setSource] = useState('')
  const [range, setRange] = useState<keyof typeof RANGES>('all')
  const { data, error, loading, reload } = useAsync(() => api.listTests({ includeDrafts: true }), [])

  const sources = useMemo(() => [...new Set((data ?? []).map((t) => t.source).filter(Boolean))].sort(), [data])
  const rows = useMemo(() => {
    if (!data) return []
    const from = range === 'all' ? '' : addDays(todayIST(), -Number(range))
    return data
      .filter((t) => (!type || t.type === type) && (!source || t.source === source) && (!from || t.date >= from))
      .map((t) => ({ test: t, result: scoreTest(t, settings.scheme) }))
  }, [data, type, source, range, settings.scheme])

  return (
    <div>
      <PageHeader
        title="Tests"
        sub={data ? `${data.length} test${data.length === 1 ? '' : 's'} recorded` : undefined}
        action={
          isStudent && (
            <ButtonLink to="/app/tests/new">
              <Plus className="size-4" /> Add a test
            </ButtonLink>
          )
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SelectField label="Type" value={type} onChange={(e) => setType(e.target.value as TestType | '')}>
          <option value="">All types</option>
          {(Object.keys(TEST_TYPE_LABEL) as TestType[]).map((t) => (
            <option key={t} value={t}>
              {TEST_TYPE_LABEL[t]}
            </option>
          ))}
        </SelectField>
        <SelectField label="Source" value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="">All sources</option>
          {sources.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </SelectField>
        <SelectField label="When" value={range} onChange={(e) => setRange(e.target.value as keyof typeof RANGES)} className="col-span-2 sm:col-span-1">
          {Object.entries(RANGES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </SelectField>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading ? (
        <LoadingBlock rows={5} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-10" />}
          title={data?.length ? 'No tests match these filters' : 'No tests yet'}
          body={data?.length ? 'Try clearing a filter.' : 'Add a test and it will show up here.'}
          action={isStudent && !data?.length ? <ButtonLink to="/app/tests/new">Add a test</ButtonLink> : undefined}
        />
      ) : (
        <Panel className="p-0 sm:p-0">
          <ul className="divide-y divide-line">
            {rows.map(({ test, result }) => (
              <li key={test.id}>
                <Link to={`${base}/tests/${test.id}`} className="flex items-center gap-4 px-4 py-4 hover:bg-paper sm:px-5">
                  <div className="hidden w-14 shrink-0 text-center sm:block">
                    <p className="font-display text-2xl font-bold leading-none tabular">{test.date.slice(8)}</p>
                    <p className="text-xs text-ink-mute">{formatDate(test.date).split(' ')[1]}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2">
                      <p className="truncate font-semibold">{test.name}</p>
                      {test.status === 'draft' && <span className="rounded-chip bg-warn-soft px-2 text-xs font-medium text-warn">Draft</span>}
                    </div>
                    <p className="text-sm text-ink-mute">
                      <span className="sm:hidden">{formatDate(test.date)} · </span>
                      {TEST_TYPE_LABEL[test.type]}
                      {test.source && ` · ${test.source}`}
                    </p>
                    <div className="mt-2 flex gap-1.5">
                      {result.subjects.map((s) => (
                        <div key={s.subject} className="flex-1" style={{ flexGrow: s.totalQuestions }} title={`${s.subject}: ${s.score}/${s.maxScore}`}>
                          <AnswerBar correct={s.correct} incorrect={s.incorrect} unattempted={s.unattempted} subject={s.subject} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl font-bold leading-none tabular">{result.score}</p>
                    <p className="mt-1 text-xs text-ink-mute">of {result.maxScore}</p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-ink-mute" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-mute">
        Bars show correct answers in subject colour,{' '}
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded-sm bg-bad/70" /> incorrect
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded-sm bg-line" /> left blank
        </span>
      </p>
    </div>
  )
}
