// Scoreboard dashboard: /scores (games) and /scores/standings.
import { html, raw, safeUrl, youtubeId } from '../lib/html.js';
import { todayInSchoolZone, formatDate, formatTime } from '../lib/events.js';
import { layout, icon } from './layout.js';
import { initials } from './parts.js';

const RESULTS_LIMIT = 24;
const UPCOMING_LIMIT = 12;
const FORM_LENGTH = 5;

const hasScores = (e) => e.kasScore !== undefined && e.kasScore !== '' && e.opponentScore !== undefined && e.opponentScore !== '';
const byDateTime = (a, b) => `${a.date}T${a.time || '00:00'}`.localeCompare(`${b.date}T${b.time || '00:00'}`);

function dayLabel(date, today) {
  if (date === today) return 'Today';
  const diff = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  if (diff === -1) return 'Yesterday';
  if (diff === 1) return 'Tomorrow';
  return formatDate(date);
}

/**
 * Works out what a game card should say.
 * @returns {{ kind: 'live'|'final'|'today'|'upcoming'|'past'|'postponed'|'cancelled', label: string, sub: string }}
 */
export function gameState(e, now = new Date()) {
  const today = todayInSchoolZone(now);
  const day = dayLabel(e.date, today);
  if (e.status === 'cancelled') return { kind: 'cancelled', label: 'Cancelled', sub: day };
  if (e.status === 'postponed') return { kind: 'postponed', label: 'Postponed', sub: day };
  if (e.status === 'live') return { kind: 'live', label: 'Live', sub: e.result || day };
  if (hasScores(e) || (e.result && e.date <= today)) return { kind: 'final', label: 'Final', sub: day };
  if (e.date === today) return { kind: 'today', label: formatTime(e.time) || 'All day', sub: 'Today' };
  if (e.date > today) return { kind: 'upcoming', label: day, sub: formatTime(e.time) || 'All day' };
  return { kind: 'past', label: day, sub: 'Score not posted' };
}

/** Which side won: 'kas', 'opp', 'tie' or null. */
export function winner(e) {
  if (!hasScores(e)) return null;
  const k = Number(e.kasScore);
  const o = Number(e.opponentScore);
  if (k === o) return 'tie';
  return k > o ? 'kas' : 'opp';
}

/** Win/loss records per team from final games with scores. */
export function standings(events = []) {
  const table = new Map();
  events.filter((e) => e.sport && e.opponent && hasScores(e) && e.status !== 'live' && e.status !== 'cancelled')
    .toSorted(byDateTime)
    .forEach((e) => {
      const row = table.get(e.sport) || { team: e.sport, w: 0, l: 0, t: 0, form: [] };
      const r = { kas: 'W', opp: 'L', tie: 'T' }[winner(e)];
      table.set(e.sport, {
        ...row, w: row.w + (r === 'W'), l: row.l + (r === 'L'), t: row.t + (r === 'T'),
        form: [...row.form, r].slice(-FORM_LENGTH),
      });
    });
  return [...table.values()]
    .map((r) => ({ ...r, played: r.w + r.l + r.t, pct: (r.w + r.t / 2) / Math.max(1, r.w + r.l + r.t) }))
    .toSorted((a, b) => b.pct - a.pct || b.w - a.w || a.team.localeCompare(b.team));
}

function crest(src, name) {
  return src
    ? html`<img class="sb-crest" src="${safeUrl(src)}" alt="" width="40" height="40" loading="lazy">`
    : html`<span class="sb-crest sb-crest--mono" aria-hidden="true">${initials(name)}</span>`;
}

function teamRow(side, { won, final }) {
  return html`
    <div class="sb-team${final && !won ? ' is-dim' : ''}">
      ${crest(side.logo, side.name)}
      <span class="sb-team__name">${side.name}</span>
      <span class="sb-team__score">${side.score}</span>
      <span class="sb-team__win" aria-hidden="true">${won ? raw('◀') : ''}</span>
    </div>`;
}

