/* ═══════════════════════════════════════════════════════════════════════════
   SENKRON ÖRNEK VERİSİ — gerçekçi, tohumlu, belirlenimci (senkron hız planı R0)

   makeFixture(boyut, tohum) → data (uygulamanın bellekteki biçimi, activeTeamId dahil)
     'small' : 1 takım, 12 sporcu, 4 haftalık takvim (CI'da hızlı)
     'large' : 2 takım (25 + 15 sporcu), 300 günlük aktif sezon + park edilmiş eski sezon,
               ~10 aylık wellness / sRPE / gece verisi, 350 egzersizlik kütüphane (~6 MB, ~4.900 belge)

   Aynı boyut + tohum her makinede birebir aynı veriyi verir (Math.random yok). Yapı, eşlemenin
   (468-store-map.jsx) ayırdığı her yolu kapsar: park edilmiş sezon (seasonData), takım seansının
   sporcu takvimindeki kopyası (sourceId), kimliksiz eski wellness kayıtları, belge içi anahtarlı
   listeler (kadro, sezonlar, müsabakalar, lokasyonlar), kütüphane koleksiyonları, kök ayarlar.
   Kullananlar: tools/sync-bench.js, store-map-equiv-test.js.
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';

function prng(seed) {   // mulberry32
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const day = (base, n) => new Date(Date.UTC(2026, 0, 5) + (base + n) * 864e5).toISOString().slice(0, 10);

const SIZES = {
  small: { teams: [12], days: 28, logDays: 28, exercises: 40, oldSeasonDays: 7, tests: 3 },
  large: { teams: [25, 15], days: 300, logDays: 300, exercises: 350, oldSeasonDays: 60, tests: 8 },
};

function makeFixture(size = 'small', seed = 1) {
  const S = SIZES[size];
  if (!S) throw new Error('bilinmeyen boyut: ' + size);
  const r = prng(seed);
  const pick = arr => arr[Math.floor(r() * arr.length)];
  const int = (a, b) => a + Math.floor(r() * (b - a + 1));
  const EX = ['Back Squat', 'RDL', 'Bench Press', 'Pull Up', 'Nordic Curl', 'Hip Thrust', 'Split Squat', 'Box Jump', 'Med Ball Throw', 'Copenhagen'];
  const exercises = Array.from({ length: S.exercises }, (_, i) => ({
    id: 'e' + i, name: EX[i % EX.length] + ' ' + i, type: pick(['Knee Dominant', 'Hip Dominant', 'Upper Body Push', 'Upper Body Pull', 'Core']),
    subType: '', pattern: '', difficulty: pick(['Level 1', 'Level 2', 'Level 3']), muscle: [pick(['quads', 'glutes', 'hamstrings', 'lats'])],
    contra: r() < 0.1 ? ['knee'] : [], videoUrl: r() < 0.5 ? 'https://example.com/v/' + i : '', videoData: '', thumb: '',
    purpose: 'Kuvvet ve güç gelişimi için temel hareket. '.repeat(int(1, 3)),
  }));
  const ses = (id, nAth, extra) => Object.assign({
    id, name: pick(['Kuvvet', 'Güç', 'Basketbol', 'Toparlanma']), time: pick(['09:30', '10:00', '17:00']), duration: pick([45, 60, 75, 90]),
    purpose: pick(['Strength', 'Power', 'Ball Practice']), focus: ['Strength'], sRPE: int(3, 8), au: '', athletes: Array.from({ length: nAth }, (_, k) => 'a' + k),
    sourceId: null, notes: r() < 0.3 ? 'Tempo kontrollü, dinlenme tam.' : '', location: pick(['Ana salon', 'Ağırlık odası']),
    blocks: [0, 1, 2].map(b => ({ id: id + '_b' + b, name: ['Isınma', 'Ana', 'Soğuma'][b], exercises: Array.from({ length: int(3, 6) }, () => ({
      name: pick(EX), sets: String(int(2, 5)), reps: String(int(3, 10)), load: String(int(20, 140)), description: r() < 0.4 ? 'tempo 3-1-1' : '', superset: '', image: '', link: '' })) })),
  }, extra || {});
  const teams = S.teams.map((nAth, ti) => {
    const T = 'T' + ti, sid = 'S' + ti + '_2026', oldSid = 'S' + ti + '_2025';
    const days = {};
    for (let o = 0; o < S.days; o++) {
      const k = day(0, o);
      const sessions = o % 7 === 6 ? [] : [ses(T + 's' + o, nAth)].concat(r() < 0.15 ? [ses(T + 'p' + o, Math.min(nAth, 8), { time: '17:00' })] : []);
      days[k] = { date: k, dailyNotes: r() < 0.05 ? 'Maç haftası' : '', sessions };
    }
    const oldDays = {};
    for (let o = 0; o < S.oldSeasonDays; o++) { const k = day(-400, o); oldDays[k] = { date: k, dailyNotes: '', sessions: [ses(T + 'old' + o, nAth)] }; }
    const athletes = Array.from({ length: nAth }, (_, k) => {
      const aDays = {};
      Object.keys(days).filter((_, i) => i % 9 === 0).forEach(dk => {
        const src = days[dk].sessions[0];
        if (src) aDays[dk] = { date: dk, dailyNotes: '', sessions: [Object.assign(JSON.parse(JSON.stringify(src)), { id: 'as' + T + k + dk, sourceId: src.id })] };
      });
      return {
        id: 'a' + k, name: 'Sporcu ' + ti + '-' + k + ' Ğüşiöç', number: String(k + 1), position: pick(['PG', 'SG', 'SF', 'PF', 'C']),
        dateOfBirth: '2008-0' + int(1, 9) + '-1' + int(0, 9), sex: 'M', photo: '', levelTag: '', phone: '', phoneCode: '+90',
        trainingProfile: { goal: pick(['güç', 'hız', 'dayanıklılık']) }, phaseBank: { prep: { rows: [['Squat', 3], ['RDL', 2]] } },
        tests: Array.from({ length: S.tests }, (_, i) => ({ id: 't' + T + k + '_' + i, date: day(0, i * 30), cmj: int(30, 60), height: 190 + int(-15, 15), weight: 80 + int(-10, 15), ohs: { score: int(1, 3), problems: ['', '', '', '', ''] }, circ: { thighRight: 55, thighLeft: 55 } })),
        measurements: [], injuries: r() < 0.2 ? [{ id: 'i' + T + k, location: 'diz', status: 'Active', date: day(0, int(0, S.days - 1)) }] : [],
        wellness: Array.from({ length: S.logDays }, (_, i) => i % 3 === 0
          ? { date: day(0, i), sleep: int(1, 5), fatigue: int(1, 5), soreness: int(1, 5) }                                   // kimliksiz eski kayıt
          : { id: 'w' + T + k + '_' + i, date: day(0, i), sleep: int(1, 5), fatigue: int(1, 5), soreness: int(1, 5), stress: int(1, 5), mood: int(1, 5) }),
        srpeLog: Array.from({ length: S.logDays }, (_, i) => ({ id: 'r' + T + k + '_' + i, date: day(0, i), scRPE: int(3, 9), scDuration: pick([45, 60, 90]), totalLoad: 0 })),
        nightLog: Array.from({ length: Math.floor(S.logDays * 0.7) }, (_, i) => ({ id: 'n' + T + k + '_' + i, date: day(0, i), hr: int(45, 62), hrv: int(50, 120) })),
        deletedSrpeSrcIds: [], days: aDays,
      };
    });
    return {
      id: T, setup: { teamName: 'Takım ' + ti, sport: 'Basketball', seasonStart: day(0, 0), seasonEnd: day(0, S.days), model: 'block', periods: null,
        competitions: [0, 1, 2].map(i => ({ id: 'c' + T + i, date: day(0, 40 + i * 30), name: 'Maç ' + i })), locations: ['Ana salon', 'Ağırlık odası'] },
      days, weekOverrides: {}, staff: [{ id: 'st' + T, role: 'coach', name: 'Antrenör ' + ti, phone: '', phoneCode: '+90', photo: null }],
      seasons: [{ id: oldSid, name: '2025' }, { id: sid, name: '2026' }], activeSeasonId: sid,
      seasonData: { [oldSid]: { setup: { teamName: 'Takım ' + ti, seasonStart: day(-400, 0), seasonEnd: day(-400, S.oldSeasonDays), model: 'block', periods: null, competitions: [] }, weekOverrides: {}, days: oldDays } },
      athletes, tallySync: { workerUrl: '', autoSync: false, intervalMin: 5, lastSyncedAt: null, lastStats: null }, tplIndivAutoCleanup: true,
    };
  });
  return {
    activeTeamId: 'T0', teams, exercises,
    templates: [{ id: 'tpl1', name: 'Kuvvet A', session: ses('tplS', 0) }], customTests: [], tryouts: [], tryoutTests: [], testTemplates: [],
    researches: [{ id: 'res1', title: 'Makale', url: 'https://example.com', doi: '', authors: [], authorsText: '', year: '2024', date: '', journal: '', apa: '', summary: '', tags: '', addedAt: 1 }],
    savedResearch: [], interval: { work: 30, rest: 15, saved: [{ id: 'iv1', name: 'Tabata', work: 20, rest: 10 }] }, customMuscles: [],
  };
}

module.exports = { makeFixture, prng, SIZES };
