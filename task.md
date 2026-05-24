# task.md

このファイルは現在の運用タスクだけを置く。完了済みの詳細ログ、比較メモ、長い経緯は PR 本文か `docs/archive` に寄せる。

## Current Premises

- 作業は `main` 直ではなく feature branch / worktree で行う。
- 意味のある実装後は、このファイルに実装内容、検証、必要な幅別確認を残す。
- UI 変更時の確認幅は `390 / 820 / 1024 / 1280 / 1366px` を基本にする。
- 通常の表示確認と幅別確認では Codex app の in-app browser を優先する。繰り返し操作や機械的な console / canvas 確認は Playwright、原因調査は Chrome DevTools MCP に切り替える。
- URL 設計、大規模 i18n framework、保存 schema / IndexedDB / localStorage 既存 key / handoff payload、外部投稿連携は、個別タスクで明示されない限り変更しない。
- 1 feature / 1 fix / 1 cleanup を 1 branch / 1 PR に閉じる。公開版の緊急修正と次期機能追加は混ぜない。

## Current Work Log

### 2026-05-24 - Thumbnail Editor 1:1 IRIAM square background swap panel

- base check:
  - `git fetch origin --prune` 済み。
  - PR #201 (`codex/thumbnail-iriam-square-task-cleanup` -> `codex/thumbnail-iriam-square-preview`) は `MERGED`。merge commit `d95dfaa4dc82512a6fb606ee7dd01bfe23bdd233`。
  - 新規 branch / worktree: `codex/thumbnail-iriam-square-bg-swap`, `D:/V_streamer_tools/.worktrees/thumbnail-iriam-square-bg-swap`。
- implementation:
  - IRIAM square background registry alias と swap rule helper を `lib/thumbnail-editor.ts` に追加。
  - 選択中 layer が IRIAM square background かどうかは layer name ではなく registry `src` で判定。
  - `PropertyPanel` に `square-1-1` かつ選択中 layer が IRIAM square background の場合だけ出る小さな背景差し替え UI を追加。
  - 背景差し替えは selected image layer の `src` のみ変更し、`x` / `y` / `width` / `height` / `locked` / `opacity` などは維持。
  - `歌枠` は `soft_cloud` / `pop_bubble` / `dark_cute` と colorway を変更可能。
  - `闇ガチャ` は `dark_cute` 固定、`雑談` / `耐久` は `pop_bubble` 固定、`初配信` は `soft_cloud` 固定で colorway のみ変更可能。
- RED / GREEN:
  - RED: `node scripts/thumbnail-iriam-square-background-swap-contract.mjs` が `shared IRIAM square background registry is exported` で失敗。
  - GREEN: helper / UI 実装後、同 contract が PASS。
- verification:
  - PASS: `node scripts/thumbnail-iriam-square-background-swap-contract.mjs`
  - PASS: `node scripts/thumbnail-preset-text-locale-contract.mjs`
  - PASS: `npx tsc --noEmit`
  - PASS: `npm run lint`
  - PASS: `git diff --check`（Windows 改行 warning のみ）
- width verification:
  - dev server: `npm run dev -- --webpack -p 3004`
  - 390px: `square-1-1` + selected IRIAM background で UI 表示、`dark_cute` / `mint` への src 差し替え確認、16:9 では非表示、canvas `1080 x 1080`、horizontal overflow `0`。
  - 820px: `square-1-1` + selected IRIAM background で UI 表示、`dark_cute` / `mint` への src 差し替え確認、16:9 では非表示、canvas `1080 x 1080`、horizontal overflow `0`。
  - 1024px: `square-1-1` + selected IRIAM background で UI 表示、`dark_cute` / `mint` への src 差し替え確認、16:9 では非表示、canvas `1080 x 1080`、horizontal overflow `0`。
  - 1280px: `square-1-1` + selected IRIAM background で UI 表示、`dark_cute` / `mint` への src 差し替え確認、16:9 では非表示、canvas `1080 x 1080`、horizontal overflow `0`。
  - 1366px: `square-1-1` + selected IRIAM background で UI 表示、`dark_cute` / `mint` への src 差し替え確認、16:9 では非表示、canvas `1080 x 1080`、horizontal overflow `0`。
