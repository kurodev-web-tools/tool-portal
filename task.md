# task.md

このファイルは現在の運用タスクだけを置く。完了済みの詳細ログ、比較メモ、長い経緯は PR 本文か `docs/archive` に寄せる。

## 現在の前提

- 作業は `main` 直ではなく feature branch / worktree で行う。
- 意味のある実装後は、このファイルに実装内容、検証、必要な幅別確認を残す。
- UI 変更時の確認幅は `390 / 820 / 1024 / 1280 / 1366px` を基本にする。
- Thumbnail Editor は「用途別プリセットを選んで、文字と立ち絵を差し替える VTuber 向けサムネ組み立てツール」として維持する。
- Thumbnail Editor では、ペイントツール / Canva 的な汎用制作ツールに見えすぎる文言や導線を増やさない。

## この後の順序

1. Thumbnail Editor の残設計を整理する。
   - variant / partial apply / 素材ライブラリ / font / preset batch の順序と境界を固定する。
   - 先に contract を置ける単位へ分ける。
2. Thumbnail Editor の `preset variants` を設計する。
   - 縦横、用途、canvas size、既存 preset id との関係を決める。
   - schema 変更が必要かどうかを先に判断する。
3. Thumbnail Editor の `partial preset apply` を設計する。
   - 文字レイヤー、立ち絵レイヤー、背景 / 装飾 / 色だけをどう守って適用するか決める。
   - 一括配置、自動分割、複数選択に見える表現は入れない。
4. Thumbnail Editor の共通素材ライブラリを設計する。
   - ユーザー追加素材は IndexedDB など画像向けの保管を前提にする。
   - localStorage へ画像本体を詰めない。
   - delete / replace / 容量上限 / 復旧不能時の表示を決める。
5. Thumbnail Editor の font policy を決める。
   - 外部 CDN / font 追加は原則しない。
   - 使うなら self-host / repo 同梱 / fallback の範囲を先に決める。
6. Thumbnail Editor の preset batch を追加検討する。
   - 候補: 初配信、記念配信、耐久配信、歌枠、雑談、ゲーム実況、告知、切り抜き。
   - preset 本体の変更は、variant / partial apply の方針が固まってから行う。
7. Thumbnail Editor の quality guard expansion を追加検討する。
   - warning / hint / ok の軽い品質確認だけを増やす。
   - 自動修正、AI生成、重いチェックリスト化、素材 / preset 本体変更は入れない。
8. Schedule Calendar と SNS Split Image Maker の仕上げに戻る。
   - Schedule Calendar から Thumbnail Editor への引き継ぎ方を先に固定する。
   - SNS Split Image Maker は output UX と freeze 条件を先に詰める。

## Active

### P0: task.md の運用整理

- 状態: done
- 目的:
  - `task.md` を履歴ログではなく、次に進むための軽い作業ボードに戻す。
  - Thumbnail Editor の残作業順を先頭で読めるようにする。
- 完了条件:
  - 完了済みの詳細ログが本文の主役になっていない。
  - Thumbnail Editor の次順序が contract-first で読める。
  - Schedule Calendar / SNS Split Image Maker の残作業が混ざりすぎていない。
  - `git diff --check` を通す。
- 実施内容:
  - 完了済みの長い実装ログを本文から外し、現在の前提、次順序、Active、各ツールの残タスクへ再構成した。
  - Thumbnail Editor の次順序を `残設計 -> preset variants -> partial preset apply -> common material library -> font policy -> preset batch -> 他ツール仕上げ` に整理した。
  - UI / code / contract / asset / preset 本体は変更していない。
- 検証:
  - `git diff --check` PASS。
  - UI 変更なしのため幅別確認は未実施。

### P1: Thumbnail Editor 残設計の切り分け

- 状態: done
- 目的:
  - compact guidance 追加の次に、実装順を崩さず大きい設計を安全な PR 単位へ分割する。
  - Thumbnail Editor を「用途別プリセットを選んで、文字と立ち絵を差し替える VTuber 向けサムネ組み立てツール」として維持する。
- 具体化した順序:
  1. `preset variants`
  2. `partial preset apply`
  3. `common material library`
  4. `font policy`
  5. `preset batch`
  6. `quality guard expansion`
- 詳細メモ:
  - `docs/future/THUMBNAIL_EDITOR_NEXT_PR_SCOPE.md`
