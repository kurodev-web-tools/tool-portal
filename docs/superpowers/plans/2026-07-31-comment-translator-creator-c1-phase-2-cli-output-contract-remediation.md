# Creator C1 Phase 2 CLI Output Contract Remediation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development
> (if subagents available) or superpowers:executing-plans to implement this
> plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the strict source-equivalence proof runner deterministically
request the Supabase CLI `2.109.0` plain-row JSON shape while rotating the
consumed approval id and preserving every remote, mutation, and evidence
boundary.

**Architecture:** Keep the existing strict reducer unchanged and force
non-agent output at the producer boundary with `--agent no`. Rotate the closed
runner, reducer output, and fixtures from consumed `PROOF-1` to proposal-only
`PROOF-2`. Use synthetic CLI envelopes and process fakes for RED/GREEN, then
record only local readiness and a new exact approval proposal.

**Tech Stack:** Node.js ESM, `node:assert/strict`, Supabase CLI `2.109.0`, Git
identity checks, Markdown authority contracts.

---

## Authority And Execution Boundary

- Specification:
  `docs/superpowers/specs/2026-07-31-comment-translator-creator-c1-phase-2-cli-output-contract-design.md`
- Reviewed merged base:
  `06a26c74bf0f7c910e3f79df97f260d3ce364090`
- Integration ref:
  `origin/codex/comment-translator-free-public-beta-integration`
- Current user authority requires one coherent code owner. Implement in the
  current session with `@superpowers:executing-plans`; any delegated reviewer
  is read-only.
- Do not use `--execute-approved` or set the matching approval environment
  value during implementation or verification.
- Do not invoke `supabase db query` except the help-only command
  `npx supabase db query --help`.
- Do not inspect or reconstruct the consumed raw stdout.
- Do not retry `PROOF-1` or any earlier approval.
- Do not run migration repair, push, apply, DDL/DML, backfill, exposure/cache,
  cutover, rollback, deploy, or later phases.
- Do not stage, commit, push, create a PR, or merge. Commit steps normally
  required by the planning skill are intentionally omitted because the active
  task authority prohibits them.
- Preserve all existing worktree changes and do not touch another worktree.

## File Responsibility Map

| Action | File | Responsibility |
| --- | --- | --- |
| Modify | `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-approved-support.mjs` | Rotate the proposed approval id and add the exact `--agent no` CLI argument |
| Modify | `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-reducer.mjs` | Rotate only the sanitized approval id; preserve parsing and classification |
| Modify | `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-fixtures.mjs` | Bind synthetic reducer expectations to `PROOF-2` |
| Modify | `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-interface-fixtures.mjs` | Add the explicit Supabase agent-envelope rejection fixture |
| Modify | `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-runner-scenarios.mjs` | Establish RED/GREEN command and approval-rotation behavior |
| Modify | `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-approved-process-scenarios.mjs` | Assert the one future process call includes `--agent no` |
| Modify | `docs/active/COMMENT_TRANSLATOR_CREATOR_C1_CONTAINERLESS_BILLING_PHASE_2_STRICT_SOURCE_EQUIVALENCE_DESIGN.md` | Record local output-contract remediation without changing the consumed result |
| Modify | `docs/active/COMMENT_TRANSLATOR_CREATOR_C1_CONTAINERLESS_BILLING_PHASE_2_REMOTE_SCHEMA_APPLY_PREFLIGHT.md` | Record proposal-only `PROOF-2` and its exact no-agent boundary |
| Modify | `scripts/comment-translator-creator-c1-containerless-billing-phase-2-preflight-contract.mjs` | Enforce the new local-readiness and proposal fields |
| Modify | `scripts/comment-translator-creator-cp1-paid-launch-readiness-contract.mjs` | Allowlist the new spec/plan while preserving the CP1 changed-file boundary |
| Modify | `task.md` | Point the active board to local remediation readiness and the next proposal |
| Modify | `docs/superpowers/specs/2026-07-31-comment-translator-creator-c1-phase-2-cli-output-contract-design.md` | Mark implementation/verification status after GREEN |
| Create | `docs/superpowers/plans/2026-07-31-comment-translator-creator-c1-phase-2-cli-output-contract-remediation.md` | This executable plan |

## Chunk 1: Authority And RED

### Task 1: Revalidate the local authority boundary

**Files:**

- Read:
  `docs/active/COMMENT_TRANSLATOR_CREATOR_C1_CONTAINERLESS_BILLING_PHASE_2_STRICT_SOURCE_EQUIVALENCE_DESIGN.md`
