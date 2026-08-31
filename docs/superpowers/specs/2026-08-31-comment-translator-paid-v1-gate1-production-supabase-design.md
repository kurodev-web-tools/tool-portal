# Comment Translator Paid Core v1 Gate 1 Production Supabase Readiness Design

## Status

- Date: 2026-08-31
- Review revision: 2026-09-01, independent review iterations 1-3 addressed
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

- Free remains available during the normal production apply path.
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

A fresh 2026-09-01 read-only catalog check also confirmed six zero-row, RLS-enabled source-era tables that have no active canonical Paid Core v1 role:

- `comment_translator_obs_overlay_tokens`;
- `comment_translator_obs_overlay_browser_sessions`;
- `comment_translator_moderator_share_tokens`;
- `comment_translator_moderator_share_browser_sessions`;
- `comment_translator_custom_dictionary_entries`;
- `comment_translator_creator_history`.

Seven associated `SECURITY DEFINER` write/revoke functions remain in `public`. The redesign authority reserves these overlay, moderator-share, dictionary, and history systems for separate specifications, tasks, and PRs. A2 must fingerprint their row counts, RLS, owners, and browser/service-role ACLs read-only, but must not move, drop, rewrite, grant, revoke, or otherwise mutate them. Any unsafe ACL or nonzero row requires a separately authorized remediation and stops A2.

All legacy tables and functions are owned by the same `postgres` execution role available to the migration path. No external view or materialized-view dependency was found. The archive schema selected below does not exist.

Canonical `ct_paid_*` function overloads, Paid Cron jobs, and the two required Vault names are all absent in production.

### Extensions and scheduler

- `pg_cron` 1.6.4 is installed and its scheduler process is present.
- Cron jobs: 0.
- `supabase_vault` is installed.
- `pg_net` is available at 0.20.4 but is not installed.
- The Cron API supports `schedule`, `alter_job(..., active boolean)`, and `unschedule`.
- Vault exposes supported `create_secret` and `update_secret` functions. No dedicated delete function is exposed.
- Vault currently contains zero rows in total and zero rows for the two reserved names.

### Backup tooling

The repository lockfile and current `node_modules` provide Supabase CLI `2.109.0`; implementation and operations must call that exact local binary and must not use `npx` or an unpinned global CLI. The current host has no `docker`, `pg_dump`, `pg_restore`, or `psql` executable. Production reports PostgreSQL `17.6`, so the approved backup environment must use PostgreSQL client major 17 and record the exact patch version or immutable container digest. The Free plan has no relied-upon automatic backup/PITR evidence for this operation. A manual logical backup and isolated restore rehearsal are therefore hard entry gates, not optional safeguards.

## Chosen architecture

### 1. Reconcile history with inert markers, not legacy replay

Add 18 history-marker migrations to `supabase/migrations` using the exact production versions and names. Each marker contains only comments with sanitized metadata and a PostgreSQL no-op such as `do $$ begin null; end $$;`. It must not contain or replay the production statement bodies.

This distinction is mandatory. Production already records these versions and skips the markers. Preview and a clean install apply the markers safely without recreating the incompatible legacy subsystem. Replaying the recovered legacy SQL on Preview would collide with the canonical entitlement table and its incompatible columns before the bridge could run.

Commit a separate generated sanitized manifest for the original production history. The manifest is evidence, not executable SQL, and contains exactly this ordered set:

| Version | Name | Statements | Bytes | MD5 |
| --- | --- | ---: | ---: | --- |
| `20260624040504` | `comment_translator_real_comments_feed_snapshots` | 1 | 3473 | `32ce077c0d033e0aa166132d37c64973` |
| `20260624141142` | `account_display_timezone_preference` | 1 | 700 | `bb06bafd3ffb897284b0e4cf27bc076f` |
| `20260722000000` | `comment_translator_paid_entitlements` | 17 | 6038 | `9bd1986a3eb71496e96319ff87c5a6e3` |
| `20260722001000` | `comment_translator_paid_usage_counters` | 25 | 10424 | `59114cdc1e208791aa5e4fd661b11c30` |
| `20260722002000` | `comment_translator_obs_overlay_tokens` | 16 | 5209 | `0810fac8f39094e25567101dddcc4e42` |
| `20260722003000` | `comment_translator_obs_overlay_browser_sessions` | 9 | 1771 | `adfad87c8014ec22eedd0cfe34d20fc6` |
| `20260723000000` | `comment_translator_moderator_share_tokens` | 16 | 5082 | `a82bf8f600249ff1a4308d525354d89a` |
| `20260723001000` | `comment_translator_moderator_share_browser_sessions` | 10 | 2117 | `db73510f8dc44e4fb1c293965396327e` |
| `20260723002000` | `comment_translator_custom_dictionary` | 18 | 8172 | `bae5d675449b7aebf10d99a64c1e0459` |
| `20260723003000` | `comment_translator_creator_history` | 12 | 2056 | `f0caa787a451a42a08bbb81bf4303c1f` |
| `20260726111154` | `comment_translator_paid_entitlements` | 1 | 6065 | `293df19b9f922936c60038daf42cfebc` |
| `20260728135736` | `comment_translator_paid_usage_counters` | 1 | 10461 | `dc486ca138f0d2e258581ab960a1aa98` |
| `20260728142220` | `comment_translator_obs_overlay_tokens` | 1 | 5234 | `8f1ef08f04521176699abc35c2fd8c09` |
| `20260728145324` | `comment_translator_obs_overlay_browser_sessions` | 1 | 1785 | `00590230209f530666c50460e5439fe8` |
| `20260728160206` | `comment_translator_moderator_share_tokens` | 1 | 5107 | `9be8e7b679209f9c63da5688753bc49d` |
| `20260728164122` | `comment_translator_moderator_share_browser_sessions` | 1 | 2133 | `6a4290f68e19c41f204305b63b7993fb` |
| `20260728172220` | `comment_translator_custom_dictionary` | 1 | 8200 | `0e30272eb31457551f1d9eba7d7f37f8` |
| `20260729035621` | `comment_translator_creator_history` | 1 | 2074 | `6590c4e2a350ba00b9e8dd21645fa4d8` |

The generated manifest also asserts original statement ordering, aggregate high-confidence secret matches = 0, and rollback statements = 0. Full statements remain available only from production migration history and the restricted logical backup; they are not committed.

Every marker has an explicit replacement/retirement mapping in the committed manifest:

| Production-only version group | Active schema effect |
| --- | --- |
| `20260624040504` | replaced by the semantically equivalent local `20260623000000` real-comments migration; equivalence is asserted by normalized object fingerprint |
| `20260624141142` | replaced by the semantically equivalent local `20260624000000` timezone migration; equivalence is asserted by normalized object fingerprint |
| both entitlement versions and both usage-counter versions | their exact zero-row legacy objects are archived; active behavior is replaced by canonical `20260812120000` and later Paid migrations |
| both versions for overlay tokens/browser sessions, moderator-share tokens/browser sessions, custom dictionary, and creator history | production-only source-era objects are retained unchanged and explicitly excluded from A2; Preview/clean do not reproduce them, and no schema-convergence claim is made for these separately governed systems |

Therefore, marker equality means history-label convergence only. Paid Core active-schema convergence is proved independently for the A2-owned object allowlist. Production-only source-era objects remain a documented environment exception outside that allowlist. The design never claims that a no-op marker reproduces their schema effects.

The two timestamp-variant pairs for the real-comments feed and account timezone remain as distinct versions because both are recorded remotely. No production history row is deleted. No local historical migration is rewritten or removed. `migration repair --status applied` is forbidden in the normal A2 path.

After markers are added, the repository contains 53 migration files: 35 current local files plus 18 markers.

