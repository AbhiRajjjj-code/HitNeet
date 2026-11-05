# 0002 — Build the frontend first, behind an API contract

**Status:** Accepted

## Context
I wanted to review and iterate on the design before any backend work, and to
learn full-stack development step by step on a real project.

## Decision
All screens call `api` from `src/services/`. Today that is `mockApi`, which
behaves like a real server (delays, validation, permission errors, idempotency).
In Stage 6 a `supabaseApi` implements the same `HitNeetApi` interface.

## Consequences
- + The UI was built and reviewed with zero accounts or secrets.
- + Loading, error and permission states are already handled, because the mock
  produces them.
- − The mock's rules must be mirrored in the database; `mockApi.test.ts`
  documents them so they can be re-checked against Supabase.
