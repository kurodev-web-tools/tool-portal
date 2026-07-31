# Creator C1 Phase 2 Strict Source-Equivalence Proof Implementation Plan

> **For agentic workers:** REQUIRED: Use
> superpowers:subagent-driven-development (if subagents available) or
> superpowers:executing-plans to implement this plan. Steps use checkbox
> (`- [ ]`) syntax for tracking.

**Goal:** Build a local-only, review-ready, deterministic strict
source-equivalence proof package for the four repository-known prior migrations
without executing a remote query or authorizing repair/apply.

**Architecture:** A single read-only SQL statement emits a closed transient
predicate vector for the four canonical migration versions. A pure reducer
validates and independently classifies that vector before returning only the
sanitized allowlisted evidence. A fail-closed approved runner owns exact local
identity, CLI/link, one-attempt, and first-blocker gates; repository contracts
prove the runner cannot execute remotely without a future exact approval.

**Tech Stack:** Node.js ESM, `node:assert/strict`, PostgreSQL catalog SQL,
Supabase CLI `2.109.0`, Git object identity checks, Markdown authority
contracts.

---

## Authority And Non-Execution Boundary

- Implement from exact reviewed base
  `38f0d7fa7fc5bb3e2ef443abce3f261e5026dd07` and exact integration ref
  `origin/codex/comment-translator-free-public-beta-integration`.
- Treat
  `docs/active/COMMENT_TRANSLATOR_CREATOR_C1_CONTAINERLESS_BILLING_PHASE_2_STRICT_SOURCE_EQUIVALENCE_DESIGN.md`
  as the specification.
- The implementation owner must own all 18 new strict-proof artifacts: four
  public artifacts and fourteen support modules. Any delegated reviewer is
  read-only so the artifact set retains one coherent code owner.
- Do not run the new runner with `--execute-approved`.
- Do not set the proposed approval environment variable to its matching value.
- Do not issue `supabase db query --linked`, another Supabase/control-plane
  call, or any remote query during implementation or verification.
- Do not retry either consumed reconciliation approval or the consumed coarse
  prior-migration proof.
- Do not run migration repair, `db push`, migration apply, DDL/DML mutation,
  backfill, Auth/authority data reads, raw diagnostic queries, schema exposure,
  schema-cache reload, deploy, or later phases.
- Do not install dependencies or change manifests/lockfiles.
- Do not stage, commit, push, create a PR, or merge. The usual plan commit steps
  are intentionally omitted because the current authority explicitly prohibits
  them.
- Preserve all existing worktree changes. Do not clean, prune, reuse, remove,
  or modify any other worktree or branch.
- The future approval id embedded in the closed runner and paste-ready text is
  a proposal only:
  `C1-CONTAINERLESS-BILLING-PHASE2-STRICT-SOURCE-EQUIVALENCE-PROOF-1`.

## File Responsibility Map

