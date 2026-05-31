# OBS Scene Checklist Mock

Mock-only / docs-only comparison material. No route, component, storage, auth, billing, OBS integration, WebSocket integration, or existing tool behavior is implemented here.

## Images

- `desktop.png` - PC viewport mock.
- `tablet-landscape.png` - landscape tablet viewport mock.
- `mobile.png` - smartphone viewport mock.

## Direction Memo

- 想定ユーザー: 配信開始前に scene / audio / capture / network / moderation を手動確認したい配信者。
- 主要 workflow: テンプレートを選び、配信前チェックを順番に確認し、warn / pass を記録して開始前の抜け漏れを減らす。
- 強み: 実装を manual checklist に閉じれば低リスクで、auth / storage / external API なしでも価値が出る。
- 実装リスク: OBS の自動検査、WebSocket、ローカルアプリ連携を入れると browser-only tool の境界を越える。
- 既存ツールとの接続点: Schedule Calendar の配信予定、将来の account preferences、portal tools の軽量 utility 枠。

## Notes

- 画像内の UI copy は方向性確認用の仮置きで、正式仕様ではない。
- 初回候補にする場合は manual checklist only を推奨し、OBS 連携は later spike に分ける。
