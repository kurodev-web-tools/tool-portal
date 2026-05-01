# Schedule Calendar Future Tasks

## Purpose

この文書は、Schedule Calendar の公開v0完了後に扱う将来タスクをまとめる。
`task.md` は直近の公開準備と運用確認に集中させ、materialsとの差分や将来拡張はこの文書で管理する。

## Current Baseline

- 公開v0の対象は `Portal + Tools Index + Schedule Calendar`
- Schedule Calendar v0 は、認証やサーバー保存を使わず `localStorage` で完結する
- 現行MVPはカレンダー管理、予定一覧、投稿補助、設定、バックアップを提供する
- `materials/ideas/01_配信・動画制作/スケジュールカレンダー_*` はフル構想を含むため、公開v0との差分は将来タスクとして扱う

## Materials Diff Tasks

`materials/ideas/01_配信・動画制作/スケジュールカレンダー_*` と現行MVPを照合した結果、公開v0のブロッカーではないが、フル仕様との差分として以下を将来タスクにする。

- [ ] スケジュール画像生成 / 共有機能の扱いを決める
  - 仕様書の概要では「週間スケジュール画像を生成・共有」となっているが、現行MVPはカレンダー管理と投稿補助まで
  - Schedule Calendar内に追加するか、サムネイル / スケジュール画像系ツールへ分離するかを決める
- [ ] カテゴリ / プラットフォームのユーザー編集可否を決める
  - materialsでは追加・編集・削除可能だが、現行MVPは固定プリセット + `Other`
  - サーバー保存導入前にlocalStorage設定として持つか、固定運用のままにするかを決める
- [ ] 投稿補助のテンプレート編集UIを拡張する
  - materialsでは変数挿入ボタンとハッシュタグ管理がある
  - 現行MVPはテンプレートCRUD、プレビュー、コピー、X投稿画面への遷移まで
- [ ] 削除確認ダイアログ仕様を現行UXに合わせて整理する
  - materialsでは削除前confirm、現行MVPは削除後undo toast
  - 現行UXを採用する場合はmaterials側またはREADME側に「v0ではundo方式」と明記する
- [ ] デフォルト表示モードの仕様を統一する
  - materials仕様書は月表示デフォルト、現行design / 実装は週表示デフォルト
  - 配信予定管理では週表示を優先する方針なら、materials側の記述を更新する
- [ ] 日時入力仕様を整理する
  - materialsでは時間は任意・30分刻み、現行MVPは開始 / 終了時刻を持ち、5分刻みロール型UI
  - 公開後の実運用に合わせて必須 / 任意、刻み幅、終了時刻の扱いを仕様化する
- [ ] 入力上限とバリデーションをUI側にも反映する
  - materialsではタイトル最大50文字、備考最大200文字
  - 現行MVPはimport時の保護上限が中心で、フォーム上の文字数上限表示は未実装
- [ ] materials内の技術スタック記述をv0実装に合わせて整理する
  - 設計書にはPostgreSQL / MongoDB、FastAPI、React Hook Form / Zod、shadcn/uiの記述がある
  - 現行MVPはNext.js App Router + TypeScript + Tailwind + React Hooks + localStorageのフロントエンド完結
- [ ] `isCompleted` など未使用データ項目の採用可否を決める
  - materials設計書のデータモデルには完了フラグがあるが、現行MVPには未採用
  - 分析 / 投稿後処理と連携する段階で必要性を再評価する

## Recommended Roadmap

### Phase A: Post Assist Polish

- [ ] 変数挿入ボタンを追加する
- [ ] よく使うハッシュタグの保存 / 選択を追加する
- [ ] 投稿文テンプレートの既定セットを実運用向けに見直す

### Phase B: Calendar Customization

- [ ] カテゴリの追加 / 編集 / 削除を設計する
- [ ] プラットフォームの追加 / 編集 / 削除を設計する
- [ ] 入力上限、文字数表示、バリデーションメッセージを整理する

### Phase C: Shareable Schedule Output

- [ ] 週間スケジュール画像生成をSchedule Calendar内に入れるか、別ツールへ分離するか決める
- [ ] 画像出力に必要な表示項目、比率、テーマ、スマホ共有導線を設計する
- [ ] サムネイル自動生成ツールとの連携可否を検討する

### Phase D: Storage And Sync

- [ ] 保存データの分類と保持ポリシーを確定する
- [ ] 認証後URLとアクセス制御を設計する
- [ ] サーバー保存、複数端末同期、削除 / エクスポート仕様を設計する

### Phase E: Workflow Chain

- [ ] Content Planner など2本目MVPツールとの共通データモデルを決める
- [ ] カレンダー予定から企画メモ作成へ渡す最小導線を設計する
- [ ] 将来的な分析、サムネイル、投稿後処理への連携項目を整理する
