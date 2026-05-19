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

- Thumbnail Editor EN preset layer display name aliases
  - branch/worktree: `codex/en-thumbnail-layer-display-alias` / `D:/V_streamer_tools/.worktrees/en-thumbnail-layer-display-alias`
  - base: `origin/codex/en-support-preview` after PR #167 merge (`2026-05-19T13:04:35Z`)
  - implementation:
    - extended `getThumbnailLayerDisplayName(layer, locale)` EN token aliases for built-in preset layer semantic names.
    - added UI-only composite token localization for weekly layer keys such as `月曜 / 曜日`, `月曜 / 時間`, and `月曜 / 予定`, while keeping raw weekly grouping keys unchanged.
    - kept raw `layer.name`, preset ids, matching keys, storage/schema keys, and handoff payload fields unchanged.
  - contract:
    - `scripts/thumbnail-preset-text-locale-contract.mjs` now checks every preset layer resolves to an EN display name without Japanese characters.
    - the same contract verifies raw `layer.name` stays stable after resolving EN display aliases.
  - verification:
    - PASS: `node scripts/en-c-scope-copy-contract.mjs`
    - PASS: `node scripts/thumbnail-preset-text-locale-contract.mjs`
    - PASS: `node scripts/tool-handoff-contract.mjs`
    - PASS: `npm run lint`
    - PASS: `npx tsc --noEmit`
    - PASS: `git diff --check` (only repo-normal LF -> CRLF working-copy warnings)
  - width check:
    - not run. This change is limited to helper/contract alias resolution and does not change DOM structure, layout classes, preset data, storage/schema, or handoff payloads.
  - remaining risks:
    - custom user-created layer names remain untranslated by design.
    - selected-layer name input keeps the existing UI-only alias behavior: unchanged alias blur preserves the raw name, while actual manual edits still become the layer name as before.

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

### EN Material / Layer Copy Follow-up Result

- branch/worktree: `codex/en-material-layer-copy` / `D:/V_streamer_tools/.worktrees/en-material-layer-copy`
- base: `origin/codex/en-support-preview` after PR #161 merge (`2026-05-19T06:52:11Z`)
- Thumbnail Editor:
  - localized built-in material library display helpers for `name / description / recommendedPlacement`, category labels, search matching, material toast / aria display names.
  - added UI-only layer display-name localization for known preset/material/system layers while preserving stored `layer.name`, matching keys, handoff payload, backup JSON, localStorage, and IndexedDB schema.
  - localized standee placement `name / description / group`, font language/category/mood metadata, and main-text carryover target labels while keeping internal `namePart` values unchanged.
- SNS Split Image Maker:
  - localized `getSnsSplitSlotLabel()` visible slot labels and no-image canvas placeholder.
  - kept image ids, draft image names, export order, and saved draft shape unchanged.
  - English mode export fallback now avoids surfacing raw Japanese exception messages in the user toast.
- Portal / common:
  - localized `ThemeToggle` visible label, aria, and title.
  - moved `/tools` Suspense fallback copy into `portalCopy`.
- Schedule Calendar:
  - no code change in this follow-up. Default hashtag display localization was already covered by the existing schedule copy helper; saved/imported/custom hashtag data remains user data and untranslated by design.

### EN Material / Layer Copy Follow-up Verification

- PASS: `node scripts/en-c-scope-copy-contract.mjs`
- PASS: `node scripts/thumbnail-sns-copy-locale-contract.mjs`
- PASS: `node scripts/tool-handoff-contract.mjs`
- PASS: `npm run lint`
- PASS: `npx tsc --noEmit`
- PASS: `git diff --check` (only repo-normal LF -> CRLF working-copy warnings)
- UI width check:
  - method: local `next dev --webpack -p 3037` + Playwright-driven browser check.
  - pages: `/`, `/tools`, `/tools/thumbnail-editor`, `/tools/sns-split-image-maker`
  - widths: `390 / 820 / 1024 / 1280 / 1366px`
  - result: English display passed for material library cards/search/category filters, layer list display, text/font metadata, SNS additional slot labels, ThemeToggle desktop/mobile drawer labels, manual language switch + reload persistence, `document.documentElement.lang` sync, body/document horizontal overflow <= 1px, and no browser console error/warn.
  - `/tools/schedule-calendar` was not rechecked in this follow-up because Schedule Calendar code was not changed.

### EN Material / Layer Copy Follow-up Remaining Risks

- per-tool static metadata remains mostly static unless already covered by previous EN PRs; larger metadata restructuring is deferred to B+C integration smoke / main PR judgment.
- canvas text, preset body text, saved user input, custom layer names, backup JSON payload values, and handoff payload values remain untranslated by design.
- exhaustive internal/debug exception text outside normal English-mode UI flow remains backlog scope.

