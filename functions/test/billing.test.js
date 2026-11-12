/* ABONELİK — erişim kuralı, ilk belge, uygulamayla aynı sonuç (yayina-hazirlik-plani §3). */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { section, t, ta } = require('./harness');
const B = require('../billing/entitlement');

const DAY = 24 * 3600 * 1000;
const NOW = Date.parse('2026-12-01T12:00:00Z');
const ON = { enforced: true };

section('ABONELİK — erişim kuralı (bayrak açık)');
const CASES = [
  ['comp: süresiz tam', { status: 'comp' }, true, 'comp', null],
  ['aktif', { status: 'active', currentPeriodEnd: NOW + 10 * DAY }, true, 'active', 10],
  ['deneme sürüyor', { status: 'trialing', trialEndsAt: NOW + 3 * DAY + 1 }, true, 'trial', 4],
  ['deneme bitti', { status: 'trialing', trialEndsAt: NOW - 1 }, false, 'trial_ended', 0],
  ['deneme tarihi yok', { status: 'trialing' }, false, 'trial_ended', 0],
  ['ödeme alınamadı, 7 günlük pay içinde', { status: 'past_due', currentPeriodEnd: NOW - 2 * DAY }, true, 'grace', 5],
  ['ödeme alınamadı, pay bitti', { status: 'past_due', currentPeriodEnd: NOW - 8 * DAY }, false, 'expired', 0],
  ['iptal, dönem sonuna kadar', { status: 'canceled', currentPeriodEnd: NOW + DAY }, true, 'canceled_until_end', 1],
  ['iptal, dönem bitti', { status: 'canceled', currentPeriodEnd: NOW - 1 }, false, 'expired', 0],
  ['süresi dolmuş', { status: 'expired' }, false, 'expired', 0],
  ['belge yok', null, false, 'none', 0],
  ['bilinmeyen durum', { status: 'garip' }, false, 'none', 0],
];
for (const [name, b, full, reason, days] of CASES) {
  t(name, () => {
    const a = B.accessFor(b, NOW, ON);
    assert.strictEqual(a.full, full, 'full');
    assert.strictEqual(a.reason, reason, 'reason');
    assert.strictEqual(a.daysLeft, days, 'daysLeft');
  });
}

section('ABONELİK — bayrak kapalıyken kimse kilitlenmez');
for (const [name, b] of CASES) {
  t(name, () => assert.strictEqual(B.accessFor(b, NOW, { enforced: false }).full, true));
}
t('config hiç yoksa da kapalı sayılır', () => assert.strictEqual(B.accessFor({ status: 'expired' }, NOW, undefined).full, true));
t('Firestore Timestamp kabul edilir', () => {
  const ts = { toMillis: () => NOW + DAY };
  assert.strictEqual(B.accessFor({ status: 'trialing', trialEndsAt: ts }, NOW, ON).reason, 'trial');
});

section('ABONELİK — ilk belge');
t('kurucu sınırından önce açılmış hesap → comp', () => {
  const b = B.initialBilling({ createdAt: B.DEFAULT_FOUNDER_CUTOFF - 1, now: NOW, cfg: {} });
  assert.strictEqual(b.status, 'comp');
});
t('sınırdan sonra açılmış hesap → 14 gün deneme', () => {
  const b = B.initialBilling({ createdAt: B.DEFAULT_FOUNDER_CUTOFF + 1, now: NOW, cfg: {} });
  assert.strictEqual(b.status, 'trialing');
  assert.strictEqual(b.trialEndsAt, NOW + 14 * DAY);
});
t('açılış zamanı bilinmiyorsa deneme (comp asla tahminle verilmez)', () => {
  assert.strictEqual(B.initialBilling({ createdAt: null, now: NOW, cfg: {} }).status, 'trialing');
});
t('config.founderCutoff varsayılanı geçersiz kılar', () => {
  const b = B.initialBilling({ createdAt: '2027-01-01', now: NOW, cfg: { founderCutoff: '2027-06-01' } });
  assert.strictEqual(b.status, 'comp');
});

