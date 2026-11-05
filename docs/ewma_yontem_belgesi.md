# EWMA yöntem belgesi — Standart ve Uyarlanmış EWMA

> Bu dosya `node tools/gen-ewma-doc.js` ile **uygulamanın kendi kodundan** (index.html → `monEwmaStandard`, `monEwmaAdjusted`) üretilir; elle düzenlenmez. CoachOS revizyon talimatı v1.4 §6.

## Formüller

```
λ_akut   = 2/(7+1) = 0,2500      λ_kronik = 2/(28+1) = 0,0690
Standart     E₀ = seed;  E_t = λ·x_t + (1−λ)·E_(t−1)        (akışın başından t’ye TÜM günler bilinmeli)
Uyarlanmış   Ê_t = Σ_bilinen w_k·x_(t−k) / Σ_bilinen w_k,  w_k = λ(1−λ)^k   (bilinmeyen gün ne değer ne ağırlık katar)
U_t          = başlangıç_payı + eksik_payı;  başlangıç_payı = (1−λ)^T;  eksik_payı = Σ w_k (k: bilinmeyen / geçersiz gün)
Geçerlilik   U_t ≤ EWMA_U_MAX (0,10);  ACWR = akut / kronik, ikisi de geçerli ve kronik ≥ KRONIK_SIFIR_EPS (1 AU)
```

- **Seçim kuralı:** seri baştan tam biliniyorsa `STANDART`, en az bir bilinmeyen gün varsa `UYARLANMIS`. İki yöntem sessizce birbirinin yerine kullanılmaz; her nokta `yontem`, `baslangic_payi`, `eksik_payi` taşır.
- **ACWR bileşen tutarlılığı:** akut ve kronikten biri uyarlanmışsa ACWR’ın iki bileşeni de uyarlanmış formülle hesaplanır; etiket `UYARLANMIS`.
- **Seed kuralı:** mevcut uygulamada EWMA yoktu (ACWR 7/28 günlük hareketli ortalama oranıydı), bu yüzden talimatın varsayılanı: `EWMA_SEED = ilk_n_ortalama` (akışın ilk 7 gününün ortalaması). Akış, sporcunun ilk yüklü günüyle başlar.
- **Doğrulanmış dinlenme günü** (kullanıcı onayı: geçmiş günde takvimde seans yok ve sRPE kaydı yok) x = 0 ile bilinen gün olarak girer; kayıtsız / seansı olup yükü olmayan / Sınıf G gün bilinmiyor: ne sıfır ne atlama.

## Özdeşlikler (§6.2-6.3)

```
E_t = (1−λ)^T·seed + Σ_(k=0..T−1) λ(1−λ)^k·x_(t−k)              → seed’in payı (1−λ)^T
İki seed farkı:  E_t(seed₁) − E_t(seed₂) = (1−λ)^T·(seed₁ − seed₂)
Tam bilinen seride:  E_t = (1−λ)^T·seed + (1−(1−λ)^T)·Ê_t   ⇒   E_t − Ê_t = (1−λ)^T·(seed − Ê_t)
```

Üçü de `monitor-test.js`’te 1e-9 toleransla sınanır.

## Başlangıç payı (eksik gün yokken)

| T (gün) | akut (1−λ)^T | kronik (1−λ)^T | akut geçerli | kronik geçerli |
|---:|---:|---:|:---:|:---:|
| 7 | 0,1335 | 0,6064 | — | — |
| 8 | 0,1001 | 0,5646 | — | — |
| 9 | 0,0751 | 0,5256 | evet | — |
| 10 | 0,0563 | 0,4894 | evet | — |
| 20 | 0,0032 | 0,2395 | evet | — |
| 31 | 0,0001 | 0,1091 | evet | — |
| 32 | 0,0001 | 0,1016 | evet | — |
| 33 | 0,0001 | 0,0946 | evet | evet |
| 40 | 0,0000 | 0,0574 | evet | evet |
| 60 | 0,0000 | 0,0137 | evet | evet |

İlk geçerli akut EWMA **9. gün**, ilk geçerli kronik EWMA **33. gün**. Uzak bir bilinmeyen gün tolere edilir (10 gün önce: akut ağırlığı 0,0141, kronik 0,0338).

## En kötü durum: seed = 0, her gün 100 AU

| Gösterge | Standart (seed 0) | Uyarlanmış | Fark |
|---|---:|---:|---:|
| Akut EWMA, T = 9 (payı 0,0751) | 92,49 | 100,00 | -7,5 % |
| Kronik EWMA, T = 33 (payı 0,0946) | 90,54 | 100,00 | -9,5 % |
| ACWR, T = 33 | 1,104 | 1,000 | +10,4 % |

> Başlangıç payı eşiğinin (≤ 0,10) sağlanması, ACWR’ın seed’den ≈ %10’a kadar etkilenebileceği anlamına gelir (en kötü durum). Gerçek seed (ilk günlerin ortalaması) genelde sıfırdan çok daha yakındır; bu etki arayüzde `başlangıç payı` olarak görünür. Eşiği sıkılaştırmak (ör. 0,05) kullanıcı kararıdır.

