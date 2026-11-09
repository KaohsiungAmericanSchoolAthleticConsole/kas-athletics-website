import { h, icon, getIn, setIn, pathToString } from './dom.js';
import { renderField } from './fields.js';
import { prepareImage } from './images.js';
import { renderHelp, renderAccounts } from './pages.js';

const $ = (sel) => document.querySelector(sel);
const state = {
  csrf: null, username: null, schema: null, saved: null, draft: null, version: null,
  section: null, errors: new Map(), open: new Set(), saving: false,
};

// Extra pages in the sidebar that are not part of the content schema.
const EXTRA_PAGES = {
  accounts: { label: 'Staff accounts', icon: 'people', help: 'Who can sign in to this editor.', render: (api, ctx2) => renderAccounts(api, ctx2) },
  help: { label: 'Help', icon: 'link', help: 'A quick guide to updating the website.', render: () => renderHelp() },
};

// ---------- API ----------
async function api(method, url, body) {
  let res;
  try {
    res = await fetch(url, {
      method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(state.csrf ? { 'X-CSRF-Token': state.csrf } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw Object.assign(new Error('Can’t reach the website right now. Check your internet connection and try again. Your changes are still here.'), { status: 0 });
  }
  let data = {};
  try { data = await res.json(); } catch { /* empty body */ }
  if (res.status === 401 && url !== '/api/login') showLogin('Your session ended. Please sign in again — your unpublished changes are kept.');
  if (!res.ok) throw Object.assign(new Error(data.error || `Something went wrong (error ${res.status}).`), { status: res.status, data });
  return data;
}

// ---------- Helpers ----------
const isDirty = () => state.draft !== null && JSON.stringify(state.draft) !== JSON.stringify(state.saved);
const sections = () => state.schema.fields;
const currentField = () => sections().find((f) => f.key === state.section) || sections()[0];
const pathPrefix = (key) => (k) => k === key || k.startsWith(`${key}.`) || k.startsWith(`${key}[`);

let toastTimer;
function toast(message, kind = 'ok') {
  const el = $('#toast');
  el.textContent = message;
  el.dataset.kind = kind;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, kind === 'error' ? 8000 : 4000);
}

function updateSaveState() {
  const dirty = isDirty();
  $('#save-btn').disabled = !dirty || state.saving;
  $('#save-btn').textContent = state.saving ? 'Publishing…' : 'Publish changes';
  $('#discard-btn').hidden = !dirty || state.saving;
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
    // Positions in the list changed: forget which old positions were open.
    const listKey = pathToString(path);
    [...state.open].filter((k) => k.startsWith(`${listKey}[`)).forEach((k) => state.open.delete(k));
    if (open) state.open.add(pathToString(open));
    renderEditor({ keepScroll: true });
    updateSaveState();
    if (focus && open) {
      const sel = CSS.escape(pathToString(open));
      document.querySelector(`[data-path^="${sel}"] input:not([type=file]), [data-path^="${sel}"] select, [data-path^="${sel}"] textarea`)?.focus();
    }
  },
  async upload(file) {
    const dataUrl = await prepareImage(file);
    const { url } = await api('POST', '/api/upload', { dataUrl });
    toast('Photo uploaded. Press “Publish changes” to put it on the website.');
    return url;
  },
  errorFor: (path) => state.errors.get(pathToString(path)),
  hasErrorWithin: (path) => [...state.errors.keys()].some(pathPrefix(pathToString(path))),
  isOpen: (path) => state.open.has(pathToString(path)),
  setOpen: (path, open) => { if (open) state.open.add(pathToString(path)); else state.open.delete(pathToString(path)); },
  /** All team names from the Sports pages, for the Team dropdown. */
  teamNames: () => [...new Set((state.draft.seasons || []).flatMap((s) => (s.teams || []).map((t) => t.name)).filter(Boolean))].sort(),
  /** Values already used for this field in sibling list items (e.g. every opponent typed before). */
  siblingValues(path) {
    const key = path.at(-1);
    const list = getIn(state.draft, path.slice(0, -2)) || [];
    return [...new Set(list.map((item) => item?.[key]).filter(Boolean))].sort();
  },
  /** Copy a related field (e.g. the logo) from another item with the same value, if this one is empty. */
  autofill(path, targetKey) {
    const key = path.at(-1);
    const itemPath = path.slice(0, -1);
    const item = getIn(state.draft, itemPath) || {};
    if (!item[key] || item[targetKey]) return;
    const list = getIn(state.draft, path.slice(0, -2)) || [];
    const match = list.find((other) => other !== item && other?.[key]?.toLowerCase() === item[key].toLowerCase() && other?.[targetKey]);
    if (match) {
      ctx.restructure([...itemPath, targetKey], match[targetKey], { open: itemPath });
      toast(`Reused the logo from an earlier ${item[key]} game.`);
    }
  },
};

// ---------- Rendering ----------
function renderNav() {
  const link = (key, label, iconName, hasErrors) => h('li', {},
    h('a', { href: `#${key}`, class: `sidebar__link${key === state.section ? ' is-active' : ''}`, 'aria-current': key === state.section ? 'page' : false },
      icon(iconName), h('span', {}, label),
      hasErrors ? h('span', { class: 'dot', title: 'Needs attention' }, h('span', { class: 'sr-only' }, ' (needs attention)')) : null));
  $('#section-nav').replaceChildren(
    ...sections().map((f) => link(f.key, f.label, f.icon || 'settings', [...state.errors.keys()].some(pathPrefix(f.key)))),
    h('li', { class: 'sidebar__sep', 'aria-hidden': 'true' }),
    ...Object.entries(EXTRA_PAGES).map(([key, p]) => link(key, p.label, p.icon, false)),
  );
}

function renderEditor({ keepScroll = false } = {}) {
  const y = window.scrollY;
  const extra = EXTRA_PAGES[state.section];
  if (extra) {
    $('#section-title').textContent = extra.label;
    $('#section-help').textContent = extra.help;
    $('#editor').replaceChildren(h('div', { class: 'panel' }, extra.render(api, { toast, username: state.username })));
  } else {
    const field = currentField();
    state.section = field.key;
    $('#section-title').textContent = field.label;
    $('#section-help').textContent = field.help || '';
    const body = field.type === 'list' ? renderField(field, [field.key], ctx, { top: true }) : renderField(field, [field.key], ctx);
    $('#editor').replaceChildren(h('div', { class: 'panel' }, body));
  }
  renderNav();
  if (keepScroll) window.scrollTo(0, y);
}

function renderErrorSummary(errors, { title = 'Nothing was published yet. Please fix these:', action = null } = {}) {
  const box = $('#error-summary');
  if (!errors.length && !action) { box.hidden = true; return; }
  const sectionOf = (path) => sections().find((f) => pathPrefix(f.key)(path));
  box.replaceChildren(
    h('strong', {}, title),
    errors.length ? h('ul', {}, errors.slice(0, 12).map((e) => {
      const sec = sectionOf(e.path);
      return h('li', {}, h('a', { href: `#${sec?.key || ''}` }, `${sec?.label || 'Field'}: `), e.message);
    })) : null,
    action);
  box.hidden = false;
  box.focus();
}

// ---------- Actions ----------
async function publish() {
  if (!isDirty() || state.saving) return;
  state.saving = true;
  updateSaveState();
  try {
    const { content, version } = await api('PUT', '/api/content', { content: state.draft, version: state.version });
    Object.assign(state, { saved: content, draft: content, version, errors: new Map() });
    renderErrorSummary([]);
    renderEditor({ keepScroll: true });
    toast('Published! Your changes are live on the website.');
  } catch (err) {
    if (err.status === 422) {
      state.errors = new Map(err.data.errors.map((e) => [e.path, e.message]));
      renderEditor({ keepScroll: true });
      renderErrorSummary(err.data.errors);
    } else if (err.status === 409) {
      renderErrorSummary([], {
        title: err.message,
        action: h('p', {}, h('button', { type: 'button', class: 'btn btn--ghost btn--sm', onclick: reloadLatest }, 'Load the latest version (discards my edits)')),
      });
    } else {
      toast(err.message, 'error');
    }
  } finally {
    state.saving = false;
    updateSaveState();
  }
}

async function reloadLatest() {
  if (isDirty() && !confirm('Load the latest published version? Your unpublished edits will be lost.')) return;
  const { content, version } = await api('GET', '/api/content');
  Object.assign(state, { saved: content, draft: content, version, errors: new Map() });
  renderErrorSummary([]);
  renderEditor();
  updateSaveState();
  toast('Loaded the latest version.');
}

function discard() {
  if (!confirm('Throw away all changes since the last publish?')) return;
  state.draft = state.saved;
  state.errors = new Map();
  renderErrorSummary([]);
  renderEditor({ keepScroll: true });
  updateSaveState();
  toast('Changes discarded.');
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
        try {
          const { content } = await api('GET', `/api/history/${encodeURIComponent(v.id)}`);
          state.draft = content;
          $('#history-dialog').close();
          renderEditor();
          updateSaveState();
          toast('Old version loaded. Press “Publish changes” to bring it back.');
        } catch (err) { toast(err.message, 'error'); }
      } }, 'Load this version'))) : [h('li', { class: 'muted' }, 'No earlier versions yet. They appear after the first publish.')]));
  } catch (err) {
    list.replaceChildren(h('li', { class: 'form-error' }, err.message));
  }
}

