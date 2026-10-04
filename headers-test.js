/* ═══════════════════════════════════════════════════════════════════════════
   GÜVENLİK BAŞLIKLARI SINAMASI

   Başlıklar iki yerde tanımlı: vercel.json (canlı site) ve _headers (Netlify
   önizlemesi). Bu sınama üç şeyi denetliyor:
     1) iki dosyadaki güvenlik başlıkları birebir aynı mı;
     2) politikada olması gereken sert direktifler yerinde mi;
     3) sayfaların yüklediği her <script>/<link rel=stylesheet> adresi politikanın izin
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

const netlify = {};
for (const line of read('_headers').split('\n')) {
  const m = /^\s+([A-Za-z-]+):\s*(.+)$/.exec(line);
  if (m) netlify[m[1]] = m[2].trim();
}

let failed = 0;
const test = (name, fn) => {
  try { fn(); console.log('  ok   ' + name); } catch (e) { failed++; console.error('  HATA ' + name + '\n       ' + e.message); }
};

test('vercel.json ve _headers aynı güvenlik başlıklarını taşıyor', () => {
  for (const k of SEC) {
    assert.ok(vercel[k], 'vercel.json\'da yok: ' + k);
    assert.strictEqual(netlify[k], vercel[k], '_headers farklı: ' + k);
  }
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

const PAGES = ['index.html', 'travel.html', 'checkin.html', 'alerts.html', 'wellness.html', 'rpe.html'];
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
