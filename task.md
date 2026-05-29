# task.md

このファイルは現在の運用タスクだけを置く。完了済みの詳細ログ、比較メモ、長い経緯は PR 本文か `docs/archive` に寄せる。

## Current Premises

- 作業は `main` 直ではなく feature branch / worktree で行う。
- 意味のある実装後は、このファイルに実装内容、検証、必要な幅別確認を残す。
- UI 変更時の確認幅は `390 / 820 / 1024 / 1280 / 1366px` を基本にする。
- 通常の表示確認と幅別確認では Codex app の in-app browser を優先する。繰り返し操作や機械的な console / canvas 確認は Playwright、原因調査は Chrome DevTools MCP に切り替える。
- URL 設計、大規模 i18n framework、保存 schema / IndexedDB / localStorage 既存 key / handoff payload、外部投稿連携は、個別タスクで明示されない限り変更しない。
- 1 feature / 1 fix / 1 cleanup を 1 branch / 1 PR に閉じる。公開版の緊急修正と次期機能追加は混ぜない。
- 完了済みの account / preferences foundation、Supabase Auth first slice、Cloudflare Workers / OpenNext migration、Thumbnail Editor IRIAM 1:1 / material / font expansion の詳細は PR bodies と `docs/archive/TASK_HISTORY_2026-05.md` に寄せる。

## Active Priorities

1. Cloudflare production handoff after PR #234 main merge
   - status: user-managed dashboard handoff。
   - completed repo state:
     - PR #234 `codex/supabase-auth-first-slice` は `main` へ merge 済み。merge commit は `5d7dd09`。
     - post-merge Workers route smoke on `https://v-streamer-tools.kurodev-web-tools.workers.dev` passed:
       - `/`, `/tools`, `/tools/schedule-calendar`, `/tools/thumbnail-editor`, `/tools/sns-split-image-maker`, `/login`, `/signup`, `/reset-password` returned 200。
       - `/account` redirected to `/login/?next=%2Faccount` and returned 200。
       - `/account/security` redirected to `/login/?next=%2Faccount%2Fsecurity` and returned 200。
   - user-side Cloudflare checklist:
     - Move the production custom domain from the old Cloudflare Pages project to the Workers service `v-streamer-tools`。
     - If a Pages project remains connected to the same GitHub repo, either disable its production/custom-domain traffic or keep it only as a non-production legacy preview to avoid duplicate deploy signals。
     - Change any GitHub/Cloudflare deploy branch that was temporarily set to a confirmation branch back to `main` for production。
     - Keep Workers deploy command on the `--keep-vars` path so dashboard variables are preserved:
       - build: `npm run build:cloudflare`
       - deploy: `npx wrangler deploy --keep-vars`
     - Confirm dashboard variables for Workers production:
       - `NEXT_PUBLIC_SUPABASE_URL`
       - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
       - `NEXT_PUBLIC_SITE_URL` should match the final production origin after custom-domain migration。
       - `NEXT_PUBLIC_AUTH_REDIRECT_ORIGINS` should include only approved origins if used。
     - Do not add `SUPABASE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY` to browser-public variables。
   - final smoke after dashboard changes:
     - public routes: `/`, `/tools`, `/tools/schedule-calendar`, `/tools/thumbnail-editor`, `/tools/sns-split-image-maker`。
     - auth routes: `/login`, `/signup`, `/reset-password`, `/account`, `/account/security`。
     - account flow if safe credentials/session are available: login, account preference save, remote display settings apply, logout, protected route redirect。

