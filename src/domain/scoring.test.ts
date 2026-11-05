import { describe, expect, it } from 'vitest'
import { inferUnattempted, scoreSubject, scoreTest, validateCounts } from './scoring'
import type { MarkingScheme, SubjectCounts } from './types'

const neet: MarkingScheme = { correct: 4, incorrect: 1, unattempted: 0 }

const phy = (correct: number, incorrect: number, unattempted: number): SubjectCounts => ({
  subject: 'physics',
  totalQuestions: correct + incorrect + unattempted,
  correct,
  incorrect,
  unattempted,
})

describe('scoreSubject', () => {
  it('applies +4 / −1', () => {
    const r = scoreSubject(phy(30, 10, 5), neet)
    expect(r.positive).toBe(120)
    expect(r.negative).toBe(10)
    expect(r.score).toBe(110)
    expect(r.maxScore).toBe(180)
  })

  it('computes accuracy over attempted questions only', () => {
    expect(scoreSubject(phy(30, 10, 5), neet).accuracy).toBe(75)
  })

  it('returns null accuracy when nothing was attempted (no divide by zero)', () => {
    const r = scoreSubject(phy(0, 0, 45), neet)
    expect(r.accuracy).toBeNull()
    expect(r.attemptRate).toBe(0)
    expect(r.score).toBe(0)
  })

  it('can go negative', () => {
    expect(scoreSubject(phy(0, 10, 35), neet).score).toBe(-10)
  })

  it('respects a different marking scheme', () => {
    const r = scoreSubject(phy(10, 4, 0), { correct: 3, incorrect: 0.5, unattempted: 0 })
    expect(r.score).toBe(28)
  })
})

describe('scoreTest', () => {
  it('sums a full NEET paper to 720 max', () => {
    const r = scoreTest(
      {
        subjects: [
          { subject: 'physics', totalQuestions: 45, correct: 30, incorrect: 8, unattempted: 7 },
          { subject: 'chemistry', totalQuestions: 45, correct: 35, incorrect: 5, unattempted: 5 },
          { subject: 'biology', totalQuestions: 90, correct: 80, incorrect: 6, unattempted: 4 },
        ],
      },
      neet,
    )
    expect(r.maxScore).toBe(720)
    expect(r.score).toBe(145 * 4 - 19)
    expect(r.negative).toBe(19)
    expect(r.attemptRate).toBe(Math.round((164 / 180) * 1000) / 10)
  })
})

describe('validateCounts', () => {
  it('accepts counts that add up', () => {
    expect(validateCounts(phy(30, 10, 5))).toEqual([])
  })

  it('rejects counts that do not add up', () => {
    const issues = validateCounts({ subject: 'physics', totalQuestions: 45, correct: 30, incorrect: 10, unattempted: 2 })
    expect(issues).toHaveLength(1)
    expect(issues[0].message).toMatch(/3 questions not counted/)
  })

  it('rejects negative or fractional numbers', () => {
    expect(validateCounts({ subject: 'physics', totalQuestions: 45, correct: -1, incorrect: 0, unattempted: 46 })[0].field).toBe('correct')
    expect(validateCounts({ subject: 'physics', totalQuestions: 45, correct: 1.5, incorrect: 0, unattempted: 43 })).not.toEqual([])
  })
})

describe('inferUnattempted', () => {
  it('fills the remainder and never goes below zero', () => {
    expect(inferUnattempted({ subject: 'biology', totalQuestions: 90, correct: 70, incorrect: 12 })).toBe(8)
    expect(inferUnattempted({ subject: 'biology', totalQuestions: 90, correct: 80, incorrect: 20 })).toBe(0)
  })
})
