/**
 * Mock implementation of HitNeetApi.
 *
 * Behaves like a real server on purpose, so the UI is built for reality:
 *  - small random delay (so loading states are visible)
 *  - validates input and recalculates nothing from the browser's totals
 *  - enforces role permissions (student can't archive, etc.)
 *  - idempotent creates (same requestId → same record)
 *
 * Data lives in localStorage under DEMO_KEY. Clearing site data resets it.
 */
import { validateCounts } from '../domain/scoring'
import { nowIso } from '../domain/dates'
import type { Mistake, Reflection, Role, Settings, Task, Test, TestInput } from '../domain/types'
import { CHAPTERS } from '../mock/chapters'
import {
  DEFAULT_SETTINGS,
  DEMO_STUDENT_ID,
  SEED_MISTAKES,
  SEED_REFLECTIONS,
  SEED_TASKS,
  SEED_TESTS,
} from '../mock/seed'
import { ApiError, type HitNeetApi, type Session } from './api'

const DEMO_KEY = 'hitneet.demo.v1'
const SESSION_KEY = 'hitneet.demo.session'

interface Db {
  settings: Settings
  tests: Test[]
  mistakes: Mistake[]
  reflections: Reflection[]
  tasks: Task[]
  /** requestId → created record id, for idempotency */
  requests: Record<string, string>
}

const seed = (): Db => ({
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

let memorySession: Session | null = null

function currentSession(): Session {
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

function requireRole(role: Role) {
  if (currentSession().role !== role) throw new ApiError('forbidden', 'Only the admin can do this.')
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

  async signInDemo(role) {
    await delay()
    const db = load()
    const session: Session =
      role === 'student'
        ? { userId: DEMO_STUDENT_ID, role, name: db.settings.studentName, studentId: DEMO_STUDENT_ID }
        : { userId: 'adm_demo', role, name: 'Admin', studentId: DEMO_STUDENT_ID }
    memorySession = session
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    } catch {
      /* ignore */
    }
    return session
  },

  async signOut() {
    memorySession = null
    try {
      localStorage.removeItem(SESSION_KEY)
    } catch {
      /* ignore */
    }
  },

  async getSettings() {
    await delay()
    return load().settings
  },

  async updateSettings(patch) {
    await delay()
    requireRole('admin')
    const db = load()
    const next = { ...db.settings, ...patch }
    if (next.scheme.correct <= 0) throw new ApiError('invalid', 'Marks per correct answer must be above 0.')
    if (next.scheme.incorrect < 0) throw new ApiError('invalid', 'Penalty cannot be negative.')
    db.settings = next
    save(db)
    return next
  },

  async listChapters() {
    return CHAPTERS
  },

  async listTests(filter = {}) {
    await delay()
    const s = currentSession()
    return load()
      .tests.filter((t) => t.studentId === s.studentId)
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
    const s = currentSession()
    const t = load().tests.find((x) => x.id === id && x.studentId === s.studentId && x.status !== 'archived')
    // Same answer for "doesn't exist" and "not yours" — don't leak existence.
    if (!t) throw new ApiError('not_found', "We couldn't find that test.")
    return t
  },

  async createTest(input, requestId) {
    await delay()
    const s = currentSession()
    const db = load()
    const existing = db.requests[requestId]
    if (existing) return db.tests.find((t) => t.id === existing)!
    validateTest(input)
    const now = nowIso()
    const test: Test = { ...input, id: uid('tst'), studentId: s.studentId, createdAt: now, updatedAt: now }
    db.tests.push(test)
    db.requests[requestId] = test.id
    save(db)
    return test
  },

  async updateTest(id, input) {
    await delay()
    const s = currentSession()
    const db = load()
    const i = db.tests.findIndex((t) => t.id === id && t.studentId === s.studentId)
    if (i < 0) throw new ApiError('not_found', "We couldn't find that test.")
    validateTest(input)
    db.tests[i] = { ...db.tests[i], ...input, updatedAt: nowIso() }
    save(db)
    return db.tests[i]
  },

  async archiveTest(id) {
    await delay()
    requireRole('admin')
    const db = load()
    const t = db.tests.find((x) => x.id === id)
    if (!t) throw new ApiError('not_found', "We couldn't find that test.")
    t.status = 'archived'
    t.updatedAt = nowIso()
    save(db)
  },

  async listMistakes(filter = {}) {
    await delay()
    const s = currentSession()
    return load()
      .mistakes.filter((m) => m.studentId === s.studentId)
      .filter((m) => !filter.testId || m.testId === filter.testId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  async createMistake(input, requestId) {
    await delay()
    const s = currentSession()
    const db = load()
    const existing = db.requests[requestId]
    if (existing) return db.mistakes.find((m) => m.id === existing)!
    if (!input.chapter) throw new ApiError('invalid', 'Pick a chapter.')
    if (!db.tests.some((t) => t.id === input.testId && t.studentId === s.studentId))
      throw new ApiError('invalid', 'Pick the test this came from.')
    const now = nowIso()
    const m: Mistake = { ...input, id: uid('mis'), studentId: s.studentId, createdAt: now, updatedAt: now }
    db.mistakes.push(m)
    db.requests[requestId] = m.id
    save(db)
    return m
  },

  async updateMistake(id, input) {
    await delay()
    const s = currentSession()
    const db = load()
    const i = db.mistakes.findIndex((m) => m.id === id && m.studentId === s.studentId)
    if (i < 0) throw new ApiError('not_found', "We couldn't find that mistake.")
    db.mistakes[i] = { ...db.mistakes[i], ...input, updatedAt: nowIso() }
    save(db)
    return db.mistakes[i]
  },

  async setMistakeStatus(id, status) {
    await delay()
    const s = currentSession()
    const db = load()
    const m = db.mistakes.find((x) => x.id === id && x.studentId === s.studentId)
    if (!m) throw new ApiError('not_found', "We couldn't find that mistake.")
    m.status = status
    m.updatedAt = nowIso()
    save(db)
    return m
  },

  async getReflection(testId) {
    await delay()
    return load().reflections.find((r) => r.testId === testId) ?? null
  },

  async saveReflection(input) {
    await delay()
    const s = currentSession()
    const db = load()
    if (!db.tests.some((t) => t.id === input.testId && t.studentId === s.studentId))
      throw new ApiError('not_found', "We couldn't find that test.")
    const r: Reflection = { ...input, updatedAt: nowIso() }
    db.reflections = [...db.reflections.filter((x) => x.testId !== input.testId), r]
    save(db)
    return r
  },

  async listTasks() {
    await delay()
    const s = currentSession()
    return load().tasks.filter((t) => t.studentId === s.studentId)
  },

  async createTask(input, requestId) {
    await delay()
    const s = currentSession()
    const db = load()
    const existing = db.requests[requestId]
    if (existing) return db.tasks.find((t) => t.id === existing)!
    if (!input.title.trim()) throw new ApiError('invalid', 'Give the task a short title.')
    const t: Task = { ...input, id: uid('tsk'), studentId: s.studentId, createdAt: nowIso(), completedAt: null }
    db.tasks.push(t)
    db.requests[requestId] = t.id
    save(db)
    return t
  },

  async setTaskStatus(id, status) {
    await delay()
    const s = currentSession()
    const db = load()
    const t = db.tasks.find((x) => x.id === id && x.studentId === s.studentId)
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
