# Creator C1 Phase 2 Strict Source-Equivalence Proof Design

Status: local implementation review-ready

```text
local contract: pass
remote strict proof: not run
strict-proof remote read attempts: 0
remote mutation / repair / apply attempts: 0 / 0 / 0
approval status: proposal-only-not-approved
```

Design unit:
`C1-CONTAINERLESS-BILLING-PHASE2-STRICT-SOURCE-EQUIVALENCE-DESIGN-1`

Reviewed base:
`38f0d7fa7fc5bb3e2ef443abce3f261e5026dd07`

## Purpose

Define the next reviewable proof for the four repository-known prior migration
versions that remain absent from remote migration history. The proof may
establish
`canonical-effect-equivalent-within-enumerated-predicate-domain` before a
version can be considered for a separately approved history-only repair.

That claim is deliberately narrower than historical execution identity,
whole-schema identity, or proof that no later migration added compatible
state. It covers only the closed canonical predicate manifest defined here.

This design performs no remote query, migration-history repair, `db push`,
migration apply, SQL mutation, backfill, exposure/cache action, deploy,
commit, push, PR, merge, or Phase 2-and-later operation.

## Evidence Correction

The consumed
`C1-CONTAINERLESS-BILLING-PHASE2-PRIOR-MIGRATION-STATE-PROOF-1`
result remains an accurate record of its fixed coarse predicates:

- three versions satisfied all coarse predicates;
- version `20260705000000` satisfied only some coarse predicates;
- the unknown remote migration count remained `10`;
- remote mutation, repair, and apply counts remained zero.

Its `equivalent-present` label must be interpreted as
`coarse-effect-present`, not exact migration equivalence. The coarse proof did
not cover every column attribute, default, key, constraint definition, grant,
policy expression, index definition, or comment. It therefore establishes no
repair eligibility for any version.

## Considered Approaches

### Selected: strict proof for all four versions

Run one later, exactly approved, read-only query whose source-bound predicates
cover every canonical effect group for all four versions. Reduce the result to
public repository versions, fixed category labels, fixed statuses, and counts.

This avoids treating the three coarse passes as repair-ready and produces one
consistent evidence contract for all four versions.

### Rejected: detail only the partial version

This would identify the incomplete categories for `20260705000000`, but the
other three versions would still lack closed canonical-effect evidence. It
creates a second proof later and delays a coherent oldest-first decision.

### Rejected: repair coarse passes and diagnose only the partial version

This relies on incomplete evidence and can insert history rows for migrations
whose canonical effects have not been proven. It is not eligible for approval.

## Canonical Identities

| order | version | canonical path | Git blob | canonical byte SHA-256 | bytes |
| --- | --- | --- | --- | --- | ---: |
| 05 | `20260623000000` | `supabase/migrations/20260623000000_comment_translator_real_comments_feed_snapshots.sql` | `cead8d52e3361149f8476f3852263aabdc38b369` | `618233207efc605f70d2c806ad2fc705052ec8db7eeed361defc3dfb0cca0522` | 3474 |
| 06 | `20260624000000` | `supabase/migrations/20260624000000_account_display_timezone_preference.sql` | `01352c948683ddffbc246b7ea26bb220e4465b3c` | `e027e146d5094b5010fe35ba6201c66fb42a537daa7bf63c1f223e407418aae2` | 701 |
| 07 | `20260705000000` | `supabase/migrations/20260705000000_comment_translator_creator_waitlist_registrations.sql` | `86253c3d8751d01df1359dc6e407553d31419902` | `037e3a72b20502e26e8c45e4d4227e25a1e4405b6bd28c39fcd246e4b7ddcfd0` | 3318 |
| 08 | `20260706073204` | `supabase/migrations/20260706073204_supabase_default_privileges_guard.sql` | `761e3e740c8e317a76da4c5bb9505060b7746ce5` | `5454fc4ed5381eb29e11d573d0655b4c62172b6f46429d7a3222ebe03184291e` | 1135 |

The Phase 2 target remains separately bound to:

```text
version=20260730000000
path=supabase/migrations/20260730000000_comment_translator_c1_containerless_billing_read.sql
git_blob=331db8095fc2ec09332718e9a5d05f62f26d18e8
canonical_byte_sha256=27c116aa8872c9c1a04d0a3d0accd2a214e3c28a961ca92c6cb3ba6d3115cd15
bytes=22041
```

## Comparison Domain And Normalization

All expected values are fixed repository-local constants derived from the
canonical Git blobs. A future query may not accept arbitrary runtime variants.

- objects are addressed by canonical namespace and canonical public name;
- data types use `format_type`;
- defaults, checks, policies, and indexes use the fixed catalog renderings from
  `pg_get_expr`, `pg_get_constraintdef`, and `pg_get_indexdef`;
- repository-local fixtures enumerate every accepted rendering produced by the
  pinned PostgreSQL/Supabase environment; no free-form whitespace or expression
  rewriting is accepted;
- column order, nullability, default posture, identity/generated posture, key
  actions, index uniqueness, and index sort direction are compared as
  structured values;
- comments are compared as exact UTF-8 strings;
- ACLs are compared as effective semantic
  `(object_class, grantee, privilege)` tuples, never as raw ACL text;
- a missing required input, duplicate object or row, `NULL`, unknown enum, or
  unrecognized catalog rendering makes the affected version `unverifiable`.

Compatible state added later is not automatically a conflict. Additional
noncanonical columns, constraints, indexes, and comments are outside this
proof. The following additions are conflicts inside the closed domain:

- a canonical name bound to an incompatible object kind or definition;
- any extra policy that grants `PUBLIC`, `anon`, or `authenticated` access on
  either canonical trusted-server table;
- any effective table privilege for `PUBLIC`, `anon`, or `authenticated`;
- trusted-server table privileges outside the canonical grant set;
- a canonical object-name collision with the wrong relation kind.

Default privileges outside the canonical owner/schema/grantee/object-class/
privilege tuples below are out of scope and remain a separate security goal.

## Closed Predicate Manifest

The query evaluates each predicate id exactly once. Predicate ids stay
internal and are never retained in sanitized evidence.

### `20260623000000` (27 predicates)

| category | fixed predicate ids | count |
| --- | --- | ---: |
| relation | `m05_relation_01` | 1 |
| columns | `m05_column_01` through `m05_column_08` | 8 |
| keys | `m05_key_01` through `m05_key_02` | 2 |
| constraints | `m05_constraint_01` through `m05_constraint_04` | 4 |
| rls | `m05_rls_01` | 1 |
| grants | `m05_grant_01` through `m05_grant_03` | 3 |
| policy | `m05_policy_01` | 1 |
| indexes | `m05_index_01` through `m05_index_02` | 2 |
| comments | `m05_comment_01` through `m05_comment_05` | 5 |

These predicates cover relation kind, exact canonical eight-column attributes,
primary/foreign keys and actions, four checks, RLS, browser revokes,
trusted-server grants, the canonical policy, both indexes, and all five
comments.

### `20260624000000` (4 predicates)

| category | fixed predicate ids | count |
| --- | --- | ---: |
| relation | `m06_relation_01` | 1 |
| columns | `m06_column_01` | 1 |
| constraints | `m06_constraint_01` | 1 |
| comments | `m06_comment_01` | 1 |

### `20260705000000` (31 predicates)

| category | fixed predicate ids | count |
| --- | --- | ---: |
| relation | `m07_relation_01` | 1 |
| columns | `m07_column_01` through `m07_column_10` | 10 |
| keys | `m07_key_01` through `m07_key_02` | 2 |
| constraints | `m07_constraint_01` through `m07_constraint_05` | 5 |
| rls | `m07_rls_01` | 1 |
| grants | `m07_grant_01` through `m07_grant_03` | 3 |
| policy | `m07_policy_01` | 1 |
| indexes | `m07_index_01` through `m07_index_02` | 2 |
| comments | `m07_comment_01` through `m07_comment_06` | 6 |

These predicates cover relation kind, exact canonical ten-column attributes,
primary/foreign keys and actions, five checks, RLS, browser revokes,
trusted-server grants, the canonical policy, both indexes, and all six
comments.

### `20260706073204` (22 predicates)

The canonical public identity domain is owner `postgres`, schema `public`, and
grantees `anon`, `authenticated`, `service_role`, and `PUBLIC`.

