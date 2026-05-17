# task.md

このファイルは現在の運用タスクだけを置く。完了済みの詳細ログ、比較メモ、長い経緯は PR 本文か `docs/archive` に寄せる。

## 現在の前提

- 作業は `main` 直ではなく feature branch / worktree で行う。
- 意味のある実装後は、このファイルに実装内容、検証、必要な幅別確認を残す。
- UI 変更時の確認幅は `390 / 820 / 1024 / 1280 / 1366px` を基本にする。
- ブラウザー実見は、通常の表示確認と幅別確認では Codex app の in-app browser を優先する。繰り返し操作や機械的な console / canvas 確認は Playwright、原因調査は Chrome DevTools MCP に切り替える。
- 2026-05 の完了済み詳細ログは `docs/archive/TASK_HISTORY_2026-05.md` を参照する。
- PR #86 から PR #123 まで `main` / `origin/main` に merge 済み。PR #103 以降の詳細は `docs/archive/TASK_HISTORY_2026-05.md` の P27 を参照する。
- PR #124 `[codex] Plan next thumbnail presets and prelaunch board` は `main` / `origin/main` に merge 済み。merge commit は `105cc457aac1963bc17582dfbfde964598ca44b7`。次 preset 候補 planning の詳細は `docs/future/THUMBNAIL_EDITOR_USECASE_PRESET_CANDIDATES.md` と `docs/mockups/thumbnail-editor-usecase-preset-candidates/README.md` を参照する。

## Active

- Public prelaunch visual review Task 1 / portal public copy and status polish
  - 結果記録 2026-05-16 / `portal-public-copy-status-polish`: PR #134 `[codex] Document prelaunch visual review notes` が merge 済み、`HEAD` / `origin/main` が merge commit `fbb686f8a9119ebb7b7d0e6b44d76efc2a0450b6` で同期済みであることを確認し、`origin/main` 起点の `D:/V_streamer_tools/.worktrees/portal-public-copy-status-polish` で実装。Home hero 右側の大きい `V` visual を削除し、公開中の3ツール / 3ステップ導線 / 探し方の summary に整理。suite card の tool count は `lib/tools.ts` から算出するようにし、準備中 suite / tool card は dashed border と muted background で公開中 item と区別した。Home / Tools / feedback / 準備中 tool copy は公開中の利用者向け表現へ寄せ、X / Discord の実URLは未確定のためリンクは増やさず受付窓口予定の文言に留めた。
  - contract 更新: `scripts/tool-portal-entry-contract.mjs` に suite key / tool count の data alignment、hero の大きい `V` visual 不使用、feedback の X / Discord 予定文言、`MVP公開中` / `公開版ではまだ利用できません` の非表示を追加。
  - 検証結果: `node scripts/tool-portal-entry-contract.mjs`、`npm run lint`、`npx tsc --noEmit` は通過。`git diff --check` は exit 0 で、portal 関連ファイルと `task.md` の LF -> CRLF warning のみ。
  - 幅別確認: in-app browser で `/` と `/tools` を `390 / 820 / 1024 / 1280 / 1366px` で確認。全幅で body 横 overflow なし、console error / warn なし、公開向け copy と準備中表示が読める。追加で `/tools?suite=fan-brand` を `390 / 1280px` で確認し、準備中 tool card copy と disabled button copy が読めることを確認。
  - 残リスク: X / Discord の実URLは repo から確定できなかったため未リンク。準備中候補の名称や数は現行 `lib/tools.ts` に合わせた表示で、公開後に候補整理する場合は copy の再点検余地あり。

- Public prelaunch visual review Task 2 / Thumbnail Editor responsive control polish
  - 結果記録 2026-05-17 / `thumbnail-responsive-control-polish`: PR #135 `[codex] Polish portal public copy and status cards` が merge 済みで、`HEAD` / `origin/main` が merge commit `362345c8d4613d5d23e30429ea0c258ca5cc7b3a` で同期済みであることを確認。`origin/main` 起点の `D:/V_streamer_tools/.worktrees/thumbnail-responsive-control-polish` で実装した。Thumbnail Editor の header controls は 1024px 付近で折り返せる compact layout にし、mobile action toolbar は横 overflow guard を持つ形へ変更。preset / canvas size / output ratio の custom menu は outside click / Escape で閉じるようにした。9:16 / 1:1 ratio は `後続候補` copy 付きで disabled 化し、16:9 flow は維持。mobile bottom nav の `テキスト` は text / image layer 両方に通じる `編集` へ変更し、preset filter / card chip は小幅で横スクロール guard を持たせた。登録済み素材 accordion、layer drag reorder、preset rail 再設計、export scale、schema、asset / preset 追加、英語対応は入れていない。
  - contract 更新: `scripts/thumbnail-responsive-control-polish-contract.mjs` を追加し、neutral bottom nav label、header / mobile toolbar guard、outside click / Escape close、9:16 / 1:1 disabled option、chip overflow guard を固定した。
  - 検証結果: `node scripts/thumbnail-responsive-control-polish-contract.mjs`、`node scripts/thumbnail-preview-controls-contract.mjs`、`node scripts/thumbnail-center-guide-contract.mjs`、`node scripts/thumbnail-preset-discovery-contract.mjs`、`node scripts/thumbnail-preset-variants-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`git diff --check` は通過。`git diff --check` は `components/thumbnail-editor/ThumbnailEditorApp.tsx` / `task.md` の LF -> CRLF warning のみ。
  - 幅別確認: in-app browser で `/tools/thumbnail-editor` を `390 / 820 / 1024 / 1280 / 1366px` で確認。全幅で body / main 横 overflow なし、console error / warn なし、header / top toolbar controls の見切れなし、bottom nav `編集` 表示、export / SNS handoff copy 維持を確認。`390px` で output ratio menu の outside click / Escape close、9:16 / 1:1 disabled、16:9 option enabled を確認。
  - 残リスク: chip 群は最小 guard として横スクロールへ寄せた段階で、preset rail / 横スクロール再設計は scope 外。実画像 export と SNS Split Image Maker への end-to-end handoff は schema / copy 維持と contract で確認し、今回の browser 操作では実ファイル生成までは実施していない。
  - 追記 2026-05-17 / `thumbnail-header-menu-overlay`: header / mobile top controls の custom listbox が editor 裏に隠れないよう、desktop header と mobile control section に明示的な overlay layer を付け、listbox menu を `z-[120]` へ上げた。preset / canvas size / output ratio の選択肢、outside click / Escape close、disabled ratio copy、export / SNS handoff は変更なし。
  - 追加検証: `node scripts/thumbnail-responsive-control-polish-contract.mjs`、`node scripts/thumbnail-preview-controls-contract.mjs`、`node scripts/thumbnail-center-guide-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`npm run lint`、`npx tsc --noEmit` は通過。in-app browser で `/tools/thumbnail-editor` を `390 / 820 / 1024 / 1280 / 1366px` で確認し、`プリセット` / `キャンバスサイズ` / `出力比率` の各 menu が editor / canvas より前に出ること、body / document 横 overflow なし、console error / warn なしを確認。残リスクは実画像 export 未実施のみ。

