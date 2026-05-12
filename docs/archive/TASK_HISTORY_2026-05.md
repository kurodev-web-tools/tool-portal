# TASK HISTORY 2026-05

更新日: 2026-05-03
目的: `task.md` の完了済み項目を月次で退避し、現行タスクを未完了中心に保つ。

## 2026-05 完了済みの主な実施内容

### Thumbnail Editor MVP

- `/tools/thumbnail-editor` としてサムネイルエディタMVPを実装した
- `/tools` と左ナビの実装済みツールに `Thumbnail Editor` を追加した
- 参照モックを `docs/mockups` に final 命名で保存した
  - `thumbnail-editor-design-system-final.png`
  - `thumbnail-editor-desktop-final.png`
  - `thumbnail-editor-tablet-landscape-final.png`
  - `thumbnail-editor-mobile-final.png`
- レスポンシブ境界を固定した
  - `1280px~`: PC（左キャンバス + 右設定パネル）
  - `1024~1279px`: Tablet横（コンパクト2ペイン）
  - `~1023px`: Mobile統合UI（タブレット縦含む）
- 画像 / テキスト / 図形レイヤー、レイヤー選択・順序変更・複製・削除を追加した
- テキスト / 図形 / エフェクト編集、4プリセット、localStorage下書き保存/復元、PNG/JPEG書き出しを追加した
- キャンバス上の直接操作を追加した
  - レイヤーのドラッグ移動
  - 四隅ハンドルでのリサイズ
  - 回転ハンドルでの回転
  - PC向けカーソル切替
- OSネイティブ依存の入力UIを置き換えた
  - プリセット/キャンバスサイズをアプリ内ドロップダウン化
  - 色入力をHEX入力 + スウォッチ + SV/Hue UIへ変更
  - フォント選択をアプリ内listboxへ変更
- PC / Tablet横向けに左ツールレール、表示移動モード、集中編集モードを追加した
- `1024px~` ではキャンバス上のダブルクリック/ダブルタップで右設定パネルへ復帰できるようにした
- Google Fonts候補を日本語10種、英語10種へ拡張し、Cloudflare Pages CSPを更新した
- モバイルヘッダー/ドロワーを調整し、個別ツール名表示と実装済みツール導線を追加した
- 公開前MVP hardeningを実施した
  - PNG/JPEGのMIME/拡張子検証
  - 画像上限8MB
  - 画像未選択時の書き出しガード
  - localStorage破損時の安全初期化
  - 復元時の長文/不正フォント/不正画像src正規化
  - 主要アクションの最低限の `aria-label`
- 未対応/既知制約として、スナップ、角度ステップ回転、ローカルフォントimport、AI生成、有料API連携、SNS直接投稿、複数サイズ一括出力を残した

#### Thumbnail Editor 検証

- `npm run lint` 成功
- `npx tsc --noEmit` 成功
- `npm run build` 成功
- `git diff --check` 成功（CRLF警告のみ）
- 390 / 820 / 1024 / 1280 / 1366 幅で主要表示を確認
- プリセット適用、自動保存、テキスト追加、下書き保存、localStorage復元、PNG書き出しを確認
- 画像なし書き出しガード、破損localStorage復旧、不正GIF拒否を確認

### SNS Split Image Maker MVP

- `/tools/sns-split-image-maker` としてSNS分割画像メーカーMVPを実装した
- 確定モック（desktop / tablet-landscape / mobile）に合わせてレイアウトを追加した
  - `1280px~`: 左プレビュー + 右入力/合成/設定/出力パネル
  - `1024~1279px`: 左ナビ簡略表示 + 2ペイン
  - `~1023px`: mobile統合UI + 下部固定ナビ
- 初期MVPとして4分割を実装した
  - メイン画像読み込み
  - `1+8連結` / `1+4差し替え`
  - `splitX / splitY / seamFix / offsetX / offsetY / scale`
  - 境界線表示ON/OFF、グリッド表示ON/OFF
  - PNG/JPEG、連番命名 `{n}` / `{nn}`
  - 投稿順 `split_1` -> `split_4` の個別ダウンロード
