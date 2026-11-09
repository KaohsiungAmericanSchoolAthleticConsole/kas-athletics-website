// The whole website as one request handler. server.js just starts it.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { SCHEMA } from './schema.js';
import { validateContent } from './lib/validate.js';
import { createStore } from './lib/store.js';
import { createAuth, verifyPassword, MIN_PASSWORD_LENGTH } from './lib/auth.js';
import { saveImage, MAX_UPLOAD_BYTES } from './lib/uploads.js';
import { homePage, seasonPage, eventsPage, coachesPage, contactPage, notFoundPage } from './render/pages.js';
import { teamPage, findTeam } from './render/team.js';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
};

const CSP = [
  "default-src 'self'", "script-src 'self'", "style-src 'self'",
  "font-src 'self'", "img-src 'self' https: data: blob:",
  'frame-src https://www.youtube-nocookie.com https://calendar.google.com', "connect-src 'self'",
  "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
].join('; ');

export function brandCssText(site = {}) {
  const hex = (v, fallback) => (/^#[0-9a-f]{6}$/i.test(v || '') ? v : fallback);
  return `:root{--brand:${hex(site.brandColor, '#c8102e')};--brand-2:${hex(site.brandColor2, '#14234b')}}\n`;
}

const JSON_LIMIT = 2 * 1024 * 1024;
const UPLOAD_LIMIT = Math.ceil(MAX_UPLOAD_BYTES * 1.4);
const COOKIE = 'kas_session';

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function securityHeaders(res, secure) {
  res.setHeader('Content-Security-Policy', CSP);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

function send(res, status, body, type = 'text/html; charset=utf-8', extra = {}) {
  res.writeHead(status, { 'Content-Type': type, ...extra });
  res.end(body);
}

const sendJson = (res, status, data, extra = {}) =>
  send(res, status, JSON.stringify(data), 'application/json; charset=utf-8', { 'Cache-Control': 'no-store', ...extra });

async function readJson(req, limit) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new HttpError(413, 'That request is too large.');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw new HttpError(400, 'Could not read the request.');
  }
}

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map((p) => p.trim().split('=')).filter(([k, v]) => k && v).map(([k, v]) => [k, decodeURIComponent(v)]));
}

async function serveFile(res, root, relPath, cache) {
  const rootAbs = path.resolve(root);
  const file = path.resolve(rootAbs, `.${path.posix.normalize(`/${relPath}`)}`);
  if (!file.startsWith(rootAbs + path.sep)) return false;
  try {
    const stat = await fs.stat(file);
    if (!stat.isFile()) return false;
    const data = await fs.readFile(file);
    send(res, 200, data, TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', { 'Cache-Control': cache });
    return true;
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'EISDIR' || err.code === 'ENOTDIR') return false;
    throw err;
  }
}

/**
 * @param {{ rootDir: string, dataDir?: string, logger?: Pick<Console, 'error' | 'info'> }} opts
 */
