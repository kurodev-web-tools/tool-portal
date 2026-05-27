# TASK HISTORY 2026-05

更新日: 2026-05-13
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

#### P13: Freeze docs task board cleanup

- PR #87 `[codex] Organize freeze docs task board` は `main` / `origin/main` へ merge 済み。
- merge commit は `f6f7d08`。
- `task.md` から完了済み詳細ログを外し、freeze 境界、次アクション、残タスク候補、未確認範囲を読む active-only board へ再整理した。
- UI / 表示文言 / tool 実装 / storage schema / export 機能本体は変更していない。
- 検証: `node scripts/sns-split-image-maker-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`node scripts/tool-portal-entry-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`git diff --check` 成功。

#### P14: Freeze final QA / docs consistency

- PR #88 `[codex] Freeze final QA docs consistency` は `main` / `origin/main` へ merge 済み。
- merge commit は `ba9cc45`。
- Schedule Calendar / Thumbnail Editor / SNS Split Image Maker の freeze 対象と freeze 後候補を、docs と portal entry の表現で再確認した。
- Schedule Calendar は予定管理、投稿補助、undo、handoff を freeze 対象として確認し、Google Calendar、ログイン、週間予定画像生成を freeze 後候補に閉じた。
- Thumbnail Editor は用途別プリセット、文字差し替え、立ち絵 / 画像差し替え、登録済み装飾素材の軽い追加、品質確認、PNG / JPEG 1枚 export を freeze 対象として確認した。
- SNS Split Image Maker はX向け `2分割 / 3分割 / 4分割`、メイン画像 guard、個別 PNG / JPEG export、Schedule / Thumbnail handoff の next action を freeze 対象として確認した。
- ZIP、X 以外比率、複数形式 export、重い onboarding は freeze 後候補として分離した。
- 幅別確認: 3ツールで `390 / 820 / 1024 / 1280 / 1366px` の `h1` 表示、横 overflow なし、console error なしを確認。
- 検証: `node scripts/sns-split-image-maker-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`node scripts/tool-portal-entry-contract.mjs`、`node scripts/thumbnail-material-assets-contract.mjs`、`node scripts/thumbnail-quality-guard-contract.mjs`、`node scripts/thumbnail-preset-batch-readiness-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`git diff --check` 成功。

#### P15: Thumbnail Editor user material library UI v1

- PR #89 `[codex] Add thumbnail user material library UI` は `main` / `origin/main` へ merge 済み。
- merge commit は `2901020`。
- 登録済み装飾素材パネルと user-added material 管理 UI を分離した。
- user material metadata は `localStorage` に `id` / `name` / `storageId` 等だけを保存し、画像本体は IndexedDB `images` store に保存する形へ分離した。
- user material layer は draft 上では fallback `src` と lightweight `materialRef` を保持し、canvas 表示 / export / Thumbnail -> SNS handoff 描画時だけ IndexedDB から blob URL を解決する。
- 削除時は既存 layer を削除せず、削除済み fallback 表示へ寄せる。置換時は layer geometry / crop を維持する。
- registered material library、preset body、public asset、font asset、variant body、crop 仕様、Schedule Calendar / SNS Split Image Maker 実装は変更していない。
- 幅別確認: `390 / 820 / 1024 / 1280 / 1366px` で横 overflow なし、canvas表示、登録済み素材 / ユーザー素材の分離表示、metadata / draft に uploaded PNG body が入らないことを確認。
- 既知事項: production static serve の `1024px+` では当時 `__next.*.txt` prefetch 404 が出ていたが、ページ表示、操作、localStorage / IndexedDB 境界には影響なしとして別PRへ分離した。
- 検証: `node scripts/thumbnail-material-assets-contract.mjs`、`node scripts/thumbnail-preset-apply-safety-contract.mjs`、`node scripts/thumbnail-quality-guard-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`npm run build`、`git diff --check` 成功。

#### P16: Thumbnail Editor user material library UI v1 QA / polish

- PR #90 `[codex] QA thumbnail user material library` は `main` / `origin/main` へ merge 済み。
- merge commit は `08f59cd`。
- user material UI v1 が保存 / 復元 / 削除 / 置換 / export / Thumbnail -> SNS handoff と矛盾していないか確認した。
- `scripts/thumbnail-material-assets-contract.mjs` に user material UI copy、fallback 表示、replace helper 利用の QA を追加した。
- `scripts/tool-handoff-contract.mjs` に Thumbnail -> SNS handoff payload / normalizer が user material metadata、`materialRef`、画像本体を混ぜない QA を追加した。
- 未解決プレビューは `要再追加`、canvas fallback は `MATERIAL MISSING` とし、削除 toast で配置済みレイヤーは残ることを明示した。
- 幅別確認: `390 / 820 / 1024 / 1280 / 1366px` で横 overflow なし、canvas nonblank、user material追加後に refs 1件 / user material layer 1件 / IndexedDB image 1件を確認。
- `1280px` では置換後も layer geometry を維持し、削除後も layer は削除済み fallback として残り、refs は空、IndexedDB image は 0件になることを確認した。
- `1366px` では Thumbnail -> SNS handoff が短い `handoff` token + `preset=split-4` のみを URL に載せ、payload に user material metadata / `materialRef` / uploaded PNG body を含めないことを確認した。
- production static serve の `1024px+` では `__next.*.txt` prefetch 404 が再現し、Next static export と `serve` の prefetch 配信方式由来として PR #91 へ分離した。
- 検証: `node scripts/thumbnail-material-assets-contract.mjs`、`node scripts/thumbnail-preset-apply-safety-contract.mjs`、`node scripts/thumbnail-quality-guard-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`npm run build` 成功。

