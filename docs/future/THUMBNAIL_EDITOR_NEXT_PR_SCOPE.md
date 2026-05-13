# Thumbnail Editor Next PR Scope

## Purpose

Thumbnail Editor の残作業を、実装前に contract-first で確認できる PR 単位へ分ける。
この整理では新機能、UI文言、asset、preset本体、schema、crop、外部fontは変更しない。

2026-05-13 時点では、P1〜P6 の contract / helper 境界に加え、user material library UI v1、user material library management v1、quality guard export-preflight polish まで実装済み。
この文書は、現行機能一覧ではなく、freeze 後に縦長 / 正方形 variant body、font asset、preset batch 本体、crop 仕様、text / image layer schema、public asset / font 追加へ広げるときの参照境界として扱う。

維持する見え方:

- 用途別プリセットを選ぶ。
- 文字を差し替える。
- 立ち絵を差し替えて配置する。
- 登録済み装飾素材を軽い素材パネルから追加する。
- 品質を確認して書き出す。

## PR Order

| Priority | Candidate | Current state | Remaining boundary |
| --- | --- | --- | --- |
| P1 | preset variants | metadata / lightweight ref / 縦長・正方形 variant body helper は実装済み。 | UI 導線、preset batch 本体、crop / schema 変更は未追加。 |
| P2 | partial preset apply | helper / UI 境界は実装済み。 | preset body / schema / crop 変更は引き続き別PR。 |
| P3 | common material library | user material library UI v1 / management v1 まで実装済み。 | public asset 追加や素材登録変更は引き続き別PR。 |
| P4 | font policy | fallback policy / helper は実装済み。 | font asset 追加は未実施。 |
| P5 | preset batch | readiness metadata / helper は実装済み。 | preset batch 本体追加は未実施。 |
| P6 | quality guard expansion | export-preflight polish まで実装済み。 | 自動修正、重い診断UI、schema / material / preset 変更は引き続き入れない。 |

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
- 現在の扱い:
  - P1 contract と縦長 / 正方形 variant body foundation は実装済み。UI 導線、preset batch 本体、crop / schema 変更は後続候補として残す。

#### 実装で確定した境界

- variant catalog は `landscape-16-9` / `portrait-9-16` / `square-1-1` の metadata と、既存 preset から variant canvas の draft body を作る `createDraftFromPresetVariant()` に留める。
- 既存 preset は全て既存の横長 16:9 を default variant とし、縦長 / 正方形は既存 layer schema を保った生成 helper で扱う。
- `normalizeThumbnailDraft()` は schema version / storage key を変えず、既知 variant canvas の `1080 x 1920` / `1080 x 1080` を保持できる。
- discovery は従来の `recentPresetIds` / `favoritePresetIds` 互換を維持し、variant 参照は `presetId` + `variantId` の軽い ref だけを正規化する。
- UI 導線、preset 本体、text / image layer schema、crop、material library、Schedule Calendar / SNS Split Image Maker handoff は変更しない。

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
- 現在の扱い:
  - P2 helper / UI 境界は実装済み。preset body、schema、crop 仕様変更は引き続き別PRで扱う。

#### 実装で確定した境界

- partial apply は `applyThumbnailPresetPartial(draft, targetPresetId)` の最小 helper として扱う。
- pristine draft は target preset の初期 draft へそのまま切り替え、source preset の文字や user image は持ち越さない。
- edited draft は target preset の初期背景、装飾、図形、色を使い、`見出し` / `時刻` / `サブ` / `ラベル` の主要テキスト値だけを target preset の text layer へ反映する。
- user-added image layer は `data:image/` 由来または `素材:` layer name の画像レイヤーだけを保持し、crop metadata と既存 image layer schema を変えない。
- source preset 初期の背景 / 装飾 image layer は保持せず、target preset 側の初期 layer に置き換える。
- preset id、default variant relation、recent / favorite / lightweight variant refs、Schedule Calendar / SNS Split Image Maker handoff contract は変更しない。

### 3. common material library

- 目的:
  - project-bound material と user-added material を分け、画像本体を localStorage に置かない保存境界を決める。
  - delete / replace / 容量 / 復旧不能時の表示を実装前に固定する。
  - 現行の登録済み装飾素材パネルと、完了済み user material library UI v1 / management v1 の責務を混同しない。
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
- 現在の扱い:
  - P3 storage boundary、user material library UI v1、management v1 は実装済み。public asset 追加、素材登録変更、preset 本体への自動挿入は後続候補に残す。

#### 実装で確定した境界

