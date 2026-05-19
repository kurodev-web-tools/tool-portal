# task.md

このファイルは現在の運用タスクだけを置く。完了済みの詳細ログ、比較メモ、長い経緯は PR 本文か `docs/archive` に寄せる。

## Current Premises

- 作業は `main` 直ではなく feature branch / worktree で行う。
- EN 対応の統合先は `codex/en-support-preview`。C scope もここへ小さめ PR で積み、最終確認後に main 向け PR を作る。
- 目標: 2026-05-19 日本時間 23:00 頃までに、公開前 EN 対応を main へ結合可能な状態にする。
- 意味のある実装後は、このファイルに実装内容、検証、必要な幅別確認を残す。
- UI 変更時の確認幅は `390 / 820 / 1024 / 1280 / 1366px` を基本にする。
- ブラウザー実見は、通常の表示確認と幅別確認では Codex app の in-app browser を優先する。繰り返し操作や機械的な console / canvas 確認は Playwright、原因調査は Chrome DevTools MCP に切り替える。
- URL 設計、大規模 i18n framework、保存 schema / IndexedDB / localStorage 既存 key / handoff payload、外部投稿連携は EN 対応 scope では変更しない。

## Active

- English support C scope / pre-main completion
  - base: `origin/codex/en-support-preview`
  - 推奨 worktree: `D:/V_streamer_tools/.worktrees/en-c-scope-copy`
  - 推奨 branch: `codex/en-c-scope-copy`
  - target PR: `codex/en-support-preview`
  - 目的: B scope で残した細部 UI copy を、公開前に見える可能性が高い範囲に限って `ja / en` 対応し、B+C 統合 smoke 後に main 向け PR を作れる状態へ持っていく。

### C Scope Targets

- Portal / common
  - runtime-visible metadata / title / description の必要最小限の整理を確認する。大きくなる場合は静的 `ja` のまま残リスク化する。
  - language switch の通常表示 `日本語 / English`、compact `JA / EN` 方針を維持する。

- Schedule Calendar
  - validation / status / error / aria label / tooltip 相当のうち、通常操作で見える文言を優先して `ja / en` 対応する。
  - mobile settings / events panel の残り見出し、button label、empty / backup / restore 周辺の日本語残りを確認する。
  - saved custom data、backup JSON 内部文字列、ユーザー入力由来 copy は翻訳対象外として扱う。

- Thumbnail Editor
  - validation / warning / quality guard / export error / aria label の主要表示を確認し、公開前に見えるものを `ja / en` 対応する。
  - layer 操作補助、text control 各項目、material category / built-in material 名のうち主要導線に出るものを優先する。
  - preset body、保存 schema、IndexedDB/localStorage key、handoff payload は変更しない。

- SNS Split Image Maker
  - validation / export status / save state / aria description / empty state の主要表示を確認し、公開前に見えるものを `ja / en` 対応する。
  - 保存済みユーザー入力由来 copy は翻訳対象外として扱う。
  - 画像処理、保存方式、URL、handoff payload は変更しない。

### C Scope Constraints

- 大規模 i18n framework は導入しない。
- 既存の小さな dictionary / helper pattern を使う。
- 既存日本語 copy を壊さない。`ja` 側は可能な限り現行文言を維持する。
- C scope は「公開前にユーザーが見やすい copy」まで。細かい内部説明、debug 文、保存済みデータ本文、網羅的 aria 全面翻訳は必要なら残リスク化する。
- 幅確認で崩れそうな長い English label は短くする。

### Suggested Next Session Flow

1. `git fetch origin --prune`
2. `origin/codex/en-support-preview` 起点で worktree / branch を作る。
3. `AGENTS.md`、`task.md`、`package.json`、locale/copy helper、対象 component、既存 contract scripts を読む。
4. 既存 copy dictionary で未翻訳の runtime-visible text を `rg` で洗い出す。
5. contract-first で C scope の対象を固定する。
6. Schedule Calendar、Thumbnail Editor、SNS Split Image Maker の順に小さく実装する。
7. `task.md` に実装内容、検証結果、幅別確認、残リスクを追記する。
8. commit / push / draft PR を `codex/en-support-preview` 宛てに作る。
9. C scope merge 後、B+C 統合 smoke 用 branch を `origin/codex/en-support-preview` 起点で作り、main 向け PR 判断をする。

