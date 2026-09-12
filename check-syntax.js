/* ═══════════════════════════════════════════════════════════════════════════
   SÖZDİZİMİ DENETİMİ — uygulamanın kendi derleyicisiyle

   CoachOS'un derleme adımı yok: index.html içindeki JSX tarayıcıda, sayfa
   açılırken @babel/standalone ile derleniyor. Bunun bedeli şu: bir sözdizimi
   hatası derleme zamanında değil, KOÇUN EKRANINDA ortaya çıkıyor — ve beyaz bir
   sayfa olarak çıkıyor, hata mesajı yalnızca konsolda.

   Bu betik o hatayı önce burada bulur. Sayfalardaki gömülü script'leri çıkarır ve
   tarayıcının kullandığı derleyicinin AYNISIYLA (node_modules'daki
   @babel/standalone 7, index.html'in yüklediği sürümün eşi) derler.

   Çalıştırma:  node check-syntax.js
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const babel = require('@babel/standalone');

// Gömülü script taşıyan sayfalar. Dış dosyaya (src=…) bakan etiketler atlanıyor.
const PAGES = ['index.html', 'checkin.html', 'alerts.html', 'wellness.html', 'rpe.html'];
// Tarayıcıya klasik script olarak inen bağımsız dosyalar.
// (tally-worker.js bilerek dışarıda: o bir ES modülü ve Cloudflare Worker'da çalışıyor.)
const SCRIPTS = ['push-config.js', 'firebase-messaging-sw.js'];

let failed = 0;

function checkPage(file) {
  console.log('\n== ' + file + ' ==');
  const raw = fs.readFileSync(file, 'utf8');
  /* HTML yorumları önce boşluğa çevriliyor. İçinde "<script>" kelimesi geçen
     açıklama yorumları var ve tarayıcı onları zaten okumuyor; satır numaraları
     bozulmasın diye silinmek yerine boşlukla dolduruluyor. */
  const html = raw.replace(/<!--[\s\S]*?-->/g, c => c.replace(/[^\n]/g, ' '));
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m, n = 0;
  while ((m = re.exec(html))) {
    const attrs = m[1] || '', code = m[2] || '';
    if (/\bsrc=/.test(attrs) || !code.trim()) continue;
    n++;
    const isBabel = /text\/babel/.test(attrs);
    const line = html.slice(0, m.index).split('\n').length;
    try {
      if (isBabel) babel.transform(code, { presets: ['react'], filename: file + '.jsx' });
      else new Function(code);
      console.log(`  ok   satır ${line} ${isBabel ? '[jsx]' : '[js] '} ${code.length} bayt`);
    } catch (e) {
      console.error(`  HATA satır ${line}: ${e.message}`);
      failed++;
    }
  }
  if (!n) console.log('  (gömülü script yok)');
}

function checkScript(file) {
  try {
    new Function(fs.readFileSync(file, 'utf8'));
    console.log('  ok   ' + file);
  } catch (e) {
    console.error('  HATA ' + file + ': ' + e.message);
    failed++;
  }
}

PAGES.forEach(checkPage);
console.log('\n== bağımsız js ==');
SCRIPTS.forEach(checkScript);

console.log(failed ? `\n${failed} dosyada sözdizimi hatası var.` : '\nSözdizimi temiz.');
if (failed) process.exitCode = 1;
