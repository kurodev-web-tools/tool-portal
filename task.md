# task.md

このファイルは現在の運用タスクだけを置く。完了済みの詳細ログ、比較メモ、長い経緯は PR 本文か `docs/archive` に寄せる。

## Current Premises

- 作業は `main` 直ではなく feature branch / worktree で行う。
- 意味のある実装後は、このファイルに実装内容、検証、必要な幅別確認を残す。
- UI 変更時の確認幅は `390 / 820 / 1024 / 1280 / 1366px` を基本にする。
- 通常の表示確認と幅別確認では Codex app の in-app browser を優先する。繰り返し操作や機械的な console / canvas 確認は Playwright、原因調査は Chrome DevTools MCP に切り替える。
- URL 設計、大規模 i18n framework、保存 schema / IndexedDB / localStorage 既存 key / handoff payload、外部投稿連携は、個別タスクで明示されない限り変更しない。
- 1 feature / 1 fix / 1 cleanup を 1 branch / 1 PR に閉じる。公開版の緊急修正と次期機能追加は混ぜない。

## Active Priorities

1. Portal shell settings visibility polish
   - status: 実装・検証済み。branch `codex/portal-shell-settings-polish` で確認用に push 予定。
   - user context:
     - PC 表示で各ツールを開いている際、左パネル内のテーマ切り替えが見えない。
     - 左パネル自体にはスクロールを適用しない方針。
     - タブレット表示の左パネル / drawer 内で言語切り替えとテーマ切り替えが見にくい。
     - 将来ログイン機能、コメント翻訳ツール、外部連携設定が増える前提で、設定導線へ寄せる。
   - scope:
     - 各ツール画面の PC / タブレット横表示では、左パネル下部に `Settings` を常時見える位置で置く。
     - `1024 - 1279px` の狭い left rail は歯車アイコン中心の compact button、`1280px+` は `Settings` label 付きにする。
     - Settings 内に `Language` / `Theme` をまとめる。
     - HOME / Tools の header にある言語 / 表示切り替えは当面維持する。英語対応公開直後なので、言語切り替えが見えること自体を English support のサインとして残す。
     - タブレット縦 / `820px` 前後は drawer 下部に Settings block を置き、`Language` / `Theme` を見やすく並べる。
     - `Sign-in planned` は将来ログイン導線として残すが、ツール画面では Settings を押し出さないよう compact 化または配置整理する。
   - out of scope:
     - 設定ページ新設。
     - ログイン実装。
     - 多言語 tips / 初回案内の実装。
     - Thumbnail Editor inline text edit。
   - suggested branch/worktree:
     - branch: `codex/portal-shell-settings-polish`
     - worktree: `D:/V_streamer_tools/.worktrees/portal-shell-settings-polish`
   - verification:
     - `node scripts/portal-tools-copy-locale-contract.mjs`
     - `node scripts/tool-portal-entry-contract.mjs`
     - `npm run lint`
     - `npx tsc --noEmit`
     - `git diff --check`
     - in-app browser で `/`, `/tools`, `/tools/schedule-calendar`, `/tools/thumbnail-editor`, `/tools/sns-split-image-maker` を確認する。
     - width: `390 / 820 / 1024 / 1280 / 1366px`
     - JA / EN、Light / Dark、body/document 横 overflow、header / sidebar / drawer の切替導線を確認する。
   - implementation notes:
     - `PortalSettingsPanel` を追加し、workspace sidebar / drawer の `Language` と `Theme` を `Settings` block に集約した。
     - 各ツール画面の `1024 - 1279px` は左 rail 下部に歯車中心の compact Settings block、`1280px+` は `Settings` label 付き panel を表示する。
     - PC 表示の日本語 Settings で改行が出ないよう、テーマ行の label を `表示テーマ` から `テーマ` に短縮した。
     - HOME / Tools の header 側 `Language` / `Theme` は維持した。
     - workspace sidebar では将来機能 list を隠し、`Sign-in planned` を compact notice にして Settings を押し出さない配置にした。
   - verification results:
     - Passed: `node scripts/portal-tools-copy-locale-contract.mjs`
     - Passed: `node scripts/tool-portal-entry-contract.mjs`
     - Passed: `npm run lint`
     - Passed: `npx tsc --noEmit`
     - Passed: `git diff --check`
     - Width / locale / theme matrix: Chrome DevTools で `/`, `/tools`, `/tools/schedule-calendar`, `/tools/thumbnail-editor`, `/tools/sns-split-image-maker` を `390 / 820 / 1024 / 1280 / 1366px`、JA / EN、Light / Dark で確認。`documentElement.lang`、dark class、header/sidebar/drawer controls、Settings visibility、body/document 横 overflow なしを確認。
     - Visual spot check: `820px` drawer EN/Dark、`1024px` tool rail、`1280px` tool sidebar label 付き Settings を確認。
   - remaining risk:
     - Dev server の Next dev indicator は左下に表示されるが、production UI では出ない。
     - 確認は Chrome DevTools automation 中心。通常の最終目視は確認用 branch 取り込み時に Codex app browser で再確認するとよい。
   - handoff to next candidate:
     - 次候補は `Thumbnail Editor inline text edit`。今回の Portal shell 変更は tool body の schema / canvas / editor state には触れていないため、`codex/thumbnail-inline-text-edit` はこの branch の merge 判断後に独立 worktree で開始する。

