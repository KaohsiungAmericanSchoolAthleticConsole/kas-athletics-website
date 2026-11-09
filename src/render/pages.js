import { html, paragraphs } from '../lib/html.js';
import { upcomingEvents, pastEvents } from '../lib/events.js';
import { layout, icon, link, more } from './layout.js';
import { photo, eventRow, videoFacade, pageHero, emptyState, initials, heading } from './parts.js';

function withAnchors(events, opts = {}) {
  const seen = new Set();
  return events.map((e) => {
    const anchor = !seen.has(e.date);
    seen.add(e.date);
    return eventRow(e, { ...opts, anchor });
  });
}

const teamCount = (seasons = []) => seasons.reduce((n, s) => n + (s.teams?.length || 0), 0);

function hero(content) {
  const { home } = content;
  return html`
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero__copy">
        ${home.heroEyebrow ? html`<p class="eyebrow">${home.heroEyebrow}</p>` : ''}
        <h1 id="hero-title" class="hero__title">${home.heroTitle}</h1>
        ${home.heroSubtitle ? html`<p class="hero__lead">${home.heroSubtitle}</p>` : ''}
        <div class="hero__actions">
          ${home.heroCtaLabel ? link(home.heroCtaLink || '/events', home.heroCtaLabel, 'btn') : ''}
          ${content.seasons?.length ? more(`/${content.seasons[0].slug}`, 'Meet the teams') : ''}
        </div>
      </div>
      ${home.heroImage ? html`<div class="hero-media" data-hero-media>${photo(home.heroImage, 'KAS student-athletes', { width: 2000, height: 1125, eager: true })}</div>` : ''}
    </section>`;
}

function stats(home) {
  if (!home.stats?.length) return '';
  return html`
    <section class="section section--tight" aria-label="By the numbers">
      <ul class="stats">
        ${home.stats.map((s) => html`<li data-reveal><strong>${s.value}</strong><span>${s.label}</span></li>`)}
      </ul>
    </section>`;
}

function upNext(content) {
  const next = upcomingEvents(content.events).slice(0, 4);
  return html`
    <section class="section section--alt" aria-labelledby="upnext-title">
      ${heading({ id: 'upnext-title', title: 'Up next.', lead: 'Home games, away trips and tournaments.' })}
      <div class="container container--narrow">
        ${next.length ? html`<ol class="event-list" data-reveal>${withAnchors(next)}</ol>` : emptyState('No upcoming games yet. Check back soon.')}
        <p class="center">${more('/events', 'See the full schedule')}</p>
      </div>
    </section>`;
}

function seasonTiles(seasons = []) {
  if (!seasons.length) return '';
  return html`
    <section class="section" aria-labelledby="seasons-title">
      ${heading({ id: 'seasons-title', title: 'Find your season.', lead: `${teamCount(seasons)} teams across the school year.` })}
      <ul class="tiles container">
        ${seasons.map((s) => html`
          <li class="tile" data-reveal>
            <a href="/${s.slug}">
              <span class="tile__copy">
                <span class="tile__title">${s.title}</span>
                <span class="tile__meta">${s.teams?.length || 0} teams${s.dates ? ` · ${s.dates}` : ''}</span>
                <span class="more" aria-hidden="true">Explore${icon('chevron')}</span>
              </span>
              <span class="tile__media">${photo(s.image, '', { width: 1200, height: 800 })}</span>
            </a>
          </li>`)}
      </ul>
    </section>`;
}

function director(home) {
  if (!home.directorMessage) return '';
  return html`
    <section class="section section--alt" aria-labelledby="director-title">
      <h2 id="director-title" class="visually-hidden">A message from the Athletic Director</h2>
      <figure class="quote container container--narrow" data-reveal>
        ${photo(home.directorPhoto, home.directorName, { cls: 'quote__photo', width: 240, height: 240 })}
        <blockquote class="quote__text">${paragraphs(home.directorMessage)}</blockquote>
        <figcaption><strong>${home.directorName}</strong><span>${home.directorRole}</span></figcaption>
      </figure>
    </section>`;
}

function media(content) {
  const { home, site } = content;
  const video = videoFacade(home.videoUrl, home.videoTitle, home.videoPoster);
  if (!video) return '';
  return html`
    <section class="section" aria-labelledby="media-title">
      ${heading({ id: 'media-title', eyebrow: 'Watch', title: home.videoTitle || 'Season recap', lead: home.videoCaption })}
      <div class="container" data-reveal>${video}</div>
      ${site.youtubeUrl ? html`<p class="center">${more(site.youtubeUrl, 'Watch live games on YouTube')}</p>` : ''}
    </section>`;
}

