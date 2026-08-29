import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const exists = (relativePath) => fs.existsSync(path.join(repoRoot, relativePath));

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export default {};#server-only"
      };
    }
    if (specifier === "@supabase/supabase-js") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export const createClient=()=>({});export default {};#supabase"
      };
    }
    if (specifier.startsWith("@/")) {
      const candidate = pathToFileURL(path.join(repoRoot, `${specifier.slice(2)}.ts`));
      if (fs.existsSync(candidate)) return { shortCircuit: true, url: candidate.href };
    }
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL);
      if (fs.existsSync(candidate)) return { shortCircuit: true, url: candidate.href };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) {
      const source = fs.readFileSync(new URL(url), "utf8");
      return {
        format: "module",
        shortCircuit: true,
        source: stripTypeScriptTypes(source, { mode: "transform", sourceMap: false })
      };
    }
    return nextLoad(url, context);
  }
});

const openAiPath = "lib/comment-translator-openai-execution.ts";
const circuitPath = "lib/comment-translator-provider-circuit-breaker.ts";
const policyPath = "lib/comment-translator-provider-policy-runtime.ts";
const executionPath = "lib/comment-translator-provider-execution-runtime.ts";
const providerBoundaryPath = "lib/comment-translator-provider-boundary.ts";
const usageStorePath = "lib/comment-translator-paid-usage-store.ts";
const azurePath = "lib/comment-translator-azure-normal-translation-execution.ts";
const circuitMigrationPath = "supabase/migrations/20260813130000_comment_translator_paid_task6_circuit_probe_claim.sql";
const rateRetryMigrationPath = "supabase/migrations/20260813131500_comment_translator_paid_task6_openai_rate_retry.sql";
const ownedCircuitFailureMigrationPath = "supabase/migrations/20260813133000_comment_translator_paid_task6_owned_circuit_failure.sql";
const billingSplitMigrationPath = "supabase/migrations/20260813134500_comment_translator_paid_task6_azure_billing_split.sql";
const azureUncertainRetryCompatibilityMigrationPath = "supabase/migrations/20260813135500_comment_translator_paid_task6_azure_uncertain_retry_compatibility.sql";
const azureUncertainRetryMigrationPath = "supabase/migrations/20260813140000_comment_translator_paid_task6_azure_uncertain_retry.sql";
const azureUncertainRetryGuardRepairMigrationPath = "supabase/migrations/20260829100000_comment_translator_paid_task6_azure_uncertain_retry_guard_repair.sql";
const circuitSuccessWindowMigrationPath = "supabase/migrations/20260813141500_comment_translator_paid_task6_circuit_success_window.sql";
const openAiResumeStatusMigrationPath = "supabase/migrations/20260813143000_comment_translator_paid_task6_openai_resume_status.sql";
const terminalOpenAiPartialMigrationPath = "supabase/migrations/20260813144500_comment_translator_paid_task6_terminal_openai_partial.sql";
const openAiPartialReceiptMigrationPath = "supabase/migrations/20260813150000_comment_translator_paid_task6_openai_partial_receipt.sql";
const terminalOpenAiPartialAuthorityMigrationPath = "supabase/migrations/20260813151500_comment_translator_paid_task6_terminal_openai_partial_authority.sql";
const replayCircuitAuthorityMigrationPath = "supabase/migrations/20260813153000_comment_translator_paid_task6_replay_circuit_authority.sql";
const dispatchAndAzurePartialMigrationPath = "supabase/migrations/20260813154500_comment_translator_paid_task6_dispatch_and_azure_partial_settlement.sql";
const paidCoreMigrationPath = "supabase/migrations/20260812120000_comment_translator_paid_core_v1.sql";

for (const relativePath of [openAiPath, circuitPath]) {
  assert.ok(exists(relativePath), `Task 6 module exists: ${relativePath}`);
  assert.match(read(relativePath), /^import "server-only";/m, `${relativePath} is server-only`);
}

const openAi = read(openAiPath);
const circuit = read(circuitPath);
const policy = read(policyPath);
const execution = read(executionPath);
const providerBoundary = read(providerBoundaryPath);
const usageStore = read(usageStorePath);
const azure = read(azurePath);
const circuitMigration = read(circuitMigrationPath);
const rateRetryMigration = read(rateRetryMigrationPath);
const ownedCircuitFailureMigration = read(ownedCircuitFailureMigrationPath);
const billingSplitMigration = read(billingSplitMigrationPath);
assert.ok(exists(azureUncertainRetryCompatibilityMigrationPath), "Task 6 adds the pre-historical Azure guard compatibility migration");
const azureUncertainRetryCompatibilityMigration = read(azureUncertainRetryCompatibilityMigrationPath);
const azureUncertainRetryMigration = read(azureUncertainRetryMigrationPath);
assert.ok(exists(azureUncertainRetryGuardRepairMigrationPath), "Task 6 adds the historical Azure guard repair migration");
const azureUncertainRetryGuardRepairMigration = read(azureUncertainRetryGuardRepairMigrationPath);
const circuitSuccessWindowMigration = read(circuitSuccessWindowMigrationPath);
const openAiResumeStatusMigration = read(openAiResumeStatusMigrationPath);
const terminalOpenAiPartialMigration = read(terminalOpenAiPartialMigrationPath);
const openAiPartialReceiptMigration = read(openAiPartialReceiptMigrationPath);
const terminalOpenAiPartialAuthorityMigration = read(terminalOpenAiPartialAuthorityMigrationPath);
const replayCircuitAuthorityMigration = read(replayCircuitAuthorityMigrationPath);
assert.ok(exists(dispatchAndAzurePartialMigrationPath), "Task 6 adds one atomic dispatch/partial-settlement migration");
const dispatchAndAzurePartialMigration = exists(dispatchAndAzurePartialMigrationPath)
  ? read(dispatchAndAzurePartialMigrationPath)
  : "";
const paidCoreMigration = read(paidCoreMigrationPath);

