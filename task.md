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

1. Thumbnail Editor 1:1 IRIAM decoration / material phase
   - status: 次の最優先。`codex/thumbnail-iriam-square-preview` 上で background swap panel と title swap panel まで完了済み。次は decoration / material の最小 scope と contract を固定する。
   - base:
     - `origin/codex/thumbnail-iriam-square-preview`
     - latest integrated PR: #204 `Refresh IRIAM square task board`
   - current completed state:
     - `歌枠` / `闇ガチャ` / `雑談` / `初配信` / `耐久` は `square-1-1` preset body 接続済み。
     - 同 5ジャンルは square settings modal 対応済み。
     - background style / colorway swap UI は右パネルに実装済み。
     - title transparent image layer colorway swap UI は右パネルに実装済み。
   - direction:
     - 吹き出し、雲、星、ハート、リボン、きらきら、手描きライン、小ラベルを候補にする。
     - 16:9 preset にも流用できる generic project-bound material として扱う。
     - background / title swap UI とは混ぜず、まず素材登録と使われ方を固定する。
     - 初回は 1 category または小さな asset batch に閉じる。
   - contract candidates:
     - `node scripts/thumbnail-material-assets-contract.mjs`
     - 必要なら IRIAM square decoration / material 専用 contract を追加する。
     - 既存 5ジャンル contract と `thumbnail-preset-text-locale-contract` は周辺回帰として維持する。
   - 2026-05-25 implementation update:
     - branch / worktree: `codex/thumbnail-iriam-square-accent-assets` / `D:/V_streamer_tools/.worktrees/thumbnail-iriam-square-accent-assets`
     - PR #204 merge confirmed before implementation: `9516b22` on `origin/codex/thumbnail-iriam-square-preview`.
     - scope: first small `accent` material batch only. No schema, preset body, swap UI, export, handoff payload, font, 9:16, or title image changes.
     - contract-first:
       - RED: `node scripts/thumbnail-material-assets-contract.mjs` failed as expected with `41 !== 45` after adding the 4 expected IRIAM accent materials to the contract.
       - GREEN: registered the 4 project-bound assets in `thumbnailMaterialLibrary`, added EN material copy, and kept user material refs / `storageId` / `materialRef` out of project material entries.
     - generated assets:
       - `public/assets/images/thumbnail-editor/materials/iriam-square-accent/iriam-square-accent-puffy-star-pink-v1.png`
       - `public/assets/images/thumbnail-editor/materials/iriam-square-accent/iriam-square-accent-soft-heart-blue-v1.png`
       - `public/assets/images/thumbnail-editor/materials/iriam-square-accent/iriam-square-accent-sparkle-mint-v1.png`
       - `public/assets/images/thumbnail-editor/materials/iriam-square-accent/iriam-square-accent-hand-line-yellow-v1.png`
     - generation notes:
       - built-in `image_gen` was used once per asset.
       - Each source was generated on a flat chroma-key background, converted with `remove_chroma_key.py`, then saved as a 768x512 RGBA PNG under project `public/assets`.
       - Final visual check found no readable text, logo, person, character, or official UI-like element.
     - verification completed:
       - `node scripts/thumbnail-material-assets-contract.mjs`
       - `node scripts/thumbnail-preset-text-locale-contract.mjs`
       - `node scripts/thumbnail-iriam-square-background-swap-contract.mjs`
       - `node scripts/thumbnail-iriam-square-title-swap-contract.mjs`
       - `node scripts/thumbnail-iriam-square-title-asset-boundary-contract.mjs`
       - `node scripts/thumbnail-iriam-karaoke-square-preset-contract.mjs`
       - `node scripts/thumbnail-iriam-dark-gacha-square-preset-contract.mjs`
       - `node scripts/thumbnail-iriam-chatting-square-preset-contract.mjs`
       - `node scripts/thumbnail-iriam-first-stream-square-preset-contract.mjs`
       - `node scripts/thumbnail-iriam-endurance-square-preset-contract.mjs`
       - `npx tsc --noEmit`
       - `npm run lint`
     - width check:
       - Not run. This PR does not change UI layout or responsive rendering.
     - residual risk:
       - The assets are intentionally generic and library-only; actual preset composition balance should be judged when a later decoration swap / placement slice uses them in context.
     - next action:
       - Open draft PR against `codex/thumbnail-iriam-square-preview`.
       - After review / merge, continue with either the next small material category (`label-base` speech bubble / small label) or the separate decoration swap UI slice.
   - 2026-05-25 label-base batch update:
     - branch / worktree: `codex/thumbnail-iriam-square-label-base-assets` / `D:/V_streamer_tools/.worktrees/thumbnail-iriam-square-label-base-assets`
     - PR #205 merge confirmed before implementation: `c93abb2` on `origin/codex/thumbnail-iriam-square-preview`.
     - scope: small `label-base` material batch only. No schema, preset body, swap UI, export, handoff payload, font, 9:16, title image, or material library redesign changes.
     - contract-first:
       - RED: `node scripts/thumbnail-material-assets-contract.mjs` failed as expected with `45 !== 49` after adding the 4 expected label-base materials to the contract.
       - GREEN: registered the 4 project-bound `label-base` assets in `thumbnailMaterialLibrary`, added EN material copy, and kept user material refs / `storageId` / `materialRef` out of project material entries.
     - generated assets:
       - `public/assets/images/thumbnail-editor/materials/iriam-square-label-base/iriam-square-label-speech-bubble-pink-v1.png`
       - `public/assets/images/thumbnail-editor/materials/iriam-square-label-base/iriam-square-label-rounded-mint-v1.png`
       - `public/assets/images/thumbnail-editor/materials/iriam-square-label-base/iriam-square-label-cloud-blue-v1.png`
       - `public/assets/images/thumbnail-editor/materials/iriam-square-label-base/iriam-square-label-tiny-ribbon-yellow-pink-v1.png`
     - generation notes:
       - built-in `image_gen` was used once per asset.
       - Each source was generated on a flat chroma-key background, copied into `tmp/imagegen/`, converted with `remove_chroma_key.py`, resized, then saved as a 768x512 RGBA PNG under project `public/assets`.
       - Final visual check found no readable text, logo, person, character, or official UI-like element.
     - verification completed:
       - `node scripts/thumbnail-material-assets-contract.mjs`
       - `node scripts/thumbnail-preset-text-locale-contract.mjs`
       - `node scripts/thumbnail-iriam-square-background-swap-contract.mjs`
       - `node scripts/thumbnail-iriam-square-title-swap-contract.mjs`
       - `node scripts/thumbnail-iriam-square-title-asset-boundary-contract.mjs`
       - `node scripts/thumbnail-iriam-karaoke-square-preset-contract.mjs`
       - `node scripts/thumbnail-iriam-dark-gacha-square-preset-contract.mjs`
       - `node scripts/thumbnail-iriam-chatting-square-preset-contract.mjs`
       - `node scripts/thumbnail-iriam-first-stream-square-preset-contract.mjs`
       - `node scripts/thumbnail-iriam-endurance-square-preset-contract.mjs`
       - `npx tsc --noEmit`
       - `npm run lint`
     - width check:
       - Not run. This PR does not change UI layout or responsive rendering.
     - residual risk:
       - The label-base assets are intentionally generic and library-only; actual square preset composition balance should be judged when a later decoration swap / placement slice uses them in context.
     - next action:
       - Open draft PR against `codex/thumbnail-iriam-square-preview`.
       - After review / merge, continue with the separate decoration swap UI slice or another single-category material batch only if needed.
   - 2026-05-25 cross-aspect material reuse contract update:
     - branch / worktree: `codex/thumbnail-iriam-cross-aspect-material-contract` / `D:/V_streamer_tools/.worktrees/thumbnail-iriam-cross-aspect-material-contract`
     - PR #206 merge confirmed before implementation: `76f351e` on `origin/codex/thumbnail-iriam-square-preview`.
     - scope: contract-first confirmation that project-bound `thumbnailMaterialLibrary` assets can be added from the existing material library flow to both 16:9 and IRIAM 1:1 canvases. No swap UI, schema, export, handoff payload, preset body, user material storage, font, 9:16, or image generation changes.
     - contract-first:
       - RED: `node scripts/thumbnail-material-assets-contract.mjs` failed as expected on `localized project material display names stay generic instead of IRIAM-only` after adding the cross-aspect / generic-display assertions.
       - GREEN: kept `createThumbnailMaterialLayer` behavior unchanged and adjusted only the registered material display names / EN localized names so IRIAM-added assets read as generic reusable materials.
     - confirmed cross-aspect boundary:
       - Every project-bound material creates a normal unlocked image layer on `landscape-16-9` and `square-1-1`.
       - Generated material layers keep positive size, start inside the target canvas, fit within target canvas width / height, and keep the same project asset `src`.
       - Project-bound material entries and generated layers do not include user material `storageId` / `materialRef`.
       - Existing material categories remain limited to `label-base` / `date-badge` / `corner` / `accent` / `divider` / `frame`.
       - Material-only assets are still not inserted into preset initial layers.
     - verification completed:
       - `node scripts/thumbnail-material-assets-contract.mjs`
       - `node scripts/thumbnail-preset-text-locale-contract.mjs`
       - `node scripts/thumbnail-iriam-square-background-swap-contract.mjs`
       - `node scripts/thumbnail-iriam-square-title-swap-contract.mjs`
       - `node scripts/thumbnail-iriam-square-title-asset-boundary-contract.mjs`
       - `node scripts/thumbnail-iriam-karaoke-square-preset-contract.mjs`
       - `node scripts/thumbnail-iriam-dark-gacha-square-preset-contract.mjs`
       - `node scripts/thumbnail-iriam-chatting-square-preset-contract.mjs`
       - `node scripts/thumbnail-iriam-first-stream-square-preset-contract.mjs`
       - `node scripts/thumbnail-iriam-endurance-square-preset-contract.mjs`
       - `npx tsc --noEmit`
       - `npm run lint`
       - `git diff --check`
     - width check:
       - Not run. This PR does not touch UI layout, responsive classes, canvas rendering geometry, or browser interaction; it only tightens the contract and adjusts material display copy.
     - residual risk:
       - Contract confirms addition / deletion as normal layers and cross-aspect canvas bounds, but actual visual composition balance still needs human review when a later decoration placement / swap UI slice uses these assets in context.
     - next action:
       - Open draft PR against `codex/thumbnail-iriam-square-preview`.
       - After review / merge, continue with the separate decoration swap UI slice or another single-category material batch only if needed.
   - out of scope:
     - schema / canvas export / handoff payload 変更。
     - 9:16 preset。
     - 新規 font 追加。
     - 追加 title image 生成。
     - background swap UI / title swap UI の再設計。
     - right panel decoration swap UI の同時実装。

