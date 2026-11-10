// A single team's page: /<season>/<team>, e.g. /fall-sports/varsity-swimming
import { html, paragraphs, safeUrl } from '../lib/html.js';
import { upcomingEvents, pastEvents } from '../lib/events.js';
import { layout } from './layout.js';
import { photo, eventRow, pageHero, initials, crumbs } from './parts.js';
import { ed, showWhenEditing } from './edit.js';
import { captainReveal } from './captain.js';

const lines = (text) => (text || '').split('\n').map((l) => l.trim()).filter(Boolean);

function teamEvents(content, team) {
  return (content.events || []).filter((e) => e.sport && e.sport.trim().toLowerCase() === team.name.trim().toLowerCase());
}

function schedule(content, team) {
  const mine = teamEvents(content, team);
  const upcoming = upcomingEvents(mine);
  const past = pastEvents(mine);
  if (!upcoming.length && !past.length) return '';
  return html`
    <section class="section" id="team-schedule" aria-labelledby="team-schedule-title">
      <h2 id="team-schedule-title" class="section__title section__title--sm">Schedule &amp; results</h2>
      ${upcoming.length ? html`<ol class="event-list">${upcoming.map((e) => eventRow(e))}</ol>` : ''}
      ${past.length ? html`<ol class="event-list event-list--past">${past.map((e) => eventRow(e, { showResult: true }))}</ol>` : ''}
    </section>`;
}

function playerCards(team, base) {
  const players = (team.players || []).filter((p) => p && p.name);
  if (!players.length) return '';
  const b = base;
  return html`
    <section class="section" id="team-roster" aria-labelledby="team-roster-title" ${edList(`${b}.players`)}>
      <h2 id="team-roster-title" class="section__title section__title--sm">Roster <span class="count">${players.length}</span></h2>
      <p class="section__intro">The Dragons who make it happen.</p>
      <ul class="player-grid">
        ${players.map((p, i) => html`
          <li class="player-card" ${edItem(`${b}.players[${i}]`)}>
            ${photo(p.photo, p.name, { cls: 'player-card__photo', width: 400, height: 400, edit: `${b}.players[${i}].photo` })}
            <div class="player-card__body">
              <h3 class="player-card__name"${ed(`${b}.players[${i}].name`)}>${p.name}</h3>
              ${p.role ? html`<p class="player-card__role"${ed(`${b}.players[${i}].role`)}>${p.role}</p>` : html`<p class="player-card__role player-card__role--empty"${ed(`${b}.players[${i}].role`, { placeholder: 'Role / position' })}></p>`}
              ${showWhenEditing(p.bio) ? html`<p class="player-card__bio"${ed(`${b}.players[${i}].bio`, { multiline: true, placeholder: 'Short description' })}>${p.bio}</p>` : (p.bio ? html`<p class="player-card__bio">${p.bio}</p>` : '')}
            </div>
          </li>`)}
      </ul>
    </section>`;
}

