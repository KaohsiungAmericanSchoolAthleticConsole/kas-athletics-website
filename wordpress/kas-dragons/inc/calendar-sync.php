<?php
/**
 * Keeps Games & events in step with the school's Google Calendar, every hour.
 *
 * The calendar decides: date, time, location, and whether a game is cancelled.
 * Staff decide (the sync never overwrites): scores, result, links, photos, the title
 * once created, and the team / opponent / home-away once filled in.
 */

if (!defined('ABSPATH')) {
    exit;
}

require_once __DIR__ . '/calendar-parse.php';

const KAS_SYNC_HOOK = 'kas_calendar_sync_event';

/** The calendar's public iCal link (only Google Calendar links over https are used). */
function kas_calendar_url(): string
{
    $url = kas_setting('calendarIcs');
    return preg_match('~^https://calendar\.google\.com/calendar/ical/[^\s]+\.ics$~', $url) ? $url : '';
}

/** First day of the current school year (Aug 1). Older events are left alone. */
function kas_school_year_start(): string
{
    $now = new DateTimeImmutable('now', new DateTimeZone(KAS_TIME_ZONE));
    $year = (int) $now->format('Y') - ((int) $now->format('n') < 8 ? 1 : 0);
    return "$year-08-01";
}

/** Runs one sync. Returns counts, or ['error' => message]. */
function kas_calendar_sync(): array
{
    $url = kas_calendar_url();
    if ($url === '') {
        return kas_calendar_log(array('error' => 'No Google Calendar link in KAS Athletics settings.'));
    }
    $res = wp_remote_get($url, array('timeout' => 20));
    if (is_wp_error($res) || wp_remote_retrieve_response_code($res) !== 200) {
        $why = is_wp_error($res) ? $res->get_error_message() : 'the calendar answered ' . wp_remote_retrieve_response_code($res);
        return kas_calendar_log(array('error' => 'Could not download the calendar (' . $why . '). Is it still public?'));
    }
    $from = kas_school_year_start();
    $until = (new DateTimeImmutable($from))->modify('+13 months')->format('Y-m-d');
    $events = array_filter(kas_ics_events(wp_remote_retrieve_body($res), KAS_TIME_ZONE), fn($e) => $e['date'] >= $from && $e['date'] < $until);

    $teams = array();
    foreach (kas_seasons() as $s) {
        foreach ($s['teams'] as $t) {
            $teams[] = array('name' => $t['name'], 'level' => $t['level'], 'season' => $s['slug']);
        }
    }

    $stats = array('created' => 0, 'updated' => 0, 'cancelled' => 0, 'needsTeam' => 0, 'seen' => count($events));
    $seen = array();
    foreach ($events as $e) {
        $seen[$e['uid']] = true;
        $result = kas_calendar_upsert($e, $teams);
        $stats[$result]++;
    }
    $stats['cancelled'] += kas_calendar_mark_removed($seen);
    $stats['needsTeam'] = count(get_posts(array('post_type' => 'kas_event', 'numberposts' => -1, 'fields' => 'ids', 'meta_key' => 'kas_needs_team', 'meta_value' => '1')));
    return kas_calendar_log($stats);
}

function kas_calendar_log(array $result): array
{
    update_option('kas_calendar_last', array('time' => time(), 'result' => $result), false);
    return $result;
}

