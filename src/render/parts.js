// Reusable page pieces shared by several pages.
import { html, raw, safeUrl, youtubeId } from '../lib/html.js';
import { dateBadge, formatTime, venueLabel } from '../lib/events.js';
import { icon, link } from './layout.js';
import { ed, edImg, showWhenEditing } from './edit.js';

export function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'KAS';
}

export function photo(src, alt, { cls = '', width = 800, height = 600, eager = false, fallback = '', edit = '' } = {}) {
  const attrs = edit ? edImg(edit) : '';
  if (!src && !alt) return html`<div class="photo-fallback ${cls}" aria-hidden="true"${attrs}><span>${fallback}</span></div>`;
  if (!src) return html`<div class="photo-fallback ${cls}" role="img" aria-label="${alt}"${attrs}><span>${fallback || initials(alt)}</span></div>`;
  return html`<img class="${cls}" src="${safeUrl(src)}" alt="${alt}" width="${width}" height="${height}" ${raw(eager ? 'fetchpriority="high"' : 'loading="lazy"')} decoding="async"${attrs}>`;
}

export function eventRow(e, { showResult = false, anchor = false } = {}) {
  const d = dateBadge(e.date);
  const venue = venueLabel(e.venue);
  return html`
    <li class="event"${anchor ? raw(` id="event-${e.date}"`) : ''}>
      <div class="event__date" aria-hidden="true"><span>${d.month}</span><strong>${d.day}</strong><span>${d.weekday}</span></div>
      <div class="event__body">
        ${e.sport ? html`<p class="event__sport">${e.sport}</p>` : ''}
        <h3 class="event__title">${e.title}</h3>
        <p class="event__meta">
          <span class="visually-hidden">${d.weekday} ${d.month} ${d.day}, ${d.year}. </span>
          ${[formatTime(e.time), e.location].filter(Boolean).join(' · ')}
        </p>
      </div>
      <div class="event__side">
        ${venue ? html`<span class="tag tag--${e.venue}">${venue}</span>` : ''}
        ${showResult && e.result ? html`<span class="event__result">${e.result}</span>` : ''}
        ${e.link ? link(e.link, html`${icon('play')}<span class="visually-hidden">Watch or details for ${e.title}</span>`, 'icon-btn') : ''}
      </div>
    </li>`;
}

export function videoFacade(url, title) {
  const id = youtubeId(url);
  if (!id) return '';
  return html`
    <div class="video" data-video="${id}">
      <img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" width="480" height="360" loading="lazy">
      <button class="video__play" type="button" data-video-play>
        ${icon('play')}<span class="visually-hidden">Play video: ${title}</span>
      </button>
    </div>`;
}

/**
 * @param {{ eyebrow?: string, title: string, intro?: string, image?: string,
 *   edit?: { title?: string, intro?: string, image?: string } }} opts  edit = content paths for click-to-edit
 */
export function pageHero({ eyebrow, title, intro, image, edit = {} }) {
  const hasImage = Boolean(image) || Boolean(edit.image && showWhenEditing(''));
  return html`
    <section class="page-hero${hasImage ? ' page-hero--image' : ''}" aria-labelledby="page-title">
      ${hasImage ? photo(image, '', { cls: 'page-hero__bg', width: 1600, height: 700, eager: true, edit: edit.image }) : ''}
      <div class="page-hero__inner">
        ${eyebrow ? html`<p class="eyebrow">${eyebrow}</p>` : ''}
        <h1 id="page-title" class="page-hero__title"${edit.title ? ed(edit.title) : ''}>${title}</h1>
        ${intro || (edit.intro && showWhenEditing(intro)) ? html`<p class="page-hero__intro"${edit.intro ? ed(edit.intro, { multiline: true, placeholder: 'Add a short introduction' }) : ''}>${intro}</p>` : ''}
      </div>
    </section>`;
}

export function emptyState(message) {
  return html`<p class="empty">${message}</p>`;
}

/**
 * Breadcrumb trail. The last item is the current page and is not a link.
 * @param {Array<{ href?: string, label: string }>} items
 */
export function crumbs(items = []) {
  if (!items.length) return '';
  return html`
    <nav class="crumbs" aria-label="Breadcrumb">
      <ol>
        ${items.map((item, i) => html`
          <li>
            ${item.href ? html`<a href="${item.href}">${item.label}</a>` : html`<span aria-current="page">${item.label}</span>`}
            ${i < items.length - 1 ? html`<span class="crumbs__sep" aria-hidden="true">/</span>` : ''}
          </li>`)}
      </ol>
    </nav>`;
}
