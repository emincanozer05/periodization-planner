/* ═══════════════════════════════════════════════════════════════════════════
   GÜVENLİK BAŞLIKLARI SINAMASI

   Başlıklar vercel.json'da (canlı site) tanımlı. Bu sınama iki şeyi denetliyor:
     1) politikada olması gereken sert direktifler yerinde mi;
     2) sayfaların yüklediği her <script>/<link rel=stylesheet> adresi politikanın izin
        listesinde mi — yeni bir CDN eklenip politika unutulursa burada kırmızı olur.

   Çalıştırma:  node headers-test.js
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const assert = require('assert');

const read = f => fs.readFileSync(__dirname + '/' + f, 'utf8');
const SEC = ['X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy',
             'Content-Security-Policy-Report-Only'];

const vercel = {};
for (const rule of JSON.parse(read('vercel.json')).headers)
  if (rule.source === '/(.*)') for (const h of rule.headers) vercel[h.key] = h.value;

let failed = 0;
const test = (name, fn) => {
  try { fn(); console.log('  ok   ' + name); } catch (e) { failed++; console.error('  HATA ' + name + '\n       ' + e.message); }
};

test('vercel.json tüm güvenlik başlıklarını taşıyor', () => {
  for (const k of SEC) assert.ok(vercel[k], 'vercel.json\'da yok: ' + k);
});

/* Aynı site Firebase Hosting'de de (periodization-planner.web.app) yayında; sporcu formlarının
   linki oraya bakıyor. Başlıkları firebase.json'da ayrıca yazılı; iki liste ayrışmasın. */
test('firebase.json hosting başlıkları vercel.json ile aynı', () => {
  const hosting = JSON.parse(read('firebase.json')).hosting;
  assert.ok(hosting, 'firebase.json\'da hosting yok');
  const all = (hosting.headers.find(r => r.source === '**') || {}).headers || [];
  const fb = {};
  for (const h of all) fb[h.key] = h.value;
  assert.deepStrictEqual(fb, vercel);
});

const csp = {};
for (const part of (vercel['Content-Security-Policy-Report-Only'] || '').split(';')) {
  const [name, ...vals] = part.trim().split(/\s+/);
  if (name) csp[name] = vals;
}

test('sert direktifler yerinde', () => {
  assert.deepStrictEqual(csp['object-src'], ["'none'"]);
  assert.deepStrictEqual(csp['base-uri'], ["'self'"]);
  assert.deepStrictEqual(csp['frame-ancestors'], ["'self'"]);
  assert.deepStrictEqual(csp['default-src'], ["'self'"]);
  assert.strictEqual(vercel['X-Frame-Options'], 'SAMEORIGIN');
  assert.strictEqual(vercel['X-Content-Type-Options'], 'nosniff');
});

const hostOk = (url, list) => {
  const u = new URL(url);
  return list.some(s => {
    if (s === "'self'") return false;
    const m = /^https:\/\/(\*\.)?([^/]+)$/.exec(s);
    if (!m) return false;
    return m[1] ? u.hostname.endsWith('.' + m[2]) : u.hostname === m[2];
  });
};

const PAGES = ['index.html', 'travel.html', 'checkin.html', 'alerts.html', 'wellness.html', 'rpe.html', 'lift.html'];
test('sayfaların dış script adresleri script-src içinde', () => {
  const bad = [];
  for (const f of PAGES)
    for (const m of read(f).replace(/<!--[\s\S]*?-->/g, '').matchAll(/<script\b[^>]*\bsrc="(https:[^"]+)"/g))
      if (!hostOk(m[1], csp['script-src'])) bad.push(f + ' → ' + m[1]);
  assert.deepStrictEqual(bad, []);
});
test('sayfaların dış stylesheet adresleri style-src içinde', () => {
  const bad = [];
  for (const f of PAGES)
    for (const m of read(f).replace(/<!--[\s\S]*?-->/g, '').matchAll(/<link\b[^>]*\bhref="(https:[^"]+)"/g))
      if (/rel="stylesheet"/.test(m[0]) && !hostOk(m[1], csp['style-src'])) bad.push(f + ' → ' + m[1]);
  assert.deepStrictEqual(bad, []);
});

console.log(failed ? `\n${failed} kaldı` : '\nhepsi geçti');
process.exit(failed ? 1 : 0);
