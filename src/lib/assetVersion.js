// Holds the cache-busting asset version. Universal (no Node imports) so renderers
// can import it in the browser. The value is injected at startup by app.js /
// build.js via setAssetVersion() (they compute it from the public asset files).
let value = '';

export function assetVersion() { return value; }
export function setAssetVersion(v) { value = v || ''; }