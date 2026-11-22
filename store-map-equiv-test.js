/* ═══════════════════════════════════════════════════════════════════════════
   KAYIT BAZLI SENKRON — DÜZENLEME ZİNCİRİ VE EŞDEĞERLİK TESTİ (senkron hız planı R0)

   Gerçekçi bir hesapta (tools/sync-fixture.js) tohumlu rastgele düzenleme zincirleri çalıştırır ve
   her adımda denetleyicinin (smController.flush) yaptığı işin doğruluğunu sınar:

     D1  gönderilen fark, Firestore'da birebir hedef belgeleri üretir: smApply(önceki, fark) ≡ sonraki
     D2  belgelerden ekran verisi birebir geri kurulur: smFromDocs(sonraki) ≡ veri
     D3  değişiklik yoksa hiçbir şey yazılmaz
     D4  ADAY ≡ REFERANS: aday eşleme (R3'ün artımlı eşlemesi) her adımda tam eşlemeyle (smToDocs +
         smDiff) aynı belgeleri ve aynı yazımları üretir. Bugün aday = referans; R3 adayı buraya bağlar
         ve ancak bu test (CI'da kısa, elle `--steps 1000000`) yeşilken açılabilir.

   Kullanım:  node store-map-equiv-test.js                 (CI: küçük hesap, 3 tohum × 150 adım)
              node store-map-equiv-test.js --steps 20000 --seed 7 --size large
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const path = require('path');
const { makeFixture, prng } = require('./tools/sync-fixture.js');

const src = fs.readFileSync(path.join(__dirname, 'src', 'app', '468-store-map.jsx'), 'utf8');
const a = src.indexOf('/* <store-map>'), z = src.indexOf('/* </store-map> */');
if (a < 0 || z < a) { console.error('468-store-map.jsx: <store-map> bölümü bulunamadı'); process.exit(1); }
// eslint-disable-next-line no-new-func
const SM = new Function(src.slice(a, z) + '; return { smToDocs, smFromDocs, smDiff, smApply, smCanon, smCheckDocs };')();

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const STEPS = Number(opt('--steps', 150)), SIZE = opt('--size', 'small');
const SEEDS = opt('--seed', null) != null ? [Number(opt('--seed'))] : [1, 2, 3];

/* ── referans ve aday ─────────────────────────────────────────────────────────
   Aday arayüzü: (öncekiBelgeler, veri) → { docs, ops }. R3 burada artımlı eşlemeyi verir. */
const reference = (prev, data) => { const docs = SM.smToDocs(data, prev); return { docs, ops: SM.smDiff(prev, docs) }; };
const candidate = reference;

const clone = o => JSON.parse(JSON.stringify(o));
const strip = d => { const c = clone(d); delete c.activeTeamId; return c; };
const opsKey = ops => ops.map(o => SM.smCanon(o)).sort().join('\n');

