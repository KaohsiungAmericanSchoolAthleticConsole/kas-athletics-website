// Builds editor forms from the schema in src/schema.js.
// ctx = { get(path), set(path, value), restructure(path, value), upload(file), errorFor(path) }
import { h, icon, uid, pathToString } from './dom.js';

const INPUT_TYPES = { text: 'text', url: 'url', date: 'date', time: 'time', slug: 'text', color: 'color' };

function fieldShell(field, path, ctx, control, id, visual = control) {
  const err = ctx.errorFor(path);
  const helpId = field.help ? `${id}-help` : null;
  const errId = err ? `${id}-err` : null;
  control.setAttribute('aria-describedby', [helpId, errId].filter(Boolean).join(' ') || '');
  if (err) control.setAttribute('aria-invalid', 'true');
  return h('div', { class: `field field--${field.type}${err ? ' has-error' : ''}`, dataset: { path: pathToString(path) } },
    h('label', { class: 'field__label', for: id }, field.label, field.required ? h('span', { class: 'req', 'aria-hidden': 'true' }, ' *') : null),
    visual,
    field.help ? h('p', { class: 'field__help', id: helpId }, field.help) : null,
    err ? h('p', { class: 'field__error', id: errId }, err) : null);
}

function textField(field, path, ctx) {
  const id = uid();
  const value = ctx.get(path) ?? '';
  let control;
  if (field.type === 'textarea') {
    control = h('textarea', { id, rows: field.max > 1500 ? 7 : 3, maxlength: field.max, oninput: (e) => ctx.set(path, e.target.value) });
    control.value = value;
  } else if (field.type === 'select') {
    control = h('select', { id, onchange: (e) => ctx.set(path, e.target.value) },
      h('option', { value: '' }, '— Choose —'),
      field.options.map((o) => h('option', { value: o.value, selected: o.value === value }, o.label)));
  } else if (field.type === 'color') {
    const text = h('input', { type: 'text', value: value || '#c8102e', class: 'color-text', 'aria-label': `${field.label} hex code`, maxlength: 7 });
    const picker = h('input', { id, type: 'color', value: value || '#c8102e' });
    picker.addEventListener('input', () => { text.value = picker.value; ctx.set(path, picker.value); });
    text.addEventListener('change', () => {
      if (/^#[0-9a-f]{6}$/i.test(text.value)) { picker.value = text.value; ctx.set(path, text.value.toLowerCase()); }
    });
    return fieldShell(field, path, ctx, picker, id, h('div', { class: 'color-row' }, picker, text));
  } else {
    control = h('input', {
      id, type: INPUT_TYPES[field.type] || 'text', value, maxlength: field.max, placeholder: field.placeholder || '',
      autocomplete: 'off', spellcheck: field.type === 'text' ? 'true' : 'false',
      oninput: (e) => ctx.set(path, field.type === 'slug' ? e.target.value.toLowerCase() : e.target.value),
    });
    if (field.type === 'url') {
      // Friendly fix-up: "www.example.com" -> "https://www.example.com"
      control.addEventListener('change', () => {
        const v = control.value.trim();
        if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(v)) { control.value = `https://${v}`; ctx.set(path, control.value); }
      });
    }
  }
  if (field.placeholder && control.tagName === 'TEXTAREA') control.placeholder = field.placeholder;
  return fieldShell(field, path, ctx, control, id);
}

function imageField(field, path, ctx) {
  const id = uid();
  const value = ctx.get(path) || '';
  const fileInput = h('input', { id, type: 'file', accept: 'image/*', class: 'sr-only' });
  const status = h('span', { class: 'image-field__status', 'aria-live': 'polite' });
  const preview = value
    ? h('img', { src: value, alt: '', class: 'image-field__preview' })
    : h('div', { class: 'image-field__empty' }, icon('image'), h('span', {}, 'No photo yet'));

  async function handle(file) {
    if (!file) return;
    status.textContent = 'Uploading…';
    box.classList.add('is-busy');
    try {
      const url = await ctx.upload(file);
      ctx.restructure(path, url);
    } catch (err) {
      status.textContent = err.message;
      box.classList.remove('is-busy');
    }
  }
  fileInput.addEventListener('change', () => handle(fileInput.files[0]));

  const box = h('div', {
    class: 'image-field',
    ondragover: (e) => { e.preventDefault(); box.classList.add('is-drop'); },
    ondragleave: () => box.classList.remove('is-drop'),
    ondrop: (e) => { e.preventDefault(); box.classList.remove('is-drop'); handle(e.dataTransfer.files[0]); },
  },
  preview,
  h('div', { class: 'image-field__actions' },
    h('label', { class: 'btn btn--ghost btn--sm', for: id }, icon('image'), value ? 'Replace photo' : 'Upload photo'),
    value ? h('button', { type: 'button', class: 'btn btn--quiet btn--sm', onclick: () => ctx.restructure(path, '') }, 'Remove') : null,
    h('span', { class: 'muted small' }, 'or drag a photo here'),
    status),
  fileInput);

  return h('div', { class: `field field--image${ctx.errorFor(path) ? ' has-error' : ''}`, dataset: { path: pathToString(path) } },
    h('span', { class: 'field__label' }, field.label),
    box,
    ctx.errorFor(path) ? h('p', { class: 'field__error' }, ctx.errorFor(path)) : null);
}

