<?php
/**
 * Dashboard → KAS Athletics: site-wide settings (name, colors, social links, contact…).
 * Stored as one option "kas_settings".
 */

if (!defined('ABSPATH')) {
    exit;
}

function kas_settings_fields(): array
{
    return array(
        'Basics' => array(
            'name' => array('label' => 'Site name', 'type' => 'text'),
            'tagline' => array('label' => 'Tagline', 'type' => 'text'),
            'shortName' => array('label' => 'Short name (on the scoreboard)', 'type' => 'text'),
            'schoolName' => array('label' => 'School name', 'type' => 'text'),
            'logo' => array('label' => 'Logo', 'type' => 'image'),
            'footerNote' => array('label' => 'Footer note', 'type' => 'text'),
        ),
        'Look' => array(
            'brandColor' => array('label' => 'Main color (hex, e.g. #d43429)', 'type' => 'text'),
            'brandColor2' => array('label' => 'Second color (hex)', 'type' => 'text'),
            'defaultTheme' => array('label' => 'Default theme for visitors', 'type' => 'select', 'options' => array(
                'auto' => 'Auto (match device)', 'light' => 'Light', 'dark' => 'Dark', 'dragon' => 'Dragon (school colors)', 'contrast' => 'High contrast',
            )),
            'seasonal' => array('label' => 'Festive effects', 'type' => 'select', 'options' => array(
                'auto' => 'Automatic (at the right time of year)', 'off' => 'None', 'winter' => 'Winter / Christmas',
                'halloween' => 'Halloween', 'spring' => 'Spring', 'newyear' => 'New Year', 'dragon' => 'Dragon spirit',
            )),
        ),
        'Contact' => array(
            'phone' => array('label' => 'Phone', 'type' => 'text'),
            'email' => array('label' => 'Email', 'type' => 'text'),
            'address' => array('label' => 'Address', 'type' => 'area'),
            'contactPeople' => array('label' => 'Contact people', 'type' => 'area', 'help' => 'One per line: Name | Role | Email | Phone'),
        ),
        'Social and links' => array(
            'instagramUrl' => array('label' => 'Instagram link', 'type' => 'url'),
            'instagramHandle' => array('label' => 'Instagram handle (e.g. @kas_athletic_council)', 'type' => 'text'),
            'youtubeUrl' => array('label' => 'YouTube link', 'type' => 'url'),
            'newsletterUrl' => array('label' => 'Newsletter sign-up link', 'type' => 'url'),
            'links' => array('label' => 'Footer links', 'type' => 'area', 'help' => 'One per line: Label | Link'),
        ),
    );
}

function kas_settings_flat(): array
{
    return array_merge(...array_values(kas_settings_fields()));
}

add_action('admin_menu', function (): void {
    add_menu_page('KAS Athletics settings', 'KAS Athletics', 'manage_options', 'kas-settings', 'kas_render_settings', 'dashicons-shield', 3);
});

add_action('admin_init', function (): void {
    register_setting('kas_settings', 'kas_settings', array(
        'type' => 'array',
        'sanitize_callback' => function ($input): array {
            $clean = array();
            $input = is_array($input) ? $input : array();
            foreach (kas_settings_flat() as $key => $field) {
                $value = kas_clean_value($input[$key] ?? '', $field);
                if (in_array($key, array('brandColor', 'brandColor2'), true) && !preg_match('/^#[0-9a-f]{6}$/i', $value)) {
                    $value = '';
                }
                $clean[$key] = $value;
            }
            return $clean;
        },
    ));
});

add_action('admin_enqueue_scripts', function (string $hook): void {
    if ($hook !== 'toplevel_page_kas-settings') {
        return;
    }
    wp_enqueue_media();
    $dir = get_template_directory_uri() . '/assets';
    wp_enqueue_script('kas-admin-fields', $dir . '/js/admin-fields.js', array('jquery'), KAS_VERSION, true);
    wp_enqueue_style('kas-admin-fields', $dir . '/css/admin-fields.css', array(), KAS_VERSION);
});

function kas_render_settings(): void
{
    if (!current_user_can('manage_options')) {
        return;
    }
    $values = get_option('kas_settings', array());
    echo '<div class="wrap"><h1>KAS Athletics settings</h1>';
    echo '<p>These appear across the whole site (header, footer, contact page and scoreboard). Teams, games and coaches have their own menus on the left.</p>';
    echo '<form method="post" action="options.php">';
    settings_fields('kas_settings');
    foreach (kas_settings_fields() as $group => $fields) {
        echo '<h2>' . esc_html($group) . '</h2><div class="kas-fields">';
        foreach ($fields as $key => $field) {
            kas_render_field('kas_settings[' . $key . ']', $field, (string) ($values[$key] ?? ''));
        }
        echo '</div>';
    }
    submit_button('Save settings');
    echo '</form></div>';
}
