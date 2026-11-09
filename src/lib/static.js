// Turns server-rendered pages into files for a static host (e.g. GitHub Pages).
// - Prefixes site links with a base path when the site lives in a sub-folder
//   (https://user.github.io/repo-name/ → base "/repo-name").
// - Removes things that need the Node server: the staff sign-in link and the
//   scoreboard team filter (a static host can't read ?team=).

/** "repo-name", "/repo-name/" → "/repo-name"; "" or "/" → "" */
export function normalizeBase(base = '') {
  const trimmed = String(base).trim().replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}` : '';
}

/**
 * @param {string} html a full page from the renderer
 * @param {string} [base] sub-folder the site is served from
 * @returns {string}
 */
export function toStatic(html, base = '') {
  const prefix = normalizeBase(base);
  let out = html
    .replace(/<a href="\/admin\/"[^>]*>Staff sign in<\/a>/g, '')
    .replace(/<form class="sb-filter"[\s\S]*?<\/form>/g, '');
  if (prefix) {
    // href="/x", src="/x", action="/x", content="/x" — but not protocol-relative "//host".
    out = out.replace(/\b(href|src|action|content)="\/(?!\/)/g, `$1="${prefix}/`);
  }
  return out;
}
