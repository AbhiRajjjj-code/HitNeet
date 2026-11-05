/** Human-friendly names for every enum. Keep wording supportive. */
import type { MistakeCategory, MistakeStatus, Priority, Subject, TaskStatus, TestType } from './types'

export const SUBJECT_LABEL: Record<Subject, string> = {
  physics: 'Physics',
  chemistry: 'Chemistry',
  biology: 'Biology',
}

/** Tailwind classes per subject — one place, consistent everywhere. */
export const SUBJECT_STYLE: Record<Subject, { text: string; bg: string; soft: string; hex: string }> = {
  physics: { text: 'text-phy', bg: 'bg-phy', soft: 'bg-phy-soft', hex: '#0f8fd1' },
  chemistry: { text: 'text-chem', bg: 'bg-chem', soft: 'bg-chem-soft', hex: '#d98a0b' },
  biology: { text: 'text-bio', bg: 'bg-bio', soft: 'bg-bio-soft', hex: '#1a9a4b' },
}

export const TEST_TYPE_LABEL: Record<TestType, string> = {
  full: 'Full syllabus',
  part: 'Part syllabus',
  chapter: 'Chapter-wise',
  subject: 'Subject-wise',
}

export const CATEGORY_LABEL: Record<MistakeCategory, string> = {
  conceptual: 'Concept unclear',
  silly: 'Silly / calculation slip',
  memory: 'Forgot formula or fact',
  approach: 'Wrong approach',
  time: 'Ran out of time',
  guess: 'Guess / unsure',
  misread: 'Misread the question',
}

export const CATEGORY_HINT: Record<MistakeCategory, string> = {
  conceptual: "Didn't understand the idea or couldn't apply it",
  silly: 'Sign, unit, arithmetic or bubbling error',
  memory: 'Forgot a formula, fact or NCERT line',
  approach: 'Knew the topic, picked the wrong method',
  time: "Couldn't reach it or rushed it",
  guess: 'Answered without being sure — right or wrong',
  misread: 'Missed "NOT", "incorrect", units or a condition',
}

export const CATEGORY_COLOR: Record<MistakeCategory, string> = {
  conceptual: '#5b3fd9',
  silly: '#e0731f',
  memory: '#1e9bd7',
  approach: '#9c3fb5',
  time: '#b45309',
  guess: '#6e6a85',
  misread: '#c62828',
}

export const MISTAKE_STATUS_LABEL: Record<MistakeStatus, string> = {
  open: 'To review',
  reviewing: 'Reviewing',
  resolved: 'Sorted',
}

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  pending: 'To do',
  in_progress: 'Doing',
  done: 'Done',
  deferred: 'Later',
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export const RATING_WORDS: Record<string, [string, string]> = {
  difficulty: ['Easy', 'Very hard'],
  paperLength: ['Short', 'Very long'],
  confidence: ['Shaky', 'Very sure'],
  concentration: ['Distracted', 'Fully focused'],
  stress: ['Calm', 'Very stressed'],
}
