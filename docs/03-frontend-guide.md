# 3. Frontend guide — a tour of the code

Start the app (see the main README), then open these files in order.

## Entry point
| File | What it does |
|------|--------------|
| `index.html` | The single HTML page. Loads fonts and `src/main.tsx`. |
| `src/main.tsx` | Mounts React into `<div id="root">`. |
| `src/App.tsx` | **Routes** — which URL shows which screen. `/app/*` = a student's own pages, `/admin/students/:studentId/*` = the admin looking at one student. `RequireRole` sends each role to the right place. |
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
| `components/layout/Shell.tsx` | Top bar, bottom tab bar (all screen sizes), demo banner, admin student switcher |

## Screens
| URL | File |
|-----|------|
| `/login`, `/signup`, `/forgot-password` | `pages/auth/AuthPages.tsx` |
| `/privacy`, `/terms` | `pages/legal/Legal.tsx` (public; required by Google before publishing "Continue with Google") |
| `/app` (student home) and `/app/tests/:id/edit` | `pages/student/AddTest.tsx` |
| `/app/analysis` | `pages/student/Analysis.tsx` (the old "Home" dashboard) |
| `/app/tests/:id/reflection` | `pages/student/Reflection.tsx` |
| `/app/tests`, `/admin/students/:sid/tests` | `pages/shared/Tests.tsx` |
| `/app/tests/:id`, `/admin/students/:sid/tests/:id` | `pages/shared/TestDetail.tsx` |
| `/app/mistakes`, `/admin/students/:sid/mistakes` | `pages/shared/Mistakes.tsx` |
| `/app/progress`, `/admin/students/:sid/progress` | `pages/shared/Progress.tsx` |
| `/app/plan`, `/admin/students/:sid/tasks` | `pages/shared/Planner.tsx` |
| `/admin` | `pages/admin/Students.tsx` (everyone who signed up) |
| `/admin/students/:sid` | `pages/admin/Overview.tsx` |
| `/admin/settings` | `pages/admin/Settings.tsx` |

**Whose data?** Shared screens call `useStudentId()` (in `hooks/useStudentData.ts`):
a student always gets their own id; the admin gets the `:studentId` from the URL.
`useBase()` gives the matching link prefix (`/app` or `/admin/students/:sid`).

"Shared" screens check `session.role` to hide student-only buttons. That's for
convenience — the **server** is what actually blocks forbidden actions.

**Login artwork:** `public/login-art.webp` (97 KB, converted from the 1.9 MB
original PNG). If the file is missing, the login page shows the tagline instead.

**Navigation:** one layout on every screen size — top bar (logo, name, Planner
or Settings, sign out) and a bottom tab bar. There is no desktop sidebar.

## Patterns worth learning here
- **Every data screen handles 4 states**: loading (skeleton), error (message +
  retry), empty (what to do next), and success.
- **Optimistic updates**: ticking a task updates the screen instantly, then rolls
  back if the server says no (`TaskItem.tsx`).
- **Idempotency key**: forms create a `requestId` once; a retry sends the same id
  so the server never creates a duplicate (`AddTest.tsx`, `mockApi.ts`).
- **Draft autosave**: the Add Test form saves to `localStorage` as you type.
