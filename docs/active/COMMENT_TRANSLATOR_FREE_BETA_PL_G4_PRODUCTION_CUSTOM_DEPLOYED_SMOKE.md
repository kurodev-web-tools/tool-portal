# Kuro Live Comment Translator Free Beta PL-G4 Production/Custom Deployed Smoke

Status: PL-G4 production/custom deployed smoke evidence rollup. Public-release capable: no.

Current execution result: complete for `preview-custom-url`.

Production/custom deployed smoke execution: completed for `preview-custom-url` with sanitized pass/count/status labels only.

This PL-G4 evidence rollup records the current sanitized state after the approved preview-custom deployed smoke. It records only labels/counts/statuses and does not include raw comments, screenshots containing raw comments, raw stdout/stderr, raw response bodies, browser storage payloads, provider target metadata, liveChatId, owner/internal ids, OAuth/token/cookie/header values, or credential values.

Historical blocker sections remain below for audit trail. The current Step 5 rollup supersedes the earlier `blocked-no-approval` PL-G4 status for the preview-custom URL only. The final main production domain remains unpromoted.

## Current Step 5 Evidence Rollup

| Evidence | Status |
| --- | --- |
| `pl_g4_preview_custom_smoke_status` | `pass` |
| `preview_target_label` | `preview-custom-url` |
| `allowed_tester_connection_status` | `pass` |
| `comment_retrieval_status` | `pass` |
| `translation_status` | `pass` |
| `cache_behavior_status` | `pass` |
| `diagnostics_status` | `pass` |
| `timezone_display_status` | `pass` |
| `stop_status` | `pass` |
| `main_production_domain_status` | `not-promoted` |
| `deploy_upload_status` | `not-run` |
| `public_gate_flip_status` | `not-run` |
| `raw_comment_capture_status` | `not-recorded` |
| `screenshot_with_raw_comments_status` | `not-recorded` |

Current PL-G4 decision: complete for preview custom URL only. This does not promote the main production domain, flip any public gate, apply a migration, mutate remote state, run Stripe/billing actions, or authorize public access.

## Purpose

PL-G4 is the execution-preflight/evidence slice for the FB-L5 production/custom deployed smoke public-launch gate. Its job is to either execute the approved deployed smoke inside the exact FB-L5 boundary, or stop with reviewed blocker evidence and a next safe action when approval/env gates are absent.

For this thread, the approval/env gates are absent. The safe outcome is a blocker record plus a focused contract that keeps the later execution route narrow, sanitized, and tied to the existing FB-L5 ready preflight.

## Execution Decision

- Decision: blocked-no-approval.
- Same-thread ready preflight: reviewed through `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PRODUCTION_CUSTOM_DEPLOYED_SMOKE_READY_PREFLIGHT.md`.
- Sanitized output review for an actual production/custom deployed smoke run: not present in this thread.
- Exact explicit approval: not present in this thread.
- Required approval label: `approved-fb-l5-production-custom-deployed-smoke`.
- Operator-local env references required for a later run: `COMMENT_TRANSLATOR_DEPLOYED_ORIGIN`, `COMMENT_TRANSLATOR_DEPLOYED_VERSION_LABEL`, and `COMMENT_TRANSLATOR_ALLOWED_TESTER_COOKIE`.
- Operator-local env values: not requested, printed, stored, or documented.
- Deployed target freshness: not-run / approval-gated.
- Reviewed integration branch match: not-run / approval-gated.
- Allowed-tester route/UI reachability: not-run / approval-gated.
- Status-only session API: not-run / approval-gated.
- Usage/deletion/Creator locked gate status: not-run / approval-gated.
- Start-to-translation gate status: not-run / approval-gated.
- Public launch decision: unchanged, `public-release capable: no`.

## Inspected Inputs

