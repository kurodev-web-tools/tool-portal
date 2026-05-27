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

## Standard Batch B Candidate Plan

2026-05-27 の planning では、PR #222 `[codex] Add IRIAM title font parity batch` が `codex/thumbnail-font-expansion-check` に merge 済みであることを確認したうえで、次の Google Fonts standard batch B 候補だけを整理する。
この planning では font file、manifest、CSS、contract、preset body、schema、canvas export、handoff payload、local font loading、login / user settings / paid plan、material asset は変更しない。

Selection notes:

- Existing `thumbnailFontManifest` / `public/fonts/thumbnail-editor/LICENSES.md` already cover 31 families: Japanese 16 / English 15.
- The tables below exclude all existing catalog families and use only Google Fonts families whose specimen URL and `google/fonts` repository `ofl/<slug>/OFL.txt` returned `200`.
- License memo is intentionally conservative: `Google Fonts specimen 200 / google/fonts OFL.txt 200; SIL Open Font License 1.1`.
- User selection gate: resolved on 2026-05-27. The implementation target is Japanese recommended 10 plus `Train One`, and English alternates 10 plus `Caveat` / `Righteous`.
- Implementation target after approval: self-host only, no runtime Google Fonts CDN. Japanese weights default to `400`; add `700` only when headline strength is needed. English weights default to `400`; add `700` only for readable label / display families that benefit from it.

### User-Selected Implementation Target

The selected scope is intentionally larger than the original +8-12 family guideline. To keep review and verification manageable, implement it as two follow-up PRs instead of one mixed asset PR.

- Japanese selected 11: `Zen Maru Gothic`, `Tsukimi Rounded`, `Shippori Antique`, `Shippori Mincho`, `Kaisei Decol`, `Kaisei Tokumin`, `Zen Kurenaido`, `Reggae One`, `Rampart One`, `Darumadrop One`, `Train One`.
- English selected 12: `Cinzel`, `Abril Fatface`, `Unbounded`, `Black Ops One`, `Monoton`, `Bungee`, `Bungee Shade`, `Rye`, `Creepster`, `VT323`, `Caveat`, `Righteous`.
- Recommended implementation split:
  - Batch B-JA: add the selected Japanese 11 only.
  - Batch B-EN: add the selected English 12 only after Batch B-JA is merged or when review capacity allows a separate PR.
- Keep each implementation PR self-hosted and route-scoped. Do not add runtime Google Fonts CDN, local font loading, user settings, preset body changes, schema changes, canvas export changes, handoff payload changes, or material asset changes.

### Japanese Recommended 10

