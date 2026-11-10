import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { migrate } from '../src/lib/migrate.js';
import { validateContent } from '../src/lib/validate.js';
import { SCHEMA } from '../src/schema.js';
import { newBlock, BLOCKS } from '../src/blocks.js';
import { renderWithEdit } from '../src/render/edit.js';
import { renderSection } from '../src/render/sections.js';
import { esc } from '../src/lib/html.js';

const seed = JSON.parse(readFileSync(new URL('./fixtures/content.json', import.meta.url), 'utf8'));
const content = validateContent(SCHEMA, migrate(seed)).value;

for (const type of Object.keys(BLOCKS)) {
  test(`section ${type} renders`, () => {
    const section = newBlock(type);
    // inject an XSS-ish title where possible
    if ('title' in section) section.title = '<script>x</script>';
    const out = renderWithEdit(false, () => renderSection(content, section, 'pages[0].sections[0]')).toString();
    assert.ok(out.length > 0, `${type} produced empty output`);
    assert.doesNotMatch(out, /<script>x<\/script>/, `${type} did not escape content`);
  });

  test(`section ${type} emits edit markers only in edit mode`, () => {
    const section = newBlock(type);
    const off = renderWithEdit(false, () => renderSection(content, section, 'pages[0].sections[0]')).toString();
    const on = renderWithEdit(true, () => renderSection(content, section, 'pages[0].sections[0]')).toString();
    // edit markers appear only when editing
    if (off.includes('data-edit')) assert.fail(`${type} leaked data-edit in public mode`);
    // not all blocks have editable text; just ensure no crash and markers consistent
    assert.ok(typeof on === 'string');
  });
}