// Content storage: one human-readable JSON file (data/content.json).
// - Every save is written atomically and the previous version is kept in
//   data/history/ so staff can undo mistakes from the editor.
// - Each saved file has a "version" (a short fingerprint). The editor sends
//   back the version it started from; if someone else published in the
//   meantime the save is refused instead of silently overwriting their work.
// - If content.json is ever damaged (e.g. hand-edited badly), the site keeps
//   running from the most recent good copy in history.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const HISTORY_LIMIT = 100;

const fingerprint = (text) => crypto.createHash('sha1').update(text).digest('hex').slice(0, 16);

export class ConflictError extends Error {
  constructor() {
    super('Someone else published changes while you were editing. Your edits are still here: copy anything you need, then reload the editor to see the latest version.');
    this.status = 409;
  }
}

/**
 * @param {string} dataDir
 * @param {{ normalize?: (raw: unknown) => object, logger?: Pick<Console, 'error'> }} [opts]
 */
export function createStore(dataDir, { normalize = (c) => c, logger = console } = {}) {
  const contentFile = path.join(dataDir, 'content.json');
  const historyDir = path.join(dataDir, 'history');
  let cache = null; // { content, version }
  let queue = Promise.resolve(); // saves run one at a time

  async function writeAtomic(file, text) {
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmp, text, 'utf8');
    await fs.rename(tmp, file);
  }

  async function historyFiles() {
    await fs.mkdir(historyDir, { recursive: true });
    return (await fs.readdir(historyDir)).filter((f) => f.endsWith('.json')).sort();
  }

  async function readFromHistory() {
    for (const f of (await historyFiles()).reverse()) {
      try {
        const text = await fs.readFile(path.join(historyDir, f), 'utf8');
        return { raw: JSON.parse(text), text, from: f };
      } catch { /* try the next older copy */ }
    }
    return null;
  }

  async function readCurrent() {
    try {
      const text = await fs.readFile(contentFile, 'utf8');
      return { raw: JSON.parse(text), text };
    } catch (err) {
      const backup = await readFromHistory();
      if (!backup) throw err;
      logger.error(`[store] content.json unreadable (${err.message}); serving backup ${backup.from}`);
      return backup;
    }
  }

  async function loadEntry() {
    if (cache) return cache;
    const { raw, text } = await readCurrent();
    cache = Object.freeze({ content: Object.freeze(normalize(raw)), version: fingerprint(text) });
    return cache;
  }

  const load = async () => (await loadEntry()).content;
  const version = async () => (await loadEntry()).version;

  async function pruneHistory() {
    const files = await historyFiles();
    const extra = files.slice(0, Math.max(0, files.length - HISTORY_LIMIT));
    await Promise.all(extra.map((f) => fs.unlink(path.join(historyDir, f))));
  }

  async function snapshotCurrent(author) {
    let current;
    try {
      current = await fs.readFile(contentFile, 'utf8');
    } catch (err) {
      if (err.code === 'ENOENT') return;
      throw err;
    }
    await fs.mkdir(historyDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeAuthor = String(author || 'staff').replace(/[^a-z0-9_-]/gi, '').slice(0, 32) || 'staff';
    await fs.writeFile(path.join(historyDir, `${stamp}__${safeAuthor}.json`), current, 'utf8');
    await pruneHistory();
  }

  /**
   * @param {object} content already validated
   * @param {string} author
   * @param {string} [baseVersion] version the editor started from; omit to force
   */
  function save(content, author, baseVersion) {
    const run = async () => {
      if (baseVersion && baseVersion !== (await version())) throw new ConflictError();
      await snapshotCurrent(author);
      const text = `${JSON.stringify(content, null, 2)}\n`;
      await writeAtomic(contentFile, text);
      cache = Object.freeze({ content: Object.freeze(structuredClone(content)), version: fingerprint(text) });
      return cache;
    };
    const result = queue.then(run, run);
    queue = result.catch(() => {});
    return result;
  }

  async function listHistory() {
    return (await historyFiles()).reverse().map((id) => {
      const [stamp, author = 'staff'] = id.replace(/\.json$/, '').split('__');
      const iso = stamp.replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/, 'T$1:$2:$3.$4Z');
      return { id, savedAt: iso, author };
    });
  }

  async function readHistory(id) {
    if (!/^[\w-]+__[\w-]+\.json$/.test(id)) throw Object.assign(new Error('Bad history id'), { status: 400 });
    const text = await fs.readFile(path.join(historyDir, id), 'utf8');
    return normalize(JSON.parse(text));
  }

  return { load, version, save, listHistory, readHistory, contentFile };
}