function thumb(e) {
  const yt = youtubeId(e.link);
  const src = e.photo || (yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : '');
  if (!src && !e.link) return '';
  const label = yt ? 'Highlights' : 'Details';
  const inner = html`
    ${src ? html`<img src="${safeUrl(src)}" alt="" width="160" height="90" loading="lazy">` : ''}
    <span class="sb-thumb__label">${yt ? icon('play') : ''}${label}</span>`;
  return e.link
    ? html`<a class="sb-thumb${src ? '' : ' sb-thumb--plain'}" href="${safeUrl(e.link)}" target="_blank" rel="noopener noreferrer">${inner}<span class="visually-hidden"> for ${e.title} (opens in a new tab)</span></a>`
    : html`<span class="sb-thumb">${inner}</span>`;
}

function gameCard(e, site, now) {
  const state = gameState(e, now);
  const final = state.kind === 'final';
  const showScore = hasScores(e) && (final || state.kind === 'live');
  const won = final ? winner(e) : null;
  const kas = { name: site.shortName || 'KAS', logo: site.logo || '/img/crest.svg', score: showScore ? e.kasScore : '' };
  const opp = { name: e.opponent, logo: e.opponentLogo, score: showScore ? e.opponentScore : '' };
  const rows = e.venue === 'home' ? [[opp, 'opp'], [kas, 'kas']] : [[kas, 'kas'], [opp, 'opp']];
  const summary = e.opponent
    ? `${e.sport ? `${e.sport}: ` : ''}${rows.map(([s]) => `${s.name}${s.score !== '' ? ` ${s.score}` : ''}`).join(', ')}. ${state.label}, ${state.sub}.`
    : `${e.sport ? `${e.sport}: ` : ''}${e.title}. ${state.label}${e.result ? `, ${e.result}` : ''}.`;

  return html`
    <li class="sb-card sb-card--${state.kind}">
      <article aria-label="${summary}">
        <p class="sb-card__sport">${e.sport || e.title}${e.venue ? html` · <span>${{ home: 'Home', away: 'Away', neutral: 'Neutral' }[e.venue]}</span>` : ''}</p>
        <div class="sb-card__body">
          <div class="sb-card__teams" aria-hidden="true">
            ${e.opponent
              ? rows.map(([side, key]) => teamRow(side, { won: won === key, final }))
              : html`<div class="sb-meet"><span class="sb-meet__title">${e.title}</span>${e.result ? html`<span class="sb-meet__result">${e.result}</span>` : ''}<span class="sb-meet__where">${e.location}</span></div>`}
          </div>
          <div class="sb-card__status">
            <p class="sb-status" aria-hidden="true"><strong>${state.kind === 'live' ? html`<span class="sb-live-dot"></span>` : ''}${state.label}</strong><span>${state.sub}</span></p>
            ${thumb(e)}
          </div>
        </div>
      </article>
    </li>`;
}

function grid(title, list, site, now) {
  if (!list.length) return '';
  return html`
    <section class="sb-section" aria-label="${title}">
      <h2 class="sb-section__title">${title}</h2>
      <ul class="sb-grid">${list.map((e) => gameCard(e, site, now))}</ul>
    </section>`;
}

function teamFilter(events, current, path) {
  const teams = [...new Set(events.map((e) => e.sport).filter(Boolean))].sort();
  if (teams.length < 2) return '';
  return html`
    <form class="sb-filter" method="get" action="${path}" data-autosubmit>
      <label for="sb-team">Team</label>
      <select id="sb-team" name="team">
        <option value="">All teams</option>
        ${teams.map((t) => html`<option value="${t}"${t === current ? raw(' selected') : ''}>${t}</option>`)}
      </select>
      <button type="submit" class="sb-filter__go">Show</button>
    </form>`;
}

