# Comment Translator Paid Core v1 Gate 1 Production Supabase Readiness Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking. The implementation parent must be a verified `gpt-5.6-luna / max` top-level task. Source implementation must not perform Preview or production migration apply, history repair, backup, project pause/provisioning, Vault write, Cron mutation, function invocation, deploy, activation, push, or PR creation without the matching later approval.

**Goal:** Add the source-controlled migrations, exact sanitized manifests, fail-closed contracts, and operator procedures required to move Gate 1 item 1 safely from source `NO-GO` toward separately approved Preview and production execution.

**Architecture:** Reconcile the 18 production-only history labels with inert markers, then use one pre-base bridge that recognizes exact legacy, canonical, or clean states and mutates only the three zero-row Paid-legacy tables and three Paid-legacy functions. Keep production-only overlay/moderator-share/dictionary/history objects outside the mutation allowlist, add `pg_net` before the Task 9 HTTP RPC, and encode every external operation as an explicit state transition backed by sanitized readback. Source implementation ends at locally verified operator readiness; every remote or destructive phase remains a separate approval.

**Tech Stack:** PostgreSQL 17 / PL/pgSQL, Supabase CLI `2.109.0`, Node.js 22 ESM contracts, PowerShell operator preflight, JSON manifests, existing Paid Core v1 migrations and contracts.

**Approved specification:** `docs/superpowers/specs/2026-08-31-comment-translator-paid-v1-gate1-production-supabase-design.md`

---

## File structure

**Create — migrations**

- `supabase/migrations/20260624040504_comment_translator_real_comments_feed_snapshots.sql`
- `supabase/migrations/20260624141142_account_display_timezone_preference.sql`
- `supabase/migrations/20260722000000_comment_translator_paid_entitlements.sql`
- `supabase/migrations/20260722001000_comment_translator_paid_usage_counters.sql`
- `supabase/migrations/20260722002000_comment_translator_obs_overlay_tokens.sql`
- `supabase/migrations/20260722003000_comment_translator_obs_overlay_browser_sessions.sql`
- `supabase/migrations/20260723000000_comment_translator_moderator_share_tokens.sql`
- `supabase/migrations/20260723001000_comment_translator_moderator_share_browser_sessions.sql`
- `supabase/migrations/20260723002000_comment_translator_custom_dictionary.sql`
- `supabase/migrations/20260723003000_comment_translator_creator_history.sql`
- `supabase/migrations/20260726111154_comment_translator_paid_entitlements.sql`
- `supabase/migrations/20260728135736_comment_translator_paid_usage_counters.sql`
- `supabase/migrations/20260728142220_comment_translator_obs_overlay_tokens.sql`
- `supabase/migrations/20260728145324_comment_translator_obs_overlay_browser_sessions.sql`
- `supabase/migrations/20260728160206_comment_translator_moderator_share_tokens.sql`
- `supabase/migrations/20260728164122_comment_translator_moderator_share_browser_sessions.sql`
- `supabase/migrations/20260728172220_comment_translator_custom_dictionary.sql`
- `supabase/migrations/20260729035621_comment_translator_creator_history.sql`
- `supabase/migrations/20260811000000_comment_translator_paid_v1_legacy_schema_bridge.sql`
- `supabase/migrations/20260814105000_comment_translator_paid_pg_net_extension.sql`

**Create — evidence and contracts**

- `scripts/fixtures/comment-translator-paid-core-v1-gate1-production-history.json` — exact 18-version metadata and replacement/retirement classification.
- `scripts/fixtures/comment-translator-paid-core-v1-gate1-paid-legacy-catalog.json` — complete sorted three-table/three-function/one-trigger catalog and dependency fingerprint.
- `scripts/fixtures/comment-translator-paid-core-v1-gate1-source-era-catalog.json` — exact read-only six-table/seven-function safety fingerprint; never used as a mutation allowlist.
- `scripts/fixtures/comment-translator-paid-core-v1-gate1-bridge-states.json` — exact legacy, canonical, and clean state allowlists/digests; separately governed source-era names are an excluded observation set.
- `scripts/fixtures/comment-translator-paid-core-v1-gate1-canonical-rpc.json` — complete canonical `ct_paid_*` identity/return/owner/config/ACL/definition manifest.
- `scripts/fixtures/comment-translator-paid-core-v1-gate1-environment-inventories.json` — exact ordered final-55, Preview-pending-25, and production-pending-33 version/name arrays plus sanitized target fingerprints.
- `scripts/fixtures/comment-translator-paid-core-v1-gate1-catalog-readonly.sql` — fixed SELECT-only catalog queries and canonical JSON projections used to acquire the five manifests.
- `scripts/comment-translator-paid-core-v1-gate1-catalog-acquire-readonly.ps1` — read-only `psql \copy` adapter that writes the four legacy statement arrays directly to a restricted local directory without returning SQL bodies.
- `scripts/comment-translator-paid-core-v1-gate1-catalog-contract.mjs` — fixture schemas, deterministic canonicalization, inventory, equivalence, and sensitive-value checks.
- `scripts/comment-translator-paid-core-v1-gate1-migration-contract.mjs` — marker, ordering, bridge, extension, and three-environment migration tests.
- `scripts/comment-translator-paid-core-v1-gate1-database-integration-contract.mjs` — disposable PostgreSQL-17 execution for legacy/canonical/clean/negative states and CLI rollback/history atomicity.
- `scripts/comment-translator-paid-core-v1-gate1-operator-contract.mjs` — approval/state-machine, backup/RPO, Preview, production, Vault, Cron, readback, and stop tests.
- `scripts/comment-translator-paid-core-v1-gate1-preflight-readonly.mjs` — sanitized catalog/history/extension/Vault-name/Cron/advisor read-only evidence adapter; no function invocation or mutation.
- `scripts/comment-translator-paid-core-v1-gate1-preflight-readonly-contract.mjs` — source and fixture contract for the read-only adapter.
- `scripts/comment-translator-paid-core-v1-gate1-backup-recovery-preflight.ps1` — local tool/version checks and dry-run command construction only; it must not dump, pause, provision, restore, or cut over by default.
- `scripts/comment-translator-paid-core-v1-gate1-backup-recovery-contract.mjs` — exported-snapshot `T0`, 5/10/20-minute watchdog, restore ordering, and secret-safe reporting tests.
- `scripts/comment-translator-paid-core-v1-gate1-vault-write.ps1` — approval-gated PostgreSQL-17 `psql` extended-query runner for the exact two Vault names; inert without its exact mode/approval inputs.
- `scripts/comment-translator-paid-core-v1-gate1-vault-binding-integration-contract.mjs` — disposable local-Supabase proof of parameter binding, atomic two-row commit, and rollback without value disclosure.

**Create/modify — operator authority**

- Create `docs/active/COMMENT_TRANSLATOR_PAID_V1_GATE1_PRODUCTION_SUPABASE_READINESS.md` — exact approval packets and operator state transitions.
- Modify `docs/active/COMMENT_TRANSLATOR_PAID_V1_RUNBOOK.md` — link the Gate 1 operator authority and keep activation/deploy separate.
- Modify `task.md` — one concise current status line; no long session history.

No runtime application, UI, Stripe, Provider, Cloudflare deployment configuration, kill switch, package manifest, or lockfile is changed.

---

## Chunk 1: Migrations, manifests, and database contracts

### Task 1: Freeze current source and sanitized evidence

**Files:**

- Verify: `docs/superpowers/specs/2026-08-31-comment-translator-paid-v1-gate1-production-supabase-design.md`
- Verify: `supabase/migrations/*.sql`
- Create later: the five JSON files, fixed SELECT-only SQL file, and read-only acquisition adapter listed above.

- [ ] **Step 1: Revalidate the implementation checkout**

Run:

```powershell
git status --short --branch
git rev-parse HEAD
.\node_modules\.bin\supabase.cmd --version
node --version
```

The Sol handoff must pin `GATE1_IMPLEMENTATION_ROOT`, `GATE1_IMPLEMENTATION_BRANCH`, and `GATE1_HANDOFF_HEAD` before Luna begins. The branch is either `codex/comment-translator-paid-v1-gate1-supabase-design` or one exact approved `codex/` successor created from it for the isolated implementation worktree; no wildcard branch is accepted. Require current root, branch, and pre-edit HEAD to equal those three values, and require `git merge-base --is-ancestor a275174dc6494a8d159f1fff30318c05fece0107 HEAD` to exit 0. Before implementation edits, the only permitted branch delta from that base is the approved design/plan path set under `docs/superpowers/specs` and `docs/superpowers/plans`; an approved successor commit may replace `HEAD`, but it must remain a descendant of the same base and contain the approved spec unchanged. Expected Supabase CLI is `2.109.0`; Node is 22.x. Stop on a dirty tree, wrong root/branch/base, unexpected pre-existing path, CLI drift, or missing dependency. Do not install or upgrade anything.

- [ ] **Step 2: Revalidate the migration inventory without linking or mutating a remote**

Create the catalog contract first with this exact ordered baseline and make it list `supabase/migrations/*.sql` directly:

```js
const baselineMigrations = [
  "20260527000000_account_preferences_foundation",
  "20260601000000_youtube_oauth_credentials",
  "20260615000000_comment_translator_sessions",
  "20260615001000_comment_translator_usage_ledger_events",
  "20260623000000_comment_translator_real_comments_feed_snapshots",
  "20260624000000_account_display_timezone_preference",
  "20260705000000_comment_translator_creator_waitlist_registrations",
  "20260706073204_supabase_default_privileges_guard",
  "20260812120000_comment_translator_paid_core_v1",
  "20260813130000_comment_translator_paid_task6_circuit_probe_claim",
  "20260813131500_comment_translator_paid_task6_openai_rate_retry",
  "20260813133000_comment_translator_paid_task6_owned_circuit_failure",
  "20260813134500_comment_translator_paid_task6_azure_billing_split",
  "20260813135500_comment_translator_paid_task6_azure_uncertain_retry_compatibility",
  "20260813140000_comment_translator_paid_task6_azure_uncertain_retry",
  "20260813141500_comment_translator_paid_task6_circuit_success_window",
  "20260813143000_comment_translator_paid_task6_openai_resume_status",
  "20260813144500_comment_translator_paid_task6_terminal_openai_partial",
  "20260813150000_comment_translator_paid_task6_openai_partial_receipt",
  "20260813151500_comment_translator_paid_task6_terminal_openai_partial_authority",
  "20260813153000_comment_translator_paid_task6_replay_circuit_authority",
  "20260813154500_comment_translator_paid_task6_dispatch_and_azure_partial_settlement",
  "20260814100000_comment_translator_paid_task7_runtime_authority",
  "20260814110000_comment_translator_paid_task9_retention_observability",
  "20260815090000_comment_translator_paid_cron_vault_transport",
  "20260818100000_comment_translator_paid_gate0a_poll_budget_rpc_repair",
  "20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair",
  "20260819110000_comment_translator_paid_gate0a_capacity_read_repair",
  "20260823120000_comment_translator_paid_gate0a_unbound_hold_recovery",
  "20260823130000_comment_translator_paid_gate0a_schedule_function_privilege_repair",
  "20260826100000_comment_translator_paid_gate0a_checkout_recovery_window_floor",
  "20260826110000_comment_translator_paid_gate0a_recovery_floor_second_canonicalization",
  "20260827020609_comment_translator_paid_checkout_expiry_finalize_lease",
  "20260829100000_comment_translator_paid_task6_azure_uncertain_retry_guard_repair",
  "20260831100000_comment_translator_paid_task11_message_rate_runtime_repair"
];
```

Run `node scripts/comment-translator-paid-core-v1-gate1-catalog-contract.mjs --baseline-only`. Expected: `baseline-migrations=35 unique=35 ordered=pass additions=0` and exit 0. Any swapped, missing, duplicate, or extra file fails even when counts match.

- [ ] **Step 3: Freeze the exact sanitized production evidence into fixtures**

Before migration edits, create `comment-translator-paid-core-v1-gate1-catalog-readonly.sql`, `comment-translator-paid-core-v1-gate1-catalog-acquire-readonly.ps1`, and the catalog contract. The SQL file may contain only CTEs and SELECTs over `supabase_migrations`, `pg_catalog`, `information_schema`, `cron.job`, `cron.job_run_details`, `vault.secrets`, and extension/advisor-readable catalog surfaces. Acquire sanitized production and Preview catalog results through the Supabase connector's read-only `execute_sql` path after exact target-name selection; never use `apply_migration`. Feed returned sanitized JSON to the contract through a restricted temporary file outside the repository, then write only validated sanitized fixture JSON with `apply_patch`. Full SQL statement bodies are excluded from every connector query and result.

All fixtures use `schemaVersion: 1`, no timestamp, no project/organization ID, and this deterministic digest rule. The digest input is always the complete top-level object with `aggregateSha256` omitted; the stored `aggregateSha256` is then added after hashing that projection:

```js
function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeysDeep(value[key])]));
}
const { aggregateSha256: _excluded, ...digestProjection } = value;
const canonicalJson = JSON.stringify(sortKeysDeep(digestProjection));
const sha256 = crypto.createHash("sha256").update(canonicalJson, "utf8").digest("hex");
```

Catalog row normalization is fixed: identifiers are lowercase server-returned names; arrays are sorted by schema/name/identity or ordinal; PostgreSQL types use `format_type`; defaults/constraints/indexes/triggers use server `pg_get_*def` output with CRLF→LF and outer whitespace trimmed only; ACLs use `aclexplode` sorted by grantee role, privilege, and grantable; function bodies are not committed and only `md5(pg_get_functiondef(oid))` is stored. Dependency counts are separate exact integers for inbound FK, views, materialized views, rules, policies, user triggers, event triggers, publications, outside function-source references, and unexpected `pg_depend` edges.

The exact nested row schemas are:

```text
HistoryRow = {version,name,statementCount,sqlBytes,statementsMd5,classification,replacementVersion}
ColumnRow = {schema,table,ordinal,name,type,notNull,defaultDefinition}
ConstraintRow = {schema,table,name,type,definition}
IndexRow = {schema,table,name,definition}
PolicyRow = {schema,table,name,command,permissive,roles,usingDefinition,checkDefinition}
AclRow = {schema,objectKind,objectIdentity,grantee,privilege,grantable}
TableRow = {schema,name,owner,rlsEnabled,rowCount,columns,constraints,indexes,policies,acls}
FunctionRow = {schema,name,identityArguments,resultType,owner,securityDefiner,config,acls,definitionMd5}
TriggerRow = {tableSchema,tableName,name,enabled,functionIdentity,definition}
DependencyCounts = {inboundForeignKeys,views,materializedViews,rules,policies,userTriggers,eventTriggers,publications,outsideFunctionSourceReferences,unexpectedPgDependEdges}
CatalogState = {tables,functions,triggers,dependencyCounts}
BridgeStates = {schemaVersion,legacy:CatalogState,canonical:CatalogState,clean:CatalogState,sourceEraExcludedObservation:{tables:{schema,name}[],functions:{schema,name,identityArguments}[]},aggregateSha256}
```

Every nested array uses the catalog sort order already defined; `roles` and `config` are sorted strings. The history fixture is `{schemaVersion,rows:HistoryRow[],highConfidenceSecretMatches,rollbackStatementCount,aggregateSha256}`. Paid-legacy and source-era fixtures are `{schemaVersion,tables:TableRow[],functions:FunctionRow[],triggers:TriggerRow[],dependencyCounts:DependencyCounts,aggregateSha256}`. Canonical RPC is `{schemaVersion,functions:FunctionRow[],aggregateMd5,aggregateSha256}` where `aggregateMd5` is MD5 over the UTF-8 bytes of `functions.map(sortKeysDeep).map(JSON.stringify).join("\n")` in exact identity order. Bridge state digests use the top-level SHA-256 projection rule and never reuse the canonical RPC aggregate MD5.

The Paid-legacy function identities are pinned as:

```text
apply_comment_translator_paid_entitlement_evidence(p_billing_user_reference_id text, p_stripe_customer_reference_id text, p_stripe_subscription_reference_id text, p_subscription_status text, p_billing_state text, p_current_period_end timestamp with time zone, p_evidence_event_reference_id text, p_evidence_created_at timestamp with time zone, p_evidence_recorded_at timestamp with time zone) -> boolean
apply_comment_translator_paid_usage(p_billing_user_reference_id text, p_expected_period_end timestamp with time zone, p_usage_event_reference_id text, p_occurred_at timestamp with time zone, p_translated_message_count bigint, p_provider_input_character_count bigint, p_estimated_cost_micros bigint) -> text
sync_comment_translator_paid_usage_from_entitlement() -> trigger
```

All three are owner `postgres`, `SECURITY DEFINER`, `search_path=public`, with definition MD5s from the approved spec/current read-only evidence.

The source-era fixture must independently record all six tables and seven functions with exact zero rows, RLS flags, owners, ACLs, identities, and definition digests. It is compared before/after every later readback and is prohibited from appearing in bridge mutation lists.

The four Paid-legacy bodies required only for disposable integration are versions `20260722000000`, `20260722001000`, `20260726111154`, and `20260728135736`, with exact `<version>_<name>.sql` filenames from the production-history fixture. During the separately approved read-only acquisition, run the PowerShell adapter with connection material supplied only through process environment. It must require PostgreSQL `psql` major 17, set `PGOPTIONS=-c default_transaction_read_only=on`, begin `REPEATABLE READ READ ONLY`, verify the exact production target fingerprint through a sanitized scalar query, and use client-side `\copy` to write one ordered JSONL staging file directly under a newly created restricted directory outside repository/workspace/home roots. The fixed query selects only `{version,name,statements}` for the four exact versions ordered by version; `psql` stdout/stderr are captured and filtered to fixed status labels, so statement text never enters terminal/tool output. No URL/password/SQL body may appear in arguments or logs.

The adapter parses the JSONL locally and requires each `statements` value to be an ordered JSON string array. For each row it computes `statementsMd5 = MD5(UTF8(JSON.stringify(statements)))`, then computes `serializedSql = statements.join("\n\n") + "\n"` with no newline normalization, no BOM, no added terminator, and writes its exact UTF-8 bytes to `<version>_<name>.sql`. `sqlBytes` is `Buffer.byteLength(serializedSql, "utf8")`. Those two values are the only definitions used when generating and validating the production-history fixture. Delete the JSONL staging file after successful conversion, bind the directory path to `GATE1_LEGACY_SQL_DIR` without logging it, and leave exactly four regular non-symlink files. Before any migration edit, the catalog contract maps each filename to one history row, verifies exact count/version/name/byte length/MD5, runs the high-confidence scan, rejects rollback/history-repair/credential material, and rejects any fifth file or symlink. The files remain untracked temporary evidence and are never copied into source, fixtures, reports, commits, or PRs.

Stage acquisition to avoid circular authority: production history/Paid-legacy/source-era and Preview canonical/RPC fixtures are acquired first; migrations are then implemented from those approved inputs; only after all 55 exist does the disposable local replay regenerate the canonical manifest and require byte-identical canonical JSON equality with the fresh Preview fixture. If current evidence differs from the approved spec, stop before migration edits and return to design review.

- [ ] **Step 4: Run changed-fixture secret and identifier scans**

Run:

```powershell
$gate1Files = Get-ChildItem scripts/fixtures/comment-translator-paid-core-v1-gate1-* -File | ForEach-Object FullName
rg -n -i --pcre2 '(?:postgres(?:ql)?://[^\s]+|sb_(?:secret|publishable)_[A-Za-z0-9_-]{20,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}|Authorization\s*:\s*\S+|Bearer\s+[A-Za-z0-9_.-]{20,}|(?:service_role|owner(?:_id| id)|project(?:_id| id))\s*[:=]\s*["''][^"'']+["''])' -- $gate1Files
if ($LASTEXITCODE -eq 1) { 'HIGH_CONFIDENCE_SECRET_MATCHES=0'; exit 0 }
exit $LASTEXITCODE
```

Expected: `HIGH_CONFIDENCE_SECRET_MATCHES=0`. Any `rg` execution error is not converted to pass.

- [ ] **Step 5: Prove the two timestamp variants are schema-equivalent**

