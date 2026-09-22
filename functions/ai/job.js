/* ═══════════════════════════════════════════════════════════════════════════
   PROGRAM ÜRETİM İŞİ — arka planda, sunucuda (Madde 6, 7, 18, 19, 21)

   Akış:
     Uygulama   → ai_generation_jobs/{id}  (status: QUEUED, istek, kimlikler)
     Bu dosya   → işi sahiplen (transaction) → aktif üretim kilidi → AI Router
                → şema/bütünlük/kütüphane → CoachOS Kural Denetleyicisi (uygulama
                  sonucu aynı doküman üzerinden bildirir) → COMPLETED / FAILED
     Uygulama   → yalnızca COMPLETED + doğrulama PASS + yazılmamış iş için kaydeder

   Uygulama bu işi YÜRÜTMEZ; başlatır ve dokümanı dinler. Gemini anahtarı yalnızca
   bu function'ın ortamında (Secret Manager) durur.

   ÇİFT ÜRETİM KORUMASI üç katman:
     1) generationJobId — her kullanıcı eylemi tek, rastgele bir doküman kimliği;
        aynı kimlikle ikinci bir oluşturma Firestore kuralında reddedilir.
     2) Sahiplenme — tetikleyici "en az bir kez" çalışır; iş QUEUED değilse ikinci
        çalışma hiçbir şey yapmadan çıkar.
     3) Aktif üretim kilidi — aynı hesap + sporcu + gün + kaynak seans için süresi
        dolmamış bir iş varken gelen ikinci iş DUPLICATE_ACTIVE_GENERATION ile
        kapanır, model hiç çağrılmaz.

   BAŞARISIZLIKTA mevcut takvim ve mevcut taslak DEĞİŞMEZ: bu dosya takvime hiç
   yazmıyor; yazım, uygulamada, ancak COMPLETED bir işin sonucu için ve iş başına
   bir kez yapılabiliyor (calendarWriteStatus: pending → claimed → written).
   ═══════════════════════════════════════════════════════════════════════════ */
const crypto = require('crypto');
const C = require('./config');
const { runGeneration, STATUS } = require('./router');
const { validateStructure } = require('./validate');
const cache = require('./context-cache');

const COL_JOBS = 'ai_generation_jobs';
const COL_LOCKS = 'ai_generation_locks';
const COL_USAGE = 'ai_usage';

const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
const lockIdFor = j => sha([j.uid, j.athleteId, j.date, j.srcKey].join('|')).slice(0, 40);

/* İsteğin kendisi — sunucu, istemcinin gönderdiğine körü körüne güvenmez. */
function checkRequest(j, cfg) {
  const c = cfg || C;
  if (!j || typeof j !== 'object') return 'BAD_REQUEST';
  if (typeof j.uid !== 'string' || !j.uid) return 'BAD_REQUEST';
  if (typeof j.athleteId !== 'string' || !j.athleteId) return 'BAD_REQUEST';
  if (typeof j.srcKey !== 'string' || !j.srcKey) return 'BAD_REQUEST';
  if (typeof j.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(j.date)) return 'BAD_REQUEST';
  const r = j.request || {};
  if (typeof r.system !== 'string' || !r.system.trim() || r.system.length > c.MAX_SYSTEM_CHARS) return 'BAD_REQUEST';
  if (typeof r.user !== 'string' || !r.user.trim() || r.user.length > c.MAX_USER_CHARS) return 'REQUEST_TOO_LARGE';
  if (j.libraryIndex != null && (!Array.isArray(j.libraryIndex) || j.libraryIndex.length > 20000)) return 'BAD_REQUEST';
  return null;
}

function sanitizeGeneration(g, cfg) {
  const c = cfg || C;
  const x = g || {};
  return {
    maxOutputTokens: Math.max(256, Math.min(Number(x.maxOutputTokens) || 10000, c.MAX_OUTPUT_TOKENS)),
    temperature: Number.isFinite(Number(x.temperature)) ? Math.max(0, Math.min(Number(x.temperature), 1)) : 0.7,
    json: x.json !== false,
    thinkingBudget: x.thinkingBudget != null ? Number(x.thinkingBudget) || 0 : 0,
  };
}

