# Wellness Uyarıları ve Push Bildirimi — kurulum

Bir sporcu sabah wellness formunu gönderdiğinde, gönderim uyarı kriterlerini
karşılıyorsa sistem o sporcuya ait bir **Wellness Uyarısı** oluşturur ve o
sporcuyla ilgili ekip üyelerinin telefonlarına **push bildirimi** gönderir.

Kontrol günlük toplu değil, **gönderim başına** yapılır: sporcu formu gönderdiği
anda, saniyeler içinde.

---

## Uyarı kuralı

İki bağımsız sebep var; **biri yetiyor**, ikisinin bir arada olması gerekmiyor:

```
Overall Wellness < 3.5
    VEYA
en az bir bölgede orta ya da yüksek ağrı
```

| Overall Wellness | Ağrı | Sonuç |
|---|---|---|
| 3.5 – 5.0 | yok | uyarı yok |
| 3.5 – 5.0 | orta / yüksek | **uyarı** |
| 3.5’in altı | yok | **uyarı** |
| 3.5’in altı | orta / yüksek | **uyarı** |

**3.5 uyarı değildir.** Eşik kesin küçük: 3.5 geçer, 3.49 uyarı verir.

Hafif (1) ağrı uyarı sebebi sayılmaz — sporcuların çoğunda her sabah bir yerde
hafif bir şey oluyor ve onu bildirmek listeyi okunmaz hale getiriyor.

**Overall Wellness** uygulamanın kendi formülü: uyku, yorgunluk ve kas ağrısı
skorlarının ortalaması. Kas ağrısı boş bırakılmışsa ortalamaya girmiyor. Ekranda
gösterilen sayı tek ondalığa yuvarlanıyor; kararı veren sayı yuvarlanmamış hâli.

Kural `functions/wellness-alert.js` içinde tek bir yerde duruyor ve
`functions/test/` altındaki testlerle kilitli. `cd functions && npm test`.

---

## Kim bildirim alır?

Bildirim **yalnızca o sporcuyla ilgili** ekip üyelerine gider, sistemdeki herkese
değil. Kadrodaki beş rol:

| Rol | Kapsamı |
|---|---|
| Baş Antrenör | takımın tamamı |
| Yardımcı Antrenör | takımın tamamı |
| Performans Antrenörü | takımın tamamı |
| Fizyoterapist | takımın tamamı |
| **Bireysel Antrenör** | **yalnızca kendisine atanmış sporcular** |

Bireysel antrenörün hangi sporculara baktığı, kadro ekranındaki kartından
seçiliyor. Sporcu seçilmemişse o kişiye hiçbir uyarı gitmez ve kartı bunu yazar.

Hesabın sahibi (koç) baktığı **tüm takımların** uyarılarını alır.

Cihazı eşleştirilmemiş kişi sessizce atlanır; uyarı geri kalan herkese gitmeye
devam eder ve hata üretmez. Takımda o rolden kimse yoksa da aynı şey geçerli.

---

## Ekip üyelerinin hesabı yok — nasıl bildirim alıyorlar?

CoachOS'ta giriş yapan tek kişi koç. Ekip üyeleri kadroda birer **kayıt**: isim,
telefon, fotoğraf. Şifreleri, hesapları, e-postaları yok.

Telefonlarını uyarılara bağlamanın yolu, uygulamanın check-in formlarında zaten
kullandığı desen: **kişiye özel, tahmin edilemez bir adres**.

```
Koç → Kadro → Teknik Ekip → kişinin kartı → "+ Bildirim linki oluştur"
   → linki WhatsApp'tan O KİŞİYE gönderir
Ekip üyesi → linki telefonunda açar
   → "Bildirimleri aç" → izin verir
   → o telefon artık uyarıları alıyor
```

Aynı sayfa, kişiye takımının uyarı geçmişini de gösterir (salt okunur).

**Linki gruba atma.** Linki açan herkes o takımın uyarılarını görür — check-in
linkleriyle aynı güven modeli. Kişi ekipten ayrılırsa kartından **Geçersiz kıl**
denir, ya da kadrodan silinir; link kendiliğinden geçersiz olur.

---

## Kurulum

### 1. Web Push anahtarı üret

```
Firebase Console → periodization-planner
→ ⚙ Project settings → Cloud Messaging sekmesi
→ "Web configuration" → Web Push certificates → Generate key pair
```