The production versions `20260624040504` and `20260624141142` must be compared respectively with local replacements `20260623000000` and `20260624000000`. Acquire each original production statement only through the approved read-only path into a restricted temporary file outside the repository; never print or commit it. Run the high-confidence scan before use and delete the temporary file only after the comparison has completed.

On disposable PostgreSQL 17 databases, apply each production variant and its local replacement to separate clean databases. Query the affected tables, columns, defaults, indexes, constraints, triggers, RLS policies, ACLs, and functions through the fixed catalog SQL; normalize with the exact `sortKeysDeep` and server-definition rules above; and require byte-identical canonical JSON plus equal SHA-256 digests for each pair. The catalog contract exposes this as:

```powershell
node scripts/comment-translator-paid-core-v1-gate1-catalog-contract.mjs --timestamp-equivalence
```

Expected: `timestamp-equivalence=2/2 production-sql-committed=0`. If PostgreSQL 17/Docker or the read-only evidence path is unavailable, report `SETUP_BLOCKED`; do not install tools and do not claim local integration verification.

### Task 2: Write the migration contract RED tests

**Files:**

- Create: `scripts/comment-translator-paid-core-v1-gate1-migration-contract.mjs`
- Read: `scripts/comment-translator-paid-core-v1-migration-parser-contract.mjs`
- Read: `scripts/comment-translator-paid-core-v1-schema-contract.mjs`

- [ ] **Step 1: Add exact fixture and migration inventory assertions**

Use `node:assert/strict`, `node:crypto`, `node:fs`, and `node:path`. Load all five catalog JSON fixtures as independent expected evidence; the sixth environment-inventory fixture is created and governed separately in Task 5. Validate every top-level/nested field against the exact Task 1 schemas, recompute every aggregate digest from its pre-digest projection, reject additional fields, and assert every expected row and sort order. Assert:

```js
assert.equal(history.rows.length, 18);
assert.equal(new Set(history.rows.map(({ version }) => version)).size, 18);
assert.equal(history.highConfidenceSecretMatches, 0);
assert.equal(history.rollbackStatementCount, 0);
assert.equal(legacy.tables.length, 3);
assert.equal(legacy.functions.length, 3);
assert.equal(legacy.triggers.length, 1);
assert.equal(sourceEra.tables.length, 6);
assert.equal(sourceEra.functions.length, 7);
assert.deepEqual(bridgeStates.sourceEraExcludedObservation.tables, sourceEra.tables.map(({ schema, name }) => ({ schema, name })));
assert.deepEqual(bridgeStates.sourceEraExcludedObservation.functions, sourceEra.functions.map(({ schema, name, identityArguments }) => ({ schema, name, identityArguments })));
assert.deepEqual(bridgeStates.legacy, {
  tables: legacy.tables,
  functions: legacy.functions,
  triggers: legacy.triggers,
  dependencyCounts: legacy.dependencyCounts
});
assert.equal(canonicalRpc.functions.length, 82);
assert.equal(canonicalRpc.aggregateMd5, "d975b161bf115fe6ecd80ad68c55134e");
```

Also assert exact per-version classification: the two timestamp variants map to normalized local replacements; the four entitlement/usage versions map to the Paid-legacy archive + canonical base; the remaining twelve source-era versions map to `retained-production-only-outside-a2`. Assert source-era names occur only in the source-era fixture and `sourceEraExcludedObservation`, never in the legacy/canonical/clean mutation allowlists.

- [ ] **Step 2: Add marker safety assertions**

For each of 18 expected marker files, assert exact filename, one `DO` statement, `begin null; end`, matching sanitized comment metadata, and no recovered SQL body. Reject `create table`, `alter table`, `create function`, grants, DML, history repair, IDs, URLs, secrets, or source-era object mutation.

- [ ] **Step 3: Add bridge state and mutation assertions**

Assert the bridge is ordered after `20260729035621` and before `20260812120000`; contains exact statements `set local lock_timeout = '5s'`, `set local statement_timeout = '60s'`, and `perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('comment-translator-paid-v1-gate1-legacy-bridge', 0))`; recognizes only `exact-legacy`, `exact-canonical`, or `exact-clean`; and compares complete embedded expected/actual `jsonb` structurally using `IS NOT DISTINCT FROM`. Reject `jsonb::text`, Node serialization constants, and cross-runtime byte/digest comparison in the bridge.

Before any DDL, require the archive schema to be absent, the exact Paid Cron job count to be zero, all canonical Paid identities to be absent in legacy state, and the executor to own every object that could be moved. Exact legacy additionally requires all three table row counts to be zero, RLS enabled, the one expected user trigger present and enabled, all three internal FK definitions exact, and each external dependency class independently zero: inbound FKs, views, materialized views, rules, policies, outside user triggers, event triggers, publications, outside function-source references, and unexpected `pg_depend` edges. Assert only the three manifest-listed Paid-legacy tables and the three exact function identities from Task 1 can move; disable the moved trigger; revoke archive access from `PUBLIC`, `anon`, `authenticated`, and `service_role`; and post-verify freed canonical names plus inaccessible archive objects. Reject source-era names in every `ALTER ... SET SCHEMA`, grant/revoke target, or dynamic mutation statement.

- [ ] **Step 4: Add `pg_net` and environment convergence assertions**

Require `20260814105000_comment_translator_paid_pg_net_extension.sql` to contain only:

```sql
create extension if not exists pg_net with schema extensions;
```

Require exact inventories: repository 55; observed production history 22 with exact pending set 33; observed Preview history 30 with exact pending set 25; clean baseline pending 55. Count-only matches are insufficient; compare ordered version/name arrays.

- [ ] **Step 5: Run RED**

Run:

```powershell
node --check scripts/comment-translator-paid-core-v1-gate1-migration-contract.mjs
node scripts/comment-translator-paid-core-v1-gate1-migration-contract.mjs
```

Expected: syntax PASS, execution FAIL on missing marker/bridge/extension sources, not on fixture parsing.

### Task 3: Create the 18 inert history markers

**Files:** the 18 marker migration paths listed in File structure.

- [ ] **Step 1: Create every migration through the pinned CLI**

For each approved migration name, run:

```powershell
.\node_modules\.bin\supabase.cmd migration new <approved_name>
```

Then use a bounded PowerShell `Move-Item -LiteralPath` to rename only the newly generated file to its exact approved production version. Verify source and destination absolute paths remain under `supabase/migrations`. Never overwrite an existing file.

- [ ] **Step 2: Populate the exact inert marker template**

Each file contains only its own sanitized values:

```sql
-- Comment Translator Paid Core v1 Gate 1 migration-history marker.
-- Original production version: <14-digit version>
-- Original production name: <name>
-- Original statement count: <count>
-- Original SQL bytes: <bytes>
-- Original statements MD5: <md5>
-- Schema effect: <normalized-local-replacement | paid-legacy-archive-and-canonical-replacement | retained-production-only-outside-a2>
-- The original SQL is deliberately not replayed by this marker.

do $comment_translator_paid_gate1_history_marker$
begin
  null;
end
$comment_translator_paid_gate1_history_marker$;
```

- [ ] **Step 3: Run the focused contract**

Run:

```powershell
node scripts/comment-translator-paid-core-v1-gate1-migration-contract.mjs --phase markers
```

Expected exit 0 only when all 18 markers pass, with `markers=18 bridge=expected-next-phase pg_net=expected-next-phase`. A malformed/missing marker remains a hard failure; the phase flag must not convert unrelated parser or fixture failures into success.

### Task 4: Implement the exact legacy bridge and `pg_net` migration

**Files:**

- Create: `supabase/migrations/20260811000000_comment_translator_paid_v1_legacy_schema_bridge.sql`
- Create: `supabase/migrations/20260814105000_comment_translator_paid_pg_net_extension.sql`

- [ ] **Step 1: Create both files with the pinned CLI and exact-path rename**

Use `supabase migration new` first, then the same checked rename procedure. Do not hand-create timestamped migration paths.

- [ ] **Step 2: Implement one transactional bridge block**

Use one `DO $bridge$ ... $bridge$` block. Execute exact `set local lock_timeout = '5s'` and `set local statement_timeout = '60s'`, then take `pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('comment-translator-paid-v1-gate1-legacy-bridge', 0))`. Build sorted `jsonb_agg(... order by ...)` catalog rows for the A2-reserved Paid object set with the same null handling, array ordering, and server-definition trimming as Task 1. Embed expected values as `jsonb` constants and compare actual/expected structurally with `IS NOT DISTINCT FROM`; do not compare Node `JSON.stringify` bytes with PostgreSQL `jsonb::text`, and do not compute a cross-runtime digest inside the bridge. Node-side SHA-256 remains fixture-integrity/reporting evidence only.

State selection must be equivalent to:

```plpgsql
if v_legacy_fingerprint = v_expected_legacy then
  v_state := 'exact-legacy';
elsif v_canonical_fingerprint = v_expected_canonical
  and v_legacy_reserved_count = 0 then
  v_state := 'exact-canonical';
elsif v_a2_reserved_object_count = 0 then
  v_state := 'exact-clean';
else
  raise exception 'Gate 1 bridge state is partial, mixed, or unknown';
end if;
```

For `exact-canonical` and `exact-clean`, return without DDL after exact negative/positive checks. For `exact-legacy`, after the lock require archive absence, zero matching Paid Cron jobs, canonical identity absence, executor ownership, all three zero-row counts, RLS, the exact enabled trigger, exact internal FKs/ACLs/functions, and every named external dependency class at zero. Create `comment_translator_paid_legacy_archive`; move only the three manifest-listed tables and three exact function identities; disable the moved user trigger; revoke archive schema/object privileges from application roles; and post-verify exact archive/public state. Do not interpolate arbitrary catalog names and do not reference the six source-era tables or seven source-era functions in mutation SQL.

- [ ] **Step 3: Add the exact `pg_net` statement**

Do not pin an extension version; current Supabase changelog deprecates explicit extension version clauses. Do not add grants, function calls, or scheduler behavior.

- [ ] **Step 4: Run GREEN and inspect the diff**

Run:

