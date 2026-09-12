/* Bütün test dosyalarını yükleyip kuyruğu sırayla boşaltır, tek bir özet basar.
   Bir testin kalması işi (ve CI'daki deploy'u) durdurur — uyarı kuralının sahada
   sessizce yanlış çalışması, burada yüksek sesle patlamasından çok daha pahalı. */
const { run } = require('./harness');

require('./wellness-alert.test.js');   // Test 1-10 · eşik, formül, bildirim metni
require('./recipients.test.js');       // Test 11-13 · kim alıyor, kim almıyor
require('./idempotency.test.js');      // Test 14-15 · çift gönderim, ayrı kayıtlar
require('./push.test.js');             // Madde 14-15 · gönderim ve teslim durumu

run();