- Public prelaunch visual review Task 3 / SNS Split preview and landing copy polish
  - 結果記録 2026-05-17 / `sns-split-preview-landing-polish`: PR #136 `[codex] Polish thumbnail responsive controls` が merge 済みで、`HEAD` / `origin/main` が merge commit `e53f1546775da07fc753645b6aebe3d0e9ce7900` で同期済みであることを確認。`origin/main` 起点の `D:/V_streamer_tools/.worktrees/sns-split-preview-landing-polish` で実装した。preset landing の `2分割 / 3分割 / 4分割` 説明を短くし、保存順を full order で表示。preview tab の `メイン分割` label は mobile で分断されにくい `完成形` に変更し、説明文で最終投稿イメージとしての役割を補足。`split-2 / split-4` の完成形 preview は mobile でも2列の最終配置として見えるようにした。投稿順、保存順、PNG / JPEG export copy、Thumbnail Editor handoff copy / 導線は維持。
  - contract 更新: `scripts/sns-split-image-maker-contract.mjs` に短い landing copy、保存順 full order、`完成形` tab label、完成形 preview guidance、mobile 2列 preview guard、legacy label 非表示を追加。
  - 検証結果: `node scripts/sns-split-image-maker-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`git diff --check` は通過。`git diff --check` は SNS Split 関連ファイルと `task.md` の LF -> CRLF warning のみ。
  - 幅別確認: in-app browser で `/tools/sns-split-image-maker`、`/tools/sns-split-image-maker?preset=split-2`、`?preset=split-3`、`?preset=split-4` を `390 / 820 / 1024 / 1280 / 1366px` で確認。全20ケースで body / main 横 overflow なし、console error / warn なし。landing の短い説明と保存順、preset 画面の投稿順 preview、`完成形` tab、mobile edit view の PNG / JPEG copy と `PNGを2/3/4枚保存` button copy を確認。
  - 残リスク: 実画像を Thumbnail Editor から渡す end-to-end handoff と PNG / JPEG 実ダウンロードは今回未実施。schema / storage / export 形式は変更せず、handoff copy と導線は contract と画面表示で維持確認した。

- Public pre-release work order
  - 進め方: `ポータル整理` -> `各ツール公開前調整` -> `最終確認` の順で進める。
  - session / worktree 方針: レビューしやすさと戻しやすさを優先し、原則として session / worktree / branch / PR を分ける。
  - 推奨分割: `portal-suite-reclassification`、`schedule-public-prelaunch-polish`、`thumbnail-privacy-whiteboard-preset`、`thumbnail-preset-placement-polish`、`sns-split-public-prelaunch-polish`、`public-final-qa`。
  - Thumbnail Editor は範囲が大きくなりやすいため、privacy / whiteboard preset と既存 preset placement polish を別 PR にする。

- 3 tools public pre-release adjustment
  - 目的: 新しい preset 追加より先に、Schedule Calendar / Thumbnail Editor / SNS Split Image Maker を公開前に触って確認できる状態へ整える。
  - 実装方針: 既存機能の配置、copy、導線、初期状態、handoff、export の polish に閉じる。新規大型機能、schema 変更、重い onboarding、外部連携は入れない。
  - suite 整理: `Thumbnail Editor` と `SNS分割画像メーカー` は `ファン＆ブランド` ではなく `配信ワークフロー` に移す。3ツールが `Schedule Calendar -> Thumbnail Editor -> SNS分割画像メーカー` の一連導線として見える状態にする。
  - category 方針: `Thumbnail Editor` と `SNS分割画像メーカー` の tool category は `画像・デザイン` のままにする。suite は利用シーン、category はツール種別として分ける。
  - fan-brand copy: `ファン＆ブランド` の説明と tags からサムネイル作成 / SNS分割画像づくりの主語を外し、ファン交流、プロフィール整備、ブランド素材づくり寄りの説明へ更新する。
  - ブラウザー確認: in-app browser を基本に、`390 / 820 / 1024 / 1280 / 1366px` を記録する。
  - 完了条件: 3ツールそれぞれで static checks、主要幅の表示確認、console error なし、公開前の残リスクを task.md / PR 本文へ記録。
  - 結果記録 2026-05-15 / `portal-suite-reclassification`: `thumbnail-editor` と `sns-split-image-maker` の suite を `stream-workflow` へ移し、category は `design` のまま維持。`stream-workflow` の suite copy / tags / toolCount を `Schedule Calendar -> Thumbnail Editor -> SNS分割画像メーカー` の導線寄りに更新し、`fan-brand` はファン交流、プロフィール整備、ブランド素材づくり寄りへ整理。
  - 検証結果: `node scripts/tool-portal-entry-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`git diff --check` は通過。
  - 幅別確認: in-app browser で `/tools?suite=stream-workflow` と `/tools?suite=fan-brand` を `390 / 820 / 1280px` で確認。`stream-workflow` は `Schedule Calendar -> Thumbnail Editor -> SNS分割画像メーカー` が公開ツールとして先頭に並び、`fan-brand` は `Fan Community` のみに絞られる。console error なし。問題がなかったため `1024 / 1366px` は追加確認なし。
  - 次セッション候補: `schedule-public-prelaunch-polish` を推奨。Schedule Calendar の初期導線、予定作成 / 編集、投稿補助、backup / restore、input guard、Schedule -> Thumbnail / SNS Split handoff copy を公開前調整する。
  - 追記 2026-05-15 / review follow-up: 公開前の第一印象では未確定の開発中ツール数を前面に出さない方針へ変更。Hero summary は `開発中のツール 7個` ではなく `公開導線 3ステップ` を表示し、Tools 一覧は初期表示を利用可能ツール優先にする。`fan-brand` は現時点で公開ツールを持たないため `planned` suite として扱う。in-app browser で `/`、`/tools`、`/tools?suite=stream-workflow`、`/tools?suite=fan-brand` を `390 / 820 / 1280px` で確認し、console error なし。