```powershell
node --check scripts/comment-translator-paid-core-v1-gate1-migration-contract.mjs
node scripts/comment-translator-paid-core-v1-gate1-migration-contract.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
git diff --check
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$gate1Changed = @(
  Get-ChildItem -LiteralPath scripts/fixtures -Filter 'comment-translator-paid-core-v1-gate1-*' -File
  Get-ChildItem -LiteralPath scripts -Filter 'comment-translator-paid-core-v1-gate1-*-contract.mjs' -File
  Get-Item -LiteralPath scripts/comment-translator-paid-core-v1-gate1-catalog-contract.mjs
  Get-Item -LiteralPath scripts/comment-translator-paid-core-v1-gate1-catalog-acquire-readonly.ps1
  Get-ChildItem -LiteralPath supabase/migrations -Filter '*.sql' -File | Where-Object Name -Match '^(20260624040504|20260624141142|2026072|20260811000000|20260814105000)'
) | Sort-Object FullName -Unique
rg -n -i --pcre2 '(?:postgres(?:ql)?://[^\s]+|sb_(?:secret|publishable)_[A-Za-z0-9_-]{20,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}|Authorization\s*:\s*\S+|Bearer\s+[A-Za-z0-9_.-]{20,})' -- ($gate1Changed | ForEach-Object FullName)
if ($LASTEXITCODE -eq 1) { 'HIGH_CONFIDENCE_SECRET_MATCHES=0'; exit 0 }
exit $LASTEXITCODE
```

Expected: migration contract exit 0 with `markers=18`, `migrations=55`, `bridge-states=3`, `legacy-mutation-tables=3`, `legacy-mutation-functions=3`, `source-era-mutations=0`, and exact production/Preview/clean pending inventories; `git diff --check` exit 0; secret scan prints `HIGH_CONFIDENCE_SECRET_MATCHES=0`.

- [ ] **Step 5: Execute the database integration contract**

Implement and run `scripts/comment-translator-paid-core-v1-gate1-database-integration-contract.mjs` against disposable PostgreSQL 17/local Supabase only. Never link a remote project. Task 1 supplies the four recovered Paid-legacy production SQL bodies through a restricted external directory named by `GATE1_LEGACY_SQL_DIR`; the contract validates exact approved metadata/digests before reading them, never prints them, and fails closed when they are absent. The contract must create isolated databases and cover:

1. `clean`: execute bridge as a no-op, then replay the complete 55-migration chain.
2. `canonical`: construct exact canonical state, execute bridge as a no-op, and verify no catalog digest changes.
3. `exact-legacy`: copy the repository to a restricted temporary work directory; replace only the four Paid-legacy inert marker bodies with the four digest-validated recovered bodies so the CLI both constructs legacy state and records their production history labels; retain the remaining markers unchanged; run `supabase db reset --local --no-seed`; verify the exact four history rows, bridge archive/public post-state, and canonical continuation.
4. Negative cases, one independently constructed database per precondition: partial/mixed objects; non-empty table; wrong owner; RLS drift; ACL drift; function identity/result/config/security/definition drift; trigger absent; trigger disabled; internal-FK drift; pre-existing archive schema; canonical overload/extra canonical identity present in legacy state; malformed/extra/duplicate legacy objects; Paid Cron present; and each external dependency class. Every case must raise before DDL and retain byte-identical before/after normalized catalog JSON and equal SHA-256 digests.
5. CLI transaction/history atomicity: in another restricted temporary copied work directory, replace the same four markers with digest-validated legacy bodies and inject `raise exception 'gate1-atomicity-test'` immediately after the first move in the copied bridge. From that copied directory run `supabase db reset --local --no-seed` and require the command to fail. Query the local database with the contract's non-printed local connection context and assert legacy objects remain in `public`, archive movement is absent, and version `20260811000000` is absent from `supabase_migrations.schema_migrations`. Restore the unmodified copied bridge, rerun the exact reset command, require exit 0, and assert archive movement plus the history row are both present. Finally run `supabase migration list --local` and compare the exact 55-version list. All spawned CLI argument arrays must include `--local` where supported and must reject `--linked`, `--db-url`, `db push`, and remote project identifiers.

Run:

```powershell
node --check scripts/comment-translator-paid-core-v1-gate1-database-integration-contract.mjs
node scripts/comment-translator-paid-core-v1-gate1-database-integration-contract.mjs
```

Expected: `postgres=17 clean=pass canonical=pass legacy=pass negatives=all-pass rollback-history-atomic=pass`. Missing PostgreSQL 17/Docker/local Supabase is `SETUP_BLOCKED`, not a pass; do not install or upgrade tooling.

---

## Chunk 2: Fail-closed operator tooling and recovery contracts

### Task 5: Write operator state-machine RED tests

**Files:**

- Create: `scripts/comment-translator-paid-core-v1-gate1-operator-contract.mjs`
- Create: `scripts/comment-translator-paid-core-v1-gate1-backup-recovery-contract.mjs`
- Create: `scripts/fixtures/comment-translator-paid-core-v1-gate1-environment-inventories.json`

- [ ] **Step 1: Encode separate approval gates**

Model immutable states for source implementation, Preview apply, tooling setup, recovery cost/capacity, recovery-project provisioning, recovery region/extensions/Auth configuration, rehearsal backup/restore, final backup, bounded-RPO/watchdog acceptance, production migration apply, Vault write, inactive Cron configuration, incident source pause, pause confirmation, recovery restore, endpoint/credential cutover, client reauthentication, reopening writes, later source unpause/deletion, and activation. An approval for one state must never satisfy another.

- [ ] **Step 2: Encode exact Preview and production inventories**

Create and validate `comment-translator-paid-core-v1-gate1-environment-inventories.json` with schema `{schemaVersion,final55:[{version,name}],preview:{targetFingerprint,pending25:[{version,name}]},production:{targetFingerprint,pending33:[{version,name}]},aggregateSha256}`. Its SHA-256 input is the complete top-level object with `aggregateSha256` omitted, canonicalized by Task 1 `sortKeysDeep`; the contract recomputes it and rejects extra fields. Bootstrap inputs come from the already approved Task 1 read-only acquisition: its exact target selection emits only sanitized target fingerprint plus ordered migration version/name rows into the validated restricted temporary input, never through the new preflight adapter. Combine those rows with repository `final55` to generate this fixture once. Later preflight runs treat the fixture as authority and must equal it; they never generate or update it. Contracts require exact row-by-row equality, uniqueness, `pending25.length === 25`, `pending33.length === 33`, and both pending arrays to be exact subsets of `final55`. No count-only transition exists.

Preview may transition only after exact fingerprint selection, exact fixture `pending25` dry-run, explicit Preview approval, apply, exact `final55` readback, canonical/RPC manifest equality, archive absence, installed `pg_net`, retired source-era public objects absent, existing scheduler job ID/name/cadence/command/database/username unchanged and inactive, scheduler mutation delta 0, scoped run delta 0, and exact two-name Vault count/name/record-ID digest unchanged without value readback.

Production may transition only after exact fingerprint selection, exact fixture `pending33` dry-run, all recovery/backup gates, explicit production approval, apply, and all of these contracted readbacks: exact `final55`; installed `pg_net`, `pg_cron`, and `supabase_vault`; canonical relation/table/column/constraint digests; archive exactly three zero-row RLS tables plus three functions with disabled trigger and application-role denial; exact canonical RPC/ACL manifest; reconciler default/hard limit 50 and 120-second lease; stale-token rejection; retention default/hard limit 500 and range rejection; sanitized scheduler evidence including retry alert threshold 5; zero `PUBLIC`/`anon`/`authenticated` Paid-RPC execute privileges; exact `service_role` ACLs; HTTP/private Vault maintenance transport denial to browser roles and allowance only to `service_role`; and scoped security/performance advisor baseline/delta with no new in-scope or high/critical finding. No maintenance RPC is invoked.

- [ ] **Step 3: Encode the backup/watchdog state machine**

Require these exact states and transitions:

```js
const states = [
  "PRE_DDL_UNARMED",
  "ABORTED_NO_DDL_NO_PAUSE",
  "ARMED_BEFORE_FIRST_DDL",
  "SUCCESS_DISARMED",
  "PAUSE_REQUESTED",
  "PAUSE_CONFIRMED"
];
```

`T0` must come from `transaction_timestamp()` in the same held repeatable-read transaction that exports the snapshot used by schema/data/history dumps. Backup/checksum missing `T0+5m` transitions to `ABORTED_NO_DDL_NO_PAUSE`. Only a completed backup can arm immediately before first DDL. Failure starts pause immediately; no success by `T0+10m` starts pause; only confirmed project inaccessibility by `T0+20m` permits restore. Pending/late pause forbids restore and leaves `NO-GO`.

Test two distinct backup stages. Rehearsal is unrestricted read-only and must restore into an isolated PostgreSQL-17 target with no production endpoint. Final backup must keep the exporter transaction open until every snapshot-bound schema/data/history dump exits 0, pass the exact exported snapshot using `--snapshot` to each such `pg_dump`, capture roles separately without claiming snapshot membership, complete all SHA-256 checks by `T0+5m`, close the exporter only after dumps finish, and arm only in the last pre-DDL check immediately before the first production DDL.

Before either stage, require total Vault rows = 0, both reserved-name rows = 0, and Storage objects = 0. A nonempty Auth/Storage diff requires a separately reviewed `auth_storage_changes.sql`; absent review is a hard stop. Rehearsal verification requires exact history count/digests, aggregate table row counts, Auth schema/dependencies/user count, zero Storage objects, grants/RLS, bridge plus canonical replay, and proof that every connection target is local/disposable.

- [ ] **Step 4: Encode Vault and Cron contracts**

Vault constants are names `comment_translator_paid_maintenance_url` and `comment_translator_paid_cron_token` and advisory lock `pg_catalog.hashtextextended('comment-translator-paid-v1-gate1-vault-binding', 0)`. The owned runner is `scripts/comment-translator-paid-core-v1-gate1-vault-write.ps1`; values enter only through inherited `GATE1_VAULT_MAINTENANCE_URL` and `GATE1_VAULT_CRON_TOKEN`, while libpq connection context uses standard process environment. It invokes PostgreSQL-17 `psql --no-psqlrc --quiet --set=ON_ERROR_STOP=1` with no secret argv and feeds this fixed script on stdin with echo disabled:

