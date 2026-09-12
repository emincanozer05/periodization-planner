/* ═══════════════════════════════════════════════════════════════════════════
   UYARI KURALI — Test 1-10

   Testler İKİ KATMANLI, ve bunun somut bir sebebi var:

   Formdaki skorlar 1-5 TAM SAYI rozetleri. Üç skorun ortalaması matematiksel
   olarak yalnızca x.0 / x.3 / x.7 olabiliyor, iki skorunki x.0 / x.5. Yani
   istenen senaryolardaki 4.2 ve 3.49 değerleri gerçek bir formdan ÇIKAMIYOR.
   Buna rağmen kural o değerlerde de doğru olmak zorunda — yarın forma ondalıklı
   bir soru eklenirse eşik sessizce yanlış çalışmaya başlamasın.

   Bu yüzden:
     Katman 1 — eşiğin kendisi, ham skorla (4.2 · 3.5 · 3.49 · 2.5 dahil)
     Katman 2 — gerçek form payload'ıyla uçtan uca, ulaşılabilir değerlerle

   3.5 = UYARI DEĞİL · 3.49 = UYARI. Bu satır bu dosyanın varlık sebebi.
   ═══════════════════════════════════════════════════════════════════════════ */
const assert = require('assert');
const { section, t } = require('./harness');
const {
  overallWellness, overallWellnessExact, isLowScore, shouldAlert, alertReasons,
  painBySeverity, buildNotification, buildAlertRecord,
  REASON_LOW_SCORE, REASON_PAIN, WELLNESS_THRESHOLD,
} = require('../wellness-alert');

// Gerçek form payload'ı: üç skor + ağrı haritası.
const P = (sleep, fatigue, soreness, painMap) => ({ sleep, fatigue, soreness, painMap: painMap || {} });
/* Tam olarak istenen ortalamayı veren payload. Üç eşit değerin ortalaması
   kendisidir, yani senaryodaki skor birebir kuruluyor. */
const atScore = (score, painMap) => P(score, score, score, painMap);

const MOD = { 'Bel': 2 };
const HIGH = { 'Quadriceps': 3 };
const MOD_HIGH = { 'Bel': 2, 'Quadriceps': 3 };
const LOW_ONLY = { 'Quadriceps': 1 };

/* ── Mevcut formül korunuyor mu ───────────────────────────────────────────── */
section('Overall Wellness — uygulamanın kendi formülü');

t('uyku + yorgunluk + kas ağrısı ortalaması, tek ondalık', () => {
  assert.strictEqual(overallWellness(P(4, 4, 4)), 4);
  assert.strictEqual(overallWellness(P(4, 3, 3)), 3.3);
  assert.strictEqual(overallWellness(P(3, 3, 3)), 3);
});
t('boş bırakılan kas ağrısı ortalamaya girmiyor', () => {
  assert.strictEqual(overallWellness({ sleep: 4, fatigue: 3, soreness: null }), 3.5);
});
t('hiç skor yoksa null', () => assert.strictEqual(overallWellness({}), null));
t('gösterim yuvarlıyor, karar yuvarlamıyor', () => {
  // 3.49 ekranda 3.5 görünür ama kararı veren sayı hâlâ 3.49'dur.
  assert.strictEqual(overallWellness(atScore(3.49)), 3.5);
  assert.strictEqual(overallWellnessExact(atScore(3.49)), 3.49);
});

/* ── Katman 1: eşiğin kendisi ─────────────────────────────────────────────── */
section('Eşik — 3.5 uyarı değil, altı uyarı (ham skor)');

t('eşik 3.5', () => assert.strictEqual(WELLNESS_THRESHOLD, 3.5));
t('4.2 → düşük değil', () => assert.strictEqual(isLowScore(4.2), false));
t('3.6 → düşük değil', () => assert.strictEqual(isLowScore(3.6), false));
t('tam 3.5 → düşük DEĞİL (kesin küçük)', () => assert.strictEqual(isLowScore(3.5), false));
t('3.49 → düşük', () => assert.strictEqual(isLowScore(3.49), true));
t('2.5 → düşük', () => assert.strictEqual(isLowScore(2.5), true));
t('skor yoksa düşük sayılmaz', () => assert.strictEqual(isLowScore(null), false));

/* ── Ağrı şiddeti ─────────────────────────────────────────────────────────── */
section('Ağrı — yalnızca orta (2) ve yüksek (3) sayılıyor');

