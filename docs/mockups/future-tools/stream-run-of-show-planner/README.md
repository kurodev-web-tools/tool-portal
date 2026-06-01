# Stream Run-of-Show Planner Mock

Mock-only / docs-only comparison material. No route, component, storage, auth, billing, calendar API, OBS integration, posting API, or existing tool behavior is implemented here.

## Images

- `desktop.png` - PC viewport mock.
- `tablet-landscape.png` - landscape tablet viewport mock.
- `mobile.png` - smartphone viewport mock.

## Direction Memo

- 想定ユーザー: 配信の流れ、尺、告知枠、休憩、締めを事前に整理したい VTuber / 配信者。
- 主要 workflow: 配信タイトルと目的を入れ、segment、所要時間、話す順番、準備 checklist を並べ、進行表として copy / export する。
- 強み: Schedule Calendar と相性がよく、初回は manual planner + copy/export に閉じれば外部連携なしで価値が出る。
- 実装リスク: calendar sync、OBS cue、チーム共有、履歴保存まで広げると auth / storage / external API の設計が必要になる。
- 既存ツールとの接続点: Schedule Calendar の予定情報、配信告知ポストメーカー候補、Stream Recap / Show Notes Generator 候補。

## Notes

- 画像内の UI copy は方向性確認用の仮置きで、正式仕様ではない。
- 初回候補にする場合も、外部 calendar / OBS / posting API は別設計に分ける。
