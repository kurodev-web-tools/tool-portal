# Kuro Live Comment Translator Free Beta PL-G3 Start-to-translation Smoke

Status: PL-G3 Start-to-translation smoke execution preflight/evidence. Public-release capable: no.

Execution result: blocked-no-approval.

Start-to-translation smoke execution: not-run / approval-gated.

This PL-G3 slice reviews the existing FB-L4 ready preflight and source boundaries, then records the safe blocker because same-thread ready preflight, sanitized output review, exact explicit approval, and operator-local env references were not all present in this thread. It does not run status route smoke, explicit Start, server-only live target lookup, one bounded `liveChatMessages.list` polling step, Free Azure translation, UI feed confirmation, Stop, deploy/upload, remote Supabase mutation/schema apply, Stripe action, billing setting mutation, limited public beta open, public launch gate flip, main promotion, OpenAI provider execution, or any provider/live execution.

## Purpose

PL-G3 is the execution-preflight/evidence slice for the FB-L4 Start-to-translation public-launch gate. Its job is to either execute the approved Start-to-translation smoke inside the exact FB-L4 boundary, or stop with reviewed blocker evidence and a next safe action when approval/env gates are absent.

For this thread, the approval/env gates are absent. The safe outcome is a blocker record plus a focused contract that keeps the later execution route narrow, sanitized, and tied to the existing FB-L4 ready preflight.

## Execution Decision

- Decision: blocked-no-approval.
- Same-thread ready preflight: reviewed through `docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_READY_PREFLIGHT.md`.
- Sanitized output review for an actual run: not present in this thread.
- Exact explicit approval: not present in this thread.
- Required approval label: `approved-fb-l4-start-to-translation-smoke`.
- Operator-local env references required for a later run: `COMMENT_TRANSLATOR_DEPLOYED_ORIGIN`, `COMMENT_TRANSLATOR_ALLOWED_TESTER_COOKIE`, and `COMMENT_TRANSLATOR_CREDENTIAL_REFERENCE`.
- Operator-local env values: not requested, printed, stored, or documented.
- Status route precheck: not-run / approval-gated.
- Explicit Start: not-run / approval-gated.
- Server-only live target lookup: not-run / approval-gated.
- One bounded `liveChatMessages.list` polling step: not-run / approval-gated.
- Non-empty live comment intake: not-run / approval-gated.
- Free Azure translation: not-run / approval-gated.
- UI feed / usage / stop reason / source attribution confirmation: not-run / approval-gated.
- Explicit Stop: not-run / approval-gated.
- Public launch decision: unchanged, `public-release capable: no`.

## Inspected Inputs

- `task.md`
- `docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_EVIDENCE.md`
- `docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_READY_PREFLIGHT.md`
- `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G2B_ALLOWED_TESTER_ROUTE_API_HARNESS_SMOKE.md`
- `docs/active/COMMENT_TRANSLATOR_FREE_BETA_ALLOWED_TESTER_ROUTE_API_SMOKE_EVIDENCE.md`
- `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_USABILITY_PREFLIGHT.md`
- `docs/active/COMMENT_TRANSLATOR_FREE_PUBLIC_BETA_FINAL_QA_READINESS.md`
- `docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md`
- `app/api/comment-translator/session/route.ts`
- `app/tools/comment-translator/actions.ts`
- `lib/comment-translator-server-only-live-chat-target-lookup.ts`
- `lib/comment-translator-bounded-live-chat-polling-wiring.ts`
- `lib/comment-translator-azure-normal-translation-execution.ts`
- `components/comment-translator/CommentTranslatorDock.tsx`
- `scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs`

## Start-to-translation Boundary

Allowed PL-G3 sequence after exact approval:

1. local deterministic PL-G3 contract baseline;
2. status route / session state precheck where the existing FB-L4 preflight allows it;
3. explicit Start through `POST /api/comment-translator/session` or `startCommentTranslatorSessionAction`;
4. server-only live target lookup after Start with target presence label only;
5. one bounded `liveChatMessages.list` polling step with polling interval label and no broad loop;
6. non-empty live comment intake summarized as returned count and eligible count only;
7. Free Azure translation summarized as route label, translated count, skipped count, and error count;
8. UI feed confirmation that records visible state, usage, stop reason, and source attribution labels only;
9. explicit Stop or bounded abort before any repeated provider work.

Out of scope for PL-G3 without a later exact same-thread approval that expands scope:

- PL-G2 route/API smoke rerun or expansion;
- broad polling loop beyond one bounded step;
- provider target metadata output;
- live target metadata output;
- additional `liveChatMessages.list` loops;
- OpenAI provider execution;
- deploy/upload;
- remote Supabase mutation/schema apply;
- Stripe actions;
- billing setting mutation;
- Paid entitlement C1/C3;
- Creator paid limits;
- main promotion;
- limited public beta open;
- public launch gate flip.

## Sanitized Evidence Shape

Allowed evidence fields for a later approved run:

- command label;
- route/action name;
- HTTP status;
- session state/status label;
- target presence label only;
- returned count;
- eligible count;
- translated count;
- skipped count;
- error count;
- polling interval label;
- usage count / Free cap label;
- stop reason;
- source attribution label;
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
| PL-G3 decision | blocked-no-approval |
| required approval label | `approved-fb-l4-start-to-translation-smoke` |
| same-thread exact approval | absent |
| sanitized output review for actual Start/live/provider/UI output | absent |
| operator-local env references | blocked-missing-env-or-operator-local-references |
| status route / session state precheck | not-run / approval-gated |
| explicit Start | not-run / approval-gated |
| server-only live target lookup | not-run / approval-gated |
| one bounded `liveChatMessages.list` polling step | not-run / approval-gated |
| Free Azure translation | not-run / approval-gated |
| UI feed / usage / stop reason / source attribution | not-run / approval-gated |
| browser storage expansion | no browser storage expansion |
| handoff payload expansion | no handoff payload expansion |
| public launch decision | Public-release capable: no |

## Ready Preflight For Later Execution

Do not run these commands until same-thread ready preflight, sanitized output review, and exact explicit approval are all present.

Local deterministic baseline:

```powershell
node scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-contract.mjs
node scripts/comment-translator-free-beta-approved-start-to-translation-smoke-contract.mjs
```

Status route precheck, approval-gated:

```powershell
curl.exe --fail-with-body --silent --show-error --request POST "$env:COMMENT_TRANSLATOR_DEPLOYED_ORIGIN/api/comment-translator/session" --header "Cookie: $env:COMMENT_TRANSLATOR_ALLOWED_TESTER_COOKIE" --header "Content-Type: application/json" --data "{\"intent\":\"status\"}"
```

Explicit Start, approval-gated:

```powershell
curl.exe --fail-with-body --silent --show-error --request POST "$env:COMMENT_TRANSLATOR_DEPLOYED_ORIGIN/api/comment-translator/session" --header "Cookie: $env:COMMENT_TRANSLATOR_ALLOWED_TESTER_COOKIE" --header "Content-Type: application/json" --data "{\"intent\":\"start\",\"credentialReferenceId\":\"$env:COMMENT_TRANSLATOR_CREDENTIAL_REFERENCE\"}"
```

Server-only live target lookup, one bounded polling step, Free Azure translation, UI feed confirmation, and explicit Stop must follow the exact command sequence and abort rules in `docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_READY_PREFLIGHT.md`.

## What This Proves

This PL-G3 record proves:

- the existing FB-L4 ready preflight and exact approval label were reviewed;
- the current thread does not have approval/env/output-review gates for actual Start-to-translation execution;
- the later approved command boundary is limited to status precheck, explicit Start, server-only live target lookup, one bounded polling step, Free Azure translation, UI feed confirmation, and Stop;
- the allowed evidence shape is counts/status/stop reasons only, with target presence, polling interval, usage, unavailable reason, and source attribution labels allowed;
- public launch remains blocked.

## What This Does Not Prove

This record does not prove Start-to-translation behavior because the smoke execution remains not-run / approval-gated. It also does not prove:

- allowed-tester cookie/session validity;
- deployed route/API target behavior;
- explicit Start;
- provider target lookup;
- live target lookup;
- `liveChatMessages.list`;
- non-empty live comment intake;
- Azure/OpenAI provider API execution;
- UI feed rendering on an authenticated deployed target;
- production/custom deployed freshness;
- Paid entitlement C1/C3;
- Stripe billing;
- Creator paid limits;
- limited public beta open;
- main promotion;
- public launch gate flip.

## Unchecked Scope And Residual Risk

Unchecked scope:

- Start-to-translation smoke execution: not-run / approval-gated;
- status route / session state precheck: not-run / approval-gated;
- explicit Start: not-run / approval-gated;
- server-only live target lookup: not-run / approval-gated;
- one bounded `liveChatMessages.list` polling step: not-run / approval-gated;
- non-empty live comment intake: not-run / approval-gated;
- Free Azure translation: not-run / approval-gated;
- UI feed / usage / stop reason / source attribution confirmation: not-run / approval-gated;
- explicit Stop: not-run / approval-gated;
- provider target lookup: not-run / approval-gated;
- deployed target behavior: not-run / approval-gated;
- deploy/upload: not-run / approval-gated;
- remote Supabase mutation/schema apply: not-run / approval-gated;
- Stripe live actions and billing setting mutation: not-run / approval-gated;
- main promotion, limited public beta open, and public launch gate flip: not-run / approval-gated.

Residual risk: PL-G3 remains incomplete until a later same-thread approved operator-local run executes the exact FB-L4 Start-to-translation boundary and records sanitized output only. Public-release capable remains no.

## Next Safe Action

The next safe action is a separate approval-gated execution turn that reviews this PL-G3 record and `docs/active/COMMENT_TRANSLATOR_FREE_BETA_APPROVED_START_TO_TRANSLATION_SMOKE_READY_PREFLIGHT.md`, confirms operator-local allowed-tester auth, credential, target, and deployment references without printing values, reviews the sanitized output shape, and receives the exact approval label `approved-fb-l4-start-to-translation-smoke` before any Start, live target lookup, polling, Azure, UI, or Stop command is run.

If those gates remain unavailable, keep PL-G3 blocked and do not advance Start-to-translation as public-usability evidence.

## Completion Verification

Required PL-G3 closeout checks:

- `node scripts/comment-translator-free-beta-pl-g3-start-to-translation-smoke-contract.mjs`
- changed-files no-secret scan
- `git diff --check`

Runtime/UI files are not changed by PL-G3; this slice changes docs/task notes and a focused contract script only. `npm run lint`, `npx tsc --noEmit`, and `npm run build` are not required by the current verification baseline.

Width checks skipped because PL-G3 changes only docs/contract/task notes; there is no visible UI/CSS/layout/copy change, rendered route change, browser storage change, or client layout change.
