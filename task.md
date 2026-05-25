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

1. Thumbnail Editor 1:1 IRIAM preview branch final QA / main merge preparation
   - status: 次の最優先。`codex/thumbnail-iriam-square-preview` 上の 1:1 IRIAM slice 群を main 結合前にまとめて確認し、必要なら目視確認結果から JSON を取得して preset 初期位置だけを小さく調整する。
   - base:
     - `origin/codex/thumbnail-iriam-square-preview`
     - latest integrated PR: #207 `Confirm cross-aspect material reuse`
   - current completed state:
     - `歌枠` / `闇ガチャ` / `雑談` / `初配信` / `耐久` は `square-1-1` preset body 接続済み。
     - 同 5ジャンルは square settings modal 対応済み。
     - background style / colorway swap UI は右パネルに実装済み。
     - title transparent image layer colorway swap UI は右パネルに実装済み。
     - `accent` / `label-base` の small project-bound material batch は登録済み。
     - project-bound material は 16:9 / IRIAM 1:1 の両方で素材ライブラリから通常 image layer として追加できる contract 済み。
   - direction:
     - preview branch 全体を、contract / typecheck / lint / browser 目視で main merge 前に確認する。
     - 目視で気になる preset 初期位置があれば、現在 draft JSON を取得して原因を見てから preset 初期値だけを調整する。
     - 調整対象は IRIAM square preset の初期位置 / サイズ / レイヤー重なりに限定し、schema、export、handoff、font、9:16、material swap UI は触らない。
     - material library は現状の「素材ライブラリから追加 / 通常レイヤーとして削除」運用を維持し、swap UI は実利用フィードバックが出るまで作らない。
   - next flow:
     - 1. Preview branch final QA / main merge preparation（目視確認、JSON取得、必要最小限の preset 初期位置修正）
     - 2. Material library small follow-up only if needed（フィードバックで足りない素材が明確になった場合だけ 1 category / small batch）
     - 3. Final confirmation（contracts / tsc / lint / width check / task.md 整理）
     - 4. Merge preview branch to `main`
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
       - After review / merge, continue with preview branch final QA / main merge preparation.
   - 2026-05-25 final QA / main merge preparation update:
     - branch / worktree: `codex/thumbnail-iriam-square-final-qa` / `D:/V_streamer_tools/.worktrees/thumbnail-iriam-square-final-qa`
     - PR #208 merge confirmed before QA: `1eb42f6` on `origin/codex/thumbnail-iriam-square-preview` (`mergedAt` 2026-05-25T11:07:56Z).
     - scope: preview branch final QA only. No schema, canvas export, handoff payload, 9:16 preset, font, title asset, swap UI redesign, decoration / material swap UI, material library redesign, or additional material batch changes.
     - browser QA:
       - in-app browser: `/tools/thumbnail-editor` opened on local dev server, switched from 16:9 to `正方形 1:1`, and confirmed the existing material library panel remains the add-from-library flow.
       - Playwright fixed-width check: `390 / 820 / 1024 / 1280 / 1366px` with `1080 x 1080 / 1:1`.
       - All fixed-width checks had `documentScrollWidth === documentClientWidth` and `bodyScrollWidth === bodyClientWidth`; no page-level horizontal overflow was detected.
       - `390 / 820px`: mobile panel mode, material panel hidden until selected.
       - `1024 / 1280 / 1366px`: desktop side material panel visible with `49 / 49` materials.
       - `1280px` with both left nav and right material panel visible can still require internal canvas panning or panel hide to inspect the far right edge; this is existing editor surface behavior, not a preset layer overlap found in this QA.
     - preset visual check:
       - Checked `歌枠` / `闇ガチャ` / `雑談` / `初配信` / `耐久配信` at `1366px`.
       - No initial preset position / size / layer-overlap issue requiring this scope's minimal adjustment was found.
       - Current draft JSON was not acquired because no suspicious preset geometry needed layer-level diagnosis.
       - Initial preset position adjustment: none.
     - material library flow:
       - Added `シアンラベル土台` from the existing material library.
       - Confirmed it appears as a normal image layer (`素材: シアンラベル土台`) in `レイヤー一覧`.
       - Confirmed deleting that top layer from `レイヤー一覧` removes the placed material layer while the library entry remains available.
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
       - `git diff --check`
     - residual risk:
       - Fixed-width screenshots are QA evidence for the current default flow, not a full manual review of every background / title colorway combination.
       - Material library small follow-up should stay feedback-gated; no extra material batch is needed from this QA alone.
     - next action:
       - Open draft PR against `codex/thumbnail-iriam-square-preview`.
       - Next order remains `material library small follow-up only if needed` -> `final confirmation` -> `codex/thumbnail-iriam-square-preview` main merge preparation.
   - 2026-05-25 first_stream initial placement follow-up:
     - source: user-provided current draft JSON for `presetId: "first_stream"` after local visual adjustment.
     - scope: `first_stream` / `square-1-1` initial preset body only.
     - applied:
       - Moved the transparent title image to the lower-right oversized composition from the draft JSON.
       - Moved the standee guide to the upper-right placement from the draft JSON.
       - Reworked the editable short text stack to three left-side pill rows (`23:00 START`, `リクエスト歓迎`, `初見さん歓迎`) with matching badge bases.
       - Kept the existing `soft_cloud` background registry / colorway behavior instead of hard-coding the pasted draft's current background `src`.
       - Added EN body copy for the new `テキスト 3（サブ） コピー` layer so square variant localization remains non-Japanese in English mode.
     - current draft JSON:
       - Acquired from the user paste; no separate browser JSON export was needed.
     - verification completed:
       - RED: `node scripts/thumbnail-iriam-first-stream-square-preset-contract.mjs` failed on the old title image placement before implementation.
       - GREEN: `node scripts/thumbnail-iriam-first-stream-square-preset-contract.mjs`
       - `node scripts/thumbnail-material-assets-contract.mjs`
       - `node scripts/thumbnail-preset-text-locale-contract.mjs`
       - `node scripts/thumbnail-iriam-square-background-swap-contract.mjs`
       - `node scripts/thumbnail-iriam-square-title-swap-contract.mjs`
       - `node scripts/thumbnail-iriam-square-title-asset-boundary-contract.mjs`
       - `node scripts/thumbnail-iriam-karaoke-square-preset-contract.mjs`
       - `node scripts/thumbnail-iriam-dark-gacha-square-preset-contract.mjs`
       - `node scripts/thumbnail-iriam-chatting-square-preset-contract.mjs`
       - `node scripts/thumbnail-iriam-endurance-square-preset-contract.mjs`
       - `npx tsc --noEmit`
       - `npm run lint`
     - width check:
       - Rechecked generated `first_stream` / `square-1-1` draft at `390 / 820 / 1024 / 1280 / 1366px` on `http://localhost:3000/tools/thumbnail-editor`.
       - All checked widths had `documentScrollWidth === documentClientWidth` and `bodyScrollWidth === bodyClientWidth`.
     - residual risk:
       - This follows the pasted draft's intentionally oversized lower-right title composition; other background / title colorway combinations were not exhaustively re-reviewed in this follow-up.
   - 2026-05-25 endurance_stream initial placement follow-up:
     - source: user-provided current draft JSON for `presetId: "endurance_stream"` after local visual adjustment.
     - scope: `endurance_stream` / `square-1-1` initial preset body only.
     - applied:
       - Moved the transparent title image to the oversized lower composition from the draft JSON.
       - Moved the standee guide to the upper-right placement from the draft JSON.
       - Added the existing project-bound `黄桃リボン` material asset as an initial normal image layer in the preset body.
       - Reduced editable text to the top `20:00 START` text layer using `Dela Gothic One`.
       - Kept the existing `pop_bubble` background registry / colorway behavior instead of hard-coding a one-off background path.
     - current draft JSON:
       - Acquired from the user paste; no separate browser JSON export was needed.
     - verification completed:
       - RED: `node scripts/thumbnail-iriam-endurance-square-preset-contract.mjs` failed before implementation because the final QA ribbon material layer was absent.
       - GREEN: `node scripts/thumbnail-iriam-endurance-square-preset-contract.mjs`
       - `node scripts/thumbnail-material-assets-contract.mjs`
       - `node scripts/thumbnail-preset-text-locale-contract.mjs`
       - `node scripts/thumbnail-iriam-square-background-swap-contract.mjs`
       - `node scripts/thumbnail-iriam-square-title-swap-contract.mjs`
       - `node scripts/thumbnail-iriam-square-title-asset-boundary-contract.mjs`
       - `node scripts/thumbnail-iriam-karaoke-square-preset-contract.mjs`
       - `node scripts/thumbnail-iriam-dark-gacha-square-preset-contract.mjs`
       - `node scripts/thumbnail-iriam-chatting-square-preset-contract.mjs`
       - `node scripts/thumbnail-iriam-first-stream-square-preset-contract.mjs`
       - `npx tsc --noEmit`
       - `npm run lint`
       - `git diff --check`
     - width check:
       - Rechecked generated `endurance_stream` / `square-1-1` draft at `390 / 820 / 1024 / 1280 / 1366px` on `http://localhost:3000/tools/thumbnail-editor`.
       - All checked widths had `documentScrollWidth === documentClientWidth` and `bodyScrollWidth === bodyClientWidth`.
     - residual risk:
       - This intentionally promotes one existing material-library asset into the endurance starter composition; it does not add a material swap UI or new material batch.
  - 2026-05-25 karaoke initial placement follow-up:
    - source: user-provided current draft JSON for `presetId: "karaoke"` after local visual adjustment.
    - scope: `karaoke` / `square-1-1` initial preset body only.
    - applied:
      - Moved the transparent title image to the oversized lower-right composition from the draft JSON.
      - Moved the pink / gold note decorations to the lower and right-side draft positions.
      - Added existing project-bound `青雲ラベル` material layers x3 and `ミントきらきら` x1 as normal image layers in the starter composition.
      - Reduced editable text to the right-side `20:00 START` text layer using `Fredoka`.
      - Kept the existing karaoke background / title registry behavior instead of hard-coding a one-off background or title path.
    - current draft JSON:
      - Acquired from the user paste; no separate browser JSON export was needed.
    - verification completed:
      - RED: `node scripts/thumbnail-iriam-karaoke-square-preset-contract.mjs` failed before implementation on the old title image x position.
      - GREEN: `node scripts/thumbnail-iriam-karaoke-square-preset-contract.mjs`
      - `node scripts/thumbnail-material-assets-contract.mjs`
      - `node scripts/thumbnail-preset-text-locale-contract.mjs`
      - `node scripts/thumbnail-iriam-square-background-swap-contract.mjs`
      - `node scripts/thumbnail-iriam-square-title-swap-contract.mjs`
      - `node scripts/thumbnail-iriam-square-title-asset-boundary-contract.mjs`
      - `node scripts/thumbnail-iriam-dark-gacha-square-preset-contract.mjs`
      - `node scripts/thumbnail-iriam-chatting-square-preset-contract.mjs`
      - `node scripts/thumbnail-iriam-first-stream-square-preset-contract.mjs`
      - `node scripts/thumbnail-iriam-endurance-square-preset-contract.mjs`
      - `npx tsc --noEmit`
      - `npm run lint`
      - `git diff --check`
    - width check:
      - Rechecked generated `karaoke` / `square-1-1` draft at `390 / 820 / 1024 / 1280 / 1366px` on `http://localhost:3000/tools/thumbnail-editor`.
      - All checked widths had `documentScrollWidth === documentClientWidth` and `bodyScrollWidth === bodyClientWidth`.
      - Screenshots are under `output/playwright/thumbnail-iriam-square-final-qa-karaoke-adjust/`.
    - residual risk:
      - This intentionally promotes existing material-library assets into the karaoke starter composition; it does not add a material swap UI, new material batch, export change, or handoff payload change.
   - out of scope:
     - schema / canvas export / handoff payload 変更。
     - 9:16 preset。
     - 新規 font 追加。
     - 追加 title image 生成。
     - background swap UI / title swap UI の再設計。
     - right panel decoration / material swap UI（実利用フィードバックが出るまで保留）。

