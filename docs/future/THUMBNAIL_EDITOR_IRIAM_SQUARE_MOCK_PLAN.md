# Thumbnail Editor IRIAM Square Mock Plan

## Purpose

Thumbnail Editor の 1:1 IRIAM 向け preset / material workflow を、production asset 生成や preset body 実装へ進む前に固定する。
この planning PR では、5ジャンルの完成 mock 方針、layer 分離、font / license 境界、後続 asset production plan だけを扱う。

## Scope Boundary

- In scope:
  - 1:1 / 1080 x 1080 の mock direction。
  - `歌枠` / `雑談` / `初配信` / `耐久` / `闇ガチャ` の starter kit 方針。
  - 背景、title transparent image layer、汎用装飾 asset、最小 editable text layer の責務分離。
  - 背景 15枚、title image 25枚、装飾 asset pack の production plan。
  - title image に使う font 名、license、use case の記録。
- Out of scope:
  - production preset body 実装。
  - `public/assets/images/thumbnail-editor/**` への大量 asset 追加。
  - 9:16 preset。
  - font expansion / font UI 改修。
  - text / image layer schema、canvas export、handoff payload、新規ツール実装。

## Design Principles

- IRIAM 向け 1:1 は YouTube 16:9 より情報量を少なくし、1画面で読める大きな title と余白を優先する。
- 背景には文字を焼き込まない。ジャンル名は透明 PNG の title image layer として置く。
- ユーザーが頻繁に変える要素だけ editable text layer にする。初回は `時刻`、`短い一言`、必要なら `目標` までに絞る。
- title image は装飾込みの完成見出しに寄せるが、font 系統は 1-2 種に固定して production asset を増やしすぎない。
- IRIAM 公式ロゴ、公式 UI 風パーツ、誤認される platform branding は入れない。用途向けの汎用 square starter kit として扱う。

## Layer Model

| Layer type | Responsibility | Editable by user | Production note |
| --- | --- | --- | --- |
| Background image | 文字なしの雰囲気、配色、余白、軽い模様 | No | 後続 background asset phase で 3 look x 5 color = 15枚を生成する。 |
| Title transparent image | `歌枠` などジャンル名の大きな装飾タイトル | No | 後続 title image phase で 5 genre x 5 color = 25枚を候補化する。 |
| Decoration image | 吹き出し、雲、星、ハート、リボン、きらきら、手描きライン、小ラベル | No | 16:9 preset でも流用できる汎用 material として登録する。 |
| Editable text | 時刻、短い一言、耐久の目標など差し替え頻度が高い情報 | Yes | 既存 text layer schema の範囲で扱い、font expansion は別 PR にする。 |

## Five Mock Directions

| Genre | Mock direction | Background look | Title image direction | Minimal editable text | Decoration candidates |
| --- | --- | --- | --- | --- | --- |
| `歌枠` | やわらかいライブ告知。歌う楽しさは出すが音符を盛りすぎない。 | `soft_cloud` / pink or blue | 丸く太い `歌枠`。白縁 + 淡い影 + 小さな note accent。 | `20:00 START`、短い歌枠テーマ | 星、きらきら、リボン、小ラベル |
| `雑談` | 近くで話す感じのゆるい配信枠。情報は少なく、親しみを優先。 | `pop_bubble` / mint or yellow | ぽてっとした `雑談`。吹き出し shape と一体化。 | `22:00 START`、今日の話題ひとこと | 吹き出し、ハート、手描きライン、小ラベル |
| `初配信` | welcome / debut の明るい first touch。新人感は出すが過度に豪華にしない。 | `soft_cloud` / pink or mint | 大きな `初配信`。リボンや光で welcoming にする。 | `20:00 START`、`はじめまして` | 雲、リボン、星、きらきら |
| `耐久` | 目標と勢いが伝わる challenge square。16:9 より文字数を削る。 | `pop_bubble` / yellow or blue | 太い `耐久`。少し斜めの勢い、強めの縁取り。 | `目標 100回`、`19:00 START` | 小ラベル、手描きライン、星、progress 風 divider |
| `闇ガチャ` | dark cute / suspense。怖すぎず、配信企画として遊べる不穏さに留める。 | `dark_cute` / purple or pink | `闇ガチャ` を少し上品で怪しい title image にする。 | `一回だけ...`、`23:00 START` | ハート、きらきら、雲、ダーク小ラベル |

## Generated Mock Set

2026-05-21 に `imagegen` built-in mode で5種の direction mock を生成し、title text は後続 review がしやすいように project-local copy へ正確な日本語 title overlay を加えた。
この overlay は production title image asset ではなく、mock review 用の仮処理として扱う。

| Genre | Mock path | Review note |
| --- | --- | --- |
| `歌枠` | `docs/mockups/thumbnail-editor-iriam-square-mocks/iriam-square-karaoke-mock.png` | soft cloud / ribbon / music accent の方向確認用。title image phase では overlay ではなく transparent PNG title を作る。 |
| `雑談` | `docs/mockups/thumbnail-editor-iriam-square-mocks/iriam-square-chat-mock.png` | speech bubble / mint-yellow palette の方向確認用。情報量は少なく保つ。 |
| `初配信` | `docs/mockups/thumbnail-editor-iriam-square-mocks/iriam-square-first-stream-mock.png` | debut / welcome / ribbon frame の方向確認用。豪華にしすぎない。 |
| `耐久` | `docs/mockups/thumbnail-editor-iriam-square-mocks/iriam-square-endurance-mock.png` | yellow-blue challenge palette と goal label の方向確認用。title の勢いは後続 title image phase で再調整する。 |
| `闇ガチャ` | `docs/mockups/thumbnail-editor-iriam-square-mocks/iriam-square-dark-gacha-mock.png` | dark cute / suspense palette の方向確認用。horror ではなく配信企画感を維持する。 |

