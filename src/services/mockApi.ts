/**
 * Mock implementation of HitNeetApi.
 *
 * Behaves like a real server on purpose, so the UI is built for reality:
 *  - small random delay (so loading states are visible)
 *  - validates input and recalculates nothing from the browser's totals
 *  - decides the role from the email (the browser can't pick its own role)
 *  - enforces permissions: students touch only their own records,
 *    the admin reads everyone but never edits a student's records
 *  - idempotent creates (same requestId → same record)
 *  - freezes the marking scheme onto each test when it's created
 *
 * Data lives in localStorage under DEMO_KEY. Clearing site data resets it.
 * Passwords here are plain demo strings — Supabase Auth stores real ones hashed.
 */
import { scoreTest, validateCounts } from '../domain/scoring'
import { nowIso } from '../domain/dates'
import type { Mistake, Profile, Reflection, Settings, StudentSummary, Task, Test, TestInput } from '../domain/types'
import { CHAPTERS } from '../mock/chapters'
import {
  ADMIN_EMAILS,
  DEFAULT_SETTINGS,
  DEMO_ACCOUNTS,
  DEMO_PASSWORD,
  SEED_MISTAKES,
  SEED_PROFILES,
  SEED_REFLECTIONS,
  SEED_TASKS,
  SEED_TESTS,
} from '../mock/seed'
import { ApiError, type HitNeetApi, type Session } from './api'

const DEMO_KEY = 'hitneet.demo.v2'
const SESSION_KEY = 'hitneet.demo.session.v2'

interface Account extends Profile {
  password: string
}

interface Db {
  accounts: Account[]
  settings: Settings
  tests: Test[]
  mistakes: Mistake[]
  reflections: Reflection[]
  tasks: Task[]
  /** `${userId}:${requestId}` → created record id, for idempotency */
  requests: Record<string, string>
}

const seed = (): Db => ({
  accounts: SEED_PROFILES.map((p) => ({ ...p, password: DEMO_PASSWORD })),
  settings: structuredClone(DEFAULT_SETTINGS),
  tests: structuredClone(SEED_TESTS),
  mistakes: structuredClone(SEED_MISTAKES),
  reflections: structuredClone(SEED_REFLECTIONS),
  tasks: structuredClone(SEED_TASKS),
  requests: {},
})

function load(): Db {
  try {
    const raw = localStorage.getItem(DEMO_KEY)
    if (raw) return JSON.parse(raw) as Db
  } catch {
    /* storage blocked or corrupt — fall back to fresh demo data */
  }
  const db = seed()
  save(db)
  return db
}

function save(db: Db) {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(db))
  } catch {
    /* private mode: keep working in memory */
  }
}

const delay = () => new Promise((r) => setTimeout(r, 150 + Math.random() * 250))
const uid = (prefix: string) => `${prefix}_${crypto.randomUUID().slice(0, 8)}`
const normEmail = (e: string) => e.trim().toLowerCase()

let memorySession: Session | null = null

function storeSession(s: Session | null) {
  memorySession = s
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s))
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}

function me(): Session {
  let s = memorySession
  if (!s) {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      s = raw ? (JSON.parse(raw) as Session) : null
    } catch {
      s = null
    }
  }
  if (!s) throw new ApiError('unauthenticated', 'Please sign in again.')
  return s
}

const toSession = (a: Profile): Session => ({ userId: a.id, role: a.role, name: a.name, email: a.email })

function requireAdmin() {
  if (me().role !== 'admin') throw new ApiError('forbidden', 'Only the admin can do this.')
}

/** Writes to study records: only a student, only their own. */
function requireStudent(): Session {
  const s = me()
  if (s.role !== 'student') throw new ApiError('forbidden', 'The admin view is read-only.')
  return s
}

/** Reads: the student themself, or the admin. */
function requireReadAccess(studentId: string) {
  const s = me()
  if (s.role !== 'admin' && s.userId !== studentId) throw new ApiError('forbidden', "You can't see another student's records.")
}

/** Same answer for "doesn't exist" and "not yours" — don't leak existence. */
function findReadableTest(db: Db, id: string): Test {
  const s = me()
  const t = db.tests.find((x) => x.id === id && x.status !== 'archived')
  if (!t || (s.role !== 'admin' && t.studentId !== s.userId)) throw new ApiError('not_found', "We couldn't find that test.")
  return t
}