- 追加画像込みの完成出力と、投稿時に見えるメイン分割プレビューを分けて整理した
- 左プレビューを `編集` / `全体` / `投稿時` のタブ構成にし、その後 `編集` / `全体` / `メイン分割` へ表記統一した
- 投稿別補正 `offsetX / offsetY / scale` を追加した
- PCマウス向けに、編集プレビュー中央帯のドラッグ移動で投稿別補正を更新できるようにした
- ドラッグ中の描画を `requestAnimationFrame` に寄せ、pointer up時に保存する形へ軽量化した
- `>=1024px` は左右ペインを独立スクロールにし、プレビューを見ながら右側設定を触れるようにした
- `<=1023px` は `プレビュー / 編集 / 保存` の下部固定ナビへ整理した
- 画像data URLをlocalStorageへ直接保存せず、localStorageは設定メタデータ、画像本体はIndexedDBへ保存/復元する形に変更した
- `QuotaExceededError` 時にクラッシュしないよう、自動保存/手動保存を例外処理で保護した
- 入力エリアへ画像比率、ブラウザ内完結、外部送信なしの説明を追加した
- 公開前レビューで、MVP公開を止める不具合なしと判断した
- セキュリティ確認として、PNG/JPEG MIME + 拡張子 + 12MB上限、復元時data URL種別制限、localStorageメタデータ化、IndexedDB保存、ファイル名サニタイズ、外部API未使用を確認した

#### SNS Split Image Maker MVP 検証

- `npm run lint` 成功
- `npx tsc --noEmit` 成功
- `npm run build` 成功
- `npm audit --omit=dev` 成功（prod依存0 vulnerabilities）
- `git diff --check` 成功（CRLF警告のみ）
- 390 / 820 / 1024 / 1280 幅で横スクロール破綻なしを確認
- broken JSON localStorage の安全初期化を確認
- IndexedDBへの画像保存とリロード後復元を確認
- 投稿順 `split_1.png` -> `split_4.png` のdownload発火を確認

### 個別ツールページのWorkspace Shell調整

- `PortalShell mode="workspace"` の個別ツールページでは、`1024px~` の共通ヘッダーを非表示にした
- `Home` / `Tools` は従来どおり `1024px~` のヘッダー右側にテーマ切り替えを維持した
- 個別ツールページの `1280px~` は左サイド下部に通常テーマ切り替え、`1024~1279px` はコンパクトトグルを表示した
- `~1023px` はモバイルヘッダー + メニュー内テーマ切り替えに留めた
- PC左サイド下部のテーマ切り替えから `表示テーマ` ラベルを削除し、`ログイン予定` パネルの下へ移動した
- `Schedule Calendar` の `1024px~` 上部ツールバー左側へ、カテゴリ補足と `Schedule Calendar` 表記を追加した
- `Thumbnail Editor` の表記を左サイドパネルに合わせて英語表記へ統一した
- Thumbnail Editor のPC / tablet-landscapeヘッダー右側アクションを `新規` / `下書き` / `出力` に短縮した
- `<=1023px` の Thumbnail Editor ではプリセット / キャンバスサイズ / 編集モード / 新規 / 下書き / 出力を固定ヘッダーから外し、メインスクロール先頭へ移した
- `<=1023px` の Thumbnail Editor に確認専用の全体プレビューを追加した

#### Workspace Shell 検証

- `npm run lint` 成功
- `npx tsc --noEmit` 成功
- `npm run build` 成功
- `git diff --check` 成功（CRLF警告のみ）
- 390 / 820 / 1024 / 1280 幅で、Home / Tools / Schedule Calendar / Thumbnail Editor / SNS Split Image Maker のヘッダーとテーマ切り替え位置を確認
- 個別ツールページ3種の console error / warn なしを確認

### SNS Split Image Maker 保守向け分割

- IndexedDB / localStorage / draft persistence / 画像ファイル読込バリデーションを `components/sns-split-image-maker/snsSplitDraftPersistence.ts` へ分離した
- 保存キー `v-streamer-tools:sns-split-image-maker:draft:v1`、IndexedDB名 `v-streamer-tools:sns-split-image-maker`、store名 `images` は維持した
- `SnsSplitImageMakerApp.tsx` は復元結果に応じたtoast表示とUI state管理に絞った
- UI section分割はprops過多になるため、この時点ではstorage分離までで止めた
- プレビュー初期表示を `全体` に変更し、`投稿1`〜`投稿4` の選択ボタンは `編集` タブ表示時だけ出すようにした

#### 保守向け分割 検証

- `npm run lint` 成功
- `npx tsc --noEmit` 成功
- `npm run build` 成功
- `git diff --check` 成功（CRLF警告のみ）
- browser-useで初期表示、タブ別ボタン表示、console error / warnなしを確認

### SNS Split Image Maker 2分割 / 3分割拡張

