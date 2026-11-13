<?php
/**
 * Rosters from a Google Sheet. The sheet's Apps Script (wordpress/apps-script/roster-sync.gs)
 * sends every team's players here. Signed in with a WordPress Application Password
 * (Users → Profile → Application Passwords), so it can be revoked any time.
 *
 *   GET  /wp-json/kas/v1/teams     → team names (for the sheet's dropdown)
 *   POST /wp-json/kas/v1/rosters   → { "teams": [ { "team": "JV Girls Volleyball",
 *                                        "players": [ { "name", "year", "role", "number" } ] } ] }
 * Only teams named in the request change; their roster is replaced by the sheet's.
 */

if (!defined('ABSPATH')) {
    exit;
}

require_once __DIR__ . '/roster-parse.php';

const KAS_ROSTER_MAX_TEAMS = 100;

add_action('rest_api_init', function (): void {
    $can = fn() => current_user_can('edit_kas_items');
    register_rest_route('kas/v1', '/teams', array(
        'methods' => 'GET',
        'permission_callback' => $can,
        'callback' => fn() => rest_ensure_response(array_map(
            fn($p) => $p->post_title,
            get_posts(array('post_type' => 'kas_team', 'numberposts' => -1, 'orderby' => 'title', 'order' => 'ASC'))
        )),
    ));
    register_rest_route('kas/v1', '/rosters', array(
        array('methods' => 'POST', 'permission_callback' => $can, 'callback' => 'kas_rest_rosters'),
        // Current rosters, so a new sheet can start filled in.
        array('methods' => 'GET', 'permission_callback' => $can, 'callback' => fn() => rest_ensure_response(array_map(
            fn($p) => array('team' => $p->post_title, 'players' => array_map(
                fn($pl) => array('name' => $pl['name'], 'year' => preg_replace('/\D/', '', $pl['year']), 'role' => $pl['role'], 'number' => $pl['number']),
                kas_players_from_roster(kas_meta($p->ID, 'roster'), array())
            )),
            get_posts(array('post_type' => 'kas_team', 'numberposts' => -1, 'orderby' => array('menu_order' => 'ASC', 'title' => 'ASC')))
        ))),
    ));
});

function kas_find_team(string $name): ?WP_Post
{
    $name = trim($name);
    if ($name === '') {
        return null;
    }
    foreach (get_posts(array('post_type' => 'kas_team', 'numberposts' => -1, 'post_status' => 'any')) as $p) {
        if (strcasecmp($p->post_title, $name) === 0 || $p->post_name === sanitize_title($name)) {
            return $p;
        }
    }
    return null;
}

function kas_rest_rosters(WP_REST_Request $req)
{
    $teams = $req->get_param('teams');
    if (!is_array($teams) || count($teams) > KAS_ROSTER_MAX_TEAMS) {
        return new WP_Error('kas_bad_request', 'Send {"teams": [...]} with at most ' . KAS_ROSTER_MAX_TEAMS . ' teams.', array('status' => 400));
    }
    $updated = array();
    $unknown = array();
    foreach ($teams as $entry) {
        $name = is_array($entry) && is_scalar($entry['team'] ?? null) ? (string) $entry['team'] : '';
        $post = kas_find_team($name);
        if (!$post || !current_user_can('edit_post', $post->ID)) {
            $unknown[] = $name;
            continue;
        }
        $players = is_array($entry['players'] ?? null) ? array_slice($entry['players'], 0, KAS_ROSTER_MAX_PLAYERS) : array();
        $lines = array_values(array_filter(array_map(fn($p) => is_array($p) ? kas_roster_line($p) : '', $players)));
        update_post_meta($post->ID, 'kas_roster', implode("\n", $lines));
        update_post_meta($post->ID, 'kas_roster_synced', time());
        $updated[] = array('team' => $post->post_title, 'players' => count($lines));
    }
    return rest_ensure_response(array('updated' => $updated, 'unknownTeams' => array_values(array_unique($unknown))));
}

/* Show on the team's edit screen that its roster comes from the sheet. */
add_action('edit_form_after_title', function (WP_Post $post): void {
    $when = (int) get_post_meta($post->ID, 'kas_roster_synced', true);
    if ($post->post_type === 'kas_team' && $when) {
        echo '<div class="notice notice-info inline"><p>This roster was last updated from the Google Sheet '
            . esc_html(human_time_diff($when)) . ' ago. Change players in the sheet, or the next sync will undo changes made here.</p></div>';
    }
});