Çıkan anahtarı (`B…` ile başlar) `push-config.js` dosyasındaki `vapidKey`
alanına yapıştır:

```js
var COACHOS_FCM = {
  vapidKey: 'BURAYA',
  ...
```

Gizli bir değer değil — tarayıcıya zaten iniyor ve tek başına hiçbir yetki
vermiyor. Bildirim **gönderme** yetkisi yalnızca Cloud Function'da.

Bu bölümde "Cloud Messaging API (V1) disabled" uyarısı görürsen yanındaki linkten
etkinleştir.

> Anahtar doldurulmadığı sürece uygulama bugünkü gibi çalışır: uyarılar oluşur ve
> ekranda listelenir, sadece telefona bildirim gitmez.

### 2. Anonim girişin açık olduğunu doğrula

```
Authentication → Sign-in method → Anonymous → Enabled
```

Ekip üyesinin sayfası, check-in formuyla aynı anonim oturum desenini kullanıyor.
Check-in formların çalışıyorsa bu zaten açıktır.

### 3. Firestore kurallarını yayınla

```
Firebase Console → Firestore Database → Rules
→ mevcut metnin tamamını sil → yenisini yapıştır → Publish
```

Yapıştırılacak metin `firestore.rules` dosyasında; uygulamanın **Check-in
Formları** sayfasındaki kurulum yardımı da aynı metni kopyalanmaya hazır tutuyor.

CLI ile: `firebase deploy --only firestore:rules --project periodization-planner`

**Bu adım atlanırsa** cihaz kaydı ve uyarı okuma "izin yok" ile döner.

### 4. (İsteğe bağlı) Indeksler

```
firebase deploy --only firestore:indexes --project periodization-planner
```

Zorunlu değil: indeks yokken listeler yine çalışıyor, uygulama sıralı sorgu
reddedilirse sırasız sorguya düşüp sıralamayı kendi yapıyor. İndeks yalnızca
listeyi büyük veride hızlı ve az okumalı tutuyor.

### 5. Cloud Function'ı deploy et

`FIREBASE_SERVICE_ACCOUNT` secret'ı tanımlıysa `main`'e merge yeterli
(`.github/workflows/functions.yml`). Elle:

```bash
cd functions && npm ci && npm test
firebase deploy --only functions --project periodization-planner
```

`npm test` yeşil değilse deploy etme.

### 6. Statik dosyaları yayınla

`index.html`, `alerts.html`, `push-config.js`, `firebase-messaging-sw.js` ve
`manifest.webmanifest` sitenin **kök dizininde** olmalı. Service worker yalnızca
kendi dizininin kapsamını alabildiği için `firebase-messaging-sw.js` kökte
duruyor; adı da sabit — Firebase SDK tam olarak o adresi arıyor.

> Service worker tarayıcıda agresif önbelleğe alınıyor: deploy sonrası bir kez
> hard refresh (Ctrl+Shift+R) yap.

---

## iPhone / iPad

Apple, web push'u **yalnızca ana ekrana eklenmiş** sayfalarda çalıştırıyor. iOS
kullanan herkesin (koç dahil) bir kerelik yapması gereken:

1. Safari'de sayfayı aç
2. Alttaki **Paylaş** → **Ana Ekrana Ekle**
3. Uygulamayı **ana ekrandan** aç
4. Bildirim iznini orada ver

Uygulama bunu algılayıp adımları ekranda gösteriyor. Android ve masaüstünde bu
adım gerekmiyor.

Manifest (`manifest.webmanifest`) yalnızca bu yüzden var — CoachOS bir PWA'ya
dönüşmüyor, service worker'ın önbelleği yok.

---

## Kontrol listesi (deploy sonrası)

