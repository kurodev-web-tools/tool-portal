# task.md

このファイルは現在の運用タスクだけを置く。完了済みの詳細ログ、比較メモ、長い経緯は PR 本文か `docs/archive` に寄せる。

## 現在の前提

- 作業は `main` 直ではなく feature branch / worktree で行う。
- 意味のある実装後は、このファイルに実装内容、検証、必要な幅別確認を残す。
- UI 変更時の確認幅は `390 / 820 / 1024 / 1280 / 1366px` を基本にする。
- ブラウザー実見は、通常の表示確認と幅別確認では Codex app の in-app browser を優先する。繰り返し操作や機械的な console / canvas 確認は Playwright、原因調査は Chrome DevTools MCP に切り替える。
- 2026-05 の完了済み詳細ログは `docs/archive/TASK_HISTORY_2026-05.md` を参照する。
- PR #86 から PR #123 まで `main` / `origin/main` に merge 済み。PR #103 以降の詳細は `docs/archive/TASK_HISTORY_2026-05.md` の P27 を参照する。
- PR #124 `[codex] Plan next thumbnail presets and prelaunch board` は `main` / `origin/main` に merge 済み。merge commit は `105cc457aac1963bc17582dfbfde964598ca44b7`。次 preset 候補 planning の詳細は `docs/future/THUMBNAIL_EDITOR_USECASE_PRESET_CANDIDATES.md` と `docs/mockups/thumbnail-editor-usecase-preset-candidates/README.md` を参照する。

## Active

- Public pre-release work order
  - 進め方: `ポータル整理` -> `各ツール公開前調整` -> `最終確認` の順で進める。
  - session / worktree 方針: レビューしやすさと戻しやすさを優先し、原則として session / worktree / branch / PR を分ける。
  - 推奨分割: `portal-suite-reclassification`、`schedule-public-prelaunch-polish`、`thumbnail-privacy-whiteboard-preset`、`thumbnail-preset-placement-polish`、`sns-split-public-prelaunch-polish`、`public-final-qa`。
  - Thumbnail Editor は範囲が大きくなりやすいため、privacy / whiteboard preset と既存 preset placement polish を別 PR にする。

- 3 tools public pre-release adjustment
  - 目的: 新しい preset 追加より先に、Schedule Calendar / Thumbnail Editor / SNS Split Image Maker を公開前に触って確認できる状態へ整える。
  - 実装方針: 既存機能の配置、copy、導線、初期状態、handoff、export の polish に閉じる。新規大型機能、schema 変更、重い onboarding、外部連携は入れない。
  - suite 整理: `Thumbnail Editor` と `SNS分割画像メーカー` は `ファン＆ブランド` ではなく `配信ワークフロー` に移す。3ツールが `Schedule Calendar -> Thumbnail Editor -> SNS分割画像メーカー` の一連導線として見える状態にする。
  - category 方針: `Thumbnail Editor` と `SNS分割画像メーカー` の tool category は `画像・デザイン` のままにする。suite は利用シーン、category はツール種別として分ける。
  - fan-brand copy: `ファン＆ブランド` の説明と tags からサムネイル作成 / SNS分割画像づくりの主語を外し、ファン交流、プロフィール整備、ブランド素材づくり寄りの説明へ更新する。
  - ブラウザー確認: in-app browser を基本に、`390 / 820 / 1024 / 1280 / 1366px` を記録する。
  - 完了条件: 3ツールそれぞれで static checks、主要幅の表示確認、console error なし、公開前の残リスクを task.md / PR 本文へ記録。
  - 結果記録 2026-05-15 / `portal-suite-reclassification`: `thumbnail-editor` と `sns-split-image-maker` の suite を `stream-workflow` へ移し、category は `design` のまま維持。`stream-workflow` の suite copy / tags / toolCount を `Schedule Calendar -> Thumbnail Editor -> SNS分割画像メーカー` の導線寄りに更新し、`fan-brand` はファン交流、プロフィール整備、ブランド素材づくり寄りへ整理。
  - 検証結果: `node scripts/tool-portal-entry-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`git diff --check` は通過。
  - 幅別確認: in-app browser で `/tools?suite=stream-workflow` と `/tools?suite=fan-brand` を `390 / 820 / 1280px` で確認。`stream-workflow` は `Schedule Calendar -> Thumbnail Editor -> SNS分割画像メーカー` が公開ツールとして先頭に並び、`fan-brand` は `Fan Community` のみに絞られる。console error なし。問題がなかったため `1024 / 1366px` は追加確認なし。
  - 次セッション候補: `schedule-public-prelaunch-polish` を推奨。Schedule Calendar の初期導線、予定作成 / 編集、投稿補助、backup / restore、input guard、Schedule -> Thumbnail / SNS Split handoff copy を公開前調整する。

- Thumbnail Editor preset default placement pass
  - 目的: 既存 preset の初期テキスト / asset / standee guide / frame 配置を mock 画像と再比較し、正式版の default placement へ寄せる。
  - 対象: 既存 preset と usecase preset。特に `first_stream` / `anniversary_stream` / `endurance_stream` / `project_stream` / `cover_song_notice` / `event_notice` は `docs/mockups/thumbnail-editor-usecase-preset-candidates/` の mock と見比べる。
  - 進め方: Codex が mock と現行 canvas を比較して初期配置案を調整 -> in-app browser 幅別確認 -> ユーザー目視レビュー -> 微調整 -> その値を preset default placement として固定。
  - 入れないもの: 新 preset body、production asset 追加、schema、canvas export、font loading helper、font search / recently used UI、Schedule Calendar、SNS Split Image Maker の実装修正。
  - 検証: 対象 preset の contract、`node scripts/thumbnail-preset-discovery-contract.mjs`、`node scripts/thumbnail-preset-batch-readiness-contract.mjs`、`node scripts/thumbnail-preset-variants-contract.mjs`、`node scripts/thumbnail-font-policy-contract.mjs`、`node scripts/thumbnail-material-assets-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`git diff --check`、in-app browser 幅別確認。