#### P17: Static export RSC prefetch 404 investigation / alias fix

- PR #91 `[codex] Fix static export RSC aliases` は `main` / `origin/main` へ merge 済み。
- merge commit は `ceec8de`。
- production static serve 時に `1024px+` で出ていた Next static export の `__next.*.txt` prefetch 404 を、Thumbnail Editor 個別問題ではなく portal 全体の static export / hosting 配信方式として切り分けた。
- `npm run build` の static export 出力は `out/tools/thumbnail-editor/__next.tools/thumbnail-editor.txt` のような slash path を生成する一方、runtime prefetch は `/tools/thumbnail-editor/__next.tools.thumbnail-editor.txt` のような dotted path を要求していた。
- `/tools`、`/tools/schedule-calendar`、`/tools/thumbnail-editor`、`/tools/sns-split-image-maker` で同じ dotted path 要求が確認されたため、Next static export の出力 path と static hosting の exact file serving の不一致として扱った。
- `scripts/static-export-rsc-aliases.mjs` を追加し、`out/**/__next.*/*.txt` の slash path 出力から runtime が要求する dotted `.txt` alias を生成 / `--check` 検証できるようにした。
- `package.json` に `postbuild` を追加し、`npm run build` 後に static export RSC alias を自動生成する。
- アプリ側 `Link`、portal UI、Thumbnail Editor user material UI、Schedule Calendar、SNS Split Image Maker、schema、public asset、font、preset、variant body、crop 仕様は変更していない。
- 修正後の確認では、`390 / 820 / 1024 / 1280 / 1366px` の `/tools/thumbnail-editor` で `h1` 表示、横 overflow なし、console error なし、`1024px+` の dotted `.txt` prefetch は 200。
- `/tools`、`/tools/schedule-calendar`、`/tools/sns-split-image-maker` でも portal sidebar / card link prefetch の dotted `.txt` は 200。
- 検証: `npm run build` 成功、`postbuild` で `Static export RSC aliases ready: 8 checked, 8 written.` を確認。`node scripts/static-export-rsc-aliases.mjs --check`、`node scripts/tool-portal-entry-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`node scripts/thumbnail-material-assets-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`git diff --check` 成功。

#### P18: Freeze production final QA after static export RSC alias fix

- PR #92 `[codex] Freeze production final QA` は 2026-05-13 に `main` / `origin/main` へ merge 済み。
- merge commit は `05c4223de146976d5e84ff2b30e79e17854b261c`。
- PR #91 merge 後の `origin/main` 起点で、公開中3ツールの production static serve 前提の freeze 前 final QA を行った。
- Schedule Calendar -> Thumbnail / SNS Split handoff は、URL本文なし、`sessionStorage` token、テキスト metadata のみとして現行 freeze 範囲に読めることを確認した。
- Thumbnail Editor -> SNS Split handoff は、URLに短い `handoff` token と `preset=split-4` のみを載せ、画像本体はSNS Split側 IndexedDB、一時 payload は user material metadata / `materialRef` / 画像本体を混ぜない境界として contract / docs 上で崩れていないことを確認した。
- SNS Split Image Maker の export 導線は、X向け `2分割 / 3分割 / 4分割` の個別 PNG / JPEG 出力として読める。ZIP、X以外比率、複数形式の大規模 export は freeze 後候補に閉じている。
- docs / task.md 上で、現行 freeze 対象と freeze 後候補を混ぜる明確な drift は見つからなかったため、UI文言 / ツール機能実装修正は行っていない。
- `npm run build` により `next-env.d.ts` の route type reference が production build 側の `./.next/types/routes.d.ts` へ同期された。
- static export / production serve 結果:
  - `npm run build` 成功。`postbuild` で `Static export RSC aliases ready: 8 checked, 8 written.` を確認。
  - `node scripts/static-export-rsc-aliases.mjs --check` 成功。`Static export RSC aliases verified: 8` を確認。
  - `serve out` を `http://127.0.0.1:3017` で配信し、Chrome DevTools で production static serve を確認。
  - `1024px` の `/tools`、`/tools/schedule-calendar`、`/tools/thumbnail-editor`、`/tools/sns-split-image-maker` で dotted `__next.tools*.txt` は 200 / 304。PR #91 前に出ていた prefetch 404 は再発なし。
  - `1280px` / `1366px` でも `__next.*.txt` の 400+ response はなし。
