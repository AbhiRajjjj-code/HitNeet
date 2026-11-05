# 4. API specification

The app's "endpoints" are the methods of `HitNeetApi` in `src/services/api.ts`.
With Supabase these become database queries protected by Row Level Security
(RLS) and a few database functions — not hand-written REST routes. The table
below is the contract either way.

**S** = student, **A** = admin. "Own" = rows where `student_id` is the
signed-in student. Read methods take a `studentId`: a student passes their own
id, the admin passes the id of the student they are viewing.

**The admin view is read-only.** The admin can see every student, change
Settings and archive tests — but never creates or edits a student's tests,
mistakes, reflections or tasks (decision 0003).

## Auth
Anyone can create an account (Google or email + password). The **server**
decides the role from the email: the admin email → `admin`, everyone else →
`student`. The sign-in form never sends a role.

| Operation | S | A | Notes |
|-----------|---|---|-------|
| `getSession()` | ✓ | ✓ | `null` when signed out. Session = `{ userId, role, name, email }` |
| `signInWithPassword(email, pw)` | ✓ | ✓ | Same vague error for "no such email" and "wrong password" |
| `signInWithGoogle()` | ✓ | ✓ | Real: Supabase Auth Google OAuth. Demo: signs in as the sample student |
| `signUp({name, email, password})` | ✓ | ✓ | Password ≥ 8 chars. Returns `{ session }`; `session` is `null` when the email must be confirmed first (UI shows "check your inbox") |
| `requestPasswordReset(email)` | ✓ | ✓ | Always "succeeds" so it can't be used to discover accounts. The emailed link opens `/reset-password` |
| `completePasswordRecovery(tokenHash)` | ✓ | ✓ | Signs in from the one-time code in the reset email (`/reset-password?token_hash=…&type=recovery`). Works on any device, unlike the `?code=` flow, which needs the browser that asked for the reset |
| `updatePassword(password)` | ✓ | ✓ | Signed-in user sets a new password (used by `/reset-password`) |
| `signOut()` | ✓ | ✓ | |

## Students
| Operation | S | A | Notes |
|-----------|---|---|-------|
| `listStudents()` | ✗ 403 | ✓ | Name, email, test count, latest full-test score, last activity |
| `getStudent(id)` | self | ✓ | Profile only |

## Settings & reference data
| Operation | S | A | Notes |
|-----------|---|---|-------|
| `getSettings()` | read | read | exam date, marking scheme, paper pattern |
| `updateSettings(patch)` | ✗ 403 | ✓ | Rejects correct ≤ 0, penalty < 0. New scheme applies to tests saved **from now on** |
| `listChapters()` | ✓ | ✓ | Syllabus master list |

## Tests
| Operation | S | A | Notes |
|-----------|---|---|-------|
| `listTests(studentId, filter)` | own | ✓ | Filters: type, source, from/to date, drafts. Archived hidden |
| `getTest(id)` | own | ✓ | 404 for missing *or* not-yours (don't reveal existence) |
| `createTest(input, requestId)` | ✓ | ✗ | Validates every subject's counts add up. Same `requestId` → same test. Server copies today's marking scheme onto the test (`scheme`) |
| `updateTest(id, input)` | own | ✗ | Same validation. Keeps the test's original `scheme` |
| `archiveTest(id)` | ✗ 403 | ✓ | Soft delete; mistakes/reflection kept |

## Mistakes
| Operation | S | A | Notes |
|-----------|---|---|-------|
| `listMistakes(studentId, {testId?})` | own | ✓ | |
| `createMistake(input, requestId)` | ✓ | ✗ | Needs chapter + a test that belongs to the student |
| `updateMistake(id, input)` | own | ✗ | |
| `setMistakeStatus(id, status)` | own | ✗ | open → reviewing → resolved |

## Reflections (one per test)
| Operation | S | A | Notes |
|-----------|---|---|-------|
| `getReflection(testId)` | own | ✓ | `null` if none |
| `saveReflection(input)` | own | ✗ | Upsert |

## Tasks
| Operation | S | A | Notes |
|-----------|---|---|-------|
| `listTasks(studentId)` | own | ✓ | |
| `createTask(input, requestId)` | ✓ | ✗ | "Make a task" from a mistake uses `task-from-<mistakeId>` → max one per mistake |
| `setTaskStatus(id, status)` | own | ✗ | Sets `completedAt` when done |

## Errors
One shape everywhere: `ApiError { code, message }`. The UI shows `message` as-is.

| code | HTTP equivalent | When |
|------|-----------------|------|
| `unauthenticated` | 401 | not signed in / session expired |
| `forbidden` | 403 | signed in but role can't do this |
| `not_found` | 404 | missing, or belongs to someone else |
| `invalid` | 400 | validation failed |
| `conflict` | 409 | e.g. signing up with an email that already has an account |
| `network` | — | offline / server unreachable |

## Two implementations
| File | Used when | Backed by |
|------|-----------|-----------|
| `src/services/mockApi.ts` | `VITE_DATA_SOURCE=demo` (default) | Browser localStorage + sample data |
| `src/services/supabaseApi.ts` | `VITE_DATA_SOURCE=supabase` | Supabase Auth + Postgres. Tests are saved through the `save_test` database function; everything else is table access filtered by RLS |

The Supabase version maps database errors to the same `ApiError` codes, e.g.
Postgres `42501` (permission) → `forbidden`, `23514` (a CHECK rule) → `invalid`.

## Verified by tests
`supabase/tests/database.test.ts` runs the real migrations in PGlite and checks
the database rules directly (roles, privacy between students, read-only admin,
scheme snapshot, archive). `src/services/mockApi.test.ts` checks: signed-out rejection, vague sign-in
errors, role decided by email, duplicate sign-up blocked, a student can't read
another student, only the admin lists students, the admin can't edit study
records, frozen marking schemes, invalid counts rejected, duplicate requests
don't create duplicates (per user), saved data persists.

## CSV export
Settings → Export downloads every student's tests or mistakes with a `student`
column. Text cells starting with `= + - @` get a leading `'` so Excel/Sheets
never runs them as formulas (CSV formula injection).
