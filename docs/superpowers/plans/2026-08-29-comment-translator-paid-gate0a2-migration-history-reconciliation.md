# Comment Translator Paid Core v1 Gate 0-A2 Migration History Reconciliation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents are available) or superpowers:executing-plans to implement this plan. This is a verified `gpt-5.6-luna / max` implementation parent task. The only implementation writer lane is `luna-implementer / max`; reviews use `sol-reviewer / medium`, and listed repairs use `sol-repairer / medium`. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the source-controlled canonical source for the already-applied remote-only Cron/Vault transport migration and contract the complete local/remote history reconciliation without changing historical migrations or applying anything remotely.

**Architecture:** Keep the new migration additive and exact to the seven observed remote statements. Put timestamp/name reconciliation, clean-install versus already-applied Preview sequencing, allowlisted additive migrations, and fail-closed operator stops in a focused Node contract plus one active operator document. No application code, dependency, or historical migration changes are in scope.

**Tech Stack:** PostgreSQL/PLpgSQL migration source, Node.js source contracts, Supabase CLI operator procedure, PowerShell verification.

---

## Chunk 1: Evidence and implementation boundary

### Task 1: Freeze the read-only reconciliation evidence

**Files:**
- Verify only: `supabase/migrations/*.sql`, existing Paid Core contracts, active Paid Core spec/task breakdown/runbook.

- [x] Confirm the dedicated worktree is on the `codex/` A2 branch from `origin/codex/comment-translator-paid-v1-preview`.
- [x] Freeze the already-observed counts: union 42, matched 18, local-only 15, remote-only 9; Paid local-only 10 and Paid remote-only 9.
- [x] Freeze these exact noncanonical mappings: `20260818100000_comment_translator_paid_gate0a_poll_budget_rpc_repair` <- remote `20260818074643_comment_translator_paid_gate0a_poll_budget_rpc_repair`; `20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair` <- remote `20260819032701_20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair`; `20260819110000_comment_translator_paid_gate0a_capacity_read_repair` <- remote `20260819040046_20260819110000_comment_translator_paid_gate0a_capacity_read_repair`; `20260823120000_comment_translator_paid_gate0a_unbound_hold_recovery` <- remote `20260823035028_comment_translator_paid_gate0a_unbound_hold_recovery`; `20260823130000_comment_translator_paid_gate0a_schedule_function_privilege_repair` <- remote `20260823040930_comment_translator_paid_gate0a_schedule_function_privilege_repair`; `20260826100000_comment_translator_paid_gate0a_checkout_recovery_window_floor` <- remote `20260826072327_comment_translator_paid_gate0a_checkout_recovery_window_floor`; `20260826110000_comment_translator_paid_gate0a_recovery_floor_second_canonicalization` <- remote `20260826141718_comment_translator_paid_gate0a_recovery_floor_second_canonicalization`; `20260827020609_comment_translator_paid_checkout_expiry_finalize_lease` <- remote `20260827024331_comment_translator_paid_checkout_expiry_finalize_lease`.
- [x] Freeze the same-version source match `20260815090000_comment_translator_paid_cron_vault_transport`, and the genuinely absent remote migrations `20260813135500_comment_translator_paid_task6_azure_uncertain_retry_compatibility` and `20260829100000_comment_translator_paid_task6_azure_uncertain_retry_guard_repair`.
- [x] Use the already-observed catalog-only evidence as an input; do not make a new remote call in this source-only implementation. Any future remote read or mutation belongs to the separately approved operator procedure. Never read or save Vault values, URLs, tokens, private project/account identifiers, raw payloads, or raw errors.

### Task 2: Read-only plan review

- [x] Ask `sol-reviewer / medium` to review this plan against the approved A2 objective, with no source edits or remote actions.
- [x] Resolve only plan-scope findings before implementation; do not broaden the file set or approval boundary.

## Chunk 2: TDD source and contract

### Task 3: Add the focused reconciliation contract first

**Files:**
- Create: `scripts/comment-translator-paid-core-v1-gate0a2-migration-history-contract.mjs`

- [x] Assert the new migration source exists, is syntactically balanced, has exactly seven top-level statements, and contains only the expected schema/function/ACL/comment statements.
- [x] Embed and compare against this fixed seven-statement canonical fixture (after only line-ending/outer-whitespace normalization), including the exact comment text; do not let the implementation under test define its own expected SQL:

