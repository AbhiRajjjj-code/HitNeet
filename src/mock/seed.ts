/**
 * DEMO DATA — fictional, for the prototype only.
 * Never mix with real records. The mock API stores this in the browser's
 * localStorage under a "demo" key; the real backend will never read it.
 */
import type { MarkingScheme, Mistake, Profile, Reflection, Settings, Task, Test } from '../domain/types'

export const DEMO_STUDENT_ID = 'stu_demo'

/**
 * Emails that get the admin role — DEMO ONLY (placeholder address).
 * In the mock this list decides the role at sign-up. With Supabase the real
 * admin email lives in the database's `admin_emails` table, set from the
 * Supabase dashboard — never in this repo or in browser code.
 */
export const ADMIN_EMAILS = ['admin@example.com']

/** Demo-only password for every sample account. Real passwords live in Supabase Auth, hashed. */
export const DEMO_PASSWORD = 'hitneet-demo'

export const DEMO_ACCOUNTS = {
  student: 'chhoti@example.com',
  admin: ADMIN_EMAILS[0],
} as const

const at = (date: string) => `${date}T09:00:00.000Z`

export const SEED_PROFILES: Profile[] = [
  { id: 'adm_demo', email: ADMIN_EMAILS[0], name: 'Admin', role: 'admin', createdAt: at('2026-07-01') },
  { id: DEMO_STUDENT_ID, email: 'chhoti@example.com', name: 'Chhoti', role: 'student', createdAt: at('2026-07-01') },
  { id: 'stu_riya', email: 'riya@example.com', name: 'Riya', role: 'student', createdAt: at('2026-10-10') },
  { id: 'stu_kabir', email: 'kabir@example.com', name: 'Kabir', role: 'student', createdAt: at('2026-11-03') },
]

const NEET_SCHEME: MarkingScheme = { correct: 4, incorrect: 1, unattempted: 0 }

export const DEFAULT_SETTINGS: Settings = {
  // Placeholder: NEET is usually held on the first Sunday of May. Confirm once NTA announces.
  examDate: '2027-05-02',
  examDateConfirmed: false,
  scheme: NEET_SCHEME,
  pattern: { physics: 45, chemistry: 45, biology: 90 },
  durationMin: 180,
}

type Row = [
  id: string,
  date: string,
  name: string,
  source: string,
  difficulty: number,
  length: number,
  timeTaken: number,
  phy: [number, number],
  chem: [number, number],
  bio: [number, number],
]

type StudentRow = [studentId: string, ...Row]

const rows: StudentRow[] = [
  [DEMO_STUDENT_ID, 'tst_01', '2026-07-12', 'Full Test 1', 'Allen AITS', 3, 3, 180, [24, 12], [30, 8], [70, 12]],
  [DEMO_STUDENT_ID, 'tst_02', '2026-07-26', 'Full Test 2', 'Allen AITS', 3, 3, 175, [26, 10], [31, 7], [72, 10]],
  [DEMO_STUDENT_ID, 'tst_03', '2026-08-09', 'Major Test 3', 'Aakash', 4, 4, 180, [22, 14], [29, 9], [71, 13]],
  [DEMO_STUDENT_ID, 'tst_04', '2026-08-23', 'Full Test 4', 'Allen AITS', 3, 3, 172, [27, 10], [33, 6], [75, 9]],
  [DEMO_STUDENT_ID, 'tst_05', '2026-09-06', 'Full Test 5', 'Allen AITS', 2, 3, 168, [28, 9], [34, 6], [76, 8]],
  [DEMO_STUDENT_ID, 'tst_06', '2026-09-20', 'Major Test 6', 'Aakash', 5, 4, 180, [25, 11], [32, 8], [74, 10]],
  [DEMO_STUDENT_ID, 'tst_07', '2026-10-04', 'Full Test 7', 'Allen AITS', 3, 3, 170, [30, 8], [35, 5], [78, 7]],
  [DEMO_STUDENT_ID, 'tst_08', '2026-10-18', 'Full Test 8', 'Allen AITS', 3, 3, 174, [31, 7], [36, 5], [79, 7]],
  [DEMO_STUDENT_ID, 'tst_09', '2026-11-01', 'Full Test 9', 'Allen AITS', 3, 3, 171, [30, 9], [37, 4], [81, 6]],
  ['stu_riya', 'tst_r1', '2026-10-19', 'Mock 1', 'PW', 3, 3, 180, [18, 14], [27, 10], [64, 15]],
  ['stu_riya', 'tst_r2', '2026-11-02', 'Mock 2', 'PW', 3, 3, 178, [21, 12], [29, 9], [68, 12]],
]

