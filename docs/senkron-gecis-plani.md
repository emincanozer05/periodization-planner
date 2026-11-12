# Senkron Geçiş Planı — tek JSON'dan kayıt bazlı, çok kullanıcılı yapıya

> **Durum:** Onaylandı (K1–K7, K10) · **Son güncelleme:** 2026-11-12
> Üst plan: [`yayina-hazirlik-plani.md`](yayina-hazirlik-plani.md) (abonelik ve KVKK ile birlikte sıra).
> Bu dosya işin tek kaynağıdır. Her oturumda önce bu dosya okunur; her PR sonunda
> en alttaki **İlerleme** bölümü güncellenir. Kararlar **Kararlar** bölümüne yazılır.

---

## 1. Amaç

CoachOS'u (1) yüzlerce kullanıcının senkron sorunu yaşamadan kullanabileceği, (2) birden
fazla kişinin aynı takım üzerinde **veri kaybı olmadan** aynı anda çalışabileceği, (3) sonra
mobil uygulamaya (app) çevrilebilecek bir veri yapısına taşımak.

### Başarı ölçütleri

| # | Ölçüt | Nasıl ölçülür |
|---|---|---|
| B1 | İki kişi aynı takımda farklı şeyleri (ör. biri seans, biri test) aynı anda düzenler, ikisi de kalır | Otomatik iki cihaz testi + elle deneme |
| B2 | Biri çevrimdışıyken yaptığı düzenleme, bağlantı gelince diğerininkini silmeden yerine oturur | Otomatik çevrimdışı senaryo testi |
| B3 | Tek bir düzenleme, değişen kaydın boyutu kadar veri yazar (bugün: tüm durum metne çevrilip parçalanır) | Senkron günlüğünde yazılan bayt |
| B4 | Telefonda uygulama açılışı ve düzenleme akıcı; bellek yetmezliği çökmesi yok | `tools/sync-loop-test.js` bellek ölçümü |
| B5 | Her kişi kendi hesabıyla girer; kimin neyi değiştirdiği kayıtlı | Güvenlik kuralı testleri + `updatedBy` alanı |
| B6 | Taşıma sırasında hiçbir kullanıcının verisi kaybolmaz | Taşıma doğrulaması (bölüm 7.3) |

---

## 2. Bugünkü durum (kısa)

### 2.1 Veri nerede, nasıl duruyor

Hesabın bütün verisi **tek bir JSON** (bellekte `data`):

```
data
├─ teams[]                         ← takımlar
│   ├─ setup                       (sezon tarihleri, periyotlar, maçlar…)
│   ├─ days{tarih}.sessions[]      (takım takvimi — AKTİF sezon)
│   ├─ weekOverrides, seasons[], activeSeasonId
│   ├─ seasonData{sezonId}         (aktif OLMAYAN sezonlar buraya "park edilir", seçilince yer değiştirir)
│   ├─ athletes[]
│   │   ├─ name, number, position, dateOfBirth, photo, sex, levelTag, trainingProfile…
│   │   ├─ tests[]  wellness[]  srpeLog[]  nightLog[]  injuries[]  measurements[]
│   │   ├─ days{tarih}             (sporcunun kendi takvimi)
│   │   └─ phaseBank, programs, liftLog…
│   ├─ staff[], indiv{…}, checkin{…}
├─ exercises[], templates[], testTemplates, customTests[], customMuscles
├─ tryouts, tryoutTests, researches, savedResearch, interval, ai…
└─ activeTeamId                    (cihaza ait, buluta gitmez)
```

Kod içinde ~2,6 MB'lık hesaplardan söz ediliyor (`440-sync-infra-chunking-merge.jsx`).

### 2.2 Senkron nasıl çalışıyor

`440-sync-infra-chunking-merge.jsx` + `450-use-cloud-sync.jsx` (~2.400 satır):

1. Her değişiklikte durumun **tamamı** `JSON.stringify` edilir, içeriğe göre parçalanır, hash'lenir.
2. Yeni parçalar `kullanici_verileri/<uid>_<hash>` dokümanlarına, sonra manifest `kullanici_verileri/<uid>` yazılır.
3. Diğer cihaz manifesti dinler, parçaları birleştirir, ekrandaki durumla **üç yönlü birleştirir** (`merge3`, `mergeCloud`).
4. Cihaz saatleri farklı olduğu için sunucu saatine göre düzeltme yapılır (`srvStamp`, skew).
5. Manifest yazımı kurallarda `base == rev` ile korunur (`firestore.rules → syncHeadOk`); reddedilen cihaz okuyup yeniden birleştirir.

