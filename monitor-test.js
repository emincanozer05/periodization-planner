/* ═══════════════════════════════════════════════════════════════════════════
   SPORCU İZLEME SINAMASI — CoachOS revizyon talimatı v1.4, §12 "Testler ve doğrulama"

   index.html'deki betiğin kendisi (tools/load-app.js) yüklenir; sınanan kod koçun
   ekranındaki koddur. Her test yapılandırmayı AÇIKÇA enjekte eder (cfg) ve beklenen
   değerler elle hesaplanmış örneklerdir — çoğu talimatın kendi fikstürleri.

   Çalıştırma:  node monitor-test.js
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const babel = require('@babel/standalone');
const { loadApp } = require('./tools/load-app.js');

const A = loadApp(['MON_CFG', 'MON_CFG_DOC', 'MON_IND', 'monBuild', 'monDN', 'monKey', 'monStream', 'monRefDaily', 'monRefWin', 'monWin',
  'monZ', 'monEval', 'monStatus', 'monRaw', 'monOls', 'monNeffDaily', 'monSdRelSE', 'monTrendFromS', 'monTrendAt', 'monEwmaStandard',
  'monEwmaAdjusted', 'monEwmaPoints', 'monAcwrCombine', 'monTransitions', 'monEwmaChange', 'monLoadModel', 'monLam', 'monSeed',
  'monPainStatus', 'monPainAt', 'monPainOf', 'monSummary', 'monWeekly', 'monAdequacyReport', 'monGrowth', 'monInjuries',
  'weekMono', 'MON_NOTE_B', 'MonPanelB', 'PAIN_SEV_LABEL', 'setLang']);
A.setLang('tr');

let pass = 0, fail = 0;
function check(name, ok, detail) {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? 'GEÇTİ' : 'KALDI'}  ${name}${!ok && detail ? '\n          ' + detail : ''}`);
}
function group(t) { console.log('\n── ' + t); }
const near = (a, b, e) => a != null && b != null && Math.abs(a - b) <= (e == null ? 1e-9 : e);
const C = over => Object.assign({}, A.MON_CFG, over || {});
const B0 = A.monDN('2026-01-01');
const K = i => A.monKey(B0 + i);
const throws = f => { try { f(); return false; } catch (e) { return true; } };
/* Doğrudan bir veri akışı: vals[i] = sayı (kayıtlı), null (bilinmiyor), 'G' (geçersiz). */
function stream(vals, extra) {
  const s = A.monStream(0, vals.length - 1);
  vals.forEach((v, i) => { if (v === 'G') s.set(i, { st: 'gecersiz', v: null }); else if (v != null) s.set(i, { st: 'kayitli', v, ...(extra ? extra(i) : {}) }); });
  return s;
}
let seed = 20260105;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const loadAth = (days, valueOf, extra) => {
  const srpeLog = [];
  for (let i = 0; i < days; i++) { const v = valueOf(i); if (v != null) srpeLog.push({ id: 'r' + i, date: K(i), totalLoad: v }); }
  return { id: 'x', name: 'X', srpeLog, wellness: [], nightLog: [], days: {}, injuries: [], ...(extra || {}) };
};
/* Bilinmeyen gün: takvimde AU'su olmayan bir seans (kullanıcı onaylı kural: seans var, yük yok). */
const unknownDay = i => ({ [K(i)]: { sessions: [{ id: 'u' + i, duration: '60' }] } });

