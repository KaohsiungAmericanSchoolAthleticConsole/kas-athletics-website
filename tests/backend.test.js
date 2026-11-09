// The editor's GitHub mode, tested against a small in-memory imitation of the GitHub API.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGithubBackend, utf8ToBase64, base64ToUtf8 } from '../public/admin/backend.js';
import { SCHEMA } from '../src/schema.js';
import { validateContent } from '../src/lib/validate.js';

const seed = JSON.parse(readFileSync(new URL('../data/content.json', import.meta.url), 'utf8'));

function fakeGithub({ push = true } = {}) {
  let n = 0;
  const files = new Map([['data/content.json', { content: utf8ToBase64(JSON.stringify(seed)), sha: 'sha0' }]]);
  const commits = [];
  const calls = [];
  async function fetchFn(url, { method = 'GET', headers = {}, body } = {}) {
    const u = new URL(url);
    calls.push(`${method} ${u.pathname}`);
    const reply = (status, data) => ({ ok: status < 300, status, json: async () => data });
    if (headers.Authorization !== 'Bearer good-key') return reply(401, { message: 'Bad credentials' });
    if (u.pathname === '/user') return reply(200, { login: 'kas-staff' });
    if (u.pathname === '/repos/o/r') return reply(200, { permissions: { push } });
    if (u.pathname === '/repos/o/r/commits') return reply(200, commits.slice().reverse());
    const m = /^\/repos\/o\/r\/contents\/(.+)$/.exec(u.pathname);
    if (!m) return reply(404, { message: 'Not Found' });
    const path = decodeURIComponent(m[1]);
    if (method === 'GET') {
      const ref = u.searchParams.get('ref');
      const file = ref === 'main' ? files.get(path) : commits.find((c) => c.sha === ref)?.files.get(path);
      return file ? reply(200, file) : reply(404, { message: 'Not Found' });
    }
    const req = JSON.parse(body);
    const existing = files.get(path);
    if (existing && req.sha !== existing.sha) return reply(409, { message: 'is at sha0 but expected sha-old' });
    const file = { content: req.content, sha: `sha${++n}` };
    files.set(path, file);
    commits.push({ sha: file.sha, files: new Map(files), commit: { message: req.message, author: { name: 'kas-staff', date: new Date(2026, 10, n).toISOString() } }, author: { login: 'kas-staff' } });
    return reply(201, { content: { sha: file.sha } });
  }
  return { fetchFn, files, commits, calls };
}

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m };
}

const make = (gh, storage = { local: memoryStorage(), session: memoryStorage() }) => createGithubBackend({
  owner: 'o', repo: 'r', branch: 'main', base: '/r', schema: SCHEMA, validate: validateContent,
  fetchFn: gh.fetchFn, storage, random: () => 'abc123', now: () => new Date('2026-11-10T00:00:00Z'),
});

test('base64 helpers keep non-English text intact', () => {
  const text = '高雄美國學校 · “Dragons” — ✦';
  assert.equal(base64ToUtf8(utf8ToBase64(text)), text);
});

test('sign-in checks the key and remembers it only when asked', async () => {
  const gh = fakeGithub();
  const storage = { local: memoryStorage(), session: memoryStorage() };
  const be = make(gh, storage);
  assert.deepEqual(await be.session(), { authenticated: false });
  await assert.rejects(be.login({ token: 'wrong' }), /isn’t valid/);
  assert.equal((await be.login({ token: ' good-key ', remember: true })).username, 'kas-staff');
  assert.equal(storage.local._m.size, 1);
  const again = make(gh, storage);
  assert.equal((await again.session()).username, 'kas-staff', 'a remembered key signs you in next time');
  await again.logout();
  assert.equal(storage.local._m.size + storage.session._m.size, 0);
  await make(gh, storage).login({ token: 'good-key', remember: false });
  assert.equal(storage.local._m.size, 0);
  assert.equal(storage.session._m.size, 1);
});

test('a key without write access is refused with a clear message', async () => {
  const be = make(fakeGithub({ push: false }));
  await assert.rejects(be.login({ token: 'good-key' }), /can view the website but not change it/);
});

test('load, publish, and conflicts when someone else published first', async () => {
  const gh = fakeGithub();
  const a = make(gh); const b = make(gh);
  await a.login({ token: 'good-key' }); await b.login({ token: 'good-key' });
  const loadedA = await a.load(); const loadedB = await b.load();
  assert.equal(loadedA.version, 'sha0');
  assert.equal(loadedA.content.site.name, 'KAS Athletics');
  assert.ok(loadedA.schema.fields.length > 3);

  const changed = { ...loadedA.content, site: { ...loadedA.content.site, tagline: 'Fight Like a Dragon 高雄' } };
  const saved = await a.publish(changed, loadedA.version);
  assert.equal(saved.version, 'sha1');
  const stored = JSON.parse(base64ToUtf8(gh.files.get('data/content.json').content));
  assert.equal(stored.site.tagline, 'Fight Like a Dragon 高雄');
  assert.match(gh.commits.at(-1).commit.message, /Update website content \(by kas-staff/);

  await assert.rejects(b.publish(loadedB.content, loadedB.version), (err) => err.status === 409 && /Someone else published/.test(err.message));
  const next = await a.publish({ ...saved.content, site: { ...saved.content.site, footerNote: 'x' } }, saved.version);
  assert.equal(next.version, 'sha2');
});

test('invalid content is rejected before anything is sent to GitHub', async () => {
  const gh = fakeGithub();
  const be = make(gh);
  await be.login({ token: 'good-key' });
  const { content, version } = await be.load();
  const before = gh.calls.length;
  const bad = { ...content, links: [{ label: 'x', url: 'javascript:alert(1)' }] };
  await assert.rejects(be.publish(bad, version), (err) => err.status === 422 && err.data.errors[0].path === 'links[0].url');
  assert.equal(gh.calls.length, before);
});

test('photos upload without rebuilding the site, and show immediately', async () => {
  const gh = fakeGithub();
  const be = make(gh);
  await be.login({ token: 'good-key' });
  const dataUrl = `data:image/png;base64,${Buffer.from('fakepng').toString('base64')}`;
  const path = await be.upload(dataUrl);
  assert.equal(path, '/uploads/2026/abc123.png');
  assert.ok(gh.files.has('data/uploads/2026/abc123.png'));
  assert.match(gh.commits.at(-1).commit.message, /\[skip ci\]/);
  assert.equal(be.imageUrl(path), dataUrl);
  assert.equal(be.imageUrl('/uploads/2025/old.webp'), 'https://raw.githubusercontent.com/o/r/main/data/uploads/2025/old.webp');
  assert.equal(be.imageUrl('/img/crest.svg'), '/r/img/crest.svg');
  await assert.rejects(be.upload('data:image/svg+xml;base64,PHN2Zz4='), /JPG, PNG/);
});

test('history lists published versions and can load an old one', async () => {
  const gh = fakeGithub();
  const be = make(gh);
  await be.login({ token: 'good-key' });
  const { content, version } = await be.load();
  await be.publish({ ...content, site: { ...content.site, footerNote: 'v1' } }, version);
  const versions = await be.history();
  assert.equal(versions[0].author, 'kas-staff');
  const old = await be.readVersion(versions[0].id);
  assert.equal(old.site.footerNote, 'v1');
  assert.equal(be.previewUrl('/'), '/r/admin/preview/');
  assert.equal(be.previewUrl('/fall-sports'), '/r/admin/preview/fall-sports/');
});
