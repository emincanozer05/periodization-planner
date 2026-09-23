/* ═══════════════════════════════════════════════════════════════════════════
   AI ROUTER — güvenilirlik senaryoları (AI_RELIABILITY Madde 22, Test 1-9, 14, 15)

   Gerçek router kodu, sahte bir saat ve sahte bir modelle çalıştırılıyor. Sahte
   model her çağrıyı kaydediyor; testler "kaç çağrı yapıldı, hangi modele, hangi
   sırayla, ne kadar beklendi" sorularını bu kayıttan cevaplıyor. Gerçek bekleme
   yok: uyku saati ileri alıyor.
   ═══════════════════════════════════════════════════════════════════════════ */
const assert = require('assert');
const { section, ta, t } = require('./harness');
const C = require('../ai/config');
const { runGeneration, STATUS } = require('../ai/router');
const { AiCallError, classifyHttp, parseRetryAfterHeader, retryInfoFromBody, classifyThrown } = require('../ai/errors');
const { validateStructure } = require('../ai/validate');

const P = C.PRIMARY_MODEL;
const [F1, F2, F3, F4] = C.FALLBACK_MODELS;

const transient = (status, extra) => new AiCallError('transient', 'HTTP_' + status,
  Object.assign({ status, code: status === 429 ? 'RATE_LIMITED' : 'HTTP_' + status }, extra || {}));
const permanent = code => new AiCallError('permanent', code, { status: 400, code });
const unavailable = () => new AiCallError('unavailable', 'MODEL_UNAVAILABLE', { status: 404, code: 'MODEL_UNAVAILABLE' });

const GOOD = JSON.stringify({ program: { seans_adi: 'x', bloklar: [{ ad: 'A', faz: 'ana',
  egzersizler: [{ ad: 'Goblet Squat', kaynak: 'library', set: '3', tekrar: '8' }] }] }, flagged_conflicts: [] });

/* script: her çağrı için ya bir hata ya da { text, ms } — sıra korunur. Bitince
   son eleman tekrar edilir. */
function harness(script, opts) {
  const o = opts || {};
  const clock = { t: 1000000 };
  const calls = [];
  const sleeps = [];
  const states = [];
  const validated = [];
  const run = runGeneration({
    config: o.config,
    startedAt: clock.t,
    now: () => clock.t,
    sleep: async ms => { sleeps.push(ms); clock.t += ms; },
    setTimer: () => 0, clearTimer: () => {},
    availableModels: o.available || null,
    isCancelled: o.isCancelled,
    request: { system: 'SYS', messages: [{ role: 'user', content: 'INPUT' }], generation: { json: true } },
    onState: async p => { states.push(p.status); },
    callModel: async ({ model, messages, system }) => {
      const step = script[Math.min(calls.length, script.length - 1)];
      calls.push({ model, messages, system });
      clock.t += (step && step.ms) || 1500;
      if (step instanceof Error) throw step;
      return { text: step.text != null ? step.text : GOOD };
    },
    validate: async ({ text, model }) => {
      validated.push(model);
      if (o.validate) return o.validate({ text, model, n: validated.length, clock });
      return validateStructure(text, { libraryIndex: o.libraryIndex || ['Goblet Squat'] });
    },
  });
  return run.then(r => ({ r, calls, sleeps, states, validated, clock }));
}

section('AI Router — model hiyerarşisi ve bütçe sabitleri');

t('ana model gemini-3.8-flash, yedek sırası korunuyor', () => {
  assert.strictEqual(P, 'gemini-3.8-flash');
  assert.deepStrictEqual([...C.FALLBACK_MODELS], ['gemini-3.7-flash', 'gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite']);
  assert.strictEqual(C.MODEL_ATTEMPT_LIMITS[P], 3);
  C.FALLBACK_MODELS.forEach(m => assert.strictEqual(C.MODEL_ATTEMPT_LIMITS[m], 1));
  assert.strictEqual(C.MAX_TOTAL_AI_CALLS, 6);
  assert.strictEqual(C.MAX_REGENERATIONS, 1);
  assert.strictEqual(C.MAX_JOB_DURATION_MS, 120000);
});

