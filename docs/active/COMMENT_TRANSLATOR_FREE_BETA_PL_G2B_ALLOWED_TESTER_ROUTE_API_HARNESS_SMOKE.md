# Kuro Live Comment Translator Free Beta PL-G2B Allowed-Tester Route/API Harness Smoke

Status: PL-G2B allowed-tester route/API harness smoke execution preflight/evidence. Public-release capable: no.

Execution result: blocked-no-approval.

Authenticated allowed-tester route/API harness smoke execution: not-run / approval-gated.

This PL-G2B slice reviews the PL-G2A harness and FB-L3 ready preflight, then records the safe blocker because same-thread ready preflight, sanitized output review, exact explicit approval, and operator-local env references were not all present in this thread. It does not run session Start, Stop, heartbeat mutation, provider target lookup, live target lookup, `liveChatMessages.list`, Azure/OpenAI provider execution, deploy/upload, remote Supabase mutation/schema apply, Stripe action, billing setting mutation, limited public beta open, public launch gate flip, main promotion, or public launch gate change.

## Purpose

PL-G2B is the execution-preflight/evidence slice for PL-G2. Its job is to either execute the approved FB-L3 allowed-tester route/API smoke through the reviewed PL-G2A harness, or stop with a reviewed blocker and next safe action when the approval/env gates are absent.

For this thread, the approval/env gates are absent. The safe outcome is a blocker record plus a focused contract that keeps the later execution route narrow and sanitized.

## Execution Decision

- Decision: blocked-no-approval.
- Same-thread ready preflight: reviewed through `docs/active/COMMENT_TRANSLATOR_FREE_BETA_ALLOWED_TESTER_ROUTE_API_SMOKE_READY_PREFLIGHT.md`.
- Sanitized output review for an actual run: not present in this thread.
- Exact explicit approval: not present in this thread.
- Required approval label: `approved-fb-l3-allowed-tester-route-api-smoke`.
- Operator-local env references required for a later run: `COMMENT_TRANSLATOR_DEPLOYED_ORIGIN`, `COMMENT_TRANSLATOR_ALLOWED_TESTER_COOKIE`, and `COMMENT_TRANSLATOR_FREE_BETA_ROUTE_API_HARNESS_ENABLED`.
- Operator-local env values: not requested, printed, stored, or documented.
- Status route smoke: not-run / approval-gated.
- Harness route smoke: not-run / approval-gated.
- Public launch decision: unchanged, `public-release capable: no`.

## Inspected Inputs

- `task.md`
- `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G2A_SERVER_ACTION_ROUTE_API_HARNESS.md`
- `docs/active/COMMENT_TRANSLATOR_FREE_BETA_ALLOWED_TESTER_ROUTE_API_SMOKE_EVIDENCE.md`
- `docs/active/COMMENT_TRANSLATOR_FREE_BETA_ALLOWED_TESTER_ROUTE_API_SMOKE_READY_PREFLIGHT.md`
- `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_USABILITY_PREFLIGHT.md`
- `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G1_REMOTE_DURABLE_ENFORCEMENT_EXECUTION_EVIDENCE.md`
- `docs/active/COMMENT_TRANSLATOR_FREE_PUBLIC_BETA_FINAL_QA_READINESS.md`
- `docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md`
- `app/api/comment-translator/free-beta/route-api-harness/route.ts`
- `app/api/comment-translator/session/route.ts`
- `app/tools/comment-translator/actions.ts`

## Route And Harness Boundary

Allowed PL-G2B route/API surfaces:

- status route: `POST /api/comment-translator/session` with `{"intent":"status"}` only;
- harness route: `POST /api/comment-translator/free-beta/route-api-harness`;
- harness action surface: `getCommentTranslatorRealCommentsFeedAction`;
- harness action surface: `requestCommentTranslatorDataDeletionAction`;
- harness action surface: `getCommentTranslatorCreatorLockedWaitlistAction`;
- harness action surface: `recordCommentTranslatorCreatorLockedClickAction`.

The harness remains inert unless `COMMENT_TRANSLATOR_FREE_BETA_ROUTE_API_HARNESS_ENABLED` matches `approved-fb-l3-allowed-tester-route-api-smoke`, the `x-comment-translator-harness-approval` header is present with that same label, and the private launch allowed-tester gate passes.

Out of scope for PL-G2B: session Start, Stop, heartbeat mutation, provider target lookup, live target lookup, `liveChatMessages.list`, Azure/OpenAI provider execution, remote Supabase migration apply, remote Supabase mutation, deploy/upload, Stripe action, billing setting mutation, Paid entitlement C1/C3, Creator paid limits, limited public beta open, public launch gate flip, and main promotion.

## Sanitized Evidence Shape

Allowed evidence fields for a later approved run:

- command label;
- route/action name;
- HTTP status;
- session/feed/deletion/Creator locked status label;
- count;
- stop reason;
- unavailable reason;
- pass/fail.

Forbidden output/storage:

- secret/token/OAuth values;
- cookie values;
- Authorization header values;
- owner user id values;
- provider channel id values;
- credential reference values;
- provider target metadata;
- liveChatId;
- raw provider payloads;
- raw comments;
- server-only cursor values;
- browser storage payloads;
- raw action payloads;
- Stripe secret/billing identifiers;
- handoff payload expansion.

## Blocker Evidence

