<?php
/**
 * "Quick edit": the screen staff see after signing in. Big buttons for the few things
 * they actually change (players, coaches, contact, cover photos, scores), and a
 * shorter menu for everyone who isn't an administrator.
 */

if (!defined('ABSPATH')) {
    exit;
}

const KAS_QUICK_EDIT = 'kas-quick-edit';

function kas_quick_edit_url(): string
{
    return admin_url('admin.php?page=' . KAS_QUICK_EDIT);
}

add_action('admin_menu', function (): void {
    add_menu_page('Quick edit', 'Quick edit', 'edit_kas_items', KAS_QUICK_EDIT, 'kas_render_quick_edit', 'dashicons-edit-large', 2);
    add_submenu_page(KAS_QUICK_EDIT, 'Quick edit', 'Quick edit', 'edit_kas_items', KAS_QUICK_EDIT, 'kas_render_quick_edit');
    add_submenu_page(KAS_QUICK_EDIT, 'Contact us', 'Contact us', 'edit_others_kas_items', 'kas-contact', 'kas_render_contact_page');
}, 9);

/** Everyone except administrators gets a short menu: no Posts, Comments, Tools or Dashboard. */
add_action('admin_menu', function (): void {
    if (current_user_can('manage_options')) {
        return;
    }
    foreach (array('index.php', 'edit.php', 'edit-comments.php', 'tools.php', 'themes.php') as $page) {
        remove_menu_page($page);
    }
}, 999);

add_action('admin_bar_menu', function (WP_Admin_Bar $bar): void {
    if (!current_user_can('manage_options')) {
        foreach (array('comments', 'new-post', 'new-content', 'updates') as $node) {
            $bar->remove_node($node);
        }
    }
}, 999);

/** Staff (not administrators) skip the WordPress dashboard and land on Quick edit. */
add_action('load-index.php', function (): void {
    if (!current_user_can('manage_options') && current_user_can('edit_kas_items')) {
        wp_safe_redirect(kas_quick_edit_url());
        exit;
    }
});

add_filter('login_redirect', function (string $to, $requested, $user) {
    if ($user instanceof WP_User && !$requested && $user->has_cap('edit_kas_items')) {
        return kas_quick_edit_url();
    }
    return $to;
}, 20, 3);

/* ---------- The Quick edit screen ---------- */

function kas_quick_card(string $icon, string $title, string $text, array $links): string
{
    $out = '<section class="kas-quick__card"><span class="dashicons dashicons-' . esc_attr($icon) . ' kas-quick__icon" aria-hidden="true"></span>'
        . '<h2>' . esc_html($title) . '</h2><p>' . esc_html($text) . '</p><p class="kas-quick__links">';
    foreach ($links as $i => [$label, $url]) {
        $out .= '<a class="button' . ($i === 0 ? ' button-primary button-hero' : '') . '" href="' . esc_url($url) . '">' . esc_html($label) . '</a> ';
    }
    return $out . '</p></section>';
}

function kas_render_quick_edit(): void
{
    $home = (int) get_option('page_on_front');
    $user = wp_get_current_user();
    echo '<div class="wrap kas-quick"><h1>Hi ' . esc_html($user->display_name) . ' — what would you like to change?</h1>';
    echo '<div class="kas-quick__grid">';
    echo kas_quick_card('groups', 'Players', 'Rosters, player names and the team photo.', array( // phpcs:ignore WordPress.Security.EscapeOutput
        array('Choose a team', '#kas-teams'),
    ));
    echo kas_quick_card('businessperson', 'Coaches', 'Add a coach, or change a photo, role or bio.', array( // phpcs:ignore
        array('Edit coaches', admin_url('edit.php?post_type=kas_coach')),
        array('Add a coach', admin_url('post-new.php?post_type=kas_coach')),
    ));
    if (current_user_can('edit_others_kas_items')) {
        echo kas_quick_card('email-alt', 'Contact us', 'Phone, email, address and the people to contact.', array( // phpcs:ignore
            array('Edit contact details', admin_url('admin.php?page=kas-contact')),
        ));
    }
    $covers = array();
    if ($home && current_user_can('edit_post', $home)) {
        $covers[] = array('Home page banner', get_edit_post_link($home, 'raw'));
    }
    if (current_user_can('manage_categories')) {
        $covers[] = array('Season photos', admin_url('edit-tags.php?taxonomy=kas_season&post_type=kas_team'));
    }
    if ($covers) {
        echo kas_quick_card('format-image', 'Cover photos', 'The big photos at the top of the home page and each season. Team photos are on each team.', $covers); // phpcs:ignore
    }
    echo kas_quick_card('awards', 'Scores', 'Type in the result after a game.', array( // phpcs:ignore
        array('Enter scores', admin_url('edit.php?post_type=kas_event&page=kas-scores')),
    ));
    echo '</div>';

    // Every team, grouped by season, with its player count.
    echo '<h2 id="kas-teams" class="kas-quick__heading">Teams</h2><p>Pick a team to change its players, team photo or captain. '
        . 'Rosters that come from the Google Sheet are best changed in the sheet.</p><div class="kas-quick__teams">';
    foreach (kas_seasons() as $season) {
        echo '<section><h3>' . esc_html($season['title']) . '</h3><ul>';
        foreach ($season['teams'] as $team) {
            $n = count($team['players']);
            echo '<li><a href="' . esc_url(get_edit_post_link($team['id'], 'raw')) . '">' . esc_html($team['name']) . '</a> '
                . '<span class="kas-quick__count">' . ($n ? (int) $n . ' players' : 'no players yet') . '</span></li>';
        }
        echo '</ul></section>';
    }
    echo '</div>';
    echo '<p class="kas-quick__view"><a href="' . esc_url(home_url('/')) . '" target="_blank" rel="noopener">See the website ↗</a></p></div>';
}

