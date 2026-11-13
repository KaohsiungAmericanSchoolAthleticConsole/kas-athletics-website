<?php
/**
 * Reads the school's Google Calendar feed (iCal) and understands event names like
 *   "Home Game - Varsity Boys BB v.s ICA @5:15pm (Qualifier)".
 * Plain PHP only (no WordPress calls), so tests can run it on its own.
 */

/** iCal text → list of events: uid, summary, date (Y-m-d), time (H:i or ''), location, cancelled. */
function kas_ics_events(string $ics, string $tz = 'Asia/Taipei'): array
{
    $text = preg_replace("/\r?\n[ \t]/", '', str_replace("\r\n", "\n", $ics));
    $events = array();
    if (!preg_match_all('/BEGIN:VEVENT\n(.*?)END:VEVENT/s', $text, $blocks)) {
        return $events;
    }
    foreach ($blocks[1] as $block) {
        $props = array();
        foreach (explode("\n", $block) as $line) {
            if (preg_match('/^([A-Z-]+)((?:;[^:]*)?):(.*)$/', $line, $m) && !isset($props[$m[1]])) {
                $props[$m[1]] = array('params' => $m[2], 'value' => $m[3]);
            }
        }
        if (empty($props['UID']) || empty($props['DTSTART'])) {
            continue;
        }
        $start = kas_ics_date($props['DTSTART']['params'], $props['DTSTART']['value'], $tz);
        if (!$start) {
            continue;
        }
        $recurrence = isset($props['RECURRENCE-ID']) ? '#' . $props['RECURRENCE-ID']['value'] : '';
        $events[] = array(
            'uid' => $props['UID']['value'] . $recurrence,
            'summary' => kas_ics_unescape($props['SUMMARY']['value'] ?? ''),
            'location' => kas_ics_unescape($props['LOCATION']['value'] ?? ''),
            'date' => $start['date'],
            'time' => $start['time'],
            'cancelled' => strtoupper($props['STATUS']['value'] ?? '') === 'CANCELLED',
        );
    }
    return $events;
}

/** DTSTART value → date and time in the school's time zone. */
function kas_ics_date(string $params, string $value, string $tz): ?array
{
    if (preg_match('/^(\d{4})(\d{2})(\d{2})$/', $value, $m)) {
        return array('date' => "$m[1]-$m[2]-$m[3]", 'time' => '');
    }
    if (!preg_match('/^(\d{8}T\d{6})(Z?)$/', $value, $m)) {
        return null;
    }
    $zone = $m[2] === 'Z' ? 'UTC' : (preg_match('/TZID=([^;:]+)/', $params, $z) ? $z[1] : $tz);
    try {
        $d = new DateTimeImmutable($m[1], new DateTimeZone($zone));
    } catch (Exception $e) {
        return null;
    }
    $local = $d->setTimezone(new DateTimeZone($tz));
    return array('date' => $local->format('Y-m-d'), 'time' => $local->format('H:i'));
}

function kas_ics_unescape(string $v): string
{
    return trim(strtr($v, array('\\n' => ' ', '\\N' => ' ', '\\,' => ',', '\\;' => ';', '\\\\' => '\\')));
}

/**
 * What an event name says. Returns:
 *   venue (home|away|''), team_text (the part naming our team), opponent, time (H:i or ''),
 *   note (text in brackets, e.g. "Qualifier #1"), cancelled, postponed.
 */