- Read:
  `docs/active/COMMENT_TRANSLATOR_CREATOR_C1_CONTAINERLESS_BILLING_PHASE_2_REMOTE_SCHEMA_APPLY_PREFLIGHT.md`
- Read: `task.md`

- [x] **Step 1: Refresh and verify the integration authority**

Run:

```bash
git fetch origin --prune
git rev-parse HEAD
git rev-parse origin/codex/comment-translator-free-public-beta-integration
git status --short
```

Expected:

- both revisions equal
  `06a26c74bf0f7c910e3f79df97f260d3ce364090`;
- status contains exactly these pre-implementation paths:

```text
docs/active/COMMENT_TRANSLATOR_CREATOR_C1_CONTAINERLESS_BILLING_PHASE_2_REMOTE_SCHEMA_APPLY_PREFLIGHT.md
docs/active/COMMENT_TRANSLATOR_CREATOR_C1_CONTAINERLESS_BILLING_PHASE_2_STRICT_SOURCE_EQUIVALENCE_DESIGN.md
docs/superpowers/plans/2026-07-31-comment-translator-creator-c1-phase-2-cli-output-contract-remediation.md
docs/superpowers/specs/2026-07-31-comment-translator-creator-c1-phase-2-cli-output-contract-design.md
scripts/comment-translator-creator-c1-containerless-billing-phase-2-preflight-contract.mjs
scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-approved-boundaries.mjs
scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-approved-support.mjs
scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-runner-scenarios.mjs
scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-sql-scenarios.mjs
scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-sql-validator-scenarios.mjs
task.md
```

- if the integration ref moved, stop before editing and rebind the design.

- [x] **Step 2: Verify the pinned CLI and help-only agent flag**

Run:

```bash
npx supabase --version
npx supabase db query --help
```

Expected:

- version is exactly `2.109.0`;
- help advertises `--agent <auto|yes|no>`;
- no link resolution or query execution occurs.

### Task 2: Establish RED and envelope characterization

**Files:**

- Modify:
  `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-fixtures.mjs`
- Modify:
  `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-interface-fixtures.mjs`
- Modify:
  `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-runner-scenarios.mjs`
- Modify:
  `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-approved-process-scenarios.mjs`

- [x] **Step 1: Establish the command RED while approval identity still matches**

Change only the command expectation in
`assertExactIdentitiesAndCommand()` to:

```js
[
  "db", "query", "--linked", "--file", SQL_PATH,
  "--output-format", "json", "--agent", "no",
  "--log-level", "error"
]
```

Keep every approval-id expectation at `PROOF-1`, then run:

```bash
node --input-type=module -e "import { runStrictSourceEquivalenceProofRunnerContract } from './scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-runner-scenarios.mjs'; runStrictSourceEquivalenceProofRunnerContract();"
```

Expected: the identity assertion passes first, then the exact command comparison
fails because production does not yet include `--agent no`.

- [x] **Step 2: Add and run the explicit envelope characterization**

Add this inert fixture to `invalidInterfaceStdoutFixtures`:

```js
{
  name: "Supabase CLI agent envelope",
  stdout: JSON.stringify({
    boundary: rawSentinel,
    rows: [allPassRow],
    warning: rawSentinel
  })
}
```

Run before rotating the reducer approval expectation:

```bash
node --input-type=module -e "import { runStrictSourceEquivalenceProofContract } from './scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-scenarios.mjs'; runStrictSourceEquivalenceProofContract();"
```

Expected: exit `0`. The new envelope is characterized as
`blocked-sanitized-output-invalid`, and `rawSentinel` is absent from the
serialized sanitized result.

- [x] **Step 3: Establish the approval-identity RED**

Change the fixed expected id to:

```js
"C1-CONTAINERLESS-BILLING-PHASE2-STRICT-SOURCE-EQUIVALENCE-PROOF-2"
```

In the runner scenarios, assert:

```js
assert.equal(
  hasExactApproval(exactArgv, {
    [APPROVAL_ENV]:
      "C1-CONTAINERLESS-BILLING-PHASE2-STRICT-SOURCE-EQUIVALENCE-PROOF-1",
    [AUTHORITY_ENV]: CURRENT_AUTHORITY
  }),
  false,
  "consumed PROOF-1 cannot open the rotated runner"
);
```

