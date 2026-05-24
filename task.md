# task.md

このファイルは現在の運用タスクだけを置く。完了済みの詳細ログ、比較メモ、長い経緯は PR 本文か `docs/archive` に寄せる。

## Current Premises

- 作業は `main` 直ではなく feature branch / worktree で行う。
- 意味のある実装後は、このファイルに実装内容、検証、必要な幅別確認を残す。
- UI 変更時の確認幅は `390 / 820 / 1024 / 1280 / 1366px` を基本にする。
- 通常の表示確認と幅別確認では Codex app の in-app browser を優先する。繰り返し操作や機械的な console / canvas 確認は Playwright、原因調査は Chrome DevTools MCP に切り替える。
- URL 設計、大規模 i18n framework、保存 schema / IndexedDB / localStorage 既存 key / handoff payload、外部投稿連携は、個別タスクで明示されない限り変更しない。
- 1 feature / 1 fix / 1 cleanup を 1 branch / 1 PR に閉じる。公開版の緊急修正と次期機能追加は混ぜない。

## Active Priorities

1. Thumbnail Editor 1:1 IRIAM preset / material planning
   - status: planning PR #182 の上に `codex/thumbnail-iriam-square-mocks` を積み、5ジャンルの direction mock を作成中。production preset、asset registration、UI、schema は触らない。
   - planning doc: `docs/future/THUMBNAIL_EDITOR_IRIAM_SQUARE_MOCK_PLAN.md`
   - implementation summary:
     - 1:1 IRIAM は `background image + title transparent image layer + generic decoration asset + minimal editable text layer` の starter kit として扱う。
     - 5ジャンルは `歌枠` / `雑談` / `初配信` / `耐久` / `闇ガチャ`。
     - 背景は `soft_cloud` / `pop_bubble` / `dark_cute` x `pink` / `blue` / `yellow` / `purple` / `mint` = 15枚を後続 production target にする。
     - title image は 5ジャンル x 5色 = 25枚を候補にし、font 系統は `M PLUS Rounded 1c` と `Noto Serif JP` に抑える。
     - font license は既存 bundled font note と同じ `SIL Open Font License 1.1` を前提に記録し、Google Fonts CDN / CSP / font expansion は変更しない。
     - 装飾 asset は吹き出し、雲、星、ハート、リボン、きらきら、手描きライン、小ラベルから小さく始める。
     - 2026-05-21: `imagegen` built-in mode で 5種 mock を生成し、review 用に正確な日本語 title overlay を加えた project-local copy を `docs/mockups/thumbnail-editor-iriam-square-mocks/` に保存。
     - 2026-05-21: IRIAM 実用向けに standee bust-up placeholder 入り layout mock 5枚を追加。中央 / 左 / 右の立ち絵安全領域を確認できるようにした。
   - generated mock paths:
     - `docs/mockups/thumbnail-editor-iriam-square-mocks/iriam-square-karaoke-mock.png`
     - `docs/mockups/thumbnail-editor-iriam-square-mocks/iriam-square-chat-mock.png`
     - `docs/mockups/thumbnail-editor-iriam-square-mocks/iriam-square-first-stream-mock.png`
     - `docs/mockups/thumbnail-editor-iriam-square-mocks/iriam-square-endurance-mock.png`
     - `docs/mockups/thumbnail-editor-iriam-square-mocks/iriam-square-dark-gacha-mock.png`
   - generated standee layout mock paths:
     - `docs/mockups/thumbnail-editor-iriam-square-standee-layouts/iriam-square-karaoke-standee-right-mock.png`
     - `docs/mockups/thumbnail-editor-iriam-square-standee-layouts/iriam-square-chat-standee-left-mock.png`
     - `docs/mockups/thumbnail-editor-iriam-square-standee-layouts/iriam-square-first-stream-standee-center-mock.png`
     - `docs/mockups/thumbnail-editor-iriam-square-standee-layouts/iriam-square-endurance-standee-right-mock.png`
     - `docs/mockups/thumbnail-editor-iriam-square-standee-layouts/iriam-square-dark-gacha-standee-left-mock.png`
   - verification for this PR:
     - 2026-05-21: `git diff --check` passed. Output included the existing LF/CRLF normalization warning for `task.md` only.
     - 2026-05-21 mock branch: `git diff --check` passed. Output included LF/CRLF normalization warnings for `task.md` and `docs/future/THUMBNAIL_EDITOR_IRIAM_SQUARE_MOCK_PLAN.md` only.
     - 2026-05-21 standee layout update: `git diff --check` passed. Output included LF/CRLF normalization warnings for `task.md` and `docs/future/THUMBNAIL_EDITOR_IRIAM_SQUARE_MOCK_PLAN.md` only.
     - UI / asset / preset body を触らないため幅別 browser 確認は不要。
   - remaining risks:
     - side bust-up layout は実用性が高いが、center bust-up は title / time の逃がし先が少ないため `初配信` など本人主役の用途に絞る。
     - background asset phase では center-left / center-right / top / bottom の safe zone を塞ぐ強い装飾を避ける必要がある。
     - 生成元 mock の日本語 title glyph は崩れやすいため、現在の overlay は review 用。後続 title image phase では transparent PNG title を作り直す。
     - 実際の生成 asset で title image の縁取り、影、背景との contrast を再確認する必要がある。
     - `耐久` title は `M PLUS Rounded 1c` で勢いが不足する可能性があるため、後続 title image phase で必要なら `M PLUS 1p` 追加候補を判断する。
     - 25 title image を一度に入れるとレビューが重くなるため、生成・採用は genre / color を絞って確認してから増やす。
   - next handoff:
     - mock 確認後は background asset phase。まず 15枚の文字なし背景を生成 / 選別し、title / decoration / preset body には進まない。