2. Thumbnail Editor inline text edit
   - status: 実装・検証済み。branch `codex/thumbnail-inline-text-edit` で確認用に push / draft PR 作成予定。
   - user context:
     - テキストレイヤーを選択し、右パネルをスクロールして本文を書き換える流れは手間が大きい。
     - 既存の右パネル編集は維持しつつ、追加操作として canvas preview 上で直接編集できるとよい。
   - scope:
     - text layer をダブルクリック / ダブルタップしたとき、canvas preview 上に textarea overlay を出して直接 `layer.text` を編集できるようにする。
     - blur で確定、Esc でキャンセル、Ctrl/Cmd+Enter で確定を基本にする。
     - text layer 以外は既存どおり layer selection / panel open に寄せる。
     - locked / hidden layer は直接編集対象外。
     - 既存の右パネル `TextControls` は維持する。
   - out of scope:
     - rich text。
     - layer schema 変更。
     - canvas rendering pipeline の大幅変更。
     - preset body / font / export 変更。
   - suggested branch/worktree:
     - branch: `codex/thumbnail-inline-text-edit`
     - worktree: `D:/V_streamer_tools/.worktrees/thumbnail-inline-text-edit`
   - implementation notes:
     - canvas preview 上の text layer をダブルクリック / ダブルタップすると、同じ preview stack 内に `textarea` overlay を表示して `layer.text` を直接編集できるようにした。
     - blur で確定、Esc でキャンセル、Ctrl/Cmd+Enter で確定する。確定時のみ既存 draft history / autosave 経路に乗せる。
     - direct edit 対象は visible / unlocked の text layer のみ。text 以外、locked、hidden layer は既存どおり selection / panel open に寄せる。
     - 既存右パネル `TextControls`、drag / resize / selection、canvas rendering pipeline、layer schema、preset/export/font/crop は変更していない。
     - overlay は layer の位置・サイズ・font family / size / line height / align / rotation を preview zoom に合わせて配置し、preview 外へのはみ出しは canvas stack 内で clip する。
     - follow-up polish: 入力中の見た目は canvas 側の live preview に寄せ、textarea は透明な入力面として caret / focus ring だけを薄く出す。textarea の青い全選択表示、背景、内部 scrollbar は出さない。
   - verification:
     - Thumbnail Editor 関連 contract。必要なら inline edit 用 contract / browser smoke を追加する。
     - `node scripts/thumbnail-preset-text-locale-contract.mjs`
     - `npm run lint`
     - `npx tsc --noEmit`
     - `git diff --check`
     - `/tools/thumbnail-editor` の `390 / 820 / 1024 / 1280 / 1366px` で、text layer direct edit、既存右パネル編集、drag / resize / selection、JA / EN、横 overflow を確認する。
   - verification results:
     - PASS: `node scripts/thumbnail-inline-text-edit-contract.mjs`
     - PASS: `node scripts/thumbnail-preset-text-locale-contract.mjs`
     - PASS: `npm run lint`
     - PASS: `npx tsc --noEmit`
     - PASS: `git diff --check` (repo-normal LF -> CRLF working-copy warnings only)
     - Browser smoke: local `next dev --webpack -p 3044 --hostname 127.0.0.1` + Chrome DevTools automation.
     - Interaction result: direct edit open, blur commit, Esc cancel, Ctrl+Enter commit, right-panel `TextControls` edit reflection, locked/hidden exclusion, drag, resize, and no overlay during drag/resize all passed.
     - Follow-up visual/input result: local `http://localhost:3000/tools/thumbnail-editor` で textarea text color / background が transparent、overflow hidden、caret visible、初期 caret が末尾、commit 前は保存 draft 未変更、Ctrl+Enter commit 後に保存 draft 反映を確認。
     - Follow-up selection result: inline text edit 中に別 text layer をクリックすると、編集中 text が確定され、overlay が閉じ、新しい layer selection に移ることを確認。
     - Width / locale / theme result: `/tools/thumbnail-editor` passed at `390 / 820 / 1024 / 1280 / 1366px` for `ja/light` and `en/dark`; `1280px` spot checked `ja/dark` and `en/light`. `documentElement.lang`, dark class, canvas presence, body/document horizontal overflow `0`, and console error/warn `0` passed.
   - remaining risks:
     - Browser smoke used Chrome DevTools automation with scripted events for repeatability. A final human visual pass can still judge whether transparent input surface / rotated text overlay placement feels natural for heavily rotated custom layers.
     - Overlay follows the text layer rectangle and clips to the preview; rich text and per-character styling remain out of scope.
   - handoff to next candidate:
     - 次候補は `goods_notice` preset。今回の PR は inline edit DOM / local state / copy / contract に閉じており、preset body、font、export、crop、Portal shell は触っていない。