/** Creates or updates the game for one calendar event. Returns 'created' or 'updated'. */
function kas_calendar_upsert(array $e, array $teams): string
{
    $parsed = kas_parse_game_title($e['summary']);
    $team = kas_match_team($parsed['team_text'], $teams, $e['date']);
    $looks_like_game = $parsed['opponent'] !== '' || kas_team_features($parsed['team_text'])['sport'] !== '';
    $status = $e['cancelled'] || $parsed['cancelled'] ? 'cancelled' : ($parsed['postponed'] ? 'postponed' : '');

    $found = get_posts(array('post_type' => 'kas_event', 'post_status' => 'any', 'numberposts' => 1, 'fields' => 'ids',
        'meta_key' => 'kas_gcal_uid', 'meta_value' => $e['uid']));
    $id = $found ? (int) $found[0] : kas_calendar_adopt($e['date'], $team);
    $meta = fn(string $k) => $id ? kas_meta($id, $k) : '';

    if ($id && !$found) {
        update_post_meta($id, 'kas_gcal_uid', $e['uid']);
        update_post_meta($id, 'kas_source', 'gcal');
    }
    if (!$id) {
        $id = (int) wp_insert_post(array('post_type' => 'kas_event', 'post_status' => 'publish', 'post_title' => kas_game_title($team, $parsed, $e['summary'])));
        if (!$id) {
            return 'updated';
        }
        update_post_meta($id, 'kas_gcal_uid', $e['uid']);
        update_post_meta($id, 'kas_source', 'gcal');
        $created = true;
    }
    $set = array(
        'date' => $e['date'],
        'time' => $e['time'] !== '' ? $e['time'] : $parsed['time'],
        'location' => $e['location'],
    );
    foreach (array('venue' => $parsed['venue'], 'opponent' => $parsed['opponent'], 'sport' => $team) as $k => $v) {
        if ($meta($k) === '' && $v !== '') {
            $set[$k] = $v;
        }
    }
    if ($status !== '' && $meta('status') !== 'live') {
        $set['status'] = $status;
        update_post_meta($id, 'kas_status_from_sync', '1');
    } elseif (get_post_meta($id, 'kas_status_from_sync', true) === '1') {
        $set['status'] = 'auto';
        delete_post_meta($id, 'kas_status_from_sync');
    }
    foreach ($set as $k => $v) {
        update_post_meta($id, 'kas_' . $k, sanitize_text_field($v));
    }
    $has_team = ($set['sport'] ?? $meta('sport')) !== '';
    if ($looks_like_game && !$has_team) {
        update_post_meta($id, 'kas_needs_team', '1');
    } else {
        delete_post_meta($id, 'kas_needs_team');
    }
    return isset($created) ? 'created' : 'updated';
}

/**
 * A game typed in by hand (or imported from the old site) on the same day for the same team:
 * the calendar takes it over instead of adding a second copy. Its title, scores and links stay.
 */
function kas_calendar_adopt(string $date, string $team): int
{
    if ($team === '') {
        return 0;
    }
    $found = get_posts(array(
        'post_type' => 'kas_event', 'post_status' => 'any', 'numberposts' => 1, 'fields' => 'ids',
        'meta_query' => array(
            array('key' => 'kas_date', 'value' => $date),
            array('key' => 'kas_sport', 'value' => $team),
            array('key' => 'kas_gcal_uid', 'compare' => 'NOT EXISTS'),
        ),
    ));
    return $found ? (int) $found[0] : 0;
}

/** Upcoming games that were removed from the calendar are marked cancelled (not deleted). */
function kas_calendar_mark_removed(array $seen): int
{
    $count = 0;
    $synced = get_posts(array('post_type' => 'kas_event', 'numberposts' => -1, 'meta_key' => 'kas_source', 'meta_value' => 'gcal'));
    foreach ($synced as $p) {
        $uid = (string) get_post_meta($p->ID, 'kas_gcal_uid', true);
        if (!isset($seen[$uid]) && kas_meta($p->ID, 'date') >= kas_today() && kas_meta($p->ID, 'status') !== 'cancelled') {
            update_post_meta($p->ID, 'kas_status', 'cancelled');
            update_post_meta($p->ID, 'kas_status_from_sync', '1');
            $count++;
        }
    }
    return $count;
}

/* ---------- Every hour ---------- */

add_action(KAS_SYNC_HOOK, 'kas_calendar_sync');

add_action('init', function (): void {
    $on = kas_setting('calendarSync', 'on') === 'on' && kas_calendar_url() !== '';
    $next = wp_next_scheduled(KAS_SYNC_HOOK);
    if ($on && !$next) {
        wp_schedule_event(time() + 60, 'hourly', KAS_SYNC_HOOK);
    } elseif (!$on && $next) {
        wp_clear_scheduled_hook(KAS_SYNC_HOOK);
    }
});