Keep the existing three-way gate assertion so `PROOF-2` opens the pure gate
only when the explicit flag, exact approval value, and current-authority value
all match. The production runner remains closed because no matching value is
set during verification.

Rotate every fixed runner expectation:

- `PROPOSED_APPROVAL_ID`;
- the default closed-runner `approval_id=...` stdout line;
- the exact valid environment value used by the three-way gate;
- the explicit consumed-`PROOF-1` rejection assertion.

Also rotate `expectedApprovalId` in the reducer fixtures and change the approved
process command expectation to include `--agent no`. Do not change production
support or reducer code yet.

- [x] **Step 4: Run the identity RED**

Run:

```bash
node --input-type=module -e "import { runStrictSourceEquivalenceProofRunnerContract } from './scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-runner-scenarios.mjs'; runStrictSourceEquivalenceProofRunnerContract();"
node --input-type=module -e "import { runStrictSourceEquivalenceProofContract } from './scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-scenarios.mjs'; runStrictSourceEquivalenceProofContract();"
```

Expected:

- runner contract fails first because production still exports `PROOF-1`;
- reducer contract fails first because production still exports `PROOF-1`;
- command RED and envelope characterization have already been observed
  separately in Steps 1 and 2.

If either targeted command unexpectedly passes before production changes, stop
and inspect the local diff rather than broadening the implementation.

## Chunk 2: Minimal GREEN

### Task 3: Rotate the approval identity and force plain-row JSON

**Files:**

- Modify:
  `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-approved-support.mjs`
- Modify:
  `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-reducer.mjs`

- [x] **Step 1: Rotate the closed runner proposal id**

Set:

```js
export const PROPOSED_APPROVAL_ID =
  "C1-CONTAINERLESS-BILLING-PHASE2-STRICT-SOURCE-EQUIVALENCE-PROOF-2";
```

Do not change `APPROVAL_ENV`, `AUTHORITY_ENV`, the reviewed base, candidate
identities, target identity, SQL path, SQL hash, timeouts, or buffer limits.

- [x] **Step 2: Add the exact agent override**

Change `createFutureCommand` to emit:

```js
args: [
  "db", "query", "--linked", "--file", SQL_PATH,
  "--output-format", "json", "--agent", "no",
  "--log-level", "error"
]
```

Do not add fallback handling or accept another output shape.

- [x] **Step 3: Rotate only the reducer result approval id**

Set:

```js
export const APPROVAL_ID =
  "C1-CONTAINERLESS-BILLING-PHASE2-STRICT-SOURCE-EQUIVALENCE-PROOF-2";
```

Do not modify `hasCanonicalSqlKeys`, `parseRemoteRow`, classifications, counts,
sanitization, or first-blocker precedence.

- [x] **Step 4: Run targeted GREEN**

Run:

```bash
node --input-type=module -e "import { runStrictSourceEquivalenceProofRunnerContract } from './scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-runner-scenarios.mjs'; runStrictSourceEquivalenceProofRunnerContract();"
node --input-type=module -e "import { runStrictSourceEquivalenceProofContract } from './scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-scenarios.mjs'; runStrictSourceEquivalenceProofContract();"
node --input-type=module -e "import { runStrictSourceEquivalenceProofApprovedProcessContract } from './scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-approved-process-scenarios.mjs'; runStrictSourceEquivalenceProofApprovedProcessContract();"
```

Expected: all exit `0` and produce no stdout on success. The approved-process
contract records one injected fake `db query` call but performs no real
Supabase operation.

- [x] **Step 5: Run the complete strict-proof contract**

Run:

```bash
node scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract.mjs
```

Expected:

```text
comment_translator_creator_c1_phase_2_strict_source_equivalence_proof_contract=pass
```

## Chunk 3: Authority And Proposal

### Task 4: Record local remediation readiness without changing evidence

**Files:**

- Modify:
  `docs/active/COMMENT_TRANSLATOR_CREATOR_C1_CONTAINERLESS_BILLING_PHASE_2_STRICT_SOURCE_EQUIVALENCE_DESIGN.md`
- Modify:
  `docs/active/COMMENT_TRANSLATOR_CREATOR_C1_CONTAINERLESS_BILLING_PHASE_2_REMOTE_SCHEMA_APPLY_PREFLIGHT.md`
- Modify:
  `scripts/comment-translator-creator-c1-containerless-billing-phase-2-preflight-contract.mjs`
- Modify:
  `scripts/comment-translator-creator-cp1-paid-launch-readiness-contract.mjs`
