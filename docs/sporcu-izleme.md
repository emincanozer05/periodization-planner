# Sporcu İzleme — revizyon raporu (CoachOS revizyon talimatı v1.4)

Wellness → sporcu sayfasındaki **Uyku ve HRV** bölümü kaldırıldı; yerine **Sporcu İzleme** geldi
(`src/app/423-monitor-config.jsx`, `424-monitor-engine.jsx`, `428b-athlete-monitoring.jsx`,
`src/19l-monitoring.css`). Sınama: `node monitor-test.js` (105 test). EWMA belgesi:
[`ewma_yontem_belgesi.md`](ewma_yontem_belgesi.md) (`node tools/gen-ewma-doc.js`).

Sistem sakatlık olasılığı tahmin etmez, teşhis koymaz, bileşik risk puanı üretmez.

## 1. Mevcut durum → spesifikasyon eşlemesi

| Konu | Önce | Şimdi |
|---|---|---|
| Uyku ve HRV bölümü | HRV v1.0: RED / YELLOW / DAILY_DROP uyarıları, kırmızı-sarı-yeşil renkler, sabit SS eşikleri | Kaldırıldı (UI + `hrvModel` + testleri). Ham `nightLog` (HRV dahil) duruyor; gece verisi formu Sporcu İzleme → Toparlanma'ya taşındı |
| Kişisel referans | Yok (HRV'de 28 gün ≥ 21 gece) | §3: 28 takvim günü, değerlendirilen gün hariç; ρ̂ (bitişik çiftler), n_eff, çifte yeterlilik koşulu, pencere referansı (örtüşmeyen, D_ref/k), σ_min, ölçek etiketi + uyuşmazlıkta hata |
| Yetersiz referans | — | §3.5: ham fark, 3/7 günlük ortalama, yüzde değişim, takvim günü eksenli OLS eğimi + mini grafik; z / sapma / eğilim etiketi yok |
| Olumsuz eğilim | — | §4.1: ardışık gün **ve** birikimli sapma; büyüklükle birlikte; tooltip "sakatlık riski eşiği değildir" |
| sRPE yükü | `athDayLoad` (eksik gün = 0) | §5: bilinmeyen gün sıfır değil; 7/28 günlük toplam, monotoni, strain pencerenin tamamı bilinirse; haftalık değişim (≥ 3/4 tam hafta), yüzde, otomatik uyarı yok |
| ACWR | 7 / 28 günlük hareketli ortalama oranı + "Optimal / Caution / High risk" | Sporcu İzleme'de §6: Standart ve Uyarlanmış EWMA ayrı işlevler, U_t ≤ 0,10, bileşen tutarlılığı, yöntem geçişi ayrıştırması (gosterilen = tutarlı + yapay), nötr grafik |
| Ağrı | Bölge × şiddet (1 Hafif · 2 Orta · 3 Yüksek), renkli | §8: onaylı gösterim eşlemesi, 5 = ağrısız, durum ifadeleri (yeni ağrı bildirimi / yeni bildirilen / artış / devam / azalma / dönüş), 14 günlük zaman çizelgesi, istatistik yok |
| Kategoriler | — | §11: A sağlık uyarıları (yalnızca ağrı + aktif sakatlık), B yük ve performans, C toparlanma, bağlam kartı; kategoriler toplanmaz; birlikte sapma kategori içinde ve yalnızca yeterli referanslı göstergelerle |
| Veri durumu | — | §3A: doluluk · hesaplanabilirlik · güvenilirlik (R1-R6) ayrı satır; Sınıf G doğrulama kuyruğu (salt okunur) |
| Pilot rapor | — | §3.6: Wellness takım görünümünde "Veri yeterliliği" (son 120 gün), .md indirme; yapılandırmaya yazmaz |

## 2. Kullanıcı kararları (talimatın "dur, raporla, onay iste" maddeleri)

1. **Ağrı ölçeği (§8.1) uyuşmuyordu.** Form bölge başına 1 Hafif · 2 Orta · 3 Yüksek tutuyor (büyük sayı kötü), boş bölge "ağrı yok" demek ("Ağrın yoksa bu bölümü boş bırak"). Onaylı çözüm, **yalnızca hesap katmanında**: check-in var + bölge boş → 5; Hafif → 4, Orta → 3, Yüksek → 2. Formda "1 çok şiddetli" karşılığı yok. Şiddeti sorulmamış eski bölge kayıtları "ağrı var, şiddet bilinmiyor". Check-in yoksa bilinmiyor. Ham kayıtlar değişmedi.
2. **Doğrulanmış dinlenme günü (§3A.1).** Veri modelinde ayrı alan yok. Onaylı kural: geçmiş bir günde sporcunun takviminde seans yoksa ve sRPE kaydı da yoksa doğrulanmış dinlenme (0 AU). Seans var ama RPE/AU yoksa bilinmiyor. Akışın ilk yüklü gününden önce dinlenme çıkarılmaz. Ekranda not olarak yazıyor (takvimin kullanılmadığı dönemde yük olduğundan düşük görünebilir).
3. **Kapsam.** Yalnızca Wellness sporcu sayfası. Diğer ekranlar aşağıda (açık sorular).

## 3. Veri envanteri ve eksik alanlar (eklenmedi, öneri)

| Gerekli bilgi | Durum | Eklenirse ne kazandırır |
|---|---|---|
| Stres (ayrı madde) | Yok — check-in'in "mental stres/yorgunluk" sorusu tek madde | Stres ile zihinsel yorgunluğu ayırır |
| Genel iyilik hâli | Yok (`GEREKLI_ALAN_YOK`) | Talimatın 4. wellness maddesi |
| Gece / dinlenme ağrısı, ağrının hareketle davranışı, ağrı nedeniyle katılım değişikliği | Yok | §8.4 uyarı türleri |
| Katılım durumu (tam / kısıtlı) ve nedeni | Yok | §9 maruziyet bağlamı |
| Tıbbi kısıtlama kaydı | Yok (yalnızca sakatlıkta `actualReturn` boş = aktif) | Kategori A'nın üçüncü kaynağı |
| Gerçek dinlenme günü doğrulaması | Yok (takvimden çıkarılıyor) | ACWR/monotoninin MNAR yanlılığını azaltır |
| sRPE zaman damgası | Check-in formundan gelenlerde var (`submittedAt`), Tally/elle girilenlerde yok → R3 "değerlendirilemiyor" | R3 kontrolü |

Eski tek "yorgunluk" sorusuyla girilmiş kayıtlar zihinsel/fiziksel maddelere aktarılmıyor (aynı değişken iki kez puanlanmasın); sayısı ekranda yazıyor. Türetilmiş "hazır oluş" analize girmiyor (diğer maddelerin ortalaması).

## 4. Doğrulama

- `node monitor-test.js` — 105/105: talimatın §12 listesi (EWMA çekirdeği 164,0; 9./33. gün; 90,54/100 · 92,49/100 · 1,104/1,000; seed ve normalizasyon özdeşlikleri; 192 noktalık tam veri farkı ızgarası (4 seri × 3 seed × akut/kronik × 8 T); ağrı durum tablosu ve yön parametresi; z ölçek eşleştirme ve statik sabit taraması; kategori ayrımı; 3A.5'in beş senaryosu; n_eff 8,0 / pencere 8; çifte koşul; takvim eksenli eğim 1,0; G1-G6 sınır örnekleri; ham kaydın korunması; eğilim fikstürleri; yöntem geçişi fikstürü 1,3739 / −0,0139; pilot rapor oranları ve dondurulmuş config).
- Talimattaki sentetik duyarlılık tablosu (AR(1) ρ = 0,3, bağımsız kayıt olasılığı p) bu uygulamayla yeniden üretildi:

  | p | günlük (belge) | günlük (CoachOS) | 7 günlük (belge) | 7 günlük (CoachOS) |
  |---|---|---|---|---|
  | 0,95 | ≈ 0,97 | 0,98 | ≈ 1,00 | 1,00 |
  | 0,85 | ≈ 0,97 | 0,98 | ≈ 0,80 | 0,79 |
  | 0,75 | ≈ 0,91 | 0,93 | ≈ 0,20 | 0,20 |
  | 0,65 | ≈ 0,67 | 0,61 | ≈ 0,01 | 0,01 |
  | 0,55 | ≈ 0,30 | 0,37 | 0,00 | 0,00 |

  ρ = 0,6'da yüksek uyumda ≈ 0,68-0,72 (belge ≈ 0,7). Kalan farklar Monte Carlo gürültüsü düzeyinde.
- **Pilot veri:** gerçek takım verisine geliştirme ortamından erişim yok; rapor uygulamada (Wellness → en alt → Veri yeterliliği → Raporu hesapla) gerçek veriyle çalışır ve .md olarak indirilir. Gerçek pilot raporu esastır.

## 5. Açık sorular (bu çalışmanın kapsamı dışında bırakıldı)

- **Diğer ekranlardaki sabit eşikler:** Yük Takibi / Sporcu Yük Panosu'nda `acwrZoneOf` (0,8-1,3 "Optimal", 1,5 üstü "High risk"), `getAthleteRisks` (ACWR > 1,5, monotoni > 2, hazır oluş ≤ 2 otomatik uyarıları), `readyColor` ve wellness puanlarının kırmızı-yeşil renkleri duruyor. Talimat bunların hiçbir yerde kalmamasını istiyor; ayrı bir PR'da ele alınmalı.
- **Mevcut ACWR ≠ yeni Standart EWMA (§6.4.4):** uygulamada EWMA yoktu; ACWR 7/28 günlük hareketli ortalama oranı. Bu yüzden "birebir aynı" karşılaştırması yapılamadı. Sporcu İzleme yeni EWMA'yı kullanıyor, diğer ekranlar eski oranı. İkisinin aynı sayıyı göstermesi isteniyorsa diğer ekranların da EWMA'ya geçirilmesi gerekir (onay).
- Başlangıç payı eşiği (`EWMA_U_MAX` 0,10 → ör. 0,05) ve ağrıda 5 → 3 gibi doğrudan düşüşte ek "ağrıda artış" etiketi (varsayılan: hayır) kullanıcı kararı.
