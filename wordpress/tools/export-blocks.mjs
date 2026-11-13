// Writes the section library (src/blocks.js) to the WordPress theme as JSON,
// so the original site and the WordPress blocks share one list of sections.
//
//   node wordpress/tools/export-blocks.mjs
//
// Run it again whenever src/blocks.js changes.
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { BLOCKS, BLOCK_GROUPS, COMMON_FIELDS, PAGE_TEMPLATES, newBlock } from '../../src/blocks.js';

const out = fileURLToPath(new URL('../kas-dragons/inc/blocks.json', import.meta.url));

const blocks = Object.fromEntries(Object.entries(BLOCKS).map(([type, def]) => [type, {
  label: def.label,
  group: def.group,
  hint: def.hint,
  fields: [...def.fields, ...COMMON_FIELDS],
  defaults: newBlock(type),
}]));

await writeFile(out, `${JSON.stringify({ groups: BLOCK_GROUPS, blocks, templates: PAGE_TEMPLATES }, null, 2)}\n`);
console.log(`Wrote ${Object.keys(blocks).length} sections to ${out}`);
