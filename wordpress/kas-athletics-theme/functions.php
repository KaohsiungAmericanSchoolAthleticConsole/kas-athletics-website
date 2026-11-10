<?php
// KAS Athletics theme functions.
if (!defined('ABSPATH')) exit;

add_action('wp_enqueue_scripts', function () {
    wp_enqueue_style('kas-site', get_template_directory_uri() . '/css/site.css', [], '1.0');
    wp_enqueue_style('kas-motion', get_template_directory_uri() . '/css/motion.css', ['kas-site'], '1.0');
    wp_enqueue_style('kas-captain', get_template_directory_uri() . '/css/captain.css', ['kas-site'], '1.0');
    wp_enqueue_style('kas-fonts', 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@800&family=Barlow:wght@400;500;600&display=swap', [], null);
});

// Custom post type for athletics events (games).
add_action('init', function () {
    register_post_type('kas_event', [
        'labels' => ['name' => 'Games & events', 'singular_name' => 'Game'],
        'public' => true,
        'has_archive' => true,
        'rewrite' => ['slug' => 'events'],
        'supports' => ['title', 'editor', 'thumbnail', 'excerpt'],
        'menu_icon' => 'dashicons-calendar',
    ]);
    register_post_type('kas_team', [
        'labels' => ['name' => 'Teams', 'singular_name' => 'Team'],
        'public' => true,
        'has_archive' => true,
        'rewrite' => ['slug' => 'teams'],
        'supports' => ['title', 'editor', 'thumbnail', 'excerpt'],
        'menu_icon' => 'dashicons-groups',
    ]);
});

// Theme support.
add_theme_support('title-tag');
add_theme_support('post-thumbnails');
add_theme_support('html5', ['search-form', 'comment-form', 'comment-list', 'gallery', 'caption']);
EOF