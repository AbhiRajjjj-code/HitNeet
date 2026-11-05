/**
 * The API contract.
 *
 * Every screen talks to the backend ONLY through this interface.
 * Today it's implemented by mockApi.ts (browser storage, demo data).
 * In Stage 6 we add supabaseApi.ts implementing the same interface,
 * and flip one line in services/index.ts. No screen changes.
 *
 * Full endpoint list with permissions: docs/04-api-spec.md
 */
import type {
  Chapter,
  Mistake,
  MistakeInput,
  MistakeStatus,
  Reflection,
  ReflectionInput,
  Role,
  Settings,
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
  /** The student whose data this session looks at. */
  studentId: string
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

export interface HitNeetApi {
  // auth
  getSession(): Promise<Session | null>
  signInDemo(role: Role): Promise<Session>
  signOut(): Promise<void>

  // settings & reference data
  getSettings(): Promise<Settings>
  updateSettings(patch: Partial<Settings>): Promise<Settings> // admin only
  listChapters(): Promise<Chapter[]>

  // tests
  listTests(filter?: TestFilter): Promise<Test[]>
  getTest(id: string): Promise<Test>
  /** `requestId` makes retries safe: same id → same test, never a duplicate. */
  createTest(input: TestInput, requestId: string): Promise<Test>
  updateTest(id: string, input: TestInput): Promise<Test>
  archiveTest(id: string): Promise<void> // admin only

  // mistakes
  listMistakes(filter?: { testId?: string }): Promise<Mistake[]>
  createMistake(input: MistakeInput, requestId: string): Promise<Mistake>
  updateMistake(id: string, input: MistakeInput): Promise<Mistake>
  setMistakeStatus(id: string, status: MistakeStatus): Promise<Mistake>

  // reflections (one per test)
  getReflection(testId: string): Promise<Reflection | null>
  saveReflection(input: ReflectionInput): Promise<Reflection>

  // tasks
  listTasks(): Promise<Task[]>
  createTask(input: TaskInput, requestId: string): Promise<Task>
  setTaskStatus(id: string, status: TaskStatus): Promise<Task>

  // demo only
  resetDemo?(): Promise<void>
}