- remaining risk:
  - title transparent image layer の差し替え UI は未実装。
  - decoration asset / layer 差し替え UI は未実装。
  - schema、9:16 preset、新規 font、追加 title image 生成、preset settings modal 拡張は引き続き out of scope。
- next action:
  - この PR の review / merge 後、次の最小 slice は title transparent image layer の差し替え UI を contract-first で検討する。

### 2026-05-24 - Thumbnail Editor 1:1 IRIAM square preset task board cleanup

- base check:
  - `git fetch origin --prune` 済み。
  - PR #200 (`codex/thumbnail-iriam-endurance-square-modal` -> `codex/thumbnail-iriam-square-preview`) は `MERGED`。merge commit `557d9532c8a9a21c1a4188c52039cc86e9550f11`。
  - 新規 branch / worktree: `codex/thumbnail-iriam-square-task-cleanup`, `D:/V_streamer_tools/.worktrees/thumbnail-iriam-square-task-cleanup`。
- selected slice:
  - 今回は実装追加ではなく、PR #200 merge 後の `task.md` cleanup に閉じる。
  - `schema`、右パネル UI、9:16 preset、新規 font、追加 title image 生成、追加 body / modal 実装は未変更。
- repo-local audit summary:
  - `origin/codex/thumbnail-iriam-square-preview` は PR #193 - #200 を取り込み済み。
  - `歌枠` / `闇ガチャ` / `雑談` / `初配信` / `耐久` は `square-1-1` preset body 接続済み。
  - 同 5ジャンルは IRIAM square settings modal 接続済み。
  - `lib/thumbnail-editor.ts` は 5ジャンルの square draft helper と title asset registry を持つ。
  - `components/thumbnail-editor/ThumbnailEditorApp.tsx` は 5ジャンルを `square-1-1` の selectable preset と modal preset id に含める。
  - `scripts/thumbnail-iriam-*-square-preset-contract.mjs` と `scripts/thumbnail-iriam-square-title-asset-boundary-contract.mjs` が現行 contract の確認点。
- verification:
  - PASS: `git diff --check`（whitespace error なし。Windows 改行 warning のみ）
- remaining risk:
  - 右パネルでの background / title / decoration 後付け変更 UI は未実装。
  - decoration asset phase は未着手。
  - 9:16 preset と schema 変更は引き続き out of scope。
  - 今回は docs/task cleanup のみのため幅別 UI 確認は不要。
- next action:
  - 次の最小 slice は「右パネル UI に進む前の scope / contract planning」。実 UI には入らず、変更対象、contract、幅別確認観点、out of scope を先に固定する。

## Active Priorities

1. Thumbnail Editor 1:1 IRIAM square preset / modal follow-up
   - status: PR #200 merge 後、初回 5ジャンルの square preset body と settings modal は接続済み。今回の background swap panel で、`square-1-1` 表示時の selected IRIAM background image layer だけを右パネルから差し替え可能にした。
   - connected genres:
     - `歌枠` / `karaoke`: body + modal。background style は modal で `soft_cloud` / `pop_bubble` / `dark_cute` を選択可能。
     - `闇ガチャ` / `dark_gacha`: body + modal。background style は `dark_cute` 固定。
     - `雑談` / `chatting`: body + modal。background style は `pop_bubble` 固定。
     - `初配信` / `first_stream`: body + modal。background style は `soft_cloud` 固定。
     - `耐久` / `endurance_stream`: body + modal。background style は `pop_bubble` 固定。
   - fixed boundaries:
     - 1:1 IRIAM title image は背景に焼き込まず、透明 PNG image layer として扱う。
     - 新規 font は追加しない。
     - `schema`、9:16 preset、追加 title image 生成、preset settings modal 拡張は触らない。
   - current contract commands:
     - `node scripts/thumbnail-iriam-square-background-swap-contract.mjs`
     - `node scripts/thumbnail-iriam-karaoke-square-preset-contract.mjs`
     - `node scripts/thumbnail-iriam-dark-gacha-square-preset-contract.mjs`
     - `node scripts/thumbnail-iriam-chatting-square-preset-contract.mjs`
     - `node scripts/thumbnail-iriam-first-stream-square-preset-contract.mjs`
     - `node scripts/thumbnail-iriam-endurance-square-preset-contract.mjs`
     - `node scripts/thumbnail-iriam-square-title-asset-boundary-contract.mjs`
     - `node scripts/thumbnail-preset-text-locale-contract.mjs`
   - next recommended slice:
     - title transparent image layer の差し替え UI を contract-first で検討する。
     - background swap と同じく、layer name ではなく asset registry / `src` ベースで判定する。

