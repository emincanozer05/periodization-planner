/* Bugünkü Firestore kurallarının temel güvenceleri. Senkron Faz 1'in workspaces/**
   kuralları ve abonelik (billing) kuralları da buraya eklenecek. */
const { test, before, after, beforeEach } = require('node:test');
const { assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, addDoc } = require('firebase/firestore');
const { getEnv, seed, as, anon } = require('./env');

before(getEnv);
beforeEach(async () => (await getEnv()).clearFirestore());
after(async () => (await getEnv()).cleanup());

const db = ctx => ctx.firestore();

// ── kullanici_verileri: senkron verisi yalnızca sahibinin ──────────────────
test('senkron: sahibi kendi verisini yazar ve okur', async () => {
  const a = db(await as('alice'));
  await assertSucceeds(setDoc(doc(a, 'kullanici_verileri/alice'), { userId: 'alice', rev: 1 }));
  await assertSucceeds(getDoc(doc(a, 'kullanici_verileri/alice')));
});

test('senkron: başkasının verisi okunamaz, değiştirilemez, silinemez', async () => {
  await seed(s => setDoc(doc(s, 'kullanici_verileri/alice'), { userId: 'alice', rev: 1 }));
  const b = db(await as('bob'));
  await assertFails(getDoc(doc(b, 'kullanici_verileri/alice')));
  await assertFails(updateDoc(doc(b, 'kullanici_verileri/alice'), { rev: 2 }));
  await assertFails(deleteDoc(doc(b, 'kullanici_verileri/alice')));
});

test('senkron: başkası adına (userId sahte) kayıt açılamaz', async () => {
  const b = db(await as('bob'));
  await assertFails(setDoc(doc(b, 'kullanici_verileri/bob_x'), { userId: 'alice' }));
});

test('senkron: oturumsuz erişim yok', async () => {
  await seed(s => setDoc(doc(s, 'kullanici_verileri/alice'), { userId: 'alice', rev: 1 }));
  const n = db(await anon());
  await assertFails(getDoc(doc(n, 'kullanici_verileri/alice')));
  await assertFails(setDoc(doc(n, 'kullanici_verileri/x'), { userId: 'x' }));
});

test('senkron: manifest yalnızca güncel rev üzerine yazılır (base == rev)', async () => {
  await seed(s => setDoc(doc(s, 'kullanici_verileri/alice'), { userId: 'alice', rev: 5 }));
  const a = db(await as('alice'));
  await assertFails(updateDoc(doc(a, 'kullanici_verileri/alice'), { base: 4, rev: 6 }));
  await assertSucceeds(updateDoc(doc(a, 'kullanici_verileri/alice'), { base: 5, rev: 6 }));
});

// ── users/{uid} ────────────────────────────────────────────────────────────
test('users: yalnızca kendi klasörü', async () => {
  const a = db(await as('alice'));
  await assertSucceeds(setDoc(doc(a, 'users/alice/settings/x'), { v: 1 }));
  const b = db(await as('bob'));
  await assertFails(getDoc(doc(b, 'users/alice/settings/x')));
  await assertFails(setDoc(doc(b, 'users/alice/settings/y'), { v: 1 }));
  await assertFails(getDoc(doc(db(await anon()), 'users/alice/settings/x')));
});

// ── check-in linkleri ve gönderimleri ──────────────────────────────────────
const LINK = { coachUid: 'alice', teamId: 't1' };
const checkin = (over = {}) => Object.assign({
  coachUid: 'alice', teamId: 't1', athleteId: 'a1', token: 'tok1', kind: 'wellness',
  date: '2026-11-12', payload: { sleep: 4 },
}, over);

test('check-in linki: adresi bilen okur, kimse listeleyemez', async () => {
  await seed(s => setDoc(doc(s, 'checkin_links/tok1'), LINK));
  const n = db(await anon());
  await assertSucceeds(getDoc(doc(n, 'checkin_links/tok1')));
  await assertFails(getDocs(collection(n, 'checkin_links')));
});

