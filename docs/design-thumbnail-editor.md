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