| Test | Girdi | Beklenen |
|---|---|---|
| 1 | Uyku 4 · Yorgunluk 4 · Kas ağrısı 4 · ağrı yok | bildirim **yok** (skor 4.0) |
| 2 | Uyku 4 · Yorgunluk 3 · kas ağrısı **boş** · ağrı yok | bildirim **yok** (skor tam 3.5) |
| 3 | Uyku 4 · Yorgunluk 3 · kas ağrısı boş · **orta ağrı** | **bildirim** (ağrı tek başına yeter) |
| 4 | Uyku 3 · Yorgunluk 3 · Kas ağrısı 3 · ağrı yok | **bildirim** (skor 3.0) |
| 5 | Uyku 5 · Yorgunluk 5 · Kas ağrısı 5 · **yüksek ağrı** | **bildirim** (skor 5.0 ama ağrı var) |
| 6 | bildirime tıkla (uygulama kapalı) | **`alerts.html`** — uyarı listesi açılır |
| 7 | aynı sporcu aynı gün ikinci kez gönderir | telefonda **tek** satır (uyarı güncellenir) |
| 8 | bildirime tıkla (uyarı sayfası **açık** bir sekmede) | o sekme öne gelir, yeni sekme açılmaz — **başka** bir CoachOS sayfası (ör. check-in formu) açıksa ona dokunulmaz |
| 9 | CoachOS **ekranda açıkken** uyarı oluşsun | bildirim yine görünür (sayfa kendisi gösteriyor), **iki kopya çıkmaz** |
| 10 | koç ya da ekip üyesi bildirime tıklar | herkeste aynı yer: **`alerts.html`** — en ağır durumdaki sporcu en üstte |
| 11 | koç ikinci bir takıma hiç geçmemişken o takımdan uyarı | o takımın ekibi de bildirim alır |
| 12 | aynı sporcu aynı gün 09:00 kötü, 14:00 iyi gönderir | Kadro ekranında **14:00** değerleri görünür |

2 numaralı test en kritiği: tam 3.5 uyarı **vermemeli**.

9 ve 12 numaralı testler yeni: ikisi de sahada "bildirim bazen gelmiyor" /
"düzeltmem geri alındı" olarak görülen hatalardı.

---

## Sık karşılaşılanlar

| Belirti | Sebep / çözüm |
|---|---|
| "Bildirim kurulumu tamamlanmamış" | `push-config.js` içindeki `vapidKey` boş → 1. adım |
| Uyarı listesi "izin yok" diyor | Kurallar yayınlanmamış → 3. adım |
| Cihaz kaydedilemiyor | Kurallar yayınlanmamış, ya da ekip üyesinin linki geçersiz kılınmış |
| iPhone'da izin düğmesi hiç çıkmıyor | Ana ekrana eklenmemiş → iOS bölümü |
| "Bildirimler bu tarayıcıda engellenmiş" | Daha önce "Engelle" denmiş → adres çubuğundaki kilit → Bildirimler → izin ver → sayfayı yenile |
| Uyarı oluşuyor ama kimseye gitmiyor | Uyarı satırının **altındaki teslim raporuna** bak: kimin cihazı eşleşmemiş, kimde hangi hata var, kadro yayımlanmış mı — hepsi orada yazıyor |
| Bildirim geldi ama tıklayınca yanlış yere gidiyor | Kadro özeti eski bir adresle yayımlanmış; uygulamayı bir kez aç, kendini tazeler |
| Bir telefon hem koç hem ekip üyesi olarak açıldı | İkisi birlikte yaşıyor: iki sayfa ayrı Firebase uygulaması adı kullandığı için ayrı birer cihaz kaydı oluşuyor. Aynı uyarı iki kez gönderilebilir ama telefon ikisini aynı etiketle tek bildirimde birleştiriyor |
| Aynı telefonda **iki farklı ekip linki** açıldı | Bunlar çakışıyor: ekip üyesi sayfası tek bir eşleşme kaydı tutuyor, en son açılan link geçerli olur. İki takıma bakan kişiye iki ayrı cihaz gerekiyor |
| Bir gün çalıştı, sonra herkeste tamamen kesildi | Eski bir hataydı: bozuk bir mesaj (`invalid-argument`) bütün cihaz kayıtlarını silebiliyordu. Düzeltildi — artık yalnızca gerçekten dönmüş token'lar siliniyor |
| Uygulama açıkken bildirim gelmiyordu | Eski bir hataydı: Firebase'in worker'ı görünür bir sekme varsa bildirimi göstermiyor. Düzeltildi — sayfa artık bildirimi kendisi gösteriyor |

Function logları: `firebase functions:log --only wellnessAlert`