2. Thumbnail Editor 1:1 IRIAM preset / material planning
   - status: `歌枠` は 1:1 IRIAM square の production asset 登録、`karaoke / square-1-1` preset body、1:1 専用 preset list、設定モーダルまで作成済み。`pop_bubble v1` / `dark_cute v1` は比較用 mock のまま残し、採用版からは外す。
   - direction:
     - IRIAM 向けは YouTube 16:9 より情報量を少なくする。
     - 完成品サムネより、背景 + title image layer + 汎用ゆる装飾 asset + 最小 text layer の starter kit として設計する。
     - 背景焼き込み文字は避ける。配信タイトルは透過 PNG title image layer として扱う。
     - 時刻や短い一言など、ユーザーが頻繁に変える要素だけ editable text layer に残す。
   - mock phase:
     - まず 5ジャンルの 1:1 完成モックを作る。
     - 初回候補: `歌枠` / `雑談` / `初配信` / `耐久` / `闇ガチャ`。
     - この時点で title image に使う font 方針を決める。
     - 使用 font は Google Fonts などライセンス確認できるものに限定し、font 名と license を task / doc に残す。
   - background asset phase:
     - created baseline: `docs/mockups/thumbnail-editor-iriam-square-backgrounds/karaoke/karaoke-soft-cloud-pink-blue-baseline.png`
     - created color variations:
       - `docs/mockups/thumbnail-editor-iriam-square-backgrounds/karaoke/karaoke-soft-cloud-blue.png`
       - `docs/mockups/thumbnail-editor-iriam-square-backgrounds/karaoke/karaoke-soft-cloud-yellow.png`
       - `docs/mockups/thumbnail-editor-iriam-square-backgrounds/karaoke/karaoke-soft-cloud-purple.png`
       - `docs/mockups/thumbnail-editor-iriam-square-backgrounds/karaoke/karaoke-soft-cloud-mint.png`
     - created `pop_bubble` variations:
       - `docs/mockups/thumbnail-editor-iriam-square-backgrounds/karaoke/karaoke-pop-bubble-pink-blue-baseline.png`
       - `docs/mockups/thumbnail-editor-iriam-square-backgrounds/karaoke/karaoke-pop-bubble-blue.png`
       - `docs/mockups/thumbnail-editor-iriam-square-backgrounds/karaoke/karaoke-pop-bubble-yellow.png`
       - `docs/mockups/thumbnail-editor-iriam-square-backgrounds/karaoke/karaoke-pop-bubble-purple.png`
       - `docs/mockups/thumbnail-editor-iriam-square-backgrounds/karaoke/karaoke-pop-bubble-mint.png`
     - created `pop_bubble v2` variations:
       - `docs/mockups/thumbnail-editor-iriam-square-backgrounds/karaoke/karaoke-pop-bubble-v2-pink-blue-baseline.png`
       - `docs/mockups/thumbnail-editor-iriam-square-backgrounds/karaoke/karaoke-pop-bubble-v2-blue.png`
       - `docs/mockups/thumbnail-editor-iriam-square-backgrounds/karaoke/karaoke-pop-bubble-v2-yellow.png`
       - `docs/mockups/thumbnail-editor-iriam-square-backgrounds/karaoke/karaoke-pop-bubble-v2-purple.png`
       - `docs/mockups/thumbnail-editor-iriam-square-backgrounds/karaoke/karaoke-pop-bubble-v2-mint.png`
     - created `dark_cute` variations:
       - `docs/mockups/thumbnail-editor-iriam-square-backgrounds/karaoke/karaoke-dark-cute-pink-blue-baseline.png`
       - `docs/mockups/thumbnail-editor-iriam-square-backgrounds/karaoke/karaoke-dark-cute-blue.png`
       - `docs/mockups/thumbnail-editor-iriam-square-backgrounds/karaoke/karaoke-dark-cute-yellow.png`
       - `docs/mockups/thumbnail-editor-iriam-square-backgrounds/karaoke/karaoke-dark-cute-purple.png`
       - `docs/mockups/thumbnail-editor-iriam-square-backgrounds/karaoke/karaoke-dark-cute-mint.png`
     - created `dark_cute v2` variations:
       - `docs/mockups/thumbnail-editor-iriam-square-backgrounds/karaoke/karaoke-dark-cute-v2-pink-blue-baseline.png`
       - `docs/mockups/thumbnail-editor-iriam-square-backgrounds/karaoke/karaoke-dark-cute-v2-blue.png`
       - `docs/mockups/thumbnail-editor-iriam-square-backgrounds/karaoke/karaoke-dark-cute-v2-yellow.png`
       - `docs/mockups/thumbnail-editor-iriam-square-backgrounds/karaoke/karaoke-dark-cute-v2-purple.png`
       - `docs/mockups/thumbnail-editor-iriam-square-backgrounds/karaoke/karaoke-dark-cute-v2-mint.png`
     - baseline constraints:
       - 1080 x 1080 PNG。
       - `pink / blue baseline`、`blue`、`yellow`、`purple`、`mint` の `soft_cloud` / `pop_bubble` / `dark_cute`。
       - 焼き込みは pastel cloud / sky gradient、pastel bubble pattern、soft vignette、cloud haze、lace/dot texture、soft spotlight、淡い bokeh / sparkle texture、低コントラスト模様まで。
       - text / genre name / time / logo / title image / music notes / strong star or heart accents / character / person / face は含めない。
     - current direction:
       - `pop_bubble` は v2 の方が bubble layout / density のセット感が強いため、採用候補は v2 優先。
       - `dark_cute` は v2 の方が lace / doily / ornate pattern が減り、AI 感が弱いため、採用候補は v2 優先。
       - v1 は比較用 mock として残し、production registration 前に採用版だけ整理する。
     - production registered backgrounds:
       - `public/assets/images/thumbnail-editor/iriam-square/karaoke/backgrounds/karaoke-square-soft-cloud-*-v1.png`
       - `public/assets/images/thumbnail-editor/iriam-square/karaoke/backgrounds/karaoke-square-pop-bubble-*-v1.png`
       - `public/assets/images/thumbnail-editor/iriam-square/karaoke/backgrounds/karaoke-square-dark-cute-*-v1.png`
       - registered set: `soft_cloud` / `pop_bubble v2` / `dark_cute v2` x `pink-blue` / `blue` / `yellow` / `purple` / `mint` = 15 assets.
     - 見た目 3種 x カラバリ 5種 = 背景 15枚を目標にする。
     - 例: `soft_cloud` / `pop_bubble` / `dark_cute`。
     - カラバリ例: pink / blue / yellow / purple / mint。
     - まず背景のみ確認し、その後 title / decoration に進む。
   - title image asset phase:
     - created baseline: `docs/mockups/thumbnail-editor-iriam-square-title-images/karaoke/karaoke-title-pink-blue-baseline.png`
     - created preview: `docs/mockups/thumbnail-editor-iriam-square-title-images/karaoke/karaoke-title-pink-blue-on-soft-cloud-preview.png`
     - created rounded font candidates:
       - `docs/mockups/thumbnail-editor-iriam-square-title-images/karaoke/karaoke-title-mochiy-pop-p-one-pink-blue-candidate.png`
       - `docs/mockups/thumbnail-editor-iriam-square-title-images/karaoke/karaoke-title-kiwi-maru-pink-blue-candidate.png`
       - `docs/mockups/thumbnail-editor-iriam-square-title-images/karaoke/karaoke-title-hachi-maru-pop-pink-blue-candidate.png`
       - `docs/mockups/thumbnail-editor-iriam-square-title-images/karaoke/karaoke-title-kosugi-maru-pink-blue-candidate.png`
     - created font candidate preview: `docs/mockups/thumbnail-editor-iriam-square-title-images/karaoke/karaoke-title-font-candidates-on-soft-cloud-preview.png`
     - created font candidate preview with `Mochiy Pop P One`: `docs/mockups/thumbnail-editor-iriam-square-title-images/karaoke/karaoke-title-font-candidates-with-mochiy-on-soft-cloud-preview.png`
     - production registered title images:
       - `public/assets/images/thumbnail-editor/iriam-square/karaoke/titles/karaoke-square-title-pink-blue-v1.png`
       - `public/assets/images/thumbnail-editor/iriam-square/karaoke/titles/karaoke-square-title-blue-v1.png`
       - `public/assets/images/thumbnail-editor/iriam-square/karaoke/titles/karaoke-square-title-yellow-v1.png`
       - `public/assets/images/thumbnail-editor/iriam-square/karaoke/titles/karaoke-square-title-purple-v1.png`
       - `public/assets/images/thumbnail-editor/iriam-square/karaoke/titles/karaoke-square-title-mint-v1.png`
     - created production default preview: `docs/mockups/thumbnail-editor-iriam-square-preset-previews/karaoke/karaoke-square-production-default-preview.png`
     - title text: `歌枠`
     - font: `M PLUS Rounded 1c` 900 from existing self-hosted Thumbnail Editor font assets.
     - rounded font candidate direction:
       - `Mochiy Pop P One` は太く丸く、歌枠 title image として最もポップ感が強い。production registration する場合は font asset 追加 PR で self-host 登録する。
       - `Kiwi Maru` は丸さと可読性のバランスが良く、次の採用候補優先。
       - `Hachi Maru Pop` は最も手書き / cute 寄りだが、細く見えやすいため太め stroke 前提。
       - `Kosugi Maru` は安定して読みやすいが、雰囲気は少し通常ゴシック寄り。
     - `Mochiy Pop P One` license/source: SIL Open Font License 1.1, Google Fonts `ofl/mochiypoppone`.
     - license: SIL Open Font License 1.1 as recorded in `public/fonts/thumbnail-editor/LICENSES.md`.
     - output: transparent PNG, 760 x 320.
     - title image production registration is in scope for `歌枠` only. Other genres are still out of scope.
     - 2026-05-23 follow-up: `雑談` / `初配信` / `耐久` / `闇ガチャ` の title image font 方針を確認し、まず `雑談` baseline を作成。
     - 2026-05-23 font selection:
       - `雑談`: `Yusei Magic` 400 で確定。Google Fonts / `google/fonts` `ofl/yuseimagic` / SIL Open Font License 1.1。装飾なしでも少し手書き感が出て、ゆるい chat starter に合う。
       - `初配信`: `Mochiy Pop One` 400 を第一候補。Google Fonts / `google/fonts` `ofl/mochiypopone` / SIL Open Font License 1.1。歓迎感とポップさがあり、装飾なしでも debut title として成立しやすい。
       - `耐久`: glyph verified 比較後、汎用性を優先して `Dela Gothic One` 400 を第一候補にする。Google Fonts / `google/fonts` `ofl/delagothicone` / SIL Open Font License 1.1。`Rampart One` は強いが用途が狭く、`Dela Gothic One` の方が後続カラバリ / 他背景へ展開しやすい。
       - `闇ガチャ`: glyph verified 比較では `New Tegomin` 400 が第一候補。Google Fonts / `google/fonts` `ofl/newtegomin` / SIL Open Font License 1.1。強烈すぎず、少し崩れた手触りを出しやすい。
     - 2026-05-23 font boundary:
       - `雑談` は Google Fonts から `Yusei Magic` を候補採用。2026-05-24 follow-up で selected title fonts の self-host registration まで実施。
       - `Mochiy Pop P One` は既存 `歌枠` title image の生成済み asset で使うが、今回の 4ジャンル baseline では追加採用しない。
       - 系統は `handwritten soft`（`Yusei Magic`）、`pop rounded`（`Mochiy Pop One` / `M PLUS Rounded 1c`）、`impact gothic`（`Dela Gothic One` / `Reggae One`）、`serif accent`（`Kaisei Opti` / `Noto Serif JP`）までに抑える。
       - 個人制作の一般配布 font は、商用利用可でも再配布 / 改変 / Web 配信 / subset 化の条件が font ごとに揺れやすいため、初回 title image baseline では採用しない。Google Fonts / OFL など source と redistribution 条件を確認しやすいものに限定する。
     - 2026-05-24 selected title font self-host registration:
       - `Yusei Magic` 400: `public/fonts/thumbnail-editor/yusei-magic/yusei-magic-400-ja-seed-v1.woff2`
       - `Mochiy Pop One` 400: `public/fonts/thumbnail-editor/mochiy-pop-one/mochiy-pop-one-400-ja-seed-v1.woff2`
       - `Dela Gothic One` 400: `public/fonts/thumbnail-editor/dela-gothic-one/dela-gothic-one-400-ja-seed-v1.woff2`
       - `New Tegomin` 400: `public/fonts/thumbnail-editor/new-tegomin/new-tegomin-400-ja-seed-v1.woff2`
       - Runtime registration: `components/thumbnail-editor/thumbnailFontAssets.module.css` `@font-face` + `lib/thumbnail-editor.ts` `thumbnailFontManifest` only. Preset body / schema / right panel UI / title image post-edit UI remain out of scope.
     - 2026-05-23 created chat no-decoration candidates:
       - `docs/mockups/thumbnail-editor-iriam-square-title-images/chatting/chatting-title-yusei-magic-mint-no-decoration-candidate.png`
       - `docs/mockups/thumbnail-editor-iriam-square-title-images/chatting/chatting-title-kiwi-maru-mint-no-decoration-candidate.png`
       - `docs/mockups/thumbnail-editor-iriam-square-title-images/chatting/chatting-title-m-plus-rounded-1c-mint-no-decoration-candidate.png`
       - `docs/mockups/thumbnail-editor-iriam-square-title-images/chatting/chatting-title-no-decoration-font-candidates-on-pop-bubble-preview.png`
       - `docs/mockups/thumbnail-editor-iriam-square-title-images/chatting/chatting-title-yusei-magic-mint-on-pop-bubble-preview.png`
     - 2026-05-23 created first-stream no-decoration candidates:
       - `docs/mockups/thumbnail-editor-iriam-square-title-images/first-stream/first-stream-title-mochiy-pop-one-no-decoration-candidate.png`
       - `docs/mockups/thumbnail-editor-iriam-square-title-images/first-stream/first-stream-title-dela-gothic-one-no-decoration-candidate.png`
       - `docs/mockups/thumbnail-editor-iriam-square-title-images/first-stream/first-stream-title-m-plus-rounded-1c-no-decoration-candidate.png`
       - `docs/mockups/thumbnail-editor-iriam-square-title-images/first-stream/first-stream-title-no-decoration-font-candidates-on-soft-cloud-preview.png`
       - `docs/mockups/thumbnail-editor-iriam-square-title-images/first-stream/first-stream-title-mochiy-pop-one-pink-blue-on-soft-cloud-preview.png`
     - 2026-05-23 created endurance no-decoration candidates, superseded by the 2026-05-24 glyph-verified comparison below because the original `sharp` SVG path did not reliably prove font rendering.
     - 2026-05-24 created endurance angular follow-up candidates:
       - root cause: previous `sharp` SVG font comparison looked too similar because font loading / fallback could not be distinguished reliably in that path.
       - validation: checked `cmap` glyph coverage for `耐久` first, then regenerated with Playwright / Chromium from real `@font-face` rendering.
       - `docs/mockups/thumbnail-editor-iriam-square-title-images/endurance/endurance-title-train-one-glyph-verified-no-decoration-candidate.png`
       - `docs/mockups/thumbnail-editor-iriam-square-title-images/endurance/endurance-title-rampart-one-glyph-verified-no-decoration-candidate.png`
       - `docs/mockups/thumbnail-editor-iriam-square-title-images/endurance/endurance-title-stick-glyph-verified-no-decoration-candidate.png`
       - `docs/mockups/thumbnail-editor-iriam-square-title-images/endurance/endurance-title-dela-gothic-one-glyph-verified-no-decoration-candidate.png`
       - `docs/mockups/thumbnail-editor-iriam-square-title-images/endurance/endurance-title-rocknroll-one-glyph-verified-no-decoration-candidate.png`
       - `docs/mockups/thumbnail-editor-iriam-square-title-images/endurance/endurance-title-glyph-verified-font-candidates-on-pop-bubble-preview.png`
       - `docs/mockups/thumbnail-editor-iriam-square-title-images/endurance/endurance-title-dela-gothic-one-yellow-on-pop-bubble-glyph-verified-preview.png`
     - 2026-05-23 created dark-gacha no-decoration candidates, superseded by the 2026-05-24 glyph-verified comparison below because the original `sharp` SVG path did not reliably prove font rendering.
     - 2026-05-24 created dark-gacha rough / handwritten follow-up candidates:
       - root cause: previous `sharp` SVG font comparison looked too similar because font loading / fallback could not be distinguished reliably in that path.
       - validation: checked `cmap` glyph coverage for `闇ガチャ` first, then regenerated with Playwright / Chromium from real `@font-face` rendering.
       - `docs/mockups/thumbnail-editor-iriam-square-title-images/dark-gacha/dark-gacha-title-new-tegomin-glyph-verified-no-decoration-candidate.png`
       - `docs/mockups/thumbnail-editor-iriam-square-title-images/dark-gacha/dark-gacha-title-yuji-mai-glyph-verified-no-decoration-candidate.png`
       - `docs/mockups/thumbnail-editor-iriam-square-title-images/dark-gacha/dark-gacha-title-yuji-boku-glyph-verified-no-decoration-candidate.png`
       - `docs/mockups/thumbnail-editor-iriam-square-title-images/dark-gacha/dark-gacha-title-zen-antique-glyph-verified-no-decoration-candidate.png`
       - `docs/mockups/thumbnail-editor-iriam-square-title-images/dark-gacha/dark-gacha-title-kaisei-opti-glyph-verified-no-decoration-candidate.png`
       - `docs/mockups/thumbnail-editor-iriam-square-title-images/dark-gacha/dark-gacha-title-glyph-verified-font-candidates-on-dark-cute-preview.png`
       - `docs/mockups/thumbnail-editor-iriam-square-title-images/dark-gacha/dark-gacha-title-new-tegomin-glyph-verified-purple-on-dark-cute-preview.png`
     - 2026-05-23 chat color variation plan:
       - baseline は `mint`。`pop_bubble` mint 背景上で白系 fill、mint outer stroke、warm peach inner stroke を使い、左 standee 想定の右上寄せでも読める密度にする。
       - 5色展開は `pink-blue` / `blue` / `yellow` / `purple` / `mint`。背景色に合わせて fill は白系で固定し、outer stroke と inner stroke だけを変える。
       - 5色展開前に、baseline preview で title が背景 bubble / sparkle に埋もれないこと、standee placeholder と競合しないことを確認する。
       - 5色展開しても production registration / preset body / settings modal option 追加には進まない。
     - 5ジャンル x カラバリ 5種 = 25枚を候補にする。
     - ただし font 系統は 1-2 種に絞る。最終的に text layer 用 font 追加が入るため、title image を増やしすぎない。
     - title image は背景に焼き込まず、透明 PNG image layer として配置する。
   - decoration asset phase:
     - 吹き出し、雲、星、ハート、リボン、きらきら、手描きライン、小ラベルを候補にする。
     - 16:9 preset でも使える汎用 asset として library に追加する。
     - 初回は asset 種類と色数を抑え、使われ方を見て第2弾で増やす。
   - preset body phase:
     - `karaoke / square-1-1` now uses a dedicated 1080 x 1080 body instead of scaling the existing 16:9 `karaoke` body.
     - default square body uses `soft_cloud pink-blue` background and `Mochiy Pop P One` pink-blue title PNG.
     - `lib/thumbnail-editor.ts` exports `thumbnailIriamSquareKaraokeBackgroundAssets` and `thumbnailIriamSquareKaraokeTitleAssets` for the adopted asset set.
     - `lib/thumbnail-editor.ts` now also exports configurable `createKaraokeIriamSquareDraft(config)` so background style / background color / title color can be selected without changing the draft schema.
     - `square-1-1` preset lists show only the currently supported square genre (`歌枠`) instead of rendering unsupported 16:9 presets as disabled cards.
     - `歌枠` card selection opens a settings modal with 1:1 preview and options for `soft_cloud` / `pop_bubble` / `dark_cute`, `pink-blue` / `blue` / `yellow` / `purple` / `mint`, and title color `背景に合わせる` or an independent colorway.
     - modal initial selection is `歌枠` / `soft_cloud` / `pink-blue` / `タイトルカラー=背景に合わせる`.
     - modal apply creates normal image / text / shape layers from the selected assets; draft schema is unchanged.
     - variant selector now allows `square-1-1` for local review of the IRIAM preset body. `portrait-9-16` remains disabled as a later candidate.
     - `square-1-1` selected state now renders the editor / full-preview canvas with the active draft aspect ratio instead of a fixed 16:9 preview frame.
     - `square-1-1` selected state now routes to `karaoke` and removes non-`karaoke` presets until those presets have dedicated square bodies.
     - existing `karaoke / landscape-16-9` preset body remains unchanged.
     - 初回 preset 候補: `iriam_square_soft` / `iriam_square_pop` / `iriam_square_dark_cute`。
     - 1 preset / 1 PR に閉じるか、mock / asset / preset body を段階 PR に分ける。
   - out of scope:
     - schema 変更。
     - canvas export 変更。
     - 9:16 preset 実装。
     - font search / recently used UI 変更。
     - 新規ツール実装。
   - suggested first branch/worktree:
     - branch: `codex/thumbnail-iriam-karaoke-soft-cloud-bg`
     - worktree: `D:/V_streamer_tools/.worktrees/thumbnail-iriam-karaoke-soft-cloud-bg`
   - latest verification:
     - 2026-05-23 modal follow-up:
       - #185 state: `MERGED` into `codex/thumbnail-iriam-square-preview`.
       - branch/worktree: `codex/thumbnail-iriam-square-preset-modal` at `D:/V_streamer_tools/.worktrees/thumbnail-iriam-square-preset-modal`, based on `origin/codex/thumbnail-iriam-square-preview`.
       - `node scripts/thumbnail-iriam-karaoke-square-preset-contract.mjs` passed.
       - `node scripts/thumbnail-preset-text-locale-contract.mjs` passed.
       - `npx tsc --noEmit` passed.
       - `npm run lint` passed.
       - `git diff --check` passed with existing LF/CRLF normalization warnings for touched files only.
       - Chrome DevTools local check at `http://localhost:3005/tools/thumbnail-editor/`: 1:1 switch showed `1 / 1` preset count, only `歌枠`, modal opened from the card, `dark_cute` background + purple title was selectable independently, and apply returned to normal image / text / shape layers.
       - width checks: `390 / 820 / 1024 / 1280 / 1366px` all kept square label, `1 / 1` preset list, visible 1:1 canvas ratio, and no horizontal overflow.
     - generated sources inspected visually for no text / no person / no logo / no title image.
     - saved mocks resized to 1080 x 1080 PNG.
     - `pop_bubble mint` includes tiny low-contrast diamond sparkle texture; keep for direction check, but revisit if it competes with title / standee layers.
     - `dark_cute` has stronger edge texture than `soft_cloud` / `pop_bubble`; keep for direction check, but title / standee compositing should decide whether the lace texture needs to be softened.
     - `pop_bubble v2` and `dark_cute v2` were generated from one baseline each to reduce per-color layout drift.
     - `歌枠` title baseline was generated deterministically from existing `M PLUS Rounded 1c` font assets; no AI-generated text was used.
     - title preview checked on `karaoke-soft-cloud-pink-blue-baseline.png` for basic readability.
     - rounded title font candidates were generated deterministically from existing self-hosted `Kiwi Maru` / `Hachi Maru Pop` / `Kosugi Maru` font assets.
     - `Mochiy Pop P One` was fetched from Google Fonts only for this comparison mock; no production font registration was added.
     - title candidate PNGs were checked as 760 x 320 transparent PNGs; comparison previews were checked as 1080 x 1080 PNG.
     - `Mochiy Pop P One` title colorways were generated as production title PNGs; runtime font registration was not added because the preset uses transparent title image layers.
     - 2026-05-23 `雑談` title candidates were generated deterministically from `Yusei Magic` 400, existing self-hosted `Kiwi Maru` 500, and existing self-hosted `M PLUS Rounded 1c` 900; no AI-generated text was used.
     - 2026-05-23 `Yusei Magic` source/license: Google Fonts `google/fonts` `ofl/yuseimagic`, SIL Open Font License 1.1. The TTF was used only for mock generation and was not committed as a production font asset.
     - 2026-05-23 `雑談` candidate PNGs were checked as 760 x 320 RGBA PNGs; comparison and single-font previews were checked as 1080 x 1080 RGBA PNG and visually reviewed on the existing `pop_bubble mint` square background.
     - 2026-05-23 `初配信` / `耐久` / `闇ガチャ` title candidates were generated deterministically from temporary Google Fonts downloads and existing self-hosted fonts; no AI-generated text was used.
     - 2026-05-23 additional Google Fonts source/license:
       - `Mochiy Pop One`: Google Fonts `google/fonts` `ofl/mochiypopone`, SIL Open Font License 1.1.
       - `Dela Gothic One`: Google Fonts `google/fonts` `ofl/delagothicone`, SIL Open Font License 1.1.
       - `Reggae One`: Google Fonts listing / Fontworks `Reggae`, SIL Open Font License 1.1.
       - `Kaisei Opti`: Google Fonts `google/fonts` `ofl/kaiseiopti`, SIL Open Font License 1.1.
       - `Zen Old Mincho`: Google Fonts / `googlefonts/zen-oldmincho`, SIL Open Font License 1.1.
       - `Train One`: Google Fonts / Fontworks `Train`, SIL Open Font License 1.1.
       - `Rampart One`: Google Fonts / Fontworks `Rampart`, SIL Open Font License 1.1.
       - `Stick`: Google Fonts `google/fonts` `ofl/stick`, SIL Open Font License 1.1.
       - `New Tegomin`: Google Fonts `google/fonts` `ofl/newtegomin`, SIL Open Font License 1.1.
       - `Yuji Boku`: Google Fonts `google/fonts` `ofl/yujiboku`, SIL Open Font License 1.1.
       - `Zen Antique`: Google Fonts `google/fonts` `ofl/zenantique`, SIL Open Font License 1.1.
       - `Yuji Mai`: Google Fonts `google/fonts` `ofl/yujimai`, SIL Open Font License 1.1.
     - 2026-05-23 additional candidate PNGs were checked as 760 x 320 RGBA PNGs; comparison and first-candidate previews were checked as 1080 x 1080 RGBA PNG and visually reviewed on existing square backgrounds.
     - `karaoke / square-1-1` has a dedicated contract: `node scripts/thumbnail-iriam-karaoke-square-preset-contract.mjs`.
     - `square-1-1` UI regression fix:
       - editor canvas style now sets both visual width and height from the active draft canvas.
       - mobile full preview frame now uses the active draft canvas aspect ratio.
       - preset menu / preset cards / recent-favorite shortcuts disable non-`karaoke` presets while `square-1-1` is active.
     - verification completed:
       - `node scripts/thumbnail-iriam-karaoke-square-preset-contract.mjs`
       - `node scripts/thumbnail-preset-text-locale-contract.mjs`
       - `npx tsc --noEmit`
       - `npm run lint`
       - sampled PNG size check for production backgrounds / titles / preview.
       - local dev server on `http://localhost:3003/tools/thumbnail-editor` returned HTTP 200.
       - Playwright local check on `http://localhost:3003/tools/thumbnail-editor/`: selecting `square-1-1` produced `1080 x 1080 / 1:1`, canvas attr `1080 x 1080`, and square CSS preview at `390 / 820 / 1024 / 1280 / 1366px`.
       - Playwright local check confirmed non-`karaoke` preset buttons are disabled while `square-1-1` is active; preset menu shows `配信告知（後続候補）` disabled and `歌枠` enabled.
       - `git diff --check` passed with LF/CRLF warnings only.
     - attempted verification:
       - `node scripts/thumbnail-preset-discovery-contract.mjs` currently fails because that existing script still expects the category filter list before `membership_stream` / `asmr_stream` were added. This is not introduced by the `karaoke / square-1-1` change.
     - UI width checks for the reported 1:1 preview regression are recorded above.
