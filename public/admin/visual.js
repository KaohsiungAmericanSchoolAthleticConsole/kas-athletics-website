// "Edit on the page": shows the real website inside the editor, with click-to-edit.
// The page in the frame (with ?admin-edit) loads /admin/inline.js, which sends each
// change back here; admin.js adds it to the draft that "Publish changes" publishes.
import { h } from './dom.js';

let frame = null;
let currentPath = '/';
let phone = false;

export const visualFrame = () => (frame?.isConnected ? frame : null);

function pageOptions(draft) {
  const seasons = (draft.seasons || []).filter((s) => s.slug);
  return [
    h('option', { value: '/' }, 'Home'),
    ...seasons.map((s) => h('optgroup', { label: s.title },
      h('option', { value: `/${s.slug}` }, `${s.title} (all teams)`),
      ...(s.teams || []).filter((t) => t.slug).map((t) => h('option', { value: `/${s.slug}/${t.slug}` }, t.name)))),
    h('option', { value: '/coaches' }, 'Coaches'),
    h('option', { value: '/contact' }, 'Contact'),
  ];
}

export function renderVisual(state) {
  const select = h('select', { 'aria-label': 'Page to edit' }, pageOptions(state.draft));
  select.value = currentPath;
  if (select.value !== currentPath) { currentPath = '/'; select.value = '/'; }

  frame = h('iframe', { class: 'visual__frame', title: 'Website preview (editable)', src: `${currentPath}?admin-edit=1` });
  select.addEventListener('change', () => {
    currentPath = select.value;
    frame.src = `${currentPath}?admin-edit=1`;
  });

  const wrap = h('div', { class: `visual${phone ? ' visual--phone' : ''}` });
  const sizeBtn = (label, isPhone) => h('button', {
    type: 'button', 'aria-pressed': String(phone === isPhone),
    onclick: (e) => {
      phone = isPhone;
      wrap.classList.toggle('visual--phone', phone);
      e.currentTarget.parentElement.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === e.currentTarget)));
    },
  }, label);

  wrap.append(
    h('div', { class: 'visual__bar' },
      h('label', {}, 'Page', select),
      h('span', { class: 'segmented', role: 'group', 'aria-label': 'Preview size' }, sizeBtn('Computer', false), sizeBtn('Phone', true)),
      h('span', { class: 'visual__hint' }, 'Changes show here first. Nothing is public until you press Publish changes.')),
    h('div', { class: 'visual__stage' }, frame));
  return wrap;
}
