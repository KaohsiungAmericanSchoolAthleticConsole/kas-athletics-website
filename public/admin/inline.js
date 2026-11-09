// On-page ("click to edit") editor, loaded only for signed-in staff.
// The server marks editable things with data-edit (text), data-edit-image
// (photos) and data-edit-list (reorderable lists). Changes are collected in a
// draft and published through the same API as the full editor.
import { h, icon, getIn, setIn } from './dom.js';
import { prepareImage } from './images.js';

const root = document.documentElement;
const PLAINTEXT = (() => { const d = document.createElement('div'); d.contentEditable = 'plaintext-only'; return d.contentEditable === 'plaintext-only'; })();
const state = { csrf: null, saved: null, draft: null, version: null, editing: false, saving: false };

/** "seasons[0].teams[2].name" -> ['seasons', 0, 'teams', 2, 'name'] */
export function parsePath(str) {
  return String(str).split(/[.[\]]+/).filter(Boolean).map((k) => (/^\d+$/.test(k) ? Number(k) : k));
}

const isDirty = () => JSON.stringify(state.draft) !== JSON.stringify(state.saved);

async function api(method, url, body) {
  let res;
  try {
    res = await fetch(url, {
      method, credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(state.csrf ? { 'X-CSRF-Token': state.csrf } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw Object.assign(new Error('Can’t reach the website right now. Check your connection and try again — your changes are still here.'), { status: 0 });
  }
  let data = {};
  try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) throw Object.assign(new Error(data.error || `Something went wrong (error ${res.status}).`), { status: res.status, data });
  return data;
}

// ---------- Toolbar ----------
const live = h('p', { class: 'kas-sr', 'aria-live': 'polite' });
const statusEl = h('span', { class: 'kas-bar__status' });
const editBtn = h('button', { type: 'button', class: 'kas-btn kas-btn--edit', onclick: () => (state.editing ? exitEdit() : enterEdit()) });
const publishBtn = h('button', { type: 'button', class: 'kas-btn kas-btn--primary', onclick: publish }, 'Publish');
const discardBtn = h('button', { type: 'button', class: 'kas-btn', onclick: discard }, 'Discard');
const bar = h('div', { class: 'kas-bar', role: 'region', 'aria-label': 'Page editor' },
  h('span', { class: 'kas-bar__badge' }, 'Staff'),
  editBtn, statusEl, discardBtn, publishBtn,
  h('a', { class: 'kas-btn kas-btn--link', href: `/admin/` }, 'Full editor'),
  live);
const toastEl = h('div', { class: 'kas-toast', role: 'status', hidden: true });

let toastTimer;
function toast(message, kind = 'ok') {
  toastEl.textContent = message;
  toastEl.dataset.kind = kind;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.hidden = true; }, kind === 'error' ? 9000 : 4000);
}

function refreshBar() {
  const dirty = isDirty();
  editBtn.replaceChildren(icon(state.editing ? 'check' : 'pencil'), state.editing ? 'Done' : 'Edit this page');
  editBtn.setAttribute('aria-pressed', String(state.editing));
  statusEl.textContent = state.saving ? 'Publishing…' : dirty ? 'Unpublished changes' : state.editing ? 'Click any outlined text or photo' : '';
  statusEl.classList.toggle('is-dirty', dirty);
  publishBtn.hidden = !dirty;
  publishBtn.disabled = state.saving;
  discardBtn.hidden = !dirty || state.saving;
}

function update(path, value) {
  state.draft = setIn(state.draft, parsePath(path), value);
  document.querySelectorAll(`[data-edit="${CSS.escape(path)}"].kas-error`).forEach((el) => el.classList.remove('kas-error'));
  refreshBar();
}

/** "seasons[1].teams[0].name" -> "team name"; "home.heroTitle" -> "hero title" */
function labelFor(path) {
  const parts = parsePath(path).filter((p) => typeof p === 'string');
  const last = parts.at(-1) || 'text';
  const owner = parts.length > 2 ? `${parts.at(-2).replace(/s$/, '')} ` : '';
  return `${owner}${last.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()}`;
}

