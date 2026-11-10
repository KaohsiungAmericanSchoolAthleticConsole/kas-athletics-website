# KAS Athletics on WordPress

The whole KAS Athletics site as a WordPress theme, **KAS Dragons**
(`kas-dragons/`). It keeps the same design, pages and content as the original
Node.js site. Staff edit everything in the normal WordPress dashboard.

> The older `kas-athletics-theme/` folder is an early, incomplete attempt.
> **Don't use it.** It can be deleted.

## What staff see in the dashboard

| Menu | What it's for |
|---|---|
| **KAS Athletics** | Site settings: name, logo, colors, festive effects, contact details, contact people, social links, footer links |
| **Teams** | One per team: name, description, photo (Featured image), season, level, coaches, practice times, **roster** (one player per line), team photos, captain |
| **Games & events** | One per game: date, time, team, home/away, opponent, scores, status (live / postponed…), result, video link |
| **Coaches** | One per coach: name, bio, photo, role, sport, email. Drag order with "Order" |
| **Teams → Seasons** | Fall, Winter, Spring, Middle School: dates, intro, photo, menu order |
| **Pages** | Home, Coaches, Contact us… built from **KAS sections** (see below) |
| **Appearance → Menus** | The top menu ("Main menu") |

### Building pages (Canva-style)
Open a page and press **+**. The **KAS sections** group has 22 ready-made
sections: big banner, split banner, text + photo, numbers, photo grid, cards,
upcoming games, latest results, season tiles, quote, coaches, contact, video,
calendar and more. Drag sections to reorder them. Click a section to edit its
text, photos and style (background, spacing, alignment) in the right-hand panel.
The preview looks exactly like the live page.

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

Either:
- **Local → Connect → Push** to WP Engine, which copies the whole tested site
  (theme, content and photos). This is the easiest option. Or:
- Zip the `kas-dragons` folder, upload it in **Appearance → Themes → Add New →
  Upload**, then run the importer there with WP-CLI (WP Engine has SSH):
  `wp eval-file import-content.php content.json` (copy `data/` alongside).

Back up the live site first (WP Engine → Backup points).

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
