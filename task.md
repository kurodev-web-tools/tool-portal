# task.md

このファイルは現在の運用タスクだけを置く。完了済みの詳細ログ、比較メモ、長い経緯は PR 本文か `docs/archive` に寄せる。

## Current Premises

- 作業は `main` 直ではなく feature branch / worktree で行う。
- 意味のある実装後は、このファイルに実装内容、検証、必要な幅別確認を残す。
- UI 変更時の確認幅は `390 / 820 / 1024 / 1280 / 1366px` を基本にする。
- 通常の表示確認と幅別確認では Codex app の in-app browser を優先する。繰り返し操作や機械的な console / canvas 確認は Playwright、原因調査は Chrome DevTools MCP に切り替える。
- URL 設計、大規模 i18n framework、保存 schema / IndexedDB / localStorage 既存 key / handoff payload、外部投稿連携は、個別タスクで明示されない限り変更しない。
- 1 feature / 1 fix / 1 cleanup を 1 branch / 1 PR に閉じる。公開版の緊急修正と次期機能追加は混ぜない。
- secret / service_role key / private credential は要求・表示・保存しない。
- 完了済みの account / preferences foundation、Supabase Auth first slice、Cloudflare Workers / OpenNext migration、auth recovery hardening、Turnstile CAPTCHA、Thumbnail Editor IRIAM 1:1 / material / font expansion、legal foundation の詳細は PR bodies と `docs/archive/TASK_HISTORY_2026-05.md` に寄せる。

## Active Priorities

