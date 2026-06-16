# Kuro Live Comment Translator Free Beta Allowed-Tester Route/API Smoke Ready Preflight

Status: FB-L3 allowed-tester route/API smoke ready preflight. Public-release capable: no.

Execution state: preflight-ready; not-run in this thread.

This preflight prepares the exact command sequence for later approved authenticated allowed-tester route/API smoke. It does not run remote Supabase migration apply, remote Supabase mutation, deployed durable smoke, session Start, provider target lookup, live target lookup, `liveChatMessages.list`, Azure/OpenAI provider execution, deploy/upload, Stripe action, main promotion, or public launch gate flip.

No remote Supabase migration apply, remote mutation, deploy/upload, provider/live execution, Stripe action, or launch-gate change was executed by this ready preflight.

Execution exclusions: no remote Supabase migration apply, no remote mutation, no session Start, no provider target lookup, no live target lookup, no liveChatMessages.list, no Azure/OpenAI provider execution, no deploy/upload, no Stripe action, no main promotion, and no public launch gate flip.

## Purpose

FB-L3 needs a narrow way to prove that an authenticated allowed tester can reach the reviewed route/action surfaces and receive browser-safe session, feed, usage, deletion, and Creator locked states without exposing private values or accidentally starting provider/live work.

This ready preflight defines the exact commands, required operator-local references, allowed output shape, abort rules, rollback boundary, and exact approval text for a later execution. It is safe to review because it records reference names and command shapes only.

## Execution Decision

- Ready preflight state: preflight-ready.
- Execution state: not-run in this thread.
- Authenticated allowed-tester route/API smoke: not-run / approval-gated.
- Remote Supabase migration apply: not-run / approval-gated.
- Remote Supabase mutation: not-run / approval-gated.
- Provider/live/deploy/Stripe/main/public launch actions: not-run / approval-gated.

## Preconditions

Required before running any command below:

- Same-thread approval must use the exact approval label in this document.
- The operator must confirm the branch target is `codex/comment-translator-free-public-beta-integration`.
- The operator must confirm public launch remains blocked: `public-release capable: no`.
- The operator must provide an allowed-tester authenticated browser/session boundary through `COMMENT_TRANSLATOR_ALLOWED_TESTER_COOKIE` without printing the cookie value.
- If targeting a deployed app, the operator must provide a safe deployed app target label through `COMMENT_TRANSLATOR_DEPLOYED_ORIGIN` without printing private project values.
- The operator must confirm FB-L2 remote durable enforcement is either already approved in a separate record or still blocked; FB-L3 must not run remote Supabase migration apply.
- Sanitized output review must allow only route/action names, HTTP status, status labels, counts, stop reasons, and unavailable reasons. Evidence stays counts/status/stop reasons only, with unavailable reasons allowed for blocked route/action states.

## Exact Command Sequence

Do not run these commands until same-thread ready preflight, sanitized output review, and exact explicit approval are all present.

Local deterministic baseline:

```powershell
node scripts/comment-translator-free-beta-allowed-tester-route-api-smoke-contract.mjs
```

Status-only route smoke, approval-gated:

```powershell
curl.exe --fail-with-body --silent --show-error --request POST "$env:COMMENT_TRANSLATOR_DEPLOYED_ORIGIN/api/comment-translator/session" --header "Cookie: $env:COMMENT_TRANSLATOR_ALLOWED_TESTER_COOKIE" --header "Content-Type: application/json" --data "{\"intent\":\"status\"}"
```

Route boundary: `POST /api/comment-translator/session`.

Allowed payload for this preflight: `{"intent":"status"}` only. `start`, `stop`, and `heartbeat` are excluded unless a later same-thread approval explicitly expands the scope.

Server action route/API harness, approval-gated. The harness must import and call only these server action surfaces with operator-local authenticated context and sanitized output:

- `getCommentTranslatorSessionStatusAction`
- `getCommentTranslatorRealCommentsFeedAction`
- `requestCommentTranslatorDataDeletionAction`
- `getCommentTranslatorCreatorLockedWaitlistAction`
- `recordCommentTranslatorCreatorLockedClickAction`

