# Thumbnail Editor Font Candidates

## Purpose

Thumbnail Editor の font asset / preset batch 本体へ進む前に、初期フォント候補、カテゴリ、読み込み方針、後続 PR scope を固定する。
この planning では font file 追加、CSS / API 実装、preset body 変更、schema 変更、CSP 変更は行わない。

## Current Boundary

- 既存 font UI は `components/thumbnail-editor/ThumbnailEditorApp.tsx` の text layer panel 内 listbox に閉じる。
- 既存 font catalog は `lib/thumbnail-editor.ts` の `thumbnailFontGroups` / `thumbnailFonts` にあり、日本語 10 種、英語 10 種を保持している。
- `thumbnailFontPolicy` は現時点で `system-or-browser-installed` source を前提にし、external network font、Google Fonts、CDN、bundled font asset を許可しない。
- draft normalize は unknown / unsafe `fontFamily` を `Noto Sans JP` へ寄せる。URL、`@import`、comma stack、quote を含む値は fallback にする。
- canvas rendering / export は `getThumbnailCanvasFont()` を通し、`Noto Sans JP` / `BIZ UDPGothic` / `Yu Gothic` / `Meiryo` / `sans-serif` fallback stack を使う。
- Thumbnail -> SNS handoff は `fontFamily` を payload に広げない。

## Category Model

フォント選択 UI でそのまま表示する書体分類だけでなく、サムネ用途の印象カテゴリを metadata として持つ。

- `language`: `ja` / `en`
- `category`: UI grouping 用の大分類。
- `mood`: 太字見出し、読みやすいゴシック、かわいい、上品、手書き、レトロ / ピクセル、スタイリッシュ、ゲーム風、近未来などの用途印象。
- `bestFor`: 見出し、ラベル、時刻、サブテキスト、英字アクセントなどの推奨用途。
- `caution`: 日本語 weight、英字向き、display 向き、長文非推奨、pixel font の小サイズ注意など。
- `sourceUrl`: Google Fonts specimen または公式配布ページ。初期候補は Google Fonts specimen で確認する。

## Initial 24 Fonts

### Japanese 12

| Category | Font | URL | Best for | Mood | Caution |
| --- | --- | --- | --- | --- | --- |
| 太字見出し / 汎用 | Noto Sans JP | https://fonts.google.com/specimen/Noto+Sans+JP | 見出し、サブ、UI 的な短文 | 太字見出し、読みやすいゴシック | weight が多く日本語容量が重い。初期 load は必要 weight を絞る。 |
| 太字見出し / 汎用 | M PLUS 1p | https://fonts.google.com/specimen/M+PLUS+1p | 見出し、告知文、サブ | ポップ、現代的、太字向き | 細い weight はサムネで弱い。見出しは bold 系前提。 |
| 読みやすいゴシック | BIZ UDPGothic | https://fonts.google.com/specimen/BIZ+UDPGothic | サブ、日程、説明、長めの日本語 | 読みやすい、実用、情報整理 | display 感は弱い。装飾は stroke / shadow 側で補う。 |
| 読みやすいゴシック | Zen Kaku Gothic New | https://fonts.google.com/specimen/Zen+Kaku+Gothic+New | 見出し、サブ、告知 | すっきり、上品、配信告知向き | 太字でもやや静か。強いゲーム系には別 font を使う。 |
| かわいい / 丸ゴ | M PLUS Rounded 1c | https://fonts.google.com/specimen/M+PLUS+Rounded+1c | 雑談、歌枠、かわいい見出し | かわいい、やわらかい、親しみ | 丸さが強い。硬い告知やシリアス用途では使いすぎ注意。 |
| かわいい / 丸ゴ | Kosugi Maru | https://fonts.google.com/specimen/Kosugi+Maru | サブ、ラベル、かわいい短文 | やさしい、丸い、軽い | weight が限定的。大見出しは縁取りで補強する。 |
| 上品 / 和風 | Noto Serif JP | https://fonts.google.com/specimen/Noto+Serif+JP | 記念配信、告知、上品な見出し | 上品、和風、落ち着き | 日本語容量が重い。本文より短い見出し向き。 |
| 上品 / レトロ | Kiwi Maru | https://fonts.google.com/specimen/Kiwi+Maru | 雑談、レトロ、柔らかい見出し | ほんのりレトロ、上品、丸み | 強い太字感はない。大きめサイズで使う。 |
| 手書き / ラフ | Yomogi | https://fonts.google.com/specimen/Yomogi | 手書きコメント、補足、ゆるい告知 | 手書き、ゆるい、親近感 | 長文や小サイズは読みにくい。アクセント用途を基本にする。 |
| 手書き / ポップ | Hachi Maru Pop | https://fonts.google.com/specimen/Hachi+Maru+Pop | かわいいアクセント、短い見出し | 手書き、かわいい、個性強め | display 向き。可読性が必要な本文には使わない。 |
| レトロ / ポップ | RocknRoll One | https://fonts.google.com/specimen/RocknRoll+One | 強めの日本語見出し、企画タイトル | レトロ、元気、ポップ | weight 選択が少ない。繊細な用途には不向き。 |
| レトロ / ピクセル | DotGothic16 | https://fonts.google.com/specimen/DotGothic16 | ゲーム風ラベル、ドット風企画 | ピクセル、ゲーム風、レトロ | 小サイズでは潰れやすい。本文や細かい日程には使わない。 |

