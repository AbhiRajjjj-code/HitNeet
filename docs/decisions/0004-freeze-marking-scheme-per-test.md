# 0004 — Freeze the marking scheme on each test

**Status:** Accepted (5 Nov 2026). Replaces the earlier plan in
`05-database-schema.md` where every score used the *current* scheme.

## Context
Scores are always calculated from raw counts (correct / incorrect / blank) ×
a marking scheme (+4 / −1 / 0 for NEET today). If the admin later changes the
scheme in Settings, recalculating every old test with the new scheme would
silently rewrite history — last month's 573 could become something else.

## Decision
When a test is saved, the server copies the current scheme onto the test
(`test.scheme`). Every score for that test is calculated with **its own**
scheme. Editing a test's counts keeps its original scheme. Only tests saved
after a Settings change use the new scheme.

The browser never sends the scheme — `TestInput` doesn't include it.

## Consequences
- + Old scores never change unexpectedly; trends stay honest.
- + Still no stored totals: scores are still derived from raw counts.
- − Three extra columns per test in the database.
- − If the scheme was entered wrongly and later fixed, old tests keep the wrong
  one. Fixing them would be a deliberate, separate action (not built yet).
