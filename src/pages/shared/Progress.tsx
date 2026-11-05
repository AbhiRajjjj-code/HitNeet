import { Info, Repeat } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  AccuracyAttemptChart,
  CategoryBars,
  DifficultyChart,
  NegativeMarksChart,
  ScoreTrendChart,
  SubjectTrendChart,
} from '../../components/charts/charts'
import { CategoryChip, SubjectChip } from '../../components/domain/bits'
import { ErrorState, LoadingBlock, NotEnoughData, PageHeader, Panel, PanelHeader } from '../../components/ui/primitives'
import { Segmented, SelectField } from '../../components/ui/form'
import {
  chapterRows,
  mistakesByCategory,
  recurringPatterns,
  trend,
  MIN_MISTAKES_FOR_CHAPTER,
  MIN_TESTS_FOR_TREND,
} from '../../domain/analytics'
import { addDays, todayIST } from '../../domain/dates'
import { TEST_TYPE_LABEL } from '../../domain/labels'
import type { TestType } from '../../domain/types'
import { useStudentData } from '../../hooks/useStudentData'

const RANGES = { all: 'All time', '90': 'Last 90 days', '30': 'Last 30 days' } as const

export default function Progress() {
  const { data, error, loading, reload, scored } = useStudentData()
  const [type, setType] = useState<TestType>('full')
  const [range, setRange] = useState<keyof typeof RANGES>('all')
  const [subjMode, setSubjMode] = useState<'score' | 'accuracy'>('accuracy')

  const from = range === 'all' ? '' : addDays(todayIST(), -Number(range))
  const filtered = useMemo(() => scored.filter((s) => s.test.type === type && (!from || s.test.date >= from)), [scored, type, from])
  const points = useMemo(() => trend(filtered), [filtered])
  const testIds = useMemo(() => new Set(filtered.map((s) => s.test.id)), [filtered])
  const mistakes = useMemo(() => (data?.mistakes ?? []).filter((m) => testIds.has(m.testId)), [data, testIds])
  const cats = useMemo(() => mistakesByCategory(mistakes), [mistakes])
  const patterns = useMemo(() => recurringPatterns(mistakes), [mistakes])
  const chapters = useMemo(() => chapterRows(mistakes), [mistakes])
  const enoughForTrend = points.length >= MIN_TESTS_FOR_TREND

  return (
    <div>
      <PageHeader title="Progress" sub="Trends over time. One test is a data point, not a verdict." />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:max-w-md">
        <SelectField label="Test type" value={type} onChange={(e) => setType(e.target.value as TestType)}>
          {(Object.keys(TEST_TYPE_LABEL) as TestType[]).map((t) => (
            <option key={t} value={t}>
              {TEST_TYPE_LABEL[t]}
            </option>
          ))}
        </SelectField>
        <SelectField label="Period" value={range} onChange={(e) => setRange(e.target.value as keyof typeof RANGES)}>
          {Object.entries(RANGES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </SelectField>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading || !data ? (
        <LoadingBlock rows={4} />
      ) : (
        <div className="space-y-5">
          {!enoughForTrend && (
            <NotEnoughData>
              {points.length === 0
                ? `No ${TEST_TYPE_LABEL[type].toLowerCase()} tests in this period.`
                : `${points.length} test${points.length === 1 ? '' : 's'} so far — trends get meaningful from ${MIN_TESTS_FOR_TREND}.`}
            </NotEnoughData>
          )}

          {points.length > 0 && (
            <>
              <Panel>
                <PanelHeader title="Score" sub={`${points.length} tests`} />
                <ScoreTrendChart data={points} height={260} />
              </Panel>

              <div className="grid gap-5 lg:grid-cols-2">
                <Panel>
                  <PanelHeader
                    title="By subject"
                    action={
                      <Segmented
                        label="Subject chart mode"
                        value={subjMode}
                        onChange={setSubjMode}
                        options={[
                          { value: 'accuracy', label: 'Accuracy' },
                          { value: 'score', label: 'Marks' },
                        ]}
                      />
                    }
                  />
                  <SubjectTrendChart data={points} mode={subjMode} />
                  <Legend />
                </Panel>
                <Panel>
                  <PanelHeader title="Accuracy vs attempted" sub="Attempting more only helps if accuracy holds." />
                  <AccuracyAttemptChart data={points} />
                  <div className="mt-2 flex gap-4 text-xs text-ink-mute">
                    <span className="flex items-center gap-1.5">
                      <span className="h-0.5 w-4 bg-brand-600" /> Accuracy
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-0.5 w-4 border-t-2 border-dashed border-sky" /> Attempted
                    </span>
                  </div>
                </Panel>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <Panel>
                  <PanelHeader
                    title="Marks lost to negatives"
                    sub={`${points.reduce((a, p) => a + p.negative, 0)} in total across these tests`}
                  />
                  <NegativeMarksChart data={points} />
                </Panel>
                <Panel>
                  <PanelHeader title="Score vs how hard it felt" sub="Bars are your own 1–5 rating — context, not an excuse." />
                  <DifficultyChart data={points} />
                </Panel>
              </div>
            </>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel>
              <PanelHeader title="Types of mistakes" sub={mistakes.length ? `${mistakes.length} logged in these tests` : undefined} />
              {cats.length ? <CategoryBars data={cats} /> : <NotEnoughData>No mistakes logged for these tests yet.</NotEnoughData>}
            </Panel>
            <Panel>
              <PanelHeader title="Coming up again" sub="Same chapter in 2 or more different tests" />
              {patterns.length === 0 ? (
                <NotEnoughData>Nothing has repeated across tests yet.</NotEnoughData>
              ) : (
                <ul className="divide-y divide-line">
                  {patterns.slice(0, 6).map((p) => (
                    <li key={`${p.subject}-${p.chapter}`} className="flex items-start gap-3 py-3">
                      <Repeat className="mt-0.5 size-4 shrink-0 text-brand-500" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{p.chapter}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-mute">
                          <SubjectChip subject={p.subject} />
                          {p.category && <CategoryChip category={p.category} />}
                          <span>
                            {p.count} in {p.testCount} tests · {p.open} to review
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <Panel>
            <PanelHeader title="Chapters" sub="Where mistakes were logged" />
            <p className="mb-3 flex items-start gap-2 rounded-control bg-sky-soft px-3 py-2.5 text-sm text-ink-soft">
              <Info className="mt-0.5 size-4 shrink-0 text-sky" />
              This counts logged mistakes per chapter. It isn't chapter accuracy — subject totals can't tell us how many questions each chapter had.
            </p>
            {chapters.length === 0 ? (
              <NotEnoughData>Log mistakes with a chapter and they'll group here.</NotEnoughData>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="text-left text-ink-mute">
                      <th className="py-2 font-medium">Chapter</th>
                      <th className="py-2 font-medium">Subject</th>
                      <th className="py-2 text-right font-medium">Logged</th>
                      <th className="py-2 text-right font-medium">To review</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {chapters.map((c) => (
                      <tr key={`${c.subject}-${c.chapter}`}>
                        <td className="py-2.5 pr-3 font-medium">
                          {c.chapter}
                          {!c.enoughData && <span className="ml-2 text-xs font-normal text-ink-mute">few entries</span>}
                        </td>
                        <td className="py-2.5">
                          <SubjectChip subject={c.subject} />
                        </td>
                        <td className="tabular py-2.5 text-right">{c.logged}</td>
                        <td className="tabular py-2.5 text-right">{c.open}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-xs text-ink-mute">"Few entries" = under {MIN_MISTAKES_FOR_CHAPTER} logged; too little to read much into.</p>
              </div>
            )}
          </Panel>
        </div>
      )}
    </div>
  )
}

function Legend() {
  return (
    <div className="mt-2 flex gap-4 text-xs text-ink-mute">
      {(['physics', 'chemistry', 'biology'] as const).map((s) => (
        <SubjectChip key={s} subject={s} />
      ))}
    </div>
  )
}
