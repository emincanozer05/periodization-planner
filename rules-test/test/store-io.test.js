/* Kayıt bazlı senkron — Firestore bağlantısı (senkron Faz 2b-2).
   src/app/468-store-map.jsx'teki <store-map> ve <store-io> bölümleri, emulator'deki GERÇEK
   Firestore'a karşı, aynı hesabın iki ayrı istemcisiyle (iki cihaz gibi) sınanır. Kurallar da
   gerçek: çalışma alanı üyeliği ve roller (firestore.rules) devrede. */
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const fc = require('firebase/compat/app');
require('firebase/compat/firestore');
const { setDoc, doc } = require('firebase/firestore');
const { getEnv, seed, as } = require('./env');

const src = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'app', '468-store-map.jsx'), 'utf8');
const cut = (a, b) => src.slice(src.indexOf(a), src.indexOf(b));
// eslint-disable-next-line no-new-func
const SM = new Function(cut('/* <store-map>', '/* </store-map> */') + cut('/* <store-io>', '/* </store-io> */')
  + '; return { smToDocs, smFromDocs, smDiff, smCanon, smWrite, smListen, smController };')();

before(getEnv);
beforeEach(async () => {
  await (await getEnv()).clearFirestore();
  await seed(async s => {
    await setDoc(doc(s, 'workspaces/alice'), { name: 'Kulüp', ownerUid: 'alice', schemaVersion: 2 });
    await setDoc(doc(s, 'workspaces/alice/members/alice'), { uid: 'alice', role: 'owner', teams: ['*'] });
    await setDoc(doc(s, 'workspaces/alice/members/carol'), { uid: 'carol', role: 'viewer', teams: ['*'] });
  });
});
after(async () => (await getEnv()).cleanup());

const WS = 'workspaces/alice';
const K = uid => ({ FieldPath: fc.firestore.FieldPath, FieldValue: fc.firestore.FieldValue, uid });
const device = async (uid = 'alice') => (await as(uid)).firestore();
const clone = o => JSON.parse(JSON.stringify(o));
const D = n => new Date(Date.UTC(2026, 10, 12) + n * 864e5).toISOString().slice(0, 10);

function sample() {
  const ses = (id, extra) => Object.assign({ id, name: 'Kuvvet', duration: 60, blocks: [{ id: id + 'b', exercises: [{ name: 'Squat', sets: '4' }] }] }, extra || {});
  const athletes = [0, 1, 2].map(k => ({
    id: 'a' + k, name: 'Sporcu ' + k + ' ğüş', position: 'PG', phaseBank: { rows: [['Squat', 3]] },
    tests: [{ id: 't' + k, date: D(-10), cmj: 40 + k }], injuries: [], measurements: [],
    wellness: [{ date: D(-1), sleep: 4 }], srpeLog: [{ id: 'r' + k, date: D(-1), scRPE: 6 }], nightLog: [], liftLog: [],
    days: { [D(1)]: { date: D(1), dailyNotes: '', sessions: [ses('as' + k, { sourceId: 's1' })] } },
  }));
  const days = {}; for (let o = -2; o <= 3; o++) days[D(o)] = { date: D(o), dailyNotes: '', sessions: [ses('s' + (o + 3))] };
  return {
    teams: [{ id: 'T1', setup: { teamName: 'A' }, days, weekOverrides: {}, athletes, staff: [], seasons: [{ id: 'S1' }], activeSeasonId: 'S1', seasonData: {} }],
    exercises: [{ id: 'e0', name: 'Squat' }, { id: 'e1', name: 'RDL' }], templates: [], interval: { work: 30 },
  };
}

/* İstemcinin gördüğü veri: dinleyiciden gelen belgeler → data. pred sağlanana kadar bekler. */
function watch(db) {
  let last = null, waiters = [];
  const off = SM.smListen(db, WS, docs => { last = docs; waiters = waiters.filter(w => !w(docs)); }, e => { throw e; });
  return {
    off,
    until: (pred, ms = 10000) => new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error('bekleme süresi doldu; son veri: ' + (last ? SM.smCanon(SM.smFromDocs(last)).slice(0, 300) : 'yok'))), ms);
      const w = docs => { try { const d = SM.smFromDocs(docs); if (pred(d, docs)) { clearTimeout(t); res(d); return true; } } catch (e) { /* henüz değil */ } return false; };
      if (last && w(last)) return; waiters.push(w);
    }),
  };
}
const same = (a, b) => SM.smCanon(a) === SM.smCanon(b);

