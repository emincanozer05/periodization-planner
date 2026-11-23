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

test('belge içindeki listeler AYNI ANDA: iki çalışan, iki lokasyon, aynı güne iki kutucuk → hepsi kalır; silinen elemana düzenleme yarım kalmaz', async () => {
  const data = sample(); const t0 = data.teams[0];
  t0.staff = [{ id: 'st1', name: 'Yardımcı' }, { id: 'st2', name: 'Fizyo' }];
  t0.setup.roughPlan = { types: [{ id: 'str', name: 'Kuvvet', color: '#f00' }], days: { [D(2)]: [{ id: 'bx1', t: 'str' }] }, locs: ['Salon'] };
  const docs0 = await start(data);
  const opsA = opsFrom(docs0, data, d => {
    const t = d.teams[0]; t.staff.push({ id: 'stA', name: 'A' }); t.setup.roughPlan.locs.push('Saha');
    t.setup.roughPlan.days[D(2)].push({ id: 'bxA', t: 'str' }); t.staff = t.staff.filter(s => s.id !== 'st2');
  });
  const opsB = opsFrom(docs0, data, d => {
    const t = d.teams[0]; t.staff.push({ id: 'stB', name: 'B' }); t.setup.roughPlan.locs.push('Havuz');
    t.setup.roughPlan.days[D(2)].push({ id: 'bxB', t: 'str', time: '17:00' }); t.staff[1].name = 'Fizyoterapist';
  });
  const [ra, rb] = await Promise.all([SM.smWrite(await device(), WS, opsA, K('alice')), SM.smWrite(await device(), WS, opsB, K('alice'))]);
  assert.deepStrictEqual(ra.failed.concat(rb.failed), []);
  const c = watch(await device());
  const got = await c.until(d => {
    const t = d.teams[0], rp = t.setup.roughPlan;
    return ['st1', 'stA', 'stB'].every(id => t.staff.some(s => s.id === id))
      && ['Salon', 'Saha', 'Havuz'].every(l => rp.locs.includes(l)) && rp.days[D(2)].length === 3;
  });
  /* st2'yi A sildi, B düzenledi: hangisi sonra gelirse gelsin st2 ya hiç yok ya tam (kimliğiyle) */
  const st2 = got.teams[0].staff.find(s => s.name === 'Fizyoterapist' || s.id === 'st2');
  assert.ok(!st2 || st2.id === 'st2', 'yarım eleman okundu: ' + JSON.stringify(st2));
  assert.ok(got.teams[0].staff.every(s => s && typeof s.id === 'string'));
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
async function deviceCtl(uid = 'alice', teams, flags, reactQ) {
  const screen = { data: null, status: '', notes: 0, errors: [], shadows: [], trips: [], q: reactQ ? [] : null, applies: 0 };
  let ctl = null;
  ctl = SM.smController({
    fs: await device(uid), wsPath: WS, K: K(uid), teams,
    flag: n => !!(flags && flags[n]), shadow: (n, i) => screen.shadows.push(n + ':' + i), trip: (n, w) => screen.trips.push(n + ':' + w),
    getData: () => screen.data,
    /* reactQ: ekran React gibi davranır — güncellemeler sıraya girer, render() onları sırayla işler. apply, uygulamanın
       455'teki güncelleyicisiyle aynı: sıradaki son hâl karşılaştırılan hâl değilse yeniden tabanlanır. */
    apply: (d, cx) => {
      screen.applies++;
      if (!screen.q || screen.data === null) { screen.data = d; if (screen.trace) screen.trace.push(screen.traceOf(d)); return; }
      screen.q.push(prev => (!cx || prev === cx.cur || prev === d) ? d : (ctl.rebase(prev, cx) || d));
    },
    prep: d => { const c = Object.assign({}, d); delete c.activeTeamId; return c; },
    fromDocs: docs => Object.assign(SM.smFromDocs(docs), { activeTeamId: 'T1' }),
    status: s => { screen.status = s; }, note: n => { screen.notes += n; }, error: e => { screen.errors.push(e); },
  });
  ctl.start();
  const render = () => { if (!screen.q) return; let v = screen.data; const q = screen.q.splice(0); q.forEach(f => { v = f(v); }); if (v !== screen.data) { screen.data = v; ctl.changed(); } };
  const enqueue = mut => screen.q.push(prev => { const d = clone(prev); mut(d); return d; });
  /* Ekranda düzenleme: yeni nesne (React gibi), sonra denetleyiciye haber. */
  const edit = (mut, notify = true) => { const d = clone(screen.data); mut(d); screen.data = d; if (notify) ctl.changed(); };
  const until = (pred, ms = 10000) => new Promise((res, rej) => {
    const t0 = Date.now();
    const tick = () => { let ok = false; try { ok = !!screen.data && pred(screen.data); } catch (e) { /* henüz */ }
      if (ok) return res(screen.data); if (Date.now() - t0 > ms) return rej(new Error('bekleme doldu: ' + (screen.data ? SM.smCanon(screen.data).slice(0, 200) : 'veri yok')));
      setTimeout(tick, 50); };
    tick();
  });
  return { screen, ctl, edit, until, render, enqueue };
}
const A0 = d => d.teams[0].athletes.find(a => a.id === 'a0');

test('denetleyici: iki cihaz açılır, A\'nın düzenlemesi B\'nin ekranına gelir', async () => {
  const data = sample(); await start(data);
  const a = await deviceCtl(), b = await deviceCtl();
  await a.until(d => same(d.teams, data.teams)); await b.until(d => same(d.teams, data.teams));
  a.edit(d => { A0(d).tests[0].cmj = 99; });
  await b.until(d => A0(d).tests[0].cmj === 99);
  await a.ctl.idle(); await a.until(() => a.screen.status === 'synced');
  // Ölçüm (senkron hız planı R0): sayaçlar yalnızca sayar; bir gönderim, bir yazım onayı, gelen turlar.
  const sa = a.ctl.stats(), sb = b.ctl.stats();
  assert.ok(sa.flushN >= 1 && sa.opsN >= 1 && sa.writeN === 1 && sa.ackMs >= 0, JSON.stringify(sa));
  assert.ok(sb.echoN >= 2 && sb.applyN >= 2 && sb.writeN === 0, JSON.stringify(sb));   // ilk yükleme + A'nın düzenlemesi
  a.ctl.stop(); b.ctl.stop();
});

/* Senkron hız planı R2 — metaSkip: hiçbir belgenin değişmediği dinleyici olayları (yazım onayı, önbellek→sunucu). */
test('metaSkip gölge (bayrak kapalı): sessiz olaylar sayılır, atlanmaz, hiçbiri ekranı değiştirmezdi', async () => {
  const data = sample(); await start(data);
  const a = await deviceCtl(), b = await deviceCtl();
  await a.until(d => same(d.teams, data.teams)); await b.until(d => same(d.teams, data.teams));
  for (let i = 0; i < 4; i++) { a.edit(d => { A0(d).tests[0].cmj = 70 + i; }); await a.ctl.idle(); }
  await b.until(d => A0(d).tests[0].cmj === 73);
  await new Promise(r => setTimeout(r, 400));
  const sa = a.ctl.stats();
  assert.ok(sa.quietN >= 1, 'yazım onayı sessiz olay olarak görülmeli: ' + JSON.stringify(sa));
  assert.strictEqual(sa.quietSkip, 0); assert.strictEqual(sa.quietMiss, 0, JSON.stringify(a.screen.shadows));
  assert.ok(same(a.screen.data, b.screen.data));
  assert.strictEqual(b.ctl.stats().quietMiss, 0);
  a.ctl.stop(); b.ctl.stop();
});

test('metaSkip açık: sessiz olaylar atlanır; iki cihaz AYNI ANDA düzenler, ikisi de aynı hâle gelir, bayrak kapanmaz', async () => {
  const data = sample(); await start(data);
  const F = { metaSkip: true };
  const a = await deviceCtl('alice', undefined, F), b = await deviceCtl('alice', undefined, F);
  await a.until(d => same(d.teams, data.teams)); await b.until(d => same(d.teams, data.teams));
  for (let i = 0; i < 6; i++) {
    a.edit(d => { A0(d).tests[0].cmj = 80 + i; });
    b.edit(d => { A0(d).position = 'P' + i; d.exercises[0].name = 'Ex' + i; });
    await Promise.all([a.ctl.idle(), b.ctl.idle()]);
  }
  const fin = d => A0(d).tests[0].cmj === 85 && A0(d).position === 'P5' && d.exercises[0].name === 'Ex5';
  await a.until(fin); await b.until(fin);
  await a.until(() => a.screen.status === 'synced'); await b.until(() => b.screen.status === 'synced');
  assert.ok(same(a.screen.data, b.screen.data), 'iki ekran birebir aynı olmalı');
  const sa = a.ctl.stats(), sb = b.ctl.stats();
  assert.ok(sa.quietSkip + sb.quietSkip >= 1, 'en az bir sessiz olay atlanmalı: ' + JSON.stringify([sa, sb]));
  assert.strictEqual(sa.quietMiss + sb.quietMiss, 0, JSON.stringify([a.screen.shadows, b.screen.shadows]));
  assert.deepStrictEqual(a.screen.trips.concat(b.screen.trips), []);
  // Sunucudaki hâl de ekranla aynı (atlanan olaylar hiçbir yazımı kaçırmadı)
  const c = await deviceCtl(); await c.until(fin); assert.ok(same(c.screen.data.teams, a.screen.data.teams));
  a.ctl.stop(); b.ctl.stop(); c.ctl.stop();
});

/* Senkron hız planı R2 — echoSkip: değişen belgelerin hepsi bu cihazın gönderdiğiyle aynıysa (kendi yankısı). */
test('echoSkip gölge (bayrak kapalı): kendi yazımlarının yankısı tanınır, liste hiç eksik değil', async () => {
  const data = sample(); await start(data);
  const a = await deviceCtl(), b = await deviceCtl();
  await a.until(d => same(d.teams, data.teams)); await b.until(d => same(d.teams, data.teams));
  for (let i = 0; i < 4; i++) { a.edit(d => { A0(d).tests[0].cmj = 50 + i; d.exercises[0].name = 'Y' + i; }); await a.ctl.idle(); }
  await b.until(d => A0(d).tests[0].cmj === 53 && d.exercises[0].name === 'Y3');
  await new Promise(r => setTimeout(r, 400));
  const sa = a.ctl.stats(), sb = b.ctl.stats();
  assert.ok(sa.ownHit >= 1, 'A kendi yankısını tanımalı: ' + JSON.stringify(sa));
  assert.strictEqual(sa.ownSkip, 0); assert.strictEqual(sa.ownMiss + sb.ownMiss, 0, JSON.stringify([a.screen.shadows, b.screen.shadows]));
  assert.strictEqual(sb.ownHit, 0, 'B için A\'nın yazımı yankı değil: ' + JSON.stringify(sb));
  assert.ok(same(a.screen.data, b.screen.data));
  a.ctl.stop(); b.ctl.stop();
});

test('echoSkip + metaSkip açık: iki cihaz AYNI ANDA ve aynı belgeyi hızlı hızlı düzenler → hepsi kalır, iki ekran ve sunucu birebir', async () => {
  const data = sample(); await start(data);
  const F = { echoSkip: true, metaSkip: true };
  const a = await deviceCtl('alice', undefined, F), b = await deviceCtl('alice', undefined, F);
  await a.until(d => same(d.teams, data.teams)); await b.until(d => same(d.teams, data.teams));
  for (let i = 0; i < 6; i++) {
    a.edit(d => { A0(d).tests[0].cmj = 90 + i; });
    a.edit(d => { A0(d).tests[0].cmj = 100 + i; });              // aynı belgeye arka arkaya iki düzenleme (eski yankı)
    b.edit(d => { A0(d).position = 'Q' + i; d.exercises[0].name = 'Z' + i; });   // aynı sporcu belgesi, başka alan
    await Promise.all([a.ctl.idle(), b.ctl.idle()]);
  }
  const fin = d => A0(d).tests[0].cmj === 105 && A0(d).position === 'Q5' && d.exercises[0].name === 'Z5';
  await a.until(fin); await b.until(fin);
  await a.until(() => a.screen.status === 'synced'); await b.until(() => b.screen.status === 'synced');
  assert.ok(same(a.screen.data, b.screen.data), 'iki ekran birebir aynı olmalı');
  const sa = a.ctl.stats(), sb = b.ctl.stats();
  assert.ok(sa.ownSkip + sb.ownSkip >= 1, 'en az bir yankı atlanmalı: ' + JSON.stringify([sa, sb]));
  assert.strictEqual(sa.ownMiss + sb.ownMiss + sa.quietMiss + sb.quietMiss, 0, JSON.stringify([a.screen.shadows, b.screen.shadows]));
  assert.deepStrictEqual(a.screen.trips.concat(b.screen.trips), []);
  const c = await deviceCtl(); await c.until(fin); assert.ok(same(c.screen.data.teams, a.screen.data.teams), 'sunucu ekranla aynı olmalı');
  a.ctl.stop(); b.ctl.stop(); c.ctl.stop();
});

/* Senkron hız planı R2 — pipeWrite: yazımlar onay beklemeden art arda Firestore'a verilir. */
for (const pipe of [false, true]) {
  test(`${pipe ? 'pipeWrite açık' : 'sıralı (bayrak kapalı)'}: silinmiş seansa düşen paket reddedilir, ARKASINDAN gelen yeni değer ezilmez`, async () => {
    const data = sample(); await start(data);
    const a = await deviceCtl('alice', undefined, pipe ? { pipeWrite: true } : {});
    await a.until(d => same(d.teams, data.teams));
    a.ctl.stop();                                             // A silinmeyi görmesin (çevrimdışı kalmış gibi)
    await (await device()).doc(WS + '/teams/T1/sessions/s3').delete();   // başka cihaz seansı sildi
    a.edit(d => { d.exercises[0].name = 'X1'; d.teams[0].days[D(0)].sessions[0].duration = 99; });   // paket 1: e0 + s3 (reddedilir)
    a.edit(d => { d.exercises[0].name = 'X2'; });                                                     // paket 2: e0 (daha yeni)
    await a.ctl.idle();
    const e0 = (await (await device()).doc(WS + '/exercises/e0').get()).data();
    const s3 = await (await device()).doc(WS + '/teams/T1/sessions/s3').get();
    assert.strictEqual(e0.name, 'X2', 'daha yeni değer kalmalı (eski X1 onu ezmemeli)');
    assert.strictEqual(s3.exists, false, 'silinen seans geri gelmemeli');
    assert.strictEqual(a.screen.notes, 1, 'silinmiş kayda düşen düzenleme bildirilmeli');
    assert.deepStrictEqual(a.screen.errors, []); assert.deepStrictEqual(a.screen.trips, []);
    if (pipe) assert.ok(a.ctl.stats().pipeN >= 2 && a.ctl.stats().pipeRetry === 1, JSON.stringify(a.ctl.stats()));
  });
}

test('pipeWrite + echoSkip + metaSkip: iki cihaz beklemeden art arda düzenler → hepsi kalır, iki ekran ve sunucu birebir, geri alma yok', async () => {
  const data = sample(); await start(data);
  const F = { pipeWrite: true, echoSkip: true, metaSkip: true };
  const a = await deviceCtl('alice', undefined, F), b = await deviceCtl('alice', undefined, F);
  await a.until(d => same(d.teams, data.teams)); await b.until(d => same(d.teams, data.teams));
  for (let i = 0; i < 10; i++) {
    a.edit(d => { A0(d).tests[0].cmj = 200 + i; });
    if (i % 2) b.edit(d => { A0(d).position = 'R' + i; d.exercises[1].name = 'W' + i; });
  }
  await Promise.all([a.ctl.idle(), b.ctl.idle()]);
  const fin = d => A0(d).tests[0].cmj === 209 && A0(d).position === 'R9' && d.exercises[1].name === 'W9';
  await a.until(fin); await b.until(fin);
  await a.until(() => a.screen.status === 'synced'); await b.until(() => b.screen.status === 'synced');
  assert.ok(same(a.screen.data, b.screen.data), 'iki ekran birebir aynı olmalı');
  const sa = a.ctl.stats(), sb = b.ctl.stats();
  assert.strictEqual(sa.ownMiss + sb.ownMiss + sa.quietMiss + sb.quietMiss, 0, JSON.stringify([a.screen.shadows, b.screen.shadows]));
  assert.deepStrictEqual(a.screen.trips.concat(b.screen.trips), []);
  assert.ok(sa.pipeN >= 1 && sb.pipeN >= 1);
  const c = await deviceCtl(); await c.until(fin); assert.ok(same(c.screen.data.teams, a.screen.data.teams), 'sunucu ekranla aynı olmalı');
  a.ctl.stop(); b.ctl.stop(); c.ctl.stop();
});

/* Senkron hız planı R2 — staleEcho: kendi onaylanmamış yazımının ESKİ yankısı ekrana konmaz (yazarken geri gitme). */
const cmjOf = d => A0(d).tests[0].cmj;
test('staleEcho gölge (bayrak kapalı): hızlı düzenlemede tam yolun geri almaları sayılır, uyuşmazlık yok', async () => {
  const data = sample(); await start(data);
  const a = await deviceCtl('alice', undefined, { pipeWrite: true });
  await a.until(d => same(d.teams, data.teams));
  for (let i = 0; i < 10; i++) a.edit(d => { A0(d).tests[0].cmj = 300 + i; });
  await a.ctl.idle(); await a.until(d => cmjOf(d) === 309); await a.until(() => a.screen.status === 'synced');
  const sa = a.ctl.stats();
  assert.ok(sa.staleHit >= 1 && sa.staleRevert >= 1, 'eski yankı görülmeli ve tam yol ekranı geri almalı: ' + JSON.stringify(sa));
  assert.strictEqual(sa.staleSkip, 0); assert.strictEqual(sa.ownMiss, 0);
  a.ctl.stop();
});

test('staleEcho açık (dört bayrak): hızlı düzenlemeden sonra ekran bir daha ESKİ değere dönmez; karşı cihazın değişikliği gelir', async () => {
  const data = sample(); await start(data);
  const F = { pipeWrite: true, echoSkip: true, metaSkip: true, staleEcho: true };
  const a = await deviceCtl('alice', undefined, F), b = await deviceCtl('alice', undefined, F);
  await a.until(d => same(d.teams, data.teams)); await b.until(d => same(d.teams, data.teams));
  a.screen.traceOf = cmjOf; a.screen.trace = [];
  for (let i = 0; i < 10; i++) a.edit(d => { A0(d).tests[0].cmj = 400 + i; });
  b.edit(d => { A0(d).position = 'BB'; d.exercises[1].name = 'Bx'; });
  await Promise.all([a.ctl.idle(), b.ctl.idle()]);
  const fin = d => cmjOf(d) === 409 && A0(d).position === 'BB' && d.exercises[1].name === 'Bx';
  await a.until(fin); await b.until(fin);
  await a.until(() => a.screen.status === 'synced'); await b.until(() => b.screen.status === 'synced');
  assert.deepStrictEqual(a.screen.trace.filter(v => v !== 409), [], 'A\'nın ekranı eski değere dönmemeli: ' + a.screen.trace.join(' '));
  assert.ok(same(a.screen.data, b.screen.data));
  const sa = a.ctl.stats();
  assert.ok(sa.staleSkip >= 1, JSON.stringify(sa));
  assert.strictEqual(sa.ownMiss + b.ctl.stats().ownMiss, 0); assert.deepStrictEqual(a.screen.trips.concat(b.screen.trips), []);
  const c = await deviceCtl(); await c.until(fin); assert.ok(same(c.screen.data.teams, a.screen.data.teams), 'sunucu ekranla aynı olmalı');
  a.ctl.stop(); b.ctl.stop(); c.ctl.stop();
});

test('staleEcho açık: karşı cihaz AYNI ALANA A\'nın eski değerini yazar → A\'nın ekranı yine sunucuyla birebir aynı kalır', async () => {
  const data = sample(); await start(data);
  const F = { pipeWrite: true, echoSkip: true, metaSkip: true, staleEcho: true };
  const a = await deviceCtl('alice', undefined, F), b = await deviceCtl('alice', undefined, F);
  await a.until(d => same(d.teams, data.teams)); await b.until(d => same(d.teams, data.teams));
  for (let r = 0; r < 4; r++) {
    for (let i = 0; i < 5; i++) a.edit(d => { A0(d).tests[0].cmj = 500 + i; });
    b.edit(d => { A0(d).tests[0].cmj = 501; });          // A'nın gönderdiği eski bir sürümle aynı değer
    await Promise.all([a.ctl.idle(), b.ctl.idle()]);
  }
  await a.until(() => a.screen.status === 'synced'); await b.until(() => b.screen.status === 'synced');
  await new Promise(r => setTimeout(r, 600));
  const c = await deviceCtl(); await c.until(d => !!d.teams);
  await new Promise(r => setTimeout(r, 400));
  const srv = cmjOf(c.screen.data);
  assert.strictEqual(cmjOf(a.screen.data), srv, 'A ekranı sunucuyla aynı olmalı');
  assert.strictEqual(cmjOf(b.screen.data), srv, 'B ekranı sunucuyla aynı olmalı');
  assert.ok(same(a.screen.data, b.screen.data) && same(c.screen.data.teams, a.screen.data.teams));
  a.ctl.stop(); b.ctl.stop(); c.ctl.stop();
});

/* VERİ KAYBI (bulundu: uçtan uca test bölüm 10). Gelen veri ekrana düz değer olarak konunca, ekranda henüz
   işlenmemiş (React'in topladığı) bir düzenleme siliniyordu ve hiç gönderilmiyordu. */
test('gelen veri, ekranın SIRADA BEKLEYEN düzenlemesini silmez: yeniden tabanlanır ve gönderilir', async () => {
  const data = sample(); await start(data);
  const a = await deviceCtl('alice', undefined, undefined, true), b = await deviceCtl();
  await a.until(d => same(d.teams, data.teams)); await b.until(d => same(d.teams, data.teams));
  const ap0 = a.screen.applies;
  a.enqueue(d => { A0(d).tests[0].cmj = 901; d.exercises[1].name = 'Asırada'; });   // A'da sıraya girdi, işlenmedi
  b.edit(d => { A0(d).position = 'RR'; }); await b.ctl.idle();                       // B uzaktan değiştirdi
  for (let k = 0; k < 100 && a.screen.applies === ap0; k++) await new Promise(r => setTimeout(r, 50));
  assert.ok(a.screen.applies > ap0, 'A gelen veriyi işlemeli');
  a.render();                                                                      // React sırayı işler
  const d = a.screen.data;
  assert.strictEqual(A0(d).tests[0].cmj, 901, 'A\'nın sıradaki düzenlemesi silinmemeli');
  assert.strictEqual(d.exercises[1].name, 'Asırada');
  assert.strictEqual(A0(d).position, 'RR', 'B\'nin değişikliği de ekranda olmalı');
  assert.strictEqual(a.ctl.stats().rebaseN, 1);
  await a.ctl.idle(); await a.until(() => a.screen.status === 'synced');
  await b.until(x => A0(x).tests[0].cmj === 901 && x.exercises[1].name === 'Asırada' && A0(x).position === 'RR');
  const srv = (await (await device()).doc(WS + '/teams/T1/tests/t0').get()).data();
  assert.strictEqual(srv.cmj, 901, 'sunucuya gitmeli');
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

test('denetleyici: veri daha yeni bir biçimle (_fmt) yazılmışsa ne okunur ne yazılır, hata bildirilir', async () => {
  const data = sample(); await start(data);
  const a = await deviceCtl();
  await a.until(d => same(d.teams, data.teams));
  /* "gelecekteki" bir sürüm kök belgeyi kendi biçimiyle yazar */
  await SM.smWrite(await device(), WS, [{ op: 'update', path: '', fields: [{ path: ['_fmt'], value: 99 }, { path: ['interval'], value: { yeni: true } }] }], K('alice'));
  const t0 = Date.now(); while (!a.screen.errors.length && Date.now() - t0 < 10000) await new Promise(r => setTimeout(r, 50));
  assert.strictEqual(a.screen.errors[0] && a.screen.errors[0].code, 'newer-format');
  assert.ok(!a.screen.data.interval.yeni, 'yeni biçimdeki veri ekrana konmamalı');
  a.edit(d => { d.exercises[0].name = 'eski sürümden'; });
  await a.ctl.idle();
  const c = watch(await device());
  await c.until(d => d.interval && d.interval.yeni === true);
  await new Promise(r => setTimeout(r, 300));
  const back = await c.until(() => true);
  assert.strictEqual(back.exercises[0].name, 'Squat', 'eski sürüm yazmamalı');
  c.off(); a.ctl.stop();
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