function roster(team, base) {
  const players = (team.players || []).filter((p) => p && p.name);
  if (players.length) return playerCards(team, base);
  const linesList = lines(team.roster);
  if (!linesList.length) return '';
  return html`
    <section class="section" id="team-roster" aria-labelledby="team-roster-title">
      <h2 id="team-roster-title" class="section__title section__title--sm">Roster <span class="count">${linesList.length}</span></h2>
      <p class="section__intro">The Dragons who make it happen.</p>
      <ul class="roster">
        ${linesList.map((p) => html`<li><span class="roster__badge" aria-hidden="true">${initials(p.replace(/[’'‘]\d{2}\b/, ''))}</span><span>${p}</span></li>`)}
      </ul>
    </section>`;
}

function gallery(team) {
  const photos = (team.gallery || []).filter((g) => g.image);
  if (!photos.length) return '';
  return html`
    <section class="section" id="team-photos" aria-labelledby="team-photos-title">
      <h2 id="team-photos-title" class="section__title section__title--sm">Photos</h2>
      <p class="section__intro">Game day, practice and everything in between.</p>
      <ul class="gallery">
        ${photos.map((g, i) => html`
          <li>
            <a href="${safeUrl(g.image)}" target="_blank" rel="noopener">
              ${photo(g.image, g.caption || `${team.name} photo ${i + 1}`, { width: 600, height: 400 })}
            </a>
            ${g.caption ? html`<p class="gallery__caption">${g.caption}</p>` : ''}
          </li>`)}
      </ul>
    </section>`;
}

/** "On this page" links, so a long team page is easy to skim with a keyboard. */
function jumpNav({ captain, schedule: hasSchedule, roster: hasRoster, photos }) {
  const links = [
    captain && { href: '#team-captain', label: 'Captain' },
    hasSchedule && { href: '#team-schedule', label: 'Schedule' },
    hasRoster && { href: '#team-roster', label: 'Roster' },
    photos && { href: '#team-photos', label: 'Photos' },
  ].filter(Boolean);
  if (links.length < 2) return '';
  return html`
    <nav class="jump-nav" aria-label="On this page">
      <span class="jump-nav__label">On this page</span>
      ${links.map((l) => html`<a href="${l.href}">${l.label}</a>`)}
    </nav>`;
}

/** Previous / next team, so people can keep exploring without going back. */
function pager(season, team, teams) {
  const linked = teams.filter((t) => t.slug);
  const i = linked.indexOf(team);
  const prev = i > 0 ? linked[i - 1] : null;
  const next = i > -1 && i < linked.length - 1 ? linked[i + 1] : null;
  if (!prev && !next) return '';
  const item = (t, dir) => html`
    <a class="team-pager__link team-pager__link--${dir}" href="/${season.slug}/${t.slug}">
      <span>${dir === 'prev' ? '← Previous team' : 'Next team →'}</span>
      <strong>${t.name}</strong>
    </a>`;
  return html`
    <nav class="team-pager" aria-label="More teams in ${season.title}">
      ${prev ? item(prev, 'prev') : html`<span aria-hidden="true"></span>`}
      <a class="team-pager__all" href="/${season.slug}">All ${season.title}</a>
      ${next ? item(next, 'next') : html`<span aria-hidden="true"></span>`}
    </nav>`;
}

export function teamPage(content, season, team) {
  const si = (content.seasons || []).indexOf(season);
  const teams = season.teams || [];
  const base = `seasons[${si}].teams[${teams.indexOf(team)}]`;
  const hasSchedule = teamEvents(content, team).length > 0;
  const hasRoster = lines(team.roster).length > 0 || (team.players || []).some((p) => p && p.name);
  const hasPhotos = (team.gallery || []).some((g) => g.image);
  const body = html`
    ${crumbs([{ href: '/', label: 'Home' }, { href: `/${season.slug}`, label: season.title }, { label: team.name }])}
    ${pageHero({ eyebrow: [season.title, team.level].filter(Boolean).join(' · '), title: team.name, image: team.image, edit: { title: `${base}.name`, image: `${base}.image` } })}
    ${captainReveal(content, team, base, season)}
    <section class="section section--tight team-intro" id="team-about" aria-label="About the team">
      <a class="text-link" href="/${season.slug}">← All ${season.title}</a>
      ${jumpNav({ captain: true, schedule: hasSchedule, roster: hasRoster, photos: hasPhotos })}
      <dl class="team-facts">
        ${showWhenEditing(team.coach) ? html`<div><dt>Coaches</dt><dd${ed(`${base}.coach`, { placeholder: 'Add coaches' })}>${team.coach}</dd></div>` : ''}
        ${showWhenEditing(team.practice) ? html`<div><dt>Practice</dt><dd${ed(`${base}.practice`, { placeholder: 'Add practice times' })}>${team.practice}</dd></div>` : ''}
        ${hasRoster ? html`<div><dt>Squad</dt><dd>${lines(team.roster).length} players</dd></div>` : ''}
      </dl>
      ${showWhenEditing(team.description) ? html`<div class="team-intro__text"${ed(`${base}.description`, { multiline: true, placeholder: 'Describe the team' })}>${paragraphs(team.description)}</div>` : ''}
    </section>
    ${schedule(content, team)}
    ${roster(team, base)}
    ${gallery(team)}
    ${pager(season, team, teams)}`;
  return layout(content, {
    path: `/${season.slug}`, title: `${team.name} · ${season.title}`, description: team.description || `${team.name} at KAS Athletics`, image: team.image, body,
  });
}

export function findTeam(content, pathname) {
  const m = /^\/([a-z0-9-]+)\/([a-z0-9-]+)$/.exec(pathname);
  if (!m) return null;
  const season = (content.seasons || []).find((s) => s.slug === m[1]);
  const team = season?.teams?.find((t) => t.slug === m[2]);
  return team ? { season, team } : null;
}
