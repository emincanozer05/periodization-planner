/* ═══════════════════════════════════════════════════════════════════════════
   CoachOS — arka plan bildirimleri (service worker)

   Sekme kapalıyken gelen wellness uyarısını telefonun bildirim alanına düşüren
   parça. Uygulamanın geri kalanını hiç ilgilendirmiyor: burada ne önbellek var ne
   çevrimdışı mantığı — CoachOS'un kendi çevrimdışı çalışması Firestore'un
   IndexedDB kalıcılığıyla zaten hallediliyor ve bir "cache-first" worker, tek
   dosyalık 1.9 MB'lık uygulamanın güncellenmesini bozardı. Bu worker YALNIZCA
   bildirim taşıyor.

   Dosyanın KÖK dizinde durması zorunlu: bir service worker yalnızca kendi
   dizininin ve altının kapsamını alabiliyor, bildirimin ise sitenin tamamına
   ulaşması gerekiyor. Adı da sabit — Firebase SDK, kendisine bir worker
   verilmediğinde tam olarak `/firebase-messaging-sw.js` adresini arıyor.

   Bildirimin GÖSTERİLMESİ ve tıklanınca AÇILMASI için burada elle kod yok: mesaj
   bir `notification` gövdesiyle geldiği için FCM'in kendi worker'ı ikisini de
   yapıyor, tıklanınca da mesajdaki `fcm_options.link` adresini açıyor. Buraya bir
   `onBackgroundMessage` yazmak aynı uyarıyı İKİ kez gösterirdi.
   ═══════════════════════════════════════════════════════════════════════════ */

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
// Kendi yanındaki dosya — kökten değil göreli, çünkü uygulama bir alt dizinde de
// yayınlanabiliyor ve worker o durumda da kendi klasöründe duruyor.
importScripts('push-config.js');

try {
  firebase.initializeApp(self.COACHOS_FCM.firebase);
  // Çağrının kendisi worker'ı FCM'e bağlıyor; dönen nesneye burada ihtiyaç yok.
  firebase.messaging();
} catch (e) {
  // Yapılandırma okunamadıysa worker sessizce boş kalır: bildirim gelmez ama
  // uygulamanın geri kalanı bundan hiç etkilenmez.
}

/* Yeni worker'ın beklemeden devreye girmesi. Bildirim taşıyan bir worker'da
   "eski sürüm açık sekme kapanana kadar beklesin" davranışının bir faydası yok;
   aksine, uyarı biçimi değiştiğinde koçun telefonunda günlerce eski worker
   kalabiliyor. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
