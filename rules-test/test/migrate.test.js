/* Senkron Faz 3 — taşıma aracı (smMigrate), emulator'de gerçek Firestore ve gerçek kurallarla.
   Eski yapı (kullanici_verileri/<uid> manifesti) iyimser kilitle (base == rev) kilitlenir. */
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const fc = require('firebase/compat/app');
require('firebase/compat/firestore');
const { setDoc, doc } = require('firebase/firestore');
const { assertFails } = require('@firebase/rules-unit-testing');
const { getEnv, seed, as } = require('./env');

const src = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'app', '468-store-map.jsx'), 'utf8');
const cut = (a, b) => src.slice(src.indexOf(a), src.indexOf(b));
// eslint-disable-next-line no-new-func
const SM = new Function(cut('/* <store-map>', '/* </store-map> */') + cut('/* <store-io>', '/* </store-io> */')
  + '; return { smToDocs, smFromDocs, smCanon, smMigrate, smReadAll, SM_DOC_LIMIT };')();

before(getEnv);
beforeEach(async () => {
  await (await getEnv()).clearFirestore();
  // Eski yapı: manifest rev 5 (base 4 — son yazımın tabanı).
  await seed(s => setDoc(doc(s, 'kullanici_verileri/alice'), { userId: 'alice', rev: 5, base: 4, n: 1 }));
});
after(async () => (await getEnv()).cleanup());

const K = uid => ({ FieldPath: fc.firestore.FieldPath, FieldValue: fc.firestore.FieldValue, uid });
const D = n => new Date(Date.UTC(2026, 10, 12) + n * 864e5).toISOString().slice(0, 10);
function sample() {
  return {
    teams: [{ id: 'T1', setup: { teamName: 'A' }, weekOverrides: {}, staff: [], seasons: [{ id: 'S1' }], activeSeasonId: 'S1', seasonData: {},
      days: { [D(0)]: { date: D(0), dailyNotes: 'not', sessions: [{ id: 's1', name: 'Kuvvet', blocks: [] }] } },
      athletes: [{ id: 'a1', name: 'Sporcu ğüş', tests: [{ id: 't1', date: D(-3), cmj: 41 }], injuries: [], measurements: [],
        wellness: [{ date: D(-1), sleep: 4 }], srpeLog: [{ id: 'r1', date: D(-1), scRPE: 6 }], nightLog: [], liftLog: [], days: {} }] }],
    exercises: [{ id: 'e1', name: 'Squat' }], templates: [], interval: { work: 30 },
  };
}
/* Uygulamanın yapacağı kilit: taşımanın başında okunan rev'e karşı (iyimser). */
const lockAt = (db, rev) => () => db.doc('kullanici_verileri/alice').update({ migratedTo: 'workspaces/alice', base: rev });
const run = async (data, over = {}) => {
  const db = (await as('alice')).firestore();
  const rev = (await db.doc('kullanici_verileri/alice').get()).data().rev;
  return { db, r: await SM.smMigrate(Object.assign({ fs: db, uid: 'alice', K: K('alice'), data, lockLegacy: lockAt(db, rev) }, over)) };
};

test('taşıma: çalışma alanı kurulur, veri birebir yazılır, eski yapı kilitlenir, işaret konur', async () => {
  const data = sample();
  const { db, r } = await run(data);
  assert.strictEqual(r.ok, true, JSON.stringify(r));
  const ws = (await db.doc('workspaces/alice').get()).data();
  assert.strictEqual(ws.migrated, true); assert.strictEqual(ws.ownerUid, 'alice'); assert.strictEqual(ws.schemaVersion, 2);
  assert.strictEqual((await db.doc('workspaces/alice/members/alice').get()).data().role, 'owner');
  const back = SM.smFromDocs(await SM.smReadAll(db, 'workspaces/alice'));
  assert.strictEqual(SM.smCanon(back), SM.smCanon(data));
  const m = (await db.doc('kullanici_verileri/alice').get()).data();
  assert.strictEqual(m.migratedTo, 'workspaces/alice');
  // Eski yapı artık yazılamaz (önbellekteki eski uygulama sürümü dahil).
  await assertFails(db.doc('kullanici_verileri/alice').update({ base: 5, rev: 6 }));
  await assertFails(db.doc('kullanici_verileri/alice_6_0').set({ userId: 'alice', c: 'x' }));
});