// ---------- Text ----------
function readText(el) {
  const text = el.innerText.replace(/\r/g, '').replace(/ /g, ' ');
  return el.hasAttribute('data-edit-multiline')
    ? text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
    : text.replace(/\s*\n\s*/g, ' ').trim();
}

function onTextInput(e) { update(e.currentTarget.dataset.edit, readText(e.currentTarget)); }
function onTextKey(e) {
  if (e.key === 'Escape') e.currentTarget.blur();
  if (e.key === 'Enter' && !e.currentTarget.hasAttribute('data-edit-multiline')) { e.preventDefault(); e.currentTarget.blur(); }
}
function onTextPaste(e) {
  if (PLAINTEXT) return; // the browser already pastes plain text
  e.preventDefault();
  document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
}
function onTextBlur(e) { if (!readText(e.currentTarget)) e.currentTarget.textContent = ''; } // lets the placeholder show again

function setupText(on) {
  document.querySelectorAll('[data-edit]').forEach((el) => {
    if (on) {
      el.contentEditable = PLAINTEXT ? 'plaintext-only' : 'true';
      el.spellcheck = true;
      el.setAttribute('role', 'textbox');
      el.setAttribute('aria-label', `Edit ${labelFor(el.dataset.edit)}`);
      if (el.hasAttribute('data-edit-multiline')) el.setAttribute('aria-multiline', 'true');
      el.addEventListener('input', onTextInput);
      el.addEventListener('keydown', onTextKey);
      el.addEventListener('paste', onTextPaste);
      el.addEventListener('blur', onTextBlur);
    } else {
      el.removeAttribute('contenteditable');
      ['role', 'aria-label', 'aria-multiline'].forEach((a) => el.removeAttribute(a));
      el.removeEventListener('input', onTextInput);
      el.removeEventListener('keydown', onTextKey);
      el.removeEventListener('paste', onTextPaste);
      el.removeEventListener('blur', onTextBlur);
    }
  });
}

// ---------- Photos ----------
const chipLayer = h('div', { class: 'kas-chips', 'aria-hidden': 'false' });
let chips = []; // [{ el, chip }]

async function replacePhoto(target, file) {
  if (!file) return;
  const entry = chips.find((c) => c.el === target);
  entry?.chip.classList.add('is-busy');
  try {
    const dataUrl = await prepareImage(file);
    const { url } = await api('POST', '/api/upload', { dataUrl });
    let el = target;
    if (el.tagName !== 'IMG') {
      const img = h('img', { class: [...el.classList].filter((c) => c !== 'photo-fallback' && c !== 'hero__bg--pattern').join(' '), alt: '', 'data-edit-image': el.dataset.editImage });
      el.replaceWith(img);
      if (entry) entry.el = img;
      el = img;
    }
    el.removeAttribute('srcset');
    el.src = url;
    update(el.dataset.editImage, url);
    toast('Photo replaced. Press Publish to put it on the website.');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    entry?.chip.classList.remove('is-busy');
    positionChips();
  }
}

function setupPhotos(on) {
  chips.forEach(({ chip }) => chip.remove());
  chips = [];
  if (!on) return;
  document.querySelectorAll('[data-edit-image]').forEach((el) => {
    const input = h('input', { type: 'file', accept: 'image/*', hidden: true });
    const chip = h('button', { type: 'button', class: 'kas-chip', hidden: true, 'aria-label': `Change photo: ${labelFor(el.dataset.editImage)}` }, icon('image'), h('span', {}, 'Change photo'), input);
    const entry = { el, chip };
    chip.addEventListener('click', (e) => { if (e.target !== input) input.click(); });
    input.addEventListener('change', () => { replacePhoto(entry.el, input.files[0]); input.value = ''; });
    chip.addEventListener('dragover', (e) => { e.preventDefault(); chip.classList.add('is-drop'); });
    chip.addEventListener('dragleave', () => chip.classList.remove('is-drop'));
    chip.addEventListener('drop', (e) => { e.preventDefault(); chip.classList.remove('is-drop'); replacePhoto(entry.el, e.dataTransfer.files[0]); });
    chipLayer.append(chip);
    chips.push(entry);
  });
  positionChips();
}

