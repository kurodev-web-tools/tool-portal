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
   - status: Batch A PR #215、Batch B PR #216、Batch C PR #217 は `codex/thumbnail-iriam-square-preview` に merge 済み。
   - base:
     - `origin/codex/thumbnail-iriam-square-preview`
     - latest integrated PR: #217 `[codex] Add neutral thumbnail materials`
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
     - Completed. Preview branch final confirmation after material expansion に戻る。
   - Batch A implementation result:
     - added materials: 19件。
       - `label-base`: 2件。
       - `frame`: 5件。
       - `date-badge`: 2件。
       - `corner`: 2件。
       - `accent`: 6件。
       - `divider`: 2件。
     - representative source assets:
       - `public/assets/images/thumbnail-editor/decorations/phase5/announcement-label-plaque-ivory-uniform-cell.png`
       - `public/assets/images/thumbnail-editor/decorations/phase5/goods-notice-product-card-v1.png`
       - `public/assets/images/thumbnail-editor/decorations/phase5/stream-standee-frame-glow-uniform-cell.png`
       - `public/assets/images/thumbnail-editor/decorations/phase5/endurance-stream-progress-divider-lime-cyan-orange-uniform-cell.png`
       - `public/assets/images/thumbnail-editor/decorations/phase5/asmr-stream-mic-silhouette-v1.png`
     - contract updates:
       - `thumbnail-material-assets-contract` now expects 68 registered project-bound materials and covers the 19 Batch A ids in review order.
       - Batch A keeps existing repo PNGs as source assets. Some preset-native PNGs are not the older 768x512 material canvas, so the contract records their native canvas size while still checking PNG type, project asset path, layer creation, 16:9 / 1:1 insertion, and absence of user material metadata.
       - `thumbnail-preset-variants-contract` was refreshed to match the current preview branch preset catalog, including `goods_notice` / `membership_stream` / `asmr_stream` / `dark_gacha`, square-only `dark_gacha`, and square title-image presets.
     - verification completed:
       - `node scripts/thumbnail-material-assets-contract.mjs`
       - `node scripts/thumbnail-preset-text-locale-contract.mjs`
       - `node scripts/thumbnail-preset-apply-safety-contract.mjs`
       - `node scripts/thumbnail-preset-variants-contract.mjs`
       - `node scripts/tool-handoff-contract.mjs`
       - `npm run lint`
       - `npx tsc --noEmit`
       - `git diff --check`
     - UI verification:
       - UI code was not changed. Width-based browser confirmation is not required for this branch.
     - residual risk:
       - Batch A registers a representative subset of the 94 unregistered phase5 decoration sources found in existing presets, not the full backlog.
       - Some registered existing sources use preset-native canvases with minimal alpha padding. They are intentionally not regenerated in Batch A.
   - Batch B implementation result:
     - added materials: 5件。
       - `frame`: 1件。
       - `corner`: 1件。
       - `accent`: 3件。
     - added families:
       - `dark-smoke-wash`: 背景やタイトル背面へ薄く重ねる黒紫の煙。
       - `dark-smoky-edge-frame`: 16:9 / 1:1 の端へ足せる開口型の煙フレーム。
       - `dark-shadow-corner-fog`: 角へ足す暗いもや。
       - `dark-ink-drip-accent`: 端や見出し周辺に置く黒い滴り。
       - `dark-sparkle-dust`: 暗い背景へ散らす黒紫の粒子。
     - project-bound source assets:
       - `public/assets/images/thumbnail-editor/materials/dark/dark-smoke-wash-v1.png`
       - `public/assets/images/thumbnail-editor/materials/dark/dark-smoky-edge-frame-v1.png`
       - `public/assets/images/thumbnail-editor/materials/dark/dark-shadow-corner-fog-v1.png`
       - `public/assets/images/thumbnail-editor/materials/dark/dark-ink-drip-accent-v1.png`
       - `public/assets/images/thumbnail-editor/materials/dark/dark-sparkle-dust-v1.png`
     - imagegen source directory:
       - `C:/Users/taka/.codex/generated_images/019e6478-d437-7f71-a9cb-ef4255e74add/`
     - contract updates:
       - `thumbnail-material-assets-contract` now expects 73 registered project-bound materials.
       - Added `materials/dark/` to the expected source prefixes and checks each Batch B PNG as `768 x 512` RGBA with alpha padding.
       - Added dark-prefix chroma-key-green rejection so generated source cleanup is locked by contract.
       - Existing project-bound / user-material boundary checks, 16:9 / 1:1 insertion checks, and material-only initial-layer exclusion remain in place.
     - verification completed:
       - `node scripts/thumbnail-material-assets-contract.mjs`
       - `node scripts/thumbnail-preset-text-locale-contract.mjs`
       - `node scripts/thumbnail-preset-apply-safety-contract.mjs`
       - `node scripts/thumbnail-preset-variants-contract.mjs`
       - `node scripts/tool-handoff-contract.mjs`
       - `npm run lint`
       - `npx tsc --noEmit`
       - `git diff --check`
     - UI verification:
       - Component UI code was not changed. Width-based browser confirmation is not required for this branch.
     - residual risk:
       - Batch B uses built-in imagegen plus local chroma-key removal, so smoke edges are generated raster assets rather than hand-authored vectors.
       - The material library gains only the 5 dark / horror / smoke candidates requested here; neutral props remain for Batch C.
     - Batch C handoff:
       - Start from `origin/codex/thumbnail-iriam-square-preview` after Batch B is merged.
       - Keep scope to neutral prop registered materials only: chandelier, antique key, pocket watch, candle, blank card, ribbon seal, and small ornate frame are the current candidates.
       - Continue one asset per imagegen generation, reuse existing `frame` / `accent` / `corner` categories, and avoid preset body / schema / export / handoff / swap UI changes.
   - Batch C implementation result:
     - added materials: 7件。
       - `frame`: 1件。
       - `accent`: 6件。
     - added families:
       - `neutral-chandelier-gold`: 上部や角へ置ける小さな金シャンデリア。
       - `neutral-antique-key-brass`: 告知や企画枠に使いやすい真鍮アンティーク鍵。
       - `neutral-pocket-watch-brass`: 時刻 / 耐久 / 予定告知に使える真鍮懐中時計。
       - `neutral-candle-warm`: 雑談 / ASMR / dark 系の余白に置ける小さな蝋燭。
       - `neutral-blank-card-ivory`: 文字なしのカード素材。
       - `neutral-ribbon-seal-rose`: 文字なしの封蝋 / リボンアクセント。
       - `neutral-small-ornate-frame-gold`: 立ち絵や小さな情報枠の補助フレーム。
     - project-bound source assets:
       - `public/assets/images/thumbnail-editor/materials/neutral/neutral-chandelier-gold-v1.png`
       - `public/assets/images/thumbnail-editor/materials/neutral/neutral-antique-key-brass-v1.png`
       - `public/assets/images/thumbnail-editor/materials/neutral/neutral-pocket-watch-brass-v1.png`
       - `public/assets/images/thumbnail-editor/materials/neutral/neutral-candle-warm-v1.png`
       - `public/assets/images/thumbnail-editor/materials/neutral/neutral-blank-card-ivory-v1.png`
       - `public/assets/images/thumbnail-editor/materials/neutral/neutral-ribbon-seal-rose-v1.png`
       - `public/assets/images/thumbnail-editor/materials/neutral/neutral-small-ornate-frame-gold-v1.png`
     - imagegen source directory:
       - `C:/Users/taka/.codex/generated_images/019e6492-2930-76d2-91ed-71a7e126a997/`
     - contract updates:
       - `thumbnail-material-assets-contract` now expects 80 registered project-bound materials.
       - Added `materials/neutral/` to the expected source prefixes and checks each Batch C PNG as `768 x 512` RGBA with alpha padding.
       - Added neutral-prefix chroma-key-green rejection so generated source cleanup is locked by contract.
       - Existing project-bound / user-material boundary checks, 16:9 / 1:1 insertion checks, and material-only initial-layer exclusion remain in place.
     - verification completed:
       - `node scripts/thumbnail-material-assets-contract.mjs`
       - `node scripts/thumbnail-preset-text-locale-contract.mjs`
       - `node scripts/thumbnail-preset-apply-safety-contract.mjs`
       - `node scripts/thumbnail-preset-variants-contract.mjs`
       - `node scripts/tool-handoff-contract.mjs`
       - `npm run lint`
       - `npx tsc --noEmit`
       - `git diff --check`
     - UI verification:
       - Component UI code was not changed. Width-based browser confirmation is not required for this branch.
     - residual risk:
       - Batch C uses built-in imagegen plus local chroma-key removal, so the neutral props are generated raster assets rather than hand-authored vectors.
       - The material library gains only the 7 neutral prop candidates requested here; any additional prop families should be a separate follow-up.

