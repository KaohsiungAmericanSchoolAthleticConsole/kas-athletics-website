<?php
/**
 * The scoreboard (games + standings), ported from src/render/scores.js.
 * Shown on the page whose web address is "scores" (template page-scores.php).
 */

if (!defined('ABSPATH')) {
    exit;
}

const KAS_RESULTS_LIMIT = 24;
const KAS_UPCOMING_LIMIT = 12;
const KAS_FORM_LENGTH = 5;

function kas_has_scores(array $e): bool
{
    return $e['kasScore'] !== '' && $e['opponentScore'] !== '';
}

function kas_day_label(string $date, string $today): string
{
    if ($date === $today) {
        return 'Today';
    }
    $diff = (int) round((strtotime($date . ' UTC') - strtotime($today . ' UTC')) / 86400);
    if ($diff === -1) {
        return 'Yesterday';
    }
    if ($diff === 1) {
        return 'Tomorrow';
    }
    return kas_format_date($date);
}

/** What a game card should say: kind, label and sub-label. */
function kas_game_state(array $e): array
{
    $today = kas_today();
    $day = kas_day_label($e['date'], $today);
    $time = kas_format_time($e['time']);
    if ($e['status'] === 'cancelled') {
        return array('cancelled', 'Cancelled', $day);
    }
    if ($e['status'] === 'postponed') {
        return array('postponed', 'Postponed', $day);
    }
    if ($e['status'] === 'live') {
        return array('live', 'Live', $e['result'] ?: $day);
    }
    if (kas_has_scores($e) || ($e['result'] !== '' && $e['date'] <= $today)) {
        return array('final', 'Final', $day);
    }
    if ($e['date'] === $today) {
        return array('today', $time ?: 'All day', 'Today');
    }
    if ($e['date'] > $today) {
        return array('upcoming', $day, $time ?: 'All day');
    }
    return array('past', $day, 'Score not posted');
}

function kas_winner(array $e): ?string
{
    if (!kas_has_scores($e)) {
        return null;
    }
    $k = (float) $e['kasScore'];
    $o = (float) $e['opponentScore'];
    return $k === $o ? 'tie' : ($k > $o ? 'kas' : 'opp');
}

function kas_standings(array $events): array
{
    $table = array();
    foreach ($events as $e) {
        if ($e['sport'] === '' || $e['opponent'] === '' || !kas_has_scores($e) || in_array($e['status'], array('live', 'cancelled'), true)) {
            continue;
        }
        $row = $table[$e['sport']] ?? array('team' => $e['sport'], 'w' => 0, 'l' => 0, 't' => 0, 'form' => array());
        $r = array('kas' => 'W', 'opp' => 'L', 'tie' => 'T')[kas_winner($e)];
        $row[strtolower($r)]++;
        $row['form'] = array_slice(array_merge($row['form'], array($r)), -KAS_FORM_LENGTH);
        $table[$e['sport']] = $row;
    }
    $rows = array_map(function ($r) {
        $r['played'] = $r['w'] + $r['l'] + $r['t'];
        $r['pct'] = ($r['w'] + $r['t'] / 2) / max(1, $r['played']);
        return $r;
    }, array_values($table));
    usort($rows, fn($a, $b) => ($b['pct'] <=> $a['pct']) ?: (($b['w'] <=> $a['w']) ?: strcmp($a['team'], $b['team'])));
    return $rows;
}

function kas_crest(string $src, string $name): string
{
    return $src !== ''
        ? '<img class="sb-crest" src="' . esc_url($src) . '" alt="" width="40" height="40" loading="lazy">'
        : '<span class="sb-crest sb-crest--mono" aria-hidden="true">' . esc_html(kas_initials($name)) . '</span>';
}

