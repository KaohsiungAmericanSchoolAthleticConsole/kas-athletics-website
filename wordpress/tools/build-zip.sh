#!/bin/sh
# Builds wordpress/dist/kas-dragons.zip: the theme plus the site's content and
# photos, ready for Appearance → Themes → Add New → Upload on any WordPress site.
# After activating it there, use KAS Athletics → Import content.
#
#   sh wordpress/tools/build-zip.sh
set -eu

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT_DIR="$ROOT/wordpress/dist"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

# Keep the shared section list and design in step with the original site.
node "$ROOT/wordpress/tools/export-blocks.mjs" >/dev/null

mkdir -p "$STAGE/kas-dragons/import-data" "$OUT_DIR"
# Copy the theme's real files (the folder may be linked into a Local site).
cp -R "$ROOT/wordpress/kas-dragons/." "$STAGE/kas-dragons/"
cp "$ROOT/data/content.json" "$STAGE/kas-dragons/import-data/content.json"
cp -R "$ROOT/data/uploads" "$STAGE/kas-dragons/import-data/uploads"
find "$STAGE" -name '.DS_Store' -delete

rm -f "$OUT_DIR/kas-dragons.zip"
(cd "$STAGE" && zip -qrX "$OUT_DIR/kas-dragons.zip" kas-dragons)
echo "Built $OUT_DIR/kas-dragons.zip ($(du -h "$OUT_DIR/kas-dragons.zip" | cut -f1 | tr -d ' '))"