| Font family | Google Fonts specimen URL | License confirmation memo | Intended use | Mood / category | Caution | Recommended implementation weight |
| --- | --- | --- | --- | --- | --- | --- |
| Zen Maru Gothic | https://fonts.google.com/specimen/Zen+Maru+Gothic | Google Fonts specimen 200 / google/fonts `ofl/zenmarugothic/OFL.txt` 200; SIL Open Font License 1.1 | 雑談、歌枠、かわいい告知、読みやすい短文 | かわいい / 丸ゴ、やわらかい、親しみ | 既存 `M PLUS Rounded 1c` と近いので、より素直な本文寄り丸ゴとして使い分ける。 | `400`; 見出し採用なら `700` |
| Tsukimi Rounded | https://fonts.google.com/specimen/Tsukimi+Rounded | Google Fonts specimen 200 / google/fonts `ofl/tsukimirounded/OFL.txt` 200; SIL Open Font License 1.1 | 月・夜・ASMR・ゆるい予定告知 | かわいい / 上品丸ゴ、静か、夜向き | 細い weight はサムネで弱い。背景コントラストと縁取りで補う。 | `400`; 見出し採用なら `700` |
| Shippori Antique | https://fonts.google.com/specimen/Shippori+Antique | Google Fonts specimen 200 / google/fonts `ofl/shipporiantique/OFL.txt` 200; SIL Open Font License 1.1 | レトロ雑談、落ち着いた企画、サブ見出し | レトロ / 読みやすい、昭和感、上品 | 1 weight 前提。強い見出しでは stroke / shadow が必要。 | `400` |
| Shippori Mincho | https://fonts.google.com/specimen/Shippori+Mincho | Google Fonts specimen 200 / google/fonts `ofl/shipporimincho/OFL.txt` 200; SIL Open Font License 1.1 | 記念配信、重要告知、和風タイトル | 和風 / 上品、明朝、きちんと感 | 日本語 serif は容量が重くなりやすい。短い見出し中心にする。 | `400`; 採用用途が見出しなら `700` |
| Kaisei Decol | https://fonts.google.com/specimen/Kaisei+Decol | Google Fonts specimen 200 / google/fonts `ofl/kaiseidecol/OFL.txt` 200; SIL Open Font License 1.1 | かわいい和風、記念日、企画タイトル | 和風 / かわいい、装飾 serif、柔らかい | 既存 serif より装飾性が高い。本文や細かい日程には使わない。 | `400`; 必要なら `700` |
| Kaisei Tokumin | https://fonts.google.com/specimen/Kaisei+Tokumin | Google Fonts specimen 200 / google/fonts `ofl/kaiseitokumin/OFL.txt` 200; SIL Open Font License 1.1 | 強い和風見出し、物語系、告知タイトル | 和風 / インパクト、太め serif、硬派 | 字面が重い。1:1 では余白を広めに取る。 | `400`; 見出し採用なら `700` |
| Zen Kurenaido | https://fonts.google.com/specimen/Zen+Kurenaido | Google Fonts specimen 200 / google/fonts `ofl/zenkurenaido/OFL.txt` 200; SIL Open Font License 1.1 | 手書きコメント、ゆるい雑談、短い一言 | 手書き / 上品、細め、親近感 | 小サイズでは弱い。アクセント用途を基本にする。 | `400` |
| Reggae One | https://fonts.google.com/specimen/Reggae+One | Google Fonts specimen 200 / google/fonts `ofl/reggaeone/OFL.txt` 200; SIL Open Font License 1.1 | 企画名、勢いのある見出し、バラエティ | インパクト / ポップ、太い、楽しい | 個性が強い。長文や情報整理には向かない。 | `400` |
| Rampart One | https://fonts.google.com/specimen/Rampart+One | Google Fonts specimen 200 / google/fonts `ofl/rampartone/OFL.txt` 200; SIL Open Font License 1.1 | サムネ主役見出し、企画ロゴ風テキスト | インパクト / アウトライン、レトロ、派手 | outline 形状のため小サイズ非推奨。縁取りと干渉しやすい。 | `400` |
| Darumadrop One | https://fonts.google.com/specimen/Darumadrop+One | Google Fonts specimen 200 / google/fonts `ofl/darumadropone/OFL.txt` 200; SIL Open Font License 1.1 | かわいい一言、初配信、ゆるい企画タイトル | 手書き / かわいい、丸い、個性強め | かな混在の可読性を実装時に確認する。本文用途にはしない。 | `400` |

### Japanese Alternates 10

| Font family | Google Fonts specimen URL | License confirmation memo | Intended use | Mood / category | Caution | Recommended implementation weight |
| --- | --- | --- | --- | --- | --- | --- |
| Kaisei Opti | https://fonts.google.com/specimen/Kaisei+Opti | Google Fonts specimen 200 / google/fonts `ofl/kaiseiopti/OFL.txt` 200; SIL Open Font License 1.1 | 上品な見出し、記念配信、落ち着いた告知 | 和風 / 上品、serif、柔らかい | `Kaisei Decol` / `Kaisei Tokumin` と同系統。最終 5 種ではどれかに絞る。 | `400`; 必要なら `700` |
| Shippori Antique B1 | https://fonts.google.com/specimen/Shippori+Antique+B1 | Google Fonts specimen 200 / google/fonts `ofl/shipporiantiqueb1/OFL.txt` 200; SIL Open Font License 1.1 | レトロ告知、読みやすいサブ、落ち着いた雑談 | レトロ / 読みやすい、実用寄り | `Shippori Antique` と近い。B1 の雰囲気差を実装前に確認する。 | `400` |
| Zen Old Mincho | https://fonts.google.com/specimen/Zen+Old+Mincho | Google Fonts specimen 200 / google/fonts `ofl/zenoldmincho/OFL.txt` 200; SIL Open Font License 1.1 | 和風、朗読、物語系、上品タイトル | 和風 / 古典、明朝、落ち着き | 細部が細い。太い縁取りや小サイズでは潰れやすい。 | `400`; 見出し採用なら `700` |
| Train One | https://fonts.google.com/specimen/Train+One | Google Fonts specimen 200 / google/fonts `ofl/trainone/OFL.txt` 200; SIL Open Font License 1.1 | レトロゲーム、強い企画ロゴ、短いタイトル | レトロ / アウトライン、ゲーム風、派手 | display 専用。細い stroke と重ねると読みにくい。 | `400` |
| Yuji Syuku | https://fonts.google.com/specimen/Yuji+Syuku | Google Fonts specimen 200 / google/fonts `ofl/yujisyuku/OFL.txt` 200; SIL Open Font License 1.1 | 和風、書道風タイトル、記念配信 | 和風 / 筆文字、上品、静か | 小さいサブテキストには不向き。 | `400` |
| Yuji Boku | https://fonts.google.com/specimen/Yuji+Boku | Google Fonts specimen 200 / google/fonts `ofl/yujiboku/OFL.txt` 200; SIL Open Font License 1.1 | 怪談、物語、暗めの企画タイトル | 和風 / 筆文字、崩し、不穏 | 崩しが強い。可読性確認を優先する。 | `400` |
| Yuji Mai | https://fonts.google.com/specimen/Yuji+Mai | Google Fonts specimen 200 / google/fonts `ofl/yujimai/OFL.txt` 200; SIL Open Font License 1.1 | 上品な和風アクセント、記念日、雅な見出し | 和風 / 筆文字、優雅、細め | かなり繊細。大きめ短文だけにする。 | `400` |
| Klee One | https://fonts.google.com/specimen/Klee+One | Google Fonts specimen 200 / google/fonts `ofl/kleeone/OFL.txt` 200; SIL Open Font License 1.1 | 手書き補足、やさしい説明、雑談サブ | 手書き / 読みやすい、自然、柔らかい | サムネの強い主見出しには弱い。 | `400`; 必要なら `600` |
| Hina Mincho | https://fonts.google.com/specimen/Hina+Mincho | Google Fonts specimen 200 / google/fonts `ofl/hinamincho/OFL.txt` 200; SIL Open Font License 1.1 | レトロ上品、和風サブ、静かなタイトル | 和風 / レトロ、細め serif | 小サイズと低コントラスト背景に弱い。 | `400` |
| Stick | https://fonts.google.com/specimen/Stick | Google Fonts specimen 200 / google/fonts `ofl/stick/OFL.txt` 200; SIL Open Font License 1.1 | 勢いのある短い見出し、企画タイトル | インパクト / 手書き、角ばり、力強い | 字形のクセが強い。長文では読みにくい。 | `400` |

