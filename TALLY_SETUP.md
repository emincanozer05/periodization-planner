# Tally → CoachOS bağlantısı (adım adım)

Sporcular **Tally formunu** doldurur → veriler otomatik olarak CoachOS'a düşer.
Arada, Tally'den veriyi çekip uygulamaya temiz JSON veren küçük bir **Cloudflare Worker**
vardır. Bir kez kurulur; sonra **Auto-sync** açıkken yeni cevaplar kendiliğinden gelir.

> Neden ara katman? Tally API anahtarı tarayıcıya konulamaz (gizli). Worker anahtarı
> sunucu tarafında saklar ve uygulamaya yalnızca temiz veri döndürür.

---

## 1) İki Tally formunu hazırla
İki form oluştur (ya da mevcutları kullan): **sRPE** ve **Wellness**.
Soru başlıkları **birebir** şu adlarda olmalı (uygulama bu adlara bakıyor):

- **sRPE formu:** `Athlete`, `Date`, `TP RPE`, `TP Duration`, `S&C RPE`, `S&C Duration`,
  `Game RPE`, `Game Duration` _(opsiyonel: `TP sRPE`, `S&C sRPE`, `Total sRPE`)_
- **Wellness formu:** `Athlete`, `Date`, `RHR`, `Sleep`, `Fatigue`, `Soreness`,
  `Area of Pain`, `Readiness`

Notlar:
- `Athlete` sporcunun **adını** vermeli — kısa metin sorusu ya da seçeneği sporcu adı olan
  bir açılır liste. (Adlar CoachOS kadrosuyla birebir aynı olsun; eşleşmeyen ad yeni sporcu açar.)
- `Date` sorusu yoksa sorun değil — **gönderim tarihi** otomatik kullanılır.

## 2) Tally API anahtarı al
Tally → **Settings → API keys** (workspace ayarları) → **Create API key** → kopyala.
Bu senin `TALLY_API_KEY`'in. (API, Tally'nin ücretli planında bulunur.)

## 3) Form ID'lerini al
Her formu aç; URL'deki kod form ID'sidir:
```
https://tally.so/forms/<FORM_ID>/edit
                        ^^^^^^^^^
```
İki form için iki ID: biri `SRPE_FORM`, biri `WELLNESS_FORM`.

## 4) Worker'ı Cloudflare'de yayınla
1. https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Create Worker**.
2. İsim ver (ör. `tally-sync`) → **Deploy** → **Edit code**.
3. Editöre bu repodaki **`tally-worker.js`** içeriğini olduğu gibi yapıştır → **Deploy**.
4. **Settings → Variables and Secrets**'a ekle:
   - `TALLY_API_KEY` → 2. adımdaki anahtar  (**Encrypt / Secret** olarak)
   - `SRPE_FORM`     → sRPE formunun ID'si
   - `WELLNESS_FORM` → Wellness formunun ID'si
   - Kaydet ve gerekiyorsa tekrar **Deploy**.

## 5) Uygulamaya bağla
1. Worker adresini kopyala: `https://tally-sync.<KULLANICIADIN>.workers.dev`
   (sonuna **`/sync` ekleme** — uygulama kendi ekliyor).
2. CoachOS → **Tally Sync** → **WORKER URL** kutusuna yapıştır → **Save URL**.
3. **Auto-sync**'i AÇ (ON) ve **Sync Now**'a bas. Bundan sonra forma gelen her cevap
   birkaç dakikada bir otomatik düşer.

## Hızlı test
Tarayıcıda `https://tally-sync.<KULLANICIADIN>.workers.dev/sync` adresini aç:
- `{ "sRPE":[...], "wellness":[...] }` ve diziler doluysa → çalışıyor.
- `{ "error": "..." }` → mesaj sorunu söyler (API anahtarı yok / form ID yanlış).
- Diziler boşsa → forma henüz cevap gelmemiş ya da form ID yanlış.

## Gerçek-zamanlı istersen (opsiyonel)
Auto-sync birkaç dakikalık gecikmeyle çeker. Anında istersen Tally'de
**Integrations → Webhooks** ile bu Worker'a POST kurabilirsin; bu durumda Worker'ı
gelen cevabı saklayacak şekilde genişletmek gerekir — istersen o sürümü de hazırlarım.
