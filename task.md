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

- 2026-05-09 `歌枠` Phase 5 preset 更新:
  - 作業前に PR #48 `[codex] Renew chatting thumbnail phase 5 preset` が `main` に merge済みで、`origin/main` / worktree が merge commit `97986f46cd6e8d8853f981ff1a29f8830856ee69` を含むことを確認した
  - 作業branch / worktree: `codex/thumbnail-phase5-karaoke-preset` / `.worktrees/thumbnail-phase5-karaoke-preset`
  - 対象は `歌枠` presetのみ。全9プリセット、schema、public API、素材ライブラリUI、フォント、外部CDN依存は変更していない
  - 背景を `public/assets/images/thumbnail-editor/phase5/karaoke-background-v1.png` へ移し、読める文字、ロゴ、人物、キャラクター、実画面、SNS UI は入れていない
  - 個別assetは `karaoke-label-plaque-rose-uniform-cell.png` / `karaoke-time-badge-gold-uniform-cell.png` / `karaoke-sparkle-cluster-rose-cyan-uniform-cell.png` / `karaoke-standee-frame-glow-uniform-cell.png` / `karaoke-music-note-rose-uniform-cell.png` / `karaoke-music-note-gold-uniform-cell.png` / `karaoke-triangle-burst-rose-uniform-cell.png` の7点に絞り、すべて `768 x 512` 透明PNG / alpha余白つきへ正規化した
  - `lib/thumbnail-editor.ts` は `karaoke` presetだけをPhase 5構造へ更新し、`見出し` / `時刻` / `サブ` / `ラベル` は editable text layer として維持した
  - `立ち絵挿入ガイド` / `ラベル横ライン` / `見出し下ライン` / `時刻下ライン` は shape layer として維持した
  - 追加contract: `scripts/thumbnail-phase5-karaoke-preset-contract.mjs`。実装前REDは `karaoke uses the phase 5 generated background` で確認し、実装後PASS
  - 既存contract更新: `scripts/thumbnail-phase1-preset-assets-contract.mjs` は `karaoke` がPhase 5へ移った前提に変更。`scripts/thumbnail-phase4-decoration-assets-contract.mjs` は `karaoke` をPhase 4 preset対象から外し、既存Phase 4 assetファイル自体は保存済みdraft互換のため残した
  - 検証: 新規 `node scripts/thumbnail-phase5-karaoke-preset-contract.mjs`、既存Phase 5 contract群、Phase 1〜4 / preset safety / discovery / layer management / handoff / sns split contracts、`npm run lint`、`npx tsc --noEmit`、`npm run build` はPASS。`npm run build` は worktree とrootのlockfile重複によるNext.js workspace root推定warningのみ発生
  - UI確認: static outputを `localhost:3032` で配信し、Playwrightで 390 / 820 / 1024 / 1280 / 1366px を確認。各幅でcanvas非blank、horizontal overflow 0。1024px以上ではPhase 5背景 / 個別asset / shape layer / editable text layerがレイヤー一覧に残ることを確認
  - console確認: 追加したPhase 5 `karaoke` asset requestは404なし。Next static export のRSC prefetch `__next...txt?_rsc=` 404と、pixel sampling由来のCanvas readback warningのみ発生
  - 追加調整: 初回Phase 5背景はモックから情報量と見出しの主役感が落ちすぎたため、Phase 1の高密度な歌枠背景を `1280 x 720` へ正規化してPhase 5背景に採用し直した。見出しは巨大な `歌枠` と `SINGING STREAM` のeditable text layerへ分け、右立ち絵枠も縦長の角付きフレームへ寄せた
  - 追加調整2: user確認後、モック右側の装飾枠と音符の存在感がまだ弱かったため、右立ち絵枠asset、ピンク/金の音符asset、ピンク三角アクセントassetを追加した。初回追加assetは手描き線が太く低品質に見えたため、user提供のグリーンバック素材からキー抜きし、Phase 5用 `768 x 512` 透明PNGへ正規化し直した。追加後も対象は `karaoke` のみで、schema / UI / フォントは変更していない
  - 追加調整2後のUI確認: static outputを `localhost:3034` で配信し、Playwrightで 390 / 820 / 1024 / 1280 / 1366px を再確認。各幅でcanvas非blank、horizontal overflow 0。1024px以上では追加した音符 / 右枠 / ピンク三角アクセントassetを含むPhase 5個別asset、shape layer、editable text layerがレイヤー一覧に残ることを確認。追加asset requestの404はなし

- 2026-05-08 `切り抜き` preset 単体polish:
  - `切り抜き` だけを対象に、既存 Phase 3 背景 `clip-background.png` と `見出し` / `時刻` / `サブ` / `ラベル` の editable text layer を維持した
  - 専用抽象SVG assetとして `clip-label-band-base.svg` / `clip-time-badge-base.svg` / `clip-video-frame-accent.svg` / `clip-impact-marks.svg` を追加した
  - 追加SVGには読める文字、ロゴ、人物、キャラクター、外部画像参照、`<text>` / `font-family` / `<image>` / `href=` を入れていない
  - 既存 `clip-focus-rays.svg` / `clip-speed-lines.svg` / `arrow-accent.svg` は維持し、集中線、スピード線、矢印、衝撃マークの一体感が出るように再配置した
  - 動画フレームは左上寄りに大きく取り、`clip-video-frame-accent.svg` で白黒フレーム、角飾り、再生ガイド、下部バーを補った
  - ラベル帯と時刻バッジはSVG土台 + editable textへ置換し、見出しは右下に2行配置して短い強調語として読みやすくした
  - サブテキストは下部に逃がし、動画フレーム、見出し、時刻バッジと重なりすぎない余白を確保した
  - 背景焼き込み、schema変更、public API変更、新しい `shapeType`、素材ライブラリUI変更、`tintColor` 変更、他プリセット定義は入れていない
  - 比較結果は `docs/active/THUMBNAIL_EDITOR_PHASE4_POLISH_REVIEW.md` の `切り抜き` 行に記録した
  - 検証: `node scripts/thumbnail-phase4-decoration-assets-contract.mjs` PASS、`node scripts/thumbnail-phase1-preset-assets-contract.mjs` PASS、`node scripts/thumbnail-preset-apply-safety-contract.mjs` PASS、`node scripts/thumbnail-preset-discovery-contract.mjs` PASS、`node scripts/thumbnail-layer-management-contract.mjs` PASS、`node scripts/tool-handoff-contract.mjs` PASS、`node scripts/sns-split-image-maker-contract.mjs` PASS
  - 追加検証: `npm run lint` PASS、`npx tsc --noEmit` PASS、`git diff --check` PASS、`npm run build` PASS
  - Browser/Playwright確認: clean localStorage状態から `切り抜き` presetを適用。390 / 820 / 1024 / 1280 / 1366px でcanvas非blank、水平overflow 0、console error / warn なし。1024px以上では追加小物asset `画像 2（集中線）` / `画像 3（衝撃と矢印マーク）` / `画像 4（動画フレーム装飾）` / `画像 5（矢印アクセント）` / `画像 6（スピード線）` / `画像 7（ラベル帯）` / `画像 8（時刻バッジ）` と `見出し` / `時刻` / `サブ` / `ラベル` がレイヤー一覧に残ることを確認。1366pxのフルcanvas出力で見出し、時刻、サブ、ラベルの可読性と動画フレーム/強調装飾の余白を確認した

- 2026-05-08 `X告知画像` preset 単体polish:
  - 作業前に PR #39 `切り抜き` polish が `main` に merge 済みで、local `main` / worktree が merge commit `6bf5551` を含むことを確認した
  - `X告知画像` だけを対象に、既存 Phase 3 背景 `x-announcement-background.png` と `見出し` / `時刻` / `サブ` / `ラベル` の editable text layer を維持した
  - 専用抽象SVG assetとして `x-post-card-base.svg` / `x-label-band-base.svg` / `x-date-badge-base.svg` / `x-standee-guide-lines.svg` を追加した
  - 追加SVGには読める文字、ロゴ、人物、キャラクター、外部画像参照、`<text>` / `font-family` / `<image>` / `href=` を入れていない
  - 投稿カード、ラベル帯、日付バッジはSVG土台 + editable textへ置換し、見出しは短い告知文として読みやすく少し大型化した
  - 既存 `soft-light-particles.svg` / `x-corner-ornaments.svg` / `dot-dash-row.svg` は維持し、opacityと配置を抑えて背景との一体感を優先した
  - 立ち絵guideは専用細線asset + 薄いframe guideへ分離し、右側の余白を残しながら主張を抑えた
  - サブテキストは中央寄せで日付バッジ上へ整理し、本文罫線と日付バッジの間に余白を確保した
  - 背景焼き込み、schema変更、public API変更、新しい `shapeType`、素材ライブラリUI変更、`tintColor` 変更、他プリセット定義は入れていない
  - 比較結果は `docs/active/THUMBNAIL_EDITOR_PHASE4_POLISH_REVIEW.md` の `X告知画像` 行に記録した
  - 検証: `node scripts/thumbnail-phase4-decoration-assets-contract.mjs` PASS、`node scripts/thumbnail-phase1-preset-assets-contract.mjs` PASS、`node scripts/thumbnail-preset-apply-safety-contract.mjs` PASS、`node scripts/thumbnail-preset-discovery-contract.mjs` PASS、`node scripts/thumbnail-layer-management-contract.mjs` PASS、`node scripts/tool-handoff-contract.mjs` PASS、`node scripts/sns-split-image-maker-contract.mjs` PASS
  - 追加検証: `npm run lint` PASS、`npx tsc --noEmit` PASS、`git diff --check` PASS、`npm run build` PASS。`npm run build` では worktree と root の lockfile 重複により Next.js の workspace root 推定 warning が出たが、build は成功した
  - Browser/Chrome DevTools確認: clean isolated contextから `/tools/thumbnail-editor/` を開き、UI上で `X告知画像` presetを適用。390 / 820 / 1024 / 1280 / 1366px でcanvas非blank、水平overflow 0、console error / warn なし。1024px以上では追加小物asset `画像 3（投稿カード土台）` / `画像 5（立ち絵guideの細線）` / `画像 6（ラベル帯）` / `画像 8（日付バッジ）` と `見出し` / `時刻` / `サブ` / `ラベル` がレイヤー一覧に残ることを確認。1366pxで見出し、時刻、サブ、ラベルの可読性と投稿カード/立ち絵guide/装飾の余白を確認した