function kas_sb_thumb(array $e): string
{
    $yt = kas_youtube_id($e['link']);
    $src = $e['photo'] ?: ($yt ? "https://i.ytimg.com/vi/$yt/hqdefault.jpg" : '');
    if ($src === '' && $e['link'] === '') {
        return '';
    }
    $inner = ($src !== '' ? '<img src="' . esc_url($src) . '" alt="" width="160" height="90" loading="lazy">' : '')
        . '<span class="sb-thumb__label">' . ($yt ? kas_icon('play') : '') . ($yt ? 'Highlights' : 'Details') . '</span>';
    if ($e['link'] === '') {
        return '<span class="sb-thumb">' . $inner . '</span>';
    }
    return '<a class="sb-thumb' . ($src !== '' ? '' : ' sb-thumb--plain') . '" href="' . esc_url($e['link']) . '" target="_blank" rel="noopener noreferrer">'
        . $inner . '<span class="visually-hidden"> for ' . esc_html($e['title']) . ' (opens in a new tab)</span></a>';
}

function kas_game_card(array $e): string
{
    $site = kas_site();
    [$kind, $label, $sub] = kas_game_state($e);
    $final = $kind === 'final';
    $show = kas_has_scores($e) && ($final || $kind === 'live');
    $won = $final ? kas_winner($e) : null;
    $kas = array('name' => $site['shortName'], 'logo' => $site['logo'], 'score' => $show ? $e['kasScore'] : '', 'key' => 'kas');
    $opp = array('name' => $e['opponent'], 'logo' => $e['opponentLogo'], 'score' => $show ? $e['opponentScore'] : '', 'key' => 'opp');
    $rows = $e['venue'] === 'home' ? array($opp, $kas) : array($kas, $opp);

    $summary = ($e['sport'] !== '' ? $e['sport'] . ': ' : '');
    $summary .= $e['opponent'] !== ''
        ? implode(', ', array_map(fn($s) => $s['name'] . ($s['score'] !== '' ? ' ' . $s['score'] : ''), $rows)) . ". $label, $sub."
        : $e['title'] . ". $label" . ($e['result'] !== '' ? ', ' . $e['result'] : '') . '.';

    $teams = '';
    if ($e['opponent'] !== '') {
        foreach ($rows as $side) {
            $is_won = $won === $side['key'];
            $teams .= '<div class="sb-team' . ($final && !$is_won ? ' is-dim' : '') . '">' . kas_crest($side['logo'], $side['name'])
                . '<span class="sb-team__name">' . esc_html($side['name']) . '</span><span class="sb-team__score">' . esc_html($side['score']) . '</span>'
                . '<span class="sb-team__win" aria-hidden="true">' . ($is_won ? '◀' : '') . '</span></div>';
        }
    } else {
        $teams = '<div class="sb-meet"><span class="sb-meet__title">' . esc_html($e['title']) . '</span>'
            . ($e['result'] !== '' ? '<span class="sb-meet__result">' . esc_html($e['result']) . '</span>' : '')
            . '<span class="sb-meet__where">' . esc_html($e['location']) . '</span></div>';
    }
    $venue = kas_venue_label($e['venue']);
    return '<li class="sb-card sb-card--' . esc_attr($kind) . '"><article aria-label="' . esc_attr($summary) . '">'
        . '<p class="sb-card__sport">' . esc_html($e['sport'] ?: $e['title']) . ($venue !== '' ? ' · <span>' . esc_html($venue) . '</span>' : '') . '</p>'
        . '<div class="sb-card__body"><div class="sb-card__teams" aria-hidden="true">' . $teams . '</div>'
        . '<div class="sb-card__status"><p class="sb-status" aria-hidden="true"><strong>' . ($kind === 'live' ? '<span class="sb-live-dot"></span>' : '') . esc_html($label) . '</strong><span>' . esc_html($sub) . '</span></p>'
        . kas_sb_thumb($e) . '</div></div></article></li>';
}

function kas_sb_grid(string $title, array $list): string
{
    if (!$list) {
        return '';
    }
    return '<section class="sb-section" aria-label="' . esc_attr($title) . '"><h2 class="sb-section__title">' . esc_html($title) . '</h2><ul class="sb-grid">'
        . implode('', array_map('kas_game_card', $list)) . '</ul></section>';
}

