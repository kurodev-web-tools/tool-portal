# task.md

## 現在の前提

- このリポジトリは `V Streamer Tools` のMVPを段階実装する
- 現在のMVP到達点は `Portal + Tools Index + Schedule Calendar + Thumbnail Editor + SNS Split Image Maker`
- 公開前提は `Cloudflare Pages`
- 当面は認証、サーバー保存、SNS API直接投稿、AI API依存、課金ロックを入れない
- 直近はMVPツールを増やすより、既存3ツールを実務導線として仕上げる

2026-05-03 handoff 実装メモ:

- Schedule Calendar -> Thumbnail Editor / SNS分割画像メーカーの最小 handoff payload を `lib/tool-handoff.ts` に追加した
- 方式は URL query に短い `handoff` token を載せ、本文は同一タブの `sessionStorage` 一時 payload として渡す
- payload v1 は予定ID、タイトル、日付、開始/終了時刻、カテゴリ、プラットフォーム、告知文、ハッシュタグ、告知ステータスだけを持つ
- 画像本体、認証、サーバー保存、SNS API投稿、AI API依存、課金ロックは入れていない
- Thumbnail Editor は `stream_announce` プリセットの見出し / 時刻 / サブテキストへ初期反映する
- Schedule Calendar から遷移した Thumbnail Editor では、プリセット変更 / キャンバスサイズ変更後も同じ予定テキストを再適用する
- SNS分割画像メーカーは `preset=split-4` の編集画面を開き、告知文メモ表示とファイル名初期値へ反映する
- payload なし、token 不一致、期限切れ、壊れた payload、対象ツール不一致は無視して通常起動する
- 検証: `npm run lint` PASS、`npx tsc --noEmit` PASS、`git diff --check` PASS、`npm run build` PASS
- Browser確認:
  - `out/` を `py -m http.server 3012` で配信し、`1359x927` の in-app browser で確認
  - Schedule CalendarからThumbnail Editorへ遷移し、URL `handoff` token とサムネ初期テキスト反映を確認
  - Thumbnail EditorでCalendar由来の遷移後にプリセットを変更しても、予定タイトルが引き継がれることを確認
  - Schedule CalendarからSNS分割画像メーカーへ遷移し、`preset=split-4`、告知文メモ、ファイル名初期値反映を確認
  - handoff token不一致のThumbnail Editor / SNS分割画像メーカーは通常起動し、console error / warnなし
- 未実施: in-app browser側で viewport サイズ変更APIが使えないため、390 / 820 / 1024 / 1280 / 1366 の実画面幅別確認は未実施。既存レスポンシブ境界 class は変更していない

## 履歴参照

- 2026-04までの完了済みタスクは `docs/archive/TASK_HISTORY_2026-04.md` を参照する
- 2026-05の完了済みタスクは `docs/archive/TASK_HISTORY_2026-05.md` を参照する
- Schedule Calendar のMVP後タスクは `docs/future/SCHEDULE_CALENDAR_FUTURE_TASKS.md` を参照する

## 現在のアクティブタスク

### ポータル最適化の残確認

- [ ] 幅別回帰確認を必要に応じて再実施する
  - 対象幅: 390 / 820 / 1024 / 1280 / 1366
  - 対象ページ: `/` / `/tools`
  - 観点: HOME/TOOLS間遷移、実装済み3ツール導線、テーマ切替、フィルタ操作性、カード可読性

### 既存3ツールの仕上げロードマップ（優先）

- [ ] 仕上げ順を固定する
  - MVPツールを増やす前に、既存3ツールを `配信予定 -> 告知画像 -> SNS投稿用分割` の実務導線として仕上げる
  - 追加機能より、作例、説明、入力補助、連携、回帰確認を優先する
  - 認証、サーバー保存、SNS API直接投稿、AI API依存はこの仕上げフェーズでは入れない

#### 1. Schedule Calendar を告知制作の起点として仕上げる

2026-05-03 実装メモ:

- 投稿補助テンプレートを `本文 / 説明 / 用途カテゴリ / 既定プラットフォーム / ハッシュタグ` で保存できるようにした
- 保存済みハッシュタグセットを設定で追加 / 編集 / 削除し、投稿補助プレビューで選択追加できるようにした
- 予定管理の告知ハッシュタグ欄を告知ステータスの下へ移し、保存済みハッシュタグセットを独自メニュー + 追加ボタンで追記できるようにした
- Schedule Calendar内の全ドロップダウンを独自メニューUIに寄せた
- テンプレート本文へ `{title}` などをカーソル位置へ挿入する変数ボタンを追加した
- 予定ごとに `告知文メモ / 告知ハッシュタグ / 準備メモ / 告知ステータス` を保存できるようにした
- 投稿文プレビューは実データへ置換し、コピー時にテンプレート側と予定側のハッシュタグを本文へ結合する
- サムネ作成 / SNS分割画像作成は disabled 導線までに留め、実連携 payload は次PR候補に残す
- 検証: `npm run lint` PASS、`npx tsc --noEmit` PASS、`git diff --check` PASS、`npm run build` PASS
- Browser/Chrome DevTools確認:
  - 390 / 820: Mobile統合UIを維持
  - 1024: Tablet 2ペイン + 4タブを維持
  - 1280 / 1366: PC 2ペインを維持
  - 投稿補助テンプレート作成 / 編集、変数挿入、投稿文プレビュー、ハッシュタグ結合コピー、backup/restore、broken JSON保護を確認
  - 保存済みハッシュタグセットの作成 / 編集、投稿補助での選択追加、preview反映、backup payload反映、restore後の保持、broken JSON import保護を `localhost:3000` の別originで確認
  - 予定管理の告知ハッシュタグ欄で保存済みセットを追加し、重複排除されることを確認
  - 予定フォーム内の独自メニュー表示、告知ハッシュタグのステータス下配置、PC幅での追加ボタン動作を確認
  - 予定管理 / 投稿補助 / 予定一覧 / 設定 / テンプレート編集のドロップダウンを独自メニューで確認。DOM snapshot上の `combobox` は0件
  - クリーンロード後の console error / warn なし
  - favicon追加後の新規ページで console error / warn なし
  - 追加確認時は dev server を再起動して最新bundleで確認。再起動後の Next dev log に runtime error なし
  - テンプレート削除検証は、テスト用 localStorage データ削除の確認待ち
  - 保存済みハッシュタグセット削除検証は、localStorageデータ削除実行になるため未実施

- [ ] 単体安定化の最終確認を行う
  - 対象幅: 390 / 820 / 1024 / 1280 / 1366
  - 観点: 予定追加、編集、削除Undo、繰り返し、検索/フィルタ、詳細表示、backup/restore、broken JSON保護
  - `localStorage保存・外部送信なし` の安心感をUIまたはガイドに明示する
- [x] 告知準備フィールドを整理する
  - 予定タイトル、配信日時、カテゴリ、プラットフォーム、メモ、告知文、ハッシュタグを1予定内で扱えるようにする
  - 投稿文はAI生成ではなく、テンプレート差し込み式を基本にする
- [x] 告知文テンプレートを実用化する
  - X投稿文コピー
  - YouTube概要欄メモ
  - ハッシュタグセット
  - 配信タイトル候補メモは次PR候補
- [x] 投稿補助テンプレートを利用者が追加/編集できるようにする
  - 利用者ごとに投稿補助テンプレートを新規作成できるようにする
  - テンプレート単位で本文、ハッシュタグ、用途カテゴリ、既定プラットフォームを保存できるようにする
  - ハッシュタグは本文とは別フィールドで管理し、コピー時に本文へ結合できるようにする
- [x] よく使うハッシュタグを保存 / 選択できるようにする
  - 設定で複数のハッシュタグセットを登録保存できるようにする
  - 投稿補助で保存済みセットを選択し、テンプレート側 / 予定側タグと重複排除してプレビューへ反映する
  - 予定管理の告知ハッシュタグ欄へ保存済みセットを独自メニューから選び、重複排除して追記保存できるようにする
  - 予定一覧、設定、投稿補助、テンプレート編集のドロップダウンも独自メニューUIで統一する
  - localStorage import/export/backup restore の payload へ `hashtagSets` を含める
- [x] 投稿補助本文の変数挿入UIを追加する
  - `{title}` などを手入力させるだけでなく、ボタン操作で本文へ挿入できるようにする
  - 変数候補: タイトル、日付、開始時刻、終了時刻、曜日、カテゴリ、プラットフォーム、ハッシュタグ
  - 変数のプレビュー結果を表示し、投稿前に実際の文面を確認できるようにする
- [x] 次アクション導線を追加する
  - `この予定のサムネを作る`
  - `SNS分割画像を作る`
  - `告知文をコピー`
  - サムネ / SNS分割は disabled の準備中導線。実遷移と payload は次PR候補
- [x] 予定ステータスを設計する
  - 候補: `未着手` / `準備中` / `投稿文準備済み` / `告知画像作成済み` / `告知済み` / `配信済み`
  - materials設計書の `isCompleted` 相当を、告知制作フローに合う状態管理へ置き換える
  - ステータスはカレンダー表示を重くしすぎず、予定詳細/一覧/フィルタで使えるようにする
- [ ] カテゴリ / プラットフォームのユーザー編集を設計する
  - materials仕様ではカテゴリ / プラットフォームはユーザーが追加・編集・削除可能
  - サーバー保存前はlocalStorage設定として持つ
  - 固定プリセットとの互換、削除済みカテゴリを既存予定が参照している場合の扱いを決める
