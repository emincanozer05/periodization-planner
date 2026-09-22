/* ═══════════════════════════════════════════════════════════════════════════
   BAĞLAM ÖNBELLEĞİ (Madde 16)

   NE ÖNBELLEĞE GİRER: yalnızca SABİT sistem talimatı — CoachOS'un program yazma
   talimatı ve çıktı şeması. Her istekte aynı, sporcuya ait tek bir satır
   taşımıyor, ~20 bin karakter.
   NE GİRMEZ: sporcu profili, wellness, ağrı, yük geçmişi, antrenör talimatı,
   kulübün bilgi tabanı ve kütüphane alt kümesi. Bunlar kullanıcı mesajında,
   her çağrıda taze gönderilir. Yani bir sporcunun verisi hiçbir koşulda ortak
   bir önbelleğe yazılamaz; bilgi tabanı ya da kütüphane değiştiğinde önbellekte
   bayat kalan bir şey de olmaz.

   ANAHTAR: hesap + model + RULESET_VERSION + talimatın SHA-256 özeti. Talimat bir
   harf değişirse özet değişir, eski kayıt bir daha hiç eşleşmez (kendiliğinden
   geçersizleşme); RULESET_VERSION artırılırsa hepsi birden. Önbellek kaydı
   hesap başına tutulur, hesaplar arasında paylaşılmaz.

   GEÇERSİZ KILMA:
     • içerik özeti / sürüm değişince — anahtar eşleşmez,
     • TTL dolunca — kayıt süresi geçmiş sayılır,
     • API önbelleği reddederse (silinmiş / süresi dolmuş) — kayıt silinir ve bir
       sonraki çağrı önbelleksiz gider,
     • invalidateForUser() — hesabın bütün kayıtları elle silinir.

   En iyi çaba: önbellek kurulamazsa çağrı önbelleksiz yapılır. Önbellek kurmak
   bir ÜRETİM çağrısı değildir ve 6 çağrılık bütçeden düşmez.
   ═══════════════════════════════════════════════════════════════════════════ */
const crypto = require('crypto');
const C = require('./config');

const COL = 'ai_context_cache';
const mem = new Map();   // aynı function örneğinde tekrar okumayı önler

const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');

function cacheKey({ uid, model, system, version }) {
  return sha([uid || '-', model, version != null ? version : C.RULESET_VERSION, sha(system)].join('|')).slice(0, 40);
}

function eligible(system, cfg) {
  const c = cfg || C.CONTEXT_CACHE;
  return !!(c.enabled && String(system || '').length >= c.minChars);
}

/* Geçerli bir önbellek adı döndürür ya da null. */
async function getCachedContent({ db, gemini, apiKey, uid, model, system, now, cfg }) {
  const c = cfg || C.CONTEXT_CACHE;
  if (!eligible(system, c)) return null;
  const t = now ? now() : Date.now();
  const key = cacheKey({ uid, model, system });
  const hit = mem.get(key);
  if (hit && hit.expireAt - 60000 > t) return hit.name;
  try {
    if (db) {
      const d = await db.collection(COL).doc(key).get();
      if (d.exists) {
        const v = d.data() || {};
        if (v.name && Number(v.expireAt) - 60000 > t) { mem.set(key, v); return v.name; }
      }
    }
  } catch (e) { /* okunamadıysa yeniden kurmayı dene */ }
  const ctrl = new AbortController();
  const tm = setTimeout(() => ctrl.abort(), c.createTimeoutMs);
  let created = null;
  try {
    created = await gemini.createCachedContent({ apiKey, model, system, ttlSeconds: c.ttlSeconds, signal: ctrl.signal });
  } finally { clearTimeout(tm); }
  if (!created) return null;
  const expireAt = created.expireTime ? Date.parse(created.expireTime) : t + c.ttlSeconds * 1000;
  const rec = { name: created.name, expireAt, uid: uid || null, model, systemHash: sha(system), version: C.RULESET_VERSION };
  mem.set(key, rec);
  try { if (db) await db.collection(COL).doc(key).set(rec); } catch (e) { /* bellek kaydı yeter */ }
  return created.name;
}

async function invalidateKey({ db, gemini, apiKey, key, name }) {
  const rec = mem.get(key);
  mem.delete(key);
  try { if (db) await db.collection(COL).doc(key).delete(); } catch (e) { /* en iyi çaba */ }
  const nm = name || (rec && rec.name);
  if (nm && gemini && apiKey) await gemini.deleteCachedContent({ apiKey, name: nm });
}

async function invalidate({ db, gemini, apiKey, uid, model, system }) {
  return invalidateKey({ db, gemini, apiKey, key: cacheKey({ uid, model, system }) });
}

async function invalidateForUser({ db, gemini, apiKey, uid }) {
  for (const [k, v] of mem) if (v.uid === uid) mem.delete(k);
  if (!db) return 0;
  const qs = await db.collection(COL).where('uid', '==', uid).get();
  let n = 0;
  for (const d of qs.docs) {
    const v = d.data() || {};
    await d.ref.delete().catch(() => {});
    if (v.name && gemini && apiKey) await gemini.deleteCachedContent({ apiKey, name: v.name });
    n++;
  }
  return n;
}

module.exports = { getCachedContent, invalidate, invalidateForUser, cacheKey, eligible, _mem: mem, COL };