- Thumbnail Editor preset default placement pass
  - 目的: 既存 preset の初期テキスト / asset / standee guide / frame 配置を mock 画像と再比較し、正式版の default placement へ寄せる。
  - 対象: 既存 preset と usecase preset。特に `first_stream` / `anniversary_stream` / `endurance_stream` / `project_stream` / `cover_song_notice` / `event_notice` は `docs/mockups/thumbnail-editor-usecase-preset-candidates/` の mock と見比べる。
  - 進め方: Codex が mock と現行 canvas を比較して初期配置案を調整 -> in-app browser 幅別確認 -> ユーザー目視レビュー -> 微調整 -> その値を preset default placement として固定。
  - 入れないもの: 新 preset body、production asset 追加、schema、canvas export、font loading helper、font search / recently used UI、Schedule Calendar、SNS Split Image Maker の実装修正。
  - 検証: 対象 preset の contract、`node scripts/thumbnail-preset-discovery-contract.mjs`、`node scripts/thumbnail-preset-batch-readiness-contract.mjs`、`node scripts/thumbnail-preset-variants-contract.mjs`、`node scripts/thumbnail-font-policy-contract.mjs`、`node scripts/thumbnail-material-assets-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`git diff --check`、in-app browser 幅別確認。
  - 結果記録 2026-05-15 / PR #127 follow-up: `docs/mockups` と preset 定義を照合し、mock がある phase1 / phase2 / phase3 / usecase preset を対象に初期配置を寄せた。`配信告知` は見出しと時刻帯を mock 寄りに上げ、`週間予定` は予定表を右側へ寄せて列幅を整理。`ゲーム実況` は時刻バッジを mock の左下小型表示へ寄せ、`お知らせ` は右側 guide と見出し / 日付位置を微調整。`切り抜き` は mock の大きな動画フレーム相当として editable frame layer を追加し、ラベル / 見出し / 時刻を合わせた。`X告知画像` は本文カードと右側 guide を mock 寄りにし、`耐久配信` は時刻を左上、challenge label を上部、目標 / progress を中央下へ寄せた。`プライバシー告知` / `ホワイトボード` は新規作り込みを避け、既存 baseline の見切れなし / 重なり破綻なし確認に留めた。
  - contract 更新: `scripts/thumbnail-preset-placement-polish-contract.mjs` を追加。mock path、主要レイヤー名、position / size / rotation / opacity / fontSize、`切り抜き` の動画フレーム layer order、`プライバシー告知` / `ホワイトボード` の baseline layer bounds を固定し、後続のブラウザ手動調整値を layer name 単位で preset 定義へ戻しやすくした。
  - 追記 2026-05-15-16 / manual draft apply: ユーザーが Chrome 上で `配信告知` / `初配信` / `記念配信` / `耐久配信` / `企画配信` / `歌ってみた告知` / `イベント告知` / `歌枠` / `雑談` / `切り抜き` / `ゲーム実況` / `コラボ` / `お知らせ` / `週間予定` / `X告知画像` / `プライバシー告知` を調整して下書き保存した JSON を受け取り、`stream_announce` / `first_stream` / `anniversary_stream` / `endurance_stream` / `project_stream` / `cover_song_notice` / `event_notice` / `karaoke` / `chatting` / `clip` / `game_live` / `collaboration` / `announcement` / `weekly_schedule` / `x_announcement` / `privacy_notice` の layer position / size / rotation / layer order を初期 preset へ反映。`createDraftFromPreset` の整数丸めに合わせ、x / y / width / height は下書き値の近似整数で固定した。
  - 追記 2026-05-16 / `雑談` 時刻アイコン: built-in `imagegen` で `chatting-clock-icon-cozy-v1.png` を生成し、クロマキー除去後に square transparent PNG として `public/assets/images/thumbnail-editor/decorations/phase5/` へ追加。`chatting` preset の丸 + 短針 + 長針 shape 3 レイヤーを `画像 5（時刻アイコン）` 1 レイヤーへ置換し、ユーザーが後続で初期位置を調整しやすい状態にした。
  - 追記 2026-05-16 / `プライバシー告知` mock: built-in `imagegen` で 16:9 mock を生成し、`docs/mockups/thumbnail-editor-usecase-preset-candidates/privacy-notice-mock.png` として保存。生成 mock はレイアウト目標用で、文字は後から editable text layer で正確に載せる前提。`scripts/thumbnail-preset-placement-polish-contract.mjs` に mock path を追加した。
  - 追記 2026-05-16 / `プライバシー告知` asset 分割: mock を元に built-in `imagegen` で `privacy-label-plaque-navy-gold-v1.png` / `privacy-main-card-ivory-gold-v1.png` / `privacy-sub-info-card-ivory-v1.png` / `privacy-redaction-stack-v1.png` / `privacy-private-panel-blue-v1.png` / `privacy-lock-badge-medal-v1.png` / `privacy-time-pill-navy-gold-v1.png` を 1 asset 1枚で生成。クロマキー除去後、既存の単体 redaction / mask / lock asset を preset から外し、新 asset 群を `privacy_notice` の初期レイヤーへ差し替えた。後続で browser 上の微調整値を取り込めるよう、placement contract に各 layer name の初期位置を追加。
  - 検証結果: `node scripts/thumbnail-preset-placement-polish-contract.mjs`、`node scripts/thumbnail-privacy-whiteboard-preset-contract.mjs`、`node scripts/thumbnail-phase1-preset-assets-contract.mjs`、`node scripts/thumbnail-phase2-preset-assets-contract.mjs`、`node scripts/thumbnail-phase3-preset-assets-contract.mjs`、`node scripts/thumbnail-usecase-first-stream-preset-contract.mjs`、`node scripts/thumbnail-usecase-anniversary-stream-preset-contract.mjs`、`node scripts/thumbnail-usecase-endurance-stream-preset-contract.mjs`、`node scripts/thumbnail-usecase-project-stream-preset-contract.mjs`、`node scripts/thumbnail-usecase-cover-song-notice-preset-contract.mjs`、`node scripts/thumbnail-usecase-event-notice-preset-contract.mjs`、`node scripts/thumbnail-preset-discovery-contract.mjs`、`node scripts/thumbnail-preset-batch-readiness-contract.mjs`、`node scripts/thumbnail-preset-variants-contract.mjs`、`node scripts/thumbnail-font-policy-contract.mjs`、`node scripts/thumbnail-material-assets-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`npm run lint`、`npx tsc --noEmit` は通過。`git diff --check` は exit 0 で、`lib/thumbnail-editor.ts` / `task.md` の LF -> CRLF warning のみ。
  - 最終検証 2026-05-16 / PR 作成前: 上記に加えて `node scripts/thumbnail-phase5-announcement-preset-contract.mjs`、`node scripts/thumbnail-phase5-chatting-preset-contract.mjs`、`node scripts/thumbnail-phase5-clip-preset-contract.mjs`、`node scripts/thumbnail-phase5-collaboration-preset-contract.mjs`、`node scripts/thumbnail-phase5-game-live-preset-contract.mjs`、`node scripts/thumbnail-phase5-weekly-schedule-preset-contract.mjs`、`node scripts/thumbnail-phase5-x-announcement-preset-contract.mjs` も通過。`npm run lint`、`npx tsc --noEmit`、`git diff --check` も再実行し、`git diff --check` は LF -> CRLF warning のみで exit 0。
  - 幅別確認: in-app browser で `/tools/thumbnail-editor` を `390 / 820 / 1024 / 1280 / 1366px` で確認。`1280px` では配置を触った `配信告知`、`週間予定`、`ゲーム実況`、`お知らせ`、`切り抜き`、`X告知画像`、`耐久配信`、`プライバシー告知`、`ホワイトボード` を順に適用し、console error / warn なし。代表表示として `390px` は `ホワイトボード` と `プライバシー告知`、`820px` は `週間予定`、`1024px` は `切り抜き`、`1280px` は `耐久配信`、`1366px` は `X告知画像` を確認。小幅では canvas 自体は横スクロール可能な editor viewport に入るが、preset layer bounds は contract 上 full canvas 内に収まる。
  - 残リスク: mock との完全な pixel 一致ではなく、初期値を目視で寄せた段階。`切り抜き` は mock に近づけるため動画フレーム layer を足したが、実動画 / スクリーンショット差し替え後の最終見え方は未確認。`プライバシー告知` / `ホワイトボード` は mock がないため大きな polish は未実施。
  - 次セッション候補: ユーザー目視レビューで気になった preset だけ、browser 上で layer 名、preset id、`x / y / width / height / rotation / opacity / fontSize` を控えて `scripts/thumbnail-preset-placement-polish-contract.mjs` と `lib/thumbnail-editor.ts` に反映する。その後 `sns-split-public-prelaunch-polish` で Thumbnail Editor から渡した画像の分割表示を確認する。
  - 追記 2026-05-16 / center guide overlay: PR #128 merge 後の `origin/main` 起点で、編集 canvas とモバイル全体プレビューへ preview-only の縦横中央ガイドを追加。SNS分割画像メーカーへ接続しない通常利用でも中央合わせを確認しやすくする目的で、分割モード別ガイドは入れない。ガイドは DOM overlay のみで、`drawThumbnail` / export / handoff payload / preset schema には含めない。
  - contract 更新: `scripts/thumbnail-center-guide-contract.mjs` を追加。中央ガイド overlay が decorative / pointer-events none で、編集 preview と mobile full preview の両方に表示され、export 用 `drawThumbnail` options に混ざらないことを固定。
  - 検証結果: `node scripts/thumbnail-center-guide-contract.mjs`、`node scripts/thumbnail-preset-placement-polish-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`npm run lint`、`npx tsc --noEmit` は通過。`git diff --check` は exit 0 で、`components/thumbnail-editor/ThumbnailEditorApp.tsx` / `task.md` の LF -> CRLF warning のみ。
  - 幅別確認: dev server の `/tools/thumbnail-editor` を `390 / 820 / 1024 / 1280 / 1366px` で確認。全幅で編集 canvas 上の中央ガイドが表示され、`390px` では `全体` モーダル側の中央ガイドも表示。body 横 overflow なし、console error / warn なし。
  - 追記 2026-05-16 / preview control polish: 同じ worktree で中央ガイド ON/OFF、表示倍率の `100%` 戻し / `合わせる`、draft-only の Undo / Redo、選択レイヤーの操作補助を追加。Undo / Redo は `Ctrl+Z`、`Ctrl+Y`、`Ctrl+Shift+Z` と toolbar button に対応し、履歴対象は draft 変更のみ。zoom、中央ガイド、panel 開閉、toast は履歴に入れない。ドラッグ / 拡大縮小 / 回転は pointer 操作 1 回を 1 履歴として扱う。
  - 操作補助: 選択レイヤーのプロパティ panel に `サイズ -` / `サイズ +` / `回転 -5` / `回転 +5` / `中央へ` を追加。大きくした object の resize / rotate handle が表示領域外へ出た場合でも、画面内の固定操作で復帰できるようにする。canvas selection / export / handoff / preset schema は変更しない。
  - contract 更新: `scripts/thumbnail-preview-controls-contract.mjs` を追加。preview toolbar、guide toggle、zoom reset / fit、Undo / Redo、keyboard shortcuts、操作補助、export options 非混入を固定。
  - 検証結果: `node scripts/thumbnail-preview-controls-contract.mjs`、`node scripts/thumbnail-center-guide-contract.mjs`、`node scripts/thumbnail-preset-placement-polish-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`npm run lint`、`npx tsc --noEmit` は通過。`git diff --check` は exit 0 で、`components/thumbnail-editor/ThumbnailEditorApp.tsx` / `task.md` の LF -> CRLF warning のみ。
  - 幅別確認: dev server の `/tools/thumbnail-editor` を `390 / 820 / 1024 / 1280 / 1366px` で確認。全幅で preview toolbar と中央ガイドが表示され、body 横 overflow なし、console error / warn なし。`390px` では toolbar が viewport 内に収まり、`1280px` で中央ガイド ON/OFF、操作補助の `サイズ +`、Undo、Redo が表示上の `幅` 入力へ反映されることを確認。
  - 次セッション候補: SNS Split Image Maker 側の公開前調整へ進む。Thumbnail Editor から渡した画像の受け取り、2分割 / 3分割 / 4分割の初期状態、メイン画像 guard、境界調整、投稿順、個別 PNG / JPEG export copy を確認する。Thumbnail Editor 追加作業が必要なら、今回の Undo / Redo 履歴が過剰に細かくならないか、実操作レビューで気になった point のみ微調整する。

