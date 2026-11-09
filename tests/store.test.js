import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createStore, ConflictError } from '../src/lib/store.js';

const silent = { error() {} };

async function tmpStore(initial) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kas-store-'));
  await fs.writeFile(path.join(dir, 'content.json'), JSON.stringify(initial));
  return { dir, store: createStore(dir, { normalize: (c) => ({ site: {}, ...c }), logger: silent }) };
}

test('missing sections are filled in by normalize', async () => {
  const { dir, store } = await tmpStore({});
  assert.deepEqual((await store.load()).site, {});
  await fs.rm(dir, { recursive: true, force: true });
});

test('a damaged content.json falls back to the newest good history copy', async () => {
  const { dir, store } = await tmpStore({ n: 1 });
  await store.save({ n: 2 }, 'a', await store.version());
  await fs.writeFile(path.join(dir, 'content.json'), '{ this is not json');
  const fresh = createStore(dir, { logger: silent });
  assert.equal((await fresh.load()).n, 1);
  await fs.rm(dir, { recursive: true, force: true });
});

test('saves are refused when based on an old version, and run one at a time', async () => {
  const { dir, store } = await tmpStore({ n: 0 });
  const v0 = await store.version();
  await store.save({ n: 1 }, 'a', v0);
  await assert.rejects(store.save({ n: 2 }, 'b', v0), ConflictError);
  const v1 = await store.version();
  const results = await Promise.allSettled([store.save({ n: 3 }, 'c', v1), store.save({ n: 4 }, 'd', v1)]);
  assert.deepEqual(results.map((r) => r.status).sort(), ['fulfilled', 'rejected']);
  await fs.rm(dir, { recursive: true, force: true });
});
