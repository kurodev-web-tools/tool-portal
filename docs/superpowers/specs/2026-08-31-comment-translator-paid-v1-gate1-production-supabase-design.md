# Comment Translator Paid Core v1 Gate 1 Production Supabase Readiness Design

## Status

- Date: 2026-08-31
- Decision: approved A2 design, `history reconstruction + ordered legacy bridge`
- Source base: exact fetched `origin/codex/comment-translator-paid-v1-preview` commit `a275174dc6494a8d159f1fff30318c05fece0107`
- Current decision label: `NO-GO` until every production evidence gate in this document passes
- Scope: Gate 1 item 1 only

This design does not authorize a production mutation. Source implementation, dependency/tooling setup, backup execution, migration apply, extension enablement, Vault writes, and Cron configuration remain separate approval gates.

## Objective

Move Comment Translator Paid Core v1 Gate 1 item 1 from `NO-GO` to `GO` by safely and reproducibly resolving:

1. divergent local and production migration histories;
2. the legacy `comment_translator_paid_entitlements` schema collision;
3. production backup and rollback evidence on the Supabase Free plan;
4. canonical Paid RPC installation and privilege verification;
5. one production Supabase Cron binding at five-minute cadence, configured but inactive.

`GO` means that the production database schema, RPCs, required extension, encrypted Vault references, and one inactive Cron job are prepared and read back successfully. It does not mean production source deployment, dark deploy, Checkout publication, Provider activation, Paid translation activation, or Cron activation.

## Authority and invariants

The following repository documents remain authoritative:

- `docs/active/COMMENT_TRANSLATOR_PAID_V1_REDESIGN_SPEC.md`
- `docs/active/COMMENT_TRANSLATOR_PAID_V1_REDESIGN_TASK_BREAKDOWN.md`
- `docs/active/COMMENT_TRANSLATOR_PAID_V1_RUNBOOK.md`

The design preserves these invariants:

- Free remains available.
- All Paid and Provider kill switches remain disabled.
- Production deploy and Paid activation remain separate from Gate 1.
- Supabase Cron is the sole standard production scheduler. Cloudflare Cron is fallback-only and must not be configured while Supabase Cron is available.
- Reconciler claims remain bounded to 50 items with a 120-second lease and stale-token rejection.
- No raw billing payload, comment text, credential value, Vault value, private identifier, project identifier, or connection string is printed or committed.
- Existing production rows are not deleted or rewritten by the legacy bridge.
- Migration history repair is never used as a substitute for applying SQL.

## Observed production state

The pre-design read-only inspection established the following sanitized fingerprint. Every item must be revalidated immediately before an approved mutation because this state may drift.

### Project and history

- The production project selection is unique and healthy.
- Organization plan: Free.
- Database size: approximately 13.16 MB.
- Local migration files: 35.
- Production migration-history rows: 22.
- Exact local/production matches: 4.
- Local-only versions: 31.
- Production-only versions: 18.
- Every production history row stores its SQL statements: 22 rows, 221 statements total.
- All 18 production-only migration bodies are recoverable from production history.
- High-confidence secret matches in stored migration statements: 0.

### Legacy Paid subsystem

Production contains these legacy tables in `public`:

- `comment_translator_paid_entitlements`
- `comment_translator_paid_usage_counters`
- `comment_translator_paid_usage_events`

All three tables have zero rows and RLS enabled. The legacy entitlement table has a billing-reference/evidence schema that is incompatible with the canonical Paid Core v1 lifecycle/owner/binding schema.

The legacy subsystem also contains:

- three `SECURITY DEFINER` functions;
- one enabled entitlement-to-usage trigger;
- two foreign keys between the legacy tables;
- table-owned indexes, constraints, policies, and TOAST relations.

All legacy tables and functions are owned by the same `postgres` execution role available to the migration path. No external view or materialized-view dependency was found. The archive schema selected below does not exist.

Canonical `ct_paid_*` function overloads, Paid Cron jobs, and the two required Vault names are all absent in production.

### Extensions and scheduler

- `pg_cron` 1.6.4 is installed and its scheduler process is present.
- Cron jobs: 0.
- `supabase_vault` is installed.
- `pg_net` is available at 0.20.4 but is not installed.
- The Cron API supports `schedule`, `alter_job(..., active boolean)`, and `unschedule`.
- Vault exposes supported `create_secret` and `update_secret` functions. No dedicated delete function is exposed.