1. Kuro Live Comment Translator preview branch
   - status: mock foundation、interactive shell、Manual / Paste Input MVP、Translation provider boundary design、Server-side translation prototype、YouTube input boundary design、YouTube owner polling runtime foundation、YouTube Google API adapter + token reference resolver design、YouTube OAuth token store + consent runtime foundation、YouTube encrypted token store implementation plan / blocker resolution are merged into `codex/comment-translator-preview`; do not merge to `main` yet because live OAuth / token persistence / quota boundary is still not implemented。
   - branch stack:
     - preview: `codex/comment-translator-preview`
     - merged feature: `codex/comment-translator-mock-foundation` at `D:/V_streamer_tools/.worktrees/comment-translator-mock-foundation`
     - merged feature: `codex/comment-translator-interactive-shell` at `D:/V_streamer_tools/.worktrees/comment-translator-interactive-shell`
     - merged feature: `codex/comment-translator-manual-input-mvp` at `D:/V_streamer_tools/.worktrees/comment-translator-manual-input-mvp`
     - planning follow-up: `codex/comment-translator-provider-boundary-plan` at `D:/V_streamer_tools/.worktrees/comment-translator-provider-boundary-plan`
     - merged feature: `codex/comment-translator-youtube-api-adapter-token-reference-design` at `D:/V_streamer_tools/.worktrees/comment-translator-youtube-api-adapter-token-reference-design`
     - merged feature: `codex/comment-translator-youtube-oauth-token-store-foundation` at `D:/V_streamer_tools/.worktrees/comment-translator-youtube-oauth-token-store-foundation`
     - merged feature: `codex/comment-translator-youtube-token-store-blocker-resolution` at `D:/V_streamer_tools/.worktrees/comment-translator-youtube-token-store-blocker-resolution`
     - active feature: `codex/comment-translator-youtube-token-store-schema-key-approval` at `D:/V_streamer_tools/.worktrees/comment-translator-youtube-token-store-schema-key-approval`
   - seed:
     - `C:/Users/taka/Downloads/COMMENT_TRANSLATION_TOOL_PLAN.md`
     - `D:/V_streamer_tools/materials/ideas/15_最新技術活用ツール/多言語対応ライブ翻訳オーバーレイ_企画書.md`
     - `D:/V_streamer_tools/materials/ideas/15_最新技術活用ツール/リアルタイムAI音声翻訳オーバーレイ.md`
   - user decision:
     - 初回 platform は YouTube。
     - 初回 PR は `/imagegen` を使った各端末 mock 作成 -> user 確認 -> 承認 mock の再現まで。
     - 翻訳 API の実接続は初回 PR では扱わない。fixtures / `MockTranslationProvider` 相当で UI shell のみ作る。
     - Real translation provider は、YouTube OAuth / owner check / quota / billing boundary が固まった後に別 PR で比較する。
     - 2026-05-30 decision: まだ実際に使える翻訳ツールではないため、`codex/comment-translator-preview` を `main` へ統合せず、preview branch 上に使える状態へ近づけるPRを刻む。
   - current slice target:
     - `YouTube encrypted token store schema/key approval checkpoint` を `codex/comment-translator-preview` 宛てに切る。
     - PR #272 (`YouTube encrypted token store implementation plan / blocker resolution`) が `2026-05-31T05:14:20Z` に `codex/comment-translator-preview` へ merged 済みで、merge commit `e88da0964cfa0f9edbfe31a03511c2b50611fa01` が `origin/codex/comment-translator-preview` 先頭に含まれることを確認した。
     - `docs/future/COMMENT_TRANSLATOR_YOUTUBE_TOKEN_STORE_BLOCKER_RESOLUTION.md` と `youtubeEncryptedTokenStoreBlockerResolutionPlan` を読み、schema approval / key management の required approval を approval checkpoint として整理する。
     - このPRでは approval checkpoint / proposal / contract に閉じ、明示承認なしに schema / migration / RLS を追加しない。
     - approved migration PR に進める条件、まだ proposal-only に留める条件、承認者/確認項目を明確にする。
     - migration が必要と判断した場合も、このPRでは blocker summary、required approval、separate migration PR 条件に留める。
     - Google API live call は safe live smoke 条件が揃うまで実行しない。
     - owner verification、owned broadcast lookup、Live Chat polling step、sanitized comment bridge は translation provider module と直接結合しない。
     - client component から Google API / provider / polling runtime を直接呼ばない。
     - DeepL provider prototype、MockTranslationProvider、Manual / Paste Input MVP、interactive shell の既存挙動は壊さない。
     - この slice で storage key / payload / IndexedDB / localStorage key / Supabase schema / migration / RLS / handoff payload / quota write は変更しない。
   - first PR scope:
     - OBS Browser Dock / narrow viewport を主対象に、`390 / 820 / 1024 / 1280 / 1366px` の mock を先に作る。
     - 承認後、`/tools/comment-translator` など既存 tools routing pattern に沿った UI shell を追加する。
     - Read-only broadcaster dock 前提で、コメント原文、翻訳文、言語表示、skip / cache / quota preview、接続状態、empty / error-like states を静的 fixture で表現する。
     - YouTube first と分かる copy / state にするが、実 YouTube OAuth / Live Chat API / polling は入れない。
     - 翻訳結果は mock provider / fixture だけにし、API key、provider secret、server action、quota DB write は入れない。
     - 既存 storage key / IndexedDB / localStorage key / handoff payload / Supabase schema / migration / RLS policy は変更しない。
   - out of scope for first PR:
     - YouTube OAuth、Google API、Live Chat polling、owner verification の実装。
     - OpenAI / Google / DeepL / Gemini 等の実翻訳 API 呼び出し。
     - Stripe checkout / billing、server-authoritative quota、paid plan enforcement。
     - GA4 実装、cookie consent banner。
     - コメント返信生成、自動投稿、viewer overlay、OBS plugin、ASR / 音声翻訳。
   - verification target for first PR:
     - new/updated comment translator mock foundation contract。
     - tool portal entry / route contract if a new tool route is added。
     - `npm run lint`
     - `npx tsc --noEmit`
     - `npm run build`
     - `git diff --check`
     - `/tools` and new comment translator route width checks at `390 / 820 / 1024 / 1280 / 1366px`。
   - implementation completed 2026-05-30:
     - `imagegen` built-in modeで `390 / 820 / 1024 / 1280 / 1366` 向け方向性mockを生成し、`docs/mockups/comment-translator/` にproject-bound PNGとして保存した。
     - `/tools/comment-translator` を追加し、`MockTranslationProvider` / static fixtureだけで YouTube read-only broadcaster dock のUI shellを再現した。
     - `/tools`、sidebar、mobile header、Site Tips、portal copy / metadata / suite copy を4ツール前提に更新した。
     - 実翻訳API、YouTube実接続、provider secret、server action、quota DB write、storage key、IndexedDB、localStorage、Supabase schema / migration / RLS、handoff payload は変更していない。
   - verification completed 2026-05-30:
     - `node scripts/comment-translator-mock-foundation-contract.mjs` PASS
     - `node scripts/tool-portal-entry-contract.mjs` PASS
     - `node scripts/portal-tools-copy-locale-contract.mjs` PASS
     - `npm run lint` PASS
     - `npx tsc --noEmit` PASS
     - `npm run build` PASS (`/tools/comment-translator` included in app routes; server-runtime buildのため `static-export-rsc-aliases` はskip、`middleware` deprecation warningあり)
     - `git diff --check` PASS (CRLF変換warningのみ)
   - width check completed 2026-05-30:
     - method: local dev server `http://localhost:3051` + in-app Browser viewport override, height 900。
     - `/tools`: `390 / 820 / 1024 / 1280 / 1366px` PASS。document-level horizontal overflowなし。comment translator card visible。narrow widthの既存filter rowは横スクロール内に収まる。
     - `/tools/comment-translator`: `390 / 820 / 1024 / 1280 / 1366px` PASS。document-level horizontal overflowなし。desktop sidebar overlapなし。setup / connection mock、live comment list、original / translated text、language label、skip reason、cache / quota preview、empty state、error-like stateが表示される。
   - interactive shell implementation completed 2026-05-30:
     - `CommentTranslatorDock` を client component 化し、fixture state だけで操作できる UI shell に更新した。
     - `Setup / Connection`: YouTube mock connection state、stream selection mock、read-only broadcaster dock status を native select と fixture status 表示で切替可能にした。外部接続へ進む導線は追加していない。
     - `Display Settings`: source language、target language、original / translated / both、OBS Browser Dock / narrow viewport surface を実 control 化した。
     - live comment list: status tabs、search、display mode による original / translated 表示切替、skip / error state filtering を追加した。
     - cache / quota preview: normal / warning / empty / error-like mock state と hit / miss 表示を追加した。
     - `MockTranslationProvider` 境界、fixture-only、YouTube first、read-only broadcaster dock 方針を維持した。
     - 実翻訳API、YouTube実接続、provider secret、server action、quota DB write、storage key、payload、IndexedDB、localStorage、Supabase schema / migration / RLS、handoff payload は変更していない。
   - interactive shell verification completed 2026-05-30:
     - `node scripts/comment-translator-interactive-shell-contract.mjs` PASS
     - `node scripts/comment-translator-mock-foundation-contract.mjs` PASS
     - `node scripts/tool-portal-entry-contract.mjs` PASS
     - `npm run lint` PASS
     - `npx tsc --noEmit` PASS
     - `npm run build` PASS (`/tools/comment-translator` included in app routes; server-runtime buildのため `static-export-rsc-aliases` はskip、`middleware` deprecation warningあり)
     - `git diff --check` PASS (CRLF変換warningのみ)
   - interactive shell width / operation check completed 2026-05-30:
     - method: local dev server `http://127.0.0.1:3052` + in-app Browser viewport override, height 900。
     - `/tools`: `390 / 820 / 1024 / 1280 / 1366px` PASS。document-level horizontal overflowなし。comment translator card visible。desktop sidebar と main overlap なし。
     - `/tools/comment-translator`: `390 / 820 / 1024 / 1280 / 1366px` PASS。document-level horizontal overflowなし。desktop sidebar と main overlap なし。Setup / Connection、Display Settings、Live Comments、Cache / Quota Preview が表示される。
     - operation smoke at 390px PASS: display `Translated` で original text が隠れ、translated text が残る。`Skipped` tab + `Spam` search で 1 row に絞り込み。quota `warning` と surface `narrow-viewport` 切替後も horizontal overflow なし。
   - review follow-up completed 2026-05-30:
     - browser annotation 1: `Comment text` の `Both / Original / Translated` control を縦積みにして、左カラムで `Translated` が窮屈に見える状態を解消した。
     - browser annotation 2: live comment header を title row と filter/search row の2段構成にした。
     - Comment Translator tool body を Portal の表示言語に追随させ、主要UI label / control / filter / quota / skip reason を ja/en copy で切替可能にした。
     - in-app Browser at `http://127.0.0.1:3052/tools/comment-translator/`: Japanese portal settingで `セットアップ / 接続`、`表示設定`、`コメントを検索`、`同一言語` 表示、document-level horizontal overflowなしを確認した。
   - manual input MVP implementation completed 2026-05-30:
     - `Manual / Paste Input` panelを追加し、single comment input、multiline paste input、sample insert、add to live comment list、clear draft、clear manual sessionを扱えるようにした。
     - `lib/comment-translator.ts` に `splitManualCommentInput`、`createManualCommentRows`、`commentTranslatorManualSamples` を追加し、translated / skipped / error のdeterministic mock rowsを生成する境界を固定した。
     - manual rowsは `source: "manual"` / `badge: "manual"` でfixture rowsと区別し、既存 status tabs、search、original / translated / both表示、skip / error-like filter、cache / quota previewに統合した。
     - Portal表示言語に追随するja/en copyを追加した。Japanese portal settingでは `手入力 / 貼り付け`、`単一コメント`、`複数行貼り付け`、`手入力mock結果`、`手入力セッション` が表示される。
     - 実翻訳API、YouTube実接続、OAuth、Google API、Live Chat polling、owner verification、provider secret、server action、quota DB write、storage key、IndexedDB、localStorage、Supabase schema / migration / RLS、handoff payload は変更していない。
   - manual input MVP verification completed 2026-05-30:
     - `node scripts/comment-translator-manual-input-mvp-contract.mjs` RED first: `manual input sample comments are exported` で期待どおり失敗、その後 PASS。
     - `node scripts/comment-translator-interactive-shell-contract.mjs` PASS
     - `node scripts/comment-translator-mock-foundation-contract.mjs` PASS
     - `node scripts/tool-portal-entry-contract.mjs` PASS
     - `npm run lint` PASS
     - `npx tsc --noEmit` PASS
     - `npm run build` PASS (`/tools/comment-translator` included in app routes; server-runtime buildのため `static-export-rsc-aliases` はskip、`middleware` deprecation warningあり)
     - `git diff --check` PASS (CRLF変換warningのみ)
   - manual input MVP width / operation check completed 2026-05-30:
     - width method: production server `http://127.0.0.1:3054` + in-app Browser viewport override, height 900。
     - `/tools`: `390 / 820 / 1024 / 1280 / 1366px` PASS。document-level / body horizontal overflowなし。comment translator card visible。sidebar overlap候補なし。
     - `/tools/comment-translator`: `390 / 820 / 1024 / 1280 / 1366px` PASS。document-level / body horizontal overflowなし。manual input panel、live comment list、Portal sidebarが干渉しない。
     - operation smoke at 390px PASS via Chrome DevTools on production server: single add、multiline paste add、sample insert、search (`Unique single` -> 1 row)、status filter (`スキップ` -> manual `ok` + `短すぎる`)、display mode (`翻訳文` -> original fixture hidden / translated fixture visible)、mock error state (`Force manual error` + `Manual mock error for 日本語`)。
     - production operation smoke中の console error はなし。
   - unchecked scope / residual risk:
     - safe live YouTube login / OAuth / Live Chat / owner verification smokeは未実施。初回PRのscope外。
     - 生成mock内の文字は方向性確認用。正確な表示文言はReact UI側で固定した。
     - feature -> preview のdraft PRでmock方向のuser確認を受け、main向けintegration PRはpreview branch完成後に別途出す。
     - interactive shell も実 YouTube connection / translation provider / quota enforcement / account sync は未実装。後続の設計 slice で扱う。
     - manual session rowsは現在のpreview UI stateのみで、reloadすると消える。永続化、user preference sync、quota enforcementは後続PRで扱う。
   - PR #264 review / merge check completed 2026-05-31:
     - PR #264 (`codex/comment-translator-manual-input-mvp` -> `codex/comment-translator-preview`) は merge commit `5a405dd` で merged。
     - review comment はなし。PR comment は Cloudflare Workers deployment success のみ。
     - GitHub checks: `Workers Builds: v-streamer-tools` PASS。`Cloudflare Pages` は PR base `5e7dcb2` でも failure の既存 check で、現行 Workers preview の merge blocker ではない。
     - follow-up code change は不要。次は `Translation provider boundary design` の計画に進む。
   - provider boundary design implementation completed 2026-05-31:
     - `lib/comment-translator-provider-boundary.ts` を追加し、`import "server-only";` で server runtime 専用の pure type boundary を作った。
     - `CommentTranslationProvider`、`CommentTranslationProviderRequest`、`CommentTranslationProviderResponse`、`CommentTranslationProviderRecoverableError`、`CommentTranslationProviderTerminalError`、`CommentTranslationUsageHandoff` を分離した。
     - provider secret 境界は server runtime env only、client bundle / fixtures / task docs / PR body は `no-secret-values` として固定した。secret / service_role key / private credential は要求・表示・保存していない。
     - quota / billing / usage logging は handoff type だけを定義し、`enforcement: "not-implemented"` / `databaseWrite: "not-implemented"` のままにした。DB write、billing実装、quota enforcement は入れていない。
     - provider比較軸は latency / cost / language-coverage / streaming-suitability / glossary-support / rate-limit / data-retention / failure-semantics で固定した。
     - `docs/future/COMMENT_TRANSLATOR_PROVIDER_BOUNDARY_DESIGN.md` に、input-source independent request、YouTube OAuth / owner verification / Live Chat polling との分離、short-lived log、PII minimization、moderation skip reason、cache key material の設計メモをまとめた。
     - `scripts/comment-translator-provider-boundary-contract.mjs` を追加し、server-only boundary、secret非露出、禁止runtime integration、storage / schema / handoff / UI path非変更を固定した。
     - `server-only` packageを追加した。これは provider boundary module の server/client import guard 用で、実 provider runtimeや外部接続は追加していない。
     - UI変更なし。`components/comment-translator/*` と `/tools/comment-translator` route は変更していないため、幅別確認は今回対象外。
     - 実翻訳API、YouTube実接続、OAuth、Google API、Live Chat polling、owner verification、server action、quota DB write、storage key、IndexedDB、localStorage、Supabase schema / migration / RLS、handoff payload は変更していない。
   - provider boundary design verification completed 2026-05-31:
     - `node scripts/comment-translator-provider-boundary-contract.mjs` RED first: `server-only provider boundary module exists` で期待どおり失敗、その後 PASS。
     - `node scripts/comment-translator-manual-input-mvp-contract.mjs` PASS
     - `node scripts/comment-translator-interactive-shell-contract.mjs` PASS
     - `node scripts/comment-translator-mock-foundation-contract.mjs` PASS
     - `node scripts/tool-portal-entry-contract.mjs` PASS
     - `npm run lint` PASS
     - `npx tsc --noEmit` PASS
     - `npm run build` PASS (`/tools/comment-translator` included in app routes; server-runtime buildのため `static-export-rsc-aliases` はskip、`middleware` deprecation warningあり)
     - `git diff --check` PASS (`task.md` CRLF変換warningのみ)
  - provider boundary design unchecked scope / residual risk:
    - 実 provider prototype、runtime credential resolver、external network call、server action、quota DB writer、billing integration は未実装。次の `Server-side translation prototype` 以降で扱う。
    - YouTube OAuth / owner verification / Live Chat polling は未実装。translation request boundary とは別PRで設計する。
    - provider comparison は判断軸までで、個別 provider の実測 latency / cost / retention evidence は未確認。
    - UI変更なしのため `/tools` と `/tools/comment-translator` の幅別再確認は未実施。
  - server-side provider prototype implementation completed 2026-05-31:
    - `lib/comment-translator-deepl-provider.ts` を追加し、`import "server-only";` で DeepL Text Translation API v2 の 1 provider prototype を server runtime 専用に閉じた。
    - provider id は `deepl-text-v2`。server env name は `DEEPL_AUTH_KEY`、`DEEPL_API_BASE_URL`、`DEEPL_TIMEOUT_MS` に固定した。実 secret 値は要求・表示・保存していない。
    - `CommentTranslationProviderRequest` を受け取り、`CommentTranslationProviderResult` を返す provider factory / env resolver を追加した。UI / route / fixture からは呼び出していない。
    - missing credential、invalid request、unsupported language、provider configuration rejection、policy rejection は terminal error にした。rate limit、timeout、5xx / temporary unavailable は recoverable error にした。
    - success / recoverable error は `CommentTranslationUsageHandoff` を返す。`usage_quotas` write、billing更新、quota enforcement、server action、route handler 公開API化は入れていない。
    - provider request body は text / source language / target language / billed character request に限定し、author/channel/viewer/stream id や credential material を cache key / diagnostic scope に混ぜていない。
    - `scripts/comment-translator-server-provider-prototype-contract.mjs` を追加し、server-only provider、client import禁止、public secret env禁止、secret値非混入、usage DB write禁止、YouTube OAuth / Live Chat polling / owner verification 非混入を固定した。
    - `docs/future/COMMENT_TRANSLATOR_PROVIDER_BOUNDARY_DESIGN.md` を prototype 現状に合わせ、env name / config shape / failure semantics を secret 値なしで追記した。
    - 既存 `MockTranslationProvider`、Manual / Paste Input MVP、interactive shell、storage key、IndexedDB、localStorage、Supabase schema / migration / RLS、handoff payload は変更していない。
    - UI変更なし。`components/comment-translator/*` と `/tools/comment-translator` route は変更していないため、幅別確認は今回対象外。
  - server-side provider prototype verification completed 2026-05-31:
    - `node scripts/comment-translator-server-provider-prototype-contract.mjs` RED first: `server-side DeepL provider prototype module exists` で期待どおり失敗、その後 PASS。
    - `node scripts/comment-translator-provider-boundary-contract.mjs` PASS
    - comment translator provider boundary contract remains in the verification bundle for this slice.
    - `node scripts/comment-translator-manual-input-mvp-contract.mjs` PASS
    - `node scripts/comment-translator-interactive-shell-contract.mjs` PASS
    - `node scripts/comment-translator-mock-foundation-contract.mjs` PASS
    - `node scripts/tool-portal-entry-contract.mjs` PASS
    - `npm run lint` PASS
    - `npx tsc --noEmit` PASS
    - `npm run build` PASS (`/tools/comment-translator` included in app routes; server-runtime buildのため `static-export-rsc-aliases` はskip、`middleware` deprecation warningとwebpack cache warningあり)
    - `git diff --check` PASS (`docs/future/COMMENT_TRANSLATOR_PROVIDER_BOUNDARY_DESIGN.md` CRLF変換warningのみ)
  - server-side provider prototype unchecked scope / residual risk:
    - 実 credential を使った DeepL live smoke は未実施。secret 値を扱わない方針のため、このPRでは fake fetch contract と build verification まで。
    - YouTube OAuth / owner verification / Live Chat polling、client component からの provider 呼び出し、server action / route handler 公開API化は未実装。
    - usage handoff は object 生成まで。DB write、billing state update、quota enforcement、paid plan integration は未実装。
    - DeepL provider の latency / cost / data-retention 実測、provider比較、glossary support の provider-specific検証は後続。
  - YouTube input boundary design changes added 2026-05-31:
    - `lib/comment-translator-youtube-input-boundary.ts` を追加し、`import "server-only";` で YouTube OAuth / owner verification / Live Chat polling の pure type boundary を server-only に閉じた。
    - OAuth access token / refresh token は server-only、client component / fixture / task docs / PR body / localStorage / IndexedDB への露出禁止として固定した。secret / service role key / private credential は要求・表示・保存していない。
    - owner verification は future server OAuth orchestrator の責務、broadcaster read-only dock は client では approved / blocked state を表示するだけの責務として分離した。
    - Live Chat polling は `nextPageToken` cursor、`pollingIntervalMillis`、`rateLimitExceeded` recoverable backoff、bounded retry + jitter、terminal states を型境界として固定した。polling runtime は入れていない。
    - provider request に渡してよい最小 comment payload を `commentId` / `publishedAt` / `text` / `platformLanguageHint` に限定し、OAuth token、refresh token、channel secret、viewer identifier、raw OAuth state、polling cursor は禁止した。
    - provider module と YouTube input module の direct import / direct call を禁止し、将来の bridge owner を future server orchestrator として分離した。
    - `docs/future/COMMENT_TRANSLATOR_YOUTUBE_INPUT_BOUNDARY_DESIGN.md` を追加し、short-lived diagnostic log、PII minimization、cache key material contact、runtime non-goals、Google official docsで確認した `youtube.readonly` / `mine=true` / `nextPageToken` / `pollingIntervalMillis` / `rateLimitExceeded` を secret 値なしで記録した。
    - `scripts/comment-translator-youtube-input-boundary-contract.mjs` を追加し、comment translator YouTube input boundary contract として token非露出、client/runtime非結合、provider direct coupling禁止、storage / schema / handoff / UI path非変更を固定した。
    - 既存 `MockTranslationProvider`、Manual / Paste Input MVP、interactive shell、DeepL provider prototype、storage key、IndexedDB、localStorage、Supabase schema / migration / RLS、handoff payload は変更していない。
    - UI変更なし。`components/comment-translator/*` と `/tools/comment-translator` route は変更していないため、幅別確認は今回対象外。
  - YouTube input boundary design verification completed 2026-05-31:
    - `node scripts/comment-translator-youtube-input-boundary-contract.mjs` RED first: `server-only YouTube input boundary module exists` で期待どおり失敗、その後 PASS。
    - `node scripts/comment-translator-server-provider-prototype-contract.mjs` PASS
    - `node scripts/comment-translator-provider-boundary-contract.mjs` PASS
    - `node scripts/comment-translator-manual-input-mvp-contract.mjs` PASS
    - `node scripts/comment-translator-interactive-shell-contract.mjs` PASS
    - `node scripts/comment-translator-mock-foundation-contract.mjs` PASS
    - `node scripts/tool-portal-entry-contract.mjs` PASS
    - `npm run lint` PASS
    - `npx tsc --noEmit` PASS
    - `npm run build` PASS (`/tools/comment-translator` included in app routes; server-runtime buildのため `static-export-rsc-aliases` はskip、`middleware` deprecation warningとwebpack cache warningあり)
    - `git diff --check` PASS (`task.md` CRLF変換warningのみ)
  - YouTube input boundary design unchecked scope / residual risk:
    - 実 YouTube OAuth / consent / callback / token refresh / revocation / encrypted token store は未実装。
    - Google API / YouTube Data API / Live Chat API の live call、owner verification runtime、Live Chat polling runtime、streamList runtime は未実装。
    - provider request bridge は設計のみ。server orchestrator、server action / route handler 公開API化、client component からの provider / Google API 呼び出しは未実装。
    - safe live YouTube login / OAuth / owner verification / Live Chat polling smoke は未実施。secret / private credential を扱わない方針のため、このPRでは contract / build verification まで。
    - 次 implementation PR 候補は `YouTube owner verification + polling runtime foundation`。このPR merge後、server-only OAuth orchestrator / owner-owned broadcast lookup / read-only polling loop / sanitized comment bridge を分割して扱う。
  - YouTube owner verification + Live Chat polling runtime foundation implementation added 2026-05-31:
    - `lib/comment-translator-youtube-runtime-foundation.ts` を追加し、`import "server-only";` で owner verification / owned broadcast lookup / read-only dock authorization / Live Chat polling step / sanitized comment bridge の runtime foundation を server-only に閉じた。
    - 実 Google API adapter、OAuth token persistence、refresh、revocation、encrypted token store は入れていない。credential は `credentialReferenceId` / owner channel reference などの server-side reference だけを扱い、token value は client component / fixture / task docs / PR body / localStorage / IndexedDB に出さない境界を維持した。
    - `authorizeYouTubeReadOnlyDock` は owner-verified + live broadcast + liveChatId のときだけ read-only dock を authorized にし、not-owner / missing live chat / non-live broadcast は blocked または unavailable として扱う。client trust は display-only。
    - `createInitialYouTubeLiveChatPollingState` / `advanceYouTubeLiveChatPollingState` で `nextPageToken`、`pollingIntervalMillis`、recoverable `rateLimitExceeded` backoff、bounded retry、terminal state (`liveChatEnded` など) を server-side state として固定した。
    - `sanitizeYouTubeLiveChatMessage` は `commentId` / `publishedAt` / `text` / `platformLanguageHint` のみを返し、author / channel / OAuth / cursor material を bridge payload に混ぜない。
    - `createDeterministicYouTubeOwnerPollingRuntime` を追加し、実 network call なしで owner verification / owned broadcast lookup / polling step を contract から deterministic に検証できるようにした。
    - translation provider module との direct import / direct call、client component からの Google API / provider / polling runtime 呼び出し、DeepL provider prototype、MockTranslationProvider、Manual / Paste Input MVP、interactive shell、storage key、payload、IndexedDB、localStorage、Supabase schema / migration / RLS、handoff payload は変更していない。
    - UI変更なし。`components/comment-translator/*` と `/tools/comment-translator` route は変更していないため、幅別確認は今回対象外。
  - YouTube owner verification + Live Chat polling runtime foundation verification completed 2026-05-31:
    - RED first: `node scripts/comment-translator-youtube-runtime-foundation-contract.mjs` は `server-only YouTube owner polling runtime foundation module exists` で期待どおり失敗。
    - `node scripts/comment-translator-youtube-runtime-foundation-contract.mjs` PASS (`YouTube owner verification + Live Chat polling runtime foundation contract`)。
    - `node scripts/comment-translator-youtube-input-boundary-contract.mjs` PASS。
    - `node scripts/comment-translator-server-provider-prototype-contract.mjs` PASS。
    - `node scripts/comment-translator-provider-boundary-contract.mjs` PASS。
    - `node scripts/comment-translator-manual-input-mvp-contract.mjs` PASS。
    - `node scripts/comment-translator-interactive-shell-contract.mjs` PASS。
    - `node scripts/comment-translator-mock-foundation-contract.mjs` PASS。
    - `node scripts/tool-portal-entry-contract.mjs` PASS。
    - `npm run lint` PASS。
    - `npx tsc --noEmit` PASS。
    - `npm run build` PASS (`/tools/comment-translator` included in app routes; server-runtime buildのため `static-export-rsc-aliases` はskip、`middleware` deprecation warningとwebpack cache warningあり)。
    - `git diff --check` PASS (`task.md` CRLF変換warningのみ)。
  - YouTube owner verification + Live Chat polling runtime foundation unchecked scope / residual risk:
    - 実 YouTube OAuth / consent / callback / token persistence / refresh / revocation / encrypted token store は未実装。
    - Google API / YouTube Data API / Live Chat API の live call、safe live YouTube login、owner verification、Live Chat polling smoke は未実施。secret / private credential を扱わない方針のため、このPRでは deterministic adapter contract と build verification まで。
    - polling loop は single-step state transition foundation まで。long-running scheduler、route handler / server action 公開API化、streaming transport、quota write、billing integration は未実装。
    - 次 PR 候補は `YouTube Google API adapter + token reference resolver design`。実 token value を扱う前に server-only token reference resolver、encrypted token store 方針、Google API fake-fetch adapter contract、safe live smoke 条件を別PRで固定する。
  - PR #269 merge gate completed 2026-05-31:
    - PR #269 (`codex/comment-translator-youtube-owner-polling-runtime-foundation` -> `codex/comment-translator-preview`) は `2026-05-31T03:10:00Z` に merged。
    - merge commit `11be554c9c8741e5bac80cb022343a78e2c40cc5` は `origin/codex/comment-translator-preview` に含まれることを確認した。
  - YouTube Google API adapter + token reference resolver design implementation added 2026-05-31:
    - `lib/comment-translator-youtube-api-adapter.ts` を追加し、`import "server-only";` で YouTube Google API adapter + token reference resolver design を server-only に閉じた。
    - `youtubeEncryptedTokenStoreDesignPolicy` で future server encrypted token store 方針を固定した。access token / refresh token persistence は encrypted server-only 方針に留め、refresh / revocation / schema mutation / encrypted store 本実装は入れていない。
    - `YouTubeTokenReferenceResolver` / `createStaticYouTubeTokenReferenceResolver` は `credentialReferenceId` を解決して server fetch authorization binding を返すだけにし、token value / refresh token value は `never-returned-by-design` として固定した。
    - `createDeterministicYouTubeGoogleApiAdapter` は fake-fetch seam で `channels.list`、`liveBroadcasts.list`、`liveChatMessages.list` 相当の owner verification / owned broadcast lookup / polling step を deterministic に検証する。実 `fetch`、`googleapis` client、OAuth runtime、process env secret は使っていない。
    - adapter は `comment-translator-youtube-runtime-foundation` を compose し、sanitized comment bridge は `commentId` / `publishedAt` / `text` / `platformLanguageHint` のみに限定した。
    - translation provider module との direct import / direct call、client component からの Google API / provider / polling runtime 呼び出し、DeepL provider prototype、MockTranslationProvider、Manual / Paste Input MVP、interactive shell、storage key、payload、IndexedDB、localStorage、Supabase schema / migration / RLS、handoff payload は変更していない。
    - UI変更なし。`components/comment-translator/*` と `/tools/comment-translator` route は変更していないため、幅別確認は今回対象外。
  - YouTube Google API adapter + token reference resolver design verification completed 2026-05-31:
    - RED first: `node scripts/comment-translator-youtube-api-adapter-token-reference-contract.mjs` は `server-only YouTube Google API adapter + token reference module exists` で期待どおり失敗。
    - `node scripts/comment-translator-youtube-api-adapter-token-reference-contract.mjs` PASS。
    - `node scripts/comment-translator-youtube-runtime-foundation-contract.mjs` PASS。
    - `node scripts/comment-translator-youtube-input-boundary-contract.mjs` PASS。
    - `node scripts/comment-translator-server-provider-prototype-contract.mjs` PASS。
    - `node scripts/comment-translator-provider-boundary-contract.mjs` PASS。
    - `node scripts/comment-translator-manual-input-mvp-contract.mjs` PASS。
    - `node scripts/comment-translator-interactive-shell-contract.mjs` PASS。
    - `node scripts/comment-translator-mock-foundation-contract.mjs` PASS。
    - `node scripts/tool-portal-entry-contract.mjs` PASS。
    - `npm run lint` PASS。
    - `npx tsc --noEmit` PASS。
    - `npm run build` PASS (`/tools/comment-translator` included in app routes; server-runtime buildのため `static-export-rsc-aliases` はskip、`middleware` deprecation warningあり)。
    - `git diff --check` PASS (`task.md` CRLF変換warningのみ)。
  - YouTube Google API adapter + token reference resolver design unchecked scope / residual risk:
    - OAuth token persistence、refresh、revocation、encrypted token store 本実装は未実装。token value は client component、fixture、task docs、PR body、localStorage、IndexedDB に出していない。
    - Google API / YouTube Data API / Live Chat API の live call、safe live Google API smoke、safe live YouTube login / OAuth / owner verification / Live Chat polling smoke は未実施。必要条件は `youtubeGoogleApiSafeLiveSmokePolicy` に固定したが、このPRでは secret / private credential を扱わない。
    - adapter は deterministic fake-fetch seam まで。route handler / server action 公開API化、long-running scheduler、streaming transport、quota write、billing integration は未実装。
    - 次 PR 候補は `YouTube OAuth token store + consent runtime foundation`。実施する場合も user-approved safe test account、server-only token handling、encrypted token store 実装、read-only scope、token value 非表示を hard boundary にする。
  - PR #270 merge gate completed 2026-05-31:
    - PR #270 (`codex/comment-translator-youtube-api-adapter-token-reference-design` -> `codex/comment-translator-preview`) は `2026-05-31T03:38:35Z` に merged。
    - merge commit `b218417e23329bcbddff2814bf0c4512d4d12eba` は `origin/codex/comment-translator-preview` に含まれることを確認した。
  - YouTube OAuth token store + consent runtime foundation implementation added 2026-05-31:
    - `lib/comment-translator-youtube-oauth-token-store-foundation.ts` を追加し、`import "server-only";` で OAuth consent / callback / encrypted token store blocker / token resolver runtime foundation を server-only に閉じた。
    - consent draft は state reference、redirect URI reference、owner hint reference、read-only scope、offline access intent、consent prompt intentだけを扱い、token value / refresh token value を生成しない。
    - callback validation は state mismatch、OAuth error、authorization code presence を server callback exchange 前の設計境界として扱い、authorization code や token material を fixture / docs / PR body に出さない。
    - `youtubeEncryptedTokenStoreImplementationBlockers` で schema approval、key management、token refresh、revocation、audit log、retention policy、safe live smoke approval を明示した。
    - token resolver runtime は `credentialReferenceId` 入力、read-only scope、`server-fetch-only` authorization binding、`never-returned-by-design` token output に固定し、provider coupling / quota write は禁止または未実装のままにした。
    - `docs/future/COMMENT_TRANSLATOR_YOUTUBE_OAUTH_TOKEN_STORE_FOUNDATION.md` に責務境界、blocker、safe live smoke 未実施条件、runtime non-goals を記録した。
    - translation provider module との direct import / direct call、client component からの Google API / provider / polling runtime 呼び出し、DeepL provider prototype、MockTranslationProvider、Manual / Paste Input MVP、interactive shell、storage key、payload、IndexedDB、localStorage、Supabase schema / migration / RLS、handoff payload は変更していない。
    - UI変更なし。`components/comment-translator/*` と `/tools/comment-translator` route は変更していないため、幅別確認は今回対象外。
  - YouTube OAuth token store + consent runtime foundation verification completed 2026-05-31:
    - RED first: `node scripts/comment-translator-youtube-oauth-token-store-foundation-contract.mjs` は `server-only YouTube OAuth token store foundation module exists` で期待どおり失敗。
    - `node scripts/comment-translator-youtube-oauth-token-store-foundation-contract.mjs` PASS。
    - `node scripts/comment-translator-youtube-api-adapter-token-reference-contract.mjs` PASS。
    - `node scripts/comment-translator-youtube-runtime-foundation-contract.mjs` PASS。
    - `node scripts/comment-translator-youtube-input-boundary-contract.mjs` PASS。
    - `node scripts/comment-translator-server-provider-prototype-contract.mjs` PASS。
    - `node scripts/comment-translator-provider-boundary-contract.mjs` PASS。
    - `node scripts/comment-translator-manual-input-mvp-contract.mjs` PASS。
    - `node scripts/comment-translator-interactive-shell-contract.mjs` PASS。
    - `node scripts/comment-translator-mock-foundation-contract.mjs` PASS。
    - `node scripts/tool-portal-entry-contract.mjs` PASS。
    - `npm run lint` PASS。
    - `npx tsc --noEmit` PASS。
    - `npm run build` PASS (`/tools/comment-translator` included in app routes; server-runtime buildのため `static-export-rsc-aliases` はskip、`middleware` deprecation warningとwebpack cache warningあり)。
    - `git diff --check` PASS (`task.md` CRLF変換warningのみ)。
    - UI変更なしのため `/tools` と `/tools/comment-translator` の幅別確認は未実施。
  - YouTube OAuth token store + consent runtime foundation unchecked scope / residual risk:
    - OAuth route handler、Google OAuth consent URL generation、callback token exchange、token persistence、refresh、revocation、encrypted token store 本実装は未実装。
    - Supabase schema / migration / RLS、key management、audit writer、retention cleanup は未実装。実装前に separate approved migration / key policy / revocation policy / audit policy が必要。
    - Google API / YouTube Data API / Live Chat API の live call、safe live Google API smoke、safe live YouTube login / OAuth / owner verification / Live Chat polling smoke は未実施。secret / private credential を扱わない方針のため、このPRでは contract / build verification まで。
    - 次 PR 候補は `YouTube encrypted token store implementation plan / blocker resolution`。schema / key management / refresh / revocation / audit / retention を承認可能な設計に分解し、実 migration は別承認後に切る。
  - PR #271 merge gate completed 2026-05-31:
    - PR #271 (`codex/comment-translator-youtube-oauth-token-store-foundation` -> `codex/comment-translator-preview`) は `2026-05-31T04:24:56Z` に merged。
    - merge commit `70a55ccb24bccfa6bad7fba9a7e382e11d41bceb` は `origin/codex/comment-translator-preview` の先頭として確認済み。
  - YouTube encrypted token store implementation plan / blocker resolution implementation added 2026-05-31:
    - `lib/comment-translator-youtube-oauth-token-store-foundation.ts` に `youtubeEncryptedTokenStoreBlockerResolutionDecisions`、`youtubeEncryptedTokenStoreBlockerResolutionPlan`、`createYouTubeEncryptedTokenStoreBlockerResolutionMemo`、`assessYouTubeEncryptedTokenStoreImplementationReadiness` を追加した。
    - schema approval / key management / token refresh / revocation / audit log / retention policy / safe live smoke approval をそれぞれ decision unit、proposal、required approval、separate PR gate へ分解した。
    - `assessYouTubeEncryptedTokenStoreImplementationReadiness([])` は blocker 未承認なら `blocked` を返し、全 blocker 承認済みでもこのPR内では token persistence を開始せず `ready-for-separate-implementation-pr` に留める。
    - `docs/future/COMMENT_TRANSLATOR_YOUTUBE_TOKEN_STORE_BLOCKER_RESOLUTION.md` に blocker resolution memo、safe live smoke 条件、未確認範囲、次 PR 候補を記録した。
    - token persistence、token refresh、revocation、encrypted token store 本実装、Supabase schema / migration / RLS、Google API live call、storage key、payload、IndexedDB、localStorage、handoff payload、quota write、billing integration は変更していない。
    - translation provider module との direct import / direct call、client component からの Google API / provider / polling runtime 呼び出し、DeepL provider prototype、MockTranslationProvider、Manual / Paste Input MVP、interactive shell は変更していない。
    - UI変更なし。`components/comment-translator/*` と `/tools/comment-translator` route は変更していないため、幅別確認は今回対象外。
  - YouTube encrypted token store implementation plan / blocker resolution verification:
    - RED first: `node scripts/comment-translator-youtube-token-store-blocker-resolution-contract.mjs` は `YouTube encrypted token store blocker resolution memo exists` で期待どおり失敗。
    - `node scripts/comment-translator-youtube-token-store-blocker-resolution-contract.mjs` PASS。
    - `node scripts/comment-translator-youtube-oauth-token-store-foundation-contract.mjs` PASS。
    - `node scripts/comment-translator-youtube-api-adapter-token-reference-contract.mjs` PASS。
    - `node scripts/comment-translator-youtube-runtime-foundation-contract.mjs` PASS。
    - `node scripts/comment-translator-youtube-input-boundary-contract.mjs` PASS。
    - `node scripts/comment-translator-server-provider-prototype-contract.mjs` PASS。
    - `node scripts/comment-translator-provider-boundary-contract.mjs` PASS。
    - `node scripts/comment-translator-manual-input-mvp-contract.mjs` PASS。
    - `node scripts/comment-translator-interactive-shell-contract.mjs` PASS。
    - `node scripts/comment-translator-mock-foundation-contract.mjs` PASS。
    - `node scripts/tool-portal-entry-contract.mjs` PASS。
    - `npm run lint` PASS。
    - `npx tsc --noEmit` PASS。
    - `npm run build` PASS (`/tools/comment-translator` included in app routes; server-runtime buildのため `static-export-rsc-aliases` はskip、`middleware` deprecation warningとwebpack cache warningあり)。
    - `git diff --check` PASS (`lib/comment-translator-youtube-oauth-token-store-foundation.ts` / `task.md` CRLF変換warningのみ)。
    - UI変更なしのため `/tools` と `/tools/comment-translator` の幅別確認は未実施。
  - YouTube encrypted token store implementation plan / blocker resolution unchecked scope / residual risk:
    - OAuth token persistence、token refresh、revocation、encrypted token store 本実装は未実装。
    - Supabase schema / migration / RLS、key management implementation、audit writer、retention cleanup は未実装。implementation は required approval と separate PR が必要。
    - Google API / YouTube Data API / Live Chat API の live call、safe live Google API smoke、safe live YouTube login / OAuth / owner verification / Live Chat polling smoke は未実施。secret / private credential を扱わない方針のため、このPRでは contract / memo / build verification まで。
    - 次 PR 候補は `YouTube encrypted token store schema/key approval checkpoint`。blocker resolution memo の required approval を user / security / data-owner が承認するまで、migration や token persistence 実装へ進まない。
  - PR #272 merge gate completed 2026-05-31:
    - PR #272 (`codex/comment-translator-youtube-token-store-blocker-resolution` -> `codex/comment-translator-preview`) は `2026-05-31T05:14:20Z` に merged。
    - merge commit `e88da0964cfa0f9edbfe31a03511c2b50611fa01` は `origin/codex/comment-translator-preview` の先頭として確認済み。
  - YouTube encrypted token store schema/key approval checkpoint implementation added 2026-05-31:
    - `lib/comment-translator-youtube-oauth-token-store-foundation.ts` に `YouTubeEncryptedTokenStoreSchemaKeyApprovalCheckpoint` と `youtubeEncryptedTokenStoreSchemaKeyApprovalCheckpoint` を追加した。
    - checkpoint は `schema-approval` / `key-management` のみを対象にし、status は `proposal-only-pending-explicit-approval` として固定した。
    - Product owner / Data owner / Security owner の承認者、schema table / RLS / migration rollout / rollback、managed secret or KMS / rotation / emergency disable / no client decrypt の確認項目を明記した。
    - approved migration PR に進める条件、proposal-only に留める条件、safe live smoke gate、未実施範囲を `docs/future/COMMENT_TRANSLATOR_YOUTUBE_TOKEN_STORE_BLOCKER_RESOLUTION.md` に追記した。
    - `scripts/comment-translator-youtube-token-store-schema-key-approval-contract.mjs` を追加し、既存 blocker resolution contract の allowed changed files に新 contract を追加した。
    - token persistence、token refresh、revocation、encrypted token store 本実装、Supabase schema / migration / RLS、Google API live call、storage key、payload、IndexedDB、localStorage、handoff payload、quota write、billing integration は変更していない。
    - translation provider module との direct import / direct call、client component からの Google API / provider / polling runtime 呼び出し、DeepL provider prototype、MockTranslationProvider、Manual / Paste Input MVP、interactive shell は変更していない。
    - UI変更なし。`components/comment-translator/*` と `/tools/comment-translator` route は変更していないため、幅別確認は今回対象外。
  - YouTube encrypted token store schema/key approval checkpoint verification:
    - RED first: `node scripts/comment-translator-youtube-token-store-schema-key-approval-contract.mjs` は `exports YouTubeEncryptedTokenStoreSchemaKeyApprovalCheckpoint` で期待どおり失敗。
    - `node scripts/comment-translator-youtube-token-store-schema-key-approval-contract.mjs` PASS。
    - `node scripts/comment-translator-youtube-token-store-blocker-resolution-contract.mjs` PASS。
    - `node scripts/comment-translator-youtube-oauth-token-store-foundation-contract.mjs` PASS。
    - `node scripts/comment-translator-youtube-api-adapter-token-reference-contract.mjs` PASS。
    - `node scripts/comment-translator-youtube-runtime-foundation-contract.mjs` PASS。
    - `node scripts/comment-translator-youtube-input-boundary-contract.mjs` PASS。
    - `node scripts/comment-translator-server-provider-prototype-contract.mjs` PASS。
    - `node scripts/comment-translator-provider-boundary-contract.mjs` PASS。
    - `node scripts/comment-translator-manual-input-mvp-contract.mjs` PASS。
    - `node scripts/comment-translator-interactive-shell-contract.mjs` PASS。
    - `node scripts/comment-translator-mock-foundation-contract.mjs` PASS。
    - `node scripts/tool-portal-entry-contract.mjs` PASS。
    - `npm run lint` PASS。
    - `npx tsc --noEmit` は fresh worktree の未インストール依存で一度失敗後、`npm ci` 実行後に PASS。
    - `npm run build` PASS (`/tools/comment-translator` included in app routes; server-runtime buildのため `static-export-rsc-aliases` はskip、`middleware` deprecation warningとwebpack cache warningあり)。
    - `git diff --check` PASS (CRLF変換warningのみ)。
    - UI変更なしのため `/tools` と `/tools/comment-translator` の幅別確認は未実施。
  - YouTube encrypted token store schema/key approval checkpoint unchecked scope / residual risk:
    - OAuth token persistence、token refresh、revocation、encrypted token store 本実装は未実装。
    - Supabase schema / migration / RLS、key management implementation、audit writer、retention cleanup は未実装。implementation は required approval と separate PR が必要。
    - approved migration PR は Product owner / Data owner / Security owner の明示承認後に別PRで切る。承認が欠ける場合は proposal-only に留める。
    - Google API / YouTube Data API / Live Chat API の live call、safe live Google API smoke、safe live YouTube login / OAuth / owner verification / Live Chat polling smoke は未実施。safe test YouTube owner account、server-only token resolver、encrypted token store review、read-only scope、bounded endpoint plan が揃うまで実行しない。
    - 次 PR 候補は `YouTube encrypted token store approved migration proposal`。明示承認がない場合は、schema/key approval checkpoint の review / approval collection に留め、migration や token persistence 実装へ進まない。

