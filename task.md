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

1. Thumbnail Editor 1:1 IRIAM preset / material planning
   - status: planning PR #182 の上に `codex/thumbnail-iriam-square-mocks` を積み、5ジャンルの direction mock を作成中。production preset、asset registration、UI、schema は触らない。
   - planning doc: `docs/future/THUMBNAIL_EDITOR_IRIAM_SQUARE_MOCK_PLAN.md`
   - implementation summary:
     - 1:1 IRIAM は `background image + title transparent image layer + generic decoration asset + minimal editable text layer` の starter kit として扱う。
     - 5ジャンルは `歌枠` / `雑談` / `初配信` / `耐久` / `闇ガチャ`。
     - 背景は `soft_cloud` / `pop_bubble` / `dark_cute` x `pink` / `blue` / `yellow` / `purple` / `mint` = 15枚を後続 production target にする。
     - title image は 5ジャンル x 5色 = 25枚を候補にし、font 系統は `M PLUS Rounded 1c` と `Noto Serif JP` に抑える。
     - font license は既存 bundled font note と同じ `SIL Open Font License 1.1` を前提に記録し、Google Fonts CDN / CSP / font expansion は変更しない。
     - 装飾 asset は吹き出し、雲、星、ハート、リボン、きらきら、手描きライン、小ラベルから小さく始める。
     - 2026-05-21: `imagegen` built-in mode で 5種 mock を生成し、review 用に正確な日本語 title overlay を加えた project-local copy を `docs/mockups/thumbnail-editor-iriam-square-mocks/` に保存。
   - generated mock paths:
     - `docs/mockups/thumbnail-editor-iriam-square-mocks/iriam-square-karaoke-mock.png`
     - `docs/mockups/thumbnail-editor-iriam-square-mocks/iriam-square-chat-mock.png`
     - `docs/mockups/thumbnail-editor-iriam-square-mocks/iriam-square-first-stream-mock.png`
     - `docs/mockups/thumbnail-editor-iriam-square-mocks/iriam-square-endurance-mock.png`
     - `docs/mockups/thumbnail-editor-iriam-square-mocks/iriam-square-dark-gacha-mock.png`
   - verification for this PR:
     - 2026-05-21: `git diff --check` passed. Output included the existing LF/CRLF normalization warning for `task.md` only.
     - 2026-05-21 mock branch: `git diff --check` passed. Output included LF/CRLF normalization warnings for `task.md` and `docs/future/THUMBNAIL_EDITOR_IRIAM_SQUARE_MOCK_PLAN.md` only.
     - UI / asset / preset body を触らないため幅別 browser 確認は不要。
   - remaining risks:
     - 生成元 mock の日本語 title glyph は崩れやすいため、現在の overlay は review 用。後続 title image phase では transparent PNG title を作り直す。
     - 実際の生成 asset で title image の縁取り、影、背景との contrast を再確認する必要がある。
     - `耐久` title は `M PLUS Rounded 1c` で勢いが不足する可能性があるため、後続 title image phase で必要なら `M PLUS 1p` 追加候補を判断する。
     - 25 title image を一度に入れるとレビューが重くなるため、生成・採用は genre / color を絞って確認してから増やす。
   - next handoff:
     - mock 確認後は background asset phase。まず 15枚の文字なし背景を生成 / 選別し、title / decoration / preset body には進まない。

2. Thumbnail Editor 1:1 IRIAM background asset phase
   - status: 次候補。planning PR merge 後に開始する。
   - target:
     - `soft_cloud` / `pop_bubble` / `dark_cute` x `pink` / `blue` / `yellow` / `purple` / `mint` = 15 background PNG。
     - 1080 x 1080、文字なし、title image と editable text を重ねる余白あり。
     - production asset path / naming / contract は実装 PR で確定する。
   - out of scope:
     - title image asset。
     - decoration asset。
     - preset body。
     - 9:16 preset。
     - font expansion / font UI。

