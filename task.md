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
   - status: mock foundation and interactive shell are merged into `codex/comment-translator-preview`; do not merge to `main` yet because the tool is not functionally usable without real input / translation flow。
   - branch stack:
     - preview: `codex/comment-translator-preview` at `D:/V_streamer_tools/.worktrees/comment-translator-preview`
     - feature: `codex/comment-translator-mock-foundation` at `D:/V_streamer_tools/.worktrees/comment-translator-mock-foundation`
     - feature: `codex/comment-translator-interactive-shell` at `D:/V_streamer_tools/.worktrees/comment-translator-interactive-shell`
     - next feature: `codex/comment-translator-manual-input-mvp` at `D:/V_streamer_tools/.worktrees/comment-translator-manual-input-mvp`
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
   - next slice target:
     - `Manual / Paste Input MVP` を `codex/comment-translator-preview` 宛てに切る。
     - YouTube OAuth / Google API / Live Chat polling なしで、配信者がコメントを手入力または貼り付けして、UI上で追加・検索・絞り込み・表示切替できる状態にする。
     - 翻訳 provider はまだ fixture / deterministic mock のまま。外部API call、API key、server action、quota DB write は入れない。
     - このsliceで storage key / IndexedDB / localStorage key / Supabase schema / migration / RLS / handoff payload は変更しない。
     - 実翻訳provider、YouTube OAuth / owner verification / Live Chat polling、billing / quota enforcement は後続の別PRで扱う。
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
   - unchecked scope / residual risk:
     - safe live YouTube login / OAuth / Live Chat / owner verification smokeは未実施。初回PRのscope外。
     - 生成mock内の文字は方向性確認用。正確な表示文言はReact UI側で固定した。
     - feature -> preview のdraft PRでmock方向のuser確認を受け、main向けintegration PRはpreview branch完成後に別途出す。
     - interactive shell も実 YouTube connection / translation provider / quota enforcement / account sync は未実装。後続の設計 slice で扱う。

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

1. Comment Translator Manual / Paste Input MVP: real APIなしで、貼り付け・手入力のコメントをUI上で扱える状態にする。
2. Translation provider boundary design: server-side only、secret非露出、quota/billing境界、provider比較を設計する。
3. Server-side translation prototype: 1 providerのみ、env var前提、quota DB writeなしで最小実験する。
4. YouTube OAuth / owner verification / Live Chat polling design spike。
5. Live Chat polling MVP: YouTube read-only polling と owner boundary を translation provider から分離して実装する。
6. Billing / quota foundation: Checkout Sessions, Customer Portal, webhook, server-authoritative quota。
7. Tool-specific persistence / preference sync only after data boundary and quota policy are fixed。
8. Thumbnail Editor 9:16 preset / crop / text-image schema / preset typography refinement as separate PRs。
9. Schedule Calendar Google Calendar integration or server sync after account foundation policy is stable。

## Next Session Prompt

```text
D:/V_streamer_tools で作業してください。

目的:
Kuro Live Comment Translator の次 slice として、実APIなしの Manual / Paste Input MVP を追加し、mock UI shell から「実際に入力したコメントを扱える preview tool」に進めてください。

前提:
- main 直作業は禁止です。
- まず `git fetch origin --prune` を実行してください。
- AGENTS.md と task.md を確認してください。
- `codex/comment-translator-preview` に mock foundation と interactive shell が merge 済みであることを確認してください。
- 作業は `codex/comment-translator-preview` から新しい feature branch を切ってください。
- 推奨 branch: `codex/comment-translator-manual-input-mvp`
- 推奨 worktree: `D:/V_streamer_tools/.worktrees/comment-translator-manual-input-mvp`
- 初回 platform は YouTube。
- secret / service_role key / private credential は要求・表示・保存しない。
- 既存 storage key / payload / IndexedDB / localStorage key / Supabase schema / migration / RLS policy / handoff payload は変更しない。
- main へはまだ統合しない。`codex/comment-translator-preview` 宛てのPRとして進める。

scope:
- YouTube OAuth、Google API、Live Chat polling、owner verification は実装しない。
- 実翻訳API、OpenAI / Google / DeepL / Gemini 等の実API call、API key、provider secret、server action、quota DB write は入れない。
- GA4、cookie consent、Stripe、billing、quota enforcement は入れない。
- fixture / deterministic mock translation provider 相当だけで UI state を動かす。
- 新しい storage key / IndexedDB / localStorage key / Supabase schema / migration / RLS policy / handoff payload は追加・変更しない。

実装したいこと:
- Manual / Paste Input panel を追加する。
  - single comment input
  - multiline paste input
  - sample comments insert
  - add to live comment list
  - clear draft / clear manual session
- 追加したコメントを既存 live comment list に統合する。
  - fixture rows と manual rows を区別できる badge / source 表示
  - status tabs / search / original-translated-both 表示切替に manual rows も反映
  - skip / error-like state の絞り込みに manual rows も反映
- mock translation state を UI 上で操作可能にする。
  - translated / skipped / error の deterministic mock result
  - cache hit / miss 表示
  - empty state
  - manual rows の件数と mock quota preview の整合
- Portal 表示言語 ja/en に追随する copy を維持する。
- OBS Browser Dock / narrow viewport で左 portal sidebar や本文に干渉しない layout にする。
- 外側の `PortalShell` / `PortalSidebar` の共通仕様は崩さない。

実装方針:
- 既存 `lib/comment-translator.ts` の fixture/provider 境界を再利用し、必要なら manual input 用の pure helper を追加する。
- contract-first で進める。manual input MVP contract を追加または interactive shell contract を拡張して、外部API境界と storage境界を固定する。
- UI は landing page ではなく、最初の画面から usable tool surface にする。
- 既存 ja/en copy、display mode、status filters、cache/quota preview を壊さない。

Out of scope:
- YouTube OAuth、Google API、Live Chat polling、owner verification の実装。
- OpenAI / Google / DeepL / Gemini 等の実翻訳 API 呼び出し。
- Stripe checkout / billing、server-authoritative quota、paid plan enforcement。
- GA4 実装、cookie consent banner。
- Supabase schema / migration / RLS policy 変更。
- 既存ツールの保存 payload / IndexedDB / localStorage key 変更。
- コメント返信生成、自動投稿、viewer overlay、OBS plugin、ASR / 音声翻訳。
- main integration PR。

検証:
- new/updated comment translator manual input MVP contract
- `node scripts/comment-translator-interactive-shell-contract.mjs`
- `node scripts/comment-translator-mock-foundation-contract.mjs`
- `node scripts/tool-portal-entry-contract.mjs`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `git diff --check`
- `/tools` and `/tools/comment-translator` を `390 / 820 / 1024 / 1280 / 1366px` で確認し、manual input panel / live comment list / sidebar が干渉しないことを task.md に残す。
- Japanese portal settingで manual input panel / controls / status labels が日本語表示になることを確認する。
- 操作 smoke:
  - single comment add
  - multiline paste add
  - sample insert
  - search / status filter
  - original / translated / both display
  - mock skipped / error-like state

完了時:
- `task.md` に実装内容、検証結果、幅別確認結果、未確認範囲、残リスクを記録してください。
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