3. Thumbnail Editor title image / decoration asset phases
   - status: `雑談` title image は `Yusei Magic`、`初配信` は `Mochiy Pop One`、`耐久` は `Dela Gothic One`、`闇ガチャ` は `New Tegomin` で確定。4フォントは selected title font として self-host 登録済み。次は各ジャンルを1つずつ5色カラバリへ進める。
   - title image:
     - 5ジャンル x 5色 = 25 transparent PNG 候補。
     - font 系統は `handwritten soft`（`Yusei Magic`）、`pop rounded`（`Mochiy Pop One` / `M PLUS Rounded 1c`）、`impact gothic`（`Dela Gothic One` / `Reggae One`）、`serif accent`（`Kaisei Opti` / `Noto Serif JP`）を基本にし、必要時だけ追加候補を検討する。
     - decoration policy: title image 内の星、ハート、リボン、小丸、カーブ線などの飾りは入れない。可読性のための fill / stroke / shadow のみで作る。
     - next genre候補: `初配信`。`Mochiy Pop One` は方向が固まっているため、pink-blue 5色展開の前に 1:1 standee placeholder と重ねて過度に太すぎないか確認する。
     - remaining risk: `耐久` は `Dela Gothic One` が汎用的な一方で、勢いを出すには stroke / shadow / rotation で補う必要がある。`闇ガチャ` は `New Tegomin` が有力だが、崩れを出しすぎると読みにくいため 5色展開前に dark background 上の縁取り太さを調整する。
     - 2026-05-24 visual check: selected baseline previews were re-opened locally:
       - `docs/mockups/thumbnail-editor-iriam-square-title-images/chatting/chatting-title-yusei-magic-mint-on-pop-bubble-preview.png`
       - `docs/mockups/thumbnail-editor-iriam-square-title-images/first-stream/first-stream-title-mochiy-pop-one-pink-blue-on-soft-cloud-preview.png`
       - `docs/mockups/thumbnail-editor-iriam-square-title-images/endurance/endurance-title-dela-gothic-one-yellow-on-pop-bubble-glyph-verified-preview.png`
       - `docs/mockups/thumbnail-editor-iriam-square-title-images/dark-gacha/dark-gacha-title-new-tegomin-glyph-verified-purple-on-dark-cute-preview.png`
     - 2026-05-24 verification: `node scripts/thumbnail-font-policy-contract.mjs`, `node scripts/thumbnail-iriam-karaoke-square-preset-contract.mjs`, `npx tsc --noEmit`, and `git diff --check` passed. `git diff --check` reported only LF/CRLF normalization warnings for touched files.
     - 2026-05-24 font asset check: selected title font files were re-downloaded with `font/woff2` accept headers and verified as WOFF2 (`wOF2`) before final verification.
   - decoration:
     - 吹き出し、雲、星、ハート、リボン、きらきら、手描きライン、小ラベル。
     - 16:9 preset にも流用できる generic material として登録する。
   - out of scope:
     - starter preset body との同時実装。
     - schema / canvas export / handoff payload 変更。

