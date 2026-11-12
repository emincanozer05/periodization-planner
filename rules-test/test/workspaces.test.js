/* Çalışma alanı kuralları (senkron Faz 1): üyelik, roller, takım kapsamı, davet, eski senkronun kilidi. */
const { test, before, after, beforeEach } = require('node:test');
const { assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, writeBatch, Timestamp } = require('firebase/firestore');
const { getEnv, seed, as } = require('./env');

before(getEnv);
beforeEach(async () => (await getEnv()).clearFirestore());
after(async () => (await getEnv()).cleanup());

const db = ctx => ctx.firestore();
const DAY = 24 * 3600 * 1000;
const future = () => Timestamp.fromMillis(Date.now() + 7 * DAY);
const past = () => Timestamp.fromMillis(Date.now() - DAY);

/* alice'in çalışma alanı: bob koç (yalnız T1), carol izleyici (hepsi), dave yönetici. */
async function seedWs() {
  await seed(async s => {
    await setDoc(doc(s, 'workspaces/alice'), { name: 'Kulüp', ownerUid: 'alice', schemaVersion: 2 });
    await setDoc(doc(s, 'workspaces/alice/members/alice'), { uid: 'alice', role: 'owner', teams: ['*'] });
    await setDoc(doc(s, 'workspaces/alice/members/bob'), { uid: 'bob', role: 'coach', teams: ['T1'] });
    await setDoc(doc(s, 'workspaces/alice/members/carol'), { uid: 'carol', role: 'viewer', teams: ['*'] });
    await setDoc(doc(s, 'workspaces/alice/members/dave'), { uid: 'dave', role: 'admin', teams: ['*'] });
    await setDoc(doc(s, 'workspaces/alice/teams/T1'), { name: 'A Takımı' });
    await setDoc(doc(s, 'workspaces/alice/teams/T2'), { name: 'U16' });
    await setDoc(doc(s, 'workspaces/alice/teams/T1/athletes/a1'), { name: 'Sporcu' });
    await setDoc(doc(s, 'workspaces/alice/teams/T2/athletes/a2'), { name: 'Genç' });
    await setDoc(doc(s, 'workspaces/alice/exercises/e1'), { name: 'Squat' });
  });
}

// ── kuruluş ────────────────────────────────────────────────────────────────
test('çalışma alanı: sahibi kendi kimliğiyle, sahip üyeliğiyle aynı batch\'te kurar', async () => {
  const a = db(await as('alice'));
  const b = writeBatch(a);
  b.set(doc(a, 'workspaces/alice'), { name: 'Kulüp', ownerUid: 'alice', schemaVersion: 2 });
  b.set(doc(a, 'workspaces/alice/members/alice'), { uid: 'alice', role: 'owner', teams: ['*'] });
  await assertSucceeds(b.commit());
});

test('çalışma alanı: üyeliksiz, başkası adına ya da anonim kurulamaz', async () => {
  const a = db(await as('alice'));
  await assertFails(setDoc(doc(a, 'workspaces/alice'), { name: 'x', ownerUid: 'alice' }));
  const bob = db(await as('bob'));
  const b = writeBatch(bob);
  b.set(doc(bob, 'workspaces/alice'), { name: 'x', ownerUid: 'alice' });
  b.set(doc(bob, 'workspaces/alice/members/alice'), { uid: 'alice', role: 'owner', teams: ['*'] });
  await assertFails(b.commit());
  const anon = db(await as('anon', 'anonymous'));
  const c = writeBatch(anon);
  c.set(doc(anon, 'workspaces/anon'), { name: 'x', ownerUid: 'anon' });
  c.set(doc(anon, 'workspaces/anon/members/anon'), { uid: 'anon', role: 'owner', teams: ['*'] });
  await assertFails(c.commit());
});

test('çalışma alanı: kurulduktan sonra sahip üyeliği yeniden yazılamaz, sahip değiştirilemez', async () => {
  await seedWs();
  const a = db(await as('alice'));
  await assertFails(setDoc(doc(a, 'workspaces/alice/members/alice'), { uid: 'alice', role: 'owner', teams: ['*'] }));
  await assertFails(updateDoc(doc(a, 'workspaces/alice'), { ownerUid: 'bob' }));
  await assertSucceeds(updateDoc(doc(a, 'workspaces/alice'), { name: 'Yeni ad' }));
  await assertFails(deleteDoc(doc(a, 'workspaces/alice')));
});

