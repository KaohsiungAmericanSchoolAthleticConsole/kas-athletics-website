// Export the site content as a WordPress WXR (WordPress eXtended RSS) file
// that can be imported via Tools -> Import -> WordPress in any WordPress site.
//   node scripts/export-wordpress.js            -> writes dist/kas-athletics.wxr.xml
//   node scripts/export-wordpress.js out.xml    -> custom output path
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from '../src/lib/store.js';
import { validateContent } from '../src/lib/validate.js';
import { migrate } from '../src/lib/migrate.js';
import { SCHEMA } from '../src/schema.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || path.join(root, 'dist', 'kas-athletics.wxr.xml');
const content = await createStore(path.join(root, 'data'), { normalize: (raw) => validateContent(SCHEMA, migrate(raw)).value }).load();

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cdata = (s) => `<![CDATA[${String(s ?? '').replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;

const items = [];
// Pages
for (const pg of (content.pages || [])) {
  items.push(`
  <item>
    <title>${esc(pg.title)}</title>
    <link>/${pg.slug}</link>
    <pubDate>${new Date().toUTCString()}</pubDate>
    <dc:creator>admin</dc:creator>
    <guid isPermaLink="false">/${pg.slug}</guid>
    <description></description>
    <content:encoded>${cdata(pg.sections.map((s) => s.title || s.type).join('\\n'))}</content:encoded>
    <excerpt:encoded>${cdata('')}</excerpt:encoded>
    <wp:post_type>page</wp:post_type>
    <wp:post_name>${esc(pg.slug)}</wp:post_name>
    <wp:status>publish</wp:status>
  </item>`);
}
// Seasons as pages
for (const s of (content.seasons || [])) {
  items.push(`
  <item>
    <title>${esc(s.title)}</title>
    <link>/${s.slug}</link>
    <pubDate>${new Date().toUTCString()}</pubDate>
    <dc:creator>admin</dc:creator>
    <guid isPermaLink="false">/${s.slug}</guid>
    <description></description>
    <content:encoded>${cdata(s.intro || '')}</content:encoded>
    <wp:post_type>page</wp:post_type>
    <wp:post_name>${esc(s.slug)}</wp:post_name>
    <wp:status>publish</wp:status>
  </item>`);
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:wp="http://wordpress.org/export/1.2/">
  <channel>
    <title>${esc(content.site.name)}</title>
    <link>https://kas.tw</link>
    <description>${esc(content.site.tagline)}</description>
    <language>en-US</language>
    <wp:wxr_version>1.2</wp:wxr_version>
    <wp:base_site_url>https://kas.tw</wp:base_site_url>
    <wp:base_blog_url>https://kas.tw</wp:base_blog_url>
    ${items.join('\\n')}
  </channel>
</rss>`;

await fs.mkdir(path.dirname(out), { recursive: true });
await fs.writeFile(out, xml, 'utf8');
console.log(`Exported WordPress WXR to ${out}`);
