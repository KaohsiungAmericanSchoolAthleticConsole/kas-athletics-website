// Export the public site as plain HTML files into dist/.
// Useful as a permanent archive or to host on any static web host.
//   npm run build                                   → site at the domain root
//   BASE_PATH=/kas-athletics-website npm run build  → site in a sub-folder (GitHub Pages)
//   PAGES_REPO=owner/repo (+ PAGES_BRANCH)           → also export the staff editor at /admin/,
//                                                      saving straight to that GitHub repository
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from './lib/store.js';
import { validateContent } from './lib/validate.js';
import { migrate } from './lib/migrate.js';
import { SCHEMA } from './schema.js';
import { homePage, seasonPage, eventsPage, coachesPage, contactPage, notFoundPage } from './render/pages.js';
import { teamPage } from './render/team.js';
import { scoresPage } from './render/scores.js';
import { brandCssText } from './app.js';
import { toStatic, normalizeBase } from './lib/static.js';
import { renderWithEdit } from './render/edit.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const base = normalizeBase(process.env.BASE_PATH);
const content = await createStore(path.join(root, 'data'), { normalize: (raw) => validateContent(SCHEMA, migrate(raw)).value }).load();

const editablePages = [
  ['', () => homePage(content)],
  ['coaches/', () => coachesPage(content)],
  ['contact/', () => contactPage(content)],
  ...content.seasons.map((s) => [`${s.slug}/`, () => seasonPage(content, s)]),
  ...content.seasons.flatMap((s) => (s.teams || []).filter((t) => t.slug).map((t) => [`${s.slug}/${t.slug}/`, () => teamPage(content, s, t)])),
];

const pages = [
  ['index.html', homePage(content)],
  ['events/index.html', eventsPage(content)],
  ['coaches/index.html', coachesPage(content)],
  ['contact/index.html', contactPage(content)],
  ['404.html', notFoundPage(content)],
  ['scores/index.html', scoresPage(content)],
  ['scores/standings/index.html', scoresPage(content, { tab: 'standings' })],
  ...content.seasons.map((s) => [`${s.slug}/index.html`, seasonPage(content, s)]),
  ...content.seasons.flatMap((s) => (s.teams || []).filter((t) => t.slug).map((t) => [`${s.slug}/${t.slug}/index.html`, teamPage(content, s, t)])),
];

await fs.rm(dist, { recursive: true, force: true });
for (const [file, htmlText] of pages) {
  await fs.mkdir(path.dirname(path.join(dist, file)), { recursive: true });
  await fs.writeFile(path.join(dist, file), toStatic(htmlText, base));
}
for (const dir of ['css', 'js', 'img']) await fs.cp(path.join(root, 'public', dir), path.join(dist, dir), { recursive: true });
await fs.cp(path.join(root, 'data', 'uploads'), path.join(dist, 'uploads'), { recursive: true });
await fs.writeFile(path.join(dist, 'brand.css'), brandCssText(content.site));
await fs.writeFile(path.join(dist, '.nojekyll'), ''); // tell GitHub Pages to serve files as-is

// The staff editor, for hosting without the Node server (GitHub Pages).
const pagesRepo = process.env.PAGES_REPO || '';
if (pagesRepo) {
  const [owner, repo] = pagesRepo.split('/');
  if (!owner || !repo) throw new Error('PAGES_REPO must look like owner/repo');
  const adminDir = path.join(dist, 'admin');
  await fs.cp(path.join(root, 'public', 'admin'), adminDir, { recursive: true });
  await fs.mkdir(path.join(adminDir, 'lib'), { recursive: true });
  await fs.copyFile(path.join(root, 'src', 'schema.js'), path.join(adminDir, 'lib', 'schema.js'));
  await fs.copyFile(path.join(root, 'src', 'lib', 'validate.js'), path.join(adminDir, 'lib', 'validate.js'));
  const config = { mode: 'github', owner, repo, branch: process.env.PAGES_BRANCH || 'main', base };
  await fs.writeFile(path.join(adminDir, 'config.json'), `${JSON.stringify(config, null, 2)}\n`);
  // Editable copies of each page for "Edit on the page" (never indexed by search engines).
  for (const [dir, render] of editablePages) {
    const htmlText = toStatic(renderWithEdit(true, render), base).replace('<head>', '<head>\n<meta name="robots" content="noindex">');
    await fs.mkdir(path.join(adminDir, 'preview', dir), { recursive: true });
    await fs.writeFile(path.join(adminDir, 'preview', dir, 'index.html'), htmlText);
  }
  process.stdout.write(`Exported the staff editor to dist/admin/ (saves to ${pagesRepo}@${config.branch})\n`);
}
process.stdout.write(`Exported ${pages.length} pages to dist/${base ? ` (for ${base}/)` : ''}\n`);
