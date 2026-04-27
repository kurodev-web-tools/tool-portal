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
- [x] HOME をスイート一覧の入口ページへ改修する
- [x] HOME から個別ツールフィルタとツールカード一覧を撤去する
- [x] `/tools` を個別ツール一覧ページとして分離する
- [x] スイートカードから `/tools?suite=<key>` に遷移できるようにする
- [x] `/tools` で `suite` クエリの初期絞り込みを適用する
- [x] `/tools` にページタイトル、短説明、現在のスイート文脈を表示する
- [x] `/tools` のフィルタをスイート / カテゴリ / 実装状態の3系統に整理する

## ポータルで固めた共通部分

- 配色トークン
- タイポグラフィ
- 余白ルール
- 8px基準の角丸
- フラット + 薄い境界線の面設計
- Header
- Left Sidebar
- Suite Card
- Filter Chips
- Status Badge
- Tool Card

## 次にやること

- `/tools` 側で検索、並び替え、スイートフィルタ解除時のURL同期を検討する
- Phase 2 としてスケジュールカレンダーの初回MVPを実装する
  - [x] 週表示の情報量
  - [x] 右サイドパネルのタブ構成
  - [x] `localStorage` データモデル
  - [x] 投稿補助UI
- [x] `/tools/schedule-calendar` を作業画面として実装する
- Phase 2 実装後の確認と改善候補を整理する
  - 月表示 / 日表示の情報密度調整
  - モバイル時の右パネル配置の追加調整
  - 将来の外部カレンダー連携に向けたデータ移行方針
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

## Phase 2 実装状況

- [x] `/tools/schedule-calendar` の本体レイアウトを実装する
- [x] カレンダーツールバーを実装する
  - 期間表示
  - 前後移動
  - 月 / 週 / 日 切替
- [x] 週表示カレンダーを実装する
  - 時間軸
  - 日付列
  - 予定ブロック
  - 選択日 / 選択予定の反映
- [x] 月表示と日表示を初回MVPとして実装する
- [x] 右サイドパネルを実装する
  - 予定管理
  - 投稿補助
- [x] 予定管理の基本操作を実装する
  - 予定一覧
  - 新規追加
  - 編集
  - 削除
- [x] `localStorage` 保存と復元を実装する
- [x] 投稿補助タブの初回MVPを実装する
  - テンプレ選択
  - 投稿文プレビュー
  - コピー
  - X 投稿画面への遷移

## Phase 2 品質向上状況

- [x] 初期表示 / リロード時の選択日を今日に統一する
- [x] 週 / 日表示の24時間・30分グリッドを調整する
- [x] 月表示の過密セルをタイトル優先 + 残件数表示に整理する
- [x] 日表示の空状態と件数表示を週表示のトーンに寄せる
- [x] モバイル時に右パネルを下段化し、保存 / 削除 / コピー / Xで開くを到達しやすくする
- [x] 投稿文コピー失敗時の手動コピー用フォールバックを追加する

## Phase 2 ではまだやらないこと

- ログイン
- サーバー保存
- 複数端末同期
- Google Calendar連携
- SNS API直接投稿
- AI生成機能
