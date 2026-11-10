import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const FILES = ['css/site.css', 'css/motion.css', 'js/site.js', 'js/theme-init.js', 'admin/inline.js', 'admin/inline.css'];

export function computeAssetVersion() {
  return createHash('sha1')
    .update(FILES.map((f) => readFileSync(new URL(`../../public/${f}`, import.meta.url))).join(''))
    .digest('hex').slice(0, 10);
}