<?php
/**
 * Reusable page pieces (ported from src/render/parts.js and pages.js).
 */

if (!defined('ABSPATH')) {
    exit;
}

function kas_event_row(array $e, bool $show_result = false, bool $anchor = false): string
{
    $d = kas_date_parts($e['date']);
    if (!$d) {
        return '';
    }
    $venue = kas_venue_label($e['venue']);
    $meta = implode(' · ', array_filter(array(kas_format_time($e['time']), $e['location'])));
    $out = '<li class="event"' . ($anchor ? ' id="event-' . esc_attr($e['date']) . '"' : '') . '>';
    $out .= '<div class="event__date" aria-hidden="true"><span>' . esc_html($d['month']) . '</span><strong>' . esc_html($d['day']) . '</strong><span>' . esc_html($d['weekday']) . '</span></div>';
    $out .= '<div class="event__body">';
    if ($e['sport'] !== '') {
        $out .= '<p class="event__sport">' . esc_html($e['sport']) . '</p>';
    }
    $out .= '<h3 class="event__title">' . esc_html($e['title']) . '</h3>';
    $out .= '<p class="event__meta"><span class="visually-hidden">' . esc_html("{$d['weekday']} {$d['month']} {$d['day']}, {$d['year']}. ") . '</span>' . esc_html($meta) . '</p>';
    $out .= '</div><div class="event__side">';
    if ($venue !== '') {
        $out .= '<span class="tag tag--' . esc_attr($e['venue']) . '">' . esc_html($venue) . '</span>';
    }
    if ($show_result && $e['result'] !== '') {
        $out .= '<span class="event__result">' . esc_html($e['result']) . '</span>';
    }
    if ($e['link'] !== '') {
        $out .= kas_link($e['link'], kas_icon('play') . '<span class="visually-hidden">Watch or details for ' . esc_html($e['title']) . '</span>', 'icon-btn');
    }
    return $out . '</div></li>';
}

/** A list of game rows; the first game of each day gets an anchor. */
function kas_event_list(array $events, bool $show_result = false, string $cls = 'event-list'): string
{
    $seen = array();
    $rows = '';
    foreach ($events as $e) {
        $rows .= kas_event_row($e, $show_result, !isset($seen[$e['date']]));
        $seen[$e['date']] = true;
    }
    return '<ol class="' . esc_attr($cls) . '">' . $rows . '</ol>';
}

function kas_empty(string $message): string
{
    return '<p class="empty">' . esc_html($message) . '</p>';
}

function kas_page_hero(string $eyebrow, string $title, string $intro = '', string $image = ''): string
{
    $out = '<section class="page-hero' . ($image !== '' ? ' page-hero--image' : '') . '" aria-labelledby="page-title">';
    if ($image !== '') {
        $out .= kas_photo($image, '', array('cls' => 'page-hero__bg', 'width' => 1600, 'height' => 700, 'eager' => true));
    }
    $out .= '<div class="page-hero__inner">';
    if ($eyebrow !== '') {
        $out .= '<p class="eyebrow">' . esc_html($eyebrow) . '</p>';
    }
    $out .= '<h1 id="page-title" class="page-hero__title">' . esc_html($title) . '</h1>';
    if ($intro !== '') {
        $out .= '<p class="page-hero__intro">' . esc_html($intro) . '</p>';
    }
    return $out . '</div></section>';
}

/** Breadcrumbs: list of [url, label]; the last one is the current page. */
function kas_crumbs(array $items): string
{
    $out = '<nav class="crumbs" aria-label="Breadcrumb"><ol>';
    $last = count($items) - 1;
    foreach ($items as $i => [$url, $label]) {
        $out .= '<li>' . ($url ? '<a href="' . esc_url($url) . '">' . esc_html($label) . '</a>' : '<span aria-current="page">' . esc_html($label) . '</span>');
        if ($i < $last) {
            $out .= '<span class="crumbs__sep" aria-hidden="true">/</span>';
        }
        $out .= '</li>';
    }
    return $out . '</ol></nav>';
}

