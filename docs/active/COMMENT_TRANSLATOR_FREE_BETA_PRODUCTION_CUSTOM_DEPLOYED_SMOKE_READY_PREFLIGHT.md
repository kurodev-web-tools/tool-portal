# Kuro Live Comment Translator Free Beta Production/Custom Deployed Smoke Ready Preflight

Status: FB-L5 production/custom deployed smoke ready preflight. Public-release capable: no.

Execution state: preflight-ready; not-run in this thread.

This preflight prepares the exact command sequence for later approved production/custom deployed smoke. It does not run deploy/upload, remote Supabase migration apply, remote mutation, deployed durable smoke, session Start, provider target lookup, live target lookup, liveChatMessages.list, Azure/OpenAI provider execution, Stripe action, main promotion, or public launch gate flip.

No remote Supabase migration apply, no remote mutation, no deploy/upload, no provider/live execution, no Stripe action, no main promotion, no public launch gate flip, and no launch-gate change was executed by this ready preflight.

Execution exclusions: no remote Supabase migration apply, no remote mutation, no deploy/upload, no provider target lookup, no live target lookup, no liveChatMessages.list, no Azure/OpenAI provider execution, no Stripe action, no main promotion, and no public launch gate flip.

## Purpose

FB-L5 needs a narrow way to prove that the production/custom deployed target serving Free beta matches the reviewed integration branch and is reachable by an allowed tester without exposing private values or accidentally expanding into deployment, remote schema, provider, Stripe, paid entitlement, or public launch work.

This ready preflight defines the exact commands, required operator-local references, allowed output shape, abort rules, rollback boundary, and exact approval text for a later execution. It is safe to review because it records reference names and command shapes only.

## Execution Decision

- Ready preflight state: preflight-ready.
- Execution state: not-run in this thread.
- Production/custom deployed smoke: not-run / approval-gated.
- Remote Supabase migration apply: not-run / approval-gated.
- Remote Supabase mutation: not-run / approval-gated.
- Deploy/upload/provider/live/Azure/Stripe/main/public launch actions: not-run / approval-gated.

## Preconditions

Required before running any command below:

- Same-thread approval must use the exact approval label in this document.
- The operator must confirm the reviewed integration branch is `codex/comment-translator-free-public-beta-integration`.
- The operator must confirm public launch remains blocked: `public-release capable: no`.
- The operator must provide a safe deployed app target label through `COMMENT_TRANSLATOR_DEPLOYED_ORIGIN` without printing private project values.
- The operator must provide a safe deployment/version label through `COMMENT_TRANSLATOR_DEPLOYED_VERSION_LABEL` without printing dashboard-only private values.
- The operator must confirm the deployed target label maps to the reviewed integration branch head or to an approved deployment of that head.
- The operator must provide an allowed-tester authenticated browser/session boundary through `COMMENT_TRANSLATOR_ALLOWED_TESTER_COOKIE` without printing the cookie value.
- The operator must confirm FB-L2 remote durable enforcement is either separately approved and recorded, or still blocked; FB-L5 must not run remote Supabase migration apply.
- The operator must confirm FB-L3 allowed-tester route/API smoke is either separately approved and recorded, or still blocked; FB-L5 must not treat FB-L3 as executed unless it is in the same approved sequence.
- The operator must confirm FB-L4 Start-to-translation smoke is either separately approved and recorded, or still blocked; FB-L5 must not treat FB-L4 as executed unless it is in the same approved sequence.
- Sanitized output review must allow only command names, safe target labels, safe deployment/version labels, reviewed integration branch labels, route/action names, HTTP status, browser-visible state labels, status labels, counts, stop reasons, unavailable reasons, source attribution labels, and pass/fail state.

## Exact Command Sequence

Do not run these commands until same-thread ready preflight, sanitized output review, and exact explicit approval are all present.

Local deterministic baseline:

```powershell
node scripts/comment-translator-free-beta-production-custom-deployed-smoke-contract.mjs
git rev-parse origin/codex/comment-translator-free-public-beta-integration
```

Deployment/version label comparison, approval-gated:

```powershell
$expectedIntegrationCommit = git rev-parse origin/codex/comment-translator-free-public-beta-integration
if ([string]::IsNullOrWhiteSpace($env:COMMENT_TRANSLATOR_DEPLOYED_ORIGIN)) { throw "blocked-missing-deployed-origin" }
if ([string]::IsNullOrWhiteSpace($env:COMMENT_TRANSLATOR_DEPLOYED_VERSION_LABEL)) { throw "blocked-missing-deployed-version-label" }
if ($env:COMMENT_TRANSLATOR_DEPLOYED_VERSION_LABEL -notmatch [regex]::Escape($expectedIntegrationCommit)) { throw "blocked-deployed-version-mismatch" }
```

The deployment/version label may be a safe branch/commit/deployment alias label from the approved deployment system. Do not print private dashboard values, account values, deployment ids if they are not safe to share, token values, or raw headers.

Deployed route reachability smoke, approval-gated:

```powershell
curl.exe --fail-with-body --silent --show-error --head "$env:COMMENT_TRANSLATOR_DEPLOYED_ORIGIN/tools/comment-translator/"
curl.exe --fail-with-body --silent --show-error --head "$env:COMMENT_TRANSLATOR_DEPLOYED_ORIGIN/account/integrations/"
curl.exe --fail-with-body --silent --show-error --head "$env:COMMENT_TRANSLATOR_DEPLOYED_ORIGIN/account/billing/"
```

Authenticated status route smoke, approval-gated:

```powershell
curl.exe --fail-with-body --silent --show-error --request POST "$env:COMMENT_TRANSLATOR_DEPLOYED_ORIGIN/api/comment-translator/session" --header "Cookie: $env:COMMENT_TRANSLATOR_ALLOWED_TESTER_COOKIE" --header "Content-Type: application/json" --data "{\"intent\":\"status\"}"
```

Route boundary: `POST /api/comment-translator/session`.

Allowed payload for this preflight: `{"intent":"status"}` only. `start`, `stop`, and `heartbeat` are excluded unless a later same-thread approval explicitly expands the scope.

Allowed-tester browser route/UI confirmation is manual or Browser-assisted after approval and must record only:

- route path;
- safe target label;
- safe deployment/version label;
- reviewed integration branch label;
- visible state label;
- usage status label;
- deletion status label;
- Creator locked status label;
- Start-to-translation gate status label;
- source attribution label if visible;
- translated count and skipped count only when already present from a separately approved source;
- console error count;
- overflow state.

Server-owned action status harness, approval-gated only if the execution turn provides an approved harness. The harness must import and call only these server action surfaces with operator-local authenticated context and sanitized output:

- `getCommentTranslatorSessionStatusAction`
- `getCommentTranslatorRealCommentsFeedAction`
- `requestCommentTranslatorDataDeletionAction`
- `getCommentTranslatorCreatorLockedWaitlistAction`
- `recordCommentTranslatorCreatorLockedClickAction`

The harness must print only:

- action name;
- safe target label;
- safe deployment/version label;
- pass/fail state;
- HTTP status when applicable;
- session/feed/usage/deletion/Creator locked status;
- Start-to-translation gate status;
- count;
- stop reason;
- unavailable reason.

The harness must not print request headers, cookie values, token values, user identifiers, provider identifiers, provider target metadata, liveChatId values, server-only cursors, raw provider payloads, raw comments, browser storage payloads, or handoff payload values.

## Sanitized Output Review

Allowed output after a later approved run:

- command name;
- safe target label;
- safe deployment/version label;
- reviewed integration branch label;
- route/action name;
- HTTP status;
- browser-visible state label;
- session status label;
- feed status label;
- usage count or Free cap label;
- deletion readiness label;
- Creator locked/waitlist/local draft status label;
- Start-to-translation gate status;
- stop reason label;
- unavailable reason;
- source attribution label;
- console error count;
- overflow state;
- pass/fail state.

Forbidden output:

- secret values;
- OAuth values;
- token values;
- Authorization header values;
- cookie values;
- service-role values;
- owner user id values;
- provider channel id values;
- credential reference values;
- provider target metadata;
- liveChatId values;
- raw provider payloads;
- raw comments;
- server-only cursor values;
- browser storage payloads;
- handoff payload expansion;
- Stripe secret/billing identifiers.