function showLogin(message) {
  $('#app-view').hidden = true;
  $('#login-view').hidden = false;
  document.querySelectorAll('dialog[open]').forEach((d) => d.close());
  const err = $('#login-error');
  err.hidden = !message;
  err.textContent = message || '';
  $('#login-form [name=username]').focus();
}

async function showApp() {
  const { content, version, schema } = await api('GET', '/api/content');
  // If the session ended mid-edit, keep the unpublished work. We also keep the
  // version it was based on, so publishing can't silently overwrite someone else.
  const keepDraft = isDirty();
  Object.assign(state, keepDraft ? { schema } : { schema, saved: content, draft: content, version });
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
  btn.textContent = 'Signing in…';
  try {
    const res = await api('POST', '/api/login', { username: String(form.get('username')).trim(), password: form.get('password') });
    state.csrf = res.csrf;
    state.username = res.username;
    e.target.reset();
    await showApp();
  } catch (err) {
    $('#login-error').textContent = err.message;
    $('#login-error').hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign in';
  }
});

$('#save-btn').addEventListener('click', publish);
$('#discard-btn').addEventListener('click', discard);
$('#history-btn').addEventListener('click', openHistory);
$('#logout-btn').addEventListener('click', async () => {
  if (isDirty() && !confirm('You have unpublished changes. Sign out and lose them?')) return;
  try { await api('POST', '/api/logout'); } catch { /* signing out locally is enough */ }
  Object.assign(state, { csrf: null, draft: null, saved: null });
  showLogin();
});

$('#password-btn').addEventListener('click', () => { $('#password-form').reset(); $('#password-error').hidden = true; $('#password-dialog').showModal(); });
$('#password-dialog [data-close]').addEventListener('click', () => $('#password-dialog').close());
$('#password-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  try {
    await api('POST', '/api/password', { current: form.get('current'), next: form.get('next') });
    $('#password-dialog').close();
    showLogin('Password changed. Please sign in with your new password.');
  } catch (err) {
    $('#password-error').textContent = err.message;
    $('#password-error').hidden = false;
  }
});

$('#editor').addEventListener('submit', (e) => e.preventDefault());

window.addEventListener('hashchange', () => {
  if (!state.schema) return;
  state.section = location.hash.slice(1);
  renderEditor();
  window.scrollTo(0, 0);
});
window.addEventListener('beforeunload', (e) => { if (isDirty()) e.preventDefault(); });
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
