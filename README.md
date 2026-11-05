# HitNeet

**Test. Analyse. Improve. Repeat.**

A personal NEET mock-test tracker. After each mock test, the student records her
marks, logs the mistakes that cost her, reflects on how the paper went, and turns
it into small tasks. Trends show what's improving and what keeps coming back.
A separate admin view lets a family member follow along and help.

> **Status:** frontend prototype running on demo data. Backend (Supabase) is next.
> All data shown is fictional.

## Features
- **Home** — exam countdown, latest score on a 0–720 track, trend, subject cards, next tasks
- **Add a test** — 3 short steps, live score preview, autosaved draft, retry-safe saving
- **Mistake journal** — 7 mistake types, lucky guesses, filters, "make a task"
- **Reflection** — difficulty, confidence, concentration, stress, notes, next target
- **Progress** — score/subject/accuracy/negative-marks trends, difficulty context, recurring patterns
- **Planner** — tasks linked to mistakes, gentle progress
- **Admin** — overview, history, patterns, settings (exam date, marking scheme), CSV export

## Run it locally
You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:5173 and pick **student** or **admin**.

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the dev server with live reload |
| `npm test` | Run unit tests (scoring + API rules) |
| `npm run typecheck` | Check TypeScript types |
| `npm run lint` | Lint the code |
| `npm run build` | Production build into `dist/` |

## Stack
React 19 · TypeScript · Vite · Tailwind CSS v4 · Recharts · React Router.
Backend planned: Supabase (Postgres, Auth, Storage, Row Level Security). Hosting: Vercel.

## Learn how it works
Everything is explained in [`docs/`](docs/README.md) — architecture, API, database,
design system, plan, and a glossary.

## Project structure
```
src/
  domain/      scoring, analytics, types (pure, tested)
  services/    API contract + mock implementation (tested)
  mock/        demo data
  components/  ui/, domain/, charts/, layout/
  pages/       student/, shared/, admin/
docs/          learning docs + decision records
```