2. Analytics / consent decision
   - status: no immediate implementation。
   - current decision:
     - 閲覧者数と Core Web Vitals は Cloudflare Web Analytics の dashboard で当面足りる。
     - GA4 は現時点では追加しない。
     - GA4 / advertising / broader third-party tracking を入れる場合は、privacy copy と cookie / consent 方針を別 PR で見直す。

3. Account / monetization later scope
   - Password hardening dashboard settings:
     - `Confirm email` stays ON。
     - `Allow anonymous sign-ins` stays OFF。
     - `Allow manual linking` stays OFF unless a separate provider-linking design exists。
     - `Minimum password length` should stay aligned to app validation 8+ characters。
     - `Prevent use of leaked passwords` is recommended if plan availability allows it。
     - `Require current password when updating` は current-password UI deploy / smoke 後に ON。
   - Stripe Billing / quota foundation:
     - Checkout Sessions、Customer Portal、webhooks、server-authoritative quota remain a separate PR sequence。
     - `usage_quotas` remains owner-read only for browser clients; quota writes stay trusted-server-only。

4. Local font loading later scope
   - status: user account / preferences foundation 後の later scope。
   - direction:
     - 端末に入っている font を直接読む Local Font Access 系は、ログイン / user settings 基盤の後に扱う。
     - DB に保存する場合も、基本は font family / PostScript name / style / fallback / last-seen state などの選択情報に留める。
     - font file 本体の保存は、ユーザーが明示的に upload した場合だけ別途検討する。

