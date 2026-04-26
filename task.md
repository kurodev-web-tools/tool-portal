# task.md

## 現在の前提

- このリポジトリは `V Streamer Tools` の初回MVPを段階実装する
- 初回MVPは `認証なしポータル + スケジュールカレンダー1本`
- 公開前提は `Cloudflare Pages`
- Phase 1 ではポータル基盤と共通UIを先に確定する
- Phase 2 でスケジュールカレンダー本体を実装する
- 初回のデータ保存は Phase 2 で `localStorage` を使う

## 今回の意思決定

- 先にポータルを作って共通部分を固める
- その後にスケジュールカレンダーの実装計画を詳細化する
- 左サイドバーは初期段階では `固定項目 + 実装済みツール`
- 実装済みツールとして表示するのは `Schedule Calendar` のみ
- 他ツールは準備中表示に留める
- 将来的に左サイドバーは `個人用ランチャー` に拡張する

## Phase 1 実装状況

- [x] Next.js + React + TypeScript + Tailwind CSS の土台を作成する
- [x] Cloudflare Pages 向けの静的出力設定を追加する
- [x] ライト / ダーク切替を含む共通テーマを作る
- [x] ポータル共通レイアウトを作る
  - Header
  - Left Sidebar
  - Main Content
- [x] ツールカードと状態表示を実装する
- [x] ポータルTOPを正式モックに寄せて組む
- [x] `/tools` をポータル一覧として用意する
- [x] `/tools/schedule-calendar` に Phase 1 用の入口ページを用意する

## ポータルで固めた共通部分

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

## 次にやること

- Phase 2 としてスケジュールカレンダーの実装責務を分解する
  - 週表示の情報量
  - 右サイドパネルのタブ構成
  - `localStorage` データモデル
  - 投稿補助UI
- `/tools/schedule-calendar` を作業画面として実装する
- 必要に応じて `docs/design-schedule-calendar.md` を実装粒度まで更新する
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

## この Phase 1 ではやらないこと

- ログイン実装
- 課金実装
- 個人設定
- Favorites / Recent / Pinned の保存
- Google Calendar連携
- スケジュールカレンダー本体実装
- 外部API連携
