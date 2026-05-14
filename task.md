# task.md

このファイルは現在の運用タスクだけを置く。完了済みの詳細ログ、比較メモ、長い経緯は PR 本文か `docs/archive` に寄せる。

## 現在の前提

- 作業は `main` 直ではなく feature branch / worktree で行う。
- 意味のある実装後は、このファイルに実装内容、検証、必要な幅別確認を残す。
- UI 変更時の確認幅は `390 / 820 / 1024 / 1280 / 1366px` を基本にする。
- 2026-05 の完了済み詳細ログは `docs/archive/TASK_HISTORY_2026-05.md` を参照する。
- PR #86 `[codex] Align portal entry freeze copy` から PR #102 `[codex] Polish SNS handoff accessibility copy` まで、`main` / `origin/main` に merge 済み。
- PR #99 の merge commit は `354d02bad0a0136f1ed43afd58f0e791e318a9fc`。
- PR #100 の merge commit は `f44618b0f8ecb1e265c65f409771f4a0e37493c2`。
- PR #101 の merge commit は `f9df381dc091d8d9369b900eead3bba9034978e4`。
- PR #102 の merge commit は `bd9119aa0e4437e950b6c71ddeca5eaced192e7c`。
- PR #103 `[codex] Clean up task board after PR102` は `main` / `origin/main` に merge 済み。merge commit は `1e4e4931fb5050d99e5a967a9817ffaf8dbd8402`。
- PR #104 `[codex] Clean up file name sanitize helpers` は `main` / `origin/main` に merge 済み。merge commit は `9b6bc17a136cc948760fb3c96530649a4406f820`。
- PR #105 `[codex] Clamp thumbnail to SNS handoff payload` は `main` / `origin/main` に merge 済み。merge commit は `edafcae28da0e90b3de852f917988774b497198d`。
- PR #106 `[codex] Add thumbnail variant body foundation` は `main` / `origin/main` に merge 済み。merge commit は `50bab4419b2d8389428a5f5b6995f470a6e83113`。
- PR #107 `[codex] Add thumbnail variant UI route` は `main` / `origin/main` に merge 済み。merge commit は `4d758f6062bfbd756b21fe640d95c81894e93bf9`。
- PR #108 `[codex] Plan thumbnail font candidates` は `main` / `origin/main` に merge 済み。merge commit は `8c6a3f67611c82df164b91c339b814aa00625b69`。
- PR #109 `[codex] Add thumbnail font loading foundation` は `main` / `origin/main` に merge 済み。merge commit は `6edca54f93144d691cfc4a1ebff927bd978ac9f8`。
- PR #110 `[codex] Add thumbnail Japanese font batch` は `main` / `origin/main` に merge 済み。merge commit は `f168bddc75c660ad1f718efc32c33d8224b591d6`。
- PR #111 `[codex] Add thumbnail English font batch` は `main` / `origin/main` に merge 済み。merge commit は `f30e3ee8f3a9358709789c91f43d1b39dfc72e0e`。
- PR #112 `[codex] Add thumbnail font UI categories` は `main` / `origin/main` に merge 済み。merge commit は `cb4a179667520e42d3299a78a5848115fe58a9e6`。
- PR #113 `[codex] Add thumbnail font search and recents` は `main` / `origin/main` に merge 済み。merge commit は `7879943e9d55841980d6a6d1e0d770ae66705aa9`。
- PR #114 `[codex] Apply thumbnail preset fonts` は `main` / `origin/main` に merge 済み。merge commit は `615d714de37a8e0124e4b27ac855419041933433`。
- static export RSC alias fix、production static serve final QA、user material management guard、Schedule Calendar input guard、SNS Split export boundary polish、Thumbnail quality preflight polish、Thumbnail docs drift cleanup、SNS handoff accessibility copy polish の詳細は `docs/archive/TASK_HISTORY_2026-05.md` の PR #91 / PR #92 / PR #94 / PR #96 / PR #97 / PR #99 / PR #101 / PR #102 欄を参照する。

