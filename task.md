# task.md

このファイルは現在の運用タスクだけを置く。完了済みの詳細ログ、比較メモ、長い経緯は PR body か `docs/archive` に寄せる。

## Current Premises

- 作業は `main` 直ではなく feature branch / worktree で行う。
- 作業前に `git fetch origin --prune`、`AGENTS.md`、このファイルを確認する。
- 意味のある実装後は、このファイルに実装内容、検証、未確認範囲、残リスク、必要な幅別確認を残す。
- UI 変更時の確認幅は `390 / 820 / 1024 / 1280 / 1366px` を基本にする。
- 通常の表示確認と幅別確認では Codex app の in-app browser を優先する。繰り返し操作や機械的な console / canvas 確認は Playwright、原因調査は Chrome DevTools MCP に切り替える。
- URL 設計、大規模 i18n framework、保存 schema / IndexedDB / localStorage 既存 key / handoff payload、外部投稿連携は、個別タスクで明示されない限り変更しない。
- 1 feature / 1 fix / 1 cleanup を 1 branch / 1 PR に閉じる。公開版の緊急修正と次期機能追加は混ぜない。
- Task 28 main promotion 後の production evidence、UI調整、Task 29 public launch gate work は、release owner が別途 preview branch continuation を指定しない限り latest `origin/main` から feature branch を切る。
- YouTube OAuth integration series は `codex/comment-translator-youtube-oauth-integration` を integration base とし、各 task PR は `main` ではなく integration branch に向ける。
- secret / service_role key / private credential は要求・表示・保存しない。
- OAuth access token / refresh token / authorization code value は client component、fixture、docs、PR body、localStorage、IndexedDB、sessionStorage に出さない。
- owner user id value / provider channel id value / service_role key value は表示・要求・保存しない。必要な場合も reference-only / existence-only / sanitized metadata-only に閉じる。
- provider target metadata / liveChatId は operator-local env / server-only boundary で消費するだけにし、output / docs / PR body / browser storage / handoff payload に出さない。

## Mock-only Notes

- Future tool mock catalog PR: `docs/mockups/future-tools/*` に 5候補 x 3 viewport の imagegen mock を追加し、`docs/future/FUTURE_TOOL_MOCK_CATALOG.md` に比較表と推奨次候補を記録する。mock-only / docs-only で、Next route、React/CSS、storage/schema/auth/billing/quota、OAuth/API、OBS連携、動画処理、既存 tool behavior は未着手。
- lint / build / width check は、実 UI / route / component / CSS / runtime 変更がないため不要。確認は画像 15 files の存在、README / catalog の filename 一致、`git diff --check`、`git status --short` に閉じる。

## Active Priorities

