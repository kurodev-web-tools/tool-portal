# task.md

このファイルは現在の運用タスクだけを置く。完了済みの詳細ログ、比較メモ、長い経緯は PR 本文か `docs/archive` に寄せる。

## Current Premises

- 作業は `main` 直ではなく feature branch / worktree で行う。
- IRIAM 1:1 系は `codex/thumbnail-iriam-square-preview` を統合 base として扱い、全 slice 完了後に `main` へ結合する。
- 意味のある実装後は、このファイルに実装内容、検証、必要な幅別確認を残す。
- UI 変更時の確認幅は `390 / 820 / 1024 / 1280 / 1366px` を基本にする。
- 通常の表示確認と幅別確認では Codex app の in-app browser を優先する。繰り返し操作や機械的な console / canvas 確認は Playwright、原因調査は Chrome DevTools MCP に切り替える。
- URL 設計、大規模 i18n framework、保存 schema / IndexedDB / localStorage 既存 key / handoff payload、外部投稿連携は、個別タスクで明示されない限り変更しない。
- 1 feature / 1 fix / 1 cleanup を 1 branch / 1 PR に閉じる。公開版の緊急修正と次期機能追加は混ぜない。

## Active Priorities

1. Thumbnail Editor registered material library expansion for IRIAM / cross-aspect use
   - status: PR #213 merge 済み。main merge 前に、登録済み素材へ追加したい装飾素材を Batch A-C として整理し、実装順を固定する。
   - base:
     - `origin/codex/thumbnail-iriam-square-preview`
     - latest integrated PR: #213 `[codex] Finalize IRIAM square preview confirmation`
   - planning doc:
     - `docs/future/THUMBNAIL_EDITOR_IRIAM_SQUARE_DECORATION_MATERIAL_CONTRACT.md`
   - goal:
     - 16:9 / 1:1 の両方で使える project-bound registered material を増やす。
     - A preset の装飾を B preset でも使えるよう、既存 preset 内の良い装飾を素材ライブラリへ出す。
     - `dark_gacha` などに合う dark / horror 系と、性別を問わず使える小物系も登録候補に入れる。
   - Batch A: existing preset decoration registration
     - 既存 preset で使われているが `thumbnailMaterialLibrary` にない装飾を、登録済み素材として再利用可能にする。
     - 新規生成は不要。`public/assets/images/thumbnail-editor/decorations/phase5/` など既存 asset を参照する。
     - 候補:
       - label / badge / panel: ラベル土台、時刻バッジ、CTA / note panel、商品カード、premiere badge。
       - frame / corner: 立ち絵枠発光、HUD角、金角飾り、key visual frame、cover art frame。
       - accent / effect: きらめき、glint、音符、三角 burst、soft glow dots、connection accent。
       - divider / line: progress divider、map-line divider、soundwave、table accent。
       - small icon / prop: clock icon、lock badge、member badge、mic silhouette、lightning / chevron。
     - 101件前後の未登録 preset decoration があるため、全量を一度に登録するより、汎用性の高いものから PR を分ける。
   - Batch B: dark / horror / smoke materials
     - `dark_gacha` や暗めの告知に足せる黒いスモッグ、煙、影、暗い縁取りを新規生成する。
     - 候補:
       - black smoke wash: 背景へ薄く重ねる暗い煙。
       - smoky edge frame: 画面端を囲う黒い煙フレーム。
       - shadow corner fog: 角だけに足す暗いもや。
       - ink drip accent: 端やタイトル周辺に置く黒い滴り。
       - dark sparkle dust: 黒紫の細かい粒子。
     - category は用途に応じて `frame` / `accent` / `corner` に寄せる。新カテゴリは作らない。
   - Batch C: neutral prop materials
     - 男女問わず使える小物系の registered material を新規生成する。
     - 候補:
       - chandelier: 画面上部や角に置ける小さなシャンデリア。
       - antique key: 告知や企画に使いやすい鍵。
       - pocket watch: 時刻 / 耐久 / 告知に使える懐中時計。
       - candle: dark / ASMR / 雑談に使える小さな蝋燭。
       - blank card: トランプ / タロット風だが文字なしのカード。
       - ribbon seal: 配信ジャンルを問わない封蝋 / リボン風アクセント。
       - small ornate frame: 立ち絵や情報枠の補助に使う小フレーム。
   - implementation rules:
     - 素材数に固定上限は置かない。ただし review しやすいよう、実装 PR は Batch / category / source type ごとに分ける。
     - 追加素材は `thumbnailMaterialLibrary` から通常 image layer として追加できる registered material にする。
     - project-bound material に `storageId` / `materialRef` など user material metadata を混ぜない。
     - material-only PR では preset 初期 layer に自動挿入しない。
     - 既存 asset を登録する Batch A と、新規生成が必要な Batch B/C を同じ PR に混ぜない。
   - out of scope:
     - preset body / 初期配置の変更。
     - background asset / title image asset の再生成。
     - schema、canvas export、handoff payload、IndexedDB / localStorage key 変更。
     - material swap UI / title swap UI / background swap UI の再設計。
     - 9:16 preset。
     - editable font self-hosting / font picker。
   - verification:
     - `node scripts/thumbnail-material-assets-contract.mjs`
     - `node scripts/thumbnail-preset-text-locale-contract.mjs`
     - `node scripts/thumbnail-preset-apply-safety-contract.mjs`
     - `node scripts/thumbnail-preset-variants-contract.mjs`
     - `node scripts/tool-handoff-contract.mjs`
     - `npm run lint`
     - `npx tsc --noEmit`
     - `git diff --check`
     - UI を触った場合のみ `/tools/thumbnail-editor` を `390 / 820 / 1024 / 1280 / 1366px` で確認する。
   - next action:
     - Batch A の登録対象を「既存 preset decoration から汎用性の高いもの」に絞り、最初の implementation PR を切る。

