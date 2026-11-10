#!/bin/sh
# Puts the KAS Dragons theme into a "Local" (localwp.com) WordPress site and imports
# the content. Safe to run again any time (e.g. after changing content.json).
#
#   sh wordpress/local-setup.sh [site-folder-name]     # default: kas-athletics-test
#
# The Local app must be open and the site started.
set -eu

SITE="${1:-kas-athletics-test}"
HERE="$(cd "$(dirname "$0")" && pwd)"
PUBLIC="$HOME/Local Sites/$SITE/app/public"
LOCAL_SUPPORT="$HOME/Library/Application Support/Local"
WP_CLI="/Applications/Local.app/Contents/Resources/extraResources/bin/wp-cli/wp-cli.phar"

[ -d "$PUBLIC" ] || { echo "No Local site called \"$SITE\" in ~/Local Sites."; exit 1; }

# The site's ID, PHP and database socket, from Local's own records.
SITE_ID="$(/usr/bin/python3 -c "import json,sys; d=json.load(open(sys.argv[1])); print(next(k for k,v in d.items() if v.get('path','').rstrip('/').endswith('/'+sys.argv[2])))" "$LOCAL_SUPPORT/sites.json" "$SITE")"
PHP_BIN="$(ls -d "$LOCAL_SUPPORT"/lightning-services/php-*/bin/darwin*/bin/php | tail -1)"
SOCK="$LOCAL_SUPPORT/run/$SITE_ID/mysql/mysqld.sock"
[ -S "$SOCK" ] || { echo "The site isn't running. Open the Local app and press Start site."; exit 1; }

wp() { "$PHP_BIN" -d mysqli.default_socket="$SOCK" -d memory_limit=512M "$WP_CLI" --path="$PUBLIC" "$@"; }

# Link (not copy) the theme, so edits in this project show up straight away.
THEME_LINK="$PUBLIC/wp-content/themes/kas-dragons"
if [ ! -e "$THEME_LINK" ]; then
  ln -s "$HERE/kas-dragons" "$THEME_LINK"
  echo "Linked the theme into the Local site."
fi

wp theme activate kas-dragons
wp eval-file "$HERE/import/import-content.php" "$HERE/../data/content.json"
echo "Done. Open: $(wp option get home)"