4. Thumbnail Editor font / preset typography follow-up
   - status: 1:1 IRIAM mock / first asset direction の後に着手する。
   - direction:
     - 単純な font 追加より、preset / title image / editable text の実需要を見てから増やす。
     - IRIAM title image で使った license-free font を、必要に応じて editable text layer 用にも追加する。
     - language / mood category、font search、recently used は既に主要導線が入っているため、大きな UI 改修と混ぜない。
   - out of scope:
     - 1:1 preset body 実装との同時実装。
     - material asset 大量追加との同時実装。

5. Kuro Live Comment Translator planning
   - status: 新規ツール候補。1:1 preset と font follow-up の後に planning へ戻る。
   - seed: `C:/Users/taka/Downloads/COMMENT_TRANSLATION_TOOL_PLAN.md`
   - recommended first scope:
     - OBS Browser Dock 前提の read-only MVP。
     - 1 platform から開始。
     - owner-only / OAuth / rate limit / quota / moderation を前提にする。
     - コメント翻訳、短い要約、用語集を中心にし、返信生成や自動投稿は初期 scope に入れない。
   - suggested branch/worktree:
     - branch: `codex/comment-translator-planning`
     - worktree: `D:/V_streamer_tools/.worktrees/comment-translator-planning`

## Recommended Roadmap

