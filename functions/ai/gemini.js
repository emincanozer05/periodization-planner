/* ═══════════════════════════════════════════════════════════════════════════
   GEMINI REST İSTEMCİSİ — yalnızca sunucuda

   Anahtar bu dosyaya parametre olarak gelir (Secret Manager → process.env) ve
   YALNIZCA `x-goog-api-key` başlığına yazılır: URL'ye, loga, hata metnine ya da
   Firestore'a hiçbir zaman girmez (Madde 17, 20).

   Üç uç kullanılıyor, üçü de Gemini API'nin belgelenmiş REST yüzeyi:
     POST /v1beta/models/{id}:generateContent   — üretim (bütçeden düşer)
     GET  /v1beta/models                        — model listesi (üretim değil)
     POST /v1beta/cachedContents                — bağlam önbelleği (üretim değil)
   ═══════════════════════════════════════════════════════════════════════════ */
const { classifyHttp, classifyThrown, AiCallError } = require('./errors');

const API = 'https://generativelanguage.googleapis.com/v1beta';

async function readJson(r) {
  try { return await r.json(); } catch (e) { return null; }
}

/* generationConfig'i güvenli sınırlar içinde kurar. Düşünme bütçesi her modele
   gönderiliyor: Gemini düşünme belirteçlerini maxOutputTokens'tan düşüyor ve
   sınırsız bırakılınca uzun bir JSON kapanış parantezine varmadan kesiliyor. */
function buildGenerationConfig(model, gen) {
  const g = gen || {};
  const gc = {
    maxOutputTokens: Math.max(256, Math.min(Number(g.maxOutputTokens) || 8000, 16000)),
    temperature: Number.isFinite(Number(g.temperature)) ? Math.max(0, Math.min(Number(g.temperature), 1.5)) : 0.6,
  };
  if (g.json) gc.responseMimeType = 'application/json';
  if (g.thinkingBudget != null) {
    const tb = Number(g.thinkingBudget) || 0;
    gc.thinkingConfig = { thinkingBudget: (/pro/i.test(model) && tb < 128) ? 128 : tb };
  }
  return gc;
}

function toContents(messages) {
  return (messages || []).map(m => ({
    role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
    parts: Array.isArray(m.content) ? m.content : [{ text: String(m.content == null ? '' : m.content) }],
  }));
}

/* Tek bir üretim çağrısı. Başarıda { text, finishReason, usage } döner; her
   başarısızlık sınıflandırılmış bir AiCallError fırlatır. Boş aday / güvenlik
   engeli API açısından başarılı sayılır ve boş metin döner — onu reddetmek
   doğrulayıcının işi (şema hatası olarak sayılır). */
async function generate({ apiKey, model, system, messages, generation, signal, cachedContent, fetchImpl, now }) {
  const f = fetchImpl || fetch;
  const body = {
    contents: toContents(messages),
    generationConfig: buildGenerationConfig(model, generation),
  };
  if (cachedContent) body.cachedContent = cachedContent;
  else body.systemInstruction = { parts: [{ text: String(system || '') }] };
  let r;
  try {
    r = await f(`${API}/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    throw classifyThrown(e, !!(signal && signal.reason === 'JOB_DEADLINE'));
  }
  if (!r.ok) {
    const j = await readJson(r);
    const err = classifyHttp(r.status, j, r.headers, now ? now() : Date.now());
    // Önbellekle ilgili bir ret: çağıran önbelleği düşürsün diye işaretleniyor.
    if (cachedContent && /cachedContent|cached content/i.test((j && j.error && j.error.message) || '')) err.cacheRejected = true;
    throw err;
  }
  const j = await readJson(r);
  if (!j) throw new AiCallError('transient', 'EMPTY_BODY', { code: 'EMPTY_BODY', status: r.status });
  const cand = (j.candidates || [])[0];
  if (!cand) {
    const br = j.promptFeedback && j.promptFeedback.blockReason;
    return { text: '', finishReason: br ? 'BLOCKED:' + br : 'NO_CANDIDATE', usage: j.usageMetadata || null };
  }
  const text = (((cand.content || {}).parts) || []).filter(p => !p.thought).map(p => p.text || '').join('').trim();
  return { text, finishReason: cand.finishReason || null, usage: j.usageMetadata || null };
}

/* Anahtarın çağırabildiği modeller (yalnızca generateContent destekleyenler),
   id → { id, displayName, description }. Hata fırlatmaz — okunamazsa null döner
   ve router gerçek çağrının hatasından karar verir. */
async function listModels({ apiKey, signal, fetchImpl }) {
  const f = fetchImpl || fetch;
  const out = new Map();
  let token = '';
  try {
    for (let page = 0; page < 10; page++) {
      const u = `${API}/models?pageSize=1000${token ? '&pageToken=' + encodeURIComponent(token) : ''}`;
      const r = await f(u, { headers: { 'x-goog-api-key': apiKey }, signal });
      if (!r.ok) return null;
      const j = await readJson(r);
      if (!j) return null;
      (j.models || []).forEach(m => {
        const methods = m.supportedGenerationMethods || [];
        if (methods.length && !methods.includes('generateContent')) return;
        const id = String(m.name || '').replace(/^models\//, '');
        if (id && !out.has(id)) out.set(id, { id, displayName: m.displayName || id, description: m.description || '' });
      });
      token = j.nextPageToken || '';
      if (!token) break;
    }
  } catch (e) {
    return null;
  }
  return out;
}

/* Sistem talimatı için açık bağlam önbelleği oluşturur. Hata fırlatmaz. */
async function createCachedContent({ apiKey, model, system, ttlSeconds, signal, fetchImpl }) {
  const f = fetchImpl || fetch;
  try {
    const r = await f(`${API}/cachedContents`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        model: 'models/' + model,
        systemInstruction: { parts: [{ text: String(system || '') }] },
        ttl: `${Math.max(60, Number(ttlSeconds) || 3600)}s`,
      }),
      signal,
    });
    if (!r.ok) return null;
    const j = await readJson(r);
    if (!j || !j.name) return null;
    return { name: j.name, expireTime: j.expireTime || null };
  } catch (e) {
    return null;
  }
}

async function deleteCachedContent({ apiKey, name, fetchImpl }) {
  const f = fetchImpl || fetch;
  try {
    await f(`${API}/${name}`, { method: 'DELETE', headers: { 'x-goog-api-key': apiKey } });
  } catch (e) { /* en iyi çaba */ }
}

module.exports = { generate, listModels, createCachedContent, deleteCachedContent, buildGenerationConfig, toContents, API };
