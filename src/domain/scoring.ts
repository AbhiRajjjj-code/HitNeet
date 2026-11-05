/**
 * Scoring rules — pure functions, no React, no network.
 *
 * The same functions will run on the backend (Supabase database function /
 * edge function) so the server never trusts totals sent by the browser.
 * Covered by scoring.test.ts.
 */
import type { MarkingScheme, Subject, SubjectCounts, Test } from './types'

export interface SubjectResult {
  subject: Subject
  totalQuestions: number
  correct: number
  incorrect: number
  unattempted: number
  positive: number
  negative: number
  score: number
  maxScore: number
  /** null when nothing was attempted (avoid dividing by zero). */
  accuracy: number | null
  attemptRate: number
}

export interface TestResult extends Omit<SubjectResult, 'subject'> {
  subjects: SubjectResult[]
}

const round1 = (n: number) => Math.round(n * 10) / 10

export function scoreSubject(c: SubjectCounts, scheme: MarkingScheme): SubjectResult {
  const attempted = c.correct + c.incorrect
  const positive = c.correct * scheme.correct
  const negative = c.incorrect * scheme.incorrect
  return {
    ...c,
    positive,
    negative,
    score: positive - negative + c.unattempted * scheme.unattempted,
    maxScore: c.totalQuestions * scheme.correct,
    accuracy: attempted === 0 ? null : round1((c.correct / attempted) * 100),
    attemptRate: c.totalQuestions === 0 ? 0 : round1((attempted / c.totalQuestions) * 100),
  }
}

export function scoreTest(test: Pick<Test, 'subjects'>, scheme: MarkingScheme): TestResult {
  const subjects = test.subjects.map((s) => scoreSubject(s, scheme))
  const sum = (k: 'totalQuestions' | 'correct' | 'incorrect' | 'unattempted' | 'positive' | 'negative' | 'score' | 'maxScore') =>
    subjects.reduce((acc, s) => acc + s[k], 0)
  const correct = sum('correct')
  const incorrect = sum('incorrect')
  const totalQuestions = sum('totalQuestions')
  const attempted = correct + incorrect
  return {
    subjects,
    totalQuestions,
    correct,
    incorrect,
    unattempted: sum('unattempted'),
    positive: sum('positive'),
    negative: sum('negative'),
    score: sum('score'),
    maxScore: sum('maxScore'),
    accuracy: attempted === 0 ? null : round1((correct / attempted) * 100),
    attemptRate: totalQuestions === 0 ? 0 : round1((attempted / totalQuestions) * 100),
  }
}

export interface ValidationIssue {
  field: string
  message: string
}

/** Checks one subject's counts. Returns [] when valid. */
export function validateCounts(c: SubjectCounts): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const nums: [keyof SubjectCounts, number][] = [
    ['totalQuestions', c.totalQuestions],
    ['correct', c.correct],
    ['incorrect', c.incorrect],
    ['unattempted', c.unattempted],
  ]
  for (const [field, v] of nums) {
    if (!Number.isInteger(v) || v < 0) {
      issues.push({ field, message: 'Use a whole number, 0 or more.' })
    }
  }
  if (issues.length) return issues
  const sum = c.correct + c.incorrect + c.unattempted
  if (sum !== c.totalQuestions) {
    const diff = c.totalQuestions - sum
    issues.push({
      field: 'sum',
      message:
        diff > 0
          ? `${diff} question${diff === 1 ? '' : 's'} not counted yet — correct + incorrect + unattempted should equal ${c.totalQuestions}.`
          : `${-diff} too many — correct + incorrect + unattempted should equal ${c.totalQuestions}.`,
    })
  }
  return issues
}

/** Fill in unattempted automatically from the other three numbers. */
export function inferUnattempted(c: Omit<SubjectCounts, 'unattempted'>): number {
  return Math.max(0, c.totalQuestions - c.correct - c.incorrect)
}