t('hafif (1) uyarı sebebi değil', () => {
  assert.strictEqual(shouldAlert(P(5, 5, 5, LOW_ONLY)), false);
});
t('hafif ağrı listelerde de görünmüyor', () => {
  const pain = painBySeverity(P(5, 5, 5, { 'Quadriceps': 1, 'Bel': 2 }));
  assert.deepStrictEqual(pain[2], ['Bel']);
  assert.deepStrictEqual(pain[3], []);
});
t('tek bir yüksek ağrı yeterli, diğer bölgeler boş olsa da', () => {
  assert.strictEqual(shouldAlert(P(5, 5, 5, { 'Quadriceps': 3, 'Baldır': 1 })), true);
});
t('ağrı haritası boşsa ağrı yok', () => {
  assert.strictEqual(painBySeverity(P(3, 3, 3))[2].length, 0);
  assert.strictEqual(painBySeverity(P(3, 3, 3))[3].length, 0);
});

/* ── Katman 2: istenen 10 senaryo, payload üzerinden ──────────────────────── */
section('Senaryolar 1-10 — Wellness × Ağrı');

t('TEST 1 · W=4.2 · ağrı yok → UYARI YOK', () => {
  assert.strictEqual(overallWellnessExact(atScore(4.2)), 4.2);
  assert.strictEqual(shouldAlert(atScore(4.2)), false);
});
t('TEST 2 · W=4.2 · orta ağrı → UYARI', () => {
  assert.strictEqual(shouldAlert(atScore(4.2, MOD)), true);
  assert.deepStrictEqual(alertReasons(atScore(4.2, MOD)), [REASON_PAIN]);
});
t('TEST 3 · W=4.2 · yüksek ağrı → UYARI', () => {
  assert.strictEqual(shouldAlert(atScore(4.2, HIGH)), true);
  assert.deepStrictEqual(alertReasons(atScore(4.2, HIGH)), [REASON_PAIN]);
});
t('TEST 4 · W=4.2 · orta + yüksek → UYARI', () => {
  assert.strictEqual(shouldAlert(atScore(4.2, MOD_HIGH)), true);
});
t('TEST 5 · W=3.5 · ağrı yok → UYARI YOK', () => {
  assert.strictEqual(shouldAlert(atScore(3.5)), false);
  assert.deepStrictEqual(alertReasons(atScore(3.5)), []);
});
t('TEST 6 · W=3.5 · orta ağrı → UYARI (sebep yalnızca ağrı)', () => {
  assert.strictEqual(shouldAlert(atScore(3.5, MOD)), true);
  assert.deepStrictEqual(alertReasons(atScore(3.5, MOD)), [REASON_PAIN]);
});
t('TEST 7 · W=3.49 · ağrı yok → UYARI (skor tek başına yeter)', () => {
  assert.strictEqual(shouldAlert(atScore(3.49)), true);
  assert.deepStrictEqual(alertReasons(atScore(3.49)), [REASON_LOW_SCORE]);
});
t('TEST 8 · W=3.49 · orta ağrı → UYARI (iki sebep birden)', () => {
  assert.strictEqual(shouldAlert(atScore(3.49, MOD)), true);
  assert.deepStrictEqual(alertReasons(atScore(3.49, MOD)), [REASON_LOW_SCORE, REASON_PAIN]);
});
t('TEST 9 · W=2.5 · ağrı yok → UYARI', () => {
  assert.strictEqual(shouldAlert(atScore(2.5)), true);
  assert.deepStrictEqual(alertReasons(atScore(2.5)), [REASON_LOW_SCORE]);
});
t('TEST 10 · W=2.5 · yüksek ağrı → UYARI', () => {
  assert.strictEqual(shouldAlert(atScore(2.5, HIGH)), true);
  assert.deepStrictEqual(alertReasons(atScore(2.5, HIGH)), [REASON_LOW_SCORE, REASON_PAIN]);
});

/* ── Aynı senaryolar, formun gerçekten üretebildiği değerlerle ─────────────── */
section('Senaryolar — gerçek form verisiyle (tam sayı rozetler)');