### EN Layer Name Input Review Follow-up

- branch/worktree: `codex/en-layer-name-input` / `D:/V_streamer_tools/.worktrees/en-layer-name-input`
- base: `origin/codex/en-support-preview` after PR #162 merge (`2026-05-19T10:04:07Z`)
- Thumbnail Editor:
  - localized the selected-layer `Layer name` input value with the same UI-only `getThumbnailLayerDisplayName()` helper used by the layer list and selected-layer badge.
  - kept stored `layer.name`, preset matching keys, handoff payload, backup JSON, localStorage, and IndexedDB schema unchanged.
  - added a blur guard so simply focusing / blurring the localized display alias does not overwrite the original stored Japanese layer name; if the user edits the input, the edited value is still treated as a custom layer name.
- Verification:
  - PASS: RED -> GREEN `node scripts/en-c-scope-copy-contract.mjs`
  - PASS: `node scripts/thumbnail-sns-copy-locale-contract.mjs`
  - PASS: `node scripts/tool-handoff-contract.mjs`
  - PASS: `npm run lint`
  - PASS: `npx tsc --noEmit`
  - PASS: `git diff --check` (only repo-normal LF -> CRLF working-copy warnings)
- UI width check:
  - method: local `next dev --webpack -p 3041 --hostname 127.0.0.1` + Playwright CLI.
  - page: `/tools/thumbnail-editor`
  - widths: `390 / 820 / 1024 / 1280 / 1366px`
  - result: English mode layer-name input displayed `Text 3 (Sub text)`, `document.documentElement.lang` was `en`, body/document horizontal overflow was `0`, and console output had only normal dev-server React DevTools / HMR info logs.
- Remaining risk:
  - user-entered custom layer names remain untranslated by design.

### EN Schedule Token Label Review Follow-up

- branch/worktree: `codex/en-schedule-token-labels` / `D:/V_streamer_tools/.worktrees/en-schedule-token-labels`
- base: `origin/codex/en-support-preview` after PR #163 merge (`2026-05-19T10:40:22Z`)
- Schedule Calendar:
  - localized the Post assist template variable button labels shown under `Body`.
  - kept insertion tokens such as `{title}`, `{date}`, `{announcementText}`, saved templates, backup JSON, localStorage keys, and handoff payload unchanged.
  - added `getPostTemplateVariableLabel()` so the existing static token list can keep compatibility labels while UI display comes from `scheduleCalendarCopy`.
- Verification:
  - PASS: RED -> GREEN `node scripts/schedule-calendar-copy-locale-contract.mjs`
  - PASS: `node scripts/en-c-scope-copy-contract.mjs`
  - PASS: `node scripts/tool-handoff-contract.mjs`
  - PASS: `npm run lint`
  - PASS: `npx tsc --noEmit`
  - PASS: `git diff --check` (only repo-normal LF -> CRLF working-copy warnings)
- UI width check:
  - method: local `next dev --webpack -p 3042 --hostname 127.0.0.1` + Playwright CLI.
  - page: `/tools/schedule-calendar`
  - widths: `390 / 820 / 1024 / 1280 / 1366px`
  - result: English mode variable labels displayed `Title / Date / Start time / End time / Day / Category / Platform / Memo / Announcement / Hashtags`; Japanese token labels were not visible in that panel; clicking `Title` inserted `{title}`; `document.documentElement.lang` was `en`; body/document horizontal overflow was `0`; console error/warn was `0`.
- Remaining risk:
  - Thumbnail preset text layer canvas contents remain preset body/content, not display labels. Translating those should be a separate localized preset-content PR because it changes the actual generated thumbnail text rather than UI chrome.

### EN Thumbnail Preset Text Content Final Follow-up

- branch/worktree: `codex/en-preset-text-content` / `D:/V_streamer_tools/.worktrees/en-preset-text-content`
- base: `origin/codex/en-support-preview` after PR #164 merge (`2026-05-19T11:00:45Z`)
- Thumbnail Editor:
  - added `localizeThumbnailPresetTextLayerBodies()` in `lib/thumbnail-editor-copy.ts` with compact English initial body text for each preset text layer.
  - applied the helper only when creating/applying preset drafts in English mode: initial new draft, preset apply, canvas-size change, variant change, and broken-draft fallback.
  - kept Japanese mode preset text bodies unchanged.
  - kept preset ids, stored `layer.name`, main-text matching keys (`見出し / 時刻 / サブ / ラベル`), weekly grouping layer names, storage keys, draft schema, backup/user-entered text, and handoff payload unchanged.
  - Schedule Calendar handoff text still overrides localized preset initial text after preset apply.