2. Thumbnail Editor material library small follow-up only if needed
   - status: feedback-gated。final QA またはユーザー目視確認で不足素材が明確になった場合だけ進める。
   - direction:
     - 追加する場合も 1 category または小さな asset batch に閉じる。
     - 16:9 / 1:1 の両方で使える generic project-bound material として登録する。
     - 既存の「素材ライブラリから追加 / 通常レイヤーとして削除」フローだけを前提にする。
   - out of scope:
     - decoration / material swap UI。
     - material library 全体 UI の再設計。
     - preset settings modal の拡張。
     - schema / export / handoff payload 変更。

3. Preview branch final confirmation / main merge
   - status: final QA と必要な small follow-up が終わった後に実施する。
   - direction:
     - `codex/thumbnail-iriam-square-preview` の全 IRIAM 1:1 scope を最終確認し、`main` へ結合する。
     - main merge 前に contracts / `npx tsc --noEmit` / `npm run lint` / `git diff --check` / 必要な幅別確認を揃える。
     - merge 後は `task.md` を active-only に戻し、完了済み詳細は PR body / archive summary に寄せる。

4. Thumbnail Editor font / preset typography follow-up
   - status: IRIAM square の preset / title image / editable text の実需要を見てから戻る。
   - direction:
     - 単純な font 追加より、title image と editable text の不足を確認してから増やす。
     - language / mood category、font search、recently used は既に主要導線が入っているため、大きな UI 改修と混ぜない。
   - out of scope:
     - 1:1 preset body 実装との同時実装。
     - material asset 大量追加との同時実装。