2. Auth recovery-session hardening follow-up
   - hotfix status: trailing slash redirect loop fixed on `codex/auth-recovery-trailing-slash-hotfix`.
   - hotfix root cause:
     - Production normalized `/account/security` to `/account/security/`.
     - Recovery pending middleware allowed only exact `/account/security`, so `/account/security/` was treated as normal account access and redirected back to `/account/security?auth=recovery-pending`, causing `ERR_TOO_MANY_REDIRECTS`.
   - hotfix implementation:
     - Normalize account pathnames before the recovery pending middleware allowlist check.
     - Keep `/account/security` and `/account/security/` both allowed while recovery pending.
     - Keep `/account` and other account paths redirected back to `/account/security?auth=recovery-pending`.
     - Treat recovery pending as a separate account session state for shared navigation, so Portal sidebar/header do not expose the signed-in email or normal `/account` CTA while the reset is unfinished.
     - Show recovery pending navigation copy that points back to `/account/security` until the reset is completed.
   - hotfix verification completed:
     - `node scripts/auth-recovery-session-hardening-contract.mjs`
       - includes trailing slash guard coverage and recovery-pending navigation coverage.
     - `node scripts/auth-security-hardening-contract.mjs`
     - `node scripts/account-auth-public-readiness-contract.mjs`
     - `node scripts/supabase-auth-first-slice-contract.mjs`
     - `npm run lint`
     - `npx tsc --noEmit`
     - `npm run build`
     - `npm run build:cloudflare`
     - `git diff --check`
       - passed; Git reported LF-to-CRLF working-copy normalization warnings only.
     - Local dev redirect check with recovery pending cookie:
       - `/account/security/?auth=recovery-pending` no longer loops; without Supabase env/session it redirects to `/login/?next=%2Faccount%2Fsecurity`.
       - `/account/?auth=recovery-pending` redirects to `/account/security/?auth=recovery-pending` and then, in local no-session state, to login.
     - Type/build checks confirm `AccountSessionState.authStatus` now accepts `recovery-pending`.
   - hotfix UI verification:
     - Visible copy changed only in the recovery-pending account CTA; full width checks were not rerun because the change is limited to an existing sidebar/header CTA block.
   - hotfix residual risk:
     - Production recovery email link smoke should be repeated after deploy with a fresh reset email link.
   - status: implemented on `codex/auth-recovery-session-hardening`.
   - implementation summary:
     - `/auth/confirm?type=recovery` success is marked as recovery pending instead of normal `signed-in`.
     - recovery pending is held in a short-lived httpOnly cookie and is not stored in localStorage, IndexedDB, Supabase schema, migrations, or RLS.
     - recovery pending users are kept on `/account/security`; normal `/account` access redirects back to `/account/security?auth=recovery-pending`.
     - password update success from recovery pending signs out and redirects to `/login?auth=password-updated`.
     - normal signed-in password change shows a `currentPassword` field, passes it to Supabase `updateUser` as the local SDK's `current_password` payload, and returns to `/account?auth=password-updated`.
     - `/account` exposes a password change entry point to `/account/security`.
     - secret / service_role key は要求・表示・保存していない。
   - verification completed:
     - `node scripts/auth-recovery-session-hardening-contract.mjs`
     - `node scripts/auth-security-hardening-contract.mjs`
     - `node scripts/account-auth-public-readiness-contract.mjs`
     - `node scripts/supabase-auth-first-slice-contract.mjs`
     - `npm run build:cloudflare`
       - passed with existing warnings: OpenNext Windows compatibility, middleware convention deprecation, webpack cache serialization, Node `punycode` deprecation.
     - `npm run build`
       - passed with existing middleware convention deprecation warning.
     - `npm run lint`
     - `npx tsc --noEmit`
     - `git diff --check`
       - passed; Git reported LF-to-CRLF working-copy normalization warnings only.
   - UI verification completed:
     - DevTools composite check on `http://127.0.0.1:3000` for `/account`, `/account/security`, `/login` at `390 / 820 / 1024 / 1280 / 1366px`.
     - All 15 cases reported `overflowX=false`.
     - `/account` rendered account setup pending state and the new `セキュリティ` / `パスワード変更` entry point at all widths.
     - `/account/security` redirected to `/login/?next=%2Faccount%2Fsecurity` without a signed-in session at all widths.
     - `/login` rendered normally at all widths.
     - Evidence: `output/playwright/auth-recovery-session-hardening/devtools-width-results.json` and `output/playwright/auth-recovery-session-hardening/devtools-width-composite.png` are local ignored artifacts.
   - unverified scope / residual risk:
     - Signed-in `/account/security` current-password form and recovery pending password-reset form were not visually smoked with real credentials.
     - Production/custom domain password reset email link -> password update -> sign-out/login redirect smoke requires a real safe account session and was not run; credentials and secrets were not requested.
   - recommended branch / worktree:
     - branch: `codex/auth-recovery-session-hardening`
     - worktree: `D:/V_streamer_tools/.worktrees/auth-recovery-session-hardening`
     - base: `origin/main`
   - scope:
     - Treat `/auth/confirm?type=recovery` sessions as password-reset-only pending sessions, not normal account login.
     - While recovery is pending, keep the user on `/account/security`; block or sign out before allowing normal `/account` access.
     - After successful password update, sign out and redirect to `/login?auth=password-updated`.
     - Add an account-page password-change entry point that sends normal signed-in users to `/account/security`.
     - Add current-password UI for normal signed-in password changes and pass `currentPassword` to Supabase `updateUser`.
   - dashboard sequence:
     - Keep Supabase `Require current password when updating` OFF until the current-password UI is deployed.
     - After deploy and smoke, enable `Require current password when updating`.
   - out of scope:
     - Do not change Supabase schema / RLS / migrations / storage payloads.
     - Do not request, display, or store secret / service_role keys.
     - Do not add CAPTCHA, OAuth, billing, quota enforcement, or tool data sync in this PR.
   - verification target:
     - new/updated auth recovery hardening contract.
     - `node scripts/auth-security-hardening-contract.mjs`
     - `node scripts/account-auth-public-readiness-contract.mjs`
     - `node scripts/supabase-auth-first-slice-contract.mjs`
     - `npm run build:cloudflare`
     - `npm run build`
     - `npm run lint`
     - `npx tsc --noEmit`
     - `git diff --check`
     - width check for `/account` and `/account/security` at `390 / 820 / 1024 / 1280 / 1366px` if visible form layout changes.

