# KAS Athletics — Code Audit Report

**Branch audited:** `main` (after merging `page-builder` foundation).  
**Date:** 2026-11-10.  
**Tools available:** Node.js 26, `npm test`. CodeQL and Semgrep are **not installed locally** (semgrep/codeql binaries absent); a CodeQL workflow (`.github/workflows/codeql.yml`) was added by a collaborator and will run in GitHub Actions. No commercial SAST ran locally.

## Test results

- `npm test` → **112 tests, 112 pass, 0 fail** (Node 26, experimental coverage).
- Static build (`npm run build`) → succeeds, 32 pages exported.
- Server smoke test → `/`, `/scores`, `/admin/`, `/admin/src/*` whitelist behaves as intended (disallowed sources → 404).

## Critical issues

None found that are exploitable in the default configuration. The architecture (escaping, CSP, CSRF, scrypt, rate limit, upload signature checks) is sound.

## High-priority issues

1. **Public repository exposes student data.** `data/content.json` and `data/uploads/` (rosters, names, photos) are committed to a public repo for free GitHub Pages hosting. This is a documented, owner-accepted decision, but it is a real privacy exposure. Mitigation: get school leadership approval, or move to private hosting (Node server) before wide use. (DEVELOPER.md §9.)
2. **Editor key (GitHub PAT) is stored in `localStorage`/`sessionStorage`.** Any XSS would steal it. Mitigation relies entirely on the strict CSP and escaping; keep both. Consider a short token expiry and a "sign out everywhere" option.
3. **In-memory sessions/rate limits reset on restart.** A server restart signs everyone out and clears brute-force counters. Acceptable for this scale; document for operators.

## Medium-priority issues

4. **`/admin/src/` serves source files.** Whitelist is enforced and tested (auth.js, store.js, uploads.js, app.js → 404; schema/validate/migrate/sections → 200). Keep the whitelist minimal; do not add `auth.js`/`store.js`/`uploads.js`/`app.js`.
5. **Undo history keeps a corrupted title snapshot** (`data/history/...__admin.json` with "HOME OF THE DRA"). Harmless (history is undo-only), but it can be restored by staff. Optional cleanup.
6. **`tests/fixtures/content.json` must stay in the old shape** to exercise migration. Documented in HANDOFF. Do not "modernize" it without adding a new-shape fixture.
7. **Browser preview in GitHub mode** depends on `./src/...` imports; the old `admin/lib/` copy is no longer generated. Verified in build output.
8. **No automated browser/E2E tests.** Playwright is not installed (zero-dep rule). Manual checks are documented; consider a small Playwright suite outside the main repo if desired.

## Low-priority improvements

9. **Files over the ~400-line guideline:** `public/admin/fields.js` (230 lines, ok), `public/css/site.css` (exception), `src/render/sections.js` (~400 lines). Split if it grows.
10. **`inline.js` is large (314 lines)** and will grow with the builder; plan to split into `inline/` modules.
11. **Accessibility:** themes include high-contrast; verify focus rings on all controls (spot-check done). Drag-to-reorder on real phones not yet verified.
12. **Firefox:** no scroll-driven animations (by design, fade-in fallback).

## Editor-specific problems

- The editor defaults to "Edit on the page" (visual.js) — good.
- Draft is preserved across sign-out (admin.js `isDirty`/`keepDraft`) — good.
- Conflict handling via version sha — good.
- GitHub-mode publish commits `data/content.json` and triggers a ~1-minute rebuild — expected, not a bug (README explains).
- **Remaining work (tasks 6–8)** for the Canva-like builder: full-screen toolbar, pages panel, undo/redo, in-preview section tools, details dialogs. Foundation (tasks 1–5) is done and pushed.

## Security findings

- Passwords: scrypt (N=16384), timing-safe compare, min 10 chars. Good.
- Sessions: HttpOnly, SameSite=Strict, Secure when HTTPS/TRUST_PROXY. 8h TTL. Good.
- CSRF: token compared on writes. Good.
- CSP: no inline scripts, strict. Good.
- Uploads: signature-based type detection, 8MB cap, random names. Good.
- Path traversal: `serveFile` resolves and checks prefix; history id regex-validated. Good.
- Rate limit: 8/15min per IP, in-memory. Good.
- No secrets in git history (checked). Good.
- Workflow permissions are minimal (`contents: read`, `pages: write`, `id-token: write`). Good.

## Performance findings

- Static assets cache-busted by `ASSET_VERSION` hash. Good.
- Images shrunk in-browser before upload. Good.
- No npm dependencies. Good.

## Recommended next steps

1. Finish builder tasks 6–8 (UI) on `page-builder`, then merge to `main`.
2. Add a Playwright smoke suite (optional, outside zero-dep core).
3. Get leadership approval for the public repo / student data exposure.
4. Change the local `admin` password before any public Node deployment.
5. Set up off-site backup of `data/` (history only keeps 100 versions locally).

## Conclusion

The project is **ready for an instructor demonstration**: tests pass, build succeeds, core flows work, and security posture is appropriate for a school athletics site. The main gaps are the unfinished builder UI (tasks 6–8) and the documented privacy/hosting decisions, none of which block a demo.