function kas_sb_games(string $team): array
{
    $today = kas_today();
    $events = array_values(array_filter(kas_events(), fn($e) => $e['date'] !== '' && ($team === '' || $e['sport'] === $team)));
    $by_kind = fn(array $kinds) => array_values(array_filter($events, fn($e) => in_array(kas_game_state($e)[0], $kinds, true)));
    $now = $by_kind(array('live', 'today'));
    $upcoming = array_slice(array_values(array_filter($by_kind(array('upcoming', 'postponed')), fn($e) => $e['date'] > $today || $e['status'] === 'postponed')), 0, KAS_UPCOMING_LIMIT);
    $results = array_slice(array_reverse($by_kind(array('final', 'past', 'cancelled'))), 0, KAS_RESULTS_LIMIT);
    $body = kas_sb_grid('Today', $now) . kas_sb_grid('Coming up', $upcoming) . kas_sb_grid('Results', $results);
    if (!$now && !$upcoming && !$results) {
        $body = '<p class="sb-empty">No games yet' . ($team !== '' ? ' for this team' : '') . '.</p>';
    }
    return array($body, (bool) $now);
}

function kas_sb_filter(string $current): string
{
    $teams = array_unique(array_filter(array_column(kas_events(), 'sport')));
    sort($teams);
    if (count($teams) < 2) {
        return '';
    }
    $out = '<form class="sb-filter" method="get" data-autosubmit><label for="sb-team">Team</label><select id="sb-team" name="team"><option value="">All teams</option>';
    foreach ($teams as $t) {
        $out .= '<option value="' . esc_attr($t) . '"' . selected($t, $current, false) . '>' . esc_html($t) . '</option>';
    }
    return $out . '</select><button type="submit" class="sb-filter__go">Show</button></form>';
}

function kas_sb_standings(): string
{
    $rows = kas_standings(kas_events());
    if (!$rows) {
        return '<p class="sb-empty">Standings appear here once final scores are entered for games against an opponent.</p>';
    }
    $links = kas_team_links();
    $out = '<div class="sb-table-wrap"><table class="sb-table"><caption class="visually-hidden">Win and loss record for each KAS team</caption>'
        . '<thead><tr><th scope="col">Team</th><th scope="col"><abbr title="Wins">W</abbr></th><th scope="col"><abbr title="Losses">L</abbr></th><th scope="col"><abbr title="Ties">T</abbr></th><th scope="col">Win %</th><th scope="col">Last ' . KAS_FORM_LENGTH . '</th></tr></thead><tbody>';
    foreach ($rows as $r) {
        $name = isset($links[$r['team']]) ? '<a href="' . esc_url($links[$r['team']]) . '">' . esc_html($r['team']) . '</a>' : esc_html($r['team']);
        $form = implode('', array_map(fn($f) => '<span class="sb-form__' . $f . '" title="' . array('W' => 'Win', 'L' => 'Loss', 'T' => 'Tie')[$f] . '">' . $f . '</span>', $r['form']));
        $out .= '<tr><th scope="row">' . $name . '</th><td>' . $r['w'] . '</td><td>' . $r['l'] . '</td><td>' . $r['t'] . '</td><td>'
            . esc_html(ltrim(number_format($r['pct'], 3), '0')) . '</td><td><span class="sb-form">' . $form . '</span></td></tr>';
    }
    return $out . '</tbody></table></div>';
}

/** The whole scoreboard. $tab: games | standings. */
function kas_scoreboard(string $tab, string $team): string
{
    $site = kas_site();
    $base = get_permalink();
    $tabs = array('games' => array('Games', $base), 'standings' => array('Standings', add_query_arg('view', 'standings', $base)));
    $nav = '';
    foreach ($tabs as $id => [$label, $href]) {
        $nav .= '<a href="' . esc_url($href) . '"' . ($id === $tab ? ' aria-current="page"' : '') . '>' . esc_html($label) . '</a>';
    }
    $live = false;
    if ($tab === 'games') {
        [$games, $live] = kas_sb_games($team);
        $main = kas_sb_filter($team) . $games;
    } else {
        $main = kas_sb_standings();
    }
    return '<section class="sb" aria-labelledby="sb-title"><div class="sb-head"><div class="sb-head__inner"><div class="sb-head__brand">'
        . '<img src="' . esc_url($site['logo']) . '" alt="" width="56" height="56"><h1 id="sb-title">Scoreboard</h1></div>'
        . '<nav class="sb-tabs" aria-label="Scoreboard">' . $nav . '</nav></div></div>'
        . '<div class="sb-main"' . ($live ? ' data-live-refresh' : '') . ' data-scoreboard>' . $main . '</div></section>';
}