## Recommended Roadmap

1. Comment Translator Manual / Paste Input MVP: PR #264 で `codex/comment-translator-preview` へ merge 済み。
2. Translation provider boundary design: PR #266 で `codex/comment-translator-preview` へ merge 済み。
3. Server-side translation prototype: PR #267 で `codex/comment-translator-preview` へ merge 済み。
4. YouTube OAuth / owner verification / Live Chat polling input boundary design: PR #268 で `codex/comment-translator-preview` へ merge 済み。
5. YouTube owner verification + polling runtime foundation: PR #269 で `codex/comment-translator-preview` へ merge 済み。
6. YouTube Google API adapter + token reference resolver design: PR #270 で `codex/comment-translator-preview` へ merge 済み。
7. YouTube OAuth token store + consent runtime foundation: PR #271 で `codex/comment-translator-preview` へ merge 済み。
8. YouTube encrypted token store implementation plan / blocker resolution: PR #272 で `codex/comment-translator-preview` へ merge 済み。
9. YouTube encrypted token store schema/key approval checkpoint: this branch で blocker resolution memo の required approval を確認し、proposal-only で足りるか approved migration PR に進めるか判断する。
10. Billing / quota foundation: Checkout Sessions, Customer Portal, webhook, server-authoritative quota。
11. Tool-specific persistence / preference sync only after data boundary and quota policy are fixed。
12. Thumbnail Editor 9:16 preset / crop / text-image schema / preset typography refinement as separate PRs。
13. Schedule Calendar Google Calendar integration or server sync after account foundation policy is stable。

