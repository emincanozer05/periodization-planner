/* ═══════════════════════════════════════════════════════════════════════════
   PUSH GÖNDERİMİ — FCM Web Push

   Tek iş: hazırlanmış bir bildirimi verilen cihaz token'larına göndermek ve her
   cihaz için ne olduğunu geri söylemek. Kimin alacağına recipients.js, ne
   yazacağına wellness-alert.js karar veriyor; burası sadece taşıyıcı.

   Secret gerekmiyor ve bu kayda değer: function projenin varsayılan servis
   hesabıyla çalışıyor, admin SDK da FCM'e o kimlikle gidiyor. Yani kurulumda
   saklanacak, döndürülecek ya da sızdırılacak bir anahtar yok.
   ═══════════════════════════════════════════════════════════════════════════ */

// FCM tek istekte en fazla bu kadar token kabul ediyor.
const BATCH = 500;

/* Token'ın artık geçerli olmadığını söyleyen hatalar. Bunlar tekrar denemekle
   düzelmez — cihaz uygulamayı silmiş, bildirimi kapatmış ya da token dönmüştür.
   Karşılığı kaydı temizlemek: ölü token her sabah yeniden denenip her sabah
   yeniden hata üretmesin. */
const DEAD_TOKEN_ERRORS = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

/* Geçici hatalar — yalnızca bunlarda yeniden deneniyor. FCM bu durumlarda mesajı
   KABUL ETMEMİŞ oluyor, yani tekrar denemek aynı bildirimi ikinci kez gönderme
   riski taşımıyor. */
const RETRYABLE_ERRORS = new Set([
  'messaging/server-unavailable',
  'messaging/internal-error',
  'messaging/quota-exceeded',
  'messaging/unavailable',
  'messaging/unknown-error',
]);

const isDead = code => DEAD_TOKEN_ERRORS.has(code);
const isRetryable = code => RETRYABLE_ERRORS.has(code);

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/* Tek bir uyarının FCM mesajı.

   `tag`: aynı sporcunun aynı günkü uyarısı ikinci kez gelirse telefonda YENİ bir
   satır açmak yerine eskisinin üstüne yazsın diye. Farklı sporcular farklı tag
   taşıdığı için aynı sabah beş sporcu uyarı verirse beş ayrı bildirim duruyor —
   veri modeliyle aynı: 1 sporcu = 1 uyarı (Madde 8). Telefon bunları kendi
   isterse gruplar; birleştirmeyi biz yapmıyoruz.

   `fcmOptions.link`: bildirime tıklayınca açılacak adres. Uygulama bu adresteki
   `#alert=<id>` parçasını okuyup doğrudan sporcunun Wellness ekranını açıyor. */
function buildMessage(tokens, text, data, link) {
  return {
    tokens,
    data: Object.assign({}, data, { link }),
    webpush: {
      notification: {
        title: text.title,
        body: text.body,
        icon: '/logo-mark.png',
        badge: '/logo-mark.png',
        /* Aynı sporcunun aynı günkü bildirimi tek satırda güncelleniyor; farklı
           sporcular farklı tag taşıdığı için aynı sabah beş sporcu ayrı ayrı
           duruyor. Uyarı kaydı olmayan rutin bildirimde ad sporcu+tarihten
           türüyor — index.js `tag`'i her iki durumda da doldurup gönderiyor. */
        tag: data.tag || data.alertId,
        renotify: true,
        requireInteraction: false,
      },
      fcmOptions: { link },
      headers: {
        // Sabah uyarısı akşam ulaşmasın: cihaz bir gün kapalıysa bildirim düşer.
        TTL: '86400',
        Urgency: 'high',
      },
    },
  };
}

/* Gönder ve her token için sonucu döndür.

   Dönen: { results: [{token, ok, error}], dead: [token,…] }
     results → alert kaydına yazılıyor (Madde 15: sent / failed)
     dead    → push_tokens'tan silinecek kayıtlar

   Hiçbir hâlde exception ATMIYOR. Çağıran taraf (index.js) wellness verisini
   kurtarmakla yükümlü; push'un patlaması oradaki akışı durduramamalı (Madde 14). */
async function sendAlert(messaging, tokens, text, data, link) {
  const results = [];
  const dead = [];
  if (!tokens.length) return { results, dead };

  for (const group of chunk(tokens, BATCH)) {
    const msg = buildMessage(group, text, data, link);
    let res = null;
    let lastErr = null;

    // İki deneme arası bekleme. Geçici hata dışında hiç dönülmüyor.
    const waits = [500, 2000];
    for (let attempt = 0; ; attempt++) {
      try {
        res = await messaging.sendEachForMulticast(msg);
        break;
      } catch (e) {
        lastErr = e;
        const code = (e && e.code) || '';
        // İstek hiç ulaşmadıysa (ağ) ya da geçici sunucu hatasıysa bir daha dene.
        if (attempt >= waits.length || !(isRetryable(code) || !code)) break;
        await new Promise(r => setTimeout(r, waits[attempt]));
      }
    }

    if (!res) {
      // Tüm grup gitmedi — tek tek hata olarak işaretlenip kayda geçiyor.
      const message = String((lastErr && lastErr.message) || lastErr || 'FCM error');
      group.forEach(token => results.push({ token, ok: false, error: message }));
      continue;
    }

    res.responses.forEach((r, i) => {
      const token = group[i];
      if (r.success) {
        results.push({ token, ok: true });
        return;
      }
      const code = (r.error && r.error.code) || '';
      results.push({ token, ok: false, error: code || String((r.error && r.error.message) || 'unknown') });
      if (isDead(code)) dead.push(token);
    });
  }

  return { results, dead };
}

module.exports = { sendAlert, buildMessage, isDead, isRetryable, BATCH };
