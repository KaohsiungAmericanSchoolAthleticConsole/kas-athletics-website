// Where the editor loads and saves content.
//
// - Server mode (npm start): talks to the Node server's /api.
// - GitHub mode (the site hosted on GitHub Pages): talks straight to the GitHub
//   API with a staff member's "editor key" (a GitHub personal access token).
//   Publishing commits data/content.json, which makes GitHub rebuild the site.
//
// Both return the same shapes, so the editor itself doesn't care which is used.

const NETWORK_ERROR = 'Can’t reach the internet right now. Check your connection and try again. Your changes are still here.';

const fail = (message, status, data = {}) => Object.assign(new Error(message), { status, data });

// ---------- Server mode ----------
export function createServerBackend({ onUnauthorized = () => {} } = {}) {
  let csrf = null;

  async function api(method, url, body) {
    let res;
    try {
      res = await fetch(url, {
        method, credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw fail(NETWORK_ERROR, 0);
    }
    let data = {};
    try { data = await res.json(); } catch { /* empty body */ }
    if (res.status === 401 && url !== '/api/login') onUnauthorized();
    if (!res.ok) throw fail(data.error || `Something went wrong (error ${res.status}).`, res.status, data);
    return data;
  }

  return {
    mode: 'server',
    api,
    siteUrl: '../',
    async session() {
      const s = await api('GET', '/api/session');
      csrf = s.csrf;
      return { authenticated: s.authenticated, username: s.username, needsSetup: s.needsSetup };
    },
    async login({ username, password }) {
      const res = await api('POST', '/api/login', { username, password });
      csrf = res.csrf;
      return { username: res.username };
    },
    async logout() { try { await api('POST', '/api/logout'); } finally { csrf = null; } },
    load: () => api('GET', '/api/content'),
    publish: (content, version) => api('PUT', '/api/content', { content, version }),
    async upload(dataUrl) { return (await api('POST', '/api/upload', { dataUrl })).url; },
    async history() { return (await api('GET', '/api/history')).versions; },
    async readVersion(id) { return (await api('GET', `/api/history/${encodeURIComponent(id)}`)).content; },
    changePassword: (current, next) => api('POST', '/api/password', { current, next }),
    imageUrl: (path) => path,
    assetBase: '',
    uploadCache: () => ({}),
    previewUrl: (pagePath) => `${pagePath}?admin-edit=1`,
  };
}

// ---------- GitHub mode ----------
const TOKEN_KEY = 'kas-editor-key';

export function utf8ToBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

export function base64ToUtf8(b64) {
  const binary = atob(String(b64).replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

function readToken(storage) {
  for (const store of [storage.session, storage.local]) {
    try { const t = store?.getItem(TOKEN_KEY); if (t) return t; } catch { /* storage blocked */ }
  }
  return null;
}

function saveToken(storage, token, remember) {
  try { storage.session?.removeItem(TOKEN_KEY); storage.local?.removeItem(TOKEN_KEY); } catch { /* ignore */ }
  if (!token) return; // signing out: nothing left behind
  try { (remember ? storage.local : storage.session)?.setItem(TOKEN_KEY, token); } catch { /* the key lasts this visit only */ }
}

/**
 * @param {{ owner: string, repo: string, branch?: string, base?: string,
 *   schema: object, validate: (schema: object, input: unknown) => { value: object, errors: object[] },
 *   fetchFn?: typeof fetch, storage?: { local?: Storage, session?: Storage }, random?: () => string,
 *   now?: () => Date }} opts
 */
export function createGithubBackend({
  owner, repo, branch = 'main', base = '', schema, validate, migrate = (x) => x,
  fetchFn = (...a) => fetch(...a), storage = { local: globalThis.localStorage, session: globalThis.sessionStorage },
  random = () => crypto.getRandomValues(new Uint32Array(3)).reduce((s, n) => s + n.toString(36), '').slice(0, 14),
  now = () => new Date(),
} = {}) {
  let token = readToken(storage);
  let login = null;
  const uploads = new Map(); // freshly uploaded path -> data URL (shown instantly, before GitHub has it)
  const repoPath = `/repos/${owner}/${repo}`;
  const CONTENT = 'data/content.json';

  async function gh(method, path, body) {
    if (!token) throw fail('Please sign in with your editor key.', 401);
    let res;
    try {
      res = await fetchFn(`https://api.github.com${path}`, {
        method,
        headers: {
          Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28',
          Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        cache: 'no-store',
      });
    } catch {
      throw fail(NETWORK_ERROR, 0);
    }
    let data = {};
    try { data = await res.json(); } catch { /* empty body */ }
    if (res.ok) return data;
    if (res.status === 401) throw fail('That editor key isn’t valid (it may have expired or been deleted). Please sign in with a new key.', 401);
    if (res.status === 409 || (res.status === 422 && /sha/i.test(data.message || ''))) {
      throw fail('Someone else published changes while you were editing. Your edits are still here: copy anything you need, then load the latest version.', 409);
    }
    if (res.status === 403 && /rate limit/i.test(data.message || '')) throw fail('GitHub is busy right now (too many requests). Please wait a few minutes and try again.', 429);
    if (res.status === 403 || res.status === 404) throw fail('This editor key doesn’t have permission to change the website. Ask for a key with access to the website’s repository.', 403);
    throw fail(`GitHub said: ${data.message || `error ${res.status}`}.`, res.status, data);
  }

  async function checkAccess() {
    const user = await gh('GET', '/user');
    const info = await gh('GET', repoPath);
    if (!info.permissions?.push) throw fail('This editor key can view the website but not change it. Ask for a key with write access.', 403);
    login = user.login;
    return login;
  }

  const normalize = (raw) => validate(schema, migrate(raw)).value;

  async function readFile(ref) {
    const file = await gh('GET', `${repoPath}/contents/${CONTENT}?ref=${encodeURIComponent(ref)}`);
    return { content: normalize(JSON.parse(base64ToUtf8(file.content))), sha: file.sha };
  }

  const rawBase = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/data`;

  return {
    mode: 'github',
    siteUrl: `${base}/`,
    repoUrl: `https://github.com/${owner}/${repo}`,
    async session() {
      if (!token) return { authenticated: false };
      try {
        return { authenticated: true, username: await checkAccess() };
      } catch (err) {
        if (err.status === 401 || err.status === 403) { token = null; saveToken(storage, '', false); }
        throw err;
      }
    },
    async login({ token: key, remember = true }) {
      const clean = String(key || '').trim();
      if (!clean) throw fail('Paste your editor key first.', 400);
      token = clean;
      try {
        const username = await checkAccess();
        saveToken(storage, clean, remember);
        return { username };
      } catch (err) {
        token = null;
        throw err;
      }
    },
    async logout() { token = null; login = null; saveToken(storage, '', false); },
    async load() {
      const { content, sha } = await readFile(branch);
      return { content, version: sha, schema };
    },
    async publish(content, version) {
      const { value, errors } = validate(schema, migrate(content));
      if (errors.length) throw fail('Please fix the highlighted fields.', 422, { errors });
      const res = await gh('PUT', `${repoPath}/contents/${CONTENT}`, {
        message: `Update website content (by ${login || 'staff'} in the editor)`,
        content: utf8ToBase64(`${JSON.stringify(value, null, 2)}\n`),
        sha: version, branch,
      });
      return { content: value, version: res.content.sha };
    },
    async upload(dataUrl) {
      const m = /^data:image\/(jpeg|png|webp|gif|avif);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl));
      if (!m) throw fail('Please choose a JPG, PNG, WebP or GIF photo.', 415);
      const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
      const path = `/uploads/${now().getFullYear()}/${random()}.${ext}`;
      // "[skip ci]": don't rebuild the site for every photo; the next publish includes it.
      await gh('PUT', `${repoPath}/contents/data${path}`, { message: `Add photo ${path} [skip ci]`, content: m[2], branch });
      uploads.set(path, dataUrl);
      return path;
    },
    async history() {
      const commits = await gh('GET', `${repoPath}/commits?path=${CONTENT}&sha=${encodeURIComponent(branch)}&per_page=30`);
      return commits.map((c) => ({ id: c.sha, savedAt: c.commit.author.date, author: c.author?.login || c.commit.author.name }));
    },
    async readVersion(id) { return (await readFile(id)).content; },
    imageUrl(path) {
      if (uploads.has(path)) return uploads.get(path);
      if (/^\/uploads\//.test(path || '')) return `${rawBase}${path}`;
      if (/^\/img\//.test(path || '')) return `${base}${path}`;
      return path;
    },
    assetBase: rawBase,
    uploadCache: () => Object.fromEntries(uploads),
    previewUrl: (pagePath) => `${base}/admin/preview${pagePath === '/' ? '/' : `${pagePath}/`}`,
    get username() { return login; },
  };
}