```sql
-- Comment Translator Paid Core v1: runtime-only Supabase Cron secret transport.
-- This migration creates no scheduler and stores no secret values.

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create or replace function private.ct_paid_invoke_maintenance_from_vault()
returns void
language plpgsql
security definer
set search_path = pg_catalog, private, vault
as $$
declare
    v_maintenance_url_count integer;
    v_cron_token_count integer;
    v_maintenance_url text;
    v_cron_token text;
begin
    select
      count(*) filter (
        where name = 'comment_translator_paid_maintenance_url'
      )::integer,
      count(*) filter (
        where name = 'comment_translator_paid_cron_token'
      )::integer,
      max(decrypted_secret) filter (
        where name = 'comment_translator_paid_maintenance_url'
      ),
      max(decrypted_secret) filter (
        where name = 'comment_translator_paid_cron_token'
      )
      into
        v_maintenance_url_count,
        v_cron_token_count,
        v_maintenance_url,
        v_cron_token
      from vault.decrypted_secrets
     where name in (
       'comment_translator_paid_maintenance_url',
       'comment_translator_paid_cron_token'
     );

    if v_maintenance_url_count <> 1
      or v_cron_token_count <> 1
      or v_maintenance_url is null
      or pg_catalog.btrim(v_maintenance_url) = ''
      or v_cron_token is null
      or pg_catalog.btrim(v_cron_token) = ''
    then
      raise exception 'paid maintenance secret references are not configured';
    end if;

    perform public.ct_paid_invoke_maintenance_http(
      v_maintenance_url,
      v_cron_token,
      'supabase-cron'
    );
end;
$$;

revoke all on function private.ct_paid_invoke_maintenance_from_vault()
  from public, anon, authenticated, service_role;
grant execute on function private.ct_paid_invoke_maintenance_from_vault()
  to service_role;

comment on function private.ct_paid_invoke_maintenance_from_vault() is
  'Paid maintenance transport contract: read the two named Vault references only at invocation time, delegate to the existing supabase-cron HTTP RPC, and never return or log secret values, URLs, request IDs, or scheduler payloads. No Cron job is created by this migration.';
```

- [x] Assert the source has no scheduler creation, scheduler alteration, Vault secret creation/update, HTTP literal, token value/header, private identifier, destructive DDL, or unrelated statement.
- [x] Assert the source function has the fixed `pg_catalog, private, vault` search path, `SECURITY DEFINER`, the two stable Vault reference names, count/null/blank guards, the existing HTTP RPC delegation, and service-role-only execute.
- [x] Encode the complete observed local 33-entry and remote 27-entry version/name inventories, derive the required 42/18/15/9 and Paid 10/9 counts, and assert the exact eight timestamp/name mappings plus the two absent migrations above. The contract must fail if an item is swapped while aggregate counts remain unchanged.
- [x] Encode a state machine for both operator paths: clean install performs no history repair and expects all canonical local migrations once; already-applied Preview must collect and externally revalidate one explicit sanitized envelope containing all eight pair semantic/privilege/owner/lease evidence records before the first history-only operation, persist `pairEvidenceVerified`, retain per-pair checks, perform only the eight paired history-only repairs, then expect exactly the two absent Paid migrations pending and apply them in `20260813135500` then `20260829100000` order. Missing, wrong-count, duplicate, mismatched, unverified, failed, or uncertain evidence stops with zero history mutation. Deterministic fixtures are explicit `not-live` source-contract evidence only and cannot satisfy the stricter fresh external read-only operator provenance requirement.
- [x] Assert the operator sequence forbids blind `db push`, uses a dry-run plus an explicit two-file allowlist for the additive step, performs history-only repair before additive apply, and makes `additive-complete` and `clean-install-complete` intermediate states. Require an explicit successful, complete, exact sanitized post-apply read-only-check observation to reach final `post-apply-read-only-check`; missing, failed, uncertain, incomplete, duplicate, or mismatched post-checks stop without changing SQL/history/operation counts.
- [x] Run the focused contract and record RED because the new migration source is not present. RED observed: the focused command exited 1 at the missing canonical source assertion (`false !== true`) before the source was added.

### Task 4: Add the exact canonical source

**Files:**
- Create: `supabase/migrations/20260815090000_comment_translator_paid_cron_vault_transport.sql`