2. Thumbnail Editor 1:1 IRIAM preview branch main merge preparation
   - status: material library expansion の必要分を preview branch に入れた後に戻る。
   - direction:
     - `codex/thumbnail-iriam-square-preview` の final state を contract / typecheck / lint / browser 目視で再確認してから `main` へ結合する。
     - material library follow-up が入った場合は、registered material count / search / category表示 / cross-aspect add flow を確認する。
   - blocker:
     - Batch A-C のうち、main merge 前に必須と判断したものが未実装なら main merge preparation へ進まない。

3. Thumbnail Editor font / preset typography follow-up
   - status: IRIAM square preview branch を main に統合した後に戻る。
   - direction:
     - IRIAM title image で使った license-free font を、必要に応じて editable text layer 用にも追加する。
     - language / mood category、font search、recently used は既に主要導線が入っているため、大きな UI 改修と混ぜない。
   - out of scope:
     - material asset 追加との同時実装。
     - 1:1 preset body / main merge preparation との同時実装。

4. Kuro Live Comment Translator planning
   - status: IRIAM square / font follow-up の後に planning へ戻る。
   - seed: `C:/Users/taka/Downloads/COMMENT_TRANSLATION_TOOL_PLAN.md`
   - recommended first scope:
     - OBS Browser Dock 前提の read-only MVP。
     - 1 platform から開始。
     - owner-only / OAuth / rate limit / quota / moderation を前提にする。
     - コメント翻訳、短い要約、用語集を中心にし、返信生成や自動投稿は初期 scope に入れない。

## Recommended Roadmap

1. Batch A: existing preset decoration registration
2. Batch B: dark / horror / smoke materials
3. Batch C: neutral prop materials
4. Preview branch final confirmation after material expansion
5. Merge `codex/thumbnail-iriam-square-preview` to `main`
6. Font / preset typography follow-up
7. New tool planning: Kuro Live Comment Translator

9:16 presets are still valuable for YouTube Shorts / vertical streams, but should follow after the 1:1 IRIAM workflow proves the square asset / title image / decoration pattern.

## Next Session Prompt

次セッションでそのまま使う prompt。

