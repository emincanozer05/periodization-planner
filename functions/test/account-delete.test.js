/* HESABI SİL — her kayıt gider, başkasınınki kalır; istek doğrulaması; kurallarla uyum. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { section, t, ta } = require('./harness');
const A = require('../account/delete');

const NOW = Date.parse('2026-11-12T10:00:00Z');
const nowSec = Math.floor(NOW / 1000);
const auth = (over = {}) => ({ uid: 'alice', token: Object.assign({ email: 'Alice@Example.com', auth_time: nowSec - 60, firebase: { sign_in_provider: 'google.com' } }, over) });

/* Sahte Firestore: koleksiyon → Map(id → veri). where/limit/get, batch, doc get/set/delete. */
function fakeDb(seed) {
  const cols = new Map();
  const col = name => { if (!cols.has(name)) cols.set(name, new Map()); return cols.get(name); };
  for (const [p, v] of Object.entries(seed)) { const [c, ...rest] = p.split('/'); col(c).set(rest.join('/'), v); }
  const docRef = (c, id) => ({
    c, id,
    get: async () => ({ exists: col(c).has(id), data: () => col(c).get(id) }),
    set: async v => { col(c).set(id, v); },
    delete: async () => { col(c).delete(id); },
  });
  const db = {
    cols,
    collection: c => ({
      doc: id => docRef(c, id),
      where: (f, op, v) => ({
        limit: n => ({
          get: async () => {
            const docs = [...col(c).entries()].filter(([, d]) => d && d[f] === v).slice(0, n)
              .map(([id, d]) => ({ id, ref: docRef(c, id), data: () => d }));
            return { empty: !docs.length, size: docs.length, docs };
          },
        }),
        get: async () => {
          const docs = [...col(c).entries()].filter(([, d]) => d && d[f] === v)
            .map(([id, d]) => ({ id, ref: docRef(c, id), data: () => d }));
          return { empty: !docs.length, size: docs.length, docs };
        },
      }),
    }),
    batch: () => { const ops = []; return { delete: r => ops.push(r), commit: async () => { for (const r of ops) await r.delete(); } }; },
    /* collection group: "grup:" önekli düz koleksiyonlar (ör. 'members' grubunun belgeleri). */
    collectionGroup: g => db.collection('group:' + g),
  };
  return db;
}

function deps(db, extra = {}) {
  const calls = { deletedUser: null, recursive: [], files: null, deregistered: [] };
  return {
    calls,
    deps: Object.assign({
      db,
      now: () => NOW,
      auth: { deleteUser: async uid => { calls.deletedUser = uid; } },
      recursiveDelete: async ref => { calls.recursive.push(ref.c + '/' + ref.id); },
      bucket: {
        getFiles: async ({ prefix }) => [[{ name: prefix + 'a.jpg' }, { name: prefix + 'b.pdf' }]],
        deleteFiles: async ({ prefix }) => { calls.files = prefix; },
      },
      decrypt: (enc, key, pid) => 'tok-' + pid,
      tokenKey: 'k',
      deregister: async ({ polarUserId }) => { calls.deregistered.push(polarUserId); return { removed: true }; },
    }, extra),
  };
}

section('HESABI SİL — istek doğrulaması');
t('doğru istek geçer (e-posta büyük/küçük harf duyarsız)', () => A.checkRequest(auth(), { confirm: ' alice@example.com ' }, nowSec));
t('oturumsuz reddedilir', () => assert.throws(() => A.checkRequest(null, {}, nowSec), e => e.code === 'UNAUTHENTICATED'));
t('anonim oturum reddedilir', () => assert.throws(
  () => A.checkRequest(auth({ firebase: { sign_in_provider: 'anonymous' } }), { confirm: 'alice@example.com' }, nowSec),
  e => e.code === 'UNAUTHENTICATED'));
t('eski giriş (15 dk+) yeniden giriş ister', () => assert.throws(
  () => A.checkRequest(auth({ auth_time: nowSec - 16 * 60 }), { confirm: 'alice@example.com' }, nowSec),
  e => e.code === 'REQUIRES_RECENT_LOGIN'));
t('onay metni yanlışsa reddedilir', () => assert.throws(
  () => A.checkRequest(auth(), { confirm: 'bob@example.com' }, nowSec), e => e.code === 'CONFIRM_MISMATCH'));
t('onay metni boşsa reddedilir', () => assert.throws(() => A.checkRequest(auth(), {}, nowSec), e => e.code === 'CONFIRM_MISMATCH'));