function kas_parse_game_title(string $summary): array
{
    $s = trim(preg_replace('/\s+/u', ' ', strtr($summary, array('（' => '(', '）' => ')'))));
    $out = array('venue' => '', 'team_text' => '', 'opponent' => '', 'time' => '', 'note' => '', 'cancelled' => false, 'postponed' => false);

    if (preg_match('/^(CXL|cancel+ed)\b\s*[-:]?\s*/i', $s, $m)) {
        $out['cancelled'] = true;
        $s = substr($s, strlen($m[0]));
    }
    if (preg_match('/postpone/i', $s)) {
        $out['postponed'] = true;
    }
    if (preg_match('/^(home|away)\s*game\s*[-:–]?\s*/i', $s, $m)) {
        $out['venue'] = strtolower($m[1]);
        $s = substr($s, strlen($m[0]));
    } elseif (preg_match('/^\((home|away)[^)]*\)\s*/i', $s, $m)) {
        $out['venue'] = strtolower($m[1]);
        if (preg_match('/@\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i', $m[0], $t)) {
            $out['time'] = kas_parse_clock($t[1]);
        }
        $s = substr($s, strlen($m[0]));
    }
    if (preg_match('/\(([^)]*)\)?\s*$/', $s, $m) && !preg_match('/^\s*(kas|home|away)\s*$/i', $m[1])) {
        $out['note'] = trim($m[1], " -");
        $s = trim(substr($s, 0, -strlen($m[0])));
    }
    if (preg_match('/(?:@|\bat)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\b/i', $s, $m) && $out['time'] === '') {
        $out['time'] = kas_parse_clock($m[1]);
    }
    if (preg_match('/@\s*KAS\b|\(KAS\)/i', $summary) && $out['venue'] === '') {
        $out['venue'] = 'home';
    }

    $parts = preg_split('/\s+(?:v\.?\s?s\.?|vs\.?|versus|against|w\/)\s*/i', $s, 2);
    $out['team_text'] = trim($parts[0], " -–:");
    if (isset($parts[1])) {
        $opp = preg_split('/\s*(?:@|\bat\s*\d|\bat\s+(?=[A-Z])|\s-\s|\(|,)/', $parts[1], 2)[0];
        $out['opponent'] = trim($opp, " -–:");
    }
    return $out;
}

/** "4", "4pm", "5:15pm", "3:30PM" → "16:00", "17:15"… School games are in the afternoon unless "am". */
function kas_parse_clock(string $t): string
{
    if (!preg_match('/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i', trim($t), $m)) {
        return '';
    }
    $h = (int) $m[1];
    $min = ($m[2] ?? '') !== '' ? $m[2] : '00';
    $ampm = strtolower($m[3] ?? '');
    if ($ampm === 'pm' && $h < 12) {
        $h += 12;
    } elseif ($ampm === '' && $h >= 1 && $h <= 7) {
        $h += 12;
    }
    return $h > 23 ? '' : sprintf('%02d:%s', $h, $min);
}

/** Sport, gender and level mentioned in a piece of text. */
function kas_team_features(string $text): array
{
    $t = ' ' . strtolower(str_replace(array('/', '-', '_', '(', ')', '·', ','), ' ', $text)) . ' ';
    $sport = '';
    $sports = array(
        'soccer' => '/\b(soccer|football|futsal|fb)\b/', 'basketball' => '/\b(basketball|bb|bball)\b/',
        'volleyball' => '/\b(volleyball|vb|vball)\b/', 'swimming' => '/\b(swim|swimming)\b/',
        'running' => '/\b(cross country|x country|xc|track)\b/', 'tennis' => '/\btennis\b/',
        'badminton' => '/\bbadminton\b/', 'frisbee' => '/\b(frisbee|ultimate)\b/', 'golf' => '/\bgolf\b/',
    );
    foreach ($sports as $kind => $re) {
        if (preg_match($re, $t)) {
            $sport = $kind;
            break;
        }
    }
    $gender = preg_match('/\b(boys?|men)\b/', $t) ? 'boys' : (preg_match('/\b(girls?|women)\b/', $t) ? 'girls' : '');
    $level = '';
    if (preg_match('/\b(middle school|ms|g[5-8]|m[5-8]|grade [5-8])\b/', $t)) {
        $level = 'ms';
    } elseif (preg_match('/\bjv\b|junior varsity/', $t)) {
        $level = 'jv';
    } elseif (preg_match('/\bvarsity\b/', $t)) {
        $level = 'varsity';
    } elseif (preg_match('/\b(hs|high school)\b/', $t)) {
        $level = 'hs';
    } elseif (preg_match('/\bes\b|elementary/', $t)) {
        $level = 'es';
    }
    $league = preg_match('/\b(aisa|tissa)\b/', $t, $m) ? $m[1] : '';
    return compact('sport', 'gender', 'level', 'league');
}

