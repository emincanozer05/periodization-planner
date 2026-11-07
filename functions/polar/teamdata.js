/* ═══════════════════════════════════════════════════════════════════════════
   POLAR — takımın Polar verisi (Wellness sekmesi → "Verileri al")

   Koçun bir takımındaki bütün Polar bağlantılarını ve son N günün verisini tek
   yanıtta döndürür: uyku, Nightly Recharge, günlük aktivite, antrenman, sürekli
   nabzın günlük özeti (`hr`: günün en düşük nabzı = RHR). `kinds` verilirse
   yalnızca o türler okunur (ör. RHR Takibi: ['hr','sleep'], 12 hafta).

   Sorgu yolu: doküman adları `coachUid__athleteId__YYYY-MM-DD…` biçiminde olduğu
   için her sporcu için ad ARALIĞI sorgusu yapılıyor (documentId >= … <= …). Bu
   yalnızca tek alanlı (ad) indeksi kullanır — ek bir Firestore indeksi gerekmez.
   Aralığın başı DOĞRULANMIŞ koç kimliğinden kuruluyor: başka bir hesabın
   verisine bu yoldan ulaşmak mümkün değil; ayrıca her doküman coachUid ile
   yeniden süzülüyor.

   Ham kayıt (`raw`) yanıta girmiyor: ekran yalnızca normalleştirilmiş alanları
   kullanıyor, yanıt küçük kalıyor.
   ═══════════════════════════════════════════════════════════════════════════ */
const { COL } = require('./config');
const { linkIdOf, LinkError, cleanAthleteId } = require('./links');
const { DATA_COL } = require('./sync');
const N = require('./normalize');

const DAY = 86400000;
const iso = ms => new Date(ms).toISOString().slice(0, 10);

const PICK = {
  sleep: ['date', 'sleepStart', 'sleepEnd', 'asleepSec', 'lightSec', 'deepSec', 'remSec', 'interruptionSec', 'sleepScore', 'continuity', 'sleepCharge', 'hrMin'],
  recharge: ['date', 'hrvMs', 'hrAvg', 'beatToBeatMs', 'breathingRate', 'ansCharge', 'nightlyRechargeStatus'],
  activity: ['date', 'steps', 'calories', 'activeCalories', 'durationSec'],
  exercises: ['exerciseId', 'date', 'startTime', 'durationSec', 'hrAvg', 'hrMax', 'calories', 'sport', 'detailedSport', 'trainingLoad', 'cardioLoad', 'zones'],
  hr: ['date', 'hrMin', 'hrMinAt', 'hrMax', 'hrAvg', 'samples'],
};
/* Okuma anında tamamlanan alan: bu alan eklenmeden önce yazılmış uyku dokümanlarında
   `hrMin` yok; ham kayıttaki nabız örneklerinden hesaplanır (içerik özeti değişmediği
   için senkron o dokümanı yeniden yazmıyor). */
const FILL = { sleep: x => (x.hrMin == null ? Object.assign({}, x, { hrMin: N.sleepHrMin(x.raw) }) : x) };
const KINDS = Object.keys(PICK);
const pick = (o, keys) => keys.reduce((a, k) => (a[k] = o[k] == null ? null : o[k], a), {});

/* Son senkronun özeti (ekranda "neden veri yok" açıklaması için): her veri türü
   için Polar'ın yanıtı — durum, kaç kayıt geldi, en yeni kaydın tarihi, hata kodu. */
function reportOf(rep) {
  if (!rep || typeof rep !== 'object') return null;
  const out = {};
  for (const k of ['sleep', 'recharge', 'activity', 'exercises', 'hr']) {
    const r = rep[k];
    if (!r || typeof r !== 'object') continue;
    out[k] = { status: r.status || null, count: Number(r.count) || 0, latest: r.latest || null, code: r.code || null };
  }
  return out;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const MAX_SPAN_DAYS = 92;

/* Aralık: ya açık { from, to } (Wellness'ın seçili günü: from = to = o gün), ya da
   bugünden geriye { days } (sporcu grafikleri: 14 / 28 / 56). */
function rangeOf({ from, to, days }, now) {
  if (ISO.test(String(from || '')) && ISO.test(String(to || '')) && from <= to) {
    const span = (Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / DAY;
    if (span <= MAX_SPAN_DAYS) return { from, to, days: span + 1 };
  }
  const n = Math.min(90, Math.max(7, Math.round(Number(days) || 28)));
  // Polar tarihleri yerel gün; UTC'ye göre bir gün pay bırakılıyor (gece yarısı kayması).
  return { from: iso(now() - n * DAY), to: iso(now() + DAY), days: n };
}

/* deps: { db, docIdField, now } — docIdField: admin.firestore.FieldPath.documentId()
   opts: { coachUid, teamId, athleteId?, from?, to?, days?, kinds? } */
async function loadTeamData(deps, opts) {
  const { db, docIdField, now } = deps;
  const uid = cleanAthleteId(opts.coachUid);
  const tId = cleanAthleteId(opts.teamId);
  const onlyAth = opts.athleteId != null && opts.athleteId !== '' ? cleanAthleteId(opts.athleteId) : null;
  const { from, to, days: n } = rangeOf(opts, now);
  const want = Array.isArray(opts.kinds) ? KINDS.filter(k => opts.kinds.includes(k)) : [];
  const kinds = want.length ? want : KINDS;
  const ls = await db.collection(COL.LINKS).where('coachUid', '==', uid).get();
  const linkDocs = ls.docs.map(d => d.data() || {})
    .filter(l => l.coachUid === uid && l.teamId === tId && l.athleteId && (!onlyAth || String(l.athleteId) === onlyAth));
  const athletes = await Promise.all(linkDocs.map(async l => {
    const linkId = linkIdOf(uid, l.athleteId);
    const out = {
      athleteId: String(l.athleteId), athleteName: l.athleteName || '', status: l.status || 'none',
      connectedAt: l.connectedAt || null, lastSyncAt: l.lastSyncAt || null,
      lastSyncReport: reportOf(l.lastSyncReport),
      polarAccount: l.polarAccount && typeof l.polarAccount === 'object'
        ? { name: l.polarAccount.name || null, registeredAt: l.polarAccount.registeredAt || null } : null,
    };
    await Promise.all(kinds.map(async kind => {
      const q = await db.collection(DATA_COL[kind])
        .where(docIdField, '>=', `${linkId}__${from}`)
        .where(docIdField, '<=', `${linkId}__${to}`)
        .get();
      out[kind] = q.docs.map(d => d.data() || {})
        .filter(x => x.coachUid === uid && x.date && x.date >= from && x.date <= to)
        .map(x => pick(FILL[kind] ? FILL[kind](x) : x, PICK[kind]))
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    }));
    return out;
  }));
  return { from, to, days: n, athletes };
}

module.exports = { loadTeamData, LinkError };
