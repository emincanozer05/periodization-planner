# Wellness Uyarıları ve Push Bildirimi — kurulum

Bir sporcu wellness formunu gönderdiğinde, o sporcuyla ilgili ekip üyelerinin
telefonlarına **push bildirimi** gider — **her gönderimde**, gönder'e basıldığı an.

Kriter bildirimi açıp kapatmıyor; bildirimin **seviyesini** söylüyor:

| Seviye | Ne zaman | Telefonda başlık | Uyarı kaydı |
|---|---|---|---|
| **Uyarı** | aşağıdaki kriter karşılanıyorsa | *CoachOS Wellness Uyarısı* | açılır |
| Rutin | diğer her gönderim | *CoachOS Wellness* | açılmaz |

Aynı sporcu aynı gün ikinci kez gönderirse telefon yine haber verir; bildirim
alanında yeni satır açmak yerine o sporcunun satırını günceller — uygulamanın
günün son gönderimini geçerli sayması gibi.

---

## Uyarı seviyesinin kuralı

Bildirimin "Uyarı" sayılması için iki bağımsız sebep var; **biri yetiyor**,
ikisinin bir arada olması gerekmiyor:

```
Overall Wellness < 3.5
    VEYA
en az bir bölgede orta ya da yüksek ağrı
```

| Overall Wellness | Ağrı | Sonuç |
|---|---|---|
| 3.5 – 5.0 | yok | rutin bildirim |
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
(`.github/workflows/functions.yml`). Secret hiç tanımlanmadıysa deploy olmaz ve
iş kırmızıya düşer — tıklaya tıklaya kurulum: **`CANLIYA-AL.md`**.

Eski Telegram sürümü (`wellnessTelegramAlert`) hâlâ yayındaysa **silinmeli**;
yoksa her gönderimde iki uyarı çıkar, biri eski kuralla:

```bash
firebase functions:delete wellnessTelegramAlert --region us-central1 --project periodization-planner
```

Elle deploy:

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
| 1 | Uyku 4 · Yorgunluk 4 · Kas ağrısı 4 · ağrı yok | bildirim gelir, başlık **CoachOS Wellness** |
| 2 | Uyku 4 · Yorgunluk 3 · kas ağrısı **boş** · ağrı yok | bildirim gelir, **rutin** (skor tam 3.5) |
| 3 | Uyku 4 · Yorgunluk 3 · kas ağrısı boş · **orta ağrı** | bildirim gelir, **Uyarı** (ağrı tek başına yeter) |
| 4 | Uyku 3 · Yorgunluk 3 · Kas ağrısı 3 · ağrı yok | bildirim gelir, **Uyarı** (skor 3.0) |
| 5 | Uyku 5 · Yorgunluk 5 · Kas ağrısı 5 · **yüksek ağrı** | bildirim gelir, **Uyarı** (skor 5.0 ama ağrı var) |
| 6 | bildirime tıkla | sporcunun Wellness ekranı açılır (uyarı da rutin de) |
| 7 | aynı sporcu aynı gün ikinci kez gönderir | telefon yine haber verir, satır **güncellenir** |

2 numaralı test en kritiği: tam 3.5 **uyarı** değil — ama bildirim yine gelir.

> Uygulama telefonda **açık ve önde** duruyorken tarayıcı bildirimi ekrana
> basmaz (gönderim yine olur). Test ederken uygulamayı arka plana al.

---

## Sık karşılaşılanlar

| Belirti | Sebep / çözüm |
|---|---|
| "Bildirim kurulumu tamamlanmamış" | `push-config.js` içindeki `vapidKey` boş → 1. adım |
| Uyarı listesi "izin yok" diyor | Kurallar yayınlanmamış → 3. adım |
| Cihaz kaydedilemiyor | Kurallar yayınlanmamış, ya da ekip üyesinin linki geçersiz kılınmış |
| iPhone'da izin düğmesi hiç çıkmıyor | Ana ekrana eklenmemiş → iOS bölümü |
| "Bildirimler bu tarayıcıda engellenmiş" | Daha önce "Engelle" denmiş → adres çubuğundaki kilit → Bildirimler → izin ver → sayfayı yenile |
| Uyarı oluşuyor ama kimseye gitmiyor | Listede `0/0` görünüyorsa kimse cihaz eşleştirmemiş; `0/3` görünüyorsa gönderim başarısız, function loglarına bak |
| Bildirim geldi ama tıklayınca yanlış yere gidiyor | Kadro özeti eski bir adresle yayımlanmış; uygulamayı bir kez aç, kendini tazeler |
| Bir telefon hem koç hem ekip üyesi olarak açıldı | Bir cihaz tek bir kimlik taşır; en son açılan geçerlidir. CoachOS'u yeniden açmak onu koç cihazına geri çevirir |

Function logları: `firebase functions:log --only wellnessAlert`

---

## Veri modeli

| Koleksiyon | Yazan | Okuyan |
|---|---|---|
| `wellness_alerts` | **yalnızca Cloud Function** (yalnızca uyarı seviyesi) | koç (tüm takımları) · ekip üyesi (yalnızca kendi takımı) |
| `push_tokens` | cihazın sahibi (kendi kaydı) | **yalnızca Cloud Function** |
| `staff_links` | koç | adresi bilen |
| `staff_members` | ekip üyesi (kendi kaydı, linkiyle doğrulanır) | kendisi |
| `alert_roster` | koç | **yalnızca Cloud Function** |

Rutin gönderimler kayıt açmaz — açsaydı uyarı listesi her sabah bütün kadroyla
dolar, son 200 kaydı gösteren liste birkaç günde gerçek uyarıları ekrandan
düşürürdü. Rutin bildirime tıklayan sporcunun Wellness ekranında açılır; veri
zaten orada.

**1 sporcu = 1 uyarı.** Aynı sabah beş sporcu kriterleri karşılarsa beş ayrı kayıt
oluşur; birleştirilmezler. Uyarı kaydının adı sporcu + tarihten türediği için
aynı sporcunun aynı günkü ikinci gönderimi yeni kayıt açmaz, mevcut kaydı
günceller.

Uyarı kaydı şunları taşır: sporcu, takım, tarih, Overall Wellness, bileşen
skorları (uyku / yorgunluk / kas ağrısı / dinlenik nabız), orta ve yüksek ağrı
bölgeleri, uyarı sebepleri, bildirim gönderilen kişiler ve teslim durumu.

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
