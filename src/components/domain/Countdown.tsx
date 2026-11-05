import { CalendarClock } from 'lucide-react'
import { daysBetween, formatDate, todayIST } from '../../domain/dates'

/** "123 days to NEET" chip, shown top-right on the student's main pages. */
export function Countdown({ date, confirmed }: { date: string; confirmed: boolean }) {
  const days = daysBetween(todayIST(), date)
  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-line bg-surface py-2.5 pl-3 pr-4">
      <span className="grid size-10 place-items-center rounded-[12px] bg-sky-soft text-sky">
        <CalendarClock className="size-5" />
      </span>
      <div>
        <p className="font-display text-xl font-bold leading-none tabular">{days > 0 ? `${days} days` : days === 0 ? 'Today' : 'Exam done'}</p>
        <p className="mt-1 text-xs text-ink-mute">
          to NEET · {formatDate(date, true)}
          {!confirmed && ' (expected)'}
        </p>
      </div>
    </div>
  )
}
