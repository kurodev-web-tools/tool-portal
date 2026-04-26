---
title: "Tools Index Design"
inherits: "./design.md"
page_type: "tool discovery index"
layout_mode: "top header + left sidebar + compact intro + filter row + dense card grid"
density: "high but readable"
---

# Tools Index Design

## Overview

`/tools` は、`/` よりも一覧性を強めた `全ツール探索ページ` として設計する。  
ポータルTOPが `スイート入口` であるのに対し、`/tools` は「使える個別ツールを探して比較し、そのまま入る」ための画面とする。

見せ方の軸は以下。

- 実務ダッシュボード寄り
- ヒーローや説明は最小限
- ツール探索と絞り込みを主役にする
- 実装済みと準備中を明快に分ける
- スイートから遷移してきたときに、その文脈を引き継げる

## Layout

### Overall Structure

- 上部ヘッダー
- 左サイドバー
- 右メインコンテンツ

構造はポータルTOPと揃えるが、メインコンテンツの比重はさらに一覧寄りにする。

### Header

- 左: サービス名またはロゴ
- 右: ライト / ダーク切替

ヘッダーは軽く、一覧探索の邪魔をしない。

### Left Sidebar

- 初期MVPでは `固定項目 + 実装済みツール`
- 例
  - Home
  - Tools
  - Schedule Calendar

`Tools` はアクティブ状態で見せる。  
サイドバーはショートカット導線であり、一覧探索はメイン側で行う。

### Main Content

- ページタイトル
- 短い説明文
- フィルタ列
- ツール一覧グリッド

サマリー数値や大きいヒーローは置かず、探索効率を優先する。

### Intro Area

- 見出し: `Tools` または `ツール一覧`
- 1文の説明
  - 例: 利用可能なツールや準備中の機能をカテゴリごとに確認できます

高さは抑え、一覧の開始位置を上に持ってくる。

必要なら、現在適用中のスイートフィルタを示す小さな状態表示を置いてよい。  
例: `配信準備スイートを表示中`

### Filter Row

- 横並びチップ / セグメント型
- フィルタ対象
  - スイート
  - カテゴリ
  - 実装状態
- 必要なら将来的に検索を追加できる余地を残す

HOME のスイートカードから来た場合は、対応する `スイート` フィルタを初期適用した状態で表示する。

初期MVPで使う `suite` キーは以下を基準とする。

- `stream-workflow`
- `fan-brand`
- `business-collab`
- `growth-selfcare`

例:

- `/tools?suite=stream-workflow`
- `/tools?suite=fan-brand`

### Grid

- 3列基準の安定グリッド
- ポータルTOPよりやや密度高めでもよい
- カード高さは大きくしすぎない
- スクロールして比較しやすいことを優先する

## Cards

各カードは以下の要素で構成する。

- ツール名
- 短説明
- カテゴリ
- 状態ラベル
- 導線ボタン

### State Handling

- 実装済み: `開く`
- 準備中: `準備中` か `詳細を見る` の無効状態

カードは一貫した寸法と情報順序で並べ、比較しやすくする。

## Visual Tone

- ポータルTOPより少し説明量を減らし、一覧を前に出す
- 深めティールはアクティブ状態と実装済み導線に集中させる
- 準備中カードは中立色で静かに見せる
- 「情報が多いが整理されている」印象を優先する

## Responsive Behavior

- PC: 3列
- Tablet: 2列
- Mobile: 1列
- モバイルではフィルタ列を横スクロールで維持してよい

## Key Components

- PortalHeader
- PortalSidebar
- ToolsIndexHeader
- ToolFilterBar
- ToolCard
- StatusBadge

## Do

- 全ツールを比較しやすくする
- 実装済み導線をすぐ見つけられるようにする
- ポータルTOPとの差を明確にする
- スイートから来た文脈を一覧側で維持する

## Do Not

- ポータルTOPと同じヒーロー量にする
- 一覧性を落とす大きい装飾を入れる
- サイドバーに探索機能まで背負わせる
- HOME と同じ情報構造にする