- 幅別表示結果:
  - `390px`: `/tools` と3ツールで `h1` 表示、横 overflow なし、console error なし。
  - `820px`: `/tools` と3ツールで `h1` 表示、横 overflow なし、console error なし。
  - `1024px`: `/tools` と3ツールで `h1` 表示、横 overflow なし、console error なし。dotted RSC `.txt` は 200 / 304。
  - `1280px`: `/tools` と3ツールで `h1` 表示、横 overflow なし、console error なし。`__next.*.txt` 400+ なし。
  - `1366px`: `/tools` と3ツールで `h1` 表示、横 overflow なし、console error なし。`__next.*.txt` 400+ なし。
- 検証: `npm run build`、`node scripts/static-export-rsc-aliases.mjs --check`、`node scripts/tool-portal-entry-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`node scripts/thumbnail-material-assets-contract.mjs`、`node scripts/sns-split-image-maker-contract.mjs`、`npm run lint`、`npx tsc --noEmit` 成功。

#### P19: Freeze closeout task board cleanup

- PR #93 `[codex] Organize freeze closeout task board` は 2026-05-13 に `main` / `origin/main` へ merge 済み。
- merge commit は `84153e88ee38d195587d2820e5d808095ba7d86c`。
- PR #92 merge 後の `origin/main` 起点で、`task.md` を freeze closeout 後の active-only board へ整理した。
- Schedule Calendar / Thumbnail Editor / SNS Split Image Maker の freeze 済み範囲と、freeze 後候補を簡潔に読み直せる形にした。
- 次PR候補を `Thumbnail Editor user material library management v1`、`Schedule Calendar input length / copy guard`、`SNS Split Image Maker export boundary polish` に整理した。
- UI / 表示文言 / tool 実装 / storage schema / export 機能本体は変更していない。
- 検証: `node scripts/static-export-rsc-aliases.mjs --check`、`node scripts/tool-portal-entry-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`node scripts/thumbnail-material-assets-contract.mjs`、`node scripts/sns-split-image-maker-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`git diff --check` 成功。

#### P20: Thumbnail Editor user material library management v1

- PR #94 `[codex] Add thumbnail user material management guards` は 2026-05-13 に `main` / `origin/main` へ merge 済み。
- merge commit は `77ce20233fc56c665919273da8abddcc7a5f8630`。
- PR #93 merge 後の `origin/main` 起点で、既存 user material UI v1 の IndexedDB / lightweight ref 境界を保ったまま、容量上限、読み込み不能 fallback、再追加 / 整理導線を最小実装した。
- `thumbnailUserMaterialStoragePolicy` に `最大24件 / 1点8MB / 合計48MB` の軽い容量境界を追加し、使用量 summary / 追加可否 helper / byte 表示 helper を contract 化した。
- user material 追加時は既存 `ThumbnailUserMaterialRef` metadata から容量を判定し、画像本体は引き続き IndexedDB に保存、localStorage / draft / handoff payload へ混ぜない。
- IndexedDB から画像 URL を解決できない ref は `読み込み失敗` fallback へ寄せ、既存 layer geometry / crop / lightweight ref は維持する。
- ユーザー素材パネルには容量表示と「要再追加の素材は置換で復旧 / 不要なら削除」の短い整理導線だけを追加した。重い管理画面や modal tutorial は入れていない。
- public asset、font asset、preset body、variant body、crop 仕様、text / image layer schema、Schedule Calendar / SNS Split Image Maker 実装は変更していない。
- 幅別確認: `390 / 820px` は素材タブを開き、`1024 / 1280 / 1366px` は初期表示で、`h1` 表示、横 overflow なし、console error / warning なし、ユーザー素材の容量 copy / 再追加 guidance 表示を確認。
- 検証: `node scripts/thumbnail-material-assets-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`git diff --check` 成功。

