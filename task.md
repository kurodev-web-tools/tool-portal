# task.md

## 現在の前提

- このリポジトリは `V Streamer Tools` のMVPを段階実装する
- 現在のMVP到達点は `Portal + Tools Index + Schedule Calendar`
- 公開前提は `Cloudflare Pages`

## 履歴参照

- 完了済みタスクの履歴は `docs/archive/TASK_HISTORY_2026-04.md` を参照する

## 現在のアクティブタスク

### ポータル最適化の残確認

- [ ] 幅別回帰確認を実施する
  - 対象幅: 390 / 820 / 1024 / 1280 / 1366
  - 対象ページ: `/` / `/tools`
  - 観点: HOME/TOOLS間遷移、Schedule Calendar導線、テーマ切替、フィルタ操作性、カード可読性

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

## MVP後の進め方（2026-04-29更新）

### フェーズ1: Schedule Calendar をβ実用レベルまで仕上げる（優先）

- [x] 予定編集体験を完成させる
  - 予定の追加・編集・削除・複製を右パネルの予定管理から実行できるようにした
  - PCの週 / 日表示で予定をドラッグして日時移動、月表示で日付移動できるようにした
  - PCの週 / 日表示ではドラッグ中に `ここに移動 HH:MM - HH:MM` の移動先ガイドを表示するようにした
  - Undo挙動は削除、移動、編集保存後の復元toastに統一し、編集中のリセットは保存前内容の破棄として整理した
  - モバイル/タブレット縦のボトムシートでは予定管理のsticky操作を削除/保存に絞り、複製/リセットはフォーム内の通常操作へ移した
- [x] 繰り返し予定の最小対応を追加する
  - 毎日 / 毎週の繰り返しをMVP範囲で実装した
  - 例外日処理、終了日の詳細指定、シリーズ一括編集は未対応としてUIと `docs/SCHEDULE_CALENDAR_README.md` に明示した
- [x] 検索・フィルタを追加する
  - タイトル検索、カテゴリ、プラットフォーム、期間、並び順の予定一覧フィルタを維持し、モバイルとPCで同じ `eventFilters` state を使う形に整理した
- [x] バックアップ運用を固める
  - JSONエクスポート/インポートを `バックアップ作成` / `バックアップ復元` 表記に変更し、復元失敗時に既存データを保持する説明をUIに追加した
  - 破損データの復旧フローを `docs/SCHEDULE_CALENDAR_README.md` に追記した

#### 小フェーズ: 予定詳細の確認導線を追加する（2026-04-30）

- [x] PC表示で予定hover詳細プレビューを追加する
  - 予定の日時、カテゴリ、プラットフォーム、繰り返し、メモ全文を読むだけのプレビューとして表示する
  - hoverプレビューには編集 / 削除などの操作ボタンを置かない
- [x] タブレット縦 / モバイル表示で予定詳細ボトムシートを追加する
  - 予定タップ時はまず詳細ビューを表示する
  - 詳細ビュー下部の `編集する` から既存の予定管理フォームへ切り替える
  - 削除は詳細ビューに置かず、編集フォーム側に残す
- [ ] 幅別実見確認を実施する
  - 対象幅: 390 / 820 / 1024 / 1366
  - 観点: PC hover詳細、390 / 820 の詳細ボトムシート、`編集する` 後のフォーム切替、既存の保存 / 削除導線
  - 2026-04-30追加修正:
    - PC hover詳細は予定セル固定の左下表示ではなく、列位置と時間帯に応じて左右 / 上下を切り替えるよう修正した
    - 週表示は端の曜日で画面外へ出にくいよう、日曜/月曜は右側、金曜/土曜は左側、18時以降は上側に表示する
    - 日表示はカレンダービュー外へ出ないよう、左右表示をやめて予定ブロック中央の上 / 下に表示する
    - 月表示は左右配置に加え、上3行は下側、下3行は上側に表示する
    - 1023px以下では新規予定の保存成功後にボトムシートを自動で閉じるようにした
      - 既存予定の編集保存は、継続編集や削除操作を妨げないよう従来どおり開いたままにする
      - browser-useでページ再読み込み後の console error / warn なしを確認した
      - 未確認: 実機幅 390 / 820px での新規保存後クローズ実操作
  - 実施: `git diff --check`（空白エラーなし。CRLF警告のみ）
  - 未実施: `npx tsc --noEmit` / `npm run lint`
    - 理由: このCodex環境ではNode起動時に `Could not determine Node.js install directory` / `Assertion failed: ncrypto::CSPRNG(nullptr, 0)` で停止する
  - 未実施: in-app browser / Chrome DevTools 実見
    - 理由: browser-use は `failed to write kernel assets: 指定されたパスが見つかりません。`、Chrome DevTools は `Transport closed` で接続できない
  - 2026-04-30 browser-use再確認:
    - `http://localhost:3000/tools/schedule-calendar/` に接続でき、ページ再読み込み後の console error / warn はなし
    - 週表示の月曜20時予定は、詳細プレビューが予定の上側かつ右寄りに表示されることを確認した
    - 週表示の土曜20時予定は、詳細プレビューが予定の上側かつ左寄りに表示され、右パネルへはみ出さないことを確認した
    - 日表示の20時予定は、詳細プレビューがカレンダー外の右側ではなく予定ブロック上側に表示されることを確認した
    - 月表示の上段土曜予定は、詳細プレビューが左側かつ下側に表示されることを確認した
    - 未確認: 月表示の下3行予定の上側表示、390 / 820pxの詳細ボトムシート
    - 補足: 月表示下段確認用の新規予定作成を試したが、UI上は現在選択中の5/2へ追加されたように見えたため、下段配置の実見確認は未完了

#### フェーズ1検証メモ（2026-04-29）

- 実施: `git diff --check`（空白エラーなし。CRLF警告のみ）
- 実施: in-app browser `http://localhost:3001/tools/schedule-calendar/`
  - console error / warn なし
  - 予定追加、毎日繰り返し2件作成、複製、削除toast、`元に戻す` 復元を確認
  - 設定 > データ管理で `バックアップ作成` / `バックアップ復元` と復元失敗時の既存データ保持説明を確認
  - iframe幅ハーネスで `390 / 820 / 1024 / 1366` の基本表示を視覚確認
    - `390 / 820`: モバイル統合UI、下部タブ表示
    - `1024`: タブレット2ペイン、右パネル4タブ表示
    - `1366`: PC2ペイン、左ナビ + 右パネル表示
- 未実施: `npx tsc --noEmit` / `npm run lint` / `npm run build`
  - 理由: このCodex環境ではNode起動時に `Could not determine Node.js install directory` / `Assertion failed: ncrypto::CSPRNG(nullptr, 0)` で停止する
- 未実施: 実ブラウザ上のPCドラッグ日時移動、バックアップJSONの実復元
  - 補足: CUAのdrag操作ではHTML5 drag/dropが発火せず、時刻変更と移動先ガイドの実操作確認は未完了。ページ再読み込み後のconsole error / warnはなし

### フェーズ2: 公開最小セット（v0）を固定する

- [x] 公開対象を `Portal + Tools Index + Schedule Calendar` に固定し、他ツールは準備中導線で統一する
  - `/` のhero文言を公開最小セット前提へ変更し、`/tools` と `/tools/schedule-calendar` への導線を明示した
  - `/tools` の説明文と準備中カードのCTAを、利用可能導線と混同しない表記へ整理した
  - 準備中ツールの個別URLは `/tools` に寄せ、未実装ページへ誘導しない形にした
- [x] 公開前チェックリストを作成する
  - ページ導線、レスポンシブ、基本SEO、404/500相当の表示方針
  - Cloudflare配信時の `_headers` / 静的成果物の確認
  - 追加: `docs/PRELAUNCH_CHECKLIST_V0.md`
- [x] フィードバック導線を追加する
  - 不具合報告と要望収集の入口を `/` または `/tools` に設置する
  - `/` と `/tools` に共通の「不具合報告 / 要望」入口を追加した
  - 当面は宛先未固定の `mailto:` 導線として、利用者側のメールクライアントで送信先を指定できる暫定運用にした

#### フェーズ2検証メモ（2026-04-30）

- 実施: `git diff --check`
  - 結果: 空白エラーなし。CRLF警告のみ
- 実施: 文言・導線の静的確認
  - `詳細を見る` / `どうぞお楽しみ` / `順次追加` の過剰期待を生む文言が、対象ファイル内に残っていないことを確認した
  - 準備中ツールの `href` が `/tools` に統一されていることを確認した
- 実施（ユーザー環境）: `npm ci`
  - 結果: 394 packages installed