function kas_video_facade(string $url, string $title): string
{
    $id = kas_youtube_id($url);
    if ($id === '') {
        return '';
    }
    return '<div class="video" data-video="' . esc_attr($id) . '">'
        . '<img src="' . esc_url("https://i.ytimg.com/vi/$id/hqdefault.jpg") . '" alt="" width="480" height="360" loading="lazy">'
        . '<button class="video__play" type="button" data-video-play>' . kas_icon('play') . '<span class="visually-hidden">Play video: ' . esc_html($title) . '</span></button>'
        . '</div>';
}

function kas_team_card(array $t): string
{
    $out = '<li class="team-card team-card--link">';
    $out .= kas_photo($t['image'], $t['name'], array('cls' => 'team-card__img', 'width' => 800, 'height' => 560));
    $out .= '<div class="team-card__body">';
    if ($t['level'] !== '') {
        $out .= '<p class="team-card__level">' . esc_html($t['level']) . '</p>';
    }
    $out .= '<h3 class="team-card__name"><a href="' . esc_url($t['url']) . '">' . esc_html($t['name']) . '</a></h3><dl class="team-card__facts">';
    if ($t['coach'] !== '') {
        $out .= '<div><dt>Coach</dt><dd>' . esc_html($t['coach']) . '</dd></div>';
    }
    if ($t['practice'] !== '') {
        $out .= '<div><dt>Practice</dt><dd>' . esc_html($t['practice']) . '</dd></div>';
    }
    if ($t['players']) {
        $out .= '<div><dt>Roster</dt><dd>' . count($t['players']) . ' players</dd></div>';
    }
    $out .= '</dl>';
    if ($t['description'] !== '') {
        $out .= '<div class="team-card__desc">' . kas_paragraphs($t['description']) . '</div>';
    }
    return $out . '<span class="team-card__more" aria-hidden="true">Team page ' . kas_icon('arrow') . '</span></div></li>';
}

function kas_player_card(array $p): string
{
    $captain = (bool) preg_match('/captain/i', $p['role']);
    $out = '<li class="player-card' . ($captain ? ' player-card--captain' : '') . '"><div class="player-card__media">';
    $out .= kas_photo($p['photo'], $p['name'], array('cls' => 'player-card__photo', 'width' => 480, 'height' => 600, 'fallback' => kas_initials($p['name'])));
    if ($p['number'] !== '') {
        $out .= '<span class="player-card__number">' . esc_html($p['number']) . '</span>';
    }
    if ($captain) {
        $out .= '<span class="player-card__badge" title="Captain"><span aria-hidden="true">C</span><span class="visually-hidden">Captain</span></span>';
    }
    $out .= '</div><div class="player-card__body">';
    if ($p['role'] !== '') {
        $out .= '<p class="player-card__role">' . esc_html($p['role']) . '</p>';
    }
    $out .= '<h3 class="player-card__name">' . esc_html($p['name']) . '</h3>';
    if ($p['year'] !== '') {
        $out .= '<p class="player-card__year">' . esc_html($p['year']) . '</p>';
    }
    return $out . '</div></li>';
}

function kas_season_tiles(array $seasons, bool $feature_first = true): string
{
    $out = '<ul class="season-grid">';
    foreach ($seasons as $i => $s) {
        $count = count($s['teams']) . ' teams' . ($s['dates'] !== '' ? ' · ' . $s['dates'] : '');
        $out .= '<li class="season-card' . ($feature_first && $i === 0 ? ' season-card--feature' : '') . '"><a href="' . esc_url($s['url']) . '">'
            . kas_photo($s['image'], '', array('cls' => 'season-card__img', 'width' => 900, 'height' => 700))
            . '<span class="season-card__shade" aria-hidden="true"></span><span class="season-card__body">'
            . '<span class="season-card__count">' . esc_html($count) . '</span>'
            . '<span class="season-card__title">' . esc_html($s['title']) . '</span>'
            . '<span class="season-card__go" aria-hidden="true">' . kas_icon('arrow') . '</span></span></a></li>';
    }
    return $out . '</ul>';
}

/** Section heading with an optional small "kicker" above the title. */
function kas_section_head(string $kicker, string $title, string $extra = ''): string
{
    return '<div class="section__head"><h2 class="section__title">'
        . ($kicker !== '' ? '<span class="kicker">' . esc_html($kicker) . '</span>' : '')
        . esc_html($title) . '</h2>' . $extra . '</div>';
}
