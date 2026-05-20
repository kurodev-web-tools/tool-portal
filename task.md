# task.md

このファイルは現在の運用タスクだけを置く。完了済みの詳細ログ、比較メモ、長い経緯は PR 本文か `docs/archive` に寄せる。

## Current Premises

- 作業は `main` 直ではなく feature branch / worktree で行う。
- 意味のある実装後は、このファイルに実装内容、検証、必要な幅別確認を残す。
- UI 変更時の確認幅は `390 / 820 / 1024 / 1280 / 1366px` を基本にする。
- 通常の表示確認と幅別確認では Codex app の in-app browser を優先する。繰り返し操作や機械的な console / canvas 確認は Playwright、原因調査は Chrome DevTools MCP に切り替える。
- URL 設計、大規模 i18n framework、保存 schema / IndexedDB / localStorage 既存 key / handoff payload、外部投稿連携は、個別タスクで明示されない限り変更しない。
- 1 feature / 1 fix / 1 cleanup を 1 branch / 1 PR に閉じる。公開版の緊急修正と次期機能追加は混ぜない。

## Active Priorities

1. Portal shell settings visibility polish
   - status: 実装・検証済み。branch `codex/portal-shell-settings-polish` で確認用に push 予定。
   - user context:
     - PC 表示で各ツールを開いている際、左パネル内のテーマ切り替えが見えない。
     - 左パネル自体にはスクロールを適用しない方針。
     - タブレット表示の左パネル / drawer 内で言語切り替えとテーマ切り替えが見にくい。
     - 将来ログイン機能、コメント翻訳ツール、外部連携設定が増える前提で、設定導線へ寄せる。
   - scope:
     - 各ツール画面の PC / タブレット横表示では、左パネル下部に `Settings` を常時見える位置で置く。
     - `1024 - 1279px` の狭い left rail は歯車アイコン中心の compact button、`1280px+` は `Settings` label 付きにする。
     - Settings 内に `Language` / `Theme` をまとめる。
     - HOME / Tools の header にある言語 / 表示切り替えは当面維持する。英語対応公開直後なので、言語切り替えが見えること自体を English support のサインとして残す。
     - タブレット縦 / `820px` 前後は drawer 下部に Settings block を置き、`Language` / `Theme` を見やすく並べる。
     - `Sign-in planned` は将来ログイン導線として残すが、ツール画面では Settings を押し出さないよう compact 化または配置整理する。
   - out of scope:
     - 設定ページ新設。
     - ログイン実装。
     - 多言語 tips / 初回案内の実装。
     - Thumbnail Editor inline text edit。
   - suggested branch/worktree:
     - branch: `codex/portal-shell-settings-polish`
     - worktree: `D:/V_streamer_tools/.worktrees/portal-shell-settings-polish`
   - verification:
     - `node scripts/portal-tools-copy-locale-contract.mjs`
     - `node scripts/tool-portal-entry-contract.mjs`
     - `npm run lint`
     - `npx tsc --noEmit`
     - `git diff --check`
     - in-app browser で `/`, `/tools`, `/tools/schedule-calendar`, `/tools/thumbnail-editor`, `/tools/sns-split-image-maker` を確認する。
     - width: `390 / 820 / 1024 / 1280 / 1366px`
     - JA / EN、Light / Dark、body/document 横 overflow、header / sidebar / drawer の切替導線を確認する。
   - implementation notes:
     - `PortalSettingsPanel` を追加し、workspace sidebar / drawer の `Language` と `Theme` を `Settings` block に集約した。
     - 各ツール画面の `1024 - 1279px` は左 rail 下部に歯車中心の compact Settings block、`1280px+` は `Settings` label 付き panel を表示する。
     - PC 表示の日本語 Settings で改行が出ないよう、テーマ行の label を `表示テーマ` から `テーマ` に短縮した。
     - HOME / Tools の header 側 `Language` / `Theme` は維持した。
     - workspace sidebar では将来機能 list を隠し、`Sign-in planned` を compact notice にして Settings を押し出さない配置にした。
   - verification results:
     - Passed: `node scripts/portal-tools-copy-locale-contract.mjs`
     - Passed: `node scripts/tool-portal-entry-contract.mjs`
     - Passed: `npm run lint`
     - Passed: `npx tsc --noEmit`
     - Passed: `git diff --check`
     - Width / locale / theme matrix: Chrome DevTools で `/`, `/tools`, `/tools/schedule-calendar`, `/tools/thumbnail-editor`, `/tools/sns-split-image-maker` を `390 / 820 / 1024 / 1280 / 1366px`、JA / EN、Light / Dark で確認。`documentElement.lang`、dark class、header/sidebar/drawer controls、Settings visibility、body/document 横 overflow なしを確認。
     - Visual spot check: `820px` drawer EN/Dark、`1024px` tool rail、`1280px` tool sidebar label 付き Settings を確認。
   - remaining risk:
     - Dev server の Next dev indicator は左下に表示されるが、production UI では出ない。
     - 確認は Chrome DevTools automation 中心。通常の最終目視は確認用 branch 取り込み時に Codex app browser で再確認するとよい。
   - handoff to next candidate:
     - 次候補は `Thumbnail Editor inline text edit`。今回の Portal shell 変更は tool body の schema / canvas / editor state には触れていないため、`codex/thumbnail-inline-text-edit` はこの branch の merge 判断後に独立 worktree で開始する。

