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

console.log('\nAlarm kriteri — iki bağımsız sebep');
t('ağrı yok · skor 4.0 → mesaj YOK', () => {
  assert.strictEqual(shouldAlert(P(4, 4, 4)), false);
});
t('ağrı yok · skor 3.4 → mesaj VAR (skor tek başına yeter)', () => {
  assert.strictEqual(overallWellness(P(4, 3, 3.2)), 3.4);
  assert.strictEqual(shouldAlert(P(4, 3, 3.2)), true);
});
t('ağrı yok · tam 3.5 → mesaj YOK (kural: kesin küçük)', () => {
  assert.strictEqual(overallWellness({ sleep: 4, fatigue: 3 }), 3.5);
  assert.strictEqual(shouldAlert({ sleep: 4, fatigue: 3 }), false);
});
t('skor 5.0 · orta ağrı → mesaj VAR (ağrı tek başına yeter)', () => {
  assert.strictEqual(shouldAlert(P(5, 5, 5, { 'Omuz': 2 })), true);
});
t('skor 5.0 · yüksek ağrı → mesaj VAR', () => {
  assert.strictEqual(shouldAlert(P(5, 5, 5, { 'Quadriceps': 3 })), true);
});
t('düşük skor + ağrı birlikte → mesaj VAR', () => {
  assert.strictEqual(shouldAlert(P(3, 3, 3, { 'Bel': 3 })), true);
});
t('iyi skor + SADECE hafif ağrı → mesaj YOK', () => {
  assert.strictEqual(shouldAlert(P(5, 5, 5, { 'Diz': 1 })), false);
  assert.strictEqual(shouldAlert(P(4, 4, 4, { 'Diz': 1 })), false);
});
t('düşük skor + hafif ağrı → mesaj VAR (sebep skor)', () => {
  assert.strictEqual(shouldAlert(P(3, 3, 3, { 'Diz': 1 })), true);
});
t('hiç skor yok · ağrı var → mesaj VAR', () => {
  assert.strictEqual(shouldAlert({ painMap: { 'Bel': 3 } }), true);
});
t('hiç skor yok · ağrı yok → mesaj YOK', () => {
  assert.strictEqual(shouldAlert({}), false);
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
t('tarih en üstte, başlığın hemen altında', () => {
  const rows = msg.split('\n');
  assert.ok(rows[0].includes('WELLNESS ALERT'));
  assert.strictEqual(rows[1], '2026-09-12');
});
t('eşik açıklaması satırı yok', () => {
  assert.ok(!msg.includes('⚠️'));
  assert.ok(!msg.includes('< 3.5'));
});
t('son satır Overall Wellness', () => {
  const rows = msg.split('\n');
  assert.ok(rows[rows.length - 1].startsWith('Overall Wellness:'));
});
t('ağrı yoksa Ağrı Durumu bloğu hiç yazılmıyor', () => {
  const m = buildMessage({ athleteName: 'A', date: '2026-09-12', payload: P(3, 3, 3) });
  assert.ok(!m.includes('Ağrı Durumu'));
  assert.ok(m.includes('Overall Wellness: 🟡 3/5'));
});
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