2. Thumbnail Editor 1:1 IRIAM decoration asset phase
   - status: square preset body / modal 完了後の候補。右パネル planning と同時に進めない。
   - direction:
     - 吹き出し、雲、星、ハート、リボン、きらきら、手描きライン、小ラベルを候補にする。
     - 16:9 preset にも流用できる generic material として登録する。
   - out of scope:
     - right panel UI 実装との同時実装。
     - schema / canvas export / handoff payload 変更。

3. Thumbnail Editor font / preset typography follow-up
   - status: IRIAM square の preset / title image 実需要を見てから戻る。
   - direction:
     - 単純な font 追加より、preset / title image / editable text の実需要を見てから増やす。
     - language / mood category、font search、recently used は既に主要導線が入っているため、大きな UI 改修と混ぜない。
   - out of scope:
     - 1:1 preset body 実装との同時実装。
     - material asset 大量追加との同時実装。

4. Kuro Live Comment Translator planning
   - status: 新規ツール候補。1:1 preset と font follow-up の後に planning へ戻る。
   - seed: `C:/Users/taka/Downloads/COMMENT_TRANSLATION_TOOL_PLAN.md`
   - recommended first scope:
     - OBS Browser Dock 前提の read-only MVP。
     - 1 platform から開始。
     - owner-only / OAuth / rate limit / quota / moderation を前提にする。
     - コメント翻訳、短い要約、用語集を中心にし、返信生成や自動投稿は初期 scope に入れない。
   - suggested branch/worktree:
     - branch: `codex/comment-translator-planning`
     - worktree: `D:/V_streamer_tools/.worktrees/comment-translator-planning`

## Recommended Roadmap

1. 1:1 IRIAM square preset / modal task board cleanup
2. Right panel background replacement UI
3. Right panel title replacement UI, if the background swap PR is merged
4. 1:1 IRIAM decoration assets
5. Font / preset typography follow-up
6. New tool planning: Kuro Live Comment Translator

9:16 presets are still valuable for YouTube Shorts / vertical streams, but should follow after the 1:1 IRIAM workflow proves the square asset / title image pattern.

## Next Session Prompt

次セッションでそのまま使う prompt。

```text
D:/V_streamer_tools で作業してください。

目的:
Thumbnail Editor 1:1 IRIAM square preset follow-up として、右パネルで IRIAM square の title transparent image layer だけを差し替えできる最小 UI の scope / contract を整理してください。

前提:
- main 直作業は禁止です。
- まず `git fetch origin --prune` を実行してください。
- AGENTS.md と task.md を確認してください。
- 直前の background swap PR / branch `codex/thumbnail-iriam-square-bg-swap` の merge 状態を確認してください。
- 未 merge の場合は、新規実装へ進まず blocker summary を返してください。
- merge 済みなら、`codex/thumbnail-iriam-square-preview` を base に新規 feature branch / worktree を切ってください。

ここまでの状態:
- `歌枠` / `闇ガチャ` / `雑談` / `初配信` / `耐久` は square preset body 接続済み。
- 同 5ジャンルは square settings modal 対応済み。
- 1:1 IRIAM title image は背景に焼き込まず透明 PNG image layer 用として扱う。
- 新規フォント追加はしない。
- `闇ガチャ` background style は `dark_cute` 固定。
- `雑談` / `耐久` background style は `pop_bubble` 固定。
- `初配信` background style は `soft_cloud` 固定。
- 右パネルの background swap UI は実装済み。
- schema、9:16 preset、追加 title image 生成は触らない。

今回の scope:
- まず helper / contract を先に作り、選択中 layer が IRIAM square title image かを asset registry / src ベースで判定する。
- layer name だけに依存しない。
- background swap UI と同じく、`square-1-1` かつ selected title image layer の場合だけ右パネルに出す前提で scope を固定する。
- 実装に進む場合も selected layer の `src` だけ差し替え、geometry / locked / opacity は維持する。

Out of scope:
- schema 変更。
- 9:16 preset。
- 新規 font 追加。
- 追加 title image 生成。
- decoration asset 実装。
- background swap UI の再設計。
- 複数 slice の同時実装。

検証:
- まず RED として追加 contract が実装前に失敗することを確認。
- 該当 contract script。
- `node scripts/thumbnail-preset-text-locale-contract.mjs`
- `npx tsc --noEmit`
- `npm run lint`
- `git diff --check`
- UI を触る場合は `390 / 820 / 1024 / 1280 / 1366px` の幅別確認を `task.md` に残す。

完了時:
- `task.md` に実装内容、確認結果、残リスク、次アクションを追記してください。
- 実装がある場合は変更範囲と検証結果を確認してから commit / push / draft PR 作成まで行ってください。
```