section('HESABI SİL — kayıtlar');
const SEED = {
  'kullanici_verileri/alice': { userId: 'alice', rev: 3 },
  'kullanici_verileri/alice_abc': { userId: 'alice' },
  'kullanici_verileri/bob': { userId: 'bob' },
  'checkin_links/t1': { coachUid: 'alice' },
  'checkins/c1': { coachUid: 'alice' },
  'checkins/c2': { coachUid: 'bob' },
  'staff_members/anon1': { coachUid: 'alice' },
  'push_tokens/fcm1': { uid: 'alice', coachUid: 'alice' },
  'push_tokens/fcm2': { uid: 'anon1', coachUid: 'alice' },
  'push_tokens/fcm3': { uid: 'bob', coachUid: 'bob' },
  'polar_tokens/p1': { coachUid: 'alice', polarUserId: 'p1', enc: 'x' },
  'polar_sleep/alice__a1__2026-11-01': { coachUid: 'alice' },
  'polar_sleep/bob__b1__2026-11-01': { coachUid: 'bob' },
  'ai_usage/alice': { proxy: 3 },
  'ai_usage/bob': { proxy: 1 },
  'billing/alice': { status: 'trialing' },
  'billing/bob': { status: 'active' },
  'group:members/ws_bob__alice': { uid: 'alice', role: 'coach' },
  'group:members/ws_bob__carol': { uid: 'carol', role: 'viewer' },
};
ta('hesabın her kaydı gider, başkasınınki kalır', async () => {
  const db = fakeDb(SEED);
  const { deps: d, calls } = deps(db);
  const r = await A.deleteAccount(auth(), { confirm: 'alice@example.com' }, d);
  assert.strictEqual(r.deleted, true);
  const left = c => [...db.cols.get(c).keys()];
  assert.deepStrictEqual(left('kullanici_verileri'), ['bob']);
  assert.deepStrictEqual(left('checkins'), ['c2']);
  assert.deepStrictEqual(left('push_tokens'), ['fcm3'], 'ekip üyesinin bu koça bağlı cihazı da gitmeli');
  assert.deepStrictEqual(left('staff_members'), []);
  assert.deepStrictEqual(left('polar_tokens'), []);
  assert.deepStrictEqual(left('polar_sleep'), ['bob__b1__2026-11-01']);
  assert.deepStrictEqual(left('ai_usage'), ['bob']);
  assert.deepStrictEqual(left('billing'), ['bob']);
  assert.deepStrictEqual(left('group:members'), ['ws_bob__carol'], 'başka kulüpteki üyeliği de gitmeli');
  assert.deepStrictEqual(calls.recursive, ['users/alice', 'workspaces/alice']);
  assert.strictEqual(calls.files, 'users/alice/');
  assert.strictEqual(calls.deletedUser, 'alice');
  assert.deepStrictEqual(calls.deregistered, ['p1'], 'Polar kaydı Polar tarafında da kaldırılmalı');
  assert.strictEqual(r.counts.files, 2);
});
ta('iz kaydı kişisel veri taşımaz (uid değil özeti)', async () => {
  const db = fakeDb(SEED);
  await A.deleteAccount(auth(), { confirm: 'alice@example.com' }, deps(db).deps);
  const ids = [...db.cols.get(A.AUDIT_COL).keys()];
  assert.strictEqual(ids.length, 1);
  assert.ok(!ids[0].includes('alice'));
  assert.strictEqual(ids[0], A.auditId('alice'));
});
ta('Polar\'a ulaşılamasa da hesap silinir', async () => {
  const db = fakeDb(SEED);
  const { deps: d, calls } = deps(db, { deregister: async () => { const e = new Error('net'); e.code = 'NETWORK'; throw e; } });
  await A.deleteAccount(auth(), { confirm: 'alice@example.com' }, d);
  assert.strictEqual(calls.deletedUser, 'alice');
  assert.deepStrictEqual([...db.cols.get('polar_tokens').keys()], []);
});
ta('doğrulama başarısızsa HİÇBİR ŞEY silinmez', async () => {
  const db = fakeDb(SEED);
  const { deps: d, calls } = deps(db);
  await assert.rejects(A.deleteAccount(auth(), { confirm: 'yanlis' }, d), e => e.code === 'CONFIRM_MISMATCH');
  assert.strictEqual(db.cols.get('kullanici_verileri').size, 3);
  assert.strictEqual(calls.deletedUser, null);
});
ta('yarıda kalırsa tekrar çalıştırmak güvenli; hesap zaten yoksa da biter', async () => {
  const db = fakeDb(SEED);
  const { deps: d } = deps(db, { auth: { deleteUser: async () => { const e = new Error('x'); e.code = 'auth/user-not-found'; throw e; } } });
  await A.deleteAccount(auth(), { confirm: 'alice@example.com' }, d);
  await A.deleteAccount(auth(), { confirm: 'alice@example.com' }, d);
});
ta('sayfalama: 400\'den fazla kayıt da silinir', async () => {
  const seed = {};
  for (let i = 0; i < 950; i++) seed['checkins/c' + i] = { coachUid: 'alice' };
  const db = fakeDb(seed);
  const n = await A.deleteWhere(db, 'checkins', 'coachUid', 'alice');
  assert.strictEqual(n, 950);
  assert.strictEqual(db.cols.get('checkins').size, 0);
});

section('HESABI SİL — firestore.rules ile uyum');
t('kurallardaki her koleksiyon ya silinir ya da bilerek hesap dışıdır', () => {
  const rules = fs.readFileSync(path.join(__dirname, '..', '..', 'firestore.rules'), 'utf8');
  /* Yalnızca üst düzey koleksiyonlar (4 boşluk girinti); workspaces/{ws} altındakiler
     (members, invites, teams…) workspaces/{uid} ile birlikte silinir. */
  const cols = new Set([...rules.matchAll(/^    match \/([a-z_]+)\//gm)].map(m => m[1]));
  assert.ok(cols.has('kullanici_verileri') && cols.has('workspaces'), 'kural dosyası okunamadı');
  /* Hesaba bağlı olmayanlar: genel ayar ve silme izi. */
  const NOT_ACCOUNT = new Set(['config', A.AUDIT_COL]);
  const covered = new Set([...A.BY_FIELD.map(x => x[0]), ...A.BY_ID, ...A.RECURSIVE]);
  const missing = [...cols].filter(c => !covered.has(c) && !NOT_ACCOUNT.has(c));
  assert.deepStrictEqual(missing, [], 'hesap silmede unutulan koleksiyon');
});
