<?php
/**
 * Header, menu and footer pieces (ported from src/render/layout.js).
 */

if (!defined('ABSPATH')) {
    exit;
}

const KAS_THEMES = array(
    'auto' => array('Auto', 'Match device'),
    'light' => array('Light', 'Paper white'),
    'dark' => array('Dark', 'Night game'),
    'dragon' => array('Dragon', 'School colors'),
    'contrast' => array('High contrast', 'Easiest to read'),
);

/** Festive effects for today ('' = none). */
function kas_seasonal(): string
{
    $choice = kas_site()['seasonal'];
    if ($choice === 'off') {
        return '';
    }
    if ($choice !== 'auto') {
        return in_array($choice, array('winter', 'halloween', 'spring', 'newyear', 'dragon'), true) ? $choice : '';
    }
    $now = new DateTimeImmutable('now', new DateTimeZone(KAS_TIME_ZONE));
    $m = (int) $now->format('n');
    $d = (int) $now->format('j');
    if (($m === 12 && $d >= 30) || ($m === 1 && $d <= 2)) {
        return 'newyear';
    }
    if (($m === 12) || ($m === 1 && $d <= 7)) {
        return 'winter';
    }
    if ($m === 10) {
        return 'halloween';
    }
    if ($m === 3 || $m === 4 || ($m === 5 && $d <= 5)) {
        return 'spring';
    }
    return '';
}

function kas_seasonal_label(string $id): string
{
    return array('winter' => 'Winter / Christmas', 'halloween' => 'Halloween', 'spring' => 'Spring', 'newyear' => 'New Year', 'dragon' => 'Dragon spirit')[$id] ?? 'None';
}

function kas_ticker(): string
{
    $next = kas_upcoming_events()[0] ?? null;
    if (!$next) {
        return '';
    }
    $when = implode(' · ', array_filter(array(kas_format_date($next['date']), kas_format_time($next['time']))));
    return '<a class="ticker" href="' . esc_url(kas_scores_url()) . '"><span class="ticker__label"><span class="ticker__pulse" aria-hidden="true"></span>Next up</span>'
        . '<span class="ticker__title">' . esc_html($next['title']) . '</span>'
        . '<span class="ticker__meta">' . esc_html(implode(' — ', array_filter(array($next['sport'], $when)))) . '</span>'
        . '<span class="ticker__cta" aria-hidden="true">' . kas_icon('arrow') . '</span></a>';
}

function kas_scores_url(): string
{
    $page = get_page_by_path('scores');
    return $page ? get_permalink($page) : home_url('/scores/');
}

function kas_theme_menu(string $seasonal): string
{
    $out = '<div class="theme-switch" data-theme-switch><button class="icon-btn" type="button" aria-expanded="false" aria-controls="theme-menu" data-theme-toggle>'
        . kas_icon('palette') . '<span class="visually-hidden">Change theme</span></button>'
        . '<div class="theme-menu" id="theme-menu" role="group" aria-label="Appearance" hidden><div class="theme-menu__group" role="radiogroup" aria-label="Theme">';
    foreach (KAS_THEMES as $id => [$label, $hint]) {
        $out .= '<button type="button" role="radio" aria-checked="false" aria-label="' . esc_attr("$label theme: $hint") . '" class="theme-menu__item" data-theme-choice="' . esc_attr($id) . '">'
            . '<span class="swatch swatch--' . esc_attr($id) . '" aria-hidden="true"></span><span><strong>' . esc_html($label) . '</strong><small>' . esc_html($hint) . '</small></span></button>';
    }
    $out .= '</div>';
    if ($seasonal !== '') {
        $label = kas_seasonal_label($seasonal);
        $out .= '<button type="button" role="switch" aria-checked="true" class="theme-menu__item theme-menu__item--switch" data-fx-toggle data-fx-label="' . esc_attr($label) . '">'
            . '<span class="swatch swatch--' . esc_attr($seasonal) . '" aria-hidden="true"></span><span><strong>Festive effects</strong><small data-fx-hint>' . esc_html($label) . ' · turn off</small></span></button>';
    }
    return $out . '</div></div>';
}

/**
 * Menu items: the "Main menu" from Appearance → Menus when one is set,
 * otherwise Home, Sports (every season), Scores, Schedule and the other pages.
 */
function kas_nav_items(): array
{
    $locations = get_nav_menu_locations();
    if (!empty($locations['main'])) {
        $items = wp_get_nav_menu_items($locations['main']) ?: array();
        $tree = array();
        foreach ($items as $it) {
            if (!$it->menu_item_parent) {
                $tree[$it->ID] = array('href' => $it->url, 'label' => $it->title, 'children' => array());
            }
        }
        foreach ($items as $it) {
            if ($it->menu_item_parent && isset($tree[$it->menu_item_parent])) {
                $tree[$it->menu_item_parent]['children'][] = array('href' => $it->url, 'label' => $it->title);
            }
        }
        return array_values($tree);
    }
    $seasons = array_map(fn($s) => array('href' => $s['url'], 'label' => $s['title']), kas_seasons());
    $items = array(array('href' => home_url('/'), 'label' => 'Home', 'children' => array()));
    if ($seasons) {
        $items[] = array('href' => '', 'label' => 'Sports', 'children' => $seasons);
    }
    $items[] = array('href' => kas_scores_url(), 'label' => 'Scores', 'children' => array());
    $items[] = array('href' => get_post_type_archive_link('kas_event'), 'label' => 'Schedule', 'children' => array());
    $front = (int) get_option('page_on_front');
    foreach (get_pages(array('sort_column' => 'menu_order,post_title', 'parent' => 0)) as $p) {
        if ($p->ID !== $front && $p->post_name !== 'scores') {
            $items[] = array('href' => get_permalink($p), 'label' => get_the_title($p), 'children' => array());
        }
    }
    return $items;
}

