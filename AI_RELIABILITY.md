# CoachOS — AI Model Failover & Reliability System

Program Yazma Asistanı (Bireyselleştirme → "Antrenmanı oluştur") artık tarayıcıda
değil, sunucuda bir **arka plan işi** olarak çalışıyor. Bu belge kurulumu ve
uygulama raporunu (prompt Madde 25) içerir.

## Kurulum (bir kez, yönetici)

1. Gemini anahtarını Secret Manager'a koy — anahtar depoya, tarayıcıya ya da
   senkron veriye hiç girmez:

   ```
   firebase functions:secrets:set GEMINI_API_KEY
   ```

2. Fonksiyonları ve Firestore kurallarını deploy et (main'e merge sonrası
   `Deploy Cloud Functions` iş akışı bunu kendisi dener; secret yoksa AI adımı
   uyarı verip geçer, wellness uyarısının deploy'unu etkilemez):

   ```
   firebase deploy --only functions:aiGenerationJob,functions:geminiProxy,firestore:rules
   ```

3. Uygulamayı aç. Ayarlar → Yapay Zekâ Asistanı kartında Gemini anahtar kutusunun
   yerini "🔒 Sunucuda yönetiliyor" almış olmalı. Tarayıcıda daha önce kayıtlı bir
   Gemini anahtarı varsa ilk açılışta senkron veriden silinir.

> Firestore kuralları deploy edilmeden iş dokümanı oluşturulamaz (varsayılan ret);
> uygulama bu durumda "program yazılmadı, takvim değişmedi" der.

## Mimari

```
Uygulama (DailyIndivPanel)
  └─ ai_generation_jobs/{generationJobId}  status: QUEUED   (tek doküman, tek basış)
        │
Cloud Function  aiGenerationJob  (Firestore onCreate, 1. nesil, secret: GEMINI_API_KEY)
  ├─ sahiplenme transaction'ı  → QUEUED değilse çık (Test 10)
  ├─ aktif üretim kilidi       → aynı hesap+sporcu+gün+seans için ikinci iş: FAILED (Test 11)
  ├─ saatlik iş sınırı
  └─ AI Router (functions/ai/router.js)
        ├─ Gemini API (functions/ai/gemini.js, AbortController)
        ├─ Şema → Bütünlük → Kütüphane   (functions/ai/validate.js)
        └─ CoachOS Kural Denetleyicisi   (uygulamadaki validateProgram — tek kopya)
              aday iş dokümanına yazılır (VALIDATING), uygulama sonucu ruleCheck olarak döner
  └─ COMPLETED (validationStatus: pass, calendarWriteStatus: pending) | FAILED | CANCELLED
        │
Uygulama
  └─ yazım kapısı (diJobWriteGate) + son validateProgram + calendarWriteStatus
     pending→claimed→written transaction'ı → taslak BİR KEZ kaydedilir
```

Koçun onayı değişmedi: kaydedilen şey AI taslağıdır; sporcunun takvimine yazım hâlâ
koçun "Yaz" basışıyla ve o anda yeniden çalışan `validateProgram` ile olur.

## Uygulama raporu (Madde 25)

### 1. Değiştirilen dosyalar
- `index.html` — `askGemini` ve model listesi sunucu proxy'sine taşındı; Gemini
  anahtarı ayarlardan ve senkron veriden kaldırıldı (`migrate` eski `ai.gkey`'i
  siler); `DailyIndivPanel` üretimi arka plan işine bağlandı (durum göstergesi,
  iptal, kural denetleyicisi el sıkışması, yazım kapısı, yeniden yüklemede işe
  yeniden bağlanma).
- `functions/index.js` — `aiGenerationJob` ve `geminiProxy` export'ları.
- `firestore.rules` — `ai_generation_jobs`, `ai_generation_locks`, `ai_usage`,
  `ai_context_cache`.
- `.github/workflows/functions.yml` — AI fonksiyonları + kurallar ayrı adımda deploy.
- `validator-test.js` — yeni mimariye göre güncellendi, yazım kapısı ve anahtar
  güvenliği testleri eklendi.
- `functions/test/run.js` — yeni test dosyaları kaydedildi.

### 2. Eklenen dosyalar
- `functions/ai/config.js` — merkezi model ve bütçe yapılandırması.
- `functions/ai/errors.js` — hata sınıflandırma, Retry-After / RetryInfo okuma.
- `functions/ai/gemini.js` — Gemini REST istemcisi (üretim, model listesi, bağlam önbelleği).
- `functions/ai/router.js` — AI Router.
- `functions/ai/validate.js` — şema / bütünlük / kütüphane doğrulaması.
- `functions/ai/context-cache.js` — bağlam önbelleği ve geçersiz kılma.
- `functions/ai/job.js` — arka plan işi (sahiplenme, kilit, sınır, el sıkışması, sonuç).
- `functions/ai/proxy.js` — diğer AI özellikleri için tek çağrılık proxy.
- `functions/test/ai-router.test.js`, `functions/test/ai-job.test.js`.
- `.github/workflows/functions-test.yml` — PR'larda sunucu testleri (deploy yok).

### 3. AI Router yapısı
`runGeneration()` dış dünyaya dokunmaz; model çağrısı, doğrulayıcı, saat, uyku ve
durum yazımı içeriden verilir — sahadaki ve testteki davranış aynı koddan geçer.
Karar sırası: son tarih → global tavan → model bütçesi → hata türü → doğrulama.

| Model | Deneme |
|---|---|
| `gemini-3.8-flash` (ana) | 3 (ilk + 2 retry) |
| `gemini-3.7-flash` | 1 |
| `gemini-3.6-flash` | 1 |
| `gemini-3.5-flash` | 1 |
| `gemini-3.5-flash-lite` | 1 |

### 4. Retry mekanizması
- Yalnızca ana modelde, yalnızca geçici hatalarda: 408, 429, 500, 502, 503, 504,
  ağ hatası, çağrı zaman aşımı.
- Bekleme: `Retry-After` başlığı (saniye ya da HTTP tarihi) ya da hata gövdesindeki
  `google.rpc.RetryInfo.retryDelay`; ikisi de yoksa 2 sn, sonra 4 sn.
- Bekleme + bir çağrı penceresi (8 sn) 120 sn'ye sığmıyorsa beklenmez, yedeğe geçilir.
- Kalıcı hatalar (geçersiz anahtar, yetki, bozuk istek, şema/yapılandırma) yeniden
  denenmez.

### 5. Fallback mekanizması
- Kalıcı hata, "model yok" (404 / not supported), ana modelin bütçesinin bitmesi ya
  da doğrulama hatası (regeneration hakkı kullanıldıktan sonra) → sıradaki model.
- Anahtarın model listesi (`GET /v1beta/models`, üretim çağrısı değil, 10 dk
  önbellekli) okunabildiyse listede olmayan model hiç çağrılmaz ve bütçe harcamaz.
- Her model aynı sistem talimatını, aynı sporcu girdisini, aynı şemayı ve aynı
  doğrulayıcıyı görür. Regeneration'da eklenen tek şey doğrulayıcının ihlal listesidir.

### 6. Global 6-call budget
`MAX_TOTAL_AI_CALLS = 6`; ilk çağrı, retry, fallback ve regeneration dahil. Her
çağrıdan önce model bütçesinden ÖNCE bakılır. Örn. 3.8×3 + 3.7 + 3.6 + 3.5 = 6 →
3.5 Flash-Lite çağrılmaz (Test 7). `MAX_REGENERATIONS = 1`.

### 7. 120-second job timeout
Son tarih işin sahiplenildiği andan sayılır. Geçtiyse ya da bir çağrıya yetecek süre
kalmadıysa yeni çağrı / retry / fallback / regeneration başlatılmaz. Uçuştaki çağrı
`AbortController` ile kesilir (neden: `JOB_DEADLINE`, yeniden denenmez). Kural
denetleyicisi beklemesi de bu sürenin içindedir. Doğrulama geçse bile son tarih
aşıldıysa sonuç yazılmaz. **45 saniyelik eski synchronous timeout** program yazıcıda
yoktu (`WRITE_STUCK_MS=45000` bulut senkronuna ait, AI ile ilgisi yok); eski akıştaki
"tarayıcı yanıtı bekler" modeli tamamen kaldırıldı.

### 8. Validation flow
AI yanıtı → **şema** (geçerli JSON, `program.bloklar`, alan tipleri; yarıda kesilmiş
JSON onarılmaz) → **bütünlük** (her egzersizin adı ve dozu var, en az bir egzersiz)
→ **kütüphane** ("library" diye işaretlenen her egzersiz koçun kütüphanesinde gerçekten
var; açıkça "custom" yazılan kabul — Kural 29 korunuyor) → **CoachOS Kural
Denetleyicisi** (`validateProgram`: sakatlık kısıtları, ağrının kapattığı paternler,
ekipman varlığı / adedi / yükü, kademe tavanı, temas sınırı, süre ve egzersiz sayısı,
antrenörün sayısal sınırları) → **iş/yinelenme denetimi** (`diJobWriteGate`) → kayıt.

### 9. Duplicate protection
- Uygulama: meşgulken düğme kapalı, aynı tick'teki ikinci basışı yutan senkron kilit,
  basış başına rastgele `generationJobId`.
- Firestore kuralı: iş yalnızca oluşturulabilir (aynı kimlikle ikinci yazım "create"
  değildir).
- Sunucu: sahiplenme transaction'ı (tetikleyici tekrarında ikinci çalışma çıkar) ve
  hesap + sporcu + gün + kaynak seans başına aktif üretim kilidi.

### 10. Calendar write safety
Kayıt yalnızca şunların hepsi doğruysa yapılır: iş COMPLETED, `validationStatus: pass`,
sonuç metni var, sporcu/gün/seans eşleşiyor, iş bu panelin başlattığı iş, 120 sn
aşılmamış, daha önce yazılmamış (`calendarWriteStatus` pending→claimed transaction'ı
başka sekme/cihazın ikinci yazımını engeller) ve **o anki veriyle** yeniden çalışan
`validateProgram` PASS. Herhangi bir hata → mevcut takvim ve mevcut taslak değişmez.

### 11. Security changes
- Gemini anahtarı yalnızca Secret Manager'da (`GEMINI_API_KEY`), fonksiyon ortamında.
- İstemci Gemini API'sine hiç istek atmıyor; `x-goog-api-key` istemcide yok
  (validator-test bunu denetliyor). Eski `ai.gkey` senkron veriden siliniyor.
- Diğer AI özellikleri (asistan, bağlantı testi, model listesi) `geminiProxy`
  callable'ından koçun Firebase oturumuyla geçiyor; anonim oturum reddediliyor.
- Hesap başına saatlik sınırlar (40 iş, 120 proxy çağrısı) ve istek boyutu tavanları.
- Loglarda: iş kimliği, sporcu/seans kimliği, model, deneme, hata türü, HTTP durumu,
  geçen süre, fallback ve doğrulama sonucu. Anahtar ve sporcu sağlık verisi loglanmaz.
- Kullanıcıya teknik yığın izi gösterilmiyor; mesajlar durum başına tek cümle.

### 12. Test sonuçları
- `functions`: **162 test geçti, 0 kaldı** — prompt'taki 16 senaryonun sunucu tarafı:
  1 (tek çağrı), 2 (503→retry→başarı), 3 (503×3→fallback), 4 (Retry-After / 2-4 sn,
  RetryInfo, son tarihe sığmayan bekleme), 5 (kalıcı hata→retry yok→fallback),
  6 (en fazla 1 regeneration), 7 (6 çağrı tavanı, 7. çağrı yok, Flash-Lite
  çağrılmaz), 8 (404 ve listede olmayan model), 9 (son tarih), 10 (aynı iş 5 kez →
  tek üretim), 11 (aktif üretimde ikinci istek), 12 (AI hatası → yazım yok),
  13 (doğrulama hatası → yazım yok), 14 (yedek model aynı bağlam ve doğrulayıcı),
  15 (kütüphanede olmayan egzersiz), 16 (ekipman adedi ihlali → yazım yok); ayrıca
  bağlam önbelleği, iptal, istek denetimi, sınırlar.
- `validator-test.js`: **111 geçti, 0 kaldı** — Test 16'nın kural tarafı (adet
  yetersiz → SERT ihlal), yazım kapısı, anahtarın istemcide olmadığı, proxy çağrısı.
