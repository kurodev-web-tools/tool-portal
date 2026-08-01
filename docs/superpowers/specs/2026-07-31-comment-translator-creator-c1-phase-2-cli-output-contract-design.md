# Creator C1 Phase 2 CLI Output Contract Remediation Design

Status: implemented / PROOF-2 consumed / blocked-sanitized-output-invalid /
no retry

Design unit:
`C1-CONTAINERLESS-BILLING-PHASE2-STRICT-SOURCE-EQUIVALENCE-CLI-OUTPUT-CONTRACT-1`

Reviewed base:
`06a26c74bf0f7c910e3f79df97f260d3ce364090`

Implementation plan:
`docs/superpowers/plans/2026-07-31-comment-translator-creator-c1-phase-2-cli-output-contract-remediation.md`

## Purpose

Restore deterministic compatibility between the repository-pinned Supabase CLI
`2.109.0` and the strict source-equivalence proof reducer after the consumed
one-attempt proof stopped at:

```text
execution_status=blocked-sanitized-output-invalid
sanitized_output_review_status=fail
abort_status=triggered-sanitized-output-invalid
```

This unit changes only the local CLI invocation and approval-identity contracts.
It does not reinterpret the consumed result, inspect or recover its raw output,
consume another remote attempt, or prove canonical source equivalence.

## Evidence And Diagnosis Boundary

The diagnosis uses only repository files, local `supabase db query --help`
output, and public Supabase CLI `v2.109.0` source.

The pinned CLI exposes both:

```text
--agent <auto|yes|no>
--output-format <text|json|stream-json>
```

Its `db query` formatter has two JSON shapes:

- non-agent mode emits the query rows as a plain JSON array;
- agent mode emits an object containing an untrusted-data boundary, rows, and a
  warning, with an optional advisory.

The current strict reducer accepts only a top-level one-row JSON array and also
requires the seven canonical SQL keys in exact order with no additional keys.
It must therefore reject the agent-mode envelope as
`blocked-sanitized-output-invalid`.

The consumed remote stdout remains unavailable by design. The envelope mismatch
is the strongest locally verifiable cause, not a retrospective claim about the
forbidden raw output.

Primary public references:

- `https://github.com/supabase/cli/blob/v2.109.0/apps/cli/src/legacy/commands/db/query/query.format.ts`
- `https://github.com/supabase/cli/blob/v2.109.0/apps/cli/src/legacy/commands/db/query/query.handler.ts`
- `https://github.com/supabase/cli/blob/v2.109.0/apps/cli-go/internal/utils/agent.go`

## Considered Approaches

### Selected: force non-agent query output

Add `--agent no` to the existing closed runner command while preserving
`--output-format json`.

This makes the producer emit the exact plain-array shape already enforced by
the reducer. It keeps the reducer strict, avoids accepting variable wrapper
metadata, and changes one local invocation boundary only.

### Rejected: accept the agent envelope in the reducer

This would expand the trusted input surface to variable `boundary`, `warning`,
and optional `advisory` fields. It would also require a new rule for safely
discarding wrapper content before the current exact-key check. The expansion is
unnecessary when the CLI provides an explicit non-agent mode.

### Deferred: another remote diagnostic query

A new remote diagnostic could observe the live output shape, but it would need
a new exact approval and consume another read attempt. The local producer
contract can be made deterministic without that operation.

## Architecture

The existing responsibilities remain unchanged:

1. The approved support module constructs the only future Supabase command.
2. The approved runner owns local gates and at-most-one execution.
3. The reducer accepts one exact seven-column row or fails closed.
4. Contract scenarios use synthetic stdout and process fakes only.

The CLI production behavior change is:

```text
before:
supabase db query --linked --file <fixed-sql> --output-format json --log-level error

after:
supabase db query --linked --file <fixed-sql> --output-format json --agent no --log-level error
```

The final implementation may choose an adjacent argument order only if the
contract fixes that order exactly and the CLI help confirms it is supported.

The consumed approval id
`C1-CONTAINERLESS-BILLING-PHASE2-STRICT-SOURCE-EQUIVALENCE-PROOF-1` must no
longer open the runner. The closed runner, reducer output, fixtures, and exact
approval contract rotate together to the proposal-only id:

```text
C1-CONTAINERLESS-BILLING-PHASE2-STRICT-SOURCE-EQUIVALENCE-PROOF-2
```

This rotation is a fail-closed enforcement of the existing no-reuse rule, not
authorization for another attempt. Authority documents retain `PROOF-1` only as
consumed historical evidence.

## Synthetic Characterization Contract

The local RED/GREEN contract must cover these shapes without invoking Supabase:

| Fixture | Expected result |
| --- | --- |
| one-row plain JSON array with the exact seven keys | accepted by the parser |
| agent envelope containing that same synthetic row | `blocked-sanitized-output-invalid` |
| plain array with an extra key | `blocked-sanitized-output-invalid` |
| plain array with canonical keys in a different order | `blocked-sanitized-output-invalid` |
| malformed JSON, zero rows, or multiple rows | `blocked-sanitized-output-invalid` |

The approval-gate characterization must also prove that consumed `PROOF-1`
cannot open the rotated runner and that `PROOF-2` remains closed unless both its
exact environment value and the existing explicit execution flag are present.

