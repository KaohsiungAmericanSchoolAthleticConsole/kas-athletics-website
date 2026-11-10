<?php
/**
 * Registers every section in blocks.json as a WordPress block ("KAS sections" in the
 * block inserter), so staff build pages by adding, dragging and editing sections.
 */

if (!defined('ABSPATH')) {
    exit;
}

function kas_block_library(): array
{
    static $lib = null;
    if ($lib === null) {
        $json = file_get_contents(__DIR__ . '/blocks.json');
        $lib = $json ? json_decode($json, true) : null;
        if (!is_array($lib)) {
            $lib = array('groups' => array(), 'blocks' => array());
        }
    }
    return $lib;
}

/** "heroSplit" → "kas/hero-split" */
function kas_block_name(string $type): string
{
    return 'kas/' . strtolower(preg_replace('/([a-z])([A-Z])/', '$1-$2', $type));
}

function kas_block_attributes(array $def): array
{
    $attrs = array();
    foreach ($def['fields'] as $f) {
        $default = $def['defaults'][$f['key']] ?? null;
        if ($f['type'] === 'list') {
            $attrs[$f['key']] = array('type' => 'array', 'default' => is_array($default) ? $default : array());
        } elseif ($f['type'] === 'boolean') {
            $attrs[$f['key']] = array('type' => 'boolean', 'default' => (bool) $default);
        } else {
            $attrs[$f['key']] = array('type' => 'string', 'default' => is_scalar($default) ? (string) $default : '');
        }
    }
    return $attrs;
}

add_action('init', function (): void {
    foreach (kas_block_library()['blocks'] as $type => $def) {
        register_block_type(kas_block_name($type), array(
            'api_version' => 3,
            'title' => $def['label'],
            'description' => $def['hint'],
            'category' => 'kas-sections',
            'icon' => 'layout',
            'attributes' => kas_block_attributes($def),
            'supports' => array('html' => false, 'customClassName' => false),
            'editor_script_handles' => array('kas-blocks-editor'),
            'render_callback' => fn(array $attrs) => kas_render_section($type, $attrs),
        ));
    }
});

add_filter('block_categories_all', function (array $cats): array {
    return array_merge(array(array('slug' => 'kas-sections', 'title' => 'KAS sections')), $cats);
});

add_action('init', function (): void {
    wp_register_script(
        'kas-blocks-editor',
        get_template_directory_uri() . '/assets/js/blocks-editor.js',
        array('wp-blocks', 'wp-element', 'wp-components', 'wp-block-editor', 'wp-server-side-render', 'wp-i18n'),
        KAS_VERSION,
        true
    );
    $lib = kas_block_library();
    $names = array();
    foreach (array_keys($lib['blocks']) as $type) {
        $names[$type] = kas_block_name($type);
    }
    wp_add_inline_script('kas-blocks-editor', 'window.KAS_BLOCKS = ' . wp_json_encode(array('library' => $lib, 'names' => $names)) . ';', 'before');
});

/** The site's look inside the block editor, so previews match the real page. */
add_action('after_setup_theme', function (): void {
    add_theme_support('editor-styles');
    add_editor_style(array('assets/css/site.css', 'assets/css/motion.css', 'assets/css/editor.css'));
});

/** Keep the inserter focused: KAS sections plus a few useful core blocks. */
add_filter('allowed_block_types_all', function ($allowed, $context) {
    if (!isset($context->post) || $context->post->post_type !== 'page') {
        return $allowed;
    }
    $core = array('core/paragraph', 'core/heading', 'core/list', 'core/list-item', 'core/image', 'core/buttons', 'core/button', 'core/embed', 'core/group', 'core/columns', 'core/column', 'core/separator', 'core/spacer', 'core/shortcode', 'core/block');
    return array_merge(array_values(array_map('kas_block_name', array_keys(kas_block_library()['blocks']))), $core);
}, 10, 2);
