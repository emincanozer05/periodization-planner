/* ═══════════════════════════════════════════════════════════════════════════
   DERLEME — JSX'i yayına çıkarmadan ÖNCE bir kez derler

   Kaynak: index.html src/ altındaki parçalardan üretiliyor (assemble.js); build.js
   önce onu çalıştırıyor. travel.html tek dosya.
   Kaynak dosyalar (index.html, travel.html) değişmiyor: JSX orada yazılmaya
   devam ediyor ve yerelde doğrudan açılınca eskisi gibi tarayıcıda derleniyor.
   Bu betik yayın için dist/ klasörü üretir:

     - <script type="text/babel"> bloğu, tarayıcının kullandığı derleyicinin
       aynısıyla (node_modules'daki @babel/standalone 7, react preset, klasik
       runtime) düz JavaScript'e çevrilir ve yerine konur;
     - artık gerekmeyen @babel/standalone <script> etiketi (~3 MB) çıkarılır;
     - geri kalan statik dosyalar olduğu gibi dist/'e kopyalanır.

   Kullanıcının tarayıcısı artık 37 bin satırı her açılışta derlemiyor.

   Çalıştırma:  node build.js        (çıktı: dist/)
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const babel = require('@babel/standalone');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'dist');

// Derlenecek sayfalar (her birinde tek bir text/babel bloğu var).
const PAGES = ['index.html', 'travel.html'];

// dist/'e KOPYALANMAYANLAR: sunucu tarafı kod, araçlar, testler, belgeler.
const SKIP_DIRS = new Set(['.git', '.github', '.claude', 'node_modules', 'functions', 'tools', 'api', 'dist', 'src']);
const SKIP_FILES = new Set(['build.js', 'assemble.js', 'check-syntax.js', 'validator-test.js', 'sync-test.js', 'sw-test.js', 'headers-test.js', 'deps.js', 'shell-test.js']);
const SKIP_EXT = new Set(['.md']);

const BABEL_TAG = /[ \t]*<script\b[^>]*@babel\/standalone[^>]*><\/script>[ \t]*\r?\n?/;

function compilePage(file) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const open = html.indexOf('<script type="text/babel"');
  if (open < 0) throw new Error(file + ': text/babel bloğu bulunamadı');
  const start = html.indexOf('>', open) + 1;
  const end = html.indexOf('</script>', start);
  if (end < 0) throw new Error(file + ': text/babel bloğu kapanmıyor');
  if (html.indexOf('<script type="text/babel"', end) >= 0) {
    throw new Error(file + ': birden fazla text/babel bloğu var, build.js tek blok bekliyor');
  }

  const { code } = babel.transform(html.slice(start, end), {
    presets: ['react'], filename: file + '.jsx', compact: true, comments: false,
  });
  // Satır içi <script> içinde bu diziler HTML ayrıştırıcısını yanıltır.
  if (/<\/script|<!--/i.test(code)) throw new Error(file + ': derlenmiş kodda </script veya <!-- geçiyor');

  let out = html.slice(0, open) + '<script>\n' + code + '\n' + html.slice(end);
  if (!BABEL_TAG.test(out)) throw new Error(file + ': @babel/standalone etiketi bulunamadı');
  out = out.replace(BABEL_TAG, '');
  if (/text\/babel|@babel\/standalone/.test(out.replace(/<!--[\s\S]*?-->/g, ''))) {
    throw new Error(file + ': çıktıda hâlâ Babel izi var');
  }
  return { out, before: html.length };
}

function copyTree(dir, rel) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const r = rel ? rel + '/' + ent.name : ent.name;
    const src = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (!rel && SKIP_DIRS.has(ent.name)) continue;
      fs.mkdirSync(path.join(OUT, r), { recursive: true });
      copyTree(src, r);
    } else if (!rel && (SKIP_FILES.has(ent.name) || PAGES.includes(ent.name))) {
      continue;
    } else if (!SKIP_EXT.has(path.extname(ent.name))) {
      fs.copyFileSync(src, path.join(OUT, r));
    }
  }
}

// index.html src/ parçalarından üretiliyor; yayın hep güncel kaynaktan çıksın.
require('./assemble.js').assemble();

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
copyTree(ROOT, '');

for (const file of PAGES) {
  const { out, before } = compilePage(file);
  fs.writeFileSync(path.join(OUT, file), out);
  console.log(`  ok   ${file}  ${(before / 1024).toFixed(0)} KB -> ${(out.length / 1024).toFixed(0)} KB`);
}
console.log('dist/ hazır');
