<?php
/**
 * Who can do what.
 *  - Administrator / Editor: everything (as usual in WordPress).
 *  - Coach (new): teams, games & scores, coaches and photos. Not pages, menus or settings.
 * Add a coach: Users → Add New → Role "Coach".
 */

if (!defined('ABSPATH')) {
    exit;
}

const KAS_CAPS_VERSION = '1';

function kas_item_caps(bool $full): array
{
    $coach = array('edit_kas_items', 'edit_others_kas_items', 'edit_published_kas_items', 'publish_kas_items', 'read_private_kas_items');
    $more = array('delete_kas_items', 'delete_others_kas_items', 'delete_published_kas_items', 'delete_private_kas_items', 'edit_private_kas_items');
    return $full ? array_merge($coach, $more) : $coach;
}

/** Runs once per KAS_CAPS_VERSION: roles are stored in the database. */
add_action('init', function (): void {
    if (get_option('kas_caps_version') === KAS_CAPS_VERSION) {
        return;
    }
    foreach (array('administrator', 'editor') as $name) {
        $role = get_role($name);
        if ($role) {
            foreach (kas_item_caps(true) as $cap) {
                $role->add_cap($cap);
            }
        }
    }
    remove_role('kas_coach');
    add_role('kas_coach', 'Coach', array_fill_keys(array_merge(array('read', 'upload_files'), kas_item_caps(false)), true));
    update_option('kas_caps_version', KAS_CAPS_VERSION);
});
