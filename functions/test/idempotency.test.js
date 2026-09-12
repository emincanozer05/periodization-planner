/* ═══════════════════════════════════════════════════════════════════════════
   ÇİFT GÖNDERİM VE AYRI KAYITLAR — Test 14 ve Test 15

   Test 14, sahte bir Firestore üzerinde gerçekten çalıştırılıyor: aynı olay iki
   kez işlendiğinde ikinci çalışmanın sahiplenmeyi alamadığı görülüyor.
   Test 15, beş sporcunun beş AYRI uyarı kaydına düştüğünü doküman adları
   üzerinden gösteriyor — ad sporcudan türediği için birleşmeleri mümkün değil.
   ═══════════════════════════════════════════════════════════════════════════ */
const assert = require('assert');
const { section, t, ta } = require('./harness');
const { claimForAlert } = require('../claim');
const { alertDocId, rosterDocId, alertLink, safe } = require('../ids');

/* ── Sahte Firestore ──────────────────────────────────────────────────────────
   Gerçek transaction semantiğinin test için gereken kadarı: tx.get okur,
   tx.update yazar, ve iki çalışma aynı doküman nesnesini paylaşır. */
function fakeDb(initial) {
  const store = { doc: initial ? Object.assign({}, initial) : null };
  const ref = { id: 'checkin-1' };
  return {
    ref,
    store,
    async runTransaction(fn) {
      const tx = {
        async get() {
          return { exists: store.doc !== null, data: () => store.doc };
        },
        update(_ref, patch) {
          store.doc = Object.assign({}, store.doc, patch);
        },
      };
      return fn(tx);
    },
  };
}
const STAMP = () => 'SERVER_TIME';

section('TEST 14 — aynı olay iki kez işlenirse ikinci bildirim yok');

ta('ilk çalışma sahipleniyor', async () => {
  const db = fakeDb({ kind: 'wellness' });
  assert.strictEqual(await claimForAlert(db, db.ref, STAMP), true);
  assert.strictEqual(db.store.doc.alertClaimedAt, 'SERVER_TIME');
});

ta('ikinci çalışma sahiplenemiyor — damga duruyor', async () => {
  const db = fakeDb({ kind: 'wellness' });
  const first = await claimForAlert(db, db.ref, STAMP);
  const second = await claimForAlert(db, db.ref, STAMP);
  assert.strictEqual(first, true);
  assert.strictEqual(second, false, 'ikinci çalışma da sahiplendi — çift bildirim gider');
});

ta('gönderim tamamlanmışsa (alertSent) yeniden sahiplenilmiyor', async () => {
  const db = fakeDb({ kind: 'wellness', alertSent: true });
  assert.strictEqual(await claimForAlert(db, db.ref, STAMP), false);
});

ta('doküman arada silinmişse sahiplenilmiyor', async () => {
  const db = fakeDb(null);
  assert.strictEqual(await claimForAlert(db, db.ref, STAMP), false);
});

ta('transaction patlarsa sahiplenilmiyor — şüphede gönderme', async () => {
  const db = { runTransaction: async () => { throw new Error('unavailable'); } };
  assert.strictEqual(await claimForAlert(db, {}, STAMP), false);
});

ta('üçüncü, dördüncü tekrar da sessiz kalıyor', async () => {
  const db = fakeDb({ kind: 'wellness' });
  const tries = [];
  for (let i = 0; i < 4; i++) tries.push(await claimForAlert(db, db.ref, STAMP));
  assert.deepStrictEqual(tries, [true, false, false, false]);
});

section('TEST 15 — beş sporcu, beş ayrı uyarı kaydı');

const COACH = 'coach-1';
const DATE = '2026-03-04';
const FIVE = ['ath-emir', 'ath-ahmet', 'ath-mehmet', 'ath-can', 'ath-deniz'];