- project-bound material は既存 `thumbnailMaterialLibrary` の登録を維持し、repo 内 `public/assets/images/thumbnail-editor/**` の asset を参照する。ユーザーの保存状態や `storageId` は混ぜない。
- user-added material は `ThumbnailUserMaterialRef` として `id` / `name` / `storageId` / `storage: "indexeddb"` / `mimeType` / 任意の `width` / `height` / `byteSize` / timestamp だけを持つ。
- user-added material の画像本体は IndexedDB など画像向け storage 側で扱い、localStorage 側に保存するのは metadata と `storageId` だけにする。
- user-added material layer は既存 image layer に optional `materialRef` を持たせる非破壊拡張に留め、画像本体を draft `src` へ永続化しない。読み込み前、削除後、置換直後、読み込み失敗時は共通 fallback image を使う。
- delete / replace / load failure は layer の geometry と crop を維持し、画像レイヤー自体を壊さない。replace は軽量 ref を差し替え、fallback `src` のまま次の画像 storage 読み込みへ渡す。
- partial preset apply は `materialRef` を持つ user-added material layer を保持する。preset id、variant refs、recent / favorite、Schedule Calendar / SNS Split Image Maker handoff contract は変更しない。
- user material library management v1 は、容量上限、読み込み不能 fallback、再追加 / 整理導線の最小 UI まで完了済み。

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
  - 既存 draft の fontFamily が fallback で表示できる。
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
- 現在の扱い:
  - P4 policy / helper は実装済み。初期候補 24 種、カテゴリ、読み込み方針、後続 PR scope は `docs/future/THUMBNAIL_EDITOR_FONT_CANDIDATES.md` を参照する。実 font asset 追加は別PRにする。

#### 実装で確定した境界

- font policy は editor 全体の `thumbnailFontPolicy` として扱い、source は browser / system installed font に限定する。
- 外部 CDN、Google Fonts、network font、今回PRでの bundled font asset 追加は許可しない。
- 既存 `thumbnailFonts` に含まれる fontFamily はそのまま保持し、未知、空、URL、`@import`、comma stack、quote を含む unsafe fontFamily は `Noto Sans JP` へ fallback する。
- canvas rendering / export は `getThumbnailCanvasFont()` を通し、`Noto Sans JP` / `BIZ UDPGothic` / `Yu Gothic` / `Meiryo` / `sans-serif` の fallback stack を使う。
- normalize は text layer schema を破壊せず、preset 初期 text layer の fontFamily、material、partial apply、variant refs、recent / favorite、Schedule Calendar / SNS Split Image Maker handoff contract は変更しない。

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
- 現在の扱い:
  - P5 readiness は実装済み。実 preset body 追加はさらに分割する。

#### 実装で確定した境界

- preset batch readiness は `thumbnailPresetBatchCandidates` と `getThumbnailPresetBatchReadiness()` / `getThumbnailPresetBatchReadinessSummary()` の軽量 contract として扱う。
- 候補 id は `first_stream` / `anniversary_stream` / `endurance_stream` / `karaoke_stream` / `chat_stream` / `gameplay_stream` / `notice_stream` / `highlight_clip` とし、既存 preset id とは衝突させない。
- 各候補は用途、推奨 variant、必要 text layer role、必要 material category、依存 contract を metadata として持つ。
- 初期候補は既存の `landscape-16-9` variant を前提にし、未対応の縦長 / 正方形 variant body を support 済みとして扱わない。
- readiness helper は warning-only / checks-only とし、自動修正、asset 生成、preset body 生成、font asset 追加、material 登録変更を行わない。
- preset 本体、asset、font asset、text / image layer schema、crop、素材ライブラリ登録、Schedule Calendar / SNS Split Image Maker handoff contract は変更しない。

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
- 現在の扱い:
  - P6 quality guard expansion と export-preflight polish は実装済み。自動修正、重い診断UI、preset / material / asset / schema 変更は引き続き入れない。

#### 実装で確定した境界

- quality guard expansion は既存の `getThumbnailQualityGuardItems()` / `getThumbnailOverallQualityGuardItems()` / `getThumbnailQualityGuardSummary()` に閉じる。
- text layer は小さすぎる文字、縁取り / 影不足に加え、1行がレイヤー幅に対して長い場合だけ `長文は改行も確認` の hint を出す。
- image layer は `data:image/`、user material ref、初期追加名 `画像` / `ユーザー素材` のような user-added image だけを content image として扱い、crop が強い場合だけ `見切れ具合を確認` の hint を出す。
- overall summary は text layer と user-added image layer だけを軽く確認し、preset 初期の背景 / 装飾 / 立ち絵ガイド枠を warning の対象にしない。
- summary label は `注意 n件` / `品質チェックOK` を維持し、draft、preset、material registration、asset、font、schema、crop 仕様は変更しない。
- export-preflight polish は、低透明度テキスト hint、未解決 user material warning、短い export summary まで完了済み。

## Contract Candidates

- `scripts/thumbnail-preset-discovery-contract.mjs`
- `scripts/thumbnail-preset-apply-safety-contract.mjs`
- `scripts/thumbnail-standee-placement-contract.mjs`
- `scripts/thumbnail-material-assets-contract.mjs`
- `scripts/thumbnail-quality-guard-contract.mjs`
- `scripts/thumbnail-layer-management-contract.mjs`
- `scripts/thumbnail-font-policy-contract.mjs`
- 新規候補: `scripts/thumbnail-preset-variants-contract.mjs`
- 新規候補: `scripts/thumbnail-preset-batch-readiness-contract.mjs`
