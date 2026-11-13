<?php
/**
 * Games & events → Enter scores: every recent and upcoming game on one screen,
 * with score boxes and one "Save all" button. Works on a phone.
 */

if (!defined('ABSPATH')) {
    exit;
}

const KAS_SCORE_FIELDS = array('kas_score', 'opp_score', 'status', 'result');

add_action('admin_menu', function (): void {
    add_submenu_page('edit.php?post_type=kas_event', 'Enter scores', 'Enter scores', 'edit_kas_items', 'kas-scores', 'kas_render_scores_page', 0);
});

/** Games from 14 days ago to 7 days ahead, or the whole school year. */
function kas_scores_games(bool $whole_year): array
{
    $today = new DateTimeImmutable(kas_today());
    $from = $whole_year ? kas_scores_year_start() : $today->modify('-14 days')->format('Y-m-d');
    $to = $whole_year ? '9999-12-31' : $today->modify('+7 days')->format('Y-m-d');
    return array_values(array_filter(kas_events(), fn($e) => $e['date'] >= $from && $e['date'] <= $to));
}

function kas_scores_year_start(): string
{
    return function_exists('kas_school_year_start') ? kas_school_year_start() : gmdate('Y') . '-01-01';
}

function kas_render_scores_page(): void
{
    $whole = !empty($_GET['all']); // phpcs:ignore WordPress.Security.NonceVerification -- view switch only
    $games = kas_scores_games($whole);
    $status_options = kas_fields('kas_event')['status']['options'];
    $base = admin_url('edit.php?post_type=kas_event&page=kas-scores');

    echo '<div class="wrap kas-scores"><h1>Enter scores</h1>';
    if (!empty($_GET['saved'])) { // phpcs:ignore WordPress.Security.NonceVerification
        echo '<div class="notice notice-success is-dismissible"><p>Scores saved. They’re on the website now.</p></div>';
    }
    echo '<p>' . ($whole ? 'All games this school year. ' : 'Games from the last two weeks and the next week. ')
        . '<a href="' . esc_url($whole ? $base : add_query_arg('all', '1', $base)) . '">' . ($whole ? 'Show recent only' : 'Show the whole year') . '</a></p>';
    if (!$games) {
        echo '<p>No games in this period.</p></div>';
        return;
    }
    echo '<form method="post" action="' . esc_url(admin_url('admin-post.php')) . '">';
    wp_nonce_field('kas_save_scores');
    echo '<input type="hidden" name="action" value="kas_save_scores"><input type="hidden" name="all" value="' . ($whole ? '1' : '') . '">';
    echo '<table class="widefat striped kas-scores__table"><thead><tr><th>Date</th><th>Game</th><th>KAS</th><th>Them</th><th>Status</th><th>Result note</th></tr></thead><tbody>';
    foreach ($games as $g) {
        if (!current_user_can('edit_post', $g['id'])) {
            continue;
        }
        $n = 'scores[' . (int) $g['id'] . ']';
        $today = $g['date'] === kas_today() ? ' kas-scores__row--today' : '';
        echo '<tr class="kas-scores__row' . $today . '">';
        echo '<td data-label="Date">' . esc_html(kas_format_date($g['date'])) . ($g['time'] ? '<br><small>' . esc_html(kas_format_time($g['time'])) . '</small>' : '') . '</td>';
        echo '<td data-label="Game"><a href="' . esc_url(get_edit_post_link($g['id'])) . '">' . esc_html($g['title']) . '</a>'
            . ($g['sport'] ? '<br><small>' . esc_html($g['sport']) . '</small>' : '<br><small class="kas-scores__warn">No team yet</small>') . '</td>';
        echo '<td data-label="KAS"><input class="kas-scores__num" inputmode="numeric" name="' . esc_attr($n . '[kas_score]') . '" value="' . esc_attr($g['kasScore']) . '" aria-label="KAS score"></td>';
        echo '<td data-label="Them"><input class="kas-scores__num" inputmode="numeric" name="' . esc_attr($n . '[opp_score]') . '" value="' . esc_attr($g['opponentScore']) . '" aria-label="Opponent score"></td>';
        echo '<td data-label="Status"><select name="' . esc_attr($n . '[status]') . '">';
        foreach ($status_options as $value => $label) {
            echo '<option value="' . esc_attr($value) . '"' . selected($g['status'], $value, false) . '>' . esc_html($label) . '</option>';
        }
        echo '</select></td>';
        echo '<td data-label="Result note"><input name="' . esc_attr($n . '[result]') . '" value="' . esc_attr($g['result']) . '" placeholder="e.g. 2nd place" aria-label="Result note"></td>';
        echo '</tr>';
    }
    echo '</tbody></table>';
    submit_button('Save all scores');
    echo '</form></div>';
}

add_action('admin_post_kas_save_scores', function (): void {
    check_admin_referer('kas_save_scores');
    $rows = isset($_POST['scores']) && is_array($_POST['scores']) ? wp_unslash($_POST['scores']) : array(); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- each value cleaned below
    $fields = kas_fields('kas_event');
    foreach ($rows as $id => $row) {
        $id = (int) $id;
        if (!is_array($row) || get_post_type($id) !== 'kas_event' || !current_user_can('edit_post', $id)) {
            continue;
        }
        foreach (KAS_SCORE_FIELDS as $key) {
            if (array_key_exists($key, $row)) {
                update_post_meta($id, 'kas_' . $key, kas_clean_value($row[$key], $fields[$key]));
            }
        }
        if (array_key_exists('status', $row)) {
            delete_post_meta($id, 'kas_status_from_sync');
        }
    }
    $args = array('post_type' => 'kas_event', 'page' => 'kas-scores', 'saved' => '1');
    if (!empty($_POST['all'])) {
        $args['all'] = '1';
    }
    wp_safe_redirect(add_query_arg($args, admin_url('edit.php')));
    exit;
});

add_action('admin_enqueue_scripts', function (string $hook): void {
    if (str_ends_with($hook, 'page_kas-scores') || str_ends_with($hook, 'page_kas-calendar')) {
        wp_enqueue_style('kas-admin-fields', get_template_directory_uri() . '/assets/css/admin-fields.css', array(), KAS_VERSION);
    }
});
