/* ═══════════════════════════════════════════════════════════════════════════
   PROGRAM ÜRETİM İŞİ — Firestore üzerinden uçtan uca (Test 10-13, 16 ve güvenlik)

   Gerçek job.js, bellekte duran sahte bir Firestore üzerinde çalışıyor. İstemci
   (koçun uygulaması) da taklit ediliyor: iş VALIDATING'e geçip bir aday
   yayımladığında, CoachOS Kural Denetleyicisinin sonucunu aynı dokümana yazıyor.
   ═══════════════════════════════════════════════════════════════════════════ */
const assert = require('assert');
const { section, ta, t } = require('./harness');
const C = require('../ai/config');
const job = require('../ai/job');
const cache = require('../ai/context-cache');
const { AiCallError } = require('../ai/errors');

/* ── Sahte Firestore ─────────────────────────────────────────────────────── */
function fakeDb() {
  const data = new Map();         // path → object
  const listeners = new Map();    // path → Set(cb)
  const clone = v => (v == null ? v : JSON.parse(JSON.stringify(v)));
  const fire = path => {
    const ls = listeners.get(path);
    if (!ls) return;
    const snap = { exists: data.has(path), data: () => clone(data.get(path)) };
    for (const cb of [...ls]) setImmediate(() => cb(snap));
  };
  const write = (path, v) => { if (v === undefined) data.delete(path); else data.set(path, v); fire(path); };
  const refFor = (col, id) => {
    const path = col + '/' + id;
    return {
      id, path,
      async get() { return { exists: data.has(path), id, data: () => clone(data.get(path)) }; },
      async set(v, o) { write(path, o && o.merge ? Object.assign({}, data.get(path) || {}, clone(v)) : clone(v)); },
      async update(p) { if (!data.has(path)) throw new Error('no doc ' + path); write(path, Object.assign({}, data.get(path), clone(p))); },
      async delete() { write(path, undefined); },
      onSnapshot(cb) {
        if (!listeners.has(path)) listeners.set(path, new Set());
        listeners.get(path).add(cb);
        setImmediate(() => cb({ exists: data.has(path), data: () => clone(data.get(path)) }));
        return () => listeners.get(path).delete(cb);
      },
    };
  };
  let chain = Promise.resolve();
  const db = {
    data,
    collection: col => ({
      doc: id => refFor(col, id),
      where: (f, op, v) => ({ async get() {
        const docs = [...data.entries()].filter(([p, d]) => p.startsWith(col + '/') && d && d[f] === v)
          .map(([p, d]) => ({ ref: refFor(col, p.slice(col.length + 1)), data: () => clone(d) }));
        return { docs };
      } }),
    }),
    runTransaction(fn) {
      // Transaction'lar sırayla — gerçek Firestore'un çakışmada yeniden deneme
      // semantiğinin test için yeterli karşılığı.
      const run = chain.then(async () => {
        const writes = [];
        const tx = {
          async get(ref) { return ref.get(); },
          set(ref, v, o) { writes.push(() => ref.set(v, o)); },
          update(ref, p) { writes.push(() => ref.update(p)); },
          delete(ref) { writes.push(() => ref.delete()); },
        };
        const out = await fn(tx);
        for (const w of writes) await w();
        return out;
      });
      chain = run.catch(() => {});
      return run;
    },
  };
  return db;
}

const GOOD = JSON.stringify({ program: { seans_adi: 'x', bloklar: [{ ad: 'A', faz: 'ana',
  egzersizler: [{ ad: 'Goblet Squat', kaynak: 'library', set: '3', tekrar: '8' }] }] }, flagged_conflicts: [] });

function newJob(db, id, over) {
  const ref = db.collection(job.COL_JOBS).doc(id);
  const j = Object.assign({
    uid: 'coach1', athleteId: 'ath1', teamId: 'team1', srcKey: 'team:s1', date: '2026-09-22',
    status: 'QUEUED', createdAt: Date.now(),
    request: { system: 'SYSTEM', user: '{"sporcu":"..."}', generation: { json: true, temperature: 0.7, maxOutputTokens: 10000 } },
    libraryIndex: ['Goblet Squat'],
  }, over || {});
  db.data.set(ref.path, j);
  return ref;
}

