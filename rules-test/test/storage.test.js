/* Storage kuralları: herkes yalnızca kendi users/<uid>/ klasörüne yazar ve onu okur.
   İndirme adresi (token'lı) kuralların dışında kalır: basılı çıktılar ve sporcu sayfaları çalışır. */
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { ref, uploadString, deleteObject, getBytes, listAll, getDownloadURL } = require('firebase/storage');
const { getEnv, as, anon } = require('./env');

before(getEnv);
after(async () => (await getEnv()).cleanup());

const st = ctx => ctx.storage();

test('storage: kendi klasörüne yükler, okur, listeler, siler', async () => {
  const a = st(await as('alice'));
  await assertSucceeds(uploadString(ref(a, 'users/alice/photo.txt'), 'x'));
  await assertSucceeds(getBytes(ref(a, 'users/alice/photo.txt')));
  await assertSucceeds(listAll(ref(a, 'users/alice')));
  await assertSucceeds(deleteObject(ref(a, 'users/alice/photo.txt')));
});

test('storage: başkasının klasörüne yazamaz', async () => {
  const b = st(await as('bob'));
  await assertFails(uploadString(ref(b, 'users/alice/evil.txt'), 'x'));
  await assertFails(uploadString(ref(st(await anon()), 'users/alice/evil.txt'), 'x'));
});

test('storage: başkasının klasörünü listeleyemez ve SDK ile okuyamaz (KVKK)', async () => {
  await assertSucceeds(uploadString(ref(st(await as('alice')), 'users/alice/athlete.txt'), 'x'));
  for (const ctx of [await as('bob'), await anon()]) {
    await assertFails(listAll(ref(st(ctx), 'users/alice')));
    await assertFails(getBytes(ref(st(ctx), 'users/alice/athlete.txt')));
  }
});

test('storage: indirme adresi oturumsuz açılır (basılı çıktı, sporcu sayfası)', async () => {
  const a = st(await as('alice'));
  await uploadString(ref(a, 'users/alice/print.txt'), 'merhaba');
  const url = await getDownloadURL(ref(a, 'users/alice/print.txt'));
  const r = await fetch(url);
  assert.strictEqual(r.status, 200);
  assert.strictEqual(await r.text(), 'merhaba');
});

test('storage: users/ dışına yazılamaz', async () => {
  const a = st(await as('alice'));
  await assertFails(uploadString(ref(a, 'public/x.txt'), 'x'));
});