/* ═══ 1 · EWMA ═══ */
group('1 · EWMA — standart / uyarlanmış ayrımı');
{
  const k = A.monEwmaAdjusted([100, null, 200], 0.25);
  check('Ağırlık çekirdeği: λ 0,25, bugün 200, dün bilinmiyor, önceki gün 100 → 164,0 (sessiz atlama 157,14 verirdi)', near(k[2].v, 164, 1e-9) && !near(k[2].v, 157.14, 0.01), String(k[2].v));
  const cfg = C();
  const rest = loadAth(40, i => (i % 2 ? 100 : 0));                     // 0 yazılı yük = bilinen dinlenme (sRPE 0)
  const Mr = A.monBuild(rest, { cfg, today: K(39) });
  check('Doğrulanmış dinlenme günü 0 olarak giriyor (bilinen gün)', Mr.S.load.get(B0 + 2 - B0 + Mr.n0).v === 0 || A.monEval(Mr, 'load', 'gunluk', A.monDN(K(2))).deger.v === 0);
  const unk = loadAth(40, i => (i === 20 ? null : 100), { days: unknownDay(20) });
  const Mu = A.monBuild(unk, { cfg, today: K(39) });
  const d20 = Mu.S.load.get(A.monDN(K(20)));
  const Lu = A.monLoadModel(Mu), p20 = Lu.points[20];
  check('Bilinmeyen gün sıfır sayılmıyor: durum bilinmiyor, eksik payına giriyor', d20.st === 'bilinmiyor' && p20.akut.eksik_payi > 0 && near(p20.akut.uyarlanmis, 100));
  const P = A.monEwmaPoints(Array(40).fill(100), A.monLam(7), 0, cfg), Q = A.monEwmaPoints(Array(40).fill(100), A.monLam(28), 0, cfg);
  check('EWMA_U_MAX 0,10, eksik gün yok: akut ilk geçerli 9. gün (8. Hesaplanamıyor)', P.findIndex(x => x.gecerli) === 8 && !P[7].gecerli && P[7].neden === 'GOZLENMEMIS_AGIRLIK_YUKSEK');
  check('Kronik ilk geçerli 33. gün (32. Hesaplanamıyor)', Q.findIndex(x => x.gecerli) === 32 && !Q[31].gecerli);
  const todayUnk = loadAth(60, i => (i === 59 ? null : 100), { days: unknownDay(59) });
  const Lt = A.monLoadModel(A.monBuild(todayUnk, { cfg, today: K(59) })), pt = Lt.points[59];
  check('Bugün bilinmiyorsa akut geçersiz → ACWR Hesaplanamıyor', !pt.akut.gecerli && !pt.acwr.gecerli);
  const tenAgo = loadAth(60, i => (i === 49 ? null : 100), { days: unknownDay(49) });
  const L10 = A.monLoadModel(A.monBuild(tenAgo, { cfg, today: K(59) })), p10 = L10.points[59];
  check('10 gün önceki tek bilinmeyen gün tolere ediliyor (akut ≈ 0,014 · kronik ≈ 0,034)', p10.acwr.gecerli && near(p10.akut.eksik_payi, 0.25 * Math.pow(0.75, 10), 1e-12) && near(p10.kronik.eksik_payi, (2 / 29) * Math.pow(27 / 29, 10), 1e-12),
    `${p10.akut.eksik_payi} ${p10.kronik.eksik_payi}`);
  const zero = A.monAcwrCombine({ gecerli: true, yontem: 'STANDART', standart: 5, uyarlanmis: 5, baslangic_payi: 0, eksik_payi: 0 },
    { gecerli: true, yontem: 'STANDART', standart: 0.2, uyarlanmis: 0.2, baslangic_payi: 0, eksik_payi: 0 }, cfg);
  check('Kronik EWMA ≈ 0 → ACWR hesaplanmıyor (KRONIK_YUK_SIFIR)', !zero.gecerli && zero.neden === 'KRONIK_YUK_SIFIR');
  check('Geçersiz günlerde grafik verisi kesik (geçerli değil; sıfır / enterpolasyon / önceki değeri taşıma yok)', !pt.akut.gecerli && pt.akut.deger !== 0 && P.slice(0, 8).every(p => !p.gecerli) && Lt.points[58].akut.gecerli);
  const srcStd = A.monEwmaStandard.toString(), srcAdj = A.monEwmaAdjusted.toString();
  check('Ayrı işlevler: Standart ile Uyarlanmış aynı kodu paylaşmıyor', A.monEwmaStandard !== A.monEwmaAdjusted && srcStd !== srcAdj && !srcStd.includes('monEwmaAdjusted') && !srcAdj.includes('monEwmaStandard'));
  check('Tam bilinen seride STANDART, eksik içerende UYARLANMIS; her noktada yöntem / başlangıç / eksik payı dolu',
    Lu.points[10].akut.yontem === 'STANDART' && Lu.points[25].akut.yontem === 'UYARLANMIS' &&
    Lu.points.every(p => ['akut', 'kronik'].every(f => p[f].yontem && p[f].baslangic_payi != null && p[f].eksik_payi != null)));
  const mix = A.monAcwrCombine({ gecerli: true, yontem: 'STANDART', standart: 110, uyarlanmis: 108, baslangic_payi: 0, eksik_payi: 0 },
    { gecerli: true, yontem: 'UYARLANMIS', standart: null, uyarlanmis: 100, baslangic_payi: 0.01, eksik_payi: 0.02 }, cfg);
  check('Karma durum: akut tam, kronik eksik → ACWR’ın İKİ bileşeni de uyarlanmış formülle, etiket UYARLANMIS', mix.yontem === 'UYARLANMIS' && near(mix.deger, 1.08));
  const s1 = A.monEwmaStandard(Array(20).fill(100), 0.25, 0), s2 = A.monEwmaStandard(Array(20).fill(100), 0.25, 300);
  check('Başlangıç etkisi: iki seed farkı (1−λ)^T·(seed₁−seed₂) (1e-9)', s1.every((x, i) => near(s2[i].v - x.v, Math.pow(0.75, i + 1) * 300)));
  {
    const xs = Array.from({ length: 50 }, (_, i) => 80 + 40 * Math.sin(i / 3) + (i % 7) * 5);
    const lam = A.monLam(28), sd = 37, S = A.monEwmaStandard(xs, lam, sd), Ad = A.monEwmaAdjusted(xs, lam);
    check('Normalizasyon özdeşliği: E_t = (1−λ)^T·seed + (1−(1−λ)^T)·Ê_t ve E_t − Ê_t = (1−λ)^T·(seed − Ê_t)',
      S.every((e, i) => { const T = Math.pow(1 - lam, i + 1); return near(e.v, T * sd + (1 - T) * Ad[i].v) && near(e.v - Ad[i].v, T * (sd - Ad[i].v)); }));
  }
  const c33 = A.monEwmaStandard(Array(33).fill(100), A.monLam(28), 0), a9 = A.monEwmaStandard(Array(9).fill(100), A.monLam(7), 0),
    a33 = A.monEwmaStandard(Array(33).fill(100), A.monLam(7), 0), ad33 = A.monEwmaAdjusted(Array(33).fill(100), A.monLam(28));
  check('Elle fikstür: 33 gün sabit 100 AU, seed 0 → kronik 90,54 / 100,00; akut T 9 → 92,49 / 100,00; ACWR 1,104 / 1,000',
    near(c33[32].v, 90.54, 0.005) && near(ad33[32].v, 100) && near(a9[8].v, 92.49, 0.005) && near(a33[32].v / c33[32].v, 1.104, 0.0005));
  /* Tam veri farkı ızgarası (§6.4): |Standart − Uyarlanmış| ≤ başlangıç_payı·|seed − Ê| + 1e-9. */
  let gridOk = true, gridN = 0;
  const series = {
    sabit: () => Array(180).fill(100),
    basamak: () => Array.from({ length: 180 }, (_, i) => (i < 60 ? 100 : 200)),
    haftalik: () => Array.from({ length: 180 }, (_, i) => [300, 0, 500, 0, 400, 600, 0][i % 7]),
    rastgele: () => { seed = 99; return Array.from({ length: 180 }, () => Math.round(400 + 150 * gauss())); },
  };
  for (const [, mk] of Object.entries(series)) {
    const xs = mk();
    for (const rule of ['sifir', 'ilk_n_ortalama', 'ilk_gun']) {
      const sd = A.monSeed(xs, C({ EWMA_SEED: rule }));
      for (const N of [7, 28]) {
        const lam = A.monLam(N), S = A.monEwmaStandard(xs, lam, sd), Ad = A.monEwmaAdjusted(xs, lam);
        for (const T of [9, 10, 20, 33, 40, 60, 90, 180]) { gridN++; const i = T - 1;
          if (!(Math.abs(S[i].v - Ad[i].v) <= S[i].baslangic * Math.abs(sd - Ad[i].v) + 1e-9)) gridOk = false; }
      }
    }
  }
  check(`Tam veri farkı: T × seed × seri ızgarasında |Standart − Uyarlanmış| ≤ payı·|seed − Ê| + 1e-9 (${gridN} nokta)`, gridOk);
  /* Mevcut uygulamada EWMA yoktu (ACWR 7/28 günlük hareketli ortalama oranı) — "birebir aynı"
     karşılaştırması bu yüzden monotoni için yapılır: mevcut weekMono ile aynı tanım. */
  const wk = [300, 0, 500, 0, 400, 0, 200];
  const Mw = A.monBuild(loadAth(7, i => wk[i] || null, {}), { cfg, today: K(6) });
  const mw = A.monWin(Mw.S.load, A.monDN(K(6)), 7, 'mono', cfg), old = A.weekMono(wk.map(v => ({ load: v })));
  check('Monotoni mevcut uygulamanın weekMono’suyla birebir aynı (popülasyon SS)', near(mw.v, old.monotony), `${mw.v} ${old.monotony}`);
  const Mh = A.monBuild(loadAth(20, i => (i === 17 ? null : 300), { days: unknownDay(17) }), { cfg, today: K(19) });
  const h7 = A.monWin(Mh.S.load, A.monDN(K(19)), 7, 'sum', cfg), hm = A.monWin(Mh.S.load, A.monDN(K(19)), 7, 'mono', cfg);
  check('Monotoni / strain / 7 günlük toplam: pencerede tek bilinmeyen gün → Hesaplanamıyor', !h7.ok && !hm.ok && h7.neden === 'PENCERE_EKSIK');
  const Mc = A.monBuild(loadAth(7, () => 300), { cfg, today: K(6) });
  check('SS = 0 → monotoni hesaplanamıyor', A.monWin(Mc.S.load, A.monDN(K(6)), 7, 'mono', cfg).neden === 'SS_SIFIR');
}

