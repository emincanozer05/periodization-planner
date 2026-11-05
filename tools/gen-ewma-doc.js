/* ═══════════════════════════════════════════════════════════════════════════
   EWMA YÖNTEM BELGESİ — docs/ewma_yontem_belgesi.md'yi uygulamanın kendi koduyla üretir
   (revizyon talimatı v1.4 §6.4). Tablolar elle yazılmaz: index.html'deki monEwmaStandard /
   monEwmaAdjusted çalıştırılır, sayılar buradan çıkar.

   Çalıştırma:  node tools/gen-ewma-doc.js          belgeyi yaz
                node tools/gen-ewma-doc.js --check  belge güncel mi (CI)
   ═══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const { loadApp } = require('./load-app.js');
const A = loadApp(['MON_CFG', 'monEwmaStandard', 'monEwmaAdjusted', 'monEwmaPoints', 'monLam', 'monSeed', 'monTransitions']);
const cfg = A.MON_CFG;
const f = (v, d) => (v == null ? '—' : v.toFixed(d == null ? 4 : d).replace('.', ','));
const Ts = [9, 10, 20, 33, 40, 60, 90, 180];
let s = 99;
const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const SERIES = {
  'sabit 100 AU': () => Array(180).fill(100),
  'basamak (60 gün 100 → 200 AU)': () => Array.from({ length: 180 }, (_, i) => (i < 60 ? 100 : 200)),
  'haftalık desen (300·0·500·0·400·600·0)': () => Array.from({ length: 180 }, (_, i) => [300, 0, 500, 0, 400, 600, 0][i % 7]),
  'sabit tohumlu rastgele (400 ± 150 AU, tohum 99)': () => { s = 99; return Array.from({ length: 180 }, () => Math.max(0, Math.round(400 + 150 * gauss()))); },
};
const SEEDS = { sifir: '0', ilk_n_ortalama: `ilk ${cfg.EWMA_SEED_N} günün ortalaması`, ilk_gun: 'ilk günün değeri' };
const lamA = A.monLam(cfg.EWMA_AKUT_GUN), lamC = A.monLam(cfg.EWMA_KRONIK_GUN);
const out = [];
const P = (...l) => out.push(...l);
P('# EWMA yöntem belgesi — Standart ve Uyarlanmış EWMA', '',
  '> Bu dosya `node tools/gen-ewma-doc.js` ile **uygulamanın kendi kodundan** (index.html → `monEwmaStandard`, `monEwmaAdjusted`) üretilir; elle düzenlenmez. CoachOS revizyon talimatı v1.4 §6.',
  '', '## Formüller', '',
  '```',
  `λ_akut   = 2/(${cfg.EWMA_AKUT_GUN}+1) = ${f(lamA)}      λ_kronik = 2/(${cfg.EWMA_KRONIK_GUN}+1) = ${f(lamC)}`,
  'Standart     E₀ = seed;  E_t = λ·x_t + (1−λ)·E_(t−1)        (akışın başından t’ye TÜM günler bilinmeli)',
  'Uyarlanmış   Ê_t = Σ_bilinen w_k·x_(t−k) / Σ_bilinen w_k,  w_k = λ(1−λ)^k   (bilinmeyen gün ne değer ne ağırlık katar)',
  'U_t          = başlangıç_payı + eksik_payı;  başlangıç_payı = (1−λ)^T;  eksik_payı = Σ w_k (k: bilinmeyen / geçersiz gün)',
  `Geçerlilik   U_t ≤ EWMA_U_MAX (${f(cfg.EWMA_U_MAX, 2)});  ACWR = akut / kronik, ikisi de geçerli ve kronik ≥ KRONIK_SIFIR_EPS (${cfg.KRONIK_SIFIR_EPS} AU)`,
  '```', '',
  '- **Seçim kuralı:** seri baştan tam biliniyorsa `STANDART`, en az bir bilinmeyen gün varsa `UYARLANMIS`. İki yöntem sessizce birbirinin yerine kullanılmaz; her nokta `yontem`, `baslangic_payi`, `eksik_payi` taşır.',
  '- **ACWR bileşen tutarlılığı:** akut ve kronikten biri uyarlanmışsa ACWR’ın iki bileşeni de uyarlanmış formülle hesaplanır; etiket `UYARLANMIS`.',
  `- **Seed kuralı:** mevcut uygulamada EWMA yoktu (ACWR 7/28 günlük hareketli ortalama oranıydı), bu yüzden talimatın varsayılanı: \`EWMA_SEED = ${cfg.EWMA_SEED}\` (akışın ilk ${cfg.EWMA_SEED_N} gününün ortalaması). Akış, sporcunun ilk yüklü günüyle başlar.`,
  '- **Doğrulanmış dinlenme günü** (kullanıcı onayı: geçmiş günde takvimde seans yok ve sRPE kaydı yok) x = 0 ile bilinen gün olarak girer; kayıtsız / seansı olup yükü olmayan / Sınıf G gün bilinmiyor: ne sıfır ne atlama.',
  '', '## Özdeşlikler (§6.2-6.3)', '',
  '```',
  'E_t = (1−λ)^T·seed + Σ_(k=0..T−1) λ(1−λ)^k·x_(t−k)              → seed’in payı (1−λ)^T',
  'İki seed farkı:  E_t(seed₁) − E_t(seed₂) = (1−λ)^T·(seed₁ − seed₂)',
  'Tam bilinen seride:  E_t = (1−λ)^T·seed + (1−(1−λ)^T)·Ê_t   ⇒   E_t − Ê_t = (1−λ)^T·(seed − Ê_t)',
  '```', '', 'Üçü de `monitor-test.js`’te 1e-9 toleransla sınanır.', '',
  '## Başlangıç payı (eksik gün yokken)', '', '| T (gün) | akut (1−λ)^T | kronik (1−λ)^T | akut geçerli | kronik geçerli |', '|---:|---:|---:|:---:|:---:|');
[7, 8, 9, 10, 20, 31, 32, 33, 40, 60].forEach(T => { const a = Math.pow(1 - lamA, T), c = Math.pow(1 - lamC, T);
  P(`| ${T} | ${f(a)} | ${f(c)} | ${a <= cfg.EWMA_U_MAX ? 'evet' : '—'} | ${c <= cfg.EWMA_U_MAX ? 'evet' : '—'} |`); });
P('', `İlk geçerli akut EWMA **9. gün**, ilk geçerli kronik EWMA **33. gün**. Uzak bir bilinmeyen gün tolere edilir (10 gün önce: akut ağırlığı ${f(lamA * Math.pow(1 - lamA, 10))}, kronik ${f(lamC * Math.pow(1 - lamC, 10))}).`, '',
  '## En kötü durum: seed = 0, her gün 100 AU', '', '| Gösterge | Standart (seed 0) | Uyarlanmış | Fark |', '|---|---:|---:|---:|');
{ const a9 = A.monEwmaStandard(Array(9).fill(100), lamA, 0)[8].v, c33 = A.monEwmaStandard(Array(33).fill(100), lamC, 0)[32].v, a33 = A.monEwmaStandard(Array(33).fill(100), lamA, 0)[32].v;
  P(`| Akut EWMA, T = 9 (payı ${f(Math.pow(1 - lamA, 9))}) | ${f(a9, 2)} | 100,00 | ${f((a9 / 100 - 1) * 100, 1)} % |`,
    `| Kronik EWMA, T = 33 (payı ${f(Math.pow(1 - lamC, 33))}) | ${f(c33, 2)} | 100,00 | ${f((c33 / 100 - 1) * 100, 1)} % |`,
    `| ACWR, T = 33 | ${f(a33 / c33, 3)} | 1,000 | +${f((a33 / c33 - 1) * 100, 1)} % |`); }
P('', '> Başlangıç payı eşiğinin (≤ 0,10) sağlanması, ACWR’ın seed’den ≈ %10’a kadar etkilenebileceği anlamına gelir (en kötü durum). Gerçek seed (ilk günlerin ortalaması) genelde sıfırdan çok daha yakındır; bu etki arayüzde `başlangıç payı` olarak görünür. Eşiği sıkılaştırmak (ör. 0,05) kullanıcı kararıdır.', '',
  '## Tam veri üzerinde Standart − Uyarlanmış farkı (§6.4)', '',
  'Her hücre `Standart − Uyarlanmış`; her noktada `|fark| ≤ başlangıç_payı · |seed − Ê| + 1e-9` doğrulanır (monitor-test.js).', '');
let maxViol = 0, nPts = 0;
for (const [name, mk] of Object.entries(SERIES)) {
  const xs = mk();
  P(`### ${name}`, '', '| seed | ölçü | ' + Ts.map(t => `T=${t}`).join(' | ') + ' |', '|---|---|' + Ts.map(() => '---:').join('|') + '|');
  for (const [rule, lbl] of Object.entries(SEEDS)) {
    const sd = A.monSeed(xs, { ...cfg, EWMA_SEED: rule });
    const SA = A.monEwmaStandard(xs, lamA, sd), AA = A.monEwmaAdjusted(xs, lamA), SC = A.monEwmaStandard(xs, lamC, sd), AC = A.monEwmaAdjusted(xs, lamC);
    [[SA, AA], [SC, AC]].forEach(([S, Ad]) => Ts.forEach(T => { nPts++; const i = T - 1; maxViol = Math.max(maxViol, Math.abs(S[i].v - Ad[i].v) - S[i].baslangic * Math.abs(sd - Ad[i].v)); }));
    P(`| ${lbl} (${f(sd, 1)}) | akut | ${Ts.map(T => f(SA[T - 1].v - AA[T - 1].v, 3)).join(' | ')} |`,
      `| | kronik | ${Ts.map(T => f(SC[T - 1].v - AC[T - 1].v, 3)).join(' | ')} |`,
      `| | ACWR | ${Ts.map(T => f(SA[T - 1].v / SC[T - 1].v - AA[T - 1].v / AC[T - 1].v, 4)).join(' | ')} |`);
  }
  P('');
}
P(`Izgara: ${nPts} nokta (akut + kronik), en büyük \`|fark| − payı·|seed − Ê|\` = ${maxViol.toExponential(2)} (≤ 1e-9 olmalı).`, '',
  '## Yöntem geçişi ve yapay değişim (§6.8)', '',
  '```', 'gosterilen_degisim = deger_yeni − deger_onceki', 'tutarli_degisim    = uyarlanmis_yeni − uyarlanmis_onceki', 'yapay_bilesen      = gosterilen − tutarli',
  '  Standart→Uyarlanmış:  yapay = uyarlanmis_onceki − standart_onceki', '  Uyarlanmış→Standart:  yapay = standart_yeni − uyarlanmis_yeni', '```', '');
{ const xs = Array.from({ length: 71 }, (_, i) => (i === 60 ? null : 100)), c0 = { ...cfg, EWMA_SEED: 'sifir' };
  const Ap = A.monEwmaPoints(xs, lamA, 0, c0), Cp = A.monEwmaPoints(xs, lamC, 0, c0);
  const kr = A.monTransitions(Cp.map((p, i) => ({ ...p, tarih: 'gün ' + (i + 1) })))[0];
  P('Elle doğrulanmış fikstür (60 gün sabit 100 AU, seed 0; 61. gün bilinmiyor; 62-71. gün 100 AU):', '',
    `- Kronik EWMA 60 → 61. gün: Standart → Uyarlanmış, tutarlı = ${f(kr.tutarli, 3)}, yapay = 100·(27/29)^60 ≈ ${f(kr.yapay, 3)} AU (gösterilen değişimin tamamı yapay).`,
    `- ACWR: 60. gün Standart ${f(Ap[59].deger / Cp[59].deger)}; 65. gün (ilk geçerli, kesintili) Uyarlanmış ${f(Ap[64].uyarlanmis / Cp[64].uyarlanmis)}. Sabit yükte görünen "ACWR düşüşü" tamamen yapaydır.`,
    '- Kural: geçiş tespit edilir, grafikte nötr dikey işaret + tooltip ("Hesaplama yöntemi değişti …"), değişim hesapları yöntem-tutarlı seriden; eşik yok ("yapay bileşen küçükse yok say" kuralı konmaz). Geçiş Kategori B "yük değişimi" ya da "birlikte sapma" üretmez.', ''); }
P('## MNAR uyarısı (§6.3)', '',
  'Uyarlanmış EWMA’daki yeniden normalizasyon, bilinmeyen günlerin ağırlığını bilinen günlere **orantılı** dağıtır: eksik günlerin yük açısından rastgele eksik olduğunu (bilinenlerle benzer) varsayar. Bilinmeyen günler sistematik olarak düşük yüklüyse (ör. kaydedilmeyen dinlenme günleri) uyarlanmış EWMA yükü **olduğundan yüksek** gösterir. Bu yüzden "doğrulanmış dinlenme günü" kaydı önerilir; CoachOS’ta şu an takvimde seansı olmayan geçmiş gün dinlenme sayılıyor (kullanıcı kararı).', '',
  '## Etiketleme kuralları', '',
  '- `STANDART` noktalar düz çizgi, `UYARLANMIS` noktalar kesikli çizgi; açıklamada "uyarlanmış (eksik veri içeren dönem)".',
  '- Geçersiz günde (U_t > EWMA_U_MAX, kronik ≈ 0) değer üretilmez, çizgi kesilir; üzerine gelince neden kodu, yöntem ve paylar görünür.',
  '- Sabit sınıflandırmalar (0,8-1,3 "güvenli", 1,5 üstü "yüksek risk") Sporcu İzleme’de yoktur; ACWR yük değişiminin yardımcı göstergesidir (Kategori B), sağlık bulgusu değildir.',
  '- Denetim modu: tam bilinen dönemde her noktada iki yöntemin farkı `denetim_fark` alanına yazılır (arayüzde gösterilmez).',
  '', '## Kaynak', '', 'Williams 2017; Murray 2017 (EWMA); Impellizzeri 2020; Lolli 2019 (ACWR eleştirileri). Uyarlanmış EWMA ve `EWMA_U_MAX` kuralı bu belgede tanımlanmış **mühendislik** çözümüdür; literatürde doğrulanmış bir yöntem veya eşik değildir.', '');
const doc = out.join('\n');
const file = path.join(__dirname, '..', 'docs', 'ewma_yontem_belgesi.md');
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  if (cur !== doc) { console.error('docs/ewma_yontem_belgesi.md güncel değil: node tools/gen-ewma-doc.js'); process.exit(1); }
  console.log('ok   docs/ewma_yontem_belgesi.md güncel'); process.exit(0);
}
fs.writeFileSync(file, doc);
console.log('yazıldı: docs/ewma_yontem_belgesi.md (' + (maxViol <= 1e-9 ? 'ızgara geçti' : 'IZGARA KALDI') + ')');
process.exit(maxViol <= 1e-9 ? 0 : 1);