- `sync-test.js`: 38 geçti. `check-syntax.js`: temiz.
- Tarayıcıda (Playwright, sahte Firebase + sahte sunucu): beş hızlı basış → tek iş;
  RETRYING / FALLBACK / VALIDATING durum metinleri; kural denetleyicisi turu; taslak
  bir kez kaydedildi (`calendarWriteStatus: written`); iş dokümanında anahtar yok.

### 13. Bilinen sınırlamalar
- **Model kimlikleri canlı API'ye karşı doğrulanamadı** (bu ortamda anahtar yok).
  Router çalışma anında anahtarın model listesini okuyup listede olmayanı atlıyor;
  liste okunamazsa gerçek çağrının 404'ünden karar veriyor.
- CoachOS Kural Denetleyicisi uygulamada çalışıyor (kuralların tek kopyası). Koç
  sayfayı iş sürerken kapatırsa kural turu yanıtsız kalır: iş `RULE_CHECK_TIMEOUT`
  ile FAILED olur, takvim değişmez. Sayfa 120 sn içinde yeniden açılırsa panel işe
  yeniden bağlanır.
- Program yazıcı sağlayıcı seçiminden bağımsız olarak her zaman Gemini zincirini
  kullanır. Asistan için Claude seçen koçun Claude anahtarı (Gemini değil) hâlâ
  kendi hesabında senkronlanıyor.
