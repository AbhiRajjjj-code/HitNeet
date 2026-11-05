/**
 * Chart components (Recharts). Each takes plain data from domain/analytics.ts.
 * Colours come from the subject palette so a colour always means the same thing.
 */
import type { ReactElement } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatDate } from '../../domain/dates'
import type { TrendPoint } from '../../domain/analytics'
import { CATEGORY_COLOR, CATEGORY_LABEL, SUBJECT_STYLE } from '../../domain/labels'
import type { MistakeCategory } from '../../domain/types'

const axis = { fontSize: 12, fill: '#6e6a85' }
const grid = <CartesianGrid stroke="#ece9f6" vertical={false} />
const tooltipStyle = {
  contentStyle: { borderRadius: 12, border: '1px solid #e4e1f0', fontSize: 13, boxShadow: '0 8px 24px rgba(30,26,54,.08)' },
  labelStyle: { color: '#1e1a36', fontWeight: 600 },
}
const dateTick = (d: string) => formatDate(d)
/** Round score-axis ticks to steps of 50 (or 100 for a wide range): 450, 500, 550… */
function scoreTicks(data: TrendPoint[]): number[] {
  if (!data.length) return [0, 720]
  const scores = data.map((d) => d.score)
  const lo = Math.max(0, Math.floor((Math.min(...scores) - 20) / 50) * 50)
  const hi = Math.ceil((Math.max(...scores) + 20) / 50) * 50
  const step = hi - lo > 300 ? 100 : 50
  const ticks: number[] = []
  for (let t = lo; t <= hi; t += step) ticks.push(t)
  return ticks
}

function ChartBox({ height = 240, label, children }: { height?: number; label: string; children: ReactElement }) {
  return (
    <div role="img" aria-label={label} style={{ height }} className="w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  )
}

export function ScoreTrendChart({ data, height, target }: { data: TrendPoint[]; height?: number; target?: number | null }) {
  return (
    <ChartBox height={height} label={`Score trend across ${data.length} tests`}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        {grid}
        <XAxis dataKey="date" tickFormatter={dateTick} tick={axis} tickLine={false} axisLine={false} minTickGap={16} />
        <YAxis domain={[scoreTicks(data)[0], scoreTicks(data).at(-1)!]} ticks={scoreTicks(data)} tick={axis} tickLine={false} axisLine={false} />
        <Tooltip {...tooltipStyle} labelFormatter={(d) => formatDate(String(d), true)} formatter={(v) => [`${v} / 720`, 'Score']} />
        {target ? <Line dataKey={() => target} stroke="#cbbfff" strokeDasharray="5 5" dot={false} name="Target" isAnimationActive={false} /> : null}
        <Line type="monotone" dataKey="score" stroke="#5b3fd9" strokeWidth={2.5} dot={{ r: 3.5, fill: '#5b3fd9' }} activeDot={{ r: 5 }} />
      </LineChart>
    </ChartBox>
  )
}

export function SubjectTrendChart({ data, mode }: { data: TrendPoint[]; mode: 'score' | 'accuracy' }) {
  const keys = mode === 'score' ? (['physics', 'chemistry', 'biology'] as const) : (['physicsAcc', 'chemistryAcc', 'biologyAcc'] as const)
  const subj = ['physics', 'chemistry', 'biology'] as const
  return (
    <ChartBox label={`Subject ${mode} trend`}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        {grid}
        <XAxis dataKey="date" tickFormatter={dateTick} tick={axis} tickLine={false} axisLine={false} minTickGap={16} />
        <YAxis tick={axis} tickLine={false} axisLine={false} domain={mode === 'accuracy' ? [40, 100] : [0, 'auto']} unit={mode === 'accuracy' ? '%' : ''} />
        <Tooltip {...tooltipStyle} labelFormatter={(d) => formatDate(String(d), true)} />
        {keys.map((k, i) => (
          <Line
            key={k}
            type="monotone"
            dataKey={k}
            name={subj[i][0].toUpperCase() + subj[i].slice(1)}
            stroke={SUBJECT_STYLE[subj[i]].hex}
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ChartBox>
  )
}

export function AccuracyAttemptChart({ data }: { data: TrendPoint[] }) {
  return (
    <ChartBox label="Accuracy and attempt rate trend">
      <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        {grid}
        <XAxis dataKey="date" tickFormatter={dateTick} tick={axis} tickLine={false} axisLine={false} minTickGap={16} />
        <YAxis tick={axis} tickLine={false} axisLine={false} domain={[50, 100]} unit="%" />
        <Tooltip {...tooltipStyle} labelFormatter={(d) => formatDate(String(d), true)} />
        <Line type="monotone" dataKey="accuracy" name="Accuracy" stroke="#5b3fd9" strokeWidth={2.5} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="attemptRate" name="Attempted" stroke="#1e9bd7" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3 }} />
      </LineChart>
    </ChartBox>
  )
}

export function NegativeMarksChart({ data }: { data: TrendPoint[] }) {
  return (
    <ChartBox height={200} label="Marks lost to negative marking per test">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        {grid}
        <XAxis dataKey="date" tickFormatter={dateTick} tick={axis} tickLine={false} axisLine={false} minTickGap={16} />
        <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip {...tooltipStyle} labelFormatter={(d) => formatDate(String(d), true)} formatter={(v) => [`−${v}`, 'Marks lost']} />
        <Bar dataKey="negative" fill="#e98b8b" radius={[6, 6, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ChartBox>
  )
}

/** Score line with self-rated difficulty as bars behind it — context, not excuse. */
export function DifficultyChart({ data }: { data: TrendPoint[] }) {
  return (
    <ChartBox label="Score compared with self-rated paper difficulty">
      <ComposedChart data={data} margin={{ top: 8, right: -4, left: -12, bottom: 0 }}>
        {grid}
        <XAxis dataKey="date" tickFormatter={dateTick} tick={axis} tickLine={false} axisLine={false} minTickGap={16} />
        <YAxis yAxisId="s" tick={axis} tickLine={false} axisLine={false} domain={[scoreTicks(data)[0], scoreTicks(data).at(-1)!]} ticks={scoreTicks(data)} />
        <YAxis yAxisId="d" orientation="right" domain={[0, 5]} ticks={[1, 3, 5]} tick={axis} tickLine={false} axisLine={false} />
        <Tooltip {...tooltipStyle} labelFormatter={(d) => formatDate(String(d), true)} />
        <Bar yAxisId="d" dataKey="difficulty" name="Felt difficulty (1–5)" fill="#fcd9a3" radius={[6, 6, 0, 0]} maxBarSize={22} />
        <Line yAxisId="s" type="monotone" dataKey="score" name="Score" stroke="#5b3fd9" strokeWidth={2.5} dot={{ r: 3 }} />
      </ComposedChart>
    </ChartBox>
  )
}

export function CategoryBars({ data }: { data: { category: MistakeCategory; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count))
  return (
    <ul className="space-y-2.5">
      {data.map((d) => (
        <li key={d.category} className="grid grid-cols-[minmax(0,10rem)_1fr_2rem] items-center gap-3 text-sm">
          <span className="truncate text-ink-soft">{CATEGORY_LABEL[d.category]}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-paper">
            <span className="block h-full rounded-full" style={{ width: `${(d.count / max) * 100}%`, background: CATEGORY_COLOR[d.category] }} />
          </span>
          <span className="tabular text-right font-semibold">{d.count}</span>
        </li>
      ))}
    </ul>
  )
}
