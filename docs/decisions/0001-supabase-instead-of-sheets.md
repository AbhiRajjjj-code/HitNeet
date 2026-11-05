# 0001 — Supabase instead of Google Sheets + Apps Script

**Status:** Accepted (approved by owner, Nov 2026)

## Context
The original proposal used Google Sheets as the database and Apps Script as the
backend. Requirements include backend-enforced roles, idempotent saves, and a
fast mobile experience.

## Decision
Use Supabase (hosted Postgres + Auth + Storage). Offer CSV export so data can
still be opened in Sheets/Excel.

## Alternatives considered
- **Sheets + Apps Script** — familiar, but: no real user sessions, every call
  takes 1–3 s, quotas, row-level permissions must be hand-written, no constraints
  or foreign keys.
- **Firebase** — good auth, but a document database makes relational queries
  (tests → subjects → mistakes) awkward.
- **Own Node.js server** — most flexible, but more to host and secure.

## Consequences
- + Real login, permissions enforced by the database, relational data, free.
- − Free project pauses after 7 idle days (one-click resume).
- − One more account to create.
