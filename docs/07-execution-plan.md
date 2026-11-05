# 7. Execution plan

| Stage | What | Status |
|-------|------|--------|
| 1 | Review the original proposal, adjust scope | ✅ Done |
| 2 | Pick the stack | ✅ Supabase + Vercel + GitHub |
| 3 | Frontend prototype on demo data | ✅ Done, peer-reviewed |
| 4 | UI round 1: accounts + login redesign, Add test as home, Analysis tab, multi-student admin, per-test marking scheme | ✅ Done |
| 5 | Backend: Supabase schema, auth, RLS, connect screens | ⏳ Next |
| 6 | Deploy to Vercel, end-to-end tests, backups | Not started |

CI (typecheck, lint, tests, build) runs on every push and pull request.

## Backend plan
1. Create a Supabase project (Mumbai region).
2. Migrations: tables, CHECK constraints, `test_results` view, RLS policies,
   scheme-snapshot trigger, role-from-email trigger + `admin_emails` table.
3. Seed chapters + settings. The admin email is added from the Supabase
   dashboard, not committed to the repo.
4. Auth: Google sign-in + email/password + password reset (Supabase Auth).
   Open sign-up: anyone can join as a student. Add a `/reset-password` page
   for the emailed link.
5. `supabaseApi.ts` implementing `HitNeetApi`; switch via `VITE_DATA_SOURCE`.
6. Re-run the permission tests against the real database.
7. Hide demo-only UI (banner, role switch, demo accounts box) when `IS_DEMO` is false.
8. Playwright end-to-end tests for the main flows (sign in each role, add a
   test, log a mistake, admin sees it, export CSV, forbidden routes redirect).
9. Storage bucket for question photos (private).
10. Weekly CSV backup routine.

## Accounts and secrets
| Service | Safe to put in the app / repo | Never in the repo |
|---------|-------------------------------|-------------------|
| Supabase | Project URL, **anon (public) key** — only via env vars | `service_role` key, DB password |
| Vercel | The `*.vercel.app` URL | Access tokens |
| GitHub | — | Passwords, personal access tokens |

Secrets go in `.env.local` (git-ignored) and the Vercel dashboard. Variable
names will be listed in `.env.example` (added with the backend).

## Known limitations of the prototype
- Sign-in is simulated: demo accounts share the password `hitneet-demo`, and
  "Continue with Google" signs in as the sample student. No reset email is sent.
- Open sign-up means anyone with the link can create a student account. Their
  data is private to them, and the admin can see it.
- Data lives only in the browser (localStorage). Clearing site data resets it.
- Question-photo upload is a placeholder.
- First download is ~104 KB gzipped; charts (~111 KB) load only on chart pages.
