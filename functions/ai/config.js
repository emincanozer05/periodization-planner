/* ═══════════════════════════════════════════════════════════════════════════
   YAPAY ZEKÂ MODEL YAPILANDIRMASI — tek yer

   Program yazma asistanının hangi modelle, hangi sırayla ve kaç kez çağrılacağı
   BURADA yazıyor ve başka hiçbir yerde yazmıyor. Router, doğrulayıcı, testler ve
   istemcinin durum metinleri bu dosyadan okur; bir model kimliği kodun başka bir
   köşesine gömülürse o köşe bir gün bu listeden farklı davranır.

   Model kimlikleri Gemini API'nin `models/{id}:generateContent` adresine olduğu
   gibi gider. Bir kimliğin gerçekten çağrılabilir olup olmadığını bu dosya
   bilmiyor ve bilmeye çalışmıyor: router, API'nin kendi model listesini
   (GET /v1beta/models — üretim çağrısı DEĞİL, bütçeden düşmez) okuyabildiğinde
   listede olmayan modeli hiç denemeden atlar; okuyamadığında gerçek çağrının
   döndürdüğü hatadan karar verir (Madde 12).
   ═══════════════════════════════════════════════════════════════════════════ */

const PRIMARY_MODEL = 'gemini-3.8-flash';

/* Sıra korunur (Madde 1). */
const FALLBACK_MODELS = Object.freeze([
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
]);

/* Model başına deneme sınırı. Ana model: ilk çağrı + en fazla 2 yeniden deneme.
   Yedek modeller: tek deneme, yeniden deneme yok (Madde 3). Regeneration da bir
   denemedir ve buradan düşer (Madde 9). */
const MODEL_ATTEMPT_LIMITS = Object.freeze(Object.assign(
  { [PRIMARY_MODEL]: 3 },
  ...FALLBACK_MODELS.map(m => ({ [m]: 1 })),
));

/* Global tavan — bütün gerçek üretim çağrıları (ilk, retry, fallback,
   regeneration) buna dahil. Model bazlı sınırlardan ÜSTÜNDÜR. */
const MAX_TOTAL_AI_CALLS = 6;

/* Doğrulayıcıdan geçemeyen yanıt için en fazla bir yeniden üretim. */
const MAX_REGENERATIONS = 1;

/* İşin tamamı için süre (ms). Son tarih geçtikten sonra yeni çağrı, retry,
   fallback ya da regeneration başlatılmaz; uçuştaki çağrı AbortController ile
   kesilir (Madde 8). */
const MAX_JOB_DURATION_MS = 120 * 1000;

/* Retry-After ya da SDK zamanlaması yoksa 429 / geçici hatalarda bekleme:
   1. retry ≈ 2 sn, 2. retry ≈ 4 sn (Madde 5). */
const RETRY_BACKOFF_MS = Object.freeze([2000, 4000]);

/* Bir çağrının son tarihten önce anlamlı bir yanıt üretebilmesi için kalması
   gereken en kısa süre. Bundan az kaldıysa çağrı hiç başlatılmaz — başlatılsa
   ya kesilecek ya da tavanı boşuna tüketecekti. */
const MIN_CALL_WINDOW_MS = 8000;

/* Tek çağrı için üst süre; kalan iş süresi bundan kısaysa o kullanılır. */
const PER_CALL_TIMEOUT_MS = 90 * 1000;

/* İstemcinin CoachOS Kural Denetleyicisi sonucunu (validateProgram) bildirmesi
   için beklenen en uzun süre. İş süresinin içinde sayılır. */
const RULE_CHECK_WAIT_MS = 30 * 1000;

/* Aynı sporcu + aynı gün + aynı kaynak seans için aktif üretim kilidinin ömrü.
   İş süresinden uzun tutuluyor ki çöken bir çalışmanın kilidi kendiliğinden
   düşsün ama sağlam bir çalışmanın kilidi onun ortasında düşmesin. */
const LOCK_TTL_MS = MAX_JOB_DURATION_MS + 60 * 1000;

/* Hesap başına saatlik iş ve proxy sınırı — sunucudaki anahtarın başka işlere
   harcanmasına karşı. */
const JOBS_PER_HOUR = 40;
const PROXY_CALLS_PER_HOUR = 120;

/* İstek boyutu tavanları (karakter). Firestore dokümanı 1 MiB'ı geçemez;
   sistem metni ve sporcu girdisi bunun altında kalmak zorunda. */
const MAX_SYSTEM_CHARS = 80 * 1000;
const MAX_USER_CHARS = 700 * 1000;
const MAX_OUTPUT_TOKENS = 16000;

/* Bağlam önbelleği (Madde 16). Yalnızca SABİT sistem talimatı önbelleğe girer;
   sporcuya ait hiçbir veri ortak önbelleğe gitmez. Anahtar içerik özetinden
   türediği için talimat değiştiğinde eski önbellek kendiliğinden geçersizleşir. */
const CONTEXT_CACHE = Object.freeze({
  enabled: true,
  minChars: 12000,            // bu uzunluğun altındaki talimat önbelleğe değmez
  ttlSeconds: 3600,
  createTimeoutMs: 6000,
});

/* Kural/talimat sürümü — önbellek anahtarına girer; elle artırmak bütün
   önbelleği bir kalemde geçersiz kılar. */
const RULESET_VERSION = 1;

module.exports = {
  PRIMARY_MODEL,
  FALLBACK_MODELS,
  MODEL_ATTEMPT_LIMITS,
  MAX_TOTAL_AI_CALLS,
  MAX_REGENERATIONS,
  MAX_JOB_DURATION_MS,
  RETRY_BACKOFF_MS,
  MIN_CALL_WINDOW_MS,
  PER_CALL_TIMEOUT_MS,
  RULE_CHECK_WAIT_MS,
  LOCK_TTL_MS,
  JOBS_PER_HOUR,
  PROXY_CALLS_PER_HOUR,
  MAX_SYSTEM_CHARS,
  MAX_USER_CHARS,
  MAX_OUTPUT_TOKENS,
  CONTEXT_CACHE,
  RULESET_VERSION,
  MODEL_CHAIN: Object.freeze([PRIMARY_MODEL, ...FALLBACK_MODELS]),
};
