# src/app — bağımlılık haritası

> `node deps.js --write` ile üretildi. Anlık görüntü: parçalar arasındaki bağlar değiştikçe
> eskiyebilir; CI yalnızca aşağıdaki iki değişmezi denetliyor, bu belgenin güncelliğini değil.

## Değişmezler (CI denetliyor)

- Üst düzey ad sayısı: **1479**, yinelenen: **0**
- Yükleme sırasında (erken) ileriye başvuru: **0**

## Çekirdek parçalar (en çok bağlanılanlar)

Bunlara çok parça bağlı: ES modülüne ilk bunlar çevrilmeli, çünkü geri kalan her şey bunlara dayanıyor.

| Parça | Kaç parça ona bağlı | Kendisi kaç parçaya bağlı |
|---|---:|---:|
| `dates-language-factories` | 70 | 2 |
| `prelude` | 55 | 1 |
| `constants-session-focus` | 36 | 1 |
| `photo-local-media-store` | 30 | 2 |
| `periods-weeks-load-monotony` | 25 | 7 |
| `test-metadata-fms` | 17 | 2 |
| `exercise-taxonomy-text` | 17 | 2 |
| `rhr-team-sync-picker` | 11 | 6 |
| `exercise-library-export` | 11 | 9 |
| `athlete-context-readiness` | 11 | 4 |

## Bağımsız adaylar

Yalnızca çekirdek (ilk üç parça) ve en fazla 3 parçaya bağlı, kendisine en fazla 2 parça bağlı: modüle çevirmesi en kolay olanlar.

`scouting-notes`, `privacy-notice`, `researches`, `language-selector-nav-icons`

## Geriye (ertelenmiş) bağlar ve döngüler

Parça, kendinden SONRA gelen bir parçadaki adı yalnızca bir işlevin içinde kullanıyorsa güvenli (işlev sonradan çağrılır) ama modüle çevirirken döngüsel `import` olur.

- Geriye bağ sayısı: **82** / toplam bağ 490
- Döngüsel gruplar (karşılıklı bağlı parçalar): **3** — en büyüğü 44 parça

  - `prelude` ↔ `constants-session-focus` ↔ `dates-language-factories`
  - `athlete-boxes` ↔ `team-data-migration` ↔ `periods-weeks-load-monotony` ↔ `rhr-team-sync-picker` ↔ `print-session-html` ↔ `print-week` ↔ `crest-week-image` ↔ `print-month` ↔ `pdf-share-coach-report` ↔ `photo-local-media-store` ↔ `setup-all-teams-calendar` ↔ `session-analysis-muscle-model` ↔ `calendar` ↔ `session-kinds` ↔ `block-editor-session-details` ↔ `pattern-plan-table` ↔ `ball-practice` ↔ `session-editor-planner` ↔ `interval-timer` ↔ `test-pdf` ↔ `athlete-vs-squad` ↔ `testing-session` ↔ `test-progression-compare` ↔ `evaluation-tryouts` ↔ `athlete-detail-snapshot` ↔ `program-design-assistant` ↔ `test-reports-recommends` ↔ `atp-profile-ui` ↔ `athlete-detail` ↔ `athlete-wellness-hrv` ↔ `athlete-info-report` ↔ `staff-roster-backup` ↔ `sync-infra-chunking-merge` ↔ `exercise-video-picker` ↔ `exercise-library-export` ↔ `athlete-context-readiness` ↔ `indiv-plan-descriptions` ↔ `coach-assistant` ↔ `di-engine-baseline` ↔ `atp-athlete-training-profile` ↔ `sport-context-equipment` ↔ `ai-coach` ↔ `checkin-wellness-alerts-client` ↔ `wellness-alerts-coach`
  - `di-adjust-tier-bundle` ↔ `ai-layer` ↔ `di-forms-program-view`

## Parça parça

