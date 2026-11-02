# Polar AccessLink — kurulum ve işleyiş

Sporcunun Polar hesabını CoachOS'a bağlar. **Aşama 1:** davet linki, Polar izin akışı,
şifreli token saklama, bağlantı durumu ve bağlantıyı kesme. Veri aktarımı (uyku, Nightly
Recharge, antrenman, aktivite) Aşama 2'de, otomatik senkron Aşama 3'te gelecek.

## API sürümü

**Polar AccessLink v3.** admin.polaraccesslink.com'daki client bu sürüme bağlı; Polar'ın
resmî örnek istemcisi (`polarofficial/accesslink-example-python`) aynı adresleri kullanıyor:

| | |
|---|---|
| Yetkilendirme | `https://flow.polar.com/oauth2/authorization` (scope `accesslink.read_all`) |
| Token | `https://polarremote.com/v2/oauth2/token`: Basic auth (client id + secret) |
| API | `https://www.polaraccesslink.com/v3` |
| Kullanıcı kaydı | `POST /v3/users {"member-id"}`. **409 = zaten kayıtlı, hata değil** |
| Kayıt silme | `DELETE /v3/users/{id}`. Polar tarafında token'ı da iptal eder |

v3 token yanıtında yenileme token'ı beklenmiyor; token sporcu izni kaldırana ya da kayıt
silinene kadar geçerli. Sunucu `expires_in` değerini saklıyor ve yanıtta refresh token
olup olmadığını log'a yazıyor (değerini değil); gerçek davranış ilk bağlantıda doğrulanacak.

## Kurulum (bir kez, yönetici)

### 1. Polar client

admin.polaraccesslink.com → client → **Authorization redirect URL**:

```
https://periodization-planner-rust.vercel.app/api/polar/callback
```

