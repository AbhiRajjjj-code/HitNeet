# 7. Execution plan

| Stage | What | Status |
|-------|------|--------|
| 1 | Review proposal, suggest changes | ✅ Done |
| 2 | Access checklist | ✅ Done (see below) |
| 3 | Approve architecture | ✅ Approved: Supabase + Vercel + GitHub |
| 4 | **Frontend prototype on demo data** | ✅ Built — awaiting your review |
| 5 | Your feedback → UI changes | ⏳ Next |
| 6 | Backend: Supabase schema, auth, RLS, connect screens | Not started |
| 7 | GitHub CI, deploy to Vercel, handover | Repo initialised locally |

## Stage 6 plan (backend)
1. You create a Supabase project (Mumbai region) — I'll walk you through it.
2. Migrations: tables, CHECK constraints, `test_results` view, RLS policies.
3. Seed chapters + settings.
4. Auth: Google sign-in (or email magic link). Two accounts: you (admin), her (student).
5. `supabaseApi.ts` implementing `HitNeetApi`; switch via `VITE_DATA_SOURCE`.
6. Re-run the permission tests against the real database.
7. Storage bucket for question photos (private).
8. Weekly CSV backup routine.

## What you'll need to do (and when)
| When | Action | Share with me | Never share |
|------|--------|---------------|-------------|
| Before pushing code | Create a GitHub account (if needed) + empty **private** repo `HitNeet` | Repo URL | Password, tokens |
| Before backend | Create a Supabase account + project | Project URL + **anon (public) key** | `service_role` key, DB password |
| Before backend | Decide: her email for login | — | — |
| Before deploy | Create a Vercel account, "Import" the GitHub repo | The `*.vercel.app` URL | — |

Secrets go in `.env.local` (never committed) and the Vercel dashboard.

## Known limitations of the prototype
- Demo login (pick a role) — real sign-in comes in Stage 6.
- Data lives only in this browser (localStorage). Clearing site data resets it.
- Question-photo upload is a placeholder.
- Admin can't edit the student's mistakes/reflections (view only) — by design for v1.
- Charts library makes the first download ~190 KB gzipped; can be split later.
