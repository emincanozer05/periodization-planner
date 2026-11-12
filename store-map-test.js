/* ═══════════════════════════════════════════════════════════════════════════
   KAYIT BAZLI SENKRON — eşleme testi (senkron Faz 2, docs/veri-modeli.md)

   src/app/468-store-map.jsx'teki <store-map> bölümünü olduğu gibi alır ve sınar:
     1. gidiş-dönüş BİREBİR: smFromDocs(smToDocs(d)) ≡ d (gerçekçi veri, kenar durumlar, rastgele veri)
     2. her belge Firestore'a yazılabilir (iç içe dizi yok, ayrılmış ad yok, boyut sınırı)
     3. tek düzenleme = tek belge (senkron planı B3): bir test değeri, bir seans adı, yeni bir
        wellness kaydı, kütüphanenin başına bir egzersiz yalnızca KENDİ belgesini değiştirir
     4. iki cihaz (B1, B2): aynı başlangıçtan iki cihazın düzenlemeleri alan düzeyinde sırayla
        uygulanınca ikisi de kalır; aynı alan → son yazan kazanır; silinen kayda düzenleme düşer

   Kurulum gerekmiyor: `node store-map-test.js`
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, 'src', 'app', '468-store-map.jsx'), 'utf8');
const a = src.indexOf('/* <store-map>');
const z = src.indexOf('/* </store-map> */');
if (a < 0 || z < a) { console.error('468-store-map.jsx: <store-map> bölümü bulunamadı'); process.exit(1); }
// eslint-disable-next-line no-new-func
const SM = new Function(src.slice(a, z) + '; return { smToDocs, smFromDocs, smCheckDocs, smCanon, smEnc, smDec, smDiff, smApply, smOrder, SM_DOC_LIMIT };')();

let pass = 0, fail = 0;
const check = (name, ok, detail) => {
  if (ok) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? '\n       ' + detail : '')); }
};
const section = s => console.log('\n== ' + s);
const clone = o => JSON.parse(JSON.stringify(o));
const strip = d => { const c = clone(d); delete c.activeTeamId; return c; };
const roundTrip = d => SM.smFromDocs(SM.smToDocs(clone(d)));
const same = (x, y) => SM.smCanon(x) === SM.smCanon(y);
const firstDiff = (x, y, p = '') => {
  if (SM.smCanon(x) === SM.smCanon(y)) return null;
  if (!x || !y || typeof x !== 'object' || typeof y !== 'object' || Array.isArray(x) !== Array.isArray(y)) return p + ': ' + SM.smCanon(x).slice(0, 80) + ' ≠ ' + SM.smCanon(y).slice(0, 80);
  const keys = new Set([...Object.keys(x), ...Object.keys(y)]);
  for (const k of keys) { const r = firstDiff(x[k], y[k], p + '.' + k); if (r) return r; }
  return p + ': (sıra)';
};
const rt = (name, d) => { const back = roundTrip(d); check(name, same(back, strip(d)), firstDiff(back, strip(d))); };