- 2026-05-08 `週間予定` preset 単体polish:
  - 作業前に PR #40 `X告知画像` polish が `main` に merge 済みで、local `main` / `origin/main` が merge commit `50bc3a6` を含むことを確認した
  - `週間予定` だけを対象に、既存 Phase 1 背景 `weekly-schedule-background.png` と `見出し` / `時刻` / `ラベル`、曜日別の `曜日` / `時間` / `予定` editable text layerを維持した
  - 専用抽象SVG assetとして `weekly-table-accent-lines.svg` / `weekly-range-badge-base.svg` / `weekly-standee-guide-lines.svg` / `weekly-soft-glints.svg` を追加した
  - 追加SVGには読める文字、ロゴ、人物、キャラクター、外部画像参照、`<text>` / `font-family` / `<image>` / `href=` を入れていない
  - 背景側の予定表行panelを活かすため、追加行panelは入れず、予定表補助線、縦罫線、角アクセント、週範囲バッジ土台、立ち絵guide細線を重ねる構成にした
  - 曜日別テキストの既存座標は維持し、フォント、stroke、影、色だけを調整して曜日、時間、予定内容の読みやすさを上げた
  - 週範囲バッジはSVG土台 + editable textへ補強し、立ち絵guideは細線asset + 薄いframe guideへ分離した
  - 背景焼き込み、schema変更、public API変更、新しい `shapeType`、素材ライブラリUI変更、`tintColor` 変更、他プリセット定義は入れていない
  - 比較結果は `docs/active/THUMBNAIL_EDITOR_PHASE4_POLISH_REVIEW.md` の `週間予定` 行に記録した
  - 検証: `node scripts/thumbnail-phase4-decoration-assets-contract.mjs` PASS、`node scripts/thumbnail-phase1-preset-assets-contract.mjs` PASS、`node scripts/thumbnail-preset-apply-safety-contract.mjs` PASS、`node scripts/thumbnail-preset-discovery-contract.mjs` PASS、`node scripts/thumbnail-layer-management-contract.mjs` PASS、`node scripts/tool-handoff-contract.mjs` PASS、`node scripts/sns-split-image-maker-contract.mjs` PASS
  - 追加検証: `npm run lint` PASS、`npx tsc --noEmit` PASS、`git diff --check` PASS、`npm run build` PASS。`npm run build` では worktree と root の lockfile 重複により Next.js の workspace root 推定 warning が出たが、build は成功した
  - Browser/CDP確認: clean isolated contextから `/tools/thumbnail-editor/` を開き、`週間予定` presetを確認。390 / 820 / 1024 / 1280 / 1366px でcanvas非blank、水平overflow 0、console error / warn なし。1024px以上では日別accordionを開き、追加小物asset `画像 2（週間予定の控えめな光）` / `画像 4（予定表の補助線）` / `画像 5（週範囲バッジ土台）` / `画像 6（立ち絵guideの細線）` と `見出し` / `時刻` / `ラベル`、曜日別グループ内の `曜日` / `時間` / `予定` がレイヤー一覧に残ることを確認した

2026-05-08 Phase 4 polish後の進め方メモ:

- PR #41 `週間予定` polish は `main` に merge済み。Phase 4 全9プリセットはここで区切る
- Phase 5 visual reviewは `docs/active/THUMBNAIL_EDITOR_PHASE4_POLISH_REVIEW.md` に横断表として追記済み
- UI確認: worktree dev server `localhost:3018` の `/tools/thumbnail-editor/` で全9プリセットを確認。確認幅は browser screenshot `1686x928`、キャンバス `1280 x 720 (16:9)`、zoom `72%`
- 確認方法: 上部プリセットメニューから各プリセットを選択し、`新規キャンバスを作成` 後の初期状態を確認。証跡は `output/phase5-visual-review-clean/1-配信告知.png` から `9-週間予定.png`
- Console error / warn: 0件
- Phase 5 推奨PR分割:
  - PR 1: 既存モックを再確認し、全9プリセットごとに `背景へ焼き込む範囲` / `個別asset化する範囲` / `shape layerで残す範囲` / `text layerで維持する範囲` を表にする
  - PR 2: 各プリセット1種目の完成背景を作る。大きな枠、パネル、予定表フレーム、動画フレーム、立ち絵用の光/余白は必要に応じて背景へ焼き込む
  - PR 3: バッジ、ステッカー、ラベル土台、時刻バッジ土台、小物を個別assetとして作る。プリセットで使うものに加え、色違いや未使用候補も少数用意し、利用者が置き換え/追加できる余地を残す
  - PR 4: 完成背景と個別assetをプリセットへ組み込み、ライン、下線、区切り線、補助線はshape layerとして追加/削除しやすい状態にする。見出し、時刻、サブ、ラベル文字、週間予定の曜日/時間/予定はtext layerで維持する
  - PR 5: 位置、文字サイズ、stroke、影、余白、レイヤー順を調整する。フォント追加は最後にまとめる。外部CDN依存は避け、ライセンス確認済みの self-host font を少数に絞る
  - PR 6以降: 同じ流れで各プリセット2種目を追加する。公開段階のゴールは、全9プリセットが各1種完成背景を持ち、必要に応じて2種目まで選べる状態
- 最初に着手する範囲:
  - `切り抜き`: 動画フレームと右下強調見出しの大枠を背景と一体化しやすく、個別asset化するステッカー/時刻バッジ/矢印との分担も見えやすい
  - `週間予定`: 右側予定表枠を初期は背景へ焼き込み、後で独立asset化する候補として管理しやすい
  - `X告知画像`: 投稿カード風パネルと淡い背景の一体感を確認しやすく、ラベル/日付バッジの個別asset化も試しやすい
- レイヤー責務:
  - 背景 + 大きな枠: 初期は焼き込みで完成度を優先する。数を増やす段階で、週間予定の右側予定表枠など流用価値が高いものから独立asset化する
  - バッジ / ステッカー / 小物: 文字なしの個別assetとして用意する。色違いやプリセット未使用候補も少数持ち、利用者が置き換え/追加できるようにする
  - ライン / 下線 / 補助線: 画像にせずshape layerとして追加/削除/色変更できる状態にする
  - テキスト: 既存どおりtext layerで維持する。読める文字を画像生成assetへ入れない
- この順にする理由: 初期は背景焼き込みでMVPの見た目完成度を優先しつつ、後から大枠や小物を独立asset化して流用できる構造へ移行しやすくするため

2026-05-08 Phase 5 `切り抜き` kickoff:

- 作業前に PR #42 `[codex] Document thumbnail phase 5 direction` が `main` に merge済みで、local `main` が merge commit `e8c0a7fba055c177756d8f4d42fef87d5bef1c55` を含むことを確認した
- `main` 直作業を避け、`codex/thumbnail-phase5-clip-preset` branch / `.worktrees/thumbnail-phase5-clip-preset` worktreeで開始した
- 実装前の設計整理として、`docs/active/THUMBNAIL_EDITOR_PHASE4_POLISH_REVIEW.md` に `Phase 5 切り抜き Kickoff Design Memo` を追記した
- 現時点の推奨最小PR範囲は、`切り抜き` 1プリセットだけで `背景 + 大きな動画フレームは初期MVPで焼き込み`、`ラベル土台 / 時刻バッジ土台 / ステッカー / 矢印 / 衝撃マーク / 小物は文字なし個別asset`、`下線 / 補助ライン / 区切り線はshape layer`、`見出し / 時刻 / サブ / ラベル文字はeditable text layer` として構造検証すること
- 実装へ進む前の確認点: 動画フレーム風の大きな枠を初期MVPで背景へ焼き込む方針でよいか。後続で独立asset化できるよう、焼き込み範囲と分離候補はdocsへ記録済み
- docs整理のみのため、検証は `git diff --check` を実行する

2026-05-08 Phase 5 `切り抜き` preset renewal:

- `imagegen` skill + built-in `image_gen` toolで、`切り抜き` 用のPhase 5背景と小物asset sheetを生成した
- Phase 5背景は `public/assets/images/thumbnail-editor/phase5/clip-background-v1.png` として保存した。大きな動画フレーム風の枠は初期MVPとして背景へ焼き込み、読める文字、ロゴ、人物、キャラクター、実動画スクショ、実ゲーム画面、SNS UIは入れていない
- #00ff00 chroma-key asset sheetから背景除去 / 2列x3行の同一セル分割を行い、文字なし個別assetをすべて `768 x 512` の透明PNGとして `public/assets/images/thumbnail-editor/decorations/phase5/` へ保存した。assetごとの個別トリムは見切れやキャッシュ差分の原因になるため使わない
  - `clip-label-sticker-yellow-uniform-cell.png`
  - `clip-time-badge-sticker-purple-uniform-cell.png`
  - `clip-title-sticker-backplate-uniform-cell.png`
  - `clip-arrow-yellow-uniform-cell.png`
  - `clip-impact-burst-yellow-uniform-cell.png`
  - `clip-spark-shards-purple-uniform-cell.png`
- `lib/thumbnail-editor.ts` は `clip` presetだけをPhase 5構造へ更新した。背景参照をPhase 5に切り替え、動画フレームshapeを外し、ラベル/時刻/見出し土台/矢印/衝撃/破片を個別assetとして配置した
- `見出し` / `時刻` / `サブ` / `ラベル` は editable text layerとして維持し、`下線` / `補助ライン` / `区切り線` は shape layerとして残した
- `scripts/thumbnail-phase5-clip-preset-contract.mjs` を追加し、Phase 5背景、個別asset、editable text layer、shape layer責務、個別assetが同一 `768 x 512` セルcanvasであることを確認できるようにした
- 既存 `scripts/thumbnail-phase3-preset-assets-contract.mjs` / `scripts/thumbnail-phase4-decoration-assets-contract.mjs` は、`clip` がPhase 5へ移った前提に合わせて期待値を更新した。あわせて `x_announcement` の投稿カードは現行Phase 4 asset layer前提に修正した
- 検証済み:
  - `node scripts/thumbnail-phase5-clip-preset-contract.mjs` PASS
  - `node scripts/thumbnail-phase3-preset-assets-contract.mjs` PASS
  - `node scripts/thumbnail-phase4-decoration-assets-contract.mjs` PASS
  - `node scripts/thumbnail-phase1-preset-assets-contract.mjs` PASS
  - `node scripts/thumbnail-phase5-clip-preset-contract.mjs; node scripts/thumbnail-phase4-decoration-assets-contract.mjs; node scripts/thumbnail-phase3-preset-assets-contract.mjs; node scripts/thumbnail-phase2-preset-assets-contract.mjs; node scripts/thumbnail-phase1-preset-assets-contract.mjs; node scripts/thumbnail-preset-apply-safety-contract.mjs; node scripts/thumbnail-preset-discovery-contract.mjs; node scripts/thumbnail-layer-management-contract.mjs; node scripts/tool-handoff-contract.mjs; node scripts/sns-split-image-maker-contract.mjs` PASS
  - `npm run lint` PASS
  - `npx tsc --noEmit` PASS
  - `git diff --check` PASS。LF -> CRLF warningのみ
  - `npm run build` PASS。worktree と root の lockfile 重複による Next.js workspace root 推定 warning は出たが、build は成功
