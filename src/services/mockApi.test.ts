/**
 * Behaviour tests for the API contract, run against the mock.
 * In Stage 6 the same expectations get re-run against Supabase
 * (role permissions, validation, idempotency).
 */
import { beforeEach, describe, expect, it } from 'vitest'
import type { TestInput } from '../domain/types'

// Minimal in-memory localStorage for Node.
const store = new Map<string, string>()
Object.assign(globalThis, {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
})

const { mockApi: api } = await import('./mockApi')

const validTest: TestInput = {
  name: 'Unit test paper',
  date: '2026-11-05',
  type: 'full',
  source: 'Test',
  maxMarks: 720,
  totalQuestions: 180,
  durationMin: 180,
  timeTakenMin: null,
  difficulty: 3,
  paperLength: 3,
  status: 'submitted',
  subjects: [
    { subject: 'physics', totalQuestions: 45, correct: 30, incorrect: 10, unattempted: 5 },
    { subject: 'chemistry', totalQuestions: 45, correct: 35, incorrect: 5, unattempted: 5 },
    { subject: 'biology', totalQuestions: 90, correct: 80, incorrect: 5, unattempted: 5 },
  ],
}

beforeEach(async () => {
  store.clear()
  await api.signOut()
})

describe('authentication', () => {
  it('rejects data calls when signed out', async () => {
    await expect(api.listTests()).rejects.toMatchObject({ code: 'unauthenticated' })
  })
})

describe('role permissions', () => {
  it('student cannot archive a test', async () => {
    await api.signInDemo('student')
    await expect(api.archiveTest('tst_01')).rejects.toMatchObject({ code: 'forbidden' })
  })

  it('student cannot change settings', async () => {
    await api.signInDemo('student')
    await expect(api.updateSettings({ examDate: '2027-05-09' })).rejects.toMatchObject({ code: 'forbidden' })
  })

  it('admin can archive, and the test disappears from lists', async () => {
    await api.signInDemo('admin')
    await api.archiveTest('tst_01')
    const tests = await api.listTests()
    expect(tests.some((t) => t.id === 'tst_01')).toBe(false)
    await expect(api.getTest('tst_01')).rejects.toMatchObject({ code: 'not_found' })
  })

  it('admin can update the marking scheme', async () => {
    await api.signInDemo('admin')
    const s = await api.updateSettings({ scheme: { correct: 4, incorrect: 1, unattempted: 0 }, examDateConfirmed: true })
    expect(s.examDateConfirmed).toBe(true)
  })
})

describe('validation', () => {
  it('rejects counts that do not add up', async () => {
    await api.signInDemo('student')
    const bad = { ...validTest, subjects: [{ subject: 'physics' as const, totalQuestions: 45, correct: 40, incorrect: 10, unattempted: 0 }] }
    await expect(api.createTest(bad, 'req-bad')).rejects.toMatchObject({ code: 'invalid' })
  })

  it('rejects an empty name', async () => {
    await api.signInDemo('student')
    await expect(api.createTest({ ...validTest, name: '  ' }, 'req-noname')).rejects.toMatchObject({ code: 'invalid' })
  })

  it('rejects a negative marking penalty', async () => {
    await api.signInDemo('admin')
    await expect(api.updateSettings({ scheme: { correct: 4, incorrect: -1, unattempted: 0 } })).rejects.toMatchObject({ code: 'invalid' })
  })
})

describe('idempotency (no duplicates on retry)', () => {
  it('same requestId returns the same test and stores it once', async () => {
    await api.signInDemo('student')
    const before = (await api.listTests()).length
    const a = await api.createTest(validTest, 'req-1')
    const b = await api.createTest(validTest, 'req-1')
    expect(b.id).toBe(a.id)
    expect((await api.listTests()).length).toBe(before + 1)
  })

  it('one task per mistake even on double-tap', async () => {
    await api.signInDemo('student')
    const input = {
      title: 'Revise',
      description: '',
      subject: null,
      chapter: '',
      testId: null,
      mistakeId: 'mis_05',
      priority: 'low' as const,
      status: 'pending' as const,
      dueDate: null,
    }
    const a = await api.createTask(input, 'task-from-mis_05')
    const b = await api.createTask(input, 'task-from-mis_05')
    expect(b.id).toBe(a.id)
  })
})

describe('data persistence', () => {
  it('a saved test survives "refresh" (re-reading storage)', async () => {
    await api.signInDemo('student')
    const t = await api.createTest(validTest, 'req-persist')
    expect((await api.getTest(t.id)).name).toBe('Unit test paper')
  })
})