/* ── gerçekçi bir hesap ───────────────────────────────────────────────────── */
const D = n => { const t = new Date(Date.UTC(2026, 10, 12) + n * 864e5); return t.toISOString().slice(0, 10); };
function realistic() {
  const exercises = ['Back Squat', 'RDL', 'Bench Press', 'Pull Up', 'Nordic Curl'].map((n, i) => ({ id: 'e' + i, name: n, type: 'Lower Body', muscle: ['quads', 'glutes'], contra: [], videoUrl: '', purpose: 'Kuvvet' }));
  const mkSession = (id, extra) => Object.assign({ id, name: 'Kuvvet', time: '10:00', duration: 60, purpose: 'Strength', focus: ['Strength'], sRPE: '', au: '', athletes: ['a0', 'a1'], sourceId: null,
    blocks: [{ id: id + 'b', name: 'Ana', exercises: [{ name: 'Back Squat', sets: '4', reps: '5', load: '80', description: '', superset: '', image: '', link: '' }] }], notes: '' }, extra || {});
  const days = {};
  for (let o = -10; o <= 10; o++) days[D(o)] = { date: D(o), dailyNotes: o === 0 ? 'Maç haftası' : '', sessions: o % 4 === 0 ? [] : [mkSession('ts' + (o + 20)), ...(o === 1 ? [mkSession('tp1', { time: '17:00' })] : [])] };
  const parkedDays = { [D(-400)]: { date: D(-400), dailyNotes: '', sessions: [mkSession('old1')] } };
  const athletes = [];
  for (let k = 0; k < 6; k++) {
    const ath = { id: 'a' + k, name: 'Sporcu ' + k + ' Ğüşiöç', dateOfBirth: '2008-03-1' + k, position: 'PG', photo: '', sex: 'M', levelTag: '', trainingProfile: { goal: 'güç' },
      phaseBank: { prep: { rows: [['Squat', 3], ['RDL', 2]] } }, programs: [{ id: 'pg' + k, name: 'Program', weeks: [[1, 2], [3]] }],
      tests: [-60, -30].map((o, i) => ({ id: 't' + k + i, date: D(o), cmj: 40 + k, height: 190, ohs: { score: 2, problems: ['', '', '', '', ''] }, circ: { thighRight: 55 } })),
      injuries: k % 2 ? [{ id: 'i' + k, location: 'diz', status: 'Active', date: D(-10) }] : [],
      measurements: [{ id: 'm' + k, srcTest: 't' + k + '0', date: D(-60), height: 190, weight: 85 }],
      wellness: [-2, -1, 0].map(o => ({ date: D(o), sleep: 4, fatigue: 3, soreness: 2, painMap: { 'Sağ diz önü': 2 } })),   // kimliksiz (eski kayıtlar)
      srpeLog: [-35, -2, -1].map(o => ({ id: 'r' + k + o, date: D(o), scRPE: 6, scDuration: 60, totalLoad: 360 })),
      nightLog: [{ id: 'n' + k, date: D(-1), hrv: 70, sleepHR: 48 }],
      liftLog: [{ id: 'l' + k, date: D(-1), ex: [{ k: 'sq', n: 'Squat', pl: { s: 3, r: 5, l: 80 } }] }],
      deletedSrpeSrcIds: ['x1'], phone: '', phoneCode: '+90',
      days: { [D(1)]: { date: D(1), dailyNotes: '', sessions: [mkSession('as' + k, { sourceId: 'tp1' })] } } };
    athletes.push(ath);
  }
  const team = { id: 'T1', setup: { sport: 'Basketball', teamName: 'A Takımı', clubName: 'Kulüp', seasonStart: D(-90), seasonEnd: D(200), competitions: [{ date: D(5), name: 'Maç' }], model: 'block', periods: null },
    days, weekOverrides: { [D(-7)]: { label: 'Deload' } }, athletes, staff: [{ id: 's1', name: 'Yardımcı', role: 'Assistant' }],
    seasons: [{ id: 'S2' }, { id: 'S1', name: '2025' }], activeSeasonId: 'S2',
    seasonData: { S1: { setup: { teamName: 'A Takımı', seasonStart: D(-450), seasonEnd: D(-200) }, days: parkedDays, weekOverrides: {} } },
    tallySync: { workerUrl: '', autoSync: false }, checkin: { token: 'tok' }, indiv: { ai: { k1: { instr: { phases: [] } } } }, tplIndivAutoCleanup: true };
  const team2 = { id: 'T2', setup: { teamName: 'U16' }, days: {}, weekOverrides: {}, athletes: [], staff: [], seasons: [{ id: 'X' }], activeSeasonId: 'X', seasonData: {} };
  return { activeTeamId: 'T1', teams: [team, team2], templates: [{ id: 'tpl1', name: 'Şablon', session: { focus: [] } }], exercises,
    customTests: [{ id: 'c1', name: 'Test' }], tryouts: [{ id: 'y1', name: 'Aday', tests: {}, picked: ['cmj'] }], tryoutTests: [], testTemplates: [],
    researches: [{ id: 'rs1', title: 'Makale', authors: ['A', 'B'] }], savedResearch: [{ title: 'kimliksiz' }], interval: { work: 30, rest: 15 }, ai: { model: 'x' }, customMuscles: ['core'] };
}

section('gidiş-dönüş birebir');
rt('gerçekçi hesap (2 takım, park edilmiş sezon, sporcu takvimi, günlükler)', realistic());
rt('yeni hesap (makeDefault benzeri)', { activeTeamId: 'T', teams: [{ id: 'T', setup: { teamName: 'X' }, days: {}, weekOverrides: {}, athletes: [], staff: [], seasons: [{ id: 's' }], activeSeasonId: 's', seasonData: {} }], templates: [] });
rt('boş nesne', {});

