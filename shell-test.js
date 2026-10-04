/* ═══════════════════════════════════════════════════════════════════════════
   UYGULAMA KABUĞU SINAMASI — yükleme ekranı, klavye odağı, hareketi azalt

   Bunlar yalnızca eklenen, görünmez-ama-önemli parçalar: biri sadeleştirirken
   silerse kimse fark etmez, ta ki telefonda ekran boş kalana ya da klavyeyle
   gezen biri kaybolana kadar. Bu sınama onları yerinde tutuyor.

   Çalıştırma:  node shell-test.js
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const css = html.split('<style>')[1].split('</style>')[0];
const body = html.slice(html.indexOf('<body>'), html.indexOf('<script type="text/babel"'));

let failed = 0;
const test = (name, fn) => {
  try { fn(); console.log('  ok   ' + name); } catch (e) { failed++; console.error('  HATA ' + name + '\n       ' + e.message); }
};

test('#root içinde yükleme ekranı var (React ilk çizimde bunu değiştirir)', () => {
  const m = /<div id="root">([\s\S]*?)<\/div><\/div>\s*<script>/.exec(body);
  assert.ok(m, '#root ve ardından zaman aşımı betiği bulunamadı');
  assert.ok(/class="boot-splash"/.test(m[1]));
  assert.ok(/boot-ring/.test(m[1]) && /boot-fail/.test(m[1]));
});

test('yükleme ekranı 20 sn sonra "yüklenemedi" durumuna geçiyor ve yenileme düğmesi var', () => {
  assert.ok(/className\+=' failed'[\s\S]{0,40}20000/.test(body), 'zaman aşımı betiği yok');
  assert.ok(/location\.reload\(\)/.test(body));
  assert.ok(/\.boot-splash\.failed \.boot-fail\{display:block\}/.test(css));
});

test('<noscript> mesajı var', () => {
  assert.ok(/<noscript>[\s\S]*JavaScript[\s\S]*<\/noscript>/.test(body));
});

test('klavye odağı: :focus-visible halkası var, metin kutularını ve fare tıklamasını etkilemiyor', () => {
  const m = /:where\(([^{]*)\):focus-visible\{([^}]*)\}/.exec(css);
  assert.ok(m, 'genel :focus-visible kuralı yok');
  assert.ok(/button/.test(m[1]) && /a\[href\]/.test(m[1]) && /\[role="tab"\]/.test(m[1]));
  assert.ok(/outline:2px solid/.test(m[2]));
  // fare kullanıcısının metin kutularında halka görmemesi için bunlar kapsamda OLMAMALI
  assert.ok(!/\binput\b(?!\[type)/.test(m[1].replace(/input\[type="[a-z]+"\]/g, '')), 'genel input seçicisi var');
  assert.ok(!/textarea|select/.test(m[1]));
});

test('hareketi azalt: işletim sistemi tercihinde animasyon ve geçişler kısalıyor', () => {
  assert.ok(/@media \(prefers-reduced-motion:reduce\)\{\s*\*,\*::before,\*::after\{[^}]*animation-duration:\.01ms!important[^}]*transition-duration:\.01ms!important/.test(css));
});

console.log(failed ? `\n${failed} kaldı` : '\nhepsi geçti');
process.exit(failed ? 1 : 0);