- [ ] フォーム入力上限と文字数表示をUIへ反映する
  - タイトル、メモ、投稿補助テンプレート名/説明/本文に文字数表示と上限警告を追加する
  - materials仕様のタイトル50文字 / 備考200文字は、現行実装に合わせて採用/変更を決める
  - import保護だけでなく、通常入力時にも破綻しにくい制約を見せる
- [ ] 週間スケジュール画像出力の扱いを決める
  - materials仕様では「週間スケジュール画像を生成・共有」がコア寄りに書かれている
  - Schedule Calendar内に画像出力を持たせるか、Thumbnail Editorへ今週の予定を渡して生成するかを決める
  - まずは `今週の予定をThumbnail Editorへ渡す` 方針を第一候補にする

#### 2. Thumbnail Editor をプリセット完成型へ寄せる

2026-05-04 最小実装メモ:

- 既存4プリセットに加えて、`ゲーム実況` / `コラボ` / `お知らせ` / `週間予定` / `X告知画像` の5プリセットを追加した
- プリセット一覧カードに `カテゴリ` と `用途ラベル` を表示し、9種へ増えても用途を見分けやすい状態にした
- Schedule Calendar からの handoff は、受け取った予定タイトル、日時、告知文、カテゴリ / プラットフォームを `見出し` / `時刻` / `サブ` / `ラベル` のテキストレイヤーへ反映するようにした
- Schedule Calendar 由来の遷移では、プリセット変更 / キャンバスサイズ変更後も同じ予定テキストを再適用する
- 今回は認証、サーバー保存、SNS API投稿、AI API依存、課金ロック、画像本体のツール間受け渡しは追加していない
- 次PR候補: 手動編集済みテキストとのマージ、プリセット検索 / 絞り込み、最近使ったプリセット、お気に入り、立ち絵配置プリセット、Thumbnail Editor -> SNS分割画像メーカーの画像 handoff

2026-05-05 PR前確認メモ:

- `配信告知` / `歌枠` / `雑談` / `切り抜き` に不足していた `時刻` / `ラベル` レイヤーを補い、handoff後の初期反映とプリセット変更後の予定テキスト維持を確認した
- 検証: `npm run lint` PASS、`npx tsc --noEmit` PASS、`git diff --check` PASS、`npm run build` PASS
- Browser確認:
  - `localhost:3000` の process command が `D:\V_streamer_tools\.worktrees\thumbnail-editor-presets-handoff\node_modules\next\dist\server\lib\start-server.js` を指していることを確認
  - 通常起動、handoffなしのプリセット変更、Schedule Calendar handoff後のタイトル / 日時 / 告知文 / カテゴリ・プラットフォームラベル反映を確認
  - handoff後に `歌枠` へプリセット変更しても予定テキストが維持されることを確認
  - 壊れた handoff token は通常初期値で起動することを確認
  - 390 / 820 / 1024 / 1280 / 1366px でプリセットカード9種、編集キャンバス1件、ページ全体の水平overflowなしを確認
  - console error / warn なし

2026-05-05 Thumbnail Editor -> SNS分割画像メーカー handoff 実装メモ:

- Thumbnail Editor に `SNS分割` / `SNS分割画像で使う` 導線を追加した
- 表示中キャンバスをPNG相当で描画し、画像本体は `localStorage` ではなくSNS分割画像メーカー側のIndexedDB画像保存領域へ一時キーで保存する
- URL query には短い `handoff` token と `preset=split-4` のみを載せる
- handoff payload は `source: "thumbnail-editor"`、`target: "sns-split-image-maker"`、一時画像キー、タイトル、日付、カテゴリ、プラットフォーム、告知文、ハッシュタグ、ファイル名候補を持つ
- SNS分割画像メーカーは token と一時画像を正しく読めた場合だけ、画像を `base` 画像として反映し、`split-4` 編集画面で開く
- token 不一致、期限切れ、壊れた payload、対象ツール不一致、画像取得失敗は通常起動にフォールバックする
- 既存の Schedule Calendar -> Thumbnail Editor / SNS分割画像メーカー handoff payload は維持する
- 既存 Thumbnail Editor の通常draft / autosave と、SNS分割画像メーカーのIndexedDB画像保存 / draft復元は既存経路を維持する
- 検証: `node scripts/tool-handoff-contract.mjs` PASS、`node scripts/sns-split-image-maker-contract.mjs` PASS、`npm run lint` PASS、`npx tsc --noEmit` PASS、`git diff --check` PASS、`npm run build` PASS
- Browser/CDP確認:
  - dev server は `D:\V_streamer_tools\.worktrees\thumbnail-to-sns-handoff\node_modules\next\dist\server\lib\start-server.js` から起動していることを確認
  - 390 / 820 / 1024 / 1280 / 1366px で Thumbnail Editor / SNS分割画像メーカーの通常起動、主要導線表示、水平overflowなしを確認
  - Thumbnail Editor -> SNS分割画像メーカー handoff 後、`Thumbnail Editorから受け取り`、base画像選択済み、`split-4` 出力順、保存ボタン有効を確認
  - 壊れた handoff token は受け取りバナーなしで通常起動することを確認
  - Schedule Calendar -> Thumbnail Editor handoff は token 消費と autosave draft 内の予定タイトル / 告知文反映で確認
  - Schedule Calendar -> SNS分割画像メーカー handoff は受け取りバナー、予定タイトル、`split-4` 出力順で確認
  - 一時Chromeプロファイルで console error / warn なし
  - `npm run build` は PASS。worktree が親repo内にあるため Next.js の workspace root 推定 warning は表示された

