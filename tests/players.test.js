// Player cards on team pages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { teamPage } from '../src/render/team.js';
import { renderWithEdit } from '../src/render/edit.js';
import { captainOf } from '../src/lib/sport.js';
import { validateContent } from '../src/lib/validate.js';
import { SCHEMA } from '../src/schema.js';

const team = {
  name: 'Varsity Boys Volleyball', slug: 'bvb', image: '/uploads/team.webp',
  players: [
    { name: 'Adam <b>Chu</b>', role: 'Setter', number: '10', year: 'Class of 2026', photo: '/uploads/adam.webp', quote: 'We play for <i>each other</i>.' },
    { name: 'Eric Su', role: 'Outside hitter · Captain', number: '', year: '', photo: '', quote: '' },
    { name: '', role: 'ghost row' },
  ],
};
const season = { title: 'Fall Sports', slug: 'fall', teams: [team] };
const content = { site: { name: 'KAS Athletics' }, pages: [{ title: 'Home', slug: '', showInMenu: true, sections: [] }], seasons: [season], events: [], coaches: [], links: [] };

test('player cards show photo, name, role, number, year and an optional quote, all escaped', () => {
  const out = teamPage(content, season, team);
  assert.match(out, /class="player-grid"/);
  assert.equal((out.match(/class="player-card[ "]/g) || []).length, 2, 'players without a name are skipped');
  assert.match(out, /Adam &lt;b&gt;Chu&lt;\/b&gt;/);
  assert.doesNotMatch(out, /<b>Chu/);
  assert.match(out, /class="player-card__role">Setter</);
  assert.match(out, /class="player-card__number">10</);
  assert.match(out, /Class of 2026/);
  assert.match(out, /class="player-card__quote">We play for &lt;i&gt;each other&lt;\/i&gt;\.</);
  assert.equal((out.match(/class="player-card__quote"/g) || []).length, 1, 'no empty quote for players without one');
  assert.match(out, /player-card--captain/);
  assert.match(out, /class="player-card__badge"/);
  assert.match(out, /Squad<\/dt><dd>2 players/);
  assert.doesNotMatch(out, /data-edit/, 'visitors get no editing markers');
});

test('in the editor every part of a player card is editable and the list can be reordered', () => {
  const out = renderWithEdit(true, () => teamPage(content, season, team));
  assert.match(out, /data-edit-list="seasons\[0\]\.teams\[0\]\.players"/);
  assert.match(out, /data-edit-item="seasons\[0\]\.teams\[0\]\.players\[1\]"/);
  for (const key of ['name', 'role', 'number', 'year', 'quote']) {
    assert.match(out, new RegExp(`data-edit="seasons\\[0\\]\\.teams\\[0\\]\\.players\\[1\\]\\.${key}"`), `${key} is editable`);
  }
  assert.match(out, /data-edit-image="seasons\[0\]\.teams\[0\]\.players\[1\]\.photo"/);
});

test('the captain panel uses the player whose role says captain, with their photo and quote', () => {
  const c = captainOf({ ...team, players: [team.players[0], { ...team.players[1], photo: '/uploads/eric.webp', quote: 'Next point.' }] });
  assert.equal(c.name, 'Eric Su');
  assert.equal(c.photo, '/uploads/eric.webp');
  assert.equal(c.quote, 'Next point.');
  assert.equal(captainOf({ players: [team.players[0]] }).name, 'Adam <b>Chu</b>', 'falls back to the first player');
  assert.equal(captainOf({ ...team, captain: { name: 'Set by staff' } }).quote, '', 'a captain set by staff never borrows a player quote');
});

test('player fields are validated and limited', () => {
  const tooLong = 'x'.repeat(300);
  const { errors } = validateContent(SCHEMA, { ...content, seasons: [{ ...season, teams: [{ ...team, players: [{ name: '', quote: tooLong }] }] }] });
  const paths = errors.map((e) => e.path);
  assert.ok(paths.includes('seasons[0].teams[0].players[0].name'), 'name is required');
  assert.ok(paths.includes('seasons[0].teams[0].players[0].quote'), 'quote is limited');
});
