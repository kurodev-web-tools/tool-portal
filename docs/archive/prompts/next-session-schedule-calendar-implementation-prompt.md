D:\V_streamer_tools で実装を開始してください。
このセッションは `Schedule Calendar` 実装専用です。

最初に以下を確認してください。
- `task.md`
- `docs/PLAN.md`
- `docs/design.md`
- `docs/design-schedule-calendar.md`
- `docs/PORTAL_INFORMATION_ARCHITECTURE.md`
- `docs/mockups/schedule-calendar-week-final.png`
- `docs/mockups/schedule-calendar-month-day-board.png`
- 必要に応じて `docs/mockups/home-suite-final.png`
- 必要に応じて `docs/mockups/tools-index-final.png`

仕様の正本は md 側です。
画像は見た目と情報密度の基準として扱ってください。

前提:
- 既存のポータルと共通UIはすでに実装済み
- 今回はその上に `/tools/schedule-calendar` を本体画面として実装する
- 技術スタックは `Next.js + React + TypeScript + Tailwind CSS`
- 初回MVPは認証なし
- データ保存は `localStorage`
- 外部API連携はまだ入れない

今回の目的:
- Phase 2 として `Schedule Calendar` を使える状態まで実装する
- まずは `週表示` を基準に完成度を上げる
- `月 / 週 / 日` の表示切替も同じUI言語で整える
- 右サイドパネルで `予定管理` と `投稿補助` を切り替えられるようにする

今回このセッションで実装してほしい範囲:
- `/tools/schedule-calendar` の本体レイアウト実装
  - 左: カレンダー領域
  - 右: 固定幅サイドパネル
- カレンダーツールバー
  - 期間表示
  - 前後移動
  - `月 / 週 / 日` 切替
- 週表示カレンダー
  - 予定ブロック表示
  - 選択日 / 選択予定の反映
- 月表示と日表示
  - 週表示より簡易でもよいが、切替として成立させる
- 右サイドパネル
  - `予定管理` タブ
  - `投稿補助` タブ
- `予定管理` タブでの基本操作
  - 予定一覧
  - 新規追加
  - 編集
  - 削除
- データモデルの `localStorage` 保存と復元
- 投稿補助タブの初回MVP
  - テンプレ選択またはテンプレベース文面生成
  - 投稿文プレビュー
  - コピー
  - `X` 投稿画面への遷移

今回このセッションでやらないこと:
- ログイン
- サーバー保存
- 複数端末同期
- Google Calendar連携
- SNS API直接投稿
- AI生成機能

実装上の注意:
- 既存の共通レイアウト、テーマ、サイドバーを壊さない
- 見た目は `実務カレンダー寄り` を優先し、演出は控えめにする
- 予定ブロックは色を使ってよいが、主張しすぎない
- 右パネルのフォームは別画面遷移なしで完結させる
- まずは `週表示` の使い勝手を優先し、月表示と日表示はそれに従属させる

進め方:
- 最初に現状の `/tools/schedule-calendar` 実装を確認
- 使える共通コンポーネントは流用
- 必要なデータ構造と状態管理を整理
- まず週表示中心で組み、その後月/日と右パネルを詰める
- 最後に変更内容、確認結果、残課題を簡潔に報告
- 必要なら `task.md` を Phase 2 向けに更新