#### P21: Task board cleanup after PR #94

- PR #95 `[codex] Clean up task board after PR94` は 2026-05-13 に `main` / `origin/main` へ merge 済み。
- merge commit は `4157cf8aa2da16abec201934c413e41b6d03f92e`。
- PR #94 merge 後の `task.md` を active-only board に戻し、次候補を `Schedule Calendar input length / copy guard` と `SNS Split Image Maker export boundary polish` に整理した。
- PR #93 / PR #94 の完了ログをこの履歴へ退避し、UI / 表示文言 / tool 実装 / storage schema / export 機能本体は変更していない。
- 検証: `node scripts/tool-portal-entry-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`node scripts/thumbnail-material-assets-contract.mjs`、`node scripts/sns-split-image-maker-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`npm run build`、`node scripts/static-export-rsc-aliases.mjs --check`、`git diff --check` 成功。

#### P22: Schedule Calendar input length / copy guard

- PR #96 `[codex] Add schedule calendar input copy guards` は 2026-05-13 に `main` / `origin/main` へ merge 済み。
- merge commit は `c4483c36fcb920a5e63c6e93b69c52dd5f0dafd0`。
- 予定タイトル / 告知文 / ハッシュタグ / テンプレート本文に小さな文字数境界を追加し、保存時、旧形式 normalizer、Schedule -> Thumbnail / SNS Split handoff payload で同じ境界に丸めるようにした。
- UI には counter と上限付近の warning copy だけを追加し、重い onboarding / modal tutorial は入れていない。
- `localStorage` key と version `2`、storage schema、Google Calendar 連携、ログイン / サーバー同期、週間予定画像生成は変更していない。
- 幅別確認: `390 / 820 / 1024 / 1280 / 1366px` で予定フォーム counters、layout signal、console error / warning なしを確認。`1366px` では設定内テンプレート本文 / タグ counters とタイトル上限 warning copy も確認。
- 検証: `node scripts/tool-handoff-contract.mjs`、`node scripts/schedule-calendar-storage-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`git diff --check` 成功。

#### P23: SNS Split Image Maker export boundary polish

- PR #97 `[codex] Polish SNS split export boundary` は 2026-05-13 に `main` / `origin/main` へ merge 済み。
- merge commit は `1d5e13cb9c3cbb7be73ff9ba1568d5712ceefe24`。
- SNS Split Image Maker の export policy を「1つの選択形式で個別 PNG / JPEG 保存」として明示し、split-2 / split-3 / split-4 の出力順 helper と main image export guard helper を contract から確認できるようにした。
- ZIP / 複数形式一括 export は現行機能に見せず、docs / UI copy / contract で後続候補に閉じた。
- Schedule Calendar / Thumbnail Editor の実装修正、storage schema、Next.js / React version は変更していない。
- 幅別確認: DevTools isolated context で `/tools/sns-split-image-maker?preset=split-4` を `390 / 820 / 1024 / 1280 / 1366px` で確認。export copy 表示、main画像未選択時の出力ボタン disabled、横 overflow なし、console error / warn なし。
- 検証: `node scripts/sns-split-image-maker-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`git diff --check` 成功。

#### P24: Thumbnail Editor quality guard export-preflight polish

