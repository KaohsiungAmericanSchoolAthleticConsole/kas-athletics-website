// Renderers for the page-builder sections ("blocks").
// One renderer per block type in src/blocks.js. Reuses the existing CSS/markup
// so the look stays consistent; only the data source changes (section fields).
import { html, raw, safeUrl, youtubeId } from '../lib/html.js';
import { upcomingEvents, pastEvents, formatDate, formatTime } from '../lib/events.js';
import { icon, link } from './layout.js';
import { photo, eventRow, videoFacade, pageHero, emptyState, initials } from './parts.js';
import { ed, edImg, edList, edItem, showWhenEditing } from './edit.js';

const p = (sectionPath, field) => `${sectionPath}.${field}`;

function sectionWrap(section, sectionPath, inner) {
  const cls = `blk blk--${section.type} bg--${section.bg || 'default'} space--${section.space || 'normal'} align--${section.align || 'left'}`;
  return html`<section class="${cls}" data-section="${sectionPath}">${inner}</section>`;
}

const RENDERERS = {
  hero(content, s, sp) {
    const inner = html`
      <section class="hero" aria-labelledby="hero-title">
        ${s.image ? photo(s.image, '', { cls: 'hero__bg', width: 1920, height: 1080, eager: true, edit: p(sp, 'image') }) : html`<div class="hero__bg hero__bg--pattern" aria-hidden="true"${edImg(p(sp, 'image'))}></div>`}
        <div class="hero__inner">
          ${showWhenEditing(s.eyebrow) ? html`<p class="eyebrow eyebrow--light"${ed(p(sp, 'eyebrow'), { placeholder: 'Small text above the title' })}>${s.eyebrow}</p>` : ''}
          <h1 id="hero-title" class="hero__title"${ed(p(sp, 'title'))}>${s.title}</h1>
          ${showWhenEditing(s.subtitle) ? html`<p class="hero__subtitle"${ed(p(sp, 'subtitle'), { multiline: true, placeholder: 'Add a subtitle' })}>${s.subtitle}</p>` : ''}
          <div class="hero__actions">
            ${s.buttonLabel ? link(s.buttonLink || '/events', html`<span${ed(p(sp, 'buttonLabel'))}>${s.buttonLabel}</span> ${icon('arrow')}`, 'btn btn--primary') : ''}
            ${s.button2Label ? link(s.button2Link || '/events', html`<span${ed(p(sp, 'button2Label'))}>${s.button2Label}</span>`, 'btn btn--glass') : ''}
          </div>
        </div>
      </section>`;
    return inner;
  },
  heroSplit(content, s, sp) {
    return html`
      <section class="hero hero--split">
        <div class="hero__inner">
          ${showWhenEditing(s.eyebrow) ? html`<p class="eyebrow"${ed(p(sp, 'eyebrow'))}>${s.eyebrow}</p>` : ''}
          <h1 class="hero__title"${ed(p(sp, 'title'))}>${s.title}</h1>
          ${showWhenEditing(s.subtitle) ? html`<p class="hero__subtitle"${ed(p(sp, 'subtitle'), { multiline: true })}>${s.subtitle}</p>` : ''}
          ${s.buttonLabel ? link(s.buttonLink || '/events', html`<span${ed(p(sp, 'buttonLabel'))}>${s.buttonLabel}</span> ${icon('arrow')}`, 'btn btn--primary') : ''}
        </div>
        <div class="hero__media">${photo(s.image, '', { cls: 'hero__img', width: 900, height: 700, edit: p(sp, 'image') })}</div>
      </section>`;
  },
  pageHeader(content, s, sp) {
    return pageHero({ eyebrow: s.eyebrow, title: s.title, intro: s.intro, image: s.image,
      edit: { title: p(sp, 'title'), intro: p(sp, 'intro'), image: p(sp, 'image') } });
  },
  cta(content, s, sp) {
    return html`
      <section class="cta-band">
        <div class="cta-band__inner">
          <h2 class="cta-band__title"${ed(p(sp, 'title'))}>${s.title}</h2>
          ${showWhenEditing(s.text) ? html`<p class="cta-band__text"${ed(p(sp, 'text'), { multiline: true })}>${s.text}</p>` : ''}
          <div class="cta-band__actions">
            ${s.buttonLabel ? link(s.buttonLink || '/events', html`<span${ed(p(sp, 'buttonLabel'))}>${s.buttonLabel}</span> ${icon('arrow')}`, 'btn btn--primary') : ''}
          </div>
        </div>
      </section>`;
  },
  heading(content, s, sp) {
    return html`
      <section class="section">
        <div class="section__head">
          ${showWhenEditing(s.kicker) ? html`<span class="kicker"${ed(p(sp, 'kicker'))}>${s.kicker}</span>` : ''}
          <h2 class="section__title"${ed(p(sp, 'title'))}>${s.title}</h2>
          ${showWhenEditing(s.intro) ? html`<p class="section__intro"${ed(p(sp, 'intro'), { multiline: true })}>${s.intro}</p>` : ''}
        </div>
      </section>`;
  },
  text(content, s, sp) {
    return html`
      <section class="section">
        ${showWhenEditing(s.title) ? html`<h2 class="section__title"${ed(p(sp, 'title'))}>${s.title}</h2>` : ''}
        <div class="prose"${ed(p(sp, 'body'), { multiline: true })}>${s.body}</div>
      </section>`;
  },
  statement(content, s, sp) {
    return html`
      <section class="mission">
        <div class="mission__big"${ed(p(sp, 'title'))}>${s.title}</div>
        <div class="mission__body"${ed(p(sp, 'body'), { multiline: true })}>${s.body}</div>
      </section>`;
  },
  textImage(content, s, sp) {
    const img = photo(s.image, '', { cls: 'text-image__img', width: 900, height: 700, edit: p(sp, 'image') });
    const body = html`
      <div class="text-image__body">
        ${showWhenEditing(s.kicker) ? html`<span class="kicker"${ed(p(sp, 'kicker'))}>${s.kicker}</span>` : ''}
        <h2 class="text-image__title"${ed(p(sp, 'title'))}>${s.title}</h2>
        <div class="prose"${ed(p(sp, 'body'), { multiline: true })}>${s.body}</div>
        ${s.buttonLabel ? link(s.buttonLink || '/events', html`<span${ed(p(sp, 'buttonLabel'))}>${s.buttonLabel}</span> ${icon('arrow')}`, 'btn btn--primary') : ''}
      </div>`;
    return html`
      <section class="text-image${s.imageSide === 'left' ? ' text-image--flip' : ''}">
        ${s.imageSide === 'left' ? html`${img}${body}` : html`${body}${img}`}
      </section>`;
  },
  stats(content, s, sp) {
    const items = s.items || [];
    return html`
      <section class="section">
        <ul class="stat-strip" ${edList(p(sp, 'items'))}>
          ${items.map((it, i) => html`<li ${edItem(p(sp, `items[${i}]`))}>
            <strong${ed(p(sp, `items[${i}].value`))}>${it.value}</strong>
            <span${ed(p(sp, `items[${i}].label`))}>${it.label}</span>
          </li>`)}
        </ul>
      </section>`;
  },
  marquee(content, s, sp) {
    const words = String(s.words || '').split(/\n/).map((w) => w.trim()).filter(Boolean);
    const line = (list) => html`${[...list, ...list, ...list].map((w) => html`<span${ed(p(sp, 'words'))}>${w}</span><span class="marquee__star">✦</span>`)}`;
    return html`
      <div class="marquee" aria-hidden="true" ${ed(p(sp, 'words'))}>
        <div class="marquee__row marquee__row--solid">${line(words)}</div>
        <div class="marquee__row marquee__row--outline">${line([...words].reverse())}</div>
      </div>`;
  },
  divider(content, s, sp) {
    return s.line ? html`<hr class="blk-divider">` : html`<div class="blk-spacer" aria-hidden="true"></div>`;
  },
  gallery(content, s, sp) {
    const items = s.items || [];
    return html`
      <section class="section">
        ${showWhenEditing(s.title) ? html`<h2 class="section__title"${ed(p(sp, 'title'))}>${s.title}</h2>` : ''}
        <ul class="gallery" ${edList(p(sp, 'items'))}>
          ${items.map((it, i) => html`<li class="gallery__item" ${edItem(p(sp, `items[${i}]`))}>
            ${photo(it.image, it.caption || '', { cls: 'gallery__img', width: 600, height: 600, edit: p(sp, `items[${i}].image`) })}
            ${showWhenEditing(it.caption) ? html`<p class="gallery__caption"${ed(p(sp, `items[${i}].caption`))}>${it.caption}</p>` : ''}
          </li>`)}
        </ul>
        ${items.length === 0 ? html`<p class="muted">No photos yet.</p>` : ''}
      </section>`;
  },
  cards(content, s, sp) {
    const items = s.items || [];
    return html`
      <section class="section">
        ${showWhenEditing(s.title) ? html`<h2 class="section__title"${ed(p(sp, 'title'))}>${s.title}</h2>` : ''}
        ${showWhenEditing(s.intro) ? html`<p class="section__intro"${ed(p(sp, 'intro'), { multiline: true })}>${s.intro}</p>` : ''}
        <ul class="card-grid" ${edList(p(sp, 'items'))}>
          ${items.map((it, i) => html`<li class="card" ${edItem(p(sp, `items[${i}]`))}>
            ${photo(it.image, it.title || '', { cls: 'card__img', width: 600, height: 400, edit: p(sp, `items[${i}].image`) })}
            <div class="card__body">
              <h3 class="card__title"${ed(p(sp, `items[${i}].title`))}>${it.title}</h3>
              <p class="card__text"${ed(p(sp, `items[${i}].text`), { multiline: true })}>${it.text}</p>
              ${it.link ? link(it.link, html`Read more ${icon('arrow')}`, 'text-link') : ''}
            </div>
          </li>`)}
        </ul>
      </section>`;
  },
  upcomingGames(content, s, sp) {
    const n = Number(s.count) || 4;
    const next = upcomingEvents(content.events).slice(0, n);
    return html`
      <section class="section">
        <div class="section__head">
          ${showWhenEditing(s.kicker) ? html`<span class="kicker"${ed(p(sp, 'kicker'))}>${s.kicker}</span>` : ''}
          <h2 class="section__title"${ed(p(sp, 'title'))}>${s.title}</h2>
        </div>
        ${next.length ? html`<ol class="event-list">${next.map((e) => {
          const i = content.events.indexOf(e);
          return html`<li ${edItem(`events[${i}]`)}>${eventRow(e)}</li>`;
        })}</ol>` : emptyState('No upcoming games yet — check back soon.')}
      </section>`;
  },
  results(content, s, sp) {
    const n = Number(s.count) || 4;
    const recent = pastEvents(content.events).slice(0, n);
    return html`
      <section class="section">
        <div class="section__head">
          ${showWhenEditing(s.kicker) ? html`<span class="kicker"${ed(p(sp, 'kicker'))}>${s.kicker}</span>` : ''}
          <h2 class="section__title"${ed(p(sp, 'title'))}>${s.title}</h2>
        </div>
        ${recent.length ? html`<ol class="event-list">${recent.map((e) => {
          const i = content.events.indexOf(e);
          return html`<li ${edItem(`events[${i}]`)}>${eventRow(e, { showResult: true })}</li>`;
        })}</ol>` : emptyState('No results yet.')}
      </section>`;
  },
  seasonTiles(content, s, sp) {
    const seasons = content.seasons || [];
    return html`
      <section class="section">
        <div class="section__head">
          ${showWhenEditing(s.kicker) ? html`<span class="kicker"${ed(p(sp, 'kicker'))}>${s.kicker}</span>` : ''}
          <h2 class="section__title"${ed(p(sp, 'title'))}>${s.title}</h2>
        </div>
        <ul class="season-grid">
          ${seasons.map((season, i) => html`
            <li class="season-card">
              <a href="/${season.slug}">
                ${photo(season.image, '', { cls: 'season-card__img', width: 900, height: 700, edit: `seasons[${i}].image` })}
                <span class="season-card__shade" aria-hidden="true"></span>
                <span class="season-card__body">
                  <span class="season-card__count">${season.teams?.length || 0} teams${season.dates ? ` · ${season.dates}` : ''}</span>
                  <span class="season-card__title"${ed(`seasons[${i}].title`)}>${season.title}</span>
                  <span class="season-card__go" aria-hidden="true">${icon('arrow')}</span>
                </span>
              </a>
            </li>`)}
        </ul>
      </section>`;
  },
  quote(content, s, sp) {
    return html`
      <section class="director">
        <figure class="director__figure">
          ${photo(s.photo, s.name, { cls: 'director__photo', width: 600, height: 750, edit: p(sp, 'photo') })}
          <figcaption><strong${ed(p(sp, 'name'))}>${s.name}</strong><span${ed(p(sp, 'role'))}>${s.role}</span></figcaption>
        </figure>
        <div class="director__body">
          ${showWhenEditing(s.kicker) ? html`<span class="kicker"${ed(p(sp, 'kicker'))}>${s.kicker}</span>` : ''}
          <h2 class="director__title"${ed(p(sp, 'title'))}>${s.title}</h2>
          <blockquote class="director__quote"${ed(p(sp, 'text'), { multiline: true })}>${s.text}</blockquote>
        </div>
      </section>`;
  },
  coaches(content, s, sp) {
    const coaches = content.coaches || [];
    return html`
      <section class="section">
        ${showWhenEditing(s.title) ? html`<h2 class="section__title"${ed(p(sp, 'title'))}>${s.title}</h2>` : ''}
        <ul class="coach-grid">
          ${coaches.map((c, i) => html`<li class="coach" ${edItem(`coaches[${i}]`)}>
            ${photo(c.photo, c.name, { cls: 'coach__photo', width: 400, height: 400, edit: `coaches[${i}].photo` })}
            <h3 class="coach__name"${ed(`coaches[${i}].name`)}>${c.name}</h3>
            <p class="coach__role"${ed(`coaches[${i}].role`)}>${c.role}</p>
            ${c.sport ? html`<p class="coach__sport"${ed(`coaches[${i}].sport`)}>${c.sport}</p>` : ''}
            ${showWhenEditing(c.bio) ? html`<p class="coach__bio"${ed(`coaches[${i}].bio`, { multiline: true })}>${c.bio}</p>` : ''}
          </li>`)}
        </ul>
      </section>`;
  },
  contact(content, s, sp) {
    const people = content.contact?.people || [];
    return html`
      <section class="section contact">
        ${showWhenEditing(s.title) ? html`<h2 class="section__title"${ed(p(sp, 'title'))}>${s.title}</h2>` : ''}
        <ul class="contact__list">
          ${people.map((person, i) => html`<li class="contact__person">
            <strong${ed(`contact.people[${i}].name`)}>${person.name}</strong>
            <span${ed(`contact.people[${i}].role`)}>${person.role}</span>
            ${person.email ? html`<a href="mailto:${person.email}"${ed(`contact.people[${i}].email`)}>${person.email}</a>` : ''}
            ${person.phone ? html`<span${ed(`contact.people[${i}].phone`)}>${person.phone}</span>` : ''}
          </li>`)}
        </ul>
      </section>`;
  },
  video(content, s, sp) {
    const id = youtubeId(s.url);
    const poster = s.poster || (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '');
    return html`
      <section class="media">
        <div class="media__body">
          ${showWhenEditing(s.kicker) ? html`<span class="kicker"${ed(p(sp, 'kicker'))}>${s.kicker}</span>` : ''}
          <h2 class="media__title"${ed(p(sp, 'title'))}>${s.title}</h2>
          ${showWhenEditing(s.caption) ? html`<p class="media__caption"${ed(p(sp, 'caption'), { multiline: true })}>${s.caption}</p>` : ''}
          ${s.withSocial ? html`<p class="media__social"${ed(p(sp, 'withSocial'))}></p>` : ''}
        </div>
        <div class="media__video">
          ${id ? videoFacade(s.url, s.title) : (poster ? photo(poster, s.title, { cls: 'media__poster', width: 900, height: 540, edit: p(sp, 'poster') }) : '')}
        </div>
      </section>`;
  },
  social(content, s, sp) {
    const site = content.site || {};
    return html`
      <section class="section">
        <h2 class="section__title"${ed(p(sp, 'title'))}>${s.title}</h2>
        <p class="section__intro"${ed(p(sp, 'text'), { multiline: true })}>${s.text}</p>
        <div class="social">
          ${site.instagramUrl ? link(site.instagramUrl, html`${icon('instagram')} ${site.instagramHandle || 'Instagram'}`, 'btn btn--ghost') : ''}
          ${site.youtubeUrl ? link(site.youtubeUrl, html`${icon('youtube')} YouTube`, 'btn btn--ghost') : ''}
        </div>
      </section>`;
  },
  calendar(content, s, sp) {
    return html`
      <section class="section">
        <div class="section__head">
          ${showWhenEditing(s.kicker) ? html`<span class="kicker"${ed(p(sp, 'kicker'))}>${s.kicker}</span>` : ''}
          <h2 class="section__title"${ed(p(sp, 'title'))}>${s.title}</h2>
        </div>
        ${s.url ? html`<div class="calendar-frame"><iframe src="${safeUrl(s.url)}" title="Calendar" loading="lazy"></iframe></div>` : html`<p class="muted">No calendar link yet.</p>`}
      </section>`;
  },
};

export function renderSection(content, section, sectionPath) {
  if (!section || !section.type) return '';
  const fn = RENDERERS[section.type];
  if (!fn) return '';
  const inner = fn(content, section, sectionPath);
  return sectionWrap(section, sectionPath, inner);
}

export function renderSections(content, sections, basePath = 'pages[0].sections') {
  const list = sections || [];
  return html`${list.map((sec, i) => renderSection(content, sec, `${basePath}[${i}]`))}`;
}

export const BLOCK_TYPES = Object.keys(RENDERERS);