### 2. Insert an intentional pre-base legacy bridge

Add an explicitly ordered migration before `20260812120000_comment_translator_paid_core_v1.sql` and after the latest recovered legacy migration. The reserved version is:

`20260811000000_comment_translator_paid_v1_legacy_schema_bridge.sql`

The backdated ordering is intentional and documented. It is required because a newly timestamped migration would execute after the canonical base and could not free the colliding public table name.

The bridge supports exactly three accepted states, selected only by an exact catalog fingerprint:

1. **Exact legacy state:** archive the known zero-row Paid-legacy subsystem.
2. **Exact canonical state with no public legacy shape:** no-op. This allows the bridge to be applied safely to Preview, where canonical Paid Core v1 already exists.
3. **Clean pre-base state:** no legacy or canonical Paid objects exist, so no-op. This allows a clean database to continue to the canonical base migration.

Any partial, mixed, non-empty, differently owned, differently shaped, or unexpectedly dependent state raises an exception before object movement. State selection and every mutation occur under the same transaction advisory lock.

#### Exact legacy preconditions

The bridge must verify inside its transaction:

- all three expected public Paid-legacy tables exist;
- each table has zero rows;
- RLS is enabled on all three;
- table columns, indexes, policies, constraints, RLS flags, owners, ACLs, and row counts match the committed generated legacy-catalog manifest exactly;
- the expected three function signatures, definitions, owners, `SECURITY DEFINER` flags, `search_path` settings, and ACLs match that manifest exactly;
- the expected trigger definition and enabled state match that manifest exactly;
- every expected internal foreign key and dependency matches that manifest exactly;
- the migration executor owns every moved table and function;
- no outside-schema inbound foreign key, view, materialized view, rule, policy, trigger, event trigger, publication membership, function-body reference, or unexpected `pg_depend` edge exists;
- no canonical `ct_paid_*` overload exists;
- `comment_translator_paid_legacy_archive` does not exist;
- no Paid Cron job exists.

The initial Paid-legacy manifest authority has these aggregate checks and must include the complete sorted object rows rather than only the digests:

| Object | Columns | Column MD5 | Indexes | Index MD5 | Policies | Policy MD5 | Constraints | Constraint MD5 |
| --- | ---: | --- | ---: | --- | ---: | --- | ---: | --- |
| entitlements | 12 | `a7d8118a086072edb4e112d40e98ffcd` | 4 | `cd897d5454c63c1fdc53952e3c67b9bc` | 1 | `451bb730aa57c76a39b137db5d395a2d` | 7 | `db5a17b1b40cdd8bf6afabf9d476b3d7` |
| usage counters | 8 | `5923a875a6e42b7e41813783f0d12260` | 1 | `67109e2ac5d86cacdb02c85cf94ebb1a` | 1 | `bad667c116f91ce1b1e0b1dd4c9aa8ee` | 6 | `fa4dcbefbb77ab95ab64cd5a65c093fe` |
| usage events | 8 | `223ff60c557e872c0b8c3f03de405d04` | 1 | `f6af251d23d1d1281db01799a713b2c1` | 1 | `03465cd511b81de5490604e6ec6847de` | 6 | `2516198bd8853a23a238810c4c7b3474` |

All three Paid-legacy tables have RLS enabled. The three Paid-legacy function definitions have aggregate MD5 `6dc37ec241b7f07359a42e23741f87eb`; the single enabled trigger has aggregate MD5 `8af034bbb90bf8221228c263104a3e9a`; the observed outside dependency counts and publication memberships are zero. Implementation must generate and commit the full sorted Paid-legacy object/signature lists, then require exact equality at preflight and inside the bridge. The separate source-era read-only manifest is evidence and is not an input to bridge mutation.

