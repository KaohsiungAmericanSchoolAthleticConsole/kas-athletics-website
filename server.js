import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './src/app.js';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || '127.0.0.1';

const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : undefined;
const server = http.createServer(createApp({ rootDir, dataDir }));
server.requestTimeout = 60_000;
server.listen(port, host, () => {
  process.stdout.write(`KAS Athletics running at http://${host === '0.0.0.0' ? 'localhost' : host}:${port}\n`);
});