2026-05-05 プリセット探索性改善メモ:

- プリセット一覧へ検索、カテゴリ絞り込み、用途ラベル絞り込みを追加した
- 検索対象はプリセット名、カテゴリ、用途ラベル、説明に限定した
- 最近使ったプリセットとお気に入りは `preset id` の配列だけを `localStorage` の `v-streamer-tools:thumbnail-editor:preset-discovery:v1` へ保存する
- 画像本体、Thumbnail Editor draft/autosave、Schedule Calendar handoff、Thumbnail Editor -> SNS分割画像メーカー handoff、SNS Split Image Maker の分割ロジックは変更しない
- 手動編集済みテキストと handoff テキストの高度なマージ、立ち絵配置プリセット、プリセットの部分適用は後続候補のまま残す
- 検証: `node scripts/thumbnail-preset-discovery-contract.mjs` PASS、`node scripts/tool-handoff-contract.mjs` PASS、`node scripts/sns-split-image-maker-contract.mjs` PASS、`npm run lint` PASS、`npx tsc --noEmit` PASS、`git diff --check` PASS、`npm run build` PASS
- Browser確認:
  - `localhost:3000` は既存の `D:\V_streamer_tools\.worktrees\thumbnail-to-sns-handoff` dev server が使用中だったため、対象 worktree は `localhost:3001` で確認した
  - 通常起動、プリセット検索、カテゴリ / 用途ラベル絞り込み、最近使ったプリセット表示、お気に入り追加 / 解除 / reload後の復元を確認
  - プリセット適用後の draft/autosave は、`歌枠` 適用後の reload で前回下書き復元を確認
  - Thumbnail Editor -> SNS分割画像メーカー handoff は、`Thumbnail Editorから受け取り`、`split_1`、保存導線表示で確認
  - Schedule Calendar -> Thumbnail Editor handoff は既存 contract と受け取り経路を維持。今回変更は preset discovery state に限定し、Schedule Calendar 側 payload / Thumbnail handoff 適用関数は未変更
  - 390 / 820 / 1024 / 1280 / 1366px の幅別スクリーンショットで通常起動とプリセット一覧表示を確認
  - browser console error / warn なし
  - `npm run build` は PASS。worktree が親repo内にあるため Next.js の workspace root 推定 warning は表示された

2026-05-05 プリセット適用安全改善メモ:

- プリセット適用前に確認UIを挟み、上書き対象になる `見出し` / `時刻` / `サブ` / `ラベル` の現在値と新プリセット初期値を表示するようにした
- 新規作成直後など、現在draftが現在プリセットの初期状態と同等の場合は確認UIを出さずに即時適用する
- handoffなしの通常編集では `プリセットをそのまま適用` と `主要テキストを引き継いで適用` を選べるようにした
- 主要テキスト引き継ぎは、レイヤー名に `見出し` / `時刻` / `サブ` / `ラベル` を含むテキストレイヤーだけを対象にする
- Schedule Calendar handoff中は、確認UI上でも予定テキスト優先を明示し、既存どおり予定テキストを新プリセットへ再適用する
- 画像レイヤー、図形レイヤー、自由追加レイヤーの高度なマージ、画像本体の保存方式、Schedule Calendar handoff payload、Thumbnail -> SNS handoff、SNS Split Image Maker の分割ロジックは変更していない
- 最近使った / お気に入りの `localStorage` 保存は引き続き preset id のみ
- 検証: `node scripts/thumbnail-preset-apply-safety-contract.mjs` PASS、`node scripts/thumbnail-preset-discovery-contract.mjs` PASS、`node scripts/tool-handoff-contract.mjs` PASS、`node scripts/sns-split-image-maker-contract.mjs` PASS、`npm run lint` PASS、`npx tsc --noEmit` PASS、`git diff --check` PASS、`npm run build` PASS
- Browser確認:
  - `localhost:3000` は別 worktree の dev server だったため、対象 worktree は `localhost:3001` で確認した
  - 通常起動、handoffなしの `プリセットをそのまま適用`、handoffなしの `主要テキストを引き継いで適用`、キャンセル時に draft が変わらないことを確認
  - 新規作成直後の未編集draftでは、プリセット変更時に確認UIを出さず即時適用されることを確認
  - テキスト編集後のdraftでは、プリセット変更時に確認UIが表示されることを確認
  - Schedule Calendar -> Thumbnail Editor handoff 後、プリセット変更確認UIで予定テキスト優先が表示され、適用後も予定タイトルが維持されることを確認
  - プリセット検索、最近使ったプリセット表示、お気に入り追加 / reload後の復元を確認
  - Thumbnail Editor -> SNS分割画像メーカー handoff は、`Thumbnail Editorから受け取り`、予定タイトル、`split_1 -> split_4` 導線で確認
  - browser console error / warn なし
  - in-app browser 側に viewport resize API がないため、390 / 820 / 1024 / 1280 / 1366 の幅別実画面確認は未実施。今回追加UIは固定フッター型モーダルで、既存レスポンシブ境界 class は変更していない

