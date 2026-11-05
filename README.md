# HitNeet

**Test. Analyse. Improve. Repeat.**

A NEET mock-test tracker. After each mock test, a student records their marks,
logs the mistakes that cost them, reflects on how the paper went, and turns it
into small tasks. Trends show what's improving and what keeps coming back.
Anyone can sign up as a student; an admin can follow every student's progress
(read-only) to help.

> **Status:** frontend complete on a mock API with demo data. Backend (Supabase) is next.
> All data shown is fictional.

## Features
- **Sign in / sign up** — email + password or Google, forgot password; role decided by the server
- **Add a test** (student home) — exam countdown, 3 short steps, live score preview, autosaved draft, retry-safe saving
- **Analysis** — latest score on a 0–720 track, trend, subject cards, next tasks
- **Mistake journal** — 7 mistake types, lucky guesses, filters, "make a task"
- **Reflection** — difficulty, confidence, concentration, stress, notes, next target
- **Progress** — score/subject/accuracy/negative-marks trends, difficulty context, recurring patterns
- **Planner** — tasks linked to mistakes, gentle progress
- **Admin** — list of all students, per-student overview with a switcher, settings (exam date, marking scheme), CSV export
- **Fair scoring** — every test keeps the marking scheme it was saved with

## Run it locally
You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:5173 and use the **demo accounts** box on the sign-in page
(password `hitneet-demo`).

**Using a real Supabase database:** copy `.env.example` to `.env.local`, fill in
your project URL and publishable key, set `VITE_DATA_SOURCE=supabase`, and apply
the schema with:

```bash
npx supabase link --project-ref <your-project-ref>
```

```bash
npx supabase db push --remote
```

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the dev server with live reload |
| `npm test` | Run unit tests (scoring, API rules) and database security tests (PGlite) |
| `npm run typecheck` | Check TypeScript types |
| `npm run lint` | Lint the code |
| `npm run build` | Production build into `dist/` |

## Stack
React 19 · TypeScript · Vite · Tailwind CSS v4 · Recharts · React Router.
Backend: Supabase (Postgres, Auth, Row Level Security), schema as SQL migrations. Hosting: Vercel.

## Learn how it works
Design notes live in [`docs/`](docs/README.md) — architecture, API, database,
design system, plan, decision records and a glossary.

## Project structure
```
src/
  domain/      scoring, analytics, types (pure, tested)
  services/    API contract + mock and Supabase implementations
  mock/        demo data
  components/  ui/, domain/, charts/, layout/
  pages/       auth/, student/, shared/, admin/
supabase/      migrations/ (database schema as SQL) + tests/ (security rules)
docs/          design docs + decision records
```
