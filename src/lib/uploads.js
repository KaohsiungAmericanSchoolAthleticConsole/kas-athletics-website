// Photo uploads. The admin page shrinks photos in the browser before sending,
// so files stay small. Here we only accept real images (checked by their
// first bytes, not by the file name) and store them under random names.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const SIGNATURES = [
  { ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'png', test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: 'webp', test: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP' },
  { ext: 'gif', test: (b) => b.subarray(0, 4).toString('latin1') === 'GIF8' },
  { ext: 'avif', test: (b) => b.subarray(4, 12).toString('latin1') === 'ftypavif' },
];

export function detectImageType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  return SIGNATURES.find((s) => s.test(buffer))?.ext ?? null;
}

/**
 * @param {string} uploadDir
 * @param {string} dataUrl "data:image/...;base64,...."
 * @returns {Promise<string>} public path like /uploads/2026/ab12cd.webp
 */
export async function saveImage(uploadDir, dataUrl, { now = new Date() } = {}) {
  const m = /^data:image\/[a-z+.-]+;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) throw Object.assign(new Error('That file is not an image.'), { status: 400 });
  const buffer = Buffer.from(m[1], 'base64');
  if (buffer.length > MAX_UPLOAD_BYTES) throw Object.assign(new Error('Photo is too large (8 MB max).'), { status: 413 });
  const ext = detectImageType(buffer);
  if (!ext) throw Object.assign(new Error('Please upload a JPG, PNG, WebP, GIF or AVIF photo.'), { status: 415 });

  const year = String(now.getFullYear());
  const dir = path.join(uploadDir, year);
  await fs.mkdir(dir, { recursive: true });
  const name = `${crypto.randomBytes(9).toString('base64url')}.${ext}`;
  await fs.writeFile(path.join(dir, name), buffer);
  return `/uploads/${year}/${name}`;
}
