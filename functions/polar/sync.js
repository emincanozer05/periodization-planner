/* ═══════════════════════════════════════════════════════════════════════════
   POLAR — veri senkronu (Aşama 2: manuel "Verileri Senkronize Et")

   Bir sporcunun Polar verisi ayrı koleksiyonlara yazılıyor; sporcunun kendi
   kaydına (team.athletes, nightLog…) DOKUNULMUYOR:
     polar_sleep/{link}__{tarih}        uyku
     polar_recharge/{link}__{tarih}     Nightly Recharge (HRV, gece nabzı, solunum, ANS)
     polar_exercises/{link}__{tarih}__{id}  antrenman (süre, nabız, bölgeler, enerji, yük)
     polar_activity/{link}__{tarih}     günlük aktivite (adım, kalori)
     polar_cardio_load/{link}__{tarih}  kardiyo yükü (cihaz destekliyorsa)
     polar_hr_daily/{link}__{tarih}     sürekli nabzın günlük özeti: günün en düşük
                                        nabzı (RHR), en yüksek ve ortalama nabız

   Tekrar önleme: doküman adı deterministik, içerik özeti (hash) aynıysa hiç
   yazılmıyor. Aynı senkron iki kez çalışırsa ikincisi sıfır yazım yapar.

   Transaction sırası (günlük aktivite): Polar'ın transaction modelinde commit
   edilen veri bir daha gelmez. Bu yüzden ÖNCE Firestore'a yazılıyor, yazım geri
   okunarak DOĞRULANIYOR, ANCAK ONDAN SONRA commit ediliyor. Yazım ya da doğrulama
   başarısızsa commit yok: transaction Polar'da açık kalır, süresi dolunca veri
   bir sonraki transaction'da yeniden gelir.

   Uyku, recharge, antrenman ve kardiyo yükü transaction'sız uç noktalardan:
   commit yok, aynı veri tekrar çekilebilir, kayıp riski yok.
   ═══════════════════════════════════════════════════════════════════════════ */
const { COL } = require('./config');
const { decrypt } = require('./crypto');
const { PolarError } = require('./api');
const { makeClient } = require('./client');
const N = require('./normalize');
const { linkIdOf, LinkError } = require('./links');
const { safe } = require('../ids');

const DATA_COL = {
  sleep: 'polar_sleep', recharge: 'polar_recharge', exercises: 'polar_exercises',
  activity: 'polar_activity', cardioLoad: 'polar_cardio_load', hr: 'polar_hr_daily',
};
const HR_RANGE_DAYS = 28;   // sürekli nabız: tek istekte en çok 28 gün (Polar'ın sınırı)
const HR_FALLBACK_DAYS = 7; // aralık ucu yoksa gün gün en çok bu kadar gün
const LOCK_MS = 90 * 1000;              // aynı sporcu için eşzamanlı ikinci senkron yok
const MANUAL_MIN_GAP_MS = 2 * 60 * 1000; // düğmeye art arda basılırsa Polar'ı yormayalım
const BATCH = 400;

/* Yalnızca değişen dokümanları yaz. Döner: { written, unchanged }. */
async function writeChanged(db, col, docs) {
  if (!docs.length) return { written: 0, unchanged: 0 };
  const refs = docs.map(d => db.collection(col).doc(d.id));
  const snaps = await db.getAll(...refs);
  const changed = docs.filter((d, i) => !(snaps[i].exists && (snaps[i].data() || {}).hash === d.data.hash));
  for (let i = 0; i < changed.length; i += BATCH) {
    const b = db.batch();
    for (const d of changed.slice(i, i + BATCH)) b.set(db.collection(col).doc(d.id), d.data);
    await b.commit();
  }
  return { written: changed.length, unchanged: docs.length - changed.length, ids: changed.map(d => d.id) };
}

/* Yazılan dokümanların gerçekten durduğunu geri okuyarak doğrula (commit öncesi). */
async function verifyWritten(db, col, docs) {
  if (!docs.length) return true;
  const snaps = await db.getAll(...docs.map(d => db.collection(col).doc(d.id)));
  return docs.every((d, i) => snaps[i].exists && (snaps[i].data() || {}).hash === d.data.hash);
}

function missingSummary(items) {
  const m = {};
  for (const it of items) for (const k of it.missing || []) m[k] = (m[k] || 0) + 1;
  return m;
}

/* Bir Polar kaydını Firestore dokümanına çevir. */
function docFor(ctx, kind, raw, norm, key) {
  const id = `${ctx.linkId}__${safe(key)}`;
  return {
    id,
    data: Object.assign({
      coachUid: ctx.coachUid, teamId: ctx.teamId, athleteId: ctx.athleteId, linkId: ctx.linkId,
      polarUserId: ctx.polarUserId, source: 'polar', kind,
    }, norm, { raw, hash: N.hashOf(raw), fetchedAt: ctx.now }),
  };
}