- PR #99 `[codex] Polish thumbnail quality preflight` は 2026-05-13 に `main` / `origin/main` へ merge 済み。
- merge commit は `354d02bad0a0136f1ed43afd58f0e791e318a9fc`。
- 既存の `サムネ品質` / `注意 n件` / `品質チェックOK` の軽い表示を維持したまま、低透明度テキストの可読性 hint と、未解決 user material 画像の warning を selected layer / overall guard に追加した。
- export panel には `注意 n件` / `品質チェックOK` の短いラベルを残し、`書き出し前の確認` として最大2件の短文 summary だけを表示する形にした。
- quality guard は warning / hint のみで、自動修正、AI生成、modal tutorial、重い onboarding は追加していない。
- draft / preset / material registration / public asset / font / crop / text layer schema / image layer schema / storage schema は変更していない。
- Schedule Calendar / SNS Split Image Maker の実装修正、Next.js / React version 変更は行っていない。
- 幅別確認: Playwright + local dev server で `/tools/thumbnail-editor` を `390 / 820 / 1024 / 1280 / 1366px` で確認。`390 / 820px` は下部 `テキスト` tab で `サムネ品質`、下部 `書き出し` tab で `書き出し前の確認` / `品質チェックOK` / `そのまま書き出せます` を確認。`1024 / 1280 / 1366px` は右 panel 上で同表示を確認。全幅で canvas 表示、横 overflow なし、console error / warn なし。
- 検証: `node scripts/thumbnail-quality-guard-contract.mjs`、`node scripts/thumbnail-standee-placement-contract.mjs`、`node scripts/thumbnail-material-assets-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`git diff --check` 成功。

#### P25: Thumbnail Editor docs drift cleanup

- PR #101 `[codex] Clean up thumbnail docs drift` は 2026-05-13 に `main` / `origin/main` へ merge 済み。
- merge commit は `f9df381dc091d8d9369b900eead3bba9034978e4`。
- PR #94 / PR #99 後の `docs/design-thumbnail-editor.md` と `docs/future/THUMBNAIL_EDITOR_NEXT_PR_SCOPE.md` を同期した。
- user material library UI v1 / management v1 / quality guard export-preflight polish を完了済みとして整理した。
- UI / 表示文言 / tool 実装 / schema / asset / handoff 実装は変更していない。
- docs-only のため幅別ブラウザ確認は未実施。
- 検証: `node scripts/thumbnail-material-assets-contract.mjs`、`node scripts/thumbnail-quality-guard-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`git diff --check` 成功。

#### P26: SNS Split handoff accessibility copy polish

