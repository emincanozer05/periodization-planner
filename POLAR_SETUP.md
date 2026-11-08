# Polar AccessLink — kurulum ve işleyiş

Sporcunun Polar hesabını CoachOS'a bağlar.
- **Aşama 1:** davet linki, Polar izin akışı, şifreli token saklama, bağlantı durumu, bağlantıyı kesme.
- **Aşama 2:** manuel "Verileri Senkronize Et": uyku, Nightly Recharge, antrenman, günlük aktivite,
  kardiyo yükü ayrı koleksiyonlara; tekrar önleme; transaction commit sırası.
- Otomatik senkron (webhook / zamanlanmış iş) Aşama 3'te, takip ekranlarına bağlanma Aşama 4'te.

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

## Veri senkronu (Aşama 2)

Koç sporcu profilindeki Polar panelinde **Verileri Senkronize Et**'e basar → `POST /sync`
(ID token). Aynı sporcu için iki dakikada bir manuel senkron; eşzamanlı ikinci senkron kilitle
reddedilir.

| Veri | Uç nokta (v3) | Koleksiyon / doküman adı | Model |
|---|---|---|---|
| Uyku | `GET /users/sleep` | `polar_sleep/{link}__{tarih}` | transaction'sız |
| Nightly Recharge | `GET /users/nightly-recharge` | `polar_recharge/{link}__{tarih}` | transaction'sız |
| Antrenman | `GET /exercises?zones=true` | `polar_exercises/{link}__{tarih}__{id}` | transaction'sız |
| Kardiyo yükü | `GET /users/cardio-load/` | `polar_cardio_load/{link}__{tarih}` | transaction'sız, cihaz destekliyorsa |
| Günlük aktivite | `POST /users/{id}/activity-transactions` → özetler → `PUT` commit | `polar_activity/{link}__{tarih}` | **transaction** |
| Sürekli nabız (günlük özet: en düşük = RHR, en yüksek, ortalama) | `GET /users/continuous-heart-rate?from&to` (28 gün; yoksa gün gün `/{tarih}`, 7 gün) | `polar_hr_daily/{link}__{tarih}` | transaction'sız |

`{link}` = `coachUid__athleteId`. Her doküman `coachUid`, `athleteId`, normalleştirilmiş alanlar,
`missing` (Polar'ın göndermediği alanlar), `derived` (başka alanlardan hesaplananlar), ham kayıt
(`raw`) ve içerik özeti (`hash`) taşır.

- **Tekrar önleme:** doküman adı deterministik; özet aynıysa yazılmaz. İkinci senkron sıfır yazım yapar.
- **Commit sırası:** aktivite özetleri önce Firestore'a yazılır, yazım geri okunarak doğrulanır, ancak
  ondan sonra Polar'da commit edilir. Yazım, doğrulama ya da bir özetin okunması başarısızsa commit
  yapılmaz; veri Polar'da kalır ve bir sonraki transaction'da yeniden gelir.
- **Uydurma yok:** gelmeyen alan `null`. Tek hesaplanan değer uyku süresi (`asleepSec` = evrelerin
  toplamı, `derived` listesinde); evrelerden biri yoksa o da `null`.
- **Hatalar:** 429 ve geçici hatalar 1-2-4 sn (ya da `Retry-After`, en çok 10 sn) bekleyerek 4 kez
  denenir; kalıcı 429 o adımı ve sonrasını durdurur, kısmi sonuç raporlanır. 404/403 olan veri türü
  "Polar'dan gelmeyen" olarak raporlanır. **401** → bağlantı `revoked`, token silinir, panel
  "Yeniden bağla" gösterir.
- Son senkronun özeti `polar_links.lastSyncReport`'ta (tür başına durum, kayıt sayısı, yazılan,
  eksik alan sayıları); başarılı senkron `lastSyncAt`'i günceller.

| Alan grubu | Kaynak alanlar |
|---|---|
| Uyku | `sleep_start_time`, `sleep_end_time`, `light_sleep`, `deep_sleep`, `rem_sleep`, `unrecognized_sleep_stage`, `sleep_score`, `continuity`, `continuity_class`, `total_interruption_duration`, `sleep_charge`, `sleep_rating`, `sleep_cycles` |
| Toparlanma | `heart_rate_variability_avg` (RMSSD), `heart_rate_avg`, `beat_to_beat_avg`, `breathing_rate_avg`, `ans_charge`, `ans_charge_status`, `nightly_recharge_status` |
| Antrenman | `duration`, `heart_rate.average/maximum`, `heart_rate_zones`, `calories`, `distance`, `training_load`, `training_load_pro` (cardio/muscle/perceived load), `sport` |
| Aktivite | `active-steps`, `calories`, `active-calories`, `duration` |

