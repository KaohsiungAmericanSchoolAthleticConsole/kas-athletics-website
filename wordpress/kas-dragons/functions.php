<?php
/**
 * KAS Dragons theme: loads the pieces in inc/ and the site's styles and scripts.
 */

if (!defined('ABSPATH')) {
    exit;
}

const KAS_VERSION = '2.4.0';

foreach (array('helpers', 'content-types', 'admin-fields', 'settings', 'data', 'parts', 'captain', 'sections', 'blocks', 'scores', 'layout', 'importer', 'roles', 'calendar-sync', 'scores-admin', 'roster-sync', 'quick-edit', 'home-blocks') as $kas_file) {
    require_once __DIR__ . '/inc/' . $kas_file . '.php';
}

// Team, game and season web addresses (/teams/…, /events/, /sports/…) are created by
// this theme, so refresh the saved rules whenever it is switched on. Without this the
// saved rules from the previous theme stay in place and those pages 404 until someone
// re-saves Settings → Permalinks.
add_action('after_switch_theme', function (): void {
    flush_rewrite_rules();
});

add_action('after_setup_theme', function (): void {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('html5', array('search-form', 'gallery', 'caption', 'style', 'script'));
    add_theme_support('responsive-embeds');
    register_nav_menus(array('main' => 'Main menu (top of every page)'));
});

add_action('wp_enqueue_scripts', function (): void {
    $dir = get_template_directory_uri() . '/assets';
    wp_enqueue_script('kas-theme-init', $dir . '/js/theme-init.js', array(), KAS_VERSION, array('in_footer' => false));
    wp_enqueue_style('kas-fonts', 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,800;1,800&family=Barlow:wght@400;500;600&display=swap', array(), null);
    wp_enqueue_style('kas-site', $dir . '/css/site.css', array('kas-fonts'), KAS_VERSION);
    foreach (array('motion', 'captain', 'seasonal', 'wordpress') as $sheet) {
        wp_enqueue_style('kas-' . $sheet, $dir . '/css/' . $sheet . '.css', array('kas-site'), KAS_VERSION);
    }
    $site = kas_site();
    wp_add_inline_style('kas-site', sprintf(':root{--brand:%s;--brand-2:%s}', $site['brandColor'], $site['brandColor2']));
    wp_enqueue_script('kas-site', $dir . '/js/site.js', array(), KAS_VERSION, array('in_footer' => true, 'strategy' => 'defer'));
});

add_filter('language_attributes', function (string $attrs): string {
    return $attrs . ' data-theme-default="' . esc_attr(kas_site()['defaultTheme']) . '"';
});

add_filter('body_class', function (array $classes): array {
    return array_merge($classes, array('kas-site'));
});

add_action('wp_head', function (): void {
    $site = kas_site();
    echo '<meta name="theme-color" content="' . esc_attr($site['brandColor']) . '">' . "\n";
    if (!has_site_icon()) {
        echo '<link rel="icon" href="' . esc_url($site['logo']) . '">' . "\n";
    }
}, 2);
