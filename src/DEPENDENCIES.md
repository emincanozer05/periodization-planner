# src/app — bağımlılık haritası

> `node deps.js --write` ile üretildi. Anlık görüntü: parçalar arasındaki bağlar değiştikçe
> eskiyebilir; CI yalnızca aşağıdaki iki değişmezi denetliyor, bu belgenin güncelliğini değil.

## Değişmezler (CI denetliyor)

- Üst düzey ad sayısı: **1604**, yinelenen: **0**
- Yükleme sırasında (erken) ileriye başvuru: **0**

## Çekirdek parçalar (en çok bağlanılanlar)

Bunlara çok parça bağlı: ES modülüne ilk bunlar çevrilmeli, çünkü geri kalan her şey bunlara dayanıyor.

| Parça | Kaç parça ona bağlı | Kendisi kaç parçaya bağlı |
|---|---:|---:|
| `dates-language-factories` | 76 | 2 |
| `prelude` | 60 | 1 |
| `constants-session-focus` | 38 | 1 |
| `photo-local-media-store` | 30 | 2 |
| `periods-weeks-load-monotony` | 26 | 7 |
| `exercise-taxonomy-text` | 18 | 3 |
| `test-metadata-fms` | 17 | 2 |
| `move-taxonomy` | 12 | 2 |
| `rhr-team-sync-picker` | 11 | 6 |
| `sync-infra-chunking-merge` | 11 | 1 |

## Bağımsız adaylar

Yalnızca çekirdek (ilk üç parça) ve en fazla 3 parçaya bağlı, kendisine en fazla 2 parça bağlı: modüle çevirmesi en kolay olanlar.

`scouting-notes`, `athlete-phv`, `privacy-notice`, `researches`, `language-selector-nav-icons`

## Geriye (ertelenmiş) bağlar ve döngüler

Parça, kendinden SONRA gelen bir parçadaki adı yalnızca bir işlevin içinde kullanıyorsa güvenli (işlev sonradan çağrılır) ama modüle çevirirken döngüsel `import` olur.

- Geriye bağ sayısı: **94** / toplam bağ 536
- Döngüsel gruplar (karşılıklı bağlı parçalar): **3** — en büyüğü 53 parça

  - `prelude` ↔ `constants-session-focus` ↔ `dates-language-factories`
  - `move-taxonomy` ↔ `exercise-taxonomy-text`
  - `athlete-boxes` ↔ `team-data-migration` ↔ `periods-weeks-load-monotony` ↔ `rhr-team-sync-picker` ↔ `print-session-html` ↔ `print-week` ↔ `crest-week-image` ↔ `print-month` ↔ `pdf-share-coach-report` ↔ `photo-local-media-store` ↔ `setup-all-teams-calendar` ↔ `session-analysis-muscle-model` ↔ `calendar` ↔ `session-kinds` ↔ `block-editor-session-details` ↔ `pattern-plan-table` ↔ `ball-practice` ↔ `session-editor-planner` ↔ `interval-timer` ↔ `test-pdf` ↔ `athlete-vs-squad` ↔ `testing-session` ↔ `test-progression-compare` ↔ `fv-profile` ↔ `evaluation-tryouts` ↔ `athlete-detail-snapshot` ↔ `program-design-assistant` ↔ `program-writer` ↔ `test-reports-recommends` ↔ `atp-profile-ui` ↔ `athlete-detail` ↔ `injury-surveillance` ↔ `athlete-wellness-hrv` ↔ `athlete-info-report` ↔ `staff-roster-backup` ↔ `sync-infra-chunking-merge` ↔ `exercise-video-picker` ↔ `exercise-modal-cards` ↔ `exercise-library-export` ↔ `program-history` ↔ `athlete-context-readiness` ↔ `indiv-plan-descriptions` ↔ `coach-assistant` ↔ `di-engine-baseline` ↔ `atp-athlete-training-profile` ↔ `sport-context-equipment` ↔ `di-adjust-tier-bundle` ↔ `ai-layer` ↔ `di-forms-program-view` ↔ `ai-coach` ↔ `checkin-wellness-alerts-client` ↔ `lift-log` ↔ `wellness-alerts-coach`

## Parça parça