| Action | File | Single responsibility |
| --- | --- | --- |
| Create | `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof.sql` | Public catalog-only read statement producing the fixed seven-column transient row |
| Create | `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-reducer.mjs` | Public pure transient-row parser, independent classifier, and sanitized tagged-union reducer |
| Create | `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-approved.mjs` | Public closed entrypoint for the approval/local-identity gate and at-most-one future linked file read |
| Create | `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract.mjs` | Public RED/GREEN contract entrypoint for the complete strict-proof boundary |
| Create | `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-approved-boundaries.mjs` | Support local process, file, timeout, and sanitized command boundaries |
| Create | `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-approved-support.mjs` | Support immutable identities, exact `--file` command, and local gate orchestration |
| Create | `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-approved-process-scenarios.mjs` | Support approved-process fixtures without entering the real approved path |
| Create | `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-fixtures.mjs` | Support fixed reducer and manifest fixtures |
| Create | `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-interface-fixtures.mjs` | Support fixed public/transient interface fixtures |
| Create | `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-runner-scenarios.mjs` | Support runner gate and child-process scenarios |
| Create | `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-scenarios.mjs` | Support reducer classification and failure scenarios |
| Create | `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-sql-binding-fixtures.mjs` | Support SQL canonical-binding fixtures |
| Create | `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-sql-binding-scenarios.mjs` | Support SQL canonical-binding scenarios |
| Create | `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-sql-scenarios.mjs` | Support SQL statement and seven-column scenarios |
| Create | `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-sql-validator-fixtures.mjs` | Support SQL validator positive/negative fixtures |
| Create | `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-sql-validator-scenarios.mjs` | Support SQL validator scenarios |
| Create | `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-support.mjs` | Support contract utilities and fixture isolation |
| Create | `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-sql-validator.mjs` | Support closed SQL grammar and read-only validation |
| Modify | `docs/active/COMMENT_TRANSLATOR_CREATOR_C1_CONTAINERLESS_BILLING_PHASE_2_STRICT_SOURCE_EQUIVALENCE_DESIGN.md` | Mark local implementation readiness without changing the approved proof semantics |
| Modify | `docs/active/COMMENT_TRANSLATOR_CREATOR_C1_CONTAINERLESS_BILLING_PHASE_2_REMOTE_SCHEMA_APPLY_PREFLIGHT.md` | Record strict-proof local readiness, proposal-only approval text, and remaining gates |
| Modify | `task.md` | Point the active board at the strict-proof proposal and keep Phase 2 apply blocked |
| Modify | `scripts/comment-translator-creator-c1-containerless-billing-phase-2-preflight-contract.mjs` | Assert the new authority state and machine-readable contract |
| Modify | `scripts/comment-translator-creator-cp1-paid-launch-readiness-contract.mjs` | Allowlist exactly four public artifacts and fourteen support modules (`18` strict-proof artifacts total) |

## Chunk 1: Closed Proof Core

### Task 1: Establish RED reducer and manifest coverage

**Files:**

- Create:
  `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract.mjs`
- Reference:
  `docs/active/COMMENT_TRANSLATOR_CREATOR_C1_CONTAINERLESS_BILLING_PHASE_2_STRICT_SOURCE_EQUIVALENCE_DESIGN.md`
- Reference:
  `scripts/comment-translator-creator-c1-containerless-billing-phase-2-prior-migration-state-proof-contract.mjs`

- [x] **Step 1: Declare the fixed public versions, category slices, and
      predicate lengths in the failing contract**

Use these exact manifest boundaries:

```js
const manifests = [
  {
    version: "20260623000000",
    relationState: "canonical",
    length: 27,
    categories: [
      ["relation", 0, 1],
      ["columns", 1, 9],
      ["keys", 9, 11],
      ["constraints", 11, 15],
      ["rls", 15, 16],
      ["grants", 16, 19],
      ["policy", 19, 20],
      ["indexes", 20, 22],
      ["comments", 22, 27]
    ]
  },
  {
    version: "20260624000000",
    relationState: "canonical",
    length: 4,
    categories: [
      ["relation", 0, 1],
      ["columns", 1, 2],
      ["constraints", 2, 3],
      ["comments", 3, 4]
    ]
  },
  {
    version: "20260705000000",
    relationState: "canonical",
    length: 31,
    categories: [
      ["relation", 0, 1],
      ["columns", 1, 11],
      ["keys", 11, 13],
      ["constraints", 13, 18],
      ["rls", 18, 19],
      ["grants", 19, 22],
      ["policy", 22, 23],
      ["indexes", 23, 25],
      ["comments", 25, 31]
    ]
  },
  {
    version: "20260706073204",
    relationState: "not-applicable",
    length: 22,
    categories: [["canonical_default_privileges", 0, 22]]
  }
];
```

Assert the reducer exports:

```js
APPROVAL_ID
CANDIDATE_VERSIONS
PREDICATE_MANIFEST
reduceStrictSourceEquivalenceCliResult
createBlockedBeforeRemoteResult
```

- [x] **Step 2: Add a valid mixed success fixture**

Use the exact transient grammar:

```text
20260623000000:canonical:clear:ppppppppppppppppppppppppppp|
20260624000000:canonical:clear:pppp|
20260705000000:canonical:clear:ppppppppppppppppppppppppppppppp|
20260706073204:not-applicable:clear:pppppppppppppppppppppp
```

The fixture row must have exactly:

```js
{
  strict_source_equivalence_matrix: transientMatrix,
  canonical_effect_equivalent_count: 4,
  absent_count: 0,
  partial_count: 0,
  conflicting_count: 0,
  unverifiable_count: 0,
  unknown_remote_migration_count: 10
}
```

