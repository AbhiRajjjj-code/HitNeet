# 1. System design

## Problem

A NEET aspirant takes a mock test roughly every two weeks. The coaching portal gives
a score, but not *why* marks were lost or *what to do next*. Notes end up scattered.

HitNeet turns each mock into: a recorded result → logged mistakes → a short
reflection → a few concrete tasks → trends over time.

## Users and roles

| Role | Who | Can do |
|------|-----|--------|
| **Student** | Chhoti (one account) | Add/edit her tests, log mistakes, write reflections, manage tasks, see analytics |
| **Admin** | Brother (one account) | See everything; change settings (exam date, marking scheme); archive tests; export CSV. Can't tick her tasks or edit her reflections |

**Tenancy:** one student today. Every record still carries a `student_id`, so a
second student later is a data change, not a rewrite.

## Core flows

1. **Add a test** (target: under 3–5 minutes on a phone) — name, date, type →
   correct/incorrect per subject (blank is worked out) → optional difficulty/time.
2. **Log a mistake** — subject, chapter, type of mistake, what went wrong, the fix.
   Includes *lucky guesses* (right answer, but unsure).
3. **Reflect** — difficulty, confidence, concentration, stress (1–5), notes, next target.
4. **Plan** — turn a mistake into a task; tick tasks off.
5. **Review progress** — trends, subject accuracy, negative marks, recurring patterns.
6. **Admin overview** — the same data, framed for supporting, not grading.

## Non-functional requirements

| Need | How |
|------|-----|
| Works on a phone | Mobile-first layout, bottom navigation, 44px tap targets, no sideways scroll at 375px |
| Never lose data | Drafts autosave in the browser; saves are retry-safe (idempotent) |
| Correct numbers | Scores always recalculated from raw counts; server validates |
| Private | Only the two accounts can sign in; database rules enforce who sees what |
| Honest analytics | "Not enough data yet" instead of guessing; no chapter accuracy without chapter data |
| Kind tone | Never "weak"/"failed"; one score is never called a trend |
| Times | All dates shown in Asia/Kolkata |

## Scale (year one)

~25 mock tests, ~300 mistakes, ~100 tasks, 2 users. Under 1 MB of data.
Any free tier is far more than enough; performance is a non-issue at this size.

## Out of scope for v1

AI recommendations, OCR of question papers, multiple students, notifications,
payments, native app. (Question-photo upload comes with the backend.)

## Open questions

- Exact NEET 2027 date and pattern — admin sets these in Settings once NTA publishes.