/* 404 / 403: bu veri türü bu kullanıcı ya da client için yok — hata değil, rapor. */
const unavailable = code => ({ status: 'unavailable', code, count: 0, written: 0 });

async function syncList(ctx, kind, path, listKeys, normFn, keyFn) {
  const r = await ctx.client.get(path);
  if (r.status === 404 || r.status === 403) return unavailable(r.status === 404 ? 'NOT_FOUND' : 'FORBIDDEN');
  if (r.status === 204 || r.json == null) return { status: 'ok', count: 0, written: 0, missing: {} };
  if (r.status < 200 || r.status >= 300) return { status: 'error', code: 'HTTP_' + r.status, count: 0, written: 0 };
  const items = N.listOf(r.json, listKeys);
  const docs = [];
  const norms = [];
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue;
    const norm = normFn(raw);
    const key = keyFn(norm);
    if (!key) continue;                       // tarihi / kimliği olmayan kayıt yazılmaz
    norms.push(norm);
    docs.push(docFor(ctx, kind, raw, norm, key));
  }
  const w = await writeChanged(ctx.db, DATA_COL[kind], docs);
  // Polar'ın gönderdiği en yeni kaydın tarihi: takım tablosu "bu gecenin verisi
  // henüz gelmedi / son uyku 03.11" diyebilsin. Kayıt yoksa alan hiç yazılmaz.
  const out = { status: 'ok', count: docs.length, written: w.written, missing: missingSummary(norms) };
  const latest = norms.map(n => n.date).filter(Boolean).sort().pop();
  if (latest) out.latest = latest;
  return out;
}

/* Sürekli nabız → günlük özet (en düşük / en yüksek / ortalama nabız).
   Önce aralık ucu (son 28 gün, tek istek); Polar onu kabul etmezse gün gün son 7 gün.
   Transaction'sız: aynı gün yeniden çekilebilir, içerik değişmediyse yazılmaz. Bugünün
   kaydı gün içinde büyür; özeti her senkronda yeniden hesaplanır. */
const isoDay = ms => new Date(ms).toISOString().slice(0, 10);
async function syncContinuousHr(ctx) {
  // Polar tarihleri sporcunun yerel günü; UTC'ye göre bir gün ileri pay (Türkiye UTC+3).
  const to = isoDay(ctx.now + 86400000);
  const from = isoDay(ctx.now - (HR_RANGE_DAYS - 2) * 86400000);
  let items = null;
  const r = await ctx.client.get(`/users/continuous-heart-rate?from=${from}&to=${to}`);
  if (r.status === 403) return unavailable('FORBIDDEN');
  if (r.status === 204) items = [];
  else if (r.status >= 200 && r.status < 300 && r.json != null) {
    items = r.json && Array.isArray(r.json.heart_rate_samples) ? [r.json] : N.listOf(r.json, ['heart_rates', 'heart-rates', 'days']);
  }
  if (items == null) {
    // Aralık ucu yok / reddedildi: gün gün (bugün dahil son N gün).
    items = [];
    let errors = 0, forbidden = false;
    for (let i = 0; i < HR_FALLBACK_DAYS; i++) {
      const d = isoDay(ctx.now - i * 86400000);
      const g = await ctx.client.get(`/users/continuous-heart-rate/${d}`);
      if (g.status === 403) { forbidden = true; break; }
      if (g.status === 204 || g.status === 404) continue;
      if (g.status < 200 || g.status >= 300 || !g.json) { errors++; continue; }
      items.push(Object.assign({ date: d }, g.json));
    }
    if (forbidden) return unavailable('FORBIDDEN');
    if (errors && !items.length) return { status: 'error', code: 'HR_FETCH', count: 0, written: 0 };
  }
  const docs = [], norms = [];
  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue;
    const norm = N.hrDaily(raw);
    if (!norm.date || !norm.samples) continue;
    norms.push(norm);
    docs.push(docFor(ctx, 'hr', raw, norm, norm.date));
  }
  const w = await writeChanged(ctx.db, DATA_COL.hr, docs);
  const out = { status: 'ok', count: docs.length, written: w.written, missing: missingSummary(norms) };
  const latest = norms.map(n => n.date).filter(Boolean).sort().pop();
  if (latest) out.latest = latest;
  return out;
}