- Bağlam önbelleği yalnızca sabit sistem talimatını kapsar; bilgi tabanı ve kütüphane
  her çağrıda taze gider (önbellekte bayat kalamaz ama önbellekten de yararlanmaz).
- Regeneration, doğrulayıcının ihlal listesini modele geri gönderir; kural seti,
  kütüphane ve sporcu verisi değişmez.

### 14. Manuel olarak kontrol edilmesi gereken noktalar
1. `firebase functions:secrets:set GEMINI_API_KEY` yapıldı mı?
2. `aiGenerationJob`, `geminiProxy` ve **Firestore kuralları** deploy edildi mi?
3. Ayarlar → Yapay Zekâ Asistanı: "🔒 Sunucuda yönetiliyor" ve "Bağlantıyı test et" çalışıyor mu?
4. Bireyselleştirme'de bir sporcu için "Antrenmanı oluştur": durum çubuğu, sonuçta
   "Program hazır." ve Functions loglarında `ai: ai_job_finished` satırı.
5. Google AI Studio'da anahtarın `gemini-3.8-flash` … `gemini-3.5-flash-lite`
   modellerine erişimi var mı? (Yoksa router atlar; loglarda `model_skipped_unlisted`.)
6. Cloud Functions bölgesi `us-central1` dışına taşınırsa `index.html` içindeki
   `AI_FN_REGION` da güncellenmeli.
