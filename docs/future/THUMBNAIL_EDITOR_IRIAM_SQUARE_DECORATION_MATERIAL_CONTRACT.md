# Thumbnail Editor Registered Material Expansion Plan

## Purpose

Thumbnail Editor の登録済み素材ライブラリに、16:9 / 1:1 の両方で使える project-bound material を追加する。
この文書は実装仕様そのものではなく、Batch A-C の境界、素材生成方針、contract 期待値を固定するための運用メモとして扱う。

## Position In The Workflow

前提:

- `codex/thumbnail-iriam-square-preview` が統合 base。
- PR #213 `[codex] Finalize IRIAM square preview confirmation` merge 後に進める。
- IRIAM 1:1 starter preset は 5 preset まで接続済み。
- 既存 material library は cross-aspect 追加 flow を contract 済み。

この phase の役割:

- IRIAM 1:1 に限らず、既存 16:9 preset でも使える registered material を増やす。
- A preset の初期装飾を、B preset でも後から足せるようにする。
- material library への登録に閉じ、preset 初期 layer、schema、export、handoff、swap UI へ広げない。

## Batch Plan

### Batch A: Existing Preset Decoration Registration

既存 preset で使われているが `thumbnailMaterialLibrary` にない装飾 asset を素材リストへ出す。

- 新規 image generation はしない。
- 既存 `public/assets/images/thumbnail-editor/decorations/phase5/` などの asset を参照する。
- 表示名や説明は特定 preset 名に寄せすぎず、別 preset でも使いやすい汎用名にする。
- 101件前後の未登録 preset decoration があるため、全量を一度に登録するより family / category ごとに分ける。

優先候補:

| Family | Suggested category | Examples |
| --- | --- | --- |
| label / badge / panel | `label-base` / `date-badge` / `frame` | ラベル土台、時刻バッジ、note panel、product card、premiere badge |
| frame / corner | `frame` / `corner` | 立ち絵枠発光、HUD角、金角飾り、key visual frame、cover art frame |
| accent / effect | `accent` | きらめき、glint、音符、三角 burst、soft glow dots、connection accent |
| divider / line | `divider` | progress divider、map-line divider、soundwave、table accent |
| small icon / prop | `accent` / `date-badge` | clock icon、lock badge、member badge、mic silhouette、lightning、chevron |

### Batch B: Dark / Horror / Smoke Materials

`dark_gacha` や暗めの告知に足せる黒いスモッグ、煙、影、暗い縁取りを新規生成する。

候補:

- black smoke wash: 背景へ薄く重ねる暗い煙。
- smoky edge frame: 画面端を囲う黒い煙フレーム。
- shadow corner fog: 角だけに足す暗いもや。
- ink drip accent: 端やタイトル周辺に置く黒い滴り。
- dark sparkle dust: 黒紫の細かい粒子。

カテゴリ:

- 画面端を囲うものは `frame`。
- 浮遊する煙や粒子は `accent`。
- 角だけに置く影や破片は `corner`。

### Batch C: Neutral Prop Materials

男女問わず使える小物系の registered material を新規生成する。

候補:

- chandelier: 画面上部や角に置ける小さなシャンデリア。
- antique key: 告知や企画に使いやすい鍵。
- pocket watch: 時刻 / 耐久 / 告知に使える懐中時計。
- candle: dark / ASMR / 雑談に使える小さな蝋燭。
- blank card: トランプ / タロット風だが文字なしのカード。
- ribbon seal: 配信ジャンルを問わない封蝋 / リボン風アクセント。
- small ornate frame: 立ち絵や情報枠の補助に使う小フレーム。

## Scope Rules

- 素材数に固定上限は置かない。
- ただし実装 PR は Batch / category / source type ごとに分け、review 可能な単位に閉じる。
- Batch A と Batch B/C は混ぜない。既存 asset 登録と新規生成では検証観点が違うため。
- category は既存の `label-base` / `date-badge` / `corner` / `accent` / `divider` / `frame` を使う。新カテゴリは作らない。
- material-only PR では preset 初期 layer に自動挿入しない。
- material swap UI、background swap UI、title swap UI は追加しない。

## Contract

後続の実装 PR では `scripts/thumbnail-material-assets-contract.mjs` を更新する。

最小 contract:

- 新規 material id は既存 id と衝突しない。
- 既存 material id の順序と登録内容を予期せず変えない。
- category は既存カテゴリだけを使う。
- project-bound material に `storageId` / `materialRef` など user material 用 metadata を混ぜない。
- source は `public/assets/images/thumbnail-editor/**` 配下だけを参照する。
- `name`、`description`、`recommendedPlacement` は短く、素材パネルで検索しやすい。
- `createThumbnailMaterialLayer()` で editable image layer として追加できる。
- material-only PR では preset 初期 layer に自動挿入しない。

新規生成 asset を含む Batch B/C では追加で確認する:

- PNG は透明背景、`768 x 512`、RGBA、可視 alpha content あり。
- alpha padding を確保し、素材が canvas 端に貼り付かない。
- readable text、logo、人物、キャラクター、既存作品由来の要素を含めない。
- visible chroma-key green を残さない。

あわせて既存 contract を維持する:

- `node scripts/thumbnail-material-assets-contract.mjs`
- `node scripts/thumbnail-preset-apply-safety-contract.mjs`
- `node scripts/thumbnail-preset-variants-contract.mjs`
- `node scripts/tool-handoff-contract.mjs`

## Out Of Scope

- preset body / 初期配置変更。
- background asset 追加。
- title transparent image asset 追加。
- title image / editable text 用 font 追加。
- user material schema / storage 変更。
- crop 仕様変更。
- canvas export 変更。
- handoff payload 変更。
- 9:16 preset 実装。
- Schedule Calendar / SNS Split Image Maker 変更。
- 素材パネル UI の大改修。

## Done Definition

planning-only PR:

- この文書と `task.md` の Batch A-C / next prompt が同期している。
- 完了済みの長い IRIAM preview branch 履歴は archive に寄せ、`task.md` は active-only に戻っている。
- `git diff --check` が通る。
- UI / asset / code を触らないため幅別確認は不要。

asset implementation PR:

- 新規 material asset と registration が contract で固定されている。
- 既存 Thumbnail Editor contract が通る。
- `npm run lint` と `npx tsc --noEmit` が通る。
- UI を触った場合のみ `390 / 820 / 1024 / 1280 / 1366px` の幅別確認を `task.md` に残す。