3. Thumbnail Editor `goods_notice` preset
   - status: 実装・検証済み。branch `codex/thumbnail-goods-notice-preset` で commit 済みにする。
   - reason: 英語対応公開後の追加価値として分かりやすく、既存 `イベント告知` / `歌ってみた告知` と用途が重なりにくい。
   - scope:
     - `goods_notice` 1 preset の body、必要 production asset、専用 contract、既存 thumbnail preset contracts。
     - product card、price / release badge、注意書き panel を中心に、物販 / BOOTH / digital goods 告知向けにする。
   - out of scope:
     - schema、canvas export、font loading helper、font search / recently used UI、Schedule Calendar、SNS Split Image Maker。
   - suggested branch/worktree:
     - branch: `codex/thumbnail-goods-notice-preset`
     - worktree: `D:/V_streamer_tools/.worktrees/thumbnail-goods-notice-preset`
   - verification:
     - `node scripts/thumbnail-preset-text-locale-contract.mjs`
     - thumbnail preset / material asset 系の変更対象 contract。
     - `npm run lint`
     - `npx tsc --noEmit`
     - `git diff --check`
     - `/tools/thumbnail-editor` の JA / EN、preset card CTA、canvas nonblank、横 overflow。
   - implementation notes:
     - `goods_notice` / `グッズ告知` preset を `告知画像` / `物販 / merch release` として追加した。
     - レビュー反映で、完成絵寄りだった v1 背景を外し、built-in `imagegen` 生成の控えめな base 背景 `public/assets/images/thumbnail-editor/phase5/goods-notice-background-v2.png` に差し替えた。
     - 商品カード、価格 badge、release badge、時刻 pill、販売 CTA、注意書き panel は generated decoration asset として `public/assets/images/thumbnail-editor/decorations/phase5/goods-notice-*.png` に分離した。
     - 追加レビュー反映で、ユーザーが調整した draft JSON に合わせて商品カード、price badge、時刻 pill、CTA、注意書き panel、対応 text layer の位置を preset default へ反映した。
     - 見出し、英字 label、商品名、価格、時刻、CTA、補足、release badge は text layer として編集可能にした。
     - schema / canvas rendering / export / crop / font UI には触れていない。
     - JA / EN の preset name / description / initial text body / layer display alias を追加した。EN 見出しのみ既存の locale visual adjustment 経路で fontSize を調整した。
     - 専用 contract `scripts/thumbnail-usecase-goods-notice-preset-contract.mjs` を追加した。
   - verification results:
     - PASS: `node scripts/thumbnail-usecase-goods-notice-preset-contract.mjs`
     - PASS: `node scripts/thumbnail-preset-text-locale-contract.mjs`
     - PASS: `npm run lint`
     - PASS: `npx tsc --noEmit`
     - PASS: `git diff --check` (repo-normal LF -> CRLF working-copy warnings only)
     - PASS: Playwright smoke via temporary spec against local `next dev --webpack -p 3057 --hostname 127.0.0.1`.
     - Width / locale / theme: `/tools/thumbnail-editor` passed at `390 ja/light`, `820 en/dark`, `1024 ja/dark`, `1280 en/light`, `1366 ja/light`; `documentElement.lang`, dark class, active preset CTA, canvas nonblank, body/document horizontal overflow `0` を確認。
     - Edit flow: `goods_notice` text layer の canvas inline edit と右パネル textarea edit を確認。
     - Optional check: `node scripts/thumbnail-material-assets-contract.mjs` は material library 既存文言の location drift で失敗した。今回 material library / material asset は変更していないため、blocking scope から外した。
   - remaining risks:
     - visual check は Playwright automation と generated asset preview 中心。最終の見た目判断は PR 確認時に Codex app browser / 人間目視で行うとよい。
     - generated asset は text を焼き込まない方針で作成したが、商品カードの装飾密度や badge の強さは後続 polish 余地がある。
   - handoff to next candidate:
     - 次候補は `membership_stream`。今回の PR は `goods_notice` preset body、production background、locale copy、contract に閉じており、schema、canvas rendering pipeline、export / crop、font search / recently used UI、Portal shell、Schedule Calendar、SNS Split Image Maker は触っていない。
     - `membership_stream` では member badge、locked / members-only visual、soft premium label、限定配信らしい CTA / 補足を text layer 化し、1 preset / 1 PR で開始する。

