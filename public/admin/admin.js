import { h, icon, getIn, setIn, pathToString, parsePath } from './dom.js';
import { renderField } from './fields.js';
import { prepareImage } from './images.js';
import { renderHelp, renderAccounts } from './pages.js';
import { renderVisual, visualFrame } from './visual.js';
import { createServerBackend, createGithubBackend } from './backend.js';

const $ = (sel) => document.querySelector(sel);
const state = {
  username: null, schema: null, saved: null, draft: null, version: null,
  section: null, errors: new Map(), open: new Set(), saving: false,
};
let backend; // set at start: local server, or GitHub when hosted on GitHub Pages

// Extra pages in the sidebar that are not part of the content schema.
const EXTRA_PAGES = {
  visual: {
    label: 'Edit on the page', icon: 'pencil', top: true,
    help: 'Click any outlined text to type, use “Change photo” on pictures, drag ⠿ to reorder. Then press Publish changes.',
    render: () => renderVisual(state, backend),
  },
  accounts: { label: 'Staff accounts', icon: 'people', help: 'Who can sign in to this editor.', render: (ctx2) => renderAccounts(backend, ctx2) },
  help: { label: 'Help', icon: 'link', help: 'A quick guide to updating the website.', render: () => renderHelp() },
};

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
    const url = await backend.upload(dataUrl);
    toast('Photo uploaded. Press “Publish changes” to put it on the website.');
    return url;
  },
  imageUrl: (path) => backend.imageUrl(path),
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
    ...Object.entries(EXTRA_PAGES).filter(([, p]) => p.top).map(([key, p]) => link(key, p.label, p.icon, false)),
    h('li', { class: 'sidebar__sep', 'aria-hidden': 'true' }),
    ...sections().map((f) => link(f.key, f.label, f.icon || 'settings', [...state.errors.keys()].some(pathPrefix(f.key)))),
    h('li', { class: 'sidebar__sep', 'aria-hidden': 'true' }),
    ...Object.entries(EXTRA_PAGES).filter(([, p]) => !p.top).map(([key, p]) => link(key, p.label, p.icon, false)),
  );
}