A second committed `bridge-state-manifest` defines the canonical and clean no-op states. The canonical fingerprint is generated by applying all 55 migrations to a supported empty local stack and must exactly equal fresh Preview readback for every A2-reserved Paid schema/object: relations, columns, constraints, indexes, policies, triggers, RLS flags, owners, ACLs, functions, identity arguments, return types, function configs, and definition digests. The clean fingerprint requires complete absence of every A2-reserved Paid-legacy, canonical, and archive name before the base migration. Separately governed source-era names are excluded from state selection and remain untouched. The bridge embeds the exact sorted allowlists/digests generated from these artifacts; a count-only five-column/82-RPC check cannot select a no-op state.

#### Atomic archive procedure

Within one transaction, the bridge:

1. sets bounded lock and statement timeouts;
2. takes a named transaction advisory lock;
3. rechecks every precondition after the lock;
4. creates `comment_translator_paid_legacy_archive`;
5. moves the three exact Paid-legacy tables into that schema;
6. moves the three exact Paid-legacy functions into that schema;
7. disables the moved user trigger;
8. revokes schema usage and all table/function privileges from `PUBLIC`, `anon`, `authenticated`, and `service_role`;
9. verifies that all canonical public names are free and all archived objects are inaccessible to application roles.

Moving the tables to another schema also moves their indexes, constraints, policies, and table-owned relations, avoiding schema-wide index-name collisions when canonical objects are created.

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

After history markers, the bridge, and the extension migration, the expected local migration count is 55.

The expected convergence matrix is:

| Environment | Observed history | Expected pending | Result |
| --- | ---: | ---: | --- |
| production | 22 | 33 | markers skipped; bridge archives exact legacy state; canonical chain applies |
| Preview | 30 | 25 | five older local migrations, 18 markers, bridge canonical no-op, and `pg_net` no-op/apply as observed |
| clean supported baseline | 0 | 55 | markers and bridge are no-ops; complete canonical replay |

The five currently missing Preview versions are `20260527000000`, `20260601000000`, `20260624000000`, `20260705000000`, and `20260706073204`. Preview already has the canonical five-column entitlement shape, 82 `ct_paid_*` overloads, installed `pg_net`, and one inactive Paid Cron job; these are preflight evidence only and may drift. Before any mutation, use the exact local CLI to run `migration list` and `db push --dry-run --include-all` separately against each approved target and require the exact environment-specific set. A count-only match is insufficient.

### 4. Preview convergence gate

Preview convergence is a separate remote-mutation approval and a mandatory production entry gate. Merging source does not apply its 25 pending migrations and cannot satisfy convergence.

After the reviewed implementation is merged into the intended Preview integration line:

1. re-read the complete Preview migration and bridge-state fingerprints;
2. obtain explicit Preview migration approval;
3. require the exact 25-version dry-run set described above, with no repair request or unrelated version;
4. apply only that exact set with local CLI `2.109.0`;
5. require 55 total and 55 unique history versions matching the repository exactly;
6. require exact canonical active-schema and RPC/ACL manifest equality, archive schema absence, installed `pg_net`, and no retired source-era public objects;
7. require the pre-existing scheduler to remain exactly one job and inactive, with no create/alter/activate/deactivate/delete delta and no new run;
8. require the two pre-existing Preview Vault-name records and all secret values to remain untouched and unread.

Any pending version or failed readback leaves Preview non-converged and production at `NO-GO`. Production backup or mutation cannot begin until this gate passes.

### 5. Production migration sequence

The approved production apply sequence is fail-closed:

1. verify the exact production project without printing its identifier;
2. prove backup and restore rehearsal completion;
3. rerun the complete sanitized production fingerprint;
4. run `supabase migration list` through the isolated production-targeting context;
5. run the local `2.109.0` CLI `db push --dry-run --include-all`;
6. require the exact expected pending version set and ordering;
7. stop if the CLI asks for history repair or proposes an unknown migration;
8. obtain the migration-apply approval;
9. run one production `db push --include-all` from the exact reviewed commit;
10. perform schema, history, RPC, RLS, grant, extension, and row-count readback before any Vault or Cron mutation.