## Backlog

- Thumbnail Editor:
  - 1:1 IRIAM preset / material workflow。
  - 9:16 preset for YouTube Shorts / vertical streams。
  - crop 仕様。
  - text / image layer schema。
  - public asset / font follow-up。
  - preset typography refinement。
- Schedule Calendar:
  - Google Calendar 連携。
  - ログイン / サーバー同期。
  - シリーズ一括編集、例外日。
  - 週間予定画像そのものの生成。
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

- Thumbnail Editor usecase presets:
  - PR #180: `goods_notice` / `membership_stream` / `asmr_stream` plus EN usage label and initial placement follow-ups.
  - PR #181: IRIAM square roadmap refresh after #180.
  - Previous staged PRs: #178 / #179 and related preset branches are summarized in PR bodies.
- Thumbnail Editor 1:1 IRIAM planning / assets:
  - Current planning doc: `docs/future/THUMBNAIL_EDITOR_IRIAM_SQUARE_MOCK_PLAN.md`
  - Planning PR scope: 5 genre mock direction, layer model, background / title / decoration asset production plan, title image font / license boundary.
  - Mock branch scope: 5 direction mock images under `docs/mockups/thumbnail-editor-iriam-square-mocks/`.
  - Standee layout mock scope: 5 bust-up placeholder layouts under `docs/mockups/thumbnail-editor-iriam-square-standee-layouts/`.
  - Background / title production asset details are kept in PR bodies and the future planning doc.
- Thumbnail Editor 1:1 IRIAM square starter presets:
  - PR #193 - #200 connected `歌枠` / `闇ガチャ` / `雑談` / `初配信` / `耐久` to square preset body and settings modal.
  - Detailed width checks and contract evidence are kept in the individual PR bodies.
- Portal / public prelaunch:
  - Portal settings visibility polish, Thumbnail Editor inline text edit, and EN support are completed or tracked by their PR bodies.
- EN support:
  - PR #154 - #171 で EN support preview から main 向け final integration check まで完了。
  - main merge: 2026-05-20, merge commit `270b81f`。
  - completed details are kept in PR bodies and archive docs, not repeated here.
- 2026-04 の履歴: `docs/archive/TASK_HISTORY_2026-04.md`
- 2026-05 の履歴: `docs/archive/TASK_HISTORY_2026-05.md`
- Schedule Calendar future tasks: `docs/future/SCHEDULE_CALENDAR_FUTURE_TASKS.md`
- Portal settings future direction: `docs/future/PORTAL_SETTINGS_FUTURE.md`
- Thumbnail Editor next PR scope: `docs/future/THUMBNAIL_EDITOR_NEXT_PR_SCOPE.md`
- Thumbnail Editor usecase preset candidates: `docs/future/THUMBNAIL_EDITOR_USECASE_PRESET_CANDIDATES.md`
- Thumbnail Editor font candidates: `docs/future/THUMBNAIL_EDITOR_FONT_CANDIDATES.md`
- Thumbnail Editor IRIAM square mock plan: `docs/future/THUMBNAIL_EDITOR_IRIAM_SQUARE_MOCK_PLAN.md`