- Schedule Calendar public pre-release adjustment
  - 確認観点: 初期導線、予定作成 / 編集、投稿補助、backup / restore、input guard、Schedule -> Thumbnail / SNS Split handoff copy。
  - 入れないもの: Google Calendar 連携、ログイン / サーバー同期、シリーズ一括編集、例外日、週間予定画像生成。
  - 検証: `node scripts/schedule-calendar-storage-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`git diff --check`、in-app browser 幅別確認。
  - 結果記録 2026-05-15 / `schedule-public-prelaunch-polish`: PR #125 `[codex] Reclassify portal suite tools` が `main` / `origin/main` に merge 済みであることを確認し、`origin/main` 起点の `.worktrees/schedule-public-prelaunch-polish` で実装。Schedule Calendar の初期導線を「予定作成 -> 告知文 -> サムネ -> 分割画像」へ短く寄せ、空状態、投稿補助、backup / restore、input guard、handoff 失敗時 copy を公開前の実用導線として整理した。storage schema、handoff payload、Thumbnail Editor / SNS Split Image Maker 本体は変更していない。
  - contract 更新: `scripts/schedule-calendar-prelaunch-polish-contract.mjs` を追加し、初期導線、投稿補助、backup / restore、input guard、handoff copy と、storage version / handoff TTL / 画像本文を渡さない境界を固定。
  - 検証結果: `node scripts/schedule-calendar-prelaunch-polish-contract.mjs`、`node scripts/schedule-calendar-storage-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`npm run lint`、`npx tsc --noEmit` は通過。`git diff --check` は commit 前に最終実行する。
  - 幅別確認: in-app browser で `/tools/schedule-calendar` を `390 / 820 / 1024 / 1280 / 1366px` で確認。`390 / 820px` はモバイル統合UIとして、空いている時間 / 右下＋から予定追加できる初期導線が見える。`1024px` は右パネル4タブ付きのタブレット2ペイン、`1280 / 1366px` は左ナビ付きPC2ペインとして表示。追加で `1024px` の投稿補助 / 設定 tab、`390px` の設定 tab を確認し、backup copy と handoff copy が読める。console error なし。
  - 残リスク: 実データ入りの長文予定や大量予定での目視確認は未実施。今回の scope は copy / 初期導線 / handoff 周辺の polish に限定し、Google Calendar 連携、ログイン / 同期、シリーズ一括編集、例外日、週間予定画像生成は引き続き freeze 後候補。
  - 次セッション候補: `thumbnail-privacy-whiteboard-preset` を先に進め、Schedule Calendar から渡った予定テキストが Thumbnail Editor の用途別プリセット選択で迷いにくいか確認する。続けて `thumbnail-preset-placement-polish`、その後 `sns-split-public-prelaunch-polish`。