### 2.3 Bu yapının sorunları (koddaki notlardan)

- **Her düzenleme tüm durumu işler** → telefonda yavaşlık, "Out of Memory" sekme çökmesi.
- **Çakışmayı uygulama kendisi çözer** → birleştirme ve saat farkı mantığı hata yapabilir. Veri
  kaybı yaşandığı, eklenen korumalardan belli: `guardSessions` (birden çok seansı silen gelen hâli
  durdurur), `restoreSessionsFrom`, günlük yedekler (`snapshots`), yerel emniyet kopyası.
- **Tek yazım kuyruğu** → bir okuma/yazma takılırsa (kilitli telefon, bozuk bağlantı) senkronun
  tamamı durur (`withTimeout`, yeniden bağlanma döngüsü, `AUTO_*` sigortası bunun için var).
- **Aynı hesabı iki kişi kullanınca** her cihaz aynı dev JSON'u yazar; iki ayrı şeyi düzenlemek
  bile birleştirme gerektirir. Kişi sayısı arttıkça risk artar.
- **Sezon değiştirmek** (`seasonData` ↔ `days` yer değiştirmesi) büyük bir alt ağacı yeniden yazar.
- **Check-in içe aktarımı** (`670-checkin-wellness-alerts-client.jsx`) gönderimleri sporcunun
  `srpeLog` / `wellness` dizisine yazar; açık her koç cihazı aynı işi yapıp çakışabilir.
- **Paylaşım yok:** ana veri (`kullanici_verileri`) yalnızca sahibinin. Ekip üyeleri
  (`staff_members`) sadece yan koleksiyonları (check-in, wellness uyarıları, RPE raporları) görür.

### 2.4 Zaten ayrı koleksiyonlarda olanlar (bu planda DEĞİŞMEZ, yalnızca bağlanır)

`checkin_links`, `checkins`, `lift_plans`, `lift_logs`, `staff_members`, `staff_links`,
`alert_roster`, `push_tokens`, `wellness_alerts`, `rpe_reports`, `polar_*`, `ai_*`, `snapshots`.
Bunlar `coachUid` + `teamId` + `athleteId` ile ana veriye bağlanıyor → **kimlikler korunmalı**
(bkz. Karar K3).

---

## 3. Hedef mimari

### 3.1 Temel ilkeler

1. **Bir kayıt = bir Firestore dokümanı.** İnsanların ayrı ayrı düzenlediği her şey ayrı doküman.
2. **Yazım alan düzeyinde.** Hiçbir zaman dokümanın tamamı üzerine yazılmaz; yalnızca değişen
   alanlar `update()` ile gider. Böylece iki kişi aynı dokümanın farklı alanlarını düzenlerse ikisi de kalır.
3. **Birden çok kişinin eklediği listeler dizi değil, kimlikli harita ya da alt koleksiyon.**
   (Dizi ancak tek bir kişinin bir bütün olarak düzenlediği şeyde kalır, ör. bir seansın blokları.)
4. **Senkron, çevrimdışı çalışma ve çakışma Firestore'un işi.** Uygulama kendi birleştirme
   mantığını taşımaz; Firestore'un çevrimdışı önbelleği ve gerçek zamanlı dinleyicileri kullanılır.
5. **Medya dokümanın içinde değil, Storage'da.** Dokümanda yalnızca yolu durur.
6. **Cihaza ait olan buluta gitmez** (seçili takım, seçili sezon, görünüm tercihleri).
7. **Paylaşım birimi "çalışma alanı" (kulüp/hesap); erişim üyelikle.** Herkes kendi hesabıyla girer.

### 3.2 Veri modeli (öneri)

`ws` = çalışma alanı kimliği. **Taşınan hesaplarda `ws` = eski sahibin `uid`'i** (Karar K3):
böylece `coachUid` taşıyan bütün yan koleksiyonlar olduğu gibi çalışır.