```text
D:/V_streamer_tools で作業してください。

目的:
Thumbnail Editor の登録済み素材ライブラリ拡張 Batch A として、既存 preset で使われているが素材リストにない装飾 asset を、16:9 / 1:1 の両方で使える project-bound registered material として追加してください。

前提:
- main 直作業は禁止です。
- まず `git fetch origin --prune` を実行してください。
- AGENTS.md と task.md を確認してください。
- PR #213 `[codex] Finalize IRIAM square preview confirmation` が `codex/thumbnail-iriam-square-preview` に merge 済みであることを確認してください。
- 未 merge の場合は、新規作業へ進まず blocker summary を返してください。
- merge 済みなら、`origin/codex/thumbnail-iriam-square-preview` を base に作業 branch / worktree を切ってください。

推奨 branch:
- `codex/thumbnail-material-existing-decoration-batch`

推奨 worktree:
- `D:/V_streamer_tools/.worktrees/thumbnail-material-existing-decoration-batch`

今回の scope:
- Batch A only。
- 既存 preset decoration asset のうち、登録済み素材にないものを素材ライブラリへ追加する。
- 新規 image generation はしない。
- 既存 asset source は `public/assets/images/thumbnail-editor/decorations/phase5/` など repo 内の既存ファイルを使う。
- A preset の装飾を B preset でも使えるよう、素材名 / description / recommendedPlacement は特定 preset 名に寄せすぎず汎用名にする。
- 追加素材は `thumbnailMaterialLibrary` から通常 image layer として追加できる project-bound material にする。
- 可能なら最初は汎用性の高い family を優先:
  - label / badge / panel
  - frame / corner
  - accent / effect
  - divider / line
  - small icon / prop

Out of scope:
- Batch B dark / horror / smoke の新規生成。
- Batch C neutral prop の新規生成。
- preset body / 初期配置変更。
- background / title image asset 変更。
- material swap UI / title swap UI / background swap UI 変更。
- schema、canvas export、handoff payload、IndexedDB / localStorage key 変更。
- 9:16 preset。
- editable font self-hosting / font picker。

検証:
- `node scripts/thumbnail-material-assets-contract.mjs`
- `node scripts/thumbnail-preset-text-locale-contract.mjs`
- `node scripts/thumbnail-preset-apply-safety-contract.mjs`
- `node scripts/thumbnail-preset-variants-contract.mjs`
- `node scripts/tool-handoff-contract.mjs`
- `npm run lint`
- `npx tsc --noEmit`
- `git diff --check`
- UI を触っていない場合、幅別ブラウザ確認は不要。素材パネルの表示件数や category 表示に不安がある場合のみ `/tools/thumbnail-editor` を確認してください。

完了時:
- `task.md` に追加した素材 family、検証結果、残リスク、次の Batch B / C への引き継ぎを追記してください。
- 問題なければ commit まで行ってください。push / PR は指示があるまで行わないでください。
```

## Backlog

- Thumbnail Editor:
  - Batch B dark / horror / smoke registered materials。
  - Batch C neutral prop registered materials。
  - 1:1 IRIAM preview branch main merge preparation。
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

docs / contract / material 変更時は、必要に応じて次を実行する。

- `node scripts/static-export-rsc-aliases.mjs --check`
- `node scripts/tool-portal-entry-contract.mjs`
- `node scripts/tool-handoff-contract.mjs`
- `node scripts/thumbnail-material-assets-contract.mjs`
- `node scripts/thumbnail-quality-guard-contract.mjs`
- `node scripts/thumbnail-standee-placement-contract.mjs`
- `node scripts/thumbnail-preset-text-locale-contract.mjs`
- `node scripts/thumbnail-preset-apply-safety-contract.mjs`
- `node scripts/thumbnail-preset-variants-contract.mjs`
- `node scripts/sns-split-image-maker-contract.mjs`
- `node scripts/portal-tools-copy-locale-contract.mjs`
- `npm run lint`
- `npx tsc --noEmit`
- `git diff --check`

UI / 表示文言を触った場合のみ、幅別確認結果をこのファイルに残す。

## Completed / Archive Summary

- Thumbnail Editor IRIAM square preview branch:
  - PR #200 - #213 で 1:1 IRIAM 5 preset、settings modal、background / title swap、EN title asset、material cross-aspect boundary、final confirmation を `codex/thumbnail-iriam-square-preview` へ統合済み。
  - 完了済み詳細は PR bodies と `docs/archive/TASK_HISTORY_2026-05.md` に寄せる。
- Thumbnail Editor usecase presets:
  - `goods_notice` / `membership_stream` / `asmr_stream` などの usecase preset sequence は完了済み。詳細は PR bodies と archive history を参照する。
- Portal / public prelaunch:
  - Portal settings visibility polish、Thumbnail Editor inline text edit、EN support は完了または各 PR body に集約済み。
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
- Thumbnail Editor registered material expansion plan: `docs/future/THUMBNAIL_EDITOR_IRIAM_SQUARE_DECORATION_MATERIAL_CONTRACT.md`
