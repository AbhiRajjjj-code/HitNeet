/**
 * The "720 track" — HitNeet's signature element.
 * The full NEET range as a ruler; the latest score sits on it as a marker,
 * split into Physics / Chemistry / Biology by how much each contributed.
 * Best and average are small ticks, so progress reads at a glance.
 */
import clsx from 'clsx'
import type { ScoredTest } from '../../domain/analytics'
import { SUBJECT_LABEL, SUBJECT_STYLE } from '../../domain/labels'

export function ScoreTrack({
  latest,
  best,
  average,
  max = 720,
  target,
}: {
  latest: ScoredTest
  best: ScoredTest | null
  average: number | null
  max?: number
  target?: number | null
}) {
  const pos = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`
  const score = latest.result.score
  const subjects = latest.result.subjects
  const positiveTotal = subjects.reduce((a, s) => a + Math.max(0, s.score), 0) || 1

  return (
    <div>
      <div className="relative h-12">
        {/* rail */}
        <div className="absolute inset-x-0 top-4 h-4 rounded-full bg-white/15" />
        {/* filled segments, one per subject */}
        <div className="absolute left-0 top-4 flex h-4 overflow-hidden rounded-full" style={{ width: pos(score) }}>
          {subjects.map((s) => (
            <div
              key={s.subject}
              className={clsx(SUBJECT_STYLE[s.subject].bg, 'h-full border-r border-brand-600/60 last:border-r-0')}
              style={{ width: `${(Math.max(0, s.score) / positiveTotal) * 100}%` }}
              title={`${SUBJECT_LABEL[s.subject]}: ${s.score}`}
            />
          ))}
        </div>
        {average !== null && <Tick at={pos(average)} label="avg" />}
        {best && best.test.id !== latest.test.id && <Tick at={pos(best.result.score)} label="best" />}
        {target ? <Tick at={pos(target)} label="goal" dashed /> : null}
        {/* marker */}
        <div className="absolute top-1.5 -translate-x-1/2" style={{ left: pos(score) }} aria-hidden>
          <div className="size-[26px] rounded-full border-[3px] border-brand-600 bg-white shadow-md" />
        </div>
      </div>
      <div className="tabular mt-1 flex justify-between text-[11px] text-white/55" aria-hidden>
        {[0, 180, 360, 540, 720].map((n) => (
          <span key={n}>{Math.round((n / 720) * max)}</span>
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-white/85">
        {subjects.map((s) => (
          <li key={s.subject} className="flex items-center gap-1.5">
            <span className={clsx('size-2 rounded-full', SUBJECT_STYLE[s.subject].bg)} aria-hidden />
            {SUBJECT_LABEL[s.subject]} <span className="tabular font-semibold text-white">{s.score}</span>
            <span className="text-white/55">/ {s.maxScore}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Tick({ at, label, dashed }: { at: string; label: string; dashed?: boolean }) {
  return (
    <div className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: at }} aria-hidden>
      <span className="text-[10px] leading-none text-white/70">{label}</span>
      <span className={clsx('mt-0.5 h-7 w-0', dashed ? 'border-l-2 border-dashed border-white/60' : 'border-l-2 border-white/70')} />
    </div>
  )
}
