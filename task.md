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

## Mock-only Notes

- Future tool mock catalog expansion PR: `docs/mockups/future-tools/*` に追加 5候補 x 3 viewport の imagegen mock を追加し、`docs/future/FUTURE_TOOL_MOCK_CATALOG.md` に未実装候補 10件、比較表、更新後の推奨次候補を記録する。mock-only / docs-only で、Next route、React/CSS、storage/schema/auth/billing/quota、OAuth/API、OBS連携、動画処理、既存 tool behavior は未着手。
- expansion PR の lint / build / width check は、実 UI / route / component / CSS / runtime 変更がないため不要。確認は追加画像 15 files の存在、README / catalog の filename 一致、`git diff --check`、`git status --short` に閉じる。
- Future tool mock catalog PR: `docs/mockups/future-tools/*` に 5候補 x 3 viewport の imagegen mock を追加し、`docs/future/FUTURE_TOOL_MOCK_CATALOG.md` に比較表と推奨次候補を記録する。mock-only / docs-only で、Next route、React/CSS、storage/schema/auth/billing/quota、OAuth/API、既存 tool behavior は未着手。
- lint / build / width check は、実 UI / route / component / CSS / runtime 変更がないため不要。確認は画像 15 files の存在、README / catalog の filename 一致、`git diff --check`、`git status --short` に閉じる。

## Active Priorities

1. Kuro Live Comment Translator mock foundation
   - status: next implementation target。
   - seed:
     - `C:/Users/taka/Downloads/COMMENT_TRANSLATION_TOOL_PLAN.md`
     - `D:/V_streamer_tools/materials/ideas/15_最新技術活用ツール/多言語対応ライブ翻訳オーバーレイ_企画書.md`
     - `D:/V_streamer_tools/materials/ideas/15_最新技術活用ツール/リアルタイムAI音声翻訳オーバーレイ.md`
   - user decision:
     - 初回 platform は YouTube。
     - 初回 PR は `/imagegen` を使った各端末 mock 作成 -> user 確認 -> 承認 mock の再現まで。
     - 翻訳 API の実接続は初回 PR では扱わない。fixtures / `MockTranslationProvider` 相当で UI shell のみ作る。
     - Real translation provider は、YouTube OAuth / owner check / quota / billing boundary が固まった後に別 PR で比較する。
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

1. Kuro Live Comment Translator first PR: `/imagegen` device mock -> user confirmation -> UI shell reproduction with fixtures / mock provider only。
2. Comment Translator contract and route hardening: route, tool card, responsive layout, fixture states。
3. YouTube OAuth / owner verification / Live Chat polling design spike。
4. Translation provider spike: latest docs / pricing / latency / privacy boundary を確認し、server-side only の provider abstraction を決める。
5. Billing / quota foundation: Checkout Sessions, Customer Portal, webhook, server-authoritative quota。
6. Tool-specific persistence / preference sync only after data boundary and quota policy are fixed。
7. Thumbnail Editor 9:16 preset / crop / text-image schema / preset typography refinement as separate PRs。
8. Schedule Calendar Google Calendar integration or server sync after account foundation policy is stable。

## Next Session Prompt

```text
D:/V_streamer_tools で作業してください。

目的:
Kuro Live Comment Translator の初回 PR として、YouTube 向け read-only broadcaster dock の各端末 mock を `/imagegen` で作成し、確認後に承認 mock を UI shell として再現してください。

前提:
- main 直作業は禁止です。
- まず `git fetch origin --prune` を実行してください。
- AGENTS.md と task.md を確認してください。
- seed document は `C:/Users/taka/Downloads/COMMENT_TRANSLATION_TOOL_PLAN.md`。
- 関連 idea docs:
  - `D:/V_streamer_tools/materials/ideas/15_最新技術活用ツール/多言語対応ライブ翻訳オーバーレイ_企画書.md`
  - `D:/V_streamer_tools/materials/ideas/15_最新技術活用ツール/リアルタイムAI音声翻訳オーバーレイ.md`
- 初回 platform は YouTube。
- 初回 PR は mock-first。各端末 mock 作成 -> user 確認 -> UI shell 再現まで。
- 翻訳 API の実接続は初回 PR では行わない。fixtures / MockTranslationProvider 相当だけを使う。
- secret / service_role key / private credential は要求・表示・保存しない。
- 既存 storage key / payload / IndexedDB / localStorage key / Supabase schema / migration / RLS policy / handoff payload は変更しない。

推奨 branch:
- `codex/comment-translator-mock-foundation`

推奨 worktree:
- `D:/V_streamer_tools/.worktrees/comment-translator-mock-foundation`

scope:
- OBS Browser Dock / narrow viewport を主対象に、`390 / 820 / 1024 / 1280 / 1366px` の mock を `/imagegen` で作成する。
- user 確認後、既存 tools routing / card / layout pattern に沿って comment translator の UI shell を追加する。
- YouTube first と分かる setup state、接続 mock、live comment list、original / translated text、language label、skip reason、cache / quota preview、empty state を fixture で表現する。
- UI は landing page ではなく、最初の画面から usable tool surface にする。
- 翻訳は mock provider / fixture のみ。実 API call、API key、provider secret、server action、quota DB write は入れない。
- comment translator mock foundation contract を追加または既存 contract に追加する。

Out of scope:
- YouTube OAuth、Google API、Live Chat polling、owner verification の実装。
- OpenAI / Google / DeepL / Gemini 等の実翻訳 API 呼び出し。
- Stripe checkout / billing、server-authoritative quota、paid plan enforcement。
- GA4 実装、cookie consent banner。
- Supabase schema / migration / RLS policy 変更。
- 既存ツールの保存 payload / IndexedDB / localStorage key 変更。
- コメント返信生成、自動投稿、viewer overlay、OBS plugin、ASR / 音声翻訳。

検証:
- new/updated comment translator mock foundation contract
- tool portal entry / route contract if a new route is added
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `git diff --check`
- `/tools` and new comment translator route を `390 / 820 / 1024 / 1280 / 1366px` で確認し、mock / UI が本文と重ならず、左サイドパネルに干渉しないことを task.md に残す。

完了時:
- `task.md` に実装内容、検証結果、幅別確認結果、未確認範囲、残リスクを記録してください。
- 問題なければ commit / push / draft PR 作成まで進めてください。
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
