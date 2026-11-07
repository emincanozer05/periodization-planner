# src/app — bağımlılık haritası

> `node deps.js --write` ile üretildi. Anlık görüntü: parçalar arasındaki bağlar değiştikçe
> eskiyebilir; CI yalnızca aşağıdaki iki değişmezi denetliyor, bu belgenin güncelliğini değil.

## Değişmezler (CI denetliyor)

- Üst düzey ad sayısı: **1976**, yinelenen: **0**
- Yükleme sırasında (erken) ileriye başvuru: **0**

## Çekirdek parçalar (en çok bağlanılanlar)

Bunlara çok parça bağlı: ES modülüne ilk bunlar çevrilmeli, çünkü geri kalan her şey bunlara dayanıyor.

| Parça | Kaç parça ona bağlı | Kendisi kaç parçaya bağlı |
|---|---:|---:|
| `dates-language-factories` | 85 | 2 |
| `prelude` | 68 | 1 |
| `constants-session-focus` | 44 | 1 |
| `photo-local-media-store` | 37 | 2 |
| `periods-weeks-load-monotony` | 29 | 7 |
| `test-metadata-fms` | 20 | 5 |
| `exercise-taxonomy-text` | 18 | 3 |
| `move-taxonomy` | 16 | 2 |
| `sync-infra-chunking-merge` | 15 | 1 |
| `exercise-library-export` | 12 | 10 |

## Bağımsız adaylar

Yalnızca çekirdek (ilk üç parça) ve en fazla 3 parçaya bağlı, kendisine en fazla 2 parça bağlı: modüle çevirmesi en kolay olanlar.

`test-thumbs`, `scouting-notes`, `monitor-config`, `privacy-notice`, `researches`, `language-selector-nav-icons`

## Geriye (ertelenmiş) bağlar ve döngüler

Parça, kendinden SONRA gelen bir parçadaki adı yalnızca bir işlevin içinde kullanıyorsa güvenli (işlev sonradan çağrılır) ama modüle çevirirken döngüsel `import` olur.

- Geriye bağ sayısı: **114** / toplam bağ 623
- Döngüsel gruplar (karşılıklı bağlı parçalar): **3** — en büyüğü 58 parça

  - `prelude` ↔ `constants-session-focus` ↔ `dates-language-factories`
  - `move-taxonomy` ↔ `exercise-taxonomy-text`
  - `test-metadata-fms` ↔ `athlete-boxes` ↔ `team-data-migration` ↔ `periods-weeks-load-monotony` ↔ `rhr-team-sync-picker` ↔ `print-session-html` ↔ `print-week` ↔ `crest-week-image` ↔ `print-month` ↔ `pdf-share-coach-report` ↔ `photo-local-media-store` ↔ `setup-all-teams-calendar` ↔ `session-analysis-muscle-model` ↔ `calendar` ↔ `session-kinds` ↔ `block-editor-session-details` ↔ `pattern-plan-table` ↔ `ball-practice` ↔ `session-editor-planner` ↔ `interval-timer` ↔ `test-pdf` ↔ `athletic-dev-report` ↔ `dev-report-page` ↔ `athlete-vs-squad` ↔ `testing-session` ↔ `test-progression-compare` ↔ `team-data` ↔ `evaluation-tryouts` ↔ `athlete-detail-snapshot` ↔ `program-design-assistant` ↔ `program-writer` ↔ `test-reports-recommends` ↔ `atp-profile-ui` ↔ `athlete-detail` ↔ `injury-surveillance` ↔ `athlete-info-report` ↔ `athlete-polar` ↔ `polar-wellness` ↔ `staff-roster-backup` ↔ `sync-infra-chunking-merge` ↔ `exercise-video-picker` ↔ `exercise-modal-cards` ↔ `exercise-library-export` ↔ `program-history` ↔ `program-bank` ↔ `athlete-context-readiness` ↔ `indiv-plan-descriptions` ↔ `coach-assistant` ↔ `di-engine-baseline` ↔ `atp-athlete-training-profile` ↔ `sport-context-equipment` ↔ `di-adjust-tier-bundle` ↔ `ai-layer` ↔ `di-forms-program-view` ↔ `ai-coach` ↔ `checkin-wellness-alerts-client` ↔ `lift-log` ↔ `wellness-alerts-coach`

