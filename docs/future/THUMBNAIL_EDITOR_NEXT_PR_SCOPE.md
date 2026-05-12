# Thumbnail Editor Next PR Scope

## Purpose

Thumbnail Editor の残作業を、実装前に contract-first で確認できる PR 単位へ分ける。
この整理では新機能、UI文言、asset、preset本体、schema、crop、外部fontは変更しない。

維持する見え方:

- 用途別プリセットを選ぶ。
- 文字を差し替える。
- 立ち絵を差し替えて配置する。
- 品質を確認して書き出す。

## PR Order

| Priority | Candidate | Goal | Contract-first check |
| --- | --- | --- | --- |
| P1 | preset variants | 用途と出力先の違いを preset metadata / family として扱える境界を決める。 | variant id、canvas size、既存 preset id 互換、検索 / 最近使った / お気に入りへの影響。 |
| P2 | partial preset apply | 文字と立ち絵を守りながら、背景 / 装飾 / 色だけを安全に適用する境界を決める。 | 保持対象、上書き対象、確認UIが出る条件、draft mutation が限定されること。 |
| P3 | common material library | ユーザー素材の保存、削除、置換、容量、復旧不能時の境界を決める。 | IndexedDB 境界、localStorage 非使用、既存 registered material 互換、asset 追加なし。 |
| P4 | font policy | 追加fontを入れるかどうかの基準と、入れる場合の self-host / fallback 境界を決める。 | 外部CDNなし、既存font表示互換、fontが解決しない場合の fallback。 |
| P5 | preset batch | 新規用途プリセットの追加順、対象、asset / variant / partial apply 依存を決める。 | 追加候補の preset id、既存 preset 非破壊、preset本体変更前の readiness。 |
| P6 | quality guard expansion | warning / hint のまま、可読性、立ち絵見切れ、書き出し前確認を最小拡張する。 | 自動修正なし、短文コピー、material / preset / schema 非変更、summary 表示互換。 |

## Candidate Details

### 1. preset variants

- 目的:
  - 横長、縦長、正方形などの出力先差分を、既存 preset を壊さずに扱う。
  - `preset id` と variant の関係を先に固定し、preset batch の前提を作る。
- 入れるもの:
  - variant の名前、id、canvas size、対象用途、既存 preset との紐づけ方の定義。
  - 検索、カテゴリ、用途ラベル、最近使った、お気に入りが variant をどう扱うかの contract。
- 入れないもの:
  - preset 本体の追加 / 差し替え。
  - text layer / image layer schema 変更。
  - crop 仕様変更。
  - UI の大幅な新規導線。
- contract-first で確認する内容:
  - 既存 preset id がそのまま見つかる。
  - variant 追加後も discovery、recent、favorite は壊れない。
  - canvas size と用途ラベルが metadata として読める。
  - Schedule Calendar / SNS Split Image Maker の handoff contract を変えない。
- 変更してよいファイル範囲:
  - `lib/thumbnail-editor.ts`
  - `scripts/thumbnail-preset-discovery-contract.mjs`
  - 必要なら `scripts/thumbnail-preset-variants-contract.mjs`
  - 必要最小限の `components/thumbnail-editor/ThumbnailEditorApp.tsx`
  - `task.md`
- 変更してはいけないファイル範囲:
  - `public/assets/images/thumbnail-editor/**`
  - preset 背景 / 装飾 asset。
  - `scripts/thumbnail-material-assets-contract.mjs`
  - Schedule Calendar / SNS Split Image Maker 実装。
- 次PR候補としての優先度:
  - P1。後続の partial apply と preset batch の前提になる。

### 2. partial preset apply

- 目的:
  - 利用者が入力済みの文字と立ち絵を守ったまま、見た目の土台だけを変えられるようにする。
  - 「自動一括制作」ではなく、選んだ preset を安全に差し替える体験に留める。
- 入れるもの:
  - 保持する layer: `見出し`、`時刻`、`サブ`、`ラベル` を中心にした text layer と、利用者が差し替えた standee image layer。
  - 上書きする layer: 背景、装飾、色、preset 初期の補助 layer。
  - 確認UIが必要な条件と、即時適用してよい条件。
- 入れないもの:
  - 複数選択、一括配置、自動分割、AI生成。
  - crop 仕様変更。
  - text / image layer schema 変更。
  - 素材ライブラリ登録変更。
- contract-first で確認する内容:
  - `thumbnail-preset-apply-safety-contract.mjs` で保持 / 上書きの境界が明示される。
  - partial apply 後も draft の schema が変わらない。
  - standee placement contract が破綻しない。
  - ユーザー追加 layer を予期せず消さない。
- 変更してよいファイル範囲:
  - `lib/thumbnail-editor.ts`
  - `components/thumbnail-editor/ThumbnailEditorApp.tsx`
  - `scripts/thumbnail-preset-apply-safety-contract.mjs`
  - `scripts/thumbnail-standee-placement-contract.mjs`
  - `task.md`
- 変更してはいけないファイル範囲:
  - `public/assets/images/thumbnail-editor/**`
  - preset asset 登録。
  - text layer / image layer schema 定義そのもの。
  - Schedule Calendar / SNS Split Image Maker 実装。
- 次PR候補としての優先度:
  - P2。variant の境界が決まった後に進める。

### 3. common material library

- 目的:
  - project-bound material と user-added material を分け、画像本体を localStorage に置かない保存境界を決める。
  - delete / replace / 容量 / 復旧不能時の表示を実装前に固定する。
- 入れるもの:
  - IndexedDB など画像向け storage を前提にした user material contract。
  - 登録素材とユーザー素材の責務分離。
  - 容量上限、削除、置換、読み込み失敗時の扱い。
