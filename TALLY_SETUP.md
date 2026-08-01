# Tally → CoachOS bağlantısı (adım adım)

Sporcular **Tally formunu** doldurur → veriler otomatik olarak CoachOS'a düşer.
Arada, Tally'den veriyi çekip uygulamaya temiz JSON veren küçük bir **Cloudflare Worker**
vardır. Bir kez kurulur; sonra **Auto-sync** açıkken yeni cevaplar kendiliğinden gelir.

> Neden ara katman? Tally API anahtarı tarayıcıya konulamaz (gizli). Worker anahtarı
> sunucu tarafında saklar ve uygulamaya yalnızca temiz veri döndürür.

---

## 1) Formların hazır — başlıkları değiştirmene gerek yok
İki Tally formun (**İçsel Yük Takibi** = sRPE, **Wellness Takibi** = Wellness) zaten var.
Worker, senin **Türkçe soru başlıklarını otomatik eşliyor** (`canonicalKey()`), dolayısıyla
Tally'de hiçbir şeyi yeniden adlandırmana gerek yok. Eşleşmeler:

**İçsel Yük Takibi → sRPE**
| Form sorusu | Uygulama alanı |
|---|---|
| Antrenman / Maç tarihi | Date |
| Sporcu ismi | Athlete |
| Top antrenmanı ne kadar yorucuydu? | TP RPE |
| Top antrenmanı süresi | TP Duration |
| Kuvvet & Kondisyon ne kadar yorucuydu? | S&C RPE |
| Kuvvet & Kondisyon antrenmanı süresi | S&C Duration |
| Müsabaka ne kadar yorucuydu? | Game RPE |
| Kaç dakika süre aldın? | Game Duration |

**Wellness Takibi → Wellness**
| Form sorusu | Uygulama alanı |
|---|---|
| Tarih | Date |
| Sporcu ismi | Athlete |
| Dinlenik KAH nedir? | RHR |
| Uyku kaliten nasıldı? | Sleep |
| Yorgunluk düzeyin nedir? | Fatigue |
| Kas ağrın ne derecede? | Soreness |
| Ağrın hangi bölgede? | Area of Pain |

Notlar:
- Wellness formunda **Readiness sorusu yok**; Worker, Readiness'i `Sleep`, `Fatigue`,
  `Soreness` ortalamasından otomatik hesaplıyor (istemezsen `tally-worker.js` içindeki
  ilgili bloğu sil — söyle, ben kaldırayım).
- `Sporcu ismi` açılır listesindeki adlar, CoachOS kadrosundaki adlarla aynı olsun.
  Eşleştirme büyük/küçük harf ve Türkçe karakter farklarını yok sayar — `İsmail`/`ismail`,
  `Bakırcı`/`Bakirci`, `Öztürk`/`Ozturk` aynı sporcu sayılır. Gerçekten farklı bir ad
  ise ayarına göre **atlanır** ya da **yeni sporcu** olarak eklenir.

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

## Zaten kurduysan: Worker'ı yeniden deploy et (veri eksikliği düzeltmesi)
Worker'ın önceki sürümü her formdan yalnızca ilk **400** gönderimi çekiyordu:
Tally sayfa başına en fazla 50 kayıt döndürüyor (istenen `limit=500` sessizce
50'ye kırpılıyor) ve Worker 8 sayfada duruyordu. Gerisi hiç gelmiyordu; bu yüzden
sezon ilerledikçe sporcuların **7 günlük RPE şeritleri boş** görünüyordu.

Güncel `tally-worker.js` sayfalamayı `hasMore` bitene kadar sürdürüyor,
Cloudflare'ın istek sınırına takılmadan kaldığı sayfayı uygulamaya bildiriyor ve
uygulama kalanını otomatik istiyor — böylece kaç gönderim olursa olsun hepsi geliyor.

**Düzeltmenin devreye girmesi için Cloudflare'deki Worker kodunu bu repodaki güncel
`tally-worker.js` ile değiştirip yeniden Deploy etmelisin.** Eski sürüm hâlâ
yayındaysa CoachOS → Tally Sync ekranı bunu uyarı olarak gösterir. Senkron sonrası
"sRPE submissions from Tally" satırındaki sayı, formdaki toplam gönderim sayısına
eşit olmalı.

## Hızlı test
Tarayıcıda `https://tally-sync.<KULLANICIADIN>.workers.dev/sync` adresini aç:
- `{ "sRPE":[...], "wellness":[...] }` ve diziler doluysa → çalışıyor.
- `meta.srpe.total` formdaki toplam gönderim sayısını gösterir; `meta.srpe.hasMore`
  true ise uygulama kalan sayfaları kendisi ister.
- `{ "error": "..." }` → mesaj sorunu söyler (API anahtarı yok / form ID yanlış).
- Diziler boşsa → forma henüz cevap gelmemiş ya da form ID yanlış.

## Gerçek-zamanlı istersen (opsiyonel)
Auto-sync birkaç dakikalık gecikmeyle çeker. Anında istersen Tally'de
**Integrations → Webhooks** ile bu Worker'a POST kurabilirsin; bu durumda Worker'ı
gelen cevabı saklayacak şekilde genişletmek gerekir — istersen o sürümü de hazırlarım.
