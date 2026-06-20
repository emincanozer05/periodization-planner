# Notion → CoachOS bağlantısı (adım adım)

Uygulamadaki **Worker URL** kutusuna doğrudan Notion sayfanın linki **yazılmaz**.
Araya, Notion verini güvenli şekilde uygulamaya taşıyan küçük bir **Cloudflare Worker**
girer. Aşağıdaki adımlar bir kez yapılır, sonra "Sync Now" her şeyi otomatik çeker.

> Neden ara katman? Notion token'ı tarayıcıya konulamaz (gizli). Worker, token'ı
> sunucu tarafında saklar ve uygulamaya yalnızca temiz JSON döndürür.

---

## 1) Notion entegrasyonu oluştur (token al)
1. https://www.notion.so/my-integrations → **New integration**
2. İsim ver (ör. `CoachOS Sync`), workspace'ini seç, **Internal** bırak.
3. Oluşunca **Internal Integration Secret**'i kopyala (ör. `ntn_...`). Bu senin `NOTION_TOKEN`'ın.

## 2) Entegrasyonu iki veritabanına bağla
sRPE ve Wellness veritabanlarının **her birinde**:
- Sağ üst **•••** → **Connections** (Connect to) → az önce oluşturduğun entegrasyonu seç.
- Bağlamadan Worker o veritabanını **göremez** (en sık hata budur).

## 3) Veritabanı ID'lerini al
Her veritabanını tam sayfa olarak aç, URL'den 32 karakterlik ID'yi al:
```
https://www.notion.so/workspace/<DATABASE_ID>?v=...
                                  ^^^^^^^^^^^^  (32 hex karakter)
```
> Not: Senin yapıştırdığın `https://www.notion.so/TOFA-2011-...` linki bir **sayfa**
> linki. ID, oradaki uzun harf-rakam bloğudur. İki ayrı veritabanı (sRPE + Wellness)
> için iki ayrı ID gerekir.

## 4) Worker'ı Cloudflare'de yayınla
1. https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Create Worker**.
2. İsim ver (ör. `periodization-sync`) → **Deploy** → **Edit code**.
3. Açılan editöre bu repodaki **`notion-worker.js`** dosyasının içeriğini olduğu gibi yapıştır → **Deploy**.
4. Worker'ın **Settings → Variables and Secrets** kısmında şunları ekle:
   - `NOTION_TOKEN`  → 1. adımdaki secret  (**Encrypt/Secret** olarak ekle)
   - `SRPE_DB`       → sRPE veritabanı ID'si
   - `WELLNESS_DB`   → Wellness veritabanı ID'si
   - Kaydet ve gerekiyorsa tekrar **Deploy**.

## 5) Uygulamaya bağla
1. Worker'ın adresini kopyala: `https://periodization-sync.<KULLANICIADIN>.workers.dev`
   (sonuna **`/sync` ekleme** — uygulama kendi ekliyor).
2. CoachOS → **Notion Sync** → **WORKER URL** kutusuna yapıştır → **Save URL**.
3. **Sync Now**'a bas. "Last sync" yeşil olur ve sporcuların sRPE/Wellness verisi gelir.

## Hızlı test
Tarayıcıda şunu aç: `https://periodization-sync.<KULLANICIADIN>.workers.dev/sync`
- `{ "sRPE": [...], "wellness": [...] }` görüyorsan Worker çalışıyor.
- `{ "error": "..." }` görüyorsan mesaj sorunu söyler (token yok / DB bağlı değil / ID yanlış).

## Sütun adları (Notion'da bunlar birebir olmalı)
- **sRPE DB:** `Athlete`, `Date`, `TP RPE`, `TP Duration`, `S&C RPE`, `S&C Duration`,
  `Game RPE`, `Game Duration`, (opsiyonel) `TP sRPE`, `S&C sRPE`, `Total sRPE`
- **Wellness DB:** `Athlete`, `Date`, `RHR`, `Sleep`, `Fatigue`, `Soreness`, `Area of Pain`, `Readiness`
- `Athlete` sütunu sporcunun **adını metin olarak** vermeli (Title/Text/Select ya da adı
  yazdıran bir Formula). Relation ise, adı gösteren bir Rollup/Formula ekleyip onu kullan.
- İsimler CoachOS'taki sporcu adlarıyla eşleşmezse, eşleşmeyen isimler **yeni sporcu** olarak eklenir.
