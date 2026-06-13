# Stream Announcement Post Maker Mock

Mock-only / docs-only comparison material. No route, component, storage, auth, billing, posting API, or existing tool behavior is implemented here.

## Images

- `desktop.png` - PC viewport mock.
- `tablet-landscape.png` - landscape tablet viewport mock.
- `mobile.png` - smartphone viewport mock.

## Direction Memo

- 想定ユーザー: 配信告知文と告知画像を毎回作る VTuber / 配信者。
- 主要 workflow: 配信タイトル、日時、サムネイル、告知文、タグを入力し、X / community / generic SNS 向けの文面と画像を書き出す。
- 強み: 既存の Thumbnail Editor、Schedule Calendar、SNS Split Image Maker と接続しやすく、初回 MVP を「投稿 API なしの copy / export」に閉じやすい。
- 実装リスク: 自動投稿や予約投稿まで広げると OAuth、外部 API、rate limit、platform policy の設計が必要になる。
- 既存ツールとの接続点: Thumbnail Editor の画像 export、Schedule Calendar の予定情報、SNS Split Image Maker の投稿用 asset 分割。

## Notes

- 画像内の UI copy は方向性確認用の仮置きで、正式仕様ではない。
- 初回候補にする場合も、posting API / OAuth は別設計に分ける。