### English 12

| Category | Font | URL | Best for | Mood | Caution |
| --- | --- | --- | --- | --- | --- |
| Impact headline | Anton | https://fonts.google.com/specimen/Anton | 英字見出し、強いラベル | 太字、圧縮、インパクト | 日本語は不可。英字大文字中心で使う。 |
| Impact headline | Bebas Neue | https://fonts.google.com/specimen/Bebas+Neue | 配信タイトル、時刻、強調ラベル | スタイリッシュ、縦長、サムネ向き | 小文字や長文では単調。tracking 調整を後続で検討。 |
| Label / readable condensed | Oswald | https://fonts.google.com/specimen/Oswald | 時刻、カテゴリ、ラベル | 読みやすい、配信 UI、凝縮 | 既存 preset で使用中。英字アクセント向き。 |
| Label / readable sans | Montserrat | https://fonts.google.com/specimen/Montserrat | ラベル、サブ、告知文 | モダン、安定、読みやすい | display の個性は控えめ。太字 weight を使う。 |
| Readable sans | Poppins | https://fonts.google.com/specimen/Poppins | サブ、告知、柔らかい英字 | 丸み、現代的、親しみ | 見出しではやや軽い。bold weight 前提。 |
| Readable sans | Rubik | https://fonts.google.com/specimen/Rubik | ラベル、ゲーム UI 風の短文 | 丸い、軽快、読みやすい | 強い装飾性は低い。色 / shape 側で補う。 |
| Cute / comic | Fredoka | https://fonts.google.com/specimen/Fredoka | かわいい英字、雑談、歌枠 | かわいい、丸い、ポップ | 大人っぽい告知には合いにくい。 |
| Cute / comic | Bangers | https://fonts.google.com/specimen/Bangers | 驚き系見出し、切り抜き、勢い | コミック、派手、強い | display 専用。長文や日本語混在には不向き。 |
| Elegant / stylish | Playfair Display | https://fonts.google.com/specimen/Playfair+Display | 記念配信、上品な英字アクセント | 上品、クラシック、ファッション寄り | 小サイズや太い縁取りで細部が潰れやすい。 |
| Handwritten / personal | Pacifico | https://fonts.google.com/specimen/Pacifico | サイン風、軽いアクセント | 手書き、華やか、親しみ | display / accent 専用。大文字羅列や長文には向かない。 |
| Game / futuristic | Orbitron | https://fonts.google.com/specimen/Orbitron | 近未来、ゲーム、SF ラベル | 近未来、テック、ゲーム風 | 日本語不可。数字 / 英字短文に限定する。 |
| Game / pixel | Press Start 2P | https://fonts.google.com/specimen/Press+Start+2P | レトロゲーム、ドット風短文 | ピクセル、ゲーム、強い個性 | 大容量ではないが可読性が低い。大きめ短文だけにする。 |

## Loading Policy

### Recommended Direction

初期実装は self-host を第一候補にする。Google Fonts specimen は候補確認 URL として使い、runtime CDN dependency にはしない。

- `public/fonts/thumbnail-editor/<family>/` に必要 subset / weight だけを置く。
- CSS は tool-scoped な font manifest または static CSS に閉じ、portal 全体へ不要な font を読ませない。
- 日本語 font は容量が大きいため、初期 bundle へ 12 種全てを eager load しない。UI 表示時または選択時の遅延 load を基本にする。
- 英語 font も display 用は必要 weight のみに絞る。
- fallback は現行の `Noto Sans JP` / `BIZ UDPGothic` / `Yu Gothic` / `Meiryo` / `sans-serif` を維持する。

### Japanese Font Batch State

2026-05-14 の Japanese font batch では、日本語 12 種を `public/fonts/thumbnail-editor/<family>/` 配下の self-host asset として追加した。
追加 asset は Google Fonts CDN へ新規依存せず、Thumbnail Editor component が CSS module として font face を読み込む。既存の app-wide font import / CSP はこの PR の対象外として触らない。

- subset: `thumbnail-editor-ja-seed-v1`
  - current Thumbnail Editor preset text、日付 / 時刻 / 配信ラベル、数字、基本 Latin、一般的な記号に絞る。
  - 任意入力の全文字 coverage ではなく、初期 batch の容量を抑える seed subset。未収録 glyph は既存 fallback stack で継続する。