t('aynı sabah uyarı veren beş sporcu beş ayrı doküman adına düşüyor', () => {
  const ids = FIVE.map(a => alertDocId(COACH, a, DATE));
  assert.strictEqual(new Set(ids).size, 5, 'kayıtlar birleşti — her sporcu ayrı kalmalı');
});

t('kayıt adı sporcuyu taşıyor, sıra ya da zaman değil', () => {
  assert.strictEqual(alertDocId(COACH, 'ath-emir', DATE), 'coach-1__ath-emir__2026-03-04');
});

t('aynı sporcunun aynı günkü ikinci gönderimi AYNI kaydın üstüne yazıyor', () => {
  assert.strictEqual(
    alertDocId(COACH, 'ath-emir', DATE),
    alertDocId(COACH, 'ath-emir', DATE));
});

t('aynı sporcunun ertesi günü AYRI kayıt', () => {
  assert.notStrictEqual(
    alertDocId(COACH, 'ath-emir', '2026-03-04'),
    alertDocId(COACH, 'ath-emir', '2026-03-05'));
});

t('iki farklı hesaptaki aynı sporcu kimliği çakışmıyor', () => {
  // Yedek dosyası başka bir hesaba aktarılınca aynı sporcu kimliği iki hesapta olabilir.
  assert.notStrictEqual(
    alertDocId('coach-1', 'ath-emir', DATE),
    alertDocId('coach-2', 'ath-emir', DATE));
});

section('Doküman adları — güvenlik ve biçim');

t('güvensiz karakterler adda durmuyor', () => {
  assert.strictEqual(safe('a/b c.d'), 'a-b-c-d');
  assert.ok(!alertDocId('c/1', 'a/2', '2026-03-04').includes('/'));
});
t('boş kimlik ad üretmeyi bozmuyor', () => {
  assert.strictEqual(safe(''), '-');
  assert.ok(alertDocId('', '', '').length > 0);
});
t('kadro dokümanı takım başına ayrı', () => {
  assert.notStrictEqual(rosterDocId(COACH, 't1'), rosterDocId(COACH, 't2'));
  assert.strictEqual(rosterDocId(COACH, 't1'), 'coach-1__t1');
});

section('Bildirim linki — kurulum bağımsız');

t('uygulama adresinden derin link kuruluyor', () => {
  assert.strictEqual(
    alertLink('https://coachos.example.com/', 'alert-1'),
    'https://coachos.example.com/index.html#alert=alert-1');
});
t('alt klasörde yayınlanmış kurulum da çalışıyor', () => {
  assert.strictEqual(
    alertLink('https://example.com/app', 'alert-1'),
    'https://example.com/app/index.html#alert=alert-1');
});
t('adres index.html ile bitiyorsa yol ikiye katlanmıyor', () => {
  assert.strictEqual(
    alertLink('https://example.com/app/index.html', 'a1'),
    'https://example.com/app/index.html#alert=a1');
});
t('adresteki sorgu ve parça kısmı atılıyor', () => {
  assert.strictEqual(
    alertLink('https://example.com/app/index.html?x=1#alert=eski', 'a1'),
    'https://example.com/app/index.html#alert=a1');
});
t('kök dizinde yayınlanmış kurulum', () => {
  assert.strictEqual(alertLink('https://example.com', 'a1'), 'https://example.com/index.html#alert=a1');
  assert.strictEqual(alertLink('https://example.com/', 'a1'), 'https://example.com/index.html#alert=a1');
});
t('adres yoksa link yok — yanlış yere açmaktansa hiç açma', () => {
  assert.strictEqual(alertLink('', 'a1'), '');
  assert.strictEqual(alertLink(undefined, 'a1'), '');
  assert.strictEqual(alertLink('coachos.example.com', 'a1'), '');   // şema yok
});
t('link içindeki kimlik kaçırılıyor', () => {
  assert.ok(alertLink('https://e.com', 'a b').endsWith('#alert=a%20b'));
});
