---
title: "Thumbnail Editor Design"
inherits: "./design.md"
page_type: "thumbnail creation tool"
layout_mode: "left canvas + right control panel"
default_ratio: "16:9"
---

# Thumbnail Editor Design

## Overview

サムネイルエディタは、AI自動生成ではなく「手動で速く・確実に作れる」ことを主目的に設計する。  
初回MVPでは、素材持ち込み前提で、文字の見栄え・レイヤー編集・プリセット適用を中心に実装する。

この画面は「軽量Canva」の入口ではあるが、MVP段階では高機能化より実運用の安定性を優先する。

## Layout

### Main Split

- 左: 編集キャンバス
- 右: レイヤーとプロパティの操作パネル

キャンバスを主役にし、操作は右側で一貫して完結させる。

### Header Row

- 左: ツール名、現在のプリセット名
- 右: 新規作成、下書き保存、書き出し

重要アクションは常時見える位置に固定する。

### Left Canvas Area

- 16:9基準（1280x720 / 1920x1080）
- 選択中レイヤーの境界を可視化
- 背景は中立色で、素材の見え方を邪魔しない

### Right Control Panel

- タブまたはセクションで整理
- `レイヤー`
- `テキスト`
- `図形`
- `エフェクト`
- `プリセット`

## Editing Model

### Layer Types

- 画像
- テキスト
- 図形（矩形/円）

### Layer Operations

- 追加
- 選択
- 前面/背面移動
- 複製
- 削除

### Text Quality (MVP Core)

- フォント（Google Fontsの限定セット）
- サイズ
- 色
- 行間
- 縁取り
- 影

MVPの品質は「文字の見やすさ」で決まるため、テキスト編集を最優先にする。

### Effects (MVP)

- 縁取り
- 影
- 透明度
- ぼかし（軽量）

高度なフィルタや合成モードは後続フェーズに送る。

## Presets

初期プリセットは以下の4種。

- 配信告知
- 歌枠
- 雑談
- 切り抜き

プリセットは画像テンプレ固定ではなく、初期レイアウトとスタイルセットとして提供する。  
適用後に手動調整できることを前提にする。

### 2026-05 Minimum Preset-Complete Step

白紙編集ツールから、VTuber向けの「用途別プリセットを選んで文字と素材を差し替える」体験へ寄せる。
初回追加では既存4種に加えて、次の5種を追加する。

- ゲーム実況
- コラボ
- お知らせ
- 週間予定
- X告知画像

プリセット一覧は、カード一覧のまま `カテゴリ` と `用途ラベル` を表示する。
本格的な検索、絞り込み、最近使ったプリセット、お気に入りは後続フェーズに送る。

Schedule Calendar からの handoff は、受け取った予定テキストをプリセット内の `見出し`、`時刻`、`サブ`、`ラベル` の名前を持つテキストレイヤーへ反映する。
プリセット変更後も同じ予定テキストを再適用するが、手動編集済みテキストとの高度なマージや画像本体の受け渡しは後続候補に残す。

### 2026-05 Preset Discovery Minimum Step

プリセット増加に備え、プリセット一覧へ検索、カテゴリ絞り込み、用途ラベル絞り込み、最近使ったプリセット、お気に入りを追加する。

検索対象はプリセット名、カテゴリ、用途ラベル、説明に限定する。
絞り込みはカテゴリと用途ラベルのチップ選択に留め、プリセットの内容やレイヤー構造は変えない。
最近使ったプリセットとお気に入りは、`preset id` の配列だけを `localStorage` へ保存する。
画像本体、draft、handoff payload、SNS Split Image Maker の分割ロジックは変更しない。

手動編集済みテキストと handoff テキストの高度なマージ、立ち絵配置プリセット、プリセットの部分適用は後続候補のまま残す。

### 2026-05 Thumbnail To SNS Split Handoff

Thumbnail Editor で表示中のキャンバスをPNG相当で描画し、SNS分割画像メーカーの `base` 画像として渡せる導線を追加する。
画像本体は `localStorage` へ保存せず、SNS分割画像メーカー側のIndexedDB画像保存方式へ寄せる。
URL query には短い `handoff` token と `preset=split-4` だけを載せ、タイトル、日付、カテゴリ、プラットフォーム、告知文、ハッシュタグ、ファイル名候補は一時 payload として渡す。
Schedule Calendar 由来の予定テキストがある場合は、その情報を継承する。通常起動の Thumbnail Editor から渡す場合は、見出しテキストと現在プリセット情報を最小メタデータとして使う。

## Export

- 出力形式: PNG / JPEG
- MVPは1枚出力に限定
- 出力時の見た目はキャンバス表示と一致させる

## Visual Tone

- 実務ツール寄り
- 装飾は最小限
- 編集中の視認性を最優先
- アクセント色は選択状態と主要ボタンに限定

## Interaction

- 選択時は境界表示と右パネル同期
- 値変更は即時プレビュー反映
- 保存/書き出しは短いフィードバック表示
- 強いアニメーションは使わない

## Responsive Behavior

- PC優先設計
- タブレットは右パネル幅を縮小
- モバイルはMVP対象外（閲覧または簡易操作に留める）

## Key Components

- ThumbnailEditorShell
- ThumbnailCanvas
- LayerListPanel
- PropertyEditorPanel
- PresetSelector
- ExportDialog

## Do

- 文字の見栄えを最優先に調整する
- 初回でも5分以内に告知サムネが作れる導線にする
- 既存ポータルと同じUI言語で統一する

## Do Not

- AI生成前提の導線を入れる
- 初期から多機能フィルタを詰め込みすぎる
- キャンバス上の操作を複雑化して学習コストを上げる