- [x] Add exactly the seven observed statements: private schema creation, schema revoke, service-role schema grant, private zero-argument Vault transport function, function revoke, service-role execute grant, and the exact sanitized function comment.
- [x] Preserve the observed body semantic MD5 `ee28c4f97fb47ab70e0ae48248e56693` and do not add a scheduler, secret value, URL, private identifier, or unrelated SQL.
- [x] Run the focused contract and confirm GREEN. GREEN observed: `node --check ...` and the focused contract both exited 0 with `PASS`, seven-statement/body/function/source-hash evidence, and 42/18/15/9 plus Paid 10/9.
- [x] Verify all historical migrations are byte-for-byte unchanged and no package, lockfile, config, or unrelated source file changed.

## Chunk 3: Operator contract and root verification

### Task 5: Write the active operator contract

**Files:**
- Create: `docs/active/COMMENT_TRANSLATOR_PAID_V1_GATE0A2_MIGRATION_HISTORY_RECONCILIATION.md`
- Update: `task.md` with one concise A2 status entry only.

- [x] Separate `repository-implemented`, `locally-verified`, `externally-unverified`, and `ARTIFACT_IDENTITY=UNKNOWN` states.
- [x] Document clean-install ordering with no history repair; all eight pair semantic/privilege/owner/lease evidence records externally revalidated before the first Preview history operation; deterministic fixtures as `not-live` source-contract evidence only; Preview repair as `reverted(remote_version)` then `applied(local_version)` for the eight fixed pairs only; a dry-run and explicit allowlist containing only the two absent Task 6 migrations in chronological order; expected history after each phase; explicit post-apply checks as the required final state for both paths; partial-failure stop and recovery; rollback/stop conditions; and the separate approval required for every remote history repair/apply.
- [x] Record the source full hash after the source file exists, the semantic hash evidence, statement inventory, remote catalog ACL evidence, and the fact that Vault values were not read.

### Task 6: Root-owned verification and review

**Files:**
- Verify only: all changed files.

- [x] Run the focused RED/GREEN evidence, all 29 Paid Core contracts with a count assertion, provider legal copy, Node/migration syntax, TypeScript, lint, Next build, OpenNext Cloudflare build, secret/private-identifier scan, type-suppression scan, and `git diff --check`. Focused/Node/legal/29-contract/scan/diff checks pass; TypeScript, lint, Next, and OpenNext are setup-blocked because dependencies are absent, with no installation performed.
- [x] Treat absent dependencies/tools as setup-blocked without installing anything or changing manifests/lockfiles.
- [x] Ask `sol-reviewer / medium` for read-only spec review and then code-quality review. Both final reviews are GO after bounded `sol-repairer / medium` corrections; the implementation writer remains `luna-implementer / max` under this verified Luna Max parent.
- [x] Confirm the final diff is A2-only, commit the feature branch, push it, and create PR #799 without merging or performing remote Supabase/Cloudflare/Stripe/Provider/browser operations.

### Verification record (current)

- Focused TDD RED: `node scripts/comment-translator-paid-core-v1-gate0a2-migration-history-contract.mjs` exited 1 before the migration source existed, failing the canonical-source existence assertion (`false !== true`).
- Focused GREEN/root rerun: `node --check scripts/comment-translator-paid-core-v1-gate0a2-migration-history-contract.mjs` and the focused contract exited 0. The output includes the seven-statement/body/function/source SHA-256 evidence, 42/18/15/9 and Paid 10/9, complete external-envelope/capability/ACL/scheduler checks, ordered Task 6 Azure fallback post-apply semantic/ACL/owner/security/provider-boundary checks, and zero-operation/zero-SQL stop regressions.
- Scheduler post-check contract: Preview preserves the observed one-job inactive baseline with all scheduler operation deltas at zero; isolated-empty clean-install expects zero inactive jobs with the same zero-operation deltas.
- Existing Paid Core bundle: 29 files were counted; 24/29 runnable contracts passed and 5/29 were setup-blocked because `node_modules/typescript` is absent. No dependency installation was performed.
- Provider legal copy contract passed. The scoped secret/private-identifier scan covered the four new files plus task.md additions only and found zero hits; changed TypeScript files were zero with zero type-suppression hits; staged `git diff --cached --check` passed. The TypeScript command was blocked before process start by the host approval policy, and the npm lint/Next/OpenNext scripts were attempted and reported missing local executables; `node_modules` and all required tool packages are absent.
- Final spec review: GO after bounded receipt-boundary repair. Final code-quality review: GO with no Critical/Important/Minor findings. Full toolchain checks are setup-blocked as recorded above; the A2 feature branch is committed and pushed, and PR #799 is open and unmerged.