- Modify: `task.md`
- Modify:
  `docs/superpowers/specs/2026-07-31-comment-translator-creator-c1-phase-2-cli-output-contract-design.md`

- [x] **Step 1: Preserve the consumed failure record**

Keep these historical facts unchanged:

```text
PROOF-1 approval status=consumed-no-retry
PROOF-1 execution status=blocked-sanitized-output-invalid
PROOF-1 remote read attempts=1
historical Phase 2 remote reads=4
remote mutation / repair / apply / backfill attempts=0
```

Do not claim equivalence, historical execution identity, repair eligibility, or
apply readiness.

- [x] **Step 2: Add local output-contract readiness fields**

Record:

```text
cli_output_contract_design_unit=C1-CONTAINERLESS-BILLING-PHASE2-STRICT-SOURCE-EQUIVALENCE-CLI-OUTPUT-CONTRACT-1
cli_output_contract_status=review-ready-local-only
cli_agent_mode=no
next_approval_unit=C1-CONTAINERLESS-BILLING-PHASE2-STRICT-SOURCE-EQUIVALENCE-PROOF-2
next_approval_status=proposal-only
```

Update the preflight machine contract to assert those exact fields and continue
asserting all prior counters and blockers.

Use distinct constants and records:

```js
const consumedStrictApprovalUnit =
  "C1-CONTAINERLESS-BILLING-PHASE2-STRICT-SOURCE-EQUIVALENCE-PROOF-1";
const proposedStrictApprovalUnit =
  "C1-CONTAINERLESS-BILLING-PHASE2-STRICT-SOURCE-EQUIVALENCE-PROOF-2";
```

`consumedStrictApprovalUnit` owns only the historical approval text, sanitized
result, blocker, and counters. `proposedStrictApprovalUnit` owns only local
readiness and the new paste-ready proposal. Never rotate one shared constant
across both records.

- [x] **Step 3: Add the fully bound paste-ready proposal-only `PROOF-2` text**

The proposal must bind:

```text
approval_id=C1-CONTAINERLESS-BILLING-PHASE2-STRICT-SOURCE-EQUIVALENCE-PROOF-2
reviewed_base=06a26c74bf0f7c910e3f79df97f260d3ce364090
prior_approval_id=C1-CONTAINERLESS-BILLING-PHASE2-STRICT-SOURCE-EQUIVALENCE-PROOF-1
prior_result=blocked-sanitized-output-invalid-no-retry
candidate_versions=20260623000000,20260624000000,20260705000000,20260706073204
target_migration_version=20260730000000
target_canonical_git_blob=331db8095fc2ec09332718e9a5d05f62f26d18e8
target_canonical_git_blob_byte_sha256=27c116aa8872c9c1a04d0a3d0accd2a214e3c28a961ca92c6cb3ba6d3115cd15
repository_pinned_supabase_cli=2.109.0
cli_agent_mode=no
integration_ref=origin/codex/comment-translator-free-public-beta-integration
migration_history_current_authority=current-confirmed
opaque_linked_target_binding=git-ignored-authority-target-exact-match-required
sql_path=scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof.sql
sql_canonical_byte_sha256=f3448f70416bb87cce2e4a94bd75b76bf5e217e231a52edf1cd868c948e7e3f0
sql_canonical_bytes=60706
cli_command_contract=db-query-linked-fixed-file-output-format-json-agent-no-log-level-error
action_label=one-sanitized-read-only-strict-source-equivalence-proof-2
```

Bind all four candidate identities by order, public path, Git blob, canonical
byte SHA-256, and byte size using the values already recorded in the strict
design. Do not include the private linked-target value.

The prose must preserve the original allowlist, one-query/one-attempt rule,
unknown-count stop, first-sanitized-blocker stop, no retry, no raw output, and
all mutation/apply/backfill/exposure/cutover exclusions.

This text remains proposal-only until the project owner pastes it in the same
task. The preflight contract must independently identify and assert the
consumed-approval section, consumed sanitized-result section, and paste-ready
proposal section. Do not run the proposal while writing or verifying this
implementation.

- [x] **Step 4: Run the authority contract before claiming verification**

Run:

```bash
node scripts/comment-translator-creator-c1-containerless-billing-phase-2-preflight-contract.mjs
```

Expected:

```text
comment_translator_creator_c1_containerless_billing_phase_2_preflight_contract=pass
```

- [x] **Step 5: Mark the spec verified and re-run final targeted authority**

