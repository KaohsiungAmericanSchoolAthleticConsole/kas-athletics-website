<?php
/**
 * Imports the original site's content (data/content.json + data/uploads/) into WordPress.
 *
 *   wp eval-file import-content.php /path/to/data/content.json
 *
 * Safe to run again: anything it created before is updated, not duplicated
 * (each item remembers where it came from in the "_kas_import_key" field).
 * Needs the KAS Dragons theme to be active.
 */

if (!defined('ABSPATH') || !function_exists('kas_block_name')) {
    fwrite(STDERR, "Run this with WP-CLI (wp eval-file) while the KAS Dragons theme is active.\n");
    return;
}

require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';
require_once ABSPATH . 'wp-admin/includes/nav-menu.php';

$kas_json_path = $args[0] ?? '';
$kas_raw = is_readable($kas_json_path) ? json_decode((string) file_get_contents($kas_json_path), true) : null;
if (!is_array($kas_raw)) {
    WP_CLI::error('Could not read content.json. Pass its full path, e.g. wp eval-file import-content.php "/Users/…/data/content.json"');
}
$GLOBALS['kas_data_dir'] = dirname($kas_json_path);
$GLOBALS['kas_log'] = array('media' => 0, 'teams' => 0, 'games' => 0, 'coaches' => 0, 'pages' => 0, 'seasons' => 0, 'missing' => array());

/** Original photo path ("/uploads/…") → attachment ID, uploading it the first time. */
function kas_import_media(string $path): int
{
    $kas_data_dir = $GLOBALS['kas_data_dir'];
    if ($path === '' || !str_starts_with($path, '/uploads/')) {
        return 0;
    }
    $found = get_posts(array('post_type' => 'attachment', 'post_status' => 'any', 'numberposts' => 1, 'fields' => 'ids',
        'meta_key' => '_kas_import_key', 'meta_value' => $path));
    if ($found) {
        return (int) $found[0];
    }
    $file = $kas_data_dir . $path;
    if (!is_readable($file)) {
        $GLOBALS['kas_log']['missing'][] = $path;
        return 0;
    }
    $tmp = wp_tempnam(basename($file));
    copy($file, $tmp);
    $id = media_handle_sideload(array('name' => basename($file), 'tmp_name' => $tmp), 0);
    if (is_wp_error($id)) {
        @unlink($tmp);
        WP_CLI::warning("Photo $path: " . $id->get_error_message());
        return 0;
    }
    update_post_meta($id, '_kas_import_key', $path);
    $GLOBALS['kas_log']['media']++;
    return (int) $id;
}

function kas_import_media_url(string $path): string
{
    $id = kas_import_media($path);
    return $id ? (string) wp_get_attachment_image_url($id, 'full') : $path;
}

/** Creates or updates one post, matched by its import key. */
function kas_import_post(string $key, array $post, array $meta = array(), int $thumb = 0): int
{
    $found = get_posts(array('post_type' => $post['post_type'], 'post_status' => 'any', 'numberposts' => 1, 'fields' => 'ids',
        'meta_key' => '_kas_import_key', 'meta_value' => $key));
    $post = array_merge(array('post_status' => 'publish'), $post);
    if ($found) {
        $post['ID'] = (int) $found[0];
    }
    $id = wp_insert_post(wp_slash($post), true);
    if (is_wp_error($id)) {
        WP_CLI::warning("$key: " . $id->get_error_message());
        return 0;
    }
    update_post_meta($id, '_kas_import_key', $key);
    foreach ($meta as $k => $v) {
        update_post_meta($id, 'kas_' . $k, wp_slash((string) $v));
    }
    if ($thumb) {
        set_post_thumbnail($id, $thumb);
    }
    return (int) $id;
}

/** A team's player cards → roster lines ("Name ’26 (C) | Role | Number"). */
function kas_import_roster(array $team): string
{
    if (empty($team['players'])) {
        return (string) ($team['roster'] ?? '');
    }
    $lines = array();
    foreach ($team['players'] as $p) {
        $name = trim((string) ($p['name'] ?? ''));
        if ($name === '') {
            continue;
        }
        $year = preg_match('/(\d{2})$/', (string) ($p['year'] ?? ''), $m) ? ' ’' . $m[1] : '';
        $role = trim((string) ($p['role'] ?? ''));
        $number = trim((string) ($p['number'] ?? ''));
        $lines[] = $name . $year . ($role !== '' || $number !== '' ? " | $role | $number" : '');
    }
    return implode("\n", $lines);
}