- Verification:
  - PASS: RED -> GREEN `node scripts/thumbnail-preset-text-locale-contract.mjs`
  - PASS: `node scripts/en-c-scope-copy-contract.mjs`
  - PASS: `node scripts/thumbnail-sns-copy-locale-contract.mjs`
  - PASS: `node scripts/tool-handoff-contract.mjs`
  - PASS: `node scripts/thumbnail-preset-variants-contract.mjs`
  - PASS: `npm run lint`
  - PASS: `npx tsc --noEmit`
  - PASS: `git diff --check` (only repo-normal LF -> CRLF working-copy warnings)
  - Note: extra exploratory `node scripts/thumbnail-layer-management-contract.mjs` still fails on pre-existing weekly row y drift (`月曜` expected 75 / actual 95). It was not changed in this scope.
- UI width check:
  - method: local `next dev --webpack -p 3038` + Playwright-driven Chrome smoke.
  - page: `/tools/thumbnail-editor`
  - widths: `390 / 820 / 1024 / 1280 / 1366px`
  - result: English mode new draft selected text was `Let's hang out together!` with no Japanese characters; preset cards stayed English; layer list / selected-layer input stayed English where visible; `document.documentElement.lang` was `en`; body/document horizontal overflow was `0`; console error/warn was `0`.
  - preset apply smoke at `1280px`: applying `Whiteboard Plan` as-is kept selected text English (`21:00 START`) with no Japanese characters.
  - Schedule Calendar handoff smoke at `1280px`: `HANDOFF TITLE` was present before and after applying `Whiteboard Plan` with schedule text, confirming handoff text priority over localized preset initial text.
  - manual language switch + reload at `1280px`: `ja` and `en` selections persisted in `v-streamer-tools-locale`, and `document.documentElement.lang` matched after reload.
- Remaining risk:
  - existing saved drafts, user-entered custom text, backup JSON values, and handoff payload values remain untranslated by design.
  - visual check confirmed selected text / UI state rather than OCR-reading every canvas glyph. Contract covers all preset text layer bodies for English mode.
  - next PR: B+C integration smoke / main PR judgment.

### EN Thumbnail Preset Visual Balance Follow-up

- branch/worktree: `codex/en-preset-visual-balance` / `D:/V_streamer_tools/.worktrees/en-preset-visual-balance`
- base: `origin/codex/en-support-preview` after PR #165 merge (`2026-05-19T11:35:47Z`)
- Thumbnail Editor:
  - shortened long English preset initial text for time/sub/label/headline layers that were visually heavy in English mode.
  - added `getThumbnailPresetTextLayerVisualAdjustment()` and an EN-only visual adjustment map in `lib/thumbnail-editor-copy.ts`.
  - limited layout adjustment to targeted English text layers during English draft creation/apply only.
  - incorporated the supplied `stream_announce` English draft: restored `21:00 START` time text and applied the headline `x/y` adjustment from the draft JSON.
  - incorporated the supplied `first_stream` English draft: applied headline/time/sub `x/y` adjustments from the draft JSON while keeping text copy unchanged.
  - incorporated the supplied `anniversary_stream` English draft: applied the one-line headline/time copy and headline/sub/time layout adjustments from the draft JSON.
  - incorporated the supplied `endurance_stream` English draft: restored `19:00 START`, applied label/headline/goal/sub/time layout adjustments, and aligned the contract width estimator with Orbitron's narrow display.
  - incorporated the supplied `project_stream` English draft: restored `20:30 START`, applied English-label/headline/sub layout adjustments, and aligned the contract width estimator with Montserrat's display width.
  - incorporated the supplied `cover_song_notice` English draft: applied the one-line headline, `20:00 public` time copy, label/headline layout adjustments, and aligned the contract width estimator with `M PLUS Rounded 1c`.
  - incorporated the supplied `event_notice` English draft: applied the one-line headline and headline layout adjustment, and aligned the contract width estimator with `Zen Kaku Gothic New`.
  - incorporated the supplied `privacy_notice` English draft: restored `20:00 START` and applied the headline layout adjustment.
  - incorporated the supplied `karaoke` English draft: applied the `song/frame` headline, restored `20:00 START`, and applied headline/English-headline/time/sub layout adjustments.
  - incorporated the supplied `chatting` English draft: restored `21:00 START` while keeping existing text-layer layout unchanged.
  - incorporated the supplied `clip` English draft: applied `20:00 / public` time copy and label/headline/time layout adjustments.
  - incorporated the supplied `game_live` English draft: restored `20:00 START` while keeping existing text-layer layout unchanged.
  - incorporated the supplied `collaboration` English draft: restored `20:00 START` while keeping existing text-layer layout unchanged.
  - incorporated the supplied `announcement` English draft: applied the one-line headline and headline layout adjustment, and aligned the contract width estimator with `Noto Serif JP`.
  - kept Japanese preset text/layout unchanged, and kept preset ids, stored `layer.name`, matching keys, weekly grouping keys, storage/schema, and handoff payload unchanged.
  - Schedule Calendar handoff text still overrides English preset initial text and EN layout helper output after preset apply.