## Tam veri üzerinde Standart − Uyarlanmış farkı (§6.4)

Her hücre `Standart − Uyarlanmış`; her noktada `|fark| ≤ başlangıç_payı · |seed − Ê| + 1e-9` doğrulanır (monitor-test.js).

### sabit 100 AU

| seed | ölçü | T=9 | T=10 | T=20 | T=33 | T=40 | T=60 | T=90 | T=180 |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 (0,0) | akut | -7,508 | -5,631 | -0,317 | -0,008 | -0,001 | -0,000 | -0,000 | -0,000 |
| | kronik | -52,564 | -48,939 | -23,951 | -9,460 | -5,736 | -1,374 | -0,161 | -0,000 |
| | ACWR | 0,9498 | 0,8482 | 0,3108 | 0,1044 | 0,0608 | 0,0139 | 0,0016 | 0,0000 |
| ilk 7 günün ortalaması (100,0) | akut | 0,000 | 0,000 | 0,000 | 0,000 | 0,000 | 0,000 | 0,000 | 0,000 |
| | kronik | 0,000 | 0,000 | 0,000 | -0,000 | -0,000 | -0,000 | -0,000 | -0,000 |
| | ACWR | -0,0000 | -0,0000 | -0,0000 | 0,0000 | 0,0000 | 0,0000 | 0,0000 | 0,0000 |
| ilk günün değeri (100,0) | akut | 0,000 | 0,000 | 0,000 | 0,000 | 0,000 | 0,000 | 0,000 | 0,000 |
| | kronik | 0,000 | 0,000 | 0,000 | -0,000 | -0,000 | -0,000 | -0,000 | -0,000 |
| | ACWR | -0,0000 | -0,0000 | -0,0000 | 0,0000 | 0,0000 | 0,0000 | 0,0000 | 0,0000 |

### basamak (60 gün 100 → 200 AU)

| seed | ölçü | T=9 | T=10 | T=20 | T=33 | T=40 | T=60 | T=90 | T=180 |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 (0,0) | akut | -7,508 | -5,631 | -0,317 | -0,008 | -0,001 | -0,000 | -0,000 | -0,000 |
| | kronik | -52,564 | -48,939 | -23,951 | -9,460 | -5,736 | -1,374 | -0,303 | -0,001 |
| | ACWR | 0,9498 | 0,8482 | 0,3108 | 0,1044 | 0,0608 | 0,0139 | 0,0017 | 0,0000 |
| ilk 7 günün ortalaması (100,0) | akut | 0,000 | 0,000 | 0,000 | 0,000 | 0,000 | 0,000 | -0,000 | -0,000 |
| | kronik | 0,000 | 0,000 | 0,000 | -0,000 | -0,000 | -0,000 | -0,142 | -0,000 |
| | ACWR | -0,0000 | -0,0000 | -0,0000 | 0,0000 | 0,0000 | 0,0000 | 0,0008 | 0,0000 |
| ilk günün değeri (100,0) | akut | 0,000 | 0,000 | 0,000 | 0,000 | 0,000 | 0,000 | -0,000 | -0,000 |
| | kronik | 0,000 | 0,000 | 0,000 | -0,000 | -0,000 | -0,000 | -0,142 | -0,000 |
| | ACWR | -0,0000 | -0,0000 | -0,0000 | 0,0000 | 0,0000 | 0,0000 | 0,0008 | 0,0000 |

### haftalık desen (300·0·500·0·400·600·0)

| seed | ölçü | T=9 | T=10 | T=20 | T=33 | T=40 | T=60 | T=90 | T=180 |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 (0,0) | akut | -14,688 | -15,557 | -1,082 | -0,019 | -0,003 | -0,000 | -0,000 | -0,000 |
| | kronik | -119,152 | -129,001 | -67,995 | -23,981 | -14,554 | -3,338 | -0,448 | -0,001 |
| | ACWR | 0,8197 | 0,8889 | 0,3736 | 0,1049 | 0,0611 | 0,0118 | 0,0020 | 0,0000 |
| ilk 7 günün ortalaması (257,1) | akut | 4,620 | -1,076 | -0,267 | 0,000 | 0,000 | 0,000 | -0,000 | -0,000 |
| | kronik | 16,014 | -3,157 | -6,408 | 0,344 | 0,197 | 0,195 | -0,033 | 0,000 |
| | ACWR | -0,0379 | 0,0086 | 0,0268 | -0,0014 | -0,0008 | -0,0007 | 0,0001 | -0,0000 |
| ilk günün değeri (300,0) | akut | 7,838 | 1,337 | -0,131 | 0,003 | 0,000 | 0,000 | -0,000 | -0,000 |
| | kronik | 38,541 | 17,817 | 3,857 | 4,398 | 2,655 | 0,784 | 0,036 | 0,000 |
| | ACWR | -0,0959 | -0,0616 | -0,0166 | -0,0171 | -0,0104 | -0,0027 | -0,0002 | -0,0000 |

