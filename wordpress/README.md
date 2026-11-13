# KAS Athletics on WordPress

The whole KAS Athletics site as a WordPress theme, **KAS Dragons**
(`kas-dragons/`). It keeps the same design, pages and content as the original
Node.js site. Staff edit everything in the normal WordPress dashboard.

> The older `kas-athletics-theme/` folder is an early, incomplete attempt.
> **Don't use it.** It can be deleted.

## Quick edit (start here)
After signing in, staff land on **Quick edit**: big buttons for **Players**,
**Coaches**, **Contact us**, **Cover photos** and **Scores**, plus every team
listed by season. Anyone who isn't an administrator gets a short menu with only
the things they need. **Contact us** is a simple form: the school's phone, email
and address, and a table of people to contact.

## What staff see in the dashboard

| Menu | What it's for |
|---|---|
| **KAS Athletics** | Site settings: name, logo, colors, festive effects, contact details, contact people, social links, footer links |
| **Teams** | One per team: name, description, photo (Featured image), season, level, coaches, practice times, **roster** (one player per line), team photos, captain |
| **Games & events** | Copied **automatically** from the school's Google Calendar every hour. **Enter scores** is a one-screen list of recent games with score boxes. **Calendar sync** shows the last sync and has a **Sync now** button |
| **Coaches** | One per coach: name, bio, photo, role, sport, email. Drag order with "Order" |
| **Teams → Seasons** | Fall, Winter, Spring, Middle School: dates, intro, photo, menu order |
| **Pages** | Home, Coaches, Contact us… built from **KAS sections** (see below) |
| **Appearance → Menus** | The top menu ("Main menu") |

### Editing the Home page
The Home page is made of ordinary WordPress blocks. In **Pages → Home**, click any
text and type. Click a photo, then **Replace** in its toolbar to swap it. Use
**+** to add anything (text, images, buttons, columns), and the block toolbar to
copy, move or delete. School colors and fonts are in each block's color and font
menus. Upcoming games, season tiles, scrolling words, video and calendar fill
themselves in, so only their titles are edited. Made a mistake? Undo, or
**Revisions** in the page's settings.

### Testing safely on the Local site
`~/Local Sites/kas-athletics-test` is its own git repo with a copy of the
database. Before trying something risky there, run `sh snapshot.sh "what I'm about to try"`.
To go back, see `git log --oneline`.

### Building pages (Canva-style)
Open a page and press **+**. The **KAS sections** group has 22 ready-made
sections: big banner, split banner, text + photo, numbers, photo grid, cards,
upcoming games, latest results, season tiles, quote, coaches, contact, video,
calendar and more. Drag sections to reorder them. **Click a section, then click
any text or photo in it** to change it right there: text opens a small edit box,
and a photo opens the media library. The right-hand panel has every field plus
style (background, spacing, alignment). The preview looks exactly like the live page.

- **New page:** WordPress offers ready-made layouts (Team spotlight, Event
  recap, Announcement, Results page). They're also under Patterns → KAS layouts.
- **Home page sections are locked in place**, so they can't be moved or deleted
  by accident. Their text and photos can still be edited. Administrators can
  unlock a section from its toolbar (⋮ → Unlock).

## Games: automatic from Google Calendar
Keep adding games to the school's **sports Google Calendar**, as you do now. Every hour
the website copies this school year's events:
- It reads names like `Home Game - Varsity Boys BB v.s ICA @5:15pm (Qualifier)`:
  home/away, the team (BB = basketball, VB = volleyball, G7/G8 = middle school),
  the opponent, the time, and `CXL` for cancelled.
- If a game moves in the calendar, it moves on the website. If it's removed,
  it's marked **Cancelled**; it's never deleted.
- It **never overwrites** scores, results, links, photos, or a title, team,
  opponent or home/away that someone changed on the website.
- If the name doesn't say clearly which team plays, the game appears under
  **Games & events → Needs a team**. Open it and pick the team.
