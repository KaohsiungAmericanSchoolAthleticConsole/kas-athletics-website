<?php
/**
 * Tests for the WordPress theme's plain-PHP parts (no WordPress needed).
 *
 *   php wordpress/tests/run.php
 *
 * Uses Local's PHP if you have no other: see wordpress/README.md.
 */

declare(strict_types=1);

require __DIR__ . '/../kas-dragons/inc/calendar-parse.php';
require __DIR__ . '/../kas-dragons/inc/roster-parse.php';

$failures = 0;
$count = 0;

function check(string $name, $actual, $expected): void
{
    global $failures, $count;
    $count++;
    if ($actual !== $expected) {
        $failures++;
        echo "FAIL $name\n  expected: " . var_export($expected, true) . "\n  actual:   " . var_export($actual, true) . "\n";
    }
}

/* ---------- Event names ---------- */

$p = kas_parse_game_title('Home Game - Varsity Boys BB v.s ICA @5:15pm ');
check('home venue', $p['venue'], 'home');
check('team text', $p['team_text'], 'Varsity Boys BB');
check('opponent', $p['opponent'], 'ICA');
check('time from @', $p['time'], '17:15');

$p = kas_parse_game_title('Away Game - Varsity Girls VB v.s MAK @ 4pm (Qualifier #1)');
check('away venue', $p['venue'], 'away');
check('note in brackets', $p['note'], 'Qualifier #1');
check('time 4pm', $p['time'], '16:00');
check('opponent before @', $p['opponent'], 'MAK');

$p = kas_parse_game_title('CXL - Varsity BB v.s Siaogang Senior High School @ KAS - 4:30pm');
check('cancelled', $p['cancelled'], true);
check('home from @ KAS', $p['venue'], 'home');
check('long opponent', $p['opponent'], 'Siaogang Senior High School');

$p = kas_parse_game_title('Away Game - Varsity Boys Soccer v.s MAK @ 4pm （Qualifier）');
check('full-width brackets', $p['note'], 'Qualifier');

$p = kas_parse_game_title('Away Game - Varsity Boys Basketball v.s ICA at4pm (Qualifier）');
check('"at4pm"', $p['time'], '16:00');
check('opponent before at4pm', $p['opponent'], 'ICA');

$p = kas_parse_game_title('(Home@3:30pm)HS Boys VB w/Fu-Cheng MS');
check('bracket venue', $p['venue'], 'home');
check('bracket time', $p['time'], '15:30');
check('w/ opponent', $p['opponent'], 'Fu-Cheng MS');

$p = kas_parse_game_title('Home Game - JV Boys Basketball vs ICA at 4pm (Indoor gym)- Friendly');
check('opponent with trailing note', $p['opponent'], 'ICA');

$p = kas_parse_game_title('AISA Volleyball, X-Country');
check('event without opponent', $p['opponent'], '');
check('clock 4:15 means afternoon', kas_parse_clock('4:15'), '16:15');
check('clock 10am', kas_parse_clock('10am'), '10:00');

/* ---------- Matching to teams ---------- */

$teams = array();
$content = json_decode((string) file_get_contents(__DIR__ . '/../../data/content.json'), true);
foreach ($content['seasons'] as $season) {
    foreach ($season['teams'] as $t) {
        $teams[] = array('name' => $t['name'], 'level' => $t['level'], 'season' => $season['slug']);
    }
}
check('BB → basketball', kas_match_team('Varsity Boys BB', $teams, '2025-12-03'), 'Varsity Boys Basketball');
check('JV girls VB', kas_match_team('JV Girls VB', $teams, '2025-09-26'), 'JV Girls Volleyball');
check('soccer in fall = TISSA', kas_match_team('Varsity Boys Soccer', $teams, '2025-09-24'), 'Varsity Boys Soccer (TISSA)');
check('soccer in spring = AISA', kas_match_team('Varsity Boys Soccer', $teams, '2026-03-10'), 'Varsity Boys Soccer (AISA)');
check('G8 → middle school', kas_match_team('MS G8 Boys Soccer', $teams, '2025-10-16'), 'Middle School Soccer');
check('two teams: first wins', kas_match_team('Varsity Boys Soccer/ JV Girls Volleyball', $teams, '2025-09-19'), 'Varsity Boys Soccer (TISSA)');
check('sport named once at the end', kas_match_team('MS G7 and G8 Girls Volleyball', $teams, '2025-10-01'), 'Middle School Volleyball');
check('FB = football', kas_match_team('Varsity Boys FB', $teams, '2025-09-19'), 'Varsity Boys Soccer (TISSA)');
check('unknown sport', kas_match_team('Spirit Week', $teams, '2025-09-19'), '');

check('tidy title', kas_game_title('Varsity Boys Basketball', kas_parse_game_title('Home Game - Varsity Boys BB v.s ICA @5:15pm (Qualifier)'), ''),
    'Varsity Boys Basketball vs ICA (Qualifier)');

check('meet keeps calendar wording', kas_game_title('Varsity Swimming', kas_parse_game_title('Away Game - Varsity Swimming (Friendly)'), 'Away Game - Varsity Swimming (Friendly)'),
    'Varsity Swimming (Friendly)');
check('tournament title', kas_game_title('', kas_parse_game_title('AISA Volleyball, X-Country'), 'AISA Volleyball, X-Country'), 'AISA Volleyball, X-Country');

/* ---------- iCal ---------- */

$ics = "BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20251203\r\nUID:abc@google.com\r\nSUMMARY:Home Game - Varsity Girls Basketball vs MAK at 4pm\r\nLOCATION:KAS\\, Gym\r\nSTATUS:CONFIRMED\r\nEND:VEVENT\r\n"
    . "BEGIN:VEVENT\r\nDTSTART:20251208T080000Z\r\nUID:def@google.com\r\nSUMMARY:Long title that is\r\n  folded\r\nSTATUS:CANCELLED\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n";
$events = kas_ics_events($ics);
check('two events', count($events), 2);
check('all-day date', $events[0]['date'], '2025-12-03');
check('unescaped location', $events[0]['location'], 'KAS, Gym');
check('UTC → Taipei time', $events[1]['time'], '16:00');
check('folded line', $events[1]['summary'], 'Long title that is folded');
check('cancelled status', $events[1]['cancelled'], true);

/* ---------- Rosters from the Google Sheet ---------- */

check('roster line', kas_roster_line(array('name' => 'Adam Chu', 'year' => '2026', 'role' => 'Captain', 'number' => '7')), 'Adam Chu ’26 | Captain | 7');
check('roster line, year only', kas_roster_line(array('name' => 'Duncan', 'year' => "'25")), 'Duncan ’25');
check('roster line, no name', kas_roster_line(array('name' => '  ')), '');
check('roster line strips pipes', kas_roster_line(array('name' => 'A | B')), 'A B');

echo $failures ? "\n$failures of $count checks failed.\n" : "All $count checks passed.\n";
exit($failures ? 1 : 0);
