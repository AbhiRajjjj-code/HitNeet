# 8. Glossary

| Term | Plain meaning |
|------|---------------|
| **Frontend** | The part that runs in the browser — screens, buttons, charts. |
| **Backend** | The part on a server that stores data and decides who may do what. |
| **API** | The agreed list of requests the frontend can make to the backend. |
| **Endpoint** | One item on that list, e.g. "create a test". |
| **Database** | Organised storage for records (tables of rows). HitNeet uses Postgres (through Supabase). |
| **Supabase** | A hosted service giving you a Postgres database, login, and file storage. |
| **Postgres** | A popular, reliable open-source database. |
| **Table / row / column** | Like a sheet / one line / one heading in a spreadsheet. |
| **Primary key (PK)** | A column that uniquely identifies a row (we use UUIDs). |
| **Foreign key (FK)** | A column that points to a row in another table (mistake → its test). |
| **UUID** | A random ID like `3f2a…` — unique without asking the database. |
| **Migration** | A file describing a database change, kept in Git so changes are repeatable. |
| **RLS (Row Level Security)** | Database rules like "a student can only read rows with her own id". |
| **Authentication** | Proving who you are (logging in). |
| **Authorization** | What you're allowed to do once logged in (your role). |
| **Role** | Student or admin. |
| **Idempotent** | Doing it twice has the same effect as once — no duplicates on retry. |
| **React** | A library for building UI out of components. |
| **Component** | A reusable piece of UI, written as a function returning JSX. |
| **JSX / TSX** | HTML-like syntax inside JavaScript/TypeScript files. |
| **TypeScript** | JavaScript with types, so many bugs show up before running. |
| **Hook** | A React function starting with `use…` that adds state or effects. |
| **State** | Data a screen remembers (e.g. what you typed). |
| **Props** | Inputs passed to a component. |
| **Route** | A URL path mapped to a screen. |
| **Vite** | The tool that runs the dev server and builds the app. |
| **Tailwind** | CSS written as small class names (`p-4`, `text-ink`). |
| **Build** | Turning source code into small files browsers can load fast (`dist/`). |
| **Hosting** | A computer on the internet that serves your built files. |
| **Vercel** | Free hosting that redeploys every time you push to GitHub. |
| **Environment variable** | A setting (like an API key) kept outside the code, e.g. in `.env.local`. |
| **Git / commit / branch** | Version history / a saved snapshot / a separate line of work. |
| **GitHub** | Website that stores your Git repository online. |
| **CI** | Automatic checks (tests, build) run on every push. |
| **localStorage** | Small storage inside one browser. Used for the demo and drafts. |
| **Optimistic update** | Show the change immediately, undo it if the server refuses. |
| **Lint** | A tool that flags suspicious code. We use oxlint. |
| **Unit test** | Code that checks a small function gives the right answer. We use Vitest. |
| **Migration** | A SQL file that changes the database's structure. Applied in order, kept in Git, never edited after it's applied — you add a new one instead. |
| **Publishable key** | The Supabase key the browser uses. Safe to expose: it can only do what the RLS rules allow. |
| **Secret key** | The Supabase key that bypasses RLS. Server-only; never in the app or the repo. |
| **Environment variable** | A setting kept outside the code (`.env.local`), e.g. which database to use. `VITE_*` ones are bundled into the browser app. |
| **RPC** | "Remote procedure call" — the app calls a database function by name, e.g. `save_test`. |
| **PGlite** | Postgres compiled to run inside Node or a browser, in memory. Used to test the migrations without a server. |
