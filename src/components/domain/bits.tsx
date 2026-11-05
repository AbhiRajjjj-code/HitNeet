/** Small HitNeet-specific display pieces reused across screens. */
import clsx from 'clsx'
import { CATEGORY_COLOR, CATEGORY_LABEL, MISTAKE_STATUS_LABEL, SUBJECT_LABEL, SUBJECT_STYLE } from '../../domain/labels'
import type { MistakeCategory, MistakeStatus, Subject } from '../../domain/types'
import { Chip } from '../ui/primitives'

export function SubjectChip({ subject, className }: { subject: Subject; className?: string }) {
  const s = SUBJECT_STYLE[subject]
  return (
    <Chip className={clsx(s.soft, s.text, className)}>
      <span className={clsx('size-1.5 rounded-full', s.bg)} aria-hidden />
      {SUBJECT_LABEL[subject]}
    </Chip>
  )
}

export function CategoryChip({ category }: { category: MistakeCategory }) {
  const c = CATEGORY_COLOR[category]
  return (
    <Chip style={{ color: c, backgroundColor: `${c}14` }}>
      {CATEGORY_LABEL[category]}
    </Chip>
  )
}

export function StatusChip({ status }: { status: MistakeStatus }) {
  return (
    <Chip
      className={clsx(
        status === 'resolved' && 'bg-good-soft text-good',
        status === 'reviewing' && 'bg-sky-soft text-sky',
        status === 'open' && 'bg-warn-soft text-warn',
      )}
    >
      {MISTAKE_STATUS_LABEL[status]}
    </Chip>
  )
}

/** Horizontal stacked bar of correct / incorrect / unattempted. */
export function AnswerBar({
  correct,
  incorrect,
  unattempted,
  subject,
}: {
  correct: number
  incorrect: number
  unattempted: number
  subject?: Subject
}) {
  const total = correct + incorrect + unattempted || 1
  const pct = (n: number) => `${(n / total) * 100}%`
  return (
    <div
      className="flex h-2.5 w-full overflow-hidden rounded-full bg-line"
      role="img"
      aria-label={`${correct} correct, ${incorrect} incorrect, ${unattempted} unattempted`}
    >
      <div className={subject ? SUBJECT_STYLE[subject].bg : 'bg-good'} style={{ width: pct(correct) }} />
      <div className="bg-bad/70" style={{ width: pct(incorrect) }} />
    </div>
  )
}

export function Delta({ value, suffix = '' }: { value: number | null; suffix?: string }) {
  if (value === null) return null
  const sign = value > 0 ? '+' : value < 0 ? '−' : '±'
  return (
    <span className={clsx('tabular text-sm font-semibold', value > 0 ? 'text-good' : value < 0 ? 'text-warn' : 'text-ink-mute')}>
      {sign}
      {Math.abs(value)}
      {suffix}
    </span>
  )
}

export function Brand({ light }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden>
        <rect width="32" height="32" rx="9" fill={light ? '#fff' : '#5B3FD9'} />
        <circle cx="16" cy="16" r="8.5" fill="none" stroke={light ? '#5B3FD9' : '#fff'} strokeWidth="2.5" />
        <circle cx="16" cy="16" r="3" fill="#38BDF8" />
      </svg>
      <span className={clsx('font-display text-xl font-bold tracking-tight', light ? 'text-white' : 'text-ink')}>HitNeet</span>
    </span>
  )
}
