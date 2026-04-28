# Schedule Calendar README

## Overview

`/tools/schedule-calendar` は、V Streamer Tools 初回 MVP の中核ツールです。
認証やサーバー保存を使わず、ブラウザの `localStorage` だけで予定管理、投稿補助、設定管理を完結します。

主な利用目的は、配信者・動画投稿者が日々の配信、制作、投稿、企画、準備、業務予定をまとめて確認し、投稿告知文まで素早く作ることです。

## Main Features

- 月 / 週 / 日表示のスケジュール確認
- 予定の追加、編集、削除
- 削除後 8 秒以内の `元に戻す` undo toast
- 予定一覧タブ
  - タイトル / メモ検索
  - カテゴリ、媒体、期間フィルタ
  - 直近順、日付昇順、日付降順
- 投稿補助タブ
  - テンプレート選択
  - 投稿文プレビュー
  - クリップボードコピー
  - X 投稿画面への遷移
- 設定タブ
  - 初期表示ビュー
  - 週開始曜日
  - 既定開始時刻
  - 既定所要時間
  - 投稿補助テンプレート管理
  - JSON エクスポート / インポート
  - 全データ初期化

## Responsive Behavior

表示レンジは `ScheduleCalendarApp.tsx` 内の class 定数とコメントで明示しています。

- `<=1023px`: モバイル統合 UI
  - カレンダー、予定一覧、設定を下部タブで切り替える
  - 予定管理 / 投稿補助はボトムシートで表示する
  - 削除 undo toast は下部タブの上に固定表示する
- `1024-1279px`: タブレット 2 ペイン
  - 左にカレンダー、右に補助パネル
  - 右パネルは `予定管理 / 投稿補助 / 予定一覧 / 設定` の 4 タブ
- `>=1280px`: PC 2 ペイン
  - タブレット 2 ペインと同じ機能構成
  - 右パネル幅を広めに取り、一覧と設定の視認性を上げる

## Data Model And Storage

保存先は `localStorage` の `v-streamer-tools:schedule-calendar-events:v1` です。

保存 payload は versioned 形式です。

```json
{
  "version": 2,
  "events": [],
  "settings": {},
  "postTemplates": []
}
```

読み込み時は `normalizeStoragePayload()` を通して、旧形式の予定配列と versioned payload の両方を受け付けます。
壊れた JSON や import 失敗時は既存データを変更しない方針です。

削除 undo は一時的な React state のみで管理します。
undo 専用履歴は `localStorage` に保存しません。

## Important UX Rules

- 予定削除は確認モーダルを出さず、削除後 toast の `元に戻す` で復元する
- undo 対象は直近 1 件のみ
- undo toast は 8 秒で自動消滅する
- コピー失敗時は手動コピー用の文面を表示する
- JSON インポート失敗時は既存データを保持し、失敗メッセージを表示する
- 1023px 以下のモバイル統合 UI と、1024px 以上の右パネル UI は混線させない

## Current Non-goals

- ログイン
- サーバー保存
- 複数端末同期
- Google Calendar 連携
- SNS API 直接投稿
- AI 生成機能

## Verification Checklist

PR 前は最低限、次を確認します。

- 予定追加 / 編集 / 削除
- 削除後 toast 表示
- `元に戻す` で予定が復元され、編集対象に戻る
- 8 秒後に undo toast が消え、削除済み状態が維持される
- 投稿補助コピー、コピー失敗時 fallback、X 遷移 URL
- 予定一覧タブの検索 / フィルタ / ソート
- 設定タブの表示、JSON エクスポート / インポート
- 幅別表示
  - `390px`
  - `820px`
  - `1024px`
  - `1180px`
  - `1366px`

## Known Environment Note

この Codex 環境では、`npm run lint`、`npx tsc --noEmit`、`next dev` などが Node 起動前に次のエラーで停止することがあります。

```text
Assertion failed: ncrypto::CSPRNG(nullptr, 0)
```

この場合は、ユーザー側 PowerShell で lint / typecheck を再実行し、Codex 側では `git diff --check`、静的差分確認、起動済みブラウザでの回帰確認を代替証跡として残します。

