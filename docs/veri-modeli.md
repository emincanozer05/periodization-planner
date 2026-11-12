# Veri Modeli — kayıt bazlı senkron (schemaVersion 2)

> **Durum:** Faz 1 · **Son güncelleme:** 2026-11-12
> Üst belgeler: [`senkron-gecis-plani.md`](senkron-gecis-plani.md) §3, [`yayina-hazirlik-plani.md`](yayina-hazirlik-plani.md).
> Güvenlik kuralları: `firestore.rules` → `workspaces/**`; testleri `rules-test/test/workspaces.test.js`.

Bu belge, bugünkü tek JSON'daki (`data`) her yolun yeni yapıda **hangi belgeye** gittiğini tanımlar.
Uyumluluk katmanı (Faz 2) ve taşıma aracı (Faz 3) bu tabloyu tek bir kod haritası olarak uygular.
Tablo ile kod ayrışmasın diye ikisi aynı testle sınanacak (gidiş-dönüş: `data` → belgeler → `data` birebir aynı).

## 1. Temel kurallar

1. **Ayrı belge olan alt ağaçlar açıkça listelenir** (§3). Geri kalan her alan, en yakın üst belgede
   **olduğu gibi** durur. Haritada olmayan bir alan kaybolmaz; yalnızca kendi belgesine ayrılmamış olur.
2. **Kimlikler aynen korunur** (K3): takım, sporcu, seans, test, sezon `id`'leri belge adıdır.
   Çalışma alanı kimliği = hesabın sahibinin `uid`'i. Check-in, Polar ve bildirim koleksiyonları
   (`coachUid`, `teamId`, `athleteId` taşıyanlar) hiç değişmeden çalışır.
3. **Kimliği olmayan dizi elemanları** (bazı eski kayıtlar) taşımada içerikten türetilen kararlı bir
   kimlik alır: `h_` + içeriğin özeti. Aynı veri iki kez taşınırsa aynı kimlik çıkar, çift kayıt oluşmaz.
4. **Cihaza ait olan buluta gitmez:** `activeTeamId` (seçili takım), seçili sezon, görünüm tercihleri.
5. **Belge sınırı 1 MiB.** En büyük belge adayları bir ayın log kovası ve çok seanslı bir sporcu
   belgesi. Taşıma aracının kuru çalıştırması (Faz 3) her belgenin boyutunu ölçer; 900 KB'yi aşan
   olursa taşıma durur, o alan haritada kendi belgesine ayrılır.
6. **Gömülü medya** (`data:image…`, `data:application/pdf…`) belgede kalmaz: taşımada Storage'a
   yüklenir, belgede yolu durur.

## 2. Ağaç

```
workspaces/{ws}                                  ws = sahibin uid'i
│  name, ownerUid, schemaVersion: 2, createdAt, migratedAt
│  + data'nın kalan küçük alanları (interval, ai, customMuscles, testTemplates…)
├─ members/{uid}                                 role, teams, uid, invite?
├─ invites/{token}                               role, teams, usedBy, expiresAt, createdBy
├─ exercises/{id}                                data.exercises[]
├─ templates/{id}                                data.templates[]
├─ customTests/{id}                              data.customTests[]
├─ tryouts/{id}                                  data.tryouts[]
├─ researches/{id}                               data.researches[]
└─ teams/{teamId}                                data.teams[] (belgede: setup'ın takım alanları, staff,
   │                                             checkin, indiv, seasons listesi, tallySync…)
   ├─ seasons/{seasonId}                          aktif sezon: team.setup + weekOverrides
   │                                             diğerleri: team.seasonData[sid].setup + weekOverrides
   ├─ days/{seasonId}_{tarih}                     dailyNotes (boşsa belge yok)
   ├─ sessions/{sessionId}                        days{tarih}.sessions[] → seasonId, date, order + seans
   └─ athletes/{athleteId}                        team.athletes[] (profil, phaseBank, programs…)
      ├─ tests/{testId}                           athlete.tests[]
      ├─ injuries/{injuryId}                      athlete.injuries[]
      ├─ measurements/{id}                        athlete.measurements[]
      ├─ sessions/{sessionId}                     athlete.days{tarih}.sessions[] (sourceId korunur)
      ├─ days/{tarih}                             athlete.days{tarih}.dailyNotes (boşsa yok)
      └─ logs/{YYYY-MM}                           srpe{id}, wellness{id}, night{id}, lift{id}
```

## 3. Eşleme tablosu