The harness must print only:

- action name;
- safe target label;
- pass/fail state;
- HTTP status when applicable;
- session/feed/usage/deletion/Creator locked status;
- count;
- stop reason;
- unavailable reason.

The harness must not print request headers, cookie values, token values, user identifiers, provider identifiers, provider target metadata, liveChatId values, server-only cursors, raw provider payloads, raw comments, browser storage payloads, or handoff payload values.

## Sanitized Output Review

Allowed output after a later approved run:

- command name;
- safe target label;
- route/action name;
- HTTP status;
- session status label;
- feed status label;
- usage count or Free cap label;
- deletion readiness label;
- Creator locked/waitlist/local draft status label;
- stop reason label;
- unavailable reason;
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

Abort before route/API smoke if:

- the allowed-tester cookie/session boundary is missing;
- the safe target label is missing or ambiguous;
- sanitized output review is incomplete;
- exact explicit approval is absent;
- any output contains a forbidden value;
- any command would run remote Supabase migration apply or remote mutation;
- any command would run session Start, provider target lookup, live target lookup, `liveChatMessages.list`, Azure/OpenAI provider execution, deploy/upload, Stripe action, main promotion, or public launch gate flip;
- the route/action output expands browser storage or handoff payload evidence.

## Approval Text

Exact approval required before execution:

```text
I approve running FB-L3 allowed-tester route/API smoke with approval label approved-fb-l3-allowed-tester-route-api-smoke, limited to the exact status route and server-owned action surfaces in docs/active/COMMENT_TRANSLATOR_FREE_BETA_ALLOWED_TESTER_ROUTE_API_SMOKE_READY_PREFLIGHT.md. Keep output sanitized to counts/status/stop reasons only, with unavailable reasons allowed for blocked route/action states. Do not run remote Supabase migration apply, remote mutation, session Start, provider target lookup, live target lookup, liveChatMessages.list, Azure/OpenAI provider execution, deploy/upload, Stripe actions, main promotion, or public launch gate flip.
```

Approval label: `approved-fb-l3-allowed-tester-route-api-smoke`.

## Rollback Boundary

Rollback is not automatic. If a later approved run fails:

- keep public launch blocked;
- stop further route/API smoke commands;
- record sanitized blocker labels only;
- do not run cleanup SQL unless separately approved;
- do not run remote migration/mutation, provider/live execution, deploy/upload, Stripe action, main promotion, or public launch gate flip as rollback;
- if a route/action behavior needs correction, create a separate reviewed implementation PR.

## What Approval Would Prove

If approved and successful, this sequence can prove:

- an authenticated allowed tester can reach the reviewed route/API boundary;
- `POST /api/comment-translator/session` status returns a browser-safe session/usage state;
- server-owned feed/deletion/Creator locked action surfaces return sanitized states;
- unavailable provider/live states remain unavailable and do not call provider APIs;
- route/action output avoids forbidden private values and browser storage/handoff payload expansion.

## What Approval Would Not Prove

This sequence would not prove:

- FB-L2 remote/deployed durable enforcement;
- session Start;
- provider target lookup;
- live target lookup;
- `liveChatMessages.list`;
- non-empty live comment intake;
- Azure/OpenAI provider API execution;
- production/custom deploy freshness beyond the provided safe target label;
- Paid entitlement C1/C3;
- Stripe billing;
- Creator paid limits;
- main promotion;
- public launch gate flip.

## Completion Verification

Required closeout for this ready preflight:

- `node scripts/comment-translator-free-beta-allowed-tester-route-api-smoke-contract.mjs`
- changed-files no-secret scan
- `git diff --check`

App runtime/UI files are not changed by this preflight; this slice changes docs/task notes and the focused contract script only. `npm run lint`, `npx tsc --noEmit`, and `npm run build` are not required for the current verification baseline.

Width checks are skipped because this preflight does not change visible UI/CSS/layout/copy, rendered routes, browser storage, or runtime behavior.