Log satırları boru hattının her adımını adıyla söylüyor: kriter karşılanmadı ·
gönderim zaten işlenmiş · kadro dokümanı yok · bildirilecek cihaz yok · uygulama
adresi bilinmiyor · uyarı gönderildi (kaç cihaz, hangi hatalar). Sporcunun
skorları ve ağrı bölgeleri **loglara yazılmıyor**; bir bildirimin neden
ulaşmadığını anlamak için gerekmiyorlar.

---

## Veri modeli

| Koleksiyon | Yazan | Okuyan |
|---|---|---|
| `wellness_alerts` | **yalnızca Cloud Function** | koç (tüm takımları) · ekip üyesi (yalnızca kendi takımı) |
| `push_tokens` | cihazın sahibi (kendi kaydı) | **yalnızca Cloud Function** |
| `staff_links` | koç | adresi bilen |
| `staff_members` | ekip üyesi (kendi kaydı, linkiyle doğrulanır) | kendisi |
| `alert_roster` | koç | **yalnızca Cloud Function** |

**1 sporcu = 1 uyarı.** Aynı sabah beş sporcu kriterleri karşılarsa beş ayrı kayıt
oluşur; birleştirilmezler. Uyarı kaydının adı sporcu + tarihten türediği için
aynı sporcunun aynı günkü ikinci gönderimi yeni kayıt açmaz, mevcut kaydı
günceller.

Uyarı kaydı şunları taşır: sporcu, takım, tarih, Overall Wellness, bileşen
skorları (uyku / yorgunluk / kas ağrısı / dinlenik nabız), orta ve yüksek ağrı
bölgeleri, uyarı sebepleri, bildirim gönderilen kişiler ve teslim durumu.

Teslim tarafında üç alan daha var ve hepsi tek bir soruyu cevaplıyor — **"bu
bildirim neden gelmedi?"**:

| Alan | Anlamı |
|---|---|
| `recipients[]` | kime gitti: `staffId`, ad, rol, **cihaz türü** (`android` / `ios-pwa` / `desktop`), `sent` \| `failed` ve hata kodu |
| `unreachable[]` | kapsamda olduğu hâlde **hiç cihaz eşleştirmemiş** ekip üyeleri |
| `rosterPublished` | takımın kadro özeti o an bulutta var mıydı |

Koçun uyarı listesi bu üçünü, ulaşmayan biri varsa satırın altında yazıyor.
Cihaz token'ları buraya **girmiyor**: bir cihaz adresi, uyarı geçmişinde durmasına
gerek olmayan bir sırdır; kim olduğu `staffId` ve isimle zaten belli.

Uyarılar `checkins` koleksiyonundan **bağımsız** yaşıyor: koçun tarayıcısı
check-in dokümanını işledikten ~10 dakika sonra siliyor, uyarı kaydı kalıcı.

### Güvenlik

- Uyarıyı **yalnızca sunucu** üretiyor; tarayıcıya yazma izni verilmiyor. Bir
  istemcinin uyarı üretebilmesi, o istemcinin başka kullanıcıların telefonuna
  bildirim gönderebilmesi demek olurdu.
- Cihaz token'ları hiçbir istemciye okutulmuyor; yalnızca gönderimi yapan
  function okuyor.
- Bir ekip üyesi yalnızca kendi takımının uyarılarını görebiliyor — kurallar bunu
  eşleşme kaydındaki `teamId` üzerinden sunucuda uyguluyor, istemci filtresine
  güvenilmiyor.
- Bildirim gönderimi için saklanan bir sır yok: function, projenin varsayılan
  servis hesabıyla FCM'e gidiyor.

### Kulüp bağımsızlığı

Kodda hiçbir kulüp, takım, sporcu ya da kişi kimliği gömülü değil. Uygulamanın
yayınlandığı adres bile sabit değil — koçun tarayıcısı onu kadro özetine yazıyor,
bildirimin derin linki oradan kuruluyor. Yeni bir kulüp ya da takım için yeniden
kodlama gerekmiyor.

### Bundan sonrası

Uyarı kaydı, bildirim kanalından bağımsız duruyor: sebepler cümle olarak değil
kod olarak (`low_score`, `pain`) saklanıyor ve alıcılar kayıtta listeleniyor. SMS
ya da e-posta kanalı eklemek, aynı kaydı okuyan ikinci bir gönderici yazmak
demek — uyarı mantığına dokunmadan.