### English Recommended 10

| Font family | Google Fonts specimen URL | License confirmation memo | Intended use | Mood / category | Caution | Recommended implementation weight |
| --- | --- | --- | --- | --- | --- | --- |
| Archivo Black | https://fonts.google.com/specimen/Archivo+Black | Google Fonts specimen 200 / google/fonts `ofl/archivoblack/OFL.txt` 200; SIL Open Font License 1.1 | 強い英字見出し、short label、CTA | Impact headline / bold sans、読みやすい | `Anton` と近いが、より横幅があり安定する。大文字中心。 | `400` |
| Staatliches | https://fonts.google.com/specimen/Staatliches | Google Fonts specimen 200 / google/fonts `ofl/staatliches/OFL.txt` 200; SIL Open Font License 1.1 | 時刻、配信ラベル、縦長見出し | Condensed / stylish、サムネ向き | `Bebas Neue` と用途が近い。文字幅差で選ぶ。 | `400` |
| Alfa Slab One | https://fonts.google.com/specimen/Alfa+Slab+One | Google Fonts specimen 200 / google/fonts `ofl/alfaslabone/OFL.txt` 200; SIL Open Font License 1.1 | 企画タイトル、レトロ見出し、強調ワード | Impact / slab serif、レトロ、太い | 太く重い。長い英字列には向かない。 | `400` |
| Righteous | https://fonts.google.com/specimen/Righteous | Google Fonts specimen 200 / google/fonts `ofl/righteous/OFL.txt` 200; SIL Open Font License 1.1 | レトロゲーム、ポップな英字ロゴ、企画ラベル | Retro / game、丸み、近未来 | 小文字や長文ではやや癖が出る。短文向き。 | `400` |
| Space Grotesk | https://fonts.google.com/specimen/Space+Grotesk | Google Fonts specimen 200 / google/fonts `ofl/spacegrotesk/OFL.txt` 200; SIL Open Font License 1.1 | modern label、説明、サブ、時刻 | Readable sans / modern、少し tech | display の派手さは低い。見出しは weight と色で補う。 | `400`; label 強調なら `700` |
| Sora | https://fonts.google.com/specimen/Sora | Google Fonts specimen 200 / google/fonts `ofl/sora/OFL.txt` 200; SIL Open Font License 1.1 | UI 風ラベル、告知サブ、英字アクセント | Readable sans / clean、配信 UI | 個性は控えめ。汎用 readable 枠として採用する。 | `400`; label 強調なら `700` |
| Exo 2 | https://fonts.google.com/specimen/Exo+2 | Google Fonts specimen 200 / google/fonts `ofl/exo2/OFL.txt` 200; SIL Open Font License 1.1 | SF、ゲーム、近未来配信、数字 | Game / futuristic、丸い tech | `Orbitron` より柔らかい。日本語混在は fallback 前提。 | `400`; 見出しなら `700` |
| Rajdhani | https://fonts.google.com/specimen/Rajdhani | Google Fonts specimen 200 / google/fonts `ofl/rajdhani/OFL.txt` 200; SIL Open Font License 1.1 | 時刻、スコア、ゲーム UI、短い英字 | Tech / condensed、数字向き、読みやすい | 細い weight は弱い。サムネでは中太以上を使う。 | `400`; 数字見出しなら `700` |
| DM Serif Display | https://fonts.google.com/specimen/DM+Serif+Display | Google Fonts specimen 200 / google/fonts `ofl/dmserifdisplay/OFL.txt` 200; SIL Open Font License 1.1 | 記念配信、上品な英字タイトル、告知 label | Elegant / serif、クラシック、上品 | 細部が潰れやすい。太い stroke は避ける。 | `400` |
| Caveat | https://fonts.google.com/specimen/Caveat | Google Fonts specimen 200 / google/fonts `ofl/caveat/OFL.txt` 200; SIL Open Font License 1.1 | 手書き note、サイン風、ゆるい補足 | Handwritten / casual、親しみ | display / accent 専用。大文字羅列や長文には向かない。 | `400`; accent 強調なら `700` |

