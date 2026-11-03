/* ═══════════════════════════════════════════════════════════════════════════
   POLAR — HTTPS uç noktaları (tek function: polarApi)

   Tarayıcı akışı (sporcu, Vercel üzerinden aynı alan adında — redirect adresi orada):
     GET  /api/polar/start?t=…   davet sayfası (yalnızca gösterir)
     POST /api/polar/start       state + çerez → Polar izin sayfasına yönlendirme
     GET  /api/polar/callback    Polar dönüşü → token, kullanıcı kaydı, eşleşme

   Uygulamanın çağırdığı JSON uç noktaları (koç, Firebase ID token ile; doğrudan
   function adresine — uygulama hem vercel.app'ten hem web.app'ten açılabiliyor):
     POST /invite       { teamId, athleteId }  → { url, expiresAt }
     POST /disconnect   { athleteId }          → { remote }
     POST /sync         { athleteId }          → { ok, report, lastSyncAt }   (Aşama 2)
     POST /team-data    { teamId, days }       → takımın Polar verisi (Wellness → "Verileri al")

   Neden callback'te Firebase oturumu yok: Polar dönüşü tarayıcının düz bir
   yönlendirmesi, ID token taşıyamaz; üstelik izni veren kişi sporcu ve onun CoachOS
   hesabı yok. Kimlik, daveti üreten istekte (ID token) doğrulanıyor; state ve çerez
   bu kimliği callback'e kadar taşıyor (Madde 4).
   ═══════════════════════════════════════════════════════════════════════════ */
const { COOKIE, ALLOWED_ORIGINS } = require('./config');
const { parseKey, decrypt } = require('./crypto');
const api = require('./api');
const links = require('./links');
const sync = require('./sync');
const teamdata = require('./teamdata');
const pages = require('./pages');

/* form-action YOK, bilerek: "Polar ile bağlan" formu bize POST ediyor, biz Polar'a 303
   ile yönlendiriyoruz, Polar da giriş için kendi başka alan adlarına yönlendiriyor.
   Chrome form-action'ı yönlendirme zincirinin TAMAMINDA uyguluyor; Polar'ın zincirindeki
   herhangi bir alan adı listede yoksa düğme sessizce hiçbir yere gitmiyordu (sahada
   olan buydu). Sayfada betik yok ve formun hedefi sabit, kısıtın koruduğu bir şey yok. */
const HTML_CSP = "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'";

function baseHeaders(res) {
  res.set('Cache-Control', 'no-store');
  res.set('X-Content-Type-Options', 'nosniff');
  // Davet ve code adres çubuğunda; başka bir siteye Referer ile gitmesinler.
  res.set('Referrer-Policy', 'no-referrer');
}

function sendPage(res, status, html) {
  res.status(status);
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set('Content-Security-Policy', HTML_CSP);
  res.set('X-Frame-Options', 'DENY');
  res.send(html);
}

function sendJson(res, status, obj) {
  res.status(status);
  res.set('Content-Type', 'application/json; charset=utf-8');
  res.send(JSON.stringify(obj));
}

const jsonError = (res, status, code, message) => sendJson(res, status, { error: { code, message } });

function readCookie(req, name) {
  const raw = String((req.headers && req.headers.cookie) || '');
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) {
      try { return decodeURIComponent(part.slice(i + 1).trim()); } catch (e) { return ''; }
    }
  }
  return '';
}

const cookieAttrs = maxAge => `Max-Age=${maxAge}; Path=${COOKIE.PATH}; HttpOnly; Secure; SameSite=Lax`;
const setNonceCookie = (res, nonce) => res.set('Set-Cookie', `${COOKIE.NAME}=${encodeURIComponent(nonce)}; ${cookieAttrs(COOKIE.MAX_AGE_S)}`);
const clearNonceCookie = res => res.set('Set-Cookie', `${COOKIE.NAME}=; ${cookieAttrs(0)}`);

function routeOf(req) {
  let p = String(req.path || '/');
  if (p.startsWith('/api/polar')) p = p.slice('/api/polar'.length);   // Hosting yönlendirmesiyle gelirse
  return p.replace(/\/+$/, '') || '/';
}

