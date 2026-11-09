import { h, icon, getIn, setIn, pathToString } from './dom.js';
import { renderField } from './fields.js';
import { prepareImage } from './images.js';

const $ = (sel) => document.querySelector(sel);
const state = {
  csrf: null, username: null, schema: null, saved: null, draft: null,
  section: null, errors: new Map(), open: new Set(), saving: false,
};

// ---------- API ----------
async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(state.csrf ? { 'X-CSRF-Token': state.csrf } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = {};
  try { data = await res.json(); } catch { /* empty body */ }
  if (res.status === 401 && url !== '/api/login') { showLogin('Your session ended. Please sign in again.'); }
  if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status, data });
  return data;
}

// ---------- Helpers ----------
const isDirty = () => JSON.stringify(state.draft) !== JSON.stringify(state.saved);
const sections = () => state.schema.fields;
const currentField = () => sections().find((f) => f.key === state.section) || sections()[0];

let toastTimer;
function toast(message, kind = 'ok') {
  const el = $('#toast');
  el.textContent = message;
  el.dataset.kind = kind;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3500);
}

function updateSaveState() {
  const dirty = isDirty();
  $('#save-btn').disabled = !dirty || state.saving;
  $('#save-btn').textContent = state.saving ? 'Publishing…' : 'Publish changes';
  $('#save-state').textContent = dirty ? 'Unpublished changes' : 'All changes are live';
  $('#save-state').classList.toggle('is-dirty', dirty);
}

const ctx = {
  get: (path) => getIn(state.draft, path),
  set(path, value) {
    state.draft = setIn(state.draft, path, value);
    const key = pathToString(path);
    if (state.errors.has(key)) {
      state.errors.delete(key);
      document.querySelector(`[data-path="${CSS.escape(key)}"]`)?.classList.remove('has-error');
    }
    updateSaveState();
  },
  restructure(path, value, { open, focus } = {}) {
    state.draft = setIn(state.draft, path, value);
    if (open) state.open.add(pathToString(open));
    renderEditor({ keepScroll: true });
    updateSaveState();
    if (focus && open) {
      document.querySelector(`[data-path^="${CSS.escape(pathToString(open))}"] input, [data-path^="${CSS.escape(pathToString(open))}"] textarea`)?.focus();
    }
  },
  async upload(file) {
    const dataUrl = await prepareImage(file);
    const { url } = await api('POST', '/api/upload', { dataUrl });
    toast('Photo uploaded. Publish to make it live.');
    return url;
  },
  errorFor: (path) => state.errors.get(pathToString(path)),
  hasErrorWithin: (path) => {
    const prefix = pathToString(path);
    return [...state.errors.keys()].some((k) => k === prefix || k.startsWith(`${prefix}.`) || k.startsWith(`${prefix}[`));
  },
  isOpen: (path) => state.open.has(pathToString(path)),
  setOpen: (path, open) => { if (open) state.open.add(pathToString(path)); else state.open.delete(pathToString(path)); },
};

// ---------- Rendering ----------
function sectionHasErrors(key) {
  return [...state.errors.keys()].some((k) => k === key || k.startsWith(`${key}.`) || k.startsWith(`${key}[`));
}

function renderNav() {
  $('#section-nav').replaceChildren(...sections().map((f) => h('li', {},
    h('a', {
      href: `#${f.key}`, class: `sidebar__link${f.key === state.section ? ' is-active' : ''}`,
      'aria-current': f.key === state.section ? 'page' : false,
    }, icon(f.icon || 'settings'), h('span', {}, f.label),
    sectionHasErrors(f.key) ? h('span', { class: 'dot', title: 'Needs attention' }, h('span', { class: 'sr-only' }, ' (needs attention)')) : null))));
}

function renderEditor({ keepScroll = false } = {}) {
  const field = currentField();
  state.section = field.key;
  const y = window.scrollY;
  $('#section-title').textContent = field.label;
  $('#section-help').textContent = field.help || '';
  const body = field.type === 'list'
    ? renderField(field, [field.key], ctx, { top: true })
    : renderField(field, [field.key], ctx);
  $('#editor').replaceChildren(h('div', { class: 'panel' }, body));
  renderNav();
  if (keepScroll) window.scrollTo(0, y);
}

function renderErrorSummary(errors) {
  const box = $('#error-summary');
  if (!errors.length) { box.hidden = true; return; }
  const sectionLabel = (path) => sections().find((f) => path === f.key || path.startsWith(`${f.key}.`) || path.startsWith(`${f.key}[`));
  box.replaceChildren(
    h('strong', {}, 'Nothing was published yet. Please fix these:'),
    h('ul', {}, errors.slice(0, 12).map((e) => {
      const sec = sectionLabel(e.path);
      return h('li', {}, h('a', { href: `#${sec?.key || ''}` }, `${sec?.label || 'Field'}: `), e.message);
    })));
  box.hidden = false;
  box.focus();
}