- 実施（ユーザー環境）: `npm run lint`
  - 結果: `.worktrees/phase2-public-minimum-set/.next/**` 配下の生成JSをESLintが拾い、Next.js / React内部生成コードに対するlint errorで失敗した
  - 対応: `eslint.config.mjs` の ignore に `.worktrees/**` を追加した
  - 再実行結果: 成功
- 実施（ユーザー環境）: `npx tsc --noEmit`
  - 結果: 成功
- 実施（ユーザー環境）: `npm run build`
  - 結果: 成功。`next build --webpack` で `/` / `/_not-found` / `/tools` / `/tools/schedule-calendar` がstatic prerenderされた
- 未実施（Codex環境）: `npm ci` / `npm run lint` / `npx tsc --noEmit` / `npm run build`
  - 理由: このCodex環境ではNode起動時に `Could not determine Node.js install directory` / `Assertion failed: ncrypto::CSPRNG(nullptr, 0)` で停止する
  - 補足: バンドルNodeでも `crypto` 初期化時に同じ `ncrypto::CSPRNG(nullptr, 0)` で停止した
- 実施: browser-use in-app browser確認 `/` / `/tools` / `/tools/schedule-calendar`
  - 2026-04-30追加確認: `http://localhost:3000/` のユーザー起動dev serverに接続し、browser-useで現在タブを取得できることを確認した
  - `/` / `/tools` / `/tools/schedule-calendar` のURL、title、主要文言をDOM上で確認した
  - `/` の `ツール一覧を見る` CTAはクリックで `/tools/` へ遷移することを確認した
  - `/tools` から `/tools/schedule-calendar/` へ遷移できることを確認した
  - `/tools` の準備中カードはdisabled buttonとして表示され、未実装個別URLへ遷移しないことを確認した
  - `/tools` の `メールで送る` は `mailto:?subject=V%20Streamer%20Tools%20feedback` を指すことを確認した
  - console: `/` / `/tools` / `/tools/schedule-calendar` で error / warn なし
  - 未確認: browser-use本体でviewportを直接 `390 / 820 / 1024 / 1366` に変更するAPIが確認できなかったため、今回の追加確認では幅別リサイズ実見は未実施
  - 2026-04-30追加修正:
  - PC表示の `予定一覧` タブで、予定行hover時の詳細プレビューを削除した
    - 理由: 右パネル内で常に下側に表示され、見切れや不要なスクロールを発生させていたため
    - 予定カード全体クリックは廃止し、`詳細` / `閉じる` のアコーディオンボタンと `編集` ボタンを分けた
    - `詳細` は一覧内で日時、カテゴリ、媒体、繰り返し、メモを展開し、`編集` は既存どおり予定管理へ反映する
  - `1023px以下` で既存予定を編集保存した場合も、保存後にボトムシートを閉じるよう変更した
    - 新規予定保存後のクローズ挙動と揃え、次の予定選択や一覧作業へ戻りやすくする
  - 削除Undo後は、復元した予定を選択状態に戻しつつ、ボトムシートは開かないよう変更した
    - Undoは編集導線ではなく復元操作として扱い、一覧やカレンダー上の次操作を妨げない
  - 日付 / 時間入力を、OS依存のnative pickerからアプリ内ポップオーバーへ変更した
    - 予定管理フォームの日付は小型カレンダーで選択する
    - 予定管理フォームの開始時間 / 終了時間と、設定の既定開始時刻はアプリ内のロール型時刻候補パネルで選択する
    - 分は5分刻みを基本にする
    - 時刻パネルは入力欄幅に縛らず、時/分の2列ロールを広めのポップオーバーで表示する
    - 開始時間は入力欄左端、終了時間は入力欄右端に合わせて表示し、開始時間パネルがカレンダー側へ隠れないようにした
    - 無限ロール風のスクロール補正は不安定になりやすいため取りやめ、有限ロールに戻した
    - 時刻パネルを開いた時は現在値付近へ自動スクロールする
    - 既存データに15分刻み外の分がある場合も、現在値を分候補に含める
    - 日付 / 時間ポップオーバーは外側クリックで閉じる
    - `1023px以下` では日付カレンダーの余白とセル高、時刻ロールの幅と高さを抑え、`1024px以上` はPC向けサイズを維持した
    - `1279px以下` では開始時間 / 終了時間を縦積みにし、時刻パネルをサイドパネル内の通常ブロックとしてフォーム幅いっぱいに表示する
    - `1280px以上` では開始時間 / 終了時間の横並びと、入力欄左端 / 右端に合わせる従来のポップオーバー表示を維持した
    - browser-useのタブレット横相当表示で、開始時間パネルが右パネル外へはみ出さず、フォーム幅で表示されることを確認した
  - `eslint.config.mjs` に `.worktrees/**` を追加し、repo内worktreeの生成物をlint対象外にした
  - browser-useで `/tools/schedule-calendar/` を再読み込みし、console error / warn なしを確認した
  - 2026-04-30追記: ユーザー起動の dev server `http://localhost:3000/` で確認済み
  - `/`: 新hero文言、`ツール一覧を見る`、`Schedule Calendar を開く`、`不具合報告 / 要望`、`mailto:` 導線を確認
  - `/tools`: 新説明文、Schedule Calendar の利用可能導線、準備中カードの `準備中` CTA、フィードバック導線を確認
  - `/tools/schedule-calendar`: URL / title / 作業画面表示を確認
  - 主要導線: `/` -> `/tools` -> `/tools/schedule-calendar` の遷移を確認
  - console: `/` / `/tools` / `/tools/schedule-calendar` で error / warn なし
  - 幅別確認:
    - `390px`: Homeの新文言と2CTA、Toolsの新説明文、Schedule Calendarのモバイル統合UI / 下部タブ / FABを確認
    - `820px`: `~1023px` のモバイル統合UIとして、Toolsフィルタの横スクロール、Schedule Calendarの下部タブ / FABを確認
    - `1024px`: タブレット2ペインとして、左サイドバー、Toolsフィードバック導線、Schedule Calendar右パネル4タブを確認
    - `1366px`: PC表示として、左サイドバー、Schedule Calendar 2ペイン、右パネル、将来機能の近日対応表示を確認
  - build / Cloudflare Pages成果物:
    - ユーザー環境で `npm run build` 成功
    - `out/_headers` / `out/index.html` / `out/tools/index.html` / `out/tools/schedule-calendar/index.html` の存在確認済み
    - 補足: Next.js が workspace root 推定警告を出したが、build / static export / 必要成果物生成は成功

### フェーズ3: 2本目MVPツールを追加する

- Schedule Calendar のMVP後タスクは `docs/future/SCHEDULE_CALENDAR_FUTURE_TASKS.md` を参照する
- [x] 2本目は Schedule Calendar と連携しやすいツールを優先する（候補: サムネイルエディタ（手動編集型））
  - 2026-05-01: サムネイルエディタ（手動編集型）のMVPを `/tools/thumbnail-editor` として実装した
  - 画像 / テキスト / 図形レイヤー、レイヤー選択・順序変更・複製・削除、テキスト/図形/エフェクト編集、4プリセット、localStorage下書き保存/復元、PNG/JPEG書き出しを追加した
  - `/tools` と左ナビの実装済みツールに `Thumbnail Editor` を追加した
- [ ] 共通データモデルを先に設計する
  - 日付、カテゴリ、配信プラットフォーム、メモを共通フィールドとして定義する
- [ ] ツール間連携の最小導線を実装する
  - 例: カレンダー予定から企画メモ作成へ遷移

#### サムネイルエディタ実装方針（2026-05-01確定）

- [x] 参照モック画像を `docs/mockups` に final 命名で保存する
  - `thumbnail-editor-design-system-final.png`
  - `thumbnail-editor-desktop-final.png`
  - `thumbnail-editor-tablet-landscape-final.png`
  - `thumbnail-editor-mobile-final.png`
- [x] 実装順は `PC -> Tablet横 -> Mobile` で進める
- [x] タブレット縦（`~1023px`）は Mobile 統合UIとして扱う
- [x] レスポンシブ境界を以下で固定する
  - `1280px~`: PC（左キャンバス + 右設定パネル）
  - `1024~1279px`: Tablet横（コンパクト2ペイン）
  - `~1023px`: Mobile統合UI（タブレット縦含む）
- [x] UI優先度を固定する
  - 文字編集（フォント/サイズ/色/縁取り/影）を最優先
  - エフェクトはMVP最小（縁取り/影/透明度/ぼかし）
  - 保存は `localStorage`、出力は PNG/JPEG
