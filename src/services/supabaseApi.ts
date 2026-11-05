/**
 * Real implementation of HitNeetApi, backed by Supabase.
 *
 * The browser only holds the PUBLISHABLE key. It can't bypass anything: every
 * read and write is checked by the database's Row Level Security policies
 * (supabase/migrations/…_initial_schema.sql). The checks here are only for
 * friendlier error messages.
 *
 * Database columns are snake_case; the app's types are camelCase. The small
 * `to…` functions at the bottom translate between the two.
 */
import { createClient, type AuthError, type PostgrestError, type User } from '@supabase/supabase-js'
import type {
  Chapter,
  MarkingScheme,
  Mistake,
  MistakeInput,
  Profile,
  Reflection,
  Settings,
  StudentSummary,
  Subject,
  SubjectCounts,
  Task,
  TaskInput,
  Test,
} from '../domain/types'
import { scoreTest } from '../domain/scoring'
import { ApiError, type HitNeetApi, type Session } from './api'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = createClient(url ?? 'http://invalid.localhost', key ?? 'missing', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
})

/** Throws a clear message at startup if .env.local is incomplete. */
export function assertSupabaseConfigured() {
  if (!url || !key) {
    throw new Error('VITE_DATA_SOURCE is "supabase" but VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY are missing. See .env.example.')
  }
}

const origin = () => window.location.origin

/* ───────────────────────── Errors ───────────────────────── */

/** Turns Supabase/Postgres errors into the app's one error shape. */
function fail(e: PostgrestError | AuthError | Error | null, fallback = 'Something went wrong. Try again.'): never {
  if (!e) throw new ApiError('invalid', fallback)
  const code = 'code' in e ? String(e.code ?? '') : ''
  const msg = e.message ?? ''
  if (e instanceof TypeError || /Failed to fetch|NetworkError|Load failed/i.test(msg))
    throw new ApiError('network', 'Can’t reach the server. Check your internet and try again.')
  // Postgres error codes (https://www.postgresql.org/docs/current/errcodes-appendix.html)
  if (code === '42501') throw new ApiError('forbidden', "You don't have permission to do that.")
  if (code === '23514') throw new ApiError('invalid', 'Some numbers don’t add up — correct + incorrect + blank must equal the total, and ratings are 1–5.')
  if (code === '23505') throw new ApiError('conflict', 'That was already saved.')
  if (code === '23503') throw new ApiError('invalid', 'That links to something that doesn’t exist.')
  if (code === 'P0002' || code === 'PGRST116') throw new ApiError('not_found', "We couldn't find that.")
  if (code === '22023' || code === '22P02' || code === '22007') throw new ApiError('invalid', msg || fallback)
  // Supabase Auth error codes
  if (code === 'invalid_credentials') throw new ApiError('invalid', 'That email and password don’t match. Try again or reset your password.')
  if (code === 'email_not_confirmed') throw new ApiError('invalid', 'Confirm your email first — check your inbox for the link.')
  if (code === 'user_already_exists' || code === 'email_exists') throw new ApiError('conflict', 'An account with this email already exists. Sign in instead.')
  if (code === 'weak_password') throw new ApiError('invalid', 'Choose a stronger password — at least 8 characters.')
  if (code.startsWith('over_') && code.endsWith('rate_limit')) throw new ApiError('invalid', 'Too many tries. Wait a few minutes and try again.')
  throw new ApiError('invalid', msg || fallback)
}

/** Unwraps `{ data, error }` from a Supabase call. */
async function run<T>(p: PromiseLike<{ data: T; error: PostgrestError | null }>): Promise<T> {
  const { data, error } = await p
  if (error) fail(error)
  return data
}

/** Like `run`, for queries that must return exactly one row. */
async function runOne<T>(p: PromiseLike<{ data: T | null; error: PostgrestError | null }>): Promise<T> {
  const data = await run(p)
  if (data === null) throw new ApiError('not_found', "We couldn't find that.")
  return data
}