```text
BEGIN;
SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('comment-translator-paid-v1-gate1-vault-binding', 0));
SELECT (count(*) = 0) AS gate1_absent FROM vault.secrets WHERE name IN ('comment_translator_paid_maintenance_url','comment_translator_paid_cron_token') \gset
\if :gate1_absent
\else
  \quit 4
\endif
\getenv gate1_url GATE1_VAULT_MAINTENANCE_URL
\getenv gate1_token GATE1_VAULT_CRON_TOKEN
SELECT vault.create_secret($1,'comment_translator_paid_maintenance_url'), vault.create_secret($2,'comment_translator_paid_cron_token');
\bind :'gate1_url' :'gate1_token'
\g
SELECT (count(*) = 2 AND count(DISTINCT name) = 2 AND count(id) = 2) AS gate1_created FROM vault.secrets WHERE name IN ('comment_translator_paid_maintenance_url','comment_translator_paid_cron_token') \gset
\if :gate1_created
  COMMIT;
\else
  \quit 5
\endif
```

Connection close on either `\quit` rolls back the open transaction. The runner captures output to fixed count/status fields, never interpolates values into SQL, and never enables statement/value logging. `comment-translator-paid-core-v1-gate1-vault-binding-integration-contract.mjs` runs the exact runner against disposable PostgreSQL-17 local Supabase with Vault installed: quote/newline/secret-shaped values commit exactly two rows in the success case; pre-existing one-name and forced post-create assertion failures commit zero new rows; argv/stdin-source logs/stdout/stderr/evidence contain no value. Missing local Supabase/Vault is `SETUP_BLOCKED`, not pass.

Cron constants are name `comment-translator-paid-maintenance`, cadence `*/5 * * * *`, command `select private.ct_paid_invoke_maintenance_from_vault();`, command SHA-256 `af78ff4c62c6f72af5902c867b254193a844764ad97154195b213a74a95e3d8c`, database `postgres`, and username `postgres`. Require scheduler process count 1 and Cloudflare fallback absent/inactive; record exact new job ID and pre-transaction maximum run-detail ID/time; immediately set `active=false` before commit; and query only that job ID after the baseline. Require exact one-row readback, `active=false` at both ends of the fixed 10-minute/two-cadence observation, and run delta 0. Direct writes to `cron.job` are forbidden; use only supported `cron.schedule`, `cron.alter_job`, and readback APIs.

- [ ] **Step 5: Run RED**

Run:

```powershell
node --check scripts/comment-translator-paid-core-v1-gate1-operator-contract.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
node --check scripts/comment-translator-paid-core-v1-gate1-backup-recovery-contract.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$operatorRed = @(& node scripts/comment-translator-paid-core-v1-gate1-operator-contract.mjs --phase red 2>&1); $operatorCode = $LASTEXITCODE
if ($operatorCode -ne 3 -or $operatorRed.Count -ne 1 -or $operatorRed[0] -ne 'RED_EXPECTED_MISSING_IMPLEMENTATION') { $operatorRed; exit 1 }
$backupRed = @(& node scripts/comment-translator-paid-core-v1-gate1-backup-recovery-contract.mjs --phase red 2>&1); $backupCode = $LASTEXITCODE
if ($backupCode -ne 3 -or $backupRed.Count -ne 1 -or $backupRed[0] -ne 'RED_EXPECTED_MISSING_IMPLEMENTATION') { $backupRed; exit 1 }
'RED_CONTRACTS=EXPECTED_FAILURE'
```

Expected: both syntax checks exit 0 and wrapper prints only `RED_CONTRACTS=EXPECTED_FAILURE`. Fixture/schema/parser/secret-safety errors make the wrapper fail.

### Task 6: Implement the sanitized read-only preflight adapter

**Files:**

- Create: `scripts/comment-translator-paid-core-v1-gate1-preflight-readonly.mjs`
- Create: `scripts/comment-translator-paid-core-v1-gate1-preflight-readonly-contract.mjs`

- [ ] **Step 1: Implement target-explicit, SELECT-only execution**

Follow the existing read-only triage runner pattern: require target kind `preview|production`, match a caller-supplied expected SHA-256 target fingerprint to the named environment-inventory fixture, and accept connection context only through process environment. Start `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY`, set `statement_timeout='30s'` and `lock_timeout='5s'`, execute only fixed SELECT/catalog/advisor commands, cap stdout and stderr independently at 1 MiB and every result set at 10,000 rows, and roll back. Print exactly one compact JSON object with schema `{schemaVersion,target,status,historyCount,historyDigest,pendingDigest,legacyDigest,sourceEraDigest,canonicalRelationsDigest,canonicalRpcAclDigest,archiveDigest,limitsDigest,schedulerEvidenceDigest,maintenanceTransportPrivilegeDigest,extensions:{pgNet,pgCron,vault},storageObjectCount,grantsRlsDigest,vault:{total,reservedNames,recordIdDigest},cron:{matching,active,jobIdDigest,commandDigest,runDelta},schedulerProcessCount,advisor:{baselineDigest,currentDigest,inScopeNew,highCriticalNew},mutationCounts:{ddl,dml,rpc,remote,total},blockedReason}`. Never print project ID, URL, DB URL, SQL body, Vault value, raw error, row value, private identifier, or token. Missing tools/context returns `status:"blocked-context-absent"`, a fixed reason enum, and all mutation counters 0.

- [ ] **Step 2: Cover all design evidence**

Read migration history; three Paid-legacy fingerprints/row counts/dependencies; six-table/seven-function source-era read-only safety manifest; canonical bridge/RPC manifest; extension status; Vault total/name counts without `decrypted_secrets`; Cron exact row/active/run counts; scheduler process count; current grants/RLS; and scoped security/performance advisor counts. Do not invoke any RPC or maintenance function.

- [ ] **Step 3: Contract the SQL allowlist and sensitive-output boundary**

Parse the runner source and reject DDL, DML, `vault.decrypted_secrets`, RPC/maintenance invocation, `cron.schedule`, `cron.alter_job`, history repair, `db push`, `apply_migration`, project pause, project creation, or deploy strings in executable paths. The complete callable SQL allowlist is `format_type`, `pg_get_expr`, `pg_get_constraintdef`, `pg_get_indexdef`, `pg_get_triggerdef`, `pg_get_functiondef`, `pg_get_userbyid`, `aclexplode`, `has_schema_privilege`, `has_table_privilege`, `has_function_privilege`, `md5`, `digest`, `encode`, `coalesce`, `lower`, `count`, `max`, `cardinality`, `octet_length`, `array_agg`, `jsonb_agg`, `jsonb_build_object`, `to_jsonb`, `unnest`, `current_setting`, `transaction_timestamp`, and `version`; every other callable name fails source validation. Schema-qualified application/private RPC calls are rejected. Fixture-run the parser against success, wrong target fingerprint, missing, duplicate, drifted, raw-error, oversized, over-row-limit, and secret-shaped outputs.

- [ ] **Step 4: Run GREEN**

Run:

```powershell
node --check scripts/comment-translator-paid-core-v1-gate1-preflight-readonly.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
node --check scripts/comment-translator-paid-core-v1-gate1-preflight-readonly-contract.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
node scripts/comment-translator-paid-core-v1-gate1-preflight-readonly-contract.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$preflightRaw = @(& node scripts/comment-translator-paid-core-v1-gate1-preflight-readonly.mjs --target production 2>&1); $preflightCode = $LASTEXITCODE
if ($preflightCode -ne 2 -or $preflightRaw.Count -ne 1) { $preflightRaw; exit 1 }
try { $preflight = $preflightRaw[0] | ConvertFrom-Json -ErrorAction Stop } catch { exit 1 }
if ($preflight.status -ne 'blocked-context-absent' -or $preflight.mutationCounts.total -ne 0) { exit 1 }
if ($preflightRaw[0] -match '(?i)(postgres(?:ql)?://|Bearer\s|sb_secret_|eyJ[A-Za-z0-9_-]{20,}\.)') { exit 1 }
'UNCONFIGURED_PREFLIGHT=EXPECTED_BLOCK'
```

Expected: both syntax checks and the contract exit 0; wrapper prints `UNCONFIGURED_PREFLIGHT=EXPECTED_BLOCK` only after proving the unconfigured run exits 2 with the exact blocked status, zero mutations, and no secret/private identifier.

### Task 7: Implement backup/recovery preflight without executing backup or pause

**Files:**

- Create: `scripts/comment-translator-paid-core-v1-gate1-backup-recovery-preflight.ps1`
- Test: `scripts/comment-translator-paid-core-v1-gate1-backup-recovery-contract.mjs`

- [ ] **Step 1: Add local tool checks**

Resolve exact local Supabase CLI path and require `2.109.0`; require Docker availability; require PostgreSQL `psql`/`pg_dump` major 17; and record exact versions/container digest labels only. Do not install tools.

- [ ] **Step 2: Add dry-run command construction**

Construct but do not run the approved sequence. First parse and snapshot the exact CLI `db dump --help` and `db diff --help` output for version `2.109.0`. Build these argument arrays, with resolved artifact paths and connection material supplied only through environment:

```text
supabase = ["db","dump","--linked","--dry-run"]
authStorageDiff = ["db","diff","--linked","--schema","auth,storage","--file",auth_storage_changes.sql]
roles = ["db","dump","--linked","--role-only","--file",roles.sql]
schema = ["--schema-only","--snapshot",snapshot,"--file",schema.sql,...reviewedSupabaseFilterArgs]
data = ["--data-only","--use-copy","--snapshot",snapshot,"--file",data.sql,...reviewedSupabaseFilterArgs]
historySchema = ["--schema-only","--schema=supabase_migrations","--snapshot",snapshot,"--file",history_schema.sql]
historyData = ["--data-only","--use-copy","--schema=supabase_migrations","--snapshot",snapshot,"--file",history_data.sql]
restoreRoles = ["--no-psqlrc","--set=ON_ERROR_STOP=1","--file",roles.sql]
restoreSchema = ["--no-psqlrc","--set=ON_ERROR_STOP=1","--file",schema.sql]
restoreAuthStorage = ["--no-psqlrc","--set=ON_ERROR_STOP=1","--file",auth_storage_changes.sql]
restoreData = ["--no-psqlrc","--set=ON_ERROR_STOP=1","--file",data.sql]
restoreHistorySchema = ["--no-psqlrc","--set=ON_ERROR_STOP=1","--file",history_schema.sql]
restoreHistoryData = ["--no-psqlrc","--set=ON_ERROR_STOP=1","--file",history_data.sql]
```