Synthetic values must use repository-public versions, fixed public categories,
and inert predicate symbols already used by the contract suite. Fixture
assertions must verify that serialized sanitized results do not retain:

- envelope boundary or warning text;
- transient predicate vectors;
- relation or conflict state;
- predicate ids;
- raw rows or errors;
- remote object, role, owner, policy, function, or ACL source;
- private identifiers or partial private values.

RED is established when the exact future-command assertion shows that the
current command does not contain `--agent no`. Existing reducer rejection of the
synthetic agent envelope is characterization coverage and must remain green.

GREEN is established by adding `--agent no` exactly once and passing the
complete local contract without changing reducer semantics.

## Local Gates And First-Blocker Rules

Implementation must stop without a remote call if any of these conditions
fails:

1. fetched integration authority is not the reviewed merged base;
2. the pinned CLI is not exactly `2.109.0`;
3. the help-only command `npx supabase db query --help` does not advertise
   `--agent <auto|yes|no>`;
4. the fixed runner command differs from the reviewed command contract;
5. target or candidate migration identities differ;
6. opaque linked-target binding differs;
7. a strict-proof, preflight, preservation, or sensitive-output contract fails.

No fallback parser, retry, diagnostic query, raw-output inspection, or automatic
agent-mode detection is allowed.

## Counters And Authority

This local-only unit preserves:

```text
historical strict-proof remote read attempts=1
historical Phase 2 remote read attempts=4
remote mutation attempts=0
migration repair attempts=0
migration apply attempts=0
```

Those are authority-ledger totals, not the result of a local closed-runner
invocation. Every default/manual closed-runner result in this unit must retain:

```text
remote_read_attempt_count=0
remote_mutation_attempt_count=0
migration_repair_attempt_count=0
migration_apply_attempt_count=0
```

The consumed approval remains consumed and cannot authorize another execution.
After the local remediation is verified, any future remote execution requires a
new paste-ready exact approval bound to the then-current base, ref, authority,
CLI, link, target identity, candidate identities, command contract, and
one-attempt boundary. The proposal must use
`C1-CONTAINERLESS-BILLING-PHASE2-STRICT-SOURCE-EQUIVALENCE-PROOF-2` and state
`cli_agent_mode=no`.

## Verification

Verification order:

1. targeted RED command-contract assertion;
2. targeted synthetic envelope characterization;
3. minimal `--agent no` implementation;
4. targeted strict-proof contract;
5. Phase 2 preflight and preservation contracts;
6. closed-runner default manual QA proving no remote execution;
7. sanitized count-only sensitive scan;
8. `git diff --check` and final diff inspection.

Use these exact local entrypoints:

```text
node --input-type=module -e "import { runStrictSourceEquivalenceProofRunnerContract } from './scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-runner-scenarios.mjs'; runStrictSourceEquivalenceProofRunnerContract();"
node --input-type=module -e "import { runStrictSourceEquivalenceProofContract } from './scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-scenarios.mjs'; runStrictSourceEquivalenceProofContract();"
node scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract.mjs
node scripts/comment-translator-creator-c1-containerless-billing-phase-2-preflight-contract.mjs
node scripts/comment-translator-creator-cp1-paid-launch-readiness-contract.mjs
node scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-approved.mjs
```

The final command is the closed-runner default manual QA and must stop before
remote execution with all per-invocation attempt counts at zero.

The local capability check `npx supabase db query --help` is explicitly allowed
because `--help` exits before link resolution or query execution. No
verification step may use `--execute-approved`, set a matching approval
environment variable, or call `supabase db query` without `--help`.

Local implementation evidence:

```text
command_red=pass-expected-missing-agent-no
agent_envelope_characterization=pass-fail-closed-no-retention
approval_identity_red=pass-expected-proof-1-mismatch
targeted_green=pass
strict_proof_contract=pass
phase_2_preflight_contract=pass
local_remediation_remote_read_attempt_count=0
proof_2_approval_gate_status=pass
proof_2_local_gate_status=pass
proof_2_remote_read_attempt_count=1
proof_2_execution_status=blocked-sanitized-output-invalid
proof_2_sanitized_output_review_status=fail
proof_2_abort_status=triggered-sanitized-output-invalid
proof_2_remote_mutation_attempt_count=0
proof_2_repair_attempt_count=0
proof_2_apply_attempt_count=0
proof_2_retry_authorization=not-authorized
closed_runner_unit=C1-CONTAINERLESS-BILLING-PHASE2-STRICT-SOURCE-EQUIVALENCE-PROOF-3
next_approval_status=not-proposed
```

## Out Of Scope

- inspecting or reconstructing the consumed raw stdout;
- another Supabase remote query or retry;
- changing the SQL or its canonical fingerprint;
- loosening the reducer or accepting agent envelope metadata;
- changing migration identities or predicate manifests;
- migration-history repair, `db push`, migration apply, DDL/DML, or backfill;
- Auth, authority, billing, account, or user data reads or counts;
- exposure, cache reload, cutover, rollback, deploy, commit, push, PR, or merge;
- claiming canonical equivalence, execution identity, repair eligibility, or
  apply readiness.
