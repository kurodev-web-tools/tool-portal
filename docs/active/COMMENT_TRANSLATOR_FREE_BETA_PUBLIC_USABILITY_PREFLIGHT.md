# Kuro Live Comment Translator Free Beta Public Usability Preflight

Status: FB-L1 Free beta public usability preflight. Public-release capable: no.

This record defines the approval-gated preflight required before Free beta can be treated as actually usable by approved testers. It does not run or approve remote Supabase mutation, remote Supabase migration apply, OAuth live connect/disconnect execution, provider target lookup execution, live target lookup execution, liveChatMessages.list execution, session start smoke, translation provider API execution, Azure/OpenAI provider call, deploy/upload, Stripe live Product/Price creation, Checkout, Customer Portal redirect, webhook registration, billing setting mutation, main promotion, or public launch gate flip.

Output policy: sanitized-metadata-only. Allowed evidence is command name, route/action name, status label, HTTP status, count, stop reason, reference name, safe deployment/branch label, and pass/fail state. Secret values, OAuth values, token values, Authorization header values, owner user id values, provider channel id values, provider target metadata, liveChatId values, server-only cursor values, raw provider payloads, raw comments, author channel material, Stripe secret/billing identifiers, browser storage payloads, and handoff payload expansion are not requested, displayed, stored, or recorded.

## Purpose

FB-L1 converts F1-F15 readiness into an exact approval-gated sequence for Free beta public usability. The sequence must let FB-L2 and later threads know which smoke comes first, what each smoke proves, what each smoke does not prove, what evidence is safe to record, and where to stop.

This is preflight readiness only. Public launch remains blocked and `public-release capable: no` remains unchanged.

FB-L2 follow-up: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_REMOTE_DURABLE_ENFORCEMENT_EVIDENCE.md` records Remote durable enforcement evidence as `blocked-no-approval` for this thread. Remote Supabase migration apply, remote Supabase mutation, deployed durable write/read smoke, deploy/upload, live/provider execution, Stripe actions, and public launch gate flip remain not-run / approval-gated.

FB-L5 follow-up: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PRODUCTION_CUSTOM_DEPLOYED_SMOKE_EVIDENCE.md` records Production/custom deployed smoke as `blocked-no-approval` for this thread, with exact-command ready preflight in `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PRODUCTION_CUSTOM_DEPLOYED_SMOKE_READY_PREFLIGHT.md`. Production/custom deployed smoke execution, deploy/upload, session Start, provider/live execution, Stripe actions, main promotion, and public launch gate flip remain not-run / approval-gated.

PL-G4 follow-up: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G4_PRODUCTION_CUSTOM_DEPLOYED_SMOKE.md` records blocked-no-approval for the FB-L5 production/custom deployed smoke execution gate. The exact approval label remains `approved-fb-l5-production-custom-deployed-smoke`; deployed target freshness, reviewed integration branch match, allowed-tester route/UI reachability, status-only session API, usage/deletion/Creator locked gate status, and Start-to-translation gate status remain not-run / approval-gated until same-thread ready preflight, sanitized output review, and operator-local env references are present.

FB-L6 follow-up: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_LAUNCH_GATE_DECISION_EVIDENCE.md` records Public launch gate decision as `keep blocked / blocked-no-approval`, with exact-command ready preflight in `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_LAUNCH_GATE_DECISION_READY_PREFLIGHT.md`. The decision options are `keep blocked`, `open limited public beta`, and `flip public gate`; without same-thread release-owner exact approval, the public launch gate remains unchanged and `public-release capable: no` remains in effect.

## Inspected Inputs

