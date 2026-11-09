import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { esc, html, paragraphs, safeUrl, youtubeId } from '../src/lib/html.js';
import { validateContent, isSafeImage } from '../src/lib/validate.js';
import { upcomingEvents, pastEvents, formatTime, formatDate, todayInSchoolZone } from '../src/lib/events.js';
import { detectImageType } from '../src/lib/uploads.js';
import { SCHEMA } from '../src/schema.js';

const seed = JSON.parse(readFileSync(new URL('../data/content.json', import.meta.url), 'utf8'));

test('esc neutralises markup characters', () => {
  assert.equal(esc('<script>"x"&\'y\''), '&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;');
  assert.equal(esc(null), '');
});

test('html template escapes values but keeps nested html', () => {
  const inner = html`<b>${'<i>'}</b>`;
  assert.equal(String(html`<p>${inner}${'<x>'}</p>`), '<p><b>&lt;i&gt;</b>&lt;x&gt;</p>');
  assert.equal(String(html`${[1, 2]}${false}${undefined}`), '12');
});

test('paragraphs splits blank lines and escapes', () => {
  assert.equal(String(paragraphs('a\nb\n\n<c>')), '<p>a<br>b</p><p>&lt;c&gt;</p>');
  assert.equal(String(paragraphs('')), '');
});

test('safeUrl blocks javascript: and protocol-relative links', () => {
  assert.equal(safeUrl('javascript:alert(1)'), '#');
  assert.equal(safeUrl('//evil.com'), '#');
  assert.equal(safeUrl('/events'), '/events');
  assert.equal(safeUrl('https://kas.tw'), 'https://kas.tw');
});

test('youtubeId handles common URL shapes', () => {
  for (const u of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtu.be/dQw4w9WgXcQ', 'https://www.youtube.com/shorts/dQw4w9WgXcQ', 'https://youtube.com/watch?t=3&v=dQw4w9WgXcQ']) {
    assert.equal(youtubeId(u), 'dQw4w9WgXcQ', u);
  }
  assert.equal(youtubeId('https://www.youtube.com/@thescoreKAS'), null);
});

test('seed content passes validation', () => {
  const { errors } = validateContent(SCHEMA, seed);
  assert.deepEqual(errors, []);
});

test('validation drops unknown keys and returns a new object', () => {
  const input = { ...seed, hacker: 'x', site: { ...seed.site, extra: 1 } };
  const { value } = validateContent(SCHEMA, input);
  assert.equal(value.hacker, undefined);
  assert.equal(value.site.extra, undefined);
  assert.notEqual(value, input);
});

test('validation reports unsafe links, images, colors, slugs and duplicates', () => {
  const bad = structuredClone(seed);
  bad.links[0].url = 'javascript:alert(1)';
  bad.home.heroImage = '/uploads/../../etc/passwd';
  bad.site.brandColor = 'red;}body{display:none';
  bad.seasons[0].slug = 'Admin Page';
  bad.seasons[1].slug = 'admin';
  bad.seasons[2].slug = bad.seasons[3].slug;
  bad.events[0].date = '2026-13-45';
  bad.site.name = '';
  const paths = validateContent(SCHEMA, bad).errors.map((e) => e.path);
  for (const p of ['links[0].url', 'home.heroImage', 'site.brandColor', 'seasons[0].slug', 'seasons[1].slug', 'seasons[3].slug', 'events[0].date', 'site.name']) {
    assert.ok(paths.includes(p), `expected error at ${p}; got ${paths}`);
  }
});

test('validation enforces list and text limits', () => {
  const bad = structuredClone(seed);
  bad.links = Array.from({ length: 25 }, () => ({ label: 'x', url: '/x' }));
  bad.site.tagline = 'x'.repeat(500);
  const { value, errors } = validateContent(SCHEMA, bad);
  assert.equal(value.links.length, 20);
  assert.ok(errors.some((e) => e.path === 'links'));
  assert.ok(errors.some((e) => e.path === 'site.tagline'));
});

test('isSafeImage allows uploads and https only', () => {
  assert.ok(isSafeImage('/uploads/2026/abc.webp'));
  assert.ok(isSafeImage('https://cdn.example.com/a.jpg'));
  assert.ok(!isSafeImage('http://insecure.example.com/a.jpg'));
  assert.ok(!isSafeImage('data:image/png;base64,AAA'));
});

test('events split into upcoming and past using school time zone', () => {
  const events = [
    { date: '2026-11-20', time: '10:00', title: 'B' },
    { date: '2026-11-20', time: '09:00', title: 'A' },
    { date: '2026-11-01', title: 'Old' },
  ];
  const now = new Date('2026-11-09T20:00:00Z'); // already Nov 10 in Taipei
  assert.equal(todayInSchoolZone(now), '2026-11-10');
  assert.deepEqual(upcomingEvents(events, now).map((e) => e.title), ['A', 'B']);
  assert.deepEqual(pastEvents(events, now).map((e) => e.title), ['Old']);
});

test('date and time formatting', () => {
  assert.equal(formatTime('15:30'), '3:30 PM');
  assert.equal(formatTime('00:05'), '12:05 AM');
  assert.equal(formatTime(''), '');
  assert.equal(formatDate('2026-11-14'), 'Sat, Nov 14');
});

test('detectImageType checks file signatures, not names', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const webp = Buffer.from('RIFF\0\0\0\0WEBPVP8 ', 'latin1');
  assert.equal(detectImageType(png), 'png');
  assert.equal(detectImageType(jpg), 'jpg');
  assert.equal(detectImageType(webp), 'webp');
  assert.equal(detectImageType(Buffer.from('<svg onload=alert(1)>xxxxxx')), null);
  assert.equal(detectImageType(Buffer.alloc(3)), null);
});

test('duplicate team addresses within a season are rejected', () => {
  const bad = structuredClone(seed);
  bad.seasons[0].teams[1].slug = bad.seasons[0].teams[0].slug;
  const paths = validateContent(SCHEMA, bad).errors.map((e) => e.path);
  assert.ok(paths.includes('seasons[0].teams[1].slug'));
});

test('static export prefixes site links for a sub-folder and drops server-only parts', async () => {
  const { toStatic, normalizeBase } = await import('../src/lib/static.js');
  assert.equal(normalizeBase('kas/'), '/kas');
  assert.equal(normalizeBase('/'), '');
  const page = '<a href="/fall-sports">x</a><img src="/uploads/a.webp"><link href="//cdn.example.com/x"><a href="https://x.com">y</a><a href="/admin/" class="staff-link">Staff sign in</a><form class="sb-filter" method="get"><select></select></form><meta property="og:image" content="/uploads/b.webp">';
  const out = toStatic(page, '/kas');
  assert.match(out, /href="\/kas\/fall-sports"/);
  assert.match(out, /src="\/kas\/uploads\/a\.webp"/);
  assert.match(out, /content="\/kas\/uploads\/b\.webp"/);
  assert.match(out, /href="\/\/cdn\.example\.com\/x"/);
  assert.match(out, /href="https:\/\/x\.com"/);
  assert.doesNotMatch(out, /Staff sign in|sb-filter/);
  assert.equal(toStatic('<a href="/x">', ''), '<a href="/x">');
});
