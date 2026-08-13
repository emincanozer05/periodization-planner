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
| Kas ağrın ne derecede? / **Ağrı düzeyin nedir?** | Soreness |
| Ağrın hangi bölgede? (serbest metin **ya da çoklu seçim**) | Area of Pain |
| Ağrın hangi bölgede **ve şiddette**? (matris) | Pain Map |

Notlar:
- **Ağrı bölgesi çoklu seçim olarak sorulduysa** (Multi-select / Dropdown; seçenekler
  Boyun, Omuz, Sırt, … Diz, Kalf): sporcunun seçtiği bölgeler `Bel, Diz` biçiminde
  gelir ve **Wellness Heatmap**'te o günün kutucuğunda tek tek görünür. Bu soru şiddet
  sormadığı için her bölgenin şiddeti aynı check-in'deki **"Ağrı düzeyin nedir?"**
  (1 çok fazla … 5 çok az) cevabından türetilir: 1-2 → Fazla, 3 → Orta, 4-5 → Hafif.
  Sporcu kutuya cümle yazdıysa (`belim tutuldu`) bu bölge listesi sayılmaz, eskisi gibi
  not olarak görünür — ayrım bölge sözlüğüyle yapılır, noktalama ile değil.
- **Ağrı matrisi**: soruyu Tally'de *Matrix* olarak kurduysan (satırlar = bölgeler
  — Boyun, Omuz, Sırt, Bel, Kalça, Hamstring… ; sütunlar = **Hafif / Orta / Fazla**),
  Worker bunu `Boyun: Orta, Bel: Fazla` biçiminde tek bir `Pain Map` alanına çevirir.
  CoachOS bunu check-in'e `painMap` olarak yazar ve **Wellness Heatmap**'te o günün
  kutucuğunun içinde gösterir. Bölge adları formda yazdığın gibi korunur — uygulamanın
  etiketi olmayan bölgeler (Boyun, Göğüs, Karın…) de görünür. Sütun başlıkları
  Türkçe (Hafif/Orta/Fazla), İngilizce (Mild/Moderate/Severe) ya da 1/2/3 olabilir.
  Serbest metin "Ağrın hangi bölgede?" sorusu kalabilir; ikisi birlikte çalışır.
  Tally matrisi bazen **satır başına bir soru** olarak yollar ve her birini
  `💥 Ağrın hangi bölgede ve şiddette? (opsiyonel) [Sırt]` gibi adlandırır — yani bölge
  adı, sorunun sonundaki köşeli parantezin içindedir. Hem Worker hem uygulama köşeli
  parantezdeki kısmı alıp gerisini atar, baştaki emojiyi de temizler; heatmap kutucuğunda
  **yalnızca `Sırt`** yazar. Bu temizlik okurken de yapıldığı için uzun adla kaydedilmiş
  eski check-in'ler yeniden senkron gerektirmeden düzelir.
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