- Thumbnail Editor privacy / whiteboard preset pre-release adjustment
  - 結果記録 2026-05-15 / `thumbnail-privacy-whiteboard-preset`: PR #126 `[codex] Polish schedule prelaunch flow` が `main` / `origin/main` に merge 済みで、`origin/main` が merge commit `7403b6d8d2ace02a87d9e9d8b5b9c1eb4df888f1` を含むことを確認。`origin/main` 起点の `.worktrees/thumbnail-privacy-whiteboard-preset` で実装した。
  - 変更内容: `プライバシー告知` と `ホワイトボード` preset を追加。`プライバシー告知` は `[$imagegen](C:\Users\taka\.codex\skills\.system\imagegen\SKILL.md)` built-in mode で `privacy-redaction-bar-v1.png`、`privacy-mask-panel-v1.png`、`privacy-lock-badge-v1.png` を個別生成し、crop なしの complete object として配置した。`ホワイトボード` は完全 blank utility preset に寄せ、画像 asset やメモカード、立ち絵ガイド、装飾 object は置かず、白板面と handoff 用の `見出し` / `時刻` / `サブ` / `ラベル` text layer だけにした。schema、storage、crop 仕様、font loading、Schedule Calendar 本体、SNS Split Image Maker 本体は変更していない。Schedule Calendar 由来の予定テキストは従来どおり `見出し` / `時刻` / `サブ` / `ラベル` に入る前提で、preset 選択 copy、適用確認 copy、export / SNS分割画像メーカーへの次アクション copy を公開前向けに調整した。
  - contract 更新: `scripts/thumbnail-privacy-whiteboard-preset-contract.mjs` を追加し、2 preset の id / category / usage label / 初期 copy / editable text layer / privacy generated asset 3点の存在と crop なし配置 / whiteboard blank boundary / handoff schema 非変更 / preset 選択 copy を固定。既存 `thumbnail-preset-discovery-contract.mjs`、`thumbnail-preset-variants-contract.mjs`、`thumbnail-preset-batch-readiness-contract.mjs` も新 preset id 前提へ更新した。
  - 検証結果: `node scripts/thumbnail-privacy-whiteboard-preset-contract.mjs`、`node scripts/thumbnail-preset-discovery-contract.mjs`、`node scripts/thumbnail-preset-batch-readiness-contract.mjs`、`node scripts/thumbnail-preset-variants-contract.mjs`、`node scripts/thumbnail-material-assets-contract.mjs`、`node scripts/thumbnail-quality-guard-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`git diff --check` は通過。privacy 個別 asset 3点は RGBA / corner alpha `0` / alpha bbox margin `32px` を確認。
  - 幅別確認: in-app browser で `/tools/thumbnail-editor` を `390 / 820 / 1024 / 1280 / 1366px` で確認。全幅で `プライバシー告知`、`ホワイトボード`、`SNS分割画像へ進む`、`書き出し前の確認` が表示され、console error / warn なし。追加で `1280px` では検索から `プライバシー告知` と blank 化した `ホワイトボード` を実際に適用し、console error / warn なし。個別生成後の再確認では `プライバシー告知` を適用し、`390 / 820 / 1024 / 1280 / 1366px` で表示維持、`1280px` screenshot で目隠しバー / パネル / lock badge の見切れなしを確認。
  - 残リスク: 実際の Schedule Calendar UI からの handoff 操作は今回は contract で確認し、ブラウザーでは Thumbnail Editor 側の表示 / preset 適用に限定。実データ入りの長文予定、立ち絵差し替え後の見え方、SNS Split Image Maker 側での最終分割表示は後続確認余地あり。
  - 次セッション候補: `thumbnail-preset-placement-polish` で既存 preset と usecase preset の default placement を mock と比較して調整する。その後 `sns-split-public-prelaunch-polish` へ進み、Thumbnail Editor から渡った画像をSNS分割画像メーカーで確認する。

- SNS Split Image Maker public pre-release adjustment
  - 確認観点: `2分割 / 3分割 / 4分割` の初期状態、メイン画像 guard、境界調整、投稿順、個別 PNG / JPEG export copy、Schedule / Thumbnail handoff 後の次アクション。
  - 入れないもの: ZIP 出力、X 以外の比率、複数形式一括 export、重い onboarding。
  - 検証: `node scripts/sns-split-image-maker-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`git diff --check`、in-app browser 幅別確認。
  - 結果記録 2026-05-16 / `sns-split-public-prelaunch-polish`: PR #129 `[codex] Polish thumbnail preview controls` が `main` / `origin/main` に merge 済みであることを確認し、`origin/main` 起点の `.worktrees/sns-split-public-prelaunch-polish` で実装。SNS Split Image Maker の公開前調整として、投稿順 preview copy、メイン画像未選択時の guard、境界調整 guidance、PNG / JPEG の個別保存 button copy、Thumbnail Editor handoff 画像欠落時の recovery copy を整理した。ZIP 出力、X 以外の比率、複数形式一括 export、Thumbnail Editor / Schedule Calendar 本体、schema / storage の大きな変更は入れていない。
  - contract 更新: `scripts/sns-split-image-maker-contract.mjs` に、メイン画像 guard、Thumbnail handoff 失敗時 copy、投稿順 preview、境界調整 guidance、単一形式の個別保存 copy、形式別 export button label を追加で固定。
  - 検証結果: `node scripts/sns-split-image-maker-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`git diff --check` は通過。`git diff --check` は `components/sns-split-image-maker/SnsSplitImageMakerApp.tsx`、`scripts/sns-split-image-maker-contract.mjs`、`task.md` の LF -> CRLF warning のみ。
  - 幅別確認: in-app browser で `/tools/sns-split-image-maker?preset=split-4` を `390 / 820 / 1024 / 1280 / 1366px` で確認。全幅で body 横 overflow なし、投稿順 preview / メイン画像 guard / 境界調整 guidance / 出力順表示が読める。`390 / 820px` はモバイル編集 tab で PNG個別保存 copy と `PNGを4枚保存` button を確認。`1024 / 1280 / 1366px` は desktop aside で export copy も確認。console error / warn なし。
  - 初期状態確認: in-app browser の preset landing から `2分割 / 3分割 / 4分割` を開き、`24:9` / `24:9 / 8:13.5` / `16:27`、`PNGを2枚保存` / `PNGを3枚保存` / `PNGを4枚保存`、`split_1` からの保存順 copy を確認。console error / warn なし。
  - 残リスク: Thumbnail Editor から実画像を書き出して SNS Split Image Maker に渡す end-to-end 操作は今回は未実施。受け取り contract と Thumbnail handoff 画像欠落時の recovery copy は確認済みだが、実データ入りの画像 handoff は PR review / final QA で確認する余地あり。
  - 次セッション候補: `public-final-qa` で Schedule Calendar -> Thumbnail Editor -> SNS Split Image Maker の3ツール導線を通し、実データ入り handoff、主要幅、console error、最終 copy をまとめて確認する。

- Public final QA
  - 結果記録 2026-05-16 / `public-final-qa`: PR #130 `[codex] Polish SNS split prelaunch flow` が `main` / `origin/main` に merge 済みで、`origin/main` が merge commit `c31580594e8245916feed3ef6a003652ce050885` を指すことを確認。`origin/main` 起点の `.worktrees/public-final-qa` / branch `codex/public-final-qa` で実施した。実装修正は不要で、変更はこの QA 記録のみ。
  - 実データ handoff: Schedule Calendar で `公開前QAコラボ配信` を 2026-05-16 20:00-21:00 / YouTube / `#VTuber #公開前QA` として作成し、投稿補助 tab で告知文コピー、`サムネを作る` handoff を確認。Clipboard には実データ入り告知文が入った。
  - Thumbnail Editor: Schedule 由来の `公開前QAコラボ配信` / 2026-05-16 / YouTube / 告知文が反映されることを確認。`ホワイトボード` preset を `予定テキストで適用` し、中央ガイド表示、操作補助の拡大、Undo / Redo button の有効化と操作、export copy、`SNS分割画像メーカーで使う` handoff を確認。
  - SNS Split Image Maker: Thumbnail Editor 由来の画像と告知文を受け取り、メイン画像選択済みとして開始することを確認。`2分割 / 3分割 / 4分割` を開き、投稿順 `split_1 -> split_2` / `split_1 -> split_2 -> split_3` / `split_1 -> split_2 -> split_3 -> split_4`、境界調整 guidance、投稿別 X 調整 `0 -> 24`、PNG / JPEG の単一形式 export copy と `PNGを4枚保存` / `JPEGを4枚保存` copy を確認。
  - 幅別確認: in-app browser で `/`、`/tools`、`/tools?suite=stream-workflow`、`/tools/schedule-calendar`、`/tools/thumbnail-editor`、`/tools/sns-split-image-maker` を `390 / 820 / 1024 / 1280 / 1366px` で確認。全対象で body 横 overflow 0、console error / warn なし。`/tools?suite=stream-workflow` は3ツールが利用可能ツールとして並び、各 tool page は主要導線と保存 / export copy が読める。
  - 検証結果: `node scripts/tool-portal-entry-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`node scripts/schedule-calendar-storage-contract.mjs`、`node scripts/thumbnail-preview-controls-contract.mjs`、`node scripts/thumbnail-center-guide-contract.mjs`、`node scripts/sns-split-image-maker-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`git diff --check` は通過。`git diff --check` は `task.md` の LF -> CRLF warning のみで exit 0。
  - 残リスク: 実ブラウザーでの PNG / JPEG ダウンロード生成そのものは、不要な download artifact を残さないため実行していない。SNS Split Image Maker の `2分割 / 3分割` では Thumbnail 由来画像を保持した状態で画面・copy・投稿順を確認したが、各分割の実ファイル pixel 内容は未確認。Google Calendar 連携、ZIP出力、X以外の比率、複数形式一括 export、重い onboarding は scope 外のまま。
  - 未確認範囲: production build / deployed URL での browser 確認、実ダウンロードファイルの画像内容確認、長期間運用後の localStorage 大量データ状態、外部SNS投稿画面での最終表示。
  - 追記 2026-05-16 / `public-release-smoke`: PR #131 `[codex] Document public final QA` が merge 済みで、`HEAD` / `origin/main` は merge commit `d2ed41b81293a9e2cdb27670af19f67e8d1d4625` で同期済み。通常 checkout には既存の `next-env.d.ts` 差分があったため触らず、`origin/main` 起点の `D:/V_streamer_tools/.worktrees/public-release-smoke` / branch `codex/public-release-smoke` で実施した。変更はこの QA 記録のみ。
  - production build / static export: `npm run build` は通過し、`node scripts/static-export-rsc-aliases.mjs --check` も `8` 件 verify。build 後の `next-env.d.ts` 生成差分はなし。Next.js は親 checkout と worktree の複数 lockfile を検出して workspace root 推定 warning を出したが、build / export 自体は成功。
  - local production browser: deployed URL は prompt / repo から確定できなかったため、公開URLでの確認は blocker として残し、`out/` を `http://127.0.0.1:3019` で静的配信して代替確認。`/`、`/tools`、`/tools?suite=stream-workflow`、`/tools/schedule-calendar`、`/tools/thumbnail-editor`、`/tools/sns-split-image-maker` を `390 / 820 / 1024 / 1280 / 1366px` で確認し、全30ケースで body 横 overflow なし、console error / warn なし。`/tools?suite=stream-workflow` は `Schedule Calendar -> Thumbnail Editor -> SNS分割画像メーカー` の順で表示。
  - SNS Split Image Maker 実ダウンロード: repo 外の一時 PNG を入力し、`2分割 / 3分割 / 4分割` それぞれで PNG / JPEG 保存を実行。download artifact は OS temp 上で検査後に削除。出力数は `2 / 3 / 4`、ファイル名は `split_1` から順番通り、画像 dimensions は `split-2: 1920x720 x2`、`split-3: 1920x720 + 1280x2160 x2`、`split-4: 1280x2160 x4`。全ファイルで pixel 内容は非空。
  - Schedule Calendar localStorage smoke: version `2` payload に長文予定と同日複数予定を入れて `390 / 1280px` で確認。`390px` では長文予定表示、`1280px` では長文予定と同日2件目の表示を確認し、storage error、body 横 overflow、console error / warn はなし。大規模 migration 実装は不要。
  - 外部SNS投稿画面: 実ログイン / 実投稿は不要のため未実施。外部SNS投稿画面での最終表示は未確認として残し、公開判定で X intent / 投稿 composer の表示まで含める場合は、人間のログイン済み環境で manual review する。
  - 検証結果: `node scripts/tool-portal-entry-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`node scripts/schedule-calendar-storage-contract.mjs`、`node scripts/thumbnail-preview-controls-contract.mjs`、`node scripts/thumbnail-center-guide-contract.mjs`、`node scripts/sns-split-image-maker-contract.mjs`、`npm run lint`、`npx tsc --noEmit` は通過。
  - 未確認・残リスク: deployed URL が未特定のため本番URL smoke は未実施。外部SNS投稿画面の最終表示は未確認。build warning は worktree / 親 checkout の複数 lockfile に起因する可能性が高く、公開成果物には影響していないが、CI / deploy 環境で同 warning が出るかは別途確認余地あり。

- Public launch manual / post-launch smoke
  - 公開前: 最終の細かい目視確認はユーザー側で実施。Codex 側で残す blocker は deployed URL 未確定と外部SNS投稿画面未確認のみ。
  - 公開後追加 smoke 1: 公開URL上で SNS Split Image Maker の `2分割 / 3分割 / 4分割` が PNG / JPEG とも download できるか確認する。
  - 公開後追加 smoke 2: X の投稿画面で `split_1 -> split_2 -> split_3 -> split_4` の順に添付し、投稿直前 preview の順番、比率、切れ方を確認する。実投稿は原則不要。
  - 公開後追加 smoke 3: X 投稿後 timeline 表示まで確認したい場合のみ、検証用または鍵付きアカウントで実投稿する。本番アカウントでの実投稿は release blocker ではなく任意の confidence check として扱う。
  - 上記で問題がなければ、次の優先タスクは初期段階で EN 圏もカバーするための英語対応に移す。

## Backlog

- English support initial coverage
  - 目的: 公開初期から EN 圏ユーザーが入口と3ツールの主要導線を理解できる状態にする。
  - 初回 scope: portal / tool list / `Schedule Calendar` / `Thumbnail Editor` / `SNS分割画像メーカー` の主要見出し、CTA、empty state、export / handoff copy、metadata を対象にする。
  - 進め方: まず文言 inventory と切替方式を小さく決める。大規模 i18n framework、URL設計変更、保存 schema 変更は初回で急がない。
  - 完了条件: 日本語表示を壊さず、英語表示で主要導線が読めること。`390 / 820 / 1024 / 1280 / 1366px` の幅別確認を残す。

- Thumbnail Editor next preset candidates
  - PR #124 planning の推奨順: `goods_notice` -> `membership_stream` -> `asmr_stream` -> `relay_stream` -> `collab_recruit_notice`。
  - 公開前調整が一段落してから、1 preset / 1 PR で進める。
  - 候補ごとに mock / asset 生成が必要になった時点で `[$imagegen](C:\Users\taka\.codex\skills\.system\imagegen\SKILL.md)` built-in mode を使う。
  - `goods_notice` 実装時は、物販 / merch release 用途として、既存 `イベント告知`、`歌ってみた告知`、通常 `お知らせ` と用途差が分かる preset body / production asset / contract を追加する。

- Freeze 後候補
  - Schedule Calendar: Google Calendar 連携、ログイン / サーバー同期、シリーズ一括編集、例外日、週間予定画像そのものの生成。
  - Thumbnail Editor: 新規 usecase preset、crop 仕様、text / image layer schema、public asset / font 追加。
  - SNS Split Image Maker: ZIP 出力、X 以外の比率、複数形式の大規模 export、重い onboarding。

## Verification baseline

docs / contract 変更時は、必要に応じて次を実行する。

- `node scripts/static-export-rsc-aliases.mjs --check`
- `node scripts/tool-portal-entry-contract.mjs`
- `node scripts/tool-handoff-contract.mjs`
- `node scripts/thumbnail-material-assets-contract.mjs`
- `node scripts/thumbnail-quality-guard-contract.mjs`
- `node scripts/thumbnail-standee-placement-contract.mjs`
- `node scripts/sns-split-image-maker-contract.mjs`
- `npm run lint`
- `npx tsc --noEmit`
- `git diff --check`

UI / 表示文言を触った場合のみ、幅別確認結果をこのファイルに残す。

## Archive / reference

- 2026-04 の履歴: `docs/archive/TASK_HISTORY_2026-04.md`
- 2026-05 の履歴: `docs/archive/TASK_HISTORY_2026-05.md`
- Schedule Calendar future tasks: `docs/future/SCHEDULE_CALENDAR_FUTURE_TASKS.md`
- Thumbnail Editor next PR scope: `docs/future/THUMBNAIL_EDITOR_NEXT_PR_SCOPE.md`
- Thumbnail Editor usecase preset candidates: `docs/future/THUMBNAIL_EDITOR_USECASE_PRESET_CANDIDATES.md`
