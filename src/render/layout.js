import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { html, raw, esc, safeUrl, isExternal } from '../lib/html.js';
import { upcomingEvents, formatDate, formatTime } from '../lib/events.js';

export const THEMES = [
  { id: 'auto', label: 'Auto', hint: 'Match device' },
  { id: 'light', label: 'Light', hint: 'Paper white' },
  { id: 'dark', label: 'Dark', hint: 'Night game' },
  { id: 'dragon', label: 'Dragon', hint: 'School colors' },
  { id: 'contrast', label: 'High contrast', hint: 'Easiest to read' },
];

// Changes whenever the CSS/JS changes, so browsers never keep a stale copy after an update.
const ASSET_VERSION = createHash('sha1')
  .update(['css/site.css', 'css/motion.css', 'js/site.js', 'js/theme-init.js'].map((f) => readFileSync(new URL(`../../public/${f}`, import.meta.url))).join(''))
  .digest('hex').slice(0, 10);

export function link(url, label, cls = '') {
  const ext = isExternal(url);
  return html`<a class="${cls}" href="${safeUrl(url)}"${ext ? raw(' target="_blank" rel="noopener noreferrer"') : ''}>${label}${ext ? raw('<span class="visually-hidden"> (opens in a new tab)</span>') : ''}</a>`;
}

export function icon(name) {
  return raw(`<svg class="icon" aria-hidden="true" focusable="false"><use href="/img/icons.svg#${name}"/></svg>`);
}

function ticker(content) {
  const next = upcomingEvents(content.events)[0];
  if (!next) return '';
  const when = [formatDate(next.date), formatTime(next.time)].filter(Boolean).join(' · ');
  return html`
    <a class="ticker" href="/scores">
      <span class="ticker__label"><span class="ticker__pulse" aria-hidden="true"></span>Next up</span>
      <span class="ticker__title">${next.title}</span>
      <span class="ticker__meta">${[next.sport, when].filter(Boolean).join(' — ')}</span>
      <span class="ticker__cta" aria-hidden="true">${icon('arrow')}</span>
    </a>`;
}

function themeMenu() {
  return html`
    <div class="theme-switch" data-theme-switch>
      <button class="icon-btn" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="theme-menu" data-theme-toggle>
        ${icon('palette')}<span class="visually-hidden">Change theme</span>
      </button>
      <div class="theme-menu" id="theme-menu" role="radiogroup" aria-label="Theme" hidden>
        ${THEMES.map((t) => html`
          <button type="button" role="radio" aria-checked="false" aria-label="${t.label} theme: ${t.hint}" class="theme-menu__item" data-theme-choice="${t.id}">
            <span class="swatch swatch--${t.id}" aria-hidden="true"></span>
            <span><strong>${t.label}</strong><small>${t.hint}</small></span>
          </button>`)}
      </div>
    </div>`;
}

export function navItems(content) {
  return [
    { href: '/', label: 'Home' },
    ...(content.seasons || []).map((s) => ({ href: `/${s.slug}`, label: s.title })),
    { href: '/scores', label: 'Scores' },
    { href: '/events', label: 'Schedule' },
    { href: '/coaches', label: 'Coaches' },
    { href: '/contact', label: 'Contact' },
  ];
}

function header(content, currentPath) {
  const { site } = content;
  return html`
    <header class="site-header">
      <div class="scroll-progress" aria-hidden="true"></div>
      ${ticker(content)}
      <div class="masthead">
        <a class="brand" href="/">
          <img class="brand__logo" src="${safeUrl(site.logo || '/img/crest.svg')}" alt="" width="48" height="48">
          <span class="brand__text"><span class="brand__name">${site.name}</span><span class="brand__tagline">${site.tagline}</span></span>
        </a>
        <nav class="main-nav" aria-label="Main" id="main-nav" data-nav>
          <ul>
            ${navItems(content).map((n) => html`<li><a href="${n.href}"${n.href === currentPath ? raw(' aria-current="page"') : ''}>${n.label}</a></li>`)}
          </ul>
        </nav>
        <div class="masthead__tools">
          ${themeMenu()}
          <button class="icon-btn nav-toggle" type="button" aria-expanded="false" aria-controls="main-nav" data-nav-toggle>
            ${icon('menu')}<span class="visually-hidden">Menu</span>
          </button>
        </div>
      </div>
    </header>`;
}

