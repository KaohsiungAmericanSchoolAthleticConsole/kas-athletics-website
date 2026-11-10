<?php
/**
 * Reads Teams, Games, Coaches and Seasons from WordPress into plain arrays,
 * in the same shape the original site used, so the templates stay simple.
 */

if (!defined('ABSPATH')) {
    exit;
}

/** Site-wide settings with sensible defaults. */
function kas_site(): array
{
    static $site = null;
    if ($site !== null) {
        return $site;
    }
    $logo = kas_image_url(kas_setting('logo'));
    $site = array(
        'name' => kas_setting('name', get_bloginfo('name')),
        'tagline' => kas_setting('tagline', get_bloginfo('description')),
        'shortName' => kas_setting('shortName', 'KAS'),
        'schoolName' => kas_setting('schoolName', 'Kaohsiung American School'),
        'logo' => $logo !== '' ? $logo : get_template_directory_uri() . '/assets/img/crest.svg',
        'phone' => kas_setting('phone'),
        'email' => kas_setting('email'),
        'address' => kas_setting('address'),
        'brandColor' => kas_setting('brandColor', '#d43429'),
        'brandColor2' => kas_setting('brandColor2', '#1863dc'),
        'defaultTheme' => kas_setting('defaultTheme', 'auto'),
        'seasonal' => kas_setting('seasonal', 'auto'),
        'instagramUrl' => kas_setting('instagramUrl'),
        'instagramHandle' => kas_setting('instagramHandle'),
        'youtubeUrl' => kas_setting('youtubeUrl'),
        'newsletterUrl' => kas_setting('newsletterUrl'),
        'footerNote' => kas_setting('footerNote'),
    );
    return $site;
}

/** Every game, as arrays, sorted by date and time. */
function kas_events(): array
{
    static $events = null;
    if ($events !== null) {
        return $events;
    }
    $events = array();
    $posts = get_posts(array('post_type' => 'kas_event', 'numberposts' => -1, 'post_status' => 'publish'));
    foreach ($posts as $p) {
        $m = fn($k) => kas_meta($p->ID, $k);
        $events[] = array(
            'id' => $p->ID,
            'title' => get_the_title($p),
            'date' => $m('date'),
            'time' => $m('time'),
            'sport' => $m('sport'),
            'venue' => $m('venue'),
            'location' => $m('location'),
            'opponent' => $m('opponent'),
            'opponentLogo' => kas_image_url($m('opponent_logo')),
            'kasScore' => $m('kas_score'),
            'opponentScore' => $m('opp_score'),
            'status' => $m('status') !== '' ? $m('status') : 'auto',
            'result' => $m('result'),
            'link' => $m('link'),
            'photo' => kas_image_url($m('photo')),
        );
    }
    usort($events, 'kas_by_date_time');
    return $events;
}

function kas_by_date_time(array $a, array $b): int
{
    return strcmp($a['date'] . 'T' . ($a['time'] ?: '00:00'), $b['date'] . 'T' . ($b['time'] ?: '00:00'));
}

function kas_upcoming_events(?array $events = null): array
{
    $today = kas_today();
    return array_values(array_filter($events ?? kas_events(), fn($e) => $e['date'] !== '' && $e['date'] >= $today));
}

function kas_past_events(?array $events = null): array
{
    $today = kas_today();
    return array_reverse(array_values(array_filter($events ?? kas_events(), fn($e) => $e['date'] !== '' && $e['date'] < $today)));
}

/** A team post → array. */
function kas_team(WP_Post $p, ?WP_Term $season = null): array
{
    $m = fn($k) => kas_meta($p->ID, $k);
    $gallery = array_values(array_filter(array_map('kas_image_url', array_filter(explode(',', $m('gallery'))))));
    return array(
        'id' => $p->ID,
        'name' => get_the_title($p),
        'slug' => $p->post_name,
        'url' => get_permalink($p),
        'level' => $m('level'),
        'sport' => $m('sport'),
        'coach' => $m('coach'),
        'practice' => $m('practice'),
        'description' => wp_strip_all_tags($p->post_content),
        'image' => (string) get_the_post_thumbnail_url($p, 'full'),
        'gallery' => $gallery,
        'players' => kas_players_from_roster($m('roster'), $gallery),
        'captain' => array(
            'name' => $m('captain_name'), 'role' => $m('captain_role'), 'number' => $m('captain_number'),
            'year' => $m('captain_year'), 'quote' => $m('captain_quote'), 'photo' => kas_image_url($m('captain_photo')),
        ),
        'season' => $season,
    );
}

