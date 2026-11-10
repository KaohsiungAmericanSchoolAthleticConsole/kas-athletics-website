<?php
/** Bottom of every page. */
if (!defined('ABSPATH')) {
    exit;
}
?>
</main>
<?php echo kas_footer(); // phpcs:ignore WordPress.Security.EscapeOutput -- built from escaped parts ?>
<?php wp_footer(); ?>
</body>
</html>
