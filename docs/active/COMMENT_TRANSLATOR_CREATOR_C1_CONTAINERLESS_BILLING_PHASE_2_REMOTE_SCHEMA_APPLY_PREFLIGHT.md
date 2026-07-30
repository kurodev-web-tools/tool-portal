# Creator C1 Containerless Billing Phase 2 Remote Schema Apply Preflight

Status: local review-ready / blocked before remote read.

This authority prepares the separately gated Phase 2 schema apply defined by
`docs/future/COMMENT_TRANSLATOR_CREATOR_C1_CONTAINERLESS_BILLING_STATE_READ_DESIGN.md`.
It does not authorize or perform a Supabase query, migration apply, backfill,
schema exposure/cache action, RPC call, cutover, deploy, activation, or release.

## Reviewed Base And Migration Identity

| Evidence | Exact local result |
| --- | --- |
| fetched integration branch | `origin/codex/comment-translator-free-public-beta-integration` |
| fetched integration / detached HEAD / merge-base | `ea6928f5f0160ab3db453f845e4fb16245bb4e9e` |
| integration tree | `41c23217fd8750fc31204dc46f0a235324090b84` |
| PR #719 state | `MERGED` |
| reviewed PR #719 head | `feb33c7986b0410c94045b06bf37d534d637fb4c` |
| migration path | `supabase/migrations/20260730000000_comment_translator_c1_containerless_billing_read.sql` |
| migration version | `20260730000000` |
| canonical Git blob | `331db8095fc2ec09332718e9a5d05f62f26d18e8` |
| canonical Git-blob byte SHA-256 | `27c116aa8872c9c1a04d0a3d0accd2a214e3c28a961ca92c6cb3ba6d3115cd15` |
| canonical byte size | `22041` |
| local migration order | `17 / 17` |
| later local migration count | `0` |
| explicit `BEGIN` / `COMMIT` / `ROLLBACK` count | `0 / 0 / 0` |

The working-tree byte SHA-256 is
`f79b8bbf096fc42611f0eaac1862669cfa05f804b49be0dc6d0b4af5fb1aa255`
because the Windows checkout uses different line endings from the canonical Git
blob. The canonical Git blob and its byte SHA-256 are the reviewed apply
identity. A future operator must not substitute the working-tree hash for that
identity without a new review.

PR #718 approved the design only. PR #719 merged the Phase 1 local source and
tests only. Neither PR authorizes this Phase 2 remote operation.

## Repository Tooling And Transaction Model

- `package-lock.json` pins Supabase CLI `2.109.0`.
- The current worktree has the repository-pinned
  `node_modules/.bin/supabase` CLI `2.109.0`; login is user-confirmed and the
  linked-project metadata is present and Git-ignored. `psql`, Docker, Podman,
  `supabase/config.toml`, and `supabase/roles.sql` remain unavailable.
- No dependency installation or manifest/lockfile change was performed.
- Supabase CLI `2.109.0` compares all local migration versions with the remote
  migration-history table and passes the full pending set to `ApplyMigrations`.
  `db push` has no flag that selects one named migration file.
- For each pending file, CLI `2.109.0` runs `RESET ALL`, parses that file, and
  sends its statements plus the migration-history insert in one
  `pgconn.ExecBatch`. The pinned source describes that batch as implicitly
  transactional. One file failure rolls back that file and its history insert;
  already committed earlier pending files are not rolled back.
- Therefore the reviewed one-attempt/one-transaction boundary is implementable
  only when a separately approved sanitized remote-history preflight proves
  that version `20260730000000` is the sole pending migration. A normal
  `db push` against an unverified pending set is prohibited.
- `--include-all`, `--include-roles`, `--include-seed`, migration repair,
  migration squash, and any bundle apply are prohibited for this unit.

Pinned source reviewed:

- [Supabase CLI 2.109.0 pending selection](https://github.com/supabase/cli/blob/v2.109.0/apps/cli-go/internal/migration/up/up.go)
- [Supabase CLI 2.109.0 per-file apply loop](https://github.com/supabase/cli/blob/v2.109.0/apps/cli-go/pkg/migration/apply.go)
- [Supabase CLI 2.109.0 implicit batch transaction](https://github.com/supabase/cli/blob/v2.109.0/apps/cli-go/pkg/migration/file.go)

## Required Dependencies And Ordering

The migration assumes all of the following before its one transaction begins:

1. all 16 earlier repository migrations are present in the target migration
   history in the expected order;
2. `auth.users`, `auth.uid()`, the standard API roles, and the migration
   connection role are available;
3. `public.comment_translator_paid_entitlements` and its existing signed-evidence
   writer from version `20260722000000` exist in the reviewed shape;
4. the target can install or validate `pgcrypto` in `extensions`;
5. the apply identity can create and alter the two reviewed `NOLOGIN` roles,
   grant and revoke their temporary membership to the migration role, alter
   default privileges for the reviewed creators, create schemas/tables/
   policies/triggers/functions, and transfer ownership as written;
6. the reviewed role and schema names do not collide with an unrelated object
   or membership;
7. the custom API schema is not exposed before Phase 2;
8. Checkout/webhook/billing mutation and any direct authority-table writer are
   closed for the Phase 2 to Phase 3 gap.

The migration itself fails closed on unsafe final role membership, role
attributes, ownership, unexpected API objects, and schema `CREATE` privilege.
Those in-transaction assertions do not replace the pre-apply target,
capability, history, exposure, or mutation-gate checks.

## Capability And Prerequisite Matrix

| Capability / prerequisite | State | Preflight decision |
| --- | --- | --- |
| exact fetched base, PR head, path, version, blob, canonical hash | confirmed local | fixed above |
| migration is last in the local ordered set | confirmed local | `17 / 17`, later count `0` |
| pinned CLI per-file implicit transaction | confirmed from tag `v2.109.0` | usable only after sole-pending proof |
| exact-one migration selection | blocking | CLI selects all pending; remote history is unverified |
| executable pinned CLI in this worktree | blocking | absent; install is not approved |
| opaque target mapping | blocking | no current approved target authority |
| target owner | blocking | no current approved owner authority |
| apply owner | blocking | no current approved owner authority |
| rollback owner | blocking | no current attestation for this migration |
| sanitized output reviewer | blocking | no current attestation for this migration |
| exact Phase 2 approval | blocking | absent |
| target health / pause state | unresolved | no remote/control-plane read occurred |
| target PostgreSQL / role capability | unresolved | no remote catalog/capability read occurred |
| prior migration-history/order | unresolved | no remote migration-history read occurred |
| dependency object and collision state | unresolved | no remote catalog read occurred |
| custom API schema exposure | blocking | must be confirmed unexposed before apply |
| PostgREST schema cache | intentionally later | no reload or recognition proof in Phase 2 |
| billing mutation/direct-writer gate | blocking | must be confirmed closed through Phase 3 |
| owner-binding population | intentionally later | Phase 3 only; count/read/backfill prohibited here |
| rollback execution authority | absent | stop/escalate only; no inverse SQL authorized |

Older target labels, rollback-owner labels, output-reviewer labels, linked
metadata, and migration approvals in the CP1 authority were bound to different
migrations and revisions. They are precedent only and are not current authority
for this Phase 2 unit.

## Design-To-Execution Findings

The approved design calls Phase 2 an additive remote schema apply, but the
merged Phase 1 SQL is not limited to creating new objects. In the same
transaction it also:

- forces RLS on the existing entitlement table;
- replaces the existing signed-evidence writer with a binding-required writer;
- reduces direct `service_role` table access to the reviewed read-only shape;
- changes global future-routine default privileges for the two reviewed creator
  roles; and
- grants the new RPC to `authenticated` before the later custom-schema exposure
  operation.

These changes match the merged Phase 1 design, but they make two execution
preconditions mandatory:

1. If the current billing mutation path or any direct table writer can run
   before Phase 3 owner-binding population, Phase 2 can reject a previously
   accepted write. The apply must remain blocked unless the release authority
   confirms those mutation paths are closed for the whole Phase 2 to Phase 3
   interval, or a new reviewed design changes the migration ordering.
2. If `comment_translator_api` is already exposed, the authenticated RPC can
   become reachable at commit. The apply must remain blocked unless one
   sanitized preflight proves the schema is unexposed.

The PostgreSQL default-privilege behavior is intentional: schema-specific
`REVOKE` cannot cancel a global default `PUBLIC EXECUTE`, so the migration uses
global function-default revokes. This affects future routines created by those
roles across the database, not existing routines. The target/apply owner must
have the required role authority; prior repository evidence recorded a
different owner-specific default-privilege path as
`blocked-permission-unavailable`, so current capability cannot be inferred.

Relevant current documentation:

- [PostgreSQL 18 `CREATE ROLE`](https://www.postgresql.org/docs/current/sql-createrole.html)
  requires `CREATEROLE` or superuser authority.
- [PostgreSQL 18 `ALTER DEFAULT PRIVILEGES`](https://www.postgresql.org/docs/current/sql-alterdefaultprivileges.html)
  applies to the current role or roles whose authority is held; per-schema
  revokes cannot cancel global grants.
- [Supabase custom schemas](https://supabase.com/docs/guides/api/using-custom-schemas)
  require a separate exposed-schema configuration and grants.
- [Supabase PostgREST schema reload](https://supabase.com/docs/guides/troubleshooting/refresh-postgrest-schema)
  is a separate SQL action and is not part of Phase 2.

No approved design boundary was weakened. The findings above block execution;
they do not silently move backfill, exposure/cache, or cutover into Phase 2.

## Fixed First-Blocker Apply Plan

The future `C1-CONTAINERLESS-BILLING-PHASE2-APPLY-1` operation must use this
order and stop at the first failed or unresolved item:

1. Confirm same-thread exact approval, opaque target binding, target owner,
   apply owner, rollback owner, and sanitized output reviewer.
2. Confirm Checkout/webhook/billing mutation and direct table writes remain
   closed until a separately approved Phase 3 completes.
3. Fetch the integration branch and require exact base, path, version, blob,
   canonical hash, migration position, and zero later local migrations.
4. Through a separately approved sanitized read-only remote readiness unit,
   require healthy target state, exact prior migration order, exactly one
   pending migration, required dependency/object presence, zero unsafe role/
   schema collisions, sufficient apply-role capability, and unexposed
   `comment_translator_api`.
5. Require an executable trusted Supabase CLI `2.109.0` path and a reducer that
   suppresses raw command output and emits only the allowlist below. Do not
   install a dependency inside the apply unit.
6. Run one `db push` attempt with migrations enabled and with no include-all,
   role, seed, repair, or extra action. The sole pending file is the exact
   reviewed migration, so its statements and history insert form the one
   implicit transaction.
7. Record `pass` only for one attempt, one applied migration, one committed
   transaction, zero additional migrations/actions, and sanitized output review
   pass.
8. Stop immediately after the apply result. Do not query or inspect the
   post-apply database in this unit.

Abort before the remote apply if any authority or precondition is missing,
mismatched, stale, ambiguous, or would require private output. Abort after the
first sanitized result on already-applied, unknown, partial, failed,
rolled-back, unexpected-pending, unexpected-output, or permission-unavailable.
Do not retry.

## Rollback Boundary

- No Codex-initiated inverse migration, drop, grant repair, role repair,
  migration-history repair, reset, restore, cleanup, or data rewrite is
  authorized.
- If the CLI reports the current file transaction rolled back, retain only
  `transaction_status=rolled-back` and
  `rollback_status=platform-transaction-only`, keep Paid closed, and stop.
- If transaction state is unknown or partial, do not inspect or repair it in
  the apply unit. Escalate to the confirmed rollback owner.
- If commit is confirmed, a later safety response may first revoke RPC
  execution and keep the consumer disabled only under a new exact approval.
  Do not drop the new schemas, roles, binding table, trigger, or authority rows
  as inferred rollback.
- Existing signed authority rows must remain unchanged. Phase 3 backfill,
  conflict handling, or any authority-row operation is not rollback.

## Sanitized Evidence Contract

Allowed retained fields for the read-only readiness unit:

```text
approval_id
reviewed_base_status
migration_identity_status
target_binding_status
target_owner_status
apply_owner_status
rollback_owner_status
output_reviewer_status
project_health_status
postgres_capability_status
migration_history_status
expected_prior_migration_count
sole_pending_migration_count
unexpected_pending_migration_count
dependency_status
role_capability_status
role_collision_count
schema_collision_count
api_exposure_status
billing_mutation_gate_status
remote_read_attempt_count
remote_mutation_attempt_count
execution_status
sanitized_output_review_status
abort_status
unchecked_scope_status
```

Allowed retained fields for the later apply unit:

```text
approval_id
reviewed_base_status
migration_identity_status
target_binding_status
action_label
migration_attempt_count
migration_apply_count
migration_status
transaction_status
additional_migration_count
remote_read_attempt_count
remote_mutation_attempt_count
execution_status
sanitized_output_review_status
abort_status
rollback_status
unchecked_scope_status
```

Prohibited evidence includes raw SQL or command output; raw catalog/history
rows; raw errors; project/account/database/organization identifiers or URLs;
connection role names or membership rows; user/owner/billing/Stripe references;
secrets, credentials, tokens, cookies, headers, session values, signed-evidence
payloads, private hashes or partial values; table rows; function source;
policy expressions containing private material; migration-history statement
arrays; and browser/storage/DOM/console captures.

Repository-public branch, commit, path, migration version, Git object, and
canonical source hash are allowed identity evidence. They must never be mixed
with a private target value.

## Phase Separation

| Phase | Status after this preflight | Explicit exclusion |
| --- | --- | --- |
| Phase 2 schema apply | blocked / separate approval | no remote read or apply occurred |
| Phase 3 owner-binding population | not run | no Auth/authority counts, rows, backfill, trigger smoke, or writer smoke |
| custom-schema exposure/cache | not run | no Data API setting, config reload, schema reload, or RPC recognition |
| Phase 4 shadow proof | not run | no authenticated RPC or owner-isolation case |
| Phase 5 cutover | not run | no consumer wiring, read-service-role removal, deploy, or activation |
| later cleanup/release | not run | no Container cleanup, CP2, promotion, or public paid launch |

Current Supabase Free-plan documentation lists 500 MB database size, 5 GB
egress, 50,000 MAU, and two active Free projects. Free projects may pause after
one week of low activity, have no automatic backups or uptime SLA, and current
pause guidance gives a one-year Studio restore window. These are operational
availability constraints, not permission to query, restore, upgrade, expose a
schema, reload a cache, or fail open.

- [Supabase pricing and Free limits](https://supabase.com/pricing)
- [Supabase Free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)

## Consumed Approval Text (Do Not Reuse)

This text was used for the blocked precondition evaluation and is retained only
as audit context. It cannot authorize a retry or migration apply.

```text
承認します。

approval_id=C1-CONTAINERLESS-BILLING-PHASE2-REMOTE-READINESS-1
reviewed_base=ea6928f5f0160ab3db453f845e4fb16245bb4e9e
migration_path=supabase/migrations/20260730000000_comment_translator_c1_containerless_billing_read.sql
migration_version=20260730000000
canonical_git_blob=331db8095fc2ec09332718e9a5d05f62f26d18e8
canonical_git_blob_byte_sha256=27c116aa8872c9c1a04d0a3d0accd2a214e3c28a961ca92c6cb3ba6d3115cd15
action_label=one-sanitized-read-only-phase2-remote-readiness-preflight

trusted transient operator boundary内で、対象opaque targetが今回のCreator C1 containerless billing Phase 2候補へcurrentに一意対応し、target owner、apply owner、rollback owner、sanitized output reviewerが同じ承認thread内で確認され、Checkout/webhook/billing mutationとdirect authority-table writeがPhase 3完了まで閉じている場合に限り、remote mutation前のread-only readiness preflightを1 attemptだけ実行することを承認します。

確認対象は、target health、PostgreSQL/apply-role capability、remote migration history上の先行16 migrationの整合、上記migrationだけがsole pendingであること、required dependency/object presence、unsafe role/schema collision count、comment_translator_apiがunexposedであることに限定します。結果はdocs/active/COMMENT_TRANSLATOR_CREATOR_C1_CONTAINERLESS_BILLING_PHASE_2_REMOTE_SCHEMA_APPLY_PREFLIGHT.mdのread-only readiness allowlistにあるstatus/countだけへreducerで縮約し、raw command/query outputやprivate valueを保存・表示しないでください。

この承認はmigration apply、SQL/DDL/DML mutation、db push、include-all、roles/seed apply、migration repair、backfill、Auth user/authority row countまたはread、function/RPC call、schema/policy/grant/function source inspectionのraw出力、custom-schema exposure、PostgREST config/schema-cache reload、shadow proof、production consumer wiring、cutover、Cloudflare/Stripe/provider操作、deploy、activation、restore、upgrade、retry、remediation、rollback、cleanup、dependency install、manifest/lockfile変更、commit、push、PR、merge、CP2、promotion、public paid launchを含みません。

base/path/version/blob/hash、target binding、target/apply/rollback owner、output reviewer、billing mutation gateのいずれかが欠けるか不一致の場合、targetがunhealthy/unknownの場合、migration historyがambiguousの場合、sole pending countが1以外の場合、capabilityまたはdependencyが不足する場合、unsafe collisionがある場合、API schemaが既にexposedの場合、sensitive/raw outputが必要な場合、またはremote mutationや2回目のattemptが必要な場合はremote call前または最初のsanitized異常結果で停止してください。migration applyは別のexact approvalが提示されるまで実行しないでください。
```

## Consumed Remote-Readiness Approval Record

`C1-CONTAINERLESS-BILLING-PHASE2-REMOTE-READINESS-1` was consumed by the
precondition evaluation. The reviewed base and canonical migration identity
matched, but the approval was conditional on current same-thread confirmation
of the opaque target binding, target owner, apply owner, rollback owner,
sanitized output reviewer, and billing-mutation gate. Those confirmations were
not established, and no private target or owner value was inferred.

First-blocker behavior therefore stopped execution before any remote call.
Target health, capability, migration history, dependency presence, collision
counts, and API exposure remain unchecked. This approval cannot authorize a
retry. A new exact approval is required after the missing current authority
confirmations are established.

```remote-readiness-execution-json
{
  "approval_id": "C1-CONTAINERLESS-BILLING-PHASE2-REMOTE-READINESS-1",
  "reviewed_base_status": "pass",
  "migration_identity_status": "pass",
  "target_binding_status": "blocked-absent-current-authority",
  "target_owner_status": "blocked-absent-current-authority",
  "apply_owner_status": "blocked-absent-current-authority",
  "rollback_owner_status": "blocked-absent-current-authority",
  "output_reviewer_status": "blocked-absent-current-authority",
  "project_health_status": "not-run-first-blocker",
  "postgres_capability_status": "not-run-first-blocker",
  "migration_history_status": "not-run-first-blocker",
  "expected_prior_migration_count": "not-run",
  "sole_pending_migration_count": "not-run",
  "unexpected_pending_migration_count": "not-run",
  "dependency_status": "not-run-first-blocker",
  "role_capability_status": "not-run-first-blocker",
  "role_collision_count": "not-run",
  "schema_collision_count": "not-run",
  "api_exposure_status": "not-run-first-blocker",
  "billing_mutation_gate_status": "blocked-unconfirmed",
  "remote_read_attempt_count": 0,
  "remote_mutation_attempt_count": 0,
  "execution_status": "blocked-before-remote-read",
  "sanitized_output_review_status": "pass",
  "abort_status": "triggered-authority-preconditions-unconfirmed",
  "unchecked_scope_status": "recorded"
}
```

## Current Authority Confirmation And Next Approval

The same task now confirms the opaque target binding, target owner, apply
owner, rollback owner, sanitized output reviewer, and billing-mutation gate.
The repository-pinned CLI is `2.109.0`, and the linked metadata is present and
Git-ignored. No private target, account, user, or role identifier is recorded.
These confirmations resolved the authority blocker. Approval
`C1-CONTAINERLESS-BILLING-PHASE2-REMOTE-READINESS-2` was then consumed by the
single read-only attempt recorded below. It did not approve any mutation.

```remote-readiness-authority-json
{
  "schema_version": 1,
  "confirmation_scope": "same-thread-current-authority",
  "target_binding_status": "current-unique-confirmed",
  "target_owner_status": "current-confirmed-by-project-owner",
  "apply_owner_status": "current-confirmed-by-project-owner",
  "rollback_owner_status": "current-confirmed-by-project-owner",
  "output_reviewer_status": "current-confirmed-by-project-owner",
  "billing_mutation_gate_status": "closed-through-phase-3",
  "private_identifier_disclosure_count": 0,
  "remote_read_attempt_count": 1,
  "remote_mutation_attempt_count": 0,
  "next_approval_unit": "C1-CONTAINERLESS-BILLING-PHASE2-MIGRATION-HISTORY-RECONCILIATION-1",
  "approval_status": "consumed-readiness-failed-no-retry"
}
```

### Consumed Exact Read-Only Approval

The project owner pasted the following exact approval in the current task. It
was consumed once and cannot authorize a retry.

```text
承認します。

approval_id=C1-CONTAINERLESS-BILLING-PHASE2-REMOTE-READINESS-2
reviewed_base=ea6928f5f0160ab3db453f845e4fb16245bb4e9e
migration_path=supabase/migrations/20260730000000_comment_translator_c1_containerless_billing_read.sql
migration_version=20260730000000
canonical_git_blob=331db8095fc2ec09332718e9a5d05f62f26d18e8
canonical_git_blob_byte_sha256=27c116aa8872c9c1a04d0a3d0accd2a214e3c28a961ca92c6cb3ba6d3115cd15
action_label=one-sanitized-read-only-phase2-remote-readiness-preflight

同じtaskで確認済みのcurrent opaque target binding、target/apply/rollback owner、sanitized output reviewer、billing_mutation_gate=closed-through-phase-3が維持されている場合に限り、remote mutation前のread-only readiness preflightを1 attemptだけ実行することを承認します。

確認対象はtarget health、PostgreSQL/apply-role capability、remote migration history上の先行16 migrationの整合、上記migrationだけがsole pendingであること、required dependency/object presence、unsafe role/schema collision count、comment_translator_apiがunexposedであることに限定します。結果はこの文書のread-only readiness allowlistにあるstatus/countだけへ縮約し、raw command/query outputやprivate valueを保存・表示しないでください。

この承認はmigration apply、SQL/DDL/DML mutation、db push、include-all、roles/seed apply、migration repair、backfill、Auth user/authority row readまたはcount、function/RPC call、raw schema/policy/grant/function source inspection、custom-schema exposure、PostgREST config/schema-cache reload、shadow proof、consumer wiring、cutover、Cloudflare/Stripe/provider操作、deploy、activation、restore、upgrade、retry、remediation、rollback、cleanup、dependency install、manifest/lockfile変更、commit、push、PR、merge、CP2、promotion、public paid launchを含みません。

base/path/version/blob/hashまたはcurrent authority確認が欠けるか不一致の場合、targetがunhealthy/unknownの場合、migration historyがambiguousの場合、sole pending countが1以外の場合、capability/dependency不足、unsafe collision、API schema exposure、sensitive/raw outputの必要、remote mutationまたは2回目のattemptが必要になった場合は、remote call前または最初のsanitized異常結果で停止してください。migration applyは別のexact approvalまで実行しないでください。
```

## Remote Readiness Attempt 2 Result And First Blocker

The single approved remote read completed with sanitized output only. Project
health, PostgreSQL/apply-role capability, dependencies, role capability,
collision counts, and API exposure satisfied their gates. Migration history did
not: 12 of 16 required prior migrations were present, 5 local migrations
including the target were pending, and 4 pending migrations were not the target.
The first-blocker rule therefore stopped before any mutation or migration apply.
No retry, repair, remediation, or raw history inspection was performed.

```remote-readiness-execution-2-json
{
  "approval_id": "C1-CONTAINERLESS-BILLING-PHASE2-REMOTE-READINESS-2",
  "reviewed_base_status": "pass",
  "migration_identity_status": "pass",
  "target_binding_status": "current-unique-confirmed",
  "target_owner_status": "current-confirmed-by-project-owner",
  "apply_owner_status": "current-confirmed-by-project-owner",
  "rollback_owner_status": "current-confirmed-by-project-owner",
  "output_reviewer_status": "current-confirmed-by-project-owner",
  "project_health_status": "pass",
  "postgres_capability_status": "pass",
  "migration_history_status": "fail",
  "expected_prior_migration_count": 12,
  "sole_pending_migration_count": 5,
  "unexpected_pending_migration_count": 4,
  "dependency_status": "pass",
  "role_capability_status": "pass",
  "role_collision_count": 0,
  "schema_collision_count": 0,
  "api_exposure_status": "unexposed",
  "billing_mutation_gate_status": "closed-through-phase-3",
  "remote_read_attempt_count": 1,
  "remote_mutation_attempt_count": 0,
  "execution_status": "blocked-readiness-failed",
  "sanitized_output_review_status": "pass",
  "abort_status": "triggered-sanitized-readiness-failure",
  "unchecked_scope_status": "phase3-and-later-not-run"
}
```

### Paste-Ready Next Read-Only Reconciliation Approval

The text below is only a proposal for a separately gated operation. It is not
approval until the project owner pastes it in the current task.

```text
承認します。

approval_id=C1-CONTAINERLESS-BILLING-PHASE2-MIGRATION-HISTORY-RECONCILIATION-1
reviewed_base=ea6928f5f0160ab3db453f845e4fb16245bb4e9e
migration_path=supabase/migrations/20260730000000_comment_translator_c1_containerless_billing_read.sql
migration_version=20260730000000
canonical_git_blob=331db8095fc2ec09332718e9a5d05f62f26d18e8
canonical_git_blob_byte_sha256=27c116aa8872c9c1a04d0a3d0accd2a214e3c28a961ca92c6cb3ba6d3115cd15
prior_approval_id=C1-CONTAINERLESS-BILLING-PHASE2-REMOTE-READINESS-2
prior_result=migration-history-fail-prior-12-pending-5-nontarget-pending-4
action_label=one-sanitized-read-only-phase2-migration-history-reconciliation

同じtaskで確認済みのcurrent authorityとopaque target bindingが維持されている場合に限り、Phase 2 apply前のmigration history reconciliationをread-onlyで1 attemptだけ実行することを承認します。確認対象はrepository上の既知17 migrationについてのpresent/absent status、既知外remote migration count、target migrationのpending statusに限定し、公開repositoryのmigration versionとstatus/countだけへreducerで縮約してください。raw command/query output、private identifier、raw row/errorは保存・表示しないでください。

この承認はretry of REMOTE-READINESS-2、migration apply、db push、migration repair、SQL/DDL/DML mutation、backfill、Auth/authority data read、function/RPC call、schema exposure/cache action、remediation、rollback、deploy、commit、push、PR、merge、Phase 3以降を含みません。不一致の説明にraw/sensitive output、mutation、repair、または2回目のattemptが必要な場合は停止してください。
```

## Machine-Readable Contract

```preflight-contract-json
{
  "schemaVersion": 1,
  "approvalUnit": "C1-CONTAINERLESS-BILLING-PHASE2-APPLY-1",
  "nextApprovalUnit": "C1-CONTAINERLESS-BILLING-PHASE2-MIGRATION-HISTORY-RECONCILIATION-1",
  "reviewedBase": "ea6928f5f0160ab3db453f845e4fb16245bb4e9e",
  "reviewedPrHead": "feb33c7986b0410c94045b06bf37d534d637fb4c",
  "migration": {
    "path": "supabase/migrations/20260730000000_comment_translator_c1_containerless_billing_read.sql",
    "version": "20260730000000",
    "gitBlob": "331db8095fc2ec09332718e9a5d05f62f26d18e8",
    "gitBlobSha256": "27c116aa8872c9c1a04d0a3d0accd2a214e3c28a961ca92c6cb3ba6d3115cd15",
    "canonicalByteSize": 22041,
    "position": 17,
    "total": 17,
    "laterCount": 0,
    "explicitBeginCount": 0,
    "explicitCommitCount": 0,
    "explicitRollbackCount": 0
  },
  "cli": {
    "version": "2.109.0",
    "localBinaryStatus": "present-repository-pinned",
    "loginStatus": "user-confirmed",
    "linkMetadataStatus": "present-git-ignored",
    "pendingSelection": "all-pending-from-remote-history",
    "transactionUnit": "one-implicit-transaction-per-migration-file",
    "historyInsert": "same-implicit-transaction",
    "exactOneStatus": "blocked-remote-history-not-sole-pending"
  },
  "authority": {
    "targetBinding": "current-unique-confirmed",
    "targetOwner": "current-confirmed-by-project-owner",
    "applyOwner": "current-confirmed-by-project-owner",
    "rollbackOwner": "current-confirmed-by-project-owner",
    "outputReviewer": "current-confirmed-by-project-owner",
    "approval": "consumed-C1-CONTAINERLESS-BILLING-PHASE2-REMOTE-READINESS-2",
    "projectHealth": "pass",
    "remoteCapability": "pass",
    "apiExposure": "unexposed",
    "billingMutationGate": "closed-through-phase-3"
  },
  "execution": {
    "remoteReadAttemptCount": 1,
    "remoteMutationAttemptCount": 0,
    "migrationAttemptCount": 0,
    "migrationApplyCount": 0,
    "backfillAttemptCount": 0,
    "schemaCacheActionCount": 0,
    "cutoverAttemptCount": 0,
    "status": "blocked-migration-history-not-sole-pending"
  }
}
```

## Local Verification

Required checks:

```text
node scripts/comment-translator-creator-c1-containerless-billing-phase-2-preflight-contract.mjs
node scripts/comment-translator-creator-c1-containerless-billing-phase-2-remote-readiness-approved-contract.mjs
node scripts/comment-translator-creator-c1-containerless-billing-read-contract.mjs
node scripts/comment-translator-creator-cp1-paid-launch-readiness-contract.mjs
node scripts/comment-translator-task-board-creator-roadmap-contract.mjs
node --check scripts/comment-translator-creator-c1-containerless-billing-phase-2-preflight-contract.mjs
git diff --check
```

pgTAP execution remains unchecked because the current worktree has no `psql`,
Docker, or Podman command for a local Supabase database. One Codex-initiated
read-only remote operation occurred; no remote mutation occurred.
