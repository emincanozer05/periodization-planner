/* ═══════════════════════════════════════════════════════════════════════════
   SPORCU İZLEME — YAPILANDIRMA (CoachOS revizyon talimatı v1.4, §0.7 · §3.4)

   Sporcu İzleme'nin (424 hesap motoru, 428b arayüz) bütün mühendislik ve gösterim
   parametreleri tek yerde, açıklamalarıyla. Hesap kodu sayı gömmez: her işlev bu nesneyi
   (`cfg`) parametre olarak alır, testler kendi yapılandırmasını açıkça enjekte eder.

   Bu değerlerin HİÇBİRİ sakatlık riski eşiği değildir ve arayüzde öyle sunulmaz. Hepsi
   başlangıç mühendislik varsayılanıdır; literatürde doğrulanmış eşik değildir, ayarlanabilir.
   Bir değeri değiştirmek kullanıcının açık kararıdır: rapor ya da çalışma zamanı bu nesneyi
   hiçbir koşulda değiştirmez (dondurulmuş).
   ═══════════════════════════════════════════════════════════════════════════ */
const monDeepFreeze=o=>{if(o&&typeof o==='object'&&!Object.isFrozen(o)){Object.values(o).forEach(monDeepFreeze);Object.freeze(o);}return o;};
const MON_CFG=monDeepFreeze({
  /* §3.4 — kişisel referans (z-skor) */
  REFERANS_GUN:28,
  Z_MIN_GOZLEM_GUNLUK:14,
  Z_MIN_NEFF_GUNLUK:8,
  Z_MIN_NEFF_PENCERE:6,
  RHO_MAX:0.9,
  RHO_MIN_CIFT:10,
  PENCERE_GERI_BAKIS_GUN:56,
  PENCERE_MIN_KAPSAM:0.8,
  Z_PENCERE_K:7,
  PENCERE_K:[3,7],
  SIGMA_MIN_GUNLUK:{uykuSa:0.25,olcek5:0.5,seansRpe:0.5,yukOran:0.1,yukMinAU:50,maruziyetDk:10,monotoni:0.1,strainAU:100},
  SIGMA_MIN_PENCERE_KAT:0.5,
  GUN_TIPI_AYRIMI:true,
  HAM_EGILIM_PENCERE_GUN:7,
  HAM_EGILIM_MIN_NOKTA:4,
  HAM_MIN_GOZLEM:2,
  GOSTERIM_Z_ESIGI:1,
  /* §4.1 — olumsuz eğilim gösterimi */
  EGILIM_GUN_ESIGI_SS:0.5,
  EGILIM_MIN_ARDISIK_GUN:3,
  EGILIM_MIN_BIRIKIMLI:2,
  /* §5 — sRPE ve antrenman yükü */
  HAFTA_GUN:7,
  YUK_UZUN_GUN:28,
  HAFTALIK_KARSILASTIRMA_HAFTA:4,
  HAFTALIK_MIN_HAFTA:3,
  SS_TANIMI:'populasyon',
  /* §6 — EWMA / ACWR */
  EWMA_AKUT_GUN:7,
  EWMA_KRONIK_GUN:28,
  EWMA_U_MAX:0.1,
  KRONIK_SIFIR_EPS:1,
  EWMA_SEED:'ilk_n_ortalama',
  EWMA_SEED_N:7,
  /* §8 — ağrı. Ölçek 5 = hiç ağrı yok … 1 = çok şiddetli. Check-in formu bölge başına
     1 Hafif · 2 Orta · 3 Yüksek tutuyor; kullanıcı onayıyla (v1.4 §8.1) yalnızca hesap
     katmanında 1→4, 2→3, 3→2 eşleniyor, bölgesi boş gönderilen check-in 5 sayılıyor.
     Ham kayıt değişmiyor. Şiddeti sorulmamış eski bölge kaydı (0) "şiddet bilinmiyor". */
  AGRI_YON:'dusuk_kotu',
  AGRI_OLCEK:[1,5],
  AGRI_ESLEME:{1:4,2:3,3:2},
  AGRI_FORM_SIDDET:[0,1,2,3],
  AGRI_GERI_BAKIS_GUN:3,
  AGRI_ZAMAN_CIZELGESI_GUN:14,
  APOFIZ_BOLGE:['diz önü','topuk','aşil','kalça','kasık','dirsek','sakrum','ön bacak'],
  /* §3A.4 — ölçüm güvenilirliği işaretleri (doğrulanmamış sezgisel kurallar) */
  R2_TEKRAR_GUN:7,
  R3_GECIKME_SAAT:24,
  R6_Z_ESIGI:3,
  BOY_OLCUM_HATASI_CM:0.5,
  /* §3B — Sınıf G (fiziksel/mantıksal geçersizlik). Ölçek sınırları veri modelinden:
     check-in sorguları 1-5, RPE CR-10 (0-10), uyku saati 0-24. */
  WELLNESS_OLCEK:[1,5],
  RPE_OLCEK:[0,10],
  G_MAX_SEANS_DK:1440,
  G_MAX_GUN_DK:1440,
  G_UYKU_SA:[0,24],
  BOY_MANTIKSAL_ARALIK_CM:[80,250],
  KILO_MANTIKSAL_ARALIK_KG:[20,250],
  /* §10 — büyüme ve olgunlaşma */
  BOY_MIN_ARALIK_GUN:21,
  BOY_MIN_OLCUM:3,
  BOY_KAYAN_N:2,
  PHV_YAS:[8,18],
  /* §4 — yaşa uygun uyku önerisi (Paruthi 2016, AASM): yalnızca bilgilendirici çizgi */
  UYKU_YAS_ONERI:[{yas:[6,12],sa:[9,12]},{yas:[13,18],sa:[8,10]}],
  /* §3.6 — pilot referans yeterlilik raporu */
  RAPOR_GUN:120,
  RAPOR_EN_DUSUK_N:5,
  RAPOR_UYUM_BANTLARI:[0,0.55,0.65,0.75,0.85,0.95,1],
  /* Gösterim aralıkları (grafik genişliği) */
  GRAFIK_GUN:28,
  ACWR_GRAFIK_GUN:56,
});

