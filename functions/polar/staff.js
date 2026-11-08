/* ═══════════════════════════════════════════════════════════════════════════
   POLAR — ekip üyesinin telefon sayfası (alerts.html) için uyku verisi

   Ekip üyesi koçun hesabına giriş yapmıyor: telefonunda anonim bir Firebase
   oturumu var ve `staff_members/{uid}` kaydıyla koçun BİR takımına eşleşmiş
   (kuralları bkz. firestore.rules → staff_members). Polar koleksiyonları
   istemciye yalnızca hesabın sahibine açık; bu yüzden ekip üyesi Polar verisini
   bu sunucu yolundan alıyor:

     POST /staff-sleep  { from, to }    → takımın bağlı sporcularının uyku saatleri
     POST /staff-sync   { athleteId }   → o sporcunun Polar verisini Polar'dan çek

   Kapsam İSTEKTEN değil çağıranın eşleşme kaydından çıkıyor: coachUid ve teamId
   `staff_members/{uid}`'den okunuyor ve kaydın dayandığı ekip linki
   (`staff_links/{token}`) hâlâ duruyor ve aynı takımı gösteriyor mu diye yeniden
   bakılıyor — koç linki silince ekip üyesinin erişimi de bitiyor.

   Ekip üyesine yalnızca uyku SAATLERİ, süresi ve Polar uyku skoru gidiyor (yattı,
   kalktı, uyudu, skor); HRV, ANS, antrenman ve hesap bilgisi gitmiyor.
   ═══════════════════════════════════════════════════════════════════════════ */
const { LinkError, linkIdOf, cleanAthleteId } = require('./links');
const { COL } = require('./config');
const teamdata = require('./teamdata');

const STAFF_MEMBERS = 'staff_members';
const STAFF_LINKS = 'staff_links';

/* Çağıranın eşleştiği takım → { coachUid, teamId } ya da LinkError('NOT_STAFF'). */
async function staffScope(db, uid) {
  const id = String(uid || '');
  if (!id) throw new LinkError('NOT_STAFF');
  const ms = await db.collection(STAFF_MEMBERS).doc(id).get();
  const m = ms.exists ? (ms.data() || {}) : null;
  if (!m || !m.coachUid || !m.teamId || !m.token) throw new LinkError('NOT_STAFF');
  let token;
  try { token = cleanAthleteId(m.token); } catch (e) { throw new LinkError('NOT_STAFF'); }
  if (token.includes('/')) throw new LinkError('NOT_STAFF');
  const ls = await db.collection(STAFF_LINKS).doc(token).get();
  const l = ls.exists ? (ls.data() || {}) : null;
  if (!l || l.coachUid !== m.coachUid || l.teamId !== m.teamId) throw new LinkError('NOT_STAFF');
  return { coachUid: String(m.coachUid), teamId: String(m.teamId) };
}

const night = s => ({
  date: s.date || null,
  sleepStart: s.sleepStart || null,
  sleepEnd: s.sleepEnd || null,
  asleepSec: s.asleepSec == null ? null : s.asleepSec,
  sleepScore: s.sleepScore == null ? null : s.sleepScore,
});

async function loadSleep(deps, { uid, from, to }) {
  const sc = await staffScope(deps.db, uid);
  const r = await teamdata.loadTeamData(deps, { coachUid: sc.coachUid, teamId: sc.teamId, from, to, kinds: ['sleep'] });
  return {
    from: r.from, to: r.to,
    athletes: r.athletes.map(a => ({
      athleteId: a.athleteId, athleteName: a.athleteName, status: a.status, lastSyncAt: a.lastSyncAt,
      sleep: (a.sleep || []).map(night),
    })),
  };
}

/* Sporcunun bağlantısı çağıranın takımında mı? Değilse NOT_FOUND — başka takımın
   (ya da başka koçun) sporcusunun varlığı bu yoldan öğrenilemesin. */
async function checkAthlete(db, sc, athleteId) {
  const aId = cleanAthleteId(athleteId);
  const s = await db.collection(COL.LINKS).doc(linkIdOf(sc.coachUid, aId)).get();
  const l = s.exists ? (s.data() || {}) : null;
  if (!l || l.coachUid !== sc.coachUid || l.teamId !== sc.teamId) throw new LinkError('NOT_FOUND');
  return aId;
}

module.exports = { staffScope, loadSleep, checkAthlete, STAFF_MEMBERS, STAFF_LINKS };