- UI確認:
  - static outputを `localhost:3025` で配信し、Chrome DevToolsで `切り抜き` presetを適用。確認幅は 500 / 820 / 1024 / 1280 / 1366px。390px指定はChrome DevTools側で実幅500pxになった
  - 各幅でcanvas非blank、水平overflow 0を確認。1024px以上ではPhase 5背景、Phase 5個別asset、shape layer、editable text layerがレイヤー一覧に残ることを確認
  - static outputではPhase 5 asset requestはすべて 200。Next static export のRSC prefetch `.txt?_rsc=` 404 と、pixel sampling時のCanvas readback warningが出た
  - 追加フィードバックで `画像 6（ラベル土台）` と `画像 5（見出しステッカー土台）` の右側がまだ詰まって見えるため、asset sheetを再生成し、6点を同じセルサイズ / 同じ内部余白で配置する方針へ切り替えた。ローカル処理では 2列x3行を6等分し、chroma-key除去後に最大オブジェクトだけを残し、全6点を同じ `768 x 512` canvas / 同じ内側セーフボックスへ配置した `*-uniform-cell.png` に差し替えた。`画像 5（見出しステッカー土台）`、時刻バッジ、見出し、サブ、見出し下線は初期配置も少し左へ戻し、右端に余白が出るようにした。dev server `localhost:3026` の 1366px表示で再確認し、証跡を `output/phase5-clip-uniform-cell-dev-1366.png` に保存した。`scripts/thumbnail-phase5-clip-preset-contract.mjs` にはPNG alpha境界の余白チェックを追加した
  - 追加確認で `画像 5（見出しステッカー土台）` の輪郭自体が途中で終わったように見えたため、見出しステッカー土台だけ `1 asset = 1 canvas` で個別再生成し、同じ `768 x 512` / `*-uniform-cell.png` に正規化して差し替えた。alpha境界は左右114px、上下119px以上の透明余白。dev server `localhost:3026` の 1366px表示で再確認し、証跡を `output/phase5-clip-title-sticker-rebuilt-dev-1366.png` に保存した
  - 今後のPhase 5小物asset生成方針: sheet一括生成は比較/候補出しには有効だが、最終採用assetは基本 `1 asset = 1 canvas` で生成し、同一canvas / 同一セーフボックスへ正規化する。これにより、隣接セルの小片混入、余白不足、生成時点での輪郭見切れを避けやすい
  - 切り分けとして dev server `localhost:3026` でも 1366px確認を実施。`切り抜き` preset適用後、console error / warn なし。canvas非blank、水平overflow 0、Phase 5レイヤー一覧残存を確認
  - 確認スクリーンショット: `output/phase5-clip-canvas-dev-1366.png`

2026-05-08 Phase 5 `お知らせ` kickoff:

- 作業前に PR #43 `[codex] Renew clip thumbnail phase 5 preset` が `main` に merge済みで、local `main` が merge commit `98e5e9d949e75298165fb0ebac2f24ebee25d7c6` を含むことを確認した
- `main` 直作業を避け、`codex/thumbnail-phase5-announcement-preset` branch / `.worktrees/thumbnail-phase5-announcement-preset` worktreeで開始した
- 実装前の設計整理として、`docs/active/THUMBNAIL_EDITOR_PHASE4_POLISH_REVIEW.md` に `Phase 5 お知らせ Kickoff Design Memo` を追記した
- 現時点の推奨最小PR範囲は、`お知らせ` 1プリセットだけで `背景 + 本文パネル / 大きな情報枠は初期MVPで焼き込み`、`ラベル土台 / 日付バッジ / 角飾り / 小さな光は文字なし個別asset`、`本文罫線 / サブ下ライン / 立ち絵guide枠はshape layer`、`見出し / 日付または時刻 / サブ / ラベル文字はeditable text layer` として構造検証すること
- 実装へ進む前の確認点: 本文パネル / 大きな情報枠を初期MVPで背景へ焼き込む方針でよいか。後続で独立asset化できるよう、焼き込み範囲と分離候補はdocsへ記録済み
- docs整理のみのため、検証は `git diff --check` を実行する

2026-05-08 Phase 5 `お知らせ` preset renewal:

- `imagegen` skill + built-in `image_gen` toolで、`お知らせ` 用のPhase 5背景と文字なし個別assetを生成した。CLI fallback / true native transparency は使っていない
- Phase 5背景は `public/assets/images/thumbnail-editor/phase5/announcement-background-v1.png` として保存した。背景には大きな本文パネル / 情報枠を初期MVPとして焼き込み、読める文字、ロゴ、人物、キャラクター、実動画スクショ、実ゲーム画面、SNS UIは入れていない。初回生成でラベル枠に見える小枠が背景へ入ったため不採用にし、ラベル/日付バッジ形状を焼き込まない条件で再生成した
- #00ff00 chroma-key assetから背景除去し、文字なし個別assetをすべて `768 x 512` の透明PNGとして `public/assets/images/thumbnail-editor/decorations/phase5/` へ保存した。最終採用assetは `1 asset = 1 canvas` とし、同一canvas / 同一セーフボックスへ正規化した
  - `announcement-label-plaque-ivory-uniform-cell.png`
  - `announcement-date-badge-navy-gold-uniform-cell.png`
  - `announcement-corner-ornament-gold-uniform-cell.png`
  - `announcement-soft-glint-cluster-gold-uniform-cell.png`
  - `announcement-label-plaque-navy-candidate-uniform-cell.png` は未使用候補
- `lib/thumbnail-editor.ts` は `announcement` presetだけをPhase 5構造へ更新した。背景参照をPhase 5に切り替え、本文パネルshapeを外し、ラベル土台 / 日付バッジ / 角飾り / 小さな光を個別assetとして配置した
- `見出し` / `時刻` / `サブ` / `ラベル` は editable text layerとして維持し、`本文罫線` / `サブ下ライン` / `立ち絵guide枠` は shape layerとして残した
- `scripts/thumbnail-phase5-announcement-preset-contract.mjs` を追加し、Phase 5背景、個別asset、editable text layer、shape layer責務、個別assetが同一 `768 x 512` canvasであること、上下左右に最低76px以上の透明余白があることを確認できるようにした
- 既存 `scripts/thumbnail-phase2-preset-assets-contract.mjs` / `scripts/thumbnail-phase4-decoration-assets-contract.mjs` は、`announcement` がPhase 5へ移った前提に合わせて期待値を更新した
- 検証済み:
  - `node scripts/thumbnail-phase5-announcement-preset-contract.mjs` PASS
  - `node scripts/thumbnail-phase5-clip-preset-contract.mjs` PASS
  - `node scripts/thumbnail-phase4-decoration-assets-contract.mjs` PASS
  - `node scripts/thumbnail-phase3-preset-assets-contract.mjs` PASS
  - `node scripts/thumbnail-phase2-preset-assets-contract.mjs` PASS
  - `node scripts/thumbnail-phase1-preset-assets-contract.mjs` PASS
  - `node scripts/thumbnail-preset-apply-safety-contract.mjs` PASS
  - `node scripts/thumbnail-preset-discovery-contract.mjs` PASS
  - `node scripts/thumbnail-layer-management-contract.mjs` PASS
  - `node scripts/tool-handoff-contract.mjs` PASS
  - `node scripts/sns-split-image-maker-contract.mjs` PASS
  - `npm run lint` PASS
  - `npx tsc --noEmit` PASS
  - `git diff --check` PASS。LF -> CRLF warningのみ
  - `npm run build` PASS。worktree と root の lockfile 重複による Next.js workspace root 推定 warning は出たが、build は成功
- UI確認:
  - static outputを `localhost:3027` で配信し、Playwrightで `お知らせ` presetを適用。確認幅は 390 / 820 / 1024 / 1280 / 1366px
  - 各幅でcanvas非blank、水平overflow 0を確認。1024px以上ではPhase 5個別asset、shape layer、editable text layerがレイヤー一覧に残ることを確認
  - static outputではPhase 5 asset requestはすべて 200。Next static export のRSC prefetch `__next...txt?_rsc=` 404がconsole errorとして出たが、今回追加assetの読み込み失敗ではない
  - dev server確認はNext.jsのworkspace root推定によりroot側bundleを参照する可能性があったため、採用証跡から外した
  - preset切替直後に古い非同期描画が新しいpreset canvasを上書きしないよう、main canvas / mobile preview canvasの描画をrender version付きoffscreen buffer経由に変更した
  - 確認スクリーンショット: `output/playwright/phase5-announcement-final-390.png` / `phase5-announcement-final-820.png` / `phase5-announcement-final-1024.png` / `phase5-announcement-final-1280.png` / `phase5-announcement-final-1366.png`
  - Canvas export確認: `output/playwright/phase5-announcement-canvas-static-clean-1280x720.png`

2026-05-09 Phase 5 `X告知画像` preset renewal:

- 作業前に PR #44 `[codex] Renew announcement thumbnail phase 5 preset` が `main` に merge済みで、local `main` / `origin/main` が merge commit `e73f8b4555455df768643eb3222aefdb1bc20c69` を含むことを確認した
- `imagegen` skill + built-in `image_gen` toolで、`X告知画像` 用のPhase 5背景と文字なし個別assetを生成した。CLI fallback / true native transparency は使っていない
- Phase 5背景は `public/assets/images/thumbnail-editor/phase5/x-announcement-background-v1.png` として保存した。背景には大きな投稿カード / 情報パネルを初期MVPとして焼き込み、読める文字、ロゴ、SNS UI、X/Twitterロゴ、人物、キャラクター、実画面、日付バッジ、ラベル文字は入れていない
- #00ff00 chroma-key assetから背景除去し、文字なし個別assetをすべて `768 x 512` の透明PNGとして `public/assets/images/thumbnail-editor/decorations/phase5/` へ保存した。最終採用assetは `1 asset = 1 canvas` とし、同一canvas / 同一セーフボックスへ正規化した
  - `x-announcement-label-plaque-blue-uniform-cell.png`
  - `x-announcement-date-badge-blue-gold-uniform-cell.png`
  - `x-announcement-corner-ornament-gold-uniform-cell.png`
  - `x-announcement-soft-glint-cluster-blue-uniform-cell.png`
  - `x-announcement-label-plaque-ivory-candidate-uniform-cell.png` は未使用候補
- `lib/thumbnail-editor.ts` は `x_announcement` presetだけをPhase 5構造へ更新した。背景参照をPhase 5に切り替え、Phase 4投稿カードassetを外し、ラベル土台 / 日付バッジ / 角飾り / 小さな光を個別assetとして配置した
- `見出し` / `時刻` / `サブ` / `ラベル` は editable text layerとして維持し、`本文罫線` / `サブ下ライン` / `立ち絵guide枠` は shape layerとして残した
- `scripts/thumbnail-phase5-x-announcement-preset-contract.mjs` を追加し、Phase 5背景、個別asset、editable text layer、shape layer責務、個別assetが同一 `768 x 512` canvasであること、上下左右に最低76px以上の透明余白があることを確認できるようにした
- 既存 `scripts/thumbnail-phase3-preset-assets-contract.mjs` / `scripts/thumbnail-phase4-decoration-assets-contract.mjs` は、`x_announcement` がPhase 5へ移った前提に合わせて期待値を更新した
- 検証済み:
  - `node scripts/thumbnail-phase5-x-announcement-preset-contract.mjs` PASS
  - `node scripts/thumbnail-phase5-announcement-preset-contract.mjs` PASS
  - `node scripts/thumbnail-phase5-clip-preset-contract.mjs` PASS
  - `node scripts/thumbnail-phase4-decoration-assets-contract.mjs` PASS
  - `node scripts/thumbnail-phase3-preset-assets-contract.mjs` PASS
  - `node scripts/thumbnail-phase2-preset-assets-contract.mjs` PASS
  - `node scripts/thumbnail-phase1-preset-assets-contract.mjs` PASS
  - `node scripts/thumbnail-preset-apply-safety-contract.mjs` PASS
  - `node scripts/thumbnail-preset-discovery-contract.mjs` PASS
  - `node scripts/thumbnail-layer-management-contract.mjs` PASS
  - `node scripts/tool-handoff-contract.mjs` PASS
  - `node scripts/sns-split-image-maker-contract.mjs` PASS
  - `npm run lint` PASS
  - `npx tsc --noEmit` PASS
  - `git diff --check` PASS。LF -> CRLF warningのみ
  - `npm run build` PASS。worktree と root の lockfile 重複による Next.js workspace root 推定 warning は出たが、build は成功