- 次PR候補:
  - P1: `preset variants`
    - 目的: 横長 / 縦長 / 正方形などの出力先差分を、既存 preset を壊さず metadata / family として扱う境界を決める。
    - 入れるもの: variant id、canvas size、用途、既存 preset id との関係、discovery / recent / favorite への影響 contract。
    - 入れないもの: preset 本体変更、asset 追加、schema 変更、crop 仕様変更。
    - contract-first: `thumbnail-preset-discovery-contract.mjs` と新規候補 `thumbnail-preset-variants-contract.mjs`。
    - 変更可: `lib/thumbnail-editor.ts`、該当 contract、必要最小限の `components/thumbnail-editor/ThumbnailEditorApp.tsx`、`task.md`。
    - 変更不可: `public/assets/images/thumbnail-editor/**`、preset 背景 / 装飾 asset、Schedule Calendar / SNS Split Image Maker 実装。
  - P2: `partial preset apply`
    - 目的: 入力済みの文字と立ち絵を守りながら、背景 / 装飾 / 色だけを安全に差し替える。
    - 入れるもの: 保持対象、上書き対象、確認UIが必要な条件、即時適用してよい条件。
    - 入れないもの: 複数選択、一括配置、自動分割、AI生成、crop 仕様変更、schema 変更。
    - contract-first: `thumbnail-preset-apply-safety-contract.mjs`、`thumbnail-standee-placement-contract.mjs`。
    - 変更可: `lib/thumbnail-editor.ts`、`components/thumbnail-editor/ThumbnailEditorApp.tsx`、該当 contract、`task.md`。
    - 変更不可: `public/assets/images/thumbnail-editor/**`、素材ライブラリ登録、Schedule Calendar / SNS Split Image Maker 実装。
  - P3: `common material library`
    - 目的: project-bound material と user-added material を分け、画像本体を localStorage に置かない storage boundary を決める。
    - 入れるもの: IndexedDB 前提、delete / replace / 容量上限 / 復旧不能時表示、既存 registered material 互換。
    - 入れないもの: 新規 asset 追加、素材ライブラリ登録変更、preset 初期 layer への自動挿入、AI生成。
    - contract-first: `thumbnail-material-assets-contract.mjs`。
    - 変更可: `lib/thumbnail-editor.ts`、`components/thumbnail-editor/ThumbnailEditorApp.tsx`、storage helper、該当 contract、`task.md`。
    - 変更不可: `public/assets/images/thumbnail-editor/**` の新規追加、preset 本体、Schedule Calendar / SNS Split Image Maker 実装。
  - P4: `font policy`
    - 目的: VTuber サムネ向けの文字品質を上げる前に、font 追加可否と fallback を決める。
    - 入れるもの: 既存fontで進める条件、追加する場合の self-host / repo 同梱 / license / fallback 条件。
    - 入れないもの: 外部 CDN / Google Fonts 新規参照、font asset 追加、preset 本体 font 差し替え、UI文言変更。
    - contract-first: font fallback、canvas rendering、外部 network 非依存の確認候補。
    - 変更可: `docs/future/**` または既存 design doc の policy section、実装PRでは `lib/thumbnail-editor.ts` と最小 contract、`task.md`。
    - 変更不可: `public/fonts/**` などの新規 font asset、外部 CDN 設定、preset 本体、Schedule Calendar / SNS Split Image Maker 実装。
  - P5: `preset batch`
    - 目的: 初配信、記念配信、耐久配信、歌枠、雑談、ゲーム実況、告知、切り抜きなどの追加候補を実装可能な batch に分ける。
    - 入れるもの: 追加候補の優先順、必要 asset、必要 variant、必要 text layer 名、既存 preset と重複しない役割。
    - 入れないもの: preset 本体変更、背景 / 装飾 asset 追加、imagegen、UI への大量追加。
    - contract-first: 新規候補 `thumbnail-preset-batch-readiness-contract.mjs`。
    - 変更可: `docs/future/**`、実装PRでは `lib/thumbnail-editor.ts` と batch contract、`task.md`。
    - 変更不可: variant / partial apply 未確定状態での preset 本体、`public/assets/images/thumbnail-editor/**`、schema、Schedule Calendar / SNS Split Image Maker 実装。
  - P6: `quality guard expansion`
    - 目的: 文字の可読性、立ち絵の見切れ、書き出し前確認を warning / hint として最小拡張する。
    - 入れるもの: selected layer と overall summary の追加 warning / hint、短文 copy、draft 非 mutation。
    - 入れないもの: 自動修正、AI生成、モーダル型チュートリアル、preset / material / asset / schema 変更。
    - contract-first: `thumbnail-quality-guard-contract.mjs`、`thumbnail-standee-placement-contract.mjs`。
    - 変更可: `lib/thumbnail-editor.ts`、`components/thumbnail-editor/ThumbnailEditorApp.tsx`、該当 contract、`task.md`。
    - 変更不可: preset 本体、`public/assets/images/thumbnail-editor/**`、素材ライブラリ登録、Schedule Calendar / SNS Split Image Maker 実装。
- 入れないもの:
  - 新機能の実装。
  - UI文言変更。
  - preset 本体の追加。
  - asset 追加。
  - crop 仕様変更。
  - text layer / image layer schema 変更。
  - 素材ライブラリ登録変更。
  - 外部 CDN / フォント追加。
  - AI生成。
  - Schedule Calendar / SNS Split Image Maker の実装変更。
- 実施内容:
  - PR #74 が `main` / `origin/main` に merge 済みで、merge commit `e8769f6` が `origin/main` に含まれることを確認した。
  - `origin/main` 起点で `codex/thumbnail-editor-pr-scope-plan` / `.worktrees/thumbnail-editor-pr-scope-plan` を作成した。
  - 次PR順序を `preset variants -> partial preset apply -> common material library -> font policy -> preset batch -> quality guard expansion` に固定した。
  - 各候補の目的、入れるもの、入れないもの、contract-first 確認、変更可 / 不可範囲、優先度を `docs/future/THUMBNAIL_EDITOR_NEXT_PR_SCOPE.md` に整理した。
  - UI / code / contract / asset / preset 本体は変更していない。
- 検証:
  - `git diff --check` PASS。LF -> CRLF warning のみ。
  - UI 変更なしのため、`390 / 820 / 1024 / 1280 / 1366px` の幅別確認は不要。

### P1: Thumbnail Editor preset variants

- 状態: done
- 目的:
  - 横長 / 縦長 / 正方形などの出力先差分を、既存 preset id を壊さず metadata / family / canvas size の土台として扱えるようにする。
  - 「用途別プリセットを選んで、文字と立ち絵を差し替える VTuber 向けサムネ組み立てツール」という見え方を維持する。