The held `psql --no-psqlrc --set=ON_ERROR_STOP=1` session executes `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SELECT transaction_timestamp(), pg_export_snapshot();`, returns `T0` and snapshot through a non-logged pipe, remains open while `schema`, `data`, `historySchema`, and `historyData` run under PostgreSQL-17 `pg_dump`, then commits only after all four exit 0. `roles` is explicitly outside the snapshot. Plain SQL restore uses the six `psql` arrays in listed order; `pg_restore --version` is checked but `pg_restore` is not used for plain-format files. Reject `--db-url`, inline URL/password, `--password`, shell interpolation, missing `--snapshot`, reordered restore, and any unsupported flag relative to pinned `--help`. The two `--linked` discovery arrays are emitted but never spawned in source-only mode; later execution requires its named read-only backup approval.

Use a caller-supplied restricted artifact directory, resolve it, reject repository/workspace/home roots and existing nonempty directories, and never echo connection material. Require preflight Vault total/reserved counts = 0 and Storage object count = 0. A nonempty Auth/Storage diff requires a present, separately reviewed `auth_storage_changes.sql` digest before any restore plan can pass. Generate SHA-256 checks and post-restore assertions for exact history digests, aggregate row counts, Auth dependencies/user count, zero Storage objects, grants/RLS, bridge/canonical replay, and local-only endpoint evidence.

- [ ] **Step 3: Add watchdog dry-run states**

Default output must be `PRE_DDL_UNARMED` and `mutation_status=not-run`. Model deadlines and exact project status checks without calling pause/provision/cutover. Distinct approval tokens are required for recovery cost/capacity, provisioning, region/extensions/Auth configuration, source pause request, confirmed source inaccessibility, restore, endpoint/credential cutover, client reauthentication, reopening writes, and later unpause/deletion. Restore state is unreachable unless the exact source fingerprint is confirmed inaccessible by `T0+20m`; requested/pending/wrong/late status remains `NO-GO`. The script must have no implicit retry, no sleep over 60 seconds, no cleanup, and no destructive path.

- [ ] **Step 4: Run the contract**

Run:

```powershell
$tokens = $null; $errors = $null
[System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path scripts/comment-translator-paid-core-v1-gate1-backup-recovery-preflight.ps1), [ref]$tokens, [ref]$errors) | Out-Null
if ($errors.Count -ne 0) { $errors; exit 1 }
node --check scripts/comment-translator-paid-core-v1-gate1-backup-recovery-contract.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
node scripts/comment-translator-paid-core-v1-gate1-backup-recovery-contract.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
pwsh -NoProfile -File scripts/comment-translator-paid-core-v1-gate1-backup-recovery-preflight.ps1 -Mode DryRun
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
```

Expected: parser and contract exit 0 with `backup-contract=pass restore-order=6 snapshot-dumps=4`; default preflight exits 0 with only sanitized `state=PRE_DDL_UNARMED mutation_status=not-run mutation_count=0`. Tool-missing fixtures pass as blocked states, unsafe artifact paths fail, and no pause/provision/restore process is spawned.

### Task 8: Write the exact operator authority

**Files:**

- Create: `docs/active/COMMENT_TRANSLATOR_PAID_V1_GATE1_PRODUCTION_SUPABASE_READINESS.md`
- Create: `scripts/comment-translator-paid-core-v1-gate1-vault-write.ps1`
- Create: `scripts/comment-translator-paid-core-v1-gate1-vault-binding-integration-contract.mjs`
- Test: `scripts/comment-translator-paid-core-v1-gate1-operator-contract.mjs`

- [ ] **Step 1: Record current evidence and source-only status**

Separate `repository-implemented`, `locally-verified`, `Preview-not-applied`, `production-not-applied`, `backup-not-run`, `Vault-not-written`, `Cron-not-configured`, `activation-closed`, and artifact identity states. Record source artifact identity as literal `UNCOMMITTED/UNKNOWN` until an actual reviewed commit exists; after commit, replace that literal with the exact commit and tree rather than retaining placeholder syntax. Never invent remote evidence.

- [ ] **Step 2: Add copy-ready approval packets**

Provide separate packets for: Preview exact `pending25` apply; Docker/PostgreSQL-17 tooling setup; recovery-project cost/capacity; recovery-project provisioning; region/extensions/Auth configuration; rehearsal backup/restore; final read-only backup; `RPO <= 20 minutes` and watchdog acceptance; production exact `pending33` apply; two-name Vault write; one inactive Cron configuration; incident source pause; source-inaccessibility confirmation; recovery restore; endpoint/credential cutover; client reauthentication; reopening writes; later source unpause/deletion; commit/push/PR; and later activation. Every packet names exact scope and exclusions, and no packet text can satisfy another state.

- [ ] **Step 3: Add exact run/readback/stop procedures**

Document local CLI `2.109.0` commands from `--help`, exact migration fixture arrays, exported-snapshot backup/restore order, rehearsal assertions, watchdog states, exact source fingerprint pause confirmation by `T0+20m`, separately approved recovery provisioning/configuration/restore/cutover/reauth/reopen sequence, manifest comparisons, scoped advisor baseline/delta, exact Vault transaction, exact Cron transaction and 10-minute observation, source-era non-mutation, rollback boundaries, and fail-closed stop conditions. Original-project unpause/deletion remains a later separate decision. Do not include credential values or commands that embed secrets in command-line arguments.

- [ ] **Step 4: Run operator contracts GREEN**

Run:

```powershell
node --check scripts/comment-translator-paid-core-v1-gate1-operator-contract.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
node scripts/comment-translator-paid-core-v1-gate1-operator-contract.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
node scripts/comment-translator-paid-core-v1-gate1-backup-recovery-contract.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
node --check scripts/comment-translator-paid-core-v1-gate1-vault-binding-integration-contract.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
node scripts/comment-translator-paid-core-v1-gate1-vault-binding-integration-contract.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
```

Expected: all commands exit 0 with `operator-contract=pass approval-states=isolated remote-calls=0 mutations=0`, `backup-contract=pass`, and `vault-binding-integration=pass success-rows=2 rollback-rows=0 secret-output=0`; no source-only path performs a remote call or mutation. A missing local Supabase/Vault integration environment is reported only as `SETUP_BLOCKED` and prevents a full local-integration PASS.

---

## Chunk 3: Documentation, root verification, and implementation handoff

### Task 9: Update active authority without broad history churn

**Files:**

- Modify: `docs/active/COMMENT_TRANSLATOR_PAID_V1_RUNBOOK.md`
- Modify: `task.md`

- [ ] **Step 1: Link the new Gate 1 authority from the runbook**

Add only the minimum section necessary to route operators to the new document. Preserve Task 11 closed evidence and state explicitly that source readiness does not prove Preview/production apply, backup, Vault, Cron, deploy, or activation.

- [ ] **Step 2: Add one concise task status entry**

Do not write the final `task.md` status yet. Prepare the exact one-line shape with branch, source scope, `verification=pending-review`, and remaining approval gates only for the documentation contract fixture; Task 11 writes the real line after root verification and independent review succeed. This prevents a premature or stale `locally-verified` claim.

- [ ] **Step 3: Run documentation contracts**

The operator contract must assert the runbook/task markers and reject stale claims such as `GO`, `production-applied`, `backup-pass`, `Vault-configured`, or `Cron-configured` before external evidence exists.

### Task 10: Root-owned verification

**Files:** verify every changed file; do not modify unrelated files.

- [ ] **Step 1: Run focused syntax and contracts**

