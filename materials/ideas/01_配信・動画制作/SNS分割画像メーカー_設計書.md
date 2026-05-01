# アプリケーション設計書：SNS分割画像メーカー

## 1. 概要

X向け16:9画像を分割投稿用に加工するフロントエンド完結型ツール。  
MVPでは `1+8連結` と `1+4差し替え` の2モードを同時実装し、位置/スケール/境界調整と投稿順出力を提供する。

## 2. 技術スタック

| 分類 | 技術 | 目的 |
| :--- | :--- | :--- |
| フレームワーク | Next.js (App Router) | 既存ポータル統合 |
| 言語 | TypeScript | 合成処理の型安全性 |
| UI | React | モード/素材/調整状態の管理 |
| スタイリング | Tailwind CSS | 既存UI基準と整合 |
| 描画/合成 | HTML Canvas 2D API | 分割・合成・出力 |
| データ保存 | localStorage | 編集状態の保存/復元 |

## 3. アーキテクチャ

- **フロント完結型**: 画像処理をブラウザ内で実施。
- **パイプライン分離**:
  1. 入力検証
  2. モード別素材正規化
  3. 分割/合成
  4. プレビュー生成
  5. 出力生成
- **状態分離**:
  - 入力素材状態
  - 調整パラメータ
  - 出力設定

## 4. データモデル

```ts
type SplitMode = "modeA_1plus8" | "modeB_1plus4";

interface SplitAdjustments {
  offsetX: number;
  offsetY: number;
  scale: number;
  splitX: number; // 分割線X
  splitY: number; // 分割線Y
  seamFix: number; // 境界補正
  borderWidth: number;
  borderColor: string;
  topBottomRatio: number;
}

interface InputSlotsModeA {
  base: string; // data URL
  top: [string, string, string, string];
  bottom: [string, string, string, string];
}

interface InputSlotsModeB {
  base: string; // data URL
  replace: [string, string, string, string];
}

interface SplitDraft {
  version: 1;
  mode: SplitMode;
  adjustments: SplitAdjustments;
  exportFormat: "png" | "jpeg";
  updatedAt: string;
}
```

## 5. コンポーネント構成

| コンポーネント名 | 役割 |
| :--- | :--- |
| `SnsSplitMakerPage` | 全体状態と画面遷移管理 |
| `ModeSelector` | `1+8` / `1+4` 切り替え |
| `InputSlotPanel` | モード別必須素材スロット管理 |
| `SplitPreviewCanvas` | サムネ見え方/投稿並びプレビュー |
| `AdjustmentPanel` | 位置/スケール/境界/線設定 |
| `ExportPanel` | 4枚個別出力と連番命名 |

## 6. 主要ロジック

### 6.1 分割座標計算

- 基本は2x2グリッド。
- `splitX`, `splitY`, `seamFix` を加味して各タイル座標を算出。
- 投稿順マッピング:
  - 1: 左上
  - 2: 右上
  - 3: 左下
  - 4: 右下

### 6.2 モードA（1+8連結）

- 分割元を4タイル化。
- 各タイルに対応する上/下素材を合成し最終タイル化。
- `topBottomRatio` により連結高さ配分を制御。

### 6.3 モードB（1+4差し替え）

- ベース画像を表示。
- 4領域に差し替え素材を配置（オフセット/スケール反映）。
- 必要に応じて境界線を重ねる。

### 6.4 プレビュー

- `preview_thumbnail`: 4タイル縮小見え方を表示。
- `preview_feed`: 投稿順1→4の並びを表示。
- 調整値変更時は再レンダリング。

### 6.5 出力

- 各タイルを個別Canvasへ描画し、4枚を順次ダウンロード。
- ファイル名:
  - `split-YYYYMMDD-HHMMSS_01`
  - `split-YYYYMMDD-HHMMSS_02`
  - `split-YYYYMMDD-HHMMSS_03`
  - `split-YYYYMMDD-HHMMSS_04`

### 6.6 保存/復元

- 保存キー: `v-streamer-tools:sns-split-maker:draft:v1`
- 保存内容: `mode`, `adjustments`, `exportFormat`, `updatedAt`
- 復元時の破損JSONは無視して初期化。

## 7. バリデーション/失敗時挙動

- 形式不正/容量超過/必須スロット不足時は出力ボタンを無効化。
- 合成失敗時は失敗理由を通知し、調整値は保持する。
- localStorage保存失敗時は「保存できませんでした」を通知。

## 8. 拡張ポイント（Phase 2以降）

- X以外の比率テンプレート追加
- ZIP一括ダウンロード
- サムネイルエディタからの受け渡し
- Calendar情報のlocalStorage取り込み補助
