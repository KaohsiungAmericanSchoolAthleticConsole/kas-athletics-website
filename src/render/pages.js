import { html, paragraphs } from '../lib/html.js';
import { upcomingEvents, pastEvents } from '../lib/events.js';
import { layout, icon, link } from './layout.js';
import { photo, eventRow, videoFacade, pageHero, emptyState, initials } from './parts.js';

function withAnchors(events, opts = {}) {
  const seen = new Set();
  return events.map((e) => {
    const anchor = !seen.has(e.date);
    seen.add(e.date);
    return eventRow(e, { ...opts, anchor });
  });
}

function hero(home) {
  return html`
    <section class="hero" aria-labelledby="hero-title">
      ${home.heroImage ? photo(home.heroImage, '', { cls: 'hero__bg', width: 1920, height: 1080, eager: true }) : html`<div class="hero__bg hero__bg--pattern" aria-hidden="true"></div>`}
      <div class="hero__inner">
        ${home.heroEyebrow ? html`<p class="eyebrow eyebrow--light">${home.heroEyebrow}</p>` : ''}
        <h1 id="hero-title" class="hero__title">${home.heroTitle}</h1>
        ${home.heroSubtitle ? html`<p class="hero__subtitle">${home.heroSubtitle}</p>` : ''}
        <div class="hero__actions">
          ${home.heroCtaLabel ? link(home.heroCtaLink || '/events', html`${home.heroCtaLabel} ${icon('arrow')}`, 'btn btn--primary') : ''}
          <a class="btn btn--glass" href="/events">${icon('calendar')} Full schedule</a>
        </div>
      </div>
      ${home.stats?.length ? html`
        <ul class="stat-strip" aria-label="KAS Athletics by the numbers">
          ${home.stats.map((s) => html`<li><strong>${s.value}</strong><span>${s.label}</span></li>`)}
        </ul>` : ''}
    </section>`;
}

function upNext(content) {
  const next = upcomingEvents(content.events).slice(0, 4);
  return html`
    <section class="section section--tight" aria-labelledby="upnext-title">
      <div class="section__head">
        <h2 id="upnext-title" class="section__title"><span class="kicker">Up next</span>On the schedule</h2>
        <a class="text-link" href="/events">All games ${icon('arrow')}</a>
      </div>
      ${next.length ? html`<ol class="event-list">${withAnchors(next)}</ol>` : emptyState('No upcoming games yet — check back soon.')}
    </section>`;
}

function seasonGrid(seasons = []) {
  if (!seasons.length) return '';
  return html`
    <section class="section" aria-labelledby="seasons-title">
      <div class="section__head">
        <h2 id="seasons-title" class="section__title"><span class="kicker">Programs</span>Find your season</h2>
      </div>
      <ul class="season-grid">
        ${seasons.map((s, i) => html`
          <li class="season-card${i === 0 ? ' season-card--feature' : ''}">
            <a href="/${s.slug}">
              ${photo(s.image, '', { cls: 'season-card__img', width: 900, height: 700 })}
              <span class="season-card__shade" aria-hidden="true"></span>
              <span class="season-card__body">
                <span class="season-card__count">${s.teams?.length || 0} teams${s.dates ? ` · ${s.dates}` : ''}</span>
                <span class="season-card__title">${s.title}</span>
                <span class="season-card__go" aria-hidden="true">${icon('arrow')}</span>
              </span>
            </a>
          </li>`)}
      </ul>
    </section>`;
}

function director(home) {
  if (!home.directorMessage && !home.directorName) return '';
  return html`
    <section class="section director" aria-labelledby="director-title">
      <figure class="director__figure">
        ${photo(home.directorPhoto, home.directorName, { cls: 'director__photo', width: 600, height: 750 })}
        <figcaption><strong>${home.directorName}</strong><span>${home.directorRole}</span></figcaption>
      </figure>
      <div class="director__body">
        <h2 id="director-title" class="section__title"><span class="kicker">From the AD</span>A message to our Dragons</h2>
        <blockquote class="director__quote">${paragraphs(home.directorMessage)}</blockquote>
      </div>
    </section>`;
}