- 2分割 / 3分割拡張に向けて、PR分割方針を整理した
  - `codex/sns-preset-foundation`
  - `codex/sns-split-2`
  - `codex/sns-split-3`
  - `codex/sns-preview-labels`
- `/tools/sns-split-image-maker` をプリセット選択画面に変更した
  - 2分割 / 3分割 / 4分割カード
  - `前回の作業を開く`
  - `?preset=split-4` で既存4分割編集画面へ遷移
- draft metadataに `preset` を追加した
- 既存draftは `split-4` としてmigrationするようにした
- 保存キー、IndexedDB名、store名は維持した
- `?preset=split-2` / `?preset=split-3` / `?preset=split-4` のSSR / client初回render不一致を修正した

#### 2分割

- `split-2` を編集可能プリセットにした
- 2分割の完成出力を `24:9` x 2枚にした
- メイン画像を左右2分割し、中央 `8:9` に差し込む描画を追加した
- `3連結` / `5連結` を切り替えられるようにした
- `個別追加` / `フレーム追加` を切り替えられるようにした
- slot数を切り替えた
  - 3連結 + 個別追加: 4 slot
  - 5連結 + 個別追加: 8 slot
  - フレーム追加: 2 slot
- 全体プレビューを `24:9` 完成画像2枚の縦並びにした
- メイン分割プレビューを左右2枚の `8:9` 表示にした
- 出力順を `split_1` -> `split_2` にした

#### 3分割

- `split-3` を編集可能プリセットにした
- 3分割のメイン切り出しを固定した
  - 画像1: 左半分 `8:9`
  - 画像2: 右上 `8:4.5`
  - 画像3: 右下 `8:4.5`
- 完成出力を、画像1 `24:9`、画像2/3 `8:13.5` にした
- 出力順を `split_1` -> `split_2` -> `split_3` にした
- `個別追加` / `フレーム追加` を切り替えられるようにした
- 個別追加は6 slot、フレーム追加は3 slotにした
- 全体プレビューを上に画像1、下に画像2/3横並びのcanvas構成にした
- メイン分割プレビューを左大 + 右上下の構図にした
- `scripts/sns-split-image-maker-contract.mjs` を追加し、split-2 / split-3 / split-4 の分割座標、slot数、出力canvas比率、slot labelを検査できるようにした

#### 表記統一 / リリース前回帰

- 4分割の主表示を `個別追加` / `フレーム追加` に統一した
- 補足として `旧: 1+8` / `旧: 1+4` を残した
- プレビュータブを `編集` / `全体` / `メイン分割` に統一した
- 入口カード、プレビュー見出し、エクスポート説明で `split_1` からの出力順を明示した
- 入力エリアの説明文を、各分割の `個別追加` / `フレーム追加` と追加画像比率が分かる表現へ整理した
- 保存キー、IndexedDB名/store名、出力canvas仕様、出力順は変更していない
- UI section分割やprops構造の再編は行わず、表記と回帰契約の追加に留めた

#### 2分割 / 3分割拡張 検証

- `node scripts/sns-split-image-maker-contract.mjs` 成功
- `npm run lint` 成功
- `npx tsc --noEmit` 成功
- `npm run build` 成功
- `git diff --check` 成功（CRLF警告のみ）
- 入口画面、split-2 / split-3 / split-4 編集画面を確認
- 390 / 820 / 1024 / 1280 幅で横スクロール破綻なしを確認
- split-2 / split-3 / split-4 の出力順を確認
- broken JSON localStorage の安全初期化を確認
- preset未指定legacy draftが `split-4` へmigrationされ、IndexedDBのbase画像が復元されることを確認
- 最終回帰時点の残課題はなし

### Freeze 前の task.md Active ログ整理

2026-05-12 時点で、`task.md` の Active に残っていた完了済み P0〜P11 の詳細ログをこの履歴へ退避した。
以後の `task.md` は、現在の freeze 境界、次アクション、残タスク候補、未確認範囲だけを読む active-only board として扱う。

#### P0: task.md の運用整理

- 完了済みの長い実装ログを本文から外し、現在の前提、次順序、Active、各ツールの残タスクへ再構成した。
- Thumbnail Editor の次順序を `残設計 -> preset variants -> partial preset apply -> common material library -> font policy -> preset batch -> 他ツール仕上げ` に整理した。
- UI / code / contract / asset / preset 本体は変更していない。
- 検証: `git diff --check` 成功。UI 変更なしのため幅別確認は未実施。

#### P1: Thumbnail Editor 残設計の切り分け