Assert the returned sanitized result:

- includes four public versions in canonical order;
- includes only applicable public category labels and
  `pass|fail|unverifiable`;
- classifies all four as `canonical-effect-equivalent`;
- includes all nine gate/review statuses as `pass`;
- includes remote read count `1` and mutation/repair/apply counts `0`;
- includes `strict-source-equivalence-complete`,
  `sanitized_output_review_status=pass`, `abort_status=not-triggered`, and
  `unchecked_scope_status=repair-apply-and-later-not-run`;
- does not contain `relation_state`, `conflict_state`, predicate ids, or raw
  predicate vectors after serialization.

- [x] **Step 3: Add the complete classification truth-table fixtures**

Cover these exact cases:

| Input | Expected overall status |
| --- | --- |
| all applicable predicates `p`, canonical/clear | `canonical-effect-equivalent` |
| relation `absent`, all dependent predicates `f`, clear | `absent` |
| relation `absent`, any dependent predicate `p`, clear | `conflicting` |
| relation `incompatible` | `conflicting` |
| `conflict_state=conflict` | `conflicting` |
| any predicate `u` | `unverifiable` |
| `conflict_state=unverifiable` | `unverifiable` |
| canonical relation with a `p`/`f` mixture | `partial` |
| canonical relation with every non-relation predicate `f` | `partial` |
| default ACL vector all `f` | `absent` |
| default ACL vector mixed `p`/`f` | `partial` |
| default ACL vector all `p` | `canonical-effect-equivalent` |

Assert precedence with simultaneous failures: `unverifiable` outranks
`conflicting`, and `conflicting` outranks `partial`.

- [x] **Step 4: Add transient row and sanitized tagged-union rejection
      fixtures**

Reject:

- nonzero/timeout status before parsing;
- invalid JSON, non-array, zero/multiple rows, `NULL` row;
- missing, extra, reordered, or ill-typed seven SQL columns;
- wrong version order;
- wrong predicate-vector length;
- characters outside `p|f|u`;
- invalid relation/conflict enums;
- `not-applicable` outside version `20260706073204`;
- duplicate/missing version entries;
- SQL status counts inconsistent with independently recomputed counts;
- unknown remote count other than `10`.

For every blocked result, assert:

- the matrix, five classification counts, and unknown remote count are omitted;
- all common fields remain present;
- no raw sentinel from stdout/stderr survives;
- `remote_read_attempt_count=1`;
- mutation/repair/apply counts remain zero;
- the exact first-blocker `execution_status` and `abort_status` are used.

- [x] **Step 5: Add every pre-remote blocked mapping fixture**

Assert this exact mapping:

```js
[
  ["approval-gate", "triggered-approval-gate"],
  ["base-ref", "triggered-base-ref-mismatch"],
  ["candidate-identity", "triggered-candidate-identity-mismatch"],
  ["target-identity", "triggered-target-identity-mismatch"],
  ["cli-version", "triggered-cli-version-mismatch"],
  ["linked-metadata", "triggered-linked-metadata-mismatch"],
  ["linked-target", "triggered-linked-target-mismatch"],
  ["local-contract", "triggered-local-contract-failed"]
]
```

Each result must use `execution_status=blocked-before-remote`,
`remote_read_attempt_count=0`, omit all remote-derived fields, set earlier
gate statuses to `pass`, the first failed gate to `fail`, later gates to
`not-evaluated`, and set
`default_privileges_security_goal_status=not-evaluated`.

- [x] **Step 6: Run the contract and prove RED**

Run:

```bash
node scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract.mjs
```

Expected: nonzero exit with `ERR_MODULE_NOT_FOUND` for the reducer. Do not
weaken assertions to make RED pass.

### Task 2: Implement the pure reducer to GREEN

**Files:**

- Create:
  `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-reducer.mjs`
- Test:
  `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract.mjs`

- [x] **Step 1: Define the closed constants**

Set:

```js
export const APPROVAL_ID =
  "C1-CONTAINERLESS-BILLING-PHASE2-STRICT-SOURCE-EQUIVALENCE-PROOF-1";

export const CANDIDATE_VERSIONS = Object.freeze([
  "20260623000000",
  "20260624000000",
  "20260705000000",
  "20260706073204"
]);
```

