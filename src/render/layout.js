import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { html, raw, esc, safeUrl, isExternal } from '../lib/html.js';
import { upcomingEvents, formatDate, formatTime } from '../lib/events.js';

export const THEMES = [
  { id: 'auto', label: 'Automatic', hint: 'Follows your device' },
  { id: 'light', label: 'Light', hint: 'Always light' },
  { id: 'dark', label: 'Dark', hint: 'Always dark' },
  { id: 'dragon', label: 'Dragon', hint: 'Navy and red' },
  { id: 'contrast', label: 'High contrast', hint: 'Maximum legibility' },
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

/** Apple-style text link: "Learn more ›" */
export function more(url, label) {
  return link(url, html`${label}${icon('chevron')}`, 'more');
}

function ribbon(content) {
  const next = upcomingEvents(content.events)[0];
  if (!next) return '';
  const when = [formatDate(next.date), formatTime(next.time)].filter(Boolean).join(', ');
  return html`
    <div class="ribbon">
      <p>Next game: <strong>${next.title}</strong>${next.sport ? ` · ${next.sport}` : ''} · ${when}.
        <a class="more" href="/events#event-${next.date}">See schedule${icon('chevron')}</a></p>
    </div>`;
}

function themeMenu() {
  return html`
    <div class="theme-switch" data-theme-switch>
      <button class="nav-icon" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="theme-menu" data-theme-toggle>
        ${icon('appearance')}<span class="visually-hidden">Appearance</span>
      </button>
      <div class="theme-menu" id="theme-menu" role="radiogroup" aria-label="Appearance" hidden>
        <p class="theme-menu__title" aria-hidden="true">Appearance</p>
        ${THEMES.map((t) => html`
          <button type="button" role="radio" aria-checked="false" aria-label="${t.label}: ${t.hint}" class="theme-menu__item" data-theme-choice="${t.id}">
            <span class="swatch swatch--${t.id}" aria-hidden="true"></span>
            <span class="theme-menu__text"><span>${t.label}</span><small>${t.hint}</small></span>
            <span class="theme-menu__check" aria-hidden="true">${icon('check')}</span>
          </button>`)}
      </div>
    </div>`;
}

export function navItems(content) {
  return [
    ...(content.seasons || []).map((s) => ({ href: `/${s.slug}`, label: s.title })),
    { href: '/events', label: 'Schedule' },
    { href: '/coaches', label: 'Coaches' },
    { href: '/contact', label: 'Contact' },
  ];
}

function header(content, currentPath) {
  const { site } = content;
  return html`
    <header class="site-header">
      <nav class="globalnav" aria-label="Main">
        <a class="globalnav__brand" href="/"${currentPath === '/' ? raw(' aria-current="page"') : ''}>
          <img src="${safeUrl(site.logo || '/img/crest.svg')}" alt="" width="28" height="28">
          <span>${site.name}</span>
        </a>
        <ul class="globalnav__links" id="main-nav" data-nav>
          ${navItems(content).map((n) => html`<li><a href="${n.href}"${n.href === currentPath ? raw(' aria-current="page"') : ''}>${n.label}</a></li>`)}
        </ul>
        <div class="globalnav__tools">
          ${themeMenu()}
          <button class="nav-icon nav-toggle" type="button" aria-expanded="false" aria-controls="main-nav" data-nav-toggle>
            <span class="nav-toggle__bars" aria-hidden="true"><span></span><span></span></span><span class="visually-hidden">Menu</span>
          </button>
        </div>
      </nav>
    </header>
    ${ribbon(content)}`;
}

function footer(content) {
  const { site, links = [] } = content;
  const year = new Date().getFullYear();
  const tel = (site.phone || '').replace(/[^\d+]/g, '');
  return html`
    <footer class="site-footer">
      <div class="site-footer__inner">
        <div class="site-footer__cols">
          <section aria-labelledby="footer-explore">
            <h2 id="footer-explore">Explore</h2>
            <ul>${navItems(content).map((n) => html`<li><a href="${n.href}">${n.label}</a></li>`)}</ul>
          </section>
          <section aria-labelledby="footer-links">
            <h2 id="footer-links">Resources</h2>
            <ul>${links.map((l) => html`<li>${link(l.url, l.label)}</li>`)}</ul>
          </section>
          <section aria-labelledby="footer-follow">
            <h2 id="footer-follow">Follow</h2>
            <ul>
              ${site.instagramUrl ? html`<li>${link(site.instagramUrl, 'Instagram')}</li>` : ''}
              ${site.youtubeUrl ? html`<li>${link(site.youtubeUrl, 'YouTube')}</li>` : ''}
              ${site.newsletterUrl ? html`<li>${link(site.newsletterUrl, 'Newsletter')}</li>` : ''}
            </ul>
          </section>
          <section aria-labelledby="footer-contact">
            <h2 id="footer-contact">Contact</h2>
            <ul>
              ${site.schoolName ? html`<li>${site.schoolName}</li>` : ''}
              ${site.phone ? html`<li><a href="tel:${tel}">${site.phone}</a></li>` : ''}
              ${site.email ? html`<li><a href="mailto:${site.email}">${site.email}</a></li>` : ''}
            </ul>
          </section>
        </div>
        <div class="site-footer__base">
          <p>Copyright © ${year} ${site.schoolName || site.name}. ${site.footerNote}</p>
          <a href="/admin/">Staff sign in</a>
        </div>
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
<link rel="icon" href="${esc(safeUrl(site.logo || '/img/crest.svg'))}">
<script src="/js/theme-init.js?v=${ASSET_VERSION}"></script>
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