function media(content) {
  const { home, site } = content;
  const video = videoFacade(home.videoUrl, home.videoTitle);
  return html`
    <section class="section media" aria-labelledby="media-title">
      <div class="media__video">
        <h2 id="media-title" class="section__title"><span class="kicker">Watch</span>${home.videoTitle || 'Season recap'}</h2>
        ${video || html`
          <div class="video video--empty">
            <div class="video__empty">
              <p>Catch every home game live.</p>
              ${site.youtubeUrl ? link(site.youtubeUrl, html`${icon('play')} Open the YouTube channel`, 'btn btn--primary') : ''}
            </div>
          </div>`}
        ${home.videoCaption ? html`<p class="media__caption">${home.videoCaption}</p>` : ''}
      </div>
      <aside class="social-card" aria-labelledby="social-title">
        <span class="social-card__icon" aria-hidden="true">${icon('instagram')}</span>
        <h2 id="social-title" class="social-card__title">Follow the Dragons</h2>
        <p>Game-day photos, highlights and announcements from the Athletic Council.</p>
        ${site.instagramUrl ? link(site.instagramUrl, html`${site.instagramHandle || 'Instagram'} ${icon('arrow')}`, 'btn btn--primary') : ''}
        ${site.youtubeUrl ? link(site.youtubeUrl, html`${icon('play')} Live games on YouTube`, 'text-link') : ''}
      </aside>
    </section>`;
}

function mission(home) {
  if (!home.missionBody) return '';
  return html`
    <section class="mission" aria-labelledby="mission-title">
      <div class="mission__inner">
        <h2 id="mission-title" class="mission__title">${home.missionTitle || 'Our mission'}</h2>
        <div class="mission__body">${paragraphs(home.missionBody)}</div>
      </div>
    </section>`;
}

function calendar(home) {
  if (!/^https:\/\/calendar\.google\.com\/calendar\/embed/.test(home.calendarEmbedUrl || '')) return '';
  return html`
    <section class="section" aria-labelledby="cal-title">
      <h2 id="cal-title" class="section__title"><span class="kicker">Calendar</span>KAS sports calendar</h2>
      <div class="calendar-frame"><iframe title="KAS sports calendar" src="${home.calendarEmbedUrl}" loading="lazy"></iframe></div>
    </section>`;
}

function newsletter(site) {
  if (!site.newsletterUrl) return '';
  return html`
    <section class="cta-band" aria-labelledby="news-title">
      <div>
        <h2 id="news-title" class="cta-band__title">Never miss a game.</h2>
        <p>Get schedules, results and big news in your inbox.</p>
      </div>
      ${link(site.newsletterUrl, html`Subscribe ${icon('arrow')}`, 'btn btn--light')}
    </section>`;
}

export function homePage(content) {
  const { home, site } = content;
  const body = html`${hero(home)}${upNext(content)}${seasonGrid(content.seasons)}${director(home)}${media(content)}${mission(home)}${calendar(home)}${newsletter(site)}`;
  return layout(content, { path: '/', body, image: home.heroImage, description: home.heroSubtitle });
}

function teamCard(t, season) {
  const href = t.slug ? `/${season.slug}/${t.slug}` : null;
  const players = (t.roster || '').split('\n').filter((l) => l.trim()).length;
  return html`
    <li class="team-card${href ? ' team-card--link' : ''}">
      ${photo(t.image, t.name, { cls: 'team-card__img', width: 800, height: 560 })}
      <div class="team-card__body">
        ${t.level ? html`<p class="team-card__level">${t.level}</p>` : ''}
        <h3 class="team-card__name">${href ? html`<a href="${href}">${t.name}</a>` : t.name}</h3>
        <dl class="team-card__facts">
          ${t.coach ? html`<div><dt>Coach</dt><dd>${t.coach}</dd></div>` : ''}
          ${t.practice ? html`<div><dt>Practice</dt><dd>${t.practice}</dd></div>` : ''}
          ${players ? html`<div><dt>Roster</dt><dd>${players} players</dd></div>` : ''}
        </dl>
        ${t.description ? html`<div class="team-card__desc">${paragraphs(t.description)}</div>` : ''}
        ${href ? html`<span class="team-card__more" aria-hidden="true">Team page ${icon('arrow')}</span>` : ''}
      </div>
    </li>`;
}

