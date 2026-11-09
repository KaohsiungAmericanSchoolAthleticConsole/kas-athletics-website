// Content storage: one human-readable JSON file (data/content.json).
// Every save is written atomically and the previous version is kept in
// data/history/ so staff can undo mistakes from the editor.

import { promises as fs } from 'node:fs';
import path from 'node:path';

const HISTORY_LIMIT = 100;

export function createStore(dataDir) {
  const contentFile = path.join(dataDir, 'content.json');
  const historyDir = path.join(dataDir, 'history');
  let cache = null;

  async function writeAtomic(file, text) {
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmp, text, 'utf8');
    await fs.rename(tmp, file);
  }

  async function load() {
    if (cache) return cache;
    const text = await fs.readFile(contentFile, 'utf8');
    cache = Object.freeze(JSON.parse(text));
    return cache;
  }

  async function pruneHistory() {
    const files = (await fs.readdir(historyDir)).filter((f) => f.endsWith('.json')).sort();
    const extra = files.slice(0, Math.max(0, files.length - HISTORY_LIMIT));
    await Promise.all(extra.map((f) => fs.unlink(path.join(historyDir, f))));
  }

  async function snapshotCurrent(author) {
    await fs.mkdir(historyDir, { recursive: true });
    let current;
    try {
      current = await fs.readFile(contentFile, 'utf8');
    } catch (err) {
      if (err.code === 'ENOENT') return;
      throw err;
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeAuthor = String(author || 'staff').replace(/[^a-z0-9_-]/gi, '').slice(0, 32) || 'staff';
    await fs.writeFile(path.join(historyDir, `${stamp}__${safeAuthor}.json`), current, 'utf8');
    await pruneHistory();
  }

  async function save(content, author) {
    await snapshotCurrent(author);
    await writeAtomic(contentFile, `${JSON.stringify(content, null, 2)}\n`);
    cache = Object.freeze(structuredClone(content));
    return cache;
  }

  async function listHistory() {
    await fs.mkdir(historyDir, { recursive: true });
    const files = (await fs.readdir(historyDir)).filter((f) => f.endsWith('.json')).sort().reverse();
    return files.map((id) => {
      const [stamp, author = 'staff'] = id.replace(/\.json$/, '').split('__');
      const iso = stamp.replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/, 'T$1:$2:$3.$4Z');
      return { id, savedAt: iso, author };
    });
  }

  async function readHistory(id) {
    if (!/^[\w-]+__[\w-]+\.json$/.test(id)) throw Object.assign(new Error('Bad history id'), { status: 400 });
    const text = await fs.readFile(path.join(historyDir, id), 'utf8');
    return JSON.parse(text);
  }

  return { load, save, listHistory, readHistory, contentFile };
}
