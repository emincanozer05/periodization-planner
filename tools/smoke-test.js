/* ═══════════════════════════════════════════════════════════════════════════
   DUMAN SINAMASI — GERÇEK uygulamayı gerçek tarayıcıda açar, her sekmeyi gezer

   Diğer testler kodu Node'da sahte bir yüzeyde çalıştırıyor. Bu ise dist/ altındaki
   GERÇEK siteyi Chromium'da (Playwright) açıyor: React, Chart.js, Firebase SDK...
   kütüphaneleri CDN yerine npm'den indirilmiş yerel kopyalardan veriliyor, Firebase
   ağı kapalı ve oturum açmış sahte bir kullanıcı enjekte ediliyor. Sonuç: uygulama
   varsayılan boş takımla açılıyor ve kenar çubuğundaki her sekme tıklanıp çizilen
   içerik ölçülüyor.

   Neye yarıyor: kod yapısını değiştiren işlerde (parça sırası, modüllere çevirme...)
   "önce / sonra" karşılaştırması. Her sekme için çizilen metnin özeti (hash) ve eleman
   sayısı kaydediliyor; değişiklik görünür hiçbir şeyi bozmadıysa ikisi birebir aynı çıkar.

   Sınırları: veri boş (Kadro 0 sporcu), yani sporcu detayı, test girişi gibi dolu ekranlar
   gezilmiyor; takvim tarihi içerdiği için karşılaştırma AYNI GÜN içinde yapılmalı.

   Kullanım (önce `node build.js` ile dist/ üretilmiş olmalı):
     node tools/smoke-test.js                      sekmeleri gez, hata/boş sekme varsa kırmızı
     --pdf            dışa aktarma akışlarını da çalıştır (PDF, haftalık görsel, FMS PDF okuma)
     node tools/smoke-test.js --save onceki.json   sonucu kaydet
     node tools/smoke-test.js --compare onceki.json kayıtlı sonuçla birebir karşılaştır
     --shots klasör   her sekmenin ekran görüntüsünü yaz   --dist klasör (varsayılan dist)
     --theme light   açık temayla çalıştır (localStorage coachos_theme)

   Gerekenler: Playwright + Chromium (PLAYWRIGHT_BROWSERS_PATH), `curl`, `tar` ve npm
   kayıt defterine erişim (kütüphaneler ilk çalıştırmada TMP/coachos-smoke-libs'e iner).
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const argv = process.argv.slice(2);
const opt = n => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const ROOT = path.join(__dirname, '..');
const DIST = path.resolve(opt('--dist') || path.join(ROOT, 'dist'));
const CACHE = path.join(os.tmpdir(), 'coachos-smoke-libs');

// Sitenin CDN'den yüklediği kütüphaneler -> npm paketi ve paket içindeki dosya.
const PKGS = {
  react: ['react', '18.3.1', 'umd/react.production.min.js'],
  reactdom: ['react-dom', '18.3.1', 'umd/react-dom.production.min.js'],
  chart: ['chart.js', '4.4.0', 'dist/chart.umd.js'],
  datalabels: ['chartjs-plugin-datalabels', '2.2.0', 'dist/chartjs-plugin-datalabels.min.js'],
  jspdf: ['jspdf', '2.5.1', 'dist/jspdf.umd.min.js'],
  autotable: ['jspdf-autotable', '3.7.1', 'dist/jspdf.plugin.autotable.min.js'],
  html2canvas: ['html2canvas', '1.4.1', 'dist/html2canvas.min.js'],
  pdfjs: ['pdfjs-dist', '3.11.174', 'build/pdf.min.js'],
  pdfworker: ['pdfjs-dist', '3.11.174', 'build/pdf.worker.min.js'],
  fbapp: ['firebase', '10.12.2', 'firebase-app-compat.js'],
  fbauth: ['firebase', '10.12.2', 'firebase-auth-compat.js'],
  fbfs: ['firebase', '10.12.2', 'firebase-firestore-compat.js'],
  fbstorage: ['firebase', '10.12.2', 'firebase-storage-compat.js'],
  fbmsg: ['firebase', '10.12.2', 'firebase-messaging-compat.js'],
  babel: null,
};
const ROUTES = [
  [/unpkg\.com\/react@18[^/]*\/umd\/react\.production\.min\.js/, 'react'],
  [/unpkg\.com\/react-dom@18[^/]*\/umd\/react-dom\.production\.min\.js/, 'reactdom'],
  [/chart\.js@4\.4\.0\/dist\/chart\.umd\.min\.js/, 'chart'],
  [/chartjs-plugin-datalabels@2\.2\.0/, 'datalabels'],
  [/jspdf@2\.5\.1\/dist\/jspdf\.umd\.min\.js/, 'jspdf'],
  [/jspdf-autotable@3\.7\.1/, 'autotable'],
  [/html2canvas@1\.4\.1/, 'html2canvas'],
  [/pdfjs-dist@3\.11\.174\/build\/pdf\.min\.js/, 'pdfjs'],
  [/pdfjs-dist@3\.11\.174\/build\/pdf\.worker\.min\.js/, 'pdfworker'],
  [/gstatic\.com\/firebasejs\/10\.12\.2\/firebase-app-compat\.js/, 'fbapp'],
  [/gstatic\.com\/firebasejs\/10\.12\.2\/firebase-auth-compat\.js/, 'fbauth'],
  [/gstatic\.com\/firebasejs\/10\.12\.2\/firebase-firestore-compat\.js/, 'fbfs'],
  [/gstatic\.com\/firebasejs\/10\.12\.2\/firebase-storage-compat\.js/, 'fbstorage'],
  [/gstatic\.com\/firebasejs\/10\.12\.2\/firebase-messaging-compat\.js/, 'fbmsg'],
  [/unpkg\.com\/@babel\/standalone@7\/babel\.min\.js/, 'babel'],
];

// Oturum açmış sahte kullanıcı: yalnızca auth kütüphanesinin sonuna eklenir.
const FAKE_AUTH = `
;(function(){var fake={uid:'smoke-user',email:'smoke@example.com',displayName:'Smoke Test',isAnonymous:false,emailVerified:true,providerData:[],getIdToken:function(){return Promise.resolve('fake')}};
var A=firebase.auth.Auth;A.prototype.onAuthStateChanged=function(cb){setTimeout(function(){cb(fake)},50);return function(){}};
Object.defineProperty(A.prototype,'currentUser',{get:function(){return fake}});
A.prototype.signOut=function(){return Promise.resolve()};})();`;

function libFile(key) {
  if (key === 'babel') return path.join(ROOT, 'node_modules/@babel/standalone/babel.min.js');
  const [name, ver, file] = PKGS[key];
  const dir = path.join(CACHE, `${name}-${ver}`);
  if (!fs.existsSync(path.join(dir, 'package', file))) {
    fs.mkdirSync(dir, { recursive: true });
    const meta = JSON.parse(execFileSync('curl', ['-sS', '-m', '60', `https://registry.npmjs.org/${name}/${ver}`], { encoding: 'utf8' }));
    const tgz = path.join(dir, 'p.tgz');
    execFileSync('curl', ['-sS', '-m', '300', '-o', tgz, meta.dist.tarball]);
    execFileSync('tar', ['xzf', tgz, '-C', dir]);
  }
  return path.join(dir, 'package', file);
}

function playwright() {
  for (const p of ['playwright', path.join(execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim(), 'playwright')]) {
    try { return require(p); } catch (e) { /* sıradaki */ }
  }
  throw new Error('playwright bulunamadı (npm i -g playwright)');
}