- UI確認:
  - static outputを `localhost:3028` で配信し、Playwrightで `X告知画像` presetを適用。確認幅は 390 / 820 / 1024 / 1280 / 1366px
  - 各幅でcanvas非blank、水平overflow 0を確認。1024px以上ではPhase 5個別asset、shape layer、editable text layerがレイヤー一覧に残ることを確認
  - static outputではPhase 5 asset requestはすべて 200。Next static export のRSC prefetch `__next...txt?_rsc=` 404と、静的配信中の内部HEAD request abort、1280px確認時のGoogle Fonts request abortが出たが、今回追加assetの読み込み失敗ではない
  - 確認スクリーンショット: `output/playwright/phase5-x-announcement-final-390.png` / `phase5-x-announcement-final-820.png` / `phase5-x-announcement-final-1024.png` / `phase5-x-announcement-final-1280.png` / `phase5-x-announcement-final-1366.png`
  - Canvas export確認: `output/playwright/phase5-x-announcement-canvas-static-clean-1280x720.png`

2026-05-09 Phase 5 `ゲーム実況` preset renewal:

- 作業前に PR #45 `[codex] Renew x announcement thumbnail phase 5 preset` が `main` に merge済みで、local `main` が merge commit `1a251ba7528ffd13f57398df0581d9eb41c12e18` を含むことを確認した
- `main` 直作業を避け、`codex/thumbnail-phase5-game-live-preset` branch / `.worktrees/thumbnail-phase5-game-live-preset` worktreeで開始した
- `imagegen` skill + built-in `image_gen` toolで、`ゲーム実況` 用のPhase 5背景と文字なし個別asset sheetを生成した。CLI fallback / true native transparency は使っていない
- Phase 5背景は `public/assets/images/thumbnail-editor/phase5/game-live-background-v1.png` として保存した。背景には大きな左HUDパネルと右側の立ち絵差し替え余白を初期MVPとして焼き込み、読める文字、ロゴ、ゲームスクリーンショット、実UI、人物、キャラクター、コントローラーは入れていない
- #00ff00 chroma-key asset sheetから背景除去し、文字なし個別assetをすべて `768 x 512` の透明PNGとして `public/assets/images/thumbnail-editor/decorations/phase5/` へ保存した
  - `game-live-label-plaque-neon-uniform-cell.png`
  - `game-live-time-badge-cyan-uniform-cell.png`
  - `game-live-hud-corner-frame-uniform-cell.png`
  - `game-live-speed-accent-green-uniform-cell.png`
  - `game-live-soft-glint-cyan-candidate-uniform-cell.png` は未使用候補
- `lib/thumbnail-editor.ts` は `game_live` presetだけをPhase 5構造へ更新した。背景参照をPhase 5に切り替え、Phase 4 HUD系SVGを外し、ラベル土台 / 時刻バッジ土台 / HUD角 / スピードアクセントを個別assetとして配置した
- `見出し` / `時刻` / `サブ` / `ラベル` は editable text layerとして維持し、`時刻下ライン` / `ゲーム感ライン` / `立ち絵guide枠` は shape layerとして残した
- `scripts/thumbnail-phase5-game-live-preset-contract.mjs` を追加し、Phase 5背景、個別asset、editable text layer、shape layer責務、個別assetが同一 `768 x 512` canvasであること、上下左右に最低76px以上の透明余白があることを確認できるようにした
- 既存 `scripts/thumbnail-phase2-preset-assets-contract.mjs` / `scripts/thumbnail-phase4-decoration-assets-contract.mjs` は、`game_live` がPhase 5へ移った前提に合わせて期待値を更新した
- 検証済み:
  - `node scripts/thumbnail-phase5-game-live-preset-contract.mjs` PASS
  - `node scripts/thumbnail-phase5-x-announcement-preset-contract.mjs` PASS
  - `node scripts/thumbnail-phase5-announcement-preset-contract.mjs` PASS
  - `node scripts/thumbnail-phase5-clip-preset-contract.mjs` PASS
  - `node scripts/thumbnail-phase4-decoration-assets-contract.mjs` PASS
  - `node scripts/thumbnail-phase3-preset-assets-contract.mjs` PASS
  - `node scripts/thumbnail-phase2-preset-assets-contract.mjs` PASS
  - `node scripts/thumbnail-phase1-preset-assets-contract.mjs` PASS
  - `node scripts/thumbnail-preset-apply-safety-contract.mjs` PASS
  - `node scripts/thumbnail-preset-discovery-contract.mjs` PASS
  - `node scripts/thumbnail-layer-management-contract.mjs` PASS
  - `node scripts/tool-handoff-contract.mjs` PASS
  - `node scripts/sns-split-image-maker-contract.mjs` PASS
  - `npm run lint` PASS
  - `npx tsc --noEmit` PASS
  - `git diff --check` PASS。LF -> CRLF warningのみ
  - `npm run build` PASS。worktree と root の lockfile 重複による Next.js workspace root 推定 warning は出たが、build は成功
- UI確認:
  - static outputを `localhost:3029` で配信し、in-app browserで `ゲーム実況` presetを適用。1366pxでPhase 5背景、Phase 5個別asset、shape layer、editable text layerがレイヤー一覧に残ることと console error / warn 0件を確認
  - Playwrightで 390 / 820 / 1024 / 1280 / 1366px を確認。各幅でcanvas非blank、水平overflow 0。1024px以上ではPhase 5個別asset、shape layer、editable text layerがレイヤー一覧に残ることを確認
  - static outputでは Next static export のRSC prefetch `__next...txt?_rsc=` 404がconsole errorとして出たが、今回追加したPhase 5 asset requestの404ではない
  - 確認スクリーンショット: `output/playwright/phase5-game-live-final-390.png` / `phase5-game-live-final-820.png` / `phase5-game-live-final-1024.png` / `phase5-game-live-final-1280.png` / `phase5-game-live-final-1366.png`

- 2026-05-08 `コラボ` preset 単体polish:
  - `コラボ` だけを対象に、既存 Phase 2 背景 `collaboration-background.png` と `見出し` / `時刻` / `サブ` / `ラベル` の editable text layer を維持した
  - 専用抽象SVG assetとして `collaboration-label-band-base.svg` / `collaboration-time-badge-base.svg` / `collaboration-duo-guide-lines.svg` / `collaboration-connection-lines.svg` / `collaboration-soft-glints.svg` を追加した
  - 追加SVGには読める文字、ロゴ、人物、キャラクター、外部画像参照、`<text>` / `font-family` / `<image>` / `href=` を入れていない
  - ラベル帯と時刻バッジはSVG土台 + editable textへ置換し、見出しはコラボ配信向けに大きく読みやすくした
  - 2人分の立ち絵guideは右側に薄いframeを2つ残し、スポットライト、円形ステージ、点線arc、接続線を抽象SVGで補って背景との一体感を上げた
  - サブテキストは下部ライン内に収め、左右または右側複数人の立ち絵を置ける余白を優先した
  - 背景焼き込み、schema変更、public API変更、新しい `shapeType`、素材ライブラリUI変更、`tintColor` 変更、他プリセット定義は入れていない
  - 比較結果は `docs/active/THUMBNAIL_EDITOR_PHASE4_POLISH_REVIEW.md` の `コラボ` 行に記録した
  - 検証: `node scripts/thumbnail-phase4-decoration-assets-contract.mjs` PASS、`node scripts/thumbnail-phase1-preset-assets-contract.mjs` PASS、`node scripts/thumbnail-preset-apply-safety-contract.mjs` PASS、`node scripts/thumbnail-preset-discovery-contract.mjs` PASS、`node scripts/thumbnail-layer-management-contract.mjs` PASS、`node scripts/tool-handoff-contract.mjs` PASS、`node scripts/sns-split-image-maker-contract.mjs` PASS
  - 追加検証: `npm run lint` PASS、`npx tsc --noEmit` PASS、`git diff --check` PASS、`npm run build` PASS
  - Browser/Playwright確認: clean localStorage状態から `コラボ` presetを適用。390 / 820 / 1024 / 1280 / 1366px でcanvas非blank、水平overflow 0、console error / warn なし。1024px以上では追加小物asset `画像 2（コラボの控えめな光）` / `画像 3（2人立ち絵guideのスポット）` / `画像 4（接続線と下部ライン）` / `画像 6（ラベル帯）` / `画像 7（時刻バッジ）` と `見出し` / `時刻` / `サブ` / `ラベル` がレイヤー一覧に残ることを確認。canvas exportで見出し、時刻、サブ、ラベルの可読性と2人分の立ち絵guide余白を確認した

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

2026-05-05 Phase 2 背景候補作成メモ:

- PR #27 は `Thumbnail Editor Phase 1` 完了PRとして扱い、`配信告知` / `歌枠` / `週間予定` は今回触らない
- 次フェーズ候補を `ゲーム実況` / `コラボ` / `お知らせ` の3種に絞った
- `雑談` は `配信告知` と空気感が近いため後回し、`X告知画像` は縦横variantとSNS連携設計に合わせて扱う、`切り抜き` は動画フレーム主体の可能性が高いため後回しにする
- 背景画像は「背景画像 + 編集可能なテキスト / 枠 / 立ち絵ガイド」の方針を維持し、文字、人物、ロゴ、読めるUIは入れない
- 採用候補3枚を `docs/mockups/thumbnail-editor-phase2-candidates/` に保存した
- 初回生成のお知らせ背景は枠の焼き込みが強かったため保留し、枠なしの再生成版を採用候補にした

2026-05-05 Phase 2 モック / プリセット反映メモ:

- `ゲーム実況` / `コラボ` / `お知らせ` の完成モック3枚を `docs/mockups/thumbnail-editor-phase2-candidates/` に保存した
- 採用背景3枚を `public/assets/images/thumbnail-editor/phase2/` へ実装用 asset としてコピーした
- `ゲーム実況` / `コラボ` / `お知らせ` の背景レイヤーを public asset 参照へ変更し、背景レイヤーを locked 扱いにした
- 3プリセットへ、モックに合わせた編集可能な `見出し` / `時刻` / `サブ` / `ラベル`、立ち絵ガイド、時刻バッジ、本文パネルを追加 / 調整した
- コラボは2人用の左右立ち絵ガイド、お知らせは本文パネルと右側立ち絵挿入ガイドを editable shape layer として持つ
- 契約チェック `scripts/thumbnail-phase2-preset-assets-contract.mjs` を追加した