- [x] 直接操作の編集体験を追加する（マウス/タッチ）
  - キャンバス上のレイヤーをドラッグ移動できるようにした
  - 4隅ハンドルでリサイズ、回転ハンドルで回転できるようにした
  - PC向けにキャンバス上のカーソルを `grab/grabbing/resize/crosshair` へ切り替えるようにした
- [x] OSネイティブ依存の入力UIを置き換える
  - ヘッダーのプリセット/キャンバスサイズをアプリ内ドロップダウンに変更した
  - 色入力をネイティブ `input[type=color]` から、HEX入力 + スウォッチパレットのアプリ内UIへ変更した
  - カラーピッカーは彩度/明度エリア、Hueバー、HEX入力、スウォッチを持つアプリ内UIへ拡張した
  - カラーピッカーは右パネル幅を使うポップアップ表示にし、外側クリックで閉じるようにした
  - 2カラム設定内ではカラーピッカーのポップアップが2カラム分の幅を使うようにした
- [x] PC表示のキャンバス操作UIをモック寄せにする
  - `1280px~` ではキャンバス左側に縦ツールレールを配置した
  - `選択` は通常編集、`ズーム` は表示移動モードとして扱い、拡大キャンバスのパン操作に使う
  - PCのズーム表示はキャンバス下部に移し、モバイルの上部操作は維持した
- [x] Tablet横表示にもキャンバス操作UIを展開する
  - `1024px~` で縦ツールレールと右設定パネルを表示するようにした
  - 初期ズームを `1280px~: 72%`、`1024~1279px: 56%`、`~1023px: 42%` に分けた
  - 拡大時はキャンバス表示領域に独立した縦横スクロールを持たせ、ツールレールが見え続ける構造にした
- [x] Mobile表示のモード切替位置を調整する
  - `~1023px` の `編集 / 表示移動` はキャンバスカード内ではなく、ヘッダーの保存操作列へ移動した
  - `1024px~` は引き続きキャンバス左ツールレールで操作する
- [x] PC / Tablet横に集中編集モードを追加する
  - `1024px~` で右設定パネルを非表示/表示できるようにした
  - 右パネル非表示時は中央キャンバス領域を1カラムへ広げ、キャンバスカードの最大幅制限も解除する
  - 復帰ボタンはキャンバスカード上部に残し、右パネルを閉じても戻せるようにした
- [x] 集中編集モードからの編集復帰導線を追加する
  - `1024px~` ではキャンバス上のオブジェクトをダブルクリックすると、そのレイヤーを選択して右設定パネルを表示する
  - タッチ/ペン操作では、移動量の小さい短時間2回タップをダブルタップとして扱う
  - ドラッグ移動、リサイズ、回転、表示移動パン後は誤って編集復帰しないようにした
- [x] 図形追加とフォント候補を拡張する
  - PC / Tablet横の左ツールレールの `図形` をメニュー化し、`矩形 / 円` を選べるようにした
  - Google Fonts候補を日本語10種、英語10種に拡張した
  - フォント選択UIは `日本語 / English` の見出し付き一覧にした
  - Cloudflare PagesのCSPで Google Fonts の stylesheet / font 読み込みを許可した

#### サムネイルエディタMVP検証メモ（2026-05-01）

- 実施: `npm run lint`
  - 結果: 成功
- 実施: `npx tsc --noEmit`
  - 結果: 成功
- 実施: `npm run build`
  - 結果: 成功。`/tools/thumbnail-editor` が static prerender 対象に追加された
  - 補足: worktree内の追加 `package-lock.json` により Next.js の workspace root 推定警告は継続
- 実施: ヘッドレスChromeで `390 / 820 / 1024 / 1366` 幅のスクリーンショット確認
  - `390 / 820`: Mobile統合UI、下部タブ、キャンバス中心の縦積み表示を確認
  - `1024`: Tablet横のコンパクト2ペイン、右設定パネル、Mobile下部タブ非表示を確認
  - `1366`: PC 2ペイン、左ナビ、右設定パネル、プリセット一覧を確認
- 実施: Chrome DevTools Protocolで主要導線確認
  - プリセット適用後の自動保存を確認
  - テキスト追加、下書き保存、localStorage復元を確認
  - PNG書き出しで `thumbnail-YYYYMMDD-HHMM.png` のdownload発火とtoast表示を確認
- 2026-05-01レビュー反映:
  - workspace画面上部の親ページ名 `ツール一覧` は表示せず、ツール内ヘッダーの `画像・デザイン` / `サムネイルエディタ` を主表示にした
  - エディタ本体とキャンバス内スクロールを `scrollbar-accent` に揃え、Windows標準スクロールバーの露出を抑えた
  - キャンバスズーム上限を `100%` から `160%` へ拡張し、拡大時はキャンバス枠内スクロールで細部確認できるようにした
  - フォント選択をネイティブselectからアプリ内listboxへ変更し、選択肢が画面外へ出る問題を避けた
  - カラーピッカーを簡易スウォッチから、SVエリア + Hueバー + HEX入力の詳細選択UIへ変更した
  - カラーピッカーをサイドパネル幅のポップアップへ広げ、ピッカー外操作で閉じるようにした
  - カラーピッカーが2カラムの片側幅に留まっていたため、2カラム分へ広げた
- 2026-05-01操作拡張:
  - キャンバス操作を Pointer Events ベースに切り替え、マウスとタッチで共通の編集操作にした
  - 選択レイヤーのドラッグ移動を追加した
  - 選択枠の四隅リサイズハンドルを追加し、回転角を維持したままサイズ変更できるようにした
  - 選択枠上部の回転ハンドルを追加し、ドラッグで回転できるようにした
- 2026-05-01 PC表示調整:
  - モックに合わせ、PC表示のみキャンバス左側の縦ツールレールを追加した
  - 縦ツールレールから `選択` / `テキスト` / `図形` / `画像` / `ズーム` を操作できるようにした
  - `ズーム` は表示移動モードとして、キャンバスのスクロール領域をドラッグ/タッチでパンする用途にした
- 2026-05-01 Tablet横表示調整:
  - 縦ツールレールの表示境界を `1280px~` ではなく `1024px~` に広げた
  - 幅別の初期ズームを PC `72%`、Tablet横 `56%`、Mobile `42%` にした
  - ユーザーがズームを手動変更した後は、リサイズ時に初期値へ戻さないようにした
- 2026-05-01 Mobile表示調整:
  - `編集 / 表示移動` をヘッダー内の `新規作成 / 下書き保存 / 書き出し` と同じ操作列へ移動した
  - キャンバスカード内の重複表示を削除し、拡大確認時にモード切替を見失いにくくした
- 2026-05-01 集中編集モード:
  - `1024px~` のキャンバスカード上部に `パネル非表示 / パネル表示` ボタンを追加した
  - 非表示時は右設定パネルを閉じ、左ツールレールとキャンバス操作を維持したまま横幅を広く使えるようにした
  - キャンバス上のオブジェクトをダブルクリック/ダブルタップすると、対象レイヤーを選択して右設定パネルを再表示するようにした
- 2026-05-01 フォント / 図形追加:
  - 左ツールレールの図形追加を、矩形と円の選択メニューにした
  - フォント候補を日本語10種、英語10種へ増やし、Google Fontsの読み込みを追加した
- 2026-05-01 browser-use 1024px確認:
  - in-app browserの表示幅が `1024 x 900` であることをスクリーンショット実測で確認した
  - `1024px` で左ツールレール、右設定パネル、パネル非表示/表示、Mobile下部タブ非表示を確認した
  - フォントメニューを開いたまま図形メニューを開くと両メニューが同時表示される挙動を確認し、フォントメニュー外側クリックで閉じるよう修正した
  - 修正後、フォントメニュー表示中に図形メニューを開くとフォントメニューが閉じ、図形メニューのみ表示されることをbrowser-useで確認した
  - console error / warn なし
  - browser-use公開APIではin-app browserのデバイスツール幅を直接変更する手段は確認できなかったため、他幅はユーザー側で切り替え後に確認する
- 2026-05-01 browser-use 820px確認:
  - in-app browserの表示幅が `820 x 900` であることをスクリーンショット実測で確認した
  - `820px` は Mobile統合UIとして、ヘッダー内の `編集 / 表示移動`、下部タブ、キャンバス下のレイヤー追加ボタンが表示されることを確認した
  - 左ツールレールとPC/Tablet横向けのパネル表示切替は非表示であることを確認した
  - 下部タブの `レイヤー` / `テキスト` / `書き出し` を開き、各パネルへ切り替わることを確認した
  - console error / warn なし