| Item | State |
| --- | --- |
| PL-G2B decision | blocked-no-approval |
| required approval label | `approved-fb-l3-allowed-tester-route-api-smoke` |
| same-thread exact approval | absent |
| sanitized output review for actual route/API output | absent |
| operator-local env references | blocked-missing-env-or-operator-local-references |
| status route smoke | not-run / approval-gated |
| harness route smoke | not-run / approval-gated |
| provider/live execution | not-run / approval-gated |
| remote Supabase mutation/schema apply | not-run / approval-gated |
| deploy/upload | not-run / approval-gated |
| public launch decision | Public-release capable: no |

## Ready Preflight For Later Execution

Do not run these commands until same-thread ready preflight, sanitized output review, and exact explicit approval are all present.

Local deterministic baseline:

```powershell
node scripts/comment-translator-free-beta-pl-g2b-allowed-tester-route-api-harness-smoke-contract.mjs
```

Status route smoke, approval-gated:

```powershell
curl.exe --fail-with-body --silent --show-error --request POST "$env:COMMENT_TRANSLATOR_DEPLOYED_ORIGIN/api/comment-translator/session" --header "Cookie: $env:COMMENT_TRANSLATOR_ALLOWED_TESTER_COOKIE" --header "Content-Type: application/json" --data "{\"intent\":\"status\"}"
```

Harness route smoke, approval-gated:

```powershell
curl.exe --fail-with-body --silent --show-error --request POST "$env:COMMENT_TRANSLATOR_DEPLOYED_ORIGIN/api/comment-translator/free-beta/route-api-harness" --header "Cookie: $env:COMMENT_TRANSLATOR_ALLOWED_TESTER_COOKIE" --header "Content-Type: application/json" --header "x-comment-translator-harness-approval: approved-fb-l3-allowed-tester-route-api-smoke" --data "{}"
```

The required harness env gate for that later deployed target is `COMMENT_TRANSLATOR_FREE_BETA_ROUTE_API_HARNESS_ENABLED=approved-fb-l3-allowed-tester-route-api-smoke`. The value may be confirmed by the operator-local environment only; do not print or document deployment-private env values.

## What This Proves

This PL-G2B record proves:

- the status route and PL-G2A harness route were reviewed as the correct FB-L3 route/API surfaces;
- the later approved command boundary is limited to status-only session route plus the four reviewed server-owned action surfaces;
- the exact approval label is documented as `approved-fb-l3-allowed-tester-route-api-smoke`;
- the safe blocker is recorded because actual approval/env/output-review gates were not complete in this thread;
- public launch remains blocked.

## What This Does Not Prove

This record does not prove authenticated deployed route/API behavior because the smoke execution remains not-run / approval-gated. It also does not prove:

- allowed-tester cookie/session validity;
- deployed target behavior;
- session Start;
- provider target lookup;
- live target lookup;
- `liveChatMessages.list`;
- non-empty live comment intake;
- Azure/OpenAI provider API execution;
- production/custom deployed freshness beyond the referenced route plan;
- Paid entitlement C1/C3;
- Stripe billing;
- Creator paid limits;
- limited public beta open;
- main promotion;
- public launch gate flip.

## Unchecked Scope And Residual Risk

Unchecked scope:

- authenticated allowed-tester route/API smoke execution: not-run / approval-gated;
- allowed-tester cookie/session validity: not-run / approval-gated;
- deployed route/API target behavior: not-run / approval-gated;
- status route response: not-run / approval-gated;
- harness route response: not-run / approval-gated;
- provider target lookup: not-run / approval-gated;
- live target lookup: not-run / approval-gated;
- `liveChatMessages.list`: not-run / approval-gated;
- Azure/OpenAI provider API execution: not-run / approval-gated;
- remote Supabase mutation/schema apply: not-run / approval-gated;
- deploy/upload: not-run / approval-gated;
- Stripe live actions and billing setting mutation: not-run / approval-gated;
- main promotion, limited public beta open, and public launch gate flip: not-run / approval-gated.

Residual risk: PL-G2 remains incomplete until a later same-thread approved operator-local run executes both the status route and the PL-G2A harness route against the deployed allowed-tester boundary and records sanitized output only. Public release remains blocked.

## Next Safe Action

The next safe action is a separate approval-gated execution turn that reviews this PL-G2B record and `docs/active/COMMENT_TRANSLATOR_FREE_BETA_ALLOWED_TESTER_ROUTE_API_SMOKE_READY_PREFLIGHT.md`, confirms the operator-local env references without printing values, reviews the sanitized output shape, and receives the exact approval label `approved-fb-l3-allowed-tester-route-api-smoke` before any route/API smoke command is run.

If those gates remain unavailable, keep PL-G2 blocked and do not advance route/API smoke as public-usability evidence.

## Completion Verification

Required PL-G2B closeout checks:

- `node scripts/comment-translator-free-beta-pl-g2b-allowed-tester-route-api-harness-smoke-contract.mjs`
- changed-files no-secret scan
- `git diff --check`

Runtime/UI files are not changed by PL-G2B; this slice changes docs/task notes and a focused contract script only. `npm run lint`, `npx tsc --noEmit`, and `npm run build` are not required by the current verification baseline.

Width checks skipped because PL-G2B changes only docs/contract/task notes; there is no visible UI/CSS/layout/copy change, rendered route change, browser storage change, or client layout change.
