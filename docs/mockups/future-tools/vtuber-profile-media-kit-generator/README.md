# Vtuber Profile / Media Kit Generator Mock

Mock-only / docs-only comparison material. No route, component, public profile page, storage, auth, billing, contact workflow, or existing tool behavior is implemented here.

## Images

- `desktop.png` - PC viewport mock.
- `tablet-landscape.png` - landscape tablet viewport mock.
- `mobile.png` - smartphone viewport mock.

## Direction Memo

- 想定ユーザー: 企業案件、コラボ、イベント参加に向けてプロフィールと素材を整理したい VTuber / creator。
- 主要 workflow: profile、brand colors、活動タグ、asset list、contact note を入力し、PDF / social card / share draft として書き出す。
- 強み: 実装後は商用導線や creator credibility に効き、既存 legal / account foundation と相性が良い。
- 実装リスク: 公開ページ、非公開情報、contact、asset hosting、auth / storage / privacy boundary が絡みやすい。
- 既存ツールとの接続点: Thumbnail Editor の画像 asset、account preferences、legal foundation、将来の billing / plan boundary。

## Notes

- 画像内の UI copy は方向性確認用の仮置きで、正式仕様ではない。
- 初回候補にする場合は local draft / export only に閉じ、public hosting と contact workflow は別設計に分ける。