function configured(cfg) {
  if (!cfg.clientId || !cfg.clientSecret) return false;
  try { parseKey(cfg.tokenKey); return true; } catch (e) { return false; }
}

/* ── Koçun kimliği ──────────────────────────────────────────────────────── */
async function authenticate(req, deps) {
  const h = String((req.headers && (req.headers.authorization || req.headers.Authorization)) || '');
  const m = /^Bearer\s+(.+)$/i.exec(h);
  if (!m) return null;
  try {
    const d = await deps.verifyIdToken(m[1].trim());
    if (!d || !d.uid) return null;
    if (d.firebase && d.firebase.sign_in_provider === 'anonymous') return null;   // ekip üyesi oturumu
    return d.uid;
  } catch (e) { return null; }
}

function cors(req, res) {
  const origin = String((req.headers && req.headers.origin) || '');
  const ok = ALLOWED_ORIGINS.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  if (ok) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'authorization, content-type');
    res.set('Access-Control-Max-Age', '600');
  }
}

const INVITE_MSG = {
  BAD_INPUT: [400, 'Geçersiz istek.'],
  ROSTER_MISSING: [409, 'Takım kadrosu henüz sunucuya ulaşmadı. Uygulama senkron olduktan birkaç saniye sonra tekrar dene.'],
  ATHLETE_NOT_FOUND: [409, 'Sporcu bu takımın sunucudaki kadrosunda görünmüyor. Birkaç saniye sonra tekrar dene.'],
  ALREADY_LINKED: [409, 'Bu sporcunun Polar bağlantısı zaten kurulu.'],
  NOT_FOUND: [404, 'Bu sporcu için bir Polar bağlantısı ya da daveti yok.'],
  NOT_ACTIVE: [409, 'Polar bağlantısı aktif değil. Önce sporcuyu bağla.'],
  SYNC_IN_PROGRESS: [409, 'Bu sporcu için senkron zaten çalışıyor. Biraz sonra tekrar dene.'],
  TOO_SOON: [429, 'Son senkron az önce yapıldı. İki dakika sonra tekrar dene.'],
  TOKEN_UNAVAILABLE: [409, 'Polar erişim bilgisi okunamadı. Bağlantıyı kesip sporcuyu yeniden bağla.'],
  REVOKED: [409, 'Sporcu Polar iznini kaldırmış. Yeniden bağlamak için yeni bir davet linki gönder.'],
};

async function jsonRoute(route, req, res, deps) {
  cors(req, res);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') return jsonError(res, 405, 'METHOD', 'Yalnızca POST.');
  const coachUid = await authenticate(req, deps);
  if (!coachUid) return jsonError(res, 401, 'UNAUTHENTICATED', 'Oturum doğrulanamadı. Sayfayı yenileyip yeniden dene.');
  const body = (req.body && typeof req.body === 'object') ? req.body : {};
  try {
    if (route === '/invite') {
      const r = await links.createInvite({ db: deps.db, coachUid, teamId: body.teamId, athleteId: body.athleteId, now: deps.now });
      deps.log('info', 'invite_created', { linkId: r.linkId });
      return sendJson(res, 200, {
        url: `${deps.cfg.publicBase}/api/polar/start?t=${encodeURIComponent(r.ticket)}`,
        expiresAt: r.expiresAt,
      });
    }
    if (route === '/team-data') {
      const r = await teamdata.loadTeamData(deps, { coachUid, teamId: body.teamId, days: body.days });
      return sendJson(res, 200, r);
    }
    if (route === '/sync') {
      const r = await sync.syncLink(deps, { coachUid, athleteId: links.cleanAthleteId(body.athleteId), manual: true });
      return sendJson(res, 200, { ok: r.ok, report: r.report, lastSyncAt: r.lastSyncAt });
    }
    // /disconnect
    const r = await links.disconnect({
      db: deps.db, coachUid, athleteId: body.athleteId, tokenKey: deps.cfg.tokenKey, decrypt, now: deps.now,
      deregister: ({ accessToken, polarUserId }) => api.deregisterUser({ fetch: deps.fetch, accessToken, polarUserId }),
    });
    deps.log('info', 'disconnected', { linkId: r.linkId, remote: r.remote });
    return sendJson(res, 200, { remote: r.remote, wasActive: r.wasActive });
  } catch (e) {
    if (e instanceof links.LinkError && INVITE_MSG[e.code]) {
      const [st, msg] = INVITE_MSG[e.code];
      return jsonError(res, st, e.code, msg);
    }
    if (e instanceof api.PolarError) {
      deps.log('warn', 'disconnect_polar_error', { code: e.code, status: e.status });
      return jsonError(res, 502, e.code, 'Polar\'a şu anda ulaşılamadı; bağlantı kesilmedi. Biraz sonra tekrar dene.');
    }
    deps.log('error', 'json_route_failed', { route, error: String((e && e.message) || e).slice(0, 200) });
    return jsonError(res, 500, 'INTERNAL', 'Beklenmeyen bir hata oluştu.');
  }
}

