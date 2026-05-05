---
title: "SNS Split Image Maker Design"
inherits: "./design.md"
page_type: "image utility tool"
layout_mode: "left canvas + right control panel (desktop), bottom sheet fallback (mobile)"
default_ratio: "16:9"
---

# SNS Split Image Maker Design

## Overview

SNS分割画像メーカーは、配信告知やショート告知で使うX向け画像を  
**1枚の分割基板画像**から4枚に再編成する実務寄りツールとして設計する。  
自動生成ではなく、手動で「境界を微調整してずれをなくす」ことを主目的にする。

MVPは`1+8`と`1+4`の2系統を扱い、投稿前の見え方を最優先に整える。

## Layout

### Main Split (Desktop)

- 左: 編集キャンバス（出力イメージ）
- 右: 入力フォーム＋2モード切替＋調整コントロール

キャンバスは常に中心情報として維持し、右側で値調整と出力管理を完結させる。

### Editor Areas

実装時の理解を最優先するため、画面を以下の3ブロックで固定する。

- `Input Area`（元画像エリア）
  - `1+8` ではベース1枚 + 上下8枚を入力
  - `1+4` ではベース1枚 + 4枚を入力
  - 画像差し替えはドラッグ/クリックで行う

- `Split Preview Area`（分割後プレビューエリア）
  - 4タイルの見え方を投稿順`1→2→3→4`で表示
  - 投稿順インデックスを明示

- `Post Composite Preview`（投稿合成エリア）
  - 最終出力の想定並びを確認
  - ここでズレ確認を行い、再調整→再出力へ戻る

上部: モード切替（`1+8連結` / `1+4差し替え`）と基準比率
中央: `Split Preview Area`
下部: `Input Area` と `Post Composite Preview` + 操作パネル（タイル/境界設定・調整値・再出力）

### Mobile Layout

- 1カラム化
- 左右パネルをトップ操作 + タブセクション化
- キャンバスはスクロール追従
- 重要ボタン（保存・出力・再生成）を固定配置

## Modes

### Mode A: 1+8（上下連結）

- 入力: `1枚（分割元） + 8枚（上段/下段連結）`
- 出力: 投稿順 `1→2→3→4` の4枚を作成
- 連結線を境界で再計算し、ズレ最小化を前提にする

### Mode B: 1+4（既定枠差し替え）

- 入力: `1枚（ベース） + 4枚（フレーム差し替え）`
- 出力: 投稿順 `1→2→3→4`
- ベース内の空白領域に対して1枚ずつ差し込み、境界整合を保持

## Editing Model

### Inputs

- ベース画像（1枚）
- 子画像（8枚 or 4枚）
- 分割比率（MVPではX中心、将来拡張で比率追加）

### Parameters

- `splitX` / `splitY`（セパレータ位置）
- `seamFix`（境界補正）
- `offsetX`, `offsetY`（微調整）
- `scale`（必要なら個別微調整）

### Core Operations

- 画像読み込み
- 分割線移動
- 境界微調整
- プレビュー再計算
- 4分割の個別画像保存（連番）

## Preview and Quality

- 同一画面で「完成想定表示」と「並び想定表示」を両方確認できること
- 仕上げ前に `ズレ確認` を1ステップとして明示
- 連番は `split-YYYYMMDD-HHMMSS_01` 〜 `_04`

## Export

- 出力: 4枚個別PNG/JPEG（まずはPNG）
- 命名: `split-YYYYMMDD-HHMMSS_01` ... `_04`
- 連続ダウンロードを前提に、出力順を固定する

## Visual Tone

- カンタンに判読できるインターフェース
- 編集中の境界線を目立たせ、画像内容は邪魔しない
- アクセントは状態変化（選択中・保存済み・差し替え対象）に限定
- 大きな装飾より、分割精度優先

## Interaction

- モード切替は即時再計算
- 主要パラメータはスライダー + 数値入力
- 入力不足時は操作を止めず、明示的警告で導線を保つ
- 出力は短いフィードバック表示（成功/失敗/未完了）

## Tool Handoff

Thumbnail Editor から受け取る場合は、URL query の短い `handoff` token を読み、対応する一時 payload とIndexedDB上の一時画像を確認する。
画像本体は `localStorage` へ保存せず、既存のSNS分割画像メーカー画像保存方式を使う。
正常に読めた場合は、画像を `base` 画像へ反映し、既定で `split-4` 編集画面を開く。
告知文、ハッシュタグ、日付、タイトル、ファイル名候補がある場合は、既存の受け取りメモ表示とエクスポートファイル名に反映する。
token 不一致、期限切れ、壊れた payload、対象ツール不一致、画像取得失敗は通常起動へフォールバックする。

## Responsive Behavior

- PC: 左右2ペイン構成（キャンバス固定比率）
- Tablet: 左右2ペインを維持し、コントロール幅を圧縮
- Mobile: 1カラム + アコーディオン操作
- 目安幅: 390 / 820 / 1024 / 1366

## Key Components

- SplitImageMakerPage
- SplitModeSelector
- SplitCanvas
- SplitTilePreview
- ParameterPanel
- AlignmentControl
- ExportPanel

## Data Model (Implementation Reference)

- `SplitMode`: `concatenate` | `replace`
- `SplitImageSource`: id, type(`base`/`slot1..slot8`), fileDataURL
- `SplitConfig`: splitX, splitY, seamFix, offsets, zoom
- `SplitDraft`: mode, sources, config, updatedAt

## Do

- 1+8と1+4の2モードを同画面で完結できること
- 分割画像の見え方が投稿時の想定順で確認できること
- 微調整から再出力まで1フローで終わること
- ユーザーが誤って出力しない導線ガードを入れること

## Do Not

- AI生成やAPI依存をMVPで入れる
- 自動最適化（複雑な自動合わせ）を初回から追加する
- 壊れやすい複雑なUIで学習コストを上げる