3. Thumbnail Editor title image / decoration asset phases
   - status: background asset 確認後に分割して着手する。
   - title image:
     - 5ジャンル x 5色 = 25 transparent PNG 候補。
     - font 系統は `M PLUS Rounded 1c` / `Noto Serif JP` を基本にし、必要時だけ追加候補を検討する。
   - decoration:
     - 吹き出し、雲、星、ハート、リボン、きらきら、手描きライン、小ラベル。
     - 16:9 preset にも流用できる generic material として登録する。
   - out of scope:
     - starter preset body との同時実装。
     - schema / canvas export / handoff payload 変更。

4. Thumbnail Editor font / preset typography follow-up
   - status: 1:1 IRIAM mock / first asset direction の後に着手する。
   - direction:
     - 単純な font 追加より、preset / title image / editable text の実需要を見てから増やす。
     - IRIAM title image で使った license-free font を、必要に応じて editable text layer 用にも追加する。
     - language / mood category、font search、recently used は既に主要導線が入っているため、大きな UI 改修と混ぜない。
   - out of scope:
     - 1:1 preset body 実装との同時実装。
     - material asset 大量追加との同時実装。

5. Kuro Live Comment Translator planning
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

1. 1:1 IRIAM mock planning docs PR
2. 1:1 IRIAM background assets
3. 1:1 IRIAM title image assets
4. 1:1 IRIAM decoration assets
5. 1:1 IRIAM starter presets
6. Font / preset typography follow-up
7. New tool planning: Kuro Live Comment Translator

9:16 presets are still valuable for YouTube Shorts / vertical streams, but should follow after the 1:1 IRIAM workflow proves the square asset / title image pattern.

## Next Session Prompt

次セッションでそのまま使う prompt。

```text
D:/V_streamer_tools で作業してください。

目的:
Thumbnail Editor の 1:1 IRIAM 向け preset / material workflow の次 PR として、文字なし background asset phase を進めてください。

前提:
- main 直作業は禁止です。
- `git fetch origin --prune` を実行してください。
- `codex/thumbnail-iriam-square-mock-plan` の planning PR が merge 済みであることを確認し、merge 後の `origin/main` 起点で branch / worktree を作成してください。
- 推奨 branch: `codex/thumbnail-iriam-square-background-assets`
- 推奨 worktree: `D:/V_streamer_tools/.worktrees/thumbnail-iriam-square-background-assets`
- `AGENTS.md`、`task.md`、`docs/future/THUMBNAIL_EDITOR_IRIAM_SQUARE_MOCK_PLAN.md` を確認してから作業してください。

実装方針:
- 1080 x 1080 の文字なし background PNG を生成 / 選別してください。
- 対象は `soft_cloud` / `pop_bubble` / `dark_cute` x `pink` / `blue` / `yellow` / `purple` / `mint` = 15枚。
- 背景にはジャンル名、時刻、ロゴ、固定テキストを焼き込まないでください。
- title transparent image、decoration asset、preset body はこの PR では実装しないでください。
- asset naming / path / registration / contract は既存 Thumbnail Editor material patterns に合わせて最小限で追加してください。
- 9:16 preset、font expansion、新規ツール実装は out of scope。

検証:
- 追加した asset / registration に対応する最小 contract
- `git diff --check`
- 必要なら `node scripts/thumbnail-material-assets-contract.mjs`

完了時:
- `task.md` に実装内容、確認結果、残リスク、次候補への引き継ぎを追記してください。
- 問題なければ commit まで行ってください。push / PR は指示があるまで行わないでください。
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
- Thumbnail Editor 1:1 IRIAM planning:
  - Current planning doc: `docs/future/THUMBNAIL_EDITOR_IRIAM_SQUARE_MOCK_PLAN.md`
  - Planning PR scope: 5 genre mock direction, layer model, background / title / decoration asset production plan, title image font / license boundary.
  - Mock branch scope: 5 direction mock images under `docs/mockups/thumbnail-editor-iriam-square-mocks/`.
- Portal / public prelaunch:
  - Portal settings visibility polish, Thumbnail Editor inline text edit, and EN support are completed or tracked by their PR bodies.
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
- Thumbnail Editor IRIAM square mock plan: `docs/future/THUMBNAIL_EDITOR_IRIAM_SQUARE_MOCK_PLAN.md`
