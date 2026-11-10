# WordPress theme scaffold for KAS Athletics

This is a **starting point** for running KAS Athletics on WordPress / WP Engine.
It is NOT a complete port. It reuses the existing CSS design system and registers
custom post types for games (`kas_event`) and teams (`kas_team`).

## What is included
- `kas-athletics-theme/` — a minimal WordPress theme (style.css, functions.php, index/header/footer).
- The WXR export script (`scripts/export-wordpress.js`) for importing content.

## What is NOT included (would need a larger project)
- Templates for seasons, team pages, scores/standings, coaches, contact.
- The scoreboard logic (standings, live refresh).
- The staff editor (WordPress's Gutenberg replaces it; staff edit in WP admin).
- The click-to-edit inline editor.

## To use
1. Zip `kas-athletics-theme/` and upload via Appearance -> Themes -> Add New -> Upload.
2. Run `node scripts/export-wordpress.js` and import the resulting WXR via Tools -> Import -> WordPress.
3. Re-upload photos to the WordPress media library (or keep /uploads/ paths).
4. Rebuild the custom templates for seasons/teams/scores as needed.
EOF