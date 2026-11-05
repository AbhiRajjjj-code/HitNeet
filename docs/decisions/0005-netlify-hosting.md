# 0005 — Host the frontend on Netlify

**Status:** Accepted (Nov 2026). Replaces the earlier plan to use Vercel.

## Context
The frontend is a static single-page app (`npm run build` → `dist/`); the
database and login live on Supabase. Any static host works. Requirements: free,
no domain purchase, HTTPS, automatic deploys from GitHub, and preview links for
pull requests.

## Decision
Use Netlify. Settings live in `netlify.toml` in the repo (build command,
output folder, Node version, single-page-app fallback, security headers), so
the deploy setup is versioned like the code. The three `VITE_*` values are set
in the Netlify dashboard, never committed.

## Alternatives considered
- **Vercel** — equivalent features; the original plan. No strong reason either way.
- **Cloudflare Pages** — very fast in India; equally good.
- **GitHub Pages** — no PR previews, and a sub-folder URL that needs routing workarounds.

## Consequences
- + `hitneet.netlify.app` (or similar) address, HTTPS, deploy on every merge.
- + Every pull request gets its own preview URL to test on a phone before merging.
- − The live address must be added to Supabase's allowed redirect URLs for
  Google sign-in and password resets to return to the right place.