- 2026-05-01 browser-use 390px確認:
  - in-app browserの表示幅が `390 x 900` であることをスクリーンショット実測で確認した
  - `390px` は Mobile統合UIとして、ヘッダー内の `編集 / 表示移動`、新規作成/下書き保存/書き出し操作、下部タブが表示されることを確認した
  - 左ツールレールとPC/Tablet横向けのパネル表示切替は非表示であることを確認した
  - キャンバスの横スクロール、キャンバス下のレイヤー追加ボタン、下部タブの `レイヤー` / `テキスト` / `書き出し` 切り替えを確認した
  - console error / warn なし
- 2026-05-01 モバイルヘッダー/ドロワー調整:
  - `1023px以下` の共通ヘッダーに現在ツール名を表示するようにした
  - `/tools/schedule-calendar/` では `スケジュールカレンダー`、`/tools/thumbnail-editor/` では `サムネイルエディタ` を表示する
  - サムネイルエディタ内のモバイル用ローカル見出しはヘッダーへ役割を移し、プリセット/キャンバスサイズ操作から始まるようにした
  - ハンバーガーメニューに `スケジュールカレンダー` と `サムネイルエディタ` を追加した
  - browser-useでサムネイルエディタのモバイルヘッダー、ドロワー内の `サムネイルエディタ`、Schedule Calendarのモバイルヘッダー表示を確認した
- 2026-05-01 公開前MVP hardening:
  - 公開可否: OK
  - 画像取り込みはPNG/JPEGのMIME/拡張子を検証し、上限を8MBにした
  - 書き出し前に下書き正規化と画像レイヤー有無を確認し、画像未選択時は明示エラーで中断するようにした
  - localStorage破損時は破損データを削除して安全初期化し、復元案内toastを表示するようにした
  - 下書き保存/自動保存は正規化後データのみ保存するようにした
  - 数値入力は非数/範囲外をクランプし、長文/不正フォント/不正画像srcは復元時に正規化するようにした
  - 主要アクションへ最低限の `aria-label` を追加した
  - ファイル取り込みは `FileReader` のdata URLを使っており、`URL.createObjectURL` の解放漏れは該当なし
  - 画面外部通信はGoogle Fonts読み込みのみで、既存CSP許可範囲と整合している
  - 実施: `npm run lint`（成功）
  - 実施: `npx tsc --noEmit`（成功）
  - 実施: `npm run build`（成功。Next.js workspace root推定警告のみ）
  - 実施: Playwright CLI `390 / 820 / 1024 / 1280` 幅確認（成功）
  - 実施: Playwright CLI 取り込み -> 編集 -> 保存 -> 復元 -> 書き出し、画像なし書き出しガード、破損localStorage復旧、不正GIF拒否（成功）
- 未対応 / 既知制約:
  - キャンバス操作は実装済みだが、スナップ（グリッド吸着）や角度ステップ回転（例: 15度刻み）は未対応
  - ローカルフォントimport、AI生成、有料API連携、SNS直接投稿、複数サイズ一括出力は今回非対応

#### SNS分割画像メーカーMVP実装（2026-05-02）

- [x] 確定モック（desktop / tablet-landscape / mobile）に合わせて `/tools/sns-split-image-maker` を追加した
  - `1280px~`: 左に分割後プレビュー、右に入力/合成/設定/出力パネルを置く2ペイン
  - `1024~1279px`: 既存左ナビはアイコン中心の簡略表示、ツール本体は2ペインを維持
  - `~1023px`: mobile統合UIとして縦1カラム + 素材/調整/出力タブで操作する
- [x] MVP画像処理をフロント完結で追加した
  - メイン画像読込、`1+8連結` / `1+4差し替え` モード切替、追加スロット数の切替を実装
  - `splitX / splitY / seamFix / offsetX / offsetY / scale` をプレビューと書き出しへ反映
  - 境界線表示ON/OFF、グリッド表示ON/OFF、PNG/JPEG、連番命名 `{n}` / `{nn}` に対応
  - 出力は投稿順 `1 -> 2 -> 3 -> 4` の4枚を個別ダウンロードする
- [x] localStorage保存/復元を追加した
  - 保存キー: `v-streamer-tools:sns-split-image-maker:draft:v1`
  - JSON破損時や不正payload時は破損データを削除して初期状態で継続する
