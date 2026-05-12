---
title: "SNS Split Image Maker Design"
inherits: "./design.md"
page_type: "image utility tool"
layout_mode: "left canvas + right control panel (desktop), bottom navigation fallback (mobile)"
default_ratio: "X post presets: 24:9 / 8:13.5 / 16:27"
---

# SNS Split Image Maker Design

## Overview

SNS分割画像メーカーは、配信告知やショート告知で使うX向け画像を  
**1枚の分割基板画像**から2分割 / 3分割 / 4分割の投稿画像へ再編成する実務寄りツールとして設計する。
自動生成ではなく、手動で「境界を微調整してずれをなくす」ことを主目的にする。

freeze 前の対象はX向けの既存3プリセットに限定し、投稿前の見え方を最優先に整える。

## Layout

### Main Split (Desktop)

- 左: 編集キャンバス（出力イメージ）
- 右: 入力フォーム＋2モード切替＋調整コントロール

キャンバスは常に中心情報として維持し、右側で値調整と出力管理を完結させる。

### Editor Areas

実装時の理解を最優先するため、画面を以下の3ブロックで固定する。

- `Input Area`（元画像エリア）
  - `2分割` ではベース1枚 + 追加枠4枚または8枚 / フレーム2枚を入力
  - `3分割` ではベース1枚 + 追加枠6枚 / フレーム3枚を入力
  - `4分割` ではベース1枚 + 追加枠8枚 / フレーム4枚を入力
  - 画像差し替えはドラッグ/クリックで行う

- `Split Preview Area`（分割後プレビューエリア）
  - 4タイルの見え方を投稿順`1→2→3→4`で表示
  - 投稿順インデックスを明示

- `Post Composite Preview`（投稿合成エリア）
  - 最終出力の想定並びを確認
  - ここでズレ確認を行い、再調整→再出力へ戻る

上部: プリセット選択、追加方式（`個別追加` / `フレーム追加`）、分割・合成設定
中央: `Split Preview Area`
下部: `Input Area` と `Post Composite Preview` + 操作パネル（タイル/境界設定・調整値・再出力）

### Mobile Layout

- 1カラム化
- 左右パネルをトップ操作 + タブセクション化
- キャンバスはスクロール追従
- 重要ボタン（保存・出力・再生成）を固定配置

## Modes

### 2分割

- 出力: `24:9` の横長投稿を2枚作成
- 個別追加: `3連結` または `5連結`
- フレーム追加: 投稿ごとの横長フレームへメイン分割を差し込む

### 3分割

- 出力: `24:9` 1枚 + `8:13.5` 2枚を作成
- 個別追加: 画像1の左右、画像2/3の上下へ追加画像を置く
- フレーム追加: 画像1/2/3それぞれのフレームへメイン分割を差し込む

### 4分割

- 出力: `8:13.5` の縦長投稿を4枚作成
- 個別追加: 投稿ごとの上部/下部に追加画像を置く（旧: `1+8`）
- フレーム追加: 投稿ごとの縦長フレームへメイン分割を差し込む（旧: `1+4`）

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
- 投稿順どおりの個別画像保存（連番）

## Preview and Quality

- 同一画面で「完成想定表示」と「並び想定表示」を両方確認できること
- 仕上げ前に `ズレ確認` を1ステップとして明示
- 連番は `split-YYYYMMDD-HHMMSS_01` 〜 `_04`

## Export

- 出力: プリセットに応じた2〜4枚の個別PNG/JPEG
- 命名: `split_1` ... `split_4`、または handoff 由来の日付/タイトル + 連番
- 連続ダウンロードを前提に、出力順を固定する
- メイン画像が未選択の場合は出力ボタンを無効化し、直接実行されても警告で止める
- 成功時は出力順と枚数を短いフィードバックで返す

## Freeze Boundary

- freeze 前の core UX は、初回はプリセットを選び、編集画面でメイン画像を入れ、必要に応じて追加画像と境界を調整し、個別PNG/JPEGを書き出す流れで固定する。
- Schedule Calendar 由来の handoff は告知文メモとファイル名候補だけを反映するため、ユーザーは次にメイン画像を選ぶ。
- Thumbnail Editor 由来の handoff は受け取った画像をメイン画像に反映するため、ユーザーは次にプレビューを確認して個別PNG/JPEGを書き出す。
- ZIP 出力、X 以外の比率、複数形式の大規模 export は freeze 後の別PR候補として扱う。

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

Schedule Calendar から受け取る場合は、URL query の短い `handoff` token を読み、対応する `sessionStorage` 上の一時 payload から告知文、ハッシュタグ、日付、タイトル、ファイル名候補だけを反映する。
Schedule Calendar 由来の payload では画像本体を渡さない。

Thumbnail Editor から受け取る場合は、URL query の短い `handoff` token を読み、対応する一時 payload とIndexedDB上の一時画像を確認する。
画像本体は `localStorage` へ保存せず、既存のSNS分割画像メーカー画像保存方式を使う。
正常に読めた場合は、画像を `base` 画像へ反映し、既定で `split-4` 編集画面を開く。
告知文、ハッシュタグ、日付、タイトル、ファイル名候補がある場合は、既存の受け取りメモ表示とエクスポートファイル名に反映する。
token 不一致、期限切れ、壊れた payload、対象ツール不一致、画像取得失敗は通常起動へフォールバックする。

## Responsive Behavior

- PC: 左右2ペイン構成（キャンバス固定比率）
- Tablet: 左右2ペインを維持し、コントロール幅を圧縮
- Mobile: 1カラム + アコーディオン操作
- freeze 確認幅: 390 / 820 / 1024 / 1280 / 1366

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
- `SplitImageSource`: id(`base`/`slot-${number}`), name, src
- `SplitConfig`: splitX, splitY, seamFix, offset, scale, joinType, postAdjustments, seam display
- `SplitExportSettings`: format, quality, filePattern
- `SplitDraft`: version, preset, mode, aspectRatio, images, config, exportSettings, updatedAt
- draft metadata は `localStorage`、画像本体は IndexedDB `v-streamer-tools:sns-split-image-maker` / `images` store へ分離する

## Do

- 2分割 / 3分割 / 4分割と、個別追加 / フレーム追加を同画面で完結できること
- 分割画像の見え方が投稿時の想定順で確認できること
- 微調整から再出力まで1フローで終わること
- ユーザーが誤って出力しない導線ガードを入れること

## Do Not

- AI生成やAPI依存をMVPで入れる
- 自動最適化（複雑な自動合わせ）を初回から追加する
- 壊れやすい複雑なUIで学習コストを上げる