1. 1:1 IRIAM mock planning docs PR
2. 1:1 IRIAM background assets
3. 1:1 IRIAM title image assets
4. 1:1 IRIAM decoration assets
5. 1:1 IRIAM starter presets
6. Font / preset typography follow-up
7. New tool planning: Kuro Live Comment Translator

9:16 presets are still valuable for YouTube Shorts / vertical streams, but should follow after the 1:1 IRIAM workflow proves the square asset / title image pattern.

## Next Session Prompt

次セッションでそのまま使う prompt。

```text
D:/V_streamer_tools で作業してください。

目的:
Thumbnail Editor の 1:1 IRIAM 向け workflow follow-up として、1:1 専用プリセット一覧と `歌枠` プリセット設定モーダルを実装してください。

前提:
- main 直作業は禁止です。
- `git fetch origin --prune` を実行してください。
- `codex/thumbnail-iriam-karaoke-soft-cloud-bg` / `D:/V_streamer_tools/.worktrees/thumbnail-iriam-karaoke-soft-cloud-bg` の差分から確認してください。
- その確認用 PR が未 merge の場合は、新規実装へ進まず merge 待ち / review 対応が必要かだけを blocker summary として返してください。
- `AGENTS.md` と `task.md` を確認してから作業してください。

実装方針:
- `lib/thumbnail-editor.ts` に `thumbnailIriamSquareKaraokeBackgroundAssets` 15件と `thumbnailIriamSquareKaraokeTitleAssets` 5件を追加済み。
- production backgrounds は `public/assets/images/thumbnail-editor/iriam-square/karaoke/backgrounds/`。
- production title images は `public/assets/images/thumbnail-editor/iriam-square/karaoke/titles/`。
- default square preset preview は `docs/mockups/thumbnail-editor-iriam-square-preset-previews/karaoke/karaoke-square-production-default-preview.png`。
- `karaoke / square-1-1` は existing `karaoke` preset ID の variant body として追加済み。16:9 body は変更しない。
- default square body は `soft_cloud pink-blue` background + `Mochiy Pop P One` pink-blue title PNG + 最小 editable text layer。
- `Mochiy Pop P One` は title PNG 生成に使った。runtime font 登録はしていない。
- alternate background styles / colorways は production asset metadata まで。UI-level switching は未実装。
- `pop_bubble v1` / `dark_cute v1` は比較用 mock のまま。採用版は `pop_bubble v2` / `dark_cute v2`。
- `1:1` 選択時のプリセット一覧は 1:1 対応ジャンルだけ表示する。16:9 専用プリセットはグレーアウトではなく一覧から外す。
- 初回の実対応ジャンルは `歌枠` のみ。`雑談` / `初配信` / `耐久` / `闇ガチャ` などは必要なら構造上の候補に留め、production body は追加しない。
- `歌枠` card 選択時にプリセット設定モーダルを開く。
- モーダル内で 1:1 preview を見ながら次を選べるようにする:
  - 背景タイプ: `soft_cloud` / `pop_bubble` / `dark_cute`
  - 背景カラー: `pink-blue` / `blue` / `yellow` / `purple` / `mint`
  - タイトルカラー: `背景に合わせる` または `pink-blue` / `blue` / `yellow` / `purple` / `mint`
- 初期選択は `歌枠` / `soft_cloud` / `pink-blue` / `タイトルカラー=背景に合わせる`。
- 背景 15種と `歌枠` title image 5種は modal preview と draft 作成に使う。
- 背景色とタイトル色は独立選択できるようにする。例: 背景 `pink-blue` + タイトル `blue`。
- 作成後は通常の image / text / shape layer として配置する。draft schema は変更しない。
- 右パネルでの背景・タイトル・装飾差し替え UI は次 PR に分ける。
- out of scope:
  - 他ジャンルの title image 生成。
  - decoration asset 追加。
  - 右パネルでの後付け差し替え UI。
  - schema 変更。
  - 9:16 preset。
  - 16:9 preset body 変更。
  - 新規ツール実装。

検証:
- `node scripts/thumbnail-iriam-karaoke-square-preset-contract.mjs`
- `node scripts/thumbnail-preset-text-locale-contract.mjs`
- `npx tsc --noEmit`
- `npm run lint`
- `git diff --check`
- UI 変更なので `390 / 820 / 1024 / 1280 / 1366px` の幅別確認結果を `task.md` に残す。
- 注意: `node scripts/thumbnail-preset-discovery-contract.mjs` は既存 script が `membership_stream` / `asmr_stream` 追加前の category expectation のため失敗する。今回差分起因ではない。

完了時:
- `task.md` に確認結果、残リスク、次候補への引き継ぎを追記してください。
- commit / push / PR は指示があるまで行わないでください。
```

