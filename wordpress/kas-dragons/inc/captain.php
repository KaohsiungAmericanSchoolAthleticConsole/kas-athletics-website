<?php
/**
 * The "captain's moment" at the top of every team page (ported from src/render/captain.js
 * and src/lib/sport.js). The animation is decoration only; site.js starts it on scroll.
 */

if (!defined('ABSPATH')) {
    exit;
}

require_once __DIR__ . '/captain-art.php';

const KAS_SPORT_LABELS = array(
    'soccer' => 'Football', 'basketball' => 'Basketball', 'volleyball' => 'Volleyball', 'swimming' => 'Swimming',
    'running' => 'Running', 'racket' => 'Racket sports', 'bat' => 'Baseball', 'frisbee' => 'Ultimate', 'golf' => 'Golf',
    'generic' => 'Dragon athletics',
);

/** Which sport a team plays: the staff choice, otherwise worked out from its name. */
function kas_sport_of(array $team): string
{
    if (isset(KAS_SPORT_LABELS[$team['sport']])) {
        return $team['sport'];
    }
    $rules = array(
        'soccer' => '/\b(soccer|football|futbol)\b/i',
        'basketball' => '/\b(basketball|hoops?)\b/i',
        'volleyball' => '/\bvolleyball\b/i',
        'swimming' => '/\b(swim|swimming|water polo)\b/i',
        'running' => '/\b(cross[- ]?country|track|running|athletics|x country|xc)\b/i',
        'racket' => '/\b(tennis|badminton|squash|table tennis|ping[- ]?pong|pickleball)\b/i',
        'bat' => '/\b(baseball|softball|cricket)\b/i',
        'frisbee' => '/\b(frisbee|ultimate)\b/i',
        'golf' => '/\bgolf\b/i',
    );
    $text = $team['name'] . ' ' . $team['level'];
    foreach ($rules as $kind => $re) {
        if (preg_match($re, $text)) {
            return $kind;
        }
    }
    return 'generic';
}

/** Staff fields win; otherwise the roster's captain (or first player) and the team photo stand in. */
function kas_captain_of(array $team): array
{
    $c = $team['captain'];
    $players = $team['players'];
    $lead = array('name' => '', 'number' => '', 'year' => '', 'quote' => '', 'photo' => '');
    foreach ($players as $p) {
        if (preg_match('/captain/i', $p['role'])) {
            $lead = $p;
            break;
        }
    }
    if ($lead['name'] === '' && $players) {
        $lead = $players[0];
    }
    $custom = trim($c['name']) !== '';
    $from_lead = fn($v) => $custom ? '' : trim((string) $v);
    $photo = $c['photo'] ?: ($from_lead($lead['photo']) ?: ($team['image'] ?: ($team['gallery'][0] ?? '')));
    return array(
        'name' => $custom ? trim($c['name']) : trim($lead['name']),
        'role' => $c['role'] !== '' ? $c['role'] : 'Team captain',
        'number' => $c['number'] !== '' ? $c['number'] : $from_lead($lead['number']),
        'year' => $c['year'] !== '' ? $c['year'] : $from_lead($lead['year']),
        'quote' => $c['quote'] !== '' ? $c['quote'] : $from_lead($lead['quote']),
        'photo' => $photo,
    );
}

function kas_captain_reveal(array $team, string $season_title): string
{
    $cap = kas_captain_of($team);
    $sport = kas_sport_of($team);
    $heading = $cap['name'] !== '' ? $cap['name'] : 'Captain to be announced';
    $pose = KAS_POSE[$sport] ?? 'kick';

    $out = '<section class="captain" id="team-captain" data-sport="' . esc_attr($sport) . '" aria-labelledby="captain-title">';
    $out .= '<div class="captain__scene" aria-hidden="true">';
    $out .= '<svg class="captain__field" viewBox="0 0 1200 420" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">' . (KAS_FIELDS[$sport] ?? KAS_FIELDS['generic']) . '</svg>';
    $out .= '<span class="captain__word">' . esc_html(KAS_WORD[$sport] ?? KAS_WORD['generic']) . '</span>';
    $out .= '<svg class="captain__athlete" viewBox="0 0 240 260" aria-hidden="true" focusable="false">' . (KAS_ATHLETES[$pose] ?? KAS_ATHLETES['kick']) . (KAS_PROPS[$sport] ?? '') . '</svg>';
    $out .= '<svg class="captain__ball" viewBox="0 0 48 48" aria-hidden="true" focusable="false">' . (KAS_BALLS[$sport] ?? KAS_BALLS['generic']) . '</svg>';
    $out .= '</div><div class="captain__inner"><div class="captain__copy">';
    $out .= '<p class="kicker">' . esc_html(KAS_SPORT_LABELS[$sport] . ($season_title !== '' ? ' · ' . $season_title : '')) . '</p>';
    $out .= '<p class="captain__lead">Captain’s moment</p>';
    $out .= '<h2 class="captain__name" id="captain-title">' . esc_html($heading) . '</h2>';
    $out .= '<p class="captain__meta"><span>' . esc_html($cap['role']) . '</span>';
    if ($cap['year'] !== '') {
        $out .= '<span class="captain__dot" aria-hidden="true">·</span><span>' . esc_html($cap['year']) . '</span>';
    }
    if ($team['level'] !== '') {
        $out .= '<span class="captain__dot" aria-hidden="true">·</span><span>' . esc_html($team['level']) . '</span>';
    }
    $out .= '</p>';
    if ($cap['quote'] !== '') {
        $out .= '<blockquote class="captain__quote">' . esc_html($cap['quote']) . '</blockquote>';
    }
    $out .= '<div class="captain__actions">';
    if ($team['players']) {
        $out .= '<a class="btn btn--primary" href="#team-roster">Meet the team ' . kas_icon('arrow') . '</a>';
    }
    $out .= '</div></div><figure class="captain__card">';
    $out .= kas_photo($cap['photo'], $cap['name'] ?: $team['name'], array('cls' => 'captain__img', 'width' => 800, 'height' => 1000, 'fallback' => kas_initials($cap['name'] ?: $team['name'])));
    $out .= '<figcaption class="captain__badge"><span class="captain__c" aria-hidden="true">C</span><span class="captain__badge-text">';
    if ($cap['number'] !== '') {
        $out .= '<strong>' . esc_html($cap['number']) . '</strong>';
    }
    return $out . '<span>' . esc_html($cap['role']) . '</span></span></figcaption></figure></div></section>';
}
