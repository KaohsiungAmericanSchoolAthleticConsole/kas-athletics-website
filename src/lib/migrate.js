// Migrates older content (with `home`, `contact.title/intro`) into the new
// page-builder shape (a `pages` array of sections). Pure: no Node imports,
// so it can run in the browser too.

import { newBlock } from '../blocks.js';

function homeSections(home, content) {
  const sections = [];
  if (home) {
    sections.push(Object.assign(newBlock('hero'), {
      eyebrow: home.heroEyebrow || '',
      title: home.heroTitle || '',
      subtitle: home.heroSubtitle || '',
      image: home.heroImage || '',
      buttonLabel: home.heroCtaLabel || '',
      buttonLink: home.heroCtaLink || '',
      button2Label: 'Full schedule',
      button2Link: '/events',
    }));
    if (Array.isArray(home.stats) && home.stats.length) {
      sections.push(Object.assign(newBlock('stats'), {
        items: home.stats.map((s) => ({ value: s.value || '', label: s.label || '' })),
      }));
    }
    sections.push(Object.assign(newBlock('upcomingGames'), {
      kicker: 'Up next', title: 'On the schedule', count: '4',
    }));
    sections.push(Object.assign(newBlock('seasonTiles'), {
      kicker: 'Programs', title: 'Find your season',
    }));
    const words = [content?.site?.tagline, 'Home of the Dragons', ...((content?.seasons || []).map((s) => s.title))].filter(Boolean).join('\n');
    sections.push(Object.assign(newBlock('marquee'), { words }));
    if (home.directorMessage || home.directorName || home.directorPhoto) {
      sections.push(Object.assign(newBlock('quote'), {
        kicker: 'From the AD', title: 'A message to our Dragons',
        photo: home.directorPhoto || '',
        text: home.directorMessage || '',
        name: home.directorName || '',
        role: home.directorRole || '',
      }));
    }
    if (home.videoUrl) {
      sections.push(Object.assign(newBlock('video'), {
        kicker: 'Watch', title: home.videoTitle || 'Season recap',
        url: home.videoUrl || '',
        poster: '',
        caption: home.videoCaption || '',
        withSocial: true,
      }));
    }
    if (home.missionTitle || home.missionBody) {
      sections.push(Object.assign(newBlock('statement'), {
        title: home.missionTitle || '',
        body: home.missionBody || '',
        bg: 'dark',
      }));
    }
    if (home.calendarEmbedUrl) {
      sections.push(Object.assign(newBlock('calendar'), {
        kicker: 'Calendar', title: 'KAS sports calendar',
        url: home.calendarEmbedUrl || '',
      }));
    }
    if (content?.site?.newsletterUrl) {
      sections.push(Object.assign(newBlock('cta'), {
        title: 'Never miss a game.',
        text: 'Follow the Dragons for schedules, results and big news.',
        buttonLabel: 'Subscribe', buttonLink: content.site.newsletterUrl,
        bg: 'brand',
      }));
    }
  }
  return sections;
}

export function migrate(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  if (Array.isArray(raw.pages) && raw.pages.length) {
    // Already migrated: only fill in fields added later (without changing the input).
    if (raw.site?.seasonal) return raw;
    return { ...raw, site: { seasonal: 'auto', ...(raw.site || {}) } };
  }
  const content = structuredClone(raw);
  // Newer setting: the site decorates itself at the right time of year by default.
  content.site = { seasonal: 'auto', ...(content.site || {}) };
  const pages = [];
  // Home page
  pages.push({
    title: 'Home', slug: '', showInMenu: true,
    sections: homeSections(content.home || {}, content),
  });
  // Coaches page
  pages.push({
    title: 'Coaches', slug: 'coaches', showInMenu: true,
    sections: [
      Object.assign(newBlock('pageHeader'), { eyebrow: 'Inside Athletics', title: 'Coaches', intro: 'The people who help our Dragons grow — on and off the court.' }),
      Object.assign(newBlock('coaches'), { title: '' }),
    ],
  });
  // Contact page
  const contact = content.contact || {};
  pages.push({
    title: contact.title || 'Contact us', slug: 'contact', showInMenu: true,
    sections: [
      Object.assign(newBlock('pageHeader'), { eyebrow: 'Inside Athletics', title: contact.title || 'Contact us', intro: contact.intro || '' }),
      Object.assign(newBlock('contact'), { title: '' }),
    ],
  });
  content.pages = pages;
  return content;
}