/* ═══════════════════════════════════════════════════════════════════════════
   GÖNDERİM — Madde 14 ve 15

   Sahte bir FCM ile: hangi cihaz aldı, hangisi alamadı, hangi kayıt ölü sayılıp
   temizlenecek. Asıl mesele şu satır: gönderim ne kadar kötü giderse gitsin
   sendAlert exception ATMIYOR — wellness verisi ve uyarı kaydı bir bildirim
   hatası yüzünden kaybolamaz.
   ═══════════════════════════════════════════════════════════════════════════ */
const assert = require('assert');
const { section, t, ta } = require('./harness');
const { sendAlert, buildMessage, isDead, isRetryable } = require('../push');

const TEXT = { title: 'CoachOS Wellness Uyarısı', body: 'Emir Papur — U16 | Wellness: 3.2/5' };
const DATA = { alertId: 'coach-1__ath-1__2026-03-04', athleteId: 'ath-1', teamId: 't1', date: '2026-03-04' };
const LINK = 'https://example.com/index.html#alert=coach-1__ath-1__2026-03-04';

/* Sahte FCM. `plan` her token için ne olacağını söylüyor:
   true → başarılı, string → o hata koduyla başarısız. */
function fakeMessaging(plan, opts) {
  const calls = [];
  let throwsLeft = (opts && opts.throwTimes) || 0;
  return {
    calls,
    async sendEachForMulticast(msg) {
      calls.push(msg);
      if (throwsLeft > 0) {
        throwsLeft--;
        const e = new Error('server unavailable');
        e.code = (opts && opts.throwCode) || 'messaging/server-unavailable';
        throw e;
      }
      const responses = msg.tokens.map(tok => {
        const outcome = plan[tok];
        return outcome === true
          ? { success: true, messageId: 'm-' + tok }
          : { success: false, error: { code: outcome, message: outcome } };
      });
      return {
        responses,
        successCount: responses.filter(r => r.success).length,
        failureCount: responses.filter(r => !r.success).length,
      };
    },
  };
}

section('Mesaj şekli');

t('bildirim başlık/gövde ve derin link taşıyor', () => {
  const m = buildMessage(['t1'], TEXT, DATA, LINK);
  assert.strictEqual(m.webpush.notification.title, TEXT.title);
  assert.strictEqual(m.webpush.notification.body, TEXT.body);
  assert.strictEqual(m.webpush.fcmOptions.link, LINK);
  assert.strictEqual(m.data.link, LINK);
  assert.strictEqual(m.data.alertId, DATA.alertId);
});
t('etiket sporcu+tarihten geliyor — aynı sporcunun uyarısı üst üste yazıyor', () => {
  const m = buildMessage(['t1'], TEXT, DATA, LINK);
  assert.strictEqual(m.webpush.notification.tag, DATA.alertId);
});
t('farklı sporcular farklı etiket taşıyor — bildirimler birbirini ezmiyor', () => {
  const a = buildMessage(['t1'], TEXT, Object.assign({}, DATA, { alertId: 'x__ath-1__d' }), LINK);
  const b = buildMessage(['t1'], TEXT, Object.assign({}, DATA, { alertId: 'x__ath-2__d' }), LINK);
  assert.notStrictEqual(a.webpush.notification.tag, b.webpush.notification.tag);
});

section('Hata sınıflandırması');

t('kayıtlı olmayan token ölü sayılıyor', () => {
  assert.strictEqual(isDead('messaging/registration-token-not-registered'), true);
  assert.strictEqual(isDead('messaging/invalid-registration-token'), true);
});
t('geçici sunucu hatası ölü değil', () => {
  assert.strictEqual(isDead('messaging/server-unavailable'), false);
  assert.strictEqual(isRetryable('messaging/server-unavailable'), true);
});
t('ölü token yeniden denenmiyor', () => {
  assert.strictEqual(isRetryable('messaging/registration-token-not-registered'), false);
});

section('Gönderim sonucu');

ta('hepsi başarılıysa hepsi sent', async () => {
  const m = fakeMessaging({ a: true, b: true });
  const r = await sendAlert(m, ['a', 'b'], TEXT, DATA, LINK);
  assert.deepStrictEqual(r.results.map(x => [x.token, x.ok]), [['a', true], ['b', true]]);
  assert.deepStrictEqual(r.dead, []);
});

ta('TEST 13 · bir cihaz düşse de diğerleri gidiyor', async () => {
  const m = fakeMessaging({ a: true, b: 'messaging/registration-token-not-registered', c: true });
  const r = await sendAlert(m, ['a', 'b', 'c'], TEXT, DATA, LINK);
  assert.deepStrictEqual(r.results.filter(x => x.ok).map(x => x.token), ['a', 'c']);
  assert.deepStrictEqual(r.dead, ['b'], 'ölü token temizlenmek üzere işaretlenmeli');
});

ta('ölü olmayan hata token\'ı silmiyor', async () => {
  const m = fakeMessaging({ a: 'messaging/server-unavailable' });
  const r = await sendAlert(m, ['a'], TEXT, DATA, LINK);
  assert.strictEqual(r.results[0].ok, false);
  assert.deepStrictEqual(r.dead, [], 'geçici hata token kaydını silmemeli');
});

ta('geçici hatada bir kez yeniden deneniyor ve düzeliyor', async () => {
  const m = fakeMessaging({ a: true }, { throwTimes: 1 });
  const r = await sendAlert(m, ['a'], TEXT, DATA, LINK);
  assert.strictEqual(r.results[0].ok, true);
  assert.strictEqual(m.calls.length, 2, 'tam bir kez yeniden denenmeliydi');
});

ta('kalıcı hatada yeniden denenmiyor', async () => {
  const m = fakeMessaging({ a: true }, { throwTimes: 5, throwCode: 'messaging/invalid-argument' });
  const r = await sendAlert(m, ['a'], TEXT, DATA, LINK);
  assert.strictEqual(r.results[0].ok, false);
  assert.strictEqual(m.calls.length, 1, 'düzelmeyecek istek tekrarlanmamalı');
});

ta('MADDE 14 · FCM tamamen çökse bile exception atmıyor', async () => {
  const m = fakeMessaging({ a: true }, { throwTimes: 99 });
  const r = await sendAlert(m, ['a', 'b'], TEXT, DATA, LINK);
  assert.strictEqual(r.results.length, 2);
  assert.ok(r.results.every(x => !x.ok));
});

ta('cihaz yoksa hiç istek atılmıyor', async () => {
  const m = fakeMessaging({});
  const r = await sendAlert(m, [], TEXT, DATA, LINK);
  assert.deepStrictEqual(r.results, []);
  assert.strictEqual(m.calls.length, 0);
});

ta('500\'den çok cihaz partiler hâlinde gidiyor', async () => {
  const tokens = Array.from({ length: 1001 }, (_, i) => 'tok' + i);
  const plan = {};
  tokens.forEach(t2 => { plan[t2] = true; });
  const m = fakeMessaging(plan);
  const r = await sendAlert(m, tokens, TEXT, DATA, LINK);
  assert.strictEqual(m.calls.length, 3, 'FCM tek istekte en fazla 500 token alıyor');
  assert.strictEqual(r.results.length, 1001);
});