section('kenar durumlar: bölünemeyen veri olduğu gibi kalır');
const edge = (name, mut) => { const d = realistic(); mut(d); rt(name, d); };
edge('aynı kimlikli iki test', d => { d.teams[0].athletes[0].tests[1].id = d.teams[0].athletes[0].tests[0].id; });
edge('kimliksiz sakatlık', d => { delete d.teams[0].athletes[1].injuries[0].id; });
edge('kimliksiz sporcu', d => { delete d.teams[0].athletes[2].id; });
edge('sayı kimlikli egzersiz', d => { d.exercises[0].id = 7; });
edge('iki günde aynı seans kimliği', d => { const ds = d.teams[0].days; const ks = Object.keys(ds).filter(k => ds[k].sessions.length); ds[ks[1]].sessions[0].id = ds[ks[0]].sessions[0].id; });
edge('geçersiz gün anahtarı (/ içeriyor)', d => { d.teams[0].days['2026/11/12'] = { sessions: [] }; });
edge('gün değeri null', d => { d.teams[0].days[D(3)] = null; });
edge('aktif sezon kimliği yok', d => { d.teams[1].activeSeasonId = null; });
edge('seasonData aktif sezonu da içeriyor', d => { d.teams[0].seasonData.S2 = { setup: { x: 1 } }; });
edge('seasonData dizi', d => { d.teams[1].seasonData = []; });
edge('teams dizi değil', d => { d.teams = { T1: d.teams[0] }; });
edge('wellness dizi değil', d => { d.teams[0].athletes[0].wellness = { eski: true }; });
edge('tarihsiz günlük kaydı', d => { d.teams[0].athletes[0].srpeLog.push({ id: 'nd', scRPE: 5 }); });
edge('aynı kimlikli iki sRPE kaydı', d => { const l = d.teams[0].athletes[0].srpeLog; l.push(Object.assign({}, l[0])); });
edge('iç içe diziler (Firestore desteklemez → sarılır)', d => { d.teams[0].athletes[0].tests[0].grid = [[1, 2], [3, [4, 5]]]; d.ai.m = [[[]]]; });
edge('null ve boş değerler', d => { d.teams[0].setup.periods = null; d.teams[0].athletes[0].photo = ''; d.interval = null; });
edge('ayrılmış anahtara benzeyen ama geçerli değerler', d => { d.teams[0].athletes[0].notes = '__x__'; });
edge('alan adı _o / _split gibi iç adlara benziyor değil', d => { d.teams[0].athletes[0].order = 3; });

section('rastgele veri (200 deneme)');
let seed = 12345;
const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
const rv = depth => {
  const t = rnd(depth > 3 ? 4 : 7);
  if (t === 0) return rnd(1000) - 500;
  if (t === 1) return ['', 'a', 'ğüş', '2026-01-02', null, true][rnd(6)];
  if (t === 2) return rnd(2) === 0;
  if (t === 3) return null;
  if (t === 4) return Array.from({ length: rnd(4) }, () => rv(depth + 1));
  const o = {}; for (let i = rnd(4); i > 0; i--) o[['x', 'y', 'name', 'date', 'id', 'notes'][rnd(6)]] = rv(depth + 1); return o;
};
let fuzzOk = 0, fuzzFirst = null;
for (let i = 0; i < 200; i++) {
  const d = realistic();
  const ath = d.teams[0].athletes[rnd(6)];
  ath['f' + rnd(5)] = rv(0);
  ath.tests[0]['g' + rnd(5)] = rv(0);
  const ds = Object.keys(d.teams[0].days); const day = d.teams[0].days[ds[rnd(ds.length)]];
  if (day.sessions[0]) day.sessions[0]['h' + rnd(5)] = rv(0);
  d['w' + rnd(5)] = rv(0);
  if (rnd(3) === 0) ath.wellness.push({ date: D(rnd(60) - 30), v: rv(1) });
  const back = roundTrip(d);
  if (same(back, strip(d))) fuzzOk++; else if (!fuzzFirst) fuzzFirst = firstDiff(back, strip(d));
}
check('200 rastgele hesabın hepsi birebir döner', fuzzOk === 200, fuzzFirst);

