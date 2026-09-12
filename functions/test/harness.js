/* Testler için en küçük koşum takımı — bağımlılık yok, `npm test` ile çalışır.

   Neden bir test kütüphanesi değil: bu klasörde çalışan tek şey saf fonksiyonlar
   ve sahte nesneler. Jest/Mocha kurmak, deploy eden CI'ya yüzlerce paket ve bir
   yapılandırma dosyası ekliyor; kazandıracağı tek şey de aşağıdaki otuz satır.

   Testler ÇAĞRILDIĞINDA çalışmıyor, bir kuyruğa yazılıyor; run.js kuyruğu sırayla
   boşaltıyor. Sebebi async testler: doğrudan çalıştırılsalardı senkron testlerin
   arasına dağılıp çıktıyı okunmaz hale getirir, üstelik özet onlar bitmeden
   basılırdı — kalan bir test "geçti" diye raporlanabilirdi. */
const queue = [];
const results = { pass: 0, fail: 0 };

function section(name) {
  queue.push(async () => console.log('\n' + name));
}

function record(name, err) {
  if (!err) {
    results.pass++;
    console.log('  ✓ ' + name);
    return;
  }
  results.fail++;
  console.log('  ✗ ' + name);
  console.log('      ' + String((err && err.message) || err).split('\n').join('\n      '));
}

function t(name, fn) {
  queue.push(async () => {
    try { fn(); record(name, null); } catch (e) { record(name, e); }
  });
}

/* async testler için — sahte Firestore/FCM senaryoları transaction ve bekleme içeriyor. */
function ta(name, fn) {
  queue.push(async () => {
    try { await fn(); record(name, null); } catch (e) { record(name, e); }
  });
}

async function run() {
  for (const job of queue) await job();
  console.log(`\n${results.pass} test geçti, ${results.fail} test kaldı.`);
  if (results.fail) process.exitCode = 1;
}

module.exports = { section, t, ta, run, results };