/* Her parametrenin açıklaması — "Yöntem ve ayarlar" tablosu ve belge bu listeden okunur. */
const MON_CFG_DOC=[
  ['REFERANS_GUN','Günlük referans penceresi (değerlendirilen günden önceki takvim günü)','Daily reference window (calendar days before the evaluated day)'],
  ['Z_MIN_GOZLEM_GUNLUK','Referansta minimum geçerli gözlem (ham)','Minimum valid observations in a reference (raw)'],
  ['Z_MIN_NEFF_GUNLUK','Günlük referansta minimum etkin örneklem','Minimum effective sample in a daily reference'],
  ['Z_MIN_NEFF_PENCERE','Pencere referansında minimum etkin örneklem','Minimum effective sample in a window reference'],
  ['RHO_MAX','ρ̂ üst kırpma','Upper clip of ρ̂'],
  ['RHO_MIN_CIFT','ρ̂ kestirimi için minimum bitişik geçerli çift','Minimum adjacent valid pairs to estimate ρ̂'],
  ['PENCERE_GERI_BAKIS_GUN','k-günlük pencere referansları için geriye bakış','Look-back for k-day window references'],
  ['PENCERE_MIN_KAPSAM','Bir ortalama penceresinde minimum geçerli gün oranı','Minimum share of valid days in a mean window'],
  ['Z_PENCERE_K','Pencere ölçeğindeki z-skorun gün sayısı','Days in the window-scale z-score'],
  ['PENCERE_K','Ham modda gösterilen hareketli ortalamalar','Moving averages shown in raw mode'],
  ['SIGMA_MIN_GUNLUK','Birime uygun minimum SS: uyku 0,25 sa; 1-5 ölçek 0,5; seans RPE 0,5; günlük yük kişisel ortalamanın %10’u veya 50 AU (büyüğü)','Unit-appropriate minimum SD: sleep 0.25 h; 1-5 scales 0.5; session RPE 0.5; daily load 10% of personal mean or 50 AU (larger)'],
  ['SIGMA_MIN_PENCERE_KAT','Pencere ortalamaları için σ_min = günlük σ_min × bu kat','Window σ_min = daily σ_min × this factor'],
  ['GUN_TIPI_AYRIMI','Günlük yük referansı gün tipine göre (antrenman / maç); dinlenme gününde z yok','Daily-load reference by day type (training / match); no z on a rest day'],
  ['HAM_EGILIM_PENCERE_GUN','Ham eğilim eğimi için geriye bakış (geçerli gün)','Look-back for the raw trend slope (valid days)'],
  ['HAM_EGILIM_MIN_NOKTA','Ham eğilim eğimi için minimum geçerli nokta','Minimum valid points for the raw slope'],
  ['HAM_MIN_GOZLEM','Ham değişim gösterimi için minimum geçerli gözlem','Minimum valid observations for raw change'],
  ['GOSTERIM_Z_ESIGI','"Kişisel aralığın üstünde/altında" vurgusu için |z| (gösterim ayarı)','|z| for the "above/below personal range" emphasis (display setting)'],
  ['EGILIM_GUN_ESIGI_SS','Bir günün "olumsuz" sayılması için minimum yönlü sapma (SS)','Minimum directional deviation (SD) for a "negative" day'],
  ['EGILIM_MIN_ARDISIK_GUN','Eğilim gösterimi için minimum ardışık olumsuz gün','Minimum consecutive negative days for a trend'],
  ['EGILIM_MIN_BIRIKIMLI','Eğilim gösterimi için minimum birikimli sapma (SS)','Minimum cumulative deviation (SD) for a trend'],
  ['HAFTA_GUN','Haftalık toplam, monotoni ve strain penceresi (gün)','Window of weekly total, monotony and strain (days)'],
  ['YUK_UZUN_GUN','Uzun dönem toplam yük penceresi (gün)','Long-term total load window (days)'],
  ['HAFTALIK_KARSILASTIRMA_HAFTA','Haftalık değişimde karşılaştırılan önceki hafta sayısı','Previous weeks compared in the weekly change'],
  ['HAFTALIK_MIN_HAFTA','Haftalık değişim için gereken tam bilinen önceki hafta','Fully known previous weeks needed for the weekly change'],
  ['SS_TANIMI','Monotonideki SS: popülasyon (n) — mevcut uygulamanın tanımı korunur','SD in monotony: population (n) — the existing definition is kept'],
  ['EWMA_AKUT_GUN','Akut EWMA: λ = 2/(N+1)','Acute EWMA: λ = 2/(N+1)'],
  ['EWMA_KRONIK_GUN','Kronik EWMA: λ = 2/(N+1)','Chronic EWMA: λ = 2/(N+1)'],
  ['EWMA_U_MAX','Gözlenmemiş ağırlık sınırı U_t = başlangıç payı + eksik payı','Unobserved-weight limit U_t = start share + missing share'],
  ['KRONIK_SIFIR_EPS','Kronik EWMA bu değerin altındaysa ACWR hesaplanmaz (AU)','Below this chronic EWMA, ACWR is not computed (AU)'],
  ['EWMA_SEED','Standart EWMA seed kuralı: ilk_n_ortalama (akışın ilk N gününün ortalaması) · sifir · ilk_gun. Mevcut uygulamada EWMA yoktu (ACWR 7/28 gün hareketli ortalama oranıydı), bu yüzden talimatın varsayılanı','Standard EWMA seed rule: ilk_n_ortalama (mean of the stream’s first N days) · sifir · ilk_gun. The app had no EWMA before (ACWR was a 7/28-day rolling ratio), so the instruction’s default applies'],
  ['EWMA_SEED_N','Seed için ilk N gün','First N days for the seed'],
  ['AGRI_YON','Ağrı ölçeğinin yönü: düşük değer kötü (5 = hiç ağrı yok)','Pain scale direction: low is worse (5 = no pain)'],
  ['AGRI_ESLEME','Check-in bölge şiddeti → 5’li ölçek (onaylı gösterim eşlemesi): Hafif→4, Orta→3, Yüksek→2','Check-in region severity → 5-point scale (approved display mapping): Mild→4, Moderate→3, High→2'],
  ['AGRI_GERI_BAKIS_GUN','Ağrı karşılaştırmasında aynı bölgenin önceki kaydı için geriye bakış (gün)','Look-back for the same region’s previous pain record (days)'],
  ['R2_TEKRAR_GUN','R2: öznel ölçekte aynı değerin art arda tekrarı (gün)','R2: same value repeated in a subjective scale (days)'],
  ['R3_GECIKME_SAAT','R3: sRPE seans gününün bitişinden bu kadar saat sonra girildiyse işaret','R3: flag an sRPE entered this many hours after the session day'],
  ['R6_Z_ESIGI','R6: sıra dışı geçerli değer (Sınıf S) için |z| — yalnızca bilgi işareti','R6: |z| for an unusual valid value (Class S) — information only'],
  ['BOY_OLCUM_HATASI_CM','R5: ardışık boy ölçümünde ölçüm hatası aralığı (cm)','R5: height measurement error band (cm)'],
  ['G_MAX_SEANS_DK','G2: tek seans süresi üst sınırı (dk)','G2: single-session duration limit (min)'],
  ['G_MAX_GUN_DK','G2: aynı günün toplam seans süresi üst sınırı (dk)','G2: same-day total duration limit (min)'],
  ['BOY_MANTIKSAL_ARALIK_CM','G6: boy mantıksal aralığı (cm)','G6: logical height range (cm)'],
  ['KILO_MANTIKSAL_ARALIK_KG','G6: kilo mantıksal aralığı (kg)','G6: logical body-mass range (kg)'],
  ['BOY_MIN_ARALIK_GUN','Büyüme hızı: ölçümler arası minimum süre (gün)','Growth velocity: minimum days between measurements'],
  ['BOY_MIN_OLCUM','Büyüme hızı için minimum ölçüm','Minimum measurements for growth velocity'],
  ['BOY_KAYAN_N','Büyüme hızının kayan ortalamasındaki ardışık hız sayısı','Consecutive velocities in the growth-velocity moving average'],
  ['RAPOR_GUN','Veri yeterliliği raporunun dönemi (bugünle biten gün)','Period of the data adequacy report (days ending today)'],
];