- `task.md`
- `docs/active/COMMENT_TRANSLATOR_FREE_PUBLIC_BETA_FINAL_QA_READINESS.md`
- `docs/active/COMMENT_TRANSLATOR_DURABLE_PERSISTENCE_SCHEMA_READINESS.md`
- `docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md`
- `docs/active/COMMENT_TRANSLATOR_PRODUCTION_ENV_READINESS.md`
- `docs/active/COMMENT_TRANSLATOR_PRIVATE_GATED_PRODUCTION_SMOKE_EVIDENCE.md`
- `lib/comment-translator-durable-session-store.ts`
- `lib/comment-translator-durable-usage-counter-store.ts`
- `lib/comment-translator-public-entitlement-baseline.ts`
- `lib/comment-translator-session-runtime.ts`
- `lib/comment-translator-usage-ledger-runtime.ts`
- `lib/comment-translator-server-only-live-chat-target-lookup.ts`
- `lib/comment-translator-bounded-live-chat-polling-wiring.ts`
- `lib/comment-translator-live-message-normalization.ts`
- `lib/comment-translator-real-comments-ui-wiring.ts`
- `lib/comment-translator-real-comments-feed-shared.ts`
- `lib/comment-translator-azure-normal-translation-execution.ts`
- `lib/comment-translator-start-stop-reason-ux.ts`
- `lib/comment-translator-free-beta-usage-display.ts`
- `app/api/comment-translator/session/route.ts`
- `app/tools/comment-translator/actions.ts`
- `components/comment-translator/CommentTranslatorDock.tsx`
- `lib/comment-translator.ts`

## Execution Order

0. public launch gate remains blocked: confirm the release decision is still `public-release capable: no`.
1. local deterministic contract baseline: run focused local contracts and no-secret scan before any remote/live/provider step.
2. remote/deployed durable enforcement preflight: confirm reviewed migration/apply target, deployment target, fail-closed expectations, rollback owner, sanitized output review, and exact same-thread approval text before FB-L2 executes anything.
3. authenticated allowed-tester route/API smoke: confirm allowed tester auth, private-launch allowlist, route/action list, safe fixture scope, and no provider execution before FB-L3 runs route/API checks.
4. Start smoke: confirm the Start action is separately approved and bounded before FB-L4 presses Start.
5. live target lookup: run only after Start smoke authorization and owner binding prerequisites; keep target data server-only.
6. bounded polling: run only one bounded polling step after live target presence-only evidence; no broad loop.
7. Azure execution: run only after non-empty eligible intake, Free entitlement allowance, usage budget allowance, and provider output review.
8. UI confirmation: confirm server-owned comments, usage, source attribution, deletion/ended states, and stop reasons with sanitized visible evidence.
9. production/custom deployed smoke: confirm the deployed target serving Free beta matches the reviewed integration branch and is reachable by allowed testers before broad access.
10. rollback readiness: stop new public sessions or keep gate closed before changing provider, deploy, schema, or billing state.
11. no-secret output closeout: record only sanitized counts/status/stop reasons and unchecked scope.

## Lane Separation

| Lane | Allowed now | Evidence shape | Excluded |
| --- | --- | --- | --- |
| local deterministic | Focused contracts, source inspection, markdown inspection, changed-files no-secret scan, `git diff --check`. | Command names, exit status, route/action names, status labels, not-run gates. | Network provider calls, remote mutation, deploy/upload, browser storage expansion, handoff payload expansion. |
| sanitized server-owned state | Route/action plans for authenticated allowed-tester states using safe local fixtures only. | Sanitized session/feed/usage/deletion/Creator locked states, counts, stop reasons, unavailable reasons. | Raw provider payloads, raw comments, private identifiers, live target values, manual liveChatId/channel entry. |
| approval-gated exact-command preflight | Exact command review, operator-local reference-name checklist, sanitized output review, abort rules, rollback owner, and requested approval text. | `preflight-ready`, `blocked-missing-env`, `blocked-no-approval`, `blocked-output-review-incomplete`, `not-run`, reference-name-only evidence. | Execution before same-thread ready preflight, sanitized output review, and explicit in-thread approval. |
| unchecked live-provider scope | Explicitly record every live/provider/deploy/remote/Stripe path not executed in FB-L1. | Residual risk and next-task handoff only. | Any implied public launch readiness or production usability claim. |

## Smoke Proof Boundaries