2026-05-06 Phase 3 背景候補作成メモ:

- PR #28 は Thumbnail Editor Phase 2 背景セットPRとして扱い、`ゲーム実況` / `コラボ` / `お知らせ` は今回触らない
- 残りプリセット候補として `雑談` / `切り抜き` / `X告知画像` の背景候補を1枚ずつ作成した
- 背景画像は「背景画像 + 編集可能なテキスト / 枠 / 立ち絵ガイド」の方針を維持し、文字、人物、ロゴ、読めるUI、権利物は入れない
- 採用候補3枚を `docs/mockups/thumbnail-editor-phase3-candidates/` に保存した
- 生成元は 16:9 相当だったが実寸が `1672x941` だったため、候補保存時に `1280x720` へ正規化した
- 背景候補をもとに、方向性確認用の完成モック3枚を同じディレクトリへ保存した
- モック内の文字、枠、動画フレーム、投稿カード風パネル、立ち絵配置ガイドは方向性確認用で、実装時は editable layer として分解する
- 採用背景3枚を `public/assets/images/thumbnail-editor/phase3/` へ実装用 asset としてコピーした
- `雑談` / `切り抜き` / `X告知画像` の背景レイヤーを public asset 参照へ変更し、背景レイヤーを locked 扱いにした
- 同3プリセットへ、モックに合わせた編集可能な `見出し` / `時刻` / `サブ` / `ラベル`、立ち絵ガイド、動画フレーム、投稿カード風パネルを追加 / 調整した
- 契約チェック `scripts/thumbnail-phase3-preset-assets-contract.mjs` を追加した
- 検証: `node scripts/thumbnail-phase3-preset-assets-contract.mjs` PASS、`node scripts/thumbnail-phase2-preset-assets-contract.mjs` PASS、`node scripts/thumbnail-phase1-preset-assets-contract.mjs` PASS、`node scripts/thumbnail-preset-apply-safety-contract.mjs` PASS、`node scripts/thumbnail-preset-discovery-contract.mjs` PASS、`node scripts/thumbnail-layer-management-contract.mjs` PASS、`node scripts/tool-handoff-contract.mjs` PASS、`node scripts/sns-split-image-maker-contract.mjs` PASS
- 追加検証: `npm run lint` PASS、`npx tsc --noEmit` PASS、`npm run build` PASS
- `npm run build` は PASS。worktree が親repo内にあるため Next.js の workspace root 推定 warning は表示された

2026-05-06 Phase 4 枠 / パネル / 小物アセット初回実装メモ:

- PR #29 後の次単位として、`雑談` / `切り抜き` / `X告知画像` の初回装飾だけを対象にした
- 枠 / パネル / バッジ / 立ち絵ガイドは画像化せず、`line` / `burst` / `frame` / `polygon` の shapeType と既存 text layer で扱う方針にした
- 画像assetは背景透過SVGに限定し、`public/assets/images/thumbnail-editor/decorations/phase4/` へ配置した
- 追加assetは、光粒、小さなきらめき、集中線、スピード線、矢印、角飾り、丸ドット点線の7点。読める文字、ロゴ、人物、キャラクター、外部画像参照は入れていない
- `雑談` へ光粒、小さなきらめき、やわらかい下線、frame化した立ち絵ガイドを追加した
- `切り抜き` へ集中線、スピード線、矢印アクセント、burst衝撃マーク、polygon強調ベース、frame化した動画フレームを追加した
- `X告知画像` へ淡い光粒、角飾り、丸ドット点線、line罫線、burst日付バッジアクセント、frame化した投稿カード / 立ち絵ガイドを追加した
- 参考調査は MDN Canvas 2D / SVG clip & mask / CSS border-image と、Hero Patterns / Haikei / css-doodle / pattern.css の生成手法とライセンス確認に留め、外部素材は直接流用していない
- 契約チェック `scripts/thumbnail-phase4-decoration-assets-contract.mjs` を追加した
- 検証: `node scripts/thumbnail-phase4-decoration-assets-contract.mjs` PASS、`node scripts/thumbnail-phase3-preset-assets-contract.mjs` PASS、`node scripts/thumbnail-phase2-preset-assets-contract.mjs` PASS、`node scripts/thumbnail-phase1-preset-assets-contract.mjs` PASS、`node scripts/thumbnail-preset-apply-safety-contract.mjs` PASS、`node scripts/thumbnail-preset-discovery-contract.mjs` PASS、`node scripts/thumbnail-layer-management-contract.mjs` PASS、`node scripts/tool-handoff-contract.mjs` PASS、`node scripts/sns-split-image-maker-contract.mjs` PASS
- 追加検証: `npm run lint` PASS、`npx tsc --noEmit` PASS、`git diff --check` PASS、`npm run build` PASS
- `npm run build` は PASS。worktree が親repo内にあるため Next.js の workspace root 推定 warning は表示された
- Browser確認:
  - `localhost:3002` の dev server で `雑談` / `切り抜き` / `X告知画像` のプリセット適用とキャンバス描画を確認した
  - 390 / 820 / 1024 / 1280 / 1366px で、各プリセットのキャンバスが非blankで描画され、ページ全体の水平overflowが0であることを確認した
  - clean reload 後の console error / warn なし。幅別確認中の `getImageData` readback warning は検証スクリプト由来

2026-05-06 Phase 4 未反映プリセット初期装飾メモ:

- PR #30 後の追加単位として、未反映だった `配信告知` / `歌枠` / `週間予定` / `ゲーム実況` / `コラボ` / `お知らせ` の6プリセットへ最低限の初期装飾を追加した
- 新規assetは追加せず、既存の `public/assets/images/thumbnail-editor/decorations/phase4/` SVGを再利用した
- `配信告知` は frame化した立ち絵ガイド、ラベル / 時刻周辺のline、控えめな光粒を追加した
- `歌枠` は frame化した立ち絵ガイド、sparkle / light粒子、見出し下lineを追加した
- `週間予定` は予定表フレーム、区切りline、軽いdot系SVGだけに抑えた
- `ゲーム実況` は frame化した立ち絵ガイド、polygon強調ベース、line、スピード線を追加した。権利物っぽいUIやアイコンは入れていない
- `コラボ` は左右立ち絵ガイドをframe化し、2人配置が分かるlineとsparkleを追加した
- `お知らせ` は本文パネルと立ち絵ガイドをframe化し、角飾りと罫線lineを控えめに追加した
- `scripts/thumbnail-phase4-decoration-assets-contract.mjs` は全9プリセットのPhase 4 asset参照、editable shapeType、draft normalization 維持を確認する内容へ拡張した
- 検証: `node scripts/thumbnail-phase4-decoration-assets-contract.mjs` PASS、`node scripts/thumbnail-phase3-preset-assets-contract.mjs` PASS、`node scripts/thumbnail-phase2-preset-assets-contract.mjs` PASS、`node scripts/thumbnail-phase1-preset-assets-contract.mjs` PASS、`node scripts/thumbnail-preset-apply-safety-contract.mjs` PASS、`node scripts/thumbnail-preset-discovery-contract.mjs` PASS、`node scripts/thumbnail-layer-management-contract.mjs` PASS、`node scripts/tool-handoff-contract.mjs` PASS、`node scripts/sns-split-image-maker-contract.mjs` PASS
- 追加検証: `npm run lint` PASS、`npx tsc --noEmit` PASS、`git diff --check` PASS、`npm run build` PASS
- Browser/CDP確認:
  - `localhost:3003` の dev server で `配信告知` / `歌枠` / `週間予定` / `ゲーム実況` / `コラボ` / `お知らせ` のプリセット適用とキャンバス描画を確認した
  - 390 / 820 / 1024 / 1280 / 1366px で、対象6プリセットのキャンバスが非blankで描画され、ページ全体の水平overflowが0であることを確認した
  - console error / warn なし。幅別確認中の `getImageData` readback warning は検証スクリプト側で除外した

2026-05-06 Phase 4 polish 比較調整メモ:

- 既存モックとの差分整理対象を、完成度が高い `配信告知` / `歌枠` / `週間予定` / `雑談` / `切り抜き` / `X告知画像` の6プリセットに絞った
- `ゲーム実況` / `コラボ` / `お知らせ` は、現時点のモックを基準にしないため今回は触っていない
- 背景asset、画像asset色変更、`tintColor`、素材ライブラリUI、装飾ON/OFF、背景への焼き込み、新規小物asset追加は行っていない
- `配信告知` は時刻バッジを `polygon` にして斜めバナー感を最小再現し、既存 `arrow-accent.svg` と光粒/ラベル周辺lineを再配置した
- `歌枠` は立ち絵frameの線幅/opacity、sparkle/light粒子、見出し下lineを控えめに調整した
- `週間予定` は背景側の予定表行枠を活かし、追加の行panelは入れず、曜日別テキストレイヤー構造と座標を維持したまま予定表frame/区切りlineだけを調整した
- `雑談` は右立ち絵guide、下線、光粒/sparkleの位置と透明度を調整し、モックの落ち着いた余白に寄せた
- `切り抜き` は動画frameを大きくし、強調ラベル/時刻バッジを `polygon` に変更し、集中線/スピード線/矢印/衝撃マークを再配置した
- `X告知画像` は投稿カード、角飾り、日付バッジ、立ち絵guideのopacityと線幅を抑え、文字可読性を優先した
- 比較結果は `docs/active/THUMBNAIL_EDITOR_PHASE4_POLISH_REVIEW.md` に記録した
- 検証: `node scripts/thumbnail-phase4-decoration-assets-contract.mjs` PASS、`node scripts/thumbnail-phase3-preset-assets-contract.mjs` PASS、`node scripts/thumbnail-phase2-preset-assets-contract.mjs` PASS、`node scripts/thumbnail-phase1-preset-assets-contract.mjs` PASS、`node scripts/thumbnail-preset-apply-safety-contract.mjs` PASS、`node scripts/thumbnail-preset-discovery-contract.mjs` PASS、`node scripts/thumbnail-layer-management-contract.mjs` PASS、`node scripts/tool-handoff-contract.mjs` PASS、`node scripts/sns-split-image-maker-contract.mjs` PASS
- 追加検証: `npm run lint` PASS、`npx tsc --noEmit` PASS、`git diff --check` PASS、`npm run build` PASS
- Browser/CDP確認:
  - `localhost:3004` の dev server で対象6プリセットを確認した
  - 390 / 820 / 1024 / 1280 / 1366px で、対象6プリセットのcanvasが非blankで描画され、ページ全体の水平overflowが0であることを確認した
  - clean isolated contextで `/tools/thumbnail-editor` を開き、console error / warn なしを確認した
  - canvas readback確認中の `getImageData` warning は検証スクリプト由来として除外した

- [ ] ペイント系ではなく、VTuber向けサムネ組み立てツールとして再定義する
  - 白紙から作るのではなく、用途別プリセットを選んで文字と立ち絵を差し替える体験に寄せる
  - 自由描画、素材検索、Canva的な汎用デザイン機能は優先しない