Client ID kodda varsayılan olarak duruyor (gizli değil; tarayıcı her yetkilendirmede onu
Polar'ın adres çubuğunda gösteriyor). Değişirse `POLAR_CLIENT_ID` ortam değişkeniyle ezilir.

### 2. Sırlar (Secret Manager)

İki sır gerekiyor. Değerleri **depoya, sohbete, e-postaya yazma**.

| Sır | Ne |
|---|---|
| `POLAR_CLIENT_SECRET` | Polar'ın verdiği client secret |
| `POLAR_TOKEN_KEY` | Sporcu token'larını şifreleyen anahtar: 32 rastgele bayt, base64 |

`POLAR_TOKEN_KEY` üretmek için (birini seç):

```
openssl rand -base64 32
```

```
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

PowerShell:

```
$b = New-Object byte[] 32; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); [Convert]::ToBase64String($b)
```

> Bu anahtarı kaybedersen kayıtlı token'lar çözülemez; bütün sporcuların yeniden bağlanması
> gerekir. Bir şifre yöneticisinde sakla.

Sırları gir. **Yol A, komut satırı** (Gemini anahtarıyla aynı yöntem; her komut değeri gizli olarak sorar):

```
npx firebase-tools functions:secrets:set POLAR_CLIENT_SECRET --project periodization-planner
```

```
npx firebase-tools functions:secrets:set POLAR_TOKEN_KEY --project periodization-planner
```

**Yol B, tarayıcı:** console.cloud.google.com → proje `periodization-planner` → Security →
**Secret Manager** → *Create secret*. Ad tam olarak `POLAR_CLIENT_SECRET` (ve ikincisi
`POLAR_TOKEN_KEY`), değer yapıştır, diğer ayarlar varsayılan.

### 3. Deploy

main'e merge sonrası **Deploy Cloud Functions** iş akışı önce Firestore kurallarını, sonra
ayrı bir adımda `polarApi`'yi deploy eder. Sırlar henüz yoksa Polar adımı uyarı verip geçer;
kurallar, wellness ve AI etkilenmez. Sırları girdikten sonra iş akışını GitHub → Actions →
*Deploy Cloud Functions* → **Run workflow** ile yeniden çalıştır, ya da elle:

```
npx firebase-tools deploy --only functions:polarApi --project periodization-planner
```

Vercel tarafında ayar yok: `vercel.json` → `rewrites`, `/api/polar/*` isteklerini function'a
(`europe-west1-periodization-planner.cloudfunctions.net/polarApi`) yönlendiriyor.

## Mimari

```
Koç (Sporcu Profili → Polar)
  └─ POST cloudfunctions.net/polarApi/invite   Firebase ID token, {teamId, athleteId}
        sunucu: sporcu koçun kadrosunda mı? (alert_roster) → polar_tickets/{hash}, polar_links: pending
        ← davet linki (7 gün, yenisi eskisini geçersiz kılar)

Sporcu (telefonunda linki açar)
  GET  vercel.app/api/polar/start?t=…   davet sayfası (yalnızca gösterir; link önizlemesi akışı başlatmaz)
  POST vercel.app/api/polar/start       polar_oauth_states/{hash} (10 dk, tek kullanımlık)
                                        + __session çerezi (HttpOnly, Secure, SameSite=Lax) → Polar'a 303
  Polar'da "izin ver"
  GET  vercel.app/api/polar/callback    state tüket + çerez eşleşmesi (CSRF)
                                        → token al → POST /v3/users (409 geçerli)
                                        → tek transaction: polar_tokens (şifreli) + polar_users + polar_links: active
```

Callback'te Firebase oturumu doğrulanmıyor, çünkü doğrulanamaz: Polar dönüşü tarayıcının
düz bir yönlendirmesi, ID token taşımıyor; izni veren sporcunun CoachOS hesabı da yok. Kimlik
daveti üreten istekte doğrulanıyor; state ve çerez bu kimliği callback'e taşıyor.

### Firestore (hepsi yeni; mevcut koleksiyonlara yazılmıyor)

| Koleksiyon | İçerik | İstemci |
|---|---|---|
| `polar_links/{coachUid__athleteId}` | durum, bağlanma zamanı, son hata, son senkron | yalnızca sahibi **okur** |
| `polar_tokens/{polarUserId}` | AES-256-GCM şifreli token | kapalı |
| `polar_users/{polarUserId}` | Polar kullanıcısı → tek sporcu | kapalı |
| `polar_oauth_states/{hash}` | tek kullanımlık state | kapalı |
| `polar_tickets/{hash}` | davet | kapalı |

Bir Polar hesabı yalnızca bir sporcuya, bir sporcu yalnızca bir Polar hesabına bağlanabilir
(`polar_users` + `polar_links`, aynı transaction). Bağlantıyı kesmek Polar'da kaydı siler, token
ve eşleşme kaydını siler; daha önce aktarılmış veriye dokunmaz.

### Token şifreleme

Node'un yerleşik `crypto`'su, AES-256-GCM, anahtar Secret Manager'da, Polar kullanıcı kimliği
ek doğrulanmış veri (AAD) olarak bağlı. Firestore dışa aktarımı, yedek ya da yanlış yazılmış
bir kural tek başına token sızdırmaz. Sunucu kimliğinin kendisi ele geçirilirse koruma yoktur
(o kimlik hem veriyi hem anahtarı okuyabilir); anahtar kaybolursa sporcular yeniden bağlanır.

## Testler

`cd functions && npm test`: `test/polar.test.js` (sahte Firestore + sahte Polar, ağ yok):
hatalı / süresi geçmiş / yeniden kullanılan state, çerezsiz ya da farklı çerezli callback (CSRF),
`invalid_grant`, izin verilmemesi, Polar'a ulaşılamaması / 429 / 5xx, eksik token yanıtı, 409,
Polar hesabının ikinci sporcuya bağlanma girişimi, başka koçun sporcusuna davet / bağlantı kesme
girişimi, bağlantı kesme, mevcut koleksiyonlara yazılmadığı.

## Bilinen sınırlar

- `*.vercel.app` bazı Türk operatörlerinde engelli. Davet linki ve redirect adresi vercel.app'te;
  engelli hatta sporcu Wi-Fi ile ya da başka bir hatla açmalı. Kalıcı çözüm:
  `periodization-planner.web.app/api/polar/callback` adresini Polar'a ikinci redirect adresi
  olarak ekleyip `firebase.json`'a aynı yönlendirmeyi koymak (ileride).
- State ve davet kayıtları süresi geçince silinmiyor (tek doküman, birkaç yüz bayt); Aşama 3'teki
  zamanlanmış iş temizleyecek.
