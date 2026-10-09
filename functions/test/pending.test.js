/* ═══════════════════════════════════════════════════════════════════════════
   HTTPS KAPISI — tetikleyicinin kaçırdığı gönderimlerin seçimi

   Sahadaki arıza: function yeniden deploy edildikten sonra Firestore tetikleyicisi
   hiç çalışmadı, 10 wellness formu `checkins` içinde damgasız bekledi. Bu testler
   o gönderimlerin seçildiğini, işlenmişlerin ise ikinci kez seçilmediğini sınıyor.
   ═══════════════════════════════════════════════════════════════════════════ */
const assert = require('assert');
const { section, t } = require('./harness');
const { pickPending, isProcessed, pushStillUseful, isNewer, MAX_AGE_MS, PUSH_MAX_AGE_MS } = require('../pending');

const NOW = Date.parse('2026-10-09T05:00:00Z');
const ts = isoOrMs => ({ toMillis: () => (typeof isoOrMs === 'number' ? isoOrMs : Date.parse(isoOrMs)) });
const row = (id, data) => ({ id, data });

section('BEKLEYEN GÖNDERİMLER — tetikleyici kaçırırsa');

t('damgasız wellness bekleyen sayılıyor', () => {
  assert.strictEqual(isProcessed({ kind: 'wellness' }), false);
});
t('sahiplenilmiş ya da gönderilmiş wellness işlenmiş sayılıyor', () => {
  assert.strictEqual(isProcessed({ kind: 'wellness', alertClaimedAt: 1 }), true);
  assert.strictEqual(isProcessed({ kind: 'wellness', alertSent: true }), true);
});
t('RPE yalnızca rpeRecordedAt ile işlenmiş sayılıyor', () => {
  assert.strictEqual(isProcessed({ kind: 'srpe' }), false);
  assert.strictEqual(isProcessed({ kind: 'srpe', rpeRecordedAt: 1 }), true);
});
t('tanınmayan tür seçilmiyor', () => {
  assert.strictEqual(isProcessed({ kind: 'x' }), true);
});

t('sahadaki sabah: 10 damgasız form seçiliyor, işlenmiş olanlar seçilmiyor', () => {
  const rows = [];
  for (let i = 0; i < 10; i++) rows.push(row('w' + i, { kind: 'wellness', at: ts(NOW - (60 - i) * 60000) }));
  rows.push(row('done', { kind: 'wellness', at: ts(NOW - 3600000), alertSent: true }));
  rows.push(row('rpe-done', { kind: 'srpe', at: ts(NOW - 3600000), rpeRecordedAt: 1 }));
  const p = pickPending(rows, NOW);
  assert.strictEqual(p.length, 10);
  assert.ok(p.every(r => r.id[0] === 'w'));
});

t('eskiden yeniye sıralı — aynı sporcunun düzeltmesi en son yazılır', () => {
  const p = pickPending([
    row('late', { kind: 'wellness', at: ts(NOW - 1000) }),
    row('nots', { kind: 'wellness' }),
    row('early', { kind: 'wellness', at: ts(NOW - 5000) }),
  ], NOW);
  assert.deepStrictEqual(p.map(r => r.id), ['early', 'late', 'nots']);
});

t('3 günden eski gönderim süpürülmüyor', () => {
  const p = pickPending([row('old', { kind: 'wellness', at: ts(NOW - MAX_AGE_MS - 1) })], NOW);
  assert.strictEqual(p.length, 0);
});

section('GEÇ İŞLEME — kayıt evet, bildirim hayır');

t('6 saat içinde işlenen uyarı bildirim gönderir', () => {
  assert.strictEqual(pushStillUseful({ at: ts(NOW - PUSH_MAX_AGE_MS) }, NOW), true);
});
t('6 saatten geç işlenen uyarı bildirim göndermez', () => {
  assert.strictEqual(pushStillUseful({ at: ts(NOW - PUSH_MAX_AGE_MS - 1) }, NOW), false);
});
t('zamanı bilinmeyen gönderim (yeni yazılmış) bildirim gönderir', () => {
  assert.strictEqual(pushStillUseful({}, NOW), true);
});

t('duran kayıt daha yeniyse geç gelen eski gönderim yazmaz', () => {
  assert.strictEqual(isNewer(ts(NOW), ts(NOW - 1)), true);
  assert.strictEqual(isNewer(ts(NOW - 1), ts(NOW)), false);
  assert.strictEqual(isNewer(ts(NOW), ts(NOW)), false);
  assert.strictEqual(isNewer(null, ts(NOW)), false);
});
