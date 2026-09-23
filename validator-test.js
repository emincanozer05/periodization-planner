/* ═══════════════════════════════════════════════════════════════════════════
   PROGRAM DENETLEYİCİ SINAMASI — üretime giden kodun kendisiyle

   CoachOS'un AI program yazıcısının tek savunma hattı validateProgram(): yapay zekâ
   öneriyor, kod doğruluyor, veritabanı yalnızca doğrulanmışı kaydediyor. Bu dosya o
   savunmayı KOPYALAMADAN sınar — index.html içindeki uygulama betiği olduğu gibi
   alınır, @babel/standalone ile (tarayıcının kullandığı derleyicinin aynısıyla)
   derlenir ve sahte bir tarayıcı yüzeyinin üzerinde çalıştırılır. Yani burada geçen
   test, koçun ekranındaki kodun geçtiği testtir.

   Sınanan şey davranış, iddia değil: her senaryo gerçek bir sporcu kaydı, gerçek bir
   envanter ve modelin döndürebileceği gerçek bir JSON kurar, sonra sonucu okur.

   Çalıştırma:  node validator-test.js
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const babel = require('@babel/standalone');

/* ─── uygulamayı yükle ──────────────────────────────────────────────────────
   Betiğin son iki satırı (lmPersist / ReactDOM.render) tarayıcıya aittir ve burada
   çalıştırılmaz; geri kalan her şey — otuz kural, hesap motoru, denetleyici —
   olduğu gibi yüklenir. */
function loadApp() {
  const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
  const open = html.indexOf('<script type="text/babel"');
  const start = html.indexOf('>', open) + 1;
  const end = html.indexOf('</script>', start);
  let src = html.slice(start, end);
  const cut = src.indexOf('lmPersist();');
  if (cut < 0) throw new Error('betiğin sonu bulunamadı');
  src = src.slice(0, cut);

  const { code } = babel.transform(src, { presets: ['react'], filename: 'app.jsx', compact: false });

  const noop = () => {};
  const el = (t, p, ...c) => ({ type: t, props: p || {}, children: c });
  const React = {
    createElement: el, Fragment: 'Fragment',
    useState: i => [typeof i === 'function' ? i() : i, noop],
    useEffect: noop, useLayoutEffect: noop, useRef: i => ({ current: i }),
    useMemo: f => f(), useCallback: f => f,
    memo: c => c, forwardRef: c => c, createContext: () => ({ Provider: 'P', Consumer: 'C' }),
    useContext: () => null, useReducer: (r, i) => [i, noop], StrictMode: 'StrictMode',
  };
  const store = {};
  const storage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; },
    key: () => null, length: 0,
  };
  const doc = {
    visibilityState: 'visible', addEventListener: noop, removeEventListener: noop,
    getElementById: () => null, createElement: () => ({ style: {}, setAttribute: noop, appendChild: noop }),
    documentElement: { style: { setProperty: noop }, classList: { add: noop, remove: noop, toggle: noop } },
    body: { appendChild: noop, removeChild: noop, classList: { add: noop, remove: noop } },
    querySelector: () => null, querySelectorAll: () => [],
  };
  const win = {
    addEventListener: noop, removeEventListener: noop, location: { search: '', hostname: 'localhost', href: '' },
    matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop }),
    localStorage: storage, sessionStorage: storage, navigator: { onLine: true, userAgent: 'node' },
    setTimeout, clearTimeout, setInterval, clearInterval,
  };
  const bag = {};
  /* Oturum açmış bir koç: Gemini çağrıları artık sunucu proxy'sinden, koçun kimlik
     belirteciyle gidiyor. Yalnızca o yolun gerektirdiği kadar Firebase. */
  const fakeFirebase = {
    apps: [{}],
    auth: () => ({ currentUser: { uid: 'coach1', getIdToken: async () => 'ID_TOKEN' } }),
    firestore: Object.assign(() => ({}), { FieldValue: { serverTimestamp: () => 'TS' } }),
  };
  const names = ['bag', 'React', 'ReactDOM', 'document', 'window', 'navigator', 'location',
    'localStorage', 'sessionStorage', 'firebase', 'fetch', 'alert', 'confirm', 'prompt',
    'IntersectionObserver', 'ResizeObserver', 'matchMedia', 'Worker', 'Blob', 'indexedDB',
    'requestAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback'];
  /* Sınanacak her şey bir torbaya konur: dışarıdan erişilebilen tek kapı bu, ve
     betiğin kendi içindeki hiçbir şey bunun için değiştirilmiş değil. */
  const expose = ['validateProgram', 'diParseProgram', 'diProgramRows', 'diAdjustRow', 'diLoadAdjust',
    'diBundle', 'diInstr', 'diDifferentiators', 'diDeficits', 'diTier', 'diTempDowngrade',
    'diBlockedPatterns', 'diRestrictions', 'diPlyoCeiling', 'diRowUnits', 'diRowContacts',
    'diFlag', 'diReadiness', 'diConValue', 'diJaccard', 'diProgramNames', 'diRecentPrograms',
    'diPeerPrograms', 'diBuildProgramInput', 'diWriteGate', 'diProgramPlan', 'askCoach', 'askGemini',
    'aiModelResolve', 'aiModelOf', 'kbRules', 'kbForAI', 'eqAvailable', 'eqNeedOf', 'pwTier',
    'athReadiness', 'athPainReports', 'diPainDays', 'diRestrictionHits',
    'DI_ADJ_BANDS', 'DI_SET_FLOOR', 'DI_REP_FLOOR', 'DI_RD_REDUCE', 'DI_RD_REVIEW',
    'DI_PAIN_BLOCK', 'DI_MIN_PER_EX', 'DI_SIM_SELF', 'DI_SIM_PEER', 'DI_TIER_CAPS',
    'DI_PROGRAM_SYSTEM', 'IV_PATTERNS', 'fmt', 'addD', 'parseD', 'recNum',
    'diJobWriteGate', 'aiJobStatusText', 'aiJobErrorText', 'aiKeyOf', 'migrate', 'AI_JOB_MAX_MS', 'AI_JOB_MAX_CALLS',
    'geminiListModels', 'diAthleteSnapshot', 'diBriefForAI'];
  const tail = '\n;' + expose.map(n => `try{bag.${n}=${n};}catch(e){}`).join('') + '\n';
  new Function(...names, code + tail)(
    bag, React, { createRoot: () => ({ render: noop }) }, doc, win, win.navigator, win.location,
    storage, storage, fakeFirebase, (...a) => global.fetch(...a), noop, () => true, () => null,
    function () { return { observe: noop, disconnect: noop, unobserve: noop }; },
    function () { return { observe: noop, disconnect: noop, unobserve: noop }; },
    win.matchMedia, undefined, undefined, undefined,
    f => setTimeout(f, 0), undefined, undefined);
  return bag;
}

process.on('unhandledRejection', e => {
  console.error('\n  KALDI  yakalanmamış hata:', (e && e.stack) || e);
  process.exit(1);
});
process.on('uncaughtException', e => {
  console.error('\n  KALDI  yakalanmamış istisna:', (e && e.stack) || e);
  process.exit(1);
});

const A = loadApp();

/* ─── sonuç tablosu ─────────────────────────────────────────────────────── */
let pass = 0, fail = 0;
const results = [];
function check(name, ok, detail) {
  ok ? pass++ : fail++;
  results.push({ name, ok, detail: detail || '' });
  console.log(`  ${ok ? 'GEÇTİ' : 'KALDI'}  ${name}${detail ? '\n          ' + detail : ''}`);
}
function group(t) { console.log('\n── ' + t); }

/* ─── kurgu ─────────────────────────────────────────────────────────────── */
const TODAY = '2026-09-22';
/* Tarihler uygulamanın KENDİ yardımcılarıyla üretiliyor. Node'un Date'i yerel
   saate göre okur, uygulamanınki kendi kuralına göre; ikisini ayrı tutmak, testin
   CI kutusunda (UTC) geliştirme makinesinden farklı bir gün hesaplaması demekti. */