/* Koçun uygulaması: aday geldikçe kural denetleyicisinin sonucunu yazar. */
function fakeClient(ref, verdicts) {
  let seen = 0;
  return ref.onSnapshot(s => {
    const d = s.data();
    if (!d || d.status !== 'VALIDATING' || !d.candidate) return;
    const round = d.candidate.round;
    if (round <= seen || (d.ruleCheck && d.ruleCheck.round === round)) return;
    seen = round;
    const v = verdicts[Math.min(round - 1, verdicts.length - 1)];
    ref.update({ ruleCheck: { round, status: v.pass ? 'pass' : 'fail', hard: v.hard || [], at: Date.now() } });
  });
}

function fakeGemini(script) {
  const calls = [];
  return {
    calls,
    async generate(a) {
      const step = script[Math.min(calls.length, script.length - 1)];
      calls.push({ model: a.model, messages: a.messages, system: a.system, cachedContent: a.cachedContent || null });
      if (typeof step === 'function') return step(a);
      if (step instanceof Error) throw step;
      return { text: step };
    },
    async listModels() { return null; },
    async createCachedContent(a) { this.cacheCreated = (this.cacheCreated || []).concat([a]); return { name: 'cachedContents/c1', expireTime: new Date(Date.now() + 3600e3).toISOString() }; },
    async deleteCachedContent() {},
  };
}

const NO_CACHE = { CONTEXT_CACHE: Object.assign({}, C.CONTEXT_CACHE, { enabled: false }) };
const run = (db, ref, gem, over) => job.processJob(Object.assign({
  db, ref, gemini: gem, apiKey: 'test-key', availableModels: null, sleep: async () => {}, config: NO_CACHE,
}, over || {}));
const doc = (db, ref) => db.data.get(ref.path);

section('İş — başarılı yol ve takvim yazım güvenliği');

ta('TEST 1 (iş): tek çağrı → şema → kural denetleyicisi PASS → COMPLETED, yazım bekliyor', async () => {
  const db = fakeDb(); const ref = newJob(db, 'j1');
  const stop = fakeClient(ref, [{ pass: true }]);
  const gem = fakeGemini([GOOD]);
  const r = await run(db, ref, gem);
  stop();
  const d = doc(db, ref);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(d.status, 'COMPLETED');
  assert.strictEqual(d.validationStatus, 'pass');
  assert.strictEqual(d.calendarWriteStatus, 'pending');
  assert.strictEqual(d.totalAiCalls, 1);
  assert.strictEqual(d.result.text, GOOD);
  assert.strictEqual(d.result.model, C.PRIMARY_MODEL);
  assert.ok(d.startedAt && d.completedAt && d.completedAt - d.startedAt <= C.MAX_JOB_DURATION_MS);
  // kilit bırakıldı
  assert.ok(![...db.data.keys()].some(k => k.startsWith(job.COL_LOCKS + '/')));
});

ta('kural denetleyicisi reddederse 1 regeneration, ihlaller modele geri gider', async () => {
  const db = fakeDb(); const ref = newJob(db, 'j2');
  const stop = fakeClient(ref, [{ pass: false, hard: ['"Back Squat" 4 adet dumbbell gerektiriyor; envanterde 2 var — 2 eksik.'] }, { pass: true }]);
  const gem = fakeGemini([GOOD, GOOD]);
  await run(db, ref, gem);
  stop();
  const d = doc(db, ref);
  assert.strictEqual(d.status, 'COMPLETED');
  assert.strictEqual(d.regenerationUsed, 1);
  assert.strictEqual(d.totalAiCalls, 2);
  assert.ok(/2 eksik/.test(gem.calls[1].messages[0].content));
});

section('TEST 12 — AI hatası → takvim değişmez');
ta('bütün modeller hata verir → FAILED, sonuç yok, yazım yok', async () => {
  const db = fakeDb(); const ref = newJob(db, 'j3');
  const gem = fakeGemini([new AiCallError('transient', 'HTTP_503', { status: 503, code: 'HTTP_503' })]);
  await run(db, ref, gem);
  const d = doc(db, ref);
  assert.strictEqual(d.status, 'FAILED');
  assert.strictEqual(d.calendarWriteStatus, 'not_written');
  assert.strictEqual(d.result, undefined);
  assert.strictEqual(d.totalAiCalls, 6);
  assert.strictEqual(gem.calls.length, 6);
});

