// Builds editor forms from the schema in src/schema.js.
// ctx = { get(path), set(path, value), restructure(path, value), upload(file), errorFor(path) }
import { h, icon, uid, pathToString } from './dom.js';

export function slugify(text) {
  return String(text || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

const INPUT_TYPES = { text: 'text', url: 'url', date: 'date', time: 'time', slug: 'text', color: 'color', score: 'text' };

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
  } else if (field.type === 'team') {
    const names = ctx.teamNames();
    const options = value && !names.includes(value) ? [value, ...names] : names;
    control = h('select', { id, onchange: (e) => ctx.set(path, e.target.value) },
      h('option', { value: '' }, '— Not linked to a team —'),
      options.map((n) => h('option', { value: n, selected: n === value }, n)));
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
      autocomplete: 'off', spellcheck: field.type === 'text' ? 'true' : 'false', inputmode: field.type === 'score' ? 'numeric' : false,
      oninput: (e) => ctx.set(path, field.type === 'slug' ? e.target.value.toLowerCase() : e.target.value),
    });
    if (field.suggest) {
      // Offer names typed before (e.g. opponents) and reuse their logo automatically.
      const listId = `${id}-list`;
      control.setAttribute('list', listId);
      const datalist = h('datalist', { id: listId }, ctx.siblingValues(path).map((v) => h('option', { value: v })));
      control.addEventListener('change', () => { if (field.autofill) ctx.autofill(path, field.autofill); });
      return fieldShell(field, path, ctx, control, id, h('div', {}, control, datalist));
    }
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
    ? h('img', { src: ctx.imageUrl(value), alt: '', class: 'image-field__preview' })
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
  fileInput.addEventListener('change', () => { handle(fileInput.files[0]); fileInput.value = ''; });

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
        item?.image ? h('img', { class: 'item__thumb', src: ctx.imageUrl(item.image), alt: '', loading: 'lazy' }) : null,
        h('span', { class: 'item__title' }, itemTitle(field, item, i)),
        field.titleKey === 'title' && item?.date ? h('span', { class: 'item__meta' }, item.date) : null,
        h('span', { class: 'item__tools' },
          h('button', { type: 'button', class: 'tool', title: 'Move up', disabled: i === 0, onclick: (e) => { e.preventDefault(); move(i, i - 1); } }, icon('up'), h('span', { class: 'sr-only' }, 'Move up')),
          h('button', { type: 'button', class: 'tool', title: 'Move down', disabled: i === items.length - 1, onclick: (e) => { e.preventDefault(); move(i, i + 1); } }, icon('down'), h('span', { class: 'sr-only' }, 'Move down')),
          h('button', { type: 'button', class: 'tool', title: 'Duplicate', onclick: (e) => {
            e.preventDefault();
            const copy = structuredClone(item);
            if (copy.slug) copy.slug = `${copy.slug}-copy`.slice(0, 60);
            const next = [...items.slice(0, i + 1), copy, ...items.slice(i + 1)];
            ctx.restructure(path, next, { open: [...path, i + 1] });
          } }, icon('copy'), h('span', { class: 'sr-only' }, 'Duplicate')),
          h('button', { type: 'button', class: 'tool tool--danger', title: 'Delete', onclick: (e) => {
            e.preventDefault();
            if (confirm(`Delete “${itemTitle(field, item, i)}”?\n\nIt disappears from the website when you press Publish. Until then you can bring it back with “Discard changes”.`)) {
              ctx.restructure(path, items.filter((_, j) => j !== i));
            }
          } }, icon('trash'), h('span', { class: 'sr-only' }, 'Delete')))),
      h('div', { class: 'item__body' }, groupFields(field.item, itemPath, ctx)));
    details.addEventListener('toggle', () => ctx.setOpen(itemPath, details.open));
    // Keep the item's heading in sync while its name/title is typed.
    const titlePath = `${pathToString(itemPath)}.${field.titleKey}`;
    details.addEventListener('input', (e) => {
      if (e.target.closest('[data-path]')?.dataset.path !== titlePath) return;
      details.querySelector(':scope > summary .item__title').textContent = e.target.value || itemTitle(field, {}, i);
    });
    return details;
  });

  const add = h('button', { type: 'button', class: 'btn btn--add', disabled: field.max && items.length >= field.max,
    onclick: () => ctx.restructure(path, [...items, blank()], { open: [...path, items.length], focus: true }) },
  icon('plus'), field.addLabel || 'Add item');

  const tools = field.sortBy ? h('button', { type: 'button', class: 'btn btn--quiet btn--sm', onclick: () => {
    const sorted = items.toSorted((a, b) => `${a.date || ''}T${a.time || '00:00'}`.localeCompare(`${b.date || ''}T${b.time || '00:00'}`));
    ctx.restructure(path, sorted);
  } }, 'Sort by date') : null;

  const SEARCH_THRESHOLD = 8;
  const search = items.length > SEARCH_THRESHOLD ? h('input', {
    type: 'search', class: 'list__search', placeholder: `Search ${items.length} items…`, 'aria-label': `Search ${field.label}`,
    oninput: (e) => {
      const q = e.target.value.trim().toLowerCase();
      cards.forEach((card, i) => {
        const haystack = Object.values(items[i] || {}).filter((v) => typeof v === 'string').join(' ').toLowerCase();
        card.hidden = Boolean(q) && !haystack.includes(q);
      });
    },
  }) : null;

  return h(top ? 'div' : 'fieldset', { class: `list${top ? ' list--top' : ''}`, dataset: { path: pathToString(path) } },
    top ? null : h('legend', { class: 'field__label' }, field.label),
    h('div', { class: 'list__head' }, h('span', { class: 'muted small' }, `${items.length} ${items.length === 1 ? 'item' : 'items'}`), search, tools),
    cards.length ? cards : h('p', { class: 'list__empty muted' }, 'Nothing here yet.'),
    add);
}

export function groupFields(group, path, ctx) {
  const nodes = group.fields.map((f) => renderField(f, [...path, f.key], ctx));
  // Web addresses fill themselves in from the title until someone edits them by hand.
  group.fields.filter((f) => f.type === 'slug' && f.from).forEach((slugField) => {
    const at = (key) => nodes[group.fields.findIndex((f) => f.key === key)]?.querySelector('input');
    const source = at(slugField.from);
    const target = at(slugField.key);
    if (!source || !target) return;
    let previous = source.value;
    source.addEventListener('input', () => {
      if (!target.value || target.value === slugify(previous)) {
        target.value = slugify(source.value);
        ctx.set([...path, slugField.key], target.value);
      }
      previous = source.value;
    });
  });
  return nodes;
}

function booleanField(field, path, ctx) {
  const id = uid();
  const value = ctx.get(path) === true;
  const control = h('input', { id, type: 'checkbox', checked: value, onchange: (e) => ctx.set(path, e.target.checked) });
  return fieldShell(field, path, ctx, control, id);
}

export function renderField(field, path, ctx, opts) {
  switch (field.type) {
    case 'group': return h('div', { class: 'group' }, groupFields(field, path, ctx));
    case 'list': return listField(field, path, ctx, opts);
    case 'image': return imageField(field, path, ctx);
    case 'boolean': return booleanField(field, path, ctx);
    default: return textField(field, path, ctx);
  }
}
