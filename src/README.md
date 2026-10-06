# src/ — CoachOS kaynağı

`index.html` **üretilmiş bir dosya**: bu klasördeki parçalar `manifest.json`'daki sırayla,
araya hiçbir şey konmadan art arda yapıştırılarak oluşuyor. Tarayıcıya giden kod tek betik,
tek genel kapsam (parçalar arası `import` yok): bir parça başka parçadaki adı doğrudan kullanır.

## Nasıl çalışılır
1. Değişikliği **`src/` altındaki ilgili parçada** yap (`index.html`'de değil).
2. `node assemble.js` çalıştır; `index.html` yeniden yazılır. İkisini birlikte commit'le.
3. `node check-syntax.js`, `node validator-test.js`, `node deps.js --check`.

CI üç şeyi denetler: `node assemble.js --check` (`index.html` `src/`'den üretilenle aynı mı),
her parçanın tek başına derlenmesi (`check-syntax.js`) ve `node deps.js --check`.

## Gerçek tarayıcıda duman sınaması
`node build.js && node tools/smoke-test.js`: dist/ altındaki GERÇEK siteyi Chromium'da açar
(kütüphaneler npm'den, Firebase ağı kapalı, sahte oturum), kenar çubuğundaki her sekmeyi gezer
ve hata/boş sekme varsa kırmızı verir. Kod yapısını değiştiren işlerde önce/sonra karşılaştırması
için: `--save onceki.json`, değişiklikten sonra `--compare onceki.json` (aynı gün içinde).
CI'da çalışmaz (Chromium ve npm erişimi ister); yapıyı değiştiren her PR'dan önce elle çalıştır.
Service worker'a dokunan işlerde ayrıca `node tools/sw-browser-test.js`: gerçek Chromium'da gerçek worker'ı,
CORS göndermeyen sahte bir Storage sunucusuna karşı sınar (medya önbelleği, çevrimdışı görsel).

## Parça sırası neden önemli
Betik tek parça gibi çalıştığı için bir parça, yükleme sırasında (bir işlevin DIŞINDA) yalnızca
kendinden ÖNCEKİ parçalardaki adları kullanabilir; işlevlerin içinde ise sonraki parçalardaki
adlara da başvurabilir (işlev sonradan çağrılır). `deps.js --check` bunu ve "hiçbir üst düzey ad
iki parçada tanımlı değil" kuralını denetler. Yeni parça eklerken `manifest.json`'a da yaz;
numaralar yalnızca okunabilirlik içindir, sırayı manifest belirler.

Bağımlılık haritası (hangi parça hangisine bağlı, çekirdek parçalar, döngüler):
[`DEPENDENCIES.md`](DEPENDENCIES.md), `node deps.js --write` ile yeniden üretilir.

## Parçalar
| Dosya | İçerik (bölüm başlıkları) |
|---|---|
| `00-head.html` | `<head>`: meta, CDN etiketleri, Firebase başlatma, service worker kaydı |
| `10-styles.css` | Tüm CSS |
| `15-theme-light.css` | Açık tema: elle yazılmış değişkenler + `tools/gen-light-theme.js`'in ürettiği bölüm (10-styles.css'te sabit koyu renk değişince yeniden çalıştır) |
| `17-motion-polish.css` | Hareket + cila katmanı: hareket değişkenleri (`--ease-*`, `--dur-*`), kenar çubuğu seçili göstergesi, sayfa başlığı girişleri, panel ışığı (`.co-lit`), az-hareket koruması |
| `20-app-open.html` | `</head><body>`, `#root` ve JSX betiğinin açılışı |
| `app/010-prelude.jsx` | — |
| `app/020-constants-session-focus.jsx` | CONSTANTS · SESSION FOCUS — two stages, asked in the order a coach actually decides. |
| `app/030-dates-language-factories.jsx` | DATE HELPERS · output). Persisted to localStorage and reactive: any component that calls · FACTORIES |
| `app/040-test-metadata-fms.jsx` | Test metadata for the picker: which drawer a test lives in, · FMS — Functional Movement Screen · TEST INFO — what each test is, and why it is taken · COMPARE ATHLETES — the metric model behind the comparison table. · CURRENT TEAM AVERAGE — for the plain single-score tests |
| `app/050-athlete-boxes.jsx` | ATHLETES BOXES — main / secondary need classification |
| `app/060-session-load-clipboard.jsx` | LOAD CALC — AU is the source of truth |
| `app/070-team-data-migration.jsx` | DEFAULT DATA & MIGRATION · SEASONS |
| `app/080-periods-weeks-load-monotony.jsx` | PERIODS & WEEKS · MONOTONY / ACWR |
| `app/090-rhr-team-sync-picker.jsx` | RHR MONITOR — resting heart rate, week over week · TEAM → ATHLETE SESSION SYNC · ATHLETE PICKER (checkbox grid for session participants) |
| `app/100-chart-wrapper.jsx` | CHART WRAPPER |
| `app/110-print-session-html.jsx` | PRINT — A4 portrait (single day) & landscape (week) |
| `app/120-print-week.jsx` | — |
| `app/130-crest-week-image.jsx` | — |
| `app/140-print-month.jsx` | — |
| `app/150-pdf-share-coach-report.jsx` | UNICODE FONT LOADER (Roboto via CDN) · PDF BLOB BUILDER (for Share button) · GENERIC SHARE (cross-platform) · COACH REPORT (PDF) |
| `app/160-photo-local-media-store.jsx` | PHOTO RESIZE · LOCAL MEDIA STORE (device-only, IndexedDB) |
| `app/170-setup-all-teams-calendar.jsx` | DD/MM/YYYY DATE FIELD · SETUP · ALL-TEAMS CALENDAR — one week, every squad |
| `app/180-season-plan.jsx` | SEASON PLAN (with customizable periods) |
| `app/190-session-analysis-muscle-model.jsx` | SESSION ANALYSIS HELPERS · INTERACTIVE MUSCLE / MOVEMENT MODEL  (manual, session-scoped) |
| `app/200-team-insights-helpers.jsx` | TEAM INSIGHTS — the widget board under the week calendar · TEAM INSIGHTS REPORT — the board as one A4 landscape sheet. |
| `app/210-team-insights-report.jsx` | — |
| `app/220-team-insights-board.jsx` | — |
| `app/230-calendar.jsx` | CALENDAR (reusable for team & athlete) |
| `app/235-session-kinds.jsx` | TRAINING BLOCK BAR · TEAM PRACTICE / MATCH / TEST WINDOWS |
| `app/240-block-editor-session-details.jsx` | BLOCK EDITOR (now with exercise description row) · SESSION DETAILS — carried by every block |
| `app/250-ball-practice.jsx` | BALL PRACTICE — the court, and the drills drawn on it |
| `app/260-session-editor-planner.jsx` | SESSION EDITOR · PLANNER (week view + day detail; reusable for team/athlete) |
| `app/270-interval-timer.jsx` | INTERVAL TIMER |
| `app/280-reports-photo-cell.jsx` | GENERIC REPORTS RENDERER (used by team & athletes) · TEAM REPORTS · PHOTO CELL — small reusable photo uploader (auto-resize) |
| `app/290-test-pdf.jsx` | TEST PDF GENERATOR — A4 portrait single-test report |
| `app/300-athlete-vs-squad.jsx` | ATHLETE vs SQUAD — the comparison report |
| `app/310-drive-embed-body-model.jsx` | GOOGLE DRIVE EMBED HELPERS · 2D BODY CIRCUMFERENCE MODEL |
| `app/320-testing-session.jsx` | TESTING SESSION — every test renders its own purpose-built, |
| `app/330-test-progression-compare.jsx` | TEST PROGRESSION CHARTS · COMPARE ATHLETES — the printout. Landscape A4, and the same table the screen |
| `app/340-evaluation-tryouts.jsx` | TESTING & ASSESSMENT — dedicated section · TRYOUTS (Seçmeler) — the pool of players who are not on the |
| `app/350-athlete-detail-snapshot.jsx` | ATHLETE DETAIL (Profile · Calendar · Week · Reports · Tests) · ATHLETE SNAPSHOT — compact text summary of an athlete's body |
| `app/360-program-design-assistant.jsx` | PROGRAM DESIGN ASSISTANT — analyses the athlete's profile |
| `app/370-program-writer.jsx` | PROGRAM WRITER — writes a microcycle from scratch for ONE athlete. |
| `app/380-test-reports-recommends.jsx` | — |
| `app/390-scouting-notes.jsx` | ATHLETE PROFILE TAB — identity & anthropometrics (auto-pulled), |
| `app/400-profile-tab.jsx` | — |
| `app/410-atp-profile-ui.jsx` | — |
| `app/420-athlete-detail.jsx` | — |
| `app/430-staff-roster-backup.jsx` | STAFF — the other half of the roster · ATHLETES ROSTER · ROSTER NAME MATCHING · BACKUP |
| `app/440-sync-infra-chunking-merge.jsx` | ROOT · CLOUD SYNC — Firestore parçalı, İÇERİK ADRESLİ (Storage YOK) · ÜÇ YÖNLÜ BİRLEŞTİRME (3-way merge) |
| `app/450-use-cloud-sync.jsx` | — |
| `app/460-auth-ui-cloud-bar.jsx` | — |
| `app/465-privacy-notice.jsx` | KVKK aydınlatma metni (taslak), PrivacyNotice / PrivacyLink |
| `app/470-exercise-taxonomy-text.jsx` | EXERCISES LIBRARY |
| `app/480-exercise-video-picker.jsx` | — |
| `app/490-exercise-modal-cards.jsx` | — |
| `app/500-exercises-view.jsx` | — |
| `app/510-researches.jsx` | RESEARCHES — article-summary blog (auto APA via CrossRef) · Daily research feed — pulls fresh training-science RCTs from |
| `app/520-exercise-library-export.jsx` | PROGRAM INDIVIDUALIZATION — one source session, one editable sheet per athlete. |
| `app/530-athlete-context-readiness.jsx` | — |
| `app/540-indiv-plan-descriptions.jsx` | — |
| `app/550-coach-assistant.jsx` | — |
| `app/560-di-engine-baseline.jsx` | DAILY INDIVIDUALIZATION ENGINE — V1 |
| `app/570-atp-athlete-training-profile.jsx` | — |
| `app/580-sport-context-equipment.jsx` | — |
| `app/590-di-adjust-tier-bundle.jsx` | — |
| `app/600-ai-layer.jsx` | AI LAYER — the coach briefs it, it writes the session. |
| `app/610-di-forms-program-view.jsx` | — |
| `app/620-athlete-snapshot.jsx` | — |
| `app/630-daily-indiv-panel.jsx` | — |
| `app/640-individualization-view.jsx` | — |
| `app/650-language-selector-nav-icons.jsx` | — |
| `app/660-ai-coach.jsx` | AI COACH ASSISTANT — talks to the Claude Messages API directly |
| `app/670-checkin-wellness-alerts-client.jsx` | CHECK-IN FORMLARI — uygulamanın kendi anketleri (Tally'siz yol) · WELLNESS UYARILARI — istemci tarafı |
| `app/680-wellness-alerts-coach.jsx` | WELLNESS ALERTS — the coach's side |
| `app/690-app.jsx` | — |
| `app/700-boot.jsx` | — |
| `99-app-close.html` | Betiğin ve sayfanın kapanışı |

Bölme, `@babel/parser` ile bulunan **üst düzey ifade sınırlarından** yapıldı; her parça tek başına
da derlenir. Başlıklar parçanın içindeki bölüm yorumlarından alındı; bazı parçaların adı
ilk bölümünü yansıtır.