section('TEST 13 / TEST 16 — doğrulama hatası (ekipman adedi) → takvim değişmez');
ta('kural denetleyicisi her turda reddeder → FAILED, ihlal kullanıcıya taşınır', async () => {
  const db = fakeDb(); const ref = newJob(db, 'j4');
  const msg = '"DB Bench Press" 4 adet dumbbell gerektiriyor; envanterde 2 var — 2 eksik.';
  const stop = fakeClient(ref, [{ pass: false, hard: [msg] }]);
  const gem = fakeGemini([GOOD]);
  await run(db, ref, gem);
  stop();
  const d = doc(db, ref);
  assert.strictEqual(d.status, 'FAILED');
  assert.strictEqual(d.errorCode, 'VALIDATION_FAILED');
  assert.strictEqual(d.validationStatus, 'fail');
  assert.strictEqual(d.calendarWriteStatus, 'not_written');
  assert.strictEqual(d.result, undefined);
  assert.ok(d.failure.errors.some(e => e.includes('2 eksik')));
  assert.ok(d.totalAiCalls <= 6);
});

section('TEST 10 — aynı iş beş kez tetiklenir → tek üretim');
ta('beş eşzamanlı çalışmadan yalnızca biri sahiplenir; model bir kez çağrılır', async () => {
  const db = fakeDb(); const ref = newJob(db, 'j5');
  const stop = fakeClient(ref, [{ pass: true }]);
  const gem = fakeGemini([GOOD]);
  const rs = await Promise.all([1, 2, 3, 4, 5].map(() => run(db, ref, gem)));
  stop();
  assert.strictEqual(rs.filter(r => r.claimed).length, 1);
  assert.strictEqual(gem.calls.length, 1);
  assert.strictEqual(doc(db, ref).status, 'COMPLETED');
});

section('TEST 11 — aynı sporcu/seans için aktif üretim varken ikinci istek');
ta('ikinci iş DUPLICATE_ACTIVE_GENERATION ile kapanır, model çağrılmaz', async () => {
  const db = fakeDb();
  const a = newJob(db, 'jA'); const b = newJob(db, 'jB');
  let release;
  const gate = new Promise(r => { release = r; });
  const gemA = fakeGemini([async () => { await gate; return { text: GOOD }; }]);
  const gemB = fakeGemini([GOOD]);
  const stopA = fakeClient(a, [{ pass: true }]);
  const pa = run(db, a, gemA);
  await new Promise(r => setTimeout(r, 20));            // A kilidi aldı, modelde bekliyor
  const rb = await run(db, b, gemB);
  release();
  await pa; stopA();
  assert.strictEqual(rb.claimed, false);
  assert.strictEqual(doc(db, b).status, 'FAILED');
  assert.strictEqual(doc(db, b).errorCode, 'DUPLICATE_ACTIVE_GENERATION');
  assert.strictEqual(doc(db, b).duplicateOf, 'jA');
  assert.strictEqual(gemB.calls.length, 0);
  assert.strictEqual(doc(db, a).status, 'COMPLETED');
});
ta('ilk iş bittikten sonra aynı sporcu için yeni iş çalışır (kilit bırakıldı)', async () => {
  const db = fakeDb();
  const a = newJob(db, 'jC');
  const s1 = fakeClient(a, [{ pass: true }]);
  await run(db, a, fakeGemini([GOOD])); s1();
  const b = newJob(db, 'jD');
  const s2 = fakeClient(b, [{ pass: true }]);
  await run(db, b, fakeGemini([GOOD])); s2();
  assert.strictEqual(doc(db, b).status, 'COMPLETED');
});