2. Thumbnail Editor 1:1 IRIAM preview branch main merge preparation
   - status: final confirmation completed after material expansion Batch A-C. Main merge preparation に進める。
   - direction:
     - `codex/thumbnail-iriam-square-preview` の final state を contract / typecheck / lint / browser 目視で再確認してから `main` へ結合する。
     - material library follow-up が入った場合は、registered material count / search / category表示 / cross-aspect add flow を確認する。
   - blocker:
     - None found in this confirmation pass.
   - final confirmation result:
     - merge gate: PR #215 / #216 / #217 are `MERGED`, all base `codex/thumbnail-iriam-square-preview`, and each merge commit is an ancestor of `origin/codex/thumbnail-iriam-square-preview`.
     - contract verification passed:
       - `node scripts/thumbnail-material-assets-contract.mjs`
       - `node scripts/thumbnail-preset-text-locale-contract.mjs`
       - `node scripts/thumbnail-preset-apply-safety-contract.mjs`
       - `node scripts/thumbnail-preset-variants-contract.mjs`
       - `node scripts/tool-handoff-contract.mjs`
       - `node scripts/thumbnail-iriam-karaoke-square-preset-contract.mjs`
       - `node scripts/thumbnail-iriam-dark-gacha-square-preset-contract.mjs`
       - `node scripts/thumbnail-iriam-chatting-square-preset-contract.mjs`
       - `node scripts/thumbnail-iriam-first-stream-square-preset-contract.mjs`
       - `node scripts/thumbnail-iriam-endurance-square-preset-contract.mjs`
       - `node scripts/thumbnail-iriam-square-background-swap-contract.mjs`
       - `node scripts/thumbnail-iriam-square-title-swap-contract.mjs`
       - `node scripts/thumbnail-iriam-square-title-asset-boundary-contract.mjs`
     - static verification passed:
       - `npm run lint`
       - `npx tsc --noEmit`
       - `git diff --check`
     - material library confirmation:
       - registered material count is `80 / 80点`.
       - category counts shown in UI: `label-base` 11, `date-badge` 9, `corner` 9, `accent` 26, `frame` 16, `divider` 9.
       - search confirmed with `シャンデリア` and `懐中時計`, both narrowed to `1 / 80点`.
       - registered material add flow confirmed in 1:1 with `金シャンデリア` and in 16:9 with `真鍮懐中時計`.
     - IRIAM square UI confirmation:
       - 5 square presets `karaoke` / `dark_gacha` / `chatting` / `first_stream` / `endurance_stream` open the square settings modal.
       - square draft creation, background swap panel, title swap panel, and EN title asset boundary remain contract-covered.
     - width verification for `/tools/thumbnail-editor`:
       - `390px`: no horizontal overflow; mobile canvas / material / layer / export tabs reachable.
       - `820px`: no horizontal overflow; mobile canvas / material / layer / export tabs reachable.
       - `1024px`: no horizontal overflow; square canvas, material count, layer list, and export panel visible.
       - `1280px`: no horizontal overflow; square canvas, material count, layer list, and export panel visible.
       - `1366px`: no horizontal overflow; square canvas, material count, layer list, and export panel visible.
     - browser console: no warning/error entries from the page during Playwright confirmation.
   - follow-up UI fix after local visual review:
     - Scoped the canvas size dropdown by output ratio.
     - `landscape-16-9` keeps the selectable `1280 x 720` / `1920 x 1080` canvas size choices.
     - `square-1-1` now shows only the fixed `1080 x 1080 (1:1)` canvas size in the menu, so 16:9 sizes are not offered while square output is selected.
     - Browser confirmation: switching to `square-1-1`, opening the canvas size menu, and switching back to `landscape-16-9` confirmed the expected menu contents with no horizontal overflow.
     - Additional verification:
       - `node scripts/thumbnail-responsive-control-polish-contract.mjs`
       - `node scripts/thumbnail-preset-variants-contract.mjs`
       - `node scripts/thumbnail-preset-apply-safety-contract.mjs`
       - `npm run lint`
       - `npx tsc --noEmit`
       - `git diff --check`
   - residual note:
     - `next dev` in the project-local worktree emits a Next.js workspace-root inference warning because both the root checkout and worktree have `package-lock.json`. This is worktree environment noise, not a Thumbnail Editor blocker.
   - main merge preparation judgment:
     - No main-merge blocker found. Next scope can be a merge-preparation PR from `codex/thumbnail-iriam-square-preview` to `main` without adding new thumbnail functionality.