- [x] 幅別実見確認を実施する
  - 対象幅: 390 / 820 / 1024 / 1280
  - 観点: レイアウト破綻、モード切替、調整値即時反映、localStorage復元、破損localStorage復旧、投稿順1→4の出力
  - 実施: `npm run lint`（成功）
  - 実施: `npx tsc --noEmit`（成功）
  - 実施: `npm run build`（成功。`/tools/sns-split-image-maker` が static prerender 対象に追加）
  - 実施: Chrome DevTools MCP `390 / 820 / 1024 / 1280` 幅確認
    - `390 / 820`: mobile統合UI、素材/調整/出力タブ、横スクロール破綻なし
    - `1024`: tablet-landscapeとして左ナビ80pxの簡略表示、2ペイン、横スクロール破綻なし
    - `1280`: desktopとして左ナビ288pxのフル表示、2ペイン、横スクロール破綻なし
  - 実施: broken JSON localStorage を投入し、安全初期化toastが出ることを確認
  - 実施: `1+4差し替え` 切替で追加スロット説明が切り替わることを確認
  - 実施: `splitY` 変更で分割後プレビューcanvasが更新されることを確認
  - 実施: テスト用data URL画像で `split_1.png` -> `split_4.png` の順にdownload link clickが発火することを確認
  - 2026-05-02 レビュー反映:
    - 左の大プレビューを `投稿前最終確認（投稿順）` として整理し、最終投稿画像の比率を `16:27` 固定に変更した
    - `1+8連結` は、各投稿を `追加画像（上） / メイン分割 / 追加画像（下）` の3段構成に変更した
      - スロット対応: `1=投稿1上部`, `2=投稿1下部`, `3=投稿2上部`, `4=投稿2下部`, `5=投稿3上部`, `6=投稿3下部`, `7=投稿4上部`, `8=投稿4下部`
    - `1+4差し替え` は、追加画像を投稿別フレームとして扱い、中央1/3へメイン分割を差し込む構成に変更した
    - 右側プレビューは `4枚投稿の並び確認` として、投稿1〜4を2x2で並べる補助確認に変更した
  - 2026-05-02 追加検証:
    - `npm run lint`（成功）
    - `npx tsc --noEmit`（成功）
    - `npm run build`（成功）
    - Chrome DevTools MCPで `1+8連結` の投稿1プレビューが上部追加画像 / 中央メイン / 下部追加画像の色順になることを確認
    - Chrome DevTools MCPで `1+4差し替え` の投稿1プレビューがフレーム画像 / 中央メイン / フレーム画像の色順になることを確認
    - Chrome DevTools MCPで `390 / 820 / 1024 / 1280` の横スクロール破綻なしを確認
    - Chrome DevTools MCPで `split_1.png` -> `split_4.png` の順にdownload link clickが発火することを確認
  - 2026-05-02 編集プレビュー化:
    - 左の大エリアを4枚一覧から `投稿N 編集プレビュー` へ変更し、投稿1〜4の選択ボタンで編集対象を切り替える形にした
    - 右側の `投稿プレビュー` は `全体 / 個別 / 投稿時` の3表示に切り替え可能にした
    - 中央のメイン分割画像に投稿別補正 `offsetX / offsetY / scale` を追加し、localStorage復元にも対応した
    - PCマウス向けに、編集プレビュー中央帯のドラッグ移動で投稿別 `offsetX / offsetY` を更新できるようにした
    - ドラッグ移動時は中心線付近で `offsetX / offsetY` が `0px` に吸着するようにし、編集プレビュー中央帯へ縦横センターガイドを追加した
    - ドラッグ中のstate更新をやめ、`requestAnimationFrame` で編集プレビューのみを更新し、pointer up時に投稿別補正を1回だけ保存するようにした
    - `1` と `3` を統合し、左ペインを番号なしの `プレビュー`（編集 / 全体 / 投稿時）へ整理。右ペインは `1 入力エリア` / `2 分割・合成設定` / `3 エクスポート設定` に番号を振り直した
    - `投稿時` プレビューは追加画像を含めず、4分割したメイン画像のみを2x2で表示する形にした
    - `>=1024px` は左右ペインを独立スクロールにし、プレビューを見ながら右側の数値設定を触れるようにした
    - 左プレビュー内の独立スクロールは廃止し、編集 / 全体 / 投稿時の各canvasを枠内に比率維持で収める形にした。右操作ペインのみ独立スクロールを維持
    - 左プレビューパネルの縦幅を広げ、投稿時プレビューは黒背景カードを使わず、透明背景 + 1〜4の区切り線 + 選択アウトラインで表示する形にした
    - `投稿順 1→2→3→4` の表示を上部操作バーから左プレビュー見出しへ移設し、投稿時プレビューの各セルを16:9固定にして上下帯をなくした
    - `分割・合成設定` は投稿別調整を常時表示し、`splitX/splitY/シーム/全体scale/色` などの基本分割調整を初期閉じのアコーディオンへ移動した
    - `エクスポート設定` は `PNG/JPEG + 画質` を1段目、`ファイル名の形式` を2段目のフル幅入力に整理した
    - `入力エリア` は分割用メイン画像と追加画像スロットを縦2段に整理し、追加画像スロットは1+8/1+4とも16:9のコンパクトカードへ統一した
    - `<=1023px` のモバイルUIは `プレビュー / 編集 / 保存` の下部固定ナビへ変更し、`プレビュー` ではプレビューのみ、`編集` では入力・設定・エクスポートを縦並びで表示する構成にした
    - モバイルではヘッダーの `画像を保存` を非表示にし、下部固定の `保存` を4枚出力CTAとして使う形にした
    - 画像data URLをlocalStorageへ直接保存しないようにし、localStorageは設定メタデータのみ、画像本体はIndexedDBへ保存・復元する形に変更した
    - `QuotaExceededError` 時に画面がクラッシュしないよう、自動保存・手動保存を例外処理で保護した
    - 直接操作は中央メイン画像の移動のみに限定し、上下追加画像、回転、ハンドルリサイズ、ピンチズームは未対応
  - 2026-05-02 編集プレビュー追加検証:
    - `npm run lint`（成功）
    - `npx tsc --noEmit`（成功）
    - `npm run build`（成功）
    - 吸着ガイド追加後に `npm run lint` / `npx tsc --noEmit` / `git diff --check` / `npm run build` を再実行（成功）
    - ドラッグ軽量化後に `npm run lint` / `npx tsc --noEmit` / `git diff --check` / `npm run build` を再実行（成功）
    - 1/3統合と左右独立スクロール追加後に `npm run lint` / `npx tsc --noEmit` / `git diff --check` / `npm run build` を再実行（成功）
    - Chrome DevTools MCPで `1280px` 表示時に `プレビュー` へ統合され、右ペイン番号が `1 / 2 / 3` になり、旧 `投稿プレビュー` 見出しが消えていることを確認
    - Chrome DevTools MCPで `投稿時` タブが4枚の `メイン分割プレビュー` を16:9 canvasで表示し、右操作ペインが独立スクロールになることを確認
    - Chrome DevTools MCPで左プレビュー内の `overflow-y` が `hidden`、編集canvasが16:27、投稿時canvasが16:9比率、右操作ペインが `overflow-y:auto` であることを確認
    - Chrome DevTools MCPで `1280px` 表示時の左プレビュー枠が約640px高になり、投稿時プレビューの各button/canvas背景が透明、1〜4の区切り線あり、console error/warnなしを確認
    - Chrome DevTools MCPで `投稿順` 表示がプレビュー内へ移設され、上部操作バーから消えていること、投稿時セル/canvasの縦余白が0〜1pxまで縮小していることを確認
    - Chrome DevTools MCPで基本分割調整が初期閉じ、展開時に `splitY` と色設定が表示されること、エクスポート設定が `PNG/JPEG` → `画質` → `ファイル名の形式` の順で表示されることを確認
    - Chrome DevTools MCPで入力エリアが `分割用メイン画像` → `追加画像スロット` の2段になり、追加画像スロットが4列16:9（約86x48px）で表示されることを `1024px / 1280px` で確認
    - Chrome DevTools MCPで `390px` 表示時に下部固定ナビが表示され、`プレビュー` では入力エリアが非表示、`編集` では入力・設定・エクスポートが表示されること、横スクロールなしを確認
    - Chrome DevTools MCPで `1280px` 表示時に下部固定ナビが非表示で、プレビューと入力エリアが同時表示されること、console error/warnなしを確認
    - Chrome DevTools MCPで合成画像3枚をアップロードし、localStorageに `data:image` が含まれず約907文字に収まり、画像3件がIndexedDBへ保存されることを確認
    - Chrome DevTools MCPでリロード後にIndexedDBから画像が復元されること、復元後も `split_1.png` -> `split_4.png` のdownload発火が維持されることを確認
    - Chrome DevTools MCPで `1280px` 表示時に吸着説明文と編集プレビューcanvasが表示され、横スクロール破綻とconsole error/warnがないことを確認
    - Chrome DevTools MCPで投稿別補正 `offsetX / offsetY / scale` が復元され、数値入力の変更が保存payloadへ反映されることを確認
    - Chrome DevTools MCPで `390 / 820 / 1024 / 1280` の横スクロール破綻なし、`1024px` は左ナビ80px、`1280px` は左ナビ288pxを確認
    - 補足: Chrome DevTools MCPの合成PointerEventではReactのpointer handlerを実操作相当に検証できなかったため、ドラッグ移動はコードパスとUI表示まで確認。実マウス操作はユーザー実見で確認予定
  - 2026-05-02 公開前文言調整 / レビュー:
    - 入力エリアへ「画像は16:9推奨」「異なる比率は中央基準でトリミング」「画像処理と復元用保存はブラウザ内で完結し外部送信しない」旨を追加した
    - エクスポート設定へ「出力はブラウザのダウンロードとして4枚保存する」旨を追加し、分割用メイン画像の説明へ解像度違いは自動拡大縮小する旨を追記した
    - レビュー結果: MVP公開を止める不具合はなし。リファクタは `SnsSplitImageMakerApp.tsx` のstorage/helper/UI分割を次PR候補とし、今回は挙動固定を優先する
    - セキュリティ確認: PNG/JPEG MIME + 拡張子 + 12MB上限、復元時data URL種別制限、localStorageメタデータ化、IndexedDB画像保存、ファイル名サニタイズ、外部API未使用を確認
    - 実施: `npm run lint` / `npx tsc --noEmit` / `git diff --check` / `npm audit --omit=dev` / `npm run build`（成功。auditはprod依存0 vulnerabilities）

#### SNS分割画像メーカーMVP後の別PR候補（2026-05-02）