/* ── rastgele düzenlemeler: ekranların yaptığı türden (React gibi yeni nesne) ────── */
function edits(r) {
  const pick = arr => arr[Math.floor(r() * arr.length)];
  const int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  let n = 0; const nid = p => p + 'x' + (++n) + '_' + int(0, 1e6);
  const team = d => pick(d.teams);
  const ath = t => t.athletes.length ? pick(t.athletes) : null;
  const dayKey = t => pick(Object.keys(t.days));
  return [
    ['test değeri', d => { const a = ath(team(d)); if (a && a.tests.length) pick(a.tests).cmj = int(20, 70); }],
    ['test ekle', d => { const a = ath(team(d)); if (a) a.tests.push({ id: nid('t'), date: '2026-03-0' + int(1, 9), cmj: int(20, 70), height: 190 }); }],
    ['test sil', d => { const a = ath(team(d)); if (a && a.tests.length) a.tests.splice(int(0, a.tests.length - 1), 1); }],
    ['wellness ekle (kimliksiz)', d => { const a = ath(team(d)); if (a) a.wellness.push({ date: '2026-02-' + (10 + int(0, 18)), sleep: int(1, 5), fatigue: int(1, 5), note: 'x' + int(0, 9) }); }],
    ['wellness değiştir', d => { const a = ath(team(d)); if (a && a.wellness.length) pick(a.wellness).sleep = int(1, 5); }],
    ['sRPE ekle', d => { const a = ath(team(d)); if (a) a.srpeLog.push({ id: nid('r'), date: '2026-0' + int(1, 9) + '-1' + int(0, 9), scRPE: int(1, 10), scDuration: 60 }); }],
    ['sRPE sil', d => { const a = ath(team(d)); if (a && a.srpeLog.length) a.srpeLog.splice(int(0, a.srpeLog.length - 1), 1); }],
    ['seans adı', d => { const t = team(d), dd = t.days[dayKey(t)]; if (dd.sessions.length) pick(dd.sessions).name = 'Ad ' + int(0, 99); }],
    ['seans ekle', d => { const t = team(d), dd = t.days[dayKey(t)]; dd.sessions.push({ id: nid('s'), name: 'Yeni', time: '18:00', duration: 60, athletes: [], blocks: [], focus: [] }); }],
    ['seans sil', d => { const t = team(d), dd = t.days[dayKey(t)]; if (dd.sessions.length) dd.sessions.splice(int(0, dd.sessions.length - 1), 1); }],
    ['seansı başka güne taşı', d => { const t = team(d), from = t.days[dayKey(t)], to = t.days[dayKey(t)]; if (from !== to && from.sessions.length) to.sessions.push(from.sessions.shift()); }],
    ['seansın egzersiz sırası', d => { const t = team(d), dd = t.days[dayKey(t)]; const s = dd.sessions[0]; if (s && s.blocks && s.blocks[0] && s.blocks[0].exercises.length > 1) s.blocks[0].exercises.reverse(); }],
    ['seansın sporcuları', d => { const t = team(d), dd = t.days[dayKey(t)]; const s = dd.sessions[0]; if (s) s.athletes = s.athletes.length ? s.athletes.slice(1) : ['a0', 'a1']; }],
    ['günlük not', d => { const t = team(d); t.days[dayKey(t)].dailyNotes = 'not ' + int(0, 99); }],
    ['sporcu ekle', d => { const t = team(d); t.athletes.push({ id: nid('a'), name: 'Yeni ' + int(0, 99), tests: [], injuries: [], measurements: [], wellness: [], srpeLog: [], nightLog: [], deletedSrpeSrcIds: [], days: {} }); }],
    ['sporcu sil', d => { const t = team(d); if (t.athletes.length > 1) t.athletes.splice(int(0, t.athletes.length - 1), 1); }],
    ['sporcu adı', d => { const a = ath(team(d)); if (a) a.name = 'Ad ' + int(0, 999); }],
    ['sakatlık ekle', d => { const a = ath(team(d)); if (a) a.injuries.push({ id: nid('i'), location: 'ayak bileği', status: 'Active', date: '2026-02-02' }); }],
    ['sporcu takvimine seans', d => { const t = team(d), a = ath(t); if (!a) return; const k = dayKey(t); a.days[k] = { date: k, dailyNotes: '', sessions: [{ id: nid('as'), name: 'Bireysel', sourceId: null, blocks: [] }] }; }],
    ['müsabaka ekle', d => { const t = team(d); t.setup.competitions = t.setup.competitions.concat([{ id: nid('c'), date: '2026-05-0' + int(1, 9), name: 'Maç' }]); }],
    ['müsabaka sil', d => { const t = team(d); if (t.setup.competitions.length) t.setup.competitions = t.setup.competitions.slice(1); }],
    ['lokasyon ekle', d => { const t = team(d); const l = 'Salon ' + int(0, 9); if (t.setup.locations.indexOf(l) < 0) t.setup.locations = t.setup.locations.concat([l]); }],
    ['kadro ekle', d => { const t = team(d); t.staff = t.staff.concat([{ id: nid('st'), role: 'physio', name: 'Fizyo', phone: '', phoneCode: '+90', photo: null }]); }],
    ['park edilmiş sezonda seans adı', d => { const t = team(d); const sd = t.seasonData[Object.keys(t.seasonData)[0]]; if (!sd) return; const k = pick(Object.keys(sd.days)); if (sd.days[k].sessions.length) sd.days[k].sessions[0].name = 'Eski ' + int(0, 99); }],
    ['kütüphanenin başına egzersiz', d => { d.exercises.unshift({ id: nid('e'), name: 'Yeni hareket', type: 'Core', muscle: [], contra: [] }); }],
    ['egzersiz sil', d => { if (d.exercises.length > 1) d.exercises.splice(int(0, d.exercises.length - 1), 1); }],
    ['egzersiz düzenle', d => { pick(d.exercises).difficulty = pick(['Level 1', 'Level 2', 'Level 3']); }],
    ['kök ayar (aralık)', d => { d.interval = Object.assign({}, d.interval, { work: int(10, 60) }); }],
    ['hiçbir şey', () => {}],
  ];
}