- license note: `public/fonts/thumbnail-editor/LICENSES.md`
- added weights:
  - `Noto Sans JP`: `400 / 700 / 900`
  - `M PLUS 1p`: `400 / 700 / 900`
  - `BIZ UDPGothic`: `400 / 700`
  - `Zen Kaku Gothic New`: `400 / 700 / 900`
  - `M PLUS Rounded 1c`: `400 / 700 / 900`
  - `Kosugi Maru`: `400`
  - `Noto Serif JP`: `400 / 700 / 900`
  - `Kiwi Maru`: `400 / 500`。700 は提供されないため、強め用途は 500 と stroke / shadow で補う。
  - `Yomogi`: `400`
  - `Hachi Maru Pop`: `400`
  - `RocknRoll One`: `400`
  - `DotGothic16`: `400`

この batch では English font asset、font UI category 表示、preset body への font 適用、text / image layer schema 変更は扱わない。

### English Font Batch State

2026-05-14 の English font batch では、英語 12 種を `public/fonts/thumbnail-editor/<family>/` 配下の self-host asset として追加した。
追加 asset は Google Fonts CDN へ新規 runtime 依存せず、既存の Thumbnail Editor route scoped CSS module から読む。

- subset: `thumbnail-editor-en-seed-v1`
  - Google Fonts CSS2 の Latin woff2 subset を self-host し、英字 display label、数字、common punctuation、basic Latin fallback characters を扱う。
  - 日本語 coverage ではなく、英字見出し / ラベル / 数字アクセント用途に絞る。日本語混在時は既存 fallback stack で継続する。
- license note: `public/fonts/thumbnail-editor/LICENSES.md`
- added weights:
  - `Anton`: `400`
  - `Bebas Neue`: `400`
  - `Oswald`: `400 / 700`
  - `Montserrat`: `400 / 700 / 900`
  - `Poppins`: `400 / 700 / 900`
  - `Rubik`: `400 / 700 / 900`
  - `Fredoka`: `400 / 700`
  - `Bangers`: `400`
  - `Playfair Display`: `400 / 700 / 900`
  - `Pacifico`: `400`
  - `Orbitron`: `400 / 700 / 900`
  - `Press Start 2P`: `400`

この batch では font UI category 表示、search / recently used、preset body への font 適用、text / image layer schema 変更は扱わない。

### Font UI Category State

2026-05-14 の font UI categories では、`thumbnailFontManifest` の `language` / `category` / `mood` を使い、font listbox を language -> category -> font + mood の短い表示へ整理した。

- listbox は manifest 24 種を表示する。
- 既存の fontFamily 選択、draft schema、canvas export、font loading helper は変更しない。
- search / recently used、preset body への font 適用、preset font application は後続 PR に残す。

### Google Fonts CDN

- 速く候補検証できるが、runtime 外部依存、CSP、offline / static export、canvas export 前の race が増える。
- この project の現行 policy とは衝突するため、採用する場合は policy / CSP / contract を明示的に変更する別 PR にする。
- planning PR と最初の foundation PR では CDN 追加をしない。

### Font Load Wait For Canvas Export

後続実装では export 前に font ready を待つ境界を追加する。

- selected text layers から使用中 `fontFamily` を抽出する。
- `document.fonts.load(getThumbnailCanvasFont(layer))` を text layer ごとに試す。
- 最後に `document.fonts.ready` を待つ。ただし timeout を設け、失敗時は fallback stack で export を継続する。
- export UI では重い modal を出さず、必要なら短い status / warning に留める。
- Node / static contract では `document.fonts` がない環境でも落ちない helper 境界にする。

## Follow-up PR Scope

1. `font loading foundation`
   - font manifest type、category metadata、safe load helper、export 前 wait helper、contract を追加する。
   - font file、CSP、preset body、schema は変更しない。
2. `Japanese font batch`
   - 日本語 12 種のうち必要 weight / subset 方針を確定し、self-host asset を追加する。
   - 容量上限、license note、fallback、export wait を検証する。
   - 現在の状態: self-host asset と export wait contract は追加済み。UI category 表示、English asset、preset font application は後続。
3. `English font batch`
   - 英語 12 種の必要 weight を追加し、英字ラベル / display 用の preview と export wait を検証する。
   - 現在の状態: self-host asset と export wait contract は追加済み。UI category 表示、search / recently used、preset font application は後続。
4. `font UI categories`
   - listbox を language / mood category 表示へ拡張する。
   - 検索、最近使った、preset body 変更は別 scope にする。
   - 現在の状態: language / category / mood 表示は実装済み。検索、最近使った、preset body 変更は後続。
5. `preset font application`
   - preset batch 本体で font を使う場合だけ、preset text layer の `fontFamily` を候補 catalog 内で差し替える。
   - schema、handoff payload、crop 仕様は変えない。

## Out Of Scope For This Planning PR

- font file / `public/fonts/**` 追加。
- Google Fonts CDN / CSP 変更。
- CSS `@font-face` / API / loader 実装。
- preset body / variant body / material registration 変更。
- text layer / image layer schema 変更。
- Schedule Calendar / SNS Split Image Maker 変更。
- 幅別 browser 確認。

## Verification Note

この PR は docs / task 変更のみなので `git diff --check` を verification baseline とする。
UI / 実装変更がないため、`390 / 820 / 1024 / 1280 / 1366px` の幅別 browser 確認は不要。
