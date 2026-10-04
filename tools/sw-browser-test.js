/* ═══════════════════════════════════════════════════════════════════════════
   SERVICE WORKER'IN GERÇEK TARAYICI SINAMASI — medya önbelleği, CORS'suz kova

   sw-test.js worker'ı sahte bir yüzeyde sınıyor; bu ise GERÇEK Chromium'da gerçek service
   worker ile deniyor. Bunun gerekçesi yaşandı: Firebase Storage kovası CORS başlığı
   göndermiyor, sahte yüzeyde geçen CORS kipli bir önbellek gerçekte hiç kopya saklamıyor ve
   konsola kırmızı hata basıyordu. Burada Storage'ın yerine CORS GÖNDERMEYEN yerel bir sunucu
   var; sınanan: görsel geliyor mu, kopya saklanıyor mu, kova kapanınca görsel hâlâ geliyor
   mu, konsola hata düşüyor mu.

   Not: Google alan adları Chrome'da sertifika sabitlemeli, o yüzden worker'ın TEST KOPYASINDA
   yalnızca Storage ana makine koşulu 127.0.0.1 ile değiştiriliyor; önbellek mantığı aynı.

   Kullanım (önce `node build.js`):   node tools/sw-browser-test.js
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http');
const { execFileSync } = require('child_process');

const DIST = path.join(__dirname, '..', 'dist');
const pw = () => { for (const p of ['playwright', path.join(execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim(), 'playwright')]) { try { return require(p); } catch (e) { /* sıradaki */ } } throw new Error('playwright yok'); };

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'coachos-sw-'));
fs.copyFileSync(path.join(DIST, 'push-config.js'), path.join(tmp, 'push-config.js'));
const swSrc = fs.readFileSync(path.join(DIST, 'firebase-messaging-sw.js'), 'utf8');
const cond = "url.protocol === 'https:' && url.hostname === 'firebasestorage.googleapis.com' &&";
if (!swSrc.includes(cond)) throw new Error('worker\'da isMedia koşulu bulunamadı (kod değişmiş olabilir, testi güncelle)');
fs.writeFileSync(path.join(tmp, 'firebase-messaging-sw.js'), swSrc.replace(cond, "url.hostname === '127.0.0.1' &&"));

let storageHits = 0, storagePort = 0;
const storage = http.createServer((q, r) => { storageHits++; r.setHeader('content-type', 'image/png'); r.end(PNG); });   // CORS başlığı YOK
const app = http.createServer((q, r) => {
  const u = q.url.split('?')[0];
  if (u === '/t.html') { r.setHeader('content-type', 'text/html'); return r.end('<img id=i src="http://127.0.0.1:' + storagePort + '/v0/b/b/o/pic?alt=media&token=t"><script>navigator.serviceWorker.register("/firebase-messaging-sw.js")</script>'); }
  const f = path.join(tmp, u);
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); }
  r.setHeader('content-type', 'text/javascript'); r.end(fs.readFileSync(f));
});

(async () => {
  await new Promise(r => storage.listen(0, '127.0.0.1', r)); storagePort = storage.address().port; await new Promise(r => app.listen(0, r));
  const browser = await pw().chromium.launch({ args: ['--no-sandbox', '--no-proxy-server'] });
  const page = await (await browser.newContext()).newPage();
  const errors = []; page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 140)); });
  const shown = () => page.evaluate(() => { const i = document.getElementById('i'); return i.complete && i.naturalWidth > 0; });
  const url = 'http://localhost:' + app.address().port + '/t.html';
  await page.goto(url); await page.waitForTimeout(1500);
  await page.evaluate(() => navigator.serviceWorker.ready); await page.reload(); await page.waitForTimeout(1500);   // artık worker denetiminde
  const online = await shown();
  const cached = await page.evaluate(async () => (await (await caches.open('coachos-media-v1')).keys()).length);
  const before = storageHits;
  await page.reload(); await page.waitForTimeout(1200);
  const fromCache = storageHits === before;
  await new Promise(r => storage.close(r));                                  // kova artık yanıt vermiyor (çevrimdışı)
  await page.reload(); await page.waitForTimeout(1200);
  const offline = await shown();
  await browser.close(); app.close();

  const checks = [
    ['görsel çevrimiçiyken geliyor', online], ['kopya saklanıyor', cached === 1],
    ['kopya varken sunucuya yeni istek gitmiyor', fromCache], ['kova kapalıyken görsel yine geliyor', offline],
    ['konsola hata düşmüyor', errors.length === 0],
  ];
  let bad = 0;
  for (const [n, ok] of checks) { console.log(`  ${ok ? 'ok  ' : 'HATA'} ${n}`); if (!ok) bad++; }
  errors.forEach(e => console.log('        ' + e));
  console.log(bad ? `\n${bad} sorun` : '\nhepsi temiz');
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