/* ═══ 2 · Ağrı ═══ */
group('2 · Ağrı (5 = hiç ağrı yok, AGRI_YON = dusuk_kotu)');
{
  const cfg = C();
  const st = (p, c, cf) => A.monPainStatus(p, c, cf || cfg);
  const html = fs.readFileSync(path.join(__dirname, 'checkin.html'), 'utf8');
  check('Ölçek ve yön config’te: {5 hiç ağrı yok … 1 çok şiddetli}, AGRI_YON = dusuk_kotu', cfg.AGRI_YON === 'dusuk_kotu' && cfg.AGRI_OLCEK[0] === 1 && cfg.AGRI_OLCEK[1] === 5);
  check('Bugün 5 (önceki yok / 5 / 1-4): "ağrısız gün", uyarı yok', [null, 5].every(p => st(p, 5).kod === 'AGRISIZ' && !st(p, 5).uyari) && [1, 2, 3, 4].every(p => !st(p, 5).uyari && st(p, 5).kod === 'AGRISIZLIGA_DONUS'));
  check('Önceki 5 → bugün 4, 3, 2, 1: "yeni ağrı bildirimi", uyarı var', [4, 3, 2, 1].every(c => st(5, c).kod === 'YENI_AGRI' && st(5, c).uyari));
  check('Önceki 4→3, 3→2, 4→2, 4→1, 2→1: "ağrıda artış"', [[4, 3], [3, 2], [4, 2], [4, 1], [2, 1]].every(([p, c]) => st(p, c).kod === 'ARTIS' && st(p, c).uyari));
  check('Önceki 3→4, 2→4, 1→2: "azalma" (bilgi, uyarı yok); aynı değer 1-4: "devam eden ağrı", ayrı vurgu yok',
    [[3, 4], [2, 4], [1, 2]].every(([p, c]) => st(p, c).kod === 'AZALMA' && !st(p, c).uyari) && [1, 2, 3, 4].every(v => st(v, v).kod === 'DEVAM' && !st(v, v).uyari));
  check('Önceki kayıt yok + bugün 4: "yeni bildirilen ağrı" (asla "yeni ağrı bildirimi" ya da "artış" değil)', st(null, 4).kod === 'YENI_BILDIRILEN');
  check('Yön parametresi testi: yuksek_kotu verilince 3→4 "artış" olur', st(3, 4, C({ AGRI_YON: 'yuksek_kotu' })).kod === 'ARTIS' && st(3, 4).kod === 'AZALMA');
  const W = (i, extra) => ({ date: K(i), sleep: 4, mentalFatigue: 4, physicalFatigue: 4, soreness: 4, ...(extra || {}) });
  const mk = wl => A.monBuild({ id: 'p', wellness: wl, srpeLog: [], nightLog: [], days: {} }, { cfg, today: K(10) });
  const M1 = mk([W(8), W(9, { painMap: { 'Sağ diz önü': 1 } })]);
  const p1 = A.monPainAt(M1, A.monDN(K(9))).bolgeler[0];
  check('Bölgesiz 5 → bölge için önceki kayıt 5 sayılır (yeni ağrı bildirimi); form "Hafif" → 4', p1 && p1.kod === 'YENI_AGRI' && p1.bugun === 4 && p1.onceki === 5);
  const M2 = mk([W(4), W(9, { painMap: { 'Sağ diz önü': 2 } })]);
  check('Geri bakışın (3 gün) dışındaki 5 → "yeni bildirilen ağrı"', A.monPainAt(M2, A.monDN(K(9))).bolgeler[0].kod === 'YENI_BILDIRILEN');
  const M3 = mk([W(8)]);
  check('Bugün kayıt yok (önceki 5 olsa bile): bilinmiyor — ağrısız sayılmıyor, uyarı yok', A.monPainAt(M3, A.monDN(K(9))).kayit === false && A.monPainAt(M3, A.monDN(K(9))).uyarilar.length === 0);
  const M4 = mk([W(7, { painMap: { Diz: 2.5, Bel: 0, Omuz: 6, Kalça: true } })]);
  const p4 = A.monPainAt(M4, A.monDN(K(7)));
  check('Ağrı ∉ {1..5} (2,5 · 0 · 6 · boolean): Sınıf G1, hesaplardan hariç, ne ağrısız ne ağrı',
    p4.bolgeler.length === 0 && M4.queue.filter(q => q.kural === 'G1' && q.alan === 'pain').length === 4);
  check('Ağrı serisi z-skor / ortalama hesabına girmiyor (ağrı bir gösterge akışı değil)', A.MON_IND.every(i => !/pain|agri/i.test(i.stream)));
  const sev = A.PAIN_SEV_LABEL();
  check('Veri modeli tutarlılığı: form bölge başına 1 Hafif · 2 Orta · 3 Yüksek ("Ağrın yoksa boş bırak"); onaylı eşleme {1→4, 2→3, 3→2} ölçekte, tekdüze ve 5’ten küçük',
    /sev:\['Hafif','Orta','Yüksek'\]/.test(html) && /no_pain:'Ağrın yoksa bu bölümü boş bırak\.'/.test(html) && sev[1] && sev[2] && sev[3] &&
    cfg.AGRI_ESLEME[1] === 4 && cfg.AGRI_ESLEME[2] === 3 && cfg.AGRI_ESLEME[3] === 2 && Object.keys(cfg.AGRI_ESLEME).length === 3);
}

/* ═══ 3 · Z-skor ölçek eşleştirme ═══ */
group('3 · Z-skor ölçek eşleştirme');
{
  const cfg = C();
  seed = 4; const base = Array.from({ length: 40 }, () => 4 + 0.6 * gauss());
  const s1 = stream(base), s2 = stream(base.map((v, i) => (i === 39 ? 99 : v)));
  const r1 = A.monRefDaily(s1, 39, cfg), r2 = A.monRefDaily(s2, 39, cfg);
  check('Günlük değer günlük referansla; değerlendirilen gün referansa girmiyor', near(r1.ort, r2.ort) && r1.n === 28);
  check('Ölçek uyuşmazlığında işlev hata veriyor (günlük değer × pencere referansı)', throws(() => A.monZ({ olcek: 'gunluk', v: 1 }, A.monRefWin(s1, 39, 7, 'mean', cfg), 0.5)));
  const rw = A.monRefWin(s1, 39, 7, 'mean', cfg);
  check('k-günlük ortalama, örtüşmeyen k-günlük ortalama dağılımıyla (referans pencereleri ≤ t−k)', rw.olcek === 'pencere7' && rw.n === 28 && rw.dRef === 33);   // son günü 5…32 olan pencereler (kapsam ≥ %80)
  const mkL = () => { const srpeLog = []; for (let i = 0; i < 60; i++) { if (i % 7 === 6) continue; srpeLog.push({ date: K(i), totalLoad: i % 7 === 5 ? 900 : 400 + (i % 3) * 50, ...(i % 7 === 5 ? { gameRPE: 8, gameDuration: 40, gameLoad: 320 } : {}) }); }
    return { id: 'l', srpeLog, wellness: [], nightLog: [], days: {} }; };
  const Ml = A.monBuild(mkL(), { cfg, today: K(59) });
  const rRest = A.monEval(Ml, 'load', 'gunluk', A.monDN(K(55)));
  const rTr = A.monEval(Ml, 'load', 'gunluk', A.monDN(K(57)));
  check('Günlük yük z-skoru yalnızca aynı gün tipiyle; dinlenme gününde hesaplanmıyor', rRest.dinlenme && rRest.z == null && rTr.ref.ort < 600 && rTr.ref.n > 0);
  const Mo = A.monBuild(mkL(), { cfg: C({ GUN_TIPI_AYRIMI: false }), today: K(59) });
  const rOff = A.monEval(Mo, 'load', 'gunluk', A.monDN(K(55)));
  check('GUN_TIPI_AYRIMI kapalıyken davranış değişiyor (dinlenme günü de değerlendiriliyor, referans karışık)', !rOff.dinlenme && rOff.ref.n > rTr.ref.n);
  const sc = stream(Array(40).fill(4));
  const rc = A.monRefDaily(sc, 39, cfg);
  check('σ_min kullanılıyor (SS 0 iken 1-5 ölçekte 0,5) ve config’e göre değişiyor', near(A.monZ({ olcek: 'gunluk', v: 3 }, rc, cfg.SIGMA_MIN_GUNLUK.olcek5), -2) &&
    near(A.monZ({ olcek: 'gunluk', v: 3 }, rc, 0.25), -4));
  /* Statik tarama: hesap motorunda yalnızca birim sabitleri. */
  const src = fs.readFileSync(path.join(__dirname, 'src/app/424-monitor-engine.jsx'), 'utf8');
  const ast = babel.packages.parser.parse(src, { sourceType: 'script', plugins: ['jsx'] });
  const allowed = new Set([0, 1, 2, 24, 60, 100, 3600, 365.25, 864e5]);
  const bad = [];
  (babel.packages.traverse.default || babel.packages.traverse)(ast, { NumericLiteral(p) { if (!allowed.has(p.node.value)) bad.push(p.node.value + '@' + p.node.loc.start.line); } });
  check('Kodda gömülü eşik yok: hesap motorunda yalnızca birim sabitleri (statik tarama)', bad.length === 0, bad.join(', '));
}

