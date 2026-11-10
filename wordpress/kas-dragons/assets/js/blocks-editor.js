// Editor side of the KAS section blocks. No build step: plain JavaScript using
// the WordPress globals. Every section shows a live preview (rendered by PHP,
// exactly like the public page) and its fields in the right-hand settings panel.
(function (wp, KAS) {
  'use strict';
  if (!wp || !KAS) return;

  var el = wp.element.createElement;
  var Fragment = wp.element.Fragment;
  var C = wp.components;
  var BE = wp.blockEditor;
  var ServerSideRender = wp.serverSideRender;

  function options(field) {
    return (field.options || []).map(function (o) { return { value: o.value, label: o.label }; });
  }

  function imageControl(label, value, onChange, key) {
    return el(BE.MediaUploadCheck, { key: key },
      el(BE.MediaUpload, {
        allowedTypes: ['image'],
        onSelect: function (media) { onChange(media.url || ''); },
        render: function (obj) {
          return el('div', { className: 'kas-image-control' },
            el('p', { className: 'kas-image-control__label' }, label),
            value ? el('img', { src: value, alt: '', className: 'kas-image-control__preview' }) : null,
            el(C.Button, { variant: 'secondary', onClick: obj.open }, value ? 'Change photo' : 'Choose photo'),
            value ? el(C.Button, { variant: 'link', isDestructive: true, onClick: function () { onChange(''); } }, 'Remove') : null);
        },
      }));
  }

  /** One field control. value/onChange are for this field only. */
  function control(field, value, onChange, key) {
    switch (field.type) {
      case 'textarea':
        return el(C.TextareaControl, { key: key, label: field.label, value: value || '', onChange: onChange, rows: 4 });
      case 'select':
        return el(C.SelectControl, { key: key, label: field.label, value: value || '', options: options(field), onChange: onChange });
      case 'boolean':
        return el(C.ToggleControl, { key: key, label: field.label, checked: !!value, onChange: onChange });
      case 'image':
        return imageControl(field.label, value, onChange, key);
      case 'list':
        return listControl(field, value, onChange, key);
      default:
        return el(C.TextControl, { key: key, label: field.label, value: value || '', onChange: onChange,
          type: field.type === 'url' ? 'url' : 'text' });
    }
  }

  /** A repeatable list (numbers, photos, cards): edit, reorder, add and remove items. */
  function listControl(field, value, onChange, key) {
    var items = Array.isArray(value) ? value : [];
    var sub = (field.item && field.item.fields) || [];
    var max = field.max || 50;
    function setItem(i, next) { onChange(items.map(function (it, j) { return j === i ? next : it; })); }
    function move(i, dir) {
      var j = i + dir;
      if (j < 0 || j >= items.length) return;
      var copy = items.slice();
      var tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
      onChange(copy);
    }
    function blank() {
      var o = {};
      sub.forEach(function (f) { o[f.key] = f.type === 'boolean' ? false : ''; });
      return o;
    }
    return el('div', { key: key, className: 'kas-list' },
      el('p', { className: 'kas-list__label' }, field.label),
      items.map(function (it, i) {
        var title = (field.titleKey && it[field.titleKey]) || ('Item ' + (i + 1));
        return el(C.PanelBody, { key: i, title: title, initialOpen: false },
          sub.map(function (f) {
            return control(f, it[f.key], function (v) {
              var next = Object.assign({}, it); next[f.key] = v; setItem(i, next);
            }, f.key);
          }),
          el('div', { className: 'kas-list__actions' },
            el(C.Button, { variant: 'tertiary', onClick: function () { move(i, -1); }, disabled: i === 0 }, 'Move up'),
            el(C.Button, { variant: 'tertiary', onClick: function () { move(i, 1); }, disabled: i === items.length - 1 }, 'Move down'),
            el(C.Button, { variant: 'link', isDestructive: true, onClick: function () {
              onChange(items.filter(function (_, j) { return j !== i; }));
            } }, 'Remove')));
      }),
      items.length < max ? el(C.Button, { variant: 'secondary', onClick: function () { onChange(items.concat([blank()])); } },
        field.addLabel || 'Add') : null);
  }

  var STYLE_KEYS = ['bg', 'space', 'align'];

  Object.keys(KAS.library.blocks).forEach(function (type) {
    var def = KAS.library.blocks[type];
    var name = KAS.names[type];
    var content = def.fields.filter(function (f) { return STYLE_KEYS.indexOf(f.key) === -1; });
    var style = def.fields.filter(function (f) { return STYLE_KEYS.indexOf(f.key) !== -1; });

    wp.blocks.updateCategory && wp.blocks.updateCategory('kas-sections', { icon: 'shield' });

    wp.blocks.registerBlockType(name, {
      apiVersion: 3,
      title: def.label,
      description: def.hint,
      category: 'kas-sections',
      icon: 'layout',
      keywords: [def.group, 'kas', 'section'],
      supports: { html: false, customClassName: false },
      edit: function (props) {
        var attrs = props.attributes;
        function set(key) { return function (v) { var o = {}; o[key] = v; props.setAttributes(o); }; }
        var blockProps = BE.useBlockProps({ className: 'kas-block-preview' });
        return el(Fragment, null,
          el(BE.InspectorControls, null,
            el(C.PanelBody, { title: 'Content', initialOpen: true },
              content.map(function (f) { return control(f, attrs[f.key], set(f.key), f.key); })),
            el(C.PanelBody, { title: 'Style', initialOpen: false },
              style.map(function (f) { return control(f, attrs[f.key], set(f.key), f.key); }))),
          el('div', blockProps,
            el('div', { className: 'kas-block-preview__tag' }, def.label + ' — edit it in the panel on the right'),
            el(ServerSideRender, { block: name, attributes: attrs, httpMethod: 'POST' })));
      },
      save: function () { return null; },
    });
  });
})(window.wp, window.KAS_BLOCKS);
