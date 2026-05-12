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

- core UX の freeze 条件を決める。
- 初回例、操作 guard、出力後の次アクションを軽く整える。
- export 前確認を必要最小限にする。
- ZIP 出力、X 以外の比率、複数形式は後続候補として分ける。

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
