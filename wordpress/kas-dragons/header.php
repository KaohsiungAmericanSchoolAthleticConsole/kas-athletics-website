<?php
/** Top of every page. */
if (!defined('ABSPATH')) {
    exit;
}
$kas_seasonal = kas_seasonal();
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo('charset'); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">
<?php wp_head(); ?>
</head>
<body id="top" <?php body_class(); ?><?php echo $kas_seasonal !== '' ? ' data-seasonal="' . esc_attr($kas_seasonal) . '"' : ''; ?>>
<?php wp_body_open(); ?>
<a class="skip-link" href="#main">Skip to content</a>
<?php echo kas_header(); // phpcs:ignore WordPress.Security.EscapeOutput -- built from escaped parts ?>
<main id="main" tabindex="-1">
