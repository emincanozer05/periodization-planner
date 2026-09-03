# Check-in Formları — kurulum

Sporcuların dolduracağı iki form uygulamanın kendi içinde:

| Form | Ne zaman | Ne sorar |
|---|---|---|
| **İçsel Yük (sRPE)** | antrenman/maç sonrası | top antrenmanı, kuvvet & kondisyon ve müsabaka için zorluk (1-10) + süre |
| **Wellness** | sabah | dinlenik KAH, uyku, yorgunluk, kas ağrısı (1-5) ve ağrı bölgesi haritası |

Koç uygulamada **Check-in Formları** ekranına girer, iki düğmeden birine basar, link
panoya kopyalanır ve sporculara gönderilir. Sporcu formda kendi adını seçer ve gönderir;
cevap koç uygulamayı açtığında **anında** sporcunun günlüğüne düşer. Tally, Cloudflare
Worker, API anahtarı ya da form ID'si gerekmez.

---

## Bir kerelik kurulum (Firebase panelinde, ~3 dakika)

### 1) Anonim girişi aç
Firebase Console → projeyi seç → **Authentication → Sign-in method** → **Anonymous** → **Enable**.

Sporcu hesap açmaz, şifre girmez; sayfa arka planda isimsiz bir oturum kullanır. Bu
oturum olmadan Firestore yazımı reddedilir.

Bu oturum sporcunun telefonunda saklı kalır. Firebase kullanılmayan anonim hesapları bir
süre sonra silebildiği için saklı kayıt geçersizleşebilir; form her açılışta jetonu
tazeleyerek bunu görür ve gerekirse yeni bir oturum açar. Bu yüzden **Anonymous** satırı
açık kalmalı — sonradan kapatılırsa formu daha önce doldurmuş sporcular da gönderemez.

### 2) Firestore kurallarını yayınla
Firebase Console → **Firestore Database → Rules** → depodaki [`firestore.rules`](firestore.rules)
dosyasının tamamını yapıştır → **Publish**.

Aynı metin uygulamada da duruyor: **Check-in Formları → Kurulum (bir kerelik) → Göster →
Kuralları kopyala**.

> Kurallar mevcut `kullanici_verileri` ve `users/{uid}` bölümlerini **içerir**, yani
> eksiltmez. Yayınlamadan önce Firebase'in **Rules Playground**'unda denemek iyi olur.

---

## Linkler

```
https://<siten>/checkin.html#k=<token>&f=srpe        → antrenman sonrası
https://<siten>/checkin.html#k=<token>&f=wellness    → sabah
```

- Token **takım başına** üretilir ve `#` işaretinden sonra durur — tarayıcı orayı sunucuya
  göndermez, yani link erişim loglarına düşmez.
- Kadroyu değiştirdiğinde (sporcu ekleme/çıkarma, ad düzeltme) link kaydı kendiliğinden
  güncellenir; linki yeniden göndermene gerek yok.
- Link yanlış birine gittiyse: **Linkleri yenile (eskileri iptal et)**. Eski link o anda
  çalışmayı bırakır, sporculara yeni linki gönderirsin.

---

## Nasıl çalışıyor

1. Sporcu linki açar → anonim oturum → `checkin_links/<token>` okunur (takım adı + kadro).
2. Formu doldurur → `checkins` koleksiyonuna tek bir doküman yazılır.
3. Koçun uygulaması bu koleksiyonu dinler, gönderimi sporcunun `srpeLog` / `wellness`
   kaydına işler ve dokümanı birkaç dakika sonra siler.

Kayıt kimliği `ci-<tür>-<sporcuId>-<tarih>` biçiminde üretilir. Bunun iki sonucu var:

- Aynı gün ikinci kez dolduran sporcunun cevabı **eskisinin üzerine yazılır**, yeni satır
  açmaz.
- Aynı gönderim ikinci kez işlense de sonuç değişmez, yani veri çoğalmaz.

Koçun elle düzelttiği wellness alanları (`manualEdits`) yeni gönderimde korunur;
koçun sildiği bir sRPE check-in'i geri gelmez.

---

## Sık karşılaşılanlar

| Sporcunun gördüğü | Sebep / çözüm |
|---|---|
| "Form henüz açılmamış" | Anonim giriş kapalı → 1. adım. Firebase bunu iki ayrı kodla bildirir: `auth/operation-not-allowed` ve `auth/admin-restricted-operation` — ikisi de aynı şey demek |
| "Form okunamadı" | Kurallar yayınlanmamış → 2. adım |
| "Bu link artık geçerli değil" | Link yenilenmiş; sporcuya güncel linki gönder |
| "Gönderimin yolda" | Şebeke yavaş; cevap cihazda kuyruğa alındı, bağlantı gelince gider |
| "Gönderim reddedildi" (form açılıyor ama gönderilmiyor) | Telefonda kalmış anonim oturum geçersizleşmiş. Form bunu kendi başına onarır: oturumu tazeleyip gönderimi bir kez daha dener. İkinci kez de reddediliyorsa sebep 1. veya 2. adımdır |

Koç tarafında bir gönderim görünmüyorsa: gönderimler koç uygulamayı **açtığında** işlenir.
Uygulama açıkken gelenler saniyeler içinde düşer.

---

## Sınırlar (bilerek böyle)

- Linki bilen herkes o takım için gönderim yapabilir. Bu, paylaşılabilir bir formun doğası;
  karşı önlem token'ı yenilemek. Gönderimler sonradan **değiştirilemez** ve yalnızca koç
  okuyabilir/silebilir.
- Gelen değerler işlenirken sınırlanır (RPE 0-10, süre 0-400 dk, 1-5 skorlar, KAH 20-250,
  en çok 40 ağrı bölgesi) — açık bir uçtan gelen çöp veri grafiklere sızmasın diye.
- Gönderim, koçun tarayıcısında işlenir. Tamamen sunucu tarafında işlensin istenirse
  Cloud Functions gerekir; o da Firebase'in **Blaze** planını gerektirir.
