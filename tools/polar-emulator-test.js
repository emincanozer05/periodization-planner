/* ═══════════════════════════════════════════════════════════════════════════
   POLAR — GERÇEK Firestore emulator'ünde sınama (elle çalıştırılır, CI'da değil)

   functions/test/ altındaki testler sahte bir Firestore kullanıyor. Bu betik aynı
   kodu gerçek emulator'e karşı çalıştırıyor: transaction kuralları (yazımdan sonra
   okuma yok), getAll/batch, `undefined` reddi, alan adları — ve firestore.rules'u
   koç oturumu taklidiyle (imzasız emulator token'ı) REST üzerinden sınıyor.
   Polar sahte; ağa çıkmaz, production'a dokunmaz (proje: demo-polar).

   Gerekenler: Java, `cd functions && npm ci`. Depo kökünden:
     npx firebase-tools emulators:exec --only firestore --project demo-polar "node tools/polar-emulator-test.js"
   ═══════════════════════════════════════════════════════════════════════════ */
const path = require('path');
const F = path.join(__dirname, '..', 'functions');
const admin = require(path.join(F, 'node_modules', 'firebase-admin'));
const crypto = require('crypto');
const C = require(F + '/polar/config'); const links = require(F + '/polar/links'); const sync = require(F + '/polar/sync');
const api = require(F + '/polar/api');
admin.initializeApp({ projectId: 'demo-polar' });
const db = admin.firestore();
const KEY = crypto.randomBytes(32).toString('base64');
const API = C.POLAR.API_BASE;
let ok = 0, bad = 0; const check = (n, c, extra) => { if (c) { ok++; console.log('  ✓ ' + n); } else { bad++; console.log('  ✗ ' + n, extra || ''); } };
const now = () => Date.now();
const NIGHT = { date: '2026-11-01', sleep_start_time: '2026-10-31T23:40:00+03:00', sleep_end_time: '2026-11-01T07:10:00+03:00', light_sleep: 14000, deep_sleep: 5400, rem_sleep: 6000, sleep_score: 81, continuity: 3.8, total_interruption_duration: 1500, sleep_charge: 4, hypnogram: { '23:40': 1 } };
const TX = API + '/users/777/activity-transactions/55';
const routes = {
  'POST https://polarremote.com/v2/oauth2/token': () => ({ status: 200, body: { access_token: 'AT-777', token_type: 'bearer', expires_in: 315359999, x_user_id: 777 } }),
  ['POST ' + API + '/users']: () => ({ status: 200, body: {} }),
  ['GET ' + API + '/users/sleep']: () => ({ status: 200, body: { nights: [NIGHT] } }),
  ['GET ' + API + '/users/nightly-recharge']: () => ({ status: 200, body: { recharges: [{ date: '2026-11-01', heart_rate_variability_avg: 68, heart_rate_avg: 52 }] } }),
  ['GET ' + API + '/exercises?zones=true']: () => ({ status: 200, body: [{ id: 'E1', start_time: '2026-11-01T18:00:00', duration: 'PT1H', heart_rate: { average: 140, maximum: 180 }, calories: 600 }] }),
  ['GET ' + API + '/users/cardio-load/']: () => ({ status: 404 }),
  ['POST ' + API + '/users/777/activity-transactions']: () => ({ status: 201, body: { 'resource-uri': TX } }),
  ['GET ' + TX]: () => ({ status: 200, body: { 'activity-log': [TX + '/activities/1'] } }),
  ['GET ' + TX + '/activities/1']: () => ({ status: 200, body: { date: '2026-11-01', created: '2026-11-01T22:00:00', 'active-steps': 11234, calories: 2400, 'active-calories': 900, duration: 'PT15H' } }),
  ['PUT ' + TX]: () => ({ status: 200 }),
};
const calls = [];
const fetch = async (url, init) => { const m = (init && init.method) || 'GET'; calls.push(m + ' ' + url); const f = routes[m + ' ' + url]; const r = f ? f() : { status: 404 };
  return { status: r.status, headers: { get: () => null }, text: async () => (r.body ? JSON.stringify(r.body) : '') }; };
const cfg = C.settings({ POLAR_CLIENT_SECRET: 's', POLAR_TOKEN_KEY: KEY });