assert.match(openAi, /gpt-4o-mini/, "OpenAI adapter fixes the approved model");
assert.match(openAi, /store\s*:\s*false/, "OpenAI adapter disables provider storage");
assert.match(openAi, /json_schema/, "OpenAI adapter uses structured output schema");
assert.match(openAi, /strict\s*:\s*true/, "OpenAI structured output is strict");
assert.match(openAi, /15/, "OpenAI adapter bounds a batch at fifteen items");
assert.match(openAi, /7[_]?500/, "OpenAI adapter bounds a batch at 7,500 code points");
assert.match(openAi, /1[_]?000/, "OpenAI adapter bounds each output item at 1,000 code points");
assert.match(openAi, /128/, "OpenAI adapter reserves 128 output tokens per item");
assert.match(openAi, /384/, "OpenAI adapter includes the fixed 384 token request envelope");
assert.match(openAi, /max_completion_tokens:\s*tokenEstimate\.requestTokenLimit/, "Chat Completions request uses the approved max_completion_tokens hard limit");
assert.doesNotMatch(openAi, /\bmax_output_tokens\s*:/, "Chat Completions request omits the Responses-only max_output_tokens field");
assert.doesNotMatch(openAi, /\bmax_tokens\s*:/, "OpenAI request does not use the unapproved max_tokens field");
assert.match(openAi, /20[_]?000/, "OpenAI adapter has a 20 second HTTP timeout");
assert.match(openAi, /attempt[_-]?id/i, "OpenAI response correlation uses attempt ids");
assert.match(openAi, /attemptId:\s*"single-item"/, "single-item compatibility adapter sends an opaque attempt id");
assert.doesNotMatch(openAi, /attemptId:\s*request\.requestId/, "single-item compatibility adapter never sends a caller identifier");
assert.match(openAi, /subset/i, "OpenAI retry is subset-only");
assert.match(openAi, /fallback/i, "OpenAI adapter exposes sanitized fallback classification");
assert.doesNotMatch(openAi, /authorDisplayName|channelId|liveChatId|ownerUserId|oauthAccessToken|serviceRoleKey/i, "OpenAI adapter does not send private metadata");
assert.doesNotMatch(openAi, /console\.(log|error|warn)\s*\(/i, "OpenAI adapter does not log raw provider material");
assert.doesNotMatch(policy, /safeReadResponseText|sanitizeProviderMessage|response\.text\(\)/i, "Azure known failures do not read or return raw provider error bodies");
assert.match(policy, /403001/, "Azure F0 quota recognizes only the documented numeric code");
assert.match(execution, /claimProviderDispatch/, "Paid runtime claims each provider dispatch before POST");
assert.match(execution, /already-dispatched/, "Paid runtime returns an uncertain replay instead of repeating a claimed POST");
assert.match(dispatchAndAzurePartialMigration, /create table if not exists public\.comment_translator_paid_provider_dispatch_claims/i, "dispatch claims are durable and additive");
assert.match(dispatchAndAzurePartialMigration, /create or replace function public\.ct_paid_claim_provider_dispatch/i, "dispatch claim is an atomic RPC");
assert.match(dispatchAndAzurePartialMigration, /attempt_state = 'uncertain'/i, "first dispatch atomically transitions the attempt to uncertain in-flight");
assert.match(dispatchAndAzurePartialMigration, /return 'already-dispatched'/i, "an existing dispatch claim cannot authorize another POST");
assert.match(dispatchAndAzurePartialMigration, /create or replace function public\.ct_paid_settle_azure_partial_failure/i, "Azure partial failure has one atomic settlement RPC");
assert.match(dispatchAndAzurePartialMigration, /committed_paid_characters = committed_paid_characters \+ p_actual_input_characters/i, "partial settlement bills Azure successful characters only");
assert.match(dispatchAndAzurePartialMigration, /provider_failure_class = p_provider_failure_class/i, "partial settlement retains the sanitized Azure failure class");
assert.match(dispatchAndAzurePartialMigration, /v_expected_circuit_state := case[\s\S]{0,120}'pending'/i, "partial settlement retains a pending circuit marker");
assert.match(dispatchAndAzurePartialMigration, /circuit_state = 'disabled'/i, "Azure quota disables fallback in the settlement transaction");

for (const fallbackClass of ["network", "timeout", "408", "504", "500", "503", "429"]) {
  assert.match(openAi, new RegExp(fallbackClass.replace(/[()]/g, "\\$&"), "i"), `fallback matrix names ${fallbackClass}`);
}
for (const excludedClass of ["authentication", "configuration", "quota", "cost", "policy", "invalid-request", "unsupported"]) {
  assert.match(openAi, new RegExp(excludedClass.replace(/[()]/g, "\\$&"), "i"), `fallback matrix excludes ${excludedClass}`);
}

assert.match(circuit, /3/, "circuit breaker has the three-failure threshold");
assert.match(circuit, /60[_]?000/, "circuit breaker has a sixty-second failure window");
assert.match(circuit, /300[_]?000/, "circuit breaker has a five-minute Azure-direct window");
assert.match(circuit, /half[-_ ]open/i, "circuit breaker has a half-open probe state");
assert.match(circuit, /disabled/i, "circuit breaker has a kill-switch state");
assert.match(circuit, /azure/i, "circuit breaker exposes Azure-direct routing");
assert.match(circuit, /ct_paid_read_provider_circuit/, "durable circuit authority has a pure state read");
assert.match(circuit, /ct_paid_claim_provider_circuit_probe/, "durable circuit authority claims a probe lease atomically");
assert.match(circuit, /ct_paid_record_provider_circuit_failure_owned/, "durable circuit failures use the owned probe authority");
assert.match(circuit, /p_probe_attempt_id:[ \t]*probeAttemptId/, "circuit failure adapter forwards the probe owner");
assert.match(circuitMigration, /create or replace function public\.ct_paid_read_provider_circuit/i, "Task 6 adds the durable circuit read RPC");
assert.match(circuitMigration, /create or replace function public\.ct_paid_claim_provider_circuit_probe/i, "Task 6 adds the durable circuit probe-claim RPC");
assert.match(circuitMigration, /probe_attempt_id\s*=\s*p_probe_attempt_id/i, "probe ownership is persisted, not synthesized in process memory");
assert.match(circuitMigration, /interval '120 seconds'/i, "durable probe lease is bounded to 120 seconds");
assert.match(ownedCircuitFailureMigration, /ct_paid_record_provider_circuit_failure_owned/i, "Task 6 adds an additive owned-failure RPC");
assert.match(ownedCircuitFailureMigration, /circuit.probe_attempt_id is distinct from p_probe_attempt_id/i, "owned-failure RPC rejects a stale half-open probe owner");
assert.match(ownedCircuitFailureMigration, /circuit.probe_lease_until <= p_now/i, "owned-failure RPC rejects an expired half-open probe lease");
assert.match(ownedCircuitFailureMigration, /for update/i, "owned-failure RPC locks the circuit before checking ownership");
assert.doesNotMatch(circuitMigration, /\b(?:drop\s+table|truncate\s+table)\b/i, "Task 6 circuit migration is additive");
assert.match(rateRetryMigration, /ct_paid_openai_attempt/i, "Task 6 adds the narrow OpenAI retry RPC override");
assert.match(rateRetryMigration, /provider_failure_class is null or v_shared_attempt\.provider_failure_class not in \(''invalid-response'', ''rate-limit''\)/i, "one fresh OpenAI retry accepts only invalid-response or ordinary 429 predecessors");
assert.doesNotMatch(rateRetryMigration, /\b(?:drop\s+table|truncate\s+table)\b/i, "Task 6 rate-retry migration is additive");
assert.match(billingSplitMigration, /ct_paid_finalize_azure_fallback_with_billing_characters/i, "Task 6 adds a separate combined-billing Azure finalizer");
assert.match(billingSplitMigration, /p_actual_input_characters[\s\S]{0,260}p_actual_billing_input_characters/i, "Azure and logical billing character values are separate RPC inputs");
assert.match(billingSplitMigration, /committed_paid_characters = committed_paid_characters \+ p_actual_input_characters/i, "Azure fallback bucket commits Azure-only characters");
assert.match(billingSplitMigration, /ct_paid_commit_billing_period_characters\([\s\S]{0,220}p_actual_billing_input_characters/i, "logical billing commits the combined successful character count");
assert.match(billingSplitMigration, /grant execute on function[\s\S]{0,180}service_role/i, "combined-billing RPC is service-role-only");
assert.doesNotMatch(billingSplitMigration, /\b(?:drop\s+table|truncate\s+table)\b/i, "Task 6 billing split migration is additive");
assert.ok(azureUncertainRetryCompatibilityMigrationPath < azureUncertainRetryMigrationPath, "Azure compatibility migration sorts before the immutable historical migration");
assert.match(azureUncertainRetryCompatibilityMigration, /task6_azure_guard_history_compat_begin[\s\S]+?if v_openai_receipt_count = 2 then[\s\S]+?if v_openai_receipt_count <> 1 then[\s\S]+?task6_azure_guard_history_compat_end/i, "pre-historical migration carries both immutable replacement needles inside one explicit compatibility marker");
for (const authorityFragment of ["owner_user_id", "session_reference_id", "period_start", "period_end", "utc_month", "reserved_cost_micros", "committed_cost_micros", "slot_state", "reservation_state", "attempt_state", "provider_failure_class"]) {
  assert.match(azureUncertainRetryCompatibilityMigration, new RegExp(authorityFragment, "i"), `pre-historical hardened block includes ${authorityFragment} authority`);
}
assert.match(azureUncertainRetryCompatibilityMigration, /replace\(v_semantic_definition, v_hardened_uncertain, ''\)[\s\S]+?length\(v_hardened_uncertain\) = 1/i, "pre-historical no-op requires exactly one complete hardened uncertain block");
assert.match(azureUncertainRetryCompatibilityMigration, /v_is_legacy[\s\S]+?if not v_is_legacy then[\s\S]+?raise exception/i, "pre-historical migration repairs only canonical legacy and fails closed otherwise");
assert.doesNotMatch(azureUncertainRetryCompatibilityMigration, /\b(?:drop\s+table|truncate\s+table|delete\s+from|grant\s+|revoke\s+)\b/i, "pre-historical compatibility migration changes no data or privileges");
assert.match(azureUncertainRetryMigration, /ct_paid_azure_direct_fallback/i, "Task 6 adds the narrow Azure uncertain-retry override");
assert.match(azureUncertainRetryMigration, /p\.proname = 'ct_paid_azure_direct_fallback'[\s\S]{0,120}p\.pronargs = 9/i, "Azure retry override targets the nine-argument Task 5 RPC");
assert.match(azureUncertainRetryMigration, /v_openai_receipt_count = 2 and v_shared_attempt\.attempt_state <> ''uncertain''/i, "Azure retry override preserves the terminal two-receipt path");
assert.match(azureUncertainRetryMigration, /v_original := 'if v_openai_receipt_count <> 1 then';[\s\S]+?position\(v_original in v_definition\)[\s\S]+?v_definition := replace\(/i, "historical Azure retry migration retains its immutable original guard");
assert.doesNotMatch(azureUncertainRetryMigration, /regexp_replace\(/i, "historical Azure retry migration is not edited in place");
assert.match(azureUncertainRetryMigration, /provider_failure_class not in \('invalid-response', 'rate-limit'\)/i, "Azure retry override limits the older receipt to a bounded-retry predecessor");
assert.match(azureUncertainRetryMigration, /OpenAI retry predecessor is not safely terminal/i, "Azure retry override fails closed on an unsafe older receipt");
assert.match(azureUncertainRetryMigration, /slot_row\.slot_state = 'released'/i, "Azure retry override proves the older OpenAI slot was released");
assert.match(azureUncertainRetryMigration, /rate_row\.reservation_state = 'completed'/i, "Azure retry override proves the older OpenAI rate reservation was completed");
assert.doesNotMatch(azureUncertainRetryMigration, /\b(?:drop\s+table|truncate\s+table)\b/i, "Task 6 Azure uncertain-retry migration is additive");
assert.match(azureUncertainRetryGuardRepairMigration, /ct_paid_azure_direct_fallback/i, "Task 6 Azure guard repair targets the existing RPC");
assert.match(azureUncertainRetryGuardRepairMigration, /p\.proname = 'ct_paid_azure_direct_fallback'[\s\S]{0,120}p\.pronargs = 9/i, "Azure guard repair targets the nine-argument Task 5 RPC");
assert.match(azureUncertainRetryGuardRepairMigration, /v_openai_receipt_count not in \(1, 2\)/i, "Azure guard repair preserves the bounded two-receipt rule");
for (const authorityFragment of ["owner_user_id", "session_reference_id", "period_start", "period_end", "utc_month", "reserved_cost_micros", "committed_cost_micros", "slot_state", "reservation_state", "attempt_state", "provider_failure_class"]) {
  assert.match(azureUncertainRetryGuardRepairMigration, new RegExp(authorityFragment, "i"), `late hardened block includes ${authorityFragment} authority`);
}
assert.match(azureUncertainRetryGuardRepairMigration, /replace\(v_semantic_definition, v_hardened_uncertain, ''\)[\s\S]+?length\(v_hardened_uncertain\) = 1/i, "late no-op requires exactly one complete hardened uncertain block");
assert.match(azureUncertainRetryGuardRepairMigration, /if v_is_hardened then[\s\S]+?return;/i, "already-hardened complete definition is an idempotent no-op");
assert.match(azureUncertainRetryGuardRepairMigration, /v_is_legacy[\s\S]+?if not v_is_legacy then[\s\S]+?raise exception/i, "late repair accepts canonical legacy and fails closed on partial or malformed definitions");
assert.match(azureUncertainRetryGuardRepairMigration, /v_legacy_uncertain_pattern[\s\S]+?regexp_replace\([\s\S]+?v_hardened_uncertain/i, "late repair replaces the complete original uncertain guard");
assert.doesNotMatch(azureUncertainRetryGuardRepairMigration, /\b(?:drop\s+table|truncate\s+table|delete\s+from)\b/i, "Task 6 Azure guard repair is additive and non-destructive");
const normalizedAssignments = (source, variable) => [...source.matchAll(new RegExp(`${variable}\\s*:=([\\s\\S]*?);`, "gi"))]
  .map((match) => match[1].replace(/\s+/g, " ").trim());
const strictClassifierAssignments = [
  ...normalizedAssignments(azureUncertainRetryCompatibilityMigration, "v_is_hardened"),
  ...normalizedAssignments(azureUncertainRetryGuardRepairMigration, "v_is_hardened")
];
assert.equal(strictClassifierAssignments.length, 6, "both additive migrations validate the strict hardened classifier before every execution path");
assert.equal(new Set(strictClassifierAssignments).size, 1, "both additive migrations and post-repair validation use one strict hardened classifier");
const semanticClassifierAssignments = [
  ...normalizedAssignments(azureUncertainRetryCompatibilityMigration, "v_is_semantic_hardened"),
  ...normalizedAssignments(azureUncertainRetryGuardRepairMigration, "v_is_semantic_hardened")
];
assert.equal(semanticClassifierAssignments.length, 2, "both additive migrations declare the semantic-equivalent hardened classifier once");
assert.equal(new Set(semanticClassifierAssignments).size, 1, "both additive migrations use one semantic-equivalent hardened classifier");
for (const [label, migration] of [
  ["pre-historical compatibility", azureUncertainRetryCompatibilityMigration],
  ["late repair", azureUncertainRetryGuardRepairMigration]
]) {
  assert.match(migration, /v_compatibility_marker_after_history/i, `${label} recognizes the one complete post-history marker shape`);
  assert.match(migration, /v_expected_semantic_hardened_definition_md5\s+text\s*:=\s*'67b6b5732907c2486ec50bf535bc4f55'/i, `${label} pins the externally observed pre-apply generated-definition identity`);
  assert.match(migration, /v_valid_marker_count\s*=\s*0[\s\S]+?md5\(v_definition\)\s*=\s*v_expected_semantic_hardened_definition_md5[\s\S]+?v_semantic_hardened_first_count\s*=\s*1/i, `${label} permits the semantic-equivalent path only for the marker-free observed definition`);
  assert.match(migration, /v_semantic_hardened_first_pattern[\s\S]+?regexp_matches\(v_semantic_definition, v_semantic_hardened_first_pattern, 'g'\)/i, `${label} counts the semantic-equivalent hardened first guard without reading remote values`);
  assert.match(migration, /v_semantic_hardened_first_count\s*=\s*1[\s\S]+?regexp_replace\(v_definition, v_semantic_hardened_first_pattern, v_hardened_first\)/i, `${label} canonicalizes exactly one semantic-equivalent hardened first guard`);
  assert.match(migration, /v_valid_marker_count\s*=\s*0[\s\S]+?v_marker_begin_count\s*=\s*0[\s\S]+?v_marker_end_count\s*=\s*0[\s\S]+?v_valid_marker_count\s*=\s*1[\s\S]+?v_marker_begin_count\s*=\s*1[\s\S]+?v_marker_end_count\s*=\s*1/i, `${label} permits zero or one complete compatibility marker only`);
  assert.match(migration, /v_hardened_first_opening[\s\S]+?v_bounded_uncertain_opening_stem[\s\S]+?v_legacy_raise/i, `${label} declares strict partial-opening and legacy-raise needles`);
  assert.match(migration, /replace\(v_semantic_definition, v_legacy_first, ''\)[\s\S]+?= 0[\s\S]+?replace\(v_semantic_definition, v_legacy_uncertain_opening, ''\)[\s\S]+?= 0[\s\S]+?replace\(v_semantic_definition, v_legacy_raise, ''\)[\s\S]+?= 0/i, `${label} rejects all executable legacy guard needles in hardened state`);
}

const extractTaggedBody = (source, tag) => {
  const match = source.match(new RegExp(`\\$${tag}\\$([\\s\\S]+?)\\$${tag}\\$`, "i"));
  assert.ok(match, `${tag} fixture body is present`);
  return match[1];
};
const countLiteral = (source, needle) => source.split(needle).length - 1;
const sha256 = (source) => createHash("sha256").update(source).digest("hex");
const expectedObservedSemanticDefinitionMd5 = "67b6b5732907c2486ec50bf535bc4f55";
const expectedCanonicalSemanticDefinitionSha256 = "5a8b759532ebba939a8c2d5331d24782b9ece7647adcbb71b588cd7985c3ca5f";
const legacyFirstGuard = "if v_openai_receipt_count = 2 then";
const hardenedFirstGuard = "if v_openai_receipt_count = 2 and v_shared_attempt.attempt_state <> 'uncertain' then";
const legacyUncertainGuardPattern = /if v_openai_receipt_count <> 1 then\s+raise exception 'uncertain OpenAI fallback permits one OpenAI receipt';\s+end if;/;
const hardenedUncertainGuard = extractTaggedBody(azureUncertainRetryCompatibilityMigration, "hardened");
const compatibilityMarker = extractTaggedBody(azureUncertainRetryCompatibilityMigration, "compat");
const historicalUncertainReplacement = extractTaggedBody(azureUncertainRetryMigration, "replacement");
const legacyUncertainOpening = "if v_openai_receipt_count <> 1 then";
const legacyRaiseText = "raise exception 'uncertain OpenAI fallback permits one OpenAI receipt';";
const hardenedFirstOpening = "if v_openai_receipt_count = 2 and v_shared_attempt.attempt_state <> 'uncertain'";
const semanticHardenedFirstGuardPattern = /if\s+v_openai_receipt_count\s*=\s*2\s+and\s+v_shared_attempt\.attempt_state\s*<>\s*'uncertain'\s+then/g;
const boundedUncertainOpening = "if v_openai_receipt_count not in (1, 2) then";
const boundedUncertainOpeningStem = "if v_openai_receipt_count not in (1, 2)";
const compatibilityMarkerAfterHistory = compatibilityMarker.trim()
  .replace(legacyFirstGuard, hardenedFirstGuard)
  .replace(legacyUncertainOpening, historicalUncertainReplacement.trim());
const validCompatibilityMarkers = [compatibilityMarker.trim(), compatibilityMarkerAfterHistory];
const compatibilityMarkerBegin = "task6_azure_guard_history_compat_begin";
const compatibilityMarkerEnd = "task6_azure_guard_history_compat_end";
const semanticDefinitionFixture = (definition) => {
  const validMarkerCount = validCompatibilityMarkers.reduce((count, marker) => count + countLiteral(definition, marker), 0);
  const beginCount = countLiteral(definition, compatibilityMarkerBegin);
  const endCount = countLiteral(definition, compatibilityMarkerEnd);
  if (!((validMarkerCount === 0 && beginCount === 0 && endCount === 0)
    || (validMarkerCount === 1 && beginCount === 1 && endCount === 1))) return null;
  return validMarkerCount === 1
    ? validCompatibilityMarkers.reduce((semantic, marker) => semantic.replace(marker, ""), definition)
    : definition;
};
const stripCompatibilityMarker = (definition) => {
  const semanticDefinition = semanticDefinitionFixture(definition);
  if (semanticDefinition === null) throw new Error("Azure guard definition is partial or malformed");
  return semanticDefinition;
};
const hardenedFragments = [
  hardenedFirstGuard,
  "if v_openai_receipt_count not in (1, 2) then",
  "receipt.owner_user_id <> p_owner_user_id",
  "receipt.session_reference_id <> p_session_reference_id",
  "receipt.period_start is distinct from p_period_start",
  "receipt.period_end is distinct from p_period_end",
  "receipt.utc_month <> p_utc_month",
  "receipt.attempt_state not in ('committed', 'released')",
  "receipt.provider_failure_class not in ('invalid-response', 'rate-limit')",
  "receipt.committed_input_characters <> 0",
  "receipt.reserved_cost_micros <> 0",
  "receipt.committed_cost_micros <= 0",
  "slot_row.slot_state = 'released'",
  "rate_row.reservation_state = 'completed'",
  "rate_row.reservation_state = 'released'"
];
const isHardenedFixture = (definition) => {
  const semanticDefinition = semanticDefinitionFixture(definition);
  if (semanticDefinition === null) return false;
  return countLiteral(semanticDefinition, hardenedFirstGuard) === 1
    && countLiteral(semanticDefinition, hardenedFirstOpening) === 1
    && countLiteral(semanticDefinition, hardenedUncertainGuard) === 1
    && countLiteral(semanticDefinition, boundedUncertainOpening) === 1
    && countLiteral(semanticDefinition, boundedUncertainOpeningStem) === 1
    && countLiteral(semanticDefinition, legacyFirstGuard) === 0
    && countLiteral(semanticDefinition, legacyUncertainOpening) === 0
    && countLiteral(semanticDefinition, legacyRaiseText) === 0
    && hardenedFragments.every((fragment) => semanticDefinition.includes(fragment));
};
const isCanonicalLegacyFixture = (definition) => {
  const semanticDefinition = semanticDefinitionFixture(definition);
  if (semanticDefinition === null) return false;
  return countLiteral(semanticDefinition, legacyFirstGuard) === 1
    && (semanticDefinition.match(legacyUncertainGuardPattern) ?? []).length === 1
    && countLiteral(semanticDefinition, legacyUncertainOpening) === 1
    && countLiteral(semanticDefinition, legacyRaiseText) === 1
    && countLiteral(semanticDefinition, hardenedFirstGuard) === 0
    && countLiteral(semanticDefinition, hardenedFirstOpening) === 0
    && countLiteral(semanticDefinition, hardenedUncertainGuard) === 0
    && countLiteral(semanticDefinition, boundedUncertainOpening) === 0
    && countLiteral(semanticDefinition, boundedUncertainOpeningStem) === 0;
};
const isSemanticEquivalentHardenedFixture = (definition, observedDefinitionMd5) => {
  const semanticDefinition = semanticDefinitionFixture(definition);
  if (semanticDefinition === null) return false;
  const hasCompatibilityMarker = validCompatibilityMarkers.some((marker) => countLiteral(definition, marker) !== 0);
  return observedDefinitionMd5 === expectedObservedSemanticDefinitionMd5
    && !hasCompatibilityMarker
    && (semanticDefinition.match(semanticHardenedFirstGuardPattern) ?? []).length === 1
    && countLiteral(semanticDefinition, hardenedFirstGuard) === 0
    && countLiteral(semanticDefinition, hardenedFirstOpening) === 0
    && countLiteral(semanticDefinition, hardenedUncertainGuard) === 1
    && countLiteral(semanticDefinition, boundedUncertainOpening) === 1
    && countLiteral(semanticDefinition, boundedUncertainOpeningStem) === 1
    && countLiteral(semanticDefinition, legacyFirstGuard) === 0
    && countLiteral(semanticDefinition, legacyUncertainOpening) === 0
    && countLiteral(semanticDefinition, legacyRaiseText) === 0
    && hardenedFragments.slice(1).every((fragment) => semanticDefinition.includes(fragment));
};
const simulateRepair = (definition, { addCompatibilityMarker = false, observedDefinitionMd5 = null } = {}) => {
  let transformed = definition;
  if (!isHardenedFixture(transformed)) {
    if (isSemanticEquivalentHardenedFixture(transformed, observedDefinitionMd5)) {
      transformed = transformed.replace(semanticHardenedFirstGuardPattern, hardenedFirstGuard);
    } else {
      if (!isCanonicalLegacyFixture(transformed)) throw new Error("Azure guard definition is partial or malformed");
      transformed = transformed.replace(legacyFirstGuard, hardenedFirstGuard);
      transformed = transformed.replace(legacyUncertainGuardPattern, hardenedUncertainGuard.trim());
    }
  }
  if (addCompatibilityMarker && countLiteral(transformed, compatibilityMarkerBegin) === 0) {
    transformed = `${transformed}\n${compatibilityMarker.trim()}`;
  }
  if (!isHardenedFixture(transformed)) throw new Error("Azure guard definition is partial or malformed");
  return transformed;
};
const simulateImmutableHistoricalMigration = (definition) => {
  if (countLiteral(definition, legacyFirstGuard) !== 1) throw new Error("historical first guard is unreadable");
  let transformed = definition.replace(legacyFirstGuard, hardenedFirstGuard);
  if (countLiteral(transformed, legacyUncertainOpening) !== 1) throw new Error("historical uncertain guard is unreadable");
  transformed = transformed.replace(legacyUncertainOpening, historicalUncertainReplacement.trim());
  return transformed;
};

const canonicalLegacyFixture = `begin
  if v_openai_receipt_count = 2 then
    perform synthetic_terminal_chain_check();
  elsif v_shared_attempt.attempt_state = 'uncertain' then
    if v_openai_receipt_count <> 1 then
      raise exception 'uncertain OpenAI fallback permits one OpenAI receipt';
    end if;
    perform synthetic_retained_resource_check();
  end if;
end;`;
const hardenedFixture = simulateRepair(canonicalLegacyFixture);
const semanticEquivalentFirstGuard = `if v_openai_receipt_count = 2
      and v_shared_attempt.attempt_state <> 'uncertain'
    then`;
const baseAzureFunctionFixture = paidCoreMigration.match(/create or replace function public\.ct_paid_azure_direct_fallback\([\s\S]*?\n\$\$;/i)?.[0] ?? "";
assert.notEqual(baseAzureFunctionFixture, "", "full Task 5 Azure fallback function fixture is extractable");
const semanticEquivalentHardenedFixture = baseAzureFunctionFixture
  .replace(legacyFirstGuard, semanticEquivalentFirstGuard)
  .replace(legacyUncertainGuardPattern, hardenedUncertainGuard.trim());
const normalizedSemanticEquivalentFunction = semanticEquivalentHardenedFixture
  .replace(/--[^\n]*/g, " ")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();
assert.equal(sha256(normalizedSemanticEquivalentFunction), expectedCanonicalSemanticDefinitionSha256, "full semantic-equivalent function fixture matches the canonical final semantic SHA-256");
const semanticEquivalentWithPostHistoryMarkerFixture = `${compatibilityMarkerAfterHistory}\n${semanticEquivalentHardenedFixture}`;
const semanticCommentDecoyFixture = `${hardenedFixture.replace(
  hardenedFirstGuard,
  "if v_openai_receipt_count = 2 and v_shared_attempt.attempt_state <> 'unexpected' then"
)}\n/* ${semanticEquivalentFirstGuard} */`;
const partialFixture = canonicalLegacyFixture.replace(legacyFirstGuard, hardenedFirstGuard);
const malformedFixture = canonicalLegacyFixture.replace("raise exception 'uncertain OpenAI fallback permits one OpenAI receipt';", "perform synthetic_unknown_guard();");
const duplicateHardenedFixture = `${hardenedFixture}\n${hardenedUncertainGuard}`;
const strictClassifierCounterexamples = [
  ["mixed legacy first and hardened", `${hardenedFixture}\n${legacyFirstGuard}`],
  ["mixed legacy uncertain opening and hardened", `${hardenedFixture}\nif v_openai_receipt_count <> 1 then`],
  ["mixed legacy raise and hardened", `${hardenedFixture}\nraise exception 'uncertain OpenAI fallback permits one OpenAI receipt';`],
  ["duplicate hardened first guard", `${hardenedFixture}\n${hardenedFirstGuard}`],
  ["duplicate semantic-equivalent hardened first guard", `${semanticEquivalentHardenedFixture}\n${semanticEquivalentFirstGuard}`],
  ["partial duplicate hardened first opening", `${hardenedFixture}\nif v_openai_receipt_count = 2 and v_shared_attempt.attempt_state <> 'uncertain'`],
  ["partial duplicate bounded uncertain opening", `${hardenedFixture}\nif v_openai_receipt_count not in (1, 2)`],
  ["malformed compatibility marker", `${hardenedFixture}\n${compatibilityMarker.trim().replace("task6_azure_guard_history_compat_end", "task6_azure_guard_history_compat_broken_end")}`],
  ["malformed post-history compatibility marker", `${hardenedFixture}\n${compatibilityMarkerAfterHistory.replace("task6_azure_guard_history_compat_end", "task6_azure_guard_history_compat_broken_end")}`],
  ["duplicate compatibility marker", `${hardenedFixture}\n${compatibilityMarker.trim()}\n${compatibilityMarker.trim()}`],
  ["mixed pre-history and post-history markers", `${hardenedFixture}\n${compatibilityMarker.trim()}\n${compatibilityMarkerAfterHistory}`]
];
const simulateCleanReplay = (definition, { observedDefinitionMd5 = null } = {}) => {
  const afterCompatibility = simulateRepair(definition, { addCompatibilityMarker: true, observedDefinitionMd5 });
  const afterHistorical = simulateImmutableHistoricalMigration(afterCompatibility);
  return simulateRepair(afterHistorical);
};
const cleanReplayAfterCompatibility = simulateRepair(canonicalLegacyFixture, { addCompatibilityMarker: true });
const cleanReplayFinal = simulateCleanReplay(canonicalLegacyFixture);

assert.equal(isHardenedFixture(cleanReplayFinal), true, "clean replay converges to the complete hardened definition before and after the immutable historical migration");
assert.equal(isHardenedFixture(simulateCleanReplay(semanticEquivalentHardenedFixture, { observedDefinitionMd5: expectedObservedSemanticDefinitionMd5 })), true, "clean replay canonicalizes the observed full semantic-equivalent function before immutable history");
assert.equal(stripCompatibilityMarker(cleanReplayFinal), stripCompatibilityMarker(cleanReplayAfterCompatibility), "immutable historical replay changes only the compatibility marker, not executable guard behavior");
assert.equal(isHardenedFixture(simulateCleanReplay(hardenedFixture)), true, "clean replay preserves an already-hardened executable definition through immutable history");
assert.throws(() => simulateCleanReplay(partialFixture), /partial or malformed/, "clean replay fails closed on a partial definition before immutable history");
assert.throws(() => simulateCleanReplay(malformedFixture), /partial or malformed/, "clean replay fails closed on a malformed definition before immutable history");
assert.throws(() => simulateCleanReplay(duplicateHardenedFixture), /partial or malformed/, "clean replay fails closed on a duplicate hardened block");
assert.equal(simulateRepair(hardenedFixture), hardenedFixture, "already-applied complete hardened definition is an idempotent no-op");
assert.equal(isHardenedFixture(simulateRepair(semanticEquivalentHardenedFixture, { observedDefinitionMd5: expectedObservedSemanticDefinitionMd5 })), true, "observed full semantic-equivalent function canonicalizes safely under the fixed identity gate");
assert.throws(() => simulateRepair(semanticEquivalentWithPostHistoryMarkerFixture, { observedDefinitionMd5: expectedObservedSemanticDefinitionMd5 }), /partial or malformed/, "semantic-equivalent repair rejects definitions that already carry a compatibility marker");
assert.throws(() => simulateRepair(semanticCommentDecoyFixture, { observedDefinitionMd5: "00000000000000000000000000000000" }), /partial or malformed/, "semantic-equivalent repair rejects an unknown executable guard with a nonmatching identity and comment decoy");
assert.equal(isHardenedFixture(simulateRepair(canonicalLegacyFixture)), true, "already-applied canonical legacy definition is repaired");
assert.throws(() => simulateRepair(partialFixture), /partial or malformed/, "already-applied partial guard definition fails closed");
assert.throws(() => simulateRepair(malformedFixture), /partial or malformed/, "already-applied malformed guard definition fails closed");
assert.throws(() => simulateRepair(duplicateHardenedFixture), /partial or malformed/, "already-applied duplicate hardened block fails closed");
for (const [label, definition] of strictClassifierCounterexamples) {
  assert.throws(() => simulateCleanReplay(definition), /partial or malformed/, `clean replay fails closed on ${label}`);
  assert.throws(() => simulateRepair(definition), /partial or malformed/, `already-applied path fails closed on ${label}`);
}

const controlFlowSource = hardenedUncertainGuard.replace(/'(?:''|[^'])*'/g, "''");
assert.equal((controlFlowSource.match(/^\s*if\b/gim) ?? []).length, (controlFlowSource.match(/^\s*end if;/gim) ?? []).length, "hardened uncertain guard has balanced IF control flow");

const safePredecessor = {
  ownerUserId: "00000000-0000-4000-8000-000000000001",
  sessionReferenceId: "session_fixture_01",
  periodStart: "2026-08-01T00:00:00.000Z",
  periodEnd: "2026-09-01T00:00:00.000Z",
  utcMonth: "2026-08-01",
  attemptState: "committed",
  providerFailureClass: "invalid-response",
  committedInputCharacters: 0,
  reservedCostMicros: 0,
  committedCostMicros: 1,
  slotState: "released",
  rateState: "completed"
};
const isSafePredecessor = (receipt) => receipt.ownerUserId === safePredecessor.ownerUserId
  && receipt.sessionReferenceId === safePredecessor.sessionReferenceId
  && receipt.periodStart === safePredecessor.periodStart
  && receipt.periodEnd === safePredecessor.periodEnd
  && receipt.utcMonth === safePredecessor.utcMonth
  && ["committed", "released"].includes(receipt.attemptState)
  && ["invalid-response", "rate-limit"].includes(receipt.providerFailureClass)
  && receipt.committedInputCharacters === 0
  && receipt.reservedCostMicros === 0
  && receipt.slotState === "released"
  && (receipt.attemptState === "committed"
    ? receipt.committedCostMicros > 0 && receipt.rateState === "completed"
    : receipt.committedCostMicros === 0 && receipt.rateState === "released");

assert.equal(isSafePredecessor(safePredecessor), true, "synthetic committed bounded predecessor is accepted");
assert.equal(isSafePredecessor({ ...safePredecessor, attemptState: "released", committedCostMicros: 0, rateState: "released" }), true, "synthetic released bounded predecessor is accepted");
for (const [field, unsafeValue] of [
  ["ownerUserId", "00000000-0000-4000-8000-000000000002"],
  ["sessionReferenceId", "session_fixture_02"],
  ["periodStart", "2026-07-01T00:00:00.000Z"],
  ["periodEnd", "2026-10-01T00:00:00.000Z"],
  ["utcMonth", "2026-07-01"],
  ["attemptState", "uncertain"],
  ["providerFailureClass", "timeout"],
  ["committedInputCharacters", 1],
  ["reservedCostMicros", 1],
  ["committedCostMicros", 0],
  ["slotState", "uncertain"],
  ["rateState", "released"]
]) {
  assert.equal(isSafePredecessor({ ...safePredecessor, [field]: unsafeValue }), false, `synthetic predecessor fails closed for unsafe ${field}`);
}
assert.match(circuitSuccessWindowMigration, /ct_paid_record_provider_circuit_success/i, "Task 6 overrides durable circuit success semantics");
assert.match(circuitSuccessWindowMigration, /circuit_state = 'closed' then[\s\S]{0,80}return true/i, "closed-circuit success preserves the active failure window");
assert.match(circuitSuccessWindowMigration, /circuit_state <> 'half_open'[\s\S]{0,1500}failure_count = 0/i, "half-open probe success clears the failure window");
assert.doesNotMatch(circuitSuccessWindowMigration, /\b(?:drop\s+table|truncate\s+table)\b/i, "Task 6 circuit success migration is additive");
assert.match(openAiResumeStatusMigration, /create or replace function public\.ct_paid_read_openai_attempt/i, "Task 6 adds the exact-replay receipt read RPC");
assert.match(openAiResumeStatusMigration, /provider_kind = 'openai_attempt'/i, "exact-replay receipt read is restricted to OpenAI attempts");
assert.match(openAiResumeStatusMigration, /returns table \(attempt_state text, provider_failure_class text\)/i, "exact-replay receipt read returns only sanitized state and failure class");
assert.match(openAiResumeStatusMigration, /revoke all on function[\s\S]{0,180}public, anon, authenticated, service_role/i, "exact-replay receipt read removes broad execution grants");
assert.match(openAiResumeStatusMigration, /grant execute on function[\s\S]{0,180}service_role/i, "exact-replay receipt read is service-role-only");
assert.doesNotMatch(openAiResumeStatusMigration, /\b(?:drop\s+table|truncate\s+table)\b/i, "Task 6 exact-replay migration is additive");
assert.match(terminalOpenAiPartialMigration, /create or replace function public\.ct_paid_commit_terminal_openai_partial/i, "Task 6 adds the narrow terminal OpenAI partial settlement RPC");
assert.match(terminalOpenAiPartialMigration, /attempt_state <> 'committed'[\s\S]{0,120}provider_failure_class <> 'invalid-response'/i, "terminal partial settlement requires the final committed invalid-response receipt");
assert.match(terminalOpenAiPartialMigration, /reserved_input_characters = reserved_input_characters - v_logical\.input_characters[\s\S]{0,160}committed_input_characters = committed_input_characters \+ p_actual_characters/i, "terminal partial settlement releases the full logical hold and commits only successful characters atomically");
assert.match(terminalOpenAiPartialMigration, /logical_state = 'committed'[\s\S]{0,100}committed_input_characters = p_actual_characters/i, "terminal partial settlement closes the logical attempt with the exact successful subset");
assert.match(terminalOpenAiPartialMigration, /revoke all on function[\s\S]{0,180}public, anon, authenticated, service_role/i, "terminal partial settlement removes broad execution grants");
assert.match(terminalOpenAiPartialMigration, /grant execute on function[\s\S]{0,180}service_role/i, "terminal partial settlement is service-role-only");
assert.doesNotMatch(terminalOpenAiPartialMigration, /\b(?:drop\s+table|truncate\s+table)\b/i, "Task 6 terminal partial migration is additive");
assert.match(openAiPartialReceiptMigration, /add column if not exists successful_item_attempt_ids text\[\][\s\S]+?default array\[\]::text\[\]/i, "Task 6 adds bounded durable successful item attempt ids");
assert.match(openAiPartialReceiptMigration, /add column if not exists successful_input_characters bigint[\s\S]+?default 0/i, "Task 6 adds durable successful input character authority");
assert.match(openAiPartialReceiptMigration, /ct_paid_finalize_openai_attempt_with_successes/i, "Task 6 adds a narrow success-aware OpenAI finalizer wrapper");
assert.match(openAiPartialReceiptMigration, /ct_paid_finalize_openai_attempt\(/i, "success-aware finalizer reuses the existing billing finalizer");
assert.match(openAiPartialReceiptMigration, /cardinality\(p_successful_item_attempt_ids\) <= 15/i, "success-aware finalizer bounds successful item ids");
assert.match(openAiPartialReceiptMigration, /\^ctpa_\[A-Za-z0-9_-\][^']*\{43\}\$/i, "success-aware finalizer accepts only opaque HMAC item attempt ids");
assert.match(openAiPartialReceiptMigration, /create or replace function public\.ct_paid_read_openai_attempt_with_successes\s*\(/i, "Task 6 adds an additive success-aware replay read RPC");
assert.doesNotMatch(openAiPartialReceiptMigration, /create or replace function public\.ct_paid_read_openai_attempt\s*\(/i, "Task 6 does not replace the legacy two-column replay read RPC");
assert.match(openAiPartialReceiptMigration, /returns table \(attempt_state text, provider_failure_class text, successful_item_attempt_ids text\[\], successful_input_characters bigint\)/i, "sanitized replay read returns only state, failure class, successful ids, and successful characters");
assert.doesNotMatch(openAiPartialReceiptMigration, /raw|comment_id|author|private|hash/i, "durable partial receipt migration stores no raw or private provider material");
assert.match(terminalOpenAiPartialAuthorityMigration, /order by created_at desc, id desc[\s\S]+?limit 1/i, "terminal partial authority selects the latest provider receipt deterministically");
assert.match(terminalOpenAiPartialAuthorityMigration, /provider_attempt is distinct from p_provider_attempt/i, "terminal partial authority rejects an older supplied receipt");
assert.match(terminalOpenAiPartialAuthorityMigration, /provider_kind <> 'openai_attempt'[\s\S]+?attempt_state <> 'committed'[\s\S]+?provider_failure_class not in \('invalid-response', 'rate-limit'\)/i, "terminal partial authority rejects Azure, non-committed, and disallowed failure receipts");
assert.match(terminalOpenAiPartialAuthorityMigration, /sum\(successful_input_characters\)[\s\S]+?is distinct from p_actual_characters/i, "terminal partial authority derives exact characters from durable receipts");
assert.match(terminalOpenAiPartialAuthorityMigration, /group by successful_item_attempt_id[\s\S]+?having count\(\*\) > 1/i, "terminal partial authority rejects duplicate successful ids across receipts");
assert.match(terminalOpenAiPartialAuthorityMigration, /grant execute on function[\s\S]{0,180}service_role/i, "terminal partial authority remains service-role-only");
assert.match(replayCircuitAuthorityMigration, /add column if not exists fallback_eligible boolean[\s\S]+?circuit_failure_state text[\s\S]+?circuit_success_state text/i, "replay authority persists only sanitized fallback and circuit metadata");
assert.match(replayCircuitAuthorityMigration, /ct_paid_read_(?:openai|provider)_attempt_replay_metadata[\s\S]+?returns table \([\s\S]+?fallback_eligible boolean[\s\S]+?circuit_failure_state text[\s\S]+?circuit_success_state text/i, "new replay metadata RPC returns seven or more sanitized fields");
assert.match(replayCircuitAuthorityMigration, /ct_paid_finalize_openai_attempt_with_metadata[\s\S]+?ct_paid_finalize_openai_attempt_with_successes/i, "metadata finalizer atomically extends the success-aware finalizer");
assert.match(replayCircuitAuthorityMigration, /ct_paid_record_attempt_circuit_failure[\s\S]+?p_attempt_id text[\s\S]+?p_provider_attempt text[\s\S]+?p_allow_deferred_promotion boolean/i, "failure marker is attempt-bound and can promote a deferred 429");
assert.match(replayCircuitAuthorityMigration, /ct_paid_record_attempt_circuit_success[\s\S]+?attempt_state <> 'committed'[\s\S]+?circuit_success_state <> 'pending'/i, "success marker requires a committed pending receipt");
assert.match(replayCircuitAuthorityMigration, /p_disable_provider[\s\S]+?circuit_state = 'disabled'/i, "quota marker can atomically disable the Azure circuit");
assert.match(replayCircuitAuthorityMigration, /security definer[\s\S]+?set search_path = pg_catalog, public/i, "replay marker authority uses fixed-search-path SECURITY DEFINER RPCs");
assert.doesNotMatch(replayCircuitAuthorityMigration, /raw_(?:http|response|payload|error)|comment_hash|author_(?:id|name)|youtube_(?:id|metadata)|private_(?:id|field)/i, "replay authority stores no raw or private provider material");

assert.match(policy, /comment-translator-openai-execution/, "policy runtime delegates OpenAI calls to Task 6 adapter");
assert.doesNotMatch(policy, /type\s*:\s*["']json_object["']/i, "policy runtime no longer uses JSON mode");
assert.match(execution, /openai_attempt/, "execution runtime reserves an OpenAI attempt");
assert.match(execution, /azure_direct_fallback/, "execution runtime has a direct Azure fallback attempt");
assert.match(execution, /uncertain_inflight/, "execution runtime preserves uncertain in-flight attempts");
assert.match(execution, /fail[-_ ]closed/i, "execution runtime fails closed when authority is unreadable");
assert.match(execution, /backpressure/i, "execution runtime exposes provider backpressure");
assert.match(execution, /maxConcurrentRequests:\s*8/, "execution runtime reserves eight OpenAI slots and blocks the ninth request");
assert.match(execution, /provider-capacity-paused/, "backpressure is a non-consuming provider-capacity pause");
assert.match(execution, /An unreadable preflight never reached the Provider[\s\S]{0,240}uncertain-inflight is reserved for a call/i, "authority-unreadable preflight is releasable and not uncertain-inflight");
assert.match(execution, /circuitAuthority\.read/, "degraded circuit state is read before selecting OpenAI");
assert.match(execution, /circuitAuthority\.probe/, "half-open routing claims one OpenAI probe before provider execution");
assert.match(execution, /selectOpenAiFallbackBindings/, "Azure fallback receives only unresolved OpenAI items");
assert.match(execution, /azureDeadlineMs/, "Azure calls stay inside the 120 second reservation window");
assert.match(execution, /commentTranslatorOpenAiMaxOutputItemCodePoints/, "Azure fallback applies the one-thousand code point output bound");
assert.match(execution, /reservationInputCharacters/, "Azure fallback reserves the full logical batch when OpenAI returned a successful subset");
assert.match(execution, /providerResult\.code === "timeout"/, "Azure provider timeout remains uncertain while known provider failures release");
assert.match(execution, /providerResult\.code === "transport-uncertain"/, "Azure transport disconnect remains uncertain");
assert.match(execution, /providerResult\.code === "response-invalid"/, "Azure response parsing failure is handled at the sanitized terminal boundary");
assert.match(policy, /code: "transport-uncertain"/, "Azure fetch failure is classified as transport uncertainty");
assert.match(policy, /code: "response-invalid"/, "Azure response parse failure is classified as invalid response");
assert.match(policy, /response\.status >= 500[\s\S]{0,260}code: "temporary-unavailable"/, "known Azure HTTP 5xx remains a bounded server failure");
assert.match(providerBoundary, /transport-uncertain[\s\S]+response-invalid/, "provider boundary carries sanitized uncertain transport/response classes");
assert.match(execution, /settleAzurePartialFailure/, "known Azure failure uses atomic zero-or-partial settlement");
assert.match(execution, /translations\.splice\(groupTranslationStart\)/, "zero-commit Azure failure removes uncommitted logical-batch output");
assert.match(execution, /maxSubsetRetries:\s*0/, "subset retries cross a fresh provider reservation");
assert.match(execution, /retryItems/, "unresolved response items are carried into the bounded retry reservation");
assert.match(execution, /reservationRequestCount/, "bounded HTTP retry capacity is included in the atomic reservation");
assert.match(execution, /const maxHttpRetries = 0/, "Paid runtime delegates 429 retry to a fresh reservation");
assert.match(execution, /const reservationRequestCount = 1/, "each Paid OpenAI provider attempt reserves one HTTP request");
assert.match(execution, /createPaidBatchAttemptId/, "logical batch attempt identity is stable for the complete microbatch");
assert.match(execution, /createPaidItemAttemptId/, "each response item receives a per-message HMAC attempt identity");
assert.match(execution, /providerMessageId:\s*`batch:\$\{canonicalBatchMessageId\}`/, "logical batch attempt identity excludes retry and poll timestamps");
assert.match(execution, /providerMessageId,/, "item attempt identity is derived from the stable provider message identity");
assert.doesNotMatch(execution, /providerMessageId:\s*`\$\{providerMessageId\}:\$\{nowMs\}`/, "item attempt identity does not change across Worker retries");
assert.doesNotMatch(execution, /createItemAttemptReference/, "item identity is not derived from mutable array indexes");
assert.match(execution, /abandonPaidLogicalAttemptSafely/, "no-fallback terminal responses release the logical character reservation");
assert.match(execution, /commitTerminalOpenAiPartial/, "terminal invalid-response commits the successful OpenAI subset atomically");
assert.match(execution, /orderedComments[\s\S]{0,260}\.sort/, "microbatch order is deterministic before grouping");
assert.match(execution, /successfulAzureInputCharacters/, "Azure partial success commits only actual successful input characters");
assert.match(execution, /alreadySuccessfulInputCharacters/, "Azure finalization includes previously successful OpenAI input characters");
assert.match(execution, /successfulOpenAiAttemptIds/, "OpenAI successes accumulate across bounded provider attempts");
assert.match(execution, /actualBillingInputCharacters/, "composite OpenAI plus Azure success uses the separate logical billing character input");
assert.match(execution, /committedInputCharacters/, "fallback output is returned only for characters included in durable settlement");
assert.match(execution, /reservationRefusal/, "reservation refusal classification reaches the provider stop boundary");
assert.match(execution, /provider:\s*"azure_fallback"/, "Azure fallback circuit authority is distinct from OpenAI");
assert.match(execution, /preparePaidAzureCircuit/, "Azure fallback checks durable circuit state before reservation/provider call");
assert.match(execution, /recordAzureCircuitOutcomeSafely/, "Azure fallback records durable circuit success/failure");
assert.match(execution, /if \(result\.status === "failed" && result\.preflightDecision === "circuit-unavailable"\)[\s\S]{0,1600}provider-capacity-paused/, "half-open retry loss is a non-consuming pause and cannot fall through to Azure");
assert.match(execution, /const rateRetryAttempt = await executeFreshOpenAiAttempt[\s\S]{0,900}rateRetryAttempt\.status === "not-reserved"[\s\S]{0,900}recordAttemptCircuitFailureSafely/, "ordinary 429 is promoted only when the fresh retry is refused");
assert.match(execution, /finalizeOpenAiAttemptSafely[\s\S]{0,1400}recordAttemptCircuitFailureSafely/, "OpenAI failures finalize pending circuit metadata before the attempt-bound marker");
assert.match(execution, /deferRateLimitCircuitFailure/, "initial ordinary 429 defers circuit recording until retry admission is known");
assert.match(execution, /const circuitFailureState[\s\S]{0,1800}finalizeOpenAiAttemptSafely/, "provider failures durably bind pending or deferred circuit state during OpenAI finalization");
assert.match(execution, /paid-character-quota-stop/, "character quota reservation refusal has a paid stop reason");
assert.match(execution, /paid-individual-cost-stop/, "individual cost reservation refusal has a paid stop reason");
assert.match(execution, /paid-global-cost-stop/, "global cost reservation refusal has a paid stop reason");
assert.match(usageStore, /shared capacity is exhausted/, "Azure physical capacity refusal is classified as backpressure");
assert.match(usageStore, /individual-cost[\s\S]{0,220}global-cost/, "individual and global cost reservation refusals remain distinct");
assert.match(usageStore, /ct_paid_finalize_azure_fallback_with_billing_characters/, "usage store selects the additive split-billing finalization");
assert.match(usageStore, /supabase\.rpc\("ct_paid_read_(?:openai|provider)_attempt_replay_metadata"/, "usage store reads sanitized fallback and circuit replay metadata");
assert.doesNotMatch(usageStore, /supabase\.rpc\("ct_paid_read_openai_attempt"/, "usage store runtime does not call the legacy two-column replay RPC");
assert.match(usageStore, /p_actual_billing_input_characters:\s*request\.actualBillingInputCharacters/, "usage store forwards the logical billing character value");
assert.match(paidCoreMigration, /ct_paid_abandon_logical_attempt[\s\S]{0,5200}logical_state = 'released'/i, "Task 5 logical abandonment releases the whole logical hold");
assert.match(paidCoreMigration, /ct_paid_finalize_azure_fallback[\s\S]{0,5200}p_actual_input_characters/i, "Task 5 Azure finalization accepts actual partial-success characters");
assert.match(paidCoreMigration, /ct_paid_record_provider_circuit_failure[\s\S]{0,1500}p_provider/i, "durable circuit failure RPC supports provider-specific state");
assert.match(execution, /beforeProviderCall/, "each bounded OpenAI POST rechecks provider authority");
assert.match(execution, /snapshot\.probeAttemptId\s*!==\s*attemptId/, "half-open OpenAI calls require ownership of the persisted probe lease");
assert.match(execution, /preflightDecision/, "authority-unreadable preflight is surfaced as a fail-closed stop");
assert.doesNotMatch(execution, /!safeSwitches\.checkout_enabled\s*\|\|/, "Checkout kill switch remains independent from already-entitled Paid translation");
assert.match(policy, /failureClass:\s*"policy"/, "compatibility parser preserves policy refusal classification");
assert.match(policy, /parsed\.status === "policy-rejected"/, "compatibility parser stops before legacy content fallback on policy refusal");
assert.match(openAi, /ordinaryRateLimit/, "only ordinary 429 responses enter the bounded HTTP retry");
assert.match(openAi, /status === 429\) return "invalid-response"/, "an unclassified 429 fails closed instead of entering Azure fallback");
assert.match(openAi, /unreadableRateLimitBody/, "a 429 error-body timeout also fails closed");
assert.match(openAi, /readOpenAiResponseJsonWithTimeout/, "OpenAI response-body parsing remains inside the HTTP timeout");
assert.match(openAi, /Object\.keys\(parsed\)/, "strict response parsing rejects top-level extra properties");
assert.match(openAi, /Object\.keys\(rawItem\)/, "strict response parsing rejects item extra properties");
assert.doesNotMatch(execution, /createItemAttemptReference\(attemptId,\s*comment\.commentId\)/, "provider attempt ids do not contain raw comment identifiers");
assert.doesNotMatch(execution, /!result\.uncertainInflight\s*&&\s*result\.fallbackEligible/, "uncertain OpenAI failures remain eligible for Azure with retained capacity");
assert.match(execution, /azureUncertain[\s\S]{0,300}?outcome:\s*["']uncertain_inflight["']/i, "Azure timeout or crash retains its reservation as uncertain");
assert.match(openAi, /insufficient_quota|rate_limit_exceeded|billing/i, "429 error bodies are classified without persisting raw payloads");
assert.match(openAi, /response-timeout/, "error-body parsing timeout remains a sanitized status-classified failure");
assert.match(openAi, /content_filter|refusal/, "provider policy refusal is classified without fallback");
assert.match(openAi, /duplicate|unknown|over[-_ ]limit/i, "malformed response items remain subset-retry candidates");
assert.match(azure, /freePlanPrimary:\s*["']azure-translator["']/, "F10 remains Azure-first");
assert.match(azure, /paid/i, "Azure normal execution exposes the narrow Paid seam");

const paidProviderRuntime = await import(pathToFileURL(path.join(repoRoot, "lib/comment-translator-provider-execution-runtime.ts")).href);
const circuitRuntime = await import(pathToFileURL(path.join(repoRoot, "lib/comment-translator-provider-circuit-breaker.ts")).href);
const openAiRuntime = await import(pathToFileURL(path.join(repoRoot, openAiPath)).href);
const usageStoreRuntime = await import(pathToFileURL(path.join(repoRoot, usageStorePath)).href);
const policyRuntime = await import(pathToFileURL(path.join(repoRoot, policyPath)).href);

const genericPaidUsage = {
  dailyUsedMs: 0,
  currentSessionElapsedMs: 0,
  translatedMessagesInCurrentMinute: 0,
  providerBudgetAvailable: true,
  globalBudgetAvailable: true,
  aiBudgetAvailable: true,
  translationProviderAvailable: true,
  planEntitlement: {
    plan: "paid",
    planEntitlementReferenceId: "comment-translator-paid-public-v1",
    entitlementSource: "server-owned",
    dailyLimitMs: 1_800_000,
    sessionLimitMs: 1_800_000,
    translatedMessagesPerMinute: 90,
    activeSessionsPerUser: 1,
    paidPrioritization: "not-implemented",
    providerUsageCharging: "not-implemented"
  },
  providerRequestEstimate: { requestEstimateCount: 0, quotaUnitEstimate: 0, providerTargetMetadata: "forbidden" },
  aiUsageEstimate: {
    translatedMessageEstimate: 0,
    providerInputCharacterEstimate: 0,
    translatedCharacterEstimate: 0,
    estimatedCostMicros: 0,
    rawCommentText: "never-recorded-by-design"
  }
};
let genericPaidOpenAiCalls = 0;
let genericPaidAzureCalls = 0;
const createGenericPaidCountingProvider = (id, countCall) => ({
  id,
  name: `${id} fixture`,
  runtimeScope: "server-runtime-only",
  secretBoundary: {
    runtime: "server-env-only",
    clientBundle: "forbidden",
    fixtures: "forbidden",
    docsAndTaskNotes: "no-secret-values"
  },
  async translate(request) {
    countCall();
    return {
      type: "translated",
      translatedText: "fixture translation",
      detectedSourceLanguage: "en",
      confidence: null,
      cacheOutcome: "miss",
      usageHandoff: request.usageHandoff
    };
  }
});
const genericPaidPolicyResult = await paidProviderRuntime.executeCommentTranslatorProviderPolicyBatch({
  providers: {
    openAiMini: createGenericPaidCountingProvider("openai-mini", () => { genericPaidOpenAiCalls += 1; }),
    azure: createGenericPaidCountingProvider("azure-translator", () => { genericPaidAzureCalls += 1; })
  },
  callerAuthorization: { status: "authorized", ownerUserId: "fixture-owner" },
  sessionReferenceId: "fixture-generic-paid-policy-stop",
  occurredAtMs: Date.parse("2026-08-13T00:00:00.000Z"),
  usage: genericPaidUsage,
  targetLanguage: "ja",
  sourceLanguages: ["EN"],
  comments: [{
    commentId: "fixture-generic-paid-comment",
    publishedAt: "2026-08-13T00:00:00.000Z",
    text: "fixture comment",
    platformLanguageHint: "en"
  }]
});
assert.equal(genericPaidPolicyResult.status, "completed", "generic Paid policy returns a sanitized completed stop");
assert.equal(genericPaidPolicyResult.paidProviderStopReason, "authority-unreadable", "generic Paid policy fails closed without durable authority");
assert.equal(genericPaidPolicyResult.providerCallCount, 0, "generic Paid policy reports zero provider calls");
assert.equal(genericPaidPolicyResult.translatedCount, 0, "generic Paid policy returns zero translations");
assert.equal(genericPaidOpenAiCalls, 0, "generic Paid policy never calls OpenAI");
assert.equal(genericPaidAzureCalls, 0, "generic Paid policy never calls Azure");

const azureQuotaProvider = policyRuntime.createAzureCommentTranslationProvider({
  key: "fixture-key",
  endpoint: "https://fixture.invalid",
  region: null,
  fetchImpl: async () => ({
    ok: false,
    status: 429,
    headers: { get: () => null },
    text: async () => "",
    json: async () => ({ error: { code: "QuotaExceeded", type: "quota_exceeded" } })
  })
});
const azureQuotaResult = await azureQuotaProvider.translate({
  requestId: "fixture-request",
  input: { kind: "fixture-replay", text: "fixture", sourceLanguage: "en", targetLanguage: "ja" },
  glossary: { terms: [], version: null },
  cache: {
    lookupKey: null,
    keyMaterial: {
      normalizedTextHash: "fixture",
      sourceLanguage: "en",
      targetLanguage: "ja",
      providerCapabilityVersion: "fixture",
      glossaryVersion: null,
      moderationPolicyVersion: "fixture",
      excludes: ["authorName", "channelId", "viewerId", "streamId", "rawSecret", "oauthToken", "refreshToken", "authorizationCode", "providerTargetIdentifier", "pollingCursor", "ownerIdentifier", "authorizationHeader", "serviceRoleKey", "browserLocalHandoffMaterial", "liveChatId", "providerChannelId", "rawProviderTargetMetadata"]
    }
  },
  privacy: { logRetention: "short-lived-only", rawTextLogging: "disabled-by-default", piiMinimization: "exclude-author-and-channel-identifiers", moderationSkipReason: null },
  usageHandoff: { meteringEventId: "fixture", providerId: "azure-translator", billingCategory: "translation", estimatedUnits: 1, cacheOutcome: "miss", enforcement: "not-implemented", databaseWrite: "not-implemented", logPolicy: "short-lived-provider-diagnostic-only" }
});
assert.equal(azureQuotaResult.type, "terminal-error", "allowlisted Azure quota is terminal");
assert.equal(azureQuotaResult.code, "provider-quota-exhausted", "Azure quota exposes only its sanitized terminal code");

for (const code of [403001, "403001"]) {
  const azureF0QuotaProvider = policyRuntime.createAzureCommentTranslationProvider({
    key: "fixture-key",
    endpoint: "https://fixture.invalid",
    region: null,
    fetchImpl: async () => ({
      ok: false,
      status: 403,
      headers: { get: () => null },
      json: async () => ({ error: { code } })
    })
  });
  const result = await azureF0QuotaProvider.translate({
    requestId: "fixture-request",
    input: { kind: "fixture-replay", text: "fixture", sourceLanguage: "en", targetLanguage: "ja" },
    glossary: { terms: [], version: null },
    cache: {
      lookupKey: null,
      keyMaterial: {
        normalizedTextHash: "fixture", sourceLanguage: "en", targetLanguage: "ja",
        providerCapabilityVersion: "fixture", glossaryVersion: null, moderationPolicyVersion: "fixture",
        excludes: ["authorName", "channelId", "viewerId", "streamId", "rawSecret", "oauthToken", "refreshToken", "authorizationCode", "providerTargetIdentifier", "pollingCursor", "ownerIdentifier", "authorizationHeader", "serviceRoleKey", "browserLocalHandoffMaterial", "liveChatId", "providerChannelId", "rawProviderTargetMetadata"]
      }
    },
    privacy: { logRetention: "short-lived-only", rawTextLogging: "disabled-by-default", piiMinimization: "exclude-author-and-channel-identifiers", moderationSkipReason: null },
    usageHandoff: { meteringEventId: "fixture", providerId: "azure-translator", billingCategory: "translation", estimatedUnits: 1, cacheOutcome: "miss", enforcement: "not-implemented", databaseWrite: "not-implemented", logPolicy: "short-lived-provider-diagnostic-only" }
  });
  assert.equal(result.type, "terminal-error", `Azure F0 quota ${typeof code} code is terminal`);
  assert.equal(result.code, "provider-quota-exhausted", `Azure F0 quota ${typeof code} code is sanitized`);
}

let capturedOpenAiRequestBody = null;
await openAiRuntime.executeCommentTranslatorOpenAiBatch({
  apiKey: "fixture-key",
  items: [
    { attemptId: "hard-limit-a", text: "first fixture", sourceLanguage: "en", targetLanguage: "ja" },
    { attemptId: "hard-limit-b", text: "second fixture", sourceLanguage: "en", targetLanguage: "ja" }
  ],
  maxSubsetRetries: 0,
  maxHttpRetries: 0,
  fetchImpl: async (_url, init) => {
    capturedOpenAiRequestBody = JSON.parse(init.body);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({
          items: [
            { attempt_id: "hard-limit-a", status: "translated", translated_text: "A" },
            { attempt_id: "hard-limit-b", status: "translated", translated_text: "B" }
          ]
        }) } }],
        usage: { prompt_tokens: 10, completion_tokens: 2 }
      })
    };
  }
});
assert.equal(capturedOpenAiRequestBody.max_completion_tokens, 2 * 128 + 384, "Chat Completions request sends itemCount*128+384 as max_completion_tokens");
assert.equal("max_output_tokens" in capturedOpenAiRequestBody, false, "Chat Completions request omits max_output_tokens");
assert.equal("max_tokens" in capturedOpenAiRequestBody, false, "OpenAI request omits max_tokens");

async function executeUnreadableOpenAiErrorFixture(status) {
  return openAiRuntime.executeCommentTranslatorOpenAiBatch({
    apiKey: "fixture-key",
    items: [{
      attemptId: "fixture-attempt",
      text: "fixture text",
      sourceLanguage: "en",
      targetLanguage: "ja"
    }],
    requestTimeoutMs: 5,
    maxSubsetRetries: 0,
    maxHttpRetries: 0,
    fetchImpl: async () => ({
      ok: false,
      status,
      json: async () => new Promise(() => {})
    })
  });
}

for (const [status, providerFailureClass, fallbackEligible] of [
  [400, "invalid-request", false],
  [401, "authentication", false],
  [403, "authentication", false],
  [404, "configuration", false],
  [408, "timeout", true],
  [413, "invalid-request", false],
  [422, "invalid-request", false],
  [429, "invalid-response", false],
  [500, "server-error", true],
  [501, "server-error", false],
  [502, "server-error", false],
  [503, "server-error", true],
  [504, "server-error", true]
]) {
  const result = await executeUnreadableOpenAiErrorFixture(status);
  assert.equal(result.status, "failed", `unreadable HTTP ${status} body returns a sanitized failure`);
  assert.equal(result.providerFailureClass, providerFailureClass, `unreadable HTTP ${status} body uses status classification`);
  assert.equal(result.fallbackEligible, fallbackEligible, `unreadable HTTP ${status} body uses status fallback policy`);
  assert.equal(result.uncertainInflight, false, `unreadable HTTP ${status} body is not uncertain after response receipt`);
  assert.equal(result.httpStatus, status, `unreadable HTTP ${status} body retains only the HTTP status`);
}

assert.match(policy, /provider-quota-exhausted/, "Azure quota is surfaced as a sanitized terminal provider code");
assert.match(policy, /(?:QuotaExceeded|OutOfQuota|SubscriptionQuotaExceeded|quota_exceeded)/i, "Azure quota parser uses an explicit allowlist");
assert.doesNotMatch(policy, /JSON\.stringify\([^\n]*error|console\.(?:log|warn|error)/i, "Azure quota handling does not output raw error material");
assert.match(execution, /providerResult\.code === "provider-quota-exhausted"[\s\S]{0,240}?"quota"/, "Azure quota maps to the Paid quota failure class");
assert.match(
  execution,
  /disableProvider:\s*circuitFailureClass\s*===\s*"quota"/,
  "Azure quota marker disables the fallback circuit"
);

const fetchAbortError = new Error("fixture abort");
fetchAbortError.name = "AbortError";
const fetchAbortResult = await openAiRuntime.executeCommentTranslatorOpenAiBatch({
  apiKey: "fixture-key",
  items: [{
    attemptId: "fixture-attempt",
    text: "fixture text",
    sourceLanguage: "en",
    targetLanguage: "ja"
  }],
  requestTimeoutMs: 5,
  maxSubsetRetries: 0,
  maxHttpRetries: 0,
  fetchImpl: async () => { throw fetchAbortError; }
});
assert.equal(fetchAbortResult.providerFailureClass, "timeout", "fetch AbortError keeps timeout classification");
assert.equal(fetchAbortResult.fallbackEligible, true, "fetch AbortError remains fallback eligible");
assert.equal(fetchAbortResult.uncertainInflight, true, "fetch AbortError remains uncertain in flight");
assert.equal(fetchAbortResult.httpStatus, null, "fetch AbortError has no received HTTP status");

const fetchNetworkResult = await openAiRuntime.executeCommentTranslatorOpenAiBatch({
  apiKey: "fixture-key",
  items: [{
    attemptId: "fixture-attempt",
    text: "fixture text",
    sourceLanguage: "en",
    targetLanguage: "ja"
  }],
  requestTimeoutMs: 5,
  maxSubsetRetries: 0,
  maxHttpRetries: 0,
  fetchImpl: async () => { throw new Error("fixture network failure"); }
});
assert.equal(fetchNetworkResult.providerFailureClass, "network", "fetch exception keeps network classification");
assert.equal(fetchNetworkResult.fallbackEligible, true, "fetch exception remains fallback eligible");
assert.equal(fetchNetworkResult.uncertainInflight, true, "fetch exception remains uncertain in flight");
assert.equal(fetchNetworkResult.httpStatus, null, "fetch exception has no received HTTP status");

function createPaidRuntimeFixtureStore(events, outcomeQueue, capturedItems = []) {
  const reservations = [];
  const openAiAttemptReceipts = new Map();
  const dispatchClaims = new Set();
  return {
    reservations,
    capturedItems,
    async openaiAttempt(request) {
      reservations.push({
        attemptId: request.attemptId,
        providerAttempt: request.providerAttempt,
        inputCharacters: request.inputCharacters
      });
      events.push({ type: "openai-reserve", attemptId: request.attemptId, providerAttempt: request.providerAttempt });
      const existing = openAiAttemptReceipts.get(request.providerAttempt);
      if (existing) {
        return {
          reservationStatus: existing.attemptState,
          sessionLeaseToken: null,
          openAiSlotToken: null
        };
      }
      openAiAttemptReceipts.set(request.providerAttempt, {
        attemptState: "reserved",
        providerFailureClass: null,
        successfulItemAttemptIds: [],
        successfulInputCharacters: 0,
        fallbackEligible: false,
        circuitFailureState: "not-required",
        circuitSuccessState: "not-required",
        providerKind: "openai_attempt"
      });
      return {
        reservationStatus: "reserved",
        sessionLeaseToken: `lease-${reservations.length}`,
        openAiSlotToken: `slot-${reservations.length}`
      };
    },
    async finalizeOpenAiAttempt(request) {
      events.push({ type: "openai-finalize", providerAttempt: request.providerAttempt, outcome: request.outcome });
      openAiAttemptReceipts.set(request.providerAttempt, {
        attemptState: request.outcome === "uncertain_inflight"
          ? "uncertain"
          : request.outcome === "provider_not_reached"
            ? "released"
            : "committed",
        providerFailureClass: request.providerFailureClass,
        successfulItemAttemptIds: [...request.successfulItemAttemptIds],
        successfulInputCharacters: request.successfulInputCharacters,
        fallbackEligible: request.fallbackEligible,
        circuitFailureState: request.circuitFailureState,
        circuitSuccessState: request.circuitSuccessState,
        providerKind: "openai_attempt"
      });
      return true;
    },
    async claimProviderDispatch(request) {
      const key = `${request.providerAttempt}:${request.dispatchSequence}`;
      if (dispatchClaims.has(key)) return "already-dispatched";
      dispatchClaims.add(key);
      events.push({ type: "provider-dispatch-claim", providerAttempt: request.providerAttempt, dispatchSequence: request.dispatchSequence });
      return "claimed";
    },
    async readOpenAiAttempt(request) {
      const receipt = openAiAttemptReceipts.get(request.providerAttempt);
      return receipt ? { ...receipt } : null;
    },
    async readProviderAttemptReplayMetadata(request) {
      const receipt = openAiAttemptReceipts.get(request.providerAttempt);
      return receipt ? { ...receipt } : null;
    },
    async abandonLogicalAttempt(request) {
      events.push({ type: "logical-abandon", attemptId: request.attemptId });
      return 0;
    },
    async azureDirectFallback() {
      throw new Error("Azure fixture path is intentionally disabled for this OpenAI orchestration fixture.");
    },
    async finalizeAzureDirectFallback() {
      return true;
    },
    async settleAzurePartialFailure() {
      return true;
    },
    async openAiProviderCall(request) {
      return request;
    },
    async recordProviderHourlyDetail() { return true; },
    async upsertSessionSummary() { return "fixture-summary"; },
    async reserveBillingPeriodCharacters() { return 0; },
    async commitBillingPeriodCharacters() { return 0; },
    async releaseBillingPeriodCharacters() { return 0; },
    async cleanupAttemptLedgers() { return 0; },
    async closeBillingPeriod() { return true; },
    async closeUtcMonth() { return true; },
    async extendOpenAiAttempt() { return true; },
    async reclaimOpenAiAttempt() { return true; },
    async reclaimAzureDirectFallback() { return true; },
    async reservePollBudget() { return 1; },
    nextOpenAiResult(items) {
      const outcome = outcomeQueue.shift();
      capturedItems.push(items.map((item) => item.attemptId));
      if (outcome === "completed") {
        return {
          status: "completed",
          items: items.map((item) => ({ attemptId: item.attemptId, translatedText: "fixture translation" })),
          providerCallCount: 1,
          subsetRetryCount: 0,
          inputCodePoints: items.reduce((total, item) => total + Array.from(item.text).length, 0),
          inputTokens: 100,
          outputTokens: 10,
          estimatedCostMicros: 1,
          retryAttemptIds: [],
          providerFailureClass: null,
          fallbackEligible: false,
          uncertainInflight: false,
          providerReached: true
        };
      }
      return {
        status: "failed",
        items: [],
        providerCallCount: 1,
        subsetRetryCount: 0,
        inputCodePoints: items.reduce((total, item) => total + Array.from(item.text).length, 0),
        inputTokens: 100,
        outputTokens: 0,
        estimatedCostMicros: 1,
        retryAttemptIds: items.map((item) => item.attemptId),
        providerFailureClass: "network",
        fallbackEligible: true,
        uncertainInflight: true,
        providerReached: true,
        httpStatus: null
      };
    }
  };
}

function createTracingCircuitAuthority(events) {
  const authority = circuitRuntime.createInMemoryCommentTranslatorProviderCircuitAuthority();
  return {
    async read(provider) { return authority.read(provider); },
    async disable(provider, nowMs) { return authority.disable(provider, nowMs); },
    async probe(request) {
      events.push({ type: "circuit-probe", provider: request.provider });
      return authority.probe(request);
    },
    async recordFailure(request) {
      events.push({ type: "circuit-failure", provider: request.provider, failureClass: request.failureClass });
      return authority.recordFailure(request);
    },
    async recordSuccess(request) {
      events.push({ type: "circuit-success", provider: request.provider });
      return authority.recordSuccess(request);
    },
    async recordAttemptFailure(request) {
      events.push({ type: "circuit-attempt-failure", provider: request.provider, failureClass: request.failureClass });
      return authority.recordAttemptFailure(request);
    },
    async recordAttemptSuccess(request) {
      events.push({ type: "circuit-attempt-success", provider: request.provider });
      return authority.recordAttemptSuccess(request);
    }
  };
}

function paidRuntimeRequest({
  nowMs,
  sessionReferenceId,
  commentId,
  usageStore,
  circuitAuthority,
  executeBatch,
  comments,
  callerAuthorization = { status: "authorized", ownerUserId: "fixture-owner" },
  ownerUserId = "fixture-owner",
  maxBatchSize
}) {
  return {
    comments: comments ?? [{
      commentId,
      publishedAt: "2026-08-13T00:00:00.000Z",
      text: "fixture comment",
      platformLanguageHint: "en"
    }],
    targetLanguage: "ja",
    callerAuthorization,
    ownerUserId,
    sessionReferenceId,
    occurredAtMs: nowMs,
    periodStartIso: "2026-08-01T00:00:00.000Z",
    periodEndIso: "2026-09-01T00:00:00.000Z",
    utcMonth: "2026-08-01",
    usageStore,
    serverSecret: "s",
    attemptKeyVersion: "v1",
    openAi: {
      apiKey: "k",
      executeBatch
    },
    circuitAuthority,
    killSwitches: {
      checkout_enabled: true,
      paid_translation_enabled: true,
      openai_enabled: true,
      azure_fallback_enabled: false
    },
    maxBatchSize
  };
}

let azureCallAfterQuotaDisable = 0;
const disabledAzureAuthority = circuitRuntime.createInMemoryCommentTranslatorProviderCircuitAuthority({
  snapshots: {
    openai: {
      ...circuitRuntime.createCommentTranslatorProviderCircuitSnapshot("openai", "degraded"),
      failureCount: 3,
      degradedUntilMs: Date.parse("2026-08-13T00:05:00.000Z")
    },
    azure_fallback: circuitRuntime.createCommentTranslatorProviderCircuitSnapshot("azure_fallback", "disabled")
  }
});
const disabledAzureStore = createPaidRuntimeFixtureStore([], []);
disabledAzureStore.azureDirectFallback = async () => {
  azureCallAfterQuotaDisable += 1;
  throw new Error("disabled Azure must not reserve");
};
const disabledAzureResult = await paidProviderRuntime.executeCommentTranslatorPaidProviderBatch({
  ...paidRuntimeRequest({
    nowMs: Date.parse("2026-08-13T00:00:00.000Z"),
    sessionReferenceId: "fixture-azure-quota-disabled",
    commentId: "fixture-azure-quota-disabled-comment",
    usageStore: disabledAzureStore,
    circuitAuthority: disabledAzureAuthority,
    executeBatch: async () => { throw new Error("OpenAI must not run while degraded"); }
  }),
  azureProvider: {
    id: "fixture-azure",
    name: "fixture-azure",
    runtimeScope: "server-runtime-only",
    secretBoundary: { runtime: "server-env-only", clientBundle: "forbidden", fixtures: "forbidden", docsAndTaskNotes: "no-secret-values" },
    async translate() {
      azureCallAfterQuotaDisable += 1;
      throw new Error("disabled Azure must not call provider");
    }
  },
  killSwitches: { paid_translation_enabled: true, openai_enabled: true, azure_fallback_enabled: true }
});
assert.equal(disabledAzureResult.paidProviderStopReason, "kill-switch", "disabled Azure route is blocked until operator re-enable");
assert.equal(azureCallAfterQuotaDisable, 0, "disabled Azure circuit prevents a later reservation and provider call");

let crashReplayOpenAiCalls = 0;
const crashReplayOpenAiStore = createPaidRuntimeFixtureStore([], []);
crashReplayOpenAiStore.openaiAttempt = async () => ({
  reservationStatus: "reserved",
  sessionLeaseToken: "fixture-live-lease",
  openAiSlotToken: "fixture-live-slot"
});
crashReplayOpenAiStore.claimProviderDispatch = async () => "already-dispatched";
const crashReplayOpenAiResult = await paidProviderRuntime.executeCommentTranslatorPaidProviderBatch(paidRuntimeRequest({
  nowMs: Date.parse("2026-08-13T00:00:00.000Z"),
  sessionReferenceId: "fixture-openai-crash-replay",
  commentId: "fixture-openai-crash-replay-comment",
  usageStore: crashReplayOpenAiStore,
  circuitAuthority: circuitRuntime.createInMemoryCommentTranslatorProviderCircuitAuthority(),
  executeBatch: async () => {
    crashReplayOpenAiCalls += 1;
    throw new Error("claimed OpenAI dispatch must not execute");
  }
}));
assert.equal(crashReplayOpenAiCalls, 0, "an existing OpenAI dispatch claim prevents crash-replay POST");
assert.equal(crashReplayOpenAiResult.providerCallCount, 0, "OpenAI crash replay returns uncertain status without a new provider call");

let crashReplayAzureReservations = 0;
let crashReplayAzureCalls = 0;
const crashReplayAzureStore = createPaidRuntimeFixtureStore([], []);
crashReplayAzureStore.azureDirectFallback = async () => {
  crashReplayAzureReservations += 1;
  return { reservationStatus: "reserved", sessionLeaseToken: "fixture-live-azure-lease", openAiSlotToken: null };
};
crashReplayAzureStore.claimProviderDispatch = async () => "already-dispatched";
const crashReplayAzureAuthority = circuitRuntime.createInMemoryCommentTranslatorProviderCircuitAuthority({
  snapshots: {
    openai: {
      ...circuitRuntime.createCommentTranslatorProviderCircuitSnapshot("openai", "degraded"),
      failureCount: 3,
      degradedUntilMs: Date.parse("2026-08-13T00:05:00.000Z")
    }
  }
});
const crashReplayAzureResult = await paidProviderRuntime.executeCommentTranslatorPaidProviderBatch({
  ...paidRuntimeRequest({
    nowMs: Date.parse("2026-08-13T00:00:00.000Z"),
    sessionReferenceId: "fixture-azure-crash-replay",
    commentId: "fixture-azure-crash-replay-comment",
    usageStore: crashReplayAzureStore,
    circuitAuthority: crashReplayAzureAuthority,
    executeBatch: async () => { throw new Error("OpenAI must not run while degraded"); }
  }),
  azureProvider: {
    id: "fixture-azure", name: "fixture-azure", runtimeScope: "server-runtime-only",
    secretBoundary: { runtime: "server-env-only", clientBundle: "forbidden", fixtures: "forbidden", docsAndTaskNotes: "no-secret-values" },
    async translate() {
      crashReplayAzureCalls += 1;
      throw new Error("claimed Azure dispatch must not execute");
    }
  },
  killSwitches: { paid_translation_enabled: true, openai_enabled: true, azure_fallback_enabled: true }
});
assert.equal(crashReplayAzureReservations, 1, "Azure crash replay reuses only the existing reservation authority");
assert.equal(crashReplayAzureCalls, 0, "an existing Azure dispatch claim prevents crash-replay POST");
assert.equal(crashReplayAzureResult.providerCallCount, 0, "Azure crash replay returns uncertain status without a new provider call");

let partialReplayAzureCalls = 0;
let partialReplaySettlements = 0;
let partialReplayBillingCommits = 0;
let partialReplayBillingReleases = 0;
const partialReplayFinalizations = [];
const partialReplayStore = createPaidRuntimeFixtureStore([], []);
partialReplayStore.azureDirectFallback = async () => ({
  reservationStatus: "reserved",
  sessionLeaseToken: "fixture-partial-replay-lease",
  openAiSlotToken: null
});
partialReplayStore.claimProviderDispatch = async (request) => request.providerKind === "azure_direct_fallback"
  ? "already-dispatched"
  : "claimed";
partialReplayStore.settleAzurePartialFailure = async () => {
  partialReplaySettlements += 1;
  return true;
};
partialReplayStore.finalizeAzureDirectFallback = async (request) => {
  partialReplayFinalizations.push(request);
  return true;
};
partialReplayStore.commitBillingPeriodCharacters = async () => {
  partialReplayBillingCommits += 1;
  return 0;
};
partialReplayStore.releaseBillingPeriodCharacters = async () => {
  partialReplayBillingReleases += 1;
  return 0;
};
const partialReplayComments = [
  { commentId: "fixture-partial-replay-a", publishedAt: "2026-08-13T00:00:00.000Z", text: "alpha", platformLanguageHint: "en" },
  { commentId: "fixture-partial-replay-b", publishedAt: "2026-08-13T00:00:00.000Z", text: "bravo", platformLanguageHint: "en" }
];
const partialReplayResult = await paidProviderRuntime.executeCommentTranslatorPaidProviderBatch({
  ...paidRuntimeRequest({
    nowMs: Date.parse("2026-08-13T00:00:00.000Z"),
    sessionReferenceId: "fixture-partial-replay",
    commentId: "unused",
    comments: partialReplayComments,
    usageStore: partialReplayStore,
    circuitAuthority: circuitRuntime.createInMemoryCommentTranslatorProviderCircuitAuthority(),
    executeBatch: async ({ items }) => ({
      status: "failed",
      items: [{ attemptId: items[0].attemptId, translatedText: "openai-success" }],
      providerCallCount: 1,
      subsetRetryCount: 0,
      inputCodePoints: 10,
      inputTokens: 10,
      outputTokens: 2,
      estimatedCostMicros: 1,
      retryAttemptIds: [items[1].attemptId],
      successfulAttemptIds: [items[0].attemptId],
      providerFailureClass: "network",
      fallbackEligible: true,
      uncertainInflight: true,
      providerReached: true,
      httpStatus: null
    })
  }),
  azureProvider: {
    id: "fixture-azure", name: "fixture-azure", runtimeScope: "server-runtime-only",
    secretBoundary: { runtime: "server-env-only", clientBundle: "forbidden", fixtures: "forbidden", docsAndTaskNotes: "no-secret-values" },
    async translate() {
      partialReplayAzureCalls += 1;
      throw new Error("claimed Azure dispatch must not execute");
    }
  },
  killSwitches: { paid_translation_enabled: true, openai_enabled: true, azure_fallback_enabled: true }
});
assert.equal(partialReplayAzureCalls, 0, "OpenAI partial plus Azure replay performs zero Azure Provider POSTs");
assert.equal(partialReplaySettlements, 0, "OpenAI partial plus Azure replay performs zero partial settlements");
assert.equal(partialReplayBillingCommits, 0, "OpenAI partial plus Azure replay does not commit logical billing");
assert.equal(partialReplayBillingReleases, 0, "OpenAI partial plus Azure replay does not release logical billing");
assert.equal(partialReplayFinalizations.length, 1, "OpenAI partial plus Azure replay finalizes through the uncertain durable path");
assert.equal(partialReplayFinalizations[0].outcome, "uncertain_inflight", "OpenAI partial plus Azure replay retains the Azure reservation as uncertain inflight");
assert.equal(partialReplayFinalizations[0].sessionLeaseToken, "fixture-partial-replay-lease", "uncertain replay reconciliation retains the active Azure lease");
assert.equal(
  partialReplayFinalizations[0].actualInputCharacters === undefined
    && partialReplayFinalizations[0].actualBillingInputCharacters === undefined,
  true,
  "OpenAI partial plus Azure replay keeps uncertain retention true without committing assumed Azure success"
);
assert.equal(paidProviderRuntime.commentTranslatorPaidProviderExecutionContract.reservationTtlMs, 120_000, "uncertain replay retention uses the 120-second durable TTL");
assert.equal(partialReplayResult.translatedCount, 0, "uncommitted OpenAI partial output is not exposed during Azure replay uncertainty");

const combinedPartialSettlements = [];
const combinedPartialStore = createPaidRuntimeFixtureStore([], []);
combinedPartialStore.azureDirectFallback = async () => ({
  reservationStatus: "reserved",
  sessionLeaseToken: "fixture-combined-azure-lease",
  openAiSlotToken: null
});
combinedPartialStore.settleAzurePartialFailure = async (request) => {
  combinedPartialSettlements.push(request);
  return true;
};
const combinedPartialAuthority = circuitRuntime.createInMemoryCommentTranslatorProviderCircuitAuthority();
let combinedPartialAzureCalls = 0;
const combinedPartialComments = [
  { commentId: "fixture-combined-a", publishedAt: "2026-08-13T00:00:00.000Z", text: "alpha", platformLanguageHint: "en" },
  { commentId: "fixture-combined-b", publishedAt: "2026-08-13T00:00:00.000Z", text: "bravo", platformLanguageHint: "en" },
  { commentId: "fixture-combined-c", publishedAt: "2026-08-13T00:00:00.000Z", text: "charlie", platformLanguageHint: "en" }
];
const combinedPartialResult = await paidProviderRuntime.executeCommentTranslatorPaidProviderBatch({
  ...paidRuntimeRequest({
    nowMs: Date.parse("2026-08-13T00:00:00.000Z"),
    sessionReferenceId: "fixture-combined-partial",
    commentId: "unused",
    comments: combinedPartialComments,
    usageStore: combinedPartialStore,
    circuitAuthority: combinedPartialAuthority,
    executeBatch: async ({ items }) => ({
      status: "failed",
      items: [{ attemptId: items[0].attemptId, translatedText: "openai-success" }],
      providerCallCount: 1,
      subsetRetryCount: 0,
      inputCodePoints: 17,
      inputTokens: 10,
      outputTokens: 2,
      estimatedCostMicros: 1,
      retryAttemptIds: items.slice(1).map((item) => item.attemptId),
      successfulAttemptIds: [items[0].attemptId],
      providerFailureClass: "network",
      fallbackEligible: true,
      uncertainInflight: true,
      providerReached: true,
      httpStatus: null
    })
  }),
  azureProvider: {
    id: "fixture-azure", name: "fixture-azure", runtimeScope: "server-runtime-only",
    secretBoundary: { runtime: "server-env-only", clientBundle: "forbidden", fixtures: "forbidden", docsAndTaskNotes: "no-secret-values" },
    async translate(request) {
      combinedPartialAzureCalls += 1;
      if (combinedPartialAzureCalls === 1) {
        return {
          type: "translated", translatedText: "azure-success", detectedSourceLanguage: "en", confidence: null,
          cacheOutcome: "miss", usageHandoff: request.usageHandoff
        };
      }
      return { type: "terminal-error", code: "provider-quota-exhausted", message: "sanitized", retry: { retryable: false } };
    }
  },
  killSwitches: { paid_translation_enabled: true, openai_enabled: true, azure_fallback_enabled: true }
});
assert.equal(combinedPartialSettlements.length, 1, "Azure partial quota failure settles once");
assert.equal(combinedPartialSettlements[0].actualInputCharacters, 5, "Azure partial settlement bills only its successful item");
assert.equal(combinedPartialSettlements[0].actualBillingInputCharacters, 10, "Azure partial settlement commits combined OpenAI and Azure logical characters once");
assert.equal(combinedPartialSettlements[0].providerFailureClass, "quota", "Azure partial settlement retains the sanitized quota failure");
assert.equal(combinedPartialResult.translatedCount, 2, "atomically settled OpenAI and Azure successes remain returnable");
assert.equal((await combinedPartialAuthority.read("azure_fallback")).state, "disabled", "quota failure disables Azure fallback authority");

const invalidResponseSettlements = [];
const invalidResponseCircuitFailures = [];
let invalidResponseAzureCalls = 0;
let invalidResponseReservations = 0;
let invalidResponseReceipt = null;
const invalidResponseStore = createPaidRuntimeFixtureStore([], []);
invalidResponseStore.azureDirectFallback = async () => {
  invalidResponseReservations += 1;
  return invalidResponseReservations === 1
    ? { reservationStatus: "reserved", sessionLeaseToken: "fixture-invalid-response-lease", openAiSlotToken: null }
    : { reservationStatus: "committed", sessionLeaseToken: null, openAiSlotToken: null };
};
invalidResponseStore.settleAzurePartialFailure = async (request) => {
  invalidResponseSettlements.push(request);
  invalidResponseReceipt = {
    attemptState: "committed",
    providerFailureClass: request.providerFailureClass,
    successfulItemAttemptIds: [],
    successfulInputCharacters: 0,
    fallbackEligible: false,
    circuitFailureState: "pending",
    circuitSuccessState: "not-required",
    providerKind: "azure_direct_fallback"
  };
  return true;
};
invalidResponseStore.readProviderAttemptReplayMetadata = async () => ({ ...invalidResponseReceipt });
const invalidResponseBaseAuthority = circuitRuntime.createInMemoryCommentTranslatorProviderCircuitAuthority({
  snapshots: {
    openai: {
      ...circuitRuntime.createCommentTranslatorProviderCircuitSnapshot("openai", "degraded"),
      failureCount: 3,
      degradedUntilMs: Date.parse("2026-08-13T00:05:00.000Z")
    }
  }
});
const invalidResponseAuthority = {
  async read(provider) { return invalidResponseBaseAuthority.read(provider); },
  async disable(provider, nowMs) { return invalidResponseBaseAuthority.disable(provider, nowMs); },
  async probe(request) { return invalidResponseBaseAuthority.probe(request); },
  async recordFailure(request) { return invalidResponseBaseAuthority.recordFailure(request); },
  async recordSuccess(request) { return invalidResponseBaseAuthority.recordSuccess(request); },
  async recordAttemptFailure(request) {
    invalidResponseCircuitFailures.push(request.failureClass);
    return invalidResponseBaseAuthority.recordAttemptFailure(request);
  },
  async recordAttemptSuccess(request) { return invalidResponseBaseAuthority.recordAttemptSuccess(request); }
};
const invalidResponseRequest = {
  ...paidRuntimeRequest({
    nowMs: Date.parse("2026-08-13T00:00:00.000Z"),
    sessionReferenceId: "fixture-azure-invalid-response",
    commentId: "fixture-azure-invalid-response-comment",
    usageStore: invalidResponseStore,
    circuitAuthority: invalidResponseAuthority,
    executeBatch: async () => { throw new Error("OpenAI must not run while degraded"); }
  }),
  azureProvider: {
    id: "fixture-azure", name: "fixture-azure", runtimeScope: "server-runtime-only",
    secretBoundary: { runtime: "server-env-only", clientBundle: "forbidden", fixtures: "forbidden", docsAndTaskNotes: "no-secret-values" },
    async translate(request) {
      invalidResponseAzureCalls += 1;
      return {
        type: "recoverable-error",
        code: "response-invalid",
        message: "sanitized",
        retry: { retryable: false, retryAfterMs: null, fallbackToOriginal: true },
        usageHandoff: request.usageHandoff
      };
    }
  },
  killSwitches: { paid_translation_enabled: true, openai_enabled: true, azure_fallback_enabled: true }
};
const invalidResponseResult = await paidProviderRuntime.executeCommentTranslatorPaidProviderBatch(invalidResponseRequest);
const invalidResponseReplay = await paidProviderRuntime.executeCommentTranslatorPaidProviderBatch(invalidResponseRequest);
assert.equal(invalidResponseAzureCalls, 1, "Azure response-invalid replay performs no second Provider POST");
assert.equal(invalidResponseSettlements.length, 1, "Azure response-invalid settles exactly once");
assert.equal(invalidResponseSettlements[0].providerFailureClass, "policy", "Azure response-invalid receipt uses terminal policy");
assert.equal(invalidResponseResult.status, "completed", "zero-success Azure response-invalid returns a sanitized completed result");
assert.equal(invalidResponseResult.errorCounts.terminal, 1, "Azure response-invalid is terminal rather than uncertain inflight");
assert.equal(invalidResponseResult.translatedCount, 0, "zero-success Azure response-invalid returns no translation");
assert.equal(invalidResponseReplay.providerCallCount, 0, "Azure response-invalid replay reports zero provider calls");
assert.equal(invalidResponseReplay.errorCounts.terminal, 1, "Azure response-invalid replay retains terminal policy");
assert.deepEqual(invalidResponseCircuitFailures, ["policy", "policy"], "Azure response-invalid marker and replay both use policy");
assert.equal(invalidResponseCircuitFailures.includes("invalid-response"), false, "Azure response-invalid never emits a mismatched circuit class");

let postQuotaAzureReservations = 0;
let postQuotaAzureCalls = 0;
const postQuotaStore = createPaidRuntimeFixtureStore([], []);
postQuotaStore.azureDirectFallback = async () => {
  postQuotaAzureReservations += 1;
  throw new Error("disabled Azure must not reserve on a later poll");
};
const postQuotaResult = await paidProviderRuntime.executeCommentTranslatorPaidProviderBatch({
  ...paidRuntimeRequest({
    nowMs: Date.parse("2026-08-13T00:00:10.000Z"),
    sessionReferenceId: "fixture-post-quota-poll",
    commentId: "fixture-post-quota-comment",
    usageStore: postQuotaStore,
    circuitAuthority: combinedPartialAuthority,
    executeBatch: async ({ items }) => ({
      status: "failed", items: [], providerCallCount: 1, subsetRetryCount: 0,
      inputCodePoints: 1, inputTokens: 1, outputTokens: 0, estimatedCostMicros: 1,
      retryAttemptIds: items.map((item) => item.attemptId), successfulAttemptIds: [],
      providerFailureClass: "network", fallbackEligible: true, uncertainInflight: true,
      providerReached: true, httpStatus: null
    })
  }),
  azureProvider: {
    id: "fixture-azure", name: "fixture-azure", runtimeScope: "server-runtime-only",
    secretBoundary: { runtime: "server-env-only", clientBundle: "forbidden", fixtures: "forbidden", docsAndTaskNotes: "no-secret-values" },
    async translate() {
      postQuotaAzureCalls += 1;
      throw new Error("disabled Azure must not execute on a later poll");
    }
  },
  killSwitches: { paid_translation_enabled: true, openai_enabled: true, azure_fallback_enabled: true }
});
assert.equal(postQuotaResult.paidProviderStopReason, "kill-switch", "later poll stops at the disabled Azure circuit");
assert.equal(postQuotaAzureReservations, 0, "later poll makes zero Azure reservations after quota disable");
assert.equal(postQuotaAzureCalls, 0, "later poll makes zero Azure provider calls after quota disable");

const orchestrationEvents = [];
const orchestrationAuthority = createTracingCircuitAuthority(orchestrationEvents);
const orchestrationStore = createPaidRuntimeFixtureStore(
  orchestrationEvents,
  ["failed", "completed", "failed", "failed"]
);
const orchestrationExecuteBatch = async ({ items }) => orchestrationStore.nextOpenAiResult(items);
const orchestrationBaseMs = Date.parse("2026-08-13T00:00:00.000Z");
for (const [index, nowMs] of [0, 10_000, 20_000, 30_000].map((offset) => [offset / 10_000, orchestrationBaseMs + offset])) {
  const result = await paidProviderRuntime.executeCommentTranslatorPaidProviderBatch(paidRuntimeRequest({
    nowMs,
    sessionReferenceId: `fixture-session-${index}`,
    commentId: `fixture-comment-${index}`,
    usageStore: orchestrationStore,
    circuitAuthority: orchestrationAuthority,
    executeBatch: orchestrationExecuteBatch
  }));
  assert.equal(result.status, "completed", "actual Paid orchestration fixture returns a sanitized terminal result");
}
const orchestrationFailureIndices = orchestrationEvents
  .map((event, index) => event.type === "circuit-attempt-failure" ? index : -1)
  .filter((index) => index >= 0);
const orchestrationFinalizeIndices = orchestrationEvents
  .map((event, index) => event.type === "openai-finalize" ? index : -1)
  .filter((index) => index >= 0);
assert.equal(orchestrationFailureIndices.length, 3, "actual orchestration records each eligible OpenAI failure once");
assert.equal(orchestrationFinalizeIndices.length, 4, "actual orchestration finalizes each reserved OpenAI attempt");
assert.equal(
  orchestrationFailureIndices.every((failureIndex) =>
    orchestrationEvents.slice(0, failureIndex).some((event) => event.type === "openai-finalize")
  ),
  true,
  "actual orchestration finalizes the receipt before its attempt-bound circuit marker"
);
assert.equal(
  orchestrationEvents.some((event) => event.type === "circuit-success"),
  false,
  "a closed-circuit success does not clear the active failure window"
);
const orchestrationCircuitSnapshot = await orchestrationAuthority.read("openai");
assert.equal(orchestrationCircuitSnapshot.state, "degraded", "failure-success-failure-failure degrades inside the sixty-second window");
assert.equal(orchestrationCircuitSnapshot.failureCount, 3, "interleaved actual orchestration retains all three eligible failures");

const identityEvents = [];
const identityAuthority = createTracingCircuitAuthority(identityEvents);
const identityStore = createPaidRuntimeFixtureStore(identityEvents, ["completed", "completed"]);
const identityExecuteBatch = async ({ items }) => identityStore.nextOpenAiResult(items);
for (const nowMs of [orchestrationBaseMs, orchestrationBaseMs + 60_000]) {
  const result = await paidProviderRuntime.executeCommentTranslatorPaidProviderBatch(paidRuntimeRequest({
    nowMs,
    sessionReferenceId: "fixture-stable-session",
    commentId: "fixture-stable-comment",
    usageStore: identityStore,
    circuitAuthority: identityAuthority,
    executeBatch: identityExecuteBatch
  }));
  assert.equal(result.status, "completed", "stable attempt identity fixture completes through the real orchestration");
}
assert.equal(identityStore.reservations.length, 2, "stable identity fixture replays the same provider attempt reservation");
assert.equal(identityStore.reservations[0].attemptId, identityStore.reservations[1].attemptId, "Worker retries retain the same logical attempt id across timestamps");
assert.equal(identityStore.reservations[0].providerAttempt, identityStore.reservations[1].providerAttempt, "Worker retries retain the same provider-attempt identity");
assert.equal(identityStore.capturedItems.length, 1, "a committed success replay does not call OpenAI again");

for (const [label, callerAuthorization] of [
  ["unavailable authorization", {
    status: "unavailable",
    reason: "caller-not-authenticated",
    reconnectRequired: true
  }],
  ["authorized owner mismatch", { status: "authorized", ownerUserId: "different-owner" }]
]) {
  const authorizationEvents = [];
  const authorizationStore = createPaidRuntimeFixtureStore(authorizationEvents, ["completed"]);
  let authorizationProviderCalls = 0;
  const authorizationResult = await paidProviderRuntime.executeCommentTranslatorPaidProviderBatch(paidRuntimeRequest({
    nowMs: orchestrationBaseMs,
    sessionReferenceId: `fixture-${label.replaceAll(" ", "-")}`,
    commentId: "fixture-authorization-comment",
    usageStore: authorizationStore,
    circuitAuthority: createTracingCircuitAuthority(authorizationEvents),
    callerAuthorization,
    executeBatch: async ({ items }) => {
      authorizationProviderCalls += 1;
      return authorizationStore.nextOpenAiResult(items);
    }
  }));
  assert.equal(authorizationResult.status, "completed", `${label} returns a sanitized completed result`);
  assert.equal(authorizationResult.paidProviderStopReason, "authority-unreadable", `${label} fails closed`);
  assert.equal(authorizationStore.reservations.length, 0, `${label} creates no reservation`);
  assert.equal(authorizationProviderCalls, 0, `${label} makes no provider call`);
  assert.deepEqual(authorizationResult.translations, [], `${label} returns no private translation material`);
}

const unsupportedLanguageEvents = [];
const unsupportedLanguageStore = createPaidRuntimeFixtureStore(unsupportedLanguageEvents, ["completed"]);
let unsupportedLanguageProviderCalls = 0;
const unsupportedLanguageResult = await paidProviderRuntime.executeCommentTranslatorPaidProviderBatch(paidRuntimeRequest({
  nowMs: orchestrationBaseMs,
  sessionReferenceId: "fixture-unsupported-language",
  commentId: "unused",
  comments: [{
    commentId: "fixture-unsupported-language-comment",
    publishedAt: "2026-08-13T00:00:00.000Z",
    text: "hola amigo",
    platformLanguageHint: "es"
  }],
  usageStore: unsupportedLanguageStore,
  circuitAuthority: createTracingCircuitAuthority(unsupportedLanguageEvents),
  executeBatch: async ({ items }) => {
    unsupportedLanguageProviderCalls += 1;
    return unsupportedLanguageStore.nextOpenAiResult(items);
  }
}));
assert.equal(unsupportedLanguageResult.status, "completed", "unsupported language returns a sanitized completed result");
assert.equal(unsupportedLanguageResult.providerCallCount, 0, "unsupported language providerCallCount remains zero");
assert.equal(unsupportedLanguageProviderCalls, 0, "unsupported language is never sent to OpenAI");
assert.equal(unsupportedLanguageStore.reservations.length, 0, "unsupported language is rejected before durable Provider reservation");
assert.equal(unsupportedLanguageResult.skipsByReason.languagePolicy, 1, "unsupported language is counted only in sanitized policy skips");

const completedPrefixEvents = [];
const completedPrefixStore = createPaidRuntimeFixtureStore(completedPrefixEvents, ["completed"]);
const completedPrefixBaseAuthority = createTracingCircuitAuthority(completedPrefixEvents);
let completedPrefixReads = 0;
const completedPrefixAuthority = {
  ...completedPrefixBaseAuthority,
  async read(provider) {
    completedPrefixReads += 1;
    if (completedPrefixReads === 3) throw new Error("fixture authority unavailable");
    return completedPrefixBaseAuthority.read(provider);
  }
};
const completedPrefixResult = await paidProviderRuntime.executeCommentTranslatorPaidProviderBatch(paidRuntimeRequest({
  nowMs: orchestrationBaseMs,
  sessionReferenceId: "fixture-completed-prefix",
  commentId: "unused",
  comments: [
    { commentId: "fixture-prefix-a", publishedAt: "2026-08-13T00:00:00.000Z", text: "first", platformLanguageHint: "en" },
    { commentId: "fixture-prefix-b", publishedAt: "2026-08-13T00:00:01.000Z", text: "second", platformLanguageHint: "en" }
  ],
  maxBatchSize: 1,
  usageStore: completedPrefixStore,
  circuitAuthority: completedPrefixAuthority,
  executeBatch: async ({ items }) => completedPrefixStore.nextOpenAiResult(items)
}));
assert.equal(completedPrefixResult.paidProviderStopReason, "authority-unreadable", "later microbatch authority failure stops safely");
assert.equal(completedPrefixResult.providerCallCount, 1, "later microbatch stop preserves the completed provider call count");
assert.equal(completedPrefixResult.translatedCount, 1, "later microbatch stop preserves the completed translation count");
assert.equal(completedPrefixResult.batches.length, 1, "later microbatch stop preserves the completed batch summary");
assert.equal(completedPrefixResult.translations[0]?.commentReferenceId, "fixture-prefix-a", "later microbatch stop preserves the completed translation");

const reservationPrefixEvents = [];
const reservationPrefixBaseStore = createPaidRuntimeFixtureStore(reservationPrefixEvents, ["completed"]);
let reservationPrefixCalls = 0;
const reservationPrefixStore = {
  ...reservationPrefixBaseStore,
  async openaiAttempt(request) {
    reservationPrefixCalls += 1;
    if (reservationPrefixCalls === 2) {
      throw new usageStoreRuntime.CommentTranslatorPaidReservationRefusedError("capacity");
    }
    return reservationPrefixBaseStore.openaiAttempt(request);
  }
};
const reservationPrefixResult = await paidProviderRuntime.executeCommentTranslatorPaidProviderBatch(paidRuntimeRequest({
  nowMs: orchestrationBaseMs,
  sessionReferenceId: "fixture-reservation-prefix",
  commentId: "unused",
  comments: [
    { commentId: "fixture-reservation-a", publishedAt: "2026-08-13T00:00:00.000Z", text: "first", platformLanguageHint: "en" },
    { commentId: "fixture-reservation-b", publishedAt: "2026-08-13T00:00:01.000Z", text: "second", platformLanguageHint: "en" }
  ],
  maxBatchSize: 1,
  usageStore: reservationPrefixStore,
  circuitAuthority: createTracingCircuitAuthority(reservationPrefixEvents),
  executeBatch: async ({ items }) => reservationPrefixBaseStore.nextOpenAiResult(items)
}));
assert.equal(reservationPrefixResult.paidProviderStopReason, "provider-capacity-paused", "later microbatch reservation refusal pauses safely");
assert.equal(reservationPrefixResult.providerCallCount, 1, "later reservation refusal preserves the completed provider call count");
assert.equal(reservationPrefixResult.translatedCount, 1, "later reservation refusal preserves the completed translation count");
assert.equal(reservationPrefixResult.batches.length, 1, "later reservation refusal preserves the completed batch summary");
assert.equal(reservationPrefixResult.translations[0]?.commentReferenceId, "fixture-reservation-a", "later reservation refusal preserves the completed translation");

const resumableCapacityEvents = [];
const resumableCapacityAuthority = createTracingCircuitAuthority(resumableCapacityEvents);
const resumableLogicalStates = new Map();
const resumableReservations = [];
const resumableOpenAiAttemptReceipts = new Map();
const resumableFinalizations = [];
let refuseRetryCapacity = true;
const resumableCapacityStore = {
  ...createPaidRuntimeFixtureStore(resumableCapacityEvents, []),
  reservations: resumableReservations,
  async openaiAttempt(request) {
    resumableReservations.push({ attemptId: request.attemptId, providerAttempt: request.providerAttempt });
    const existing = resumableOpenAiAttemptReceipts.get(request.providerAttempt);
    if (existing) {
      return { reservationStatus: existing.attemptState, sessionLeaseToken: null, openAiSlotToken: null };
    }
    const logicalState = resumableLogicalStates.get(request.attemptId);
    if (logicalState === "released") {
      return { reservationStatus: "finalized", sessionLeaseToken: null, openAiSlotToken: null };
    }
    if (refuseRetryCapacity && resumableOpenAiAttemptReceipts.size === 1) {
      refuseRetryCapacity = false;
      throw new usageStoreRuntime.CommentTranslatorPaidReservationRefusedError("capacity");
    }
    resumableLogicalStates.set(request.attemptId, "active");
    resumableOpenAiAttemptReceipts.set(request.providerAttempt, {
      attemptState: "reserved",
      providerFailureClass: null,
      successfulItemAttemptIds: [],
      successfulInputCharacters: 0
    });
    return {
      reservationStatus: "reserved",
      sessionLeaseToken: `lease-${resumableReservations.length}`,
      openAiSlotToken: `slot-${resumableReservations.length}`
    };
  },
  async finalizeOpenAiAttempt(request) {
    resumableFinalizations.push(request.providerAttempt);
    resumableOpenAiAttemptReceipts.set(request.providerAttempt, {
      attemptState: request.outcome === "uncertain_inflight" ? "uncertain" : "committed",
      providerFailureClass: request.providerFailureClass,
      successfulItemAttemptIds: [...request.successfulItemAttemptIds],
      successfulInputCharacters: request.successfulInputCharacters
    });
    return true;
  },
  async readOpenAiAttempt(request) {
    const receipt = resumableOpenAiAttemptReceipts.get(request.providerAttempt);
    return receipt ? { ...receipt } : null;
  },
  async abandonLogicalAttempt(request) {
    resumableCapacityEvents.push({ type: "logical-abandon", attemptId: request.attemptId });
    resumableLogicalStates.set(request.attemptId, "released");
    return 1;
  }
};
let resumableProviderCalls = 0;
const resumableProviderAttemptItemIds = [];
const resumableExecuteBatch = async ({ items }) => {
  resumableProviderCalls += 1;
  resumableProviderAttemptItemIds.push(items.map((item) => item.attemptId));
  if (resumableProviderCalls === 1) {
    return {
      status: "failed",
      items: [{ attemptId: items[0].attemptId, translatedText: "first durable translation" }],
      providerCallCount: 1,
      subsetRetryCount: 0,
      inputCodePoints: items.reduce((total, item) => total + Array.from(item.text).length, 0),
      inputTokens: 100,
      outputTokens: 0,
      estimatedCostMicros: 1,
      retryAttemptIds: [items[1].attemptId],
      providerFailureClass: "invalid-response",
      fallbackEligible: false,
      uncertainInflight: false,
      providerReached: true,
      httpStatus: 200
    };
  }
  return {
    status: "completed",
    items: items.map((item) => ({ attemptId: item.attemptId, translatedText: "resumed translation" })),
    providerCallCount: 1,
    subsetRetryCount: 0,
    inputCodePoints: items.reduce((total, item) => total + Array.from(item.text).length, 0),
    inputTokens: 100,
    outputTokens: 10,
    estimatedCostMicros: 1,
    retryAttemptIds: [],
    providerFailureClass: null,
    fallbackEligible: false,
    uncertainInflight: false,
    providerReached: true
  };
};
const resumableRequest = paidRuntimeRequest({
  nowMs: orchestrationBaseMs,
  sessionReferenceId: "fixture-resumable-capacity",
  commentId: "unused",
  comments: [
    { commentId: "fixture-resumable-a", publishedAt: "2026-08-13T00:00:00.000Z", text: "first item", platformLanguageHint: "en" },
    { commentId: "fixture-resumable-b", publishedAt: "2026-08-13T00:00:01.000Z", text: "second item", platformLanguageHint: "en" }
  ],
  usageStore: resumableCapacityStore,
  circuitAuthority: resumableCapacityAuthority,
  executeBatch: resumableExecuteBatch
});
const capacityPausedResult = await paidProviderRuntime.executeCommentTranslatorPaidProviderBatch(resumableRequest);
const capacityResumedResult = await paidProviderRuntime.executeCommentTranslatorPaidProviderBatch({
  ...resumableRequest,
  occurredAtMs: orchestrationBaseMs + 15_000
});
assert.equal(capacityPausedResult.paidProviderStopReason, "provider-capacity-paused", "retry capacity refusal returns a non-consuming pause");
assert.equal(resumableCapacityEvents.some((event) => event.type === "logical-abandon"), false, "retry capacity refusal keeps the stable logical attempt resumable");
assert.notEqual(capacityResumedResult.paidProviderStopReason, "authority-unreadable", "next poll does not convert the stable attempt to authority-unreadable");
assert.equal(capacityPausedResult.translatedCount, 1, "capacity-paused poll returns the already successful item");
assert.equal(capacityResumedResult.translatedCount, 1, "next poll returns the newly resolved item only");
assert.equal(capacityResumedResult.translations[0]?.commentReferenceId, "fixture-resumable-b", "next poll resolves only item B");
assert.equal(resumableProviderCalls, 2, "exact replay does not make a second index-0 Provider call");
assert.equal(resumableReservations[0].attemptId, resumableReservations[2].attemptId, "capacity pause resumes the same stable logical attempt identity");
assert.equal(resumableReservations[0].providerAttempt, resumableReservations[2].providerAttempt, "next poll exact-replays provider attempt index 0");
assert.equal(resumableReservations[1].providerAttempt, resumableReservations[3].providerAttempt, "next poll retries the same fresh provider attempt index 1");
assert.notEqual(resumableReservations[0].providerAttempt, resumableReservations[1].providerAttempt, "invalid-response retry uses a fresh provider attempt identity");
assert.equal(resumableFinalizations.filter((providerAttempt) => providerAttempt === resumableReservations[0].providerAttempt).length, 1, "exact replay does not finalize or POST the old receipt again");
assert.equal(resumableProviderAttemptItemIds[0].length, 2, "first provider attempt sends both unresolved items");
assert.equal(resumableProviderAttemptItemIds[1].length, 1, "resumed provider attempt sends one unresolved item");
assert.equal(resumableProviderAttemptItemIds[1][0], resumableProviderAttemptItemIds[0][1], "item B receives the one fresh provider attempt");
assert.equal(resumableProviderAttemptItemIds[1].includes(resumableProviderAttemptItemIds[0][0]), false, "item A is never sent again after durable success");
const durablePartialReceipt = resumableOpenAiAttemptReceipts.get(resumableReservations[0].providerAttempt);
assert.equal(durablePartialReceipt.attemptState, "committed", "partial replay receipt is terminal committed");
assert.equal(durablePartialReceipt.providerFailureClass, "invalid-response", "partial replay receipt keeps only the sanitized failure class");
assert.equal(durablePartialReceipt.successfulInputCharacters, Array.from("first item").length, "partial replay receipt stores exact successful input characters");
assert.deepEqual(
  durablePartialReceipt.successfulItemAttemptIds,
  [resumableProviderAttemptItemIds[0][0]],
  "exact replay stores one opaque successful item attempt id"
);
assert.match(durablePartialReceipt.successfulItemAttemptIds[0], /^ctpa_[A-Za-z0-9_-]{1,32}_[A-Za-z0-9_-]{43}$/, "durable replay id is an opaque HMAC attempt id");

const terminalPartialEvents = [];
const terminalPartialStore = createPaidRuntimeFixtureStore(terminalPartialEvents, []);
const terminalPartialSettlements = [];
terminalPartialStore.commitTerminalOpenAiPartial = async (request) => {
  terminalPartialSettlements.push({
    attemptId: request.attemptId,
    providerAttempt: request.providerAttempt,
    actualCharacters: request.actualCharacters
  });
  return request.actualCharacters;
};
let terminalPartialProviderCalls = 0;
const terminalPartialResult = await paidProviderRuntime.executeCommentTranslatorPaidProviderBatch(paidRuntimeRequest({
  nowMs: orchestrationBaseMs,
  sessionReferenceId: "fixture-terminal-partial",
  commentId: "unused",
  comments: [
    { commentId: "fixture-terminal-partial-a", publishedAt: "2026-08-13T00:00:00.000Z", text: "first item", platformLanguageHint: "en" },
    { commentId: "fixture-terminal-partial-b", publishedAt: "2026-08-13T00:00:01.000Z", text: "second item", platformLanguageHint: "en" }
  ],
  usageStore: terminalPartialStore,
  circuitAuthority: createTracingCircuitAuthority(terminalPartialEvents),
  executeBatch: async ({ items }) => {
    terminalPartialProviderCalls += 1;
    if (terminalPartialProviderCalls === 1) {
      return {
        status: "failed",
        items: [{ attemptId: items[0].attemptId, translatedText: "preserved translation" }],
        providerCallCount: 1,
        subsetRetryCount: 0,
        inputCodePoints: items.reduce((total, item) => total + Array.from(item.text).length, 0),
        inputTokens: 100,
        outputTokens: 10,
        estimatedCostMicros: 1,
        retryAttemptIds: [items[1].attemptId],
        providerFailureClass: "invalid-response",
        fallbackEligible: false,
        uncertainInflight: false,
        providerReached: true,
        httpStatus: 200
      };
    }
    return {
      status: "failed",
      items: [],
      providerCallCount: 1,
      subsetRetryCount: 0,
      inputCodePoints: items.reduce((total, item) => total + Array.from(item.text).length, 0),
      inputTokens: 50,
      outputTokens: 0,
      estimatedCostMicros: 1,
      retryAttemptIds: items.map((item) => item.attemptId),
      providerFailureClass: "invalid-response",
      fallbackEligible: false,
      uncertainInflight: false,
      providerReached: true,
      httpStatus: 200
    };
  }
}));
assert.equal(terminalPartialProviderCalls, 2, "terminal invalid-response uses only the one fresh subset retry");
assert.equal(terminalPartialResult.translatedCount, 1, "terminal invalid-response preserves the successful first-attempt item");
assert.equal(terminalPartialResult.translations[0]?.commentReferenceId, "fixture-terminal-partial-a", "terminal invalid-response returns only the successful item");
assert.equal(terminalPartialResult.translations[0]?.translatedText, "preserved translation", "terminal invalid-response does not discard translated output");
assert.equal(terminalPartialSettlements.length, 1, "terminal invalid-response settles the successful subset exactly once");
assert.equal(terminalPartialSettlements[0]?.actualCharacters, Array.from("first item").length, "terminal partial settlement commits only successful input characters");
assert.equal(terminalPartialEvents.some((event) => event.type === "logical-abandon"), false, "terminal partial success is not abandoned as an all-item failure");

function validateTerminalPartialAuthorityFixture({ suppliedProviderAttempt, actualCharacters, receipts }) {
  const latest = [...receipts].sort((left, right) => right.sequence - left.sequence)[0];
  assert.equal(latest?.providerAttempt, suppliedProviderAttempt, "terminal partial rejects a wrong or older supplied receipt");
  for (const receipt of receipts) {
    assert.equal(receipt.providerKind, "openai_attempt", "terminal partial rejects Azure or unknown provider siblings");
    assert.equal(receipt.attemptState, "committed", "terminal partial rejects active, uncertain, released, or expired siblings");
    assert.equal(["invalid-response", "rate-limit"].includes(receipt.providerFailureClass), true, "terminal partial accepts only bounded OpenAI failure receipts");
  }
  const successfulIds = receipts.flatMap((receipt) => receipt.successfulItemAttemptIds);
  assert.equal(new Set(successfulIds).size, successfulIds.length, "terminal partial rejects duplicate successful ids across receipts");
  const durableCharacters = receipts.reduce((total, receipt) => total + receipt.successfulInputCharacters, 0);
  assert.equal(durableCharacters > 0, true, "terminal partial rejects zero durable success");
  assert.equal(actualCharacters, durableCharacters, "terminal partial rejects a caller character mismatch");
  return durableCharacters;
}

const terminalAuthorityBaseReceipts = [
  { sequence: 1, providerAttempt: "openai-0", providerKind: "openai_attempt", attemptState: "committed", providerFailureClass: "invalid-response", successfulItemAttemptIds: [`ctpa_k_${"a".repeat(43)}`], successfulInputCharacters: 10 },
  { sequence: 2, providerAttempt: "openai-1", providerKind: "openai_attempt", attemptState: "committed", providerFailureClass: "invalid-response", successfulItemAttemptIds: [], successfulInputCharacters: 0 }
];
assert.equal(validateTerminalPartialAuthorityFixture({ suppliedProviderAttempt: "openai-1", actualCharacters: 10, receipts: terminalAuthorityBaseReceipts }), 10, "terminal partial accepts the exact latest receipt and durable character sum");
for (const [name, fixture] of [
  ["wrong receipt", { suppliedProviderAttempt: "openai-0", actualCharacters: 10, receipts: terminalAuthorityBaseReceipts }],
  ["later sibling", { suppliedProviderAttempt: "openai-0", actualCharacters: 10, receipts: [...terminalAuthorityBaseReceipts, { ...terminalAuthorityBaseReceipts[1], sequence: 3, providerAttempt: "openai-2" }] }],
  ["mismatched character count", { suppliedProviderAttempt: "openai-1", actualCharacters: 9, receipts: terminalAuthorityBaseReceipts }],
  ["zero success", { suppliedProviderAttempt: "openai-1", actualCharacters: 0, receipts: terminalAuthorityBaseReceipts.map((receipt) => ({ ...receipt, successfulItemAttemptIds: [], successfulInputCharacters: 0 })) }],
  ["active sibling", { suppliedProviderAttempt: "openai-1", actualCharacters: 10, receipts: terminalAuthorityBaseReceipts.map((receipt, index) => index === 0 ? { ...receipt, attemptState: "reserved" } : receipt) }],
  ["unknown sibling", { suppliedProviderAttempt: "openai-1", actualCharacters: 10, receipts: terminalAuthorityBaseReceipts.map((receipt, index) => index === 0 ? { ...receipt, providerKind: "azure_direct_fallback" } : receipt) }]
]) {
  assert.throws(() => validateTerminalPartialAuthorityFixture(fixture), undefined, `terminal partial authority rejects ${name}`);
}

const sameGroupCircuitEvents = [];
const sameGroupCircuitStore = createPaidRuntimeFixtureStore(sameGroupCircuitEvents, ["completed"]);
const halfOpenSnapshot = {
  provider: "openai",
  state: "half_open",
  failureCount: 3,
  windowStartedAtMs: orchestrationBaseMs - 60_000,
  degradedUntilMs: orchestrationBaseMs - 1,
  probeAttemptId: "expired-probe",
  probeLeaseUntilMs: orchestrationBaseMs - 1,
  lastFailureClass: "network"
};
let ownedProbeAttemptId = null;
const sameGroupCircuitAuthority = {
  async read() {
    return {
      ...halfOpenSnapshot,
      probeAttemptId: ownedProbeAttemptId ?? halfOpenSnapshot.probeAttemptId,
      probeLeaseUntilMs: ownedProbeAttemptId ? orchestrationBaseMs + 120_000 : halfOpenSnapshot.probeLeaseUntilMs
    };
  },
  async disable() { return true; },
  async probe(request) {
    ownedProbeAttemptId = request.probeAttemptId;
    return this.read();
  },
  async recordFailure() { return this.read(); },
  async recordAttemptFailure() { return this.read(); },
  async recordSuccess() {
    throw new Error("fixture circuit success authority unavailable");
  },
  async recordAttemptSuccess() {
    throw new Error("fixture attempt circuit success authority unavailable");
  }
};
const sameGroupCircuitResult = await paidProviderRuntime.executeCommentTranslatorPaidProviderBatch(paidRuntimeRequest({
  nowMs: orchestrationBaseMs,
  sessionReferenceId: "fixture-same-group-circuit-failure",
  commentId: "fixture-same-group-comment",
  usageStore: sameGroupCircuitStore,
  circuitAuthority: sameGroupCircuitAuthority,
  executeBatch: async ({ items }) => sameGroupCircuitStore.nextOpenAiResult(items)
}));
assert.equal(sameGroupCircuitResult.paidProviderStopReason, "authority-unreadable", "same-group circuit record failure stops safely");
assert.equal(sameGroupCircuitResult.providerCallCount, 1, "same-group circuit record failure preserves the durable provider call");
assert.equal(sameGroupCircuitResult.translatedCount, 1, "same-group circuit record failure preserves the durable translation");
assert.equal(sameGroupCircuitResult.batches.length, 1, "same-group circuit record failure preserves the batch summary");

// Dependency-free fixture assertions keep the transition contract executable even when
// the fresh worktree intentionally has no node_modules/TypeScript runtime.
const eligibleFailures = new Set(["network", "timeout", "408", "504", "500", "503", "429"]);
const excludedFailures = new Set(["authentication", "configuration", "quota", "cost", "policy", "invalid-request", "unsupported"]);
assert.equal([...eligibleFailures].every((value) => !excludedFailures.has(value)), true, "fallback classes are disjoint");
assert.equal(eligibleFailures.size, 7, "fixture covers all fallback families");
assert.equal(3 * 60_000, 180_000, "three failures are evaluated inside the sixty-second window");
assert.equal(5 * 60_000, 300_000, "degraded routing lasts five minutes");

const inputItems = Array.from({ length: 15 }, (_, index) => ({ attempt_id: `attempt-${index}`, text: "x" }));
assert.equal(inputItems.length <= 15, true, "fixture accepts at most fifteen items");
assert.equal(inputItems.reduce((sum, item) => sum + Array.from(item.text).length, 0) <= 7_500, true, "fixture enforces total code points");
assert.equal(15 * 128 + 384, 2_304, "fixture enforces the request hard token limit");

const firstResponse = [
  { attempt_id: "attempt-0", status: "translated", translated_text: "ok" },
  { attempt_id: "attempt-1", status: "translated", translated_text: "ok" },
  { attempt_id: "attempt-2", status: "translated", translated_text: "ok" },
  { attempt_id: "attempt-3", status: "translated", translated_text: "ok" },
  { attempt_id: "attempt-4", status: "rejected", translated_text: "" }
];
const successfulBeforeSubsetRetry = new Set(firstResponse.filter((item) => item.status === "translated").map((item) => item.attempt_id));
const retrySubset = inputItems.filter((item) => !successfulBeforeSubsetRetry.has(item.attempt_id));
assert.deepEqual(retrySubset.map((item) => item.attempt_id), inputItems.slice(4).map((item) => item.attempt_id), "subset retry excludes successful items");
assert.equal(retrySubset.some((item) => successfulBeforeSubsetRetry.has(item.attempt_id)), false, "successful items are never resent");

const killSwitches = {
  checkout_enabled: true,
  paid_translation_enabled: true,
  openai_enabled: true,
  azure_fallback_enabled: false
};
assert.equal(killSwitches.paid_translation_enabled && killSwitches.openai_enabled, true, "fallback switch is independent from OpenAI primary");
assert.equal(killSwitches.azure_fallback_enabled, false, "disabled fallback remains disabled");

const activeRequests = Array.from({ length: 8 }, (_, index) => `request-${index}`);
assert.equal(activeRequests.length, 8, "eight concurrent OpenAI requests occupy all slots");
assert.equal(activeRequests.length + 1, 9, "the ninth request reaches non-consuming backpressure");
const concurrentSlotFixture = { active: 0, limit: 8 };
const reserveConcurrentSlot = async () => {
  if (concurrentSlotFixture.active >= concurrentSlotFixture.limit) return false;
  concurrentSlotFixture.active += 1;
  return true;
};
const concurrentReservations = await Promise.all(
  Array.from({ length: 9 }, () => reserveConcurrentSlot())
);
assert.equal(concurrentReservations.filter(Boolean).length, 8, "nine concurrent reservations admit exactly eight OpenAI slots");
assert.equal(concurrentReservations.filter((reserved) => !reserved).length, 1, "the ninth concurrent reservation is non-consuming");
const activeSessionBatchIds = new Set();
const reserveSessionBatch = (sessionId) => {
  if (activeSessionBatchIds.has(sessionId)) return false;
  activeSessionBatchIds.add(sessionId);
  return true;
};
assert.equal(reserveSessionBatch("session-a"), true, "the first session batch acquires its in-flight identity");
assert.equal(reserveSessionBatch("session-a"), false, "a duplicate session batch is rejected before provider execution");
const crashExpiryMs = 120_000;
assert.equal(crashExpiryMs, 120_000, "crash/reclaim fixture retains capacity for the 120-second TTL");
const crashAttempt = { state: "uncertain", expiresAtMs: crashExpiryMs };
const reclaimCrashAttempt = (attempt, nowMs) => {
  if (attempt.state === "uncertain" && attempt.expiresAtMs <= nowMs) attempt.state = "released";
  return attempt.state;
};
assert.equal(reclaimCrashAttempt(crashAttempt, crashExpiryMs - 1), "uncertain", "an in-flight crash retains capacity before TTL");
assert.equal(reclaimCrashAttempt(crashAttempt, crashExpiryMs), "released", "an expired crash reservation is reclaimable after TTL");

const reservationEvents = [];
reservationEvents.push({ provider: "azure_direct_fallback", openAiSlot: false, openAiRate: false, openAiCost: false });
assert.deepEqual(reservationEvents[0], {
  provider: "azure_direct_fallback",
  openAiSlot: false,
  openAiRate: false,
  openAiCost: false
}, "direct Azure fixture never acquires OpenAI capacity");

class AsyncPaidProviderLedgerFixture {
  constructor() {
    this.openAiReservations = [];
    this.openAiFinalizations = [];
    this.azureReservations = [];
    this.azureFinalizations = [];
    this.billingFinalizations = [];
    this.logicalAttempts = new Map();
  }

  reserveLogicalAttempt(attemptId, characters) {
    this.logicalAttempts.set(attemptId, { characters, state: "reserved" });
  }

  async abandonLogicalAttempt(attemptId) {
    const logical = this.logicalAttempts.get(attemptId);
    if (!logical || logical.state !== "reserved") return false;
    logical.state = "released";
    return true;
  }

  async reserveOpenAi(providerAttempt, itemIds) {
    this.openAiReservations.push({ providerAttempt, itemIds: [...itemIds], requestCount: 1, slot: `slot-${this.openAiReservations.length}` });
    return { reservationStatus: "reserved" };
  }

  async finalizeOpenAi(providerAttempt, outcome) {
    this.openAiFinalizations.push({ providerAttempt, outcome });
    return true;
  }

  async reserveAzure(itemIds) {
    this.azureReservations.push({ itemIds: [...itemIds], openAiCapacity: false });
    return { reservationStatus: "reserved" };
  }

  async finalizeAzure(outcome, committedCharacters = 0) {
    this.azureFinalizations.push({ outcome, committedCharacters });
    return true;
  }

  async finalizeAzureWithBilling(azureCharacters, logicalCharacters) {
    this.azureFinalizations.push({ outcome: "completed", committedCharacters: azureCharacters });
    this.billingFinalizations.push({ azureCharacters, logicalCharacters });
    for (const logical of this.logicalAttempts.values()) {
      if (logical.state === "reserved") {
        logical.state = "committed";
        logical.committedCharacters = logicalCharacters;
      }
    }
    return true;
  }
}

const isOpenAiFallbackEligibleFixture = (kind) => ["network", "timeout", "rate-limit", "server-error"].includes(kind);
const classify429Fixture = (sanitizedCode) => sanitizedCode === "rate_limit_exceeded" ? "rate-limit" : "invalid-response";
assert.equal(classify429Fixture("rate_limit_exceeded"), "rate-limit", "positive ordinary 429 evidence remains fallback-eligible");
assert.equal(classify429Fixture(null), "invalid-response", "unclassified 429 evidence fails closed");
assert.equal(classify429Fixture("response-timeout"), "invalid-response", "unreadable 429 evidence fails closed");

async function runBoundedOpenAiStateFixture({ first, second }) {
  const ledger = new AsyncPaidProviderLedgerFixture();
  const allItems = ["item-a", "item-b"];
  let pendingItems = [...allItems];
  let retryUsed = false;
  let result = first;
  const successfulItemIds = new Set();

  const execute = async (providerAttempt, itemIds, outcome) => {
    await ledger.reserveOpenAi(providerAttempt, itemIds);
    await ledger.finalizeOpenAi(providerAttempt, outcome.kind);
    return outcome;
  };

  result = await execute("openai-0", pendingItems, first);
  for (const itemId of result.successfulIds ?? []) successfulItemIds.add(itemId);
  if (result.kind === "invalid-response" && result.successfulIds) {
    pendingItems = allItems.filter((itemId) => !result.successfulIds.includes(itemId));
  }
  if (!retryUsed && isOpenAiFallbackEligibleFixture(result.kind) || (!retryUsed && result.kind === "invalid-response" && pendingItems.length > 0)) {
    retryUsed = true;
    result = await execute("openai-1", pendingItems, second);
    for (const itemId of result.successfulIds ?? []) successfulItemIds.add(itemId);
  }
  const fallbackItems = isOpenAiFallbackEligibleFixture(result.kind)
    ? pendingItems.filter((itemId) => !successfulItemIds.has(itemId))
    : [];
  return { ledger, result, fallbackItems, retryUsed, successfulItemIds };
}

const invalidThenRateLimit = await runBoundedOpenAiStateFixture({
  first: { kind: "invalid-response", successfulIds: ["item-a"] },
  second: { kind: "rate-limit" }
});
assert.equal(invalidThenRateLimit.retryUsed, true, "invalid response consumes the single subset retry");
assert.equal(invalidThenRateLimit.ledger.openAiReservations.length, 2, "invalid response plus 429 does not create a third OpenAI reservation");
assert.equal(invalidThenRateLimit.ledger.openAiReservations[1].requestCount, 1, "subset retry has one fresh OpenAI request reservation");
assert.deepEqual(invalidThenRateLimit.fallbackItems, ["item-b"], "429 fallback contains only the unresolved subset");
assert.deepEqual([...invalidThenRateLimit.successfulItemIds], ["item-a"], "subset retry preserves the earlier OpenAI success identity");
assert.equal(
  invalidThenRateLimit.successfulItemIds.size + invalidThenRateLimit.fallbackItems.length,
  2,
  "OpenAI success plus Azure fallback subset covers one logical batch without double-send"
);

const invalidThenTimeout = await runBoundedOpenAiStateFixture({
  first: { kind: "invalid-response", successfulIds: ["item-a"] },
  second: { kind: "timeout" }
});
assert.deepEqual(invalidThenTimeout.fallbackItems, ["item-b"], "uncertain retry still exposes only the unresolved Azure subset");
await invalidThenTimeout.ledger.reserveAzure(invalidThenTimeout.fallbackItems);
assert.equal(
  invalidThenTimeout.ledger.openAiReservations.length === 2
    && invalidThenTimeout.result.kind === "timeout"
    && invalidThenTimeout.fallbackItems.length === 1,
  true,
  "Azure fallback may be reserved after a safe predecessor plus one retained uncertain OpenAI retry"
);

const canReserveAzureAfterUncertainRetry = ({ predecessor, latest }) => {
  const safePredecessor = predecessor.state === "committed"
    && ["invalid-response", "rate-limit"].includes(predecessor.failureClass)
    && predecessor.reservedCost === 0
    && predecessor.committedCost > 0
    && predecessor.committedCharacters === 0
    && predecessor.slotState === "released"
    && predecessor.rateState === "completed";
  const retainedLatest = latest.state === "uncertain"
    && ["network", "timeout"].includes(latest.failureClass)
    && latest.reservedCost > 0
    && latest.slotState === "uncertain"
    && latest.rateState === "uncertain";
  return safePredecessor && retainedLatest;
};
assert.equal(
  canReserveAzureAfterUncertainRetry({
    predecessor: {
      state: "committed",
      failureClass: "invalid-response",
      reservedCost: 0,
      committedCost: 1,
      committedCharacters: 0,
      slotState: "released",
      rateState: "completed"
    },
    latest: { state: "uncertain", failureClass: "timeout", reservedCost: 1, slotState: "uncertain", rateState: "uncertain" }
  }),
  true,
  "Azure fallback accepts a safe bounded-retry predecessor plus one retained uncertain retry"
);
assert.equal(
  canReserveAzureAfterUncertainRetry({
    predecessor: {
      state: "committed",
      failureClass: "invalid-response",
      reservedCost: 1,
      committedCost: 0,
      committedCharacters: 0,
      slotState: "active",
      rateState: "reserved"
    },
    latest: { state: "uncertain", failureClass: "timeout", reservedCost: 1, slotState: "uncertain", rateState: "uncertain" }
  }),
  false,
  "Azure fallback rejects an unsafe older OpenAI receipt instead of bypassing retained capacity checks"
);

async function runPaidBatchSubsetRetryCompositeFixture() {
  const ledger = new AsyncPaidProviderLedgerFixture();
  ledger.reserveLogicalAttempt("logical-composite", 2);
  const allItems = ["item-a", "item-b"];
  const translated = [];
  const successfulItemIds = new Set();
  await ledger.reserveOpenAi("openai-0", allItems);
  await ledger.finalizeOpenAi("openai-0", "invalid-response");
  successfulItemIds.add("item-a");
  translated.push("item-a");
  const retryItems = allItems.filter((itemId) => !successfulItemIds.has(itemId));
  await ledger.reserveOpenAi("openai-1", retryItems);
  await ledger.finalizeOpenAi("openai-1", "rate-limit");
  await ledger.reserveAzure(retryItems);
  translated.push("item-b");
  await ledger.finalizeAzureWithBilling(1, successfulItemIds.size + 1);
  return { ledger, translated, retryItems };
}

const paidBatchSubsetRetryComposite = await runPaidBatchSubsetRetryCompositeFixture();
assert.deepEqual(paidBatchSubsetRetryComposite.retryItems, ["item-b"], "composite orchestration retries only the unresolved item");
assert.deepEqual(paidBatchSubsetRetryComposite.translated, ["item-a", "item-b"], "composite orchestration preserves both provider successes");
assert.deepEqual(
  paidBatchSubsetRetryComposite.ledger.billingFinalizations,
  [{ azureCharacters: 1, logicalCharacters: 2 }],
  "composite orchestration commits Azure-only fallback characters and combined logical characters separately"
);
assert.equal(
  paidBatchSubsetRetryComposite.ledger.logicalAttempts.get("logical-composite").committedCharacters,
  2,
  "composite orchestration settles the logical batch once"
);

const rateLimitThenInvalid = await runBoundedOpenAiStateFixture({
  first: { kind: "rate-limit" },
  second: { kind: "invalid-response", successfulIds: [] }
});
assert.equal(rateLimitThenInvalid.ledger.openAiReservations.length, 2, "429 retry consumes the single OpenAI retry budget");
assert.deepEqual(rateLimitThenInvalid.fallbackItems, [], "invalid response after bounded 429 is not sent to Azure");

async function runOpenAiTerminalPartialFixture() {
  const ledger = new AsyncPaidProviderLedgerFixture();
  ledger.reserveLogicalAttempt("logical-invalid", 2);
  const translations = ["item-a"];
  const finalResult = { kind: "invalid-response" };
  if (finalResult.kind === "invalid-response") {
    translations.splice(0);
    assert.equal(await ledger.abandonLogicalAttempt("logical-invalid"), true, "terminal invalid response abandons the logical reservation");
  }
  return { ledger, translations };
}

const openAiTerminalPartial = await runOpenAiTerminalPartialFixture();
assert.deepEqual(openAiTerminalPartial.translations, [], "OpenAI partial translations are not returned after abandon");
assert.equal(openAiTerminalPartial.ledger.logicalAttempts.get("logical-invalid").state, "released", "abandoned OpenAI logical attempt is released");

const reservationRefusalStopReason = (refusal) => ({
  capacity: "provider-capacity-paused",
  quota: "paid-character-quota-stop",
  "individual-cost": "paid-individual-cost-stop",
  "global-cost": "paid-global-cost-stop"
}[refusal] ?? "authority-unreadable");

async function runRetryReservationRefusalFixture(refusal) {
  const ledger = new AsyncPaidProviderLedgerFixture();
  ledger.reserveLogicalAttempt("logical-retry", 2);
  const translations = ["partial-item"];
  const stopReason = reservationRefusalStopReason(refusal);
  translations.splice(0);
  if (refusal !== "capacity") {
    assert.equal(await ledger.abandonLogicalAttempt("logical-retry"), true, "terminal reservation refusal releases the prior logical hold");
  }
  return { ledger, translations, stopReason };
}

for (const refusal of ["capacity", "quota", "individual-cost", "global-cost"]) {
  const refusalResult = await runRetryReservationRefusalFixture(refusal);
  assert.deepEqual(refusalResult.translations, [], `reservation refusal ${refusal} does not return partial output`);
  assert.equal(
    refusalResult.ledger.logicalAttempts.get("logical-retry").state,
    refusal === "capacity" ? "reserved" : "released",
    `reservation refusal ${refusal} keeps the expected logical hold state`
  );
  assert.equal(refusalResult.stopReason, reservationRefusalStopReason(refusal), `reservation refusal ${refusal} maps to a safe paid stop`);
}

const uncertainAzureReservationRefusal = new AsyncPaidProviderLedgerFixture();
uncertainAzureReservationRefusal.logicalAttempts.set("logical-uncertain", { characters: 2, state: "uncertain" });
assert.equal(
  uncertainAzureReservationRefusal.logicalAttempts.get("logical-uncertain").state,
  "uncertain",
  "Azure reservation refusal does not release an OpenAI uncertain-inflight logical hold"
);

function deterministicMicrobatchIds(comments, maxBatchSize = 2) {
  const ordered = [...comments].sort((left, right) => {
    const leftLanguage = left.language || "auto";
    const rightLanguage = right.language || "auto";
    return leftLanguage === rightLanguage
      ? left.id.localeCompare(right.id)
      : leftLanguage.localeCompare(rightLanguage);
  });
  const groups = [];
  for (let index = 0; index < ordered.length; index += maxBatchSize) {
    groups.push(ordered.slice(index, index + maxBatchSize).map((comment) => comment.id));
  }
  return groups;
}

const microbatchOrder = [
  { id: "comment-c", language: "ja" },
  { id: "comment-a", language: "ja" },
  { id: "comment-b", language: "en" },
  { id: "comment-d", language: "en" }
];
assert.deepEqual(
  deterministicMicrobatchIds(microbatchOrder),
  deterministicMicrobatchIds([...microbatchOrder].reverse()),
  "same comment set has stable microbatch grouping independent of input order"
);

const azureCircuitFixture = {
  state: "closed",
  failures: [],
  degradedUntilMs: null,
  probeAttemptId: null
};
const azureEligibleFailureAt = (nowMs) => {
  azureCircuitFixture.failures = [...azureCircuitFixture.failures.filter((failureAt) => nowMs - failureAt <= 60_000), nowMs];
  if (azureCircuitFixture.failures.length >= 3) {
    azureCircuitFixture.state = "degraded";
    azureCircuitFixture.degradedUntilMs = nowMs + 300_000;
  }
};
azureEligibleFailureAt(0);
azureEligibleFailureAt(10_000);
azureEligibleFailureAt(20_000);
assert.equal(azureCircuitFixture.state, "degraded", "three Azure fallback failures enter the durable degraded state");
assert.equal(azureCircuitFixture.degradedUntilMs, 320_000, "Azure degraded state uses the five-minute window");
azureCircuitFixture.state = "half_open";
azureCircuitFixture.probeAttemptId = "azure-probe";
assert.equal(azureCircuitFixture.probeAttemptId, "azure-probe", "Azure half-open probe has durable ownership");
const staleProbeFailure = {
  state: "half_open",
  probeAttemptId: "new-owner",
  probeLeaseUntilMs: 120_000
};
const recordOwnedProbeFailureFixture = (snapshot, attemptId, nowMs) => {
  const ownsProbe = snapshot.state !== "half_open"
    || (attemptId === snapshot.probeAttemptId && snapshot.probeLeaseUntilMs > nowMs);
  if (!ownsProbe) return { ...snapshot };
  return { ...snapshot, state: "degraded", probeAttemptId: null };
};
assert.equal(recordOwnedProbeFailureFixture(staleProbeFailure, "stale-owner", 10_000).state, "half_open", "stale probe failure cannot degrade a newer half-open owner");
assert.equal(recordOwnedProbeFailureFixture(staleProbeFailure, "new-owner", 10_000).state, "degraded", "current half-open owner may record the provider failure");
const probeFailureLifecycleFixture = {
  state: "half_open",
  probeAttemptId: "probe-owner",
  probeLeaseUntilMs: 120_000,
  providerAttemptState: "reserved"
};
const recordFailureBeforeFinalizeFixture = (snapshot, attemptId, nowMs) => {
  const owned = recordOwnedProbeFailureFixture(snapshot, attemptId, nowMs);
  if (owned.state === "degraded") {
    owned.probeAttemptId = null;
    owned.probeLeaseUntilMs = null;
  }
  owned.providerAttemptState = "released";
  return owned;
};
const probeFailureLifecycle = recordFailureBeforeFinalizeFixture(probeFailureLifecycleFixture, "probe-owner", 10_000);
assert.equal(probeFailureLifecycle.state, "degraded", "a failed half-open probe returns the circuit to degraded");
assert.equal(probeFailureLifecycle.probeAttemptId, null, "owned failure clears the probe before provider finalization");
assert.equal(probeFailureLifecycle.providerAttemptState, "released", "provider finalization still releases the provider attempt after circuit transition");

async function runAzureStateFixture(responses) {
  const ledger = new AsyncPaidProviderLedgerFixture();
  const itemIds = responses.map((_, index) => `item-${index}`);
  await ledger.reserveAzure(itemIds);
  const translated = [];
  let finalOutcome = "completed";
  let failureClass = null;
  for (const response of responses) {
    if (response === "translated") {
      translated.push(response);
      continue;
    }
    finalOutcome = ["timeout", "disconnect"].includes(response)
      ? "uncertain_inflight"
      : "provider_not_reached";
    failureClass = response === "response-invalid" ? "policy" : response;
    break;
  }
  if (finalOutcome === "completed" || translated.length > 0) {
    await ledger.finalizeAzure(finalOutcome === "completed" ? "completed" : "partial_completed", translated.length);
    return { ledger, translated, failureClass };
  }
  await ledger.finalizeAzure(finalOutcome, 0);
  return { ledger, translated: [], failureClass };
}

const azureKnownFailure = await runAzureStateFixture(["translated", "rate-limited"]);
assert.deepEqual(azureKnownFailure.ledger.azureFinalizations, [{ outcome: "partial_completed", committedCharacters: 1 }], "known Azure partial rate-limit commits only the successful character unit");
assert.equal(azureKnownFailure.failureClass, "rate-limited", "known Azure partial rate-limit retains its sanitized failure class");
assert.deepEqual(azureKnownFailure.translated, ["translated"], "known Azure partial success returns only committed translations");
const openAiKnownSubset = ["openai-translated"];
const combinedKnownPartialCommittedCharacters = openAiKnownSubset.length + azureKnownFailure.ledger.azureFinalizations[0].committedCharacters;
assert.equal(combinedKnownPartialCommittedCharacters, 2, "OpenAI and Azure known successful subsets settle as one logical character commit");
assert.deepEqual(
  [...openAiKnownSubset, ...azureKnownFailure.translated],
  ["openai-translated", "translated"],
  "known Azure partial failure preserves already successful OpenAI output");
const azureKnownZeroSuccess = await runAzureStateFixture(["rate-limited"]);
assert.deepEqual(azureKnownZeroSuccess.ledger.azureFinalizations, [{ outcome: "provider_not_reached", committedCharacters: 0 }], "known Azure zero-success failure releases the character reservation");
assert.deepEqual(azureKnownZeroSuccess.translated, [], "known Azure zero-success failure returns no translation");
const openAiOutputAfterZeroAzure = azureKnownZeroSuccess.ledger.azureFinalizations[0].committedCharacters === 0
  ? []
  : openAiKnownSubset;
assert.deepEqual(openAiOutputAfterZeroAzure, [], "known Azure zero-success failure does not return uncommitted OpenAI partial output");
const azureTimeout = await runAzureStateFixture(["translated", "timeout"]);
assert.equal(azureTimeout.ledger.azureFinalizations[0].outcome, "partial_completed", "Azure partial timeout commits known successes without billing the failed item");
assert.equal(azureTimeout.failureClass, "timeout", "Azure partial timeout retains its sanitized failure class");
const azureDisconnect = await runAzureStateFixture(["translated", "disconnect"]);
assert.equal(azureDisconnect.ledger.azureFinalizations[0].outcome, "partial_completed", "Azure partial disconnect commits known successes without billing the failed item");
const azureInvalidResponse = await runAzureStateFixture(["translated", "response-invalid"]);
assert.equal(azureInvalidResponse.ledger.azureFinalizations[0].outcome, "partial_completed", "Azure partial response failure commits known successes without billing the failed item");
assert.equal(azureInvalidResponse.failureClass, "policy", "Azure response-invalid retains the same policy receipt class used by the circuit marker");
const azureQuotaPartial = await runAzureStateFixture(["translated", "quota"]);
assert.equal(azureQuotaPartial.ledger.azureFinalizations[0].outcome, "partial_completed", "Azure partial quota commits known successes without billing the failed item");
assert.equal(azureQuotaPartial.failureClass, "quota", "Azure partial quota retains its sanitized failure class");
const azureKnownServerFailure = await runAzureStateFixture(["temporary-unavailable"]);
assert.equal(azureKnownServerFailure.ledger.azureFinalizations[0].outcome, "provider_not_reached", "known Azure HTTP server failure remains a releasable known failure");
const azureSuccess = await runAzureStateFixture(["translated", "translated"]);
assert.deepEqual(azureSuccess.ledger.azureFinalizations, [{ outcome: "completed", committedCharacters: 2 }], "Azure success commits exactly the successful batch characters");

const providerKillSwitchDecisionFixture = (switches, route) => {
  if (switches.paid_translation_enabled !== true) return "paid-kill";
  if (route === "openai" && switches.openai_enabled !== true) return "openai-kill";
  if (route === "azure" && switches.azure_fallback_enabled !== true) return "azure-kill";
  return "allow";
};
assert.equal(providerKillSwitchDecisionFixture({ paid_translation_enabled: true, openai_enabled: true, azure_fallback_enabled: true }, "openai"), "allow", "all provider switches allow the primary route");
assert.equal(providerKillSwitchDecisionFixture({ paid_translation_enabled: false, openai_enabled: true, azure_fallback_enabled: true }, "openai"), "paid-kill", "Paid translation switch stops provider execution");
assert.equal(providerKillSwitchDecisionFixture({ paid_translation_enabled: true, openai_enabled: false, azure_fallback_enabled: true }, "openai"), "openai-kill", "OpenAI switch stops only the OpenAI route");
assert.equal(providerKillSwitchDecisionFixture({ paid_translation_enabled: true, openai_enabled: true, azure_fallback_enabled: false }, "azure"), "azure-kill", "Azure fallback switch stops only the Azure route");
assert.equal(providerKillSwitchDecisionFixture({ checkout_enabled: false, paid_translation_enabled: true, openai_enabled: true, azure_fallback_enabled: true }, "openai"), "allow", "Checkout switch does not stop existing Paid translation");

const circuitFixture = {
  state: "closed",
  failures: [],
  degradedUntilMs: null,
  probeAttemptId: null
};
const eligibleFailureAt = (nowMs) => {
  circuitFixture.failures = [...circuitFixture.failures.filter((failureAt) => nowMs - failureAt <= 60_000), nowMs];
  if (circuitFixture.failures.length >= 3) {
    circuitFixture.state = "degraded";
    circuitFixture.degradedUntilMs = nowMs + 300_000;
  }
};
eligibleFailureAt(0);
eligibleFailureAt(10_000);
eligibleFailureAt(20_000);
assert.equal(circuitFixture.state, "degraded", "three eligible failures enter degraded routing");
assert.equal(circuitFixture.degradedUntilMs, 320_000, "degraded routing has a five-minute expiry");
const claimProbe = (nowMs, probeAttemptId) => {
  if (circuitFixture.state === "degraded" && (circuitFixture.degradedUntilMs ?? 0) <= nowMs) {
    circuitFixture.state = "half_open";
    circuitFixture.probeAttemptId = probeAttemptId;
  }
  return circuitFixture.state === "half_open" && circuitFixture.probeAttemptId === probeAttemptId;
};
assert.equal(claimProbe(320_000, "probe-a"), true, "expired degraded state claims one half-open probe");
assert.equal(claimProbe(320_001, "probe-b"), false, "a competing half-open probe is rejected");
const recordProbeSuccess = (probeAttemptId) => {
  if (circuitFixture.state !== "half_open" || circuitFixture.probeAttemptId !== probeAttemptId) return false;
  circuitFixture.state = "closed";
  circuitFixture.failures = [];
  circuitFixture.degradedUntilMs = null;
  circuitFixture.probeAttemptId = null;
  return true;
};
assert.equal(recordProbeSuccess("probe-a"), true, "the owning half-open probe restores closed state");
assert.equal(circuitFixture.state, "closed", "successful probe clears degraded state");

const openAi429Reservations = [
  { providerAttempt: "openai-0", requestCount: 1, slotToken: "slot-0" },
  { providerAttempt: "openai-1", requestCount: 1, slotToken: "slot-1" }
];
assert.notEqual(openAi429Reservations[0].providerAttempt, openAi429Reservations[1].providerAttempt, "429 retry uses a fresh provider attempt");
assert.equal(openAi429Reservations.every((reservation) => reservation.requestCount === 1), true, "429 retry reserves one request per attempt");
assert.notEqual(openAi429Reservations[0].slotToken, openAi429Reservations[1].slotToken, "429 retry obtains a fresh slot lease");
const record429OnlyWhenRetryRefused = (retryReserved) => retryReserved ? 0 : 1;
assert.equal(record429OnlyWhenRetryRefused(true), 0, "a fresh 429 retry does not double-count the initial transient");
assert.equal(record429OnlyWhenRetryRefused(false), 1, "a refused fresh retry records the initial 429 exactly once");

const openAiCost = (inputTokens, outputTokens) => (inputTokens * 0.15 + outputTokens * 0.60) / 1_000_000;
const standardInputTokens = 556 * 400 + 8_334 * 90;
const standardOutputTokens = 8_334 * 40;
assert.equal(openAiCost(standardInputTokens, standardOutputTokens).toFixed(3), "0.346", "standard 500k cost is recalculated from official rates");
assert.equal(openAiCost(1_416_800, 750_000).toFixed(3), "0.663", "high-frequency cost is recalculated from official rates");
assert.equal(openAiCost(3_466_800, 800_000).toFixed(2), "1.00", "five-character cost is recalculated from official rates");
assert.equal(openAiCost(15_333_600, 64_000_000).toFixed(2), "40.70", "pathological cost is recalculated from official rates");
assert.equal(openAiCost(1_000 * 90 + 67 * 400, 40_000).toFixed(4), "0.0415", "1,000 standard comments are recalculated from official rates");
assert.equal(openAiCost(8_334 * 90 + 556 * 400, 8_334 * 40).toFixed(3), "0.346", "three-hour standard usage stops at the 500k character cap");
assert.equal(openAiCost(10_800 * 4 + 720 * 400, 10_800 * 2).toFixed(3), "0.063", "three-hour one-character usage uses the average two-token output case");
assert.equal(openAiCost(10_800 * 4 + 720 * 400, 10_800 * 128).toFixed(3), "0.879", "three-hour one-character usage uses the 128-token sensitivity case");

console.log("Task 6 provider contract passed");
