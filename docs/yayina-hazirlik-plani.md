# Yayına Hazırlık Planı — senkron, abonelik, KVKK

> **Durum:** Onaylandı (kararlar 2026-11-12) · **Son güncelleme:** 2026-11-12
> Bu dosya CoachOS'u herkese açık, ücretli bir hizmete çevirmenin **üst planıdır**.
> Senkronun ayrıntısı [`senkron-gecis-plani.md`](senkron-gecis-plani.md)'de; burada yalnızca
> sırası ve öbür iki işle bağı var. Her PR sonunda en alttaki **İlerleme** güncellenir.

## 1. Hedef

1. Herkes kendi hesabıyla, **senkron sorunu yaşamadan** kullanabilsin; ekibini davetle ekleyebilsin.
2. **Aylık ya da yıllık abonelik**, kulüp/hesap başına; yeni hesaplara **14 gün ücretsiz deneme**.
3. **KVKK** ve e-ticaret yükümlülükleri karşılansın.

## 2. Kararlar

| # | Konu | Karar | Tarih |
|---|---|---|---|
| Y1 | Ödeme sağlayıcı | Henüz seçilmedi. Altyapı sağlayıcıdan bağımsız kurulur; iyzico ya da Paddle sonra tek parça olarak bağlanır | 2026-11-12 |
| Y2 | Fiyat birimi | Kulüp/hesap (çalışma alanı) başına. Davet edilen ekip üyeleri dahil. Kademe sporcu sayısına göre | 2026-11-12 |
| Y3 | Deneme | 14 gün, kart istemeden tam erişim. Bitince **salt okunur** (veri silinmez) | 2026-11-12 |
| Y4 | Senkron planı | `senkron-gecis-plani.md` önerileri (K1–K7, K10) kabul | 2026-11-12 |
| Y5 | Mevcut hesaplar | Abonelik açılmadan önce açılmış hesaplar "kurucu" (`comp`) olarak ücretsiz kalır; sahibi istediğinde değiştirir | öneri — itiraz yoksa geçerli |

## 3. Abonelik tasarımı (sağlayıcıdan bağımsız)