2026-05-05 Phase 1 プリセット完成モックメモ:

- Phase 1 対象を `配信告知` / `歌枠` / `週間予定` の3種に絞った
- 画像生成で背景候補を作成し、採用背景3枚を `docs/mockups/thumbnail-editor-phase1/` に保存した
- 採用背景をもとに、テキスト、縁取り、影、立ち絵挿入場所、handoff流し込み先が見える完成モック3枚を同じディレクトリに保存した
- モック内の文字は方向性確認用で、実装時は Thumbnail Editor の canvas テキストレイヤーで再現する
- 背景は現時点では `docs/mockups` 管理に留め、実装用 asset として使う場合は後続PRで `public` 側の保存先、ファイル名、ライセンスメモ、圧縮方式を決める
- レイヤー方針は `docs/design-thumbnail-editor.md` に追記した。既存 handoff 反映先の `見出し` / `時刻` / `サブ` / `ラベル` は維持する
- 次の実装候補:
  - 背景画像の実装用配置先とファイル名を決める
  - `配信告知` / `歌枠` / `週間予定` の3プリセットだけを背景画像ベースへ更新する
  - 立ち絵挿入ガイド、見出し、時刻、サブ、ラベルの座標をプリセットに反映する
  - Schedule Calendar handoff 後も予定テキストが同じ4系統へ流れることを確認する
  - 全プリセット刷新、縦横variant、高度な部分適用、素材ライブラリ化は後続候補のまま残す

2026-05-05 Phase 1 プリセット背景実装メモ:

- 採用背景3枚を `public/assets/images/thumbnail-editor/phase1/` へ実装用 asset としてコピーした
- `配信告知` / `歌枠` / `週間予定` の背景レイヤーを public asset 参照へ変更し、背景レイヤーを locked 扱いにした
- 同3プリセットへ立ち絵挿入ガイドを追加し、`見出し` / `時刻` / `サブ` / `ラベル` のテキストレイヤー座標と文字スタイルをモック寄りに調整した
- `normalizeThumbnailDraft()` が同一originの Thumbnail Editor 用 public asset を保持できるよう、safe image source 判定を `public/assets/images/thumbnail-editor/` 配下へ拡張した
- 契約チェック `scripts/thumbnail-phase1-preset-assets-contract.mjs` を追加した
- 検証: `node scripts/thumbnail-phase1-preset-assets-contract.mjs` PASS、`node scripts/thumbnail-preset-apply-safety-contract.mjs` PASS、`node scripts/thumbnail-preset-discovery-contract.mjs` PASS、`node scripts/tool-handoff-contract.mjs` PASS、`node scripts/sns-split-image-maker-contract.mjs` PASS
- 追加検証: `npm run lint` PASS、`npx tsc --noEmit` PASS、`npm run audit:prod` PASS、`npm run build` PASS
- Browser確認:
  - `out/` を `py -m http.server 3014` で配信し、`1366x900` の Chrome DevTools MCP で `/tools/thumbnail-editor/` を確認した
  - `配信告知` / `歌枠` / `週間予定` のプリセット切替、背景画像表示、背景レイヤー locked 表示、立ち絵挿入ガイド表示を確認した
  - `歌枠` の英字見出しが横に伸びすぎたため、`SINGING` / `STREAM` の3行構成へ修正し、再build後に表示を確認した
  - Phase 1 背景画像3枚は Network 上で 200 応答を確認した
  - Python静的配信では Next static export の RSC prefetch 系 `__next.*.txt` に 404 が出るが、今回追加した背景画像の読み込み失敗ではない

2026-05-05 レイヤー名編集 / 週間グループ表示メモ:

- レイヤー一覧に表示される `name` を、プロパティパネルの `レイヤー名` 入力から編集できるようにした
- レイヤー複製時の名前は `コピー` / `コピー 2` の番号方式にし、既存下書きに `コピー コピー` 名が残っていても次の複製では番号方式へ寄せる
- レイヤー名は blur 時に前後空白と連続空白を整理し、空欄の場合は `テキスト` / `図形` / `画像` の既定名へ戻す
- `週間予定` プリセットは、`月曜 / 曜日`、`月曜 / 時間`、`月曜 / 予定` のように曜日ごと3列、合計21テキストレイヤーへ変更した
- 各曜日の3レイヤーは同じ `y` を持ち、曜日 / 時間 / 予定の列ごとに固定 `x / width` を持たせ、単語幅の違いで後続テキストがずれない構造にする
- レイヤー一覧へ独自スクロールを追加し、`週間予定` の曜日別レイヤーは表示上だけアコーディオン化した
- 週間予定の曜日 / 時間 / 予定のX座標を、手動調整値の `670 / 770 / 890` へ更新した
- 保存済み下書きから週間予定の曜日行配置を読み取り、行ごとの整数 `y` と `height=52` をプリセット定義へ反映した
- 左側の立ち絵挿入ガイド、見出し、ラベル、週範囲バッジ、時刻テキストを手動調整値へ更新した
- 週間予定の `テキスト 1（見出し）` 初期値を中央揃え、Bold、斜体にした
- アコーディオンの開閉表示は `開く` / `閉じる` テキストではなく `▸` / `▾` アイコンにし、閉じた直後に自動再展開されないようにした
- グループはまだデータモデルに持たせず、`月曜 / 曜日` 形式のレイヤー名から表示上だけ判定する
- Phase 1 は `配信告知` / `歌枠` / `週間予定` の採用背景、完成モック、プリセット反映までを完了扱いにし、PR化する
- 後続候補として、週間予定の背景と予定入力欄を別アセット / 別フレームレイヤーに分け、枠サイズや余白を調整できる構造を検討する
- 契約チェック `scripts/thumbnail-layer-management-contract.mjs` を追加した
- 補足: in-app browser ではユーザー下書きに既存の `コピー コピー...` レイヤー名が残っていることを確認した。既存名の一括リネームは勝手に行わず、手動で直せる入力と、次回以降の複製名の増殖防止を入れる

- [ ] ペイント系ではなく、VTuber向けサムネ組み立てツールとして再定義する
  - 白紙から作るのではなく、用途別プリセットを選んで文字と立ち絵を差し替える体験に寄せる
  - 自由描画、素材検索、Canva的な汎用デザイン機能は優先しない
- [ ] 用途別プリセットを追加する
  - [x] 初回追加として、ゲーム実況、コラボ、お知らせ、週間予定、X告知画像を追加する
  - [x] Phase 1 完成モック対象として、配信告知、歌枠、週間予定を選定する
  - 雑談配信
  - 歌枠
  - ゲーム実況
  - 初配信
  - コラボ
  - 記念配信
  - 耐久配信
  - お知らせ
  - 週間予定
  - X告知画像
- [ ] プリセット一覧の表示方法を再設計する
  - [x] 初回対応として、既存カード一覧にカテゴリ / 用途ラベル / 説明を表示する
  - [x] 検索、カテゴリ絞り込み、用途ラベル絞り込み、最近使ったプリセット、お気に入りの最小実装を追加する
  - プリセット数が増える前提で、カテゴリ選択 -> 複数プリセット表示の構成にする
  - カテゴリ候補: 配信ジャンル、告知種別、コラボ人数、画像向き、プラットフォーム
  - より細かいカテゴリ階層やプリセットパック管理は後続候補として検討する
- [ ] プリセットに持たせる情報を定義する
  - [x] Phase 1 のレイヤー方針として、背景、立ち絵挿入場所、見出し、時刻、サブ、ラベル、装飾の役割を定義する
  - [x] Phase 1 対象3プリセットへ、実装用背景、立ち絵ガイド、主要テキスト座標を反映する
  - [x] `週間予定` の曜日 / 時刻 / 内容を曜日別3列レイヤーへ分割し、幅と揃えを調整しやすくする
  - [x] レイヤー一覧へ独自スクロールと、週間予定向けの表示上グループ / アコーディオンを追加する
  - [x] レイヤー一覧の名前編集と、複製時の番号付きコピー名を追加する
  - タイトル位置、立ち絵位置、日時表示、ジャンルラベル、強調ワード、背景処理、文字縁取り、影、セーフエリア
  - 配色バリエーション、フォントバリエーション、装飾ON/OFFを切り替えられるようにする