```
workspaces/{ws}
    name, ownerUid, schemaVersion: 2, createdAt, migratedAt
workspaces/{ws}/members/{uid}
    role: 'owner'|'admin'|'coach'|'viewer', teams: ['*'] | [teamId…], name, email, addedBy, addedAt
workspaces/{ws}/invites/{token}
    role, teams, email?, createdBy, expiresAt, usedBy?

# Kütüphane (çalışma alanı genelinde ortak — Karar K5)
workspaces/{ws}/exercises/{exerciseId}
workspaces/{ws}/templates/{templateId}
workspaces/{ws}/customTests/{testDefId}
workspaces/{ws}/researches/{id}
workspaces/{ws}/tryouts/{id}
workspaces/{ws}/settings/{name}        (customMuscles, testTemplates, interval, ai… küçük ayarlar)

# Takım
workspaces/{ws}/teams/{teamId}
    setup (takım adı, spor…), staff{id:…}, checkin{…}, indiv{…}, archived?, updatedAt, updatedBy
workspaces/{ws}/teams/{teamId}/seasons/{seasonId}
    setup (sezon tarihleri, periyotlar, maçlar, model), weekOverrides{…}
workspaces/{ws}/teams/{teamId}/days/{seasonId}_{tarih}
    seasonId, date, dailyNotes
workspaces/{ws}/teams/{teamId}/sessions/{sessionId}
    seasonId, date, order, name, time, purpose, focus[], blocks[], duration, sRPE, au, athletes[]…

# Sporcu
workspaces/{ws}/teams/{teamId}/athletes/{athleteId}
    name, number, position, dateOfBirth, sex, photoPath, levelTag, trainingProfile, phaseBank, programs…
workspaces/{ws}/teams/{teamId}/athletes/{athleteId}/tests/{testId}
workspaces/{ws}/teams/{teamId}/athletes/{athleteId}/injuries/{injuryId}
workspaces/{ws}/teams/{teamId}/athletes/{athleteId}/measurements/{id}
workspaces/{ws}/teams/{teamId}/athletes/{athleteId}/sessions/{sessionId}   (sporcunun kendi takvimi)
workspaces/{ws}/teams/{teamId}/athletes/{athleteId}/logs/{YYYY-MM}
    srpe{entryId:{…}}, wellness{entryId:{…}}, night{entryId:{…}}, lift{entryId:{…}}
```

**Neden günlük kayıtlar ay kovasında (`logs/{YYYY-MM}`)?** sRPE, wellness ve gece verisi küçük ama
çok sayıda. Her biri ayrı doküman olursa her açılışta binlerce okuma olur (maliyet, bkz. bölüm 9).
Ay kovasında **kimlikli harita** olarak durduklarında: bir ay = bir doküman (az okuma), ama her kayıt
kendi alan yolunda güncellenir (`srpe.<id>.rpe`) → iki kayıt çakışmaz. Bir kova 1 MiB sınırına
yaklaşırsa (pratikte olası değil) iki yarıma bölünür.

**Sezonlar:** Bütün sezonların seansları aynı `sessions` koleksiyonunda, `seasonId` alanıyla durur.
"Aktif sezon" yalnızca cihazın/kullanıcının görünüm tercihi olur → sezon değiştirmek hiçbir şey yazmaz.

**Takım seansı → sporcu seansı eşlemesi** (`090-rhr-team-sync-picker.jsx`, `sourceId`) sporcu
seansında `sourceId` alanı olarak kalır.

### 3.3 Yazım ve çakışma kuralları

| Durum | Davranış |
|---|---|
| İki kişi farklı dokümanları düzenler | Çakışma yok |
| İki kişi aynı dokümanın farklı alanlarını düzenler | İkisi de kalır (alan düzeyinde `update`) |
| İki kişi aynı alanı aynı anda düzenler | Son yazan kazanır (Karar K6). `updatedBy` / `updatedAt` kimin olduğunu gösterir |
| Biri siler, öbürü düzenler | Silme **yumuşak** (`deletedAt`, `deletedBy`); 30 gün geri alınabilir |
| Çevrimdışı düzenleme | Firestore kuyruğa alır, bağlanınca gönderir; yukarıdaki kurallar geçerli |
| Sıra (seansların gün içindeki sırası) | `order` sayı alanı; araya ekleme iki komşunun ortalaması |
| Sayaç / değişmez kural gerektiren yazım | Yalnızca orada transaction |

Her yazım `updatedAt: serverTimestamp()` ve `updatedBy: uid` taşır.

### 3.4 Güvenlik kuralları (özet)

```
function member(ws)   { return exists(/databases/$(database)/documents/workspaces/$(ws)/members/$(request.auth.uid)); }
function m(ws)        { return get(/databases/$(database)/documents/workspaces/$(ws)/members/$(request.auth.uid)).data; }
function canTeam(ws,t){ return member(ws) && ('*' in m(ws).teams || t in m(ws).teams); }
function canWrite(ws) { return m(ws).role in ['owner','admin','coach']; }
```