- 実施内容:
  - PR #75 `[codex] Document thumbnail editor next PR scope` が `main` / `origin/main` に merge 済みで、merge commit `a922c09` が `origin/main` に含まれることを確認した。
  - `origin/main` 起点で `codex/thumbnail-preset-variants` / `.worktrees/thumbnail-preset-variants` を作成した。
  - 新規 `scripts/thumbnail-preset-variants-contract.mjs` を追加し、RED (`thumbnailPresetVariants` 未定義) を確認してから実装した。
  - `lib/thumbnail-editor.ts` に `landscape-16-9` / `portrait-9-16` / `square-1-1` の variant metadata、既存 preset との relation、default variant ref、canvas resolver、軽量 variant ref normalizer を追加した。
  - 既存 preset は全て横長 16:9 を default variant とし、縦長 / 正方形は metadata のみで既存 preset body 対応済みとは扱わない。
  - discovery は従来の `recentPresetIds` / `favoritePresetIds` 互換を維持し、variant 参照は `presetId` + `variantId` の軽い ref だけを正規化する。
  - preset 本体、asset、text / image layer schema、crop、素材ライブラリ登録、Schedule Calendar / SNS Split Image Maker 実装は変更していない。
- 検証:
  - `node scripts/thumbnail-preset-variants-contract.mjs` PASS。
  - `node scripts/thumbnail-preset-discovery-contract.mjs` PASS。
  - `node scripts/thumbnail-preset-apply-safety-contract.mjs` PASS。
  - `node scripts/thumbnail-layer-management-contract.mjs` PASS。
  - `node scripts/tool-handoff-contract.mjs` PASS。
  - `git diff --check` PASS。LF -> CRLF warning のみ。
  - `npm run lint` PASS。
  - `npx tsc --noEmit` PASS。
  - UI 表示変更なしのため、`390 / 820 / 1024 / 1280 / 1366px` の幅別確認は不要。`ThumbnailEditorApp.tsx` は discovery state の初期値型合わせのみ。

### P2: Thumbnail Editor partial preset apply

- 状態: done
- 目的:
  - 文字と立ち絵 / user-added image layer を守りながら、preset 初期の背景 / 装飾 / 色だけを安全に差し替える最小境界を作る。
  - 既存 preset id / default variant / discovery / recent / favorite / handoff contract を壊さない。
- 実施内容:
  - PR #76 `[codex] Add thumbnail preset variants contract` が `main` / `origin/main` に merge 済みで、merge commit `71459b0` が `origin/main` に含まれることを確認した。
  - `origin/main` 起点で `codex/thumbnail-partial-preset-apply` / `.worktrees/thumbnail-partial-preset-apply` を作成した。
  - `scripts/thumbnail-preset-apply-safety-contract.mjs` に partial apply の contract を追加し、RED (`applyThumbnailPresetPartial` 未定義) を確認してから実装した。
  - `lib/thumbnail-editor.ts` に `applyThumbnailPresetPartial(draft, targetPresetId)` を追加し、edited draft では主要テキスト値と user-added image layer を保持しつつ、target preset 初期 layer へ差し替えるようにした。
  - pristine draft は target preset 初期 draft へそのまま切り替え、source preset の文字や user image を持ち越さない。
  - user-added image layer は `data:image/` 由来または `素材:` layer name の画像レイヤーに限定し、crop metadata と image layer schema は変更していない。
  - `ThumbnailEditorApp.tsx` の既存 carryover apply 経路だけを partial apply helper に差し替えた。UI 表示文言は変更していない。
  - preset 本体、asset、text / image layer schema、crop 仕様、素材ライブラリ登録、Schedule Calendar / SNS Split Image Maker 実装は変更していない。
  - 実装で確定した境界を `docs/future/THUMBNAIL_EDITOR_NEXT_PR_SCOPE.md` に追記した。
- 検証:
  - `node scripts/thumbnail-preset-apply-safety-contract.mjs` PASS。
  - `node scripts/thumbnail-preset-variants-contract.mjs` PASS。
  - `node scripts/thumbnail-layer-management-contract.mjs` PASS。
  - `node scripts/thumbnail-standee-placement-contract.mjs` PASS。
  - `node scripts/tool-handoff-contract.mjs` PASS。
  - `git diff --check` PASS。LF -> CRLF warning のみ。
  - `npm run lint` PASS。
  - `npx tsc --noEmit` PASS。
  - UI 表示変更なしのため、`390 / 820 / 1024 / 1280 / 1366px` の幅別確認は不要。

### P3: Thumbnail Editor common material library contract

- 状態: done
- 目的:
  - project-bound material と user-added material の責務を分ける。
  - user-added material の画像本体を localStorage に置かず、IndexedDB など画像向け storage を前提にした軽量 ref 境界を固定する。
  - 既存 registered material / preset / partial apply / recent / favorite / handoff 互換を壊さない。
- 実施内容:
  - PR #77 `[codex] Add thumbnail partial preset apply contract` が `main` / `origin/main` に merge 済みで、merge commit `c2f953f` が `origin/main` に含まれることを確認した。
  - `origin/main` 起点で `codex/thumbnail-common-material-contract` / `.worktrees/thumbnail-common-material-contract` を作成した。
  - `scripts/thumbnail-material-assets-contract.mjs` と `scripts/thumbnail-preset-apply-safety-contract.mjs` を先に更新し、RED (`thumbnailProjectMaterialBoundary` 未export / `normalizeThumbnailUserMaterialRef` 未実装) を確認してから実装した。
  - `lib/thumbnail-editor.ts` に project-bound material boundary、user material storage policy、軽量 `ThumbnailUserMaterialRef`、ref normalizer、user material layer factory、delete / replace / load failure fallback helper を追加した。
  - user-added material layer は optional `materialRef` を持つ image layer の非破壊拡張に留め、draft `src` へユーザー画像本体を永続化しない。
  - partial preset apply で `materialRef` を持つ user-added material layer が保持される contract を追加した。
  - 既存 material 登録、asset、preset 本体、text / image layer schema の既存キー、crop 仕様、Schedule Calendar / SNS Split Image Maker 実装は変更していない。
  - 実装で確定した storage boundary を `docs/future/THUMBNAIL_EDITOR_NEXT_PR_SCOPE.md` に追記した。