const ts = (date: string) => `${date}T14:30:00.000Z`

export const SEED_TESTS: Test[] = [
  ...rows.map(([studentId, id, date, name, source, difficulty, paperLength, timeTaken, p, c, b]): Test => ({
    id,
    studentId,
    name,
    date,
    type: 'full',
    source,
    maxMarks: 720,
    totalQuestions: 180,
    durationMin: 180,
    timeTakenMin: timeTaken,
    difficulty,
    paperLength,
    subjects: [
      { subject: 'physics', totalQuestions: 45, correct: p[0], incorrect: p[1], unattempted: 45 - p[0] - p[1] },
      { subject: 'chemistry', totalQuestions: 45, correct: c[0], incorrect: c[1], unattempted: 45 - c[0] - c[1] },
      { subject: 'biology', totalQuestions: 90, correct: b[0], incorrect: b[1], unattempted: 90 - b[0] - b[1] },
    ],
    scheme: NEET_SCHEME,
    status: 'submitted',
    createdAt: ts(date),
    updatedAt: ts(date),
  })),
  {
    id: 'tst_10',
    studentId: DEMO_STUDENT_ID,
    name: 'Rotational Motion — chapter test',
    date: '2026-10-25',
    type: 'chapter',
    source: 'Self (PYQ set)',
    maxMarks: 180,
    totalQuestions: 45,
    durationMin: 60,
    timeTakenMin: 55,
    difficulty: 4,
    paperLength: 3,
    subjects: [{ subject: 'physics', totalQuestions: 45, correct: 32, incorrect: 7, unattempted: 6 }],
    scheme: NEET_SCHEME,
    status: 'submitted',
    createdAt: ts('2026-10-25'),
    updatedAt: ts('2026-10-25'),
  },
]

type M = [
  id: string,
  testId: string,
  subject: Mistake['subject'],
  chapter: string,
  topic: string,
  q: number,
  category: Mistake['category'],
  wrong: string,
  right: string,
  confidence: number,
  status: Mistake['status'],
  luckyGuess?: boolean,
]

