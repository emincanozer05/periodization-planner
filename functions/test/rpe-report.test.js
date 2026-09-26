/* ═══════════════════════════════════════════════════════════════════════════
   RPE KAYDI — telefon sayfasının RPE sekmesi

   Kilitlenen şey formül: telefonda yazan AU, koçun ekranındaki AU ile aynı olmalı
   (index.html → mergeCheckins: RPE 0-10, süre 0-400 dk, yük = RPE × süre).
   ═══════════════════════════════════════════════════════════════════════════ */
const assert = require('assert');
const { section, t } = require('./harness');
const { buildRpeRecord } = require('../rpe-report');
const { rpeDocId, alertDocId } = require('../ids');

const SUB = (payload) => ({
  athleteName: ' Emir Papur ', athleteId: 'a1', teamId: 't1', date: '2026-09-26', payload,
});

section('RPE kaydı — rpe_reports');

t('yapılan bölümler, yükleri ve günün toplamı', () => {
  const r = buildRpeRecord(SUB({ tpRPE: 7, tpDuration: 90, scRPE: 5, scDuration: 45,
    gameRPE: null, gameDuration: null }), 'U16');
  assert.strictEqual(r.athleteName, 'Emir Papur');
  assert.strictEqual(r.teamName, 'U16');
  assert.strictEqual(r.date, '2026-09-26');
  assert.deepStrictEqual(r.sessions, [
    { id: 'tp', rpe: 7, duration: 90, load: 630 },
    { id: 'sc', rpe: 5, duration: 45, load: 225 },
  ]);
  assert.strictEqual(r.totalLoad, 855);
  assert.strictEqual(r.maxRpe, 7);
});
t('RPE\'si boş bölüm kayda girmiyor', () => {
  const r = buildRpeRecord(SUB({ gameRPE: 9, gameDuration: 30 }), '');
  assert.deepStrictEqual(r.sessions.map(s => s.id), ['game']);
  assert.strictEqual(r.totalLoad, 270);
});
t('değerler koçun ekranındaki sınırlarla kırpılıyor', () => {
  const r = buildRpeRecord(SUB({ tpRPE: 99, tpDuration: 9999 }), '');
  assert.deepStrictEqual(r.sessions[0], { id: 'tp', rpe: 10, duration: 400, load: 4000 });
});
t('süresi olmayan bölümün yükü yok', () => {
  const r = buildRpeRecord(SUB({ scRPE: 6, scDuration: null }), '');
  assert.deepStrictEqual(r.sessions[0], { id: 'sc', rpe: 6, duration: null, load: null });
  assert.strictEqual(r.totalLoad, null);
});
t('boş gönderim bozulmuyor', () => {
  const r = buildRpeRecord({ payload: {} }, '');
  assert.deepStrictEqual(r.sessions, []);
  assert.strictEqual(r.totalLoad, null);
  assert.strictEqual(r.maxRpe, null);
});
t('kaydın adı sporcu + tarih — aynı günün ikinci gönderimi üstüne yazar', () => {
  assert.strictEqual(rpeDocId('c', 'a1', '2026-09-26'), rpeDocId('c', 'a1', '2026-09-26'));
  assert.strictEqual(rpeDocId('c', 'a1', '2026-09-26'), alertDocId('c', 'a1', '2026-09-26'));
  assert.notStrictEqual(rpeDocId('c', 'a1', '2026-09-26'), rpeDocId('c', 'a2', '2026-09-26'));
});