- 検証:
  - `node scripts/thumbnail-material-assets-contract.mjs` PASS。
  - `node scripts/thumbnail-preset-apply-safety-contract.mjs` PASS。
  - `node scripts/thumbnail-preset-variants-contract.mjs` PASS。
  - `node scripts/thumbnail-layer-management-contract.mjs` PASS。
  - `node scripts/tool-handoff-contract.mjs` PASS。
  - `git diff --check` PASS。LF -> CRLF warning のみ。
  - `npm run lint` PASS。
  - `npx tsc --noEmit` PASS。
  - UI 表示変更なしのため、`390 / 820 / 1024 / 1280 / 1366px` の幅別確認は不要。

### P4: Thumbnail Editor font policy contract

- 状態: done
- 目的:
  - 外部 CDN / Google Fonts / 新規 font asset に依存せず、editor 全体の font policy と fallback 境界を固定する。
  - 既存 `fontFamily` が未知、空、unsafe な値でも draft normalize / canvas export / editor 表示が破綻しない前提を作る。
  - 既存 preset / text layer / image layer / material / partial apply / handoff 互換を壊さない。
- 実施内容:
  - PR #78 `[codex] Add thumbnail common material storage contract` が `main` / `origin/main` に merge 済みで、merge commit `8a961dc` が `origin/main` に含まれることを確認した。
  - `origin/main` 起点で `codex/thumbnail-font-policy-contract` / `.worktrees/thumbnail-font-policy-contract` を作成した。
  - 新規 `scripts/thumbnail-font-policy-contract.mjs` を追加し、RED (`thumbnailFontPolicy` 未定義) を確認してから実装した。
  - `lib/thumbnail-editor.ts` に `thumbnailFontPolicy`、`thumbnailFontFallbackFamily`、`thumbnailCanvasFontFallbackStack`、`normalizeThumbnailFontFamily()`、`getThumbnailCanvasFontFamily()`、`getThumbnailCanvasFont()` を追加した。
  - known font は保持し、未知 / 空 / URL / `@import` / comma stack / quote を含む unsafe `fontFamily` は `Noto Sans JP` へ fallback するようにした。
  - `normalizeThumbnailDraft` と canvas text rendering は同じ font helper を使い、canvas export 側は fallback stack を持つ font shorthand を使うようにした。
  - 実装で確定した font policy boundary を `docs/future/THUMBNAIL_EDITOR_NEXT_PR_SCOPE.md` に追記した。
  - preset 本体、asset、font asset、外部 CDN、text / image layer schema、crop、素材ライブラリ登録、Schedule Calendar / SNS Split Image Maker 実装は変更していない。
- 検証:
  - `node scripts/thumbnail-font-policy-contract.mjs` PASS。
  - `node scripts/thumbnail-material-assets-contract.mjs` PASS。
  - `node scripts/thumbnail-preset-apply-safety-contract.mjs` PASS。
  - `node scripts/thumbnail-preset-variants-contract.mjs` PASS。
  - `node scripts/thumbnail-layer-management-contract.mjs` PASS。
  - `node scripts/tool-handoff-contract.mjs` PASS。
  - `git diff --check` PASS。LF -> CRLF warning のみ。
  - `npm run lint` PASS。
  - `npx tsc --noEmit` PASS。
  - UI 表示 / layout / 文言変更なしのため、`390 / 820 / 1024 / 1280 / 1366px` の幅別確認は不要。

### P5: Thumbnail Editor preset batch readiness contract

- 状態: done
- 目的:
  - 初配信、記念配信、耐久配信、歌枠、雑談、ゲーム実況、告知、切り抜きの追加候補を、実 preset 本体や asset を増やす前に contract-first で固定する。
  - 既存 preset / variant / partial apply / material / font policy / handoff 互換を壊さず、「用途別プリセットを選んで、文字と立ち絵を差し替える VTuber 向けサムネ組み立てツール」という見え方を維持する。
- 実施内容:
  - PR #79 `[codex] Add thumbnail font policy contract` が `main` / `origin/main` に merge 済みで、merge commit `a76bf99` が `origin/main` に含まれることを確認した。
  - `origin/main` 起点で `codex/thumbnail-preset-batch-readiness` / `.worktrees/thumbnail-preset-batch-readiness` を作成した。
  - 新規 `scripts/thumbnail-preset-batch-readiness-contract.mjs` を追加し、RED (`thumbnailPresetBatchCandidates` 未export) を確認してから実装した。
  - `lib/thumbnail-editor.ts` に preset batch 候補 metadata、readiness policy、`getThumbnailPresetBatchReadiness()`、`getThumbnailPresetBatchReadinessSummary()` を追加した。
  - 候補 id は `first_stream` / `anniversary_stream` / `endurance_stream` / `karaoke_stream` / `chat_stream` / `gameplay_stream` / `notice_stream` / `highlight_clip` とし、既存 preset id と衝突しない形にした。
  - 各候補に用途、推奨 variant、必要 text layer role、必要 material category、依存 contract を持たせた。
  - readiness helper は warning-only / checks-only とし、自動修正、AI生成、asset 生成、preset body 生成、font asset 追加、material 登録変更を行わない。
  - 実装で確定した境界を `docs/future/THUMBNAIL_EDITOR_NEXT_PR_SCOPE.md` に追記した。
  - preset 本体、asset、font asset、外部 CDN、text / image layer schema、crop、素材ライブラリ登録、Schedule Calendar / SNS Split Image Maker 実装は変更していない。
- 検証:
  - `node scripts/thumbnail-preset-batch-readiness-contract.mjs` PASS。
  - `node scripts/thumbnail-font-policy-contract.mjs` PASS。
  - `node scripts/thumbnail-material-assets-contract.mjs` PASS。
  - `node scripts/thumbnail-preset-apply-safety-contract.mjs` PASS。
  - `node scripts/thumbnail-preset-variants-contract.mjs` PASS。
  - `node scripts/thumbnail-layer-management-contract.mjs` PASS。
  - `node scripts/tool-handoff-contract.mjs` PASS。
  - `git diff --check` PASS。LF -> CRLF warning のみ。
  - `npm run lint` PASS。
  - `npx tsc --noEmit` PASS。
  - UI 表示 / layout / 文言変更なしのため、`390 / 820 / 1024 / 1280 / 1366px` の幅別確認は不要。

