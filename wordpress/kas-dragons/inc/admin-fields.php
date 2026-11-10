<?php
/**
 * The edit boxes staff see under each Team, Game and Coach, and on each Season.
 */

if (!defined('ABSPATH')) {
    exit;
}

add_action('add_meta_boxes', function (): void {
    $titles = array('kas_team' => 'Team details', 'kas_event' => 'Game details', 'kas_coach' => 'Coach details');
    foreach ($titles as $type => $title) {
        add_meta_box('kas_fields', $title, 'kas_render_meta_box', $type, 'normal', 'high');
    }
});

function kas_render_meta_box(WP_Post $post): void
{
    wp_nonce_field('kas_save_fields', 'kas_fields_nonce');
    echo '<div class="kas-fields">';
    foreach (kas_fields($post->post_type) as $key => $field) {
        kas_render_field('kas_' . $key, $field, kas_meta($post->ID, $key));
    }
    echo '</div>';
}

/** One labelled input. Used for post fields and season fields. */
function kas_render_field(string $name, array $field, string $value): void
{
    $id = esc_attr($name);
    echo '<div class="kas-field kas-field--' . esc_attr($field['type']) . '">';
    echo '<label for="' . $id . '"><strong>' . esc_html($field['label']) . '</strong></label>';
    switch ($field['type']) {
        case 'area':
            echo '<textarea id="' . $id . '" name="' . $id . '" rows="6">' . esc_textarea($value) . '</textarea>';
            break;
        case 'select':
            echo '<select id="' . $id . '" name="' . $id . '">';
            foreach ($field['options'] as $opt => $label) {
                echo '<option value="' . esc_attr($opt) . '"' . selected($value, $opt, false) . '>' . esc_html($label) . '</option>';
            }
            echo '</select>';
            break;
        case 'team':
            echo '<input type="text" id="' . $id . '" name="' . $id . '" value="' . esc_attr($value) . '" list="kas-team-names">';
            echo '<datalist id="kas-team-names">';
            foreach (get_posts(array('post_type' => 'kas_team', 'numberposts' => -1, 'orderby' => 'title', 'order' => 'ASC')) as $team) {
                echo '<option value="' . esc_attr($team->post_title) . '">';
            }
            echo '</datalist>';
            break;
        case 'image':
        case 'images':
            $multi = $field['type'] === 'images';
            echo '<div class="kas-media" data-multiple="' . ($multi ? '1' : '0') . '">';
            echo '<input type="hidden" id="' . $id . '" name="' . $id . '" value="' . esc_attr($value) . '">';
            echo '<div class="kas-media__preview">';
            foreach (array_filter(explode(',', $value)) as $img_id) {
                echo wp_get_attachment_image((int) $img_id, 'thumbnail');
            }
            echo '</div>';
            echo '<button type="button" class="button kas-media__pick">' . ($multi ? 'Choose photos' : 'Choose photo') . '</button> ';
            echo '<button type="button" class="button-link kas-media__clear">Remove</button>';
            echo '</div>';
            break;
        default:
            $type = in_array($field['type'], array('date', 'time', 'url'), true) ? $field['type'] : 'text';
            echo '<input type="' . $type . '" id="' . $id . '" name="' . $id . '" value="' . esc_attr($value) . '">';
    }
    if (!empty($field['help'])) {
        echo '<p class="description">' . esc_html($field['help']) . '</p>';
    }
    echo '</div>';
}

add_action('save_post', function (int $post_id, WP_Post $post): void {
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }
    $nonce = isset($_POST['kas_fields_nonce']) ? sanitize_text_field(wp_unslash($_POST['kas_fields_nonce'])) : '';
    if (!$nonce || !wp_verify_nonce($nonce, 'kas_save_fields') || !current_user_can('edit_post', $post_id)) {
        return;
    }
    foreach (kas_fields($post->post_type) as $key => $field) {
        $name = 'kas_' . $key;
        if (isset($_POST[$name])) {
            update_post_meta($post_id, $name, kas_clean_value(wp_unslash($_POST[$name]), $field));
        }
    }
}, 10, 2);

/* ---------- Season fields ---------- */

add_action('kas_season_add_form_fields', function (): void {
    wp_nonce_field('kas_save_season', 'kas_season_nonce');
    foreach (kas_season_fields() as $key => $field) {
        echo '<div class="form-field">';
        kas_render_field('kas_' . $key, $field, '');
        echo '</div>';
    }
});

add_action('kas_season_edit_form_fields', function (WP_Term $term): void {
    echo '<tr><td colspan="2">';
    wp_nonce_field('kas_save_season', 'kas_season_nonce');
    foreach (kas_season_fields() as $key => $field) {
        kas_render_field('kas_' . $key, $field, (string) get_term_meta($term->term_id, 'kas_' . $key, true));
    }
    echo '</td></tr>';
});

$kas_save_season = function (int $term_id): void {
    $nonce = isset($_POST['kas_season_nonce']) ? sanitize_text_field(wp_unslash($_POST['kas_season_nonce'])) : '';
    if (!$nonce || !wp_verify_nonce($nonce, 'kas_save_season') || !current_user_can('manage_categories')) {
        return;
    }
    foreach (kas_season_fields() as $key => $field) {
        if (isset($_POST['kas_' . $key])) {
            update_term_meta($term_id, 'kas_' . $key, kas_clean_value(wp_unslash($_POST['kas_' . $key]), $field));
        }
    }
};
add_action('created_kas_season', $kas_save_season);
add_action('edited_kas_season', $kas_save_season);

/* ---------- Scripts and styles for the edit boxes ---------- */

add_action('admin_enqueue_scripts', function (string $hook): void {
    $screen = get_current_screen();
    $ours = $screen && (in_array($screen->post_type, array('kas_team', 'kas_event', 'kas_coach'), true) || $screen->taxonomy === 'kas_season');
    if (!$ours) {
        return;
    }
    wp_enqueue_media();
    $dir = get_template_directory_uri() . '/assets';
    wp_enqueue_script('kas-admin-fields', $dir . '/js/admin-fields.js', array('jquery'), KAS_VERSION, true);
    wp_enqueue_style('kas-admin-fields', $dir . '/css/admin-fields.css', array(), KAS_VERSION);
});