## Wellness → Polar ("Verileri al") ve sporcu grafikleri

**Wellness sekmesi → Polar bölümü (günlük):**
1. **Verileri al** → takımın Polar'a bağlı her sporcusu için `POST /sync` (aynı anda 3 sporcu).
   Son iki dakikada senkronlanmış sporcu (`TOO_SOON`) "güncel" sayılır.
2. Ardından `POST /team-data { teamId, from: gün, to: gün }`: Wellness'ın üstündeki tarih seçicide
   **seçili günün** verisi. Gün değişince yalnızca o gün yeniden okunur (senkron yok).
3. Tablo: uyku süresi, uyku skoru, HRV, gece nabzı, solunum, ANS (o sabah uyanılan gece), adım ve
   antrenman sayısı / süresi / Polar yükü (o gün). Polar'ın göndermediği değer "—".
4. Satıra tıklayınca sporcunun Wellness sayfası açılır.

**Sporcunun kendi sayfası (14 / 28 / 56 gün):** Kadro → sporcu → Profil (Polar panelinin altında)
ve Wellness'ta sporcunun sayfası. `POST /team-data { teamId, athleteId, days }`; kutucuklar (son
değer + 7 günlük ortalama) ve 4 grafik: HRV (gece noktası + 7 günlük ortalama çizgisi), uyku süresi,
gece nabzı (nokta + çizgi), günlük antrenman yükü; altında antrenman listesi.

`/team-data` her sporcu için doküman adı aralığıyla sorgular (`coachUid__athleteId__tarih…`): ek
Firestore indeksi gerekmez ve aralığın başı doğrulanmış koç kimliğinden kurulduğu için başka hesabın
verisine ulaşılamaz. Bu yüzden antrenman dokümanlarının adı tarihle başlar
(`polar_exercises/{link}__{tarih}__{id}`). Açık aralık en çok 92 gün.

## Ekip üyesinin telefon sayfası (alerts.html) → uyku saatleri

Wellness kartlarının altında, Polar'a bağlı sporcular için **Yattı · Kalktı · Uyudu** satırı ve
listenin üstünde **Polar Verilerini Al** düğmesi. Ekip üyesi anonim oturumla açtığı için Polar
koleksiyonlarını doğrudan okuyamaz; veri `polarApi`'den gelir (`functions/polar/staff.js`):

| Uç | Gövde | Ne yapar |
|---|---|---|
| `POST /staff-sleep` | `{ from, to }` | Takımın bağlı sporcuları + o günlerin gecesi: yalnızca `sleepStart`, `sleepEnd`, `asleepSec` |
| `POST /staff-sync` | `{ athleteId }` | O sporcunun manuel senkronu (iki dakika kuralı ve kilit aynı) |

Kapsam istekten değil `staff_members/{uid}` eşleşmesinden kurulur ve dayandığı `staff_links/{token}`
hâlâ aynı koçu ve takımı gösteriyor mu diye her istekte yeniden bakılır; link silinince erişim biter
(403 `NOT_STAFF`). Başka takımın sporcusu için `/staff-sync` 404 döner. HRV, ANS, antrenman ve
Polar hesap bilgisi ekip üyesine gitmez. Uyku kaydının tarihi uyanılan gün olduğu için kartın
gününe ait gece doğrudan o tarihli kayıttır; saatler Polar'ın yerel saatinden okunur.

Sabah formundaki "Dinlenik KAH" sorusu kaldırıldı: istirahat nabzı artık Polar'dan (günün en düşük
nabzı). Eski kayıtlardaki `RHR` okunmaya devam eder.

## Testler

Gerçek Firestore emulator'ünde (Java gerekir; önce `cd functions && npm ci`), depo kökünden:

```
npx firebase-tools emulators:exec --only firestore --project demo-polar "node tools/polar-emulator-test.js"
```

Aynı akışı gerçek transaction / getAll / batch ile çalıştırır ve `firestore.rules`'u koç oturumu
taklidiyle sınar (sahibi okur, başka koç / oturumsuz / istemci yazımı reddedilir).

`cd functions && npm test`: `test/polar.test.js` ve `test/polar-sync.test.js` (sahte Firestore +
sahte Polar, ağ yok). Senkron tarafı: commit sırası, yazım/doğrulama hatasında commit olmaması,
yinelenen senkron, eksik alanlar, 401 → revoked, 429/5xx bekleme, desteklenmeyen tür, kilit,
başka koçun sporcusu. Bağlantı tarafı:
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