section('TEST 1 — 3.8 başarılı → 1 çağrı, doğrulama PASS');
ta('tek çağrı, COMPLETED, fallback yok', async () => {
  const { r, calls } = await harness([{ text: GOOD }]);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.status, STATUS.COMPLETED);
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(r.totalAiCalls, 1);
  assert.strictEqual(r.model, P);
  assert.strictEqual(r.fallbackUsed, false);
});

section('TEST 2 — 3.8 → 503 → retry → 3.8 başarılı');
ta('iki çağrı da 3.8, arada ~2 sn geri çekilme', async () => {
  const { r, calls, sleeps, states } = await harness([transient(503), { text: GOOD }]);
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(calls.map(c => c.model), [P, P]);
  assert.deepStrictEqual(sleeps, [2000]);
  assert.ok(states.includes(STATUS.RETRYING));
  assert.strictEqual(r.fallbackUsed, false);
});

section('TEST 3 — 3.8 → 503 ×3 → fallback');
ta('3.8 üç kez, sonra 3.7; 2 sn ve 4 sn beklenir', async () => {
  const { r, calls, sleeps, states } = await harness([transient(503), transient(503), transient(503), { text: GOOD }]);
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(calls.map(c => c.model), [P, P, P, F1]);
  assert.deepStrictEqual(sleeps, [2000, 4000]);
  assert.strictEqual(r.fallbackUsed, true);
  assert.strictEqual(r.model, F1);
  assert.ok(states.includes(STATUS.FALLBACK));
});

section('TEST 4 — 3.8 → 429: Retry-After varsa o, yoksa 2 sn / 4 sn');
ta('Retry-After 7 sn → 7 sn beklenir', async () => {
  const { sleeps, calls } = await harness([transient(429, { retryAfterMs: 7000 }), { text: GOOD }]);
  assert.deepStrictEqual(sleeps, [7000]);
  assert.deepStrictEqual(calls.map(c => c.model), [P, P]);
});
ta('zamanlama bilgisi yok → 2 sn, sonra 4 sn', async () => {
  const { sleeps } = await harness([transient(429), transient(429), { text: GOOD }]);
  assert.deepStrictEqual(sleeps, [2000, 4000]);
});
t('Retry-After başlığı: saniye ve HTTP tarihi', () => {
  assert.strictEqual(parseRetryAfterHeader('12'), 12000);
  const now = Date.parse('2026-09-22T10:00:00Z');
  assert.strictEqual(parseRetryAfterHeader('Tue, 22 Sep 2026 10:00:05 GMT', now), 5000);
  assert.strictEqual(parseRetryAfterHeader('', now), null);
});
t('google.rpc.RetryInfo gövdesi okunuyor', () => {
  const body = { error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'quota',
    details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '34s' }] } };
  assert.strictEqual(retryInfoFromBody(body), 34000);
  const e = classifyHttp(429, body, {});
  assert.strictEqual(e.kind, 'transient');
  assert.strictEqual(e.retryAfterMs, 34000);
});
ta('Retry-After son tarihe sığmıyorsa beklenmez, yedeğe geçilir', async () => {
  const { sleeps, calls, r } = await harness([transient(429, { retryAfterMs: 200000 }), { text: GOOD }]);
  assert.deepStrictEqual(sleeps, []);
  assert.deepStrictEqual(calls.map(c => c.model), [P, F1]);
  assert.strictEqual(r.ok, true);
});