/* Sahiplenme + kilit + hesap sınırı, TEK transaction içinde. */
async function claimJob({ db, ref, now, cfg }) {
  const c = cfg || C;
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { claimed: false, reason: 'MISSING' };
    const job = snap.data() || {};
    if (job.status !== STATUS.QUEUED) return { claimed: false, reason: 'ALREADY_CLAIMED' };
    const t = now();
    const bad = checkRequest(job, c);
    if (bad) {
      tx.update(ref, { status: STATUS.FAILED, errorCode: bad, completedAt: t, updatedAt: t,
        validationStatus: 'not_run', calendarWriteStatus: 'not_written' });
      return { claimed: false, reason: bad, failed: true, job };
    }
    const lockRef = db.collection(COL_LOCKS).doc(lockIdFor(job));
    const usageRef = db.collection(COL_USAGE).doc(job.uid);
    const [lockSnap, usageSnap] = [await tx.get(lockRef), await tx.get(usageRef)];
    const lock = lockSnap.exists ? (lockSnap.data() || {}) : null;
    if (lock && lock.jobId !== ref.id && Number(lock.expiresAt) > t) {
      tx.update(ref, { status: STATUS.FAILED, errorCode: 'DUPLICATE_ACTIVE_GENERATION', duplicateOf: lock.jobId,
        completedAt: t, updatedAt: t, validationStatus: 'not_run', calendarWriteStatus: 'not_written', totalAiCalls: 0 });
      return { claimed: false, reason: 'DUPLICATE_ACTIVE_GENERATION', failed: true, job };
    }
    const u = usageSnap.exists ? (usageSnap.data() || {}) : {};
    const fresh = !(Number(u.jobsWindowStart) > t - 3600 * 1000);
    const jobsInWindow = fresh ? 0 : Number(u.jobs) || 0;
    if (jobsInWindow >= c.JOBS_PER_HOUR) {
      tx.update(ref, { status: STATUS.FAILED, errorCode: 'RATE_LIMITED_USER', completedAt: t, updatedAt: t,
        validationStatus: 'not_run', calendarWriteStatus: 'not_written', totalAiCalls: 0 });
      return { claimed: false, reason: 'RATE_LIMITED_USER', failed: true, job };
    }
    tx.set(lockRef, { jobId: ref.id, uid: job.uid, athleteId: job.athleteId, expiresAt: t + c.LOCK_TTL_MS });
    tx.set(usageRef, { jobs: jobsInWindow + 1, jobsWindowStart: fresh ? t : u.jobsWindowStart }, { merge: true });
    tx.update(ref, {
      status: STATUS.GENERATING, claimedAt: t, startedAt: t, updatedAt: t, deadlineAt: t + c.MAX_JOB_DURATION_MS,
      sessionId: job.srcKey,
      totalAiCalls: 0, attemptCount: 0, currentModel: null, fallbackUsed: false, regenerationUsed: 0,
      validationStatus: 'pending', calendarWriteStatus: 'not_written', errorCode: null,
    });
    return { claimed: true, job, startedAt: t };
  });
}

async function releaseLock({ db, job, jobId }) {
  const lockRef = db.collection(COL_LOCKS).doc(lockIdFor(job));
  try {
    await db.runTransaction(async tx => {
      const s = await tx.get(lockRef);
      if (s.exists && (s.data() || {}).jobId === jobId) tx.delete(lockRef);
    });
  } catch (e) { /* kilit TTL ile kendiliğinden düşer */ }
}

/* Anahtarın model listesi — 10 dakika bellekte. Üretim çağrısı değil. */
let modelsCache = { at: 0, ids: null };
async function availableModels(gemini, apiKey, now) {
  const t = now();
  if (modelsCache.ids && t - modelsCache.at < 10 * 60 * 1000) return modelsCache.ids;
  const ctrl = new AbortController();
  const tm = setTimeout(() => ctrl.abort(), 5000);
  let list = null;
  try { list = await gemini.listModels({ apiKey, signal: ctrl.signal }); } finally { clearTimeout(tm); }
  if (!list || !list.size) return null;       // okunamadı → gerçek çağrının hatasından karar verilir
  modelsCache = { at: t, ids: new Set(list.keys()) };
  return modelsCache.ids;
}
function _resetModelsCache() { modelsCache = { at: 0, ids: null }; }

