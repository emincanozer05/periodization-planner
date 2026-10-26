# src/app — bağımlılık haritası

> `node deps.js --write` ile üretildi. Anlık görüntü: parçalar arasındaki bağlar değiştikçe
> eskiyebilir; CI yalnızca aşağıdaki iki değişmezi denetliyor, bu belgenin güncelliğini değil.

## Değişmezler (CI denetliyor)

- Üst düzey ad sayısı: **1746**, yinelenen: **0**
- Yükleme sırasında (erken) ileriye başvuru: **0**

## Çekirdek parçalar (en çok bağlanılanlar)

Bunlara çok parça bağlı: ES modülüne ilk bunlar çevrilmeli, çünkü geri kalan her şey bunlara dayanıyor.

| Parça | Kaç parça ona bağlı | Kendisi kaç parçaya bağlı |
|---|---:|---:|
| `dates-language-factories` | 80 | 2 |
| `prelude` | 64 | 1 |
| `constants-session-focus` | 41 | 1 |
| `photo-local-media-store` | 34 | 2 |
| `periods-weeks-load-monotony` | 26 | 7 |
| `test-metadata-fms` | 18 | 3 |
| `exercise-taxonomy-text` | 18 | 3 |
| `move-taxonomy` | 14 | 2 |
| `exercise-library-export` | 12 | 10 |
| `rhr-team-sync-picker` | 11 | 5 |

## Bağımsız adaylar

Yalnızca çekirdek (ilk üç parça) ve en fazla 3 parçaya bağlı, kendisine en fazla 2 parça bağlı: modüle çevirmesi en kolay olanlar.

`scouting-notes`, `athlete-phv`, `privacy-notice`, `researches`, `language-selector-nav-icons`

## Geriye (ertelenmiş) bağlar ve döngüler

Parça, kendinden SONRA gelen bir parçadaki adı yalnızca bir işlevin içinde kullanıyorsa güvenli (işlev sonradan çağrılır) ama modüle çevirirken döngüsel `import` olur.

- Geriye bağ sayısı: **98** / toplam bağ 573
- Döngüsel gruplar (karşılıklı bağlı parçalar): **3** — en büyüğü 55 parça

  - `prelude` ↔ `constants-session-focus` ↔ `dates-language-factories`
  - `move-taxonomy` ↔ `exercise-taxonomy-text`
  - `test-metadata-fms` ↔ `athlete-boxes` ↔ `team-data-migration` ↔ `periods-weeks-load-monotony` ↔ `rhr-team-sync-picker` ↔ `print-session-html` ↔ `print-week` ↔ `crest-week-image` ↔ `print-month` ↔ `pdf-share-coach-report` ↔ `photo-local-media-store` ↔ `setup-all-teams-calendar` ↔ `session-analysis-muscle-model` ↔ `calendar` ↔ `session-kinds` ↔ `block-editor-session-details` ↔ `pattern-plan-table` ↔ `ball-practice` ↔ `session-editor-planner` ↔ `interval-timer` ↔ `test-pdf` ↔ `athletic-dev-report` ↔ `athlete-vs-squad` ↔ `testing-session` ↔ `test-progression-compare` ↔ `team-data` ↔ `evaluation-tryouts` ↔ `athlete-detail-snapshot` ↔ `program-design-assistant` ↔ `program-writer` ↔ `test-reports-recommends` ↔ `atp-profile-ui` ↔ `athlete-detail` ↔ `injury-surveillance` ↔ `athlete-info-report` ↔ `staff-roster-backup` ↔ `sync-infra-chunking-merge` ↔ `exercise-video-picker` ↔ `exercise-modal-cards` ↔ `exercise-library-export` ↔ `program-history` ↔ `program-bank` ↔ `athlete-context-readiness` ↔ `indiv-plan-descriptions` ↔ `coach-assistant` ↔ `di-engine-baseline` ↔ `atp-athlete-training-profile` ↔ `sport-context-equipment` ↔ `di-adjust-tier-bundle` ↔ `ai-layer` ↔ `di-forms-program-view` ↔ `ai-coach` ↔ `checkin-wellness-alerts-client` ↔ `lift-log` ↔ `wellness-alerts-coach`

## Parça parça