### P6: Thumbnail Editor quality guard expansion

- 状態: done
- 目的:
  - warning / hint / ok の軽い品質確認のまま、文字の可読性と立ち絵 / 画像レイヤーの見切れ確認を最小拡張する。
  - selected layer guard、export-adjacent overall summary、preset batch readiness、variant、partial apply、material、font policy、handoff 互換を壊さない。
- 実施内容:
  - PR #80 `[codex] Add thumbnail preset batch readiness contract` が `main` / `origin/main` に merge 済みで、merge commit `86f9941` が `origin/main` に含まれることを確認した。
  - `origin/main` 起点で `codex/thumbnail-quality-guard-expansion` / `.worktrees/thumbnail-quality-guard-expansion` を作成した。
  - `scripts/thumbnail-quality-guard-contract.mjs` を先に拡張し、RED (`selected text readability hint exists`) を確認してから実装した。
  - `lib/thumbnail-editor.ts` に、長文 text layer の lightweight readability hint と user-added image / material image の crop hint を追加した。
  - overall summary は text layer と user-added image layer だけを対象にし、preset 初期の背景 / 装飾 / 立ち絵ガイド枠は過剰に注意表示しない。
  - `サムネ品質` / `注意 n件` / `品質チェックOK`、warning / hint / ok tone、自動修正なし、draft 非 mutation を contract で確認した。
  - preset 本体、asset、font asset、外部 CDN、text / image layer schema、crop 仕様、素材ライブラリ登録、Schedule Calendar / SNS Split Image Maker 実装は変更していない。
  - 実装で確定した境界を `docs/future/THUMBNAIL_EDITOR_NEXT_PR_SCOPE.md` に追記した。
- 検証:
  - `node scripts/thumbnail-quality-guard-contract.mjs` PASS。
  - `node scripts/thumbnail-preset-batch-readiness-contract.mjs` PASS。
  - `node scripts/thumbnail-font-policy-contract.mjs` PASS。
  - `node scripts/thumbnail-material-assets-contract.mjs` PASS。
  - `node scripts/thumbnail-preset-apply-safety-contract.mjs` PASS。
  - `node scripts/thumbnail-preset-variants-contract.mjs` PASS。
  - `node scripts/thumbnail-layer-management-contract.mjs` PASS。
  - `node scripts/tool-handoff-contract.mjs` PASS。
  - `git diff --check` PASS。LF -> CRLF warning のみ。
  - `npm run lint` PASS。
  - `npx tsc --noEmit` PASS。
  - UI 表示 / layout / 文言変更なしのため、`390 / 820 / 1024 / 1280 / 1366px` の幅別確認は不要。既存 panel / export summary の表示経路は変えず、shared quality guard helper の返す短文 item だけを増やした。

### P7: Schedule Calendar freeze readiness audit

- 状態: done
- 目的:
  - PR #81 merge 後の `origin/main` 起点で、Schedule Calendar の freeze 前安定性、既存データ、localStorage migration、主要幅、入力導線のリスクを確認する。
  - 大きな新機能や UI redesign は入れず、明確な軽微バグだけ最小修正する。
- 実施内容:
  - PR #81 `[codex] Add thumbnail quality guard expansion` が `main` / `origin/main` に merge 済みで、merge commit `c83649c` が `origin/main` 先頭にあることを確認した。
  - `origin/main` 起点で `codex/schedule-calendar-freeze-readiness` / `.worktrees/schedule-calendar-freeze-readiness` を作成した。
  - Schedule Calendar の現状実装、README、stability doc、future tasks、`task.md` の該当箇所を確認した。
  - 既存の localStorage key `v-streamer-tools:schedule-calendar-events:v1` と payload version `2` は変更していない。
  - 旧データや import で `endTime: "24:00"` が残っている場合、ブラウザの時刻入力で表示できる `23:59` へ migration 時に丸める最小修正を入れた。
  - `25:00` / `99:99` などの不正時刻は `20:00 - 21:00` の安全な範囲へ fallback するようにした。
  - 番組タイトル、メモ・備考、告知文メモ、カテゴリ、プラットフォーム、開始 / 終了時刻は既存フォームと独自メニューで編集導線があることを確認した。
  - Thumbnail Editor / SNS Split Image Maker / thumbnail asset / font / portal shell は変更していない。
- 幅別確認:
  - `390px`: mobile integrated UI。下部タブ表示、右パネルタブ非表示、FAB からフォームを開くとタイトル / メモ / カテゴリ / プラットフォーム / 保存が表示。console error 0。
  - `820px`: mobile integrated UI。下部タブ表示、右パネルタブ非表示、FAB からフォームを開くとタイトル / メモ / カテゴリ / プラットフォーム / 保存が表示。console error 0。
  - `1024px`: tablet two-pane UI。右パネルタブ表示、予定管理フォーム内のタイトル / メモ / カテゴリ / プラットフォームが表示。console error 0。
  - `1280px`: desktop two-pane UI。右パネルタブ表示、予定管理フォーム内のタイトル / メモ / カテゴリ / プラットフォームが表示。console error 0。
  - `1366px`: desktop two-pane UI。右パネルタブ表示、予定管理フォーム内のタイトル / メモ / カテゴリ / プラットフォームが表示。console error 0。