test('check-in linki: başkası adına link açılamaz', async () => {
  const b = db(await as('bob'));
  await assertFails(setDoc(doc(b, 'checkin_links/tok2'), { coachUid: 'alice', teamId: 't1' }));
});

test('check-in: geçerli token ile gönderilir, koç okur, başkası okuyamaz, değiştirilemez', async () => {
  await seed(s => setDoc(doc(s, 'checkin_links/tok1'), LINK));
  const athlete = db(await as('athlete-anon', 'anonymous'));
  await assertSucceeds(setDoc(doc(athlete, 'checkins/c1'), checkin()));
  await assertSucceeds(getDoc(doc(db(await as('alice')), 'checkins/c1')));
  await assertFails(getDoc(doc(db(await as('bob')), 'checkins/c1')));
  await assertFails(updateDoc(doc(db(await as('alice')), 'checkins/c1'), { kind: 'srpe' }));
});

test('check-in: token başka koçun/takımın ise reddedilir', async () => {
  await seed(s => setDoc(doc(s, 'checkin_links/tok1'), LINK));
  const athlete = db(await as('athlete-anon', 'anonymous'));
  await assertFails(setDoc(doc(athlete, 'checkins/c2'), checkin({ coachUid: 'bob' })));
  await assertFails(setDoc(doc(athlete, 'checkins/c3'), checkin({ teamId: 't2' })));
  await assertFails(setDoc(doc(athlete, 'checkins/c4'), checkin({ token: 'yok' })));
});

test('check-in: beklenmeyen alan ya da tür reddedilir', async () => {
  await seed(s => setDoc(doc(s, 'checkin_links/tok1'), LINK));
  const athlete = db(await as('athlete-anon', 'anonymous'));
  await assertFails(setDoc(doc(athlete, 'checkins/c5'), checkin({ extra: 1 })));
  await assertFails(setDoc(doc(athlete, 'checkins/c6'), checkin({ kind: 'admin' })));
  await assertFails(setDoc(doc(athlete, 'checkins/c7'), checkin({ date: '12.11.2026' })));
});

// ── ekip üyesi yalnızca kendi takımını görür ───────────────────────────────
test('wellness uyarısı: istemci yazamaz; ekip üyesi yalnızca kendi takımını okur', async () => {
  await seed(async s => {
    await setDoc(doc(s, 'staff_members/staff1'), { coachUid: 'alice', teamId: 't1', staffId: 's1', token: 'st1' });
    await setDoc(doc(s, 'wellness_alerts/w1'), { coachUid: 'alice', teamId: 't1' });
    await setDoc(doc(s, 'wellness_alerts/w2'), { coachUid: 'alice', teamId: 't2' });
  });
  const staff = db(await as('staff1', 'anonymous'));
  await assertSucceeds(getDoc(doc(staff, 'wellness_alerts/w1')));
  await assertFails(getDoc(doc(staff, 'wellness_alerts/w2')));
  await assertFails(setDoc(doc(db(await as('alice')), 'wellness_alerts/w3'), { coachUid: 'alice', teamId: 't1' }));
});

test('ekip üyesi kaydı: link olmadan ya da başka takıma eşleşilemez', async () => {
  await seed(s => setDoc(doc(s, 'staff_links/st1'), { coachUid: 'alice', teamId: 't1', staffId: 's1' }));
  const staff = db(await as('staff1', 'anonymous'));
  await assertFails(setDoc(doc(staff, 'staff_members/staff1'), { coachUid: 'alice', teamId: 't2', staffId: 's1', token: 'st1' }));
  await assertFails(setDoc(doc(staff, 'staff_members/staff1'), { coachUid: 'alice', teamId: 't1', staffId: 's1', token: 'yok' }));
  await assertSucceeds(setDoc(doc(staff, 'staff_members/staff1'), { coachUid: 'alice', teamId: 't1', staffId: 's1', token: 'st1' }));
  await assertFails(setDoc(doc(staff, 'staff_members/other'), { coachUid: 'alice', teamId: 't1', staffId: 's1', token: 'st1' }));
});

