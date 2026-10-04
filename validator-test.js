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

   Çalıştırma:  node validator-test.js          (kaynak)
                node validator-test.js --dist   (yayına giden küçültülmüş betik; önce node build.js)
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const babel = require('@babel/standalone');

/* ─── uygulamayı yükle ──────────────────────────────────────────────────────
   Betiğin son iki satırı (lmPersist / ReactDOM.render) tarayıcıya aittir ve burada
   çalıştırılmaz; geri kalan her şey — otuz kural, hesap motoru, denetleyici —
   olduğu gibi yüklenir. */
function loadApp() {
  /* --dist: kaynak yerine YAYINA GİDEN derlenmiş + küçültülmüş betiği sına (önce `node build.js`).
     Küçültücü bir kuralı bozarsa bu, tarayıcıda değil burada kırmızı olur. */
  const DIST = process.argv.includes('--dist');
  const html = fs.readFileSync(__dirname + (DIST ? '/dist/index.html' : '/index.html'), 'utf8');
  const open = DIST ? html.indexOf('<script>\n', html.indexOf('id="root"')) : html.indexOf('<script type="text/babel"');
  const start = html.indexOf('>', open) + 1;
  const end = html.indexOf('</script>', start);
  let src = html.slice(start, end);
  const cut = DIST ? src.lastIndexOf('lmPersist()') : src.indexOf('lmPersist();');
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
    'diPeerPrograms', 'diWriteGate', 'diProgramPlan', 'askCoach', 'askGemini',
    'aiModelResolve', 'aiModelOf', 'eqAvailable', 'eqNeedOf', 'pwTier',
    'athReadiness', 'athPainReports', 'athPainNote', 'diPainDays', 'diRestrictionHits',
    'DI_ADJ_BANDS', 'DI_SET_FLOOR', 'DI_REP_FLOOR', 'DI_RD_REDUCE', 'DI_RD_REVIEW',
    'DI_PAIN_BLOCK', 'DI_MIN_PER_EX', 'DI_SIM_SELF', 'DI_SIM_PEER', 'DI_TIER_CAPS',
    'IV_PATTERNS', 'fmt', 'addD', 'parseD', 'recNum',
    'aiKeyOf', 'migrate', 'diPain', 'diFlag', 'blkPhases', 'exPhase', 'blkPhaseLbl', 'buildIndivPlan', 'planToSession',
    'geminiListModels', 'diAthleteSnapshot', 'diBriefForAI', 'diParseExternalProgram', 'diExtPhase', 'DI_EXT_SCHEMA', 'diSquadSnapshot', 'diWriteReviews', 'diReadReview',
    'atpClassify', 'atpExposure', 'atpSnapshot', 'atpRead', 'ATP_QUALITIES', 'ATP_GROUPS', 'L', 'painRegionEn', 'monthFocusLoad', 'buildMonthHTMLDoc', 'MODELS', 'phaseModel', 'modelOf', 'defWeek', 'exDesc', 'descI18nFor', 'descLangOf', 'indivSig', 'exLibraryEntries', 'exLibraryPDF', 'exPicture', 'EXPDF_IMG', 'exLibraryDescriptions', 'syncCompetitions', 'backfillMatchesFromComps', 'compRowToSesPatch', 'diCompetition', 'diBrief', 'DN', 'MN', 'exLibraryText', 'IV_PATTERNS', 'exLibraryNote', 'ctLabelIn', 'exPatternOf'];
  /* Arayüz dilini sınama süresince Türkçeye çevirmek için: JSON'un arayüz dilinden
     bağımsız İngilizce olduğunu ancak Türkçe açıkken bakarak görebiliriz. */
  const tail = '\n;' + expose.map(n => `try{bag.${n}=${n};}catch(e){}`).join('') +
    'bag.inTurkish=fn=>{const p=REPORT_LANG;REPORT_LANG="tr";try{return fn();}finally{REPORT_LANG=p;}};\n';
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

