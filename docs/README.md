# HitNeet docs — your learning folder

This folder explains **how HitNeet is built and why**, written so you can learn
full-stack development by reading it alongside the code. Read in order.

| # | File | What you'll learn |
|---|------|-------------------|
| 1 | [01-system-design.md](01-system-design.md) | What the app does, who uses it, what's in and out of scope |
| 2 | [02-architecture.md](02-architecture.md) | The big picture: frontend, backend, database, hosting — with diagrams |
| 3 | [03-frontend-guide.md](03-frontend-guide.md) | How the React code is organised, file by file |
| 4 | [04-api-spec.md](04-api-spec.md) | Every "endpoint" the app calls, who's allowed to call it |
| 5 | [05-database-schema.md](05-database-schema.md) | The tables we'll create in Supabase, and why |
| 6 | [06-design-system.md](06-design-system.md) | Colours, fonts, components, writing rules |
| 7 | [07-execution-plan.md](07-execution-plan.md) | The stages, what's done, what's next, what you'll need to do |
| 8 | [08-glossary.md](08-glossary.md) | Plain-English meanings of every technical word used here |
| — | [decisions/](decisions/) | "Architecture Decision Records": one short file per big choice |

## The 60-second version

```
 Phone / laptop browser
        │
        ▼
 ┌─────────────────────┐      today: mockApi (browser storage, demo data)
 │  React frontend      │ ───▶ later: supabaseApi (real database + login)
 │  (what you see)      │
 └─────────────────────┘
        hosted free on Vercel                 Supabase (free): Postgres DB,
                                              login, file storage, security rules
```

- **Frontend** = the screens. Built with React. Lives in `src/`.
- **Backend** = the part that stores data and checks permissions. Will be Supabase.
- **The API layer** (`src/services/api.ts`) is the contract between them. Screens
  never talk to the database directly — only through this contract. That's why we
  could build every screen first using fake data.
