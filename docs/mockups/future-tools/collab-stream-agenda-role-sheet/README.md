# Collab Stream Agenda / Role Sheet Mock

Mock-only / docs-only comparison material. No route, component, storage, auth, billing, invite flow, calendar API, chat app integration, posting API, or existing tool behavior is implemented here.

## Images

- `desktop.png` - PC viewport mock.
- `tablet-landscape.png` - landscape tablet viewport mock.
- `mobile.png` - smartphone viewport mock.

## Direction Memo

- 想定ユーザー: コラボ配信の進行、担当、注意事項を共同で確認したい VTuber / 配信者。
- 主要 workflow: agenda、参加者 role、話す順番、素材準備、共有 note をまとめ、briefing sheet として copy / export する。
- 強み: 外部招待や同期なしでも、コラボ前の認識合わせに使える低依存の planning tool として説明しやすい。
- 実装リスク: shared editing、invitation、calendar sync、Discord / Google Docs 連携まで広げると auth / permission / API 境界が重くなる。
- 既存ツールとの接続点: Schedule Calendar、Stream Run-of-Show Planner 候補、将来の account preferences。

## Notes

- 画像内の UI copy は方向性確認用の仮置きで、正式仕様ではない。
- 初回候補にする場合は single-user draft / copy export から始め、共同編集は later scope に分ける。