- `task.md`
- `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PRODUCTION_CUSTOM_DEPLOYED_SMOKE_EVIDENCE.md`
- `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PRODUCTION_CUSTOM_DEPLOYED_SMOKE_READY_PREFLIGHT.md`
- `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G3_START_TO_TRANSLATION_SMOKE.md`
- `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_USABILITY_PREFLIGHT.md`
- `docs/active/COMMENT_TRANSLATOR_FREE_PUBLIC_BETA_FINAL_QA_READINESS.md`
- `docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md`
- `app/api/comment-translator/session/route.ts`
- `app/tools/comment-translator/actions.ts`
- `components/comment-translator/CommentTranslatorDock.tsx`
- `scripts/comment-translator-free-beta-production-custom-deployed-smoke-contract.mjs`

## Production/Custom Deployed Boundary

Allowed PL-G4 sequence after exact approval:

1. local deterministic PL-G4 contract baseline;
2. reviewed integration branch head check for `codex/comment-translator-free-public-beta-integration`;
3. safe deployed target label and safe deployment/version label comparison where the FB-L5 ready preflight allows it;
4. deployed route reachability for `/tools/comment-translator/` without browser storage inspection;
5. allowed-tester route/UI reachability with visible state label only;
6. status-only session API check through `POST /api/comment-translator/session` with `{"intent":"status"}` only;
7. usage/deletion/Creator locked gate status labels through reviewed server-owned surfaces when an approved harness exists;
8. Start-to-translation gate status label only within the approved FB-L5 boundary;
9. blocker labels for missing target, stale deployment, missing allowed-tester session, incomplete output review, private launch denial, unavailable durable state, or sanitized-output violation.

Out of scope for PL-G4 unless a later exact same-thread approval explicitly expands scope:

- PL-G2 route/API smoke rerun or expansion;
- PL-G3 Start-to-translation smoke execution;
- session Start;
- provider target lookup;
- live target lookup;
- `liveChatMessages.list`;
- Azure/OpenAI provider execution;
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
- safe deployed target label;
- safe deployment/version label;
- reviewed integration branch label;
- visible state label;
- session/feed/usage/deletion/Creator locked status label;
- Start-to-translation gate status label;
- count;
- stop reason;
- unavailable reason;
- source attribution label;
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

Evidence stays counts/status/stop reasons only, with safe deployed target label, safe deployment/version label, unavailable reason, source attribution label, and pass/fail allowed. The later run must keep no browser storage expansion and no handoff payload expansion.

## Blocker Evidence

| Item | State |
| --- | --- |
| PL-G4 decision | blocked-no-approval |
| required approval label | `approved-fb-l5-production-custom-deployed-smoke` |
| same-thread exact approval | absent |
| sanitized output review for actual deployed target browser/API output | absent |
| operator-local env references | blocked-missing-env-or-operator-local-references |
| deployed target freshness | not-run / approval-gated |
| reviewed integration branch match | not-run / approval-gated |
| allowed-tester route/UI reachability | not-run / approval-gated |
| status-only session API | not-run / approval-gated |
| usage/deletion/Creator locked gate status | not-run / approval-gated |
| Start-to-translation gate status | not-run / approval-gated |
| browser storage expansion | no browser storage expansion |
| handoff payload expansion | no handoff payload expansion |
| public launch decision | Public-release capable: no |

## Ready Preflight For Later Execution

Do not run these commands until same-thread ready preflight, sanitized output review, and exact explicit approval are all present.

Local deterministic baseline:

```powershell
node scripts/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke-contract.mjs
node scripts/comment-translator-free-beta-production-custom-deployed-smoke-contract.mjs
git rev-parse origin/codex/comment-translator-free-public-beta-integration
```

Deployment/version label comparison, deployed route reachability, authenticated status-only route/API, allowed-tester browser route/UI confirmation, and optional server-owned action status harness must follow the exact command sequence and abort rules in `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PRODUCTION_CUSTOM_DEPLOYED_SMOKE_READY_PREFLIGHT.md`.

## What This Proves

This PL-G4 record proves:

- the existing FB-L5 ready preflight and exact approval label were reviewed;
- the current thread does not have approval/env/output-review gates for actual production/custom deployed smoke execution;
- the later approved command boundary is limited to deployed target freshness, reviewed integration branch match, allowed-tester route/UI reachability, status-only session API, usage/deletion/Creator locked gate status, and Start-to-translation gate status;
- the allowed evidence shape is counts/status/stop reasons only, with safe deployed target label, safe deployment/version label, unavailable reason, source attribution label, and pass/fail allowed;
- public launch remains blocked.

