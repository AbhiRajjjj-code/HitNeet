# 7. Execution plan

| Stage | What | Status |
|-------|------|--------|
| 1 | Review the original proposal, adjust scope | ✅ Done |
| 2 | Pick the stack | ✅ Supabase + Netlify + GitHub |
| 3 | Frontend prototype on demo data | ✅ Done, peer-reviewed |
| 4 | UI round 1: accounts + login redesign, Add test as home, Analysis tab, multi-student admin, per-test marking scheme | ✅ Done |
| 5 | Backend: Supabase schema, auth, RLS, connect screens | ✅ Done — database live, email + Google sign-in working |
| 6 | Deploy to Netlify, end-to-end tests, backups | 🔄 Deploy in progress |

CI (typecheck, lint, tests, build) runs on every push and pull request.

## Backend plan
1. ✅ Create a Supabase project (Mumbai region).
2. ✅ Migrations: tables, CHECK rules, RLS policies, scheme-snapshot trigger,
   role-from-email trigger + `admin_emails` table. Applied with `supabase db push --remote`.
3. ✅ Seed chapters + settings. Admin email added from the dashboard (not in Git).
4. ✅ Database rules tested in CI with PGlite (`supabase/tests/`).
5. ✅ `supabaseApi.ts` implementing `HitNeetApi`; switch via `VITE_DATA_SOURCE`.
6. ✅ Email + password sign-in, sign-up (with "confirm your email"), `/reset-password`.
7. ⏸ "Confirm email" is turned off while only a few people use the app.
   Before a wider launch: add a custom SMTP sender (e.g. Gmail app password) so
   confirmation and password-reset emails reach everyone, then turn it back on.
8. ✅ Google sign-in (Google Cloud OAuth client → Supabase provider). The Google
   app is in "Testing" mode (only listed test users) until it's published.
9. ✅ Demo-only UI (banner, role switch, demo accounts box) hidden when `IS_DEMO` is false.
10. Playwright end-to-end tests for the main flows (sign in each role, add a
   test, log a mistake, admin sees it, export CSV, forbidden routes redirect).
11. Storage bucket for question photos (private).
12. Weekly CSV backup routine.

## Accounts and secrets
| Service | Safe to put in the app / repo | Never in the repo |
|---------|-------------------------------|-------------------|
| Supabase | Project URL, **anon (public) key** — only via env vars | `service_role` key, DB password |
| Netlify | The `*.netlify.app` URL | Access tokens |
| GitHub | — | Passwords, personal access tokens |

Settings go in `.env.local` (git-ignored) locally and in Netlify → Site configuration → Environment variables for the live site. Variable
names will be listed in `.env.example` (added with the backend).

## Known limitations of the prototype
- Sign-in is simulated: demo accounts share the password `hitneet-demo`, and
  "Continue with Google" signs in as the sample student. No reset email is sent.
- Open sign-up means anyone with the link can create a student account. Their
  data is private to them, and the admin can see it.
- Data lives only in the browser (localStorage). Clearing site data resets it.
- Question-photo upload is a placeholder.
- First download is ~159 KB gzipped (the Supabase library added ~55 KB); charts (~111 KB) load only on chart pages. Could be trimmed by loading only the selected API.