### Backup tooling

The current host has no `supabase`, `docker`, `pg_dump`, `pg_restore`, or `psql` executable. The Free plan has no relied-upon automatic backup/PITR evidence for this operation. A manual logical backup and isolated restore rehearsal are therefore hard entry gates, not optional safeguards.

## Chosen architecture

### 1. Reconstruct history instead of deleting it

Recover the 18 production-only migration files from `supabase_migrations.schema_migrations.statements` and add them to `supabase/migrations` using their exact production versions and names.

For each recovered file, record and test only sanitized metadata:

- version;
- name;
- statement count;
- SQL byte count;
- digest;
- high-confidence secret match count.

The implementation must preserve the production statement order. It must not include production IDs, connection details, `created_by`, idempotency keys, or other private metadata.

The two timestamp-variant pairs for the real-comments feed and account timezone are retained alongside the existing local files. Their SQL is content-equivalent and idempotent. The duplicated legacy migration variants are also retained because both versions already exist in production history and their second application succeeded there.

No production history row is deleted. No local historical migration is rewritten or removed. `migration repair --status applied` is forbidden unless a later, separately approved recovery step proves that the exact SQL effect already exists. It is not part of the normal A2 path.

After reconstruction, the repository contains every production history version. Before the new bridge and `pg_net` migration are added, the union is 53 files: 35 current local files plus 18 recovered production-only files.

### 2. Insert an intentional pre-base legacy bridge

Add an explicitly ordered migration before `20260812120000_comment_translator_paid_core_v1.sql` and after the latest recovered legacy migration. The reserved version is:

`20260811000000_comment_translator_paid_v1_legacy_schema_bridge.sql`

The backdated ordering is intentional and documented. It is required because a newly timestamped migration would execute after the canonical base and could not free the colliding public table name.

The bridge supports exactly two accepted states:

1. **Exact legacy state:** archive the known zero-row legacy subsystem.
2. **Exact canonical state with no public legacy shape:** no-op. This allows the bridge to be applied safely to Preview, where canonical Paid Core v1 already exists.

Any absent, partial, mixed, non-empty, differently owned, differently shaped, or unexpectedly dependent legacy state raises an exception before object movement.

#### Exact legacy preconditions

The bridge must verify inside its transaction:

- all three expected public tables exist;
- each table has zero rows;
- RLS is enabled on all three;
- the entitlement columns match the approved legacy list exactly;
- the expected three function signatures exist and are `SECURITY DEFINER`;
- the expected trigger exists and is enabled;
- the expected two foreign keys exist;
- the migration executor owns every moved table and function;
- no external view/materialized-view dependency exists;
- no canonical `ct_paid_*` overload exists;
- `comment_translator_paid_legacy_archive` does not exist;
- no Paid Cron job exists.

#### Atomic archive procedure

Within one transaction, the bridge:

1. sets bounded lock and statement timeouts;
2. takes a named transaction advisory lock;
3. rechecks every precondition after the lock;
4. creates `comment_translator_paid_legacy_archive`;
5. moves the three legacy tables into that schema;
6. moves the three legacy functions into that schema;
7. disables the moved user trigger;
8. revokes schema usage and all table/function privileges from `PUBLIC`, `anon`, `authenticated`, and `service_role`;
9. verifies that all canonical public names are free and all archived objects are inaccessible to application roles.

Moving the tables to another schema also moves their indexes, constraints, policies, and table-owned relations, avoiding schema-wide index-name collisions when the canonical table is created.

No row copy, transformation, deletion, or entitlement conversion is permitted. The zero-row precondition is mandatory.

If any statement fails, PostgreSQL rolls back the entire bridge transaction.

### 3. Make `pg_net` reproducible before the HTTP RPC

Add an ordered migration between Task 7 and Task 9:

`20260814105000_comment_translator_paid_pg_net_extension.sql`

It performs only:

```sql
create extension if not exists pg_net with schema extensions;
```

This is a no-op where `pg_net` is already installed and ensures the Task 9 maintenance HTTP RPC is not created ahead of its runtime dependency on a clean database or production.