2. Thumbnail Editor 1:1 IRIAM decoration swap UI
   - status: decoration / material asset boundary が固まった後の候補。素材登録 PR と同時に進めない。
   - direction:
     - background / title swap と同じく、選択中 decoration layer の source だけを差し替える小さな右パネル UI に留める。
     - geometry、locked、opacity、crop、layer name は維持する。
   - out of scope:
     - material library 全体 UI の再設計。
     - preset settings modal の拡張。
     - genre を跨いだ自動変換。

3. Thumbnail Editor font / preset typography follow-up
   - status: IRIAM square の preset / title image / editable text の実需要を見てから戻る。
   - direction:
     - 単純な font 追加より、title image と editable text の不足を確認してから増やす。
     - language / mood category、font search、recently used は既に主要導線が入っているため、大きな UI 改修と混ぜない。
   - out of scope:
     - 1:1 preset body 実装との同時実装。
     - material asset 大量追加との同時実装。

4. Kuro Live Comment Translator planning
   - status: 新規ツール候補。IRIAM 1:1 material / typography が落ち着いた後に planning へ戻る。
   - seed: `C:/Users/taka/Downloads/COMMENT_TRANSLATION_TOOL_PLAN.md`
   - recommended first scope:
     - OBS Browser Dock 前提の read-only MVP。
     - 1 platform から開始。
     - owner-only / OAuth / rate limit / quota / moderation を前提にする。
     - コメント翻訳、短い要約、用語集を中心にし、返信生成や自動投稿は初期 scope に入れない。