section('Sahadaki durum — 3.8 kotası dolu, uzun Retry-After');
ta('429 + 40 sn Retry-After: 3.8 beklenmez, hemen 3.7\'ye geçilir ve iş süre dolmadan biter', async () => {
  const q = transient(429, { retryAfterMs: 40000 });
  const { r, calls, sleeps, clock } = await harness([q, { text: GOOD, ms: 35000 }]);
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(calls.map(c => c.model), [P, F1]);
  assert.deepStrictEqual(sleeps, []);
  assert.ok(clock.t - 1000000 < C.MAX_JOB_DURATION_MS);
});
ta('kısa Retry-After (≤15 sn) hâlâ beklenir ve 3.8 yeniden denenir', async () => {
  const { sleeps, calls } = await harness([transient(429, { retryAfterMs: 12000 }), { text: GOOD }]);
  assert.deepStrictEqual(sleeps, [12000]);
  assert.deepStrictEqual(calls.map(c => c.model), [P, P]);
});
ta('yavaş çağrılar: beklemeden sonra gerçekçi bir çağrı sığmıyorsa beklenmez', async () => {
  const slow = transient(503); slow.ms = 90000;          // 90 sn süren ve 503 dönen çağrı
  const { calls, sleeps, r } = await harness([slow, { text: GOOD, ms: 20000 }]);
  assert.deepStrictEqual(sleeps, []);                    // 90 + 2 + 30 > 120 → bekleme yok
  assert.deepStrictEqual(calls.map(c => c.model), [P, F1]);
  assert.strictEqual(r.ok, true);
});
t('günlük kota (QuotaFailure …PerDay…) yeniden denenmez: model bırakılır', () => {
  const body = { error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: 'You exceeded your current quota',
    details: [{ '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
      violations: [{ quotaMetric: 'generativelanguage.googleapis.com/generate_content_free_tier_requests',
        quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }] },
      { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '20s' }] } };
  const e = classifyHttp(429, body, {});
  assert.strictEqual(e.kind, 'unavailable');
  assert.strictEqual(e.code, 'QUOTA_EXHAUSTED_DAILY');
  const perMin = JSON.parse(JSON.stringify(body));
  perMin.error.details[0].violations[0].quotaId = 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier';
  assert.strictEqual(classifyHttp(429, perMin, {}).kind, 'transient');
});
ta('günlük kota dolu 3.8 → retry yok, 3.7', async () => {
  const d = new AiCallError('unavailable', 'QUOTA_EXHAUSTED_DAILY', { status: 429, code: 'QUOTA_EXHAUSTED_DAILY' });
  const { calls, sleeps } = await harness([d, { text: GOOD }]);
  assert.deepStrictEqual(calls.map(c => c.model), [P, F1]);
  assert.deepStrictEqual(sleeps, []);
});

section('Hata sınıflandırma (Madde 4)');
t('geçici: 408 429 500 502 503 504; kalıcı: 400 401 403; model yok: 404', () => {
  [408, 429, 500, 502, 503, 504].forEach(s => assert.strictEqual(classifyHttp(s, null, {}).kind, 'transient', s));
  assert.strictEqual(classifyHttp(400, { error: { message: 'Invalid JSON payload' } }, {}).kind, 'permanent');
  assert.strictEqual(classifyHttp(400, { error: { message: 'API key not valid. Please pass a valid API key.' } }, {}).code, 'AUTH_ERROR');
  assert.strictEqual(classifyHttp(401, null, {}).kind, 'permanent');
  assert.strictEqual(classifyHttp(403, null, {}).kind, 'permanent');
  assert.strictEqual(classifyHttp(404, null, {}).kind, 'unavailable');
  assert.strictEqual(classifyHttp(400, { error: { message: 'models/x is not supported for generateContent' } }, {}).kind, 'unavailable');
});
t('ağ hatası ve çağrı zaman aşımı geçici; iş son tarihi kalıcı', () => {
  assert.strictEqual(classifyThrown(new TypeError('fetch failed'), false).kind, 'transient');
  const ab = new Error('aborted'); ab.name = 'AbortError';
  assert.strictEqual(classifyThrown(ab, false).code, 'CALL_TIMEOUT');
  assert.strictEqual(classifyThrown(ab, true).code, 'JOB_DEADLINE');
});

section('TEST 5 — 3.8 kalıcı hata → retry YOK → fallback');
ta('geçersiz istek: 3.8 bir kez, sonra 3.7, bekleme yok', async () => {
  const { r, calls, sleeps } = await harness([permanent('INVALID_REQUEST'), { text: GOOD }]);
  assert.deepStrictEqual(calls.map(c => c.model), [P, F1]);
  assert.deepStrictEqual(sleeps, []);
  assert.strictEqual(r.modelAttempts[P], 1);
  assert.strictEqual(r.ok, true);
});
ta('kimlik doğrulama hatası da yeniden denenmez', async () => {
  const { calls } = await harness([permanent('AUTH_ERROR'), permanent('AUTH_ERROR')]);
  assert.strictEqual(calls.filter(c => c.model === P).length, 1);
});

