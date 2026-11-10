<?php
// KAS Athletics theme functions.
if (!defined('ABSPATH')) {
    exit;
}

add_action('wp_enqueue_scripts', function () {
    wp_enqueue_style('kas-site', get_template_directory_uri() . '/css/site.css', array(), '1.0');
    wp_enqueue_style('kas-motion', get_template_directory_uri() . '/css/motion.css', array('kas-site'), '1.0');
    wp_enqueue_style('kas-captain', get_template_directory_uri() . '/css/captain.css', array('kas-site'), '1.0');
    wp_enqueue_style('kas-fonts', 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@800&family=Barlow:wght@400;500;600&display=swap', array(), null);
});

// Custom post types.
add_action('init', function () {
    register_post_type('kas_event', array(
        'labels' => array('name' => 'Games & events', 'singular_name' => 'Game'),
        'public' => true,
        'has_archive' => true,
        'rewrite' => array('slug' => 'events'),
        'supports' => array('title', 'editor', 'thumbnail', 'excerpt'),
        'menu_icon' => 'dashicons-calendar',
    ));
    register_post_type('kas_team', array(
        'labels' => array('name' => 'Teams', 'singular_name' => 'Team'),
        'public' => true,
        'has_archive' => true,
        'rewrite' => array('slug' => 'teams'),
        'supports' => array('title', 'editor', 'thumbnail', 'excerpt'),
        'menu_icon' => 'dashicons-groups',
    ));
});

// Meta boxes for team fields.
add_action('add_meta_boxes', function () {
    add_meta_box('kas_team_fields', 'Team details', function ($post) {
        $fields = array('level' => 'Level / league', 'coach' => 'Coaches', 'practice' => 'Practice times');
        foreach ($fields as $key => $label) {
            $val = get_post_meta($post->ID, $key, true);
            echo '<p><label>' . esc_html($label) . '<br><input type="text" name="kas_' . esc_attr($key) . '" value="' . esc_attr($val) . '" style="width:100%"></label></p>';
        }
        $roster = get_post_meta($post->ID, 'roster', true);
        echo '<p><label>Roster (one player per line)<br><textarea name="kas_roster" rows="8" style="width:100%">' . esc_textarea($roster) . '</textarea></label></p>';
    }, 'kas_team', 'normal', 'high');

    add_meta_box('kas_event_fields', 'Game details', function ($post) {
        $fields = array('opponent' => 'Opponent', 'kas_score' => 'KAS score', 'opp_score' => 'Opponent score');
        foreach ($fields as $key => $label) {
            $val = get_post_meta($post->ID, $key, true);
            echo '<p><label>' . esc_html($label) . '<br><input type="text" name="kas_' . esc_attr($key) . '" value="' . esc_attr($val) . '" style="width:100%"></label></p>';
        }
    }, 'kas_event', 'normal', 'high');
});

// Save meta.
add_action('save_post', function ($id) {
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }
    foreach (array('level', 'coach', 'practice', 'roster') as $k) {
        if (isset($_POST['kas_' . $k])) {
            update_post_meta($id, $k, sanitize_text_field($_POST['kas_' . $k]));
        }
    }
    foreach (array('opponent', 'kas_score', 'opp_score') as $k) {
        if (isset($_POST['kas_' . $k])) {
            update_post_meta($id, $k, sanitize_text_field($_POST['kas_' . $k]));
        }
    }
});

// Theme support.
add_theme_support('title-tag');
add_theme_support('post-thumbnails');
add_theme_support('html5', array('search-form', 'comment-form', 'comment-list', 'gallery', 'caption'));