// A single team's page: /<season>/<team>, e.g. /fall-sports/varsity-swimming
import { html, paragraphs, safeUrl } from '../lib/html.js';
import { upcomingEvents, pastEvents } from '../lib/events.js';
import { layout } from './layout.js';
import { photo, eventRow, pageHero, initials } from './parts.js';
import { ed, showWhenEditing } from './edit.js';

const lines = (text) => (text || '').split('\n').map((l) => l.trim()).filter(Boolean);

function schedule(content, team) {
  const mine = (content.events || []).filter((e) => e.sport && e.sport.trim().toLowerCase() === team.name.trim().toLowerCase());
  const upcoming = upcomingEvents(mine);
  const past = pastEvents(mine);
  if (!upcoming.length && !past.length) return '';
  return html`
    <section class="section" aria-labelledby="team-schedule">
      <h2 id="team-schedule" class="section__title section__title--sm">Schedule &amp; results</h2>
      ${upcoming.length ? html`<ol class="event-list">${upcoming.map((e) => eventRow(e))}</ol>` : ''}
      ${past.length ? html`<ol class="event-list event-list--past">${past.map((e) => eventRow(e, { showResult: true }))}</ol>` : ''}
    </section>`;
}

function roster(team) {
  const players = lines(team.roster);
  if (!players.length) return '';
  return html`
    <section class="section" aria-labelledby="team-roster">
      <h2 id="team-roster" class="section__title section__title--sm">Roster <span class="count">${players.length}</span></h2>
      <ul class="roster">
        ${players.map((p) => html`<li><span class="roster__badge" aria-hidden="true">${initials(p.replace(/[’'‘]\d{2}\b/, ''))}</span><span>${p}</span></li>`)}
      </ul>
    </section>`;
}

function gallery(team) {
  const photos = (team.gallery || []).filter((g) => g.image);
  if (!photos.length) return '';
  return html`
    <section class="section" aria-labelledby="team-gallery">
      <h2 id="team-gallery" class="section__title section__title--sm">Photos</h2>
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

export function teamPage(content, season, team) {
  const si = (content.seasons || []).indexOf(season);
  const base = `seasons[${si}].teams[${(season.teams || []).indexOf(team)}]`;
  const body = html`
    ${pageHero({ eyebrow: [season.title, team.level].filter(Boolean).join(' · '), title: team.name, image: team.image, edit: { title: `${base}.name`, image: `${base}.image` } })}
    <section class="section section--tight team-intro" aria-label="About the team">
      <a class="text-link" href="/${season.slug}">← All ${season.title}</a>
      <dl class="team-facts">
        ${showWhenEditing(team.coach) ? html`<div><dt>Coaches</dt><dd${ed(`${base}.coach`, { placeholder: 'Add coaches' })}>${team.coach}</dd></div>` : ''}
        ${showWhenEditing(team.practice) ? html`<div><dt>Practice</dt><dd${ed(`${base}.practice`, { placeholder: 'Add practice times' })}>${team.practice}</dd></div>` : ''}
      </dl>
      ${showWhenEditing(team.description) ? html`<div class="team-intro__text"${ed(`${base}.description`, { multiline: true, placeholder: 'Describe the team' })}>${paragraphs(team.description)}</div>` : ''}
    </section>
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