section('TEST 6 — doğrulama FAIL → en fazla 1 regeneration → yeniden doğrulama');
ta('ilk yanıt reddedilir, 3.8 ile yeniden üretilir, geçer', async () => {
  const { r, calls, validated } = await harness([{ text: '{"program":{}}' }, { text: GOOD }]);
  assert.strictEqual(r.ok, true);
  assert.deepStrictEqual(calls.map(c => c.model), [P, P]);
  assert.strictEqual(r.regenerationUsed, 1);
  assert.strictEqual(validated.length, 2);
  // Regeneration yalnızca doğrulayıcının maddelerini ekler.
  assert.ok(/DOĞRULAYICISINDAN GEÇMEDİ/.test(calls[1].messages[0].content));
  assert.ok(calls[1].messages[0].content.startsWith('INPUT'));
});
ta('regeneration da reddedilirse ikinci regeneration yok — sıradaki yedek', async () => {
  const { r, calls } = await harness([{ text: 'bozuk' }, { text: 'bozuk' }, { text: GOOD }]);
  assert.strictEqual(r.regenerationUsed, 1);
  assert.deepStrictEqual(calls.map(c => c.model), [P, P, F1]);
  assert.strictEqual(r.ok, true);
});
ta('3.8 bütçesi bittiyse regeneration yedek modelde yapılır', async () => {
  const { calls, r } = await harness([transient(503), transient(503), { text: 'bozuk' }, { text: GOOD }]);
  assert.deepStrictEqual(calls.map(c => c.model), [P, P, P, F1]);
  assert.strictEqual(r.modelAttempts[P], 3);
  assert.strictEqual(r.regenerationUsed, 1);
  assert.strictEqual(r.ok, true);
});

section('TEST 7 — global 6 çağrı sınırı: 7. çağrı kesinlikle yapılmaz');
ta('3.8 ×3 + 3.7 + 3.6 + 3.5 = 6; 3.5 Flash-Lite çağrılmaz', async () => {
  const { r, calls } = await harness([transient(503)]);
  assert.strictEqual(calls.length, 6);
  assert.deepStrictEqual(calls.map(c => c.model), [P, P, P, F1, F2, F3]);
  assert.ok(!calls.some(c => c.model === F4));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.errorCode, 'CALL_BUDGET_EXHAUSTED');
  assert.strictEqual(r.totalAiCalls, 6);
});
ta('hiçbir yanıt doğrulamadan geçmese de çağrı sayısı 6\'yı aşmaz', async () => {
  const { r, calls } = await harness([{ text: 'bozuk' }]);
  assert.ok(calls.length <= 6, 'çağrı: ' + calls.length);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.regenerationUsed, 1);
});
ta('karışık hatalar — sayaç yine 6\'da durur', async () => {
  const { calls } = await harness([transient(429), { text: 'x' }, transient(500), transient(503), permanent('INVALID_REQUEST'), unavailable(), transient(502)]);
  assert.ok(calls.length <= 6);
});

section('TEST 8 — model erişilemez → sıradaki yedek');
ta('404: yeniden deneme yok, 3.7\'ye geçilir', async () => {
  const { calls, sleeps, r } = await harness([unavailable(), { text: GOOD }]);
  assert.deepStrictEqual(calls.map(c => c.model), [P, F1]);
  assert.deepStrictEqual(sleeps, []);
  assert.strictEqual(r.ok, true);
});
ta('model listesinde olmayan model hiç çağrılmaz ve bütçe harcamaz', async () => {
  const avail = new Set([F2, F3]);
  const { calls, r } = await harness([{ text: GOOD }], { available: avail });
  assert.deepStrictEqual(calls.map(c => c.model), [F2]);
  assert.deepStrictEqual(r.skippedModels, [P, F1]);
  assert.strictEqual(r.totalAiCalls, 1);
});

