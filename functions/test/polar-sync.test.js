/* ═══════════════════════════════════════════════════════════════════════════
   POLAR — Aşama 2: veri senkronu (manuel "Verileri Senkronize Et")

   Gerçek sync.js / client.js / normalize.js; Firestore bellekte (getAll + batch
   dahil), Polar sahte. Özellikle denetlenen: commit SIRASI (önce yazım + doğrulama,
   sonra commit), tekrar önleme, eksik alanların uydurulmaması, 401'de bağlantının
   geçersiz işaretlenmesi, 429 bekleme, başka hesabın verisi.
   ═══════════════════════════════════════════════════════════════════════════ */
const assert = require('assert');
const crypto = require('crypto');
const { section, t, ta } = require('./harness');
const C = require('../polar/config');
const pc = require('../polar/crypto');
const N = require('../polar/normalize');
const sync = require('../polar/sync');
const { handle } = require('../polar/handler');

const KEY = crypto.randomBytes(32).toString('base64');
const API = C.POLAR.API_BASE;

/* Gerçek Firestore `undefined` taşıyan dokümanı BÜTÜNÜYLE reddediyor; sahte de reddetsin. */
function assertNoUndefined(v, path) {
  if (v === undefined) throw new Error('Firestore: undefined değer (' + path + ')');
  if (v && typeof v === 'object') for (const k of Object.keys(v)) assertNoUndefined(v[k], path + '.' + k);
}
/* ── Sahte Firestore (getAll + batch + hata enjeksiyonu) ─────────────────── */
function fakeDb(events) {
  const data = new Map();
  const clone = v => (v == null ? v : JSON.parse(JSON.stringify(v)));
  const fail = { batchFor: null, tamperAfterWrite: null };
  const refFor = (col, id) => {
    const path = col + '/' + id;
    return {
      id, path, col,
      async get() { return { exists: data.has(path), id, data: () => clone(data.get(path)) }; },
      async set(v, o) { assertNoUndefined(v, path); data.set(path, o && o.merge ? Object.assign({}, data.get(path) || {}, clone(v)) : clone(v)); },
      async delete() { data.delete(path); },
    };
  };
  let chain = Promise.resolve();
  const db = {
    data, fail,
    get: (col, id) => clone(data.get(col + '/' + id)),
    put: (col, id, v) => data.set(col + '/' + id, clone(v)),
    ids: col => [...data.keys()].filter(k => k.startsWith(col + '/')).map(k => k.slice(col.length + 1)),
    cols: () => [...new Set([...data.keys()].map(k => k.split('/')[0]))],
    collection: col => {
      // where(...).where(...).get() — '__docid__' doküman adını temsil ediyor (FieldPath.documentId()).
      const query = filters => ({
        where: (f, op, v) => query(filters.concat([[f, op, v]])),
        async get() {
          const docs = [...data.entries()].filter(([path]) => path.startsWith(col + '/')).filter(([path, d]) => filters.every(([f, op, v]) => {
            const x = f === '__docid__' ? path.slice(col.length + 1) : (d || {})[f];
            return op === '==' ? x === v : op === '>=' ? x >= v : op === '<=' ? x <= v : false;
          })).map(([path, d]) => ({ id: path.slice(col.length + 1), data: () => clone(d) }));
          return { docs };
        },
      });
      return { doc: id => refFor(col, id), where: (f, op, v) => query([[f, op, v]]) };
    },
    async getAll(...refs) { return Promise.all(refs.map(r => r.get())); },
    batch() {
      const ops = [];
      return {
        set(ref, v) { ops.push({ ref, v }); },
        async commit() {
          if (ops.some(o => o.ref.col === fail.batchFor)) throw new Error('firestore unavailable');
          for (const o of ops) await o.ref.set(o.v);
          if (ops.length) events.push('write:' + ops[0].ref.col);
          if (fail.tamperAfterWrite) for (const o of ops) if (o.ref.col === fail.tamperAfterWrite) data.set(o.ref.path, Object.assign({}, data.get(o.ref.path), { hash: 'bozuk' }));
        },
      };
    },
    runTransaction(fn) {
      const run = chain.then(async () => {
        const writes = []; let wrote = false;
        const tx = {
          async get(ref) { if (wrote) throw new Error('okuma yazımdan sonra'); return ref.get(); },
          set(ref, v, o) { wrote = true; writes.push(() => ref.set(v, o)); },
          delete(ref) { wrote = true; writes.push(() => ref.delete()); },
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

/* ── Örnek Polar verisi ─────────────────────────────────────────────────── */
const NIGHT = { polar_user: API + '/users/777', date: '2026-11-01', sleep_start_time: '2026-10-31T23:40:00+03:00',
  sleep_end_time: '2026-11-01T07:10:00+03:00', device_id: 'D1', continuity: 3.8, continuity_class: 4, light_sleep: 14000,
  deep_sleep: 5400, rem_sleep: 6000, unrecognized_sleep_stage: 600, sleep_score: 81, total_interruption_duration: 1500,
  sleep_charge: 4, sleep_rating: 3, sleep_goal: 28800, sleep_cycles: 5, hypnogram: { '23:40': 1, '23:55': 2 } };
const RECHARGE = { polar_user: API + '/users/777', date: '2026-11-01', heart_rate_avg: 52, beat_to_beat_avg: 1150,
  heart_rate_variability_avg: 68, breathing_rate_avg: 14.2, nightly_recharge_status: 4, ans_charge: 3.1, ans_charge_status: 4 };
const EXERCISE = { id: 'Ex/1+a', upload_time: '2026-11-01T19:05:00Z', polar_user: API + '/users/777', device: 'Polar Loop',
  start_time: '2026-11-01T18:00:00', start_time_utc_offset: 180, duration: 'PT1H2M30S', calories: 640, distance: 0,
  heart_rate: { average: 141, maximum: 182 }, training_load: 95.5, sport: 'BASKETBALL',
  training_load_pro: { 'cardio-load': 88.2, 'muscle-load': null },
  heart_rate_zones: [{ index: 1, 'lower-limit': 95, 'upper-limit': 114, 'in-zone': 'PT10M' }, { index: 2, 'lower-limit': 114, 'upper-limit': 133, 'in-zone': 'PT20M30S' }] };
const SUMMARY_OLD = { id: 1, 'polar-user': API + '/users/777', date: '2026-11-01', created: '2026-11-01T12:00:00.000', calories: 1500, 'active-calories': 400, duration: 'PT8H', 'active-steps': 5000 };
const SUMMARY_NEW = Object.assign({}, SUMMARY_OLD, { id: 2, created: '2026-11-01T22:00:00.000', calories: 2400, 'active-calories': 900, duration: 'PT15H', 'active-steps': 11234 });

/* ── Sahte Polar ─────────────────────────────────────────────────────────── */
function fakePolar(events, over) {
  const TX = API + '/users/777/activity-transactions/55';
  const routes = Object.assign({
    'GET /users/sleep': () => ({ status: 200, body: { nights: [NIGHT] } }),
    'GET /users/nightly-recharge': () => ({ status: 200, body: { recharges: [RECHARGE] } }),
    'GET /exercises?zones=true': () => ({ status: 200, body: [EXERCISE] }),
    'GET /users/cardio-load/': () => ({ status: 404, body: null }),
    'POST /users/777/activity-transactions': () => ({ status: 201, body: { 'transaction-id': 55, 'resource-uri': TX } }),
    'GET /users/777/activity-transactions/55': () => ({ status: 200, body: { 'activity-log': [TX + '/activities/1', TX + '/activities/2'] } }),
    'GET /users/777/activity-transactions/55/activities/1': () => ({ status: 200, body: SUMMARY_OLD }),
    'GET /users/777/activity-transactions/55/activities/2': () => ({ status: 200, body: SUMMARY_NEW }),
    'PUT /users/777/activity-transactions/55': () => ({ status: 200, body: null }),
    'GET /users/777': () => ({ status: 200, body: { 'polar-user-id': 777, 'member-id': 'm', 'registration-date': '2026-11-01T10:00:00.000Z', 'first-name': 'Emir', 'last-name': 'Papur', birthdate: '2008-01-01', weight: 70 } }),
  }, over || {});
  const calls = [];
  const fetch = async (url, init) => {
    const method = (init && init.method) || 'GET';
    const path = url.startsWith(API) ? url.slice(API.length) : url;
    calls.push({ method, path, auth: init && init.headers && init.headers.Authorization });
    if (method === 'PUT') events.push('commit');
    const fn = routes[method + ' ' + path];
    const r = fn ? fn() : { status: 404, body: null };
    if (r instanceof Error) throw r;
    return { status: r.status, headers: { get: k => (r.headers || {})[k.toLowerCase()] || null }, text: async () => (r.body == null ? '' : JSON.stringify(r.body)) };
  };
  return { fetch, calls };
}

function setup(over) {
  const events = [];
  const db = fakeDb(events);
  db.put('polar_links', 'coach1__ath1', { coachUid: 'coach1', teamId: 'team1', athleteId: 'ath1', status: 'active', polarUserId: '777' });
  db.put('polar_tokens', '777', { polarUserId: '777', linkId: 'coach1__ath1', enc: pc.encrypt('AT-777', KEY, '777') });
  db.put('polar_users', '777', { polarUserId: '777', linkId: 'coach1__ath1', coachUid: 'coach1', athleteId: 'ath1' });
  db.put('kullanici_verileri', 'coach1', { userId: 'coach1', rev: 9 });
  let clock = Date.parse('2026-11-02T08:00:00Z');
  const polar = fakePolar(events, over && over.routes);
  const waits = [];
  const deps = {
    db, fetch: polar.fetch, cfg: C.settings({ POLAR_CLIENT_SECRET: 'x', POLAR_TOKEN_KEY: KEY }), docIdField: '__docid__',
    now: () => clock, log: () => {}, sleep: async ms => { waits.push(ms); },
    verifyIdToken: async tok => ({ 'tok-coach1': { uid: 'coach1', firebase: {} }, 'tok-coach2': { uid: 'coach2', firebase: {} },
      'tok-staff': { uid: 'anonS', firebase: { sign_in_provider: 'anonymous' } } })[tok] || Promise.reject(new Error('x')),
  };
  return { db, deps, polar, events, waits, tick: ms => { clock += ms; } };
}

function fakeRes() {
  const r = { statusCode: 200, headers: {}, body: '' };
  r.status = c => { r.statusCode = c; return r; };
  r.set = (k, v) => { r.headers[k.toLowerCase()] = v; return r; };
  r.send = b => { r.body = b; r.headersSent = true; return r; };
  return r;
}
async function syncReq(env, tok = 'tok-coach1', athleteId = 'ath1') {
  const res = fakeRes();
  await handle({ method: 'POST', path: '/sync', query: {}, body: { athleteId }, headers: { authorization: 'Bearer ' + tok } }, res, env.deps);
  return { status: res.statusCode, json: JSON.parse(res.body) };
}

/* ═══ Normalleştirme ══════════════════════════════════════════════════════ */
section('Polar · alan eşlemesi (yalnızca gelen alanlar)');

t('ISO 8601 süre → saniye', () => {
  assert.strictEqual(N.isoDurationSec('PT1H2M30S'), 3750);
  assert.strictEqual(N.isoDurationSec('PT45.5S'), 45.5);
  assert.strictEqual(N.isoDurationSec('PT10M'), 600);
  assert.strictEqual(N.isoDurationSec('P1DT1H'), 90000);
  assert.strictEqual(N.isoDurationSec('saçma'), null);
  assert.strictEqual(N.isoDurationSec('PT'), null);
  assert.strictEqual(N.isoDurationSec(null), null);
});

t('uyku: evreler, skor, süreklilik; toplam uyku "türetilmiş" olarak işaretli', () => {
  const s = N.sleep(NIGHT);
  assert.strictEqual(s.sleepScore, 81);
  assert.strictEqual(s.deepSec, 5400);
  assert.strictEqual(s.continuity, 3.8);
  assert.strictEqual(s.asleepSec, 14000 + 5400 + 6000 + 600);
  assert.deepStrictEqual(s.derived, ['asleepSec']);
  assert.deepStrictEqual(s.missing, []);
});

t('eksik uyku alanları uydurulmuyor: skor ve evre yoksa null + missing', () => {
  const s = N.sleep({ date: '2026-11-01', sleep_start_time: 'a', sleep_end_time: 'b', light_sleep: 100 });
  assert.strictEqual(s.sleepScore, null);
  assert.strictEqual(s.asleepSec, null, 'eksik evreyle toplam üretilmemeli');
  assert.deepStrictEqual(s.derived, []);
  for (const k of ['deepSec', 'remSec', 'sleepScore', 'continuity', 'interruptionSec', 'sleepCharge']) assert.ok(s.missing.includes(k), k);
});

t('Nightly Recharge: HRV (RMSSD), gece nabzı, solunum, ANS', () => {
  const r = N.recharge(RECHARGE);
  assert.deepStrictEqual([r.hrvMs, r.hrAvg, r.breathingRate, r.ansCharge, r.nightlyRechargeStatus], [68, 52, 14.2, 3.1, 4]);
  assert.deepStrictEqual(r.missing, []);
});

t('antrenman: süre, nabız, bölgeler, enerji, yük; gelmeyen kas yükü null', () => {
  const e = N.exercise(EXERCISE);
  assert.strictEqual(e.durationSec, 3750);
  assert.strictEqual(e.date, '2026-11-01');
  assert.deepStrictEqual([e.hrAvg, e.hrMax, e.calories, e.trainingLoad, e.cardioLoad], [141, 182, 640, 95.5, 88.2]);
  assert.strictEqual(e.muscleLoad, null);
  assert.deepStrictEqual(e.zones[1], { index: 2, lowerBpm: 114, upperBpm: 133, inZoneSec: 1230 });
  const bare = N.exercise({ id: 'x', start_time: '2026-11-01T10:00:00' });
  assert.ok(['durationSec', 'hrAvg', 'hrMax', 'calories', 'zones'].every(k => bare.missing.includes(k)));
});

t('içerik özeti anahtar sırasından bağımsız', () => {
  assert.strictEqual(N.hashOf({ a: 1, b: { c: 2, d: 3 } }), N.hashOf({ b: { d: 3, c: 2 }, a: 1 }));
  assert.notStrictEqual(N.hashOf({ a: 1 }), N.hashOf({ a: 2 }));
});

/* ═══ Senkron ═════════════════════════════════════════════════════════════ */
section('Polar · senkron: yazım, tekrar önleme, commit sırası');

ta('tam senkron: ayrı koleksiyonlar, deterministik adlar, ham veri, son senkron zamanı', async () => {
  const env = setup();
  const r = await syncReq(env);
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.json.ok, true);
  const s = env.db.get('polar_sleep', 'coach1__ath1__2026-11-01');
  assert.strictEqual(s.sleepScore, 81);
  assert.strictEqual(s.coachUid, 'coach1');
  assert.deepStrictEqual(s.raw.hypnogram, NIGHT.hypnogram);
  assert.strictEqual(env.db.get('polar_recharge', 'coach1__ath1__2026-11-01').hrvMs, 68);
  assert.deepStrictEqual(env.db.ids('polar_exercises'), ['coach1__ath1__2026-11-01__Ex-1-a']);
  // Aynı gün iki aktivite özeti: en son oluşturulan kaldı.
  const a = env.db.get('polar_activity', 'coach1__ath1__2026-11-01');
  assert.strictEqual(a.steps, 11234);
  assert.strictEqual(env.db.ids('polar_activity').length, 1);
  const link = env.db.get('polar_links', 'coach1__ath1');
  assert.strictEqual(link.lastSyncAt, Date.parse('2026-11-02T08:00:00Z'));
  assert.strictEqual(link.syncLockUntil, null);
  assert.strictEqual(link.lastSyncReport.cardioLoad.status, 'unavailable');
  assert.strictEqual(link.lastSyncReport.activity.committed, true);
  // Token yalnızca Polar API'sine, Bearer olarak.
  assert.ok(env.polar.calls.every(c => c.auth === 'Bearer AT-777'));
});

ta('commit SIRASI: aktivite önce Firestore\'a yazılıyor, sonra commit', async () => {
  const env = setup();
  await syncReq(env);
  const iw = env.events.indexOf('write:polar_activity');
  const ic = env.events.indexOf('commit');
  assert.ok(iw >= 0 && ic > iw, 'sıra: ' + env.events.join(','));
});

ta('Firestore yazımı başarısızsa commit YOK (veri Polar\'da kalır), son senkron ilerlemiyor', async () => {
  const env = setup();
  env.db.fail.batchFor = 'polar_activity';
  const r = await syncReq(env);
  assert.strictEqual(r.json.ok, false);
  assert.strictEqual(r.json.report.activity.code, 'WRITE_FAILED');
  assert.ok(!env.events.includes('commit'));
  assert.ok(!env.polar.calls.some(c => c.method === 'PUT'));
  const link = env.db.get('polar_links', 'coach1__ath1');
  assert.strictEqual(link.lastSyncAt, undefined);
  assert.strictEqual(link.lastSyncResult.ok, false);
  assert.strictEqual(link.syncLockUntil, null);
  // Diğer türler (transaction'sız) yine yazıldı.
  assert.ok(env.db.get('polar_sleep', 'coach1__ath1__2026-11-01'));
});

ta('yazım geri okunarak doğrulanamazsa commit YOK', async () => {
  const env = setup();
  env.db.fail.tamperAfterWrite = 'polar_activity';
  const r = await syncReq(env);
  assert.strictEqual(r.json.report.activity.code, 'VERIFY_FAILED');
  assert.ok(!env.polar.calls.some(c => c.method === 'PUT'));
});

ta('bir aktivite özeti okunamazsa commit YOK', async () => {
  const env = setup({ routes: { 'GET /users/777/activity-transactions/55/activities/2': () => ({ status: 404 }) } });
  const r = await syncReq(env);
  assert.strictEqual(r.json.report.activity.code, 'SUMMARY_404');
  assert.ok(!env.polar.calls.some(c => c.method === 'PUT'));
  assert.deepStrictEqual(env.db.ids('polar_activity'), []);
});

ta('yinelenen senkron: ikinci çalışma hiçbir dokümanı yeniden yazmıyor', async () => {
  const env = setup();
  await syncReq(env);
  const snapshot = JSON.stringify([...env.db.data.entries()].filter(([k]) => /^polar_(sleep|recharge|exercises)\//.test(k)));
  env.tick(sync.MANUAL_MIN_GAP_MS + 1000);
  const r = await syncReq(env, 'tok-coach1');
  assert.strictEqual(r.json.ok, true);
  for (const k of ['sleep', 'recharge', 'exercises']) assert.strictEqual(r.json.report[k].written, 0, k);
  assert.strictEqual(JSON.stringify([...env.db.data.entries()].filter(([k]) => /^polar_(sleep|recharge|exercises)\//.test(k))), snapshot);
});

ta('yeni aktivite yoksa (204) transaction açılmıyor, commit yok', async () => {
  const env = setup({ routes: { 'POST /users/777/activity-transactions': () => ({ status: 204 }) } });
  const r = await syncReq(env);
  assert.strictEqual(r.json.report.activity.count, 0);
  assert.ok(!env.polar.calls.some(c => c.method === 'PUT'));
});

ta('eksik alanlar raporlanıyor (kaç kayıtta hangi alan gelmedi)', async () => {
  const night2 = { date: '2026-10-31', sleep_start_time: 'a', sleep_end_time: 'b' };
  const env = setup({ routes: { 'GET /users/sleep': () => ({ status: 200, body: { nights: [NIGHT, night2] } }) } });
  const r = await syncReq(env);
  assert.strictEqual(r.json.report.sleep.count, 2);
  assert.strictEqual(r.json.report.sleep.missing.sleepScore, 1);
  assert.strictEqual(env.db.get('polar_sleep', 'coach1__ath1__2026-10-31').sleepScore, null);
});

/* ═══ Hatalar ═════════════════════════════════════════════════════════════ */
section('Polar · senkron: 401, 429, bağlantı hataları');

ta('401: bağlantı "revoked" işaretleniyor, token siliniyor, koça açık mesaj', async () => {
  const env = setup({ routes: { 'GET /users/sleep': () => ({ status: 401 }) } });
  const r = await syncReq(env);
  assert.strictEqual(r.status, 409);
  assert.strictEqual(r.json.error.code, 'REVOKED');
  const link = env.db.get('polar_links', 'coach1__ath1');
  assert.strictEqual(link.status, 'revoked');
  assert.strictEqual(link.syncLockUntil, null);
  assert.strictEqual(env.db.get('polar_tokens', '777'), undefined);
  // Kesilince eşleşme de temizleniyor: o Polar hesabı yeniden bağlanabilir.
  const res = fakeRes();
  await handle({ method: 'POST', path: '/disconnect', query: {}, body: { athleteId: 'ath1' }, headers: { authorization: 'Bearer tok-coach1' } }, res, env.deps);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(env.db.get('polar_users', '777'), undefined);
});

ta('429 sonra başarı: bekleyip yeniden deniyor (Retry-After\'a uyuyor)', async () => {
  let n = 0;
  const env = setup({ routes: { 'GET /users/sleep': () => (++n === 1 ? { status: 429, headers: { 'retry-after': '3' } } : { status: 200, body: { nights: [NIGHT] } }) } });
  const r = await syncReq(env);
  assert.strictEqual(r.json.ok, true);
  assert.deepStrictEqual(env.waits, [3000]);
  assert.ok(env.db.get('polar_sleep', 'coach1__ath1__2026-11-01'));
});

ta('kalıcı 429: o adım ve sonrası durur, kısmi sonuç raporlanır, kilit açılır', async () => {
  const env = setup({ routes: { 'GET /users/nightly-recharge': () => ({ status: 429 }) } });
  const r = await syncReq(env);
  assert.strictEqual(r.json.ok, false);
  assert.strictEqual(r.json.report.recharge.code, 'RATE_LIMITED');
  assert.strictEqual(r.json.report.exercises, undefined, '429 sonrası Polar yorulmamalı');
  assert.ok(env.waits.length >= 3 && env.waits.every(w => w <= 10000));
  assert.strictEqual(env.db.get('polar_links', 'coach1__ath1').syncLockUntil, null);
});

ta('geçici ağ hatası ve 5xx yeniden deneniyor', async () => {
  let n = 0;
  const env = setup({ routes: { 'GET /exercises?zones=true': () => (++n === 1 ? new Error('ECONNRESET') : n === 2 ? { status: 503 } : { status: 200, body: [EXERCISE] }) } });
  const r = await syncReq(env);
  assert.strictEqual(r.json.ok, true);
  assert.strictEqual(env.waits.length, 2);
});

ta('desteklenmeyen veri türü (404/403) hata değil, "unavailable" raporlanıyor', async () => {
  const env = setup({ routes: { 'GET /users/nightly-recharge': () => ({ status: 403 }) } });
  const r = await syncReq(env);
  assert.strictEqual(r.json.ok, true);
  assert.deepStrictEqual([r.json.report.recharge.status, r.json.report.recharge.code], ['unavailable', 'FORBIDDEN']);
});

ta('token yalnızca Polar API adresine gidiyor (transaction yanıtında yabancı adres)', async () => {
  const env = setup({ routes: { 'POST /users/777/activity-transactions': () => ({ status: 201, body: { 'resource-uri': 'https://evil.example/tx' } }) } });
  const r = await syncReq(env);
  assert.strictEqual(r.json.report.activity.status, 'error');
  assert.ok(!env.polar.calls.some(c => String(c.path).includes('evil.example')));
});

/* ═══ Yetki ve kilit ══════════════════════════════════════════════════════ */
section('Polar · senkron: yetki, kilit, mevcut veri');

ta('başka koç başka koçun sporcusunu senkronlayamıyor; Polar\'a hiç gidilmiyor', async () => {
  const env = setup();
  const r = await syncReq(env, 'tok-coach2');
  assert.strictEqual(r.status, 404);
  assert.strictEqual(env.polar.calls.length, 0);
  assert.ok(!env.db.cols().includes('polar_sleep'));
});

ta('kimliksiz istek 401', async () => {
  const env = setup();
  const r = await syncReq(env, 'forged');
  assert.strictEqual(r.status, 401);
});

ta('bağlantı aktif değilse (davet bekliyor) 409', async () => {
  const env = setup();
  env.db.put('polar_links', 'coach1__ath1', { coachUid: 'coach1', athleteId: 'ath1', status: 'pending' });
  const r = await syncReq(env);
  assert.strictEqual(r.status, 409);
  assert.strictEqual(r.json.error.code, 'NOT_ACTIVE');
});

ta('art arda manuel senkron: ikincisi 429 TOO_SOON; eşzamanlı senkron kilitle reddediliyor', async () => {
  const env = setup();
  await syncReq(env);
  const r = await syncReq(env);
  assert.strictEqual(r.status, 429);
  assert.strictEqual(r.json.error.code, 'TOO_SOON');
  env.db.put('polar_links', 'coach1__ath1', Object.assign(env.db.get('polar_links', 'coach1__ath1'), { syncLockUntil: Date.parse('2026-11-02T08:00:30Z'), lastSyncStartedAt: 0 }));
  const r2 = await syncReq(env);
  assert.strictEqual(r2.json.error.code, 'SYNC_IN_PROGRESS');
});

ta('mevcut sporcu verisine dokunulmuyor; yalnızca polar_* koleksiyonları', async () => {
  const env = setup();
  const before = env.db.get('kullanici_verileri', 'coach1');
  await syncReq(env);
  assert.deepStrictEqual(env.db.get('kullanici_verileri', 'coach1'), before);
  assert.deepStrictEqual(env.db.cols().filter(c => !c.startsWith('polar_') && c !== 'kullanici_verileri'), []);
});

/* ═══ Takım verisi (Wellness → "Verileri al") ═════════════════════════════ */
section('Polar · takım verisi: yalnızca kendi takımı, ham veri yok, tarih aralığı');

async function teamReq(env, body, tok = 'tok-coach1') {
  const res = fakeRes();
  await handle({ method: 'POST', path: '/team-data', query: {}, body, headers: { authorization: 'Bearer ' + tok } }, res, env.deps);
  return { status: res.statusCode, json: JSON.parse(res.body) };
}

ta('senkron sonrası takım verisi: bağlantı durumu + uyku/recharge/aktivite/antrenman, ham veri yok', async () => {
  const env = setup();
  await syncReq(env);
  const r = await teamReq(env, { teamId: 'team1', days: 28 });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.json.athletes.length, 1);
  const a = r.json.athletes[0];
  assert.strictEqual(a.athleteId, 'ath1');
  assert.strictEqual(a.status, 'active');
  assert.strictEqual(a.sleep[0].sleepScore, 81);
  assert.strictEqual(a.sleep[0].asleepSec, 26000);
  assert.strictEqual(a.recharge[0].hrvMs, 68);
  assert.strictEqual(a.activity[0].steps, 11234);
  assert.strictEqual(a.exercises[0].trainingLoad, 95.5);
  assert.ok(!JSON.stringify(r.json).includes('hypnogram'), 'ham veri yanıta girmemeli');
  assert.ok(!JSON.stringify(r.json).includes('AT-777'));
  // "Uyku neden yok" açıklaması için son senkronun özeti: kaç gece, en yeni tarih.
  assert.deepStrictEqual(a.lastSyncReport.sleep, { status: 'ok', count: 1, latest: '2026-11-01', code: null });
  assert.strictEqual(a.lastSyncReport.cardioLoad, undefined);
  // Bağlı Polar hesabının adı ve kayıt tarihi; doğum tarihi / kilo saklanmıyor.
  assert.deepStrictEqual(a.polarAccount, { name: 'Emir Papur', registeredAt: '2026-11-01T10:00:00.000Z' });
  const link = env.db.get('polar_links', 'coach1__ath1');
  assert.ok(!JSON.stringify(link.polarAccount).includes('2008'), 'doğum tarihi saklanmamalı');
});

ta('hesap bilgisi alınamazsa senkron yine başarılı, alan yazılmıyor', async () => {
  const env = setup({ routes: { 'GET /users/777': () => ({ status: 500 }) } });
  const r = await syncReq(env);
  assert.strictEqual(r.json.ok, true);
  assert.strictEqual(env.db.get('polar_links', 'coach1__ath1').polarAccount, undefined);
});

ta('senkron raporu: uyku uç noktası 403 → takım verisinde "unavailable / FORBIDDEN"', async () => {
  const env = setup({ routes: { 'GET /users/sleep': () => ({ status: 403, body: {} }) } });
  await syncReq(env);
  const r = await teamReq(env, { teamId: 'team1', days: 28 });
  assert.deepStrictEqual(r.json.athletes[0].lastSyncReport.sleep, { status: 'unavailable', count: 0, latest: null, code: 'FORBIDDEN' });
});

ta('tarih aralığı dışındaki kayıtlar gelmiyor; başka takımın ve başka koçun verisi gelmiyor', async () => {
  const env = setup();
  await syncReq(env);
  env.db.put('polar_sleep', 'coach1__ath1__2026-08-01', { coachUid: 'coach1', date: '2026-08-01', sleepScore: 10 });
  env.db.put('polar_links', 'coach1__ath9', { coachUid: 'coach1', teamId: 'team2', athleteId: 'ath9', status: 'active' });
  env.db.put('polar_links', 'coach2__athZ', { coachUid: 'coach2', teamId: 'team1', athleteId: 'athZ', status: 'active' });
  env.db.put('polar_sleep', 'coach2__athZ__2026-11-01', { coachUid: 'coach2', date: '2026-11-01', sleepScore: 50 });
  const r = await teamReq(env, { teamId: 'team1', days: 28 });
  assert.deepStrictEqual(r.json.athletes.map(a => a.athleteId), ['ath1']);
  assert.ok(!r.json.athletes[0].sleep.some(x => x.date === '2026-08-01'));
  const other = await teamReq(env, { teamId: 'team1', days: 28 }, 'tok-coach2');
  assert.deepStrictEqual(other.json.athletes.map(a => a.athleteId), ['athZ']);
  assert.ok(!JSON.stringify(other.json).includes('"sleepScore":81'), 'başka koçun verisi sızmamalı');
});

ta('takım verisi: kimliksiz istek 401', async () => {
  const env = setup();
  const r = await teamReq(env, { teamId: 'team1' }, 'forged');
  assert.strictEqual(r.status, 401);
});

ta('takım verisi: tek gün (from = to) ve tek sporcu süzgeci', async () => {
  const env = setup();
  await syncReq(env);
  env.db.put('polar_sleep', 'coach1__ath1__2026-10-31', { coachUid: 'coach1', date: '2026-10-31', sleepScore: 70 });
  const day = await teamReq(env, { teamId: 'team1', from: '2026-11-01', to: '2026-11-01' });
  assert.deepStrictEqual(day.json.athletes[0].sleep.map(x => x.date), ['2026-11-01']);
  assert.strictEqual(day.json.from, '2026-11-01');
  const other = await teamReq(env, { teamId: 'team1', athleteId: 'yok', days: 28 });
  assert.deepStrictEqual(other.json.athletes, []);
  const mine = await teamReq(env, { teamId: 'team1', athleteId: 'ath1', days: 28 });
  assert.deepStrictEqual(mine.json.athletes.map(a => a.athleteId), ['ath1']);
  const bad = await teamReq(env, { teamId: 'team1', from: '2026-01-01', to: '2026-11-01' });   // 92 günden uzun → days'e düşer
  assert.strictEqual(bad.json.days, 28);
});

/* ═══ Sürekli nabız → günün en düşük nabzı (RHR) ═══════════════════════════ */
section('Polar · sürekli nabız: günün en düşük nabzı (RHR)');

const HR_DAY = { polar_user: API + '/users/777', date: '2026-11-01', heart_rate_samples: [
  { heart_rate: 61, sample_time: '00:02:08' }, { heart_rate: 49, sample_time: '04:12:00' },
  { heart_rate: 0, sample_time: '04:17:00' }, { heart_rate: 132, sample_time: '18:30:00' }] };

t('günlük özet: en düşük (0 sayılmaz) + saati, en yüksek, ortalama; "türetilmiş" işaretli', () => {
  const h = N.hrDaily(HR_DAY);
  assert.deepStrictEqual([h.date, h.hrMin, h.hrMinAt, h.hrMax, h.samples], ['2026-11-01', 49, '04:12:00', 132, 3]);
  assert.strictEqual(h.hrAvg, 80.7);
  assert.ok(h.derived.includes('hrMin'));
  const none = N.hrDaily({ date: '2026-11-01', heart_rate_samples: [] });
  assert.strictEqual(none.hrMin, null);
  assert.ok(none.missing.includes('hrMin'));
});

t('uyku kaydındaki nabız örneklerinden en düşük nabız; örnek yoksa null', () => {
  const s = N.sleep(Object.assign({}, NIGHT, { heart_rate_samples: { '23:50': 58, '03:10': 47, '06:40': 0 } }));
  assert.strictEqual(s.hrMin, 47);
  assert.deepStrictEqual(s.derived, ['asleepSec', 'hrMin']);
  assert.strictEqual(N.sleep(NIGHT).hrMin, null);
});

ta('senkron: aralık ucu → polar_hr_daily, takım verisinde `hr`; kinds süzgeci', async () => {
  const env = setup({ routes: { 'GET /users/continuous-heart-rate?from=2026-10-07&to=2026-11-03': () => ({ status: 200, body: { heart_rates: [HR_DAY] } }) } });
  const r = await syncReq(env);
  assert.strictEqual(r.json.ok, true);
  const d = env.db.get('polar_hr_daily', 'coach1__ath1__2026-11-01');
  assert.strictEqual(d.hrMin, 49);
  assert.strictEqual(env.db.get('polar_links', 'coach1__ath1').lastSyncReport.hr.count, 1);
  const all = await teamReq(env, { teamId: 'team1', from: '2026-11-01', to: '2026-11-01' });
  assert.deepStrictEqual(all.json.athletes[0].hr, [{ date: '2026-11-01', hrMin: 49, hrMinAt: '04:12:00', hrMax: 132, hrAvg: 80.7, samples: 3 }]);
  assert.ok(Array.isArray(all.json.athletes[0].exercises));
  const only = await teamReq(env, { teamId: 'team1', from: '2026-11-01', to: '2026-11-01', kinds: ['hr', 'sleep'] });
  assert.deepStrictEqual(Object.keys(only.json.athletes[0]).filter(k => ['sleep', 'recharge', 'activity', 'exercises', 'hr'].includes(k)).sort(), ['hr', 'sleep']);
});

ta('aralık ucu yoksa gün gün; hiç veri yoksa senkron yine başarılı', async () => {
  const env = setup({ routes: { 'GET /users/continuous-heart-rate/2026-11-01': () => ({ status: 200, body: { heart_rate_samples: HR_DAY.heart_rate_samples } }) } });
  const r = await syncReq(env);
  assert.strictEqual(r.json.ok, true);
  assert.strictEqual(env.db.get('polar_hr_daily', 'coach1__ath1__2026-11-01').hrMin, 49);
  const bare = setup();
  const r2 = await syncReq(bare);
  assert.strictEqual(r2.json.ok, true);
  assert.strictEqual(bare.db.ids('polar_hr_daily').length, 0);
});

ta('eski uyku dokümanı (hrMin alanı yok): takım verisi ham örneklerden tamamlıyor, ham veri dönmüyor', async () => {
  const env = setup();
  env.db.put('polar_sleep', 'coach1__ath1__2026-11-01', { coachUid: 'coach1', date: '2026-11-01', sleepScore: 70, raw: { heart_rate_samples: { '02:00': 51, '03:00': 48 } } });
  const r = await teamReq(env, { teamId: 'team1', from: '2026-11-01', to: '2026-11-01' });
  assert.strictEqual(r.json.athletes[0].sleep[0].hrMin, 48);
  assert.ok(!JSON.stringify(r.json).includes('heart_rate_samples'));
});

/* ═══ Ekip üyesinin telefon sayfası (alerts.html) ═════════════════════════ */
section('Polar · ekip üyesi: uyku saatleri ve "Polar Verilerini Al"');

function staffSetup(member) {
  const env = setup();
  env.db.put('staff_links', 'STK1', { coachUid: 'coach1', teamId: 'team1', staffId: 's1' });
  env.db.put('staff_members', 'anonS', Object.assign({ coachUid: 'coach1', teamId: 'team1', staffId: 's1', token: 'STK1' }, member || {}));
  return env;
}
async function staffReq(env, route, body, tok = 'tok-staff') {
  const res = fakeRes();
  await handle({ method: 'POST', path: route, query: {}, body, headers: { authorization: 'Bearer ' + tok } }, res, env.deps);
  return { status: res.statusCode, json: JSON.parse(res.body) };
}

ta('eşleşmiş ekip üyesi: yalnızca yattı / kalktı / süre gelir, HRV / hesap / ham veri gelmez', async () => {
  const env = staffSetup();
  await syncReq(env);
  const r = await staffReq(env, '/staff-sleep', { from: '2026-11-01', to: '2026-11-01' });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.json.athletes.length, 1);
  const a = r.json.athletes[0];
  assert.strictEqual(a.athleteId, 'ath1');
  assert.strictEqual(a.status, 'active');
  assert.deepStrictEqual(a.sleep, [{ date: '2026-11-01', sleepStart: '2026-10-31T23:40:00+03:00', sleepEnd: '2026-11-01T07:10:00+03:00', asleepSec: 26000 }]);
  const txt = JSON.stringify(r.json);
  for (const k of ['recharge', 'hrvMs', 'sleepScore', 'polarAccount', 'Papur', 'hypnogram', 'exercises']) assert.ok(!txt.includes(k), k + ' ekip üyesine gitmemeli');
});

ta('ekip linki silinmiş ya da başka takımı gösteriyorsa: 403, veri yok', async () => {
  const gone = staffSetup();
  gone.db.data.delete('staff_links/STK1');
  const r1 = await staffReq(gone, '/staff-sleep', { from: '2026-11-01', to: '2026-11-01' });
  assert.strictEqual(r1.status, 403);
  assert.strictEqual(r1.json.error.code, 'NOT_STAFF');
  const forged = staffSetup({ teamId: 'team2' });   // eşleşme kaydı linkle uyuşmuyor
  const r2 = await staffReq(forged, '/staff-sleep', { from: '2026-11-01', to: '2026-11-01' });
  assert.strictEqual(r2.status, 403);
  const none = setup();                              // hiç eşleşmemiş anonim oturum
  const r3 = await staffReq(none, '/staff-sleep', { from: '2026-11-01', to: '2026-11-01' });
  assert.strictEqual(r3.status, 403);
  const r4 = await staffReq(none, '/staff-sleep', {}, 'yok');
  assert.strictEqual(r4.status, 401);
});

ta('başka takımın ekip üyesi bu takımın sporcusunu ne görür ne senkronlar', async () => {
  const env = staffSetup();
  env.db.put('staff_links', 'STK2', { coachUid: 'coach1', teamId: 'team2', staffId: 's2' });
  env.db.put('staff_members', 'anonS', { coachUid: 'coach1', teamId: 'team2', staffId: 's2', token: 'STK2' });
  await syncReq(env);
  env.tick(5 * 60 * 1000);
  const r = await staffReq(env, '/staff-sleep', { from: '2026-11-01', to: '2026-11-01' });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.json.athletes.length, 0);
  const s = await staffReq(env, '/staff-sync', { athleteId: 'ath1' });
  assert.strictEqual(s.status, 404);
});

ta('"Polar Verilerini Al": ekip üyesi kendi takımının sporcusunu senkronlar, iki dakika kuralı geçerli', async () => {
  const env = staffSetup();
  const s = await staffReq(env, '/staff-sync', { athleteId: 'ath1' });
  assert.strictEqual(s.status, 200);
  assert.strictEqual(s.json.ok, true);
  assert.ok(!('report' in s.json));
  assert.strictEqual(env.db.get('polar_sleep', 'coach1__ath1__2026-11-01').sleepScore, 81);
  const again = await staffReq(env, '/staff-sync', { athleteId: 'ath1' });
  assert.strictEqual(again.status, 429);
  assert.strictEqual(again.json.error.code, 'TOO_SOON');
});

ta('koçun uçları anonim (ekip üyesi) oturumu hâlâ reddeder', async () => {
  const env = staffSetup();
  for (const route of ['/sync', '/team-data', '/invite', '/disconnect']) {
    const r = await staffReq(env, route, { teamId: 'team1', athleteId: 'ath1' });
    assert.strictEqual(r.status, 401, route);
  }
});