/* Dokümanı dinler; en son hâli tutar ve bir koşul sağlanana dek bekletir. */
function watchDoc(ref) {
  let latest = null;
  const waiters = new Set();
  const unsub = ref.onSnapshot(s => {
    latest = s.exists ? (s.data() || {}) : null;
    for (const w of [...waiters]) if (latest && w.pred(latest)) { waiters.delete(w); clearTimeout(w.t); w.res(latest); }
  }, () => {});
  return {
    get: () => latest,
    waitFor(pred, ms) {
      if (latest && pred(latest)) return Promise.resolve(latest);
      return new Promise(res => {
        const w = { pred, res, t: setTimeout(() => { waiters.delete(w); res(null); }, Math.max(0, ms)) };
        waiters.add(w);
      });
    },
    stop() { try { unsub(); } catch (e) {} for (const w of waiters) { clearTimeout(w.t); w.res(null); } waiters.clear(); },
  };
}

/* Kullanıcıya gösterilecek hata ayrıntısı: teknik yığın izi yok, yalnızca
   doğrulayıcının maddeleri. */
const failureDetail = v => (v && v.status === 'fail')
  ? { stage: v.stage || null, errors: (v.errors || []).slice(0, 8).map(e => String((e && e.text) || e).slice(0, 300)) }
  : null;