section('Firestore\'a yazılabilirlik');
{
  const d = realistic(); d.teams[0].athletes[0].tests[0].grid = [[1, 2]];
  const docs = SM.smToDocs(d);
  const c = SM.smCheckDocs(docs);
  check('sorun yok (iç içe dizi sarıldı)', c.issues.length === 0, JSON.stringify(c.issues.slice(0, 3)));
  const paths = Object.keys(docs);
  check('belge yolları çift parçalı (koleksiyon/kimlik)', paths.every(p => p === '' || p.split('/').length % 2 === 0), paths.find(p => p !== '' && p.split('/').length % 2 !== 0));
  const want = ['', 'exercises/e0', 'teams/T1', 'teams/T1/seasons/S2', 'teams/T1/seasons/S1', 'teams/T1/athletes/a0', 'teams/T1/tests/t00',
    'teams/T1/injuries/i1', 'teams/T1/measurements/m0', 'teams/T1/logs/a0_2026-11', 'teams/T1/athleteSessions/as0', 'teams/T1/athleteDays/a0_' + D(1),
    'teams/T1/sessions/tp1', 'teams/T1/sessions/old1', 'teams/T1/days/S2_' + D(0), 'teams/T1/days/S1_' + D(-400), 'teams/T2'];
  check('beklenen belgeler var', want.every(p => p in docs), want.filter(p => !(p in docs)).join(', '));
  const depth = Math.max(...paths.map(p => p ? p.split('/').length : 0));
  check('en derin yol 4 parça (takım düzeyinde düz koleksiyonlar)', depth === 4, 'derinlik ' + depth);
  check('cihaza ait activeTeamId yazılmıyor', !JSON.stringify(docs['']).includes('activeTeamId'));
  const big = { teams: [{ id: 'T', athletes: [{ id: 'a', blob: 'x'.repeat(SM.SM_DOC_LIMIT + 10) }] }] };
  check('çok büyük belge raporlanır', SM.smCheckDocs(SM.smToDocs(big)).issues.some(i => i.kind === 'too-large'));
}

section('tek düzenleme = tek belge (B3)');
/* Gerçek akış: cihaz elindeki belgelerden (prev) yeni belgeleri üretir, yalnızca farkı yazar. */
const changed = (before, after) => {
  const x = SM.smToDocs(clone(before));
  const y = SM.smToDocs(clone(after), x);
  return SM.smDiff(x, y).map(o => o.path);
};
const one = (name, mut, expect) => {
  const d = realistic(); const e = clone(d); mut(e);
  const c = changed(d, e).sort();
  const ok = expect ? SM.smCanon(c) === SM.smCanon(expect.slice().sort()) : c.length === 1;
  check(name + ' → ' + (expect ? expect.length : 1) + ' belge', ok, 'değişen: ' + c.join(', '));
};
one('bir test değeri', d => { d.teams[0].athletes[2].tests[1].cmj = 99; });
one('bir seansın adı', d => { d.teams[0].days[D(1)].sessions[0].name = 'Yeni'; });
one('park edilmiş sezondaki seans', d => { d.teams[0].seasonData.S1.days[D(-400)].sessions[0].duration = 75; });
one('yeni wellness kaydı (kimliksiz)', d => { d.teams[0].athletes[3].wellness.push({ date: D(0), sleep: 5 }); });
one('bir sRPE kaydının değeri', d => { d.teams[0].athletes[1].srpeLog[2].scRPE = 8; });
one('sporcunun mevkisi', d => { d.teams[0].athletes[4].position = 'C'; });
one('kütüphanede bir egzersiz', d => { d.exercises[3].purpose = 'Çekiş'; });
one('sezon tarihleri', d => { d.teams[0].setup.seasonEnd = D(210); });
one('günlük not', d => { d.teams[0].days[D(2)].dailyNotes = 'Yağmur'; });
one('sporcunun kendi takvimindeki seans', d => { d.teams[0].athletes[0].days[D(1)].sessions[0].notes = 'not'; });
one('iki farklı sporcunun iki ayrı testi', d => { d.teams[0].athletes[0].tests[0].cmj = 1; d.teams[0].athletes[5].tests[0].cmj = 2; },
  ['teams/T1/tests/t00', 'teams/T1/tests/t50']);
