<?php
/**
 * The Home page. Built from blocks in Pages → Home; this only gives them the site's frame.
 */
if (!defined('ABSPATH')) {
    exit;
}
get_header();
while (have_posts()) {
    the_post();
    echo '<div class="kas-blocks">';
    the_content();
    echo '</div>';
}
get_footer();
