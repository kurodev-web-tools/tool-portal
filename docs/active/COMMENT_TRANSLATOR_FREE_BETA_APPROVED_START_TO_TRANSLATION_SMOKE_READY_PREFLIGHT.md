# Kuro Live Comment Translator Free Beta Approved Start-to-translation Smoke Ready Preflight

Status: FB-L4 approved Start-to-translation smoke ready preflight plus partial continuation execution evidence. Public-release capable: no.

Execution state: partial execution recorded after same-thread exact approval; counts/source/UI evidence still blocked.

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

This diagnostic command is not part of the normal FB-L4 Start-to-translation smoke. It is a later empty-intake or non-2xx root-cause helper only: it performs one bounded `liveChatMessages.list` read, returns sanitized metadata with status label `live-chat-polling-diagnostics-sanitized-result`, target presence label, provider route label, HTTP status, provider status label (`provider-ok`, `provider-auth-rejected`, `provider-permission-rejected`, or `provider-http-error`), provider error reason/class label (`provider-error-reason-not-returned`, `provider-insufficient-permission`, `provider-live-chat-disabled`, `provider-live-chat-ended`, `provider-quota-or-rate-limited`, `provider-forbidden`, or `provider-error-reason-other`), returned count, pageInfo total label/count, pageInfo resultsPerPage label/count, polling interval label, nextPageToken presence label, intake diagnostic label (`non-empty-returned-intake`, `empty-provider-ok-no-items`, `empty-provider-ok-next-page-present`, `empty-provider-ok-page-info-nonzero`, or `unavailable-provider-not-ok`), item type distribution counts, unavailable reason label, and pass/fail only. Wrapper pass condition is HTTP 2xx / provider status label `provider-ok`; HTTP 401 maps to `provider-auth-rejected`, HTTP 403 maps to `provider-permission-rejected`, and other non-2xx responses map to `provider-http-error`. It must not output raw provider payloads, raw provider error messages, raw provider error reason values, raw comments, liveChatId, server-only cursor values, Authorization headers, token values, owner user id values, provider channel id values, credential reference values, provider target metadata, or browser storage payloads. It must not proceed to Free Azure translation, UI/feed confirmation, additional polling loops, deploy/upload, remote mutation, Stripe actions, main promotion, or public launch gate flip.

For the current HTTP 403 provider-permission blocker, use `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_PROVIDER_PERMISSION_TRIAGE_PREFLIGHT.md` before any later approved retry. That provider-permission triage preflight is no-live docs/contracts/task only and keeps OAuth scope category, target live chat availability, owner/channel binding, provider permission state, and quota/rate-limit state checks value-free.

Target lookup diagnostic output should also stay sanitized while exposing enough candidate/selection shape to detect a wrong target selection: returned count, usable target count, selected target source label, selected target rank label, selected target presence label, and lifecycle/privacy distribution labels/counts. It must not output provider title, channel id, broadcast id, liveChatId, owner id, raw payload, or raw metadata.

After PR #513 next-page target-selection follow-up:

```text
approved-pl-g3-target-selection-diagnostics-after-pr513
```

Use this approval only for target-selection diagnostics after `empty-provider-ok-next-page-present`. Output must be category / label / pass-fail / unavailableReason only. Allowed categories are selected target rank, usable target count, selected target presence, selected target source, lifecycle/privacy distribution, and chat-surface mismatch hypothesis. This approval must not run Start, Stop, `liveChatMessages.list`, Azure/OpenAI provider execution, UI/feed confirmation, deploy/upload, remote mutation, Stripe action, main promotion, public access change, limited public beta open, or public launch gate flip. Output/docs must include no provider title, no broadcast id, no liveChatId, no raw cursor, no raw comments, no provider target metadata, no owner id, no channel id, no OAuth/token/cookie/credential values, no Authorization header, and no quota values.

After PR #516 empty-provider-ok next-page cursor diagnostics preparation:

```text
approved-pl-g3-empty-provider-ok-next-page-cursor-diagnostics-after-pr516
```

Use this approval only if the release owner wants one bounded next-page read only after a first-page diagnostics result has already returned provider-ok / returned count 0 / nextPageToken presence present. The diagnostic must use the same live target reference with server-only cursor consumed and never output. Output must be category / label / pass-fail / unavailableReason only. Allowed categories are page role label, provider route label, provider status label, HTTP status label, returned count, pageInfo total count, pageInfo resultsPerPage count, nextPageToken presence label, polling interval presence label, intake diagnostic label, item type distribution counts, public gate state label, and public-release capable label. This approval must not run Start, Stop, target lookup execution, Azure/OpenAI provider execution, UI/feed confirmation, deploy/upload, remote mutation, Stripe action, main promotion, public access change, limited public beta open, public launch gate flip, or a polling loop beyond the one bounded next-page read. Output/docs must include no raw cursor, no liveChatId, no provider target metadata, no raw provider payload, no raw comments, no provider title, no broadcast id, no owner id, no channel id, no OAuth/token/cookie/credential values, no Authorization header, no quota values, and no provider URL query values.