- PR #102 `[codex] Polish SNS handoff accessibility copy` は 2026-05-13 に `main` / `origin/main` へ merge 済み。
- merge commit は `bd9119aa0e4437e950b6c71ddeca5eaced192e7c`。
- Schedule / Thumbnail 由来の受け取り banner を source 別 copy、`role="status"` / `aria-live="polite"`、source 別 textarea label、具体的な次アクション文に整理した。
- handoff schema、storage、export、asset、他ツール実装は変更していない。
- 幅別確認: `390 / 820 / 1024 / 1280 / 1366px` で `/tools/sns-split-image-maker?preset=split-4` の Schedule handoff banner 表示、source 別 status、次アクション文、textarea label、横 overflow なし、console error / warning なしを確認した。
- 検証: `node scripts/sns-split-image-maker-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`git diff --check` 成功。

#### P27: Thumbnail Editor usecase preset implementation sequence

- PR #103 `[codex] Clean up task board after PR102` は `main` / `origin/main` へ merge 済み。merge commit は `1e4e4931fb5050d99e5a967a9817ffaf8dbd8402`。
- PR #104 `[codex] Clean up file name sanitize helpers` は `main` / `origin/main` へ merge 済み。merge commit は `9b6bc17a136cc948760fb3c96530649a4406f820`。
- PR #105 `[codex] Clamp thumbnail to SNS handoff payload` は `main` / `origin/main` へ merge 済み。merge commit は `edafcae28da0e90b3de852f917988774b497198d`。
- PR #106 `[codex] Add thumbnail variant body foundation` は `main` / `origin/main` へ merge 済み。merge commit は `50bab4419b2d8389428a5f5b6995f470a6e83113`。
- PR #107 `[codex] Add thumbnail variant UI route` は `main` / `origin/main` へ merge 済み。merge commit は `4d758f6062bfbd756b21fe640d95c81894e93bf9`。
- PR #108 `[codex] Plan thumbnail font candidates` は `main` / `origin/main` へ merge 済み。merge commit は `8c6a3f67611c82df164b91c339b814aa00625b69`。
- PR #109 `[codex] Add thumbnail font loading foundation` は `main` / `origin/main` へ merge 済み。merge commit は `6edca54f93144d691cfc4a1ebff927bd978ac9f8`。
- PR #110 `[codex] Add thumbnail Japanese font batch` は `main` / `origin/main` へ merge 済み。merge commit は `f168bddc75c660ad1f718efc32c33d8224b591d6`。
- PR #111 `[codex] Add thumbnail English font batch` は `main` / `origin/main` へ merge 済み。merge commit は `f30e3ee8f3a9358709789c91f43d1b39dfc72e0e`。
- PR #112 `[codex] Add thumbnail font UI categories` は `main` / `origin/main` へ merge 済み。merge commit は `cb4a179667520e42d3299a78a5848115fe58a9e6`。
- PR #113 `[codex] Add thumbnail font search and recents` は `main` / `origin/main` へ merge 済み。merge commit は `7879943e9d55841980d6a6d1e0d770ae66705aa9`。
- PR #114 `[codex] Apply thumbnail preset fonts` は `main` / `origin/main` へ merge 済み。merge commit は `615d714de37a8e0124e4b27ac855419041933433`。
- PR #115 `[codex] Plan thumbnail usecase preset mocks` は `main` / `origin/main` へ merge 済み。merge commit は `3d5e7dd24826dc95abbc46d511a844bb86c05800`。
- PR #116 `[codex] Add first stream thumbnail preset` は `main` / `origin/main` へ merge 済み。merge commit は `68bbcd48d71586b1891314f8bfd766abe19aa8bf`。
- PR #117 `[codex] Add anniversary stream thumbnail preset` は `main` / `origin/main` へ merge 済み。merge commit は `562163fe90546d4dee413947ffc0ec36a9068683`。
- PR #118 `[codex] Add endurance stream thumbnail preset` は `main` / `origin/main` へ merge 済み。merge commit は `1d051a7b24e40dadbd053a9d02878676d897b4e5`。
- PR #119 `[codex] Split endurance stream frame assets` は `main` / `origin/main` へ merge 済み。merge commit は `c9b2c28334b84db84ddab64ef940b7c962dffb0d`。
- PR #120 `[codex] Document next thumbnail preset prompt` は `main` / `origin/main` へ merge 済み。merge commit は `82a596815dc2f12615d21bfb236ed083226c61cc`。
- PR #121 `[codex] Add project stream thumbnail preset` は `main` / `origin/main` へ merge 済み。merge commit は `3d0c695ac0ac8b31e47d319521137660071e94e9`。
- PR #122 `[codex] Add cover song thumbnail preset` は `main` / `origin/main` へ merge 済み。merge commit は `22831fbdcc90b5da2cba1d363b9b29230dd86258`。
- PR #123 `[codex] Add event notice thumbnail preset` は `main` / `origin/main` へ merge 済み。merge commit は `f0e28573e3ecbb7cbd62dbfbad5db336434ea9aa`。
- `event_notice` では `event-notice-background-v1.png`、ticket/date badge、info band、map-line divider、key-visual frame、corner mark、専用 contract を追加した。
- `event_notice` の背景・装飾 asset は `[$imagegen](C:\Users\taka\.codex\skills\.system\imagegen\SKILL.md)` built-in mode を使用し、装飾は chroma-key 生成後に skill 付属 `remove_chroma_key.py` で alpha PNG 化した。
- `event_notice` の検証は `node scripts/thumbnail-usecase-event-notice-preset-contract.mjs`、`node scripts/thumbnail-preset-discovery-contract.mjs`、`node scripts/thumbnail-preset-batch-readiness-contract.mjs`、`node scripts/thumbnail-preset-variants-contract.mjs`、`node scripts/thumbnail-font-policy-contract.mjs`、`node scripts/thumbnail-material-assets-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`git diff --check`。
- 幅別確認は `390 / 820 / 1024 / 1280 / 1366px` で `/tools/thumbnail-editor` を確認し、各幅で `イベント告知` preset 選択状態、canvas 1件、console error 0。

#### P28: Thumbnail Editor next usecase preset planning

- PR #124 `[codex] Plan next thumbnail preset candidates` は 2026-05-15 時点で draft/open。
- branch / worktree は `codex/thumbnail-usecase-next-planning` / `.worktrees/thumbnail-usecase-next-planning`。
- second batch 後の次候補を `goods_notice` / `membership_stream` / `asmr_stream` / `relay_stream` / `collab_recruit_notice` の 5件に整理した。
- 推奨順は `goods_notice` -> `membership_stream` -> `asmr_stream` -> `relay_stream` -> `collab_recruit_notice`。
- planning 詳細は `docs/future/THUMBNAIL_EDITOR_USECASE_PRESET_CANDIDATES.md`、mock split は `docs/mockups/thumbnail-editor-usecase-preset-candidates/README.md` に残した。
- 今回は新規 mock / production asset / preset body は追加していない。候補ごとに必要になった時点で `[$imagegen](C:\Users\taka\.codex\skills\.system\imagegen\SKILL.md)` built-in mode を使う。
- 検証: `git diff --check`、docs の候補表と follow-up split の一致確認。

#### P29: Public launch closeout and EN support preparation