- PR #74 merge 後の `origin/main` 起点で、Thumbnail Editor の大きい残作業を contract-first の PR 単位へ分割した。
- 順序は `preset variants -> partial preset apply -> common material library -> font policy -> preset batch -> quality guard expansion`。
- 各候補の目的、入れるもの、入れないもの、変更可 / 不可範囲を `docs/future/THUMBNAIL_EDITOR_NEXT_PR_SCOPE.md` に整理した。
- UI / code / contract / asset / preset 本体は変更していない。
- 検証: `git diff --check` 成功。

#### P1: Thumbnail Editor preset variants

- PR #75 merge 後の `origin/main` 起点で `thumbnailPresetVariants` と variant ref の contract を追加した。
- `landscape-16-9` / `portrait-9-16` / `square-1-1` は metadata として扱い、既存 preset は横長 16:9 を default variant とした。
- discovery / recent / favorite の互換を維持し、preset 本体、asset、schema、crop、handoff は変更していない。
- 検証: `thumbnail-preset-variants`、`thumbnail-preset-discovery`、`thumbnail-preset-apply-safety`、`thumbnail-layer-management`、`tool-handoff` contract、lint、typecheck、`git diff --check` 成功。

#### P2: Thumbnail Editor partial preset apply

- PR #76 merge 後の `origin/main` 起点で `applyThumbnailPresetPartial(draft, targetPresetId)` を追加した。
- edited draft では主要テキストと user-added image layer を保持し、target preset 初期 layer へ差し替える境界を固定した。
- pristine draft は target preset 初期 draft へそのまま切り替える。
- preset 本体、asset、schema、crop、material registration、Schedule Calendar / SNS Split 実装は変更していない。
- 検証: `thumbnail-preset-apply-safety`、`thumbnail-preset-variants`、`thumbnail-layer-management`、`thumbnail-standee-placement`、`tool-handoff` contract、lint、typecheck、`git diff --check` 成功。

#### P3: Thumbnail Editor common material library contract

- PR #77 merge 後の `origin/main` 起点で project-bound material と user-added material の storage boundary を固定した。
- user-added material は lightweight ref とし、画像本体は localStorage へ保存せず IndexedDB など画像向け storage を前提にした。
- delete / replace / load failure fallback と、partial preset apply で user material layer を保持する contract を追加した。
- asset、preset 本体、schema、crop、Schedule Calendar / SNS Split 実装は変更していない。
- 検証: `thumbnail-material-assets`、`thumbnail-preset-apply-safety`、`thumbnail-preset-variants`、`thumbnail-layer-management`、`tool-handoff` contract、lint、typecheck、`git diff --check` 成功。

#### P4: Thumbnail Editor font policy contract

- PR #78 merge 後の `origin/main` 起点で editor 全体の font policy と fallback helper を追加した。
- unknown / unsafe fontFamily は fallback へ寄せ、canvas rendering は fallback stack を通すようにした。
- 新規 font asset、外部 CDN 追加、preset 本体、schema、crop、material registration、Schedule Calendar / SNS Split 実装は変更していない。
- 検証: `thumbnail-font-policy`、`thumbnail-material-assets`、`thumbnail-preset-apply-safety`、`thumbnail-preset-variants`、`thumbnail-layer-management`、`tool-handoff` contract、lint、typecheck、`git diff --check` 成功。

#### P5: Thumbnail Editor preset batch readiness contract

- PR #79 merge 後の `origin/main` 起点で preset batch candidate metadata と readiness helper を追加した。
- 候補は `first_stream`、`anniversary_stream`、`endurance_stream`、`karaoke_stream`、`chat_stream`、`gameplay_stream`、`notice_stream`、`highlight_clip`。
- readiness は warning-only / checks-only とし、asset 生成、preset body 生成、font asset 追加、material 登録変更は行っていない。
- 検証: `thumbnail-preset-batch-readiness`、`thumbnail-font-policy`、`thumbnail-material-assets`、`thumbnail-preset-apply-safety`、`thumbnail-preset-variants`、`tool-handoff` contract、lint、typecheck、`git diff --check` 成功。

#### P6: Thumbnail Editor quality guard expansion

- PR #80 merge 後の `origin/main` 起点で selected layer / overall summary の warning / hint を最小拡張した。
- `サムネ品質` / `注意 n件` / `品質チェックOK` の表現を維持し、自動修正、AI生成、modal tutorial は入れていない。
- preset、material registration、asset、font、schema、crop 仕様は変更していない。
- 検証: `thumbnail-quality-guard`、`thumbnail-standee-placement`、`thumbnail-material-assets`、`thumbnail-preset-apply-safety`、`thumbnail-preset-variants`、`tool-handoff` contract、lint、typecheck、`git diff --check` 成功。

