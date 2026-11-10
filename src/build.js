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
import { resolve, allPaths } from './render/router.js';
import { notFoundPage } from './render/pages.js';
import { brandCssText } from './app.js';
import { toStatic, normalizeBase } from './lib/static.js';
import { renderWithEdit } from './render/edit.js';
import { setAssetVersion } from './lib/assetVersion.js';
import { computeAssetVersion } from './lib/assetVersionNode.js';
setAssetVersion(computeAssetVersion());

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const base = normalizeBase(process.env.BASE_PATH);
const content = await createStore(path.join(root, 'data'), { normalize: (raw) => validateContent(SCHEMA, migrate(raw)).value }).load();

function filePathFor(routePath) {
  if (routePath === '/') return 'index.html';
  if (routePath === '/404') return '404.html';
  return `${routePath.replace(/^\/+/, '')}/index.html`;
}

const routePaths = allPaths(content);
const pages = routePaths.map((rp) => [filePathFor(rp), resolve(content, rp).render()]);
pages.push(['404.html', notFoundPage(content)]);

const editablePages = routePaths.map((rp) => [rp.replace(/^\/+/, '') ? `${rp.replace(/^\/+/, '')}/` : '', () => resolve(content, rp, { editing: true }).render()]);

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
  // Shared source for the browser preview (whitelist only).
  const srcDir = path.join(adminDir, 'src');
  await fs.mkdir(path.join(srcDir, 'render'), { recursive: true });
  await fs.mkdir(path.join(srcDir, 'lib'), { recursive: true });
  const whitelist = [
    'schema.js', 'blocks.js', 'fieldkit.js',
    ...['render/sections.js', 'render/router.js', 'render/edit.js', 'render/layout.js', 'render/pages.js', 'render/parts.js', 'render/team.js', 'render/scores.js', 'render/captain.js'],
    ...['lib/html.js', 'lib/events.js', 'lib/validate.js', 'lib/migrate.js', 'lib/static.js', 'lib/assetVersion.js', 'lib/sport.js', 'lib/seasonal.js'],
  ];
  for (const rel of whitelist) {
    const dest = path.join(srcDir, rel);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(path.join(root, 'src', rel), dest);
  }
  const config = { mode: 'github', owner, repo, branch: process.env.PAGES_BRANCH || 'main', base };
  await fs.writeFile(path.join(adminDir, 'config.json'), `${JSON.stringify(config, null, 2)}\n`);
  process.stdout.write(`Exported the staff editor to dist/admin/ (saves to ${pagesRepo}@${config.branch})\n`);
}
process.stdout.write(`Exported ${pages.length} pages to dist/${base ? ` (for ${base}/)` : ''}\n`);