- Okuma: o takıma erişimi olan üye. Yazma: `owner/admin/coach`. Üye yönetimi: `owner/admin`.
- `members` belgesini kişi kendine yazamaz (yalnızca davet kabulü, kontrollü alanlarla).
- Eski `kullanici_verileri`: taşınan hesapta **yalnızca okunur** (eski uygulama sürümleri yazamaz, bkz. 7.4).
- Storage kuralları aynı üyelik modeline geçer (`workspaces/{ws}/…` yolları).
- Kurallar **Firebase Emulator** üzerinde otomatik testle sınanır (`@firebase/rules-unit-testing`), CI'da çalışır.

### 3.5 Uygulama içi mimari: "uyumluluk katmanı" yaklaşımı (öneri)

Uygulamanın ekranları bugün tek bir `data` nesnesine ve `setData` / `updateTeam` / `updAth`'a
bağlı (~30 `updateTeam`, ~40 `updAth`, onlarca `setData` çağrısı, 91 parça). Bütün ekranları
baştan yazmak hem uzun hem riskli. Önerilen yol iki aşamalı:

**Aşama A — Uyumluluk katmanı (ekranlar değişmeden):**

1. **Okuma:** Firestore dinleyicileri dokümanları alır ve bellekte **bugünkü `data` biçimini** kurar
   (aynı alan adları, aynı iç içe yapı). Ekranlar fark etmez.
2. **Yazma:** Ekran `setData` ile yeni durumu verdiğinde katman eski ve yeni durumu karşılaştırır
   (bugünkü `syncChangedPaths` bunun temeli), değişen yolları **sahibi olan dokümana** eşler
   (`teams[T].athletes[A].tests[X].cmj` → `…/athletes/A/tests/X` dokümanının `cmj` alanı) ve
   yalnızca o alanları yazar.
3. Firestore yazımı yerelde hemen gösterir (gecikme telafisi); sunucudan gelen değişiklik
   dinleyiciden aynı bellek nesnesine işlenir. **Birleştirme kodu gerekmez.**
4. Sezon "park etme" mantığı katmanda çözülür: ekran hâlâ `team.days`'i okur, katman onu seçili
   sezonun seanslarından kurar.

**Aşama B — Kademeli sadeleştirme (sonra, ihtiyaç oldukça):** Ağır ekranlar (Yük Takibi, Wellness,
Takım Verileri) doğrudan sorgu kancalarına (`useSessions(team, from, to)`, `useAthleteLogs(…)`)
geçirilir; bellekte tüm hesabı tutma zorunluluğu kalkar.

> Neden A önce: aynı haftalar içinde senkron sorununu çözer, ekranlara dokunmaz, geri dönüşü kolaydır.
> Bedeli: hesabın tamamı (seçili zaman penceresi kadar) yine bellekte durur — bugünkünden çok daha
> ucuz, çünkü artık her düzenlemede metne çevrilmiyor.

---

## 4. Kapsam dışı (bu planda yapılmayacak)

- Mobil uygulamaya çevirme (Capacitor / PWA) — senkron oturduktan sonra ayrı iş (Faz 7).
- Aynı metin alanını eşzamanlı düzenleme (Google Docs tarzı). Son yazan kazanır yeterli.
- Ekranların görsel yeniden tasarımı.
- Polar, AI, check-in, lift gibi zaten ayrı koleksiyonlarda olan özelliklerin iç mantığı.

---

## 5. Fazlar

Her faz birden çok küçük PR'dır. Her PR: `node check-syntax.js`, `node validator-test.js`, ilgili
yeni testler yeşil; CI yeşil olmadan merge yok. Bir faz bitmeden sonrakine geçilmez.

### Faz 0 — Hazırlık ve ölçüm
- [ ] Gerçek bir hesabın (anonimleştirilmiş) boyut raporu: senkron panelindeki "Veri boyutu"
      (`syncSizeReport`) çıktısı → hangi alan ne kadar, gömülü medya var mı.