/* ═══ 4 · Uyarı kategorileri ═══ */
group('4 · Uyarı kategorileri');
{
  const cfg = C();
  const srpeLog = [], wellness = [];
  for (let i = 0; i < 70; i++) {
    srpeLog.push({ date: K(i), totalLoad: i > 62 ? 2500 : 400 + (i % 4) * 40 });
    wellness.push({ date: K(i), sleep: i > 64 ? 1 : 4, mentalFatigue: i > 64 ? 1 : 4 + (i % 2), physicalFatigue: i > 64 ? 1 : 4, soreness: i > 64 ? 1 : 4 });
  }
  wellness.push({ date: K(69), sleep: 9 });   // geçersiz → doğrulama bekleyen kayıt
  const ath = { id: 'c', srpeLog, wellness, nightLog: [{ date: K(69), bedTime: '04:00', wakeTime: '05:00' }], days: {}, injuries: [] };
  const M = A.monBuild(ath, { cfg, today: K(69) }), S = A.monSummary(M, ath, A.monDN(K(69)), 'gunluk');
  check('Yük sıçraması, wellness düşüşü, doğrulama bekleyen ve sıra dışı kayıt Kategori A uyarısı ÜRETMİYOR', S.A.length === 0 && M.queue.length > 0);
  const ath2 = { ...ath, wellness: [...wellness, { date: K(68), sleep: 4 }, { date: K(69), sleep: 4, painMap: { Bel: 3 } }], injuries: [{ id: 'j', date: K(50), location: 'Diz' }] };
  const M2 = A.monBuild(ath2, { cfg, today: K(69) }), S2 = A.monSummary(M2, ath2, A.monDN(K(69)), 'gunluk');
  check('Kategori A yalnızca ağrı ve aktif sakatlıktan', S2.A.length === 2 && S2.A.every(x => x.tur === 'agri' || x.tur === 'sakatlik'));
  const btxt = A.MON_NOTE_B() + A.MonPanelB.toString();
  check('Kategori B metinleri "sağlık değerlendirmesi" ifadesi içermiyor (içerik taraması)', !/sağlık değerlendirmesi/i.test(btxt));
  const keys = JSON.stringify(S, (k, v) => v).match(/"[a-zA-Z_]+":/g).map(s => s.slice(1, -2));
  check('Ortak skor yok: durum özetinde tek sayısal "risk/skor" alanı yok', !keys.some(k => /risk|skor|score/i.test(k)));
  const rowsB = S.B, okB = rowsB.filter(r => r.hesaplanabilir);
  check('Birlikte sapma kategori içinde ve yalnızca yeterli referanslı göstergelerle', S.birlikteB.yeterli === okB.length && S.birlikteB.sapan === okB.filter(r => r.sapma).length &&
    S.birlikteB.degerlendirilemedi === rowsB.length - okB.length);
}

