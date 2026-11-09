// Optional: export the public site as plain HTML files into dist/.
// Useful as a permanent archive or to host on any static web host.
//   npm run build
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from './lib/store.js';
import { homePage, seasonPage, eventsPage, coachesPage, contactPage, notFoundPage } from './render/pages.js';
import { teamPage } from './render/team.js';
import { brandCssText } from './app.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const content = await createStore(path.join(root, 'data')).load();

const pages = [
  ['index.html', homePage(content)],
  ['events/index.html', eventsPage(content)],
  ['coaches/index.html', coachesPage(content)],
  ['contact/index.html', contactPage(content)],
  ['404.html', notFoundPage(content)],
  ...content.seasons.map((s) => [`${s.slug}/index.html`, seasonPage(content, s)]),
  ...content.seasons.flatMap((s) => (s.teams || []).filter((t) => t.slug).map((t) => [`${s.slug}/${t.slug}/index.html`, teamPage(content, s, t)])),
];

await fs.rm(dist, { recursive: true, force: true });
for (const [file, htmlText] of pages) {
  await fs.mkdir(path.dirname(path.join(dist, file)), { recursive: true });
  await fs.writeFile(path.join(dist, file), htmlText);
}
for (const dir of ['css', 'js', 'img']) await fs.cp(path.join(root, 'public', dir), path.join(dist, dir), { recursive: true });
await fs.cp(path.join(root, 'data', 'uploads'), path.join(dist, 'uploads'), { recursive: true });
await fs.writeFile(path.join(dist, 'brand.css'), brandCssText(content.site));
process.stdout.write(`Exported ${pages.length} pages to dist/\n`);
