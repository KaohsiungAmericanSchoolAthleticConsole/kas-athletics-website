<?php
/** The scoreboard: the page whose web address is "scores". ?view=standings shows standings. */
if (!defined('ABSPATH')) {
    exit;
}
get_header();
$kas_view = isset($_GET['view']) && $_GET['view'] === 'standings' ? 'standings' : 'games'; // phpcs:ignore WordPress.Security.NonceVerification -- read-only filter
$kas_team = isset($_GET['team']) ? sanitize_text_field(wp_unslash($_GET['team'])) : ''; // phpcs:ignore WordPress.Security.NonceVerification
echo kas_scoreboard($kas_view, $kas_team); // phpcs:ignore WordPress.Security.EscapeOutput
get_footer();