4. Thumbnail Editor `membership_stream` preset
   - status: 実装・検証済み。branch `codex/thumbnail-membership-stream-preset` で commit 済みにする。
   - reason: 通常の配信告知 / 雑談と違い、member-only stream、community perk、限定公開、premium label を扱える用途差がある。
   - scope:
     - `membership_stream` 1 preset の body、production background、generated decoration assets、専用 contract、locale copy、layer display alias。
     - member badge、locked / members-only visual、soft premium label、限定配信らしい CTA / 補足 panel を中心にする。
   - out of scope:
     - schema、canvas export、font loading helper、font search / recently used UI、Schedule Calendar、SNS Split Image Maker、Portal shell。
   - implementation notes:
     - `membership_stream` / `メン限配信` preset を `配信ジャンル` / `メン限 / members only` として追加した。
     - built-in `imagegen` 生成の控えめな base 背景 `public/assets/images/thumbnail-editor/phase5/membership-stream-background-v1.png` を locked background として追加した。
     - member badge、lock badge、premium label、time pill、note panel は generated decoration asset として `public/assets/images/thumbnail-editor/decorations/phase5/membership-stream-*.png` に分離した。
     - 見出し、英字 label、時刻、補足、member label、badge copy は text layer として編集可能にした。
     - Review draft 反映で、lock badge、premium label、time pill、note panel、limited access frame、英字 label、時刻、補足 text の位置を preset default へ反映し、未使用になった CTA panel / CTA text layer は default から外した。
     - JA / EN の preset name / description / initial text body / layer display alias を追加した。EN 見出しと補足は既存の locale visual adjustment 経路で収まりを調整した。
     - 専用 contract `scripts/thumbnail-usecase-membership-stream-preset-contract.mjs` を追加した。
   - verification results:
     - PASS: `node scripts/thumbnail-usecase-membership-stream-preset-contract.mjs`
     - PASS: `node scripts/thumbnail-preset-text-locale-contract.mjs`
     - PASS: `npm run lint`
     - PASS: `npx tsc --noEmit`
     - PASS: `git diff --check` (repo-normal LF -> CRLF working-copy warnings only)
     - Browser smoke: local `next dev --webpack -p 3058 --hostname 127.0.0.1` + Codex app browser.
     - UI result: `/tools/thumbnail-editor` で preset count `19 / 19種`、usage label `メン限 / members only`、preset card `メン限配信`、preset apply 後の canvas nonblank / member badge / editable text preview を確認。
   - remaining risks:
     - Browser smoke は 1280px 相当の通常表示で確認。最終 PR review では `390 / 820 / 1024 / 1280 / 1366px` の幅別目視を Codex app browser で必要に応じて追加するとよい。
     - Final human review should still judge whether the generated member badge and lock badge feel sufficiently premium and not too security-heavy.
     - The background and decoration assets are generated raster assets; text is editable, but the visual motifs themselves may need a later small polish if PR review asks for stronger or quieter premium tone.
   - handoff to next candidate:
     - 次候補は `asmr_stream`。今回の PR は `membership_stream` preset body、production background、decoration assets、locale copy、contract に閉じており、schema、canvas rendering pipeline、export / crop、font search / recently used UI、Portal shell、Schedule Calendar、SNS Split Image Maker は触っていない。
     - `asmr_stream` では mic silhouette / sound ring / night gradient / low-contrast label を背景焼き込みと editable text layer に分け、1 preset / 1 PR で開始する。