/* Başlangıç: A bütün veriyi yazar; döner: belgeler (iki cihazın ortak başlangıcı). */
async function start(data) {
  const docs = SM.smToDocs(clone(data));
  const r = await SM.smWrite(await device(), WS, SM.smDiff({}, docs), K('alice'));
  assert.deepStrictEqual(r.failed, []);
  return docs;
}
const opsFrom = (docs0, data, mut) => { const d = clone(data); mut(d); return SM.smDiff(docs0, SM.smToDocs(d, docs0)); };

test('gerçek Firestore: yazılan veri öbür cihazda birebir geri kurulur', async () => {
  const data = sample(); data.ai = { grid: [[1, 2], [3]] };   // iç içe dizi de
  await start(data);
  const b = watch(await device());
  await b.until(d => same(d, data));
  b.off();
});

test('canlı güncelleme: A\'nın tek düzenlemesi B\'ye gelir', async () => {
  const data = sample(); const docs0 = await start(data);
  const b = watch(await device());
  await b.until(d => same(d, data));
  const ops = opsFrom(docs0, data, d => { d.teams[0].athletes[1].tests[0].cmj = 77; });
  assert.strictEqual(ops.length, 1, 'tek belge yazılmalı');
  await SM.smWrite(await device(), WS, ops, K('alice'));
  await b.until(d => d.teams[0].athletes[1].tests[0].cmj === 77);
  b.off();
});

test('iki cihaz AYNI ANDA: farklı sporcu ekler, aynı sporcunun farklı alanlarını değiştirir, aynı aya wellness ekler → hepsi kalır', async () => {
  const data = sample(); const docs0 = await start(data);
  const opsA = opsFrom(docs0, data, d => {
    d.teams[0].athletes.push({ id: 'ax', name: 'X' });
    d.teams[0].athletes[0].name = 'Yeni Ad';
    d.teams[0].athletes[2].wellness.push({ date: D(0), sleep: 1 });
    d.teams[0].days[D(1)].sessions[0].name = 'A adı';
  });
  const opsB = opsFrom(docs0, data, d => {
    d.teams[0].athletes.push({ id: 'ay', name: 'Y' });
    d.teams[0].athletes[0].position = 'C';
    d.teams[0].athletes[2].wellness.push({ date: D(0), sleep: 5 });
    d.teams[0].days[D(1)].sessions[0].duration = 90;
  });
  const [ra, rb] = await Promise.all([SM.smWrite(await device(), WS, opsA, K('alice')), SM.smWrite(await device(), WS, opsB, K('alice'))]);
  assert.deepStrictEqual(ra.failed.concat(rb.failed), []);
  const c = watch(await device());
  await c.until(d => {
    const t = d.teams[0], a0 = t.athletes.find(a => a.id === 'a0'), w = t.athletes.find(a => a.id === 'a2').wellness, s = t.days[D(1)].sessions[0];
    return ['ax', 'ay'].every(id => t.athletes.some(a => a.id === id)) && a0.name === 'Yeni Ad' && a0.position === 'C'
      && w.some(x => x.sleep === 1) && w.some(x => x.sleep === 5) && s.name === 'A adı' && s.duration === 90;
  });
  c.off();
});

test('silinen seansa gelen düzenleme düşer ve bildirilir; aynı paketteki öbür düzenleme kalır', async () => {
  const data = sample(); const docs0 = await start(data);
  await SM.smWrite(await device(), WS, opsFrom(docs0, data, d => { d.teams[0].days[D(2)].sessions = []; }), K('alice'));
  const opsB = opsFrom(docs0, data, d => { d.teams[0].days[D(2)].sessions[0].name = 'x'; d.exercises[0].name = 'Squat 2'; });
  const rb = await SM.smWrite(await device(), WS, opsB, K('alice'));
  assert.deepStrictEqual(rb.failed, ['teams/T1/sessions/s5']);   // D(2) günü → s5
  const c = watch(await device());
  await c.until(d => d.teams[0].days[D(2)].sessions.length === 0 && d.exercises[0].name === 'Squat 2');
  c.off();
});