| Smoke | Proves | Does not prove |
| --- | --- | --- |
| remote/deployed durable enforcement | Proves the deployed target can read/write required durable session and usage authority, enforce Free caps, and fail closed when required state is unavailable. | Does not prove provider target lookup, live polling, Azure execution, paid entitlement C1/C3 behavior, Stripe live action, or public launch readiness. |
| authenticated allowed-tester route/API smoke | Proves allowed testers can reach reviewed routes/actions and receive browser-safe session/feed/usage/deletion/Creator locked states without private values. | Does not prove Start, live target lookup, liveChatMessages.list, Azure execution, or durable enforcement unless those are separately included and approved. |

PL-G2A server action route/API harness bridge: `POST /api/comment-translator/free-beta/route-api-harness` is the reviewed harness route for feed/deletion/Creator locked action surfaces. It is inert unless `COMMENT_TRANSLATOR_FREE_BETA_ROUTE_API_HARNESS_ENABLED` matches the approval label, the `x-comment-translator-harness-approval` header is present, and the private launch allowed-tester gate passes. It outputs only action name, status label, count, unavailable reason, and pass/fail.

PL-G2B route/API harness smoke evidence: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G2B_ALLOWED_TESTER_ROUTE_API_HARNESS_SMOKE.md` records blocked-no-approval for the allowed-tester route/API harness smoke. The status route and PL-G2A harness route remain not-run / approval-gated until the exact approval label `approved-fb-l3-allowed-tester-route-api-smoke`, sanitized output review, and operator-local env references are present.
PL-G3 Start-to-translation smoke evidence: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE.md` records blocked-no-approval for the FB-L4 Start-to-translation smoke execution gate. The exact approval label remains `approved-fb-l4-start-to-translation-smoke`; status precheck, explicit Start, server-only live target lookup, one bounded `liveChatMessages.list` polling step, Free Azure translation, UI feed confirmation, usage, stop reason, source attribution, and Stop remain not-run / approval-gated until same-thread ready preflight, sanitized output review, and operator-local env references are present.

PL-G4 production/custom deployed smoke evidence: `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G4_PRODUCTION_CUSTOM_DEPLOYED_SMOKE.md` records blocked-no-approval for the FB-L5 production/custom deployed smoke execution gate. The exact approval label remains `approved-fb-l5-production-custom-deployed-smoke`; deployed target freshness, reviewed integration branch match, allowed-tester route/UI reachability, status-only session API, usage/deletion/Creator locked gate status, and Start-to-translation gate status remain not-run / approval-gated until same-thread ready preflight, sanitized output review, and operator-local env references are present.

| Start smoke | Proves explicit user Start can create or reject a server-owned Free session with sanitized status, usage, entitlement, and stop reason output. | Does not prove live target lookup, polling, non-empty intake, Azure execution, UI rendering, or deployed durability unless separately chained and approved. |
| live target lookup | Proves the server can resolve an owned live target after Start with presence-only sanitized evidence. | Does not prove liveChatMessages.list, non-empty comments, Azure execution, UI rendering, or that target metadata is browser-safe. |
| bounded polling | Proves one bounded liveChatMessages.list step can execute after target presence and return sanitized counts, polling interval, and stop state. | Does not prove continuous polling, translated output, UI display, durable accounting, or public traffic readiness. |
| Azure execution | Proves eligible comments from the bounded intake can enter the Free Azure route and produce sanitized translated/skip/error counts. | Does not prove OpenAI paid route, paid entitlement C1/C3, unlimited provider budget, or public launch readiness. |
| UI confirmation | Proves the browser can display server-owned comments, usage, source attribution, deletion/ended states, and stop reasons without forbidden fields. | Does not prove provider execution correctness, durable enforcement, deploy freshness, or absence of all storage issues beyond the reviewed visible scope. |
| production/custom deployed smoke | Proves the production/custom target serving the Free beta path matches the reviewed integration branch and lets an allowed tester reach route/UI and status-only route/API surfaces with sanitized output. | Does not prove Start, live target lookup, polling, Azure execution, remote durable enforcement, paid entitlement C1/C3, Stripe billing, main promotion, or public launch readiness unless separately approved and recorded. |
| rollback | Proves the operator has a bounded stop/disable/revert path and knows which state must stay unchanged. | Does not prove rollback execution succeeded unless separately approved and recorded with sanitized evidence. |
| no-secret output | Proves recorded evidence avoids forbidden values and stays counts/status/stop reasons only. | Does not prove external systems contain no secrets, and does not permit broader logs, browser storage inspection, or handoff payload expansion. |

