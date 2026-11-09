// Click-to-edit for the live preview INSIDE the staff editor (/admin → "Edit on the page").
// It only runs when the page is shown in the editor's frame; the server only adds the
// data-edit markers in that case, so public pages can never be edited.
//
// Markers: data-edit (text), data-edit-image (photos), data-edit-list (reorderable lists).
// Every change is sent to the editor with postMessage; the editor keeps the draft and
// its own "Publish changes" button publishes everything together.
import { h, icon, getIn, setIn, parsePath } from './dom.js';
import { prepareImage } from './images.js';

const root = document.documentElement;
const PLAINTEXT = (() => { const d = document.createElement('div'); d.contentEditable = 'plaintext-only'; return d.contentEditable === 'plaintext-only'; })();
const state = { draft: null, assetBase: '', uploads: {} };
const pendingUploads = new Map(); // id -> { resolve, reject }

/** "seasons[1].teams[0].name" -> "team name"; "home.heroTitle" -> "hero title" */
function labelFor(path) {
  const parts = parsePath(path).filter((p) => typeof p === 'string');
  const last = parts.at(-1) || 'text';
  const owner = parts.length > 2 ? `${parts.at(-2).replace(/s$/, '')} ` : '';
  return `${owner}${last.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()}`;
}

// ---------- Talking to the editor (parent window) ----------
const toEditor = (message) => window.parent.postMessage({ source: 'kas-preview', ...message }, location.origin);

function update(path, value) {
  state.draft = setIn(state.draft, parsePath(path), value);
  document.querySelectorAll(`[data-edit="${CSS.escape(path)}"].kas-error`).forEach((el) => el.classList.remove('kas-error'));
  toEditor({ type: 'change', path, value });
}

/** How to show a stored image path here (on GitHub Pages, new photos come straight from the repository). */
function displayUrl(path) {
  if (state.uploads[path]) return state.uploads[path];
  if (state.assetBase && /^\/uploads\//.test(path || '')) return `${state.assetBase}${path}`;
  return path;
}

/** The editor (parent window) holds the sign-in, so it does the actual upload. */
async function uploadImage(file) {
  const dataUrl = await prepareImage(file);
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const result = new Promise((resolve, reject) => pendingUploads.set(id, { resolve, reject }));
  toEditor({ type: 'upload', id, dataUrl });
  return result;
}

const toastEl = h('div', { class: 'kas-toast', role: 'status', hidden: true });
let toastTimer;
function toast(message, kind = 'ok') {
  toastEl.textContent = message;
  toastEl.dataset.kind = kind;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.hidden = true; }, kind === 'error' ? 8000 : 3500);
}
const live = h('p', { class: 'kas-sr', 'aria-live': 'polite' });

// ---------- Text ----------
/**
 * The text as stored, not as displayed. (innerText would apply CSS such as
 * text-transform: uppercase and save headlines in capitals.)
 */
function plainText(node) {
  if (node.nodeType === Node.TEXT_NODE) return node.nodeValue;
  if (node.nodeName === 'BR') return '\n';
  const inner = [...node.childNodes].map(plainText).join('');
  return /^(P|DIV|LI)$/.test(node.nodeName) ? `${inner}\n\n` : inner;
}

function readText(el) {
  const text = [...el.childNodes].map(plainText).join('').replace(/\r/g, '').replace(/\u00a0/g, ' ');
  return el.hasAttribute('data-edit-multiline')
    ? text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
    : text.replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

function setupText() {
  document.querySelectorAll('[data-edit]').forEach((el) => {
    el.contentEditable = PLAINTEXT ? 'plaintext-only' : 'true';
    el.spellcheck = true;
    el.setAttribute('role', 'textbox');
    el.setAttribute('aria-label', `Edit ${labelFor(el.dataset.edit)}`);
    if (el.hasAttribute('data-edit-multiline')) el.setAttribute('aria-multiline', 'true');
    el.addEventListener('input', () => update(el.dataset.edit, readText(el)));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') el.blur();
      if (e.key === 'Enter' && !el.hasAttribute('data-edit-multiline')) { e.preventDefault(); el.blur(); }
    });
    el.addEventListener('paste', (e) => {
      if (PLAINTEXT) return; // the browser already pastes plain text
      e.preventDefault();
      document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
    });
    el.addEventListener('blur', () => { if (!readText(el)) el.textContent = ''; }); // lets the placeholder show
  });
}

/** Show the editor's unpublished text and photos (the server rendered the published version). */
function applyDraft() {
  document.querySelectorAll('[data-edit]').forEach((el) => {
    const value = getIn(state.draft, parsePath(el.dataset.edit));
    if (typeof value !== 'string' || readText(el) === value) return;
    if (el.hasAttribute('data-edit-multiline')) {
      el.replaceChildren(...value.split(/\n\s*\n/).map((p) => h('p', {}, p)));
    } else {
      el.textContent = value;
    }
  });
  document.querySelectorAll('img[data-edit-image]').forEach((img) => {
    const value = getIn(state.draft, parsePath(img.dataset.editImage));
    if (!value || img.getAttribute('src')?.endsWith(value)) return; // already showing it (the page was built with it)
    img.removeAttribute('srcset');
    img.src = displayUrl(value);
  });
}

// ---------- Photos ----------
const chipLayer = h('div', { class: 'kas-chips' });
const chips = []; // [{ el, chip }]