3. Thumbnail Editor Google Fonts standard batch / IRIAM title font parity
   - status: 次の実装候補。まず確認用 branch `codex/thumbnail-font-expansion-check` を base にして作業 branch / worktree を切る。
   - direction:
     - Google Fonts 由来で license を確認できる font のみを標準 font として追加する。
     - まず IRIAM title image で使った font と editable text layer 用 manifest を照合し、不足分を埋める。
     - 追加量は小規模に閉じ、目安は +8-12 family 程度までにする。
     - 既存方針どおり route-scoped self-host font loading / manifest / license note / contract を揃える。
     - language / mood category、font search、recently used は既に主要導線が入っているため、大きな UI 改修と混ぜない。
     - font 追加後は確認用 branch へ merge してローカル目視確認し、問題なければ確認用 branch から `main` へ結合する。
   - out of scope:
     - material asset 追加との同時実装。
     - 1:1 preset body / main merge preparation との同時実装。
     - ローカル端末フォント読み込み。
     - ログイン / user settings / paid plan 基盤。

4. User account / preferences foundation
   - status: font standard batch の後に planning から開始する。
   - direction:
     - 今後の複数ツールと paid plan を前提にした共通基盤として設計する。
     - Thumbnail Editor、Schedule Calendar、Kuro Live Comment Translator、将来の local font feature で使い回す。
     - 保存対象候補は user preferences、recent fonts、tool settings、language / translation settings、plan / quota state。
     - auth provider、DB schema、billing、plan boundary、migration はこのタスク開始時に詳細設計する。
   - out of scope:
     - この段階の `task.md` では詳細設計を固定しない。
     - 個別ツールの大きな UI 実装と同時に進めない。

