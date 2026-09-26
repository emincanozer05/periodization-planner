/* ═══════════════════════════════════════════════════════════════════════════
   İÇSEL YÜK (RPE) KAYDI — telefon sayfasının RPE sekmesi (saf mantık)

   Ekip üyesinin telefonu (alerts.html) sabahın wellness gönderimlerini
   `wellness_alerts` koleksiyonundan okuyor. Antrenman sonrası RPE gönderimleri ise
   hiçbir kalıcı yere yazılmıyordu: `checkins` dokümanı koçun tarayıcısında işlenip
   ~10 dakika sonra siliniyor ve ekip üyesi o koleksiyonu zaten okuyamıyor. Bu dosya
   aynı gönderimden `rpe_reports` kaydını kuruyor; function (index.js) onu yazıyor,
   telefon onu okuyor.

   Bildirim YOK: RPE bir uyarı değil, günün kaydı. Telefon çalmıyor, sayfa gösteriyor.

   Alan isimleri checkin.html'deki srpe payload'ına birebir bağlı:
     tpRPE / tpDuration      → top antrenmanı
     scRPE / scDuration      → kuvvet & kondisyon
     gameRPE / gameDuration  → müsabaka
   Sınırlar ve yük formülü index.html'deki mergeCheckins() ile AYNI: RPE 0-10,
   süre 0-400 dk, yük = RPE × süre. Telefonda yazan AU ile koçun ekranındaki AU
   farklı çıkmasın diye.
   ═══════════════════════════════════════════════════════════════════════════ */

function num(v) {
  if (v === null || v === undefined || v === '' || isNaN(Number(v))) return null;
  return Number(v);
}
function clamp(v, lo, hi) {
  const n = num(v);
  if (n == null) return null;
  return n < lo ? lo : (n > hi ? hi : n);
}

// Formdaki sırayla: top antrenmanı, kuvvet & kondisyon, müsabaka.
const SESSIONS = [
  { id: 'tp', rpe: 'tpRPE', dur: 'tpDuration' },
  { id: 'sc', rpe: 'scRPE', dur: 'scDuration' },
  { id: 'game', rpe: 'gameRPE', dur: 'gameDuration' },
];

/* Tek bir bölümün kaydı. Sporcunun o gün yapmadığı bölüm (RPE'si boş) hiç dönmüyor —
   ekranda boş bir satır, "0 dakika antrenman yaptı" gibi okunurdu. */
function sessionOf(payload, s) {
  const rpe = clamp(payload[s.rpe], 0, 10);
  if (rpe == null) return null;
  const duration = clamp(payload[s.dur], 0, 400);
  const load = rpe && duration ? Math.round(rpe * duration) : null;
  return { id: s.id, rpe, duration, load };
}

/* `rpe_reports` dokümanının gövdesi. */
function buildRpeRecord(sub, teamName) {
  const p = (sub && sub.payload) || {};
  const sessions = SESSIONS.map(s => sessionOf(p, s)).filter(Boolean);
  const total = sessions.reduce((a, s) => a + (s.load || 0), 0);
  const rpes = sessions.map(s => s.rpe);
  return {
    athleteId: (sub && sub.athleteId) || '',
    athleteName: ((sub && sub.athleteName) || '').trim(),
    teamId: (sub && sub.teamId) || '',
    teamName: String(teamName || '').trim(),
    date: (sub && sub.date) || '',
    sessions,
    totalLoad: total || null,
    // Listenin sırası buna bakıyor: günün en zorlandığı sporcu en üstte.
    maxRpe: rpes.length ? Math.max(...rpes) : null,
  };
}

module.exports = { buildRpeRecord, SESSIONS };
