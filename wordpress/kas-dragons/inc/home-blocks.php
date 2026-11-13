<?php
/**
 * The Home page is built from ordinary WordPress blocks (group, heading, paragraph,
 * image, buttons) so staff can click any text and type, replace photos, and add,
 * copy, move or delete anything. Only sections that fill themselves in from data
 * (upcoming games, season tiles, scrolling words, video, calendar) stay KAS blocks.
 *
 * The look comes from assets/css/home-blocks.css, keyed on the class names below.
 * kas_home_section_markup() turns an old-style section into these blocks.
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * One block as an array for serialize_block(). $open/$close are the block's own HTML
 * around its inner blocks; text inside them must already be escaped.
 */
function kas_b(string $name, array $attrs, string $open, string $close = '', array $inner = array()): array
{
    $content = array($open);
    foreach ($inner as $unused) {
        $content[] = null;
    }
    $content[] = $close;
    return array(
        'blockName' => $name, 'attrs' => $attrs, 'innerBlocks' => $inner,
        'innerHTML' => $open . $close, 'innerContent' => $content,
    );
}

function kas_b_group(string $cls, array $inner, array $attrs = array()): array
{
    $attrs = array_merge(array('className' => $cls), $attrs);
    $align = isset($attrs['align']) ? ' align' . $attrs['align'] : '';
    return kas_b('core/group', $attrs, '<div class="wp-block-group' . $align . ' ' . esc_attr($cls) . '">', '</div>', $inner);
}

function kas_b_p(string $cls, string $text): array
{
    $html = nl2br(esc_html($text), false);
    return kas_b('core/paragraph', $cls !== '' ? array('className' => $cls) : array(), '<p' . ($cls !== '' ? ' class="' . esc_attr($cls) . '"' : '') . '>' . $html . '</p>');
}

function kas_b_heading(int $level, string $cls, string $text): array
{
    $attrs = array('className' => $cls);
    if ($level !== 2) {
        $attrs = array('level' => $level) + $attrs;
    }
    return kas_b('core/heading', $attrs, '<h' . $level . ' class="wp-block-heading ' . esc_attr($cls) . '">' . esc_html($text) . '</h' . $level . '>');
}

function kas_b_image(string $url, string $cls, string $alt = ''): array
{
    $id = $url !== '' ? attachment_url_to_postid($url) : 0;
    $attrs = array('sizeSlug' => 'full', 'linkDestination' => 'none', 'className' => $cls);
    if ($id) {
        $attrs = array('id' => $id) + $attrs;
    }
    return kas_b('core/image', $attrs,
        '<figure class="wp-block-image size-full ' . esc_attr($cls) . '"><img src="' . esc_url($url) . '" alt="' . esc_attr($alt) . '"'
        . ($id ? ' class="wp-image-' . $id . '"' : '') . '/></figure>');
}

/** $buttons: list of [label, link, style ('' or 'glass')]. */
function kas_b_buttons(array $buttons): array
{
    $inner = array();
    foreach ($buttons as [$label, $link, $style]) {
        if ($label === '') {
            continue;
        }
        $cls = $style !== '' ? 'is-style-kas-' . $style : '';
        $inner[] = kas_b('core/button', $cls !== '' ? array('className' => $cls) : array(),
            '<div class="wp-block-button' . ($cls !== '' ? ' ' . $cls : '') . '"><a class="wp-block-button__link wp-element-button" href="' . esc_url(kas_url($link)) . '">' . esc_html($label) . '</a></div>');
    }
    return kas_b('core/buttons', array('className' => 'kas-buttons'), '<div class="wp-block-buttons kas-buttons">', '</div>', $inner);
}

/** Text with blank lines → one paragraph block per paragraph. */
function kas_b_paragraphs(string $cls, string $text): array
{
    $out = array();
    foreach (preg_split('/\n\s*\n/', trim($text)) as $para) {
        if (trim($para) !== '') {
            $out[] = kas_b_p($cls, trim($para));
        }
    }
    return $out;
}

/**
 * Block markup for a Home page section, or null if the section stays a KAS block.
 * @param string $type section type (hero, stats, quote, statement…)
 * @param array  $s    its fields, with photo addresses already on this site
 */
function kas_home_section_markup(string $type, array $s): ?string
{
    $v = fn(string $k) => is_scalar($s[$k] ?? null) ? (string) $s[$k] : '';
    switch ($type) {
        case 'hero':
            $inner = array_filter(array(
                $v('eyebrow') !== '' ? kas_b_p('kas-eyebrow', $v('eyebrow')) : null,
                kas_b_heading(1, 'kas-hero__title', $v('title')),
                $v('subtitle') !== '' ? kas_b_p('kas-hero__subtitle', $v('subtitle')) : null,
                kas_b_buttons(array(
                    array($v('buttonLabel'), $v('buttonLink') ?: '/events/', ''),
                    array($v('button2Label') ?: 'Full schedule', $v('button2Link') ?: '/events/', 'glass'),
                )),
            ));
            $block = kas_b_group('kas-hero', array(
                kas_b_image($v('image'), 'kas-hero__bg'),
                kas_b_group('kas-hero__inner', array_values($inner)),
            ), array('align' => 'full'));
            break;
        case 'stats':
            $items = array_map(fn($it) => kas_b_group('kas-stat', array(
                kas_b_p('kas-stat__value', (string) ($it['value'] ?? '')),
                kas_b_p('kas-stat__label', (string) ($it['label'] ?? '')),
            )), is_array($s['items'] ?? null) ? $s['items'] : array());
            $block = kas_b_group('kas-stats', $items, array('align' => 'full'));
            break;
        case 'quote':
            $block = kas_b_group('kas-director', array(
                kas_b_group('kas-director__figure', array(
                    kas_b_image($v('photo'), 'kas-director__photo', $v('name')),
                    kas_b_group('kas-director__caption', array(kas_b_p('kas-director__name', $v('name')), kas_b_p('kas-director__role', $v('role')))),
                )),
                kas_b_group('kas-director__body', array_merge(
                    array(kas_b_p('kas-kicker', $v('kicker')), kas_b_heading(2, 'kas-section-title', $v('title'))),
                    kas_b_paragraphs('kas-director__quote', $v('text'))
                )),
            ));
            break;
        case 'statement':
            $block = kas_b_group('kas-statement', array(kas_b_group('kas-statement__inner', array(
                kas_b_heading(2, 'kas-statement__title', $v('title') ?: 'Our mission'),
                kas_b_group('kas-statement__body', kas_b_paragraphs('', $v('body'))),
            ))), array('align' => 'full'));
            break;
        default:
            return null;
    }
    return serialize_block($block);
}

/* ---------- Front end and editor ---------- */

add_action('wp_enqueue_scripts', function (): void {
    wp_enqueue_style('kas-home-blocks', get_template_directory_uri() . '/assets/css/home-blocks.css', array('kas-site'), KAS_VERSION);
}, 20);

add_action('after_setup_theme', function (): void {
    add_editor_style('assets/css/home-blocks.css');
}, 20);

/** "Glass" button style (see-through, for photos) as a choice in the button's Styles panel. */
add_action('init', function (): void {
    register_block_style('core/button', array('name' => 'kas-glass', 'label' => 'Glass (on photos)'));
});
