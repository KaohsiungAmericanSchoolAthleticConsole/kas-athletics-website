<?php
/**
 * Small shared helpers: escaping-safe markup pieces, dates and settings.
 * Every function returns a string of HTML in which all content is escaped.
 */

if (!defined('ABSPATH')) {
    exit;
}

const KAS_TIME_ZONE = 'Asia/Taipei';

/** One site setting (Dashboard → KAS Athletics → Site settings), with a fallback. */
function kas_setting(string $key, string $fallback = ''): string
{
    $all = get_option('kas_settings', array());
    $value = is_array($all) && isset($all[$key]) ? (string) $all[$key] : '';
    return $value !== '' ? $value : $fallback;
}

/** "Label | value" lines from a settings textarea → list of arrays. */
function kas_setting_lines(string $key, array $names): array
{
    $rows = array();
    foreach (preg_split('/\r?\n/', kas_setting($key)) as $line) {
        if (trim($line) === '') {
            continue;
        }
        $parts = array_map('trim', explode('|', $line));
        $row = array();
        foreach ($names as $i => $name) {
            $row[$name] = $parts[$i] ?? '';
        }
        $rows[] = $row;
    }
    return $rows;
}

/** A site path like "/events" → full URL on this WordPress site. Other links are passed through. */
function kas_url(string $url): string
{
    $url = trim($url);
    if ($url === '') {
        return '';
    }
    if (str_starts_with($url, '/') && !str_starts_with($url, '//')) {
        return home_url($url);
    }
    return $url;
}

function kas_is_external(string $url): bool
{
    $host = wp_parse_url(kas_url($url), PHP_URL_HOST);
    return $host && $host !== wp_parse_url(home_url(), PHP_URL_HOST);
}

/** Inline SVG icon from the theme's sprite. */
function kas_icon(string $name): string
{
    $href = get_template_directory_uri() . '/assets/img/icons.svg#' . $name;
    return '<svg class="icon" aria-hidden="true" focusable="false"><use href="' . esc_url($href) . '"/></svg>';
}

/** A link. $label_html must already be escaped. */
function kas_link(string $url, string $label_html, string $cls = ''): string
{
    $ext = kas_is_external($url);
    return '<a class="' . esc_attr($cls) . '" href="' . esc_url(kas_url($url)) . '"'
        . ($ext ? ' target="_blank" rel="noopener noreferrer"' : '') . '>'
        . $label_html
        . ($ext ? '<span class="visually-hidden"> (opens in a new tab)</span>' : '')
        . '</a>';
}

/** Plain text with blank lines → paragraphs. */
function kas_paragraphs(string $text): string
{
    $out = '';
    foreach (preg_split('/\n\s*\n/', trim($text)) as $para) {
        if (trim($para) !== '') {
            $out .= '<p>' . nl2br(esc_html(trim($para))) . '</p>';
        }
    }
    return $out;
}

function kas_initials(string $name): string
{
    $words = array_slice(array_values(array_filter(preg_split('/\s+/', $name))), 0, 2);
    $letters = implode('', array_map(fn($w) => mb_strtoupper(mb_substr($w, 0, 1)), $words));
    return $letters !== '' ? $letters : 'KAS';
}

/** A photo, or a tidy placeholder when there is none. */
function kas_photo(string $src, string $alt, array $o = array()): string
{
    $o = array_merge(array('cls' => '', 'width' => 800, 'height' => 600, 'eager' => false, 'fallback' => ''), $o);
    if ($src === '') {
        $label = $o['fallback'] !== '' ? $o['fallback'] : ($alt !== '' ? kas_initials($alt) : '');
        $aria = $alt !== '' ? ' role="img" aria-label="' . esc_attr($alt) . '"' : ' aria-hidden="true"';
        return '<div class="photo-fallback ' . esc_attr($o['cls']) . '"' . $aria . '><span>' . esc_html($label) . '</span></div>';
    }
    return '<img class="' . esc_attr($o['cls']) . '" src="' . esc_url(kas_url($src)) . '" alt="' . esc_attr($alt) . '" width="'
        . (int) $o['width'] . '" height="' . (int) $o['height'] . '" '
        . ($o['eager'] ? 'fetchpriority="high"' : 'loading="lazy"') . ' decoding="async">';
}

/** Attachment ID → full-size URL ('' when missing). */
function kas_image_url($id): string
{
    $id = (int) $id;
    if (!$id) {
        return '';
    }
    $url = wp_get_attachment_image_url($id, 'full');
    return $url ? $url : '';
}

/** YouTube video ID from a watch / share / embed link. */
function kas_youtube_id(string $url): string
{
    if (preg_match('~(?:youtube\.com/(?:watch\?(?:.*&)?v=|embed/|shorts/|live/)|youtu\.be/)([\w-]{11})~', $url, $m)) {
        return $m[1];
    }
    return '';
}

/* ---------- Dates (stored as YYYY-MM-DD, school time zone) ---------- */

function kas_today(): string
{
    return (new DateTimeImmutable('now', new DateTimeZone(KAS_TIME_ZONE)))->format('Y-m-d');
}

function kas_date_parts(string $date): ?array
{
    $d = DateTimeImmutable::createFromFormat('!Y-m-d', $date, new DateTimeZone('UTC'));
    if (!$d) {
        return null;
    }
    return array('weekday' => $d->format('D'), 'month' => $d->format('M'), 'day' => $d->format('j'), 'year' => $d->format('Y'));
}

function kas_format_date(string $date): string
{
    $p = kas_date_parts($date);
    return $p ? "{$p['weekday']}, {$p['month']} {$p['day']}" : '';
}

function kas_format_time(string $time): string
{
    if (!preg_match('/^(\d{1,2}):(\d{2})/', $time, $m)) {
        return '';
    }
    $h = (int) $m[1];
    return (($h + 11) % 12 + 1) . ':' . $m[2] . ($h >= 12 ? ' PM' : ' AM');
}

function kas_venue_label(string $venue): string
{
    return array('home' => 'Home', 'away' => 'Away', 'neutral' => 'Neutral')[$venue] ?? '';
}

/** A telephone number without spaces, for tel: links. */
function kas_tel(string $phone): string
{
    return preg_replace('/[^\d+]/', '', $phone);
}