async function rest(method, path, tokenUid, body) {
  const base = 'http://' + (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080') + '/v1/projects/demo-polar/databases/(default)/documents';
  const tok = tokenUid ? Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url') + '.' +
    Buffer.from(JSON.stringify({ sub: tokenUid, user_id: tokenUid, iat: 1, exp: 9999999999, aud: 'demo-polar', iss: 'https://securetoken.google.com/demo-polar', firebase: { sign_in_provider: 'password' } })).toString('base64url') + '.' : null;
  const r = await globalThis.fetch(base + path, { method, headers: Object.assign({ 'content-type': 'application/json' }, tok ? { authorization: 'Bearer ' + tok } : {}), body: body ? JSON.stringify(body) : undefined });
  return r.status;
}
const query = (col, uid) => ({ structuredQuery: { from: [{ collectionId: col }], where: { fieldFilter: { field: { fieldPath: 'coachUid' }, op: 'EQUAL', value: { stringValue: uid } } } } });

(async () => {
  console.log('Sunucu akışı (Admin SDK, gerçek transaction/getAll/batch)');
  await db.collection('alert_roster').doc('coach1__team1').set({ coachUid: 'coach1', teamId: 'team1', teamName: 'T', athletes: [{ id: 'ath1', name: 'A' }] });
  await db.collection('kullanici_verileri').doc('coach1').set({ userId: 'coach1', rev: 3 });
  const inv = await links.createInvite({ db, coachUid: 'coach1', teamId: 'team1', athleteId: 'ath1', now });
  const b = await links.beginAuth({ db, ticket: inv.ticket, now });
  const st = await links.consumeState({ db, state: b.state, nonce: b.nonce, now });
  const tok = await api.exchangeCode({ fetch, cfg, code: 'c' });
  await links.precheck({ db, st, polarUserId: tok.polarUserId });
  await links.completeLink({ db, st, token: tok, memberId: 'cos_x', tokenKey: KEY, now });
  check('davet → state → eşleşme gerçek Firestore transaction\'larında çalışıyor', (await db.collection('polar_links').doc('coach1__ath1').get()).data().status === 'active');
  let reused = false; try { await links.consumeState({ db, state: b.state, nonce: b.nonce, now }); } catch (e) { reused = e.code === 'STATE_REUSED'; }
  check('state ikinci kez tüketilemiyor', reused);
  const r1 = await sync.syncLink({ db, fetch, cfg, now, log: () => {}, sleep: async () => {} }, { coachUid: 'coach1', athleteId: 'ath1', manual: true });
  check('senkron gerçek Firestore\'a yazıyor (undefined yok, alan adları geçerli)', r1.ok === true, JSON.stringify(r1.report));
  check('uyku dokümanı ham hipnogramla', (await db.collection('polar_sleep').doc('coach1__ath1__2026-11-01').get()).data().raw.hypnogram['23:40'] === 1);
  check('aktivite yazıldı ve commit sonra yapıldı', (await db.collection('polar_activity').doc('coach1__ath1__2026-11-01').get()).data().steps === 11234 && calls.indexOf('PUT ' + TX) > calls.indexOf('GET ' + TX + '/activities/1'));
  await db.collection('polar_links').doc('coach1__ath1').set({ lastSyncStartedAt: 0 }, { merge: true });
  const r2 = await sync.syncLink({ db, fetch, cfg, now, log: () => {}, sleep: async () => {} }, { coachUid: 'coach1', athleteId: 'ath1', manual: true });
  check('ikinci senkron sıfır yazım', ['sleep', 'recharge', 'exercises', 'activity'].every(k => r2.report[k].written === 0), JSON.stringify(r2.report));
  const teamdata = require(F + '/polar/teamdata');
  const td = await teamdata.loadTeamData({ db, docIdField: admin.firestore.FieldPath.documentId(), now }, { coachUid: 'coach1', teamId: 'team1', days: 28 });
  const ta0 = td.athletes[0] || {};
  check('takım verisi doküman adı aralığıyla geliyor (uyku, recharge, aktivite, antrenman)', td.athletes.length === 1 && ta0.sleep.length === 1 && ta0.recharge.length === 1 && ta0.activity.length === 1 && ta0.exercises.length === 1, JSON.stringify(td).slice(0, 300));
  const td2 = await teamdata.loadTeamData({ db, docIdField: admin.firestore.FieldPath.documentId(), now }, { coachUid: 'coach2', teamId: 'team1', days: 28 });
  check('başka koç aynı takım kimliğiyle hiçbir veri almıyor', td2.athletes.length === 0);
  check('mevcut veri aynı', (await db.collection('kullanici_verileri').doc('coach1').get()).data().rev === 3);

  console.log('Güvenlik kuralları (REST, koç oturumu taklidi)');
  check('koç kendi bağlantı satırını okur', await rest('GET', '/polar_links/coach1__ath1', 'coach1') === 200);
  check('başka koç okuyamaz', await rest('GET', '/polar_links/coach1__ath1', 'coach2') === 403);
  check('oturumsuz okuyamaz', await rest('GET', '/polar_links/coach1__ath1', null) === 403);
  check('token koleksiyonu sahibine bile kapalı', await rest('GET', '/polar_tokens/777', 'coach1') === 403);
  check('eşleşme kaydı kapalı', await rest('GET', '/polar_users/777', 'coach1') === 403);
  for (const col of ['polar_sleep', 'polar_recharge', 'polar_exercises', 'polar_activity']) {
    check(col + ': sahibi coachUid sorgusuyla okur', await rest('POST', ':runQuery', 'coach1', query(col, 'coach1')) === 200);
    check(col + ': başka koç, başkasının uid\'siyle sorgulayamaz', await rest('POST', ':runQuery', 'coach2', query(col, 'coach1')) === 403);
  }
  check('başka koç uyku dokümanını adıyla okuyamaz', await rest('GET', '/polar_sleep/coach1__ath1__2026-11-01', 'coach2') === 403);
  check('sahibi bile Polar verisi YAZAMAZ', await rest('PATCH', '/polar_sleep/coach1__ath1__2026-11-01', 'coach1', { fields: { coachUid: { stringValue: 'coach1' } } }) === 403);
  check('sahibi bağlantı satırını değiştiremez', await rest('PATCH', '/polar_links/coach1__ath1', 'coach1', { fields: { coachUid: { stringValue: 'coach1' }, status: { stringValue: 'active' } } }) === 403);
  check('mevcut kural çalışıyor: kendi senkron manifesti', await rest('GET', '/kullanici_verileri/coach1', 'coach1') === 200);
  console.log(`\n${ok} geçti, ${bad} kaldı`); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
