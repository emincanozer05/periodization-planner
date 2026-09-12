# Bildirimleri canlıya alma — 4 adım

Bugünkü durum: uygulama canlıda, **bildirimi gönderen sunucu parçası değil.**
Firebase'de duran `wellnessTelegramAlert` eski sürüm; yenisinin adı `wellnessAlert`.

Aşağıdaki 4 adım bir kereliktir. Sonrasında her değişiklik kendiliğinden yayına
gider; bir daha bu dosyaya bakman gerekmez.

---

## 1. Google'dan anahtar dosyasını al

1. https://console.cloud.google.com/iam-admin/serviceaccounts?project=periodization-planner
2. Listede **`firebase-adminsdk-...`** ile başlayan satıra tıkla.
   (Yoksa: **+ CREATE SERVICE ACCOUNT** → isim `github-deploy` → **CREATE AND CONTINUE**
   → Role kutusuna **Firebase Admin** seç → **CONTINUE** → **DONE**, sonra o satıra tıkla.)
3. Üstteki **KEYS** sekmesi → **ADD KEY** → **Create new key** → **JSON** → **CREATE**
4. Bilgisayarına bir `.json` dosyası iner. **Bu dosya bir şifredir** — kimseyle paylaşma.

## 2. Anahtarı GitHub'a yapıştır

1. https://github.com/emincanozer05/periodization-planner/settings/secrets/actions
2. **New repository secret**
3. Name: `FIREBASE_SERVICE_ACCOUNT`
4. Secret: inen `.json` dosyasını bir metin düzenleyiciyle aç, **içindeki her şeyi**
   (baştaki `{` ve sondaki `}` dahil) kopyala, kutuya yapıştır.
5. **Add secret**

## 3. Yayına al düğmesine bas

1. https://github.com/emincanozer05/periodization-planner/actions/workflows/functions.yml
2. Sağdaki **Run workflow** → **Run workflow**
3. ~2 dakika. Yeşil tik çıkınca `wellnessAlert` canlıdadır.

Firebase → Functions ekranını tazele: listede artık **iki** fonksiyon görünür.

## 4. Eski fonksiyonu sil

`wellnessTelegramAlert` silinmezse her wellness gönderiminde **iki** uyarı çıkar:
biri eski kuralla Telegram'a, biri yeni kuralla telefonlara.

Firebase Console → Functions → `wellnessTelegramAlert` satırının sağındaki **⋮**
→ **Delete function** → onayla.

---

## Sonra: çalıştığını gör

Kendi telefonunda: Kadro → Teknik Ekip → kendi kartın → **+ Bildirim linki oluştur**
→ linki telefonunda aç → **Bildirimleri aç**.
*(iPhone'da önce Paylaş → Ana Ekrana Ekle, sonra uygulamayı ana ekrandan aç.)*

Sonra bir test check-in'i gönder: uyku 3 · yorgunluk 3 · kas ağrısı 3.
Saniyeler içinde telefona bildirim düşmeli.

Düşmezse: Firebase Console → Functions → `wellnessAlert` → **Logs**. Orada ne yazdığını
bana gönder yeter.

Ayrıntılı kurulum ve sorun giderme tablosu: `NOTIFICATIONS_SETUP.md`.