Export an immutable `PREDICATE_MANIFEST` matching Task 1 exactly. Define closed
sets for category statuses, overall statuses, execution statuses, abort
statuses, and gate statuses. Do not accept aliases or legacy
`equivalent-present|missing`.

- [x] **Step 2: Implement `createBlockedBeforeRemoteResult`**

Input is one of the eight local gate ids. Return the common blocked tagged-union
shape only. Use a fixed ordered gate-field table:

```js
[
  ["approval-gate", "approval_gate_status"],
  ["base-ref", "reviewed_base_status"],
  ["candidate-identity", "candidate_identity_status"],
  ["target-identity", "target_binding_status"],
  ["cli-version", "cli_version_status"],
  ["linked-metadata", "linked_metadata_status"],
  ["linked-target", "linked_target_status"],
  ["local-contract", "local_contract_status"]
]
```

Set `sanitized_output_review_status=not-evaluated`. Never accept or append an
error detail.

- [x] **Step 3: Implement strict transient parsing**

Parse exactly one JSON row and the seven exact keys. Parse the matrix using the
fixed `|` and `:` grammar. A predicate vector is valid only when its version,
order, length, and characters match the manifest. Do not use permissive
trimming, case folding, key coercion, or number coercion.

Return only an internal object. Do not export or log the transient matrix.

- [x] **Step 4: Independently aggregate categories and classify versions**

For each category slice:

```js
const categoryStatus =
  slice.includes("u") ? "unverifiable"
  : slice.every((value) => value === "p") ? "pass"
  : "fail";
```

Apply the specification precedence exactly:

1. any `u` or unverifiable relation/conflict state;
2. incompatible relation or conflict detector;
3. absent relation with zero/all dependent effects;
4. default-ACL all-fail/mixed handling;
5. all categories pass;
6. remaining pass/fail mixture;
7. canonical relation with every dependent category fail.

Recompute all five counts and reject SQL-provided count drift.

- [x] **Step 5: Implement post-remote first-blocker reduction**

Use this exact order:

1. nonzero exit or timeout: `blocked-remote-read-failed`;
2. row/key/type/null/duplicate/order failure:
   `blocked-sanitized-output-invalid`;
3. unknown remote count not `10`:
   `blocked-unknown-remote-count-changed`;
4. matrix/count/classification inconsistency:
   `blocked-sanitized-output-invalid`;
5. valid unverifiable result: `blocked-unverifiable`;
6. otherwise: `strict-source-equivalence-complete`.

Do not retain stdout, stderr, raw errors, relation state, conflict state, or
predicate vectors.

- [x] **Step 6: Run the reducer contract to GREEN**

Run:

```bash
node scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract.mjs
```

Expected: exit `0`; the focused reducer contract is fully GREEN. The SQL RED is
introduced only in Task 3, Step 1.

### Task 3: Add the fixed read-only SQL contract and implementation

**Files:**

- Modify:
  `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract.mjs`
- Create:
  `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof.sql`
- Reference:
  `supabase/migrations/20260623000000_comment_translator_real_comments_feed_snapshots.sql`
- Reference:
  `supabase/migrations/20260624000000_account_display_timezone_preference.sql`
- Reference:
  `supabase/migrations/20260705000000_comment_translator_creator_waitlist_registrations.sql`
- Reference:
  `supabase/migrations/20260706073204_supabase_default_privileges_guard.sql`

- [x] **Step 1: Extend the contract with SQL RED assertions**

Assert:

- exactly one statement starting with `WITH` and exactly one terminating
  semicolon;
- no top-level or CTE mutation verb:
  `insert|update|delete|merge|alter|create|drop|grant|revoke|truncate|call|do`;
- exactly the known 17 public migration versions in canonical order;
- exactly the candidate predicate ids/counts `27/4/31/22`;
- exactly the seven output aliases and fixed matrix grammar;
- catalog sources are limited to PostgreSQL catalogs/information schema plus
  `supabase_migrations.schema_migrations`;
- no application/Auth/authority/billing/account/user row source;
- unknown remote versions are counted but never aggregated or emitted.

Run the focused contract and expect failure because the SQL file is absent.

- [x] **Step 2: Build canonical expected-value CTEs**

