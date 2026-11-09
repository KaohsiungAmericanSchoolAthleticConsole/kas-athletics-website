# KAS Athletics website — Developer guide

Everything the next developer needs: what this project is for, the rules it is
built by, how it works, how to change it safely, and a record of every version.

> **Rule zero:** every change to this project gets an entry in the
> [Version history](#version-history) below, in the same commit as the change.

`README.md` is the short guide for running the site and for staff. This file is
the long guide for developers.

---

## 1. What we are trying to achieve

The athletics department of **Kaohsiung American School (KAS)** needs a website
for the KAS Dragons that:

1. **Lasts for decades.** It must keep working in 10–20 years with almost no
   maintenance, even if nobody touches the code for a long time.
2. **Has excellent UI and UX** for families, students and visitors, on phones
   first. It offers themes: Auto, Light, Dark, Dragon (school colors) and High
   contrast.
3. **Can be updated by non-technical staff** (coaches, the athletic director,
   student council) without a developer: change text, swap photos, add games
   and scores.
4. **Replaces the old WordPress site** (`kasathleticstg.wpenginepowered.com`).
   Its content (teams, rosters, photos, games, coaches) was imported in v1.0.

Who uses it:

| Person | Uses | How |
|---|---|---|
| Visitors (families, students, other schools) | Public pages | Any browser, mostly phones |
| Staff (athletic director, coaches, council) | Staff editor at `/admin` | Signs in, edits, presses **Publish changes** |
| Developer (you) | The code in this folder | Node.js, git, GitHub |

Current owner of the project: Brian Yang (developer). Athletic Director named on
the site: Stella Chen.

---

## 2. The rules (read before changing anything)

These rules exist because of goal 1 (decades) and goal 3 (non-technical staff).
Breaking one needs a very good reason, written in the version history.

### Longevity
- **Zero npm dependencies.** `package.json` has no `dependencies` and no
  `devDependencies`. Use only Node.js built-ins (`node:http`, `node:crypto`,
  `node:test` …) and the browser's built-in APIs. No frameworks, no bundlers, no
  build tools beyond `src/build.js`. *Why:* dependencies get abandoned, break
  and need security updates; built-ins don't.
- **Plain HTML, CSS and JavaScript** that any developer in 2045 can read. ES
  modules, no TypeScript or JSX compile step.
- **Content is one readable JSON file**: `data/content.json`, plus photos in
  `data/uploads/`. Backing up those two backs up the whole site.
- **Node 22 or newer.** It's tested on Node 26 locally and Node 22 in CI.
- The only external resource is **Google Fonts** (Barlow / Barlow Condensed),
  with system-font fallbacks, so the site still works if it disappears.
  YouTube and Google Calendar embeds are optional content.

### Staff must not be able to break the site
- **The schema is the single source of truth** (`src/schema.js`). The editor
  builds its forms from it, and both the server and the GitHub editor validate
  every save against it. Add a field there, then use it in a template.
- **Everything typed by staff is escaped** before it reaches a page (`esc` /
  the `html` tagged template in `src/lib/html.js`). Never write raw HTML from
  content. Links are restricted to `https://`, `mailto:`, `tel:` and site paths.
- **Every save keeps the previous version** (undo history), and **stale saves
  are refused** (if two people edit at once, the second is warned instead of
  overwriting the first).
- **Friendly messages.** Every error a staff member can see must say what to do
  next, in plain English.

### Quality
- **All tests pass before every commit:** `npm test`. CI runs them too, and a
  failure blocks publishing.
- **Write a test for every bug you fix and every feature you add** (`node:test`,
  files in `tests/`).
- **Files stay small and focused** (roughly under 400 lines; `site.css` is the
  exception).
- **Accessibility:** semantic HTML, a visible keyboard focus, labels on every
  control, `prefers-reduced-motion` respected, and a High contrast theme.
- **Phone-first:** check 375px width. No sideways scrolling.
- **Security headers** are set in `src/app.js` (CSP with no inline scripts,
  `X-Frame-Options`, etc.). Don't add inline `<script>` or `style=""`
  attributes; the CSP blocks them.

### Process
- **Commit messages:** `type: description` (types: `feat`, `fix`, `refactor`,
  `docs`, `test`, `chore`, `perf`, `ci`).
- ⚠️ **Never write the words "skip ci" inside square brackets in a commit
  message.** GitHub reads that anywhere in the message and **skips publishing
  the website** (this happened once; see v1.7).
- Update **this file** (version history) and, if staff-facing, `README.md`.
- Push to `main` publishes the website automatically (section 6).

---

## 3. How it works (architecture)

```
                        ┌──────────────────────── data/content.json  (all text, games, teams…)
                        │                         data/uploads/       (photos)
                        ▼
 src/schema.js ──► src/lib/validate.js        (shape + safety rules for content)
                        │
 src/render/*.js  ──────┤  plain template strings → full HTML pages
   layout.js  header, footer, theme menu, <head>
   pages.js   home, season, schedule, coaches, contact, 404
   team.js    one team: /<season>/<team>
   scores.js  scoreboard /scores and /scores/standings
   parts.js   shared pieces (photo, event row, page hero)
   edit.js    click-to-edit markers (only inside the admin preview)
                        │
        ┌───────────────┴────────────────┐
        ▼                                ▼
  src/app.js  (Node server)        src/build.js  (static export)
  pages + /api + /admin            dist/ → GitHub Pages
        │                                │
        ▼                                ▼
  public/admin/*  Staff editor — same code in both places; backend.js picks
                  "server mode" (/api) or "GitHub mode" (GitHub API + editor key)
```

There are **two ways to run the site**, and both are supported:

| | Node server (`npm start`) | GitHub Pages (live now) |
|---|---|---|
| Public pages | Rendered on each request | Pre-built by `src/build.js` on every push |
| Staff editor `/admin` | Username + password, saves via `/api` | **Editor key** (GitHub token), saves by committing to the repo |
| Photo uploads | `data/uploads/` on the server | Committed to `data/uploads/` in the repo |
| Undo history | `data/history/` (last 100) | Git commit history of `data/content.json` |
| Conflict check | Version fingerprint of the file | Git `sha` of the file |
| Live site after publish | Immediately | ~1 minute (GitHub Actions rebuild) |

Live URLs:
- Site: <https://kaohsiungamericanschoolathleticconsole.github.io/kas-athletics-website/>
- Editor: `…/kas-athletics-website/admin`
- Repo: <https://github.com/KaohsiungAmericanSchoolAthleticConsole/kas-athletics-website> (public, on purpose, for hosting)

### Folder map

| Path | What it is |
|---|---|
| `server.js` | Starts the HTTP server (`PORT`, `HOST`, `DATA_DIR`, `TRUST_PROXY`) |
| `src/app.js` | Routing, security headers, staff API, edit-mode rules |
| `src/schema.js` | **Every editable field.** Drives forms and validation |
| `src/build.js` | Static export to `dist/` (+ editor when `PAGES_REPO` is set) |
| `src/lib/html.js` | Escaping, safe URLs, paragraphs, YouTube IDs |
| `src/lib/validate.js` | Validates/cleans content against the schema (also shipped to the browser) |
| `src/lib/store.js` | Reads/writes `content.json` atomically, history, version check, backup fallback |
| `src/lib/auth.js` | Staff accounts (scrypt), sessions, login rate-limit |
| `src/lib/uploads.js` | Photo upload checks (real image bytes, 8 MB max) |
| `src/lib/events.js` | Game dates in school time (Asia/Taipei), formatting |
| `src/lib/static.js` | Prefixes links for a sub-folder, removes server-only bits |
| `src/render/` | Page templates (see diagram) |
| `public/css/site.css` | Whole design system: tokens, 5 themes, all components |
| `public/css/motion.css` | Scroll-driven animations (CSS only, off for reduced motion) |
| `public/js/site.js` | Theme menu, mobile menu, video facade, scoreboard refresh, count-up |
| `public/js/theme-init.js` | Sets the theme before first paint (no flash) |
| `public/admin/` | Staff editor (see section 5) |
| `public/img/` | `icons.svg` sprite, fallback `crest.svg` |
| `data/content.json` | **The content.** Edited by staff through the editor |
| `data/uploads/` | Photos (65 imported from WordPress, in `imported/`) |
| `data/users.json` | Staff password hashes. **Not in git** |
| `data/history/` | Server-mode undo history. **Not in git** |
| `scripts/set-password.js` | `npm run set-password` creates/resets a staff account |
| `tests/` | `node:test` suites (50 tests) |
| `.github/workflows/pages.yml` | Test → build → deploy to GitHub Pages on push to `main` |

---

## 4. Running and testing

```bash
npm start                 # http://localhost:3000   editor: /admin
npm run dev               # same, restarts when files change
npm test                  # all tests + coverage (must pass before committing)
npm run build             # static export to dist/ (site at domain root)
npm run set-password      # create the first staff account (server mode)
```

Static export for GitHub Pages (CI does this for you):

```bash
BASE_PATH=/kas-athletics-website PAGES_REPO=KaohsiungAmericanSchoolAthleticConsole/kas-athletics-website npm run build
```

Local staff login (server mode): username `admin`. The password is set in
`data/users.json` (not in git); the owner knows it. **Change it before running a
public server**: `npm run set-password -- admin`.

Before committing, also check by hand (in a browser): the home page at 375px
and 1440px, all 5 themes, `/admin` sign-in → **Edit on the page** → edit →
**Discard**.

---

## 5. The staff editor (`public/admin/`)

| File | Role |
|---|---|
| `index.html` | Shell: sign-in forms (password or editor key), sidebar, dialogs |
| `admin.js` | State (draft vs saved), navigation, publish/discard/history, preview messaging |
| `backend.js` | **Server mode** (`/api`) and **GitHub mode** (GitHub REST API). Same interface |
| `fields.js` | Builds forms from the schema: text, image, list (reorder, duplicate, search), team dropdown, opponent memory, auto web address |
| `visual.js` | "Edit on the page": page picker + Computer/Phone preview iframe |
| `inline.js` / `inline.css` | Runs *inside* the preview iframe: click-to-type, Change photo, drag ⠿ to reorder; sends changes to `admin.js` with `postMessage` |
| `pages.js` | Staff accounts page and Help page |
| `dom.js` | `h()` element builder (never `innerHTML`), immutable `getIn`/`setIn`, `parsePath` |
| `images.js` | Shrinks photos in the browser (max 2400px, WebP) before upload |

Key behaviors:
- **Draft model:** edits change `state.draft`; nothing is public until
  **Publish changes**. "Unpublished changes" warns before leaving the page.
- **Edit on the page happens only inside `/admin`.** Public pages are never
  editable. The server adds click-to-edit markers only when a signed-in staff
  member loads a page with `?admin-edit` (inside the editor's iframe). The
  GitHub export ships separate editable copies under `/admin/preview/`.
- **Mode is chosen automatically:** if `admin/config.json` exists (only in the
  GitHub Pages export), GitHub mode; otherwise server mode.
- **GitHub mode editor key** = a GitHub personal access token with the
  `public_repo` scope, stored in `localStorage` (or `sessionStorage` if
  "Remember me" is off) under `kas-editor-key`. Photo commits are tagged so
  they don't rebuild the site; the next content publish includes them.

### Adding a new editable field (the common task)
1. Add it to `src/schema.js` (type, label, help, limits).
2. Use it in a template in `src/render/` with `${…}` (escaping is automatic).
3. Optional, for on-page editing: add `${ed('path.to.field')}` on the element
   (or `edit: 'path'` on `photo()`), see `src/render/edit.js`.
4. If old content lacks the field, nothing breaks: validation fills in `''`.
5. Add a test; add a version-history entry.

### Adding a new public page
Add a render function in `src/render/`, a route in `page()` in `src/app.js`,
the file list in `src/build.js` (and `editablePages` there if it has editable
content), a nav entry in `navItems()` in `layout.js`, and **add its URL to
`RESERVED_SLUGS`** in `validate.js` so no sports page can take the same address.

---

## 6. Deploying

- **GitHub Pages (current):** push to `main` → `.github/workflows/pages.yml`
  runs `npm test`, then the static build, then deploys. Pages source in repo
  settings must stay **GitHub Actions**. Staff publishing from `/admin` commits
  `data/content.json`, which triggers the same workflow.
  - Because staff commit on GitHub, **run `git pull` before working locally.**
  - Repo identity in this folder (local git config only): user
    `KaohsiungAmericanSchoolAthleticConsole`, noreply email, pushing over SSH
    with `~/.ssh/kas_athletics_ed25519` (`core.sshCommand`). Other projects on
    the Mac are unaffected.
- **Node server (optional, for a real domain):** any host that runs Node 22+.
  Put HTTPS in front, set `TRUST_PROXY=1`, keep `data/` on persistent,
  backed-up storage. WP Engine cannot run it (WordPress only).

---

## 7. Gotchas (things that bit us)

- **"skip ci" in square brackets in any commit message stops the website
  publishing.** Photo uploads use it on purpose; never put it in normal commits.
- **`backdrop-filter` on a parent breaks `position: fixed` children.** The
  header's frosted glass is on `.site-header::before` for this reason; putting
  it back on `.site-header` makes phones scroll sideways (v1.6.1).
- **Cache-busting:** CSS/JS URLs carry `?v=<hash of the files>`
  (`ASSET_VERSION` in `layout.js`). If you add a new CSS/JS file to every page,
  add it to that hash list, or browsers will keep old copies for a year.
- **Links in templates are absolute (`/fall-sports`).** The static build
  prefixes them for the sub-folder (`src/lib/static.js`). Inside
  `public/admin/`, use **relative** URLs or `new URL('…', import.meta.url)`, so
  the editor works both at `/admin/` and at `/kas-athletics-website/admin/`.
- **`src/render/edit.js` uses a module-level flag** during a synchronous render.
  Never make rendering `async`, or edit markers could leak to visitors (a test
  checks this).
- **Games appear on a team page and in the standings only if the game's Team
  equals the team name exactly.** The editor's Team dropdown guarantees it.
- **Dates are school-local** (`Asia/Taipei`). Stored as `YYYY-MM-DD`; don't turn
  them into `Date` objects in local time.
- **The login rate-limit test must stay last** in `tests/app.test.js`. It locks
  out further logins from 127.0.0.1.
- **Server-mode sessions live in memory**: restarting the server signs staff
  out. The editor keeps their unpublished draft and restores it after sign-in.
- **Count-up numbers** in the stats strip are skipped in the editor preview so
  they don't overwrite text being edited.

---

## 8. Limits and settings

| Setting | Value | Where |
|---|---|---|
| Staff session | 8 hours | `src/lib/auth.js` |
| Failed logins before lockout | 8 per 15 minutes per IP | `src/lib/auth.js` |
| Minimum password | 10 characters | `src/lib/auth.js` |
| Undo history kept (server mode) | 100 versions | `src/lib/store.js` |
| Photo upload max | 8 MB (after browser shrinking to ≤2400px) | `uploads.js`, `images.js` |
| Reserved web addresses | admin, api, uploads, css, js, img, events, coaches, contact, scores | `src/lib/validate.js` |
| School time zone | Asia/Taipei | `src/lib/events.js` |
| Themes | auto, light, dark, dragon, contrast | `layout.js`, `site.css` |
| School colors | red `#d7141f`, navy `#0b1440` (editable in Site settings) | `content.json` → `/brand.css` |

---

## 9. Known issues and next steps

Content (staff can fix in the editor):
- No upcoming games, and no scores entered yet. The 5 imported games (Sept–Oct
  2026) have no scores, so Standings is empty.
- Rosters are from 2024–25 (mostly class of '25); boys volleyball and JV girls
  have first names only.
- 11 teams have no photo; no team has a description or practice times.

Not yet verified:
- A real sign-in and publish on the GitHub-hosted editor with a real editor key
  (it was tested against a simulated GitHub API and a fake key).
- Drag-to-reorder with a finger on a real phone; Firefox (it has no
  scroll-driven animations, so it gets simple fade-ins by design).

Decisions to revisit:
- **The repo is public** (needed for free GitHub Pages) and contains students'
  names and team photos. Get school leadership's approval, or move to private
  hosting.
- The local `admin` password is weak (owner's choice for testing). Change it
  before any public Node server.
- Branch `apple-redesign`: an unfinished Apple-style redesign (system fonts,
  calm motion), kept for reference. It is **behind** `main` by many features;
  don't merge it wholesale. Cherry-pick ideas if wanted.
- Possible future work: Stats/Players tabs on the scoreboard (needs data), a
  custom domain, auto-updating the GitHub Pages site from a Node server.

---

## Version history

Newest first. Each entry: **version — date — commit(s)**, then what changed and
why. Version numbers are this project's own: minor = feature, patch = fix.
To see or restore any version: `git log --oneline`, then
`git switch -c look-at-old <commit>` (safe) or `git revert <commit>`.

### v1.8 — 2026-11-09 — DEVELOPER.md
- Added this developer guide: goals, rules, architecture, how-tos, gotchas,
  known issues and this version history.

### v1.7 — 2026-11-09 — `8f51516`, `7b82d13`
**Staff editor on GitHub Pages.** `/admin` now works on the static site.
- `public/admin/backend.js`: one interface, two backends: server (`/api`) and
  GitHub (REST API with a staff "editor key"). Publishing commits
  `data/content.json` (rebuilds the site); photos commit to `data/uploads/`
  without rebuilding; history = file commits; git `sha` mismatch = the usual
  conflict warning; content is validated in the browser before sending.
- Build ships the editor, `admin/config.json`, the schema and validator, and
  editable page copies (`/admin/preview/…`) when `PAGES_REPO` is set.
- Editor asset paths made relative so it works from a sub-folder.
- 7 new tests against a simulated GitHub API.
- `7b82d13` re-triggered publishing: `8f51516`'s message happened to contain
  the skip-ci marker, so GitHub skipped it (see Gotchas).

### v1.6.1 — 2026-11-09 — `cd7cba2`
**Fix: phones could scroll sideways.** The header's `backdrop-filter` made the
off-screen mobile menu part of the page width. Moved the effect to
`.site-header::before`.

### v1.6 — 2026-11-09 — `883482c`, `80f1e8a`
**Public site published to GitHub Pages.**
- `src/lib/static.js`: `BASE_PATH` support (prefix links for
  `/kas-athletics-website/`); removes the staff link and scoreboard team filter
  from static pages.
- `.github/workflows/pages.yml`: test → build → deploy on every push to `main`.
- Tested by crawling the export in a sub-folder: 31 pages, 102 files, 0 broken.
- `80f1e8a`: empty commit to trigger the first deploy after Pages was enabled.

### v1.5 — 2026-11-09 — `e32d9c9`
**Click-to-edit moved inside `/admin`** (owner's request: public pages must
never be editable). New "Edit on the page" section, the default after sign-in,
with a page picker and Computer/Phone widths. The server renders edit markers
only for staff and only with `?admin-edit` (and allows framing by the same site
only for those responses). Edits flow to the editor's draft via `postMessage`;
one Publish button for everything.

### v1.4 — 2026-11-09 — `a3f4d94` *(superseded by v1.5)*
Click-to-edit on the live public pages with a floating staff toolbar: type over
text, replace photos (button or drag-and-drop), drag ⠿ to reorder cards
(mouse, touch, arrow keys), Publish/Discard.

### v1.3 — 2026-11-09 — `afe8898`
**Friendlier editor and safety nets.**
- Editor: Team dropdown (was free text), opponent suggestions that reuse logos,
  web addresses auto-filled from titles, search in long lists, Discard changes,
  Staff accounts page (add/reset/remove staff), built-in Help page.
- Server: versioned saves (stale editor → 409 conflict warning), saves run one
  at a time, content normalized on load, fallback to the last good backup if
  `content.json` is damaged, expired sessions and failed-login records swept.
- Fixes: duplicated items clashing on web address, re-uploading the same photo,
  list open-state after reorder, date sort with missing times, offline errors.

### v1.2 — 2026-11-09 — `e85eba3`
**Scoreboard** at `/scores` (modeled on a league scoreboard): game cards with
crests, scores, winner marker, status (Live/Final/Today/upcoming/postponed/
cancelled), highlight thumbnails, team filter, auto-refresh while games are on.
`/scores/standings` computes W-L-T, win % and last-5 form. Games gained
opponent, logo, scores, status and highlight-photo fields.

### Branch `apple-redesign` — 2026-11-09 — `00d71ba` *(not merged)*
Experimental Apple-style redesign (system fonts, centered headlines, gray
tiles, frosted nav, calm motion). The owner chose to go back to the v1.1 look.
Kept on its own branch for reference.

### v1.1 — 2026-11-09 — `8211d40`
**Scroll-driven animations** (`public/css/motion.css`): hero parallax and fade,
reading-progress bar, section-title wipes, staggered scoreboard rows, parallax
season tiles, two-way text marquee, director spread, card/roster/gallery
reveals, stat count-up. CSS `animation-timeline` with an IntersectionObserver
fallback; all off under reduced motion.

### v1.0 — 2026-11-09 — `933326e`
**First version.**
- Zero-dependency Node.js site: home, season pages, team pages, schedule,
  coaches, contact, 404; 5 themes; "Game Day Editorial" design (condensed
  headlines, school red and navy).
- Staff editor at `/admin`, generated from `src/schema.js`; photo upload with
  in-browser shrinking; undo history; scrypt passwords, sessions, CSRF tokens,
  rate-limited login, strict CSP.
- Static export (`npm run build`).
- Content imported from the WordPress site: 21 teams in 4 seasons, rosters,
  galleries, 5 real games, coaches, director's message, recap video, calendar,
  school seal; 65 photos converted to WebP (20 MB → 5.4 MB).
- Git repository created with this version as the first commit.
