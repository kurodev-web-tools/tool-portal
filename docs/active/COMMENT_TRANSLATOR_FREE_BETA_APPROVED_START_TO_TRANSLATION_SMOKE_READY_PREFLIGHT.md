# Kuro Live Comment Translator Free Beta Approved Start-to-translation Smoke Ready Preflight

Status: FB-L4 approved Start-to-translation smoke ready preflight. Public-release capable: no.

Execution state: preflight-ready; not-run in this thread.

This preflight prepares the exact command sequence for later approved Start-to-translation smoke. It does not run remote Supabase migration apply, remote Supabase mutation, deployed durable smoke, session Start, provider target lookup, live target lookup, liveChatMessages.list, Azure/OpenAI provider execution, deploy/upload, Stripe action, main promotion, or public launch gate flip.

No remote Supabase migration apply, no remote mutation, no deploy/upload, no provider/live execution, no Stripe action, no public launch gate flip, and no launch-gate change was executed by this ready preflight.

## Purpose

FB-L4 needs a narrow way to prove that an approved tester can explicitly Start a Free session and reach the first translated live-comment evidence boundary without exposing private values or accidentally expanding into remote schema, deploy, Stripe, paid entitlement, or public launch work.

This ready preflight defines the exact commands, required operator-local references, allowed output shape, abort rules, rollback boundary, and exact approval text for a later execution. It is safe to review because it records reference names and command shapes only.

## Execution Decision

- Ready preflight state: preflight-ready.
- Execution state: not-run in this thread.
- Start-to-translation smoke: not-run / approval-gated.
- Remote Supabase migration apply: not-run / approval-gated.
- Remote Supabase mutation: not-run / approval-gated.
- Provider/live/Azure/deploy/Stripe/main/public launch actions: not-run / approval-gated.

## Preconditions

Required before running any command below:

- Same-thread approval must use the exact approval label in this document.
- The operator must confirm the branch target is `codex/comment-translator-free-public-beta-integration`.
- The operator must confirm public launch remains blocked: `public-release capable: no`.
- The operator must confirm FB-L2 remote durable enforcement is either separately approved and recorded, or still blocked; FB-L4 must not run remote Supabase migration apply.
- The operator must confirm FB-L3 allowed-tester route/API smoke is either separately approved and recorded, or still blocked; FB-L4 must not treat FB-L3 as executed unless it is in the same approved sequence.
- The operator must provide an allowed-tester authenticated browser/session boundary through `COMMENT_TRANSLATOR_ALLOWED_TESTER_COOKIE` without printing the cookie value.
- The operator must provide a safe deployed app target label through `COMMENT_TRANSLATOR_DEPLOYED_ORIGIN` without printing private project values.
- The operator must provide a connected YouTube credential reference through `COMMENT_TRANSLATOR_CREDENTIAL_REFERENCE` without printing the value.
- The operator must confirm a safe owned live test target exists by reference only, without printing provider target metadata or target values.
- Sanitized output review must allow only command names, safe target labels, route/action names, HTTP status, status labels, target-presence labels, returned counts, eligible counts, translated counts, skipped counts, stop reasons, unavailable reasons, source attribution labels, and pass/fail state.

## Exact Command Sequence

Do not run these commands until same-thread ready preflight, sanitized output review, and exact explicit approval are all present.

Local deterministic baseline:

```powershell
node scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs
```

Authenticated status check:

```powershell
curl.exe --fail-with-body --silent --show-error --request POST "$env:COMMENT_TRANSLATOR_DEPLOYED_ORIGIN/api/comment-translator/session" --header "Cookie: $env:COMMENT_TRANSLATOR_ALLOWED_TESTER_COOKIE" --header "Content-Type: application/json" --data "{\"intent\":\"status\"}"
```

Explicit Start command, approval-gated:

```powershell
curl.exe --fail-with-body --silent --show-error --request POST "$env:COMMENT_TRANSLATOR_DEPLOYED_ORIGIN/api/comment-translator/session" --header "Cookie: $env:COMMENT_TRANSLATOR_ALLOWED_TESTER_COOKIE" --header "Content-Type: application/json" --data "{\"intent\":\"start\",\"credentialReferenceId\":\"$env:COMMENT_TRANSLATOR_CREDENTIAL_REFERENCE\"}"
```

