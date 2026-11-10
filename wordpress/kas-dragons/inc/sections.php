<?php
/**
 * Section renderers, one per section type in blocks.json (ported from src/render/sections.js).
 * Each gets the section's fields ($s) and returns escaped HTML.
 */

if (!defined('ABSPATH')) {
    exit;
}

/** "Small text above" + title + optional intro. */
function kas_sec_head(array $s, string $title_cls = 'section__title'): string
{
    $out = '';
    if (($s['kicker'] ?? '') !== '') {
        $out .= '<span class="kicker">' . esc_html($s['kicker']) . '</span>';
    }
    if (($s['title'] ?? '') !== '') {
        $out .= '<h2 class="' . esc_attr($title_cls) . '">' . esc_html($s['title']) . '</h2>';
    }
    return $out;
}

function kas_sec_button(array $s, string $n = '', string $cls = 'btn btn--primary', bool $arrow = true): string
{
    $label = $s["button{$n}Label"] ?? '';
    if ($label === '') {
        return '';
    }
    $link = ($s["button{$n}Link"] ?? '') !== '' ? $s["button{$n}Link"] : '/events';
    return kas_link($link, '<span>' . esc_html($label) . '</span>' . ($arrow ? ' ' . kas_icon('arrow') : ''), $cls);
}

function kas_sec_hero(array $s): string
{
    $bg = ($s['image'] ?? '') !== ''
        ? kas_photo($s['image'], '', array('cls' => 'hero__bg', 'width' => 1920, 'height' => 1080, 'eager' => true))
        : '<div class="hero__bg hero__bg--pattern" aria-hidden="true"></div>';
    return '<section class="hero" aria-labelledby="hero-title">' . $bg . '<div class="hero__inner">'
        . (($s['eyebrow'] ?? '') !== '' ? '<p class="eyebrow eyebrow--light">' . esc_html($s['eyebrow']) . '</p>' : '')
        . '<h1 id="hero-title" class="hero__title">' . esc_html($s['title'] ?? '') . '</h1>'
        . (($s['subtitle'] ?? '') !== '' ? '<p class="hero__subtitle">' . esc_html($s['subtitle']) . '</p>' : '')
        . '<div class="hero__actions">' . kas_sec_button($s) . kas_sec_button($s, '2', 'btn btn--glass', false) . '</div>'
        . '</div></section>';
}

function kas_sec_hero_split(array $s): string
{
    return '<section class="hero hero--split"><div class="hero__inner">'
        . (($s['eyebrow'] ?? '') !== '' ? '<p class="eyebrow">' . esc_html($s['eyebrow']) . '</p>' : '')
        . '<h1 class="hero__title">' . esc_html($s['title'] ?? '') . '</h1>'
        . (($s['subtitle'] ?? '') !== '' ? '<p class="hero__subtitle">' . esc_html($s['subtitle']) . '</p>' : '')
        . kas_sec_button($s) . '</div>'
        . '<div class="hero__media">' . kas_photo($s['image'] ?? '', '', array('cls' => 'hero__img', 'width' => 900, 'height' => 700)) . '</div></section>';
}

function kas_sec_cta(array $s): string
{
    return '<section class="cta-band"><div class="cta-band__inner">'
        . '<h2 class="cta-band__title">' . esc_html($s['title'] ?? '') . '</h2>'
        . (($s['text'] ?? '') !== '' ? '<p class="cta-band__text">' . esc_html($s['text']) . '</p>' : '')
        . '<div class="cta-band__actions">' . kas_sec_button($s) . '</div></div></section>';
}

function kas_sec_text_image(array $s): string
{
    $left = ($s['imageSide'] ?? '') === 'left';
    $img = kas_photo($s['image'] ?? '', '', array('cls' => 'text-image__img', 'width' => 900, 'height' => 700));
    $body = '<div class="text-image__body">' . kas_sec_head($s, 'text-image__title')
        . '<div class="prose">' . kas_paragraphs($s['body'] ?? '') . '</div>' . kas_sec_button($s) . '</div>';
    return '<section class="text-image' . ($left ? ' text-image--flip' : '') . '">' . ($left ? $img . $body : $body . $img) . '</section>';
}