## Recommended Roadmap

1. IRIAM square decoration / material scope + contract cleanup
2. IRIAM square decoration / material asset batch
3. IRIAM square decoration swap UI
4. Font / preset typography follow-up
5. Preview branch final QA and `main` merge preparation
6. New tool planning: Kuro Live Comment Translator

9:16 presets are still valuable for YouTube Shorts / vertical streams, but should follow after the 1:1 IRIAM workflow proves the square asset / title image / decoration pattern.

## Next Session Prompt

次セッションでそのまま使う prompt。

```text
D:/V_streamer_tools で作業してください。

目的:
Thumbnail Editor 1:1 IRIAM square preset follow-up として、`codex/thumbnail-iriam-square-preview` を base に decoration / material phase の最小 scope と contract を整理してください。

前提:
- main 直作業は禁止です。
- まず `git fetch origin --prune` を実行してください。
- AGENTS.md と task.md を確認してください。
- `origin/codex/thumbnail-iriam-square-preview` を base に新規 feature branch / worktree を切ってください。
- すべての IRIAM 1:1 slice 完了後に preview branch を main へ結合する前提です。

ここまでの状態:
- `歌枠` / `闇ガチャ` / `雑談` / `初配信` / `耐久` は square preset body 接続済み。
- 同 5ジャンルは square settings modal 対応済み。
- 右パネルの background style / colorway swap UI は実装済み。
- 右パネルの title transparent image layer colorway swap UI は実装済み。
- 1:1 IRIAM title image は背景に焼き込まず透明 PNG image layer として扱う。
- 新規フォント追加はしない。
- schema、9:16 preset、追加 title image 生成は触らない。

今回の scope:
- docs / contract で IRIAM square decoration asset の最小カテゴリ、登録境界、既存 16:9 material library との関係を固定する。
- 初回は汎用性が高い小物だけに絞り、background / title swap UI と同時改修しない。
- 実装に進む場合も 1 PR = 1カテゴリまたは小さな asset batch に閉じる。

Out of scope:
- schema 変更。
- canvas export / handoff payload 変更。
- 9:16 preset。
- 新規 font 追加。
- 追加 title image 生成。
- background swap UI / title swap UI の再設計。
- decoration swap UI の同時実装。
- 複数 slice の同時実装。

検証:
- docs/task のみなら `git diff --check`。
- 実装に進む場合は RED として追加 contract が実装前に失敗することを確認。
- 必要に応じて該当 decoration / material contract script。
- `node scripts/thumbnail-material-assets-contract.mjs`
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
  - 1:1 IRIAM decoration / material workflow。
  - 1:1 IRIAM decoration swap UI。
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
- `node scripts/thumbnail-iriam-square-background-swap-contract.mjs`
- `node scripts/thumbnail-iriam-square-title-swap-contract.mjs`
- `node scripts/thumbnail-iriam-square-title-asset-boundary-contract.mjs`
- `node scripts/thumbnail-iriam-karaoke-square-preset-contract.mjs`
- `node scripts/thumbnail-iriam-dark-gacha-square-preset-contract.mjs`
- `node scripts/thumbnail-iriam-chatting-square-preset-contract.mjs`
- `node scripts/thumbnail-iriam-first-stream-square-preset-contract.mjs`
- `node scripts/thumbnail-iriam-endurance-square-preset-contract.mjs`
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
  - PR #202 added the right-panel background swap UI.
  - PR #203 added the right-panel title transparent image swap UI.
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