/* ── Davet sayfası ve akışın başlatılması ────────────────────────────────── */
const PAGE_OF_LINK_ERROR = {
  INVALID_TICKET: 'INVALID_TICKET', TICKET_EXPIRED: 'TICKET_EXPIRED', ALREADY_LINKED: 'ALREADY_LINKED',
  POLAR_USER_TAKEN: 'POLAR_USER_TAKEN', COOKIE_MISSING: 'COOKIE_MISSING',
  INVALID_STATE: 'STATE', STATE_EXPIRED: 'STATE', STATE_REUSED: 'STATE', STATE_MISMATCH: 'STATE',
  BAD_INPUT: 'INVALID_TICKET',
};
const pageKind = e => (e instanceof links.LinkError && PAGE_OF_LINK_ERROR[e.code]) || 'SERVER';
const pageStatus = kind => (kind === 'SERVER' ? 502 : kind === 'ALREADY_LINKED' ? 200 : 400);

async function startRoute(req, res, deps) {
  const ticket = String((req.method === 'POST' && req.body && req.body.t) || (req.query && req.query.t) || '');
  if (req.method === 'GET') {
    try {
      const tk = await links.loadTicket({ db: deps.db, ticket, now: deps.now });
      return sendPage(res, 200, pages.invitePage({ athleteName: tk.athleteName, teamName: tk.teamName, expiresAt: tk.expiresAt, ticket }));
    } catch (e) {
      const k = pageKind(e);
      if (k === 'SERVER') deps.log('error', 'start_get_failed', { error: String((e && e.message) || e).slice(0, 200) });
      return sendPage(res, pageStatus(k), pages.resultPage(k));
    }
  }
  if (req.method !== 'POST') return sendPage(res, 405, pages.resultPage('SERVER'));
  if (!configured(deps.cfg)) {
    // Dönüşte akışı tamamlayamayacaksak sporcuyu Polar'a hiç göndermeyelim.
    deps.log('error', 'not_configured', {});
    return sendPage(res, 503, pages.resultPage('SERVER'));
  }
  try {
    const { state, nonce, ticket: tk } = await links.beginAuth({ db: deps.db, ticket, now: deps.now });
    setNonceCookie(res, nonce);
    deps.log('info', 'auth_started', { linkId: tk.linkId });
    res.status(303);
    res.set('Location', api.authorizeUrl(deps.cfg, state));
    return res.send('');
  } catch (e) {
    const k = pageKind(e);
    if (k === 'SERVER') deps.log('error', 'start_post_failed', { error: String((e && e.message) || e).slice(0, 200) });
    return sendPage(res, pageStatus(k), pages.resultPage(k));
  }
}