The extension migration is separately approval-gated as part of the production migration apply. No extension version is pinned because Supabase manages available extension versions.

After history reconstruction, the bridge, and the extension migration, the expected local migration count is 55. Against the observed production history of 22 rows, the expected pending count is 33. Both numbers must be recalculated from current state at action time; a mismatch stops execution.

### 4. Production migration sequence

The approved production apply sequence is fail-closed:

1. verify the exact production project without printing its identifier;
2. prove backup and restore rehearsal completion;
3. rerun the complete sanitized production fingerprint;
4. run `supabase migration list` through the isolated production-targeting context;
5. run `supabase db push --dry-run --include-all`;
6. require the exact expected pending version set and ordering;
7. stop if the CLI asks for history repair or proposes an unknown migration;
8. obtain the migration-apply approval;
9. run one production `db push --include-all` from the exact reviewed commit;
10. perform schema, history, RPC, RLS, grant, extension, and row-count readback before any Vault or Cron mutation.

`--include-all` is required because production has newer recorded versions while some valid local versions are missing. `--include-seed` and remote reset are forbidden.

Each migration is independently transactional under the CLI. The bridge itself is one transaction. If the bridge commits and a later canonical migration fails, Paid remains disabled, Cron remains absent, and the operator stops rather than retrying blindly.

### 5. Default-privilege boundary

The local `20260706073204_supabase_default_privileges_guard.sql` remains in the pending set. Current production evidence shows the documented `postgres` owner defaults already lack browser/service-role CRUD and function execute grants, so applying that migration as `postgres` should be idempotent.

A separate managed/internal owner default-ACL limitation remains covered only by the existing narrowly scoped risk-acceptance record. This Gate does not attempt role membership changes or managed-owner remediation.

Every new Paid object must still prove its own current-object posture after apply:

- RLS where applicable;
- no `anon` or `authenticated` table access;
- only documented `service_role` RPC execution;
- private maintenance transport unavailable to browser roles;
- object owner equals the approved migration executor.

Any current-object grant drift is a hard stop and is not covered by the historical default-privilege risk acceptance.

## Backup and restore gate

Before any production DDL, prepare a temporary approved tooling environment containing the Supabase CLI, Docker, and compatible PostgreSQL client tools. Tool installation is a separate approval because none is currently present.

Using the official Supabase logical-backup workflow, capture at minimum:

- `roles.sql`;
- `schema.sql`;
- `data.sql` using COPY format;
- `history_schema.sql` for `supabase_migrations`;
- `history_data.sql` for `supabase_migrations`.

The files must be written outside the repository to a uniquely named restricted temporary directory. Never print the connection string or file content. Record only filenames, byte sizes, SHA-256 digests, exit statuses, and sanitized object/row counts.

Restore all five files into an isolated disposable local Supabase/PostgreSQL environment using `ON_ERROR_STOP` and a single transaction where supported. Verify:

- restore exits successfully;
- migration-history count and digest manifest match;
- the three legacy table row counts remain zero;
- expected non-Paid row counts match in aggregate;
- Auth-dependent foreign keys and schemas are present;
- the restored database accepts the bridge and canonical migration sequence in a rehearsal;
- no production network endpoint is used by the restore target.

The logical backup does not restore Storage object blobs. Gate 1 item 1 does not mutate Storage objects, so this limitation is recorded but does not broaden the task into a Storage migration.

Backup artifacts and credentials must not be committed. Cleanup of the disposable restore target and backup files is a separate destructive action after the Gate is closed and requires exact-path confirmation.

## RPC and schema readback

After migration apply, read back sanitized evidence for:

- all expected migration versions present locally and remotely with no divergence;
- `pg_net`, `pg_cron`, and `supabase_vault` installed;
- canonical Paid Core relation count and expected table/column/constraint fingerprints;
- archive schema present with exactly three tables and three functions;
- archived tables still zero-row, RLS-enabled, and inaccessible to application roles;
- archived trigger disabled;
- expected `ct_paid_*` function signatures and overload counts;
- reconciler claim limit 50 and lease 120 seconds;
- stale-token rejection contract;
- cleanup limit and retention contract;
- `PUBLIC`, `anon`, and `authenticated` execute counts on Paid RPCs equal zero;
- only explicitly documented `service_role` execute grants;
- current-object security and performance advisors reviewed after DDL.

