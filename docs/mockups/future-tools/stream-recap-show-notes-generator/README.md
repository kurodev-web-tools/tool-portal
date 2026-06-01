# Stream Recap / Show Notes Generator Mock

Mock-only / docs-only comparison material. No route, component, storage, auth, billing, video import, transcription, AI API call, posting API, OAuth, or existing tool behavior is implemented here.

## Images

- `desktop.png` - PC viewport mock.
- `tablet-landscape.png` - landscape tablet viewport mock.
- `mobile.png` - smartphone viewport mock.

## Direction Memo

- 想定ユーザー: 配信後にハイライト、概要、リンク、次回 follow-up を短時間でまとめたい VTuber / 配信者。
- 主要 workflow: 手入力 note と highlight を並べ、recap draft、show notes、credits、follow-up tasks を確認して copy / export する。
- 強み: 配信前の run-of-show と対になる post-stream workflow で、動画処理なしの manual MVP に閉じやすい。
- 実装リスク: video import、transcription、AI summary、external posting、long-term archive を入れると API / storage / privacy / quota の境界が重くなる。
- 既存ツールとの接続点: Stream Run-of-Show Planner 候補、Clip / Shorts Title Card Maker、Schedule Calendar、Comment Translator の後処理候補。

## Notes

- 画像内の UI copy は方向性確認用の仮置きで、正式仕様ではない。
- 初回候補にする場合は manual notes -> copy/export に閉じ、動画処理や AI API は別設計に分ける。