function renderEditor({ keepScroll = false } = {}) {
  const y = window.scrollY;
  const extra = EXTRA_PAGES[state.section];
  if (extra) {
    $('#section-title').textContent = extra.label;
    $('#section-help').textContent = extra.help;
    $('#editor').replaceChildren(h('div', { class: 'panel' }, extra.render({ toast, username: state.username })));
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

/** Re-render, except on the live preview where a re-render would reload the page being edited. */
function refreshView(opts) {
  if (state.section !== 'visual') renderEditor(opts);
  else renderNav();
}

// Messages from the live preview frame ("Edit on the page").
window.addEventListener('message', (e) => {
  const frame = visualFrame();
  if (e.origin !== location.origin || !frame || e.source !== frame.contentWindow) return;
  const msg = e.data || {};
  if (msg.source !== 'kas-preview') return;
  const reply = (data) => frame.contentWindow.postMessage({ source: 'kas-editor', ...data }, location.origin);
  if (msg.type === 'ready') reply({ type: 'init', draft: state.draft, assetBase: backend.assetBase, uploads: backend.uploadCache() });
  if (msg.type === 'change') ctx.set(parsePath(msg.path), msg.value);
  if (msg.type === 'publish') publish();
  if (msg.type === 'upload') {
    backend.upload(msg.dataUrl)
      .then((url) => reply({ type: 'uploaded', id: msg.id, url, display: backend.imageUrl(url) }))
      .catch((err) => reply({ type: 'upload-failed', id: msg.id, message: err.message }));
  }
});

function sendErrorsToPreview() {
  visualFrame()?.contentWindow.postMessage({ source: 'kas-editor', type: 'errors', paths: [...state.errors.keys()] }, location.origin);
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
    const { content, version } = await backend.publish(state.draft, state.version);
    Object.assign(state, { saved: content, draft: content, version, errors: new Map() });
    renderErrorSummary([]);
    refreshView({ keepScroll: true });
    sendErrorsToPreview();
    toast(backend.mode === 'github'
      ? 'Published! The website updates in about a minute.'
      : 'Published! Your changes are live on the website.');
  } catch (err) {
    if (err.status === 422) {
      state.errors = new Map(err.data.errors.map((e) => [e.path, e.message]));
      refreshView({ keepScroll: true });
      sendErrorsToPreview();
      renderErrorSummary(err.data.errors);
    } else if (err.status === 409) {
      renderErrorSummary([], {
        title: err.message,
        action: h('p', {}, h('button', { type: 'button', class: 'btn btn--ghost btn--sm', onclick: reloadLatest }, 'Load the latest version (discards my edits)')),
      });
    } else {
      if (err.status === 401) showLogin(err.message);
      toast(err.message, 'error');
    }
  } finally {
    state.saving = false;
    updateSaveState();
  }
}

async function reloadLatest() {
  if (isDirty() && !confirm('Load the latest published version? Your unpublished edits will be lost.')) return;
  const { content, version } = await backend.load();
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
    const versions = await backend.history();
    const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    list.replaceChildren(...(versions.length ? versions.map((v) => h('li', {},
      h('span', {}, h('strong', {}, fmt.format(new Date(v.savedAt))), h('span', { class: 'muted small' }, ` · ${backend.mode === 'github' ? 'published' : 'replaced'} by ${v.author}`)),
      h('button', { type: 'button', class: 'btn btn--ghost btn--sm', onclick: async () => {
        if (isDirty() && !confirm('Loading this version will replace your unpublished changes. Continue?')) return;
        try {
          state.draft = await backend.readVersion(v.id);
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
  const github = backend?.mode === 'github';
  $('#login-form').hidden = github;
  $('#gh-login-form').hidden = !github;
  const err = $(github ? '#gh-login-error' : '#login-error');
  err.hidden = !message;
  err.textContent = message || '';
  (github ? $('#gh-login-form [name=token]') : $('#login-form [name=username]')).focus();
}

async function showApp() {
  const { content, version, schema } = await backend.load();
  // If the session ended mid-edit, keep the unpublished work. We also keep the
  // version it was based on, so publishing can't silently overwrite someone else.
  const keepDraft = isDirty();
  Object.assign(state, keepDraft ? { schema } : { schema, saved: content, draft: content, version });
  if (keepDraft) toast('Welcome back — your unpublished changes are still here.');
  state.section = location.hash.slice(1) || 'visual';
  $('#login-view').hidden = true;
  $('#app-view').hidden = false;
  $('#whoami').textContent = `(${state.username})`;
  $('#password-btn').hidden = backend.mode === 'github'; // GitHub mode signs in with editor keys, not passwords
  document.querySelectorAll('[data-site-link]').forEach((a) => { a.href = backend.siteUrl; });
  renderEditor();
  updateSaveState();
}

// ---------- Wiring ----------
async function signIn(e, credentials) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Signing in…';
  try {
    const res = await backend.login(credentials());
    state.username = res.username;
    e.target.reset();
    await showApp();
  } catch (err) {
    const box = e.target.querySelector('.form-error');
    box.textContent = err.message;
    box.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = label;
  }
}

$('#login-form').addEventListener('submit', (e) => {
  const form = new FormData(e.target);
  return signIn(e, () => ({ username: String(form.get('username')).trim(), password: form.get('password') }));
});
$('#gh-login-form').addEventListener('submit', (e) => {
  const form = new FormData(e.target);
  return signIn(e, () => ({ token: form.get('token'), remember: form.get('remember') === 'on' }));
});

$('#save-btn').addEventListener('click', publish);
$('#discard-btn').addEventListener('click', discard);
$('#history-btn').addEventListener('click', openHistory);
$('#logout-btn').addEventListener('click', async () => {
  if (isDirty() && !confirm('You have unpublished changes. Sign out and lose them?')) return;
  try { await backend.logout(); } catch { /* signing out locally is enough */ }
  Object.assign(state, { draft: null, saved: null });
  showLogin();
});

$('#password-btn').addEventListener('click', () => { $('#password-form').reset(); $('#password-error').hidden = true; $('#password-dialog').showModal(); });
$('#password-dialog [data-close]').addEventListener('click', () => $('#password-dialog').close());
$('#password-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  try {
    await backend.changePassword(form.get('current'), form.get('next'));
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
async function chooseBackend() {
  // The GitHub Pages build ships admin/config.json; the local server has none.
  let config = null;
  try {
    const res = await fetch(new URL('config.json', import.meta.url), { cache: 'no-store' });
    if (res.ok) config = await res.json();
  } catch { /* no config: local server */ }
  if (config?.mode !== 'github') return createServerBackend({ onUnauthorized: () => showLogin('Your session ended. Please sign in again — your unpublished changes are kept.') });
  const [{ SCHEMA }, { validateContent }] = await Promise.all([import('./lib/schema.js'), import('./lib/validate.js')]);
  return createGithubBackend({ ...config, schema: SCHEMA, validate: validateContent });
}

(async () => {
  try {
    backend = await chooseBackend();
    document.documentElement.dataset.mode = backend.mode;
    const session = await backend.session();
    $('#setup-notice').hidden = !session.needsSetup;
    if (session.authenticated) {
      state.username = session.username;
      await showApp();
    } else {
      showLogin();
    }
  } catch (err) {
    showLogin(err.message);
  }
})();
