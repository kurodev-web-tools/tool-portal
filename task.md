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

1. Thumbnail Editor usecase presets main PR
   - status: draft PR #180 作成済み。base `main`、branch `codex/thumbnail-preset-en-usage-labels`。
   - scope:
     - `goods_notice` / `membership_stream` / `asmr_stream` の 3 preset。
     - generated background / decoration assets。
     - 専用 preset contracts。
     - EN usage label 修正。
     - EN `membership_stream` / `asmr_stream` 初期位置 follow-up。
   - verification completed:
     - `node scripts/thumbnail-usecase-goods-notice-preset-contract.mjs`
     - `node scripts/thumbnail-usecase-membership-stream-preset-contract.mjs`
     - `node scripts/thumbnail-usecase-asmr-stream-preset-contract.mjs`
     - `node scripts/thumbnail-preset-text-locale-contract.mjs`
     - `npm run lint`
     - `npx tsc --noEmit`
     - `git diff --check`
     - `/tools/thumbnail-editor` EN/Dark at `390 / 820 / 1024 / 1280 / 1366px`
   - next action:
     - #180 review / merge 後、この active item は Completed / Archive Summary に落とす。
     - #180 merge 後の次作業は 1:1 IRIAM mock planning から開始する。

2. Thumbnail Editor 1:1 IRIAM preset / material planning
   - status: 次の最優先。まずは実装ではなく 1:1 mock / asset direction の planning PR から開始する。
   - direction:
     - IRIAM 向けは YouTube 16:9 より情報量を少なくする。
     - 完成品サムネより、背景 + title image layer + 汎用ゆる装飾 asset + 最小 text layer の starter kit として設計する。
     - 背景焼き込み文字は避ける。配信タイトルは透過 PNG title image layer として扱う。
     - 時刻や短い一言など、ユーザーが頻繁に変える要素だけ editable text layer に残す。
   - mock phase:
     - まず 5ジャンルの 1:1 完成モックを作る。
     - 初回候補: `歌枠` / `雑談` / `初配信` / `耐久` / `闇ガチャ`。
     - この時点で title image に使う font 方針を決める。
     - 使用 font は Google Fonts などライセンス確認できるものに限定し、font 名と license を task / doc に残す。
   - background asset phase:
     - 見た目 3種 x カラバリ 5種 = 背景 15枚を目標にする。
     - 例: `soft_cloud` / `pop_bubble` / `dark_cute`。
     - カラバリ例: pink / blue / yellow / purple / mint。
     - まず背景のみ確認し、その後 title / decoration に進む。
   - title image asset phase:
     - 5ジャンル x カラバリ 5種 = 25枚を候補にする。
     - ただし font 系統は 1-2 種に絞る。最終的に text layer 用 font 追加が入るため、title image を増やしすぎない。
     - title image は背景に焼き込まず、透明 PNG image layer として配置する。
   - decoration asset phase:
     - 吹き出し、雲、星、ハート、リボン、きらきら、手描きライン、小ラベルを候補にする。
     - 16:9 preset でも使える汎用 asset として library に追加する。
     - 初回は asset 種類と色数を抑え、使われ方を見て第2弾で増やす。
   - preset body phase:
     - 背景 / title / decoration の確認後に preset 化する。
     - 初回 preset 候補: `iriam_square_soft` / `iriam_square_pop` / `iriam_square_dark_cute`。
     - 1 preset / 1 PR に閉じるか、mock / asset / preset body を段階 PR に分ける。
   - out of scope:
     - schema 変更。
     - canvas export 変更。
     - 9:16 preset 実装。
     - font search / recently used UI 変更。
     - 新規ツール実装。
   - suggested first branch/worktree:
     - branch: `codex/thumbnail-iriam-square-mock-plan`
     - worktree: `D:/V_streamer_tools/.worktrees/thumbnail-iriam-square-mock-plan`

3. Thumbnail Editor font / preset typography follow-up
   - status: 1:1 IRIAM mock / first asset direction の後に着手する。
   - direction:
     - 単純な font 追加より、preset / title image / editable text の実需要を見てから増やす。
     - IRIAM title image で使った license-free font を、必要に応じて editable text layer 用にも追加する。
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

1. #180 merge / task cleanup
2. 1:1 IRIAM mock planning
3. 1:1 IRIAM background assets
4. 1:1 IRIAM title image assets
5. 1:1 IRIAM decoration assets
6. 1:1 IRIAM starter presets
7. Font / preset typography follow-up
8. New tool planning: Kuro Live Comment Translator

9:16 presets are still valuable for YouTube Shorts / vertical streams, but should follow after the 1:1 IRIAM workflow proves the square asset / title image pattern.

## Next Session Prompt

次セッションでそのまま使う prompt。

```text
D:/V_streamer_tools で作業してください。

目的:
Thumbnail Editor の 1:1 IRIAM 向け preset / material workflow の最初の planning PR として、5ジャンルの mock 方針と asset production plan を `task.md` / `docs/future` に整理してください。

前提:
- main 直作業は禁止です。
- `git fetch origin --prune` を実行してください。
- #180 merge 後の `origin/main` 起点で branch / worktree を作成してください。
- 推奨 branch: `codex/thumbnail-iriam-square-mock-plan`
- 推奨 worktree: `D:/V_streamer_tools/.worktrees/thumbnail-iriam-square-mock-plan`
- `AGENTS.md` と `task.md` を確認してから作業してください。

実装方針:
- 今回は planning / mock direction のみ。production preset 実装や大量 asset 生成はしない。
- IRIAM 向け 1:1 は、背景 + title transparent image layer + 汎用装飾 asset + 最小 editable text layer の starter kit として設計する。
- 5ジャンル mock 候補は `歌枠` / `雑談` / `初配信` / `耐久` / `闇ガチャ`。
- 背景は見た目 3種 x カラバリ 5種 = 15枚を後続 asset phase の目標にする。
- title image は 5ジャンル x カラバリ 5種を候補にするが、font 系統は 1-2 種に絞る。
- title image に使う font は Google Fonts など license-free で確認できるものに限定し、font 名 / license / use case を記録する。
- 装飾 asset は吹き出し、雲、星、ハート、リボン、きらきら、手描きライン、小ラベルを候補にする。
- 9:16 preset、font expansion、新規ツール実装は out of scope。

検証:
- docs/task のみなら `git diff --check`
- 必要なら `node scripts/thumbnail-preset-text-locale-contract.mjs`

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
  - Previous staged PRs: #178 / #179 and related preset branches are summarized in PR bodies.
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