let chipFrame = 0;
function positionChips() {
  cancelAnimationFrame(chipFrame);
  chipFrame = requestAnimationFrame(() => {
    const headerBottom = document.querySelector('.site-header')?.getBoundingClientRect().bottom || 0;
    chips.forEach(({ el, chip }) => {
      const r = el.getBoundingClientRect();
      const top = Math.max(r.top + 12, headerBottom + 8);
      const visible = r.width > 40 && r.bottom - 44 > top && top < innerHeight - 40;
      chip.hidden = !visible;
      if (visible) chip.style.transform = `translate(${Math.round(r.right - chip.offsetWidth - 12)}px, ${Math.round(top)}px)`; // measured after unhiding
    });
  });
}

// ---------- Reordering lists ----------
const DRAG_THRESHOLD = 4;

function renumber(list) {
  const base = list.dataset.editList;
  [...list.children].forEach((item, i) => {
    const old = Number(item.dataset.kasIndex);
    if (old !== i) {
      const from = `${base}[${old}]`;
      item.querySelectorAll('[data-edit], [data-edit-image]').forEach((el) => {
        ['edit', 'editImage'].forEach((k) => {
          if (el.dataset[k]?.startsWith(from)) el.dataset[k] = `${base}[${i}]${el.dataset[k].slice(from.length)}`;
        });
      });
    }
    item.dataset.kasIndex = String(i);
  });
  const first = list.firstElementChild;
  if (first?.classList.contains('season-card')) [...list.children].forEach((c) => c.classList.toggle('season-card--feature', c === first));
}

function commitOrder(list) {
  const order = [...list.children].map((c) => Number(c.dataset.kasIndex));
  if (order.every((v, i) => v === i)) return;
  const path = list.dataset.editList;
  const current = getIn(state.draft, parsePath(path)) || [];
  update(path, order.map((i) => current[i]));
  renumber(list);
  positionChips();
  live.textContent = 'Order changed. Press Publish to save it.';
}

function startDrag(e, item, list) {
  if (e.button !== 0) return;
  const handle = e.currentTarget;
  const startX = e.clientX; const startY = e.clientY;
  let dragging = false;
  handle.setPointerCapture(e.pointerId);
  const move = (ev) => {
    if (!dragging && Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD) return;
    dragging = true;
    item.classList.add('kas-dragging');
    const over = document.elementsFromPoint(ev.clientX, ev.clientY).find((el) => el !== item && el.parentElement === list);
    if (!over) return;
    const r = over.getBoundingClientRect();
    const sameRow = ev.clientY > r.top && ev.clientY < r.bottom;
    const after = sameRow ? ev.clientX > r.left + r.width / 2 : ev.clientY > r.top + r.height / 2;
    list.insertBefore(item, after ? over.nextSibling : over);
    positionChips();
  };
  const up = () => {
    handle.removeEventListener('pointermove', move);
    handle.removeEventListener('pointerup', up);
    handle.removeEventListener('pointercancel', up);
    item.classList.remove('kas-dragging');
    if (dragging) commitOrder(list);
  };
  handle.addEventListener('pointermove', move);
  handle.addEventListener('pointerup', up);
  handle.addEventListener('pointercancel', up);
}

function onHandleKey(e, item, list) {
  const back = ['ArrowUp', 'ArrowLeft'].includes(e.key);
  const fwd = ['ArrowDown', 'ArrowRight'].includes(e.key);
  if (!back && !fwd) return;
  e.preventDefault();
  if (back && item.previousElementSibling) list.insertBefore(item, item.previousElementSibling);
  else if (fwd && item.nextElementSibling) list.insertBefore(item.nextElementSibling, item);
  else return;
  commitOrder(list);
  e.currentTarget.focus();
  live.textContent = `Moved to position ${[...list.children].indexOf(item) + 1} of ${list.children.length}.`;
}

