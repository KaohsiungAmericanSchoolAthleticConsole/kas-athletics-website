<?php
/**
 * Turns a player row from the Google Sheet into a roster line ("Adam Chu ’26 | Captain | 7").
 * Plain PHP only (no WordPress calls), so tests can run it on its own.
 */

const KAS_ROSTER_MAX_PLAYERS = 80;
const KAS_ROSTER_MAX_FIELD = 80;

/** @param array $p name, year (2026 / '26 / 26), role, number */
function kas_roster_line(array $p): string
{
    $clean = function ($v): string {
        $v = is_scalar($v) ? (string) $v : '';
        $v = trim(preg_replace('/\s+/u', ' ', str_replace('|', ' ', strip_tags($v))));
        return mb_substr($v, 0, KAS_ROSTER_MAX_FIELD);
    };
    $name = $clean($p['name'] ?? '');
    if ($name === '') {
        return '';
    }
    $year = preg_match('/(\d{2})\s*$/', $clean($p['year'] ?? ''), $m) ? ' ’' . $m[1] : '';
    $role = $clean($p['role'] ?? '');
    $number = $clean($p['number'] ?? '');
    return $name . $year . ($role !== '' || $number !== '' ? " | $role | $number" : '');
}
