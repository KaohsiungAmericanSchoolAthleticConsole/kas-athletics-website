import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameState, winner, standings, scoresPage } from '../src/render/scores.js';
import { validateContent } from '../src/lib/validate.js';
import { SCHEMA } from '../src/schema.js';

const NOW = new Date('2026-11-10T04:00:00Z'); // Nov 10 noon in Taipei
const game = (o) => ({ date: '2026-11-10', time: '15:30', sport: 'Varsity Boys Basketball', title: 'KAS vs. MAK', opponent: 'Morrison', venue: 'home', kasScore: '', opponentScore: '', status: 'auto', result: '', ...o });

test('gameState covers every status a card can show', () => {
  assert.equal(gameState(game({}), NOW).kind, 'today');
  assert.equal(gameState(game({}), NOW).label, '3:30 PM');
  assert.equal(gameState(game({ date: '2026-11-11' }), NOW).label, 'Tomorrow');
  assert.equal(gameState(game({ date: '2026-12-01' }), NOW).kind, 'upcoming');
  assert.equal(gameState(game({ kasScore: '50', opponentScore: '40' }), NOW).kind, 'final');
  assert.equal(gameState(game({ date: '2026-11-09', kasScore: '1', opponentScore: '2' }), NOW).sub, 'Yesterday');
  assert.equal(gameState(game({ date: '2026-11-01' }), NOW).kind, 'past');
  assert.equal(gameState(game({ status: 'live', kasScore: '10', opponentScore: '8' }), NOW).kind, 'live');
  assert.equal(gameState(game({ status: 'postponed' }), NOW).kind, 'postponed');
  assert.equal(gameState(game({ status: 'cancelled' }), NOW).kind, 'cancelled');
  assert.equal(gameState(game({ date: '2026-10-01', opponent: '', result: '2nd of 6' }), NOW).kind, 'final');
});

test('winner compares scores as numbers, not text', () => {
  assert.equal(winner(game({ kasScore: '9', opponentScore: '10' })), 'opp');
  assert.equal(winner(game({ kasScore: '100', opponentScore: '99' })), 'kas');
  assert.equal(winner(game({ kasScore: '3', opponentScore: '3' })), 'tie');
  assert.equal(winner(game({})), null);
});

test('standings count wins, losses, ties and recent form; ignore live and meets', () => {
  const rows = standings([
    game({ date: '2026-10-01', kasScore: '50', opponentScore: '40' }),
    game({ date: '2026-10-02', kasScore: '30', opponentScore: '40' }),
    game({ date: '2026-10-03', kasScore: '20', opponentScore: '20' }),
    game({ date: '2026-10-04', kasScore: '20', opponentScore: '10', status: 'live' }),
    game({ date: '2026-10-05', opponent: '', result: '1st' }),
    game({ sport: 'Varsity Girls Volleyball', kasScore: '3', opponentScore: '0' }),
  ]);
  assert.deepEqual(rows.map((r) => r.team), ['Varsity Girls Volleyball', 'Varsity Boys Basketball']);
  const bb = rows[1];
  assert.deepEqual([bb.w, bb.l, bb.t, bb.form.join('')], [1, 1, 1, 'WLT']);
  assert.equal(bb.pct, 0.5);
});

test('scoreboard renders home team second, marks the winner and escapes names', () => {
  const content = JSON.parse(readFileSync(new URL('./fixtures/content.json', import.meta.url), 'utf8'));
  content.events = [game({ opponent: '<b>Evil</b>', kasScore: '61', opponentScore: '55' })];
  const out = scoresPage(content, { now: NOW });
  assert.match(out, /&lt;b&gt;Evil&lt;\/b&gt;/);
  assert.doesNotMatch(out, /<b>Evil/);
  assert.ok(out.indexOf('&lt;b&gt;Evil') < out.indexOf('sb-team__name">KAS'), 'away team listed first');
  assert.match(out, /◀/);
  assert.match(out, /class="sb-team is-dim"/);
  const standingsHtml = scoresPage(content, { tab: 'standings', now: NOW });
  assert.match(standingsHtml, /<table class="sb-table">/);
});

test('scores must be whole numbers', () => {
  const content = JSON.parse(readFileSync(new URL('./fixtures/content.json', import.meta.url), 'utf8'));
  content.events = [game({ kasScore: '3-1' })];
  const paths = validateContent(SCHEMA, content).errors.map((e) => e.path);
  assert.ok(paths.includes('events[0].kasScore'));
});
