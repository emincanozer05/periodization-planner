/* ═══════════════════════════════════════════════════════════════════════════
   POLAR — takımın Polar verisi (Wellness sekmesi → "Verileri al")

   Koçun bir takımındaki bütün Polar bağlantılarını ve son N günün verisini tek
   yanıtta döndürür: uyku, Nightly Recharge, günlük aktivite, antrenman.

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

const DAY = 86400000;
const iso = ms => new Date(ms).toISOString().slice(0, 10);

const PICK = {
  sleep: ['date', 'sleepStart', 'sleepEnd', 'asleepSec', 'lightSec', 'deepSec', 'remSec', 'interruptionSec', 'sleepScore', 'continuity', 'sleepCharge'],
  recharge: ['date', 'hrvMs', 'hrAvg', 'beatToBeatMs', 'breathingRate', 'ansCharge', 'nightlyRechargeStatus'],
  activity: ['date', 'steps', 'calories', 'activeCalories', 'durationSec'],
  exercises: ['exerciseId', 'date', 'startTime', 'durationSec', 'hrAvg', 'hrMax', 'calories', 'sport', 'trainingLoad', 'cardioLoad', 'zones'],
};
const pick = (o, keys) => keys.reduce((a, k) => (a[k] = o[k] == null ? null : o[k], a), {});

/* deps: { db, docIdField, now } — docIdField: admin.firestore.FieldPath.documentId() */
async function loadTeamData(deps, { coachUid, teamId, days }) {
  const { db, docIdField, now } = deps;
  const uid = cleanAthleteId(coachUid);
  const tId = cleanAthleteId(teamId);
  const n = Math.min(90, Math.max(7, Math.round(Number(days) || 28)));
  // Polar tarihleri yerel gün; UTC'ye göre bir gün pay bırakılıyor (gece yarısı kayması).
  const from = iso(now() - n * DAY);
  const to = iso(now() + DAY);
  const ls = await db.collection(COL.LINKS).where('coachUid', '==', uid).get();
  const linkDocs = ls.docs.map(d => d.data() || {}).filter(l => l.coachUid === uid && l.teamId === tId && l.athleteId);
  const athletes = await Promise.all(linkDocs.map(async l => {
    const linkId = linkIdOf(uid, l.athleteId);
    const out = {
      athleteId: String(l.athleteId), athleteName: l.athleteName || '', status: l.status || 'none',
      connectedAt: l.connectedAt || null, lastSyncAt: l.lastSyncAt || null,
    };
    await Promise.all(Object.keys(PICK).map(async kind => {
      const q = await db.collection(DATA_COL[kind])
        .where(docIdField, '>=', `${linkId}__${from}`)
        .where(docIdField, '<=', `${linkId}__${to}`)
        .get();
      out[kind] = q.docs.map(d => d.data() || {})
        .filter(x => x.coachUid === uid && x.date && x.date >= from && x.date <= to)
        .map(x => pick(x, PICK[kind]))
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    }));
    return out;
  }));
  return { from, to, days: n, athletes };
}

module.exports = { loadTeamData, LinkError };