## Exact Approval-Gated Preflight

FB-L1 does not run the commands below. Later threads may run only the preflight or exact execution command that has same-thread ready preflight, sanitized output review, and explicit in-thread approval for that exact command.

Local deterministic baseline:

- `node scripts/comment-translator-durable-session-schema-adapter-contract.mjs`
- `node scripts/comment-translator-durable-usage-counter-schema-adapter-contract.mjs`
- `node scripts/comment-translator-public-entitlement-baseline-contract.mjs`
- `node scripts/comment-translator-session-start-stop-contract.mjs`
- `node scripts/comment-translator-bounded-live-chat-polling-wiring-contract.mjs`
- `node scripts/comment-translator-live-message-normalization-contract.mjs`
- `node scripts/comment-translator-real-comments-ui-wiring-contract.mjs`
- `node scripts/comment-translator-azure-normal-translation-execution-contract.mjs`
- `node scripts/comment-translator-start-stop-reason-ux-contract.mjs`
- `node scripts/comment-translator-free-beta-usage-display-contract.mjs`
- `node scripts/comment-translator-free-public-beta-final-qa-readiness-contract.mjs`
- `node scripts/comment-translator-free-beta-public-usability-preflight-contract.mjs`
- `node scripts/comment-translator-free-beta-production-custom-deployed-smoke-contract.mjs`
- `node scripts/comment-translator-free-beta-public-launch-gate-decision-contract.mjs`

Live/provider preflight command surfaces:

- `node scripts/comment-translator-private-gated-live-provider-smoke-execution-harness.mjs --check-env-only`
- `node scripts/comment-translator-private-gated-live-provider-smoke-execution-harness.mjs --print-exact-command-review`
- `node scripts/comment-translator-private-gated-live-provider-smoke-execution-harness.mjs --execute --approved-private-gated-live-provider-smoke --use-operator-local-runtime-adapters --operator-local-ready-preflight-reviewed`
- `node scripts/comment-translator-youtube-live-chat-target-lookup-command.mjs --check-env-only --json`
- `node scripts/comment-translator-youtube-live-chat-target-lookup-command.mjs --check-token-material-availability --json`
- `node scripts/comment-translator-youtube-live-chat-target-lookup-command.mjs --execute --approved-live-chat-target-lookup --json`
- `node scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs --check-env-only --json`
- `node scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs --check-token-material-availability --json`
- `node scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs --execute --approved-live-chat-polling-smoke --json`

Remote/deployed and authenticated route/API smoke preflight must define the exact target label, method, route/action list, required auth fixture boundary, expected sanitized labels, abort rules, rollback owner, and no-secret review before execution. If the exact command cannot be produced without target-specific private values, record `blocked-missing-env` or `blocked-no-approval` and stop.

## Sanitized Evidence Shapes

| Surface | Allowed evidence | Required blocker labels |
| --- | --- | --- |
| durable enforcement | deployed target label, route/action name, Free cap label, fail-closed state, write/read count, stop reason | `blocked-missing-env`, `blocked-no-approval`, `blocked-output-review-incomplete`, `blocked-durable-state-unavailable` |
| allowed-tester route/API | route/action name, HTTP status, session/feed/usage/deletion/Creator locked status, count, unavailable reason | `blocked-no-allowed-tester-session`, `blocked-private-launch-gated`, `blocked-missing-env` |
| Start smoke | Start action name, session state, stop reason, Free entitlement label, usage count, no-provider-call state | `blocked-no-approval`, `blocked-no-connected-credential`, `blocked-durable-state-unavailable`, `blocked-output-review-incomplete` |
| live target lookup | command name, target presence, returned item count, owner-binding status | `blocked-no-approval`, `blocked-missing-env`, `blocked-no-owned-live-target` |
| bounded polling | command name, HTTP status, returned count, eligible count, skipped count, polling interval, stop reason | `blocked-no-approval`, `blocked-empty-polling`, `blocked-provider-error-sanitized` |
| Azure execution | provider route label, provider request count, provider call count, translated count, skipped count, recoverable/terminal error count | `blocked-provider-unavailable`, `blocked-budget`, `blocked-output-review-incomplete` |
| UI confirmation | route path, width, visible state label, source label, stop reason label, console error count, overflow state | `blocked-no-auth-fixture`, `blocked-ui-render`, `blocked-output-review-incomplete` |
| production/custom deployed smoke | safe target label, safe deployment/version label, reviewed integration branch label, route/action name, HTTP status, visible state label, session/feed/usage/deletion/Creator locked status, Start-to-translation gate status, count, stop reason | `blocked-no-approval`, `blocked-missing-env`, `blocked-deployed-version-mismatch`, `blocked-no-allowed-tester-session`, `blocked-output-review-incomplete` |

