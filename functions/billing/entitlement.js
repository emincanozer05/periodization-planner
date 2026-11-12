/* ═══════════════════════════════════════════════════════════════════════════
   ABONELİK — erişim kuralı (docs/yayina-hazirlik-plani.md §3)

   `billing/{ws}` belgesini yalnızca sunucu yazar. Bu dosya iki şey yapar:
     • accessFor(billing, now, cfg): bir hesabın şu an tam erişimi var mı (saf fonksiyon);
     • ensureBilling(...): belge yoksa açar — "kurucu" hesaplara comp, yenilere 14 gün deneme.

   Uygulamadaki karşılığı src/app/466-billing.jsx → billingAccess(). İkisi aynı
   girdilerle aynı sonucu vermek zorunda: functions/test/billing.test.js karşılaştırır.

   Uygulama (`enforced`): config/billing belgesindeki `enforced` bayrağı kapalıyken
   erişim her durumda tam kalır; durum yalnızca kaydedilir. Ödeme sağlayıcısı bağlanmadan
   bayrak açılmamalı: deneme süresi biten biri ödeme yapamaz, salt okunur kalırdı.
   ═══════════════════════════════════════════════════════════════════════════ */

const DAY = 24 * 3600 * 1000;
const TRIAL_DAYS = 14;
const GRACE_DAYS = 7;
const COL = 'billing';
const CONFIG_DOC = 'config/billing';

/* Bu tarihten önce açılmış hesaplar "kurucu" (comp) olur: ücretsiz, süresiz.
   config/billing.founderCutoff ile değiştirilebilir. */
const DEFAULT_FOUNDER_CUTOFF = Date.parse('2026-11-13T00:00:00Z');

const ms = v => {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v;
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (v instanceof Date) return v.getTime();
  const p = Date.parse(v);
  return Number.isFinite(p) ? p : null;
};

/* Sonuç: { full, status, reason, daysLeft }
   reason: 'comp' | 'active' | 'trial' | 'grace' | 'canceled_until_end' | 'not_enforced'
         | 'trial_ended' | 'expired' | 'none'
   daysLeft: tam erişimin bitmesine kalan gün (yukarı yuvarlanmış), süresizse null. */
function accessFor(b, now, cfg) {
  const enforced = !!(cfg && cfg.enforced);
  const t = Number(now);
  const s = (b && b.status) || 'none';
  const left = end => (end == null ? null : Math.max(0, Math.ceil((end - t) / DAY)));
  let r;
  if (s === 'comp') r = { full: true, reason: 'comp', daysLeft: null };
  else if (s === 'active') {
    const end = ms(b.currentPeriodEnd);
    r = { full: true, reason: 'active', daysLeft: left(end) };
  } else if (s === 'trialing') {
    const end = ms(b.trialEndsAt);
    r = end != null && t < end ? { full: true, reason: 'trial', daysLeft: left(end) }
                                : { full: false, reason: 'trial_ended', daysLeft: 0 };
  } else if (s === 'past_due') {
    const end = ms(b.currentPeriodEnd);
    const until = end == null ? null : end + GRACE_DAYS * DAY;
    r = until != null && t < until ? { full: true, reason: 'grace', daysLeft: left(until) }
                                   : { full: false, reason: 'expired', daysLeft: 0 };
  } else if (s === 'canceled') {
    const end = ms(b.currentPeriodEnd);
    r = end != null && t < end ? { full: true, reason: 'canceled_until_end', daysLeft: left(end) }
                               : { full: false, reason: 'expired', daysLeft: 0 };
  } else if (s === 'expired') r = { full: false, reason: 'expired', daysLeft: 0 };
  else r = { full: false, reason: 'none', daysLeft: 0 };
  if (!r.full && !enforced) r = Object.assign({}, r, { full: true, reason: 'not_enforced' });
  return Object.assign({ status: s }, r);
}

/* Yeni belge: açılış zamanı kurucu sınırından önceyse comp, değilse deneme. */
function initialBilling({ createdAt, now, cfg }) {
  const cutoff = ms(cfg && cfg.founderCutoff) ?? DEFAULT_FOUNDER_CUTOFF;
  const created = ms(createdAt);
  if (created != null && created < cutoff) {
    return { status: 'comp', plan: 'comp', interval: null, athleteLimit: null, provider: 'manual', reason: 'founder' };
  }
  return { status: 'trialing', plan: 'trial', interval: null, athleteLimit: null, provider: null,
    trialStartedAt: now, trialEndsAt: now + TRIAL_DAYS * DAY };
}

async function readConfig(db) {
  const s = await db.doc(CONFIG_DOC).get();
  return s.exists ? (s.data() || {}) : {};
}

/* Belge varsa olduğu gibi döner; yoksa transaction içinde bir kez açar (aynı anda iki
   çağrı gelse de tek belge). Sonuç: { billing, access, enforced } */
async function ensureBilling({ db, ws, createdAt, now, serverTimestamp }) {
  const t = now();
  const cfg = await readConfig(db);
  const ref = db.collection(COL).doc(ws);
  const billing = await db.runTransaction(async tx => {
    const s = await tx.get(ref);
    if (s.exists) return s.data();
    const b = initialBilling({ createdAt, now: t, cfg });
    const stored = Object.assign({}, b, { createdAt: t, updatedAt: serverTimestamp ? serverTimestamp() : t });
    tx.set(ref, stored);
    return b;
  });
  return { billing: publicView(billing), access: accessFor(billing, t, cfg), enforced: !!cfg.enforced };
}

/* İstemciye dönen alanlar (sağlayıcı kimlikleri gibi iç alanlar dışarıda kalır). */
function publicView(b) {
  const out = {};
  for (const k of ['status', 'plan', 'interval', 'athleteLimit', 'trialEndsAt', 'currentPeriodEnd', 'reason']) {
    if (b && b[k] !== undefined) out[k] = ms(b[k]) ?? b[k];
  }
  return out;
}

/* Sunucudaki pahalı işler (yapay zekâ) için: erişim yoksa false. */
async function hasFullAccess({ db, ws, now }) {
  const [cfg, s] = await Promise.all([readConfig(db), db.collection(COL).doc(ws).get()]);
  if (!cfg.enforced) return true;
  return accessFor(s.exists ? s.data() : null, now(), cfg).full;
}

module.exports = {
  accessFor, initialBilling, ensureBilling, hasFullAccess, publicView,
  TRIAL_DAYS, GRACE_DAYS, DEFAULT_FOUNDER_CUTOFF, COL, CONFIG_DOC,
};