one('yeni seans (gün belgesine dokunmaz)', d => { d.teams[0].days[D(2)].sessions.push({ id: 'new1', name: 'Saha', blocks: [] }); },
  ['teams/T1/sessions/new1']);
one('kütüphanenin BAŞINA egzersiz (diğerleri yeniden yazılmaz)', d => { d.exercises.unshift({ id: 'eNew', name: 'Yeni' }); }, ['exercises/eNew']);
one('takımın başına sporcu', d => { d.teams[0].athletes.unshift({ id: 'aNew', name: 'Yeni' }); }, ['teams/T1/athletes/aNew']);
one('iki egzersizin yerini değiştirmek (yalnız biri yeni sıra alır)', d => { const x = d.exercises; [x[1], x[2]] = [x[2], x[1]]; });
one('sezon değiştirmek (günler ve seanslar yazılmaz)', d => {
  const t = d.teams[0]; const park = { setup: t.setup, days: t.days, weekOverrides: t.weekOverrides };
  const nx = t.seasonData.S1; t.seasonData = { S2: park }; t.activeSeasonId = 'S1';
  t.setup = nx.setup; t.days = nx.days; t.weekOverrides = nx.weekOverrides;
}, ['teams/T1', 'teams/T1/seasons/S1', 'teams/T1/seasons/S2']);

section('sıra: kesirli değerler');
{
  const o = SM.smOrder(['x', 'a', 'b', 'c'], { a: 0, b: 1024, c: 2048 });
  check('başa ekleme: eskiler aynı, yeni öncesinde', o[1] === 0 && o[2] === 1024 && o[3] === 2048 && o[0] < 0, JSON.stringify(o));
  const m = SM.smOrder(['a', 'x', 'b'], { a: 0, b: 1024 });
  check('araya ekleme: komşuların arası', m[0] === 0 && m[2] === 1024 && m[1] > 0 && m[1] < 1024, JSON.stringify(m));
  const r = SM.smOrder(['c', 'a', 'b'], { a: 0, b: 1024, c: 2048 });
  check('taşıma: yalnızca taşınan değişir', r[1] === 0 && r[2] === 1024 && r[0] < 0, JSON.stringify(r));
  let keys = ['a', 'b'], prev = { a: 0, b: 1 };
  for (let i = 0; i < 80; i++) { keys = [keys[0], 'n' + i, ...keys.slice(1)]; const v = SM.smOrder(keys, prev); prev = {}; keys.forEach((k, j) => { prev[k] = v[j]; }); }
  const vals = keys.map(k => prev[k]);
  check('80 kez aynı araya ekleme: sıra bozulmaz (gerekirse yeniden numaralanır)', vals.every((v, i) => i === 0 || v > vals[i - 1]));
}

section('iki cihaz aynı anda (B1, B2)');
/* Aynı başlangıç → iki cihaz kendi düzenlemesini yapar → ikisinin farkı sırayla uygulanır
   (Firestore'un alan düzeyindeki update'i gibi) → geri kurulan veri. */
const twoDevices = (mutA, mutB) => {
  const base = realistic(); delete base.activeTeamId;
  const docs0 = SM.smToDocs(clone(base));
  const opsOf = mut => { const d = clone(base); mut(d); return SM.smDiff(docs0, SM.smToDocs(d, docs0)); };
  const a = opsOf(mutA), b = opsOf(mutB);
  const r1 = SM.smApply(docs0, a), r2 = SM.smApply(r1.docs, b);
  return { data: SM.smFromDocs(r2.docs), failed: r1.failed.concat(r2.failed), base };
};
const both = (name, mutA, mutB, test) => {
  const r = twoDevices(mutA, mutB);
  let ok = false, why = '';
  try { ok = test(r.data, r); } catch (e) { why = e.message; }
  check(name, ok, why || 'beklenen sonuç yok');
};
const T = d => d.teams[0];
both('ikisi de ayrı sporcu ekler → ikisi de var',
  d => T(d).athletes.push({ id: 'ax', name: 'X' }), d => T(d).athletes.push({ id: 'ay', name: 'Y' }),
  d => ['ax', 'ay'].every(id => T(d).athletes.some(a => a.id === id)) && T(d).athletes.length === 8);
