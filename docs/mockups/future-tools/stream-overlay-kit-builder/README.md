# Stream Overlay Kit Builder Mock

Mock-only / docs-only comparison material. No route, component, CSS, canvas implementation, storage, auth, billing, OBS integration, or existing tool behavior is implemented here.

## Images

- `desktop.png` - PC viewport mock.
- `tablet-landscape.png` - landscape tablet viewport mock.
- `mobile.png` - smartphone viewport mock.

## Direction Memo

- 想定ユーザー: 配信画面用の webcam frame、chat panel、timer、goal bar、lower-third を作りたい配信者。
- 主要 workflow: overlay 部品を選び、16:9 preview に配置し、色 / font / opacity / safe area を調整して PNG / browser source 用 asset として書き出す。
- 強み: Thumbnail Editor の layer / asset / font 方針と親和性が高く、creator tool suite の見た目を強化できる。
- 実装リスク: 透明 PNG、safe area、layer editing、export fidelity、template asset 管理が重く、初回から広げると実装面積が大きい。
- 既存ツールとの接続点: Thumbnail Editor の material / font / export 方向、将来の user preferences、portal tool card。

## Notes

- 画像内の UI copy は方向性確認用の仮置きで、正式仕様ではない。
- 初回候補にする場合は template preview / static export に絞り、browser source / live integration は別タスクに分ける。
