---
title: "SNS Split Image Maker Design Sheet"
tool: "SNS Split Image Maker"
scope: "MVP UI specification for mockup and implementation"
---

# SNS Split Image Maker Design Sheet

## 1. 設計目的

- 配信/告知用途の4分割画像を、手動調整で誤差なく作れることを目的にする
- `1+8` と `1+4` の2モードを同一画面で運用する
- 投稿直前の見え方（投稿順・崩れ）を最優先に設計する

## 2. コア画面構成

### 2.1 3ブロック構造（最重要）
1. `Input Area`
   - ベース画像と差し込み画像（8枚 or 4枚）を入力する
2. `Split Preview Area`
   - 4枚の分割後プレビューを確認
3. `Post Composite Preview`
   - 投稿順での最終見えを確認

### 2.2 画面優先領域
- 上部: モード切替（`1+8連結` / `1+4差し替え`）、比率設定
- 中央: `Split Preview Area`
- 下部: `Input Area` + `Post Composite Preview` + 調整入力 + 出力

## 3. データフロー

1. 画像読込
2. 分割モード選択
3. 分割線と境界微調整
4. 4分割見え替え（投稿順表示）
5. 再出力（4枚）

### 3.1 ミニマム状態管理
- `mode`（`concatenate` / `replace`）
- `images`（base + slots）
- `splitConfig`（splitX, splitY, seamFix, offsetX, offsetY, scale）
- `draft`（更新時刻を持つ保存単位）

## 4. インタラクション要件

- 重要な操作（保存、再計算、出力）は1クリックで反映
- 分割後プレビューはリアルタイム更新
- 境界ズレがある場合は「ズレ確認状態」を明示
- 入力不足は危険操作を止めず、明示的なガードを出す
- 失敗時はエラー内容を短文で返す

## 5. トーン / 視覚仕様

- まず見やすさと整合性優先
- 境界線・選択枠は明示（識別容易）
- 目立たせる箇所は状態（選択中・未入力・エラー・出力可）
- 装飾より情報密度・操作導線を優先

## 6. レスポンシブ

- Desktop（1280px~）: 2ペイン
- Tablet（1024~1279px）: 2ペイン維持（幅圧縮）
- Mobile（〜1023px）: 1カラム化、タブ/アコーディオン化
- チェック幅: 390 / 820 / 1024 / 1366

## 7. 表現要件（モック用）

- `Input Area` は大きく、現在の選択画像を明示
- `Split Preview Area` は4マスを均等で表示
- `Post Composite Preview` は投稿順を示す番号付きで表示
- 再出力直前の視認性を重視した構成

## 8. 例外ケース

- Base画像なしでの出力は不可
- Slot枚数不足時は不足分を明示
- 画像読込失敗時は代替パネルを表示
- localStorage復旧失敗時は安全に初期状態へ戻す

## 9. Do

- 一目で「どこに素材を入れ、どこが最終出力か」が分かる
- 投稿順のイメージが常に見える
- 直感的な戻り（再調整→再出力）で作業が止まらない
- 画面上で2モード比較が可能

## 10. Do Not

- AI生成、SNS API投稿、重い自動最適化をMVPで入れない
- 1画面で情報過多にしない
- `Input` と `Post Composite` を混在させて意味を曖昧にしない