`--include-all` is required because production has newer recorded versions while some valid local versions are missing. `--include-seed` and remote reset are forbidden.

Do not assume CLI transaction semantics. Before production approval, prove with CLI `2.109.0` in a disposable local stack that a deliberately failing bridge-shaped migration leaves neither moved objects nor a history row, and that the successful case commits both DDL and its history row. The bridge SQL also performs all checks and movement in one PostgreSQL transaction. If the bridge commits and a later canonical migration fails, Paid remains disabled, Cron remains absent, and the operator stops rather than retrying blindly.

### 6. Default-privilege boundary

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

Before any production DDL, prepare an approved temporary tooling environment. Reuse the lockfile-pinned local Supabase CLI `2.109.0`; no Supabase dependency change or CLI installation is required. Docker and PostgreSQL client tooling remain absent and require a separate setup approval. PostgreSQL client major must be 17, matching production `17.6`, and the exact patch version or immutable container digest must be recorded.

The backup has two stages. First, take an unrestricted read-only rehearsal backup and prove local restore. Immediately before production apply, take the final transaction-consistent recovery backup while Free remains online and record the dump snapshot start as `T0`.

This design does not claim zero-loss rollback. On the Free plan without PITR, emergency restore can lose every database write committed after `T0`. The accepted bound is at most 20 minutes: backup/checksum must finish by `T0 + 10 minutes`, and migration plus the first decisive readback must finish by `T0 + 20 minutes`. Before production apply, the user must separately accept `RPO <= 20 minutes` and the emergency downtime/cutover procedure. If the backup misses the first deadline, apply does not start. If the migration path cannot reach success or a decisive failure by the second deadline, the source project is immediately paused through the pre-authorized exact project-pause action, covering Worker routes, webhooks, OAuth/Auth activity, schedulers, direct clients, and operator jobs at the project boundary. If project pause is unavailable or the bounded data-loss contract is not accepted, production apply is forbidden and A2 remains `NO-GO` until PITR or another enforceable recovery design exists.

Using the official Supabase logical-backup workflow, capture at minimum:

- `roles.sql`;
- `schema.sql`;
- `data.sql` using COPY format;
- `history_schema.sql` for `supabase_migrations`;
- `history_data.sql` for `supabase_migrations`.

Before backup, require total Vault rows = 0 and required-name rows = 0, matching the observed production state. If Vault is no longer empty, stop: a new design must cover the hosted Vault root-key boundary and new-project restore path before proceeding. Also require Storage object count = 0, matching the 2026-09-01 observation; a nonzero count stops because logical database backup does not contain object blobs. Run the exact local CLI equivalent of `supabase db diff --linked --schema auth,storage`; if it is non-empty, review it and create a restricted `auth_storage_changes.sql` artifact. Unreviewed Auth or Storage customizations are a hard stop.

The files must be written outside the repository to a uniquely named restricted temporary directory. Never print the connection string or file content. Record only filenames, byte sizes, SHA-256 digests, exit statuses, and sanitized object/row counts.

Restore into an isolated disposable local Supabase stack backed by PostgreSQL 17. Restore in this order: `roles.sql`, `schema.sql`, reviewed `auth_storage_changes.sql` when present, `data.sql`, `history_schema.sql`, then `history_data.sql`. Use `ON_ERROR_STOP` and explicit transactions where the selected tools support them; record which files are transactional rather than claiming one transaction across unsupported restore modes. Verify:

- restore exits successfully;
- migration-history count and digest manifest match;
- the three Paid-legacy table row counts remain zero;
- expected non-Paid row counts match in aggregate;
- Auth-dependent foreign keys and schemas are present;
- the restored database accepts the bridge and canonical migration sequence in a rehearsal;
- no production network endpoint is used by the restore target.

Because the required pre-backup Vault count is zero, this rehearsal intentionally does not claim that a hosted Supabase Vault root key is portable. The two new encrypted references are created only after schema verification, and rollback to this pre-change backup therefore does not depend on decrypting them.

