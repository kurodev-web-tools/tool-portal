import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migrationName = "20260815090000_comment_translator_paid_cron_vault_transport";
const migrationPath = path.join(root, "supabase", "migrations", `${migrationName}.sql`);
const operatorDocumentPath = path.join(root, "docs", "active", "COMMENT_TRANSLATOR_PAID_V1_GATE0A2_MIGRATION_HISTORY_RECONCILIATION.md");
const planPath = path.join(root, "docs", "superpowers", "plans", "2026-08-29-comment-translator-paid-gate0a2-migration-history-reconciliation.md");
const remoteFunctionBodySemanticMd5 = "ee28c4f97fb47ab70e0ae48248e56693";
const remoteFunctionDefinitionMd5 = "3c83f5957755dd833bd077c83163e1ea";
const canonicalMigrationSourceSha256 = "df6fea22e6be4be7563b272088b26813f99394fcb7ddcbd76125e69663b1b9ca";
const canonicalStatementSequenceSha256 = "384b65c018721e1b281a33191be2f10cdc3a68f13a277ac78ebfff69f82b173a";
const task6AzureFallbackSemanticDefinitionSha256 = "5a8b759532ebba939a8c2d5331d24782b9ece7647adcbb71b588cd7985c3ca5f";
const canonicalFunctionComment = "Paid maintenance transport contract: read the two named Vault references only at invocation time, delegate to the existing supabase-cron HTTP RPC, and never return or log secret values, URLs, request IDs, or scheduler payloads. No Cron job is created by this migration.";
const canonicalFunctionCommentSha256 = crypto.createHash("sha256").update(canonicalFunctionComment, "utf8").digest("hex");

const canonicalMigration = String.raw`-- Comment Translator Paid Core v1: runtime-only Supabase Cron secret transport.
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
`;

const localBaselineMigrations = [
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
  "20260818100000_comment_translator_paid_gate0a_poll_budget_rpc_repair",
  "20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair",
  "20260819110000_comment_translator_paid_gate0a_capacity_read_repair",
  "20260823120000_comment_translator_paid_gate0a_unbound_hold_recovery",
  "20260823130000_comment_translator_paid_gate0a_schedule_function_privilege_repair",
  "20260826100000_comment_translator_paid_gate0a_checkout_recovery_window_floor",
  "20260826110000_comment_translator_paid_gate0a_recovery_floor_second_canonicalization",
  "20260827020609_comment_translator_paid_checkout_expiry_finalize_lease",
  "20260829100000_comment_translator_paid_task6_azure_uncertain_retry_guard_repair"
];

const remoteMigrations = [
  "20260615000000_comment_translator_sessions",
  "20260615001000_comment_translator_usage_ledger_events",
  "20260623000000_comment_translator_real_comments_feed_snapshots",
  "20260812120000_comment_translator_paid_core_v1",
  "20260813130000_comment_translator_paid_task6_circuit_probe_claim",
  "20260813131500_comment_translator_paid_task6_openai_rate_retry",
  "20260813133000_comment_translator_paid_task6_owned_circuit_failure",
  "20260813134500_comment_translator_paid_task6_azure_billing_split",
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
  "20260818074643_comment_translator_paid_gate0a_poll_budget_rpc_repair",
  "20260819032701_20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair",
  "20260819040046_20260819110000_comment_translator_paid_gate0a_capacity_read_repair",
  "20260823035028_comment_translator_paid_gate0a_unbound_hold_recovery",
  "20260823040930_comment_translator_paid_gate0a_schedule_function_privilege_repair",
  "20260826072327_comment_translator_paid_gate0a_checkout_recovery_window_floor",
  "20260826141718_comment_translator_paid_gate0a_recovery_floor_second_canonicalization",
  "20260827024331_comment_translator_paid_checkout_expiry_finalize_lease"
];

const localOnlyBaseline = [
  "20260527000000_account_preferences_foundation",
  "20260601000000_youtube_oauth_credentials",
  "20260624000000_account_display_timezone_preference",
  "20260705000000_comment_translator_creator_waitlist_registrations",
  "20260706073204_supabase_default_privileges_guard",
  "20260813135500_comment_translator_paid_task6_azure_uncertain_retry_compatibility",
  "20260818100000_comment_translator_paid_gate0a_poll_budget_rpc_repair",
  "20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair",
  "20260819110000_comment_translator_paid_gate0a_capacity_read_repair",
  "20260823120000_comment_translator_paid_gate0a_unbound_hold_recovery",
  "20260823130000_comment_translator_paid_gate0a_schedule_function_privilege_repair",
  "20260826100000_comment_translator_paid_gate0a_checkout_recovery_window_floor",
  "20260826110000_comment_translator_paid_gate0a_recovery_floor_second_canonicalization",
  "20260827020609_comment_translator_paid_checkout_expiry_finalize_lease",
  "20260829100000_comment_translator_paid_task6_azure_uncertain_retry_guard_repair"
];

const remoteOnlyBaseline = [
  "20260815090000_comment_translator_paid_cron_vault_transport",
  "20260818074643_comment_translator_paid_gate0a_poll_budget_rpc_repair",
  "20260819032701_20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair",
  "20260819040046_20260819110000_comment_translator_paid_gate0a_capacity_read_repair",
  "20260823035028_comment_translator_paid_gate0a_unbound_hold_recovery",
  "20260823040930_comment_translator_paid_gate0a_schedule_function_privilege_repair",
  "20260826072327_comment_translator_paid_gate0a_checkout_recovery_window_floor",
  "20260826141718_comment_translator_paid_gate0a_recovery_floor_second_canonicalization",
  "20260827024331_comment_translator_paid_checkout_expiry_finalize_lease"
];

const semanticMappings = [
  ["20260818074643_comment_translator_paid_gate0a_poll_budget_rpc_repair", "20260818100000_comment_translator_paid_gate0a_poll_budget_rpc_repair", "timestamp-mismatch"],
  ["20260819032701_20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair", "20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair", "semantic-noncanonical"],
  ["20260819040046_20260819110000_comment_translator_paid_gate0a_capacity_read_repair", "20260819110000_comment_translator_paid_gate0a_capacity_read_repair", "semantic-noncanonical"],
  ["20260823035028_comment_translator_paid_gate0a_unbound_hold_recovery", "20260823120000_comment_translator_paid_gate0a_unbound_hold_recovery", "timestamp-mismatch"],
  ["20260823040930_comment_translator_paid_gate0a_schedule_function_privilege_repair", "20260823130000_comment_translator_paid_gate0a_schedule_function_privilege_repair", "timestamp-mismatch"],
  ["20260826072327_comment_translator_paid_gate0a_checkout_recovery_window_floor", "20260826100000_comment_translator_paid_gate0a_checkout_recovery_window_floor", "timestamp-mismatch"],
  ["20260826141718_comment_translator_paid_gate0a_recovery_floor_second_canonicalization", "20260826110000_comment_translator_paid_gate0a_recovery_floor_second_canonicalization", "timestamp-mismatch"],
  ["20260827024331_comment_translator_paid_checkout_expiry_finalize_lease", "20260827020609_comment_translator_paid_checkout_expiry_finalize_lease", "timestamp-mismatch"]
];

const expectedOperatorMappings = [
  ["20260818074643_comment_translator_paid_gate0a_poll_budget_rpc_repair", "20260818100000_comment_translator_paid_gate0a_poll_budget_rpc_repair", "timestamp-mismatch"],
  ["20260819032701_20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair", "20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair", "semantic-noncanonical"],
  ["20260819040046_20260819110000_comment_translator_paid_gate0a_capacity_read_repair", "20260819110000_comment_translator_paid_gate0a_capacity_read_repair", "semantic-noncanonical"],
  ["20260823035028_comment_translator_paid_gate0a_unbound_hold_recovery", "20260823120000_comment_translator_paid_gate0a_unbound_hold_recovery", "timestamp-mismatch"],
  ["20260823040930_comment_translator_paid_gate0a_schedule_function_privilege_repair", "20260823130000_comment_translator_paid_gate0a_schedule_function_privilege_repair", "timestamp-mismatch"],
  ["20260826072327_comment_translator_paid_gate0a_checkout_recovery_window_floor", "20260826100000_comment_translator_paid_gate0a_checkout_recovery_window_floor", "timestamp-mismatch"],
  ["20260826141718_comment_translator_paid_gate0a_recovery_floor_second_canonicalization", "20260826110000_comment_translator_paid_gate0a_recovery_floor_second_canonicalization", "timestamp-mismatch"],
  ["20260827024331_comment_translator_paid_checkout_expiry_finalize_lease", "20260827020609_comment_translator_paid_checkout_expiry_finalize_lease", "timestamp-mismatch"]
];

const nameDerivedPairEvidenceRecords = [
  { remoteName: "20260818074643_comment_translator_paid_gate0a_poll_budget_rpc_repair", localName: "20260818100000_comment_translator_paid_gate0a_poll_budget_rpc_repair", category: "timestamp-mismatch", semanticEvidenceSha256: "c7e3bd14ca26f35c49f0e91ac55f8067620b3731e70745caf259abe4ac0c4ec9", privilegeEvidenceSha256: "e946b7ddd4d6db32a5ec4a005e881f8c52698539c90f46423a202d3212b4566f", evidenceStatus: "verified", evidenceSource: "deterministic-sanitized-contract-fixture-not-live-observation" },
  { remoteName: "20260819032701_20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair", localName: "20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair", category: "semantic-noncanonical", semanticEvidenceSha256: "2c5d54c8c13a20e5dfd0a76bf7de94c47ed3a48e68ebb23f7e51aab382f360ab", privilegeEvidenceSha256: "c6ba6e302146abd7a4bfdc1f606f122137c5beb7467afc6506efe3be64902390", evidenceStatus: "verified", evidenceSource: "deterministic-sanitized-contract-fixture-not-live-observation" },
  { remoteName: "20260819040046_20260819110000_comment_translator_paid_gate0a_capacity_read_repair", localName: "20260819110000_comment_translator_paid_gate0a_capacity_read_repair", category: "semantic-noncanonical", semanticEvidenceSha256: "5388afb56d7ece7831e3b3092d69629c6618dcc40fb84b23525a68f075ae4e1f", privilegeEvidenceSha256: "78a09ec3bad8cbec22ccb41ff5cea5623cada3d0a064386093bc1074cee351cb", evidenceStatus: "verified", evidenceSource: "deterministic-sanitized-contract-fixture-not-live-observation" },
  { remoteName: "20260823035028_comment_translator_paid_gate0a_unbound_hold_recovery", localName: "20260823120000_comment_translator_paid_gate0a_unbound_hold_recovery", category: "timestamp-mismatch", semanticEvidenceSha256: "32b5b16c4efa7870cfe373b260ac54cf94e2fd14d525ca6394b68338d2eaf509", privilegeEvidenceSha256: "c474e10be2e3da96279142ee769ef067f0756a1df5b9bbcdb938814ed63e9aee", evidenceStatus: "verified", evidenceSource: "deterministic-sanitized-contract-fixture-not-live-observation" },
  { remoteName: "20260823040930_comment_translator_paid_gate0a_schedule_function_privilege_repair", localName: "20260823130000_comment_translator_paid_gate0a_schedule_function_privilege_repair", category: "timestamp-mismatch", semanticEvidenceSha256: "320d0514c0af58a145fc7a212fba2d84acf5257d430020f038df2b4a78ee666f", privilegeEvidenceSha256: "5ade7f0edaf523cb02f2b06103cfeecdfe4755089238349fed57553c90d5b133", evidenceStatus: "verified", evidenceSource: "deterministic-sanitized-contract-fixture-not-live-observation" },
  { remoteName: "20260826072327_comment_translator_paid_gate0a_checkout_recovery_window_floor", localName: "20260826100000_comment_translator_paid_gate0a_checkout_recovery_window_floor", category: "timestamp-mismatch", semanticEvidenceSha256: "99df03fd13921cc62a94fdb919aae6a0878605f62f56b9ee4f548cdc9712968d", privilegeEvidenceSha256: "b8cb74ba962a013fc34fe0cbcd3cc65031eb7bc701bf818ce87ab79694041882", evidenceStatus: "verified", evidenceSource: "deterministic-sanitized-contract-fixture-not-live-observation" },
  { remoteName: "20260826141718_comment_translator_paid_gate0a_recovery_floor_second_canonicalization", localName: "20260826110000_comment_translator_paid_gate0a_recovery_floor_second_canonicalization", category: "timestamp-mismatch", semanticEvidenceSha256: "e82e5666034823c652c2d64b352cc09400de1d1a3c3ea24d9672915ecfc91958", privilegeEvidenceSha256: "4b568931876539f1fe6518829a111e501150a7dc00663a29a84e9151b4d02e83", evidenceStatus: "verified", evidenceSource: "deterministic-sanitized-contract-fixture-not-live-observation" },
  { remoteName: "20260827024331_comment_translator_paid_checkout_expiry_finalize_lease", localName: "20260827020609_comment_translator_paid_checkout_expiry_finalize_lease", category: "timestamp-mismatch", semanticEvidenceSha256: "f596986ea07b81c5ae5bc2c8bc472a213badf5fde8f06548ee77952a44916c27", privilegeEvidenceSha256: "d04df3d99dd7b968bd4735f4a8841663cba93755e80eb010d068979c95772338", evidenceStatus: "verified", evidenceSource: "deterministic-sanitized-contract-fixture-not-live-observation" }
];

const nameDerivedPairEvidenceFixtures = [
  {
    "remoteName": "20260818074643_comment_translator_paid_gate0a_poll_budget_rpc_repair",
    "localName": "20260818100000_comment_translator_paid_gate0a_poll_budget_rpc_repair",
    "category": "timestamp-mismatch",
    "semanticEvidenceSha256": "c7e3bd14ca26f35c49f0e91ac55f8067620b3731e70745caf259abe4ac0c4ec9",
    "privilegeEvidenceSha256": "e946b7ddd4d6db32a5ec4a005e881f8c52698539c90f46423a202d3212b4566f",
    "evidenceStatus": "verified",
    "evidenceSource": "deterministic-sanitized-contract-fixture-not-live-observation"
  },
  {
    "remoteName": "20260819032701_20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair",
    "localName": "20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair",
    "category": "semantic-noncanonical",
    "semanticEvidenceSha256": "2c5d54c8c13a20e5dfd0a76bf7de94c47ed3a48e68ebb23f7e51aab382f360ab",
    "privilegeEvidenceSha256": "c6ba6e302146abd7a4bfdc1f606f122137c5beb7467afc6506efe3be64902390",
    "evidenceStatus": "verified",
    "evidenceSource": "deterministic-sanitized-contract-fixture-not-live-observation"
  },
  {
    "remoteName": "20260819040046_20260819110000_comment_translator_paid_gate0a_capacity_read_repair",
    "localName": "20260819110000_comment_translator_paid_gate0a_capacity_read_repair",
    "category": "semantic-noncanonical",
    "semanticEvidenceSha256": "5388afb56d7ece7831e3b3092d69629c6618dcc40fb84b23525a68f075ae4e1f",
    "privilegeEvidenceSha256": "78a09ec3bad8cbec22ccb41ff5cea5623cada3d0a064386093bc1074cee351cb",
    "evidenceStatus": "verified",
    "evidenceSource": "deterministic-sanitized-contract-fixture-not-live-observation"
  },
  {
    "remoteName": "20260823035028_comment_translator_paid_gate0a_unbound_hold_recovery",
    "localName": "20260823120000_comment_translator_paid_gate0a_unbound_hold_recovery",
    "category": "timestamp-mismatch",
    "semanticEvidenceSha256": "32b5b16c4efa7870cfe373b260ac54cf94e2fd14d525ca6394b68338d2eaf509",
    "privilegeEvidenceSha256": "c474e10be2e3da96279142ee769ef067f0756a1df5b9bbcdb938814ed63e9aee",
    "evidenceStatus": "verified",
    "evidenceSource": "deterministic-sanitized-contract-fixture-not-live-observation"
  },
  {
    "remoteName": "20260823040930_comment_translator_paid_gate0a_schedule_function_privilege_repair",
    "localName": "20260823130000_comment_translator_paid_gate0a_schedule_function_privilege_repair",
    "category": "timestamp-mismatch",
    "semanticEvidenceSha256": "320d0514c0af58a145fc7a212fba2d84acf5257d430020f038df2b4a78ee666f",
    "privilegeEvidenceSha256": "5ade7f0edaf523cb02f2b06103cfeecdfe4755089238349fed57553c90d5b133",
    "evidenceStatus": "verified",
    "evidenceSource": "deterministic-sanitized-contract-fixture-not-live-observation"
  },
  {
    "remoteName": "20260826072327_comment_translator_paid_gate0a_checkout_recovery_window_floor",
    "localName": "20260826100000_comment_translator_paid_gate0a_checkout_recovery_window_floor",
    "category": "timestamp-mismatch",
    "semanticEvidenceSha256": "99df03fd13921cc62a94fdb919aae6a0878605f62f56b9ee4f548cdc9712968d",
    "privilegeEvidenceSha256": "b8cb74ba962a013fc34fe0cbcd3cc65031eb7bc701bf818ce87ab79694041882",
    "evidenceStatus": "verified",
    "evidenceSource": "deterministic-sanitized-contract-fixture-not-live-observation"
  },
  {
    "remoteName": "20260826141718_comment_translator_paid_gate0a_recovery_floor_second_canonicalization",
    "localName": "20260826110000_comment_translator_paid_gate0a_recovery_floor_second_canonicalization",
    "category": "timestamp-mismatch",
    "semanticEvidenceSha256": "e82e5666034823c652c2d64b352cc09400de1d1a3c3ea24d9672915ecfc91958",
    "privilegeEvidenceSha256": "4b568931876539f1fe6518829a111e501150a7dc00663a29a84e9151b4d02e83",
    "evidenceStatus": "verified",
    "evidenceSource": "deterministic-sanitized-contract-fixture-not-live-observation"
  },
  {
    "remoteName": "20260827024331_comment_translator_paid_checkout_expiry_finalize_lease",
    "localName": "20260827020609_comment_translator_paid_checkout_expiry_finalize_lease",
    "category": "timestamp-mismatch",
    "semanticEvidenceSha256": "f596986ea07b81c5ae5bc2c8bc472a213badf5fde8f06548ee77952a44916c27",
    "privilegeEvidenceSha256": "d04df3d99dd7b968bd4735f4a8841663cba93755e80eb010d068979c95772338",
    "evidenceStatus": "verified",
    "evidenceSource": "deterministic-sanitized-contract-fixture-not-live-observation"
  }
];

const pairEvidenceSources = [
  {
    focusedContracts: ["scripts/comment-translator-paid-core-v1-gate0a-poll-budget-repair-contract.mjs"],
    privilegeInvariants: ["security-definer", "fixed-search-path:pg_catalog,public", "owner-user-id-required-and-matched", "execute:service_role-only", "table-grants:none"],
    ownerLeaseInvariants: ["owner-user-id-required-and-matched", "lease-boundary:not-applicable"]
  },
  {
    focusedContracts: ["scripts/comment-translator-paid-core-v1-gate0a-lifecycle-read-repair-contract.mjs"],
    privilegeInvariants: ["select:service_role-only-on-five-lifecycle-read-tables", "entitlement-direct-select:denied", "table-dml:none", "public-api-role-select:none"],
    ownerLeaseInvariants: ["owner-boundary:service-role-read-only", "lease-boundary:not-applicable"]
  },
  {
    focusedContracts: ["scripts/comment-translator-paid-core-v1-gate0a-capacity-read-repair-contract.mjs"],
    privilegeInvariants: ["select:service_role-only-on-two-capacity-read-tables", "poll-and-entitlement-direct-select:denied", "table-dml:none", "public-api-role-select:none"],
    ownerLeaseInvariants: ["owner-boundary:service-role-read-only", "lease-boundary:not-applicable"]
  },
  {
    focusedContracts: ["scripts/comment-translator-paid-core-v1-gate0a-unbound-hold-recovery-contract.mjs"],
    privilegeInvariants: ["security-definer", "fixed-search-path:pg_catalog,public", "owner-and-hold-identity-required", "active-matching-reconcile-lease-required", "execute:service_role-only", "entitlement-direct-select:denied"],
    ownerLeaseInvariants: ["owner-and-hold-identity-required", "active-matching-reconcile-lease-required"]
  },
  {
    focusedContracts: ["scripts/comment-translator-paid-core-v1-gate0a-function-privilege-contract.mjs", "scripts/comment-translator-paid-core-v1-gate0a-unbound-hold-recovery-contract.mjs"],
    privilegeInvariants: ["schedule-function-public-api-execute:revoked", "schedule-function-execute:service_role-only", "schema-wide-function-grant:none", "entitlement-direct-select:denied"],
    ownerLeaseInvariants: ["owner-boundary:service-role-only", "lease-boundary:unbound-hold-recovery-contract"]
  },
  {
    focusedContracts: ["scripts/comment-translator-paid-core-v1-gate0a-recovery-window-floor-contract.mjs"],
    privilegeInvariants: ["security-definer", "fixed-search-path:pg_catalog,public", "execute:service_role-only", "entitlement-and-schema-wide-grants:none"],
    ownerLeaseInvariants: ["owner-boundary:security-definer", "lease-boundary:recovery-window-floor"]
  },
  {
    focusedContracts: ["scripts/comment-translator-paid-core-v1-gate0a-recovery-floor-second-canonicalization-contract.mjs"],
    privilegeInvariants: ["security-definer-owner:postgres", "fixed-search-path:pg_catalog,public", "public-api-and-service-role-execute:revoked-before-regrant", "execute:service_role-only", "table-schema-entitlement-grants:none"],
    ownerLeaseInvariants: ["security-definer-owner:postgres", "lease-boundary:recovery-floor-second-canonicalization"]
  },
  {
    focusedContracts: ["scripts/comment-translator-paid-core-v1-gate0a-checkout-expiry-finalize-lease-contract.mjs"],
    privilegeInvariants: ["security-definer", "fixed-search-path:pg_catalog,public", "owner-and-hold-identity-required", "active-matching-reconcile-lease-required-when-supplied", "reconciler-lease-preserved-until-common-finalizer", "execute:service_role-only", "table-grants:none"],
    ownerLeaseInvariants: ["owner-and-hold-identity-required", "active-matching-reconcile-lease-required-when-supplied", "reconciler-lease-preserved-until-common-finalizer"]
  }
];

const pairEvidenceFixtureSource = "deterministic-source-bound-test-fixture-not-live-observation";
const operatorPairEvidenceRequirement = "externally-supplied-read-only-sanitized-semantic-acl-owner-lease-evidence-required-before-history-repair";
const externalPairEvidenceSource = "external-read-only-observation";
const externalEvidenceFreshnessMarker = "fresh-for-current-preview-preflight";
const operatorExternalObservationCapability = Symbol("operator-external-observation-capability");
const externalObservationSession = Symbol("external-observation-session");
const externalObservationCapabilityRegistry = new WeakMap();
const externalObservationRequestRegistry = new WeakMap();
const externalObservationIssuerRegistry = new WeakMap();
const externalObservationSessions = new WeakSet();
const trustedExternalObservationReceiptRegistry = new WeakMap();
const trustedExternalObservationAdapters = new WeakSet();
const observationSourceRegistry = new WeakMap();
const trustedExternalObservationSourceTokens = new WeakSet();
const observationSourceRequestTokens = new WeakSet();
const opaqueExternalAdapterSourceLineages = new WeakSet();
const internalObservationSourceTokens = new WeakSet();
const testOnlyEvidenceProvenance = Object.freeze({ kind: "deterministic-contract-fixture", liveObservation: false });
const testOnlyEvidenceFreshness = Object.freeze({ status: "not-live", scope: "source-contract-only" });

