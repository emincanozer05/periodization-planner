/* ═══════════════════════════════════════════════════════════════════════════
   POLAR — veri uç noktaları için HTTP istemcisi (sporcunun token'ıyla)

   429 ve geçici hatalar (ağ, 5xx) için üstel bekleme ile yeniden deneme:
   1 sn, 2 sn, 4 sn (Retry-After daha uzunsa o, en çok 10 sn). 401 hemen düşer
   (izin kaldırılmış): yeniden denemek işe yaramaz.
   `deadline` (ms, `clock()` ile aynı saat) verilirse istemci ondan sonrasına
   taşmaz: istek zaman aşımı kalan süreye kısalır, sığmayan bekleme/yeniden deneme
   yapılmaz ve TIME_BUDGET fırlatılır. Bir sporcunun senkronu böylece function'ın
   süre sınırına çarpmaz (çarparsa Google bağlantıyı CORS başlığı olmadan keser ve
   tarayıcı bunu "Ağ hatası" olarak görür).
   ═══════════════════════════════════════════════════════════════════════════ */
const { POLAR, HTTP_TIMEOUT_MS } = require('./config');
const { PolarError } = require('./api');

const MAX_ATTEMPTS = 4;
const MAX_WAIT_MS = 10 * 1000;
const defaultSleep = ms => new Promise(r => setTimeout(r, ms));

function retryAfterMs(res, attempt) {
  const ra = res && res.headers && typeof res.headers.get === 'function' ? res.headers.get('retry-after') : null;
  const sec = ra != null && ra !== '' && Number.isFinite(+ra) ? +ra : null;
  const backoff = 1000 * Math.pow(2, attempt);
  return Math.min(MAX_WAIT_MS, sec != null ? Math.max(sec * 1000, backoff) : backoff);
}

const MIN_REQUEST_MS = 2000;   // bundan az süre kaldıysa yeni istek açılmaz

function makeClient({ fetch: fetchFn, accessToken, sleep, log, deadline, clock }) {
  const wait = sleep || defaultSleep;
  const note = log || (() => {});
  const nowMs = clock || (() => Date.now());
  const left = () => (deadline ? deadline - nowMs() : Infinity);
  const outOfTime = () => new PolarError('TIME_BUDGET', 0, 'Senkron süresi doldu; kalan veri bir sonraki senkronda alınacak.');
  async function request(method, pathOrUrl) {
    const url = /^https:\/\//.test(pathOrUrl) ? pathOrUrl : POLAR.API_BASE + pathOrUrl;
    // Yalnızca Polar'ın kendi adresine token gönder (transaction yanıtındaki URL'ler dahil).
    if (!url.startsWith(POLAR.API_BASE + '/')) throw new PolarError('BAD_RESPONSE', 0, 'Beklenmeyen kaynak adresi.');
    let last = null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (left() < MIN_REQUEST_MS) throw outOfTime();
      let res;
      try {
        let signal; try { signal = AbortSignal.timeout(Math.min(HTTP_TIMEOUT_MS, left())); } catch (e) { signal = undefined; }
        res = await fetchFn(url, { method, signal, headers: { Authorization: 'Bearer ' + accessToken, Accept: 'application/json' } });
      } catch (e) {
        last = new PolarError('NETWORK', 0, 'Polar sunucusuna ulaşılamadı.');
        const ms = 1000 * Math.pow(2, attempt);
        if (attempt < MAX_ATTEMPTS - 1 && left() - ms >= MIN_REQUEST_MS) { note('warn', 'polar_retry', { reason: 'NETWORK', attempt }); await wait(ms); continue; }
        if (attempt < MAX_ATTEMPTS - 1) throw outOfTime();
        throw last;
      }
      const status = res.status;
      if (status === 429 || status >= 500) {
        last = new PolarError(status === 429 ? 'RATE_LIMITED' : 'UPSTREAM', status, `Polar geçici olarak yanıt vermiyor (${status}).`);
        const ms = retryAfterMs(res, attempt);
        if (attempt < MAX_ATTEMPTS - 1 && left() - ms >= MIN_REQUEST_MS) { note('warn', 'polar_retry', { reason: status, attempt }); await wait(ms); continue; }
        if (attempt < MAX_ATTEMPTS - 1) throw outOfTime();
        throw last;
      }
      let text = '';
      try { text = await res.text(); } catch (e) { text = ''; }
      let json = null;
      if (text) { try { json = JSON.parse(text); } catch (e) { json = null; } }
      if (status === 401) throw new PolarError('UNAUTHORIZED', status, 'Polar erişimi reddetti (izin kaldırılmış olabilir).');
      return { status, json };
    }
    throw last;
  }
  return {
    get: p => request('GET', p),
    post: p => request('POST', p),
    put: p => request('PUT', p),
  };
}

module.exports = { makeClient, MAX_ATTEMPTS };