let pass = 0, fail = 0;
const failures = [];
const bad = (name, detail) => { fail++; if (failures.length < 12) failures.push(name + (detail ? '\n       ' + detail : '')); };

for (const seed of SEEDS) {
  const r = prng(seed * 7919 + 13);
  const E = edits(r);
  let data = strip(makeFixture(SIZE, seed));
  let prev = SM.smToDocs(data);
  const count = {};
  const t0 = Date.now();
  for (let i = 0; i < STEPS; i++) {
    const [name, fn] = E[Math.floor(r() * E.length)];
    count[name] = (count[name] || 0) + 1;
    const next = clone(data); fn(next);
    const changed = SM.smCanon(next) !== SM.smCanon(data);
    const ref = reference(prev, next), can = candidate(prev, next);
    const tag = `tohum ${seed} adım ${i} (${name})`;
    // D1
    const applied = SM.smApply(prev, ref.ops);
    const p1 = applied.failed.length === 0 && Object.keys(applied.docs).length === Object.keys(ref.docs).length &&
      Object.keys(ref.docs).every(p => p in applied.docs && SM.smCanon(applied.docs[p]) === SM.smCanon(ref.docs[p]));
    p1 ? pass++ : bad('D1 fark uygulanınca hedef belgeler çıkmadı: ' + tag);
    // D2
    const back = SM.smFromDocs(ref.docs);
    SM.smCanon(back) === SM.smCanon(next) ? pass++ : bad('D2 belgelerden veri birebir geri kurulmadı: ' + tag);
    // D3
    (changed || ref.ops.length === 0) ? pass++ : bad('D3 değişiklik yokken yazım üretildi: ' + tag, opsKey(ref.ops).slice(0, 200));
    // D4
    const sameDocs = Object.keys(ref.docs).length === Object.keys(can.docs).length &&
      Object.keys(ref.docs).every(p => p in can.docs && SM.smCanon(can.docs[p]) === SM.smCanon(ref.docs[p]));
    (sameDocs && opsKey(can.ops) === opsKey(ref.ops)) ? pass++ : bad('D4 aday ≠ referans: ' + tag);
    data = next; prev = ref.docs;
  }
  const iss = SM.smCheckDocs(prev).issues.filter(x => x.kind !== 'nested-array');
  iss.length === 0 ? pass++ : bad(`tohum ${seed}: zincirin sonunda Firestore'a yazılamayacak belge`, JSON.stringify(iss.slice(0, 3)));
  console.log(`  tohum ${seed}: ${STEPS} adım, ${Object.keys(count).length} düzenleme türü, ${((Date.now() - t0) / 1000).toFixed(1)} sn`);
}

if (failures.length) console.log('\n  KALANLAR:\n  · ' + failures.join('\n  · '));
console.log('\n' + '─'.repeat(64) + `\n  ${pass} geçti, ${fail} kaldı  (boyut=${SIZE}, adım=${STEPS}, tohum=${SEEDS.join(',')})`);
process.exit(fail ? 1 : 0);