5. Thumbnail Editor `asmr_stream` preset
   - status: 実装・検証済み。branch `codex/thumbnail-asmr-stream-preset` で commit 済みにする。
   - reason: ASMR / relax night / sleep aid / quiet talk は通常の配信告知や雑談と違い、低彩度・夜・音のモチーフを中心にした用途差がある。
   - scope:
     - `asmr_stream` 1 preset の body、production background、generated decoration assets、専用 contract、locale copy、layer display alias。
     - mic silhouette、sound ring、night gradient、low-contrast label、時刻 pill、補足 panel を中心にする。
   - out of scope:
     - schema、canvas export、font loading helper、font search / recently used UI、Schedule Calendar、SNS Split Image Maker、Portal shell。
   - implementation notes:
     - `asmr_stream` / `ASMR配信` preset を `配信ジャンル` / `ASMR / relax night` として追加した。
     - built-in `imagegen` 生成の控えめな base 背景 `public/assets/images/thumbnail-editor/phase5/asmr-stream-background-v1.png` を locked background として追加した。
     - mic silhouette、sound ring、low-contrast label、time pill、note panel は generated decoration asset として `public/assets/images/thumbnail-editor/decorations/phase5/asmr-stream-*.png` に分離した。
     - 見出し、英字 label、時刻、補足、sleep-aid label は text layer として編集可能にした。
     - editor preview の左ツールバーで主見出しが見切れにくいよう、左側 text / label / time pill を少し右寄せした。
     - JA / EN の preset name / description / initial text body / layer display alias を追加した。EN 見出しと補足は既存の locale visual adjustment 経路で収まりを調整した。
     - 専用 contract `scripts/thumbnail-usecase-asmr-stream-preset-contract.mjs` を追加した。
   - verification results:
     - PASS: `node scripts/thumbnail-usecase-asmr-stream-preset-contract.mjs`
     - PASS: `node scripts/thumbnail-preset-text-locale-contract.mjs`
     - PASS: `npm run lint`
     - PASS: `npx tsc --noEmit`
     - PASS: `git diff --check` (repo-normal LF -> CRLF working-copy warnings only)
     - Browser smoke: local `next dev --webpack -p 3059 --hostname 127.0.0.1` + Chrome DevTools automation.
     - UI result: `/tools/thumbnail-editor` で preset count `20 / 20種`、usage label `ASMR / relax night`、preset card `ASMR配信`、preset apply 後の canvas nonblank、editable text layers、layer display alias を確認。
     - Width smoke: `390 / 820 / 1024 / 1280 / 1366px` で active preset、preset count、ASMR usage label、canvas presence、body/document horizontal overflow `0` を確認。
   - remaining risks:
     - visual check は Chrome DevTools automation と generated asset preview 中心。最終 PR review では Codex app browser / 人間目視で、夜背景と mic motif の強さが ASMR らしく控えめかを確認するとよい。
     - generated asset は text を焼き込まない方針で作成したが、mic silhouette / sound ring の強さは後続 polish 余地がある。
   - handoff to next candidate:
     - 次候補は `relay_stream`。今回の PR は `asmr_stream` preset body、production background、decoration assets、locale copy、contract に閉じており、schema、canvas rendering pipeline、export / crop、font search / recently used UI、Portal shell、Schedule Calendar、SNS Split Image Maker は触っていない。
     - `relay_stream` では relay order、multi-slot card、next channel label、time chain、補足 panel を背景 / decoration asset / editable text layer に分け、1 preset / 1 PR で開始する。