const back = n => A.fmt(A.addD(A.parseD(TODAY), -n));
/* Bataryası tertemiz bir sporcu: tarama maddelerinin hepsi geçer → Kademe 3.
   Böylece kademe tavanı testleri, tavanın KENDİSİNİ sınadığında araya başka bir
   kısıt girmiyor. */
const cleanTest = (d) => ({
  date: d, height: 195, weight: 90,
  ohs: { score: 3, problems: [] },
  aslr: { right: 3, left: 3 },
  ankleDF: { right: 40, left: 40 },
  yBalance: {}, circ: {}, posture: {},
});
function athlete(o) {
  return Object.assign({
    id: 'a1', name: 'Test Sporcu', dateOfBirth: '2000-05-01', position: 'PG',
    trainingAge: 6, somatotype: '', levelTag: '', constraintTags: [],
    tests: [cleanTest(back(30))], wellness: [], injuries: [], days: {}, srpeLog: [], goals: '',
  }, o || {});
}
const wellness = (date, readiness, extra) => Object.assign({
  date, readiness, sleep: 4, fatigue: 4, soreness: 4, stress: 4, mood: 4,
}, extra || {});
const SETUP = {
  teamName: 'Test', sport: 'basketball',
  equipment: [
    { id: 'dumbbell', label: 'Dumbbell', qty: 6, kg: 20 },
    { id: 'dumbbell', label: 'Dumbbell', qty: 2, kg: 30 },
    { id: 'barbell', label: 'Barbell', qty: 2, kg: 20 },
    { id: 'plyobox', label: 'Plyo box', qty: 4 },
    { id: 'cable', label: 'Cable', qty: 1 },
  ],
  competitions: [], periods: [],
};
const LIB = [
  { name: 'Goblet Squat', type: 'Knee Dominant', movePattern: 'Squat' },
  { name: 'Romanian Deadlift', type: 'Hip Dominant', movePattern: 'Hinge' },
  { name: 'DB Bench Press', type: 'Upper Body Push', movePattern: 'Push' },
  { name: 'Barbell Row', type: 'Upper Body Pull', movePattern: 'Pull' },
  { name: 'Pallof Press', type: 'Core', movePattern: 'Core / Brace' },
  { name: 'Ankle Mobilization', type: 'Mobility', movePattern: 'Mobility' },
];
const libMap = (() => { const m = {}; LIB.forEach(e => { m[e.name.toLowerCase()] = e; }); return m; })();

/* Modelin döndürdüğü ham JSON — her senaryo bunu kendi ihtiyacına göre değiştirir ve
   diParseProgram'dan geçirir, böylece ayrıştırıcı da her seferinde sınanmış olur. */
function aiReply(exercises, extra) {
  return JSON.stringify(Object.assign({
    durum_ozeti: 'Sporcu bugün normal hazır oluşta.',
    antrenman_onceligi: [{ oncelik: 'Alt vücut kuvvet', gerekce: 'D1' }],
    program: {
      seans_adi: 'Alt vücut kuvvet',
      bloklar: [{ ad: 'Ana', faz: 'ana', egzersizler: exercises }],
    },
    uyulan_kisitlar: [], flagged_conflicts: [],
    genel_gerekce: 'Kural 13 ve Kural 28 uyarınca.', koc_uyarisi: null,
  }, extra || {}));
}
const ex = o => Object.assign({
  ad: 'Goblet Squat', kaynak: 'library', set: '3', tekrar: '6', sure: null, mesafe: null,
  yuk: '20 kg', tempo: null, dinlenme: '90 sn', ekipman: 'dumbbell',
  hareket_paterni: 'Squat', gerekce: 'Diz dominant kuvvet.', dayanak: ['D1'],
}, o || {});

function ctxFor(ath, opts) {
  const o = opts || {};
  const bundle = A.diBundle(ath, SETUP, o.date || TODAY, { libMap });
  const deficits = A.diDeficits(ath, o.date || TODAY);
  const instr = A.diInstr(o.rawInstr || null, { duration: null });
  return {
    bundle, deficits, instr,
    setup: SETUP, libMap,
    differentiators: A.diDifferentiators(ath, bundle, deficits, o.date || TODAY),
    recent: o.recent || [], peers: o.peers || [],
  };
}
const validate = (raw, ath, opts) => A.validateProgram(A.diParseProgram(raw), ctxFor(ath, opts));
const hardText = v => v.hardViolations.map(x => x.text).join(' | ');
const softText = v => v.softWarnings.map(x => x.text).join(' | ');

/* ══════════════════════ SENARYOLAR ══════════════════════════════════════ */

group('1 — Normal sporcu, hazır oluş ≥ 3.5');
{
  const ath = athlete({ wellness: [wellness(TODAY, 4.2)] });
  const b = A.diBundle(ath, SETUP, TODAY, { libMap });
  check('hazır oluş 4.2 → hacim ayarı yok', b.adjustment.pct === 0,
    `pct=${b.adjustment.pct}`);
  const v = validate(aiReply([ex(), ex({ ad: 'DB Bench Press', hareket_paterni: 'Push', ekipman: 'dumbbell', gerekce: 'Üst vücut itiş.', dayanak: ['D1'] })]), ath);
  check('program sert ihlal taşımıyor → kaydedilebilir', v.status === 'pass', hardText(v));
}

group('2 — Hazır oluş < 3.5, kümülatif azaltma ve taban');
{
  const ath = athlete({ wellness: [wellness(TODAY, 3.4)] });
  const b = A.diBundle(ath, SETUP, TODAY, { libMap });
  check('3.4 → azaltma devreye girdi', b.adjustment.pct < 0, `pct=${b.adjustment.pct}`);
  const ath2 = athlete({ wellness: [wellness(TODAY, 3.6)] });
  const b2 = A.diBundle(ath2, SETUP, TODAY, { libMap });
  check('3.6 → azaltma YOK (Kural 28: ≥3.5 varsayılan)', b2.adjustment.pct === 0, `pct=${b2.adjustment.pct}`);
  const ath3 = athlete({ wellness: [wellness(TODAY, 3.8)] });
  const b3 = A.diBundle(ath3, SETUP, TODAY, { libMap });
  check('3.8 → azaltma YOK (eski kodda %10 kesilirdi)', b3.adjustment.pct === 0, `pct=${b3.adjustment.pct}`);
  // kümülatif: düşük hazır oluş + ağrı bir arada tek tek toplamdan fazlasını keser
  const painAth = athlete({ wellness: [wellness(TODAY, 3.4, { pain: { knee: 3 } })] });
  const bp = A.diBundle(painAth, SETUP, TODAY, { libMap });
  check('düşük hazır oluş + ağrı kümülatif toplanıyor', bp.adjustment.pct < b.adjustment.pct,
    `yalnız hazır oluş=${b.adjustment.pct}%, ağrıyla=${bp.adjustment.pct}%`);
  check('toplam taban sınırı aşılmıyor', bp.adjustment.pct >= -50, `pct=${bp.adjustment.pct}`);
  // set ve tekrar tabanları
  check('set tabanı 1 (Kural 28)', A.DI_SET_FLOOR === 1, `DI_SET_FLOOR=${A.DI_SET_FLOOR}`);
  check('tekrar tabanı 4 (Kural 28)', A.DI_REP_FLOOR === 4, `DI_REP_FLOOR=${A.DI_REP_FLOOR}`);
  const r1 = A.diAdjustRow({ sets: '2', reps: '6' }, -50);
  check('2 set −%50 → 1 set (eski kod 2 de bırakırdı)', r1.sets === '1', JSON.stringify(r1));
  const r2 = A.diAdjustRow({ sets: null, reps: '10' }, -50);
  check('10 tekrar −%50 → 5, 4 tabanının altına inmiyor', Number(r2.reps) >= 4, JSON.stringify(r2));
  const r3 = A.diAdjustRow({ sets: null, reps: '3' }, -50);
  check('zaten 3 tekrar olan satır 4\'e YÜKSELTİLMİYOR', r3.reps === '3' || Number(r3.reps) <= 3, JSON.stringify(r3));
}

