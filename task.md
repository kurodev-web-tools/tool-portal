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
- [ ] 2本目は Schedule Calendar と連携しやすいツールを優先する（候補: サムネイルエディタ（手動編集型））
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
- [ ] 実装順は `PC -> Tablet横 -> Mobile` で進める
- [ ] タブレット縦（`~1023px`）は Mobile 統合UIとして扱う
- [ ] レスポンシブ境界を以下で固定する
  - `1280px~`: PC（左キャンバス + 右設定パネル）
  - `1024~1279px`: Tablet横（コンパクト2ペイン）
  - `~1023px`: Mobile統合UI（タブレット縦含む）
- [ ] UI優先度を固定する
  - 文字編集（フォント/サイズ/色/縁取り/影）を最優先
  - エフェクトはMVP最小（縁取り/影/透明度/ぼかし）
  - 保存は `localStorage`、出力は PNG/JPEG