- [ ] 同一プリセットの縦画像 / 横画像対応を設計する
  - 同じ用途のプリセットで、YouTube向け横長、X告知向け横長、スマホ向け縦長を切り替えられるようにする
  - 文字位置、立ち絵位置、セーフエリア、背景トリミングを向きごとに持てるようにする
  - 単純なリサイズで破綻する場合は、preset variantとして別レイアウトを持つ
- [ ] フォント管理をプリセット完成型向けに拡張する
  - フォント候補を増やし、ジャンル別/雰囲気別に選びやすくする
  - フォント数増加に備え、一覧表示、検索、カテゴリ、最近使ったフォントを検討する
  - ローカルフォント使用を検討する
    - ブラウザで安全に扱える範囲、保存可否、再読み込み時の扱い、書き出し時の再現性を先に確認する
    - ローカルフォントが使えない環境では代替フォントへフォールバックする
- [ ] 背景/装飾素材の制作方針を決める
  - 画像生成で背景素材や装飾素材を作成し、それをプリセット化する
  - [x] Phase 1 採用背景3枚と完成モック3枚を `docs/mockups/thumbnail-editor-phase1/` に保存する
  - [x] Phase 1 採用背景3枚を `public/assets/images/thumbnail-editor/phase1/` に実装用 asset として配置する
  - 生成素材は `docs/mockups` ではなく、実装用assetとして扱う場合の配置先とライセンスメモを決める
- [ ] Schedule Calendar からの受け取りを設計する
  - [x] 初回対応として、予定タイトル、日時、告知文、カテゴリ / プラットフォームを初期テキストへ反映する
  - [x] handoff後のプリセット変更 / キャンバスサイズ変更でも予定テキストを維持する
  - [x] Phase 1 完成モックで `見出し` / `時刻` / `サブ` / `ラベル` の流し込み先を確認する
  - 予定タイトル、日時、カテゴリ、プラットフォーム、告知文を初期テキストへ反映する
  - 立ち絵と背景を入れるだけでサムネとして使える状態を目標にする
- [ ] 共通素材ライブラリを設計する
  - 立ち絵、背景、ロゴ、装飾、よく使うラベルを再利用できるようにする
  - 画像本体はlocalStorageに直接持たず、SNS Split Image Makerと同様にIndexedDB保存を第一候補にする
  - 素材の削除、差し替え、容量上限、破損時復旧を決める
- [ ] テキスト可読性チェックを追加する
  - 文字が小さすぎる、縁取りが弱い、背景とのコントラストが低い、セーフエリア外にある状態を警告する
  - 警告は自動修正ではなく、まずは軽いガイドとして表示する
  - VTuber向けプリセット完成型の品質差別化ポイントとして扱う
- [ ] 立ち絵配置プリセットを追加する
  - 右寄せ / 左寄せ / 中央寄せ
  - 半身 / バストアップ / 顔寄り
  - コラボ2人 / 3人
  - 立ち絵を置くだけで破綻しにくい構図を優先する
- [ ] プリセットの部分適用を設計する
  - 全体適用だけでなく、レイアウトのみ / 配色のみ / 文字スタイルのみ / 装飾のみを検討する
  - [x] 初回対応として、プリセット全体適用前の確認UIと主要テキスト引き継ぎを追加する
  - 既存編集を上書きする場合は確認を入れる
  - 完成型プリセットを増やしても、ユーザーの調整済み内容を壊しにくくする

#### 3. SNS Split Image Maker はコア凍結寄りで仕上げる

- [ ] コア分割機能は当面大きく増やさない
  - 2分割 / 3分割 / 4分割、個別追加 / フレーム追加を現行の主要仕様として扱う
  - 分割方法や合成方法の追加は、別フェーズ候補として扱う
- [ ] 初見向け説明と作例を追加する
  - `X向けの分割投稿画像を、投稿順どおりに作る` ことを入口で明示する
  - 2分割 / 3分割 / 4分割それぞれの作例を用意する
  - 投稿順 `split_1 -> split_n` とブラウザの連続ダウンロード挙動を説明する
- [ ] 失敗しやすい操作をガードする
  - 画像未投入時の出力ボタン状態
  - 推奨サイズ/比率の表示
  - 出力前の投稿順確認
  - 連続ダウンロードがブロックされる場合の案内
- [x] Thumbnail Editor からの受け取りを設計する
  - [x] サムネで作った告知画像をメイン画像として渡す
  - [x] 必要に応じてタイトル、日付、カテゴリも引き継ぐ
- [ ] 出力後の次アクションを追加する
  - `split_1` から順に投稿する案内
  - 投稿文コピー
  - Schedule Calendar へ告知画像作成済み状態を戻す導線
- [ ] サンプルデータ / 作例ロードを追加する
  - 2分割 / 3分割 / 4分割それぞれに `サンプルで開く` 導線を用意する
  - 実画像ではなく、軽いサンプル背景/フレームで各分割の用途が分かるようにする
  - サンプル適用時は既存draft上書き確認を入れる