## Active

- Thumbnail Editor usecase preset implementation: `endurance_stream` / 耐久配信
  - branch / worktree: `codex/thumbnail-endurance-stream-preset` / `.worktrees/thumbnail-endurance-stream-preset`
  - 前提確認: PR #115 `[codex] Plan thumbnail usecase preset mocks` は `MERGED`、merge commit `3d5e7dd24826dc95abbc46d511a844bb86c05800`。PR #116 `[codex] Add first stream thumbnail preset` は `MERGED`、merge commit `68bbcd48d71586b1891314f8bfd766abe19aa8bf`。PR #117 `[codex] Add anniversary stream thumbnail preset` は `MERGED`、merge commit `562163fe90546d4dee413947ffc0ec36a9068683`。3 commit とも `origin/main` に含まれることを確認済み。
  - 実装 preset id: `endurance_stream`
  - scope: `endurance_stream` / 耐久配信のみ。`lib/thumbnail-editor.ts` に preset body を追加し、`endurance_stream` を future batch candidate から実 preset へ昇格した。schema、canvas export、font loading helper、font search / recently used UI、Schedule Calendar、SNS Split Image Maker は変更していない。
  - 生成元: built-in `image_gen` mode。採用元は `C:\Users\taka\.codex\generated_images\019e25fa-8a8b-7e81-aa27-2be872628089\` に残置。装飾 asset は `remove_chroma_key.py` で chroma-key removal 後、`768 x 512` uniform-cell PNG に整形した。
    - background source: `ig_0f7951029f3eaeb7016a05a0fd1b248191b7e6b97dbfb15c58.png`
    - goal badge panel source: `ig_0f7951029f3eaeb7016a05a1409a908191a872f4302df661c8.png`
    - progress divider source: `ig_0f7951029f3eaeb7016a05a19345e48191829f01a869449a69.png`
    - challenge label plaque source: `ig_0f7951029f3eaeb7016a05a1c245108191937cce4badaa658b.png`
    - time badge source: `ig_0f7951029f3eaeb7016a05a1ed8758819195b96e92b7493904.png`
    - sharp frame accents source: `ig_0f7951029f3eaeb7016a05a22906808191ab7113002d6b56e4.png`
  - repo asset:
    - `public/assets/images/thumbnail-editor/phase5/endurance-stream-background-v1.png`
    - `public/assets/images/thumbnail-editor/decorations/phase5/endurance-stream-goal-badge-panel-lime-orange-uniform-cell.png`
    - `public/assets/images/thumbnail-editor/decorations/phase5/endurance-stream-progress-divider-lime-cyan-orange-uniform-cell.png`
    - `public/assets/images/thumbnail-editor/decorations/phase5/endurance-stream-challenge-label-plaque-lime-uniform-cell.png`
    - `public/assets/images/thumbnail-editor/decorations/phase5/endurance-stream-time-badge-orange-uniform-cell.png`
    - `public/assets/images/thumbnail-editor/decorations/phase5/endurance-stream-sharp-frame-accents-lime-cyan-uniform-cell.png`
  - contract / verification:
    - `node scripts/thumbnail-usecase-endurance-stream-preset-contract.mjs` PASS
    - `node scripts/thumbnail-preset-discovery-contract.mjs` PASS
    - `node scripts/thumbnail-preset-batch-readiness-contract.mjs` PASS
    - `node scripts/thumbnail-preset-variants-contract.mjs` PASS
    - `node scripts/thumbnail-font-policy-contract.mjs` PASS
    - `node scripts/thumbnail-material-assets-contract.mjs` PASS
    - `git diff --check` PASS（CRLF 変換 warning のみ）
    - `npm run lint` PASS
    - `npx tsc --noEmit` PASS
  - 幅別確認: dev server `http://localhost:3027/tools/thumbnail-editor`、Playwright + Chrome。`390 / 820 / 1024 / 1280 / 1366px` すべてで `耐久配信` preset card 表示、preset 選択可、canvas 表示、横 overflow `0`。確認用 screenshot は ignored path `output/playwright/thumbnail-endurance-stream-widths/endurance-stream-*.png`。canvas pixel capture は `output/playwright/thumbnail-endurance-stream-widths/endurance-stream-canvas-pixels-1280x720.png`。

