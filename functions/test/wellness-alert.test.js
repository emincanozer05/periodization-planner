/* Uyarı kuralının testleri — bağımlılık yok, `npm test` ile çalışır.
   Senaryolar istenen altı testin birebir karşılığı; Overall Wellness değerleri
   uygulamanın kendi formülünden (uyku/yorgunluk/kas ağrısı ortalaması) çıkıyor. */
const assert = require('assert');
const { overallWellness, shouldAlert, buildMessage, painBySeverity } = require('../wellness-alert');

let pass = 0;
function t(name, fn) { fn(); pass++; console.log('  ✓ ' + name); }

// sleep+fatigue+soreness ortalaması: 4,4,4 → 4.0 · 4,3,3 → 3.3 · 3,3,3 → 3.0
const P = (sleep, fatigue, soreness, painMap) => ({ sleep, fatigue, soreness, painMap: painMap || {} });

console.log('Overall Wellness (mevcut formül)');
t('uyku+yorgunluk+kas ağrısı ortalaması, tek ondalık', () => {
  assert.strictEqual(overallWellness(P(4, 4, 4)), 4);
  assert.strictEqual(overallWellness(P(4, 3, 3)), 3.3);
  assert.strictEqual(overallWellness(P(3, 3, 3)), 3);
});
t('boş bırakılan kas ağrısı ortalamaya girmiyor', () => {
  assert.strictEqual(overallWellness({ sleep: 4, fatigue: 3, soreness: null }), 3.5);
});
t('hiç skor yoksa null', () => assert.strictEqual(overallWellness({}), null));

console.log('\nAlarm kriteri');
t('TEST 1 — Wellness 4.0 · ağrı yok → mesaj YOK', () => {
  assert.strictEqual(shouldAlert(P(4, 4, 4)), false);
});
t('TEST 2 — Wellness 3.4 · ağrı yok → mesaj YOK', () => {
  assert.strictEqual(overallWellness(P(4, 3, 3.2)), 3.4);
  assert.strictEqual(shouldAlert(P(4, 3, 3.2)), false);
});
t('TEST 3 — Wellness 3.4 · orta ağrı → mesaj VAR', () => {
  assert.strictEqual(shouldAlert(P(4, 3, 3.2, { 'Sırt': 2 })), true);
});
t('TEST 4 — Wellness 3.0 · yüksek ağrı → mesaj VAR', () => {
  assert.strictEqual(shouldAlert(P(3, 3, 3, { 'Quadriceps': 3 })), true);
});
t('TEST 5 — Wellness 4.0 · yüksek ağrı → mesaj YOK', () => {
  assert.strictEqual(shouldAlert(P(4, 4, 4, { 'Quadriceps': 3 })), false);
});
t('düşük skor + SADECE hafif ağrı → mesaj YOK', () => {
  assert.strictEqual(shouldAlert(P(3, 3, 3, { 'Diz': 1 })), false);
});
t('tam 3.5 eşikte → mesaj YOK (kural: kesin küçük)', () => {
  assert.strictEqual(shouldAlert({ sleep: 4, fatigue: 3, painMap: { 'Diz': 3 } }), false);
});

console.log('\nMesaj');
const msg = buildMessage({
  athleteName: 'Test Sporcu', date: '2026-09-12',
  payload: P(4, 3, 3, { 'Quadriceps': 3, 'Kalf': 3, 'Sırt': 2, 'Omuz': 2, 'Diz': 1 }),
});
t('hafif ağrı bölgesi mesajda yok', () => assert.ok(!msg.includes('Diz')));
t('yüksek ve orta bölgeler kendi satırında', () => {
  assert.ok(msg.includes('🔴 Quadriceps, Kalf'));
  assert.ok(msg.includes('🟡 Sırt, Omuz'));
});
t('renk sistemi 1-5 puanlarda tutarlı', () => {
  assert.ok(msg.includes('Uyku Kalitesi: 🟢 4/5'));
  assert.ok(msg.includes('Yorgunluk: 🟡 3/5'));
  assert.ok(buildMessage({ payload: P(1, 1, 1, { 'Bel': 3 }) }).includes('Uyku Kalitesi: 🔴 1/5'));
  assert.ok(buildMessage({ payload: P(5, 1, 1, { 'Bel': 3 }) }).includes('Uyku Kalitesi: 🔵 5/5'));
  assert.ok(buildMessage({ payload: P(2, 1, 1, { 'Bel': 3 }) }).includes('Uyku Kalitesi: 🟠 2/5'));
});
t('sporcunun gerçek adı geçiyor', () => assert.ok(msg.includes('Test Sporcu')));
t('yalnız orta ağrı varsa sadece sarı satır çıkıyor', () => {
  const m = buildMessage({ athleteName: 'A', payload: P(3, 3, 3, { 'Sırt': 2, 'Omuz': 2 }) });
  assert.ok(m.includes('🟡 Sırt, Omuz'));
  assert.ok(!m.includes('🔴 ') || m.indexOf('🔴') === 0);   // yalnız başlıktaki 🔴
});
t('ad HTML olarak kaçırılıyor', () => {
  assert.ok(buildMessage({ athleteName: '<b>x</b>', payload: P(3, 3, 3, { 'Bel': 3 }) })
    .includes('&lt;b&gt;x&lt;/b&gt;'));
});
t('cevaplanmamış soru satırı hiç yazılmıyor', () => {
  const m = buildMessage({ athleteName: 'A', payload: { sleep: 3, fatigue: 3, painMap: { 'Bel': 2 } } });
  assert.ok(!m.includes('Kas Ağrısı'));
  assert.ok(!m.includes('Dinlenik KAH'));
});
t('painMap şiddet ayrımı', () => {
  const p = painBySeverity({ painMap: { 'Bel': 3, 'Diz': 2, 'Ayak': 1 } });
  assert.deepStrictEqual(p[3], ['Bel']);
  assert.deepStrictEqual(p[2], ['Diz']);
});

console.log(`\n${pass} test geçti.`);
console.log('\nTEST 6 (aynı event tekrar tetiklenirse ikinci mesaj yok) index.js\'teki');
console.log('transaction ile sahiplenme adımında; Firestore gerektirdiği için burada değil.');