Use repository-local `VALUES` CTEs for all expected public constants. Cover:

- relation namespace/name/kind;
- column ordinal/name/`format_type`/nullability/default/
  identity/generated posture;
- primary and foreign key definitions and delete action;
- named check constraints;
- policy name/command/role/`USING`/`WITH CHECK`;
- index name/unique flag/key order/sort direction;
- exact table/column comments;
- canonical default-ACL owner/schema/grantee/object-class/privilege tuples.

Expected expression text must come only from the four canonical migration files.
Use fixed `pg_get_expr`, `pg_get_constraintdef`, and `pg_get_indexdef`
renderings, with every accepted rendering written explicitly in the contract.
Do not introduce generic whitespace normalization or arbitrary alternatives.

- [x] **Step 3: Build catalog observation CTEs without application-row reads**

Use:

```text
pg_namespace
pg_class
pg_attribute
pg_attrdef
pg_constraint
pg_policy
pg_index
pg_description
pg_roles
pg_default_acl
aclexplode
acldefault
supabase_migrations.schema_migrations
```

Use `format_type`, `pg_get_expr`, `pg_get_constraintdef`, and
`pg_get_indexdef` only for canonical catalog definitions. Select roles and
namespaces by fixed public names; never return OIDs or discovered names.

For each default-ACL object class:

- exactly one row uses `defaclacl`;
- zero rows uses `acldefault(object_type, owner_oid)`;
- more than one row, missing owner/schema, `NULL`, or unknown type emits `u`;
- each of the exact 22 predicates emits `p` only when its forbidden effective
  tuple is absent.

- [x] **Step 4: Produce closed relation/conflict states**

For relation migrations:

- `canonical`: exactly one canonical relation with expected kind;
- `absent`: no canonical relation/name collision;
- `incompatible`: canonical name exists with the wrong relation kind;
- `unverifiable`: duplicate/unknown/null catalog state.

Set `conflict` for:

- incompatible canonical named definitions;
- extra `PUBLIC|anon|authenticated` table privileges;
- trusted-server privileges outside the canonical grant set;
- extra `PUBLIC|anon|authenticated` policy access on either trusted-server
  table.

Compatible noncanonical columns/constraints/indexes/comments remain outside
the proof and do not set conflict.

- [x] **Step 5: Emit and cross-check the exact transient row**

Build predicate vectors in fixed id order and a fixed four-version matrix.
Compute SQL-side overall statuses with the same truth table solely to emit the
five counts. Return exactly one row and seven non-null columns:

```text
strict_source_equivalence_matrix text
canonical_effect_equivalent_count integer
absent_count integer
partial_count integer
conflicting_count integer
unverifiable_count integer
unknown_remote_migration_count integer
```

Do not emit raw definitions, object/role/owner names, OIDs, remote migration
versions, or diagnostic details.

- [x] **Step 6: Run SQL/reducer contract to GREEN**

Run:

```bash
node scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract.mjs
```

Expected: reducer and SQL sections pass and the focused contract is fully
GREEN. The runner RED is introduced only in Task 4, Step 1.

## Chunk 2: Closed Runner, Authority, And Verification

### Task 4: Implement the one-attempt approved runner without executing it

**Files:**

- Modify:
  `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract.mjs`
- Create:
  `scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-approved.mjs`
- Reference:
  `scripts/comment-translator-creator-c1-containerless-billing-phase-2-prior-migration-state-proof-approved.mjs`

- [x] **Step 1: Extend runner contract and prove RED**

Assert the future command is exactly:

```js
{
  file: cliPath,
  args: [
    "db",
    "query",
    "--linked",
    "--file",
    SQL_PATH,
    "--output-format",
    "json",
    "--log-level",
    "error"
  ]
}
```

Assert runner source includes:

- exact reviewed base/integration ref;
- the four canonical paths, order, blobs, byte SHA-256 values, and sizes;
- target path/version/blob/hash/size;
- CLI `2.109.0`;
- the exact focused contract path and a local child-process command that removes
  both approval/current-authority environment variables;
- `git check-ignore` for `supabase/.temp/project-ref`;
- `crypto.timingSafeEqual`;
- one `spawnSync` call for the future linked query;
- `timeout: 60_000`, `maxBuffer`, `windowsHide: true`, `NO_COLOR=1`;
- no retry loop, mutation command, raw error print, or private value print.

