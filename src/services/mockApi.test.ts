/**
 * Behaviour tests for the API contract, run against the mock.
 * In Stage 6 the same expectations get re-run against Supabase
 * (roles by email, who can read/write what, validation, idempotency,
 * frozen marking schemes).
 */
import { beforeEach, describe, expect, it } from 'vitest'
import type { TaskInput, TestInput } from '../domain/types'

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
const { ADMIN_EMAILS, DEMO_ACCOUNTS, DEMO_PASSWORD, DEMO_STUDENT_ID } = await import('../mock/seed')

const asStudent = () => api.signInWithPassword(DEMO_ACCOUNTS.student, DEMO_PASSWORD)
const asAdmin = () => api.signInWithPassword(DEMO_ACCOUNTS.admin, DEMO_PASSWORD)
const asRiya = () => api.signInWithPassword('riya@example.com', DEMO_PASSWORD)

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

const taskInput: TaskInput = {
  title: 'Revise',
  description: '',
  subject: null,
  chapter: '',
  testId: null,
  mistakeId: 'mis_05',
  priority: 'low',
  status: 'pending',
  dueDate: null,
}

beforeEach(async () => {
  store.clear()
  await api.signOut()
})

describe('sign-in and roles', () => {
  it('rejects data calls when signed out', async () => {
    await expect(api.listTests(DEMO_STUDENT_ID)).rejects.toMatchObject({ code: 'unauthenticated' })
  })

  it('a wrong password gets one vague message (no account discovery)', async () => {
    const wrongPw = api.signInWithPassword(DEMO_ACCOUNTS.student, 'nope').catch((e) => e.message)
    const noUser = api.signInWithPassword('nobody@example.com', 'nope').catch((e) => e.message)
    expect(await wrongPw).toBe(await noUser)
  })

  it('email is matched without caring about case or spaces', async () => {
    const s = await api.signInWithPassword('  CHHOTI@Example.com ', DEMO_PASSWORD)
    expect(s.role).toBe('student')
  })

  it('the admin email gets the admin role', async () => {
    expect((await asAdmin()).role).toBe('admin')
  })

  it('a new sign-up is a student', async () => {
    const { session: s } = await api.signUp({ name: 'Cousin', email: 'cousin@example.com', password: 'longenough' })
    expect(s!.role).toBe('student')
    expect(await api.listTests(s!.userId)).toEqual([])
  })

  it('signing up with the admin email makes an admin, decided by the server', async () => {
    store.clear() // fresh database without the seeded admin
    await api.resetDemo!()
    const db = JSON.parse(store.get('hitneet.demo.v2')!)
    db.accounts = db.accounts.filter((a: { role: string }) => a.role !== 'admin')
    store.set('hitneet.demo.v2', JSON.stringify(db))
    const { session: s } = await api.signUp({ name: 'Admin', email: ADMIN_EMAILS[0].toUpperCase(), password: 'longenough' })
    expect(s!.role).toBe('admin')
  })

  it('cannot sign up twice with one email', async () => {
    await expect(api.signUp({ name: 'X', email: DEMO_ACCOUNTS.student, password: 'longenough' })).rejects.toMatchObject({ code: 'conflict' })
  })

  it('a new password works for the next sign-in', async () => {
    await asStudent()
    await api.updatePassword('brand-new-pass')
    await api.signOut()
    await expect(api.signInWithPassword(DEMO_ACCOUNTS.student, DEMO_PASSWORD)).rejects.toMatchObject({ code: 'invalid' })
    expect((await api.signInWithPassword(DEMO_ACCOUNTS.student, 'brand-new-pass')).role).toBe('student')
  })

  it('rejects a short password', async () => {
    await expect(api.signUp({ name: 'X', email: 'x@example.com', password: 'short' })).rejects.toMatchObject({ code: 'invalid' })
  })
})

