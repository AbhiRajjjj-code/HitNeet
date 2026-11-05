/**
 * Analytics — pure functions that turn raw records into insights.
 *
 * Golden rule (from the spec): never claim more than the data supports.
 * Every function that could over-interpret returns an "enough data?" flag.
 */
import { scoreTest, type TestResult } from './scoring'
import type { MarkingScheme, Mistake, MistakeCategory, Subject, Task, Test } from './types'
import { SUBJECTS } from './types'

/** Minimum records before we show a pattern instead of "not enough yet". */
export const MIN_TESTS_FOR_TREND = 3
export const MIN_MISTAKES_FOR_CHAPTER = 3

export interface ScoredTest {
  test: Test
  result: TestResult
}

export function scoreAll(tests: Test[], scheme: MarkingScheme): ScoredTest[] {
  return tests
    .filter((t) => t.status === 'submitted')
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((test) => ({ test, result: scoreTest(test, scheme) }))
}

export interface Summary {
  count: number
  latest: ScoredTest | null
  best: ScoredTest | null
  average: number | null
  /** latest minus average of the 3 tests before it; null if not enough history */
  recentChange: number | null
}

export function summarise(scored: ScoredTest[], fullOnly = true): Summary {
  const pool = fullOnly ? scored.filter((s) => s.test.type === 'full') : scored
  if (pool.length === 0) return { count: scored.length, latest: null, best: null, average: null, recentChange: null }
  const latest = pool[pool.length - 1]
  const best = pool.reduce((a, b) => (b.result.score > a.result.score ? b : a))
  const average = Math.round(pool.reduce((a, s) => a + s.result.score, 0) / pool.length)
  const prev = pool.slice(-4, -1)
  const recentChange =
    prev.length >= 2 ? Math.round(latest.result.score - prev.reduce((a, s) => a + s.result.score, 0) / prev.length) : null
  return { count: scored.length, latest, best, average, recentChange }
}

export interface TrendPoint {
  id: string
  date: string
  name: string
  score: number
  maxScore: number
  percent: number
  accuracy: number | null
  attemptRate: number
  negative: number
  difficulty: number | null
  physics: number | null
  chemistry: number | null
  biology: number | null
  physicsAcc: number | null
  chemistryAcc: number | null
  biologyAcc: number | null
}

export function trend(scored: ScoredTest[]): TrendPoint[] {
  return scored.map(({ test, result }) => {
    const bySub = (s: Subject) => result.subjects.find((x) => x.subject === s)
    return {
      id: test.id,
      date: test.date,
      name: test.name,
      score: result.score,
      maxScore: result.maxScore,
      percent: result.maxScore ? Math.round((result.score / result.maxScore) * 1000) / 10 : 0,
      accuracy: result.accuracy,
      attemptRate: result.attemptRate,
      negative: result.negative,
      difficulty: test.difficulty,
      physics: bySub('physics')?.score ?? null,
      chemistry: bySub('chemistry')?.score ?? null,
      biology: bySub('biology')?.score ?? null,
      physicsAcc: bySub('physics')?.accuracy ?? null,
      chemistryAcc: bySub('chemistry')?.accuracy ?? null,
      biologyAcc: bySub('biology')?.accuracy ?? null,
    }
  })
}

export interface SubjectSnapshot {
  subject: Subject
  latestScore: number | null
  latestMax: number | null
  avgAccuracy: number | null
  /** Change in accuracy: avg of last 3 vs the 3 before. null if < 4 tests. */
  accuracyShift: number | null
}

export function subjectSnapshots(scored: ScoredTest[]): SubjectSnapshot[] {
  return SUBJECTS.map((subject) => {
    const rows = scored
      .map((s) => s.result.subjects.find((x) => x.subject === subject))
      .filter((x): x is NonNullable<typeof x> => !!x)
    const accs = rows.map((r) => r.accuracy).filter((a): a is number => a !== null)
    const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null)
    const last = rows[rows.length - 1]
    const recent = avg(accs.slice(-3))
    const before = avg(accs.slice(-6, -3))
    return {
      subject,
      latestScore: last?.score ?? null,
      latestMax: last?.maxScore ?? null,
      avgAccuracy: avg(accs),
      accuracyShift: accs.length >= 4 && recent !== null && before !== null ? Math.round((recent - before) * 10) / 10 : null,
    }
  })
}

export function mistakesByCategory(mistakes: Mistake[]): { category: MistakeCategory; count: number }[] {
  const counts = new Map<MistakeCategory, number>()
  for (const m of mistakes) counts.set(m.category, (counts.get(m.category) ?? 0) + 1)
  return [...counts.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count)
}

export interface RecurringPattern {
  subject: Subject
  chapter: string
  category: MistakeCategory | null
  count: number
  testCount: number
  open: number
}

/**
 * A pattern is "recurring" only if it shows up in at least 2 different tests.
 * One bad paper is not a pattern.
 */
export function recurringPatterns(mistakes: Mistake[]): RecurringPattern[] {
  const groups = new Map<string, Mistake[]>()
  for (const m of mistakes) {
    const key = `${m.subject}|${m.chapter}`
    groups.set(key, [...(groups.get(key) ?? []), m])
  }
  const out: RecurringPattern[] = []
  for (const list of groups.values()) {
    const tests = new Set(list.map((m) => m.testId))
    if (tests.size < 2) continue
    const top = mistakesByCategory(list)[0]
    out.push({
      subject: list[0].subject,
      chapter: list[0].chapter,
      category: top && top.count >= 2 ? top.category : null,
      count: list.length,
      testCount: tests.size,
      open: list.filter((m) => m.status !== 'resolved').length,
    })
  }
  return out.sort((a, b) => b.testCount - a.testCount || b.count - a.count)
}

export interface ChapterRow {
  subject: Subject
  chapter: string
  logged: number
  open: number
  enoughData: boolean
}

/**
 * Chapter view built ONLY from logged mistakes. This is "where mistakes were
 * logged", not chapter accuracy — subject totals can't tell us that.
 */
export function chapterRows(mistakes: Mistake[]): ChapterRow[] {
  const map = new Map<string, ChapterRow>()
  for (const m of mistakes) {
    const key = `${m.subject}|${m.chapter}`
    const row = map.get(key) ?? { subject: m.subject, chapter: m.chapter, logged: 0, open: 0, enoughData: false }
    row.logged += 1
    if (m.status !== 'resolved') row.open += 1
    map.set(key, row)
  }
  return [...map.values()]
    .map((r) => ({ ...r, enoughData: r.logged >= MIN_MISTAKES_FOR_CHAPTER }))
    .sort((a, b) => b.logged - a.logged)
}

export interface TaskProgress {
  done: number
  total: number
  overdue: number
}

export function taskProgress(tasks: Task[], today: string): TaskProgress {
  const active = tasks.filter((t) => t.status !== 'deferred')
  return {
    done: active.filter((t) => t.status === 'done').length,
    total: active.length,
    overdue: active.filter((t) => t.status !== 'done' && t.dueDate !== null && t.dueDate < today).length,
  }
}

/** A calm sentence about the latest score. Never "weak", never "failed". */
export function scoreNote(summary: Summary): string {
  if (!summary.latest) return 'Add your first full test and your progress will start showing here.'
  if (summary.recentChange === null) return 'A few more tests and a trend will start to show.'
  const c = summary.recentChange
  if (c >= 15) return `Up ${c} on your recent average. Nice — note what worked.`
  if (c <= -15) return `${Math.abs(c)} below your recent average. One paper isn't a trend — the reflection will show why.`
  return 'Steady with your recent average.'
}
