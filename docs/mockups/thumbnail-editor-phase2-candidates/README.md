# Thumbnail Editor Phase 2 Background Candidates

## Purpose

Thumbnail Editor の次フェーズで完成プリセット化する候補を選び、実装前に背景画像の方向性を確認するための候補置き場。
背景候補と完成モックをここに残し、実装用背景は `public/assets/images/thumbnail-editor/phase2/` へコピーしてプリセットから参照する。

## Selected Preset Candidates

- `ゲーム実況`: 高頻度の配信ジャンルで、Phase 1 の `配信告知` / `歌枠` と用途が重なりにくい。
- `コラボ`: 2人以上の立ち絵配置を検討でき、通常の単独配信プリセットとは別のレイアウト課題を持つ。
- `お知らせ`: 配信外の案内や重要告知に使え、背景と編集可能な本文パネル / バッジの分離方針を確認しやすい。

`雑談` は `配信告知` と空気感が近く、背景だけで差を出しすぎると汎用性が落ちやすいため今回は後回し。
`X告知画像` は横長 / 縦長 / SNS Split Image Maker 連携の variant 設計と合わせて扱う方がよい。
`切り抜き` は実際の動画フレームやスクリーンショットを主素材にする可能性が高く、汎用背景の優先度を下げる。

## Files

| Preset | Candidate | Finished Mock | Public Asset | Status | Notes |
| --- | --- | --- | --- |
| ゲーム実況 | `game-live-background-candidate.png` | `game-live-mock.png` | `public/assets/images/thumbnail-editor/phase2/game-live-background.png` | プリセット反映済み | 左側に大見出し、右側に立ち絵を置きやすい。ゲーム固有の権利物は含めない。 |
| コラボ | `collaboration-background-candidate.png` | `collaboration-mock.png` | `public/assets/images/thumbnail-editor/phase2/collaboration-background.png` | プリセット反映済み | 右側の2スポットライトを2人立ち絵ガイドの基準にできる。参加者名や企画名は編集可能テキストで載せる。 |
| お知らせ | `announcement-background-candidate.png` | `announcement-mock.png` | `public/assets/images/thumbnail-editor/phase2/announcement-background.png` | プリセット反映済み | 枠や本文パネルを焼き込まない再生成版。編集可能な見出し、日付、本文パネルを重ねる。 |

## Generation Policy

- 背景は 16:9 / 1280x720 前提。
- 背景画像には文字、ロゴ、人物、キャラクター、読めるUIを入れない。
- `見出し`、`時刻`、`サブ`、`ラベル` は既存 handoff 対象として、Thumbnail Editor の編集可能テキストレイヤーで持つ。
- 立ち絵挿入ガイド、本文パネル、時刻バッジ、参加者名バッジ、発光帯は、将来的に shape / image layer へ分離できる前提で考える。
- 背景側に残すのは、空気感、光、奥行き、粒子、抽象装飾までに留める。

## Implementation Split

1. 実画面で3プリセットの表示バランスを確認する。
2. 必要なら `ゲーム実況` の右側立ち絵ガイド、`コラボ` の2人ガイド、`お知らせ` の本文パネル余白を微調整する。
3. Schedule Calendar handoff 後も `見出し` / `時刻` / `サブ` / `ラベル` に予定テキストが流れることを実画面で確認する。
4. 背景画像の圧縮方式、ライセンスメモ、素材パック化する場合の命名規則を整理する。
