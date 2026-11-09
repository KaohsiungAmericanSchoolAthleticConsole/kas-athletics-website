import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.js';
import { createAuth } from '../src/lib/auth.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PNG_1PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
let server; let base; let dataDir;
const silent = { info() {}, error() {} };

async function req(method, url, { body, cookie, csrf } = {}) {
  const res = await fetch(base + url, {
    method, redirect: 'manual',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...(csrf ? { 'X-CSRF-Token': csrf } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* html */ }
  return { status: res.status, headers: res.headers, text, json };
}

async function signIn() {
  const r = await req('POST', '/api/login', { body: { username: 'stella', password: 'correct-horse-battery' } });
  assert.equal(r.status, 200);
  return { cookie: r.headers.get('set-cookie').split(';')[0], csrf: r.json.csrf };
}

before(async () => {
  dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kas-test-'));
  await fs.copyFile(path.join(rootDir, 'data', 'content.json'), path.join(dataDir, 'content.json'));
  await createAuth(path.join(dataDir, 'users.json')).setPassword('stella', 'correct-horse-battery');
  server = http.createServer(createApp({ rootDir, dataDir, logger: silent }));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.close();
  await fs.rm(dataDir, { recursive: true, force: true });
});

test('public pages render with security headers', async () => {
  for (const p of ['/', '/events', '/coaches', '/contact', '/fall-sports', '/fall-sports/']) {
    const r = await req('GET', p);
    assert.equal(r.status, 200, p);
    assert.match(r.text, /<h1/, p);
  }
  const home = await req('GET', '/');
  assert.match(home.headers.get('content-security-policy'), /default-src 'self'/);
  assert.equal(home.headers.get('x-frame-options'), 'DENY');
  assert.equal((await req('GET', '/does-not-exist')).status, 404);
});

test('static files cannot escape their folder', async () => {
  assert.equal((await req('GET', '/css/site.css')).status, 200);
  const r = await req('GET', '/css/..%2f..%2fdata%2fusers.json');
  assert.equal(r.status, 404);
  assert.doesNotMatch(r.text, /salt/);
});

test('editing APIs require sign-in', async () => {
  assert.equal((await req('GET', '/api/content')).status, 401);
  assert.equal((await req('PUT', '/api/content', { body: { content: {} } })).status, 401);
  assert.equal((await req('POST', '/api/upload', { body: { dataUrl: PNG_1PX } })).status, 401);
});

test('wrong password is rejected', async () => {
  const r = await req('POST', '/api/login', { body: { username: 'stella', password: 'nope' } });
  assert.equal(r.status, 401);
  assert.equal(r.headers.get('set-cookie'), null);
});

test('session cookie is HttpOnly and SameSite=Strict', async () => {
  const r = await req('POST', '/api/login', { body: { username: 'stella', password: 'correct-horse-battery' } });
  assert.match(r.headers.get('set-cookie'), /HttpOnly; SameSite=Strict/);
});

test('writes without the CSRF token are refused', async () => {
  const { cookie } = await signIn();
  const r = await req('PUT', '/api/content', { cookie, body: { content: {} } });
  assert.equal(r.status, 403);
});

test('staff can edit content; text is escaped on the site; history is kept', async () => {
  const { cookie, csrf } = await signIn();
  const { json } = await req('GET', '/api/content', { cookie });
  const next = structuredClone(json.content);
  next.home.heroTitle = 'Go <script>alert(1)</script> Dragons';
  const save = await req('PUT', '/api/content', { cookie, csrf, body: { content: next } });
  assert.equal(save.status, 200);

  const home = await req('GET', '/');
  assert.match(home.text, /Go &lt;script&gt;alert\(1\)&lt;\/script&gt; Dragons/);
  assert.doesNotMatch(home.text, /<script>alert/);

  const hist = await req('GET', '/api/history', { cookie });
  assert.ok(hist.json.versions.length >= 1);
  const old = await req('GET', `/api/history/${hist.json.versions[0].id}`, { cookie });
  assert.equal(old.json.content.home.heroTitle, 'Home of the Dragons');
  assert.equal((await req('GET', '/api/history/..%2fusers.json', { cookie })).status, 400);
});

test('invalid content is rejected with field errors and nothing is saved', async () => {
  const { cookie, csrf } = await signIn();
  const { json } = await req('GET', '/api/content', { cookie });
  const bad = structuredClone(json.content);
  bad.links[0].url = 'javascript:alert(1)';
  const r = await req('PUT', '/api/content', { cookie, csrf, body: { content: bad } });
  assert.equal(r.status, 422);
  assert.equal(r.json.errors[0].path, 'links[0].url');
  const after = await req('GET', '/api/content', { cookie });
  assert.notEqual(after.json.content.links[0].url, 'javascript:alert(1)');
});

test('photo upload accepts real images and rejects fakes', async () => {
  const { cookie, csrf } = await signIn();
  const ok = await req('POST', '/api/upload', { cookie, csrf, body: { dataUrl: PNG_1PX } });
  assert.equal(ok.status, 200);
  assert.match(ok.json.url, /^\/uploads\/\d{4}\/[\w-]+\.png$/);
  const img = await fetch(base + ok.json.url);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get('content-type'), 'image/png');

  const fake = `data:image/png;base64,${Buffer.from('<svg onload=alert(1)>padding-padding').toString('base64')}`;
  assert.equal((await req('POST', '/api/upload', { cookie, csrf, body: { dataUrl: fake } })).status, 415);
  assert.equal((await req('POST', '/api/upload', { cookie, csrf, body: { dataUrl: 'hello' } })).status, 400);
});

test('brand color is served as CSS', async () => {
  const r = await req('GET', '/brand.css');
  assert.match(r.text, /--brand:#[0-9a-f]{6}/i);
});

test('logout ends the session', async () => {
  const { cookie } = await signIn();
  await req('POST', '/api/logout', { cookie });
  assert.equal((await req('GET', '/api/content', { cookie })).status, 401);
});


test('team pages render roster, gallery and team schedule; unknown teams 404', async () => {
  const r = await req('GET', '/fall-sports/varsity-boys-soccer-tissa');
  assert.equal(r.status, 200);
  assert.match(r.text, /Varsity Boys Soccer \(TISSA\)/);
  assert.match(r.text, /class="roster"/);
  assert.match(r.text, /class="gallery"/);
  assert.match(r.text, /KAS vs\. MAC/);
  assert.equal((await req('GET', '/fall-sports/no-such-team')).status, 404);
  const season = await req('GET', '/fall-sports');
  assert.match(season.text, /href="\/fall-sports\/varsity-boys-soccer-tissa"/);
});

test('brand.css carries both school colors', async () => {
  const r = await req('GET', '/brand.css');
  assert.match(r.text, /--brand:#[0-9a-f]{6};--brand-2:#[0-9a-f]{6}/i);
});

test('scoreboard pages are served, with team filter', async () => {
  const games = await req('GET', '/scores');
  assert.equal(games.status, 200);
  assert.match(games.text, /Scoreboard/);
  assert.equal((await req('GET', '/scores/standings')).status, 200);
  const filtered = await req('GET', '/scores?team=Varsity%20Swimming');
  assert.equal(filtered.status, 200);
  assert.match(filtered.text, /<option value="Varsity Swimming" selected>/);
});

test('a stale editor cannot overwrite a newer publish (409), a fresh one can', async () => {
  const { cookie, csrf } = await signIn();
  const first = (await req('GET', '/api/content', { cookie })).json;
  const a = await req('PUT', '/api/content', { cookie, csrf, body: { content: { ...first.content, site: { ...first.content.site, footerNote: 'A' } }, version: first.version } });
  assert.equal(a.status, 200);
  const b = await req('PUT', '/api/content', { cookie, csrf, body: { content: { ...first.content, site: { ...first.content.site, footerNote: 'B' } }, version: first.version } });
  assert.equal(b.status, 409);
  assert.match(b.json.error, /Someone else published/);
  const c = await req('PUT', '/api/content', { cookie, csrf, body: { content: { ...first.content, site: { ...first.content.site, footerNote: 'C' } }, version: a.json.version } });
  assert.equal(c.status, 200);
});

test('staff can add, reset and remove accounts, but not themselves', async () => {
  const { cookie, csrf } = await signIn();
  assert.equal((await req('POST', '/api/users', { cookie, csrf, body: { username: 'coach-sam', password: 'short' } })).status, 400);
  assert.equal((await req('POST', '/api/users', { cookie, csrf, body: { username: 'coach-sam', password: 'a-long-enough-pass' } })).status, 200);
  assert.equal((await req('POST', '/api/users', { cookie, csrf, body: { username: 'coach-sam', password: 'a-long-enough-pass' } })).status, 400);
  const users = (await req('GET', '/api/users', { cookie })).json.users;
  assert.deepEqual(users.map((u) => u.username).sort(), ['coach-sam', 'stella']);
  assert.equal(users.find((u) => u.username === 'stella').isYou, true);
  assert.equal((await req('POST', '/api/users/reset', { cookie, csrf, body: { username: 'coach-sam', password: 'another-long-pass' } })).status, 200);
  const sam = await req('POST', '/api/login', { body: { username: 'coach-sam', password: 'another-long-pass' } });
  assert.equal(sam.status, 200);
  assert.equal((await req('DELETE', '/api/users/stella', { cookie, csrf })).status, 400);
  assert.equal((await req('DELETE', '/api/users/coach-sam', { cookie, csrf })).status, 200);
  assert.equal((await req('GET', '/api/content', { cookie: sam.headers.get('set-cookie').split(';')[0] })).status, 401);
  assert.equal((await req('DELETE', '/api/users/coach-sam', { cookie })).status, 403);
});

test('signed-in staff get click-to-edit markers; visitors get a clean page', async () => {
  const visitor = await req('GET', '/');
  assert.doesNotMatch(visitor.text, /data-edit=|inline\.js/);
  const { cookie } = await signIn();
  const staff = await req('GET', '/', { cookie });
  assert.match(staff.text, /data-edit="home\.heroTitle"/);
  assert.match(staff.text, /data-edit-image="home\.heroImage"/);
  assert.match(staff.text, /data-edit-list="seasons"/);
  assert.match(staff.text, /\/admin\/inline\.js/);
  assert.match(staff.headers.get('cache-control'), /private, no-store/);
  const season = await req('GET', '/fall-sports', { cookie });
  assert.match(season.text, /data-edit-list="seasons\[0\]\.teams"/);
  assert.match(season.text, /data-edit="seasons\[0\]\.teams\[1\]\.name"/);
  const afterStaff = await req('GET', '/');
  assert.doesNotMatch(afterStaff.text, /data-edit=/, 'edit flag must not leak into the next visitor');
});

// Keep last: it locks out further logins from this IP for 15 minutes.
test('repeated failed logins are rate limited', async () => {
  let last;
  for (let i = 0; i < 9; i += 1) last = await req('POST', '/api/login', { body: { username: 'x', password: 'y' } });
  assert.match(last.json.error, /Too many attempts/);
});