- [x] 個別ツールページのPC / tablet-landscapeヘッダーからテーマ切り替えを外す
  - ツール操作中はヘッダー右側を保存 / 出力 / 使い方などの作業アクションに寄せる
  - `Home` / `Tools` では現状どおりヘッダー表示を維持してよい
  - 個別ツールページではPC左サイド下部へテーマ切り替えを移す
  - `1024~1279px` の簡略左ナビでは、下部に小さなトグルまたはアイコン操作として配置する
  - `~1023px` のモバイルは現状どおりメニュー内 / モバイル側操作に寄せ、画面上部に常駐させない
  - 2026-05-02実装:
    - `PortalShell mode="workspace"` の個別ツールページでは、`1024px~` の共通ヘッダーを非表示にして作業領域を `h-screen` へ広げた
    - `Home` / `Tools` は従来どおり `1024px~` のヘッダー右側にテーマ切り替えを表示する
    - 個別ツールページの `1280px~` は左サイド下部に通常テーマ切り替え、`1024~1279px` は左サイド下部にコンパクトトグルを表示する
    - `~1023px` は従来どおりモバイルヘッダー + メニュー内テーマ切り替えに留め、画面上部への常駐表示は追加しない
    - 幅別ブラウザ確認で使う `tmp/` / `temp/` は既存 `.gitignore` と同じく ESLint 対象外にした
  - 2026-05-02検証:
    - 実施: `npm run lint`（成功）
    - 実施: `npx tsc --noEmit`（成功）
    - 実施: `git diff --check`（空白エラーなし。CRLF警告のみ）
    - 実施: `npm run build`（成功。`/` / `/tools` / 3つの個別ツールページがstatic prerender対象）
    - 実施: browser-useで `http://localhost:3002/tools/schedule-calendar/` を開き、ページ到達を確認
    - 実施: Chrome headless CDPで `390 / 820 / 1024 / 1280` 幅を確認
      - `Home` / `Tools`: `1024 / 1280` でヘッダーのテーマ切り替えを維持、サイドバー側には追加表示なし
      - `Schedule Calendar` / `Thumbnail Editor` / `SNS分割画像メーカー`: `1024 / 1280` でヘッダー非表示、左サイド下部にテーマ切り替えを表示
      - `390 / 820`: 個別ツールページのヘッダー上にテーマ切り替えは常駐せず、モバイル導線を維持
      - 全確認幅で横スクロール破綻なし
      - 個別ツールページ3種の console error / warn なし
    - 補足: `Home` 初回390px確認時のみ既存の `/favicon.ico` 404 が console に出た。今回変更対象の個別ツールページでは再現なし
  - 2026-05-03レビュー反映:
    - PC左サイド下部のテーマ切り替えから `表示テーマ` ラベルを削除し、操作だけを残した
    - `Schedule Calendar` の `1024px~` 上部ツールバー左側へ、他ツールと同じくカテゴリ補足とツール名を追加した
    - 実施: `npm run lint` / `npx tsc --noEmit` / `git diff --check` / `npm run build`（成功。buildは既存のworktree lockfile root推定警告のみ）
    - 実施: browser-useで `/tools/schedule-calendar/` を再読み込みし、`Schedule Calendar` 表示あり、`表示テーマ` ラベルなしを確認
    - 実施: browser-useで `/tools/thumbnail-editor/` を開き、`表示テーマ` ラベルなしを確認
  - 2026-05-03追加レビュー反映:
    - PC左サイド下部のテーマ切り替えを `ログイン予定` パネルの下へ移動した
    - ツール名表記は左サイドパネルの tool name と揃える方針とし、`Schedule Calendar` は英語表記を維持する
    - 実施: `npm run lint` / `npx tsc --noEmit` / `git diff --check` / `npm run build`（成功。buildは既存のworktree lockfile root推定警告のみ）
    - 実施: browser-useで `/tools/schedule-calendar/` を再読み込みし、`Schedule Calendar` 表示あり、`表示テーマ` ラベルなし、テーマ切り替えが `ログイン予定` より後ろにあることを確認
  - 2026-05-03サムネイルエディタ表記統一:
    - `Thumbnail Editor` の左サイドパネル表記に合わせ、ツール内見出しとモバイルヘッダー / ドロワー表記を英語表記へ統一した
    - 実施: `npm run lint` / `npx tsc --noEmit` / `git diff --check` / `npm run build`（成功。buildは既存のworktree lockfile root推定警告のみ）
    - 実施: browser-useで `/tools/thumbnail-editor/` を開き、`Thumbnail Editor` 表示あり、`サムネイルエディタ` 表示なしを確認
  - 2026-05-03サムネイルエディタヘッダー調整:
    - ヘッダー右側アクションがPC / tablet-landscape幅で2〜3段になりやすかったため、表示テキストを `新規` / `下書き` / `出力` に短縮した
    - 詳しい意味は `aria-label` と `title` に残し、作成 / 下書き保存 / 書き出しの挙動は変更しない
    - テキスト短縮のみでは `1280px` で3段が残ったため、ヘッダー中央操作の `xl` 最小幅を少し締め、右側アクションは1行維持にした
    - 実施: Chrome headless CDPで `1024 / 1280 / 1366 / 1619` を確認し、`新規` / `下書き` / `出力` が同一行に収まることと横スクロールなしを確認
  - 2026-05-03サムネイルエディタmobile作業領域調整:
    - `<=1023px` ではプリセット / キャンバスサイズ / 編集モード / 新規 / 下書き / 出力を固定ヘッダーから外し、メインスクロール内の先頭へ移した
    - `1024px~` は従来どおりツール内ヘッダーに操作を置き、PC / tablet-landscape の1行表示を維持する
    - 実施: `npm run lint` / `npx tsc --noEmit` / `git diff --check` / `npm run build`（成功。buildは既存のworktree lockfile root推定警告のみ）
    - 実施: Chrome headless CDPで `375 / 390 / 820 / 1024 / 1280` を確認
      - `375 / 390 / 820`: ツール内固定ヘッダーは非表示、プリセット / 操作ボタンは `main` 内、下部ナビ表示、横スクロールなし、console error / warnなし
      - `1024 / 1280`: ツール内ヘッダー表示、下部ナビ非表示、横スクロールなし
  - 2026-05-03サムネイルエディタmobile全体確認:
    - `<=1023px` のキャンバスカードに `全体` ボタンを追加し、確認専用のフルスクリーンプレビューを開けるようにした
    - 全体確認では選択枠やハンドルを描画せず、現在の下書き全体のみを表示する
    - `Esc` または `閉じる` で編集画面へ戻れるようにし、表示中は背面スクロールを止める
    - 実施: `npm run lint` / `npx tsc --noEmit` / `git diff --check` / `npm run build`（成功。buildは既存のworktree lockfile root推定警告のみ）
    - 実施: Chrome headless CDPで `375 / 390 / 820 / 1024` を確認
      - `375 / 390 / 820`: `全体` ボタン表示、全体プレビュー開閉、1280x720 canvas描画、表示中のbody scroll停止、横スクロールなしを確認
      - `1024`: `全体` ボタン非表示、従来のPC/tablet-landscape UI維持を確認
      - 補足: `375px` で既存の `/favicon.ico` 404 がconsoleに1件出たが、全体確認UI起因のerror / warnはなし
- [x] SNS分割画像メーカーの保守向け分割を別PRで行う
  - まず IndexedDB / localStorage / draft persistence helper を `SnsSplitImageMakerApp.tsx` から分離する
  - UI section分割は `InputSection` / `PreviewPanel` / `SettingsSection` などを候補にするが、props過多にならない範囲で段階的に行う
  - 既存挙動、保存キー、IndexedDB名、出力順、レスポンシブ境界は変更しない
  - 2026-05-03実装:
    - IndexedDB / localStorage / draft persistence / 画像ファイル読込バリデーションを `components/sns-split-image-maker/snsSplitDraftPersistence.ts` へ分離した
    - 保存キー `v-streamer-tools:sns-split-image-maker:draft:v1`、IndexedDB名 `v-streamer-tools:sns-split-image-maker`、store名 `images` は変更していない
    - `SnsSplitImageMakerApp.tsx` は復元結果に応じたtoast表示とUI state管理に絞り、保存処理の詳細を直接持たない形へ整理した
    - UI section分割は、現状だと `draft` / 更新関数 / 保存・出力関数 / 選択中投稿などのpropsが広がるため、今回PRでは無理に進めずstorage分離までで止めた
    - レビュー反映として、プレビュー初期表示を `全体` に変更し、`投稿1`〜`投稿4` の選択ボタンは `編集` タブ表示時だけ出すようにした
  - 2026-05-03検証:
    - 実施: `npm run lint`（成功）
    - 実施: `npx tsc --noEmit`（成功）
    - 実施: `git diff --check`（空白エラーなし。CRLF警告のみ）
    - 実施: `npm run build`（成功。`/tools/sns-split-image-maker` を含む6 routeがstatic prerender対象。既存のworktree lockfile root推定警告のみ）
    - 実施: browser-useで `http://localhost:3000/tools/sns-split-image-maker/` を再読み込みし、初期表示が `全体` タブ、`全体` / `投稿時` では `投稿1`〜`投稿4` 選択ボタン非表示、`編集` では選択ボタン表示、console error / warnなしを確認

#### SNS分割画像メーカー 2分割 / 3分割拡張計画（2026-05-03）

- 方針:
  - PRは別々にするなら、ブランチもPRごとに分ける
    - 同じブランチで複数PRを作ると、各PRの差分が同じになりやすく、独立レビュー / 個別マージが難しい
    - 例: `codex/sns-preset-foundation` -> `codex/sns-split-2` -> `codex/sns-split-3` -> `codex/sns-preview-labels`
    - stacked PRにする場合だけ、後続ブランチを前段ブランチから切って、前段マージ後にbaseを`main`へ戻す
  - 最初は大規模一括実装にせず、既存4分割の挙動を維持したまま土台を作る
  - 入口は `/tools/sns-split-image-maker` のプリセット選択画面にし、編集画面はqueryで開く
    - 例: `/tools/sns-split-image-maker?preset=split-4`
  - 入口カードは `2分割` / `3分割` / `4分割` の3つに絞る
  - `前回の作業を開く` を入口に置き、保存済みdraftがある場合だけ使えるようにする
  - 保存キー `v-streamer-tools:sns-split-image-maker:draft:v1` とIndexedDB名 / store名は維持する
  - draftには `preset` を追加し、既存draftは `split-4` としてmigrationする
  - 編集画面内では分割数の大変更はしない。`プリセットを変更` で入口へ戻す
  - 編集画面内で切り替えるもの:
    - 2分割: `連結タイプ` = `3連結` / `5連結`、`追加方式` = `個別追加` / `フレーム追加`
    - 3分割: `追加方式` = `個別追加` / `フレーム追加`
    - 4分割: `追加方式` = `個別追加` / `フレーム追加`
  - 既存4分割の表記は統一する
    - 旧 `1+8連結` -> `個別追加`
    - 旧 `1+4差し替え` -> `フレーム追加`
    - 移行直後は補足として `旧: 1+8` / `旧: 1+4` を小さく添えてよい
  - プレビュータブ名は `編集` / `全体` / `メイン分割` に統一する
    - `全体`: 追加画像込みの完成出力一覧
    - `メイン分割`: メイン画像だけの分割確認
  - 全体プレビュー:
    - 2分割: `24:9` 完成画像2枚を縦並び
    - 3分割: 上に画像1 `24:9`、下に画像2/3 `8:13.5` を横並び
    - 4分割: 現状どおり2x2
  - 出力順は常に `split_1` -> `split_2` -> `split_3` -> `split_4`
    - 2分割は `split_1` -> `split_2`
    - 3分割は `split_1` -> `split_2` -> `split_3`
    - 4分割は既存どおり `split_1` -> `split_4`

