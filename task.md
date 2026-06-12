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
- secret / service_role key / private credential は要求・表示・保存しない。
- OAuth access token / refresh token / authorization code value は client component、fixture、docs、PR body、localStorage、IndexedDB、sessionStorage に出さない。
- owner user id value / provider channel id value / service_role key value は表示・要求・保存しない。必要な場合も reference-only / existence-only / sanitized metadata-only に閉じる。
- provider target metadata / liveChatId は operator-local env / server-only boundary で消費するだけにし、output / docs / PR body / browser storage / handoff payload に出さない。

## Active Priority

1. Kuro Live Comment Translator public release roadmap
   - status: preview runtime-smoke-to-operator-UI chain is complete through Task 7, Public Release Roadmap Task 1-15 are merged, Pre-Main Launch Hardening Roadmap Task 17 PR #420, Task 18 PR #421, and Task 19 PR #422 are merged. PR #422 merge commit `4fb136ffd100ece4c5e16c9750501d085fc2cc2e` is contained in `origin/codex/comment-translator-preview`. GitHub PR metadata was also checked: PR #422 is `MERGED`, base `codex/comment-translator-preview`, head `codex/comment-translator-provider-cost-policy-finalization-post-pr421`, merged at `2026-06-12T03:53:58Z`; check rollup was Cloudflare Pages `FAILURE`, treated as the known non-main Pages build posture rather than a fresh local regression by itself.
   - current PR scope: Pre-Main Launch Hardening Roadmap Task 20, Translation provider implementation alignment.
   - final goal: all tasks in `Public Release Roadmap` are completed, verified, merged, and any required deployed/live smoke evidence is recorded with sanitized output. At that point the comment translator is considered public-release capable.
   - canonical public requirements: `docs/active/COMMENT_TRANSLATOR_PUBLIC_RELEASE_REQUIREMENTS.md`.
   - prior task evidence retained for contracts: Task 16 local final QA, Cloudflare preview smoke, Chrome authenticated account smoke, existing deployed URL 404 blocker, and pre-main hardening roadmap are recorded in `docs/active/COMMENT_TRANSLATOR_PUBLIC_RELEASE_FINAL_QA.md`.
   - inspected surfaces for Task 20: `task.md`, `docs/active/COMMENT_TRANSLATOR_PROVIDER_COST_POLICY.md`, `scripts/comment-translator-provider-cost-policy-contract.mjs`, `lib/comment-translator-provider-boundary.ts`, `lib/comment-translator-provider-execution-runtime.ts`, `lib/comment-translator-deepl-provider.ts`, `lib/comment-translator-billing-runtime.ts`, `lib/comment-translator-session-runtime.ts`, `lib/comment-translator-usage-ledger-runtime.ts`, and existing provider execution / usage contract scripts.
   - completed in this branch: added `lib/comment-translator-provider-policy-runtime.ts` and `scripts/comment-translator-provider-implementation-alignment-contract.mjs`, extended provider usage handoff with sanitized cost estimates, and connected `executeCommentTranslatorProviderPolicyBatch` to server-owned Free/Paid routing. Free plan routes to Azure only; Paid plan routes to OpenAI mini primary with Azure fallback only for recoverable primary errors. OpenAI mini output is strict JSON parsed and parser/policy terminal failures do not auto-fallback. Existing provider execution contract was updated to accept the Task 20 provider policy files.
   - unchanged in this branch: no live provider call, YouTube live/provider smoke, deploy/upload, remote mutation, schema migration, provider target lookup, liveChatId lookup, Stripe live-mode action, new Stripe Price creation, billing setting mutation, browser storage expansion, handoff payload expansion, raw comment logging, provider credential value exposure, private provider target value exposure, or UI/CSS/layout change was added or run.
   - verification for this branch: RED `node scripts/comment-translator-provider-implementation-alignment-contract.mjs` failed before implementation because the provider policy runtime was missing; GREEN passed after implementation. `node scripts/comment-translator-provider-execution-runtime-contract.mjs`, no-secret scan over changed files, `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `git diff --check` passed. `npm run build` emitted existing Next/SWC version and middleware/proxy warnings plus static export alias skip for server-runtime build. `git diff --check` emitted LF-to-CRLF working-copy warnings only.
   - width checks skipped: Task 20 changed only server-only runtime/types and Node contract scripts plus this task note; no visible UI/CSS/layout text changed.
   - public-release capable: no. Provider implementation alignment is now recorded in local runtime/contracts, but Stripe live readiness, abuse protection, durable persistence decisions, monitoring, final security/privacy review, private-gated live/provider smoke, production/custom smoke, and final public launch gate flip remain incomplete or approval-gated.
   - residual risk: provider pricing, model availability, data-use terms, regions, dashboard hard caps, and actual provider response shapes remain live/account-specific and must be rechecked before approved live/provider smoke or paid launch. Current adapters are verified with deterministic/fake provider contracts only; no real Azure/OpenAI/DeepL/Gemini/Cloudflare call was made.
   - next safe action: create this Task 20 implementation alignment PR targeting `codex/comment-translator-preview`, then proceed to Task 21 Stripe live readiness and billing operations as a separate approval-gated PR after merge.

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

22. Abuse protection and rate-limit hardening
   - Goal: prevent public abuse, accidental cost spikes, and repeated session/API attempts before main promotion.
   - Scope: per-user session/action limits, unauthenticated and unauthorized request throttling, coarse IP/request protection where appropriate, Workers Rate Limiting or equivalent edge/app-side controls, and provider/billing route abuse cases.
   - Completion criteria: repeated Start/session/API attempts are bounded; non-allowed users cannot bypass private launch gate through repeated direct calls; cost-affecting provider/billing paths fail closed or degrade safely under abuse.
   - Verification: focused rate-limit/abuse contracts, route/API negative checks, lint, typecheck, build, `git diff --check`.

23. Durable persistence and schema migration readiness
   - Goal: decide what must be durable before public operation and keep remote schema changes approval-gated.
   - Scope: usage ledger durability, session history, entitlement persistence, admin aggregates, rollback plan, migration ordering, and in-memory fallback boundaries.
   - Completion criteria: durable-vs-in-memory decisions are recorded; any Supabase/schema migration is separated behind explicit approval; public launch does not depend on undocumented in-memory-only state for required enforcement.
   - Verification: docs/contracts, no-secret scan, `git diff --check`; remote schema migration only after explicit approval.

24. Monitoring, alerting, and incident response readiness
   - Goal: make cost, quota, billing, and runtime failures observable before public exposure.
   - Scope: provider cost/quota alerts, YouTube quota stop counts, translation error classes, Stripe webhook failure visibility, session failure/timeout counts, rollback trigger notes, and support escalation path.
   - Completion criteria: operators can detect provider-cost spikes, quota stops, webhook failures, and session failures without exposing secrets or raw comments; incident response and rollback notes are recorded.
   - Verification: monitoring contract/docs inspection, sanitized log/output review where available, no-secret scan, `git diff --check`.

25. Provider terms, privacy, and legal copy refresh
   - Goal: align public legal/copy surfaces with the final translation provider policy.
   - Scope: `/terms`, `/privacy`, `/legal/tokushoho`, `/tools/comment-translator`, `/account/integrations`, `/account/billing`, provider data-use/retention/training disclosures, support/contact copy, and paid-plan wording.
   - Completion criteria: selected providers and fallback behavior are accurately described; no unselected provider is overclaimed as production; user-visible copy explains AI/provider processing without exposing sensitive metadata.
   - Verification: route render checks, legal/copy contract, no-secret scan, lint, typecheck, build, `git diff --check`; width checks if visible layout changes.

26. Security and privacy final review
   - Goal: verify public-launch sensitive boundaries after access, UX, provider, and billing changes.
   - Scope: route/API authorization, token/credential boundaries, browser storage, logs/output, docs/PR body safety, provider target metadata, liveChatId, quota/budget stop paths, and rollback readiness.
   - Completion criteria: no known high/critical launch blocker remains; accepted risks are documented; no secret/token/provider target values appear in client-readable surfaces or changed files.
   - Verification: focused security contracts, no-secret scan, route/API negative checks, lint, typecheck, build, `git diff --check`.

27. Private-gated live/provider smoke
   - Goal: prove the live comment intake and translation path with sanitized evidence before main promotion.
   - Scope: same-thread/operator-local ready preflight, explicit approval, bounded YouTube live comment polling, provider translation execution, stop behavior, quota/budget stop behavior, and sanitized evidence recording.
   - Completion criteria: no live/provider command runs before explicit approval; evidence records counts/status/stop reasons only; no liveChatId, provider identifiers, OAuth values, raw comments, or Authorization headers are stored or displayed.
   - Verification: runbook preflight, approved live/provider smoke commands, sanitized output review, focused contracts, `git diff --check`.

28. Private-gated main promotion and production smoke
   - Goal: merge to main and verify the production/custom URL while general access remains blocked.
   - Scope: main merge gate, production deploy trigger/verification, production/custom route smoke, allowed-tester access, non-allowed-user denial, rollback readiness.
   - Completion criteria: production/custom deployed target serves the current app; private launch gate blocks general users; allowed testers can complete account/plan/session smoke; evidence is sanitized.
   - Verification: production route checks only after explicit approval, width checks, console checks, access-gate negative checks, rollback notes.

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

- Start each roadmap task in a fresh Codex thread and fresh worktree / feature branch from `origin/codex/comment-translator-preview` after confirming the previous task PR is merged.
- At thread start, run `git fetch origin --prune`, read `AGENTS.md` and `task.md`, and verify the latest merged PR commit is in `origin/codex/comment-translator-preview`.
- For each task, first identify whether the task is documentation, implementation, execution, or evidence-only.
- If the task is live/provider execution, confirm same-thread / operator-local same-command-process ready preflight, sanitized output review, and explicit in-thread approval before running provider-affecting commands.
- If the task completes and verification passes, update `task.md`, commit, push, and create a draft PR targeting `codex/comment-translator-preview`.
- If an external wait blocks execution and the user explicitly approves a readiness/blocker PR, record the incomplete completion criteria and blocker evidence in `task.md`, verify, commit, push, and create a draft PR targeting `codex/comment-translator-preview`.
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

重要:
- 最初に必ず `git fetch origin --prune` を実行してください。
- `AGENTS.md` と `task.md` を読んでください。
- root checkout / main では作業しないでください。
- 作業先は fresh worktree / feature branch にしてください。
- base は latest `origin/codex/comment-translator-preview` です。
- secret / token / OAuth access token / refresh token / authorization code / owner user id value / provider channel id value / liveChatId value / service_role key value / Authorization header value / Stripe secret key / webhook signing secret は表示・要求・保存しないでください。
- provider target metadata や liveChatId は operator-local env / server-only boundary で消費するだけにし、output / docs / PR body / browser storage / handoff payload に出さないでください。
- live/provider execution は、same-thread / operator-local same-command-process ready preflight、sanitized output review、explicit in-thread approval が揃うまで実行しないでください。
- この prompt は live/provider execution、deploy、remote mutation、Stripe live-mode action、billing setting mutation の承認ではありません。

Merge gate:
- Task 20 Translation provider implementation alignment PR が merge 済みであることを確認してください。
- gh が使える場合は Task 20 PR の state / mergedAt / mergeCommit / baseRefName / headRefName / statusCheckRollup を確認してください。
- merge commit が `origin/codex/comment-translator-preview` に含まれることを Git で確認してください。認証 token の値は要求・表示しないでください。

現在地:
- Preview roadmap Task 1-7 は完了済み。Task 7 Operator UI flow まで merge 済みです。
- Public Release Roadmap Task 1-15 は完了済みです。
- Pre-Main Launch Hardening Roadmap Task 17 PR #420、Task 18 PR #421、Task 19 PR #422 は merge 済みです。
- Task 19 で provider/cost policy が記録され、Task 20 で server-only Azure/OpenAI mini provider policy runtime、Free/Paid routing、paid recoverable Azure fallback、strict OpenAI JSON parser、sanitized usage/cost estimate handoff が追加されています。
- Actual Stripe live-mode action、Customer Portal redirect、webhook registration、remote schema migration、deploy/upload、deployed URL smoke、live/provider execution は引き続き approval-gated で、この prompt は承認ではありません。
- `public-release capable: no` のままです。
- 最終ゴールは Pre-Main Launch Hardening Roadmap の完了、private-gated main promotion、production/custom deployed smoke、必要な live/provider smoke の sanitized evidence 記録により「公開可能状態」にすることです。

次にやること:
- Pre-Main Launch Hardening Roadmap Task 21: Stripe live readiness and billing operations.
- Stripe Product/Price/Checkout/Portal/webhook readiness checklist、signed webhook entitlement evidence、failed/canceled/expired state review、safe rollback notes を整理してください。
- Dashboard/live-mode actions は、同一スレッドで明示承認・sanitized evidence review が揃うまで実行しないでください。必要なら blocker/readiness として記録してください。
- Stripe secret key / webhook signing secret / provider credential / OAuth token / private identifier の値は要求・表示・保存しないでください。env 名・reference 名だけを扱ってください。

Verification:
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- relevant Stripe readiness / billing operation contracts/tests
- no-secret scan over changed files
- `git diff --check`
- width checks at `390 / 820 / 1024 / 1280 / 1366px` if visible UI changes; docs/contract-onlyなら省略理由を `task.md` に残してください。

Completion:
- Task 21 completion criteria を満たした場合のみ `task.md` 更新、commit、push、draft PR targeting `codex/comment-translator-preview` まで進めてください。
- 未達なら commit / push / PR はせず、blocker reason、inspected files/commands、missing evidence/implementation、next safe action を報告してください。
```

## Post-Public Candidates

- Advanced paid tiers, paid-priority scheduling, and provider-usage charging.
- Twitch runtime and EventSub/chat integration.
- `liveChatMessages.streamList` evaluation.
- Background monitoring and automatic session start.
- Multiple concurrent streams per user.
- Additional source languages and advanced mixed-language options.
- User-provided Google Cloud project / OAuth client support.
