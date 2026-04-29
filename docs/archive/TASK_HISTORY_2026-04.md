# TASK HISTORY 2026-04

更新日: 2026-04-29  
目的: `task.md` の完了済み項目を月次で退避し、現行タスクを未完了中心に保つ。

## 2026-04 完了済みの主な実施内容

### Portal / Tools

- Next.js + React + TypeScript + Tailwind の土台構築
- Cloudflare Pages 向け静的出力設定
- ライト / ダーク切替を含む共通テーマ
- ポータル共通レイアウト（Header / Left Sidebar / Main）
- HOME のスイート入口化、`/tools` の個別ツール一覧化
- スイートカードから `/tools?suite=<key>` 遷移
- `/tools` の3系統フィルタ（スイート / カテゴリ / 実装状態）
- HOME / TOOLS のレスポンシブ最適化
  - `~767px`: モバイル（ハンバーガー + ドロワー）
  - `768~1023px`: モバイル統合UI継続
  - `1024~1279px`: 簡略 rail + タブレット2カラム基調
  - `1280px~`: PC表示維持
- HOMEスイートカードの余白、ボタンはみ出し、状態表示重複の修正
- `/tools` の `suite` query 同期と active 状態整合の修正

### Schedule Calendar

- `/tools/schedule-calendar` の本体実装
  - 月 / 週 / 日ビュー
  - 予定管理 + 投稿補助
  - localStorage 保存 / 復元
- モバイル最適化
  - ヘッダー + ハンバーガー + 下部タブ
  - FAB / セルタップ起点のボトムシート導線
  - 月 / 週 / 日のモバイル表示分岐
- レスポンシブ境界の整理
  - `~1023px`: モバイル統合
  - `1024~1279px`: タブレット2ペイン
  - `1280px~`: PC2ペイン
- 右パネル4タブ化（`1024px+`）
  - 予定管理 / 投稿補助 / 予定一覧 / 設定
- 予定一覧強化
  - 直近順、期間・カテゴリ・プラットフォームフィルタ、検索
- 設定タブ実用化
  - 初期ビュー、週開始曜日、既定時刻、データ管理
- 投稿補助テンプレート CRUD と設定連動
- 削除後 undo toast（直近1件、8秒）

### 安定化 / セキュリティ / 運用

- `localStorage` の versioned payload 化と移行ガード
- 壊れたJSON時の上書き防止、Import失敗時の既存データ保護
- インポート入力上限の追加
- 全データ削除の確認ステップ追加
- Cloudflare Pages 用 `_headers` 追加
- `.gitignore` 整備（ローカルブラウザ実行物の混入防止）
- `docs/SCHEDULE_CALENDAR_STABILITY_CHECK_2026-04-28.md` 作成・更新
- `docs/SCHEDULE_CALENDAR_README.md` へ運用上の注意を反映

### 依存更新

- Next.js / React 系を更新
  - Next.js `16.2.4`
  - React `19.2.5`
- `next lint` 廃止対応として ESLint CLI 実行へ移行
- build は `next build --webpack` を採用
- ユーザー端末で `lint` / `tsc --noEmit` / `build` / `audit:prod` 通過を確認

## 参照ドキュメント

- `docs/SCHEDULE_CALENDAR_STABILITY_CHECK_2026-04-28.md`
- `docs/SCHEDULE_CALENDAR_README.md`
- `docs/PLAN.md`