function sha256(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function sourceSha256(source) {
  return sha256(source.replace(/\r\n?/g, "\n"));
}

function canonicalTask6AzureFallbackSemanticDefinition() {
  const baseSource = fs.readFileSync(path.join(root, "supabase", "migrations", "20260812120000_comment_translator_paid_core_v1.sql"), "utf8");
  const compatibilitySource = fs.readFileSync(path.join(root, "supabase", "migrations", "20260813135500_comment_translator_paid_task6_azure_uncertain_retry_compatibility.sql"), "utf8");
  const functionMatch = baseSource.match(/create or replace function public\.ct_paid_azure_direct_fallback\([\s\S]*?\n\$\$;/i);
  const hardenedGuardMatch = compatibilitySource.match(/v_hardened_uncertain text := \$hardened\$([\s\S]*?)\$hardened\$;/i);
  assert.ok(functionMatch && hardenedGuardMatch, "Task 6 Azure fallback canonical semantic source is extractable");
  const hardened = functionMatch[0]
    .replace(
      "if v_openai_receipt_count = 2 then",
      "if v_openai_receipt_count = 2 and v_shared_attempt.attempt_state <> 'uncertain' then"
    )
    .replace(
      /if v_openai_receipt_count <> 1 then[\s\S]*?raise exception 'uncertain OpenAI fallback permits one OpenAI receipt';[\s\S]*?end if;/i,
      hardenedGuardMatch[1]
    );
  return hardened
    .replace(/--[^\n]*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const canonicalTask6AzureFallbackSemanticSha256 = sha256(canonicalTask6AzureFallbackSemanticDefinition());
assert.equal(canonicalTask6AzureFallbackSemanticSha256, task6AzureFallbackSemanticDefinitionSha256, "fixed Task 6 Azure fallback semantic SHA-256 matches the canonical final function definition");

function sourceDescriptor(sourcePath) {
  const absolutePath = path.join(root, sourcePath);
  assert.ok(fs.existsSync(absolutePath), `pair evidence source exists: ${sourcePath}`);
  return { path: sourcePath, sha256: sha256(fs.readFileSync(absolutePath, "utf8")) };
}

const expectedPairEvidenceRecords = expectedOperatorMappings.map(([remoteName, localName, category], index) => {
  const source = pairEvidenceSources[index];
  const canonicalMigration = sourceDescriptor(`supabase/migrations/${localName}.sql`);
  const focusedContracts = source.focusedContracts.map(sourceDescriptor);
  const mapping = { remoteName, localName, category };
  return {
    ...mapping,
    semanticEvidenceSha256: sha256(JSON.stringify({ schema: "gate0a2-source-bound-semantic-v2", mapping, canonicalMigration, focusedContracts })),
    privilegeEvidenceSha256: sha256(JSON.stringify({ schema: "gate0a2-source-bound-privilege-v2", mapping, canonicalMigration, focusedContracts, privilegeInvariants: source.privilegeInvariants })),
    ownerLeaseEvidenceSha256: sha256(JSON.stringify({ schema: "gate0a2-source-bound-owner-lease-v1", mapping, canonicalMigration, focusedContracts, ownerLeaseInvariants: source.ownerLeaseInvariants })),
    evidenceStatus: "verified",
    evidenceSource: pairEvidenceFixtureSource,
    operatorEvidenceRequirement: operatorPairEvidenceRequirement
  };
});

const independentlyObservedPairEvidence = [
  { remoteName: "20260818074643_comment_translator_paid_gate0a_poll_budget_rpc_repair", localName: "20260818100000_comment_translator_paid_gate0a_poll_budget_rpc_repair", category: "timestamp-mismatch", semanticEvidenceSha256: "ca2fd46e0c430732789b378b5d080d47f3b35f527ea1eabe0a219699e56274d8", privilegeEvidenceSha256: "9cf5248b340271ed77a8eede403b8f31d44d67ab93fcfec29141878e3acc3e03", ownerLeaseEvidenceSha256: "b444369655ea4bd19570669db2e804540c4e1d647a96a6496ea7b6152fa7e493", evidenceStatus: "verified", evidenceSource: pairEvidenceFixtureSource, operatorEvidenceRequirement: operatorPairEvidenceRequirement },
  { remoteName: "20260819032701_20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair", localName: "20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair", category: "semantic-noncanonical", semanticEvidenceSha256: "397e52db5744ad28fdd71aa37769f5f765970734529d46f3330fa2703ea0e325", privilegeEvidenceSha256: "85cdc3193aef41d228063108bb5c05c26d80b11433b3e07197bc07ca6d326983", ownerLeaseEvidenceSha256: "ccb8039b9f51a2f93581ad1180db28a4d4c2299b32632dc234cab4544f3560d9", evidenceStatus: "verified", evidenceSource: pairEvidenceFixtureSource, operatorEvidenceRequirement: operatorPairEvidenceRequirement },
  { remoteName: "20260819040046_20260819110000_comment_translator_paid_gate0a_capacity_read_repair", localName: "20260819110000_comment_translator_paid_gate0a_capacity_read_repair", category: "semantic-noncanonical", semanticEvidenceSha256: "ca3db6035706f987acee2fc38426a0561a8cf18731faee69d15b2cc18407a21d", privilegeEvidenceSha256: "870608aaa37f996224f560d28f1edac028f7be14e0b61df6afd3699dcb1c6da0", ownerLeaseEvidenceSha256: "bf73941985c5dd4e70ff20acc30273a82bceb450ffb45910c77fe4ddfd1dd84a", evidenceStatus: "verified", evidenceSource: pairEvidenceFixtureSource, operatorEvidenceRequirement: operatorPairEvidenceRequirement },
  { remoteName: "20260823035028_comment_translator_paid_gate0a_unbound_hold_recovery", localName: "20260823120000_comment_translator_paid_gate0a_unbound_hold_recovery", category: "timestamp-mismatch", semanticEvidenceSha256: "9020814861c4fba67b147be9bde38113a8da09a1ee9d20dbfd36a141354cbc8a", privilegeEvidenceSha256: "497cfc59c9904f24d2a4d58d951397ce6386c1724dc87d2cccc8e17327f1fdee", ownerLeaseEvidenceSha256: "af42db9a8afccd29918eb032177e6b2309caf540ad8aaddd32098fdf68dff409", evidenceStatus: "verified", evidenceSource: pairEvidenceFixtureSource, operatorEvidenceRequirement: operatorPairEvidenceRequirement },
  { remoteName: "20260823040930_comment_translator_paid_gate0a_schedule_function_privilege_repair", localName: "20260823130000_comment_translator_paid_gate0a_schedule_function_privilege_repair", category: "timestamp-mismatch", semanticEvidenceSha256: "888a2a3b2b5a41943c3fc66bac270d4944291fac20f58293c903e09e1e689d35", privilegeEvidenceSha256: "3dcdf98be4e19fd936cac61c9ba32d17780b3f81aa78c074cc9795b3b898c09b", ownerLeaseEvidenceSha256: "3d554c28e0b2eb6d6095ec16c9dd63068e081087493da0ed5f8237b4b8f86199", evidenceStatus: "verified", evidenceSource: pairEvidenceFixtureSource, operatorEvidenceRequirement: operatorPairEvidenceRequirement },
  { remoteName: "20260826072327_comment_translator_paid_gate0a_checkout_recovery_window_floor", localName: "20260826100000_comment_translator_paid_gate0a_checkout_recovery_window_floor", category: "timestamp-mismatch", semanticEvidenceSha256: "f4082365c6583a4d17d947bd8f4866c84b8eb1692a4885e60ef843876ef6fe2c", privilegeEvidenceSha256: "b0c8da4efc9c3ebfd903d966bb49b56f8172970df2d2de42b6db89873d017657", ownerLeaseEvidenceSha256: "9cd8114ea562614732f26fbb7d737b8a1b0530208de388d958a2b7df0629bf0c", evidenceStatus: "verified", evidenceSource: pairEvidenceFixtureSource, operatorEvidenceRequirement: operatorPairEvidenceRequirement },
  { remoteName: "20260826141718_comment_translator_paid_gate0a_recovery_floor_second_canonicalization", localName: "20260826110000_comment_translator_paid_gate0a_recovery_floor_second_canonicalization", category: "timestamp-mismatch", semanticEvidenceSha256: "aecb625b3113df75c935c8b33f6f7d53939d4e9fa8fc14d6edf0ef6aa3db1c80", privilegeEvidenceSha256: "eccb0215644ebcf0d01eb249176850d9d67d8385535bed1fb2b8e65abffe3898", ownerLeaseEvidenceSha256: "27040bd461764daf04bdf185bb4bcf1e6abf53d305f64a0062ad3c163821c4f9", evidenceStatus: "verified", evidenceSource: pairEvidenceFixtureSource, operatorEvidenceRequirement: operatorPairEvidenceRequirement },
  { remoteName: "20260827024331_comment_translator_paid_checkout_expiry_finalize_lease", localName: "20260827020609_comment_translator_paid_checkout_expiry_finalize_lease", category: "timestamp-mismatch", semanticEvidenceSha256: "83aaceb5387a861feeea71bac2a755599f8d76b46c0f03fb5ccbf0a1c70b1f06", privilegeEvidenceSha256: "790594f11398723e665e5c76e0e8b68ad0a0e29bbc61c749e3a33b940795ac4d", ownerLeaseEvidenceSha256: "f6716702f2e95da6c5c239817b1bf11dc0c85e4557485cb7a30b00f79ceecde9", evidenceStatus: "verified", evidenceSource: pairEvidenceFixtureSource, operatorEvidenceRequirement: operatorPairEvidenceRequirement }
];

const deterministicPairEvidenceEnvelope = Object.freeze({
  result: "success",
  provenance: testOnlyEvidenceProvenance,
  freshness: testOnlyEvidenceFreshness,
  records: independentlyObservedPairEvidence
});

const independentExternalPairEvidenceRecords = Object.freeze(independentlyObservedPairEvidence.map((record) => Object.freeze({
  ...record,
  evidenceSource: externalPairEvidenceSource,
  freshnessMarker: externalEvidenceFreshnessMarker
})));
const testShapedExternalPairEvidenceEnvelope = Object.freeze({
  fixtureLabel: "sanitized-static-external-envelope-shape-not-live-evidence",
  result: "success",
  provenance: Object.freeze({ kind: externalPairEvidenceSource, liveObservation: true }),
  freshness: Object.freeze({ status: "fresh", marker: externalEvidenceFreshnessMarker }),
  records: independentExternalPairEvidenceRecords
});

const independentExternalPreviewPreflightEnvelope = () => Object.freeze({
  result: "success",
  targetKind: "preview",
  provenance: Object.freeze({ kind: externalPairEvidenceSource, liveObservation: true }),
  freshness: Object.freeze({ status: "fresh", marker: previewObservationFreshnessMarker("preflight", "preflight") }),
  observedHistory: Object.freeze([...remoteMigrations]),
  observedBodySemanticMd5: "ee28c4f97fb47ab70e0ae48248e56693",
  observedFunctionDefinitionMd5: "3c83f5957755dd833bd077c83163e1ea",
  pairEvidenceEnvelope: Object.freeze({
    result: "success",
    targetKind: "preview",
    provenance: Object.freeze({ kind: externalPairEvidenceSource, liveObservation: true }),
    freshness: Object.freeze({ status: "fresh", marker: externalEvidenceFreshnessMarker }),
    records: independentExternalPairEvidenceRecords
  })
});

const independentExternalPreviewPreflightProvider = (request) => {
  const provided = independentExternalPreviewPreflightEnvelope();
  const pairEvidenceSource = createInternalStateMachineReadOnlyObservationSourceFixture(() => provided.pairEvidenceEnvelope);
  const pairEvidenceEnvelope = issueInternalStateMachineObservation(request.pairEvidenceIssuer, pairEvidenceSource);
  const preflightEnvelope = { ...provided, pairEvidenceEnvelope };
  const preflightSource = createInternalStateMachineReadOnlyObservationSourceFixture(() => preflightEnvelope);
  return issueInternalStateMachineObservation(request, preflightSource);
};

const independentlyObservedPreviewHistoryReadbacks = [
  { revert: "20260615000000_comment_translator_sessions|20260615001000_comment_translator_usage_ledger_events|20260623000000_comment_translator_real_comments_feed_snapshots|20260812120000_comment_translator_paid_core_v1|20260813130000_comment_translator_paid_task6_circuit_probe_claim|20260813131500_comment_translator_paid_task6_openai_rate_retry|20260813133000_comment_translator_paid_task6_owned_circuit_failure|20260813134500_comment_translator_paid_task6_azure_billing_split|20260813140000_comment_translator_paid_task6_azure_uncertain_retry|20260813141500_comment_translator_paid_task6_circuit_success_window|20260813143000_comment_translator_paid_task6_openai_resume_status|20260813144500_comment_translator_paid_task6_terminal_openai_partial|20260813150000_comment_translator_paid_task6_openai_partial_receipt|20260813151500_comment_translator_paid_task6_terminal_openai_partial_authority|20260813153000_comment_translator_paid_task6_replay_circuit_authority|20260813154500_comment_translator_paid_task6_dispatch_and_azure_partial_settlement|20260814100000_comment_translator_paid_task7_runtime_authority|20260814110000_comment_translator_paid_task9_retention_observability|20260815090000_comment_translator_paid_cron_vault_transport|20260819032701_20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair|20260819040046_20260819110000_comment_translator_paid_gate0a_capacity_read_repair|20260823035028_comment_translator_paid_gate0a_unbound_hold_recovery|20260823040930_comment_translator_paid_gate0a_schedule_function_privilege_repair|20260826072327_comment_translator_paid_gate0a_checkout_recovery_window_floor|20260826141718_comment_translator_paid_gate0a_recovery_floor_second_canonicalization|20260827024331_comment_translator_paid_checkout_expiry_finalize_lease".split("|"), apply: "20260615000000_comment_translator_sessions|20260615001000_comment_translator_usage_ledger_events|20260623000000_comment_translator_real_comments_feed_snapshots|20260812120000_comment_translator_paid_core_v1|20260813130000_comment_translator_paid_task6_circuit_probe_claim|20260813131500_comment_translator_paid_task6_openai_rate_retry|20260813133000_comment_translator_paid_task6_owned_circuit_failure|20260813134500_comment_translator_paid_task6_azure_billing_split|20260813140000_comment_translator_paid_task6_azure_uncertain_retry|20260813141500_comment_translator_paid_task6_circuit_success_window|20260813143000_comment_translator_paid_task6_openai_resume_status|20260813144500_comment_translator_paid_task6_terminal_openai_partial|20260813150000_comment_translator_paid_task6_openai_partial_receipt|20260813151500_comment_translator_paid_task6_terminal_openai_partial_authority|20260813153000_comment_translator_paid_task6_replay_circuit_authority|20260813154500_comment_translator_paid_task6_dispatch_and_azure_partial_settlement|20260814100000_comment_translator_paid_task7_runtime_authority|20260814110000_comment_translator_paid_task9_retention_observability|20260815090000_comment_translator_paid_cron_vault_transport|20260818100000_comment_translator_paid_gate0a_poll_budget_rpc_repair|20260819032701_20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair|20260819040046_20260819110000_comment_translator_paid_gate0a_capacity_read_repair|20260823035028_comment_translator_paid_gate0a_unbound_hold_recovery|20260823040930_comment_translator_paid_gate0a_schedule_function_privilege_repair|20260826072327_comment_translator_paid_gate0a_checkout_recovery_window_floor|20260826141718_comment_translator_paid_gate0a_recovery_floor_second_canonicalization|20260827024331_comment_translator_paid_checkout_expiry_finalize_lease".split("|") },
  { revert: "20260615000000_comment_translator_sessions|20260615001000_comment_translator_usage_ledger_events|20260623000000_comment_translator_real_comments_feed_snapshots|20260812120000_comment_translator_paid_core_v1|20260813130000_comment_translator_paid_task6_circuit_probe_claim|20260813131500_comment_translator_paid_task6_openai_rate_retry|20260813133000_comment_translator_paid_task6_owned_circuit_failure|20260813134500_comment_translator_paid_task6_azure_billing_split|20260813140000_comment_translator_paid_task6_azure_uncertain_retry|20260813141500_comment_translator_paid_task6_circuit_success_window|20260813143000_comment_translator_paid_task6_openai_resume_status|20260813144500_comment_translator_paid_task6_terminal_openai_partial|20260813150000_comment_translator_paid_task6_openai_partial_receipt|20260813151500_comment_translator_paid_task6_terminal_openai_partial_authority|20260813153000_comment_translator_paid_task6_replay_circuit_authority|20260813154500_comment_translator_paid_task6_dispatch_and_azure_partial_settlement|20260814100000_comment_translator_paid_task7_runtime_authority|20260814110000_comment_translator_paid_task9_retention_observability|20260815090000_comment_translator_paid_cron_vault_transport|20260818100000_comment_translator_paid_gate0a_poll_budget_rpc_repair|20260819040046_20260819110000_comment_translator_paid_gate0a_capacity_read_repair|20260823035028_comment_translator_paid_gate0a_unbound_hold_recovery|20260823040930_comment_translator_paid_gate0a_schedule_function_privilege_repair|20260826072327_comment_translator_paid_gate0a_checkout_recovery_window_floor|20260826141718_comment_translator_paid_gate0a_recovery_floor_second_canonicalization|20260827024331_comment_translator_paid_checkout_expiry_finalize_lease".split("|"), apply: "20260615000000_comment_translator_sessions|20260615001000_comment_translator_usage_ledger_events|20260623000000_comment_translator_real_comments_feed_snapshots|20260812120000_comment_translator_paid_core_v1|20260813130000_comment_translator_paid_task6_circuit_probe_claim|20260813131500_comment_translator_paid_task6_openai_rate_retry|20260813133000_comment_translator_paid_task6_owned_circuit_failure|20260813134500_comment_translator_paid_task6_azure_billing_split|20260813140000_comment_translator_paid_task6_azure_uncertain_retry|20260813141500_comment_translator_paid_task6_circuit_success_window|20260813143000_comment_translator_paid_task6_openai_resume_status|20260813144500_comment_translator_paid_task6_terminal_openai_partial|20260813150000_comment_translator_paid_task6_openai_partial_receipt|20260813151500_comment_translator_paid_task6_terminal_openai_partial_authority|20260813153000_comment_translator_paid_task6_replay_circuit_authority|20260813154500_comment_translator_paid_task6_dispatch_and_azure_partial_settlement|20260814100000_comment_translator_paid_task7_runtime_authority|20260814110000_comment_translator_paid_task9_retention_observability|20260815090000_comment_translator_paid_cron_vault_transport|20260818100000_comment_translator_paid_gate0a_poll_budget_rpc_repair|20260819040046_20260819110000_comment_translator_paid_gate0a_capacity_read_repair|20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair|20260823035028_comment_translator_paid_gate0a_unbound_hold_recovery|20260823040930_comment_translator_paid_gate0a_schedule_function_privilege_repair|20260826072327_comment_translator_paid_gate0a_checkout_recovery_window_floor|20260826141718_comment_translator_paid_gate0a_recovery_floor_second_canonicalization|20260827024331_comment_translator_paid_checkout_expiry_finalize_lease".split("|") },
  { revert: "20260615000000_comment_translator_sessions|20260615001000_comment_translator_usage_ledger_events|20260623000000_comment_translator_real_comments_feed_snapshots|20260812120000_comment_translator_paid_core_v1|20260813130000_comment_translator_paid_task6_circuit_probe_claim|20260813131500_comment_translator_paid_task6_openai_rate_retry|20260813133000_comment_translator_paid_task6_owned_circuit_failure|20260813134500_comment_translator_paid_task6_azure_billing_split|20260813140000_comment_translator_paid_task6_azure_uncertain_retry|20260813141500_comment_translator_paid_task6_circuit_success_window|20260813143000_comment_translator_paid_task6_openai_resume_status|20260813144500_comment_translator_paid_task6_terminal_openai_partial|20260813150000_comment_translator_paid_task6_openai_partial_receipt|20260813151500_comment_translator_paid_task6_terminal_openai_partial_authority|20260813153000_comment_translator_paid_task6_replay_circuit_authority|20260813154500_comment_translator_paid_task6_dispatch_and_azure_partial_settlement|20260814100000_comment_translator_paid_task7_runtime_authority|20260814110000_comment_translator_paid_task9_retention_observability|20260815090000_comment_translator_paid_cron_vault_transport|20260818100000_comment_translator_paid_gate0a_poll_budget_rpc_repair|20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair|20260823035028_comment_translator_paid_gate0a_unbound_hold_recovery|20260823040930_comment_translator_paid_gate0a_schedule_function_privilege_repair|20260826072327_comment_translator_paid_gate0a_checkout_recovery_window_floor|20260826141718_comment_translator_paid_gate0a_recovery_floor_second_canonicalization|20260827024331_comment_translator_paid_checkout_expiry_finalize_lease".split("|"), apply: "20260615000000_comment_translator_sessions|20260615001000_comment_translator_usage_ledger_events|20260623000000_comment_translator_real_comments_feed_snapshots|20260812120000_comment_translator_paid_core_v1|20260813130000_comment_translator_paid_task6_circuit_probe_claim|20260813131500_comment_translator_paid_task6_openai_rate_retry|20260813133000_comment_translator_paid_task6_owned_circuit_failure|20260813134500_comment_translator_paid_task6_azure_billing_split|20260813140000_comment_translator_paid_task6_azure_uncertain_retry|20260813141500_comment_translator_paid_task6_circuit_success_window|20260813143000_comment_translator_paid_task6_openai_resume_status|20260813144500_comment_translator_paid_task6_terminal_openai_partial|20260813150000_comment_translator_paid_task6_openai_partial_receipt|20260813151500_comment_translator_paid_task6_terminal_openai_partial_authority|20260813153000_comment_translator_paid_task6_replay_circuit_authority|20260813154500_comment_translator_paid_task6_dispatch_and_azure_partial_settlement|20260814100000_comment_translator_paid_task7_runtime_authority|20260814110000_comment_translator_paid_task9_retention_observability|20260815090000_comment_translator_paid_cron_vault_transport|20260818100000_comment_translator_paid_gate0a_poll_budget_rpc_repair|20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair|20260819110000_comment_translator_paid_gate0a_capacity_read_repair|20260823035028_comment_translator_paid_gate0a_unbound_hold_recovery|20260823040930_comment_translator_paid_gate0a_schedule_function_privilege_repair|20260826072327_comment_translator_paid_gate0a_checkout_recovery_window_floor|20260826141718_comment_translator_paid_gate0a_recovery_floor_second_canonicalization|20260827024331_comment_translator_paid_checkout_expiry_finalize_lease".split("|") },
  { revert: "20260615000000_comment_translator_sessions|20260615001000_comment_translator_usage_ledger_events|20260623000000_comment_translator_real_comments_feed_snapshots|20260812120000_comment_translator_paid_core_v1|20260813130000_comment_translator_paid_task6_circuit_probe_claim|20260813131500_comment_translator_paid_task6_openai_rate_retry|20260813133000_comment_translator_paid_task6_owned_circuit_failure|20260813134500_comment_translator_paid_task6_azure_billing_split|20260813140000_comment_translator_paid_task6_azure_uncertain_retry|20260813141500_comment_translator_paid_task6_circuit_success_window|20260813143000_comment_translator_paid_task6_openai_resume_status|20260813144500_comment_translator_paid_task6_terminal_openai_partial|20260813150000_comment_translator_paid_task6_openai_partial_receipt|20260813151500_comment_translator_paid_task6_terminal_openai_partial_authority|20260813153000_comment_translator_paid_task6_replay_circuit_authority|20260813154500_comment_translator_paid_task6_dispatch_and_azure_partial_settlement|20260814100000_comment_translator_paid_task7_runtime_authority|20260814110000_comment_translator_paid_task9_retention_observability|20260815090000_comment_translator_paid_cron_vault_transport|20260818100000_comment_translator_paid_gate0a_poll_budget_rpc_repair|20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair|20260819110000_comment_translator_paid_gate0a_capacity_read_repair|20260823040930_comment_translator_paid_gate0a_schedule_function_privilege_repair|20260826072327_comment_translator_paid_gate0a_checkout_recovery_window_floor|20260826141718_comment_translator_paid_gate0a_recovery_floor_second_canonicalization|20260827024331_comment_translator_paid_checkout_expiry_finalize_lease".split("|"), apply: "20260615000000_comment_translator_sessions|20260615001000_comment_translator_usage_ledger_events|20260623000000_comment_translator_real_comments_feed_snapshots|20260812120000_comment_translator_paid_core_v1|20260813130000_comment_translator_paid_task6_circuit_probe_claim|20260813131500_comment_translator_paid_task6_openai_rate_retry|20260813133000_comment_translator_paid_task6_owned_circuit_failure|20260813134500_comment_translator_paid_task6_azure_billing_split|20260813140000_comment_translator_paid_task6_azure_uncertain_retry|20260813141500_comment_translator_paid_task6_circuit_success_window|20260813143000_comment_translator_paid_task6_openai_resume_status|20260813144500_comment_translator_paid_task6_terminal_openai_partial|20260813150000_comment_translator_paid_task6_openai_partial_receipt|20260813151500_comment_translator_paid_task6_terminal_openai_partial_authority|20260813153000_comment_translator_paid_task6_replay_circuit_authority|20260813154500_comment_translator_paid_task6_dispatch_and_azure_partial_settlement|20260814100000_comment_translator_paid_task7_runtime_authority|20260814110000_comment_translator_paid_task9_retention_observability|20260815090000_comment_translator_paid_cron_vault_transport|20260818100000_comment_translator_paid_gate0a_poll_budget_rpc_repair|20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair|20260819110000_comment_translator_paid_gate0a_capacity_read_repair|20260823040930_comment_translator_paid_gate0a_schedule_function_privilege_repair|20260823120000_comment_translator_paid_gate0a_unbound_hold_recovery|20260826072327_comment_translator_paid_gate0a_checkout_recovery_window_floor|20260826141718_comment_translator_paid_gate0a_recovery_floor_second_canonicalization|20260827024331_comment_translator_paid_checkout_expiry_finalize_lease".split("|") },
  { revert: "20260615000000_comment_translator_sessions|20260615001000_comment_translator_usage_ledger_events|20260623000000_comment_translator_real_comments_feed_snapshots|20260812120000_comment_translator_paid_core_v1|20260813130000_comment_translator_paid_task6_circuit_probe_claim|20260813131500_comment_translator_paid_task6_openai_rate_retry|20260813133000_comment_translator_paid_task6_owned_circuit_failure|20260813134500_comment_translator_paid_task6_azure_billing_split|20260813140000_comment_translator_paid_task6_azure_uncertain_retry|20260813141500_comment_translator_paid_task6_circuit_success_window|20260813143000_comment_translator_paid_task6_openai_resume_status|20260813144500_comment_translator_paid_task6_terminal_openai_partial|20260813150000_comment_translator_paid_task6_openai_partial_receipt|20260813151500_comment_translator_paid_task6_terminal_openai_partial_authority|20260813153000_comment_translator_paid_task6_replay_circuit_authority|20260813154500_comment_translator_paid_task6_dispatch_and_azure_partial_settlement|20260814100000_comment_translator_paid_task7_runtime_authority|20260814110000_comment_translator_paid_task9_retention_observability|20260815090000_comment_translator_paid_cron_vault_transport|20260818100000_comment_translator_paid_gate0a_poll_budget_rpc_repair|20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair|20260819110000_comment_translator_paid_gate0a_capacity_read_repair|20260823120000_comment_translator_paid_gate0a_unbound_hold_recovery|20260826072327_comment_translator_paid_gate0a_checkout_recovery_window_floor|20260826141718_comment_translator_paid_gate0a_recovery_floor_second_canonicalization|20260827024331_comment_translator_paid_checkout_expiry_finalize_lease".split("|"), apply: "20260615000000_comment_translator_sessions|20260615001000_comment_translator_usage_ledger_events|20260623000000_comment_translator_real_comments_feed_snapshots|20260812120000_comment_translator_paid_core_v1|20260813130000_comment_translator_paid_task6_circuit_probe_claim|20260813131500_comment_translator_paid_task6_openai_rate_retry|20260813133000_comment_translator_paid_task6_owned_circuit_failure|20260813134500_comment_translator_paid_task6_azure_billing_split|20260813140000_comment_translator_paid_task6_azure_uncertain_retry|20260813141500_comment_translator_paid_task6_circuit_success_window|20260813143000_comment_translator_paid_task6_openai_resume_status|20260813144500_comment_translator_paid_task6_terminal_openai_partial|20260813150000_comment_translator_paid_task6_openai_partial_receipt|20260813151500_comment_translator_paid_task6_terminal_openai_partial_authority|20260813153000_comment_translator_paid_task6_replay_circuit_authority|20260813154500_comment_translator_paid_task6_dispatch_and_azure_partial_settlement|20260814100000_comment_translator_paid_task7_runtime_authority|20260814110000_comment_translator_paid_task9_retention_observability|20260815090000_comment_translator_paid_cron_vault_transport|20260818100000_comment_translator_paid_gate0a_poll_budget_rpc_repair|20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair|20260819110000_comment_translator_paid_gate0a_capacity_read_repair|20260823120000_comment_translator_paid_gate0a_unbound_hold_recovery|20260823130000_comment_translator_paid_gate0a_schedule_function_privilege_repair|20260826072327_comment_translator_paid_gate0a_checkout_recovery_window_floor|20260826141718_comment_translator_paid_gate0a_recovery_floor_second_canonicalization|20260827024331_comment_translator_paid_checkout_expiry_finalize_lease".split("|") },
  { revert: "20260615000000_comment_translator_sessions|20260615001000_comment_translator_usage_ledger_events|20260623000000_comment_translator_real_comments_feed_snapshots|20260812120000_comment_translator_paid_core_v1|20260813130000_comment_translator_paid_task6_circuit_probe_claim|20260813131500_comment_translator_paid_task6_openai_rate_retry|20260813133000_comment_translator_paid_task6_owned_circuit_failure|20260813134500_comment_translator_paid_task6_azure_billing_split|20260813140000_comment_translator_paid_task6_azure_uncertain_retry|20260813141500_comment_translator_paid_task6_circuit_success_window|20260813143000_comment_translator_paid_task6_openai_resume_status|20260813144500_comment_translator_paid_task6_terminal_openai_partial|20260813150000_comment_translator_paid_task6_openai_partial_receipt|20260813151500_comment_translator_paid_task6_terminal_openai_partial_authority|20260813153000_comment_translator_paid_task6_replay_circuit_authority|20260813154500_comment_translator_paid_task6_dispatch_and_azure_partial_settlement|20260814100000_comment_translator_paid_task7_runtime_authority|20260814110000_comment_translator_paid_task9_retention_observability|20260815090000_comment_translator_paid_cron_vault_transport|20260818100000_comment_translator_paid_gate0a_poll_budget_rpc_repair|20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair|20260819110000_comment_translator_paid_gate0a_capacity_read_repair|20260823120000_comment_translator_paid_gate0a_unbound_hold_recovery|20260823130000_comment_translator_paid_gate0a_schedule_function_privilege_repair|20260826141718_comment_translator_paid_gate0a_recovery_floor_second_canonicalization|20260827024331_comment_translator_paid_checkout_expiry_finalize_lease".split("|"), apply: "20260615000000_comment_translator_sessions|20260615001000_comment_translator_usage_ledger_events|20260623000000_comment_translator_real_comments_feed_snapshots|20260812120000_comment_translator_paid_core_v1|20260813130000_comment_translator_paid_task6_circuit_probe_claim|20260813131500_comment_translator_paid_task6_openai_rate_retry|20260813133000_comment_translator_paid_task6_owned_circuit_failure|20260813134500_comment_translator_paid_task6_azure_billing_split|20260813140000_comment_translator_paid_task6_azure_uncertain_retry|20260813141500_comment_translator_paid_task6_circuit_success_window|20260813143000_comment_translator_paid_task6_openai_resume_status|20260813144500_comment_translator_paid_task6_terminal_openai_partial|20260813150000_comment_translator_paid_task6_openai_partial_receipt|20260813151500_comment_translator_paid_task6_terminal_openai_partial_authority|20260813153000_comment_translator_paid_task6_replay_circuit_authority|20260813154500_comment_translator_paid_task6_dispatch_and_azure_partial_settlement|20260814100000_comment_translator_paid_task7_runtime_authority|20260814110000_comment_translator_paid_task9_retention_observability|20260815090000_comment_translator_paid_cron_vault_transport|20260818100000_comment_translator_paid_gate0a_poll_budget_rpc_repair|20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair|20260819110000_comment_translator_paid_gate0a_capacity_read_repair|20260823120000_comment_translator_paid_gate0a_unbound_hold_recovery|20260823130000_comment_translator_paid_gate0a_schedule_function_privilege_repair|20260826100000_comment_translator_paid_gate0a_checkout_recovery_window_floor|20260826141718_comment_translator_paid_gate0a_recovery_floor_second_canonicalization|20260827024331_comment_translator_paid_checkout_expiry_finalize_lease".split("|") },
  { revert: "20260615000000_comment_translator_sessions|20260615001000_comment_translator_usage_ledger_events|20260623000000_comment_translator_real_comments_feed_snapshots|20260812120000_comment_translator_paid_core_v1|20260813130000_comment_translator_paid_task6_circuit_probe_claim|20260813131500_comment_translator_paid_task6_openai_rate_retry|20260813133000_comment_translator_paid_task6_owned_circuit_failure|20260813134500_comment_translator_paid_task6_azure_billing_split|20260813140000_comment_translator_paid_task6_azure_uncertain_retry|20260813141500_comment_translator_paid_task6_circuit_success_window|20260813143000_comment_translator_paid_task6_openai_resume_status|20260813144500_comment_translator_paid_task6_terminal_openai_partial|20260813150000_comment_translator_paid_task6_openai_partial_receipt|20260813151500_comment_translator_paid_task6_terminal_openai_partial_authority|20260813153000_comment_translator_paid_task6_replay_circuit_authority|20260813154500_comment_translator_paid_task6_dispatch_and_azure_partial_settlement|20260814100000_comment_translator_paid_task7_runtime_authority|20260814110000_comment_translator_paid_task9_retention_observability|20260815090000_comment_translator_paid_cron_vault_transport|20260818100000_comment_translator_paid_gate0a_poll_budget_rpc_repair|20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair|20260819110000_comment_translator_paid_gate0a_capacity_read_repair|20260823120000_comment_translator_paid_gate0a_unbound_hold_recovery|20260823130000_comment_translator_paid_gate0a_schedule_function_privilege_repair|20260826100000_comment_translator_paid_gate0a_checkout_recovery_window_floor|20260827024331_comment_translator_paid_checkout_expiry_finalize_lease".split("|"), apply: "20260615000000_comment_translator_sessions|20260615001000_comment_translator_usage_ledger_events|20260623000000_comment_translator_real_comments_feed_snapshots|20260812120000_comment_translator_paid_core_v1|20260813130000_comment_translator_paid_task6_circuit_probe_claim|20260813131500_comment_translator_paid_task6_openai_rate_retry|20260813133000_comment_translator_paid_task6_owned_circuit_failure|20260813134500_comment_translator_paid_task6_azure_billing_split|20260813140000_comment_translator_paid_task6_azure_uncertain_retry|20260813141500_comment_translator_paid_task6_circuit_success_window|20260813143000_comment_translator_paid_task6_openai_resume_status|20260813144500_comment_translator_paid_task6_terminal_openai_partial|20260813150000_comment_translator_paid_task6_openai_partial_receipt|20260813151500_comment_translator_paid_task6_terminal_openai_partial_authority|20260813153000_comment_translator_paid_task6_replay_circuit_authority|20260813154500_comment_translator_paid_task6_dispatch_and_azure_partial_settlement|20260814100000_comment_translator_paid_task7_runtime_authority|20260814110000_comment_translator_paid_task9_retention_observability|20260815090000_comment_translator_paid_cron_vault_transport|20260818100000_comment_translator_paid_gate0a_poll_budget_rpc_repair|20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair|20260819110000_comment_translator_paid_gate0a_capacity_read_repair|20260823120000_comment_translator_paid_gate0a_unbound_hold_recovery|20260823130000_comment_translator_paid_gate0a_schedule_function_privilege_repair|20260826100000_comment_translator_paid_gate0a_checkout_recovery_window_floor|20260826110000_comment_translator_paid_gate0a_recovery_floor_second_canonicalization|20260827024331_comment_translator_paid_checkout_expiry_finalize_lease".split("|") },
  { revert: "20260615000000_comment_translator_sessions|20260615001000_comment_translator_usage_ledger_events|20260623000000_comment_translator_real_comments_feed_snapshots|20260812120000_comment_translator_paid_core_v1|20260813130000_comment_translator_paid_task6_circuit_probe_claim|20260813131500_comment_translator_paid_task6_openai_rate_retry|20260813133000_comment_translator_paid_task6_owned_circuit_failure|20260813134500_comment_translator_paid_task6_azure_billing_split|20260813140000_comment_translator_paid_task6_azure_uncertain_retry|20260813141500_comment_translator_paid_task6_circuit_success_window|20260813143000_comment_translator_paid_task6_openai_resume_status|20260813144500_comment_translator_paid_task6_terminal_openai_partial|20260813150000_comment_translator_paid_task6_openai_partial_receipt|20260813151500_comment_translator_paid_task6_terminal_openai_partial_authority|20260813153000_comment_translator_paid_task6_replay_circuit_authority|20260813154500_comment_translator_paid_task6_dispatch_and_azure_partial_settlement|20260814100000_comment_translator_paid_task7_runtime_authority|20260814110000_comment_translator_paid_task9_retention_observability|20260815090000_comment_translator_paid_cron_vault_transport|20260818100000_comment_translator_paid_gate0a_poll_budget_rpc_repair|20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair|20260819110000_comment_translator_paid_gate0a_capacity_read_repair|20260823120000_comment_translator_paid_gate0a_unbound_hold_recovery|20260823130000_comment_translator_paid_gate0a_schedule_function_privilege_repair|20260826100000_comment_translator_paid_gate0a_checkout_recovery_window_floor|20260826110000_comment_translator_paid_gate0a_recovery_floor_second_canonicalization".split("|"), apply: "20260615000000_comment_translator_sessions|20260615001000_comment_translator_usage_ledger_events|20260623000000_comment_translator_real_comments_feed_snapshots|20260812120000_comment_translator_paid_core_v1|20260813130000_comment_translator_paid_task6_circuit_probe_claim|20260813131500_comment_translator_paid_task6_openai_rate_retry|20260813133000_comment_translator_paid_task6_owned_circuit_failure|20260813134500_comment_translator_paid_task6_azure_billing_split|20260813140000_comment_translator_paid_task6_azure_uncertain_retry|20260813141500_comment_translator_paid_task6_circuit_success_window|20260813143000_comment_translator_paid_task6_openai_resume_status|20260813144500_comment_translator_paid_task6_terminal_openai_partial|20260813150000_comment_translator_paid_task6_openai_partial_receipt|20260813151500_comment_translator_paid_task6_terminal_openai_partial_authority|20260813153000_comment_translator_paid_task6_replay_circuit_authority|20260813154500_comment_translator_paid_task6_dispatch_and_azure_partial_settlement|20260814100000_comment_translator_paid_task7_runtime_authority|20260814110000_comment_translator_paid_task9_retention_observability|20260815090000_comment_translator_paid_cron_vault_transport|20260818100000_comment_translator_paid_gate0a_poll_budget_rpc_repair|20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair|20260819110000_comment_translator_paid_gate0a_capacity_read_repair|20260823120000_comment_translator_paid_gate0a_unbound_hold_recovery|20260823130000_comment_translator_paid_gate0a_schedule_function_privilege_repair|20260826100000_comment_translator_paid_gate0a_checkout_recovery_window_floor|20260826110000_comment_translator_paid_gate0a_recovery_floor_second_canonicalization|20260827020609_comment_translator_paid_checkout_expiry_finalize_lease".split("|") },
];
const independentlyObservedCleanInstallHistory = "20260527000000_account_preferences_foundation|20260601000000_youtube_oauth_credentials|20260615000000_comment_translator_sessions|20260615001000_comment_translator_usage_ledger_events|20260623000000_comment_translator_real_comments_feed_snapshots|20260624000000_account_display_timezone_preference|20260705000000_comment_translator_creator_waitlist_registrations|20260706073204_supabase_default_privileges_guard|20260812120000_comment_translator_paid_core_v1|20260813130000_comment_translator_paid_task6_circuit_probe_claim|20260813131500_comment_translator_paid_task6_openai_rate_retry|20260813133000_comment_translator_paid_task6_owned_circuit_failure|20260813134500_comment_translator_paid_task6_azure_billing_split|20260813135500_comment_translator_paid_task6_azure_uncertain_retry_compatibility|20260813140000_comment_translator_paid_task6_azure_uncertain_retry|20260813141500_comment_translator_paid_task6_circuit_success_window|20260813143000_comment_translator_paid_task6_openai_resume_status|20260813144500_comment_translator_paid_task6_terminal_openai_partial|20260813150000_comment_translator_paid_task6_openai_partial_receipt|20260813151500_comment_translator_paid_task6_terminal_openai_partial_authority|20260813153000_comment_translator_paid_task6_replay_circuit_authority|20260813154500_comment_translator_paid_task6_dispatch_and_azure_partial_settlement|20260814100000_comment_translator_paid_task7_runtime_authority|20260814110000_comment_translator_paid_task9_retention_observability|20260815090000_comment_translator_paid_cron_vault_transport|20260818100000_comment_translator_paid_gate0a_poll_budget_rpc_repair|20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair|20260819110000_comment_translator_paid_gate0a_capacity_read_repair|20260823120000_comment_translator_paid_gate0a_unbound_hold_recovery|20260823130000_comment_translator_paid_gate0a_schedule_function_privilege_repair|20260826100000_comment_translator_paid_gate0a_checkout_recovery_window_floor|20260826110000_comment_translator_paid_gate0a_recovery_floor_second_canonicalization|20260827020609_comment_translator_paid_checkout_expiry_finalize_lease|20260829100000_comment_translator_paid_task6_azure_uncertain_retry_guard_repair".split("|");
const independentlyObservedAdditiveHistoryReadbacks = [
  "20260615000000_comment_translator_sessions|20260615001000_comment_translator_usage_ledger_events|20260623000000_comment_translator_real_comments_feed_snapshots|20260812120000_comment_translator_paid_core_v1|20260813130000_comment_translator_paid_task6_circuit_probe_claim|20260813131500_comment_translator_paid_task6_openai_rate_retry|20260813133000_comment_translator_paid_task6_owned_circuit_failure|20260813134500_comment_translator_paid_task6_azure_billing_split|20260813135500_comment_translator_paid_task6_azure_uncertain_retry_compatibility|20260813140000_comment_translator_paid_task6_azure_uncertain_retry|20260813141500_comment_translator_paid_task6_circuit_success_window|20260813143000_comment_translator_paid_task6_openai_resume_status|20260813144500_comment_translator_paid_task6_terminal_openai_partial|20260813150000_comment_translator_paid_task6_openai_partial_receipt|20260813151500_comment_translator_paid_task6_terminal_openai_partial_authority|20260813153000_comment_translator_paid_task6_replay_circuit_authority|20260813154500_comment_translator_paid_task6_dispatch_and_azure_partial_settlement|20260814100000_comment_translator_paid_task7_runtime_authority|20260814110000_comment_translator_paid_task9_retention_observability|20260815090000_comment_translator_paid_cron_vault_transport|20260818100000_comment_translator_paid_gate0a_poll_budget_rpc_repair|20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair|20260819110000_comment_translator_paid_gate0a_capacity_read_repair|20260823120000_comment_translator_paid_gate0a_unbound_hold_recovery|20260823130000_comment_translator_paid_gate0a_schedule_function_privilege_repair|20260826100000_comment_translator_paid_gate0a_checkout_recovery_window_floor|20260826110000_comment_translator_paid_gate0a_recovery_floor_second_canonicalization|20260827020609_comment_translator_paid_checkout_expiry_finalize_lease".split("|"),
  "20260615000000_comment_translator_sessions|20260615001000_comment_translator_usage_ledger_events|20260623000000_comment_translator_real_comments_feed_snapshots|20260812120000_comment_translator_paid_core_v1|20260813130000_comment_translator_paid_task6_circuit_probe_claim|20260813131500_comment_translator_paid_task6_openai_rate_retry|20260813133000_comment_translator_paid_task6_owned_circuit_failure|20260813134500_comment_translator_paid_task6_azure_billing_split|20260813135500_comment_translator_paid_task6_azure_uncertain_retry_compatibility|20260813140000_comment_translator_paid_task6_azure_uncertain_retry|20260813141500_comment_translator_paid_task6_circuit_success_window|20260813143000_comment_translator_paid_task6_openai_resume_status|20260813144500_comment_translator_paid_task6_terminal_openai_partial|20260813150000_comment_translator_paid_task6_openai_partial_receipt|20260813151500_comment_translator_paid_task6_terminal_openai_partial_authority|20260813153000_comment_translator_paid_task6_replay_circuit_authority|20260813154500_comment_translator_paid_task6_dispatch_and_azure_partial_settlement|20260814100000_comment_translator_paid_task7_runtime_authority|20260814110000_comment_translator_paid_task9_retention_observability|20260815090000_comment_translator_paid_cron_vault_transport|20260818100000_comment_translator_paid_gate0a_poll_budget_rpc_repair|20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair|20260819110000_comment_translator_paid_gate0a_capacity_read_repair|20260823120000_comment_translator_paid_gate0a_unbound_hold_recovery|20260823130000_comment_translator_paid_gate0a_schedule_function_privilege_repair|20260826100000_comment_translator_paid_gate0a_checkout_recovery_window_floor|20260826110000_comment_translator_paid_gate0a_recovery_floor_second_canonicalization|20260827020609_comment_translator_paid_checkout_expiry_finalize_lease|20260829100000_comment_translator_paid_task6_azure_uncertain_retry_guard_repair".split("|")
];

const sameVersionSourceMatches = [migrationName];
const absentRemotePaidMigrations = [
  "20260813135500_comment_translator_paid_task6_azure_uncertain_retry_compatibility",
  "20260829100000_comment_translator_paid_task6_azure_uncertain_retry_guard_repair"
];
const additiveAllowlist = [...absentRemotePaidMigrations];
const task6AzureFallbackFunctionIdentity = "public.ct_paid_azure_direct_fallback(text,text,uuid,text,timestamptz,timestamptz,date,bigint,timestamptz)";
const task6AzureFallbackAclEntries = Object.freeze([
  Object.freeze({ role: "owner/postgres", privileges: Object.freeze(["EXECUTE"]), grantOptions: Object.freeze([]) }),
  Object.freeze({ role: "public", privileges: Object.freeze([]), grantOptions: Object.freeze([]) }),
  Object.freeze({ role: "anon", privileges: Object.freeze([]), grantOptions: Object.freeze([]) }),
  Object.freeze({ role: "authenticated", privileges: Object.freeze([]), grantOptions: Object.freeze([]) }),
  Object.freeze({ role: "service_role", privileges: Object.freeze(["EXECUTE"]), grantOptions: Object.freeze([]) })
]);
const task6AzureFallbackSemanticMarkers = Object.freeze({
  hardenedUncertainRetryGuardCount: 1,
  legacyFirstGuardCount: 0,
  legacyUncertainGuardCount: 0,
  compatibilityMarkerCount: 1,
  providerIdempotencyMarkers: Object.freeze(["p_attempt_id", "p_provider_attempt", "provider_attempt <> v_shared_attempt.provider_attempt"]),
  providerBoundaryMarkers: Object.freeze(["provider_kind = openai_attempt", "attempt_state in committed,released", "provider_failure_class in invalid-response,rate-limit", "slot_state = released", "reservation_state = completed-or-released"]),
  authorityMarkers: Object.freeze(["owner_user_id", "session_reference_id", "period_start", "period_end", "utc_month", "reserved_cost_micros", "committed_cost_micros"])
});

const operatorStates = [
  "read-only-preflight",
  "semantic-hash-verification",
  "history-repair-complete",
  "only-two-allowlisted-additive-pending",
  "awaiting-additive-readback",
  "additive-complete",
  "post-apply-read-only-check"
];
const cleanInstallOrder = [
  "explicit-target-selection",
  "read-only-empty-history-revalidation",
  "canonical-local-migrations-once",
  "per-migration-readback",
  "clean-install-complete",
  "post-apply-read-only-check"
];
const previewOrder = [
  "explicit-preview-target-selection",
  "complete-history-semantic-hash-preflight",
  "preflight-verified",
  "history-only-repair-reverted-remote-then-applied-local",
  "history-repair-complete",
  "dry-run-explicit-two-file-allowlist",
  "only-two-allowlisted-additive-pending",
  "first-additive-awaiting-readback",
  "first-additive-readback-succeeded",
  "second-additive-awaiting-readback",
  "additive-complete",
  "post-apply-read-only-check"
];
const forbiddenOperatorActions = [
  "blind-db-push",
  "historical-sql-rerun",
  "destructive-remote-rollback-sql",
  "automatic-retry-after-uncertain-external-state"
];
const stopConditions = [
  "target-not-explicit-or-mismatched",
  "clean-install-history-not-empty-or-unknown",
  "semantic-or-hash-mismatch",
  "secret-or-private-identifier-detected",
  "unknown-or-duplicate-migration",
  "unexpected-pending-migration",
  "repair-apply-or-readback-error",
  "partial-state"
];

function normalizeSql(source) {
  return source
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .trim();
}

function extractPlanSql(plan) {
  const match = plan.match(/Embed and compare against this fixed seven-statement canonical fixture[\s\S]*?```sql\r?\n([\s\S]*?)\r?\n```/);
  assert.ok(match, "plan canonical SQL block is extractable");
  return match[1];
}

function parseOperatorMappingRows(operatorDocument) {
  const rows = [];
  for (const line of operatorDocument.split(/\r?\n/)) {
    const match = line.match(/^\| `([^`]+)` \| `([^`]+)` \| (.+) \|$/);
    if (!match) continue;
    const [, remoteName, localName, treatment] = match;
    let category;
    if (/Same-name timestamp mismatch; history-only mapping\./.test(treatment)) {
      category = "timestamp-mismatch";
    } else if (/Semantic (?:lifecycle|capacity) repair already applied under a noncanonical remote name\/timestamp; history-only mapping\./.test(treatment)) {
      category = "semantic-noncanonical";
    } else if (/Same-version source match; never repair or rerun it\./.test(treatment)) {
      category = "same-version-source-match";
    } else {
      continue;
    }
    rows.push([remoteName, localName, category]);
  }
  return rows;
}

function assertOperatorMappingRows(rows) {
  assert.deepEqual(rows, [
    [migrationName, migrationName, "same-version-source-match"],
    ...expectedOperatorMappings
  ], "active operator mapping rows match the independent fixed remote-to-local oracle");
}

function stopPreviewFixture(state, reason) {
  if (state.stopped) return state;
  return { ...state, phase: "stopped", stopped: true, stopReason: reason };
}

function createExternalObservationSession(targetKind) {
  const session = Object.freeze({ targetKind });
  externalObservationSessions.add(session);
  return session;
}

function observationStateFingerprint(state, expectedHistory) {
  return sha256(JSON.stringify({
    targetKind: state.targetKind,
    phase: state.phase,
    history: state.history,
    expectedHistory,
    repairIndex: state.repairIndex,
    additiveIndex: state.additiveIndex,
    migrationIndex: state.migrationIndex,
    pendingReadback: state.pendingReadback,
    pendingHistoryPair: state.pendingHistoryPair,
    operations: state.operations,
    sqlExecutions: state.sqlExecutions
  }));
}

function externalObservationPayloadDigest(envelope) {
  const seen = new WeakMap();
  const visiting = new WeakSet();
  let nextReference = 0;
  let entries = 0;
  function serialize(value, depth) {
    assert.ok(depth <= 32 && entries <= 4096, "trusted external observation receipt payload exceeds the bounded digest shape");
    if (value === null || typeof value !== "object") return JSON.stringify([typeof value, value]);
    assert.equal(visiting.has(value), false, "trusted external observation receipt rejects cyclic source or envelope input");
    if (seen.has(value)) return JSON.stringify(["reference", seen.get(value)]);
    const reference = nextReference;
    nextReference += 1;
    seen.set(value, reference);
    visiting.add(value);
    if (Array.isArray(value)) {
      entries += value.length;
      const serialized = `["array",${reference},${value.map((item) => serialize(item, depth + 1)).join(",")}]`;
      visiting.delete(value);
      return serialized;
    }
    const keys = Object.keys(value).sort();
    entries += keys.length;
    const serialized = `["object",${reference},${keys.map((key) => `${JSON.stringify(key)}:${serialize(value[key], depth + 1)}`).join(",")}]`;
    visiting.delete(value);
    return serialized;
  }
  return sha256(serialize(envelope, 0));
}

function issueTrustedExternalObservationSourceReceipt(adapter, source, issuer) {
  assert.ok(trustedExternalObservationAdapters.has(adapter), "external observation receipt requires a trusted read-only adapter");
  const sourceBinding = observationSourceRegistry.get(source);
  assert.ok(
    sourceBinding?.adapter === adapter
      && sourceBinding.authorityKind === "trusted-external-read-only-observation-source"
      && sourceBinding.sourceKind === "independent-external-read-only-acquisition"
      && sourceBinding.fixtureKind === undefined
      && opaqueExternalAdapterSourceLineages.has(sourceBinding.sourceLineage)
      && trustedExternalObservationSourceTokens.has(sourceBinding.sourceToken),
    "external observation capability requires an opaque external adapter source lineage before receipt issuance"
  );
  const issuerBinding = externalObservationIssuerRegistry.get(issuer);
  assert.ok(issuerBinding, "trusted external observation receipt requires a request-bound private issuer");
  const requestBinding = externalObservationRequestRegistry.get(issuerBinding.requestToken);
  assert.ok(requestBinding?.open, "closed external observation issuer cannot receive a trusted receipt");
  const sourceRequestToken = Object.freeze({});
  observationSourceRequestTokens.add(sourceRequestToken);
  const envelope = sourceBinding.readObservation(Object.freeze({
    sourceRequestToken,
    targetKind: issuerBinding.targetKind,
    observationKind: issuerBinding.observationKind,
    subject: issuerBinding.subject,
    expectedHistory: Object.freeze([...JSON.parse(issuerBinding.expectedHistory)])
  }));
  assert.ok(envelope && !Array.isArray(envelope) && typeof envelope === "object", "trusted external observation source must return an envelope object");
  assert.equal(typeof envelope.then, "undefined", "trusted external observation source fixture must be synchronous");
  assert.equal(hasRejectedObservationLabel(envelope), "clear", "trusted external observation receipt rejects non-live, static, relabelled, self-generated, cyclic, or unbounded source/envelope input before issuance");
  const receipt = Object.freeze({});
  trustedExternalObservationReceiptRegistry.set(receipt, {
    adapter,
    source,
    sourceToken: sourceBinding.sourceToken,
    sourceRequestToken,
    requestToken: issuerBinding.requestToken,
    session: requestBinding.session,
    targetKind: issuerBinding.targetKind,
    observationKind: issuerBinding.observationKind,
    subject: issuerBinding.subject,
    expectedHistory: issuerBinding.expectedHistory,
    stateFingerprint: issuerBinding.stateFingerprint,
    envelope,
    payloadDigest: externalObservationPayloadDigest(envelope),
    authorityClass: "trusted-external",
    consumed: false
  });
  return Object.freeze({ envelope, sourceReceipt: receipt });
}

function createTrustedExternalReadOnlyObservationAdapter() {
  let adapter;
  adapter = Object.freeze({
    acquireSourceObservation: (source, issuer) => issueTrustedExternalObservationSourceReceipt(adapter, source, issuer)
  });
  trustedExternalObservationAdapters.add(adapter);
  return adapter;
}

const trustedExternalReadOnlyObservationAdapter = createTrustedExternalReadOnlyObservationAdapter();

function createDeterministicReadOnlyObservationSourceFixture(readObservation) {
  assert.equal(typeof readObservation, "function", "deterministic read-only observation source fixture requires a reader");
  const source = Object.freeze({});
  const sourceToken = Object.freeze({});
  observationSourceRegistry.set(source, {
    adapter: trustedExternalReadOnlyObservationAdapter,
    sourceToken,
    readObservation,
    authorityKind: "deterministic-contract-source-fixture-not-live",
    fixtureKind: "deterministic-contract-source-fixture-not-live"
  });
  return source;
}

function createInternalStateMachineReadOnlyObservationSourceFixture(readObservation) {
  assert.equal(typeof readObservation, "function", "internal state-machine observation fixture requires a reader");
  const source = Object.freeze({});
  const sourceToken = Object.freeze({});
  internalObservationSourceTokens.add(sourceToken);
  observationSourceRegistry.set(source, {
    sourceToken,
    readObservation,
    authorityKind: "internal-state-machine-fixture-not-live",
    fixtureKind: "internal-state-machine-fixture-not-live"
  });
  return source;
}

function acquireTrustedExternalObservation(issuer, source) {
  return trustedExternalReadOnlyObservationAdapter.acquireSourceObservation(source, issuer);
}

function issueTrustedExternalObservation(issuer, source) {
  const { envelope, sourceReceipt } = acquireTrustedExternalObservation(issuer, source);
  return issuer.issue(envelope, sourceReceipt);
}

function acquireInternalStateMachineObservation(issuer, source) {
  const sourceBinding = observationSourceRegistry.get(source);
  assert.ok(
    sourceBinding?.authorityKind === "internal-state-machine-fixture-not-live"
      && internalObservationSourceTokens.has(sourceBinding.sourceToken),
    "internal state-machine observation requires an explicit not-live fixture source"
  );
  const issuerBinding = externalObservationIssuerRegistry.get(issuer);
  assert.ok(issuerBinding, "internal state-machine observation requires a request-bound private issuer");
  const requestBinding = externalObservationRequestRegistry.get(issuerBinding.requestToken);
  assert.ok(requestBinding?.open, "closed external observation issuer cannot receive an internal fixture receipt");
  const sourceRequestToken = Object.freeze({});
  observationSourceRequestTokens.add(sourceRequestToken);
  const envelope = sourceBinding.readObservation(Object.freeze({
    sourceRequestToken,
    targetKind: issuerBinding.targetKind,
    observationKind: issuerBinding.observationKind,
    subject: issuerBinding.subject,
    expectedHistory: Object.freeze([...JSON.parse(issuerBinding.expectedHistory)])
  }));
  assert.ok(envelope && !Array.isArray(envelope) && typeof envelope === "object", "internal state-machine source must return an envelope object");
  assert.equal(typeof envelope.then, "undefined", "internal state-machine source fixture must be synchronous");
  const receipt = Object.freeze({});
  trustedExternalObservationReceiptRegistry.set(receipt, {
    adapter: undefined,
    source,
    sourceToken: sourceBinding.sourceToken,
    sourceRequestToken,
    requestToken: issuerBinding.requestToken,
    session: requestBinding.session,
    targetKind: issuerBinding.targetKind,
    observationKind: issuerBinding.observationKind,
    subject: issuerBinding.subject,
    expectedHistory: issuerBinding.expectedHistory,
    stateFingerprint: issuerBinding.stateFingerprint,
    envelope,
    payloadDigest: externalObservationPayloadDigest(envelope),
    authorityClass: "internal-state-machine-fixture-not-live",
    consumed: false
  });
  return { envelope, sourceReceipt: receipt };
}

function issueInternalStateMachineObservation(issuer, source) {
  const { envelope, sourceReceipt } = acquireInternalStateMachineObservation(issuer, source);
  return issuer.issue(envelope, sourceReceipt);
}

function issueExternalObservationEnvelope(envelope, issuer, receipt) {
  assert.ok(envelope && !Array.isArray(envelope) && typeof envelope === "object", "external observation provider must return an envelope object");
  const issuerBinding = externalObservationIssuerRegistry.get(issuer);
  assert.ok(issuerBinding, "external observation capability requires a request-bound private issuer");
  const requestBinding = externalObservationRequestRegistry.get(issuerBinding.requestToken);
  assert.ok(requestBinding?.open, "closed external observation issuer cannot issue a capability");
  assert.equal(issuerBinding.issued, false, "external observation issuer already issued a capability");
  const receiptBinding = receipt && trustedExternalObservationReceiptRegistry.get(receipt);
  const sourceBinding = receiptBinding && observationSourceRegistry.get(receiptBinding.source);
  const hasTrustedExternalAuthority = receiptBinding?.authorityClass === "trusted-external"
    && trustedExternalObservationAdapters.has(receiptBinding.adapter)
    && sourceBinding?.sourceToken === receiptBinding.sourceToken
    && sourceBinding?.authorityKind === "trusted-external-read-only-observation-source"
    && opaqueExternalAdapterSourceLineages.has(sourceBinding.sourceLineage)
    && trustedExternalObservationSourceTokens.has(receiptBinding.sourceToken);
  const hasInternalFixtureAuthority = receiptBinding?.authorityClass === "internal-state-machine-fixture-not-live"
    && receiptBinding.adapter === undefined
    && sourceBinding?.sourceToken === receiptBinding.sourceToken
    && sourceBinding?.authorityKind === "internal-state-machine-fixture-not-live"
    && internalObservationSourceTokens.has(receiptBinding.sourceToken);
  assert.ok(
    receiptBinding?.consumed === false
      && (hasTrustedExternalAuthority || hasInternalFixtureAuthority)
      && observationSourceRequestTokens.has(receiptBinding.sourceRequestToken)
      && receiptBinding.requestToken === issuerBinding.requestToken
      && receiptBinding.session === requestBinding.session
      && receiptBinding.targetKind === issuerBinding.targetKind
      && receiptBinding.observationKind === issuerBinding.observationKind
      && receiptBinding.subject === issuerBinding.subject
      && receiptBinding.expectedHistory === issuerBinding.expectedHistory
      && receiptBinding.stateFingerprint === issuerBinding.stateFingerprint
      && receiptBinding.envelope === envelope
      && receiptBinding.payloadDigest === externalObservationPayloadDigest(envelope),
    "external observation capability requires a trusted read-only observation adapter source receipt bound to the exact source, request, and payload"
  );
  receiptBinding.consumed = true;
  issuerBinding.issued = true;
  const capability = Object.freeze({});
  const issuedEnvelope = Object.freeze({ ...envelope, [operatorExternalObservationCapability]: capability });
  externalObservationCapabilityRegistry.set(capability, {
    requestToken: issuerBinding.requestToken,
    session: requestBinding.session,
    targetKind: issuerBinding.targetKind,
    observationKind: issuerBinding.observationKind,
    subject: issuerBinding.subject,
    expectedHistory: issuerBinding.expectedHistory,
    stateFingerprint: issuerBinding.stateFingerprint,
    trustedAdapter: receiptBinding.adapter,
    source: receiptBinding.source,
    sourceToken: receiptBinding.sourceToken,
    sourceRequestToken: receiptBinding.sourceRequestToken,
    receipt,
    payloadDigest: receiptBinding.payloadDigest,
    authorityClass: receiptBinding.authorityClass,
    envelope: issuedEnvelope,
    callbackReturnConfirmed: false,
    invalidated: false,
    consumed: false
  });
  return issuedEnvelope;
}

function externalObservationCapabilityMatches(state, envelope, { observationKind, subject, expectedHistory }) {
  const capability = envelope?.[operatorExternalObservationCapability];
  if (!capability || typeof capability !== "object") return false;
  const binding = externalObservationCapabilityRegistry.get(capability);
  const receiptBinding = binding?.receipt && trustedExternalObservationReceiptRegistry.get(binding.receipt);
  const sourceBinding = binding && observationSourceRegistry.get(binding.source);
  const authorityMatches = binding?.authorityClass === "trusted-external"
    ? trustedExternalObservationAdapters.has(binding.trustedAdapter)
      && sourceBinding?.sourceToken === binding.sourceToken
      && sourceBinding?.authorityKind === "trusted-external-read-only-observation-source"
      && opaqueExternalAdapterSourceLineages.has(sourceBinding.sourceLineage)
      && trustedExternalObservationSourceTokens.has(binding.sourceToken)
    : binding?.authorityClass === "internal-state-machine-fixture-not-live"
      ? binding.trustedAdapter === undefined
        && sourceBinding?.sourceToken === binding.sourceToken
        && sourceBinding?.authorityKind === "internal-state-machine-fixture-not-live"
        && internalObservationSourceTokens.has(binding.sourceToken)
      : false;
  const matches = binding?.consumed === false
    && binding.callbackReturnConfirmed === true
    && binding.invalidated === false
    && binding.session === state[externalObservationSession]
    && binding.targetKind === state.targetKind
    && binding.observationKind === observationKind
    && binding.subject === subject
    && binding.expectedHistory === JSON.stringify(expectedHistory)
    && binding.stateFingerprint === observationStateFingerprint(state, expectedHistory)
    && authorityMatches
    && receiptBinding?.consumed === true
    && receiptBinding.adapter === binding.trustedAdapter
    && receiptBinding.source === binding.source
    && receiptBinding.sourceToken === binding.sourceToken
    && receiptBinding.sourceRequestToken === binding.sourceRequestToken
    && observationSourceRequestTokens.has(binding.sourceRequestToken)
    && receiptBinding.requestToken === binding.requestToken
    && receiptBinding.session === binding.session
    && receiptBinding.targetKind === binding.targetKind
    && receiptBinding.observationKind === binding.observationKind
    && receiptBinding.subject === binding.subject
    && receiptBinding.expectedHistory === binding.expectedHistory
    && receiptBinding.stateFingerprint === binding.stateFingerprint
    && receiptBinding.payloadDigest === binding.payloadDigest
    && binding.payloadDigest === externalObservationPayloadDigest(envelope)
    && binding.envelope === envelope;
  if (!matches) return false;
  binding.consumed = true;
  return binding.authorityClass;
}

function createExternalObservationIssuer(requestToken, requestBinding, {
  observationKind,
  subject,
  expectedHistory
}, extra = {}) {
  let issuer;
  issuer = Object.freeze({
    targetKind: requestBinding.targetKind,
    observationKind,
    subject,
    expectedHistory: Object.freeze([...expectedHistory]),
    ...extra,
    issue: (envelope, receipt) => issueExternalObservationEnvelope(envelope, issuer, receipt)
  });
  externalObservationIssuerRegistry.set(issuer, {
    requestToken,
    targetKind: requestBinding.targetKind,
    observationKind,
    subject,
    expectedHistory: JSON.stringify(expectedHistory),
    stateFingerprint: observationStateFingerprint(requestBinding.state, expectedHistory),
    issued: false
  });
  return issuer;
}

function bindReturnedExternalObservationEnvelope(envelope, requestToken) {
  if (!envelope || Array.isArray(envelope) || typeof envelope !== "object") return;
  const capability = envelope[operatorExternalObservationCapability];
  const binding = capability && externalObservationCapabilityRegistry.get(capability);
  if (!binding) return;
  if (binding.requestToken === requestToken) binding.callbackReturnConfirmed = true;
  else binding.invalidated = true;
}

function injectExternalReadOnlyObservation(observe, request, expectedTargetKind, adapterLabel) {
  assert.equal(typeof observe, "function", `external ${adapterLabel} observation adapter requires an explicit callback`);
  const { state, observationKind, subject, expectedHistory } = request;
  const session = state?.[externalObservationSession];
  assert.ok(externalObservationSessions.has(session), `external ${adapterLabel} observation adapter requires a current observation session`);
  assert.equal(state.targetKind, expectedTargetKind, `external ${adapterLabel} observation adapter requires the expected target`);
  const requestToken = Object.freeze({});
  const requestBinding = {
    open: true,
    session,
    state,
    targetKind: state.targetKind
  };
  externalObservationRequestRegistry.set(requestToken, requestBinding);
  const pairEvidenceIssuer = expectedTargetKind === "preview"
    && observationKind === "preflight"
    && subject === "preflight"
    ? createExternalObservationIssuer(requestToken, requestBinding, {
      observationKind: "pair-evidence",
      subject: "preflight-pairs",
      expectedHistory
    })
    : undefined;
  const issuer = createExternalObservationIssuer(
    requestToken,
    requestBinding,
    { observationKind, subject, expectedHistory },
    pairEvidenceIssuer ? { pairEvidenceIssuer } : {}
  );
  const closeRequest = () => {
    requestBinding.open = false;
    externalObservationRequestRegistry.delete(requestToken);
  };
  let envelope;
  try {
    envelope = observe(issuer);
  } catch (error) {
    closeRequest();
    throw error;
  }
  let isPromiseResult;
  try {
    isPromiseResult = envelope && typeof envelope.then === "function";
  } catch (error) {
    closeRequest();
    throw error;
  }
  if (isPromiseResult) {
    return Promise.resolve(envelope).then(
      (resolvedEnvelope) => {
        try {
          bindReturnedExternalObservationEnvelope(resolvedEnvelope, requestToken);
          bindReturnedExternalObservationEnvelope(resolvedEnvelope?.pairEvidenceEnvelope, requestToken);
          return resolvedEnvelope;
        } finally {
          closeRequest();
        }
      },
      (error) => {
        closeRequest();
        throw error;
      }
    );
  }
  try {
    bindReturnedExternalObservationEnvelope(envelope, requestToken);
    bindReturnedExternalObservationEnvelope(envelope?.pairEvidenceEnvelope, requestToken);
    return envelope;
  } finally {
    closeRequest();
  }
}

function createPreviewFixture({ targetKind } = {}) {
  return {
    targetKind,
    [externalObservationSession]: createExternalObservationSession(targetKind),
    contractFixtureOnly: true,
    history: null,
    preflightVerified: false,
    pairEvidenceVerified: false,
    pairEvidenceMode: null,
    pairEvidenceRecords: null,
    phase: "preview-preflight",
    repairIndex: 0,
    additiveIndex: 0,
    pendingReadback: null,
    pendingHistoryPair: null,
    operations: [],
    sqlExecutions: [],
    stopped: false,
    stopReason: null
  };
}

function pairEvidenceCoreMatches(observed, expected) {
  if (!observed || !expected) return false;
  return observed.remoteName === expected.remoteName
    && observed.localName === expected.localName
    && observed.category === expected.category
    && observed.semanticEvidenceSha256 === expected.semanticEvidenceSha256
    && observed.privilegeEvidenceSha256 === expected.privilegeEvidenceSha256
    && observed.ownerLeaseEvidenceSha256 === expected.ownerLeaseEvidenceSha256;
}

function validatePairEvidenceEnvelope(state, envelope) {
  if (!envelope) return { stop: stopPreviewFixture(state, "preview-pair-evidence-envelope-missing") };
  if (envelope.result === "failure") return { stop: stopPreviewFixture(state, "preview-pair-evidence-envelope-failure") };
  if (envelope.result === "uncertain") return { stop: stopPreviewFixture(state, "preview-pair-evidence-envelope-uncertain") };
  if (envelope.result !== "success") return { stop: stopPreviewFixture(state, "preview-pair-evidence-envelope-result-missing-or-unverified") };
  if (!Array.isArray(envelope.records) || envelope.records.length !== expectedPairEvidenceRecords.length) {
    return { stop: stopPreviewFixture(state, "preview-pair-evidence-envelope-wrong-count") };
  }
  const mappingKeys = envelope.records.map((record) => `${record.remoteName}|${record.localName}`);
  if (new Set(mappingKeys).size !== mappingKeys.length) {
    return { stop: stopPreviewFixture(state, "preview-pair-evidence-envelope-duplicate") };
  }

  const labelStatus = hasRejectedObservationLabel(envelope);
  if (labelStatus === "invalid") {
    return { stop: stopPreviewFixture(state, "preview-invalid-observation") };
  }
  if (labelStatus === "rejected") {
    return { stop: stopPreviewFixture(state, "preview-not-live-static-evidence-rejected") };
  }
  if (envelope.provenance?.kind !== externalPairEvidenceSource
    || envelope.provenance?.liveObservation !== true
    || envelope.freshness?.status !== "fresh"
    || envelope.freshness?.marker !== externalEvidenceFreshnessMarker) {
    return { stop: stopPreviewFixture(state, "preview-external-evidence-provenance-or-freshness-missing") };
  }
  if (envelope.targetKind !== "preview" || envelope.targetKind !== state.targetKind) {
    return { stop: stopPreviewFixture(state, "preview-pair-evidence-envelope-target-mismatch") };
  }
  for (const [index, record] of envelope.records.entries()) {
    if (record.evidenceStatus === "failure") return { stop: stopPreviewFixture(state, "preview-pair-evidence-envelope-failure") };
    if (record.evidenceStatus === "uncertain") return { stop: stopPreviewFixture(state, "preview-pair-evidence-envelope-uncertain") };
    if (record.evidenceStatus !== "verified") return { stop: stopPreviewFixture(state, "preview-pair-evidence-envelope-unverified") };
    if (!pairEvidenceCoreMatches(record, expectedPairEvidenceRecords[index])) {
      return { stop: stopPreviewFixture(state, "preview-pair-evidence-envelope-mismatch") };
    }
    if (record.evidenceSource !== externalPairEvidenceSource
      || record.freshnessMarker !== externalEvidenceFreshnessMarker) {
      return { stop: stopPreviewFixture(state, "preview-external-evidence-provenance-or-freshness-missing") };
    }
  }
  const capabilityAuthority = externalObservationCapabilityMatches(state, envelope, {
    observationKind: "pair-evidence",
    subject: "preflight-pairs",
    expectedHistory: remoteMigrations
  });
  if (!capabilityAuthority) {
    return { stop: stopPreviewFixture(state, "preview-external-observation-capability-missing") };
  }

  return {
    records: envelope.records.map((record) => ({ ...record })),
    mode: capabilityAuthority === "trusted-external" ? externalPairEvidenceSource : "internal-state-machine-fixture-not-live",
    operatorCapabilityVerified: capabilityAuthority === "trusted-external"
  };
}

function historiesMatchExactly(observedHistory, expectedHistory) {
  if (!Array.isArray(observedHistory) || !Array.isArray(expectedHistory)) return false;
  if (observedHistory.length !== new Set(observedHistory).size) return false;
  if (expectedHistory.length !== new Set(expectedHistory).size) return false;
  return JSON.stringify(sorted(observedHistory)) === JSON.stringify(sorted(expectedHistory));
}

function historiesMatchExactlyInOrder(observedHistory, expectedHistory) {
  if (!Array.isArray(observedHistory) || !Array.isArray(expectedHistory)) return false;
  if (observedHistory.length !== new Set(observedHistory).size) return false;
  if (expectedHistory.length !== new Set(expectedHistory).size) return false;
  return JSON.stringify(observedHistory) === JSON.stringify(expectedHistory);
}

function previewObservationFreshnessMarker(observationKind, subject) {
  return `fresh-for-current-preview-${observationKind}:${subject}`;
}

function cleanInstallObservationFreshnessMarker(observationKind, subject) {
  return `fresh-for-current-clean-install-${observationKind}:${subject}`;
}

function hasRejectedObservationLabel(value, { maxDepth = 16, maxEntries = 512 } = {}) {
  const visiting = new WeakSet();
  const visited = new WeakSet();
  let entriesVisited = 0;

  function inspect(current, depth) {
    if (!current || typeof current !== "object") return "clear";
    if (depth > maxDepth || entriesVisited >= maxEntries) return "invalid";
    if (visiting.has(current)) return "invalid";
    if (visited.has(current)) return "clear";
    visiting.add(current);
    let entries;
    try {
      entries = Object.entries(current);
    } catch {
      visiting.delete(current);
      return "invalid";
    }
    for (const [key, nested] of entries) {
      entriesVisited += 1;
      if (entriesVisited > maxEntries) {
        visiting.delete(current);
        return "invalid";
      }
      if (/label/i.test(key)
        && typeof nested === "string"
        && /(?:not-live|non-live|static|test-shaped|fixture|issued-but-static|self-generated|relabelled)/i.test(nested)) {
        visiting.delete(current);
        return "rejected";
      }
      const nestedStatus = inspect(nested, depth + 1);
      if (nestedStatus !== "clear") {
        visiting.delete(current);
        return nestedStatus;
      }
    }
    visiting.delete(current);
    visited.add(current);
    return "clear";
  }

  return inspect(value, 0);
}

function injectExternalPreviewReadOnlyObservation(observe, request) {
  return injectExternalReadOnlyObservation(observe, request, "preview", "Preview");
}

function injectExternalCleanInstallReadOnlyObservation(observe, request) {
  return injectExternalReadOnlyObservation(observe, request, "isolated-empty", "clean-install");
}

function validateExternalPreviewReadOnlyObservation(state, envelope, {
  observationKind,
  subject,
  expectedHistory,
  stopPrefix
}) {
  if (!envelope || Array.isArray(envelope) || typeof envelope !== "object") {
    return { stop: stopPreviewFixture(state, `${stopPrefix}-observation-envelope-missing`) };
  }
  if (envelope.result === "failure") return { stop: stopPreviewFixture(state, `${stopPrefix}-failure`) };
  if (envelope.result === "uncertain") return { stop: stopPreviewFixture(state, `${stopPrefix}-uncertain`) };
  if (envelope.result === undefined) return { stop: stopPreviewFixture(state, `${stopPrefix}-result-missing`) };
  if (envelope.result !== "success") return { stop: stopPreviewFixture(state, `${stopPrefix}-unverified`) };
  const labelStatus = hasRejectedObservationLabel(envelope);
  if (labelStatus === "invalid") {
    return { stop: stopPreviewFixture(state, `${stopPrefix}-invalid-observation`) };
  }
  if (labelStatus === "rejected") {
    return { stop: stopPreviewFixture(state, `${stopPrefix}-not-live-static-observation-rejected`) };
  }
  if (envelope.targetKind !== "preview" || envelope.targetKind !== state.targetKind) {
    return { stop: stopPreviewFixture(state, `${stopPrefix}-observation-target-mismatch`) };
  }
  if (envelope.provenance?.kind !== externalPairEvidenceSource
    || envelope.provenance?.liveObservation !== true
    || envelope.freshness?.status !== "fresh"
    || envelope.freshness?.marker !== previewObservationFreshnessMarker(observationKind, subject)) {
    return { stop: stopPreviewFixture(state, `${stopPrefix}-observation-provenance-or-freshness-missing`) };
  }
  if (!externalObservationCapabilityMatches(state, envelope, { observationKind, subject, expectedHistory })) {
    return { stop: stopPreviewFixture(state, `${stopPrefix}-observation-capability-missing`) };
  }
  return { observation: envelope };
}

function validateExternalCleanInstallReadOnlyObservation(state, envelope, {
  observationKind,
  subject,
  expectedHistory,
  stopPrefix
}) {
  if (!envelope || Array.isArray(envelope) || typeof envelope !== "object") {
    return { stop: stopCleanInstallFixture(state, `${stopPrefix}-observation-envelope-missing`) };
  }
  if (envelope.result === "failure") return { stop: stopCleanInstallFixture(state, `${stopPrefix}-failure`) };
  if (envelope.result === "uncertain") return { stop: stopCleanInstallFixture(state, `${stopPrefix}-uncertain`) };
  if (envelope.result === undefined) return { stop: stopCleanInstallFixture(state, `${stopPrefix}-result-missing`) };
  if (envelope.result !== "success") return { stop: stopCleanInstallFixture(state, `${stopPrefix}-unverified`) };
  const labelStatus = hasRejectedObservationLabel(envelope);
  if (labelStatus === "invalid") return { stop: stopCleanInstallFixture(state, `${stopPrefix}-invalid-observation`) };
  if (labelStatus === "rejected") return { stop: stopCleanInstallFixture(state, `${stopPrefix}-not-live-static-observation-rejected`) };
  if (envelope.targetKind !== "isolated-empty" || envelope.targetKind !== state.targetKind) {
    return { stop: stopCleanInstallFixture(state, `${stopPrefix}-observation-target-mismatch`) };
  }
  if (envelope.provenance?.kind !== externalPairEvidenceSource
    || envelope.provenance?.liveObservation !== true
    || envelope.freshness?.status !== "fresh"
    || envelope.freshness?.marker !== cleanInstallObservationFreshnessMarker(observationKind, subject)) {
    return { stop: stopCleanInstallFixture(state, `${stopPrefix}-observation-provenance-or-freshness-missing`) };
  }
  if (!externalObservationCapabilityMatches(state, envelope, { observationKind, subject, expectedHistory })) {
    return { stop: stopCleanInstallFixture(state, `${stopPrefix}-observation-capability-missing`) };
  }
  if (!historiesMatchExactlyInOrder(envelope.observedHistory, expectedHistory)) {
    return { stop: stopCleanInstallFixture(state, `${stopPrefix}-inventory-mismatch`) };
  }
  return { observation: envelope };
}

function completePreviewPreflight(state, observationEnvelope) {
  if (state.stopped) return state;
  if (state.targetKind !== "preview") return stopPreviewFixture(state, "preview-target-not-confirmed");
  if (state.phase !== "preview-preflight" || state.preflightVerified || state.operations.length !== 0 || state.sqlExecutions.length !== 0) {
    return stopPreviewFixture(state, "partial-history-state");
  }
  if (!observationEnvelope || Array.isArray(observationEnvelope) || typeof observationEnvelope !== "object") {
    return stopPreviewFixture(state, "preview-preflight-observation-envelope-missing");
  }
  const {
    observedHistory,
    observedBodySemanticMd5,
    observedFunctionDefinitionMd5,
    result,
    pairEvidenceEnvelope
  } = observationEnvelope;
  if (result === "failure") return stopPreviewFixture(state, "preview-preflight-failure");
  if (result === "uncertain") return stopPreviewFixture(state, "preview-preflight-uncertain");
  if (result === undefined) return stopPreviewFixture(state, "preview-preflight-result-missing");
  if (result !== "success") return stopPreviewFixture(state, "preview-preflight-unverified");
  const labelStatus = hasRejectedObservationLabel(observationEnvelope);
  if (labelStatus === "invalid") return stopPreviewFixture(state, "preview-preflight-invalid-observation");
  if (labelStatus === "rejected"
    || observationEnvelope.provenance?.kind === testOnlyEvidenceProvenance.kind
    || observationEnvelope.provenance?.liveObservation === false) {
    return stopPreviewFixture(state, "preview-not-live-static-evidence-rejected");
  }
  if (observationEnvelope.targetKind !== "preview"
    || observationEnvelope.provenance?.kind !== externalPairEvidenceSource
    || observationEnvelope.provenance?.liveObservation !== true
    || observationEnvelope.freshness?.status !== "fresh"
    || observationEnvelope.freshness?.marker !== previewObservationFreshnessMarker("preflight", "preflight")) {
    return stopPreviewFixture(state, "preview-preflight-observation-provenance-or-freshness-missing");
  }
  if (!historiesMatchExactly(observedHistory, remoteMigrations)) {
    return stopPreviewFixture(state, "preview-history-inventory-mismatch");
  }
  if (observedBodySemanticMd5 !== remoteFunctionBodySemanticMd5 || observedFunctionDefinitionMd5 !== remoteFunctionDefinitionMd5) {
    return stopPreviewFixture(state, "preview-semantic-or-hash-mismatch");
  }
  const evidenceGate = validatePairEvidenceEnvelope(state, pairEvidenceEnvelope);
  if (evidenceGate.stop) return evidenceGate.stop;
  if (!externalObservationCapabilityMatches(state, observationEnvelope, {
    observationKind: "preflight",
    subject: "preflight",
    expectedHistory: remoteMigrations
  })) {
    return stopPreviewFixture(state, "preview-external-observation-capability-missing");
  }
  return {
    ...state,
    history: [...observedHistory],
    preflightVerified: true,
    pairEvidenceVerified: true,
    pairEvidenceMode: evidenceGate.mode,
    pairEvidenceRecords: evidenceGate.records,
    phase: "history-only-repair"
  };
}

function createTestShapedExternalPreviewFixture() {
  return completePreviewPreflight(createPreviewFixture({ targetKind: "preview" }), {
    observedHistory: remoteMigrations,
    observedBodySemanticMd5: remoteFunctionBodySemanticMd5,
    observedFunctionDefinitionMd5: remoteFunctionDefinitionMd5,
    result: "success",
    targetKind: "preview",
    provenance: { kind: externalPairEvidenceSource, liveObservation: true },
    freshness: { status: "fresh", marker: previewObservationFreshnessMarker("preflight", "preflight") },
    [operatorExternalObservationCapability]: Object.freeze({}),
    fixtureLabel: "static-test-shaped-preflight-envelope",
    pairEvidenceEnvelope: testShapedExternalPairEvidenceEnvelope
  });
}

function createOpaqueOperatorObservedPreviewFixture() {
  const state = createPreviewFixture({ targetKind: "preview" });
  const observationEnvelope = injectExternalPreviewReadOnlyObservation(
    independentExternalPreviewPreflightProvider,
    { state, observationKind: "preflight", subject: "preflight", expectedHistory: remoteMigrations }
  );
  return completePreviewPreflight(state, observationEnvelope);
}

function assertUntouchedSameVersion(state) {
  return state.history.filter((name) => name === migrationName).length === 1;
}

function pairMatches(left, right) {
  return left?.[0] === right?.[0] && left?.[1] === right?.[1] && left?.[2] === right?.[2];
}

function pairEvidenceMatches(observed, expected) {
  if (!observed || !expected) return false;
  return observed.remoteName === expected.remoteName
    && observed.localName === expected.localName
    && observed.category === expected.category
    && observed.semanticEvidenceSha256 === expected.semanticEvidenceSha256
    && observed.privilegeEvidenceSha256 === expected.privilegeEvidenceSha256
    && observed.ownerLeaseEvidenceSha256 === expected.ownerLeaseEvidenceSha256
    && observed.evidenceStatus === expected.evidenceStatus
    && observed.evidenceSource === expected.evidenceSource
    && observed.operatorEvidenceRequirement === expected.operatorEvidenceRequirement
    && observed.freshnessMarker === externalEvidenceFreshnessMarker;
}

function validatePairEvidence(state, observedPairEvidence) {
  if (!state.pairEvidenceVerified || !Array.isArray(state.pairEvidenceRecords)) {
    return stopPreviewFixture(state, "preview-pair-evidence-not-verified");
  }
  if (!observedPairEvidence) return stopPreviewFixture(state, "history-pair-evidence-missing");
  if (observedPairEvidence.evidenceStatus === "uncertain") return stopPreviewFixture(state, "history-pair-evidence-uncertain");
  if (observedPairEvidence.evidenceStatus === "failure") return stopPreviewFixture(state, "history-pair-evidence-failure");
  if (observedPairEvidence.evidenceStatus !== "verified") return stopPreviewFixture(state, "history-pair-evidence-unverified");
  const expectedEvidence = state.pairEvidenceRecords[state.repairIndex];
  if (!pairEvidenceMatches(observedPairEvidence, expectedEvidence)) {
    return stopPreviewFixture(state, "history-pair-evidence-mismatch");
  }
  return null;
}

function requireExternalPairEvidenceForPreviewHistoryMutation(state) {
  const hasTrustedExternalEvidence = state.pairEvidenceMode === externalPairEvidenceSource;
  const hasInternalContractFixtureEvidence = state.contractFixtureOnly === true
    && state.pairEvidenceMode === "internal-state-machine-fixture-not-live";
  if (state.pairEvidenceVerified !== true
    || (!hasTrustedExternalEvidence && !hasInternalContractFixtureEvidence)
    || !externalObservationSessions.has(state[externalObservationSession])) {
    return stopPreviewFixture(state, "preview-history-mutation-requires-external-pair-evidence");
  }
  return null;
}

function revertHistoryMigration(state, pair, { result, observedPairEvidence } = {}) {
  if (state.stopped) return state;
  if (!state.preflightVerified) return stopPreviewFixture(state, "preview-preflight-not-verified");
  const pairEvidenceModeStop = requireExternalPairEvidenceForPreviewHistoryMutation(state);
  if (pairEvidenceModeStop) return pairEvidenceModeStop;
  if (!assertUntouchedSameVersion(state)) return stopPreviewFixture(state, "target-mutation-or-rerun");
  if (state.phase !== "history-only-repair") return stopPreviewFixture(state, "partial-history-state");

  const expectedPair = expectedOperatorMappings[state.repairIndex];
  if (!expectedPair) return stopPreviewFixture(state, "target-mutation-or-rerun");
  const [remoteName, localName, category] = pair;
  if (state.history.includes(localName) || !state.history.includes(remoteName)) {
    return stopPreviewFixture(state, "target-mutation-or-rerun");
  }
  if (!pairMatches([remoteName, localName, category], expectedPair)) {
    return stopPreviewFixture(state, "wrong-order-or-mapping");
  }
  const evidenceStop = validatePairEvidence(state, observedPairEvidence);
  if (evidenceStop) return evidenceStop;
  if (result === "failure") return stopPreviewFixture(state, "history-revert-failure");
  if (result === "uncertain") return stopPreviewFixture(state, "history-revert-uncertain");
  if (result === undefined) return stopPreviewFixture(state, "history-revert-result-missing");
  if (result !== "success") return stopPreviewFixture(state, "history-revert-unverified");

  return {
    ...state,
    history: state.history.filter((name) => name !== remoteName),
    phase: "awaiting-history-revert-readback",
    pendingHistoryPair: [...pair],
    operations: [...state.operations, { kind: "history-only-reverted", migration: remoteName }]
  };
}

function readBackHistoryRevert(state, pair, observationEnvelope) {
  if (state.stopped) return state;
  const pairEvidenceModeStop = requireExternalPairEvidenceForPreviewHistoryMutation(state);
  if (pairEvidenceModeStop) return pairEvidenceModeStop;
  if (state.phase !== "awaiting-history-revert-readback" || !pairMatches(pair, state.pendingHistoryPair)) {
    return stopPreviewFixture(state, "wrong-or-missing-history-revert-readback");
  }
  const [remoteName, localName] = pair;
  const validation = validateExternalPreviewReadOnlyObservation(state, observationEnvelope, {
    observationKind: "history-revert-readback",
    subject: remoteName,
    expectedHistory: state.history,
    stopPrefix: "history-revert-readback"
  });
  if (validation.stop) return validation.stop;
  const { observedHistory } = validation.observation;
  if (!historiesMatchExactlyInOrder(observedHistory, state.history)) {
    return stopPreviewFixture(state, "history-revert-readback-inventory-mismatch");
  }
  if (observedHistory.includes(remoteName) || observedHistory.includes(localName) || observedHistory.filter((name) => name === migrationName).length !== 1) {
    return stopPreviewFixture(state, "target-mutation-or-readback-failure");
  }
  return { ...state, history: [...observedHistory], phase: "history-only-apply" };
}

function applyHistoryMigration(state, pair, { result, observedPairEvidence } = {}) {
  if (state.stopped) return state;
  if (!state.preflightVerified) return stopPreviewFixture(state, "preview-preflight-not-verified");
  const pairEvidenceModeStop = requireExternalPairEvidenceForPreviewHistoryMutation(state);
  if (pairEvidenceModeStop) return pairEvidenceModeStop;
  if (state.phase !== "history-only-apply" || !pairMatches(pair, state.pendingHistoryPair)) {
    return stopPreviewFixture(state, "partial-history-state");
  }
  const [remoteName, localName] = pair;
  if (state.history.includes(remoteName) || state.history.includes(localName) || !assertUntouchedSameVersion(state)) {
    return stopPreviewFixture(state, "target-mutation-or-rerun");
  }
  const evidenceStop = validatePairEvidence(state, observedPairEvidence);
  if (evidenceStop) return evidenceStop;
  if (result === "failure") return stopPreviewFixture(state, "history-apply-failure-after-revert");
  if (result === "uncertain") return stopPreviewFixture(state, "history-apply-uncertain-after-revert");
  if (result === undefined) return stopPreviewFixture(state, "history-apply-result-missing");
  if (result !== "success") return stopPreviewFixture(state, "history-apply-unverified");
  return {
    ...state,
    history: sorted([...state.history, localName]),
    phase: "awaiting-history-apply-readback",
    operations: [...state.operations, { kind: "history-only-applied", migration: localName }]
  };
}

function readBackHistoryApply(state, pair, observationEnvelope) {
  if (state.stopped) return state;
  const pairEvidenceModeStop = requireExternalPairEvidenceForPreviewHistoryMutation(state);
  if (pairEvidenceModeStop) return pairEvidenceModeStop;
  if (state.phase !== "awaiting-history-apply-readback" || !pairMatches(pair, state.pendingHistoryPair)) {
    return stopPreviewFixture(state, "wrong-or-missing-history-apply-readback");
  }
  const [remoteName, localName] = pair;
  const validation = validateExternalPreviewReadOnlyObservation(state, observationEnvelope, {
    observationKind: "history-apply-readback",
    subject: localName,
    expectedHistory: state.history,
    stopPrefix: "history-apply-readback"
  });
  if (validation.stop) return validation.stop;
  const { observedHistory } = validation.observation;
  if (!historiesMatchExactlyInOrder(observedHistory, state.history)) {
    return stopPreviewFixture(state, "history-apply-readback-inventory-mismatch");
  }
  if (observedHistory.includes(remoteName) || observedHistory.filter((name) => name === localName).length !== 1 || observedHistory.filter((name) => name === migrationName).length !== 1) {
    return stopPreviewFixture(state, "target-mutation-or-readback-failure");
  }
  const repairIndex = state.repairIndex + 1;
  return {
    ...state,
    history: [...observedHistory],
    phase: repairIndex === expectedOperatorMappings.length ? "history-repair-complete" : "history-only-repair",
    repairIndex,
    pendingHistoryPair: null
  };
}

function createCleanInstallFixture({ targetKind, initialHistory } = {}) {
  return {
    targetKind,
    [externalObservationSession]: createExternalObservationSession(targetKind),
    history: Array.isArray(initialHistory) ? [...initialHistory] : null,
    historyRevalidated: false,
    phase: "clean-install-preflight",
    migrationIndex: 0,
    pendingReadback: null,
    operations: [],
    sqlExecutions: [],
    stopped: false,
    stopReason: null
  };
}

function stopCleanInstallFixture(state, reason) {
  if (state.stopped) return state;
  return { ...state, phase: "stopped", stopped: true, stopReason: reason };
}

function completeCleanInstallPreflight(state, observationEnvelope) {
  if (state.stopped) return state;
  if (state.targetKind !== "isolated-empty") {
    return stopCleanInstallFixture(state, "clean-install-target-not-isolated-empty");
  }
  if (state.phase !== "clean-install-preflight" || state.migrationIndex !== 0 || state.historyRevalidated) {
    return stopCleanInstallFixture(state, "partial-clean-install-state");
  }
  if (!Array.isArray(state.history)) {
    return stopCleanInstallFixture(state, "clean-install-history-revalidation-unknown");
  }
  if (state.history.length !== 0) {
    return stopCleanInstallFixture(state, "clean-install-target-not-empty");
  }
  const validation = validateExternalCleanInstallReadOnlyObservation(state, observationEnvelope, {
    observationKind: "preflight",
    subject: "preflight",
    expectedHistory: [],
    stopPrefix: "clean-install-preflight"
  });
  if (validation.stop) return validation.stop;
  return { ...state, phase: "clean-install-applying", historyRevalidated: true };
}

function applyCleanInstallMigration(state, migration, { result } = {}) {
  if (state.stopped) return state;
  if (state.targetKind !== "isolated-empty" || !state.historyRevalidated || state.phase !== "clean-install-applying") {
    return stopCleanInstallFixture(state, "partial-clean-install-state");
  }
  const expectedMigration = currentLocalMigrations[state.migrationIndex];
  if (!currentLocalMigrations.includes(migration)) {
    return stopCleanInstallFixture(state, "unknown-or-duplicate-clean-install-migration");
  }
  if (!expectedMigration || state.history.includes(migration) || state.sqlExecutions.includes(migration)) {
    return stopCleanInstallFixture(state, "unknown-or-duplicate-clean-install-migration");
  }
  if (migration !== expectedMigration) return stopCleanInstallFixture(state, "wrong-clean-install-order");
  if (result === "failure") return stopCleanInstallFixture(state, "clean-install-apply-failure");
  if (result === "uncertain") return stopCleanInstallFixture(state, "clean-install-apply-uncertain");
  if (result === undefined) return stopCleanInstallFixture(state, "clean-install-apply-result-missing");
  if (result !== "success") return stopCleanInstallFixture(state, "clean-install-apply-unverified");
  return {
    ...state,
    phase: "awaiting-clean-install-readback",
    pendingReadback: migration,
    sqlExecutions: [...state.sqlExecutions, migration]
  };
}

function readBackCleanInstallMigration(state, migration, observationEnvelope) {
  if (state.stopped) return state;
  if (state.phase !== "awaiting-clean-install-readback" || state.pendingReadback !== migration) {
    return stopCleanInstallFixture(state, "wrong-or-missing-clean-install-readback");
  }
  const expectedHistory = [...state.history, migration];
  const validation = validateExternalCleanInstallReadOnlyObservation(state, observationEnvelope, {
    observationKind: "migration-readback",
    subject: migration,
    expectedHistory,
    stopPrefix: "clean-install-readback"
  });
  if (validation.stop) return validation.stop;
  const { observedHistory } = validation.observation;
  const migrationIndex = state.migrationIndex + 1;
  return {
    ...state,
    history: [...observedHistory],
    phase: migrationIndex === currentLocalMigrations.length ? "clean-install-complete" : "clean-install-applying",
    migrationIndex,
    pendingReadback: null
  };
}

function prepareAdditiveAllowlist(state, pending, allowlist, { result } = {}) {
  if (state.stopped) return state;
  if (!assertUntouchedSameVersion(state)) return stopPreviewFixture(state, "target-mutation-or-rerun");
  if (state.phase !== "history-repair-complete") return stopPreviewFixture(state, "partial-or-repair-failure");
  if (result === "failure") return stopPreviewFixture(state, "additive-dry-run-failure");
  if (result === "uncertain") return stopPreviewFixture(state, "additive-dry-run-uncertain");
  if (result === undefined) return stopPreviewFixture(state, "additive-dry-run-result-missing");
  if (result !== "success") return stopPreviewFixture(state, "additive-dry-run-unverified");
  if (JSON.stringify(allowlist) !== JSON.stringify(additiveAllowlist)) {
    return stopPreviewFixture(state, "wrong-order-or-allowlist");
  }
  if (JSON.stringify(pending) !== JSON.stringify(additiveAllowlist)) {
    return stopPreviewFixture(state, "unexpected-pending-migration");
  }
  return { ...state, phase: "only-two-allowlisted-additive-pending", preparedAllowlist: [...allowlist] };
}

function applyAdditiveMigration(state, migration, { result } = {}) {
  if (state.stopped) return state;
  const pairEvidenceModeStop = requireExternalPairEvidenceForPreviewHistoryMutation(state);
  if (pairEvidenceModeStop) return pairEvidenceModeStop;
  if (!assertUntouchedSameVersion(state)) return stopPreviewFixture(state, "target-mutation-or-rerun");
  if (state.phase !== "only-two-allowlisted-additive-pending" && state.phase !== "additive-applying") {
    return stopPreviewFixture(state, "partial-or-repair-failure");
  }
  const expectedMigration = additiveAllowlist[state.additiveIndex];
  if (!expectedMigration || state.history.includes(migration)) {
    return stopPreviewFixture(state, "target-mutation-or-rerun");
  }
  if (migration !== expectedMigration) return stopPreviewFixture(state, "wrong-additive-order");
  if (result === "failure") return stopPreviewFixture(state, "additive-apply-failure");
  if (result === "uncertain") return stopPreviewFixture(state, "additive-apply-uncertain");
  if (result === undefined) return stopPreviewFixture(state, "additive-apply-result-missing");
  if (result !== "success") return stopPreviewFixture(state, "additive-apply-unverified");

  return {
    ...state,
    phase: "awaiting-additive-readback",
    pendingReadback: migration,
    sqlExecutions: [...state.sqlExecutions, migration]
  };
}

function readBackAdditiveMigration(state, migration, observationEnvelope) {
  if (state.stopped) return state;
  const pairEvidenceModeStop = requireExternalPairEvidenceForPreviewHistoryMutation(state);
  if (pairEvidenceModeStop) return pairEvidenceModeStop;
  if (!assertUntouchedSameVersion(state)) return stopPreviewFixture(state, "target-mutation-or-rerun");
  if (state.phase !== "awaiting-additive-readback" || state.pendingReadback !== migration) {
    return stopPreviewFixture(state, "wrong-or-missing-additive-readback");
  }
  const validation = validateExternalPreviewReadOnlyObservation(state, observationEnvelope, {
    observationKind: "additive-readback",
    subject: migration,
    expectedHistory: [...state.history, migration].sort(),
    stopPrefix: "additive-readback"
  });
  if (validation.stop) return validation.stop;
  const { observedHistory } = validation.observation;
  const expectedHistory = [...state.history, migration].sort();
  if (!historiesMatchExactlyInOrder(observedHistory, expectedHistory)) {
    return stopPreviewFixture(state, "additive-readback-inventory-mismatch");
  }

  const additiveIndex = state.additiveIndex + 1;
  return {
    ...state,
    history: [...observedHistory],
    phase: additiveIndex === additiveAllowlist.length ? "additive-complete" : "additive-applying",
    additiveIndex,
    pendingReadback: null
  };
}

const expectedCommonPostApplyConcreteCheckPrefix = Object.freeze([
  Object.freeze({
    name: "canonical-source-observation",
    result: "verified",
    observations: Object.freeze({
      statementCount: 7,
      statementSequenceSha256: canonicalStatementSequenceSha256,
      bodySemanticMd5: remoteFunctionBodySemanticMd5,
      functionDefinitionMd5: remoteFunctionDefinitionMd5,
      migrationSourceSha256: canonicalMigrationSourceSha256
    })
  }),
  Object.freeze({
    name: "function-security-observation",
    result: "verified",
    observations: Object.freeze({ securityDefiner: true, searchPath: "pg_catalog,private,vault" })
  }),
  Object.freeze({
    name: "schema-acl-observation",
    result: "verified",
    observations: Object.freeze({
      entries: Object.freeze([
        Object.freeze({ role: "owner/postgres", privileges: Object.freeze(["CREATE", "USAGE"]), grantOptions: Object.freeze([]) }),
        Object.freeze({ role: "public", privileges: Object.freeze([]), grantOptions: Object.freeze([]) }),
        Object.freeze({ role: "anon", privileges: Object.freeze([]), grantOptions: Object.freeze([]) }),
        Object.freeze({ role: "authenticated", privileges: Object.freeze([]), grantOptions: Object.freeze([]) }),
        Object.freeze({ role: "service_role", privileges: Object.freeze(["USAGE"]), grantOptions: Object.freeze([]) })
      ])
    })
  }),
  Object.freeze({
    name: "function-execute-acl-observation",
    result: "verified",
    observations: Object.freeze({
      entries: Object.freeze([
        Object.freeze({ role: "owner/postgres", privileges: Object.freeze(["EXECUTE"]), grantOptions: Object.freeze([]) }),
        Object.freeze({ role: "public", privileges: Object.freeze([]), grantOptions: Object.freeze([]) }),
        Object.freeze({ role: "anon", privileges: Object.freeze([]), grantOptions: Object.freeze([]) }),
        Object.freeze({ role: "authenticated", privileges: Object.freeze([]), grantOptions: Object.freeze([]) }),
        Object.freeze({ role: "service_role", privileges: Object.freeze(["EXECUTE"]), grantOptions: Object.freeze([]) })
      ])
    })
  }),
  Object.freeze({
    name: "exact-function-comment-observation",
    result: "verified",
    observations: Object.freeze({ commentSha256: canonicalFunctionCommentSha256 })
  }),
  Object.freeze({
    name: "owner-lease-boundary-observation",
    result: "verified",
    observations: Object.freeze({ functionOwner: "postgres", ownerIdentityRequired: true, leaseBoundary: "active-matching-reconcile-lease-required" })
  })
]);

function expectedCommonPostApplyConcreteChecksForTarget(targetKind) {
  const schedulerJobCount = targetKind === "preview" ? 1 : 0;
  return Object.freeze([
    ...expectedCommonPostApplyConcreteCheckPrefix,
    Object.freeze({
      name: "side-effect-observation",
      result: "verified",
      observations: Object.freeze({
        schedulerJobCount,
        schedulerActive: false,
        schedulerCreateOperations: 0,
        schedulerAlterOperations: 0,
        schedulerActivateOperations: 0,
        schedulerDeactivateOperations: 0,
        schedulerDeleteOperations: 0,
        vaultSecretsWritten: 0,
        urlsPersisted: 0,
        tokensPersisted: 0
      })
    }),
    Object.freeze({
      name: "task6-azure-direct-fallback-observation",
      result: "verified",
      observations: Object.freeze({
        appliedMigrations: Object.freeze(additiveAllowlist.map((name) => Object.freeze({ name, count: 1 }))),
        functionIdentity: task6AzureFallbackFunctionIdentity,
        semanticHashAlgorithm: "sha256:normalized-final-function-semantic-source-v1",
        semanticDefinitionSha256: task6AzureFallbackSemanticDefinitionSha256,
        functionOwner: "postgres",
        securityDefiner: true,
        searchPath: "pg_catalog,public",
        aclEntries: task6AzureFallbackAclEntries,
        semanticMarkers: task6AzureFallbackSemanticMarkers
      })
    })
  ]);
}
assert.equal(
  expectedCommonPostApplyConcreteChecksForTarget("preview")[0].observations.statementSequenceSha256,
  "384b65c018721e1b281a33191be2f10cdc3a68f13a277ac78ebfff69f82b173a",
  "common post-apply checks require the independent fixed normalized seven-statement sequence SHA-256"
);

function validatePostApplyReadOnlyCheckObservation(state, observationEnvelope) {
  const stop = state.targetKind === "preview" ? stopPreviewFixture : stopCleanInstallFixture;
  if (state.targetKind === "preview") {
    const validation = validateExternalPreviewReadOnlyObservation(state, observationEnvelope, {
      observationKind: "post-apply-read-only-check",
      subject: "post-apply",
      expectedHistory: state.history,
      stopPrefix: "post-apply-read-only-check"
    });
    if (validation.stop) return validation;
  } else {
    const validation = validateExternalCleanInstallReadOnlyObservation(state, observationEnvelope, {
      observationKind: "post-apply-read-only-check",
      subject: "post-apply",
      expectedHistory: state.history,
      stopPrefix: "post-apply-read-only-check"
    });
    if (validation.stop) return validation;
  }
  const { result, targetKind, observedHistory, checks } = observationEnvelope;
  if (targetKind !== state.targetKind || !historiesMatchExactlyInOrder(observedHistory, state.history)) {
    return { stop: stop(state, "post-apply-read-only-check-history-mismatch") };
  }
  const expectedChecks = expectedCommonPostApplyConcreteChecksForTarget(state.targetKind);
  if (!Array.isArray(checks) || JSON.stringify(checks) !== JSON.stringify(expectedChecks)) {
    return { stop: stop(state, "post-apply-read-only-check-set-mismatch") };
  }
  return { observation: observationEnvelope };
}

function completePostApplyReadOnlyChecks(state, observationEnvelope) {
  const stop = state.targetKind === "preview" ? stopPreviewFixture : stopCleanInstallFixture;
  if (state.stopped) return state;
  if (state.phase !== "additive-complete" && state.phase !== "clean-install-complete") {
    return stop(state, "post-apply-read-only-check-invalid-state");
  }
  const validation = validatePostApplyReadOnlyCheckObservation(state, observationEnvelope);
  if (validation.stop) return validation.stop;
  return { ...state, phase: "post-apply-read-only-check", postApplyReadOnlyChecksVerified: true };
}

function stripLeadingTrivia(source) {
  let remaining = source;
  while (true) {
    const next = remaining.replace(/^\s+/, "");
    if (next.startsWith("--")) {
      const lineEnd = next.indexOf("\n");
      remaining = lineEnd === -1 ? "" : next.slice(lineEnd + 1);
      continue;
    }
    if (next.startsWith("/*")) {
      const commentEnd = next.indexOf("*/", 2);
      remaining = commentEnd === -1 ? "" : next.slice(commentEnd + 2);
      continue;
    }
    return next;
  }
}

function dollarTagAt(source, index) {
  const match = source.slice(index).match(/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/);
  return match ? match[0] : null;
}

function scanSql(source) {
  let state = "normal";
  let dollarTag = null;
  let parenthesesDepth = 0;
  let blockCommentDepth = 0;
  let statementStart = 0;
  const statements = [];

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];

    if (state === "line-comment") {
      if (character === "\n") state = "normal";
      continue;
    }
    if (state === "block-comment") {
      if (character === "/" && next === "*") {
        blockCommentDepth += 1;
        index += 1;
      } else if (character === "*" && next === "/") {
        blockCommentDepth -= 1;
        index += 1;
        if (blockCommentDepth === 0) state = "normal";
      }
      continue;
    }
    if (state === "single-quote") {
      if (character === "'" && next === "'") {
        index += 1;
      } else if (character === "'") {
        state = "normal";
      }
      continue;
    }
    if (state === "dollar-quote") {
      if (source.startsWith(dollarTag, index)) {
        index += dollarTag.length - 1;
        state = "normal";
        dollarTag = null;
      }
      continue;
    }

    if (character === "-" && next === "-") {
      state = "line-comment";
      index += 1;
      continue;
    }
    if (character === "/" && next === "*") {
      state = "block-comment";
      blockCommentDepth = 1;
      index += 1;
      continue;
    }
    if (character === "'") {
      state = "single-quote";
      continue;
    }
    if (character === "$") {
      const tag = dollarTagAt(source, index);
      if (tag) {
        state = "dollar-quote";
        dollarTag = tag;
        index += tag.length - 1;
        continue;
      }
    }
    if (character === "(") {
      parenthesesDepth += 1;
    } else if (character === ")") {
      parenthesesDepth -= 1;
      assert.ok(parenthesesDepth >= 0, "migration parentheses do not close before they open");
    } else if (character === ";" && parenthesesDepth === 0) {
      const statement = source.slice(statementStart, index + 1);
      if (stripLeadingTrivia(statement)) statements.push(statement);
      statementStart = index + 1;
    }
  }

  const trailing = source.slice(statementStart);
  if (stripLeadingTrivia(trailing)) statements.push(trailing);
  return {
    statements,
    parenthesesDepth,
    unterminatedDollarQuote: state === "dollar-quote" ? dollarTag : null,
    unterminatedString: state === "single-quote",
    unterminatedComment: state === "block-comment"
  };
}

function versionOf(name) {
  return name.slice(0, 14);
}

function versionSet(names) {
  return new Set(names.map(versionOf));
}

function sorted(values) {
  return [...values].sort();
}

function difference(left, right) {
  const rightSet = new Set(right);
  return sorted(left.filter((value) => !rightSet.has(value)));
}

function intersection(left, right) {
  const rightSet = new Set(right);
  return sorted(left.filter((value) => rightSet.has(value)));
}

assert.equal(fs.existsSync(migrationPath), true, "canonical remote-only migration source exists");
const migrationSql = fs.readFileSync(migrationPath, "utf8");
const planSql = extractPlanSql(fs.readFileSync(planPath, "utf8"));
assert.equal(normalizeSql(planSql), normalizeSql(canonicalMigration), "plan canonical SQL block matches the independent seven-statement fixture");
assert.equal(normalizeSql(planSql), normalizeSql(migrationSql), "plan canonical SQL block matches the actual migration source");
const scan = scanSql(migrationSql);
assert.equal(scan.parenthesesDepth, 0, "canonical migration parentheses are balanced");
assert.equal(scan.unterminatedDollarQuote, null, "canonical migration dollar quote is terminated");
assert.equal(scan.unterminatedString, false, "canonical migration strings are terminated");
assert.equal(scan.unterminatedComment, false, "canonical migration comments are terminated");
assert.equal(scan.statements.length, 7, "canonical migration has exactly seven top-level statements");
assert.equal(normalizeSql(migrationSql), normalizeSql(canonicalMigration), "canonical migration matches the independent seven-statement fixture");
const migrationStatementSequenceSha256 = sha256(JSON.stringify(
  scan.statements.map((statement) => normalizeSql(stripLeadingTrivia(statement)))
));
assert.equal(migrationStatementSequenceSha256, canonicalStatementSequenceSha256, "actual migration normalized ordered seven-statement sequence matches the independent fixed SHA-256");

const expectedStatementPatterns = [
  /^create schema if not exists private;$/i,
  /^revoke all on schema private from public, anon, authenticated;$/i,
  /^grant usage on schema private to service_role;$/i,
  /^create or replace function private\.ct_paid_invoke_maintenance_from_vault\(\)[\s\S]+?\$\$;$/i,
  /^revoke all on function private\.ct_paid_invoke_maintenance_from_vault\(\)[\s\S]+?;$/i,
  /^grant execute on function private\.ct_paid_invoke_maintenance_from_vault\(\)[\s\S]+?;$/i,
  /^comment on function private\.ct_paid_invoke_maintenance_from_vault\(\)[\s\S]+;$/i
];
for (const [index, pattern] of expectedStatementPatterns.entries()) {
  assert.match(stripLeadingTrivia(scan.statements[index]).trim(), pattern, `canonical statement ${index + 1} has the expected shape`);
}

assert.doesNotMatch(migrationSql, /\b(?:cron\s*\.\s*(?:schedule|unschedule)|pg_cron|pg_net|net\s*\.|http[s]?\s*:\s*\/\/|create\s+(?:or\s+replace\s+)?secret|vault\.secrets|\b(?:insert\s+into|update|delete\s+from|drop\s+table|truncate\s+table|alter\s+table)\b)/i, "canonical migration has no scheduler, secret write, URL, or destructive operation");
assert.doesNotMatch(migrationSql, /['"](?:authorization|x-api-key|bearer|token\s*:)/i, "canonical migration has no token header or embedded credential");
assert.doesNotMatch(migrationSql, /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i, "canonical migration has no UUID private identifier");
assert.doesNotMatch(migrationSql, /\b(?:supabase\.co|project[_-]?ref|account[_-]?id|service[_-]?key|access[_-]?token)\b/i, "canonical migration has no private project/account or credential marker");

assert.match(migrationSql, /create or replace function private\.ct_paid_invoke_maintenance_from_vault\(\)\s+returns void\s+language plpgsql\s+security definer\s+set search_path = pg_catalog, private, vault\s+as \$\$/i, "transport function has the fixed SECURITY DEFINER search path");
assert.match(migrationSql, /from vault\.decrypted_secrets/i, "transport function reads the Vault catalog only at invocation time");
assert.match(migrationSql, /perform public\.ct_paid_invoke_maintenance_http\(\s*v_maintenance_url,\s*v_cron_token,\s*'supabase-cron'\s*\)/i, "transport function delegates to the canonical supabase-cron HTTP RPC");
assert.match(migrationSql, /v_maintenance_url_count <> 1[\s\S]+?v_cron_token_count <> 1[\s\S]+?v_maintenance_url is null[\s\S]+?btrim\(v_maintenance_url\) = ''[\s\S]+?v_cron_token is null[\s\S]+?btrim\(v_cron_token\) = ''/i, "transport function rejects missing or blank references fail-closed");
for (const referenceName of ["comment_translator_paid_maintenance_url", "comment_translator_paid_cron_token"]) {
  assert.equal((migrationSql.match(new RegExp(referenceName, "g")) ?? []).length, 3, `${referenceName} is referenced only by the two filters and the stable-name list`);
}
assert.match(migrationSql, /revoke all on schema private from public, anon, authenticated;/i, "private schema is not exposed to public API roles");
assert.match(migrationSql, /grant usage on schema private to service_role;/i, "private schema usage is service-role-only");
assert.match(migrationSql, /revoke all on function private\.ct_paid_invoke_maintenance_from_vault\(\)\s+from public, anon, authenticated, service_role;/i, "function defaults are revoked");
assert.match(migrationSql, /grant execute on function private\.ct_paid_invoke_maintenance_from_vault\(\)\s+to service_role;/i, "function execute is granted only to service_role");
assert.ok(migrationSql.includes(canonicalFunctionComment), "transport function has the exact sanitized comment");
assert.equal(canonicalFunctionCommentSha256, "05b650537aa63ea2704b840b5ebf7c39f0ffd3ec84380c6c052f1621c4a9c6b6", "canonical function comment hash matches the exact sanitized source comment");

const bodyMatch = migrationSql.match(/\bas\s+\$\$([\s\S]*?)\$\$;/i);
assert.ok(bodyMatch, "transport function body is extractable");
const normalizedBody = bodyMatch[1].toLowerCase().replace(/\s+/g, "");
const bodySemanticMd5 = crypto.createHash("md5").update(normalizedBody, "utf8").digest("hex");
assert.equal(bodySemanticMd5, remoteFunctionBodySemanticMd5, "source body semantic hash matches the observed remote body");

const currentLocalMigrations = fs
  .readdirSync(path.join(root, "supabase", "migrations"), { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
  .map((entry) => entry.name.slice(0, -4))
  .sort();
const expectedCurrentLocal = [...localBaselineMigrations, migrationName].sort();
assert.deepEqual(currentLocalMigrations, expectedCurrentLocal, "current source inventory is baseline local history plus only the canonical remote-only source");

assert.equal(localBaselineMigrations.length, 33, "observed local baseline has 33 migrations");
assert.equal(remoteMigrations.length, 27, "observed remote history has 27 migrations");
const localVersions = versionSet(localBaselineMigrations);
const remoteVersions = versionSet(remoteMigrations);
const matchedVersions = intersection([...localVersions], [...remoteVersions]);
assert.equal(matchedVersions.length, 18, "observed matched timestamp count is 18");
assert.equal(localBaselineMigrations.length + remoteMigrations.length - matchedVersions.length, 42, "observed migration union count is 42");
assert.deepEqual(sorted(localOnlyBaseline.map(versionOf)), sorted(difference([...localVersions], [...remoteVersions])), "observed local-only inventory is exact");
assert.deepEqual(sorted(remoteOnlyBaseline.map(versionOf)), sorted(difference([...remoteVersions], [...localVersions])), "observed remote-only inventory is exact");
assert.equal(localOnlyBaseline.length, 15, "observed local-only count is 15");
assert.equal(remoteOnlyBaseline.length, 9, "observed remote-only count is 9");
assert.equal(localOnlyBaseline.filter((name) => name.includes("_comment_translator_paid_")).length, 10, "observed Paid local-only count is 10");
assert.equal(remoteOnlyBaseline.filter((name) => name.includes("_comment_translator_paid_")).length, 9, "observed Paid remote-only count is 9");

assert.equal(semanticMappings.length, 8, "eight remote-only entries have fixed semantic local mappings");
assert.deepEqual(semanticMappings, expectedOperatorMappings, "contract mappings match the independent fixed remote-to-local oracle");
assert.equal(semanticMappings.filter(([, , category]) => category === "timestamp-mismatch").length, 6, "six same-name timestamp mismatches are fixed");
assert.equal(semanticMappings.filter(([, , category]) => category === "semantic-noncanonical").length, 2, "two lifecycle/capacity semantic mappings are fixed");
for (const [remoteName, localName] of semanticMappings) {
  assert.ok(remoteMigrations.includes(remoteName), `mapped remote entry exists: ${remoteName}`);
  assert.ok(localBaselineMigrations.includes(localName), `mapped local entry exists: ${localName}`);
  assert.notEqual(versionOf(remoteName), versionOf(localName), `mapped entry has an explicit timestamp mismatch: ${localName}`);
}
const operatorMappingRows = parseOperatorMappingRows(fs.readFileSync(operatorDocumentPath, "utf8"));
assertOperatorMappingRows(operatorMappingRows);
const swappedOperatorRows = operatorMappingRows.map((row) => [...row]);
const firstSwappedLocalTarget = swappedOperatorRows[1][1];
swappedOperatorRows[1][1] = swappedOperatorRows[2][1];
swappedOperatorRows[2][1] = firstSwappedLocalTarget;
assert.throws(() => assertOperatorMappingRows(swappedOperatorRows), "a swapped operator local target fails even when row counts and categories are unchanged");
assert.notEqual(normalizeSql("select 1; \nselect 2;"), normalizeSql("select 1;\nselect 2;"), "strict canonical normalization preserves per-line trailing whitespace");
assert.deepEqual(sameVersionSourceMatches, [migrationName], "the new source is the only same-version remote-only match");
assert.ok(remoteMigrations.includes(migrationName), "remote-only migration is present in the observed remote history");
assert.ok(!localBaselineMigrations.includes(migrationName), "remote-only migration was absent from the pre-source local baseline");
assert.deepEqual(absentRemotePaidMigrations, [
  "20260813135500_comment_translator_paid_task6_azure_uncertain_retry_compatibility",
  "20260829100000_comment_translator_paid_task6_azure_uncertain_retry_guard_repair"
], "the two genuinely absent remote migrations are fixed");
for (const migration of absentRemotePaidMigrations) {
  assert.ok(localBaselineMigrations.includes(migration), `absent migration exists locally: ${migration}`);
  assert.ok(!remoteMigrations.includes(migration), `absent migration is not in remote history: ${migration}`);
}
assert.deepEqual(additiveAllowlist, absentRemotePaidMigrations, "additive allowlist contains only the two absent Task 6 migrations");

const unverifiedPreviewFixture = createPreviewFixture({ targetKind: "preview" });
assert.equal(revertHistoryMigration(unverifiedPreviewFixture, expectedOperatorMappings[0]).stopReason, "preview-preflight-not-verified", "Preview history repair cannot start before target, inventory, and semantic/hash preflight");
const barePreviewPreflightInput = {
  observedHistory: remoteMigrations,
  observedBodySemanticMd5: bodySemanticMd5,
  observedFunctionDefinitionMd5: remoteFunctionDefinitionMd5,
  result: "success",
  pairEvidenceEnvelope: independentExternalPreviewPreflightEnvelope().pairEvidenceEnvelope
};
const barePreviewPreflight = completePreviewPreflight(createPreviewFixture({ targetKind: "preview" }), barePreviewPreflightInput);
assert.equal(barePreviewPreflight.stopReason, "preview-preflight-observation-provenance-or-freshness-missing", "bare history and hash arguments cannot enter operator mode without a complete preflight observation envelope");
assert.deepEqual(barePreviewPreflight.operations, [], "bare Preview preflight rejection performs zero history operations");
assert.deepEqual(barePreviewPreflight.sqlExecutions, [], "bare Preview preflight rejection executes zero SQL");
const independentlyProvidedCompletePreflightEnvelope = independentExternalPreviewPreflightEnvelope();
const staticPreviewPreflightState = createPreviewFixture({ targetKind: "preview" });
assert.throws(
  () => issueExternalObservationEnvelope(
    independentlyProvidedCompletePreflightEnvelope,
    staticPreviewPreflightState,
    { observationKind: "preflight", subject: "preflight", expectedHistory: remoteMigrations }
  ),
  /request-bound private issuer/,
  "plain request fields cannot issue an external observation capability"
);
let closedPreviewIssuer;
let closedPairEvidenceIssuer;
const passedThroughStaticPreviewPreflightEnvelope = injectExternalPreviewReadOnlyObservation(
  (issuer) => {
    closedPreviewIssuer = issuer;
    closedPairEvidenceIssuer = issuer.pairEvidenceIssuer;
    assert.equal("state" in issuer, false, "the Preview provider receives no mutable state reference");
    assert.equal(typeof issuer.issue, "function", "the Preview provider receives a private request-bound issuer");
    return independentlyProvidedCompletePreflightEnvelope;
  },
  { state: staticPreviewPreflightState, observationKind: "preflight", subject: "preflight", expectedHistory: remoteMigrations }
);
assert.strictEqual(passedThroughStaticPreviewPreflightEnvelope, independentlyProvidedCompletePreflightEnvelope, "the Preview adapter passes through a static full preflight envelope without issuing capability metadata");
const unreceiptedStaticPreviewState = createPreviewFixture({ targetKind: "preview" });
assert.throws(
  () => injectExternalPreviewReadOnlyObservation(
    (issuer) => issuer.issue(independentlyProvidedCompletePreflightEnvelope),
    { state: unreceiptedStaticPreviewState, observationKind: "preflight", subject: "preflight", expectedHistory: remoteMigrations }
  ),
  /trusted read-only observation adapter source receipt/,
  "a request-bound issuer rejects a static full Preview envelope without a trusted adapter receipt"
);
assert.equal(unreceiptedStaticPreviewState.history, null, "unreceipted static Preview issuance preserves history");
assert.deepEqual(unreceiptedStaticPreviewState.operations, [], "unreceipted static Preview issuance performs zero operations");
assert.deepEqual(unreceiptedStaticPreviewState.sqlExecutions, [], "unreceipted static Preview issuance executes zero SQL");
const requestReceiptedStaticPreviewState = createPreviewFixture({ targetKind: "preview" });
assert.throws(
  () => injectExternalPreviewReadOnlyObservation(
    (issuer) => {
      const requestReceipt = trustedExternalReadOnlyObservationAdapter.issueReceipt?.(issuer, independentlyProvidedCompletePreflightEnvelope) ?? Object.freeze({});
      return issuer.issue(independentlyProvidedCompletePreflightEnvelope, requestReceipt);
    },
    { state: requestReceiptedStaticPreviewState, observationKind: "preflight", subject: "preflight", expectedHistory: remoteMigrations }
  ),
  /trusted read-only observation adapter source receipt/,
  "a static full Preview envelope cannot be promoted by a receipt issued only from the private request issuer"
);
assert.equal(requestReceiptedStaticPreviewState.history, null, "request-receipted static Preview issuance preserves history");
assert.deepEqual(requestReceiptedStaticPreviewState.operations, [], "request-receipted static Preview issuance performs zero operations");
assert.deepEqual(requestReceiptedStaticPreviewState.sqlExecutions, [], "request-receipted static Preview issuance executes zero SQL");
const relabeledStaticPreviewState = createPreviewFixture({ targetKind: "preview" });
assert.throws(
  () => injectExternalPreviewReadOnlyObservation(
    (issuer) => issuer.issue({
      ...independentlyProvidedCompletePreflightEnvelope,
      provenance: { kind: externalPairEvidenceSource, liveObservation: true },
      freshness: { status: "fresh", marker: previewObservationFreshnessMarker("preflight", "preflight") }
    }, Object.freeze({})),
    { state: relabeledStaticPreviewState, observationKind: "preflight", subject: "preflight", expectedHistory: remoteMigrations }
  ),
  /trusted read-only observation adapter source receipt/,
  "relabeled static Preview data cannot forge a trusted adapter receipt"
);
assert.equal(relabeledStaticPreviewState.history, null, "relabeled static Preview issuance preserves history");
assert.deepEqual(relabeledStaticPreviewState.operations, [], "relabeled static Preview issuance performs zero operations");
assert.deepEqual(relabeledStaticPreviewState.sqlExecutions, [], "relabeled static Preview issuance executes zero SQL");
const issuedStaticPreviewState = createPreviewFixture({ targetKind: "preview" });
assert.throws(
  () => injectExternalPreviewReadOnlyObservation(
    (issuer) => {
      const selfRegisteredStaticSource = createInternalStateMachineReadOnlyObservationSourceFixture(() => independentlyProvidedCompletePreflightEnvelope);
      return issueTrustedExternalObservation(issuer, selfRegisteredStaticSource);
    },
    { state: issuedStaticPreviewState, observationKind: "preflight", subject: "preflight", expectedHistory: remoteMigrations }
  ),
  /opaque external adapter source lineage/,
  "a fixed Preview envelope cannot become trusted through an in-file arbitrary source-registration callback"
);
assert.throws(
  () => injectExternalPreviewReadOnlyObservation(
    (issuer) => {
      const staticSource = createDeterministicReadOnlyObservationSourceFixture(() => independentlyProvidedCompletePreflightEnvelope);
      return issueTrustedExternalObservation(issuer, staticSource);
    },
    { state: issuedStaticPreviewState, observationKind: "preflight", subject: "preflight", expectedHistory: remoteMigrations }
  ),
  /opaque external adapter source lineage/,
  "a deterministic self-generated Preview outer source is rejected before receipt issuance"
);
const issuedStaticNestedPreviewState = createPreviewFixture({ targetKind: "preview" });
assert.throws(
  () => injectExternalPreviewReadOnlyObservation(
    (issuer) => {
      const provided = independentExternalPreviewPreflightEnvelope();
      const staticNestedSource = createDeterministicReadOnlyObservationSourceFixture(() => provided.pairEvidenceEnvelope);
      issueTrustedExternalObservation(issuer.pairEvidenceIssuer, staticNestedSource);
      return provided;
    },
    { state: issuedStaticNestedPreviewState, observationKind: "preflight", subject: "preflight", expectedHistory: remoteMigrations }
  ),
  /opaque external adapter source lineage/,
  "a deterministic self-generated Preview nested source is rejected before receipt issuance"
);
const cyclicStaticPreviewOuterEnvelope = { ...independentlyProvidedCompletePreflightEnvelope, fixtureLabel: "issued-but-static-self-generated-preview-outer" };
cyclicStaticPreviewOuterEnvelope.cycle = cyclicStaticPreviewOuterEnvelope;
assert.throws(
  () => injectExternalPreviewReadOnlyObservation(
    (issuer) => {
      const cyclicStaticSource = createInternalStateMachineReadOnlyObservationSourceFixture(() => cyclicStaticPreviewOuterEnvelope);
      return issueTrustedExternalObservation(issuer, cyclicStaticSource);
    },
    { state: createPreviewFixture({ targetKind: "preview" }), observationKind: "preflight", subject: "preflight", expectedHistory: remoteMigrations }
  ),
  /opaque external adapter source lineage/,
  "sync Preview outer issuance rejects cyclic issued-but-static self-generated input"
);
assert.throws(
  () => injectExternalPreviewReadOnlyObservation(
    (issuer) => {
      const provided = independentExternalPreviewPreflightEnvelope();
      const cyclicNestedEnvelope = { ...provided.pairEvidenceEnvelope, fixtureLabel: "issued-but-static-self-generated-preview-nested" };
      cyclicNestedEnvelope.cycle = cyclicNestedEnvelope;
      const cyclicStaticNestedSource = createInternalStateMachineReadOnlyObservationSourceFixture(() => cyclicNestedEnvelope);
      issueTrustedExternalObservation(issuer.pairEvidenceIssuer, cyclicStaticNestedSource);
      return provided;
    },
    { state: createPreviewFixture({ targetKind: "preview" }), observationKind: "preflight", subject: "preflight", expectedHistory: remoteMigrations }
  ),
  /opaque external adapter source lineage/,
  "sync Preview nested issuance rejects cyclic issued-but-static self-generated input"
);
const mismatchedReceiptPreviewState = createPreviewFixture({ targetKind: "preview" });
assert.throws(
  () => injectExternalPreviewReadOnlyObservation(
    (issuer) => {
      const source = createInternalStateMachineReadOnlyObservationSourceFixture(() => independentlyProvidedCompletePreflightEnvelope);
      const { envelope, sourceReceipt } = acquireInternalStateMachineObservation(issuer, source);
      return issuer.issue({ ...envelope }, sourceReceipt);
    },
    { state: mismatchedReceiptPreviewState, observationKind: "preflight", subject: "preflight", expectedHistory: remoteMigrations }
  ),
  /trusted read-only observation adapter source receipt/,
  "a trusted receipt cannot be relabeled onto a copied Preview payload"
);
assert.equal(mismatchedReceiptPreviewState.history, null, "payload-mismatched Preview receipt preserves history");
assert.deepEqual(mismatchedReceiptPreviewState.operations, [], "payload-mismatched Preview receipt performs zero operations");
assert.deepEqual(mismatchedReceiptPreviewState.sqlExecutions, [], "payload-mismatched Preview receipt executes zero SQL");
assert.throws(
  () => closedPreviewIssuer.issue(independentlyProvidedCompletePreflightEnvelope),
  /closed external observation issuer/,
  "the Preview request issuer is closed when its callback returns"
);
assert.throws(
  () => closedPairEvidenceIssuer.issue(independentlyProvidedCompletePreflightEnvelope.pairEvidenceEnvelope),
  /closed external observation issuer/,
  "the nested pair-evidence issuer is closed with the outer Preview callback"
);
const oneShotPreviewIssuerState = createPreviewFixture({ targetKind: "preview" });
const oneShotPreviewEnvelope = injectExternalPreviewReadOnlyObservation(
  (issuer) => {
    const source = createInternalStateMachineReadOnlyObservationSourceFixture(() => independentlyProvidedCompletePreflightEnvelope);
    const issued = issueInternalStateMachineObservation(issuer, source);
    assert.throws(
      () => issuer.issue(independentlyProvidedCompletePreflightEnvelope),
      /already issued a capability/,
      "one Preview request issuer cannot issue twice"
    );
    return issued;
  },
  { state: oneShotPreviewIssuerState, observationKind: "preflight", subject: "preflight", expectedHistory: remoteMigrations }
);
assert.ok(oneShotPreviewEnvelope[operatorExternalObservationCapability], "one-shot Preview issuance returns a registry-bound capability");
assert.equal(
  externalObservationCapabilityRegistry.get(oneShotPreviewEnvelope[operatorExternalObservationCapability])?.authorityClass,
  "internal-state-machine-fixture-not-live",
  "a locally issued state-machine capability is never classified as trusted external operator evidence"
);
const rejectedStaticPreviewPreflight = completePreviewPreflight(staticPreviewPreflightState, passedThroughStaticPreviewPreflightEnvelope);
assert.equal(rejectedStaticPreviewPreflight.stopReason, "preview-external-observation-capability-missing", "an unlabeled static Preview preflight envelope cannot be upgraded by injection");
assert.equal(rejectedStaticPreviewPreflight.history, staticPreviewPreflightState.history, "unlabeled static Preview preflight rejection preserves history");
assert.deepEqual(rejectedStaticPreviewPreflight.operations, staticPreviewPreflightState.operations, "unlabeled static Preview preflight rejection performs zero additional operations");
assert.deepEqual(rejectedStaticPreviewPreflight.sqlExecutions, staticPreviewPreflightState.sqlExecutions, "unlabeled static Preview preflight rejection executes zero additional SQL");
const completeExternalPreflightInputState = createPreviewFixture({ targetKind: "preview" });
const injectedCompletePreflightEnvelope = injectExternalPreviewReadOnlyObservation(
  independentExternalPreviewPreflightProvider,
  { state: completeExternalPreflightInputState, observationKind: "preflight", subject: "preflight", expectedHistory: remoteMigrations }
);
assert.notStrictEqual(injectedCompletePreflightEnvelope, independentlyProvidedCompletePreflightEnvelope, "the adapter issues a fresh request-bound envelope");
const completeExternalPreflightState = completePreviewPreflight(completeExternalPreflightInputState, injectedCompletePreflightEnvelope);
assert.equal(completeExternalPreflightState.pairEvidenceMode, "internal-state-machine-fixture-not-live", "a local preflight fixture remains explicitly outside operator mode");
assert.ok(injectedCompletePreflightEnvelope[operatorExternalObservationCapability], "preflight envelope carries a fresh opaque capability");
const replayedCompletePreflight = completePreviewPreflight(completeExternalPreflightInputState, injectedCompletePreflightEnvelope);
assert.equal(replayedCompletePreflight.stopReason, "preview-external-observation-capability-missing", "a consumed request-bound Preview envelope cannot be replayed");
assert.equal(replayedCompletePreflight.history, completeExternalPreflightInputState.history, "Preview replay rejection preserves history");
assert.deepEqual(replayedCompletePreflight.operations, completeExternalPreflightInputState.operations, "Preview replay rejection performs zero operations");
assert.deepEqual(replayedCompletePreflight.sqlExecutions, completeExternalPreflightInputState.sqlExecutions, "Preview replay rejection executes zero SQL");
await assert.rejects(
  injectExternalPreviewReadOnlyObservation(
    async (issuer) => {
      await Promise.resolve();
      const issuedButStaticSource = createInternalStateMachineReadOnlyObservationSourceFixture(() => ({
        ...independentlyProvidedCompletePreflightEnvelope,
        fixtureLabel: "issued-but-static-self-generated-preview-outer"
      }));
      return issueTrustedExternalObservation(issuer, issuedButStaticSource);
    },
    { state: createPreviewFixture({ targetKind: "preview" }), observationKind: "preflight", subject: "preflight", expectedHistory: remoteMigrations }
  ),
  /opaque external adapter source lineage/,
  "Promise Preview outer issuance rejects issued-but-static self-generated input"
);
await assert.rejects(
  injectExternalPreviewReadOnlyObservation(
    async (issuer) => {
      await Promise.resolve();
      const provided = independentExternalPreviewPreflightEnvelope();
      const cyclicNestedEnvelope = { ...provided.pairEvidenceEnvelope, fixtureLabel: "self-generated-preview-nested" };
      cyclicNestedEnvelope.cycle = cyclicNestedEnvelope;
      const cyclicNestedSource = createInternalStateMachineReadOnlyObservationSourceFixture(() => cyclicNestedEnvelope);
      issueTrustedExternalObservation(issuer.pairEvidenceIssuer, cyclicNestedSource);
      return provided;
    },
    { state: createPreviewFixture({ targetKind: "preview" }), observationKind: "preflight", subject: "preflight", expectedHistory: remoteMigrations }
  ),
  /opaque external adapter source lineage/,
  "Promise Preview nested issuance rejects cyclic self-generated input"
);
const asyncPreviewPreflightState = createPreviewFixture({ targetKind: "preview" });
let resolvedAsyncPreviewIssuer;
let resolvedAsyncPreviewPairEvidenceIssuer;
let issuedInsideAsyncPreviewCallback;
const asyncPreviewPreflightEnvelope = await injectExternalPreviewReadOnlyObservation(
  async (issuer) => {
    resolvedAsyncPreviewIssuer = issuer;
    resolvedAsyncPreviewPairEvidenceIssuer = issuer.pairEvidenceIssuer;
    await Promise.resolve();
    const provided = independentExternalPreviewPreflightEnvelope();
    const pairEvidenceSource = createInternalStateMachineReadOnlyObservationSourceFixture(() => provided.pairEvidenceEnvelope);
    const pairEvidenceEnvelope = issueInternalStateMachineObservation(issuer.pairEvidenceIssuer, pairEvidenceSource);
    const preflightEnvelope = { ...provided, pairEvidenceEnvelope };
    const preflightSource = createInternalStateMachineReadOnlyObservationSourceFixture(() => preflightEnvelope);
    issuedInsideAsyncPreviewCallback = issueInternalStateMachineObservation(issuer, preflightSource);
    return issuedInsideAsyncPreviewCallback;
  },
  { state: asyncPreviewPreflightState, observationKind: "preflight", subject: "preflight", expectedHistory: remoteMigrations }
);
assert.strictEqual(asyncPreviewPreflightEnvelope, issuedInsideAsyncPreviewCallback, "the async Preview adapter returns the provider-issued outer envelope");
assert.ok(asyncPreviewPreflightEnvelope[operatorExternalObservationCapability], "the async Preview provider issues the outer envelope after awaiting");
assert.ok(asyncPreviewPreflightEnvelope.pairEvidenceEnvelope[operatorExternalObservationCapability], "the async Preview provider issues nested pair evidence after awaiting");
assert.throws(
  () => resolvedAsyncPreviewIssuer.issue(independentlyProvidedCompletePreflightEnvelope, Object.freeze({})),
  /closed external observation issuer/,
  "the async Preview outer issuer rejects late use after callback resolution"
);
assert.throws(
  () => resolvedAsyncPreviewPairEvidenceIssuer.issue(independentlyProvidedCompletePreflightEnvelope.pairEvidenceEnvelope, Object.freeze({})),
  /closed external observation issuer/,
  "the async Preview nested issuer rejects late use after callback resolution"
);
const asyncPreviewFirstUse = completePreviewPreflight(asyncPreviewPreflightState, asyncPreviewPreflightEnvelope);
assert.equal(asyncPreviewFirstUse.phase, "history-only-repair", "async Preview outer and nested evidence succeeds on first use");
const asyncPreviewReplay = completePreviewPreflight(asyncPreviewPreflightState, asyncPreviewPreflightEnvelope);
assert.equal(asyncPreviewReplay.stopReason, "preview-external-observation-capability-missing", "async Preview outer and nested evidence rejects replay");
assert.equal(asyncPreviewReplay.history, asyncPreviewPreflightState.history, "async Preview replay rejection preserves history");
assert.deepEqual(asyncPreviewReplay.operations, asyncPreviewPreflightState.operations, "async Preview replay rejection performs zero operations");
assert.deepEqual(asyncPreviewReplay.sqlExecutions, asyncPreviewPreflightState.sqlExecutions, "async Preview replay rejection executes zero SQL");
const asyncPreviewNestedReplay = validatePairEvidenceEnvelope(asyncPreviewPreflightState, asyncPreviewPreflightEnvelope.pairEvidenceEnvelope);
assert.equal(asyncPreviewNestedReplay.stop.stopReason, "preview-external-observation-capability-missing", "async Preview nested pair-evidence issuer output rejects replay independently");
assert.equal(asyncPreviewNestedReplay.stop.history, asyncPreviewPreflightState.history, "async Preview nested replay rejection preserves history");
assert.deepEqual(asyncPreviewNestedReplay.stop.operations, asyncPreviewPreflightState.operations, "async Preview nested replay rejection performs zero operations");
assert.deepEqual(asyncPreviewNestedReplay.stop.sqlExecutions, asyncPreviewPreflightState.sqlExecutions, "async Preview nested replay rejection executes zero SQL");
const asyncPreviewObservationRejection = new Error("async Preview external observation rejected");
const rejectedAsyncPreviewState = createPreviewFixture({ targetKind: "preview" });
let rejectedAsyncPreviewIssuer;
let rejectedAsyncPreviewPairEvidenceIssuer;
let issuedBeforeAsyncPreviewRejection;
await assert.rejects(
  injectExternalPreviewReadOnlyObservation(
    async (issuer) => {
      rejectedAsyncPreviewIssuer = issuer;
      rejectedAsyncPreviewPairEvidenceIssuer = issuer.pairEvidenceIssuer;
      await Promise.resolve();
      const provided = independentExternalPreviewPreflightEnvelope();
      const pairEvidenceSource = createInternalStateMachineReadOnlyObservationSourceFixture(() => provided.pairEvidenceEnvelope);
      const pairEvidenceEnvelope = issueInternalStateMachineObservation(issuer.pairEvidenceIssuer, pairEvidenceSource);
      const preflightEnvelope = { ...provided, pairEvidenceEnvelope };
      const preflightSource = createInternalStateMachineReadOnlyObservationSourceFixture(() => preflightEnvelope);
      issuedBeforeAsyncPreviewRejection = issueInternalStateMachineObservation(issuer, preflightSource);
      throw asyncPreviewObservationRejection;
    },
    { state: rejectedAsyncPreviewState, observationKind: "preflight", subject: "preflight", expectedHistory: remoteMigrations }
  ),
  (error) => error === asyncPreviewObservationRejection,
  "the async Preview adapter preserves callback rejection"
);
assert.throws(
  () => rejectedAsyncPreviewIssuer.issue(independentlyProvidedCompletePreflightEnvelope, Object.freeze({})),
  /closed external observation issuer/,
  "the async Preview outer issuer rejects late use after callback rejection"
);
assert.throws(
  () => rejectedAsyncPreviewPairEvidenceIssuer.issue(independentlyProvidedCompletePreflightEnvelope.pairEvidenceEnvelope, Object.freeze({})),
  /closed external observation issuer/,
  "the async Preview nested issuer rejects late use after callback rejection"
);
const rejectedAsyncPreviewEnvelope = completePreviewPreflight(rejectedAsyncPreviewState, issuedBeforeAsyncPreviewRejection);
assert.equal(rejectedAsyncPreviewEnvelope.stopReason, "preview-external-observation-capability-missing", "Preview evidence issued before async callback rejection is never bound for use");
assert.equal(rejectedAsyncPreviewEnvelope.history, rejectedAsyncPreviewState.history, "async Preview callback rejection preserves history");
assert.deepEqual(rejectedAsyncPreviewEnvelope.operations, rejectedAsyncPreviewState.operations, "async Preview callback rejection performs zero operations");
assert.deepEqual(rejectedAsyncPreviewEnvelope.sqlExecutions, rejectedAsyncPreviewState.sqlExecutions, "async Preview callback rejection executes zero SQL");
const completeTestOnlyPreflightInput = {
  observedHistory: remoteMigrations,
  observedBodySemanticMd5: bodySemanticMd5,
  observedFunctionDefinitionMd5: remoteFunctionDefinitionMd5,
  result: "success",
  targetKind: "preview",
  provenance: testOnlyEvidenceProvenance,
  freshness: testOnlyEvidenceFreshness,
  pairEvidenceEnvelope: deterministicPairEvidenceEnvelope
};
assert.equal(completePreviewPreflight(createPreviewFixture({ targetKind: "preview" }), {
  ...independentlyProvidedCompletePreflightEnvelope,
  pairEvidenceEnvelope: undefined
}).stopReason, "preview-pair-evidence-envelope-missing", "Preview preflight cannot reach repair-ready without one complete eight-record evidence envelope");
const incompleteEvidenceState = completePreviewPreflight(createPreviewFixture({ targetKind: "preview" }), {
  ...independentlyProvidedCompletePreflightEnvelope,
  pairEvidenceEnvelope: { ...independentlyProvidedCompletePreflightEnvelope.pairEvidenceEnvelope, records: independentExternalPairEvidenceRecords.slice(0, -1) }
});
assert.equal(incompleteEvidenceState.stopReason, "preview-pair-evidence-envelope-wrong-count", "seven pair records stop before any history operation");
assert.equal(incompleteEvidenceState.operations.length, 0, "incomplete pair evidence performs zero history operations");
const duplicateEvidenceRecords = [...independentExternalPairEvidenceRecords];
duplicateEvidenceRecords[7] = { ...duplicateEvidenceRecords[0] };
assert.equal(completePreviewPreflight(createPreviewFixture({ targetKind: "preview" }), {
  ...independentlyProvidedCompletePreflightEnvelope,
  pairEvidenceEnvelope: { ...independentlyProvidedCompletePreflightEnvelope.pairEvidenceEnvelope, records: duplicateEvidenceRecords }
}).stopReason, "preview-pair-evidence-envelope-duplicate", "duplicate pair evidence stops before repair");
assert.equal(completePreviewPreflight(createPreviewFixture({ targetKind: "preview" }), {
  ...independentlyProvidedCompletePreflightEnvelope,
  pairEvidenceEnvelope: { ...independentlyProvidedCompletePreflightEnvelope.pairEvidenceEnvelope, result: "failure" }
}).stopReason, "preview-pair-evidence-envelope-failure", "failed pair evidence envelope stops before repair");
assert.equal(completePreviewPreflight(createPreviewFixture({ targetKind: "preview" }), {
  ...independentlyProvidedCompletePreflightEnvelope,
  pairEvidenceEnvelope: { ...independentlyProvidedCompletePreflightEnvelope.pairEvidenceEnvelope, result: "uncertain" }
}).stopReason, "preview-pair-evidence-envelope-uncertain", "uncertain pair evidence envelope stops before repair");
assert.equal(completePreviewPreflight(createPreviewFixture({ targetKind: "preview" }), {
  ...independentlyProvidedCompletePreflightEnvelope,
  pairEvidenceEnvelope: {
    ...independentlyProvidedCompletePreflightEnvelope.pairEvidenceEnvelope,
    records: independentExternalPairEvidenceRecords.map((record, index) => index === 0 ? { ...record, evidenceStatus: "unverified" } : record)
  }
}).stopReason, "preview-pair-evidence-envelope-unverified", "unverified pair evidence record stops before repair");
assert.equal(completePreviewPreflight(createPreviewFixture({ targetKind: "preview" }), {
  ...independentlyProvidedCompletePreflightEnvelope,
  pairEvidenceEnvelope: {
    ...independentlyProvidedCompletePreflightEnvelope.pairEvidenceEnvelope,
    records: independentExternalPairEvidenceRecords.map((record, index) => index === 0 ? { ...record, semanticEvidenceSha256: "0".repeat(64) } : record)
  }
}).stopReason, "preview-pair-evidence-envelope-mismatch", "mismatched pair evidence record stops before repair");
assert.equal(completePreviewPreflight(createPreviewFixture({ targetKind: "preview" }), {
  ...completeTestOnlyPreflightInput,
  provenance: { kind: externalPairEvidenceSource, liveObservation: true },
  freshness: { status: "fresh", marker: previewObservationFreshnessMarker("preflight", "preflight") }
}).stopReason, "preview-external-evidence-provenance-or-freshness-missing", "operator path rejects a deterministic pair envelope relabeled as live");
assert.equal(completePreviewPreflight(createPreviewFixture({ targetKind: "isolated-empty" }), {
  observedHistory: remoteMigrations,
  observedBodySemanticMd5: bodySemanticMd5,
  observedFunctionDefinitionMd5: remoteFunctionDefinitionMd5
}).stopReason, "preview-target-not-confirmed", "a non-Preview target stops before history repair");
assert.equal(completePreviewPreflight(createPreviewFixture(), {
  observedHistory: remoteMigrations,
  observedBodySemanticMd5: bodySemanticMd5,
  observedFunctionDefinitionMd5: remoteFunctionDefinitionMd5
}).stopReason, "preview-target-not-confirmed", "an unknown target stops before history repair");
assert.equal(completePreviewPreflight(createPreviewFixture({ targetKind: "preview" }), {
  ...independentlyProvidedCompletePreflightEnvelope,
  observedHistory: [...remoteMigrations, remoteMigrations[0]],
}).stopReason, "preview-history-inventory-mismatch", "duplicate Preview preflight history stops before repair");
assert.equal(completePreviewPreflight(createPreviewFixture({ targetKind: "preview" }), {
  ...independentlyProvidedCompletePreflightEnvelope,
  observedHistory: remoteMigrations.slice(1),
}).stopReason, "preview-history-inventory-mismatch", "incomplete Preview preflight history stops before repair");
assert.equal(completePreviewPreflight(createPreviewFixture({ targetKind: "preview" }), {
  ...independentlyProvidedCompletePreflightEnvelope,
  observedHistory: [...remoteMigrations, "20990101000000_unknown"],
}).stopReason, "preview-history-inventory-mismatch", "extra Preview preflight history stops before repair");
assert.equal(completePreviewPreflight(createPreviewFixture({ targetKind: "preview" }), {
  ...independentlyProvidedCompletePreflightEnvelope,
  observedBodySemanticMd5: "00000000000000000000000000000000",
}).stopReason, "preview-semantic-or-hash-mismatch", "Preview body semantic hash mismatch stops before repair");
assert.equal(completePreviewPreflight(createPreviewFixture({ targetKind: "preview" }), {
  ...independentlyProvidedCompletePreflightEnvelope,
  observedFunctionDefinitionMd5: "00000000000000000000000000000000",
}).stopReason, "preview-semantic-or-hash-mismatch", "Preview generated function-definition hash mismatch stops before repair");
assert.equal(completePreviewPreflight(createPreviewFixture({ targetKind: "preview" }), {
  observedHistory: remoteMigrations,
  observedBodySemanticMd5: bodySemanticMd5,
  observedFunctionDefinitionMd5: remoteFunctionDefinitionMd5,
  result: "failure"
}).stopReason, "preview-preflight-failure", "failed Preview preflight stops before repair");
assert.equal(completePreviewPreflight(createPreviewFixture({ targetKind: "preview" }), {
  observedHistory: remoteMigrations,
  observedBodySemanticMd5: bodySemanticMd5,
  observedFunctionDefinitionMd5: remoteFunctionDefinitionMd5,
  result: "uncertain"
}).stopReason, "preview-preflight-uncertain", "uncertain Preview preflight stops before repair");
assert.equal(completePreviewPreflight(createPreviewFixture({ targetKind: "preview" }), {
  observedHistory: remoteMigrations,
  observedBodySemanticMd5: bodySemanticMd5,
  observedFunctionDefinitionMd5: remoteFunctionDefinitionMd5
}).stopReason, "preview-preflight-result-missing", "omitted Preview preflight result stops fail-closed");

function assertUnknownResultStopsWithoutMutation(label, state, invoke, stopReason) {
  const stateBefore = {
    ...state,
    history: Array.isArray(state.history) ? [...state.history] : state.history,
    operations: state.operations.map((operation) => ({ ...operation })),
    sqlExecutions: [...state.sqlExecutions]
  };
  const rejected = invoke();
  assert.equal(rejected.stopped, true, `${label} unknown result returns a stopped state`);
  assert.equal(rejected.stopReason, stopReason, `${label} unknown result uses the path-specific unverified reason`);
  assert.deepEqual(state, stateBefore, `${label} unknown result does not mutate the input state`);
  assert.deepEqual(rejected.history, state.history, `${label} unknown result does not change history`);
  assert.deepEqual(rejected.operations, state.operations, `${label} unknown result performs zero additional operations`);
  assert.deepEqual(rejected.sqlExecutions, state.sqlExecutions, `${label} unknown result executes zero additional SQL`);
}

function assertPairEvidenceFreshnessStopsWithoutMutation(label, state, invoke) {
  const stateBefore = {
    ...state,
    history: [...state.history],
    operations: state.operations.map((operation) => ({ ...operation })),
    sqlExecutions: [...state.sqlExecutions]
  };
  const rejected = invoke();
  assert.equal(rejected.stopped, true, `${label} returns a stopped state`);
  assert.equal(rejected.stopReason, "history-pair-evidence-mismatch", `${label} rejects missing or mismatched freshness`);
  assert.deepEqual(state, stateBefore, `${label} does not mutate the input state`);
  assert.deepEqual(rejected.history, state.history, `${label} does not change history`);
  assert.deepEqual(rejected.operations, state.operations, `${label} performs zero additional operations`);
  assert.deepEqual(rejected.sqlExecutions, state.sqlExecutions, `${label} executes zero additional SQL`);
}

const unknownPreviewPreflightState = createPreviewFixture({ targetKind: "preview" });
assertUnknownResultStopsWithoutMutation(
  "Preview preflight",
  unknownPreviewPreflightState,
  () => completePreviewPreflight(unknownPreviewPreflightState, { ...independentlyProvidedCompletePreflightEnvelope, result: "unexpected" }),
  "preview-preflight-unverified"
);

const evidenceGateFixture = createOpaqueOperatorObservedPreviewFixture();
assert.equal(expectedPairEvidenceRecords.length, 8, "all eight history-only pairs have fixed semantic and privilege evidence");
assert.notEqual(
  expectedPairEvidenceRecords[0].semanticEvidenceSha256,
  crypto.createHash("sha256").update(`gate0a2-pair-semantic-v1|${expectedOperatorMappings[0].join("|")}`).digest("hex"),
  "pair semantic evidence is bound to canonical source content rather than names and category alone"
);
assert.notEqual(
  expectedPairEvidenceRecords[0].privilegeEvidenceSha256,
  crypto.createHash("sha256").update(`gate0a2-pair-privilege-v1|${expectedOperatorMappings[0].join("|")}`).digest("hex"),
  "pair privilege evidence is bound to explicit ACL, owner, and lease invariants rather than names and category alone"
);
for (const [index, evidence] of expectedPairEvidenceRecords.entries()) {
  const source = pairEvidenceSources[index];
  const canonicalMigration = sourceDescriptor(`supabase/migrations/${evidence.localName}.sql`);
  const focusedContracts = source.focusedContracts.map(sourceDescriptor);
  const mapping = { remoteName: evidence.remoteName, localName: evidence.localName, category: evidence.category };
  assert.equal(evidence.semanticEvidenceSha256, sha256(JSON.stringify({ schema: "gate0a2-source-bound-semantic-v2", mapping, canonicalMigration, focusedContracts })), `pair ${index + 1} semantic evidence is bound to canonical migration and focused-contract content`);
  assert.equal(evidence.privilegeEvidenceSha256, sha256(JSON.stringify({ schema: "gate0a2-source-bound-privilege-v2", mapping, canonicalMigration, focusedContracts, privilegeInvariants: source.privilegeInvariants })), `pair ${index + 1} privilege evidence is bound to ACL, owner, and lease invariants`);
  assert.equal(evidence.ownerLeaseEvidenceSha256, sha256(JSON.stringify({ schema: "gate0a2-source-bound-owner-lease-v1", mapping, canonicalMigration, focusedContracts, ownerLeaseInvariants: source.ownerLeaseInvariants })), `pair ${index + 1} owner/lease evidence is independently source-bound`);
  assert.equal(evidence.evidenceSource, pairEvidenceFixtureSource, `pair ${index + 1} deterministic fixture does not imply a live observation`);
  assert.equal(evidence.operatorEvidenceRequirement, operatorPairEvidenceRequirement, `pair ${index + 1} requires external read-only operator evidence before actual history repair`);
}
assert.equal(revertHistoryMigration(evidenceGateFixture, expectedOperatorMappings[0], { result: "success" }).stopReason, "history-pair-evidence-missing", "history revert rejects missing external pair evidence");
const revertEvidenceWithoutFreshness = { ...independentExternalPairEvidenceRecords[0] };
delete revertEvidenceWithoutFreshness.freshnessMarker;
assertPairEvidenceFreshnessStopsWithoutMutation(
  "history revert missing pair-evidence freshness",
  evidenceGateFixture,
  () => revertHistoryMigration(evidenceGateFixture, expectedOperatorMappings[0], { result: "success", observedPairEvidence: revertEvidenceWithoutFreshness })
);
assertPairEvidenceFreshnessStopsWithoutMutation(
  "history revert mismatched pair-evidence freshness",
  evidenceGateFixture,
  () => revertHistoryMigration(evidenceGateFixture, expectedOperatorMappings[0], {
    result: "success",
    observedPairEvidence: { ...independentExternalPairEvidenceRecords[0], freshnessMarker: "stale-or-different-preview-preflight" }
  })
);
assert.equal(revertHistoryMigration(evidenceGateFixture, expectedOperatorMappings[0], { observedPairEvidence: independentExternalPairEvidenceRecords[0] }).stopReason, "history-revert-result-missing", "history revert rejects an omitted external operation result");
assert.equal(revertHistoryMigration(evidenceGateFixture, expectedOperatorMappings[0], {
  result: "success",
  observedPairEvidence: { ...independentExternalPairEvidenceRecords[0], evidenceStatus: "uncertain" }
}).stopReason, "history-pair-evidence-uncertain", "history revert rejects uncertain pair evidence");
assert.equal(revertHistoryMigration(evidenceGateFixture, expectedOperatorMappings[0], {
  result: "success",
  observedPairEvidence: { ...independentExternalPairEvidenceRecords[0], evidenceStatus: "unverified" }
}).stopReason, "history-pair-evidence-unverified", "history revert rejects unverified pair evidence");
assert.equal(revertHistoryMigration(evidenceGateFixture, expectedOperatorMappings[0], {
  result: "success",
  observedPairEvidence: { ...independentExternalPairEvidenceRecords[0], semanticEvidenceSha256: "0".repeat(64) }
}).stopReason, "history-pair-evidence-mismatch", "history revert rejects mismatched semantic evidence");
assert.equal(revertHistoryMigration(evidenceGateFixture, expectedOperatorMappings[0], {
  result: "success",
  observedPairEvidence: { ...independentExternalPairEvidenceRecords[0], privilegeEvidenceSha256: "0".repeat(64) }
}).stopReason, "history-pair-evidence-mismatch", "history revert rejects mismatched privilege evidence");
const pairEvidenceWithoutOwnerLeaseHash = { ...independentExternalPairEvidenceRecords[0] };
delete pairEvidenceWithoutOwnerLeaseHash.ownerLeaseEvidenceSha256;
assert.equal(revertHistoryMigration(evidenceGateFixture, expectedOperatorMappings[0], {
  result: "success",
  observedPairEvidence: pairEvidenceWithoutOwnerLeaseHash
}).stopReason, "history-pair-evidence-mismatch", "history revert rejects missing source-bound owner/lease evidence");
assert.equal(revertHistoryMigration(evidenceGateFixture, expectedOperatorMappings[0], {
  result: "success",
  observedPairEvidence: { ...independentExternalPairEvidenceRecords[0], ownerLeaseEvidenceSha256: "0".repeat(64) }
}).stopReason, "history-pair-evidence-mismatch", "history revert rejects mutated source-bound owner/lease evidence");
assert.equal(revertHistoryMigration(evidenceGateFixture, expectedOperatorMappings[0], {
  result: "success",
  observedPairEvidence: { ...independentExternalPairEvidenceRecords[0], localName: independentExternalPairEvidenceRecords[1].localName }
}).stopReason, "history-pair-evidence-mismatch", "history revert rejects mismatched remote-to-local evidence mapping");
assert.equal(revertHistoryMigration(evidenceGateFixture, expectedOperatorMappings[0], {
  result: "success",
  observedPairEvidence: { ...independentExternalPairEvidenceRecords[0], operatorEvidenceRequirement: "missing-external-evidence-requirement" }
}).stopReason, "history-pair-evidence-mismatch", "history revert rejects mismatched evidence provenance requirements");
assert.equal(revertHistoryMigration(evidenceGateFixture, expectedOperatorMappings[0], {
  result: "success",
  observedPairEvidence: nameDerivedPairEvidenceFixtures[0]
}).stopReason, "history-pair-evidence-mismatch", "history revert rejects the former name-derived fixed evidence object");

const bareExternalObservationProviderResult = { result: "success", observedHistory: remoteMigrations };
const adaptedBareExternalObservationProviderResult = injectExternalPreviewReadOnlyObservation(() => bareExternalObservationProviderResult, {
    state: evidenceGateFixture,
    observationKind: "history-revert-readback",
    subject: expectedOperatorMappings[0][0],
    expectedHistory: remoteMigrations
  });
assert.strictEqual(adaptedBareExternalObservationProviderResult, bareExternalObservationProviderResult, "the external Preview adapter passes through the provider result without issuing capability metadata");

const independentExternalPreviewHistoryProvider = (request) => {
  const pairIndex = expectedOperatorMappings.findIndex(([remoteName, localName]) => (
    request.observationKind === "history-revert-readback" ? remoteName === request.subject : localName === request.subject
  ));
  const additiveIndex = additiveAllowlist.indexOf(request.subject);
  let observedHistory;
  if (request.observationKind === "history-revert-readback" && pairIndex >= 0) {
    observedHistory = independentlyObservedPreviewHistoryReadbacks[pairIndex].revert;
  } else if (request.observationKind === "history-apply-readback" && pairIndex >= 0) {
    observedHistory = independentlyObservedPreviewHistoryReadbacks[pairIndex].apply;
  } else if (request.observationKind === "additive-readback" && additiveIndex >= 0) {
    observedHistory = independentlyObservedAdditiveHistoryReadbacks[additiveIndex];
  }
  const source = createInternalStateMachineReadOnlyObservationSourceFixture(() => Object.freeze({
    result: observedHistory ? "success" : "failure",
    targetKind: "preview",
    provenance: Object.freeze({ kind: externalPairEvidenceSource, liveObservation: true }),
    freshness: Object.freeze({ status: "fresh", marker: previewObservationFreshnessMarker(request.observationKind, request.subject) }),
    observedHistory: observedHistory && Object.freeze([...observedHistory])
  }));
  return issueInternalStateMachineObservation(request, source);
};

function observeIndependentExternalPreviewHistory(state, observationKind, subject) {
  const expectedHistory = observationKind === "additive-readback"
    ? [...state.history, subject].sort()
    : state.history;
  return injectExternalPreviewReadOnlyObservation(
    independentExternalPreviewHistoryProvider,
    { state, observationKind, subject, expectedHistory }
  );
}

function issueMutatedPreviewHistoryObservation(state, source, observationKind, subject, observedHistory, expectedHistory) {
  return injectExternalPreviewReadOnlyObservation(
    (request) => {
      const observationSource = createInternalStateMachineReadOnlyObservationSourceFixture(() => ({ ...source, [operatorExternalObservationCapability]: undefined, observedHistory }));
      return issueInternalStateMachineObservation(request, observationSource);
    },
    { state, observationKind, subject, expectedHistory }
  );
}

let previewFixture = completePreviewPreflight(createPreviewFixture({ targetKind: "preview" }), completeTestOnlyPreflightInput);
assert.equal(previewFixture.stopReason, "preview-not-live-static-evidence-rejected", "deterministic not-live fixtures stop during Preview preflight");
assert.equal(previewFixture.preflightVerified, false, "deterministic not-live fixtures cannot verify Preview preflight");
assert.equal(previewFixture.pairEvidenceVerified, false, "deterministic not-live fixtures cannot verify Preview pair evidence");
assert.equal(previewFixture.history, null, "deterministic not-live fixtures leave Preview history uninitialized");
assert.deepEqual(previewFixture.operations, [], "deterministic not-live fixtures perform zero Preview history operations");
assert.deepEqual(previewFixture.sqlExecutions, [], "deterministic not-live fixtures execute zero additive SQL");
const missingPairEvidenceMode = revertHistoryMigration({ ...completeExternalPreflightState, pairEvidenceMode: null }, expectedOperatorMappings[0], {
  result: "success",
  observedPairEvidence: independentlyObservedPairEvidence[0]
});
assert.equal(missingPairEvidenceMode.stopReason, "preview-history-mutation-requires-external-pair-evidence", "missing pair evidence mode cannot start Preview history mutation");
assert.equal(missingPairEvidenceMode.operations.length, 0, "missing pair evidence mode performs zero Preview history operations");
const invalidPairEvidenceMode = revertHistoryMigration({ ...completeExternalPreflightState, pairEvidenceMode: "invalid-external-mode" }, expectedOperatorMappings[0], {
  result: "success",
  observedPairEvidence: independentlyObservedPairEvidence[0]
});
assert.equal(invalidPairEvidenceMode.stopReason, "preview-history-mutation-requires-external-pair-evidence", "invalid pair evidence mode cannot start Preview history mutation");
assert.equal(invalidPairEvidenceMode.operations.length, 0, "invalid pair evidence mode performs zero Preview history operations");
const unverifiedExternalPairEvidence = revertHistoryMigration({ ...completeExternalPreflightState, pairEvidenceVerified: false, pairEvidenceMode: externalPairEvidenceSource }, expectedOperatorMappings[0], {
  result: "success",
  observedPairEvidence: independentExternalPairEvidenceRecords[0]
});
assert.equal(unverifiedExternalPairEvidence.stopReason, "preview-history-mutation-requires-external-pair-evidence", "external mode without verified pair evidence cannot start Preview history mutation");
assert.equal(unverifiedExternalPairEvidence.operations.length, 0, "unverified external pair evidence performs zero Preview history operations");
previewFixture = createTestShapedExternalPreviewFixture();
assert.equal(testShapedExternalPairEvidenceEnvelope.fixtureLabel, "sanitized-static-external-envelope-shape-not-live-evidence", "the external success envelope is explicitly labeled as a sanitized static test shape");
assert.equal(previewFixture.stopReason, "preview-not-live-static-evidence-rejected", "a labeled not-live static envelope cannot enter the Preview mutation path");
assert.equal(previewFixture.preflightVerified, false, "rejected not-live static evidence cannot verify Preview preflight");
assert.deepEqual(previewFixture.operations, [], "rejected not-live static evidence performs zero Preview history operations");
assert.deepEqual(previewFixture.sqlExecutions, [], "rejected not-live static evidence executes zero additive SQL");
assert.strictEqual(revertHistoryMigration(previewFixture, expectedOperatorMappings[0], { result: "success", observedPairEvidence: independentExternalPairEvidenceRecords[0] }), previewFixture, "rejected not-live static evidence stops at the first revert with zero operations");
const selfAssertedExternalPreviewFixture = completePreviewPreflight(createPreviewFixture({ targetKind: "preview" }), {
  ...independentExternalPreviewPreflightEnvelope(),
  [operatorExternalObservationCapability]: undefined
});
assert.equal(selfAssertedExternalPreviewFixture.stopReason, "preview-external-observation-capability-missing", "external-looking strings cannot promote static data into operator mode without the opaque capability");
assert.deepEqual(selfAssertedExternalPreviewFixture.operations, [], "missing opaque capability stops before the first Preview history operation");
assert.deepEqual(selfAssertedExternalPreviewFixture.sqlExecutions, [], "missing opaque capability stops before additive SQL");
const incompleteExternalPreflightCases = [
  ["target", { ...independentExternalPreviewPreflightEnvelope(), targetKind: "isolated-empty" }, "preview-preflight-observation-provenance-or-freshness-missing"],
  ["provenance", { ...independentExternalPreviewPreflightEnvelope(), provenance: { kind: "deterministic-contract-fixture", liveObservation: true } }, "preview-not-live-static-evidence-rejected"],
  ["freshness", { ...independentExternalPreviewPreflightEnvelope(), freshness: { status: "stale", marker: previewObservationFreshnessMarker("preflight", "preflight") } }, "preview-preflight-observation-provenance-or-freshness-missing"]
];
for (const [missingRequirement, envelope, expectedStopReason] of incompleteExternalPreflightCases) {
  const stopped = completePreviewPreflight(createPreviewFixture({ targetKind: "preview" }), envelope);
  assert.equal(stopped.stopReason, expectedStopReason, `static external-shaped preflight stops when ${missingRequirement} does not match`);
  assert.equal(stopped.preflightVerified, false, `mismatched ${missingRequirement} cannot verify Preview preflight`);
  assert.equal(stopped.pairEvidenceVerified, false, `mismatched ${missingRequirement} cannot verify Preview pair evidence`);
  assert.equal(stopped.history, null, `mismatched ${missingRequirement} leaves Preview history uninitialized`);
  assert.deepEqual(stopped.operations, [], `mismatched ${missingRequirement} performs zero Preview history operations`);
  assert.deepEqual(stopped.sqlExecutions, [], `mismatched ${missingRequirement} executes zero additive SQL`);
}
const pairEvidenceEnvelopeWithoutCapability = { ...independentExternalPreviewPreflightEnvelope().pairEvidenceEnvelope };
delete pairEvidenceEnvelopeWithoutCapability[operatorExternalObservationCapability];
const missingEnvelopeCapabilityPreviewFixture = completePreviewPreflight(createPreviewFixture({ targetKind: "preview" }), {
  ...independentExternalPreviewPreflightEnvelope(),
  pairEvidenceEnvelope: pairEvidenceEnvelopeWithoutCapability
});
assert.equal(missingEnvelopeCapabilityPreviewFixture.stopReason, "preview-external-observation-capability-missing", "the external pair evidence envelope must carry the same opaque capability as the preflight input");
assert.deepEqual(missingEnvelopeCapabilityPreviewFixture.operations, [], "missing pair-envelope capability performs zero Preview history operations");
assert.deepEqual(missingEnvelopeCapabilityPreviewFixture.sqlExecutions, [], "missing pair-envelope capability executes zero additive SQL");
const pairEvidenceEnvelopeWithoutTarget = { ...independentExternalPreviewPreflightEnvelope().pairEvidenceEnvelope };
delete pairEvidenceEnvelopeWithoutTarget.targetKind;
const missingPairEnvelopeTargetPreviewFixture = completePreviewPreflight(createPreviewFixture({ targetKind: "preview" }), {
  ...independentExternalPreviewPreflightEnvelope(),
  pairEvidenceEnvelope: pairEvidenceEnvelopeWithoutTarget
});
assert.equal(missingPairEnvelopeTargetPreviewFixture.stopReason, "preview-pair-evidence-envelope-target-mismatch", "the external pair evidence envelope must explicitly identify the Preview target");
assert.deepEqual(missingPairEnvelopeTargetPreviewFixture.operations, [], "missing pair-envelope target performs zero Preview history operations");
assert.deepEqual(missingPairEnvelopeTargetPreviewFixture.sqlExecutions, [], "missing pair-envelope target executes zero additive SQL");
previewFixture = createOpaqueOperatorObservedPreviewFixture();
assert.equal(previewFixture.pairEvidenceMode, "internal-state-machine-fixture-not-live", "the local state-machine success path remains explicitly not-live fixture mode");
assert.equal(previewFixture.pairEvidenceRecords.length, 8, "the opaque-capability operator path keeps the complete eight-record evidence envelope");
assert.deepEqual(sorted(previewFixture.history), sorted(remoteMigrations), "the opaque-capability operator path starts from the exact observed remote history");
const historyTransitionTrace = [];
for (const [index, pair] of expectedOperatorMappings.entries()) {
  const reverted = revertHistoryMigration(previewFixture, pair, { result: "success", observedPairEvidence: previewFixture.pairEvidenceRecords[index] });
  historyTransitionTrace.push(`revert:${pair[0]}`);
  assert.equal(reverted.phase, "awaiting-history-revert-readback", `history-only pair ${index + 1} revert awaits readback`);
  assert.ok(!reverted.history.includes(pair[0]), `history-only pair ${index + 1} revert removes the remote label`);
  assert.ok(!reverted.history.includes(pair[1]), `history-only pair ${index + 1} revert leaves the canonical target absent`);
  assert.equal(assertUntouchedSameVersion(reverted), true, `history-only pair ${index + 1} revert leaves the same-version source untouched`);
  const revertObservation = observeIndependentExternalPreviewHistory(reverted, "history-revert-readback", pair[0]);
  const revertReadback = readBackHistoryRevert(reverted, pair, revertObservation);
  historyTransitionTrace.push(`external-readback-after-revert:${pair[0]}`);
  assert.equal(revertReadback.phase, "history-only-apply", `history-only pair ${index + 1} revert readback enables only its apply`);
  const applied = applyHistoryMigration(revertReadback, pair, { result: "success", observedPairEvidence: revertReadback.pairEvidenceRecords[index] });
  historyTransitionTrace.push(`apply:${pair[1]}`);
  assert.equal(applied.phase, "awaiting-history-apply-readback", `history-only pair ${index + 1} apply awaits readback`);
  assert.equal(applied.history.filter((name) => name === pair[1]).length, 1, `history-only pair ${index + 1} apply exposes one canonical entry for readback`);
  const applyObservation = observeIndependentExternalPreviewHistory(applied, "history-apply-readback", pair[1]);
  previewFixture = readBackHistoryApply(applied, pair, applyObservation);
  historyTransitionTrace.push(`external-readback-after-apply:${pair[1]}`);
  assert.equal(previewFixture.stopped, false, `history-only pair ${index + 1} succeeds only after both readbacks`);
  assert.equal(previewFixture.operations.length, (index + 1) * 2, `history-only pair ${index + 1} adds exactly reverted then applied operations`);
  assert.equal(previewFixture.sqlExecutions.length, 0, `history-only pair ${index + 1} executes zero SQL statements`);
  assert.equal(assertUntouchedSameVersion(previewFixture), true, `history-only pair ${index + 1} leaves the same-version source untouched`);
  assert.ok(!previewFixture.history.includes(pair[0]), `history-only pair ${index + 1} removes only the remote label`);
  assert.ok(previewFixture.history.includes(pair[1]), `history-only pair ${index + 1} adds the canonical local label`);
}
assert.equal(previewFixture.phase, "history-repair-complete", "all eight history-only pairs reach history-repair-complete");
assert.deepEqual(previewFixture.operations, expectedOperatorMappings.flatMap(([remoteName, localName]) => [
  { kind: "history-only-reverted", migration: remoteName },
  { kind: "history-only-applied", migration: localName }
]), "each pair is applied one at a time as history-only reverted(remote) then applied(local)");
assert.deepEqual(historyTransitionTrace, expectedOperatorMappings.flatMap(([remoteName, localName]) => [
  `revert:${remoteName}`,
  `external-readback-after-revert:${remoteName}`,
  `apply:${localName}`,
  `external-readback-after-apply:${localName}`
]), "all eight pairs follow exact revert(remote), external readback, apply(local), external readback order");

const wrongRepairOrder = revertHistoryMigration(createOpaqueOperatorObservedPreviewFixture(), expectedOperatorMappings[1], { result: "success", observedPairEvidence: independentExternalPairEvidenceRecords[1] });
assert.equal(wrongRepairOrder.stopReason, "wrong-order-or-mapping", "wrong history repair order stops");
assert.strictEqual(revertHistoryMigration(wrongRepairOrder, expectedOperatorMappings[0]), wrongRepairOrder, "a stopped repair does not automatically continue");
const historyRevertFailure = revertHistoryMigration(createOpaqueOperatorObservedPreviewFixture(), expectedOperatorMappings[0], { result: "failure", observedPairEvidence: independentExternalPairEvidenceRecords[0] });
assert.equal(historyRevertFailure.stopReason, "history-revert-failure", "known history revert failure stops without changing history");
assert.deepEqual(historyRevertFailure.history, remoteMigrations, "known history revert failure preserves the pre-operation history");
const historyRevertUncertain = revertHistoryMigration(createOpaqueOperatorObservedPreviewFixture(), expectedOperatorMappings[0], { result: "uncertain", observedPairEvidence: independentExternalPairEvidenceRecords[0] });
assert.equal(historyRevertUncertain.stopReason, "history-revert-uncertain", "uncertain history revert stops");
assert.strictEqual(readBackHistoryRevert(historyRevertUncertain, expectedOperatorMappings[0]), historyRevertUncertain, "uncertain history revert cannot automatically continue to readback");
const unknownHistoryRevertState = createOpaqueOperatorObservedPreviewFixture();
assertUnknownResultStopsWithoutMutation(
  "history revert",
  unknownHistoryRevertState,
  () => revertHistoryMigration(unknownHistoryRevertState, expectedOperatorMappings[0], { result: "unexpected", observedPairEvidence: independentExternalPairEvidenceRecords[0] }),
  "history-revert-unverified"
);

const firstPairReverted = revertHistoryMigration(createOpaqueOperatorObservedPreviewFixture(), expectedOperatorMappings[0], { result: "success", observedPairEvidence: independentExternalPairEvidenceRecords[0] });
const bareRevertReadback = readBackHistoryRevert(firstPairReverted, expectedOperatorMappings[0], independentlyObservedPreviewHistoryReadbacks[0].revert, { result: "success" });
assert.equal(bareRevertReadback.stopReason, "history-revert-readback-observation-envelope-missing", "bare Preview revert readback arrays are rejected fail-closed");
assert.deepEqual(bareRevertReadback.history, firstPairReverted.history, "bare Preview revert readback rejection does not change history");
assert.deepEqual(bareRevertReadback.operations, firstPairReverted.operations, "bare Preview revert readback rejection performs zero additional operations");
assert.deepEqual(bareRevertReadback.sqlExecutions, firstPairReverted.sqlExecutions, "bare Preview revert readback rejection executes zero additional SQL");
const bareCallbackRevertObservation = injectExternalPreviewReadOnlyObservation(
  () => ({ result: "success", observedHistory: independentlyObservedPreviewHistoryReadbacks[0].revert }),
  { state: firstPairReverted, observationKind: "history-revert-readback", subject: expectedOperatorMappings[0][0], expectedHistory: firstPairReverted.history }
);
const bareCallbackRevertReadback = readBackHistoryRevert(firstPairReverted, expectedOperatorMappings[0], bareCallbackRevertObservation);
assert.equal(bareCallbackRevertReadback.stopReason, "history-revert-readback-observation-target-mismatch", "a bare callback result is not promoted into an external Preview observation envelope");
assert.deepEqual(bareCallbackRevertReadback.history, firstPairReverted.history, "bare callback rejection does not change Preview history");
assert.deepEqual(bareCallbackRevertReadback.operations, firstPairReverted.operations, "bare callback rejection performs zero additional Preview history operations");
assert.deepEqual(bareCallbackRevertReadback.sqlExecutions, firstPairReverted.sqlExecutions, "bare callback rejection executes zero additional SQL");
const relabeledStaticRevertEnvelope = Object.freeze({
  result: "success",
  targetKind: "preview",
  provenance: Object.freeze({ kind: externalPairEvidenceSource, liveObservation: true }),
  freshness: Object.freeze({ status: "fresh", marker: previewObservationFreshnessMarker("history-revert-readback", expectedOperatorMappings[0][0]) }),
  observedHistory: Object.freeze([...independentlyObservedPreviewHistoryReadbacks[0].revert])
});
const relabeledStaticRevertObservation = injectExternalPreviewReadOnlyObservation(
  () => relabeledStaticRevertEnvelope,
  { state: firstPairReverted, observationKind: "history-revert-readback", subject: expectedOperatorMappings[0][0], expectedHistory: firstPairReverted.history }
);
assert.strictEqual(relabeledStaticRevertObservation, relabeledStaticRevertEnvelope, "the Preview adapter does not replace a relabeled static full envelope");
const relabeledStaticRevertReadback = readBackHistoryRevert(firstPairReverted, expectedOperatorMappings[0], relabeledStaticRevertObservation);
assert.equal(relabeledStaticRevertReadback.stopReason, "history-revert-readback-observation-capability-missing", "a relabeled static full envelope without a registry-issued capability is rejected");
assert.deepEqual(relabeledStaticRevertReadback.history, firstPairReverted.history, "relabeled static full-envelope rejection preserves Preview history");
assert.deepEqual(relabeledStaticRevertReadback.operations, firstPairReverted.operations, "relabeled static full-envelope rejection performs zero additional Preview operations");
assert.deepEqual(relabeledStaticRevertReadback.sqlExecutions, firstPairReverted.sqlExecutions, "relabeled static full-envelope rejection executes zero additional Preview SQL");
let firstRevertObservation = observeIndependentExternalPreviewHistory(firstPairReverted, "history-revert-readback", expectedOperatorMappings[0][0]);
const differentRequestRevertObservation = injectExternalPreviewReadOnlyObservation(
  () => firstRevertObservation,
  { state: firstPairReverted, observationKind: "history-revert-readback", subject: expectedOperatorMappings[0][0], expectedHistory: firstPairReverted.history }
);
const differentRequestRevertReadback = readBackHistoryRevert(firstPairReverted, expectedOperatorMappings[0], differentRequestRevertObservation);
assert.equal(differentRequestRevertReadback.stopReason, "history-revert-readback-observation-capability-missing", "an envelope issued for a different adapter request is rejected");
assert.deepEqual(differentRequestRevertReadback.history, firstPairReverted.history, "different-request rejection preserves Preview history");
assert.deepEqual(differentRequestRevertReadback.operations, firstPairReverted.operations, "different-request rejection performs zero additional Preview operations");
assert.deepEqual(differentRequestRevertReadback.sqlExecutions, firstPairReverted.sqlExecutions, "different-request rejection executes zero additional Preview SQL");
firstRevertObservation = observeIndependentExternalPreviewHistory(firstPairReverted, "history-revert-readback", expectedOperatorMappings[0][0]);
const cyclicRevertObservation = { ...firstRevertObservation };
cyclicRevertObservation.nested = cyclicRevertObservation;
const cyclicRevertReadback = readBackHistoryRevert(firstPairReverted, expectedOperatorMappings[0], cyclicRevertObservation);
assert.equal(cyclicRevertReadback.stopReason, "history-revert-readback-invalid-observation", "cyclic Preview readback envelopes stop explicitly without a RangeError");
assert.deepEqual(cyclicRevertReadback.history, firstPairReverted.history, "cyclic Preview readback rejection does not change history");
assert.deepEqual(cyclicRevertReadback.operations, firstPairReverted.operations, "cyclic Preview readback rejection performs zero additional operations");
assert.deepEqual(cyclicRevertReadback.sqlExecutions, firstPairReverted.sqlExecutions, "cyclic Preview readback rejection executes zero additional SQL");
const enumerationFailureObservation = { ...firstRevertObservation, nested: new Proxy({}, { ownKeys() { throw new Error("enumeration blocked"); } }) };
assert.equal(readBackHistoryRevert(firstPairReverted, expectedOperatorMappings[0], enumerationFailureObservation).stopReason, "history-revert-readback-invalid-observation", "observation enumeration failures stop explicitly");
const overDepthObservation = { ...firstRevertObservation };
let overDepthCursor = overDepthObservation;
for (let depth = 0; depth < 18; depth += 1) {
  overDepthCursor.nested = {};
  overDepthCursor = overDepthCursor.nested;
}
assert.equal(readBackHistoryRevert(firstPairReverted, expectedOperatorMappings[0], overDepthObservation).stopReason, "history-revert-readback-invalid-observation", "observation traversal depth overflow stops explicitly");
const overEntryObservation = { ...firstRevertObservation, nested: Object.fromEntries(Array.from({ length: 513 }, (_, index) => [`field${index}`, index])) };
const overEntryReadback = readBackHistoryRevert(firstPairReverted, expectedOperatorMappings[0], overEntryObservation);
assert.equal(overEntryReadback.stopReason, "history-revert-readback-invalid-observation", "observation traversal entry overflow stops explicitly");
assert.deepEqual(overEntryReadback.history, firstPairReverted.history, "bounded traversal rejection does not change history");
assert.deepEqual(overEntryReadback.operations, firstPairReverted.operations, "bounded traversal rejection performs zero additional operations");
assert.deepEqual(overEntryReadback.sqlExecutions, firstPairReverted.sqlExecutions, "bounded traversal rejection executes zero additional SQL");
const missingRevertCapability = { ...firstRevertObservation };
delete missingRevertCapability[operatorExternalObservationCapability];
assert.equal(readBackHistoryRevert(firstPairReverted, expectedOperatorMappings[0], missingRevertCapability).stopReason, "history-revert-readback-observation-capability-missing", "Preview revert readback rejects a missing opaque capability");
const mismatchedRevertCapability = { ...firstRevertObservation, [operatorExternalObservationCapability]: Symbol("wrong-external-observation-capability") };
const mismatchedCapabilityReadback = readBackHistoryRevert(firstPairReverted, expectedOperatorMappings[0], mismatchedRevertCapability);
assert.equal(mismatchedCapabilityReadback.stopReason, "history-revert-readback-observation-capability-missing", "Preview revert readback rejects an opaque capability that differs from the state capability");
assert.deepEqual(mismatchedCapabilityReadback.history, firstPairReverted.history, "mismatched capability rejection does not change Preview history");
assert.deepEqual(mismatchedCapabilityReadback.operations, firstPairReverted.operations, "mismatched capability rejection performs zero additional Preview history operations");
assert.deepEqual(mismatchedCapabilityReadback.sqlExecutions, firstPairReverted.sqlExecutions, "mismatched capability rejection executes zero additional SQL");
assert.equal(readBackHistoryRevert(firstPairReverted, expectedOperatorMappings[0], { ...firstRevertObservation, provenance: undefined }).stopReason, "history-revert-readback-observation-provenance-or-freshness-missing", "Preview revert readback rejects missing external provenance");
assert.equal(readBackHistoryRevert(firstPairReverted, expectedOperatorMappings[0], { ...firstRevertObservation, freshness: undefined }).stopReason, "history-revert-readback-observation-provenance-or-freshness-missing", "Preview revert readback rejects missing freshness");
assert.equal(readBackHistoryRevert(firstPairReverted, expectedOperatorMappings[0], { ...firstRevertObservation, targetKind: undefined }).stopReason, "history-revert-readback-observation-target-mismatch", "Preview revert readback rejects a missing Preview target");
assert.equal(readBackHistoryRevert(firstPairReverted, expectedOperatorMappings[0], { ...firstRevertObservation, fixtureLabel: "static-test-shaped-observation" }).stopReason, "history-revert-readback-not-live-static-observation-rejected", "Preview revert readback rejects a static test-shaped envelope label");
const missingModeRevertReadback = readBackHistoryRevert({ ...firstPairReverted, pairEvidenceMode: null }, expectedOperatorMappings[0], firstRevertObservation);
assert.equal(missingModeRevertReadback.stopReason, "preview-history-mutation-requires-external-pair-evidence", "missing pair evidence mode cannot accept a Preview revert readback transition");
assert.deepEqual(missingModeRevertReadback.operations, firstPairReverted.operations, "rejected revert readback performs no additional Preview history operation");
assert.equal(readBackHistoryRevert(firstPairReverted, expectedOperatorMappings[0], undefined).stopReason, "history-revert-readback-observation-envelope-missing", "missing external revert observation envelope stops");
const missingRevertResult = { ...firstRevertObservation };
delete missingRevertResult.result;
assert.equal(readBackHistoryRevert(firstPairReverted, expectedOperatorMappings[0], missingRevertResult).stopReason, "history-revert-readback-result-missing", "omitted history revert readback result stops fail-closed");
const firstPairRevertReadback = readBackHistoryRevert(firstPairReverted, expectedOperatorMappings[0], firstRevertObservation);
const missingModeApply = applyHistoryMigration({ ...firstPairRevertReadback, pairEvidenceMode: null }, expectedOperatorMappings[0], {
  result: "success",
  observedPairEvidence: independentExternalPairEvidenceRecords[0]
});
assert.equal(missingModeApply.stopReason, "preview-history-mutation-requires-external-pair-evidence", "missing pair evidence mode cannot apply a Preview history mutation");
assert.deepEqual(missingModeApply.operations, firstPairRevertReadback.operations, "missing pair evidence mode performs no additional Preview history operation");
const invalidModeApply = applyHistoryMigration({ ...firstPairRevertReadback, pairEvidenceMode: "invalid-external-mode" }, expectedOperatorMappings[0], {
  result: "success",
  observedPairEvidence: independentExternalPairEvidenceRecords[0]
});
assert.equal(invalidModeApply.stopReason, "preview-history-mutation-requires-external-pair-evidence", "invalid pair evidence mode cannot apply a Preview history mutation");
assert.deepEqual(invalidModeApply.operations, firstPairRevertReadback.operations, "invalid pair evidence mode performs no additional Preview history operation");
assert.equal(applyHistoryMigration(firstPairRevertReadback, expectedOperatorMappings[0], { result: "success" }).stopReason, "history-pair-evidence-missing", "history apply independently rejects missing external pair evidence");
const applyEvidenceWithoutFreshness = { ...independentExternalPairEvidenceRecords[0] };
delete applyEvidenceWithoutFreshness.freshnessMarker;
assertPairEvidenceFreshnessStopsWithoutMutation(
  "history apply missing pair-evidence freshness",
  firstPairRevertReadback,
  () => applyHistoryMigration(firstPairRevertReadback, expectedOperatorMappings[0], { result: "success", observedPairEvidence: applyEvidenceWithoutFreshness })
);
assertPairEvidenceFreshnessStopsWithoutMutation(
  "history apply mismatched pair-evidence freshness",
  firstPairRevertReadback,
  () => applyHistoryMigration(firstPairRevertReadback, expectedOperatorMappings[0], {
    result: "success",
    observedPairEvidence: { ...independentExternalPairEvidenceRecords[0], freshnessMarker: "stale-or-different-preview-preflight" }
  })
);
assert.equal(applyHistoryMigration(firstPairRevertReadback, expectedOperatorMappings[0], { observedPairEvidence: independentExternalPairEvidenceRecords[0] }).stopReason, "history-apply-result-missing", "history apply rejects an omitted external operation result");
const applyFailureAfterRevert = applyHistoryMigration(firstPairRevertReadback, expectedOperatorMappings[0], { result: "failure", observedPairEvidence: independentExternalPairEvidenceRecords[0] });
assert.equal(applyFailureAfterRevert.stopReason, "history-apply-failure-after-revert", "apply failure after a successful revert preserves a stopped partial history state");
assert.ok(!applyFailureAfterRevert.history.includes(expectedOperatorMappings[0][0]), "partial history state retains the successful remote revert");
assert.ok(!applyFailureAfterRevert.history.includes(expectedOperatorMappings[0][1]), "partial history state does not invent a canonical apply");
assert.strictEqual(applyHistoryMigration(applyFailureAfterRevert, expectedOperatorMappings[0]), applyFailureAfterRevert, "partial history state cannot automatically continue");
const applyUncertainAfterRevert = applyHistoryMigration(firstPairRevertReadback, expectedOperatorMappings[0], { result: "uncertain", observedPairEvidence: independentExternalPairEvidenceRecords[0] });
assert.equal(applyUncertainAfterRevert.stopReason, "history-apply-uncertain-after-revert", "uncertain apply after a successful revert preserves a stopped partial history state");
assert.strictEqual(readBackHistoryApply(applyUncertainAfterRevert, expectedOperatorMappings[0]), applyUncertainAfterRevert, "uncertain history apply cannot automatically continue to readback");
assertUnknownResultStopsWithoutMutation(
  "history apply",
  firstPairRevertReadback,
  () => applyHistoryMigration(firstPairRevertReadback, expectedOperatorMappings[0], { result: "unexpected", observedPairEvidence: independentExternalPairEvidenceRecords[0] }),
  "history-apply-unverified"
);

const revertReadbackFailure = readBackHistoryRevert(firstPairReverted, expectedOperatorMappings[0], { ...firstRevertObservation, result: "failure" });
assert.equal(revertReadbackFailure.stopReason, "history-revert-readback-failure", "revert readback failure stops");
assert.strictEqual(applyHistoryMigration(revertReadbackFailure, expectedOperatorMappings[0]), revertReadbackFailure, "revert readback failure cannot automatically continue");
const revertReadbackUncertain = readBackHistoryRevert(firstPairReverted, expectedOperatorMappings[0], { ...firstRevertObservation, result: "uncertain" });
assert.equal(revertReadbackUncertain.stopReason, "history-revert-readback-uncertain", "uncertain revert readback stops");
const firstPairApplied = applyHistoryMigration(firstPairRevertReadback, expectedOperatorMappings[0], { result: "success", observedPairEvidence: independentExternalPairEvidenceRecords[0] });
const firstApplyObservation = observeIndependentExternalPreviewHistory(firstPairApplied, "history-apply-readback", expectedOperatorMappings[0][1]);
assert.equal(readBackHistoryApply(firstPairApplied, expectedOperatorMappings[0], independentlyObservedPreviewHistoryReadbacks[0].apply).stopReason, "history-apply-readback-observation-envelope-missing", "bare Preview apply readback arrays are rejected fail-closed");
const invalidModeApplyReadback = readBackHistoryApply({ ...firstPairApplied, pairEvidenceMode: "invalid-external-mode" }, expectedOperatorMappings[0], firstApplyObservation);
assert.equal(invalidModeApplyReadback.stopReason, "preview-history-mutation-requires-external-pair-evidence", "invalid pair evidence mode cannot accept a Preview apply readback transition");
assert.deepEqual(invalidModeApplyReadback.operations, firstPairApplied.operations, "rejected apply readback performs no additional Preview history operation");
const missingApplyResult = { ...firstApplyObservation };
delete missingApplyResult.result;
assert.equal(readBackHistoryApply(firstPairApplied, expectedOperatorMappings[0], missingApplyResult).stopReason, "history-apply-readback-result-missing", "omitted history apply readback result stops fail-closed");
const applyReadbackFailure = readBackHistoryApply(firstPairApplied, expectedOperatorMappings[0], { ...firstApplyObservation, result: "failure" });
assert.equal(applyReadbackFailure.stopReason, "history-apply-readback-failure", "apply readback failure stops");
assert.strictEqual(revertHistoryMigration(applyReadbackFailure, expectedOperatorMappings[1]), applyReadbackFailure, "apply readback failure cannot automatically continue");
const applyReadbackUncertain = readBackHistoryApply(firstPairApplied, expectedOperatorMappings[0], { ...firstApplyObservation, result: "uncertain" });
assert.equal(applyReadbackUncertain.stopReason, "history-apply-readback-uncertain", "uncertain apply readback stops");

const firstRepair = readBackHistoryApply(firstPairApplied, expectedOperatorMappings[0], firstApplyObservation);
const rerunRepair = revertHistoryMigration(firstRepair, expectedOperatorMappings[0], { result: "success", observedPairEvidence: independentExternalPairEvidenceRecords[0] });
assert.equal(rerunRepair.stopReason, "target-mutation-or-rerun", "rerunning an already-repaired target stops");
const mutatedSameVersion = { ...createOpaqueOperatorObservedPreviewFixture(), history: remoteMigrations.filter((name) => name !== migrationName) };
assert.equal(revertHistoryMigration(mutatedSameVersion, expectedOperatorMappings[0], { result: "success", observedPairEvidence: independentExternalPairEvidenceRecords[0] }).stopReason, "target-mutation-or-rerun", "same-version target mutation stops history repair");
const unknownRevertObservedHistory = [...independentlyObservedPreviewHistoryReadbacks[0].revert, "20990101000000_unknown"];
const unknownRevertReadback = readBackHistoryRevert(firstPairReverted, expectedOperatorMappings[0], issueMutatedPreviewHistoryObservation(firstPairReverted, firstRevertObservation, "history-revert-readback", expectedOperatorMappings[0][0], unknownRevertObservedHistory, firstPairReverted.history));
assert.equal(unknownRevertReadback.stopReason, "history-revert-readback-inventory-mismatch", "unknown externally observed revert readback entry stops");
assert.strictEqual(applyHistoryMigration(unknownRevertReadback, expectedOperatorMappings[0]), unknownRevertReadback, "unknown revert readback stop cannot continue");
assert.equal(readBackHistoryRevert(firstPairReverted, expectedOperatorMappings[0], issueMutatedPreviewHistoryObservation(firstPairReverted, firstRevertObservation, "history-revert-readback", expectedOperatorMappings[0][0], independentlyObservedPreviewHistoryReadbacks[0].revert.slice(1), firstPairReverted.history)).stopReason, "history-revert-readback-inventory-mismatch", "missing Preview revert readback entry stops");
assert.equal(readBackHistoryRevert(firstPairReverted, expectedOperatorMappings[0], issueMutatedPreviewHistoryObservation(firstPairReverted, firstRevertObservation, "history-revert-readback", expectedOperatorMappings[0][0], [...independentlyObservedPreviewHistoryReadbacks[0].revert, independentlyObservedPreviewHistoryReadbacks[0].revert[0]], firstPairReverted.history)).stopReason, "history-revert-readback-inventory-mismatch", "duplicate Preview revert readback entry stops");
assert.equal(readBackHistoryRevert(firstPairReverted, expectedOperatorMappings[0], issueMutatedPreviewHistoryObservation(firstPairReverted, firstRevertObservation, "history-revert-readback", expectedOperatorMappings[0][0], [...independentlyObservedPreviewHistoryReadbacks[0].revert].reverse(), firstPairReverted.history)).stopReason, "history-revert-readback-inventory-mismatch", "wrong-order Preview revert readback stops");
const duplicateApplyObservedHistory = [...independentlyObservedPreviewHistoryReadbacks[0].apply, expectedOperatorMappings[0][1]];
const duplicateApplyReadback = readBackHistoryApply(firstPairApplied, expectedOperatorMappings[0], issueMutatedPreviewHistoryObservation(firstPairApplied, firstApplyObservation, "history-apply-readback", expectedOperatorMappings[0][1], duplicateApplyObservedHistory, firstPairApplied.history));
assert.equal(duplicateApplyReadback.stopReason, "history-apply-readback-inventory-mismatch", "duplicate externally observed apply readback entry stops");
assert.strictEqual(revertHistoryMigration(duplicateApplyReadback, expectedOperatorMappings[1]), duplicateApplyReadback, "duplicate apply readback stop cannot continue");
assert.equal(readBackHistoryApply(firstPairApplied, expectedOperatorMappings[0], issueMutatedPreviewHistoryObservation(firstPairApplied, firstApplyObservation, "history-apply-readback", expectedOperatorMappings[0][1], independentlyObservedPreviewHistoryReadbacks[0].apply.slice(1), firstPairApplied.history)).stopReason, "history-apply-readback-inventory-mismatch", "missing Preview apply readback entry stops");
assert.equal(readBackHistoryApply(firstPairApplied, expectedOperatorMappings[0], issueMutatedPreviewHistoryObservation(firstPairApplied, firstApplyObservation, "history-apply-readback", expectedOperatorMappings[0][1], [...independentlyObservedPreviewHistoryReadbacks[0].apply, "20990101000000_unknown"], firstPairApplied.history)).stopReason, "history-apply-readback-inventory-mismatch", "extra Preview apply readback entry stops");
assert.equal(readBackHistoryApply(firstPairApplied, expectedOperatorMappings[0], issueMutatedPreviewHistoryObservation(firstPairApplied, firstApplyObservation, "history-apply-readback", expectedOperatorMappings[0][1], [...independentlyObservedPreviewHistoryReadbacks[0].apply].reverse(), firstPairApplied.history)).stopReason, "history-apply-readback-inventory-mismatch", "wrong-order Preview apply readback stops");
assert.equal(readBackHistoryRevert(firstPairReverted, expectedOperatorMappings[1]).stopReason, "wrong-or-missing-history-revert-readback", "wrong pair readback stops");

const reversedAllowlist = prepareAdditiveAllowlist(previewFixture, additiveAllowlist, [...additiveAllowlist].reverse(), { result: "success" });
assert.equal(reversedAllowlist.stopReason, "wrong-order-or-allowlist", "wrong explicit allowlist order stops");
const unrelatedBaselinePending = localOnlyBaseline.find((name) => !name.includes("_comment_translator_paid_"));
const unexpectedPending = prepareAdditiveAllowlist(previewFixture, [...additiveAllowlist, unrelatedBaselinePending], additiveAllowlist, { result: "success" });
assert.equal(unexpectedPending.stopReason, "unexpected-pending-migration", "a non-Paid local-only baseline pending migration stops the additive phase");
assert.strictEqual(applyAdditiveMigration(unexpectedPending, additiveAllowlist[0]), unexpectedPending, "unexpected pending stop cannot automatically continue into additive execution");
assert.equal(prepareAdditiveAllowlist(previewFixture, additiveAllowlist, additiveAllowlist).stopReason, "additive-dry-run-result-missing", "omitted additive dry-run result stops fail-closed");

const additiveDryRunFailure = prepareAdditiveAllowlist(previewFixture, additiveAllowlist, additiveAllowlist, { result: "failure" });
assert.equal(additiveDryRunFailure.stopReason, "additive-dry-run-failure", "failed additive dry-run stops before allowlist readiness");
const additiveDryRunUncertain = prepareAdditiveAllowlist(previewFixture, additiveAllowlist, additiveAllowlist, { result: "uncertain" });
assert.equal(additiveDryRunUncertain.stopReason, "additive-dry-run-uncertain", "uncertain additive dry-run stops before allowlist readiness");
assertUnknownResultStopsWithoutMutation(
  "additive dry-run",
  previewFixture,
  () => prepareAdditiveAllowlist(previewFixture, additiveAllowlist, additiveAllowlist, { result: "unexpected" }),
  "additive-dry-run-unverified"
);
const additivePending = prepareAdditiveAllowlist(previewFixture, additiveAllowlist, additiveAllowlist, { result: "success" });
assert.equal(additivePending.phase, "only-two-allowlisted-additive-pending", "exact pending set reaches only-two-allowlisted-additive-pending");
assert.deepEqual(additivePending.preparedAllowlist, additiveAllowlist, "the explicit two-file allowlist retains the required order");
const missingModeAdditiveApply = applyAdditiveMigration({ ...additivePending, pairEvidenceMode: null }, additiveAllowlist[0], { result: "success" });
assert.equal(missingModeAdditiveApply.stopReason, "preview-history-mutation-requires-external-pair-evidence", "missing pair evidence mode cannot submit an additive Preview history mutation");
assert.deepEqual(missingModeAdditiveApply.sqlExecutions, additivePending.sqlExecutions, "rejected additive apply executes zero additional SQL");
const wrongAdditiveOrder = applyAdditiveMigration(additivePending, additiveAllowlist[1]);
assert.equal(wrongAdditiveOrder.stopReason, "wrong-additive-order", "wrong additive execution order stops");
assert.strictEqual(applyAdditiveMigration(wrongAdditiveOrder, additiveAllowlist[0]), wrongAdditiveOrder, "wrong additive order cannot automatically continue");

assert.equal(applyAdditiveMigration(additivePending, additiveAllowlist[0]).stopReason, "additive-apply-result-missing", "omitted additive apply result stops fail-closed");
assertUnknownResultStopsWithoutMutation(
  "additive apply",
  additivePending,
  () => applyAdditiveMigration(additivePending, additiveAllowlist[0], { result: "unexpected" }),
  "additive-apply-unverified"
);
const firstAdditive = applyAdditiveMigration(additivePending, additiveAllowlist[0], { result: "success" });
assert.equal(firstAdditive.phase, "awaiting-additive-readback", "the first additive SQL submission awaits explicit readback");
assert.equal(firstAdditive.additiveIndex, 0, "the first SQL submission does not advance additive completion before readback");
assert.ok(!firstAdditive.history.includes(additiveAllowlist[0]), "the first SQL submission does not mark history present before readback");
assert.equal(prepareAdditiveAllowlist(firstAdditive, additiveAllowlist.slice(1), additiveAllowlist).stopReason, "partial-or-repair-failure", "partial additive state cannot restart preparation");
assert.equal(applyAdditiveMigration(firstAdditive, additiveAllowlist[1]).stopReason, "partial-or-repair-failure", "the second additive SQL cannot run before the first readback succeeds");
const firstAdditiveObservedHistory = independentlyObservedAdditiveHistoryReadbacks[0];
assert.deepEqual(firstAdditiveObservedHistory, [...firstAdditiveObservedHistory].sort(), "the first additive external readback is version ordered");
assert.deepEqual(firstAdditiveObservedHistory, [...firstAdditive.history, additiveAllowlist[0]].sort(), "the first additive readback matches the sorted repaired inventory plus the submitted migration");
const firstAdditiveObservation = observeIndependentExternalPreviewHistory(firstAdditive, "additive-readback", additiveAllowlist[0]);
const invalidModeAdditiveReadback = readBackAdditiveMigration({ ...firstAdditive, pairEvidenceMode: "invalid-external-mode" }, additiveAllowlist[0], firstAdditiveObservation);
assert.equal(invalidModeAdditiveReadback.stopReason, "preview-history-mutation-requires-external-pair-evidence", "invalid pair evidence mode cannot accept an additive Preview history readback");
assert.deepEqual(invalidModeAdditiveReadback.history, firstAdditive.history, "rejected additive readback does not update Preview migration history");
assert.equal(readBackAdditiveMigration(firstAdditive, additiveAllowlist[0], firstAdditiveObservedHistory).stopReason, "additive-readback-observation-envelope-missing", "bare additive readback arrays stop fail-closed");
const missingAdditiveResult = { ...firstAdditiveObservation };
delete missingAdditiveResult.result;
assert.equal(readBackAdditiveMigration(firstAdditive, additiveAllowlist[0], missingAdditiveResult).stopReason, "additive-readback-result-missing", "omitted additive readback result stops fail-closed");
const firstReadback = readBackAdditiveMigration(firstAdditive, additiveAllowlist[0], firstAdditiveObservation);
assert.equal(firstReadback.phase, "additive-applying", "successful first readback enables the next additive submission");
assert.equal(firstReadback.additiveIndex, 1, "successful first readback advances exactly one additive migration");
const secondAdditive = applyAdditiveMigration(firstReadback, additiveAllowlist[1], { result: "success" });
assert.equal(secondAdditive.phase, "awaiting-additive-readback", "the second additive SQL submission also awaits explicit readback");
assert.equal(secondAdditive.additiveIndex, 1, "the second SQL submission does not mark additive completion before readback");
const secondAdditiveObservedHistory = independentlyObservedAdditiveHistoryReadbacks[1];
const secondAdditiveObservation = observeIndependentExternalPreviewHistory(secondAdditive, "additive-readback", additiveAllowlist[1]);
const additiveComplete = readBackAdditiveMigration(secondAdditive, additiveAllowlist[1], secondAdditiveObservation);
assert.equal(additiveComplete.phase, "additive-complete", "both successful readbacks are required to reach additive-complete");
assert.equal(completePostApplyReadOnlyChecks(additiveComplete).stopReason, "post-apply-read-only-check-observation-envelope-missing", "Preview completion requires an explicit post-apply read-only-check observation envelope");
assert.deepEqual(additiveComplete.sqlExecutions, additiveAllowlist, "additive completion executes exactly the two allowlisted migrations in order");
assert.equal(assertUntouchedSameVersion(additiveComplete), true, "additive completion leaves the same-version source untouched");
assert.equal(applyAdditiveMigration(additiveComplete, additiveAllowlist[1]).stopReason, "partial-or-repair-failure", "an additive rerun after completion stops");
const independentExternalPreviewPostApplyEnvelope = Object.freeze({
  result: "success",
  targetKind: "preview",
  provenance: Object.freeze({ kind: "external-read-only-observation", liveObservation: true }),
  freshness: Object.freeze({ status: "fresh", marker: "fresh-for-current-preview-post-apply-read-only-check:post-apply" }),
  observedHistory: Object.freeze("20260615000000_comment_translator_sessions|20260615001000_comment_translator_usage_ledger_events|20260623000000_comment_translator_real_comments_feed_snapshots|20260812120000_comment_translator_paid_core_v1|20260813130000_comment_translator_paid_task6_circuit_probe_claim|20260813131500_comment_translator_paid_task6_openai_rate_retry|20260813133000_comment_translator_paid_task6_owned_circuit_failure|20260813134500_comment_translator_paid_task6_azure_billing_split|20260813135500_comment_translator_paid_task6_azure_uncertain_retry_compatibility|20260813140000_comment_translator_paid_task6_azure_uncertain_retry|20260813141500_comment_translator_paid_task6_circuit_success_window|20260813143000_comment_translator_paid_task6_openai_resume_status|20260813144500_comment_translator_paid_task6_terminal_openai_partial|20260813150000_comment_translator_paid_task6_openai_partial_receipt|20260813151500_comment_translator_paid_task6_terminal_openai_partial_authority|20260813153000_comment_translator_paid_task6_replay_circuit_authority|20260813154500_comment_translator_paid_task6_dispatch_and_azure_partial_settlement|20260814100000_comment_translator_paid_task7_runtime_authority|20260814110000_comment_translator_paid_task9_retention_observability|20260815090000_comment_translator_paid_cron_vault_transport|20260818100000_comment_translator_paid_gate0a_poll_budget_rpc_repair|20260819100000_comment_translator_paid_gate0a_lifecycle_read_repair|20260819110000_comment_translator_paid_gate0a_capacity_read_repair|20260823120000_comment_translator_paid_gate0a_unbound_hold_recovery|20260823130000_comment_translator_paid_gate0a_schedule_function_privilege_repair|20260826100000_comment_translator_paid_gate0a_checkout_recovery_window_floor|20260826110000_comment_translator_paid_gate0a_recovery_floor_second_canonicalization|20260827020609_comment_translator_paid_checkout_expiry_finalize_lease|20260829100000_comment_translator_paid_task6_azure_uncertain_retry_guard_repair".split("|")),
  checks: Object.freeze([
    Object.freeze({ name: "canonical-source-observation", result: "verified", observations: Object.freeze({ statementCount: 7, statementSequenceSha256: canonicalStatementSequenceSha256, bodySemanticMd5: "ee28c4f97fb47ab70e0ae48248e56693", functionDefinitionMd5: "3c83f5957755dd833bd077c83163e1ea", migrationSourceSha256: canonicalMigrationSourceSha256 }) }),
    Object.freeze({ name: "function-security-observation", result: "verified", observations: Object.freeze({ securityDefiner: true, searchPath: "pg_catalog,private,vault" }) }),
    Object.freeze({ name: "schema-acl-observation", result: "verified", observations: Object.freeze({ entries: Object.freeze([Object.freeze({ role: "owner/postgres", privileges: Object.freeze(["CREATE", "USAGE"]), grantOptions: Object.freeze([]) }), Object.freeze({ role: "public", privileges: Object.freeze([]), grantOptions: Object.freeze([]) }), Object.freeze({ role: "anon", privileges: Object.freeze([]), grantOptions: Object.freeze([]) }), Object.freeze({ role: "authenticated", privileges: Object.freeze([]), grantOptions: Object.freeze([]) }), Object.freeze({ role: "service_role", privileges: Object.freeze(["USAGE"]), grantOptions: Object.freeze([]) })]) }) }),
    Object.freeze({ name: "function-execute-acl-observation", result: "verified", observations: Object.freeze({ entries: Object.freeze([Object.freeze({ role: "owner/postgres", privileges: Object.freeze(["EXECUTE"]), grantOptions: Object.freeze([]) }), Object.freeze({ role: "public", privileges: Object.freeze([]), grantOptions: Object.freeze([]) }), Object.freeze({ role: "anon", privileges: Object.freeze([]), grantOptions: Object.freeze([]) }), Object.freeze({ role: "authenticated", privileges: Object.freeze([]), grantOptions: Object.freeze([]) }), Object.freeze({ role: "service_role", privileges: Object.freeze(["EXECUTE"]), grantOptions: Object.freeze([]) })]) }) }),
    Object.freeze({ name: "exact-function-comment-observation", result: "verified", observations: Object.freeze({ commentSha256: "05b650537aa63ea2704b840b5ebf7c39f0ffd3ec84380c6c052f1621c4a9c6b6" }) }),
    Object.freeze({ name: "owner-lease-boundary-observation", result: "verified", observations: Object.freeze({ functionOwner: "postgres", ownerIdentityRequired: true, leaseBoundary: "active-matching-reconcile-lease-required" }) }),
    Object.freeze({ name: "side-effect-observation", result: "verified", observations: Object.freeze({ schedulerJobCount: 1, schedulerActive: false, schedulerCreateOperations: 0, schedulerAlterOperations: 0, schedulerActivateOperations: 0, schedulerDeactivateOperations: 0, schedulerDeleteOperations: 0, vaultSecretsWritten: 0, urlsPersisted: 0, tokensPersisted: 0 }) }),
    Object.freeze({ name: "task6-azure-direct-fallback-observation", result: "verified", observations: Object.freeze({ appliedMigrations: Object.freeze([Object.freeze({ name: "20260813135500_comment_translator_paid_task6_azure_uncertain_retry_compatibility", count: 1 }), Object.freeze({ name: "20260829100000_comment_translator_paid_task6_azure_uncertain_retry_guard_repair", count: 1 })]), functionIdentity: "public.ct_paid_azure_direct_fallback(text,text,uuid,text,timestamptz,timestamptz,date,bigint,timestamptz)", semanticHashAlgorithm: "sha256:normalized-final-function-semantic-source-v1", semanticDefinitionSha256: "5a8b759532ebba939a8c2d5331d24782b9ece7647adcbb71b588cd7985c3ca5f", functionOwner: "postgres", securityDefiner: true, searchPath: "pg_catalog,public", aclEntries: Object.freeze([Object.freeze({ role: "owner/postgres", privileges: Object.freeze(["EXECUTE"]), grantOptions: Object.freeze([]) }), Object.freeze({ role: "public", privileges: Object.freeze([]), grantOptions: Object.freeze([]) }), Object.freeze({ role: "anon", privileges: Object.freeze([]), grantOptions: Object.freeze([]) }), Object.freeze({ role: "authenticated", privileges: Object.freeze([]), grantOptions: Object.freeze([]) }), Object.freeze({ role: "service_role", privileges: Object.freeze(["EXECUTE"]), grantOptions: Object.freeze([]) })]), semanticMarkers: Object.freeze({ hardenedUncertainRetryGuardCount: 1, legacyFirstGuardCount: 0, legacyUncertainGuardCount: 0, compatibilityMarkerCount: 1, providerIdempotencyMarkers: Object.freeze(["p_attempt_id", "p_provider_attempt", "provider_attempt <> v_shared_attempt.provider_attempt"]), providerBoundaryMarkers: Object.freeze(["provider_kind = openai_attempt", "attempt_state in committed,released", "provider_failure_class in invalid-response,rate-limit", "slot_state = released", "reservation_state = completed-or-released"]), authorityMarkers: Object.freeze(["owner_user_id", "session_reference_id", "period_start", "period_end", "utc_month", "reserved_cost_micros", "committed_cost_micros"]) }) }) })
  ])
});
const unreceiptedStaticPreviewPostApplyState = additiveComplete;
assert.throws(
  () => injectExternalPreviewReadOnlyObservation(
    (issuer) => issuer.issue(independentExternalPreviewPostApplyEnvelope, Object.freeze({})),
    { state: unreceiptedStaticPreviewPostApplyState, observationKind: "post-apply-read-only-check", subject: "post-apply", expectedHistory: unreceiptedStaticPreviewPostApplyState.history }
  ),
  /trusted read-only observation adapter source receipt/,
  "a static full Preview post-apply envelope cannot be promoted without a valid adapter source receipt"
);
assert.deepEqual(unreceiptedStaticPreviewPostApplyState.history, additiveComplete.history, "unreceipted static Preview post-apply issuance preserves history");
assert.deepEqual(unreceiptedStaticPreviewPostApplyState.operations, additiveComplete.operations, "unreceipted static Preview post-apply issuance performs zero operations");
assert.deepEqual(unreceiptedStaticPreviewPostApplyState.sqlExecutions, additiveComplete.sqlExecutions, "unreceipted static Preview post-apply issuance executes zero SQL");
const previewPostApplyObservation = injectExternalPreviewReadOnlyObservation(
  (request) => {
    const source = createInternalStateMachineReadOnlyObservationSourceFixture(() => independentExternalPreviewPostApplyEnvelope);
    return issueInternalStateMachineObservation(request, source);
  },
  { state: additiveComplete, observationKind: "post-apply-read-only-check", subject: "post-apply", expectedHistory: additiveComplete.history }
);
assert.notStrictEqual(previewPostApplyObservation, independentExternalPreviewPostApplyEnvelope, "Preview post-apply adapter issues a fresh observation-bound envelope");
assert.equal(previewPostApplyObservation.checks[0].observations.migrationSourceSha256, "df6fea22e6be4be7563b272088b26813f99394fcb7ddcbd76125e69663b1b9ca", "Preview canonical-source observation includes the exact sanitized seven-statement migration SHA-256");
assert.equal(previewPostApplyObservation.checks[0].observations.statementSequenceSha256, "384b65c018721e1b281a33191be2f10cdc3a68f13a277ac78ebfff69f82b173a", "Preview canonical-source observation includes the fixed normalized seven-statement sequence SHA-256");
assert.ok(previewPostApplyObservation.checks.some((check) => check.name === "task6-azure-direct-fallback-observation"), "Preview post-apply evidence includes the final Task 6 Azure fallback observation");
assert.deepEqual(previewPostApplyObservation.observedHistory, additiveComplete.history, "independent external Preview post-apply history matches state history exactly");
const selfGeneratedPreviewPostApplyObservation = {
  result: "success",
  targetKind: additiveComplete.targetKind,
  observedHistory: [...additiveComplete.history],
  checks: previewPostApplyObservation.checks.map((check) => ({ ...check, observations: { ...check.observations } }))
};
assert.equal(completePostApplyReadOnlyChecks(additiveComplete, selfGeneratedPreviewPostApplyObservation).stopReason, "post-apply-read-only-check-observation-provenance-or-freshness-missing", "state-shaped self-generated Preview post-apply data is rejected");
assert.deepEqual(completePostApplyReadOnlyChecks(additiveComplete, selfGeneratedPreviewPostApplyObservation).history, additiveComplete.history, "self-generated Preview post-apply rejection does not change history");
assert.deepEqual(completePostApplyReadOnlyChecks(additiveComplete, selfGeneratedPreviewPostApplyObservation).operations, additiveComplete.operations, "self-generated Preview post-apply rejection performs zero additional operations");
assert.deepEqual(completePostApplyReadOnlyChecks(additiveComplete, selfGeneratedPreviewPostApplyObservation).sqlExecutions, additiveComplete.sqlExecutions, "self-generated Preview post-apply rejection executes zero additional SQL");
assert.equal(completePostApplyReadOnlyChecks(additiveComplete, { ...previewPostApplyObservation, fixtureLabel: "not-live-static-post-check" }).stopReason, "post-apply-read-only-check-not-live-static-observation-rejected", "static Preview post-apply envelopes are rejected");
const missingPostApplyCapability = { ...previewPostApplyObservation };
delete missingPostApplyCapability[operatorExternalObservationCapability];
assert.equal(completePostApplyReadOnlyChecks(additiveComplete, missingPostApplyCapability).stopReason, "post-apply-read-only-check-observation-capability-missing", "Preview post-apply checks reject a missing opaque capability");
assert.equal(completePostApplyReadOnlyChecks(additiveComplete, { ...previewPostApplyObservation }).stopReason, "post-apply-read-only-check-observation-capability-missing", "Preview rejects a relabeled copy even when provenance and freshness strings are unchanged");
assert.equal(completePostApplyReadOnlyChecks(additiveComplete, { ...previewPostApplyObservation, result: "failure" }).stopReason, "post-apply-read-only-check-failure", "failed Preview post-apply checks stop");
assert.equal(completePostApplyReadOnlyChecks(additiveComplete, { ...previewPostApplyObservation, result: "uncertain" }).stopReason, "post-apply-read-only-check-uncertain", "uncertain Preview post-apply checks stop");
const concretePostApplyMutationCases = [
  [0, "statementCount", 6],
  [0, "statementSequenceSha256", "0".repeat(64)],
  [0, "bodySemanticMd5", "00000000000000000000000000000000"],
  [0, "functionDefinitionMd5", "00000000000000000000000000000000"],
  [0, "migrationSourceSha256", "0".repeat(64)],
  [1, "securityDefiner", false],
  [1, "searchPath", "pg_catalog,private"],
  [2, ["entries", 0, "privileges"], ["USAGE"]],
  [2, ["entries", 1, "privileges"], ["USAGE"]],
  [2, ["entries", 4, "grantOptions"], ["USAGE"]],
  [3, ["entries", 0, "privileges"], []],
  [3, ["entries", 1, "privileges"], ["EXECUTE"]],
  [3, ["entries", 4, "grantOptions"], ["EXECUTE"]],
  [4, "commentSha256", "0000000000000000000000000000000000000000000000000000000000000000"],
  [5, "functionOwner", "unexpected_owner"],
  [5, "ownerIdentityRequired", false],
  [5, "leaseBoundary", "none"],
  [6, "schedulerJobCount", 0],
  [6, "schedulerActive", true],
  [6, "schedulerCreateOperations", 1],
  [6, "schedulerAlterOperations", 1],
  [6, "schedulerActivateOperations", 1],
  [6, "schedulerDeactivateOperations", 1],
  [6, "schedulerDeleteOperations", 1],
  [6, "vaultSecretsWritten", 1],
  [6, "urlsPersisted", 1],
  [6, "tokensPersisted", 1]
];
function mutatePostApplyConcreteValue(envelope, checkIndex, keyOrPath, replacement, omit) {
  const mutated = structuredClone(envelope);
  const pathParts = Array.isArray(keyOrPath) ? keyOrPath : [keyOrPath];
  const key = pathParts.at(-1);
  const parent = pathParts.slice(0, -1).reduce((value, part) => value[part], mutated.checks[checkIndex].observations);
  if (omit) delete parent[key];
  else parent[key] = replacement;
  return mutated;
}
function issuePostApplyObservation(state, envelope, patch = {}) {
  const providerEnvelope = { ...structuredClone(envelope), ...patch };
  return state.targetKind === "preview"
    ? injectExternalPreviewReadOnlyObservation((request) => {
      const source = createInternalStateMachineReadOnlyObservationSourceFixture(() => providerEnvelope);
      return issueInternalStateMachineObservation(request, source);
    }, { state, observationKind: "post-apply-read-only-check", subject: "post-apply", expectedHistory: state.history })
    : injectExternalCleanInstallReadOnlyObservation((request) => {
      const source = createInternalStateMachineReadOnlyObservationSourceFixture(() => providerEnvelope);
      return issueInternalStateMachineObservation(request, source);
    }, { state, observationKind: "post-apply-read-only-check", subject: "post-apply", expectedHistory: state.history });
}
const previewTask6PostApplyCheckIndex = previewPostApplyObservation.checks.findIndex((check) => check.name === "task6-azure-direct-fallback-observation");
assert.ok(previewTask6PostApplyCheckIndex >= 0, "Preview Task 6 post-apply check is addressable for focused regressions");
for (const [label, envelope] of [
  ["missing Task 6 observation", { ...structuredClone(previewPostApplyObservation), checks: previewPostApplyObservation.checks.filter((check) => check.name !== "task6-azure-direct-fallback-observation") }],
  ["mutated Task 6 semantic hash", mutatePostApplyConcreteValue(previewPostApplyObservation, previewTask6PostApplyCheckIndex, "semanticDefinitionSha256", "0".repeat(64), false)],
  ["duplicated first Task 6 migration", mutatePostApplyConcreteValue(previewPostApplyObservation, previewTask6PostApplyCheckIndex, ["appliedMigrations", 0, "count"], 2, false)],
  ["missing Task 6 provider boundary marker", mutatePostApplyConcreteValue(previewPostApplyObservation, previewTask6PostApplyCheckIndex, ["semanticMarkers", "providerBoundaryMarkers"], undefined, true)]
]) {
  const rejected = completePostApplyReadOnlyChecks(additiveComplete, issuePostApplyObservation(additiveComplete, envelope));
  assert.equal(rejected.stopReason, "post-apply-read-only-check-set-mismatch", `Preview rejects ${label}`);
  assert.deepEqual(rejected.history, additiveComplete.history, `Preview ${label} preserves history`);
  assert.deepEqual(rejected.operations, additiveComplete.operations, `Preview ${label} performs zero additional operations`);
  assert.deepEqual(rejected.sqlExecutions, additiveComplete.sqlExecutions, `Preview ${label} executes zero additional SQL`);
}
assert.equal(completePostApplyReadOnlyChecks(additiveComplete, issuePostApplyObservation(additiveComplete, previewPostApplyObservation, { checks: previewPostApplyObservation.checks.slice(0, -1) })).stopReason, "post-apply-read-only-check-set-mismatch", "incomplete Preview post-apply check set stops");
assert.equal(completePostApplyReadOnlyChecks(additiveComplete, issuePostApplyObservation(additiveComplete, previewPostApplyObservation, { checks: [...previewPostApplyObservation.checks, previewPostApplyObservation.checks[0]] })).stopReason, "post-apply-read-only-check-set-mismatch", "duplicate Preview post-apply check set stops");
assert.equal(completePostApplyReadOnlyChecks(additiveComplete, issuePostApplyObservation(additiveComplete, previewPostApplyObservation, { checks: previewPostApplyObservation.checks.map((check, index) => index === 0 ? { ...check, name: "changed-check-definition" } : check) })).stopReason, "post-apply-read-only-check-set-mismatch", "changed Preview post-apply check definition rejects the independent external envelope");
for (const [checkIndex, keyOrPath, replacement] of concretePostApplyMutationCases) {
  for (const omit of [false, true]) {
    const key = Array.isArray(keyOrPath) ? keyOrPath.join(".") : keyOrPath;
    const rejected = completePostApplyReadOnlyChecks(additiveComplete, issuePostApplyObservation(additiveComplete, mutatePostApplyConcreteValue(previewPostApplyObservation, checkIndex, keyOrPath, replacement, omit)));
    assert.equal(rejected.stopReason, "post-apply-read-only-check-set-mismatch", `Preview rejects ${omit ? "missing" : "mutated"} concrete post-apply value ${key}`);
    assert.deepEqual(rejected.history, additiveComplete.history, `Preview ${key} rejection does not change history`);
    assert.deepEqual(rejected.operations, additiveComplete.operations, `Preview ${key} rejection performs zero additional operations`);
    assert.deepEqual(rejected.sqlExecutions, additiveComplete.sqlExecutions, `Preview ${key} rejection executes zero additional SQL`);
  }
}
for (const [label, checkIndex, entries] of [
  ["extra schema ACL role", 2, [...previewPostApplyObservation.checks[2].observations.entries, { role: "unexpected_role", privileges: [], grantOptions: [] }]],
  ["extra function ACL role", 3, [...previewPostApplyObservation.checks[3].observations.entries, { role: "unexpected_role", privileges: [], grantOptions: [] }]],
  ["schema ACL grant option", 2, previewPostApplyObservation.checks[2].observations.entries.map((entry) => entry.role === "service_role" ? { ...entry, grantOptions: ["USAGE"] } : entry)],
  ["function ACL grant option", 3, previewPostApplyObservation.checks[3].observations.entries.map((entry) => entry.role === "service_role" ? { ...entry, grantOptions: ["EXECUTE"] } : entry)]
]) {
  const envelope = mutatePostApplyConcreteValue(previewPostApplyObservation, checkIndex, "entries", entries, false);
  assert.equal(completePostApplyReadOnlyChecks(additiveComplete, issuePostApplyObservation(additiveComplete, envelope)).stopReason, "post-apply-read-only-check-set-mismatch", `Preview rejects ${label}`);
}
assert.equal(completePostApplyReadOnlyChecks(additiveComplete, issuePostApplyObservation(additiveComplete, previewPostApplyObservation, { observedHistory: previewPostApplyObservation.observedHistory.slice(0, -1) })).stopReason, "post-apply-read-only-check-history-mismatch", "mismatched Preview post-apply history stops");
assert.equal(completePostApplyReadOnlyChecks({ ...additiveComplete, history: additiveComplete.history.slice(0, -1) }, previewPostApplyObservation).stopReason, "post-apply-read-only-check-observation-capability-missing", "changed Preview state history rejects the stale independent external post-apply capability");
const previewFinal = completePostApplyReadOnlyChecks(additiveComplete, previewPostApplyObservation);
assert.equal(previewFinal.phase, "post-apply-read-only-check", "only exact Preview post-apply checks reach the final read-only-check state");
assert.deepEqual(previewFinal.history, additiveComplete.history, "Preview post-apply checks do not change history");
assert.deepEqual(previewFinal.operations, additiveComplete.operations, "Preview post-apply checks do not change history-operation counts");
assert.deepEqual(previewFinal.sqlExecutions, additiveComplete.sqlExecutions, "Preview post-apply checks do not change SQL-execution counts");

const applyFailure = applyAdditiveMigration(additivePending, additiveAllowlist[0], { result: "failure" });
assert.equal(applyFailure.stopReason, "additive-apply-failure", "a known additive apply failure stops");
assert.strictEqual(applyAdditiveMigration(applyFailure, additiveAllowlist[0]), applyFailure, "a known apply failure cannot automatically continue");
const applyUncertain = applyAdditiveMigration(additivePending, additiveAllowlist[0], { result: "uncertain" });
assert.equal(applyUncertain.stopReason, "additive-apply-uncertain", "an uncertain additive apply result stops");
assert.strictEqual(readBackAdditiveMigration(applyUncertain, additiveAllowlist[0], firstAdditiveObservedHistory), applyUncertain, "an uncertain apply result cannot automatically continue to readback");
const readbackFailure = readBackAdditiveMigration(firstAdditive, additiveAllowlist[0], { ...firstAdditiveObservation, result: "failure" });
assert.equal(readbackFailure.stopReason, "additive-readback-failure", "an additive readback failure stops");
assert.strictEqual(applyAdditiveMigration(readbackFailure, additiveAllowlist[1]), readbackFailure, "a readback failure cannot automatically continue to the next additive migration");
const readbackUncertain = readBackAdditiveMigration(firstAdditive, additiveAllowlist[0], { ...firstAdditiveObservation, result: "uncertain" });
assert.equal(readbackUncertain.stopReason, "additive-readback-uncertain", "an uncertain additive readback stops");
assert.strictEqual(applyAdditiveMigration(readbackUncertain, additiveAllowlist[1]), readbackUncertain, "an uncertain readback cannot automatically continue to the next additive migration");
assert.equal(readBackAdditiveMigration(firstAdditive, additiveAllowlist[0], undefined).stopReason, "additive-readback-observation-envelope-missing", "a missing external additive observation stops");
assert.equal(readBackAdditiveMigration(firstAdditive, additiveAllowlist[0], issueMutatedPreviewHistoryObservation(firstAdditive, firstAdditiveObservation, "additive-readback", additiveAllowlist[0], independentlyObservedAdditiveHistoryReadbacks[0].slice(0, -1), [...firstAdditive.history, additiveAllowlist[0]].sort())).stopReason, "additive-readback-inventory-mismatch", "an additive readback missing the submitted migration stops");
assert.equal(readBackAdditiveMigration(firstAdditive, additiveAllowlist[0], issueMutatedPreviewHistoryObservation(firstAdditive, firstAdditiveObservation, "additive-readback", additiveAllowlist[0], [...firstAdditiveObservedHistory, additiveAllowlist[0]], [...firstAdditive.history, additiveAllowlist[0]].sort())).stopReason, "additive-readback-inventory-mismatch", "a duplicate additive readback entry stops");
assert.equal(readBackAdditiveMigration(firstAdditive, additiveAllowlist[0], issueMutatedPreviewHistoryObservation(firstAdditive, firstAdditiveObservation, "additive-readback", additiveAllowlist[0], [...firstAdditiveObservedHistory, "20990101000000_unknown"], [...firstAdditive.history, additiveAllowlist[0]].sort())).stopReason, "additive-readback-inventory-mismatch", "an extra additive readback entry stops");
assert.equal(readBackAdditiveMigration(secondAdditive, additiveAllowlist[1], issueMutatedPreviewHistoryObservation(secondAdditive, secondAdditiveObservation, "additive-readback", additiveAllowlist[1], [...independentlyObservedAdditiveHistoryReadbacks[1]].reverse(), [...secondAdditive.history, additiveAllowlist[1]].sort())).stopReason, "additive-readback-inventory-mismatch", "a wrong-order additive readback stops");

const isolatedEmptyTarget = {
  targetKind: "isolated-empty",
  initialHistory: []
};
function observeIndependentExternalCleanInstall(state, observationKind, subject, observedHistory, result = "success", extra = {}, expectedHistory = observedHistory) {
  return injectExternalCleanInstallReadOnlyObservation(
    (request) => {
      const envelope = {
        result,
        targetKind: "isolated-empty",
        provenance: { kind: externalPairEvidenceSource, liveObservation: true },
        freshness: { status: "fresh", marker: cleanInstallObservationFreshnessMarker(observationKind, subject) },
        observedHistory: [...observedHistory],
        ...extra
      };
      const source = createInternalStateMachineReadOnlyObservationSourceFixture(() => envelope);
      return issueInternalStateMachineObservation(request, source);
    },
    { state, observationKind, subject, expectedHistory }
  );
}
assert.equal(completeCleanInstallPreflight(createCleanInstallFixture(isolatedEmptyTarget)).stopReason, "clean-install-preflight-observation-envelope-missing", "omitted clean-install preflight envelope stops fail-closed");
const failedCleanInstallPreflightState = createCleanInstallFixture(isolatedEmptyTarget);
assert.equal(completeCleanInstallPreflight(failedCleanInstallPreflightState, observeIndependentExternalCleanInstall(failedCleanInstallPreflightState, "preflight", "preflight", [], "failure")).stopReason, "clean-install-preflight-failure", "failed clean-install preflight stops fail-closed");
const uncertainCleanInstallPreflightState = createCleanInstallFixture(isolatedEmptyTarget);
assert.equal(completeCleanInstallPreflight(uncertainCleanInstallPreflightState, observeIndependentExternalCleanInstall(uncertainCleanInstallPreflightState, "preflight", "preflight", [], "uncertain")).stopReason, "clean-install-preflight-uncertain", "uncertain clean-install preflight stops fail-closed");
const unknownCleanInstallPreflightState = createCleanInstallFixture(isolatedEmptyTarget);
assertUnknownResultStopsWithoutMutation(
  "clean-install preflight",
  unknownCleanInstallPreflightState,
  () => completeCleanInstallPreflight(unknownCleanInstallPreflightState, observeIndependentExternalCleanInstall(unknownCleanInstallPreflightState, "preflight", "preflight", [], "unexpected")),
  "clean-install-preflight-unverified"
);
const cleanInstallInitialState = createCleanInstallFixture(isolatedEmptyTarget);
let cleanInstallFixture = completeCleanInstallPreflight(cleanInstallInitialState, observeIndependentExternalCleanInstall(cleanInstallInitialState, "preflight", "preflight", []));
assert.equal(cleanInstallFixture.phase, "clean-install-applying", "successful clean-install preflight enables the first canonical migration");
assert.equal(cleanInstallFixture.targetKind, "isolated-empty", "clean install is bound to the explicitly selected isolated-empty target");
assert.equal(cleanInstallFixture.historyRevalidated, true, "clean install requires a successful read-only empty-history revalidation before SQL");
assert.equal(cleanInstallFixture.operations.length, 0, "clean install performs no migration-history repair operations");
for (const [index, migration] of currentLocalMigrations.entries()) {
  const submitted = applyCleanInstallMigration(cleanInstallFixture, migration, { result: "success" });
  assert.equal(submitted.phase, "awaiting-clean-install-readback", `clean-install migration ${index + 1} waits for explicit readback`);
  assert.equal(submitted.migrationIndex, index, `clean-install migration ${index + 1} does not advance before readback`);
  assert.equal(submitted.history.length, index, `clean-install migration ${index + 1} is absent from history before readback`);
  assert.equal(submitted.sqlExecutions.length, index + 1, `clean-install migration ${index + 1} executes SQL exactly once`);
  const expectedHistory = independentlyObservedCleanInstallHistory.slice(0, index + 1);
  cleanInstallFixture = readBackCleanInstallMigration(submitted, migration, observeIndependentExternalCleanInstall(submitted, "migration-readback", migration, expectedHistory));
  assert.equal(cleanInstallFixture.history.filter((name) => name === migration).length, 1, `clean-install migration ${index + 1} readback proves one canonical history entry`);
}
assert.equal(cleanInstallFixture.phase, "clean-install-complete", "all 34 successful readbacks reach clean-install-complete");
assert.equal(completePostApplyReadOnlyChecks(cleanInstallFixture).stopReason, "post-apply-read-only-check-observation-envelope-missing", "clean-install completion requires an explicit post-apply read-only-check observation envelope");
assert.deepEqual(cleanInstallFixture.history, currentLocalMigrations, "clean install records all 34 canonical migrations in chronological order only after readback");
assert.deepEqual(cleanInstallFixture.sqlExecutions, currentLocalMigrations, "clean install executes all 34 canonical migrations exactly once in chronological order");
assert.equal(cleanInstallFixture.history.length, 34, "clean install has exactly 34 history entries after all readbacks");
assert.equal(cleanInstallFixture.sqlExecutions.length, 34, "clean install has exactly 34 SQL executions after all readbacks");
assert.equal(cleanInstallFixture.operations.length, 0, "completed clean install still has zero history-repair operations");
const staticCleanInstallPostApplyObservation = {
  result: "success",
  targetKind: "isolated-empty",
  observedHistory: [...independentlyObservedCleanInstallHistory],
  checks: [
    { name: "canonical-source-observation", result: "verified", observations: { statementCount: 7, statementSequenceSha256: canonicalStatementSequenceSha256, bodySemanticMd5: "ee28c4f97fb47ab70e0ae48248e56693", functionDefinitionMd5: "3c83f5957755dd833bd077c83163e1ea", migrationSourceSha256: canonicalMigrationSourceSha256 } },
    { name: "function-security-observation", result: "verified", observations: { securityDefiner: true, searchPath: "pg_catalog,private,vault" } },
    { name: "schema-acl-observation", result: "verified", observations: { public: "revoked", anon: "revoked", authenticated: "revoked", serviceRole: "usage" } },
    { name: "function-execute-acl-observation", result: "verified", observations: { public: "revoked", anon: "revoked", authenticated: "revoked", serviceRole: "execute-only" } },
    { name: "exact-function-comment-observation", result: "verified", observations: { commentSha256: "05b650537aa63ea2704b840b5ebf7c39f0ffd3ec84380c6c052f1621c4a9c6b6" } },
    { name: "owner-lease-boundary-observation", result: "verified", observations: { functionOwner: "postgres", ownerIdentityRequired: true, leaseBoundary: "active-matching-reconcile-lease-required" } },
    { name: "side-effect-observation", result: "verified", observations: { schedulerJobsCreated: 0, vaultSecretsWritten: 0, urlsPersisted: 0, tokensPersisted: 0 } }
  ]
};
assert.equal(completePostApplyReadOnlyChecks(cleanInstallFixture, staticCleanInstallPostApplyObservation).stopReason, "post-apply-read-only-check-observation-provenance-or-freshness-missing", "clean-install rejects a static post-apply envelope without external/live provenance and freshness");
const externalShapedCleanInstallPostApplyObservation = {
  ...staticCleanInstallPostApplyObservation,
  provenance: { kind: externalPairEvidenceSource, liveObservation: true },
  freshness: { status: "fresh", marker: cleanInstallObservationFreshnessMarker("post-apply-read-only-check", "post-apply") }
};
assert.equal(completePostApplyReadOnlyChecks(cleanInstallFixture, issuePostApplyObservation(cleanInstallFixture, externalShapedCleanInstallPostApplyObservation)).stopReason, "post-apply-read-only-check-set-mismatch", "clean-install rejects ACL checks without normalized exact sets");
const independentExternalCleanInstallPostApplyEnvelope = Object.freeze({
  result: "success",
  targetKind: "isolated-empty",
  provenance: Object.freeze({ kind: externalPairEvidenceSource, liveObservation: true }),
  freshness: Object.freeze({ status: "fresh", marker: cleanInstallObservationFreshnessMarker("post-apply-read-only-check", "post-apply") }),
  observedHistory: Object.freeze([...independentlyObservedCleanInstallHistory]),
  checks: Object.freeze([
    Object.freeze({ name: "canonical-source-observation", result: "verified", observations: Object.freeze({ statementCount: 7, statementSequenceSha256: canonicalStatementSequenceSha256, bodySemanticMd5: "ee28c4f97fb47ab70e0ae48248e56693", functionDefinitionMd5: "3c83f5957755dd833bd077c83163e1ea", migrationSourceSha256: canonicalMigrationSourceSha256 }) }),
    Object.freeze({ name: "function-security-observation", result: "verified", observations: Object.freeze({ securityDefiner: true, searchPath: "pg_catalog,private,vault" }) }),
    Object.freeze({ name: "schema-acl-observation", result: "verified", observations: Object.freeze({ entries: Object.freeze([Object.freeze({ role: "owner/postgres", privileges: Object.freeze(["CREATE", "USAGE"]), grantOptions: Object.freeze([]) }), Object.freeze({ role: "public", privileges: Object.freeze([]), grantOptions: Object.freeze([]) }), Object.freeze({ role: "anon", privileges: Object.freeze([]), grantOptions: Object.freeze([]) }), Object.freeze({ role: "authenticated", privileges: Object.freeze([]), grantOptions: Object.freeze([]) }), Object.freeze({ role: "service_role", privileges: Object.freeze(["USAGE"]), grantOptions: Object.freeze([]) })]) }) }),
    Object.freeze({ name: "function-execute-acl-observation", result: "verified", observations: Object.freeze({ entries: Object.freeze([Object.freeze({ role: "owner/postgres", privileges: Object.freeze(["EXECUTE"]), grantOptions: Object.freeze([]) }), Object.freeze({ role: "public", privileges: Object.freeze([]), grantOptions: Object.freeze([]) }), Object.freeze({ role: "anon", privileges: Object.freeze([]), grantOptions: Object.freeze([]) }), Object.freeze({ role: "authenticated", privileges: Object.freeze([]), grantOptions: Object.freeze([]) }), Object.freeze({ role: "service_role", privileges: Object.freeze(["EXECUTE"]), grantOptions: Object.freeze([]) })]) }) }),
    Object.freeze({ name: "exact-function-comment-observation", result: "verified", observations: Object.freeze({ commentSha256: "05b650537aa63ea2704b840b5ebf7c39f0ffd3ec84380c6c052f1621c4a9c6b6" }) }),
    Object.freeze({ name: "owner-lease-boundary-observation", result: "verified", observations: Object.freeze({ functionOwner: "postgres", ownerIdentityRequired: true, leaseBoundary: "active-matching-reconcile-lease-required" }) }),
    Object.freeze({ name: "side-effect-observation", result: "verified", observations: Object.freeze({ schedulerJobCount: 0, schedulerActive: false, schedulerCreateOperations: 0, schedulerAlterOperations: 0, schedulerActivateOperations: 0, schedulerDeactivateOperations: 0, schedulerDeleteOperations: 0, vaultSecretsWritten: 0, urlsPersisted: 0, tokensPersisted: 0 }) }),
    Object.freeze({ name: "task6-azure-direct-fallback-observation", result: "verified", observations: Object.freeze({ appliedMigrations: Object.freeze([Object.freeze({ name: "20260813135500_comment_translator_paid_task6_azure_uncertain_retry_compatibility", count: 1 }), Object.freeze({ name: "20260829100000_comment_translator_paid_task6_azure_uncertain_retry_guard_repair", count: 1 })]), functionIdentity: "public.ct_paid_azure_direct_fallback(text,text,uuid,text,timestamptz,timestamptz,date,bigint,timestamptz)", semanticHashAlgorithm: "sha256:normalized-final-function-semantic-source-v1", semanticDefinitionSha256: "5a8b759532ebba939a8c2d5331d24782b9ece7647adcbb71b588cd7985c3ca5f", functionOwner: "postgres", securityDefiner: true, searchPath: "pg_catalog,public", aclEntries: Object.freeze([Object.freeze({ role: "owner/postgres", privileges: Object.freeze(["EXECUTE"]), grantOptions: Object.freeze([]) }), Object.freeze({ role: "public", privileges: Object.freeze([]), grantOptions: Object.freeze([]) }), Object.freeze({ role: "anon", privileges: Object.freeze([]), grantOptions: Object.freeze([]) }), Object.freeze({ role: "authenticated", privileges: Object.freeze([]), grantOptions: Object.freeze([]) }), Object.freeze({ role: "service_role", privileges: Object.freeze(["EXECUTE"]), grantOptions: Object.freeze([]) })]), semanticMarkers: Object.freeze({ hardenedUncertainRetryGuardCount: 1, legacyFirstGuardCount: 0, legacyUncertainGuardCount: 0, compatibilityMarkerCount: 1, providerIdempotencyMarkers: Object.freeze(["p_attempt_id", "p_provider_attempt", "provider_attempt <> v_shared_attempt.provider_attempt"]), providerBoundaryMarkers: Object.freeze(["provider_kind = openai_attempt", "attempt_state in committed,released", "provider_failure_class in invalid-response,rate-limit", "slot_state = released", "reservation_state = completed-or-released"]), authorityMarkers: Object.freeze(["owner_user_id", "session_reference_id", "period_start", "period_end", "utc_month", "reserved_cost_micros", "committed_cost_micros"]) }) }) })
  ])
});
const cleanInstallPostApplyObservation = injectExternalCleanInstallReadOnlyObservation(
  (request) => {
    const source = createInternalStateMachineReadOnlyObservationSourceFixture(() => independentExternalCleanInstallPostApplyEnvelope);
    return issueInternalStateMachineObservation(request, source);
  },
  { state: cleanInstallFixture, observationKind: "post-apply-read-only-check", subject: "post-apply", expectedHistory: cleanInstallFixture.history }
);
assert.notStrictEqual(cleanInstallPostApplyObservation, independentExternalCleanInstallPostApplyEnvelope, "clean-install post-apply adapter issues a fresh observation-bound envelope");
assert.equal(cleanInstallPostApplyObservation.checks[0].observations.migrationSourceSha256, "df6fea22e6be4be7563b272088b26813f99394fcb7ddcbd76125e69663b1b9ca", "clean-install canonical-source observation includes the exact sanitized seven-statement migration SHA-256");
assert.equal(cleanInstallPostApplyObservation.checks[0].observations.statementSequenceSha256, "384b65c018721e1b281a33191be2f10cdc3a68f13a277ac78ebfff69f82b173a", "clean-install canonical-source observation includes the fixed normalized seven-statement sequence SHA-256");
assert.ok(cleanInstallPostApplyObservation.checks.some((check) => check.name === "task6-azure-direct-fallback-observation"), "clean-install post-apply evidence includes the final Task 6 Azure fallback observation");
const cleanInstallTask6PostApplyCheckIndex = cleanInstallPostApplyObservation.checks.findIndex((check) => check.name === "task6-azure-direct-fallback-observation");
for (const [label, envelope] of [
  ["missing Task 6 observation", { ...structuredClone(cleanInstallPostApplyObservation), checks: cleanInstallPostApplyObservation.checks.filter((check) => check.name !== "task6-azure-direct-fallback-observation") }],
  ["mutated Task 6 semantic hash", mutatePostApplyConcreteValue(cleanInstallPostApplyObservation, cleanInstallTask6PostApplyCheckIndex, "semanticDefinitionSha256", "0".repeat(64), false)],
  ["missing second Task 6 migration", mutatePostApplyConcreteValue(cleanInstallPostApplyObservation, cleanInstallTask6PostApplyCheckIndex, "appliedMigrations", cleanInstallPostApplyObservation.checks[cleanInstallTask6PostApplyCheckIndex].observations.appliedMigrations.slice(0, 1), false)],
  ["mutated Task 6 provider idempotency marker", mutatePostApplyConcreteValue(cleanInstallPostApplyObservation, cleanInstallTask6PostApplyCheckIndex, ["semanticMarkers", "providerIdempotencyMarkers", 0], "p_untrusted_attempt_id", false)]
]) {
  const rejected = completePostApplyReadOnlyChecks(cleanInstallFixture, issuePostApplyObservation(cleanInstallFixture, envelope));
  assert.equal(rejected.stopReason, "post-apply-read-only-check-set-mismatch", `clean-install rejects ${label}`);
  assert.deepEqual(rejected.history, cleanInstallFixture.history, `clean-install ${label} preserves history`);
  assert.deepEqual(rejected.operations, cleanInstallFixture.operations, `clean-install ${label} performs zero additional operations`);
  assert.deepEqual(rejected.sqlExecutions, cleanInstallFixture.sqlExecutions, `clean-install ${label} executes zero additional SQL`);
}
for (const [label, envelope, expectedStopReason] of [
  ["missing provenance", { ...cleanInstallPostApplyObservation, provenance: undefined }, "post-apply-read-only-check-observation-provenance-or-freshness-missing"],
  ["stale freshness", { ...cleanInstallPostApplyObservation, freshness: { status: "stale", marker: cleanInstallObservationFreshnessMarker("post-apply-read-only-check", "post-apply") } }, "post-apply-read-only-check-observation-provenance-or-freshness-missing"],
  ["static label", { ...cleanInstallPostApplyObservation, fixtureLabel: "not-live-static-clean-install-post-check" }, "post-apply-read-only-check-not-live-static-observation-rejected"]
]) {
  assert.equal(completePostApplyReadOnlyChecks(cleanInstallFixture, envelope).stopReason, expectedStopReason, `clean-install rejects ${label} external metadata`);
}
const missingCleanInstallPostApplyCapability = { ...cleanInstallPostApplyObservation };
delete missingCleanInstallPostApplyCapability[operatorExternalObservationCapability];
assert.equal(completePostApplyReadOnlyChecks(cleanInstallFixture, missingCleanInstallPostApplyCapability).stopReason, "post-apply-read-only-check-observation-capability-missing", "clean-install rejects a missing target/state-bound opaque capability");
const cyclicCleanInstallPostApplyObservation = { ...cleanInstallPostApplyObservation };
cyclicCleanInstallPostApplyObservation.cycle = cyclicCleanInstallPostApplyObservation;
assert.equal(completePostApplyReadOnlyChecks(cleanInstallFixture, cyclicCleanInstallPostApplyObservation).stopReason, "post-apply-read-only-check-invalid-observation", "clean-install rejects cyclic external metadata");
assert.equal(completePostApplyReadOnlyChecks(cleanInstallFixture, { ...cleanInstallPostApplyObservation, result: "failure" }).stopReason, "post-apply-read-only-check-failure", "failed clean-install post-apply checks stop");
assert.equal(completePostApplyReadOnlyChecks(cleanInstallFixture, { ...cleanInstallPostApplyObservation, result: "uncertain" }).stopReason, "post-apply-read-only-check-uncertain", "uncertain clean-install post-apply checks stop");
assert.equal(completePostApplyReadOnlyChecks(cleanInstallFixture, issuePostApplyObservation(cleanInstallFixture, cleanInstallPostApplyObservation, { checks: cleanInstallPostApplyObservation.checks.slice(1) })).stopReason, "post-apply-read-only-check-set-mismatch", "incomplete clean-install post-apply check set stops");
const cleanInstallMutatedConcreteCheck = mutatePostApplyConcreteValue(cleanInstallPostApplyObservation, 2, ["entries", 0, "privileges"], ["USAGE"], false);
const cleanInstallMissingConcreteCheck = mutatePostApplyConcreteValue(cleanInstallPostApplyObservation, 4, "commentSha256", undefined, true);
const cleanInstallSchedulerMutation = mutatePostApplyConcreteValue(cleanInstallPostApplyObservation, 6, "schedulerAlterOperations", 1, false);
const cleanInstallMissingSourceSha = mutatePostApplyConcreteValue(cleanInstallPostApplyObservation, 0, "migrationSourceSha256", undefined, true);
const cleanInstallMutatedSourceSha = mutatePostApplyConcreteValue(cleanInstallPostApplyObservation, 0, "migrationSourceSha256", "0".repeat(64), false);
const cleanInstallMissingStatementSequenceSha = mutatePostApplyConcreteValue(cleanInstallPostApplyObservation, 0, "statementSequenceSha256", undefined, true);
const cleanInstallMutatedStatementSequenceSha = mutatePostApplyConcreteValue(cleanInstallPostApplyObservation, 0, "statementSequenceSha256", "0".repeat(64), false);
for (const [label, envelope] of [["mutated ACL owner", cleanInstallMutatedConcreteCheck], ["missing comment hash", cleanInstallMissingConcreteCheck], ["mutated scheduler alter count", cleanInstallSchedulerMutation], ["missing migration source hash", cleanInstallMissingSourceSha], ["mutated migration source hash", cleanInstallMutatedSourceSha], ["missing statement sequence hash", cleanInstallMissingStatementSequenceSha], ["mutated statement sequence hash", cleanInstallMutatedStatementSequenceSha]]) {
  const rejected = completePostApplyReadOnlyChecks(cleanInstallFixture, issuePostApplyObservation(cleanInstallFixture, envelope));
  assert.equal(rejected.stopReason, "post-apply-read-only-check-set-mismatch", `clean-install rejects ${label} concrete post-apply values`);
  assert.deepEqual(rejected.history, cleanInstallFixture.history, `clean-install ${label} concrete check rejection does not change history`);
  assert.deepEqual(rejected.operations, cleanInstallFixture.operations, `clean-install ${label} concrete check rejection performs zero additional operations`);
  assert.deepEqual(rejected.sqlExecutions, cleanInstallFixture.sqlExecutions, `clean-install ${label} concrete check rejection executes zero additional SQL`);
}
for (const [label, envelope] of [
  ["extra schema ACL role", mutatePostApplyConcreteValue(cleanInstallPostApplyObservation, 2, "entries", [...cleanInstallPostApplyObservation.checks[2].observations.entries, { role: "unexpected_role", privileges: [], grantOptions: [] }], false)],
  ["extra function ACL role", mutatePostApplyConcreteValue(cleanInstallPostApplyObservation, 3, "entries", [...cleanInstallPostApplyObservation.checks[3].observations.entries, { role: "unexpected_role", privileges: [], grantOptions: [] }], false)],
  ["schema ACL grant option", mutatePostApplyConcreteValue(cleanInstallPostApplyObservation, 2, ["entries", 4, "grantOptions"], ["USAGE"], false)],
  ["function ACL grant option", mutatePostApplyConcreteValue(cleanInstallPostApplyObservation, 3, ["entries", 4, "grantOptions"], ["EXECUTE"], false)],
  ...["schedulerJobCount", "schedulerCreateOperations", "schedulerAlterOperations", "schedulerActivateOperations", "schedulerDeactivateOperations", "schedulerDeleteOperations"].flatMap((field) => [
    [`mutated ${field}`, mutatePostApplyConcreteValue(cleanInstallPostApplyObservation, 6, field, 1, false)],
    [`missing ${field}`, mutatePostApplyConcreteValue(cleanInstallPostApplyObservation, 6, field, undefined, true)]
  ]),
  ["mutated schedulerActive", mutatePostApplyConcreteValue(cleanInstallPostApplyObservation, 6, "schedulerActive", true, false)],
  ["missing schedulerActive", mutatePostApplyConcreteValue(cleanInstallPostApplyObservation, 6, "schedulerActive", undefined, true)]
]) {
  const rejected = completePostApplyReadOnlyChecks(cleanInstallFixture, issuePostApplyObservation(cleanInstallFixture, envelope));
  assert.equal(rejected.stopReason, "post-apply-read-only-check-set-mismatch", `clean-install rejects ${label}`);
  assert.deepEqual(rejected.history, cleanInstallFixture.history, `clean-install ${label} rejection preserves history`);
  assert.deepEqual(rejected.operations, cleanInstallFixture.operations, `clean-install ${label} rejection performs zero additional operations`);
  assert.deepEqual(rejected.sqlExecutions, cleanInstallFixture.sqlExecutions, `clean-install ${label} rejection executes zero additional SQL`);
}
assert.equal(completePostApplyReadOnlyChecks(cleanInstallFixture, { ...cleanInstallPostApplyObservation, targetKind: "preview" }).stopReason, "post-apply-read-only-check-observation-target-mismatch", "mismatched clean-install post-apply target stops");
const cleanInstallFinal = completePostApplyReadOnlyChecks(cleanInstallFixture, cleanInstallPostApplyObservation);
assert.equal(cleanInstallFinal.phase, "post-apply-read-only-check", "only exact clean-install post-apply checks reach the final read-only-check state");
assert.deepEqual(cleanInstallFinal.history, cleanInstallFixture.history, "clean-install post-apply checks do not change history");
assert.deepEqual(cleanInstallFinal.operations, cleanInstallFixture.operations, "clean-install post-apply checks do not change history-operation counts");
assert.deepEqual(cleanInstallFinal.sqlExecutions, cleanInstallFixture.sqlExecutions, "clean-install post-apply checks do not change SQL-execution counts");

const bareCleanInstallPreflight = completeCleanInstallPreflight(createCleanInstallFixture(isolatedEmptyTarget), { result: "success" });
assert.equal(bareCleanInstallPreflight.stopReason, "clean-install-preflight-observation-target-mismatch", "bare clean-install preflight result is rejected before SQL or state mutation");
assert.equal(bareCleanInstallPreflight.sqlExecutions.length, 0, "bare clean-install preflight executes zero SQL");
assert.equal(bareCleanInstallPreflight.operations.length, 0, "bare clean-install preflight performs zero operations");
const cleanInstallPreflightNegativeState = createCleanInstallFixture(isolatedEmptyTarget);
const staticCleanInstallPreflightEnvelope = Object.freeze({
  result: "success",
  targetKind: "isolated-empty",
  provenance: Object.freeze({ kind: externalPairEvidenceSource, liveObservation: true }),
  freshness: Object.freeze({ status: "fresh", marker: cleanInstallObservationFreshnessMarker("preflight", "preflight") }),
  observedHistory: Object.freeze([])
});
let closedCleanInstallIssuer;
const passedThroughStaticCleanInstallPreflightEnvelope = injectExternalCleanInstallReadOnlyObservation(
  (issuer) => {
    closedCleanInstallIssuer = issuer;
    assert.equal("state" in issuer, false, "the clean-install provider receives no mutable state reference");
    assert.equal(typeof issuer.issue, "function", "the clean-install provider receives a private request-bound issuer");
    return staticCleanInstallPreflightEnvelope;
  },
  { state: cleanInstallPreflightNegativeState, observationKind: "preflight", subject: "preflight", expectedHistory: [] }
);
assert.strictEqual(passedThroughStaticCleanInstallPreflightEnvelope, staticCleanInstallPreflightEnvelope, "the clean-install adapter passes through a static full preflight envelope without issuing capability metadata");
const unreceiptedStaticCleanInstallState = createCleanInstallFixture(isolatedEmptyTarget);
assert.throws(
  () => injectExternalCleanInstallReadOnlyObservation(
    (issuer) => issuer.issue(staticCleanInstallPreflightEnvelope, Object.freeze({})),
    { state: unreceiptedStaticCleanInstallState, observationKind: "preflight", subject: "preflight", expectedHistory: [] }
  ),
  /trusted read-only observation adapter source receipt/,
  "a static full clean-install preflight envelope cannot be promoted without a valid adapter source receipt"
);
assert.deepEqual(unreceiptedStaticCleanInstallState.history, [], "unreceipted static clean-install issuance preserves history");
assert.deepEqual(unreceiptedStaticCleanInstallState.operations, [], "unreceipted static clean-install issuance performs zero operations");
assert.deepEqual(unreceiptedStaticCleanInstallState.sqlExecutions, [], "unreceipted static clean-install issuance executes zero SQL");
const issuedStaticCleanInstallState = createCleanInstallFixture(isolatedEmptyTarget);
assert.throws(
  () => injectExternalCleanInstallReadOnlyObservation(
    (issuer) => {
      const staticSource = createDeterministicReadOnlyObservationSourceFixture(() => staticCleanInstallPreflightEnvelope);
      return issueTrustedExternalObservation(issuer, staticSource);
    },
    { state: issuedStaticCleanInstallState, observationKind: "preflight", subject: "preflight", expectedHistory: [] }
  ),
  /opaque external adapter source lineage/,
  "a deterministic self-generated clean-install source is rejected before receipt issuance"
);
const cyclicStaticCleanInstallEnvelope = { ...staticCleanInstallPreflightEnvelope, fixtureLabel: "issued-but-static-self-generated-clean-install" };
cyclicStaticCleanInstallEnvelope.cycle = cyclicStaticCleanInstallEnvelope;
assert.throws(
  () => injectExternalCleanInstallReadOnlyObservation(
    (issuer) => {
      const cyclicStaticSource = createInternalStateMachineReadOnlyObservationSourceFixture(() => cyclicStaticCleanInstallEnvelope);
      return issueTrustedExternalObservation(issuer, cyclicStaticSource);
    },
    { state: createCleanInstallFixture(isolatedEmptyTarget), observationKind: "preflight", subject: "preflight", expectedHistory: [] }
  ),
  /opaque external adapter source lineage/,
  "sync clean-install issuance rejects cyclic issued-but-static self-generated input"
);
assert.throws(
  () => closedCleanInstallIssuer.issue(staticCleanInstallPreflightEnvelope),
  /closed external observation issuer/,
  "the clean-install request issuer is closed when its callback returns"
);
const asyncStaticCleanInstallState = createCleanInstallFixture(isolatedEmptyTarget);
const asyncStaticCleanInstallPreflightEnvelope = await injectExternalCleanInstallReadOnlyObservation(
  async () => {
    await Promise.resolve();
    return staticCleanInstallPreflightEnvelope;
  },
  { state: asyncStaticCleanInstallState, observationKind: "preflight", subject: "preflight", expectedHistory: [] }
);
assert.strictEqual(asyncStaticCleanInstallPreflightEnvelope, staticCleanInstallPreflightEnvelope, "the async adapter passes through a static envelope without replacing it");
assert.equal(asyncStaticCleanInstallPreflightEnvelope[operatorExternalObservationCapability], undefined, "the async adapter does not stamp capability metadata onto a static envelope");
await assert.rejects(
  injectExternalCleanInstallReadOnlyObservation(
    async (issuer) => {
      await Promise.resolve();
      const issuedButStaticSource = createInternalStateMachineReadOnlyObservationSourceFixture(() => cyclicStaticCleanInstallEnvelope);
      return issueTrustedExternalObservation(issuer, issuedButStaticSource);
    },
    { state: createCleanInstallFixture(isolatedEmptyTarget), observationKind: "preflight", subject: "preflight", expectedHistory: [] }
  ),
  /opaque external adapter source lineage/,
  "Promise clean-install issuance rejects cyclic issued-but-static self-generated input"
);
const asyncCleanInstallState = createCleanInstallFixture(isolatedEmptyTarget);
let resolvedAsyncCleanInstallIssuer;
let issuedInsideAsyncCleanInstallCallback;
const asyncCleanInstallPreflightEnvelope = await injectExternalCleanInstallReadOnlyObservation(
  async (issuer) => {
    resolvedAsyncCleanInstallIssuer = issuer;
    await Promise.resolve();
    const source = createInternalStateMachineReadOnlyObservationSourceFixture(() => staticCleanInstallPreflightEnvelope);
    issuedInsideAsyncCleanInstallCallback = issueInternalStateMachineObservation(issuer, source);
    return issuedInsideAsyncCleanInstallCallback;
  },
  { state: asyncCleanInstallState, observationKind: "preflight", subject: "preflight", expectedHistory: [] }
);
assert.strictEqual(asyncCleanInstallPreflightEnvelope, issuedInsideAsyncCleanInstallCallback, "the async adapter returns the provider-issued envelope without replacing capability metadata");
assert.ok(asyncCleanInstallPreflightEnvelope[operatorExternalObservationCapability], "an async provider can issue after awaiting and before callback resolution");
assert.equal(
  externalObservationCapabilityRegistry.get(asyncCleanInstallPreflightEnvelope[operatorExternalObservationCapability])?.authorityClass,
  "internal-state-machine-fixture-not-live",
  "an async local clean-install fixture is never classified as trusted external operator evidence"
);
assert.throws(
  () => resolvedAsyncCleanInstallIssuer.issue(staticCleanInstallPreflightEnvelope),
  /closed external observation issuer/,
  "the async request issuer rejects late issuance after callback resolution"
);
const asyncCleanInstallFirstUse = completeCleanInstallPreflight(asyncCleanInstallState, asyncCleanInstallPreflightEnvelope);
assert.equal(asyncCleanInstallFirstUse.phase, "clean-install-applying", "an async-issued envelope is accepted exactly once");
const asyncCleanInstallReplay = completeCleanInstallPreflight(asyncCleanInstallState, asyncCleanInstallPreflightEnvelope);
assert.equal(asyncCleanInstallReplay.stopReason, "clean-install-preflight-observation-capability-missing", "an async-issued envelope cannot be replayed");
const asyncObservationRejection = new Error("async external observation rejected");
const rejectedAsyncCleanInstallState = createCleanInstallFixture(isolatedEmptyTarget);
let rejectedAsyncCleanInstallIssuer;
let issuedBeforeAsyncObservationRejection;
await assert.rejects(
  injectExternalCleanInstallReadOnlyObservation(
    async (issuer) => {
      rejectedAsyncCleanInstallIssuer = issuer;
      await Promise.resolve();
      const source = createInternalStateMachineReadOnlyObservationSourceFixture(() => staticCleanInstallPreflightEnvelope);
      issuedBeforeAsyncObservationRejection = issueInternalStateMachineObservation(issuer, source);
      throw asyncObservationRejection;
    },
    { state: rejectedAsyncCleanInstallState, observationKind: "preflight", subject: "preflight", expectedHistory: [] }
  ),
  (error) => error === asyncObservationRejection,
  "the async adapter preserves provider rejection"
);
assert.throws(
  () => rejectedAsyncCleanInstallIssuer.issue(staticCleanInstallPreflightEnvelope),
  /closed external observation issuer/,
  "the async request issuer rejects late issuance after callback rejection"
);
assert.equal(
  completeCleanInstallPreflight(rejectedAsyncCleanInstallState, issuedBeforeAsyncObservationRejection).stopReason,
  "clean-install-preflight-observation-capability-missing",
  "an envelope issued before async callback rejection is never bound for use"
);
const rejectedStaticCleanInstallPreflight = completeCleanInstallPreflight(cleanInstallPreflightNegativeState, passedThroughStaticCleanInstallPreflightEnvelope);
assert.equal(rejectedStaticCleanInstallPreflight.stopReason, "clean-install-preflight-observation-capability-missing", "an unlabeled static clean-install preflight envelope cannot be upgraded by injection");
assert.deepEqual(rejectedStaticCleanInstallPreflight.history, cleanInstallPreflightNegativeState.history, "unlabeled static clean-install preflight rejection preserves history");
assert.deepEqual(rejectedStaticCleanInstallPreflight.operations, cleanInstallPreflightNegativeState.operations, "unlabeled static clean-install preflight rejection performs zero additional operations");
assert.deepEqual(rejectedStaticCleanInstallPreflight.sqlExecutions, cleanInstallPreflightNegativeState.sqlExecutions, "unlabeled static clean-install preflight rejection executes zero additional SQL");
const validCleanInstallPreflightEnvelope = observeIndependentExternalCleanInstall(cleanInstallPreflightNegativeState, "preflight", "preflight", []);
const missingCleanInstallPreflightCapability = { ...validCleanInstallPreflightEnvelope };
delete missingCleanInstallPreflightCapability[operatorExternalObservationCapability];
const cyclicCleanInstallPreflightMetadata = {};
cyclicCleanInstallPreflightMetadata.self = cyclicCleanInstallPreflightMetadata;
assert.throws(
  () => observeIndependentExternalCleanInstall(cleanInstallPreflightNegativeState, "preflight", "preflight", [], "success", { metadata: cyclicCleanInstallPreflightMetadata }),
  /rejects cyclic source or envelope input/,
  "clean-install preflight rejects cyclic input before fixture receipt issuance"
);
const cleanInstallPreflightNegativeCases = [
  ["copied capability", { ...validCleanInstallPreflightEnvelope }, "clean-install-preflight-observation-capability-missing"],
  ["missing capability", missingCleanInstallPreflightCapability, "clean-install-preflight-observation-capability-missing"],
  ["static fixture", observeIndependentExternalCleanInstall(cleanInstallPreflightNegativeState, "preflight", "preflight", [], "success", { fixtureLabel: "static-not-live-clean-install-preflight" }), "clean-install-preflight-not-live-static-observation-rejected"],
  ["stale freshness", observeIndependentExternalCleanInstall(cleanInstallPreflightNegativeState, "preflight", "preflight", [], "success", { freshness: { status: "stale", marker: cleanInstallObservationFreshnessMarker("preflight", "preflight") } }), "clean-install-preflight-observation-provenance-or-freshness-missing"],
  ["mismatched target", observeIndependentExternalCleanInstall(cleanInstallPreflightNegativeState, "preflight", "preflight", [], "success", { targetKind: "preview" }), "clean-install-preflight-observation-target-mismatch"],
  ["mismatched history", observeIndependentExternalCleanInstall(cleanInstallPreflightNegativeState, "preflight", "preflight", [currentLocalMigrations[0]], "success", {}, []), "clean-install-preflight-inventory-mismatch"]
];
for (const [label, envelope, expectedStopReason] of cleanInstallPreflightNegativeCases) {
  const rejected = completeCleanInstallPreflight(cleanInstallPreflightNegativeState, envelope);
  assert.equal(rejected.stopReason, expectedStopReason, `clean-install preflight rejects ${label}`);
  assert.deepEqual(rejected.history, cleanInstallPreflightNegativeState.history, `clean-install preflight ${label} rejection preserves history`);
  assert.deepEqual(rejected.operations, cleanInstallPreflightNegativeState.operations, `clean-install preflight ${label} rejection performs zero operations`);
  assert.deepEqual(rejected.sqlExecutions, cleanInstallPreflightNegativeState.sqlExecutions, `clean-install preflight ${label} rejection executes zero SQL`);
}
const differentCleanInstallSession = createCleanInstallFixture(isolatedEmptyTarget);
assert.equal(completeCleanInstallPreflight(differentCleanInstallSession, validCleanInstallPreflightEnvelope).stopReason, "clean-install-preflight-observation-capability-missing", "clean-install preflight capability cannot cross sessions");
const cleanInstallReadyState = createCleanInstallFixture(isolatedEmptyTarget);
const cleanInstallReady = completeCleanInstallPreflight(cleanInstallReadyState, observeIndependentExternalCleanInstall(cleanInstallReadyState, "preflight", "preflight", []));
const previewCleanInstallAttempt = completeCleanInstallPreflight(createCleanInstallFixture({ targetKind: "preview", initialHistory: [] }));
assert.equal(previewCleanInstallAttempt.stopReason, "clean-install-target-not-isolated-empty", "Preview target is rejected before clean-install SQL execution");
assert.equal(previewCleanInstallAttempt.sqlExecutions.length, 0, "rejected Preview target executes no clean-install SQL");
assert.strictEqual(applyCleanInstallMigration(previewCleanInstallAttempt, currentLocalMigrations[0]), previewCleanInstallAttempt, "rejected Preview target cannot continue automatically");
const nonEmptyCleanInstallAttempt = completeCleanInstallPreflight(createCleanInstallFixture({ targetKind: "isolated-empty", initialHistory: [currentLocalMigrations[0]] }));
assert.equal(nonEmptyCleanInstallAttempt.stopReason, "clean-install-target-not-empty", "non-empty clean-install target is rejected by read-only history revalidation");
assert.equal(nonEmptyCleanInstallAttempt.sqlExecutions.length, 0, "rejected non-empty target executes no clean-install SQL");
assert.strictEqual(applyCleanInstallMigration(nonEmptyCleanInstallAttempt, currentLocalMigrations[0]), nonEmptyCleanInstallAttempt, "rejected non-empty target cannot continue automatically");
const unknownCleanInstallTarget = completeCleanInstallPreflight(createCleanInstallFixture({ targetKind: "unknown", initialHistory: [] }));
assert.equal(unknownCleanInstallTarget.stopReason, "clean-install-target-not-isolated-empty", "unknown target is rejected before clean-install SQL execution");
assert.equal(unknownCleanInstallTarget.sqlExecutions.length, 0, "rejected unknown target executes no clean-install SQL");
assert.strictEqual(applyCleanInstallMigration(unknownCleanInstallTarget, currentLocalMigrations[0]), unknownCleanInstallTarget, "rejected unknown target cannot continue automatically");
const wrongCleanInstallOrder = applyCleanInstallMigration(cleanInstallReady, currentLocalMigrations[1], { result: "success" });
assert.equal(wrongCleanInstallOrder.stopReason, "wrong-clean-install-order", "wrong clean-install migration order stops");
assert.strictEqual(applyCleanInstallMigration(wrongCleanInstallOrder, currentLocalMigrations[0]), wrongCleanInstallOrder, "wrong clean-install order cannot automatically continue");
const unknownCleanInstallMigration = applyCleanInstallMigration(cleanInstallReady, "20990101000000_unknown_migration", { result: "success" });
assert.equal(unknownCleanInstallMigration.stopReason, "unknown-or-duplicate-clean-install-migration", "unknown clean-install migration stops before SQL execution");
assert.equal(applyCleanInstallMigration(cleanInstallReady, currentLocalMigrations[0]).stopReason, "clean-install-apply-result-missing", "omitted clean-install apply result stops fail-closed");
assertUnknownResultStopsWithoutMutation(
  "clean-install apply",
  cleanInstallReady,
  () => applyCleanInstallMigration(cleanInstallReady, currentLocalMigrations[0], { result: "unexpected" }),
  "clean-install-apply-unverified"
);
const firstCleanInstallSubmission = applyCleanInstallMigration(cleanInstallReady, currentLocalMigrations[0], { result: "success" });
const prematureSecondCleanInstallSubmission = applyCleanInstallMigration(firstCleanInstallSubmission, currentLocalMigrations[1]);
assert.equal(prematureSecondCleanInstallSubmission.stopReason, "partial-clean-install-state", "a second clean-install submission before readback stops");
const firstCleanInstallObservedHistory = independentlyObservedCleanInstallHistory.slice(0, 1);
assert.equal(readBackCleanInstallMigration(firstCleanInstallSubmission, currentLocalMigrations[0]).stopReason, "clean-install-readback-observation-envelope-missing", "omitted clean-install readback envelope stops fail-closed");
const validFirstCleanInstallReadbackEnvelope = observeIndependentExternalCleanInstall(firstCleanInstallSubmission, "migration-readback", currentLocalMigrations[0], firstCleanInstallObservedHistory);
const missingFirstCleanInstallReadbackCapability = { ...validFirstCleanInstallReadbackEnvelope };
delete missingFirstCleanInstallReadbackCapability[operatorExternalObservationCapability];
const cyclicCleanInstallReadbackMetadata = {};
cyclicCleanInstallReadbackMetadata.self = cyclicCleanInstallReadbackMetadata;
assert.throws(
  () => observeIndependentExternalCleanInstall(firstCleanInstallSubmission, "migration-readback", currentLocalMigrations[0], firstCleanInstallObservedHistory, "success", { metadata: cyclicCleanInstallReadbackMetadata }),
  /rejects cyclic source or envelope input/,
  "clean-install readback rejects cyclic input before fixture receipt issuance"
);
for (const [label, envelope, expectedStopReason] of [
  ["bare result", { result: "success" }, "clean-install-readback-observation-target-mismatch"],
  ["copied capability", { ...validFirstCleanInstallReadbackEnvelope }, "clean-install-readback-observation-capability-missing"],
  ["missing capability", missingFirstCleanInstallReadbackCapability, "clean-install-readback-observation-capability-missing"],
  ["static fixture", observeIndependentExternalCleanInstall(firstCleanInstallSubmission, "migration-readback", currentLocalMigrations[0], firstCleanInstallObservedHistory, "success", { fixtureLabel: "static-not-live-clean-install-readback" }), "clean-install-readback-not-live-static-observation-rejected"],
  ["stale freshness", observeIndependentExternalCleanInstall(firstCleanInstallSubmission, "migration-readback", currentLocalMigrations[0], firstCleanInstallObservedHistory, "success", { freshness: { status: "stale", marker: cleanInstallObservationFreshnessMarker("migration-readback", currentLocalMigrations[0]) } }), "clean-install-readback-observation-provenance-or-freshness-missing"]
]) {
  const rejected = readBackCleanInstallMigration(firstCleanInstallSubmission, currentLocalMigrations[0], envelope);
  assert.equal(rejected.stopReason, expectedStopReason, `clean-install readback rejects ${label}`);
  assert.deepEqual(rejected.history, firstCleanInstallSubmission.history, `clean-install readback ${label} rejection preserves history`);
  assert.deepEqual(rejected.operations, firstCleanInstallSubmission.operations, `clean-install readback ${label} rejection performs zero additional operations`);
  assert.deepEqual(rejected.sqlExecutions, firstCleanInstallSubmission.sqlExecutions, `clean-install readback ${label} rejection executes zero additional SQL`);
}
assertUnknownResultStopsWithoutMutation(
  "clean-install readback",
  firstCleanInstallSubmission,
  () => readBackCleanInstallMigration(firstCleanInstallSubmission, currentLocalMigrations[0], observeIndependentExternalCleanInstall(firstCleanInstallSubmission, "migration-readback", currentLocalMigrations[0], firstCleanInstallObservedHistory, "unexpected")),
  "clean-install-readback-unverified"
);
const firstCleanInstallReadback = readBackCleanInstallMigration(firstCleanInstallSubmission, currentLocalMigrations[0], observeIndependentExternalCleanInstall(firstCleanInstallSubmission, "migration-readback", currentLocalMigrations[0], firstCleanInstallObservedHistory));
const duplicateCleanInstallMigration = applyCleanInstallMigration(firstCleanInstallReadback, currentLocalMigrations[0]);
assert.equal(duplicateCleanInstallMigration.stopReason, "unknown-or-duplicate-clean-install-migration", "duplicate clean-install migration stops");
const cleanInstallApplyFailure = applyCleanInstallMigration(firstCleanInstallReadback, currentLocalMigrations[1], { result: "failure" });
assert.equal(cleanInstallApplyFailure.stopReason, "clean-install-apply-failure", "clean-install apply failure after partial completion stops");
assert.strictEqual(applyCleanInstallMigration(cleanInstallApplyFailure, currentLocalMigrations[1]), cleanInstallApplyFailure, "clean-install apply failure cannot automatically continue");
const cleanInstallApplyUncertain = applyCleanInstallMigration(firstCleanInstallReadback, currentLocalMigrations[1], { result: "uncertain" });
assert.equal(cleanInstallApplyUncertain.stopReason, "clean-install-apply-uncertain", "uncertain clean-install apply stops");
assert.strictEqual(readBackCleanInstallMigration(cleanInstallApplyUncertain, currentLocalMigrations[1], [currentLocalMigrations[0], currentLocalMigrations[1]]), cleanInstallApplyUncertain, "uncertain clean-install apply cannot automatically continue to readback");
const cleanInstallReadbackFailure = readBackCleanInstallMigration(firstCleanInstallSubmission, currentLocalMigrations[0], observeIndependentExternalCleanInstall(firstCleanInstallSubmission, "migration-readback", currentLocalMigrations[0], firstCleanInstallObservedHistory, "failure"));
assert.equal(cleanInstallReadbackFailure.stopReason, "clean-install-readback-failure", "clean-install readback failure stops");
assert.strictEqual(applyCleanInstallMigration(cleanInstallReadbackFailure, currentLocalMigrations[1]), cleanInstallReadbackFailure, "clean-install readback failure cannot automatically continue");
const cleanInstallReadbackUncertain = readBackCleanInstallMigration(firstCleanInstallSubmission, currentLocalMigrations[0], observeIndependentExternalCleanInstall(firstCleanInstallSubmission, "migration-readback", currentLocalMigrations[0], firstCleanInstallObservedHistory, "uncertain"));
assert.equal(cleanInstallReadbackUncertain.stopReason, "clean-install-readback-uncertain", "uncertain clean-install readback stops");
assert.strictEqual(applyCleanInstallMigration(cleanInstallReadbackUncertain, currentLocalMigrations[1]), cleanInstallReadbackUncertain, "uncertain clean-install readback cannot automatically continue");
assert.equal(readBackCleanInstallMigration(firstCleanInstallSubmission, currentLocalMigrations[0], undefined).stopReason, "clean-install-readback-observation-envelope-missing", "a missing external clean-install readback stops");
assert.equal(readBackCleanInstallMigration(firstCleanInstallSubmission, currentLocalMigrations[0], observeIndependentExternalCleanInstall(firstCleanInstallSubmission, "migration-readback", currentLocalMigrations[0], [], "success", {}, firstCleanInstallObservedHistory)).stopReason, "clean-install-readback-inventory-mismatch", "a clean-install readback missing the submitted migration stops");
assert.equal(readBackCleanInstallMigration(firstCleanInstallSubmission, currentLocalMigrations[0], observeIndependentExternalCleanInstall(firstCleanInstallSubmission, "migration-readback", currentLocalMigrations[0], [...firstCleanInstallObservedHistory, currentLocalMigrations[0]], "success", {}, firstCleanInstallObservedHistory)).stopReason, "clean-install-readback-inventory-mismatch", "a duplicate clean-install readback entry stops");
assert.equal(readBackCleanInstallMigration(firstCleanInstallSubmission, currentLocalMigrations[0], observeIndependentExternalCleanInstall(firstCleanInstallSubmission, "migration-readback", currentLocalMigrations[0], [...firstCleanInstallObservedHistory, "20990101000000_unknown"], "success", {}, firstCleanInstallObservedHistory)).stopReason, "clean-install-readback-inventory-mismatch", "an extra clean-install readback entry stops");
const secondCleanInstallSubmission = applyCleanInstallMigration(firstCleanInstallReadback, currentLocalMigrations[1], { result: "success" });
assert.equal(readBackCleanInstallMigration(secondCleanInstallSubmission, currentLocalMigrations[1], observeIndependentExternalCleanInstall(secondCleanInstallSubmission, "migration-readback", currentLocalMigrations[1], [currentLocalMigrations[1], currentLocalMigrations[0]], "success", {}, [currentLocalMigrations[0], currentLocalMigrations[1]])).stopReason, "clean-install-readback-inventory-mismatch", "a wrong-order clean-install readback stops");
const restartedPartialCleanInstall = completeCleanInstallPreflight(firstCleanInstallReadback);
assert.equal(restartedPartialCleanInstall.stopReason, "partial-clean-install-state", "partial clean-install completion cannot restart preflight automatically");
const completedCleanInstallRerun = applyCleanInstallMigration(cleanInstallFixture, currentLocalMigrations[33]);
assert.equal(completedCleanInstallRerun.stopReason, "partial-clean-install-state", "completed clean install rerun stops");
assert.strictEqual(applyCleanInstallMigration(completedCleanInstallRerun, currentLocalMigrations[33]), completedCleanInstallRerun, "completed clean install cannot continue automatically after rerun stop");

const currentLocalVersions = versionSet(currentLocalMigrations);
assert.equal(intersection([...currentLocalVersions], [...remoteVersions]).length, 19, "post-source current matched count is 19");
assert.equal(difference([...currentLocalVersions], [...remoteVersions]).length, 15, "post-source current local-only count remains 15");
assert.equal(difference([...remoteVersions], [...currentLocalVersions]).length, 8, "post-source current remote-only count is 8");

assert.deepEqual(cleanInstallOrder, [
  "explicit-target-selection",
  "read-only-empty-history-revalidation",
  "canonical-local-migrations-once",
  "per-migration-readback",
  "clean-install-complete",
  "post-apply-read-only-check"
], "clean install explicitly selects an isolated-empty target, revalidates empty history, then applies chronologically with readback gates");
assert.ok(!cleanInstallOrder.some((state) => state.includes("repair")), "clean install never repairs migration history");
assert.deepEqual(previewOrder.slice(0, 5), [
  "explicit-preview-target-selection",
  "complete-history-semantic-hash-preflight",
  "preflight-verified",
  "history-only-repair-reverted-remote-then-applied-local",
  "history-repair-complete"
], "Preview history repair precedes additive application");
assert.deepEqual(previewOrder.slice(5, 11), [
  "dry-run-explicit-two-file-allowlist",
  "only-two-allowlisted-additive-pending",
  "first-additive-awaiting-readback",
  "first-additive-readback-succeeded",
  "second-additive-awaiting-readback",
  "additive-complete"
], "Preview additive phase is dry-run, two-file allowlisted, and readback-gated after each SQL submission");
assert.ok(previewOrder.indexOf("history-repair-complete") < previewOrder.indexOf("additive-complete"), "history repair completes before additive phase");
assert.ok(!operatorStates.includes("blind-db-push"), "operator states do not authorize blind db push");
for (const forbiddenAction of forbiddenOperatorActions) {
  assert.ok(!cleanInstallOrder.includes(forbiddenAction), `clean install excludes forbidden action: ${forbiddenAction}`);
  assert.ok(!previewOrder.includes(forbiddenAction), `Preview path excludes forbidden action: ${forbiddenAction}`);
}
assert.deepEqual(stopConditions, [
  "target-not-explicit-or-mismatched",
  "clean-install-history-not-empty-or-unknown",
  "semantic-or-hash-mismatch",
  "secret-or-private-identifier-detected",
  "unknown-or-duplicate-migration",
  "unexpected-pending-migration",
  "repair-apply-or-readback-error",
  "partial-state"
], "all fail-closed stop conditions are fixed");
assert.equal(additiveAllowlist[0], "20260813135500_comment_translator_paid_task6_azure_uncertain_retry_compatibility", "older Task 6 additive migration is first");
assert.equal(additiveAllowlist[1], "20260829100000_comment_translator_paid_task6_azure_uncertain_retry_guard_repair", "newer Task 6 additive migration is second");
assert.ok(previewOrder.includes("post-apply-read-only-check"), "post-apply checks are read-only");
assert.ok(stopConditions.includes("partial-state"), "partial state stops the next phase");

const crlfCanonicalMigration = canonicalMigration.replace(/\n/g, "\r\n");
assert.equal(sourceSha256(crlfCanonicalMigration), sourceSha256(canonicalMigration), "canonical source hash is stable across LF and CRLF line endings");
const crCanonicalMigration = canonicalMigration.replace(/\n/g, "\r");
assert.equal(sourceSha256(crCanonicalMigration), sourceSha256(canonicalMigration), "canonical source hash is stable across LF and CR line endings");
const changedCanonicalMigration = canonicalMigration.replace("runtime-only", "runtime-mutated");
assert.notEqual(sourceSha256(changedCanonicalMigration), sourceSha256(canonicalMigration), "canonical source hash still detects non-EOL content changes");

const migrationSha256 = sourceSha256(migrationSql);
assert.equal(migrationSha256, canonicalMigrationSourceSha256, "canonical migration source SHA-256 matches the exact sanitized seven-statement migration");
console.log(`comment-translator-paid-core-v1-gate0a2-migration-history-contract: PASS`);
console.log(`full-preflight-envelope=REQUIRED trusted-external-adapter-lineage=OPAQUE_AND_UNPROVISIONED_IN_SOURCE_ONLY_RUN local-static-trusted-issuance=REJECTED internal-state-machine-fixture-not-live=PASS 8-pair and additive/post-apply mechanics=PASS`);
console.log(`not-live-static-fixture=REJECTED_DURING_PREFLIGHT operations=0 sql-executions=0 opaque-capability=required`);
console.log(`unknown-result=REJECTED state/history=unchanged zero additional operation/sql=PASS existing baseline/hash/7 statements/order=PASS`);
console.log(`pair-evidence freshness required missing/mismatched freshness=REJECTED history/operations/sqlExecutions=unchanged zero additional operation/sql=PASS`);
console.log(`preview-observations full-preflight-envelope=REQUIRED bare-preflight=REJECTED full-readback-envelope=REQUIRED bare-readback=REJECTED bare-callback=REJECTED relabelled/self-generated/issued-but-static=REJECTED sync-and-promise-outer/nested=REJECTED cyclic-or-unbounded-envelope=REJECTED internal-not-live-post-apply-mechanics=PASS concrete-post-apply-observations=VERIFIED missing-or-mismatched-capability-provenance-freshness-target=REJECTED pair-envelope-capability-target=REQUIRED zero-additional-operations=true zero-additional-sql-executions=true`);
console.log(`common-concrete-post-apply-checks preview=VERIFIED clean-install=VERIFIED canonical-source=statement-count-and-sequence-sha256-body/function-md5-and-source-sha256 function-security=security-definer-and-exact-search-path schema-acl=owner/public/anon/authenticated/service_role-usage-exact function-acl=owner/public/anon/authenticated/service_role-execute-exact comment-sha256=exact owner-lease-boundary=exact side-effects=scheduler-job-baseline-target-specific-active-false-and-create/alter/activate/deactivate/delete-operations-zero vault-write/url-persist/token-persist-zero missing-or-mutated-concrete-value=REJECTED history-unchanged=true zero-additional-operations=true zero-additional-sql-executions=true local-preview-fixture-authority=internal-not-live local-clean-install-fixture-authority=internal-not-live trusted-external-success=NOT_CLAIMED clean-install-capability/provenance/freshness/target=REQUIRED`);
console.log(`observed-baseline union=42 matched=18 local-only=15 remote-only=9 paid-local-only=10 paid-remote-only=9`);
console.log(`current-source matched=19 local-only=15 remote-only=8 local-migrations=34`);
console.log(`canonical statements=7 statement-sequence-sha256=${migrationStatementSequenceSha256} body-semantic-md5=${bodySemanticMd5} remote-function-md5=${remoteFunctionDefinitionMd5} migration-sha256=${migrationSha256}`);
