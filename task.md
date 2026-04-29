# task.md

## 現在の前提

- このリポジトリは `V Streamer Tools` のMVPを段階実装する
- 現在のMVP到達点は `Portal + Tools Index + Schedule Calendar`
- 公開前提は `Cloudflare Pages`

## 履歴参照

- 完了済みタスクの履歴は `docs/archive/TASK_HISTORY_2026-04.md` を参照する

## 現在のアクティブタスク

### ポータル最適化の残確認

- [ ] 幅別回帰確認を実施する
  - 対象幅: 390 / 820 / 1024 / 1280 / 1366
  - 対象ページ: `/` / `/tools`
  - 観点: HOME/TOOLS間遷移、Schedule Calendar導線、テーマ切替、フィルタ操作性、カード可読性

### 認証・サーバー保存導入前の設計タスク

- [ ] 保存データの分類と保持ポリシーを決める
  - 予定、メモ、投稿テンプレート、将来の履歴 / お気に入り / 個人設定を、個人情報・機密度・削除要件で分類する
  - サーバー保存時は削除、エクスポート、端末間同期、退会時削除の仕様を先に決める
- [ ] 認証後URLとアクセス制御を設計する
  - 公開ポータル `/` / `/tools/...` と個人領域 `/app/...` を分ける
  - middleware / Pages Functions / Workers を使う場合は、認可チェックをサーバー側で一元化する
- [ ] 外部連携トークンの保管方針を決める
  - Google Calendar、SNS、AI API などを導入する場合、access token / refresh token / API key を localStorage に保存しない
  - Cloudflare 側の Secrets、D1/KV/R2、暗号化、ローテーション、監査ログの責務を決める
- [ ] セキュリティヘッダーとCSPを本番構成に合わせて見直す
  - Cloudflare Web Analytics、Turnstile、外部画像、API endpoint などを追加するたびに CSP を更新する
  - Report-Only 運用や violation report の扱いを検討する

## MVP後の進め方（2026-04-29更新）

### フェーズ1: Schedule Calendar をβ実用レベルまで仕上げる（優先）

- [x] 予定編集体験を完成させる
  - 予定の追加・編集・削除・複製を右パネルの予定管理から実行できるようにした
  - PCの週 / 日表示で予定をドラッグして日時移動、月表示で日付移動できるようにした
  - PCの週 / 日表示ではドラッグ中に `ここに移動 HH:MM - HH:MM` の移動先ガイドを表示するようにした
  - Undo挙動は削除、移動、編集保存後の復元toastに統一し、編集中のリセットは保存前内容の破棄として整理した
  - モバイル/タブレット縦のボトムシートでは予定管理のsticky操作を削除/保存に絞り、複製/リセットはフォーム内の通常操作へ移した
- [x] 繰り返し予定の最小対応を追加する
  - 毎日 / 毎週の繰り返しをMVP範囲で実装した
  - 例外日処理、終了日の詳細指定、シリーズ一括編集は未対応としてUIと `docs/SCHEDULE_CALENDAR_README.md` に明示した
- [x] 検索・フィルタを追加する
  - タイトル検索、カテゴリ、プラットフォーム、期間、並び順の予定一覧フィルタを維持し、モバイルとPCで同じ `eventFilters` state を使う形に整理した
- [x] バックアップ運用を固める
  - JSONエクスポート/インポートを `バックアップ作成` / `バックアップ復元` 表記に変更し、復元失敗時に既存データを保持する説明をUIに追加した
  - 破損データの復旧フローを `docs/SCHEDULE_CALENDAR_README.md` に追記した

#### フェーズ1検証メモ（2026-04-29）

- 実施: `git diff --check`（空白エラーなし。CRLF警告のみ）
- 実施: in-app browser `http://localhost:3001/tools/schedule-calendar/`
  - console error / warn なし
  - 予定追加、毎日繰り返し2件作成、複製、削除toast、`元に戻す` 復元を確認
  - 設定 > データ管理で `バックアップ作成` / `バックアップ復元` と復元失敗時の既存データ保持説明を確認
  - iframe幅ハーネスで `390 / 820 / 1024 / 1366` の基本表示を視覚確認
    - `390 / 820`: モバイル統合UI、下部タブ表示
    - `1024`: タブレット2ペイン、右パネル4タブ表示
    - `1366`: PC2ペイン、左ナビ + 右パネル表示
- 未実施: `npx tsc --noEmit` / `npm run lint` / `npm run build`
  - 理由: このCodex環境ではNode起動時に `Could not determine Node.js install directory` / `Assertion failed: ncrypto::CSPRNG(nullptr, 0)` で停止する
- 未実施: 実ブラウザ上のPCドラッグ日時移動、バックアップJSONの実復元
  - 補足: CUAのdrag操作ではHTML5 drag/dropが発火せず、時刻変更と移動先ガイドの実操作確認は未完了。ページ再読み込み後のconsole error / warnはなし

### フェーズ2: 公開最小セット（v0）を固定する

- [ ] 公開対象を `Portal + Tools Index + Schedule Calendar` に固定し、他ツールは準備中導線で統一する
- [ ] 公開前チェックリストを作成する
  - ページ導線、レスポンシブ、基本SEO、404/500相当の表示方針
  - Cloudflare配信時の `_headers` / 静的成果物の確認
- [ ] フィードバック導線を追加する
  - 不具合報告と要望収集の入口を `/` または `/tools` に設置する

### フェーズ3: 2本目MVPツールを追加する

- [ ] 2本目は Schedule Calendar と連携しやすいツールを優先する（候補: Content Planner）
- [ ] 共通データモデルを先に設計する
  - 日付、カテゴリ、配信プラットフォーム、メモを共通フィールドとして定義する
- [ ] ツール間連携の最小導線を実装する
  - 例: カレンダー予定から企画メモ作成へ遷移