2. Thumbnail Editor inline text edit
   - status: Portal shell settings polish 後の公開版 UX 改善候補。
   - user context:
     - テキストレイヤーを選択し、右パネルをスクロールして本文を書き換える流れは手間が大きい。
     - 既存の右パネル編集は維持しつつ、追加操作として canvas preview 上で直接編集できるとよい。
   - scope:
     - text layer をダブルクリック / ダブルタップしたとき、canvas preview 上に textarea overlay を出して直接 `layer.text` を編集できるようにする。
     - blur で確定、Esc でキャンセル、Ctrl/Cmd+Enter で確定を基本にする。
     - text layer 以外は既存どおり layer selection / panel open に寄せる。
     - locked / hidden layer は直接編集対象外。
     - 既存の右パネル `TextControls` は維持する。
   - out of scope:
     - rich text。
     - layer schema 変更。
     - canvas rendering pipeline の大幅変更。
     - preset body / font / export 変更。
   - suggested branch/worktree:
     - branch: `codex/thumbnail-inline-text-edit`
     - worktree: `D:/V_streamer_tools/.worktrees/thumbnail-inline-text-edit`
   - verification:
     - Thumbnail Editor 関連 contract。必要なら inline edit 用 contract / browser smoke を追加する。
     - `node scripts/thumbnail-preset-text-locale-contract.mjs`
     - `npm run lint`
     - `npx tsc --noEmit`
     - `git diff --check`
     - `/tools/thumbnail-editor` の `390 / 820 / 1024 / 1280 / 1366px` で、text layer direct edit、既存右パネル編集、drag / resize / selection、JA / EN、横 overflow を確認する。

3. Thumbnail Editor `goods_notice` preset
   - status: 公開版 polish 後の次期機能候補。
   - reason: 英語対応公開後の追加価値として分かりやすく、既存 `イベント告知` / `歌ってみた告知` と用途が重なりにくい。
   - scope:
     - `goods_notice` 1 preset の body、必要 production asset、専用 contract、既存 thumbnail preset contracts。
     - product card、price / release badge、注意書き panel を中心に、物販 / BOOTH / digital goods 告知向けにする。
   - out of scope:
     - schema、canvas export、font loading helper、font search / recently used UI、Schedule Calendar、SNS Split Image Maker。
   - suggested branch/worktree:
     - branch: `codex/thumbnail-goods-notice-preset`
     - worktree: `D:/V_streamer_tools/.worktrees/thumbnail-goods-notice-preset`
   - verification:
     - `node scripts/thumbnail-preset-text-locale-contract.mjs`
     - thumbnail preset / material asset 系の変更対象 contract。
     - `npm run lint`
     - `npx tsc --noEmit`
     - `git diff --check`
     - `/tools/thumbnail-editor` の JA / EN、preset card CTA、canvas nonblank、横 overflow。

4. Kuro Live Comment Translator planning
   - status: 新規ツール候補。すぐ実装せず、まず repo 内 future plan に落とす。
   - seed: `C:/Users/taka/Downloads/COMMENT_TRANSLATION_TOOL_PLAN.md`
   - recommended first scope:
     - OBS Browser Dock 前提の read-only MVP。
     - 1 platform から開始。
     - owner-only / OAuth / rate limit / quota / moderation を前提にする。
     - コメント翻訳、短い要約、用語集を中心にし、返信生成や自動投稿は初期 scope に入れない。
   - suggested branch/worktree:
     - branch: `codex/comment-translator-planning`
     - worktree: `D:/V_streamer_tools/.worktrees/comment-translator-planning`
   - next action:
     - 添付 plan を repo 向けに要約し、`docs/future` に保存するかを判断する。

5. Thumbnail Editor font / preset typography follow-up
   - status: 後続候補。優先度は公開版 polish と `goods_notice` より下。
   - current direction:
     - 単純な font 追加より、preset ごとの font application、weight-aware UI、必要なら不足 font の小規模追加を優先する。
     - language / mood category、font search、recently used は既に主要導線が入っているため、別 scope と混ぜない。
   - out of scope:
     - preset body 実装、schema、export、material asset 追加との同時実装。

## Thumbnail Editor Preset Candidate Order

公開後の preset 追加は、用途差が大きいものから 1 preset / 1 PR で進める。

1. `goods_notice` - グッズ告知 / merch release
2. `membership_stream` - メン限配信 / members only
3. `asmr_stream` - ASMR 配信 / relax night
4. `relay_stream` - リレー配信 / stream relay
5. `collab_recruit_notice` - コラボ募集 / collab call

Reference: `docs/future/THUMBNAIL_EDITOR_USECASE_PRESET_CANDIDATES.md`

