# Senkron Hız Planı — riski sıfıra yaklaştırarak

> **Durum:** R0 tamam → sırada R1 (gerçek cihazda ölçüm) · **Son güncelleme:** 2026-11-22
> Üst plan: [`senkron-gecis-plani.md`](senkron-gecis-plani.md) (kayıt bazlı yapıya geçiş). Bu dosya hız
> işinin tek kaynağıdır; her PR sonunda en alttaki **İlerleme** güncellenir.

## 1. Sorun (ölçüm)

Düzenlemenin maliyeti değişen kayıt kadar değil, **hesabın tamamı kadar**. 3,7 MB / 2.101 belgelik
gerçekçi bir hesapta tek bir test değerini değiştirmek (masaüstü CPU, Node):

| Adım | Süre | Yer |
|---|---|---|
| `smToDocs` (bütün veri → belgeler) | 89 ms | `468-store-map.jsx` → `smController.flush` |
| `smDiff` (2.101 belgenin hepsi metne çevrilip karşılaştırılıyor) | 233 ms | aynı yer |
| Kendi yazımının yankısı: `smFromDocs` + `migrate` + bütün verinin iki kez metne çevrilmesi | ~250 ms, yazım başına 2–3 kez | `smController.onDocs` |

Telefonda kabaca 4–6 katı. Ek olarak: her tuş vuruşu ayrı tur; yazımlar sunucu onayını sırayla
bekliyor; hiçbir belge değişmeyen dinleyici olayları da tam yeniden kurulum yapıyor; `migrate` her
gelen güncellemede bütün ağacı yeni nesnelerle kuruyor.

### Temel çizgi (R0 sonu, `node tools/sync-bench.js`, büyük hesap: 6,3 MB / 4.877 belge, sunucu CPU)

| Düzenleme | Firestore'a giden | Gönderim | Yankı | smCanon / gönderim | smCanon / yankı |
|---|---|---|---|---|---|
| test değeri | 1 yazım, 85 B | 680 ms | 469 ms | 1.501.874 | 1.060.332 |
| seans adı | 1 yazım, 94 B | 680 ms | 496 ms | 1.502.266 | 1.060.332 |
| wellness ekle | 1 yazım, 173 B | 679 ms | 526 ms | 1.503.914 | 1.060.340 |
| kütüphanenin başına egzersiz | 1 yazım, 136 B | 722 ms | 548 ms | 1.501.838 | 1.060.344 |
| sezon ayarı (müsabaka) | 1 yazım, 182 B | 693 ms | 480 ms | 1.502.080 | 1.060.340 |

Giden veri zaten değişenle orantılı (B3 sağlanmış); sorun tamamen cihazdaki hesap: iş sayısı hesapla
orantılı. R3/R4'ün CI bütçesi "smCanon / düzenleme" sayısına bağlanacak.

## 2. Değişmez kurallar (her adım uyar)