test('taşıma: ikinci kez çalıştırmak bir şey yapmaz', async () => {
  await run(sample());
  const { r } = await run(sample());
  assert.strictEqual(r.ok, true); assert.strictEqual(r.already, true);
});

test('taşıma: yarıda kalmış deneme kaldığı yerden sürer (fazla belge silinir, eksik yazılır)', async () => {
  await seed(async s => {
    await setDoc(doc(s, 'workspaces/alice'), { name: '', ownerUid: 'alice', schemaVersion: 2, migrated: false });
    await setDoc(doc(s, 'workspaces/alice/members/alice'), { uid: 'alice', role: 'owner', teams: ['*'] });
    await setDoc(doc(s, 'workspaces/alice/exercises/zzz'), { name: 'yarım denemeden kalan', _o: 9 });
  });
  const data = sample();
  const { db, r } = await run(data);
  assert.strictEqual(r.ok, true, JSON.stringify(r));
  assert.strictEqual((await db.doc('workspaces/alice/exercises/zzz').get()).exists, false);
  assert.strictEqual(SM.smCanon(SM.smFromDocs(await SM.smReadAll(db, 'workspaces/alice'))), SM.smCanon(data));
});

test('taşıma: arada başka cihaz eski yapıya yazdıysa kilit tutmaz, işaret KONMAZ, eski yapı açık kalır', async () => {
  const db = (await as('alice')).firestore();
  const staleRev = (await db.doc('kullanici_verileri/alice').get()).data().rev;   // 5
  // Öbür cihaz yazıyor: rev 6.
  await (await as('alice')).firestore().doc('kullanici_verileri/alice').update({ base: 5, rev: 6 });
  const r = await SM.smMigrate({ fs: db, uid: 'alice', K: K('alice'), data: sample(), lockLegacy: lockAt(db, staleRev) });
  assert.strictEqual(r.ok, false); assert.strictEqual(r.step, 'lock');
  assert.strictEqual((await db.doc('workspaces/alice').get()).data().migrated, false);
  assert.strictEqual('migratedTo' in (await db.doc('kullanici_verileri/alice').get()).data(), false);
  // Eski yapı hâlâ yazılabilir: uygulama eski düzende sürer, taşıma sonra yeniden denenir.
  await db.doc('kullanici_verileri/alice').update({ base: 6, rev: 7 });
});

test('taşıma: ön kontrol düşerse (çok büyük belge) HİÇBİR ŞEY yazılmaz', async () => {
  const data = sample(); data.teams[0].athletes[0].photo = 'x'.repeat(SM.SM_DOC_LIMIT + 10);
  const { db, r } = await run(data);
  assert.strictEqual(r.ok, false); assert.strictEqual(r.step, 'precheck');
  assert.strictEqual((await db.doc('workspaces/alice').get()).exists, false);
  assert.strictEqual('migratedTo' in (await db.doc('kullanici_verileri/alice').get()).data(), false);
});

test('taşıma: başkası bir hesabın çalışma alanını kuramaz', async () => {
  const bob = (await as('bob')).firestore();
  await assert.rejects(SM.smMigrate({ fs: bob, uid: 'alice', K: K('bob'), data: sample(), lockLegacy: async () => {} }),
    e => e.code === 'permission-denied');
  const db = (await as('alice')).firestore();
  assert.strictEqual((await db.doc('workspaces/alice').get()).exists, false);
});