describe('who can see what', () => {
  it('a student cannot read another student', async () => {
    await asRiya()
    await expect(api.listTests(DEMO_STUDENT_ID)).rejects.toMatchObject({ code: 'forbidden' })
    await expect(api.getTest('tst_01')).rejects.toMatchObject({ code: 'not_found' })
    await expect(api.getReflection('tst_06')).rejects.toMatchObject({ code: 'not_found' })
  })

  it('a student cannot list all students', async () => {
    await asStudent()
    await expect(api.listStudents()).rejects.toMatchObject({ code: 'forbidden' })
  })

  it('the admin sees every student', async () => {
    await asAdmin()
    const list = await api.listStudents()
    expect(list.map((s) => s.name).sort()).toEqual(['Chhoti', 'Kabir', 'Riya'])
    expect(list.find((s) => s.name === 'Kabir')!.latest).toBeNull()
    expect((await api.listTests('stu_riya')).length).toBe(2)
  })

  it('the admin view is read-only for study records', async () => {
    await asAdmin()
    await expect(api.createTask(taskInput, 'adm-task')).rejects.toMatchObject({ code: 'forbidden' })
    await expect(api.setTaskStatus('tsk_01', 'done')).rejects.toMatchObject({ code: 'forbidden' })
    await expect(api.setMistakeStatus('mis_05', 'resolved')).rejects.toMatchObject({ code: 'forbidden' })
    await expect(api.createTest(validTest, 'adm-test')).rejects.toMatchObject({ code: 'forbidden' })
  })
})

describe('admin-only actions', () => {
  it('student cannot archive a test or change settings', async () => {
    await asStudent()
    await expect(api.archiveTest('tst_01')).rejects.toMatchObject({ code: 'forbidden' })
    await expect(api.updateSettings({ examDate: '2027-05-09' })).rejects.toMatchObject({ code: 'forbidden' })
  })

  it('admin can archive, and the test disappears from lists', async () => {
    await asAdmin()
    await api.archiveTest('tst_01')
    expect((await api.listTests(DEMO_STUDENT_ID)).some((t) => t.id === 'tst_01')).toBe(false)
    await expect(api.getTest('tst_01')).rejects.toMatchObject({ code: 'not_found' })
  })

  it('rejects a negative marking penalty', async () => {
    await asAdmin()
    await expect(api.updateSettings({ scheme: { correct: 4, incorrect: -1, unattempted: 0 } })).rejects.toMatchObject({ code: 'invalid' })
  })
})

describe('marking scheme snapshot', () => {
  it('changing the scheme later does not change saved tests', async () => {
    await asStudent()
    const before = await api.createTest(validTest, 'req-snap')
    expect(before.scheme).toEqual({ correct: 4, incorrect: 1, unattempted: 0 })

    await asAdmin()
    await api.updateSettings({ scheme: { correct: 3, incorrect: 1, unattempted: 0 } })

    await asStudent()
    expect((await api.getTest(before.id)).scheme.correct).toBe(4)
    // Editing the counts keeps the original scheme too.
    const edited = await api.updateTest(before.id, { ...validTest, name: 'Renamed' })
    expect(edited.scheme.correct).toBe(4)
    // A new test picks up the new scheme.
    expect((await api.createTest(validTest, 'req-snap-2')).scheme.correct).toBe(3)
  })
})

describe('validation', () => {
  it('rejects counts that do not add up', async () => {
    await asStudent()
    const bad = { ...validTest, subjects: [{ subject: 'physics' as const, totalQuestions: 45, correct: 40, incorrect: 10, unattempted: 0 }] }
    await expect(api.createTest(bad, 'req-bad')).rejects.toMatchObject({ code: 'invalid' })
  })

  it('rejects an empty name', async () => {
    await asStudent()
    await expect(api.createTest({ ...validTest, name: '  ' }, 'req-noname')).rejects.toMatchObject({ code: 'invalid' })
  })
})

describe('idempotency (no duplicates on retry)', () => {
  it('same requestId returns the same test and stores it once', async () => {
    const s = await asStudent()
    const before = (await api.listTests(s.userId)).length
    const a = await api.createTest(validTest, 'req-1')
    const b = await api.createTest(validTest, 'req-1')
    expect(b.id).toBe(a.id)
    expect((await api.listTests(s.userId)).length).toBe(before + 1)
  })

  it('one task per mistake even on double-tap', async () => {
    await asStudent()
    const a = await api.createTask(taskInput, 'task-from-mis_05')
    const b = await api.createTask(taskInput, 'task-from-mis_05')
    expect(b.id).toBe(a.id)
  })

  it('request ids are per user — two students can reuse one', async () => {
    await asStudent()
    const a = await api.createTest(validTest, 'shared-id')
    await asRiya()
    const b = await api.createTest(validTest, 'shared-id')
    expect(b.id).not.toBe(a.id)
    expect(b.studentId).toBe('stu_riya')
  })
})

describe('data persistence', () => {
  it('a saved test survives "refresh" (re-reading storage)', async () => {
    await asStudent()
    const t = await api.createTest(validTest, 'req-persist')
    expect((await api.getTest(t.id)).name).toBe('Unit test paper')
  })
})