## Next Session Prompt

次セッションでそのまま使う prompt。

```text
D:/V_streamer_tools で作業してください。

目的:
公開版 polish の PR1 として、Portal shell の settings 導線を整理してください。

前提:
- main 直作業は禁止です。
- `git fetch origin --prune` 後、`origin/main` 起点で branch / worktree を作成してください。
- 推奨 branch: `codex/portal-shell-settings-polish`
- 推奨 worktree: `D:/V_streamer_tools/.worktrees/portal-shell-settings-polish`
- `AGENTS.md` と `task.md` を確認してから実装してください。

実装方針:
- HOME / Tools の header にある言語切り替えと表示切り替えは当面残してください。
- 各ツール画面の PC / タブレット横表示では、左パネル下部に `Settings` を常時見える位置で設置してください。
- `1024 - 1279px` の狭い left rail は歯車アイコン中心の compact button、`1280px+` は `Settings` label 付きにしてください。
- Settings 内に `Language` / `Theme` をまとめてください。
- 左パネル自体にはスクロールを適用しないでください。
- タブレット縦 / `820px` 前後では drawer 下部に Settings block を置き、`Language` / `Theme` を見やすくしてください。
- `Sign-in planned` は将来ログイン導線として残しつつ、ツール画面では Settings を押し出さないよう compact 化または配置整理してください。

Out of scope:
- 設定ページ新設。
- ログイン実装。
- 多言語 tips / 初回案内の実装。
- Thumbnail Editor inline text edit。

確認:
- JA / EN 両方。
- Light / Dark 両方。
- `/`
- `/tools`
- `/tools/schedule-calendar`
- `/tools/thumbnail-editor`
- `/tools/sns-split-image-maker`
- width: `390 / 820 / 1024 / 1280 / 1366px`
- header / sidebar / drawer の言語・テーマ・Settings 導線が見やすいこと。
- body/document 横 overflow がないこと。

検証:
- node scripts/portal-tools-copy-locale-contract.mjs
- node scripts/tool-portal-entry-contract.mjs
- npm run lint
- npx tsc --noEmit
- git diff --check

完了時:
- `task.md` に実装内容、確認結果、残リスク、次候補の Thumbnail Editor inline text edit への引き継ぎを追記してください。
- 問題なければ commit まで行ってください。push / PR は指示があるまで行わないでください。
```

## Backlog

- Schedule Calendar:
  - Google Calendar 連携。
  - ログイン / サーバー同期。
  - シリーズ一括編集、例外日。
  - 週間予定画像そのものの生成。
- Thumbnail Editor:
  - 新規 usecase preset。
  - crop 仕様。
  - text / image layer schema。
  - public asset / font follow-up。
  - preset typography refinement。
- SNS Split Image Maker:
  - ZIP 出力。
  - X 以外の比率。
  - 複数形式の大規模 export。
  - 重い onboarding。
- EN / locale:
  - 細かい内部説明、debug 文、保存済みデータ本文、網羅的 aria 全面翻訳。
  - Next metadata の動的 locale 切替。
- New tools:
  - Kuro Live Comment Translator planning。

## Verification Baseline

docs / contract 変更時は、必要に応じて次を実行する。

- `node scripts/static-export-rsc-aliases.mjs --check`
- `node scripts/tool-portal-entry-contract.mjs`
- `node scripts/tool-handoff-contract.mjs`
- `node scripts/thumbnail-material-assets-contract.mjs`
- `node scripts/thumbnail-quality-guard-contract.mjs`
- `node scripts/thumbnail-standee-placement-contract.mjs`
- `node scripts/thumbnail-preset-text-locale-contract.mjs`
- `node scripts/sns-split-image-maker-contract.mjs`
- `node scripts/portal-tools-copy-locale-contract.mjs`
- `npm run lint`
- `npx tsc --noEmit`
- `git diff --check`

UI / 表示文言を触った場合のみ、幅別確認結果をこのファイルに残す。

## Completed / Archive Summary

- EN support:
  - PR #154 - #171 で EN support preview から main 向け final integration check まで完了。
  - main merge: 2026-05-20, merge commit `270b81f`.
  - completed details are kept in PR bodies and archive docs, not repeated here.
- 2026-04 の履歴: `docs/archive/TASK_HISTORY_2026-04.md`
- 2026-05 の履歴: `docs/archive/TASK_HISTORY_2026-05.md`
- Schedule Calendar future tasks: `docs/future/SCHEDULE_CALENDAR_FUTURE_TASKS.md`
- Portal settings future direction: `docs/future/PORTAL_SETTINGS_FUTURE.md`
- Thumbnail Editor next PR scope: `docs/future/THUMBNAIL_EDITOR_NEXT_PR_SCOPE.md`
- Thumbnail Editor usecase preset candidates: `docs/future/THUMBNAIL_EDITOR_USECASE_PRESET_CANDIDATES.md`
- Thumbnail Editor font candidates: `docs/future/THUMBNAIL_EDITOR_FONT_CANDIDATES.md`