#### P7: Schedule Calendar freeze readiness audit

- PR #81 merge 後の `origin/main` 起点で、Schedule Calendar の freeze 前安定性、既存データ、localStorage migration、主要幅、入力導線を確認した。
- storage version `2`、旧形式 migration、壊れた JSON / import 失敗時の既存データ保持、`24:00` -> `23:59` 丸めを確認した。
- `docs/SCHEDULE_CALENDAR_STABILITY_CHECK_2026-04-28.md` に freeze readiness 結果を追記した。
- UI / storage schema / handoff schema の変更は行っていない。
- 検証: lint、typecheck、`git diff --check`、幅別確認 `390 / 820 / 1024 / 1280 / 1366px` 成功。

#### P8: SNS Split Image Maker freeze readiness audit

- PR #82 merge 後の `origin/main` 起点で、SNS Split Image Maker の freeze 前安定性、draft persistence / IndexedDB、handoff、主要幅、export 導線を確認した。
- 現行は `2分割 / 3分割 / 4分割`、個別 PNG / JPEG、メイン画像必須 guard、handoff 後の next action で固定した。
- ZIP 出力、X 以外の比率、複数形式 export、重い onboarding は freeze 後候補に留めた。
- 検証: `sns-split-image-maker`、`tool-handoff` contract、lint、typecheck、`git diff --check`、幅別確認 `390 / 820 / 1024 / 1280 / 1366px` 成功。

#### P9: Cross Tool handoff / storage / export policy freeze audit

- PR #83 merge 後の `origin/main` 起点で、Schedule -> Thumbnail、Schedule -> SNS、Thumbnail -> SNS の handoff / storage / export policy を確認した。
- URL query には短い `handoff` token のみを載せ、payload は sessionStorage、Thumbnail -> SNS の画像本体は SNS Split 側 IndexedDB の一時保存へ寄せた。
- `writeToolHandoff()` の sessionStorage 失敗時 fallback を contract 化し、docs の handoff / storage / data model 表現を同期した。
- UI / layout / storage schema の破壊的変更は行っていない。
- 検証: `tool-handoff`、`sns-split-image-maker`、`thumbnail-preset-apply-safety` contract、lint、typecheck、`git diff --check` 成功。

#### P10: SNS Split Image Maker core UX freeze boundary

- PR #84 merge 後の `origin/main` 起点で、SNS Split Image Maker の入口導線、export guard、handoff 成功後の次アクション、export boundary を固定した。
- `snsSplitFreezePolicy` を追加し、freeze 対象 preset、export format、メイン画像必須 guard、後送り export 拡張を contract から読めるようにした。
- ZIP 出力、X 以外の比率、複数形式 export は freeze 後候補に分けた。
- UI / layout / storage schema / export 機能本体は変更していない。
- 検証: `sns-split-image-maker`、`tool-handoff` contract、lint、typecheck、`git diff --check` 成功。

#### P11: Portal / Cross Tool entry freeze consistency

- PR #85 merge 後の `origin/main` 起点で、tool portal / cross-tool entry 導線が Schedule Calendar / Thumbnail Editor / SNS Split Image Maker の freeze 状態と矛盾しないか確認した。
- Portal / Tools entry を現在の公開中3ツールへ同期し、Thumbnail Editor / SNS Split Image Maker の説明を現行 freeze 境界へ寄せた。
- ZIP、X 以外の比率、複数形式 export、重い onboarding は現行機能のように表示していない。
- 各ツール本体、storage schema、public asset、font、外部 service / CDN は変更していない。
- 検証: `tool-portal-entry`、`sns-split-image-maker`、`tool-handoff` contract、lint、typecheck、`git diff --check`、幅別確認 `390 / 820 / 1024 / 1280 / 1366px` 成功。

#### P12: Portal entry freeze copy merge confirmation

- PR #86 `[codex] Align portal entry freeze copy` は 2026-05-12 に `main` / `origin/main` へ merge 済み。
- merge commit は `e2ef0896ffda466242aaa4c26ed76bae6a46811e`。
- この merge 後の `origin/main` 起点で、次の task cleanup / docs consistency worktree を作成した。

## 参照ドキュメント

- `docs/design-thumbnail-editor.md`
- `docs/design-sns-split-image-maker.md`
- `docs/design-sheet-sns-split-image-maker.md`
- `scripts/sns-split-image-maker-contract.mjs`
