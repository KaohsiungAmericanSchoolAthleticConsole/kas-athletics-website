import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createAuth, hashPassword, verifyPassword } from '../src/lib/auth.js';

test('passwords are hashed and verified', async () => {
  const rec = await hashPassword('a-long-password');
  assert.notEqual(rec.hash, 'a-long-password');
  assert.ok(await verifyPassword('a-long-password', rec));
  assert.ok(!(await verifyPassword('wrong', rec)));
});

test('sessions expire and password changes sign people out', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'kas-auth-'));
  let clock = 1_000_000;
  const auth = createAuth(path.join(dir, 'users.json'), { now: () => clock });
  assert.equal(await auth.hasUsers(), false);
  await assert.rejects(auth.setPassword('ok', 'short'), /at least/);
  await assert.rejects(auth.setPassword('bad name!', 'long-enough-pass'), /Username/);
  await auth.setPassword('coach', 'long-enough-pass');
  const s = await auth.login('coach', 'long-enough-pass', 'ip');
  assert.ok(s.ok && auth.getSession(s.token));
  clock += auth.SESSION_TTL_MS + 1;
  assert.equal(auth.getSession(s.token), null);
  const s2 = await auth.login('coach', 'long-enough-pass', 'ip');
  await auth.setPassword('coach', 'another-long-pass');
  assert.equal(auth.getSession(s2.token), null);
  const raw = await fs.readFile(path.join(dir, 'users.json'), 'utf8');
  assert.doesNotMatch(raw, /long-enough-pass|another-long-pass/);
  await fs.rm(dir, { recursive: true, force: true });
});