| category | fixed predicate ids | count |
| --- | --- | ---: |
| canonical_default_privileges | `m08_table_acl_01` through `m08_table_acl_12` | 12 |
| canonical_default_privileges | `m08_sequence_acl_01` through `m08_sequence_acl_06` | 6 |
| canonical_default_privileges | `m08_function_acl_01` through `m08_function_acl_04` | 4 |

The table set is four privileges across three browser/trusted roles; the
sequence set is two privileges across the same three roles; the function set
is execution for those three roles plus `PUBLIC`.

The query selects the canonical owner and namespace by public names but never
retains their OIDs. For each default-ACL object class:

- exactly one matching `pg_default_acl` row uses `defaclacl`;
- no matching row uses `acldefault(object_type, owner_oid)`;
- more than one row, missing owner/namespace, `NULL`, or an unknown object type
  is `unverifiable`;
- a predicate passes only when its exact forbidden effective tuple is absent.

This proves only canonical migration effects in the enumerated domain. It does
not complete the broader managed/private-owner default-privileges security
goal.

## Output Contract

The only per-category values are `pass|fail|unverifiable`. The only per-version
overall values are:

```text
canonical-effect-equivalent
absent
partial
conflicting
unverifiable
```

The fixed category labels are repository-public design labels:

```text
relation
columns
keys
constraints
rls
grants
policy
indexes
comments
canonical_default_privileges
```

Each version emits only the categories applicable to that canonical migration,
in manifest order. Classification uses this closed precedence:

1. Any missing, duplicate, `NULL`, or unrecognized predicate input is
   `unverifiable`.
2. Any fixed conflict detector makes the version `conflicting`.
3. For relation-dependent migrations, absent canonical relation plus zero
   canonical dependent effects is `absent`; an absent relation plus any
   canonical dependent effect is `conflicting`.
4. For the default-privileges migration, all 22 forbidden tuples present is
   `absent`; a mix of present and absent tuples is `partial`.
5. Every applicable category `pass` is `canonical-effect-equivalent`.
6. Any remaining mixture of `pass` and `fail` is `partial`.
7. A present canonical relation with all other categories `fail` is `partial`.

Thus `unverifiable` and `conflicting` always outrank `partial`.

### SQL-to-reducer transient interface

The read-only SQL returns exactly one row with exactly these seven columns,
names, types, nullability, and order:

```text
strict_source_equivalence_matrix text not null
canonical_effect_equivalent_count integer not null
absent_count integer not null
partial_count integer not null
conflicting_count integer not null
unverifiable_count integer not null
unknown_remote_migration_count integer not null
```

The matrix column is transient reducer input, not retained sanitized evidence.
It uses this fixed serialization:

```text
version:relation_state:conflict_state:predicate_vector|...
```

Version order is `20260623000000`, `20260624000000`, `20260705000000`,
`20260706073204`. `relation_state` is exactly
`canonical|absent|incompatible|not-applicable|unverifiable`;
`not-applicable` is valid only for `20260706073204`. `conflict_state` is
exactly `clear|conflict|unverifiable`. `predicate_vector` contains one
`p|f|u` character per manifest predicate in fixed predicate-id order, with
exact lengths `27`, `4`, `31`, and `22`.

The reducer uses relation state to distinguish canonical absence from an
incompatible relation, uses conflict state for the closed extra-state conflict
detectors, and uses every predicate character to recompute category status.
For the default-privileges version, 22 `f` values means `absent`, 22 `p`
values means `canonical-effect-equivalent`, and a valid mixture means
`partial`. Duplicate, missing, extra, reordered, `NULL`, ill-typed, or
wrong-length values are invalid sanitized output. The reducer recomputes
category results, overall classifications, and all five status counts rather
than trusting SQL totals. It discards the transient matrix immediately after
reduction and never logs, retains, or displays predicate vectors.

The retained `strict_source_equivalence_matrix` is a different, sanitized
representation containing only public repository version, overall status, and
applicable category labels/statuses. It never contains relation state,
conflict state, predicate ids, or predicate vectors.

Allowed retained fields:

