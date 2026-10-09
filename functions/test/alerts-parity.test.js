/* ═══════════════════════════════════════════════════════════════════════════
   TELEFON SAYFASI ↔ SUNUCU — aynı formdan aynı kayıt

   alerts.html günün listesini artık sunucuya bağlı kalmadan, formun kendisinden
   (`checkins`) de kuruyor. Telefondaki hesap (localWellness / localRpe) ile
   sunucudaki (buildAlertRecord / buildRpeRecord) ayrışırsa aynı sporcu sunucu
   çalışırken bir skorla, çalışmazken başka bir skorla görünür. Bu test ikisini
   aynı girdilerle karşılaştırıyor.
   ═══════════════════════════════════════════════════════════════════════════ */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { section, t } = require('./harness');
const { buildAlertRecord } = require('../wellness-alert');
const { buildRpeRecord } = require('../rpe-report');

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'alerts.html'), 'utf8');
const a = html.indexOf('function numv(');
const b = html.indexOf('/* ── Firebase ──');
assert.ok(a > 0 && b > a, 'alerts.html: formdan kayıt bölümü bulunamadı');
// eslint-disable-next-line no-new-func
const lib = new Function(html.slice(a, b) + '; return { localWellness, localRpe, mergeRows };')();

const W_KEYS = ['athleteId', 'athleteName', 'teamId', 'date', 'overall', 'scores', 'painHigh', 'painModerate', 'reasons', 'flagged'];
const R_KEYS = ['athleteId', 'athleteName', 'teamId', 'date', 'sessions', 'totalLoad', 'maxRpe'];
const base = { athleteId: 'a1', athleteName: ' Emir ', teamId: 't1', date: '2026-10-09' };

const WELLNESS = [
  ['düşük skor + yüksek/orta/hafif ağrı', { sleep: 2, mentalFatigue: 3, physicalFatigue: 4, soreness: 3, RHR: 55, painMap: { 'Sağ diz önü': 3, Bel: 2, Boyun: 1 } }],
  ['eşiğin tam üstü, ağrı yok', { sleep: 4, mentalFatigue: 3, physicalFatigue: 3, soreness: 4, painMap: {} }],
  ['kas ağrısı boş', { sleep: 3, mentalFatigue: 3, physicalFatigue: 4 }],
  ['eski form (tek yorgunluk)', { sleep: 3, fatigue: 2, soreness: 4 }],
  ['boş form', {}],
];
section('TELEFON ↔ SUNUCU — wellness kaydı aynı');
for (const [name, payload] of WELLNESS) {
  t(name, () => {
    const sub = Object.assign({ kind: 'wellness', payload }, base);
    const loc = lib.localWellness(sub), srv = buildAlertRecord(sub, '');
    for (const k of W_KEYS) assert.deepStrictEqual(loc[k], srv[k], k);
  });
}

const RPE = [
  ['üç bölüm', { tpRPE: 7, tpDuration: 90, scRPE: 5, scDuration: 45, gameRPE: 9, gameDuration: 20 }],
  ['yalnızca top, süre sınır dışı', { tpRPE: 12, tpDuration: 999 }],
  ['RPE var süre yok', { scRPE: 6 }],
  ['boş', {}],
];
section('TELEFON ↔ SUNUCU — RPE kaydı aynı');
for (const [name, payload] of RPE) {
  t(name, () => {
    const sub = Object.assign({ kind: 'srpe', payload }, base);
    const loc = lib.localRpe(sub), srv = buildRpeRecord(sub, '');
    for (const k of R_KEYS) assert.deepStrictEqual(loc[k], srv[k], k);
  });
}

section('TELEFON — iki kaynak tek satır');
const ts = n => ({ toMillis: () => n });
t('aynı gönderim: sunucunun kaydı kalır (bildirim bilgisi onda)', () => {
  const m = lib.mergeRows([{ athleteId: 'a1', submittedAt: ts(5), notificationStatus: 'sent' }],
                          [{ athleteId: 'a1', submittedAt: ts(5), notificationStatus: 'local' }]);
  assert.strictEqual(m.length, 1);
  assert.strictEqual(m[0].notificationStatus, 'sent');
});
t('sunucu çalışmıyorsa formdan kurulan görünür', () => {
  const m = lib.mergeRows([], [{ athleteId: 'a1', submittedAt: ts(5) }, { athleteId: 'a2', submittedAt: ts(6) }]);
  assert.strictEqual(m.length, 2);
});
t('aynı sporcunun daha yeni formu kazanır', () => {
  const m = lib.mergeRows([{ athleteId: 'a1', submittedAt: ts(5), v: 'eski' }],
                          [{ athleteId: 'a1', submittedAt: ts(9), v: 'yeni' }, { athleteId: 'a1', submittedAt: ts(7), v: 'ara' }]);
  assert.strictEqual(m.length, 1);
  assert.strictEqual(m[0].v, 'yeni');
});