both('biri test girer, öbürü aynı sporcuya sakatlık ekler',
  d => { T(d).athletes[0].tests[0].cmj = 77; }, d => { T(d).athletes[0].injuries.push({ id: 'iNew', location: 'ayak' }); },
  d => T(d).athletes[0].tests[0].cmj === 77 && T(d).athletes[0].injuries.some(i => i.id === 'iNew'));
both('aynı seansın farklı alanları (ad / süre)',
  d => { T(d).days[D(1)].sessions[0].name = 'A adı'; }, d => { T(d).days[D(1)].sessions[0].duration = 90; },
  d => T(d).days[D(1)].sessions[0].name === 'A adı' && T(d).days[D(1)].sessions[0].duration === 90);
both('aynı sporcunun farklı alanları (ad / mevki)',
  d => { T(d).athletes[2].name = 'Yeni Ad'; }, d => { T(d).athletes[2].position = 'C'; },
  d => T(d).athletes[2].name === 'Yeni Ad' && T(d).athletes[2].position === 'C');
both('aynı ay, aynı sporcuya kimliksiz iki ayrı wellness kaydı → ikisi de var',
  d => { T(d).athletes[0].wellness.push({ date: D(0), sleep: 1 }); }, d => { T(d).athletes[0].wellness.push({ date: D(0), sleep: 5 }); },
  d => { const w = T(d).athletes[0].wellness; return w.length === 5 && w.some(x => x.sleep === 1) && w.some(x => x.sleep === 5); });
both('ikisi de kütüphanenin başına egzersiz ekler → ikisi de var',
  d => d.exercises.unshift({ id: 'eA', name: 'A' }), d => d.exercises.unshift({ id: 'eB', name: 'B' }),
  d => d.exercises.length === 7 && d.exercises[0].id[0] === 'e' && ['eA', 'eB'].every(id => d.exercises.slice(0, 2).some(x => x.id === id)));
both('biri günlük not, öbürü aynı güne seans',
  d => { T(d).days[D(3)].dailyNotes = 'Not'; }, d => { T(d).days[D(3)].sessions.push({ id: 'sN', name: 'Yeni' }); },
  d => T(d).days[D(3)].dailyNotes === 'Not' && T(d).days[D(3)].sessions.some(s => s.id === 'sN'));
both('aynı alan → son yazan kazanır (K6)',
  d => { T(d).athletes[1].position = 'C'; }, d => { T(d).athletes[1].position = 'PF'; },
  d => T(d).athletes[1].position === 'PF');
both('biri seansı siler, öbürü düzenler → silme kalır, düzenleme bildirilir',
  d => { T(d).days[D(5)].sessions = []; }, d => { T(d).days[D(5)].sessions[0].name = 'x'; },
  (d, r) => T(d).days[D(5)].sessions.length === 0 && r.failed.length === 1);
both('çevrimdışı 3 düzenleme + öbür cihazda 2 düzenleme → 5\'i de var',
  d => { T(d).athletes[0].tests[0].cmj = 11; T(d).athletes[1].position = 'SF'; T(d).days[D(2)].dailyNotes = 'off'; },
  d => { d.exercises[0].name = 'Squat 2'; T(d).athletes[3].srpeLog[0].scRPE = 9; },
  d => T(d).athletes[0].tests[0].cmj === 11 && T(d).athletes[1].position === 'SF' && T(d).days[D(2)].dailyNotes === 'off'
    && d.exercises[0].name === 'Squat 2' && T(d).athletes[3].srpeLog[0].scRPE === 9);
both('biri sezon değiştirir, öbürü o sırada seans düzenler → ikisi de kalır',
  d => { const t = T(d); const park = { setup: t.setup, days: t.days, weekOverrides: t.weekOverrides }; const nx = t.seasonData.S1;
    t.seasonData = { S2: park }; t.activeSeasonId = 'S1'; t.setup = nx.setup; t.days = nx.days; t.weekOverrides = nx.weekOverrides; },
  d => { T(d).days[D(1)].sessions[0].name = 'Düzenlendi'; },
  d => T(d).activeSeasonId === 'S1' && T(d).seasonData.S2.days[D(1)].sessions[0].name === 'Düzenlendi');

console.log('\n' + '─'.repeat(64) + '\n  ' + pass + ' geçti, ' + fail + ' kaldı');
process.exit(fail ? 1 : 0);