- [ ] 用途別プリセットを追加する
  - [x] 初回追加として、ゲーム実況、コラボ、お知らせ、週間予定、X告知画像を追加する
  - [x] Phase 1 完成モック対象として、配信告知、歌枠、週間予定を選定する
  - [x] Phase 3 背景候補として、雑談、切り抜き、X告知画像を保存する
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
  - [x] Phase 2 候補として `ゲーム実況` / `コラボ` / `お知らせ` の背景候補3枚を `docs/mockups/thumbnail-editor-phase2-candidates/` に保存する
  - [x] Phase 2 の完成モック3枚を作成し、同3プリセットへ背景 / ガイド / 主要テキストレイヤーを反映する
  - [x] Phase 3 候補として `雑談` / `切り抜き` / `X告知画像` の背景候補3枚を `docs/mockups/thumbnail-editor-phase3-candidates/` に保存する
  - [x] Phase 3 の完成モック3枚を作成し、同ディレクトリに保存する
  - [x] Phase 3 採用背景3枚を `public/assets/images/thumbnail-editor/phase3/` に実装用 asset として配置する
  - [x] Phase 3 の3プリセットへ背景 / ガイド / 主要テキストレイヤーを反映する
  - 生成素材は `docs/mockups` ではなく、実装用assetとして扱う場合の配置先とライセンスメモを決める
- [x] 枠 / パネル / 小物アセットの制作単位を決める
  - 基本方針:
    - 画像レイヤー系の小物は背景透過済みPNGまたはSVGとして作る
    - 枠 / パネル / バッジ / 立ち絵ガイドは、サイズ変更しやすい editable shape layer / text layer を優先し、原則として1枚画像にしない
    - 画像 asset は、shape だけでは表現しにくい粒子、光、集中線、手描き強調、角飾り、質感だけに絞る
  - Phase 4 候補画像 asset:
    - `雑談`: 光粒 / 小さなきらめき 3種、細い装飾ライン 2種、やわらかい下線 2種
    - `切り抜き`: 集中線 3種、衝撃マーク 4種、スピード線 3種、ギザギザ強調ベース 2種
    - `X告知画像`: 角飾り 4種、上品な罫線 3種、淡い光粒 2種、日付バッジ用アクセント 2種
    - 共通: 小さな星 / sparkle 4種、矢印 3種、丸ドット / 点線 3種
    - 初回は合計25〜30点程度に抑え、プリセット反映済みの3種で使うものから作る
    - [x] 初回実装は7点に絞り、プリセット初期レイヤーから参照する形で追加した
  - コード / shape layer で作る候補:
    - 立ち絵ガイド枠、動画フレーム、投稿カード風パネル、本文パネル、時刻バッジ、ラベル帯
    - 現行 `ThumbnailShapeLayer` は `rect` / `circle`、`fillColor`、`strokeColor`、`strokeWidth`、`borderRadius`、`rotation` で描画できる
    - 次に増やすなら `shapeType` に `polygon` / `line` / `burst` / `frame` のようなプリミティブを追加する
    - [x] 初回実装として `line` / `burst` / `frame` / `polygon` を追加した
    - Canvas 2D 実装候補は `roundRect` 相当、stroke/fill、shadow、linear/radial gradient、Path2D、clip、globalCompositeOperation
    - Web/CSS側の参考として、角丸グラデ枠は `border-image` より `background-clip` を使う方がよい。MDN でも `border-image` は `border-radius` が効かないため、角丸では背景レイヤー方式が推奨されている
    - 変形枠は `clip-path` / SVG `clipPath`、透過や切り抜き表現は `mask-image` / SVG mask を参考にする
    - ただし Thumbnail Editor は最終的に Canvas 2D 書き出しが必要なので、CSSをそのまま使うのではなく Canvas/SVG path に翻訳できる形で採用する
  - 外部素材 / コード調査メモ:
    - MDN `border-image`: 画像枠とグラデ枠の仕様確認。角丸との相性に注意
    - MDN `clip-path`: polygon/path/URL clipPath を使う変形枠の参考
    - MDN `mask-image`: alpha mask / gradient mask / SVG mask の参考。ただし file URL 制約があるため local server / public asset 前提
    - Hero Patterns: repeatable SVG background patterns の参考。直接流用する場合はライセンス確認が必要
    - Haikei: SVG / PNG export できる抽象波形・blob・scatter 系の参考。生成物の扱いとライセンスを確認してから使う
    - css-doodle: CSSでパターンを生成する参考。依存追加は避け、必要なら出力SVG/PNGを参考にする程度に留める
  - 実装順候補:
    - [x] 1. `shape` だけで表現する枠 / パネルを先にプリセットへ反映する
    - [x] 2. 透明PNG/SVGの小物 asset を `public/assets/images/thumbnail-editor/decorations/` に追加する
    - [x] 3. 装飾 asset の contract を作り、プリセットから参照する画像が存在すること、透明背景であること、サイズが過大でないことを確認する
    - [x] 4. 素材ライブラリUIへ出す前に、まずはプリセット内の初期レイヤーとしてだけ使う
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

- 2026-05-09 Phase 5 `雑談` preset:
  - 作業前に PR #47 `[codex] Renew collaboration thumbnail phase 5 preset` が `main` に merge済みで、`origin/main` が merge commit `32b38c5e21602cf922a413755376b7856e745252` を指すことを確認した
  - `task.md` / `docs/active/THUMBNAIL_EDITOR_PHASE4_POLISH_REVIEW.md` / 既存mock / assetを確認し、`雑談` は Phase 4 review で余白と可読性が安定し、歌枠より最小asset構成へ移しやすいため今回対象にした。対象は `雑談` のみで、全9プリセットへは広げていない
  - `codex/thumbnail-phase5-chatting-preset` branch / `.worktrees/thumbnail-phase5-chatting-preset` worktree で実装した
  - Phase 5背景 `public/assets/images/thumbnail-editor/phase5/chatting-background-v1.png` を追加した。背景には読める文字、ロゴ、人物、キャラクター、実画面、SNS UI、ラベル文字、時刻文字を入れていない
  - Phase 5個別assetとして `chatting-label-plaque-cozy-uniform-cell.png` / `chatting-time-badge-cozy-uniform-cell.png` / `chatting-soft-glow-dots-uniform-cell.png` を追加し、presetで使用した
  - 個別assetは built-in `image_gen` の chroma-key 出力から背景除去し、`768 x 512` canvas / 透明PNG / 最低76px以上の透明余白へ正規化した
  - `lib/thumbnail-editor.ts` は `chatting` presetだけをPhase 5構造へ更新し、`見出し` / `時刻` / `サブ` / `ラベル` は editable text layer として維持した
  - 立ち絵guide、下線、時刻アイコンは shape layer として残した。schema変更、public API変更、新しい `shapeType`、素材ライブラリUI変更、フォント追加、外部CDN依存、他preset変更は入れていない
  - 追加contract: `scripts/thumbnail-phase5-chatting-preset-contract.mjs`
  - 既存contract更新: `scripts/thumbnail-phase3-preset-assets-contract.mjs` は `chatting` がPhase 5へ移った前提に変更し、`scripts/thumbnail-phase4-decoration-assets-contract.mjs` は `chatting` をPhase 4 preset対象から外した。既存Phase 3背景 / Phase 4 assetファイル自体は残す
  - RED確認: 新規contractは実装前に `chatting uses the phase 5 generated background` で失敗し、実装後にPASSした
  - 検証: `node scripts/thumbnail-phase5-chatting-preset-contract.mjs` PASS、既存Phase 5 contract群 PASS、`node scripts/thumbnail-phase4-decoration-assets-contract.mjs` PASS、`node scripts/thumbnail-phase3-preset-assets-contract.mjs` PASS、`node scripts/thumbnail-phase2-preset-assets-contract.mjs` PASS、`node scripts/thumbnail-phase1-preset-assets-contract.mjs` PASS、`node scripts/thumbnail-preset-apply-safety-contract.mjs` PASS、`node scripts/thumbnail-preset-discovery-contract.mjs` PASS、`node scripts/thumbnail-layer-management-contract.mjs` PASS、`node scripts/tool-handoff-contract.mjs` PASS、`node scripts/sns-split-image-maker-contract.mjs` PASS、`npm run lint` PASS、`npx tsc --noEmit` PASS、`git diff --check` PASS、`npm run build` PASS
  - UI確認: static outputを `localhost:3031` で配信し、Playwrightで `雑談` presetを適用。390 / 820 / 1024 / 1280 / 1366px でcanvas非blank、horizontal overflow 0を確認。1024px以上ではPhase 5背景 / 個別asset / shape layer / editable text layerがレイヤー一覧に残ることを確認した。追加した Phase 5 asset request の404はなし。1024px以上では Next static export のRSC prefetch `__next...txt?_rsc=` 404がconsole errorとして出たが、追加assetの読み込み失敗ではない。pixel sampling時のみChromeのCanvas readback warningが出る
  - 確認スクリーンショット: `output/playwright/phase5-chatting-final-390.png` / `phase5-chatting-final-820.png` / `phase5-chatting-final-1024.png` / `phase5-chatting-final-1280.png` / `phase5-chatting-final-1366.png`
  - Canvas export確認: `output/playwright/phase5-chatting-canvas-static-clean-1280x720.png`
  - 追加調整: user確認後、元モックのほうが夜の部屋感とサムネ完成度が高かったため、Phase 5構造は維持したまま背景を暗めの室内奥行きへ再生成し、ラベル土台を細いカプセルへ差し替えた。時刻バッジ、見出し、サブ、右立ち絵guideも元モック寄りに縮めて再配置した。背景には引き続き読める文字、ロゴ、人物、キャラクター、実画面、SNS UI、人物シルエットを入れていない
  - 追加検証: `node scripts/thumbnail-phase5-chatting-preset-contract.mjs` PASS、`npm run build` PASS、static output `localhost:3033` で1366px spot checkを行い、canvas非blank、horizontal overflow 0、1024px以上のレイヤー残存、追加asset 404なしを確認した