Only after both the strict-proof contract from Task 3 and the preflight contract
from Step 4 pass, change the spec status to:

```text
implemented / local verification pass / PROOF-2 proposal only
```

Link the exact implementation plan, retain the no-remote boundary, then rerun:

```bash
node scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract.mjs
node scripts/comment-translator-creator-c1-containerless-billing-phase-2-preflight-contract.mjs
```

Expected: both exit `0` with their existing pass markers.

- [x] **Step 6: Preserve the CP1 changed-file boundary**

Add only these two new paths to `allowedChangedFiles`:

```js
"docs/superpowers/plans/2026-07-31-comment-translator-creator-c1-phase-2-cli-output-contract-remediation.md",
"docs/superpowers/specs/2026-07-31-comment-translator-creator-c1-phase-2-cli-output-contract-design.md",
```

Do not loosen the allowlist to a directory prefix or wildcard. Run:

```bash
node scripts/comment-translator-creator-cp1-paid-launch-readiness-contract.mjs
```

Expected:
`comment translator creator CP1 paid launch readiness contract passed`.

## Chunk 4: Broad Verification And Closed QA

### Task 5: Verify preservation, sanitization, and no execution

**Files:**

- Verify all files in the responsibility map.

- [x] **Step 1: Run broad preservation contracts**

Run:

```bash
node scripts/comment-translator-creator-c1-containerless-billing-phase-2-remote-readiness-approved-contract.mjs
node scripts/comment-translator-creator-c1-containerless-billing-phase-2-migration-history-reconciliation-contract.mjs
node scripts/comment-translator-creator-c1-containerless-billing-phase-2-prior-migration-state-proof-contract.mjs
node scripts/comment-translator-creator-c1-containerless-billing-read-contract.mjs
node scripts/comment-translator-creator-cp1-paid-launch-readiness-contract.mjs
node scripts/comment-translator-task-board-creator-roadmap-contract.mjs
```

Expected: every command exits `0` and prints its existing pass marker.

- [x] **Step 2: Run closed-runner default manual QA**

Run only:

```bash
node scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-approved.mjs
```

Expected:

- exit status `2`;
- `approval_id=...PROOF-2`;
- `approval_gate_status=fail`;
- `execution_status=blocked-before-remote`;
- read/mutation/repair/apply attempt counts all `0`;
- no raw or private value;
- no Supabase query.

- [x] **Step 3: Run the count-only sensitive scan**

Run from Git Bash:

```bash
base=06a26c74bf0f7c910e3f79df97f260d3ce364090
mapfile -d '' changed_files < <({
  git diff --name-only -z "$base" --
  git ls-files --others --exclude-standard -z --
})
pattern='(sk_live_[A-Za-z0-9]{16,}|whsec_[A-Za-z0-9]{16,}|sb_secret_[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|AIza[A-Za-z0-9_-]{30,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|Bearer[[:space:]]+[A-Za-z0-9._-]{20,}|(liveChatId|owner(User)?Id|projectRef|providerTarget)[[:space:]]*[:=][[:space:]]*["'"'"'][A-Za-z0-9_-]{12,}["'"'"'])'
matches=0
for file in "${changed_files[@]}"; do
  [ -f "$file" ] || continue
  count=$(rg -o -I -i "$pattern" -- "$file" | wc -l | tr -d ' ')
  matches=$((matches + count))
done
printf 'changed_files=%s high_confidence_secret_private_identifier_matches=%s\n' "${#changed_files[@]}" "$matches"
test "$matches" -eq 0
```

Expected:
`high_confidence_secret_private_identifier_matches=0`, with no matched values
printed.

- [x] **Step 4: Inspect the final diff**

Run:

```bash
git diff --check
git status --short
git diff --stat
git diff -- package.json package-lock.json
```

Expected:

- only the planned files plus the pre-existing Phase 2 rebind/result changes;
- no manifest or lockfile diff;
- no reducer parsing/classification change;
- no SQL or migration identity change;
- no remote execution evidence for `PROOF-2`;
- no commit, push, or PR.

- [x] **Step 5: Stop at the approval boundary**

Report:

- changed files;
- RED and GREEN evidence;
- targeted, broad, and manual QA results;
- historical counters and closed-runner zero-attempt result;
- `PROOF-2` as proposal-only;
- unchecked repair/apply/backfill/exposure/cutover scope.

Do not execute the proposal. Wait for the project owner to paste the exact
approval text in the same task.