/* ───────────────────────── Session ───────────────────────── */

async function sessionFor(user: User): Promise<Session> {
  const p = await run(supabase.from('profiles').select('id, email, display_name, role').eq('id', user.id).maybeSingle())
  if (!p) {
    // Shouldn't happen (a trigger creates the profile), but never leave a half-signed-in user.
    await supabase.auth.signOut()
    throw new ApiError('unauthenticated', 'Your account isn’t set up yet. Try signing in again.')
  }
  return { userId: p.id, role: p.role, name: p.display_name, email: p.email }
}

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  if (!data.session) throw new ApiError('unauthenticated', 'Please sign in again.')
  return data.session.user.id
}

/* ───────────────────────── Row types (snake_case, as stored) ───────────────────────── */

interface SubjectRow {
  subject: Subject
  total_questions: number
  correct: number
  incorrect: number
  unattempted: number
}
interface TestRow {
  id: string
  student_id: string
  name: string
  test_date: string
  type: Test['type']
  source: string
  duration_min: number
  time_taken_min: number | null
  difficulty: number | null
  paper_length: number | null
  correct_marks: number
  wrong_penalty: number
  blank_marks: number
  status: Test['status']
  created_at: string
  updated_at: string
  test_subjects: SubjectRow[]
}
interface MistakeRow {
  id: string
  student_id: string
  test_id: string
  subject: Subject
  chapter: string
  topic: string
  question_number: number | null
  category: Mistake['category']
  lucky_guess: boolean
  what_went_wrong: string
  correct_approach: string
  confidence: number
  status: Mistake['status']
  review_date: string | null
  created_at: string
  updated_at: string
}
interface TaskRow {
  id: string
  student_id: string
  title: string
  description: string
  subject: Subject | null
  chapter: string
  test_id: string | null
  mistake_id: string | null
  priority: Task['priority']
  status: Task['status']
  due_date: string | null
  created_at: string
  completed_at: string | null
}

const TEST_COLS = '*, test_subjects(subject, total_questions, correct, incorrect, unattempted)'
const SUBJECT_ORDER: Subject[] = ['physics', 'chemistry', 'biology']

/* ───────────────────────── The API ───────────────────────── */