function gamesTab(content, team, now) {
  const today = todayInSchoolZone(now);
  const events = (content.events || []).filter((e) => e.date && (!team || e.sport === team));
  const states = events.map((e) => [e, gameState(e, now)]);
  const pick = (kinds) => states.filter(([, s]) => kinds.includes(s.kind)).map(([e]) => e);
  const now_ = pick(['live', 'today']).toSorted(byDateTime);
  const upcoming = pick(['upcoming', 'postponed']).filter((e) => e.date > today || e.status === 'postponed').toSorted(byDateTime).slice(0, UPCOMING_LIMIT);
  const results = pick(['final', 'past', 'cancelled']).toSorted(byDateTime).reverse().slice(0, RESULTS_LIMIT);
  const body = html`${grid('Today', now_, content.site, now)}${grid('Coming up', upcoming, content.site, now)}${grid('Results', results, content.site, now)}`;
  const empty = !now_.length && !upcoming.length && !results.length;
  return { body: empty ? html`<p class="sb-empty">No games yet${team ? ' for this team' : ''}.</p>` : body, live: now_.length > 0 };
}

function standingsTab(content) {
  const rows = standings(content.events);
  if (!rows.length) return html`<p class="sb-empty">Standings appear here once final scores are entered for games against an opponent.</p>`;
  const teamLinks = new Map((content.seasons || []).flatMap((s) => (s.teams || []).filter((t) => t.slug).map((t) => [t.name, `/${s.slug}/${t.slug}`])));
  return html`
    <div class="sb-table-wrap">
      <table class="sb-table">
        <caption class="visually-hidden">Win and loss record for each KAS team</caption>
        <thead><tr><th scope="col">Team</th><th scope="col"><abbr title="Wins">W</abbr></th><th scope="col"><abbr title="Losses">L</abbr></th><th scope="col"><abbr title="Ties">T</abbr></th><th scope="col">Win %</th><th scope="col">Last ${FORM_LENGTH}</th></tr></thead>
        <tbody>
          ${rows.map((r) => html`
            <tr>
              <th scope="row">${teamLinks.has(r.team) ? html`<a href="${teamLinks.get(r.team)}">${r.team}</a>` : r.team}</th>
              <td>${r.w}</td><td>${r.l}</td><td>${r.t}</td>
              <td>${r.pct.toFixed(3).replace(/^0/, '')}</td>
              <td><span class="sb-form">${r.form.map((f) => html`<span class="sb-form__${f}" title="${{ W: 'Win', L: 'Loss', T: 'Tie' }[f]}">${f}</span>`)}</span></td>
            </tr>`)}
        </tbody>
      </table>
    </div>`;
}

/**
 * @param {object} content
 * @param {{ tab?: 'games'|'standings', team?: string, now?: Date }} opts
 */
export function scoresPage(content, { tab = 'games', team = '', now = new Date() } = {}) {
  const { site } = content;
  const games = tab === 'games' ? gamesTab(content, team, now) : null;
  const tabs = [['games', 'Games', '/scores'], ['standings', 'Standings', '/scores/standings']];
  const body = html`
    <section class="sb" aria-labelledby="sb-title">
      <div class="sb-head">
        <div class="sb-head__inner">
          <div class="sb-head__brand">
            <img src="${safeUrl(site.logo || '/img/crest.svg')}" alt="" width="56" height="56">
            <h1 id="sb-title">Scoreboard</h1>
          </div>
          <nav class="sb-tabs" aria-label="Scoreboard">
            ${tabs.map(([id, label, href]) => html`<a href="${href}"${id === tab ? raw(' aria-current="page"') : ''}>${label}</a>`)}
          </nav>
        </div>
      </div>
      <div class="sb-main"${games?.live ? raw(' data-live-refresh') : ''} data-scoreboard>
        ${tab === 'games' ? html`${teamFilter(content.events || [], team, '/scores')}${games.body}` : standingsTab(content)}
      </div>
    </section>`;
  return layout(content, { path: '/scores', title: tab === 'standings' ? 'Standings' : 'Scoreboard', description: 'Live scores, results and standings for KAS Dragons teams.', body });
}
