# KAS Athletics website

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

## Staff guide (for coaches and the athletics office)

1. Go to `yoursite/admin/` and sign in.
2. Pick a section on the left: **Site settings**, **Home page**, **Games & events**, **Sports pages**, **Coaches**, **Contact page**, **Useful links**.
3. Change text or click **Upload photo** (or drag a photo onto the box). Large phone photos are shrunk automatically.
4. Press **Publish changes** (or Ctrl/⌘ + S). The site updates immediately.
5. Made a mistake? **Undo history** → pick an earlier version → **Publish changes**.

The **next upcoming game** in *Games & events* appears automatically in the red bar at the top of every page.
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