- 検証:
  - RED: `node scripts/schedule-calendar-storage-contract.mjs` は `24:00` がそのまま残る既存挙動で失敗することを確認。
  - GREEN: `node scripts/schedule-calendar-storage-contract.mjs` PASS。
  - Browser regression on `http://localhost:3002/tools/schedule-calendar/`: `390 / 820 / 1024 / 1280 / 1366px` PASS。
  - `npm run lint` PASS。
  - `npx tsc --noEmit` PASS。
  - `git diff --check` PASS。LF -> CRLF warning のみ。
  - `docs/SCHEDULE_CALENDAR_STABILITY_CHECK_2026-04-28.md` に freeze readiness の確認結果を追記。

### P8: SNS Split Image Maker freeze readiness audit

- 状態: done
- 目的:
  - PR #82 merge 後の `origin/main` 起点で、SNS Split Image Maker の freeze 前安定性、draft persistence / IndexedDB、handoff、主要幅、export 導線のリスクを確認する。
  - 大きな新機能や UI redesign は入れず、明確な軽微バグだけ最小修正する。
- 実施内容:
  - PR #82 `[codex] Check schedule calendar freeze readiness` が `main` / `origin/main` に merge 済みで、merge commit `6418032` が `origin/main` 先頭にあることを確認した。
  - `origin/main` 起点で `codex/sns-split-freeze-readiness` / `.worktrees/sns-split-freeze-readiness` を作成した。
  - SNS Split Image Maker の現状実装、design doc、Schedule Calendar README の handoff contract、`task.md` の該当箇所を確認した。
  - draft metadata は `localStorage` key `v-streamer-tools:sns-split-image-maker:draft:v1`、画像本体は IndexedDB `v-streamer-tools:sns-split-image-maker` / `images` store に分離されていることを確認した。
  - Thumbnail Editor からの画像 handoff は IndexedDB の一時 `imageStorageId` を読み、`base` 画像へ反映後に元キーを削除することをブラウザで確認した。
  - Schedule Calendar からの handoff は告知文メモ、日付、タイトル、ファイル名候補を反映し、画像本体は渡さないことをブラウザで確認した。
  - 出力はメイン画像未選択時に disabled、Thumbnail Editor handoff 後は有効化し、`split_1 -> split_4` の順で4枚出力した成功 toast が出ることを確認した。
  - 実装とずれていた page metadata / design doc の `2分割/4分割`・旧 `1+8/1+4` 前提を、現行の `2分割 / 3分割 / 4分割` と freeze 確認幅へ最小修正した。
  - Thumbnail Editor / Schedule Calendar 実装、thumbnail asset、font、portal shell は変更していない。
- 幅別確認:
  - `390px`: mobile edit UI。横スクロールなし、下部ナビ表示、入力エリア / 追加画像スロット / ファイル名 / disabled 保存導線が表示。console error / warn 0。
  - `820px`: mobile edit UI。横スクロールなし、下部ナビ表示、入力エリア / 追加画像スロット / ファイル名 / disabled 保存導線が表示。console error / warn 0。
  - `1024px`: desktop two-pane UI。横スクロールなし、プレビューと入力エリアが同時表示、header の画像保存と export panel が disabled。console error / warn 0。
  - `1280px`: desktop two-pane UI。横スクロールなし、プレビューと入力エリアが同時表示、header の画像保存と export panel が disabled。console error / warn 0。
  - `1366px`: desktop two-pane UI。横スクロールなし、プレビューと入力エリアが同時表示、Thumbnail handoff 後の export enabled / success toast を確認。console error / warn 0。
- リスク / 次アクション:
  - ZIP 出力、X 以外の比率、複数形式の大規模 export、重い onboarding は freeze 後の別PR候補に留める。
  - 連続ダウンロードのブラウザ挙動は環境差があるため、freeze 前は「順番表示 + 成功 toast + 個別 download」の範囲で固定する。
- 検証:
  - RED: `node scripts/sns-split-image-maker-contract.mjs` は page metadata が `3分割` を含まない既存挙動で失敗することを確認。
  - GREEN: `node scripts/sns-split-image-maker-contract.mjs` PASS。
  - `node scripts/tool-handoff-contract.mjs` PASS。
  - Browser regression on `http://localhost:3005/tools/sns-split-image-maker/`: `390 / 820 / 1024 / 1280 / 1366px` PASS。
  - Schedule Calendar -> SNS Split Image Maker handoff PASS。
  - Thumbnail Editor -> SNS Split Image Maker handoff PASS。
  - `npm run lint` PASS。
  - `npx tsc --noEmit` PASS。
  - `git diff --check` PASS。LF -> CRLF warning のみ。

### P9: Cross Tool handoff / storage / export policy freeze audit

- 状態: done
- 目的:
  - Schedule Calendar -> Thumbnail Editor -> SNS Split Image Maker の横断 handoff / storage / export policy を freeze 前に読める状態へ整理する。
  - 大きな新機能や UX redesign は入れず、contract / docs / 小さな drift guard に留める。
- 確認した handoff contract:
  - PR #83 `[codex] Check SNS split freeze readiness` は `main` / `origin/main` に merge 済みで、merge commit `87c3ef4` が `origin/main` 先頭にあることを確認した。
  - `origin/main` 起点で `codex/cross-tool-handoff-policy` / `.worktrees/cross-tool-handoff-policy` を作成した。
  - Schedule Calendar -> Thumbnail Editor: URL query は短い `handoff` token のみ。payload は `sessionStorage` key `v-streamer-tools:tool-handoff:v1:{token}` に置き、予定テキスト / 日時 / カテゴリ / プラットフォーム / 告知文 / ハッシュタグだけを渡す。画像本体や画像 ref は渡さない。
  - Schedule Calendar -> SNS Split Image Maker: URL query は `handoff` token と `preset=split-4`。payload は Schedule 由来の同じテキスト metadata のみで、SNS Split 側は告知文メモと `date + title + {n}` のファイル名候補へ反映する。
  - Thumbnail Editor -> SNS Split Image Maker: URL query は `handoff` token と `preset=split-4`。payload は `source: "thumbnail-editor"` / `target: "sns-split-image-maker"` / `imageStorageId` / title / date / category / platform / announcement text / hashtags / fileNameBase。描画済み PNG 相当の画像本体は `localStorage` へ置かず、SNS Split Image Maker の IndexedDB 画像 store へ一時保存する。
  - `readToolHandoff()` は token を `sessionStorage` から読み、読み取り後に payload を削除する single-use 境界。期限切れ、target 不一致、source 不一致、壊れた JSON、token 不一致は `null` にして通常起動へ戻す。
  - Thumbnail -> SNS の画像取得失敗、safe でない data URL、IndexedDB 読み込み失敗は handoff を適用せず通常起動へ戻し、一時 `imageStorageId` は削除を試みる。
