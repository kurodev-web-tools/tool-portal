# Clip / Shorts Title Card Maker Mock

Mock-only / docs-only comparison material. No route, component, CSS, video processing, storage, auth, billing, upload API, or existing tool behavior is implemented here.

## Images

- `desktop.png` - PC viewport mock.
- `tablet-landscape.png` - landscape tablet viewport mock.
- `mobile.png` - smartphone viewport mock.

## Direction Memo

- 想定ユーザー: 配信切り抜きや短尺動画の表紙 / title card を短時間で作りたい creator。
- 主要 workflow: 9:16 preview に title、timestamp、subtitle、template、safe area を設定し、shorts / vertical clip 用の title card を書き出す。
- 強み: 既存 Thumbnail Editor の preset / font / asset 方針を再利用しやすく、縦型 creator workflow に広げられる。
- 実装リスク: 動画 frame import、crop、batch export、platform ratio 対応まで含めると Thumbnail Editor の text / image layer schema follow-up と衝突しやすい。
- 既存ツールとの接続点: Thumbnail Editor の 9:16 / crop / preset typography backlog、material library、font catalog。

## Notes

- 画像内の UI copy は方向性確認用の仮置きで、正式仕様ではない。
- 初回候補にする場合は still image title card のみを扱い、video processing は out of scope にする。