6. Kuro Live Comment Translator planning
   - status: 新規ツール候補。すぐ実装せず、まず repo 内 future plan に落とす。
   - seed: `C:/Users/taka/Downloads/COMMENT_TRANSLATION_TOOL_PLAN.md`
   - recommended first scope:
     - OBS Browser Dock 前提の read-only MVP。
     - 1 platform から開始。
     - owner-only / OAuth / rate limit / quota / moderation を前提にする。
     - コメント翻訳、短い要約、用語集を中心にし、返信生成や自動投稿は初期 scope に入れない。
   - suggested branch/worktree:
     - branch: `codex/comment-translator-planning`
     - worktree: `D:/V_streamer_tools/.worktrees/comment-translator-planning`
   - next action:
     - 添付 plan を repo 向けに要約し、`docs/future` に保存するかを判断する。

7. Thumbnail Editor font / preset typography follow-up
   - status: 後続候補。優先度は公開版 polish と `goods_notice` より下。
   - current direction:
     - 単純な font 追加より、preset ごとの font application、weight-aware UI、必要なら不足 font の小規模追加を優先する。
     - language / mood category、font search、recently used は既に主要導線が入っているため、別 scope と混ぜない。
   - out of scope:
     - preset body 実装、schema、export、material asset 追加との同時実装。

## Thumbnail Editor Preset Candidate Order

公開後の preset 追加は、用途差が大きいものから 1 preset / 1 PR で進める。

1. `goods_notice` - グッズ告知 / merch release (implemented)
2. `membership_stream` - メン限配信 / members only (implemented)
3. `asmr_stream` - ASMR 配信 / relax night (implemented)
4. `relay_stream` - リレー配信 / stream relay (next)
5. `collab_recruit_notice` - コラボ募集 / collab call

Reference: `docs/future/THUMBNAIL_EDITOR_USECASE_PRESET_CANDIDATES.md`

## Next Session Prompt

次セッションでそのまま使う prompt。