- 確認した storage / export boundary:
  - Schedule Calendar の永続保存は `localStorage` key `v-streamer-tools:schedule-calendar-events:v1`、payload version `2`。
  - handoff payload は `sessionStorage` の一時データで TTL 30分。URL には本文、告知文、画像本体を載せない。
  - Thumbnail Editor の通常 export は PNG/JPEG 1枚。SNS Split へ渡すときだけ canvas を PNG 相当で描画し、SNS Split 側 IndexedDB へ一時保存する。
  - SNS Split Image Maker の draft metadata は `localStorage` key `v-streamer-tools:sns-split-image-maker:draft:v1`。画像本体は IndexedDB `v-streamer-tools:sns-split-image-maker` / `images` store。画像本体を `localStorage` に保存しない。
  - SNS Split Image Maker の export は現行の `split-2` / `split-3` / `split-4` に応じた個別 PNG/JPEG 出力。ZIP 出力、X 以外の比率、複数形式の大規模 export は今回入れない。
- 実施内容:
  - `scripts/tool-handoff-contract.mjs` に Schedule -> Thumbnail、Schedule -> SNS、Thumbnail -> SNS、URL query、single-use token、missing token、期限切れ、target/source 不一致、画像本体を URL / localStorage に載せない境界の contract を追加した。
  - `writeToolHandoff()` が `sessionStorage.setItem()` 失敗時に例外を外へ漏らさず `null` を返すようにし、既存呼び出し側のエラー表示 / 通常起動 fallback に乗るようにした。
  - `docs/SCHEDULE_CALENDAR_README.md`、`docs/design-thumbnail-editor.md`、`docs/design-sns-split-image-maker.md` の handoff / storage / data model 表現を現行実装へ同期した。
  - 各ツール本体の UX redesign、preset / asset / font、portal shell、storage schema の破壊的変更は行っていない。
- 検証:
  - RED: `node scripts/tool-handoff-contract.mjs` は `sessionStorage.setItem()` 例外が外へ漏れる既存挙動で失敗することを確認。
  - GREEN: `node scripts/tool-handoff-contract.mjs` PASS。
  - `node scripts/sns-split-image-maker-contract.mjs` PASS。
  - `node scripts/thumbnail-preset-apply-safety-contract.mjs` PASS。
  - `npm run lint` PASS。
  - `npx tsc --noEmit` PASS。
  - `git diff --check` PASS。LF -> CRLF warning のみ。
  - UI / layout 変更なしのため、`390 / 820 / 1024 / 1280 / 1366px` の幅別確認は不要。handoff contract / docs consistency を優先。

### P10: SNS Split Image Maker core UX freeze boundary

- 状態: done
- 目的:
  - PR #84 merge 後の `origin/main` 起点で、SNS Split Image Maker の入口導線、初回例、export 前 guard、handoff 成功後の次アクション、export boundary を freeze 前に読める状態にする。
  - UI redesign、大規模 export 拡張、storage schema 変更は入れない。
- 確認した core UX freeze 条件:
  - 初回起動はプリセット選択から入り、`2分割 / 3分割 / 4分割` のどれを開くかを選べる。
  - 編集画面の入力エリアでメイン画像を選び、必要なら追加画像と境界を調整する。
  - メイン画像未選択時は export button が disabled になり、直接実行されても `メイン画像を選択してから出力してください。` の警告で止まる。
  - Schedule Calendar handoff 後は告知文メモとファイル名候補だけを受け取り、次にメイン画像を選んで export する。
  - Thumbnail Editor handoff 後は受け取った画像をメイン画像として確認し、必要な追加画像や境界調整後に export する。
  - export 成功時は `split_1 -> split_n` の順と枚数を toast で返す。
  - ZIP 出力、X 以外の比率、複数形式の大規模 export は freeze 後候補に分ける。
- 実施内容:
  - PR #84 `[codex] Document cross-tool handoff policy` が `main` / `origin/main` に merge 済みで、merge commit `05aa368` が `origin/main` 先頭にあることを確認した。
  - `origin/main` 起点で `codex/sns-split-core-ux-freeze` / `.worktrees/sns-split-core-ux-freeze` を作成した。
  - `lib/sns-split-image-maker.ts` に `snsSplitFreezePolicy` を追加し、freeze 対象 preset、export format、メイン画像必須 guard、handoff 後 next action、後送り export 拡張を contract から読めるようにした。
  - `scripts/sns-split-image-maker-contract.mjs` に export guard、success toast、ZIP packaging 非導入、freeze docs の drift guard を追加した。
  - `docs/design-sns-split-image-maker.md` と `docs/SCHEDULE_CALENDAR_README.md` に freeze boundary と handoff 後の次アクションを追記した。
  - UI / layout / storage schema / export 機能本体、Thumbnail Editor / Schedule Calendar 実装、asset / font / portal shell は変更していない。