After PR #517, the reviewed command shape for that approval is:

```powershell
node scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs --execute --approved-live-chat-polling-next-page-diagnostics --json
```

The same command process must already contain the operator-local server-only live target reference, token material reference, owner-binding readiness references, and server-only next-page cursor reference. The command consumes the cursor only as a provider request parameter and returns cursor presence labels only; it must not output the cursor value.

After PR #519 first-page-to-next-page cursor diagnostics preparation:

```text
approved-pl-g3-first-page-to-next-page-cursor-diagnostics-after-pr519
```

Approval state in this thread: not present.

Use this approval only if the release owner wants a reviewed same-process diagnostic boundary because no operator-local next-page cursor reference is available. The command may perform one first-page `liveChatMessages.list` diagnostics read. If that first-page result has nextPageToken presence present, the command consumes that cursor in memory only and performs one bounded next-page read in the same process. The cursor value must never be printed, stored, documented, placed in PR text, exposed in a provider URL query in output, or added to handoff payloads. If the first page has nextPageToken presence absent, the next-page read is not run and the diagnostic remains blocked for Start-to-translation completion.

Reviewed command shape for that future approval:

```powershell
node scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs --execute --approved-live-chat-polling-first-page-to-next-page-diagnostics --json
```

The same command process must already contain the operator-local server-only live target reference, token material reference, owner-binding readiness references, and the value-free approval label reference `PL_G3_FIRST_PAGE_TO_NEXT_PAGE_CURSOR_DIAGNOSTICS_APPROVAL_LABEL=approved-pl-g3-first-page-to-next-page-cursor-diagnostics-after-pr519`. Output must be sanitized to first-page and next-page page role labels, provider route/status labels, HTTP status labels, returned counts, pageInfo total counts, pageInfo resultsPerPage counts, nextPageToken presence labels, polling interval presence labels, intake diagnostic labels, item type distribution counts, public gate state label, public-release capable label, pass/fail, and unavailableReason only. This approval must not run Start, Stop, target lookup execution, Azure/OpenAI provider execution, UI/feed confirmation, deploy/upload, remote mutation, Stripe action, main promotion, public access change, limited public beta open, public launch gate flip, cursor regeneration, or a polling loop beyond the one first-page read plus optional one next-page read.

After PR #521 between-pages fresh-comment diagnostics preparation:

```text
approved-pl-g3-between-pages-fresh-comment-diagnostics-after-pr521
```

Approval state in this thread: not present.

Use this future approval label only after a reviewed command boundary exists for a same-process first-page read, an operator fresh-comment window, and one bounded next-page read. The cursor must remain process-memory-only and must never be printed, stored, documented, placed into env, included in PR text, exposed in provider URL query output, or handed off. The same-process first-page-to-next-page command currently has no reviewed operator pause boundary, so do not run live/provider execution until that command gap is implemented and reviewed. The future reviewed command must keep output to page role labels, provider route/status labels, HTTP status labels, returned counts, pageInfo total/resultsPerPage counts, nextPageToken presence labels, polling interval presence labels, intake diagnostic labels, item type distribution counts, public gate state label, public-release capable label, pass/fail, and unavailableReason only. It must not run Start, Stop, target lookup execution, Azure/OpenAI provider execution, UI/feed confirmation, deploy/upload, remote mutation, Stripe action, main promotion, public access change, limited public beta open, public launch gate flip, cursor regeneration, or any polling loop beyond the reviewed two-read diagnostic boundary.

After PR #522 between-pages fresh-comment command preparation:

```powershell
$env:PL_G3_BETWEEN_PAGES_FRESH_COMMENT_DIAGNOSTICS_APPROVAL_LABEL='approved-pl-g3-between-pages-fresh-comment-diagnostics-after-pr521'
node scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs --execute --approved-live-chat-polling-between-pages-fresh-comment-diagnostics --json
```

Approval state in this thread: not present.