5. Kuro Live Comment Translator planning
   - status: font standard batch と user foundation の後に設計を見直す。
   - seed: `C:/Users/taka/Downloads/COMMENT_TRANSLATION_TOOL_PLAN.md`
   - recommended first scope:
     - OBS Browser Dock 前提の read-only MVP。
     - 1 platform から開始。
     - owner-only / OAuth / rate limit / quota / moderation を前提にする。
     - コメント翻訳、短い要約、用語集を中心にし、返信生成や自動投稿は初期 scope に入れない。
     - ログイン / user settings / paid plan 基盤の方針に合わせて、保存項目と制限設計をタスク開始時に見直す。

6. Local font loading
   - status: user account / preferences foundation 後の later scope。
   - direction:
     - 端末に入っている font を直接読む Local Font Access 系は、ログイン / user settings 基盤の後に扱う。
     - DB に保存する場合も、基本は font family / PostScript name / style / fallback / last-seen state などの選択情報に留める。
     - font file 本体の保存は、ユーザーが明示的に upload した場合だけ別途検討する。
   - out of scope:
     - Google Fonts standard batch と同じ PR に混ぜない。
     - preset 初期値、handoff payload、schema に local font を混ぜない。

## Recommended Roadmap

1. Font expansion confirmation branch setup: `codex/thumbnail-font-expansion-check`
2. Thumbnail Editor Google Fonts standard batch / IRIAM title font parity
3. Confirm the font addition on `codex/thumbnail-font-expansion-check`, then merge that confirmation branch to `main`
4. User account / preferences foundation for future tools and paid plans
5. New tool planning: Kuro Live Comment Translator
6. Local font loading after user foundation
7. 1:1 IRIAM preset / material follow-up as needed
8. 9:16 preset follow-up after square workflow settles