/** A section from content.json → block markup, with photos moved into the media library. */
function kas_import_section(array $section): string
{
    $lib = kas_block_library()['blocks'];
    $type = (string) ($section['type'] ?? '');
    if (!isset($lib[$type])) {
        return '';
    }
    $attrs = array();
    foreach ($lib[$type]['fields'] as $f) {
        if (!array_key_exists($f['key'], $section)) {
            continue;
        }
        $v = $section[$f['key']];
        if ($f['type'] === 'image') {
            $v = kas_import_media_url((string) $v);
        } elseif ($f['type'] === 'list' && is_array($v)) {
            $v = array_map(function ($item) use ($f) {
                foreach ($f['item']['fields'] as $sub) {
                    if ($sub['type'] === 'image' && isset($item[$sub['key']])) {
                        $item[$sub['key']] = kas_import_media_url((string) $item[$sub['key']]);
                    }
                }
                return $item;
            }, $v);
        }
        $attrs[$f['key']] = $v;
    }
    return serialize_block(array('blockName' => kas_block_name($type), 'attrs' => $attrs, 'innerBlocks' => array(), 'innerHTML' => '', 'innerContent' => array()));
}

/* ---------- Site settings ---------- */
$kas_site = $kas_raw['site'] ?? array();
$kas_contact = $kas_raw['contact'] ?? array();
$kas_settings = array();
foreach (kas_settings_flat() as $key => $field) {
    $kas_settings[$key] = is_scalar($kas_site[$key] ?? null) ? (string) $kas_site[$key] : '';
}
$kas_settings['logo'] = (string) kas_import_media((string) ($kas_site['logo'] ?? ''));
$kas_settings['contactPeople'] = implode("\n", array_map(
    fn($p) => implode(' | ', array($p['name'] ?? '', $p['role'] ?? '', $p['email'] ?? '', $p['phone'] ?? '')),
    $kas_contact['people'] ?? array()
));
$kas_settings['links'] = implode("\n", array_map(fn($l) => ($l['label'] ?? '') . ' | ' . ($l['url'] ?? ''), $kas_raw['links'] ?? array()));
update_option('kas_settings', $kas_settings);
update_option('blogname', $kas_settings['name'] ?: 'KAS Athletics');
update_option('blogdescription', $kas_settings['tagline']);
update_option('timezone_string', 'Asia/Taipei');
WP_CLI::log('Site settings saved.');

/* ---------- Seasons and teams ---------- */
foreach ($kas_raw['seasons'] ?? array() as $si => $season) {
    $term = term_exists($season['slug'], 'kas_season');
    if (!$term) {
        $term = wp_insert_term($season['title'], 'kas_season', array('slug' => $season['slug']));
    } else {
        wp_update_term((int) $term['term_id'], 'kas_season', array('name' => $season['title']));
    }
    if (is_wp_error($term)) {
        WP_CLI::warning('Season ' . $season['title'] . ': ' . $term->get_error_message());
        continue;
    }
    $term_id = (int) $term['term_id'];
    update_term_meta($term_id, 'kas_dates', (string) ($season['dates'] ?? ''));
    update_term_meta($term_id, 'kas_intro', (string) ($season['intro'] ?? ''));
    update_term_meta($term_id, 'kas_image', (string) kas_import_media((string) ($season['image'] ?? '')));
    update_term_meta($term_id, 'kas_order', (string) ($si + 1));
    $GLOBALS['kas_log']['seasons']++;

    foreach ($season['teams'] ?? array() as $ti => $team) {
        $gallery = array_filter(array_map(fn($g) => kas_import_media((string) ($g['image'] ?? '')), $team['gallery'] ?? array()));
        $cap = is_array($team['captain'] ?? null) ? $team['captain'] : array();
        $id = kas_import_post('team:' . $season['slug'] . '/' . $team['slug'], array(
            'post_type' => 'kas_team', 'post_title' => $team['name'], 'post_name' => $team['slug'],
            'post_content' => (string) ($team['description'] ?? ''), 'menu_order' => $ti,
        ), array(
            'level' => $team['level'] ?? '', 'sport' => $team['sport'] ?? '', 'coach' => $team['coach'] ?? '',
            'practice' => $team['practice'] ?? '', 'roster' => kas_import_roster($team), 'gallery' => implode(',', $gallery),
            'captain_name' => $cap['name'] ?? '', 'captain_role' => $cap['role'] ?? '', 'captain_number' => $cap['number'] ?? '',
            'captain_year' => $cap['year'] ?? '', 'captain_quote' => $cap['quote'] ?? '',
            'captain_photo' => (string) kas_import_media((string) ($cap['photo'] ?? '')),
        ), kas_import_media((string) ($team['image'] ?? '')));
        if ($id) {
            wp_set_object_terms($id, array($term_id), 'kas_season');
            $GLOBALS['kas_log']['teams']++;
        }
    }
}

/* ---------- Games ---------- */
foreach ($kas_raw['events'] ?? array() as $e) {
    $key = 'event:' . ($e['date'] ?? '') . '/' . sanitize_title($e['title'] ?? '') . '/' . sanitize_title($e['sport'] ?? '');
    $ok = kas_import_post($key, array('post_type' => 'kas_event', 'post_title' => (string) ($e['title'] ?? 'Game')), array(
        'date' => $e['date'] ?? '', 'time' => $e['time'] ?? '', 'sport' => $e['sport'] ?? '', 'venue' => $e['venue'] ?? '',
        'location' => $e['location'] ?? '', 'opponent' => $e['opponent'] ?? '',
        'opponent_logo' => (string) kas_import_media((string) ($e['opponentLogo'] ?? '')),
        'kas_score' => $e['kasScore'] ?? '', 'opp_score' => $e['opponentScore'] ?? '', 'status' => $e['status'] ?? 'auto',
        'result' => $e['result'] ?? '', 'link' => $e['link'] ?? '', 'photo' => (string) kas_import_media((string) ($e['photo'] ?? '')),
    ));
    $GLOBALS['kas_log']['games'] += $ok ? 1 : 0;
}

