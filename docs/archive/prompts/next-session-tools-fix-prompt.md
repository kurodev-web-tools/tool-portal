# Next Session /tools Fix Prompt

以下を `/tools` 修正セッション開始時にそのまま渡す。

```text
D:\V_streamer_tools で実装を開始してください。
このセッションは /tools ページの改善専用です。

最初に以下を確認してください。
- task.md
- docs/PLAN.md
- docs/design.md
- docs/design-tools-index.md
- docs/PORTAL_INFORMATION_ARCHITECTURE.md
- docs/TOOLS_PAGE_REVIEW_2026-04-26.md
- docs/mockups/tools-index-final.png

仕様の正本は md 側です。
画像は見た目の基準として扱ってください。

今回は新規で1から作るのではなく、現在の /tools 実装を改善してください。
ベース実装はできているので、責務分離設計に合わせて不足分を埋めるのが目的です。

このセッションの最優先:
1. `suite` クエリの初期適用
2. 現在のスイート文脈の画面表示
3. `/tools` ページタイトルと短説明の追加
4. 必要ならスイートフィルタUIの追加

前提:
- 技術スタックは Next.js + React + TypeScript + Tailwind CSS
- /tools は個別ツール一覧ページ
- HOME から /tools?suite=<key> で遷移してくる
- 現時点で実装済みツールは Schedule Calendar のみ
- 他ツールは準備中表示

今回このセッションでやってほしいこと:
- 現在の /tools 実装を確認する
- 既存の共通レイアウトやテーマ切替は流用できる限り流用する
- URL の `suite` クエリを読んで初期フィルタを適用する
- 対応するスイートで最初から一覧が絞られるようにする
- 現在の suite 状態を見出し付近に表示する
  - 例: `配信ワークフローを表示中`
- `/tools` のページタイトルと短説明を追加する
- 必要なら `スイート / カテゴリ / 実装状態` の3系統フィルタに整理する
- `docs/mockups/tools-index-final.png` に寄せて見た目を整える

初期 suite キー:
- stream-workflow
- fan-brand
- business-collab
- growth-selfcare

最低限必要な挙動:
- /tools 単体で開いたら全ツール表示
- /tools?suite=stream-workflow で開いたら該当スイートで初期絞り込み
- Schedule Calendar だけ `開く`
- 他は準備中表示

今回このセッションでやらないこと:
- HOME 側の大幅改修
- スケジュールカレンダー本体実装
- ログイン実装
- 課金実装
- 個人設定
- 外部API連携

進め方:
- まず現状 /tools を確認
- 既存構造をできるだけ流用して改善
- 修正後に /tools と /tools?suite=stream-workflow を確認
- 最後に変更内容、確認結果、残課題を簡潔に報告
- 必要なら task.md も更新
```
