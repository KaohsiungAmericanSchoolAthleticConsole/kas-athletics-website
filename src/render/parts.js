// Reusable page pieces shared by several pages.
import { html, raw, safeUrl, youtubeId } from '../lib/html.js';
import { dateBadge, formatTime, venueLabel } from '../lib/events.js';
import { icon, link } from './layout.js';

export function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'KAS';
}

export function photo(src, alt, { cls = '', width = 800, height = 600, eager = false, fallback = '' } = {}) {
  if (!src && !alt) return html`<div class="photo-fallback ${cls}" aria-hidden="true"></div>`;
  if (!src) return html`<div class="photo-fallback ${cls}" role="img" aria-label="${alt}"><span>${fallback || initials(alt)}</span></div>`;
  return html`<img class="${cls}" src="${safeUrl(src)}" alt="${alt}" width="${width}" height="${height}" ${raw(eager ? 'fetchpriority="high"' : 'loading="lazy"')} decoding="async">`;
}

/** Centered section heading block, Apple style: eyebrow, headline, optional lead. */
export function heading({ id, eyebrow, title, lead, level = 2 }) {
  const tag = level === 1 ? 'h1' : 'h2';
  return html`
    <header class="headline" data-reveal>
      ${eyebrow ? html`<p class="eyebrow">${eyebrow}</p>` : ''}
      ${raw(`<${tag} id="${id}" class="headline__title">`)}${title}${raw(`</${tag}>`)}
      ${lead ? html`<p class="headline__lead">${lead}</p>` : ''}
    </header>`;
}

export function eventRow(e, { showResult = false, anchor = false } = {}) {
  const d = dateBadge(e.date);
  const venue = venueLabel(e.venue);
  const meta = [formatTime(e.time) || 'All day', e.location].filter(Boolean).join(' · ');
  return html`
    <li class="event"${anchor ? raw(` id="event-${e.date}"`) : ''}>
      <div class="event__date" aria-hidden="true"><span>${d.month}</span><strong>${d.day}</strong></div>
      <div class="event__body">
        <h3 class="event__title">${e.title}</h3>
        <p class="event__meta">
          <span class="visually-hidden">${d.weekday}, ${d.month} ${d.day}, ${d.year}. </span>
          ${e.sport ? html`<span>${e.sport}</span>` : ''}<span>${d.weekday} · ${meta}</span>
        </p>
      </div>
      <div class="event__side">
        ${showResult && e.result ? html`<span class="event__result">${e.result}</span>` : ''}
        ${venue ? html`<span class="event__venue">${venue}</span>` : ''}
        ${e.link ? link(e.link, html`Watch${icon('chevron')}`, 'more') : ''}
      </div>
    </li>`;
}

export function videoFacade(url, title, poster = '') {
  const id = youtubeId(url);
  if (!id) return '';
  return html`
    <div class="video" data-video="${id}">
      <img src="${poster ? safeUrl(poster) : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`}" alt="" width="1280" height="720" loading="lazy">
      <button class="video__play" type="button" data-video-play>
        ${icon('play')}<span class="visually-hidden">Play video: ${title}</span>
      </button>
    </div>`;
}

export function pageHero({ eyebrow, title, intro, image }) {
  return html`
    <section class="page-hero" aria-labelledby="page-title">
      ${heading({ id: 'page-title', eyebrow, title, lead: intro, level: 1 })}
      ${image ? html`<div class="hero-media" data-hero-media>${photo(image, '', { width: 1600, height: 900, eager: true })}</div>` : ''}
    </section>`;
}

export function emptyState(message) {
  return html`<p class="empty">${message}</p>`;
}
