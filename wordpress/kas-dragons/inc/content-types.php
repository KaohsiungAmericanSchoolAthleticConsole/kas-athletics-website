<?php
/**
 * The KAS content: Teams, Games & events, Coaches and Seasons.
 * Field lists live here once and drive the edit boxes, saving and the importer.
 */

if (!defined('ABSPATH')) {
    exit;
}

const KAS_SPORTS = array(
    '' => 'Automatic (from the team name)',
    'soccer' => 'Football / soccer',
    'basketball' => 'Basketball',
    'volleyball' => 'Volleyball',
    'swimming' => 'Swimming',
    'running' => 'Running / cross country / track',
    'racket' => 'Tennis, badminton, table tennis',
    'bat' => 'Baseball / softball',
    'frisbee' => 'Ultimate frisbee',
    'golf' => 'Golf',
    'generic' => 'Other (generic Dragon)',
);

/**
 * Edit-box fields per content type. type: text | area | url | image | images | select | date | time.
 * Saved as post meta "kas_<key>".
 */
function kas_fields(string $post_type): array
{
    $fields = array(
        'kas_team' => array(
            'level' => array('label' => 'Level / league', 'type' => 'text', 'help' => 'e.g. High School · Varsity · AISA'),
            'sport' => array('label' => 'Sport (for the captain animation)', 'type' => 'select', 'options' => KAS_SPORTS),
            'coach' => array('label' => 'Coaches', 'type' => 'text'),
            'practice' => array('label' => 'Practice times', 'type' => 'text'),
            'roster' => array('label' => 'Roster', 'type' => 'area', 'help' => 'One player per line, e.g. "Adam Chu ’26". Add "(C)" at the end for a captain. Optional: "Name ’26 | Role | Number".'),
            'gallery' => array('label' => 'Team photos', 'type' => 'images', 'help' => 'The first photos are also used on the player cards, in order.'),
            'captain_name' => array('label' => 'Captain’s name', 'type' => 'text', 'help' => 'Leave empty to use the first player on the roster.'),
            'captain_role' => array('label' => 'Captain’s role', 'type' => 'text', 'help' => 'Default: Team captain'),
            'captain_number' => array('label' => 'Captain’s number', 'type' => 'text'),
            'captain_year' => array('label' => 'Captain’s class / year', 'type' => 'text'),
            'captain_quote' => array('label' => 'Captain’s quote', 'type' => 'area'),
            'captain_photo' => array('label' => 'Captain’s photo', 'type' => 'image'),
        ),
        'kas_event' => array(
            'date' => array('label' => 'Date', 'type' => 'date'),
            'time' => array('label' => 'Start time (optional)', 'type' => 'time'),
            'sport' => array('label' => 'Team', 'type' => 'team', 'help' => 'Pick the team so the game shows on its team page.'),
            'venue' => array('label' => 'Home or away', 'type' => 'select', 'options' => array('' => '—', 'home' => 'Home', 'away' => 'Away', 'neutral' => 'Neutral')),
            'location' => array('label' => 'Location', 'type' => 'text'),
            'opponent' => array('label' => 'Opponent (leave empty for meets / tournaments)', 'type' => 'text'),
            'opponent_logo' => array('label' => 'Opponent logo', 'type' => 'image'),
            'kas_score' => array('label' => 'KAS score', 'type' => 'text'),
            'opp_score' => array('label' => 'Opponent score', 'type' => 'text'),
            'status' => array('label' => 'Status', 'type' => 'select', 'options' => array('auto' => 'Automatic', 'live' => 'Live now', 'postponed' => 'Postponed', 'cancelled' => 'Cancelled')),
            'result' => array('label' => 'Result text (e.g. "2nd place")', 'type' => 'text'),
            'link' => array('label' => 'Video or details link', 'type' => 'url'),
            'photo' => array('label' => 'Highlight photo', 'type' => 'image'),
        ),
        'kas_coach' => array(
            'role' => array('label' => 'Role', 'type' => 'text', 'help' => 'e.g. Head coach'),
            'sport' => array('label' => 'Sport', 'type' => 'text'),
            'email' => array('label' => 'Email (optional, shown publicly)', 'type' => 'text'),
        ),
    );
    return $fields[$post_type] ?? array();
}

/** Season (category) fields, saved as term meta "kas_<key>". */
function kas_season_fields(): array
{
    return array(
        'dates' => array('label' => 'Dates', 'type' => 'text', 'help' => 'e.g. Aug – Nov'),
        'intro' => array('label' => 'Introduction', 'type' => 'area'),
        'image' => array('label' => 'Photo', 'type' => 'image'),
        'order' => array('label' => 'Order in the menu (1 = first)', 'type' => 'text'),
    );
}

