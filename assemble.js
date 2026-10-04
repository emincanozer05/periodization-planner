/* ═══════════════════════════════════════════════════════════════════════════
   BİRLEŞTİR — src/ altındaki parçalardan index.html'i üretir

   index.html 37 bin satırlık TEK dosyaydı. Kaynak artık src/ altında parçalara
   bölünmüş durumda; bu betik parçaları src/manifest.json'daki sırayla, araya hiçbir
   şey koymadan art arda yapıştırıp index.html'i yazıyor. Yani tarayıcıya giden
   kod, bölmeden önceki ile bayt bayt aynı: aynı tek betik, aynı genel kapsam.

   index.html ÜRETİLMİŞ bir dosya ama depoda duruyor: testler, yerelde doğrudan açma
   ve yayın hep onu okuyor. Bu yüzden düzenleme src/ altında yapılıyor ve ardından
   `node assemble.js` çalıştırılıyor. index.html'i elle düzenlersen bir sonraki
   birleştirmede ezilir; `node assemble.js --check` (CI'da çalışıyor) bunu yakalıyor.

   Çalıştırma:
     node assemble.js           src/ → index.html
     node assemble.js --check   index.html src/'den üretilmişle aynı mı (değiştirmez)
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const TARGET = path.join(__dirname, 'index.html');

function assembled() {
  const parts = JSON.parse(fs.readFileSync(path.join(SRC, 'manifest.json'), 'utf8'));
  return parts.map(p => fs.readFileSync(path.join(SRC, p), 'utf8')).join('');
}

function assemble() {
  fs.writeFileSync(TARGET, assembled());
}

function check() {
  const want = assembled();
  const have = fs.readFileSync(TARGET, 'utf8');
  if (want === have) return true;
  const a = want.split('\n'), b = have.split('\n');
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  console.error(
    `HATA index.html, src/ altından üretilenle aynı değil (ilk fark: index.html satır ${i + 1}).\n` +
    `     index.html üretilmiş bir dosya: düzenlemeyi src/ altında yap ve \`node assemble.js\` çalıştır.\n` +
    `     index.html'i elle değiştirdiysen, o değişikliği ilgili src/ parçasına taşı.`);
  return false;
}

module.exports = { assemble, assembled, check };

if (require.main === module) {
  if (process.argv.includes('--check')) {
    if (!check()) process.exit(1);
    console.log('index.html src/ ile aynı');
  } else {
    assemble();
    console.log('index.html yazıldı (' + JSON.parse(fs.readFileSync(path.join(SRC, 'manifest.json'), 'utf8')).length + ' parça)');
  }
}