- Schedule Calendar public pre-release adjustment
  - 確認観点: 初期導線、予定作成 / 編集、投稿補助、backup / restore、input guard、Schedule -> Thumbnail / SNS Split handoff copy。
  - 入れないもの: Google Calendar 連携、ログイン / サーバー同期、シリーズ一括編集、例外日、週間予定画像生成。
  - 検証: `node scripts/schedule-calendar-storage-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`git diff --check`、in-app browser 幅別確認。

- SNS Split Image Maker public pre-release adjustment
  - 確認観点: `2分割 / 3分割 / 4分割` の初期状態、メイン画像 guard、境界調整、投稿順、個別 PNG / JPEG export copy、Schedule / Thumbnail handoff 後の次アクション。
  - 入れないもの: ZIP 出力、X 以外の比率、複数形式一括 export、重い onboarding。
  - 検証: `node scripts/sns-split-image-maker-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`git diff --check`、in-app browser 幅別確認。

## Backlog

- Thumbnail Editor next preset candidates
  - PR #124 planning の推奨順: `goods_notice` -> `membership_stream` -> `asmr_stream` -> `relay_stream` -> `collab_recruit_notice`。
  - 公開前調整が一段落してから、1 preset / 1 PR で進める。
  - 候補ごとに mock / asset 生成が必要になった時点で `[$imagegen](C:\Users\taka\.codex\skills\.system\imagegen\SKILL.md)` built-in mode を使う。
  - `goods_notice` 実装時は、物販 / merch release 用途として、既存 `イベント告知`、`歌ってみた告知`、通常 `お知らせ` と用途差が分かる preset body / production asset / contract を追加する。

- Freeze 後候補
  - Schedule Calendar: Google Calendar 連携、ログイン / サーバー同期、シリーズ一括編集、例外日、週間予定画像そのものの生成。
  - Thumbnail Editor: 新規 usecase preset、crop 仕様、text / image layer schema、public asset / font 追加。
  - SNS Split Image Maker: ZIP 出力、X 以外の比率、複数形式の大規模 export、重い onboarding。

## Verification baseline

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

## Archive / reference

- 2026-04 の履歴: `docs/archive/TASK_HISTORY_2026-04.md`
- 2026-05 の履歴: `docs/archive/TASK_HISTORY_2026-05.md`
- Schedule Calendar future tasks: `docs/future/SCHEDULE_CALENDAR_FUTURE_TASKS.md`
- Thumbnail Editor next PR scope: `docs/future/THUMBNAIL_EDITOR_NEXT_PR_SCOPE.md`
- Thumbnail Editor usecase preset candidates: `docs/future/THUMBNAIL_EDITOR_USECASE_PRESET_CANDIDATES.md`
