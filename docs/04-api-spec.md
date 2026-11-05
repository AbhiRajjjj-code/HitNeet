# 4. API specification

The app's "endpoints" are the methods of `HitNeetApi` in `src/services/api.ts`.
With Supabase these become database queries protected by Row Level Security
(RLS) and a few database functions — not hand-written REST routes. The table
below is the contract either way.

**S** = student, **A** = admin. "Own" = rows where `student_id` is the
student the session belongs to.

## Auth
| Operation | S | A | Notes |
|-----------|---|---|-------|
| `getSession()` | ✓ | ✓ | `null` when signed out |
| `signIn…` / `signOut()` | ✓ | ✓ | Demo: pick a role. Real: Supabase Auth (Google or email magic link) |

## Settings & reference data
| Operation | S | A | Notes |
|-----------|---|---|-------|
| `getSettings()` | read | read | exam date, marking scheme, paper pattern |
| `updateSettings(patch)` | ✗ 403 | ✓ | Rejects correct ≤ 0, penalty < 0 |
| `listChapters()` | ✓ | ✓ | Syllabus master list |

## Tests
| Operation | S | A | Notes |
|-----------|---|---|-------|
| `listTests(filter)` | own | ✓ | Filters: type, source, from/to date, drafts. Archived hidden |
| `getTest(id)` | own | ✓ | 404 for missing *or* not-yours (don't reveal existence) |
| `createTest(input, requestId)` | ✓ | ✗ | Validates every subject's counts add up. Same `requestId` → same test |
| `updateTest(id, input)` | own | ✗ | Same validation |
| `archiveTest(id)` | ✗ 403 | ✓ | Soft delete; mistakes/reflection kept |

## Mistakes
| Operation | S | A | Notes |
|-----------|---|---|-------|
| `listMistakes({testId?})` | own | ✓ | |
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
| `listTasks()` | own | ✓ | |
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
| `conflict` | 409 | (reserved) |
| `network` | — | offline / server unreachable |

## Verified by tests
`src/services/mockApi.test.ts` checks: signed-out rejection, student can't
archive or change settings, admin can, invalid counts rejected, duplicate
requests don't create duplicates, saved data persists.