- 2026-05-16 から 2026-05-18 にかけて、公開前 visual review、3 tools public pre-release adjustment、final smoke / release checklist / security check、公開後の任意 smoke、feedback links、favicon、public product name update、Thumbnail Editor placement / font readiness / built-in asset notice を完了した。
- 公開前 blocker は解消済み。公開後 smoke と公開確認も完了済みのため、EN 対応開始時点では `task.md` に deployed URL smoke、SNS Split 本番 download、X 投稿直前 preview、実投稿確認を active risk として残さない。
- 公開名は `Kuro Stream Kit`。feedback contact は `feedback@kuro-lab.com`、X `https://x.com/kurodev_v`、Discord `https://discord.gg/35rjbPfxz5` を公開向け受付導線として扱う。
- Public prelaunch visual review Task 1-4 の主要な修正は、portal public copy / status polish、Thumbnail Editor responsive control polish、SNS Split preview / landing copy polish、Schedule Calendar pointer behavior / month preview guard。
- Final smoke / security check では Next.js `16.2.6` へ patch 更新し、`npm audit --omit=dev` は `found 0 vulnerabilities`。`npm run build` / lint / typecheck / contract 群 / width checks は通過済み。
- EN 対応前の運用整理として `codex/en-support-preview` を `origin/main` 起点で作成し、B scope の EN 対応 PR を同 branch 宛てに積む方針にした。B 完了後に main へ持っていくか判断し、C scope は main 起点の小分け PR とする。
- `task.md` は EN 対応の active board と backlog / verification baseline に圧縮し、完了済みの長いログはこの archive entry と各 PR 本文 / merge history を参照する。

#### P30: Thumbnail Editor IRIAM square preview branch through final confirmation

- 2026-05-25 から 2026-05-26 にかけて、`codex/thumbnail-iriam-square-preview` を統合 base とする IRIAM 1:1 preview branch の主要 slice を完了した。
- PR #200 - #213 で `歌枠` / `闇ガチャ` / `雑談` / `初配信` / `耐久` の 5 preset body、square settings modal、background colorway swap、title transparent image swap、EN title asset / locale-aware selection、EN placement adjustment、final confirmation を preview branch に統合した。
- small project-bound material として `accent` / `label-base` batch を追加し、登録済み素材が 16:9 / IRIAM 1:1 の両方へ通常 image layer として追加できる cross-aspect boundary を contract 化した。
- final confirmation では PR #212 merge 後の preview branch を確認し、`first_stream` EN square draft の title layer label だけを `Image 2 (First Stream title)` に最小修正した。PR #213 は 2026-05-26 に `codex/thumbnail-iriam-square-preview` へ merge 済み。
- Browser confirmation では EN / JA で 5 preset の settings modal preview、background color、title color、modal create flow、title layer label を確認した。`820 / 1024 / 1280 / 1366px` では page-level horizontal overflow なし。`390px` は Chrome DevTools MCP の window clamp により exact check 未実施で、500px mobile-like check まで。
- 旧 `task.md` に残っていた長い implementation update 群はこの archive entry と各 PR body に寄せ、active board は registered material library expansion / main merge preparation / font follow-up へ圧縮した。
- 次の active direction は registered material library expansion。Batch A は既存 preset decoration の登録、Batch B は dark / horror / smoke material、Batch C は neutral prop material とする。素材数に固定上限は置かないが、PR は Batch / category / source type ごとに分ける。

#### P31: Thumbnail Editor IRIAM material expansion and main integration