```powershell
$gate1Node = @(
  'scripts/comment-translator-paid-core-v1-gate1-catalog-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate1-migration-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate1-database-integration-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate1-operator-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate1-preflight-readonly.mjs',
  'scripts/comment-translator-paid-core-v1-gate1-preflight-readonly-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate1-backup-recovery-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate1-vault-binding-integration-contract.mjs'
)
foreach ($file in $gate1Node) { node --check $file; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }

$gate1Contracts = @(
  'scripts/comment-translator-paid-core-v1-gate1-catalog-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate1-migration-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate1-preflight-readonly-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate1-backup-recovery-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate1-operator-contract.mjs'
)
foreach ($file in $gate1Contracts) { node $file; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }

foreach ($file in @('scripts/comment-translator-paid-core-v1-gate1-database-integration-contract.mjs','scripts/comment-translator-paid-core-v1-gate1-vault-binding-integration-contract.mjs')) {
  $result = @(& node $file 2>&1); $code = $LASTEXITCODE
  if ($code -eq 0) { continue }
  if ($code -eq 2 -and $result.Count -eq 1 -and $result[0] -match '^SETUP_BLOCKED:') { $result; continue }
  $result; exit 1
}

$gate1PowerShell = @(
  'scripts/comment-translator-paid-core-v1-gate1-catalog-acquire-readonly.ps1',
  'scripts/comment-translator-paid-core-v1-gate1-backup-recovery-preflight.ps1',
  'scripts/comment-translator-paid-core-v1-gate1-vault-write.ps1'
)
foreach ($file in $gate1PowerShell) {
  $tokens=$null; $errors=$null
  [System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path $file),[ref]$tokens,[ref]$errors) | Out-Null
  if ($errors.Count -ne 0) { $errors; exit 1 }
}

$acquireRaw = @(& pwsh -NoProfile -File scripts/comment-translator-paid-core-v1-gate1-catalog-acquire-readonly.ps1 -Mode DryRun 2>&1); $acquireCode=$LASTEXITCODE
if ($acquireCode -ne 0 -or $acquireRaw.Count -ne 1) { $acquireRaw; exit 1 }
$acquire = $acquireRaw[0] | ConvertFrom-Json
$acquireKeys = @($acquire.PSObject.Properties.Name | Sort-Object)
if (Compare-Object @('legacyBodiesWritten','mutationCount','status') $acquireKeys) { exit 1 }
if ($acquire.status -ne 'not-run' -or $acquire.mutationCount -ne 0 -or $acquire.legacyBodiesWritten -ne 0) { exit 1 }

$backupRaw = @(& pwsh -NoProfile -File scripts/comment-translator-paid-core-v1-gate1-backup-recovery-preflight.ps1 -Mode DryRun 2>&1); $backupCode=$LASTEXITCODE
if ($backupCode -ne 0 -or $backupRaw.Count -ne 1 -or $backupRaw[0] -ne 'state=PRE_DDL_UNARMED mutation_status=not-run mutation_count=0') { $backupRaw; exit 1 }

$vaultRaw = @(& pwsh -NoProfile -File scripts/comment-translator-paid-core-v1-gate1-vault-write.ps1 -Mode Preflight 2>&1); $vaultCode=$LASTEXITCODE
if ($vaultCode -ne 2 -or $vaultRaw.Count -ne 1) { $vaultRaw; exit 1 }
$vault = $vaultRaw[0] | ConvertFrom-Json
if (Compare-Object @('mutationCount','status') @($vault.PSObject.Properties.Name | Sort-Object)) { exit 1 }
if ($vault.status -ne 'blocked-approval-absent' -or $vault.mutationCount -ne 0) { exit 1 }

$preflightRaw = @(& node scripts/comment-translator-paid-core-v1-gate1-preflight-readonly.mjs --target production 2>&1); $preflightCode=$LASTEXITCODE
if ($preflightCode -ne 2 -or $preflightRaw.Count -ne 1) { $preflightRaw; exit 1 }
$preflight = $preflightRaw[0] | ConvertFrom-Json
$preflightKeys = @('advisor','archiveDigest','blockedReason','canonicalRelationsDigest','canonicalRpcAclDigest','cron','extensions','grantsRlsDigest','historyCount','historyDigest','legacyDigest','limitsDigest','maintenanceTransportPrivilegeDigest','mutationCounts','pendingDigest','schedulerEvidenceDigest','schedulerProcessCount','schemaVersion','sourceEraDigest','status','storageObjectCount','target','vault') | Sort-Object
if (Compare-Object $preflightKeys @($preflight.PSObject.Properties.Name | Sort-Object)) { exit 1 }
if (Compare-Object @('pgCron','pgNet','vault') @($preflight.extensions.PSObject.Properties.Name | Sort-Object)) { exit 1 }
if (Compare-Object @('recordIdDigest','reservedNames','total') @($preflight.vault.PSObject.Properties.Name | Sort-Object)) { exit 1 }
if (Compare-Object @('active','commandDigest','jobIdDigest','matching','runDelta') @($preflight.cron.PSObject.Properties.Name | Sort-Object)) { exit 1 }
if (Compare-Object @('baselineDigest','currentDigest','highCriticalNew','inScopeNew') @($preflight.advisor.PSObject.Properties.Name | Sort-Object)) { exit 1 }
if (Compare-Object @('ddl','dml','remote','rpc','total') @($preflight.mutationCounts.PSObject.Properties.Name | Sort-Object)) { exit 1 }
if ($preflight.status -ne 'blocked-context-absent' -or $preflight.mutationCounts.total -ne 0) { exit 1 }
$allEntryOutput = ($acquireRaw + $backupRaw + $vaultRaw + $preflightRaw) -join "`n"
if ($allEntryOutput -match '(?i)(postgres(?:ql)?://[^\s]+|Authorization\s*:\s*\S+|Bearer\s+[A-Za-z0-9_.-]{20,}|sb_(?:secret|publishable)_[A-Za-z0-9_-]{20,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,})') { exit 1 }
```

Expected: all source/fixture contracts PASS; acquisition and backup dry runs return sanitized `not-run`; Vault and read-only entry points return the exact blocked statuses with zero mutation; integration checks either PASS or emit one sanitized `SETUP_BLOCKED:` line and exit 2. Any setup block prevents claiming full PostgreSQL integration coverage and is reported precisely rather than converted to PASS.

- [ ] **Step 2: Run existing Paid and Supabase regression bundles**

Use this exact ordered 53-file inventory; missing, duplicate, or additional matched files fail before execution:

```powershell
$expectedRegression = @(
  'scripts/comment-translator-paid-core-v1-concurrency-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate0a-billing-lifecycle-entitlement-rpc-behavior-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate0a-capacity-read-repair-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate0a-checkout-expiry-finalize-lease-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate0a-checkout-recovery-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate0a-function-privilege-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate0a-legacy-expiry-compatibility-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate0a-lifecycle-read-repair-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate0a-poll-budget-repair-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate0a-recovery-floor-second-canonicalization-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate0a-recovery-window-floor-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate0a-stripe-failure-diagnostic-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate0a-tax-location-minimization-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate0a-unbound-hold-recovery-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate0a2-migration-history-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate1-backup-recovery-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate1-catalog-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate1-database-integration-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate1-migration-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate1-operator-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate1-preflight-readonly-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate1-vault-binding-integration-contract.mjs',
  'scripts/comment-translator-paid-core-v1-migration-parser-contract.mjs',
  'scripts/comment-translator-paid-core-v1-schema-contract.mjs',
  'scripts/comment-translator-paid-core-v1-store-contract.mjs',
  'scripts/comment-translator-paid-core-v1-stripe-checkout-customer-selector-contract.mjs',
  'scripts/comment-translator-paid-core-v1-task10-legal-security-contract.mjs',
  'scripts/comment-translator-paid-core-v1-task11-local-load-fixture-contract.mjs',
  'scripts/comment-translator-paid-core-v1-task11-postgres-runtime-repair-contract.mjs',
  'scripts/comment-translator-paid-core-v1-task11-preview-load-harness-contract.mjs',
  'scripts/comment-translator-paid-core-v1-task11-tax-checkout-policy-contract.mjs',
  'scripts/comment-translator-paid-core-v1-task4-behavioral-contract.mjs',
  'scripts/comment-translator-paid-core-v1-task4-capacity-consent-fixtures-contract.mjs',
  'scripts/comment-translator-paid-core-v1-task4-checkout-policy-contract.mjs',
  'scripts/comment-translator-paid-core-v1-task5-usage-cost-contract.mjs',
  'scripts/comment-translator-paid-core-v1-task6-provider-contract.mjs',
  'scripts/comment-translator-paid-core-v1-task7-session-contract.mjs',
  'scripts/comment-translator-paid-core-v1-task8-ui-contract.mjs',
  'scripts/comment-translator-paid-core-v1-task9-retention-contract.mjs',
  'scripts/comment-translator-paid-core-v1-webhook-contract.mjs',
  'scripts/comment-translator-supabase-current-grant-drift-readonly-triage-contract.mjs',
  'scripts/comment-translator-supabase-current-grant-remediation-apply-preflight-contract.mjs',
  'scripts/comment-translator-supabase-current-grant-remediation-approval-preflight-contract.mjs',
  'scripts/comment-translator-supabase-default-privileges-guard-contract.mjs',
  'scripts/comment-translator-supabase-default-privileges-managed-owner-blocker-contract.mjs',
  'scripts/comment-translator-supabase-default-privileges-owner-specific-remediation-preflight-contract.mjs',
  'scripts/comment-translator-supabase-default-privileges-permission-capable-apply-contract.mjs',
  'scripts/comment-translator-supabase-default-privileges-privileged-apply-path-preflight-contract.mjs',
  'scripts/comment-translator-supabase-default-privileges-remediation-apply-contract.mjs',
  'scripts/comment-translator-supabase-default-privileges-remediation-execution-preflight-contract.mjs',
  'scripts/comment-translator-supabase-default-privileges-remote-remediation-approval-contract.mjs',
  'scripts/comment-translator-supabase-default-privileges-risk-acceptance-contract.mjs',
  'scripts/comment-translator-supabase-default-privileges-support-pending-contract.mjs'
)
$actualRegression = @(rg --files scripts | rg 'comment-translator-paid-core-v1-.*-contract\.mjs$|comment-translator-paid.*migration.*contract\.mjs$|default.*privilege.*contract\.mjs$|grant.*contract\.mjs$' | ForEach-Object { $_ -replace '\\','/' } | Sort-Object -Unique)
if ($expectedRegression.Count -ne 53 -or (Compare-Object $expectedRegression $actualRegression)) { Compare-Object $expectedRegression $actualRegression; exit 1 }
foreach ($file in $expectedRegression) {
  $result = @(& node $file 2>&1); $code = $LASTEXITCODE
  if ($code -eq 0) { continue }
  if ($code -eq 2 -and $result.Count -eq 1 -and $result[0] -match '^SETUP_BLOCKED:') { $result; continue }
  $result; exit 1
}
```

Expected: exact count 53 and every runnable contract PASS. A single sanitized `SETUP_BLOCKED:` result is recorded precisely and is not called a pass; any other nonzero exit fails immediately.

- [ ] **Step 3: Run repository checks**

```powershell
.\node_modules\.bin\tsc.cmd --noEmit --pretty false
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run lint
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npm run build:cloudflare
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
git diff --check
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
```

The approved specification requires production build evidence because executable operator scripts are changed, even though application runtime imports are untouched. Expected: TypeScript PASS, lint 0 errors with no new warnings, Next production build PASS, Cloudflare build PASS, and diff check PASS. Node and PowerShell syntax checks are already exhaustive in Step 1.

- [ ] **Step 4: Run security/scope checks**

Run against the exact implementation delta from the handoff commit recorded in `GATE1_HANDOFF_HEAD`:

```powershell
if (-not $env:GATE1_HANDOFF_HEAD) { exit 1 }
$expectedChanged = @(
  'docs/active/COMMENT_TRANSLATOR_PAID_V1_GATE1_PRODUCTION_SUPABASE_READINESS.md',
  'docs/active/COMMENT_TRANSLATOR_PAID_V1_RUNBOOK.md',
  'task.md',
  'scripts/fixtures/comment-translator-paid-core-v1-gate1-production-history.json',
  'scripts/fixtures/comment-translator-paid-core-v1-gate1-paid-legacy-catalog.json',
  'scripts/fixtures/comment-translator-paid-core-v1-gate1-source-era-catalog.json',
  'scripts/fixtures/comment-translator-paid-core-v1-gate1-bridge-states.json',
  'scripts/fixtures/comment-translator-paid-core-v1-gate1-canonical-rpc.json',
  'scripts/fixtures/comment-translator-paid-core-v1-gate1-environment-inventories.json',
  'scripts/fixtures/comment-translator-paid-core-v1-gate1-catalog-readonly.sql',
  'scripts/comment-translator-paid-core-v1-gate1-catalog-acquire-readonly.ps1',
  'scripts/comment-translator-paid-core-v1-gate1-catalog-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate1-migration-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate1-database-integration-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate1-operator-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate1-preflight-readonly.mjs',
  'scripts/comment-translator-paid-core-v1-gate1-preflight-readonly-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate1-backup-recovery-preflight.ps1',
  'scripts/comment-translator-paid-core-v1-gate1-backup-recovery-contract.mjs',
  'scripts/comment-translator-paid-core-v1-gate1-vault-write.ps1',
  'scripts/comment-translator-paid-core-v1-gate1-vault-binding-integration-contract.mjs',
  'supabase/migrations/20260624040504_comment_translator_real_comments_feed_snapshots.sql',
  'supabase/migrations/20260624141142_account_display_timezone_preference.sql',
  'supabase/migrations/20260722000000_comment_translator_paid_entitlements.sql',
  'supabase/migrations/20260722001000_comment_translator_paid_usage_counters.sql',
  'supabase/migrations/20260722002000_comment_translator_obs_overlay_tokens.sql',
  'supabase/migrations/20260722003000_comment_translator_obs_overlay_browser_sessions.sql',
  'supabase/migrations/20260723000000_comment_translator_moderator_share_tokens.sql',
  'supabase/migrations/20260723001000_comment_translator_moderator_share_browser_sessions.sql',
  'supabase/migrations/20260723002000_comment_translator_custom_dictionary.sql',
  'supabase/migrations/20260723003000_comment_translator_creator_history.sql',
  'supabase/migrations/20260726111154_comment_translator_paid_entitlements.sql',
  'supabase/migrations/20260728135736_comment_translator_paid_usage_counters.sql',
  'supabase/migrations/20260728142220_comment_translator_obs_overlay_tokens.sql',
  'supabase/migrations/20260728145324_comment_translator_obs_overlay_browser_sessions.sql',
  'supabase/migrations/20260728160206_comment_translator_moderator_share_tokens.sql',
  'supabase/migrations/20260728164122_comment_translator_moderator_share_browser_sessions.sql',
  'supabase/migrations/20260728172220_comment_translator_custom_dictionary.sql',
  'supabase/migrations/20260729035621_comment_translator_creator_history.sql',
  'supabase/migrations/20260811000000_comment_translator_paid_v1_legacy_schema_bridge.sql',
  'supabase/migrations/20260814105000_comment_translator_paid_pg_net_extension.sql'
)
$nameStatus = @(git diff --name-status $env:GATE1_HANDOFF_HEAD --)
if ($nameStatus | Where-Object { $_ -match '^(?:D\s|R\d+\s|C\d+\s)' }) { $nameStatus; exit 1 }
$changedFiles = @(
  git diff --name-only $env:GATE1_HANDOFF_HEAD --
  git ls-files --others --exclude-standard
) | ForEach-Object { $_ -replace '\\','/' } | Sort-Object -Unique
if (Compare-Object ($expectedChanged | Sort-Object) $changedFiles) { Compare-Object ($expectedChanged | Sort-Object) $changedFiles; exit 1 }
if ($changedFiles -match '(^|/)(package(-lock)?\.json|pnpm-lock\.yaml|yarn\.lock)$') { exit 1 }

