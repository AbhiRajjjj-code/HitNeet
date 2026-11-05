# 0003 — Open sign-up, role decided by email, read-only admin

**Status:** Accepted (5 Nov 2026)

## Context
HitNeet started as a tracker for one student (my sister). Other family members
preparing for NEET want to use it too, each with their own private records,
while I (as admin) can follow everyone's progress.

## Decision
- **Anyone can create an account**, with Google or email + password. Every new
  account is a **student**.
- **The server decides the role from the email.** One configured email is the
  only admin (stored in the database, not in the code). The sign-in form never
  sends a role, so typing someone's email into the browser can't grant admin.
- **Admin is read-only for study records.** The admin sees every student
  (`/admin` lists them all), changes Settings (exam date, marking scheme) and
  can archive a test, but does not create or edit tests, mistakes, reflections
  or tasks. Each student owns their own records.
- Login page: email + password, "Forgot password?", "Continue with Google",
  and a separate sign-up page.

## Alternatives considered
- *Invite-only sign-up* (admin adds emails first). Safer against strangers,
  but more steps for every new student. Rejected for now; easy to add later with an
  `allowed_emails` check in the sign-up trigger.
- *Admin assigns tasks / edits mistakes.* Rejected: the student should own
  their journal and planner.

## Consequences
- + One app for any number of students; a new student needs no setup from the admin.
- + Row Level Security does the real protection: students read/write only
  `student_id = auth.uid()`; the admin reads all.
- − Strangers who find the link can sign up. Their data is private to them,
  and they appear in the admin's student list.
- − Settings (exam date, scheme) are shared by everyone, which suits NEET
  since all students sit the same exam.