1. Kuro Live Comment Translator public release roadmap
   - status: preview runtime-smoke-to-operator-UI chain is complete through Task 7, Public Release Roadmap Task 1-15 are merged, Pre-Main Launch Hardening Roadmap Task 17 PR #420 through Task 26 PR #429 are merged, Task 27 completion PR #434 is merged, and Task 28 readiness/env/exact-preflight/main-promotion/production-evidence cleanup PRs through PR #440 are merged to `main`.
   - current PR scope: Task 3 YouTube OAuth connect/callback implementation, no live connect execution. This PR targets `codex/comment-translator-youtube-oauth-integration`; it adds server-only OAuth URL construction, state/callback validation, sanitized redirects, and fail-closed disabled/env-missing behavior without token exchange, credential persistence, provider execution, remote schema, deployment, production access, or public launch gate behavior.
   - integration branch: `codex/comment-translator-youtube-oauth-integration`, created from latest `origin/main` after confirming PR #440 merge commit `ee2e82e8a5462d2c0d7c10fdff773878c6a9c06c` is contained in `origin/main`.
   - current feature branch: `codex/comment-translator-youtube-oauth-connect-callback-implementation`, targeting `codex/comment-translator-youtube-oauth-integration`.
   - final goal: all tasks in `YouTube OAuth Integration Roadmap` are completed as 1 task / 1 PR on the integration branch, then the integration branch is promoted to `main` by a separate approval-gated promotion PR. Until then, do not merge OAuth integration work directly to `main`.
   - canonical public requirements: `docs/active/COMMENT_TRANSLATOR_PUBLIC_RELEASE_REQUIREMENTS.md`.
   - current env readiness doc: `docs/active/COMMENT_TRANSLATOR_PRODUCTION_ENV_READINESS.md`.
   - current evidence doc: `docs/active/COMMENT_TRANSLATOR_PRIVATE_GATED_PRODUCTION_SMOKE_EVIDENCE.md`.
   - archived planning docs: `docs/archive/COMMENT_TRANSLATOR_PRIVATE_GATED_MAIN_PROMOTION_READINESS.md` and `docs/archive/COMMENT_TRANSLATOR_PRIVATE_GATED_MAIN_PROMOTION_EXACT_PREFLIGHT.md`.
   - merge/deploy evidence: PR #439 is merged to `main` with merge commit `e8508f59e3dbfa3fa0b61dd52e8346f1d1ef0bda`; PR #440 is merged to `main` with merge commit `ee2e82e8a5462d2c0d7c10fdff773878c6a9c06c`, and that commit is contained in `origin/main`.
   - production route/API evidence: custom domain and workers.dev route checks passed for `/tools/comment-translator/`, account redirects, legal routes, and private-launch negative API checks with sanitized labels only.
   - allowed-tester evidence: authenticated browser read-only checks showed private-launch element absent for tool, integrations, and billing surfaces; account/plan surfaces rendered with console error count `0` and no horizontal overflow.
   - Task 28 completion criteria: partially met. Main promotion, production route smoke, private-launch negative checks, and allowed-tester account/plan rendering evidence are recorded; allowed-tester session start smoke was not run.
   - current OAuth blockers: `app/account/actions.ts` connect/reconnect now construct implementation-ready Google OAuth authorization redirects through a server-only boundary when env references and private-launch/auth gates are ready. `/tools/comment-translator` still uses the fixed preview credential reference and trusted-adapter-not-wired metadata; OAuth token exchange, credential creation, and trusted token-store connection remain Task 4+ incomplete.
   - unchanged in this branch: no UI/CSS/layout, SQL migration file, RLS policy, remote Supabase migration apply, remote mutation, remote alert/dashboard mutation, Stripe live-mode action, Product/Price creation, Checkout execution, Customer Portal redirect, webhook registration, billing setting mutation, manual Cloudflare upload/deploy command, client-readable browser storage expansion, handoff payload expansion, raw comment logging, credential value exposure, private provider target value exposure, quota write, durable persistence, provider target lookup, liveChatId lookup, authorization code exchange, token persistence, translation provider API execution, Google OAuth live connect execution, YouTube OAuth live connect execution, or live/provider execution is added or run.
   - verification for this branch: `node scripts/comment-translator-youtube-oauth-connect-callback-implementation-contract.mjs`, `node scripts/comment-translator-youtube-oauth-connect-callback-readiness-contract.mjs`, changed-files no-secret scan, `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `git diff --check` passed locally. `npm ci --prefer-offline` was run first in the fresh worktree because dependencies were absent.
   - width checks skipped for Task 2: docs/contract-only; no UI, rendered text, CSS, route behavior, browser storage, or visible layout change.
   - width checks skipped for Task 3: server-only route/action/runtime change only; no client component, rendered text, CSS, visible layout, or browser-readable storage change.
   - public-release capable: no. YouTube OAuth production connection, allowed-tester session start smoke, Task 29 public launch gate flip, Stripe live-mode actions, remote mutation/schema migration, provider target lookup, liveChatId lookup, translation provider API execution, and live/provider execution remain separately gated.
   - next safe action: after Task 3 PR merges into `codex/comment-translator-youtube-oauth-integration`, start Task 4 server-only credential persistence wiring in a fresh worktree / feature branch. Do not run Google OAuth live connect, YouTube OAuth live connect, authorization code exchange, token persistence, provider target lookup, liveChatId lookup, session start smoke, deploy/upload, remote mutation, remote schema migration, Stripe live-mode action, Customer Portal redirect, webhook registration, translation provider API execution, or live/provider execution without same-thread ready preflight, sanitized output review, and explicit approval.

## YouTube OAuth Integration Roadmap

Use one Codex thread, one feature branch, and one PR per task. Each task branch targets `codex/comment-translator-youtube-oauth-integration`. Do not target `main` until all integration-branch tasks are complete and a separate promotion PR is explicitly approved. Do not run Google OAuth live connect, provider target lookup, liveChatId lookup, session start smoke, translation provider API execution, live/provider execution, deploy/upload, remote mutation/schema migration, Stripe live-mode action, billing setting mutation, Customer Portal redirect, or webhook registration without same-thread ready preflight, sanitized output review, and explicit in-thread approval.

1. OAuth integration planning / task board refresh
   - Goal: make `task.md` the source of truth for the YouTube OAuth integration branch.
   - Scope: docs/task-board only. Create/confirm the integration branch from latest `origin/main`, split OAuth integration into 1 task / 1 PR, update handoff rules, and keep public launch gate closed.
   - Completion criteria: PR #440 merge gate verified, integration branch named, feature branch named, tasks listed with scopes/gates/verification, target branch policy documented, next-session prompt updated, width-check skip reason recorded.
   - Verification: targeted markdown/content inspection, changed-files no-secret scan, `git diff --check`.
   - Status: complete in current planning PR. No OAuth execution, provider lookup, session smoke, deploy/upload, remote mutation, remote schema migration, Stripe action, or main promotion was run.

2. YouTube OAuth connect/callback readiness and exact gate contract
   - Goal: define the exact server-only OAuth connect/callback contract before implementation.
   - Scope: callback route/action shape, state/CSRF/session ownership rules, redirect allowlist, env reference names, sanitized error states, rollback/disable gate, and exact no-live-connect execution boundary.
   - Completion criteria: contract captures allowed request/response metadata, forbidden output list, operator preflight requirements, and the fact that this task does not contact Google OAuth.
   - Verification: focused readiness contract if added, docs/contract inspection, changed-files no-secret scan, `git diff --check`.
   - Status: complete in current Task 2 PR via `docs/active/COMMENT_TRANSLATOR_YOUTUBE_OAUTH_CONNECT_CALLBACK_READINESS.md` and `scripts/comment-translator-youtube-oauth-connect-callback-readiness-contract.mjs`. The contract captures allowed connect/callback request and response metadata, state/CSRF/session ownership, redirect allowlist, env reference names, sanitized error states, rollback/disable gate, forbidden output list, operator preflight requirements, and exact no-live-connect execution boundary. Google OAuth live connect execution, YouTube OAuth live connect execution, authorization code exchange, token persistence, provider target lookup, liveChatId lookup, session start smoke, deploy/upload, remote mutation, remote schema migration, Stripe live-mode action, Customer Portal redirect, webhook registration, translation provider API execution, and live/provider execution were not run.

3. YouTube OAuth connect/callback implementation, no live connect execution
   - Goal: replace prepared-only connect/reconnect redirects with real application routes/actions that can start and complete OAuth when separately approved by a user action.
   - Scope: account connect/reconnect server actions, OAuth URL construction using server-only env references, callback validation, sanitized success/failure redirects, and disabled/fail-closed behavior when env references are absent.
   - Completion criteria: no token, authorization code, owner user id, provider channel id, liveChatId, Authorization header, or provider target metadata reaches client components, docs, fixtures, browser storage, logs, PR body, or handoff payload; live Google OAuth connect is not executed in this task.
   - Verification: focused route/action contracts, lint, typecheck, build, changed-files no-secret scan, `git diff --check`; width checks only if visible UI changes.
   - Status: complete in current Task 3 PR via `lib/comment-translator-youtube-oauth-connect-callback.ts`, `/api/comment-translator/youtube/oauth/callback`, account connect/reconnect action wiring, and `scripts/comment-translator-youtube-oauth-connect-callback-implementation-contract.mjs`. Connect/reconnect now fail closed when disabled/env references are absent, otherwise construct a Google OAuth authorization URL through a server-only helper with HttpOnly state binding. Callback validates sanitized error/state/code-presence metadata and routes valid callbacks to `youtube-oauth-token-store-blocked` until Task 4 implements token exchange/persistence. Google OAuth live connect execution, YouTube OAuth live connect execution, authorization code exchange, token persistence, credential reference creation, provider target lookup, liveChatId lookup, session start smoke, deploy/upload, remote mutation, remote schema migration, Stripe live-mode action, Customer Portal redirect, webhook registration, translation provider API execution, and live/provider execution were not run.

4. Server-only credential persistence wiring to Supabase token store
   - Goal: persist OAuth callback token material through the trusted server-only token-store boundary without exposing token values.
   - Scope: callback-to-token-store adapter, credential reference creation, encryption/key reference handling, owner authorization, idempotent reconnect semantics, sanitized persistence errors, and emergency disable behavior through `YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED`.
   - Completion criteria: token values and authorization code values remain server-only; docs and tests use reference labels or synthetic placeholders only; no remote mutation/schema migration is run unless separately approved.
   - Verification: focused server contracts/tests, lint, typecheck, build, changed-files no-secret scan, `git diff --check`.

5. Account integrations status wiring from trusted credential status
   - Goal: show real sanitized YouTube connection status in `/account/integrations`.
   - Scope: server actions/status reads from trusted credential status, connected/reconnect-required/disconnected/error states, safe disconnect/reconnect affordances, and copy alignment.
   - Completion criteria: UI never displays token values, owner user id values, provider channel id values, liveChatId values, Authorization header values, provider target metadata values, or browser storage payloads; no background monitoring starts from connection alone.
   - Verification: UI/action contracts, lint, typecheck, build, changed-files no-secret scan, `git diff --check`, width checks at `390 / 820 / 1024 / 1280 / 1366px` if visible output changes.

6. Tool credential source wiring away from fixed preview credential reference
   - Goal: make `/tools/comment-translator` use the trusted connected credential status/reference instead of the fixed preview credential reference.
   - Scope: server-only credential resolution for session readiness, start-blocked states, reconnect guidance, fail-closed behavior, and preservation of the trusted adapter boundary.
   - Completion criteria: fixed preview credential references and trusted-adapter-not-wired metadata are removed from active tool readiness paths; token/provider target/liveChatId values stay server-only; no provider target lookup or liveChatId lookup is run.
   - Verification: focused tool/session readiness contracts, lint, typecheck, build, changed-files no-secret scan, `git diff --check`, width checks if visible state changes.

7. Allowed-tester connection smoke readiness / sanitized evidence
   - Goal: prepare and, only with explicit approval, collect sanitized evidence that an allowed tester can complete the account connection flow.
   - Scope: exact same-thread preflight, sanitized output checklist, evidence template, negative checks, and allowed-tester account connection smoke readiness.
   - Completion criteria: if not approved, record blocker/readiness only; if approved, evidence records status labels only and excludes OAuth values, authorization code values, token values, private identifiers, provider target metadata, browser storage payloads, and handoff payloads.
   - Verification: readiness/evidence contract, changed-files no-secret scan, `git diff --check`; Google OAuth live connect only after same-thread ready preflight, sanitized output review, and exact explicit approval.

8. Allowed-tester session start smoke readiness / sanitized evidence
   - Goal: prepare and, only with explicit approval, verify that a connected allowed tester can start the translator session path with sanitized evidence.
   - Scope: session start preflight, provider/live execution boundary, stop behavior checklist, sanitized count/status evidence, and explicit blocker handling.
   - Completion criteria: if not approved, record blocker/readiness only; if approved, evidence records counts/status/stop reasons only and excludes liveChatId, provider target metadata, raw comments, token values, Authorization header values, browser storage payloads, and handoff payloads.
   - Verification: relevant smoke readiness contracts, changed-files no-secret scan, `git diff --check`; provider target lookup, liveChatId lookup, translation provider API execution, and live/provider execution only after same-thread ready preflight, sanitized output review, and exact explicit approval.

9. Integration branch final QA and promotion readiness to main
   - Goal: decide whether the integration branch is ready for a separate main promotion PR.
   - Scope: integration branch diff review, contracts, lint/typecheck/build, route/API negative checks, legal/copy/security boundary review, accepted risks, rollback notes, and public-release capability decision.
   - Completion criteria: all previous OAuth integration PRs are merged into the integration branch; required checks pass or have documented accepted risk; any approved smoke evidence is sanitized; promotion-to-main remains a separate PR and is not performed in this task unless explicitly requested afterward.
   - Verification: full integration QA checklist, no-secret scan, relevant contracts, lint, typecheck, build, `git diff --check`; width checks if visible UI changed during the integration series.

10. UI polish for private launch / integration / billing contrast
   - Goal: make private-launch, YouTube integration, and billing state contrast clearer without mixing UI polish into OAuth runtime tasks.
   - Scope: account/tool/billing visual and copy polish only after OAuth runtime wiring is stable, unless release owner explicitly pulls a small copy fix into a runtime task.
   - Completion criteria: UI states are understandable and responsive; no token/provider/private identifiers are exposed; OAuth runtime, live execution, Stripe live-mode actions, and deploy/upload stay out of this polish PR unless separately approved.
   - Verification: UI/action contracts as applicable, lint, typecheck, build, changed-files no-secret scan, `git diff --check`, width checks at `390 / 820 / 1024 / 1280 / 1366px`.

## Public Release Roadmap

Use one Codex thread, one feature branch, and one PR per task. Do not create a PR for a task unless that task's completion criteria are satisfied and verification has been attempted, except when the user explicitly approves a readiness/blocker PR while an external wait blocks execution.

1. Public readiness roadmap and task-board refresh
   - Goal: make `task.md` the public-release source of truth after the preview Task 7 endpoint.
   - Scope: docs/task-board only. No runtime, UI, provider, storage, quota, billing, or deployment changes.
   - Completion criteria: sources reviewed, old completed preview task list removed from active board, public-release tasks listed as 1 task / 1 PR, retention decision recorded, next-session prompt updated.
   - Verification: `git diff --check` and targeted markdown/content inspection.

2. Public requirements consolidation
   - Goal: consolidate the attached API/limits draft with the existing future notes into one canonical public-release requirements document.
   - Scope: docs only. Prefer `docs/active` for the current public-release requirements and move superseded drafts to `docs/archive` only when their content is fully represented elsewhere.
   - Completion criteria: canonical requirements cover free/per-session limits, paid-plan release path, start/stop semantics, stop conditions, provider quota policy, AI cost controls, source/target language policy, user usage display, admin metrics, sensitive-data boundaries, and initial-release exclusions.
   - Verification: `git diff --check` and targeted markdown/content inspection.
   - Fixed initial decisions: free limits, paid release path, YouTube-first scope, raw-text logging default, account integration route, and JA/EN target support are recorded in `Initial Release Decisions`.
   - Status: complete in current Task 2 PR via `docs/active/COMMENT_TRANSLATOR_PUBLIC_RELEASE_REQUIREMENTS.md`.

3. Public legal, privacy, and product-copy recheck
   - Goal: confirm existing legal pages and visible product copy are accurate for the public comment translator.
   - Scope: `/terms`, `/privacy`, `/legal/tokushoho`, footer links, `/tools/comment-translator` copy, and relevant account/integration copy.
   - Completion criteria: copy states the provider/API/AI translation behavior, usage limits, no background monitoring by connection alone, no token/client-storage exposure, data retention/logging policy, contact/support path, and paid-plan status if shown.
   - Verification: relevant route render checks, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `git diff --check`; width checks only if visible layout changes.
   - Status: complete in current Task 3 PR. Footer links required no code change after inspection.

4. Account integrations entry point
   - Goal: provide the operator-facing path for connecting and reviewing YouTube integration state outside the translator tool.
   - Scope: `/account/integrations` route or equivalent account settings entry, sanitized YouTube connection status, safe start/connect/reconnect/disconnect affordances.
   - Completion criteria: UI shows connection readiness without token, owner id, provider channel id, liveChatId, Authorization header, or provider target metadata; no background monitoring starts from connection alone.
   - Verification: dedicated UI/action contracts, lint, typecheck, build, `git diff --check`, and width checks at `390 / 820 / 1024 / 1280 / 1366px`.
   - Status: complete in current Task 4 PR. Runtime OAuth start, token renewal, disconnect/revocation, provider execution, quota, billing, storage, and handoff payload changes were intentionally not added.

5. Server-only token refresh and reconnect status
   - Goal: handle expired YouTube access tokens through server-only refresh/reconnect boundaries.
   - Scope: token refresh runtime, expired/refresh-failed/reconnect-required sanitized states, focused contract coverage.
   - Completion criteria: token values remain server-only; refresh failures do not leak provider body or credentials; client receives only sanitized status and reconnect guidance.
   - Verification: focused server contract/tests, lint, typecheck, build, `git diff --check`.
   - Status: complete in current Task 5 PR. Live/provider refresh execution, provider target lookup, quota, billing, browser storage, handoff payload, schema migration, and remote Supabase mutation were intentionally not added.

6. Server-only disconnect and revocation runtime
   - Goal: support user-initiated provider disconnect with safe server cleanup and revocation behavior.
   - Scope: revocation/disconnect route or action, server cleanup, sanitized status transitions, audit-safe event shape.
   - Completion criteria: no token values in client/docs/log output; repeated disconnect is idempotent or safely reported; revoked credentials cannot be used by translator start.
   - Verification: focused server contract/tests, lint, typecheck, build, `git diff --check`.
   - Status: complete in current Task 6 PR. Live/provider revocation calls, provider target lookup, quota, billing, browser storage, handoff payload, schema migration, and remote Supabase mutation were intentionally not added.

7. Translation session model and start/stop contract
   - Goal: define and implement the server-owned session lifecycle used when a user presses Start on `/tools/comment-translator`.
   - Scope: one active session per user, free-plan time caps, heartbeat/timeout semantics, explicit stop reasons, and session state returned to UI.
   - Completion criteria: API/provider/AI usage begins only after explicit Start; session stops on user stop, stream end, browser close/disconnect, missing heartbeat, auth failure, quota/budget stop, session limit, or terminal provider error.
   - Verification: focused session contracts/tests, lint, typecheck, build, `git diff --check`; UI width checks if visible controls change.
   - Status: complete in current Task 7 PR. Live/provider execution, provider target lookup, quota write, billing enforcement, browser storage, handoff payload, remote Supabase mutation, schema migration, and visible UI changes were intentionally not added.

8. Usage, quota, and budget ledger foundation
   - Goal: record usage needed to enforce public limits and protect shared service resources.
   - Scope: per-user daily/session minutes, plan entitlement references, provider request estimates, AI messages/chars/cost estimates, quota/budget stop events, admin-safe aggregate metrics.
   - Completion criteria: records are server-owned and sanitized; Free/Paid limits can be enforced from server-owned entitlement state; no provider identifiers or token values in client-readable payloads; no paid prioritization or provider-usage charging unless separately scoped.
   - Verification: schema/contract/tests as applicable, lint, typecheck, build, `git diff --check`.
   - Status: complete in current Task 8 PR. Ledger/admin/client output remains sanitized metadata only, and no durable schema, remote mutation, provider lookup, billing enforcement, paid prioritization, provider-usage charging, browser storage, handoff payload, or visible UI change was added.

9. Filtering and language policy runtime
   - Goal: reduce provider and AI cost before translation execution.
   - Scope: source language selection, target language selection, same-language prevention, skip emoji-only, URL-only, symbol-only, duplicate, too-short, target-language, unselected-source-language, and low-confidence comments; classify mixed comments by dominant language.
   - Completion criteria: initial source candidates are JA / EN / KR / CN; initial target candidates include JA / EN; source and target cannot be the same; Spanish and all-language auto mode remain out of initial release unless approved; cache/dedupe keys exclude token/cursor/provider identifiers.
   - Verification: focused unit/contracts for filter cases, lint, typecheck, build, `git diff --check`.

10. Bounded polling session runtime
   - Goal: run YouTube Live Chat polling as a bounded server session rather than a broad uncontrolled loop.
   - Scope: target lookup once at session start, `liveChatMessages.list`, `pollingIntervalMillis` compliance, minimum interval, empty-chat backoff, retry caps, terminal stop states.
   - Completion criteria: no polling faster than provider response; liveChatId stays server-only; no browser storage or handoff payload expansion; execution is gated by explicit operator approval when live/provider calls are involved.
   - Verification: contracts/tests for scheduling and stop behavior, lint, typecheck, build, `git diff --check`; live/provider smoke only after same-thread preflight, sanitized output review, and explicit approval.
   - Status: complete in current Task 10 PR via server-only deterministic bounded polling session runtime. Actual live/provider execution remains approval-gated and not run.

11. Translation provider execution integration
   - Goal: connect provider-safe live comments to actual translation execution under server-only controls.
   - Scope: batching, dedupe/cache, per-minute message caps, retry caps, provider error classes, and usage recording.
   - Completion criteria: only eligible comments are sent; raw provider credentials and YouTube identifiers are excluded; lower-priority comments are skipped under load instead of queued indefinitely.
   - Verification: focused provider/session contracts, lint, typecheck, build, `git diff --check`; live/provider execution only with explicit approval.
   - Status: complete in current Task 11 PR via server-only provider execution runtime. Actual live/provider execution remains approval-gated and not run.

12. Public operator UI start/stop and usage display
   - Goal: expose the public-session controls and status needed by stream operators.
   - Scope: Start/Stop, current elapsed time, daily used/remaining time, active/stopped state, stop reason, provider connection state, and reconnect guidance.
   - Completion criteria: UI never displays token, owner user id, provider channel id, liveChatId, service_role key, Authorization header, or provider target metadata; no client storage expansion; copy matches approved public requirements.
   - Verification: UI/action contracts, lint, typecheck, build, `git diff --check`, and `/tools/comment-translator` width checks at `390 / 820 / 1024 / 1280 / 1366px`.
   - Status: complete in current Task 12 PR via public operator session controls and sanitized usage/session display. Actual live/provider execution remains approval-gated and not run.

13. Admin and operational visibility
   - Goal: give the operator/admin enough sanitized visibility to run the public service safely.
   - Scope: active sessions, per-user minutes, YouTube/Twitch request estimates, AI messages/chars/cost, provider/translation errors, quota/budget stops, heartbeat timeouts.
   - Completion criteria: admin-visible data is aggregate or reference-only as appropriate; no credential values or provider target ids are exposed; export/log surfaces follow the same sanitization boundary.
   - Verification: focused contracts/tests, lint, typecheck, build, `git diff --check`; width checks if an admin UI is added.
   - Status: complete in current Task 13 PR via server-only sanitized aggregate/reference-only admin operational visibility. No admin UI, live/provider execution, browser storage, handoff payload, remote Supabase mutation, schema migration, billing enforcement, raw comment logging, credential value exposure, or provider target id exposure was added.

14. Public deployment and live-smoke runbook
   - Goal: define and prove the release execution steps without leaking sensitive values.
   - Scope: operator-local env checklist, safe command order, sanitized output review checklist, deployed URL smoke checklist, rollback notes.
   - Completion criteria: live/provider smoke commands are documented as approval-gated; runbook avoids token/id/header values; deployed smoke evidence is sanitized and reproducible.
   - Verification: docs inspection, relevant smoke scripts/contracts, `git diff --check`; actual live/provider execution only after same-thread preflight, sanitized output review, and explicit approval.
   - Status: complete in current Task 14 PR via active runbook and contract coverage. Actual deploy/upload, deployed URL smoke, and live/provider execution remain approval-gated and not run.

15. Stripe paid-plan integration
   - Goal: connect the already-proven public tool to paid-plan purchase/upgrade flow after the core public-release functionality is otherwise ready.
   - Scope: Stripe checkout/customer/subscription or payment-link flow, plan entitlement sync, upgrade/downgrade/cancel states, paid limit activation, account billing entry points, and safe webhook handling.
   - Completion criteria: Free plan remains permanently available; paid upgrade path is visible before/at public launch; paid entitlement changes server-owned limits without exposing Stripe secrets or provider credentials; failed/expired/canceled payment states degrade to safe Free or inactive paid status.
   - Verification: Stripe-focused contract/tests, webhook signature handling tests where applicable, lint, typecheck, build, `git diff --check`, and billing/account UI width checks if visible UI changes.
   - Status: complete in current Task 15 PR via server-only Stripe Billing/Checkout/Portal/webhook boundaries, account billing and translator paid-plan entry points, signed-webhook entitlement sync, and safe Free/inactive-paid degradation. Actual Stripe live-mode action, webhook registration, remote schema migration, deploy/upload, and live/provider execution remain approval-gated and not run.

16. Public release final QA and launch gate
   - Goal: determine that all roadmap tasks are complete and the tool can be made public.
   - Scope: final local/deployed verification, legal/copy review, no-secret scan, width checks, account/integration flow, session limits, start/stop, disconnect/reconnect, quota/budget stops, Stripe Free/Paid entitlement degradation, and rollback readiness.
   - Completion criteria: every prior roadmap task is merged; required checks pass or have documented accepted risk; deployed smoke is recorded with sanitized evidence if explicitly approved and run; `task.md` says public-release capable only when evidence actually supports it.
   - Verification: full release checklist, `npm run lint`, `npx tsc --noEmit`, `npm run build`, relevant contracts/tests, `git diff --check`, deployed route checks, and width checks at `390 / 820 / 1024 / 1280 / 1366px`.
   - Status: local final QA, failed existing deployed URL smoke, successful Cloudflare version upload preview URL, and approved narrow preview URL smoke recorded in current Task 16 branch. public-release capable: no. existing deployed URL smoke: failed with required deployed routes returning 404. preview URL smoke: passed for preview-only narrow scope, including Chrome authenticated account integration and billing rendering after operator browser-side authentication. live/provider smoke: not run. Stripe live-mode action: not run. Final QA record: `docs/active/COMMENT_TRANSLATOR_PUBLIC_RELEASE_FINAL_QA.md`.

## Pre-Main Launch Hardening Roadmap

Use one Codex thread, one feature branch, and one PR per task. These tasks are required before main promotion unless the release owner explicitly accepts the risk in writing. Keep `public-release capable: no` until a private-gated production URL passes the required smoke evidence.

17. Private launch access gate
   - Goal: allow main/production deployment without opening Comment Translator to general users.
   - Scope: server-side launch gate for `/tools/comment-translator`, account entry points, and comment-translator API/server actions; allowlist/tester policy; disabled or coming-soon public UI state.
   - Completion criteria: non-allowed users cannot start sessions or reach provider/billing-affecting actions by direct URL/API call; allowed testers can access the existing preview flow; no secrets or private identifiers are exposed.
   - Verification: focused access-gate contracts, unauthenticated/unauthorized route checks, lint, typecheck, build, `git diff --check`, width checks if visible UI changes.
   - Status: complete in current Task 17 PR. Non-allowed users receive disabled/coming-soon UI and 403 sanitized API responses; allowed testers are controlled by server-only SHA-256 owner-user-id hash allowlist. No live/provider execution, Stripe live-mode action, deploy/upload, remote mutation, provider target lookup, browser storage expansion, or handoff payload change was added.

18. Operator UX readiness polish
   - Goal: make the launch-blocking account and plan states obvious before live testing.
   - Scope: `/tools/comment-translator` CTA to `/account/integrations` when YouTube is not connected, clearer Free/Paid plan display, disabled/start-blocked states, reconnect guidance, and billing/account entry copy.
   - Completion criteria: users can understand why Start is unavailable and where to fix it; plan state is visible without exposing billing secrets or provider metadata; UI remains responsive at `390 / 820 / 1024 / 1280 / 1366px`.
   - Verification: UI/action contracts, route render checks, lint, typecheck, build, `git diff --check`, width checks.
   - Status: complete in current Task 18 PR. Added approved mock and implemented Free / Kuro Stream Kit Pro monthly/yearly comparison copy, Start blocked guidance, `/account/integrations` CTA, disabled Start on unavailable YouTube credential readiness, and account/billing/integrations entry copy. Actual monthly/yearly Stripe Price/Checkout, live/provider execution, provider target lookup, deploy/upload, remote mutation, browser storage expansion, and handoff payload changes were not added or run.

19. Translation provider and cost policy finalization
   - Goal: choose the public provider policy before live/provider smoke and paid launch.
   - Scope: compare DeepL, Azure Translator, OpenAI mini, Gemini Flash/Lite, and Cloudflare Workers AI for cost, quality, privacy/data-use terms, supported JA/EN/KR/CN to JA/EN pairs, latency, fallback behavior, deployment fit, and monthly budget controls.
   - Completion criteria: provider policy is recorded without secrets; initial recommendation covers Free/Paid provider selection, fallback on cap/error, budget stop thresholds, and provider-specific environment names only.
   - Verification: docs/contract inspection, provider policy contract, no-secret scan, `git diff --check`. No live provider calls unless separately approved.
   - Status: complete in current Task 19 PR via `docs/active/COMMENT_TRANSLATOR_PROVIDER_COST_POLICY.md` and `scripts/comment-translator-provider-cost-policy-contract.mjs`. Free plan primary is Azure Translator, Paid plan primary is OpenAI mini, Azure is the paid deterministic fallback, DeepL remains optional quality/comparison after account pricing confirmation, and Gemini Flash/Lite plus Cloudflare Workers AI remain comparison-only for the initial launch. No live provider calls were run.

20. Translation provider implementation alignment
   - Goal: align runtime provider implementation with the chosen provider policy.
   - Scope: add or adjust provider adapters, provider selection by entitlement, fallback behavior, strict output parsing for LLM providers if used, and usage/cost accounting.
   - Completion criteria: Free/Paid provider routing is server-owned; fallback is explicit and auditable; skipped comments are not sent; raw comments and provider identifiers are not logged or exposed.
   - Verification: focused provider execution contracts/tests, lint, typecheck, build, `git diff --check`; live provider smoke only after explicit approval.
   - Status: complete in current Task 20 PR via server-only Azure/OpenAI mini provider policy runtime, entitlement-owned routing, paid recoverable fallback audit counts, strict OpenAI JSON output parsing, sanitized usage/cost estimates, and provider execution contracts. Actual live provider calls remain approval-gated and were not run.

21. Stripe live readiness and billing operations
   - Goal: prepare billing for private-gated production without mutating live settings unexpectedly.
   - Scope: Stripe Product/Price/Checkout/Portal/webhook readiness checklist, signed webhook entitlement evidence, failed/canceled/expired state review, and safe rollback notes.
   - Completion criteria: dashboard/live-mode actions are either not run and recorded as blockers, or run only after explicit same-thread approval with sanitized evidence; no Stripe secret or webhook signing secret values are displayed or stored.
   - Verification: Stripe contracts/tests, webhook signature tests, billing route checks, lint, typecheck, build, `git diff --check`; live-mode actions only after explicit approval.
   - Status: complete in current Task 21 PR via server-only Stripe live readiness runtime, active readiness checklist, signed-webhook entitlement evidence review, failed/canceled/expired safe-degradation review, and rollback notes. Stripe Product/Price creation, Checkout execution, Customer Portal redirect, webhook registration, billing setting mutation, live-mode action, deploy/upload, remote mutation, and live/provider execution remain approval-gated and were not run.

22. Abuse protection and rate-limit hardening
   - Goal: prevent public abuse, accidental cost spikes, and repeated session/API attempts before main promotion.
   - Scope: per-user session/action limits, unauthenticated and unauthorized request throttling, coarse IP/request protection where appropriate, Workers Rate Limiting or equivalent edge/app-side controls, and provider/billing route abuse cases.
   - Completion criteria: repeated Start/session/API attempts are bounded; non-allowed users cannot bypass private launch gate through repeated direct calls; cost-affecting provider/billing paths fail closed or degrade safely under abuse.
   - Verification: focused rate-limit/abuse contracts, route/API negative checks, lint, typecheck, build, `git diff --check`.
   - Status: complete in current Task 22 PR via server-only app-side abuse/rate-limit guard, route/action/API negative checks, private-launch denial throttling, and provider/billing fail-closed behavior. Durable/distributed enforcement remains a later persistence/monitoring/deployment concern.

23. Durable persistence and schema migration readiness
   - Goal: decide what must be durable before public operation and keep remote schema changes approval-gated.
   - Scope: usage ledger durability, session history, entitlement persistence, admin aggregates, rollback plan, migration ordering, and in-memory fallback boundaries.
   - Completion criteria: durable-vs-in-memory decisions are recorded; any Supabase/schema migration is separated behind explicit approval; public launch does not depend on undocumented in-memory-only state for required enforcement.
   - Verification: docs/contracts, no-secret scan, `git diff --check`; remote schema migration only after explicit approval.
   - Status: complete in current Task 23 PR via active durable persistence readiness doc, server-only readiness runtime, and deterministic contract coverage. Remote Supabase migration apply readiness is not-applied-readiness-only; no SQL migration, RLS policy, remote mutation, browser storage expansion, handoff payload expansion, or UI change was added.

24. Monitoring, alerting, and incident response readiness
   - Goal: make cost, quota, billing, and runtime failures observable before public exposure.
   - Scope: provider cost/quota alerts, YouTube quota stop counts, translation error classes, Stripe webhook failure visibility, session failure/timeout counts, rollback trigger notes, and support escalation path.
   - Completion criteria: operators can detect provider-cost spikes, quota stops, webhook failures, and session failures without exposing secrets or raw comments; incident response and rollback notes are recorded.
   - Verification: monitoring contract/docs inspection, sanitized log/output review where available, no-secret scan, `git diff --check`.
   - Status: complete in current Task 24 PR via server-only monitoring/incident readiness runtime, active readiness doc, and deterministic contract coverage. Remote alert/dashboard mutation, live/provider execution, Stripe live-mode action, webhook registration, deploy/upload, browser storage expansion, handoff payload expansion, raw comment logging, private provider target output, and UI changes were intentionally not added or run.

25. Provider terms, privacy, and legal copy refresh
   - Goal: align public legal/copy surfaces with the final translation provider policy.
   - Scope: `/terms`, `/privacy`, `/legal/tokushoho`, `/tools/comment-translator`, `/account/integrations`, `/account/billing`, provider data-use/retention/training disclosures, support/contact copy, and paid-plan wording.
   - Completion criteria: selected providers and fallback behavior are accurately described; no unselected provider is overclaimed as production; user-visible copy explains AI/provider processing without exposing sensitive metadata.
   - Verification: route render checks, legal/copy contract, no-secret scan, lint, typecheck, build, `git diff --check`; width checks if visible layout changes.
   - Status: complete in current Task 25 PR via provider legal/copy refresh across legal, translator, integrations, billing, private-launch copy, active evidence doc, and deterministic contract coverage. Live/provider execution, deploy/upload, remote mutation, Stripe live-mode action, billing setting mutation, remote schema migration, Supabase migration apply, browser storage expansion, handoff payload expansion, provider routing runtime change, and sensitive metadata exposure were intentionally not added or run.

26. Security and privacy final review
   - Goal: verify public-launch sensitive boundaries after access, UX, provider, and billing changes.
   - Scope: route/API authorization, token/credential boundaries, browser storage, logs/output, docs/PR body safety, provider target metadata, liveChatId, quota/budget stop paths, and rollback readiness.
   - Completion criteria: no known high/critical launch blocker remains; accepted risks are documented; no secret/token/provider target values appear in client-readable surfaces or changed files.
   - Verification: focused security contracts, no-secret scan, route/API negative checks, lint, typecheck, build, `git diff --check`.
   - Status: complete in current Task 26 PR via server-only security/privacy final review evidence, active review doc, focused route/API negative checks, changed-files no-secret scan, and accepted residual-risk documentation. Public launch remains gated.

27. Private-gated live/provider smoke
   - Goal: prove the live comment intake and translation path with sanitized evidence before main promotion.
   - Scope: same-thread/operator-local ready preflight, explicit approval, bounded YouTube live comment polling, provider translation execution, stop behavior, quota/budget stop behavior, and sanitized evidence recording.
   - Completion criteria: no live/provider command runs before explicit approval; evidence records counts/status/stop reasons only; no liveChatId, provider identifiers, OAuth values, raw comments, or Authorization headers are stored or displayed.
   - Verification: runbook preflight, approved live/provider smoke commands, sanitized output review, focused contracts, `git diff --check`.
   - Status: complete in current Task 27 PR via approved private-gated live/provider smoke using Azure Translator, sanitized count-only evidence, server-only liveChatId target chaining, empty-polling blocker handling, provider skip/error reason counts, and focused stop/quota/budget contracts. Public launch remains gated.

28. Private-gated main promotion and production smoke
   - Goal: merge to main and verify the production/custom URL while general access remains blocked.
   - Scope: main merge gate, production deploy trigger/verification, production/custom route smoke, allowed-tester access, non-allowed-user denial, rollback readiness.
   - Completion criteria: production/custom deployed target serves the current app; private launch gate blocks general users; allowed testers can complete account/plan/session smoke; evidence is sanitized.
   - Verification: production route checks only after explicit approval, width checks, console checks, access-gate negative checks, rollback notes.
   - Status: partially complete. Readiness/blocker PR #435, production env readiness PR #436, exact preflight PR #437, and main promotion PR #439 are merged. Production/custom route smoke, private-launch negative API checks, and allowed-tester account/plan rendering evidence are recorded in `docs/active/COMMENT_TRANSLATOR_PRIVATE_GATED_PRODUCTION_SMOKE_EVIDENCE.md`. Allowed-tester session start smoke remains not run; provider/live execution, Stripe actions, remote mutation/schema migration, and public launch gate flip remain separately gated.

29. Public launch gate flip
   - Goal: make Comment Translator publicly available only after production smoke and accepted risks support it.
   - Scope: launch-gate setting change, final legal/copy check, final no-secret scan, public route smoke, monitoring/rollback readiness.
   - Completion criteria: `task.md` may say public-release capable only after all required evidence supports it; general users can access the intended public surface; rollback path is recorded.
   - Verification: final release checklist, public production smoke, no-secret scan, lint/typecheck/build if code changes, `git diff --check`.

## Explicit Initial-Release Exclusions

- Background provider monitoring after account connection.
- Automatic session start when a connected user begins streaming.
- Multiple concurrent streams per user.
- User-provided Google Cloud project or OAuth client.
- Manual channel ID entry as the default flow.
- Unlimited polling or broad polling loops.
- Provider usage charging and paid-priority scheduling.
- Translation of all languages by default.
- Client storage of tokens, provider identifiers, liveChatId, owner user id, provider channel id, service_role key, Authorization header, or provider target metadata.
- Delayed translation queue for skipped comments.
- Twitch runtime before YouTube public path is proven, unless separately approved.

## Initial Release Decisions

These decisions are fixed for the current public-release roadmap unless the user explicitly changes them in a later task:

- Free plan limits: initial target is `30 min/day/user`, `30 min/session`, `1 active session/user`, and `30 translated messages/min`.
- Paid plan: Free and Paid plan concepts, limits, and server-owned entitlement enforcement should be part of the public-release path. Stripe integration remains server-only and approval-gated until live readiness is explicitly approved.
- Source languages: source means translation input language. Initial selectable source languages are JA / EN / KR / CN.
- Target languages: target means translation output language. Initial selectable target languages include JA / EN because the tool portal itself supports JA / EN.
- Language selection rule: source and target cannot be the same. UI and server validation must reject same-language pairs.
- Provider scope: YouTube ships first; Twitch remains future unless explicitly pulled into public-release scope.
- Raw text logging: disabled by default; diagnostics are short-lived and sanitized.
- Account path: `/account/integrations` is the preferred provider settings entry; `/tools/comment-translator` should also show a direct integration CTA when YouTube is not connected.
- Translation provider policy: Free plan routes to Azure Translator primary; Paid plan routes to OpenAI mini primary with Azure Translator as recoverable-error fallback. DeepL remains optional quality/comparison after account pricing confirmation. Gemini Flash/Lite and Cloudflare Workers AI remain initial-launch comparison-only.

## Thread And PR Handoff Rules

- For the YouTube OAuth integration series, start each task in a fresh Codex thread and fresh worktree / feature branch from `origin/codex/comment-translator-youtube-oauth-integration` after confirming the previous task PR is merged into that integration branch.
- Keep each task PR targeting `codex/comment-translator-youtube-oauth-integration`. Do not target `main` until the integration branch final QA task explicitly supports a separate promotion PR and the release owner approves that promotion.
- At thread start, run `git fetch origin --prune`, read `AGENTS.md` and `task.md`, and verify the latest required merge commit is in the intended base branch.
- For each task, first identify whether the task is documentation, implementation, execution, or evidence-only.
- If the task is live/provider execution, confirm same-thread / operator-local same-command-process ready preflight, sanitized output review, and explicit in-thread approval before running provider-affecting commands.
- If the task is Google OAuth live connect execution, confirm same-thread ready preflight, sanitized output review, and explicit in-thread approval before clicking, redirecting, exchanging an authorization code, or recording evidence.
- If the task completes and verification passes, update `task.md`, commit, push, and create a draft PR targeting `codex/comment-translator-youtube-oauth-integration`.
- If an external wait blocks execution and the user explicitly approves a readiness/blocker PR, record the incomplete completion criteria and blocker evidence in `task.md`, verify, commit, push, and create a draft PR targeting `codex/comment-translator-youtube-oauth-integration`.
- If the task does not complete and no readiness/blocker PR is approved, do not commit, push, or create a PR. Reply with: `blocked reason`, `attempted command or inspected file`, `why completion criteria are not met`, `what approval/evidence/implementation is missing`, and `next safe action`.

## Verification Baseline

- Docs/task-board only:
  - `git diff --check`
  - targeted markdown/content inspection
- Runtime or code changes:
  - relevant contract script(s)
  - `npm run lint`
  - `npx tsc --noEmit`
  - `npm run build`
  - `git diff --check`
- UI changes:
  - relevant UI/action contract(s)
  - `/tools/comment-translator` width checks at `390 / 820 / 1024 / 1280 / 1366px`
- Live/provider execution:
  - same-thread / operator-local same-command-process ready preflight
  - sanitized output review
  - explicit in-thread approval
  - sanitized evidence only

## Contract Compatibility Anchors

- Keep `import "server-only";` on server-only translator / YouTube runtime boundaries.
- Keep provider requests input-source independent unless the current task explicitly scopes the bridge.
- Keep token values out of client components, docs, fixtures, PR bodies, browser storage, and command output.
- Treat credential status and provider target metadata as sanitized metadata only.
- Do not overclaim readiness-only or token-resolution-only evidence as live/provider execution.
- Do not add quota write, billing integration, remote Supabase mutation/migration, browser storage expansion, or handoff payload expansion unless the current roadmap task explicitly scopes it.

## Next Session Prompt

```text
D:/V_streamer_tools の Kuro Live Comment Translator public release roadmap を続けます。