## Next Session Prompt

```text
D:/V_streamer_tools で作業してください。

目的:
Kuro Live Comment Translator の次 PR 候補として、YouTube encrypted token store approved migration proposal gate を確認してください。YouTube encrypted token store schema/key approval checkpoint PR が `codex/comment-translator-preview` に merge 済みであることを確認してから進めてください。

前提:
- main 直作業は禁止です。
- まず `git fetch origin --prune` を実行してください。
- AGENTS.md と task.md を確認してください。
- PR #272 は merge 済みです。今回の前提として、schema/key approval checkpoint PR も `codex/comment-translator-preview` に merge 済みであることを確認してください。
- schema/key approval checkpoint PR が未mergeなら新規実装へ進まず、blocker summary を返してください。
- Product owner / Data owner / Security owner の明示承認が task/docs/issue/PR context にない場合は migration 実装へ進まず、承認不足の blocker summary と必要確認項目だけを返してください。
- 作業は `codex/comment-translator-preview` から新しい feature branch を切ってください。
- 推奨 branch: `codex/comment-translator-youtube-token-store-approved-migration-proposal`
- 推奨 worktree: `D:/V_streamer_tools/.worktrees/comment-translator-youtube-token-store-approved-migration-proposal`
- 初回 platform は YouTube。
- secret / service_role key / private credential は要求・表示・保存しない。
- OAuth access token / refresh token は client component、fixture、task docs、PR body、localStorage、IndexedDB に出さない。
- 既存 storage key / payload / IndexedDB / localStorage key / Supabase schema / migration / RLS policy / handoff payload は変更しない。
- main へはまだ統合しない。`codex/comment-translator-preview` 宛てのPRとして進める。

scope:
- `docs/future/COMMENT_TRANSLATOR_YOUTUBE_TOKEN_STORE_BLOCKER_RESOLUTION.md` と `youtubeEncryptedTokenStoreSchemaKeyApprovalCheckpoint` を読み、approved migration PR に進める条件が満たされているか確認する。
- 明示承認が不足している場合は proposal-only / blocker summary / approval collection note に留める。
- 明示承認が揃っている場合でも、このPRでは migration proposal / contract / rollback plan に閉じ、実 migration / RLS policy 追加は別途承認された migration PR へ分ける。
- Google API live call は safe live smoke 条件が揃うまで実行しない。
- owner verification、owned broadcast lookup、Live Chat polling step、sanitized comment bridge は translation provider module と直接結合しない。
- client component から Google API / provider / polling runtime を直接呼ばない。
- DeepL provider prototype、MockTranslationProvider、Manual / Paste Input MVP、interactive shell の既存挙動は壊さない。

実装したいこと:
- approved migration PR に進める明示承認の有無を確認し、欠けている場合は不足承認と確認項目を整理する。
- 承認済みの場合でも migration PR の条件、rollback、review gate、safe live smoke gate を contract-first で固定する。
- safe live smoke を実行できる条件と、実行しない場合の未確認範囲を task.md / PR body に明記する。
- token / client storage / provider coupling / storage / quota write の禁止境界を維持する。
- UI変更は原則なし。必要な場合だけ幅別確認を行う。

実装方針:
- contract-first で進める。
- 実 credential や private token は扱わない。
- 実 Google API live smoke が安全にできない場合は未実施範囲として task.md / PR body に明記する。

Out of scope:
- OAuth token persistence 本実装。
- token refresh / revocation / encrypted token store 本実装。
- Supabase schema / migration / RLS policy 変更。
- client component からの provider / Google API / polling runtime 呼び出し。
- DeepL / translation provider prototype の変更。
- Stripe checkout / billing、server-authoritative quota、paid plan enforcement。
- GA4 実装、cookie consent banner。
- 既存ツールの保存 payload / IndexedDB / localStorage key 変更。
- コメント返信生成、自動投稿、viewer overlay、OBS plugin、ASR / 音声翻訳。
- main integration PR。

検証:
- new/updated YouTube token store approved migration proposal gate contract
- `node scripts/comment-translator-youtube-token-store-schema-key-approval-contract.mjs`
- `node scripts/comment-translator-youtube-token-store-blocker-resolution-contract.mjs`
- `node scripts/comment-translator-youtube-oauth-token-store-foundation-contract.mjs`
- `node scripts/comment-translator-youtube-api-adapter-token-reference-contract.mjs`
- `node scripts/comment-translator-youtube-runtime-foundation-contract.mjs`
- `node scripts/comment-translator-youtube-input-boundary-contract.mjs`
- `node scripts/comment-translator-server-provider-prototype-contract.mjs`
- `node scripts/comment-translator-provider-boundary-contract.mjs`
- `node scripts/comment-translator-manual-input-mvp-contract.mjs`
- `node scripts/comment-translator-interactive-shell-contract.mjs`
- `node scripts/comment-translator-mock-foundation-contract.mjs`
- `node scripts/tool-portal-entry-contract.mjs`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `git diff --check`
- UI変更がある場合だけ、`/tools` and `/tools/comment-translator` を `390 / 820 / 1024 / 1280 / 1366px` で確認し、task.md に残す。

完了時:
- `task.md` に実装内容、検証結果、未確認範囲、残リスク、次 PR 候補を記録してください。
- 問題なければ feature branch から `codex/comment-translator-preview` 宛てに draft PR を作成してください。
```