t('uyku 4 · yorgunluk 4 · kas ağrısı 4 · ağrı yok → UYARI YOK (W=4.0)', () => {
  assert.strictEqual(overallWellness(P(4, 4, 4)), 4);
  assert.strictEqual(shouldAlert(P(4, 4, 4)), false);
});
t('uyku 4 · yorgunluk 3 · kas ağrısı boş · ağrı yok → UYARI YOK (W=3.5 tam)', () => {
  const p = { sleep: 4, fatigue: 3, soreness: null, painMap: {} };
  assert.strictEqual(overallWellness(p), 3.5);
  assert.strictEqual(shouldAlert(p), false);
});
t('uyku 4 · yorgunluk 3 · kas ağrısı boş · ORTA ağrı → UYARI (W=3.5 ama ağrı var)', () => {
  const p = { sleep: 4, fatigue: 3, soreness: null, painMap: MOD };
  assert.strictEqual(overallWellness(p), 3.5);
  assert.strictEqual(shouldAlert(p), true);
});
t('uyku 4 · yorgunluk 3 · kas ağrısı 3 · ağrı yok → UYARI (W=3.3)', () => {
  assert.strictEqual(overallWellness(P(4, 3, 3)), 3.3);
  assert.strictEqual(shouldAlert(P(4, 3, 3)), true);
});
t('uyku 5 · yorgunluk 5 · kas ağrısı 5 · yüksek ağrı → UYARI (W=5.0)', () => {
  assert.strictEqual(shouldAlert(P(5, 5, 5, HIGH)), true);
});

/* ── Bildirim metni ───────────────────────────────────────────────────────── */
section('Bildirim metni');

const SUB = {
  athleteName: 'Emir Papur', athleteId: 'a1', teamId: 't1', date: '2026-03-04',
  payload: P(3, 3, 4, HIGH),
};

t('başlık + gövde: sporcu, takım, skor, ağrı', () => {
  const n = buildNotification(SUB, 'U16', 'tr');
  assert.strictEqual(n.title, 'CoachOS Wellness Uyarısı');
  assert.strictEqual(n.body, 'Emir Papur — U16 | Wellness: 3.3/5 | Yüksek ağrı: Quadriceps');
});
t('İngilizce karşılığı', () => {
  const n = buildNotification(SUB, 'U16', 'en');
  assert.strictEqual(n.title, 'CoachOS Wellness Alert');
  assert.strictEqual(n.body, 'Emir Papur — U16 | Wellness: 3.3/5 | High pain: Quadriceps');
});
t('ağrı yoksa ağrı satırı hiç yazılmıyor', () => {
  const n = buildNotification({ athleteName: 'Ahmet', payload: P(3, 3, 3) }, 'U16', 'tr');
  assert.strictEqual(n.body, 'Ahmet — U16 | Wellness: 3/5');
});
t('takım adı yoksa gövde yine kurulu', () => {
  const n = buildNotification({ athleteName: 'Ahmet', payload: P(3, 3, 3) }, '', 'tr');
  assert.strictEqual(n.body, 'Ahmet | Wellness: 3/5');
});
t('ikiden çok bölge kısaltılıyor', () => {
  const p = P(5, 5, 5, { 'Bel': 3, 'Boyun': 3, 'Omuz': 3, 'Diz': 3 });
  const n = buildNotification({ athleteName: 'Ahmet', payload: p }, 'U16', 'tr');
  assert.ok(n.body.includes('+2'), n.body);
});
t('isimsiz gönderim bildirimi bozmuyor', () => {
  const n = buildNotification({ payload: P(2, 2, 2) }, 'U16', 'tr');
  assert.ok(n.body.startsWith('İsimsiz sporcu'), n.body);
});

/* ── Uyarı kaydı ──────────────────────────────────────────────────────────── */
section('Uyarı kaydı — Madde 11');

t('kayıt istenen tüm alanları taşıyor', () => {
  const r = buildAlertRecord(SUB, 'U16');
  assert.strictEqual(r.athleteId, 'a1');
  assert.strictEqual(r.athleteName, 'Emir Papur');
  assert.strictEqual(r.teamId, 't1');
  assert.strictEqual(r.teamName, 'U16');
  assert.strictEqual(r.date, '2026-03-04');
  assert.strictEqual(r.overall, 3.3);
  assert.deepStrictEqual(r.scores, { sleep: 3, fatigue: 3, soreness: 4, RHR: null });
  assert.deepStrictEqual(r.painHigh, ['Quadriceps']);
  assert.deepStrictEqual(r.painModerate, []);
  assert.deepStrictEqual(r.reasons, [REASON_LOW_SCORE, REASON_PAIN]);
});
t('bileşen skorları ve RHR kayda giriyor', () => {
  const r = buildAlertRecord({ payload: { sleep: 2, fatigue: 3, soreness: null, RHR: 58, painMap: {} } }, '');
  assert.deepStrictEqual(r.scores, { sleep: 2, fatigue: 3, soreness: null, RHR: 58 });
});
t('sebep kod olarak duruyor, cümle olarak değil', () => {
  const r = buildAlertRecord({ payload: P(2, 2, 2) }, '');
  assert.deepStrictEqual(r.reasons, ['low_score']);
});
