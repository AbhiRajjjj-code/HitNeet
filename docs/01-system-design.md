# 1. System design

## Problem

A NEET aspirant takes a mock test roughly every two weeks. The coaching portal gives
a score, but not *why* marks were lost or *what to do next*. Notes end up scattered.

HitNeet turns each mock into: a recorded result → logged mistakes → a short
reflection → a few concrete tasks → trends over time.

I built it first for my sister, then opened it up so other family members
preparing for NEET can use it too.

## Users and roles

| Role | Who | Can do |
|------|-----|--------|
| **Student** | Anyone who signs up (Google or email + password) | Add/edit their own tests, log mistakes, write reflections, manage their tasks, see their analytics |
| **Admin** | One configured email | See every student's records (read-only); change shared settings (exam date, marking scheme); archive tests; export CSV |

**Tenancy:** many students, each with private records. Every record carries a
`student_id`; the database only lets a student read and write their own rows.
The role is decided by the server from the email — see
[decision 0003](decisions/0003-accounts-roles-and-read-only-admin.md).

## Core flows

1. **Add a test** — the student's home page (target: under 3–5 minutes on a
   phone). Name, date, type → correct/incorrect per subject (blank is worked
   out) → optional difficulty/time.
2. **Log a mistake** — subject, chapter, type of mistake, what went wrong, the fix.
   Includes *lucky guesses* (right answer, but unsure).
3. **Reflect** — difficulty, confidence, concentration, stress (1–5), notes, next target.
4. **Plan** — turn a mistake into a task; tick tasks off.
5. **Analysis & progress** — latest score, trends, subject accuracy, negative
   marks, recurring patterns.
6. **Admin** — list of all students → one student's overview, framed for
   supporting, not grading.

## Non-functional requirements

| Need | How |
|------|-----|
| Works on a phone | Mobile-first layout, bottom tab bar on every screen size, 44px tap targets, no sideways scroll at 375px |
| Never lose data | Drafts autosave in the browser; saves are retry-safe (idempotent) |
| Correct numbers | Scores recalculated from raw counts × the marking scheme frozen on each test; server validates |
| Private | Database rules enforce who sees what; a student never sees another student's data |
| Honest analytics | "Not enough data yet" instead of guessing; no chapter accuracy without chapter data |
| Kind tone | Never "weak"/"failed"; one score is never called a trend |
| Times | All dates shown in Asia/Kolkata |

## Scale (year one)

A handful of students × ~25 mock tests, ~300 mistakes and ~100 tasks each —
a few MB of data. Free tiers are far more than enough.

## Out of scope for now

AI recommendations, OCR of question papers, notifications, payments, native app,
admin editing a student's records. (Question-photo upload comes with the backend.)

## Open questions

- Exact NEET 2027 date and pattern — the admin sets these in Settings once NTA publishes.
- Whether sign-up should become invite-only if strangers start signing up.
