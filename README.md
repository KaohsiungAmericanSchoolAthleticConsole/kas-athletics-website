# KAS Athletics website

> Developers: start with **[DEVELOPER.md](DEVELOPER.md)**, which covers the goals, rules, architecture and the history of every version.

The website for Kaohsiung American School Athletics, with a built-in **staff editor** at `/admin/`.

Built to last decades:

- **Zero dependencies.** It runs on Node.js alone (no npm packages, no framework, no database server). Nothing breaks when some library gets abandoned.
- **Content is one readable file.** Everything staff edit lives in `data/content.json`, and photos in `data/uploads/`. Back up those two and you have backed up the whole site.
- **Plain HTML/CSS/JS** on the front end, so any web developer in 2045 can still read it.
- **Undo history.** Every publish keeps the previous version (last 100) in `data/history/`.
- **Static export.** `npm run build` writes the whole public site as plain HTML into `dist/`, so you can host it anywhere or keep it as an archive.

## Run it

Needs Node.js 22 or newer.

```bash
npm run set-password      # first time only: create a staff account
npm start                 # http://localhost:3000  (editor: /admin/)
npm test                  # run the test suite
```

| Setting | Default | Meaning |
|---|---|---|
| `PORT` | `3000` | Port to listen on |
| `HOST` | `127.0.0.1` | Use `0.0.0.0` to accept outside connections |
| `DATA_DIR` | `./data` | Where content, photos and accounts live |
| `TRUST_PROXY` | off | Set to `1` behind a proxy/load balancer that terminates HTTPS (enables secure cookies + HSTS) |

## Hosting

Any machine that can run Node.js works: a small VPS, Render, Railway or Fly.io, or the school's own server. Put HTTPS in front (Caddy, nginx, or the host's built-in TLS) and set `TRUST_PROXY=1`.
Make sure `data/` is on **persistent** storage and is backed up.

> WP Engine only hosts WordPress, so it can't run this site. Point the domain at the new host when you switch over.

### Hosting on GitHub Pages (with the editor)

Every push to `main` publishes the site to GitHub Pages automatically (`.github/workflows/pages.yml`): tests run first, then `npm run build` exports plain files with the right sub-folder prefix. The editor is included at **`…github.io/<repo>/admin/`**.

On GitHub Pages there is no server, so the editor saves straight to the repository:

- Staff sign in with an **editor key** (a GitHub personal access token with the `public_repo` scope, created on an account that can write to the repo). The sign-in page links to the page that creates one.
- **Publish changes** commits `data/content.json`; that push rebuilds the site in about a minute. Photos are committed to `data/uploads/` (marked `[skip ci]`, so they ride along with the next publish).
- **Undo history** is the repo's commit history of `data/content.json`. Two people publishing at once still get the conflict warning.
- Because staff edits create commits on GitHub, run `git pull` before making changes locally.

Build it yourself for a sub-folder with `BASE_PATH=/repo-name npm run build`.

## Staff guide (for coaches and the athletics office)

**All editing happens inside `/admin`.** The public website is always read-only, even for signed-in staff.

**Easiest way: Edit on the page.** After signing in you land on *Edit on the page*: the real website shown inside the editor.

- Pick a page from **Page** (Home, a season, a team, Coaches, Contact). **Computer / Phone** switches the preview width.
- Click any outlined text and type. Press Enter (or click elsewhere) when done.
- **Change photo** appears on every picture: click it, or drag a photo from your computer onto it.
- Drag the **⠿** handle on cards (season tiles, teams, coaches, numbers) to reorder them, or focus it and use the arrow keys.
- Press **Publish changes** at the top to put everything live, or **Discard changes** to throw it away.

The other sections in the sidebar are for everything else: games and scores, links, settings, adding new teams or coaches.

1. Go to `yoursite/admin/` and sign in.
2. Pick a section on the left: **Site settings**, **Home page**, **Games & events**, **Sports pages**, **Coaches**, **Contact page**, **Useful links**.
3. Change text or click **Upload photo** (or drag a photo onto the box). Large phone photos are shrunk automatically.
4. Press **Publish changes** (or Ctrl/⌘ + S). The site updates immediately.
5. Made a mistake? **Undo history** → pick an earlier version → **Publish changes**.
6. Changed your mind before publishing? **Discard changes** throws away everything since the last publish.

The editor has a built-in **Help** page with step-by-step instructions for common tasks, and a **Staff accounts** page where any staff member can add colleagues, reset their passwords or remove them. Only the very first account needs the command line (`npm run set-password`).

Built-in safety nets: if two people edit at once, the second to publish is warned instead of overwriting the first; if someone is signed out mid-edit, their changes are kept; if `content.json` is ever damaged, the site keeps running from the last good saved copy.

The **next upcoming game** in *Games & events* appears automatically in the red bar at the top of every page.

**Scores** (`/scores`) is a live scoreboard built from *Games & events*. For each game, fill in **Opponent** (and optionally a logo), then the **KAS score** and **Opponent score** once it's over. The game turns to *Final*, the winner is marked, and the **Standings** tab updates its win/loss records automatically. Set **Status** to *Live now* during a game; the page refreshes itself every minute while games are on. For meets and tournaments, leave Opponent empty and use **Result note** (e.g. “2nd of 6”).
Visitors can switch between **Auto, Light, Dark, Dragon (school colors) and High contrast** themes with the palette button. The school color and the default theme are set in *Site settings*.

Accounts: create or reset one with `npm run set-password -- <username>` on the server. Staff can change their own password in the editor.

## For developers

```
server.js              start the HTTP server
src/app.js             routing, security headers, staff API
src/schema.js          ← every editable field is defined here (drives the editor AND validation)
src/lib/               html escaping, validation, storage, auth, uploads, event dates
src/render/            page templates (plain template strings, all output escaped)
public/css|js|img      site styles, small progressive-enhancement script, icons
public/admin/          the staff editor (vanilla ES modules)
data/content.json      the content
tests/                 node:test suites (npm test)
```

**To add a new editable field:** add it to `src/schema.js`, then use it in a template under `src/render/`. The editor form and server validation pick it up automatically.

Security: passwords are hashed with scrypt; sessions use HttpOnly + SameSite=Strict cookies plus a CSRF token; logins are rate-limited; uploads are checked by file signature; every page sends a strict Content-Security-Policy; all staff text is HTML-escaped and links are restricted to http(s)/mailto/tel/site paths.

## Versions (git)

The code and content are tracked with git, so any earlier version can come back.

```bash
git log --oneline                 # list saved versions
git diff                          # see what changed since the last save
git add -A && git commit -m "…"   # save a new version
git restore <file>                # throw away unsaved changes to one file
git switch -c try-old <commit>    # look at an old version on a side branch (safe)
git switch main                   # go back to the latest
git revert <commit>               # undo one saved version, keeping later ones
```

Staff edits made in the editor are saved to `data/content.json`; commit that file (and `data/uploads/`) now and then so content history lives in git too. The editor's own **Undo history** covers day-to-day mistakes.

## Motion

Scroll animations live in `public/css/motion.css`. They use the browser's built-in scroll-driven animations (no libraries) and switch off completely for anyone who has "reduce motion" turned on. Browsers without support get simple fade-ins instead.