## Backlog

- Comment Translator:
  - YouTube OAuth / owner verification / Live Chat polling。
  - translation provider selection and provider abstraction。
  - glossary terms, usage limits, short-lived logs, moderation skip rules。
  - paid plan / quota integration after billing foundation。
- Thumbnail Editor:
  - 9:16 preset for YouTube Shorts / vertical streams。
  - crop 仕様。
  - text / image layer schema。
  - local font loading after user account / preferences foundation。
  - preset typography refinement。
- Account / monetization:
  - password hardening dashboard alignment。
  - preferences sync MVP。
  - paid plan / quota foundation。
- Schedule Calendar:
  - Google Calendar 連携。
  - ログイン / サーバー同期。
  - シリーズ一括編集、例外日。
  - 週間予定画像そのものの生成。
- SNS Split Image Maker:
  - ZIP 出力。
  - X 以外の比率。
  - 複数形式の大規模 export。
  - 重い onboarding。
- EN / locale:
  - 細かい内部説明、debug 文、保存済みデータ本文、網羅的 aria 全面翻訳。
  - Next metadata の動的 locale 切替。

## Verification Baseline

docs / contract / material / font 変更時は、必要に応じて次を実行する。

- `node scripts/static-export-rsc-aliases.mjs --check`
- `node scripts/tool-portal-entry-contract.mjs`
- `node scripts/tool-handoff-contract.mjs`
- `node scripts/preference-classification-contract.mjs`
- `node scripts/local-preference-adapter-contract.mjs`
- `node scripts/account-preferences-shell-contract.mjs`
- `node scripts/supabase-auth-first-slice-contract.mjs`
- `node scripts/auth-security-hardening-contract.mjs`
- `node scripts/auth-turnstile-captcha-contract.mjs`
- `node scripts/account-auth-public-readiness-contract.mjs`
- `node scripts/workers-route-smoke-account-nav-contract.mjs`
- `node scripts/legal-foundation-contract.mjs`
- `node scripts/thumbnail-material-assets-contract.mjs`
- `node scripts/thumbnail-font-policy-contract.mjs`
- `node scripts/thumbnail-quality-guard-contract.mjs`
- `node scripts/thumbnail-standee-placement-contract.mjs`
- `node scripts/thumbnail-preset-text-locale-contract.mjs`
- `node scripts/thumbnail-preset-apply-safety-contract.mjs`
- `node scripts/thumbnail-preset-variants-contract.mjs`
- `node scripts/sns-split-image-maker-contract.mjs`
- `node scripts/portal-tools-copy-locale-contract.mjs`
- `npm run build:cloudflare`
- `npm run build`
- `npm run lint`
- `npx tsc --noEmit`
- `git diff --check`