- 2026-05-09 Phase 5 `コラボ` preset:
  - 作業前に PR #46 `[codex] Renew game live thumbnail phase 5 preset` が `main` に merge済みで、`origin/main` が merge commit `84160c9d317bebb2c47ef78411ad0e6c1de29959` を指すことを確認した
  - `codex/thumbnail-phase5-collaboration-preset` branch / `.worktrees/thumbnail-phase5-collaboration-preset` worktree で実装した
  - `コラボ` だけを対象に、参照モック `docs/mockups/thumbnail-editor-phase2-candidates/collaboration-mock-imagegen-2026-05-08.png` のステージ光、2人配置、大きな文字配置、時刻バッジ、サブ導線へ寄せた
  - Phase 5背景 `public/assets/images/thumbnail-editor/phase5/collaboration-background-v1.png` を追加した。背景には読める文字、ロゴ、人物、キャラクター、実画面、SNS UI、ラベル文字、時刻文字を入れていない
  - 追加調整: user確認後に `imagegen` で背景 / ラベル土台 / 時刻バッジ / 接続アクセントを再生成し、背景へステージ光と2人配置の大きな空間を焼き込んだ。2人guideスポットは人物シルエットや濁りが残らない透明PNGへ再正規化し、preset上では補助レイヤーとして低opacityにした
  - Phase 5個別assetとして `collaboration-label-plaque-warm-uniform-cell.png` / `collaboration-time-badge-rose-gold-uniform-cell.png` / `collaboration-duo-guide-spotlight-uniform-cell.png` / `collaboration-connection-accent-uniform-cell.png` をpresetで使用し、`collaboration-soft-glint-candidate-uniform-cell.png` は未使用候補として追加した
  - 個別assetは `768 x 512` canvas / 透明PNG / 最低76px以上の透明余白へ正規化した
  - `lib/thumbnail-editor.ts` は `collaboration` presetだけをPhase 5構造へ更新し、`見出し` / `時刻` / `サブ` / `ラベル` は editable text layer として維持した
  - 左右2人分のguideと二人配置ラインは shape layer として残し、2人guideスポット / 接続アクセントは個別asset layerとして残した
  - schema変更、public API変更、新しい `shapeType`、素材ライブラリUI変更、フォント追加、外部CDN依存、他preset変更は入れていない
  - 追加contract: `scripts/thumbnail-phase5-collaboration-preset-contract.mjs`
  - 既存contract更新: `scripts/thumbnail-phase2-preset-assets-contract.mjs` は `collaboration` がPhase 5へ移った前提に変更し、`scripts/thumbnail-phase4-decoration-assets-contract.mjs` は `collaboration` をPhase 4 preset対象から外した。Phase 4 assetファイル自体は残す
  - 検証: `node scripts/thumbnail-phase5-collaboration-preset-contract.mjs` PASS、`node scripts/thumbnail-phase5-game-live-preset-contract.mjs` PASS、`node scripts/thumbnail-phase5-x-announcement-preset-contract.mjs` PASS、`node scripts/thumbnail-phase5-announcement-preset-contract.mjs` PASS、`node scripts/thumbnail-phase5-clip-preset-contract.mjs` PASS、`node scripts/thumbnail-phase4-decoration-assets-contract.mjs` PASS、`node scripts/thumbnail-phase3-preset-assets-contract.mjs` PASS、`node scripts/thumbnail-phase2-preset-assets-contract.mjs` PASS、`node scripts/thumbnail-phase1-preset-assets-contract.mjs` PASS、`node scripts/thumbnail-preset-apply-safety-contract.mjs` PASS、`node scripts/thumbnail-preset-discovery-contract.mjs` PASS、`node scripts/thumbnail-layer-management-contract.mjs` PASS、`node scripts/tool-handoff-contract.mjs` PASS、`node scripts/sns-split-image-maker-contract.mjs` PASS、`npm run lint` PASS、`npx tsc --noEmit` PASS、`git diff --check` PASS、`npm run build` PASS
  - UI確認: static outputを `localhost:3030` で配信し、390 / 820 / 1024 / 1280 / 1366px でcanvas非blank、horizontal overflow 0を確認。追加調整後は worktree dev server `localhost:3000` でも同じ5幅を確認し、1024px以上ではPhase 5背景 / 個別asset / shape layer / editable text layerがレイヤー一覧に残ることを確認した。Phase 5 `collaboration` asset requestは404なし。Next static export のRSC prefetch `__next...txt?_rsc=` 404は出たが、追加assetの読み込み失敗ではない。pixel sampling時のみChromeのCanvas readback warningが出る
- 2026-05-08 `ゲーム実況` preset 単体polish:
  - `ゲーム実況` だけを対象に、既存 Phase 2 背景 `game-live-background.png` と `見出し` / `時刻` / `サブ` / `ラベル` の editable text layer を維持した
  - 専用抽象SVG assetとして `game-live-label-band-base.svg` / `game-live-time-banner-base.svg` / `game-live-hud-lines.svg` / `game-live-standee-guide-lines.svg` を追加した
  - 追加SVGには読める文字、ロゴ、人物、キャラクター、外部画像参照、`<text>` / `font-family` / `<image>` / `href=` を入れていない
  - ラベル帯と時刻バッジはSVG土台 + editable textへ置換し、見出しは白太字の読みやすさ優先で大型化した
  - 右立ち絵guideは専用HUD枠 + 薄いframe guideへ分離し、立ち絵配置余白を残しながらゲームHUD感を強めた
  - サブテキストは下部に余白を取って中央寄せにし、下部スピード線や時刻バッジと重なりすぎない配置にした
  - 背景焼き込み、schema変更、public API変更、新しい `shapeType`、素材ライブラリUI変更、`tintColor` 変更、他プリセット定義は入れていない
  - 比較結果は `docs/active/THUMBNAIL_EDITOR_PHASE4_POLISH_REVIEW.md` の `ゲーム実況` 行に記録した
  - 検証: `node scripts/thumbnail-phase4-decoration-assets-contract.mjs` PASS、`node scripts/thumbnail-phase1-preset-assets-contract.mjs` PASS、`node scripts/thumbnail-preset-apply-safety-contract.mjs` PASS、`node scripts/thumbnail-preset-discovery-contract.mjs` PASS、`node scripts/thumbnail-layer-management-contract.mjs` PASS、`node scripts/tool-handoff-contract.mjs` PASS、`node scripts/sns-split-image-maker-contract.mjs` PASS
  - 追加検証: `npm run lint` PASS、`npx tsc --noEmit` PASS、`npm run build` PASS
  - Browser確認: clean localStorage状態から `ゲーム実況` presetを適用。390 / 820 / 1024 / 1280 / 1366px でcanvas非blank、水平overflow 0を確認。1024px以上では追加小物asset `画像 2（ゲームHUDの線）` / `画像 3（下部スピード線）` / `画像 4（右立ち絵guideのHUD枠）` / `画像 5（ラベル帯）` / `画像 6（時刻バッジ）` と `見出し` / `時刻` / `サブ` / `ラベル` がレイヤー一覧に残ることを確認。通常ロード直後の console error / warn なし。pixel sampling時のみChromeのCanvas readback warningが出る
- 2026-05-08 `お知らせ` preset 単体polish:
  - `お知らせ` だけを対象に、既存 Phase 2 背景 `announcement-background.png` と `見出し` / `時刻` / `サブ` / `ラベル` の editable text layer を維持した
  - 専用抽象SVG assetとして `announcement-label-band-base.svg` / `announcement-date-badge-base.svg` / `announcement-guide-lines.svg` / `announcement-soft-glints.svg` を追加した
  - 追加SVGには読める文字、ロゴ、人物、キャラクター、外部画像参照、`<text>` / `font-family` / `<image>` / `href=` を入れていない
  - ラベル帯と日付バッジはSVG土台 + editable textへ置換し、見出しは公式告知向けに読みやすく大型化した
  - 右立ち絵guideは専用細線assetと薄いframe guideへ分離し、fill / stroke の主張を下げて背景の金線と馴染む配置にした
  - サブテキストは日付バッジ下に余白を取って中央寄せにし、下線は控えめな金線にした
  - 背景焼き込み、schema変更、public API変更、新しい `shapeType`、素材ライブラリUI変更、`tintColor` 変更、他プリセット定義は入れていない
  - 比較結果は `docs/active/THUMBNAIL_EDITOR_PHASE4_POLISH_REVIEW.md` の `お知らせ` 行に記録した
  - 検証: `node scripts/thumbnail-phase4-decoration-assets-contract.mjs` PASS、`node scripts/thumbnail-phase1-preset-assets-contract.mjs` PASS、`node scripts/thumbnail-preset-apply-safety-contract.mjs` PASS、`node scripts/thumbnail-preset-discovery-contract.mjs` PASS、`node scripts/thumbnail-layer-management-contract.mjs` PASS、`node scripts/tool-handoff-contract.mjs` PASS、`node scripts/sns-split-image-maker-contract.mjs` PASS
  - 補助検証: `node scripts/thumbnail-phase2-preset-assets-contract.mjs` PASS
  - 追加検証: `npm run lint` PASS、`npx tsc --noEmit` PASS、`git diff --check` PASS、`npm run build` PASS
  - Browser/Playwright確認: clean localStorage状態から `お知らせ` presetを適用。390 / 820 / 1024 / 1280 / 1366px でcanvas非blank、水平overflow 0、console error / warn なし。1024px以上では追加小物asset `画像 2（控えめな金色グリント）` / `画像 3（右立ち絵guideの細線）` / `画像 5（ラベル帯）` / `画像 6（日付バッジ）` と `見出し` / `時刻` / `サブ` / `ラベル` がレイヤー一覧に残ることを確認。42% zoomの全体表示で見出し、時刻、サブ、ラベルの可読性と右立ち絵枠の余白を確認した
- 2026-05-08 `雑談` preset 単体polish:
  - `雑談` だけを対象に、既存 Phase 3 背景と `見出し` / `時刻` / `サブ` / `ラベル` の editable text layer を維持した
  - 新規assetは追加せず、既存 `soft-light-particles.svg` / `sparkle-small.svg` の配置とopacityだけを控えめに調整した
  - 立ち絵guideは右側へ広げ、fill / stroke の主張を下げて、立ち絵を置きやすい薄い余白にした
  - 見出しは読みやすさ優先で少し大型化し、stroke / shadow を暖色寄りに整えた
  - 時刻バッジは横幅、角丸、strokeを調整し、既存shapeだけで小さな時計ディテールを追加した
  - サブテキストは下へ逃がして余白を確保し、下線とsparkle密度は歌枠より控えめにした
  - 背景焼き込み、schema変更、public API変更、新しい `shapeType`、素材ライブラリUI変更、`tintColor` 変更、他プリセット定義は入れていない
  - 比較結果は `docs/active/THUMBNAIL_EDITOR_PHASE4_POLISH_REVIEW.md` の `雑談` 行に記録した
  - 検証: `node scripts/thumbnail-phase4-decoration-assets-contract.mjs` PASS、`node scripts/thumbnail-phase1-preset-assets-contract.mjs` PASS、`node scripts/thumbnail-preset-apply-safety-contract.mjs` PASS、`node scripts/thumbnail-preset-discovery-contract.mjs` PASS、`node scripts/thumbnail-layer-management-contract.mjs` PASS、`node scripts/tool-handoff-contract.mjs` PASS、`node scripts/sns-split-image-maker-contract.mjs` PASS
  - 追加検証: `npm run lint` PASS、`npx tsc --noEmit` PASS、`git diff --check` PASS、`npm run build` PASS
  - Browser確認: clean localStorage状態から `雑談` presetを確認。390 / 820 / 1024 / 1280 / 1366px でcanvas非blank、水平overflow 0、console error / warn なし。1024px以上では既存小物asset `画像 2（光粒）` / `画像 3（小さなきらめき）` と `見出し` / `時刻` / `サブ` / `ラベル` がレイヤー一覧に残ることを確認。canvas表示で見出し、時刻、サブ、ラベルの可読性と右立ち絵枠の余白を確認した