// ── yalnızca sunucunun koleksiyonları ──────────────────────────────────────
for (const col of ['ai_usage', 'ai_generation_locks', 'ai_context_cache', 'polar_tokens', 'polar_users']) {
  test(`${col}: istemciye tamamen kapalı`, async () => {
    const a = db(await as('alice'));
    await assertFails(getDoc(doc(a, `${col}/alice`)));
    await assertFails(setDoc(doc(a, `${col}/alice`), { x: 1 }));
  });
}

test('yapay zekâ işi: yalnızca kendi adına, QUEUED olarak açılır; anonim açamaz', async () => {
  const job = (over = {}) => Object.assign({
    uid: 'alice', athleteId: 'a1', srcKey: 'k', date: '2026-11-12', status: 'QUEUED',
    request: { system: 's', user: 'u' },
  }, over);
  const a = db(await as('alice'));
  await assertSucceeds(setDoc(doc(a, 'ai_generation_jobs/j1'), job()));
  await assertFails(setDoc(doc(a, 'ai_generation_jobs/j2'), job({ uid: 'bob' })));
  await assertFails(setDoc(doc(a, 'ai_generation_jobs/j3'), job({ status: 'COMPLETED' })));
  await assertFails(setDoc(doc(db(await as('x', 'anonymous')), 'ai_generation_jobs/j4'), job({ uid: 'x' })));
  await assertFails(getDoc(doc(db(await as('bob')), 'ai_generation_jobs/j1')));
});

// ── kurallarda tanımsız koleksiyon varsayılan olarak kapalı ────────────────
test('tanımsız koleksiyon: erişim yok', async () => {
  const a = db(await as('alice'));
  await assertFails(addDoc(collection(a, 'bilinmeyen'), { x: 1 }));
});

// ── abonelik: istemci okur, asla yazamaz ───────────────────────────────────
test('abonelik: sahibi ve ekip üyesi okur, başkası okuyamaz', async () => {
  await seed(async s => {
    await setDoc(doc(s, 'billing/alice'), { status: 'trialing' });
    await setDoc(doc(s, 'staff_members/staff1'), { coachUid: 'alice', teamId: 't1', staffId: 's1', token: 'st1' });
  });
  await assertSucceeds(getDoc(doc(db(await as('alice')), 'billing/alice')));
  await assertSucceeds(getDoc(doc(db(await as('staff1', 'anonymous')), 'billing/alice')));
  await assertFails(getDoc(doc(db(await as('bob')), 'billing/alice')));
  await assertFails(getDoc(doc(db(await anon()), 'billing/alice')));
});

test('abonelik: kimse kendine durum yazamaz (ücretsiz kullanım kapalı)', async () => {
  await seed(s => setDoc(doc(s, 'billing/alice'), { status: 'expired' }));
  const a = db(await as('alice'));
  await assertFails(updateDoc(doc(a, 'billing/alice'), { status: 'active' }));
  await assertFails(setDoc(doc(a, 'billing/alice'), { status: 'comp' }));
  await assertFails(deleteDoc(doc(a, 'billing/alice')));
  await assertFails(setDoc(doc(db(await as('bob')), 'billing/bob'), { status: 'active' }));
});

test('abonelik ayarı: oturumlu herkes okur, kimse yazamaz', async () => {
  await seed(s => setDoc(doc(s, 'config/billing'), { enforced: false }));
  const a = db(await as('alice'));
  await assertSucceeds(getDoc(doc(a, 'config/billing')));
  await assertFails(setDoc(doc(a, 'config/billing'), { enforced: false }));
  await assertFails(getDoc(doc(db(await anon()), 'config/billing')));
  await assertFails(getDoc(doc(a, 'config/diger')));
});

test('hesap silme izi: istemciye tamamen kapalı', async () => {
  const a = db(await as('alice'));
  await assertFails(getDoc(doc(a, 'account_deletions/x')));
  await assertFails(setDoc(doc(a, 'account_deletions/x'), { at: 1 }));
});