| # | Parça | Tanım | Bağlı olduğu parçalar |
|---:|---|---:|---|
| 1 | `prelude` | 12 | `dates-language-factories`↑ |
| 2 | `constants-session-focus` | 82 | `dates-language-factories`↑ |
| 3 | `dates-language-factories` | 78 | `prelude`, `constants-session-focus` |
| 4 | `test-metadata-fms` | 35 | `prelude`, `dates-language-factories` |
| 5 | `athlete-boxes` | 76 | `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `periods-weeks-load-monotony`↑ |
| 6 | `session-load-clipboard` | 22 | `prelude`, `constants-session-focus`, `dates-language-factories` |
| 7 | `team-data-migration` | 17 | `constants-session-focus`, `dates-language-factories`, `rhr-team-sync-picker`↑, `interval-timer`↑, `evaluation-tryouts`↑, `exercise-taxonomy-text`↑, `indiv-plan-descriptions`↑ |
| 8 | `periods-weeks-load-monotony` | 75 | `prelude`, `constants-session-focus`, `dates-language-factories`, `session-load-clipboard`, `photo-local-media-store`↑, `exercise-taxonomy-text`↑, `exercise-library-export`↑ |
| 9 | `rhr-team-sync-picker` | 19 | `prelude`, `constants-session-focus`, `dates-language-factories`, `periods-weeks-load-monotony`, `photo-local-media-store`↑, `athlete-detail-snapshot`↑ |
| 10 | `chart-wrapper` | 14 | `prelude`, `dates-language-factories` |
| 11 | `print-session-html` | 9 | `prelude`, `constants-session-focus`, `dates-language-factories`, `photo-local-media-store`↑, `ball-practice`↑, `indiv-plan-descriptions`↑ |
| 12 | `print-week` | 5 | `prelude`, `dates-language-factories`, `periods-weeks-load-monotony`, `rhr-team-sync-picker`, `print-session-html`, `crest-week-image`↑, `print-month`↑, `photo-local-media-store`↑, `indiv-plan-descriptions`↑ |
| 13 | `crest-week-image` | 12 | `prelude`, `dates-language-factories`, `print-week`, `photo-local-media-store`↑, `sync-infra-chunking-merge`↑ |
| 14 | `print-month` | 8 | `prelude`, `constants-session-focus`, `dates-language-factories`, `print-session-html`, `print-week`, `crest-week-image`, `photo-local-media-store`↑, `block-editor-session-details`↑ |
| 15 | `pdf-share-coach-report` | 9 | `prelude`, `dates-language-factories`, `print-session-html`, `crest-week-image` |
| 16 | `photo-local-media-store` | 42 | `drive-embed-body-model`↑, `sync-infra-chunking-merge`↑ |
| 17 | `setup-all-teams-calendar` | 14 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `team-data-migration`, `photo-local-media-store`, `privacy-notice`↑, `di-engine-baseline`↑, `sport-context-equipment`↑, `wellness-alerts-coach`↑ |
| 18 | `season-plan` | 11 | `prelude`, `constants-session-focus`, `dates-language-factories`, `session-load-clipboard`, `team-data-migration`, `periods-weeks-load-monotony`, `rhr-team-sync-picker`, `chart-wrapper`, `setup-all-teams-calendar`, `session-editor-planner`↑, `exercise-taxonomy-text`↑ |
| 19 | `session-analysis-muscle-model` | 46 | `prelude`, `constants-session-focus`, `dates-language-factories`, `exercise-taxonomy-text`↑, `coach-assistant`↑ |
| 20 | `team-insights-helpers` | 31 | `constants-session-focus`¹, `dates-language-factories`, `periods-weeks-load-monotony`, `exercise-library-export`↑ |
| 21 | `team-insights-report` | 1 | `prelude`, `dates-language-factories`, `photo-local-media-store`, `team-insights-helpers` |
| 22 | `team-insights-board` | 1 | `prelude`, `constants-session-focus`, `dates-language-factories`, `periods-weeks-load-monotony`, `photo-local-media-store`, `team-insights-helpers`, `team-insights-report`, `athlete-context-readiness`↑, `coach-assistant`↑ |
| 23 | `calendar` | 3 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `session-load-clipboard`, `periods-weeks-load-monotony`, `rhr-team-sync-picker`, `print-week`, `crest-week-image`, `print-month`, `pdf-share-coach-report`, `photo-local-media-store`, `session-analysis-muscle-model`, `session-kinds`↑, `block-editor-session-details`↑, `ball-practice`↑, `session-editor-planner`↑, `exercise-taxonomy-text`↑ |
| 24 | `session-kinds` | 17 | `prelude`, `constants-session-focus`, `dates-language-factories`, `photo-local-media-store`, `block-editor-session-details`↑, `evaluation-tryouts`↑ |
| 25 | `block-editor-session-details` | 22 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `session-load-clipboard`, `rhr-team-sync-picker`, `photo-local-media-store`, `session-analysis-muscle-model`, `session-editor-planner`↑, `exercise-taxonomy-text`↑, `indiv-plan-descriptions`↑, `coach-assistant`↑ |
| 26 | `pattern-plan-table` | 11 | `prelude`, `dates-language-factories`, `session-load-clipboard`, `session-analysis-muscle-model`, `block-editor-session-details`, `exercise-taxonomy-text`↑, `indiv-plan-descriptions`↑, `coach-assistant`↑ |
| 27 | `ball-practice` | 47 | `prelude`, `dates-language-factories`, `rhr-team-sync-picker`, `print-session-html`, `print-week`, `photo-local-media-store`, `block-editor-session-details`, `pattern-plan-table`, `sync-infra-chunking-merge`↑, `exercise-video-picker`↑, `coach-assistant`↑ |
| 28 | `session-editor-planner` | 10 | `prelude`, `constants-session-focus`, `dates-language-factories`, `session-load-clipboard`, `rhr-team-sync-picker`, `print-week`, `pdf-share-coach-report`, `session-kinds`, `block-editor-session-details`, `ball-practice`, `exercise-taxonomy-text`↑ |
| 29 | `interval-timer` | 15 | `prelude`, `dates-language-factories`, `setup-all-teams-calendar` |
| 30 | `reports-photo-cell` | 3 | `prelude`, `constants-session-focus`, `dates-language-factories`, `session-load-clipboard`, `periods-weeks-load-monotony`, `rhr-team-sync-picker`, `chart-wrapper`, `photo-local-media-store`, `setup-all-teams-calendar`, `exercise-taxonomy-text`↑ |
| 31 | `test-pdf` | 3 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `print-week`, `photo-local-media-store`, `drive-embed-body-model`↑ |
| 32 | `athlete-vs-squad` | 7 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `periods-weeks-load-monotony`, `print-week`, `photo-local-media-store`, `drive-embed-body-model`↑ |
| 33 | `drive-embed-body-model` | 6 | `dates-language-factories` |
| 34 | `testing-session` | 33 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `photo-local-media-store`, `test-pdf`, `athlete-vs-squad`, `drive-embed-body-model`, `exercise-taxonomy-text`↑ |
| 35 | `test-progression-compare` | 8 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `athlete-boxes`, `team-data-migration`, `periods-weeks-load-monotony`, `chart-wrapper`, `photo-local-media-store` |
| 36 | `evaluation-tryouts` | 16 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `team-data-migration`, `periods-weeks-load-monotony`, `photo-local-media-store`, `setup-all-teams-calendar`, `testing-session`, `test-progression-compare` |
| 37 | `athlete-detail-snapshot` | 2 | `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `periods-weeks-load-monotony` |
| 38 | `program-design-assistant` | 11 | `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `periods-weeks-load-monotony`, `athlete-detail-snapshot` |
| 39 | `program-writer` | 12 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `periods-weeks-load-monotony`, `athlete-detail-snapshot`, `program-design-assistant`, `exercise-library-export`↑, `athlete-context-readiness`↑, `coach-assistant`↑, `sport-context-equipment`↑, `ai-coach`↑ |
| 40 | `test-reports-recommends` | 8 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `chart-wrapper`, `athlete-detail-snapshot`, `program-design-assistant`, `ai-coach`↑ |
| 41 | `scouting-notes` | 14 | `prelude`, `dates-language-factories` |
| 42 | `profile-tab` | 3 | `prelude`, `dates-language-factories`, `scouting-notes` |
| 43 | `atp-profile-ui` | 27 | `prelude`, `dates-language-factories`, `test-metadata-fms`, `atp-athlete-training-profile`↑ |
| 44 | `athlete-detail` | 8 | `prelude`, `constants-session-focus`, `dates-language-factories`, `periods-weeks-load-monotony`, `chart-wrapper`, `photo-local-media-store`, `session-analysis-muscle-model`, `calendar`, `test-pdf`, `test-reports-recommends`, `profile-tab`, `atp-profile-ui`, `athlete-wellness-hrv`↑, `athlete-info-report`↑ |
| 45 | `athlete-wellness-hrv` | 17 | `prelude`, `dates-language-factories`, `periods-weeks-load-monotony`, `rhr-team-sync-picker`, `athlete-detail-snapshot` |
| 46 | `athlete-info-report` | 5 | `prelude`, `dates-language-factories`, `test-metadata-fms`, `periods-weeks-load-monotony`, `photo-local-media-store`, `scouting-notes`, `profile-tab`, `atp-profile-ui`, `athlete-detail`, `athlete-context-readiness`↑, `atp-athlete-training-profile`↑ |
| 47 | `staff-roster-backup` | 6 | `prelude`, `constants-session-focus`, `dates-language-factories`, `team-data-migration`, `periods-weeks-load-monotony`, `photo-local-media-store`, `setup-all-teams-calendar`, `athlete-detail`, `sync-infra-chunking-merge`↑, `checkin-wellness-alerts-client`↑ |
| 48 | `sync-infra-chunking-merge` | 55 | `team-data-migration` |
| 49 | `use-cloud-sync` | 1 | `prelude`, `dates-language-factories`, `team-data-migration`, `photo-local-media-store`, `sync-infra-chunking-merge` |
| 50 | `auth-ui-cloud-bar` | 9 | `prelude`, `dates-language-factories`, `sync-infra-chunking-merge`, `privacy-notice`↑, `language-selector-nav-icons`↑ |
| 51 | `privacy-notice` | 5 | `prelude`, `dates-language-factories` |
| 52 | `exercise-taxonomy-text` | 25 | `prelude`, `dates-language-factories` |
| 53 | `exercise-video-picker` | 6 | `prelude`, `dates-language-factories`, `photo-local-media-store`, `exercise-taxonomy-text` |
| 54 | `exercise-modal-cards` | 7 | `prelude`, `dates-language-factories`, `photo-local-media-store`, `ball-practice`, `session-editor-planner`, `sync-infra-chunking-merge`, `exercise-taxonomy-text`, `exercise-video-picker`, `exercise-library-export`↑ |
| 55 | `exercises-view` | 1 | `prelude`, `dates-language-factories`, `setup-all-teams-calendar`, `exercise-taxonomy-text`, `exercise-modal-cards`, `exercise-library-export`↑ |
| 56 | `researches` | 28 | `prelude`, `dates-language-factories` |
| 57 | `exercise-library-export` | 22 | `prelude`, `dates-language-factories`, `crest-week-image`, `pdf-share-coach-report`, `photo-local-media-store`, `ball-practice`, `exercise-taxonomy-text`, `athlete-context-readiness`↑, `indiv-plan-descriptions`↑ |
| 58 | `athlete-context-readiness` | 20 | `constants-session-focus`, `dates-language-factories`, `periods-weeks-load-monotony`, `exercise-library-export` |
| 59 | `indiv-plan-descriptions` | 23 | `prelude`, `constants-session-focus`, `dates-language-factories`, `rhr-team-sync-picker`, `session-analysis-muscle-model`, `athlete-context-readiness`, `ai-coach`↑ |
| 60 | `coach-assistant` | 18 | `prelude`, `dates-language-factories`, `test-metadata-fms`, `session-load-clipboard`, `periods-weeks-load-monotony`, `block-editor-session-details`, `exercise-library-export`, `athlete-context-readiness` |
| 61 | `di-engine-baseline` | 31 | `dates-language-factories`, `periods-weeks-load-monotony`, `athlete-detail-snapshot`, `exercise-library-export`, `athlete-context-readiness` |
| 62 | `atp-athlete-training-profile` | 52 | `dates-language-factories`, `session-analysis-muscle-model`, `athlete-detail-snapshot`, `exercise-taxonomy-text`¹, `di-engine-baseline`, `sport-context-equipment`↑ |
| 63 | `sport-context-equipment` | 34 | `dates-language-factories`, `athlete-detail-snapshot`, `exercise-taxonomy-text`, `exercise-library-export`, `athlete-context-readiness`, `di-engine-baseline` |
| 64 | `di-adjust-tier-bundle` | 46 | `constants-session-focus`, `dates-language-factories`, `periods-weeks-load-monotony`, `athlete-detail-snapshot`, `program-writer`, `athlete-context-readiness`, `di-engine-baseline`, `atp-athlete-training-profile`, `sport-context-equipment`, `ai-layer`↑ |
| 65 | `ai-layer` | 79 | `dates-language-factories`, `test-metadata-fms`, `athlete-detail-snapshot`, `program-design-assistant`, `exercise-library-export`, `coach-assistant`, `di-engine-baseline`, `sport-context-equipment`¹, `di-adjust-tier-bundle`, `di-forms-program-view`↑ |
| 66 | `di-forms-program-view` | 13 | `prelude`, `constants-session-focus`, `dates-language-factories`, `print-session-html`, `session-analysis-muscle-model`, `block-editor-session-details`, `pattern-plan-table`, `exercise-taxonomy-text`, `indiv-plan-descriptions`, `di-engine-baseline`, `ai-layer` |
| 67 | `daily-indiv-panel` | 3 | `prelude`, `constants-session-focus`, `dates-language-factories`, `periods-weeks-load-monotony`, `photo-local-media-store`, `session-analysis-muscle-model`, `calendar`, `exercise-library-export`, `athlete-context-readiness`, `indiv-plan-descriptions`, `di-adjust-tier-bundle`, `ai-layer`, `di-forms-program-view` |
| 68 | `individualization-view` | 1 | `prelude`, `dates-language-factories`, `print-week`, `setup-all-teams-calendar`, `athlete-context-readiness`, `indiv-plan-descriptions`, `di-adjust-tier-bundle`, `ai-layer`, `daily-indiv-panel` |
| 69 | `language-selector-nav-icons` | 4 | `dates-language-factories` |
| 70 | `ai-coach` | 18 | `dates-language-factories`, `sync-infra-chunking-merge` |
| 71 | `checkin-wellness-alerts-client` | 41 | `prelude`, `constants-session-focus`, `dates-language-factories`, `periods-weeks-load-monotony`, `rhr-team-sync-picker`, `photo-local-media-store`, `setup-all-teams-calendar`, `staff-roster-backup`, `sync-infra-chunking-merge` |
| 72 | `wellness-alerts-coach` | 3 | `prelude`, `dates-language-factories`, `checkin-wellness-alerts-client` |
| 73 | `app` | 1 | `prelude`, `constants-session-focus`, `dates-language-factories`, `team-data-migration`, `periods-weeks-load-monotony`, `photo-local-media-store`, `setup-all-teams-calendar`, `season-plan`, `team-insights-board`, `calendar`, `ball-practice`, `session-editor-planner`, `interval-timer`, `reports-photo-cell`, `evaluation-tryouts`, `staff-roster-backup`, `sync-infra-chunking-merge`, `use-cloud-sync`, `auth-ui-cloud-bar`, `exercise-video-picker`, `exercise-modal-cards`, `exercises-view`, `individualization-view`, `language-selector-nav-icons`, `checkin-wellness-alerts-client`, `wellness-alerts-coach` |
| 74 | `boot` | 0 | `photo-local-media-store`¹, `app` |

¹ yükleme sırasında (erken) kullanıyor · ↑ kendinden sonra gelen parça (yalnızca işlev içinde kullanılıyor)