UI / 表示文言を触った場合のみ、幅別確認結果をこのファイルに残す。

## Completed / Archive Summary

- Account / preferences foundation:
  - PR #229 - #234 で preference classification、account shell、local preference adapter、auth/provider decision、Supabase Auth boundary、Cloudflare Workers / OpenNext deploy foundation、public auth UI、remote display settings apply、CTA copy、tips modal、security hardening、final readiness を main へ統合した。
  - PR #234 main merge: 2026-05-29, merge commit `5d7dd09`。
  - 詳細は PR bodies と `docs/archive/TASK_HISTORY_2026-05.md` の P33 を参照する。
- Auth production hardening:
  - PR #250 - #253 で production auth recovery flow、recovery pending session、trailing slash redirect、recovery pending navigation を main へ統合した。
  - PR #257 - #259 で Turnstile CAPTCHA wiring、runtime site key hydration、SPA navigation explicit render を main へ統合した。
  - 詳細は PR bodies と `docs/archive/TASK_HISTORY_2026-05.md` の P34 / P36 を参照する。
- Legal foundation:
  - PR #254 で `/terms`、`/privacy`、`/legal/tokushoho` と右側メイン領域 footer 導線を追加した。
  - 詳細は PR body と `docs/archive/TASK_HISTORY_2026-05.md` の P35 を参照する。