function kas_current_url(): string
{
    global $wp;
    return trailingslashit(home_url($wp->request ?? ''));
}

function kas_nav(): string
{
    $here = kas_current_url();
    $is = fn($href) => $href !== '' && trailingslashit($href) === $here;
    $out = '';
    foreach (kas_nav_items() as $n) {
        if ($n['children']) {
            $active = (bool) array_filter($n['children'], fn($c) => $is($c['href']));
            $out .= '<li class="nav-group"><details class="nav-group__box"><summary class="nav-group__summary' . ($active ? ' is-current' : '') . '">'
                . '<span>' . esc_html($n['label']) . '</span><span class="nav-group__caret" aria-hidden="true">' . kas_icon('down') . '</span></summary><ul class="nav-group__menu">';
            foreach ($n['children'] as $c) {
                $out .= '<li><a href="' . esc_url($c['href']) . '"' . ($is($c['href']) ? ' aria-current="page"' : '') . '>' . esc_html($c['label']) . '</a></li>';
            }
            $out .= '</ul></details></li>';
        } else {
            $out .= '<li><a href="' . esc_url($n['href']) . '"' . ($is($n['href']) ? ' aria-current="page"' : '') . '>' . esc_html($n['label']) . '</a></li>';
        }
    }
    return $out;
}

function kas_header(): string
{
    $site = kas_site();
    return '<header class="site-header"><div class="scroll-progress" aria-hidden="true"></div>' . kas_ticker()
        . '<div class="masthead"><a class="brand" href="' . esc_url(home_url('/')) . '">'
        . '<img class="brand__logo" src="' . esc_url($site['logo']) . '" alt="" width="48" height="48">'
        . '<span class="brand__text"><span class="brand__name">' . esc_html($site['name']) . '</span><span class="brand__tagline">' . esc_html($site['tagline']) . '</span></span></a>'
        . '<nav class="main-nav" aria-label="Main" id="main-nav" data-nav><ul>' . kas_nav() . '</ul></nav>'
        . '<div class="masthead__tools">' . kas_theme_menu(kas_seasonal())
        . '<button class="icon-btn nav-toggle" type="button" aria-expanded="false" aria-controls="main-nav" data-nav-toggle>' . kas_icon('menu')
        . '<span class="visually-hidden" data-nav-label>Menu</span></button></div></div></header>';
}

function kas_footer(): string
{
    $site = kas_site();
    $links = '';
    foreach (kas_footer_links() as $l) {
        if ($l['url'] !== '') {
            $links .= '<li>' . kas_link($l['url'], esc_html($l['label'])) . '</li>';
        }
    }
    $contact = ($site['schoolName'] !== '' ? '<li>' . esc_html($site['schoolName']) . '</li>' : '')
        . ($site['address'] !== '' ? '<li class="pre">' . esc_html($site['address']) . '</li>' : '')
        . ($site['phone'] !== '' ? '<li><a href="' . esc_url('tel:' . kas_tel($site['phone'])) . '">' . esc_html($site['phone']) . '</a></li>' : '')
        . (is_email($site['email']) ? '<li><a href="' . esc_url('mailto:' . $site['email']) . '">' . esc_html($site['email']) . '</a></li>' : '');
    $social = ($site['instagramUrl'] !== '' ? kas_link($site['instagramUrl'], kas_icon('instagram') . ' Instagram', 'chip') : '')
        . ($site['youtubeUrl'] !== '' ? kas_link($site['youtubeUrl'], kas_icon('play') . ' Watch games', 'chip') : '');
    return '<footer class="site-footer"><div class="site-footer__inner">'
        . '<section class="footer-brand" aria-label="About"><img src="' . esc_url($site['logo']) . '" alt="" width="64" height="64" loading="lazy">'
        . '<p class="footer-brand__name">' . esc_html($site['name']) . '</p><p class="footer-brand__tag">' . esc_html($site['tagline']) . '</p></section>'
        . '<section aria-labelledby="footer-links"><h2 id="footer-links" class="footer-heading">Useful links</h2><ul class="footer-list">' . $links . '</ul></section>'
        . '<section aria-labelledby="footer-contact"><h2 id="footer-contact" class="footer-heading">Contact</h2><ul class="footer-list">' . $contact . '</ul></section>'
        . '<section aria-labelledby="footer-follow"><h2 id="footer-follow" class="footer-heading">Stay in the loop</h2><div class="footer-social">' . $social . '</div>'
        . ($site['newsletterUrl'] !== '' ? kas_link($site['newsletterUrl'], 'Get the newsletter ' . kas_icon('arrow'), 'btn btn--ghost') : '')
        . '</section></div><div class="site-footer__base"><p>© ' . esc_html(gmdate('Y') . ' ' . ($site['schoolName'] ?: $site['name'])) . '. <span>' . esc_html($site['footerNote']) . '</span></p>'
        . '<p class="site-footer__links"><a class="back-top" href="#top">Back to top ' . kas_icon('up') . '</a>'
        . '<a href="' . esc_url(admin_url()) . '" class="staff-link">Staff sign in</a></p></div></footer>';
}
