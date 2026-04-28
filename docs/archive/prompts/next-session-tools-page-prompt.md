# Next Session Tools Page Prompt

以下を `/tools` 実装セッション開始時にそのまま渡す。

```text
D:\V_streamer_tools で実装を開始してください。
このセッションは /tools ページ実装・改善専用です。

最初に以下を確認してください。
- task.md
- docs/PLAN.md
- docs/design.md
- docs/design-tools-index.md
- docs/PORTAL_INFORMATION_ARCHITECTURE.md
- docs/mockups/tools-index-final.png
- 必要に応じて docs/mockups/design-board-light.png
- 必要に応じて docs/mockups/design-board-dark.png

仕様の正本は md 側です。
画像は見た目の基準として扱ってください。

今回は新規で1から作るのではなく、既存の /tools 実装または未完成状態を前提に、一覧探索ページとして成立させてください。
目的は /tools を「全ツール一覧ページ」にし、HOME から渡される suite フィルタを初期状態として受け取れるようにすることです。

前提:
- 技術スタックは Next.js + React + TypeScript + Tailwind CSS
- 初回MVPは認証なし
- 左サイドバーあり前提
- 左サイドバーは「固定項目 + 実装済みツール」
- /tools は個別ツール一覧ページ
- HOME から /tools?suite=<key> で遷移してくる

今回このセッションでやってほしいこと:
- 既存 /tools 実装の有無と状態を確認する
- 既存の共通レイアウトやテーマ切替は流用できる限り流用する
- /tools を一覧探索ページとして成立させる
- コンパクトなページタイトルと説明文を置く
- スイート / カテゴリ / 実装状態のフィルタUIを整える
- 3列基準のツールカード一覧を整える
- URL の suite クエリを読んで、対応するスイートフィルタを初期選択状態にする
- その後はユーザーが自由に絞り込みを変更できるようにする
- `docs/mockups/tools-index-final.png` に寄せて見た目を整える

初期 suite キー:
- stream-workflow
- fan-brand
- business-collab
- growth-selfcare

最低限必要な挙動:
- /tools 単体で開いたら全ツール表示
- /tools?suite=stream-workflow で開いたら該当スイートで初期絞り込み
- 実装済みの Schedule Calendar だけ `開く` 導線
- 他は準備中表示

今回このセッションでやらないこと:
- HOME 側の大幅改修
- スケジュールカレンダー本体実装
- ログイン実装
- 課金実装
- 個人設定
- 外部API連携

進め方:
- まず現状 /tools の状態を確認
- 既存構造をできるだけ流用して調整
- 一覧探索ページとして完成させる
- 最後に変更内容、確認結果、残課題を簡潔に報告
- 必要なら task.md も更新
```