| # | Kural |
|---|---|
| G1 | Buluttaki biçim değişmez (belge yapısı, `_fmt`, kurallar, taşıma). Değişen yalnızca cihazdaki hesaplama |
| G2 | Her iyileştirme kendi bayrağının arkasında, varsayılan kapalı; bayrak kapalıyken davranış birebir aynı |
| G3 | Uzaktan kapatma anahtarı (yalnızca Console'dan yazılan bir ayar belgesi, uygulama canlı dinler) |
| G4 | Önce gölge: yeni algoritma eskisinin yanında çalışır, buluta eskisinin sonucu gider |
| G5 | Kendi kendini onarma: yeni yol açıldıktan sonra da boşta tam hesap; fark → düzeltme + bayrak o cihazda kapanır + günlük |
| G6 | Yedek doğrulanmadan gerçek hesapta adım yok |
| G7 | Tek PR, tek değişiklik, kendi çıkış ölçütü |
| G8 | Kademeli açılım: emulator → test hesabı → sahibin tek cihazı → iki cihaz → diğer kullanıcılar |

## 3. Fazlar

### R0 — Güvenlik altyapısı ve mevcut açıklar (davranışı değiştirmez ya da yalnızca güvenliği artırır)
- [x] **Açılış yarışı:** taşınmış hesapta v2 bayrağı gelmeden eski dinleyici kalkıp eski yapının donmuş
      JSON'unu ekrana koyuyordu (uçtan uca testte yeniden üretildi). Artık eski senkron `migratedTo`
      görünce devreder (`450` → `legacyLock`): uygulamaz, yazmaz, kurtarma çekimi / onarım / gözcü durur;
      bekleme süresince ekran salt okunur (`v2.hold`, `690`). İstisna: sunucu çalışma alanının taşınmadığını
      söylüyorsa (`455` → `ownSrv === false`, yarım kalmış taşıma) eski davranış sürer.
- [x] **v2'de günlük bulut yedeği:** eski senkronun ortak atasını bekliyordu, v2'de o yalnızca açılış
      yarışında doluyordu. Artık v2'de sahip + senkron yeşilken alınır; başka kulübü açan üye almaz.
- [x] `migrate` belirlenimci (`070` → `detId`): okurken eksik kimlik saatten/rastgeleden değil kaydın yerinden
      ve içeriğinden türer (takım, sezon, eski bölümlü gün, aynalanan ölçüm satırı, kadro, araştırma, egzersiz,
      kayıtlı aralık, boş hesaptaki varsayılan takım); `addedAt` uydurulmaz. Ayrıca `migrate` kendi çıktısında
      hiçbir şey değiştirmez (eski bölümlü günün egzersiz alanları ilk okumada tamamlanıyor). validator-test: +7 kontrol.
- [x] Bayrak altyapısı (G2) ve uzaktan kapatma anahtarı (G3): `447-sync-flags.jsx` (`syncFlag`, `syncFlagTrip`),
      `config/sync` kuralı (okuma: oturumlu herkes, yazma: kimse). Ölçüm sayaçları: `smController.stats()`
      (gönderim, gelen işleme, yazım onayı, yavaş tur) → senkron tanı penceresi; 50 ms'yi aşan tur günlüğe.
- [x] Örnek veri (`tools/sync-fixture.js`: small / large, tohumlu), ölçüm aracı (`tools/sync-bench.js`: süre +
      makineden bağımsız iş sayısı), eşdeğerlik testi (`store-map-equiv-test.js`, CI: validator.yml): rastgele
      düzenleme zincirlerinde D1 fark → birebir hedef belgeler, D2 gidiş-dönüş, D3 boş düzenleme yazmaz,
      D4 aday ≡ referans (R3 adayı buraya bağlar). Bilerek bozulmuş aday 30 adımda 27 kez yakalandı.

### R1 — Ölçüm (salt okunur)
Gerçek cihazda düzenleme başına ms, yankı süresi, onay süresi, taşıma. Gerekmeyen adım yapılmaz.

### R2 — Düşük riskli hızlandırmalar (her biri ayrı bayrak)
- [ ] Hiçbir belgenin değişmediği dinleyici olayında yeniden kurulumu atlama (gölge, 0 fark).
- [ ] Kendi yankısını atlama (gölge, 0 fark).
- [ ] Onay beklemeden ardışık gönderim; ilk hatada o oturum sıralıya döner.
- [ ] Aynı karedeki değişiklikleri tek turda gönderme (zamanlayıcı yok; kapanışta hemen gönderim).

### R3 — Giden tarafta artımlı eşleme
Kaynak nesne kimliğine göre önbellek; değişmeyen belge yeniden üretilmez. CI'da ≥1 milyon adımlık
rastgele eşdeğerlik testi → ≥2 hafta / ≥5.000 gerçek düzenleme gölge (0 fark) → kademeli açılış, onarım ağı açık.

### R4 — Gelen tarafta artımlı uygulama
Aynı düzen: yalnızca değişen takım / sporcu yeniden kurulur, `migrate` kimliği korur.

### R5 — Açılış ve dinleme kapsamı (yalnızca R1 gerekli gösterirse)
Şart: yüklenmemiş kısım fark hesabına hiç girmez (yokluk asla silme olarak yazılamaz).

### R6 — Eski senkrondan çıkış
Geçiş planı Faz 4 ve Faz 6, R0–R4 kararlı olduktan sonra.

## 3b. Kapatma anahtarı nasıl kullanılır

Firebase Console → Firestore → `config` koleksiyonu → `sync` belgesi (yoksa oluşturulur):

| Alan | Etki |
|---|---|
| `off: true` | Bütün senkron bayrakları kapanır (bütün cihazlarda, saniyeler içinde, yenilemeden) |
| `kill: { <ad>: true }` | Yalnızca o bayrak kapanır |
| `flags: { <ad>: true }` | O bayrak herkese açılır (kademeli açılımın son adımı) |

Kapatma geniş yorumlanır (`off: "true"`, `kill: ["ad"]` da kapatır), açma katı (yalnızca `true`). Bir cihazda
denemek için adres: `?syncflag=<ad>` (açar), `?syncflag=-<ad>` (kapatır). Durum: senkron tanı penceresi →
"Senkron bayrakları". Ayar okunamazsa bütün bayraklar kapalıdır.

## 4. Başarı ölçütleri (3,7 MB hesap)

| Ölçüt | Bugün | Hedef |
|---|---|---|
| Tek düzenlemede gönderim | ~320 ms | ≤ 5 ms |
| Kendi yankısını işleme | ~250 ms × 2–3 | ≤ 5 ms |
| Yazarken 50 ms'yi aşan görev | her tuşta | yok |
| Öbür cihazda görünme | yazım sayısı × gidiş-dönüş | ≲ 1 sn |

## 5. Her PR'ın test kapısı
CI: `check-syntax`, `validator-test`, `sync-test`, `store-map-test`, emulator testleri, `assemble --check`.
Elle: `tools/v2-e2e-test.js`, `tools/smoke-test.js`, gerektiğinde `tools/sync-loop-test.js`.

## 6. İlerleme

| Tarih | Faz | Ne yapıldı | PR |
|---|---|---|---|
| 2026-11-22 | — | Plan, ölçüm | — |
| 2026-11-22 | R0 | Taşınmış hesapta eski senkron devreder (açılış yarışı); v2'de günlük yedek. sync-test +2 senaryo, uçtan uca bölüm 7 | #791 |
| 2026-11-22 | R0 | `migrate` belirlenimci ve kendi çıktısında değişmez; validator-test +7 kontrol | #792 |
| 2026-11-22 | R0 | Senkron bayrakları + uzaktan kapatma anahtarı (`config/sync`), ölçüm sayaçları ve tanı penceresi; sync-test +17, kural testi +1, emulator ölçüm kontrolü, uçtan uca +2 | #793 |
| 2026-11-22 | R0 | Örnek veri, ölçüm aracı (temel çizgi yukarıda), eşdeğerlik testi CI'da — R0 tamam | bu PR |
