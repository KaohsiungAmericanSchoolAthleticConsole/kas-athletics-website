<?php
/** Fallback for anything without its own template (e.g. blog posts). */
if (!defined('ABSPATH')) {
    exit;
}
get_header();
if (is_singular()) {
    while (have_posts()) {
        the_post();
        echo kas_page_hero(get_the_date(), get_the_title()); // phpcs:ignore WordPress.Security.EscapeOutput
        echo '<section class="section"><div class="prose wp-content">';
        the_content();
        echo '</div></section>';
    }
} else {
    echo kas_page_hero('KAS Athletics', wp_strip_all_tags(get_the_archive_title() ?: 'News')); // phpcs:ignore WordPress.Security.EscapeOutput
    echo '<section class="section"><ul class="card-grid">';
    while (have_posts()) {
        the_post();
        echo '<li class="card">' . kas_photo((string) get_the_post_thumbnail_url(null, 'large'), get_the_title(), array('cls' => 'card__img', 'width' => 600, 'height' => 400)) // phpcs:ignore
            . '<div class="card__body"><h3 class="card__title"><a href="' . esc_url(get_permalink()) . '">' . esc_html(get_the_title()) . '</a></h3>'
            . '<p class="card__text">' . esc_html(wp_trim_words(get_the_excerpt(), 24)) . '</p></div></li>';
    }
    echo '</ul>';
    the_posts_pagination();
    echo '</section>';
}
get_footer();
