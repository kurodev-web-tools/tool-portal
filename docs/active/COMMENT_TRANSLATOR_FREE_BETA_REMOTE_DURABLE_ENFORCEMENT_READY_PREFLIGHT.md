# Kuro Live Comment Translator Free Beta Remote Durable Enforcement Ready Preflight

Status: FB-L2 remote/deployed durable enforcement ready preflight. Public-release capable: no.

Execution state: preflight-ready; not-run in this thread.

This preflight prepares the exact command sequence for later approved remote/deployed durable enforcement evidence. It does not run remote Supabase migration apply, remote Supabase mutation, deployed session smoke, deploy/upload, provider target lookup, live target lookup, `liveChatMessages.list`, Azure/OpenAI provider API execution, Stripe action, main promotion, or public launch gate flip.

No remote mutation/apply/deploy/provider/Stripe was executed by this ready preflight.

## Purpose

FB-L2 needs a narrow way to prove that Free beta durable enforcement works on the remote/deployed target without exposing private values or accidentally expanding into provider, Stripe, deploy, or public launch work.

This ready preflight defines the exact commands, required operator-local references, allowed output shape, abort rules, rollback boundary, and exact approval text for a later execution. It is safe to review because it records reference names and command shapes only.

## Execution Decision

- Ready preflight state: preflight-ready.
- Execution state: not-run in this thread.
- Phase A attempt state: phase-a-dry-run-reviewed-two-migrations-only after current-proof local baseline passed.
- Remote Supabase migration apply: not-run / approval-gated.
- Remote Supabase mutation: not-run / approval-gated.
- Deployed durable session/usage smoke: not-run / approval-gated.
- Deploy/upload/provider/Stripe/main/public launch actions: not-run / approval-gated.

## Preconditions

Required before running any command below:

- Same-thread approval must use the exact approval label in this document.
- The operator must confirm the branch target is `codex/comment-translator-free-public-beta-integration`.
- The operator must confirm the reviewed local migrations are exactly:
  - `20260615000000_comment_translator_sessions.sql`
  - `20260615001000_comment_translator_usage_ledger_events.sql`
- The operator must confirm the linked Supabase project target by safe target label only, not by printing private project values.
- The operator must confirm the deployed app target by safe target label only through `COMMENT_TRANSLATOR_DEPLOYED_ORIGIN`.
- The operator must provide an allowed-tester authenticated browser/session boundary through `COMMENT_TRANSLATOR_ALLOWED_TESTER_COOKIE` without printing the cookie value.
- The operator must provide a connected YouTube credential reference through `COMMENT_TRANSLATOR_CREDENTIAL_REFERENCE` without printing the value.
- Public launch must remain blocked: `public-release capable: no`.

## Exact Command Sequence

Do not run these commands until same-thread ready preflight, sanitized output review, and exact explicit approval are all present.

Current-proof local baseline:

```powershell
node scripts/comment-translator-free-beta-remote-durable-enforcement-evidence-contract.mjs
```

This current-proof local baseline directly checks the FB-L2 proof requirements:

- durable session store source;
- durable usage store source;
- public entitlement baseline source;
- route/action durable fail-closed wiring;
- FB-L2 evidence contract and ready preflight boundaries.

Historical F3/F4/F5/F12 contract drift is a residual risk, not a blocker for Phase A dry-run. Those older task-specific contracts still contain compact-board and earlier-limit assumptions, including `task.md` fixed wording and a pre-monthly-character-cap Free limit expectation. Refreshing those historical contracts should be a separate docs/contract maintenance slice, not part of this remote durable enforcement preflight.

Phase A current result: `node scripts/comment-translator-free-beta-remote-durable-enforcement-evidence-contract.mjs` passed. The exact worktree then copied local Supabase link metadata from the same project root without printing values: `supabase link metadata copied locally`. `npx supabase migration list --linked` showed local/remote matched for `20260527000000` and `20260601000000`, with only the two reviewed durable migrations pending locally: `20260615000000` and `20260615001000`. `npx supabase db push --linked --dry-run` was dry-run only and reported it would push exactly `20260615000000_comment_translator_sessions.sql` and `20260615001000_comment_translator_usage_ledger_events.sql`. Blocker label for apply/smoke remains approval-gated; Phase A label: `phase-a-dry-run-reviewed-two-migrations-only`.

Remote migration inspection and dry-run:

```powershell
npx supabase migration list --linked
npx supabase db push --linked --dry-run
```

Abort unless the dry-run shows only the two reviewed durable migrations above, no unrelated pending migration, no remote baseline mismatch, and no target ambiguity.

Remote apply command, approval-gated:

```powershell
npx supabase db push --linked
```

Deployed durable session/usage smoke commands, approval-gated. The command payloads are:

- status payload: `{"intent":"status"}`
- start payload: `{"intent":"start"}`
- stop payload: `{"intent":"stop"}`