> Cevapların birkaç dakika beklemeden **anında** düşmesini istiyorsan aşağıdaki
> [Webhook](#webhook-cevaplar-anında-düşsün-opsiyonel-ama-tavsiye-edilir) bölümüne bak —
> Tally'nin **Integrations → Webhooks** ekranındaki *Endpoint URL* kutusuna ne
> yazılacağını orada anlatıyor. Auto-sync ile birlikte çalışır, birini kapatman gerekmez.

## Önce adresi test et
Tally Sync ekranında **Adresi test et** düğmesi var. Worker'a bir kez sorar ve ne
döndüğünü olduğu gibi yazar: hangi adrese gittiğini, Worker'ın sürümünü ve ilk sayfada
kaç satır geldiğini. Sorunun adreste mi, Worker ayarlarında mı, yoksa formda mı olduğunu
tek basışta ayırır.

**En sık yapılan hata: adresin sonuna `/sync` yapıştırmak.** Uygulama `/sync`'i kendisi
ekliyor; sen de eklersen istek `…/sync/sync` adresine gidiyor, Worker oraya JSON değil düz
metin döndürüyor ve senkron anlaşılmaz bir hatayla düşüyordu. Artık sondaki `/sync`
(ve `/diag`, fazladan `/`, `?…` kısmı) otomatik atılıyor, `https://` eksikse tamamlanıyor.
Yanlışlıkla Tally form linkini ya da Cloudflare **panel** adresini
(`dash.cloudflare.com/…`) yapıştırırsan bunu adıyla söylüyor.

Doğru adres şuna benzer — sonunda başka hiçbir şey olmadan:
```
https://tally-sync.KULLANICIADIN.workers.dev
```

## "Sync Now'a basıyorum, veri gelmiyor" — v7'de düzeltilenler
Senkron başarılı görünüp hiç veri düşmemesinin dört sebebi vardı; dördü de düzeltildi.
Worker tarafındaki ikisi için **Cloudflare'deki kodu bu repodaki `tally-worker.js` ile
değiştirip yeniden Deploy etmen** gerekiyor (uygulama artık `v9` bekliyor).

1. **Tek bozuk form bütün senkronu düşürüyordu.** İki formdan biri okunamıyorsa
   (ID yanlış, form silinmiş, API anahtarı o formu göremiyor) Worker hata döndürüyor ve
   **diğer formun bütün sezonu da çöpe gidiyordu** — ekranda kırmızı bir hata ve sıfır satır.
   Artık okunabilen form geliyor, okunamayan form ise Tally Sync ekranında adıyla ve
   Tally'nin döndürdüğü mesajla yazılıyor.
2. **Sporcu adı isim yerine kimlik olarak geliyordu.** Tally açılır liste cevaplarını
   seçenek kimliğiyle yolluyor; kimlik ada çevrilemezse ad `3f1a2b4c-…` oluyor, kadroda
   kimseyle eşleşmiyor ve **her gönderim sessizce atlanıyordu**. Artık bu durum sayılıp
   "sporcu adı kimlik olarak geldi" uyarısı olarak gösteriliyor (ve `autoCreate` açık olsa
   bile kimlik adlı sporcu oluşturulmuyor).
3. **"/ formda N" sayacı hiç çalışmıyordu.** Tally toplam sayıyı
   `{"all":420,"completed":410}` biçiminde bir nesne olarak yolluyor; Worker bunu sayı
   sanıp `null` yazıyordu, yani "hepsi geldi mi?" kontrolü ölüydü ve eksik senkron
   tastamam görünüyordu.
4. **Auto-sync yalnızca Tally Sync ekranındayken çalışıyordu.** Zamanlayıcı o ekrana
   bağlıydı; koç başka bir sekmeye geçtiği anda duruyordu. Artık uygulama genelinde
   çalışıyor — hangi ekranda olursan ol yeni cevaplar düşüyor.

Ayrıca: senkron artık kadroyu **senkron başlamadan önceki haliyle geri yazmıyor.**
Eskiden sporcu listesinin bir kopyası senkron başında alınıp sonunda olduğu gibi geri
yazılıyordu; senkron sürerken eklenen sporcu ya da yazılan antrenman birkaç dakika sonra
kendiliğinden kayboluyordu. Bir de **Sync Now** artık kutuya yazdığın adresle çalışıyor,
önce **Save URL**'e basmak gerekmiyor.

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

## Her check-in'de "Bölge adı gelmedi" yazıyorsa: Worker'ı yeniden deploy et
Tally, matris cevabını **satır kimlikleriyle** yollar
(`{"eeb7ce0e-…":["Orta"]}`). Bu kimlikleri bölge adına çevirmek Worker'ın işi;
çeviremezse CoachOS bölgeyi adlandıramaz ve bütün sporcularda **"Bölge adı gelmedi"**
görünür.

Güncel `tally-worker.js` bunu bulabildiği **bütün** kaynaklardan çözüyor: gönderim
yanıtındaki soru tanımı, sayfadaki diğer sorular ve form tanımının üç ucu
(`GET /forms/<FORM_ID>`, `…/questions`, `…/blocks`). Hepsi okunup birleştiriliyor —
biri boş dönse de diğerleri deneniyor. Sonuç uygulamaya `Boyun: Orta, Bel: Fazla`
biçiminde geliyor.

> v3'te bir hata vardı: ilk **etiket üreten** uca ulaşınca duruyordu. `GET /forms/<ID>`
> her zaman en az bir etiket üretir (formun kendi adı), dolayısıyla satırların
> bulunduğu uç hiç denenmiyordu ve bölgeler yine isimsiz kalıyordu. v4 hiçbir ucu
> atlamıyor.

Yapman gereken: Cloudflare'deki Worker kodunu bu repodaki güncel `tally-worker.js`
ile değiştirip **yeniden Deploy et**, sonra CoachOS → Tally Sync → **Sync Now**.
Worker artık kendi sürümünü `meta.worker.version` olarak bildiriyor; eski bir sürüm
yayındaysa Tally Sync ekranı bunu uyarı olarak gösterir ve "Ağrı bölgesi isimsiz gelen
check-in" satırında kaç check-in'in etkilendiğini yazar.

Ek not: bölge hâlâ isimsiz geliyorsa Tally'de matris **satır başlıklarının boş
olmadığını** ve `TALLY_API_KEY`'in o formu okuyabildiğini kontrol et. Formda serbest
metin "Ağrın hangi bölgede?" sorusu da varsa, kimlik çözülemediği durumda CoachOS o
kısa cevabı bölge adı olarak kullanır — yani hiç değilse bölge boş kalmaz.

### Tanı: `/diag`
Tarayıcıda `https://tally-sync.<KULLANICIADIN>.workers.dev/diag` adresini aç. Worker'ın
Tally'den ne okuduğunu olduğu gibi gösterir:
- `worker.version` → Cloudflare'de yayında olan sürüm.
- `formLabels.sources` → üç uç noktanın her biri, HTTP kodu ve kaç etiket getirdiği.
  Hepsi `added: 0` ise sorun etiket kaynağında: `401`/`403` API anahtarının o formu
  okuyamadığını, `404` o ucun bu planda olmadığını söyler.
- `submissionsPage.questions` → Tally'nin soruları nasıl tanımladığı (matrisin satır
  listesini gönderip göndermediği burada görünür).