No maintenance RPC is invoked in production during this Gate.

## Vault and inactive Cron configuration

Vault and Cron are separate post-schema approval gates.

### Vault

Create exactly one encrypted secret for each required name:

- `comment_translator_paid_maintenance_url`
- `comment_translator_paid_cron_token`

Use `vault.create_secret` only when the name is absent. Use `vault.update_secret` only in a separately approved rotation path. Never query or return `decrypted_secret` during evidence collection.

Readback is limited to:

- required-name row count = 2;
- required-name distinct count = 2;
- non-null encrypted-record status;
- duplicate count = 0.

### Cron

In one explicit transaction:

1. assert that no job with the exact name exists;
2. call `cron.schedule` with job name `comment-translator-paid-maintenance`;
3. use schedule `*/5 * * * *`;
4. use only `select private.ct_paid_invoke_maintenance_from_vault();` as the command;
5. immediately call `cron.alter_job(..., active := false)` before commit;
6. read back the exact job row inside the transaction and commit only when it is inactive.

The scheduler cannot observe the uncommitted active row. After commit, require:

- matching jobs = 1;
- active jobs = 0;
- scheduler process count = 1;
- job runs = 0;
- Cloudflare fallback scheduler = absent/inactive;
- cadence, command digest, database, and username match the approved contract without exposing private values.

Cron activation is explicitly out of scope.

## Rollback design

Rollback depends on the failure phase.

### Before bridge commit

Any bridge failure rolls back automatically. No history or object movement should remain. Recheck the original fingerprint and stop.

### After bridge commit but before canonical base succeeds

An operator-only bridge reversal may run only when:

- canonical public objects are absent;
- archived tables remain zero-row;
- archived object fingerprints are exact;
- no new dependency exists;
- Paid and Cron remain disabled.

The reversal moves the functions and tables back to `public`, restores the approved grants, reenables the trigger, verifies the original legacy fingerprint, and removes the empty archive schema. It runs in one transaction and requires a separate production rollback approval.

### After canonical migrations succeed

Do not run a destructive down migration by default. Keep Paid disabled and Cron absent/inactive, preserve the archive, and use a reviewed forward fix.

If data integrity or Free availability is affected and a forward fix is not safe, restore from the verified logical backup under a separate downtime/destructive approval. Do not delete or directly rewrite entitlement, capacity, hold, or receipt rows to simulate rollback.

### Vault/Cron rollback

- Deactivate the exact Cron job first if it ever became active unexpectedly.
- Unschedule only `comment-translator-paid-maintenance` using the exact job name or read-back job ID.
- Verify matching jobs = 0 and no new run was created.
- Leave the two Vault records encrypted and unused by default. Their deletion is not required to make the scheduler inert and is not silently authorized because the current Vault API exposes create/update but no dedicated delete function.
- Any later Vault deletion or rotation requires a separate exact-name approval and supported-path review.

## Stop conditions

Execution stops immediately if any of these occur:

- production target selection is not unique;
- repository commit or migration manifest differs from the reviewed commit;
- backup dump, checksum, or restore rehearsal is incomplete;
- the production fingerprint changes;
- a legacy table contains a row;
- a bridge object, owner, signature, trigger, FK, dependency, RLS state, or grant differs;
- migration dry-run requests repair or proposes an unexpected version/order;
- `pg_net` cannot be enabled through the approved migration role;
- any migration fails or leaves history divergence;
- current-object RLS/grants/advisors fail;
- Vault names are duplicated or unreadable by count-only checks;
- Cron is not exactly one row and inactive;
- any Cron run occurs;
- Cloudflare fallback appears as a second scheduler authority;
- any secret/private identifier would need to be printed to continue.

There is no automatic retry after a failed mutation. Diagnose and obtain a new approval for a changed action.

## Implementation artifacts

The implementation plan may create or modify only the minimum artifacts needed for this design:

- 18 recovered historical migration files;
- the ordered legacy bridge migration;
- the ordered `pg_net` extension migration;
- deterministic manifest and bridge contracts;
- a read-only production preflight contract;
- an approval-gated backup/restore runner or exact operator instructions;
- an approval-gated production migration runner;
- an approval-gated Vault/Cron inactive configuration runner;
- focused rollback and readback contracts;
- the Paid runbook and short current-task status where repository workflow requires updates.