## Rollback And Abort Rules

Abort immediately if any output contains token values, Authorization header values, provider target metadata, liveChatId values, private owner/provider ids, raw comments, raw provider payloads, server-only cursor values, Stripe secret/billing identifiers, browser storage payloads, or handoff payload expansion.

Rollback is not automatic in FB-L1. Later approved rollback may keep the public launch gate closed, disable new public sessions, revert a docs/contract PR, revert a deployment version, or pause provider execution. Do not run cleanup SQL, remote mutation, schema migration, deploy/upload, provider lookup, live polling, provider API execution, Stripe action, main promotion, or public launch gate flip as rollback unless separately approved in-thread.

## Account Limits And Entitlement Boundary

Free beta usability must rely on Free durable session/usage authority: 30 minutes per user per day, 30 minutes per session, 1 active session per user, 30 translated messages per minute, and 20,000 translated characters per month. Missing or unreadable durable state fails closed before Start or provider execution.

FB-L1 does not implement or verify paid entitlement authority. Paid access after C1/C3 remains separate: signed Stripe webhook evidence, durable paid entitlement rows, paid usage counters, monthly reset state, and paid fallback/stop reasons must not be mixed into Free beta preflight evidence.

## No-Secret Output Contract

- no browser storage expansion
- no handoff payload expansion
- manual liveChatId/channel entry remains excluded
- background monitoring from connection alone remains excluded
- connection alone must not start polling, translation, quota use, or provider target lookup
- evidence stays reference-name-only and counts/status/stop reasons only
- PR bodies and task handoffs must not include private target values, credential values, tokens, raw comments, raw provider payloads, Stripe secret/billing identifiers, or server-only cursors

## Unchecked Scope And Residual Risk

Unchecked in FB-L1:

- remote Supabase mutation: not-run / approval-gated
- remote Supabase migration apply: not-run / approval-gated
- provider target lookup execution: not-run / approval-gated
- live target lookup execution: not-run / approval-gated
- liveChatMessages.list execution: not-run / approval-gated
- session start smoke: not-run / approval-gated
- translation provider API execution: not-run / approval-gated
- Azure/OpenAI provider call: not-run / approval-gated
- deploy/upload: not-run / approval-gated
- Stripe live Product/Price creation: not-run / approval-gated
- Checkout: not-run / approval-gated
- Customer Portal redirect: not-run / approval-gated
- webhook registration: not-run / approval-gated
- billing setting mutation: not-run / approval-gated
- main promotion: not-run / approval-gated
- public launch gate flip: not-run / approval-gated

Residual risk: Free beta public usability is not accepted until FB-L2-FB-L5 produce approved sanitized evidence or record explicit blockers. Public release remains blocked.

## Completion Verification

Required FB-L1 closeout checks:

- `node scripts/comment-translator-free-beta-public-usability-preflight-contract.mjs`
- changed-files no-secret scan
- `git diff --check`

Runtime/code files are not changed by FB-L1, so `npm run lint`, `npx tsc --noEmit`, and `npm run build` are not required by the current verification baseline for this docs/contract-only slice.

Width checks are skipped because FB-L1 does not change visible UI/CSS/layout/copy, rendered routes, browser storage, or runtime behavior.
