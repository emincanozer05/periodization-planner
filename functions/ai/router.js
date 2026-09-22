/* ═══════════════════════════════════════════════════════════════════════════
   AI ROUTER — program üretiminin tek karar noktası (Madde 10)

   Bu fonksiyon hangi modelin, kaçıncı kez, ne kadar beklenerek çağrılacağına
   karar verir ve BÜTÜN gerçek üretim çağrılarını tek sayaçta tutar. Dış dünyaya
   dokunmuyor: modeli çağıran (`callModel`), yanıtı doğrulayan (`validate`),
   saati okuyan (`now`), bekleyen (`sleep`) ve durumu yazan (`onState`) içeriden
   veriliyor. Böylece sahadaki davranış ile testteki davranış aynı koddan geçiyor.

   Kurallar, öncelik sırasıyla:
     1. Son tarih (MAX_JOB_DURATION_MS) — geçildiyse ya da bir çağrıya yetecek süre
        kalmadıysa yeni çağrı/retry/fallback/regeneration BAŞLATILMAZ.
     2. Global tavan (MAX_TOTAL_AI_CALLS) — model bütçesinden üstündür; 6. çağrıdan
        sonra 7.si hiçbir koşulda yapılmaz.
     3. Model bütçesi (MODEL_ATTEMPT_LIMITS) — ana model 3, yedekler 1 deneme.
     4. Hata türü — geçici hata ana modelde yeniden denenir; kalıcı hata ve
        "model yok" yeniden denenmez, sıradaki modele geçilir. Yedeklerde retry yok.
     5. Doğrulama — yanıt doğrulayıcıdan geçmezse EN FAZLA bir regeneration; o da
        tükendiyse bütçe izin verdikçe sıradaki yedek model.

   Fallback yalnızca motoru değiştirir (Madde 11, 14): her model AYNI sistem
   talimatını, AYNI sporcu girdisini ve AYNI doğrulayıcıyı görür. Regeneration'da
   eklenen tek şey, doğrulayıcının reddettiği maddelerin listesidir — kural seti,
   kütüphane, sporcu verisi ve kısıtlar değişmez.
   ═══════════════════════════════════════════════════════════════════════════ */
const C = require('./config');

const STATUS = Object.freeze({
  QUEUED: 'QUEUED',
  GENERATING: 'GENERATING',
  RETRYING: 'RETRYING',
  FALLBACK: 'FALLBACK',
  VALIDATING: 'VALIDATING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
});

const defaultSleep = (ms, signal) => new Promise(res => {
  const t = setTimeout(res, Math.max(0, ms));
  if (signal) signal.addEventListener('abort', () => { clearTimeout(t); res(); }, { once: true });
});

/* Regeneration için ek not: yalnızca doğrulayıcının söyledikleri. */
function feedbackText(errors) {
  const list = (errors || []).slice(0, 12).map(e => '- ' + String(e && (e.text || e.message || e) || '').slice(0, 300));
  return 'ÖNCEKİ YANIT CoachOS DOĞRULAYICISINDAN GEÇMEDİ. Aynı girdi, aynı kurallar ve aynı JSON şemasıyla '
    + 'programı YENİDEN yaz; aşağıdaki ihlallerin hiçbiri yeni yanıtta olmasın:\n' + list.join('\n');
}

function withFeedback(messages, feedback) {
  const base = (messages || []).map(m => Object.assign({}, m));
  if (!feedback) return base;
  for (let i = base.length - 1; i >= 0; i--) {
    if (base[i].role !== 'assistant' && base[i].role !== 'model' && typeof base[i].content === 'string') {
      base[i].content = base[i].content + '\n\n' + feedback;
      return base;
    }
  }
  base.push({ role: 'user', content: feedback });
  return base;
}