/* Günlük aktivite: transaction → yaz → doğrula → commit. */
async function syncActivity(ctx) {
  const t = await ctx.client.post(`/users/${encodeURIComponent(ctx.polarUserId)}/activity-transactions`);
  if (t.status === 204) return { status: 'ok', count: 0, written: 0, missing: {}, committed: false };
  if (t.status === 404 || t.status === 403) return unavailable(t.status === 404 ? 'NOT_FOUND' : 'FORBIDDEN');
  if (t.status < 200 || t.status >= 300 || !t.json || !t.json['resource-uri']) {
    return { status: 'error', code: 'TRANSACTION_' + t.status, count: 0, written: 0 };
  }
  const txUrl = String(t.json['resource-uri']);
  const list = await ctx.client.get(txUrl);
  const urls = (list.json && Array.isArray(list.json['activity-log'])) ? list.json['activity-log'] : [];
  // Aynı gün için birden çok özet gelebilir (gün içinde güncellenir): en son oluşturulan kalır.
  const byDate = new Map();
  for (const u of urls) {
    const s = await ctx.client.get(String(u));
    if (s.status < 200 || s.status >= 300 || !s.json) {
      // Bir özet okunamadıysa commit ETME: o veri kaybolur.
      return { status: 'error', code: 'SUMMARY_' + s.status, count: 0, written: 0, committed: false };
    }
    const norm = N.activity(s.json);
    if (!norm.date) continue;
    const prev = byDate.get(norm.date);
    if (!prev || String(norm.created || '') >= String(prev.norm.created || '')) byDate.set(norm.date, { raw: s.json, norm });
  }
  const docs = [...byDate.values()].map(({ raw, norm }) => docFor(ctx, 'activity', raw, norm, norm.date));
  let w;
  try {
    w = await writeChanged(ctx.db, DATA_COL.activity, docs);
  } catch (e) {
    ctx.log('error', 'activity_write_failed_no_commit', { linkId: ctx.linkId, error: String((e && e.message) || e).slice(0, 200) });
    return { status: 'error', code: 'WRITE_FAILED', count: docs.length, written: 0, committed: false };
  }
  let ok = false;
  try { ok = await verifyWritten(ctx.db, DATA_COL.activity, docs); } catch (e) { ok = false; }
  if (!ok) {
    ctx.log('error', 'activity_verify_failed_no_commit', { linkId: ctx.linkId });
    return { status: 'error', code: 'VERIFY_FAILED', count: docs.length, written: w.written, committed: false };
  }
  const c = await ctx.client.put(txUrl);
  const committed = c.status >= 200 && c.status < 300;
  if (!committed) ctx.log('warn', 'activity_commit_failed', { linkId: ctx.linkId, status: c.status });
  const out = { status: committed ? 'ok' : 'error', count: docs.length, written: w.written, missing: missingSummary(docs.map(d => d.data)), committed };
  if (!committed) out.code = 'COMMIT_' + c.status;   // Firestore undefined kabul etmiyor: alan ya var ya yok
  return out;
}

/* GET /v3/users/{id}: hesabın adı ve kayıt tarihi. Doğum tarihi, kilo gibi alanlar
   SAKLANMIYOR — yalnızca hesabı tanımaya yetenler. */
async function fetchAccount(ctx) {
  const r = await ctx.client.get(`/users/${encodeURIComponent(ctx.polarUserId)}`);
  if (r.status < 200 || r.status >= 300 || !r.json || typeof r.json !== 'object') return null;
  const j = r.json;
  const name = [j['first-name'], j['last-name']].map(x => (x == null ? '' : String(x).trim())).filter(Boolean).join(' ').slice(0, 120);
  const reg = j['registration-date'] == null ? null : String(j['registration-date']).slice(0, 40);
  if (!name && !reg) return null;
  return { name: name || null, registeredAt: reg };
}

/* ── Kilit: aynı sporcu için tek senkron ──────────────────────────────────── */
async function acquire(db, linkRef, now, manual) {
  return db.runTransaction(async tx => {
    const s = await tx.get(linkRef);
    if (!s.exists) return { err: 'NOT_FOUND' };
    const l = s.data() || {};
    if (l.status !== 'active' || !l.polarUserId) return { err: 'NOT_ACTIVE', link: l };
    const t = now();
    if (Number(l.syncLockUntil) > t) return { err: 'SYNC_IN_PROGRESS' };
    if (manual && Number(l.lastSyncStartedAt) > t - MANUAL_MIN_GAP_MS) return { err: 'TOO_SOON', retryAt: Number(l.lastSyncStartedAt) + MANUAL_MIN_GAP_MS };
    tx.set(linkRef, { syncLockUntil: t + LOCK_MS, lastSyncStartedAt: t }, { merge: true });
    return { link: l };
  });
}

