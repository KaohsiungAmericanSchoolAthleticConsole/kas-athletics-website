// Client- and server-safe router: turns a pathname into a rendered page.
import { html } from '../lib/html.js';
import { seasonPage } from './pages.js';
import { teamPage, findTeam } from './team.js';
import { scoresPage } from './scores.js';
import { eventsPage, notFoundPage } from './pages.js';
import { layout } from './layout.js';
import { renderSections } from './sections.js';
import { renderWithEdit } from './edit.js';

export function resolve(content, pathname, { team = '', editing = false } = {}) {
  const p = pathname.replace(/\/+$/, '') || '/';
  const wrap = (fn) => renderWithEdit(editing, fn);

  // Home
  if (p === '/') {
    const page = (content.pages || [])[0];
    const title = page?.title || 'Home';
    return { status: 200, title, render: () => wrap(() => layout(content, { path: '/', title, body: page ? renderSections(content, page.sections || [], 'pages[0].sections') : '' })) };
  }
  // Scores
  if (p === '/scores' || p === '/scores/standings') {
    const tab = p === '/scores' ? 'games' : 'standings';
    const title = tab === 'standings' ? 'Standings' : 'Scoreboard';
    return { status: 200, title, render: () => wrap(() => scoresPage(content, { tab, team })) };
  }
  // Events
  if (p === '/events') {
    return { status: 200, title: 'Schedule', render: () => wrap(() => eventsPage(content)) };
  }
  // Custom pages
  const page = (content.pages || []).find((pg, i) => i > 0 && pg.slug && `/${pg.slug}` === p);
  if (page) {
    const idx = (content.pages || []).indexOf(page);
    return { status: 200, title: page.title, render: () => wrap(() => layout(content, { path: p, title: page.title, body: renderSections(content, page.sections || [], `pages[${idx}].sections`) })) };
  }
  // Seasons
  const season = (content.seasons || []).find((s) => `/${s.slug}` === p);
  if (season) {
    return { status: 200, title: season.title, render: () => wrap(() => seasonPage(content, season)) };
  }
  // Teams
  const found = findTeam(content, p);
  if (found) {
    return { status: 200, title: found.team.name, render: () => wrap(() => teamPage(content, found.season, found.team)) };
  }
  return { status: 404, title: 'Not found', render: () => wrap(() => notFoundPage(content)) };
}

export function allPaths(content) {
  const paths = ['/', '/scores', '/scores/standings', '/events'];
  for (const pg of content.pages || []) {
    if (pg.slug) paths.push(`/${pg.slug}`);
  }
  for (const s of content.seasons || []) {
    paths.push(`/${s.slug}`);
    for (const t of s.teams || []) if (t.slug) paths.push(`/${s.slug}/${t.slug}`);
  }
  return paths;
}