- 入れないもの:
  - 新規 asset 追加。
  - 素材ライブラリ登録変更。
  - AI生成。
  - preset 初期 layers への material 自動挿入。
- contract-first で確認する内容:
  - `thumbnail-material-assets-contract.mjs` が既存 registered material を壊さない。
  - user material は localStorage に画像本体を保存しない。
  - 削除 / 置換後に既存 draft が破綻しない fallback がある。
- 変更してよいファイル範囲:
  - `lib/thumbnail-editor.ts`
  - `components/thumbnail-editor/ThumbnailEditorApp.tsx`
  - `scripts/thumbnail-material-assets-contract.mjs`
  - 必要なら storage helper の追加ファイル。
  - `task.md`
- 変更してはいけないファイル範囲:
  - `public/assets/images/thumbnail-editor/**` の新規追加。
  - preset 本体。
  - preset variants / partial apply の未確定仕様。
  - Schedule Calendar / SNS Split Image Maker 実装。
- 次PR候補としての優先度:
  - P3。partial apply 後、素材の責務が混ざらない状態で進める。

### 4. font policy

- 目的:
  - VTuber サムネ向けの文字品質を上げる前に、font 追加可否と fallback を決める。
  - 外部CDNに依存しない運用を固定する。
- 入れるもの:
  - 既存fontだけで進める条件。
  - 追加する場合の self-host / repo 同梱 / license / fallback の条件。
  - preset ごとではなく editor 全体で使う policy。
- 入れないもの:
  - 外部 CDN / Google Fonts の新規参照。
  - font asset 追加。
  - preset 本体の font 差し替え。
  - UI文言変更。
- contract-first で確認する内容:
  - font が解決しなくても canvas rendering が落ちない。
  - 既存 draft の fontName が fallback で表示できる。
  - build / export が外部 network に依存しない。
- 変更してよいファイル範囲:
  - `docs/future/**` または既存 design doc の policy section。
  - 実装PRでは `lib/thumbnail-editor.ts` と最小 contract。
  - `task.md`
- 変更してはいけないファイル範囲:
  - `public/fonts/**` などの新規 font asset 追加。
  - 外部 CDN 設定。
  - preset 本体。
  - Schedule Calendar / SNS Split Image Maker 実装。
- 次PR候補としての優先度:
  - P4。preset batch 前に方針だけ決め、実 asset 追加は別PRにする。

### 5. preset batch

- 目的:
  - 初配信、記念配信、耐久配信、歌枠、雑談、ゲーム実況、告知、切り抜きなどの追加候補を、実装可能な batch に分ける。
  - variant / partial apply / font policy が未確定のまま preset 本体を増やさない。
- 入れるもの:
  - 追加候補の優先順、対象用途、必要 asset、必要 variant、必要 text layer 名。
  - 既存 preset と重複しない役割。
  - batch ごとの contract 候補。
- 入れないもの:
  - preset 本体変更。
  - 背景 / 装飾 asset 追加。
  - imagegen。
  - UI への大量追加。
- contract-first で確認する内容:
  - preset id が既存と衝突しない。
  - `見出し`、`時刻`、`サブ`、`ラベル` などの置換対象 text layer が揃う。
  - variant / partial apply が前提を満たしている。
- 変更してよいファイル範囲:
  - `docs/future/**`
  - 実装PRでは `lib/thumbnail-editor.ts`
  - preset batch 用の新規 contract script。
  - `task.md`
- 変更してはいけないファイル範囲:
  - variant / partial apply が未確定の状態での preset 本体。
  - `public/assets/images/thumbnail-editor/**`
  - text / image layer schema。
  - Schedule Calendar / SNS Split Image Maker 実装。
- 次PR候補としての優先度:
  - P5。先に仕様境界を固め、実 preset 追加はさらに分割する。

### 6. quality guard expansion

- 目的:
  - 文字の可読性、立ち絵の見切れ、書き出し前確認を、軽い warning / hint として増やす。
  - `サムネ品質` / `注意 n件` / `品質チェックOK` の表現を維持する。
- 入れるもの:
  - selected layer と overall summary の追加 warning / hint。
  - copy を短く保つ contract。
  - draft を mutate しない確認。
- 入れないもの:
  - 自動修正。
  - AI生成。
  - モーダル型チュートリアル。
  - preset / material / asset / schema の変更。
- contract-first で確認する内容:
  - `thumbnail-quality-guard-contract.mjs` が warning / hint / ok の順序と短さを守る。
  - `thumbnail-standee-placement-contract.mjs` と矛盾しない。
  - material library registration と asset files が変わらない。
- 変更してよいファイル範囲:
  - `lib/thumbnail-editor.ts`
  - `components/thumbnail-editor/ThumbnailEditorApp.tsx`
  - `scripts/thumbnail-quality-guard-contract.mjs`
  - `scripts/thumbnail-standee-placement-contract.mjs`
  - `task.md`
- 変更してはいけないファイル範囲:
  - preset 本体。
  - `public/assets/images/thumbnail-editor/**`
  - 素材ライブラリ登録。
  - Schedule Calendar / SNS Split Image Maker 実装。
- 次PR候補としての優先度:
  - P6。UI を重くしない範囲で、上記の仕様整理後に進める。

## Contract Candidates

- `scripts/thumbnail-preset-discovery-contract.mjs`
- `scripts/thumbnail-preset-apply-safety-contract.mjs`
- `scripts/thumbnail-standee-placement-contract.mjs`
- `scripts/thumbnail-material-assets-contract.mjs`
- `scripts/thumbnail-quality-guard-contract.mjs`
- `scripts/thumbnail-layer-management-contract.mjs`
- 新規候補: `scripts/thumbnail-preset-variants-contract.mjs`
- 新規候補: `scripts/thumbnail-preset-batch-readiness-contract.mjs`
