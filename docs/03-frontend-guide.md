# 3. Frontend guide — a tour of the code

Start the app (see the main README), then open these files in order.

## Entry point
| File | What it does |
|------|--------------|
| `index.html` | The single HTML page. Loads fonts and `src/main.tsx`. |
| `src/main.tsx` | Mounts React into `<div id="root">`. |
| `src/App.tsx` | **Routes** — which URL shows which screen. `/app/*` = student, `/admin/*` = admin. `RequireRole` sends you to the right place. |
| `src/index.css` | **Design tokens** (colours, fonts, radii) in the `@theme` block. Tailwind turns them into classes like `bg-brand-600`. |

## Domain (pure logic — the "brain")
| File | What it does |
|------|--------------|
| `src/domain/types.ts` | The shape of every record (Test, Mistake, Reflection, Task, Settings). Mirrors the database. |
| `src/domain/scoring.ts` | Score, negative marks, accuracy, attempt rate, validation. **Tested in `scoring.test.ts`.** |
| `src/domain/analytics.ts` | Trends, subject snapshots, recurring patterns, chapter rows — each with "enough data?" checks. |
| `src/domain/labels.ts` | Friendly names + subject colours. Change wording here, not in screens. |
| `src/domain/dates.ts` | Dates in Asia/Kolkata. |

## Services (talking to "the server")
| File | What it does |
|------|--------------|
| `src/services/api.ts` | **The contract**: a TypeScript interface listing every operation. |
| `src/services/mockApi.ts` | Fake server using browser storage. Validates, checks roles, prevents duplicates. **Tested in `mockApi.test.ts`.** |
| `src/services/index.ts` | Chooses which implementation the app uses. One line changes in Stage 6. |

## State & hooks
| File | What it does |
|------|--------------|
| `src/context/AppContext.tsx` | Who's signed in + settings, available everywhere via `useApp()`. |
| `src/hooks/useAsync.ts` | Load data → gives `loading`, `error`, `data`, `reload`. Every screen uses it. |
| `src/hooks/useStudentData.ts` | Loads tests + mistakes + tasks together for dashboards. |

## Components
| Folder | Contents |
|--------|----------|
| `components/ui/` | Generic: `Button`, `Panel`, `TextField`, `Stepper`, `Rating`, `EmptyState`, `ErrorState`, toasts |
| `components/domain/` | HitNeet-specific: `ScoreTrack` (the 720 bar), `MistakeSheet`, `TaskItem`, chips |
| `components/charts/` | All Recharts charts |
| `components/layout/Shell.tsx` | Sidebar (desktop), bottom bar (phone), demo banner |

## Screens
| URL | File |
|-----|------|
| `/login` | `pages/Login.tsx` |
| `/app` | `pages/student/Home.tsx` |
| `/app/tests/new`, `/app/tests/:id/edit` | `pages/student/AddTest.tsx` |
| `/app/tests/:id/reflection` | `pages/student/Reflection.tsx` |
| `/app/tests`, `/admin/tests` | `pages/shared/Tests.tsx` |
| `/app/tests/:id`, `/admin/tests/:id` | `pages/shared/TestDetail.tsx` |
| `/app/mistakes`, `/admin/mistakes` | `pages/shared/Mistakes.tsx` |
| `/app/progress`, `/admin/progress` | `pages/shared/Progress.tsx` |
| `/app/plan`, `/admin/tasks` | `pages/shared/Planner.tsx` |
| `/admin` | `pages/admin/Overview.tsx` |
| `/admin/settings` | `pages/admin/Settings.tsx` |

"Shared" screens check `session.role` to hide student-only buttons. That's for
convenience — the **server** is what actually blocks forbidden actions.

## Patterns worth learning here
- **Every data screen handles 4 states**: loading (skeleton), error (message +
  retry), empty (what to do next), and success.
- **Optimistic updates**: ticking a task updates the screen instantly, then rolls
  back if the server says no (`TaskItem.tsx`).
- **Idempotency key**: forms create a `requestId` once; a retry sends the same id
  so the server never creates a duplicate (`AddTest.tsx`, `mockApi.ts`).
- **Draft autosave**: the Add Test form saves to `localStorage` as you type.
