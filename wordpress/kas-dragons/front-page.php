<?php
/**
 * Any page. Pages built from KAS sections show just those; other pages get a title banner.
 */
if (!defined('ABSPATH')) {
    exit;
}
get_header();
while (have_posts()) {
    the_post();
    $kas_blocks = parse_blocks(get_the_content());
    $kas_first = $kas_blocks[0]['blockName'] ?? '';
    if (!str_starts_with((string) $kas_first, 'kas/')) {
        echo kas_page_hero('KAS Athletics', get_the_title()); // phpcs:ignore WordPress.Security.EscapeOutput
        echo '<section class="section"><div class="prose wp-content">';
        the_content();
        echo '</div></section>';
    } else {
        the_content();
    }
}
get_footer();