### Required Verification

- C scope PR:
  - 対象 contract script。必要なら copy locale contract を追加 / 更新する。
  - `node scripts/tool-handoff-contract.mjs`
  - `npm run lint`
  - `npx tsc --noEmit`
  - `git diff --check`
  - UI 変更した対象 page を `390 / 820 / 1024 / 1280 / 1366px` で確認する。
  - `document.documentElement.lang` が `ja / en` に同期すること、manual switch 後 reload で選択が維持されること、body / document 横 overflow なし、console error / warn なしを確認する。

### C Scope Implementation Result

- branch/worktree: `codex/en-c-scope-copy` / `D:/V_streamer_tools/.worktrees/en-c-scope-copy`
- base: `origin/codex/en-support-preview` after PR #160 merge (`2026-05-19T05:36:38Z`)
- added `scripts/en-c-scope-copy-contract.mjs` as the C scope copy contract.
- Schedule Calendar:
  - moved drag move guide, month/period/date/create-event aria, filter/select aria, mobile sheet close aria, and undo-toast close aria into `scheduleCalendarCopy.ja/en`.
  - kept storage key/version, URL, backup JSON shape, saved user content, and handoff payload unchanged.
- Thumbnail Editor:
  - moved major canvas/export/save/user-material/material/standee toast and error copy into `thumbnailEditorCopy.ja/en`.
  - moved layer action titles, quick adjust labels, text/font controls, shape/effect controls, color aria, favorite aria/title, file input aria, and full-preview aria into `thumbnailEditorCopy.ja/en`.
  - kept draft storage key, IndexedDB key, preset body/schema, canvas export naming, and handoff payload unchanged.
- SNS Split Image Maker:
  - moved mode/join tooltips, preview/image/save fallback errors, untitled handoff fallback, handoff textarea aria, preview canvas aria, mobile nav aria, and notification close aria into `snsSplitImageMakerCopy.ja/en`.
  - kept image processing, saved draft metadata/images, URL, export order, and handoff payload unchanged.

### C Scope Verification Result

- PASS: `node scripts/en-c-scope-copy-contract.mjs`
- PASS: `node scripts/schedule-calendar-copy-locale-contract.mjs`
- PASS: `node scripts/thumbnail-sns-copy-locale-contract.mjs`
- PASS: `node scripts/sns-split-image-maker-contract.mjs`
- PASS: `node scripts/tool-handoff-contract.mjs`
- PASS: `npm run lint`
- PASS: `npx tsc --noEmit`
- PASS: `git diff --check` (only repo-normal LF -> CRLF working-copy warnings)
- UI width check:
  - method: local `next dev --webpack -p 3038 --hostname 127.0.0.1` + Playwright-driven browser check.
  - pages: `/`, `/tools`, `/tools/schedule-calendar`, `/tools/thumbnail-editor`, `/tools/sns-split-image-maker`
  - widths: `390 / 820 / 1024 / 1280 / 1366px`
  - locales: `ja / en`
  - result: all target pages passed expected visible copy checks, `document.documentElement.lang` sync, manual language switch + reload persistence, body/document horizontal overflow <= 1px, and no browser console error/warn.

### C Scope Remaining Risks

- saved custom data, backup JSON internal strings, existing user-entered copy, preset body text, and handoff payload values remain untranslated by design.
- fine-grained internal labels in `lib/thumbnail-editor.ts` / `lib/sns-split-image-maker.ts` that are primarily data identifiers, layer matching keys, generated canvas text, or saved draft compatibility strings remain as-is.
- exhaustive aria translation and debug/internal exception text outside the public prelaunch path remain backlog scope.

### EN Follow-up Audit Before B+C Smoke

- audit date: 2026-05-19
- scan basis:
  - `rg "[ぁ-んァ-ン一-龯]" app components lib --glob "!**/*-copy.ts"`
  - focused scans for material metadata, layer names, font / standee metadata, SNS split slot labels, portal metadata, and Schedule Calendar saved defaults.
- judgment:
  - PR #161 is still valid as the C scope UI chrome copy PR.
  - However, B+C integration smoke should not be treated as the final main-readiness pass until the visible follow-up items below are either fixed or explicitly accepted as residual risk.

#### Next PR: EN material / layer / data-label display follow-up