function itemTitle(field, item, index) {
  const label = item?.[field.titleKey] || item?.date;
  if (label) return String(label);
  return item?.image ? `Photo ${index + 1}` : `New item ${index + 1}`;
}

function listField(field, path, ctx, { top = false } = {}) {
  const items = ctx.get(path) || [];
  const move = (from, to) => {
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    ctx.restructure(path, next, { open: [...path, to] });
  };
  const blank = () => Object.fromEntries(field.item.fields.map((f) => [f.key, f.type === 'list' ? [] : '']));

  const cards = items.map((item, i) => {
    const itemPath = [...path, i];
    const hasError = ctx.hasErrorWithin(itemPath);
    const details = h('details', { class: `item${hasError ? ' has-error' : ''}`, open: ctx.isOpen(itemPath) || hasError },
      h('summary', { class: 'item__summary' },
        item?.image ? h('img', { class: 'item__thumb', src: item.image, alt: '', loading: 'lazy' }) : null,
        h('span', { class: 'item__title' }, itemTitle(field, item, i)),
        field.titleKey === 'title' && item?.date ? h('span', { class: 'item__meta' }, item.date) : null,
        h('span', { class: 'item__tools' },
          h('button', { type: 'button', class: 'tool', title: 'Move up', disabled: i === 0, onclick: (e) => { e.preventDefault(); move(i, i - 1); } }, icon('up'), h('span', { class: 'sr-only' }, 'Move up')),
          h('button', { type: 'button', class: 'tool', title: 'Move down', disabled: i === items.length - 1, onclick: (e) => { e.preventDefault(); move(i, i + 1); } }, icon('down'), h('span', { class: 'sr-only' }, 'Move down')),
          h('button', { type: 'button', class: 'tool', title: 'Duplicate', onclick: (e) => {
            e.preventDefault();
            const next = [...items.slice(0, i + 1), structuredClone(item), ...items.slice(i + 1)];
            ctx.restructure(path, next, { open: [...path, i + 1] });
          } }, icon('copy'), h('span', { class: 'sr-only' }, 'Duplicate')),
          h('button', { type: 'button', class: 'tool tool--danger', title: 'Delete', onclick: (e) => {
            e.preventDefault();
            if (confirm(`Delete “${itemTitle(field, item, i)}”? You can still undo by not publishing.`)) {
              ctx.restructure(path, items.filter((_, j) => j !== i));
            }
          } }, icon('trash'), h('span', { class: 'sr-only' }, 'Delete')))),
      h('div', { class: 'item__body' }, groupFields(field.item, itemPath, ctx)));
    details.addEventListener('toggle', () => ctx.setOpen(itemPath, details.open));
    return details;
  });

  const add = h('button', { type: 'button', class: 'btn btn--add', disabled: field.max && items.length >= field.max,
    onclick: () => ctx.restructure(path, [...items, blank()], { open: [...path, items.length], focus: true }) },
  icon('plus'), field.addLabel || 'Add item');

  const tools = field.sortBy ? h('button', { type: 'button', class: 'btn btn--quiet btn--sm', onclick: () => {
    const sorted = items.toSorted((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
    ctx.restructure(path, sorted);
  } }, 'Sort by date') : null;

  return h(top ? 'div' : 'fieldset', { class: `list${top ? ' list--top' : ''}`, dataset: { path: pathToString(path) } },
    top ? null : h('legend', { class: 'field__label' }, field.label),
    h('div', { class: 'list__head' }, h('span', { class: 'muted small' }, `${items.length} ${items.length === 1 ? 'item' : 'items'}`), tools),
    cards.length ? cards : h('p', { class: 'list__empty muted' }, 'Nothing here yet.'),
    add);
}

export function groupFields(group, path, ctx) {
  return group.fields.map((f) => renderField(f, [...path, f.key], ctx));
}

export function renderField(field, path, ctx, opts) {
  switch (field.type) {
    case 'group': return h('div', { class: 'group' }, groupFields(field, path, ctx));
    case 'list': return listField(field, path, ctx, opts);
    case 'image': return imageField(field, path, ctx);
    default: return textField(field, path, ctx);
  }
}