/* ---------- Coaches ---------- */
foreach ($kas_raw['coaches'] ?? array() as $ci => $c) {
    $ok = kas_import_post('coach:' . sanitize_title($c['name'] ?? ''), array(
        'post_type' => 'kas_coach', 'post_title' => (string) ($c['name'] ?? ''), 'post_content' => (string) ($c['bio'] ?? ''), 'menu_order' => $ci,
    ), array('role' => $c['role'] ?? '', 'sport' => $c['sport'] ?? '', 'email' => $c['email'] ?? ''), kas_import_media((string) ($c['photo'] ?? '')));
    $GLOBALS['kas_log']['coaches'] += $ok ? 1 : 0;
}

/* ---------- Pages ---------- */
$kas_page_ids = array();
foreach ($kas_raw['pages'] ?? array() as $pi => $page) {
    $slug = $pi === 0 ? 'home' : (string) $page['slug'];
    $content = implode("\n\n", array_filter(array_map('kas_import_section', $page['sections'] ?? array())));
    $kas_page_ids[$slug] = kas_import_post('page:' . $slug, array(
        'post_type' => 'page', 'post_title' => (string) $page['title'], 'post_name' => $slug, 'post_content' => $content, 'menu_order' => $pi,
    ));
    $GLOBALS['kas_log']['pages']++;
}
$kas_page_ids['scores'] = kas_import_post('page:scores', array(
    'post_type' => 'page', 'post_name' => 'scores', 'post_title' => 'Scores',
    'post_content' => '<!-- wp:paragraph --><p>This page shows the scoreboard automatically from Games &amp; events. Anything written here is not shown.</p><!-- /wp:paragraph -->',
));
if (!empty($kas_page_ids['home'])) {
    update_option('show_on_front', 'page');
    update_option('page_on_front', $kas_page_ids['home']);
}

/* ---------- Main menu ---------- */
if (!wp_get_nav_menu_object('Main menu')) {
    $menu = wp_create_nav_menu('Main menu');
    $add = fn(array $item, int $parent = 0) => wp_update_nav_menu_item($menu, 0, array_merge(array('menu-item-status' => 'publish', 'menu-item-parent-id' => $parent), $item));
    $add(array('menu-item-title' => 'Home', 'menu-item-url' => home_url('/'), 'menu-item-type' => 'custom'));
    $sports = $add(array('menu-item-title' => 'Sports', 'menu-item-url' => '#', 'menu-item-type' => 'custom'));
    foreach (get_terms(array('taxonomy' => 'kas_season', 'hide_empty' => false)) as $t) {
        $add(array('menu-item-title' => $t->name, 'menu-item-object' => 'kas_season', 'menu-item-object-id' => $t->term_id, 'menu-item-type' => 'taxonomy'), $sports);
    }
    foreach (array('scores' => 'Scores') as $slug => $title) {
        $add(array('menu-item-title' => $title, 'menu-item-object' => 'page', 'menu-item-object-id' => $kas_page_ids[$slug], 'menu-item-type' => 'post_type'));
    }
    $add(array('menu-item-title' => 'Schedule', 'menu-item-url' => get_post_type_archive_link('kas_event'), 'menu-item-type' => 'custom'));
    foreach ($kas_raw['pages'] ?? array() as $pi => $page) {
        if ($pi > 0 && !empty($page['showInMenu']) && !empty($kas_page_ids[$page['slug']])) {
            $add(array('menu-item-title' => (string) $page['title'], 'menu-item-object' => 'page', 'menu-item-object-id' => $kas_page_ids[$page['slug']], 'menu-item-type' => 'post_type'));
        }
    }
    set_theme_mod('nav_menu_locations', array_merge((array) get_theme_mod('nav_menu_locations'), array('main' => $menu)));
    WP_CLI::log('Main menu created (Appearance → Menus).');
}

/* ---------- Pretty web addresses ---------- */
update_option('permalink_structure', '/%postname%/');
flush_rewrite_rules();

WP_CLI::success(sprintf(
    'Imported %d seasons, %d teams, %d games, %d coaches, %d pages and %d new photos.',
    $GLOBALS['kas_log']['seasons'], $GLOBALS['kas_log']['teams'], $GLOBALS['kas_log']['games'], $GLOBALS['kas_log']['coaches'], $GLOBALS['kas_log']['pages'], $GLOBALS['kas_log']['media']
));
if ($GLOBALS['kas_log']['missing']) {
    WP_CLI::warning('Photos not found: ' . implode(', ', array_unique($GLOBALS['kas_log']['missing'])));
}