group('3 — Hazır oluş < 2.5 manuel inceleme');
{
  const ath = athlete({ wellness: [wellness(TODAY, 2.1)] });
  const b = A.diBundle(ath, SETUP, TODAY, { libMap });
  check('bayrak "review"', b.flag.id === 'review', `flag=${b.flag.id}`);
  const v = validate(aiReply([ex()]), ath);
  const warned = v.softWarnings.some(w => /2\.5|antrenörün|coach/i.test(w.text));
  check('koça manuel inceleme uyarısı var', warned, softText(v));
  check('ama yazımı ENGELLEMİYOR (soft)', v.status === 'pass', hardText(v));
}

group('4 — Diz ağrısı bildirildi');
{
  const ath = athlete({ wellness: [wellness(TODAY, 4, { pain: { knee: 3 } })] });
  const b = A.diBundle(ath, SETUP, TODAY, { libMap });
  const blocked = A.diBlockedPatterns(b);
  check('diz ağrısı Squat paternini kapatıyor',
    blocked.some(x => (x.yasak_paternler || []).includes('Squat')), JSON.stringify(blocked.map(x => x.yasak_paternler)));
  const v = validate(aiReply([ex()]), ath);   // Goblet Squat = Squat
  check('kapalı paterndeki egzersiz SERT ihlal → kayıt yok', v.status === 'fail', hardText(v));
  check('gerekçe hangi bölge ve hangi patern olduğunu söylüyor',
    /Squat/.test(hardText(v)) && /ağrı|pain|Knee/i.test(hardText(v)), hardText(v));
  const vOk = validate(aiReply([ex({ ad: 'Romanian Deadlift', hareket_paterni: 'Hinge', yuk: '20 kg', ekipman: 'dumbbell', gerekce: 'Kalça dominant alternatif.' })]), ath);
  check('yönlendirilen patern (Hinge) kabul ediliyor', vOk.status === 'pass', hardText(vOk));
}

group('5 — Sert kısıtlama (sakatlık avoid-list)');
{
  const ath = athlete({
    wellness: [wellness(TODAY, 4)],
    injuries: [{ location: 'knee', status: 'Active', restrictions: 'Derin squat yok, drop jump yok', rtpStage: 'modified' }],
  });
  const v = validate(aiReply([ex()]), ath);
  check('kısıtlamaya takılan egzersiz SERT ihlal', v.status === 'fail', hardText(v));
  check('hangi kısıtlamaya ve hangi terime takıldığını söylüyor',
    /squat/i.test(hardText(v)) && /Derin squat yok/.test(hardText(v)), hardText(v));
  const vOk = validate(aiReply([ex({ ad: 'DB Bench Press', hareket_paterni: 'Push', ekipman: 'dumbbell' })]), ath);
  check('kısıtlamayla ilgisi olmayan egzersiz geçiyor', vOk.status === 'pass', hardText(vOk));
  // 3 harfli parçalar yanlış eşleşme üretmemeli
  const ath2 = athlete({ wellness: [wellness(TODAY, 4)], injuries: [{ location: 'knee', status: 'Active', restrictions: 'bar yok' }] });
  const v2 = validate(aiReply([ex({ ad: 'Barbell Row', hareket_paterni: 'Pull', ekipman: 'barbell', yuk: '60 kg' })]), ath2);
  check('3 harfli parça ("bar") yanlış pozitif üretmiyor', v2.status === 'pass', hardText(v2));
}

group('6 — Serbest metin / kütüphane dışı egzersiz');
{
  const ath = athlete({ wellness: [wellness(TODAY, 4)] });
  const v = validate(aiReply([ex({ ad: 'Sissy Squat Hold', kaynak: 'custom', hareket_paterni: 'Core / Brace', ekipman: 'vücut ağırlığı', yuk: null })]), ath);
  check('kütüphane dışı egzersiz KABUL ediliyor (reddedilmiyor)', v.status === 'pass', hardText(v));
  check('yalnızca yumuşak uyarı olarak loglanıyor',
    v.softWarnings.some(w => /kütüphane dışından|outside the library/i.test(w.text)), softText(v));
  const rows = A.diProgramRows(A.diParseProgram(aiReply([ex({ ad: 'Sissy Squat Hold', kaynak: 'custom', hareket_paterni: 'Core / Brace' })])), 0);
  check('adı sessizce değiştirilmiyor / düşürülmüyor', rows.length === 1 && rows[0].name === 'Sissy Squat Hold',
    JSON.stringify(rows.map(r => r.name)));
}

group('7 — Ekipman');
{
  const ath = athlete({ wellness: [wellness(TODAY, 4)] });
  // envanterde olmayan ekipman
  const v1 = validate(aiReply([ex({ ad: 'Sled Push', kaynak: 'custom', hareket_paterni: 'Sprint / Locomotion', ekipman: 'sled', yuk: null })]), ath);
  check('envanterde olmayan ekipman → SERT ihlal', v1.status === 'fail', hardText(v1));
  // envanterdeki en ağır dumbbell 30 kg
  const v2 = validate(aiReply([ex({ yuk: '45 kg' })]), ath);
  check('envanterdeki en ağır ağırlığı aşan yük → SERT ihlal', v2.status === 'fail', hardText(v2));
  check('en ağır ağırlığı sayıyla söylüyor', /30 kg/.test(hardText(v2)), hardText(v2));
  // adet: 8 dumbbell isteyen satır, envanterde 8 var → geçmeli; 10 isteyen kalmalı
  check('adet okuma: "2DB …" iki adet sayılıyor', A.diRowUnits({ name: '2DB Bulgarian Split Squat', equipment: 'dumbbell' }) === 2,
    String(A.diRowUnits({ name: '2DB Bulgarian Split Squat', equipment: 'dumbbell' })));
  const smallGym = Object.assign({}, SETUP, { equipment: [{ id: 'dumbbell', label: 'Dumbbell', qty: 1, kg: 20 }] });
  const vq = A.validateProgram(A.diParseProgram(aiReply([ex({ ad: '2DB Goblet Squat', kaynak: 'custom', yuk: '20 kg', ekipman: 'dumbbell' })])),
    Object.assign(ctxFor(ath), { setup: smallGym }));
  check('adet yetersiz → SERT ihlal', vq.status === 'fail', hardText(vq));
  check('eksik miktarı sayıyla söylüyor', /1 eksik|1 short/.test(hardText(vq)), hardText(vq));
}