## Backlog

- Thumbnail Editor:
  - 1:1 IRIAM preset / material workflow。
  - 9:16 preset for YouTube Shorts / vertical streams。
  - crop 仕様。
  - text / image layer schema。
  - public asset / font follow-up。
  - preset typography refinement。
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

docs / contract 変更時は、必要に応じて次を実行する。

- `node scripts/static-export-rsc-aliases.mjs --check`
- `node scripts/tool-portal-entry-contract.mjs`
- `node scripts/tool-handoff-contract.mjs`
- `node scripts/thumbnail-material-assets-contract.mjs`
- `node scripts/thumbnail-quality-guard-contract.mjs`
- `node scripts/thumbnail-standee-placement-contract.mjs`
- `node scripts/thumbnail-preset-text-locale-contract.mjs`
- `node scripts/sns-split-image-maker-contract.mjs`
- `node scripts/portal-tools-copy-locale-contract.mjs`
- `npm run lint`
- `npx tsc --noEmit`
- `git diff --check`

UI / 表示文言を触った場合のみ、幅別確認結果をこのファイルに残す。

## Completed / Archive Summary

- Thumbnail Editor usecase presets:
  - PR #180: `goods_notice` / `membership_stream` / `asmr_stream` plus EN usage label and initial placement follow-ups.
  - PR #181: IRIAM square roadmap refresh after #180.
  - Previous staged PRs: #178 / #179 and related preset branches are summarized in PR bodies.
