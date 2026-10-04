# src/ — CoachOS kaynağı

`index.html` **üretilmiş bir dosya**: bu klasördeki parçalar `manifest.json`'daki sırayla,
araya hiçbir şey konmadan art arda yapıştırılarak oluşuyor. Tarayıcıya giden kod bölmeden
önceki ile bayt bayt aynı: aynı tek betik, aynı genel kapsam (parçalar arası `import` yok).

## Nasıl çalışılır
1. Değişikliği **`src/` altındaki ilgili parçada** yap (`index.html`'de değil).
2. `node assemble.js` çalıştır; `index.html` yeniden yazılır. İkisini birlikte commit'le.
3. `node check-syntax.js` ve `node validator-test.js` her zamanki gibi.

`node assemble.js --check` (CI'da çalışıyor), `index.html`'in `src/`'den üretilenle aynı olduğunu
doğrular. `index.html`'i elle düzenlersen CI kırmızı olur ve nereye taşıyacağını söyler.

## Parçalar
Sıra önemli: betik tek parça gibi çalıştığı için bir parçanın tanımları ancak kendisinden
ÖNCEKİ parçalardaki (ya da çağrıldıkları anda tanımlı olan) değerlere dayanabilir.
Bu yüzden numaralar sırayı gösteriyor; yeni dosya eklerken `manifest.json`'a da yaz.

| Dosya | Satır | İçerik (bölüm başlıkları) |
|---|---:|---|
| `00-head.html` | | `<head>`: meta, CDN etiketleri, Firebase başlatma, service worker kaydı |
| `10-styles.css` | | Tüm CSS |
| `20-app-open.html` | | `</head><body>`, `#root` ve JSX betiğinin açılışı |
| `app/00-prelude.jsx` | 12 | — |
| `app/10-constants-session-focus.jsx` | 473 | CONSTANTS · SESSION FOCUS — two stages, asked in the order a coach actually decides. |
| `app/20-dates-language-factories.jsx` | 307 | DATE HELPERS · App language (global TR/EN switch) · FACTORIES |
| `app/30-test-metadata-fms.jsx` | 473 | Test metadata for the picker: which drawer a test lives in, · FMS — Functional Movement Screen · TEST INFO — what each test is, and why it is taken · COMPARE ATHLETES — the metric model behind the comparison table. · CURRENT TEAM AVERAGE — for the plain single-score tests |
| `app/35-athlete-boxes.jsx` | 859 | ATHLETES BOXES — main / secondary need classification |
| `app/40-load-data-seasons-monotony.jsx` | 1162 | LOAD CALC — AU is the source of truth · DEFAULT DATA & MIGRATION · SEASONS · PERIODS & WEEKS · MONOTONY / ACWR |
| `app/45-rhr-team-sync-picker.jsx` | 624 | RHR MONITOR — resting heart rate, week over week · TEAM → ATHLETE SESSION SYNC · ATHLETE PICKER (checkbox grid for session participants) |
| `app/50-chart-wrapper.jsx` | 435 | CHART WRAPPER |
| `app/55-print-pdf-share.jsx` | 1386 | PRINT — A4 portrait (single day) & landscape (week) · UNICODE FONT LOADER (Roboto via CDN) · PDF BLOB BUILDER (for Share button) · GENERIC SHARE (cross-platform) · COACH REPORT (PDF) |
| `app/60-photo-local-media-store.jsx` | 435 | PHOTO RESIZE · LOCAL MEDIA STORE (device-only, IndexedDB) |
| `app/65-setup-all-teams-calendar.jsx` | 790 | DD/MM/YYYY DATE FIELD · SETUP · ALL-TEAMS CALENDAR — one week, every squad |
| `app/70-season-plan.jsx` | 521 | SEASON PLAN (with customizable periods) |
| `app/75-session-analysis-muscle-model.jsx` | 702 | SESSION ANALYSIS HELPERS · INTERACTIVE MUSCLE / MOVEMENT MODEL  (manual, session-scoped) |
| `app/80-team-insights.jsx` | 1012 | TEAM INSIGHTS — the widget board under the week calendar · TEAM INSIGHTS REPORT — the board as one A4 landscape sheet. |
| `app/85-calendar.jsx` | 900 | CALENDAR (reusable for team & athlete) |
| `app/90-block-editor-session-details.jsx` | 671 | BLOCK EDITOR (now with exercise description row) · SESSION DETAILS — carried by every block |
| `app/91-ball-practice.jsx` | 961 | BALL PRACTICE — the court, and the drills drawn on it |
| `app/92-session-editor-planner.jsx` | 617 | SESSION EDITOR · PLANNER (week view + day detail; reusable for team/athlete) |
| `app/95-interval-timer.jsx` | 437 | INTERVAL TIMER |
| `app/100-reports-photo-cell.jsx` | 415 | GENERIC REPORTS RENDERER (used by team & athletes) · TEAM REPORTS · PHOTO CELL — small reusable photo uploader (auto-resize) |
| `app/105-test-pdf.jsx` | 626 | TEST PDF GENERATOR — A4 portrait single-test report |
| `app/106-athlete-vs-squad.jsx` | 389 | ATHLETE vs SQUAD — the comparison report |
| `app/110-drive-embed-body-model.jsx` | 83 | GOOGLE DRIVE EMBED HELPERS · 2D BODY CIRCUMFERENCE MODEL |
| `app/115-testing-session.jsx` | 723 | TESTING SESSION — every test renders its own purpose-built, |
| `app/116-test-progression-compare.jsx` | 783 | TEST PROGRESSION CHARTS · COMPARE ATHLETES — the printout. Landscape A4, and the same table the screen |
| `app/120-evaluation-tryouts.jsx` | 861 | TESTING & ASSESSMENT — dedicated section · TRYOUTS (Seçmeler) — the pool of players who are not on the |
| `app/125-athlete-detail-snapshot.jsx` | 84 | ATHLETE DETAIL (Profile · Calendar · Week · Reports · Tests) · ATHLETE SNAPSHOT — compact text summary of an athlete's body |
| `app/126-program-design-writer.jsx` | 1118 | PROGRAM DESIGN ASSISTANT — analyses the athlete's profile · PROGRAM WRITER — writes a microcycle from scratch for ONE athlete. |
| `app/127-athlete-profile-tab.jsx` | 1300 | ATHLETE PROFILE TAB — identity & anthropometrics (auto-pulled), |
| `app/130-staff-roster-backup.jsx` | 526 | STAFF — the other half of the roster · ATHLETES ROSTER · ROSTER NAME MATCHING · BACKUP |
| `app/135-cloud-sync.jsx` | 2062 | ROOT · CLOUD SYNC — Firestore parçalı, İÇERİK ADRESLİ (Storage YOK) · ÜÇ YÖNLÜ BİRLEŞTİRME (3-way merge) |
| `app/140-exercise-library.jsx` | 1034 | EXERCISES LIBRARY |
| `app/145-researches.jsx` | 409 | RESEARCHES — article-summary blog (auto APA via CrossRef) · Daily research feed — pulls fresh training-science RCTs from |
| `app/150-program-individualization.jsx` | 1295 | PROGRAM INDIVIDUALIZATION — one source session, one editable sheet per athlete. |
| `app/155-daily-individualization.jsx` | 2154 | DAILY INDIVIDUALIZATION ENGINE — V1 |
| `app/160-ai-layer.jsx` | 3148 | AI LAYER — the coach briefs it, it writes the session. |
| `app/165-ai-coach.jsx` | 198 | AI COACH ASSISTANT — talks to the Claude Messages API directly |
| `app/170-checkin-wellness-alerts-client.jsx` | 840 | CHECK-IN FORMLARI — uygulamanın kendi anketleri (Tally'siz yol) · WELLNESS UYARILARI — istemci tarafı |
| `app/175-wellness-alerts-coach.jsx` | 227 | WELLNESS ALERTS — the coach's side |
| `app/180-app.jsx` | 310 | — |
| `app/190-boot.jsx` | 5 | — |
| `99-app-close.html` | | Betiğin ve sayfanın kapanışı |

Bölme, `@babel/parser` ile bulunan **üst düzey ifade sınırlarından** yapıldı; her parça tek
başına da derlenir (`check-syntax.js` bunu denetler) ve hata olduğunda dosya adıyla gösterilir.

## Sırada
Bu adım yalnızca dosyaları ayırdı. Parçaları ES modülüne çevirip (`import`/`export`),
Vite ile paketlemek ve nadir kullanılan sekmeleri ihtiyaç olunca yüklemek sonraki aşamalar.