- `gridAnswers[].rawAnswer` / `.decoded` → ham matris cevabı ve neye çözüldüğü.
  `decoded` içinde hâlâ kimlik varsa çözüm yapılamamış demektir.
- `hint` → yukarıdakilere bakıp ne yapılması gerektiğini bir cümleyle söyler.

(`/diag` bir gönderimin cevaplarını içerir; çıktıyı forma davrandığın gibi paylaş.)

## Hızlı test
Tarayıcıda `https://tally-sync.<KULLANICIADIN>.workers.dev/sync` adresini aç:
- `{ "sRPE":[...], "wellness":[...] }` ve diziler doluysa → çalışıyor.
- `meta.worker.version` yayındaki Worker sürümünü söyler; uygulamanın beklediğinden
  küçükse (ya da hiç yoksa) Cloudflare'e eski kod deploy edilmiş demektir.
- `meta.srpe.total` formdaki toplam gönderim sayısını gösterir; `meta.srpe.hasMore`
  true ise uygulama kalan sayfaları kendisi ister.
- `meta.srpe.error` / `meta.wellness.error` doluysa o form okunamamış demektir (diğeri
  yine gelir). İkisi birden okunamazsa yanıt tek bir `error` olur.
- `meta.<form>.unnamedOptionIds` > 0 ise açılır liste cevapları ada çevrilememiş — sporcu
  adları kimlik olarak geliyor ve hiçbir gönderim kadroya yazılamaz.
- `meta.wellness.unnamedGridIds` > 0 ise ağrı matrisinin kimlikleri çözülememiş —
  yukarıdaki bölüme bak. `wellness` satırlarında `"Pain Map": "Boyun: Orta"` görüyorsan
  her şey yolunda.
- `{ "error": "..." }` → mesaj sorunu söyler (API anahtarı yok / form ID yanlış).
- Diziler boşsa → forma henüz cevap gelmemiş ya da form ID yanlış.
- `meta.webhook.enabled` webhook saklama alanının bağlı olup olmadığını,
  `meta.webhook.srpe` / `.wellness` ise kaç gönderimin çekilmek yerine anında düştüğünü
  söyler. `meta.webhook.mode` `api`, `webhook` ya da `api+webhook` olur.

## Webhook: cevaplar anında düşsün (opsiyonel ama tavsiye edilir)

Auto-sync formu **düzenli aralıklarla yoklar**; cevap birkaç dakika sonra düşer.
Webhook bunun tersidir: sporcu formu gönderdiği **anda** Tally cevabı Worker'a yollar.
Worker cevabı saklar, `/sync` de onu çektiği satırlarla birlikte uygulamaya verir —
yani uygulamada değişen bir ayar yok, aynı Worker adresi çalışmaya devam eder.

Üç faydası var:
- **Gecikme kalmaz.** Antrenman çıkışı doldurulan sRPE, koç ekranı açtığında oradadır.
- **İsimler kimlik olarak gelmez.** Webhook gönderisi seçenek/satır/sütun etiketlerini
  *kendi içinde* taşır; yukarıdaki "sporcu adı `3f1a2b4c-…` olarak geldi" ve "bölge adı
  gelmedi" arızalarının ikisi de bu yolda meydana gelemez.