- Verification:
  - PASS: RED -> GREEN `node scripts/thumbnail-preset-text-locale-contract.mjs`
  - PASS: `node scripts/en-c-scope-copy-contract.mjs`
  - PASS: `node scripts/thumbnail-sns-copy-locale-contract.mjs`
  - PASS: `node scripts/tool-handoff-contract.mjs`
  - PASS: `npm run lint`
  - PASS: `npx tsc --noEmit`
  - PASS: `git diff --check` (only repo-normal LF -> CRLF working-copy warnings)
- UI width check:
  - method: local `next dev --webpack -p 3044 --hostname 127.0.0.1` + Chrome DevTools MCP browser check.
  - page: `/tools/thumbnail-editor`
  - widths: `390 / 820 / 1024 / 1280 / 1366px`
  - result: English mode preset cards, layer list, selected-layer input, and preset apply dialog stayed English; canvas was nonblank; `document.documentElement.lang` was `en`; body/document horizontal overflow was `0`; console error/warn was `0`.
  - manual language switch + reload at `1366px`: `ja` and `en` persisted in `v-streamer-tools-locale`, and `document.documentElement.lang` matched after reload.
  - Schedule Calendar handoff smoke at `1366px`: `HANDOFF TITLE` remained after applying `Whiteboard Plan` with schedule text, and `Today's Plan` did not replace the handoff title.
- Remaining risk:
  - visual balance is contract-checked with estimated text width plus browser smoke; it does not OCR every rendered canvas glyph.
  - existing saved drafts, user-entered custom text, backup JSON values, and handoff payload values remain unchanged by design.
  - next PR: B+C integration smoke / main PR judgment.

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

### EN SNS Split / Remaining Polish

- branch/worktree: `codex/en-sns-split-polish` / `D:/V_streamer_tools/.worktrees/en-sns-split-polish`
- base: `origin/codex/en-support-preview` after PR #168 merge (`2026-05-19T13:35:56Z`)
- SNS Split Image Maker:
  - preset landing cards now use a flex body plus a dedicated CTA area, keeping the `Open editor` / `編集画面を開く` button height and card-bottom gap stable even when card text length differs.
  - kept preset ids, storage key, draft schema, handoff payload shape, export behavior, and URL design unchanged.
- Thumbnail Editor / EN support polish:
  - preset-card category / usage chips now wrap within the card instead of relying on horizontal overflow, so `Project / viewer participation` stays inside the card.
  - Schedule -> Thumbnail handoff canvas fallback text is locale-aware: EN mode uses `Untitled event` / `Stream notice` instead of `無題の予定` / `配信告知` when payload fields are missing.
  - static metadata for root/home/tools/tool pages now uses conservative English copy where runtime locale metadata is not available.
  - adjusted EN copy for Discord feedback aria, planned sign-in copy, and result count suffix (`visible`) so isolated labels read naturally.
- Verification:
  - PASS: RED -> GREEN `node scripts/en-c-scope-copy-contract.mjs`
  - PASS: RED -> GREEN `node scripts/sns-split-image-maker-contract.mjs`
  - PASS: RED -> GREEN `node scripts/portal-tools-copy-locale-contract.mjs`
  - PASS: RED -> GREEN `node scripts/tool-portal-entry-contract.mjs`
  - PASS: `node scripts/thumbnail-preset-text-locale-contract.mjs`
  - PASS: `node scripts/tool-handoff-contract.mjs`
  - PASS: `npm run lint`
  - PASS: `npx tsc --noEmit`
  - PASS: `git diff --check` (only repo-normal LF -> CRLF working-copy warnings)
