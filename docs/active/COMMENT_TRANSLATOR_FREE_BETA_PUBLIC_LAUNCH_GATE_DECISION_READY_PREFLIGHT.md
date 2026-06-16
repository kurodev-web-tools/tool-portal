# Kuro Live Comment Translator Free Beta Public Launch Gate Decision Ready Preflight

Status: FB-L6 public launch gate decision ready preflight. Public-release capable: no.

Execution state: preflight-ready; gate-change not-run in this thread.

This preflight prepares the exact release-owner decision record for Free beta public launch. It does not run remote Supabase migration apply, remote mutation, deploy/upload, production/custom deployed smoke execution, session Start, provider target lookup, live target lookup, liveChatMessages.list, Azure/OpenAI provider execution, Stripe action, main promotion, limited public beta open, or public launch gate flip.

No remote Supabase migration apply, no remote mutation, no deploy/upload, no provider/live execution, no Stripe action, no main promotion, no public launch gate flip, and no launch-gate change was executed by this ready preflight.

Execution exclusions: no remote Supabase migration apply, no remote mutation, no deploy/upload, no provider target lookup, no live target lookup, no liveChatMessages.list, no Azure/OpenAI provider execution, no Stripe action, no main promotion, and no public launch gate flip.

## Purpose

FB-L6 needs a narrow way for the release owner to record one of three public launch decisions without accidentally changing public access, executing remote/live/provider commands, or mixing in paid entitlement work.

This same-thread ready preflight defines the exact local baseline command, decision input checklist, allowed output shape, abort rules, rollback boundary, and exact explicit approval text for a later release-owner decision. It is safe to review because it records reference names and decision labels only.

## Preconditions

Required before recording any decision other than `keep blocked`:

- Same-thread approval must use one of the exact approval labels in this document.
- The approver must be the release owner for the Free beta public launch gate.
- The reviewed branch must be `codex/comment-translator-free-public-beta-integration`.
- Public launch must remain blocked unless the selected approval label explicitly authorizes `open limited public beta` or `flip public gate`.
- FB-L2 remote durable enforcement must be approved and recorded, or the release owner must explicitly accept the missing evidence as a launch risk.
- FB-L3 allowed-tester route/API smoke must be approved and recorded, or the release owner must explicitly accept the missing evidence as a launch risk.
- FB-L4 Start-to-translation smoke must be approved and recorded, or the release owner must explicitly accept the missing evidence as a launch risk.
- FB-L5 production/custom deployed smoke must be approved and recorded, or the release owner must explicitly accept the missing evidence as a launch risk.
- Sanitized output review must allow only doc paths, command names, safe branch labels, decision labels, gate state labels, status labels, counts, stop reasons, unavailable reasons, and pass/fail state.

## Exact Command Sequence

This local baseline is safe to run before a release-owner decision:

```powershell
node scripts/comment-translator-free-beta-public-launch-gate-decision-contract.mjs
```

Do not run any external, remote, deploy, provider, Stripe, main-promotion, or gate-change command from this preflight. A future gate-change operation must be a separate reviewed operation with its own exact command, rollback owner, and same-thread release-owner approval.

## Release-Owner Decision Inputs

The release owner must choose exactly one:

| Decision option | Approval label | Effect in this docs/contract slice |
| --- | --- | --- |
| keep blocked | `approved-fb-l6-keep-blocked-launch-gate-decision` | Records that public-release capable remains no and public launch gate remains unchanged. |
| open limited public beta | `approved-fb-l6-open-limited-public-beta` | Requires a separate reviewed access-change operation after accepted evidence/risks. This preflight does not execute it. |
| flip public gate | `approved-fb-l6-flip-public-gate` | Requires a separate reviewed gate-change operation after accepted evidence/risks. This preflight does not execute it. |

Current default without exact approval: `keep blocked / blocked-no-approval`.

## Approval Text

Exact approval to keep blocked:

```text
I approve recording FB-L6 public launch gate decision with approval label approved-fb-l6-keep-blocked-launch-gate-decision. Keep public-release capable: no. Keep the public launch gate unchanged. Do not run remote Supabase migration apply, remote mutation, deploy/upload, production/custom deployed smoke, session Start, provider target lookup, live target lookup, liveChatMessages.list, Azure/OpenAI provider execution, Stripe actions, main promotion, limited public beta open, or public launch gate flip.
```

Exact approval to open limited public beta:

```text
I approve recording FB-L6 public launch gate decision with approval label approved-fb-l6-open-limited-public-beta. I accept the referenced FB-L2 through FB-L5 evidence and residual risks for a limited public beta. Prepare a separate reviewed access-change operation with sanitized output only. Do not run remote Supabase migration apply, remote mutation, deploy/upload, provider/live execution, Stripe actions, main promotion, or public launch gate flip unless separately approved in that operation.
```

Exact approval to flip public gate:

```text
I approve recording FB-L6 public launch gate decision with approval label approved-fb-l6-flip-public-gate. I accept the referenced FB-L2 through FB-L5 evidence and residual risks for public gate flip. Prepare a separate reviewed gate-change operation with sanitized output only. Do not run remote Supabase migration apply, remote mutation, deploy/upload, provider/live execution, Stripe actions, or main promotion unless separately approved in that operation.
```

## Sanitized Output Review

Allowed output after a later approved decision:

- command name;
- doc path;
- safe branch label;
- release-owner decision label;
- public gate state label;
- public-release capable label;
- status label;
- unavailable reason;
- stop reason;
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

Abort before any decision other than `keep blocked` if:

- exact release-owner approval is absent;
- the chosen decision label is ambiguous;
- sanitized output review is incomplete;
- any output contains a forbidden value;
- FB-L2, FB-L3, FB-L4, or FB-L5 evidence is missing and the release owner has not explicitly accepted that residual risk;
- missing/unreadable durable state would be treated as open instead of fail closed;
- any command would run remote Supabase migration apply or remote mutation;
- any command would deploy/upload, run provider target lookup, run live target lookup, call liveChatMessages.list, execute Azure/OpenAI provider APIs, run Stripe action, promote to main, or change public access from inside this docs/contract preflight;
- any command would expand into Paid entitlement C1/C3, Stripe billing, or Creator paid limits.

## Rollback Boundary

Rollback is not automatic. If a later approved decision finds a blocker:

- keep public launch blocked;
- record sanitized blocker labels only;
- do not run cleanup SQL unless separately approved;
- do not run remote migration/mutation, deploy/upload, provider/live execution, Stripe action, main promotion, limited public beta open, or public launch gate flip as rollback;
- if access state must change, create a separate reviewed operation with explicit release-owner approval.

## What Approval Would Prove

If approved, this preflight can prove only that the release owner selected a decision label with the current evidence and residual risk record:

- `keep blocked`;
- `open limited public beta`;
- `flip public gate`.

It can also prove that the local contract and no-secret decision record passed before publication.

## What Approval Would Not Prove

This sequence would not prove:

- FB-L2 remote durable enforcement execution;
- FB-L3 allowed-tester route/API smoke execution;
- FB-L4 Start-to-translation smoke execution;
- FB-L5 production/custom deployed smoke execution;
- deployed target freshness;
- session Start;
- provider target lookup;
- live target lookup;
- `liveChatMessages.list`;
- non-empty live comment intake;
- Azure/OpenAI provider API execution;
- Paid entitlement C1/C3;
- Stripe billing;
- Creator paid limits;
- main promotion;
- a completed public launch gate flip.

## Completion Verification

Required closeout for this ready preflight:

- `node scripts/comment-translator-free-beta-public-launch-gate-decision-contract.mjs`
- changed-files no-secret scan
- `git diff --check`

App runtime/UI files are not changed by this preflight; this slice changes docs/task notes and the focused contract script only. `npm run lint`, `npx tsc --noEmit`, and `npm run build` are not required for the current verification baseline.

Width checks are skipped because this preflight does not change visible UI/CSS/layout/copy, rendered routes, browser storage, or runtime behavior.