Run the contract and expect failure because the runner is absent.

- [x] **Step 2: Implement exact approval and authority gate**

Require both:

```text
argv[2]=--execute-approved
C1_PHASE2_STRICT_SOURCE_EQUIVALENCE_APPROVAL_ID=
  C1-CONTAINERLESS-BILLING-PHASE2-STRICT-SOURCE-EQUIVALENCE-PROOF-1
C1_PHASE2_MIGRATION_HISTORY_CURRENT_AUTHORITY=current-confirmed
```

Any mismatch returns `createBlockedBeforeRemoteResult("approval-gate")`.
Embedding the proposal id is not approval; only a future user-pasted exact
approval may satisfy it.

- [x] **Step 3: Implement numbered local gates with typed failures**

Create a local `GateFailure` carrying only one closed gate id. Validate in
order:

1. exact `HEAD` and integration ref;
2. four candidate path/order/blob/hash/byte sizes;
3. target path/version/blob/hash/byte size;
4. repository CLI exists and reports exactly `2.109.0`;
5. worktree link metadata exists, is nonempty, and is Git-ignored;
6. worktree link target is timing-safe equal to the established authority file;
7. the focused strict-proof contract exits `0` when rerun from the same
   worktree with both approval/current-authority environment variables removed.

Do not retain, hash, partially print, or report either linked target value.
For gate 7, spawn:

```js
{
  file: process.execPath,
  args: [
    "scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract.mjs"
  ],
  options: {
    cwd: root,
    encoding: "utf8",
    env: sanitizedContractEnv,
    timeout: 60_000,
    maxBuffer: 1024 * 1024,
    windowsHide: true
  }
}
```

`sanitizedContractEnv` must delete
`C1_PHASE2_STRICT_SOURCE_EQUIVALENCE_APPROVAL_ID` and
`C1_PHASE2_MIGRATION_HISTORY_CURRENT_AUTHORITY`. Discard the contract's
stdout/stderr. Nonzero exit, timeout, missing contract, or command mismatch is
`GateFailure("local-contract")`. This binds the gate to current reducer, SQL,
runner, and contract contents instead of trusting a stale/self-asserted marker.
The contract must fixture missing/nonzero/timeout paths and prove the
contract-spawned runner remains blocked with zero remote attempts.

Catch only to map the first `GateFailure`; discard underlying errors.

- [x] **Step 4: Implement one future process and immediate reduction**

After all gates pass, build exactly one command and call it once. Pass only
`status`, timeout state, and transient stdout directly to the reducer. Never
print stdout/stderr. Print only the reducer's allowlisted key/value result in
fixed key order. Exit nonzero for every non-complete execution status.

There is no retry, diagnostic query, repair, apply, or fallback process.

- [x] **Step 5: Prove default invocation blocks before remote access**

Run only through the contract's child-process assertion:

```bash
node scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract.mjs
```

The contract spawns the runner without the approval flag/env and asserts:

```text
execution_status=blocked-before-remote
abort_status=triggered-approval-gate
remote_read_attempt_count=0
remote_mutation_attempt_count=0
migration_repair_attempt_count=0
migration_apply_attempt_count=0
```

Expected: the complete strict-proof contract prints:

```text
comment_translator_creator_c1_phase_2_strict_source_equivalence_proof_contract=pass
```

Do not manually run the approved path.

### Task 5: Publish local readiness and proposal-only authority

**Files:**

- Modify:
  `docs/active/COMMENT_TRANSLATOR_CREATOR_C1_CONTAINERLESS_BILLING_PHASE_2_STRICT_SOURCE_EQUIVALENCE_DESIGN.md`
- Modify:
  `docs/active/COMMENT_TRANSLATOR_CREATOR_C1_CONTAINERLESS_BILLING_PHASE_2_REMOTE_SCHEMA_APPLY_PREFLIGHT.md`
- Modify: `task.md`
- Modify:
  `scripts/comment-translator-creator-c1-containerless-billing-phase-2-preflight-contract.mjs`
- Modify:
  `scripts/comment-translator-creator-cp1-paid-launch-readiness-contract.mjs`