export const supabaseApi: HitNeetApi = {
  async getSession() {
    const { data } = await supabase.auth.getSession()
    return data.session ? sessionFor(data.session.user) : null
  },

  async signInWithPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    if (error) fail(error)
    return sessionFor(data.user)
  },

  async signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${origin()}/login` } })
    if (error) fail(error)
    // The browser is now leaving for Google; when it comes back, getSession() picks the user up.
    return new Promise<never>(() => {})
  },

  async signUp({ name, email, password }) {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { name: name.trim() }, emailRedirectTo: `${origin()}/login` },
    })
    if (error) fail(error)
    // No session = Supabase wants the email confirmed first.
    return { session: data.session && data.user ? await sessionFor(data.user) : null }
  },

  async requestPasswordReset(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${origin()}/reset-password` })
    // Only surface problems the user can act on; never reveal whether the email exists.
    if (error && (error.status === 429 || error instanceof TypeError)) fail(error)
  },

  async completePasswordRecovery(tokenHash) {
    // The email link carries a one-time code; Supabase swaps it for a session.
    // Unlike the ?code= flow, this doesn't need the browser that asked for the reset.
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
    if (error || !data.user) throw new ApiError('invalid', 'This reset link has expired or was already used. Ask for a new one.')
    return sessionFor(data.user)
  },

  async updatePassword(password) {
    if (password.length < 8) throw new ApiError('invalid', 'Use at least 8 characters for the password.')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) fail(error)
  },

  async signOut() {
    await supabase.auth.signOut()
  },

  async getSettings() {
    return toSettings(await runOne(supabase.from('settings').select('*').single()))
  },

  async updateSettings(patch) {
    const row = await run(supabase.from('settings').update(fromSettings(patch)).eq('id', true).select('*').maybeSingle())
    // RLS doesn't error on a forbidden update — it just changes zero rows.
    if (!row) throw new ApiError('forbidden', 'Only the admin can do this.')
    return toSettings(row)
  },

  async listChapters() {
    const rows = await run(supabase.from('chapters').select('id, subject, name').order('subject').order('sort_order'))
    return rows as Chapter[]
  },

  async listStudents() {
    const rows = await run(supabase.rpc('list_students'))
    const list = rows as { id: string; name: string; email: string; joined_at: string; test_count: number; last_activity: string | null }[]
    if (list.length === 0) return []
    // Latest full-syllabus test per student, scored with its own frozen scheme.
    const full = (await run(
      supabase.from('tests').select(TEST_COLS).in('student_id', list.map((s) => s.id)).eq('type', 'full').eq('status', 'submitted').order('test_date', { ascending: false }),
    )) as TestRow[]
    return list.map((s): StudentSummary => {
      const t = full.find((x) => x.student_id === s.id)
      const r = t ? scoreTest(toTest(t), toTest(t).scheme) : null
      return {
        id: s.id,
        name: s.name,
        email: s.email,
        joinedAt: s.joined_at,
        testCount: Number(s.test_count),
        latest: t && r ? { name: t.name, date: t.test_date, score: r.score, maxScore: r.maxScore } : null,
        lastActivity: s.last_activity,
      }
    })
  },

  async getStudent(studentId) {
    const p = await run(supabase.from('profiles').select('id, email, display_name, role, created_at').eq('id', studentId).eq('role', 'student').maybeSingle())
    if (!p) throw new ApiError('not_found', "We couldn't find that student.")
    return { id: p.id, email: p.email, name: p.display_name, role: p.role, createdAt: p.created_at } satisfies Profile
  },

  async listTests(studentId, filter = {}) {
    let q = supabase.from('tests').select(TEST_COLS).eq('student_id', studentId).neq('status', 'archived')
    if (!filter.includeDrafts) q = q.eq('status', 'submitted')
    if (filter.type) q = q.eq('type', filter.type)
    if (filter.source) q = q.eq('source', filter.source)
    if (filter.from) q = q.gte('test_date', filter.from)
    if (filter.to) q = q.lte('test_date', filter.to)
    const rows = (await run(q.order('test_date', { ascending: false }).order('created_at', { ascending: false }))) as TestRow[]
    return rows.map(toTest)
  },

  async getTest(id) {
    const row = (await run(supabase.from('tests').select(TEST_COLS).eq('id', id).neq('status', 'archived').maybeSingle())) as TestRow | null
    // RLS hides other students' tests, so "not yours" and "doesn't exist" look the same.
    if (!row) throw new ApiError('not_found', "We couldn't find that test.")
    return toTest(row)
  },

  async createTest(input, requestId) {
    const id = await run(supabase.rpc('save_test', { p_test_id: null, p_request_id: requestId, p_input: input }))
    return supabaseApi.getTest(id as string)
  },

  async updateTest(id, input) {
    await run(supabase.rpc('save_test', { p_test_id: id, p_request_id: 'edit', p_input: input }))
    return supabaseApi.getTest(id)
  },

  async archiveTest(id) {
    await run(supabase.rpc('archive_test', { p_test_id: id }))
  },

  async listMistakes(studentId, filter = {}) {
    let q = supabase.from('mistakes').select('*').eq('student_id', studentId)
    if (filter.testId) q = q.eq('test_id', filter.testId)
    const rows = (await run(q.order('created_at', { ascending: false }))) as MistakeRow[]
    return rows.map(toMistake)
  },

  async createMistake(input, requestId) {
    if (!input.chapter) throw new ApiError('invalid', 'Pick a chapter.')
    const { data, error } = await supabase.from('mistakes').insert({ ...fromMistake(input), request_id: requestId }).select('*').single()
    if (error?.code === '23505') {
      // A retry of a save that already worked: return the original.
      const uid = await currentUserId()
      return toMistake(await runOne(supabase.from('mistakes').select('*').eq('student_id', uid).eq('request_id', requestId).single()))
    }
    if (error?.code === '23503') throw new ApiError('invalid', 'Pick the test this came from.')
    if (error) fail(error)
    return toMistake(data)
  },

  async updateMistake(id, input) {
    const row = await run(supabase.from('mistakes').update(fromMistake(input)).eq('id', id).select('*').maybeSingle())
    if (!row) throw new ApiError('not_found', "We couldn't find that mistake.")
    return toMistake(row)
  },

  async setMistakeStatus(id, status) {
    const row = await run(supabase.from('mistakes').update({ status }).eq('id', id).select('*').maybeSingle())
    if (!row) throw new ApiError('not_found', "We couldn't find that mistake.")
    return toMistake(row)
  },

  async getReflection(testId) {
    const r = await run(supabase.from('reflections').select('*').eq('test_id', testId).maybeSingle())
    if (!r) return null
    return {
      testId: r.test_id,
      difficulty: r.difficulty,
      confidence: r.confidence,
      concentration: r.concentration,
      stress: r.stress,
      finishedOnTime: r.finished_on_time,
      timeNotes: r.time_notes,
      subjectNotes: { physics: '', chemistry: '', biology: '', ...r.subject_notes },
      sillyMistakes: r.silly_mistakes,
      guessing: r.guessing,
      chaptersToRevise: r.chapters_to_revise,
      nextTarget: r.next_target,
      comments: r.comments,
      updatedAt: r.updated_at,
    } satisfies Reflection
  },

  async saveReflection(input) {
    await run(
      supabase.from('reflections').upsert(
        {
          test_id: input.testId,
          difficulty: input.difficulty,
          confidence: input.confidence,
          concentration: input.concentration,
          stress: input.stress,
          finished_on_time: input.finishedOnTime,
          time_notes: input.timeNotes,
          subject_notes: input.subjectNotes,
          silly_mistakes: input.sillyMistakes,
          guessing: input.guessing,
          chapters_to_revise: input.chaptersToRevise,
          next_target: input.nextTarget,
          comments: input.comments,
        },
        { onConflict: 'test_id' },
      ),
    )
    const saved = await supabaseApi.getReflection(input.testId)
    if (!saved) throw new ApiError('not_found', "We couldn't find that test.")
    return saved
  },

  async listTasks(studentId) {
    const rows = (await run(supabase.from('tasks').select('*').eq('student_id', studentId).order('created_at'))) as TaskRow[]
    return rows.map(toTask)
  },

  async createTask(input, requestId) {
    if (!input.title.trim()) throw new ApiError('invalid', 'Give the task a short title.')
    const { data, error } = await supabase.from('tasks').insert({ ...fromTask(input), request_id: requestId }).select('*').single()
    if (error?.code === '23505') {
      const uid = await currentUserId()
      return toTask(await runOne(supabase.from('tasks').select('*').eq('student_id', uid).eq('request_id', requestId).single()))
    }
    if (error) fail(error)
    return toTask(data)
  },

  async setTaskStatus(id, status) {
    // completed_at is set by a database trigger from the status.
    const row = await run(supabase.from('tasks').update({ status }).eq('id', id).select('*').maybeSingle())
    if (!row) throw new ApiError('not_found', "We couldn't find that task.")
    return toTask(row)
  },
}

