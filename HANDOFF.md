# HANDOFF — read this first

Written 2026-11-10 by Claude (AI developer), for whoever continues this project
next (a person, or Claude / another AI assistant). The owner, Brian Yang, asked
for "everything done so far, as long and detailed as possible".

This file is the **story and the current state**. For the permanent rules,
architecture and version history, read **`DEVELOPER.md`** right after this.

---

## 0. TL;DR (30-second version)

- **What:** the website for **KAS Athletics** (Kaohsiung American School,
  Taiwan; mascot: the Dragons). It replaces an old WordPress site. Node.js,
  **zero npm dependencies**, plain HTML/CSS/JS, content in `data/content.json`.
- **Live:** <https://kaohsiungamericanschoolathleticconsole.github.io/kas-athletics-website/>
  (GitHub Pages; republished automatically on every push to `main`).
- **Staff editor:** `…/kas-athletics-website/admin`. Sign in with a GitHub
  "editor key" (a personal access token). Locally: `npm start` → `localhost:3000/admin`
  (username/password).
- **Repo:** <https://github.com/KaohsiungAmericanSchoolAthleticConsole/kas-athletics-website>
  (public on purpose, for free hosting). Branches: `main` (live),
  `page-builder` (**unfinished work in progress**, see section 6),
  `apple-redesign` (abandoned experiment).
- **State:** `main` is stable. 51 tests pass, deployed and working. The owner
  has published real edits from the GitHub-hosted editor.
- **In progress:** a **Canva-like page builder** (full-screen editor,
  add/drag/restyle sections, prebuilt layouts, right-click menu). Only the
  first two data files exist (on branch `page-builder`). **Section 6 is the
  complete spec and task list. Continue from there.**

---

## 1. The owner and how to work with them

- **Brian Yang** is a student developer at KAS who built this for the athletics
  department; future **students** will maintain the site. Non-technical staff
  and students must be able to edit it. Write explanations in plain language.
- He communicates casually and briefly, often with typos ("thie folder",
  "jsut"). Read for intent.
- He likes to **see results** (preview in the browser) and decides by feel.
  When a decision has real trade-offs, offer 2 options with a recommendation
  (he usually picks the recommended one).
- Decisions he has made (respect them):
  1. **Bold "game day" design** (condensed uppercase headlines, school red,
     scroll animations). He tried an Apple-style redesign and **rejected it**
     ("go back to the last version"). It's kept on branch `apple-redesign`.
  2. **All editing happens inside `/admin` only.** Public pages must never be
     editable, even for signed-in staff.
  3. The editor should be **as simple as possible**: he finds the many form tabs
     useless and wants **only "Edit on the page"**, made full screen and
     **Canva-like** (section 6).
  4. Layout model for the builder: **sections + prebuilt layouts** (not
     free-form pixel positioning), so pages always work on phones.
  5. Games and scores should be edited **by clicking them on the page**
     (pop-up), not in a separate tab.
  6. **Public GitHub repo + GitHub Pages hosting**, so he can show his leader
     with just a link. He knows the repo is public (it contains students'
     names and photos); he chose this. Leadership approval is still advisable.
  7. He wanted a simple local password; `admin` currently has a weak one he
     chose. Don't put passwords in the repo. Change it before any public server.
- He wants every change **recorded in `DEVELOPER.md`** (rule zero), and saved
  with git so he can go back to any version.

---

## 2. Accounts, access and where things live