function mission(home) {
  if (!home.missionBody) return '';
  const [first, ...rest] = home.missionBody.split(/\n\s*\n/);
  return html`
    <section class="section mission" aria-labelledby="mission-title">
      <div class="container container--narrow">
        <h2 id="mission-title" class="eyebrow">${home.missionTitle || 'Our mission'}</h2>
        <p class="mission__lead"><span class="read-on">${first.trim()}</span></p>
        ${rest.length ? html`<div class="mission__body" data-reveal>${paragraphs(rest.join('\n\n'))}</div>` : ''}
      </div>
    </section>`;
}

function follow(site) {
  if (!site.instagramUrl && !site.youtubeUrl) return '';
  return html`
    <section class="section section--alt" aria-labelledby="follow-title">
      ${heading({ id: 'follow-title', title: 'Stay in the game.' })}
      <ul class="cards container container--mid">
        ${site.instagramUrl ? html`
          <li class="card" data-reveal>
            <span class="card__icon">${icon('instagram')}</span>
            <h3>Instagram</h3>
            <p>Game-day photos, highlights and announcements from the Athletic Council.</p>
            ${more(site.instagramUrl, `Follow ${site.instagramHandle || ''}`.trim())}
          </li>` : ''}
        ${site.youtubeUrl ? html`
          <li class="card" data-reveal>
            <span class="card__icon">${icon('play')}</span>
            <h3>YouTube</h3>
            <p>Live streams of home games, with commentary from The Score.</p>
            ${more(site.youtubeUrl, 'Watch games')}
          </li>` : ''}
        ${site.newsletterUrl ? html`
          <li class="card" data-reveal>
            <span class="card__icon">${icon('mail')}</span>
            <h3>Newsletter</h3>
            <p>Schedules, results and big news in your inbox.</p>
            ${more(site.newsletterUrl, 'Subscribe')}
          </li>` : ''}
      </ul>
    </section>`;
}

function calendar(home) {
  if (!/^https:\/\/calendar\.google\.com\/calendar\/embed/.test(home.calendarEmbedUrl || '')) return '';
  return html`
    <section class="section" aria-labelledby="cal-title">
      ${heading({ id: 'cal-title', title: 'Calendar.', lead: 'Every game and event, in one place.' })}
      <div class="container" data-reveal>
        <div class="calendar-frame"><iframe title="KAS sports calendar" src="${home.calendarEmbedUrl}" loading="lazy"></iframe></div>
      </div>
    </section>`;
}

export function homePage(content) {
  const { home, site } = content;
  const body = html`${hero(content)}${stats(home)}${upNext(content)}${seasonTiles(content.seasons)}${director(home)}${media(content)}${mission(home)}${follow(site)}${calendar(home)}`;
  return layout(content, { path: '/', body, image: home.heroImage, description: home.heroSubtitle });
}

function teamCard(t, season) {
  const href = t.slug ? `/${season.slug}/${t.slug}` : null;
  const players = (t.roster || '').split('\n').filter((l) => l.trim()).length;
  const facts = [t.coach, players ? `${players} players` : ''].filter(Boolean).join(' · ');
  return html`
    <li class="team-card${href ? ' team-card--link' : ''}" data-reveal>
      <div class="team-card__media">${photo(t.image, t.name, { width: 800, height: 600 })}</div>
      <div class="team-card__body">
        ${t.level ? html`<p class="team-card__level">${t.level}</p>` : ''}
        <h3 class="team-card__name">${href ? html`<a href="${href}">${t.name}</a>` : t.name}</h3>
        ${facts ? html`<p class="team-card__facts">${facts}</p>` : ''}
        ${t.description ? html`<div class="team-card__desc">${paragraphs(t.description)}</div>` : ''}
        ${href ? html`<span class="more" aria-hidden="true">Team page${icon('chevron')}</span>` : ''}
      </div>
    </li>`;
}