### sabit tohumlu rastgele (400 ± 150 AU, tohum 99)

| seed | ölçü | T=9 | T=10 | T=20 | T=33 | T=40 | T=60 | T=90 | T=180 |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 (0,0) | akut | -23,590 | -18,495 | -1,315 | -0,034 | -0,005 | -0,000 | -0,000 | -0,000 |
| | kronik | -185,239 | -173,495 | -92,696 | -39,396 | -25,626 | -5,627 | -0,671 | -0,001 |
| | ACWR | 0,8468 | 0,7858 | 0,3329 | 0,1125 | 0,0661 | 0,0147 | 0,0017 | 0,0000 |
| ilk 7 günün ortalaması (395,9) | akut | 6,133 | 3,797 | -0,060 | -0,004 | -0,001 | -0,000 | -0,000 | -0,000 |
| | kronik | 22,841 | 20,235 | 2,114 | -1,950 | -2,919 | -0,188 | -0,033 | -0,000 |
| | ACWR | -0,0379 | -0,0399 | -0,0060 | 0,0051 | 0,0071 | 0,0005 | 0,0001 | 0,0000 |
| ilk günün değeri (962,0) | akut | 48,642 | 35,678 | 1,736 | 0,039 | 0,005 | 0,000 | 0,000 | -0,000 |
| | kronik | 320,431 | 297,301 | 137,709 | 51,605 | 29,557 | 7,590 | 0,879 | 0,001 |
| | ACWR | -0,3523 | -0,3678 | -0,2779 | -0,1187 | -0,0674 | -0,0192 | -0,0023 | -0,0000 |

Izgara: 192 nokta (akut + kronik), en büyük `|fark| − payı·|seed − Ê|` = 1.97e-13 (≤ 1e-9 olmalı).

## Yöntem geçişi ve yapay değişim (§6.8)

```
gosterilen_degisim = deger_yeni − deger_onceki
tutarli_degisim    = uyarlanmis_yeni − uyarlanmis_onceki
yapay_bilesen      = gosterilen − tutarli
  Standart→Uyarlanmış:  yapay = uyarlanmis_onceki − standart_onceki
  Uyarlanmış→Standart:  yapay = standart_yeni − uyarlanmis_yeni
```

Elle doğrulanmış fikstür (60 gün sabit 100 AU, seed 0; 61. gün bilinmiyor; 62-71. gün 100 AU):

- Kronik EWMA 60 → 61. gün: Standart → Uyarlanmış, tutarlı = 0,000, yapay = 100·(27/29)^60 ≈ 1,374 AU (gösterilen değişimin tamamı yapay).
- ACWR: 60. gün Standart 1,0139; 65. gün (ilk geçerli, kesintili) Uyarlanmış 1,0000. Sabit yükte görünen "ACWR düşüşü" tamamen yapaydır.
- Kural: geçiş tespit edilir, grafikte nötr dikey işaret + tooltip ("Hesaplama yöntemi değişti …"), değişim hesapları yöntem-tutarlı seriden; eşik yok ("yapay bileşen küçükse yok say" kuralı konmaz). Geçiş Kategori B "yük değişimi" ya da "birlikte sapma" üretmez.

## MNAR uyarısı (§6.3)

Uyarlanmış EWMA’daki yeniden normalizasyon, bilinmeyen günlerin ağırlığını bilinen günlere **orantılı** dağıtır: eksik günlerin yük açısından rastgele eksik olduğunu (bilinenlerle benzer) varsayar. Bilinmeyen günler sistematik olarak düşük yüklüyse (ör. kaydedilmeyen dinlenme günleri) uyarlanmış EWMA yükü **olduğundan yüksek** gösterir. Bu yüzden "doğrulanmış dinlenme günü" kaydı önerilir; CoachOS’ta şu an takvimde seansı olmayan geçmiş gün dinlenme sayılıyor (kullanıcı kararı).

## Etiketleme kuralları

- `STANDART` noktalar düz çizgi, `UYARLANMIS` noktalar kesikli çizgi; açıklamada "uyarlanmış (eksik veri içeren dönem)".
- Geçersiz günde (U_t > EWMA_U_MAX, kronik ≈ 0) değer üretilmez, çizgi kesilir; üzerine gelince neden kodu, yöntem ve paylar görünür.
- Sabit sınıflandırmalar (0,8-1,3 "güvenli", 1,5 üstü "yüksek risk") Sporcu İzleme’de yoktur; ACWR yük değişiminin yardımcı göstergesidir (Kategori B), sağlık bulgusu değildir.
- Denetim modu: tam bilinen dönemde her noktada iki yöntemin farkı `denetim_fark` alanına yazılır (arayüzde gösterilmez).

## Kaynak

Williams 2017; Murray 2017 (EWMA); Impellizzeri 2020; Lolli 2019 (ACWR eleştirileri). Uyarlanmış EWMA ve `EWMA_U_MAX` kuralı bu belgede tanımlanmış **mühendislik** çözümüdür; literatürde doğrulanmış bir yöntem veya eşik değildir.
