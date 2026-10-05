// Generates the ADMIN_PASSWORD_HASH value for the ROSS 360 Admin.
//
//   npm run admin:hash
//
// Reads a password from the terminal (it is not shown and is not saved anywhere), prints the hash,
// and never prints the password itself. Paste the hash into Cloudflare Pages -> Settings ->
// Variables and Secrets as the secret ADMIN_PASSWORD_HASH, alongside the variable ADMIN_EMAIL.
// Do not commit it.

import { createInterface } from 'node:readline';
import { derive } from '../server/admin/auth.js';

// 100,000 is the most the Cloudflare Workers runtime is documented to accept for PBKDF2, so a
// higher count could make sign-in fail once deployed.
const ITERATIONS = 100000;

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  return new Promise((resolve) => {
    // Hide what is typed.
    const onData = () => {
      rl.output.write('\x1b[2K\r' + question);
    };
    rl.output.write(question);
    rl.input.on('data', onData);
    rl.question('', (answer) => {
      rl.input.off('data', onData);
      rl.output.write('\n');
      rl.close();
      resolve(answer);
    });
  });
}

const password = (await ask('New admin password: ')).trim();
if (password.length < 12) {
  console.error('Please use at least 12 characters.');
  process.exit(1);
}
const again = (await ask('Repeat the password: ')).trim();
if (password !== again) {
  console.error('The passwords did not match.');
  process.exit(1);
}

const salt = crypto.getRandomValues(new Uint8Array(16));
const hash = await derive(password, salt, ITERATIONS);
const b64 = (bytes) => Buffer.from(bytes).toString('base64');

console.log('\nADMIN_PASSWORD_HASH (set this as a secret in Cloudflare Pages):\n');
console.log(`pbkdf2$${ITERATIONS}$${b64(salt)}$${b64(hash)}\n`);