// ── okuma kapsamı ──────────────────────────────────────────────────────────
test('üye olmayan hiçbir şey göremez', async () => {
  await seedWs();
  const eve = db(await as('eve'));
  await assertFails(getDoc(doc(eve, 'workspaces/alice')));
  await assertFails(getDoc(doc(eve, 'workspaces/alice/teams/T1')));
  await assertFails(getDoc(doc(eve, 'workspaces/alice/teams/T1/athletes/a1')));
  await assertFails(getDoc(doc(eve, 'workspaces/alice/exercises/e1')));
  await assertFails(getDocs(collection(eve, 'workspaces/alice/members')));
});

test('takım kapsamı: yalnız T1\'e erişimi olan koç T2\'yi göremez', async () => {
  await seedWs();
  const bob = db(await as('bob'));
  await assertSucceeds(getDoc(doc(bob, 'workspaces/alice/teams/T1/athletes/a1')));
  await assertFails(getDoc(doc(bob, 'workspaces/alice/teams/T2')));
  await assertFails(getDoc(doc(bob, 'workspaces/alice/teams/T2/athletes/a2')));
  await assertFails(setDoc(doc(bob, 'workspaces/alice/teams/T2/athletes/a3'), { name: 'x' }));
  await assertSucceeds(getDoc(doc(bob, 'workspaces/alice/exercises/e1')));   // kütüphane ortak
});

// ── roller ─────────────────────────────────────────────────────────────────
test('koç düzenler (takım verisi, kütüphane); üye yönetemez', async () => {
  await seedWs();
  const bob = db(await as('bob'));
  await assertSucceeds(setDoc(doc(bob, 'workspaces/alice/teams/T1/sessions/s1'), { date: '2026-11-12', name: 'Kuvvet' }));
  await assertSucceeds(updateDoc(doc(bob, 'workspaces/alice/teams/T1/athletes/a1'), { position: 'PG' }));
  await assertSucceeds(setDoc(doc(bob, 'workspaces/alice/exercises/e2'), { name: 'RDL' }));
  await assertFails(setDoc(doc(bob, 'workspaces/alice/members/eve'), { uid: 'eve', role: 'coach', teams: ['*'] }));
  await assertFails(updateDoc(doc(bob, 'workspaces/alice/members/bob'), { teams: ['*'] }));   // kendine yetki veremez
  await assertFails(deleteDoc(doc(bob, 'workspaces/alice/teams/T1')));                       // takımı silemez
});

test('izleyici her şeyi görür, hiçbir şey yazamaz', async () => {
  await seedWs();
  const carol = db(await as('carol'));
  await assertSucceeds(getDoc(doc(carol, 'workspaces/alice/teams/T2/athletes/a2')));
  await assertFails(updateDoc(doc(carol, 'workspaces/alice/teams/T1/athletes/a1'), { name: 'x' }));
  await assertFails(setDoc(doc(carol, 'workspaces/alice/exercises/e3'), { name: 'x' }));
  await assertFails(updateDoc(doc(carol, 'workspaces/alice'), { name: 'x' }));
});

test('yönetici üye ekler/değiştirir/çıkarır; sahip rolü veremez, sahibe dokunamaz', async () => {
  await seedWs();
  const dave = db(await as('dave'));
  await assertSucceeds(setDoc(doc(dave, 'workspaces/alice/members/eve'), { uid: 'eve', role: 'coach', teams: ['T2'] }));
  await assertSucceeds(updateDoc(doc(dave, 'workspaces/alice/members/eve'), { role: 'viewer' }));
  await assertFails(updateDoc(doc(dave, 'workspaces/alice/members/eve'), { role: 'owner' }));
  await assertFails(setDoc(doc(dave, 'workspaces/alice/members/frank'), { uid: 'frank', role: 'owner', teams: ['*'] }));
  await assertFails(updateDoc(doc(dave, 'workspaces/alice/members/alice'), { role: 'viewer' }));
  await assertFails(deleteDoc(doc(dave, 'workspaces/alice/members/alice')));
  await assertSucceeds(deleteDoc(doc(dave, 'workspaces/alice/members/eve')));
});