| Bugünkü yol | Yeni belge | Belge kimliği | Not |
|---|---|---|---|
| `data` (aşağıdakiler hariç) | `workspaces/{ws}` | `ws` | Küçük ayarlar burada kalır |
| `data.activeTeamId` | — | — | Cihaza ait, yazılmaz |
| `data.exercises[]` | `exercises/{id}` | `id` | Kütüphane, kulüpte ortak (K5) |
| `data.templates[]` | `templates/{id}` | `id` | |
| `data.customTests[]` | `customTests/{id}` | `id` | |
| `data.tryouts[]` | `tryouts/{id}` | `id` | |
| `data.researches[]` | `researches/{id}` | `id` | |
| `data.savedResearch[]` | `workspaces/{ws}` alanı | — | Küçük; kimliği belirsiz → üst belgede |
| `data.teams[]` (aşağıdakiler hariç) | `teams/{teamId}` | `id` | |
| `team.setup` + `team.weekOverrides` (aktif sezon) | `seasons/{activeSeasonId}` | sezon `id` | Ekran yine `team.setup`'ı okur; katman kurar |
| `team.seasonData[sid].{setup,weekOverrides}` | `seasons/{sid}` | `sid` | "Park etme" kalkar: sezon değiştirmek hiçbir şey yazmaz |
| `team.seasons[]` | `teams/{teamId}.seasons` | — | Yalnızca liste (id, ad) |
| `team.days{tarih}.sessions[]` | `sessions/{id}` | seans `id` | `seasonId`, `date`, `order` alanları eklenir |
| `team.seasonData[sid].days{tarih}.sessions[]` | `sessions/{id}` | seans `id` | Aynı koleksiyon, `seasonId` ile ayrılır |
| `team.days{tarih}.dailyNotes` | `days/{sid}_{tarih}` | | Boş not belge açmaz |
| `team.athletes[]` (aşağıdakiler hariç) | `athletes/{id}` | `id` | |
| `athlete.tests[]` | `athletes/{a}/tests/{id}` | `id` | |
| `athlete.injuries[]` | `…/injuries/{id}` | `id` | |
| `athlete.measurements[]` | `…/measurements/{id}` | `id` | `srcTest` bağı korunur |
| `athlete.days{tarih}.sessions[]` | `…/sessions/{id}` | `id` | Takım seansının kopyası `sourceId` taşır |
| `athlete.srpeLog[]` | `…/logs/{YYYY-MM}.srpe.{id}` | | Ay kovası (aşağıda) |
| `athlete.wellness[]` | `…/logs/{YYYY-MM}.wellness.{id}` | | Kimlik yoksa §1.3 |
| `athlete.nightLog[]` | `…/logs/{YYYY-MM}.night.{id}` | | |
| `athlete.liftLog` | `…/logs/{YYYY-MM}.lift.{id}` | | |
| `athlete.deletedSrpeSrcIds[]` | `athletes/{id}` alanı | | Küçük |

**Neden ay kovası:** sRPE, wellness ve gece verisi küçük ama çok sayıda kayıttan oluşuyor. Her biri ayrı
belge olsaydı 20 sporculu bir takımın açılışı on binlerce okuma tutardı. Ay kovasında bir ay tek belge,
ama her kayıt kendi alan yolunda (`srpe.<id>.scRPE`) güncellenir; iki kayıt birbirine yazmaz.

## 4. Yazım ve çakışma

Plan §3.3'teki kurallar geçerli. Kısaca:
- Her yazım yalnızca değişen alanları `update()` eder, ayrıca `updatedAt` (sunucu saati) ve `updatedBy` yazılır.
- Aynı alanda son yazan kazanır (K6).
- Silme yumuşaktır (`deletedAt`); 30 gün sonra temizlenir.
- Sıra için `order` sayısı kullanılır; araya eklenen kayıt iki komşunun ortalamasını alır.

## 5. Erişim (kurallar, özet)

| Rol | Okur | Yazar | Üye yönetir |
|---|---|---|---|
| owner | her şey | her şey | evet (sahiplik devredilemez) |
| admin | her şey | her şey | evet (sahip rolü veremez) |
| coach | erişimi olan takımlar + kütüphane | aynısı | hayır |
| viewer | erişimi olan takımlar + kütüphane | hayır | hayır |

- Üyelik `members/{uid}.teams`: `['*']` = bütün takımlar, ya da takım kimlikleri listesi.
- Davetle katılma tek batch'tir: kişi kendi üyeliğini davetteki rol ve takımlarla açar ve aynı
  anda daveti `usedBy` = kendisi olarak işaretler. Süresi geçmiş ya da kullanılmış davet çalışmaz.
- Taşınmış hesabın eski manifesti (`kullanici_verileri/{uid}.migratedTo`) eski yapıyı salt okunur yapar.

## 6. Henüz yapılmayanlar (bilerek)

| Konu | Neden bekliyor | Ne zaman |
|---|---|---|
| Storage'da `workspaces/{ws}/…` yolları | Storage kuralından Firestore üyeliğine bakmak, ilk deploy'da ek IAM izni ister; CI'daki otomatik deploy'u kırmasın | Faz 2, medya yeni yapıya geçerken |
| Kurallarda abonelik kontrolü (`billingOk`) | İstemci ve yapay zekâ kapısı yeterli; kurala eklemek her yazıma 2 okuma ekler | Abonelik açılmadan önce değerlendirilecek |
| `members.uid` collection-group dizini | Hesap silmenin başka kulüplerdeki üyeliği temizlemesi için. `firestore.indexes.json`'a yazıldı, CI dizin yayımlamıyor | Faz 5 (davet) açılmadan elle: `firebase deploy --only firestore:indexes` |
| Gerçek hesabın boyut raporu | Kullanıcıdan bekleniyor (senkron göstergesi → Veri boyutu) | Faz 0 |
| Kimliksiz dizi elemanlarının gerçek oranı | Boyut raporu + kuru çalıştırma gösterecek | Faz 3 |