export function createApp({ rootDir, dataDir = path.join(rootDir, 'data'), logger = console }) {
  const publicDir = path.join(rootDir, 'public');
  const uploadDir = path.join(dataDir, 'uploads');
  const store = createStore(dataDir);
  const auth = createAuth(path.join(dataDir, 'users.json'));

  function isSecure(req) {
    return req.socket.encrypted || (process.env.TRUST_PROXY === '1' && req.headers['x-forwarded-proto'] === 'https');
  }

  function clientIp(req) {
    if (process.env.TRUST_PROXY === '1' && req.headers['x-forwarded-for']) return req.headers['x-forwarded-for'].split(',')[0].trim();
    return req.socket.remoteAddress || 'unknown';
  }

  function requireStaff(req, { write = false } = {}) {
    const session = auth.getSession(parseCookies(req.headers.cookie)[COOKIE]);
    if (!session) throw new HttpError(401, 'Please sign in again.');
    if (write && req.headers['x-csrf-token'] !== session.csrf) throw new HttpError(403, 'Your session expired. Please reload the page.');
    return session;
  }

  function sessionCookie(req, token, maxAgeSec) {
    const secure = isSecure(req) ? '; Secure' : '';
    return `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAgeSec}${secure}`;
  }

  async function api(req, res, url) {
    const route = `${req.method} ${url.pathname}`;

    if (route === 'GET /api/session') {
      const session = auth.getSession(parseCookies(req.headers.cookie)[COOKIE]);
      return sendJson(res, 200, {
        authenticated: Boolean(session), username: session?.username ?? null, csrf: session?.csrf ?? null,
        needsSetup: !(await auth.hasUsers()),
      });
    }
    if (route === 'POST /api/login') {
      const { username, password } = await readJson(req, JSON_LIMIT);
      const result = await auth.login(username, password, clientIp(req));
      if (!result.ok) return sendJson(res, 401, { error: result.reason });
      return sendJson(res, 200, { ok: true, csrf: result.csrf, username },
        { 'Set-Cookie': sessionCookie(req, result.token, auth.SESSION_TTL_MS / 1000) });
    }
    if (route === 'POST /api/logout') {
      auth.logout(parseCookies(req.headers.cookie)[COOKIE]);
      return sendJson(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, '', 0) });
    }
    if (route === 'GET /api/content') {
      requireStaff(req);
      return sendJson(res, 200, { content: await store.load(), schema: SCHEMA });
    }
    if (route === 'PUT /api/content') {
      const session = requireStaff(req, { write: true });
      const { content } = await readJson(req, JSON_LIMIT);
      const { value, errors } = validateContent(SCHEMA, content);
      if (errors.length) return sendJson(res, 422, { error: 'Please fix the highlighted fields.', errors });
      await store.save(value, session.username);
      logger.info(`[content] saved by ${session.username}`);
      return sendJson(res, 200, { ok: true, content: value });
    }
    if (route === 'POST /api/upload') {
      requireStaff(req, { write: true });
      const { dataUrl } = await readJson(req, UPLOAD_LIMIT);
      return sendJson(res, 200, { url: await saveImage(uploadDir, dataUrl) });
    }
    if (route === 'GET /api/history') {
      requireStaff(req);
      return sendJson(res, 200, { versions: await store.listHistory() });
    }
    if (req.method === 'GET' && url.pathname.startsWith('/api/history/')) {
      requireStaff(req);
      return sendJson(res, 200, { content: await store.readHistory(url.pathname.slice('/api/history/'.length)) });
    }
    if (route === 'POST /api/password') {
      const session = requireStaff(req, { write: true });
      const { current, next } = await readJson(req, JSON_LIMIT);
      const user = (await auth.readUsers()).find((u) => u.username === session.username);
      if (!user || !(await verifyPassword(String(current || ''), user))) throw new HttpError(400, 'Your current password is not correct.');
      if (String(next || '').length < MIN_PASSWORD_LENGTH) throw new HttpError(400, `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      await auth.setPassword(session.username, String(next));
      return sendJson(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, '', 0) });
    }
    throw new HttpError(404, 'Not found');
  }

  async function page(req, res, url) {
    const content = await store.load();
    const p = url.pathname.replace(/\/+$/, '') || '/';
    const fixed = { '/': homePage, '/events': eventsPage, '/coaches': coachesPage, '/contact': contactPage };
    const pageCache = { 'Cache-Control': 'no-cache' };
    if (fixed[p]) return send(res, 200, fixed[p](content), undefined, pageCache);
    const season = (content.seasons || []).find((s) => `/${s.slug}` === p);
    if (season) return send(res, 200, seasonPage(content, season), undefined, pageCache);
    const found = findTeam(content, p);
    if (found) return send(res, 200, teamPage(content, found.season, found.team), undefined, pageCache);
    return send(res, 404, notFoundPage(content));
  }

  async function brandCss(res) {
    send(res, 200, brandCssText((await store.load()).site), TYPES['.css'], { 'Cache-Control': 'no-cache' });
  }

  async function route(req, res) {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) return api(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'Method not allowed');
    if (url.pathname === '/brand.css') return brandCss(res);
    if (url.pathname === '/admin') return send(res, 301, '', undefined, { Location: '/admin/' });
    if (url.pathname.startsWith('/admin/')) {
      const rel = url.pathname === '/admin/' ? 'admin/index.html' : url.pathname.slice(1);
      if (await serveFile(res, publicDir, rel, 'no-cache')) return undefined;
    }
    if (url.pathname.startsWith('/uploads/')) {
      if (await serveFile(res, uploadDir, url.pathname.slice('/uploads/'.length), 'public, max-age=31536000, immutable')) return undefined;
    }
    if (/^\/(css|js|img)\//.test(url.pathname) || url.pathname === '/robots.txt') {
      const cache = url.searchParams.has('v') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600';
      if (await serveFile(res, publicDir, url.pathname.slice(1), cache)) return undefined;
    }
    return page(req, res, url);
  }

  return async function handler(req, res) {
    securityHeaders(res, isSecure(req));
    try {
      await route(req, res);
    } catch (err) {
      const status = err.status || 500;
      if (status >= 500) logger.error('[error]', req.method, req.url, err);
      const message = status >= 500 ? 'Something went wrong on our side. Please try again.' : err.message;
      if (res.headersSent) { res.end(); return; }
      if (req.url.startsWith('/api/')) sendJson(res, status, { error: message });
      else send(res, status, `<!doctype html><title>Error</title><p>${status === 404 ? 'Not found' : 'Something went wrong.'}</p>`);
    }
  };
}