add_action('switch_theme', function (): void {
    wp_clear_scheduled_hook(KAS_SYNC_HOOK);
});

/* ---------- Dashboard: Games & events → Calendar sync ---------- */

add_action('admin_menu', function (): void {
    add_submenu_page('edit.php?post_type=kas_event', 'Calendar sync', 'Calendar sync', 'edit_others_kas_items', 'kas-calendar', 'kas_render_calendar_page');
});

function kas_render_calendar_page(): void
{
    $last = get_option('kas_calendar_last');
    $needs = admin_url('edit.php?post_type=kas_event&kas_needs_team=1');
    echo '<div class="wrap"><h1>Calendar sync</h1>';
    echo '<p>Games are copied from the school’s Google Calendar every hour. Add or move games <strong>in the calendar</strong>; type scores here on the website.</p>';
    if (kas_calendar_url() === '') {
        echo '<div class="notice notice-warning"><p>Add the calendar’s public iCal link in <a href="' . esc_url(admin_url('admin.php?page=kas-settings')) . '">KAS Athletics settings</a> first.</p></div>';
    }
    if (is_array($last)) {
        $r = $last['result'];
        $when = human_time_diff((int) $last['time']) . ' ago';
        if (isset($r['error'])) {
            echo '<div class="notice notice-error"><p>Last try (' . esc_html($when) . '): ' . esc_html($r['error']) . '</p></div>';
        } else {
            printf('<div class="notice notice-success"><p>Last sync %s: %d events read, %d new, %d updated, %d cancelled.</p></div>',
                esc_html($when), (int) $r['seen'], (int) $r['created'], (int) $r['updated'], (int) $r['cancelled']);
        }
        if (!empty($r['needsTeam'])) {
            echo '<p><a class="button" href="' . esc_url($needs) . '">' . (int) $r['needsTeam'] . ' games need a team</a> '
                . 'These are games whose calendar name didn’t say clearly which team plays. Open each one and pick the team.</p>';
        }
    }
    echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '">';
    wp_nonce_field('kas_calendar_sync');
    echo '<input type="hidden" name="action" value="kas_calendar_sync">';
    submit_button('Sync now', 'primary', 'submit', false);
    echo '</form></div>';
}

add_action('admin_post_kas_calendar_sync', function (): void {
    if (!current_user_can('edit_others_kas_items')) {
        wp_die('You don’t have permission to sync the calendar.');
    }
    check_admin_referer('kas_calendar_sync');
    kas_calendar_sync();
    wp_safe_redirect(admin_url('edit.php?post_type=kas_event&page=kas-calendar'));
    exit;
});

/* "Needs a team" view on the Games list. */
add_filter('views_edit-kas_event', function (array $views): array {
    $n = count(get_posts(array('post_type' => 'kas_event', 'numberposts' => -1, 'fields' => 'ids', 'meta_key' => 'kas_needs_team', 'meta_value' => '1')));
    if ($n) {
        $current = isset($_GET['kas_needs_team']) ? ' class="current"' : ''; // phpcs:ignore WordPress.Security.NonceVerification
        $views['kas_needs_team'] = '<a href="' . esc_url(admin_url('edit.php?post_type=kas_event&kas_needs_team=1')) . '"' . $current . '>Needs a team <span class="count">(' . $n . ')</span></a>';
    }
    return $views;
});

add_action('pre_get_posts', function (WP_Query $q): void {
    if (is_admin() && $q->is_main_query() && $q->get('post_type') === 'kas_event' && !empty($_GET['kas_needs_team'])) { // phpcs:ignore WordPress.Security.NonceVerification
        $q->set('meta_query', array(array('key' => 'kas_needs_team', 'value' => '1')));
    }
});

/* Picking a team on a game clears "needs a team". */
add_action('save_post_kas_event', function (int $id): void {
    if (kas_meta($id, 'sport') !== '') {
        delete_post_meta($id, 'kas_needs_team');
    }
}, 20);