5. Kuro Live Comment Translator planning
   - status: 新規ツール候補。IRIAM 1:1 material / typography が落ち着いた後に planning へ戻る。
   - seed: `C:/Users/taka/Downloads/COMMENT_TRANSLATION_TOOL_PLAN.md`
   - recommended first scope:
     - OBS Browser Dock 前提の read-only MVP。
     - 1 platform から開始。
     - owner-only / OAuth / rate limit / quota / moderation を前提にする。
     - コメント翻訳、短い要約、用語集を中心にし、返信生成や自動投稿は初期 scope に入れない。

## Recommended Roadmap

1. Preview branch final QA / main merge preparation
2. Material library small follow-up only if needed
3. Final confirmation
4. Merge `codex/thumbnail-iriam-square-preview` to `main`
5. Font / preset typography follow-up
6. New tool planning: Kuro Live Comment Translator

9:16 presets are still valuable for YouTube Shorts / vertical streams, but should follow after the 1:1 IRIAM workflow proves the square asset / title image / decoration pattern.

## Next Session Prompt

次セッションでそのまま使う prompt。

```text
D:/V_streamer_tools で作業してください。

目的:
Thumbnail Editor 1:1 IRIAM square preview branch final QA / main merge preparation として、`codex/thumbnail-iriam-square-preview` を base に main 結合前の確認と必要最小限の preset 初期位置調整をしてください。

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
- `accent` / `label-base` の project-bound material batch は登録済み。
- project-bound material は 16:9 / IRIAM 1:1 の両方で素材ライブラリから通常 image layer として追加できる contract 済み。
- 新規フォント追加はしない。
- schema、9:16 preset、追加 title image 生成は触らない。

今回の scope:
- preview branch 全体の IRIAM 1:1 flow を main merge 前に確認する。
- contract / typecheck / lint と、必要な幅別 browser 目視確認を行う。
- 私の目視確認で気になる箇所があれば、現在 draft JSON を取得してから原因を見て、preset 初期位置 / サイズ / レイヤー重なりだけを最小修正する。
- 調整対象は IRIAM square preset 初期状態に限定する。
- material library は既存の「素材ライブラリから追加 / 通常レイヤーとして削除」フローのまま確認する。
- decoration / material swap UI は、実利用フィードバックが出るまで作らない。
- 必要になった material library small follow-up は final QA 後に別 slice として判断する。

Out of scope:
- schema 変更。
- canvas export / handoff payload 変更。
- 9:16 preset。
- 新規 font 追加。
- 追加 title image 生成。
- background swap UI / title swap UI の再設計。
- decoration / material swap UI。
- material library 全体 UI の再設計。
- 追加 material batch の同時実装。

検証:
- `node scripts/thumbnail-material-assets-contract.mjs`
- `node scripts/thumbnail-preset-text-locale-contract.mjs`
- `node scripts/thumbnail-iriam-square-background-swap-contract.mjs`
- `node scripts/thumbnail-iriam-square-title-swap-contract.mjs`
- `node scripts/thumbnail-iriam-square-title-asset-boundary-contract.mjs`
- 5ジャンルの `thumbnail-iriam-*-square-preset-contract.mjs`
- `npx tsc --noEmit`
- `npm run lint`
- `git diff --check`
- main merge 前 QA として、必要な場合は `/tools/thumbnail-editor` を `390 / 820 / 1024 / 1280 / 1366px` で確認し、結果を `task.md` に残す。

完了時:
- `task.md` に確認内容、JSON 取得の有無、初期位置調整の有無、検証結果、残リスク、次アクションを追記してください。
- final QA 後の次順は `material library small follow-up only if needed` → `final confirmation` → `codex/thumbnail-iriam-square-preview` の `main` 結合準備です。
- 変更範囲と検証結果を確認してから commit / push / draft PR 作成まで行ってください。
```

## Backlog

- Thumbnail Editor:
  - 1:1 IRIAM decoration / material workflow。
  - 1:1 IRIAM decoration / material swap UI（実利用フィードバックが出た場合のみ）。
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