/* ---------- Contact us: a small form instead of "Name | Role | …" lines ---------- */

function kas_render_contact_page(): void
{
    if (!current_user_can('edit_others_kas_items')) {
        return;
    }
    $people = kas_contact_people();
    $people[] = array('name' => '', 'role' => '', 'email' => '', 'phone' => '');
    echo '<div class="wrap kas-contact"><h1>Contact us</h1>';
    if (!empty($_GET['saved'])) { // phpcs:ignore WordPress.Security.NonceVerification
        echo '<div class="notice notice-success is-dismissible"><p>Saved. The Contact us page and the footer show the new details now.</p></div>';
    }
    echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '">';
    wp_nonce_field('kas_save_contact');
    echo '<input type="hidden" name="action" value="kas_save_contact">';
    echo '<h2>The school</h2><table class="form-table" role="presentation">';
    foreach (array('phone' => 'Phone', 'email' => 'Email', 'address' => 'Address') as $key => $label) {
        $value = kas_setting($key);
        echo '<tr><th scope="row"><label for="kas-c-' . esc_attr($key) . '">' . esc_html($label) . '</label></th><td>'
            . ($key === 'address'
                ? '<textarea id="kas-c-address" name="contact[address]" rows="3" class="large-text">' . esc_textarea($value) . '</textarea>'
                : '<input id="kas-c-' . esc_attr($key) . '" name="contact[' . esc_attr($key) . ']" class="regular-text" value="' . esc_attr($value) . '">')
            . '</td></tr>';
    }
    echo '</table><h2>People to contact</h2><p>Leave a name empty to remove that person. Use the empty last row to add someone.</p>';
    echo '<table class="widefat striped kas-contact__people"><thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Phone</th></tr></thead><tbody>';
    foreach ($people as $i => $p) {
        echo '<tr>';
        foreach (array('name', 'role', 'email', 'phone') as $key) {
            echo '<td><input name="people[' . (int) $i . '][' . esc_attr($key) . ']" value="' . esc_attr($p[$key]) . '" aria-label="' . esc_attr(ucfirst($key)) . '"'
                . ($key === 'email' ? ' type="email"' : '') . '></td>';
        }
        echo '</tr>';
    }
    echo '</tbody></table>';
    submit_button('Save contact details');
    echo '</form></div>';
}

add_action('admin_post_kas_save_contact', function (): void {
    if (!current_user_can('edit_others_kas_items')) {
        wp_die('You don’t have permission to change the contact details.');
    }
    check_admin_referer('kas_save_contact');
    $no_pipes = fn($v) => trim(preg_replace('/\s+/', ' ', str_replace('|', ' ', sanitize_text_field(is_scalar($v) ? (string) $v : ''))));
    $contact = isset($_POST['contact']) && is_array($_POST['contact']) ? wp_unslash($_POST['contact']) : array(); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- cleaned below
    $rows = isset($_POST['people']) && is_array($_POST['people']) ? wp_unslash($_POST['people']) : array(); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput

    $lines = array();
    foreach (array_slice($rows, 0, 30) as $row) {
        if (!is_array($row) || $no_pipes($row['name'] ?? '') === '') {
            continue;
        }
        $email = sanitize_email((string) ($row['email'] ?? ''));
        $lines[] = implode(' | ', array($no_pipes($row['name']), $no_pipes($row['role'] ?? ''), $email, $no_pipes($row['phone'] ?? '')));
    }
    $settings = get_option('kas_settings', array());
    $settings = is_array($settings) ? $settings : array();
    $settings = array_merge($settings, array(
        'phone' => $no_pipes($contact['phone'] ?? ''),
        'email' => sanitize_email((string) ($contact['email'] ?? '')),
        'address' => sanitize_textarea_field((string) ($contact['address'] ?? '')),
        'contactPeople' => implode("\n", $lines),
    ));
    update_option('kas_settings', $settings);
    wp_safe_redirect(add_query_arg('saved', '1', admin_url('admin.php?page=kas-contact')));
    exit;
});

add_action('admin_enqueue_scripts', function (string $hook): void {
    if (str_contains($hook, KAS_QUICK_EDIT) || str_ends_with($hook, 'page_kas-contact')) {
        wp_enqueue_style('kas-admin-fields', get_template_directory_uri() . '/assets/css/admin-fields.css', array(), KAS_VERSION);
    }
});
