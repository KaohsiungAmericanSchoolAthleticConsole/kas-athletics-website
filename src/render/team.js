// A single team's page: /<season>/<team>, e.g. /fall-sports/varsity-swimming
import { html, paragraphs, safeUrl } from '../lib/html.js';
import { upcomingEvents, pastEvents } from '../lib/events.js';
import { layout, icon } from './layout.js';
import { photo, eventRow, pageHero } from './parts.js';

const lines = (text) => (text || '').split('\n').map((l) => l.trim()).filter(Boolean);

function facts(team, season) {
  const rows = [
    ['Season', season.title],
    ['Level', team.level],
    ['Coaches', team.coach],
    ['Practice', team.practice],
    ['Players', lines(team.roster).length ? String(lines(team.roster).length) : ''],
  ].filter(([, v]) => v);
  return html`
    <section class="section section--flush" aria-label="About the team">
      <div class="container container--narrow">
        <a class="more more--back" href="/${season.slug}">${icon('chevron')}All ${season.title}</a>
        ${team.description ? html`<div class="team-about" data-reveal>${paragraphs(team.description)}</div>` : ''}
        <dl class="specs" data-reveal>${rows.map(([k, v]) => html`<div><dt>${k}</dt><dd>${v}</dd></div>`)}</dl>
      </div>
    </section>`;
}

function schedule(content, team) {
  const mine = (content.events || []).filter((e) => e.sport && e.sport.trim().toLowerCase() === team.name.trim().toLowerCase());
  const upcoming = upcomingEvents(mine);
  const past = pastEvents(mine);
  if (!upcoming.length && !past.length) return '';
  return html`
    <section class="section section--alt" aria-labelledby="team-schedule">
      <div class="container container--narrow">
        <h2 id="team-schedule" class="subhead">Schedule</h2>
        ${upcoming.length ? html`<ol class="event-list">${upcoming.map((e) => eventRow(e))}</ol>` : ''}
        ${past.length ? html`<ol class="event-list event-list--past">${past.map((e) => eventRow(e, { showResult: true }))}</ol>` : ''}
      </div>
    </section>`;
}

function roster(team) {
  const players = lines(team.roster);
  if (!players.length) return '';
  return html`
    <section class="section" aria-labelledby="team-roster">
      <div class="container container--narrow">
        <h2 id="team-roster" class="subhead">Roster</h2>
        <ul class="roster" data-reveal>${players.map((p) => html`<li>${p}</li>`)}</ul>
      </div>
    </section>`;
}

function gallery(team) {
  const photos = (team.gallery || []).filter((g) => g.image);
  if (!photos.length) return '';
  return html`
    <section class="section section--alt" aria-labelledby="team-gallery">
      <div class="container">
        <h2 id="team-gallery" class="subhead">Photos</h2>
        <ul class="gallery">
          ${photos.map((g, i) => html`
            <li data-reveal>
              <a href="${safeUrl(g.image)}" target="_blank" rel="noopener">
                ${photo(g.image, g.caption || `${team.name}, photo ${i + 1}`, { width: 600, height: 750 })}
              </a>
              ${g.caption ? html`<p class="gallery__caption">${g.caption}</p>` : ''}
            </li>`)}
        </ul>
      </div>
    </section>`;
}

export function teamPage(content, season, team) {
  const body = html`
    ${pageHero({ eyebrow: team.level || season.title, title: team.name, image: team.image })}
    ${facts(team, season)}
    ${schedule(content, team)}
    ${roster(team)}
    ${gallery(team)}`;
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
