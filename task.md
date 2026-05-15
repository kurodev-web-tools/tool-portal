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
  - 追記 2026-05-15 / review follow-up: 公開前の第一印象では未確定の開発中ツール数を前面に出さない方針へ変更。Hero summary は `開発中のツール 7個` ではなく `公開導線 3ステップ` を表示し、Tools 一覧は初期表示を利用可能ツール優先にする。`fan-brand` は現時点で公開ツールを持たないため `planned` suite として扱う。in-app browser で `/`、`/tools`、`/tools?suite=stream-workflow`、`/tools?suite=fan-brand` を `390 / 820 / 1280px` で確認し、console error なし。

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
  - 結果記録 2026-05-15 / `schedule-public-prelaunch-polish`: PR #125 `[codex] Reclassify portal suite tools` が `main` / `origin/main` に merge 済みであることを確認し、`origin/main` 起点の `.worktrees/schedule-public-prelaunch-polish` で実装。Schedule Calendar の初期導線を「予定作成 -> 告知文 -> サムネ -> 分割画像」へ短く寄せ、空状態、投稿補助、backup / restore、input guard、handoff 失敗時 copy を公開前の実用導線として整理した。storage schema、handoff payload、Thumbnail Editor / SNS Split Image Maker 本体は変更していない。
  - contract 更新: `scripts/schedule-calendar-prelaunch-polish-contract.mjs` を追加し、初期導線、投稿補助、backup / restore、input guard、handoff copy と、storage version / handoff TTL / 画像本文を渡さない境界を固定。
  - 検証結果: `node scripts/schedule-calendar-prelaunch-polish-contract.mjs`、`node scripts/schedule-calendar-storage-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`npm run lint`、`npx tsc --noEmit` は通過。`git diff --check` は commit 前に最終実行する。
  - 幅別確認: in-app browser で `/tools/schedule-calendar` を `390 / 820 / 1024 / 1280 / 1366px` で確認。`390 / 820px` はモバイル統合UIとして、空いている時間 / 右下＋から予定追加できる初期導線が見える。`1024px` は右パネル4タブ付きのタブレット2ペイン、`1280 / 1366px` は左ナビ付きPC2ペインとして表示。追加で `1024px` の投稿補助 / 設定 tab、`390px` の設定 tab を確認し、backup copy と handoff copy が読める。console error なし。
  - 残リスク: 実データ入りの長文予定や大量予定での目視確認は未実施。今回の scope は copy / 初期導線 / handoff 周辺の polish に限定し、Google Calendar 連携、ログイン / 同期、シリーズ一括編集、例外日、週間予定画像生成は引き続き freeze 後候補。
  - 次セッション候補: `thumbnail-privacy-whiteboard-preset` を先に進め、Schedule Calendar から渡った予定テキストが Thumbnail Editor の用途別プリセット選択で迷いにくいか確認する。続けて `thumbnail-preset-placement-polish`、その後 `sns-split-public-prelaunch-polish`。

- Thumbnail Editor privacy / whiteboard preset pre-release adjustment
  - 結果記録 2026-05-15 / `thumbnail-privacy-whiteboard-preset`: PR #126 `[codex] Polish schedule prelaunch flow` が `main` / `origin/main` に merge 済みで、`origin/main` が merge commit `7403b6d8d2ace02a87d9e9d8b5b9c1eb4df888f1` を含むことを確認。`origin/main` 起点の `.worktrees/thumbnail-privacy-whiteboard-preset` で実装した。
  - 変更内容: `プライバシー告知` と `ホワイトボード` preset を追加。`プライバシー告知` は `[$imagegen](C:\Users\taka\.codex\skills\.system\imagegen\SKILL.md)` built-in mode で `privacy-redaction-bar-v1.png`、`privacy-mask-panel-v1.png`、`privacy-lock-badge-v1.png` を個別生成し、crop なしの complete object として配置した。`ホワイトボード` は完全 blank utility preset に寄せ、画像 asset やメモカード、立ち絵ガイド、装飾 object は置かず、白板面と handoff 用の `見出し` / `時刻` / `サブ` / `ラベル` text layer だけにした。schema、storage、crop 仕様、font loading、Schedule Calendar 本体、SNS Split Image Maker 本体は変更していない。Schedule Calendar 由来の予定テキストは従来どおり `見出し` / `時刻` / `サブ` / `ラベル` に入る前提で、preset 選択 copy、適用確認 copy、export / SNS分割画像メーカーへの次アクション copy を公開前向けに調整した。
  - contract 更新: `scripts/thumbnail-privacy-whiteboard-preset-contract.mjs` を追加し、2 preset の id / category / usage label / 初期 copy / editable text layer / privacy generated asset 3点の存在と crop なし配置 / whiteboard blank boundary / handoff schema 非変更 / preset 選択 copy を固定。既存 `thumbnail-preset-discovery-contract.mjs`、`thumbnail-preset-variants-contract.mjs`、`thumbnail-preset-batch-readiness-contract.mjs` も新 preset id 前提へ更新した。
  - 検証結果: `node scripts/thumbnail-privacy-whiteboard-preset-contract.mjs`、`node scripts/thumbnail-preset-discovery-contract.mjs`、`node scripts/thumbnail-preset-batch-readiness-contract.mjs`、`node scripts/thumbnail-preset-variants-contract.mjs`、`node scripts/thumbnail-material-assets-contract.mjs`、`node scripts/thumbnail-quality-guard-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`git diff --check` は通過。privacy 個別 asset 3点は RGBA / corner alpha `0` / alpha bbox margin `32px` を確認。
  - 幅別確認: in-app browser で `/tools/thumbnail-editor` を `390 / 820 / 1024 / 1280 / 1366px` で確認。全幅で `プライバシー告知`、`ホワイトボード`、`SNS分割画像へ進む`、`書き出し前の確認` が表示され、console error / warn なし。追加で `1280px` では検索から `プライバシー告知` と blank 化した `ホワイトボード` を実際に適用し、console error / warn なし。個別生成後の再確認では `プライバシー告知` を適用し、`390 / 820 / 1024 / 1280 / 1366px` で表示維持、`1280px` screenshot で目隠しバー / パネル / lock badge の見切れなしを確認。
  - 残リスク: 実際の Schedule Calendar UI からの handoff 操作は今回は contract で確認し、ブラウザーでは Thumbnail Editor 側の表示 / preset 適用に限定。実データ入りの長文予定、立ち絵差し替え後の見え方、SNS Split Image Maker 側での最終分割表示は後続確認余地あり。
  - 次セッション候補: `thumbnail-preset-placement-polish` で既存 preset と usecase preset の default placement を mock と比較して調整する。その後 `sns-split-public-prelaunch-polish` へ進み、Thumbnail Editor から渡った画像をSNS分割画像メーカーで確認する。

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