Before production apply, also prove that an approved PostgreSQL-17 Supabase recovery project can be provisioned under the organization plan and that its region, extensions, Auth provider/redirect configuration, server-side endpoint cutover, secret rotation steps, and source-project pause action have an exact operator checklist. Project provisioning, cost/plan change, Auth configuration, pause, and endpoint cutover remain separate approvals. If project capacity or authorization is unavailable, stop at `NO-GO`.

The emergency restore/cutover procedure is concrete and never overwrites the source project blindly:

1. pause the exact source project no later than `T0 + 20 minutes`, prove it inaccessible, and keep all schedulers inactive;
2. provision the pre-approved recovery project and enable the reviewed extension/config set;
3. restore the final backup in the documented order, including Auth/Storage customizations and migration history;
4. verify exact history, aggregate data counts, Auth-user count, zero Storage objects, grants/RLS, canonical or pre-bridge catalog as appropriate, and zero Vault records;
5. apply the reviewed server-side endpoint/credential cutover and force client reauthentication under separate emergency deploy/cutover approval;
6. run sanitized Free smoke checks before reopening writes;
7. retain the original project paused for forensics; deletion or unpause is never implicit.

This follows the current Supabase logical-restore model, which restores to a new project. A local rehearsal proves SQL recoverability; it is not itself evidence that production cutover capacity exists.

The logical backup does not restore Storage object blobs. Gate 1 item 1 does not mutate Storage objects, so this limitation is recorded but does not broaden the task into a Storage migration.

Backup artifacts and credentials must not be committed. Cleanup of the disposable restore target and backup files is a separate destructive action after the Gate is closed and requires exact-path confirmation.

## RPC and schema readback

Implementation must generate and commit an exact canonical RPC manifest containing each schema/name/identity-argument tuple, return type, owner, `SECURITY DEFINER` flag, function config including `search_path`, sorted ACL, and function-definition digest. At the reviewed base the manifest contains 82 `ct_paid_*` overloads with aggregate MD5 `d975b161bf115fe6ecd80ad68c55134e`. The generated rows, not the count or aggregate digest alone, are the allowlist. The manifest is regenerated after any source change and production readback must equal the reviewed committed artifact.

After migration apply, read back sanitized evidence for:

- all expected migration versions present locally and remotely with no divergence;
- `pg_net`, `pg_cron`, and `supabase_vault` installed;
- canonical Paid Core relation count and expected table/column/constraint fingerprints;
- archive schema present with exactly three tables and three functions;
- archived tables still zero-row, RLS-enabled, and inaccessible to application roles;
- archived trigger disabled;
- exact equality to the committed canonical RPC manifest;
- reconciler claim default/hard limit 50 and lease exactly 120 seconds;
- stale-token rejection contract;
- retention cleanup default/hard limit 500 and rejection outside 1 through 500;
- sanitized scheduler evidence from `comment_translator_paid_scheduler_runs`, `ct_paid_record_sanitized_scheduler_run`, `ct_paid_read_sanitized_scheduler_run(text)`, and `ct_paid_read_sanitized_admin_visibility(timestamptz)`, including retry-attempt alerting at 5 or more;
- `PUBLIC`, `anon`, and `authenticated` execute counts on Paid RPCs equal zero;
- `service_role` execute privileges equal only the exact committed ACL manifest;
- the public HTTP maintenance transport and private Vault transport remain unavailable to browser roles and executable by `service_role` only;
- current-object security and performance advisors compared with a pre-DDL baseline.

Advisor blocking is scoped and deterministic: any newly introduced advisory whose referenced object intersects the new canonical Paid, archive, `pg_net`, Vault-binding, or Cron objects is a hard stop; any new high/critical security advisory or missing RLS/grant boundary is also a hard stop. Unchanged pre-existing advisories outside this object set are recorded but do not become A2 blockers.