Mock generation note:

- Japanese title glyphs from direct image generation can drift, so final review files use a deterministic overlay for exact title text.
- Production phase should not reuse the overlay as-is. Instead, create transparent title PNG assets with the selected font / stroke / shadow treatment.
- Keep these files as direction mocks only; do not register them as production material assets.

## Background Asset Production Plan

後続 phase の目標は 15枚。全て文字なし、transparent title / decoration と重ねても読める 1080 x 1080 PNG とする。

| Look id | Role | Visual notes |
| --- | --- | --- |
| `soft_cloud` | 歌枠 / 初配信向けの柔らかい土台 | 雲、淡いグラデーション、軽い spotlight。中央または上部 title の余白を確保する。 |
| `pop_bubble` | 雑談 / 耐久向けのポップな土台 | 丸い bubble、sticker-like panels、読みやすい明るさ。title と time badge を置く余白を残す。 |
| `dark_cute` | 闇ガチャ向け、暗めかわいい土台 | 暗い purple / navy、soft glow、小さな sparkle。怖さより企画感を優先する。 |

Color variants:

- `pink`
- `blue`
- `yellow`
- `purple`
- `mint`

Suggested naming:

- `iriam-square-bg-soft-cloud-pink.png`
- `iriam-square-bg-pop-bubble-mint.png`
- `iriam-square-bg-dark-cute-purple.png`

## Title Image Production Plan

後続 phase の候補は 25枚。`5 genres x 5 color variants` とし、背景へ焼き込まず透明 PNG image layer として扱う。

| Genre id | Display title | Color variants | Notes |
| --- | --- | --- | --- |
| `karaoke` | `歌枠` | pink / blue / yellow / purple / mint | 丸ゴ + 白縁。音符は title image 内の小 accent まで。 |
| `chat` | `雑談` | pink / blue / yellow / purple / mint | 吹き出し shape と相性を取る。長い補足は editable text に逃がす。 |
| `first_stream` | `初配信` | pink / blue / yellow / purple / mint | welcome 感を title 側へ寄せ、背景は汎用のまま使えるようにする。 |
| `endurance` | `耐久` | pink / blue / yellow / purple / mint | 太い縁取りと斜め配置候補。目標値は image へ固定しない。 |
| `dark_gacha` | `闇ガチャ` | pink / blue / yellow / purple / mint | dark_cute 背景と合わせるが、他背景にも置ける contrast を保つ。 |

## Font And License Boundary

title image に使う font は、既存 Thumbnail Editor font manifest / bundled font license note で確認済みの Google Fonts family に限定する。
この PR では font file、CSS、runtime loading は変更しない。

| Font | License | Source / repo note | Use case |
| --- | --- | --- | --- |
| `M PLUS Rounded 1c` | SIL Open Font License 1.1 | Google Fonts specimen / `public/fonts/thumbnail-editor/LICENSES.md` | Primary title image font。`歌枠`、`雑談`、`初配信` の cute / soft 見出し。 |
| `Noto Serif JP` | SIL Open Font License 1.1 | Google Fonts specimen / `public/fonts/thumbnail-editor/LICENSES.md` | Secondary title image font。`闇ガチャ` の少し怪しい上品さ、必要なら title accent。 |

`耐久` はまず `M PLUS Rounded 1c` の太字 + stroke / shadow で試す。
勢いが不足する場合だけ、後続 title image phase で `M PLUS 1p` を追加候補にするが、この planning では採用 font 系統を増やさない。

## Decoration Asset Production Plan

初回 decoration phase は、色数と種類を抑えた汎用 asset pack として作る。
Square だけでなく 16:9 preset でも使える asset 名・カテゴリにする。

| Asset type | Initial role | Suggested variants |
| --- | --- | --- |
| 吹き出し | 雑談 / 一言 / topic label | 2 shapes x 3 colors |
| 雲 | soft_cloud 補助、初配信 / 歌枠の余白埋め | 2 shapes x 3 colors |
| 星 | 歌枠 / 耐久 / 初配信の軽い accent | 2 clusters x 3 colors |
| ハート | 雑談 / 闇ガチャの cute accent | 2 shapes x 3 colors |
| リボン | 初配信 / 歌枠の welcoming accent | 2 shapes x 3 colors |
| きらきら | 全ジャンル共通の light accent | 2 clusters x 3 colors |
| 手描きライン | 目線誘導、耐久 / 雑談の motion 風 accent | 2 strokes x 3 colors |
| 小ラベル | `START` / `TOPIC` / `GOAL` などの短い label base | 3 bases x 3 colors |

## Recommended PR Split

1. `mock planning`
   - This PR. `task.md` と `docs/future` のみ更新する。
2. `background assets`
   - 15 background PNG を生成 / 選別し、background asset contract を追加する。
3. `title image assets`
   - 25 transparent title PNG を生成 / 選別し、font / license note を再確認する。
4. `decoration assets`
   - 汎用 decoration pack を小さく追加し、material library contract を更新する。
5. `starter preset body`
   - `iriam_square_soft` / `iriam_square_pop` / `iriam_square_dark_cute` などを 1 preset / 1 PR または small batch で実装する。

## Verification Note

この planning PR は docs / task 変更のみなので `git diff --check` を baseline とする。
UI / asset / preset body を触らないため、幅別 browser 確認と `thumbnail-preset-text-locale-contract` は任意扱いにする。