目的:
- YouTube OAuth integration branch の次タスクを 1 task / 1 PR で進めてください。
- PR target は `codex/comment-translator-youtube-oauth-integration` です。
- `main` へはまだ結合しないでください。

重要:
- 最初に必ず `git fetch origin --prune` を実行してください。
- `AGENTS.md` と `task.md` を読んでください。
- root checkout / main では作業しないでください。
- 作業先は fresh worktree / feature branch にしてください。
- base は latest `origin/codex/comment-translator-youtube-oauth-integration` です。integration branch promotion task 以外では `main` を target にしないでください。
- secret / token / OAuth access token / refresh token / authorization code / owner user id value / provider channel id value / liveChatId value / service_role key value / Authorization header value / Stripe secret key / webhook signing secret は表示・要求・保存しないでください。
- provider target metadata や liveChatId は operator-local env / server-only boundary で消費するだけにし、output / docs / PR body / browser storage / handoff payload に出さないでください。
- session start smoke、deploy/upload、production/custom deployed smoke、live/provider execution、provider target lookup、liveChatId lookup、translation provider API execution、remote mutation、remote schema migration、Stripe live-mode action、billing setting mutation、Google OAuth live connect execution、YouTube OAuth live connect execution は、same-thread ready preflight、sanitized output review、explicit in-thread approval が揃うまで実行しないでください。
- This prompt is not approval for session start smoke, deploy/upload, production/custom URL smoke, Cloudflare production mutation, remote mutation, remote schema migration, Stripe live-mode action, billing setting mutation, Customer Portal redirect, webhook registration, provider target lookup, liveChatId lookup, translation provider API execution, live/provider execution, Google OAuth live connect execution, or YouTube OAuth live connect execution.

