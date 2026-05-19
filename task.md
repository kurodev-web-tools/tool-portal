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