export function seasonPage(content, season) {
  const body = html`
    ${pageHero({ eyebrow: season.dates || 'KAS Athletics', title: season.title, intro: season.intro || `${season.teams?.length || 0} teams.`, image: season.image })}
    <section class="section" aria-label="Teams">
      ${season.teams?.length ? html`<ul class="team-grid container">${season.teams.map((t) => teamCard(t, season))}</ul>` : emptyState('Teams for this season will be announced soon.')}
    </section>`;
  return layout(content, { path: `/${season.slug}`, title: season.title, description: season.intro, image: season.image, body });
}

export function eventsPage(content) {
  const upcoming = upcomingEvents(content.events);
  const past = pastEvents(content.events).slice(0, 30);
  const body = html`
    ${pageHero({ eyebrow: 'Games & events', title: 'Schedule.', intro: 'Every home and away game for the Dragons. Come cheer us on.' })}
    <section class="section section--flush" aria-labelledby="upcoming-title">
      <div class="container container--narrow">
        <h2 id="upcoming-title" class="subhead">Upcoming</h2>
        ${upcoming.length ? html`<ol class="event-list">${withAnchors(upcoming)}</ol>` : emptyState('No upcoming games yet.')}
        ${past.length ? html`
          <h2 class="subhead">Recent</h2>
          <ol class="event-list event-list--past">${past.map((e) => eventRow(e, { showResult: true }))}</ol>` : ''}
      </div>
    </section>`;
  return layout(content, { path: '/events', title: 'Schedule', body });
}

export function coachesPage(content) {
  const coaches = content.coaches || [];
  const body = html`
    ${pageHero({ eyebrow: 'Inside Athletics', title: 'Coaches.', intro: 'The people who help our Dragons grow, on and off the court.' })}
    <section class="section section--flush" aria-label="Coaching staff">
      ${coaches.length ? html`<ul class="people container">${coaches.map((c) => html`
        <li class="person" data-reveal>
          ${photo(c.photo, c.name, { cls: 'person__photo', width: 480, height: 600, fallback: initials(c.name) })}
          <h2 class="person__name">${c.name}</h2>
          <p class="person__role">${[c.role, c.sport].filter(Boolean).join(', ')}</p>
          ${c.bio ? html`<div class="person__bio">${paragraphs(c.bio)}</div>` : ''}
          ${c.email ? html`<a class="more" href="mailto:${c.email}">Email${icon('chevron')}</a>` : ''}
        </li>`)}</ul>` : emptyState('Coach profiles are coming soon.')}
    </section>`;
  return layout(content, { path: '/coaches', title: 'Coaches', body });
}

export function contactPage(content) {
  const { contact = {}, site } = content;
  const tel = (v) => (v || '').replace(/[^\d+]/g, '');
  const body = html`
    ${pageHero({ eyebrow: 'Inside Athletics', title: contact.title || 'Contact us.', intro: contact.intro })}
    <section class="section section--flush" aria-label="Contact details">
      <ul class="cards container container--mid">
        ${site.phone ? html`<li class="card"><span class="card__icon">${icon('phone')}</span><h3>Call</h3><p><a href="tel:${tel(site.phone)}">${site.phone}</a></p></li>` : ''}
        ${site.email ? html`<li class="card"><span class="card__icon">${icon('mail')}</span><h3>Email</h3><p><a href="mailto:${site.email}">${site.email}</a></p></li>` : ''}
        ${site.address ? html`<li class="card"><span class="card__icon">${icon('pin')}</span><h3>Visit</h3><p class="pre">${site.address}</p></li>` : ''}
      </ul>
      ${(contact.people || []).length ? html`
        <div class="container container--narrow">
          <h2 class="subhead">People</h2>
          <ul class="list">
            ${contact.people.map((p) => html`
              <li><span><strong>${p.name}</strong><small>${p.role}</small></span>
                <span>${p.email ? html`<a href="mailto:${p.email}">${p.email}</a>` : ''}${p.phone ? html`<a href="tel:${tel(p.phone)}">${p.phone}</a>` : ''}</span></li>`)}
          </ul>
        </div>` : ''}
    </section>`;
  return layout(content, { path: '/contact', title: contact.title || 'Contact', body });
}

export function notFoundPage(content) {
  const body = html`
    <section class="section not-found" aria-labelledby="nf-title">
      ${heading({ id: 'nf-title', eyebrow: 'Error 404', title: 'This page is out of bounds.', lead: 'It may have moved, or the link may be wrong.', level: 1 })}
      <p class="center"><a class="btn" href="/">Go to the home page</a></p>
    </section>`;
  return layout(content, { path: '', title: 'Page not found', body });
}