add_action('init', function (): void {
    $common = array(
        'public' => true,
        'show_in_rest' => true,
        'menu_position' => 5,
    );

    register_post_type('kas_team', array_merge($common, array(
        'labels' => kas_labels('Team', 'Teams'),
        'menu_icon' => 'dashicons-groups',
        'has_archive' => false,
        'rewrite' => array('slug' => 'teams', 'with_front' => false),
        'supports' => array('title', 'editor', 'thumbnail', 'page-attributes'),
        'taxonomies' => array('kas_season'),
    )));

    register_post_type('kas_event', array_merge($common, array(
        'labels' => kas_labels('Game', 'Games & events'),
        'menu_icon' => 'dashicons-calendar-alt',
        'has_archive' => 'events',
        'publicly_queryable' => true,
        'rewrite' => array('slug' => 'events', 'with_front' => false),
        'supports' => array('title'),
    )));

    register_post_type('kas_coach', array_merge($common, array(
        'labels' => kas_labels('Coach', 'Coaches'),
        'menu_icon' => 'dashicons-businessperson',
        'has_archive' => false,
        'publicly_queryable' => false,
        'supports' => array('title', 'editor', 'thumbnail', 'page-attributes'),
    )));

    register_taxonomy('kas_season', array('kas_team'), array(
        'labels' => array(
            'name' => 'Seasons', 'singular_name' => 'Season', 'add_new_item' => 'Add a season',
            'edit_item' => 'Edit season', 'search_items' => 'Search seasons', 'menu_name' => 'Seasons',
        ),
        'public' => true,
        'hierarchical' => true,
        'show_in_rest' => true,
        'show_admin_column' => true,
        'rewrite' => array('slug' => 'sports', 'with_front' => false),
    ));

    foreach (array('kas_team', 'kas_event', 'kas_coach') as $type) {
        foreach (kas_fields($type) as $key => $field) {
            register_post_meta($type, 'kas_' . $key, array(
                'type' => 'string',
                'single' => true,
                'show_in_rest' => true,
                'sanitize_callback' => fn($v) => kas_clean_value($v, $field),
                'auth_callback' => fn() => current_user_can('edit_posts'),
            ));
        }
    }
});

function kas_labels(string $one, string $many): array
{
    return array(
        'name' => $many,
        'singular_name' => $one,
        'add_new' => 'Add ' . strtolower($one),
        'add_new_item' => 'Add a ' . strtolower($one),
        'edit_item' => 'Edit ' . strtolower($one),
        'new_item' => 'New ' . strtolower($one),
        'view_item' => 'View ' . strtolower($one),
        'search_items' => 'Search ' . strtolower($many),
        'not_found' => 'Nothing here yet.',
        'all_items' => 'All ' . strtolower($many),
    );
}

/** Cleans one submitted value according to its field type. */
function kas_clean_value($value, array $field): string
{
    $value = is_scalar($value) ? (string) $value : '';
    switch ($field['type']) {
        case 'area':
            return sanitize_textarea_field($value);
        case 'url':
            return esc_url_raw($value, array('http', 'https', 'mailto', 'tel'));
        case 'image':
            return (string) absint($value) ?: '';
        case 'images':
            return implode(',', array_filter(array_map('absint', explode(',', $value))));
        case 'select':
            return array_key_exists($value, $field['options']) ? $value : '';
        case 'date':
            return preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) ? $value : '';
        case 'time':
            return preg_match('/^\d{2}:\d{2}$/', $value) ? $value : '';
        default:
            return sanitize_text_field($value);
    }
}

function kas_meta(int $post_id, string $key): string
{
    return (string) get_post_meta($post_id, 'kas_' . $key, true);
}

/* Games list in the dashboard: newest date first, with date and team columns. */
add_filter('manage_kas_event_posts_columns', function (array $cols): array {
    return array('cb' => $cols['cb'], 'title' => 'Game', 'kas_date' => 'Date', 'kas_team' => 'Team', 'kas_score' => 'Score');
});
add_action('manage_kas_event_posts_custom_column', function (string $col, int $id): void {
    if ($col === 'kas_date') {
        echo esc_html(kas_format_date(kas_meta($id, 'date')) . ' ' . kas_meta($id, 'date') );
    } elseif ($col === 'kas_team') {
        echo esc_html(kas_meta($id, 'sport'));
    } elseif ($col === 'kas_score' && kas_meta($id, 'kas_score') !== '') {
        echo esc_html(kas_meta($id, 'kas_score') . ' – ' . kas_meta($id, 'opp_score'));
    }
}, 10, 2);
add_action('pre_get_posts', function (WP_Query $q): void {
    if (is_admin() && $q->is_main_query() && $q->get('post_type') === 'kas_event' && !$q->get('orderby')) {
        $q->set('meta_key', 'kas_date');
        $q->set('orderby', 'meta_value');
        $q->set('order', 'DESC');
    }
});
