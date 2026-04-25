---
title: "V Streamer Tools Shared Design"
theme_mode: ["light", "dark"]
design_style: "practical dashboard with soft VTuber-friendly accents"
accent_family: "deep teal with restrained mint support"
surface_style: "flat surfaces with thin borders"
radius_scale: "8px base"
typography: "readable sans-serif"
---

# Shared Design

## Overview

このドキュメントは `V_streamer_tools` 全体の共通デザイン基準を定義する。  
初回MVPでは「実務ダッシュボードとしての信頼感」を軸にしつつ、VTuber向けサービスとして硬すぎない柔らかさを残す。

共通方針は以下の通り。

- ライトモードとダークモードを同格で扱う
- ベースは中立的なグレー群で組み、主張は深めティールで行う
- 装飾より情報整理を優先する
- 密度はやや高めだが、視線誘導は明確にする
- カードやパネルはフラットに保ち、境界線でレイヤーを分ける

## Color System

### Base

- Background: ニュートラルグレー基調
- Foreground: 高コントラストの文字色
- Surface: 背景より一段だけ浮かせる面
- Border: 細く低主張な境界線

### Accent

- Primary accent: 深めティール
- Secondary accent: 限定的な明るめミント
- Success / Info / Warning / Danger は一般的なUI意味色に従う

### Intent

- ティールは主要CTA、選択状態、アクティブタブ、重要な数値に使う
- ミントは補助ハイライト、ホバー、軽い状態差にのみ使う
- ピンクや強い紫は共通基盤では使わない
- モード切替後も意味色の役割は変えない

## Typography

### General

- 可読性優先のサンセリフを採用する
- 見出しも本文も同系統で揃え、ブランド性は色と余白で出す
- 文字サイズ差は大きくしすぎず、情報密度に耐える設計にする

### Usage

- Page title: 強めだが過度に大きくしない
- Section title: 一覧の区切りが分かる程度に整理
- Body: 長文より短文前提
- Meta text: 状態表示や補足に使う

## Spacing And Shape

- 基本角丸は `8px`
- ボタンや入力欄も同じ角丸スケールを使う
- 余白は狭すぎず広すぎず、一覧性を優先する
- セクションは余白、カード内はグリッド整列で整理する

## Surfaces And States

- 面はフラット、影は最小限
- 階層差は `背景差 + 境界線 + 内側余白` で表現する
- ホバーは色変化か境界線強調を中心にする
- フォーカス状態はアクセント色で明確に示す
- 選択状態は背景色を少し上げつつ、境界線かインジケータで補強する

## Components

### Buttons

- Primary: 深めティールで明確にアクションを示す
- Secondary: 中立面に境界線
- Ghost: 一覧やヘッダーなど軽いアクション用

### Inputs

- フラットな面と細い境界線で構成する
- プレースホルダは薄くしすぎず読み取れる濃度に保つ

### Cards

- 中型カード基準
- 見出し、短説明、状態、導線をきれいに分ける
- カードごとの差は内容で見せ、装飾差は控えめにする

### Chips / Segments

- フィルタや状態切替に使う
- 横並び前提で、選択時だけアクセントを入れる

## Motion

- モーションは短く控えめにする
- 画面ロード時の軽いフェード、ホバー時の微小変化程度に留める
- 大きなパララックスやガラス演出は避ける

## Do

- 情報を整理して見せる
- 実装済みと準備中の状態差を明快に出す
- モード切替後も視認性を優先する
- 画面全体の温度感は落ち着かせる

## Do Not

- VTuber向けらしさを派手な色に頼る
- 影やぼかしで階層を作りすぎる
- 角丸を大きくしすぎる
- 一覧画面で長文説明を見せすぎる