test('izleyici (viewer) yazamaz: hata yukarı çıkar, hiçbir şey yazılmaz', async () => {
  const data = sample(); const docs0 = await start(data);
  const ops = opsFrom(docs0, data, d => { d.exercises[0].name = 'izinsiz'; });
  await assert.rejects(SM.smWrite(await device('carol'), WS, ops, K('carol')), e => e.code === 'permission-denied');
  const c = watch(await device());
  await c.until(d => d.exercises[0].name === 'Squat');
  c.off();
});

test('büyük ilk yazım (900 egzersiz) paketlere bölünür', async () => {
  const data = sample();
  data.exercises = Array.from({ length: 900 }, (_, i) => ({ id: 'x' + i, name: 'Egzersiz ' + i }));
  await start(data);
  const c = watch(await device());
  await c.until(d => d.exercises.length === 900 && d.exercises[899].id === 'x899', 20000);
  c.off();
});

test('verinin üst düzey alanları state/root\'ta; çalışma alanı belgesi (sahiplik) bozulmaz', async () => {
  await start(sample());
  const db = await device();
  const ws = (await db.doc(WS).get()).data();
  assert.strictEqual(ws.ownerUid, 'alice');
  const root = (await db.doc(WS + '/state/root').get()).data();
  assert.deepStrictEqual(root.interval, { work: 30 });
  assert.strictEqual(root._by, 'alice');
});

/* ── denetleyici: iki cihaz, her birinin kendi "ekranı" ─────────────────────── */
async function deviceCtl(uid = 'alice', teams) {
  const screen = { data: null, status: '', notes: 0, errors: [] };
  const ctl = SM.smController({
    fs: await device(uid), wsPath: WS, K: K(uid), teams,
    getData: () => screen.data, apply: d => { screen.data = d; },
    prep: d => { const c = Object.assign({}, d); delete c.activeTeamId; return c; },
    fromDocs: docs => Object.assign(SM.smFromDocs(docs), { activeTeamId: 'T1' }),
    status: s => { screen.status = s; }, note: n => { screen.notes += n; }, error: e => { screen.errors.push(e); },
  });
  ctl.start();
  /* Ekranda düzenleme: yeni nesne (React gibi), sonra denetleyiciye haber. */
  const edit = (mut, notify = true) => { const d = clone(screen.data); mut(d); screen.data = d; if (notify) ctl.changed(); };
  const until = (pred, ms = 10000) => new Promise((res, rej) => {
    const t0 = Date.now();
    const tick = () => { let ok = false; try { ok = !!screen.data && pred(screen.data); } catch (e) { /* henüz */ }
      if (ok) return res(screen.data); if (Date.now() - t0 > ms) return rej(new Error('bekleme doldu: ' + (screen.data ? SM.smCanon(screen.data).slice(0, 200) : 'veri yok')));
      setTimeout(tick, 50); };
    tick();
  });
  return { screen, ctl, edit, until };
}
const A0 = d => d.teams[0].athletes.find(a => a.id === 'a0');

test('denetleyici: iki cihaz açılır, A\'nın düzenlemesi B\'nin ekranına gelir', async () => {
  const data = sample(); await start(data);
  const a = await deviceCtl(), b = await deviceCtl();
  await a.until(d => same(d.teams, data.teams)); await b.until(d => same(d.teams, data.teams));
  a.edit(d => { A0(d).tests[0].cmj = 99; });
  await b.until(d => A0(d).tests[0].cmj === 99);
  await a.ctl.idle(); await a.until(() => a.screen.status === 'synced');
  a.ctl.stop(); b.ctl.stop();
});

test('denetleyici: iki cihaz AYNI ANDA aynı sporcunun farklı alanlarını değiştirir ve ayrı sporcu ekler → iki ekran da ikisini gösterir', async () => {
  const data = sample(); await start(data);
  const a = await deviceCtl(), b = await deviceCtl();
  await a.until(d => !!d.teams); await b.until(d => !!d.teams);
  a.edit(d => { A0(d).name = 'A adı'; d.teams[0].athletes.push({ id: 'ax', name: 'X' }); });
  b.edit(d => { A0(d).position = 'C'; d.teams[0].athletes.push({ id: 'ay', name: 'Y' }); });
  const ok = d => A0(d).name === 'A adı' && A0(d).position === 'C' && ['ax', 'ay'].every(id => d.teams[0].athletes.some(x => x.id === id));
  await a.until(ok); await b.until(ok);
  a.ctl.stop(); b.ctl.stop();
});

