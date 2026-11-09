// Staff accounts and login sessions, using only Node's built-in crypto.
// Passwords are stored as scrypt hashes in data/users.json (never plain text).

import { promises as fs } from 'node:fs';
import crypto from 'node:crypto';

const SCRYPT_KEYLEN = 64;
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const MAX_FAILURES = 8;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;
export const MIN_PASSWORD_LENGTH = 10;

function scrypt(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, { N: 16384, r: 8, p: 1 }, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = (await scrypt(password, salt)).toString('hex');
  return { salt, hash };
}

export async function verifyPassword(password, { salt, hash }) {
  const expected = Buffer.from(hash, 'hex');
  const actual = await scrypt(password, salt);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export function createAuth(usersFile, { now = () => Date.now() } = {}) {
  const sessions = new Map(); // token -> { username, expires, csrf }
  const failures = new Map(); // ip -> { count, first }

  async function readUsers() {
    try {
      return JSON.parse(await fs.readFile(usersFile, 'utf8')).users || [];
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw err;
    }
  }

  async function writeUsers(users) {
    const tmp = `${usersFile}.tmp`;
    await fs.writeFile(tmp, `${JSON.stringify({ users }, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
    await fs.rename(tmp, usersFile);
  }

  async function setPassword(username, password) {
    if (!/^[a-z0-9._-]{2,32}$/i.test(username)) throw new Error('Username: 2–32 letters, numbers, dot, dash or underscore.');
    if (String(password).length < MIN_PASSWORD_LENGTH) throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    const users = await readUsers();
    const record = { username, ...(await hashPassword(password)), updatedAt: new Date(now()).toISOString() };
    const next = [...users.filter((u) => u.username !== username), record];
    await writeUsers(next);
    // Changing a password signs that person out everywhere.
    [...sessions].filter(([, s]) => s.username === username).forEach(([t]) => sessions.delete(t));
  }

  function isLockedOut(ip) {
    const f = failures.get(ip);
    if (!f) return false;
    if (now() - f.first > FAILURE_WINDOW_MS) { failures.delete(ip); return false; }
    return f.count >= MAX_FAILURES;
  }

  function recordFailure(ip) {
    const f = failures.get(ip);
    const fresh = !f || now() - f.first > FAILURE_WINDOW_MS;
    failures.set(ip, fresh ? { count: 1, first: now() } : { ...f, count: f.count + 1 });
  }

  /** @returns {Promise<{ok: true, token: string, csrf: string} | {ok: false, reason: string}>} */
  async function login(username, password, ip) {
    if (isLockedOut(ip)) return { ok: false, reason: 'Too many attempts. Please wait 15 minutes and try again.' };
    const user = (await readUsers()).find((u) => u.username === String(username || ''));
    // Always run scrypt so response time doesn't reveal whether a username exists.
    const valid = user ? await verifyPassword(String(password || ''), user) : (await hashPassword('x'), false);
    if (!valid) {
      recordFailure(ip);
      return { ok: false, reason: 'That username and password don’t match.' };
    }
    failures.delete(ip);
    const token = crypto.randomBytes(32).toString('base64url');
    const csrf = crypto.randomBytes(24).toString('base64url');
    sessions.set(token, { username: user.username, expires: now() + SESSION_TTL_MS, csrf });
    return { ok: true, token, csrf };
  }

  function getSession(token) {
    if (!token) return null;
    const s = sessions.get(token);
    if (!s) return null;
    if (s.expires < now()) { sessions.delete(token); return null; }
    return s;
  }

  function logout(token) { sessions.delete(token); }

  async function hasUsers() { return (await readUsers()).length > 0; }

  return { login, logout, getSession, setPassword, hasUsers, readUsers, SESSION_TTL_MS };
}
