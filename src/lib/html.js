// Small, dependency-free HTML helpers. Every piece of staff-entered text goes
// through `esc` before it reaches the page, so no one can inject markup.

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (ch) => ENTITIES[ch]);
}

/** Tagged template: `html\`<p>${x}</p>\`` escapes x unless it is a SafeHtml. */
export class SafeHtml {
  constructor(value) { this.value = value; }
  toString() { return this.value; }
}

export const raw = (value) => new SafeHtml(String(value));

function part(value) {
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(part).join('');
  if (value === false || value === null || value === undefined) return '';
  return esc(value);
}

export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((v, i) => { out += part(v) + strings[i + 1]; });
  return new SafeHtml(out);
}

/** Plain text with blank lines -> escaped <p> blocks; single newlines -> <br>. */
export function paragraphs(text) {
  if (!text) return raw('');
  const blocks = String(text).trim().split(/\n\s*\n/);
  return raw(blocks.map((b) => `<p>${esc(b.trim()).replace(/\n/g, '<br>')}</p>`).join(''));
}

/** Only allow http(s), mailto, tel and site-relative links. Anything else becomes '#'. */
export function safeUrl(url) {
  if (!url) return '#';
  const s = String(url).trim();
  if (/^(https?:|mailto:|tel:)/i.test(s)) return s;
  if (s.startsWith('/') && !s.startsWith('//')) return s;
  if (s.startsWith('#')) return s;
  return '#';
}

export function isExternal(url) {
  return /^https?:\/\//i.test(String(url || ''));
}

/** Extract an 11-char YouTube video id from the common URL shapes. */
export function youtubeId(url) {
  if (!url) return null;
  const m = String(url).match(
    /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  return m ? m[1] : null;
}