```text
approval_id
approval_gate_status
reviewed_base_status
candidate_identity_status
target_binding_status
cli_version_status
linked_metadata_status
linked_target_status
local_contract_status
strict_source_equivalence_matrix[
  {version,overall_status,categories[{label,status}]}
]
canonical_effect_equivalent_count
absent_count
partial_count
conflicting_count
unverifiable_count
unknown_remote_migration_count
default_privileges_security_goal_status
remote_read_attempt_count
remote_mutation_attempt_count
migration_repair_attempt_count
migration_apply_attempt_count
execution_status
sanitized_output_review_status
abort_status
unchecked_scope_status
```

`default_privileges_security_goal_status` is limited to
`separately-blocked|not-evaluated`. It may not expose owner names, owner counts,
membership, ACL text, or private-role metadata.

`approval_gate_status`, `reviewed_base_status`, `candidate_identity_status`,
`target_binding_status`, `cli_version_status`, `linked_metadata_status`,
`linked_target_status`, `local_contract_status`, and
`sanitized_output_review_status` are each exactly
`pass|fail|not-evaluated`. On successful reduction all nine are `pass`.

`execution_status` is one of:

```text
strict-source-equivalence-complete
blocked-before-remote
blocked-remote-read-failed
blocked-sanitized-output-invalid
blocked-unknown-remote-count-changed
blocked-unverifiable
```

`abort_status` is one of:

```text
not-triggered
triggered-approval-gate
triggered-base-ref-mismatch
triggered-candidate-identity-mismatch
triggered-target-identity-mismatch
triggered-cli-version-mismatch
triggered-linked-metadata-mismatch
triggered-linked-target-mismatch
triggered-local-contract-failed
triggered-remote-read-failed
triggered-sanitized-output-invalid
triggered-unknown-remote-count-changed
triggered-unverifiable
```

`unchecked_scope_status` is exactly
`repair-apply-and-later-not-run`. No status field may append a detail string.

The retained result is a tagged union selected by `execution_status`:

- `strict-source-equivalence-complete` includes the sanitized matrix and all
  five integer classification counts plus
  `unknown_remote_migration_count=10`;
- every `blocked-*` result omits the matrix, all five classification count
  fields, and `unknown_remote_migration_count`; they are never emitted as
  `NULL`, zero, empty, or `not-evaluated`;
- every result includes `approval_id`, the nine gate/review statuses, four
  attempt counts, `default_privileges_security_goal_status`,
  `execution_status`, `abort_status`, and `unchecked_scope_status`;
- a gate not yet reached is `not-evaluated`; the first failed gate is `fail`;
  every earlier gate is `pass`;
- `sanitized_output_review_status` is `not-evaluated` before a reducible remote
  result exists, and `fail` for any transient interface or reduction failure.

`default_privileges_security_goal_status` is always retained and remains
`separately-blocked` after any remote attempt; it is `not-evaluated` when
execution blocks before remote access.

Prohibited evidence:

- raw catalog/query/CLI/connector output or raw errors;
- raw rows or row counts from application, Auth, authority, billing, account,
  user, waitlist, or feed data;
- object, role, owner, project, organization, account, database, or target
  identifiers obtained from the remote;
- raw column/default/constraint/policy/index/comment/ACL definitions;
- unknown remote migration version values or attempted mappings;
- private hashes, partial values, URLs, connection data, secrets, tokens,
  cookies, headers, or session values.

## Approval Gate And Execution Flow

Before any remote process:

1. Match an exact, new approval id and the current authority in the same task.
2. Revalidate exact HEAD and integration ref.
3. Revalidate all four paths, order, canonical blobs, byte SHA-256 values, and
   byte sizes.
4. Revalidate the Phase 2 target identity.
5. Revalidate repository-pinned Supabase CLI `2.109.0`.
6. Revalidate Git-ignored linked metadata and opaque equality with the existing
   approved target without retaining or displaying its value.
7. Pass reducer fixtures and the closed approval-gate contract locally.

Only then may the runner issue one `db query --linked` read-only process. Raw
stdout/stderr exists only in transient process memory and is passed directly to
the reducer. The runner prints only the fixed sanitized result.