(async () => {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) throw new Error(DIST + '/index.html yok: önce `node build.js`');
  const { chromium } = playwright();
  const cache = {};
  const body = key => cache[key] || (cache[key] = Buffer.concat([fs.readFileSync(libFile(key)), Buffer.from(key === 'fbauth' ? FAKE_AUTH : '')]));

  const srv = http.createServer((q, r) => {
    let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html';
    const f = path.join(DIST, u);
    if (!f.startsWith(DIST) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); }
    r.setHeader('content-type', { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' }[path.extname(f)] || 'application/octet-stream');
    r.end(fs.readFileSync(f));
  });
  await new Promise(r => srv.listen(0, r));
  const origin = 'http://localhost:' + srv.address().port;

  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 }, serviceWorkers: 'block' })).newPage();
  if (opt('--theme')) await page.addInitScript(t => { try { localStorage.setItem('coachos_theme', t); } catch (e) {} }, opt('--theme'));
  let cur = 'açılış'; const errors = {};
  const err = m => { (errors[cur] = errors[cur] || []).push(m); };
  page.on('pageerror', e => err('PAGEERROR ' + e.message.slice(0, 200)));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (!/Failed to load resource|Could not reach Cloud Firestore|net::ERR/.test(t)) err('CONSOLE ' + t.slice(0, 200));   // ağ kapalı: beklenen gürültü
  });
  await page.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(origin)) return route.continue();
    for (const [re, key] of ROUTES) if (re.test(url)) return route.fulfill({ status: 200, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' }, body: body(key) });
    return route.abort();
  });

  await page.goto(origin + '/index.html', { waitUntil: 'load' });
  await page.waitForSelector('.nav-item', { timeout: 45000 });
  await page.waitForTimeout(1500);
  const navs = await page.$$eval('.nav-item', els => els.map(e => e.innerText.trim().split('\n')[0]));
  const norm = t => t.replace(/\d{1,2}:\d{2}(:\d{2})?/g, 'HH:MM').replace(/\s+/g, ' ');
  const tabs = {};
  const shots = opt('--shots'); if (shots) fs.mkdirSync(shots, { recursive: true });
  for (let i = 0; i < navs.length; i++) {
    cur = navs[i];
    await page.locator('.nav-item').nth(i).click();
    await page.waitForTimeout(900);
    const text = await page.evaluate(() => (document.querySelector('main') || document.body).innerText);
    const elements = await page.evaluate(() => (document.querySelector('main') || document.body).querySelectorAll('*').length);
    tabs[cur] = { chars: text.length, elements, hash: crypto.createHash('md5').update(norm(text)).digest('hex').slice(0, 10) };
    if (shots) await page.screenshot({ path: path.join(shots, `tab-${String(i).padStart(2, '0')}.png`) });
  }
  /* --pdf: dışa aktarma akışlarını gerçekten çalıştır (jsPDF, html2canvas, pdf.js). Sayfanın
     üst düzey işlevleri klasik betikte tanımlı olduğu için window'dan çağrılabiliyor. */
  let pdf = null;
  if (argv.includes('--pdf')) {
    cur = 'pdf';
    pdf = await page.evaluate(async () => {
      const r = {};
      const t = (k, f) => f().then(v => { r[k] = v; }, e => { r[k] = 'HATA: ' + (e && e.message || e); });
      r.libsBefore = [typeof window.jspdf, typeof window.html2canvas, typeof window.pdfjsLib].join(',');
      await t('weekImage', async () => { const b = await buildWeekImageBlob('Smoke', '2026-09-28', {}, []); return b && b.size > 1000 ? 'png ok' : 'boş: ' + (b && b.size); });
      let blob;
      await t('sessionPdf', async () => { blob = await buildSessionPDFBlob('Smoke', 'Test', []); return blob && blob.size > 1000 && /pdf/.test(blob.type) ? 'pdf ok' : 'boş'; });
      await t('coachReport', async () => { await generateCoachReport('Smoke', 'P', {}, [], [], [], 1.1); return 'ok'; });
      await t('exLibPdf', async () => { await downloadExLibraryPDF([], { ball: false, libTab: 'all' }); return 'ok'; });
      await t('fmsPdf', async () => { const f = new File([blob], 'x.pdf', { type: 'application/pdf' }); const x = await fmsReadPdf(f); return x && x.pages && x.pages.length ? x.pages.length + ' sayfa' : 'boş'; });
      return r;
    });
  }
  await browser.close(); srv.close();

  const result = { navs, tabs, errors, pdf };
  let bad = 0;
  for (const [k, v] of Object.entries(tabs)) {
    const e = errors[k] || [];
    const empty = v.chars < 50;
    console.log(`  ${e.length || empty ? 'HATA' : 'ok  '} ${k.padEnd(22)} ${String(v.chars).padStart(5)} karakter ${String(v.elements).padStart(5)} eleman  ${v.hash}`);
    e.forEach(m => console.log('        ' + m));
    if (e.length || empty) bad++;
  }
  (errors['açılış'] || []).forEach(m => { console.log('  HATA açılış: ' + m); bad++; });
  if (pdf) {
    console.log('\n  dışa aktarma (--pdf):  açılışta yüklü kütüphaneler [jspdf,html2canvas,pdfjs] = ' + pdf.libsBefore);
    for (const k of ['weekImage', 'sessionPdf', 'coachReport', 'exLibPdf', 'fmsPdf']) {
      const ok = !/^HATA|boş/.test(String(pdf[k]));
      console.log(`  ${ok ? 'ok  ' : 'HATA'} ${k.padEnd(12)} ${pdf[k]}`);
      if (!ok) bad++;
    }
    (errors.pdf || []).forEach(m => { console.log('        ' + m); bad++; });
  }
  if (opt('--save')) { fs.writeFileSync(opt('--save'), JSON.stringify(result, null, 1)); console.log('kaydedildi: ' + opt('--save')); }
  if (opt('--compare')) {
    const base = JSON.parse(fs.readFileSync(opt('--compare'), 'utf8'));
    let diff = 0;
    for (const k of new Set([...Object.keys(base.tabs), ...Object.keys(tabs)])) {
      const a = base.tabs[k], b = tabs[k];
      if (!a || !b || a.hash !== b.hash || a.elements !== b.elements) { diff++; console.log(`  FARK ${k}: önce ${a ? a.hash + '/' + a.elements : '—'}  sonra ${b ? b.hash + '/' + b.elements : '—'}`); }
    }
    console.log(diff ? `\n${diff} sekme farklı` : `\n${Object.keys(tabs).length} sekmenin hepsi kayıtlıyla birebir aynı`);
    bad += diff;
  }
  console.log(bad ? `\n${bad} sorun` : '\nhepsi temiz');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