## Abort Rules

Abort before production/custom deployed smoke if:

- the deployed origin safe target label is missing or ambiguous;
- the safe deployment/version label is missing or ambiguous;
- the safe deployment/version label does not map to the reviewed integration branch;
- the allowed-tester cookie/session boundary is missing;
- sanitized output review is incomplete;
- exact explicit approval is absent;
- any output contains a forbidden value;
- the route/API output expands browser storage or handoff payload evidence;
- durable session or usage state is missing or unreadable and does not fail closed;
- any command would run remote Supabase migration apply or remote mutation;
- any command would run session Start, provider target lookup, live target lookup, `liveChatMessages.list`, Azure/OpenAI provider execution, deploy/upload, Stripe action, main promotion, or public launch gate flip;
- any command would expand into Paid entitlement C1/C3, Stripe billing, or Creator paid limits.

## Approval Text

Exact approval required before execution:

```text
I approve running FB-L5 production/custom deployed smoke with approval label approved-fb-l5-production-custom-deployed-smoke, limited to the exact deployed target freshness, Free beta route reachability, allowed-tester route/UI visibility, status-only session API, usage/deletion/Creator locked gate, and Start-to-translation gate checks in docs/active/COMMENT_TRANSLATOR_FREE_BETA_PRODUCTION_CUSTOM_DEPLOYED_SMOKE_READY_PREFLIGHT.md. Keep output sanitized to counts/status/stop reasons only, with safe target labels, safe deployment/version labels, unavailable reasons, source-attribution labels, console error count, and overflow state allowed. Do not run remote Supabase migration apply, remote mutation, deploy/upload, session Start, provider target lookup, live target lookup, liveChatMessages.list, Azure/OpenAI provider execution, Stripe actions, Paid entitlement C1/C3, Creator paid limits, main promotion, or public launch gate flip.
```

Approval label: `approved-fb-l5-production-custom-deployed-smoke`.

## Rollback Boundary

Rollback is not automatic. If a later approved run fails:

- keep public launch blocked;
- stop further deployed smoke commands;
- record sanitized blocker labels only;
- do not run cleanup SQL unless separately approved;
- do not run remote migration/mutation, deploy/upload, provider/live execution, Stripe action, main promotion, or public launch gate flip as rollback;
- if a stale deployment is found, create a separate reviewed deployment or integration-branch correction plan.

## What Approval Would Prove

If approved and successful, this sequence can prove:

- the production/custom target is serving a deployment that matches the reviewed integration branch;
- an allowed tester can reach `/tools/comment-translator/` on the deployed target;
- the deployed route/UI can show browser-visible Free beta state without forbidden private values;
- `POST /api/comment-translator/session` status returns a browser-safe session/usage state;
- server-owned feed, deletion, Creator locked, and Start-to-translation gate states remain sanitized;
- missing or unreadable durable state fails closed with sanitized output instead of opening access;
- public launch remains blocked until a separate release-owner decision.

## What Approval Would Not Prove

This sequence would not prove:

- FB-L2 remote migration/apply safety unless separately approved and recorded;
- FB-L3 full route/API smoke unless included in the same approval scope and recorded separately;
- FB-L4 Start-to-translation smoke unless included in the same approval scope and recorded separately;
- session Start;
- provider target lookup;
- live target lookup;
- `liveChatMessages.list`;
- non-empty live comment intake;
- Azure/OpenAI provider API execution;
- unlimited or continuous polling;
- public traffic readiness;
- Paid entitlement C1/C3;
- Stripe billing;
- Creator paid limits;
- main promotion;
- public launch gate flip.

## Completion Verification

Required closeout for this ready preflight:

- `node scripts/comment-translator-free-beta-production-custom-deployed-smoke-contract.mjs`
- changed-files no-secret scan
- `git diff --check`

App runtime/UI files are not changed by this preflight; this slice changes docs/task notes and the focused contract script only. `npm run lint`, `npx tsc --noEmit`, and `npm run build` are not required for the current verification baseline.

Width checks are skipped because this preflight does not change visible UI/CSS/layout/copy, rendered routes, browser storage, or runtime behavior.