No maintenance RPC is invoked in production during this Gate.

## Vault and inactive Cron configuration

Vault and Cron are separate post-schema approval gates.

### Vault

Create exactly one encrypted secret for each required name:

- `comment_translator_paid_maintenance_url`
- `comment_translator_paid_cron_token`

Create both records in one explicit transaction after taking a deterministic transaction advisory lock for this exact binding. Recheck that both names are absent under the lock, pass values through non-logged bound/session inputs rather than SQL interpolation, call `vault.create_secret` for both, and require exact count = distinct count = 2 before commit. Any create or assertion failure rolls back both records. Use `vault.update_secret` only in a separately approved rotation path. Never query or return `decrypted_secret` during evidence collection.

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
6. require database `postgres` and username `postgres` in the exact row contract;
7. read back the exact job row inside the transaction and commit only when it is inactive.

The scheduler cannot observe the uncommitted active row. After commit, require:

- matching jobs = 1;
- active jobs = 0;
- scheduler process count = 1;
- job runs = 0;
- Cloudflare fallback scheduler = absent/inactive;
- cadence, command digest, database `postgres`, and username `postgres` match the approved contract without exposing private values.

Record the new job ID and a pre-transaction `cron.job_run_details` baseline. Keep the job inactive for a fixed 10-minute observation window after commit, covering two five-minute cadences. Query only that exact job ID and rows after the baseline; require run delta = 0 and `active=false` at the start and end of the window. Historical rows for unrelated jobs do not affect this scoped assertion.

Cron activation is explicitly out of scope.

## Rollback design

Rollback depends on the failure phase.

### Before bridge commit

Any bridge failure rolls back automatically. No history or object movement should remain. Recheck the original fingerprint and stop.

### After bridge commit

Do not manually move archived objects back while leaving the bridge migration recorded. That would create a non-retryable history/object mismatch. After commit, use only a reviewed forward fix or the approved bounded-RPO recovery-project restore/cutover procedure above, including `supabase_migrations`, under separate incident, pause, provisioning, and deploy/cutover approvals. The restore may lose writes committed between `T0` and source-project pause; that explicitly accepted bound must not exceed 20 minutes.

### After canonical migrations succeed

Do not run a destructive down migration by default. Keep Paid disabled and Cron absent/inactive, preserve the archive, and use a reviewed forward fix.

If data integrity or Free availability is affected and a forward fix is not safe, pause the source project by the deadline and execute the verified recovery-project procedure under separate incident approvals. Do not perform an unsupported in-place overwrite and do not delete or directly rewrite entitlement, capacity, hold, or receipt rows to simulate rollback.

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
- bounded `RPO <= 20 minutes` acceptance, exact project-pause authority, recovery-project capacity, or emergency cutover checklist is unavailable;
- the production fingerprint changes;
- any Paid-legacy table contains a row;
- a separately governed source-era object differs from its read-only safety manifest or requires mutation to continue;
- a bridge object, owner, signature, trigger, FK, dependency, RLS state, or grant differs;
- migration dry-run requests repair or proposes an unexpected version/order;
- `pg_net` cannot be enabled through the approved migration role;
- any migration fails or leaves history divergence;
- a new in-scope advisor finding, high/critical security advisory, RLS failure, or grant-manifest mismatch appears;
- Vault names are duplicated or unreadable by count-only checks;
- Cron is not exactly one row and inactive;
- any Cron run occurs;
- Cloudflare fallback appears as a second scheduler authority;
- any secret/private identifier would need to be printed to continue.

There is no automatic retry after a failed mutation. Diagnose and obtain a new approval for a changed action.

## Implementation artifacts

The implementation plan may create or modify only the minimum artifacts needed for this design:

- 18 inert history-marker migrations and the sanitized production-history manifest;
- the ordered legacy bridge migration;
- the ordered `pg_net` extension migration;
- generated exact legacy-catalog and canonical-RPC/ACL manifests plus bridge contracts;
- a read-only production preflight contract;
- an approval-gated backup/restore runner or exact operator instructions;
- an exact bounded-RPO, project-pause, and recovery-project cutover checklist;
- an approval-gated production migration runner;
- an approval-gated Vault/Cron inactive configuration runner;
- focused rollback and readback contracts;
- the Paid runbook and short current-task status where repository workflow requires updates.

No runtime application behavior, UI, Stripe integration, Provider path, Cloudflare deployment configuration, or Paid kill switch is changed by this slice.

## Verification strategy

### Static and contract tests

- production-history marker version/name/count/digest manifest;
- exact per-version replacement/retirement mapping and normalized equivalence checks for the two local replacements;
- no secret/private identifier in markers, generated manifests, or changed files;
- exact migration ordering, including bridge before base and `pg_net` before Task 9;
- bridge exact-legacy positive case;
- full-manifest canonical no-op positive case;
- full-manifest clean no-op positive case;
- non-empty, partial, mixed, wrong-owner, extra-dependency, duplicate, and malformed negative cases;
- archive privilege and disabled-trigger assertions;
- post-commit forward-fix/recovery-project rollback contract;
- bounded-RPO deadlines, exact project pause, Storage/Vault-zero, recovery-capacity, and endpoint-cutover fail-closed contracts;
- production target and approval-token fail-closed behavior;
- Cron exact name/cadence/command/inactive contract;
- Vault count-only evidence contract.

### Database integration tests

Using the disposable restored database:

1. replay all 55 migrations from an empty supported baseline;
2. verify the restored exact legacy catalog converges through the bridge into canonical Paid Core v1;
3. verify applying the bridge to an already-canonical Preview-shaped database is a no-op;
4. verify the clean pre-base bridge state is a no-op;
5. inject one CLI migration failure and prove both object movement and its history row roll back;
6. verify all canonical RPC privileges, constraints, scheduler limits, monitoring, and atomicity contracts;
7. run `supabase db reset` and migration list consistency checks;
8. prove the production, Preview, and clean expected-pending sets separately;
9. ensure no external HTTP request or Cron run occurs.

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
3. **Preview migration apply:** exact 25-version set and post-apply readback.
4. **Tooling setup:** Docker and PostgreSQL 17 clients on an approved host; the repository-local Supabase CLI is already available and pinned.
5. **Recovery capacity:** project cost/plan/capacity, exact source-project pause authority, and recovery/cutover readiness.
6. **Backup execution:** production read and restricted local artifact creation.
7. **Bounded recovery risk:** explicit acceptance of `RPO <= 20 minutes` and emergency downtime.
8. **Production migration apply:** bridge, canonical migrations, and `pg_net` against production, with the pre-authorized pause deadline.
9. **Vault write:** exactly two named encrypted production references.
10. **Cron inactive configuration:** exactly one five-minute job committed inactive.
11. **Rollback/cutover:** only the exact phase-specific incident action approved at that time.
12. **Cron activation:** not part of Gate 1 item 1.
13. **Production deploy/Paid activation:** not part of this design, except an emergency recovery endpoint cutover under its own approval.

## GO evidence

Gate 1 item 1 may be labeled `GO` only when all of the following are current and directly verified:

- reviewed source commit is merged into the intended Preview integration line;
- Preview has all 55 exact history versions and passes canonical schema/RPC readback with no mutation to its inactive scheduler or Vault values;
- manual logical backup and isolated restore rehearsal pass;
- final recovery backup records `T0`, the 10/20-minute deadlines and `RPO <= 20 minutes` are explicitly accepted, and exact pause/recovery-project/cutover capacity is ready;
- local and production migration histories are fully aligned;
- bridge archived only the exact three-table/three-function zero-row Paid-legacy subsystem;
- the six-table/seven-function separately governed source-era subsystem remains unchanged and passes its read-only safety manifest;
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