async function processJob(deps) {
  const { db, ref, gemini } = deps;
  const cfg = Object.assign({}, C, deps.config || {});
  const now = deps.now || (() => Date.now());
  const log = deps.log || (() => {});
  const jobId = ref.id;

  const claim = await claimJob({ db, ref, now, cfg });
  if (!claim.claimed) {
    log('info', 'ai_job_not_claimed', { generationJobId: jobId, reason: claim.reason,
      athleteId: claim.job && claim.job.athleteId, sessionId: claim.job && claim.job.srcKey });
    return { claimed: false, reason: claim.reason };
  }
  const job = claim.job;
  const base = { generationJobId: jobId, athleteId: job.athleteId, sessionId: job.srcKey, date: job.date };
  const apiKey = deps.apiKey;
  if (!apiKey) {
    await ref.update({ status: STATUS.FAILED, errorCode: 'SERVER_NOT_CONFIGURED', completedAt: now(), updatedAt: now(),
      validationStatus: 'not_run', calendarWriteStatus: 'not_written' });
    await releaseLock({ db, job, jobId });
    log('error', 'ai_job_no_api_key', base);
    return { claimed: true, ok: false, errorCode: 'SERVER_NOT_CONFIGURED' };
  }

  const watch = (deps.watchDoc || watchDoc)(ref);
  let round = 0;
  let result;
  try {
    const available = deps.availableModels !== undefined ? deps.availableModels
      : await availableModels(gemini, apiKey, now);
    const system = job.request.system;
    const generation = sanitizeGeneration(job.request.generation, cfg);
    result = await runGeneration({
      config: cfg,
      startedAt: claim.startedAt,
      now,
      sleep: deps.sleep,
      setTimer: deps.setTimer,
      clearTimer: deps.clearTimer,
      availableModels: available,
      request: { system, messages: [{ role: 'user', content: job.request.user }], generation },
      isCancelled: () => !!((watch.get() || {}).cancelRequested),
      log: e => log(e.event === 'ai_call_error' ? 'warn' : 'info', e.event, Object.assign({}, base, e)),
      onState: async patch => {
        await ref.update(Object.assign({}, patch, { updatedAt: now() })).catch(() => {});
      },
      callModel: async ({ model, messages, generation: gen, signal }) => {
        let cachedContent = null;
        if (cfg.CONTEXT_CACHE.enabled && claim.startedAt + cfg.MAX_JOB_DURATION_MS - now() > 30000) {
          cachedContent = await cache.getCachedContent({ db, gemini, apiKey, uid: job.uid, model, system, now, cfg: cfg.CONTEXT_CACHE })
            .catch(() => null);
        }
        try {
          return await gemini.generate({ apiKey, model, system, messages, generation: gen, signal, cachedContent, now });
        } catch (e) {
          if (e && e.cacheRejected) await cache.invalidate({ db, gemini, apiKey, uid: job.uid, model, system }).catch(() => {});
          throw e;
        }
      },
      validate: async ({ text, model, callNo, deadline }) => {
        const s = validateStructure(text, { libraryIndex: job.libraryIndex });
        if (s.status !== 'pass') {
          await ref.update({ lastValidation: Object.assign({ callNo, model }, failureDetail(s)), updatedAt: now() }).catch(() => {});
          return s;
        }
        /* CoachOS Kural Denetleyicisi: aday uygulamaya verilir, validateProgram
           sonucu aynı dokümana yazılır. Bekleme iş süresinin içinde sayılır. */
        round++;
        await ref.update({ status: STATUS.VALIDATING, ruleCheckRound: round, updatedAt: now(),
          candidate: { round, text, model, callNo, at: now() } });
        const wait = Math.min(cfg.RULE_CHECK_WAIT_MS, deadline - now());
        const d = await watch.waitFor(x => !!(x.cancelRequested || (x.ruleCheck && x.ruleCheck.round === round)), wait);
        if (!d) return { status: 'abort', code: now() >= deadline ? 'JOB_DEADLINE' : 'RULE_CHECK_TIMEOUT' };
        if (d.cancelRequested) return { status: 'abort', code: 'CANCELLED' };
        const rc = d.ruleCheck;
        if (rc.status === 'pass') return { status: 'pass', stage: 'rules', errors: [] };
        const v = { status: 'fail', stage: 'rules',
          errors: (Array.isArray(rc.hard) ? rc.hard : []).slice(0, 20).map(x => ({ code: 'RULE', text: String(x).slice(0, 400) })) };
        if (!v.errors.length) v.errors.push({ code: 'RULE', text: 'CoachOS kural denetleyicisi programı reddetti.' });
        await ref.update({ lastValidation: Object.assign({ callNo, model }, failureDetail(v)), updatedAt: now() }).catch(() => {});
        return v;
      },
    });
  } catch (e) {
    result = { ok: false, status: STATUS.FAILED, errorCode: 'INTERNAL_ERROR', totalAiCalls: null };
    log('error', 'ai_job_internal_error', Object.assign({}, base, { error: String((e && e.message) || e).slice(0, 300) }));
  } finally {
    watch.stop();
  }

  const t = now();
  const metrics = {
    totalAiCalls: result.totalAiCalls, modelAttempts: result.modelAttempts || {}, currentModel: result.currentModel || null,
    attemptCount: result.attemptCount || 0, fallbackUsed: !!result.fallbackUsed, regenerationUsed: result.regenerationUsed || 0,
    skippedModels: result.skippedModels || [], history: (result.history || []).slice(0, 12),
  };
  // Doğrulama geçse bile son tarih aşıldıysa sonuç yazılmaz (Madde 19).
  if (result.ok && t > claim.startedAt + cfg.MAX_JOB_DURATION_MS) {
    result = Object.assign({}, result, { ok: false, status: STATUS.FAILED, errorCode: 'JOB_DEADLINE' });
  }
  if (result.ok) {
    await ref.update(Object.assign({}, metrics, {
      status: STATUS.COMPLETED, completedAt: t, updatedAt: t, errorCode: null,
      result: { text: result.text, model: result.model, round },
      validationStatus: 'pass', calendarWriteStatus: 'pending',
    }));
  } else {
    await ref.update(Object.assign({}, metrics, {
      status: result.status === STATUS.CANCELLED ? STATUS.CANCELLED : STATUS.FAILED,
      completedAt: t, updatedAt: t, errorCode: result.errorCode || 'UNKNOWN',
      validationStatus: result.lastValidation ? result.lastValidation.status : 'not_run',
      failure: failureDetail(result.lastValidation),
      calendarWriteStatus: 'not_written',
    })).catch(() => {});
  }
  await releaseLock({ db, job, jobId });
  log(result.ok ? 'info' : 'warn', 'ai_job_finished', Object.assign({}, base, {
    status: result.ok ? STATUS.COMPLETED : (result.status || STATUS.FAILED), errorCode: result.errorCode || null,
    selectedModel: result.model || result.currentModel || null, totalAiCalls: result.totalAiCalls,
    fallbackUsed: !!result.fallbackUsed, regenerationUsed: result.regenerationUsed || 0,
    validationResult: result.lastValidation ? result.lastValidation.status : null,
    elapsedMs: t - claim.startedAt,
  }));
  return Object.assign({ claimed: true }, result);
}

module.exports = {
  processJob, claimJob, releaseLock, checkRequest, sanitizeGeneration, lockIdFor, watchDoc,
  availableModels, _resetModelsCache, COL_JOBS, COL_LOCKS, COL_USAGE,
};
