# Veri Modeli — kayıt bazlı senkron (schemaVersion 2)

> **Durum:** Faz 2 — eşleme kodda: `src/app/468-store-map.jsx` (v2: düz takım koleksiyonları, kesirli sıra, alan düzeyinde fark), testi `store-map-test.js` · **Son güncelleme:** 2026-11-12
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
3. **Bir dizi yalnızca bütün elemanları geçerli ve (takım içinde) benzersiz bir kimlik taşıyorsa
   belgelere bölünür.** Kimliksiz ya da tekrarlanan kimlikli bir eleman varsa dizi üst belgede **olduğu
   gibi** kalır; kimlik uydurulmaz. Aynı kural gün anahtarları (`YYYY-MM-DD`) ve seans kimlikleri için de geçerli.
   **Liste belgesi yok:** takımın sporcuları, kütüphanenin egzersizleri gibi üyelikler koleksiyonun kendisinden
   okunur; iki cihaz aynı anda farklı kayıt eklerse ikisi de kalır.
   **Kesirli sıra:** her kaydın `_o` değeri var. Yeri değişmeyen kayıt değerini korur; yeni ya da taşınan
   kayıt iki komşusunun arasından değer alır (kütüphanenin başına eklemek yalnızca o belgeyi yazar).
   **Günlük kayıtları** ay kovasında `k_<kimlik>` ile, kimliksiz eski kayıtlar içeriklerinin özetiyle (`h_<özet>`) durur.
4. **Cihaza ait olan buluta gitmez:** `activeTeamId` (seçili takım), seçili sezon, görünüm tercihleri.
5. **Belge sınırı 1 MiB.** En büyük belge adayları bir ayın log kovası ve çok seanslı bir sporcu
   belgesi. Taşıma aracının kuru çalıştırması (Faz 3) her belgenin boyutunu ölçer; 900 KB'yi aşan
   olursa taşıma durur, o alan haritada kendi belgesine ayrılır.
6. **Gömülü medya** (`data:image…`, `data:application/pdf…`) belgede kalmaz: taşımada Storage'a
   yüklenir, belgede yolu durur.

## 2. Ağaç

```
workspaces/{ws}                                  ws = sahibin uid'i; YALNIZCA kimlik: name, ownerUid, schemaVersion, createdAt
├─ state/root                                    data'nın kalan küçük alanları (interval, ai, customMuscles, testTemplates…)
├─ members/{uid}                                 role, teams, uid, invite?
├─ invites/{token}                               role, teams, usedBy, expiresAt, createdBy
├─ exercises/{id}  templates/{id}  customTests/{id}  tryouts/{id}  researches/{id}
└─ teams/{teamId}                                takımın kendi alanları (staff, checkin, indiv, seasons listesi…)
   ├─ seasons/{seasonId}                          setup + weekOverrides (aktif olan `_active`)
   ├─ days/{seasonId}_{tarih}                     takım takviminin günü (seanslar hariç)
   ├─ sessions/{sessionId}                        takım seansı: _season, _date, _o
   ├─ athletes/{athleteId}                        sporcu profili (phaseBank, programs…)
   ├─ tests/{id}  injuries/{id}  measurements/{id}  sporcunun kayıtları: _a = sporcu
   ├─ athleteDays/{athleteId}_{tarih}             sporcu takviminin günü
   ├─ athleteSessions/{sessionId}                 sporcu seansı: _a, _date (sourceId korunur)
   └─ logs/{athleteId}_{YYYY-MM}                  ay kovası: srpe{…}, wellness{…}, night{…}, lift{…}
```

**Neden alt kayıtlar takım düzeyinde:** sporcu başına alt koleksiyon olsaydı 20 sporculu bir takım için
120'den fazla canlı dinleyici gerekirdi. Düz koleksiyonlarla takım başına ~10 dinleyici yeter; "takımın bütün
testleri" (Takım Verileri) de tek sorgu olur. Güvenlik kuralı aynı: `teams/{teamId}/**`.

