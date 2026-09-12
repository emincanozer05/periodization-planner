/* ═══════════════════════════════════════════════════════════════════════════
   CoachOS — Web Push yapılandırması

   Buradaki iki şey de GİZLİ DEĞİL: Firebase web yapılandırması ve VAPID açık
   anahtarı tarayıcıya zaten iniyor, ikisi de tek başına hiçbir yetki vermiyor.
   Bildirim GÖNDERME yetkisi yalnızca Cloud Function'da (sunucu tarafında) duruyor
   ve oraya asla bir istemciden ulaşılamıyor.

   Tek dosya olmasının sebebi: aynı değerleri üç yerin okuması gerekiyor —
   koçun uygulaması (index.html), ekip üyesinin sayfası (alerts.html) ve arka plan
   bildirimlerini karşılayan service worker (firebase-messaging-sw.js). Service
   worker bir <script> etiketi okuyamadığı için değerler bir dosyada duruyor ve
   worker onu importScripts ile alıyor.

   ── KURULUM ───────────────────────────────────────────────────────────────
   Aşağıdaki vapidKey'i bir kez doldurman gerekiyor:

     Firebase Console → ⚙ Project settings → Cloud Messaging sekmesi
     → "Web configuration" → Web Push certificates → Generate key pair
     → çıkan "Key pair" değerini (B… ile başlar) aşağıya yapıştır.

   Doldurulmadığı sürece uygulama bugünkü gibi çalışmaya devam eder; yalnızca
   bildirim açma düğmesi "kurulum tamamlanmamış" der ve kimse token kaydedemez.
   ═══════════════════════════════════════════════════════════════════════════ */
var COACHOS_FCM = {
  // ⬇ Firebase Console'dan alınan Web Push sertifikası (açık anahtar).
  vapidKey: 'BHRivluup0lAp37k6WfP5hXgiu9Y6Zi130jzrqC4NihKDwiijWJsAleKiTKe_VzdZUWKHmqUrlMP0Peaorkz6Og',

  // index.html ve checkin.html'deki yapılandırmanın aynısı.
  firebase: {
    apiKey: 'AIzaSyAwMvuHeiTmH3Y01d39kMgnzzV41SGk5cs',
    authDomain: 'periodization-planner.firebaseapp.com',
    projectId: 'periodization-planner',
    storageBucket: 'periodization-planner.firebasestorage.app',
    messagingSenderId: '225598184270',
    appId: '1:225598184270:web:a2b812983e298441df1c1f',
  },
};

// Service worker `importScripts` ile aldığında `self` üzerinden okuyor.
if (typeof self !== 'undefined') self.COACHOS_FCM = COACHOS_FCM;