- PR #214 `[codex] Plan IRIAM registered material expansion` は 2026-05-26 に `codex/thumbnail-iriam-square-preview` へ merge 済み。
- PR #215 `[codex] Add existing decoration materials batch`、PR #216 `[codex] Add dark thumbnail materials`、PR #217 `[codex] Add neutral thumbnail materials` は 2026-05-26 に `codex/thumbnail-iriam-square-preview` へ merge 済み。
- registered material library は Batch A 既存 decoration 19件、Batch B dark / smoke 5件、Batch C neutral props 7件を追加し、合計 80件の project-bound material として整理した。
- Batch A は既存 preset decoration asset を登録し、Batch B / C は generated raster asset を `public/assets/images/thumbnail-editor/materials/dark/` と `public/assets/images/thumbnail-editor/materials/neutral/` に追加した。
- `thumbnail-material-assets-contract` は 16:9 / 1:1 の両方で通常 image layer として追加できること、user material metadata を混ぜないこと、生成素材の alpha padding / chroma-key cleanup を確認する形に更新した。
- PR #218 `[codex] Confirm IRIAM square preview after materials` で material expansion 後の final confirmation を実施し、registered material count / category counts / search / add flow / square preset modal / background swap / title swap / width check を確認した。
- PR #219 `[codex] Scope thumbnail canvas size menu by output ratio` で、`square-1-1` 選択中は canvas size menu を `1080 x 1080 (1:1)` のみに絞り、16:9 sizes が square output で表示されないようにした。
- PR #220 `[codex] Merge Thumbnail Editor IRIAM square preview` は 2026-05-27 に `main` へ merge 済み。merge commit は `41c1284`。
- 検証は各 PR で `node scripts/thumbnail-material-assets-contract.mjs`、`node scripts/thumbnail-preset-text-locale-contract.mjs`、`node scripts/thumbnail-preset-apply-safety-contract.mjs`、`node scripts/thumbnail-preset-variants-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、IRIAM square preset / swap / title boundary contracts、`npm run lint`、`npx tsc --noEmit`、`git diff --check` を必要範囲で実施した。
- 旧 `task.md` に残っていた material Batch A-C と IRIAM main merge preparation の長いログは、この archive entry と各 PR body に寄せた。`task.md` には active priority と参照だけを残す。

#### P32: Thumbnail Editor font expansion through Standard Batch B and main integration

- PR #221 `[codex] Prepare thumbnail font expansion check` は 2026-05-27 に `main` へ merge 済み。以後の font expansion は `codex/thumbnail-font-expansion-check` を確認用 branch として進めた。
- PR #222 `[codex] Add IRIAM title font parity batch` は `codex/thumbnail-font-expansion-check` へ merge 済み。IRIAM title image で使ったが editable text catalog に無かった `Lilita One`、`Pirata One`、`Lobster` を self-hosted Google Fonts / SIL Open Font License 1.1 として追加した。
- PR #223 `[codex] Plan thumbnail font standard batch B` は `codex/thumbnail-font-expansion-check` へ merge 済み。Standard Batch B Candidate Plan を `docs/future/THUMBNAIL_EDITOR_FONT_CANDIDATES.md` に整理し、Batch B-JA 11 families と Batch B-EN 12 families に分割する方針を固定した。
- PR #224 `[codex] Add thumbnail font standard batch B-JA` は `codex/thumbnail-font-expansion-check` へ merge 済み。`Zen Maru Gothic`、`Tsukimi Rounded`、`Shippori Antique`、`Shippori Mincho`、`Kaisei Decol`、`Kaisei Tokumin`、`Zen Kurenaido`、`Reggae One`、`Rampart One`、`Darumadrop One`、`Train One` を追加した。
- PR #225 `[codex] Add thumbnail font standard batch B-EN` は `codex/thumbnail-font-expansion-check` へ merge 済み。`Cinzel`、`Abril Fatface`、`Unbounded`、`Black Ops One`、`Monoton`、`Bungee`、`Bungee Shade`、`Rye`、`Creepster`、`VT323`、`Caveat`、`Righteous` を追加した。
- Final catalog は 54 families total、Japanese 27 / English 27。runtime Google Fonts CDN 依存は追加せず、route-scoped CSS と `public/fonts/thumbnail-editor/` の self-hosted `.woff2` asset、`public/fonts/thumbnail-editor/LICENSES.md`、`thumbnailFontManifest`、`scripts/thumbnail-font-policy-contract.mjs` を同期した。
- confirmation branch final check では PR #225 merge 後の `codex/thumbnail-font-expansion-check` で `node scripts/thumbnail-font-policy-contract.mjs`、`node scripts/thumbnail-preset-text-locale-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`git diff --check`、`npm run build` を実行した。
- `/tools/thumbnail-editor` の font listbox は `390 / 820 / 1024 / 1280 / 1366px` で Batch B-JA 11 と Batch B-EN 12 families が表示されること、横 overflow と console error がないことを確認した。
- PR #226 `[codex] Integrate thumbnail font expansion` は 2026-05-27 に `main` へ merge 済み。merge commit は `fdd2fe3`。
- 旧 `task.md` に残っていた font expansion check / IRIAM title parity / Standard Batch B planning / Batch B-JA / Batch B-EN / final integration の長いログは、この archive entry と各 PR body に寄せた。完了済み prompt と backlog 項目は `task.md` から削除した。

## 参照ドキュメント

- `docs/design-thumbnail-editor.md`
- `docs/design-sns-split-image-maker.md`
- `docs/design-sheet-sns-split-image-maker.md`
- `scripts/sns-split-image-maker-contract.mjs`