The first local mismatch stops before remote access with
`remote_read_attempt_count=0`; the lowest numbered failed local gate above is
the sole reported abort reason. The mapping is closed:

| gate | failure abort status |
| ---: | --- |
| 1 | `triggered-approval-gate` |
| 2 | `triggered-base-ref-mismatch` |
| 3 | `triggered-candidate-identity-mismatch` |
| 4 | `triggered-target-identity-mismatch` |
| 5 | `triggered-cli-version-mismatch` |
| 6a: linked metadata absent/invalid | `triggered-linked-metadata-mismatch` |
| 6b: opaque linked target unequal | `triggered-linked-target-mismatch` |
| 7 | `triggered-local-contract-failed` |

After the one remote process starts, the first blocker is selected in this
fixed order:

1. nonzero exit or timeout: `blocked-remote-read-failed`; do not parse output;
2. row/key/type/null/duplicate/order failure:
   `blocked-sanitized-output-invalid`;
3. unknown remote migration count other than `10`:
   `blocked-unknown-remote-count-changed`;
4. matrix/category/count/classification inconsistency:
   `blocked-sanitized-output-invalid`;
5. a valid `unverifiable` classification: `blocked-unverifiable`;
6. otherwise: `strict-source-equivalence-complete`.

Every blocker stops after the first attempt with no retry, diagnostic query,
repair, mutation, or later action. Raw process failure details are discarded
and never used to enrich the sanitized abort status.

## Test Contract

Implementation planning must include:

- SQL text is one read-only statement and contains no mutation verb;
- canonical version/order/blob/hash/byte-size assertions;
- exact applicable category order for each version;
- the exact 27/4/31/22 predicate manifests and SQL result schema;
- fixed catalog-normalization fixtures for every accepted repository-local
  rendering;
- reducer fixtures for every overall status;
- classification-precedence fixtures covering simultaneous failures;
- extra-state conflict and compatible-out-of-domain fixtures;
- absent-row `acldefault` and duplicate/default-ACL-row fixtures;
- category count and overall-status consistency rejection;
- transient predicate-vector fixtures proving independent absent/partial/
  conflicting recomputation;
- blocked tagged-union fixtures for every local and remote abort status;
- exact gate-to-status and gate-to-abort mapping assertions;
- unknown remote count fixed at `10` unless a later authority explicitly
  refreshes it;
- extra/missing/reordered key rejection;
- raw sentinel non-retention on CLI and reducer failures;
- closed approval gate returning zero remote attempts;
- opaque target binding comparison without value disclosure;
- successful output containing repair/apply counts of zero.

## Decision Boundary After A Future Proof

The future proof is evidence only:

- `canonical-effect-equivalent` may make one version eligible for a new,
  separate owner-reviewed history-only repair design and exact approval; it
  does not prove historical execution identity or whole-schema identity;
- `absent`, `partial`, or `conflicting` requires a migration-specific
  remediation design; replaying the original migration is not inferred safe;
- `unverifiable` requires stop and a new design, not a diagnostic retry;
- the default-privileges broader security goal remains separately blocked even
  if its canonical migration effect is `canonical-effect-equivalent`.

At most one oldest unresolved version may be operated on under any later
approval. After each repair or migration-specific remediation, a new
reconciliation proof is required before selecting another version. Phase 2
target apply remains ineligible until all four prior versions are resolved and
a fresh 17-version reconciliation proves `20260730000000` is the sole pending
migration.

## Implementation And Approval Status

The SQL, reducer, closed approved runner, and local execution contract are
implemented and locally review-ready. The focused strict source-equivalence
contract passes without entering the approved path. The implementation is
split into 4 public artifacts and 14 support modules (18 artifacts total) so
the public proof boundary stays explicit while fixture, validation, and
scenario responsibilities remain isolated.

No strict remote proof has run. Strict-proof remote read attempts are `0`;
remote mutation, migration-history repair, and migration apply attempts are
`0 / 0 / 0`. The future strict-proof approval id is present only in
paste-ready proposal text and the closed local gate. Its approval status is
`proposal-only-not-approved`.

No approval is currently eligible for remote execution. No wording in this
document authorizes a remote query, repair, apply, backfill, exposure/cache
action, deploy, commit, push, PR, merge, or later phase.