- UI width check:
  - method: local `next dev --webpack -p 3037` + Chrome DevTools MCP browser check on `http://localhost:3037`.
  - SNS Split page: started from `/tools/sns-split-image-maker/?preset=split-2`, then opened the preset landing with the existing change-preset control.
  - widths: requested `390 / 820 / 1280px`; Chrome DevTools could not reduce `window.innerWidth` below `500px`, so the smallest measured viewport was `500px`.
  - JA/EN SNS preset cards: CTA button height delta `0`, card bottom-gap delta `0`, same-row button top delta `0` at `820 / 1280px`, and body/document horizontal overflow `0`.
  - Thumbnail Editor preset cards: EN `Project / viewer participation` and JA `企画 / 視聴者参加` chips stayed within the visible card bounds at measured `500 / 820 / 1280px`; body/document horizontal overflow `0`.
- Remaining risk:
  - exact `390px` browser measurement was not available through Chrome DevTools MCP in this environment; smallest actual `window.innerWidth` was `500px`.
  - static metadata is conservative English, not runtime locale-switched metadata.

- Follow-up 2026-05-19 / Thumbnail preset CTA alignment:
  - fixed Thumbnail Editor preset cards so `このプリセットを使用` / `Use this preset` is pinned to the bottom of each stretched grid card.
  - kept the existing outline button styling and chip wrapping behavior; no preset id, schema, storage key, raw layer name, or handoff payload changes.
  - verification: `node scripts/en-c-scope-copy-contract.mjs` RED -> GREEN, `npx tsc --noEmit` passed.
  - browser check: local `next dev --webpack -p 3037` + Chrome DevTools MCP on `/tools/thumbnail-editor/`; JA/EN at `820px` showed per-row button top delta `0`, bottom-gap delta `0`, height delta `0`, and body overflow `0`; EN at `1280px` also showed row deltas `0`; requested `390px` still measured as actual `500px`, with button height delta `0`, bottom-gap delta `0`, body overflow `0`.

### Final EN Support Integration Check

- branch/worktree: `codex/en-support-final-check` / `D:/V_streamer_tools/.worktrees/en-support-final-check`
- base: `origin/codex/en-support-preview` after PR #170 merge (`2026-05-19T14:20:33Z`, merge commit `1f242b6d977d31d74cc1dd9a77233f9f5c18e91f`)
- implementation:
  - added locale readiness to `LocaleProvider` so one-time handoff consumers wait until stored/browser locale resolution completes.
  - gated Thumbnail Editor and SNS Split Image Maker handoff hydration on locale readiness.
  - fixed EN mode Schedule -> Thumbnail empty-payload fallback so `Untitled event` / `Stream notice` are used instead of the default JA fallback.
- verification:
  - PASS: `node scripts/en-c-scope-copy-contract.mjs` (RED -> GREEN for locale-ready handoff consumption)
  - PASS: `node scripts/thumbnail-preset-text-locale-contract.mjs`
  - PASS: `node scripts/tool-handoff-contract.mjs`
  - PASS: `node scripts/sns-split-image-maker-contract.mjs`
  - PASS: `node scripts/portal-tools-copy-locale-contract.mjs`
  - PASS: `node scripts/tool-portal-entry-contract.mjs`
  - PASS: `npm run lint`
  - PASS: `npx tsc --noEmit`
  - PASS: `git diff --check`
- UI width check:
  - method: local `next dev --webpack -p 3047 --hostname 127.0.0.1` + Playwright with installed Chrome.
  - pages: `/`, `/tools`, `/tools/schedule-calendar`, `/tools/thumbnail-editor`, `/tools/sns-split-image-maker`
  - locales: `ja / en`
  - widths: `390 / 820 / 1024 / 1280 / 1366px`
  - result: target pages passed visible copy checks, `document.documentElement.lang` checks, metadata presence checks, body/document horizontal overflow <= 1px, and console error/warn checks.
  - Thumbnail Editor preset card CTA: card CTAs stayed within cards at all target widths/locales.
  - SNS Split Image Maker preset card CTA: landing card CTAs stayed within cards at all target widths/locales.
  - Project Stream category/usage labels: `Project / viewer participation` stayed inside the preset card with no chip overflow at all target widths.
  - Schedule -> Thumbnail handoff fallback: EN mode empty-payload fallback showed `Untitled event` / `Stream notice` in editable draft fields and did not surface `無題の予定` / `配信告知`.
  - manual language switch + reload: `/tools` at `1280px` persisted `en` and `ja` selections and restored matching visible copy after reload.
- remaining risks:
  - static metadata remains conservative English and is not runtime locale-switched.
  - saved custom data, user-entered text, backup JSON values, and handoff payload values remain untranslated by design.
  - visual checks use DOM metrics and editable draft field values; they do not OCR canvas text.
- main PR judgment:
  - PR #170 merge gate passed.
  - Final check found one EN handoff hydration issue, fixed it in this branch, and rechecked the affected flow.
  - Main-bound draft PR is appropriate after this branch passes final verification.

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