group('8 — Antrenör talimatı');
{
  const ath = athlete({ wellness: [wellness(TODAY, 4)] });
  const six = [ex(), ex({ ad: 'DB Bench Press', hareket_paterni: 'Push' }), ex({ ad: 'Barbell Row', hareket_paterni: 'Pull', ekipman: 'barbell', yuk: '60 kg' }),
    ex({ ad: 'Pallof Press', hareket_paterni: 'Core / Brace', ekipman: 'cable', yuk: null }),
    ex({ ad: 'Ankle Mobilization', hareket_paterni: 'Mobility', ekipman: 'vücut ağırlığı', yuk: null })];
  // boş form hiçbir kısıt getirmemeli
  const vBlank = validate(aiReply(six), ath);
  const blankHardInstr = vBlank.hardViolations.filter(h => h.rule === 21 || h.rule === 22);
  check('boş talimat hiçbir sert kısıt getirmiyor', blankHardInstr.length === 0, hardText(vBlank));
  // dolu form bağlıyor
  const vFull = validate(aiReply(six), ath, { rawInstr: { maxExercises: 3, maxExercisesSet: true, duration: 60, durationSet: true } });
  check('dolu "maks egzersiz" → SERT ihlal', vFull.hardViolations.some(h => h.rule === 22), hardText(vFull));
  const vDur = validate(aiReply(six), ath, { rawInstr: { duration: 20, durationSet: true } });
  check('dolu "seans süresi" → SERT ihlal', vDur.hardViolations.some(h => h.rule === 21), hardText(vDur));
  const vDerived = validate(aiReply(six), ath, { rawInstr: { maxExercises: 3, duration: 60 } });
  check('türetilmiş (koçun yazmadığı) tavan SERT ihlal DEĞİL, uyarı',
    vDerived.status === 'pass' && vDerived.softWarnings.some(w => /türetilen|derived/i.test(w.text)),
    hardText(vDerived) || softText(vDerived));
  // kaçınılacak listesi
  const vAvoid = validate(aiReply([ex()]), ath, { rawInstr: { avoid: ['derin squat'] } });
  check('"kaçınılacak: derin squat" → Goblet Squat da reddediliyor', vAvoid.status === 'fail', hardText(vAvoid));
  // mutlaka olsun — zorlanamaz, uyarı
  const vMust = validate(aiReply([ex()]), ath, { rawInstr: { must: ['Trap Bar Jump'] } });
  check('"mutlaka olsun" karşılanmazsa YUMUŞAK uyarı (kaydı engellemez)',
    vMust.status === 'pass' && vMust.softWarnings.some(w => /Trap Bar Jump/.test(w.text)), softText(vMust));
  // sayısal kısıt
  const vCon = validate(aiReply([ex({ yuk: 'RPE 9' })]), ath,
    { rawInstr: { constraints: ['intensity'], constraintValues: { intensity: 'RPE 6' } } });
  check('sayısal yoğunluk kısıtı aşıldı → SERT ihlal', vCon.status === 'fail', hardText(vCon));
  const vConOk = validate(aiReply([ex({ yuk: 'RPE 5' })]), ath,
    { rawInstr: { constraints: ['intensity'], constraintValues: { intensity: 'RPE 6' } } });
  check('sınır içinde kalan yük geçiyor', vConOk.status === 'pass', hardText(vConOk));
  const vConBlank = validate(aiReply([ex({ yuk: 'RPE 9' })]), ath, { rawInstr: { constraints: ['intensity'] } });
  check('kısıt seçili ama değer boş → kısıt bağlamıyor', vConBlank.status === 'pass', hardText(vConBlank));
  check('birimi okunamayan değer sert ihlal değil, uyarı',
    (() => { const v = validate(aiReply([ex()]), ath, { rawInstr: { constraints: ['load'], constraintValues: { load: 'ağır olmasın' } } });
      return v.status === 'pass' && v.softWarnings.some(w => /okunamadığı|no readable unit/i.test(w.text)); })());
}

group('9 / 10 / 11 — Ayırt ediciler ve benzerlik');
{
  const guard = athlete({ id: 'g1', position: 'PG', wellness: [wellness(TODAY, 4, { pain: { knee: 3 } })] });
  const center = athlete({
    id: 'c1', position: 'C', wellness: [wellness(TODAY, 4)],
    tests: [Object.assign(cleanTest(back(30)), { ankleDF: { right: 28, left: 30 } })],
  });
  const dg = A.diDifferentiators(guard, A.diBundle(guard, SETUP, TODAY, { libMap }), A.diDeficits(guard, TODAY), TODAY);
  const dc = A.diDifferentiators(center, A.diBundle(center, SETUP, TODAY, { libMap }), A.diDeficits(center, TODAY), TODAY);
  check('9a — iki sporcu için ayırt edici listeleri FARKLI',
    JSON.stringify(dg.map(x => x.text)) !== JSON.stringify(dc.map(x => x.text)),
    `guard=${JSON.stringify(dg.map(x => x.text))}\n          center=${JSON.stringify(dc.map(x => x.text))}`);
  check('9b — ağrılı sporcunun listesi ağrıyı gün sayısıyla taşıyor',
    dg.some(d => d.kind === 'pain' && /gün|day/.test(d.text)), JSON.stringify(dg.map(x => x.text)));
  check('9c — kademesi düşük sporcunun listesi en zayıf halkayı adıyla taşıyor',
    dc.some(d => d.kind === 'tier' && /dorsifleksiyon|dorsiflexion/i.test(d.text)), JSON.stringify(dc.map(x => x.text)));
  check('9d — her madde bir id taşıyor (D1, D2…)', dg.every(d => /^D\d+$/.test(d.id)), JSON.stringify(dg.map(d => d.id)));

  // 11 — dayanak hiçbirine değmiyorsa yumuşak uyarı
  const v11 = A.validateProgram(A.diParseProgram(aiReply([ex({ ad: 'Romanian Deadlift', hareket_paterni: 'Hinge', ekipman: 'dumbbell', dayanak: [] })])),
    ctxFor(guard));
  check('11 — hiçbir egzersiz ayırt ediciye dayanmıyorsa uyarı var',
    v11.softWarnings.some(w => /ayırt edici|differentiator/i.test(w.text)), softText(v11));
  check('11b — bu uyarı yazımı ENGELLEMİYOR', v11.status === 'pass', hardText(v11));
  const v11ok = A.validateProgram(A.diParseProgram(aiReply([
    ex({ ad: 'Romanian Deadlift', hareket_paterni: 'Hinge', ekipman: 'dumbbell', dayanak: ['D1'] }),
    ex({ ad: 'DB Bench Press', hareket_paterni: 'Push', dayanak: ['D2'] })])), ctxFor(guard));
  check('11c — dayanak verilince uyarı susuyor',
    !v11ok.softWarnings.some(w => /hiçbir egzersizin|no exercise/i.test(w.text)), softText(v11ok));

  // 9e — programlar farklıysa akran uyarısı yok
  const names = ['romanian deadlift', 'db bench press'];
  const peerDifferent = [{ athId: 'c1', names: ['goblet squat', 'ankle mobilization'], diff: dc.map(d => d.text) }];
  const vDiff = A.validateProgram(A.diParseProgram(aiReply([
    ex({ ad: 'Romanian Deadlift', hareket_paterni: 'Hinge', ekipman: 'dumbbell' }),
    ex({ ad: 'DB Bench Press', hareket_paterni: 'Push' })])),
    Object.assign(ctxFor(guard), { peers: peerDifferent }));
  check('9e — çıktılar farklıysa akran uyarısı YOK',
    !vDiff.softWarnings.some(w => /başka bir sporcuyla|another athlete/i.test(w.text)), softText(vDiff));

  // 9f — ayırt edicileri farklı, çıktısı aynı → uyarı
  const peerSameOutput = [{ athId: 'c1', names, diff: dc.map(d => d.text) }];
  const vSame = A.validateProgram(A.diParseProgram(aiReply([
    ex({ ad: 'Romanian Deadlift', hareket_paterni: 'Hinge', ekipman: 'dumbbell' }),
    ex({ ad: 'DB Bench Press', hareket_paterni: 'Push' })])),
    Object.assign(ctxFor(guard), { peers: peerSameOutput }));
  check('9f — farklı ayırt edici + aynı çıktı → uyarı',
    vSame.softWarnings.some(w => /başka bir sporcuyla|another athlete/i.test(w.text)), softText(vSame));

  // 10 — gerçekten benzer iki sporcu: aynı çıktı serbest
  const peerSameEverything = [{ athId: 'x1', names, diff: dg.map(d => d.text) }];
  const vTwin = A.validateProgram(A.diParseProgram(aiReply([
    ex({ ad: 'Romanian Deadlift', hareket_paterni: 'Hinge', ekipman: 'dumbbell' }),
    ex({ ad: 'DB Bench Press', hareket_paterni: 'Push' })])),
    Object.assign(ctxFor(guard), { peers: peerSameEverything }));
  check('10 — ayırt edicileri AYNI olan iki sporcuda benzerlik uyarısı YOK',
    !vTwin.softWarnings.some(w => /başka bir sporcuyla|another athlete/i.test(w.text)), softText(vTwin));

  // kendi geçmişiyle tekrar
  const vRep = A.validateProgram(A.diParseProgram(aiReply([
    ex({ ad: 'Romanian Deadlift', hareket_paterni: 'Hinge', ekipman: 'dumbbell' }),
    ex({ ad: 'DB Bench Press', hareket_paterni: 'Push' })])),
    Object.assign(ctxFor(guard), { recent: [{ tarih: back(2), egzersizler: names, ayirt_ediciler: [] }] }));
  check('kendi son programının aynısı → tekrar uyarısı',
    vRep.softWarnings.some(w => /aynı egzersizler|the same as the session/i.test(w.text)), softText(vRep));
}