test('denetleyici: ekranda GÖNDERİLMEMİŞ düzenleme varken öbür cihazdan güncelleme gelir → yerel düzenleme ezilmez, gönderilir', async () => {
  const data = sample(); await start(data);
  const a = await deviceCtl(), b = await deviceCtl();
  await a.until(d => !!d.teams); await b.until(d => !!d.teams);
  b.edit(d => { d.exercises[0].name = 'B yerel'; }, false);   // B yazdı ama henüz göndermedi
  a.edit(d => { A0(d).position = 'SF'; });                     // A'nın güncellemesi B'ye gelir
  await b.until(d => A0(d).position === 'SF' && d.exercises[0].name === 'B yerel');
  await a.until(d => d.exercises[0].name === 'B yerel');       // B'nin düzenlemesi A'ya da ulaştı
  a.ctl.stop(); b.ctl.stop();
});

test('denetleyici: silinmiş seansa düzenleme → not düşer, öbür değişiklikler kalır', async () => {
  const data = sample(); await start(data);
  const a = await deviceCtl(), b = await deviceCtl();
  await a.until(d => !!d.teams); await b.until(d => !!d.teams);
  b.ctl.stop();                                                // B çevrimdışı gibi: güncelleme almıyor
  a.edit(d => { d.teams[0].days[D(3)].sessions = []; });
  await a.ctl.idle();
  b.edit(d => { d.teams[0].days[D(3)].sessions[0].name = 'x'; d.exercises[1].name = 'RDL 2'; });
  await b.ctl.idle();
  if (b.screen.notes !== 1) throw new Error('not bekleniyordu, notes=' + b.screen.notes);
  const c = await deviceCtl();
  await c.until(d => d.teams[0].days[D(3)].sessions.length === 0 && d.exercises[1].name === 'RDL 2');
  a.ctl.stop(); c.ctl.stop();
});

/* ── Faz 5: kulüp üyeleri ────────────────────────────────────────────────── */
async function twoTeams() {
  const data = sample();
  data.teams.push({ id: 'T2', setup: { teamName: 'U16' }, days: {}, weekOverrides: {}, staff: [], seasons: [{ id: 'X' }], activeSeasonId: 'X', seasonData: {},
    athletes: [{ id: 'u1', name: 'Genç', tests: [], injuries: [], measurements: [], wellness: [], srpeLog: [], nightLog: [], liftLog: [], days: {} }] });
  await start(data);
  await seed(async s => {
    await setDoc(doc(s, 'workspaces/alice/members/bob'), { uid: 'bob', role: 'coach', teams: ['T1'] });
    await setDoc(doc(s, 'workspaces/alice/members/dave'), { uid: 'dave', role: 'admin', teams: ['*'] });
  });
  return data;
}

test('üye: yalnız T1\'e erişen antrenör yalnız T1\'i görür, düzenler; düzenlemesi sahibe gelir', async () => {
  await twoTeams();
  const owner = await deviceCtl('alice'), bob = await deviceCtl('bob', ['T1']);
  await owner.until(d => d.teams.length === 2);
  await bob.until(d => d.teams.length === 1 && d.teams[0].id === 'T1');
  if (bob.screen.errors.length) throw new Error('beklenmeyen hata: ' + bob.screen.errors[0].code);
  bob.edit(d => { A0(d).position = 'C'; });
  await owner.until(d => A0(d).position === 'C' && d.teams.length === 2);
  await bob.ctl.idle();
  if (bob.screen.errors.length) throw new Error('yazımda hata: ' + bob.screen.errors[0].code);
  owner.ctl.stop(); bob.ctl.stop();
});

test('üye: yönetici bütün takımları görür', async () => {
  await twoTeams();
  const dave = await deviceCtl('dave', ['*']);
  await dave.until(d => d.teams.length === 2 && d.teams[1].athletes[0].name === 'Genç');
  dave.ctl.stop();
});

test('üye: izleyicinin yazımı reddedilir ve bildirilir, veri değişmez', async () => {
  await twoTeams();
  const carol = await deviceCtl('carol', ['*']);
  await carol.until(d => d.teams.length === 2);
  carol.edit(d => { d.exercises[0].name = 'izinsiz'; });
  await carol.ctl.idle();
  if (!carol.screen.errors.some(e => e.code === 'permission-denied')) throw new Error('reddedilme bildirilmedi');
  const owner = await deviceCtl('alice');
  await owner.until(d => d.exercises[0].name === 'Squat');
  carol.ctl.stop(); owner.ctl.stop();
});
