# Wellness → Telegram uyarısı — kurulum

Sporcu sabah wellness formunu gönderdiğinde, gönderim uyarı ölçütünü karşılıyorsa
antrenör Telegram grubuna **o sporcuya ait tek bir mesaj** düşer. Günlük toplu özet
yok: her gönderim kendi başına değerlendirilir, kriteri karşılamayan için mesaj gitmez.

Mevcut form, mevcut Firestore yapısı ve koç tarafındaki işleme akışı **değişmedi**.
Eklenen tek şey `checkins` dokümanının üstündeki `telegramAlert*` damgaları.

---

## Alarm ölçütü

**En az bir bölgede orta ya da yüksek ağrı** — `payload.painMap` içinde değeri `2`
veya `3` olan bir bölge. Başka koşul yok.

Hafif ağrı (`1`) ne kararı etkiler ne de mesajda görünür: neredeyse her sabah
birinde bir yerde hafif bir şey oluyor ve onları da bildirmek listeyi okunmaz
hale getiriyor.

Wellness skoru **karara girmiyor**, mesajda bilgi olarak duruyor. İyi uyumuş,
dinç ama dizinde orta şiddette ağrı olan sporcu ekibin sabah görmesi gereken tam
o sporcu; ortalaması yüksek diye onu susturmak uyarının işini ters yapardı.

---

## Bir kerelik kurulum

Gereken: Firebase **Blaze** planı (Cloud Functions bunu şart koşuyor).

### 1) Bot token'ını Secret Manager'a koy

```bash
firebase functions:secrets:set TELEGRAM_BOT_TOKEN
```

Komut token'ı sorar; girilen değer Google Secret Manager'a yazılır. Token **hiçbir
yerde** koda, `.env` dosyasına, Firestore'a ya da bu depoya girmez — frontend
(`index.html`, `checkin.html`) onu hiç görmez.

Token değiştiğinde aynı komut yeni bir sürüm yazar; ardından function'ı yeniden
deploy etmek gerekir.

### 2) Bağımlılıkları kur ve deploy et

```bash
cd functions && npm install && cd ..
firebase deploy --only functions:wellnessTelegramAlert
```

Grup kimliği kodda varsayılan olarak `-1004420460025`. Değiştirmek için function'a
`TELEGRAM_CHAT_ID` ortam değişkeni verilir ya da `functions/index.js` içindeki tek
satır güncellenir.

Function **`us-central1`** bölgesinde. Firestore eur3'te (Avrupa) olduğu için deploy
her seferinde bir bölge uyarısı basıyor; tetikleme buna rağmen sorunsuz çalışıyor,
fark bir turluk ağ gecikmesi. Veritabanının yanına taşımak istersen `FUNCTION_REGION`
değişkenini `europe-west1` yap — ama bu yeni bir function yaratır, eskisini
us-central1'den elle silmek gerekir.

Firestore kurallarında değişiklik **gerekmiyor**: function Admin SDK ile yazıyor,
kurallar ona uygulanmıyor.

### 3) (İsteğe bağlı) GitHub Actions ile otomatik deploy

`.github/workflows/functions.yml`, `main`'e giren her `functions/` değişikliğinde
testleri çalıştırıp function'ı deploy eder. Açmak için bir kere:

1. Google Cloud Console → **IAM & Admin → Service Accounts** → yeni servis hesabı.
   Roller: **Firebase Admin**, **Cloud Functions Admin**, **Service Account User**,
   **Secret Manager Admin** (function'a secret'ı bağlayabilmesi için).
2. Hesaba bir **JSON anahtarı** üret ve indir.
3. GitHub → repo → **Settings → Secrets and variables → Actions → New repository
   secret** → ad: `FIREBASE_SERVICE_ACCOUNT`, değer: JSON dosyasının tamamı.

`TELEGRAM_BOT_TOKEN` **GitHub'a girmez** — o Secret Manager'da durur, function
çalışırken oradan okunur. GitHub'ın gördüğü tek sır deploy yetkisi olan servis hesabı.

Secret tanımlı değilse workflow kırmızıya düşmez: testleri çalıştırır, deploy adımını
atlar ve bir not bırakır. Yani elle deploy etmeye devam etmek de mümkün.

---

## Mesaj

```
🔴 WELLNESS ALERT
2026-09-12

Emir Papur

Antrenmana Hazır Oluşluk: 🟡 3.3/5

Ağrı Durumu:
🔴 Quadriceps, Kalf
🟡 Sırt, Omuz

Uyku Kalitesi: 🟢 4/5
Yorgunluk: 🟡 3/5
Kas Ağrısı: 🟡 3/5
Dinlenik KAH: 58 bpm

Overall Wellness: 🟡 3.3/5
```

- Tarih başlığın hemen altında: mesaj listesinde hangi güne ait olduğu ilk bakışta görünsün.
- Puan renkleri her 1-5 skorda aynı: `1 🔴 · 2 🟠 · 3 🟡 · 4 🟢 · 5 🔵`.
  Ondalıklı skor en yakın basamağa yuvarlanıp renklenir (3.3 → 🟡).
- Formda boş bırakılan soru mesajda hiç görünmez.
- `Antrenmana Hazır Oluşluk` ile `Overall Wellness` bu uygulamada **aynı sayı**:
  ikisi de aynı ortalamadan geliyor. Tek satıra indirmek isteniyorsa
  `functions/wellness-alert.js` → `buildMessage()` içinden biri silinebilir.

---

## Çift mesaj koruması

Mesaj gönderilmeden **önce** doküman bir Firestore transaction'ı içinde
sahipleniliyor (`telegramAlertClaimedAt`), gönderim başarılı olunca
`telegramAlertSent: true` yazılıyor. Aynı olay ikinci kez işlenirse damga zaten
durduğu için ikinci çalışma hiç mesaj atmadan çıkar.

Yeniden deneme yalnızca mesajın Telegram'a **hiç ulaşmadığı kesin** hâllerde
yapılıyor (ağ hatası, 5xx, 429) — en fazla iki ek deneme, 0.5 sn ve 2 sn arayla.
4xx (yanlış chat id, bot gruba ekli değil) tekrarlanmıyor.

## Hata durumu

Telegram'a ulaşılamazsa:

- Wellness kaydı **silinmez, değiştirilmez** — sporcunun gönderimi normal akışta
  koçun günlüğüne işlenmeye devam eder.
- Hata Cloud Functions loglarına düşer ve dokümana `telegramAlertError` olarak yazılır.
- İkinci bir mesaj atılmaz.

`TELEGRAM_BOT_TOKEN` tanımsızsa function sessizce çıkar ve logda hata bırakır;
form akışı yine etkilenmez.

---

## Test

```bash
cd functions && npm test
```

Ölçütün senaryoları (ağrı yok / yalnız hafif / orta / yüksek, düşük ve yüksek
skorla) ve mesaj biçimi burada doğrulanıyor.

Uçtan uca denemek için: `wellness.html#k=<token>` formunu aç, ağrı tablosunda bir
bölgeye **Orta** ya da **Yüksek** işaretle, gönder. Grupta mesaj birkaç saniye
içinde görünür. Ağrı tablosunu boş bırakıp gönderirsen mesaj gelmemeli.
Log: `firebase functions:log --only wellnessTelegramAlert`.