This reviewed command boundary performs one first-page `liveChatMessages.list` diagnostic read, emits only a sanitized operator instruction on stderr, waits for the operator to send one fresh visible chat comment and press Enter, then performs one bounded next-page read using the first-page cursor in process memory only. Stdout remains final JSON only. The cursor must never be printed, stored, documented, placed into env, included in PR text, exposed in provider URL query output, or handed off. Output remains limited to page role labels, provider route/status labels, HTTP status labels, returned counts, pageInfo total/resultsPerPage counts, nextPageToken presence labels, polling interval presence labels, intake diagnostic labels, item type distribution counts, operator fresh-comment window label, public gate state label, public-release capable label, pass/fail, and unavailableReason only. This approval must not run Start, Stop, target lookup execution, Azure/OpenAI provider execution, UI/feed confirmation, deploy/upload, remote mutation, Stripe action, main promotion, public access change, limited public beta open, public launch gate flip, cursor regeneration, or any polling loop beyond the reviewed two-read diagnostic boundary.

After PR #525 fresh-comment bounded short polling diagnostics preparation:

```text
approved-pl-g3-fresh-comment-bounded-short-polling-diagnostics-after-pr525
```

Approval state in this thread: not present.

Use this future approval label only after a reviewed command boundary exists for a fresh-comment-after-send diagnostic. The operator sends one fresh visible chat comment at the instructed point, then a very small bounded polling diagnostic may perform at most 2-3 pages/attempts and respect provider polling interval. It must stop on first non-empty sanitized intake, bounded-max-attempts-reached, provider-not-ok, or a missing readiness reference. Output remains limited to attempt/page role label, provider route/status labels, HTTP status label, returned count, pageInfo total/resultsPerPage counts, nextPageToken presence label, polling interval presence/count label, intake diagnostic label, item type distribution counts, bounded attempt count, stop reason label, operator fresh-comment window label, public gate state label, public-release capable label, pass/fail, and unavailableReason only. It must not output, store, document, or hand off cursor values, live target values, provider URL query values, raw comments, raw provider payloads, token/cookie/OAuth/Authorization values, owner ids, provider channel ids, quota values, provider target metadata, or browser storage payloads. This approval must not run Start, Stop, target lookup execution, Azure/OpenAI provider execution, UI/feed confirmation, deploy/upload, remote mutation, Stripe action, main promotion, public access change, limited public beta open, public launch gate flip, cursor regeneration, OAuth flows, token refresh, or any polling loop beyond the reviewed bounded short diagnostic.

After PR #526 fresh-comment bounded short polling command preparation:

```powershell
$env:PL_G3_FRESH_COMMENT_BOUNDED_SHORT_POLLING_DIAGNOSTICS_APPROVAL_LABEL='approved-pl-g3-fresh-comment-bounded-short-polling-diagnostics-after-pr525'
node scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs --execute --approved-live-chat-polling-fresh-comment-bounded-short-polling-diagnostics --json
```

Approval state in this thread: not present.

Value-free approval label reference: `PL_G3_FRESH_COMMENT_BOUNDED_SHORT_POLLING_DIAGNOSTICS_APPROVAL_LABEL=approved-pl-g3-fresh-comment-bounded-short-polling-diagnostics-after-pr525`.

The reviewed command boundary blocks before provider access unless the value-free approval label reference matches `approved-pl-g3-fresh-comment-bounded-short-polling-diagnostics-after-pr525`. When approved later, it emits only a sanitized operator instruction on stderr, waits for the operator to send one fresh visible chat comment and press Enter, then performs at most 3 bounded read attempts. It consumes next-page cursors in process memory only, waits for the provider polling interval between empty provider-ok attempts when a next-page cursor is present, and stops on first non-empty sanitized intake, bounded-max-attempts-reached, or provider-not-ok. Output remains limited to attempt/page role label, provider route/status labels, HTTP status label, returned count, pageInfo total/resultsPerPage counts, nextPageToken presence label, polling interval presence label, intake diagnostic label, item type distribution counts, bounded attempt count, stop reason label, operator fresh-comment window label, public gate state label, public-release capable label, pass/fail, and unavailableReason only. This approval must not run Start, Stop, target lookup execution, Azure/OpenAI provider execution, UI/feed confirmation, deploy/upload, remote mutation, Stripe action, main promotion, public access change, limited public beta open, public launch gate flip, cursor regeneration, OAuth flows, token refresh, or any polling loop beyond the reviewed bounded short diagnostic.

After PR #529 same-process target-refresh command preparation:

The same-process target-refresh-to-bounded-polling diagnostic boundary is implemented for a future reviewed approval thread. The command performs target lookup and bounded polling in one command process while keeping live target and cursor values server-only and never outputting provider target metadata. It blocks before provider access unless the value-free approval label reference `PL_G3_SAME_PROCESS_TARGET_REFRESH_BOUNDED_POLLING_DIAGNOSTICS_APPROVAL_LABEL` matches `approved-pl-g3-same-process-target-refresh-to-bounded-polling-diagnostics-after-pr529`.

Reviewed future command shape:

```powershell
$env:PL_G3_SAME_PROCESS_TARGET_REFRESH_BOUNDED_POLLING_DIAGNOSTICS_APPROVAL_LABEL='approved-pl-g3-same-process-target-refresh-to-bounded-polling-diagnostics-after-pr529'
node scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs --execute --approved-live-chat-polling-same-process-target-refresh-bounded-short-polling-diagnostics --json
```

The future boundary keeps output limited to request shape labels, target-source labels, target-count labels, selected-target position/role labels, owner-binding status label, provider route/status labels, HTTP status label, returned count, pageInfo total/resultsPerPage counts, nextPageToken presence label, polling interval presence/count label, intake diagnostic label, item type distribution counts, bounded attempt count, stop reason label, operator window label, public gate state label, public-release capable label, pass/fail, and unavailableReason. It must not run Start, Stop, Azure/OpenAI provider execution, UI/feed confirmation, deploy/upload, remote mutation, Stripe action, main promotion, public access change, limited public beta open, public launch gate flip, cursor regeneration, OAuth flows, token refresh, or any polling loop beyond the reviewed diagnostic.

After PR #531 Start-to-translation continuation approval boundary:

Use this approval only if the release owner wants to continue PL-G3 from the recorded same-process target-refresh non-empty intake evidence into the remaining Start-to-translation proof. The exact approval label is `approved-pl-g3-start-to-translation-continuation-after-pr531`.

Exact approval required before execution:

```text
I approve running PL-G3 Start-to-translation continuation with approval label approved-pl-g3-start-to-translation-continuation-after-pr531, limited to the exact status, Start, server-only live target lookup, bounded liveChatMessages.list polling needed to preserve the non-empty intake path, Free Azure translation, UI feed confirmation, usage/source-attribution evidence, and Stop boundary in docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_READY_PREFLIGHT.md. Keep output sanitized to counts/status/stop reasons only, with target-presence, provider-route, unavailable-reason, usage/source-attribution, and public gate labels allowed. Do not run PL-G4, PL-G5, deploy/upload, remote mutation, public access changes, cursor regeneration, OAuth flows, token refresh, Stripe actions, Paid entitlement C1/C3, Creator paid limits, main promotion, or public launch gate flip. If polling returns empty intake, provider-not-ok, or a missing readiness reference, stop before Azure/UI and record sanitized blocker labels only.
```

This approval must not reuse the PR #531 diagnostic approval. It must be given in the current execution thread after reviewing this preflight and the sanitized #531 evidence. It must not output raw provider payloads, raw comments, target values, cursor values, provider target metadata, provider URL query values, liveChatId, owner user id, provider channel id, token/cookie/OAuth values, Authorization header values, quota values, or browser storage payloads.

Observed execution after this approval:

- status route precheck: executed / HTTP 200 / session status label `not-started`;
- explicit Start: executed / HTTP 200 / session status label `active`;
- combined server-only live/provider harness: executed / process exit 0;
- harness parse caveat: wrapper merged stdout/stderr and did not extract returned/eligible/translated/skipped counts or source-attribution labels;
- explicit Stop: executed / HTTP 200 / session status label `stopped`;
- post-Stop status: executed / HTTP 200 / session status label `not-started`;
- UI feed confirmation: not-run / blocked-counts-source-ui-evidence;
- public gate state label: unchanged / blocked;
- public-release capable label: no.

Raw stdout/stderr were not printed in the thread. Target values, cursor values, provider target metadata, provider URL query values, Authorization, secrets, raw provider payloads, raw comments, liveChatId, owner user id, provider channel id, quota values, and comment text were not recorded.

Free Azure translation and combined live/provider smoke command review, approval-gated. After PR #533, use the separated stdout/stderr wrapper for the provider harness step so stderr operator instructions or warnings cannot corrupt stdout final JSON parsing:

```powershell
node scripts/comment-translator-free-beta-pl-g3-sanitized-wrapper-after-pr533.mjs --check-env-only
node scripts/comment-translator-free-beta-pl-g3-sanitized-wrapper-after-pr533.mjs --print-exact-command-review
node scripts/comment-translator-free-beta-pl-g3-sanitized-wrapper-after-pr533.mjs --execute --approved-pl-g3-sanitized-wrapper-after-pr533 --reviewed-provider-harness-child
```

Wrapper boundary: captures node child stdout and stderr separately, parses only stdout final JSON, never prints raw stdout/stderr, and emits only command label, route/action/status labels, HTTP status labels when present, provider route/status labels, returned/eligible/translated/skipped counts, provider request/call counts, stop reason label, unavailableReason, usage/source-attribution labels/counts, public gate state label, public-release capable label, and pass/fail. Counts-source-UI evidence remains blocked until a later same-thread exact approved run records parsed counts, source-attribution labels, and browser-visible UI/feed confirmation.

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