- **Tally API anahtarı şart değil.** API, Tally'nin ücretli planında; webhook değil.
  `TALLY_API_KEY` hiç yoksa bile Worker kendisine gönderilen her şeyi sunar.

### 1) Worker'a bir saklama alanı bağla (KV)
Gelen cevabın bir yere yazılması gerekiyor.
1. Cloudflare → **Storage & Databases → KV** → **Create instance** → ad: `tally-store` → oluştur.
2. Worker'ına gir → **Settings → Bindings** → **Add → KV namespace**:
   - **Variable name**: `TALLY_STORE`  ← *bu ad birebir böyle olmalı*
   - **KV namespace**: az önce oluşturduğun `tally-store`
3. **Deploy**.

> KV bağlı değilse Worker gelen gönderiyi kabul etmez (`503` döner ve sebebini yazar).
> Bu kasıtlı: sessizce yutup veriyi çöpe atmaktansa Tally'nin "başarısız" göstermesi
> daha iyi — Tally başarısız gönderimleri bir süre yeniden dener.

### 2) Adresi Tally'ye gir
Tally → formu aç → **Integrations → Webhooks → Add a webhook endpoint**.
**Endpoint URL** kutusuna Worker adresinin sonuna `/webhook` ekleyerek yaz:

```
https://tally-sync.KULLANICIADIN.workers.dev/webhook
```

**Bunu iki forma da ayrı ayrı yap** (İçsel Yük Takibi + Wellness Takibi). Worker hangi
formdan geldiğini önce form ID'sinden, o yoksa form adından, o da yoksa soruların
kendisinden anlar — yani `SRPE_FORM` / `WELLNESS_FORM` değişkenlerini girmemiş olsan
bile doğru tarafa yazar.

Adresi karıştırmak diye bir dert yok: Worker **hangi yola gelirse gelsin** POST'u
webhook gönderisi olarak kabul eder. Kök adresi (`…workers.dev`) yapıştırsan da çalışır;
`/webhook` yalnızca okununca ne olduğu belli olsun diye.

### 3) İmzalama (Tally'deki "Add a signing secret")
İstersen Tally'de **Add a signing secret**'a basıp bir metin gir. Aynı metni Worker'a da
ekle: **Settings → Variables and Secrets** → `TALLY_SIGNING_SECRET` (**Encrypt / Secret**
olarak). Bundan sonra Worker imzasız ya da imzası tutmayan istekleri `401` ile reddeder —
yani Worker adresini bilen başka birinin sahte check-in yollaması engellenir.

Sırası önemli: **önce Worker'a değişkeni ekleyip Deploy et, sonra Tally'de secret'ı gir.**
Ters yaparsan aradaki gönderimler imzasız gelir ve reddedilir. Secret kullanmayacaksan
`TALLY_SIGNING_SECRET`'i hiç ekleme; Worker o zaman imza aramaz.

### 4) Kontrol et
Tarayıcıda `https://tally-sync.KULLANICIADIN.workers.dev/webhook` adresini aç
(POST değil, düz GET — durum raporu döner):
- `ready: true` → saklama alanı bağlı, gönderi kabul edilebilir.
- `ready: false` → `store` alanı ne yapman gerektiğini yazar (KV bağlanmamış).
- `signed` → imza kontrolü açık mı.
- `held` → şu an Worker'da duran gönderim sayısı, form form.

Sonra formu **bir kez kendin doldur**: `held` sayısı 1 artmalı. CoachOS → Tally Sync →
**Sync Now**: "Webhook ile anında düşen gönderim" satırı ekranda görünür.

### Bilinmesi gerekenler
- **Webhook geçmişi getirmez.** Yalnızca kurulduktan *sonraki* cevaplar gelir. Eski
  sezonun tamamı için API yolu (Auto-sync) gerekir — ikisi birlikte çalışır, ikisi de
  açıkken bir gönderim iki kere sayılmaz: aynı gönderim hem itilip hem çekildiyse
  Worker gönderim kimliğinden anlayıp tek satır bırakır (itilen kopya kazanır, çünkü
  etiketleri çözülmüş olan odur).
- **Auto-sync'i kapatman gerekmez.** Webhook anlık akışı, Auto-sync ise arada bir
  "acaba kaçan oldu mu" taramasını verir. İkisini birlikte açık bırakmak en sağlamı.
- Worker'da saklanan gönderimler **yalnızca ilk sayfa isteğinde** gönderilir; uzun bir
  çekim birden çok tura bölündüğünde her turda tekrar yollanıp aynı check-in defalarca
  sayılmasın diye.