/**
 * Picks the team an event is about.
 * @param array $teams list of ['name', 'level', 'season'] (season = slug like "fall-sports").
 * @return string team name, or '' when unsure.
 */
function kas_match_team(string $team_text, array $teams, string $date): string
{
    $first = preg_split('/\s+(?:and|&)\s+|\s*\/\s*/i', $team_text)[0];
    $ev = kas_team_features($first);
    // "G8 Boys and G7 Boys Soccer": the sport (or gender) may only be named once, at the end.
    $all = kas_team_features($team_text);
    foreach ($ev as $k => $v) {
        $ev[$k] = $v !== '' ? $v : $all[$k];
    }
    if ($ev['sport'] === '') {
        return '';
    }
    $candidates = array();
    foreach ($teams as $team) {
        $tf = kas_team_features($team['name'] . ' ' . $team['level']);
        if ($tf['sport'] !== $ev['sport']) {
            continue;
        }
        if ($ev['gender'] && $tf['gender'] && $ev['gender'] !== $tf['gender']) {
            continue;
        }
        $young = in_array($tf['level'], array('ms', 'es'), true);
        if ($ev['level'] === 'ms' || $ev['level'] === 'es') {
            if (!$young) {
                continue;
            }
        } elseif ($young) {
            continue;
        } elseif (in_array($ev['level'], array('varsity', 'jv'), true) && $tf['level'] !== $ev['level'] && $tf['level'] !== '' && $tf['level'] !== 'hs') {
            continue;
        }
        $candidates[] = $team + array('features' => $tf);
    }
    if (count($candidates) > 1 && $ev['league']) {
        $same = array_values(array_filter($candidates, fn($c) => $c['features']['league'] === $ev['league']));
        $candidates = $same ?: $candidates;
    }
    if (count($candidates) > 1) {
        $season = kas_season_for_month((int) substr($date, 5, 2));
        $same = array_values(array_filter($candidates, fn($c) => str_contains($c['season'], $season)));
        $candidates = $same ?: $candidates;
    }
    if (count($candidates) > 1 && !in_array($ev['level'], array('jv'), true)) {
        $varsity = array_values(array_filter($candidates, fn($c) => $c['features']['level'] === 'varsity'));
        $candidates = $varsity ?: $candidates;
    }
    return count($candidates) === 1 ? $candidates[0]['name'] : '';
}

/** Rough sports season for a month: fall (Aug–Nov), winter (Dec–Feb), spring (Mar–Jun). */
function kas_season_for_month(int $month): string
{
    if ($month >= 8 && $month <= 11) {
        return 'fall';
    }
    return ($month === 12 || $month <= 2) ? 'winter' : 'spring';
}

/** A tidy game title: "Varsity Boys Basketball vs ICA (Qualifier)". */
function kas_game_title(string $team, array $parsed, string $summary): string
{
    $who = $team !== '' ? $team : $parsed['team_text'];
    if ($who === '' || $parsed['opponent'] === '') {
        // Meets and tournaments: the calendar's own words say it best ("AISA Volleyball, X-Country").
        return trim(preg_replace('/^(?:CXL|cancel+ed)?\s*[-:]?\s*(?:home|away)\s*game\s*[-:–]?\s*/i', '', $summary));
    }
    $title = $who . ($parsed['opponent'] !== '' ? ' vs ' . $parsed['opponent'] : '');
    return $title . ($parsed['note'] !== '' ? ' (' . $parsed['note'] . ')' : '');
}