/* ═══ 5 · Üç ayrı durum (3A.5 fikstürü) ═══ */
group('5 · Üç ayrı durum — doluluk, hesaplanabilirlik, güvenilirlik bağımsız');
{
  const cfg = C(), today = K(28), n = A.monDN(today);
  const wl = days => days.map(([i, v]) => ({ date: K(i), sleep: v }));
  const M1 = A.monBuild({ id: 1, wellness: wl(Array.from({ length: 29 }, (_, i) => [i, 4])), srpeLog: [], nightLog: [], days: {} }, { cfg, today });
  const s1 = A.monStatus(M1, 'sleepQ', 'gunluk', n);
  check('28/28 gün dolu, 28 gün aynı cevap → %100 · Hesaplanabilir · İşaret: R2', s1.doluluk.gecerli === 28 && s1.hesaplanabilirlik.durum === 'Hesaplanabilir' && s1.guvenilirlik.isaret.map(x => x.kod).join() === 'R2');
  const pick = [1, 3, 5, 7, 10, 12, 14, 17, 19, 22, 24, 27];
  const M2 = A.monBuild({ id: 2, wellness: wl([...pick.map((i, k) => [i, 3 + (k % 3)]), [28, 4]]), srpeLog: [], nightLog: [], days: {} }, { cfg, today });
  const s2 = A.monStatus(M2, 'sleepQ', 'gunluk', n);
  check('12/28 gün dolu, değerler makul → %43 · Hesaplanamıyor (YETERSIZ_GOZLEM) · Belirgin sorun saptanmadı',
    near(pick.length / 28, 0.43, 0.005) && s2.hesaplanabilirlik.durum === 'Hesaplanamıyor' && s2.hesaplanabilirlik.kodlar.includes('YETERSIZ_GOZLEM') && s2.guvenilirlik.etiket === 'BELIRGIN_SORUN_YOK');
  const srpe = Array.from({ length: 29 }, (_, i) => (i === 25 ? { date: K(i), tpRPE: 8, tpDuration: 0 } : { date: K(i), totalLoad: 300 + (i % 5) * 40 }));
  const M3 = A.monBuild({ id: 3, wellness: [], srpeLog: srpe, nightLog: [], days: {} }, { cfg, today });
  const s3 = A.monStatus(M3, 'load', 'gunluk', n), w3 = A.monEval(M3, 'load7', 'pencere', n);
  check('Bir günde RPE 8, süre 0 (Sınıf G) → 27/28 geçerli + 1 doğrulama bekleyen · 7 günlük toplam Hesaplanamıyor (DOGRULAMA_BEKLIYOR) · İşaret: R1',
    s3.doluluk.gecerli === 27 && s3.doluluk.bekleyen === 1 && !w3.deger.ok && w3.deger.neden === 'DOGRULAMA_BEKLIYOR' && s3.guvenilirlik.isaret.some(x => x.kod === 'R1'));
  seed = 11;
  const nl = Array.from({ length: 29 }, (_, i) => { const m = i === 28 ? 180 : Math.round(480 + 25 * gauss()); const b = 23 * 60;
    const w = (b + m) % 1440; const hm = x => String(Math.floor(x / 60)).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0'); return { date: K(i), bedTime: hm(b), wakeTime: hm(w) }; });
  const M4 = A.monBuild({ id: 4, wellness: [], srpeLog: [], nightLog: nl, days: {} }, { cfg, today });
  const s4 = A.monStatus(M4, 'sleepH', 'gunluk', n);
  check('28/28 dolu, bir günde uyku 3,0 sa → Hesaplanabilir (kayıt dışlanmaz) · İşaret: R6', s4.hesaplanabilirlik.durum === 'Hesaplanabilir' && s4.guvenilirlik.isaret.some(x => x.kod === 'R6') && near(M4.S.sleepH.get(n).v, 3));
  const M5 = A.monBuild({ id: 5, wellness: [], srpeLog: srpe.map((e, i) => (i === 25 ? { date: K(i), totalLoad: 320 } : e)), nightLog: [], days: {} }, { cfg, today });
  const s5 = A.monStatus(M5, 'load', 'gunluk', n);
  check('28/28 dolu, zaman damgası alanı yok → Hesaplanabilir · R3 değerlendirilemiyor', s5.hesaplanabilirlik.durum === 'Hesaplanabilir' && s5.guvenilirlik.degerlendirilemiyor.includes('R3'));
  check('Birleştirilmiş "güven" etiketi yok; "Belirgin sorun saptanmadı" doğrulanmış güvenilir olarak sunulmuyor',
    !('guven' in s1) && s2.guvenilirlik.etiket === 'BELIRGIN_SORUN_YOK' && s2.guvenilirlik.degerlendirilemiyor.includes('R6'));
}

/* ═══ 6 · Referans bağımlılığı ve yetersiz referans modu ═══ */
group('6 · Referans bağımlılığı ve yetersiz referans modu');
{
  const cfg = C();
  check('n_eff günlük: ρ̂ 0,5 ve n 24 → 8,0; ρ̂ ≤ 0 → n_eff = n; ρ̂ RHO_MAX’a kırpılıyor',
    near(A.monNeffDaily(24, 0.5, cfg).neff, 8) && near(A.monNeffDaily(24, -0.4, cfg).neff, 24) && A.monNeffDaily(24, 0.97, cfg).rho === cfg.RHO_MAX);
  const alt = Array.from({ length: 40 }, (_, i) => (i % 2 ? 4 + (i % 5) * 0.2 : null));
  check('Bitişik geçerli çift RHO_MIN_CIFT altında → n_eff tanımsız → referans yetersiz', (() => { const r = A.monRefDaily(stream(alt), 39, cfg); return r.neff == null && r.nedenler.includes('RHO_KESTIRILEMEDI') && !r.yeterli; })());
  const full = stream(Array.from({ length: 80 }, (_, i) => 5 + (i % 3)));
  const rw = A.monRefWin(full, 79, 7, 'mean', cfg);
  check('n_eff pencere: D_ref 56 gün, k 7 → n_eff 8 (n_pencere ≫ 8 olsa bile)', rw.dRef === 56 && near(rw.neff, 8) && rw.n > 8);
  seed = 21; let x = 0;
  const hi = stream(Array.from({ length: 40 }, () => { x = 0.85 * x + Math.sqrt(1 - 0.85 * 0.85) * gauss(); return 4 + x; }));
  const rh = A.monRefDaily(hi, 39, cfg);
  check('Çifte koşul: ham gözlem ≥ Z_MIN_GOZLEM_GUNLUK ama n_eff < Z_MIN_NEFF_GUNLUK → yetersiz (z üretilmiyor)', rh.n >= 14 && rh.neff < 8 && !rh.yeterli && rh.nedenler.includes('NEFF_DUSUK'));
  const rh2 = A.monRefDaily(hi, 39, C({ Z_MIN_NEFF_GUNLUK: 2 }));
  check('Eşikler config ile değiştiğinde sonuç değişiyor', rh2.yeterli);
  const gap = stream([null, 1, 2, null, 4, 5]);
  const rr = A.monRaw(gap, 5, cfg);
  check('Yetersiz referans modunda ham fark, 3/7 günlük ortalama, yüzde değişim ve takvim günü eksenli OLS eğimi var', rr.yeterli && rr.fark === 1 && rr.ma[3] && rr.ma[7] && near(rr.egim, 1));
  check('Eğim boşluklu seride takvim günü kullanıyor (günler 1, 2, 4, 5 / değerler 1, 2, 4, 5 → 1,0; indeksle 1,33 olurdu)', near(A.monOls([1, 2, 4, 5], [1, 2, 4, 5]), 1) && !near(A.monOls([0, 1, 2, 3], [1, 2, 4, 5]), 1));
  check('HAM_EGILIM_MIN_NOKTA altında eğim üretilmiyor', A.monRaw(stream([null, null, 2, null, 4, 5]), 5, cfg).egim == null);
  const W = (i, v) => ({ date: K(i), sleep: v });
  const Mi = A.monBuild({ id: 'i', wellness: [W(20, 4), W(22, 3), W(25, 2), W(27, 2), W(28, 1)], srpeLog: [], nightLog: [], days: {} }, { cfg, today: K(28) });
  const ri = A.monEval(Mi, 'sleepQ', 'gunluk', A.monDN(K(28)));
  check('Yetersiz referansta z, "üstünde/altında", sapma vurgusu ve eğilim etiketi YOK; ham bilgi var', ri.z == null && ri.sapma == null && ri.egilim == null && ri.ham && ri.ham.yeterli);
  const ins = { id: 'k', wellness: [], srpeLog: [], nightLog: [], days: {} };
  const Mk = A.monBuild(ins, { cfg, today: K(28) }), Sk = A.monSummary(Mk, ins, A.monDN(K(28)), 'gunluk');
  check('Yetersiz referanslı göstergeler "birlikte sapma" sayımına girmiyor; "N gösterge değerlendirilemedi" notu', Sk.birlikteC.yeterli === 0 && Sk.birlikteC.degerlendirilemedi === 5);
  check('Yeterli referansta SS göreli standart hata notu: n_eff 8 → ≈ 0,267; n_eff 14 → ≈ 0,196', near(A.monSdRelSE(8), 0.267, 0.0005) && near(A.monSdRelSE(14), 0.196, 0.0005));
}

/* ═══ 7 · Geçersiz veri ve dışlama ═══ */
group('7 · Geçersiz veri ve dışlama (Sınıf G / S)');
{
  const cfg = C(), today = K(10), n = A.monDN(K(5));
  const build = ath => A.monBuild({ id: 'g', wellness: [], srpeLog: [], nightLog: [], days: {}, ...ath }, { cfg, today, polarSleep: ath.polar });
  const ld = rows => build({ srpeLog: rows.map(r => ({ date: K(5), ...r })) }).S.load.get(n).st;
  const wq = v => build({ wellness: [{ date: K(5), sleep: v }] }).S.sleepQ.get(n).st;
  check('G1 wellness: 6 geçersiz, 5 sınırda geçerli', wq(6) === 'gecersiz' && wq(5) === 'kayitli');
  check('G1 RPE: 11 geçersiz, 10 sınırda geçerli', ld([{ tpRPE: 11, tpDuration: 60 }]) === 'gecersiz' && ld([{ tpRPE: 10, tpDuration: 60 }]) === 'kayitli');
  check('G2 süre: −5 ve 1441 dk geçersiz, 1440 dk geçerli; aynı günün toplamı 1440 dk üstü geçersiz',
    ld([{ tpRPE: 5, tpDuration: -5 }]) === 'gecersiz' && ld([{ tpRPE: 5, tpDuration: 1441 }]) === 'gecersiz' && ld([{ tpRPE: 5, tpDuration: 1440 }]) === 'kayitli' &&
    ld([{ tpRPE: 5, tpDuration: 800 }, { scRPE: 5, scDuration: 800 }]) === 'gecersiz');
  const sl = sec => build({ polar: { [K(5)]: sec } }).S.sleepH.get(n).st;
  check('G3 uyku: 25 sa geçersiz, 24 sa sınırda geçerli; okunamayan saat geçersiz', sl(25 * 3600) === 'gecersiz' && sl(24 * 3600) === 'kayitli' &&
    build({ nightLog: [{ date: K(5), bedTime: '25:00', wakeTime: '07:00' }] }).S.sleepH.get(n).st === 'gecersiz');
  check('G4: süre 0 iken RPE 8 ve süre 60 iken RPE yok geçersiz; RPE 0 + süre 60 geçerli (0 AU)', ld([{ tpRPE: 8, tpDuration: 0 }]) === 'gecersiz' && ld([{ tpDuration: 60 }]) === 'gecersiz' && ld([{ tpRPE: 0, tpDuration: 60 }]) === 'kayitli');
  const Mf = build({ wellness: [{ date: K(12), sleep: 4 }] });
  check('G5: gelecekteki kayıt geçersiz (kuyrukta), bugünkü kayıt geçerli', Mf.queue.some(q => q.kural === 'G5') && build({ wellness: [{ date: K(10), sleep: 4 }] }).queue.length === 0);
  const Mg = build({ measurements: [{ date: K(1), height: 300, weight: 10 }, { date: K(4), height: 250, weight: 250 }] });
  check('G6: boy 300 / kilo 10 geçersiz, 250 / 250 sınırda geçerli', Mg.queue.filter(q => q.kural === 'G6').length === 2 && Mg.growth.olcumSayisi === 1);
  const raw = { id: 'r', srpeLog: [{ date: K(5), tpRPE: 8, tpDuration: 0 }, { date: K(6), totalLoad: 300 }], wellness: [{ date: K(5), sleep: 9, painMap: { Diz: 2.5 } }], nightLog: [], days: {}, injuries: [] };
  const before = JSON.stringify(raw);
  const Mr = A.monBuild(raw, { cfg, today }); A.monSummary(Mr, raw, n, 'gunluk'); A.monLoadModel(Mr);
  check('Ham kayıt korunuyor: G kayıtlarının bulunduğu veride kayıt sayısı ve içerik hesaplama öncesi/sonrası aynı', JSON.stringify(raw) === before);
  const series = i => ({ date: K(i), totalLoad: 300 });
  const gAth = { id: 'q', srpeLog: [...Array.from({ length: 40 }, (_, i) => (i === 37 ? { date: K(i), tpRPE: 8, tpDuration: 0 } : series(i)))], wellness: [], nightLog: [], days: {} };
  const Mq = A.monBuild(gAth, { cfg, today: K(39) }), Lq = A.monLoadModel(Mq), pq = Lq.points[39];
  const w7 = A.monWin(Mq.S.load, A.monDN(K(39)), 7, 'sum', cfg), mo = A.monWin(Mq.S.load, A.monDN(K(39)), 7, 'mono', cfg);
  check('G kaydı olan gün bilinmiyor gibi: EWMA eksik payına giriyor; 7 günlük toplam ve monotoni Hesaplanamıyor (DOGRULAMA_BEKLIYOR)',
    pq.akut.eksik_payi > 0 && w7.neden === 'DOGRULAMA_BEKLIYOR' && mo.neden === 'DOGRULAMA_BEKLIYOR' && Mq.S.load.get(A.monDN(K(37))).v == null);
  const fixed = { ...gAth, srpeLog: gAth.srpeLog.map((e, i) => (i === 37 ? { ...e, tpDuration: 60 } : e)) };
  const Mx = A.monBuild(fixed, { cfg, today: K(39) });
  check('Mevcut düzenleme özelliğiyle düzeltilince G’den çıkıyor ve otomatik olarak hesaplara giriyor', A.monWin(Mx.S.load, A.monDN(K(39)), 7, 'sum', cfg).ok && Mx.queue.length === 0);
  const sAth = { id: 's', srpeLog: [], wellness: [], days: {}, nightLog: Array.from({ length: 30 }, (_, i) => ({ date: K(i), bedTime: '23:00', wakeTime: i === 28 ? '02:00' : '07:00' })) };
  const Ms = A.monBuild(sAth, { cfg, today: K(29) }), rs = A.monRefDaily(Ms.S.sleepH, A.monDN(K(29)), cfg);
  check('Sınıf S dışlanmıyor: 3,0 sa uyku hesapta ve referansta kalıyor (kırpma / winsorizing yok)', Ms.S.sleepH.get(A.monDN(K(28))).st === 'kayitli' && rs.n === 28 && rs.ort < 8);
  check('Doğrulama kuyruğu sporcu kaydının alanını, değerini ve kuralını taşıyor; Kategori A’da yer almıyor',
    Mq.queue.length === 1 && Mq.queue[0].kural === 'G4' && Mq.queue[0].tarih === K(37) && A.monSummary(Mq, gAth, A.monDN(K(39)), 'gunluk').A.length === 0);
  check('G kuralları ölçek sınırlarını config’ten okuyor (sabit gömülü değil)', build({ wellness: [{ date: K(5), sleep: 6 }] }).S.sleepQ.get(n).st === 'gecersiz' &&
    A.monBuild({ id: 'g', wellness: [{ date: K(5), sleep: 6 }], srpeLog: [], nightLog: [], days: {} }, { cfg: C({ WELLNESS_OLCEK: [1, 7] }), today }).S.sleepQ.get(n).st === 'kayitli');
}

/* ═══ 8 · Uyku/wellness olumsuz eğilim ═══ */
group('8 · Olumsuz eğilim (EGILIM_GUN_ESIGI_SS 0,5 · ARDISIK 3 · BIRIKIMLI 2,0)');
{
  const cfg = C(), T = s => A.monTrendFromS(s, cfg);
  check('s = [0,55; 0,55; 0,55] → r 3, C 1,65 → etiket yok', T([0.55, 0.55, 0.55]).r === 3 && near(T([0.55, 0.55, 0.55]).C, 1.65) && !T([0.55, 0.55, 0.55]).etiket);
  check('s = [0,8; 0,8; 0,8] → r 3, C 2,4 → etiket var', T([0.8, 0.8, 0.8]).etiket && near(T([0.8, 0.8, 0.8]).C, 2.4));
  check('s = [2,5; 2,5] → r 2, C 5,0 → etiket yok (süre yetersiz)', T([2.5, 2.5]).r === 2 && !T([2.5, 2.5]).etiket);
  check('s = [0,5 ×5] → r 5, C 2,5 → etiket var', T([0.5, 0.5, 0.5, 0.5, 0.5]).r === 5 && T([0.5, 0.5, 0.5, 0.5, 0.5]).etiket);
  check('s = [0,8; 0,3; 0,8; 0,8] → ikinci gün olumsuz sayılmaz, son seri r 2 → etiket yok', T([0.8, 0.3, 0.8, 0.8]).r === 2 && !T([0.8, 0.3, 0.8, 0.8]).etiket);
  check('Bilinmeyen veya geçersiz-doğrulanıyor gün (null) seriyi kesiyor', T([0.8, 0.8, null, 0.8, 0.8]).r === 2);
  check('Parametreler config ile değiştiğinde sonuç değişiyor', A.monTrendFromS([0.55, 0.55, 0.55], C({ EGILIM_MIN_BIRIKIMLI: 1.5 })).etiket);
  seed = 31;
  const wl = Array.from({ length: 50 }, (_, i) => ({ date: K(i), sleep: i >= 46 ? 1 : Math.max(3, Math.min(5, Math.round(4 + 0.7 * gauss()))) }));
  const ath = { id: 't', wellness: wl, srpeLog: [], nightLog: [], days: {} };
  const M = A.monBuild(ath, { cfg, today: K(49) }), r = A.monEval(M, 'sleepQ', 'gunluk', A.monDN(K(49)));
  check('Uygulamada: referansı yeterli uyku kalitesi 4 gün düşük → "Olumsuz eğilim (kişisel referansa göre)" ve büyüklüğü (gün, SS, ham birim)',
    r.hesaplanabilir && r.egilim && r.egilim.etiket && r.egilim.r >= 4 && r.egilim.hamFark < 0, JSON.stringify(r.egilim));
  const M2 = A.monBuild({ ...ath, wellness: wl.filter(w => w.date !== K(47)) }, { cfg, today: K(49) });
  check('Uygulamada: aradaki kayıtsız gün seriyi kesiyor', A.monEval(M2, 'sleepQ', 'gunluk', A.monDN(K(49))).egilim.r === 2);
  const src = fs.readFileSync(path.join(__dirname, 'src/app/428b-athlete-monitoring.jsx'), 'utf8');
  check('Etiket metni ve tooltip "sakatlık riski eşiği değildir" diyor; eğilim Kategori C’de, Kategori A üretmiyor',
    /Olumsuz eğilim \(kişisel referansa göre\)/.test(src) && /sakatlık riski eşiği değildir/.test(src) && A.MON_IND.filter(i => i.dir).every(i => i.cat === 'C'));
  check('Uyku kalitesi yalnızca uyku modülünde, her wellness maddesi ayrı; türetilmiş hazır oluş gösterge değil (çifte sayım yok)',
    A.MON_IND.filter(i => i.cat === 'C').map(i => i.stream).join() === 'sleepH,sleepQ,mental,physical,soreness' && !A.MON_IND.some(i => /readiness/.test(i.stream)));
}

/* ═══ 9 · EWMA yöntem geçişi ve yapay değişim ═══ */
group('9 · EWMA yöntem geçişi ve yapay değişim (60 gün 100 AU, seed 0, 61. gün bilinmiyor, 62-71 100 AU)');
{
  const cfg = C({ EWMA_SEED: 'sifir' });
  const ath = loadAth(71, i => (i === 60 ? null : 100), { days: unknownDay(60) });
  const Lm = A.monLoadModel(A.monBuild(ath, { cfg, today: K(70) })), P = d => Lm.points[d - 1];
  const kr = Lm.gecisler.kronik[0], ac = Lm.gecisler.acwr[0];
  check('Geçiş tespit ediliyor: kronik 60→61. gün Standart→Uyarlanmış; ACWR 60→65. gün (kesinti = true)',
    kr.onceki === K(59) && kr.tarih === K(60) && kr.yon === 'STANDART→UYARLANMIS' && !kr.kesinti && ac.onceki === K(59) && ac.tarih === K(64) && ac.kesinti);
  check('Ayrıştırma: gosterilen = tutarli + yapay (1e-12); kronik tutarli 0, yapay 100·(27/29)^60 ≈ 1,3739',
    [...Lm.gecisler.akut, ...Lm.gecisler.kronik, ...Lm.gecisler.acwr].every(t => near(t.gosterilen, t.tutarli + t.yapay, 1e-12)) &&
    near(kr.tutarli, 0, 1e-9) && near(kr.yapay, 100 * Math.pow(27 / 29, 60), 1e-9) && near(kr.yapay, 1.3739, 0.00005));
  check('ACWR: 60. gün Standart 1,0139; 65. gün Uyarlanmış 1,0000; gosterilen = yapay = −0,0139, tutarli = 0',
    P(60).acwr.yontem === 'STANDART' && near(P(60).acwr.deger, 1.0139, 0.00005) && P(65).acwr.yontem === 'UYARLANMIS' && near(P(65).acwr.deger, 1, 1e-9) &&
    near(ac.gosterilen, -0.0139, 0.00005) && near(ac.yapay, ac.gosterilen, 1e-9) && near(ac.tutarli, 0, 1e-9));
  const rev = A.monTransitions([{ gecerli: true, yontem: 'UYARLANMIS', deger: 1.10, uyarlanmis: 1.10, tarih: 'a' }, { gecerli: true, yontem: 'STANDART', deger: 1.07, uyarlanmis: 1.04, standart: 1.07, tarih: 'b' }])[0];
  check('Ters yön kapalı formu: Uyarlanmış 1,10 → Standart 1,07 (uyarlanmış 1,04): yapay = +0,03, tutarli = −0,06', near(rev.yapay, 0.03) && near(rev.tutarli, -0.06) && near(rev.gosterilen, -0.03));
  const A_ = Lm.points.map(p => p.acwr), c = A.monEwmaChange(A_, 59, 64);
  check('Yöntem-tutarlı değişim: geçiş içeren aralıkta degisim(tutarli) 0,000; karışık seriden fark (−0,0139) kullanılmıyor; geçişsiz aralıkta iki hesap aynı',
    c.ok && c.gecis && near(c.degisim, 0, 1e-9) && near(c.karisik, -0.0139, 0.00005) && (() => { const d = A.monEwmaChange(A_, 40, 50); return d.ok && !d.gecis && near(d.degisim, A_[50].deger - A_[40].deger); })());
  check('Uç nokta geçersizse değişim Hesaplanamıyor', !A.monEwmaChange(A_, 59, 61).ok);
  const full = A.monLoadModel(A.monBuild(loadAth(80, () => 100), { cfg, today: K(79) }));
  const miss = A.monLoadModel(A.monBuild(loadAth(80, i => (i === 1 ? null : 100), { days: unknownDay(1) }), { cfg, today: K(79) }));
  check('Geçiş yok → işaret yok: tam bilinen seri ve baştan beri eksik içeren seri (hiç geçerli Standart noktası yok) geçiş üretmiyor',
    full.gecisler.acwr.length === 0 && full.gecisler.kronik.length === 0 && miss.gecisler.kronik.length === 0 && miss.gecisler.acwr.length === 0);
  const ui = fs.readFileSync(path.join(__dirname, 'src/app/428b-athlete-monitoring.jsx'), 'utf8');
  check('Grafikte geçiş günü için işaret + tooltip metni; geçiş "yük değişimi" sayımı üretmiyor (ACWR birlikte sapma göstergesi değil)',
    /Hesaplama yöntemi değişti/.test(ui) && /Bu noktadaki değişimin bir kısmı yöntemden kaynaklanabilir/.test(ui) && !A.MON_IND.some(i => i.id === 'acwr'));
  const eng = fs.readFileSync(path.join(__dirname, 'src/app/424-monitor-engine.jsx'), 'utf8');
  check('Eşik testi: kodda "küçük yapay bileşeni yok say" benzeri sabit yok', !/yapay\s*[<>]=?|Math\.abs\(\s*\w*yapay\w*\s*\)\s*[<>]/.test(eng));
}

/* ═══ 10 · Pilot referans yeterlilik raporu ═══ */
group('10 · Pilot referans yeterlilik raporu');
{
  const cfg = C({ RAPOR_GUN: 60 }), today = K(119);
  seed = 41;
  const fullAth = { id: 'f', name: 'Tam', wellness: Array.from({ length: 120 }, (_, i) => ({ date: K(i), sleep: Math.max(1, Math.min(5, 3 + 0.2 * Math.round(5 * gauss()))) })), srpeLog: [], nightLog: [], days: {} };
  const third = { id: 'u', name: 'Üçte bir', wellness: Array.from({ length: 120 }, (_, i) => ({ date: K(i), sleep: 4 })).filter((_, i) => i % 3 === 0), srpeLog: [], nightLog: [], days: {} };
  const frozen = JSON.stringify(A.MON_CFG);
  const items = [fullAth, third].map(ath => ({ ath, M: A.monBuild(ath, { cfg, today }) }));
  const rep = A.monAdequacyReport(items, cfg, today);
  const row = (p, id, o) => p.rows.find(r => r.id === id && r.olcek === o);
  check('Oran: tam ve düşük otokorelasyonlu seri → 1,0', row(rep.sporcular[0], 'sleepQ', 'gunluk').oran === 1);
  const r3 = row(rep.sporcular[1], 'sleepQ', 'gunluk');
  check('Üç günde bir kayıtlı seri → 0,0 ve neden YETERSIZ_GOZLEM', r3.oran === 0 && r3.neden.YETERSIZ_GOZLEM === r3.degerlendirilebilir);
  const g = rep.genel.find(r => r.id === 'sleepQ' && r.olcek === 'gunluk');
  check('Genel oran = toplam yeterli ÷ toplam değerlendirilebilir', g.oran === (row(rep.sporcular[0], 'sleepQ', 'gunluk').yeterli + r3.yeterli) / (row(rep.sporcular[0], 'sleepQ', 'gunluk').degerlendirilebilir + r3.degerlendirilebilir));
  check('Rapor config’i değiştirmiyor (çalıştırma öncesi/sonrası eşit; config dondurulmuş)', JSON.stringify(A.MON_CFG) === frozen && Object.isFrozen(A.MON_CFG) && Object.isFrozen(A.MON_CFG.SIGMA_MIN_GUNLUK));
  const twelve = stream(Array.from({ length: 30 }, (_, i) => (i >= 16 && i < 28 ? 4 + (i % 3) * 0.3 : null)).concat([4]));
  const r12 = A.monRefDaily(twelve, 30, C()), r12l = A.monRefDaily(twelve, 30, C({ Z_MIN_GOZLEM_GUNLUK: 10, RHO_MIN_CIFT: 5, Z_MIN_NEFF_GUNLUK: 3 }));
  check('Otomatik gevşetme yok: n 12 (< 14) yeterli değil; gevşek config yalnızca açıkça enjekte edilirse sonuç değişiyor', r12.n === 12 && !r12.yeterli && r12l.yeterli);
  const ui = fs.readFileSync(path.join(__dirname, 'src/app/428b-athlete-monitoring.jsx'), 'utf8');
  check('Rapor Markdown dosyası olarak üretiliyor, arayüz metni "sakatlık riski" ifadesi içermiyor (yalnızca "içermez" notu)',
    /function monReportMd/.test(ui) && !/sakatlık riski (var|yüksek|düşük)/i.test(ui));
}

/* ═══ Genel ═══ */
group('Genel — bileşik risk puanı ve sabit eşikler');
{
  const srcs = ['423-monitor-config.jsx', '424-monitor-engine.jsx', '428b-athlete-monitoring.jsx'].map(f => fs.readFileSync(path.join(__dirname, 'src/app', f), 'utf8')).join('\n');
  check('Bileşik sakatlık riski puanı / endeksi hiçbir yerde üretilmiyor; "yüksek/orta/düşük risk" metni yok (statik tarama)',
    !/(yüksek|orta|düşük) risk|high risk|medium risk|low risk|risk skoru|risk score|riskScore|tehlike bölgesi|güvenli bölge/i.test(srcs));
  /* Sayısal eşikler (0,8-1,3 · 1,5 · %10/%20 · 28/90 gün) bölüm 3'teki AST taramasıyla yakalanır:
     hesap motorunda birim sabitleri dışında sayı yok. Burada eski sınıflandırıcıların adları. */
  check('Eski risk/renk etiketleri ve sabit eşikli sınıflandırıcılar (acwrZoneOf, getAthleteRisks, HRV uyarıları, puan renkleri) Sporcu İzleme’de kullanılmıyor',
    !/acwrZoneOf|getAthleteRisks|HRV_ALERTS|readyColor|score5Color|SCORE5_COLORS|PAIN_SEV_COL/.test(srcs));
  const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  check('Eski "Uyku ve HRV" bölümü ve HRV uyarı modeli kaldırıldı', !/AthWellness|hrvModel|HRV_ALERTS/.test(html) && /AthMonitoring ath=\{ath\}/.test(html));
  const raw = { id: 'z', wellness: [{ date: K(1), sleep: '4', painMap: { Diz: 'Orta' } }], srpeLog: [{ date: K(1), tpRPE: '7', tpDuration: '60' }], nightLog: [{ date: K(1), bedTime: '23:00', wakeTime: '07:00' }], days: {}, injuries: [] };
  const b = JSON.stringify(raw); const M = A.monBuild(raw, { cfg: C(), today: K(3) }); A.monSummary(M, raw, A.monDN(K(3)), 'pencere');
  check('Mevcut ham veriler hesaplama sonrası değişmiyor', JSON.stringify(raw) === b);
  check('Her yapılandırma parametresinin açıklaması var', A.MON_CFG_DOC.every(([k]) => k in A.MON_CFG));
}

console.log(`\n${'─'.repeat(64)}\n  ${pass} geçti, ${fail} kaldı\n${'─'.repeat(64)}`);
process.exit(fail ? 1 : 0);
