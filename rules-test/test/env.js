/* Ortak test ortamı: emulator'e gerçek firestore.rules ve storage.rules yüklenir.
   `npm test` bunu `firebase emulators:exec` içinde çalıştırır; emulator adresleri
   FIRESTORE_EMULATOR_HOST / FIREBASE_STORAGE_EMULATOR_HOST ortam değişkenlerinden gelir. */
const fs = require('node:fs');
const path = require('node:path');
const { initializeTestEnvironment } = require('@firebase/rules-unit-testing');

const ROOT = path.join(__dirname, '..', '..');
const hostPort = v => { const [host, port] = String(v).split(':'); return { host, port: Number(port) }; };

let envPromise = null;
function getEnv() {
  if (!envPromise) {
    envPromise = initializeTestEnvironment({
      projectId: 'demo-coachos',
      firestore: Object.assign(hostPort(process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'),
        { rules: fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8') }),
      storage: Object.assign(hostPort(process.env.FIREBASE_STORAGE_EMULATOR_HOST || '127.0.0.1:9199'),
        { rules: fs.readFileSync(path.join(ROOT, 'storage.rules'), 'utf8') }),
    });
  }
  return envPromise;
}

/* Kurallar devre dışıyken hazır veri yaz (admin SDK'nın yaptığı gibi). */
async function seed(fn) {
  const env = await getEnv();
  await env.withSecurityRulesDisabled(ctx => fn(ctx.firestore()));
}

/* Google/e-posta ile girmiş kullanıcı; anonim oturum için provider 'anonymous'. */
async function as(uid, provider = 'google.com') {
  const env = await getEnv();
  return env.authenticatedContext(uid, { firebase: { sign_in_provider: provider } });
}
async function anon() { return (await getEnv()).unauthenticatedContext(); }

module.exports = { getEnv, seed, as, anon };