export function seasonPage(content, season) {
  const body = html`
    ${pageHero({ eyebrow: season.dates || 'KAS Athletics', title: season.title, intro: season.intro, image: season.image })}
    <section class="section" aria-label="Teams">
      ${season.teams?.length ? html`<ul class="team-grid">${season.teams.map((t) => teamCard(t, season))}</ul>` : emptyState('Teams for this season will be announced soon.')}
    </section>`;
  return layout(content, { path: `/${season.slug}`, title: season.title, description: season.intro, image: season.image, body });
}

export function eventsPage(content) {
  const upcoming = upcomingEvents(content.events);
  const past = pastEvents(content.events).slice(0, 30);
  const body = html`
    ${pageHero({ eyebrow: 'Games & events', title: 'Schedule', intro: 'Every home and away game for the Dragons. Come cheer us on!' })}
    <section class="section" aria-labelledby="upcoming-title">
      <h2 id="upcoming-title" class="section__title section__title--sm">Upcoming</h2>
      ${upcoming.length ? html`<ol class="event-list">${withAnchors(upcoming)}</ol>` : emptyState('No upcoming games yet.')}
    </section>
    ${past.length ? html`
      <section class="section" aria-labelledby="past-title">
        <h2 id="past-title" class="section__title section__title--sm">Recent results</h2>
        <ol class="event-list event-list--past">${past.map((e) => eventRow(e, { showResult: true }))}</ol>
      </section>` : ''}`;
  return layout(content, { path: '/events', title: 'Schedule', body });
}

export function coachesPage(content) {
  const coaches = content.coaches || [];
  const body = html`
    ${pageHero({ eyebrow: 'Inside Athletics', title: 'Coaches', intro: 'The people who help our Dragons grow — on and off the court.' })}
    <section class="section" aria-label="Coaching staff">
      ${coaches.length ? html`<ul class="coach-grid">${coaches.map((c) => html`
        <li class="coach-card">
          ${photo(c.photo, c.name, { cls: 'coach-card__photo', width: 480, height: 600, fallback: initials(c.name) })}
          <div class="coach-card__body">
            <p class="coach-card__sport">${c.sport}</p>
            <h2 class="coach-card__name">${c.name}</h2>
            <p class="coach-card__role">${c.role}</p>
            ${c.bio ? html`<div class="coach-card__bio">${paragraphs(c.bio)}</div>` : ''}
            ${c.email ? html`<a class="text-link" href="mailto:${c.email}">${icon('mail')} Email</a>` : ''}
          </div>
        </li>`)}</ul>` : emptyState('Coach profiles are coming soon.')}
    </section>`;
  return layout(content, { path: '/coaches', title: 'Coaches', body });
}

export function contactPage(content) {
  const { contact = {}, site } = content;
  const body = html`
    ${pageHero({ eyebrow: 'Inside Athletics', title: contact.title || 'Contact us', intro: contact.intro })}
    <section class="section contact" aria-label="Contact details">
      <div class="contact__main">
        ${site.phone ? html`<a class="contact__big" href="tel:${site.phone.replace(/[^\d+]/g, '')}">${icon('phone')}<span>${site.phone}</span></a>` : ''}
        ${site.email ? html`<a class="contact__big" href="mailto:${site.email}">${icon('mail')}<span>${site.email}</span></a>` : ''}
        ${site.address ? html`<p class="contact__address">${icon('pin')}<span class="pre">${site.address}</span></p>` : ''}
      </div>
      <ul class="people-list">
        ${(contact.people || []).map((p) => html`
          <li>
            <strong>${p.name}</strong><span>${p.role}</span>
            ${p.email ? html`<a href="mailto:${p.email}">${p.email}</a>` : ''}
            ${p.phone ? html`<a href="tel:${p.phone.replace(/[^\d+]/g, '')}">${p.phone}</a>` : ''}
          </li>`)}
      </ul>
    </section>`;
  return layout(content, { path: '/contact', title: contact.title || 'Contact', body });
}

export function notFoundPage(content) {
  const body = html`
    <section class="not-found" aria-labelledby="nf-title">
      <p class="not-found__code" aria-hidden="true">404</p>
      <h1 id="nf-title">Out of bounds.</h1>
      <p>We couldn’t find that page. It may have moved.</p>
      <a class="btn btn--primary" href="/">Back to home ${icon('arrow')}</a>
    </section>`;
  return layout(content, { path: '', title: 'Page not found', body });
}