- 2026-05-07 `歌枠` preset 単体polish:
  - `歌枠` だけを対象に、Phase 1 背景と `見出し` / `時刻` / `サブ` / `ラベル` の editable text layer を維持した
  - 専用抽象SVG assetとして `karaoke-label-band-base.svg` / `karaoke-title-glow-backplate.svg` / `karaoke-time-banner-base.svg` / `karaoke-ornate-frame.svg` / `karaoke-spark-field.svg` を追加した
  - 専用透過PNG assetとして `imagegen` 生成素材から `karaoke-ornament-note-pink.png` / `karaoke-ornament-note-cyan.png` / `karaoke-ornament-note-gold.png` / `karaoke-ornament-star-pink.png` / `karaoke-ornament-star-gold.png` / `karaoke-ornament-sparkle-cluster-pink-cyan.png` を切り出した。`歌枠` presetでは `note-cyan` / `note-gold` / `star-pink` / `star-gold` / `sparkle-cluster-pink-cyan` を個別レイヤーとして使用する
  - 追加の `imagegen` 生成素材から `karaoke-sparkle-dust-white-gold.png` / `karaoke-sparkle-dust-pink-cyan.png` / `karaoke-glint-single-soft-white.png` を作成し、小さい星/点のきらめきと淡い光粒の役割をPNGへ置換した
  - 個別透過PNGは回転時に発光や粒子が見切れないよう、元シートから再切り出しして各辺に透明余白を確保し、preset上の小物レイヤー枠も同じ中心位置のまま少し拡大した
  - 追加SVGには読める文字、ロゴ、人物、キャラクター、外部画像参照、音符・マイク・譜面などの強い記号小物、`<text>` / `font-family` / `<image>` / `href=` を入れていない
  - ラベル帯と時刻バッジはSVG土台 + editable textへ置換し、右立ち絵frameは装飾SVG + 薄いeditable frame guideに分離した
  - 見出し背面グロー、sparkle/light粒子、見出し下ライン、サブ文字位置を調整し、右立ち絵枠の余白を維持した
  - `ゲーム実況` / `コラボ` / `お知らせ`、素材ライブラリUI、画像asset色変更、`tintColor`、装飾ON/OFF、背景焼き込み、新しい `shapeType`、public API / schema は変更していない
  - 比較結果は `docs/active/THUMBNAIL_EDITOR_PHASE4_POLISH_REVIEW.md` の `歌枠` 行に記録した
  - 検証: `node scripts/thumbnail-phase4-decoration-assets-contract.mjs` PASS、`node scripts/thumbnail-phase1-preset-assets-contract.mjs` PASS、`node scripts/thumbnail-preset-apply-safety-contract.mjs` PASS、`node scripts/thumbnail-preset-discovery-contract.mjs` PASS、`node scripts/thumbnail-layer-management-contract.mjs` PASS、`node scripts/tool-handoff-contract.mjs` PASS、`node scripts/sns-split-image-maker-contract.mjs` PASS
  - 追加検証: `npm run lint` PASS、`npx tsc --noEmit` PASS、`git diff --check` PASS、`npm run build` PASS
  - Browser確認: clean localStorage状態から `歌枠` presetを確認。390 / 820 / 1024 / 1280 / 1366px でcanvas非blank、水平overflow 0。1024px以上では追加小物assetと `見出し` / `時刻` / `サブ` / `ラベル` がレイヤー一覧に残ることを確認。canvas exportで見出し、時刻、ラベル、サブの可読性と右立ち絵枠の余白を確認した
  - 補足: `out/` 静的配信では 1024px以上で Next static export のRSC prefetch `.txt?_rsc=` が404としてconsoleに出る。今回追加したSVG / 背景 / JSの読み込み失敗ではなく、390 / 820pxでは同404も出ていない
  - 追加調整: 大きい四芒星と音符SVGがやや玩具っぽく見えたため、`karaoke-spark-field.svg` / `karaoke-title-glow-backplate.svg` / `karaoke-label-band-base.svg` / `karaoke-time-banner-base.svg` から音符記号に見えるSVG要素を外した。全面PNG overlayもまだSVG感が残ったため削除し、単体背景透過PNGの星 / 音符 / sparkle clusterを小物レイヤーとして配置する構成に変更した
  - 追加調整2: `karaoke-spark-field.svg` から小さい星/点を外し、抽象三角片と曲線/ラインだけに絞った。`歌枠` preset内の `soft-light-particles.svg` 使用はやめ、`white-gold dust` / `pink-cyan dust` / `single glint` の背景透過PNGレイヤーへ置換した
  - 追加調整3: 左下の白金小粒きらめきはopacityと表示枠を少し抑え、右側のピンクシアン小粒きらめきは立ち絵枠内から外周寄りへ移動した。サブテキストは下端の窮屈さを避けるため14px上げた
  - 追加Browser確認: worktree dev server `localhost:3000` で `歌枠` の新規キャンバスを作成し、単体背景透過PNG小物込みでcanvas描画とレイヤー残存を確認。console error / warn なし。確認スクリーンショットは `output/playwright/karaoke-imagegen-ornaments-mobile-3000.png` / `output/playwright/karaoke-imagegen-dust-replacement-3000.png`
- 2026-05-06 `配信告知` preset polish:
  - 既存 Phase 1 背景と `見出し` / `時刻` / `サブ` / `ラベル` のテキストレイヤー構造は維持する
  - 配信告知専用の抽象SVG assetとして `stream-emphasis-bursts.svg` / `stream-tech-corner-frame.svg` / `stream-tech-dash-row.svg` を追加する
  - `stream_announce` から切り抜き寄りの `arrow-accent.svg` 流用を外し、斜め時刻バッジ、ラベル横HUD線、見出し強調片、立ち絵枠角飾りを再配置する
  - 背景asset、画像asset色変更、`tintColor`、素材ライブラリUI、装飾ON/OFF、背景への焼き込みは入れない
  - 検証: `node scripts/thumbnail-phase4-decoration-assets-contract.mjs` PASS、`node scripts/thumbnail-phase3-preset-assets-contract.mjs` PASS、`node scripts/thumbnail-phase2-preset-assets-contract.mjs` PASS、`node scripts/thumbnail-phase1-preset-assets-contract.mjs` PASS、`node scripts/thumbnail-preset-apply-safety-contract.mjs` PASS、`node scripts/thumbnail-preset-discovery-contract.mjs` PASS、`node scripts/thumbnail-layer-management-contract.mjs` PASS、`node scripts/tool-handoff-contract.mjs` PASS、`node scripts/sns-split-image-maker-contract.mjs` PASS
  - 追加検証: `npm run lint` PASS、`npx tsc --noEmit` PASS、`git diff --check` PASS、`npm run build` PASS
  - Browser確認: worktree dev server `localhost:3000` で `配信告知` presetを確認。390 / 820 / 1024 / 1280 / 1366px でcanvas非blank、水平overflow 0、console error / warn なし。1024px以上では専用assetレイヤーと既存テキストレイヤーがレイヤー一覧に残ることを確認。390 / 820pxでは設定パネルの表示仕様によりレイヤー一覧が常時露出しないため、編集可能レイヤー維持はcontractで確認。
- 2026-05-06 `配信告知` preset 2回目polish:
  - 背景焼き込みなし、テキスト編集可能維持のまま、モック再現度をさらに上げる方針にした
  - `stream-title-glow-backplate.svg` / `stream-time-banner-cap.svg` / `stream-star-sparks.svg` を追加し、見出し背面グロー、時刻バッジ右端、星光りを小物assetで補う
  - `stream-emphasis-bursts.svg` は線や小粒を減らし、大きい三角アクセント寄りに調整する
  - `stream_announce` は見出し大型化、ラベル帯の横長カプセル化、時刻バッジの横長/斜め化、右立ち絵枠の発光強化を行う
  - 背景asset、画像asset色変更、`tintColor`、素材ライブラリUI、装飾ON/OFF、新しい `shapeType` は入れない
  - 検証: `node scripts/thumbnail-phase4-decoration-assets-contract.mjs` PASS、`node scripts/thumbnail-phase1-preset-assets-contract.mjs` PASS、`node scripts/thumbnail-preset-apply-safety-contract.mjs` PASS、`node scripts/thumbnail-preset-discovery-contract.mjs` PASS、`node scripts/thumbnail-layer-management-contract.mjs` PASS、`node scripts/tool-handoff-contract.mjs` PASS、`node scripts/sns-split-image-maker-contract.mjs` PASS
  - 追加検証: `npm run lint` PASS、`npx tsc --noEmit` PASS、`git diff --check` PASS、`npm run build` PASS
  - Browser確認: clean sessionで `配信告知` presetを確認。390 / 820 / 1024 / 1280 / 1366px でcanvas非blank、水平overflow 0、console error / warn なし。1024px以上では追加小物assetと既存テキストレイヤーがレイヤー一覧に残ることを確認。canvas書き出しで、背景焼き込みなしのまま見出し/時刻/ラベル/サブの可読性と右立ち絵枠の余白を確認。
- 2026-05-07 `配信告知` time/label SVG polish:
  - `図形 1（時刻バッジ）` と `画像 10（時刻バッジ右端キャップ）` の分離をやめ、`stream-time-banner-base.svg` の1枚SVG土台へ置き換える
  - `図形 2（ラベル帯）` も `stream-label-band-base.svg` の1枚SVG土台へ置き換え、ラベル文字は `テキスト 4（ラベル）` のeditable layerとして維持する
  - 将来の色変更機能を想定し、SVGはメイン色/サブ色/白ハイライト/濃色影の役割が分かれる単純なベクター構造に留める
  - 背景asset、画像asset色変更、`tintColor`、素材ライブラリUI、装飾ON/OFF、新しい `shapeType` は入れない
  - SVG内のfilter依存は避け、透明度を変えた同形状の重ね描きで発光を表現する
  - 検証: `node scripts/thumbnail-phase4-decoration-assets-contract.mjs` PASS、`node scripts/thumbnail-phase1-preset-assets-contract.mjs` PASS、`node scripts/thumbnail-preset-apply-safety-contract.mjs` PASS、`node scripts/thumbnail-preset-discovery-contract.mjs` PASS、`node scripts/thumbnail-layer-management-contract.mjs` PASS、`node scripts/tool-handoff-contract.mjs` PASS、`node scripts/sns-split-image-maker-contract.mjs` PASS
  - 追加検証: `npm run lint` PASS、`npx tsc --noEmit` PASS、`git diff --check` PASS、`npm run build` PASS
  - Browser確認: clean localStorage状態から `配信告知` presetを確認。390 / 820 / 1024 / 1280 / 1366px でcanvas非blank、水平overflow 0。1024px以上では `画像 10（ラベル帯）` / `画像 11（時刻バッジ）` と既存テキストレイヤーがレイヤー一覧に残ることを確認。console error / warn は通常ロード直後に0件、pixel sampling時のみChromeのCanvas readback warningが出る。
- `task.md` は現在の作業と次アクションに絞る
- 完了済みの実装ログ、検証ログ、PRプロンプトは月次 archive に移す
- 3ツールの仕上げ方針を追加するときは、実装タスクとマネタイズ判断を混ぜすぎない
