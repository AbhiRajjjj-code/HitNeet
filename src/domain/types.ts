/**
 * Domain types — the "shape" of HitNeet's data.
 *
 * These mirror the database tables we'll create in Supabase later
 * (see docs/03-database-schema.md). The UI only ever talks in these types,
 * so swapping the mock API for the real one doesn't touch any screen.
 */

export type Subject = 'physics' | 'chemistry' | 'biology'
export const SUBJECTS: Subject[] = ['physics', 'chemistry', 'biology']

export type Role = 'student' | 'admin'

export type TestType = 'full' | 'part' | 'chapter' | 'subject'
export type TestStatus = 'draft' | 'submitted' | 'archived'

/** Raw answer counts for one subject in one test — the source of truth. */
export interface SubjectCounts {
  subject: Subject
  totalQuestions: number
  correct: number
  incorrect: number
  unattempted: number
}

export interface Test {
  id: string
  studentId: string
  name: string
  /** Calendar date, YYYY-MM-DD, in Asia/Kolkata. */
  date: string
  type: TestType
  source: string
  maxMarks: number
  totalQuestions: number
  durationMin: number
  timeTakenMin: number | null
  /** Self-reported, 1–5. Context, not an objective measurement. */
  difficulty: number | null
  paperLength: number | null
  subjects: SubjectCounts[]
  /**
   * Marking scheme frozen when the test was saved. Changing the scheme in
   * Settings later never changes old scores. Set by the server.
   */
  scheme: MarkingScheme
  status: TestStatus
  createdAt: string
  updatedAt: string
}

/** What the Add Test form sends. IDs, timestamps and the scheme snapshot come from the server. */
export type TestInput = Omit<Test, 'id' | 'studentId' | 'scheme' | 'createdAt' | 'updatedAt'>

export type MistakeCategory =
  | 'conceptual'
  | 'silly'
  | 'memory'
  | 'approach'
  | 'time'
  | 'guess'
  | 'misread'

export type MistakeStatus = 'open' | 'reviewing' | 'resolved'

export interface Mistake {
  id: string
  studentId: string
  testId: string
  subject: Subject
  chapter: string
  topic: string
  questionNumber: number | null
  category: MistakeCategory
  /** True when the answer was correct but a guess — still worth reviewing. */
  luckyGuess: boolean
  whatWentWrong: string
  correctApproach: string
  /** 1–5: how confident she was while answering. */
  confidence: number
  status: MistakeStatus
  reviewDate: string | null
  createdAt: string
  updatedAt: string
}

export type MistakeInput = Omit<Mistake, 'id' | 'studentId' | 'createdAt' | 'updatedAt'>

export interface Reflection {
  testId: string
  difficulty: number
  confidence: number
  concentration: number
  stress: number
  finishedOnTime: boolean
  timeNotes: string
  subjectNotes: Record<Subject, string>
  sillyMistakes: string
  guessing: string
  chaptersToRevise: string
  nextTarget: number | null
  comments: string
  updatedAt: string
}

export type ReflectionInput = Omit<Reflection, 'updatedAt'>

export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'deferred'
export type Priority = 'high' | 'medium' | 'low'

export interface Task {
  id: string
  studentId: string
  title: string
  description: string
  subject: Subject | null
  chapter: string
  testId: string | null
  mistakeId: string | null
  priority: Priority
  status: TaskStatus
  dueDate: string | null
  createdAt: string
  completedAt: string | null
}

export type TaskInput = Omit<Task, 'id' | 'studentId' | 'createdAt' | 'completedAt'>

export interface MarkingScheme {
  correct: number
  /** Marks deducted per wrong answer, stored as a positive number. */
  incorrect: number
  unattempted: number
}

/** One account. Role is decided by the server from the email, never by the browser. */
export interface Profile {
  id: string
  email: string
  name: string
  role: Role
  createdAt: string
}

/** One row of the admin's "All students" list. */
export interface StudentSummary {
  id: string
  name: string
  email: string
  joinedAt: string
  testCount: number
  /** Latest full-syllabus test, if any. */
  latest: { name: string; date: string; score: number; maxScore: number } | null
  lastActivity: string | null
}

/** App-wide settings shared by every student (one NEET, one marking scheme). */
export interface Settings {
  /** YYYY-MM-DD. Placeholder until the official date is announced. */
  examDate: string
  examDateConfirmed: boolean
  scheme: MarkingScheme
  /** Default question split for a full-syllabus paper. */
  pattern: Record<Subject, number>
  durationMin: number
}

export interface Chapter {
  id: string
  subject: Subject
  name: string
}