| Thing | Value / location |
|---|---|
| Project folder | `/Users/brianyang/Desktop/AC website` (macOS) |
| GitHub account for this project | `KaohsiungAmericanSchoolAthleticConsole` (owner's dedicated account) |
| Git identity in this folder only | user `KaohsiungAmericanSchoolAthleticConsole`, email `354461839+KaohsiungAmericanSchoolAthleticConsole@users.noreply.github.com` (local git config) |
| Push auth | SSH key `~/.ssh/kas_athletics_ed25519` via local `core.sshCommand` (added to the GitHub account as "AC website Mac"). Remote: `git@github.com:KaohsiungAmericanSchoolAthleticConsole/kas-athletics-website.git` |
| Other GitHub accounts on the Mac | Global git user `theycallmebrian27`; `gh` CLI logged in as `brianbcyangmusic-pixel`. **Not used for this repo.** Don't use `gh` to push here |
| Local staff account (server mode) | username `admin`; password known by the owner; stored hashed in `data/users.json` (gitignored). Reset: `npm run set-password -- admin` |
| Hosted editor sign-in | GitHub personal access token (classic, `public_repo` scope) created on the project account; stored in the browser's localStorage key `kas-editor-key`. **Never commit one** |
| GitHub Pages | Settings → Pages → Source = **GitHub Actions**. Workflow `.github/workflows/pages.yml` |
| Old WordPress site (content source) | `https://kasathleticstg.wpenginepowered.com` (staging; content was imported via its public REST API) |
| School main site (colors) | kas.tw: red `#d43429`, blue `#1863dc` (used as brand colors since v1.8.2) |

---

## 3. How to get going

```bash
cd "/Users/brianyang/Desktop/AC website"
git pull                    # staff edit on GitHub, so ALWAYS pull first
npm test                    # 51 tests, all must pass
npm start                   # http://localhost:3000 and /admin
```

- Node 22+ (the Mac has Node 26). No `npm install` needed: no dependencies.
- In the Claude desktop app there's a preview config at `.claude/launch.json`
  (gitignored) named `kas-dev`. It runs
  `node --watch-path=src --watch-path=public server.js` on port 3000 with the
  **real** `data/`. Note: every file change restarts the server, which **signs
  staff out** (sessions are in memory). Sign in again after code edits.
- Static export like GitHub does it:
  `BASE_PATH=/kas-athletics-website PAGES_REPO=KaohsiungAmericanSchoolAthleticConsole/kas-athletics-website npm run build`
  then serve the parent folder of `dist` as `/kas-athletics-website/`
  (e.g. copy `dist` to `<tmp>/pages/kas-athletics-website` and run
  `python3 -m http.server` in `<tmp>/pages`).

---

## 4. Everything built so far (chronological)

All on 2026-11-09 unless noted. Commit IDs are in `DEVELOPER.md` → Version
history. Short version:

1. **v1.0: the site.** Zero-dependency Node server (`server.js`, `src/app.js`),
   pages rendered from plain template strings (`src/render/`), 5 themes
   (Auto/Light/Dark/Dragon/High contrast), staff editor at `/admin` generated
   from `src/schema.js`, photo upload with in-browser shrinking, undo history,
   scrypt passwords, CSRF, CSP, login rate-limit, static export. **Imported the
   WordPress content:** 21 teams in 4 seasons (Fall, Winter, Spring, Middle
   School), rosters, galleries, 5 real games (Sept–Oct 2026, no scores),
   coaches (Stella Chen AD, Angela Hsu, Kaitlyn Osborne, Coach Sam, Coach Dave),
   director's message, recap video (YouTube `2NVtI57TzK4`), Google Calendar,
   school seal logo; 65 photos converted to WebP (20 MB → 5.4 MB) in
   `data/uploads/imported/`.
2. **v1.1: scroll-driven animations** (`public/css/motion.css`): hero parallax,
   title wipes, marquee, parallax tiles, count-up numbers, etc.
3. *(Branch `apple-redesign`, abandoned.)* Apple-style restyle; the owner
   rejected it.
4. **v1.2: scoreboard** at `/scores` (+ `/scores/standings`), like an NBA
   scores page: crests, scores, winner ◀, Live/Final/Today/Postponed, highlight
   thumbnails, team filter, auto-refresh; W-L-T standings with last-5 form.
5. **v1.3: friendlier editor and safety nets:** team dropdown, opponent memory
   (+ logo reuse), auto web addresses, list search, Discard, Staff accounts page,
   Help page, versioned saves (conflict warning), damaged-file fallback.
6. **v1.4: click-to-edit on public pages.** Replaced by v1.5 at the owner's
   request.
7. **v1.5: "Edit on the page" moved inside `/admin`** (iframe preview,
   `postMessage` to the editor's draft, one Publish button).
8. **v1.6 / v1.6.1: GitHub Pages hosting** (`BASE_PATH` sub-folder support,
   workflow), plus a fix for phones scrolling sideways (`backdrop-filter`
   containing-block bug).
9. **v1.7: the editor works on GitHub Pages** (`public/admin/backend.js`,
   GitHub mode): editor key sign-in, publish = commit `data/content.json`,
   photos committed with the skip-ci marker, history = commits, conflict via sha.
10. **v1.8 / v1.8.1:** `DEVELOPER.md`. Fixes found by the first real staff
    publish: on-page edits saved headlines in CAPS (`innerText` +
    `text-transform`); tests read live content, so a staff edit failed CI and
    blocked publishing. Tests now use `tests/fixtures/content.json`.
11. **v1.8.2 (made outside this session, by the owner's account):** brand colors
    set to kas.tw red `#d43429` / blue `#1863dc` (in `data/content.json` and the
    fixture).
12. Several **content commits by staff** from the hosted editor (e.g. home title
    is now "Home of the Dragon"; change it if that's not intended).

---

## 5. Current architecture in one screen

(Full details: `DEVELOPER.md` section 3.)

- `src/schema.js`: every editable field. Drives editor forms **and** validation.
- `src/lib/validate.js`: validates/cleans content (also shipped to the browser
  for GitHub mode).
- `src/render/*.js`: page templates (`layout.js`, `pages.js`, `team.js`,
  `scores.js`, `parts.js`, `edit.js`). Output is fully escaped.
  `edit.js` adds click-to-edit markers (`data-edit`, `data-edit-image`,
  `data-edit-list`) only when rendering for the editor preview.
- `src/app.js`: server routes. Staff + `?admin-edit` = page with edit markers
  inside the editor's iframe.
- `src/build.js`: static export; with `PAGES_REPO` it also exports the editor,
  `admin/config.json`, the schema and validator, and **pre-rendered editable
  copies** of pages in `admin/preview/…`.
- `public/admin/`: the editor. `admin.js` (state, draft, publish),
  `backend.js` (server vs GitHub mode), `fields.js` (forms from schema),
  `visual.js` ("Edit on the page" iframe), `inline.js` (runs inside the iframe),
  `pages.js` (accounts/help), `dom.js`, `images.js`.
- Content model today: `site`, `home` (fixed home-page fields), `events`,
  `seasons[].teams[]`, `coaches`, `contact`, `links`.

---

## 6. IN PROGRESS: the Canva-like page builder (continue here)

### 6.1 What the owner asked for (paraphrased)

> In the editor I don't need that many tabs; the only useful one is "Edit on
> the page". Make the editor full screen on that. Make every text box
> draggable; when I move the mouse somewhere and right-click (or similar) I get
> an **Add** button, so future students can organize all pages however they
> want. Make it **fully customizable**, let students do whatever they want,
> make it feel like **Canva**: simple drag and drop, **many prebuilt layouts**,
> change images quickly and easily.

Clarified with the owner (AskUserQuestion), and his choices:
- **Sections + prebuilt layouts** (recommended), **not** a free-form pixel
  canvas, because phones.
- **Games/scores edited by clicking them on the page** (pop-up), no Games tab.

### 6.2 What exists so far (branch `page-builder`)

Only two new, **not yet wired-in** files:
- `src/fieldkit.js`: field helper constructors (`text`, `area`, `url`, `image`,
  `bool`, `select`, `list`) for the schema and blocks.
- `src/blocks.js`: **the section library** (21 block types with fields and
  defaults, `BLOCK_GROUPS` for the gallery, `COMMON_FIELDS`
  bg/space/align, `blockSchema(type)`, `newBlock(type)`, `PAGE_TEMPLATES`).
  Block types: `hero`, `heroSplit`, `pageHeader`, `cta`, `heading`, `text`,
  `statement`, `textImage`, `stats`, `marquee`, `divider`, `gallery`, `cards`,
  `upcomingGames`, `results`, `seasonTiles`, `quote`, `coaches`, `contact`,
  `video`, `social`, `calendar`.
  - Small cleanup needed: the `button()` helper builds labels with a hacky
    `.replace('  ', ' ')`. Replace with explicit labels:
    `buttonLabel` "Button text", `buttonLink` "Button link",
    `button2Label` "Second button text", `button2Link` "Second button link".

Nothing else has been changed for this feature. `main` doesn't contain these
files. Start with `git switch page-builder && git merge main`.

### 6.3 Target design (decided; implement this)

**Data model** (in `data/content.json`):
```jsonc
{
  "site": { … unchanged … },
  "pages": [                      // NEW. pages[0] is ALWAYS the home page ("/")
    { "title": "Home", "slug": "", "showInMenu": true,
      "sections": [ { "type": "hero", "bg": "default", "space": "normal", "align": "left",
                      "eyebrow": "…", "title": "…", "subtitle": "…", "image": "/uploads/…",
                      "buttonLabel": "…", "buttonLink": "/events", "button2Label": "", "button2Link": "" },
                    { "type": "upcomingGames", "kicker": "Up next", "title": "On the schedule", "count": "4", … } ] },
    { "title": "Coaches", "slug": "coaches", "showInMenu": true, "sections": [ {pageHeader…}, {coaches…} ] },
    { "title": "Contact us", "slug": "contact", "showInMenu": true, "sections": [ {pageHeader…}, {contact…} ] }
  ],
  "events": […], "seasons": […], "coaches": […], "contact": { "people": […] }, "links": […]
}
```
- The section's own fields sit **flat** on the section object (paths like
  `pages[0].sections[2].title`), plus `type`, `bg` (default|alt|dark|brand|navy),
  `space` (compact|normal|roomy), `align` (left|center).
- Data-driven blocks (`upcomingGames`, `results`, `seasonTiles`, `coaches`,
  `contact`, `social`) read from `events`, `seasons`, `coaches`,
  `contact.people` and `site`. Those stay as structured data.
- Season pages (`/<season>`), team pages (`/<season>/<team>`), `/scores`,
  `/scores/standings` and `/events` **stay automatic** (generated from data),
  but are click-to-edit in the builder (text, photos, team cards, games).

**Migration** (new `src/lib/migrate.js`, shipped to the browser too). If the raw
content has no `pages`, build them from the old shape, so nothing is lost:
- Home sections, in order (this reproduces today's home page):
  `hero` (heroEyebrow/heroTitle/heroSubtitle/heroImage/heroCtaLabel/heroCtaLink,
  second button "Full schedule" → `/events`) → `stats` (home.stats, if any) →
  `upcomingGames` (kicker "Up next", title "On the schedule", count 4) →
  `seasonTiles` ("Programs" / "Find your season") → `marquee` (tagline,
  "Home of the Dragons", season titles) → `quote` ("From the AD" / "A message to
  our Dragons", directorPhoto/Message/Name/Role) → `video` (videoTitle/videoUrl/
  videoCaption, `withSocial: true`) → `statement` (missionTitle/missionBody,
  bg dark) → `calendar` (if calendarEmbedUrl) → `cta` (if site.newsletterUrl).
- Coaches page: `pageHeader` ("Inside Athletics", "Coaches", "The people who
  help our Dragons grow — on and off the court.") + `coaches`.
- Contact page: `pageHeader` ("Inside Athletics", contact.title, contact.intro)
  + `contact`.
- Then drop `home`, `contact.title` and `contact.intro` from the schema.
- Apply it as `normalize = (raw) => validateContent(SCHEMA, migrate(raw)).value`
  everywhere content is loaded: `src/app.js` (`createStore` normalize),
  `src/build.js`, `public/admin/backend.js` (GitHub mode) and tests.
- Tests: migrating `tests/fixtures/content.json` (old shape) must give exactly
  the sections above and pass validation; the rendered home page should keep
  the same hero title, images and sections.

**Schema and validation changes**
- `src/schema.js`: import helpers from `fieldkit.js`; add
  `pages` = list of `{ title (required), slug (type slug), showInMenu (boolean),
  sections (type 'blocks', max 40) }` (max ~60 pages).
- `src/lib/validate.js`:
  - new `case 'blocks'`: for each item, `blockSchema(item.type)`; **drop**
    unknown types (future-proofing); validate like a group.
  - `boolean` already returns `value === true`.
  - Unique slugs across **pages + seasons**. `pages[0].slug` is forced to `''`
    (home); other pages need a slug. Remove `coaches` and `contact` from
    `RESERVED_SLUGS` (they become pages); keep `admin, api, uploads, css, js,
    img, events, scores`, and add `src`.
- `public/admin/fields.js` needs a **checkbox renderer** for `boolean`.

**Rendering**
- New `src/render/sections.js`: `renderSection(content, section, path)` →
  `<section class="blk blk--TYPE bg--BG space--SPACE align--ALIGN" data-section="PATH">`
  and one renderer per block. **Reuse the existing CSS/markup** for the look
  (hero = `.hero…`, stats = `.stat-strip`, upcoming = `.event-list`,
  season tiles = `.season-grid`, quote = `.director`, video = `.media`/`.video`,
  statement = `.mission`, marquee = `.marquee`, calendar = `.calendar-frame`,
  cta = `.cta-band`, page header = `.page-hero`, coaches = `.coach-grid`,
  contact = `.contact`, gallery = `.gallery`). New CSS for `heading`, `text`,
  `textImage`, `cards`, `divider`, `heroSplit`, plus `bg--*`, `space--*`,
  `align--*` modifiers (navy = `--brand-2`, brand = `--brand`).
- Every text gets `ed(path)`, every image `photo(…, { edit: path })`, every
  list `edList(path)`, every card `data-edit-item="path"` (add a helper
  `edItem(path)` in `edit.js`).
- New `src/render/router.js`:
  `resolve(content, pathname, { team }) → { status, title, render() }` and
  `allPaths(content)`. Use it in `src/app.js` `page()` **and** `src/build.js`
  **and** the browser (below). Routes: `/` → pages[0]; `/<page slug>`;
  `/<season>`; `/<season>/<team>`; `/scores`; `/scores/standings`; `/events`;
  otherwise 404. Nav (`navItems` in `layout.js`): Home, seasons…, Scores,
  Schedule, then pages with `showInMenu` (in page order, after Home).
- **Make the templates run in the browser:** `src/render/layout.js` must not
  import `node:fs` / `node:crypto`. Move the `ASSET_VERSION` hash to a node-only
  module and inject it (`setAssetVersion(v)` called from `app.js` and
  `build.js`).

**Live preview without a server (works in both modes)**
- Replace the server-rendered `?admin-edit` pages and the pre-rendered
  `admin/preview/*` copies with **one preview shell** `public/admin/preview.html`
  (links `../css/site.css`, `../css/motion.css`, `inline.css`, Google Fonts,
  loads `inline.js`). On every draft change from the parent, `inline.js`
  imports `../src/render/router.js`, renders the current path from the
  **draft** with edit markers on (`renderWithEdit(true, …)`), parses it with
  `DOMParser` and swaps `document.body`. Safe, because the renderers escape
  everything. Then it re-attaches the editing tools.
  - Brand colors: set `--brand` / `--brand-2` with
    `document.documentElement.style.setProperty` (inline `<style>` is blocked
    by the CSP).
  - Images: rewrite `src="/uploads/…"` with `displayUrl()` (raw GitHub URL in
    GitHub mode) and `/img/…` and `<use href="/img/icons.svg#…">` with the site
    base (GitHub mode is under `/kas-athletics-website`).
- Serving the shared code to the browser:
  - Server mode: add a read-only route `/admin/src/<file>` that serves **only**
    a whitelist from `src/`: `schema.js`, `blocks.js`, `fieldkit.js`,
    `render/*.js`, `lib/{html,events,validate,migrate,static}.js`. Never
    `app.js`, `lib/auth.js`, `lib/store.js`, `lib/uploads.js`.
  - The preview shell must be frameable by `/admin` only: serve
    `/admin/preview.html` with `X-Frame-Options: SAMEORIGIN` and CSP
    `frame-ancestors 'self'` (everything else keeps `DENY` / `'none'`).
  - Static build: copy the same whitelist to `dist/admin/src/` (keep the folder
    structure so relative imports work), and stop generating
    `admin/preview/*` pages and `admin/lib/` (point GitHub mode at
    `./src/schema.js`, `./src/lib/validate.js`, `./src/lib/migrate.js`).
  - `backend.previewUrl()` becomes `preview.html` (relative) in both modes;
    send the current path in the `init` / `render` message.

**The builder UI (`public/admin/`)**
- `index.html`: replace the sidebar + forms layout with one full-screen layout:
  a top toolbar + the preview iframe filling the rest.
  - Toolbar: crest • **Page ▾** (pages panel) • **Undo / Redo** • **Computer |
    Phone** • save status • **Discard** • **Publish** • **⋯** menu.
  - ⋯ menu opens dialogs that reuse `fields.js` forms for: Site settings
    (`site`), Teams & seasons (`seasons`), Coaches list (`coaches`), Games list
    (`events`), Useful links (`links`), plus Undo history, Staff accounts, Help,
    Change password (server mode), Sign out. (This keeps everything reachable
    without tabs; the old form editor can remain behind ⋯ → "Advanced editor".)
- **Pages panel:** Home first; custom pages (click to open, rename inline, "show
  in menu" checkbox, ↑↓ reorder, duplicate, delete with confirmation; Home can't
  be deleted or moved); automatic pages listed for navigation (each season,
  Scores, Schedule); **＋ New page** → template picker (`PAGE_TEMPLATES`) + title
  (slug auto-filled with `slugify` from `fields.js`).
- **Undo/redo:** a stack of draft snapshots in `admin.js` (≈100 deep). Typing
  coalesces (same path within ~1 s = one step). Ctrl/⌘+Z, Ctrl/⌘+Shift+Z.
  After undo/redo, send `render` to the iframe.
- **Inside the preview (`inline.js`):**
  - Hovering a section shows an outline and a floating toolbar: ⠿ drag,
    ↑ ↓, 🎨 style popover (background swatches, spacing, alignment), ⚙ settings
    (dialog with `blockSchema(type)` fields: links, YouTube URL, counts, image
    side…), ⧉ duplicate, 🗑 delete.
  - A **＋** at each section's bottom edge ("Add section below"); an empty page
    shows a big "＋ Add your first section".
  - **Right-click menu** (`contextmenu`): Add section above/below, Move up/down,
    Duplicate, Style…, Settings…, Delete; on a card: Add item after,
    Duplicate item, Delete item, Details…; on an image: Change photo; outside
    sections: Add section at the end.
  - **Add-section gallery** (modal in the parent): grouped by `BLOCK_GROUPS`,
    each tile with a small CSS wireframe thumbnail + label + hint; click → insert
    `newBlock(type)` at the chosen position.
  - Drag sections by ⠿ (reuse the pointer-based sortable already in
    `inline.js`; it works with touch and arrow keys); drag list items the same
    way; **＋ Add** pill after each list (new item = blank from the block's list
    field schema); ✕ on item hover.
  - Text: click to type (already works; keep `plainText()`, NOT `innerText`).
    Images: click "Change photo" or drop a file (already works; uploads are
    delegated to the parent).
  - Structural changes (add/move/delete/style) → compute the new draft, post
    `{type:'change', path, value, structural:true}`, re-render. Text edits →
    post `change` without re-render (keeps the cursor).
- **Games/scores on the page:** on `/events`, `/scores` and in
  `upcomingGames`/`results` blocks, each game card gets
  `data-edit-item="events[i]"` (index in `content.events`: use
  `content.events.indexOf(e)`, same object references). Clicking it → parent
  opens a **Details dialog** rendering `renderField(eventsSchema.item,
  ['events', i], ctx)`. A "＋ Add game" button posts `add-item` for `events`
  (append blank, open its dialog). The same Details dialog works for team cards
  (`seasons[s].teams[t]`: roster, coach, slug…) and coach cards. Write a
  `fieldAt(schema, pathArray)` helper to find the schema for any path (walk
  group fields / list items / `blockSchema(section.type)`).

**GitHub mode notes**
- Publishing is unchanged (commit `data/content.json`); the migrated shape is
  written on the first publish. CI tests validate the live content (the test
  "the live website content (data/content.json) is valid" in `tests/unit.test.js`).
- After migration, update `tests/fixtures/content.json`? Keep the fixture in
  the **old** shape (it tests migration) and add a second fixture in the new
  shape if needed.

### 6.4 Task list with acceptance checks

1. Wire `fieldkit.js` into `schema.js`; add `pages`; the blocks validator; slug
   rules; checkbox field. ✔ when `npm test` passes and invalid blocks are
   dropped or reported.
2. `migrate.js` + tests. ✔ when the fixture migrates to the exact home sections
   above and validates.
3. `sections.js` renderers + CSS modifiers + a render test per block type
   (renders, escapes content, emits markers only in edit mode).
4. `router.js`; switch `app.js` and `build.js` to it; remove node imports from
   `layout.js`. ✔ when every old URL still returns 200 with the same main
   content (crawl test), and new pages work at `/<slug>`.
5. Preview shell + `/admin/src/` whitelist route + frame headers + static build
   copy. ✔ when the editor preview renders the draft in **both** server mode
   and a local GitHub-mode export.
6. Builder toolbar, pages panel, templates, undo/redo, ⋯ dialogs.
7. In-preview tools: section toolbar, style popover, ＋ buttons, right-click
   menu, add-section gallery, item ＋/✕, details dialogs, games pop-up.
8. Browser checks at 1440px and 375px, in light and dark themes: add, drag,
   style, delete and undo a section; create a page from each template; edit a
   game; publish → the live site shows it. Then update `DEVELOPER.md` (v1.9
   entry, architecture, rules), `README.md` staff guide and the Help page text.
   Merge `page-builder` → `main`, push, confirm the Pages deploy succeeded.

Estimated size: ~2,000–2,500 lines across ~12 files. Keep files under ~400
lines (split `inline.js` into `inline/` modules if it grows).

---

## 7. Known issues and loose ends (besides section 6)

- **Content:** no upcoming games; no scores yet (so Standings is empty);
  rosters from 2024–25; 11 teams without a photo; home title currently
  "Home of the Dragon" (a staff edit, maybe unintended).
- **Not verified:** finger-dragging on a real phone; Firefox (no
  scroll-driven animations there, so fade-in fallback by design).
- The local preview's old sample-scores data (`DATA_DIR` in a temp folder) no
  longer exists; `.claude/launch.json` now uses the real `data/`.
- Branch `apple-redesign` is far behind `main`; don't merge it.

---

## 8. Gotchas that cost time (don't repeat them)

1. **The skip-ci marker in square brackets anywhere in a commit message stops
   the deploy.** Photo uploads use it on purpose; never write it in normal
   commit messages (it happened in v1.7).
2. **Tests must not read live content.** Use `tests/fixtures/content.json`.
   Staff publish → CI runs the tests → a content-dependent test blocks the
   deploy (happened in v1.8.1).
3. **Never read edited text with `innerText`** (applies `text-transform`).
4. **`backdrop-filter` on an ancestor breaks `position: fixed`** (mobile menu
   widened the page).
5. **Staff publishing creates commits on GitHub**: `git pull --rebase` before
   pushing local work, or the push is rejected.
6. **`edit.js` relies on synchronous rendering** (module-level flag). Don't make
   renderers async.
7. **The dev server restarts on every file change and signs you out.**
8. **Claude desktop browser pane:** screenshots can lag behind scrolling; when
   in doubt, measure with JavaScript (`getBoundingClientRect`,
   `scrollWidth`). Coordinate clicks can miss in an emulated viewport; click
   by element reference instead.
9. **Login lockout test must stay last** in `tests/app.test.js`.
10. **CSP:** no inline scripts, no `style=""` attributes from the server; set
    CSS variables via `element.style.setProperty` in JS.
11. **Links in templates are absolute** (`/fall-sports`); the static build
    prefixes them. Inside `public/admin/` use relative URLs or
    `new URL('…', import.meta.url)`.
12. **The editor key is powerful** (write access to the repo). Don't log it,
    put it in URLs or commit it.

---

## 9. Suggested prompt for the next AI session

> Read `HANDOFF.md` and `DEVELOPER.md` in this folder. Run `git pull` and
> `npm test`. Then continue the page builder from HANDOFF section 6: switch to
> branch `page-builder`, merge `main`, and work through task list 6.4 in order.
> Commit after each task with a `DEVELOPER.md` entry, keep tests green, check in
> the browser, and explain progress to the owner in plain language. Ask before
> any decision with real trade-offs. Never put the skip-ci marker in a commit
> message.