- 仕様:
  - 2分割:
    - メイン画像は16:9推奨
    - メイン画像を左右2分割し、中央メイン領域は各 `8:9`
    - 完成出力は `24:9` x 2枚
    - `3連結 + 個別追加`: 投稿ごとに左追加 `8:9` / 中央メイン `8:9` / 右追加 `8:9`
      - 追加画像は4枚: `投稿1 左` / `投稿1 右` / `投稿2 左` / `投稿2 右`
    - `3連結 + フレーム追加`: 投稿ごとに `24:9` フレーム画像を全面描画し、中央 `8:9` をメイン分割で上書き
      - 追加画像は2枚: `投稿1 フレーム` / `投稿2 フレーム`
    - `5連結 + 個別追加`: 投稿ごとに左上/左下/中央メイン/右上/右下
      - 追加画像は8枚、各 `8:4.5`
    - `5連結 + フレーム追加`: 投稿ごとに `24:9` フレーム画像を全面描画し、中央 `8:9` をメイン分割で上書き
      - 追加画像は2枚
  - 3分割:
    - メイン画像は16:9推奨
    - 完成出力は3枚
      - 画像1: `24:9`
      - 画像2: `8:13.5`
      - 画像3: `8:13.5`
    - メイン画像の切り方:
      - 画像1: 左半分 `8:9`
      - 画像2: 右上 `8:4.5`
      - 画像3: 右下 `8:4.5`
    - `個別追加`: 追加画像6枚
      - 画像1 左 `8:9` / 画像1 右 `8:9`
      - 画像2 上 `8:4.5` / 画像2 下 `8:4.5`
      - 画像3 上 `8:4.5` / 画像3 下 `8:4.5`
    - `フレーム追加`: 追加画像3枚
      - 画像1 フレーム `24:9`
      - 画像2 フレーム `8:13.5`
      - 画像3 フレーム `8:13.5`
      - 各フレームを全面描画し、中央メイン領域を上書き
  - 4分割:
    - 既存挙動を維持する
    - 完成出力は `8:13.5` x 4枚
    - `個別追加`: 旧 `1+8連結`
    - `フレーム追加`: 旧 `1+4差し替え`

- 実装プロンプト1: preset土台 / 入口画面 / 4分割既存挙動維持
  ```text
  D:\V_streamer_tools で別ブランチを作成して作業してください。

  目的:
  SNS分割画像メーカーの2分割/3分割拡張に向けて、まずpreset土台と入口画面を作る。既存4分割の描画・保存・出力挙動は変えない。

  対象:
  - components/sns-split-image-maker/SnsSplitImageMakerApp.tsx
  - components/sns-split-image-maker/snsSplitDraftPersistence.ts
  - lib/sns-split-image-maker.ts
  - app/tools/sns-split-image-maker/page.tsx
  - task.md
  - 必要なら components/sns-split-image-maker/ 配下に小さな helper/component ファイルを追加

  要件:
  - /tools/sns-split-image-maker はプリセット選択画面にする
  - 入口カードは 2分割 / 3分割 / 4分割 の3つ
  - 4分割カードから ?preset=split-4 の編集画面を開ける
  - 保存済みdraftがある場合は「前回の作業を開く」を表示する
  - draftに preset を追加し、既存draftは split-4 としてmigrationする
  - 保存キー v-streamer-tools:sns-split-image-maker:draft:v1 は変えない
  - IndexedDB名 / store名は変えない
  - 既存4分割の 1+8 / 1+4、出力順 split_1 -> split_4、1+8 / 1+4 の合成仕様は変えない
  - 編集画面内では「プリセットを変更」から入口へ戻れるようにする
  - UI section分割はpropsが過剰にならない範囲に留める

  検証:
  - npm run lint
  - npx tsc --noEmit
  - git diff --check
  - npm run build
  - browser-useまたはChrome DevToolsで /tools/sns-split-image-maker を確認
    - 入口カード表示
    - 4分割編集画面へ遷移
    - 既存4分割の出力順とlocalStorage/IndexedDB復元が壊れていないこと
    - 390 / 820 / 1024 / 1280 の横スクロール破綻なし
  - task.mdへ実装内容と検証結果を追記
  ```

  - 2026-05-03実装結果:
    - `codex/sns-preset-foundation` ブランチ / `.worktrees/sns-preset-foundation` で作業した
    - `SnsSplitPreset` と `defaultSnsSplitPreset` を追加し、draft metadata に `preset` を保存する土台を追加した
    - 既存draftは `normalizeSnsSplitDraft()` で `split-4` としてmigrationするようにした
    - 保存キー `v-streamer-tools:sns-split-image-maker:draft:v1`、IndexedDB名 `v-streamer-tools:sns-split-image-maker`、store名 `images` は変更していない
    - `/tools/sns-split-image-maker` はプリセット選択画面にし、2分割 / 3分割 / 4分割カードを表示するようにした
    - 4分割カードと `前回の作業を開く` から `?preset=split-4` の既存編集画面へ遷移できるようにした
    - 編集画面のヘッダーに `プリセットを変更` を追加し、入口画面へ戻れるようにした
    - 既存4分割の描画、1+8 / 1+4、出力順、合成仕様は変更していない
  - 2026-05-03検証:
    - 実施: `npm run lint`（成功）
    - 実施: `npx tsc --noEmit`（成功）
    - 実施: `npm run build`（成功。`/tools/sns-split-image-maker` を含む6 routeがstatic prerender対象。既存のworktree lockfile root推定警告のみ）
    - 実施: Chrome DevToolsで `http://localhost:3005/tools/sns-split-image-maker/` を確認
      - 入口画面に 2分割 / 3分割 / 4分割カードが表示されることを確認した
      - 4分割カードから `?preset=split-4` の編集画面へ遷移することを確認した
      - 保存済みlegacy draftをlocalStorageへ、base画像をIndexedDB `images` storeへ投入し、入口に `前回の作業を開く` が表示されることを確認した
      - legacy draftが `preset: "split-4"` へmigrationされ、IndexedDBのbase画像が復元されることを確認した
      - download clickをinstrumentし、4分割出力順が `split_1.png` -> `split_2.png` -> `split_3.png` -> `split_4.png` であることを確認した
      - 390 / 820 / 1024 / 1280 で入口画面と `?preset=split-4` 編集画面に横スクロール破綻がないことを確認した
      - console error / warn なしを確認した
    - 実施: `git diff --check`（空白エラーなし。CRLF警告のみ）
  - 2026-05-03目視確認前修正:
    - `?preset=split-4` でSSRは入口画面、client初回renderは編集画面になり、hydration mismatch が発生していた
    - 原因は `useState()` 初期化時に `window.location.search` を読むことで、server/clientの初回HTMLが分岐していたこと
    - static exportを維持するため、初回renderは入口画面に揃え、mount後のeffectでquery presetを反映する形へ変更した
    - 実施: `npm run lint` / `npx tsc --noEmit` / `npm run build`（成功。buildは既存のworktree lockfile root推定警告のみ）
    - 実施: Chrome DevToolsで `?preset=split-4` を直接開き、hydration errorが出ないことを確認した
      - 補足: 既存の `/favicon.ico` 404 は出るが、hydration error / React error はなし

