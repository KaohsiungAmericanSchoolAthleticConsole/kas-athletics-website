<?php
/**
 * Command-line version of KAS Athletics → Import content.
 *
 *   wp eval-file import-content.php /path/to/data/content.json
 *
 * The import itself lives in the theme (kas-dragons/inc/importer.php).
 */

if (!defined('ABSPATH') || !function_exists('kas_import_run')) {
    fwrite(STDERR, "Run this with WP-CLI (wp eval-file) while the KAS Dragons theme is active.\n");
    return;
}

kas_import_run((string) ($args[0] ?? ''));