### English Alternates 10

| Font family | Google Fonts specimen URL | License confirmation memo | Intended use | Mood / category | Caution | Recommended implementation weight |
| --- | --- | --- | --- | --- | --- | --- |
| Cinzel | https://fonts.google.com/specimen/Cinzel | Google Fonts specimen 200 / google/fonts `ofl/cinzel/OFL.txt` 200; SIL Open Font License 1.1 | ファンタジー、記念、重厚な英字 title | Elegant / cinematic、古典、品格 | 小文字主体の短文には硬い。大文字タイトル向き。 | `400`; 必要なら `700` |
| Abril Fatface | https://fonts.google.com/specimen/Abril+Fatface | Google Fonts specimen 200 / google/fonts `ofl/abrilfatface/OFL.txt` 200; SIL Open Font License 1.1 | editorial headline、記念告知、上品な強調 | Elegant / bold serif、ファッション寄り | 太く装飾的。細い stroke と小サイズに注意。 | `400` |
| Unbounded | https://fonts.google.com/specimen/Unbounded | Google Fonts specimen 200 / google/fonts `ofl/unbounded/OFL.txt` 200; SIL Open Font License 1.1 | SF、近未来、強い label、ゲーム | Futuristic / geometric、重い、個性強め | 横幅が広くなりやすい。短い英字に限定する。 | `400`; 見出しなら `700` |
| Black Ops One | https://fonts.google.com/specimen/Black+Ops+One | Google Fonts specimen 200 / google/fonts `ofl/blackopsone/OFL.txt` 200; SIL Open Font License 1.1 | バトル、耐久、企画タイトル、強い CTA | Impact / military、ゲーム、硬派 | 用途が限定的。かわいい系には合いにくい。 | `400` |
| Monoton | https://fonts.google.com/specimen/Monoton | Google Fonts specimen 200 / google/fonts `ofl/monoton/OFL.txt` 200; SIL Open Font License 1.1 | neon、レトロ、music label、短い title | Retro / neon、display、派手 | 線構造が複雑。小サイズと太い縁取りは避ける。 | `400` |
| Bungee | https://fonts.google.com/specimen/Bungee | Google Fonts specimen 200 / google/fonts `ofl/bungee/OFL.txt` 200; SIL Open Font License 1.1 | 配信 label、企画ロゴ、ポップな強調 | Display / urban、太い、楽しい | 太さが強い。長い文では詰まりやすい。 | `400` |
| Bungee Shade | https://fonts.google.com/specimen/Bungee+Shade | Google Fonts specimen 200 / google/fonts `ofl/bungeeshade/OFL.txt` 200; SIL Open Font License 1.1 | レトロロゴ風、強い一語、イベント title | Display / shaded、レトロ、装飾 | 影付き形状なので stroke / shadow との干渉に注意。 | `400` |
| Rye | https://fonts.google.com/specimen/Rye | Google Fonts specimen 200 / google/fonts `ofl/rye/OFL.txt` 200; SIL Open Font License 1.1 | レトロ、怪しい告知、western / carnival 風 | Retro / decorative、個性強め | 用途が狭い。採用するなら補欠枠で十分。 | `400` |
| Creepster | https://fonts.google.com/specimen/Creepster | Google Fonts specimen 200 / google/fonts `ofl/creepster/OFL.txt` 200; SIL Open Font License 1.1 | horror、dark cute、闇ガチャ英字 | Dark / horror、崩し、強い個性 | 可読性が低い。短い英字だけにする。 | `400` |
| VT323 | https://fonts.google.com/specimen/VT323 | Google Fonts specimen 200 / google/fonts `ofl/vt323/OFL.txt` 200; SIL Open Font License 1.1 | レトロゲーム、terminal、数字、短い label | Pixel / retro game、mono 風 | `Press Start 2P` より軽いが、本文には向かない。 | `400` |

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
