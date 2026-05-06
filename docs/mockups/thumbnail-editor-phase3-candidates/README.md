# Thumbnail Editor Phase 3 Background Candidates

## Purpose

PR #28 の Phase 2 背景セットで完了した `ゲーム実況` / `コラボ` / `お知らせ` とは別に、残りプリセットの背景候補を確認するための候補置き場。
背景候補と完成モックを確認し、採用背景は `public/assets/images/thumbnail-editor/phase3/` へコピーしてプリセットから参照する。

## Selected Preset Candidates

- `雑談`: 通常告知より落ち着いたトーク配信用。左側に見出し、右側に立ち絵余白を置ける空気感を優先する。
- `切り抜き`: 動画フレームやスクリーンショットを主役にする前提で、背景側は勢いとハイライト感だけを担う。
- `X告知画像`: X投稿添付向けの短文告知画像。横長16:9を基準にしつつ、将来の縦横 variant でも使いやすい余白を残す。

## Files

| Preset | Candidate | Finished Mock | Public Asset | Status | Judgment | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 雑談 | `chatting-background-candidate.png` | `chatting-mock.png` | `public/assets/images/thumbnail-editor/phase3/chatting-background.png` | プリセット反映済み | 採用 | 左側が暗く、見出しを載せやすい。右側に部屋とカフェ風の光があり、立ち絵余白として使いやすい。読めるコメントやUIは含めない。 |
| 切り抜き | `clip-background-candidate.png` | `clip-mock.png` | `public/assets/images/thumbnail-editor/phase3/clip-background.png` | プリセット反映済み | 採用 | 中央左にフレームを置ける余白があり、右側の光線でハイライト感を出せる。ゲーム画面、著作物、読めるUIは含めない。 |
| X告知画像 | `x-announcement-background-candidate.png` | `x-announcement-mock.png` | `public/assets/images/thumbnail-editor/phase3/x-announcement-background.png` | プリセット反映済み | 採用 | 全体に明るく、短文告知や投稿カード風の editable layer を重ねやすい。SNSロゴや投稿UIは含めない。 |

## Generation Policy

- 背景は 16:9 / 1280x720 前提。
- 背景画像には文字、ロゴ、人物、キャラクター、読めるUI、権利物を入れない。
- 背景側へ焼き込むのは、空気感、光、奥行き、粒子、抽象装飾までに限定する。
- `見出し`、`時刻`、`サブ`、`ラベル` は既存 handoff 対象として、Thumbnail Editor の編集可能テキストレイヤーで持つ。
- 枠線、パネル、発光帯、バッジ、立ち絵ガイド、動画フレームは、将来的に shape / image layer として分離できる前提で考える。

## Final Prompts

### 雑談 Mock

Using the visible chatting background candidate as the base/reference, create a finished 1280x720 VTuber thumbnail mockup for the preset "雑談". Preserve the calm night room/cafe atmosphere and the left-dark/right-warm composition. Add mock editable-layer elements only for visual direction: large Japanese headline text on the left reading 「ゆるっと」 on first line and 「雑談配信」 on second line, a small rounded label reading 「CHATTING / YouTube」 near the upper-left, a time badge reading 「21:00 START」 below the headline, a short subtitle reading 「今日の話題を一緒に整理しよう」. Add a translucent standing-character placeholder guide on the right, but do not add an actual person or character. The mock should look like a completed thumbnail direction, with readable high-contrast text, tasteful outline/shadow, restrained panels, no logos, no copyrighted objects, no readable UI comments except the intentional mock text listed above.

### 切り抜き Mock

Using the visible energetic clip background candidate as the base/reference, create a finished 1280x720 VTuber thumbnail mockup for the preset "切り抜き". Preserve the dynamic purple/orange motion-streak background and central-left negative space. Add mock editable-layer elements: a large tilted rectangular video-frame placeholder in the central-left area with a simple dark abstract fill, no real game screen and no readable UI; a bold Japanese label near upper-left reading 「切り抜き」; a huge headline reading 「神回まとめ」; a smaller time/publication badge reading 「20:00 公開」; a short subtitle reading 「一番盛り上がった瞬間だけ」. Add impact outlines, sticker-like editable shapes, and emphasis marks as mock layers. No people, no characters, no logos, no copyrighted game visuals, no real screenshots. The mock should look like a practical completed clips thumbnail direction, with the big text and frame clearly separated from the background.