test('üye kendisi ayrılabilir; sahip ayrılamaz', async () => {
  await seedWs();
  await assertSucceeds(deleteDoc(doc(db(await as('carol')), 'workspaces/alice/members/carol')));
  await assertFails(deleteDoc(doc(db(await as('alice')), 'workspaces/alice/members/alice')));
  await assertFails(deleteDoc(doc(db(await as('bob')), 'workspaces/alice/members/carol')));
});

// ── davet ──────────────────────────────────────────────────────────────────
const join = async (uid, token, over = {}, markUsed = true) => {
  const d = db(await as(uid));
  const b = writeBatch(d);
  b.set(doc(d, `workspaces/alice/members/${uid}`), Object.assign({ uid, role: 'coach', teams: ['T1'], invite: token }, over));
  if (markUsed) b.update(doc(d, `workspaces/alice/invites/${token}`), { usedBy: uid });
  return b.commit();
};
const invite = (over = {}) => Object.assign({ role: 'coach', teams: ['T1'], usedBy: null, expiresAt: future(), createdBy: 'alice' }, over);

test('davet: yönetici açar; koç ve izleyici açamaz; yalnız yönetici listeler', async () => {
  await seedWs();
  await assertSucceeds(setDoc(doc(db(await as('alice')), 'workspaces/alice/invites/tok1'), invite()));
  await assertFails(setDoc(doc(db(await as('bob')), 'workspaces/alice/invites/tok2'), invite({ createdBy: 'bob' })));
  await assertFails(setDoc(doc(db(await as('alice')), 'workspaces/alice/invites/tok3'), invite({ role: 'owner' })));
  await assertSucceeds(getDocs(collection(db(await as('dave')), 'workspaces/alice/invites')));
  await assertFails(getDocs(collection(db(await as('bob')), 'workspaces/alice/invites')));
});

test('davet: linki olan kendi üyeliğini davetteki rolle açar ve daveti kullanır', async () => {
  await seedWs();
  await seed(s => setDoc(doc(s, 'workspaces/alice/invites/tok1'), invite()));
  await assertSucceeds(join('eve', 'tok1'));
  await assertSucceeds(getDoc(doc(db(await as('eve')), 'workspaces/alice/teams/T1/athletes/a1')));
});

test('davet: ikinci kez kullanılamaz, süresi geçmişse olmaz, rol yükseltilemez, işaretlemeden olmaz', async () => {
  await seedWs();
  await seed(async s => {
    await setDoc(doc(s, 'workspaces/alice/invites/used'), invite({ usedBy: 'eve' }));
    await setDoc(doc(s, 'workspaces/alice/invites/old'), invite({ expiresAt: past() }));
    await setDoc(doc(s, 'workspaces/alice/invites/tok1'), invite());
  });
  await assertFails(join('frank', 'used'));
  await assertFails(join('frank', 'old'));
  await assertFails(join('frank', 'tok1', { role: 'admin' }));
  await assertFails(join('frank', 'tok1', { teams: ['*'] }));
  await assertFails(join('frank', 'tok1', {}, false));
  await assertFails(join('frank', 'yok'));
  // Başkası adına üyelik açılamaz.
  const f = db(await as('frank'));
  const b = writeBatch(f);
  b.set(doc(f, 'workspaces/alice/members/gina'), { uid: 'gina', role: 'coach', teams: ['T1'], invite: 'tok1' });
  b.update(doc(f, 'workspaces/alice/invites/tok1'), { usedBy: 'gina' });
  await assertFails(b.commit());
});

// ── eski senkronun kilidi (taşınmış hesap) ─────────────────────────────────
test('eski senkron: taşınmış hesapta manifest ve yeni parça yazılamaz, okuma sürer', async () => {
  await seed(s => setDoc(doc(s, 'kullanici_verileri/alice'), { userId: 'alice', rev: 5, migratedTo: 'workspaces/alice' }));
  const a = db(await as('alice'));
  await assertFails(updateDoc(doc(a, 'kullanici_verileri/alice'), { base: 5, rev: 6 }));
  await assertFails(setDoc(doc(a, 'kullanici_verileri/alice_9_0'), { userId: 'alice', c: 'x' }));
  await assertSucceeds(getDoc(doc(a, 'kullanici_verileri/alice')));
});

test('sahip kendi (henüz olmayan) çalışma alanı belgesini okuyabilir; başkası okuyamaz', async () => {
  await assertSucceeds(getDoc(doc(db(await as('zed')), 'workspaces/zed')));
  await assertFails(getDoc(doc(db(await as('bob')), 'workspaces/zed')));
});
