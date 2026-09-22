/* ═══════════════════════════════════════════════════════════════════════════
   GEMINI PROXY — uygulamanın geri kalan AI çağrıları için (Madde 17)

   Program yazıcı arka plan işi olarak job.js'ten geçiyor. Uygulamada modele soru
   soran başka yerler de var (köşedeki asistan, ayarlardaki bağlantı testi, model
   listesi, program tasarım sekmesi). Anahtar tarayıcıdan tamamen çıktığı için
   onlar da buradan, oturum açmış kullanıcının kimliğiyle ve sunucudaki anahtarla
   geçiyor. Tek çağrı, yeniden deneme yok — davranış önceki doğrudan çağrının
   aynısı, yalnızca anahtar artık tarayıcıda değil.
   ═══════════════════════════════════════════════════════════════════════════ */
const C = require('./config');
const cache = require('./context-cache');

const USER_MSG = {
  RATE_LIMITED: 'AI servisi geçici olarak yoğun. Biraz sonra tekrar dene.',
  RATE_LIMITED_USER: 'Bu saat için AI kullanım sınırına ulaşıldı. Biraz sonra tekrar dene.',
  MODEL_UNAVAILABLE: 'Seçili model şu anda kullanılamıyor. Ayarlar → Yapay Zekâ Asistanı\'ndan başka bir model seç.',
  AUTH_ERROR: 'Sunucudaki AI yapılandırması geçersiz. Yöneticiye bildir.',
  PERMISSION_DENIED: 'Sunucudaki AI anahtarının bu modele erişimi yok. Yöneticiye bildir.',
  SERVER_NOT_CONFIGURED: 'AI servisi sunucuda henüz yapılandırılmamış (GEMINI_API_KEY). Yöneticiye bildir.',
  INVALID_REQUEST: 'İstek AI servisi tarafından kabul edilmedi.',
  DEFAULT: 'AI servisine şu anda ulaşılamıyor. Biraz sonra tekrar dene.',
};

class ProxyError extends Error {
  constructor(httpsCode, code, message) { super(message); this.httpsCode = httpsCode; this.code = code; }
}

async function consumeQuota({ db, uid, now, cfg }) {
  const c = cfg || C;
  const ref = db.collection('ai_usage').doc(uid);
  return db.runTransaction(async tx => {
    const s = await tx.get(ref);
    const u = s.exists ? (s.data() || {}) : {};
    const t = now();
    const fresh = !(Number(u.proxyWindowStart) > t - 3600 * 1000);
    const n = fresh ? 0 : Number(u.proxy) || 0;
    if (n >= c.PROXY_CALLS_PER_HOUR) return false;
    tx.set(ref, { proxy: n + 1, proxyWindowStart: fresh ? t : u.proxyWindowStart }, { merge: true });
    return true;
  });
}

async function handle(data, auth, deps) {
  const { db, gemini, apiKey } = deps;
  const now = deps.now || (() => Date.now());
  const log = deps.log || (() => {});
  if (!auth || !auth.uid || auth.token && auth.token.firebase && auth.token.firebase.sign_in_provider === 'anonymous')
    throw new ProxyError('unauthenticated', 'UNAUTHENTICATED', 'Oturum açman gerekiyor.');
  if (!apiKey) throw new ProxyError('failed-precondition', 'SERVER_NOT_CONFIGURED', USER_MSG.SERVER_NOT_CONFIGURED);
  const d = data || {};
  const op = String(d.op || '');

  if (op === 'listModels') {
    const m = await gemini.listModels({ apiKey });
    if (!m) throw new ProxyError('unavailable', 'LIST_FAILED', 'Model listesi alınamadı.');
    return { models: [...m.values()] };
  }
  if (op === 'invalidateCache') {
    const n = await cache.invalidateForUser({ db, gemini, apiKey, uid: auth.uid });
    return { invalidated: n };
  }
  if (op !== 'generate') throw new ProxyError('invalid-argument', 'BAD_OP', 'Bilinmeyen işlem.');

  const model = String(d.model || '');
  if (!/^[a-z0-9][a-z0-9.\-]{1,80}$/i.test(model)) throw new ProxyError('invalid-argument', 'BAD_MODEL', 'Geçersiz model kimliği.');
  const system = String(d.system || '');
  const messages = Array.isArray(d.messages) ? d.messages.slice(-40) : [];
  const size = system.length + JSON.stringify(messages).length;
  if (size > C.MAX_USER_CHARS) throw new ProxyError('invalid-argument', 'REQUEST_TOO_LARGE', 'İstek çok büyük.');
  const ok = await consumeQuota({ db, uid: auth.uid, now });
  if (!ok) throw new ProxyError('resource-exhausted', 'RATE_LIMITED_USER', USER_MSG.RATE_LIMITED_USER);

  const g = d.generation || {};
  const t0 = now();
  const ctrl = new AbortController();
  const tm = setTimeout(() => ctrl.abort('CALL_TIMEOUT'), C.PER_CALL_TIMEOUT_MS);
  try {
    const r = await gemini.generate({ apiKey, model, system, messages, signal: ctrl.signal, now, generation: {
      maxOutputTokens: Math.min(Number(g.maxOutputTokens) || 6000, C.MAX_OUTPUT_TOKENS),
      temperature: g.temperature, json: !!g.json, thinkingBudget: g.thinkingBudget,
    } });
    log('info', 'ai_proxy_ok', { uid: auth.uid, model, elapsedMs: now() - t0 });
    if (!r.text) throw new ProxyError('unavailable', 'EMPTY_RESPONSE',
      r.finishReason && /^BLOCKED/.test(r.finishReason) ? 'İçerik güvenlik nedeniyle engellendi.' : 'Model boş yanıt döndürdü — tekrar dene.');
    return { text: r.text, finishReason: r.finishReason || null };
  } catch (e) {
    if (e instanceof ProxyError) throw e;
    log('warn', 'ai_proxy_error', { uid: auth.uid, model, kind: e && e.kind, code: e && e.code, status: e && e.status, elapsedMs: now() - t0 });
    const code = (e && e.code) || 'DEFAULT';
    const map = { RATE_LIMITED: 'resource-exhausted', MODEL_UNAVAILABLE: 'not-found', AUTH_ERROR: 'failed-precondition',
      PERMISSION_DENIED: 'permission-denied', INVALID_REQUEST: 'invalid-argument' };
    throw new ProxyError(map[code] || 'unavailable', code, USER_MSG[code] || USER_MSG.DEFAULT);
  } finally {
    clearTimeout(tm);
  }
}

module.exports = { handle, ProxyError, USER_MSG, consumeQuota };