### 3.1 Veri
`billing/{ws}` — `ws` çalışma alanı kimliği (bugün hesap sahibinin `uid`'i; senkron planındaki K3 ile aynı).

| Alan | Değer |
|---|---|
| `status` | `trialing` · `active` · `past_due` · `canceled` · `expired` · `comp` |
| `plan` | `trial` · `starter` · `pro` · `club` · `comp` |
| `interval` | `month` · `year` · `null` |
| `athleteLimit` | sayı ya da `null` (sınırsız) |
| `trialEndsAt`, `currentPeriodEnd` | zaman damgası |
| `provider`, `providerRef` | `iyzico`/`paddle`/`manual`, sağlayıcıdaki abonelik kimliği |
| `updatedAt` | sunucu zamanı |

- **Yalnızca sunucu yazar** (Cloud Functions, admin SDK). Kurallarda istemci yazımı tamamen kapalı.
- Okuyan: hesap sahibi ve o çalışma alanının ekip üyeleri.

### 3.2 Erişim kuralı (tek yerde, istemci ve sunucu aynı fonksiyonu kullanır)

| Durum | Erişim |
|---|---|
| `comp`, `active` | Tam |
| `trialing` ve `trialEndsAt` geçmemiş | Tam |
| `past_due` ve dönem bitiminden sonra ≤ 7 gün | Tam + "ödeme alınamadı" uyarısı |
| `canceled` ve `currentPeriodEnd` geçmemiş | Tam (dönem sonuna kadar) |
| Diğer her şey | **Salt okunur**: görür, dışa aktarır, hesabını silebilir; düzenleyemez, yapay zekâ kullanamaz |

Veri hiçbir zaman ödeme yüzünden silinmez ya da gizlenmez (KVKK erişim hakkı).

### 3.3 Nerede uygulanır
1. **İstemci:** üst çubukta durum (deneme kalan gün, ödeme uyarısı), salt okunur modda düzenleme kapalı.
2. **Sunucu:** yapay zekâ fonksiyonları (`geminiProxy`, `aiGenerationJob`) erişim kuralını kontrol eder:
   maliyetin asıl kaynağı burası.
3. **Güvenlik kuralları:** yeni `workspaces/**` kurallarına (senkron Faz 1) `billingOk(ws)` eklenir.
   Eski senkron koleksiyonuna (`kullanici_verileri`) eklenmez: süresi biten bir hesabın senkronu
   döngüye girmesin; geçiş bitince eski koleksiyon zaten salt okunur.

### 3.4 Sağlayıcı bağlantısı (Y1 seçilince)
- Ödeme sayfası sağlayıcının kendi sayfası (kart bilgisi hiçbir zaman bizim sunucumuza gelmez).
- `billingWebhook` fonksiyonu: imzası doğrulanmış olayları `billing/{ws}`'e işler. Aynı olay iki kez
  gelirse sonuç değişmez.
- Abonelik iptali uygulama içinden tek tıkla (sağlayıcının müşteri portalı).

## 4. KVKK ve e-ticaret

| İş | Kim | Durum |
|---|---|---|
| Hesap ve tüm verinin silinmesi (uygulama içinden) | Kod | ⏳ |
| Verinin dışa aktarılması (JSON) | Kod | ⏳ |
| Aydınlatma metni onayının ve sürümünün kaydı (kayıtta) | Kod | ⏳ |
| Sporcu check-in formunda aydınlatma + sağlık verisi açık rızası; 18 yaş altı veli onayı | Kod | ⏳ |
| Kullanım şartları + veri işleme sözleşmesi (koç = veri sorumlusu, CoachOS = veri işleyen) **taslağı** | Kod (taslak) → Avukat | ⏳ |
| Mesafeli satış sözleşmesi + ön bilgilendirme formu **taslağı** | Kod (taslak) → Avukat | ⏳ |
| Veri sorumlusu bilgileri (`465-privacy-notice.jsx` → `PRIVACY_CONTROLLER`) | Sen | ⏳ |
| Rol modelinin (sorumlu/işleyen) ve metinlerin onayı | Avukat | ⏳ |
| Yurt dışına aktarım: standart sözleşme + Kurum'a bildirim (Firebase, Gemini, Vercel) | Avukat | ⏳ |
| VERBİS kaydı gerekip gerekmediği | Avukat | ⏳ |
| Şahıs şirketi, e-arşiv fatura, ETBİS | Mali müşavir | ⏳ (iyzico seçilirse ödeme açılmadan önce şart) |
| Güvenlik kurallarının dış gözle incelenmesi (senkron Faz 1 sonrası) | Dışarıdan Firebase uzmanı | ⏳ |

## 5. Sıra

| Adım | İş | Neden bu sırada |
|---|---|---|
| 1 | Kural testleri + emulator CI (senkron Faz 0) | Abonelik ve senkronun kuralları buna dayanır |
| 2 | Abonelik altyapısı: `billing`, deneme, istemci durumu, yapay zekâda kontrol | Ödeme sağlayıcısını beklemez |
| 3 | KVKK uygulama içi: silme, dışa aktarma, rıza kaydı | Ödeme ve senkrondan bağımsız |
| 4 | Senkron Faz 1–4 (şema, uyumluluk katmanı, taşıma, pilot) | En büyük iş; pilotta senin hesabın |
| 5 | Ödeme sağlayıcısını bağlama | Y1 kararı + şirket/hesap açılışı gerekir |
| 6 | Senkron Faz 5 (ekip daveti, roller) | Kulüp başına fiyatın karşılığı |
| 7 | **Herkese açılış** | Ön koşullar: senkron pilotu temiz, ödeme canlı, avukat onayı |

## 6. İlerleme

| Tarih | Adım | Ne yapıldı | PR |
|---|---|---|---|
| 2026-11-12 | — | Plan ve kararlar yazıldı | — |