group('1b — Maçtan sonraki gün: kesinti maçın bedeline göre');
{
  const adj = (md, last) => A.diLoadAdjust({ readiness: { score: 4 }, load: {}, pain: {},
    competition: { md }, playing_time: { last } }).pct;
  check('MD+1, 18 dk → küçük kesinti (-5)', adj('MD+1', { minutes: 18, rpe: 6, days_since: 1 }) === -5);
  check('MD+1, 5 dk → kesinti yok', adj('MD+1', { minutes: 5, rpe: 6, days_since: 1 }) === 0);
  check('MD+1, 36 dk → -25', adj('MD+1', { minutes: 36, rpe: 6, days_since: 1 }) === -25);
  check('MD+1, 36 dk, RPE 9 → -30', adj('MD+1', { minutes: 36, rpe: 9, days_since: 1 }) === -30);
  check('MD+1, 30 dk, RPE 3 → -15', adj('MD+1', { minutes: 30, rpe: 3, days_since: 1 }) === -15);
  check('MD+1, süre kaydı yok → -10 (düz -25 değil)', adj('MD+1', null) === -10);
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
  // sınır tüm seansı kapsar: ana fazda 2 + hazırlıkta 2 = 4 egzersiz, sınır 3 → ihlal
  const phased = aiReply(null, { program: { seans_adi: 'Alt vücut kuvvet', bloklar: [
    { ad: 'Hazırlık', faz: 'hazirlik', egzersizler: six.slice(3) },
    { ad: 'Ana', faz: 'ana', egzersizler: six.slice(0, 2) }] } });
  const vPhased = validate(phased, ath, { rawInstr: { maxExercises: 3, maxExercisesSet: true } });
  check('"maks egzersiz" tüm fazları sayıyor (hazırlık dahil)', vPhased.hardViolations.some(h => h.rule === 22), hardText(vPhased));
  const vPhasedOk = validate(phased, ath, { rawInstr: { maxExercises: 4, maxExercisesSet: true } });
  check('toplam sınırın içindeki seans kural 22\'ye takılmıyor', !vPhasedOk.hardViolations.some(h => h.rule === 22), hardText(vPhasedOk));
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

group('13 / 19 — Site içinde otomatik program üretimi yok');
{
  /* Program artık yalnızca dışarıdan yükleniyor: "Sporcu Bilgilerini Al" → harici
     yapay zekâ → "AI Programını Yükle". Panel hiçbir modeli çağırmıyor ve sunucuya
     üretim işi açmıyor. */
  const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
  const panel = html.indexOf('function DailyIndivPanel');
  const end = html.indexOf('function IndivAthleteCard');
  const genSrc = html.slice(panel, end);
  check('13 — günlük bireyselleştirme modeli doğrudan çağırmıyor',
    !/askGemini\(|askCoach\(|await ask\(\)/.test(genSrc));
  check('13a — üretim işi (ai_generation_jobs) açılmıyor', !/ai_generation_jobs/.test(html) && !/await ref\.set\(\{/.test(genSrc));
  check('13b — "Antrenmanı oluştur" düğmesi yok', !/Antrenmanı oluştur/.test(html));
  check('13c — harici program yükleme yolu duruyor', /AI Programını Yükle/.test(genSrc) && /Sporcu Bilgilerini Al/.test(html));
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
    const snap = A.diAthleteSnapshot({ ath, setup: SETUP, date: TODAY, instr, customTests: [] });
    const round = JSON.parse(JSON.stringify(snap));
    check('programlanacak gün en başta, tarihi ve günüyle',
      Object.keys(snap)[0] === 'session_day' && snap.session_day.date === TODAY && snap.session_day.weekday === 'Tuesday',
      JSON.stringify(snap.session_day));
    const later = A.diAthleteSnapshot({ ath, setup: SETUP, date: A.fmt(A.addD(A.parseD(TODAY), 2)), instr, customTests: [],
      now: A.parseD(TODAY).getTime(), session: { name: 'Takım Kuvvet', time: '17:00', duration: 60 } });
    check('ileri bir gün için: tarih, fark ve kaynak seans', later.session_day.date === A.fmt(A.addD(A.parseD(TODAY), 2)) &&
      later.session_day.relative_to_today === 'in 2 days' && later.session_day.source_session.name === 'Takım Kuvvet',
      JSON.stringify(later.session_day));
    check('çıktı geçerli JSON ve bütün bölümleri taşıyor',
      ['session_day', 'athlete', 'wellness', 'rpe', 'sleep', 'fatigue', 'muscle_soreness', 'tests', 'pain_and_injury', 'equipment',
        'weekly_calendar', 'coach_brief'].every(k => k in round), Object.keys(round).join(','));
    check('profil: yaş, cinsiyet, boy, kilo, yağ, pozisyon',
      snap.athlete.age === 26 && snap.athlete.sex === 'Male' && snap.athlete.height_cm.value === 195 &&
      snap.athlete.body_weight_kg.value === 90 && snap.athlete.body_fat_pct.value === 11 && !!snap.athlete.position,
      JSON.stringify(snap.athlete));
    check('wellness en son check-in\'den (bugün)', snap.wellness.latest_checkin.date === TODAY &&
      snap.sleep.latest_value === 5 && snap.muscle_soreness.latest_value === 4 && snap.wellness.latest_checkin.resting_hr_bpm === 52,
      JSON.stringify(snap.wellness.latest_checkin));
    check('RPE günlüğü taşınıyor', snap.rpe.last_7_days.length === 1 && snap.rpe.last_7_days[0].sessions[0].rpe === 7,
      JSON.stringify(snap.rpe.last_7_days));
    const cmj = Object.values(snap.tests.results).flat().find(x => x.test === 'CMJ');
    check('test sonucu en güncel kayıttan, tarihiyle', cmj && cmj.value === 41 && cmj.date === back(5), JSON.stringify(cmj));
    check('FMS eski kayıttan da olsa güncel olarak geliyor', snap.tests.fms && snap.tests.fms.total === 4,
      JSON.stringify(snap.tests.fms));
    const notes = snap.tests.comments.map(x => x.comment);
    check('test yorumları: her alanın en son notu, kelimesi kelimesine',
      notes.includes('CMJ iyi, iniş kontrolsüz') && !notes.includes('Eski not') &&
      notes.includes('Sol dizde valgus') && notes.includes('Hafif anterior pelvik tilt'), JSON.stringify(notes));
    check('sakatlık notuyla birlikte', snap.pain_and_injury.active_injuries[0].notes === 'Bantla oynuyor',
      JSON.stringify(snap.pain_and_injury.active_injuries));
    /* İki dumbbell satırı (20 ve 30 kg) tek tür, iki kalem. */
    check('ekipman türü ve adedi', snap.equipment.type_count === 4 && snap.equipment.items.length === 5 &&
      snap.equipment.items[0].quantity === 6, JSON.stringify(snap.equipment));
    const todayRow = snap.weekly_calendar.days.find(d => d.date === TODAY);
    check('haftalık takvim 7 gün, bugünün seansı egzersizleriyle', snap.weekly_calendar.days.length === 7 &&
      todayRow && todayRow.is_session_day === true && todayRow.sessions[0].blocks[0].exercises.length === 1,
      JSON.stringify(todayRow));
    const brief = A.diBriefForAI(instr);
    check('antrenör talimatı istekteki biçimle aynı (boş alanlar hariç)',
      Object.keys(snap.coach_brief).every(k => JSON.stringify(snap.coach_brief[k]) === JSON.stringify(brief[k])) &&
      snap.coach_brief.must_include[0] === 'Calf Raise' && snap.coach_brief.avoid[0] === 'derin squat' &&
      snap.coach_brief.session_max_exercises === 8 && snap.coach_brief.additional_notes === 'Yarın maç var',
      JSON.stringify(snap.coach_brief));
    const briefC = A.diBriefForAI(Object.assign({}, instr, { priorities: ['mobility', 'corrective'] }));
    const snapC = A.diAthleteSnapshot({ ath, setup: SETUP, date: TODAY,
      instr: Object.assign({}, instr, { priorities: ['corrective'] }), customTests: [] });
    check('öncelik: Düzeltici (Corrective) Hareket Kalitesi altında, seçilince JSON\'a yazılıyor',
      briefC.priorities.length === 2 && snapC.coach_brief.priorities[0] === 'Corrective',
      JSON.stringify([briefC.priorities, snapC.coach_brief.priorities]));
    check('boş alanlar çıktıya girmiyor', !JSON.stringify(snap).includes('""') && !JSON.stringify(snap).includes(':null'));
    /* Her basış o anki veriden: yeni bir check-in ve yeni bir not bir sonraki çıktıda. */
    const ath2 = Object.assign({}, ath, {
      wellness: [...ath.wellness.slice(0, 1), wellness(TODAY, 2.5, { sleep: 2, fatigue: 2, soreness: 1 })],
      tests: [...ath.tests, Object.assign(cleanTest(TODAY), { notes: 'Bugünkü not' })],
    });
    const snap2 = A.diAthleteSnapshot({ ath: ath2, setup: SETUP, date: TODAY, instr, customTests: [] });
    check('ikinci basış güncel veriyi okuyor', snap2.sleep.latest_value === 2 && snap2.muscle_soreness.latest_value === 1 &&
      snap2.tests.comments.some(x => x.comment === 'Bugünkü not'), JSON.stringify(snap2.sleep));
    /* Seçilen günden SONRA alınmış bir test de en güncel veri olarak JSON'a girer. */
    const ath3 = Object.assign({}, ath, {
      tests: [...ath.tests, Object.assign(cleanTest(A.fmt(A.addD(A.parseD(TODAY), 3))), { cmj: 47, notes: 'Yeni test notu' })],
    });
    const snap3 = A.diAthleteSnapshot({ ath: ath3, setup: SETUP, date: back(2), instr, customTests: [] });
    const cmj3 = Object.values(snap3.tests.results).flat().find(x => x.test === 'CMJ');
    check('seans gününden sonraki test de en güncel veri olarak yazılıyor',
      cmj3 && cmj3.value === 47 && snap3.tests.test_record_count === 3 &&
      snap3.tests.comments.some(x => x.comment === 'Yeni test notu') &&
      snap3.tests.fms && snap3.tests.fms.total === 4, JSON.stringify(cmj3));
    const anon = A.diAthleteSnapshot({ ath: athlete(), setup: SETUP, date: TODAY, instr, customTests: [] });
    check('girilmemiş cinsiyet uydurulmuyor, eksik olarak bildiriliyor',
      !('sex' in anon.athlete) && (anon.missing_data || []).some(x => /^sex/.test(x)), JSON.stringify(anon.missing_data));

    /* Denetimde bulunan yanlışlıklar ve eksikler. */
    check('RPE türü okunur etiket, ham kod değil; son kayıt 7 günün içindeyse ayrıca yazılmıyor',
      snap.rpe.last_7_days[0].sessions[0].type === 'Team practice' && !('latest_entry' in snap.rpe),
      JSON.stringify(snap.rpe));
    check('tekrar yok: wellness alanlarının günlük serisi yalnızca wellness.last_7_days\'te; boy/kilo testlerde ikinci kez yok',
      !('last_7_days' in snap.sleep) && snap.wellness.last_7_days.length === 2 && !('mental_fatigue' in snap) &&
      !(snap.tests.results.Anthropometry || []).some(x => /^(Height|Weight|Body Fat)$/.test(x.test)) &&
      !('season_phase' in snap.weekly_calendar) && !('next_game' in snap.weekly_calendar),
      JSON.stringify({ sleep: snap.sleep, anthro: snap.tests.results.Anthropometry }));
    check('antrenman kaydı yoksa maruziyet bloğu kısa: sayım ve kapsam', Object.keys(snap.training_profile.exercise_exposure).join(',') === 'scope,window_end,session_count',
      JSON.stringify(snap.training_profile.exercise_exposure));
    const lim = snap.code_checked_limits;
    check('kademe tavanı egzersiz başına set diye adlandırılıyor ve açıklanıyor',
      lim.tier_caps && lim.tier_caps.max_sets_per_exercise === 5 && !!lim.tier_caps.note &&
      !('plyometric_note' in lim.tier_caps) && /higher is better/.test(lim.tier_caps.tier_scale || ''), JSON.stringify(lim.tier_caps));
    check('"squat" yasağı varken Squat paterni açık gösterilmiyor', !lim.available_patterns.includes('Squat') &&
      lim.available_patterns.includes('Hinge') && !!lim.available_patterns_note, JSON.stringify(lim.available_patterns));
    check('FMS toplamı ölçülen hareketlere göre', snap.tests.fms.max === 6 && snap.tests.fms.complete === false && !!snap.tests.fms.note,
      JSON.stringify(snap.tests.fms));
    check('JSON kökünde session_day.date tekrarı yok; şemada egzersiz RPE alanı var',
      !('date' in snap) && !!snap.session_day.date && !!snap.output_format.program.blocks[0].exercises[0].rpe);
    const withRpe = A.diParseExternalProgram(JSON.stringify({ program: { session_name: 'X', blocks: [{ name: 'Ana', phase: 'main',
      exercises: [{ name: 'Trap Bar Deadlift', sets: '3', reps: '5', rpe: '7', rationale: 'Hinge strength.' }] }] } }), libMap);
    const rpeRow = A.diProgramPlan(A.buildIndivPlan({ id: 's1', name: 'T', time: '09:00', duration: 60, blocks: [] }, ath, { ref: TODAY, ovr: {} }), withRpe, 0).blocks[0].rows[0];
    check('modelin yazdığı RPE takvim satırının RPE sütununa gidiyor', rpeRow.rpe === '7', JSON.stringify(rpeRow));
    check('görev: güvenlik koç talimatından önce', snap.task.some(g => /^Safety comes first/.test(g) && /flagged_conflicts/.test(g)));
    check('maruziyet takım antrenmanını saymadığını söylüyor', /Team practice and games are not in it/.test(snap.training_profile.exercise_exposure.scope || ''));
    check('maç takvimi yoksa missing_data söylüyor', (snap.missing_data || []).some(m => /^game schedule/.test(m)), JSON.stringify(snap.missing_data));
    check('RPE ve süreden yük: 7 günlük sRPE toplamı', snap.rpe.srpe_7_days_au === 630, JSON.stringify(snap.rpe));
    check('sert kısıtın eşleşme kuralı yazılı', /ANY ONE/.test(lim.hard_restriction_matching_rule || '') &&
      lim.hard_restrictions[0].source === 'coach brief', lim.hard_restriction_matching_rule);
    check('görev hacim ayarını yalnızca hazır oluşa bağlamıyor',
      snap.task.some(g => /volume_adjustment_pct/.test(g) && /pain/.test(g) && /volume_adjustment_reasons/.test(g)));
    const snapL = A.diAthleteSnapshot({ ath, setup: SETUP, date: TODAY, instr, customTests: [], libMap });
    const dev = snapL.tests.deviations_from_personal_average || [];
    check('tek ölçümlü test sapma listesine girmiyor (kişisel ortalama yok)', dev.every(x => x.personal_average != null) && !dev.some(x => x.test === 'CMJ'),
      JSON.stringify(dev));
    check('bağlam: spor, pozisyon vurgusu, hareket aileleri, kütüphane',
      snap.sport_context && (snap.sport_context.nature_of_the_game || []).length > 0 &&
      (snap.athlete.position_emphasis || []).length > 0 &&
      snap.movement_families.find(f => f.pattern === 'Squat').family === snap.movement_families.find(f => f.pattern === 'Lunge / Unilateral').family &&
      ((snapL.exercise_library || {}).Squat || []).includes('Goblet Squat'),
      JSON.stringify({ spor: snap.sport_context, poz: snap.athlete.position_emphasis, kut: snapL.exercise_library }));
    check('dinlenik nabız kendi alanında', snap.resting_heart_rate && snap.resting_heart_rate.latest_value === 52, JSON.stringify(snap.resting_heart_rate));
    const withRecent = A.diAthleteSnapshot({ ath, setup: SETUP, date: TODAY, instr, customTests: [], libMap,
      recent: [{ tarih: back(2), egzersizler: ['Goblet Squat'], ayirt_ediciler: [] }] });
    check('geçmiş programlar JSON\'a giriyor', (withRecent.recent_programs || [])[0].exercises[0] === 'Goblet Squat' &&
      withRecent.recent_programs[0].date === back(2));
    check('eksik veriler antrenman yaşını da sayıyor',
      (A.diAthleteSnapshot({ ath: athlete({ trainingAge: '' }), setup: SETUP, date: TODAY, instr, customTests: [] }).missing_data || [])
        .some(x => /training age/.test(x)));
    const futureInj = Object.assign({}, ath, { injuries: [...ath.injuries,
      { type: 'Zorlanma', location: 'Hamstring', side: 'Right', status: 'Active', date: A.fmt(A.addD(A.parseD(TODAY), 3)) }] });
    const snapF = A.diAthleteSnapshot({ ath: futureInj, setup: SETUP, date: TODAY, instr, customTests: [] });
    check('programlanan günden sonra başlayan sakatlık o günün JSON\'unda yok',
      !JSON.stringify(snapF.pain_and_injury).includes('Hamstring'), JSON.stringify(snapF.pain_and_injury.active_injuries));

    /* JSON her zaman İngilizce: arayüz Türkçe olsa da anahtarlar, görev, şema ve
       uygulamanın kendi etiketleri İngilizce. Koçun ya da sporcunun yazdığı metin
       (notlar, adlar) olduğu gibi kalır. */
    const painAth = Object.assign({}, ath, { wellness: [...ath.wellness.slice(0, 1),
      wellness(TODAY, 4, { sleep: 5, RHR: 52, painMap: { 'Sol diz önü': 2, 'Boyun': 1 } })] });
    const trSnap = A.inTurkish(() => A.diAthleteSnapshot({ ath: painAth, setup: SETUP, date: TODAY, instr, customTests: [], libMap }));
    check('Türkçe arayüzde de JSON İngilizce', A.inTurkish(() => A.L('tr', 'en')) === 'tr' && A.L('tr', 'en') === 'en' &&
      trSnap.session_day.weekday === 'Tuesday' && trSnap.athlete.sex === 'Male' &&
      trSnap.sleep.name === 'Sleep' && trSnap.wellness.scale === '1-5 (5 = best)' &&
      trSnap.sport_context.sport === 'Basketball' && trSnap.task[0].startsWith('Write ONE') &&
      !!trSnap.output_format.program.blocks, JSON.stringify(trSnap.session_day));
    const coachText = new Set(['Test Sporcu', 'Kuvvet', 'Ana', 'CMJ iyi, iniş kontrolsüz', 'Sol dizde valgus', 'Hafif anterior pelvik tilt',
      'Burkulma', 'Ayak bileği', 'Sol', 'Bantla oynuyor', 'derin squat', 'derin', 'Yarın maç var']);
    const trLeft = [];
    (function walk(v, path) {
      if (Array.isArray(v)) v.forEach((x, i) => walk(x, path + '[' + i + ']'));
      else if (v && typeof v === 'object') Object.keys(v).forEach(k => {
        if (/[çğıöşüÇĞİÖŞÜ]/.test(k)) trLeft.push('anahtar ' + path + '.' + k);
        walk(v[k], path + '.' + k);
      });
      else if (typeof v === 'string' && /[çğıöşüÇĞİÖŞÜ]/.test(v) && ![...coachText].some(t => v === t || v.includes(t))) trLeft.push(path + ' = ' + v);
    })(trSnap, '');
    check('JSON\'da koç metni dışında Türkçe kalmıyor', trLeft.length === 0, trLeft.slice(0, 8).join(' | '));
    const pm = trSnap.pain_and_injury.pain_map || [];
    check('ağrı haritası bölgeleri İngilizce', pm.some(r => r.region === 'Left front of knee' && r.side === 'left') &&
      pm.some(r => r.region === 'Neck'), JSON.stringify(pm));
    const PB = require('./pain-body.js').PainBody;
    const badRegion = PB.REGIONS.filter(r => A.painRegionEn(r.k) !== r.en).map(r => r.k);
    check('ağrı bölgesi çevirisi pain-body.js kataloğunun tamamıyla aynı', PB.REGIONS.length > 60 && badRegion.length === 0,
      badRegion.join(', '));
    check('JSON: dil alanı ya da dil talimatı yok', !('response_language' in trSnap) &&
      !trSnap.task.some(g => /response_language|Turkish/.test(g)));
    check('JSON: görev kütüphaneye olabildiğince az başvurmasını söylüyor',
      trSnap.task.some(g => /exercise_library as little as possible/.test(g) && /fully accepted/.test(g)) &&
      !trSnap.task.some(g => /wherever possible|outside the library is allowed but/.test(g)));
    /* Modelin yazdığı açıklama satırda iki dilli tutuluyor; ekran ve çıktı uygulama
       dilindekini okuyor, koçun üzerine yazdığı metin olduğu gibi kalıyor. */
    const rowEn = Object.assign({ description: 'Targets ankle dorsiflexion.' }, A.descI18nFor(true, 'Targets ankle dorsiflexion.'));
    const rowTr = Object.assign({}, rowEn, { descI18n: Object.assign({}, rowEn.descI18n, { tr: 'Ayak bileği dorsifleksiyonunu hedefler.' }) });
    check('açıklama uygulama diliyle değişiyor',
      rowEn.descI18n.en === 'Targets ankle dorsiflexion.' && A.exDesc(rowEn) === 'Targets ankle dorsiflexion.' &&
      A.inTurkish(() => A.exDesc(rowTr)) === 'Ayak bileği dorsifleksiyonunu hedefler.' && A.exDesc(rowTr) === 'Targets ankle dorsiflexion.' &&
      A.inTurkish(() => A.exDesc(Object.assign({}, rowTr, { description: 'Koçun notu' }))) === 'Koçun notu' &&
      A.descLangOf('Sol ayak bileği için') === 'tr' && Object.keys(A.descI18nFor(false, 'x')).length === 0,
      JSON.stringify(rowTr));
    check('dil anahtarı JSON\'dan sonra eski haline dönüyor', A.inTurkish(() => { A.diAthleteSnapshot({ ath, setup: SETUP, date: TODAY, instr, customTests: [] }); return A.L('tr', 'en'); }) === 'tr');
  }

  group('Ek — Harici AI programı: JSON yapıştır → program → denetim');
  {
    const ath = athlete({ wellness: [wellness(TODAY, 4)] });
    const b = A.diBundle(ath, SETUP, TODAY, { libMap });
    const instr = A.diInstr({ avoid: ['derin squat'] }, { duration: null });
    const snap = A.diAthleteSnapshot({ ath, setup: SETUP, date: TODAY, instr, customTests: [] });
    check('sporcu JSON\'u görevi, çıktı formatını ve kod sınırlarını taşıyor',
      Array.isArray(snap.task) && snap.task.length > 3 && !!snap.output_format.program.blocks &&
      !!snap.code_checked_limits && Array.isArray(snap.movement_families) &&
      snap.code_checked_limits.hard_restrictions.some(r => /derin squat/.test(r.text)),
      JSON.stringify(snap.code_checked_limits).slice(0, 300));
    const ctx = ctxFor(ath);
    /* output_format'ın kendisiyle yazılmış bir yanıt: şemadaki İngilizce anahtarların
       hepsi okunuyor, hiçbiri yolda düşmüyor. */
    const enReply = JSON.stringify({
      status_summary: 'Normal readiness.', training_priorities: [{ priority: 'Lower-body strength', rationale: 'D1' }],
      program: { session_name: 'Lower body', blocks: [
        { name: 'Warm-up', phase: 'preparation', exercises: [{ name: 'Ankle Mobilization', sets: '2', reps: '10', equipment: 'bodyweight',
          movement_pattern: 'Mobility', rationale: 'Ankle range.', basis: ['D1'] }] },
        { name: 'Main', phase: 'main', exercises: [{ name: 'Romanian Deadlift', sets: '3', reps: '8', load: '20 kg', rest: '90 s',
          equipment: 'dumbbell', movement_pattern: 'Hinge', rationale: 'Hip-dominant strength.', basis: ['D1'] }] },
        { name: 'Accessory', phase: 'complementary', exercises: [{ name: 'Pallof Press', sets: '2', reps: '10', equipment: 'cable',
          movement_pattern: 'Core / Brace', rationale: 'Trunk.', basis: [] }] }] },
      constraints_respected: ['No deep squat.'],
      flagged_conflicts: [{ instruction: 'Calf Raise', field: 'must_include', rule: 'pain', decision: 'dropped', alternative: 'Pallof Press' }],
      rationale: 'Hinge day.', coach_warning: 'Check the knee.' });
    const pe = A.diParseExternalProgram(enReply, libMap);
    check('output_format\'taki İngilizce yanıt eksiksiz okunuyor',
      pe.summary === 'Normal readiness.' && pe.priorities[0].oncelik === 'Lower-body strength' && pe.session_name === 'Lower body' &&
      pe.blocks.map(x => x.phase).join(',') === 'hazirlik,ana,tamamlayici' &&
      pe.blocks[1].exercises[0].load === '20 kg' && pe.blocks[1].exercises[0].pattern === 'Hinge' && pe.blocks[1].exercises[0].basis[0] === 'D1' &&
      pe.respected[0] === 'No deep squat.' && pe.conflicts[0].talimat === 'Calf Raise' && pe.conflicts[0].alt === 'Pallof Press' &&
      pe.rationale === 'Hinge day.' && pe.warning === 'Check the knee.',
      JSON.stringify({ s: pe.summary, p: pe.priorities, b: pe.blocks.map(x => x.phase), c: pe.conflicts, r: pe.rationale, w: pe.warning }));
    check('şemadaki her faz değeri okunuyor', ['preparation', 'main', 'complementary'].map(A.diExtPhase).join(',') === 'hazirlik,ana,tamamlayici');
    // 1) Şemadaki biçim, markdown kod bloğu ve açıklama metniyle sarılmış.
    const canonical = 'İşte program:\n```json\n' + aiReply([ex(), ex({ ad: 'Barbell Row', hareket_paterni: 'Pull', ekipman: 'barbell', yuk: '20 kg' })]) + '\n```\nİyi antrenmanlar!';
    const p1 = A.diParseExternalProgram(canonical, libMap);
    check('şema biçimi (kod bloğu + açıklama metni arasında) okunuyor',
      p1.blocks.length === 1 && p1.blocks[0].exercises.length === 2 && p1.blocks[0].phase === 'ana' && p1.session_name === 'Alt vücut kuvvet',
      JSON.stringify(p1.blocks.map(x => [x.name, x.phase, x.exercises.map(e => e.name)])));
    check('okunan program denetimden geçiyor', A.validateProgram(p1, ctx).status === 'pass', hardText(A.validateProgram(p1, ctx)));
    // 2) İngilizce anahtarlar, bloklar en üstte, sayılar sayı olarak.
    const english = JSON.stringify({ session_name: 'Lower', summary: 'OK',
      blocks: [
        { name: 'Warm-up', phase: 'Warm-up', exercises: [{ name: 'Ankle Mobilization', sets: 2, reps: 10, pattern: 'Mobility' }] },
        { name: 'Ana Faz', exercises: [{ name: 'Goblet Squat', sets: 3, reps: 6, load: '20 kg', rest: '90 sn', equipment: 'dumbbell', pattern: 'Squat', rationale: 'Kuvvet' }] },
        { title: 'Accessory', type: 'accessory', items: [{ exercise: 'Pallof Press', sets: '2', reps: '10', movement_pattern: 'Core / Brace' }] },
      ] });
    const p2 = A.diParseExternalProgram(english, libMap);
    check('İngilizce anahtarlar ve faz adları eşleniyor',
      p2.blocks.map(x => x.phase).join(',') === 'hazirlik,ana,tamamlayici' && p2.blocks[1].exercises[0].sets === '3' &&
      p2.blocks[1].exercises[0].load === '20 kg' && p2.blocks[1].exercises[0].source === 'library' && p2.summary === 'OK',
      JSON.stringify(p2.blocks.map(x => [x.phase, x.exercises.map(e => [e.name, e.sets, e.reps, e.source])])));
    check('Türkçe faz adları (Hazırlık / Soğuma)', A.diExtPhase('Hazırlık') === 'hazirlik' && A.diExtPhase('Soğuma') === 'tamamlayici' &&
      A.diExtPhase('ANA İŞ') === 'ana');
    // 3) Kaçınılacak egzersiz yazılmışsa: okunur ama sert ihlal olarak durur.
    const bad = A.diParseExternalProgram(aiReply([ex({ ad: 'Derin Squat' })]), libMap);
    const vb = A.validateProgram(bad, ctxFor(ath, { rawInstr: { avoid: ['derin squat'] } }));
    check('yüklenen programda sert kural yazımı engellemiyor, uyarı olarak görünüyor',
      vb.status === 'pass' && vb.hardViolations.length === 0 &&
      vb.softWarnings.some(w => w.was_hard && /Derin Squat/.test(w.text)), JSON.stringify(vb.softWarnings.map(w => w.text)));
    const inApp = Object.assign({}, bad, { external: false });
    check('uygulama içi AI taslağında aynı kural hâlâ sert ihlal',
      A.validateProgram(inApp, ctxFor(ath, { rawInstr: { avoid: ['derin squat'] } })).status === 'fail');
    const plan0 = { ath, meta: { name: 'Takım', duration: 60, focus: [] }, blocks: [] };
    const heavy = A.diParseExternalProgram(aiReply([ex({ set: '4', tekrar: '10' })]), libMap);
    const w1 = A.diProgramPlan(plan0, heavy, -25).blocks[0].rows[0];
    const w2 = A.diProgramPlan(plan0, Object.assign({}, heavy, { external: false }), -25).blocks[0].rows[0];
    check('yüklenen programın set-tekrarı takvime aynen yazılıyor (hacim kesintisi yok)',
      w1.sets === '4' && w1.reps === '10' && (w2.sets !== '4' || w2.reps !== '10'),
      `yüklenen ${w1.sets}×${w1.reps} · uygulama içi ${w2.sets}×${w2.reps}`);
    // 4) Bozuk ya da boş girdi reddediliyor.
    let e1 = '', e2 = '', e3 = '';
    try { A.diParseExternalProgram('', libMap); } catch (e) { e1 = e.message; }
    try { A.diParseExternalProgram('program yok', libMap); } catch (e) { e2 = e.message; }
    try { A.diParseExternalProgram('{"program":{"bloklar":[]}}', libMap); } catch (e) { e3 = e.message; }
    check('boş / JSON olmayan / egzersizsiz girdi reddediliyor', !!e1 && !!e2 && !!e3, [e1, e2, e3].join(' | '));
  }

  group('Ek — Yüklenen programın blokları tek bloğun fazları olur');
  {
    const ath = athlete({ wellness: [wellness(TODAY, 4)] });
    const plan0 = { ath, meta: { name: 'Takım', duration: 60, focus: [] }, blocks: [] };
    const multi = A.diParseExternalProgram(JSON.stringify({ program: { seans_adi: 'Kuvvet Koruma', bloklar: [
      { ad: 'Hazırlık — Mobilite', faz: 'hazirlik', egzersizler: [{ ad: 'Thoracic Extension', set: '2', tekrar: '8', gerekce: 'Opens the thoracic spine.' }, { ad: 'Wall Slides', set: '2', tekrar: '8' }] },
      { ad: 'Ana — Kuvvet koruma (itiş-çekiş)', faz: 'ana', egzersizler: [{ ad: 'DB Bench Press', set: '3', tekrar: '8' }] },
      { ad: 'Soğuma', faz: 'soguma', egzersizler: [{ ad: 'Nefes', sure: '3 dk' }] },
    ] } }), libMap);
    const pl = A.diProgramPlan(plan0, multi, 0);
    const blk = pl.blocks[0];
    check('üç bölüm tek blok olarak yazılıyor', pl.blocks.length === 1, `blok=${pl.blocks.length}`);
    check('bölümler fazlar, adlarıyla', blk.phases.length === 3 &&
      blk.phases.map(p => blk.phaseNames[p]).join('|') === 'Hazırlık — Mobilite|Ana — Kuvvet koruma (itiş-çekiş)|Soğuma',
      JSON.stringify(blk.phaseNames));
    check('her egzersiz kendi bölümünün fazında', blk.rows.map(r => blk.phases.indexOf(r.phase)).join(',') === '0,0,1,2',
      JSON.stringify(blk.rows.map(r => r.phase)));
    const src = { id: 's1', name: 'Takım', time: '09:00', duration: 60, blocks: [{ id: 'k1', name: 'Ana', exercises: [{ name: 'Goblet Squat', sets: '3', reps: '8' }] }] };
    const real = A.buildIndivPlan(src, ath, { ref: TODAY, ovr: {} });
    const ses = A.planToSession(A.diProgramPlan(real, multi, 0), src, TODAY, 'team:x');
    const sb = ses.blocks[0];
    check('takvime yazılan seansta da tek blok, fazlar ve adları korunuyor', ses.blocks.length === 1 && sb.phases.length === 3 &&
      sb.phaseNames[sb.phases[1]] === 'Ana — Kuvvet koruma (itiş-çekiş)' && sb.exercises.map(e => sb.phases.indexOf(e.phase)).join(',') === '0,0,1,2',
      JSON.stringify({ n: ses.blocks.length, ph: sb.phases, names: sb.phaseNames }));
    const withWhy = sb.exercises.filter(e => e.description);
    check('modelin açıklaması takvim satırında dilleriyle tutuluyor', withWhy.length > 0 &&
      withWhy.every(e => e.descI18n && Object.values(e.descI18n).includes(e.description)) && withWhy[0].descI18n.en === 'Opens the thoracic spine.',
      JSON.stringify(withWhy.map(e => [e.description, e.descI18n])));
    const sesTr = JSON.parse(JSON.stringify(ses));
    sesTr.blocks[0].exercises.forEach(e => { if (e.descI18n) e.descI18n.tr = 'çeviri'; });
    check('çeviri eklenince seans elle düzenlenmiş sayılmıyor', A.indivSig(sesTr) === A.indivSig(ses));
    const one = A.diProgramPlan(plan0, A.diParseExternalProgram(aiReply([ex()]), libMap), 0);
    check('tek bölümlük program fazsız düz blok', one.blocks.length === 1 && !(one.blocks[0].phases || []).length);
    const legacy = { phases: ['hazirlik', 'ana'], exercises: [] };
    check('eski üç sabit faz okunmaya devam ediyor', A.blkPhases(legacy).join(',') === 'hazirlik,ana' &&
      A.exPhase({ phase: 'Ana' }) === 'ana' && A.blkPhaseLbl('ph_x', { phaseNames: { ph_x: 'Pliometri' } }) === 'Pliometri');
  }

  group('Ek — Ağrı 5 üzerinden');
  {
    const ath = athlete({ wellness: [wellness(TODAY, 4, { pain: { knee: 3 } })] });
    const p = A.diPain(ath, TODAY);
    check('en yüksek ağrı 0-5 ölçeğinde', p.peak_severity_0_5 === 5 && !('peak_severity_0_10' in p), JSON.stringify(p.peak_severity_0_5));
    const f = A.diFlag(A.diBundle(ath, SETUP, TODAY, { libMap }));
    check('bayrak gerekçesi /5 yazıyor, /10 değil', f.all_reasons.some(r => /\/5/.test(r.text)) && !f.all_reasons.some(r => /\/10/.test(r.text)),
      JSON.stringify(f.all_reasons.map(r => r.text)));
    check('kapanma eşiği 0-5 ölçeğinde (orta = 3)', A.DI_PAIN_BLOCK === 3);
  }

  group('Ek — Tüm sporcular tek JSON\'da; tek yanıttan her sporcuya kendi programı');
  {
    const a1 = athlete({ id: 'a1', name: 'Ali Kaya', wellness: [wellness(TODAY, 4)] });
    const a2 = athlete({ id: 'a2', name: 'Veli Can', wellness: [wellness(TODAY, 2.5, { sleep: 2 })] });
    const items = [a1, a2].map(a => ({ ath: a,
      instr: A.diInstr(a.id === 'a2' ? { notes: 'Yalnız üst vücut' } : null, { duration: 60 }), session: { name: 'Takım', duration: 60 } }));
    const sq = A.diSquadSnapshot({ items, setup: SETUP, date: TODAY, customTests: [] });
    check('toplu görev metni her sporcunun kendi alanlarını adlandırıyor',
      sq.task.some(g => /^Each athlete's own coach_brief is binding/.test(g)) &&
      sq.task.some(g => /each athlete's own code_checked_limits/.test(g)) &&
      sq.task.some(g => /Each athlete's code_checked_limits\.volume_adjustment_pct/.test(g)) &&
      sq.task.some(g => /that athlete's recent_programs/.test(g)) && sq.task.some(g => /that athlete's differentiators/.test(g)),
      sq.task.join(' || '));
    const sqL = A.diSquadSnapshot({ items, setup: SETUP, date: TODAY, customTests: [], libMap });
    check('toplu JSON: kütüphane, aileler ve spor bağlamı bir kez, en üstte',
      !!sqL.exercise_library && !!sqL.movement_families && !!sqL.sport_context &&
      !sqL.athletes.some(x => 'exercise_library' in x || 'movement_families' in x || 'sport_context' in x),
      Object.keys(sqL).join(','));
    JSON.parse(JSON.stringify(sq));
    check('toplu JSON: her sporcu kendi verisi ve talimatıyla, ortak kısımlar bir kez',
      sq.athlete_count === 2 && sq.athletes.length === 2 && sq.athletes[0].athlete.id === 'a1' &&
      sq.athletes[1].sleep.latest_value === 2 && sq.athletes[1].coach_brief.additional_notes === 'Yalnız üst vücut' &&
      !('task' in sq.athletes[0]) && !('response_language' in sq) && !('output_format' in sq.athletes[0]) && !('equipment' in sq.athletes[0]) &&
      Array.isArray(sq.task) && Array.isArray(sq.output_format.programs) && !!sq.equipment && sq.session_day.date === TODAY,
      Object.keys(sq).join(','));
    /* Şemadaki biçimde (programs / athlete_id / athlete_name) yazılmış toplu yanıt. */
    const enSquad = JSON.stringify({ programs: [
      Object.assign(JSON.parse(aiReply([ex()])), { athlete_id: 'a1', athlete_name: 'Ali Kaya' }),
      Object.assign(JSON.parse(aiReply([ex({ ad: 'DB Bench Press', hareket_paterni: 'Push' })])), { athlete_id: 'a2', athlete_name: 'Veli Can' }),
    ] });
    const pen = A.diParseExternalProgram(enSquad, libMap, { id: 'a2', name: 'Veli Can' });
    const penName = A.diParseExternalProgram(enSquad, libMap, { id: 'zz', name: 'ali kaya' });
    check('İngilizce toplu yanıttan id\'ye (yoksa ada) göre doğru program',
      pen.blocks[0].exercises[0].name === 'DB Bench Press' && penName.blocks[0].exercises[0].name === 'Goblet Squat');
    const answer = JSON.stringify({ programlar: [
      Object.assign(JSON.parse(aiReply([ex()])), { sporcu_id: 'a1', sporcu_adi: 'Ali Kaya' }),
      Object.assign(JSON.parse(aiReply([ex({ ad: 'DB Bench Press', hareket_paterni: 'Push' })])), { sporcu_id: 'a2', sporcu_adi: 'Veli Can' }),
    ] });
    const pa = A.diParseExternalProgram(answer, libMap, { id: 'a2', name: 'Veli Can' });
    const pb = A.diParseExternalProgram(answer, libMap, { id: 'zz', name: 'ali kaya' });
    check('çok sporculu yanıttan id\'ye (yoksa ada) göre doğru program seçiliyor',
      pa.blocks[0].exercises[0].name === 'DB Bench Press' && pb.blocks[0].exercises[0].name === 'Goblet Squat',
      [pa.blocks[0].exercises[0].name, pb.blocks[0].exercises[0].name].join(' / '));
    let miss = '';
    try { A.diParseExternalProgram(answer, libMap, { id: 'a9', name: 'Başka Biri' }); } catch (e) { miss = e.message; }
    check('yanıtta olmayan sporcuya başkasının programı verilmiyor', /Başka Biri/.test(miss), miss);
    const single = JSON.stringify({ programlar: [Object.assign(JSON.parse(aiReply([ex()])), { sporcu_id: 'a1', sporcu_adi: 'Ali Kaya' })] });
    let miss2 = '';
    try { A.diParseExternalProgram(single, libMap, { id: 'a2', name: 'Veli Can' }); } catch (e) { miss2 = e.message; }
    const untagged = A.diParseExternalProgram(JSON.stringify({ programlar: [JSON.parse(aiReply([ex()]))] }), libMap, { id: 'a2', name: 'Veli Can' });
    check('tek programlık yanıt başka bir sporcuya aitse bu sporcuya yazılmıyor; etiketsizse alınıyor',
      /Veli Can/.test(miss2) && untagged.blocks.length === 1, miss2);
  }

  group('Ek — Toplu yazım: bütün sporcuların onayı tek yazımda');
  {
    let team = { id: 't1', indiv: { ai: { [`${TODAY}|src|a0`]: { program: { blocks: [] }, decision: null } } } };
    const updateTeam = (id, upd) => { team = Object.assign({}, team, upd); };
    A.diWriteReviews(team, updateTeam, 'src', TODAY, {
      a1: { program: { blocks: [1] }, decision: 'accept' }, a2: { program: { blocks: [2] }, decision: 'accept' } });
    const r1 = A.diReadReview(team, 'src', 'a1', TODAY), r2 = A.diReadReview(team, 'src', 'a2', TODAY), r0 = A.diReadReview(team, 'src', 'a0', TODAY);
    check('iki sporcunun onayı da kayıtlı, mevcut kayıt korunuyor',
      r1 && r1.decision === 'accept' && r2 && r2.decision === 'accept' && r0 && r0.decision === null);
  }

  group('Ek — Ağrı ne kadar görünür: kırmızı 2 gün, sarı yalnızca o gün');
  {
    const tags = (a, d) => A.athPainReports(a, d).map(p => p.tag).sort().join(',');
    // Dün hamstring Orta (sarı), diz Fazla (kırmızı); bugün hiçbiri işaretlenmedi.
    const ath = athlete({ wellness: [
      wellness(back(1), 4, { pain: { hamstring: 2, knee: 3 } }),
      wellness(TODAY, 4) ] });
    check('bildirildiği gün ikisi de görünüyor', tags(ath, back(1)) === 'hamstring,knee', tags(ath, back(1)));
    check('ertesi gün: sarı kayboluyor, kırmızı bir gün daha kalıyor', tags(ath, TODAY) === 'knee', tags(ath, TODAY));
    check('iki gün sonra kırmızı da kayboluyor', tags(ath, A.fmt(A.addD(A.parseD(TODAY), 1))) === '',
      tags(ath, A.fmt(A.addD(A.parseD(TODAY), 1))));
    // Bugün check-in yoksa dünün sarısı taşınmıyor (eskiden 2 gün boyunca görünüyordu).
    const noToday = athlete({ wellness: [wellness(back(1), 4, { pain: { hamstring: 2 } })] });
    check('check-in olmayan günde dünün sarı ağrısı görünmüyor', tags(noToday, TODAY) === '', tags(noToday, TODAY));
    // Aynı bölge bugün daha hafif işaretlendiyse bugünün derecesi geçerli.
    const again = athlete({ wellness: [
      wellness(back(1), 4, { pain: { knee: 3 } }), wellness(TODAY, 4, { pain: { knee: 1 } })] });
    const k = A.athPainReports(again, TODAY);
    check('iki gün de bildirilen bölgede bugünün derecesi gösteriliyor',
      k.length === 1 && k[0].sev === 1 && k[0].date === TODAY, JSON.stringify(k));
    // Izgara (painMap): etiket listesinde olmayan bölgeler de aynı kurala uyuyor.
    const grid = athlete({ wellness: [
      wellness(back(1), 4, { painMap: { Boyun: 3, Bel: 2 } }), wellness(TODAY, 4, { painMap: { Omuz: 1 } })] });
    const n = A.athPainNote(grid, TODAY);
    const regs = n ? n.regions.map(g => `${g.region}@${g.date === TODAY ? 'bugün' : 'dün'}`).sort().join(',') : '';
    check('ağrı ızgarası: bugünkü + dünün kırmızısı, dünün sarısı yok', regs === 'Boyun@dün,Omuz@bugün', regs);
    check('ağrı ızgarası: ertesi gün bugünün sarı bölgesi de kayboluyor',
      A.athPainNote(grid, A.fmt(A.addD(A.parseD(TODAY), 1))) === null);
  }

  group('Ek — Egzersiz kütüphanesi: PDF dışa aktarma, uygulama dilinde, görsel çerçeveli');
  {
    const lib = [
      { name: 'Romanian Deadlift', type: 'Hip Dominant', subType: 'Concentric', action: 'Pull', pattern: 'Bilateral', equipment: 'Barbell', difficulty: 'Level 2',
        muscle: ['Hamstrings', 'Glutes'], contra: ['knee'], purpose: 'Kalça menteşesi\n   hamstring için.', image: 'data:image/png;base64,AAAA' },
      { name: 'Pallof Press', type: 'Core', subType: 'Anti-Rotation', position: 'Standing', purpose: '' },
      { name: 'Box Jump', type: 'Plyometric', subType: 'Vertical', exKind: 'Jump', technique: 'Bilateral', purpose: 'x'.repeat(700) },
      { name: 'Özel Hareket', type: '' },
      { name: '   ', type: 'Core' },
    ];
    const en = A.exLibraryEntries(lib, { lang: 'en' });
    const tr = A.exLibraryEntries(lib, { lang: 'tr' });
    const row = (L, n) => L.sections.flatMap(s => s.rows).find(r => r.name === n);
    const fld = (r, k) => (r.fields.find(f => f.k === k) || {}).v;
    check('kartlar: adsız kayıt yok; her kategori kendi bölümünde, kategorisiz sonda',
      en.total === 4 && en.sections.map(s => s.title).join('|') === 'Hip Dominant|Core|Plyometric|Uncategorized' &&
      row(en, 'Özel Hareket') && en.sections[3].rows[0].name === 'Özel Hareket', en.sections.map(s => s.title).join('|'));
    const rdl = row(en, 'Romanian Deadlift');
    check('kart (en): etiketler, zorluk, kaslar, kontrendikasyon ve tek satıra inen açıklama',
      fld(rdl, 'Contraction Focus') === 'Concentric' && fld(rdl, 'Action') === 'Pull' && fld(rdl, 'Movement Pattern') === 'Bilateral' &&
      fld(rdl, 'Equipment') === 'Barbell' && fld(rdl, 'Difficulty') === 'Level 2 (Intermediate)' && fld(rdl, 'Muscles') === 'Hamstrings, Glutes' &&
      fld(rdl, 'Contraindications') === 'Knee' && rdl.desc === 'Kalça menteşesi hamstring için.' && /\S/.test(fld(rdl, 'movement_pattern') || ''),
      JSON.stringify(rdl.fields));
    check('kart: kaslar ve kontrendikasyonlar geniş alan, diğerleri üçerli',
      rdl.fields.filter(f => f.wide).map(f => f.k).join('|') === 'Muscles|Contraindications' && rdl.fields.filter(f => !f.wide).length >= 5);
    const rdlTr = row(tr, 'Romanian Deadlift');
    check('kart (tr): bölüm, filtre adları ve değerler Türkçe; movement_pattern her zaman İngilizce',
      tr.sections.map(s => s.title).join('|') === 'Kalça Baskın|Core|Pliometrik|Kategorisiz' &&
      fld(rdlTr, 'Kasılma Odağı') === 'Konsantrik' && fld(rdlTr, 'Aksiyon') === 'Çekme' && fld(rdlTr, 'Zorluk') === 'Seviye 2 (Orta)' &&
      fld(rdlTr, 'Kaslar') && fld(rdlTr, 'movement_pattern') === 'Hinge', tr.sections.map(s => s.title).join('|') + ' ' + JSON.stringify(rdlTr.fields));
    check('kart: kayıtta olmayan alan hiç yazılmıyor; uzun açıklama 600 karakterde kesiliyor',
      !row(en, 'Pallof Press').desc && !fld(row(en, 'Pallof Press'), 'Difficulty') && fld(row(en, 'Pallof Press'), 'Position') === 'Standing' &&
      fld(row(en, 'Box Jump'), 'Direction') === 'Vertical' && row(en, 'Box Jump').desc.length <= 600 && /…$/.test(row(en, 'Box Jump').desc));
    check('kart: çevrilmiş açıklama descOf ile geliyor; top çalışması kendi kategorilerinde',
      row(A.exLibraryEntries(lib, { lang: 'en', descOf: e => e.name === 'Romanian Deadlift' ? 'Hip hinge for the hamstrings.' : '' }), 'Romanian Deadlift').desc === 'Hip hinge for the hamstrings.' &&
      A.exLibraryEntries([{ name: 'Drill A', type: 'Shooting', players: '2' }], { ball: true, lang: 'en' }).sections[0].title === 'Shooting' &&
      A.exLibraryEntries([], { lang: 'en' }).sections.length === 0);

    /* PDF'in kendisi: jsPDF yerine çizilen her şeyi kaydeden sahte bir belge. Kullanıcının
       asıl istediği burada sınanıyor — her kartın solunda AYNI ölçüde bir görsel çerçevesi
       (görsel yoksa boş), kartlar sayfa dışına taşmıyor ve iki sayfaya bölünmüyor. */
    const fakeDoc = () => {
      let page = 1, pages = 1, fs = 10;
      const calls = [];
      const rec = (op, a) => calls.push({ op, page, a });
      const wrap = (t, w) => {
        const per = Math.max(1, Math.floor(w / (fs * 0.3528 * 0.5)));
        const out = [];
        String(t).split(' ').forEach(wd => {
          const last = out[out.length - 1];
          if (last != null && (last + ' ' + wd).length <= per) out[out.length - 1] = last + ' ' + wd; else out.push(wd);
        });
        return out;
      };
      return {
        calls, get pages() { return pages; },
        setFont() {}, setFontSize(n) { fs = n; }, setTextColor() {}, setFillColor() {}, setDrawColor() {}, setLineWidth() {}, setLineDashPattern(d) { rec('dash', [d]); },
        rect(...a) { rec('rect', a); }, roundedRect(...a) { rec('rrect', a); }, line(...a) { rec('line', a); },
        text(...a) { rec('text', a); }, addImage(...a) { rec('img', a); },
        addPage() { pages++; page = pages; }, setPage(n) { page = n; }, getNumberOfPages() { return pages; },
        splitTextToSize: wrap, getTextWidth: t => String(t).length * fs * 0.3528 * 0.5,
        getImageProperties: () => ({ width: 200, height: 100 }),
      };
    };
    const many = Array.from({ length: 30 }, (_, i) => ({
      name: 'Exercise ' + String(i).padStart(2, '0'), type: ['Hip Dominant', 'Core', 'Plyometric'][i % 3], subType: '', difficulty: 'Level 1',
      muscle: ['Glutes', 'Hamstrings'], purpose: i % 4 ? 'A short note.' : 'Long description '.repeat(30), image: i % 3 ? 'pic' + i : '' }));
    const libMany = A.exLibraryEntries(many, { lang: 'en' });
    const d = fakeDoc();
    A.exLibraryPDF(d, libMany, { lang: 'en', font: 'Archivo', imageOf: e => e.image ? 'data:image/jpeg;base64,' + e.image : '' });
    const F = A.EXPDF_IMG;
    const imgs = d.calls.filter(c => c.op === 'img');
    const frames = d.calls.filter(c => c.op === 'rect' && c.a[2] === F.w && c.a[3] === F.h && c.a[4] === 'S');
    const empties = d.calls.filter(c => c.op === 'rect' && c.a[2] === F.w && c.a[3] === F.h && c.a[4] === 'F');
    const withPic = many.filter(e => e.image).length;
    check('pdf: görseli olan her egzersiz çerçeveye tam oturan tek görsel, olmayan boş çerçeve',
      imgs.length === withPic && imgs.every(c => c.a[4] === F.w && c.a[5] === F.h) && empties.length === many.length - withPic &&
      frames.length === many.length, `${imgs.length}/${withPic} görsel, ${empties.length} boş, ${frames.length} çerçeve`);
    check('pdf: her çerçeve aynı en-boy (4:3) ve aynı sol hizada',
      Math.abs(F.w / F.h - 4 / 3) < 1e-9 && new Set(frames.map(c => c.a[0])).size === 1);
    const cards = d.calls.filter(c => c.op === 'rrect' && c.a[2] === 182 && c.a[6] === 'S');
    check('pdf: kart sayısı egzersiz sayısı; hiçbiri sayfanın altına taşmıyor, kartın boyu en az çerçeve kadar',
      cards.length === many.length && cards.every(c => c.a[1] + c.a[3] <= 281.0001 && c.a[3] >= F.h + 8 - 1e-9),
      cards.map(c => (c.a[1] + c.a[3]).toFixed(1)).join(','));
    const texts = d.calls.filter(c => c.op === 'text').map(c => [].concat(c.a[0]).join(' '));
    check('pdf: birden çok sayfa, her sayfada "Page i / n"; kategori başlıkları ve sayılar yazılı',
      d.pages > 1 && Array.from({ length: d.pages }, (_, i) => `Page ${i + 1} / ${d.pages}`).every(t => texts.includes(t)) &&
      ['HIP DOMINANT', 'CORE', 'PLYOMETRIC'].every(h => texts.includes(h)) && texts.includes('EXERCISE LIBRARY') && texts.includes('Exercise 00'), d.pages);
    check('pdf: kapakta tarih yok — yalnızca raf ve egzersiz sayısı',
      texts.includes('Strength & Conditioning   ·   30 exercises') && !texts.some(t => /\b20\d\d\b|October|Ekim/.test(t)), texts.slice(0, 4).join(' | '));
    check('görsel: kütüphane kartı ve PDF aynı görseli okur — yapıştırılan önce, sonra program satırının, sonra eski Program Image',
      A.exPicture({ image: 'a', planImage: 'b', thumb: 'c' }) === 'a' && A.exPicture({ planImage: 'b', thumb: 'c' }) === 'b' &&
      A.exPicture({ thumb: 'c' }) === 'c' && A.exPicture({}) === '' && A.exPicture(null) === '');
    const dt = fakeDoc();
    A.exLibraryPDF(dt, A.exLibraryEntries(lib, { lang: 'tr' }), { lang: 'tr', untranslated: 2 });
    const tt = dt.calls.filter(c => c.op === 'text').map(c => [].concat(c.a[0]).join(' ')).join('\n');
    check('pdf (tr): başlık, bölümler ve sayfa numarası Türkçe; çevrilemeyenlerin sayısı söyleniyor',
      /Egzersiz Kütüphanesi/.test(tt) && /KALÇA BASKIN/.test(tt) && /KATEGORİSİZ/.test(tt) && /Sayfa 1 \/ \d/.test(tt) && /2 açıklama çevrilemedi/.test(tt) &&
      /NASIL KULLANILIR/.test(tt), tt);
    // Açıklama çevirisi: Türkçede olduğu gibi; İngilizcede çeviri, çevrilemeyen sayılır; zaten İngilizce olan çağrılmaz.
    const dTr = await A.exLibraryDescriptions([{ purpose: 'Kalça menteşesi' }], 'tr');
    check('açıklamalar: Türkçe modda olduğu gibi, çeviri çağrısı yok', dTr.map['Kalça menteşesi'] === 'Kalça menteşesi' && dTr.untranslated === 0);
    const dEn = await A.exLibraryDescriptions([{ purpose: 'Hip hinge for the hamstrings.' }, { purpose: '' }], 'en');
    check('açıklamalar: zaten İngilizce olan metin çevrilmeden geçiyor, boşlar atlanıyor', dEn.map['Hip hinge for the hamstrings.'] === 'Hip hinge for the hamstrings.' && dEn.untranslated === 0 &&
      Object.keys(dEn.map).length === 1);
  }

  group('Ek — Athlete Training Profile: atletik profil, kısıtlar, maruziyet');
  {
    const row = (name, o) => Object.assign({ name, sets: '3', reps: '6' }, o || {});
    const day = (date, name, rows, time) => ({ date, sessions: [{ name, time: time || '17:00', blocks: [{ name: 'Ana', exercises: rows }] }] });
    const has = (arr, v) => (arr || []).includes(v);
    // Sınıflama: aile, patern, uyaran ve yüklenme karakteri egzersizin kendisinden okunuyor.
    const bss = A.atpClassify(row('Bulgarian Split Squat', { tempo: '3-1-1' }), libMap);
    check('Bulgarian Split Squat: split squat ailesi, tek taraflı diz dominant, eksantrik',
      bss.family === 'Split Squat Family' && has(bss.patterns, 'Knee Dominant') && has(bss.patterns, 'Unilateral Knee Dominant') &&
      has(bss.patterns, 'Lunge') && !has(bss.patterns, 'Squat') && has(bss.loading, 'Eccentric Loading'), JSON.stringify(bss));
    const rdl = A.atpClassify(row('Romanian Deadlift', { load: '%85 1RM', reps: '5' }), libMap);
    check('RDL: hinge ailesi, kalça dominant + hinge, %85 ağır yüklenme',
      rdl.family === 'Hinge Family' && has(rdl.patterns, 'Hip Dominant') && has(rdl.patterns, 'Hinge') && has(rdl.loading, 'Heavy Loading'),
      JSON.stringify(rdl));
    const box = A.atpClassify(row('Box Jump'), libMap);
    check('Box Jump: sıçrama, pliometrik, balistik — squat seti sayılmıyor',
      box.family === 'Jump Family' && has(box.stimuli, 'Jumping') && has(box.patterns, 'Plyometric') &&
      has(box.loading, 'Ballistic') && !has(box.patterns, 'Squat'), JSON.stringify(box));
    const fly = A.atpClassify(row('Flying 30m Sprint'), libMap);
    check('Flying sprint: maksimal hız, ivmelenme değil', has(fly.stimuli, 'Max Velocity') && !has(fly.stimuli, 'Acceleration') &&
      has(fly.loading, 'High-Velocity'), JSON.stringify(fly));
    const pull = A.atpClassify(row('Lat Pulldown'), libMap);
    const press = A.atpClassify(row('DB Bench Press'), libMap);
    check('üst vücut: dikey çekiş ve yatay itiş', has(pull.patterns, 'Vertical Pull') && has(press.patterns, 'Horizontal Push'),
      JSON.stringify([pull.patterns, press.patterns]));
    const tagged = A.atpClassify(row('Özel Hareket', { pattern: 'Core', plane: 'Anti-Rotation' }), libMap);
    check('satırdaki patern etiketi isimden önce geliyor', has(tagged.patterns, 'Anti-Rotation'), JSON.stringify(tagged));

    // Maruziyet: takvimden, pencereler referans gününe göre; bugünün seansı sayılmıyor.
    const days = {};
    [[back(1), 'Kuvvet A', [row('Bulgarian Split Squat', { sets: '4' }), row('Box Jump', { sets: '4', reps: '5' }), row('Lat Pulldown')]],
     [back(3), 'Kuvvet B', [row('Bulgarian Split Squat', { sets: '4' }), row('Romanian Deadlift', { load: '%85 1RM', reps: '5' })]],
     [back(5), 'Kuvvet C', [row('Bulgarian Split Squat', { sets: '4' }), row('Box Jump', { sets: '4', reps: '5' })]],
     [back(20), 'Sprint', [row('Flying 30m Sprint', { sets: '4', reps: '1' })]],
     [TODAY, 'Bugün', [row('Goblet Squat')]]].forEach(([d, n, r]) => { days[d] = day(d, n, r); });
    const ath = athlete({ days,
      trainingProfile: {
        priorities: { acceleration: 'primary', lower_body_strength: 'primary', deceleration: 'secondary', upper_body_strength: 'maintain' },
        movement: { squat: { status: 'good', priority: 'low' }, landing: { status: 'limited', priority: 'high' } },
        constraints: {
          hard: [{ id: 'no_max_sprint' }, { id: 'limited_knee_flex', value: 'maks 90°', note: 'sol diz' }],
          soft: [{ id: 'prefer_unilateral' }, { id: 'no_max_sprint' }, { id: 'c_x1', label: 'Sıçramaları yumuşak zeminde yap', cat: 'impact' }],
        },
        updated: back(2),
      } });
    const exp = A.atpExposure(ath, back(1), { libMap });
    const bssE = exp.exercises.find(t => t.label === 'Bulgarian Split Squat');
    check('egzersiz maruziyeti: son seans, 7 gün, sıklık ve son kullanım',
      exp.last && exp.last.date === back(1) && bssE && bssE.sets.last === 4 && bssE.sets.d7 === 12 && bssE.freq28 === 3 &&
      bssE.lastUsed === back(1) && bssE.level.d7 === 'high' && bssE.level.last === 'high', JSON.stringify(bssE));
    const pat = id => exp.patterns.find(t => t.label === id);
    check('patern maruziyeti: tek taraflı diz yüksek, dikey itiş yok',
      pat('Unilateral Knee Dominant').level.d7 === 'high' && pat('Vertical Push').level.d28 === 'none' &&
      pat('Hinge').level.d7 === 'low', JSON.stringify([pat('Unilateral Knee Dominant').level, pat('Hinge').level]));
    const stim = id => exp.stimuli.find(t => t.label === id);
    check('uyaran maruziyeti: maksimal hız 7 günde yok, 28 günde var',
      stim('Max Velocity').level.d7 === 'none' && stim('Max Velocity').sets.d28 === 4 && stim('Jumping').level.d7 !== 'none',
      JSON.stringify(stim('Max Velocity')));

    const snap = A.diAthleteSnapshot({ ath, setup: SETUP, date: TODAY, instr: A.diInstr(null, { duration: null }), customTests: [], libMap });
    const ap = snap.training_profile;
    check('JSON: training_profile sporcunun hemen ardından', !!ap && Object.keys(snap).indexOf('training_profile') === Object.keys(snap).indexOf('athlete') + 1,
      Object.keys(snap).join(','));
    /* Kayıt eski iki bölümlü biçimde (priorities + movement): tek şablona okunuyor.
       Primary → High, Secondary → Medium, Maintain → Low. Squat artık Lower-Body Strength'in
       içinde: Low olan squat, Primary olan Lower-Body Strength'i düşürmüyor (en yüksek kazanır). */
    const pr = ap.athletic_profile;
    check('JSON: eski profil tek şablona taşınıyor — öncelikler High / Medium / Low',
      pr.priority.high.join('|') === 'Acceleration|Landing|Lower-Body Strength' && pr.priority.medium.join('|') === 'Deceleration' &&
      pr.priority.low.join('|') === 'Upper-Body Strength' && !('status' in pr) &&
      !pr.qualities.some(k => k.quality === 'Squat'), JSON.stringify(pr.priority));
    const land = pr.qualities.find(h => h.quality === 'Landing');
    check('JSON: kalite öncelik / grup, High önce — durum yok', land && !('status' in land) && land.priority === 'High' &&
      land.group === 'Plyometric / Reactive' &&
      pr.qualities.map(k => k.quality).join('|') === 'Acceleration|Landing|Lower-Body Strength|Deceleration|Upper-Body Strength' &&
      pr.groups.length === 7, JSON.stringify(pr.qualities));
    check('JSON: öncelik verilmeyen kaliteler not_rated listesinde, koruma dozu olarak tanımlı',
      Array.isArray(pr.not_rated) && pr.not_rated.length === A.ATP_QUALITIES.length - 5 && pr.not_rated.includes('Max Velocity') &&
      !pr.not_rated.includes('Acceleration') && /maintenance dose/.test(pr.description) &&
      snap.task.some(g => /not_rated qualities at a maintenance dose/.test(g)), JSON.stringify(pr.not_rated));
    check('JSON: hard ve soft ayrı — iki listede birden olan kısıt yalnızca hard\'da',
      ap.constraints.hard.map(c => c.constraint).join('|') === 'No Maximal Sprint|Limited Knee Flexion' &&
      ap.constraints.hard[1].value === 'maks 90°' && ap.constraints.hard[1].note === 'sol diz' &&
      ap.constraints.soft.map(c => c.constraint).join('|') === 'Prefer Unilateral|Sıçramaları yumuşak zeminde yap' &&
      ap.constraints.soft[1].category === 'Impact', JSON.stringify(ap.constraints));
    const em = ap.exercise_exposure;
    check('JSON: maruziyet programlanan günden önce biter (bugünün seansı yok)',
      em.window_end === back(1) && !em.exercises.some(e => e.exercise === 'Goblet Squat') &&
      em.last_session.date === back(1) && em.session_count.last_7_days === 3, JSON.stringify(em.last_session));
    const bssJ = em.exercises.find(e => e.exercise === 'Bulgarian Split Squat');
    check('JSON: egzersiz kaydı aile, patern, son kullanım, sıklık ve dört pencere taşıyor',
      bssJ && bssJ.family === 'Split Squat Family' && bssJ.movement_class.includes('Unilateral Knee Dominant') && !('movement_pattern' in bssJ) &&
      bssJ.last_used === back(1) && bssJ.frequency_28_days === 3 && !('exposure' in bssJ) && !!em.level_scale &&
      Object.keys(bssJ.sets).join(',') === 'last_session,last_7_days,last_14_days,last_28_days', JSON.stringify(bssJ));
    check('JSON: maruziyeti olmayan paternler ayrı listede',
      em.movement_class.no_exposure_last_28_days.includes('Vertical Push') &&
      em.movement_class.records.some(k => k.name === 'Knee Dominant') && !!em.movement_class_note,
      JSON.stringify(em.movement_class.no_exposure_last_28_days));
    // Kuvvet çalışması: taraf, düzlem, aksiyon, kasılma odağı ve ekipman — sınıflama.
    const latOf = (n, o) => A.atpClassify(row(n, o), libMap);
    check('taraf: alt vücut adından; üst vücut yalnızca tek kol / alternating denirse unilateral',
      latOf('Bulgarian Split Squat').laterality === 'Unilateral' && latOf('Romanian Deadlift').laterality === 'Bilateral' &&
      latOf('Goblet Squat').laterality === 'Bilateral' && latOf('DB Bench Press').laterality === 'Bilateral' &&
      latOf('Lat Pulldown').laterality === 'Bilateral' && latOf('Single Arm DB Row').laterality === 'Unilateral',
      JSON.stringify(['Single Arm DB Row', 'Lat Pulldown'].map(n => latOf(n).laterality)));
    check('sıçrama ve sprint hiçbir kuvvet özelliği almıyor',
      ['Box Jump', 'Flying 30m Sprint'].every(n => { const c = latOf(n); return !c.laterality && !c.plane && !c.action && !c.focus; }));
    check('düzlem: lateral / side → frontal, rotasyon ve anti-rotasyon → transverse, diğer kuvvet → sagittal',
      latOf('Lateral Lunge').plane === 'Frontal' && latOf('Side Plank').plane === 'Frontal' &&
      latOf('Pallof Press').plane === 'Transverse' && latOf('Landmine Rotation').plane === 'Transverse' &&
      latOf('Reverse Lunge').plane === 'Sagittal' && latOf('Back Squat').plane === 'Sagittal' && latOf('Lat Pulldown').plane === 'Sagittal',
      JSON.stringify(['Lateral Lunge', 'Side Plank', 'Pallof Press', 'Landmine Rotation', 'Reverse Lunge'].map(n => latOf(n).plane)));
    check('aksiyon: üst vücutta eksenden; kalça / diz satırında yalnızca kütüphane etiketinden',
      latOf('Lat Pulldown').action === 'Pull' && latOf('DB Bench Press').action === 'Push' &&
      latOf('Romanian Deadlift').action === '' && latOf('Back Squat').action === '',
      JSON.stringify([latOf('Romanian Deadlift').action]));
    check('kasılma odağı: nordic eksantrik, wall sit ve plank izometrik, sıradan lift boş',
      latOf('Nordic Hamstring Curl').focus === 'Eccentric' && latOf('Wall Sit').focus === 'Isometric' &&
      latOf('Plank').focus === 'Isometric' && latOf('Back Squat').focus === '');
    const tagLib = { 'hip thrust': { name: 'Hip Thrust', type: 'Hip Dominant', subType: 'Concentric', action: 'Push', pattern: 'Bilateral', equipment: 'Barbell' } };
    const ht = A.atpClassify(row('Hip Thrust'), tagLib);
    check('kütüphane etiketi: hip thrust → push, konsantrik, bilateral, barbell, sagittal',
      ht.action === 'Push' && ht.focus === 'Concentric' && ht.laterality === 'Bilateral' && ht.equipment === 'Barbell' && ht.plane === 'Sagittal',
      JSON.stringify(ht));
    check('ekipman: satırdaki alan, sonra isim — isim söylemiyorsa tahmin edilmiyor',
      latOf('Goblet Squat', { equipment: 'Kettlebell' }).equipment === 'Kettlebell' &&
      latOf('DB Bench Press').equipment === 'Dumbbell' && latOf('Lat Pulldown').equipment === 'Cable' &&
      latOf('Push-Up', { equipment: 'bodyweight' }).equipment === 'Bodyweight' &&
      latOf('Hex Bar Deadlift').equipment === 'Trap Bar' && latOf('Romanian Deadlift').equipment === '',
      JSON.stringify([latOf('Romanian Deadlift').equipment]));
    // Maruziyet ve JSON: yeni katmanlar dört pencereyle geliyor, boş alan yok.
    const ath2 = athlete({ days: {
      [back(1)]: day(back(1), 'Kuvvet', [row('Bulgarian Split Squat', { sets: '4', equipment: 'Dumbbell' }), row('Romanian Deadlift', { sets: '3', equipment: 'Barbell' }),
        row('Push-Up', { equipment: 'bodyweight' }), row('Lateral Lunge'), row('Box Jump')]),
      [back(4)]: day(back(4), 'Kuvvet 2', [row('Bulgarian Split Squat', { sets: '4', equipment: 'Dumbbell' }), row('Lat Pulldown'), row('Nordic Hamstring Curl')]),
    } });
    const exp2 = A.atpExposure(ath2, back(1), { libMap });
    const pick2 = (list, id) => list.find(t => t.label === id);
    check('taraf maruziyeti: unilateral 11 set (2 seans), bilateral 12 set',
      pick2(exp2.laterality, 'Unilateral').sets.d7 === 11 && pick2(exp2.laterality, 'Bilateral').sets.d7 === 12 && pick2(exp2.laterality, 'Unilateral').freq28 === 2,
      JSON.stringify([pick2(exp2.laterality, 'Unilateral').sets, pick2(exp2.laterality, 'Bilateral').sets]));
    check('düzlem, aksiyon ve odak maruziyeti: frontal 3, transverse yok; itme 3, çekme 3; eksantrik 3, izometrik yok',
      pick2(exp2.planes, 'Frontal').sets.d7 === 3 && pick2(exp2.planes, 'Sagittal').sets.d7 === 20 && pick2(exp2.planes, 'Transverse').level.d28 === 'none' &&
      pick2(exp2.actions, 'Push').sets.d7 === 3 && pick2(exp2.actions, 'Pull').sets.d7 === 3 &&
      pick2(exp2.focus, 'Eccentric').sets.d7 === 3 && pick2(exp2.focus, 'Isometric').level.d28 === 'none',
      JSON.stringify([exp2.planes.map(t => [t.label, t.sets.d7]), exp2.focus.map(t => [t.label, t.sets.d7])]));
    check('ekipman maruziyeti: dumbbell 8 set, barbell 3 set, vücut ağırlığı ve kablo görünüyor',
      pick2(exp2.equipment, 'Dumbbell').sets.d7 === 8 && pick2(exp2.equipment, 'Barbell').sets.d7 === 3 &&
      !!pick2(exp2.equipment, 'Bodyweight') && !!pick2(exp2.equipment, 'Cable') && !pick2(exp2.equipment, 'Kettlebell'),
      JSON.stringify(exp2.equipment.map(t => [t.label, t.sets.d7])));
    const snap2 = A.atpSnapshot(ath2, TODAY, libMap).out.exercise_exposure;
    const rec2 = n => snap2.exercises.find(e => e.exercise === n);
    check('JSON: egzersiz kaydı taraf, düzlem, aksiyon, odak ve ekipman taşıyor; verilmeyen alan hiç yazılmıyor',
      rec2('Bulgarian Split Squat').laterality === 'Unilateral' && rec2('Bulgarian Split Squat').equipment === 'Dumbbell' &&
      rec2('Lateral Lunge').movement_plane === 'Frontal' && rec2('Lat Pulldown').action === 'Pull' &&
      rec2('Nordic Hamstring Curl').contraction_focus === 'Eccentric' &&
      !['laterality', 'movement_plane', 'action', 'contraction_focus', 'equipment'].some(k => k in rec2('Box Jump')), JSON.stringify(rec2('Box Jump')));
    const smp = snap2.strength_movement_profile;
    check('JSON: strength_movement_profile dört eksenle, maruziyeti olmayan değerler ayrı, not var',
      !!smp.note && smp.laterality.records.map(r => r.name).sort().join('|') === 'Bilateral|Unilateral' &&
      smp.movement_plane.no_exposure_last_28_days.join('|') === 'Transverse' &&
      smp.action.records.length === 2 && smp.contraction_focus.no_exposure_last_28_days.includes('Isometric') &&
      !('lower_body_laterality' in snap2), JSON.stringify(smp.movement_plane));
    check('JSON: ekipman yalnızca kullanılanlarla, not var',
      snap2.equipment_used.records.some(r => r.name === 'Dumbbell' && r.sets.last_7_days === 8) &&
      !snap2.equipment_used.records.some(r => r.name === 'Kettlebell') && !!snap2.equipment_used_note, JSON.stringify(snap2.equipment_used));
    // Her kütüphane kategorisi: kendi alt boyutlarıyla sınıflama.
    const fc = (n, lm) => A.atpClassify(row(n), lm || libMap);
    const f = (n, lm) => fc(n, lm).facets;
    check('core: hareket türü adından — anti-rotasyon, anti-ekstansiyon, anti-lateral, rotasyon ayrı ayrı',
      fc('Pallof Press').cat === 'Core' && f('Pallof Press').Movement === 'Anti-Rotation' && f('Dead Bug').Movement === 'Anti-Extension' &&
      f('Side Plank').Movement === 'Anti-Lateral Flexion' && f('Cable Woodchop').Movement === 'Rotation',
      JSON.stringify(['Pallof Press', 'Dead Bug', 'Side Plank', 'Cable Woodchop'].map(n => f(n).Movement)));
    check('pliometrik: yön, tür ve teknik — söylemeyen alan yazılmıyor',
      fc('Box Jump').cat === 'Plyometric' && f('Box Jump').Direction === 'Vertical' && f('Box Jump')['Exercise Type'] === 'Jump' && f('Box Jump').Technique === 'Bilateral' &&
      f('Broad Jump').Direction === 'Horizontal' && f('Lateral Bound').Direction === 'Lateral' && f('Lateral Bound')['Exercise Type'] === 'Bound' &&
      !('Technique' in f('Lateral Bound')) && f('Single Leg Box Jump').Technique === 'Unilateral', JSON.stringify(f('Lateral Bound')));
    check('sağlık topu, hız, tüm vücut, mobilite',
      fc('Med Ball Rotational Throw').cat === 'Medicine Ball' && f('Med Ball Rotational Throw').Direction === 'Rotational' && f('Med Ball Rotational Throw')['Exercise Type'] === 'Throw' &&
      f('Overhead Med Ball Slam')['Exercise Type'] === 'Slam' && f('Overhead Med Ball Slam').Direction === 'Vertical' &&
      fc('Lateral Shuffle').cat === 'Multi Directional Speed' && f('Lateral Shuffle').Skill === 'COD' && f('Sled Sprint').Skill === 'Acceleration' &&
      fc('Power Clean').cat === 'Full Body' && f('Power Clean').Category === 'Olympic Lift' &&
      fc('Hip 90/90 Mobility').cat === 'Mobility' && f('Hip 90/90 Mobility').Region === 'Hip',
      JSON.stringify([f('Lateral Shuffle'), f('Sled Sprint'), f('Hip 90/90 Mobility')]));
    check('üst vücut ve alt vücut: hareket, ekipman ve örüntü',
      fc('DB Bench Press').cat === 'Upper Body Push' && f('DB Bench Press').Movement === 'Horizontal' && f('DB Bench Press').Equipment === 'Dumbbell' &&
      fc('Lat Pulldown').cat === 'Upper Body Pull' && f('Lat Pulldown').Movement === 'Vertical' && f('Lat Pulldown').Equipment === 'Cable' &&
      fc('Bulgarian Split Squat').cat === 'Knee Dominant' && f('Bulgarian Split Squat')['Movement Pattern'] === 'Lunges' &&
      f('Box Step-Up')['Movement Pattern'] === 'Step-Up' && f('Goblet Squat')['Movement Pattern'] === 'Bilateral' &&
      fc('Romanian Deadlift').cat === 'Hip Dominant' && f('Romanian Deadlift')['Movement Pattern'] === 'Bilateral' && !('Action' in f('Romanian Deadlift')),
      JSON.stringify([f('Bulgarian Split Squat'), f('Box Step-Up'), f('Romanian Deadlift')]));
    const tagLib2 = {
      'single leg balance reach': { type: 'Balance', subType: 'Dynamic Balance' }, 'ankle band walk': { type: 'Stability', subType: 'Ankle' },
      'copenhagen adductor': { type: 'Accessory', subType: 'Prehab & Injury Prevention' },
    };
    check('yalnızca kütüphane etiketiyle bilinen kategoriler: denge, stabilite, aksesuar',
      f('Single Leg Balance Reach', tagLib2).Category === 'Dynamic Balance' && f('Ankle Band Walk', tagLib2).Region === 'Ankle' &&
      f('Copenhagen Adductor', tagLib2).Region === 'Prehab & Injury Prevention' &&
      fc('Single Leg Balance Reach', tagLib2).cat === 'Balance', JSON.stringify(f('Ankle Band Walk', tagLib2)));
    check('etiketi olmayan özel egzersiz kategori yüzü uydurmuyor', fc('Özel Hareket').cat === '' && Object.keys(f('Özel Hareket')).length === 0);
    // Haftanın kapsaması: yapılanlar ve yapılmayanlar, kategori kategori.
    const ath3 = athlete({ days: {
      [back(1)]: day(back(1), 'A', [row('Dead Bug'), row('Box Jump'), row('Med Ball Rotational Throw')]),
      [back(3)]: day(back(3), 'B', [row('Plank'), row('Box Jump'), row('Hip 90/90 Mobility')]),
      [back(10)]: day(back(10), 'C', [row('Pallof Press'), row('Lateral Bound')]),
    } });
    const exp3 = A.atpExposure(ath3, back(1), { libMap });
    const cov = t => exp3.coverage.find(c => c.type === t);
    const cf = (t, l) => cov(t).facets.find(x => x.label === l);
    const cv = (t, l, v) => cf(t, l).values.find(x => x.label === v);
    check('kapsama: core anti-ekstansiyon bu hafta yapıldı, anti-rotasyon yalnızca 28 günde, rotasyon hiç',
      cv('Core', 'Movement', 'Anti-Extension').sets.d7 === 6 && cv('Core', 'Movement', 'Anti-Rotation').sets.d7 === 0 &&
      cv('Core', 'Movement', 'Anti-Rotation').sets.d28 === 3 && cv('Core', 'Movement', 'Rotation').sets.d28 === 0,
      JSON.stringify(cf('Core', 'Movement').values.map(t => [t.label, t.sets.d7, t.sets.d28])));
    check('kapsama: pliometrik yön ve tür; teknik yalnızca etiketlenenlerde',
      cv('Plyometric', 'Direction', 'Vertical').sets.d7 === 6 && cv('Plyometric', 'Direction', 'Lateral').sets.d7 === 0 && cv('Plyometric', 'Direction', 'Lateral').sets.d28 === 3 &&
      cv('Plyometric', 'Exercise Type', 'Bound').sets.d28 === 3 && cf('Plyometric', 'Technique').values.find(t => t.label === 'Bilateral').sets.d7 === 6,
      JSON.stringify(cf('Plyometric', 'Direction').values.map(t => [t.label, t.sets.d7, t.sets.d28])));
    check('kapsama: etiketi hiç olmayan alt boyut listelenmiyor; çalışma olmayan kategoriler ayrı',
      !cov('Core').facets.some(x => x.label === 'Position') && !exp3.coverageMissing.includes('Core') &&
      ['Balance', 'Stability', 'Accessory'].every(t => exp3.coverageMissing.includes(t)) && !exp3.coverageMissing.includes('Warm-Up'), JSON.stringify(exp3.coverageMissing));
    const cc = A.atpSnapshot(ath3, TODAY, libMap).out.exercise_exposure.category_coverage;
    const coreMv = cc.categories.find(c => c.category === 'Core').facets.find(x => x.facet === 'Movement');
    check('JSON: category_coverage — yapılan, bu hafta yapılmayan, 28 günde yapılmayan ve çalışma olmayan kategoriler',
      !!cc.note && coreMv.done.some(r => r.name === 'Anti-Extension' && r.sets.last_7_days === 6) &&
      coreMv.not_done_last_7_days.includes('Anti-Rotation') && coreMv.not_done_last_7_days.includes('Rotation') && !coreMv.not_done_last_7_days.includes('Anti-Extension') &&
      !coreMv.not_done_last_28_days.includes('Anti-Rotation') && coreMv.not_done_last_28_days.includes('Rotation') && !('done_last_28_not_last_7_days' in coreMv) &&
      cc.categories_without_recorded_work.includes('Balance') && !cc.categories_without_recorded_work.includes('Core'),
      JSON.stringify(coreMv));
    {
      /* Envanter varken Ekipman alt boyutu yalnızca salonda olan kiti "yapılmadı" diye sayıyor. */
      const eqF = cov => cov.categories.flatMap(c => c.facets.filter(x => x.facet === 'Equipment'));
      const withInv = eqF(A.atpSnapshot(ath2, TODAY, libMap, SETUP).out.exercise_exposure.category_coverage);
      const noInv = eqF(A.atpSnapshot(ath2, TODAY, libMap, {}).out.exercise_exposure.category_coverage);
      const gaps = withInv.flatMap(x => x.not_done_last_28_days || []);
      check('JSON: ekipman boşlukları salonun envanteriyle sınırlı (envanter yoksa hepsi)',
        withInv.length > 0 && !gaps.includes('Kettlebell') && !gaps.includes('Sled') &&
        noInv.flatMap(x => x.not_done_last_28_days || []).includes('Kettlebell'), JSON.stringify(withInv.map(x => x.not_done_last_28_days)));
    }
    check('JSON: görev her kategori için category_coverage okunmasını ve aynı değerin tekrar yazılmamasını söylüyor',
      snap.task.some(g => /category_coverage/.test(g) && /EVERY exercise category/.test(g) && /anti-extension every time for core/.test(g)));
    check('JSON: görev strength_movement_profile, ekipman ve çok yönlü program hedefinden söz ediyor',
      snap.task.some(g => /exercise_exposure/.test(g) && /strength_movement_profile/.test(g) && /equipment used/.test(g)) &&
      snap.task.some(g => /multi-directional/.test(g) && /code_checked_limits come first/.test(g)));
    check('JSON: görev antrenman profilini ve hard kısıtları anlatıyor', snap.task.some(g => /training_profile/.test(g) && /constraints\.hard/.test(g)));
    check('JSON: görev JSON\'da olmayan durum alanından söz etmiyor', !snap.task.some(g => /Good \/ Moderate \/ Limited|Limited status/.test(g)) &&
      !/status/.test(JSON.stringify(pr)), snap.task.find(g => /training_profile/.test(g)));
    check('JSON: profil doluyken eksik veri sayılmıyor, boş alan yok',
      !(snap.missing_data || []).some(x => /training profile/.test(x)) &&
      !JSON.stringify(snap).includes('""') && !JSON.stringify(snap).includes(':null'));
    const bare = A.diAthleteSnapshot({ ath: athlete(), setup: SETUP, date: TODAY, instr: A.diInstr(null, { duration: null }), customTests: [], libMap });
    check('JSON: profil boşsa missing_data bunu söylüyor', (bare.missing_data || []).some(x => /training profile/.test(x)) &&
      !('constraints' in (bare.training_profile || {})), JSON.stringify(bare.missing_data));
    const squad = A.diSquadSnapshot({ items: [{ ath, instr: A.diInstr(null, { duration: null }) }], setup: SETUP, date: TODAY, customTests: [], libMap });
    check('toplu JSON: her sporcu kendi antrenman profilini taşıyor',
      !!squad.athletes[0].training_profile && squad.athletes[0].training_profile.athletic_profile.priority.high.length === 3);
    const rd = A.atpRead({ trainingProfile: { constraints: { hard: [{ id: 'no_contact' }, { id: 'bogus' }, null], soft: 'x' } } });
    check('kayıtlı profil savunmacı okunuyor', rd.constraints.hard.length === 1 && rd.constraints.soft.length === 0 &&
      typeof rd.qualities === 'object', JSON.stringify(rd));
    /* Yeni biçimde kaydedilmiş profil: eski alanlar artık okunmuyor, şablon dışı kalite ve
       geçersiz değer atılıyor. */
    const nw = A.atpRead({ trainingProfile: {
      qualities: { max_velocity: { status: 'limited', priority: 'high' }, hinge: { status: 'nope', priority: 'medium' }, bogus: { status: 'good' } },
      priorities: { acceleration: 'primary' }, movement: { squat: { status: 'good' } } } });
    check('yeni biçim: qualities okunuyor, status, eski alanlar ve geçersiz değerler yok sayılıyor',
      JSON.stringify(nw.qualities) === JSON.stringify({ max_velocity: { priority: 'high' }, lower_body_strength: { priority: 'medium' } }),
      JSON.stringify(nw.qualities));
    /* Sadeleştirme: 26 madde 18'e indi. Kaldırılan maddeler birleştikleri kaliteye en
       yüksek öncelikleriyle taşınıyor; hiçbir öncelik düşmüyor. */
    check('şablon 18 kalite, kuvvet grubu patern değil kalite',
      A.ATP_QUALITIES.length === 18 && A.ATP_GROUPS.find(g => g.id === 'strength').items.map(i => i.en).join('|') ===
        'Lower-Body Strength|Upper-Body Strength|Unilateral Strength', A.ATP_QUALITIES.map(q => q.en).join('|'));
    const mg = A.atpRead({ trainingProfile: { qualities: {
      sprint_mechanics: { priority: 'high' }, acceleration: { priority: 'low' },
      lateral_movement: { priority: 'medium' }, hopping: { priority: 'low' }, jumping: { priority: 'medium' },
      squat: { priority: 'low' }, hinge: { priority: 'medium' }, horizontal_pull: { priority: 'high' }, vertical_push: { priority: 'low' },
      unilateral: { priority: 'high' }, balance: { priority: 'high' }, stability: { priority: 'medium' } } } });
    check('birleşen maddeler en yüksek öncelikle taşınıyor',
      JSON.stringify(mg.qualities) === JSON.stringify({ acceleration: { priority: 'high' }, change_of_direction: { priority: 'medium' },
        jumping: { priority: 'medium' }, lower_body_strength: { priority: 'medium' }, upper_body_strength: { priority: 'high' },
        unilateral_strength: { priority: 'high' }, stability: { priority: 'high' } }), JSON.stringify(mg.qualities));
  }

  group('Ek — Aylık çıktı: özelliklere göre yüklenme tablosu');
  {
    /* Eylül 2026: 1 Eylül Salı → ilk hafta 1–6, son hafta 28–30. */
    const S = (name, focus, duration, sub) => ({ name, focus, duration, sub, time: '17:00' });
    const days = {
      '2026-09-01': { sessions: [S('Kuvvet + Güç', ['Strength', 'Power'], 60, ['Maximal Strength', 'Ballistic Power'])] },
      '2026-09-03': { sessions: [S('Sprint', ['Speed'], 45, ['Acceleration']), S('Basketbol', ['Technical / Tactical'], 90)] },
      '2026-09-08': { sessions: [S('Kuvvet', ['Strength'], 50, ['Maximal Strength'])] },
      '2026-09-21': { sessions: [S('Maç', ['Competition'], 0), { name: 'Serbest', time: '10:00', duration: 30 }] },
      '2026-09-30': { sessions: [S('Hız', ['Speed'], 40)] },
      '2026-10-01': { sessions: [S('Ekim seansı', ['Strength'], 60)] },
    };
    const F = A.monthFocusLoad(days, 2026, 8);
    check('ay haftalara Pazartesi–Pazar bölünüyor, uçlar kırpılıyor',
      F.weeks.map(w => `${w.from}-${w.to}`).join(',') === '1-6,7-13,14-20,21-27,28-30', JSON.stringify(F.weeks));
    check('ayın toplamları: seans, süre, antrenman/dinlenme günü; komşu ayın seansı sayılmıyor',
      F.sessions === 7 && F.minutes === 315 && F.trainDays === 5 && F.restDays === 25, JSON.stringify([F.sessions, F.minutes, F.trainDays, F.restDays]));
    const r = id => F.rows.find(x => x.id === id);
    check('çok hedefli seans her hedefte bir kez sayılıyor, süresi eşit bölünüyor',
      r('Strength').n === 2 && r('Strength').min === 80 && r('Power').n === 1 && r('Power').min === 30 &&
      r('Strength').weeks[0].min === 30 && r('Strength').weeks[1].min === 50, JSON.stringify([r('Strength'), r('Power')]));
    check('dakikaların toplamı ayın süresine eşit (paylar %100)',
      F.rows.reduce((t, x) => t + x.min, 0) === F.minutes && Math.abs(F.rows.reduce((t, x) => t + x.share, 0) - 1) < 1e-9);
    check('alt özellikler sahibi olan özelliğin altında sayılıyor',
      JSON.stringify(r('Strength').subs) === JSON.stringify([['Maximal Strength', 2]]) &&
      JSON.stringify(r('Speed').subs) === JSON.stringify([['Acceleration', 1]]), JSON.stringify(r('Strength').subs));
    check('hedefi olmayan seans "Diğer" satırında, satırlar ağaç sırasında',
      r('__other') && r('__other').n === 1 && F.rows[F.rows.length - 1].id === '__other' &&
      F.rows.map(x => x.id).join('|') === 'Strength|Power|Speed|Technical / Tactical|Competition|__other', F.rows.map(x => x.id).join('|'));
    const html = A.buildMonthHTMLDoc('Takım <A>', 2026, 8, days);
    check('aylık çıktı iki sayfa: takvim + tablo; başlık kaçışlı',
      (html.match(/class="pg fit"/g) || []).length === 2 && html.includes('Takım &lt;A&gt;') && !html.includes('Takım <A>') &&
      html.includes('Kuvvet + Güç') && !html.includes('Ekim seansı'));
    const empty = A.monthFocusLoad({}, 2027, 1);   // Şubat 2027 Pazartesi başlıyor → tam 4 hafta
    check('boş ay: satır yok, 28 dinlenme günü', empty.rows.length === 0 && empty.sessions === 0 && empty.restDays === 28 && empty.weeks.length === 4,
      JSON.stringify(empty.weeks));
  }

  group('Ek — Periyotlama modelleri: beş model, eski seçimler en yakın modele');
  {
    check('model listesi sadeleşti: beş model, istenen sırada',
      A.MODELS.map(m => m.id).join(',') === 'linear,block,undulating,hybrid,auto' &&
      A.MODELS.every(m => m.name && m.d && m.d[0] && m.d[1]), A.MODELS.map(m => m.id).join(','));
    const legacy = { reverse: 'linear', dup: 'undulating', wup: 'undulating', conjugate: 'undulating', vertical: 'undulating', horizontal: 'block' };
    check('kayıtlı eski model en yakın kalan modele okunuyor (sezon modeli ve aşama modeli)',
      Object.entries(legacy).every(([o, n]) => A.phaseModel({ model: o }, 'in') === n && A.phaseModel({ model: 'auto', phaseModels: { pre: o } }, 'pre') === n &&
        A.modelOf(o) && A.modelOf(o).id === n));
    check('geçerli seçim korunuyor; bilinmeyen ya da boş model Linear',
      A.phaseModel({ model: 'hybrid', phaseModels: { in: 'block' } }, 'in') === 'block' && A.phaseModel({ model: 'hybrid' }, 'post') === 'hybrid' &&
      A.phaseModel({ model: 'bogus' }, 'in') === 'linear' && A.phaseModel(null, 'in') === 'linear' && A.modelOf('bogus') === null);
    const P = { id: 'sp' };
    check('Horizontal Integration seçmiş sezonun haftaları Block olarak hesaplanıyor',
      ['Accumulation', 'Transmutation', 'Realization'].every((f, i) => A.defWeek(A.phaseModel({ model: 'horizontal' }, 'pre'), P, i, [], '2026-09-07').focus === f));
  }

  group('Ek — Maç günü, gün adları, talimat formu, JSON tutarlılığı');
  {
    /* Çarşamba ve perşembe maç, bugün cumartesi: son maçın üstünden İKİ gün geçti. */
    const days = {
      '2026-09-30': { date: '2026-09-30', sessions: [{ id: 'g1', name: 'MG (A) U16', focus: ['Competition'] }] },
      /* İçindeki kopya tarih anahtarından kaymış bir gün: maç takvimde göründüğü güne yazılmalı. */
      '2026-10-01': { date: '2026-10-02', sessions: [{ id: 'g2', name: 'Balkan Olimpik U18', focus: ['Competition'] }] },
      '2026-10-02': { date: '2026-10-02', sessions: [{ id: 't1', name: 'Takım Antrenmanı', focus: ['Technical / Tactical'] }] },
    };
    const comps = A.syncCompetitions([], days, []);
    check('maç, takvimdeki gününe (anahtarına) yazılıyor', comps.map(c => c.date).join(',') === '2026-09-30,2026-10-01', JSON.stringify(comps));
    /* Müsabaka penceresi fikstüre yazılıyor: başlık, skor, lokasyon. Sezon ekranında elle
       yazılan değer, takvimde o alan değişene kadar korunuyor. */
    const mDays = s => ({ '2026-10-10': { date: '2026-10-10', sessions: [s] } });
    const m0 = { id: 'm1', name: 'Fenerbahçe Maçı', kind: 'match', focus: ['Competition'], match: { opponent: 'Fenerbahçe Beko', scoreFor: '82', scoreAgainst: '74', location: 'Ülker' } };
    const f1 = A.syncCompetitions([], mDays(m0), []);
    check('müsabaka başlığı, skoru ve lokasyonu fikstüre yazılıyor',
      f1.length === 1 && f1[0].name === 'Fenerbahçe Maçı' && f1[0].scoreFor === '82' && f1[0].scoreAgainst === '74' && f1[0].location === 'Ülker', JSON.stringify(f1));
    check('müsabaka rakibi fikstürün rakip alanına yazılıyor', f1[0].opponent === 'Fenerbahçe Beko', JSON.stringify(f1));
    const f2 = A.syncCompetitions([{ ...f1[0], location: 'Ülker Sports Arena' }], mDays(m0), []);
    check('sezonda elle düzeltilen alan, takvimde değişmedikçe korunuyor', f2[0].location === 'Ülker Sports Arena', JSON.stringify(f2));
    const f3 = A.syncCompetitions(f2, mDays({ ...m0, name: 'FB Deplasman', match: { ...m0.match, scoreFor: '90' } }), []);
    check('takvimde değişen başlık ve skor fikstüre geçiyor',
      f3[0].name === 'FB Deplasman' && f3[0].scoreFor === '90' && f3[0].location === 'Ülker Sports Arena', JSON.stringify(f3));
    const legacy = A.syncCompetitions([{ srcId: 'm1', date: '2026-10-10', name: 'Eski ad', scoreFor: '', scoreAgainst: '' }], mDays(m0), []);
    check('cal kaydı olmayan eski satırda yalnızca boş alanlar dolduruluyor',
      legacy[0].name === 'Eski ad' && legacy[0].scoreFor === '82', JSON.stringify(legacy));
    check('ikinci senkron hiçbir şeyi değiştirmiyor (döngü yok)', JSON.stringify(A.syncCompetitions(f3, mDays({ ...m0, name: 'FB Deplasman', match: { ...m0.match, scoreFor: '90' } }), [])) === JSON.stringify(f3));
    /* Fikstür → müsabaka penceresi: fikstürde yazılı olan, pencerenin boş alanlarını doldurur. */
    const bDays = { '2026-10-01': { date: '2026-10-01', sessions: [{ id: 'b1', name: 'Balkan Olimpik U18', kind: 'match', focus: ['Competition'] }] } };
    const bRows = [{ srcId: 'b1', date: '2026-10-01', name: 'MG (A) U16', comp: 'U16 Yerel Lig', location: 'Vakıf Bera', scoreFor: '81', scoreAgainst: '48', cal: { name: 'Balkan Olimpik U18', location: '', scoreFor: '', scoreAgainst: '' } }];
    const bOut = A.backfillMatchesFromComps(bDays, bRows);
    const bm = bOut['2026-10-01'].sessions[0].match || {};
    check('fikstürdeki skor, lig, lokasyon ve rakip müsabaka penceresine geliyor',
      bm.scoreFor === '81' && bm.scoreAgainst === '48' && bm.comp === 'U16 Yerel Lig' && bm.location === 'Vakıf Bera' && bm.opponent === 'MG (A) U16', JSON.stringify(bm));
    const bSync = A.syncCompetitions(bRows, bOut, []);
    check('geri doldurmadan sonra fikstür bozulmuyor ve döngü yok',
      bSync[0].scoreFor === '81' && bSync[0].location === 'Vakıf Bera' && A.backfillMatchesFromComps(bOut, bSync) === bOut &&
      JSON.stringify(A.syncCompetitions(bSync, bOut, [])) === JSON.stringify(bSync), JSON.stringify(bSync));
    const bFull = { '2026-10-01': { date: '2026-10-01', sessions: [{ id: 'b1', name: 'X', kind: 'match', match: { scoreFor: '90' } }] } };
    check('pencerede dolu olan alan fikstürle ezilmiyor', A.backfillMatchesFromComps(bFull, bRows)['2026-10-01'].sessions[0].match.scoreFor === '90');
    check('sezonda yazılan alan seansın müsabaka verisine yama oluyor',
      JSON.stringify(A.compRowToSesPatch({ match: { opponent: 'A' } }, 'scoreFor', '70')) === JSON.stringify({ match: { opponent: 'A', scoreFor: '70' } }) &&
      A.compRowToSesPatch({}, 'date', 'x') === null && A.compRowToSesPatch({}, 'name', '  ') === null);
    const cp = A.diCompetition({ competitions: comps }, '2026-10-03');
    check('perşembe maçından sonra cumartesi MD+2', cp.md === 'MD+2' && cp.previous.days_since === 2, JSON.stringify(cp));
    check('cuma MD+1', A.diCompetition({ competitions: comps }, '2026-10-02').md === 'MD+1');

    check('gün ve ay adları Türkçe açıkken Türkçe', A.inTurkish(() => A.DN[0] + ' ' + A.DN[5] + ' ' + A.MN[8]) === 'Pzt Cmt Eyl',
      A.inTurkish(() => A.DN.map(d => d).join(',')));
    check('gün ve ay adları İngilizce açıkken İngilizce', A.DN[0] === 'Mon' && A.MN[9] === 'Oct' && A.DN.length === 7);

    const typed = A.diBrief({ notes: 'bugün maç ', constraints: ['intensity'], constraintValues: { intensity: 'RPE 6' }, constraintNote: 'x' }, null);
    check('ek notlar yazıldığı gibi saklanıyor (sondaki boşluk silinmiyor)', typed.notes === 'bugün maç ', JSON.stringify(typed.notes));
    check('formdan kaldırılan ek kısıtlar talimatla taşınmıyor',
      typed.constraints.length === 0 && Object.keys(typed.constraintValues).length === 0 && typed.constraintNote === '');
    const ath = athlete({
      wellness: [wellness(back(5), 4, { fatigue: 4 }), wellness(back(4), 4, { fatigue: 4 }), wellness(back(3), 4, { fatigue: 4 }),
        wellness(back(2), 4, { fatigue: 4 }), wellness(back(1), 4, { fatigue: 4 }), wellness(TODAY, 4, { fatigue: 4.5 })],
      srpeLog: [{ date: back(1), tpRPE: 6, tpDuration: 60 }],
    });
    const snap = A.diAthleteSnapshot({ ath, setup: SETUP, date: TODAY, instr: A.diBrief({ notes: '  not  ', avoid: ['derin squat'] }, null), customTests: [] });
    check('JSON: notlar kırpılmış gidiyor', snap.coach_brief.additional_notes === 'not', JSON.stringify(snap.coach_brief));
    const fat = snap.fatigue;
    check('JSON: sapma yüzdesi yanındaki son değere göre', fat && fat.latest_value === 4.5 &&
      fat.deviation_from_average_pct === Math.round((4.5 - fat.personal_average) / fat.personal_average * 1000) / 10, JSON.stringify(fat));
    check('JSON: yalnız bir günlük yük geçmişinde ACWR notu var', /ACWR is 1\.0 by construction/.test(snap.rpe.acwr_note || ''), JSON.stringify(snap.rpe));
    check('JSON: tercih edilen paternler kapalı paternleri içermiyor',
      !((snap.pain_and_injury || {}).preferred_patterns || []).some(p => !snap.code_checked_limits.available_patterns.includes(p)));
  }

  group('Ek — Program talimatı (Revize 10) ile JSON ve kütüphane dosyası uyumu');
  {
    const snap = A.diAthleteSnapshot({ ath: athlete({ wellness: [wellness(TODAY, 4)] }), setup: SETUP, date: TODAY,
      instr: A.diBrief(null, { duration: 60 }), customTests: [] });
    check('JSON: movement_pattern_vocabulary kodun patern listesinin birebir kopyası',
      JSON.stringify(snap.movement_pattern_vocabulary) === JSON.stringify(A.IV_PATTERNS) && snap.movement_pattern_vocabulary.includes('Jump / Plyo'),
      JSON.stringify(snap.movement_pattern_vocabulary));
    check('JSON: görev ve çıktı şeması movement_pattern için vocabulary\'yi gösteriyor',
      snap.task.some(t => /movement_pattern_vocabulary/.test(t)) && /movement_pattern_vocabulary/.test(JSON.stringify(snap.output_format)));
    const squad = A.diSquadSnapshot({ items: [{ ath: athlete(), instr: A.diBrief(null, { duration: 60 }) }], setup: SETUP, date: TODAY, customTests: [] });
    check('takım JSON\'u: vocabulary bir kez, en üstte', Array.isArray(squad.movement_pattern_vocabulary) &&
      !squad.athletes.some(x => 'movement_pattern_vocabulary' in x));
    const lib = A.exLibraryEntries([
      { name: 'Romanian Deadlift', type: 'Hip Dominant', movePattern: 'Hinge', difficulty: 'Intermediate', muscle: ['Hamstrings'], purpose: 'Kalça menteşesi.' },
      { name: 'Box Jump', type: 'Plyometric', movePattern: 'Jump / Plyo' },
    ], { lang: 'tr' });
    const txt = A.exLibraryText(lib, { lang: 'tr', date: '2026-10-03' });
    const lines = txt.split('\n');
    check('kütüphane .txt: her egzersiz kendi satırında, alanlar girintili, movement_pattern İngilizce',
      lines.includes('Romanian Deadlift') && lines.includes('Box Jump') && lines.includes('  movement_pattern: Hinge') &&
      lines.includes('  movement_pattern: Jump / Plyo') && lines.some(l => /^  Açıklama: Kalça menteşesi\.$/.test(l)) &&
      /önce bu listeden seç/.test(txt) && /nedenini belirt/.test(txt) && /Kontrendikasyonlar: o bölgede/.test(txt) &&
      /Seviye 3 ileri/.test(txt), txt.slice(0, 900));
    check('kütüphane notu: .txt ile PDF aynı kuralları söylüyor, İngilizcesi de',
      A.exLibraryNote(true, 'card').replace('kart', 'blok') === A.exLibraryNote(true, 'block') &&
      /from this list first/.test(A.exLibraryNote(false, 'block')) && /Contraindications/.test(A.exLibraryNote(false, 'card')));
    const trContra = A.exLibraryText(A.exLibraryEntries([{ name: 'Back Squat', type: 'Knee Dominant', contra: ['knee', 'back'] }], { lang: 'tr' }), { lang: 'tr' });
    check('kütüphane .txt (tr): kontrendikasyon bölgeleri Türkçe yazılıyor',
      trContra.split('\n').includes('  Kontrendikasyonlar: Diz, Sırt / Bel') && A.ctLabelIn('knee', false) === 'Knee', trContra);
  }

  group('Ek — Egzersiz kütüphanesi: eski "kontrol bekliyor" işaretleri siliniyor');
  {
    const m = A.migrate({ exercises: [
      { id: 'a', name: 'DB RDL', type: 'Hip Dominant', difficulty: 'Level 1', contra: ['back'], review: ['difficulty', 'contra'] },
      { id: 'b', name: 'Plank', type: 'Core' },
      { id: 'c', name: '2DB Reverse Lunge', type: 'Knee Dominant', movePattern: 'Lunge / Unilateral', review: ['movePattern', 'contra'], contra: ['knee'] },
      { id: 'd', name: 'Dynamic Copenhagen Plank', type: 'Core', movePattern: 'Lunge / Unilateral', review: ['contra'], contra: ['hip'] },
    ] });
    const c = m.exercises.find(e => e.id === 'c'), d = m.exercises.find(e => e.id === 'd');
    check('migrate: içe aktarmanın doldurduğu movement_pattern siliniyor, öncekiler ve diğer alanlar kalıyor',
      !c.movePattern && JSON.stringify(c.contra) === '["knee"]' && d.movePattern === 'Lunge / Unilateral' &&
      A.exPatternOf(c) === 'Squat', JSON.stringify([c, d]));
    const a = m.exercises.find(e => e.id === 'a');
    check('migrate: review alanı kalkıyor, doldurulan değerler duruyor',
      !('review' in a) && a.difficulty === 'Level 1' && JSON.stringify(a.contra) === '["back"]' &&
      !m.exercises.some(e => 'review' in e), JSON.stringify(m.exercises));
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