## Parça parça

| # | Parça | Tanım | Bağlı olduğu parçalar |
|---:|---|---:|---|
| 1 | `prelude` | 13 | `dates-language-factories`↑ |
| 2 | `constants-session-focus` | 82 | `dates-language-factories`↑ |
| 3 | `dates-language-factories` | 87 | `prelude`, `constants-session-focus` |
| 4 | `test-metadata-fms` | 79 | `prelude`, `dates-language-factories`, `print-week`↑, `photo-local-media-store`↑, `sync-infra-chunking-merge`↑ |
| 5 | `test-thumbs` | 1 | — |
| 6 | `athlete-boxes` | 76 | `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `periods-weeks-load-monotony`↑ |
| 7 | `session-load-clipboard` | 26 | `prelude`, `constants-session-focus`, `dates-language-factories` |
| 8 | `team-data-migration` | 17 | `constants-session-focus`, `dates-language-factories`, `rhr-team-sync-picker`↑, `move-taxonomy`↑, `interval-timer`↑, `evaluation-tryouts`↑, `exercise-taxonomy-text`↑, `exercise-modal-cards`↑, `indiv-plan-descriptions`↑ |
| 9 | `periods-weeks-load-monotony` | 75 | `prelude`, `constants-session-focus`, `dates-language-factories`, `session-load-clipboard`, `photo-local-media-store`↑, `exercise-taxonomy-text`↑, `exercise-library-export`↑ |
| 10 | `rhr-team-sync-picker` | 18 | `prelude`, `constants-session-focus`, `dates-language-factories`, `photo-local-media-store`↑, `athlete-detail-snapshot`↑ |
| 11 | `chart-wrapper` | 14 | `prelude`, `dates-language-factories` |
| 12 | `print-session-html` | 16 | `prelude`, `constants-session-focus`, `dates-language-factories`, `photo-local-media-store`↑, `session-analysis-muscle-model`↑, `ball-practice`↑, `exercise-taxonomy-text`↑, `indiv-plan-descriptions`↑ |
| 13 | `print-week` | 5 | `prelude`, `dates-language-factories`, `periods-weeks-load-monotony`, `rhr-team-sync-picker`, `print-session-html`, `crest-week-image`↑, `print-month`↑, `photo-local-media-store`↑, `indiv-plan-descriptions`↑ |
| 14 | `crest-week-image` | 12 | `prelude`, `dates-language-factories`, `print-week`, `photo-local-media-store`↑, `sync-infra-chunking-merge`↑ |
| 15 | `print-month` | 8 | `prelude`, `constants-session-focus`, `dates-language-factories`, `print-session-html`, `print-week`, `crest-week-image`, `photo-local-media-store`↑, `block-editor-session-details`↑ |
| 16 | `pdf-share-coach-report` | 11 | `prelude`, `dates-language-factories`, `print-session-html`, `crest-week-image` |
| 17 | `photo-local-media-store` | 45 | `drive-embed-body-model`↑, `sync-infra-chunking-merge`↑ |
| 18 | `setup-all-teams-calendar` | 13 | `prelude`, `constants-session-focus`, `dates-language-factories`, `team-data-migration`, `photo-local-media-store`, `privacy-notice`↑, `wellness-alerts-coach`↑ |
| 19 | `season-plan` | 11 | `prelude`, `constants-session-focus`, `dates-language-factories`, `session-load-clipboard`, `team-data-migration`, `periods-weeks-load-monotony`, `rhr-team-sync-picker`, `chart-wrapper`, `setup-all-teams-calendar`, `session-editor-planner`↑, `exercise-taxonomy-text`↑ |
| 20 | `move-taxonomy` | 34 | `dates-language-factories`, `exercise-taxonomy-text`↑ |
| 21 | `session-analysis-muscle-model` | 42 | `prelude`, `constants-session-focus`, `dates-language-factories`, `move-taxonomy`¹, `exercise-taxonomy-text`↑, `coach-assistant`↑ |
| 22 | `team-insights-helpers` | 31 | `constants-session-focus`¹, `dates-language-factories`, `periods-weeks-load-monotony`, `exercise-library-export`↑ |
| 23 | `team-insights-report` | 1 | `prelude`, `dates-language-factories`, `photo-local-media-store`, `team-insights-helpers` |
| 24 | `team-insights-board` | 1 | `prelude`, `constants-session-focus`, `dates-language-factories`, `periods-weeks-load-monotony`, `photo-local-media-store`, `team-insights-helpers`, `team-insights-report`, `athlete-context-readiness`↑, `coach-assistant`↑ |
| 25 | `calendar` | 4 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `session-load-clipboard`, `periods-weeks-load-monotony`, `rhr-team-sync-picker`, `print-session-html`, `print-week`, `crest-week-image`, `print-month`, `pdf-share-coach-report`, `photo-local-media-store`, `move-taxonomy`, `session-analysis-muscle-model`, `session-kinds`↑, `block-editor-session-details`↑, `pattern-plan-table`↑, `ball-practice`↑, `session-editor-planner`↑, `exercise-taxonomy-text`↑, `program-bank`↑ |
| 26 | `session-kinds` | 17 | `prelude`, `constants-session-focus`, `dates-language-factories`, `photo-local-media-store`, `block-editor-session-details`↑, `evaluation-tryouts`↑, `program-bank`↑ |
| 27 | `block-editor-session-details` | 19 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `session-load-clipboard`, `rhr-team-sync-picker`, `photo-local-media-store`, `move-taxonomy`, `session-analysis-muscle-model`, `session-editor-planner`↑, `exercise-taxonomy-text`↑, `indiv-plan-descriptions`↑, `coach-assistant`↑ |
| 28 | `pattern-plan-table` | 29 | `prelude`, `dates-language-factories`, `session-load-clipboard`, `photo-local-media-store`, `move-taxonomy`, `session-analysis-muscle-model`, `block-editor-session-details`, `indiv-plan-descriptions`↑, `coach-assistant`↑ |
| 29 | `ball-practice` | 47 | `prelude`, `dates-language-factories`, `rhr-team-sync-picker`, `print-session-html`, `print-week`, `photo-local-media-store`, `block-editor-session-details`, `pattern-plan-table`, `sync-infra-chunking-merge`↑, `exercise-video-picker`↑, `coach-assistant`↑ |
| 30 | `session-editor-planner` | 10 | `prelude`, `constants-session-focus`, `dates-language-factories`, `session-load-clipboard`, `rhr-team-sync-picker`, `print-week`, `pdf-share-coach-report`, `session-kinds`, `block-editor-session-details`, `pattern-plan-table`, `ball-practice`, `exercise-taxonomy-text`↑, `program-bank`↑ |
| 31 | `interval-timer` | 15 | `prelude`, `dates-language-factories`, `setup-all-teams-calendar` |
| 32 | `reports-photo-cell` | 3 | `prelude`, `constants-session-focus`, `dates-language-factories`, `session-load-clipboard`, `periods-weeks-load-monotony`, `chart-wrapper`, `photo-local-media-store`, `setup-all-teams-calendar`, `polar-wellness`↑, `exercise-taxonomy-text`↑ |
| 33 | `test-pdf` | 5 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `test-thumbs`, `periods-weeks-load-monotony`, `print-week`, `photo-local-media-store`, `drive-embed-body-model`↑, `testing-session`↑, `fv-profile`↑ |
| 34 | `athletic-dev-report` | 10 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `print-week`, `photo-local-media-store`, `athlete-detail-snapshot`↑, `night-sleep-helpers`↑ |
| 35 | `dev-report-page` | 10 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `periods-weeks-load-monotony`, `photo-local-media-store`, `athletic-dev-report`, `night-sleep-helpers`↑ |
| 36 | `athlete-vs-squad` | 7 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `periods-weeks-load-monotony`, `print-week`, `photo-local-media-store`, `drive-embed-body-model`↑ |
| 37 | `drive-embed-body-model` | 6 | `dates-language-factories` |
| 38 | `testing-session` | 42 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `photo-local-media-store`, `block-editor-session-details`, `test-pdf`, `athlete-vs-squad`, `drive-embed-body-model`, `fv-profile`↑, `exercise-taxonomy-text`↑ |
| 39 | `test-progression-compare` | 8 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `athlete-boxes`, `team-data-migration`, `periods-weeks-load-monotony`, `chart-wrapper`, `photo-local-media-store` |
| 40 | `fv-profile` | 16 | `prelude`, `dates-language-factories`, `athlete-phv`↑ |
| 41 | `team-data` | 6 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `team-data-migration`, `chart-wrapper`, `test-progression-compare` |
| 42 | `evaluation-tryouts` | 16 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `team-data-migration`, `periods-weeks-load-monotony`, `photo-local-media-store`, `setup-all-teams-calendar`, `dev-report-page`, `testing-session`, `team-data` |
| 43 | `athlete-detail-snapshot` | 2 | `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `periods-weeks-load-monotony` |
| 44 | `program-design-assistant` | 11 | `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `periods-weeks-load-monotony`, `athlete-detail-snapshot` |
| 45 | `program-writer` | 12 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `periods-weeks-load-monotony`, `athlete-detail-snapshot`, `program-design-assistant`, `exercise-library-export`↑, `athlete-context-readiness`↑, `coach-assistant`↑, `sport-context-equipment`↑, `ai-coach`↑ |
| 46 | `test-reports-recommends` | 8 | `prelude`, `constants-session-focus`, `dates-language-factories`, `test-metadata-fms`, `chart-wrapper`, `athlete-detail-snapshot`, `program-design-assistant`, `ai-coach`↑ |
| 47 | `scouting-notes` | 14 | `prelude`, `dates-language-factories` |
| 48 | `profile-tab` | 3 | `prelude`, `dates-language-factories`, `scouting-notes` |
| 49 | `atp-profile-ui` | 17 | `prelude`, `dates-language-factories`, `test-metadata-fms`, `move-taxonomy`, `fv-profile`, `atp-athlete-training-profile`↑ |
| 50 | `athlete-detail` | 17 | `prelude`, `constants-session-focus`, `dates-language-factories`, `periods-weeks-load-monotony`, `rhr-team-sync-picker`, `chart-wrapper`, `photo-local-media-store`, `session-analysis-muscle-model`, `calendar`, `test-pdf`, `test-reports-recommends`, `profile-tab`, `atp-profile-ui`, `athlete-phv`↑, `injury-surveillance`↑, `athlete-info-report`↑, `athlete-polar`↑, `polar-wellness`↑ |
| 51 | `athlete-phv` | 12 | `prelude`, `dates-language-factories` |
| 52 | `injury-surveillance` | 15 | `prelude`, `constants-session-focus`, `dates-language-factories`, `periods-weeks-load-monotony` |
| 53 | `monitor-config` | 3 | — |
| 54 | `monitor-engine` | 61 | `constants-session-focus`, `dates-language-factories`, `periods-weeks-load-monotony`, `athlete-phv`, `night-sleep-helpers`↑ |
| 55 | `night-sleep-helpers` | 4 | `prelude`, `dates-language-factories` |
| 56 | `athlete-info-report` | 1 | `prelude`, `dates-language-factories`, `test-metadata-fms`, `test-thumbs`, `periods-weeks-load-monotony`, `photo-local-media-store`, `test-pdf`, `scouting-notes`, `profile-tab`, `atp-profile-ui`, `athlete-detail`, `polar-wellness`↑, `athlete-context-readiness`↑ |
| 57 | `athlete-polar` | 9 | `prelude`, `dates-language-factories`, `sync-infra-chunking-merge`↑ |
| 58 | `wellness-view` | 24 | `prelude`, `constants-session-focus`, `dates-language-factories`, `periods-weeks-load-monotony`, `rhr-team-sync-picker`, `photo-local-media-store`, `athlete-detail-snapshot`, `night-sleep-helpers`, `428b-athlete-monitoring`↑, `polar-wellness`↑ |
| 59 | `428b-athlete-monitoring` | 36 | `prelude`, `dates-language-factories`, `periods-weeks-load-monotony`, `monitor-config`, `monitor-engine`, `night-sleep-helpers`, `athlete-polar`, `polar-wellness`↑, `sync-infra-chunking-merge`↑ |
| 60 | `polar-wellness` | 58 | `prelude`, `constants-session-focus`, `dates-language-factories`, `chart-wrapper`, `athlete-polar`, `sync-infra-chunking-merge`↑ |
| 61 | `staff-roster-backup` | 6 | `prelude`, `constants-session-focus`, `dates-language-factories`, `team-data-migration`, `periods-weeks-load-monotony`, `photo-local-media-store`, `setup-all-teams-calendar`, `athlete-detail`, `sync-infra-chunking-merge`↑, `checkin-wellness-alerts-client`↑ |
| 62 | `sync-infra-chunking-merge` | 90 | `team-data-migration` |
| 63 | `use-cloud-sync` | 1 | `prelude`, `dates-language-factories`, `team-data-migration`, `photo-local-media-store`, `sync-infra-chunking-merge`, `indiv-plan-descriptions`↑ |
| 64 | `auth-ui-cloud-bar` | 9 | `prelude`, `dates-language-factories`, `photo-local-media-store`, `sync-infra-chunking-merge`, `privacy-notice`↑, `language-selector-nav-icons`↑ |
| 65 | `privacy-notice` | 5 | `prelude`, `dates-language-factories` |
| 66 | `exercise-taxonomy-text` | 22 | `prelude`, `dates-language-factories`, `move-taxonomy`¹ |
| 67 | `exercise-video-picker` | 6 | `prelude`, `dates-language-factories`, `photo-local-media-store`, `exercise-taxonomy-text` |
| 68 | `exercise-modal-cards` | 7 | `prelude`, `dates-language-factories`, `photo-local-media-store`, `move-taxonomy`, `ball-practice`, `session-editor-planner`, `sync-infra-chunking-merge`, `exercise-taxonomy-text`, `exercise-video-picker`, `exercise-library-export`↑ |
| 69 | `exercises-view` | 1 | `prelude`, `dates-language-factories`, `test-metadata-fms`, `setup-all-teams-calendar`, `move-taxonomy`, `exercise-taxonomy-text`, `exercise-modal-cards`, `exercise-library-export`↑ |
| 70 | `researches` | 28 | `prelude`, `dates-language-factories` |
| 71 | `exercise-library-export` | 20 | `prelude`, `dates-language-factories`, `crest-week-image`, `pdf-share-coach-report`, `photo-local-media-store`, `move-taxonomy`, `ball-practice`, `exercise-taxonomy-text`, `athlete-context-readiness`↑, `indiv-plan-descriptions`↑ |
| 72 | `program-history` | 10 | `prelude`, `dates-language-factories`, `ai-layer`↑ |
| 73 | `program-bank` | 34 | `prelude`, `dates-language-factories`, `move-taxonomy`, `program-history`, `indiv-plan-descriptions`↑, `ai-layer`↑ |
| 74 | `athlete-context-readiness` | 20 | `constants-session-focus`, `dates-language-factories`, `periods-weeks-load-monotony`, `exercise-library-export` |
| 75 | `indiv-plan-descriptions` | 29 | `prelude`, `constants-session-focus`, `dates-language-factories`, `rhr-team-sync-picker`, `move-taxonomy`, `session-analysis-muscle-model`, `athlete-context-readiness`, `ai-coach`↑ |
| 76 | `coach-assistant` | 18 | `prelude`, `dates-language-factories`, `test-metadata-fms`, `session-load-clipboard`, `periods-weeks-load-monotony`, `block-editor-session-details`, `exercise-library-export`, `athlete-context-readiness` |
| 77 | `di-engine-baseline` | 31 | `dates-language-factories`, `periods-weeks-load-monotony`, `athlete-detail-snapshot`, `exercise-library-export`, `athlete-context-readiness` |
| 78 | `atp-athlete-training-profile` | 62 | `dates-language-factories`, `move-taxonomy`, `session-analysis-muscle-model`, `athlete-detail-snapshot`, `exercise-taxonomy-text`¹, `di-engine-baseline`, `sport-context-equipment`↑ |
| 79 | `sport-context-equipment` | 34 | `dates-language-factories`, `athlete-detail-snapshot`, `exercise-taxonomy-text`, `exercise-library-export`, `athlete-context-readiness`, `di-engine-baseline` |
| 80 | `di-adjust-tier-bundle` | 46 | `constants-session-focus`, `dates-language-factories`, `periods-weeks-load-monotony`, `athlete-detail-snapshot`, `program-writer`, `athlete-context-readiness`, `di-engine-baseline`, `atp-athlete-training-profile`, `sport-context-equipment`, `ai-layer`↑ |
| 81 | `ai-layer` | 73 | `dates-language-factories`, `test-metadata-fms`, `move-taxonomy`¹, `session-analysis-muscle-model`, `athlete-detail-snapshot`, `program-design-assistant`, `exercise-library-export`, `coach-assistant`, `di-engine-baseline`, `sport-context-equipment`¹, `di-adjust-tier-bundle`, `di-forms-program-view`↑ |
| 82 | `di-forms-program-view` | 18 | `prelude`, `constants-session-focus`, `dates-language-factories`, `session-load-clipboard`, `print-session-html`, `print-week`, `photo-local-media-store`, `move-taxonomy`, `session-analysis-muscle-model`, `block-editor-session-details`, `pattern-plan-table`, `exercise-taxonomy-text`, `program-bank`, `indiv-plan-descriptions`, `di-engine-baseline`, `ai-layer` |
| 83 | `daily-indiv-panel` | 3 | `prelude`, `constants-session-focus`, `dates-language-factories`, `periods-weeks-load-monotony`, `photo-local-media-store`, `session-analysis-muscle-model`, `calendar`, `pattern-plan-table`, `exercise-library-export`, `athlete-context-readiness`, `indiv-plan-descriptions`, `di-adjust-tier-bundle`, `ai-layer`, `di-forms-program-view` |
| 84 | `individualization-view` | 1 | `prelude`, `dates-language-factories`, `print-session-html`, `print-week`, `setup-all-teams-calendar`, `program-history`, `athlete-context-readiness`, `indiv-plan-descriptions`, `di-adjust-tier-bundle`, `ai-layer`, `daily-indiv-panel` |
| 85 | `language-selector-nav-icons` | 4 | `dates-language-factories` |
| 86 | `ai-coach` | 18 | `dates-language-factories`, `sync-infra-chunking-merge` |
| 87 | `checkin-wellness-alerts-client` | 43 | `prelude`, `constants-session-focus`, `dates-language-factories`, `periods-weeks-load-monotony`, `rhr-team-sync-picker`, `photo-local-media-store`, `setup-all-teams-calendar`, `staff-roster-backup`, `sync-infra-chunking-merge`, `lift-log`↑ |
| 88 | `lift-log` | 38 | `prelude`, `constants-session-focus`, `dates-language-factories`, `sync-infra-chunking-merge`, `program-history`, `checkin-wellness-alerts-client` |
| 89 | `wellness-alerts-coach` | 3 | `prelude`, `dates-language-factories`, `checkin-wellness-alerts-client` |
| 90 | `app` | 1 | `prelude`, `constants-session-focus`, `dates-language-factories`, `team-data-migration`, `periods-weeks-load-monotony`, `photo-local-media-store`, `setup-all-teams-calendar`, `season-plan`, `move-taxonomy`, `team-insights-board`, `calendar`, `ball-practice`, `session-editor-planner`, `interval-timer`, `reports-photo-cell`, `evaluation-tryouts`, `injury-surveillance`, `wellness-view`, `staff-roster-backup`, `sync-infra-chunking-merge`, `use-cloud-sync`, `auth-ui-cloud-bar`, `exercise-video-picker`, `exercise-modal-cards`, `exercises-view`, `exercise-library-export`, `program-bank`, `individualization-view`, `language-selector-nav-icons`, `checkin-wellness-alerts-client`, `lift-log`, `wellness-alerts-coach` |
| 91 | `boot` | 0 | `photo-local-media-store`¹, `app` |

¹ yükleme sırasında (erken) kullanıyor · ↑ kendinden sonra gelen parça (yalnızca işlev içinde kullanılıyor)