$absoluteChanged = @($changedFiles | ForEach-Object { (Resolve-Path -LiteralPath $_).Path })
rg -n -i --pcre2 '(?:postgres(?:ql)?://[^\s]+|sb_(?:secret|publishable)_[A-Za-z0-9_-]{20,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}|Authorization\s*:\s*\S+|Bearer\s+[A-Za-z0-9_.-]{20,})' -- $absoluteChanged
if ($LASTEXITCODE -eq 0) { exit 1 } elseif ($LASTEXITCODE -ne 1) { exit $LASTEXITCODE }

$migrationFiles = @($changedFiles | Where-Object { $_ -like 'supabase/migrations/*.sql' } | ForEach-Object { (Resolve-Path -LiteralPath $_).Path })
rg -n -i --pcre2 '\b(drop\s+(?:schema|table|function)|truncate\b|delete\s+from\b|insert\s+into\b|update\s+cron\.job\b|delete\s+from\s+cron\.job\b|insert\s+into\s+cron\.job\b)' -- $migrationFiles
if ($LASTEXITCODE -eq 0) { exit 1 } elseif ($LASTEXITCODE -ne 1) { exit $LASTEXITCODE }

node scripts/comment-translator-paid-core-v1-gate1-migration-contract.mjs --phase security-scope
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
node scripts/comment-translator-paid-core-v1-gate1-operator-contract.mjs --phase source-only-scope
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
```

Expected: changed-path allowlist exact; zero secret/DB URL/token hits; zero forbidden destructive DML/DDL or direct `cron.job` writes. Intentional bridge operations are permitted only when the migration contract prints `security-scope=pass destructive=0 direct-cron-writes=0 source-era-mutations=0 bridge-allowlist=pass`; the operator contract prints `remote-calls=0 mutations=0`. Exactly 55 unique migrations is asserted by the migration contract, and package/lock changes are zero.

- [ ] **Step 5: Inspect actual diff**

Before inspection, fail closed on workspace drift:

```powershell
$root = (git rev-parse --show-toplevel) -replace '\\','/'
$branch = git branch --show-current
$head = git rev-parse HEAD
if ($root -ne (($env:GATE1_IMPLEMENTATION_ROOT) -replace '\\','/')) { exit 1 }
if ($branch -ne $env:GATE1_IMPLEMENTATION_BRANCH) { exit 1 }
git merge-base --is-ancestor a275174dc6494a8d159f1fff30318c05fece0107 $head
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
git merge-base --is-ancestor $env:GATE1_HANDOFF_HEAD $head
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
git status --short --branch
git diff --stat $env:GATE1_HANDOFF_HEAD --
git diff --name-status $env:GATE1_HANDOFF_HEAD --
git diff --check $env:GATE1_HANDOFF_HEAD --
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
```

Root owner must inspect the substantive SQL/runner/document diffs and rerun the Step 4 changed-path allowlist against this same handoff head. Expected dirty state consists only of the exact allowed implementation paths; delegated reports are claims, not acceptance evidence.

### Task 11: Independent implementation review and bounded repair

**Files:** review-only unless a bounded repair is explicitly listed.

- [ ] **Step 1: Run `sol-reviewer / medium` read-only review**

Review against the approved spec and this plan. Require findings by severity for migration semantics, state fingerprints, RLS/ACL/security-definer posture, source-era non-mutation, approval isolation, backup/watchdog correctness, secret handling, and verification coverage.

- [ ] **Step 2: Route only listed corrections to `sol-repairer / medium`**

The repairer may edit only files named by the reviewer and may not redefine the spec or perform external actions. After repair, root reruns focused and affected regression checks and re-inspects the diff. Then the same read-only `sol-reviewer / medium` must re-review the repaired diff against every listed finding; repeat bounded repair/re-review only for explicit residual findings, and prohibit acceptance while any material finding remains.

- [ ] **Step 3: Record final acceptance status**

Only after root verification and the final independent review report no material finding, update `task.md` with the prepared one-line status using the exact branch, `repository-implemented`, and remaining approval gates. If any required PostgreSQL-17/database/Vault integration is `SETUP_BLOCKED`, record the exact blocker but do not write `locally-verified`, do not accept source readiness, and do not complete this plan. Rerun the documentation contract after this edit, then mandatorily rerun Task 10 Steps 4 and 5 against the final post-repair/post-status diff immediately before Task 12 Step 1 reporting. Source completion may be reported only when all required integration checks PASS and the final state is `locally-verified`. Gate 1 remains `NO-GO` until later Preview, backup/recovery, production, Vault, and inactive Cron approvals execute and pass.

### Task 12: Stop at the Git publication approval boundary

- [ ] **Step 1: Present the verified source diff and checks to the user**

Only after the mandatory final Task 10 Steps 4 and 5 rerun passes on the post-review/post-`task.md` state, report exact branch/worktree, changed files, checks, known warnings, and remaining external gates. Any integration `SETUP_BLOCKED` is reported as incomplete work rather than source completion. Do not commit implementation changes, push, create a PR, merge, deploy, or clean the worktree without the matching user approval. The existing design commits remain local history and do not authorize publication of implementation changes.

- [ ] **Step 2: After explicit commit/push/PR approval only**

Immediately before publication, rerun the Task 10 Step 5 root/branch/base/handoff ancestry checks, the Task 10 Step 4 changed-path allowlist, `git diff --check`, and `git status --short --branch`; stop on any drift or new path. Then, and only under explicit commit/push/PR approval, commit the reviewed implementation with a scoped message, verify the new commit remains on `GATE1_IMPLEMENTATION_BRANCH` and descends from both approved base and `GATE1_HANDOFF_HEAD`, push that exact `codex/` feature branch, create a PR targeting `codex/comment-translator-paid-v1-preview`, and report CI/mergeability without merging. Production and Preview database operations remain separately blocked.

---

## Completion boundary for this plan

This implementation plan is complete only when the source migrations, manifests, contracts, preflight tooling, and operator authority are independently reviewed and all required local PostgreSQL-17/database/Vault integration checks PASS with no `SETUP_BLOCKED` scope. It does **not** make Gate 1 item 1 `GO`. The real goal remains active until the separately approved Preview apply, backup/recovery readiness, production migration, Vault write, inactive Cron configuration, and exact readback all pass with no contradictory evidence.
