/* ═══════════════════════════════════════════════════════════════════════════
   CoachOS — arka plan bildirimleri (service worker)

   Sekme kapalıyken gelen wellness uyarısını telefonun bildirim alanına düşüren
   parça. Uygulamanın kendisi (index.html) bu worker'dan hiç etkilenmiyor: aşağıdaki
   `fetch` dinleyicisi ona dokunmuyor ve hiçbir isteğini önbelleğe almıyor —
   CoachOS'un çevrimdışı çalışması Firestore'un IndexedDB kalıcılığıyla zaten
   hallediliyor ve bir "cache-first" worker, tek dosyalık 1.9 MB'lık uygulamanın
   güncellenmesini bozardı.

   İki iş yapıyor: (1) bildirim taşımak, (2) uyarı sayfasının (alerts.html) ana
   ekrana kurulabilmesini sağlamak — tarayıcı bunun için kapsamda `fetch` dinleyen
   bir worker arıyor. İkincisinin kapsamı bilerek o sayfayla sınırlı.

   Dosyanın KÖK dizinde durması zorunlu: bir service worker yalnızca kendi
   dizininin ve altının kapsamını alabiliyor, bildirimin ise sitenin tamamına
   ulaşması gerekiyor. Adı da sabit — Firebase SDK, kendisine bir worker
   verilmediğinde tam olarak `/firebase-messaging-sw.js` adresini arıyor.

   Bildirimin GÖSTERİLMESİ ve tıklanınca AÇILMASI için burada elle kod yok: mesaj
   bir `notification` gövdesiyle geldiği için FCM'in kendi worker'ı ikisini de
   yapıyor, tıklanınca da mesajdaki `fcm_options.link` adresini açıyor. Buraya bir
   `onBackgroundMessage` yazmak aynı uyarıyı İKİ kez gösterirdi.
   ═══════════════════════════════════════════════════════════════════════════ */

/* Her importScripts AYRI AYRI korunuyor, ve bu önemli.

   Bir service worker betiği en üst seviyede hata atarsa worker 'redundant' olup
   HİÇ ETKİNLEŞMİYOR. Tarayıcı bunu sayfaya yalnızca dolaylı söylüyor:

     Failed to execute 'subscribe' on 'PushManager':
     Subscription failed - no active Service Worker

   Yani yayına çıkmamış tek bir dosya (ya da bir anlık ağ hatası), teşhisi
   imkânsıza yakın bir mesaja dönüşüyor. Korumalarla worker her hâlükârda
   etkinleşiyor; eksik olan varsa bunu getToken aşamasında adıyla öğreniyoruz. */
function load(src) {
  try { importScripts(src); return true; }
  catch (e) { return false; }
}

const SDK_OK =
  load('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js') &&
  load('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
// Kendi yanındaki dosya — kökten değil göreli, çünkü uygulama bir alt dizinde de
// yayınlanabiliyor ve worker o durumda da kendi klasöründe duruyor.
const CFG_OK = load('push-config.js');

try {
  if (SDK_OK && CFG_OK && self.COACHOS_FCM) {
    firebase.initializeApp(self.COACHOS_FCM.firebase);
    // Çağrının kendisi worker'ı FCM'e bağlıyor; dönen nesneye burada ihtiyaç yok.
    firebase.messaging();
  }
} catch (e) {
  // Yapılandırma okunamadıysa worker sessizce boş kalır: bildirim gelmez ama
  // uygulamanın geri kalanı bundan hiç etkilenmez.
}

/* ── Sayfanın gösterdiği bildirime tıklanması ──────────────────────────────
   Uygulama AÇIKKEN gelen bildirimi FCM'in worker'ı göstermiyor (görünür bir sekme
   varsa payload'ı sayfaya yollayıp çıkıyor), o yüzden o bildirimi sayfa kendisi
   gösteriyor. Sayfanın gösterdiği bildirim FCM'in kendi verisini taşımadığı için
   SDK'nın tıklama dinleyicisi ona hiç dokunmuyor — tıklanınca hiçbir şey olmuyordu.
   Karşılığı bu dinleyici.

   SDK'nın kendi bildirimlerine burada asla karışılmıyor: onun dinleyicisi bu
   dosyadan ÖNCE kuruluyor ve kendi bildirimlerinde stopImmediatePropagation()
   çağırıyor, yani buraya yalnızca bizim gösterdiklerimiz geliyor. Ayrıca aşağıdaki
   ilk satır da işareti olmayan her bildirimi elemesi için duruyor.

   GİDİLECEK YER, AÇIK OLAN SEKME DEĞİL, ADRESİN KENDİSİ.

   Burada eskiden aynı SUNUCUDAKİ ilk pencere öne alınıyordu, hangi sayfa olduğuna
   bakılmadan. Koçun telefonunda çoğu zaman check-in (anket) formu da açık
   duruyor ve uyarıya bastığında karşısına o çıkıyordu — "bildirime basınca beni
   ankete atıyor". Artık yalnızca bildirimin AÇMASI GEREKEN sayfa öne alınıyor;
   başka bir sayfa açıksa ona hiç dokunulmuyor (öylece gezinmek koçun uygulamada
   yaptığı işi de silerdi), bildirim kendi penceresinde açılıyor. */
self.addEventListener('notificationclick', event => {
  const data = (event.notification && event.notification.data) || {};
  const mark = data.coachosAlert;
  if (!mark) return;                       // FCM'in kendi bildirimi — onu SDK açıyor
  event.notification.close();
  /* Adres gelmediyse (kadro dokümanında uygulama adresi yoksa sunucu linksiz
     gönderiyor) bildirimin gitmesi gereken yer yine belli: worker'ın kendi
     dizinindeki uyarı sayfası. Tıklayınca hiçbir şey olmaması, buraya düşmekten
     kötü. */
  let target;
  try { target = new URL(String(data.link || '') || 'alerts.html', self.location.href); }
  catch (e) { target = new URL('alerts.html', self.location.href); }
  event.waitUntil((async () => {
    /* O sayfa zaten açıksa ikinci bir kopyası açılmıyor: sekme öne alınıp uyarının
       kimliği ona yollanıyor, gerisini sayfa kendisi yapıyor. Eşleşme YOL üzerinden
       (#alert=… gibi parçalar ve sorgu dizesi dışarıda): aynı sayfanın farklı bir
       uyarı için açılmış hâli de o sayfadır. */
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list) {
      let u;
      try { u = new URL(c.url, self.location.href); } catch (e) { continue; }
      if (u.origin !== target.origin || u.pathname !== target.pathname) continue;
      try { await c.focus(); } catch (e) { /* odaklanamadıysa mesaj yine gidiyor */ }
      c.postMessage(Object.assign({ coachos: 'alert-click' }, mark));
      return;
    }
    await self.clients.openWindow(target.href);
  })());
});

