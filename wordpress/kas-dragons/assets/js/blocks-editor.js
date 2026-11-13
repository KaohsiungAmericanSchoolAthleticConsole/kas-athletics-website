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

  /* ---------- Click-to-edit on the preview ----------
   * The preview is the real page HTML from the server, so we work out which field a
   * click belongs to by matching the clicked text or photo against the section's values. */

  var norm = function (s) { return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase(); };
  var fileName = function (url) { return String(url || '').split('?')[0].split('/').pop().replace(/-\d+x\d+(?=\.\w+$)/, ''); };

  /** Every editable value with its path: [key] or [key, index, subKey] for list items. */
  function editableValues(fields, attrs) {
    var out = [];
    fields.forEach(function (f) {
      if (f.type === 'list') {
        (attrs[f.key] || []).forEach(function (item, i) {
          ((f.item && f.item.fields) || []).forEach(function (sub) {
            out.push({ field: sub, path: [f.key, i, sub.key], value: item[sub.key] });
          });
        });
      } else if (['text', 'textarea', 'url', 'image'].indexOf(f.type) !== -1 || !f.type) {
        out.push({ field: f, path: [f.key], value: attrs[f.key] });
      }
    });
    return out;
  }

  function findField(fields, attrs, target) {
    var values = editableValues(fields, attrs);
    if (target.tagName === 'IMG') {
      var name = fileName(target.getAttribute('src'));
      var img = values.filter(function (v) { return v.field.type === 'image' && v.value && fileName(v.value) === name; })[0];
      return img ? { field: img.field, path: img.path, el: target } : null;
    }
    // Walk up from the clicked element until its text matches a field (exactly, or as one paragraph of a long text).
    for (var node = target; node && node.nodeType === 1; node = node.parentElement) {
      var text = norm(node.textContent);
      if (!text || text.length > 2000) continue;
      var exact = values.filter(function (v) { return v.field.type !== 'image' && norm(v.value) === text; })[0];
      if (exact) return { field: exact.field, path: exact.path, el: node };
      var part = values.filter(function (v) { return v.field.type === 'textarea' && norm(v.value).indexOf(text) !== -1 && text.length > 3; })[0];
      if (part) return { field: part.field, path: part.path, el: node };
      if (node.classList && node.classList.contains('kas-block-preview')) break;
    }
    return null;
  }

  function readPath(attrs, path) {
    return path.length === 1 ? attrs[path[0]] : ((attrs[path[0]] || [])[path[1]] || {})[path[2]];
  }

  /** New attributes object with one value changed (never mutates the old one). */
  function writePath(attrs, path, value) {
    var o = {};
    if (path.length === 1) { o[path[0]] = value; return o; }
    o[path[0]] = (attrs[path[0]] || []).map(function (item, i) {
      if (i !== path[1]) return item;
      var next = Object.assign({}, item); next[path[2]] = value; return next;
    });
    return o;
  }

  function pickImage(done) {
    var frame = wp.media({ title: 'Choose a photo', button: { text: 'Use this photo' }, library: { type: 'image' }, multiple: false });
    frame.on('select', function () { done(frame.state().get('selection').first().toJSON().url || ''); });
    frame.open();
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
        var popState = wp.element.useState(null);
        var pop = popState[0];
        var setPop = popState[1];
        function set(key) { return function (v) { var o = {}; o[key] = v; props.setAttributes(o); }; }

        function onPreviewClick(event) {
          var link = event.target.closest && event.target.closest('a');
          if (link) event.preventDefault();
          var hit = findField(def.fields, attrs, event.target);
          if (!hit) return;
          event.stopPropagation();
          if (hit.field.type === 'image') {
            pickImage(function (url) { props.setAttributes(writePath(attrs, hit.path, url)); });
            return;
          }
          var rect = hit.el.getBoundingClientRect();
          setPop({ path: hit.path, field: hit.field, anchor: { getBoundingClientRect: function () { return rect; }, ownerDocument: hit.el.ownerDocument } });
        }

        var blockProps = BE.useBlockProps({ className: 'kas-block-preview', onClickCapture: props.isSelected ? onPreviewClick : undefined });
        return el(Fragment, null,
          el(BE.InspectorControls, null,
            el(C.PanelBody, { title: 'Content', initialOpen: true },
              content.map(function (f) { return control(f, attrs[f.key], set(f.key), f.key); })),
            el(C.PanelBody, { title: 'Style', initialOpen: false },
              style.map(function (f) { return control(f, attrs[f.key], set(f.key), f.key); }))),
          el('div', blockProps,
            el('div', { className: 'kas-block-preview__tag' },
              props.isSelected ? 'Click any text or photo to change it' : def.label + ' — click to edit'),
            el(ServerSideRender, { block: name, attributes: attrs, httpMethod: 'POST' }),
            pop ? el(C.Popover, { anchor: pop.anchor, placement: 'bottom-start', onClose: function () { setPop(null); }, focusOnMount: 'firstElement' },
              el('div', { className: 'kas-inline-edit', style: { display: 'grid', gap: '8px', width: 'min(360px, 80vw)', padding: '12px' } },
                el(C.TextareaControl, {
                  label: pop.field.label, rows: pop.field.type === 'textarea' ? 5 : 2,
                  value: readPath(attrs, pop.path) || '',
                  onChange: function (v) { props.setAttributes(writePath(attrs, pop.path, v)); },
                }),
                el(C.Button, { variant: 'primary', onClick: function () { setPop(null); } }, 'Done'))) : null));
      },
      save: function () { return null; },
    });
  });
})(window.wp, window.KAS_BLOCKS);