async function runGeneration(opts) {
  const cfg = Object.assign({}, C, opts.config || {});
  const chain = cfg.MODEL_CHAIN || [cfg.PRIMARY_MODEL, ...cfg.FALLBACK_MODELS];
  const limits = cfg.MODEL_ATTEMPT_LIMITS;
  const now = opts.now || (() => Date.now());
  const sleep = opts.sleep || defaultSleep;
  const onState = opts.onState || (async () => {});
  const log = opts.log || (() => {});
  const setTimer = opts.setTimer || ((fn, ms) => setTimeout(fn, ms));
  const clearTimer = opts.clearTimer || (t => clearTimeout(t));
  const startedAt = opts.startedAt != null ? opts.startedAt : now();
  const deadline = startedAt + cfg.MAX_JOB_DURATION_MS;
  const available = opts.availableModels || null;
  const isCancelled = opts.isCancelled || (() => false);

  const st = {
    totalAiCalls: 0,
    modelAttempts: {},
    transientRetries: {},
    regenerationUsed: 0,
    fallbackUsed: false,
    currentModel: null,
    history: [],
    lastError: null,
    lastValidation: null,
    skipped: [],
  };
  let idx = 0;
  let feedback = null;
  const announced = new Set();

  const snapshot = () => ({
    totalAiCalls: st.totalAiCalls,
    modelAttempts: Object.assign({}, st.modelAttempts),
    regenerationUsed: st.regenerationUsed,
    fallbackUsed: st.fallbackUsed,
    currentModel: st.currentModel,
    attemptCount: st.currentModel ? (st.modelAttempts[st.currentModel] || 0) : 0,
  });
  const finish = (ok, extra) => Object.assign({
    ok,
    history: st.history,
    skippedModels: st.skipped,
    lastValidation: st.lastValidation,
    elapsedMs: now() - startedAt,
  }, snapshot(), extra || {});
  const fail = (code, extra) => {
    log({ event: 'job_failed', code, totalAiCalls: st.totalAiCalls, elapsedMs: now() - startedAt });
    return finish(false, Object.assign({ errorCode: code, status: code === 'CANCELLED' ? STATUS.CANCELLED : STATUS.FAILED }, extra || {}));
  };

  for (;;) {
    if (isCancelled()) return fail('CANCELLED');
    if (idx >= chain.length) {
      return fail(st.lastValidation && st.lastValidation.status === 'fail' && (!st.lastError || st.lastError.after < st.lastValidation.after)
        ? 'VALIDATION_FAILED' : ((st.lastError && st.lastError.code) || 'ALL_MODELS_FAILED'));
    }
    const model = chain[idx];
    const limit = limits[model] || 1;

    // Model listesi okunabildiyse listede olmayan modele hiç çağrı gitmez (Madde 12).
    if (available && !available.has(model)) {
      st.skipped.push(model);
      log({ event: 'model_skipped_unlisted', model });
      idx++;
      continue;
    }
    if ((st.modelAttempts[model] || 0) >= limit) { idx++; continue; }

    // (2) Global tavan — model bütçesinden önce bakılır.
    if (st.totalAiCalls >= cfg.MAX_TOTAL_AI_CALLS) return fail('CALL_BUDGET_EXHAUSTED');
    // (1) Son tarih.
    const remaining = deadline - now();
    if (remaining < cfg.MIN_CALL_WINDOW_MS) return fail('JOB_DEADLINE');

    if (idx > 0 && !announced.has(model)) {
      st.fallbackUsed = true;
      announced.add(model);
      st.currentModel = model;
      await onState(Object.assign({ status: STATUS.FALLBACK }, snapshot()));
    }
    st.currentModel = model;
    st.totalAiCalls++;
    st.modelAttempts[model] = (st.modelAttempts[model] || 0) + 1;
    const attempt = st.modelAttempts[model];
    const callNo = st.totalAiCalls;
    const isRegen = !!feedback;
    await onState(Object.assign({ status: STATUS.GENERATING }, snapshot()));

    const ctrl = new AbortController();
    const until = Math.min(cfg.PER_CALL_TIMEOUT_MS, remaining);
    const deadlineBound = remaining <= cfg.PER_CALL_TIMEOUT_MS;
    const timer = setTimer(() => ctrl.abort(deadlineBound ? 'JOB_DEADLINE' : 'CALL_TIMEOUT'), until);
    const t0 = now();
    let res;
    try {
      res = await opts.callModel({
        model, attempt, callNo,
        messages: withFeedback(opts.request.messages, feedback),
        system: opts.request.system,
        generation: opts.request.generation,
        signal: ctrl.signal,
      });
    } catch (err) {
      clearTimer(timer);
      const code = (err && err.code) || 'UNKNOWN';
      const kind = (err && err.kind) || 'permanent';
      st.lastError = { code, kind, status: err && err.status, model, after: callNo };
      st.history.push({ callNo, model, attempt, outcome: 'error', kind, code, status: (err && err.status) || null, regeneration: isRegen, ms: now() - t0 });
      log({ event: 'ai_call_error', model, attempt, callNo, kind, code, status: (err && err.status) || null, elapsedMs: now() - startedAt, fallback: idx > 0 });

      if (code === 'JOB_DEADLINE' || now() >= deadline) return fail('JOB_DEADLINE');

      // Geçici hata, bu modelde deneme hakkı var (yalnızca ana model 1'den fazla alır).
      if (kind === 'transient' && st.modelAttempts[model] < limit) {
        const n = st.transientRetries[model] || 0;
        const planned = (err && err.retryAfterMs != null) ? err.retryAfterMs : cfg.RETRY_BACKOFF_MS[Math.min(n, cfg.RETRY_BACKOFF_MS.length - 1)];
        // Bekleme + bir çağrı penceresi son tarihe sığmıyorsa aynı modeli bekleme; sıradakine geç.
        if (now() + planned + cfg.MIN_CALL_WINDOW_MS > deadline) {
          log({ event: 'retry_skipped_deadline', model, waitMs: planned });
          idx++;
          continue;
        }
        st.transientRetries[model] = n + 1;
        await onState(Object.assign({ status: STATUS.RETRYING, retryInMs: planned, lastErrorCode: code }, snapshot()));
        log({ event: 'retry_scheduled', model, waitMs: planned, source: err && err.retryAfterMs != null ? 'retry-after' : 'backoff' });
        await sleep(planned);
        continue;
      }
      // Kalıcı hata, model yok ya da bu modelin bütçesi bitti → sıradaki model.
      idx++;
      continue;
    } finally {
      clearTimer(timer);
    }

    st.history.push({ callNo, model, attempt, outcome: 'response', regeneration: isRegen, ms: now() - t0 });
    log({ event: 'ai_call_ok', model, attempt, callNo, elapsedMs: now() - startedAt, regeneration: isRegen });

    await onState(Object.assign({ status: STATUS.VALIDATING }, snapshot()));
    const v = await opts.validate({ text: res && res.text, model, callNo, remainingMs: deadline - now(), deadline });
    const verdict = Object.assign({ after: callNo, model }, v || { status: 'fail', errors: [{ text: 'doğrulayıcı yanıt vermedi' }] });
    st.lastValidation = verdict;
    log({ event: 'validation', model, callNo, status: verdict.status, stage: verdict.stage || null, errors: (verdict.errors || []).length });

    if (verdict.status === 'pass') {
      return finish(true, { status: STATUS.COMPLETED, text: res.text, model, validation: verdict, errorCode: null });
    }
    // Doğrulama beklenirken iş bitti (son tarih, iptal, istemci yanıt vermedi).
    if (verdict.status === 'abort') return fail(verdict.code || 'VALIDATION_ABORTED');

    feedback = feedbackText(verdict.errors);
    if (st.regenerationUsed < cfg.MAX_REGENERATIONS) {
      st.regenerationUsed++;
      // Aynı modelde hak varsa orada, yoksa sıradaki modelde yeniden üret.
      if (st.modelAttempts[model] >= limit) idx++;
      continue;
    }
    idx++;
  }
}

module.exports = { runGeneration, STATUS, feedbackText, withFeedback };