- 検証:
  - RED: `node scripts/sns-split-image-maker-contract.mjs` は `snsSplitFreezePolicy` 未定義、および design doc の `Freeze Boundary` 未記載で失敗することを確認。
  - GREEN: `node scripts/sns-split-image-maker-contract.mjs` PASS。
  - `node scripts/tool-handoff-contract.mjs` PASS。
  - `npm run lint` PASS。
  - `npx tsc --noEmit` PASS。
  - `git diff --check` PASS。LF -> CRLF warning のみ。
  - UI / layout / 表示文言変更なしのため、`390 / 820 / 1024 / 1280 / 1366px` の幅別確認は不要。contract / docs consistency を優先。

## Thumbnail Editor

### 固定済みの方向性

- ツールの見え方:
  - 用途別プリセットを選ぶ。
  - 文字を差し替える。
  - 立ち絵画像を追加 / 差し替えて配置する。
  - 最後に品質を確認して書き出す。
- 品質ガード:
  - `warning / hint / ok` のみにする。
  - `サムネ品質` / `注意 n件` / `品質チェックOK` の表現を壊さない。
  - 自動修正や AI 生成に見える文言を入れない。
- 変更禁止に近い領域:
  - crop 仕様。
  - text layer / image layer schema。
  - 既存 preset 本体。
  - 素材 asset と素材ライブラリ登録。

### 直近完了

- PR #72 `[codex] Clarify thumbnail editor panel guidance`
  - main / origin/main に merge 済み。
  - panel guidance の表現を軽く調整。
- PR #73 `[codex] Clarify thumbnail editor first flow guidance`
  - main / origin/main に merge 済み。
  - 初回操作で、preset selection -> text replacement -> standee replacement / placement -> export の流れが読めるように短文だけ調整。
- PR #74 `[codex] Organize task board for thumbnail editor order`
  - main / origin/main に merge 済み。
  - Thumbnail Editor の次順序を `task.md` 上で軽量に整理。

### 残タスク候補

- preset variants:
  - 横長 / 縦長 / 正方形など、用途と出力先の切り分けを決める。
  - 既存 preset を壊さず、追加単位を小さくする。
- partial preset apply:
  - レイヤーを保持したまま色や背景だけを変える導線を検討する。
  - 「一括自動制作」に見えないようにする。
- common material library:
  - user materials の登録、削除、置換、容量、復旧不能時の扱いを決める。
  - 画像本体は localStorage に置かない。
- font management:
  - VTuber サムネらしい書体選択をどう扱うか決める。
  - 外部 CDN 追加はしない。
- preset batch:
  - 初配信 / 記念配信 / 耐久配信などの追加候補を整理する。
  - variant / partial apply の仕様が固まるまで本体追加は待つ。
- quality guard expansion:
  - 文字の可読性、立ち絵の見切れ、書き出し前確認を必要最小限で拡張する。
  - 重い説明、チュートリアル、モーダル、チェックリスト化は避ける。

### Thumbnail Editor verification baseline

変更内容に応じて必要なものだけ選ぶ。

- `node scripts/thumbnail-quality-guard-contract.mjs`
- `node scripts/thumbnail-preset-apply-safety-contract.mjs`
- `node scripts/thumbnail-preset-discovery-contract.mjs`
- `node scripts/thumbnail-layer-management-contract.mjs`
- `node scripts/thumbnail-material-assets-contract.mjs`
- `node scripts/thumbnail-standee-placement-contract.mjs`
- `npm run lint`
- `npx tsc --noEmit`
- `git diff --check`
- `npm run build`

## Schedule Calendar

### 残タスク

- 仕上げ前の安定性確認。
  - 既存データ、localStorage migration、主要幅の表示を確認する。
- 入力導線の細部整理。
  - 番組タイトル、説明、カテゴリ、配信プラットフォームの編集しやすさ。
  - 文字数上限やカウンターが必要かを決める。
- Thumbnail Editor への引き継ぎ。
  - 週間予定画像をそのまま作るのか、Thumbnail Editor の preset 起点へ渡すのかを決める。

### Schedule Calendar verification baseline

- `npm run lint`
- `npx tsc --noEmit`
- `git diff --check`
- 必要に応じて幅別確認: `390 / 820 / 1024 / 1280 / 1366px`

## SNS Split Image Maker

### 残タスク

- core UX freeze 条件は P10 で固定済み。
- freeze 後候補として、ZIP 出力、X 以外の比率、複数形式 export を別PRで検討する。
- 連続ダウンロードのブラウザ差は、現行の個別PNG/JPEG + 順番表示 + success toast の範囲で運用し、必要なら後続で検証する。

### SNS Split Image Maker verification baseline

- `npm run lint`
- `npx tsc --noEmit`
- `git diff --check`
- UI 変更時は幅別確認を残す。

## Portal / Cross Tool

- tool portal の導線が各ツールの現在地と矛盾しないか確認する。
- Schedule Calendar -> Thumbnail Editor -> SNS Split Image Maker の流れを、必要になった段階で共通 doc に切り出す。
- storage policy、asset policy、export policy はツール横断で再利用できる形に寄せる。

## task.md 更新ルール

- Active には、今から作業するものと次に作業するものだけを置く。
- 完了済みの詳細ログは本文に溜めない。
- 長い調査結果、比較、過去ログは `docs/archive` か PR 本文に逃がす。
- 各タスクは以下だけ残す。
  - 目的。
  - 状態。
  - 次アクション。
  - 完了条件。
  - 検証結果。
- 「後でやるかもしれない」案は、Active ではなく各ツールの残タスク候補に置く。

## Archive / reference

- 2026-04 の履歴: `docs/archive/TASK_HISTORY_2026-04.md`
- 2026-05 の履歴: `docs/archive/TASK_HISTORY_2026-05.md`
- Schedule Calendar future tasks: `docs/future/SCHEDULE_CALENDAR_FUTURE_TASKS.md`