/* ───────────────────────── Translators ───────────────────────── */

function toTest(r: TestRow): Test {
  const scheme: MarkingScheme = { correct: Number(r.correct_marks), incorrect: Number(r.wrong_penalty), unattempted: Number(r.blank_marks) }
  const subjects: SubjectCounts[] = [...r.test_subjects]
    .sort((a, b) => SUBJECT_ORDER.indexOf(a.subject) - SUBJECT_ORDER.indexOf(b.subject))
    .map((s) => ({ subject: s.subject, totalQuestions: s.total_questions, correct: s.correct, incorrect: s.incorrect, unattempted: s.unattempted }))
  const totalQuestions = subjects.reduce((n, s) => n + s.totalQuestions, 0)
  return {
    id: r.id,
    studentId: r.student_id,
    name: r.name,
    date: r.test_date,
    type: r.type,
    source: r.source,
    maxMarks: totalQuestions * scheme.correct,
    totalQuestions,
    durationMin: r.duration_min,
    timeTakenMin: r.time_taken_min,
    difficulty: r.difficulty,
    paperLength: r.paper_length,
    subjects,
    scheme,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function toMistake(r: MistakeRow): Mistake {
  return {
    id: r.id,
    studentId: r.student_id,
    testId: r.test_id,
    subject: r.subject,
    chapter: r.chapter,
    topic: r.topic,
    questionNumber: r.question_number,
    category: r.category,
    luckyGuess: r.lucky_guess,
    whatWentWrong: r.what_went_wrong,
    correctApproach: r.correct_approach,
    confidence: r.confidence,
    status: r.status,
    reviewDate: r.review_date,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function fromMistake(m: MistakeInput) {
  return {
    test_id: m.testId,
    subject: m.subject,
    chapter: m.chapter,
    topic: m.topic,
    question_number: m.questionNumber,
    category: m.category,
    lucky_guess: m.luckyGuess,
    what_went_wrong: m.whatWentWrong,
    correct_approach: m.correctApproach,
    confidence: m.confidence,
    status: m.status,
    review_date: m.reviewDate,
  }
}

function toTask(r: TaskRow): Task {
  return {
    id: r.id,
    studentId: r.student_id,
    title: r.title,
    description: r.description,
    subject: r.subject,
    chapter: r.chapter,
    testId: r.test_id,
    mistakeId: r.mistake_id,
    priority: r.priority,
    status: r.status,
    dueDate: r.due_date,
    createdAt: r.created_at,
    completedAt: r.completed_at,
  }
}

function fromTask(t: TaskInput) {
  return {
    title: t.title.trim(),
    description: t.description,
    subject: t.subject,
    chapter: t.chapter,
    test_id: t.testId,
    mistake_id: t.mistakeId,
    priority: t.priority,
    status: t.status,
    due_date: t.dueDate,
  }
}

interface SettingsRow {
  exam_date: string
  exam_date_confirmed: boolean
  correct_marks: number
  wrong_penalty: number
  blank_marks: number
  pattern_physics: number
  pattern_chemistry: number
  pattern_biology: number
  duration_min: number
}

function toSettings(r: SettingsRow): Settings {
  return {
    examDate: r.exam_date,
    examDateConfirmed: r.exam_date_confirmed,
    scheme: { correct: Number(r.correct_marks), incorrect: Number(r.wrong_penalty), unattempted: Number(r.blank_marks) },
    pattern: { physics: r.pattern_physics, chemistry: r.pattern_chemistry, biology: r.pattern_biology },
    durationMin: r.duration_min,
  }
}

function fromSettings(p: Partial<Settings>): Partial<SettingsRow> {
  const row: Partial<SettingsRow> = {}
  if (p.examDate !== undefined) row.exam_date = p.examDate
  if (p.examDateConfirmed !== undefined) row.exam_date_confirmed = p.examDateConfirmed
  if (p.scheme) {
    row.correct_marks = p.scheme.correct
    row.wrong_penalty = p.scheme.incorrect
    row.blank_marks = p.scheme.unattempted
  }
  if (p.pattern) {
    row.pattern_physics = p.pattern.physics
    row.pattern_chemistry = p.pattern.chemistry
    row.pattern_biology = p.pattern.biology
  }
  if (p.durationMin !== undefined) row.duration_min = p.durationMin
  return row
}