- Thumbnail Editor 1:1 IRIAM planning:
  - Current planning doc: `docs/future/THUMBNAIL_EDITOR_IRIAM_SQUARE_MOCK_PLAN.md`
  - Planning PR scope: 5 genre mock direction, layer model, background / title / decoration asset production plan, title image font / license boundary.
  - Mock branch scope: 5 direction mock images under `docs/mockups/thumbnail-editor-iriam-square-mocks/`.
  - Standee layout mock scope: 5 bust-up placeholder layouts under `docs/mockups/thumbnail-editor-iriam-square-standee-layouts/`.
- Portal / public prelaunch:
  - Portal settings visibility polish, Thumbnail Editor inline text edit, and EN support are completed or tracked by their PR bodies.
- EN support:
  - PR #154 - #171 で EN support preview から main 向け final integration check まで完了。
  - main merge: 2026-05-20, merge commit `270b81f`.
  - completed details are kept in PR bodies and archive docs, not repeated here.
- 2026-04 の履歴: `docs/archive/TASK_HISTORY_2026-04.md`
- 2026-05 の履歴: `docs/archive/TASK_HISTORY_2026-05.md`
- Schedule Calendar future tasks: `docs/future/SCHEDULE_CALENDAR_FUTURE_TASKS.md`
- Portal settings future direction: `docs/future/PORTAL_SETTINGS_FUTURE.md`
- Thumbnail Editor next PR scope: `docs/future/THUMBNAIL_EDITOR_NEXT_PR_SCOPE.md`
- Thumbnail Editor usecase preset candidates: `docs/future/THUMBNAIL_EDITOR_USECASE_PRESET_CANDIDATES.md`
- Thumbnail Editor font candidates: `docs/future/THUMBNAIL_EDITOR_FONT_CANDIDATES.md`
- Thumbnail Editor IRIAM square mock plan: `docs/future/THUMBNAIL_EDITOR_IRIAM_SQUARE_MOCK_PLAN.md`
