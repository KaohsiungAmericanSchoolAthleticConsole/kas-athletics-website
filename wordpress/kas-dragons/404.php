<?php
/** Page not found. */
if (!defined('ABSPATH')) {
    exit;
}
get_header();
?>
<section class="not-found" aria-labelledby="nf-title">
  <p class="not-found__code" aria-hidden="true">404</p>
  <h1 id="nf-title">Out of bounds.</h1>
  <p>We couldn’t find that page. It may have moved.</p>
  <a class="btn btn--primary" href="<?php echo esc_url(home_url('/')); ?>">Back to home <?php echo kas_icon('arrow'); // phpcs:ignore ?></a>
</section>
<?php
get_footer();