- Thumbnail Editor IRIAM square preview branch:
  - PR #200 - #220 で 1:1 IRIAM 5 preset、settings modal、background / title swap、EN title asset、registered material expansion、final confirmation、main integration を完了。
  - 詳細は PR bodies と `docs/archive/TASK_HISTORY_2026-05.md` の P30 / P31 を参照する。
- Thumbnail Editor font expansion:
  - PR #221 - #226 で font expansion check branch、IRIAM title parity fonts、Standard Batch B plan、Batch B-JA、Batch B-EN、main integration を完了。
  - 詳細は PR bodies と `docs/archive/TASK_HISTORY_2026-05.md` の P32 を参照する。
- Thumbnail Editor usecase presets:
  - `goods_notice` / `membership_stream` / `asmr_stream` などの usecase preset sequence は完了済み。詳細は PR bodies と archive history を参照する。
- Portal / public prelaunch:
  - Portal settings visibility polish、Thumbnail Editor inline text edit、EN support は完了または各 PR body に集約済み。
- EN support:
  - PR #154 - #171 で EN support preview から main 向け final integration check まで完了。
  - main merge: 2026-05-20, merge commit `270b81f`。
  - completed details are kept in PR bodies and archive docs, not repeated here.
- 2026-04 の履歴: `docs/archive/TASK_HISTORY_2026-04.md`
- 2026-05 の履歴: `docs/archive/TASK_HISTORY_2026-05.md`
- Schedule Calendar future tasks: `docs/future/SCHEDULE_CALENDAR_FUTURE_TASKS.md`
- Portal settings future direction: `docs/future/PORTAL_SETTINGS_FUTURE.md`
- Thumbnail Editor next PR scope: `docs/future/THUMBNAIL_EDITOR_NEXT_PR_SCOPE.md`
- Thumbnail Editor usecase preset candidates: `docs/future/THUMBNAIL_EDITOR_USECASE_PRESET_CANDIDATES.md`
- Thumbnail Editor font candidates: `docs/future/THUMBNAIL_EDITOR_FONT_CANDIDATES.md`
- Thumbnail Editor registered material expansion plan: `docs/future/THUMBNAIL_EDITOR_IRIAM_SQUARE_DECORATION_MATERIAL_CONTRACT.md`

## 参照ドキュメント

- `docs/design-thumbnail-editor.md`
- `docs/design-sns-split-image-maker.md`
- `docs/design-sheet-sns-split-image-maker.md`
- `scripts/sns-split-image-maker-contract.mjs`