Server-only live target lookup command review and execution, approval-gated:

```powershell
node scripts/comment-translator-youtube-live-chat-target-lookup-command.mjs --check-env-only --json
node scripts/comment-translator-youtube-live-chat-target-lookup-command.mjs --check-token-material-availability --json
node scripts/comment-translator-youtube-live-chat-target-lookup-command.mjs --execute --approved-live-chat-target-lookup --json
```

Bounded liveChatMessages.list polling command review and one-step execution, approval-gated:

```powershell
node scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs --check-env-only --json
node scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs --check-token-material-availability --json
node scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs --execute --approved-live-chat-polling-smoke --json
```

Optional sanitized empty-intake diagnostic follow-up, approval-gated:

```powershell
node scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs --execute --approved-live-chat-polling-diagnostics --json
```

This diagnostic command is not part of the normal FB-L4 Start-to-translation smoke. It is a later empty-intake or non-2xx root-cause helper only: it performs one bounded `liveChatMessages.list` read, returns sanitized metadata with status label `live-chat-polling-diagnostics-sanitized-result`, target presence label, provider route label, HTTP status, provider status label (`provider-ok`, `provider-auth-rejected`, `provider-permission-rejected`, or `provider-http-error`), provider error reason/class label (`provider-error-reason-not-returned`, `provider-insufficient-permission`, `provider-live-chat-disabled`, `provider-live-chat-ended`, `provider-quota-or-rate-limited`, `provider-forbidden`, or `provider-error-reason-other`), returned count, pageInfo total label/count, polling interval label, nextPageToken presence label, item type distribution counts, unavailable reason label, and pass/fail only. Wrapper pass condition is HTTP 2xx / provider status label `provider-ok`; HTTP 401 maps to `provider-auth-rejected`, HTTP 403 maps to `provider-permission-rejected`, and other non-2xx responses map to `provider-http-error`. It must not output raw provider payloads, raw provider error messages, raw provider error reason values, raw comments, liveChatId, server-only cursor values, Authorization headers, token values, owner user id values, provider channel id values, credential reference values, provider target metadata, or browser storage payloads. It must not proceed to Free Azure translation, UI/feed confirmation, additional polling loops, deploy/upload, remote mutation, Stripe actions, main promotion, or public launch gate flip.

Target lookup diagnostic output should also stay sanitized while exposing enough candidate/selection shape to detect a wrong target selection: returned count, usable target count, selected target source label, selected target rank label, selected target presence label, and lifecycle/privacy distribution labels/counts. It must not output provider title, channel id, broadcast id, liveChatId, owner id, raw payload, or raw metadata.

Free Azure translation and combined live/provider smoke command review, approval-gated:

```powershell
node scripts/comment-translator-private-gated-live-provider-smoke-execution-harness.mjs --check-env-only
node scripts/comment-translator-private-gated-live-provider-smoke-execution-harness.mjs --print-exact-command-review
node scripts/comment-translator-private-gated-live-provider-smoke-execution-harness.mjs --execute --approved-private-gated-live-provider-smoke --use-operator-local-runtime-adapters --operator-local-ready-preflight-reviewed
```

UI feed confirmation is browser/manual and must record only:

- route path;
- safe target label;
- width label if visible UI verification is explicitly approved in the execution turn;
- visible state label;
- usage status label;
- stop reason label;
- source attribution label;
- translated count and skipped count;
- console error count.

Explicit Stop command, approval-gated and required before closeout if Start succeeds:

```powershell
curl.exe --fail-with-body --silent --show-error --request POST "$env:COMMENT_TRANSLATOR_DEPLOYED_ORIGIN/api/comment-translator/session" --header "Cookie: $env:COMMENT_TRANSLATOR_ALLOWED_TESTER_COOKIE" --header "Content-Type: application/json" --data "{\"intent\":\"stop\"}"
```

Route boundary: `POST /api/comment-translator/session`.

Allowed payload labels for review: `{"intent":"start"}` and `{"intent":"stop"}`. Status preflight uses `{"intent":"status"}`.