- 実装プロンプト2: 2分割対応
  ```text
  D:\V_streamer_tools で別ブランチを作成して作業してください。
  baseはpreset土台PRのマージ後main、またはstacked PRならpreset土台ブランチにしてください。

  目的:
  SNS分割画像メーカーに2分割を追加する。完成出力は24:9 x 2枚。既存4分割挙動は変えない。

  要件:
  - preset split-2 を実装する
  - メイン画像16:9を左右2分割し、中央メイン領域は各8:9
  - 2分割の出力は split_1 -> split_2 の順で24:9画像2枚
  - 編集画面内で 連結タイプ: 3連結 / 5連結 を切り替えられる
  - 編集画面内で 追加方式: 個別追加 / フレーム追加 を切り替えられる
  - 3連結 + 個別追加:
    - 追加画像4枚: 投稿1 左 / 投稿1 右 / 投稿2 左 / 投稿2 右
    - 完成構成: 左追加8:9 / 中央メイン8:9 / 右追加8:9
  - 3連結 + フレーム追加:
    - 追加画像2枚: 投稿1 フレーム24:9 / 投稿2 フレーム24:9
    - フレーム全面描画後、中央8:9をメイン分割で上書き
  - 5連結 + 個別追加:
    - 追加画像8枚、各8:4.5
    - 投稿ごとに左上/左下/中央メイン/右上/右下
  - 5連結 + フレーム追加:
    - 追加画像2枚、各24:9
    - フレーム全面描画後、中央8:9をメイン分割で上書き
  - 全体プレビューは24:9完成画像2枚を縦並び
  - メイン分割プレビューはメイン画像の左右2分割を確認できること
  - 初期値は 3連結 + 個別追加
  - 保存キー、IndexedDB名/store名は変えない

  検証:
  - npm run lint
  - npx tsc --noEmit
  - git diff --check
  - npm run build
  - browser-useまたはChrome DevToolsでsplit-2を確認
    - 3連結/5連結の切替
    - 個別追加/フレーム追加の切替
    - 24:9の全体プレビュー縦並び
    - split_1 -> split_2 のdownload発火順
    - 390 / 820 / 1024 / 1280 の横スクロール破綻なし
  - 既存split-4の回帰確認
  - task.mdへ実装内容と検証結果を追記
  ```

  - 2026-05-03実装結果:
    - `codex/sns-split-2` ブランチ / `.worktrees/sns-split-2` で、PR #15 `codex/sns-preset-foundation` の上にstacked実装した
    - `split-2` を編集可能プリセットにし、入口カードから `?preset=split-2` を開けるようにした
    - `SnsSplitJoinType` と `config.joinType` を追加し、2分割の `3連結` / `5連結` を切り替えられるようにした
    - 2分割の `個別追加` / `フレーム追加` を既存 `mode` に対応させ、slot数を以下で切り替えるようにした
      - 3連結 + 個別追加: 4 slot
      - 5連結 + 個別追加: 8 slot
      - フレーム追加: 2 slot
    - 2分割の完成出力を `24:9` x 2枚にし、中央 `8:9` にメイン画像の左右分割を差し込む描画を追加した
    - 5連結では左右追加領域を上下2分割し、各追加画像を `8:4.5` 相当で描画するようにした
    - 2分割の全体プレビューは `24:9` 完成画像2枚の縦並びにし、メイン分割プレビューは左右2枚の `8:9` 表示にした
    - 2分割の出力順を `split_1` -> `split_2` にした
    - 既存4分割の 1+8 / 1+4 表記、slot数、出力順 `split_1` -> `split_4` は維持した
  - 2026-05-03検証:
    - 実施: `npm run lint`（成功）
    - 実施: `npx tsc --noEmit`（成功）
    - 実施: `git diff --check`（空白エラーなし。CRLF警告のみ）
    - 実施: `npm run build`（成功。`/tools/sns-split-image-maker` を含む6 routeがstatic prerender対象。既存のworktree lockfile root推定警告のみ）
    - 実施: Chrome DevToolsで `http://localhost:3006/tools/sns-split-image-maker/` を確認
      - 入口画面で2分割カードが利用可能になっていることを確認した
      - `?preset=split-2` で追加方式 `個別追加` / `フレーム追加`、連結タイプ `3連結` / `5連結` が表示されることを確認した
      - 3連結 + 個別追加で追加slotが4、5連結 + 個別追加で追加slotが8、フレーム追加で追加slotが2になることを確認した
      - 5連結のslot labelが `投稿1 左上` / `投稿1 左下` / `投稿1 右上` / `投稿1 右下` / `投稿2 左上` / `投稿2 左下` / `投稿2 右上` / `投稿2 右下` になることを確認した
      - 2分割の全体プレビューcanvasが `1920x1440`、出力canvasが `1920x720`、メイン分割プレビューcanvasが `640x720` x 2になることを確認した
      - download clickをinstrumentし、2分割出力順が `split_1.png` -> `split_2.png` であることを確認した
      - 既存split-4で `1+8連結` / `1+4差し替え`、追加slot `/8`、`画像を出力（4枚）`、出力順 `split_1.png` -> `split_4.png` を確認した
      - 390 / 820 / 1024 / 1280 で入口画面、split-2編集画面、split-4編集画面に横スクロール破綻がないことを確認した
      - console error / warn なしを確認した

- 実装プロンプト3: 3分割対応
  ```text
  D:\V_streamer_tools で別ブランチを作成して作業してください。
  baseは2分割PRのマージ後main、またはstacked PRなら2分割ブランチにしてください。

  目的:
  SNS分割画像メーカーに3分割を追加する。完成出力は画像1が24:9、画像2/3が8:13.5。既存2分割/4分割挙動は変えない。

  要件:
  - preset split-3 を実装する
  - メイン画像16:9の切り方:
    - 画像1: 左半分8:9
    - 画像2: 右上8:4.5
    - 画像3: 右下8:4.5
  - 出力順は split_1 -> split_2 -> split_3
  - split_1 は24:9
  - split_2 / split_3 は8:13.5
  - 編集画面内で 追加方式: 個別追加 / フレーム追加 を切り替えられる
  - 個別追加:
    - 追加画像6枚
    - 画像1 左8:9 / 画像1 右8:9
    - 画像2 上8:4.5 / 画像2 下8:4.5
    - 画像3 上8:4.5 / 画像3 下8:4.5
  - フレーム追加:
    - 追加画像3枚
    - 画像1 フレーム24:9
    - 画像2 フレーム8:13.5
    - 画像3 フレーム8:13.5
    - 各フレーム全面描画後、中央メイン領域を上書き
  - 全体プレビューは上に画像1、下に画像2/3横並び
  - メイン分割プレビューは左大 + 右上下の構図を確認できること
  - 初期値は個別追加
  - 保存キー、IndexedDB名/store名は変えない

  検証:
  - npm run lint
  - npx tsc --noEmit
  - git diff --check
  - npm run build
  - browser-useまたはChrome DevToolsでsplit-3を確認
    - 個別追加/フレーム追加の切替
    - 全体プレビューが上1枚 + 下2枚横並び
    - split_1 -> split_2 -> split_3 のdownload発火順
    - 390 / 820 / 1024 / 1280 の横スクロール破綻なし
  - 既存split-2 / split-4の回帰確認
  - task.mdへ実装内容と検証結果を追記
  ```

- 実装プロンプト4: 表記統一 / プレビュータブ整理 / リリース前回帰
  ```text
  D:\V_streamer_tools で別ブランチを作成して作業してください。
  baseは3分割PRのマージ後main、またはstacked PRなら3分割ブランチにしてください。

  目的:
  SNS分割画像メーカーの2/3/4分割対応後に、利用者向け表記とプレビュー体験を統一し、公開前の回帰確認を行う。

  要件:
  - 4分割の表示を以下へ統一する
    - 旧 1+8連結 -> 個別追加
    - 旧 1+4差し替え -> フレーム追加
    - 必要なら小さく 旧: 1+8 / 旧: 1+4 を補足する
  - プレビュータブを 編集 / 全体 / メイン分割 に統一する
  - 全体プレビュー:
    - 2分割: 24:9完成画像2枚を縦並び
    - 3分割: 上に画像1、下に画像2/3横並び
    - 4分割: 既存どおり2x2
  - メイン分割プレビュー:
    - 2分割: 左右2分割
    - 3分割: 左大 + 右上下
    - 4分割: 既存どおり2x2
  - 入力エリアの説明文を、個別追加 / フレーム追加 / 各比率が分かる表現に整理する
  - 出力順の説明を分割数ごとに誤解なく表示する
  - 保存済みdraft migration、破損localStorage、IndexedDB画像復元の説明を必要に応じて更新する
  - UIの過剰なsection分割は避け、props過多になる変更は次PR候補としてtask.mdへ残す

  検証:
  - npm run lint
  - npx tsc --noEmit
  - git diff --check
  - npm run build
  - browser-useまたはChrome DevToolsで 390 / 820 / 1024 / 1280 を確認
    - 入口画面
    - split-2 / split-3 / split-4 編集画面
    - 各分割の全体 / メイン分割プレビュー
    - 各分割の出力順
    - localStorage復元、broken JSON保護、IndexedDB画像復元
    - console error / warnなし
  - task.mdへ最終回帰結果と残課題を追記
  ```