## 3. Eşleme tablosu

| Bugünkü yol | Yeni belge | Belge kimliği | Not |
|---|---|---|---|
| `data` (aşağıdakiler hariç) | `workspaces/{ws}/state/root` | | Küçük ayarlar; çalışma alanı belgesi yalnızca kimlik (sahiplik kurallarla korunur) |
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
| `team.days{tarih}` (seanslar hariç) | `days/{sid}_{tarih}` | | Her günün belgesi var (boş gün de geri kurulabilsin); seans eklemek gün belgesine dokunmaz |
| `team.athletes[]` (aşağıdakiler hariç) | `athletes/{id}` | `id` | |
| `athlete.tests[]` | `teams/{t}/tests/{id}` | `id` | `_a` = sporcu |
| `athlete.injuries[]` | `teams/{t}/injuries/{id}` | `id` | `_a` = sporcu |
| `athlete.measurements[]` | `teams/{t}/measurements/{id}` | `id` | `_a`; `srcTest` bağı korunur |
| `athlete.days{tarih}` (seanslar hariç) | `teams/{t}/athleteDays/{a}_{tarih}` | | |
| `athlete.days{tarih}.sessions[]` | `teams/{t}/athleteSessions/{id}` | `id` | Takım seansının kopyası `sourceId` taşır |
| `athlete.srpeLog[]` | `teams/{t}/logs/{a}_{YYYY-MM}.srpe.k_{id}` | | Ay kovası (aşağıda) |
| `athlete.wellness[]` | `…/logs/{a}_{YYYY-MM}.wellness.{k_id\|h_özet}` | | Kimliksiz kayıt içerik özetiyle (§1.3) |
| `athlete.nightLog[]` | `…/logs/{a}_{YYYY-MM}.night.k_{id}` | | |
| `athlete.liftLog[]` | `…/logs/{a}_{YYYY-MM}.lift.k_{id}` | | |
| `athlete.deletedSrpeSrcIds[]` | `athletes/{id}` alanı | | Küçük |

**Neden ay kovası:** sRPE, wellness ve gece verisi küçük ama çok sayıda kayıttan oluşuyor. Her biri ayrı
belge olsaydı 20 sporculu bir takımın açılışı on binlerce okuma tutardı. Ay kovasında bir ay tek belge,
ama her kayıt kendi alan yolunda (`srpe.<id>.scRPE`) güncellenir; iki kayıt birbirine yazmaz.

## 4. Yazım ve çakışma

- **Yalnızca fark yazılır** (`smDiff`): yeni belge `set`, kaybolan belge `delete`, değişen belge `update`.
  `update` alan düzeyinde ve en fazla 3 seviye iç içe nesneye iner (`wellness.h_…`); diziler bütün değer.
- **İki cihaz:** farklı belgeler ya da aynı belgenin farklı alanları → ikisi de kalır. Aynı alan → son yazan
  kazanır (K6). Biri kaydı siler, öbürü düzenlerse silme kalır; düzenleme (`update` olmayan belgeye)
  reddedilir ve uygulamada bildirilir.
- Bunların hepsi `store-map-test.js` → "iki cihaz aynı anda" bölümünde `smApply` ile, ayrıca
  `rules-test/test/store-io.test.js`'te emulator'deki gerçek Firestore'a karşı, gerçek kurallarla ve iki istemcinin
  AYNI ANDA yazmasıyla sınanır.
- Her yazım `_at` (sunucu saati) ve `_by` (yazanın uid'i) taşır; okurken atılır, fark hesabına girmez.
- Toplu yazım (400'lük paket) atomik: içinde silinmiş belgeye bir düzenleme varsa paket tek tek yeniden
  denenir; yalnızca düşen düzenleme bildirilir.

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
| Gerçek hesapta bölünemeyen (olduğu gibi kalan) dizilerin oranı | Senkron tanı penceresi → "Yeni yapı ön kontrolü" gösterir | Faz 0/3 |
