/* ═══════════════════════════════════════════════════════════════════════════
   HESABI SİL — KVKK m.7 / m.11 (docs/yayina-hazirlik-plani.md §4)

   Hesabın sahibi uygulamadan ister; bu function hesaba bağlı HER kaydı siler:
     • senkron verisi (kullanici_verileri, userId == uid) ve users/{uid}/** (günlük yedekler),
     • koçun yan koleksiyonları (check-in, antrenman günlüğü, ekip üyeleri, uyarılar, RPE…),
     • Polar: önce Polar'daki kayıt silinir (sporcunun izni Polar tarafında da kalkar),
       sonra token ve bütün Polar verisi,
     • yapay zekâ işleri, kilitleri, kullanım sayacı, bağlam önbelleği kaydı,
     • abonelik belgesi, Storage'daki users/{uid}/ klasörü,
     • en son Firebase Authentication hesabı.

   Sıra bilerek böyle: hesap en son silinir. Yarıda kalırsa (zaman aşımı, ağ) kullanıcı
   hâlâ girebilir ve aynı isteği tekrarlar; her adım "kalanı sil" olduğu için tekrar
   güvenli. Silinen kaydın sayısı, kişisel veri içermeyen bir iz kaydına yazılır
   (account_deletions/{uid'nin özeti}) — "silindi mi?" sorusunun kanıtı.

   Bilinen sınır: Gemini'deki bağlam önbelleği kendi süresi (saatler) dolunca silinir;
   burada yalnızca Firestore'daki kaydı silinir. */
const crypto = require('crypto');

/* [koleksiyon, uid'yi taşıyan alan]. Yeni bir koleksiyon hesaba bağlanırsa buraya eklenir;
   functions/test/account-delete.test.js listenin firestore.rules ile uyumunu da denetler. */
const BY_FIELD = [
  ['kullanici_verileri', 'userId'],
  ['checkin_links', 'coachUid'],
  ['checkins', 'coachUid'],
  ['lift_plans', 'coachUid'],
  ['lift_logs', 'coachUid'],
  ['staff_links', 'coachUid'],
  ['staff_members', 'coachUid'],
  ['alert_roster', 'coachUid'],
  ['push_tokens', 'uid'],
  ['push_tokens', 'coachUid'],
  ['wellness_alerts', 'coachUid'],
  ['rpe_reports', 'coachUid'],
  ['ai_generation_jobs', 'uid'],
  ['ai_generation_locks', 'uid'],
  ['ai_context_cache', 'uid'],
  ['polar_links', 'coachUid'],
  ['polar_tickets', 'coachUid'],
  ['polar_oauth_states', 'coachUid'],
  ['polar_users', 'coachUid'],
  ['polar_tokens', 'coachUid'],
  ['polar_sleep', 'coachUid'],
  ['polar_recharge', 'coachUid'],
  ['polar_exercises', 'coachUid'],
  ['polar_activity', 'coachUid'],
  ['polar_cardio_load', 'coachUid'],
  ['polar_hr_daily', 'coachUid'],
];
/* Belge adı doğrudan uid olanlar. */
const BY_ID = ['ai_usage', 'billing'];
/* Alt koleksiyonlarıyla birlikte silinenler. workspaces/{uid}: hesabın sahibi olduğu çalışma
   alanı (K3: çalışma alanı kimliği = sahibin uid'i) ve içindeki her şey. */
const RECURSIVE = ['users', 'workspaces'];
/* Başka çalışma alanlarındaki üyelikler (kişi başka bir kulübe davetliyse): collection group. */
const GROUP_BY_FIELD = [['members', 'uid']];

const AUDIT_COL = 'account_deletions';
const RECENT_LOGIN_SEC = 15 * 60;
const PAGE = 400;

class DeleteError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

const auditId = uid => crypto.createHash('sha256').update('coachos-account:' + uid).digest('hex').slice(0, 40);

/* İsteği doğrula: oturum gerçek bir hesap mı (anonim değil), son 15 dakikada giriş
   yapılmış mı, onay metni hesabın e-postası mı. */
function checkRequest(auth, data, nowSec) {
  if (!auth || !auth.uid) throw new DeleteError('UNAUTHENTICATED', 'Oturum açman gerekiyor.');
  const tok = auth.token || {};
  if (tok.firebase && tok.firebase.sign_in_provider === 'anonymous')
    throw new DeleteError('UNAUTHENTICATED', 'Bu oturumla hesap silinemez.');
  const authTime = Number(tok.auth_time) || 0;
  if (!authTime || nowSec - authTime > RECENT_LOGIN_SEC)
    throw new DeleteError('REQUIRES_RECENT_LOGIN', 'Güvenlik için yeniden giriş yapman gerekiyor.');
  const want = String(tok.email || auth.uid).trim().toLowerCase();
  const got = String((data && data.confirm) || '').trim().toLowerCase();
  if (!got || got !== want) throw new DeleteError('CONFIRM_MISMATCH', 'Onay metni hesabın e-posta adresiyle aynı değil.');
}

