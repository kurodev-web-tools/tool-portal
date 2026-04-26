# Next Session HOME Improvement Prompt

以下を HOME 改修セッション開始時にそのまま渡す。

```text
D:\V_streamer_tools で実装を開始してください。
このセッションは HOME 改修専用です。

最初に以下を確認してください。
- task.md
- docs/PLAN.md
- docs/design.md
- docs/design-portal.md
- docs/PORTAL_INFORMATION_ARCHITECTURE.md
- docs/mockups/home-suite-final.png
- 必要に応じて docs/mockups/design-board-light.png
- 必要に応じて docs/mockups/design-board-dark.png

仕様の正本は md 側です。
画像は見た目の基準として扱ってください。

今回は新規で1から作るのではなく、既存の HOME 実装を改善してください。
目的は、現在の HOME を「ツール一覧ページ」から「スイート一覧の入口ページ」へ改修することです。

前提:
- 技術スタックは Next.js + React + TypeScript + Tailwind CSS
- 初回MVPは認証なし
- デプロイ前提は Cloudflare Pages
- 左サイドバーあり前提
- 左サイドバーは初期段階では「固定項目 + 実装済みツール」
- 実装済みツールとして見せるのは現時点では Schedule Calendar のみ
- HOME はスイート一覧ページ
- /tools は個別ツール一覧ページ

今回このセッションでやってほしいこと:
- 既存 HOME 実装を確認する
- 既存の共通レイアウトやテーマ切替は流用できる限り流用する
- HOME から個別ツール一覧的な役割を外す
- HOME 上のツールフィルタUIを削除または撤去する
- HOME 上のツールカード一覧を削除し、4つのスイートカードへ置き換える
- ヒーローやサマリーを `docs/mockups/home-suite-final.png` に寄せて調整する
- 左サイドバーは既存構造を活かしつつ、HOME がアクティブになるよう整える
- スイートカードから /tools?suite=<key> に遷移できるようにする

初期スイート定義:
- 配信ワークフロー
  - key: stream-workflow
  - 説明: 企画から配信後の振り返りまで、日々の配信活動を支えるツール群
- ファン＆ブランド
  - key: fan-brand
  - 説明: ファンとの交流や世界観づくりを支え、活動の魅力を育てるツール群
- ビジネス＆コラボ
  - key: business-collab
  - 説明: 収益化やバックオフィス、コラボ進行を整理するためのツール群
- 成長＆セルフケア
  - key: growth-selfcare
  - 説明: 学習、活動継続、セルフマネジメントを支えるツール群

今回このセッションでやらないこと:
- /tools の詳細改善
- スケジュールカレンダー本体実装
- ログイン実装
- 課金実装
- 個人設定
- 外部API連携

進め方:
- まず現状 HOME 実装を確認
- 既存構造をなるべく流用して改修
- HOME をスイート入口ページとして成立させる
- 最後に変更内容、確認結果、残課題を簡潔に報告
- 必要なら task.md も更新
```