function validateTest(input: TestInput) {
  if (!input.name.trim()) throw new ApiError('invalid', 'Give the test a name.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new ApiError('invalid', 'Pick a valid date.')
  if (input.subjects.length === 0) throw new ApiError('invalid', 'Add at least one subject.')
  for (const s of input.subjects) {
    const issues = validateCounts(s)
    if (issues.length) throw new ApiError('invalid', `${s.subject}: ${issues[0].message}`)
  }
}

function claim(db: Db, userId: string, requestId: string) {
  return db.requests[`${userId}:${requestId}`]
}

export const mockApi: HitNeetApi = {
  async getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      memorySession = raw ? (JSON.parse(raw) as Session) : memorySession
    } catch {
      /* ignore */
    }
    return memorySession
  },

  async signInWithPassword(email, password) {
    await delay()
    const a = load().accounts.find((x) => x.email === normEmail(email))
    // One message for both cases, so the form can't be used to discover accounts.
    if (!a || a.password !== password) throw new ApiError('invalid', 'That email and password don’t match. Try again or reset your password.')
    const s = toSession(a)
    storeSession(s)
    return s
  },

  async signInWithGoogle() {
    // Demo stand-in: real Google sign-in needs the backend (Supabase Auth).
    // Here it signs in as the sample student so the flow can be clicked through.
    await delay()
    const a = load().accounts.find((x) => x.email === DEMO_ACCOUNTS.student)
    if (!a) throw new ApiError('not_found', 'Demo account missing — reset the demo data.')
    const s = toSession(a)
    storeSession(s)
    return s
  },

  async signUp({ name, email, password }) {
    await delay()
    const e = normEmail(email)
    if (!name.trim()) throw new ApiError('invalid', 'Add your name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new ApiError('invalid', 'Enter a valid email address.')
    if (password.length < 8) throw new ApiError('invalid', 'Use at least 8 characters for the password.')
    const db = load()
    if (db.accounts.some((x) => x.email === e)) throw new ApiError('conflict', 'An account with this email already exists. Sign in instead.')
    const account: Account = {
      id: uid('usr'),
      email: e,
      name: name.trim(),
      role: ADMIN_EMAILS.includes(e) ? 'admin' : 'student',
      createdAt: nowIso(),
      password,
    }
    db.accounts.push(account)
    save(db)
    const s = toSession(account)
    storeSession(s)
    return { session: s }
  },

  async requestPasswordReset() {
    // A real server emails a reset link if the account exists, and says nothing either way.
    await delay()
  },

  async updatePassword(password) {
    await delay()
    if (password.length < 8) throw new ApiError('invalid', 'Use at least 8 characters for the password.')
    const s = me()
    const db = load()
    const a = db.accounts.find((x) => x.id === s.userId)
    if (!a) throw new ApiError('unauthenticated', 'Please sign in again.')
    a.password = password
    save(db)
  },

  async signOut() {
    storeSession(null)
  },

  async getSettings() {
    await delay()
    return load().settings
  },

  async updateSettings(patch) {
    await delay()
    requireAdmin()
    const db = load()
    const next = { ...db.settings, ...patch }
    if (next.scheme.correct <= 0) throw new ApiError('invalid', 'Marks per correct answer must be above 0.')
    if (next.scheme.incorrect < 0) throw new ApiError('invalid', 'Penalty cannot be negative.')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(next.examDate)) throw new ApiError('invalid', 'Pick a valid exam date.')
    db.settings = next
    save(db)
    return next
  },

  async listChapters() {
    return CHAPTERS
  },

  async listStudents() {
    await delay()
    requireAdmin()
    const db = load()
    const rows: StudentSummary[] = db.accounts
      .filter((a) => a.role === 'student')
      .map((a) => {
        const tests = db.tests.filter((t) => t.studentId === a.id && t.status === 'submitted').sort((x, y) => x.date.localeCompare(y.date))
        const lastFull = tests.filter((t) => t.type === 'full').at(-1)
        const r = lastFull ? scoreTest(lastFull, lastFull.scheme) : null
        const stamps = [...tests.map((t) => t.updatedAt), ...db.mistakes.filter((m) => m.studentId === a.id).map((m) => m.updatedAt)]
        return {
          id: a.id,
          name: a.name,
          email: a.email,
          joinedAt: a.createdAt,
          testCount: tests.length,
          latest: lastFull && r ? { name: lastFull.name, date: lastFull.date, score: r.score, maxScore: r.maxScore } : null,
          lastActivity: stamps.length ? stamps.sort().at(-1)! : null,
        }
      })
    return rows.sort((x, y) => (y.lastActivity ?? '').localeCompare(x.lastActivity ?? ''))
  },

  async getStudent(studentId) {
    await delay()
    requireReadAccess(studentId)
    const a = load().accounts.find((x) => x.id === studentId && x.role === 'student')
    if (!a) throw new ApiError('not_found', "We couldn't find that student.")
    const { password: _password, ...profile } = a
    return profile
  },

  async listTests(studentId, filter = {}) {
    await delay()
    requireReadAccess(studentId)
    return load()
      .tests.filter((t) => t.studentId === studentId)
      .filter((t) => t.status !== 'archived')
      .filter((t) => filter.includeDrafts || t.status === 'submitted')
      .filter((t) => !filter.type || t.type === filter.type)
      .filter((t) => !filter.source || t.source === filter.source)
      .filter((t) => !filter.from || t.date >= filter.from)
      .filter((t) => !filter.to || t.date <= filter.to)
      .sort((a, b) => b.date.localeCompare(a.date))
  },

  async getTest(id) {
    await delay()
    return findReadableTest(load(), id)
  },

  async createTest(input, requestId) {
    await delay()
    const s = requireStudent()
    const db = load()
    const existing = claim(db, s.userId, requestId)
    if (existing) return db.tests.find((t) => t.id === existing)!
    validateTest(input)
    const now = nowIso()
    // Freeze today's marking scheme onto the test.
    const test: Test = { ...input, id: uid('tst'), studentId: s.userId, scheme: structuredClone(db.settings.scheme), createdAt: now, updatedAt: now }
    db.tests.push(test)
    db.requests[`${s.userId}:${requestId}`] = test.id
    save(db)
    return test
  },

  async updateTest(id, input) {
    await delay()
    const s = requireStudent()
    const db = load()
    const i = db.tests.findIndex((t) => t.id === id && t.studentId === s.userId)
    if (i < 0) throw new ApiError('not_found', "We couldn't find that test.")
    validateTest(input)
    // Editing counts keeps the scheme the test was first saved with.
    db.tests[i] = { ...db.tests[i], ...input, scheme: db.tests[i].scheme, updatedAt: nowIso() }
    save(db)
    return db.tests[i]
  },

  async archiveTest(id) {
    await delay()
    requireAdmin()
    const db = load()
    const t = db.tests.find((x) => x.id === id)
    if (!t) throw new ApiError('not_found', "We couldn't find that test.")
    t.status = 'archived'
    t.updatedAt = nowIso()
    save(db)
  },

  async listMistakes(studentId, filter = {}) {
    await delay()
    requireReadAccess(studentId)
    return load()
      .mistakes.filter((m) => m.studentId === studentId)
      .filter((m) => !filter.testId || m.testId === filter.testId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  async createMistake(input, requestId) {
    await delay()
    const s = requireStudent()
    const db = load()
    const existing = claim(db, s.userId, requestId)
    if (existing) return db.mistakes.find((m) => m.id === existing)!
    if (!input.chapter) throw new ApiError('invalid', 'Pick a chapter.')
    if (!db.tests.some((t) => t.id === input.testId && t.studentId === s.userId))
      throw new ApiError('invalid', 'Pick the test this came from.')
    const now = nowIso()
    const m: Mistake = { ...input, id: uid('mis'), studentId: s.userId, createdAt: now, updatedAt: now }
    db.mistakes.push(m)
    db.requests[`${s.userId}:${requestId}`] = m.id
    save(db)
    return m
  },

  async updateMistake(id, input) {
    await delay()
    const s = requireStudent()
    const db = load()
    const i = db.mistakes.findIndex((m) => m.id === id && m.studentId === s.userId)
    if (i < 0) throw new ApiError('not_found', "We couldn't find that mistake.")
    db.mistakes[i] = { ...db.mistakes[i], ...input, updatedAt: nowIso() }
    save(db)
    return db.mistakes[i]
  },

  async setMistakeStatus(id, status) {
    await delay()
    const s = requireStudent()
    const db = load()
    const m = db.mistakes.find((x) => x.id === id && x.studentId === s.userId)
    if (!m) throw new ApiError('not_found', "We couldn't find that mistake.")
    m.status = status
    m.updatedAt = nowIso()
    save(db)
    return m
  },

  async getReflection(testId) {
    await delay()
    const db = load()
    findReadableTest(db, testId)
    return db.reflections.find((r) => r.testId === testId) ?? null
  },

  async saveReflection(input) {
    await delay()
    const s = requireStudent()
    const db = load()
    if (!db.tests.some((t) => t.id === input.testId && t.studentId === s.userId))
      throw new ApiError('not_found', "We couldn't find that test.")
    const r: Reflection = { ...input, updatedAt: nowIso() }
    db.reflections = [...db.reflections.filter((x) => x.testId !== input.testId), r]
    save(db)
    return r
  },

  async listTasks(studentId) {
    await delay()
    requireReadAccess(studentId)
    return load().tasks.filter((t) => t.studentId === studentId)
  },

  async createTask(input, requestId) {
    await delay()
    const s = requireStudent()
    const db = load()
    const existing = claim(db, s.userId, requestId)
    if (existing) return db.tasks.find((t) => t.id === existing)!
    if (!input.title.trim()) throw new ApiError('invalid', 'Give the task a short title.')
    const t: Task = { ...input, id: uid('tsk'), studentId: s.userId, createdAt: nowIso(), completedAt: null }
    db.tasks.push(t)
    db.requests[`${s.userId}:${requestId}`] = t.id
    save(db)
    return t
  },

  async setTaskStatus(id, status) {
    await delay()
    const s = requireStudent()
    const db = load()
    const t = db.tasks.find((x) => x.id === id && x.studentId === s.userId)
    if (!t) throw new ApiError('not_found', "We couldn't find that task.")
    t.status = status
    t.completedAt = status === 'done' ? nowIso() : null
    save(db)
    return t
  },

  async resetDemo() {
    save(seed())
  },
}
