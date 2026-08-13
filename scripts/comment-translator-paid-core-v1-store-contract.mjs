import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const stores = [
  ["lib/comment-translator-paid-entitlement-store.ts", "commentTranslatorPaidEntitlementStoreContract", "createTrustedCommentTranslatorPaidEntitlementStore"],
  ["lib/comment-translator-paid-capacity-store.ts", "commentTranslatorPaidCapacityStoreContract", "createTrustedCommentTranslatorPaidCapacityStore"],
  ["lib/comment-translator-paid-usage-store.ts", "commentTranslatorPaidUsageStoreContract", "createTrustedCommentTranslatorPaidUsageStore"],
  ["lib/comment-translator-paid-reconciler-store.ts", "commentTranslatorPaidReconcilerStoreContract", "createTrustedCommentTranslatorPaidReconcilerStore"],
  ["lib/comment-translator-paid-consent-store.ts", "commentTranslatorPaidConsentStoreContract", "createTrustedCommentTranslatorPaidConsentStore"]
];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

for (const [relativePath, contractName, factoryName] of stores) {
  assert.ok(fs.existsSync(path.join(root, relativePath)), `store exists: ${relativePath}`);
  const source = read(relativePath);
  assert.match(source, /^import "server-only";/m, `${relativePath} is server-only`);
  assert.match(source, new RegExp(`export const ${contractName}\\s*=`), `${relativePath} exposes its contract`);
  assert.match(source, new RegExp(`export function ${factoryName}\\b`), `${relativePath} exposes a trusted factory`);
  assert.match(source, /remoteSupabaseMigrationApply:\s*"not-run-in-this-thread"/, `${relativePath} records remote apply not-run`);
  assert.match(source, /trusted-service-role-env-missing/, `${relativePath} handles missing trusted environment`);
  assert.match(source, /fail-closed|failClosed/, `${relativePath} has a fail-closed path`);
  assert.doesNotMatch(source, /console\.(log|error)\([^\n]*(?:ownerUserId|stripeCustomer|stripeSubscription|token|payload|comment)/i, `${relativePath} does not log private values`);
}

const entitlement = read(stores[0][0]);
const circuit = read("lib/comment-translator-provider-circuit-breaker.ts");
for (const required of [
  "beginCheckout",
  "bindCheckoutSession",
  "markCheckoutExpireRequired",
  "expireCheckoutHold",
  "readEntitlement",
  "claimEntitlementProjection",
  "projectEntitlement",
  "bindFirstSubscription",
  "claimStripeEvent",
  "finalizeStripeEvent",
  "ct_paid_project_entitlement",
  "ct_paid_bind_first_subscription",
  "ct_paid_claim_stripe_event",
  "ct_paid_finalize_stripe_event",
  "ct_paid_begin_checkout",
  "ct_paid_bind_checkout_session",
  "ct_paid_mark_checkout_expire_required",
  "ct_paid_expire_checkout_hold"
]) {
  assert.match(entitlement, new RegExp(required), `entitlement adapter supports ${required}`);
}
assert.match(entitlement, /lifecycleState\?:\s*string\s*\|\s*null/, "entitlement projection accepts the lifecycle state for atomic projection");
assert.match(entitlement, /CommentTranslatorPaidEntitlementProjectionClaim[\s\S]+?projectionLeaseToken:\s*string[\s\S]+?projectionLeaseUntilIso:\s*string/, "projection claim adapter exposes only opaque lease authority");
assert.match(entitlement, /claimEntitlementProjection:[\s\S]+?ownerUserId:\s*string[\s\S]+?lifecycleId:\s*string[\s\S]+?nowIso:\s*string/, "projection claim requires owner and lifecycle before Stripe refetch");
assert.match(entitlement, /ct_paid_claim_entitlement_projection[\s\S]+?p_owner_user_id:\s*request\.ownerUserId[\s\S]+?p_lifecycle_id:\s*request\.lifecycleId[\s\S]+?p_now:\s*request\.nowIso/, "projection adapter calls the trusted claim RPC");
assert.match(entitlement, /p_projection_lease_token:\s*request\.projectionLeaseToken/g, "projection and first-subscription RPC calls forward current-object authority");
assert.match(entitlement, /p_lifecycle_state:\s*request\.lifecycleState/, "entitlement adapter sends lifecycle state to the atomic RPC");
const projectEntitlementType = entitlement.slice(entitlement.indexOf("projectEntitlement:"), entitlement.indexOf("bindFirstSubscription:"));
const bindFirstSubscriptionType = entitlement.slice(entitlement.indexOf("bindFirstSubscription:"), entitlement.indexOf("claimStripeEvent:"));
assert.match(projectEntitlementType, /projectionLeaseToken:\s*string/, "entitlement projection token is non-null");
assert.match(bindFirstSubscriptionType, /projectionLeaseToken:\s*string/, "first-subscription binding token is non-null");
assert.doesNotMatch(projectEntitlementType, /stripeEventCreatedAtIso:\s*string/, "entitlement projection does not treat Event.created as current-object authority");
assert.doesNotMatch(bindFirstSubscriptionType, /stripeEventCreatedAtIso:\s*string/, "first-subscription binding does not treat Event.created as current-object authority");
assert.equal((entitlement.match(/p_stripe_event_created_at:\s*request\.stripeEventCreatedAtIso/g) ?? []).length, 1, "only Stripe Event receipt claim forwards Event.created");
assert.match(entitlement, /expireCheckoutHold:[\s\S]+?stripeSessionStatus:\s*"expired"\s*\|\s*"complete"\s*\|\s*"open"\s*\|\s*"unknown"[\s\S]+?stripeSessionCheckedAtIso:\s*string/, "Checkout expiry requires sanitized Session status and confirmation time");
assert.match(entitlement, /p_stripe_session_status:\s*request\.stripeSessionStatus[\s\S]+?p_stripe_session_checked_at:\s*request\.stripeSessionCheckedAtIso/, "Checkout expiry forwards sanitized Session confirmation");
assert.match(entitlement, /expireCheckoutHold:[\s\S]+?reconcileLeaseToken:\s*string\s*\|\s*null/, "Checkout expiry accepts nullable reconciler lease authority");
assert.match(entitlement, /p_reconcile_lease_token:\s*request\.reconcileLeaseToken/, "Checkout expiry forwards nullable reconciler lease authority");
assert.match(entitlement, /ct_paid_read_entitlement/, "entitlement reads use the trusted lifecycle-aware RPC");
assert.doesNotMatch(entitlement, /\.order\("updated_at"[\s\S]+?\.limit\(1\)/, "entitlement owner reads do not select an ambiguous latest terminal row");
assert.match(entitlement, /claimStatus === "processing"[\s\S]+?leaseToken === null/, "duplicate processing claims require a null lease token");
assert.match(entitlement, /CommentTranslatorPaidCheckoutInitialization[\s\S]+?lifecycleId:\s*string[\s\S]+?holdId:\s*string[\s\S]+?customerBindingId:\s*string[\s\S]+?idempotencyKey:\s*string[\s\S]+?checkoutExpiresAtTargetIso:\s*string/, "Checkout begin returns canonical DB-owned Checkout authority");
assert.match(entitlement, /beginCheckout[\s\S]+?lifecycle_id[\s\S]+?hold_id[\s\S]+?customer_binding_id[\s\S]+?idempotency_key[\s\S]+?checkout_expires_at_target/, "Checkout begin maps the canonical DB-owned Checkout authority");
assert.doesNotMatch(entitlement, /beginCheckout:\s*\(request:\s*\{[\s\S]{0,240}?(?:idempotencyKey|checkoutExpiresAtTargetIso):/, "Checkout begin accepts no caller-owned idempotency or expiry authority");
assert.match(entitlement, /bindCheckoutSession:[\s\S]+?isRecoveryBinding:\s*boolean[\s\S]+?idempotencyKey:\s*string/, "Checkout Session binding requires an explicit recovery mode and existing idempotency key");
assert.match(entitlement, /p_is_recovery_binding:\s*request\.isRecoveryBinding[\s\S]+?p_idempotency_key:\s*request\.idempotencyKey/, "Checkout Session binding forwards the sanitized recovery mode and idempotency key");
assert.match(entitlement, /markCheckoutExpireRequired:[\s\S]+?stripeCheckoutSessionId:\s*string[\s\S]+?stripeCustomerId:\s*string[\s\S]+?stripeExpiresAtIso:\s*string[\s\S]+?idempotencyKey:\s*string[\s\S]+?checkoutExpiresAtTargetIso:\s*string/, "Checkout DB binding failure marker requires sanitized Session and immutable hold identity");
assert.match(entitlement, /ct_paid_mark_checkout_expire_required[\s\S]+?p_stripe_checkout_session_id:\s*request\.stripeCheckoutSessionId[\s\S]+?p_stripe_customer_id:\s*request\.stripeCustomerId[\s\S]+?p_stripe_expires_at:\s*request\.stripeExpiresAtIso[\s\S]+?p_idempotency_key:\s*request\.idempotencyKey[\s\S]+?p_checkout_expires_at_target:\s*request\.checkoutExpiresAtTargetIso/, "Checkout DB binding failure marker forwards only sanitized immutable identity to the trusted atomic RPC");
assert.match(entitlement, /checkoutBindingFailureAuthority:\s*"session-binding-and-pending-hold-to-expire-required-in-one-trusted-rpc"/, "Checkout binding failure authority records atomic Session binding and expire-required transition");
assert.doesNotMatch(entitlement, /(?:checkoutUrl|rawStripePayload|responseBody|statusBody)/, "Checkout Session recovery adapter exposes no URL or raw Stripe fields");

const capacity = read(stores[1][0]);
for (const required of [
  "reserveCapacity",
  "convertCapacity",
  "releaseCapacity",
  "capacityLimit: 20",
  "ct_paid_reserve_capacity",
  "ct_paid_convert_capacity",
  "ct_paid_release_capacity"
]) {
  assert.match(capacity, new RegExp(required), `capacity adapter supports ${required}`);
}

const usage = read(stores[2][0]);
for (const required of [
  "recordProviderHourlyDetail",
  "upsertSessionSummary",
  "reserveBillingPeriodCharacters",
  "commitBillingPeriodCharacters",
  "releaseBillingPeriodCharacters",
  "abandonLogicalAttempt",
  "closeBillingPeriod",
  "closeUtcMonth",
  "openaiAttempt",
  "claimProviderDispatch",
  "extendOpenAiAttempt",
  "finalizeOpenAiAttempt",
  "commitTerminalOpenAiPartial",
  "reclaimOpenAiAttempt",
  "openAiSlotToken",
  "azureDirectFallback",
  "finalizeAzureDirectFallback",
  "settleAzurePartialFailure",
  "reclaimAzureDirectFallback",
  "cleanupAttemptLedgers",
  "reservePollBudget",
  "comment_translator_paid_attempt_receipts",
  "openAiSlotLimit: 8",
  "reconcilerLeaseSeconds: 120",
  "ct_paid_openai_attempt",
  "ct_paid_claim_provider_dispatch",
  "ct_paid_commit_terminal_openai_partial",
  "ct_paid_azure_direct_fallback",
  "ct_paid_settle_azure_partial_failure",
  "ct_paid_abandon_logical_attempt",
  "ct_paid_reclaim_azure_fallback",
  "ct_paid_record_provider_hourly_detail",
  "ct_paid_upsert_session_summary"
]) {
  assert.match(usage, new RegExp(required), `usage adapter supports ${required}`);
}
assert.match(usage, /providerMessageId|commentHash|rawCommentText/, "usage adapter names forbidden inputs only as explicit rejection markers");
assert.match(usage, /forbidden|never-recorded-by-design/, "usage adapter marks forbidden provider content");
assert.match(usage, /finalizeOpenAiAttempt:[\s\S]+?sessionLeaseToken:\s*string;[\s\S]+?openAiSlotToken:\s*string;/, "OpenAI finalize always requires both original lease tokens");
assert.match(usage, /type CommentTranslatorPaidAzureFinalizeRequest\s*=\s*[\s\S]+?sessionLeaseToken:\s*string;[\s\S]+?outcome:\s*"uncertain_inflight";/, "Azure finalize requires the original session token and supports uncertain outcome");
assert.match(usage, /finalizeAzureDirectFallback:\s*\(request:\s*CommentTranslatorPaidAzureFinalizeRequest\)/, "Azure finalize uses its outcome-bound request type");
assert.match(usage, /claimProviderDispatch:[\s\S]+?dispatchSequence:\s*number;[\s\S]+?Promise<CommentTranslatorPaidProviderDispatchClaimStatus>/, "dispatch claim binds each bounded provider POST identity");
assert.match(usage, /ct_paid_claim_provider_dispatch[\s\S]+?p_dispatch_sequence:\s*request\.dispatchSequence/, "dispatch claim forwards only bounded durable identity");
assert.match(usage, /settleAzurePartialFailure:[\s\S]+?actualInputCharacters:\s*number;[\s\S]+?actualBillingInputCharacters:\s*number;[\s\S]+?providerFailureClass:/, "Azure partial settlement requires exact successful character counts and a sanitized failure");
assert.match(usage, /ct_paid_settle_azure_partial_failure[\s\S]+?p_actual_input_characters:\s*request\.actualInputCharacters[\s\S]+?p_actual_billing_input_characters:\s*request\.actualBillingInputCharacters/, "Azure partial settlement forwards separate Azure and logical character authority");
assert.doesNotMatch(usage, /finalize(?:OpenAiAttempt|AzureDirectFallback):[\s\S]{0,240}?LeaseToken:\s*string\s*\|\s*null/, "provider finalization tokens are never nullable");
assert.doesNotMatch(usage, /type CommentTranslatorPaidAzureFinalizeRequest[\s\S]{0,240}?sessionLeaseToken:\s*string\s*\|\s*null/, "Azure finalization session token is never nullable");
assert.match(usage, /CommentTranslatorPaidAttemptOutcome\s*=\s*"completed"\s*\|\s*"uncertain_inflight"\s*\|\s*"provider_not_reached";/, "shared provider outcome remains aligned with Azure RPC outcomes");
assert.match(usage, /CommentTranslatorPaidOpenAiAttemptOutcome\s*=\s*CommentTranslatorPaidAttemptOutcome\s*\|\s*"provider_reached_failed"/, "OpenAI adapter alone exposes the reached-provider terminal failure outcome");
assert.match(usage, /finalizeOpenAiAttempt:[\s\S]+?outcome:\s*CommentTranslatorPaidOpenAiAttemptOutcome/, "OpenAI finalize uses its RPC-specific reached-provider outcome type");
assert.match(usage, /active provider reservation is missing its session lease token/, "active provider states fail closed without a session token");
assert.match(usage, /logicalAttemptTableName:\s*"comment_translator_paid_logical_attempts"/, "usage store records the separate logical settlement authority");
assert.match(usage, /type CommentTranslatorPaidProviderFailureClass\s*=\s*[\s\S]*?"network"[\s\S]*?"timeout"[\s\S]*?"rate-limit"[\s\S]*?"server-error"[\s\S]*?"invalid-response"[\s\S]*?"quota"[\s\S]*?"configuration"[\s\S]*?"policy"/, "usage adapter exposes only sanitized provider failure classes");
assert.match(usage, /finalizeOpenAiAttempt:[\s\S]+?providerFailureClass:\s*CommentTranslatorPaidProviderFailureClass\s*\|\s*null/, "OpenAI finalize requires an explicit sanitized failure-class decision");
assert.match(usage, /ct_paid_finalize_openai_attempt[\s\S]+?p_provider_failure_class:\s*request\.providerFailureClass/, "OpenAI finalize forwards the sanitized failure class to the trusted RPC");
assert.match(usage, /finalizeOpenAiAttempt:[\s\S]+?successfulItemAttemptIds:\s*readonly string\[\];[\s\S]+?successfulInputCharacters:\s*number;/, "OpenAI finalize requires durable bounded success metadata");
assert.match(usage, /ct_paid_finalize_openai_attempt_with_metadata[\s\S]+?p_successful_item_attempt_ids:\s*request\.successfulItemAttemptIds[\s\S]+?p_successful_input_characters:\s*request\.successfulInputCharacters/, "OpenAI finalize forwards success metadata through the additive metadata RPC");
assert.match(usage, /CommentTranslatorPaidOpenAiAttemptReceipt[\s\S]+?successfulItemAttemptIds:\s*readonly string\[\];[\s\S]+?successfulInputCharacters:\s*number;/, "OpenAI replay receipt exposes only bounded successful ids and character count");
assert.match(usage, /providerKind === "openai_attempt"[\s\S]+?successfulItemAttemptIds\.length === 0[\s\S]+?normalizedSuccessfulInputCharacters === 0/, "OpenAI replay retains exact item-id and character consistency");
assert.match(usage, /providerKind === "azure_direct_fallback"[\s\S]+?successfulItemAttemptIds\.length !== 0[\s\S]+?cannot expose item identities/, "Azure partial replay carries successful characters without persisting item identities");
assert.match(usage, /CommentTranslatorPaidOpenAiAttemptReceipt[\s\S]+?fallbackEligible:\s*boolean;[\s\S]+?circuitFailureState:[\s\S]+?circuitSuccessState:/, "OpenAI replay receipt exposes sanitized fallback and circuit authority");
assert.match(usage, /ct_paid_finalize_openai_attempt_with_metadata[\s\S]+?p_fallback_eligible:\s*request\.fallbackEligible[\s\S]+?p_circuit_failure_state:\s*request\.circuitFailureState[\s\S]+?p_circuit_success_state:\s*request\.circuitSuccessState/, "OpenAI finalization binds replay and circuit metadata atomically");
assert.match(circuit, /ct_paid_record_attempt_circuit_failure[\s\S]+?p_attempt_id:\s*attemptId[\s\S]+?p_provider_attempt:\s*providerAttempt/, "failure marker is bound to the exact provider attempt");
assert.match(circuit, /ct_paid_record_attempt_circuit_success[\s\S]+?p_attempt_id:\s*attemptId[\s\S]+?p_provider_attempt:\s*providerAttempt/, "success marker is bound to the exact provider attempt");
assert.match(usage, /trustedRpcNames:[\s\S]+?"ct_paid_read_provider_attempt_replay_metadata"/, "usage adapter trusts the additive replay metadata RPC");
assert.match(usage, /readOpenAiAttempt\(request\)[\s\S]+?supabase\.rpc\("ct_paid_read_provider_attempt_replay_metadata"/, "OpenAI replay reads use the additive replay metadata RPC");
assert.doesNotMatch(usage, /supabase\.rpc\("ct_paid_read_openai_attempt"/, "OpenAI replay runtime does not call the legacy two-column RPC");
assert.match(usage, /commitTerminalOpenAiPartial:[\s\S]+?actualCharacters:\s*number;[\s\S]+?Promise<number>/, "terminal OpenAI partial settlement requires an exact successful character count");
assert.match(usage, /ct_paid_commit_terminal_openai_partial[\s\S]+?p_attempt_id:\s*request\.attemptId[\s\S]+?p_provider_attempt:\s*request\.providerAttempt[\s\S]+?p_actual_characters:\s*request\.actualCharacters/, "terminal OpenAI partial settlement forwards only bounded durable identity and character authority");
const azureUncertainFinalizeFixture = {
  outcome: "uncertain_inflight",
  providerFailureClass: "timeout"
};
assert.match(usage, /type CommentTranslatorPaidAzureFinalizeRequest\s*=\s*[\s\S]+?outcome:\s*"completed";[\s\S]+?providerFailureClass:\s*null;[\s\S]+?outcome:\s*"uncertain_inflight";[\s\S]+?providerFailureClass:\s*CommentTranslatorPaidProviderFailureClass;[\s\S]+?outcome:\s*"provider_not_reached";[\s\S]+?providerFailureClass:\s*CommentTranslatorPaidProviderFailureClass\s*\|\s*null;/, "Azure finalize binds completed, uncertain, and provider-not-reached outcomes to sanitized failure classes");
assert.match(usage, new RegExp(`request\\.outcome === "${azureUncertainFinalizeFixture.outcome}"[\\s\\S]+?request\\.providerFailureClass === null[\\s\\S]+?throw new Error`), "Azure uncertain finalize fails closed without its sanitized failure class");
assert.match(usage, /ct_paid_finalize_azure_fallback[\s\S]+?p_provider_failure_class:\s*request\.providerFailureClass/, `Azure ${azureUncertainFinalizeFixture.outcome} finalize forwards ${azureUncertainFinalizeFixture.providerFailureClass} through the exact trusted RPC field`);
assert.match(usage, /logicalAttemptTtlHours:\s*24/, "usage adapter records the Task 2 logical-attempt TTL");
assert.match(usage, /cleanupAttemptLedgers:[\s\S]+?nowIso:\s*string;[\s\S]+?limit\?:\s*number;[\s\S]+?Promise<number>/, "usage adapter exposes bounded attempt-ledger cleanup");
assert.match(usage, /ct_paid_cleanup_attempt_ledgers[\s\S]+?p_now:\s*request\.nowIso[\s\S]+?p_limit:\s*request\.limit \?\? 500/, "usage adapter forwards cleanup time and bounded default");
assert.match(usage, /attemptId:\s*string[\s\S]+?providerAttempt:\s*string[\s\S]+?sourceExpiresAtIso:\s*string/, "hourly detail adapter requires the approved short-lived source identity");
for (const latencyBucket of ["latencyUpTo100MsCount", "latency101To250MsCount", "latency251To500MsCount", "latency501To1000MsCount", "latency1001To2500MsCount", "latency2501To5000MsCount", "latency5001To10000MsCount", "latencyOver10000MsCount"]) {
  assert.match(usage, new RegExp(`${latencyBucket}:\\s*number`), `usage adapter requires fixed histogram field ${latencyBucket}`);
}
assert.doesNotMatch(usage, /latencyP(?:50|95)Ms/, "usage adapter does not expose non-composable percentile deltas");
assert.match(usage, /p_attempt_id:\s*request\.attemptId[\s\S]+?p_provider_attempt:\s*request\.providerAttempt[\s\S]+?p_source_expires_at:\s*request\.sourceExpiresAtIso/, "usage adapter forwards the exact source receipt identity");

const reconciler = read(stores[3][0]);
for (const required of [
  "claimDue",
  "finalize",
  "retry",
  "disableProviderCircuit",
  "recordProviderCircuitFailure",
  "probeProviderCircuit",
  "recordProviderCircuitSuccess",
  "maxBatchSize: 50",
  "leaseSeconds: 120",
  "ct_paid_claim_reconciler",
  "ct_paid_finalize_reconciler",
  "ct_paid_retry_reconciler",
  "ct_paid_disable_provider_circuit",
  "ct_paid_record_provider_circuit_failure",
  "ct_paid_probe_provider_circuit",
  "ct_paid_record_provider_circuit_success"
]) {
  assert.match(reconciler, new RegExp(required.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")), `reconciler adapter supports ${required}`);
}
assert.match(
  reconciler,
  /backoffSeconds:\s*\[60,\s*300,\s*900,\s*3600,\s*21600\]/,
  "reconciler adapter fixes bounded backoff values"
);
assert.match(reconciler, /verificationBoundary:\s*"source-and-fixture-only-no-real-postgresql-rls-or-concurrency-run"/, "reconciler contract records the sanitized local verification boundary");
assert.match(reconciler, /Number\.isFinite\(limit\)[\s\S]+?Number\.isInteger\(limit\)[\s\S]+?Paid reconciler claim limit is invalid\./, "reconciler adapter rejects non-finite and non-integer limits");
assert.match(reconciler, /Math\.min\(Math\.max\(limit,\s*0\),\s*commentTranslatorPaidReconcilerStoreContract\.maxBatchSize\)/, "reconciler adapter clamps a valid integer limit to its contract maximum");
assert.match(reconciler, /requestedLimit === undefined[\s\S]+?commentTranslatorPaidReconcilerStoreContract\.maxBatchSize/, "reconciler adapter preserves the optional default batch size");
assert.match(reconciler, /type CommentTranslatorPaidCircuitState\s*=\s*[\s\S]*?"closed"[\s\S]*?"degraded"[\s\S]*?"half_open"[\s\S]*?"disabled"/, "reconciler adapter exposes only the four sanitized circuit states");
assert.match(reconciler, /ct_paid_record_provider_circuit_failure[\s\S]+?p_provider:\s*request\.provider[\s\S]+?p_error_class:\s*request\.errorClass[\s\S]+?p_now:\s*request\.nowIso/, "failure adapter forwards the trusted circuit failure arguments");
assert.match(reconciler, /ct_paid_probe_provider_circuit[\s\S]+?p_provider:\s*request\.provider[\s\S]+?p_now:\s*request\.nowIso/, "probe adapter forwards the trusted circuit probe arguments");
assert.match(reconciler, /ct_paid_record_provider_circuit_success[\s\S]+?p_provider:\s*request\.provider[\s\S]+?p_probe_attempt_id:\s*request\.probeAttemptId \?\? null[\s\S]+?p_now:\s*request\.nowIso/, "success adapter forwards an omitted probe attempt as null");
assert.match(reconciler, /function readCircuitState[\s\S]+?\["closed",\s*"degraded",\s*"half_open",\s*"disabled"\][\s\S]+?throw new Error\(message\)/, "circuit-state RPC output is allowlisted and fails closed");
assert.doesNotMatch(reconciler, /\.from\s*\(/, "reconciler adapter has no direct table access");

const consent = read(stores[4][0]);
for (const required of ["recordConsent", "readConsent", "documentVersion", "ct_paid_record_consent"]) {
  assert.match(consent, new RegExp(required), `consent adapter supports ${required}`);
}

for (const [relativePath] of stores) {
  const source = read(relativePath);
  assert.doesNotMatch(source, /\b(?:rawStripePayload|rawProviderResponse|providerMessageIdValue|commentBody|secretValue)\s*:/i, `${relativePath} does not define forbidden persistence fields`);
}

console.log("comment translator Paid Core v1 store contract checks passed");
