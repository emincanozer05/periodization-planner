/* ═══════════════════════════════════════════════════════════════════════════
   POLAR — Aşama 1: davet, OAuth akışı, token saklama, bağlantı kesme

   Gerçek handler.js / links.js / api.js / crypto.js; Firestore bellekte, Polar
   sahte (`fetch` taklidi). Ağ yok, production yok. Her senaryo bir HTTP isteği
   gibi handler'a giriyor ve tarayıcının göreceği yanıt (durum, sayfa, çerez,
   yönlendirme) ile Firestore'a düşen kayıtlar birlikte denetleniyor.
   ═══════════════════════════════════════════════════════════════════════════ */
const assert = require('assert');
const crypto = require('crypto');
const { section, t, ta } = require('./harness');
const C = require('../polar/config');
const pc = require('../polar/crypto');
const api = require('../polar/api');
const links = require('../polar/links');
const { handle, readCookie } = require('../polar/handler');

/* ── Sahte Firestore ─────────────────────────────────────────────────────── */
function fakeDb() {
  const data = new Map();
  const clone = v => (v == null ? v : JSON.parse(JSON.stringify(v)));
  const refFor = (col, id) => {
    const path = col + '/' + id;
    return {
      id, path,
      async get() { return { exists: data.has(path), id, data: () => clone(data.get(path)) }; },
      async set(v, o) { data.set(path, o && o.merge ? Object.assign({}, data.get(path) || {}, clone(v)) : clone(v)); },
      async delete() { data.delete(path); },
    };
  };
  let chain = Promise.resolve();
  return {
    data,
    get: (col, id) => clone(data.get(col + '/' + id)),
    put: (col, id, v) => data.set(col + '/' + id, clone(v)),
    cols: () => [...new Set([...data.keys()].map(k => k.split('/')[0]))],
    collection: col => ({ doc: id => refFor(col, id) }),
    runTransaction(fn) {
      const run = chain.then(async () => {
        const writes = [];
        let wrote = false;
        const tx = {
          async get(ref) { if (wrote) throw new Error('transaction: okuma yazımdan sonra'); return ref.get(); },
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
}

/* ── Sahte Polar ─────────────────────────────────────────────────────────── */
function fakePolar(script) {
  const s = Object.assign({
    token: () => ({ status: 200, body: { access_token: 'AT-secret-123', token_type: 'bearer', expires_in: 315359999, x_user_id: 777 } }),
    register: () => ({ status: 200, body: { 'polar-user-id': 777 } }),
    deregister: () => ({ status: 204, body: null }),
  }, script || {});
  const calls = [];
  const fetch = async (url, init) => {
    const method = (init && init.method) || 'GET';
    calls.push({ url, method, init });
    let r;
    if (url === C.POLAR.TOKEN_URL) r = s.token(init);
    else if (url === C.POLAR.API_BASE + '/users' && method === 'POST') r = s.register(init);
    else if (url.startsWith(C.POLAR.API_BASE + '/users/') && method === 'DELETE') r = s.deregister(init);
    else r = { status: 404, body: null };
    if (r instanceof Error) throw r;
    return { status: r.status, text: async () => (r.body == null ? '' : JSON.stringify(r.body)) };
  };
  return { fetch, calls };
}

/* ── İstek / yanıt taklidi ───────────────────────────────────────────────── */
function fakeRes() {
  const r = { statusCode: 200, headers: {}, body: '', headersSent: false };
  r.status = c => { r.statusCode = c; return r; };
  r.set = (k, v) => { r.headers[k.toLowerCase()] = v; return r; };
  r.send = b => { r.body = b; r.headersSent = true; return r; };
  return r;
}
async function request(deps, { method = 'GET', path, query, body, headers }) {
  const req = { method, path, query: query || {}, body: body || {}, headers: headers || {} };
  const res = fakeRes();
  await handle(req, res, deps);
  return res;
}

const KEY = crypto.randomBytes(32).toString('base64');
const TOKENS = { 'tok-coach1': { uid: 'coach1', firebase: { sign_in_provider: 'password' } },
                 'tok-coach2': { uid: 'coach2', firebase: { sign_in_provider: 'google.com' } },
                 'tok-staff':  { uid: 'staffX', firebase: { sign_in_provider: 'anonymous' } } };

function setup(over) {
  const db = fakeDb();
  db.put('alert_roster', 'coach1__team1', { coachUid: 'coach1', teamId: 'team1', teamName: 'Tofaş U18',
    athletes: [{ id: 'ath1', name: 'Ali <Yılmaz>' }, { id: 'ath2', name: 'Can Demir' }] });
  db.put('alert_roster', 'coach2__team9', { coachUid: 'coach2', teamId: 'team9', teamName: 'Başka Takım',
    athletes: [{ id: 'athZ', name: 'Zeki' }] });
  // Mevcut, Polar'la ilgisiz veri: hiçbir senaryoda değişmemeli.
  db.put('kullanici_verileri', 'coach1', { userId: 'coach1', rev: 5, n: 2 });
  let clock = Date.parse('2026-11-02T10:00:00Z');
  const polar = fakePolar(over && over.polar);
  const logs = [];
  const deps = {
    db, fetch: polar.fetch,
    verifyIdToken: async tok => { if (TOKENS[tok]) return TOKENS[tok]; throw new Error('bad token'); },
    cfg: Object.assign(C.settings({ POLAR_CLIENT_SECRET: 'client-secret-x', POLAR_TOKEN_KEY: KEY }), (over && over.cfg) || {}),
    now: () => clock,
    log: (level, event, fields) => logs.push({ level, event, fields }),
  };
  return { db, deps, polar, logs, tick: ms => { clock += ms; } };
}

const auth = tok => ({ authorization: 'Bearer ' + tok, origin: 'https://periodization-planner-rust.vercel.app' });

async function invite(env, athleteId = 'ath1', tok = 'tok-coach1', teamId = 'team1') {
  const r = await request(env.deps, { method: 'POST', path: '/invite', body: { teamId, athleteId }, headers: auth(tok) });
  const j = JSON.parse(r.body);
  const ticket = j.url ? new URL(j.url).searchParams.get('t') : null;
  return { r, j, ticket };
}

/* Sporcunun tarayıcısı: davet → "Polar ile bağlan" → Polar'ın verdiği state. */
async function startAuth(env, ticket) {
  const r = await request(env.deps, { method: 'POST', path: '/api/polar/start', body: { t: ticket } });
  const loc = r.headers.location ? new URL(r.headers.location) : null;
  const cookie = String(r.headers['set-cookie'] || '').split(';')[0];   // "__session=…"
  return { r, state: loc && loc.searchParams.get('state'), loc, cookie };
}

async function callback(env, query, cookie) {
  return request(env.deps, { method: 'GET', path: '/callback', query, headers: cookie ? { cookie } : {} });
}

async function fullLink(env, athleteId = 'ath1') {
  const { ticket } = await invite(env, athleteId);
  const s = await startAuth(env, ticket);
  return callback(env, { code: 'CODE1', state: s.state }, s.cookie);
}

/* ═══ Şifreleme ═══════════════════════════════════════════════════════════ */
section('Polar · token şifreleme (AES-256-GCM, yerleşik crypto)');

t('şifrelenen token çözülüyor; şifreli metin token\'ı içermiyor', () => {
  const box = pc.encrypt('AT-secret-123', KEY, '777');
  assert.ok(!JSON.stringify(box).includes('AT-secret-123'));
  assert.strictEqual(pc.decrypt(box, KEY, '777'), 'AT-secret-123');
});

t('başka kullanıcının dokümanına kopyalanan şifreli token çözülmüyor (AAD)', () => {
  const box = pc.encrypt('AT', KEY, '777');
  assert.throws(() => pc.decrypt(box, KEY, '778'));
});

t('yanlış anahtarla çözülmüyor; 32 bayt olmayan anahtar reddediliyor', () => {
  const box = pc.encrypt('AT', KEY, '1');
  assert.throws(() => pc.decrypt(box, crypto.randomBytes(32).toString('base64'), '1'));
  assert.throws(() => pc.encrypt('AT', Buffer.alloc(16).toString('base64'), '1'), /32/);
});

t('Polar yetkilendirme adresi: client id, redirect, scope, state', () => {
  const u = new URL(api.authorizeUrl(C.settings({}), 'S1'));
  assert.strictEqual(u.origin + u.pathname, 'https://flow.polar.com/oauth2/authorization');
  assert.strictEqual(u.searchParams.get('client_id'), C.DEFAULTS.CLIENT_ID);
  assert.strictEqual(u.searchParams.get('redirect_uri'), 'https://periodization-planner-rust.vercel.app/api/polar/callback');
  assert.strictEqual(u.searchParams.get('scope'), 'accesslink.read_all');
  assert.strictEqual(u.searchParams.get('state'), 'S1');
  assert.strictEqual(u.searchParams.get('response_type'), 'code');
});

/* ═══ Davet ═══════════════════════════════════════════════════════════════ */
section('Polar · davet (koç, ID token ile)');

ta('ID token yoksa 401; ekip üyesinin anonim oturumu da 401', async () => {
  const env = setup();
  const r1 = await request(env.deps, { method: 'POST', path: '/invite', body: { teamId: 'team1', athleteId: 'ath1' } });
  assert.strictEqual(r1.statusCode, 401);
  const r2 = await request(env.deps, { method: 'POST', path: '/invite', body: { teamId: 'team1', athleteId: 'ath1' }, headers: auth('tok-staff') });
  assert.strictEqual(r2.statusCode, 401);
  const r3 = await request(env.deps, { method: 'POST', path: '/invite', body: { teamId: 'team1', athleteId: 'ath1' }, headers: auth('forged') });
  assert.strictEqual(r3.statusCode, 401);
  assert.ok(!env.db.cols().includes('polar_links'));
});

ta('başka koçun takımındaki sporcuya davet üretilemiyor', async () => {
  const env = setup();
  const { r } = await invite(env, 'athZ', 'tok-coach1', 'team9');   // coach1 → coach2'nin takımı
  assert.strictEqual(r.statusCode, 409);
  assert.strictEqual(JSON.parse(r.body).error.code, 'ROSTER_MISSING');
  assert.strictEqual(env.db.get('polar_links', 'coach1__athZ'), undefined);
  assert.strictEqual(env.db.get('polar_links', 'coach2__athZ'), undefined);
});

ta('kadroda olmayan sporcuya davet üretilemiyor', async () => {
  const env = setup();
  const { r } = await invite(env, 'yok');
  assert.strictEqual(r.statusCode, 409);
  assert.strictEqual(JSON.parse(r.body).error.code, 'ATHLETE_NOT_FOUND');
});

ta('davet: link Vercel adresinde, ham değer saklanmıyor, bağlantı "pending"', async () => {
  const env = setup();
  const { r, j, ticket } = await invite(env);
  assert.strictEqual(r.statusCode, 200);
  assert.ok(j.url.startsWith('https://periodization-planner-rust.vercel.app/api/polar/start?t='));
  assert.ok(ticket && ticket.length >= 40);
  const link = env.db.get('polar_links', 'coach1__ath1');
  assert.strictEqual(link.status, 'pending');
  assert.strictEqual(link.coachUid, 'coach1');
  assert.strictEqual(link.ticketHash, pc.sha256(ticket));
  assert.ok(!JSON.stringify([...env.db.data.values()]).includes(ticket), 'ham davet Firestore\'da');
  assert.strictEqual(r.headers['access-control-allow-origin'], 'https://periodization-planner-rust.vercel.app');
});

ta('yeni davet eskisini geçersiz kılıyor', async () => {
  const env = setup();
  const a = await invite(env);
  const b = await invite(env);
  const old = await request(env.deps, { method: 'GET', path: '/start', query: { t: a.ticket } });
  assert.strictEqual(old.statusCode, 400);
  assert.ok(old.body.includes('Link geçersiz'));
  const cur = await request(env.deps, { method: 'GET', path: '/start', query: { t: b.ticket } });
  assert.strictEqual(cur.statusCode, 200);
});

ta('CORS ön isteği: izinli köken 204, yabancı köken başlıksız', async () => {
  const env = setup();
  const ok = await request(env.deps, { method: 'OPTIONS', path: '/invite', headers: { origin: 'https://periodization-planner.web.app' } });
  assert.strictEqual(ok.statusCode, 204);
  assert.strictEqual(ok.headers['access-control-allow-origin'], 'https://periodization-planner.web.app');
  const bad = await request(env.deps, { method: 'OPTIONS', path: '/invite', headers: { origin: 'https://evil.example' } });
  assert.strictEqual(bad.headers['access-control-allow-origin'], undefined);
});

/* ═══ Davet sayfası ve akışın başlaması ═══════════════════════════════════ */
section('Polar · davet sayfası ve yönlendirme');

ta('davet sayfası GET ile yalnızca gösteriliyor (link önizlemesi akışı başlatmıyor)', async () => {
  const env = setup();
  const { ticket } = await invite(env);
  const r = await request(env.deps, { method: 'GET', path: '/start', query: { t: ticket } });
  assert.strictEqual(r.statusCode, 200);
  assert.ok(r.body.includes('Ali &lt;Yılmaz&gt;'), 'ad kaçışlı değil');
  assert.ok(!r.body.includes('Ali <Yılmaz>'));
  assert.ok(r.body.includes('method="post"'));
  assert.ok(!env.db.cols().includes('polar_oauth_states'));
  assert.strictEqual(r.headers['referrer-policy'], 'no-referrer');
  assert.ok(String(r.headers['content-security-policy']).includes("frame-ancestors 'none'"));
});

ta('süresi geçmiş davet: sayfa ve POST reddediliyor', async () => {
  const env = setup();
  const { ticket } = await invite(env);
  env.tick(C.TICKET_TTL_MS + 1000);
  const r = await request(env.deps, { method: 'GET', path: '/start', query: { t: ticket } });
  assert.ok(r.body.includes('süresi dolmuş'));
  const p = await startAuth(env, ticket);
  assert.strictEqual(p.r.statusCode, 400);
  assert.strictEqual(p.state, null);
});

ta('POST: state + HttpOnly/Secure/SameSite=Lax çerez + Polar\'a 303', async () => {
  const env = setup();
  const { ticket } = await invite(env);
  const s = await startAuth(env, ticket);
  assert.strictEqual(s.r.statusCode, 303);
  assert.strictEqual(s.loc.host, 'flow.polar.com');
  assert.ok(s.state && s.state.length >= 40);
  const sc = String(s.r.headers['set-cookie']);
  assert.ok(/^__session=/.test(sc) && /HttpOnly/.test(sc) && /Secure/.test(sc) && /SameSite=Lax/.test(sc) && /Path=\/api\/polar/.test(sc));
  const stDoc = env.db.get('polar_oauth_states', pc.sha256(s.state));
  assert.strictEqual(stDoc.used, false);
  assert.strictEqual(stDoc.coachUid, 'coach1');
  assert.strictEqual(stDoc.athleteId, 'ath1');
});

ta('sunucu yapılandırılmamışsa sporcu Polar\'a hiç gönderilmiyor', async () => {
  const env = setup({ cfg: { clientSecret: '' } });
  const { ticket } = await invite(env);
  const s = await startAuth(env, ticket);
  assert.strictEqual(s.r.statusCode, 503);
  assert.strictEqual(s.state, null);
});

/* ═══ Callback ════════════════════════════════════════════════════════════ */
section('Polar · callback: state, CSRF, code, izin');

ta('başarılı akış: token şifreli, eşleşme kaydı, bağlantı "active", davet silindi', async () => {
  const env = setup();
  const { ticket } = await invite(env);
  const s = await startAuth(env, ticket);
  const r = await callback(env, { code: 'CODE1', state: s.state }, s.cookie);
  assert.strictEqual(r.statusCode, 200);
  assert.ok(r.body.includes('Bağlantı tamamlandı'));
  assert.ok(/Max-Age=0/.test(String(r.headers['set-cookie'])), 'çerez temizlenmedi');
  const tok = env.db.get('polar_tokens', '777');
  assert.ok(tok && tok.enc && tok.enc.ct);
  assert.ok(!JSON.stringify([...env.db.data.values()]).includes('AT-secret-123'), 'token düz metin');
  assert.strictEqual(pc.decrypt(tok.enc, KEY, '777'), 'AT-secret-123');
  assert.deepStrictEqual(
    (({ linkId, coachUid, athleteId }) => ({ linkId, coachUid, athleteId }))(env.db.get('polar_users', '777')),
    { linkId: 'coach1__ath1', coachUid: 'coach1', athleteId: 'ath1' });
  const link = env.db.get('polar_links', 'coach1__ath1');
  assert.strictEqual(link.status, 'active');
  assert.strictEqual(link.polarUserId, '777');
  assert.strictEqual(link.ticketHash, null);
  assert.ok(!link.enc && !link.accessToken, 'bağlantı satırında token olmamalı');
  assert.strictEqual(env.db.get('polar_tickets', pc.sha256(ticket)), undefined);
  // Token isteği Basic auth ile, code ve redirect_uri gövdede.
  const tc = env.polar.calls.find(c => c.url === C.POLAR.TOKEN_URL);
  assert.strictEqual(tc.init.headers.Authorization, 'Basic ' + Buffer.from(C.DEFAULTS.CLIENT_ID + ':client-secret-x').toString('base64'));
  const body = new URLSearchParams(tc.init.body);
  assert.strictEqual(body.get('grant_type'), 'authorization_code');
  assert.strictEqual(body.get('code'), 'CODE1');
  assert.strictEqual(body.get('redirect_uri'), C.DEFAULTS.REDIRECT_URI);
  // Kullanıcı kaydı yapıldı (member-id kişisel veri taşımıyor).
  const rc = env.polar.calls.find(c => c.url === C.POLAR.API_BASE + '/users');
  const mid = JSON.parse(rc.init.body)['member-id'];
  assert.ok(/^cos_/.test(mid) && !mid.includes('coach1') && !mid.includes('ath1'));
  // Log'da token / code / secret yok.
  const logTxt = JSON.stringify(env.logs);
  assert.ok(!logTxt.includes('AT-secret-123') && !logTxt.includes('CODE1') && !logTxt.includes('client-secret-x'));
});

ta('kullanıcı zaten kayıtlıysa (409) bağlantı yine kuruluyor', async () => {
  const env = setup({ polar: { register: () => ({ status: 409, body: null }) } });
  const r = await fullLink(env);
  assert.strictEqual(r.statusCode, 200);
  assert.strictEqual(env.db.get('polar_links', 'coach1__ath1').status, 'active');
  assert.strictEqual(env.db.get('polar_users', '777').memberId, null);
});

ta('hatalı (bilinmeyen) state reddediliyor, Polar\'a hiç gidilmiyor', async () => {
  const env = setup();
  const { ticket } = await invite(env);
  const s = await startAuth(env, ticket);
  const r = await callback(env, { code: 'CODE1', state: 'uydurma-state' }, s.cookie);
  assert.strictEqual(r.statusCode, 400);
  assert.ok(r.body.includes('Oturum doğrulanamadı'));
  assert.strictEqual(env.polar.calls.length, 0);
  assert.strictEqual(env.db.get('polar_links', 'coach1__ath1').status, 'pending');
});

ta('yeniden kullanılan state reddediliyor (ikinci callback token almıyor)', async () => {
  const env = setup();
  const { ticket } = await invite(env);
  const s = await startAuth(env, ticket);
  const r1 = await callback(env, { code: 'CODE1', state: s.state }, s.cookie);
  assert.strictEqual(r1.statusCode, 200);
  const before = env.polar.calls.length;
  const r2 = await callback(env, { code: 'CODE1', state: s.state }, s.cookie);
  assert.strictEqual(r2.statusCode, 400);
  assert.strictEqual(env.polar.calls.length, before);
});

ta('süresi geçmiş state reddediliyor', async () => {
  const env = setup();
  const { ticket } = await invite(env);
  const s = await startAuth(env, ticket);
  env.tick(C.STATE_TTL_MS + 1000);
  const r = await callback(env, { code: 'CODE1', state: s.state }, s.cookie);
  assert.strictEqual(r.statusCode, 400);
  assert.strictEqual(env.polar.calls.length, 0);
  assert.strictEqual(env.db.get('polar_oauth_states', pc.sha256(s.state)).used, true);
});

ta('CSRF: çerezi olmayan ya da farklı çerezli tarayıcı state\'i kullanamıyor', async () => {
  const env = setup();
  const { ticket } = await invite(env);
  const s = await startAuth(env, ticket);
  const noCookie = await callback(env, { code: 'CODE1', state: s.state }, null);
  assert.strictEqual(noCookie.statusCode, 400);
  assert.ok(noCookie.body.includes('Tarayıcı değişti'));
  // Aynı state ikinci kez (doğru çerezle bile) artık geçmiyor.
  const again = await callback(env, { code: 'CODE1', state: s.state }, s.cookie);
  assert.strictEqual(again.statusCode, 400);
  const s2 = await startAuth(env, ticket);
  const wrong = await callback(env, { code: 'CODE1', state: s2.state }, '__session=baskasinin-nonce');
  assert.strictEqual(wrong.statusCode, 400);
  assert.strictEqual(env.polar.calls.length, 0);
});

ta('kullanıcı izin vermedi (access_denied): veri yok, davet geçerli, not düşüldü', async () => {
  const env = setup();
  const { ticket } = await invite(env);
  const s = await startAuth(env, ticket);
  const r = await callback(env, { error: 'access_denied', state: s.state }, s.cookie);
  assert.strictEqual(r.statusCode, 200);
  assert.ok(r.body.includes('İzin verilmedi'));
  assert.strictEqual(env.polar.calls.length, 0);
  const link = env.db.get('polar_links', 'coach1__ath1');
  assert.strictEqual(link.status, 'pending');
  assert.strictEqual(link.lastError.code, 'DENIED');
  assert.ok(!env.db.cols().includes('polar_tokens'));
  // Fikrini değiştiren sporcu aynı linkle yeniden deneyebiliyor.
  const s2 = await startAuth(env, ticket);
  assert.strictEqual(s2.r.statusCode, 303);
});

ta('geçersiz / süresi geçmiş authorization code (invalid_grant)', async () => {
  const env = setup({ polar: { token: () => ({ status: 400, body: { error: 'invalid_grant' } }) } });
  const r = await fullLink(env);
  assert.strictEqual(r.statusCode, 400);
  assert.ok(r.body.includes('Yetkilendirme süresi doldu'));
  const link = env.db.get('polar_links', 'coach1__ath1');
  assert.strictEqual(link.status, 'pending');
  assert.strictEqual(link.lastError.code, 'INVALID_GRANT');
  assert.ok(!env.db.cols().includes('polar_tokens'));
});

ta('code yoksa token istenmiyor', async () => {
  const env = setup();
  const { ticket } = await invite(env);
  const s = await startAuth(env, ticket);
  const r = await callback(env, { state: s.state }, s.cookie);
  assert.strictEqual(r.statusCode, 400);
  assert.strictEqual(env.polar.calls.length, 0);
});

ta('Polar\'a ulaşılamıyor / 429 / 5xx: bağlantı kurulmuyor, token yazılmıyor', async () => {
  for (const tokenFn of [() => new Error('ECONNRESET'), () => ({ status: 429, body: null }), () => ({ status: 503, body: null })]) {
    const env = setup({ polar: { token: tokenFn } });
    const r = await fullLink(env);
    assert.strictEqual(r.statusCode, 502);
    assert.ok(r.body.includes('Bağlantı kurulamadı'));
    assert.strictEqual(env.db.get('polar_links', 'coach1__ath1').status, 'pending');
    assert.ok(!env.db.cols().includes('polar_tokens'));
  }
});

ta('kullanıcı kaydı başarısızsa (429/500) bağlantı kurulmuyor', async () => {
  const env = setup({ polar: { register: () => ({ status: 429, body: null }) } });
  const r = await fullLink(env);
  assert.strictEqual(r.statusCode, 502);
  assert.strictEqual(env.db.get('polar_links', 'coach1__ath1').lastError.code, 'REGISTER_RATE_LIMITED');
  assert.ok(!env.db.cols().includes('polar_tokens'));
});

ta('eksik token yanıtı (x_user_id yok) bağlantı kurmuyor', async () => {
  const env = setup({ polar: { token: () => ({ status: 200, body: { access_token: 'AT' } }) } });
  const r = await fullLink(env);
  assert.strictEqual(r.statusCode, 502);
  assert.ok(!env.db.cols().includes('polar_tokens'));
});

/* ═══ Benzersizlik ve yetki ═══════════════════════════════════════════════ */
section('Polar · benzersizlik ve başkasının verisi');

ta('bir Polar hesabı ikinci bir sporcuya bağlanamıyor; ilk bağlantı bozulmuyor', async () => {
  const env = setup();
  assert.strictEqual((await fullLink(env, 'ath1')).statusCode, 200);
  const tokBefore = env.db.get('polar_tokens', '777');
  const r = await fullLink(env, 'ath2');                 // aynı Polar kullanıcısı (777)
  assert.strictEqual(r.statusCode, 400);
  assert.ok(r.body.includes('başka bir sporcuya bağlı'));
  assert.strictEqual(env.db.get('polar_links', 'coach1__ath2').status, 'pending');
  assert.strictEqual(env.db.get('polar_links', 'coach1__ath1').status, 'active');
  assert.deepStrictEqual(env.db.get('polar_tokens', '777'), tokBefore);
  assert.strictEqual(env.db.get('polar_users', '777').linkId, 'coach1__ath1');
  // Ön kontrol kullanıcıyı kaydetmeden durdurdu: ikinci register / deregister yok.
  assert.strictEqual(env.polar.calls.filter(c => c.method === 'DELETE').length, 0);
});

ta('başka koçun sporcusuna bağlı Polar hesabı da alınamıyor', async () => {
  const env = setup();
  await fullLink(env, 'ath1');                            // coach1
  const { ticket } = await invite(env, 'athZ', 'tok-coach2', 'team9');
  const s = await startAuth(env, ticket);
  const r = await callback(env, { code: 'C2', state: s.state }, s.cookie);
  assert.strictEqual(r.statusCode, 400);
  assert.strictEqual(env.db.get('polar_users', '777').coachUid, 'coach1');
});

ta('bağlı sporcuya yeni davet üretilemiyor (bir sporcu = bir Polar hesabı)', async () => {
  const env = setup();
  await fullLink(env, 'ath1');
  const { r } = await invite(env, 'ath1');
  assert.strictEqual(r.statusCode, 409);
  assert.strictEqual(JSON.parse(r.body).error.code, 'ALREADY_LINKED');
});

ta('davet akış sırasında iptal edilirse callback bağlantı kurmuyor, kullanıcı kaydı yapılmıyor', async () => {
  const env = setup();
  const { ticket } = await invite(env);
  const s = await startAuth(env, ticket);
  // Koç o sırada daveti iptal ediyor.
  await request(env.deps, { method: 'POST', path: '/disconnect', body: { athleteId: 'ath1' }, headers: auth('tok-coach1') });
  const r = await callback(env, { code: 'CODE1', state: s.state }, s.cookie);
  assert.strictEqual(r.statusCode, 400);
  assert.ok(!env.db.cols().includes('polar_tokens'));
  assert.ok(!env.polar.calls.some(c => c.url === C.POLAR.API_BASE + '/users'));
});

ta('başka koç, başka koçun sporcusunun bağlantısını kesemiyor', async () => {
  const env = setup();
  await fullLink(env, 'ath1');
  const r = await request(env.deps, { method: 'POST', path: '/disconnect', body: { athleteId: 'ath1' }, headers: auth('tok-coach2') });
  assert.strictEqual(r.statusCode, 404);
  assert.strictEqual(env.db.get('polar_links', 'coach1__ath1').status, 'active');
  assert.ok(env.db.get('polar_tokens', '777'));
  assert.strictEqual(env.polar.calls.filter(c => c.method === 'DELETE').length, 0);
});

/* ═══ Bağlantı kesme ══════════════════════════════════════════════════════ */
section('Polar · bağlantının kesilmesi');

ta('bağlantı kesme: Polar\'da kayıt silindi, token ve eşleşme silindi, durum "disconnected"', async () => {
  const env = setup();
  await fullLink(env, 'ath1');
  const r = await request(env.deps, { method: 'POST', path: '/disconnect', body: { athleteId: 'ath1' }, headers: auth('tok-coach1') });
  assert.strictEqual(r.statusCode, 200);
  assert.strictEqual(JSON.parse(r.body).remote, 'deregistered');
  const del = env.polar.calls.find(c => c.method === 'DELETE');
  assert.strictEqual(del.url, C.POLAR.API_BASE + '/users/777');
  assert.strictEqual(del.init.headers.Authorization, 'Bearer AT-secret-123');
  assert.strictEqual(env.db.get('polar_tokens', '777'), undefined);
  assert.strictEqual(env.db.get('polar_users', '777'), undefined);
  const link = env.db.get('polar_links', 'coach1__ath1');
  assert.strictEqual(link.status, 'disconnected');
  assert.strictEqual(link.lastPolarUserId, '777');
  // Kesildikten sonra aynı Polar hesabı başka bir sporcuya bağlanabiliyor.
  assert.strictEqual((await fullLink(env, 'ath2')).statusCode, 200);
});

ta('sporcu izni Polar\'da zaten kaldırmışsa (401) bağlantı yine temizleniyor', async () => {
  const env = setup({ polar: { deregister: () => ({ status: 401, body: null }) } });
  await fullLink(env, 'ath1');
  const r = await request(env.deps, { method: 'POST', path: '/disconnect', body: { athleteId: 'ath1' }, headers: auth('tok-coach1') });
  assert.strictEqual(r.statusCode, 200);
  assert.strictEqual(JSON.parse(r.body).remote, 'already_gone');
  assert.strictEqual(env.db.get('polar_links', 'coach1__ath1').status, 'disconnected');
});

ta('Polar\'a ulaşılamazsa hiçbir şey silinmiyor (koç tekrar dener)', async () => {
  let fail = false;
  const env = setup({ polar: { deregister: () => (fail ? new Error('ETIMEDOUT') : { status: 204 }) } });
  await fullLink(env, 'ath1');
  fail = true;
  const r = await request(env.deps, { method: 'POST', path: '/disconnect', body: { athleteId: 'ath1' }, headers: auth('tok-coach1') });
  assert.strictEqual(r.statusCode, 502);
  assert.strictEqual(env.db.get('polar_links', 'coach1__ath1').status, 'active');
  assert.ok(env.db.get('polar_tokens', '777'));
});

ta('bekleyen daveti iptal etmek linki geçersiz kılıyor', async () => {
  const env = setup();
  const { ticket } = await invite(env);
  const r = await request(env.deps, { method: 'POST', path: '/disconnect', body: { athleteId: 'ath1' }, headers: auth('tok-coach1') });
  assert.strictEqual(r.statusCode, 200);
  assert.strictEqual(JSON.parse(r.body).remote, 'none');
  const page = await request(env.deps, { method: 'GET', path: '/start', query: { t: ticket } });
  assert.strictEqual(page.statusCode, 400);
});

/* ═══ Mevcut veri ═════════════════════════════════════════════════════════ */
section('Polar · mevcut veriye dokunulmuyor');

ta('tam akış + kesme sonrası yalnızca polar_* koleksiyonları yazılmış; mevcut kayıtlar aynı', async () => {
  const env = setup();
  const before = { k: env.db.get('kullanici_verileri', 'coach1'), r: env.db.get('alert_roster', 'coach1__team1') };
  await fullLink(env, 'ath1');
  await request(env.deps, { method: 'POST', path: '/disconnect', body: { athleteId: 'ath1' }, headers: auth('tok-coach1') });
  assert.deepStrictEqual(env.db.get('kullanici_verileri', 'coach1'), before.k);
  assert.deepStrictEqual(env.db.get('alert_roster', 'coach1__team1'), before.r);
  const foreign = env.db.cols().filter(c => !c.startsWith('polar_') && !['kullanici_verileri', 'alert_roster'].includes(c));
  assert.deepStrictEqual(foreign, []);
});

t('çerez okuyucu: birden çok çerez, boşluk, kodlama', () => {
  assert.strictEqual(readCookie({ headers: { cookie: 'a=1; __session=x%2By; b=2' } }, '__session'), 'x+y');
  assert.strictEqual(readCookie({ headers: {} }, '__session'), '');
});

ta('Polar hata sınıfları: 429 → RATE_LIMITED, 401 → UNAUTHORIZED', async () => {
  const p = fakePolar({ register: () => ({ status: 429 }) });
  await assert.rejects(api.registerUser({ fetch: p.fetch, accessToken: 'x', memberId: 'm' }), e => e.code === 'RATE_LIMITED');
  const q = fakePolar({ register: () => ({ status: 401 }) });
  await assert.rejects(api.registerUser({ fetch: q.fetch, accessToken: 'x', memberId: 'm' }), e => e.code === 'UNAUTHORIZED');
});