```powershell
curl.exe --fail-with-body --silent --show-error --request POST "$env:COMMENT_TRANSLATOR_DEPLOYED_ORIGIN/api/comment-translator/session" --header "Cookie: $env:COMMENT_TRANSLATOR_ALLOWED_TESTER_COOKIE" --header "Content-Type: application/json" --data "{\"intent\":\"status\"}"
curl.exe --fail-with-body --silent --show-error --request POST "$env:COMMENT_TRANSLATOR_DEPLOYED_ORIGIN/api/comment-translator/session" --header "Cookie: $env:COMMENT_TRANSLATOR_ALLOWED_TESTER_COOKIE" --header "Content-Type: application/json" --data "{\"intent\":\"start\",\"credentialReferenceId\":\"$env:COMMENT_TRANSLATOR_CREDENTIAL_REFERENCE\"}"
curl.exe --fail-with-body --silent --show-error --request POST "$env:COMMENT_TRANSLATOR_DEPLOYED_ORIGIN/api/comment-translator/session" --header "Cookie: $env:COMMENT_TRANSLATOR_ALLOWED_TESTER_COOKIE" --header "Content-Type: application/json" --data "{\"intent\":\"stop\"}"
```

Route boundary: `POST /api/comment-translator/session`.

The start/stop commands are remote app mutations because they can create or update `comment_translator_sessions` and `comment_translator_usage_ledger_events`. They must not run without explicit approval.

## Sanitized Output Review

Allowed output after a later approved run:

- command name;
- safe target label;
- HTTP status;
- session status label;
- stop reason label;
- route path;
- table names `comment_translator_sessions` and `comment_translator_usage_ledger_events`;
- write/read count;
- Free cap label;
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

Abort before remote apply or deployed smoke if:

- `npx supabase db push --linked --dry-run` shows any pending migration other than the two reviewed durable migrations;
- remote migration history is blank, ambiguous, or mismatched;
- the linked Supabase target cannot be confirmed by safe label;
- the deployed origin target cannot be confirmed by safe label;
- the allowed-tester cookie or credential reference is missing;
- any output contains a forbidden value;
- any command would deploy/upload, run provider calls, run Stripe actions, promote to main, or flip the public launch gate;
- the app returns a provider target lookup, live target lookup, `liveChatMessages.list`, Azure/OpenAI execution, or Stripe result that was not separately approved.

## Approval Text

Exact approval required before execution:

```text
I approve running FB-L2 remote durable enforcement apply and deployed session smoke with approval label approved-fb-l2-remote-durable-enforcement-apply-and-smoke, limited to the exact commands in docs/active/COMMENT_TRANSLATOR_FREE_BETA_REMOTE_DURABLE_ENFORCEMENT_READY_PREFLIGHT.md. Keep output sanitized to counts/status/stop reasons only. Do not run deploy/upload, provider target lookup, live target lookup, liveChatMessages.list, Azure/OpenAI provider execution, Stripe actions, main promotion, or public launch gate flip.
```

Approval label: `approved-fb-l2-remote-durable-enforcement-apply-and-smoke`.

## Rollback Boundary

Rollback is not automatic. If a later approved run fails:

- keep public launch blocked;
- stop further session smoke commands;
- record sanitized blocker labels only;
- do not run cleanup SQL unless separately approved;
- do not deploy/upload, provider execute, Stripe execute, promote to main, or flip public launch as rollback;
- if a migration was applied and must be corrected, create a separate reviewed migration/rollback plan.

## What Approval Would Prove

If approved and successful, this sequence can prove:

- the remote Supabase target accepted the reviewed durable tables/policies/indexes;
- the deployed app can read/write `comment_translator_sessions`;
- the deployed app can read/write `comment_translator_usage_ledger_events`;
- Free session state and usage state use remote durable authority;
- missing/unreadable durable state fails closed with sanitized output;
- Free caps remain represented by durable session/usage authority: 30 minutes per user per day, 30 minutes per session, 1 active session per user, 30 translated messages per minute, and 20,000 provider-input characters per month.

## What Approval Would Not Prove

This sequence would not prove:

- provider target lookup;
- live target lookup;
- `liveChatMessages.list`;
- non-empty live comment intake;
- Azure/OpenAI provider API execution;
- authenticated route/API smoke;
- authenticated UI rendering;
- production/custom deploy freshness beyond the provided safe target label;
- Paid entitlement C1/C3;
- Stripe billing;
- Creator paid limits;
- main promotion;
- public launch gate flip.

## Completion Verification

Required closeout for this ready preflight:

- `node scripts/comment-translator-free-beta-remote-durable-enforcement-evidence-contract.mjs`
- changed-files no-secret scan
- `git diff --check`

App runtime/UI files are not changed by this preflight; this slice changes docs/task notes and the focused contract script only. `npm run lint`, `npx tsc --noEmit`, and `npm run build` are not required for the current verification baseline.

Width checks are skipped because this preflight does not change visible UI/CSS/layout/copy, rendered routes, browser storage, or runtime behavior.
