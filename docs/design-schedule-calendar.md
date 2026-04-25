---
title: "Schedule Calendar Design"
inherits: "./design.md"
page_type: "schedule management tool"
layout_mode: "left calendar + right fixed side panel"
default_view: "week"
---

# Schedule Calendar Design

## Overview

スケジュールカレンダーは、配信予定を素早く整理し、そのまま告知準備にもつなげられる実務ツールとして設計する。  
初回MVPでは「管理のしやすさ」を優先し、告知演出は投稿補助タブに限定して扱う。

## Layout

### Main Split

- 左: カレンダー領域
- 右: 固定幅サイドパネル

右パネルは常時表示を基本にし、一覧と操作対象の関係を明確にする。

### Calendar Area

- 初期表示は `週表示`
- 表示切替は `月 / 週 / 日`
- ヘッダーには期間表示と表示切替、必要なら追加導線を置く

### Side Panel

タブは以下の2つに限定する。

- `予定管理`
- `投稿補助`

## Calendar Behavior

### Week View

- 予定ブロックはコンパクト表示
- 一覧では `タイトル + 時刻` を中心に見せる
- カテゴリ色は小さく補助的に入れてよい
- 詳細はクリックまたはタップ時に右パネルで扱う

### Month / Day View

- 月表示は俯瞰優先
- 日表示は詳細確認優先
- ただし初回体験は週表示を基準に整える

## Side Panel Details

### Schedule Tab

- 選択日の予定一覧
- 新規登録導線
- 編集 / 削除導線
- 選択中の予定詳細

フォームはパネル内で完結できるようにし、別画面遷移は避ける。

### Post Assist Tab

- テンプレ選択
- 投稿文プレビュー
- コピー
- `X` 投稿画面への遷移

トーンは全体に合わせて整然と見せ、クリエイティブツールのようにはしない。

## Visual Tone

- カレンダーグリッドは読みやすさ優先
- 選択状態、当日、アクティブタブだけをアクセントで強調
- 予定ブロックは主張しすぎず、密度に耐える幅と高さにする
- 投稿補助パネルも同じUI言語で揃える

## Interaction

- クリックで選択
- ホバーは軽い背景変化
- 保存、更新、削除、コピーは短いフィードバックで知らせる
- 強いアニメーションは使わない

## Responsive Behavior

- PC優先
- Mobileでは右パネルを下段化またはモーダル化してよい
- ただし情報構造は `カレンダー -> 詳細 / 投稿補助` を維持する

## Key Components

- CalendarToolbar
- CalendarGrid
- EventBlock
- ScheduleSidePanel
- ScheduleListTab
- PostAssistTab
- PostPreviewCard

## Do

- 週表示での視認性を最優先にする
- 予定の密度が上がっても破綻しにくくする
- 投稿補助をカレンダーの延長線上に見せる

## Do Not

- 週表示に情報を詰め込みすぎる
- 投稿補助だけ別プロダクトのように見せる
- 装飾で操作性を下げる
