<?php
/** A single game has no page of its own: send visitors to it on the schedule. */
if (!defined('ABSPATH')) {
    exit;
}
$kas_date = kas_meta(get_queried_object_id(), 'date');
wp_safe_redirect(get_post_type_archive_link('kas_event') . ($kas_date ? '#event-' . rawurlencode($kas_date) : ''), 302);
exit;