section('TEST 9 — 120 sn son tarih → yeni çağrı yok → FAILED');
ta('son tarihe yakın bir hatadan sonra yeni çağrı başlamaz', async () => {
  const slow = transient(503); slow.ms = 115000;
  const step = Object.assign(slow, {});
  const { r, calls } = await harness([step, { text: GOOD }]);
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.errorCode, 'JOB_DEADLINE');
  assert.strictEqual(r.status, STATUS.FAILED);
});
ta('uçuştaki çağrının son tarih kesmesi yeniden denenmez', async () => {
  const cut = new AiCallError('permanent', 'JOB_DEADLINE', { code: 'JOB_DEADLINE' });
  const { r, calls } = await harness([cut, { text: GOOD }]);
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(r.errorCode, 'JOB_DEADLINE');
});
ta('doğrulama beklerken süre dolarsa iş biter, ek çağrı yok', async () => {
  const { r, calls } = await harness([{ text: GOOD }], { validate: () => ({ status: 'abort', code: 'JOB_DEADLINE' }) });
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(r.errorCode, 'JOB_DEADLINE');
});

section('TEST 14 — yedek modelin programı aynı doğrulayıcıdan ve aynı bağlamla geçer');
ta('3.7 aynı sistem talimatını ve aynı girdiyi alır, aynı doğrulayıcıya gider', async () => {
  const { calls, validated, r } = await harness([permanent('INVALID_REQUEST'), { text: GOOD }]);
  assert.strictEqual(calls[1].system, calls[0].system);
  assert.strictEqual(calls[1].messages[0].content, calls[0].messages[0].content);
  assert.deepStrictEqual(validated, [F1]);
  assert.strictEqual(r.validation.status, 'pass');
});

section('TEST 15 — kütüphanede olmayan egzersiz → FAIL → bütçe kurallarıyla devam');
const GHOST = JSON.stringify({ program: { bloklar: [{ ad: 'A', faz: 'ana',
  egzersizler: [{ ad: 'Quantum Squat 9000', kaynak: 'library', set: '3', tekrar: '5' }] }] } });
t('"library" diye işaretlenen uydurma egzersiz reddedilir', () => {
  const v = validateStructure(GHOST, { libraryIndex: ['Goblet Squat'] });
  assert.strictEqual(v.status, 'fail');
  assert.strictEqual(v.stage, 'library');
  assert.ok(/Quantum Squat 9000/.test(v.errors[0].text));
});
t('açıkça "custom" yazılan egzersiz kabul edilir (Kural 29 korunuyor)', () => {
  const v = validateStructure(GHOST.replace('"library"', '"custom"'), { libraryIndex: ['Goblet Squat'] });
  assert.strictEqual(v.status, 'pass');
});
ta('uydurma egzersiz → regeneration → geçerli program', async () => {
  const { r, calls } = await harness([{ text: GHOST }, { text: GOOD }]);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(calls.length, 2);
  assert.strictEqual(r.regenerationUsed, 1);
});

section('Şema ve bütünlük');
t('boş, bozuk, yarıda kesilmiş yanıt reddedilir', () => {
  assert.strictEqual(validateStructure('', {}).errors[0].code, 'EMPTY_RESPONSE');
  assert.strictEqual(validateStructure('merhaba', {}).errors[0].code, 'INVALID_JSON');
  assert.strictEqual(validateStructure(GOOD.slice(0, 60), {}).status, 'fail');
  assert.strictEqual(validateStructure('{"x":1}', {}).errors[0].code, 'NO_PROGRAM');
});
t('dozsuz egzersiz eksik sayılır', () => {
  const v = validateStructure(JSON.stringify({ program: { bloklar: [{ egzersizler: [{ ad: 'Plank' }] }] } }), {});
  assert.strictEqual(v.status, 'fail');
  assert.strictEqual(v.errors[0].code, 'NO_DOSE');
});
t('kod çiti içindeki JSON kabul edilir', () => {
  assert.strictEqual(validateStructure('```json\n' + GOOD + '\n```', { libraryIndex: ['goblet squat'] }).status, 'pass');
});

section('İptal');
ta('iptal istenirse yeni çağrı yapılmaz', async () => {
  let n = 0;
  const { r, calls } = await harness([transient(503), { text: GOOD }], { isCancelled: () => (n++ > 0) });
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(r.status, STATUS.CANCELLED);
});