section('İş — güvenlik ve sınırlar');
ta('sunucuda anahtar yoksa FAILED SERVER_NOT_CONFIGURED, çağrı yok', async () => {
  const db = fakeDb(); const ref = newJob(db, 'j6');
  const gem = fakeGemini([GOOD]);
  await run(db, ref, gem, { apiKey: '' });
  assert.strictEqual(doc(db, ref).errorCode, 'SERVER_NOT_CONFIGURED');
  assert.strictEqual(gem.calls.length, 0);
});
ta('istemci kural sonucunu bildirmezse RULE_CHECK_TIMEOUT, ek çağrı yok', async () => {
  const db = fakeDb(); const ref = newJob(db, 'j7');
  const gem = fakeGemini([GOOD]);
  await run(db, ref, gem, { config: Object.assign({}, NO_CACHE, { RULE_CHECK_WAIT_MS: 30 }) });
  const d = doc(db, ref);
  assert.strictEqual(d.status, 'FAILED');
  assert.strictEqual(d.errorCode, 'RULE_CHECK_TIMEOUT');
  assert.strictEqual(gem.calls.length, 1);
});
ta('çok büyük istek sahiplenilmeden reddedilir', async () => {
  const db = fakeDb(); const ref = newJob(db, 'j8', { request: { system: 'S', user: 'x'.repeat(C.MAX_USER_CHARS + 1) } });
  const gem = fakeGemini([GOOD]);
  const r = await run(db, ref, gem);
  assert.strictEqual(r.claimed, false);
  assert.strictEqual(doc(db, ref).errorCode, 'REQUEST_TOO_LARGE');
  assert.strictEqual(gem.calls.length, 0);
});
ta('saatlik iş sınırı aşılırsa model çağrılmaz', async () => {
  const db = fakeDb();
  db.data.set(job.COL_USAGE + '/coach1', { jobs: C.JOBS_PER_HOUR, jobsWindowStart: Date.now() });
  const ref = newJob(db, 'j9');
  const gem = fakeGemini([GOOD]);
  await run(db, ref, gem);
  assert.strictEqual(doc(db, ref).errorCode, 'RATE_LIMITED_USER');
  assert.strictEqual(gem.calls.length, 0);
});
t('istek denetimi: eksik kimlik ve bozuk tarih reddedilir', () => {
  assert.strictEqual(job.checkRequest({ uid: 'u', athleteId: 'a', srcKey: 's', date: '22-09-2026', request: { system: 's', user: 'u' } }), 'BAD_REQUEST');
  assert.strictEqual(job.checkRequest({ uid: 'u', athleteId: '', srcKey: 's', date: '2026-09-22', request: { system: 's', user: 'u' } }), 'BAD_REQUEST');
  assert.strictEqual(job.checkRequest({ uid: 'u', athleteId: 'a', srcKey: 's', date: '2026-09-22', request: { system: 's', user: 'u' } }), null);
});

section('Bağlam önbelleği (Madde 16)');
ta('yalnızca sabit sistem talimatı önbelleğe girer; sporcu girdisi girmez', async () => {
  cache._mem.clear();
  const db = fakeDb();
  const sys = 'S'.repeat(C.CONTEXT_CACHE.minChars + 10);
  const ref = newJob(db, 'jc1', { request: { system: sys, user: '{"sporcu":"GİZLİ SAĞLIK VERİSİ"}', generation: { json: true } } });
  const stop = fakeClient(ref, [{ pass: true }]);
  const gem = fakeGemini([GOOD]);
  await run(db, ref, gem, { config: {} });
  stop();
  assert.strictEqual(gem.cacheCreated.length, 1);
  assert.strictEqual(gem.cacheCreated[0].system, sys);
  assert.ok(!JSON.stringify(gem.cacheCreated[0]).includes('GİZLİ'));
  assert.strictEqual(gem.calls[0].cachedContent, 'cachedContents/c1');
});
t('talimat değişince önbellek anahtarı değişir (kendiliğinden geçersizleşme)', () => {
  const a = cache.cacheKey({ uid: 'u', model: 'm', system: 'kurallar v1' });
  const b = cache.cacheKey({ uid: 'u', model: 'm', system: 'kurallar v2' });
  const c = cache.cacheKey({ uid: 'u2', model: 'm', system: 'kurallar v1' });
  assert.notStrictEqual(a, b);
  assert.notStrictEqual(a, c);   // hesaplar arasında paylaşılmaz
});
ta('API önbelleği reddederse kayıt silinir, sonraki çağrı önbelleksiz gider', async () => {
  cache._mem.clear();
  const db = fakeDb();
  const sys = 'S'.repeat(C.CONTEXT_CACHE.minChars + 10);
  const ref = newJob(db, 'jc2', { request: { system: sys, user: '{}', generation: { json: true } } });
  const stop = fakeClient(ref, [{ pass: true }]);
  const rej = new AiCallError('permanent', 'INVALID_REQUEST', { status: 400, code: 'INVALID_REQUEST' });
  rej.cacheRejected = true;
  const gem = fakeGemini([rej, GOOD]);
  let made = 0;
  // İlk model için önbellek kurulur, API onu reddeder; sonrası kurulamıyor.
  gem.createCachedContent = async () => (made++ === 0
    ? { name: 'cachedContents/stale', expireTime: new Date(Date.now() + 3600e3).toISOString() } : null);
  await run(db, ref, gem, { config: {} });
  stop();
  assert.strictEqual(gem.calls[0].cachedContent, 'cachedContents/stale');
  assert.strictEqual(gem.calls[1].cachedContent, null);
  assert.ok(![...db.data.entries()].some(([k, v]) => k.startsWith(cache.COL + '/') && v && v.name === 'cachedContents/stale'));
  assert.strictEqual(doc(db, ref).status, 'COMPLETED');
});