3. Auth Turnstile CAPTCHA follow-up
   - recommended branch / worktree:
     - branch: `codex/auth-turnstile-captcha`
     - worktree: `D:/V_streamer_tools/.worktrees/auth-turnstile-captcha`
     - base: `origin/main`
   - scope:
     - Add a small Cloudflare Turnstile widget component for auth forms.
     - Pass the Turnstile token from `/signup`, `/login`, and `/reset-password` forms into the related Server Actions.
     - Forward the token to Supabase Auth through its CAPTCHA token option for sign-up, sign-in, and password reset.
     - Keep CAPTCHA optional when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is missing so local/dev and pre-dashboard states do not break existing auth forms.
     - Add or extend a contract script to assert token field wiring, secret boundary, and graceful missing-site-key behavior.
   - out of scope:
     - Do not enable Supabase CAPTCHA in Dashboard before the app is deployed with token forwarding.
     - Do not store or expose the Turnstile secret key in source, browser code, `NEXT_PUBLIC_*`, or docs.
     - Do not change Supabase schema / RLS / migrations / storage payloads.
     - Do not add OAuth, billing, quota enforcement, or broad auth UI redesign.
   - dashboard sequence after the PR is deployed:
     - Create Cloudflare Turnstile site key for the production domain and Workers preview domain if needed.
     - Add public site key as Workers production variable `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
     - Add Turnstile secret only in Supabase Auth CAPTCHA settings or the relevant secure dashboard field.
     - Enable Supabase Auth CAPTCHA.
     - Smoke `/signup`, `/login`, and `/reset-password`.
   - verification target:
     - new/updated Turnstile auth contract.
     - `node scripts/auth-security-hardening-contract.mjs`
     - `node scripts/account-auth-public-readiness-contract.mjs`
     - `node scripts/supabase-auth-first-slice-contract.mjs`
     - `npm run build:cloudflare`
     - `npm run build`
     - `npm run lint`
     - `npx tsc --noEmit`
     - `git diff --check`
     - width check for `/login`, `/signup`, `/reset-password` at `390 / 820 / 1024 / 1280 / 1366px` if visible form layout changes.

4. Account / monetization follow-ups
   - Password hardening dashboard settings:
     - `Confirm email` stays ON.
     - `Allow anonymous sign-ins` stays OFF.
     - `Allow manual linking` stays OFF unless a separate provider-linking design exists.
     - `Minimum password length` should be aligned to 8 because app validation already requires 8+ characters.
     - `Prevent use of leaked passwords` is recommended if plan availability allows it.
     - `Require current password when updating` stays OFF until the auth recovery-session hardening PR deploys current-password UI and flow coverage.
   - Stripe Billing / quota foundation:
     - Checkout Sessions, Customer Portal, webhooks, and server-authoritative quota remain a separate PR sequence.
     - `usage_quotas` remains owner-read only for browser clients; quota writes stay trusted-server-only.

5. Kuro Live Comment Translator planning
   - status: user foundation is now on `main`; design can be revisited after Cloudflare production handoff and Turnstile follow-up.
   - seed: `C:/Users/taka/Downloads/COMMENT_TRANSLATION_TOOL_PLAN.md`
   - recommended first scope:
     - OBS Browser Dock 前提の read-only MVP。
     - 1 platform から開始。
     - owner-only / OAuth / rate limit / quota / moderation を前提にする。
     - コメント翻訳、短い要約、用語集を中心にし、返信生成や自動投稿は初期 scope に入れない。
     - ログイン / user settings / paid plan 基盤の方針に合わせて、保存項目と制限設計をタスク開始時に見直す。

6. Local font loading
   - status: user account / preferences foundation 後の later scope。
   - direction:
     - 端末に入っている font を直接読む Local Font Access 系は、ログイン / user settings 基盤の後に扱う。
     - DB に保存する場合も、基本は font family / PostScript name / style / fallback / last-seen state などの選択情報に留める。
     - font file 本体の保存は、ユーザーが明示的に upload した場合だけ別途検討する。

## Recommended Roadmap

1. Cloudflare production handoff: custom domain to Workers, production branch back to `main`, route/auth smoke。
2. Auth recovery-session hardening: recovery link should not become a normal login before password update。
3. Password hardening dashboard alignment: enable current-password requirement after matching UI deploy, minimum length 8, leaked-password protection if available。
4. Auth Turnstile CAPTCHA: app token forwarding first, Dashboard CAPTCHA ON after deploy。
5. Preferences sync MVP: only after CAPTCHA / production handoff, and still limited to approved lightweight preferences。
6. Stripe Billing / quota foundation: Checkout Sessions, Customer Portal, webhook, server-authoritative quota。
7. Kuro Live Comment Translator planning。
8. Local font loading after user foundation。
9. Thumbnail Editor 9:16 preset / crop / text-image schema / preset typography refinement as separate PRs。
10. Schedule Calendar Google Calendar integration or server sync after account foundation policy is stable。

## Next Session Prompt

```text
D:/V_streamer_tools で作業してください。