| # | Parça | Tanım | Bağlı olduğu parçalar |
|---:|---|---:|---|
| 1 | `prelude` | 12 | `dates-language-factories`↑ |
| 2 | `constants-session-focus` | 82 | `dates-language-factories`↑ |
| 3 | `dates-language-factories` | 82 | `prelude`, `constants-session-focus` |
| 4 | `test-metadata-fms` | 35 | `prelude`, `dates-language-factories` |
| 5 | `athlete-boxes` | 76 | `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `periods-weeks-load-monotony`↑ |
| 6 | `session-load-clipboard` | 22 | `prelude`, `constants-session-focus`, `dates-language-factories` |
| 7 | `team-data-migration` | 17 | `constants-session-focus`, `dates-language-factories`, `rhr-team-sync-picker`↑, `move-taxonomy`↑, `interval-timer`↑, `evaluation-tryouts`↑, `exercise-taxonomy-text`↑, `exercise-modal-cards`↑, `indiv-plan-descriptions`↑ |
| 8 | `periods-weeks-load-monotony` | 75 | `prelude`, `constants-session-focus`, `dates-language-factories`, `session-load-clipboard`, `photo-local-media-store`↑, `exercise-taxonomy-text`↑, `exercise-library-export`↑ |
| 9 | `rhr-team-sync-picker` | 19 | `prelude`, `constants-session-focus`, `dates-language-factories`, `periods-weeks-load-monotony`, `photo-local-media-store`↑, `athlete-detail-snapshot`↑ |
| 10 | `chart-wrapper` | 14 | `prelude`, `dates-language-factories` |
| 11 | `print-session-html` | 11 | `prelude`, `constants-session-focus`, `dates-language-factories`, `photo-local-media-store`↑, `session-analysis-muscle-model`↑, `ball-practice`↑, `exercise-taxonomy-text`↑, `indiv-plan-descriptions`↑ |
| 12 | `print-week` | 5 | `prelude`, `dates-language-factories`, `periods-weeks-load-monotony`, `rhr-team-sync-picker`, `print-session-html`, `crest-week-image`↑, `print-month`↑, `photo-local-media-store`↑, `indiv-plan-descriptions`↑ |
| 13 | `crest-week-image` | 12 | `prelude`, `dates-language-factories`, `print-week`, `photo-local-media-store`↑, `sync-infra-chunking-merge`↑ |
| 14 | `print-month` | 8 | `prelude`, `constants-session-focus`, `dates-language-factories`, `print-session-html`, `print-week`, `crest-week-image`, `photo-local-media-store`↑, `block-editor-session-details`↑ |
| 15 | `pdf-share-coach-report` | 9 | `prelude`, `dates-language-factories`, `print-session-html`, `crest-week-image` |
| 16 | `photo-local-media-store` | 42 | `drive-embed-body-model`↑, `sync-infra-chunking-merge`↑ |
| 17 | `setup-all-teams-calendar` | 14 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `team-data-migration`, `photo-local-media-store`, `privacy-notice`↑, `di-engine-baseline`↑, `sport-context-equipment`↑, `wellness-alerts-coach`↑ |
| 18 | `season-plan` | 11 | `prelude`, `constants-session-focus`, `dates-language-factories`, `session-load-clipboard`, `team-data-migration`, `periods-weeks-load-monotony`, `rhr-team-sync-picker`, `chart-wrapper`, `setup-all-teams-calendar`, `session-editor-planner`↑, `exercise-taxonomy-text`↑ |
| 19 | `move-taxonomy` | 27 | `dates-language-factories`, `exercise-taxonomy-text`↑ |
| 20 | `session-analysis-muscle-model` | 42 | `prelude`, `constants-session-focus`, `dates-language-factories`, `move-taxonomy`¹, `exercise-taxonomy-text`↑, `coach-assistant`↑ |
| 21 | `team-insights-helpers` | 31 | `constants-session-focus`¹, `dates-language-factories`, `periods-weeks-load-monotony`, `exercise-library-export`↑ |
| 22 | `team-insights-report` | 1 | `prelude`, `dates-language-factories`, `photo-local-media-store`, `team-insights-helpers` |
| 23 | `team-insights-board` | 1 | `prelude`, `constants-session-focus`, `dates-language-factories`, `periods-weeks-load-monotony`, `photo-local-media-store`, `team-insights-helpers`, `team-insights-report`, `athlete-context-readiness`↑, `coach-assistant`↑ |
| 24 | `calendar` | 3 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `session-load-clipboard`, `periods-weeks-load-monotony`, `rhr-team-sync-picker`, `print-week`, `crest-week-image`, `print-month`, `pdf-share-coach-report`, `photo-local-media-store`, `session-analysis-muscle-model`, `session-kinds`↑, `block-editor-session-details`↑, `pattern-plan-table`↑, `ball-practice`↑, `session-editor-planner`↑, `exercise-taxonomy-text`↑ |
| 25 | `session-kinds` | 17 | `prelude`, `constants-session-focus`, `dates-language-factories`, `photo-local-media-store`, `block-editor-session-details`↑, `evaluation-tryouts`↑ |
| 26 | `block-editor-session-details` | 18 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `session-load-clipboard`, `rhr-team-sync-picker`, `photo-local-media-store`, `move-taxonomy`, `session-analysis-muscle-model`, `session-editor-planner`↑, `exercise-taxonomy-text`↑, `indiv-plan-descriptions`↑, `coach-assistant`↑ |
| 27 | `pattern-plan-table` | 20 | `prelude`, `dates-language-factories`, `session-load-clipboard`, `move-taxonomy`, `session-analysis-muscle-model`, `block-editor-session-details`, `indiv-plan-descriptions`↑, `coach-assistant`↑ |
| 28 | `ball-practice` | 47 | `prelude`, `dates-language-factories`, `rhr-team-sync-picker`, `print-session-html`, `print-week`, `photo-local-media-store`, `block-editor-session-details`, `pattern-plan-table`, `sync-infra-chunking-merge`↑, `exercise-video-picker`↑, `coach-assistant`↑ |
| 29 | `session-editor-planner` | 10 | `prelude`, `constants-session-focus`, `dates-language-factories`, `session-load-clipboard`, `rhr-team-sync-picker`, `print-week`, `pdf-share-coach-report`, `session-kinds`, `block-editor-session-details`, `pattern-plan-table`, `ball-practice`, `exercise-taxonomy-text`↑ |
| 30 | `interval-timer` | 15 | `prelude`, `dates-language-factories`, `setup-all-teams-calendar` |
| 31 | `reports-photo-cell` | 3 | `prelude`, `constants-session-focus`, `dates-language-factories`, `session-load-clipboard`, `periods-weeks-load-monotony`, `rhr-team-sync-picker`, `chart-wrapper`, `photo-local-media-store`, `setup-all-teams-calendar`, `exercise-taxonomy-text`↑ |
| 32 | `test-pdf` | 3 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `print-week`, `photo-local-media-store`, `drive-embed-body-model`↑ |
| 33 | `athlete-vs-squad` | 7 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `periods-weeks-load-monotony`, `print-week`, `photo-local-media-store`, `drive-embed-body-model`↑ |
| 34 | `drive-embed-body-model` | 6 | `dates-language-factories` |
| 35 | `testing-session` | 33 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `photo-local-media-store`, `test-pdf`, `athlete-vs-squad`, `drive-embed-body-model`, `fv-profile`↑, `exercise-taxonomy-text`↑ |
| 36 | `test-progression-compare` | 8 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `athlete-boxes`, `team-data-migration`, `periods-weeks-load-monotony`, `chart-wrapper`, `photo-local-media-store` |
| 37 | `fv-profile` | 17 | `prelude`, `dates-language-factories`, `testing-session`, `athlete-phv`↑ |
| 38 | `evaluation-tryouts` | 16 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `team-data-migration`, `periods-weeks-load-monotony`, `photo-local-media-store`, `setup-all-teams-calendar`, `testing-session`, `test-progression-compare` |
| 39 | `athlete-detail-snapshot` | 2 | `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `periods-weeks-load-monotony` |
| 40 | `program-design-assistant` | 11 | `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `periods-weeks-load-monotony`, `athlete-detail-snapshot` |
| 41 | `program-writer` | 12 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `periods-weeks-load-monotony`, `athlete-detail-snapshot`, `program-design-assistant`, `exercise-library-export`↑, `athlete-context-readiness`↑, `coach-assistant`↑, `sport-context-equipment`↑, `ai-coach`↑ |
| 42 | `test-reports-recommends` | 8 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `chart-wrapper`, `athlete-detail-snapshot`, `program-design-assistant`, `ai-coach`↑ |
| 43 | `scouting-notes` | 14 | `prelude`, `dates-language-factories` |
| 44 | `profile-tab` | 3 | `prelude`, `dates-language-factories`, `scouting-notes` |
| 45 | `atp-profile-ui` | 27 | `prelude`, `dates-language-factories`, `test-metadata-fms`, `fv-profile`, `atp-athlete-training-profile`↑, `lift-log`↑ |
| 46 | `athlete-detail` | 8 | `prelude`, `constants-session-focus`, `dates-language-factories`, `periods-weeks-load-monotony`, `chart-wrapper`, `photo-local-media-store`, `session-analysis-muscle-model`, `calendar`, `test-pdf`, `test-reports-recommends`, `profile-tab`, `atp-profile-ui`, `athlete-phv`↑, `injury-surveillance`↑, `athlete-wellness-hrv`↑, `athlete-info-report`↑ |
| 47 | `athlete-phv` | 12 | `prelude`, `dates-language-factories` |
| 48 | `injury-surveillance` | 15 | `prelude`, `constants-session-focus`, `dates-language-factories`, `periods-weeks-load-monotony` |
| 49 | `athlete-wellness-hrv` | 17 | `prelude`, `dates-language-factories`, `periods-weeks-load-monotony`, `rhr-team-sync-picker`, `athlete-detail-snapshot` |
| 50 | `athlete-info-report` | 5 | `prelude`, `dates-language-factories`, `test-metadata-fms`, `periods-weeks-load-monotony`, `photo-local-media-store`, `scouting-notes`, `profile-tab`, `atp-profile-ui`, `athlete-detail`, `athlete-context-readiness`↑, `atp-athlete-training-profile`↑ |
| 51 | `staff-roster-backup` | 6 | `prelude`, `constants-session-focus`, `dates-language-factories`, `team-data-migration`, `periods-weeks-load-monotony`, `photo-local-media-store`, `setup-all-teams-calendar`, `athlete-detail`, `sync-infra-chunking-merge`↑, `checkin-wellness-alerts-client`↑ |
| 52 | `sync-infra-chunking-merge` | 55 | `team-data-migration` |
| 53 | `use-cloud-sync` | 1 | `prelude`, `dates-language-factories`, `team-data-migration`, `photo-local-media-store`, `sync-infra-chunking-merge` |
| 54 | `auth-ui-cloud-bar` | 9 | `prelude`, `dates-language-factories`, `sync-infra-chunking-merge`, `privacy-notice`↑, `language-selector-nav-icons`↑ |
| 55 | `privacy-notice` | 5 | `prelude`, `dates-language-factories` |
| 56 | `exercise-taxonomy-text` | 22 | `prelude`, `dates-language-factories`, `move-taxonomy`¹ |
| 57 | `exercise-video-picker` | 6 | `prelude`, `dates-language-factories`, `photo-local-media-store`, `exercise-taxonomy-text` |
| 58 | `exercise-modal-cards` | 7 | `prelude`, `dates-language-factories`, `photo-local-media-store`, `move-taxonomy`, `ball-practice`, `session-editor-planner`, `sync-infra-chunking-merge`, `exercise-taxonomy-text`, `exercise-video-picker`, `exercise-library-export`↑ |
| 59 | `exercises-view` | 1 | `prelude`, `dates-language-factories`, `setup-all-teams-calendar`, `move-taxonomy`, `exercise-taxonomy-text`, `exercise-modal-cards`, `exercise-library-export`↑ |
| 60 | `researches` | 28 | `prelude`, `dates-language-factories` |
| 61 | `exercise-library-export` | 22 | `prelude`, `dates-language-factories`, `crest-week-image`, `pdf-share-coach-report`, `photo-local-media-store`, `move-taxonomy`, `ball-practice`, `exercise-taxonomy-text`, `athlete-context-readiness`↑, `indiv-plan-descriptions`↑ |
| 62 | `program-history` | 10 | `prelude`, `dates-language-factories`, `ai-layer`↑ |
| 63 | `athlete-context-readiness` | 20 | `constants-session-focus`, `dates-language-factories`, `periods-weeks-load-monotony`, `exercise-library-export` |
| 64 | `indiv-plan-descriptions` | 23 | `prelude`, `constants-session-focus`, `dates-language-factories`, `rhr-team-sync-picker`, `move-taxonomy`, `session-analysis-muscle-model`, `athlete-context-readiness`, `ai-coach`↑ |
| 65 | `coach-assistant` | 18 | `prelude`, `dates-language-factories`, `test-metadata-fms`, `session-load-clipboard`, `periods-weeks-load-monotony`, `block-editor-session-details`, `exercise-library-export`, `athlete-context-readiness` |
| 66 | `di-engine-baseline` | 31 | `dates-language-factories`, `periods-weeks-load-monotony`, `athlete-detail-snapshot`, `exercise-library-export`, `athlete-context-readiness` |
| 67 | `atp-athlete-training-profile` | 59 | `dates-language-factories`, `session-analysis-muscle-model`, `athlete-detail-snapshot`, `exercise-taxonomy-text`¹, `di-engine-baseline`, `sport-context-equipment`↑ |
| 68 | `sport-context-equipment` | 34 | `dates-language-factories`, `athlete-detail-snapshot`, `exercise-taxonomy-text`, `exercise-library-export`, `athlete-context-readiness`, `di-engine-baseline` |
| 69 | `di-adjust-tier-bundle` | 46 | `constants-session-focus`, `dates-language-factories`, `periods-weeks-load-monotony`, `athlete-detail-snapshot`, `program-writer`, `athlete-context-readiness`, `di-engine-baseline`, `atp-athlete-training-profile`, `sport-context-equipment`, `ai-layer`↑ |
| 70 | `ai-layer` | 73 | `dates-language-factories`, `test-metadata-fms`, `move-taxonomy`¹, `session-analysis-muscle-model`, `athlete-detail-snapshot`, `program-design-assistant`, `exercise-library-export`, `coach-assistant`, `di-engine-baseline`, `sport-context-equipment`¹, `di-adjust-tier-bundle`, `di-forms-program-view`↑ |
| 71 | `di-forms-program-view` | 13 | `prelude`, `constants-session-focus`, `dates-language-factories`, `print-session-html`, `move-taxonomy`, `session-analysis-muscle-model`, `pattern-plan-table`, `exercise-taxonomy-text`, `indiv-plan-descriptions`, `di-engine-baseline`, `ai-layer` |
| 72 | `daily-indiv-panel` | 3 | `prelude`, `constants-session-focus`, `dates-language-factories`, `periods-weeks-load-monotony`, `photo-local-media-store`, `session-analysis-muscle-model`, `calendar`, `pattern-plan-table`, `exercise-library-export`, `athlete-context-readiness`, `indiv-plan-descriptions`, `di-adjust-tier-bundle`, `ai-layer`, `di-forms-program-view` |
| 73 | `individualization-view` | 1 | `prelude`, `dates-language-factories`, `print-week`, `setup-all-teams-calendar`, `program-history`, `athlete-context-readiness`, `indiv-plan-descriptions`, `di-adjust-tier-bundle`, `ai-layer`, `daily-indiv-panel` |
| 74 | `language-selector-nav-icons` | 4 | `dates-language-factories` |
| 75 | `ai-coach` | 18 | `dates-language-factories`, `sync-infra-chunking-merge` |
| 76 | `checkin-wellness-alerts-client` | 41 | `prelude`, `constants-session-focus`, `dates-language-factories`, `periods-weeks-load-monotony`, `rhr-team-sync-picker`, `photo-local-media-store`, `setup-all-teams-calendar`, `staff-roster-backup`, `sync-infra-chunking-merge`, `lift-log`↑ |
| 77 | `lift-log` | 39 | `prelude`, `constants-session-focus`, `dates-language-factories`, `sync-infra-chunking-merge`, `program-history` |
| 78 | `wellness-alerts-coach` | 3 | `prelude`, `dates-language-factories`, `checkin-wellness-alerts-client` |
| 79 | `app` | 1 | `prelude`, `constants-session-focus`, `dates-language-factories`, `team-data-migration`, `periods-weeks-load-monotony`, `photo-local-media-store`, `setup-all-teams-calendar`, `season-plan`, `move-taxonomy`, `team-insights-board`, `calendar`, `ball-practice`, `session-editor-planner`, `interval-timer`, `reports-photo-cell`, `evaluation-tryouts`, `injury-surveillance`, `staff-roster-backup`, `sync-infra-chunking-merge`, `use-cloud-sync`, `auth-ui-cloud-bar`, `exercise-video-picker`, `exercise-modal-cards`, `exercises-view`, `individualization-view`, `language-selector-nav-icons`, `checkin-wellness-alerts-client`, `lift-log`, `wellness-alerts-coach` |
| 80 | `boot` | 0 | `photo-local-media-store`¹, `app` |

¹ yükleme sırasında (erken) kullanıyor · ↑ kendinden sonra gelen parça (yalnızca işlev içinde kullanılıyor)