No runtime application behavior, UI, Stripe integration, Provider path, Cloudflare deployment configuration, or Paid kill switch is changed by this slice.

## Verification strategy

### Static and contract tests

- recovered-history version/name/count/digest manifest;
- no secret/private identifier in recovered SQL or changed files;
- exact migration ordering, including bridge before base and `pg_net` before Task 9;
- bridge exact-legacy positive case;
- canonical no-op positive case;
- non-empty, partial, mixed, wrong-owner, extra-dependency, duplicate, and malformed negative cases;
- archive privilege and disabled-trigger assertions;
- rollback exact-state preconditions;
- production target and approval-token fail-closed behavior;
- Cron exact name/cadence/command/inactive contract;
- Vault count-only evidence contract.

### Database integration tests

Using the disposable restored database:

1. replay all 55 migrations from an empty supported baseline;
2. verify the restored legacy history converges through the bridge into canonical Paid Core v1;
3. verify applying the bridge to an already-canonical Preview-shaped database is a no-op;
4. verify bridge rollback before canonical apply;
5. verify all canonical RPC privileges, constraints, and atomicity contracts;
6. run `supabase db reset` and migration list consistency checks;
7. ensure no external HTTP request or Cron run occurs.

### Repository verification

- focused migration/reconciliation contracts;
- existing Task 2 through Task 11 relevant sibling contracts;
- Node syntax checks for changed scripts;
- TypeScript typecheck;
- lint with no new errors or warnings;
- production build when implementation touches executable scripts or runtime imports;
- `git diff --check`;
- changed-file high-confidence secret and private-identifier scans;
- root-owned diff and scope review after delegated implementation.

## Approval gates

These approvals remain distinct:

1. **Source implementation:** migration files, contracts, scripts, and docs only.
2. **Commit/push/PR:** repository publication of the reviewed source change.
3. **Tooling setup:** Supabase CLI, Docker, and PostgreSQL clients on an approved host.
4. **Backup execution:** production read and restricted local artifact creation.
5. **Migration apply:** bridge, canonical migrations, and `pg_net` against production.
6. **Vault write:** exactly two named encrypted production references.
7. **Cron inactive configuration:** exactly one five-minute job committed inactive.
8. **Rollback:** only the exact phase-specific action approved at that time.
9. **Cron activation:** not part of Gate 1 item 1.
10. **Production deploy/Paid activation:** not part of this design.

## GO evidence

Gate 1 item 1 may be labeled `GO` only when all of the following are current and directly verified:

- reviewed source commit is merged into the intended Preview integration line;
- manual logical backup and isolated restore rehearsal pass;
- local and production migration histories are fully aligned;
- bridge archived only the exact zero-row legacy subsystem;
- canonical Paid schema and all required RPCs are installed and pass privilege/readback checks;
- `pg_net`, `pg_cron`, and Vault are installed and usable;
- exactly two required Vault names exist without reading their values;
- exactly one `comment-translator-paid-maintenance` Cron job exists at five-minute cadence and `active=false`;
- Cron run count remains zero;
- no Cloudflare fallback scheduler is active;
- rollback evidence is complete for the achieved phase;
- Paid publication, source deployment, Provider activation, Checkout activation, and Cron activation remain not run.

Any missing, stale, indirect, or contradictory evidence leaves the decision at `NO-GO`.

## References

- Supabase database migrations: <https://supabase.com/docs/guides/deployment/database-migrations>
- Supabase CLI reference: <https://supabase.com/docs/reference/cli/supabase-orgs-list>
- Supabase backup and restore: <https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore>
- Supabase database backups: <https://supabase.com/docs/guides/platform/backups>
- Supabase Cron: <https://supabase.com/docs/guides/cron>
- Supabase pg_cron debugging: <https://supabase.com/docs/guides/troubleshooting/pgcron-debugging-guide-n1KTaz>
- Supabase `pg_net`: <https://supabase.com/docs/guides/database/extensions/pg_net>
- Supabase Vault: <https://supabase.com/docs/guides/database/vault>
