/** Date helpers. All display is in Asia/Kolkata, as the spec requires. */
const TZ = 'Asia/Kolkata'

/** Today's date as YYYY-MM-DD in India. */
export function todayIST(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now)
}

/** "5 Nov" or "5 Nov 2026" */
export function formatDate(ymd: string, withYear = false): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d, 6))
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: TZ,
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  }).format(date)
}

export function daysBetween(fromYmd: string, toYmd: string): number {
  const toUtc = (s: string) => {
    const [y, m, d] = s.split('-').map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((toUtc(toYmd) - toUtc(fromYmd)) / 86_400_000)
}

export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + days))
  return t.toISOString().slice(0, 10)
}

export function nowIso(): string {
  return new Date().toISOString()
}