function kas_sec_marquee(array $s): string
{
    $words = array_values(array_filter(array_map('trim', explode("\n", $s['words'] ?? ''))));
    $line = function (array $list): string {
        $out = '';
        foreach (array_merge($list, $list, $list) as $w) {
            $out .= '<span>' . esc_html($w) . '</span><span class="marquee__star">✦</span>';
        }
        return $out;
    };
    return '<div class="marquee" aria-hidden="true"><div class="marquee__row marquee__row--solid">' . $line($words)
        . '</div><div class="marquee__row marquee__row--outline">' . $line(array_reverse($words)) . '</div></div>';
}

function kas_sec_items(array $s): array
{
    return is_array($s['items'] ?? null) ? $s['items'] : array();
}

function kas_sec_gallery(array $s): string
{
    $items = kas_sec_items($s);
    $out = '<section class="section">' . (($s['title'] ?? '') !== '' ? '<h2 class="section__title">' . esc_html($s['title']) . '</h2>' : '') . '<ul class="gallery">';
    foreach ($items as $it) {
        $caption = (string) ($it['caption'] ?? '');
        $out .= '<li class="gallery__item">' . kas_photo((string) ($it['image'] ?? ''), $caption, array('cls' => 'gallery__img', 'width' => 600, 'height' => 600))
            . ($caption !== '' ? '<p class="gallery__caption">' . esc_html($caption) . '</p>' : '') . '</li>';
    }
    return $out . '</ul>' . ($items ? '' : '<p class="muted">No photos yet.</p>') . '</section>';
}

function kas_sec_cards(array $s): string
{
    $out = '<section class="section">' . (($s['title'] ?? '') !== '' ? '<h2 class="section__title">' . esc_html($s['title']) . '</h2>' : '')
        . (($s['intro'] ?? '') !== '' ? '<p class="section__intro">' . esc_html($s['intro']) . '</p>' : '') . '<ul class="card-grid">';
    foreach (kas_sec_items($s) as $it) {
        $out .= '<li class="card">' . kas_photo((string) ($it['image'] ?? ''), (string) ($it['title'] ?? ''), array('cls' => 'card__img', 'width' => 600, 'height' => 400))
            . '<div class="card__body"><h3 class="card__title">' . esc_html($it['title'] ?? '') . '</h3>'
            . '<p class="card__text">' . esc_html($it['text'] ?? '') . '</p>'
            . (($it['link'] ?? '') !== '' ? kas_link((string) $it['link'], 'Read more ' . kas_icon('arrow'), 'text-link') : '')
            . '</div></li>';
    }
    return $out . '</ul></section>';
}

function kas_sec_games(array $s, bool $results): string
{
    $n = (int) ($s['count'] ?? 4) ?: 4;
    $list = array_slice($results ? kas_past_events() : kas_upcoming_events(), 0, $n);
    $extra = kas_link('/events/', 'All games ' . kas_icon('arrow'), 'text-link');
    return '<section class="section"><div class="section__head">' . kas_sec_head($s) . $extra . '</div>'
        . ($list ? kas_event_list($list, $results) : kas_empty($results ? 'No results yet.' : 'No upcoming games yet — check back soon.'))
        . '</section>';
}

function kas_sec_quote(array $s): string
{
    $name = (string) ($s['name'] ?? '');
    return '<section class="director"><figure class="director__figure">'
        . kas_photo((string) ($s['photo'] ?? ''), $name, array('cls' => 'director__photo', 'width' => 600, 'height' => 750))
        . '<figcaption><strong>' . esc_html($name) . '</strong><span>' . esc_html($s['role'] ?? '') . '</span></figcaption></figure>'
        . '<div class="director__body">' . kas_sec_head($s, 'director__title')
        . '<blockquote class="director__quote">' . kas_paragraphs((string) ($s['text'] ?? '')) . '</blockquote></div></section>';
}

function kas_sec_coaches(array $s): string
{
    $coaches = kas_coaches();
    $out = '<section class="section" aria-label="Coaching staff">' . (($s['title'] ?? '') !== '' ? '<h2 class="section__title">' . esc_html($s['title']) . '</h2>' : '');
    if (!$coaches) {
        return $out . kas_empty('Coach profiles are coming soon.') . '</section>';
    }
    $out .= '<ul class="coach-grid">';
    foreach ($coaches as $c) {
        $out .= '<li class="coach-card">' . kas_photo($c['photo'], $c['name'], array('cls' => 'coach-card__photo', 'width' => 480, 'height' => 600, 'fallback' => kas_initials($c['name'])))
            . '<div class="coach-card__body"><p class="coach-card__sport">' . esc_html($c['sport']) . '</p>'
            . '<h2 class="coach-card__name">' . esc_html($c['name']) . '</h2><p class="coach-card__role">' . esc_html($c['role']) . '</p>'
            . ($c['bio'] !== '' ? '<div class="coach-card__bio">' . kas_paragraphs($c['bio']) . '</div>' : '')
            . (is_email($c['email']) ? '<a class="text-link" href="' . esc_url('mailto:' . $c['email']) . '">' . kas_icon('mail') . ' Email</a>' : '')
            . '</div></li>';
    }
    return $out . '</ul></section>';
}

