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

- English support initial coverage / preview integration branch
  - 統合先: `codex/en-support-preview`。`origin/main` 起点で作成し、B scope 完了までの EN 対応 PR はこの branch 宛てに積む。
  - 初回到達点: B scope として、portal / tool list / `Schedule Calendar` / `Thumbnail Editor` / `SNS分割画像メーカー` の主要見出し、CTA、empty state、export / handoff copy、metadata を英語表示で読める状態にする。C scope の全 UI 文言置換は B 確認後に main 起点の小分け PR へ移す。
  - language switch 方針: 初回表示は browser language (`navigator.languages`) で `en*` を英語、それ以外を日本語にする。手動選択後は保存値を優先する。desktop は theme toggle 付近、mobile は hamburger menu 内に置く。
  - 非対象: URL 設計変更、大規模 i18n framework 導入、保存 schema / IndexedDB / localStorage 既存 key / handoff payload 変更、Google Calendar 連携、外部投稿連携追加は B scope に含めない。
  - PR 分割: 1) locale foundation + language switch、2) Portal / Tools、3) Schedule Calendar、4) Thumbnail Editor / SNS Split Image Maker の主要導線。各 PR は `codex/en-support-preview` 宛てにし、B 完了時点でまとめて確認してから `main` へ持っていくか判断する。
  - 検証方針: 日本語表示を壊さず、英語表示で主要導線が読めること。UI 変更 PR では `390 / 820 / 1024 / 1280 / 1366px` の幅別確認を残す。
  - PR1 locale foundation + language switch 実装済み（branch: `codex/en-locale-foundation` / target: `codex/en-support-preview`）。
    - 実装内容: `ja / en` の locale helper、client locale provider、language switch UI を追加。初回は `navigator.languages` の先頭が `en*` なら `en`、それ以外は `ja`。手動選択後は新規 key `v-streamer-tools-locale` の保存値を優先し、`document.documentElement.lang` を同期する。
    - UI 配置: desktop は portal header の theme toggle 付近、mobile は hamburger drawer 内。workspace sidebar では theme toggle 付近に compact switch を追加。
    - 検証結果: `node scripts/portal-locale-foundation-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`git diff --check` を実行済み。`git diff --check` は改行コード warning のみで exit 0。
    - 幅別確認: in-app browser で `/` と `/tools` を `390 / 820 / 1024 / 1280 / 1366px` 確認。`390 / 820px` は desktop switch 非表示、drawer 内 switch 表示。`1024 / 1280 / 1366px` は desktop switch 表示、drawer 非表示。全幅で `html lang=ja` 同期、body / document 横 overflow なし。
    - 追加確認: Playwright 補助確認で `en-US` 初回 `lang=en`、`ja-JP` 初回 `lang=ja`、手動 `ja` は `en-US` reload 後も維持、手動 `en` は `ja-JP` reload 後も維持。localhost 確認では console warn/error なし。
    - follow-up: mobile drawer の `表示言語` 行を `表示テーマ` と同じ横並びに調整し、language switch の drawer 幅を圧縮。`390px / 430px` drawer で `表示言語` が折り返さず、横 overflow なしを確認。
    - 残リスク: PR1 では主要 copy 翻訳は非対象。in-app browser のログ API には編集中の Fast Refresh warning が残る場合があるため、console clean 判定は編集後の再実行または補助 Playwright の新規 context で確認する。
  - PR2 Portal / Tools copy localization 実装済み（branch: `codex/en-portal-tools-copy` / target: `codex/en-support-preview`）。
    - 実装内容: Portal Home、Tools index、suite card、tool card、status badge、filter bar、feedback notice、portal header / sidebar の主要 copy を `ja / en` 対応。大規模 i18n framework は入れず、`lib/portal-copy.ts` の小さな dictionary / helper を `useLocale()` から参照する。既存日本語 copy は `ja` 側に維持し、Schedule Calendar / Thumbnail Editor / SNS Split Image Maker の本文 UI、URL、localStorage / IndexedDB key、handoff payload、保存 schema は変更なし。
    - metadata 整理: root / Home / Tools の title / description は `lib/portal-metadata.ts` に集約し、PR2 では従来どおり静的な `ja` 基準 metadata を使う。Next metadata の動的 locale 切替は過剰になりやすいため、Schedule Calendar EN copy 以降の PR3+ で必要性を再判断する。
    - contract 更新: `scripts/portal-tools-copy-locale-contract.mjs` を追加し、Portal / Tools copy dictionary、localized suite / tool / category / status helper、`useLocale()` 接続、metadata copy 集約を固定。既存 `scripts/tool-portal-entry-contract.mjs` と `scripts/portal-locale-foundation-contract.mjs` は centralized copy / localized drawer row に合わせて更新した。
    - 検証結果: `node scripts/portal-tools-copy-locale-contract.mjs` は RED -> GREEN を確認。`node scripts/portal-tools-copy-locale-contract.mjs`、`node scripts/portal-locale-foundation-contract.mjs`、`node scripts/tool-portal-entry-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`git diff --check` は通過。`git diff --check` は対象ファイルの LF -> CRLF warning のみで exit 0。
    - 幅別確認: dev server `http://localhost:3037` を in-app browser で確認。`/` と `/tools` を `390 / 820 / 1024 / 1280 / 1366px` で `ja / en` それぞれ確認し、Home / Tools の主要見出し、CTA、filter、status、suite / tool card、feedback copy が locale に応じて読めること、manual switch 後の reload で選択が維持されること、`document.documentElement.lang` が `ja / en` に同期すること、body / document 横 overflow なし、console error / warn なしを確認。追加で `/tools?suite=fan-brand` の English 表示から `Available` filter を選び、empty state `No tools match these filters yet.` を確認。
    - 残リスク: metadata は PR2 では静的 `ja` のまま。各ツール本文 UI の validation / error / aria label までの全面翻訳は C scope または各ツール EN copy PR で扱う。次 PR は `Schedule Calendar EN copy`。
  - PR3 Schedule Calendar EN copy 実装済み（branch: `codex/en-schedule-calendar-copy` / target: `codex/en-support-preview`）。
    - 実装内容: `lib/schedule-calendar-copy.ts` を追加し、Schedule Calendar の主要見出し、tab / panel label、empty state、予定作成 / 編集導線、投稿補助、backup / restore、handoff 導線、主要 status / category / template label を `ja / en` 対応。`ScheduleCalendarApp` は `useLocale()` から現在 locale を読み、軽量 dictionary / helper を参照する。built-in 投稿テンプレートは表示 / preview 用に locale 化し、保存 schema、localStorage key、handoff payload、URL 設計は変更なし。
    - contract 更新: `scripts/schedule-calendar-copy-locale-contract.mjs` を追加。既存 `scripts/schedule-calendar-prelaunch-polish-contract.mjs` は copy dictionary 参照に合わせて更新。
    - 検証結果: `node scripts/schedule-calendar-copy-locale-contract.mjs` は RED -> GREEN を確認。`node scripts/schedule-calendar-copy-locale-contract.mjs`、`node scripts/schedule-calendar-prelaunch-polish-contract.mjs`、`node scripts/schedule-calendar-storage-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`git diff --check` を実行済み。`git diff --check` は LF -> CRLF warning のみで exit 0。
    - 幅別確認: dev server `http://127.0.0.1:3039` で `/tools/schedule-calendar` を `390 / 820 / 1024 / 1280 / 1366px` 確認。in-app browser は `Page.enable` timeout で DOM 操作へ進めなかったため、同一 dev server を Playwright headless で代替確認。English へ manual switch 後 reload しても選択が維持されること、`document.documentElement.lang=en`、body / document 横 overflow なし、console error / warn なしを全幅で確認。`1024 / 1280 / 1366px` は Post assist、Post preview、Create thumbnail、Create split images、Settings、Create backup、Restore backup を確認。`390 / 820px` は mobile bottom tabs の Events / Settings と drawer 内 English 表示を確認。1280px で日本語へ manual switch 後 reload し、`document.documentElement.lang=ja` と保存値 `ja` を確認。
    - 残リスク: C scope の細部 validation / error / aria label 全面翻訳、mobile settings / events panel の全項目逐語確認、Next metadata の動的 locale 切替は未対応。次 PR は Thumbnail Editor / SNS Split Image Maker EN copy。
  - PR3 follow-up Schedule Calendar saved hashtag EN copy 実装済み（branch: `codex/en-schedule-hashtags` / target: `codex/en-support-preview`）。
    - 実装内容: built-in saved hashtag set の表示 / 投稿補助 / handoff 合成用 copy を `ja / en` 対応。English では `VTuber basic` / `#VTuber #ENVtuber`、`Stream notice` / `#ENVtuber #LiveStream`、`YouTube` / `#YouTube` を使う。保存済みデータ、localStorage key、保存 schema、handoff payload 形式は変更なし。
    - contract 更新: `scripts/schedule-calendar-copy-locale-contract.mjs` に `getLocalizedHashtagSets()` と English built-in hashtag set の日本語タグ残り防止を追加。RED -> GREEN を確認。
    - 検証結果: `node scripts/schedule-calendar-copy-locale-contract.mjs`、`node scripts/schedule-calendar-prelaunch-polish-contract.mjs`、`node scripts/schedule-calendar-storage-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`git diff --check` を実行済み。`git diff --check` は LF -> CRLF warning のみで exit 0。
    - 幅別確認: dev server `http://localhost:3050` を in-app browser で確認。English へ manual switch 後 reload しても `document.documentElement.lang=en` が維持されることを確認。`390 / 820 / 1024 / 1280 / 1366px` で Settings の Saved hashtags を開き、`VTuber basic`、`#VTuber #ENVtuber`、`Stream notice`、`#ENVtuber #LiveStream` が表示され、`#配信`、`#生配信`、`配信告知`、`VTuber基本` が visible text に残らないこと、body / document 横 overflow なし、console error / warn なしを確認。1366px は初回 loading 表示で待ちが必要だったため、同じ server / viewport で再確認済み。
    - 残リスク: 既存ユーザーが自分で作成・編集したカスタム hashtag set はユーザー入力としてそのまま表示する。backup JSON の内部データ文字列は保存済みデータをそのまま出すため、UI copy 翻訳の対象外。
  - PR4 Thumbnail Editor / SNS Split Image Maker EN copy 実装済み（branch: `codex/en-thumbnail-sns-copy` / target: `codex/en-support-preview`）。
    - 実装内容: `lib/thumbnail-editor-copy.ts` と `lib/sns-split-image-maker-copy.ts` を追加し、Thumbnail Editor / SNS Split Image Maker の主要見出し、CTA、preset / panel / export / handoff 周辺 copy、mobile panel label、主要 empty state を `ja / en` 対応。各 app は `useLocale()` から現在 locale を読み、小さな dictionary / helper を参照する。既存日本語 copy は `ja` 側に維持し、URL 設計、localStorage / IndexedDB key、handoff payload、保存 schema は変更なし。
    - contract 更新: `scripts/thumbnail-sns-copy-locale-contract.mjs` を追加。既存 `scripts/sns-split-image-maker-contract.mjs` と `scripts/thumbnail-quality-guard-contract.mjs` は centralized copy helper 参照に合わせて更新。
    - 検証結果: `node scripts/thumbnail-sns-copy-locale-contract.mjs`、`node scripts/sns-split-image-maker-contract.mjs`、`node scripts/thumbnail-quality-guard-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`git diff --check` を実行済み。`git diff --check` は LF -> CRLF warning のみで exit 0。
    - 幅別確認: dev server `http://localhost:3054` を Chrome DevTools MCP / in-app browser 相当で確認。`/tools/thumbnail-editor` と `/tools/sns-split-image-maker` を `390 / 820 / 1024 / 1280 / 1366px` で確認し、English 選択時に主要見出し、CTA、preset / panel / export / handoff 導線が英語で読めること、body / document 横 overflow なし、console error / warn なしを確認。`390px` は viewport emulation で実寸確認し、Thumbnail Editor mobile drawer の `日本語 / English` switch と mobile export panel、SNS Split Image Maker の Edit / Save mobile tabs を確認。`820px` は両ツールの mobile panel / export 導線、`1024 / 1280 / 1366px` は desktop panel / export 導線を確認。Thumbnail Editor は manual switch 後 reload で `document.documentElement.lang=ja` と保存値 `ja`、English reload で `document.documentElement.lang=en` と保存値 `en` を確認。
    - 残リスク: PR4 は B scope の主要導線 copy のみ。細部 validation / error / aria label、Thumbnail Editor の layer 操作補助、material category / built-in material 名、text control 各項目、SNS Split Image Maker の一部 aria description と保存済みユーザー入力由来 copy は C scope で扱う。
  - Schedule Calendar review polish 実装済み（branch: `codex/schedule-calendar-review-polish` / target: `codex/en-support-preview`）。
    - 実装内容: JA の週グリッド空状態 copy を `予定はまだありません。` から `予定なし` に短縮。右パネルの `この日に新しい予定を追加` / 時間枠クリックから新規予定作成へ入る際、パネル scroll root を delayed reset して上部に余白が残らないようにした。
    - 検証結果: `node scripts/schedule-calendar-copy-locale-contract.mjs`、`node scripts/schedule-calendar-prelaunch-polish-contract.mjs`、`node scripts/schedule-calendar-storage-contract.mjs`、`node scripts/tool-handoff-contract.mjs`、`npm run lint`、`npx tsc --noEmit`、`git diff --check` を実行済み。`git diff --check` は LF -> CRLF warning のみで exit 0。
    - 幅別確認: dev server `http://localhost:3056` で `/tools/schedule-calendar` を `390 / 820 / 1024 / 1280 / 1366px` 確認。`390 / 820px` は対象の週グリッド / desktop 右パネルが非表示のため横 overflow なしを確認。`1024 / 1280 / 1366px` は `予定なし` 表示、旧文言が残らないこと、右パネル scroll root を 80px ずらしてから `この日に新しい予定を追加` をクリックして `scrollTop=0` に戻ること、body / document 横 overflow なし、console error / warn なしを確認。
    - review follow-up: クリック後に desktop 右パネルの4タブ上へ余白が残る原因は、desktop 幅でも `mobileSheetOpen=true` になり mobile sheet 用の `lg:!py-3` が当たることだった。新規作成 / 時間枠 / 編集 / 複製 / 移動導線は `openSchedulePanelForCurrentLayout()` 経由にし、desktop では mobile sheet state を立てないようにした。`1024 / 1280 / 1366px` でクリック後も `asidePaddingTop=0px`、tab top と aside top が一致、`mobileBackdrop=false`、横 overflow なしを確認。`390 / 820px` は対象 right panel 非表示で横 overflow なしを確認。

## Backlog

- English support initial coverage
  - 目的: 公開初期から EN 圏ユーザーが入口と3ツールの主要導線を理解できる状態にする。
  - 現在は Active の `English support initial coverage / preview integration branch` を実行元にする。
  - B scope 完了後、C scope として残った細部 UI 文言、設定文言、補助説明、validation / error / aria label などを main 起点の小分け PR で進める。

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