group('12 — Bozuk / geçersiz model yanıtı');
{
  const bad = ['', 'merhaba, bugün squat yapalım', '{"program":{', '{"program":{"bloklar":[]}}',
    '{"program":{"bloklar":[{"ad":"Ana","faz":"ana","egzersizler":[]}]}}'];
  let allThrew = true, msgs = [];
  bad.forEach(b => {
    try { A.diParseProgram(b); allThrew = false; msgs.push('sessizce geçti: ' + b.slice(0, 30)); }
    catch (e) { msgs.push('reddedildi'); }
  });
  check('her bozuk yanıt kontrollü hata veriyor, program üretmiyor', allThrew, msgs.join(' · '));
  const vEmpty = A.validateProgram(null, ctxFor(athlete({ wellness: [wellness(TODAY, 4)] })));
  check('boş program doğrulamada SERT ihlal', vEmpty.status === 'fail', hardText(vEmpty));
}

group('13 / 19 — Çağrı bütçesi: tarayıcı modeli hiç çağırmıyor, tek iş başlatıyor');
{
  /* Kaynak üzerinden okunuyor çünkü sınanan şey bir fonksiyonun dönüşü değil, akışın
     KAÇ KEZ ve NEREDEN çağırdığı. Program üretimi artık sunucudaki arka plan işi:
     retry, fallback ve 6 çağrılık tavan functions/ai/router.js'te (functions testleri
     orada sınıyor). Burada kanıtlanan: panel modeli doğrudan hiç çağırmıyor ve bir
     basış tek bir iş dokümanı açıyor. */
  const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
  const panel = html.indexOf('function DailyIndivPanel');
  const end = html.indexOf('function IndivAthleteCard');
  const genSrc = html.slice(panel, end);
  check('13 — günlük bireyselleştirme modeli doğrudan çağırmıyor',
    !/askGemini\(|askCoach\(|await ask\(\)/.test(genSrc));
  const starts = (genSrc.match(/await ref\.set\(\{/g) || []).length;
  check('13a — tek bir iş başlatma noktası var (iş dokümanı bir yerde yazılıyor)', starts === 1, `iş yazımı=${starts}`);
  check('13b — basış kilidi ve meşgulken düğme kapalı', /pressLock\.current\)return/.test(genSrc) && /if\(busy\|\|pressLock\.current\)return;/.test(genSrc));
  check('13c — hata mesajı "yazılmadı" / "değiştirilmedi" diyor', /program yazılmadı|nothing was written/.test(genSrc));
  check('19 — toplu otomatik üretim yok (15 sporcu = 15 el hareketi)',
    !/plans\.forEach\([^)]*gen\(/.test(html) && !/autoGenerate/.test(genSrc));
  check('13d — sistem promptu ayırt edicileri zorunlu kılıyor',
    /dayanak/.test(A.DI_PROGRAM_SYSTEM) && /AYIRT EDİCİLER/.test(A.DI_PROGRAM_SYSTEM));
}

group('AI güvenliği — Gemini anahtarı tarayıcıda yok');
{
  const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
  const script = html.slice(html.indexOf('<script type="text/babel"'));
  check('uygulama Gemini API\'sine doğrudan istek atmıyor', !/generativelanguage\.googleapis\.com/.test(script));
  check('x-goog-api-key başlığı istemcide yok', !/x-goog-api-key/.test(script));
  check('Gemini için anahtar okuması senkron veriden değil', A.aiKeyOf({ provider: 'gemini', gkey: 'AIzaSECRET' }) !== 'AIzaSECRET');
  const m = A.migrate({ teams: [], exercises: [], templates: [], ai: { provider: 'gemini', gkey: 'AIzaSECRET', gmodel: 'gemini-3.5-flash' } });
  check('eski gkey senkron veriden siliniyor, sağlayıcı ve model kalıyor',
    !('gkey' in (m.ai || {})) && m.ai.provider === 'gemini' && m.ai.gmodel === 'gemini-3.5-flash', JSON.stringify(m.ai));
}

group('AI işi — takvime yazım kapısı (Madde 19, Test 12/13)');
{
  const T0 = Date.now() - 30000;
  const ok = { id: 'job_1', status: 'COMPLETED', validationStatus: 'pass', calendarWriteStatus: 'pending',
    athleteId: 'a1', date: '2026-09-22', srcKey: 'team:s1', startedAt: T0, completedAt: T0 + 20000,
    result: { text: '{"program":{}}', model: 'gemini-3.8-flash' } };
  const exp = { athleteId: 'a1', date: '2026-09-22', srcKey: 'team:s1', activeJobId: 'job_1', appliedJobId: null };
  const g = (j, e) => A.diJobWriteGate(Object.assign({}, ok, j || {}), Object.assign({}, exp, e || {}));
  check('tüm koşullar sağlanınca yazılır', g().ok === true, JSON.stringify(g()));
  check('TEST 12 — FAILED iş yazılmaz', !g({ status: 'FAILED' }).ok && g({ status: 'FAILED' }).why.includes('NOT_COMPLETED'));
  check('TEST 13 — doğrulama PASS değilse yazılmaz', g({ validationStatus: 'fail' }).why.includes('NOT_VALIDATED'));
  check('başka sporcunun işi yazılmaz', g({ athleteId: 'a2' }).why.includes('WRONG_TARGET'));
  check('başka günün / seansın işi yazılmaz', g({ date: '2026-09-23' }).why.includes('WRONG_TARGET') && g({ srcKey: 'x' }).why.includes('WRONG_TARGET'));
  check('bu panelin başlatmadığı (eski) iş yazılmaz', g({}, { activeJobId: 'job_2' }).why.includes('STALE_JOB'));
  check('aynı iş ikinci kez yazılmaz', g({}, { appliedJobId: 'job_1' }).why.includes('ALREADY_WRITTEN')
    && g({ calendarWriteStatus: 'written' }).why.includes('ALREADY_WRITTEN') && g({ calendarWriteStatus: 'claimed' }).why.includes('ALREADY_WRITTEN'));
  check('120 sn aşılmışsa yazılmaz', g({ completedAt: T0 + A.AI_JOB_MAX_MS + 1 }).why.includes('DEADLINE'));
  check('sonuç metni yoksa yazılmaz', g({ result: null }).why.includes('NO_RESULT'));
  check('kullanıcı mesajı teknik iz taşımıyor ve takvimin değişmediğini söylüyor',
    /değiştirilmedi|not changed/.test(A.aiJobErrorText({ status: 'FAILED', errorCode: 'VALIDATION_FAILED', failure: { errors: ['x'] } })));
  check('durum metinleri: yeniden deneme / yedek model / doğrulama',
    /Tekrar deneniyor|Trying again/.test(A.aiJobStatusText({ status: 'RETRYING' }))
    && /Alternatif|alternative/.test(A.aiJobStatusText({ status: 'FALLBACK' }))
    && /doğrulanıyor|Checking/.test(A.aiJobStatusText({ status: 'VALIDATING' })));
  check('istemcideki tavan göstergesi sunucuyla aynı (6)', A.AI_JOB_MAX_CALLS === 6);
  const tx = A.aiJobErrorText({ status: 'FAILED', errorCode: 'JOB_DEADLINE', lastError: { code: 'RATE_LIMITED', status: 429, model: 'gemini-3.8-flash' } });
  check('süre dolduğunda son hatanın nedeni de söyleniyor (model, kota, 429)',
    /gemini-3\.8-flash/.test(tx) && /kota|quota/.test(tx) && /429/.test(tx), tx);
}

group('16 — Seçilen model gerçekten tele gidiyor');
(async () => {
  const seen = [];
  global.fetch = async (url, opt) => {
    const body = JSON.parse(opt.body);
    seen.push({ url: String(url), model: body.model || (body.data && body.data.model), headers: opt.headers || {} });
    if (String(url).includes('geminiProxy')) return { ok: true, status: 200, json: async () => ({ result: { text: 'OK' } }) };
    return {
      ok: true, status: 200,
      json: async () => (String(url).includes('anthropic')
        ? { content: [{ type: 'text', text: 'OK' }], stop_reason: 'end_turn' }
        : { candidates: [{ content: { parts: [{ text: 'OK' }] } }] }),
    };
  };
  try {
    await A.askCoach('k', 'claude-sonnet-5', 'sys', [{ role: 'user', content: 'x' }], { maxTokens: 16 });
    check('16a — Claude: seçilen model id body.model olarak gitti',
      seen[0] && seen[0].model === 'claude-sonnet-5', JSON.stringify(seen[0]));
  } catch (e) { check('16a — Claude çağrısı', false, e.message); }
  try {
    await A.askGemini('k', 'gemini-3.5-flash', 'sys', [{ role: 'user', content: 'x' }], { maxTokens: 16 });
    check('16b — Gemini: seçilen model id sunucu proxy\'sine gitti',
      seen[1] && seen[1].url.includes('geminiProxy') && seen[1].model === 'gemini-3.5-flash', JSON.stringify(seen[1] && seen[1].url));
    check('16b2 — istekte API anahtarı yok, yalnızca oturum belirteci var',
      seen[1] && !('x-goog-api-key' in seen[1].headers) && seen[1].headers.authorization === 'Bearer ID_TOKEN', JSON.stringify(seen[1] && seen[1].headers));
  } catch (e) { check('16b — Gemini çağrısı', false, e.message); }
  // sessiz değişim
  const r1 = A.aiModelResolve({ provider: 'anthropic', amodel: 'claude-sonnet-5' });
  check('16c — listedeki model olduğu gibi kullanılıyor', r1.id === 'claude-sonnet-5' && !r1.fellBackFrom, JSON.stringify(r1));
  const r2 = A.aiModelResolve({ provider: 'anthropic', amodel: 'claude-opus-4-8' });
  check('16d — listeden düşmüş model değiştiriliyor AMA artık bildiriliyor',
    r2.fellBackFrom === 'claude-opus-4-8' && r2.id !== 'claude-opus-4-8', JSON.stringify(r2));
  const r3 = A.aiModelResolve({ provider: 'gemini', gmodel: 'gemini-4.0-flash' });
  check('16e — Gemini\'de koçun seçimi hiç değiştirilmiyor', r3.id === 'gemini-4.0-flash' && !r3.fellBackFrom, JSON.stringify(r3));

  group('17 — Doğrudan / bypass kayıt denemesi');
  {
    const ath = athlete({ wellness: [wellness(TODAY, 4, { pain: { knee: 3 } })] });
    const prog = A.diParseProgram(aiReply([ex()]));   // kapalı paternde
    const review = { program: prog, decision: 'accept', decided_at: new Date().toISOString() };
    const gate = A.diWriteGate(review);
    check('17a — onaylanmış taslak kapıdan "yazılabilir" görünüyor (onay tek başına yeterli değil)',
      gate.write === true && gate.approved === true, JSON.stringify(gate));
    const v = A.validateProgram(prog, ctxFor(ath));
    check('17b — ama son doğrulama onu reddediyor → veritabanına gitmez', v.status === 'fail', hardText(v));
    check('17c — applyTo son doğrulamayı gerçekten çağırıyor',
      /const v=validateFor\(p,prog\)/.test(fs.readFileSync(__dirname + '/index.html', 'utf8')));
  }

  group('14 / 15 — Feature B (sıfırdan üretim, 3 deneme)');
  {
    /* Spec iki ayrı akış varsayıyor. Gerçekte sıfırdan program yazan tek CANLI yol
       günlük bireyselleştirmenin kendisi: ProgramWriterTab tanımlı ama hiçbir yere
       mount edilmiyor. Bu yüzden 14 ve 15 sınanacak bir davranışa karşılık gelmiyor —
       "geçti" demek yerine durumu kanıtlayıp raporluyoruz. */
    const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
    const defined = /function ProgramWriterTab/.test(html);
    const mounted = /<ProgramWriterTab/.test(html);
    check('14/15 — ProgramWriterTab tanımlı ama MOUNT EDİLMİYOR (bu testler uygulanamaz)',
      defined && !mounted, `tanımlı=${defined} mount=${mounted}`);
    check('14/15b — canlı üretim yolu tek ve o da denetleyiciden geçiyor',
      /<DailyIndivPanel/.test(html) && /const v=validateFor\(p,prog\)/.test(html));
  }

  group('Ek — Otomatik yazım turu kendini tetiklemiyor');
  {
    const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
    check('aynı verdict tekrar kaydedilmiyor (sonsuz döngü koruması)',
      /sameVerdict\(prev&&prev\.validation,v\)\)return;/.test(html));
    check('otomatik turda tekrarlayan toast yok', /if\(!opts\.auto\)\{/.test(html));
  }

  group('18 — Eski kayıtlar bozulmadan okunuyor');
  {
    // yeni alanları hiç olmayan eski taslak
    const legacy = {
      program: { session_name: 'Eski', blocks: [{ key: 'ai:0', name: 'Ana', phase: 'ana',
        exercises: [{ key: 'ai:0:0', name: 'Goblet Squat', source: 'library', sets: '3', reps: '6', pattern: 'Squat', why: 'x' }] }] },
      instr: { priorities: [], must: [], avoid: [], constraints: [], constraintNote: '', duration: null, maxExercises: null, notes: '' },
      decision: 'accept',
    };
    let ok = true, why = '';
    try {
      const rows = A.diProgramRows(legacy.program, -10);
      const plan = A.diProgramPlan({ meta: { name: 'x' }, blocks: [] }, legacy.program, -10);
      const inst = A.diInstr(legacy.instr, null);
      ok = rows.length === 1 && plan.blocks.length === 1 && Array.isArray(inst.constraints)
        && inst.constraintValues && Object.keys(inst.constraintValues).length === 0;
      why = `rows=${rows.length} blocks=${plan.blocks.length} cv=${JSON.stringify(inst.constraintValues)}`;
    } catch (e) { ok = false; why = e.message; }
    check('18a — dayanak/validation alanı olmayan eski program okunuyor ve takvime çevriliyor', ok, why);
    const v = A.validateProgram(legacy.program, ctxFor(athlete({ wellness: [wellness(TODAY, 4)] })));
    check('18b — eski program doğrulamadan geçebiliyor (yeni alan zorunlu değil)', v.status === 'pass', hardText(v));
    check('18c — eski brief yeni alanla genişletiliyor, eski değerler korunuyor',
      (() => { const i = A.diInstr({ must: ['A'], avoid: ['B'], duration: 45 }, null);
        return i.must[0] === 'A' && i.avoid[0] === 'B' && i.duration === 45; })());
  }

  group('Ek — Kural 27 (pliometrik temas) ve Kural 28 (kademe tavanı)');
  {
    const junior = athlete({ dateOfBirth: '2012-05-01', wellness: [wellness(TODAY, 4)] });   // 14 yaş
    const b = A.diBundle(junior, SETUP, TODAY, { libMap });
    const ceil = A.diPlyoCeiling(b);
    check('27a — U13-U14 bandı okundu (40-60)', ceil && ceil.max === 60, JSON.stringify(ceil));
    const many = A.diParseProgram(aiReply([ex({ ad: 'Box Jump', kaynak: 'custom', hareket_paterni: 'Jump / Plyo', set: '8', tekrar: '10', ekipman: 'plyobox', yuk: null })]));
    const v = A.validateProgram(many, ctxFor(junior));
    check('27b — 80 temas > 60 → SERT ihlal', v.status === 'fail', hardText(v));
    check('27c — sayıyı ve bandı söylüyor', /80/.test(hardText(v)) && /60/.test(hardText(v)), hardText(v));
    const few = A.diParseProgram(aiReply([ex({ ad: 'Box Jump', kaynak: 'custom', hareket_paterni: 'Jump / Plyo', set: '4', tekrar: '10', ekipman: 'plyobox', yuk: null })]));
    check('27d — 40 temas bant içinde → geçiyor', A.validateProgram(few, ctxFor(junior)).status === 'pass');
    check('27e — doğum tarihi yoksa bant uygulanmıyor (tahmin edilmiyor)',
      A.diPlyoCeiling(A.diBundle(athlete({ dateOfBirth: '', wellness: [wellness(TODAY, 4)] }), SETUP, TODAY, { libMap })) === null
      || A.diPlyoCeiling(A.diBundle(athlete({ dateOfBirth: '', wellness: [wellness(TODAY, 4)] }), SETUP, TODAY, { libMap })).grup !== undefined);

    // kademe: zayıf halka
    const weak = athlete({
      wellness: [wellness(TODAY, 4)],
      tests: [Object.assign(cleanTest(back(30)), { ankleDF: { right: 25, left: 40 } })],
    });
    const tier = A.diTier(weak, TODAY);
    check('28a — zayıf halka kuralı: tek başarısız madde kademeyi 1 yapıyor (ortalama alınmıyor)',
      tier.yapisal === 1, `kademe=${tier.yapisal} zayıf=${JSON.stringify(tier.zayif_halka)}`);
    const vTier = A.validateProgram(A.diParseProgram(aiReply([ex({ set: '5' })])), ctxFor(weak));
    check('28b — kademe 1 için 5 set → SERT ihlal', vTier.status === 'fail', hardText(vTier));

    // geçici düşüş çok günlük olmalı
    const oneBadDay = athlete({ wellness: [wellness(TODAY, 2.0)] });
    check('28c — TEK kötü gün geçici kademe düşüşü tetiklemiyor',
      A.diTempDowngrade(oneBadDay, TODAY).active === false, JSON.stringify(A.diTempDowngrade(oneBadDay, TODAY).reasons));
    const threeBadDays = athlete({ wellness: [wellness(back(2), 2.2), wellness(back(1), 2.4), wellness(TODAY, 2.3)] });
    check('28d — çok günlük trend geçici kademe düşüşü tetikliyor',
      A.diTempDowngrade(threeBadDays, TODAY).active === true, JSON.stringify(A.diTempDowngrade(threeBadDays, TODAY).reasons));
    const tDown = A.diTier(threeBadDays, TODAY);
    check('28e — geçici düşüş YAPISAL kademeyi değiştirmiyor',
      tDown.yapisal === 3 && tDown.gecerli === 2, `yapısal=${tDown.yapisal} geçerli=${tDown.gecerli}`);
  }

  group('Ek — Koçun kalıcı kısıt etiketi');
  {
    const ath = athlete({ wellness: [wellness(TODAY, 4)], constraintTags: ['knee'] });
    const b = A.diBundle(ath, SETUP, TODAY, { libMap });
    check('kalıcı etiket paterni kapatıyor (eskiden hiç kapatmıyordu)',
      A.diBlockedPatterns(b).some(x => (x.yasak_paternler || []).includes('Squat')),
      JSON.stringify(A.diBlockedPatterns(b)));
    const v = validate(aiReply([ex()]), ath);
    check('etikete takılan egzersiz SERT ihlal', v.status === 'fail', hardText(v));
    check('gerekçe "kalıcı kısıt" dediğini söylüyor', /kalıcı|standing/i.test(hardText(v)), hardText(v));
  }

  group('Ek — Eksik veri uydurulmuyor');
  {
    const ath = athlete({ wellness: [wellness(TODAY, 4)] });
    const b = A.diBundle(ath, SETUP, TODAY, { libMap });
    const plan = { ath, meta: { name: 'Takım seansı', duration: 60, focus: [] }, blocks: [] };
    const input = A.diBuildProgramInput(b, plan, LIB, A.diInstr(null, null), SETUP, A.kbRules({}), {});
    check('istek "eksik_veriler" taşıyor', Array.isArray(input.eksik_veriler) && input.eksik_veriler.length > 0,
      JSON.stringify((input.eksik_veriler || []).map(x => x.alan)));
    check('cinsiyet alanının olmadığı açıkça bildiriliyor (Kural 10/11 uygulanamaz)',
      (input.eksik_veriler || []).some(x => /cinsiyet/.test(x.alan)));
    check('ayırt ediciler istekte en başta', Object.keys(input)[2] === 'ayirt_ediciler', Object.keys(input).slice(0, 4).join(','));
    check('kademe istekte taşınıyor', !!input.kademe && input.kademe.yapisal === 3, JSON.stringify(input.kademe && input.kademe.yapisal));
    check('30 kural istekte tam hâliyle', Array.isArray(input.bilgi_tabani) && input.bilgi_tabani.length === 30,
      `kural sayısı=${(input.bilgi_tabani || []).length}`);
  }

  group('Ek — "Sporcu Bilgilerini Al" JSON çıktısı');
  {
    const test0 = Object.assign(cleanTest(back(40)), {
      fms: { deepSquat: 2, hurdleStep: { right: 2, left: 3 }, observations: 'Sol dizde valgus' },
      posture: { observations: 'Hafif anterior pelvik tilt' }, notes: 'Eski not', bodyFat: 11,
    });
    const test1 = Object.assign(cleanTest(back(5)), { cmj: 41, notes: 'CMJ iyi, iniş kontrolsüz' });
    const ath = athlete({
      sex: 'M', height: 190, number: '7',
      tests: [test0, test1],
      wellness: [wellness(back(1), 3.5, { sleep: 3, fatigue: 3, soreness: 2 }), wellness(TODAY, 4, { sleep: 5, RHR: 52 })],
      srpeLog: [{ date: back(1), tpRPE: 7, tpDuration: 90 }],
      injuries: [{ type: 'Burkulma', location: 'Ayak bileği', side: 'Sol', status: 'Active', notes: 'Bantla oynuyor' }],
      days: { [TODAY]: { date: TODAY, sessions: [{ name: 'Kuvvet', time: '17:00', duration: 60,
        blocks: [{ name: 'Ana', exercises: [{ name: 'Goblet Squat', sets: '3', reps: '6' }, { name: '' }] }] }] } },
    });
    const instr = A.diInstr({ must: ['Calf Raise'], avoid: ['derin squat'], notes: 'Yarın maç var', maxExercises: 8 }, { duration: 60 });
    const b = A.diBundle(ath, SETUP, TODAY, { libMap });
    const snap = A.diAthleteSnapshot({ ath, setup: SETUP, date: TODAY, bundle: b, instr, customTests: [] });
    const round = JSON.parse(JSON.stringify(snap));
    check('programlanacak gün en başta, tarihi ve günüyle',
      Object.keys(snap)[0] === 'programlanacak_gun' && snap.programlanacak_gun.tarih === TODAY && !!snap.programlanacak_gun.gun,
      JSON.stringify(snap.programlanacak_gun));
    const later = A.diAthleteSnapshot({ ath, setup: SETUP, date: A.fmt(A.addD(A.parseD(TODAY), 2)), instr, customTests: [],
      now: A.parseD(TODAY).getTime(), session: { name: 'Takım Kuvvet', time: '17:00', duration: 60 } });
    check('ileri bir gün için: tarih, fark ve kaynak seans', later.programlanacak_gun.tarih === A.fmt(A.addD(A.parseD(TODAY), 2)) &&
      /2/.test(later.programlanacak_gun.bugunden_farki) && later.programlanacak_gun.kaynak_seans.ad === 'Takım Kuvvet',
      JSON.stringify(later.programlanacak_gun));
    check('çıktı geçerli JSON ve bütün bölümleri taşıyor',
      ['programlanacak_gun', 'sporcu', 'wellness', 'rpe', 'uyku', 'yorgunluk', 'kas_agrisi', 'testler', 'agri_ve_sakatlik', 'ekipman',
        'haftalik_takvim', 'antrenor_talimati'].every(k => k in round), Object.keys(round).join(','));
    check('profil: yaş, cinsiyet, boy, kilo, yağ, pozisyon',
      snap.sporcu.yas === 26 && /^(Erkek|Male)$/.test(snap.sporcu.cinsiyet) && snap.sporcu.boy_cm.deger === 195 &&
      snap.sporcu.vucut_agirligi_kg.deger === 90 && snap.sporcu.vucut_yagi_yuzde.deger === 11 && !!snap.sporcu.pozisyon,
      JSON.stringify(snap.sporcu));
    check('wellness en son check-in\'den (bugün)', snap.wellness.son_checkin.tarih === TODAY &&
      snap.uyku.son_deger === 5 && snap.kas_agrisi.son_deger === 4 && snap.wellness.son_checkin.dinlenik_nabiz_bpm === 52,
      JSON.stringify(snap.wellness.son_checkin));
    check('RPE günlüğü taşınıyor', snap.rpe.son_7_gun.length === 1 && snap.rpe.son_7_gun[0].seanslar[0].rpe === 7,
      JSON.stringify(snap.rpe.son_7_gun));
    const cmj = Object.values(snap.testler.sonuclar).flat().find(x => x.test === 'CMJ');
    check('test sonucu en güncel kayıttan, tarihiyle', cmj && cmj.deger === 41 && cmj.tarih === back(5), JSON.stringify(cmj));
    check('FMS eski kayıttan da olsa güncel olarak geliyor', snap.testler.fms && snap.testler.fms.toplam === 4,
      JSON.stringify(snap.testler.fms));
    const notes = snap.testler.yorumlar.map(x => x.yorum);
    check('test yorumları: her alanın en son notu, kelimesi kelimesine',
      notes.includes('CMJ iyi, iniş kontrolsüz') && !notes.includes('Eski not') &&
      notes.includes('Sol dizde valgus') && notes.includes('Hafif anterior pelvik tilt'), JSON.stringify(notes));
    check('sakatlık notuyla birlikte', snap.agri_ve_sakatlik.aktif_sakatliklar[0].notlar === 'Bantla oynuyor',
      JSON.stringify(snap.agri_ve_sakatlik.aktif_sakatliklar));
    /* İki dumbbell satırı (20 ve 30 kg) tek tür, iki kalem. */
    check('ekipman türü ve adedi', snap.ekipman.tur_sayisi === 4 && snap.ekipman.liste.length === 5 &&
      snap.ekipman.liste[0].adet === 6, JSON.stringify(snap.ekipman));
    const todayRow = snap.haftalik_takvim.gunler.find(d => d.tarih === TODAY);
    check('haftalık takvim 7 gün, bugünün seansı egzersizleriyle', snap.haftalik_takvim.gunler.length === 7 &&
      todayRow && todayRow.bugun === true && todayRow.seanslar[0].bloklar[0].egzersizler.length === 1,
      JSON.stringify(todayRow));
    const brief = A.diBriefForAI(instr);
    check('antrenör talimatı istekteki biçimle aynı (boş alanlar hariç)',
      Object.keys(snap.antrenor_talimati).every(k => JSON.stringify(snap.antrenor_talimati[k]) === JSON.stringify(brief[k])) &&
      snap.antrenor_talimati.mutlaka_olsun[0] === 'Calf Raise' && snap.antrenor_talimati.kacinilacak[0] === 'derin squat' &&
      snap.antrenor_talimati.ana_faz_maks_egzersiz === 8 && snap.antrenor_talimati.ek_notlar === 'Yarın maç var',
      JSON.stringify(snap.antrenor_talimati));
    const plan = { ath, meta: { name: 'Takım seansı', duration: 60, focus: [] }, blocks: [] };
    const input = A.diBuildProgramInput(b, plan, LIB, instr, SETUP, A.kbRules({}), {});
    check('program isteğindeki talimat bölümü değişmedi',
      JSON.stringify(input.antrenor_talimati) === JSON.stringify(A.diBriefForAI(instr)));
    check('boş alanlar çıktıya girmiyor', !JSON.stringify(snap).includes('""') && !JSON.stringify(snap).includes(':null'));
    /* Her basış o anki veriden: yeni bir check-in ve yeni bir not bir sonraki çıktıda. */
    const ath2 = Object.assign({}, ath, {
      wellness: [...ath.wellness.slice(0, 1), wellness(TODAY, 2.5, { sleep: 2, fatigue: 2, soreness: 1 })],
      tests: [...ath.tests, Object.assign(cleanTest(TODAY), { notes: 'Bugünkü not' })],
    });
    const snap2 = A.diAthleteSnapshot({ ath: ath2, setup: SETUP, date: TODAY,
      bundle: A.diBundle(ath2, SETUP, TODAY, { libMap }), instr, customTests: [] });
    check('ikinci basış güncel veriyi okuyor', snap2.uyku.son_deger === 2 && snap2.kas_agrisi.son_deger === 1 &&
      snap2.testler.yorumlar.some(x => x.yorum === 'Bugünkü not'), JSON.stringify(snap2.uyku));
    const anon = A.diAthleteSnapshot({ ath: athlete(), setup: SETUP, date: TODAY, instr, customTests: [] });
    check('girilmemiş cinsiyet uydurulmuyor, eksik olarak bildiriliyor',
      !('cinsiyet' in anon.sporcu) && (anon.eksik_veriler || []).some(x => /cinsiyet|sex/.test(x)), JSON.stringify(anon.eksik_veriler));
  }

  /* ─── özet ─────────────────────────────────────────────────────────────── */
  /* Yarıda kesilmiş bir koşu YEŞİL GÖRÜNMEMELİ. Senaryoların bir kısmı async bir
     blokta; oradaki bir istisna sessizce sona atlamış olsaydı, koşan üç testin
     hepsi geçmiş olur ve iş yeşil biterdi. Beklenen alt sınır burada. */
  const MIN_CHECKS = 90;
  if (results.length < MIN_CHECKS) {
    fail++;
    results.push({ ok: false, name: `koşu yarıda kesilmiş: ${results.length} kontrol çalıştı, en az ${MIN_CHECKS} bekleniyordu`, detail: '' });
  }
  console.log('\n' + '─'.repeat(64));
  console.log(`  ${pass} geçti, ${fail} kaldı`);
  if (fail) {
    console.log('\n  KALANLAR:');
    results.filter(r => !r.ok).forEach(r => console.log(`   · ${r.name}${r.detail ? ' — ' + r.detail : ''}`));
  }
  console.log('─'.repeat(64));
  process.exit(fail ? 1 : 0);
})();
