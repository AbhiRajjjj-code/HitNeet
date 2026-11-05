/**
 * The API contract.
 *
 * Every screen talks to the backend ONLY through this interface.
 * Two implementations: mockApi.ts (browser storage, demo data) and
 * supabaseApi.ts (the real database). services/index.ts picks one from
 * VITE_DATA_SOURCE. Screens never know which one they're using.
 *
 * Who can do what:
 *  - student: reads and writes only their own records
 *  - admin:   reads every student's records, changes Settings, archives tests.
 *             Never creates or edits a student's tests, mistakes or tasks.
 *
 * Full endpoint list with permissions: docs/04-api-spec.md
 */
import type {
  Chapter,
  Mistake,
  MistakeInput,
  MistakeStatus,
  Profile,
  Reflection,
  ReflectionInput,
  Role,
  Settings,
  StudentSummary,
  Task,
  TaskInput,
  TaskStatus,
  Test,
  TestInput,
} from '../domain/types'

export interface Session {
  userId: string
  role: Role
  name: string
  email: string
}

/** One error shape for the whole app — screens show `message` as-is. */
export class ApiError extends Error {
  code: 'unauthenticated' | 'forbidden' | 'not_found' | 'invalid' | 'network' | 'conflict'
  constructor(code: ApiError['code'], message: string) {
    super(message)
    this.code = code
  }
}

export interface TestFilter {
  type?: Test['type']
  source?: string
  from?: string
  to?: string
  includeDrafts?: boolean
}

export interface SignUpInput {
  name: string
  email: string
  password: string
}

/**
 * `session` is null when the server wants the email confirmed first
 * (Supabase "Confirm email" setting): the UI then says "check your inbox".
 */
export interface SignUpResult {
  session: Session | null
}

export interface HitNeetApi {
  // auth — the role comes back from the server, decided by email
  getSession(): Promise<Session | null>
  signInWithPassword(email: string, password: string): Promise<Session>
  signInWithGoogle(): Promise<Session>
  signUp(input: SignUpInput): Promise<SignUpResult>
  /** Always resolves, whether or not the email exists — never reveal who has an account. */
  requestPasswordReset(email: string): Promise<void>
  /**
   * Signs the user in from the one-time code in a password-reset email link
   * (/reset-password?token_hash=…&type=recovery). Works on any device.
   */
  completePasswordRecovery(tokenHash: string): Promise<Session>
  /** Sets a new password for the signed-in user (after following a reset link). */
  updatePassword(password: string): Promise<void>
  signOut(): Promise<void>

  // settings & reference data (same for everyone)
  getSettings(): Promise<Settings>
  updateSettings(patch: Partial<Settings>): Promise<Settings> // admin only
  listChapters(): Promise<Chapter[]>

  // students
  listStudents(): Promise<StudentSummary[]> // admin only
  getStudent(studentId: string): Promise<Profile> // admin, or the student themself

  // tests — reads take the student whose data to show
  listTests(studentId: string, filter?: TestFilter): Promise<Test[]>
  getTest(id: string): Promise<Test>
  /** `requestId` makes retries safe: same id → same test, never a duplicate. */
  createTest(input: TestInput, requestId: string): Promise<Test> // student, own
  updateTest(id: string, input: TestInput): Promise<Test> // student, own
  archiveTest(id: string): Promise<void> // admin only

  // mistakes
  listMistakes(studentId: string, filter?: { testId?: string }): Promise<Mistake[]>
  createMistake(input: MistakeInput, requestId: string): Promise<Mistake> // student, own
  updateMistake(id: string, input: MistakeInput): Promise<Mistake> // student, own
  setMistakeStatus(id: string, status: MistakeStatus): Promise<Mistake> // student, own

  // reflections (one per test)
  getReflection(testId: string): Promise<Reflection | null>
  saveReflection(input: ReflectionInput): Promise<Reflection> // student, own

  // tasks
  listTasks(studentId: string): Promise<Task[]>
  createTask(input: TaskInput, requestId: string): Promise<Task> // student, own
  setTaskStatus(id: string, status: TaskStatus): Promise<Task> // student, own

  // demo only
  resetDemo?(): Promise<void>
}