- [ ] 出力前チェックリストを追加する
  - base画像あり
  - 必須slot不足なし
  - 投稿順確認済み
  - 推奨比率から大きく外れていない
  - ファイル名パターンOK
  - 仕様上の「誤出力ガード」として、出力直前に軽く確認できる形にする
- [ ] ZIP一括ダウンロードを後段候補として残す
  - 仕様書ではMVP非対応、設計書ではPhase 2以降の拡張
  - 連続ダウンロードがブラウザに止められるケースへの対策として有用
  - まずは個別DL維持、実装する場合は依存追加なし/軽量実装可否を先に調べる
- [ ] X以外の比率拡張は後回しにする
  - 1:1 / 4:5 / TikTok/Instagram向けはPhase 2以降候補
  - 直近はX向け2/3/4分割の説明、作例、出力信頼性を優先する

#### 4. 無料公開とマネタイズ準備

- [ ] 当面は3ツールを無料公開の範囲で仕上げる
  - ツール本体の課金ロックはまだ入れない
  - 有料化はテンプレート、プリセット、背景/装飾素材、制作導線から始める
- [ ] 買い切り候補を整理する
  - サムネイルテンプレートパック
  - SNS分割用フレームパック
  - 配信告知セット
  - 案件/制作管理テンプレート
- [ ] サブスク候補は後段へ送る
  - クラウド同期、継続テンプレート追加、案件/収益管理、チーム共有など、継続価値が出る段階で再検討する

#### 5. ポータル共通の完成型タスク

- [ ] 作例 / 使い方導線を追加する
  - 各ツール入口に「何ができるか」「最短手順」「保存場所」「外部送信なし」を表示する
  - 独立した `/guide` ページにするか、ツール内の軽いガイドに留めるかを決める
- [ ] サンプルから始める導線を追加する
  - Schedule Calendar: サンプル1週間予定
  - Thumbnail Editor: サンプル立ち絵なしでも成立するサムネ
  - SNS Split Image Maker: split-2 / split-3 / split-4 のサンプル
  - 既存draftを上書きする場合は確認を入れる
- [ ] 共通handoff仕様を固定する
  - `Schedule Calendar -> Thumbnail Editor -> SNS Split Image Maker` の受け渡し項目を定義する
  - テキスト情報はURL queryまたはlocalStorage handoff、画像本体はIndexedDB handoffを第一候補にする
  - handoff payloadにはversionを持たせ、破損/期限切れ時は安全に無視する

### ツール間連携の最小設計

- [x] 共通データモデルを先に設計する
  - 日付、時刻、タイトル、カテゴリ、配信プラットフォーム、メモ、告知文を共通フィールドとして定義する
  - URL query、localStorage handoff、JSON export/import のどれで渡すかを決める
- [x] ツール間連携の最小導線を実装する
  - 例: カレンダー予定からサムネ作成へ遷移
  - 例: サムネ画像をSNS分割画像メーカーのメイン画像として使う
  - 例: SNS分割画像メーカーの出力後に予定へ「告知画像作成済み」を戻す
  - Schedule Calendar から Thumbnail Editor / SNS分割画像メーカーへのテキスト handoff を実装済み
  - Thumbnail Editor から SNS分割画像メーカーへの画像 handoff を実装済み
  - Schedule Calendar への状態戻しは次PR候補

### 認証・サーバー保存導入前の設計タスク

- [ ] 保存データの分類と保持ポリシーを決める
  - 予定、メモ、投稿テンプレート、将来の履歴 / お気に入り / 個人設定を、個人情報・機密度・削除要件で分類する
  - サーバー保存時は削除、エクスポート、端末間同期、退会時削除の仕様を先に決める
- [ ] 認証後URLとアクセス制御を設計する
  - 公開ポータル `/` / `/tools/...` と個人領域 `/app/...` を分ける
  - middleware / Pages Functions / Workers を使う場合は、認可チェックをサーバー側で一元化する
- [ ] 外部連携トークンの保管方針を決める
  - Google Calendar、SNS、AI API などを導入する場合、access token / refresh token / API key を localStorage に保存しない
  - Cloudflare 側の Secrets、D1/KV/R2、暗号化、ローテーション、監査ログの責務を決める
- [ ] セキュリティヘッダーとCSPを本番構成に合わせて見直す
  - Cloudflare Web Analytics、Turnstile、外部画像、API endpoint などを追加するたびに CSP を更新する
  - Report-Only 運用や violation report の扱いを検討する

## 次の整理メモ

- `task.md` は現在の作業と次アクションに絞る
- 完了済みの実装ログ、検証ログ、PRプロンプトは月次 archive に移す
- 3ツールの仕上げ方針を追加するときは、実装タスクとマネタイズ判断を混ぜすぎない
