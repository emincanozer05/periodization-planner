/* ═══════════════════════════════════════════════════════════════════════════
   SÖZDİZİMİ DENETİMİ — uygulamanın kendi derleyicisiyle

   CoachOS'un derleme adımı yok: index.html içindeki JSX tarayıcıda, sayfa
   açılırken @babel/standalone ile derleniyor. Bunun bedeli şu: bir sözdizimi
   hatası derleme zamanında değil, KOÇUN EKRANINDA ortaya çıkıyor — ve beyaz bir
   sayfa olarak çıkıyor, hata mesajı yalnızca konsolda.

   Bu betik o hatayı önce burada bulur. Sayfalardaki gömülü script'leri çıkarır ve
   tarayıcının kullandığı derleyicinin AYNISIYLA (node_modules'daki
   @babel/standalone 7, index.html'in yüklediği sürümün eşi) derler.

   Ayrıca React'in hook sırası kuralını denetler — aşağıdaki checkHooks'a bak.

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

/* ── Hook sırası ────────────────────────────────────────────────────────────
   React, bir bileşenin HER çiziminde aynı sayıda hook'un aynı sırada çağrılmasını
   şart koşuyor. Koşullu bir return'den SONRA duran bir hook bu kuralı bozuyor:
   erken dönülen çizimde hiç çağrılmıyor, dönülmeyen çizimde çağrılıyor.

   Bunun bedeli sahada görüldü. `App`, oturum yüklenirken erken dönüyor; return'ün
   altına konmuş bir useRef ilk çizimde atlanıp ikincisinde çalıştı ve React
   "önceki çizimden daha fazla hook" (minified error #310) deyip ağacı komple
   düşürdü. Sonuç bembeyaz bir sayfaydı — ve sözdizimi tamamen geçerli olduğu için
   derleyici tek kelime etmedi.

   Denetim kasıtlı olarak kaba: bileşen gövdesinde `if (…) return <…>` biçiminde
   bir satır gördükten sonra gelen her hook çağrısını bildiriyor. */
const HOOK_RE = /\b(useState|useEffect|useRef|useMemo|useCallback|useLayoutEffect|useReducer|useContext|useImperativeHandle)\s*\(/;
// Büyük harfle başlayan fonksiyon = React bileşeni.
const COMPONENT_RE = /^(?:function\s+([A-Z][A-Za-z0-9_]*)\s*\(|const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*(?:\([^)]*\)|[A-Za-z0-9_$]+)\s*=>)/;
/* Sütun 0'da başlayan her tanım, incelenen bileşenin BİTTİĞİ yerdir. Bu satır
   olmadan denetim, bir bileşenin koşullu return'ünü kendinden sonraki `useXxx`
   yardımcı hook'una taşıyıp olmayan bir hata bildiriyordu (bileşen adı büyük
   harfle başlar, hook'unki başlamaz — o yüzden COMPONENT_RE tek başına yetmiyor). */
const TOP_LEVEL_RE = /^(?:function\s|const\s|let\s|var\s|class\s|\/\* =)/;
const EARLY_RETURN_RE = /^\s{2,}if\s*\(.*\)\s*return\s*[<(]/;

function checkHooks(file) {
  console.log('\n== ' + file + ' — hook sırası ==');
  const raw = fs.readFileSync(file, 'utf8');
  const html = raw.replace(/<!--[\s\S]*?-->/g, c => c.replace(/[^\n]/g, ' '));
  const re = /<script\b([^>]*text\/babel[^>]*)>([\s\S]*?)<\/script>/gi;
  let m, found = 0;
  while ((m = re.exec(html))) {
    const base = html.slice(0, m.index).split('\n').length;
    const lines = m[2].split('\n');
    let current = null, returnedAt = -1;
    lines.forEach((ln, i) => {
      const c = COMPONENT_RE.exec(ln);
      if (c) { current = c[1] || c[2]; returnedAt = -1; return; }
      if (TOP_LEVEL_RE.test(ln)) { current = null; returnedAt = -1; return; }
      if (!current) return;
      if (returnedAt < 0 && EARLY_RETURN_RE.test(ln)) { returnedAt = i; return; }
      if (returnedAt < 0) return;
      if (/^\s*(\/\/|\*|\/\*)/.test(ln)) return;          // yorum satırı
      if (!HOOK_RE.test(ln)) return;
      console.error(`  HATA ${current}: satır ${base + i} — koşullu return'den (satır ${base + returnedAt}) sonra hook`);
      console.error(`        ${ln.trim()}`);
      failed++; found++;
    });
  }
  if (!found) console.log('  ok   her hook koşullu return\'lerden önce');
}

PAGES.forEach(checkPage);
PAGES.forEach(checkHooks);
console.log('\n== bağımsız js ==');
SCRIPTS.forEach(checkScript);

console.log(failed ? `\n${failed} dosyada sözdizimi hatası var.` : '\nSözdizimi temiz.');
if (failed) process.exitCode = 1;
