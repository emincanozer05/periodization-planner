/* ═══════════════════════════════════════════════════════════════════════════
   HATA SINIFLANDIRMA — geçici mi, kalıcı mı, model mi yok?

   Router'ın bütün kararı bu üç cevaba dayanıyor (Madde 4):
     transient    → 408 / 429 / 500 / 502 / 503 / 504, ağ kopması, zaman aşımı.
                    Ana model aynı modelle yeniden denenir (bütçe izin verirse).
     unavailable  → 404, "model not found / not supported". Bu model bu anahtarla
                    yok; yeniden denemek anlamsız, sıradaki modele geçilir.
     permanent    → geçersiz anahtar, yetki, bozuk istek, şema/yapılandırma
                    hatası. Yeniden deneme yok, fallback değerlendirmesine geçilir.

   Retry zamanlaması UYDURULMUYOR (Madde 5): Gemini API iki gerçek biçim kullanıyor
     1) HTTP `Retry-After` başlığı — saniye ya da HTTP tarihi,
     2) hata gövdesindeki google.rpc.RetryInfo ayrıntısı:
          error.details[] → { "@type": "type.googleapis.com/google.rpc.RetryInfo",
                              "retryDelay": "34s" }
   İkisi de yoksa null döner ve router kendi 2 sn / 4 sn geri çekilmesini kullanır.
   ═══════════════════════════════════════════════════════════════════════════ */

const TRANSIENT_STATUS = new Set([408, 429, 500, 502, 503, 504]);

class AiCallError extends Error {
  constructor(kind, message, extra) {
    super(message);
    this.name = 'AiCallError';
    this.kind = kind;                        // 'transient' | 'unavailable' | 'permanent'
    Object.assign(this, extra || {});        // status, retryAfterMs, code
  }
}

/* "34s", "1.5s", "250ms" → ms. google.protobuf.Duration JSON biçimi saniye + "s". */
function parseDuration(v) {
  if (v == null) return null;
  if (typeof v === 'object' && v.seconds != null) {
    const ms = Number(v.seconds) * 1000 + Math.round(Number(v.nanos || 0) / 1e6);
    return Number.isFinite(ms) && ms >= 0 ? ms : null;
  }
  const m = /^\s*(\d+(?:\.\d+)?)\s*(ms|s)?\s*$/i.exec(String(v));
  if (!m) return null;
  const n = Number(m[1]);
  return Math.round((m[2] || 's').toLowerCase() === 'ms' ? n : n * 1000);
}

/* Retry-After başlığı: "120" (saniye) ya da "Wed, 21 Oct 2026 07:28:00 GMT". */
function parseRetryAfterHeader(v, nowMs) {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(Number(s) * 1000);
  const at = Date.parse(s);
  if (!Number.isFinite(at)) return null;
  return Math.max(0, at - (nowMs != null ? nowMs : Date.now()));
}

/* google.rpc.QuotaFailure — hangi kotanın dolduğu. "…PerDay…" bir günlük kota:
   dakikalar içinde açılmaz, aynı modeli yeniden denemek boşa çağrıdır. */
function dailyQuotaHit(body) {
  const details = body && body.error && Array.isArray(body.error.details) ? body.error.details : [];
  return details.some(d => d && /google\.rpc\.QuotaFailure$/.test(String(d['@type'] || ''))
    && (d.violations || []).some(v => /PerDay/i.test(String((v && (v.quotaId || v.quotaMetric)) || ''))));
}

function retryInfoFromBody(body) {
  const details = body && body.error && Array.isArray(body.error.details) ? body.error.details : [];
  for (const d of details) {
    if (d && typeof d['@type'] === 'string' && /google\.rpc\.RetryInfo$/.test(d['@type'])) {
      const ms = parseDuration(d.retryDelay);
      if (ms != null) return ms;
    }
  }
  return null;
}

/* Bir HTTP yanıtını (başarısız) sınıflandır. `headers` bir Headers nesnesi ya da
   düz nesne olabilir; `body` ayrıştırılmış JSON (yoksa null). */
function classifyHttp(status, body, headers, nowMs) {
  const msg = (body && body.error && body.error.message) || '';
  const apiStatus = (body && body.error && body.error.status) || '';
  const get = k => {
    if (!headers) return null;
    if (typeof headers.get === 'function') return headers.get(k);
    return headers[k] != null ? headers[k] : headers[String(k).toLowerCase()];
  };
  const retryAfterMs = parseRetryAfterHeader(get('retry-after'), nowMs) ?? retryInfoFromBody(body);
  const base = { status, apiStatus, retryAfterMs, detail: msg.slice(0, 300) };

  if (status === 404 || /not found|is not supported|does not exist|unsupported model/i.test(msg)) {
    return new AiCallError('unavailable', 'MODEL_UNAVAILABLE', Object.assign({ code: 'MODEL_UNAVAILABLE' }, base));
  }
  if (status === 429 && dailyQuotaHit(body)) {
    return new AiCallError('unavailable', 'QUOTA_EXHAUSTED_DAILY', Object.assign({ code: 'QUOTA_EXHAUSTED_DAILY' }, base));
  }
  if (TRANSIENT_STATUS.has(status)) {
    return new AiCallError('transient', 'HTTP_' + status, Object.assign({ code: status === 429 ? 'RATE_LIMITED' : 'HTTP_' + status }, base));
  }
  if (status === 401 || /API key not valid|api_key|API_KEY_INVALID/i.test(msg)) {
    return new AiCallError('permanent', 'AUTH_ERROR', Object.assign({ code: 'AUTH_ERROR' }, base));
  }
  if (status === 403) {
    return new AiCallError('permanent', 'PERMISSION_DENIED', Object.assign({ code: 'PERMISSION_DENIED' }, base));
  }
  if (status === 400) {
    return new AiCallError('permanent', 'INVALID_REQUEST', Object.assign({ code: 'INVALID_REQUEST' }, base));
  }
  // Tanınmayan 4xx kalıcı, tanınmayan 5xx geçici sayılır.
  if (status >= 500) return new AiCallError('transient', 'HTTP_' + status, Object.assign({ code: 'HTTP_' + status }, base));
  return new AiCallError('permanent', 'HTTP_' + status, Object.assign({ code: 'HTTP_' + status }, base));
}

/* fetch'in kendisinin fırlattığı hata: ağ, DNS, bağlantı sıfırlanması ya da
   AbortController ile kesilme. `deadlineHit` işin son tarihinin mi yoksa çağrı
   zaman aşımının mı kestiğini ayırır — son tarih kesmesi yeniden denenmez. */
function classifyThrown(err, deadlineHit) {
  if (err instanceof AiCallError) return err;
  const aborted = err && (err.name === 'AbortError' || err.name === 'TimeoutError');
  if (aborted && deadlineHit) {
    return new AiCallError('permanent', 'JOB_DEADLINE', { code: 'JOB_DEADLINE', status: null });
  }
  if (aborted) return new AiCallError('transient', 'CALL_TIMEOUT', { code: 'CALL_TIMEOUT', status: 408 });
  return new AiCallError('transient', 'NETWORK_ERROR', {
    code: 'NETWORK_ERROR', status: null, detail: String((err && err.message) || err).slice(0, 200),
  });
}

module.exports = {
  AiCallError,
  classifyHttp,
  classifyThrown,
  parseDuration,
  parseRetryAfterHeader,
  retryInfoFromBody,
  dailyQuotaHit,
  TRANSIENT_STATUS,
};
