/* ═══════════════════════════════════════════════════════════════════════════
   CoachOS — sunucu tarafı

   Tek iş var: sporcu wellness formunu gönderip `checkins` koleksiyonuna doküman
   düştüğünde, gönderim uyarı kriterlerini karşılıyorsa antrenör Telegram grubuna
   O SPORCUYA AİT tek bir mesaj atmak.

   Neden burada: Telegram bot token'ı frontend'de duramaz. Form (checkin.html) ve
   koç uygulaması (index.html) tamamen istemci tarafında çalışan statik sayfalar;
   token'ın tek güvenli yeri Firebase Secret Manager ve onu okuyabilen bu function.

   Neden 1. nesil (firebase-functions/v1): 2. nesil Firestore tetikleyicisinde
   function bölgesi ile veritabanı konumunun eşleşmesi gerekiyor. 1. nesil bunu
   dert etmiyor, secret desteği aynı — kurulumda bölge tahmin etmek zorunda
   kalmamak için bilinçli tercih.

   Mevcut akışa dokunmuyor: form aynı dokümanı aynı şekilde yazıyor, koçun
   tarayıcısı aynı dokümanı aynı şekilde işleyip siliyor. Buraya eklenen tek şey
   dokümanın üstündeki `telegramAlert*` damgaları.
   ═══════════════════════════════════════════════════════════════════════════ */

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { shouldAlert, buildMessage } = require('./wellness-alert');

admin.initializeApp();

/* Bot token'ı: Secret Manager. Koda, Firestore'a ve depoya asla yazılmaz.
   Kurulum:  firebase functions:secrets:set TELEGRAM_BOT_TOKEN              */
const TELEGRAM_BOT_TOKEN = 'TELEGRAM_BOT_TOKEN';

/* Grup kimliği gizli bir bilgi değil (mesaj atabilmek için token da gerekiyor),
   bu yüzden secret değil ortam değişkeni. Grup değişirse tek satır. */
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-1004420460025';

const TELEGRAM_API = 'https://api.telegram.org';

/* Tek bir sendMessage denemesi. Telegram 2xx dışında da JSON döndürüyor; hatanın
   sebebi loglara `description` alanıyla düşsün diye gövde her hâlükârda okunuyor. */
async function sendOnce(token, text) {
  const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });
  let body = null;
  try { body = await res.json(); } catch (e) { /* gövde JSON değilse durum kodu yeter */ }
  return { ok: res.ok && body && body.ok === true, status: res.status, body };
}

/* Gönderim + ölçülü yeniden deneme.

   YALNIZCA mesajın Telegram'a hiç ulaşmadığı kesin olan hâllerde tekrar deneniyor:
   ağ hatası, 5xx ve 429. 4xx (yanlış chat id, bot gruba ekli değil, hatalı HTML)
   tekrar denemekle düzelmez ve düzelmeyecek bir isteği tekrarlamak kuyruk şişirir.
   Böylece "retry" aynı mesajı ikinci kez GÖNDERMİŞ olma riski taşımıyor. */
async function sendTelegram(token, text) {
  const waits = [500, 2000];
  let last = null;
  for (let attempt = 0; ; attempt++) {
    let retryable = true;                       // ağ hatası: istek karşıya hiç varmadı
    try {
      const r = await sendOnce(token, text);
      if (r.ok) return r;
      last = new Error(`Telegram ${r.status}: ${(r.body && r.body.description) || 'bilinmeyen hata'}`);
      retryable = r.status >= 500 || r.status === 429;
    } catch (e) {
      last = e;
    }
    if (!retryable || attempt >= waits.length) throw last;
    await new Promise(res => setTimeout(res, waits[attempt]));
  }
}

/* ── Tetikleyici ─────────────────────────────────────────────────────────── */
exports.wellnessTelegramAlert = functions
  .runWith({
    secrets: [TELEGRAM_BOT_TOKEN],
    timeoutSeconds: 60,
    memory: '256MB',
    // Platform aynı olayı ikinci kez getirirse aşağıdaki "sahiplenme" işlemi
    // ikinci mesajı engelliyor; ayrıca otomatik yeniden denemeyi de açmıyoruz.
    failurePolicy: false,
  })
  .firestore.document('checkins/{checkinId}')
  .onCreate(async (snap, context) => {
    const sub = snap.data() || {};
    const id = context.params.checkinId;

    if (sub.kind !== 'wellness') return null;                   // sRPE bu işin dışında
    if (!shouldAlert(sub.payload || {})) {
      functions.logger.info('wellness: kriter karşılanmadı, mesaj yok', { checkinId: id });
      return null;
    }

    /* ── Çift mesaj koruması ──────────────────────────────────────────────
       Gönderimden ÖNCE dokümanı bir işlem (transaction) içinde sahipleniyoruz.
       Aynı olay ikinci kez işlenirse damga zaten duruyor olacağı için ikinci
       çalışma hiç mesaj atmadan çıkar. Damgayı gönderimden sonra atmak, iki
       çalışmanın aynı anda gönderim yapmasına kapı bırakırdı. */
    const ref = snap.ref;
    const claimed = await admin.firestore().runTransaction(async tx => {
      const cur = await tx.get(ref);
      if (!cur.exists) return false;                             // koç arada silmiş
      const d = cur.data() || {};
      if (d.telegramAlertSent || d.telegramAlertClaimedAt) return false;
      tx.update(ref, { telegramAlertClaimedAt: admin.firestore.FieldValue.serverTimestamp() });
      return true;
    });
    if (!claimed) {
      functions.logger.info('wellness: bu gönderim zaten işlenmiş, ikinci mesaj yok', { checkinId: id });
      return null;
    }

    const token = process.env[TELEGRAM_BOT_TOKEN];
    if (!token) {
      functions.logger.error('wellness: TELEGRAM_BOT_TOKEN tanımlı değil — mesaj gönderilemedi', { checkinId: id });
      return null;
    }

    try {
      await sendTelegram(token, buildMessage(sub));
      // Damga, wellness kaydının YANINA yazılıyor; kaydın kendisine dokunulmuyor.
      await ref.update({
        telegramAlertSent: true,
        telegramAlertSentAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      functions.logger.info('wellness: Telegram uyarısı gönderildi', {
        checkinId: id, athleteId: sub.athleteId, date: sub.date,
      });
    } catch (err) {
      /* Gönderim başarısız: check-in kaydına ASLA dokunulmuyor, silinmiyor.
         Sahiplenme damgası duruyor — aynı olay tekrar gelse bile ikinci mesaj
         atılmıyor. Hata loglarda `telegramAlertError` ile duruyor. */
      functions.logger.error('wellness: Telegram uyarısı gönderilemedi', {
        checkinId: id, athleteId: sub.athleteId, error: String((err && err.message) || err),
      });
      await ref.update({ telegramAlertError: String((err && err.message) || err) }).catch(() => {});
    }
    return null;
  });