function setupLists(on) {
  document.querySelectorAll('.kas-handle').forEach((el) => el.remove());
  document.querySelectorAll('[data-edit-list]').forEach((list) => {
    list.classList.toggle('kas-sortable', on);
    if (!on) return;
    [...list.children].forEach((item, i) => {
      item.dataset.kasIndex = String(i);
      const handle = h('button', {
        type: 'button', class: 'kas-handle', title: 'Drag to reorder (or use the arrow keys)',
        'aria-label': 'Reorder: press arrow keys to move',
      }, h('span', { 'aria-hidden': 'true' }, '⠿'));
      handle.addEventListener('pointerdown', (e) => startDrag(e, item, list));
      handle.addEventListener('keydown', (e) => onHandleKey(e, item, list));
      handle.addEventListener('click', (e) => e.preventDefault());
      item.prepend(handle);
    });
  });
}

// ---------- Edit mode ----------
function pauseLinks(e) {
  if (!state.editing) return;
  const a = e.target.closest('a[href]');
  if (a && !bar.contains(a)) {
    e.preventDefault();
    if (!e.target.closest('[data-edit]')) toast('Links are paused while editing. Press Done to browse the site.');
  }
}

function enterEdit() {
  state.editing = true;
  root.dataset.editing = '';
  setupText(true);
  setupLists(true);
  setupPhotos(true);
  refreshBar();
  try {
    if (!localStorage.getItem('kas-edit-tip')) {
      toast('Click any outlined text to change it, use “Change photo” on pictures, and drag ⠿ to reorder. Then press Publish.');
      localStorage.setItem('kas-edit-tip', '1');
    }
  } catch { /* storage blocked: skip the one-time tip */ }
}

function exitEdit() {
  state.editing = false;
  delete root.dataset.editing;
  setupText(false);
  setupLists(false);
  setupPhotos(false);
  refreshBar();
  if (isDirty()) toast('You still have unpublished changes. Press Publish to put them on the website.');
}

async function publish() {
  if (!isDirty() || state.saving) return;
  state.saving = true;
  refreshBar();
  try {
    const { content, version } = await api('PUT', '/api/content', { content: state.draft, version: state.version });
    Object.assign(state, { saved: content, draft: content, version });
    document.querySelectorAll('.kas-error').forEach((el) => el.classList.remove('kas-error'));
    toast('Published! Your changes are live.');
  } catch (err) {
    if (err.status === 422) {
      const errors = err.data.errors || [];
      const onPage = errors.filter((x) => {
        const els = document.querySelectorAll(`[data-edit="${CSS.escape(x.path)}"]`);
        els.forEach((el) => el.classList.add('kas-error'));
        return els.length > 0;
      });
      const first = errors[0]?.message || err.message;
      toast(onPage.length === errors.length ? `Not published yet: ${first}` : `Not published yet: ${first} (fix it in the Full editor)`, 'error');
    } else {
      toast(err.message, 'error');
    }
  } finally {
    state.saving = false;
    refreshBar();
  }
}

function discard() {
  if (!confirm('Throw away your unpublished changes on this page?')) return;
  state.draft = state.saved;
  location.reload();
}

// ---------- Start ----------
(async () => {
  try {
    const session = await api('GET', '/api/session');
    if (!session.authenticated) return;
    state.csrf = session.csrf;
    const { content, version } = await api('GET', '/api/content');
    Object.assign(state, { saved: content, draft: content, version });
  } catch {
    return; // not signed in or offline: show nothing
  }
  document.body.append(bar, chipLayer, toastEl);
  document.addEventListener('click', pauseLinks, true);
  addEventListener('scroll', positionChips, { passive: true });
  addEventListener('resize', positionChips);
  addEventListener('beforeunload', (e) => { if (isDirty()) e.preventDefault(); });
  document.addEventListener('dragenter', (e) => { if (state.editing && e.dataTransfer?.types.includes('Files')) root.classList.add('kas-files'); });
  // A photo dropped beside its target must not make the browser open the file (that would lose unsaved edits).
  document.addEventListener('dragover', (e) => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault(); });
  document.addEventListener('drop', (e) => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault(); root.classList.remove('kas-files'); });
  document.addEventListener('dragend', () => root.classList.remove('kas-files'));
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's' && isDirty()) { e.preventDefault(); publish(); }
  });
  refreshBar();
})();