/* ── Polar dönüşü ────────────────────────────────────────────────────────── */
async function callbackRoute(req, res, deps) {
  if (req.method !== 'GET') return sendPage(res, 405, pages.resultPage('SERVER'));
  const q = req.query || {};
  const nonce = readCookie(req, COOKIE.NAME);
  clearNonceCookie(res);
  const { db, now, log } = deps;

  // Kullanıcı izin vermedi (ya da Polar başka bir hata döndürdü).
  if (q.error) {
    let st = null;
    if (q.state) { try { st = await links.consumeState({ db, state: q.state, nonce, now }); } catch (e) { st = null; } }
    const denied = String(q.error) === 'access_denied';
    if (st) await links.noteFailure({ db, linkId: st.linkId, code: denied ? 'DENIED' : 'POLAR_ERROR', now });
    log('info', 'callback_error_param', { error: String(q.error).slice(0, 40), linkId: st && st.linkId });
    return sendPage(res, 200, pages.resultPage(denied ? 'DENIED' : 'SERVER'));
  }

  let st;
  try {
    st = await links.consumeState({ db, state: q.state, nonce, now });
  } catch (e) {
    const k = pageKind(e);
    log('warn', 'callback_state_rejected', { code: e && e.code });
    return sendPage(res, pageStatus(k), pages.resultPage(k));
  }
  const fail = async (code, kind, status) => {
    await links.noteFailure({ db, linkId: st.linkId, code, now });
    log(kind === 'SERVER' ? 'error' : 'warn', 'callback_failed', { code, linkId: st.linkId });
    return sendPage(res, status || pageStatus(kind), pages.resultPage(kind));
  };
  if (!q.code) return fail('NO_CODE', 'STATE', 400);
  if (!configured(deps.cfg)) return fail('NOT_CONFIGURED', 'SERVER', 503);

  let token;
  try {
    token = await api.exchangeCode({ fetch: deps.fetch, cfg: deps.cfg, code: q.code });
  } catch (e) {
    const code = (e && e.code) || 'TOKEN_FAILED';
    return code === 'INVALID_GRANT' ? fail(code, 'INVALID_GRANT', 400) : fail(code, 'SERVER');
  }
  try {
    await links.precheck({ db, st, polarUserId: token.polarUserId });
  } catch (e) {
    return fail((e && e.code) || 'PRECHECK', pageKind(e));
  }

  const memberId = links.newMemberId();
  let reg;
  try {
    reg = await api.registerUser({ fetch: deps.fetch, accessToken: token.accessToken, memberId });
  } catch (e) {
    return fail('REGISTER_' + ((e && e.code) || 'FAILED'), 'SERVER');
  }

  try {
    await links.completeLink({
      db, st, token, memberId: reg.already ? null : memberId, tokenKey: deps.cfg.tokenKey, now,
    });
  } catch (e) {
    // Bu istekte YENİ kaydettiğimiz bir kullanıcıyı eşleştiremediysek kaydı geri al;
    // zaten kayıtlıysa (409) dokunma — başka bir bağlantıya ait olabilir.
    if (!reg.already) {
      try { await api.deregisterUser({ fetch: deps.fetch, accessToken: token.accessToken, polarUserId: token.polarUserId }); } catch (_) { /* en iyi çaba */ }
    }
    return fail((e && e.code) || 'LINK_FAILED', pageKind(e));
  }
  log('info', 'linked', { linkId: st.linkId, alreadyRegistered: reg.already, hasRefreshToken: token.hasRefreshToken, expiresIn: token.expiresIn });
  return sendPage(res, 200, pages.resultPage('OK'));
}

/* deps: { db, fetch, verifyIdToken, cfg, now, log } */
async function handle(req, res, deps) {
  baseHeaders(res);
  const route = routeOf(req);
  try {
    if (route === '/invite' || route === '/disconnect' || route === '/sync' || route === '/team-data') return await jsonRoute(route, req, res, deps);
    if (route === '/start') return await startRoute(req, res, deps);
    if (route === '/callback') return await callbackRoute(req, res, deps);
    res.status(404).set('Content-Type', 'text/plain; charset=utf-8').send('not found');
  } catch (e) {
    deps.log('error', 'unhandled', { route, error: String((e && e.message) || e).slice(0, 200) });
    if (!res.headersSent) sendPage(res, 500, pages.resultPage('SERVER'));
  }
}

module.exports = { handle, readCookie, routeOf };
