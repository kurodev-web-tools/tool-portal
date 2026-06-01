# Viewer Engagement Prompt Board Mock

Mock-only / docs-only comparison material. No route, component, storage, auth, billing, live chat connection, comment API, moderation automation, posting API, OAuth, or existing tool behavior is implemented here.

## Images

- `desktop.png` - PC viewport mock.
- `tablet-landscape.png` - landscape tablet viewport mock.
- `mobile.png` - smartphone viewport mock.

## Direction Memo

- 想定ユーザー: 配信中に話題、質問、返し、poll idea を手元に置いておきたい VTuber / 配信者。
- 主要 workflow: 配信 topic に合わせて prompt を並べ、segment / tone / safety note で整理し、次に読む prompt を copy / cue する。
- 強み: live API なしでも使える手元の進行補助で、Comment Translator とは別の「配信中の運用」領域を比較できる。
- 実装リスク: live chat 読み取り、viewer profile、AI 生成、moderation automation を入れると privacy / API / quota の設計が必要になる。
- 既存ツールとの接続点: Kuro Live Comment Translator planning、Stream Run-of-Show Planner 候補、Schedule Calendar の配信 topic。

## Notes

- 画像内の UI copy は方向性確認用の仮置きで、正式仕様ではない。
- 初回候補にする場合は manual prompt board に閉じ、live chat / AI generation は later spike に分ける。