| # | Parça | Tanım | Bağlı olduğu parçalar |
|---:|---|---:|---|
| 1 | `prelude` | 12 | `dates-language-factories`↑ |
| 2 | `constants-session-focus` | 82 | `dates-language-factories`↑ |
| 3 | `dates-language-factories` | 83 | `prelude`, `constants-session-focus` |
| 4 | `test-metadata-fms` | 75 | `prelude`, `dates-language-factories`, `print-week`↑ |
| 5 | `athlete-boxes` | 76 | `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `periods-weeks-load-monotony`↑ |
| 6 | `session-load-clipboard` | 26 | `prelude`, `constants-session-focus`, `dates-language-factories` |
| 7 | `team-data-migration` | 17 | `constants-session-focus`, `dates-language-factories`, `rhr-team-sync-picker`↑, `move-taxonomy`↑, `interval-timer`↑, `evaluation-tryouts`↑, `exercise-taxonomy-text`↑, `exercise-modal-cards`↑, `indiv-plan-descriptions`↑ |
| 8 | `periods-weeks-load-monotony` | 75 | `prelude`, `constants-session-focus`, `dates-language-factories`, `session-load-clipboard`, `photo-local-media-store`↑, `exercise-taxonomy-text`↑, `exercise-library-export`↑ |
| 9 | `rhr-team-sync-picker` | 18 | `prelude`, `constants-session-focus`, `dates-language-factories`, `photo-local-media-store`↑, `athlete-detail-snapshot`↑ |
| 10 | `chart-wrapper` | 14 | `prelude`, `dates-language-factories` |
| 11 | `print-session-html` | 12 | `prelude`, `constants-session-focus`, `dates-language-factories`, `photo-local-media-store`↑, `session-analysis-muscle-model`↑, `ball-practice`↑, `exercise-taxonomy-text`↑, `indiv-plan-descriptions`↑ |
| 12 | `print-week` | 5 | `prelude`, `dates-language-factories`, `periods-weeks-load-monotony`, `rhr-team-sync-picker`, `print-session-html`, `crest-week-image`↑, `print-month`↑, `photo-local-media-store`↑, `indiv-plan-descriptions`↑ |
| 13 | `crest-week-image` | 12 | `prelude`, `dates-language-factories`, `print-week`, `photo-local-media-store`↑, `sync-infra-chunking-merge`↑ |
| 14 | `print-month` | 8 | `prelude`, `constants-session-focus`, `dates-language-factories`, `print-session-html`, `print-week`, `crest-week-image`, `photo-local-media-store`↑, `block-editor-session-details`↑ |
| 15 | `pdf-share-coach-report` | 11 | `prelude`, `dates-language-factories`, `print-session-html`, `crest-week-image` |
| 16 | `photo-local-media-store` | 42 | `drive-embed-body-model`↑, `sync-infra-chunking-merge`↑ |
| 17 | `setup-all-teams-calendar` | 13 | `prelude`, `constants-session-focus`, `dates-language-factories`, `team-data-migration`, `photo-local-media-store`, `privacy-notice`↑, `wellness-alerts-coach`↑ |
| 18 | `season-plan` | 11 | `prelude`, `constants-session-focus`, `dates-language-factories`, `session-load-clipboard`, `team-data-migration`, `periods-weeks-load-monotony`, `rhr-team-sync-picker`, `chart-wrapper`, `setup-all-teams-calendar`, `session-editor-planner`↑, `exercise-taxonomy-text`↑ |
| 19 | `move-taxonomy` | 34 | `dates-language-factories`, `exercise-taxonomy-text`↑ |
| 20 | `session-analysis-muscle-model` | 42 | `prelude`, `constants-session-focus`, `dates-language-factories`, `move-taxonomy`¹, `exercise-taxonomy-text`↑, `coach-assistant`↑ |
| 21 | `team-insights-helpers` | 31 | `constants-session-focus`¹, `dates-language-factories`, `periods-weeks-load-monotony`, `exercise-library-export`↑ |
| 22 | `team-insights-report` | 1 | `prelude`, `dates-language-factories`, `photo-local-media-store`, `team-insights-helpers` |
| 23 | `team-insights-board` | 1 | `prelude`, `constants-session-focus`, `dates-language-factories`, `periods-weeks-load-monotony`, `photo-local-media-store`, `team-insights-helpers`, `team-insights-report`, `athlete-context-readiness`↑, `coach-assistant`↑ |
| 24 | `calendar` | 4 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `session-load-clipboard`, `periods-weeks-load-monotony`, `rhr-team-sync-picker`, `print-week`, `crest-week-image`, `print-month`, `pdf-share-coach-report`, `photo-local-media-store`, `move-taxonomy`, `session-analysis-muscle-model`, `session-kinds`↑, `block-editor-session-details`↑, `pattern-plan-table`↑, `ball-practice`↑, `session-editor-planner`↑, `exercise-taxonomy-text`↑, `program-bank`↑ |
| 25 | `session-kinds` | 17 | `prelude`, `constants-session-focus`, `dates-language-factories`, `photo-local-media-store`, `block-editor-session-details`↑, `evaluation-tryouts`↑, `program-bank`↑ |
| 26 | `block-editor-session-details` | 19 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `session-load-clipboard`, `rhr-team-sync-picker`, `photo-local-media-store`, `move-taxonomy`, `session-analysis-muscle-model`, `session-editor-planner`↑, `exercise-taxonomy-text`↑, `indiv-plan-descriptions`↑, `coach-assistant`↑ |
| 27 | `pattern-plan-table` | 24 | `prelude`, `dates-language-factories`, `session-load-clipboard`, `photo-local-media-store`, `move-taxonomy`, `session-analysis-muscle-model`, `block-editor-session-details`, `indiv-plan-descriptions`↑, `coach-assistant`↑ |
| 28 | `ball-practice` | 47 | `prelude`, `dates-language-factories`, `rhr-team-sync-picker`, `print-session-html`, `print-week`, `photo-local-media-store`, `block-editor-session-details`, `pattern-plan-table`, `sync-infra-chunking-merge`↑, `exercise-video-picker`↑, `coach-assistant`↑ |
| 29 | `session-editor-planner` | 10 | `prelude`, `constants-session-focus`, `dates-language-factories`, `session-load-clipboard`, `rhr-team-sync-picker`, `print-week`, `pdf-share-coach-report`, `session-kinds`, `block-editor-session-details`, `pattern-plan-table`, `ball-practice`, `exercise-taxonomy-text`↑, `program-bank`↑ |
| 30 | `interval-timer` | 15 | `prelude`, `dates-language-factories`, `setup-all-teams-calendar` |
| 31 | `reports-photo-cell` | 3 | `prelude`, `constants-session-focus`, `dates-language-factories`, `session-load-clipboard`, `periods-weeks-load-monotony`, `chart-wrapper`, `photo-local-media-store`, `setup-all-teams-calendar`, `exercise-taxonomy-text`↑ |
| 32 | `test-pdf` | 3 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `print-week`, `photo-local-media-store`, `drive-embed-body-model`↑, `testing-session`↑, `fv-profile`↑ |
| 33 | `athletic-dev-report` | 4 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `photo-local-media-store` |
| 34 | `athlete-vs-squad` | 7 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `periods-weeks-load-monotony`, `print-week`, `photo-local-media-store`, `drive-embed-body-model`↑ |
| 35 | `drive-embed-body-model` | 6 | `dates-language-factories` |
| 36 | `testing-session` | 42 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `photo-local-media-store`, `block-editor-session-details`, `test-pdf`, `athlete-vs-squad`, `drive-embed-body-model`, `fv-profile`↑, `exercise-taxonomy-text`↑ |
| 37 | `test-progression-compare` | 8 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `athlete-boxes`, `team-data-migration`, `periods-weeks-load-monotony`, `chart-wrapper`, `photo-local-media-store` |
| 38 | `fv-profile` | 16 | `prelude`, `dates-language-factories`, `athlete-phv`↑ |
| 39 | `team-data` | 6 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `team-data-migration`, `chart-wrapper`, `test-progression-compare` |
| 40 | `evaluation-tryouts` | 16 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `team-data-migration`, `periods-weeks-load-monotony`, `photo-local-media-store`, `setup-all-teams-calendar`, `athletic-dev-report`, `testing-session`, `team-data` |
| 41 | `athlete-detail-snapshot` | 2 | `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `periods-weeks-load-monotony` |
| 42 | `program-design-assistant` | 11 | `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `periods-weeks-load-monotony`, `athlete-detail-snapshot` |
| 43 | `program-writer` | 12 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `periods-weeks-load-monotony`, `athlete-detail-snapshot`, `program-design-assistant`, `exercise-library-export`↑, `athlete-context-readiness`↑, `coach-assistant`↑, `sport-context-equipment`↑, `ai-coach`↑ |
| 44 | `test-reports-recommends` | 8 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `chart-wrapper`, `athlete-detail-snapshot`, `program-design-assistant`, `ai-coach`↑ |
| 45 | `scouting-notes` | 14 | `prelude`, `dates-language-factories` |
| 46 | `profile-tab` | 3 | `prelude`, `dates-language-factories`, `scouting-notes` |
| 47 | `atp-profile-ui` | 27 | `prelude`, `dates-language-factories`, `test-metadata-fms`, `fv-profile`, `atp-athlete-training-profile`↑ |
| 48 | `athlete-detail` | 10 | `prelude`, `constants-session-focus`, `dates-language-factories`¹, `periods-weeks-load-monotony`, `chart-wrapper`, `photo-local-media-store`, `session-analysis-muscle-model`, `calendar`, `test-pdf`, `test-reports-recommends`, `profile-tab`, `atp-profile-ui`, `athlete-phv`↑, `injury-surveillance`↑, `athlete-info-report`↑ |
| 49 | `athlete-phv` | 12 | `prelude`, `dates-language-factories` |
| 50 | `injury-surveillance` | 15 | `prelude`, `constants-session-focus`, `dates-language-factories`, `periods-weeks-load-monotony` |
| 51 | `athlete-wellness-hrv` | 17 | `prelude`, `dates-language-factories`, `periods-weeks-load-monotony`, `rhr-team-sync-picker`, `athlete-detail-snapshot` |
| 52 | `athlete-info-report` | 5 | `prelude`, `dates-language-factories`, `test-metadata-fms`, `periods-weeks-load-monotony`, `photo-local-media-store`, `scouting-notes`, `profile-tab`, `atp-profile-ui`, `athlete-detail`, `athlete-context-readiness`↑, `atp-athlete-training-profile`↑ |
| 53 | `wellness-view` | 13 | `prelude`, `constants-session-focus`, `dates-language-factories`, `periods-weeks-load-monotony`, `rhr-team-sync-picker`, `photo-local-media-store`, `athlete-detail-snapshot`, `athlete-wellness-hrv` |
| 54 | `staff-roster-backup` | 6 | `prelude`, `constants-session-focus`, `dates-language-factories`, `team-data-migration`, `periods-weeks-load-monotony`, `photo-local-media-store`, `setup-all-teams-calendar`, `athlete-detail`, `sync-infra-chunking-merge`↑, `checkin-wellness-alerts-client`↑ |
| 55 | `sync-infra-chunking-merge` | 77 | `team-data-migration` |
| 56 | `use-cloud-sync` | 1 | `prelude`, `dates-language-factories`, `team-data-migration`, `photo-local-media-store`, `sync-infra-chunking-merge` |
| 57 | `auth-ui-cloud-bar` | 9 | `prelude`, `dates-language-factories`, `sync-infra-chunking-merge`, `privacy-notice`↑, `language-selector-nav-icons`↑ |
| 58 | `privacy-notice` | 5 | `prelude`, `dates-language-factories` |
| 59 | `exercise-taxonomy-text` | 22 | `prelude`, `dates-language-factories`, `move-taxonomy`¹ |
| 60 | `exercise-video-picker` | 6 | `prelude`, `dates-language-factories`, `photo-local-media-store`, `exercise-taxonomy-text` |
| 61 | `exercise-modal-cards` | 7 | `prelude`, `dates-language-factories`, `photo-local-media-store`, `move-taxonomy`, `ball-practice`, `session-editor-planner`, `sync-infra-chunking-merge`, `exercise-taxonomy-text`, `exercise-video-picker`, `exercise-library-export`↑ |
| 62 | `exercises-view` | 1 | `prelude`, `dates-language-factories`, `setup-all-teams-calendar`, `move-taxonomy`, `exercise-taxonomy-text`, `exercise-modal-cards`, `exercise-library-export`↑ |
| 63 | `researches` | 28 | `prelude`, `dates-language-factories` |
| 64 | `exercise-library-export` | 20 | `prelude`, `dates-language-factories`, `crest-week-image`, `pdf-share-coach-report`, `photo-local-media-store`, `move-taxonomy`, `ball-practice`, `exercise-taxonomy-text`, `athlete-context-readiness`↑, `indiv-plan-descriptions`↑ |
| 65 | `program-history` | 10 | `prelude`, `dates-language-factories`, `ai-layer`↑ |
| 66 | `program-bank` | 25 | `prelude`, `dates-language-factories`, `move-taxonomy`, `program-history`, `indiv-plan-descriptions`↑, `ai-layer`↑ |
| 67 | `athlete-context-readiness` | 20 | `constants-session-focus`, `dates-language-factories`, `periods-weeks-load-monotony`, `exercise-library-export` |
| 68 | `indiv-plan-descriptions` | 23 | `prelude`, `constants-session-focus`, `dates-language-factories`, `rhr-team-sync-picker`, `move-taxonomy`, `session-analysis-muscle-model`, `athlete-context-readiness`, `ai-coach`↑ |
| 69 | `coach-assistant` | 18 | `prelude`, `dates-language-factories`, `test-metadata-fms`, `session-load-clipboard`, `periods-weeks-load-monotony`, `block-editor-session-details`, `exercise-library-export`, `athlete-context-readiness` |
| 70 | `di-engine-baseline` | 31 | `dates-language-factories`, `periods-weeks-load-monotony`, `athlete-detail-snapshot`, `exercise-library-export`, `athlete-context-readiness` |
| 71 | `atp-athlete-training-profile` | 59 | `dates-language-factories`, `session-analysis-muscle-model`, `athlete-detail-snapshot`, `exercise-taxonomy-text`¹, `di-engine-baseline`, `sport-context-equipment`↑ |
| 72 | `sport-context-equipment` | 34 | `dates-language-factories`, `athlete-detail-snapshot`, `exercise-taxonomy-text`, `exercise-library-export`, `athlete-context-readiness`, `di-engine-baseline` |
| 73 | `di-adjust-tier-bundle` | 46 | `constants-session-focus`, `dates-language-factories`, `periods-weeks-load-monotony`, `athlete-detail-snapshot`, `program-writer`, `athlete-context-readiness`, `di-engine-baseline`, `atp-athlete-training-profile`, `sport-context-equipment`, `ai-layer`↑ |
| 74 | `ai-layer` | 73 | `dates-language-factories`, `test-metadata-fms`, `move-taxonomy`¹, `session-analysis-muscle-model`, `athlete-detail-snapshot`, `program-design-assistant`, `exercise-library-export`, `coach-assistant`, `di-engine-baseline`, `sport-context-equipment`¹, `di-adjust-tier-bundle`, `di-forms-program-view`↑ |
| 75 | `di-forms-program-view` | 17 | `prelude`, `constants-session-focus`, `dates-language-factories`, `session-load-clipboard`, `print-session-html`, `print-week`, `photo-local-media-store`, `move-taxonomy`, `session-analysis-muscle-model`, `block-editor-session-details`, `pattern-plan-table`, `exercise-taxonomy-text`, `program-bank`, `indiv-plan-descriptions`, `di-engine-baseline`, `ai-layer` |
| 76 | `daily-indiv-panel` | 3 | `prelude`, `constants-session-focus`, `dates-language-factories`, `periods-weeks-load-monotony`, `photo-local-media-store`, `session-analysis-muscle-model`, `calendar`, `pattern-plan-table`, `exercise-library-export`, `athlete-context-readiness`, `indiv-plan-descriptions`, `di-adjust-tier-bundle`, `ai-layer`, `di-forms-program-view` |
| 77 | `individualization-view` | 1 | `prelude`, `dates-language-factories`, `print-week`, `setup-all-teams-calendar`, `program-history`, `athlete-context-readiness`, `indiv-plan-descriptions`, `di-adjust-tier-bundle`, `ai-layer`, `daily-indiv-panel` |
| 78 | `language-selector-nav-icons` | 4 | `dates-language-factories` |
| 79 | `ai-coach` | 18 | `dates-language-factories`, `sync-infra-chunking-merge` |
| 80 | `checkin-wellness-alerts-client` | 43 | `prelude`, `constants-session-focus`, `dates-language-factories`, `periods-weeks-load-monotony`, `rhr-team-sync-picker`, `photo-local-media-store`, `setup-all-teams-calendar`, `staff-roster-backup`, `sync-infra-chunking-merge`, `lift-log`↑ |
| 81 | `lift-log` | 38 | `prelude`, `constants-session-focus`, `dates-language-factories`, `sync-infra-chunking-merge`, `program-history`, `checkin-wellness-alerts-client` |
| 82 | `wellness-alerts-coach` | 3 | `prelude`, `dates-language-factories`, `checkin-wellness-alerts-client` |
| 83 | `app` | 1 | `prelude`, `constants-session-focus`, `dates-language-factories`, `team-data-migration`, `periods-weeks-load-monotony`, `photo-local-media-store`, `setup-all-teams-calendar`, `season-plan`, `move-taxonomy`, `team-insights-board`, `calendar`, `ball-practice`, `session-editor-planner`, `interval-timer`, `reports-photo-cell`, `evaluation-tryouts`, `injury-surveillance`, `wellness-view`, `staff-roster-backup`, `sync-infra-chunking-merge`, `use-cloud-sync`, `auth-ui-cloud-bar`, `exercise-video-picker`, `exercise-modal-cards`, `exercises-view`, `exercise-library-export`, `program-bank`, `individualization-view`, `language-selector-nav-icons`, `checkin-wellness-alerts-client`, `lift-log`, `wellness-alerts-coach` |
| 84 | `boot` | 0 | `photo-local-media-store`¹, `app` |

¹ yükleme sırasında (erken) kullanıyor · ↑ kendinden sonra gelen parça (yalnızca işlev içinde kullanılıyor)
