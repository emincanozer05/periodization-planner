/* Storage kuralları: herkes yalnızca kendi users/<uid>/ klasörüne yazar. */
const { test, before, after } = require('node:test');
const { assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { ref, uploadString, deleteObject } = require('firebase/storage');
const { getEnv, as, anon } = require('./env');

before(getEnv);
after(async () => (await getEnv()).cleanup());

const st = ctx => ctx.storage();

test('storage: kendi klasörüne yükler ve siler', async () => {
  const a = st(await as('alice'));
  await assertSucceeds(uploadString(ref(a, 'users/alice/photo.txt'), 'x'));
  await assertSucceeds(deleteObject(ref(a, 'users/alice/photo.txt')));
});

test('storage: başkasının klasörüne yazamaz', async () => {
  const b = st(await as('bob'));
  await assertFails(uploadString(ref(b, 'users/alice/evil.txt'), 'x'));
  await assertFails(uploadString(ref(st(await anon()), 'users/alice/evil.txt'), 'x'));
});

test('storage: users/ dışına yazılamaz', async () => {
  const a = st(await as('alice'));
  await assertFails(uploadString(ref(a, 'public/x.txt'), 'x'));
});
