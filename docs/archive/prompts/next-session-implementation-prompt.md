# Next Session Implementation Prompt

以下を次の実装セッション開始時にそのまま渡す。

```text
D:\V_streamer_tools で実装を開始してください。
このセッションは実装専用です。

最初に以下を確認してください。
- task.md
- docs/PLAN.md
- docs/design.md
- docs/design-portal.md
- docs/design-tools-index.md
- docs/PORTAL_INFORMATION_ARCHITECTURE.md
- docs/mockups/home-suite-final.png
- docs/mockups/tools-index-final.png
- docs/mockups/portal-final.png
- 必要に応じて docs/mockups/design-board-light.png
- 必要に応じて docs/mockups/design-board-dark.png

仕様の正本は md 側です。
画像は見た目の基準として扱ってください。
優先順位は `home-suite-final.png` と `tools-index-final.png` を最優先、`portal-final.png` は旧ポータル案の参考として扱ってください。

今回の目的は Phase 1 として、HOME と /tools を責務分離したポータル基盤と共通UIを実装することです。
スケジュールカレンダー本体の実装にはまだ入らず、ポータルと共通部分の確定を優先してください。

前提:
- 技術スタックは Next.js + React + TypeScript + Tailwind CSS
- 初回MVPは認証なし
- デプロイ前提は Cloudflare Pages
- 左サイドバーあり前提
- 左サイドバーは初期段階では「固定項目 + 実装済みツール」
- 実装済みツールとして見せるのは現時点では Schedule Calendar のみ
- 他ツールは準備中表示でよい
- HOME はスイート一覧ページ
- /tools は個別ツール一覧ページ
- HOME のスイートカードから /tools に入る際は、対応 suite が初期選択された状態で表示する

今回このセッションで実装してほしい範囲:
- Next.js ベースの土台作成
- 共通テーマ整備
  - ライト / ダーク切替
  - 深めティール中心
  - フラット + 薄い境界線
  - 8px角丸
- 共通レイアウト実装
  - Header
  - Left Sidebar
  - Main Content
- HOME 実装
  - 導入文
  - 軽いサマリー
  - 4つのスイートカード
- /tools 実装
  - コンパクトなページタイトル
  - スイート / カテゴリ / 実装状態フィルタ
  - 3列基準のツールカード一覧
- 状態表現
  - 利用可能
  - 準備中
- Schedule Calendar への導線配置
- HOME のスイートカードから /tools?suite=<key> に遷移できるようにする

見た目の基準:
- HOME は `docs/mockups/home-suite-final.png` に寄せる
- /tools は `docs/mockups/tools-index-final.png` に寄せる
- 共通トーンや配色は `design-board-light.png` と `design-board-dark.png` を補助参照に使う

初期スイート定義:
- 配信ワークフロー
  - key: stream-workflow
- ファン＆ブランド
  - key: fan-brand
- ビジネス＆コラボ
  - key: business-collab
- 成長＆セルフケア
  - key: growth-selfcare

このセッションでやらないこと:
- ログイン実装
- 課金実装
- 個人設定
- Favorites / Recent / Pinned
- Google Calendar連携
- スケジュールカレンダー本体実装
- 外部API連携

進め方:
- まず現状構成を確認
- 必要なファイル構成を整える
- HOME と /tools を動く状態まで持っていく
- 最後に変更内容、確認結果、次にやるべきことを簡潔に報告
- 必要なら task.md も更新
```