9:16 presets are still valuable for YouTube Shorts / vertical streams, but should follow after the 1:1 IRIAM workflow and user-facing account direction settle.

## Next Session Prompt

次セッションでそのまま使う prompt。

```text
D:/V_streamer_tools で作業してください。

目的:
Thumbnail Editor の Google Fonts standard batch / IRIAM title font parity として、IRIAM square title image で使った font と editable text layer 用 font catalog を照合し、不足している Google Fonts 由来 font を小規模に追加してください。

前提:
- main 直作業は禁止です。
- まず `git fetch origin --prune` を実行してください。
- AGENTS.md と task.md を確認してください。
- `codex/thumbnail-font-expansion-check` が remote に存在し、`origin/main` の最新を含んでいることを確認してください。
- 確認用 branch が未作成 / stale の場合は、新規実装へ進まず blocker summary を返してください。
- 問題なければ `origin/codex/thumbnail-font-expansion-check` を base に作業 branch / worktree を切ってください。

推奨 branch:
- `codex/thumbnail-google-fonts-standard-batch`

推奨 worktree:
- `D:/V_streamer_tools/.worktrees/thumbnail-google-fonts-standard-batch`

今回の scope:
- Google Fonts 由来で license を確認できる font のみを標準 font として追加する。
- IRIAM title image で使った font と `thumbnailFontManifest` / CSS / license note を照合し、不足分だけ追加する。
- 追加量は小規模に閉じ、目安は +8-12 family 程度までにする。
- route-scoped self-host font loading、manifest-backed listbox、license note、contract を維持する。
- font 追加作業 PR は `codex/thumbnail-font-expansion-check` を base に作成する。

Out of scope:
- local font loading。
- login / user settings / paid plan。
- comment translator。
- 新規 preset body / 初期配置変更。
- material asset 追加。
- schema、canvas export、handoff payload、IndexedDB / localStorage key 変更。
- language / mood category、font search、recently used の大きな UI 改修。

検証:
- `node scripts/thumbnail-font-policy-contract.mjs`
- `node scripts/thumbnail-preset-text-locale-contract.mjs`
- `npm run lint`
- `npx tsc --noEmit`
- `git diff --check`
- UI 表示を触った場合のみ `/tools/thumbnail-editor` を `390 / 820 / 1024 / 1280 / 1366px` で確認し、結果を `task.md` に残す。

完了時:
- `task.md` に実装内容、確認結果、残リスク、確認用 branch への引き継ぎを追記してください。
- 問題なければ commit / push / draft PR 作成まで進めてください。
```

## Backlog

- Thumbnail Editor:
  - 9:16 preset for YouTube Shorts / vertical streams。
  - crop 仕様。
  - text / image layer schema。
  - Google Fonts standard batch / IRIAM title font parity。
  - local font loading after user account / preferences foundation。
  - preset typography refinement。
- Account / monetization:
  - user account / preferences foundation。
  - paid plan / quota foundation。
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