/** "Adam Chu ’26 (C) | Setter | 7" lines → player cards. The n-th team photo goes on the n-th card. */
function kas_players_from_roster(string $roster, array $gallery): array
{
    $players = array();
    $lines = array_values(array_filter(array_map('trim', preg_split('/\r?\n/', $roster))));
    foreach ($lines as $i => $line) {
        $parts = array_map('trim', explode('|', $line));
        $text = $parts[0];
        $captain = (bool) preg_match('/\((?:c|captain)\)\s*$/i', $text);
        $year = preg_match('/[’\'‘](\d{2})\b/u', $text, $mm) ? 'Class of 20' . $mm[1] : '';
        $name = trim(preg_replace(array('/\s*[’\'‘]\d{2}\b/u', '/\s*\((?:c|captain)\)\s*$/i'), '', $text));
        if ($name === '') {
            continue;
        }
        $role = $parts[1] ?? '';
        $players[] = array(
            'name' => $name,
            'year' => $year,
            'role' => $role !== '' ? $role : ($captain ? 'Captain' : ''),
            'number' => $parts[2] ?? '',
            'photo' => $gallery[$i] ?? '',
            'quote' => '',
        );
    }
    return $players;
}

/** Seasons in menu order, each with its teams. */
function kas_seasons(): array
{
    static $seasons = null;
    if ($seasons !== null) {
        return $seasons;
    }
    $terms = get_terms(array('taxonomy' => 'kas_season', 'hide_empty' => false));
    if (is_wp_error($terms)) {
        return $seasons = array();
    }
    usort($terms, fn($a, $b) => ((int) get_term_meta($a->term_id, 'kas_order', true) ?: 99) <=> ((int) get_term_meta($b->term_id, 'kas_order', true) ?: 99));
    $seasons = array_map('kas_season', $terms);
    return $seasons;
}

function kas_season(WP_Term $term): array
{
    $posts = get_posts(array(
        'post_type' => 'kas_team', 'numberposts' => -1, 'post_status' => 'publish',
        'orderby' => array('menu_order' => 'ASC', 'title' => 'ASC'),
        'tax_query' => array(array('taxonomy' => 'kas_season', 'terms' => $term->term_id)),
    ));
    return array(
        'term' => $term,
        'title' => $term->name,
        'slug' => $term->slug,
        'url' => get_term_link($term),
        'dates' => (string) get_term_meta($term->term_id, 'kas_dates', true),
        'intro' => (string) get_term_meta($term->term_id, 'kas_intro', true),
        'image' => kas_image_url(get_term_meta($term->term_id, 'kas_image', true)),
        'teams' => array_map(fn($p) => kas_team($p, $term), $posts),
    );
}

function kas_coaches(): array
{
    $posts = get_posts(array(
        'post_type' => 'kas_coach', 'numberposts' => -1, 'post_status' => 'publish',
        'orderby' => array('menu_order' => 'ASC', 'title' => 'ASC'),
    ));
    return array_map(fn($p) => array(
        'name' => get_the_title($p),
        'role' => kas_meta($p->ID, 'role'),
        'sport' => kas_meta($p->ID, 'sport'),
        'email' => kas_meta($p->ID, 'email'),
        'photo' => (string) get_the_post_thumbnail_url($p, 'full'),
        'bio' => wp_strip_all_tags($p->post_content),
    ), $posts);
}

/** Contact people from Site settings ("Name | Role | Email | Phone" per line). */
function kas_contact_people(): array
{
    return kas_setting_lines('contactPeople', array('name', 'role', 'email', 'phone'));
}

/** Footer links from Site settings ("Label | URL" per line). */
function kas_footer_links(): array
{
    return kas_setting_lines('links', array('label', 'url'));
}

/** Team name → team page URL (for the schedule and standings). */
function kas_team_links(): array
{
    $links = array();
    foreach (kas_seasons() as $s) {
        foreach ($s['teams'] as $t) {
            $links[$t['name']] = $t['url'];
        }
    }
    return $links;
}
