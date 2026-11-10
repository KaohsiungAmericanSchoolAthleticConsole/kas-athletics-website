import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { detectSport, sportOf, playerFromLine, captainOf, SPORT_KINDS } from '../src/lib/sport.js';
import { seasonalFor, seasonalLabel, SEASONAL_IDS } from '../src/lib/seasonal.js';
import { captainReveal } from '../src/render/captain.js';
import { layout } from '../src/render/layout.js';
import { validateContent } from '../src/lib/validate.js';
import { SCHEMA } from '../src/schema.js';

const seed = JSON.parse(readFileSync(new URL('./fixtures/content.json', import.meta.url), 'utf8'));
const at = (iso) => new Date(`${iso}T12:00:00Z`);

test('team names are recognised as the right sport', () => {
  const cases = {
    'Varsity Boys Soccer (TISSA)': 'soccer',
    'JV Girls Volleyball': 'volleyball',
    'Varsity Swimming': 'swimming',
    'Cross Country': 'running',
    'HS Badminton': 'racket',
    'Ultimate Frisbee': 'frisbee',
    'Middle School Basketball': 'basketball',
    'Varsity Baseball': 'bat',
    'Chess Club': 'generic',
  };
  for (const [name, sport] of Object.entries(cases)) assert.equal(detectSport(name), sport, name);
  assert.ok(SPORT_KINDS.includes(detectSport('Football')));
});

test('the editor can override the sport, and unknown choices fall back to the name', () => {
  assert.equal(sportOf({ name: 'Varsity Boys Soccer', sport: 'golf' }), 'golf');
  assert.equal(sportOf({ name: 'Varsity Boys Soccer', sport: 'quidditch' }), 'soccer');
  assert.equal(sportOf({ name: 'Varsity Swimming' }), 'swimming');
});

test('roster lines become a name and a class year', () => {
  assert.deepEqual(playerFromLine('Adam Chu ’26'), { name: 'Adam Chu', year: 'Class of 2026' });
  assert.deepEqual(playerFromLine('Adam ’25'), { name: 'Adam', year: 'Class of 2025' });
  assert.deepEqual(playerFromLine('Eric Su ’28 (C)'), { name: 'Eric Su', year: 'Class of 2028' });
  assert.deepEqual(playerFromLine('   '), { name: '', year: '' });
});

test('the captain falls back to the first player and the team photo', () => {
  const team = {
    name: 'Varsity Boys Soccer',
    roster: 'Adam Chu ’26\nEric Su ’28',
    image: '/uploads/team.webp',
    gallery: [{ image: '/uploads/game.webp' }],
  };
  const cap = captainOf(team);
  assert.equal(cap.name, 'Adam Chu');
  assert.equal(cap.role, 'Team captain');
  assert.equal(cap.year, 'Class of 2026');
  assert.equal(cap.photo, '/uploads/team.webp');
  assert.equal(cap.fromRoster, true);
});

test('a captain set in the editor wins over the roster (including the old flat fields)', () => {
  const cap = captainOf({
    roster: 'Adam Chu ’26',
    image: '/uploads/team.webp',
    captain: { name: 'Stella Lin', role: 'Captain', number: '9', photo: '/uploads/stella.webp' },
  });
  assert.deepEqual(
    { name: cap.name, role: cap.role, number: cap.number, photo: cap.photo, fromRoster: cap.fromRoster },
    { name: 'Stella Lin', role: 'Captain', number: '9', photo: '/uploads/stella.webp', fromRoster: false },
  );
  assert.equal(captainOf({ captainName: 'Old Field' }).name, 'Old Field');
  assert.equal(captainOf({}).name, '');
});