目的:
password reset recovery link が通常ログイン扱いにならないよう、recovery session hardening を実装してください。

前提:
- main 直作業は禁止です。
- まず `git fetch origin --prune` を実行してください。
- AGENTS.md と task.md を確認してください。
- PR #234 Supabase Auth first slice は main merge 済み。
- PR #250 auth production flow polish は main merge 済み。
- Cloudflare production custom domain / branch handoff は user-managed dashboard 作業。
- Supabase reset password email template は `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery` 形式へ user 側で更新済み。
- Supabase Dashboard の `Require current password when updating` は、この PR が deploy されて current-password UI smoke ができてから ON にする。
- secret / service_role key は要求・表示・保存しない。
- 既存 storage key / payload / IndexedDB / Supabase schema / migration / RLS policy は変更しない。

推奨 branch:
- `codex/auth-recovery-session-hardening`

推奨 worktree:
- `D:/V_streamer_tools/.worktrees/auth-recovery-session-hardening`

scope:
- `/auth/confirm?type=recovery` で session を作ったら、通常ログインではなく recovery pending として扱う。
- recovery pending 中は `/account/security` 以外へ行こうとした場合、通常 `/account` へ入れず password reset flow へ戻す、または sign out して `/login` へ戻す。
- password update success 後は `signOut()` して `/login?auth=password-updated` へ戻す。
- `/account` に「パスワード変更」導線を追加し、通常 signed-in user は `/account/security` へ移動できるようにする。
- 通常 signed-in password change では current password field を出し、`updateUser` に `currentPassword` を渡す。
- recovery session 由来の password reset と通常 signed-in password change を UI / action 側で区別する。
- auth recovery hardening contract を追加または既存 contract に追加する。

Out of scope:
- Supabase Dashboard の `Require current password when updating` をこの PR 実装前に ON にすること。
- Supabase schema / migration / RLS policy 変更。
- CAPTCHA、OAuth、billing、quota enforcement、tool data sync。

検証:
- new/updated auth recovery hardening contract
- `node scripts/auth-security-hardening-contract.mjs`
- `node scripts/account-auth-public-readiness-contract.mjs`
- `node scripts/supabase-auth-first-slice-contract.mjs`
- `npm run build:cloudflare`
- `npm run build`
- `npm run lint`
- `npx tsc --noEmit`
- `git diff --check`
- UI を変えた場合は `/account`、`/account/security`、`/login` を `390 / 820 / 1024 / 1280 / 1366px` で確認し、結果を task.md に残す。
- 可能なら production/custom domain で password reset email link -> password update -> sign-out/login redirect を smoke する。credential / secret は要求しない。
```

## Backlog

- Thumbnail Editor:
  - 9:16 preset for YouTube Shorts / vertical streams。
  - crop 仕様。
  - text / image layer schema。
  - local font loading after user account / preferences foundation。
  - preset typography refinement。
- Account / monetization:
  - Cloudflare Turnstile CAPTCHA。
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
- New tools:
  - Kuro Live Comment Translator planning。

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
- `node scripts/account-auth-public-readiness-contract.mjs`
- `node scripts/workers-route-smoke-account-nav-contract.mjs`
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