Merge gate:
- Previous YouTube OAuth integration task PR がある場合は、merge 済みであることを確認してください。
- Planning task の場合は、PR #440 `[codex] Record Task 28 production evidence cleanup` が merge 済みで、merge commit `ee2e82e8a5462d2c0d7c10fdff773878c6a9c06c` が `origin/main` に含まれることを確認してください。
- gh が使える場合はその PR の state / mergedAt / mergeCommit / baseRefName / headRefName / statusCheckRollup を確認してください。
- その merge commit が intended base branch に含まれることを Git で確認してください。認証 token の値は要求・表示しないでください。

現在地:
- Preview roadmap Task 1-7 は完了済み。Task 7 Operator UI flow まで merge 済みです。
- Public Release Roadmap Task 1-15 は完了済みです。
- Pre-Main Launch Hardening Roadmap Task 17 PR #420 through Task 26 PR #429 は merge 済みです。
- Task 27 completion PR #434 は merge 済みです。
- Task 27 completion PR #434 で approved Azure Translator live/provider smoke evidence が sanitized count-only で記録されました。
- Task 28 readiness/blocker PR #435、production env readiness PR #436、exact preflight PR #437、main promotion PR #439、production evidence cleanup PR #440 は merge 済みです。
- Task 28 production/custom route smoke、private-launch negative API checks、allowed-tester account/plan rendering evidence は `docs/active/COMMENT_TRANSLATOR_PRIVATE_GATED_PRODUCTION_SMOKE_EVIDENCE.md` に sanitized metadata only で記録済みです。
- Task 28 planning-only docs は `docs/archive/COMMENT_TRANSLATOR_PRIVATE_GATED_MAIN_PROMOTION_READINESS.md` と `docs/archive/COMMENT_TRANSLATOR_PRIVATE_GATED_MAIN_PROMOTION_EXACT_PREFLIGHT.md` に移動済みです。
- Production env inventory は `docs/active/COMMENT_TRANSLATOR_PRODUCTION_ENV_READINESS.md` に reference-name-only で残っています。secret 値や private id 値は記録されていません。
- YouTube連携はまだ本番導線に接続されていません。`app/account/actions.ts` の connect/reconnect/disconnect は prepared redirect のみで、Google OAuth へ飛びません。
- `/tools/comment-translator` は固定 preview credential reference と trusted-adapter-not-wired metadata を使う経路が残っています。
- `app/tools/comment-translator/actions.ts` には credential status / disconnect / start readiness の server action と Supabase trusted adapter 呼び出しがありますが、OAuth接続・credential作成導線は未完成です。
- `YOUTUBE_OAUTH_CREDENTIAL_RESOLUTION_DISABLED` が `1` または `true` の場合、credential resolution は無効化されます。
- Allowed-tester session start smoke、Stripe live-mode action、Customer Portal redirect、webhook registration、remote schema migration、remote mutation、live/provider execution、provider target lookup、liveChatId lookup、translation provider API execution、Google OAuth live connect execution、YouTube OAuth live connect execution は引き続き approval-gated で、この prompt は承認ではありません。
- `public-release capable: no` のままです。
- 最終ゴールは YouTube OAuth integration tasks を integration branch に積み、final QA の後に separate promotion PR で `main` へ昇格できる状態にすることです。

