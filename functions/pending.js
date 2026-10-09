/* ═══════════════════════════════════════════════════════════════════════════
   BEKLEYEN GÖNDERİMLER — HTTPS kapısının "hangi gönderimler işlenmemiş" kararı
   (saf mantık, Firebase'den bağımsız; testten doğrudan çağrılıyor)

   Bir gönderim işlenmiş sayılıyor:
     • wellness → sahiplenme damgası (`alertClaimedAt`) ya da `alertSent` varsa,
     • srpe     → `rpeRecordedAt` varsa.
   Tetikleyici çalıştıysa damga zaten basılmıştır; bu dosya yalnızca tetikleyicinin
   KAÇIRDIKLARINI seçiyor.
   ═══════════════════════════════════════════════════════════════════════════ */

// Bundan eski gönderim süpürülmüyor: aylar önce kalmış bir dokümanı bugün işlemenin
// faydası yok ve koçun gelen kutusu zaten 3 günden eskisini siliyor.
const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;
// Bildirim ancak gönderimden sonraki bu süre içinde anlamlı. Sonrası "geç": kayıt
// yazılıyor, telefon çalmıyor.
const PUSH_MAX_AGE_MS = 6 * 60 * 60 * 1000;
// Tek çağrıda bakılan en fazla doküman — koçun gelen kutusu işlenenleri sildiği için
// koleksiyon küçük kalıyor; bu, bir arızada bile çağrının süresini sınırlıyor.
const SWEEP_LIMIT = 500;

// Firestore Timestamp | Date | ISO | ms → ms (bilinmiyorsa null).
function ms(v) {
  if (v == null) return null;
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'number') return v;
  const t = Date.parse(String(v));
  return isNaN(t) ? null : t;
}

function isProcessed(d) {
  d = d || {};
  if (d.kind === 'wellness') return !!(d.alertClaimedAt || d.alertSent);
  if (d.kind === 'srpe') return !!d.rpeRecordedAt;
  return true;      // tanınmayan tür: işlenecek bir şey yok
}

/* İşlenecekler, ESKİDEN YENİYE: aynı sporcunun aynı günkü iki gönderimi varsa sonuncusu
   en son yazılsın. Zamanı bilinmeyen (sunucu damgası henüz inmemiş) en sona. */
function pickPending(rows, nowMs) {
  return (rows || [])
    .filter(r => r && r.data && !isProcessed(r.data))
    .filter(r => { const t = ms(r.data.at); return t == null || nowMs - t <= MAX_AGE_MS; })
    .sort((a, b) => {
      const ta = ms(a.data.at), tb = ms(b.data.at);
      return (ta == null ? Infinity : ta) - (tb == null ? Infinity : tb);
    });
}

function pushStillUseful(sub, nowMs) {
  const t = ms(sub && sub.at);
  return t == null || nowMs - t <= PUSH_MAX_AGE_MS;
}

/* Duran kayıt, gelen gönderimden kesin daha YENİ mi. Zamanlardan biri bilinmiyorsa
   hayır: bugünkü davranış (gelen yazar) korunuyor. */
function isNewer(existingAt, incomingAt) {
  const a = ms(existingAt), b = ms(incomingAt);
  return a != null && b != null && a > b;
}

module.exports = { MAX_AGE_MS, PUSH_MAX_AGE_MS, SWEEP_LIMIT, isProcessed, pickPending, pushStillUseful, isNewer, ms };