/* Sorguya uyan belgeleri sayfa sayfa siler; silinen sayıyı döner. */
async function deleteWhere(db, col, field, uid) {
  let n = 0;
  for (;;) {
    const snap = await db.collection(col).where(field, '==', uid).limit(PAGE).get();
    if (snap.empty) return n;
    const b = db.batch();
    snap.docs.forEach(d => b.delete(d.ref));
    await b.commit();
    n += snap.size;
    if (snap.size < PAGE) return n;
  }
}

/* Polar'daki kayıtları kaldır (en iyi çaba): Polar'a ulaşılamasa da hesap silinir;
   sporcu izni Polar Flow'dan da kaldırabilir. Sonuç sayılır, log'a token girmez. */
async function deregisterPolar({ db, uid, deregister, decrypt, tokenKey, log }) {
  const r = { ok: 0, failed: 0 };
  if (!deregister || !decrypt || !tokenKey) return r;
  const snap = await db.collection('polar_tokens').where('coachUid', '==', uid).get();
  for (const d of snap.docs) {
    const t = d.data() || {};
    const pid = String(t.polarUserId || d.id);
    try {
      const accessToken = decrypt(t.enc, tokenKey, pid);
      await deregister({ accessToken, polarUserId: pid });
      r.ok++;
    } catch (e) {
      r.failed++;
      log('warn', 'account_delete_polar_failed', { code: e && e.code, status: e && e.status });
    }
  }
  return r;
}

/* deps: { db, auth (admin.auth()), bucket (admin.storage().bucket()), recursiveDelete,
           deregister?, decrypt?, tokenKey?, now, log } */
async function deleteAccount(authCtx, data, deps) {
  const { db, now } = deps;
  const log = deps.log || (() => {});
  checkRequest(authCtx, data, Math.floor(now() / 1000));
  const uid = authCtx.uid;
  const counts = {};

  counts.polarDeregistered = (await deregisterPolar(Object.assign({ uid, log }, deps))).ok;

  for (const [col, field] of BY_FIELD) {
    const n = await deleteWhere(db, col, field, uid);
    if (n) counts[col] = (counts[col] || 0) + n;
  }
  for (const col of BY_ID) {
    const ref = db.collection(col).doc(uid);
    const s = await ref.get();
    if (s.exists) { await ref.delete(); counts[col] = 1; }
  }
  for (const col of RECURSIVE) await deps.recursiveDelete(db.collection(col).doc(uid));
  for (const [group, field] of GROUP_BY_FIELD) {
    if (!db.collectionGroup) continue;
    /* Collection group sorgusu bir dizin ister (firestore.indexes.json → fieldOverrides).
       Dizin yoksa (yayımlanmamışsa) silme burada durmasın: hesap ve kendi verisi yine silinir,
       üyelik kalıntısı log'a yazılır. Ekip daveti (Faz 5) açılmadan dizin yayımlanmalı. */
    try {
      const snap = await db.collectionGroup(group).where(field, '==', uid).get();
      for (const d of snap.docs) await d.ref.delete();
      if (snap.size) counts['group:' + group] = snap.size;
    } catch (e) {
      counts['group:' + group] = 'failed';
      log('error', 'account_delete_group_failed', { group, code: e && e.code });
    }
  }

  let files = 0;
  if (deps.bucket) {
    const [list] = await deps.bucket.getFiles({ prefix: `users/${uid}/` });
    files = list.length;
    if (files) await deps.bucket.deleteFiles({ prefix: `users/${uid}/`, force: true });
  }
  counts.files = files;

  await db.collection(AUDIT_COL).doc(auditId(uid)).set({ deletedAt: now(), counts });
  try { await deps.auth.deleteUser(uid); }
  catch (e) { if (!(e && e.code === 'auth/user-not-found')) throw e; }
  log('info', 'account_deleted', { audit: auditId(uid), counts });
  return { deleted: true, counts };
}

module.exports = { deleteAccount, checkRequest, deleteWhere, auditId, DeleteError, BY_FIELD, BY_ID, RECURSIVE, GROUP_BY_FIELD, AUDIT_COL, RECENT_LOGIN_SEC };