/* ── Kurulabilirlik: bir `fetch` dinleyicisi ───────────────────────────────
   Tarayıcı bir sayfayı ancak kapsamında `fetch` olayını dinleyen ETKİN bir
   service worker varken "yüklenebilir uygulama" sayıyor. Bu worker bugüne kadar
   yalnızca bildirim dinliyordu; alerts.html'in ana ekrana eklenememesinin —
   Chrome'un "Uygulamayı yükle" seçeneğini hiç göstermemesinin — iki sebebinden
   biri buydu (öteki manifestteki yanlış simge ölçüleri).

   Dinleyici KASITLI OLARAK neredeyse hiçbir şey yapmıyor. Uygulama tek dosyalık
   ~1.9 MB'lık bir index.html ve onu önbelleğe almak, koçun eline günlerce eski bir
   sürüm bırakırdı; o yüzden burada `respondWith` ÇAĞRILMIYOR — çağrılmayan istek
   tarayıcının kendi yoluna, yani ağa gidiyor ve hiçbir şey değişmiyor.

   Tek istisna, uyarı sayfasının çevrimdışı açılışı: ana ekrandan açılan bir
   uygulamanın ağ yokken bembeyaz bir hata sayfası göstermesi, kurulumun kendisini
   anlamsız kılıyor. Onun için ÖNCE AĞ denenip yanıt bir kopya olarak saklanıyor;
   yalnızca ağ tamamen yoksa saklanan kopya veriliyor. Yani sayfa her zaman
   sunucudaki sürüm, kopya da sadece bir emniyet kemeri. */
const SHELL = 'coachos-alerts-v1';
const SHELL_FILES = ['alerts.html', 'alerts.webmanifest', 'logo-wordmark.png',
                     'logo-mark.png', 'icon-192.png', 'icon-512.png'];

function isShell(url) {
  // Yalnızca worker'ın KENDİ dizinindeki uyarı sayfası ve süsleri. index.html
  // ve check-in formları bu listeye asla girmiyor.
  if (url.origin !== self.location.origin) return false;
  const dir = self.location.pathname.replace(/[^/]*$/, '');
  if (!url.pathname.startsWith(dir)) return false;
  return SHELL_FILES.indexOf(url.pathname.slice(dir.length)) >= 0;
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (!isShell(url)) return;                 // geri kalan her istek ağa, dokunulmadan
  event.respondWith((async () => {
    try {
      const fresh = await fetch(req);
      // Kopya sessizce tazeleniyor; başarısız olması isteği etkilemiyor.
      try { const c = await caches.open(SHELL); await c.put(req, fresh.clone()); } catch (e) {}
      return fresh;
    } catch (e) {
      const hit = await caches.match(req, { cacheName: SHELL, ignoreSearch: true });
      if (hit) return hit;
      throw e;
    }
  })());
});

/* Yeni worker'ın beklemeden devreye girmesi. Bildirim taşıyan bir worker'da
   "eski sürüm açık sekme kapanana kadar beklesin" davranışının bir faydası yok;
   aksine, uyarı biçimi değiştiğinde koçun telefonunda günlerce eski worker
   kalabiliyor. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil((async () => {
  // Eski sürümlerden kalan kabuk kopyaları temizleniyor; adları sürümle birlikte
  // değiştiği için bu, "eski bir uyarı sayfası geri geldi" ihtimalini kapatıyor.
  try {
    const names = await caches.keys();
    await Promise.all(names.filter(n => n.startsWith('coachos-alerts-') && n !== SHELL)
      .map(n => caches.delete(n)));
  } catch (e) {}
  await self.clients.claim();
})()));