### X告知画像 Mock

Using the visible bright X announcement background candidate as the base/reference, create a finished 1280x720 VTuber thumbnail mockup for the preset "X告知画像". Preserve the clean airy white/blue abstract background and large readable negative space. Add mock editable-layer elements only: a refined translucent text panel centered-left, a small label reading 「X POST」, a large Japanese headline reading 「本日のお知らせ」, a supporting line reading 「配信予定と最新情報をまとめました」, a date badge reading 「05.06 WED」, and a minimal right-side standing-character placeholder guide outline with very low opacity. No X logo, no social media logos, no tweet/post UI, no people, no characters, no copyrighted elements. The mock should look like a practical SNS attachment announcement image direction, clean and readable, with all text and panels visually separable as future editable layers.

### 雑談

Create a 1280x720 16:9 background image for a VTuber thumbnail editor preset named "chat / casual talk". Calm late-night talk stream atmosphere: cozy abstract cafe and room ambience, soft bokeh light, gentle depth, subtle comment-like glow blocks only as unreadable abstract shapes, no readable text, no UI, no logos, no people, no characters. Composition: left side has darker clean negative space for editable headline text, right side has open warm rim-lit space for a standing character layer to be added later. Include only atmosphere, light, depth, particles, and abstract decoration. No frames, no badges, no panels burned in. Polished raster background, suitable as a locked bottom image layer, Japanese VTuber streaming thumbnail style, restrained and practical.

### 切り抜き

Create a 1280x720 16:9 background image for a VTuber thumbnail editor preset named "highlight clips". Energetic impact background for editable video frame or screenshot layers: dynamic abstract motion streaks, radial burst, depth, spark particles, angled light trails, high-contrast highlight feeling. No real game screens, no screenshots, no copyright-like imagery, no readable UI, no text, no logos, no people, no characters. Composition: keep a large central-left clean area where an editable video frame layer can be placed later; leave extra top-left space for a short editable label; right side can have energetic light and depth but no baked frames or panels. Include only atmosphere, light, depth, particles, abstract decoration. Polished raster background, practical VTuber clips thumbnail style.

### X告知画像

Create a 1280x720 16:9 background image for a VTuber thumbnail editor preset named "X social post announcement image". Clean readable social-post attachment background for short Japanese announcement text to be added later as editable layers. Modern airy gradient lighting, soft depth, subtle paper-like or glass-like abstract shapes, small particles, calm contrast. No X logo, no social media logos, no readable text, no UI cards, no tweet/post interface, no people, no characters. Composition: keep broad central-left and middle negative space for editable short text panel layers later; edges can have refined light accents; support future portrait/square variants by keeping the main visual balanced and uncrowded. Include only atmosphere, light, depth, particles, and abstract decoration. Polished raster background, practical for SNS announcement thumbnails.

## Implementation Split

実装は次の分割で反映済み。

1. 採用背景を `public/assets/images/thumbnail-editor/phase3/` へコピーし、ファイル名を固定した。
2. `雑談` / `切り抜き` / `X告知画像` の背景レイヤーを public asset 参照に変更し、locked 扱いにした。
3. 背景を焼き込みにせず、テキスト、枠、立ち絵ガイド、動画フレーム、投稿カード風パネルを shape / image / text layer として重ねた。
4. 契約チェック `scripts/thumbnail-phase3-preset-assets-contract.mjs` を追加した。

## Verification

- `node scripts/thumbnail-phase3-preset-assets-contract.mjs` PASS
- `node scripts/thumbnail-phase2-preset-assets-contract.mjs` PASS
- `node scripts/thumbnail-phase1-preset-assets-contract.mjs` PASS
- `node scripts/thumbnail-preset-apply-safety-contract.mjs` PASS
- `node scripts/thumbnail-preset-discovery-contract.mjs` PASS
- `node scripts/thumbnail-layer-management-contract.mjs` PASS
- `node scripts/tool-handoff-contract.mjs` PASS
- `node scripts/sns-split-image-maker-contract.mjs` PASS
- `npm run lint` PASS
- `npx tsc --noEmit` PASS
- `npm run build` PASS