- [x] **Step 1: Update the design implementation status**

Change only the status/implementation section to record:

```text
local implementation review-ready
local contract pass
remote strict proof not run
strict-proof remote read attempts=0
remote mutation/repair/apply attempts=0
approval status=proposal-only-not-approved
```

Do not rewrite the approved predicate or evidence semantics.

- [x] **Step 2: Add a strict-proof local-readiness section to the preflight**

Record:

- the four public artifact paths and fourteen exact support-module paths
  (`18` artifacts total);
- exact base and canonical candidate/target identities;
- 27/4/31/22 manifest;
- SQL seven-column transient interface;
- sanitized allowlist and prohibited evidence;
- one-attempt and first-blocker behavior;
- broader default-privileges security goal remains separate;
- presence/equivalence evidence does not authorize repair/apply;
- Phase 2 total historical remote-read count remains `3`;
- strict-proof remote-read count is `0`;
- all mutation/repair/apply/backfill counts remain `0`.

- [x] **Step 3: Add the paste-ready proposal verbatim**

Add this as a clearly labelled proposal, never as consumed approval:

```text
承認します。

approval_id=C1-CONTAINERLESS-BILLING-PHASE2-STRICT-SOURCE-EQUIVALENCE-PROOF-1
reviewed_base=38f0d7fa7fc5bb3e2ef443abce3f261e5026dd07
prior_approval_id=C1-CONTAINERLESS-BILLING-PHASE2-PRIOR-MIGRATION-STATE-PROOF-1
prior_result=coarse-present-3-partial-1-unknown-remote-10-no-repair-eligibility
candidate_versions=20260623000000,20260624000000,20260705000000,20260706073204
target_migration_version=20260730000000
target_canonical_git_blob=331db8095fc2ec09332718e9a5d05f62f26d18e8
target_canonical_git_blob_byte_sha256=27c116aa8872c9c1a04d0a3d0accd2a214e3c28a961ca92c6cb3ba6d3115cd15
action_label=one-sanitized-read-only-strict-source-equivalence-proof

同じtaskでcurrent authorityとopaque target bindingを再確認し、exact
base/ref、上記4 migrationのfilename/order/canonical blob/hash/byte
size、target migration identity、repository-pinned Supabase CLI
2.109.0、Git-ignored linked metadataと既存targetの一致、local contractが
すべて維持されている場合に限り、4つのrepository-known prior migration
についてcanonical-effect-equivalent-within-enumerated-predicate-domainを
read-onlyで1 attemptだけ確認することを承認します。保持・表示してよい
結果は公開repository versionごとのcanonical-effect-equivalent|absent|
partial|conflicting|unverifiable、固定categoryごとのpass|fail|
unverifiable、各status count、既知外remote migration count=10、
gate/review/attempt/mutation/repair/apply/execution/abort/unchecked-scope
statusだけです。transient predicate vector、relation/conflict state、
predicate id、unknown remote version値、raw catalog/query/CLI/connector
output、raw row/error、remote由来object/role/owner名、policy/function/ACL
source、private identifierまたはpartial valueは保存・表示しないでください。

この承認は単一query内で固定されたformat_type、pg_get_expr、
pg_get_constraintdef、pg_get_indexdef、aclexplode、acldefaultの
read-only catalog evaluationだけを含みます。この承認は
PRIOR-MIGRATION-STATE-PROOF-1、RECONCILIATION-1/2、
REMOTE-READINESS-2のretry、unknown remote versionの取得またはmapping、
migration history repair、db push、migration apply、SQL/DDL/DML mutation、
Auth/authority/billing/account/user data readまたはcount、
application/Edge Function invocation、PostgREST RPC call、
schema exposure/cache action、backfill、remediation、rollback、deploy、
commit、push、PR、merge、Phase 2 target apply、Phase 3以降を含みません。
最初のlocal gate不一致ではremote call前に停止し、
query/reducerの最初のsanitized failure、unknown remote count change、
またはunverifiableではretry・diagnostic query・repair・mutationを
行わず停止してください。canonical-effect-equivalentを含むどの結果も
historical execution identity、repair、またはapplyを承認しません。
```

- [x] **Step 4: Update the machine-readable preflight contract**

Set the top-level `nextApprovalUnit` to the proposed strict proof. Add:

```json
{
  "strictSourceEquivalenceProof": {
    "approvalUnit": "C1-CONTAINERLESS-BILLING-PHASE2-STRICT-SOURCE-EQUIVALENCE-PROOF-1",
    "approvalStatus": "proposal-only-not-approved",
    "localImplementationStatus": "review-ready",
    "localContractStatus": "pass",
    "candidateCount": 4,
    "predicateCounts": [27, 4, 31, 22],
    "unknownRemoteVersionCountExpected": 10,
    "remoteAttemptCount": 0,
    "remoteMutationCount": 0,
    "repairAttemptCount": 0,
    "applyAttemptCount": 0,
    "repairAuthorization": "not-authorized",
    "applyAuthorization": "not-authorized",
    "status": "ready-for-owner-review-not-approved"
  }
}
```

Keep the historical total execution count at `3`. Do not mark the proposal as
approved or consumed.

- [x] **Step 5: Update `task.md` narrowly**

Replace the stale “no next remote unit” sentence with:

- strict canonical-effect proof design approved;
- local implementation/contract review-ready;
- next approval unit is the proposal-only strict proof id;
- no strict remote attempt has occurred;
- repair/apply remain blocked regardless of future proof result.

Do not expand the task board with predicate details already owned by the
authority documents.

- [x] **Step 6: Extend shared contracts**

In the preflight contract assert the exact proposal status, next approval unit,
predicate counts, zero strict-proof attempts, unchanged Phase 2 total remote
read count, and all zero mutation/apply counters.

In the paid-launch readiness contract preserve the exact predecessor
reconciliation and prior-proof artifact entries already present in this
same-task worktree, and add exactly the four public artifacts and fourteen
support modules (`18` strict-proof artifacts total). Do not broadly allow
unrelated files.

### Task 6: Run targeted then broad local verification

**Files:**

- Verify all files listed in the file responsibility map.

- [x] **Step 1: Run syntax checks**

Run:

```bash
node --check scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-reducer.mjs
node --check scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-approved.mjs
node --check scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract.mjs
```

Expected: all exit `0` with no syntax errors.

- [x] **Step 2: Run focused contracts**

Run:

```bash
node scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract.mjs
node scripts/comment-translator-creator-c1-containerless-billing-phase-2-preflight-contract.mjs
```

Expected:

```text
comment_translator_creator_c1_phase_2_strict_source_equivalence_proof_contract=pass
comment_translator_creator_c1_phase_2_preflight_contract=pass
```

- [x] **Step 3: Run broad preservation contracts**

Run:

```bash
node scripts/comment-translator-creator-c1-containerless-billing-phase-2-remote-readiness-approved-contract.mjs
node scripts/comment-translator-creator-c1-containerless-billing-phase-2-migration-history-reconciliation-contract.mjs
node scripts/comment-translator-creator-c1-containerless-billing-phase-2-prior-migration-state-proof-contract.mjs
node scripts/comment-translator-creator-c1-containerless-billing-read-contract.mjs
node scripts/comment-translator-creator-cp1-paid-launch-readiness-contract.mjs
node scripts/comment-translator-task-board-creator-roadmap-contract.mjs
```

Expected: every command exits `0` and prints its existing `...=pass` marker.

- [x] **Step 4: Inspect the final diff and sanitized boundary**

Run:

```bash
git diff --check
git status --short
git diff --stat
```

Use a local count-only scan to assert zero newly introduced secret/token/
cookie/private-target fixtures. Do not print matched lines or partial values.
Inspect every strict-proof file and the exact authority/task hunks.

Expected:

- only the planned files plus the already present reconciliation/proof changes
  are modified/untracked;
- no manifest/lockfile change;
- no raw/sensitive evidence;
- no remote execution record for the strict proof;
- no consumed/approved status for the proposal;
- no commit, push, or PR.

- [x] **Step 5: Stop at the local preparation boundary**

Report:

- exact changed files;
- targeted and broad checks with exit status;
- strict proof remote attempt count `0`;
- total historical Phase 2 remote read count still `3`;
- mutation/repair/apply/backfill counts `0`;
- blockers and unchecked scope;
- the exact next approval unit.

Do not run the proposal. Wait for a new user-pasted exact approval in the same
task.