const ms: M[] = [
  ['mis_01', 'tst_03', 'physics', 'Rotational Motion', 'Moment of inertia of a disc', 12, 'conceptual', 'Used MR² instead of MR²/2 for the disc.', 'List the standard MI table; disc about its axis = MR²/2.', 4, 'resolved'],
  ['mis_02', 'tst_03', 'physics', 'Current Electricity', 'Kirchhoff loop', 21, 'silly', 'Sign error going against current in the loop.', 'Mark loop direction first; IR is negative when moving with the current.', 3, 'resolved'],
  ['mis_03', 'tst_04', 'chemistry', 'Chemical Bonding', 'Hybridisation of XeF4', 58, 'memory', 'Said sp³d; it is sp³d².', 'Count bond pairs + lone pairs = 6 → sp³d².', 3, 'resolved'],
  ['mis_04', 'tst_05', 'biology', 'Human Reproduction', 'Hormone of corpus luteum', 141, 'memory', 'Picked LH.', 'Corpus luteum secretes progesterone — NCERT line, Ch. 3.', 2, 'reviewing'],
  ['mis_05', 'tst_06', 'physics', 'Rotational Motion', 'Rolling without slipping', 9, 'approach', 'Applied energy conservation but forgot rotational KE.', 'Rolling: KE = ½mv²(1 + k²/R²).', 4, 'open'],
  ['mis_06', 'tst_06', 'physics', 'Electromagnetic Induction', 'Motional EMF', 30, 'time', 'Left it for last, no time.', 'ε = Bvl — 30-second question; do it in the first pass.', 1, 'open'],
  ['mis_07', 'tst_06', 'chemistry', 'Organic Chemistry: Basic Principles', 'Stability of carbocations', 72, 'conceptual', 'Ranked by +I only, ignored hyperconjugation.', 'Compare resonance > hyperconjugation > inductive.', 3, 'reviewing'],
  ['mis_08', 'tst_07', 'physics', 'Rotational Motion', 'Angular momentum conservation', 15, 'conceptual', 'Thought ω stays constant when the skater pulls arms in.', 'L = Iω is conserved; I drops so ω rises.', 3, 'open'],
  ['mis_09', 'tst_07', 'biology', 'Principles of Inheritance and Variation', 'Dihybrid ratio', 160, 'silly', 'Wrote 9:3:3:1 but asked for test cross.', 'Test cross of dihybrid → 1:1:1:1.', 4, 'resolved'],
  ['mis_10', 'tst_07', 'biology', 'Plant Kingdom', 'Alternation of generations', 112, 'guess', 'Guessed between haplontic and diplontic.', 'Re-read NCERT table of life cycles.', 2, 'open', true],
  ['mis_11', 'tst_08', 'chemistry', 'Electrochemistry', 'Nernst equation', 64, 'misread', 'Missed that concentration was in mM.', 'Circle units before solving.', 4, 'open'],
  ['mis_12', 'tst_08', 'physics', 'Current Electricity', 'Meter bridge', 25, 'approach', 'Set up the wrong balance condition.', 'P/Q = l/(100 − l) with l from the left end.', 3, 'reviewing'],
  ['mis_13', 'tst_08', 'chemistry', 'Organic Chemistry: Basic Principles', 'Inductive effect order', 70, 'memory', 'Mixed up −I order of halogens.', 'F > Cl > Br > I for −I.', 2, 'open'],
  ['mis_14', 'tst_09', 'physics', 'Rotational Motion', 'Torque on a rod', 11, 'silly', 'Took the lever arm as full length instead of L/2.', 'Weight acts at the centre of mass.', 4, 'open'],
  ['mis_15', 'tst_09', 'biology', 'Molecular Basis of Inheritance', 'lac operon', 150, 'guess', 'Unsure if lactose is the inducer — got it right by luck.', 'Allolactose/lactose acts as inducer; repressor is from i gene.', 2, 'open', true],
  ['mis_16', 'tst_09', 'chemistry', 'Electrochemistry', 'Kohlrausch law', 66, 'conceptual', 'Could not split Λ°m for weak electrolyte.', 'Λ°(CH₃COOH) = Λ°(CH₃COONa) + Λ°(HCl) − Λ°(NaCl).', 2, 'open'],
]

export const SEED_MISTAKES: Mistake[] = ms.map(([id, testId, subject, chapter, topic, q, category, wrong, right, confidence, status, luckyGuess]) => {
  const date = SEED_TESTS.find((t) => t.id === testId)!.date
  return {
    id,
    studentId: DEMO_STUDENT_ID,
    testId,
    subject,
    chapter,
    topic,
    questionNumber: q,
    category,
    luckyGuess: !!luckyGuess,
    whatWentWrong: wrong,
    correctApproach: right,
    confidence,
    status,
    reviewDate: status === 'resolved' ? null : '2026-11-10',
    createdAt: ts(date),
    updatedAt: ts(date),
  }
})

const noNotes = { physics: '', chemistry: '', biology: '' }

