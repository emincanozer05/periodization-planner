/* ═══════════════════════════════════════════════════════════════════════════
   CoachOS — arka plan bildirimleri (service worker)

   Sekme kapalıyken gelen wellness uyarısını telefonun bildirim alanına düşüren
   parça; ayrıca koç uygulamasının (index.html) ve uyarı sayfasının (alerts.html)
   ağ yokken de açılmasını sağlıyor.

   Önbellekleme "ÖNCE AĞ" çalışıyor: sayfa ve kendi dosyaları her zaman sunucudan
   isteniyor, kopya yalnızca ağ yokken (ya da ağ 5 saniyede yanıt vermeyince)
   veriliyor. Yani koç hiçbir zaman günlerce eski bir sürümde kalmıyor; kopya bir
   emniyet kemeri. Verinin kendisi (takvim, sporcular) zaten Firestore'un IndexedDB
   kalıcılığıyla çevrimdışı çalışıyor — bu worker yalnızca uygulamanın KABUĞUNU
   (sayfa + kütüphaneler + yazı tipleri) ağsız açılır kılıyor.

   Uyarı sayfasının ana ekrana kurulabilmesi için de tarayıcı, kapsamda `fetch`
   dinleyen bir worker arıyor; o da aşağıdaki dinleyicide.

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

/* ── Önbellek: `fetch` dinleyicisi ─────────────────────────────────────────
   Üç sınıf istek karşılanıyor, GERİ KALAN HER ŞEY (Firestore, Auth, API çağrıları,
   check-in formları, POST'lar) için `respondWith` ÇAĞRILMIYOR ve istek tarayıcının
   kendi yoluyla ağa gidiyor — sağlık verisinin geçtiği hiçbir istek önbelleğe girmiyor.

   1) Uyarı sayfası (alerts.html ve süsleri): ÖNCE AĞ, ağ yoksa kopya.
   2) Koç uygulaması (index.html, travel.html, simgeler, yazı tipleri, push-config,
      pain-body): ÖNCE AĞ; kopya varsa ve ağ APP_TIMEOUT_MS içinde yanıt vermezse
      kopya verilir (ağ isteği arkada sürüp kopyayı tazeliyor). Kopya yoksa ağ
      beklenir.
   3) Kütüphaneler (React, Chart.js, Firebase SDK, yazı tipi dosyaları — yalnızca
      LIB_HOSTS listesindeki adresler): kopya VARSA hemen o verilir, arkada tazelenir.
      Her açılışta 15 kütüphaneyi yeniden beklemiyoruz; sürümleri adreste yazılı. */
const SHELL = 'coachos-alerts-v1';
const APP = 'coachos-app-v1';
const LIBS = 'coachos-libs-v1';
const APP_TIMEOUT_MS = 5000;

const SHELL_FILES = ['alerts.html', 'alerts.webmanifest', 'logo-wordmark.png',
                     'logo-mark.png', 'icon-192.png', 'icon-512.png'];
// Koç uygulamasının kendi dosyaları. check-in / wellness / rpe formları bilerek yok.
const APP_FILES = ['', 'index.html', 'travel.html', 'manifest.webmanifest', 'push-config.js',
                   'pain-body.js', 'pain-body.bin', 'logo.png', 'logo-wordmark.png',
                   'logo-mark.png', 'fms-logo.png', 'body-model.png', 'icon-192.png',
                   'icon-512.png', 'icon-maskable-512.png'];

function relPath(url) {
  // Worker'ın KENDİ dizinine göre yol; dışındaysa null (uygulama alt dizinde de yayınlanabiliyor).
  if (url.origin !== self.location.origin) return null;
  const dir = self.location.pathname.replace(/[^/]*$/, '');
  if (!url.pathname.startsWith(dir)) return null;
  return url.pathname.slice(dir.length);
}
function isShell(url) {
  const r = relPath(url);
  return r !== null && SHELL_FILES.indexOf(r) >= 0;
}
function isApp(url) {
  const r = relPath(url);
  return r !== null && (APP_FILES.indexOf(r) >= 0 || r.startsWith('fonts/'));
}
function isLib(url) {
  if (url.protocol !== 'https:') return false;
  const h = url.hostname, p = url.pathname;
  return h === 'unpkg.com' || h === 'cdn.jsdelivr.net' || h === 'cdn.sheetjs.com' ||
         h === 'fonts.googleapis.com' || h === 'fonts.gstatic.com' ||
         (h === 'www.gstatic.com' && p.startsWith('/firebasejs/'));
}

// Yalnızca tam (200) yanıtlar saklanıyor: hata sayfası ya da kısmi içerik kopya olmasın.
function keep(cache, req, res) {
  if (res && res.status === 200) { cache.put(req, res.clone()).catch(() => {}); }
  return res;
}

async function networkFirst(event, req, cacheName, timeoutMs) {
  const cache = await caches.open(cacheName);
  const net = fetch(req).then(res => keep(cache, req, res));
  const hit = await cache.match(req, { ignoreSearch: true });
  if (!hit) return net;                          // emniyet kemeri yok: ağın sonucu ne ise o
  if (!timeoutMs) return net.catch(() => hit);
  event.waitUntil(net.catch(() => {}));          // zaman aşımı kazansa da tazeleme bitsin
  return Promise.race([
    net.catch(() => hit),
    new Promise(res => setTimeout(() => res(hit), timeoutMs)),
  ]);
}

async function libFirst(event, req) {
  const cache = await caches.open(LIBS);
  const hit = await cache.match(req.url);
  /* CORS kipinde isteniyor: opak (no-cors) yanıtlar önbellekte kotadan ~7 MB'lık
     yer tutuyor, 15 kütüphane bunu aşırıya götürürdü. CORS yanıtı, no-cors bir
     istek için de (script/stylesheet etiketi) geçerli bir yanıt. */
  const refresh = fetch(new Request(req.url, { mode: 'cors', credentials: 'omit' }))
    .then(res => keep(cache, req.url, res));
  if (hit) { event.waitUntil(refresh.catch(() => {})); return hit; }
  try { return await refresh; }
  catch (e) { return fetch(req); }               // CORS vermeyen sunucu: eskisi gibi, kopyasız
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (isShell(url)) {
    event.respondWith(networkFirst(event, req, SHELL, 0));
  } else if (isApp(url)) {
    event.respondWith(networkFirst(event, req, APP, APP_TIMEOUT_MS));
  } else if (isLib(url)) {
    event.respondWith(libFirst(event, req));
  }                                              // geri kalanı ağa, dokunulmadan
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
    const current = [SHELL, APP, LIBS];
    await Promise.all(names.filter(n => n.startsWith('coachos-') && current.indexOf(n) < 0)
      .map(n => caches.delete(n)));
  } catch (e) {}
  await self.clients.claim();
})()));