- The calendar link is in **KAS Athletics → Games calendar** (its "public address
  in iCal format"). The calendar must stay public.

## Scores and the Coach role
- **Games & events → Enter scores**: the last two weeks and the next week of
  games, with KAS score, opponent score, status (e.g. Live now) and a note.
  Press **Save all scores**. It works on a phone.
- Give coaches the **Coach** role (Users → Add New → Role: Coach). Coaches can
  edit teams, games, scores, coaches and photos, but not pages, menus or
  settings. After signing in they go straight to Enter scores.

## Rosters from a Google Sheet
1. Make a Google Sheet. Go to **Extensions → Apps Script**, delete what's there,
   paste in [`apps-script/roster-sync.gs`](apps-script/roster-sync.gs), then save.
2. Reload the sheet. A **KAS website** menu appears.
3. In WordPress, open **Users → Profile → Application Passwords**, name one
   "Roster sheet" and press **Add**. Copy the password it shows. Use an account
   with the Administrator, Editor or Coach role.
4. In the sheet: **KAS website → Connect to the website**. Enter the site address
   (`https://…`), your WordPress username and that password.
5. **KAS website → Set up the Rosters tab** creates the tab
   (Team | Player name | Grad year | Role | Number), fills it with today's
   rosters, and adds a team dropdown.
6. Edit players, then **KAS website → Sync rosters now**. To sync automatically,
   use **Turn on hourly sync**.

Every team that has rows in the sheet gets its roster **replaced** by the
sheet's rows. Teams with no rows are left alone. To stop the sync, delete that
Application Password in WordPress.

### Automatic pages
- `/sports/<season>/`: every team in a season
- `/teams/<team>/`: team page with captain's moment, schedule, roster cards
- `/events/`: schedule (upcoming + recent results)
- `/scores/`: scoreboard. Add `?view=standings` for the standings table. It is
  the page with the web address `scores`; its text isn't shown.

## Testing on your Mac with Local

1. Open the **Local** app and start the site (`kas-athletics-test`).
2. In this project folder run:
   ```bash
   sh wordpress/local-setup.sh
   ```
   This links the theme into the Local site (edits show up straight away),
   switches it on, and imports `data/content.json` and all photos.
   Running it again updates content instead of duplicating it.
3. Open <http://kas-athletics-test.local> (dashboard: `/wp-admin`).

## Putting it on the real site (WP Engine)

1. **Back up the live site first** (WP Engine → your site → Backup points).
2. Build the zip (it includes the theme **and** all content and photos):
   ```bash
   sh wordpress/tools/build-zip.sh
   ```
   This creates `wordpress/dist/kas-dragons.zip` (about 6 MB).
3. On the live site: **Appearance → Themes → Add New Theme → Upload Theme**,
   choose the zip, then **Install Now**, then **Activate**.
4. **KAS Athletics → Import content → Import KAS content.** This copies in the
   teams, games, coaches, pages, settings and photos. If it times out, press
   the button again; it continues where it stopped and never makes copies.
5. Open the site to check it. Then go to **Appearance → Themes** and delete the
   old broken theme.

Alternative: **Local → Connect → Push** copies the whole tested Local site to
WP Engine instead. Remove the `WP_HTTP_BLOCK_EXTERNAL` line from the Local
`wp-config.php` first; it's only there to stop a Mac-only crash.

## For developers

- `kas-dragons/functions.php` loads `inc/`:
  `helpers` (escaping, dates) · `content-types` (Teams/Games/Coaches/Seasons +
  their fields, defined once) · `admin-fields` (edit boxes) · `settings` ·
  `data` (WordPress → plain arrays) · `parts`, `captain`, `sections`,
  `scores`, `layout` (HTML, ported from `src/render/*.js`) · `blocks`.
- `inc/blocks.json` is generated from `src/blocks.js`, so both sites share one
  section list. Re-run after changing it: `node wordpress/tools/export-blocks.mjs`.
- `assets/css` and `assets/img` are copies of `public/css` and `public/img`.
  Copy them again after design changes.
- No build step: the block editor script (`assets/js/blocks-editor.js`) is
  plain JavaScript using WordPress's built-in `wp.*` libraries.
- All output is escaped (`esc_html`, `esc_attr`, `esc_url`). Saves check a nonce
  and the user's permission.
- Tests for the plain-PHP parts (calendar names, iCal, roster rows):
  `php wordpress/tests/run.php`. Use Local's PHP if there's no other:
  `~/Library/Application Support/Local/lightning-services/php-*/bin/darwin-arm64/bin/php`.
- Calendar sync: `inc/calendar-parse.php` (pure functions) and `inc/calendar-sync.php`
  (WordPress side, hourly WP-Cron). Synced games carry `kas_gcal_uid`.
- Rosters: `inc/roster-sync.php` (REST `kas/v1/teams`, `kas/v1/rosters`),
  `apps-script/roster-sync.gs` (the sheet side).
- Roles: `inc/roles.php`. Teams, games and coaches use the `kas_item` capability type.