- recommended base: `origin/codex/en-support-preview` after PR #161 merge.
- recommended branch: `codex/en-material-layer-copy`
- recommended worktree: `D:/V_streamer_tools/.worktrees/en-material-layer-copy`
- recommended target: `codex/en-support-preview`
- purpose: English mode should avoid prominent Japanese in data-driven labels that users are likely to see before export or smoke verification.

Primary scope:

- Thumbnail Editor material library:
  - `thumbnailMaterialLibrary` currently keeps Japanese `name`, `description`, and `recommendedPlacement`.
  - `ThumbnailEditorApp` displays and searches those raw fields in the material library.
  - Add display/search helpers in `lib/thumbnail-editor-copy.ts` or a small adjacent helper, and keep the source material ids / storage shape unchanged.
  - Also cover `thumbnailMaterialCategoryLabels` in English display/search.
- Thumbnail Editor layer display:
  - preset / generated layer names such as `画像 1（背景）`, `テキスト 1（見出し）`, `素材: ...`, copy suffixes, and weekly schedule layer names remain Japanese internally.
  - Do not rename saved `layer.name`, preset data, matching keys, handoff payloads, backup JSON, or localStorage/IndexedDB schema.
  - Add UI-only display helpers such as `getThumbnailLayerDisplayName(layer, locale)` and use them in layer list, selected-layer badges, quick-adjust aria labels, standee target text, and preset-apply comparison labels where safe.
  - Keep user-entered custom layer names as-is.
- Thumbnail Editor related visible data labels:
  - standee placement `name` / `description` / `group` are still Japanese data labels in the placement panel.
  - font listbox category / mood metadata includes Japanese text and is visible in English mode.
  - `thumbnailMainTextCarryoverTargets` labels (`見出し`, `時刻`, `サブ`, `ラベル`) are shown in the preset-apply dialog; localize display labels without changing `namePart` matching.
- SNS Split Image Maker:
  - `getSnsSplitSlotLabel()` returns visible Japanese slot labels such as `投稿1 フレーム`, `画像1 左`, `追加画像 1`.
  - canvas placeholder text in `drawPlaceholder(..., "ベース画像を選択してください")` is Japanese.
  - export error fallback currently may surface raw `Error.message` in English mode; align with the existing locale-guarded error handling used by preview/read/save paths.
  - Add locale-aware slot label / placeholder helpers without changing image ids, draft image names, export order, or saved draft shape.
- Portal / common:
  - `ThemeToggle` still has Japanese visible labels / aria (`ライト`, `ダーク`, `表示テーマ`) in English mode.
  - `/tools` Suspense fallback still says `ツール一覧を読み込んでいます。`.
  - per-tool Next metadata in `app/tools/*/page.tsx` remains static Japanese; root/home/tools metadata already has `ja/en` data but server metadata is still selected statically.
  - Fix ThemeToggle and fallback in the follow-up if small. If dynamic per-tool metadata grows, leave it as documented residual risk.
- Schedule Calendar:
  - built-in post templates are already displayed through `getLocalizedPostTemplates()` for the current locale.
  - built-in saved hashtag set names from `defaultHashtagSets` remain Japanese when visible in settings / post assist.
  - Treat saved/imported/custom template and hashtag names as user data and do not translate them. If fixing defaults, use display-only helpers or localized default seed data without changing backup compatibility.

Out of scope / keep as residual risk:

- saved custom data, imported backup JSON strings, existing user-entered layer names, user material names, template bodies, hashtags, and handoff payload values.
- internal matching keys such as `見出し` / `時刻` / `サブ` / `ラベル`, weekly schedule layer grouping keys, and preset layer `name` values.
- generated canvas text that is content/preset body rather than UI chrome, unless a later content-localization PR explicitly handles it.
- exhaustive debug/internal exception strings where English mode already falls back to a localized generic message.

Suggested contract:

- Add or extend a contract script that checks English display helpers exist for:
  - material library display/search copy.
  - material category labels.
  - layer display names while preserving raw `layer.name`.
  - standee placement and font metadata display.
  - SNS split slot labels and canvas placeholder copy.
  - ThemeToggle visible labels / aria.
- Contract should explicitly assert no storage keys, handoff payload fields, draft schema, IndexedDB key, localStorage key, or URL paths changed.

Suggested verification:

