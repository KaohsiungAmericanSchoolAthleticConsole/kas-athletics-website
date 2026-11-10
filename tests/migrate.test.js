import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { migrate } from '../src/lib/migrate.js';
import { validateContent } from '../src/lib/validate.js';
import { SCHEMA } from '../src/schema.js';

const seed = JSON.parse(readFileSync(new URL('./fixtures/content.json', import.meta.url), 'utf8'));

test('migrate builds the expected home sections from old content', () => {
  const m = migrate(seed);
  assert.deepEqual(m.pages[0].sections.map((s) => s.type), [
    'hero', 'stats', 'upcomingGames', 'seasonTiles', 'marquee', 'quote', 'video', 'statement', 'calendar',
  ]);
  assert.equal(m.pages[0].slug, '');
  assert.equal(m.pages[0].title, 'Home');
  assert.deepEqual(m.pages.map((p) => p.title), ['Home', 'Coaches', 'Contact us']);
});

test('migrated content validates', () => {
  const m = migrate(seed);
  assert.deepEqual(validateContent(SCHEMA, m).errors, []);
});

test('migrate is idempotent', () => {
  const m = migrate(seed);
  const m2 = migrate(m);
  assert.deepEqual(m2.pages[0].sections.map((s) => s.type), m.pages[0].sections.map((s) => s.type));
});

test('migrate fills the festive theme default and leaves the input alone', () => {
  const m = migrate(seed);
  assert.equal(m.site.seasonal, 'auto');
  assert.equal(seed.site.seasonal, undefined);
  assert.equal(migrate(m), m); // already set: no new object needed
  const chosen = migrate({ ...m, site: { ...m.site, seasonal: 'halloween' } });
  assert.equal(chosen.site.seasonal, 'halloween');
});

test('migrate drops nothing from the rest of the content', () => {
  const m = migrate(seed);
  assert.equal(m.events.length, seed.events.length);
  assert.equal(m.seasons.length, seed.seasons.length);
  assert.equal(m.coaches.length, seed.coaches.length);
});
test('plain-text rosters become player cards once, without touching the input', () => {
  const raw = { seasons: [{ title: 'Fall', slug: 'fall', teams: [
    { name: 'A', roster: 'Adam Chu ’26 (c)\n\n  Eric Su ’28 \nZoe' },
    { name: 'B', roster: 'Ignored', players: [{ name: 'Kept' }] },
  ] }] };
  const out = migrate(raw);
  const [a, b] = out.seasons[0].teams;
  assert.deepEqual(a.players.map((p) => [p.name, p.year, p.role]), [['Adam Chu', 'Class of 2026', 'Captain'], ['Eric Su', 'Class of 2028', ''], ['Zoe', '', '']]);
  assert.equal(a.roster, '');
  assert.deepEqual(b.players, [{ name: 'Kept' }], 'teams that already have player cards are left alone');
  assert.equal(raw.seasons[0].teams[0].roster.startsWith('Adam'), true, 'input is not changed');
  assert.deepEqual(migrate(out), out, 'running it again changes nothing');
});
