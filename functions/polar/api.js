/* ═══════════════════════════════════════════════════════════════════════════
   POLAR — AccessLink v3 HTTP çağrıları (token değişimi, kullanıcı kaydı, kayıt silme)

   `fetch` dışarıdan veriliyor: testler sahte bir Polar ile, ağa çıkmadan çalışıyor.
   Token, code ve secret hiçbir hata mesajına ya da log satırına girmiyor; hata
   yalnızca bir kod ve HTTP durumu taşıyor.
   ═══════════════════════════════════════════════════════════════════════════ */
const { POLAR, HTTP_TIMEOUT_MS } = require('./config');

class PolarError extends Error {
  /* code: INVALID_GRANT · CLIENT_AUTH · BAD_REQUEST · UNAUTHORIZED · RATE_LIMITED ·
           UPSTREAM · NETWORK · BAD_RESPONSE · NOT_CONFIGURED */
  constructor(code, status, message) {
    super(message || code);
    this.code = code;
    this.status = status || 0;
  }
}

function timeoutSignal() {
  try { return AbortSignal.timeout(HTTP_TIMEOUT_MS); } catch (e) { return undefined; }
}

async function call(fetchFn, url, init) {
  let r;
  try {
    r = await fetchFn(url, Object.assign({ signal: timeoutSignal() }, init));
  } catch (e) {
    throw new PolarError('NETWORK', 0, 'Polar sunucusuna ulaşılamadı.');
  }
  let text = '';
  try { text = await r.text(); } catch (e) { text = ''; }
  let json = null;
  if (text) { try { json = JSON.parse(text); } catch (e) { json = null; } }
  return { status: r.status, ok: r.status >= 200 && r.status < 300, json };
}

function upstream(status) {
  if (status === 429) return new PolarError('RATE_LIMITED', status, 'Polar istek sınırına ulaşıldı.');
  if (status === 401 || status === 403) return new PolarError('UNAUTHORIZED', status, 'Polar erişimi reddetti.');
  return new PolarError('UPSTREAM', status, `Polar beklenmeyen bir yanıt verdi (${status}).`);
}

/* Authorization code → erişim token'ı. Basic auth: client id + secret. */
async function exchangeCode({ fetch: fetchFn, cfg, code }) {
  if (!cfg.clientId || !cfg.clientSecret) throw new PolarError('NOT_CONFIGURED', 0, 'Polar client bilgileri sunucuda tanımlı değil.');
  const body = new URLSearchParams({ grant_type: 'authorization_code', code: String(code), redirect_uri: cfg.redirectUri });
  const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64');
  const r = await call(fetchFn, POLAR.TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + basic,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json;charset=UTF-8',
    },
    body: body.toString(),
  });
  if (!r.ok) {
    const err = String((r.json && r.json.error) || '');
    if (err === 'invalid_client' || r.status === 401) throw new PolarError('CLIENT_AUTH', r.status, 'Polar client kimliği reddedildi.');
    if (err === 'invalid_grant') throw new PolarError('INVALID_GRANT', r.status, 'Yetkilendirme kodu geçersiz ya da süresi dolmuş.');
    if (r.status === 400) throw new PolarError('BAD_REQUEST', r.status, 'Polar token isteğini kabul etmedi.');
    throw upstream(r.status);
  }
  const j = r.json || {};
  if (!j.access_token || j.x_user_id == null || String(j.x_user_id) === '') {
    throw new PolarError('BAD_RESPONSE', r.status, 'Polar token yanıtı eksik.');
  }
  const expiresIn = Number(j.expires_in);
  return {
    accessToken: String(j.access_token),
    tokenType: String(j.token_type || 'bearer'),
    expiresIn: Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : null,
    polarUserId: String(j.x_user_id),
    // Yanıtta refresh token varsa (v3'te beklenmiyor) yalnızca VARLIĞI not ediliyor.
    hasRefreshToken: !!j.refresh_token,
  };
}

function bearer(accessToken) {
  return { Authorization: 'Bearer ' + accessToken, Accept: 'application/json', 'Content-Type': 'application/json' };
}

/* Kullanıcı kaydı — bu adım olmadan hiçbir veri çekilemez. 409 = zaten kayıtlı: geçerli durum. */
async function registerUser({ fetch: fetchFn, accessToken, memberId }) {
  const r = await call(fetchFn, POLAR.API_BASE + '/users', {
    method: 'POST', headers: bearer(accessToken), body: JSON.stringify({ 'member-id': memberId }),
  });
  if (r.ok) return { registered: true, already: false };
  if (r.status === 409) return { registered: true, already: true };
  throw upstream(r.status);
}

/* Kayıt silme — Polar tarafında bu client'ın token'ını da iptal ediyor.
   401/403/404: kullanıcı izni zaten kaldırmış ya da kayıt yok — sonuç aynı. */
async function deregisterUser({ fetch: fetchFn, accessToken, polarUserId }) {
  const r = await call(fetchFn, POLAR.API_BASE + '/users/' + encodeURIComponent(polarUserId), {
    method: 'DELETE', headers: bearer(accessToken),
  });
  if (r.ok) return { removed: true, gone: false };
  if (r.status === 401 || r.status === 403 || r.status === 404) return { removed: true, gone: true };
  throw upstream(r.status);
}

function authorizeUrl(cfg, state) {
  const p = new URLSearchParams({
    response_type: 'code', client_id: cfg.clientId, redirect_uri: cfg.redirectUri, scope: POLAR.SCOPE, state,
  });
  return POLAR.AUTHORIZE_URL + '?' + p.toString();
}

module.exports = { PolarError, exchangeCode, registerUser, deregisterUser, authorizeUrl };
