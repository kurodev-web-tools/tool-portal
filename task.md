# task.md

## 現在の前提

- このセッションは `計画・設計整理専用` とする
- 実装は別セッションで行う
- 初回MVPは `認証なしポータル + スケジュールカレンダー1本`
- 公開前提は `Cloudflare Pages`
- 初回のデータ保存は `localStorage`

## 今回の意思決定

- 先にポータルを作って共通部分を固める
- その後にスケジュールカレンダーの実装計画を詳細化する
- 左サイドバーは初期段階では `固定項目 + 実装済みツール`
- 将来的に左サイドバーは `個人用ランチャー` に拡張する

## 直近タスク

- [x] 初期MVP方針を文書化する
- [x] 共通 `design.md` を作成する
- [x] `design-portal.md` を作成する
- [x] `design-schedule-calendar.md` を作成する
- [x] ポータルの画像生成用プロンプトを作成する
- [x] スケジュールカレンダーの画像生成用プロンプトを作成する
- [x] ポータル正式版モックの方向性を確定する
- [x] 左サイドバーの情報設計を整理する
- [ ] ポータル実装セッション用の実装タスクに分解する
- [ ] ポータル実装後を前提に、スケジュールカレンダーの詳細実装計画を詰める

## ポータル実装セッションで最初にやること

- Next.js ベースのプロジェクト土台を作る
- ライト / ダーク切替を含む共通テーマを作る
- ポータル共通レイアウトを作る
  - Header
  - Left Sidebar
  - Main Content
- ツールカードと状態表示を実装する
- ポータルTOPを正式モックに寄せて組む

## ポータルで先に固める共通部分

- 配色トークン
- タイポグラフィ
- 余白ルール
- 8px基準の角丸
- フラット + 薄い境界線の面設計
- Header
- Left Sidebar
- Filter Chips
- Status Badge
- Tool Card

## 後続タスク

- スケジュールカレンダーの実装責務を分解する
  - 週表示の情報量
  - 右サイドパネルのタブ構成
  - `localStorage` データモデル
  - 投稿補助UI
- 将来のログイン導入後のURL構成を整理する
  - `/`
  - `/tools/...`
  - `/app/...`

## 参照ドキュメント

- `docs/design.md`
- `docs/design-portal.md`
- `docs/design-schedule-calendar.md`
- `docs/INITIAL_MVP_PLAN.md`
- `docs/INITIAL_MVP_DESIGN_AND_IMPLEMENTATION_PLAN.md`
- `docs/PORTAL_INFORMATION_ARCHITECTURE.md`

## このセッションではやらないこと

- 実装着手
- 依存導入
- コード生成
- ルーティング実装
- ログイン実装
- スケジュールカレンダー本体実装