test('festive themes follow the calendar, or the editor’s choice', () => {
  assert.equal(seasonalFor({ seasonal: 'winter' }, at('2026-07-01')), 'winter');
  assert.equal(seasonalFor({ seasonal: 'off' }, at('2026-12-25')), '');
  assert.equal(seasonalFor({ seasonal: 'not-a-theme' }, at('2026-12-25')), '');
  assert.equal(seasonalFor({}, at('2026-12-15')), 'winter');
  assert.equal(seasonalFor({}, at('2026-12-31')), 'newyear');
  assert.equal(seasonalFor({}, at('2026-01-01')), 'newyear');
  assert.equal(seasonalFor({}, at('2026-01-05')), 'winter');
  assert.equal(seasonalFor({}, at('2026-10-20')), 'halloween');
  assert.equal(seasonalFor({}, at('2026-04-01')), 'spring');
  assert.equal(seasonalFor({}, at('2026-07-01')), '');
  assert.ok(SEASONAL_IDS.includes(seasonalFor({}, at('2026-10-31'))));
  assert.equal(seasonalLabel('winter'), 'Winter / Christmas');
});

test('the captain reveal is escaped and carries the animation hooks', () => {
  const team = {
    name: 'Varsity Boys Soccer',
    players: [{ name: 'Adam Chu', year: 'Class of 2026' }, { name: 'Eric Su', year: 'Class of 2028' }],
    image: '/uploads/team.webp',
    captain: { name: 'A <b>B</b>', quote: '<img onerror=alert(1)>' },
  };
  const out = String(captainReveal({}, team, 'seasons[0].teams[0]', { title: 'Fall Sports' }));
  assert.match(out, /class="captain"/);
  assert.match(out, /data-sport="soccer"/);
  assert.match(out, /id="team-captain"/);
  assert.match(out, /data-captain-replay hidden/);
  assert.match(out, /A &lt;b&gt;B&lt;\/b&gt;/);
  assert.doesNotMatch(out, /<img onerror/);
  assert.match(out, /href="#team-roster"/);
});

test('a team with no captain or roster still gets the animation, with a clear placeholder', () => {
  const out = String(captainReveal({}, { name: 'Varsity Swimming', image: '/uploads/pool.webp' }, 'seasons[0].teams[1]', { title: 'Fall Sports' }));
  assert.match(out, /data-sport="swimming"/);
  assert.match(out, /Captain to be announced/);
  assert.match(out, /src="\/uploads\/pool.webp"/);
});

test('the layout carries the festive theme and the sports menu', () => {
  const content = structuredClone(seed);
  content.site.seasonal = 'winter';
  const out = layout(content, { path: '/', body: '<p>Hello</p>' });
  assert.match(out, /<body id="top" data-seasonal="winter">/);
  assert.match(out, /data-fx-toggle/);
  assert.match(out, /data-fx-label="Winter \/ Christmas"/);
  assert.match(out, /css\/captain\.css/);
  assert.match(out, /css\/seasonal\.css/);
  assert.match(out, /class="nav-group"/);
  assert.match(out, /Back to top/);

  content.site.seasonal = 'off';
  const plain = layout(content, { path: '/', body: '<p>Hello</p>' });
  assert.doesNotMatch(plain, /data-seasonal=/);
  assert.doesNotMatch(plain, /data-fx-toggle/);
});

test('the editor accepts captain, sport and festive fields, and rejects bad choices', () => {
  const good = structuredClone(seed);
  good.site.seasonal = 'halloween';
  good.seasons[0].teams[0].sport = 'volleyball';
  good.seasons[0].teams[0].captain = { name: 'Adam Chu', role: 'Captain', number: '10', year: 'Class of 2026', quote: 'Play for each other.' };
  assert.deepEqual(validateContent(SCHEMA, good).errors, []);

  const bad = structuredClone(good);
  bad.site.seasonal = 'fireworks';
  bad.seasons[0].teams[0].sport = 'quidditch';
  const paths = validateContent(SCHEMA, bad).errors.map((e) => e.path);
  assert.ok(paths.includes('site.seasonal'), paths.join(', '));
  assert.ok(paths.includes('seasons[0].teams[0].sport'), paths.join(', '));
});