The Start/Stop commands can create or update `comment_translator_sessions` and `comment_translator_usage_ledger_events`. They must not run without exact approval. The provider commands can run live target lookup, liveChatMessages.list, and Free Azure provider execution. They must not run without exact approval and sanitized output review.

## Sanitized Output Review

Allowed output after a later approved run:

- command name;
- safe target label;
- route/action name;
- HTTP status;
- session status label;
- target-presence label;
- provider route label;
- returned count;
- eligible count;
- translated count;
- skipped count;
- usage count or Free cap label;
- stop reason label;
- unavailable reason;
- source attribution label;
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

Abort before Start-to-translation smoke if:

- the allowed-tester cookie/session boundary is missing;
- the deployed target label is missing or ambiguous;
- the credential reference is missing or ambiguous;
- the owned live target cannot be confirmed by reference-only operator-local context;
- sanitized output review is incomplete;
- exact explicit approval is absent;
- any output contains a forbidden value;
- durable session or usage state is missing or unreadable and does not fail closed;
- any command would run remote Supabase migration apply or remote mutation;
- any command would deploy/upload, run Stripe action, promote to main, or flip the public launch gate;
- any command would expand into Paid entitlement C1/C3, Stripe billing, or Creator paid limits;
- the route/action output expands browser storage or handoff payload evidence;
- the polling step returns empty intake and the later Azure step would overclaim translated evidence.

## Approval Text

Exact approval required before execution:

```text
I approve running FB-L4 Start-to-translation smoke with approval label approved-fb-l4-start-to-translation-smoke, limited to the exact status, Start, server-only live target lookup, one bounded liveChatMessages.list polling step, Free Azure translation, UI feed confirmation, and Stop commands in docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_READY_PREFLIGHT.md. Keep output sanitized to counts/status/stop reasons only, with target-presence, unavailable-reason, and source-attribution labels allowed. Do not run remote Supabase migration apply, remote mutation, deploy/upload, Stripe actions, Paid entitlement C1/C3, Creator paid limits, main promotion, or public launch gate flip.
```

Approval label: `approved-fb-l4-start-to-translation-smoke`.

## Rollback Boundary

Rollback is not automatic. If a later approved run fails:

- keep public launch blocked;
- stop further Start/live/provider commands;
- run the Stop command only if Start succeeded and Stop is within the approved scope;
- record sanitized blocker labels only;
- do not run cleanup SQL unless separately approved;
- do not run remote migration/mutation, deploy/upload, Stripe action, main promotion, or public launch gate flip as rollback;
- if a route/action/provider behavior needs correction, create a separate reviewed implementation PR.

## What Approval Would Prove

If approved and successful, this sequence can prove:

- an authenticated allowed tester can explicitly Start the reviewed Free session route/action;
- durable session and usage state are readable enough for Start, or fail closed with sanitized output;
- the server can resolve an owned live target after Start using server-only live target lookup;
- one bounded liveChatMessages.list step can return non-empty intake;
- eligible comments can be translated through the Free Azure route;
- browser-visible feed rows can show translated content state, usage, stop reason, and source attribution without forbidden private values;
- Stop can close the bounded smoke without keeping provider work running.

## What Approval Would Not Prove

This sequence would not prove:

- unlimited or continuous polling;
- public traffic readiness;
- FB-L2 remote migration/apply safety unless separately approved and recorded;
- FB-L3 route/API smoke unless included in the same approval scope and recorded separately;
- production/custom deploy freshness beyond the provided safe target label;
- Paid entitlement C1/C3;
- Stripe billing;
- Creator paid limits;
- main promotion;
- public launch gate flip.

## Completion Verification

Required closeout for this ready preflight:

- `node scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs`
- changed-files no-secret scan
- `git diff --check`

App runtime/UI files are not changed by this preflight; this slice changes docs/task notes and the focused contract script only. `npm run lint`, `npx tsc --noEmit`, and `npm run build` are not required for the current verification baseline.

Width checks are skipped because this preflight does not change visible UI/CSS/layout/copy, rendered routes, browser storage, or runtime behavior.