function footer(content) {
  const { site, links = [] } = content;
  const year = new Date().getFullYear();
  return html`
    <footer class="site-footer">
      <div class="site-footer__inner">
        <section class="footer-brand" aria-label="About">
          <img src="${safeUrl(site.logo || '/img/crest.svg')}" alt="" width="64" height="64" loading="lazy">
          <p class="footer-brand__name">${site.name}</p>
          <p class="footer-brand__tag">${site.tagline}</p>
        </section>
        <section aria-labelledby="footer-links">
          <h2 id="footer-links" class="footer-heading">Useful links</h2>
          <ul class="footer-list">${links.map((l) => html`<li>${link(l.url, l.label)}</li>`)}</ul>
        </section>
        <section aria-labelledby="footer-contact">
          <h2 id="footer-contact" class="footer-heading">Contact</h2>
          <ul class="footer-list">
            ${site.schoolName ? html`<li>${site.schoolName}</li>` : ''}
            ${site.address ? html`<li class="pre">${site.address}</li>` : ''}
            ${site.phone ? html`<li><a href="tel:${site.phone.replace(/[^\d+]/g, '')}">${site.phone}</a></li>` : ''}
            ${site.email ? html`<li><a href="mailto:${site.email}">${site.email}</a></li>` : ''}
          </ul>
        </section>
        <section aria-labelledby="footer-follow">
          <h2 id="footer-follow" class="footer-heading">Stay in the loop</h2>
          <div class="footer-social">
            ${site.instagramUrl ? link(site.instagramUrl, html`${icon('instagram')} Instagram`, 'chip') : ''}
            ${site.youtubeUrl ? link(site.youtubeUrl, html`${icon('play')} Watch games`, 'chip') : ''}
          </div>
          ${site.newsletterUrl ? link(site.newsletterUrl, html`Get the newsletter ${icon('arrow')}`, 'btn btn--ghost') : ''}
        </section>
      </div>
      <div class="site-footer__base">
        <p>© ${year} ${site.schoolName || site.name}. ${site.footerNote}</p>
        <a href="/admin/" class="staff-link">Staff sign in</a>
      </div>
    </footer>`;
}

/**
 * @param {object} content full site content
 * @param {{ title?: string, description?: string, path: string, body: unknown, image?: string }} page
 */
export function layout(content, page) {
  const { site } = content;
  const title = page.title ? `${page.title} · ${site.name}` : `${site.name} — ${site.tagline}`;
  const description = page.description || site.tagline || '';
  return `<!doctype html>
<html lang="en" data-theme-default="${esc(site.defaultTheme || 'auto')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
${page.image ? `<meta property="og:image" content="${esc(safeUrl(page.image))}">` : ''}
<meta name="theme-color" content="${esc(site.brandColor || '#c8102e')}">
<link rel="icon" href="${esc(safeUrl(site.logo || '/img/crest.svg'))}">
<script src="/js/theme-init.js?v=${ASSET_VERSION}"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,800;1,800&family=Barlow:wght@400;500;600&display=swap">
<link rel="stylesheet" href="/css/site.css?v=${ASSET_VERSION}">
<link rel="stylesheet" href="/css/motion.css?v=${ASSET_VERSION}">
<link rel="stylesheet" href="/brand.css">
<script src="/js/site.js?v=${ASSET_VERSION}" defer></script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
${header(content, page.path)}
<main id="main" tabindex="-1">
${page.body}
</main>
${footer(content)}
</body>
</html>`;
}