/* Sahte Firestore: yalnızca ensureBilling'in kullandığı yüzey. */
function fakeDb(seed = {}) {
  const store = new Map(Object.entries(seed));
  const snap = (p) => ({ exists: store.has(p), data: () => store.get(p) });
  const docRef = p => ({ path: p, get: async () => snap(p) });
  return {
    store,
    doc: p => docRef(p),
    collection: c => ({ doc: id => docRef(c + '/' + id) }),
    runTransaction: async fn => fn({ get: async r => snap(r.path), set: (r, v) => store.set(r.path, v) }),
  };
}

section('ABONELİK — ensureBilling');
ta('belge yoksa açar, varsa dokunmaz', async () => {
  const db = fakeDb();
  const r1 = await B.ensureBilling({ db, ws: 'u1', createdAt: B.DEFAULT_FOUNDER_CUTOFF + DAY, now: () => NOW });
  assert.strictEqual(r1.billing.status, 'trialing');
  assert.strictEqual(r1.access.full, true);
  db.store.set('billing/u1', { status: 'expired' });
  const r2 = await B.ensureBilling({ db, ws: 'u1', createdAt: 0, now: () => NOW });
  assert.strictEqual(r2.billing.status, 'expired', 'var olan belge yeniden yazılmamalı');
  assert.strictEqual(r2.access.reason, 'not_enforced');
});
ta('bayrak açıkken süresi dolan kilitlenir', async () => {
  const db = fakeDb({ 'config/billing': { enforced: true }, 'billing/u2': { status: 'expired' } });
  const r = await B.ensureBilling({ db, ws: 'u2', createdAt: 0, now: () => NOW });
  assert.strictEqual(r.access.full, false);
  assert.strictEqual(await B.hasFullAccess({ db, ws: 'u2', now: () => NOW }), false);
  assert.strictEqual(await B.hasFullAccess({ db, ws: 'yok', now: () => NOW }), false);
});
ta('istemciye sağlayıcı kimliği gitmez', async () => {
  const db = fakeDb({ 'billing/u3': { status: 'active', providerRef: 'sub_123', currentPeriodEnd: NOW + DAY } });
  const r = await B.ensureBilling({ db, ws: 'u3', createdAt: 0, now: () => NOW });
  assert.strictEqual(r.billing.providerRef, undefined);
});

section('ABONELİK — uygulama ↔ sunucu aynı sonuç');
const src = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'app', '466-billing.jsx'), 'utf8');
const a = src.indexOf('function billingAccess(');
const z = src.indexOf('/* </billing-access> */');
assert.ok(a >= 0 && z > a, '466-billing.jsx: erişim kuralı bölümü bulunamadı');
// eslint-disable-next-line no-new-func
const client = new Function(src.slice(a, z) + '; return billingAccess;')();
for (const [name, b] of CASES) {
  for (const cfg of [ON, { enforced: false }]) {
    t(`${name} · ${cfg.enforced ? 'açık' : 'kapalı'}`, () => assert.deepStrictEqual(client(b, NOW, cfg), B.accessFor(b, NOW, cfg)));
  }
}

section('ABONELİK — yapay zekâ kapısı');
const proxy = require('../ai/proxy');
ta('abonelik yoksa üretim çağrısı model çağrılmadan reddedilir', async () => {
  let called = false;
  const gemini = { generate: async () => { called = true; return { text: 'x' }; } };
  await assert.rejects(
    proxy.handle({ op: 'generate', model: 'gemini-x', system: 's', messages: [] }, { uid: 'u1', token: {} },
      { db: fakeDb(), gemini, apiKey: 'k', hasAccess: async () => false }),
    e => e.code === 'SUBSCRIPTION_REQUIRED');
  assert.strictEqual(called, false);
});
