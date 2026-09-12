/* ═══════════════════════════════════════════════════════════════════════════
   WELLNESS UYARISI — karar ve mesaj kurma (saf mantık, Firebase'den bağımsız)

   Buradaki her şey girdi→çıktı: tek bir `checkins` dokümanının payload'ından
   "Telegram'a gidecek mi, gidecekse metni ne" sorusunu cevaplıyor. Ağ, Firestore
   ve secret işleri index.js'te; bu dosya testten doğrudan çağrılabilsin diye ayrı.

   Alan isimleri checkin.html'deki forma birebir bağlı (payload() → satır 677):
     sleep / fatigue / soreness  → 1-5, 1 kötü 5 iyi
     RHR                         → dinlenik nabız, opsiyonel
     painMap                     → { 'Bölge': 1|2|3 }, 1 hafif · 2 orta · 3 yüksek
   ═══════════════════════════════════════════════════════════════════════════ */

// Uyarı eşiği ve ağrı şiddeti eşiği tek yerde dursun — kural iki dosyada
// tekrarlanmasın diye mesajın alt satırı da bu sabitlerden yazılıyor.
const WELLNESS_THRESHOLD = 3.5;      // bunun ALTI uyarıya aday
const PAIN_MIN_SEVERITY  = 2;        // orta (2) ve yüksek (3)

// Puan → renkli daire. Uygulamanın kendi wellness skalasıyla aynı yön: 1 kötü,
// 5 iyi. Ondalıklı skor (ör. 3.2) en yakın tam basamağa yuvarlanıp renklenir.
const SCORE_DOTS = { 1: '🔴', 2: '🟠', 3: '🟡', 4: '🟢', 5: '🔵' };

const SEV_LABEL = { 3: { dot: '🔴', word: 'Yüksek/Fazla' }, 2: { dot: '🟡', word: 'Orta' } };

function num(v) {
  if (v === null || v === undefined || v === '' || isNaN(Number(v))) return null;
  return Number(v);
}

/* Formdaki skorun ortalaması — checkin.html'deki readinessScore() ve index.html'deki
   mergeCheckins() ile AYNI formül: doldurulan skorların ortalaması, tek ondalık.
   Zorunlu olan uyku ve yorgunluk; kas ağrısı boş bırakılmışsa ortalamaya girmiyor. */
function overallWellness(payload) {
  const vals = ['sleep', 'fatigue', 'soreness'].map(k => num(payload && payload[k])).filter(v => v != null);
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

/* Şiddetine göre ayrılmış ağrı bölgeleri. Hafif (1) hiç dönmüyor: mesajda da,
   kararda da yeri yok. */
function painBySeverity(payload) {
  const pm = (payload && typeof payload.painMap === 'object' && payload.painMap) || {};
  const out = { 3: [], 2: [] };
  for (const raw of Object.keys(pm)) {
    const region = String(raw || '').trim();
    const sev = Math.round(num(pm[raw]) || 0);
    if (!region || !out[sev]) continue;
    out[sev].push(region);
  }
  return out;
}

/* Uyarı kriteri — İKİSİ BİRDEN:
     1) Overall Wellness < 3.5
     2) en az bir bölgede orta (2) ya da yüksek (3) ağrı
   Skor hesaplanamıyorsa (üç sorunun üçü de boş) uyarı yok: elde ölçüt yok. */
function shouldAlert(payload) {
  const score = overallWellness(payload);
  if (score == null || score >= WELLNESS_THRESHOLD) return false;
  const pain = painBySeverity(payload);
  return pain[3].length > 0 || pain[2].length > 0;
}

function dot(v) {
  const n = num(v);
  if (n == null) return '';
  const step = Math.min(5, Math.max(1, Math.round(n)));
  return SCORE_DOTS[step];
}
// 3 → "3/5", 3.2 → "3.2/5" — tam sayıda gereksiz ".0" durmasın.
function fmtScore(v) {
  const n = num(v);
  if (n == null) return null;
  return `${dot(n)} ${Number.isInteger(n) ? n : n.toFixed(1)}/5`;
}
// Telegram HTML modunda yalnız bu üçü kaçırılmak zorunda.
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* Telefonda tek bakışta okunacak mesaj. Sadece formda gerçekten cevaplanmış
   satırlar yazılıyor; boş bırakılan soru mesajda hiç görünmüyor. */
function buildMessage(sub) {
  const p = (sub && sub.payload) || {};
  const score = overallWellness(p);
  const pain = painBySeverity(p);
  const lines = [];

  lines.push('🔴 <b>WELLNESS ALERT</b>');
  lines.push('');
  lines.push(`<b>${esc((sub && sub.athleteName) || 'İsimsiz sporcu')}</b>`);
  lines.push('');
  lines.push(`Antrenmana Hazır Oluşluk: ${fmtScore(score)}`);

  if (pain[3].length || pain[2].length) {
    lines.push('');
    lines.push('Ağrı Durumu:');
    for (const sev of [3, 2]) {
      if (pain[sev].length) lines.push(`${SEV_LABEL[sev].dot} ${esc(pain[sev].join(', '))}`);
    }
  }

  lines.push('');
  const sleep = fmtScore(p.sleep);   if (sleep) lines.push(`Uyku Kalitesi: ${sleep}`);
  const fat   = fmtScore(p.fatigue); if (fat)   lines.push(`Yorgunluk: ${fat}`);
  const sore  = fmtScore(p.soreness);if (sore)  lines.push(`Kas Ağrısı: ${sore}`);
  const rhr   = num(p.RHR);          if (rhr != null) lines.push(`Dinlenik KAH: ${Math.round(rhr)} bpm`);

  lines.push('');
  lines.push(`Overall Wellness: ${fmtScore(score)}`);
  if (sub && sub.date) lines.push(`Tarih: ${esc(sub.date)}`);
  lines.push('');
  lines.push(`⚠️ Wellness &lt; ${WELLNESS_THRESHOLD} + Orta/Yüksek ağrı`);

  return lines.join('\n');
}

module.exports = {
  WELLNESS_THRESHOLD, PAIN_MIN_SEVERITY,
  overallWellness, painBySeverity, shouldAlert, buildMessage,
};