// ---------- Actions ----------
async function publish() {
  if (!isDirty() || state.saving) return;
  state.saving = true;
  updateSaveState();
  try {
    const { content } = await api('PUT', '/api/content', { content: state.draft });
    state.saved = content;
    state.draft = content;
    state.errors = new Map();
    renderErrorSummary([]);
    renderEditor({ keepScroll: true });
    toast('Published! Your changes are live on the website.');
  } catch (err) {
    if (err.status === 422) {
      state.errors = new Map(err.data.errors.map((e) => [e.path, e.message]));
      renderEditor({ keepScroll: true });
      renderErrorSummary(err.data.errors);
    } else {
      toast(err.message, 'error');
    }
  } finally {
    state.saving = false;
    updateSaveState();
  }
}

async function openHistory() {
  const list = $('#history-list');
  list.replaceChildren(h('li', { class: 'muted' }, 'Loading…'));
  $('#history-dialog').showModal();
  try {
    const { versions } = await api('GET', '/api/history');
    const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    list.replaceChildren(...(versions.length ? versions.map((v) => h('li', {},
      h('span', {}, h('strong', {}, fmt.format(new Date(v.savedAt))), h('span', { class: 'muted small' }, ` · replaced by ${v.author}`)),
      h('button', { type: 'button', class: 'btn btn--ghost btn--sm', onclick: async () => {
        if (isDirty() && !confirm('Loading this version will replace your unpublished changes. Continue?')) return;
        const { content } = await api('GET', `/api/history/${encodeURIComponent(v.id)}`);
        state.draft = content;
        $('#history-dialog').close();
        renderEditor();
        updateSaveState();
        toast('Old version loaded. Press “Publish changes” to bring it back.');
      } }, 'Load this version'))) : [h('li', { class: 'muted' }, 'No earlier versions yet.')]));
  } catch (err) {
    list.replaceChildren(h('li', { class: 'form-error' }, err.message));
  }
}

function showLogin(message) {
  $('#app-view').hidden = true;
  $('#login-view').hidden = false;
  const err = $('#login-error');
  err.hidden = !message;
  err.textContent = message || '';
  $('#login-form [name=username]').focus();
}

async function showApp() {
  const { content, schema } = await api('GET', '/api/content');
  // If the session ended mid-edit, keep the unpublished work instead of discarding it.
  const keepDraft = state.draft && state.saved && isDirty();
  Object.assign(state, { schema, saved: content, draft: keepDraft ? state.draft : content });
  if (keepDraft) toast('Welcome back — your unpublished changes are still here.');
  state.section = location.hash.slice(1) || schema.fields[0].key;
  $('#login-view').hidden = true;
  $('#app-view').hidden = false;
  $('#whoami').textContent = `(${state.username})`;
  renderEditor();
  updateSaveState();
}

// ---------- Wiring ----------
$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;
  try {
    const res = await api('POST', '/api/login', { username: form.get('username'), password: form.get('password') });
    state.csrf = res.csrf;
    state.username = res.username;
    e.target.reset();
    await showApp();
  } catch (err) {
    $('#login-error').textContent = err.message;
    $('#login-error').hidden = false;
  } finally {
    btn.disabled = false;
  }
});

$('#save-btn').addEventListener('click', publish);
$('#history-btn').addEventListener('click', openHistory);
$('#logout-btn').addEventListener('click', async () => {
  if (isDirty() && !confirm('You have unpublished changes. Sign out anyway?')) return;
  await api('POST', '/api/logout');
  state.csrf = null;
  state.saved = state.draft;
  showLogin();
});

$('#password-btn').addEventListener('click', () => $('#password-dialog').showModal());
$('#password-dialog [data-close]').addEventListener('click', () => $('#password-dialog').close());
$('#password-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  try {
    await api('POST', '/api/password', { current: form.get('current'), next: form.get('next') });
    $('#password-dialog').close();
    state.saved = state.draft;
    showLogin('Password changed. Please sign in with your new password.');
  } catch (err) {
    $('#password-error').textContent = err.message;
    $('#password-error').hidden = false;
  }
});

// Keep list item headings in sync while typing a name/title.
$('#editor').addEventListener('input', (e) => {
  const details = e.target.closest('details.item');
  const fieldPath = e.target.closest('[data-path]')?.dataset.path || '';
  if (details && /\.(name|title|label)$/.test(fieldPath) && details.querySelector('[data-path]') === e.target.closest('[data-path]')) {
    details.querySelector('.item__title').textContent = e.target.value || 'Untitled';
  }
});
$('#editor').addEventListener('submit', (e) => e.preventDefault());

window.addEventListener('hashchange', () => {
  if (!state.schema) return;
  state.section = location.hash.slice(1);
  renderEditor();
  window.scrollTo(0, 0);
});
window.addEventListener('beforeunload', (e) => { if (state.draft && isDirty()) e.preventDefault(); });
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); publish(); }
});

// ---------- Start ----------
(async () => {
  try {
    const session = await api('GET', '/api/session');
    $('#setup-notice').hidden = !session.needsSetup;
    if (session.authenticated) {
      state.csrf = session.csrf;
      state.username = session.username;
      await showApp();
    } else {
      showLogin();
    }
  } catch (err) {
    showLogin(err.message);
  }
})();