function kas_sec_contact(array $s): string
{
    $site = kas_site();
    $out = '<section class="section contact" aria-label="Contact details">' . (($s['title'] ?? '') !== '' ? '<h2 class="section__title">' . esc_html($s['title']) . '</h2>' : '') . '<div class="contact__main">';
    if ($site['phone'] !== '') {
        $out .= '<a class="contact__big" href="' . esc_url('tel:' . kas_tel($site['phone'])) . '">' . kas_icon('phone') . '<span>' . esc_html($site['phone']) . '</span></a>';
    }
    if (is_email($site['email'])) {
        $out .= '<a class="contact__big" href="' . esc_url('mailto:' . $site['email']) . '">' . kas_icon('mail') . '<span>' . esc_html($site['email']) . '</span></a>';
    }
    if ($site['address'] !== '') {
        $out .= '<p class="contact__address">' . kas_icon('pin') . '<span class="pre">' . esc_html($site['address']) . '</span></p>';
    }
    $out .= '</div><ul class="people-list">';
    foreach (kas_contact_people() as $p) {
        $out .= '<li><strong>' . esc_html($p['name']) . '</strong><span>' . esc_html($p['role']) . '</span>'
            . (is_email($p['email']) ? '<a href="' . esc_url('mailto:' . $p['email']) . '">' . esc_html($p['email']) . '</a>' : '')
            . ($p['phone'] !== '' ? '<a href="' . esc_url('tel:' . kas_tel($p['phone'])) . '">' . esc_html($p['phone']) . '</a>' : '')
            . '</li>';
    }
    return $out . '</ul></section>';
}

function kas_social_card(): string
{
    $site = kas_site();
    return '<aside class="social-card" aria-labelledby="social-title"><span class="social-card__icon" aria-hidden="true">' . kas_icon('instagram') . '</span>'
        . '<h2 id="social-title" class="social-card__title">Follow the Dragons</h2>'
        . '<p>Game-day photos, highlights and announcements from the Athletic Council.</p>'
        . ($site['instagramUrl'] !== '' ? kas_link($site['instagramUrl'], esc_html($site['instagramHandle'] ?: 'Instagram') . ' ' . kas_icon('arrow'), 'btn btn--primary') : '')
        . ($site['youtubeUrl'] !== '' ? kas_link($site['youtubeUrl'], kas_icon('play') . ' Live games on YouTube', 'text-link') : '')
        . '</aside>';
}

function kas_sec_video(array $s): string
{
    $title = (string) ($s['title'] ?? '');
    $video = kas_video_facade((string) ($s['url'] ?? ''), $title);
    if ($video === '' && ($s['poster'] ?? '') !== '') {
        $video = kas_photo((string) $s['poster'], $title, array('cls' => 'media__poster', 'width' => 900, 'height' => 540));
    }
    return '<section class="section media"><div class="media__video">'
        . '<h2 class="section__title">' . (($s['kicker'] ?? '') !== '' ? '<span class="kicker">' . esc_html($s['kicker']) . '</span>' : '') . esc_html($title) . '</h2>'
        . $video
        . (($s['caption'] ?? '') !== '' ? '<p class="media__caption">' . esc_html($s['caption']) . '</p>' : '')
        . '</div>' . (!empty($s['withSocial']) ? kas_social_card() : '') . '</section>';
}

function kas_sec_social(array $s): string
{
    $site = kas_site();
    return '<section class="section"><h2 class="section__title">' . esc_html($s['title'] ?? '') . '</h2>'
        . '<p class="section__intro">' . esc_html($s['text'] ?? '') . '</p><div class="social">'
        . ($site['instagramUrl'] !== '' ? kas_link($site['instagramUrl'], kas_icon('instagram') . ' ' . esc_html($site['instagramHandle'] ?: 'Instagram'), 'btn btn--ghost') : '')
        . ($site['youtubeUrl'] !== '' ? kas_link($site['youtubeUrl'], kas_icon('youtube') . ' YouTube', 'btn btn--ghost') : '')
        . '</div></section>';
}