- target contract script.
- `node scripts/en-c-scope-copy-contract.mjs`
- `node scripts/tool-handoff-contract.mjs`
- `npm run lint`
- `npx tsc --noEmit`
- `git diff --check`
- UI width check at `390 / 820 / 1024 / 1280 / 1366px` for `/`, `/tools`, `/tools/thumbnail-editor`, `/tools/sns-split-image-maker`, plus `/tools/schedule-calendar` if default hashtag display is touched.
- English-mode visual points:
  - material library cards/search/category filters.
  - layer list and selected layer controls.
  - standee placement panel.
  - font listbox.
  - SNS additional image slot labels and no-image canvas placeholder.
  - ThemeToggle in desktop header / mobile drawer.

- B+C integration smoke:
  - `/`
  - `/tools`
  - `/tools/schedule-calendar`
  - `/tools/thumbnail-editor`
  - `/tools/sns-split-image-maker`
  - `ja / en` 両方で主要見出し、CTA、empty、export、handoff、settings 周辺が読めることを確認する。
  - `npm run lint`
  - `npx tsc --noEmit`
  - `git diff --check`

## Completed EN Support Summary

- PR #154 `codex/en-locale-foundation` -> `codex/en-support-preview`: locale foundation + language switch merged.
- PR #155 `codex/en-portal-tools-copy` -> `codex/en-support-preview`: Portal / Tools major copy localization merged.
- PR #156 `codex/en-schedule-hashtags` -> `codex/en-support-preview`: Schedule Calendar saved hashtag EN copy merged.
- PR #157 `codex/en-thumbnail-sns-copy` -> `codex/en-support-preview`: Thumbnail Editor / SNS Split Image Maker B scope copy merged.
- PR #158 `codex/schedule-calendar-review-polish` -> `codex/en-support-preview`: Schedule Calendar review polish merged.
- PR #159 `codex/schedule-calendar-panel-padding-fix` -> `codex/en-support-preview`: Schedule Calendar right panel desktop padding follow-up merged.
- B scope status: complete on `codex/en-support-preview`.

## Backlog

- C scope のさらに後:
  - 細かい内部説明、debug 文、保存済みデータ本文、網羅的 aria 全面翻訳。
  - Next metadata の動的 locale 切替。ただし公開前に PR が大きくなる場合は後回し。
  - Schedule Calendar: Google Calendar 連携、ログイン / サーバー同期、シリーズ一括編集、例外日、週間予定画像そのものの生成。
  - Thumbnail Editor: 新規 usecase preset、crop 仕様、text / image layer schema、public asset / font 追加。
  - SNS Split Image Maker: ZIP 出力、X 以外の比率、複数形式の大規模 export、重い onboarding。

- Thumbnail Editor next preset candidates
  - PR #124 planning の推奨順: `goods_notice` -> `membership_stream` -> `asmr_stream` -> `relay_stream` -> `collab_recruit_notice`。
  - 公開前調整が一段落してから、1 preset / 1 PR で進める。

## Verification Baseline

docs / contract 変更時は、必要に応じて次を実行する。

- `node scripts/static-export-rsc-aliases.mjs --check`
- `node scripts/tool-portal-entry-contract.mjs`
- `node scripts/tool-handoff-contract.mjs`
- `node scripts/thumbnail-material-assets-contract.mjs`
- `node scripts/thumbnail-quality-guard-contract.mjs`
- `node scripts/thumbnail-standee-placement-contract.mjs`
- `node scripts/sns-split-image-maker-contract.mjs`
- `npm run lint`
- `npx tsc --noEmit`
- `git diff --check`

UI / 表示文言を触った場合のみ、幅別確認結果をこのファイルに残す。

## Archive / Reference

- 2026-04 の履歴: `docs/archive/TASK_HISTORY_2026-04.md`
- 2026-05 の履歴: `docs/archive/TASK_HISTORY_2026-05.md`
- Schedule Calendar future tasks: `docs/future/SCHEDULE_CALENDAR_FUTURE_TASKS.md`
- Thumbnail Editor next PR scope: `docs/future/THUMBNAIL_EDITOR_NEXT_PR_SCOPE.md`
- Thumbnail Editor usecase preset candidates: `docs/future/THUMBNAIL_EDITOR_USECASE_PRESET_CANDIDATES.md`