- [x] **Kararlar** bölümündeki açık soruların cevaplanması (K8 ve K9'un bütçe kısmı hariç).
- [x] Firebase Emulator'ün CI'da çalıştırılması (GitHub Actions'ta Java + `firebase-tools`). → `rules-test/`, `rules.yml` (#748)
- [ ] Gerçekçi test verisi üreticisi: `tools/sync-loop-test.js`'deki veriden (12 sporcu, 4 hafta)
      ve büyük bir varyanttan (40 sporcu, 2 sezon) fixture.
**Çıkış ölçütü:** Kararlar onaylandı, emulator CI'da ayağa kalkıyor.

### Faz 1 — Şema ve güvenlik kuralları (uygulamaya dokunmaz)
- [x] `docs/veri-modeli.md`: eşleme tablosu, kimlik ve boyut kuralları, erişim özeti.
- [x] `firestore.rules`'a yeni `workspaces/**` kuralları (eskiler aynen kalır) + eski manifestte `migratedTo` kilidi.
- [ ] `storage.rules`'a `workspaces/{ws}/**` yolları. → Faz 2'ye ertelendi (ilk deploy'da ek IAM izni; bkz. veri-modeli §6)
- [x] Kural testleri: üye okur/yazar, üye olmayan okuyamaz, viewer yazamaz, başka çalışma alanına
      erişim yok, kişi kendine rol veremez, taşınmış hesapta eski koleksiyona yazım reddedilir. (`rules-test/test/workspaces.test.js`, 13 test)
- [ ] `firestore.indexes.json`: tarih aralığı sorguları için dizinler.
**Çıkış ölçütü:** Kural testleri CI'da yeşil; canlıya yayınlanan kurallar mevcut kullanıcıları etkilemiyor.

### Faz 2 — Uyumluluk katmanı (bayrak arkasında)
- [x] Belge ↔ `data` eşlemesi: `src/app/468-store-map.jsx` (`smToDocs` / `smFromDocs` / `smCheckDocs`), testi `store-map-test.js` (CI: validator.yml).
- [x] Eşleme v2: liste belgesi yok, kesirli sıra, takım düzeyinde düz alt koleksiyonlar; `smDiff` (alan düzeyinde yazım farkı) ve iki cihaz senaryoları (`smApply` ile).
- [x] Senkron tanı penceresinde "Yeni yapı ön kontrolü" (gerçek hesapta belge sayısı, en büyük belgeler, gidiş-dönüş; hiçbir şey yazmaz).
- [ ] Uyumluluk katmanı `src/app/44x-store-v2.jsx`: dinleyiciler → `data`, `setData` farkı → değişen belgelerin `update()`'i.
- [ ] Dinleyiciler: çalışma alanı, takımlar, sporcular, seçili sezonun seansları, son N ayın log kovaları;
      eski aylar ihtiyaç olunca.
- [ ] Firestore çevrimdışı önbellek (`persistentLocalCache`, çoklu sekme).
- [ ] `useCloudSync` yerine bayrağa göre `useStoreV2` (bayrak: `workspaces/{ws}.schemaVersion == 2`
      ve yerel geliştirici anahtarı). Bayrak kapalıyken davranış birebir aynı.
- [ ] Testler (Node, sahte Firestore — `sync-test.js` tarzında):
  - yol → belge eşlemesi her alan türü için (takım, sezon, seans, sporcu, test, log kovası, kütüphane)
  - gidiş-dönüş: `data` → belgeler → `data` birebir aynı
  - **iki cihaz senaryoları:** aynı anda farklı seans / aynı seansın farklı alanı / biri siler biri
    düzenler / biri çevrimdışı 10 düzenleme yapıp döner / iki cihaz aynı check-in'i içe aktarır
  - performans: tek alan düzenlemesinde yazılan belge ve bayt sayısı
**Çıkış ölçütü:** Bütün iki cihaz senaryoları yeşil; bayrak kapalıyken `tools/smoke-test.js` önce/sonra aynı.

### Faz 3 — Taşıma aracı
- [ ] Eski JSON → yeni belgeler dönüştürücüsü (saf fonksiyon, test edilebilir).
- [ ] Gömülü medya (`data:image…`, PDF) önce Storage'a yüklenir, belgede yol kalır.
- [ ] Kuru çalıştırma: yazmadan "kaç belge, ne kadar veri, hangi uyarılar" raporu.
- [ ] Yazım 500'lük batch'lerle, kaldığı yerden devam edebilir (yarıda kalırsa tekrar çalıştırılabilir,
      aynı kimliklerle yazdığı için çift kayıt oluşmaz).
- [ ] **Doğrulama:** yeni yapıdan `data` yeniden kurulur, eski JSON ile (cihaza ait alanlar hariç)
      derin karşılaştırılır; tek fark varsa taşıma "tamamlandı" işaretlenmez.
- [ ] Taşımadan hemen önce otomatik yedek (`snapshots` + indirilebilir JSON).
- [ ] Testler: fixture'lar, eski düzen (`<uid>_<rev>_<i>`) hesaplar, boş hesap, çok sezonlu hesap,
      gömülü medyalı hesap, bozuk/eksik alanlı hesap.
**Çıkış ölçütü:** Bütün fixture'lar kayıpsız gidiş-dönüş yapıyor.

### Faz 4 — Pilot
- [ ] Önce boş bir test hesabı → sonra test verisi yüklenmiş hesap → sonra **senin hesabın**
      (yedek alındıktan sonra, senin onayınla).
- [ ] Senin elle deneme listen (bölüm 8.3) iki cihazla.
- [ ] En az 1 hafta gerçek kullanım; senkron günlüğü ve hatalar izlenir.
**Çıkış ölçütü:** 1 hafta boyunca veri kaybı ve takılma yok.

### Faz 5 — Çok kullanıcı
- [ ] Ayarlar → **Ekip ve erişim:** davet linki oluştur, rol seç, takım seç, üyeyi çıkar.
- [ ] Davet kabul akışı (kendi Google hesabıyla giriş → üyelik).
- [ ] Mevcut `staff_members` / `staff_links` ile bağlantı (aynı kişi hem ekip üyesi hem uygulama kullanıcısı olabilir).
- [ ] "Son düzenleyen" bilgisi gereken yerlerde (seans, test) küçük bir not.
**Çıkış ölçütü:** İki ayrı hesap aynı takımda B1/B2'yi sağlıyor.

### Faz 6 — Herkese açılış ve temizlik
- [ ] Taşıma bütün kullanıcılara açılır (uygulama açılışında, sahibin onayıyla, ilerleme göstergeli).
- [ ] Taşınmayan eski istemciler için "güncelleme gerekli" ekranı (bkz. 7.4).
- [ ] 30 gün sonra: eski senkron kodu (`440`/`450`'nin parçalama, birleştirme, saat düzeltme kısımları)
      kaldırılır; eski `kullanici_verileri` salt okunur arşiv olarak 90 gün durur, sonra silinir.
**Çıkış ölçütü:** Bütün aktif hesaplar `schemaVersion: 2`; eski kod yok.

### Faz 7 — (Ayrı iş) Mobil uygulama
Capacitor ya da PWA iyileştirmesi. Bu planın konusu değil; Faz 6'dan sonra ayrı plan.

---

## 6. Aşama B (Faz 6'dan sonra, isteğe bağlı)
Yük Takibi, Wellness, Takım Verileri, raporlar → tarih aralığı sorgularına. Bellekte yalnızca
ekrandaki pencere. Büyük takımlar ve uzun geçmiş için gerekli; yüzlerce kullanıcı için şart değil.

---

## 7. Taşıma ayrıntıları

### 7.1 Kimlikler
Takım, sporcu, seans, test, sezon kimlikleri **aynen korunur.** Çalışma alanı kimliği = eski sahibin
`uid`'i. Böylece `checkins`, `alert_roster`, `staff_members`, `polar_links`, `lift_plans`, `rpe_reports`
hiçbir değişiklik olmadan çalışır.

### 7.2 Sıra
1. Yedek al → 2. Kuru çalıştırma raporu → 3. Medyayı Storage'a taşı → 4. Belgeleri yaz →
5. Doğrula → 6. `workspaces/{ws}.schemaVersion = 2` ve eski manifeste `migratedTo` yaz →
7. Uygulama yeni katmana geçer.

### 7.3 Doğrulama
Yeni yapıdan kurulan `data` ile eski JSON derin karşılaştırılır (sıralama ve cihaza ait alanlar
normalize edilerek). Karşılaştırma raporu senkron günlüğüne yazılır. Fark varsa taşıma geri alınmaz,
yalnızca "tamamlanmadı" kalır ve eski yapı kullanılmaya devam eder.

### 7.4 Eski istemciler
Service worker'ın önbellekteki eski sürüm bir süre eski senkronla yazmaya çalışabilir. Önlem:
- Kurallar: `kullanici_verileri/<uid>` manifestinde `migratedTo` varsa yazım reddedilir.
- Eski kod reddi zaten "okuyup yeniden dene" olarak ele alıyor → döngüye girmemesi için bu PR'la
  birlikte eski koda "`migratedTo` görürsen sayfayı yenile" kontrolü eklenir (taşımadan **önce** yayınlanır).

### 7.5 Geri dönüş
Eski veri silinmeden 90 gün durur. Bir hesapta sorun çıkarsa `schemaVersion` 1'e çekilir, `migratedTo`
kaldırılır; uygulama eski senkrona döner. (Geri dönüşte yeni yapıda yapılan düzenlemeler, ters
dönüştürücüyle eski JSON'a aktarılır — Faz 3'te ters dönüştürücü de yazılır.)

---

## 8. Test stratejisi

### 8.1 Otomatik (CI)
| Test | Ne sınar | Nerede |
|---|---|---|
| Kural testleri | Erişim, roller, başka hesaba sızma | Firebase Emulator |
| Eşleme testleri | `data` ↔ belgeler gidiş-dönüş | Node, sahte Firestore |
| İki cihaz senaryoları | B1, B2, silme/düzenleme, çift içe aktarım | Node, sahte Firestore (gerekirse Emulator) |
| Taşıma testleri | Fixture'lar kayıpsız | Node |
| Mevcut testler | `validator-test`, `sync-test`, `check-syntax`, `smoke-test` | Mevcut |

### 8.2 Elle (her fazın sonunda, benim tarafımda)
`node build.js && node tools/smoke-test.js` ve `node tools/sync-loop-test.js` (bellek, döngü).

### 8.3 Senin elle deneme listen (pilotta)
1. Telefon + bilgisayar aynı takımda açık; telefonda seans ekle, bilgisayarda aynı anda test gir → ikisi de kalıyor mu?
2. Aynı seansın adını bir cihazda, süresini öbüründe değiştir → ikisi de kalıyor mu?
3. Telefonu uçak moduna al, 3 değişiklik yap; bilgisayarda 2 değişiklik yap; telefonu bağla → 5'i de var mı?
4. Telefonu 10 dk kilitli bırak, aç, düzenle → senkron göstergesi takılıyor mu?
5. Sezon değiştir → diğer cihazda hiçbir şey değişmemeli.
6. Check-in gönderimi gelince iki koç cihazı açıkken sRPE bir kez mi görünüyor?
7. İkinci kişi kendi hesabıyla davetle girip düzenleme yapabiliyor mu; viewer rolü düzenleyemiyor mu?

---

## 9. Maliyet ve sınırlar (tahmin — Firebase fiyatları uygulamadan önce kontrol edilmeli)

- **Bugün:** okuma sayısı düşük (birkaç parça), ama her düzenlemede MB'larca metin işlenir ve
  değişen parçalar yazılır/indirilir.
- **Yeni yapıda açılış maliyeti** okunan belge sayısıdır. 20 sporculu, 1 sezonluk bir takım için kaba hesap:
  sporcu 20 + testler ~200 + log kovaları (20 sporcu × son 3 ay) 60 + seanslar ~300 + kütüphane ~350
  ≈ **1.000 okuma**. Kütüphane ve geçmiş, Firestore önbelleği ve "ihtiyaç olunca yükle" ile azaltılır.
- Günlük kayıtlar ay kovasında olmasaydı (her sRPE/wellness ayrı belge) aynı takım için ~10.000+ okuma olurdu → ay kovası bu yüzden.
- Firestore sınırları: belge ≤ 1 MiB, batch ≤ 500 yazım, aynı belgeye saniyede ~1 sürekli yazım.
  Hiçbiri bu modelde sorun değil (en büyük belge bir ayın log kovası).
- Faz 0'da gerçek boyut raporuyla bu tahmin güncellenir.

---

## 10. Riskler

| Risk | Etki | Önlem |
|---|---|---|
| Taşımada veri kaybı | Çok yüksek | Yedek, kuru çalıştırma, derin doğrulama, eski veri 90 gün, geri dönüş |
| Eski önbellekli istemcinin yazması | Yüksek | Kurallarla red + taşımadan önce yayınlanan "yenile" kontrolü |
| Güvenlik kuralı hatası → başka hesabın verisine erişim | Çok yüksek | Emulator kural testleri; şüpheli durumda varsayılan red; dış göz (öneri) |
| Yol → belge eşlemesinde atlanan alan | Yüksek | Gidiş-dönüş testleri bütün fixture'larda; bilinmeyen yol = yazım yapılmaz + günlüğe uyarı |
| Okuma maliyetinin beklenenden yüksek çıkması | Orta | Faz 0 ölçümü, ay kovaları, önbellek, gerekirse Aşama B |
| Uzun süren iş, oturumlar arası bağlam kaybı | Orta | Bu dosya + İlerleme bölümü; her PR küçük ve kendi içinde tamam |
| Check-in / Polar / alert entegrasyonlarının kırılması | Orta | Kimlikler korunur; bu entegrasyonlar için ayrı test |
| Ekranlarda gizli `data` kullanım biçimleri (ör. diziyi yerinde değiştirme) | Orta | Katman değişmez (frozen) nesne verir geliştirme modunda; smoke + sync-loop testleri |

**Öneri:** Faz 1 bittiğinde veri modeli ve güvenlik kuralları bir Firebase uzmanına bir kez
gözden geçirtilsin (kısa danışmanlık).

---

## 11. Kararlar

Cevaplanınca buraya **tarih + karar** yazılır.

| # | Soru | Öneri | Karar |
|---|---|---|---|
| K1 | Paylaşım birimi ne olsun? | Çalışma alanı (kulüp/hesap); üyeye takım bazında erişim verilebilir | ✅ 2026-11-12: öneri kabul |
| K2 | Hangi roller lazım? | Sahip, Yönetici, Antrenör (düzenler), İzleyici (yalnız görür) | ✅ 2026-11-12: öneri kabul |
| K3 | Kimlikler korunsun mu, çalışma alanı = eski uid olsun mu? | Evet (entegrasyonlar değişmeden çalışır) | ✅ 2026-11-12: öneri kabul |
| K4 | Aynı hesaba şifre paylaşarak girmek devam etsin mi? | Hayır: herkes kendi hesabı + davet. Geçiş döneminde eski yöntem de çalışır | ✅ 2026-11-12: öneri kabul |
| K5 | Egzersiz kütüphanesi, şablonlar, test tanımları kulüp genelinde ortak mı, kişisel mi? | Kulüp genelinde ortak | ✅ 2026-11-12: öneri kabul |
| K6 | Aynı alanı iki kişi aynı anda değiştirirse "son yazan kazanır" kabul mü? | Evet | ✅ 2026-11-12: öneri kabul |
| K7 | "Kim neyi değiştirdi" geçmişi ilk sürümde gerekli mi? | İlk sürümde yalnızca `updatedBy/At`; tam geçmiş sonra | ✅ 2026-11-12: öneri kabul |
| K8 | Kaç aktif kullanıcı, takım başına kaç sporcu, ne kadar geçmiş bekleniyor? | — (maliyet ve dizin tasarımı için) | ⏳ |
| K9 | Firebase Blaze (kullandıkça öde) bütçesi var mı? | — | Blaze zaten açık (Cloud Functions çalışıyor); bütçe sınırı ⏳ |
| K10 | Taşımayı kullanıcı mı başlatsın, otomatik mi olsun? | Sahip onaylar, uygulama yapar | ✅ 2026-11-12: öneri kabul |

---

## 12. Yeni oturumda nasıl devam edilir

1. Bu dosyayı oku; **İlerleme** bölümündeki son durumu ve **Kararlar**'ı al.
2. Sıradaki işaretlenmemiş maddeyi tek PR olarak yap (küçük tut).
3. PR'da bu dosyanın İlerleme bölümünü güncelle.
4. `CLAUDE.md` kurallarına uy (PR → CI yeşil → merge; `index.html` yalnızca `node assemble.js` ile).

---

## 13. İlerleme

| Tarih | Faz | Ne yapıldı | PR |
|---|---|---|---|
| 2026-11-08 | — | Plan taslağı yazıldı | — |
| 2026-11-12 | — | Kararlar K1–K7, K10 onaylandı | — |
| 2026-11-12 | 0 | Emulator kural testleri CI'da | #748 |
| 2026-11-12 | 1 | Veri modeli belgesi, `workspaces/**` kuralları ve testleri, eski senkronda `migratedTo` kilidi, hesap silmede çalışma alanı ve üyelikler | #750 |
| 2026-11-12 | 2 | Eşleme modülü (data ↔ belgeler) ve testleri: gidiş-dönüş birebir (gerçekçi, 18 kenar durum, 200 rastgele), tek düzenleme = tek belge; tanı penceresinde ön kontrol | #751 |
| 2026-11-12 | 2 | Eşleme v2 (liste belgesi yok, kesirli sıra, düz takım koleksiyonları), alan düzeyinde yazım farkı, 11 iki cihaz senaryosu | bu PR |