```text
D:/V_streamer_tools で作業してください。

目的:
Thumbnail Editor の次期 preset 追加として、`relay_stream` preset を 1 preset / 1 PR で実装してください。

前提:
- main 直作業は禁止です。
- `git fetch origin --prune` を実行してください。
- 確認用ブランチ `origin/codex/thumbnail-preset-review` 起点で branch / worktree を作成してください。
- 推奨 branch: `codex/thumbnail-relay-stream-preset`
- 推奨 worktree: `D:/V_streamer_tools/.worktrees/thumbnail-relay-stream-preset`
- PR base は `codex/thumbnail-preset-review` にしてください。`main` へ直接 PR / merge しないでください。
- `AGENTS.md` と `task.md` を確認してから実装してください。
- 直前の `asmr_stream` と同じく、背景は控えめな base asset、主要 UI 部品は decoration asset、文言は editable text layer に分けてください。

実装方針:
- `relay_stream` / リレー配信 preset を追加してください。
- 用途は stream relay / multi-channel handoff / time chain / next channel notice。
- 背景 + 必要 decoration asset は built-in `imagegen` で生成してください。
- relay order、multi-slot card、next channel label、time chain、補足 panel を中心にしてください。
- 見出し、英字ラベル、時刻、CTA または補足文は Thumbnail Editor の text layer として編集可能にしてください。
- 既存 preset category / usage label / locale copy / layer display alias の流れに合わせて追加してください。
- 必要なら専用 contract を追加してください。

Out of scope:
- schema、canvas export、font loading helper、font search / recently used UI、Schedule Calendar、SNS Split Image Maker、Portal shell。

検証:
- 追加した専用 contract
- node scripts/thumbnail-preset-text-locale-contract.mjs
- npm run lint
- npx tsc --noEmit
- git diff --check

完了時:
- `task.md` に実装内容、確認結果、残リスク、次候補への引き継ぎを追記してください。
- 問題なければ commit まで行ってください。push / PR は指示があるまで行わないでください。
```

## Backlog

- Schedule Calendar:
  - Google Calendar 連携。
  - ログイン / サーバー同期。
  - シリーズ一括編集、例外日。
  - 週間予定画像そのものの生成。
- Thumbnail Editor:
  - 新規 usecase preset。
  - crop 仕様。
  - text / image layer schema。
  - public asset / font follow-up。
  - preset typography refinement。
- SNS Split Image Maker:
  - ZIP 出力。
  - X 以外の比率。
  - 複数形式の大規模 export。
  - 重い onboarding。
- EN / locale:
  - 細かい内部説明、debug 文、保存済みデータ本文、網羅的 aria 全面翻訳。
  - Next metadata の動的 locale 切替。
- New tools:
  - Kuro Live Comment Translator planning。

## Verification Baseline

docs / contract 変更時は、必要に応じて次を実行する。

- `node scripts/static-export-rsc-aliases.mjs --check`
- `node scripts/tool-portal-entry-contract.mjs`
- `node scripts/tool-handoff-contract.mjs`
- `node scripts/thumbnail-material-assets-contract.mjs`
- `node scripts/thumbnail-quality-guard-contract.mjs`
- `node scripts/thumbnail-standee-placement-contract.mjs`
- `node scripts/thumbnail-preset-text-locale-contract.mjs`
- `node scripts/sns-split-image-maker-contract.mjs`
- `node scripts/portal-tools-copy-locale-contract.mjs`
- `npm run lint`
- `npx tsc --noEmit`
- `git diff --check`

UI / 表示文言を触った場合のみ、幅別確認結果をこのファイルに残す。

## Completed / Archive Summary

- EN support:
  - PR #154 - #171 で EN support preview から main 向け final integration check まで完了。
  - main merge: 2026-05-20, merge commit `270b81f`.
  - completed details are kept in PR bodies and archive docs, not repeated here.
- 2026-04 の履歴: `docs/archive/TASK_HISTORY_2026-04.md`
- 2026-05 の履歴: `docs/archive/TASK_HISTORY_2026-05.md`
- Schedule Calendar future tasks: `docs/future/SCHEDULE_CALENDAR_FUTURE_TASKS.md`
- Portal settings future direction: `docs/future/PORTAL_SETTINGS_FUTURE.md`
- Thumbnail Editor next PR scope: `docs/future/THUMBNAIL_EDITOR_NEXT_PR_SCOPE.md`
- Thumbnail Editor usecase preset candidates: `docs/future/THUMBNAIL_EDITOR_USECASE_PRESET_CANDIDATES.md`
- Thumbnail Editor font candidates: `docs/future/THUMBNAIL_EDITOR_FONT_CANDIDATES.md`
