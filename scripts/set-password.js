// Create a staff account or reset its password:
//   npm run set-password            (asks for username + password)
//   npm run set-password -- stella  (asks for password only)
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { createAuth, MIN_PASSWORD_LENGTH } from '../src/lib/auth.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const auth = createAuth(path.join(root, 'data', 'users.json'));

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); else rl.output.write('*'); };
    }
    rl.question(question, (answer) => { rl.close(); if (hidden) process.stdout.write('\n'); resolve(answer); });
  });
}

const username = process.argv[2] || (await ask('Staff username: ')).trim();
const password = await ask(`New password (at least ${MIN_PASSWORD_LENGTH} characters): `, { hidden: true });
const again = await ask('Type it again: ', { hidden: true });

if (password !== again) {
  process.stderr.write('Passwords did not match. Nothing was changed.\n');
  process.exit(1);
}
try {
  await auth.setPassword(username, password);
  process.stdout.write(`Saved. "${username}" can now sign in at /admin/\n`);
} catch (err) {
  process.stderr.write(`${err.message}\n`);
  process.exit(1);
}