/* deps: { db, fetch, cfg, now, log, sleep } — opts: { coachUid, athleteId, manual } */
async function syncLink(deps, { coachUid, athleteId, manual }) {
  const { db, now } = deps;
  const log = deps.log || (() => {});
  const linkId = linkIdOf(coachUid, athleteId);
  const linkRef = db.collection(COL.LINKS).doc(linkId);
  const lock = await acquire(db, linkRef, now, manual);
  if (lock.err) { const e = new LinkError(lock.err); e.retryAt = lock.retryAt; throw e; }
  const l = lock.link;
  if (l.coachUid !== coachUid) { await linkRef.set({ syncLockUntil: null }, { merge: true }); throw new LinkError('NOT_FOUND'); }
  const pid = String(l.polarUserId);
  const report = {};
  const finish = async (fields) => {
    await linkRef.set(Object.assign({ syncLockUntil: null, updatedAt: now() }, fields), { merge: true });
  };

  let accessToken;
  try {
    const ts = await db.collection(COL.TOKENS).doc(pid).get();
    if (!ts.exists) throw new Error('no token');
    accessToken = decrypt((ts.data() || {}).enc, deps.cfg.tokenKey, pid);
  } catch (e) {
    await finish({ status: 'error', lastError: { code: 'TOKEN_UNAVAILABLE', at: now() }, lastSyncResult: { ok: false, at: now(), code: 'TOKEN_UNAVAILABLE' } });
    throw new LinkError('TOKEN_UNAVAILABLE');
  }

  const ctx = {
    db, now: now(), log, linkId, coachUid, athleteId, teamId: l.teamId || null, polarUserId: pid,
    client: makeClient({ fetch: deps.fetch, accessToken, sleep: deps.sleep, log }),
  };
  const steps = [
    ['sleep', () => syncList(ctx, 'sleep', '/users/sleep', ['nights'], N.sleep, n => n.date)],
    ['recharge', () => syncList(ctx, 'recharge', '/users/nightly-recharge', ['recharges'], N.recharge, n => n.date)],
    // Ad tarihle başlıyor: takım ekranı son N günü ad aralığıyla, ek indeks olmadan okuyor.
    ['exercises', () => syncList(ctx, 'exercises', '/exercises?zones=true', ['exercises'], N.exercise, n => (n.date && n.exerciseId ? `${n.date}__${n.exerciseId}` : null))],
    ['cardioLoad', () => syncList(ctx, 'cardioLoad', '/users/cardio-load/', ['cardio_load', 'cardio-load'], N.cardioLoad, n => n.date)],
    ['activity', () => syncActivity(ctx)],
    ['hr', () => syncContinuousHr(ctx)],
  ];
  try {
    for (const [kind, run] of steps) {
      try {
        report[kind] = await run();
      } catch (e) {
        if (e instanceof PolarError && e.code === 'UNAUTHORIZED') throw e;            // tüm senkronu durdur
        if (e instanceof PolarError && e.code === 'RATE_LIMITED') { report[kind] = { status: 'error', code: 'RATE_LIMITED', count: 0, written: 0 }; break; }
        report[kind] = { status: 'error', code: (e && e.code) || 'ERROR', count: 0, written: 0 };
        log('warn', 'sync_step_failed', { linkId, kind, code: e && e.code, error: String((e && e.message) || e).slice(0, 160) });
      }
    }
  } catch (e) {
    // 401: sporcu izni kaldırmış ya da token iptal. Bağlantı geçersiz işaretlenir;
    // koç panelde "Yeniden bağla" görür. Token artık işe yaramıyor, silinir.
    await db.collection(COL.TOKENS).doc(pid).delete().catch(() => {});
    await finish({ status: 'revoked', revokedAt: now(), lastError: { code: 'REVOKED', at: now() },
      lastSyncResult: { ok: false, at: now(), code: 'REVOKED' }, lastSyncReport: report });
    log('warn', 'sync_revoked', { linkId });
    throw new LinkError('REVOKED');
  }

  // Bağlı Polar hesabının sahibi (ad, Polar'a kayıt tarihi): koç doğru hesabın
  // bağlandığını görebilsin. Yalnızca bilgi — alınamazsa senkron etkilenmez.
  let account = null;
  if (!Object.values(report).some(r => r && r.code === 'RATE_LIMITED')) {
    try { account = await fetchAccount(ctx); } catch (e) { account = null; }
  }

  const kinds = Object.keys(report);
  const failed = kinds.filter(k => report[k].status === 'error');
  const ok = failed.length === 0;
  const t = now();
  const fields = { lastSyncReport: report, lastSyncResult: { ok, at: t, failed } };
  if (account) fields.polarAccount = account;
  if (ok) Object.assign(fields, { lastSyncAt: t, lastError: null });
  else fields.lastError = { code: 'SYNC_PARTIAL', at: t };
  await finish(fields);
  log('info', 'synced', { linkId, ok, failed, counts: kinds.reduce((o, k) => (o[k] = report[k].written || 0, o), {}) });
  return { ok, report, lastSyncAt: ok ? t : (l.lastSyncAt || null) };
}

module.exports = { syncLink, DATA_COL, MANUAL_MIN_GAP_MS, LOCK_MS };