## Freeze closeout state

- Schedule Calendar / Thumbnail Editor / SNS Split Image Maker の freeze 前 final QA は PR #92 で完了済み。
- static export RSC alias は PR #91 で `postbuild` 生成と `--check` 検証が入っている。
- task board closeout は PR #93 / PR #95 / PR #98 / PR #100 で完了済み。
- Thumbnail Editor user material library management v1 は PR #94 で完了済み。
- Schedule Calendar input length / copy guard は PR #96 で完了済み。
- SNS Split Image Maker export boundary polish は PR #97 で完了済み。
- Thumbnail Editor quality guard export-preflight polish は PR #99 で完了済み。
- Thumbnail Editor docs drift cleanup は PR #101 で完了済み。
- SNS Split handoff accessibility copy polish は PR #102 で完了済み。
- PR #92 の production static serve final QA では、`1024px` の `/tools` と3ツールで dotted `__next.tools*.txt` が 200 / 304、`1280px` / `1366px` で `__next.*.txt` の 400+ response なし。

## Freeze 後の現行境界

### Schedule Calendar

- freeze 済み:
  - 月 / 週 / 日表示、予定管理、投稿補助、予定一覧、設定、バックアップ / 復元。
  - `localStorage` version `2` の保存 payload と、旧形式読み込みの normalizer。
  - undo toast、投稿補助テンプレート、保存済みハッシュタグセット、input length / copy guard、Schedule -> Thumbnail / SNS Split handoff。
- freeze 後候補:
  - Google Calendar 連携、ログイン / サーバー同期、シリーズ一括編集、例外日、週間予定画像そのものの生成。

### Thumbnail Editor

- freeze 済み:
  - 用途別プリセットを選び、文字と立ち絵を差し替え、品質を確認して PNG / JPEG 1枚を書き出す体験。
  - 登録済み装飾素材を追加する軽い素材パネル。
  - user material library UI v1 は、画像本体を IndexedDB に置き、draft / localStorage には軽量 ref を残す境界まで完了済み。
  - user material library management v1 は、容量上限、読み込み不能 fallback、再追加 / 整理導線の最小 UI まで完了済み。
  - preset discovery、partial preset apply、user material storage boundary、font fallback、preset batch readiness、quality guard は contract / helper 境界まで固定済み。
  - quality guard export-preflight polish は、低透明度テキスト hint、未解決 user material warning、短い export summary まで完了済み。
  - Schedule Calendar 由来の予定テキスト handoff と、Thumbnail -> SNS Split の IndexedDB 一時画像 handoff。
- freeze 後候補:
  - 縦長 / 正方形 variant body、font asset 追加、preset batch 本体追加。
  - crop 仕様、text / image layer schema、public asset / font 追加は別PRで明示的に扱う。

### SNS Split Image Maker

- freeze 済み:
  - X向け `2分割 / 3分割 / 4分割`。
  - メイン画像 + 追加画像 / フレーム、境界調整、投稿順 `split_1 -> split_n` の個別 PNG / JPEG export。
  - draft metadata は `localStorage`、画像本体は IndexedDB に分離。
  - Schedule Calendar 由来では告知文メモとファイル名候補だけを受け取り、Thumbnail Editor 由来では一時画像を `base` として受け取る。
- freeze 後候補:
  - ZIP 出力、X 以外の比率、複数形式の大規模 export、重い onboarding。

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