function kas_sec_calendar(array $s): string
{
    $url = (string) ($s['url'] ?? '');
    $ok = (bool) preg_match('~^https://calendar\.google\.com/calendar/~', $url);
    return '<section class="section"><div class="section__head">' . kas_sec_head($s) . '</div>'
        . ($ok ? '<div class="calendar-frame"><iframe src="' . esc_url($url) . '" title="' . esc_attr($s['title'] ?? 'Calendar') . '" loading="lazy"></iframe></div>'
            : '<p class="muted">Add a Google Calendar embed link in this section’s settings.</p>')
        . '</section>';
}

/** Renders one section, wrapped with its background / spacing / alignment classes. */
function kas_render_section(string $type, array $s): string
{
    $simple = array(
        'pageHeader' => fn() => kas_page_hero((string) ($s['eyebrow'] ?? ''), (string) ($s['title'] ?? ''), (string) ($s['intro'] ?? ''), (string) ($s['image'] ?? '')),
        'heading' => fn() => '<section class="section"><div class="section__head">' . kas_sec_head($s)
            . (($s['intro'] ?? '') !== '' ? '<p class="section__intro">' . esc_html($s['intro']) . '</p>' : '') . '</div></section>',
        'text' => fn() => '<section class="section">' . (($s['title'] ?? '') !== '' ? '<h2 class="section__title">' . esc_html($s['title']) . '</h2>' : '')
            . '<div class="prose">' . kas_paragraphs((string) ($s['body'] ?? '')) . '</div></section>',
        'statement' => fn() => '<section class="mission"><div class="mission__inner"><h2 class="mission__title">' . esc_html(($s['title'] ?? '') ?: 'Our mission') . '</h2>'
            . '<div class="mission__body">' . kas_paragraphs((string) ($s['body'] ?? '')) . '</div></div></section>',
        'stats' => function () use ($s): string {
            $out = '<section class="section"><ul class="stat-strip">';
            foreach (kas_sec_items($s) as $it) {
                $out .= '<li><strong data-count>' . esc_html($it['value'] ?? '') . '</strong><span>' . esc_html($it['label'] ?? '') . '</span></li>';
            }
            return $out . '</ul></section>';
        },
        'divider' => fn() => !empty($s['line']) ? '<hr class="blk-divider">' : '<div class="blk-spacer" aria-hidden="true"></div>',
        'seasonTiles' => fn() => '<section class="section"><div class="section__head">' . kas_sec_head($s) . '</div>' . kas_season_tiles(kas_seasons()) . '</section>',
        'upcomingGames' => fn() => kas_sec_games($s, false),
        'results' => fn() => kas_sec_games($s, true),
    );
    $named = array(
        'hero' => 'kas_sec_hero', 'heroSplit' => 'kas_sec_hero_split', 'cta' => 'kas_sec_cta', 'textImage' => 'kas_sec_text_image',
        'marquee' => 'kas_sec_marquee', 'gallery' => 'kas_sec_gallery', 'cards' => 'kas_sec_cards', 'quote' => 'kas_sec_quote',
        'coaches' => 'kas_sec_coaches', 'contact' => 'kas_sec_contact', 'video' => 'kas_sec_video', 'social' => 'kas_sec_social',
        'calendar' => 'kas_sec_calendar',
    );
    if (isset($simple[$type])) {
        $inner = $simple[$type]();
    } elseif (isset($named[$type])) {
        $inner = call_user_func($named[$type], $s);
    } else {
        return '';
    }
    $pick = fn($key, $allowed, $default) => in_array($s[$key] ?? '', $allowed, true) ? $s[$key] : $default;
    $cls = sprintf(
        'blk blk--%s bg--%s space--%s align--%s',
        $type,
        $pick('bg', array('default', 'alt', 'dark', 'brand', 'navy'), 'default'),
        $pick('space', array('compact', 'normal', 'roomy'), 'normal'),
        $pick('align', array('left', 'center'), 'left')
    );
    return '<section class="' . esc_attr($cls) . '">' . $inner . '</section>';
}
