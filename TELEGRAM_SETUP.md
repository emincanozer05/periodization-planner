# Wellness → Telegram uyarısı — kurulum

Sporcu sabah wellness formunu gönderdiğinde, gönderim uyarı ölçütünü karşılıyorsa
antrenör Telegram grubuna **o sporcuya ait tek bir mesaj** düşer. Günlük toplu özet
yok: her gönderim kendi başına değerlendirilir, kriteri karşılamayan için mesaj gitmez.

Mevcut form, mevcut Firestore yapısı ve koç tarafındaki işleme akışı **değişmedi**.
Eklenen tek şey `checkins` dokümanının üstündeki `telegramAlert*` damgaları.

---

## Alarm ölçütü

İki koşul **birlikte** sağlanmalı:

| | Koşul | Veri |
|---|---|---|
| 1 | Overall Wellness `< 3.5` | `payload.sleep`, `payload.fatigue`, `payload.soreness` ortalaması — uygulamanın kendi formülü (`readiness`) |
| 2 | En az bir bölgede **orta** ya da **yüksek** ağrı | `payload.painMap` içinde değeri `2` veya `3` olan bir bölge |

Hafif ağrı (`1`) ne kararı etkiler ne de mesajda görünür. Tam `3.5` uyarı vermez
(kural "kesin küçük"). Üç skorun üçü de boşsa ölçüt hesaplanamaz, uyarı çıkmaz.

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

Firestore kurallarında değişiklik **gerekmiyor**: function Admin SDK ile yazıyor,
kurallar ona uygulanmıyor.

---

## Mesaj

```
🔴 WELLNESS ALERT

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
Tarih: 2026-09-12

⚠️ Wellness < 3.5 + Orta/Yüksek ağrı
```

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

Ölçütün altı senaryosu (4.0/ağrı yok, 3.4/ağrı yok, 3.4/orta, 3.0/yüksek,
4.0/yüksek, yalnız hafif ağrı) ve mesaj biçimi burada doğrulanıyor.

Uçtan uca denemek için: `wellness.html#k=<token>` formunu aç, uyku 4 · yorgunluk 3 ·
kas ağrısı 3 seç (ortalama 3.3), ağrı tablosunda bir bölgeye **Orta** ya da
**Yüksek** işaretle, gönder. Grupta mesaj birkaç saniye içinde görünür.
Log: `firebase functions:log --only wellnessTelegramAlert`.