async function replacePhoto(entry, file) {
  if (!file) return;
  entry.chip.classList.add('is-busy');
  try {
    const { url, display } = await uploadImage(file);
    let el = entry.el;
    if (el.tagName !== 'IMG') {
      const img = h('img', { class: [...el.classList].filter((c) => c !== 'photo-fallback' && c !== 'hero__bg--pattern').join(' '), alt: '', 'data-edit-image': el.dataset.editImage });
      el.replaceWith(img);
      entry.el = img;
      el = img;
    }
    el.removeAttribute('srcset');
    el.src = display;
    update(el.dataset.editImage, url);
    toast('Photo replaced.');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    entry.chip.classList.remove('is-busy');
    positionChips();
  }
}

function setupPhotos() {
  document.querySelectorAll('[data-edit-image]').forEach((el) => {
    const input = h('input', { type: 'file', accept: 'image/*', hidden: true });
    const chip = h('button', { type: 'button', class: 'kas-chip', hidden: true, 'aria-label': `Change photo: ${labelFor(el.dataset.editImage)}` },
      icon('image'), h('span', {}, 'Change photo'), input);
    const entry = { el, chip };
    chip.addEventListener('click', (e) => { if (e.target !== input) input.click(); });
    input.addEventListener('change', () => { replacePhoto(entry, input.files[0]); input.value = ''; });
    chip.addEventListener('dragover', (e) => { e.preventDefault(); chip.classList.add('is-drop'); });
    chip.addEventListener('dragleave', () => chip.classList.remove('is-drop'));
    chip.addEventListener('drop', (e) => { e.preventDefault(); chip.classList.remove('is-drop'); replacePhoto(entry, e.dataTransfer.files[0]); });
    chipLayer.append(chip);
    chips.push(entry);
  });
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
      if (visible) chip.style.transform = `translate(${Math.round(r.right - chip.offsetWidth - 12)}px, ${Math.round(top)}px)`;
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
  live.textContent = 'Order changed.';
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

function setupLists() {
  document.querySelectorAll('[data-edit-list]').forEach((list) => {
    list.classList.add('kas-sortable');
    [...list.children].forEach((item, i) => {
      item.dataset.kasIndex = String(i);
      const handle = h('button', { type: 'button', class: 'kas-handle', title: 'Drag to reorder (or use the arrow keys)', 'aria-label': 'Reorder: press arrow keys to move' },
        h('span', { 'aria-hidden': 'true' }, '⠿'));
      handle.addEventListener('pointerdown', (e) => startDrag(e, item, list));
      handle.addEventListener('click', (e) => e.preventDefault());
      handle.addEventListener('keydown', (e) => {
        const back = ['ArrowUp', 'ArrowLeft'].includes(e.key);
        const fwd = ['ArrowDown', 'ArrowRight'].includes(e.key);
        if (!back && !fwd) return;
        e.preventDefault();
        if (back && item.previousElementSibling) list.insertBefore(item, item.previousElementSibling);
        else if (fwd && item.nextElementSibling) list.insertBefore(item.nextElementSibling, item);
        else return;
        commitOrder(list);
        handle.focus();
        live.textContent = `Moved to position ${[...list.children].indexOf(item) + 1} of ${list.children.length}.`;
      });
      item.prepend(handle);
    });
  });
}

// ---------- Start (only inside the editor's frame) ----------
function start({ draft, assetBase = '', uploads = {} }) {
  Object.assign(state, { draft, assetBase, uploads });
  root.dataset.editing = '';
  applyDraft();
  setupText();
  setupLists();
  setupPhotos();
  document.body.append(chipLayer, toastEl, live);
  positionChips();

  // Links would leave the page being edited; the editor's page picker does navigation.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    e.preventDefault();
    if (!e.target.closest('[data-edit]')) toast('Links are paused here. Use “Page” above to switch pages.');
  }, true);
  addEventListener('scroll', positionChips, { passive: true });
  addEventListener('resize', positionChips);
  // A photo dropped beside its target must not make the browser open the file.
  document.addEventListener('dragenter', (e) => { if (e.dataTransfer?.types.includes('Files')) root.classList.add('kas-files'); });
  document.addEventListener('dragover', (e) => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault(); });
  document.addEventListener('drop', (e) => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault(); root.classList.remove('kas-files'); });
  document.addEventListener('dragend', () => root.classList.remove('kas-files'));
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); toEditor({ type: 'publish' }); }
  });
}

if (window.parent !== window) {
  addEventListener('message', (e) => {
    if (e.origin !== location.origin || e.source !== window.parent) return;
    const msg = e.data || {};
    if (msg.source !== 'kas-editor') return;
    if (msg.type === 'init' && !state.draft) start(msg);
    if (msg.type === 'uploaded' || msg.type === 'upload-failed') {
      const pending = pendingUploads.get(msg.id);
      pendingUploads.delete(msg.id);
      if (msg.type === 'uploaded') { state.uploads[msg.url] = msg.display; pending?.resolve(msg); }
      else pending?.reject(new Error(msg.message));
    }
    if (msg.type === 'errors') {
      document.querySelectorAll('.kas-error').forEach((el) => el.classList.remove('kas-error'));
      (msg.paths || []).forEach((p) => document.querySelectorAll(`[data-edit="${CSS.escape(p)}"]`).forEach((el) => el.classList.add('kas-error')));
    }
  });
  toEditor({ type: 'ready' });
}