次にやること:
- Start the next incomplete task in `YouTube OAuth Integration Roadmap`.
- If the next task is implementation, keep live Google OAuth connect execution out of scope unless the roadmap task and release owner explicitly approve same-thread execution.
- If the next task is smoke/evidence readiness, present exact UI action/command boundaries first; record only sanitized status/count labels and do not record provider target metadata, liveChatId, token values, authorization code values, raw comments, browser storage payloads, or handoff payloads.
- remote schema migration / Supabase migration apply は、同一スレッドで明示承認・sanitized evidence review が揃うまで実行しないでください。
- Stripe live-mode actions、Customer Portal redirect、webhook registration、billing setting mutation、deploy/upload、remote mutation、live/provider execution は、同一スレッドで明示承認・sanitized evidence review が揃うまで実行しないでください。
- secret / token / provider credential / OAuth token / private identifier の値は要求・表示・保存しないでください。必要な env は reference 名だけを扱ってください。

Verification:
- task-specific focused contracts for the changed scope
- no-secret scan over changed files
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `git diff --check`
- width checks at `390 / 820 / 1024 / 1280 / 1366px` if visible UI changes; docs/contract-onlyなら省略理由を `task.md` に残してください。
- approved Google OAuth connect / provider lookup / session smoke / deploy / production smoke commands only if same-thread ready preflight + sanitized output review + exact-command explicit approval are complete in this thread.

Completion:
- Current OAuth integration task completion criteria を満たした場合のみ `task.md` 更新、commit、push、draft PR targeting `codex/comment-translator-youtube-oauth-integration` まで進めてください。
- gate 不足や実行 path 不足で completion criteria 未達なら、commit / push / PR はせず、blocker reason、inspected files/commands、missing evidence/implementation、next safe action を報告してください。
```

## Post-Public Candidates

- Advanced paid tiers, paid-priority scheduling, and provider-usage charging.
- Twitch runtime and EventSub/chat integration.
- `liveChatMessages.streamList` evaluation.
- Background monitoring and automatic session start.
- Multiple concurrent streams per user.
- Additional source languages and advanced mixed-language options.
- User-provided Google Cloud project / OAuth client support.