export const SEED_REFLECTIONS: Reflection[] = [
  {
    testId: 'tst_06',
    difficulty: 5,
    confidence: 2,
    concentration: 3,
    stress: 4,
    finishedOnTime: false,
    timeNotes: 'Spent ~70 min on physics. Biology felt rushed.',
    subjectNotes: { physics: 'Rotation questions took too long.', chemistry: 'Organic was tricky.', biology: 'Fine, but rushed the last 15.' },
    sillyMistakes: 'At least 3 sign errors.',
    guessing: 'Guessed ~6 in physics.',
    chaptersToRevise: 'Rotational Motion, EMI',
    nextTarget: 540,
    comments: 'Hard paper — start with biology next time.',
    updatedAt: ts('2026-09-20'),
  },
  {
    testId: 'tst_08',
    difficulty: 3,
    confidence: 4,
    concentration: 4,
    stress: 2,
    finishedOnTime: true,
    timeNotes: 'Biology → Chemistry → Physics order worked.',
    subjectNotes: { ...noNotes, chemistry: 'Watch units in electrochem.' },
    sillyMistakes: 'One unit slip.',
    guessing: 'Very few guesses.',
    chaptersToRevise: 'Electrochemistry, GOC',
    nextTarget: 575,
    comments: 'Felt calm. Keep the same order.',
    updatedAt: ts('2026-10-18'),
  },
  {
    testId: 'tst_09',
    difficulty: 3,
    confidence: 4,
    concentration: 3,
    stress: 3,
    finishedOnTime: true,
    timeNotes: 'Finished with 9 minutes left.',
    subjectNotes: { physics: 'Rotation again — torque slip.', chemistry: 'Best chemistry so far.', biology: 'Genetics guesses.' },
    sillyMistakes: 'Torque lever arm.',
    guessing: '2 lucky guesses in biology.',
    chaptersToRevise: 'Rotational Motion, Molecular Basis of Inheritance',
    nextTarget: 590,
    comments: '',
    updatedAt: ts('2026-11-01'),
  },
]

export const SEED_TASKS: Task[] = [
  { id: 'tsk_01', studentId: DEMO_STUDENT_ID, title: 'Rotational Motion: redo 25 PYQs', description: 'Focus on rolling and torque. Time each one.', subject: 'physics', chapter: 'Rotational Motion', testId: 'tst_09', mistakeId: 'mis_14', priority: 'high', status: 'in_progress', dueDate: '2026-11-08', createdAt: ts('2026-11-01'), completedAt: null },
  { id: 'tsk_02', studentId: DEMO_STUDENT_ID, title: 'Make a GOC effects cheat-sheet', description: 'Inductive, resonance, hyperconjugation order with examples.', subject: 'chemistry', chapter: 'Organic Chemistry: Basic Principles', testId: 'tst_08', mistakeId: 'mis_13', priority: 'medium', status: 'pending', dueDate: '2026-11-07', createdAt: ts('2026-10-18'), completedAt: null },
  { id: 'tsk_03', studentId: DEMO_STUDENT_ID, title: 'Re-read NCERT: Molecular Basis of Inheritance', description: 'lac operon section + diagrams.', subject: 'biology', chapter: 'Molecular Basis of Inheritance', testId: 'tst_09', mistakeId: 'mis_15', priority: 'medium', status: 'pending', dueDate: '2026-11-10', createdAt: ts('2026-11-01'), completedAt: null },
  { id: 'tsk_04', studentId: DEMO_STUDENT_ID, title: 'Electrochemistry numericals — 20 Qs', description: 'Circle units before solving.', subject: 'chemistry', chapter: 'Electrochemistry', testId: 'tst_08', mistakeId: 'mis_11', priority: 'high', status: 'pending', dueDate: '2026-11-04', createdAt: ts('2026-10-18'), completedAt: null },
  { id: 'tsk_05', studentId: DEMO_STUDENT_ID, title: 'MI table flashcards', description: '', subject: 'physics', chapter: 'Rotational Motion', testId: 'tst_03', mistakeId: 'mis_01', priority: 'low', status: 'done', dueDate: '2026-08-15', createdAt: ts('2026-08-09'), completedAt: ts('2026-08-14') },
  { id: 'tsk_06', studentId: DEMO_STUDENT_ID, title: 'Try Biology-first order in next test', description: 'Then Chemistry, then Physics.', subject: null, chapter: '', testId: 'tst_06', mistakeId: null, priority: 'medium', status: 'done', dueDate: '2026-10-04', createdAt: ts('2026-09-20'), completedAt: ts('2026-10-04') },
  { id: 'tsk_07', studentId: DEMO_STUDENT_ID, title: 'Plant Kingdom life cycles table', description: '', subject: 'biology', chapter: 'Plant Kingdom', testId: 'tst_07', mistakeId: 'mis_10', priority: 'low', status: 'deferred', dueDate: null, createdAt: ts('2026-10-04'), completedAt: null },
]