## What This Does Not Prove

This record does not prove production/custom deployed behavior because the smoke execution remains not-run / approval-gated. It also does not prove:

- actual deployed target freshness;
- actual reviewed integration branch match on deployed target;
- allowed-tester cookie/session validity;
- allowed-tester route/UI reachability;
- deployed status route/API behavior;
- deployed usage/deletion/Creator locked gate status;
- deployed Start-to-translation gate status;
- remote Supabase migration apply;
- remote Supabase mutation;
- deployed durable session/usage smoke;
- authenticated allowed-tester route/API smoke execution;
- Start-to-translation smoke execution;
- provider target lookup;
- live target lookup;
- `liveChatMessages.list`;
- non-empty live comment intake;
- Azure/OpenAI provider API execution;
- deploy/upload;
- Stripe live actions;
- billing setting mutation;
- Paid entitlement C1/C3;
- Creator paid limits;
- main promotion;
- limited public beta open;
- public launch gate flip.

## Unchecked Scope And Residual Risk

Unchecked scope:

- production/custom deployed smoke execution: not-run / approval-gated;
- deployed target freshness: not-run / approval-gated;
- reviewed integration branch match on deployed target: not-run / approval-gated;
- allowed-tester cookie/session validity: not-run / approval-gated;
- allowed-tester route/UI reachability: not-run / approval-gated;
- status-only session API: not-run / approval-gated;
- deployed usage/deletion/Creator locked gate status: not-run / approval-gated;
- deployed Start-to-translation gate status: not-run / approval-gated;
- remote Supabase migration apply: not-run / approval-gated;
- remote Supabase mutation: not-run / approval-gated;
- deployed durable session/usage smoke: not-run / approval-gated;
- authenticated allowed-tester route/API smoke execution: not-run / approval-gated;
- Start-to-translation smoke execution: not-run / approval-gated;
- provider target lookup: not-run / approval-gated;
- live target lookup: not-run / approval-gated;
- `liveChatMessages.list`: not-run / approval-gated;
- non-empty live comment intake: not-run / approval-gated;
- Azure/OpenAI provider API execution: not-run / approval-gated;
- deploy/upload: not-run / approval-gated;
- Stripe live actions and billing setting mutation: not-run / approval-gated;
- main promotion, limited public beta open, and public launch gate flip: not-run / approval-gated.

Residual risk: PL-G4 remains incomplete until a later same-thread approved operator-local run executes the exact FB-L5 production/custom deployed smoke boundary and records sanitized output only. Public-release capable remains no.

## Next Safe Action

The next safe action is a separate approval-gated execution turn that reviews this PL-G4 record and `docs/active/COMMENT_TRANSLATOR_FREE_BETA_PRODUCTION_CUSTOM_DEPLOYED_SMOKE_READY_PREFLIGHT.md`, confirms operator-local deployed target, deployment/version, and allowed-tester references without printing values, reviews the sanitized output shape, and receives the exact approval label `approved-fb-l5-production-custom-deployed-smoke` before any production/custom deployed smoke command is run.

If those gates remain unavailable, keep PL-G4 blocked and do not advance deployed target freshness, reviewed integration branch match, allowed-tester route/UI reachability, status-only session API, usage/deletion/Creator locked gate status, or Start-to-translation gate status as public-usability evidence.

## Completion Verification

Required PL-G4 closeout checks:

- `node scripts/comment-translator-free-beta-pl-g4-production-custom-deployed-smoke-contract.mjs`
- changed-files no-secret scan
- `git diff --check`

Runtime/UI files are not changed by PL-G4; this slice changes docs/task notes and a focused contract script only. `npm run lint`, `npx tsc --noEmit`, and `npm run build` are not required by the current verification baseline.

Width checks skipped because PL-G4 changes only docs/contract/task notes; there is no visible UI/CSS/layout/copy change, rendered route change, browser storage change, or client layout change.
