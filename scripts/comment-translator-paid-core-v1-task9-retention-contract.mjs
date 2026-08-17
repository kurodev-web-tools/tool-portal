import assert from "node:assert/strict";
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
      return { shortCircuit: true, url: "data:text/javascript,export default {};#server-only" };
    }
    if (specifier === "@supabase/supabase-js") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export const createClient=()=>({rpc:async()=>({data:null,error:null})});export default {};#supabase"
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

const sourcePaths = {
  retention: "lib/comment-translator-paid-retention.ts",
  billingRuntime: "lib/comment-translator-billing-runtime.ts",
  reconciler: "lib/comment-translator-paid-control-plane-reconciler.ts",
  entitlementStore: "lib/comment-translator-paid-entitlement-store.ts",
  usageStore: "lib/comment-translator-paid-usage-store.ts",
  reconcilerStore: "lib/comment-translator-paid-reconciler-store.ts",
  observability: "lib/comment-translator-paid-sanitized-observability.ts",
  schedulerRoute: "app/api/comment-translator/paid-maintenance/route.ts",
  schedulerWorker: "workers/comment-translator-paid-open-next-wrapper.mjs",
  wrangler: "wrangler.jsonc",
  feedStore: "lib/comment-translator-real-comments-feed-durable-store.ts",
  feedBridge: "lib/comment-translator-real-comments-feed-session-bridge.ts",
  feedActions: "app/tools/comment-translator/feed-actions.ts",
  liveStep: "lib/comment-translator-live-provider-session-step.ts",
  feedMigration: "supabase/migrations/20260623000000_comment_translator_real_comments_feed_snapshots.sql",
  task9Migration: "supabase/migrations/20260814110000_comment_translator_paid_task9_retention_observability.sql",
  task: "task.md"
};
const tsconfig = JSON.parse(read("tsconfig.json"));

for (const [label, relativePath] of Object.entries(sourcePaths)) {
  assert.ok(exists(relativePath), `Task 9 ${label} exists: ${relativePath}`);
}

const sources = Object.fromEntries(
  Object.entries(sourcePaths).map(([label, relativePath]) => [label, read(relativePath)])
);

assert.match(sources.retention, /^import "server-only";/m, "retention runtime is server-only");
assert.match(sources.retention, /sessionEndedPlus24Hours|24\s*\*\s*60\s*\*\s*60\s*1_000/, "feed retention is session end plus 24 hours");
assert.match(sources.retention, /providerDetail.*30|30.*providerDetail/i, "provider detail retention is 30 days");
assert.match(sources.retention, /sessionSummary.*90|90.*sessionSummary/i, "session summary retention is 90 days");
assert.match(sources.retention, /stripeEvent.*90|90.*stripeEvent/i, "Stripe event retention is 90 days");
assert.match(sources.retention, /aggregate.*13|13.*aggregate/i, "aggregate retention is 13 months");
assert.match(sources.retention, /standard.*8[_ ]?KB|8\s*\*\s*1024/i, "feed snapshot standard size is 8KB");
assert.match(sources.retention, /hard.*64[_ ]?KB|64\s*\*\s*1024/i, "feed snapshot hard size is 64KB");
assert.match(sources.retention, /supabase-cron/i, "Supabase Cron is the standard scheduler");
assert.match(sources.retention, /cloudflare-cron-fallback/i, "Cloudflare Cron is fallback-only");
assert.match(sources.retention, /ct_paid_run_retention_cleanup/, "retention uses one bounded cleanup RPC");
assert.match(sources.retention, /rawProviderPayload|raw-provider-payload/, "retention names the raw-payload prohibition");
assert.match(sources.retention, /commentHash|comment-hash/, "retention names the comment-hash prohibition");
assert.match(sources.retention, /privateIdentifier|private-identifier/, "retention names the private-identifier prohibition");
assert.match(sources.retention, /callerAuthority/, "scheduler selection binds the invoking caller to the configured authority");
assert.match(sources.retention, /\*\/5 \* \* \* \*/, "Task 9 exposes one conservative five-minute scheduler contract");
assert.match(sources.retention, /existing-supabase-cron-binding-externally-unverified/, "Supabase Cron binding remains externally unverified");

assert.match(sources.wrangler, /"main"\s*:\s*"workers\/comment-translator-paid-open-next-wrapper\.mjs"/, "Wrangler uses the non-TypeScript custom OpenNext wrapper");
assert.match(sources.wrangler, /"crons"\s*:\s*\[\s*"\*\/5 \* \* \* \*"\s*\]/, "Wrangler defines exactly one bounded five-minute fallback trigger");
assert.doesNotMatch(sources.wrangler, /COMMENT_TRANSLATOR_PAID_CRON_TOKEN\s*[:=]\s*["'][^"']+/, "Wrangler does not contain a cron token value");
assert.match(sources.schedulerWorker, /import\s+generatedWorker\s+from\s+["']\.\.\/\.open-next\/worker\.js["']/, "custom Worker wraps the generated OpenNext handler");
assert.match(sources.schedulerWorker, /return\s+generatedWorker\.fetch\(request,\s*env,\s*ctx\)/, "custom Worker forwards fetch unchanged");
assert.match(sources.schedulerWorker, /COMMENT_TRANSLATOR_PAID_SCHEDULER_AUTHORITY\s*!==\s*["']cloudflare-cron-fallback["']/, "Cloudflare scheduled handler no-ops unless fallback authority is exact");
assert.match(sources.schedulerWorker, /maintenancePath\s*=\s*["']\/api\/comment-translator\/paid-maintenance["']/, "Cloudflare scheduled handler targets the existing maintenance route");
assert.match(sources.schedulerWorker, /openNextWorker\.fetch\(new Request\([\s\S]+?maintenancePath/, "Cloudflare scheduled handler invokes maintenance in-process");
assert.match(sources.schedulerWorker, /x-comment-translator-paid-cron-token[\s\S]+?x-comment-translator-paid-scheduler-authority/, "Cloudflare scheduled request supplies the existing token and authority headers");
assert.doesNotMatch(sources.schedulerWorker, /await\s+fetch\s*\(/, "Cloudflare scheduled handler makes no external network call");

assert.match(sources.reconciler, /^import "server-only";/m, "control-plane reconciler is server-only");
assert.match(sources.reconciler, /maxBatchSize:\s*50/, "control-plane batch is capped at 50");
assert.match(sources.reconciler, /leaseSeconds:\s*120/, "control-plane lease is 120 seconds");
for (const marker of [
  "checkout-expiry",
  "unbound-checkout-session",
  "payment-failure-seven-day",
  "cancel-pending",
  "refund-reconciliation",
  "dispute-reconciliation",
  "paid-unentitled-reconciliation",
  "billing-period-rollover",
  "utc-month-cost-rollover"
]) {
  assert.match(sources.reconciler, new RegExp(marker), `reconciler handles ${marker}`);
}
assert.match(sources.reconciler, /object-retrieval-failed/, "Stripe retrieval failure remains retryable");
assert.match(sources.reconciler, /capacity.*retain|retain.*capacity/i, "reconciler keeps capacity on retryable failure");
assert.match(sources.reconciler, /sanitized.*count|aggregate.*only/i, "reconciler result is sanitized");
assert.match(sources.reconciler, /markFailureSafe/, "reconciler has a fail-closed safety transition before backoff");
for (const actionName of [
  "checkoutExpiry",
  "unboundCheckoutSession",
  "paymentFailureSevenDay",
  "cancelPending",
  "refundReconciliation",
  "disputeReconciliation",
  "paidUnentitledReconciliation",
  "billingPeriodRollover",
  "utcMonthCostRollover"
]) {
  assert.match(sources.reconciler, new RegExp(actionName), `reconciler exposes concrete action ${actionName}`);
}
assert.match(sources.reconciler, /opaqueLeaseContext/, "reconciler passes an opaque lease context to every action");
assert.doesNotMatch(sources.reconciler, /isCurrentBoundedLease/, "reconciler does not accept leases using the app clock");
assert.match(sources.reconciler, /assertLeaseActive/g, "reconciler uses the trusted lease assertion seam");
assert.match(sources.reconciler, /createCommentTranslatorPaidControlPlaneActionImplementation/, "reconciler exposes the named authoritative action factory");
assert.match(sources.reconciler, /createCommentTranslatorPaidControlPlaneAuthoritativeActions/, "reconciler exposes RPC-backed authoritative actions");
assert.match(sources.reconciler, /createCommentTranslatorPaidControlPlaneWorkItemResolver/, "reconciler exposes a durable work-item resolver");
assert.match(sources.reconciler, /retrieveCurrentObjectState/, "reconciler re-reads current Stripe objects before transition");
assert.match(sources.reconciler, /checkoutExpiryAdapter/, "reconciler accepts an optional trusted Checkout expiry adapter");
assert.match(sources.schedulerRoute, /checkoutExpiryAdapter:[\s\S]{0,160}expireCheckoutSession:\s*stripeAdapter\.expireCheckoutSession/, "maintenance route wires the trusted Stripe Checkout expiry operation");
assert.match(sources.schedulerRoute, /paidPlanAuthority:\s*\{[\s\S]{0,240}productId:\s*process\.env\.COMMENT_TRANSLATOR_STRIPE_PAID_PRODUCT_ID\?\.trim\(\)[\s\S]{0,160}priceId:\s*process\.env\.COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID\?\.trim\(\)/, "maintenance route passes trimmed configured Paid Product and Price authority");
assert.match(sources.reconciler, /retrieveCurrentSubscriptionAdjustmentState/, "refund and dispute reconciliation use the current adjustment graph boundary");
assert.match(sources.billingRuntime, /refundList\.has_more\s*!==\s*false/, "current adjustment graph rejects incomplete refund lists");
assert.match(sources.billingRuntime, /disputeList\.has_more\s*!==\s*false/, "current adjustment graph rejects incomplete dispute lists");
assert.match(sources.reconciler, /projectEntitlement/, "reconciler projects the durable entitlement after current-state reconciliation");
assert.match(sources.reconciler, /closeBillingPeriod/, "reconciler closes the personal billing period through the usage authority");
assert.match(sources.reconciler, /closeUtcMonth/, "reconciler closes the UTC cost month through the usage authority");
for (const operationName of [
  "expireCheckoutSession",
  "reconcileUnboundCheckoutSession",
  "reconcilePaymentFailureAfterSevenDays",
  "applyCancelPending",
  "reconcileRefund",
  "reconcileDispute",
  "reconcilePaidUnentitled",
  "rollOverBillingPeriod",
  "rollOverUtcMonthCost"
]) {
  assert.match(sources.reconciler, new RegExp(operationName), `reconciler names authoritative operation ${operationName}`);
}
assert.match(sources.reconciler, /createCommentTranslatorPaidControlPlaneInvocation/, "reconciler exposes one explicit server-only invocation seam");
assert.doesNotMatch(sources.reconciler, /inferWorkKind/, "resolver does not infer DB-due work from an app clock");
assert.match(sources.reconcilerStore, /markFailureSafe/, "reconciler store exposes the fail-closed transition");
assert.match(sources.reconcilerStore, /ct_paid_mark_reconcile_failure_safe/, "reconciler store calls the trusted failure-safety RPC");
assert.match(sources.reconcilerStore, /p_work_kind/, "failure-safety RPC receives the sanitized work kind");
assert.match(sources.reconcilerStore, /work_kind/, "reconciler claim preserves the durable work kind");
assert.equal((sources.schedulerRoute.match(/import \{ timingSafeEqual \} from "node:crypto";/g) ?? []).length, 1, "maintenance route has exactly one timingSafeEqual import");
assert.match(sources.schedulerRoute, /export const dynamic\s*=\s*["']force-dynamic["'];/, "maintenance route keeps runtime configuration dynamic");
assert.match(sources.schedulerRoute, /x-comment-translator-paid-scheduler-authority/i, "maintenance route requires an explicit scheduler caller authority");
assert.doesNotMatch(sources.schedulerRoute, /runUtcMonthRollover/, "UTC rollover is not invoked outside the leased reconciler seam");
assert.match(sources.billingRuntime, /idempotencyKey:\s*createWebhookTerminalCancellationIdempotencyKey/, "Webhook terminal cancellation uses a stable idempotency key");
assert.match(sources.billingRuntime, /eventType\.startsWith\("charge\.dispute\."\)[\s\S]{0,300}(?:status === "lost"|funds_withdrawn)/, "Webhook dispute-lost path reaches terminal cancellation policy");
assert.match(sources.billingRuntime, /eventType\.startsWith\("refund\."\)[\s\S]{0,300}adjustment\?\.successful[\s\S]{0,200}adjustment\.fullAmount[\s\S]{0,200}adjustment\.targetsCurrentPeriod/, "Webhook current-period full-refund path reaches terminal cancellation policy");

assert.match(sources.observability, /^import "server-only";/m, "Paid observability is server-only");
for (const marker of ["capacity", "entitlement", "provider", "cost", "infra", "lastSuccessAtIso", "staleCount"]) {
  assert.match(sources.observability, new RegExp(marker, "i"), `admin visibility includes ${marker}`);
}
assert.match(sources.observability, /rawCommentText.*never-recorded-by-design|raw-comment-text/, "admin visibility forbids raw comments");
assert.match(sources.observability, /ownerUserId.*never-returned-by-design|owner-user-id-value/, "admin visibility forbids owner identifiers");
assert.match(sources.observability, /ct_paid_read_sanitized_admin_visibility/, "admin visibility has a trusted aggregate read adapter");

const persistBlockStart = sources.feedStore.indexOf("async persistSafeFeed");
const persistBlockEnd = sources.feedStore.indexOf("async readSafeFeed", persistBlockStart);
assert.ok(persistBlockStart >= 0 && persistBlockEnd > persistBlockStart, "feed persist block is present");
const persistBlock = sources.feedStore.slice(persistBlockStart, persistBlockEnd);
assert.match(persistBlock, /select\(["']id, display_row_count["']\)/, "feed upsert reads back only id and count");
assert.doesNotMatch(persistBlock, /trustedSelectColumns/, "feed upsert does not read back the full feed row");
assert.doesNotMatch(persistBlock, /\.eq\(["']owner_user_id["'][\s\S]*\.single\(\)/, "feed upsert does not issue a second full-row read");
assert.match(sources.feedStore, /standardFeedSnapshotBytes|hardFeedSnapshotBytes|64\s*\*\s*1024/, "feed store enforces the bounded snapshot size");
assert.match(sources.feedStore, /durableFeedSnapshotRowKeys/, "feed persistence uses an explicit projection allowlist");
assert.match(sources.feedStore, /restoreCommentTranslatorRealCommentsFeedState/, "feed persistence reconstructs browser-safe restored state");
assert.match(sources.liveStep, /createCommentTranslatorSafeFeedConvergenceKey/, "first poll converges restored rows through browser-safe projection fields");

assert.match(sources.feedMigration, /session_reference_id/, "feed migration retains the session key");
assert.match(sources.task9Migration, /create or replace function public\.ct_paid_run_retention_cleanup/, "Task 9 migration defines the bounded cleanup RPC");
assert.match(sources.task9Migration, /stopped_at\s*\+\s*interval\s*'24 hours'/i, "cleanup uses session end plus 24 hours");
assert.match(sources.task9Migration, /interval\s*'30 days'/i, "cleanup uses 30-day provider detail cutoff");
assert.match(sources.task9Migration, /interval\s*'90 days'/i, "cleanup uses 90-day session and Stripe cutoffs");
assert.match(sources.task9Migration, /date_trunc\('month',\s*v_now\s+at\s+time\s+zone\s+'UTC'\)\s*-\s*interval\s*'13 months'/i, "cleanup uses the TS-equivalent UTC calendar-month cutoff");
assert.doesNotMatch(sources.task9Migration, /(?:period_end|updated_at)\s*<=?\s*v_now\s*-\s*interval\s*'13 months'/i, "aggregate and ended-subscription cleanup never use a rolling 13-month timestamp");
assert.match(sources.task9Migration, /for update[\s\S]{0,80}skip locked/i, "cleanup claims bounded rows with skip-locked semantics");
assert.match(sources.task9Migration, /grant execute on function public\.ct_paid_run_retention_cleanup[\s\S]*to service_role/i, "cleanup is service-role only");
assert.match(sources.task9Migration, /create or replace function public\.ct_paid_invoke_maintenance_http\([\s\S]+?security definer/i, "Task 9 migration defines the Supabase Cron HTTP invocation function");
const supabaseCronInvocationBlock = sources.task9Migration.slice(
  sources.task9Migration.indexOf("create or replace function public.ct_paid_invoke_maintenance_http"),
  sources.task9Migration.indexOf("create or replace function public.ct_paid_run_retention_cleanup")
);
assert.match(supabaseCronInvocationBlock, /p_authority\s+text\s+default\s+'supabase-cron'[\s\S]+?p_authority\s+is\s+distinct\s+from\s+'supabase-cron'/i, "Supabase invocation accepts only the standard authority");
assert.match(supabaseCronInvocationBlock, /https:\/\/[\s\S]+?api\/comment-translator\/paid-maintenance/i, "Supabase invocation rejects a malformed maintenance URL");
assert.match(supabaseCronInvocationBlock, /p_cron_token[\s\S]+?raise exception 'paid maintenance invocation configuration is not valid'/i, "Supabase invocation rejects a malformed token");
assert.match(supabaseCronInvocationBlock, /to_regprocedure\('net\.http_get\(text,jsonb,jsonb,integer\)'\)[\s\S]+?execute/i, "Supabase invocation guards and dynamically calls pg_net");
assert.match(supabaseCronInvocationBlock, /x-comment-translator-paid-cron-token[\s\S]+?x-comment-translator-paid-scheduler-authority/i, "Supabase invocation passes the existing token and standard authority headers");
assert.doesNotMatch(supabaseCronInvocationBlock, /returns\s+(?:text|json|jsonb|bigint|table)/i, "Supabase invocation does not return URL, token, or request identifiers");
assert.match(sources.task9Migration, /comment on function public\.ct_paid_invoke_maintenance_http[\s\S]+?\*\/5 \* \* \* \*[\s\S]+?existing Supabase Cron/i, "migration exposes the sanitized Supabase Cron name and schedule contract");
const stripeReceiptCleanupStart = sources.task9Migration.indexOf(
  "receipt.receipt_status",
  sources.task9Migration.indexOf("create or replace function public.ct_paid_run_retention_cleanup")
);
const stripeReceiptCleanupBlock = sources.task9Migration.slice(
  Math.max(0, stripeReceiptCleanupStart - 300),
  sources.task9Migration.indexOf("get diagnostics v_stripe_event_deleted", stripeReceiptCleanupStart)
);
assert.match(stripeReceiptCleanupBlock, /receipt\.receipt_status\s*=\s*'processing'[\s\S]+?receipt\.lease_until\s*>\s*v_now/i, "receipt cleanup retains an active processing lease using statement time");
assert.match(stripeReceiptCleanupBlock, /receipt\.lease_token/i, "receipt cleanup contract uses the existing lease token column without introducing a replacement lease field");
assert.match(stripeReceiptCleanupBlock, /for update of receipt skip locked/i, "receipt cleanup preserves bounded skip-locked claiming");
assert.match(sources.task9Migration, /ct_paid_read_sanitized_admin_visibility/, "migration provides a minimal sanitized admin aggregate RPC");
const task9ExpireRequiredMarker = sources.task9Migration.slice(
  sources.task9Migration.indexOf("create or replace function public.ct_paid_mark_checkout_expire_required"),
  sources.task9Migration.indexOf("do $$", sources.task9Migration.indexOf("create or replace function public.ct_paid_mark_checkout_expire_required"))
);
assert.match(task9ExpireRequiredMarker, /p_owner_user_id\s+uuid[\s\S]+?p_now\s+timestamptz\s+default\s+now\(\)/i, "Task 9 preserves the Task 2 expire-required marker signature");
assert.match(task9ExpireRequiredMarker, /security definer[\s\S]+?set search_path = pg_catalog, public/i, "Task 9 marker preserves trusted function security");
assert.match(task9ExpireRequiredMarker, /lifecycle_state not in \('checkout_hold', 'incomplete', 'expire_required'\)/i, "Task 9 marker safely accepts incomplete unbound recovery");
assert.match(task9ExpireRequiredMarker, /comment_translator_paid_subscription_bindings[\s\S]+?v_subscription\.id is not null[\s\S]+?binding conflict/i, "Task 9 marker rejects every subscription-bound lifecycle");
assert.match(task9ExpireRequiredMarker, /reservation_state <> 'held'[\s\S]+?stripe_checkout_session_id <> p_stripe_checkout_session_id/i, "Task 9 marker preserves capacity and immutable Session identity checks");
assert.match(task9ExpireRequiredMarker, /grant execute on function public\.ct_paid_mark_checkout_expire_required\([\s\S]+?to service_role/i, "Task 9 marker remains service-role only");
assert.match(sources.task9Migration, /comment_translator_paid_scheduler_runs/, "migration stores sanitized scheduler run aggregates");
assert.match(sources.task9Migration, /comment_translator_paid_maintenance_work_items/, "migration defines the durable UTC rollover singleton work item");
assert.doesNotMatch(sources.task9Migration, /insert into public\.comment_translator_paid_external_id_tombstones[\s\S]{0,300}stripe_subscription_id/i, "Task 9 does not copy raw subscription IDs into indefinite tombstones");
assert.match(sources.task9Migration, /last_success_at\s*=\s*case[\s\S]{0,200}when excluded\.run_status = 'success'/i, "failed or stale scheduler rows preserve prior last success");
assert.match(sources.task9Migration, /ct_paid_record_sanitized_scheduler_run/, "migration provides a sanitized scheduler metrics write RPC");
assert.match(sources.task9Migration, /scheduler_last_success_at|last_success_at/, "admin visibility includes the scheduler last-success timestamp");
assert.match(sources.task9Migration, /scheduler_claim_count|claim_count/, "admin visibility includes scheduler claim counts");
assert.match(sources.task9Migration, /scheduler_retry_count|retry_count/, "admin visibility includes scheduler retry counts");
assert.match(sources.task9Migration, /scheduler_stale_count|stale_count/, "admin visibility includes scheduler stale counts");
assert.match(sources.task9Migration, /scheduler_error_class_counts|error_class_counts/, "admin visibility includes sanitized scheduler error classes");
assert.match(sources.task9Migration, /scheduler_attempt_alert_count\s+integer/i, "admin visibility exposes one sanitized high-attempt aggregate");
assert.match(
  sources.task9Migration,
  /comment_translator_paid_billing_lifecycles[\s\S]+?reconcile_attempt_count\s*>=\s*5[\s\S]+?comment_translator_paid_maintenance_work_items[\s\S]+?reconcile_attempt_count\s*>=\s*5/i,
  "attempt alert aggregate counts lifecycle and singleton maintenance work at five or more attempts"
);
assert.match(sources.task9Migration, /else\s+21600\s+end/i, "high-attempt reconciliation retains the existing six-hour backoff");
assert.match(sources.task9Migration, /provider_circuit_status\s+text/i, "admin visibility exposes one sanitized provider circuit status");
assert.match(sources.task9Migration, /when exists[\s\S]+?circuit_state = 'disabled'[\s\S]+?'disabled'[\s\S]+?circuit_state = 'half_open'[\s\S]+?'half_open'[\s\S]+?circuit_state = 'degraded'[\s\S]+?'degraded'[\s\S]+?else 'closed'/i, "provider circuit status uses disabled, half-open, degraded, closed priority");
assert.match(sources.task9Migration, /pg_total_relation_size/, "admin database size reads use the real PostgreSQL relation-size function");
const dbSizeBlock = sources.task9Migration.slice(
  sources.task9Migration.indexOf("db_size as ("),
  sources.task9Migration.indexOf("\n  )\n  select", sources.task9Migration.indexOf("db_size as ("))
);
assert.match(dbSizeBlock, /pg_catalog\.pg_class/i, "database size enumerates PostgreSQL relations");
assert.match(dbSizeBlock, /pg_catalog\.pg_namespace/i, "database size scopes relations by namespace");
assert.match(dbSizeBlock, /nspname\s*=\s*'public'/i, "database size includes all public user relations");
assert.match(dbSizeBlock, /relkind\s+in\s*\(\s*'r'\s*,\s*'p'\s*,\s*'m'\s*\)/i, "database size includes tables, partitions, and materialized views without separate indexes");
assert.doesNotMatch(dbSizeBlock, /unnest\s*\(\s*array|relkind\s+in\s*\([^)]*'i'/i, "database size is not a fixed Paid list and does not double-count indexes");
const representativePublicRelationFixture = [
  { schema: "public", name: "comment_translator_sessions", relkind: "r" },
  { schema: "public", name: "comment_translator_usage_ledger_events", relkind: "r" },
  { schema: "public", name: "youtube_oauth_credentials", relkind: "r" },
  { schema: "public", name: "comment_translator_monthly_rollup", relkind: "m" },
  { schema: "public", name: "comment_translator_usage_partition", relkind: "p" },
  { schema: "public", name: "comment_translator_sessions_pkey", relkind: "i" },
  { schema: "private", name: "private_relation", relkind: "r" }
];
assert.deepEqual(
  representativePublicRelationFixture
    .filter(({ schema, relkind }) => schema === "public" && ["r", "p", "m"].includes(relkind))
    .map(({ name }) => name),
  [
    "comment_translator_sessions",
    "comment_translator_usage_ledger_events",
    "youtube_oauth_credentials",
    "comment_translator_monthly_rollup",
    "comment_translator_usage_partition"
  ],
  "public relation scope includes representative Free tables and excludes separately counted indexes"
);
assert.match(sources.task9Migration, /current_setting\('app\.ct_paid_retention_cleanup', true\)[\s\S]+?tg_table_name\s*=\s*'comment_translator_paid_subscription_bindings'/i, "retention bypass is transaction-local and subscription-only");
const retentionGuardBlock = sources.task9Migration.slice(
  sources.task9Migration.indexOf("create or replace function public.comment_translator_paid_immutable_binding_guard"),
  sources.task9Migration.indexOf("create or replace function public.ct_paid_run_retention_cleanup")
);
assert.match(retentionGuardBlock, /is_terminal\s*=\s*true[\s\S]+?interval '13 months'[\s\S]+?entitlement_status in \('active', 'cancel_at_period_end', 'past_due', 'unpaid'\)/i, "forged retention context still cannot delete active or within-cutoff subscriptions");
assert.match(sources.task9Migration, /is_terminal\s*=\s*true[\s\S]+?updated_at\s*<\s*v_calendar_month_cutoff[\s\S]+?delete from public\.comment_translator_paid_subscription_bindings/i, "only terminal subscription references older than the calendar cutoff are deleted");
assert.match(sources.task9Migration, /external_id_kind\s*=\s*'subscription'[\s\S]+?created_at\s*<\s*v_calendar_month_cutoff[\s\S]+?delete from public\.comment_translator_paid_external_id_tombstones/i, "subscription tombstones are bounded by the same retention cutoff");
assert.match(sources.task9Migration, /v_ended_subscription_deleted\s*:=\s*v_ended_subscription_deleted\s*\+\s*v_deleted/i, "ended subscription deletion count is derived from bounded deletes");
assert.match(sources.task9Migration, /create or replace function public\.ct_paid_mark_reconcile_failure_safe/, "migration provides a fail-closed reconcile failure transition");
assert.match(sources.task9Migration, /paid_unentitled_reconciliation[\s\S]+?reservation_state in \('held', 'consuming'\)/i, "failure transition stops Paid while retaining capacity");
assert.match(sources.task9Migration, /period_state\s*=\s*'closing'[\s\S]+?bucket_state\s*=\s*'closing'/i, "failure transition durably blocks billing-period and UTC-month rollover");
assert.match(sources.task9Migration, /drop function if exists public\.ct_paid_mark_reconcile_failure_safe\(uuid, uuid, text, timestamptz\)/i, "migration removes the prior failure-safety signature before reapply");
assert.match(sources.task9Migration, /p_work_kind\s+text/i, "failure-safety migration accepts a sanitized work kind");
assert.match(sources.task9Migration, /p_work_kind\s*=\s*'billing-period-rollover'[\s\S]+?comment_translator_paid_billing_period_usage[\s\S]+?comment_translator_paid_owner_cost_buckets/i, "billing rollover failure closes only personal billing and owner cost periods");
assert.match(sources.task9Migration, /p_work_kind\s*=\s*'utc-month-cost-rollover'[\s\S]+?comment_translator_paid_global_cost_buckets[\s\S]+?comment_translator_paid_azure_fallback_buckets/i, "UTC rollover failure closes global cost periods");
assert.match(
  sources.task9Migration,
  /case\s+when lifecycle\.lifecycle_state = 'expire_required'\s+then 'checkout-expiry'[\s\S]+?when lifecycle\.lifecycle_state in \('checkout_hold', 'incomplete'\)[\s\S]+?then 'unbound-checkout-session'[\s\S]+?when lifecycle\.lifecycle_state in \('past_due', 'unpaid'\)[\s\S]+?interval '7 days'[\s\S]+?then 'payment-failure-seven-day'/i,
  "claim derives checkout and seven-day payment-failure work from current lifecycle state before any stored kind"
);
assert.doesNotMatch(
  sources.task9Migration,
  /when lifecycle\.reconcile_work_kind is not null\s+then lifecycle\.reconcile_work_kind/i,
  "claim never gives an unconditional stale stored work kind priority"
);
const durableScheduleFunction = sources.task9Migration.slice(
  sources.task9Migration.indexOf("create or replace function public.ct_paid_schedule_durable_reconciliation"),
  sources.task9Migration.indexOf("drop trigger if exists comment_translator_paid_durable_reconcile_schedule")
);
assert.match(durableScheduleFunction, /comment_translator_paid_subscription_bindings[\s\S]+?and not v_has_subscription_binding[\s\S]+?then 'unbound-checkout-session'/i, "trigger classifies unbound Checkout work only when both Checkout and Subscription bindings are absent");
assert.match(durableScheduleFunction, /when new\.lifecycle_state in \('active', 'cancel_at_period_end'\)[\s\S]+?then 'billing-period-rollover'/i, "active lifecycle is claimable only for a due billing rollover");
assert.match(durableScheduleFunction, /if v_state_work_kind is not null then[\s\S]+?else[\s\S]+?new\.reconcile_work_kind := null;[\s\S]+?new\.next_reconcile_at := null;/i, "normal active recovery clears incompatible checkout-expiry, unbound, and paid-unentitled work");
const claimReconcilerFunction = sources.task9Migration.slice(
  sources.task9Migration.indexOf("create function public.ct_paid_claim_reconciler"),
  sources.task9Migration.indexOf("revoke all on function public.ct_paid_claim_reconciler")
);
assert.match(claimReconcilerFunction, /comment_translator_paid_checkout_session_bindings[\s\S]+?comment_translator_paid_subscription_bindings[\s\S]+?then 'unbound-checkout-session'/i, "claim classifies unbound Checkout work only when both bindings are absent");
assert.match(
  claimReconcilerFunction,
  /when lifecycle\.lifecycle_state = 'paid_unentitled_reconciliation'[\s\S]+?then lifecycle\.paid_unentitled_operator_disposition is not null/i,
  "paid-unentitled rows without an operator disposition are not claimable"
);
let priorClaimPriorityIndex = -1;
for (const priorityMarker of [
  "when lifecycle.lifecycle_state = 'expire_required' then 'checkout-expiry'",
  ") then 'unbound-checkout-session'",
  "when lifecycle.lifecycle_state in ('checkout_hold', 'incomplete') then 'checkout-expiry'",
  "when lifecycle.lifecycle_state in ('past_due', 'unpaid')",
  "when lifecycle.lifecycle_state = 'cancel_pending' then 'cancel-pending'",
  "when lifecycle.lifecycle_state = 'refund_reconciliation' then 'refund-reconciliation'",
  "when lifecycle.lifecycle_state in ('dispute', 'dispute_reconciliation') then 'dispute-reconciliation'",
  "and lifecycle.paid_unentitled_operator_disposition is not null",
  ") then 'billing-period-rollover'"
]) {
  const priorityIndex = claimReconcilerFunction.indexOf(priorityMarker, priorClaimPriorityIndex + 1);
  assert.ok(priorityIndex > priorClaimPriorityIndex, `claim state priority includes ${priorityMarker}`);
  priorClaimPriorityIndex = priorityIndex;
}
assert.match(
  claimReconcilerFunction,
  /next_reconcile_at\s+is\s+null[\s\S]+?lifecycle_state\s+in\s*\([\s\S]*?'cancel_pending'[\s\S]*?'refund_reconciliation'[\s\S]*?'dispute_reconciliation'[\s\S]*?'paid_unentitled_reconciliation'/i,
  "NULL-due rows remain claimable only when current state derives durable reconciliation work"
);
assert.match(
  sources.task9Migration,
  /create trigger comment_translator_paid_durable_reconcile_schedule[\s\S]+?before insert or update[\s\S]+?comment_translator_paid_billing_lifecycles/i,
  "eligible lifecycle transitions atomically assign durable reconciliation work and due time"
);
assert.match(
  sources.task9Migration,
  /with authoritative_backfill as[\s\S]+?resolved_work_kind[\s\S]+?update public\.comment_translator_paid_billing_lifecycles lifecycle[\s\S]+?reconcile_work_kind\s*=\s*authoritative_backfill\.resolved_work_kind[\s\S]+?when authoritative_backfill\.resolved_work_kind is null then null/i,
  "migration backfill derives current work and clears incompatible stale work and due time"
);
const authoritativeBackfill = sources.task9Migration.slice(
  sources.task9Migration.indexOf("with authoritative_backfill as"),
  sources.task9Migration.indexOf("create index if not exists comment_translator_paid_reconcile_work_kind_due_idx")
);
assert.match(authoritativeBackfill, /comment_translator_paid_checkout_session_bindings[\s\S]+?comment_translator_paid_subscription_bindings[\s\S]+?then 'unbound-checkout-session'/i, "backfill classifies unbound Checkout work only when both bindings are absent");
const failureSafeDerivation = sources.task9Migration.slice(
  sources.task9Migration.indexOf("create or replace function public.ct_paid_mark_reconcile_failure_safe"),
  sources.task9Migration.indexOf("create or replace function public.ct_paid_record_sanitized_scheduler_run")
);
assert.match(failureSafeDerivation, /comment_translator_paid_checkout_session_bindings[\s\S]+?comment_translator_paid_subscription_bindings[\s\S]+?then 'unbound-checkout-session'/i, "failure safety classifies unbound Checkout work only when both bindings are absent");
assert.match(sources.task9Migration, /paid_unentitled_operator_disposition is null[\s\S]+?'refund-cancel'[\s\S]+?'capacity-correction-approved'/i, "operator disposition defaults fail closed and accepts only bounded values");
assert.match(sources.task9Migration, /ct_paid_set_paid_unentitled_operator_disposition[\s\S]+?revoke all[\s\S]+?to service_role/i, "only the trusted service role can set an operator disposition");
assert.match(sources.task9Migration, /ct_paid_apply_paid_unentitled_disposition[\s\S]+?for update[\s\S]+?reconcile_lease_token is distinct from p_reconcile_lease_token[\s\S]+?paid_unentitled_operator_disposition is distinct from p_operator_disposition/i, "disposition projection rejects stale leases and disposition reuse");
assert.match(sources.task9Migration, /capacity-correction-approved[\s\S]+?p_entitlement_status is not distinct from 'active'[\s\S]+?p_lifecycle_state is not distinct from 'active'[\s\S]+?p_subscription_status is not distinct from 'active'[\s\S]+?p_entitlement_status is not distinct from 'cancel_at_period_end'[\s\S]+?p_lifecycle_state is not distinct from 'cancel_at_period_end'[\s\S]+?p_subscription_status is not distinct from 'active'/i, "capacity correction accepts only validated current active or cancel-at-period-end Paid projection states and rejects nulls");
assert.match(sources.task9Migration, /refund-cancel[\s\S]+?p_entitlement_status is distinct from 'canceled'[\s\S]+?p_subscription_status is distinct from 'canceled'/i, "refund disposition projection validation remains canceled-only and fails closed on null or mismatch");
assert.match(sources.task9Migration, /ct_paid_assert_reconcile_lease_active[\s\S]+?statement_timestamp\(\)[\s\S]+?comment_translator_paid_billing_lifecycles[\s\S]+?comment_translator_paid_maintenance_work_items/i, "trusted lease assertion uses DB time for lifecycle and maintenance work");
assert.match(sources.reconcilerStore, /ct_paid_assert_reconcile_lease_active/, "reconciler store exposes the DB-authoritative lease assertion RPC");
assert.match(sources.task9Migration, /ct_paid_project_entitlement\([\s\S]+?paid_unentitled_operator_disposition\s*=\s*null/i, "projection and disposition consumption share one trusted transaction");
assert.match(sources.entitlementStore, /ct_paid_apply_paid_unentitled_disposition/, "trusted store uses the disposition-gated projection RPC");
assert.doesNotMatch(
  claimReconcilerFunction,
  /next_reconcile_at\s+is\s+null[\s\S]{0,200}lifecycle_state\s*=\s*'active'/i,
  "NULL due-time fallback does not make every active lifecycle claimable"
);
assert.match(sources.task9Migration, /create or replace function public\.ct_paid_close_billing_period_reconciled[\s\S]+?reconcile_lease_token\s*=\s*p_reconcile_lease_token[\s\S]+?reconcile_work_kind\s*=\s*'billing-period-rollover'[\s\S]+?ct_paid_close_billing_period/i, "billing close wrapper validates the lifecycle lease in the close transaction");
assert.match(sources.task9Migration, /create or replace function public\.ct_paid_close_utc_month_reconciled[\s\S]+?reconcile_lease_token\s*=\s*p_reconcile_lease_token[\s\S]+?work_kind\s*=\s*'utc-month-cost-rollover'[\s\S]+?ct_paid_close_utc_month/i, "UTC close wrapper validates the maintenance lease in the close transaction");
const utcCloseWrapper = sources.task9Migration.slice(
  sources.task9Migration.indexOf("create or replace function public.ct_paid_close_utc_month_reconciled"),
  sources.task9Migration.indexOf("revoke all on function public.ct_paid_close_utc_month_reconciled")
);
assert.match(utcCloseWrapper, /min\(overdue\.utc_month\)[\s\S]+?into v_oldest_open_month/i, "UTC recovery selects the oldest open overdue month");
assert.match(utcCloseWrapper, /ct_paid_close_utc_month\(v_oldest_open_month, p_now\)[\s\S]+?into v_more_overdue[\s\S]+?return v_more_overdue/i, "UTC recovery closes one oldest month and reports whether another bounded claim is due");
assert.match(sources.usageStore, /ct_paid_close_billing_period_reconciled[\s\S]+?p_lifecycle_id[\s\S]+?p_reconcile_lease_token/i, "usage store calls the lease-bound billing close RPC");
assert.match(sources.usageStore, /ct_paid_close_utc_month_reconciled[\s\S]+?p_work_item_id[\s\S]+?p_reconcile_lease_token/i, "usage store calls the lease-bound UTC close RPC");
const billingRolloverFailureBlock = sources.task9Migration.slice(
  sources.task9Migration.indexOf("if p_work_kind = 'billing-period-rollover'"),
  sources.task9Migration.indexOf("if p_work_kind = 'utc-month-cost-rollover'")
);
const utcRolloverFailureBlock = sources.task9Migration.slice(
  sources.task9Migration.indexOf("if p_work_kind = 'utc-month-cost-rollover'", sources.task9Migration.indexOf("if p_work_kind = 'billing-period-rollover'")),
  sources.task9Migration.indexOf("return true", sources.task9Migration.indexOf("if p_work_kind = 'utc-month-cost-rollover'", sources.task9Migration.indexOf("if p_work_kind = 'billing-period-rollover'")))
);
assert.doesNotMatch(billingRolloverFailureBlock, /p_error_class/, "every allowlisted sanitized error class fail-closes billing rollover periods");
assert.doesNotMatch(utcRolloverFailureBlock, /p_error_class/, "every allowlisted sanitized error class fail-closes UTC rollover periods");
const failureSafeFunction = sources.task9Migration.slice(
  sources.task9Migration.indexOf("create or replace function public.ct_paid_mark_reconcile_failure_safe"),
  sources.task9Migration.indexOf("revoke all on function public.ct_paid_mark_reconcile_failure_safe")
);
const maintenanceFailureBranch = failureSafeFunction.slice(
  failureSafeFunction.indexOf("if p_work_kind = 'utc-month-cost-rollover'"),
  failureSafeFunction.indexOf("select *", failureSafeFunction.indexOf("if p_work_kind = 'utc-month-cost-rollover'"))
);
assert.ok(maintenanceFailureBranch.indexOf("reconcile_lease_token = p_reconcile_lease_token") < maintenanceFailureBranch.indexOf("comment_translator_paid_global_cost_buckets"), "UTC failure-safe validates its maintenance lease before closing buckets");
assert.ok(maintenanceFailureBranch.indexOf("comment_translator_paid_global_cost_buckets") < maintenanceFailureBranch.indexOf("return true"), "UTC failure-safe closes global buckets before returning");
assert.ok(maintenanceFailureBranch.indexOf("comment_translator_paid_azure_fallback_buckets") < maintenanceFailureBranch.indexOf("return true"), "UTC failure-safe closes Azure buckets before returning");
assert.match(failureSafeFunction, /p_work_kind is distinct from v_authoritative_work_kind[\s\S]+?raise exception 'stale reconcile work kind is not valid for failure safety'/i, "failure safety rejects a stale kind that no longer matches current lifecycle state");
assert.match(failureSafeFunction, /reconcile_work_kind\s*=\s*p_work_kind[\s\S]+?p_work_kind in \('paid-unentitled-reconciliation', 'billing-period-rollover'\)[\s\S]+?entitlement_status\s*=\s*'paid_unentitled_reconciliation'[\s\S]+?reservation_state in \('held', 'consuming'\)/i, "billing rollover failure preserves its authoritative work kind and held or consuming capacity while stopping entitlement");
assert.doesNotMatch(sources.task9Migration, /create table[^;]*(raw|payload|comment_hash|secret|private_id)/i, "Task 9 migration does not create raw or secret storage");

const calendarCutoffMs = Date.parse("2025-07-01T00:00:00.000Z");
const subscriptionRetentionFixture = [
  { label: "active old", terminal: false, status: "active", updatedAt: "2024-01-01T00:00:00.000Z" },
  { label: "terminal within 13 months", terminal: true, status: "canceled", updatedAt: "2025-07-01T00:00:00.000Z" },
  { label: "terminal beyond 13 months", terminal: true, status: "canceled", updatedAt: "2025-06-30T23:59:59.999Z" }
];
const retainedSubscriptionLabels = subscriptionRetentionFixture
  .filter((row) => !(row.terminal && row.status !== "active" && Date.parse(row.updatedAt) < calendarCutoffMs))
  .map((row) => row.label);
const deletedSubscriptionLabels = subscriptionRetentionFixture
  .filter((row) => row.terminal && row.status !== "active" && Date.parse(row.updatedAt) < calendarCutoffMs)
  .map((row) => row.label);
assert.deepEqual(retainedSubscriptionLabels, ["active old", "terminal within 13 months"], "active and within-cutoff subscription references are retained");
assert.deepEqual(deletedSubscriptionLabels, ["terminal beyond 13 months"], "only terminal references beyond the UTC calendar cutoff are eligible");
const deletedSubscriptionSet = new Set(deletedSubscriptionLabels);
const repeatedCleanupLabels = subscriptionRetentionFixture
  .filter((row) => !deletedSubscriptionSet.has(row.label))
  .filter((row) => row.terminal && row.status !== "active" && Date.parse(row.updatedAt) < calendarCutoffMs)
  .map((row) => row.label);
assert.deepEqual(repeatedCleanupLabels, [], "a repeated cleanup has no already-deleted reference to remove");

const receiptStatementTimeMs = Date.parse("2026-08-14T12:00:00.000Z");
const receiptRetentionFixture = [
  { label: "active processing lease", receipt_status: "processing", lease_until: "2026-08-14T12:00:01.000Z", lease_token: "active-lease", createdAt: "2026-05-01T00:00:00.000Z" },
  { label: "expired processing lease", receipt_status: "processing", lease_until: "2026-08-14T11:59:59.999Z", lease_token: "expired-lease", createdAt: "2026-05-01T00:00:00.000Z" },
  { label: "complete old receipt", receipt_status: "complete", lease_until: null, lease_token: null, createdAt: "2026-05-01T00:00:00.000Z" },
  { label: "retryable old receipt", receipt_status: "retryable", lease_until: null, lease_token: null, createdAt: "2026-05-01T00:00:00.000Z" }
];
const eligibleReceiptLabels = receiptRetentionFixture
  .filter((row) => Date.parse(row.createdAt) <= receiptStatementTimeMs - 90 * 24 * 60 * 60 * 1_000)
  .filter((row) => !(row.receipt_status === "processing" && Date.parse(row.lease_until) > receiptStatementTimeMs))
  .map((row) => row.label);
assert.deepEqual(eligibleReceiptLabels, ["expired processing lease", "complete old receipt", "retryable old receipt"], "active processing receipt stays retained while expired, complete, and retryable old receipts remain eligible");

const retention = await import(pathToFileURL(path.join(repoRoot, sourcePaths.retention)).href);
const billingRuntime = await import(pathToFileURL(path.join(repoRoot, sourcePaths.billingRuntime)).href);
const reconciler = await import(pathToFileURL(path.join(repoRoot, sourcePaths.reconciler)).href);
const reconcilerStoreModule = await import(pathToFileURL(path.join(repoRoot, sourcePaths.reconcilerStore)).href);
const usageStoreModule = await import(pathToFileURL(path.join(repoRoot, sourcePaths.usageStore)).href);
const observability = await import(pathToFileURL(path.join(repoRoot, sourcePaths.observability)).href);
const feedStore = await import(pathToFileURL(path.join(repoRoot, sourcePaths.feedStore)).href);
const liveStep = await import(pathToFileURL(path.join(repoRoot, sourcePaths.liveStep)).href);

const createCurrentAdjustmentFetchFixture = ({
  creditNoteInvoiceId = "in_fixture",
  creditNoteListData,
  refundListHasMore = false,
  refundListData = [],
  disputeListHasMore = false,
  disputeListData = [],
  paymentIntentOverrides = {},
  chargeOverrides = {},
  invoiceLinesHasMore = false,
  invoiceLines = [
    { price: { id: "price_fixture", product: "prod_fixture" } },
    { price: { id: "price_fixture", product: { id: "prod_fixture" } } }
  ]
} = {}) => {
  const invoice = {
    id: "in_fixture",
    customer: "cus_fixture",
    subscription: "sub_fixture",
    status: "paid",
    paid: true,
    payment_intent: "pi_fixture",
    charge: "ch_fixture",
    lines: { data: invoiceLines, has_more: invoiceLinesHasMore },
    amount_paid: 600,
    post_payment_credit_notes_amount: 600
  };
  return async (input) => {
    const url = new URL(String(input));
    let body;
    if (url.pathname === "/v1/subscriptions/sub_fixture") {
      assert.ok(
        url.searchParams.getAll("expand[]").includes("latest_invoice.lines.data.price"),
        "current adjustment retrieval expands the latest Invoice line price"
      );
      body = {
        id: "sub_fixture",
        customer: "cus_fixture",
        status: "active",
        current_period_start: 1785542400,
        current_period_end: 1788220800,
        cancel_at_period_end: false,
        latest_invoice: invoice,
        items: { data: [{ price: { id: "price_fixture", product: "prod_fixture" } }] }
      };
    } else if (url.pathname === "/v1/payment_intents/pi_fixture") {
      body = {
        id: "pi_fixture",
        customer: "cus_fixture",
        invoice: "in_fixture",
        latest_charge: "ch_fixture",
        status: "succeeded",
        ...paymentIntentOverrides
      };
    } else if (url.pathname === "/v1/charges/ch_fixture") {
      body = {
        id: "ch_fixture",
        customer: "cus_fixture",
        invoice: "in_fixture",
        payment_intent: "pi_fixture",
        status: "succeeded",
        paid: true,
        amount: 600,
        amount_refunded: 0,
        ...chargeOverrides
      };
    } else if (url.pathname === "/v1/refunds") {
      body = { data: refundListData, has_more: refundListHasMore };
    } else if (url.pathname === "/v1/disputes") {
      body = { data: disputeListData, has_more: disputeListHasMore };
    } else if (url.pathname === "/v1/credit_notes") {
      body = {
        data: creditNoteListData ?? [{ id: "cn_fixture", invoice: creditNoteInvoiceId, customer: "cus_fixture", status: "issued", type: "post_payment" }],
        has_more: false
      };
    } else {
      return new Response("not found", { status: 404 });
    }
    return Response.json(body);
  };
};

const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = createCurrentAdjustmentFetchFixture();
  const currentCreditNoteGraph = await billingRuntime
    .createCommentTranslatorStripeCurrentObjectReader({ STRIPE_SECRET_KEY: "fixture-key" })
    .retrieveCurrentSubscriptionAdjustmentState({ subscriptionId: "sub_fixture" });
  assert.deepEqual(
    currentCreditNoteGraph.paymentAdjustment,
    { status: "issued", successful: true, fullAmount: true, targetsCurrentPeriod: true },
    "periodic current graph recognizes a bound full issued Credit Note"
  );
  assert.equal(currentCreditNoteGraph.invoice?.productId, "prod_fixture", "current Invoice exposes the bound sanitized product reference");
  assert.equal(currentCreditNoteGraph.invoice?.priceId, "price_fixture", "current Invoice exposes the bound sanitized price reference");

  globalThis.fetch = createCurrentAdjustmentFetchFixture({ invoiceLinesHasMore: true });
  await assert.rejects(
    billingRuntime
      .createCommentTranslatorStripeCurrentObjectReader({ STRIPE_SECRET_KEY: "fixture-key" })
      .retrieveCurrentSubscriptionAdjustmentState({ subscriptionId: "sub_fixture" }),
    /binding failed/,
    "an incomplete current Invoice line page fails closed"
  );

  globalThis.fetch = createCurrentAdjustmentFetchFixture({ invoiceLines: [] });
  await assert.rejects(
    billingRuntime
      .createCommentTranslatorStripeCurrentObjectReader({ STRIPE_SECRET_KEY: "fixture-key" })
      .retrieveCurrentSubscriptionAdjustmentState({ subscriptionId: "sub_fixture" }),
    /binding failed/,
    "missing current Invoice line candidates fail closed"
  );

  globalThis.fetch = createCurrentAdjustmentFetchFixture({
    invoiceLines: [
      { price: { id: "price_fixture", product: "prod_fixture" } },
      { price: { id: "price_other", product: "prod_other" } }
    ]
  });
  await assert.rejects(
    billingRuntime
      .createCommentTranslatorStripeCurrentObjectReader({ STRIPE_SECRET_KEY: "fixture-key" })
      .retrieveCurrentSubscriptionAdjustmentState({ subscriptionId: "sub_fixture" }),
    /binding failed/,
    "conflicting current Invoice line candidates fail closed"
  );

  globalThis.fetch = createCurrentAdjustmentFetchFixture({
    invoiceLines: [{ price: { id: "price_other", product: "prod_other" } }]
  });
  await assert.rejects(
    billingRuntime
      .createCommentTranslatorStripeCurrentObjectReader({ STRIPE_SECRET_KEY: "fixture-key" })
      .retrieveCurrentSubscriptionAdjustmentState({ subscriptionId: "sub_fixture" }),
    /binding failed/,
    "current Invoice line references that disagree with the Subscription fail closed"
  );

  globalThis.fetch = createCurrentAdjustmentFetchFixture({ creditNoteInvoiceId: "in_mismatch" });
  await assert.rejects(
    billingRuntime
      .createCommentTranslatorStripeCurrentObjectReader({ STRIPE_SECRET_KEY: "fixture-key" })
      .retrieveCurrentSubscriptionAdjustmentState({ subscriptionId: "sub_fixture" }),
    /binding failed/,
    "mismatched Credit Note graph fails closed"
  );

  for (const [label, invalidGraphFixture] of [
    ["PaymentIntent own ID", { paymentIntentOverrides: { id: "pi_mismatch" } }],
    ["PaymentIntent customer", { paymentIntentOverrides: { customer: "cus_mismatch" } }],
    ["PaymentIntent successful status", { paymentIntentOverrides: { status: "processing" } }],
    ["PaymentIntent exact Charge", { paymentIntentOverrides: { latest_charge: "ch_mismatch" } }],
    ["Charge own ID", { chargeOverrides: { id: "ch_mismatch" } }],
    ["Charge customer", { chargeOverrides: { customer: "cus_mismatch" } }],
    ["Charge successful status", { chargeOverrides: { status: "pending" } }],
    ["Charge paid state", { chargeOverrides: { paid: false } }],
    ["Refund required ID", { refundListData: [{ charge: "ch_fixture", payment_intent: "pi_fixture", status: "succeeded" }] }],
    ["Refund status enum", { refundListData: [{ id: "re_fixture", charge: "ch_fixture", payment_intent: "pi_fixture", status: "uncertain" }] }],
    ["Refund exact PaymentIntent", { refundListData: [{ id: "re_fixture", charge: "ch_fixture", status: "succeeded" }] }],
    ["Dispute required ID", { disputeListData: [{ charge: "ch_fixture", payment_intent: "pi_fixture", status: "won" }] }],
    ["Dispute status enum", { disputeListData: [{ id: "dp_fixture", charge: "ch_fixture", payment_intent: "pi_fixture", status: "uncertain" }] }],
    ["Dispute exact PaymentIntent", { disputeListData: [{ id: "dp_fixture", charge: "ch_fixture", status: "won" }] }],
    ["Credit Note required ID", { creditNoteListData: [{ invoice: "in_fixture", customer: "cus_fixture", status: "issued", type: "post_payment" }] }],
    ["Credit Note status enum", { creditNoteListData: [{ id: "cn_fixture", invoice: "in_fixture", customer: "cus_fixture", status: "uncertain", type: "post_payment" }] }],
    ["Credit Note type enum", { creditNoteListData: [{ id: "cn_fixture", invoice: "in_fixture", customer: "cus_fixture", status: "issued", type: "uncertain" }] }]
  ]) {
    globalThis.fetch = createCurrentAdjustmentFetchFixture(invalidGraphFixture);
    await assert.rejects(
      billingRuntime
        .createCommentTranslatorStripeCurrentObjectReader({ STRIPE_SECRET_KEY: "fixture-key" })
        .retrieveCurrentSubscriptionAdjustmentState({ subscriptionId: "sub_fixture" }),
      /failed/,
      `${label} mismatch fails the current adjustment graph closed`
    );
  }

  for (const incompleteListFixture of [
    { refundListHasMore: true },
    { disputeListHasMore: true },
    { refundListData: [null] },
    { disputeListData: ["malformed"] }
  ]) {
    globalThis.fetch = createCurrentAdjustmentFetchFixture(incompleteListFixture);
    await assert.rejects(
      billingRuntime
        .createCommentTranslatorStripeCurrentObjectReader({ STRIPE_SECRET_KEY: "fixture-key" })
        .retrieveCurrentSubscriptionAdjustmentState({ subscriptionId: "sub_fixture" }),
      /retrieval failed/,
      "incomplete or malformed current refund/dispute lists fail closed"
    );
  }
} finally {
  globalThis.fetch = originalFetch;
}

assert.match(sources.schedulerRoute, /runCommentTranslatorPaidTask9ScheduledMaintenance/, "scheduler route invokes the bounded maintenance runner");
assert.match(sources.schedulerRoute, /COMMENT_TRANSLATOR_PAID_SCHEDULER_AUTHORITY/, "scheduler route requires an explicit single authority");
assert.match(sources.schedulerRoute, /sanitized|aggregate/i, "scheduler route returns sanitized aggregate output only");
assert.match(sources.schedulerRoute, /createDefaultCommentTranslatorBillingCheckoutSafetyAuthorityReader/, "scheduler route reuses the billing runtime Checkout safety authority");
assert.match(sources.schedulerRoute, /checkoutSafetyAuthorityReader:\s*createDefaultCommentTranslatorBillingCheckoutSafetyAuthorityReader\(process\.env\)/, "scheduler recovery receives the default fail-closed Checkout safety authority");

assert.equal(
  retention.commentTranslatorPaidRetentionPolicy.feedSnapshotAfterSessionEndMs,
  24 * 60 * 60 * 1_000,
  "feed policy exposes the 24-hour retention boundary"
);
assert.equal(retention.commentTranslatorPaidRetentionPolicy.providerDetailDays, 30);
assert.equal(retention.commentTranslatorPaidRetentionPolicy.sessionSummaryDays, 90);
assert.equal(retention.commentTranslatorPaidRetentionPolicy.stripeEventDays, 90);
assert.equal(retention.commentTranslatorPaidRetentionPolicy.aggregateMonths, 13);
assert.equal(
  retention.resolveCommentTranslatorPaidRetentionCutoffIso({
    kind: "aggregate",
    nowIso: "2026-08-14T12:00:00.000Z"
  }),
  "2025-07-01T00:00:00.000Z",
  "13-month aggregate cutoff uses a UTC calendar month"
);
assert.equal(
  retention.resolveCommentTranslatorPaidRetentionCutoffIso({
    kind: "ended-subscription",
    nowIso: "2026-08-31T23:59:59.999Z"
  }),
  "2025-07-01T00:00:00.000Z",
  "cutoff remains month-aligned through the last UTC millisecond"
);
assert.equal(
  retention.resolveCommentTranslatorPaidRetentionCutoffIso({
    kind: "ended-subscription",
    nowIso: "2026-09-01T00:00:00.000Z"
  }),
  "2025-08-01T00:00:00.000Z",
  "cutoff advances exactly at the UTC calendar-month boundary"
);
assert.equal(
  retention.selectCommentTranslatorPaidSchedulerAuthority({ supabaseCronAvailable: true, cloudflareCronAvailable: true }).authority,
  "unavailable",
  "ambiguous dual scheduler configuration fails closed"
);
assert.equal(
  retention.selectCommentTranslatorPaidSchedulerAuthority({
    supabaseCronAvailable: true,
    cloudflareCronAvailable: true,
    configuredAuthority: "supabase-cron"
  }).authority,
  "unavailable",
  "explicit configuration cannot make two active scheduler callers safe"
);
assert.equal(
  retention.selectCommentTranslatorPaidSchedulerAuthority({ supabaseCronAvailable: false, cloudflareCronAvailable: true }).authority,
  "cloudflare-cron-fallback",
  "Cloudflare Cron is selected only when Supabase Cron is unavailable"
);
assert.equal(
  retention.selectCommentTranslatorPaidSchedulerAuthority({
    supabaseCronAvailable: true,
    cloudflareCronAvailable: false,
    configuredAuthority: "supabase-cron",
    callerAuthority: "cloudflare-cron-fallback"
  }).authority,
  "unavailable",
  "caller mismatch fails closed"
);
assert.equal(
  retention.selectCommentTranslatorPaidSchedulerAuthority({ supabaseCronAvailable: false, cloudflareCronAvailable: false }).authority,
  "unavailable",
  "no scheduler fails closed"
);
assert.equal(
  retention.measureCommentTranslatorPaidFeedSnapshotBytes({ rows: [] }),
  11,
  "feed size measurement includes the full deterministic UTF-8 JSON envelope"
);
assert.equal(retention.commentTranslatorPaidRetentionPolicy.standardFeedSnapshotBytes, 8 * 1024);
assert.equal(retention.commentTranslatorPaidRetentionPolicy.hardFeedSnapshotBytes, 64 * 1024);
const snapshotEnvelopeAtBytes = (targetBytes) => {
  const envelope = { rows: [], metadata: "" };
  const fixedBytes = retention.measureCommentTranslatorPaidFeedSnapshotBytes(envelope);
  envelope.metadata = "x".repeat(targetBytes - fixedBytes);
  assert.equal(retention.measureCommentTranslatorPaidFeedSnapshotBytes(envelope), targetBytes);
  return envelope;
};
assert.equal(retention.resolveCommentTranslatorPaidFeedSnapshotSizeDisposition(snapshotEnvelopeAtBytes(8 * 1024)), "standard");
assert.equal(retention.resolveCommentTranslatorPaidFeedSnapshotSizeDisposition(snapshotEnvelopeAtBytes((8 * 1024) + 1)), "oversize-within-hard-limit");
assert.equal(retention.resolveCommentTranslatorPaidFeedSnapshotSizeDisposition(snapshotEnvelopeAtBytes(64 * 1024)), "oversize-within-hard-limit");
assert.equal(retention.resolveCommentTranslatorPaidFeedSnapshotSizeDisposition(snapshotEnvelopeAtBytes((64 * 1024) + 1)), "hard-limit-exceeded");

const rowPlan = retention.calculateCommentTranslatorPaidRetentionRowPlan({
  activeUsers: 20,
  sessionHoursPerDay: 3,
  days: 30,
  providerCount: 2
});
assert.deepEqual(rowPlan, {
  naiveMinuteRowsPerProvider: 108_000,
  naiveMinuteRowsAllProviders: 216_000,
  hourBucketRowsPerProvider: 1_800,
  hourBucketRowsAllProviders: 3_600
});
const fullDayPlan = retention.calculateCommentTranslatorPaidRetentionRowPlan({
  activeUsers: 20,
  sessionHoursPerDay: 24,
  days: 30,
  providerCount: 2
});
assert.deepEqual(fullDayPlan, {
  naiveMinuteRowsPerProvider: 864_000,
  naiveMinuteRowsAllProviders: 1_728_000,
  hourBucketRowsPerProvider: 14_400,
  hourBucketRowsAllProviders: 28_800
});

const loadFixture = retention.createCommentTranslatorPaidRetentionLoadFixture();
assert.equal(loadFixture.harnessIterationsPerDay, 115_200, "load fixture executes every 15-second poll across 20x24h");
assert.equal(loadFixture.pollRequestsPerDay, 115_200);
assert.equal(loadFixture.commentsPerDay, 28_800);
assert.equal(loadFixture.providerRpcCallsPerDay, 57_600);
assert.equal(loadFixture.heartbeatWritesPerDay, 28_800);
assert.equal(loadFixture.attemptReceiptRowsFor27Hours, 129_600);
assert.equal(loadFixture.maxDispatchAttemptReceiptRowsFor27Hours, 129_600);
assert.deepEqual(loadFixture.standardScenario, {
  ...loadFixture.standardScenario,
  commentsPerDay: 28_800,
  attemptReceiptRowsPerDay: 28_800,
  providerRpcCallsPerDay: 57_600,
  feedRowWritesPerDay: 28_800,
  heartbeatWritesPerDay: 28_800
});
assert.equal(loadFixture.standardScenario.attemptReceiptRowsPerDay, loadFixture.standardScenario.commentsPerDay);
assert.equal(loadFixture.standardScenario.feedRowWritesPerDay, loadFixture.standardScenario.commentsPerDay);
assert.equal(loadFixture.standardScenario.providerRpcCallsPerDay, loadFixture.standardScenario.commentsPerDay * 2);
assert.equal(loadFixture.standardScenario.dbReadOperationsPerDay, loadFixture.standardScenario.commentsPerDay * 12);
assert.equal(loadFixture.standardScenario.dbWriteOperationsPerDay, loadFixture.standardScenario.commentsPerDay * 12);
assert.equal(loadFixture.maxDispatchScenario.harnessIterationsPerDay, 115_200);
assert.equal(loadFixture.maxDispatchScenario.commentsPerDay, 115_200);
assert.equal(loadFixture.maxDispatchScenario.attemptReceiptRowsPerDay, 115_200);
assert.equal(loadFixture.maxDispatchScenario.providerRpcCallsPerDay, 230_400);
assert.equal(loadFixture.maxDispatchScenario.feedRowWritesPerDay, 115_200);
assert.equal(loadFixture.maxDispatchScenario.heartbeatWritesPerDay, 28_800);
assert.equal(loadFixture.maxDispatchScenario.attemptReceiptRowsPerDay, loadFixture.maxDispatchScenario.commentsPerDay);
assert.equal(loadFixture.maxDispatchScenario.feedRowWritesPerDay, loadFixture.maxDispatchScenario.commentsPerDay);
assert.equal(loadFixture.maxDispatchScenario.providerRpcCallsPerDay, loadFixture.maxDispatchScenario.commentsPerDay * 2);
assert.equal(loadFixture.maxDispatchScenario.dbReadOperationsPerDay, loadFixture.maxDispatchScenario.commentsPerDay * 12);
assert.equal(loadFixture.maxDispatchScenario.dbWriteOperationsPerDay, loadFixture.maxDispatchScenario.commentsPerDay * 12);
assert.equal(loadFixture.sessionSummaryRowsFor90Days, 14_400);
assert.equal(loadFixture.providerHourlyDetailCleanupRowsPerDay, 960);
assert.equal(loadFixture.attemptLedgerCleanupRowsPerDay, 28_800);
assert.equal(loadFixture.dbReadOperationsPerDay, 345_600);
assert.equal(loadFixture.dbWriteOperationsPerDay, 345_600);
assert.equal(loadFixture.dbReadOperationsPer30Days, 10_368_000);
assert.equal(loadFixture.dbWriteOperationsPer30Days, 10_368_000);
assert.equal(loadFixture.heartbeatWritesPer30Days, 864_000);
assert.equal(loadFixture.sessionStartAndPollBudgetReservationsPer30Days, 4_800);
assert.equal(loadFixture.paidStoragePlanBytes, 216_000_000);
assert.equal(loadFixture.storageMeasurementAuthority, "pg_total_relation_size");
assert.equal(loadFixture.externalMeasurementStatus, "externally-unverified");
assert.equal(loadFixture.feedRowWritesPerDay, 28_800);
assert.deepEqual(loadFixture.emptyTargetScenario, {
  harnessIterationsPerDay: 115_200,
  pollRequestsPerDay: 115_200,
  commentsPerDay: 0,
  providerRpcCallsPerDay: 0,
  heartbeatWritesPerDay: 28_800,
  attemptReceiptRowsPerDay: 0,
  feedRowWritesPerDay: 0,
  dbReadOperationsPerDay: 0,
  dbWriteOperationsPerDay: 0
});
assert.equal(retention.computeCommentTranslatorPaidDailyPollBudget({ p95BaselineRequests: 0 }), 80_000);
assert.equal(retention.computeCommentTranslatorPaidDailyPollBudget({ p95BaselineRequests: 20_000 }), 60_000);
for (const boundaryCase of [
  {
    label: "immediately below the 80 percent Checkout stop",
    reservedPolls: 79_999,
    expected: { checkout: "allow", newSession: "allow", activeAutoPoll: "allow", stopClientAutoPoll: false }
  },
  {
    label: "exactly at the 80 percent Checkout stop",
    reservedPolls: 80_000,
    expected: { checkout: "stop", newSession: "allow", activeAutoPoll: "allow", stopClientAutoPoll: false }
  },
  {
    label: "immediately below the 90 percent new-session stop",
    reservedPolls: 89_999,
    expected: { checkout: "stop", newSession: "allow", activeAutoPoll: "allow", stopClientAutoPoll: false }
  },
  {
    label: "exactly at the 90 percent new-session stop",
    reservedPolls: 90_000,
    expected: { checkout: "stop", newSession: "stop", activeAutoPoll: "allow", stopClientAutoPoll: false }
  },
  {
    label: "immediately below the 95 percent active-poll stop",
    reservedPolls: 94_999,
    expected: { checkout: "stop", newSession: "stop", activeAutoPoll: "allow", stopClientAutoPoll: false }
  },
  {
    label: "exactly at the 95 percent active-poll stop",
    reservedPolls: 95_000,
    expected: { checkout: "stop", newSession: "stop", activeAutoPoll: "stop", stopClientAutoPoll: true }
  }
]) {
  assert.deepEqual(
    retention.resolveCommentTranslatorPaidPollStopDisposition({
      reservedPolls: boundaryCase.reservedPolls,
      dailyBudget: 100_000
    }),
    boundaryCase.expected,
    boundaryCase.label
  );
}
assert.equal(
  retention.resolveCommentTranslatorPaidPollReservationForUtcBoundary({
    nowIso: "2026-08-14T23:00:00.000Z"
  }),
  240,
  "UTC boundary reserves only the polls available before midnight"
);

const actionOrder = [];
const finalized = [];
const retried = [];
const safetyTransitions = [];
const operationOrder = [];
const workKinds = [
  "checkout-expiry",
  "unbound-checkout-session",
  "payment-failure-seven-day",
  "cancel-pending",
  "refund-reconciliation",
  "dispute-reconciliation",
  "paid-unentitled-reconciliation",
  "billing-period-rollover",
  "utc-month-cost-rollover"
];
const claims = workKinds.map((workKind, index) => ({
  lifecycleId: `server-only-lifecycle-${index}`,
  reconcileLeaseToken: `server-only-lease-${index}`,
  reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z",
  workKind
}));
claims.push({ ...claims[0] }, {
  lifecycleId: "server-only-lifecycle-stale-finalize",
  reconcileLeaseToken: "server-only-lease-stale-finalize",
  reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z",
  workKind: "cancel-pending"
});
const reconcilerStore = {
  async claimDue({ limit }) {
    assert.equal(limit, 50, "reconciler clamps batch to 50");
    return claims.map(({ workKind: _workKind, ...claim }) => claim);
  },
  async assertLeaseActive() { return true; },
  async finalize(request) {
    operationOrder.push(`finalize:${request.lifecycleId}`);
    finalized.push(request);
    return request.lifecycleId !== "server-only-lifecycle-stale-finalize";
  },
  async retry(request) {
    operationOrder.push(`retry:${request.lifecycleId}`);
    retried.push(request);
    return 60;
  },
  async markFailureSafe(request) {
    operationOrder.push(`safe:${request.lifecycleId}`);
    safetyTransitions.push(request);
    return true;
  }
};
const recordAction = (workKind) => async ({ opaqueLeaseContext }) => {
  assert.match(opaqueLeaseContext.reconcileLeaseToken, /^server-only-lease-/, "action receives the opaque claim lease");
  actionOrder.push(workKind);
};
const failAction = (workKind, reconcileErrorClass) => async ({ opaqueLeaseContext }) => {
  assert.match(opaqueLeaseContext.reconcileLeaseToken, /^server-only-lease-/);
  actionOrder.push(workKind);
  const error = new Error("sanitized fixture failure");
  error.reconcileErrorClass = reconcileErrorClass;
  throw error;
};
const actions = reconciler.createCommentTranslatorPaidControlPlaneActionImplementation({
  expireCheckoutSession: recordAction("checkout-expiry"),
  reconcileUnboundCheckoutSession: recordAction("unbound-checkout-session"),
  reconcilePaymentFailureAfterSevenDays: failAction("payment-failure-seven-day", "object-retrieval-failed"),
  applyCancelPending: recordAction("cancel-pending"),
  reconcileRefund: failAction("refund-reconciliation", "database-transaction-failed"),
  reconcileDispute: failAction("dispute-reconciliation", "external-action-failed"),
  reconcilePaidUnentitled: recordAction("paid-unentitled-reconciliation"),
  rollOverBillingPeriod: failAction("billing-period-rollover", "object-retrieval-failed"),
  rollOverUtcMonthCost: failAction("utc-month-cost-rollover", "external-action-failed")
});
const invocation = reconciler.createCommentTranslatorPaidControlPlaneInvocation({
  store: reconcilerStore,
  resolveWorkItem: async (claim) => ({
    lifecycleId: claim.lifecycleId,
    workKind: claims.find((candidate) => candidate.lifecycleId === claim.lifecycleId).workKind
  }),
  actions,
  clock: () => "2026-08-14T12:00:00.000Z"
});
const reconcilerRun = await invocation.run({
  nowIso: "2026-08-14T12:00:00.000Z",
  limit: 500
});
assert.deepEqual(actionOrder.slice(0, 9), workKinds, "all nine concrete actions are exercised");
assert.equal(actionOrder.filter((kind) => kind === "checkout-expiry").length, 1, "duplicate lease cannot execute an action after finalize");
assert.equal(reconcilerRun.claimedCount, 11);
assert.equal(reconcilerRun.completedCount, 4);
assert.equal(reconcilerRun.retryCount, 5);
assert.equal(reconcilerRun.staleCount, 2);
assert.equal(reconcilerRun.errorClassCounts["object-retrieval-failed"], 2);
assert.equal(reconcilerRun.errorClassCounts["database-transaction-failed"], 1);
assert.equal(reconcilerRun.errorClassCounts["external-action-failed"], 2);
assert.equal(finalized.length, 5);
assert.equal(retried.length, 5);
assert.equal(safetyTransitions.length, 5);
assert.deepEqual(
  safetyTransitions.map(({ workKind }) => workKind),
  ["payment-failure-seven-day", "refund-reconciliation", "dispute-reconciliation", "billing-period-rollover", "utc-month-cost-rollover"],
  "failure safety receives the sanitized resolved work kind"
);
for (const lifecycleIndex of [2, 4, 5, 7, 8]) {
  assert.ok(
    operationOrder.indexOf(`safe:server-only-lifecycle-${lifecycleIndex}`) < operationOrder.indexOf(`retry:server-only-lifecycle-${lifecycleIndex}`),
    "durable failure safety completes before retry backoff"
  );
}
assert.doesNotMatch(JSON.stringify(reconcilerRun), /server-only-lifecycle|server-only-lease|sanitized fixture failure/i);

const resolveFailureSafetyRequests = [];
await reconciler.createCommentTranslatorPaidControlPlaneInvocation({
  store: {
    async claimDue() { return [{ lifecycleId: "resolve-failure", reconcileLeaseToken: "opaque-resolve", reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z" }]; },
    async assertLeaseActive() { return true; },
    async finalize() { throw new Error("resolve failure must not finalize"); },
    async retry() { return 60; },
    async markFailureSafe(request) { resolveFailureSafetyRequests.push(request); return true; }
  },
  resolveWorkItem: async () => { throw new Error("private resolution detail"); },
  actions,
  clock: () => "2026-08-14T12:00:00.000Z"
}).run({ nowIso: "2026-08-14T12:00:00.000Z" });
assert.equal(resolveFailureSafetyRequests.length, 1);
assert.equal(resolveFailureSafetyRequests[0].workKind, null, "resolve-before failure passes no guessed work kind");
const rolloverResolveFailureSafetyRequests = [];
await reconciler.createCommentTranslatorPaidControlPlaneInvocation({
  store: {
    async claimDue() { return [{ lifecycleId: "rollover-resolve-failure", reconcileLeaseToken: "opaque-rollover", reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z", workKind: "billing-period-rollover" }]; },
    async assertLeaseActive() { return true; },
    async finalize() { throw new Error("resolve failure must not finalize"); },
    async retry() { return 60; },
    async markFailureSafe(request) { rolloverResolveFailureSafetyRequests.push(request); return true; }
  },
  resolveWorkItem: async () => { throw new Error("private resolution detail"); },
  actions,
  clock: () => "2026-08-14T12:00:00.000Z"
}).run({ nowIso: "2026-08-14T12:00:00.000Z" });
assert.equal(rolloverResolveFailureSafetyRequests[0].workKind, "billing-period-rollover", "claimed billing rollover work kind survives resolution failure");

const durablePaymentFailureLifecycle = {
  lifecycleId: "durable-payment-failure-lifecycle",
  ownerUserId: "durable-payment-failure-owner",
  customerBindingId: "durable-payment-failure-customer-binding",
  stripeCustomerId: "cus_durable_payment_failure",
  lifecycleState: "past_due",
  isTerminal: false,
  holdId: "durable-payment-failure-hold",
  checkoutExpiresAtTargetIso: null,
  checkoutSessionId: null,
  stripeExpiresAtIso: null,
  idempotencyKey: null,
  subscriptionId: "sub_durable_payment_failure",
  subscriptionBindingId: "durable-payment-failure-subscription-binding",
  productId: "prod_fixture",
  priceId: "price_fixture",
  currentPeriodStartIso: "2026-08-01T00:00:00.000Z",
  currentPeriodEndIso: "2026-09-01T00:00:00.000Z",
  paymentFailureStartedAtIso: "2026-08-02T00:00:00.000Z",
  nextReconcileAtIso: "2026-08-14T12:00:00.000Z"
};
const durablePaymentFailureCancellationRequests = [];
let durablePaymentFailureCancellationAttempt = 0;
const durablePaymentFailureActions = reconciler.createCommentTranslatorPaidControlPlaneAuthoritativeActions({
  readBillingLifecycle: async () => durablePaymentFailureLifecycle,
  entitlementStore: {
    async expireCheckoutHold() { throw new Error("not used"); },
    async resolveStripeBinding() {
      return {
        status: "ready",
        binding: {
          ownerUserId: durablePaymentFailureLifecycle.ownerUserId,
          lifecycleId: durablePaymentFailureLifecycle.lifecycleId,
          customerBindingId: durablePaymentFailureLifecycle.customerBindingId,
          holdId: durablePaymentFailureLifecycle.holdId,
          stripeCustomerId: durablePaymentFailureLifecycle.stripeCustomerId,
          stripeCheckoutSessionId: null,
          stripeSubscriptionId: durablePaymentFailureLifecycle.subscriptionId,
          subscriptionBindingId: durablePaymentFailureLifecycle.subscriptionBindingId,
          productId: durablePaymentFailureLifecycle.productId,
          priceId: durablePaymentFailureLifecycle.priceId,
          lifecycleState: durablePaymentFailureLifecycle.lifecycleState,
          stripeExpiresAtIso: null,
          idempotencyKey: null
        }
      };
    },
    async claimEntitlementProjection() {
      return { projectionLeaseToken: "opaque-durable-payment-projection", projectionLeaseUntilIso: "2026-08-14T12:02:00.000Z" };
    },
    async projectEntitlement() { return "durable-payment-entitlement"; }
  },
  currentObjectReader: {
    async retrieveCurrentObjectState() {
      return {
        subscription: {
          id: durablePaymentFailureLifecycle.subscriptionId,
          customerId: durablePaymentFailureLifecycle.stripeCustomerId,
          status: "past_due",
          productId: "prod_fixture",
          priceId: "price_fixture",
          currentPeriodStartIso: "2026-08-01T00:00:00.000Z",
          currentPeriodEndIso: "2026-09-01T00:00:00.000Z",
          cancelAtPeriodEnd: false,
          latestInvoiceId: null
        }
      };
    },
    async retrieveCurrentSubscriptionAdjustmentState() { throw new Error("not used"); }
  },
  subscriptionCancelAdapter: {
    async cancelSubscription(request) {
      durablePaymentFailureCancellationRequests.push(request);
      durablePaymentFailureCancellationAttempt += 1;
      if (durablePaymentFailureCancellationAttempt === 1) throw new Error("response unavailable");
      return {
        id: request.subscriptionId,
        customerId: durablePaymentFailureLifecycle.stripeCustomerId,
        status: "canceled",
        productId: "prod_fixture",
        priceId: "price_fixture",
        currentPeriodStartIso: "2026-08-01T00:00:00.000Z",
        currentPeriodEndIso: "2026-09-01T00:00:00.000Z",
        cancelAtPeriodEnd: false,
        latestInvoiceId: null
      };
    }
  },
  usageStore: { async closeBillingPeriod() { return true; }, async closeUtcMonth() { return true; } }
});
const durablePaymentFailureResolver = reconciler.createCommentTranslatorPaidControlPlaneWorkItemResolver({
  readBillingLifecycle: async () => durablePaymentFailureLifecycle,
  clock: () => "2026-08-14T12:00:00.000Z"
});
assert.deepEqual(
  await durablePaymentFailureResolver({
    lifecycleId: durablePaymentFailureLifecycle.lifecycleId,
    reconcileLeaseToken: "opaque-stale-paid-kind",
    reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z",
    workKind: "paid-unentitled-reconciliation"
  }),
  null,
  "a DB claim kind incompatible with the current lifecycle fails closed instead of being replaced"
);
const behindClockPaymentFailureResolver = reconciler.createCommentTranslatorPaidControlPlaneWorkItemResolver({
  readBillingLifecycle: async () => durablePaymentFailureLifecycle,
  clock: () => "2026-08-03T00:00:00.000Z"
});
assert.deepEqual(
  await behindClockPaymentFailureResolver({
    lifecycleId: durablePaymentFailureLifecycle.lifecycleId,
    reconcileLeaseToken: "opaque-db-due-payment-failure",
    reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z",
    workKind: "payment-failure-seven-day"
  }),
  { lifecycleId: durablePaymentFailureLifecycle.lifecycleId, workKind: "payment-failure-seven-day" },
  "a DB-due payment-failure claim remains authoritative when the app clock is behind"
);
const behindClockBillingRolloverResolver = reconciler.createCommentTranslatorPaidControlPlaneWorkItemResolver({
  readBillingLifecycle: async () => ({
    ...durablePaymentFailureLifecycle,
    lifecycleState: "active",
    paymentFailureStartedAtIso: null,
    currentPeriodEndIso: "2026-08-14T12:00:00.000Z"
  }),
  clock: () => "2026-08-14T11:59:59.000Z"
});
assert.deepEqual(
  await behindClockBillingRolloverResolver({
    lifecycleId: durablePaymentFailureLifecycle.lifecycleId,
    reconcileLeaseToken: "opaque-db-due-billing-rollover",
    reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z",
    workKind: "billing-period-rollover"
  }),
  { lifecycleId: durablePaymentFailureLifecycle.lifecycleId, workKind: "billing-period-rollover" },
  "a DB-due billing-period claim remains authoritative when the app clock is behind"
);
const recoveredActiveResolver = reconciler.createCommentTranslatorPaidControlPlaneWorkItemResolver({
  readBillingLifecycle: async () => ({
    ...durablePaymentFailureLifecycle,
    lifecycleState: "active",
    paymentFailureStartedAtIso: null,
    currentPeriodEndIso: "2026-09-01T00:00:00.000Z"
  }),
  clock: () => "2026-08-14T12:00:00.000Z"
});
assert.equal(
  await recoveredActiveResolver({
    lifecycleId: durablePaymentFailureLifecycle.lifecycleId,
    reconcileLeaseToken: "opaque-stale-checkout-kind",
    reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z",
    workKind: "checkout-expiry"
  }),
  null,
  "normal active recovery clears stale checkout work instead of requeueing it"
);
const recoveredActiveFinalizes = [];
const recoveredActiveRun = await reconciler.createCommentTranslatorPaidControlPlaneInvocation({
  store: {
    async claimDue() {
      return [{
        lifecycleId: durablePaymentFailureLifecycle.lifecycleId,
        reconcileLeaseToken: "opaque-recovered-active",
        reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z",
        workKind: "checkout-expiry"
      }];
    },
    async assertLeaseActive() { return true; },
    async finalize(request) { recoveredActiveFinalizes.push(request); return true; },
    async retry() { throw new Error("recovered active lifecycle must not retry stale work"); },
    async markFailureSafe() { throw new Error("recovered active lifecycle must not enter failure safety"); }
  },
  resolveWorkItem: recoveredActiveResolver,
  actions: {
    checkoutExpiry: async () => { throw new Error("recovered active lifecycle must not expire checkout"); },
    unboundCheckoutSession: async () => { throw new Error("recovered active lifecycle must not recover checkout"); },
    paymentFailureSevenDay: async () => { throw new Error("not used"); },
    cancelPending: async () => { throw new Error("not used"); },
    refundReconciliation: async () => { throw new Error("not used"); },
    disputeReconciliation: async () => { throw new Error("not used"); },
    paidUnentitledReconciliation: async () => { throw new Error("recovered active lifecycle must not stop Paid"); },
    billingPeriodRollover: async () => { throw new Error("not used"); },
    utcMonthCostRollover: async () => { throw new Error("not used"); }
  },
  clock: () => "2026-08-14T12:00:00.000Z"
}).run({ nowIso: "2026-08-14T12:00:00.000Z" });
assert.equal(recoveredActiveRun.status, "success");
assert.equal(recoveredActiveRun.completedCount, 1);
assert.deepEqual(recoveredActiveFinalizes.map(({ nextReconcileAtIso }) => nextReconcileAtIso), [null], "recovered active stale work finalizes without requeue");
const durablePaymentFailureTransitions = [];
const durablePaymentFailureRetries = [];
const durablePaymentFailureFinalizes = [];
const durablePaymentFailureClaim = {
  lifecycleId: durablePaymentFailureLifecycle.lifecycleId,
  reconcileLeaseToken: "opaque-durable-payment-lease",
  reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z",
  workKind: "payment-failure-seven-day"
};
const runDurablePaymentFailureAttempt = () => reconciler.createCommentTranslatorPaidControlPlaneInvocation({
  store: {
    async claimDue() { return [durablePaymentFailureClaim]; },
    async assertLeaseActive() { return true; },
    async finalize(request) { durablePaymentFailureFinalizes.push(request); return true; },
    async retry(request) { durablePaymentFailureRetries.push(request); return 60; },
    async markFailureSafe(request) { durablePaymentFailureTransitions.push(request); return true; }
  },
  resolveWorkItem: durablePaymentFailureResolver,
  actions: durablePaymentFailureActions,
  clock: () => "2026-08-14T12:00:00.000Z"
}).run({ nowIso: "2026-08-14T12:00:00.000Z" });
const failedDurablePaymentAttempt = await runDurablePaymentFailureAttempt();
const reclaimedDurablePaymentAttempt = await runDurablePaymentFailureAttempt();
assert.equal(failedDurablePaymentAttempt.status, "retry-scheduled", "cancel failure enters durable backoff");
assert.equal(durablePaymentFailureTransitions[0].workKind, "payment-failure-seven-day", "failure safety retains the durable payment-failure work kind");
assert.equal(durablePaymentFailureRetries.length, 1, "cancel failure schedules exactly one retry");
assert.equal(reclaimedDurablePaymentAttempt.status, "success", "reclaim returns to the same payment-failure action and finalizes");
assert.equal(durablePaymentFailureFinalizes.length, 1);
assert.equal(durablePaymentFailureCancellationRequests.length, 2);
assert.equal(durablePaymentFailureCancellationRequests[0].prorationBehavior, "none");
assert.equal(durablePaymentFailureCancellationRequests[1].prorationBehavior, "none");
assert.equal(durablePaymentFailureCancellationRequests[0].idempotencyKey, durablePaymentFailureCancellationRequests[1].idempotencyKey, "cancel retry reuses the stable opaque idempotency key");
assert.doesNotMatch(durablePaymentFailureCancellationRequests[0].idempotencyKey, /durable-payment-failure|sub_/i, "cancel idempotency key does not expose private identifiers");

const failureSafetyRpcCalls = [];
const trustedReconcilerStore = reconcilerStoreModule.createCommentTranslatorPaidReconcilerStore({
  supabase: {
    async rpc(functionName, params) {
      failureSafetyRpcCalls.push({ functionName, params });
      return { data: true, error: null };
    }
  }
});
assert.equal(await trustedReconcilerStore.assertLeaseActive({
  lifecycleId: "opaque-lifecycle",
  reconcileLeaseToken: "opaque-lease",
  workKind: "cancel-pending"
}), true);
assert.deepEqual(failureSafetyRpcCalls[0], {
  functionName: "ct_paid_assert_reconcile_lease_active",
  params: {
    p_lifecycle_id: "opaque-lifecycle",
    p_reconcile_lease_token: "opaque-lease",
    p_work_kind: "cancel-pending"
  }
}, "trusted lease assertion forwards only the opaque work binding and no app clock");
const expiredLeaseStore = reconcilerStoreModule.createCommentTranslatorPaidReconcilerStore({
  supabase: { async rpc() { return { data: false, error: null }; } }
});
assert.equal(await expiredLeaseStore.assertLeaseActive({
  lifecycleId: "opaque-expired-lifecycle",
  reconcileLeaseToken: "opaque-expired-lease",
  workKind: "cancel-pending"
}), false, "a truly expired DB lease assertion remains a sanitized false result");
await trustedReconcilerStore.markFailureSafe({
  lifecycleId: "opaque-lifecycle",
  reconcileLeaseToken: "opaque-lease",
  workKind: "billing-period-rollover",
  errorClass: "external-action-failed",
  nowIso: "2026-08-14T12:00:00.000Z"
});
assert.equal(failureSafetyRpcCalls[1].params.p_work_kind, "billing-period-rollover");
await assert.rejects(
  trustedReconcilerStore.markFailureSafe({
    lifecycleId: "opaque-lifecycle",
    reconcileLeaseToken: "opaque-lease",
    workKind: "private-unsupported-kind",
    errorClass: "external-action-failed",
    nowIso: "2026-08-14T12:00:00.000Z"
  }),
  /work kind is invalid/i,
  "trusted store rejects an unsupported work kind before RPC"
);
assert.equal(failureSafetyRpcCalls.length, 2);
const closeRpcCalls = [];
const trustedUsageStore = usageStoreModule.createCommentTranslatorPaidUsageStore({
  supabase: {
    async rpc(functionName, params) {
      closeRpcCalls.push({ functionName, params });
      return { data: true, error: null };
    }
  }
});
await trustedUsageStore.closeBillingPeriod({
  lifecycleId: "opaque-lifecycle",
  reconcileLeaseToken: "opaque-billing-lease",
  ownerUserId: "opaque-owner",
  periodStartIso: "2026-07-01T00:00:00.000Z",
  periodEndIso: "2026-08-01T00:00:00.000Z",
  nowIso: "2026-08-14T12:00:00.000Z"
});
await trustedUsageStore.closeUtcMonth({
  workItemId: "opaque-work-item",
  reconcileLeaseToken: "opaque-utc-lease",
  utcMonth: "2026-07-01",
  nowIso: "2026-08-14T12:00:00.000Z"
});
assert.deepEqual(closeRpcCalls, [
  {
    functionName: "ct_paid_close_billing_period_reconciled",
    params: {
      p_lifecycle_id: "opaque-lifecycle",
      p_reconcile_lease_token: "opaque-billing-lease",
      p_owner_user_id: "opaque-owner",
      p_period_start: "2026-07-01T00:00:00.000Z",
      p_period_end: "2026-08-01T00:00:00.000Z",
      p_now: "2026-08-14T12:00:00.000Z"
    }
  },
  {
    functionName: "ct_paid_close_utc_month_reconciled",
    params: {
      p_work_item_id: "opaque-work-item",
      p_reconcile_lease_token: "opaque-utc-lease",
      p_utc_month: "2026-07-01",
      p_now: "2026-08-14T12:00:00.000Z"
    }
  }
], "usage store forwards lease-bound close RPC names and arguments exactly");
await assert.rejects(
  trustedReconcilerStore.markFailureSafe({
    lifecycleId: "opaque-lifecycle",
    reconcileLeaseToken: "opaque-lease",
    workKind: null,
    errorClass: "private-unsupported-error-class",
    nowIso: "2026-08-14T12:00:00.000Z"
  }),
  /error class is invalid/i,
  "trusted store rejects an unsupported error class before RPC"
);
assert.equal(failureSafetyRpcCalls.length, 2);

const staleActionCalls = [];
const staleClaims = [
  { lifecycleId: "stale-after-resolution", reconcileLeaseToken: "opaque-a", reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z" },
  { lifecycleId: "stale-before-action", reconcileLeaseToken: "opaque-b", reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z" }
];
const staleLeaseAssertions = [true, false, true, true, false];
const staleRun = await reconciler.createCommentTranslatorPaidControlPlaneInvocation({
  store: {
    async claimDue() { return staleClaims; },
    async assertLeaseActive() { return staleLeaseAssertions.shift(); },
    async finalize() { throw new Error("stale claims must not finalize"); },
    async retry() { throw new Error("stale claims must not retry"); },
    async markFailureSafe() { throw new Error("stale claims must not enter failure safety"); }
  },
  resolveWorkItem: async (claim) => ({ lifecycleId: claim.lifecycleId, workKind: "cancel-pending" }),
  actions: reconciler.createCommentTranslatorPaidControlPlaneActionImplementation({
    expireCheckoutSession: async () => {},
    reconcileUnboundCheckoutSession: async () => {},
    reconcilePaymentFailureAfterSevenDays: async () => {},
    applyCancelPending: async () => { staleActionCalls.push("invoked"); },
    reconcileRefund: async () => {},
    reconcileDispute: async () => {},
    reconcilePaidUnentitled: async () => {},
    rollOverBillingPeriod: async () => {},
    rollOverUtcMonthCost: async () => {}
  }),
  clock: () => clockValues.shift()
}).run({ nowIso: "2026-08-14T12:00:00.000Z" });
assert.deepEqual(staleActionCalls, [], "claims stale after resolution or immediately before action never invoke actions");
assert.equal(staleRun.staleCount, 2);

const clockSkewActionCalls = [];
const clockSkewFinalizes = [];
const clockSkewLeaseAssertions = [];
const clockSkewRun = await reconciler.createCommentTranslatorPaidControlPlaneInvocation({
  store: {
    async claimDue() {
      return [
        { lifecycleId: "clock-skew-current", reconcileLeaseToken: "opaque-clock-current", reconcileLeaseUntilIso: "2026-08-14T12:02:01.000Z", workKind: "cancel-pending" },
        { lifecycleId: "clock-skew-expired", reconcileLeaseToken: "opaque-clock-expired", reconcileLeaseUntilIso: "2026-08-14T11:59:59.999Z", workKind: "cancel-pending" }
      ];
    },
    async assertLeaseActive(request) {
      clockSkewLeaseAssertions.push(request);
      return request.lifecycleId === "clock-skew-current";
    },
    async finalize(request) { clockSkewFinalizes.push(request); return true; },
    async retry() { throw new Error("clock-skew fixture must not retry"); },
    async markFailureSafe() { throw new Error("clock-skew fixture must not enter failure safety"); }
  },
  resolveWorkItem: async (claim) => ({ lifecycleId: claim.lifecycleId, workKind: "cancel-pending" }),
  actions: reconciler.createCommentTranslatorPaidControlPlaneActionImplementation({
    expireCheckoutSession: async () => {},
    reconcileUnboundCheckoutSession: async () => {},
    reconcilePaymentFailureAfterSevenDays: async () => {},
    applyCancelPending: async ({ item }) => { clockSkewActionCalls.push(item.lifecycleId); },
    reconcileRefund: async () => {},
    reconcileDispute: async () => {},
    reconcilePaidUnentitled: async () => {},
    rollOverBillingPeriod: async () => {},
    rollOverUtcMonthCost: async () => {}
  }),
  clock: () => "2099-08-14T12:00:00.000Z"
}).run({ nowIso: "2026-08-14T12:00:00.000Z" });
assert.deepEqual(clockSkewActionCalls, ["clock-skew-current"], "DB-authoritative lease remains usable when the app clock is ahead");
assert.deepEqual(clockSkewFinalizes.map(({ lifecycleId }) => lifecycleId), ["clock-skew-current"], "clock-skewed current lease finalizes through DB CAS");
assert.equal(clockSkewRun.completedCount, 1);
assert.equal(clockSkewRun.staleCount, 1, "a truly expired DB assertion is skipped for the next bounded claim");
assert.equal(clockSkewLeaseAssertions.filter(({ lifecycleId }) => lifecycleId === "clock-skew-current").length, 3, "lease is asserted before resolve, after resolve, and immediately before action");
assert.equal(clockSkewLeaseAssertions.filter(({ lifecycleId }) => lifecycleId === "clock-skew-expired").length, 1, "expired DB lease stops before resolve");

const authoritativeCalls = [];
let authoritativeSubscriptionReads = 0;
const authoritativeCancellationRequests = [];
const authoritativeLifecycle = {
  lifecycleId: "fixture-lifecycle",
  ownerUserId: "fixture-owner",
  customerBindingId: "fixture-customer",
  stripeCustomerId: "cus_fixture",
  lifecycleState: "expire_required",
  isTerminal: false,
  holdId: "fixture-hold",
  checkoutExpiresAtTargetIso: "2026-08-14T11:59:00.000Z",
  checkoutSessionId: "cs_fixture",
  stripeExpiresAtIso: "2026-08-14T11:59:00.000Z",
  idempotencyKey: "ct-paid-checkout-fixture",
  subscriptionId: "sub_fixture",
  subscriptionBindingId: "fixture-subscription-binding",
  productId: "prod_fixture",
  priceId: "price_fixture",
  currentPeriodStartIso: "2026-07-01T00:00:00.000Z",
  currentPeriodEndIso: "2026-08-01T00:00:00.000Z",
  paymentFailureStartedAtIso: "2026-08-02T00:00:00.000Z",
  nextReconcileAtIso: "2026-08-14T12:00:00.000Z"
};
const authoritativeEntitlementStore = {
  async expireCheckoutHold(request) {
    authoritativeCalls.push({ name: "expireCheckoutHold", request });
    return true;
  },
  async resolveStripeBinding() {
    return {
      status: "ready",
      binding: {
        ownerUserId: "fixture-owner",
        lifecycleId: "fixture-lifecycle",
        customerBindingId: "fixture-customer",
        holdId: "fixture-hold",
        stripeCustomerId: "cus_fixture",
        stripeCheckoutSessionId: "cs_fixture",
        stripeSubscriptionId: "sub_fixture",
        subscriptionBindingId: "fixture-subscription-binding",
        productId: "prod_fixture",
        priceId: "price_fixture",
        lifecycleState: "active",
        stripeExpiresAtIso: null,
        idempotencyKey: null
      }
    };
  },
  async claimEntitlementProjection() {
    return { projectionLeaseToken: "opaque-projection-lease", projectionLeaseUntilIso: "2026-08-14T12:02:00.000Z" };
  },
  async projectEntitlement(request) {
    authoritativeCalls.push({ name: "projectEntitlement", request });
    return "fixture-entitlement";
  },
  async projectPaidUnentitledDisposition(request) {
    authoritativeCalls.push({ name: "projectPaidUnentitledDisposition", request });
    return "fixture-entitlement";
  }
};

const cancelPendingLifecycle = {
  ...authoritativeLifecycle,
  lifecycleState: "cancel_pending",
  paymentFailureStartedAtIso: null
};
const cancelPendingProjectionCalls = [];
const cancelPendingRetries = [];
const cancelPendingFinalizes = [];
let cancelPendingReadAttempt = 0;
const cancelPendingActions = reconciler.createCommentTranslatorPaidControlPlaneAuthoritativeActions({
  readBillingLifecycle: async () => cancelPendingLifecycle,
  entitlementStore: {
    ...authoritativeEntitlementStore,
    async projectEntitlement(request) {
      cancelPendingProjectionCalls.push(request);
      return "fixture-entitlement";
    }
  },
  currentObjectReader: {
    async retrieveCurrentObjectState() {
      cancelPendingReadAttempt += 1;
      return {
        subscription: {
          id: "sub_fixture",
          customerId: "cus_fixture",
          status: cancelPendingReadAttempt === 1 ? "active" : "canceled",
          productId: "prod_fixture",
          priceId: "price_fixture",
          currentPeriodStartIso: "2026-08-01T00:00:00.000Z",
          currentPeriodEndIso: "2026-09-01T00:00:00.000Z",
          cancelAtPeriodEnd: false,
          latestInvoiceId: null
        }
      };
    },
    async retrieveCurrentSubscriptionAdjustmentState() { throw new Error("not used"); }
  },
  subscriptionCancelAdapter: {
    async cancelSubscription() { throw new Error("cancel-pending only verifies current Stripe state"); }
  },
  usageStore: { async closeBillingPeriod() { return true; }, async closeUtcMonth() { return true; } }
});
const cancelPendingClaim = {
  lifecycleId: "fixture-lifecycle",
  reconcileLeaseToken: "opaque-cancel-pending-lease",
  reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z",
  workKind: "cancel-pending"
};
const runCancelPendingAttempt = () => reconciler.createCommentTranslatorPaidControlPlaneInvocation({
  store: {
    async claimDue() { return [cancelPendingClaim]; },
    async assertLeaseActive() { return true; },
    async finalize(request) { cancelPendingFinalizes.push(request); return true; },
    async retry(request) { cancelPendingRetries.push(request); return 60; },
    async markFailureSafe() { return true; }
  },
  resolveWorkItem: reconciler.createCommentTranslatorPaidControlPlaneWorkItemResolver({
    readBillingLifecycle: async () => cancelPendingLifecycle
  }),
  actions: cancelPendingActions,
  clock: () => "2026-08-14T12:00:00.000Z"
}).run({ nowIso: "2026-08-14T12:00:00.000Z" });
const notCanceledAttempt = await runCancelPendingAttempt();
const canceledAttempt = await runCancelPendingAttempt();
assert.equal(notCanceledAttempt.status, "retry-scheduled", "not-yet-canceled Stripe state schedules bounded retry");
assert.equal(notCanceledAttempt.errorClassCounts["binding-not-ready"], 1, "not-yet-canceled retry exposes only a sanitized retryable class");
assert.equal(cancelPendingRetries.length, 1, "not-yet-canceled Stripe state retries exactly once in the fixture");
assert.equal(cancelPendingFinalizes.length, 1, "cancel-pending finalizes only after a current canceled read");
assert.equal(canceledAttempt.status, "success", "next current canceled read completes cancel-pending reconciliation");
assert.deepEqual(
  cancelPendingProjectionCalls.map(({ status, lifecycleState, subscriptionStatus, cancelAtPeriodEnd }) => ({ status, lifecycleState, subscriptionStatus, cancelAtPeriodEnd })),
  [
    { status: "cancel_pending", lifecycleState: "cancel_pending", subscriptionStatus: null, cancelAtPeriodEnd: true },
    { status: "canceled", lifecycleState: "canceled", subscriptionStatus: "canceled", cancelAtPeriodEnd: false }
  ],
  "cancel-pending keeps Paid stopped until current Stripe state is canceled"
);

const paidUnentitledRequest = {
  item: { lifecycleId: "fixture-lifecycle", workKind: "paid-unentitled-reconciliation" },
  opaqueLeaseContext: {
    lifecycleId: "fixture-lifecycle",
    reconcileLeaseToken: "opaque-paid-unentitled-lease",
    reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z"
  },
  nowIso: "2026-08-14T12:00:00.000Z"
};
const paidUnentitledSubscription = {
  id: "sub_fixture",
  customerId: "cus_fixture",
  status: "active",
  productId: "prod_fixture",
  priceId: "price_fixture",
  currentPeriodStartIso: "2026-08-01T00:00:00.000Z",
  currentPeriodEndIso: "2026-09-01T00:00:00.000Z",
  cancelAtPeriodEnd: false,
  latestInvoiceId: "in_fixture"
};
const paidUnentitledAdjustmentGraph = {
  subscription: paidUnentitledSubscription,
  invoice: {
    id: "in_fixture",
    customerId: "cus_fixture",
    subscriptionId: "sub_fixture",
    status: "paid",
    paid: true,
    paymentIntentId: "pi_fixture",
    chargeId: "ch_fixture",
    productId: "prod_fixture",
    priceId: "price_fixture"
  }
};
const paidUnentitledLifecycle = {
  ...authoritativeLifecycle,
  lifecycleState: "paid_unentitled_reconciliation",
  paymentFailureStartedAtIso: null,
  operatorDisposition: null
};
const paidUnentitledMutationCalls = [];
const noDispositionActions = reconciler.createCommentTranslatorPaidControlPlaneAuthoritativeActions({
  readBillingLifecycle: async () => paidUnentitledLifecycle,
  entitlementStore: {
    ...authoritativeEntitlementStore,
    async resolveStripeBinding() { paidUnentitledMutationCalls.push("resolveStripeBinding"); throw new Error("must not mutate"); },
    async claimEntitlementProjection() { paidUnentitledMutationCalls.push("claimEntitlementProjection"); throw new Error("must not mutate"); },
    async projectEntitlement() { paidUnentitledMutationCalls.push("projectEntitlement"); throw new Error("must not mutate"); },
    async projectPaidUnentitledDisposition() { paidUnentitledMutationCalls.push("projectPaidUnentitledDisposition"); throw new Error("must not mutate"); }
  },
  currentObjectReader: {
    async retrieveCurrentObjectState() { return { subscription: paidUnentitledSubscription }; },
    async retrieveCurrentSubscriptionAdjustmentState() { throw new Error("not used"); }
  },
  subscriptionCancelAdapter: {
    async cancelSubscription() { paidUnentitledMutationCalls.push("cancelSubscription"); throw new Error("must not mutate"); }
  },
  usageStore: { async closeBillingPeriod() { return true; }, async closeUtcMonth() { return true; } }
});
await noDispositionActions.paidUnentitledReconciliation(paidUnentitledRequest);
assert.deepEqual(paidUnentitledMutationCalls, [], "missing operator disposition performs zero mutation calls");
const noDispositionFinalizes = [];
const noDispositionRun = await reconciler.createCommentTranslatorPaidControlPlaneInvocation({
  store: {
    async claimDue() {
      return [{
        lifecycleId: "fixture-lifecycle",
        reconcileLeaseToken: "opaque-paid-unentitled-lease",
        reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z",
        workKind: "paid-unentitled-reconciliation"
      }];
    },
    async assertLeaseActive() { return true; },
    async finalize(request) { noDispositionFinalizes.push(request); return true; },
    async retry() { throw new Error("missing disposition must not retry"); },
    async markFailureSafe() { throw new Error("missing disposition must not enter failure safety"); }
  },
  resolveWorkItem: reconciler.createCommentTranslatorPaidControlPlaneWorkItemResolver({
    readBillingLifecycle: async () => paidUnentitledLifecycle,
    clock: () => "2026-08-14T12:00:00.000Z"
  }),
  actions: noDispositionActions,
  clock: () => "2026-08-14T12:00:00.000Z"
}).run({ nowIso: "2026-08-14T12:00:00.000Z" });
assert.equal(noDispositionRun.status, "success", "missing disposition finalizes without a retry loop");
assert.equal(noDispositionFinalizes.length, 1, "missing disposition clears the stale claim lease once");

for (const operatorDisposition of ["capacity-correction-approved", "refund-cancel"]) {
  const gatedCalls = [];
  const dispositionActions = reconciler.createCommentTranslatorPaidControlPlaneAuthoritativeActions({
    readBillingLifecycle: async () => ({ ...paidUnentitledLifecycle, operatorDisposition }),
    entitlementStore: {
      ...authoritativeEntitlementStore,
      async projectEntitlement() { gatedCalls.push("generic-projection"); throw new Error("generic projection is forbidden"); },
      async projectPaidUnentitledDisposition(request) {
        gatedCalls.push({ name: "disposition-projection", request });
        return "fixture-entitlement";
      }
    },
    currentObjectReader: {
      async retrieveCurrentObjectState() { throw new Error("subscription-only read is forbidden"); },
      async retrieveCurrentSubscriptionAdjustmentState() { gatedCalls.push("adjustment-graph-read"); return paidUnentitledAdjustmentGraph; }
    },
    subscriptionCancelAdapter: {
      async cancelSubscription(request) {
        gatedCalls.push({ name: "cancel", request });
        return { ...paidUnentitledSubscription, status: "canceled" };
      }
    },
    usageStore: { async closeBillingPeriod() { return true; }, async closeUtcMonth() { return true; } }
  });
  await dispositionActions.paidUnentitledReconciliation(paidUnentitledRequest);
  assert.equal(gatedCalls[0], "adjustment-graph-read", `${operatorDisposition} re-reads the bound current adjustment graph first`);
  assert.equal(gatedCalls.some((call) => call === "generic-projection"), false, `${operatorDisposition} cannot use generic projection`);
  const dispositionProjection = gatedCalls.find((call) => call?.name === "disposition-projection");
  assert.equal(dispositionProjection.request.operatorDisposition, operatorDisposition, `${operatorDisposition} is consumed by the gated projection RPC`);
  assert.equal(dispositionProjection.request.reconcileLeaseToken, "opaque-paid-unentitled-lease", `${operatorDisposition} remains reconcile-lease-bound`);
  const cancellation = gatedCalls.find((call) => call?.name === "cancel");
  assert.equal(Boolean(cancellation), operatorDisposition === "refund-cancel", `${operatorDisposition} uses only its approved Stripe action`);
  if (cancellation) assert.equal(cancellation.request.prorationBehavior, "none", "refund/cancel disposition uses no proration");
  if (operatorDisposition === "capacity-correction-approved") {
    assert.equal(dispositionProjection.request.status, "active", "capacity correction restores the validated current Paid entitlement");
    assert.equal(dispositionProjection.request.lifecycleState, "active");
    assert.equal(dispositionProjection.request.subscriptionStatus, "active");
  }
}

const capacityCorrectionProjectionCalls = [];
const capacityCorrectionRetries = [];
const capacityCorrectionFinalizes = [];
let capacityCorrectionProjectionAttempt = 0;
const capacityCorrectionActions = reconciler.createCommentTranslatorPaidControlPlaneAuthoritativeActions({
  readBillingLifecycle: async () => ({
    ...paidUnentitledLifecycle,
    operatorDisposition: "capacity-correction-approved"
  }),
  entitlementStore: {
    ...authoritativeEntitlementStore,
    async projectPaidUnentitledDisposition(request) {
      capacityCorrectionProjectionCalls.push(request);
      capacityCorrectionProjectionAttempt += 1;
      if (capacityCorrectionProjectionAttempt === 1) throw new Error("capacity unavailable");
      return "fixture-entitlement";
    }
  },
  currentObjectReader: {
    async retrieveCurrentObjectState() { throw new Error("subscription-only read is forbidden"); },
    async retrieveCurrentSubscriptionAdjustmentState() { return paidUnentitledAdjustmentGraph; }
  },
  subscriptionCancelAdapter: {
    async cancelSubscription() { throw new Error("capacity correction must not cancel"); }
  },
  usageStore: { async closeBillingPeriod() { return true; }, async closeUtcMonth() { return true; } }
});
const capacityCorrectionClaim = {
  lifecycleId: "fixture-lifecycle",
  reconcileLeaseToken: "opaque-paid-unentitled-lease",
  reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z",
  workKind: "paid-unentitled-reconciliation"
};
const runCapacityCorrectionAttempt = () => reconciler.createCommentTranslatorPaidControlPlaneInvocation({
  store: {
    async claimDue() { return [capacityCorrectionClaim]; },
    async assertLeaseActive() { return true; },
    async finalize(request) { capacityCorrectionFinalizes.push(request); return true; },
    async retry(request) { capacityCorrectionRetries.push(request); return 60; },
    async markFailureSafe() { return true; }
  },
  resolveWorkItem: reconciler.createCommentTranslatorPaidControlPlaneWorkItemResolver({
    readBillingLifecycle: async () => ({
      ...paidUnentitledLifecycle,
      operatorDisposition: "capacity-correction-approved"
    })
  }),
  actions: capacityCorrectionActions,
  clock: () => "2026-08-14T12:00:00.000Z"
}).run({ nowIso: "2026-08-14T12:00:00.000Z" });
const capacityUnavailableAttempt = await runCapacityCorrectionAttempt();
const capacityAvailableAttempt = await runCapacityCorrectionAttempt();
assert.equal(capacityUnavailableAttempt.status, "retry-scheduled", "atomic capacity failure keeps capacity correction retryable");
assert.equal(capacityUnavailableAttempt.errorClassCounts["database-transaction-failed"], 1, "capacity conflict is sanitized as a database transaction failure");
assert.equal(capacityCorrectionRetries.length, 1, "failed atomic capacity correction schedules one bounded retry");
assert.equal(capacityCorrectionFinalizes.length, 1, "capacity correction finalizes only after the atomic projection succeeds");
assert.equal(capacityAvailableAttempt.status, "success", "capacity correction completes after the atomic capacity operation succeeds");
for (const projection of capacityCorrectionProjectionCalls) {
  assert.equal(projection.status, "active");
  assert.equal(projection.lifecycleState, "active");
  assert.equal(projection.subscriptionStatus, "active");
  assert.equal(projection.operatorDisposition, "capacity-correction-approved");
}

for (const invalidGraph of [
  { subscription: paidUnentitledSubscription },
  { ...paidUnentitledAdjustmentGraph, invoice: { ...paidUnentitledAdjustmentGraph.invoice, priceId: "price_mismatch" } }
]) {
  const mutationCalls = [];
  const invalidDispositionActions = reconciler.createCommentTranslatorPaidControlPlaneAuthoritativeActions({
    readBillingLifecycle: async () => ({ ...paidUnentitledLifecycle, operatorDisposition: "refund-cancel" }),
    entitlementStore: {
      ...authoritativeEntitlementStore,
      async projectPaidUnentitledDisposition() { mutationCalls.push("projection"); return "unexpected"; }
    },
    currentObjectReader: {
      async retrieveCurrentObjectState() { throw new Error("subscription-only read is forbidden"); },
      async retrieveCurrentSubscriptionAdjustmentState() { return invalidGraph; }
    },
    subscriptionCancelAdapter: {
      async cancelSubscription() { mutationCalls.push("cancel"); return { ...paidUnentitledSubscription, status: "canceled" }; }
    },
    usageStore: { async closeBillingPeriod() { return true; }, async closeUtcMonth() { return true; } }
  });
  await assert.rejects(() => invalidDispositionActions.paidUnentitledReconciliation(paidUnentitledRequest));
  assert.deepEqual(mutationCalls, [], "missing or mismatched adjustment binding fails closed before disposition mutation");
}

const rolloverSubscription = {
  id: "sub_fixture",
  customerId: "cus_fixture",
  status: "active",
  productId: "prod_fixture",
  priceId: "price_fixture",
  currentPeriodStartIso: "2026-08-01T00:00:00.000Z",
  currentPeriodEndIso: "2026-09-01T00:00:00.000Z",
  cancelAtPeriodEnd: false,
  latestInvoiceId: "in_rollover"
};
const paidRolloverInvoice = {
  id: "in_rollover",
  customerId: "cus_fixture",
  subscriptionId: "sub_fixture",
  status: "paid",
  paid: true,
  paymentIntentId: "pi_rollover",
  chargeId: "ch_rollover",
  productId: "prod_fixture",
  priceId: "price_fixture"
};
for (const [label, invoice] of [
  ["missing", undefined],
  ["unpaid", { ...paidRolloverInvoice, status: "open", paid: false }],
  ["mismatched period price", { ...paidRolloverInvoice, priceId: "price_other" }]
]) {
  let invalidRolloverCloseCount = 0;
  let invalidRolloverProjectionCount = 0;
  const invalidRolloverActions = reconciler.createCommentTranslatorPaidControlPlaneAuthoritativeActions({
    readBillingLifecycle: async () => authoritativeLifecycle,
    entitlementStore: {
      ...authoritativeEntitlementStore,
      async projectEntitlement() { invalidRolloverProjectionCount += 1; return "fixture-entitlement"; }
    },
    currentObjectReader: {
      async retrieveCurrentObjectState() { return { subscription: rolloverSubscription, invoice }; },
      async retrieveCurrentSubscriptionAdjustmentState() { throw new Error("not used"); }
    },
    subscriptionCancelAdapter: { async cancelSubscription() { throw new Error("not used"); } },
    usageStore: {
      async closeBillingPeriod() { invalidRolloverCloseCount += 1; return true; },
      async closeUtcMonth() { return false; }
    }
  });
  await assert.rejects(
    invalidRolloverActions.billingPeriodRollover({
      item: { lifecycleId: "fixture-lifecycle", workKind: "billing-period-rollover" },
      opaqueLeaseContext: { lifecycleId: "fixture-lifecycle", reconcileLeaseToken: "opaque-billing-rollover-lease", reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z" },
      nowIso: "2026-08-14T12:00:00.000Z"
    }),
    /Paid control-plane reconciliation failed/,
    `${label} latest invoice fails billing rollover closed`
  );
  assert.equal(invalidRolloverCloseCount, 0, `${label} latest invoice cannot close the previous period`);
  assert.equal(invalidRolloverProjectionCount, 0, `${label} latest invoice cannot reproject Paid`);
}

let validRolloverCloseCount = 0;
let validRolloverProjectionCount = 0;
const validRolloverActions = reconciler.createCommentTranslatorPaidControlPlaneAuthoritativeActions({
  readBillingLifecycle: async () => authoritativeLifecycle,
  entitlementStore: {
    ...authoritativeEntitlementStore,
    async projectEntitlement() { validRolloverProjectionCount += 1; return "fixture-entitlement"; }
  },
  currentObjectReader: {
    async retrieveCurrentObjectState() { return { subscription: rolloverSubscription, invoice: paidRolloverInvoice }; },
    async retrieveCurrentSubscriptionAdjustmentState() { throw new Error("not used"); }
  },
  subscriptionCancelAdapter: { async cancelSubscription() { throw new Error("not used"); } },
  usageStore: {
    async closeBillingPeriod() { validRolloverCloseCount += 1; return true; },
    async closeUtcMonth() { return false; }
  }
});
await validRolloverActions.billingPeriodRollover({
  item: { lifecycleId: "fixture-lifecycle", workKind: "billing-period-rollover" },
  opaqueLeaseContext: { lifecycleId: "fixture-lifecycle", reconcileLeaseToken: "opaque-billing-rollover-lease", reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z" },
  nowIso: "2026-08-14T12:00:00.000Z"
});
assert.equal(validRolloverCloseCount, 1, "a matching paid latest invoice closes the previous period once");
assert.equal(validRolloverProjectionCount, 1, "a matching paid latest invoice permits Paid re-projection");

const multiMonthCloseResults = [true, false];
const multiMonthFinalizes = [];
const multiMonthActions = reconciler.createCommentTranslatorPaidControlPlaneAuthoritativeActions({
  readBillingLifecycle: async () => { throw new Error("UTC singleton does not read a billing lifecycle"); },
  entitlementStore: authoritativeEntitlementStore,
  currentObjectReader: {
    async retrieveCurrentObjectState() { throw new Error("not used"); },
    async retrieveCurrentSubscriptionAdjustmentState() { throw new Error("not used"); }
  },
  subscriptionCancelAdapter: { async cancelSubscription() { throw new Error("not used"); } },
  usageStore: {
    async closeBillingPeriod() { throw new Error("not used"); },
    async closeUtcMonth() { return multiMonthCloseResults.shift(); }
  }
});
const multiMonthStore = {
  async claimDue() {
    return [{ lifecycleId: "utc-singleton", reconcileLeaseToken: `opaque-utc-${multiMonthFinalizes.length}`, reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z", workKind: "utc-month-cost-rollover" }];
  },
  async assertLeaseActive() { return true; },
  async finalize(request) { multiMonthFinalizes.push(request); return true; },
  async retry() { throw new Error("multi-month success must not back off"); },
  async markFailureSafe() { throw new Error("multi-month success must not fail-close"); }
};
const multiMonthInvocation = reconciler.createCommentTranslatorPaidControlPlaneInvocation({
  store: multiMonthStore,
  resolveWorkItem: async (claim) => ({ lifecycleId: claim.lifecycleId, workKind: "utc-month-cost-rollover" }),
  actions: multiMonthActions,
  clock: () => "2026-08-14T12:00:00.000Z"
});
await multiMonthInvocation.run({ nowIso: "2026-08-14T12:00:00.000Z" });
await multiMonthInvocation.run({ nowIso: "2026-08-14T12:00:00.000Z" });
assert.equal(multiMonthFinalizes[0].nextReconcileAtIso, "2026-08-14T12:00:00.000Z", "another overdue month schedules immediate bounded re-claim");
assert.equal(multiMonthFinalizes[1].nextReconcileAtIso, "2026-09-01T00:00:00.000Z", "recovery returns to the next UTC boundary after the backlog closes");

const checkoutResponseLossReads = [];
const checkoutResponseLossExpireRequests = [];
const checkoutResponseLossHoldReleases = [];
const checkoutResponseLossActions = reconciler.createCommentTranslatorPaidControlPlaneAuthoritativeActions({
  readBillingLifecycle: async () => authoritativeLifecycle,
  entitlementStore: {
    ...authoritativeEntitlementStore,
    async expireCheckoutHold(request) { checkoutResponseLossHoldReleases.push(request); return true; }
  },
  currentObjectReader: {
    async retrieveCurrentObjectState() {
      const status = checkoutResponseLossReads.length === 0 ? "open" : "expired";
      checkoutResponseLossReads.push(status);
      return { checkoutSession: { id: "cs_fixture", customerId: "cus_fixture", subscriptionId: null, status, expiresAtIso: "2026-08-14T11:59:00.000Z", paymentStatus: "unpaid" } };
    },
    async retrieveCurrentSubscriptionAdjustmentState() { throw new Error("not used"); }
  },
  checkoutExpiryAdapter: {
    async expireCheckoutSession(request) {
      checkoutResponseLossExpireRequests.push(request);
      throw new Error("response lost after Stripe accepted expiry");
    }
  },
  subscriptionCancelAdapter: { async cancelSubscription() { throw new Error("not used"); } },
  usageStore: { async closeBillingPeriod() { return true; }, async closeUtcMonth() { return true; } }
});
const checkoutResponseLossResult = await checkoutResponseLossActions.checkoutExpiry({
  item: { lifecycleId: "fixture-lifecycle", workKind: "checkout-expiry" },
  opaqueLeaseContext: { lifecycleId: "fixture-lifecycle", reconcileLeaseToken: "opaque-checkout-expiry-lease", reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z" },
  nowIso: "2026-08-14T12:00:00.000Z"
});
assert.equal(checkoutResponseLossResult, undefined, "confirmed expiry returns no private object data");
assert.deepEqual(checkoutResponseLossReads, ["open", "expired"], "open Checkout is explicitly expired and always re-read after response loss");
assert.equal(checkoutResponseLossExpireRequests.length, 1);
assert.match(checkoutResponseLossExpireRequests[0].idempotencyKey, /^ct-paid-reconcile-checkout-expire-[a-f0-9]{32}$/);
assert.doesNotMatch(checkoutResponseLossExpireRequests[0].idempotencyKey, /fixture|cs_/i, "Checkout expiry idempotency key is stable and opaque");
assert.equal(checkoutResponseLossHoldReleases.length, 1, "hold releases only after current Session confirms expired at the target time");

const checkoutFailureHoldReleases = [];
const checkoutFailureRetries = [];
const checkoutFailureSafetyTransitions = [];
const checkoutFailureActions = reconciler.createCommentTranslatorPaidControlPlaneAuthoritativeActions({
  readBillingLifecycle: async () => authoritativeLifecycle,
  entitlementStore: {
    ...authoritativeEntitlementStore,
    async expireCheckoutHold(request) { checkoutFailureHoldReleases.push(request); return true; }
  },
  currentObjectReader: {
    async retrieveCurrentObjectState() {
      return { checkoutSession: { id: "cs_fixture", customerId: "cus_fixture", subscriptionId: null, status: "open", expiresAtIso: "2026-08-14T11:59:00.000Z", paymentStatus: "unpaid" } };
    },
    async retrieveCurrentSubscriptionAdjustmentState() { throw new Error("not used"); }
  },
  checkoutExpiryAdapter: { async expireCheckoutSession() { throw new Error("Stripe expiry failed"); } },
  subscriptionCancelAdapter: { async cancelSubscription() { throw new Error("not used"); } },
  usageStore: { async closeBillingPeriod() { return true; }, async closeUtcMonth() { return true; } }
});
const checkoutFailureRun = await reconciler.createCommentTranslatorPaidControlPlaneInvocation({
  store: {
    async claimDue() { return [{ lifecycleId: "fixture-lifecycle", reconcileLeaseToken: "opaque-checkout-failure-lease", reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z", workKind: "checkout-expiry" }]; },
    async assertLeaseActive() { return true; },
    async finalize() { throw new Error("unconfirmed expiry must not finalize"); },
    async retry(request) { checkoutFailureRetries.push(request); return 60; },
    async markFailureSafe(request) { checkoutFailureSafetyTransitions.push(request); return true; }
  },
  resolveWorkItem: async () => ({ lifecycleId: "fixture-lifecycle", workKind: "checkout-expiry" }),
  actions: checkoutFailureActions,
  clock: () => "2026-08-14T12:00:00.000Z"
}).run({ nowIso: "2026-08-14T12:00:00.000Z" });
assert.equal(checkoutFailureRun.status, "retry-scheduled", "unconfirmed Checkout expiry backs off");
assert.equal(checkoutFailureHoldReleases.length, 0, "failed Checkout expiry retains the hold");
assert.equal(checkoutFailureSafetyTransitions[0].workKind, "checkout-expiry");
assert.equal(checkoutFailureRetries.length, 1);

for (const invalidSession of [
  { id: "cs_fixture", customerId: "cus_fixture", status: "complete" },
  { id: "cs_mismatch", customerId: "cus_fixture", status: "expired" },
  { id: "cs_fixture", customerId: "cus_fixture", status: "unknown" },
  { id: "cs_fixture", customerId: "cus_fixture", status: "expired", expiresAtIso: null },
  { id: "cs_fixture", customerId: "cus_fixture", status: "expired", expiresAtIso: "2026-08-14T12:00:00.000Z" }
]) {
  let invalidExpiryCalls = 0;
  let invalidHoldReleases = 0;
  const invalidActions = reconciler.createCommentTranslatorPaidControlPlaneAuthoritativeActions({
    readBillingLifecycle: async () => authoritativeLifecycle,
    entitlementStore: {
      ...authoritativeEntitlementStore,
      async expireCheckoutHold() { invalidHoldReleases += 1; return true; }
    },
    currentObjectReader: {
      async retrieveCurrentObjectState() {
        return {
          checkoutSession: {
            ...invalidSession,
            subscriptionId: null,
            expiresAtIso: invalidSession.expiresAtIso === undefined
              ? "2026-08-14T11:59:00.000Z"
              : invalidSession.expiresAtIso,
            paymentStatus: "unpaid"
          }
        };
      },
      async retrieveCurrentSubscriptionAdjustmentState() { throw new Error("not used"); }
    },
    checkoutExpiryAdapter: { async expireCheckoutSession() { invalidExpiryCalls += 1; throw new Error("must not run"); } },
    subscriptionCancelAdapter: { async cancelSubscription() { throw new Error("not used"); } },
    usageStore: { async closeBillingPeriod() { return true; }, async closeUtcMonth() { return true; } }
  });
  await assert.rejects(
    invalidActions.checkoutExpiry({
      item: { lifecycleId: "fixture-lifecycle", workKind: "checkout-expiry" },
      opaqueLeaseContext: { lifecycleId: "fixture-lifecycle", reconcileLeaseToken: "opaque-invalid-checkout-lease", reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z" },
      nowIso: "2026-08-14T12:00:00.000Z"
    }),
    /Paid control-plane reconciliation failed/,
    `${invalidSession.status} or mismatched Checkout fails closed`
  );
  assert.equal(invalidExpiryCalls, 0);
  assert.equal(invalidHoldReleases, 0);
}
const incompleteRecoveryCheckoutRequests = [];
const incompleteRecoveryBindingRequests = [];
const incompleteRecoverySafetyReads = [];
const incompleteRecovery = reconciler.createCommentTranslatorPaidUnboundCheckoutSessionRecovery({
  entitlementStore: {
    async bindCheckoutSession(request) {
      incompleteRecoveryBindingRequests.push(request);
      return "fixture-checkout-binding";
    }
  },
  stripeAdapter: {
    async createCheckoutSession(request) {
      incompleteRecoveryCheckoutRequests.push(request);
      return {
        id: "cs_fixture_incomplete_recovery",
        customerId: "cus_fixture",
        url: "https://fixture.invalid/checkout",
        expiresAtIso: "2026-08-14T12:01:00.000Z",
        status: "open"
      };
    }
  },
  checkoutSafetyAuthorityReader: {
    async readCheckoutSafetyAuthority(request) {
      incompleteRecoverySafetyReads.push(request);
      return { status: "ready", capacityAvailable: true, dailyPollBudget: 10_000, reservedPolls: 0 };
    }
  },
  env: {
    STRIPE_SECRET_KEY: "fixture-key",
    COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID: "price_fixture",
    COMMENT_TRANSLATOR_STRIPE_PAID_PRODUCT_ID: "prod_fixture",
    NEXT_PUBLIC_SITE_URL: "https://fixture.invalid"
  }
});
assert.equal(
  await incompleteRecovery({
    lifecycle: {
      ...authoritativeLifecycle,
      lifecycleState: "incomplete",
      checkoutSessionId: null,
      stripeExpiresAtIso: null,
      checkoutExpiresAtTargetIso: "2026-08-14T12:01:00.000Z",
      subscriptionId: null,
      subscriptionBindingId: null
    },
    nowIso: "2026-08-14T12:00:00.000Z"
  }),
  true,
  "incomplete lifecycle without a Checkout binding uses the real recovery helper"
);
assert.equal(incompleteRecoveryCheckoutRequests.length, 1, "incomplete recovery creates one Checkout Session");
assert.equal(incompleteRecoveryCheckoutRequests[0].customerReferenceId, "cus_fixture");
assert.equal(incompleteRecoveryCheckoutRequests[0].idempotencyKey, "ct-paid-checkout-fixture");
assert.equal(incompleteRecoveryCheckoutRequests[0].expiresAtIso, "2026-08-14T12:01:00.000Z");
assert.match(incompleteRecoveryCheckoutRequests[0].clientReferenceId, /^ctbill_[a-f0-9]{48}$/);
assert.equal(incompleteRecoveryBindingRequests.length, 1, "incomplete recovery binds the created Checkout Session once");
assert.deepEqual(incompleteRecoverySafetyReads, [{
  ownerUserId: "fixture-owner",
  nowIso: "2026-08-14T12:00:00.000Z",
  capacityReservationAlreadyHeld: true
}], "unbound recovery reuses the final Checkout safety authority with the existing capacity hold");
assert.deepEqual(incompleteRecoveryBindingRequests[0], {
  ownerUserId: "fixture-owner",
  lifecycleId: "fixture-lifecycle",
  holdId: "fixture-hold",
  customerBindingId: "fixture-customer",
  stripeCheckoutSessionId: "cs_fixture_incomplete_recovery",
  stripeCustomerId: "cus_fixture",
  stripeExpiresAtIso: "2026-08-14T12:01:00.000Z",
  isRecoveryBinding: true,
  idempotencyKey: "ct-paid-checkout-fixture",
  nowIso: "2026-08-14T12:00:00.000Z"
});

const bindFailureMarks = [];
const bindFailureExpires = [];
const bindFailureRetrievals = [];
const bindFailureRecovery = reconciler.createCommentTranslatorPaidUnboundCheckoutSessionRecovery({
  entitlementStore: {
    async bindCheckoutSession() {
      throw new Error("synthetic binding failure");
    },
    async markCheckoutExpireRequired(request) {
      bindFailureMarks.push(request);
      return true;
    }
  },
  stripeAdapter: {
    async createCheckoutSession() {
      return {
        id: "cs_fixture_bind_failure",
        customerId: "cus_fixture",
        url: "https://fixture.invalid/must-not-return",
        expiresAtIso: "2026-08-14T12:01:00.000Z",
        status: "open"
      };
    },
    async expireCheckoutSession(request) {
      bindFailureExpires.push(request);
      return { id: "cs_fixture_bind_failure", customerId: "cus_fixture", url: null, expiresAtIso: "2026-08-14T12:01:00.000Z", status: "expired" };
    },
    async retrieveCheckoutSession(sessionId) {
      bindFailureRetrievals.push(sessionId);
      return { id: sessionId, customerId: "cus_fixture", url: null, expiresAtIso: "2026-08-14T12:01:00.000Z", status: "expired" };
    }
  },
  checkoutSafetyAuthorityReader: {
    async readCheckoutSafetyAuthority() {
      return { status: "ready", capacityAvailable: true, dailyPollBudget: 10_000, reservedPolls: 0 };
    }
  },
  env: {
    STRIPE_SECRET_KEY: "fixture-key",
    COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID: "price_fixture",
    COMMENT_TRANSLATOR_STRIPE_PAID_PRODUCT_ID: "prod_fixture",
    NEXT_PUBLIC_SITE_URL: "https://fixture.invalid"
  }
});
const bindFailureResult = await bindFailureRecovery({
  lifecycle: {
    ...authoritativeLifecycle,
    lifecycleState: "incomplete",
    checkoutSessionId: null,
    stripeExpiresAtIso: null,
    checkoutExpiresAtTargetIso: "2026-08-14T12:01:00.000Z",
    subscriptionId: null,
    subscriptionBindingId: null
  },
  nowIso: "2026-08-14T12:00:00.000Z"
});
assert.equal(bindFailureResult, true, "confirmed bind-failure expiry returns only bounded recovery completion");
assert.deepEqual(bindFailureMarks, [{
  ownerUserId: "fixture-owner",
  lifecycleId: "fixture-lifecycle",
  holdId: "fixture-hold",
  customerBindingId: "fixture-customer",
  stripeCheckoutSessionId: "cs_fixture_bind_failure",
  stripeCustomerId: "cus_fixture",
  stripeExpiresAtIso: "2026-08-14T12:01:00.000Z",
  idempotencyKey: "ct-paid-checkout-fixture",
  checkoutExpiresAtTargetIso: "2026-08-14T12:01:00.000Z",
  nowIso: "2026-08-14T12:00:00.000Z"
}], "binding failure durably records only immutable Checkout identity and target fields");
assert.deepEqual(bindFailureExpires, [{
  sessionId: "cs_fixture_bind_failure",
  idempotencyKey: "ct-paid-expire-fixture-hold"
}], "binding failure uses one stable expiry idempotency key after the durable mark");
assert.deepEqual(bindFailureRetrievals, ["cs_fixture_bind_failure"], "binding failure re-reads the exact created Session after expiry");
assert.doesNotMatch(JSON.stringify(bindFailureResult), /fixture\.invalid|checkout/i, "binding failure never returns the Checkout URL or Session object");

let markFailureExternalCallCount = 0;
const markFailureRecovery = reconciler.createCommentTranslatorPaidUnboundCheckoutSessionRecovery({
  entitlementStore: {
    async bindCheckoutSession() { throw new Error("synthetic binding failure"); },
    async markCheckoutExpireRequired() { throw new Error("synthetic marker failure"); }
  },
  stripeAdapter: {
    async createCheckoutSession() {
      return { id: "cs_fixture_mark_failure", customerId: "cus_fixture", url: null, expiresAtIso: "2026-08-14T12:01:00.000Z", status: "open" };
    },
    async expireCheckoutSession() { markFailureExternalCallCount += 1; throw new Error("must not expire before mark"); },
    async retrieveCheckoutSession() { markFailureExternalCallCount += 1; throw new Error("must not retrieve before mark"); }
  },
  checkoutSafetyAuthorityReader: { async readCheckoutSafetyAuthority() { return { status: "ready", capacityAvailable: true, dailyPollBudget: 10_000, reservedPolls: 0 }; } },
  env: { STRIPE_SECRET_KEY: "fixture-key", COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID: "price_fixture", COMMENT_TRANSLATOR_STRIPE_PAID_PRODUCT_ID: "prod_fixture", NEXT_PUBLIC_SITE_URL: "https://fixture.invalid" }
});
await assert.rejects(
  markFailureRecovery({
    lifecycle: { ...authoritativeLifecycle, lifecycleState: "incomplete", checkoutSessionId: null, stripeExpiresAtIso: null, checkoutExpiresAtTargetIso: "2026-08-14T12:01:00.000Z", subscriptionId: null, subscriptionBindingId: null },
    nowIso: "2026-08-14T12:00:00.000Z"
  }),
  (error) => {
    assert.equal(error.reconcileErrorClass, "database-transaction-failed");
    return true;
  },
  "failed durable marking remains a fail-closed retryable binding failure"
);
assert.equal(markFailureExternalCallCount, 0, "external expiry cannot run before expire-required is durable");

let durableMarkBeforeExpireFailure = false;
const expireFailureRecovery = reconciler.createCommentTranslatorPaidUnboundCheckoutSessionRecovery({
  entitlementStore: {
    async bindCheckoutSession() { throw new Error("synthetic binding failure"); },
    async markCheckoutExpireRequired() { durableMarkBeforeExpireFailure = true; return true; }
  },
  stripeAdapter: {
    async createCheckoutSession() {
      return { id: "cs_fixture_expire_failure", customerId: "cus_fixture", url: null, expiresAtIso: "2026-08-14T12:01:00.000Z", status: "open" };
    },
    async expireCheckoutSession() { assert.equal(durableMarkBeforeExpireFailure, true); throw new Error("synthetic expiry failure"); },
    async retrieveCheckoutSession(sessionId) {
      return { id: sessionId, customerId: "cus_fixture", url: null, expiresAtIso: "2026-08-14T12:01:00.000Z", status: "open" };
    }
  },
  checkoutSafetyAuthorityReader: { async readCheckoutSafetyAuthority() { return { status: "ready", capacityAvailable: true, dailyPollBudget: 10_000, reservedPolls: 0 }; } },
  env: { STRIPE_SECRET_KEY: "fixture-key", COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID: "price_fixture", COMMENT_TRANSLATOR_STRIPE_PAID_PRODUCT_ID: "prod_fixture", NEXT_PUBLIC_SITE_URL: "https://fixture.invalid" }
});
await assert.rejects(
  expireFailureRecovery({
    lifecycle: { ...authoritativeLifecycle, lifecycleState: "incomplete", checkoutSessionId: null, stripeExpiresAtIso: null, checkoutExpiresAtTargetIso: "2026-08-14T12:01:00.000Z", subscriptionId: null, subscriptionBindingId: null },
    nowIso: "2026-08-14T12:00:00.000Z"
  }),
  /Paid control-plane reconciliation failed/,
  "unconfirmed external expiry remains retryable after durable expire-required marking"
);
assert.equal(durableMarkBeforeExpireFailure, true, "expire failure preserves the durable expire-required state and capacity hold");

const responseUnknownCreates = [];
let responseUnknownMutationCount = 0;
const responseUnknownRecovery = reconciler.createCommentTranslatorPaidUnboundCheckoutSessionRecovery({
  entitlementStore: {
    async bindCheckoutSession() { responseUnknownMutationCount += 1; throw new Error("must not bind"); },
    async markCheckoutExpireRequired() { responseUnknownMutationCount += 1; return true; }
  },
  stripeAdapter: {
    async createCheckoutSession(request) { responseUnknownCreates.push(request); throw new Error("synthetic response loss"); },
    async expireCheckoutSession() { responseUnknownMutationCount += 1; throw new Error("must not expire unknown identity"); },
    async retrieveCheckoutSession() { responseUnknownMutationCount += 1; throw new Error("must not retrieve unknown identity"); }
  },
  checkoutSafetyAuthorityReader: { async readCheckoutSafetyAuthority() { return { status: "ready", capacityAvailable: true, dailyPollBudget: 10_000, reservedPolls: 0 }; } },
  env: { STRIPE_SECRET_KEY: "fixture-key", COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID: "price_fixture", COMMENT_TRANSLATOR_STRIPE_PAID_PRODUCT_ID: "prod_fixture", NEXT_PUBLIC_SITE_URL: "https://fixture.invalid" }
});
const responseUnknownRequest = {
  lifecycle: { ...authoritativeLifecycle, lifecycleState: "incomplete", checkoutSessionId: null, stripeExpiresAtIso: null, checkoutExpiresAtTargetIso: "2026-08-14T12:01:00.000Z", subscriptionId: null, subscriptionBindingId: null },
  nowIso: "2026-08-14T12:00:00.000Z"
};
await assert.rejects(responseUnknownRecovery(responseUnknownRequest), /Paid control-plane reconciliation failed/);
await assert.rejects(responseUnknownRecovery(responseUnknownRequest), /Paid control-plane reconciliation failed/);
assert.deepEqual(responseUnknownCreates.map(({ idempotencyKey }) => idempotencyKey), ["ct-paid-checkout-fixture", "ct-paid-checkout-fixture"], "unknown create response retries only the same idempotency key");
assert.equal(responseUnknownMutationCount, 0, "unknown Session identity never guesses a bind, mark, retrieve, or expire target");

let subscriptionBoundCheckoutCreates = 0;
const subscriptionBoundReconciliations = [];
const subscriptionBoundLifecycle = {
  ...authoritativeLifecycle,
  lifecycleState: "incomplete",
  checkoutSessionId: null,
  stripeExpiresAtIso: null,
  checkoutExpiresAtTargetIso: "2026-08-14T12:01:00.000Z"
};
const subscriptionBoundRecovery = reconciler.createCommentTranslatorPaidUnboundCheckoutSessionRecovery({
  entitlementStore: { async bindCheckoutSession() { throw new Error("must not bind"); } },
  stripeAdapter: { async createCheckoutSession() { subscriptionBoundCheckoutCreates += 1; throw new Error("must not create"); } },
  checkoutSafetyAuthorityReader: {
    async readCheckoutSafetyAuthority() {
      return { status: "ready", capacityAvailable: true, dailyPollBudget: 10_000, reservedPolls: 0 };
    }
  },
  env: {
    STRIPE_SECRET_KEY: "fixture-key",
    COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID: "price_fixture",
    COMMENT_TRANSLATOR_STRIPE_PAID_PRODUCT_ID: "prod_fixture",
    NEXT_PUBLIC_SITE_URL: "https://fixture.invalid"
  }
});
const subscriptionBoundActions = reconciler.createCommentTranslatorPaidControlPlaneAuthoritativeActions({
  readBillingLifecycle: async () => subscriptionBoundLifecycle,
  entitlementStore: {
    ...authoritativeEntitlementStore,
    async projectEntitlement(request) {
      subscriptionBoundReconciliations.push(request);
      return "fixture-entitlement";
    }
  },
  currentObjectReader: {
    async retrieveCurrentObjectState({ eventType, objectId }) {
      assert.equal(eventType, "customer.subscription.updated");
      assert.equal(objectId, "sub_fixture");
      return {
        subscription: {
          id: "sub_fixture",
          customerId: "cus_fixture",
          status: "active",
          currentPeriodStartIso: "2026-08-01T00:00:00.000Z",
          currentPeriodEndIso: "2026-09-01T00:00:00.000Z",
          cancelAtPeriodEnd: false,
          productId: "prod_fixture",
          priceId: "price_fixture",
          latestInvoiceId: "in_fixture"
        }
      };
    },
    async retrieveCurrentSubscriptionAdjustmentState() { throw new Error("not used"); }
  },
  subscriptionCancelAdapter: { async cancelSubscription() { throw new Error("not used"); } },
  usageStore: { async closeBillingPeriod() { return true; }, async closeUtcMonth() { return true; } },
  recoverUnboundCheckoutSession: subscriptionBoundRecovery
});
const subscriptionBoundResolver = reconciler.createCommentTranslatorPaidControlPlaneWorkItemResolver({
  readBillingLifecycle: async () => subscriptionBoundLifecycle
});
assert.deepEqual(
  await subscriptionBoundResolver({
    lifecycleId: "fixture-lifecycle",
    reconcileLeaseToken: "opaque-subscription-bound-lease",
    reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z",
    workKind: "checkout-expiry"
  }),
  { lifecycleId: "fixture-lifecycle", workKind: "checkout-expiry" },
  "subscription-bound incomplete lifecycle remains on Checkout-expiry reconciliation"
);
await subscriptionBoundActions.checkoutExpiry({
  item: { lifecycleId: "fixture-lifecycle", workKind: "checkout-expiry" },
  opaqueLeaseContext: { lifecycleId: "fixture-lifecycle", reconcileLeaseToken: "opaque-subscription-bound-lease", reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z" },
  nowIso: "2026-08-14T12:00:00.000Z"
});
assert.equal(subscriptionBoundCheckoutCreates, 0, "subscription-bound incomplete lifecycle never creates Checkout");
assert.equal(subscriptionBoundReconciliations.length, 1, "subscription-bound incomplete lifecycle reconciles the current Subscription");

let safetyDeniedCheckoutCreates = 0;
const safetyDeniedRecovery = reconciler.createCommentTranslatorPaidUnboundCheckoutSessionRecovery({
  entitlementStore: { async bindCheckoutSession() { throw new Error("must not bind"); } },
  stripeAdapter: { async createCheckoutSession() { safetyDeniedCheckoutCreates += 1; throw new Error("must not create"); } },
  checkoutSafetyAuthorityReader: {
    async readCheckoutSafetyAuthority() {
      return { status: "ready", capacityAvailable: false, dailyPollBudget: 10_000, reservedPolls: 0 };
    }
  },
  env: {
    STRIPE_SECRET_KEY: "fixture-key",
    COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID: "price_fixture",
    COMMENT_TRANSLATOR_STRIPE_PAID_PRODUCT_ID: "prod_fixture",
    NEXT_PUBLIC_SITE_URL: "https://fixture.invalid"
  }
});
await assert.rejects(
  safetyDeniedRecovery({
    lifecycle: {
      ...authoritativeLifecycle,
      lifecycleState: "incomplete",
      checkoutSessionId: null,
      stripeExpiresAtIso: null,
      checkoutExpiresAtTargetIso: "2026-08-14T12:01:00.000Z",
      subscriptionId: null,
      subscriptionBindingId: null
    },
    nowIso: "2026-08-14T12:00:00.000Z"
  }),
  /Paid control-plane reconciliation failed/,
  "capacity-denied unbound recovery fails closed with a sanitized error"
);
assert.equal(safetyDeniedCheckoutCreates, 0, "capacity-denied recovery never creates Checkout");
const recoveryFinalizeRequests = [];
let recoveryCalls = 0;
const recoveryActions = reconciler.createCommentTranslatorPaidControlPlaneAuthoritativeActions({
  readBillingLifecycle: async () => ({
    ...authoritativeLifecycle,
    checkoutSessionId: null,
    stripeExpiresAtIso: null,
    checkoutExpiresAtTargetIso: "2026-08-14T12:01:00.000Z",
    subscriptionId: null,
    subscriptionBindingId: null
  }),
  entitlementStore: authoritativeEntitlementStore,
  currentObjectReader: {
    async retrieveCurrentObjectState() { throw new Error("recovery must precede Stripe expiry confirmation"); },
    async retrieveCurrentSubscriptionAdjustmentState() { throw new Error("not used"); }
  },
  subscriptionCancelAdapter: { async cancelSubscription() { throw new Error("not used"); } },
  usageStore: { async closeBillingPeriod() { return true; }, async closeUtcMonth() { return true; } },
  async recoverUnboundCheckoutSession() { recoveryCalls += 1; return true; }
});
const recoveryRun = await reconciler.createCommentTranslatorPaidControlPlaneInvocation({
  store: {
    async claimDue() {
      return [{ lifecycleId: "fixture-lifecycle", reconcileLeaseToken: "opaque-recovery-lease", reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z", workKind: "unbound-checkout-session" }];
    },
    async assertLeaseActive() { return true; },
    async finalize(request) { recoveryFinalizeRequests.push(request); return true; },
    async retry() { throw new Error("successful recovery must retain expiry work without retry"); },
    async markFailureSafe() { throw new Error("successful recovery must not enter failure safety"); }
  },
  resolveWorkItem: async () => ({ lifecycleId: "fixture-lifecycle", workKind: "unbound-checkout-session" }),
  actions: recoveryActions,
  clock: () => "2026-08-14T12:00:00.000Z"
}).run({ nowIso: "2026-08-14T12:00:00.000Z" });
assert.equal(recoveryRun.status, "success");
assert.equal(recoveryCalls, 1, "unbound Checkout recovery runs once");
assert.equal(recoveryFinalizeRequests[0].nextReconcileAtIso, "2026-08-14T12:01:00.000Z", "recovery preserves the durable expiry reconciliation time");

const completedCheckoutLifecycle = {
  ...authoritativeLifecycle,
  lifecycleState: "expire_required",
  subscriptionId: null,
  subscriptionBindingId: null
};
const completedCheckoutWrites = [];
const completedCheckoutReads = [];
let completedCheckoutBindingId = null;
const completedCheckoutAdjustmentGraph = {
  subscription: {
    id: "sub_complete_fixture",
    customerId: "cus_fixture",
    status: "active",
    productId: "prod_fixture",
    priceId: "price_fixture",
    currentPeriodStartIso: "2026-08-01T00:00:00.000Z",
    currentPeriodEndIso: "2026-09-01T00:00:00.000Z",
    cancelAtPeriodEnd: false,
    latestInvoiceId: "in_complete_fixture"
  },
  invoice: {
    id: "in_complete_fixture",
    customerId: "cus_fixture",
    subscriptionId: "sub_complete_fixture",
    status: "paid",
    paid: true,
    paymentIntentId: "pi_complete_fixture",
    chargeId: "ch_complete_fixture",
    productId: "prod_fixture",
    priceId: "price_fixture"
  },
  paymentAdjustment: { status: "unknown", successful: false, fullAmount: false, targetsCurrentPeriod: true }
};
const completedCheckoutActions = reconciler.createCommentTranslatorPaidControlPlaneAuthoritativeActions({
  readBillingLifecycle: async () => completedCheckoutLifecycle,
  paidPlanAuthority: { productId: "prod_fixture", priceId: "price_fixture" },
  entitlementStore: {
    async expireCheckoutHold() { throw new Error("completed Checkout must not release capacity"); },
    async resolveStripeBinding(request) {
      assert.deepEqual(request, {
        stripeCustomerId: "cus_fixture",
        stripeCheckoutSessionId: "cs_fixture",
        stripeSubscriptionId: "sub_complete_fixture"
      });
      return {
        status: "ready",
        binding: {
          ownerUserId: "fixture-owner",
          lifecycleId: "fixture-lifecycle",
          customerBindingId: "fixture-customer",
          holdId: "fixture-hold",
          stripeCustomerId: "cus_fixture",
          stripeCheckoutSessionId: "cs_fixture",
          stripeSubscriptionId: completedCheckoutBindingId ? "sub_complete_fixture" : null,
          subscriptionBindingId: completedCheckoutBindingId,
          productId: completedCheckoutBindingId ? "prod_fixture" : null,
          priceId: completedCheckoutBindingId ? "price_fixture" : null,
          lifecycleState: completedCheckoutBindingId ? "active" : "expire_required",
          stripeExpiresAtIso: "2026-08-14T11:59:00.000Z",
          idempotencyKey: "ct-paid-checkout-fixture"
        }
      };
    },
    async claimEntitlementProjection() {
      return { projectionLeaseToken: "opaque-completed-checkout-projection", projectionLeaseUntilIso: "2026-08-14T12:02:00.000Z" };
    },
    async bindFirstSubscription(request) {
      completedCheckoutWrites.push({ name: "bindFirstSubscription", request });
      completedCheckoutBindingId = "fixture-completed-subscription-binding";
      return completedCheckoutBindingId;
    },
    async projectEntitlement(request) {
      completedCheckoutWrites.push({ name: "projectEntitlement", request });
      return "fixture-entitlement";
    }
  },
  currentObjectReader: {
    async retrieveCurrentObjectState({ eventType, objectId }) {
      completedCheckoutReads.push({ eventType, objectId });
      if (eventType === "checkout.session.expired") {
        assert.equal(objectId, "cs_fixture");
        return {
          checkoutSession: {
            id: "cs_fixture",
            customerId: "cus_fixture",
            subscriptionId: "sub_complete_fixture",
            status: "complete",
            expiresAtIso: "2026-08-14T11:59:00.000Z",
            paymentStatus: "paid"
          }
        };
      }
      throw new Error(`complete Checkout must not use ${eventType}:${objectId} for the payment graph`);
    },
    async retrieveCurrentSubscriptionAdjustmentState({ subscriptionId }) {
      completedCheckoutReads.push({ adjustmentSubscriptionId: subscriptionId });
      return completedCheckoutAdjustmentGraph;
    }
  },
  checkoutExpiryAdapter: { async expireCheckoutSession() { throw new Error("complete Checkout must not be expired"); } },
  subscriptionCancelAdapter: { async cancelSubscription() { throw new Error("not used"); } },
  usageStore: { async closeBillingPeriod() { return true; }, async closeUtcMonth() { return true; } }
});
for (let attempt = 0; attempt < 2; attempt += 1) {
  await completedCheckoutActions.checkoutExpiry({
    item: { lifecycleId: "fixture-lifecycle", workKind: "checkout-expiry" },
    opaqueLeaseContext: { lifecycleId: "fixture-lifecycle", reconcileLeaseToken: "opaque-completed-checkout-lease", reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z" },
    nowIso: "2026-08-14T12:00:00.000Z"
  });
}
assert.equal(completedCheckoutReads.filter(({ adjustmentSubscriptionId }) => adjustmentSubscriptionId === "sub_complete_fixture").length, 2, "complete Checkout recovery retrieves the authoritative current payment graph on every retry");
assert.deepEqual(completedCheckoutWrites.map(({ name }) => name), ["bindFirstSubscription", "projectEntitlement"], "complete Checkout recovery binds once and converges through the existing projection authority");
assert.equal(completedCheckoutWrites[0].request.entitlementStatus, "active");
assert.equal(completedCheckoutWrites[0].request.reconcileLeaseToken, "opaque-completed-checkout-lease");
assert.equal(completedCheckoutWrites[1].request.status, "active");
assert.equal(completedCheckoutWrites[1].request.subscriptionBindingId, "fixture-completed-subscription-binding");

let invalidCompletedSubscriptionReads = 0;
const invalidCompletedWrites = [];
const invalidCompletedSafetyRequests = [];
const invalidCompletedRetryRequests = [];
const invalidCompletedActions = reconciler.createCommentTranslatorPaidControlPlaneAuthoritativeActions({
  readBillingLifecycle: async () => completedCheckoutLifecycle,
  paidPlanAuthority: { productId: "prod_fixture", priceId: "price_fixture" },
  entitlementStore: {
    async expireCheckoutHold(request) { invalidCompletedWrites.push({ name: "expireCheckoutHold", request }); return true; },
    async resolveStripeBinding(request) { invalidCompletedWrites.push({ name: "resolveStripeBinding", request }); throw new Error("must not bind invalid payment state"); },
    async claimEntitlementProjection(request) { invalidCompletedWrites.push({ name: "claimEntitlementProjection", request }); throw new Error("must not project invalid payment state"); },
    async bindFirstSubscription(request) { invalidCompletedWrites.push({ name: "bindFirstSubscription", request }); throw new Error("must not bind invalid payment state"); },
    async projectEntitlement(request) { invalidCompletedWrites.push({ name: "projectEntitlement", request }); throw new Error("must not project invalid payment state"); }
  },
  currentObjectReader: {
    async retrieveCurrentObjectState({ eventType }) {
      if (eventType === "checkout.session.expired") {
        return {
          checkoutSession: {
            id: "cs_fixture",
            customerId: "cus_fixture",
            subscriptionId: "sub_complete_fixture",
            status: "complete",
            expiresAtIso: "2026-08-14T11:59:00.000Z",
            paymentStatus: "paid"
          }
        };
      }
      throw new Error(`invalid payment graph must not use ${eventType}`);
    },
    async retrieveCurrentSubscriptionAdjustmentState() {
      invalidCompletedSubscriptionReads += 1;
      throw new Error("private invalid PaymentIntent or Charge graph detail");
    }
  },
  checkoutExpiryAdapter: { async expireCheckoutSession() { throw new Error("complete Checkout must not be expired"); } },
  subscriptionCancelAdapter: { async cancelSubscription() { throw new Error("not used"); } },
  usageStore: { async closeBillingPeriod() { return true; }, async closeUtcMonth() { return true; } }
});
const invalidCompletedRun = await reconciler.createCommentTranslatorPaidControlPlaneInvocation({
  store: {
    async claimDue() { return [{ lifecycleId: "fixture-lifecycle", reconcileLeaseToken: "opaque-invalid-complete-lease", reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z", workKind: "checkout-expiry" }]; },
    async assertLeaseActive() { return true; },
    async finalize() { throw new Error("invalid completion must not finalize"); },
    async markFailureSafe(request) { invalidCompletedSafetyRequests.push(request); return true; },
    async retry(request) { invalidCompletedRetryRequests.push(request); return 60; }
  },
  resolveWorkItem: async () => ({ lifecycleId: "fixture-lifecycle", workKind: "checkout-expiry" }),
  actions: invalidCompletedActions,
  clock: () => "2026-08-14T12:00:00.000Z"
}).run({ nowIso: "2026-08-14T12:00:00.000Z" });
assert.equal(invalidCompletedSubscriptionReads, 1, "complete Checkout recovery requires an authoritative current Subscription and invoice read");
assert.equal(invalidCompletedRun.status, "retry-scheduled");
assert.equal(invalidCompletedRun.retryCount, 1);
assert.equal(invalidCompletedRun.errorClassCounts["object-retrieval-failed"], 1);
assert.deepEqual(invalidCompletedWrites, [], "invalid current payment state keeps Paid stopped and capacity held without projection");
assert.equal(invalidCompletedSafetyRequests[0].workKind, "checkout-expiry");
assert.equal(invalidCompletedRetryRequests[0].errorClass, "object-retrieval-failed");
assert.doesNotMatch(JSON.stringify(invalidCompletedRun), /fixture-owner|cus_fixture|sub_complete_fixture|in_complete_fixture|private invalid/i);

for (const paidPlanAuthority of [
  { productId: "prod_mismatch", priceId: "price_fixture" },
  { productId: "prod_fixture", priceId: "price_mismatch" },
  { productId: "", priceId: "price_fixture" },
  { productId: "prod_fixture", priceId: "" }
]) {
  const invalidPlanWrites = [];
  const invalidPlanRetryRequests = [];
  const invalidPlanActions = reconciler.createCommentTranslatorPaidControlPlaneAuthoritativeActions({
    readBillingLifecycle: async () => completedCheckoutLifecycle,
    paidPlanAuthority,
    entitlementStore: {
      async expireCheckoutHold(request) { invalidPlanWrites.push({ name: "expireCheckoutHold", request }); return true; },
      async resolveStripeBinding(request) { invalidPlanWrites.push({ name: "resolveStripeBinding", request }); throw new Error("must not bind invalid configured plan"); },
      async claimEntitlementProjection(request) { invalidPlanWrites.push({ name: "claimEntitlementProjection", request }); throw new Error("must not project invalid configured plan"); },
      async bindFirstSubscription(request) { invalidPlanWrites.push({ name: "bindFirstSubscription", request }); throw new Error("must not bind invalid configured plan"); },
      async projectEntitlement(request) { invalidPlanWrites.push({ name: "projectEntitlement", request }); throw new Error("must not project invalid configured plan"); }
    },
    currentObjectReader: {
      async retrieveCurrentObjectState({ eventType }) {
        if (eventType !== "checkout.session.expired") throw new Error("complete Checkout must use the adjustment reader");
        return {
          checkoutSession: {
            id: "cs_fixture",
            customerId: "cus_fixture",
            subscriptionId: "sub_complete_fixture",
            status: "complete",
            expiresAtIso: "2026-08-14T11:59:00.000Z",
            paymentStatus: "paid"
          }
        };
      },
      async retrieveCurrentSubscriptionAdjustmentState() { return completedCheckoutAdjustmentGraph; }
    },
    checkoutExpiryAdapter: { async expireCheckoutSession() { throw new Error("complete Checkout must not be expired"); } },
    subscriptionCancelAdapter: { async cancelSubscription() { throw new Error("not used"); } },
    usageStore: { async closeBillingPeriod() { return true; }, async closeUtcMonth() { return true; } }
  });
  const invalidPlanRun = await reconciler.createCommentTranslatorPaidControlPlaneInvocation({
    store: {
      async claimDue() { return [{ lifecycleId: "fixture-lifecycle", reconcileLeaseToken: "opaque-invalid-plan-lease", reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z", workKind: "checkout-expiry" }]; },
      async assertLeaseActive() { return true; },
      async finalize() { throw new Error("invalid configured plan must not finalize"); },
      async markFailureSafe() { return true; },
      async retry(request) { invalidPlanRetryRequests.push(request); return 60; }
    },
    resolveWorkItem: async () => ({ lifecycleId: "fixture-lifecycle", workKind: "checkout-expiry" }),
    actions: invalidPlanActions,
    clock: () => "2026-08-14T12:00:00.000Z"
  }).run({ nowIso: "2026-08-14T12:00:00.000Z" });
  assert.equal(invalidPlanRun.status, "retry-scheduled", "invalid configured Paid plan schedules a sanitized retry");
  assert.equal(invalidPlanRun.errorClassCounts["binding-not-ready"], 1);
  assert.equal(invalidPlanRetryRequests[0].errorClass, "binding-not-ready");
  assert.doesNotMatch(JSON.stringify(invalidPlanRun), /fixture-owner|cus_fixture|sub_complete_fixture|in_complete_fixture|prod_mismatch|price_mismatch/);
  assert.deepEqual(invalidPlanWrites, [], "invalid configured Paid plan neither binds, projects, nor releases the hold");
}

const authoritativeActions = reconciler.createCommentTranslatorPaidControlPlaneAuthoritativeActions({
  readBillingLifecycle: async () => authoritativeLifecycle,
  entitlementStore: authoritativeEntitlementStore,
  currentObjectReader: {
    async retrieveCurrentSubscriptionAdjustmentState() { throw new Error("not used in this fixture"); },
    async retrieveCurrentObjectState({ eventType }) {
      authoritativeCalls.push({ name: "retrieveCurrentObjectState", eventType });
      if (eventType === "checkout.session.expired") {
        return { checkoutSession: { id: "cs_fixture", customerId: "cus_fixture", subscriptionId: null, status: "expired", expiresAtIso: "2026-08-14T11:59:00.000Z", paymentStatus: "unpaid" } };
      }
      authoritativeSubscriptionReads += 1;
      const subscriptionStatus = authoritativeSubscriptionReads === 1 ? "past_due" : "active";
      return {
        subscription: {
          id: "sub_fixture",
          customerId: "cus_fixture",
          status: subscriptionStatus,
          productId: "prod_fixture",
          priceId: "price_fixture",
          currentPeriodStartIso: "2026-08-01T00:00:00.000Z",
          currentPeriodEndIso: "2026-09-01T00:00:00.000Z",
          cancelAtPeriodEnd: false,
          latestInvoiceId: subscriptionStatus === "active" ? "in_rollover" : null
        },
        invoice: subscriptionStatus === "active" ? paidRolloverInvoice : undefined
      };
    }
  },
  subscriptionCancelAdapter: {
    async cancelSubscription(request) {
      authoritativeCancellationRequests.push(request);
      const { subscriptionId } = request;
      authoritativeCalls.push({ name: "cancelSubscription", subscriptionId });
      return {
        id: subscriptionId,
        customerId: "cus_fixture",
        status: "canceled",
        productId: "prod_fixture",
        priceId: "price_fixture",
        currentPeriodStartIso: "2026-08-01T00:00:00.000Z",
        currentPeriodEndIso: "2026-09-01T00:00:00.000Z",
        cancelAtPeriodEnd: false,
        latestInvoiceId: null
      };
    }
  },
  usageStore: {
    async closeBillingPeriod(request) { authoritativeCalls.push({ name: "closeBillingPeriod", request }); return true; },
    async closeUtcMonth(request) { authoritativeCalls.push({ name: "closeUtcMonth", request }); return true; }
  }
});
await authoritativeActions.checkoutExpiry({
  item: { lifecycleId: "fixture-lifecycle", workKind: "checkout-expiry" },
  opaqueLeaseContext: { lifecycleId: "fixture-lifecycle", reconcileLeaseToken: "opaque-reconcile-lease", reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z" },
  nowIso: "2026-08-14T12:00:00.000Z"
});
await authoritativeActions.paymentFailureSevenDay({
  item: { lifecycleId: "fixture-lifecycle", workKind: "payment-failure-seven-day" },
  opaqueLeaseContext: { lifecycleId: "fixture-lifecycle", reconcileLeaseToken: "opaque-reconcile-lease", reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z" },
  nowIso: "2026-08-14T12:00:00.000Z"
});
await authoritativeActions.billingPeriodRollover({
  item: { lifecycleId: "fixture-lifecycle", workKind: "billing-period-rollover" },
  opaqueLeaseContext: { lifecycleId: "fixture-lifecycle", reconcileLeaseToken: "opaque-reconcile-lease", reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z" },
  nowIso: "2026-08-14T12:00:00.000Z"
});
await authoritativeActions.utcMonthCostRollover({
  item: { lifecycleId: "fixture-lifecycle", workKind: "utc-month-cost-rollover" },
  opaqueLeaseContext: { lifecycleId: "fixture-lifecycle", reconcileLeaseToken: "opaque-reconcile-lease", reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z" },
  nowIso: "2026-08-14T12:00:00.000Z"
});
const refundActions = reconciler.createCommentTranslatorPaidControlPlaneAuthoritativeActions({
  readBillingLifecycle: async () => ({
    ...authoritativeLifecycle,
    lifecycleState: "refund_reconciliation",
    paymentFailureStartedAtIso: null
  }),
  entitlementStore: authoritativeEntitlementStore,
  currentObjectReader: {
    async retrieveCurrentObjectState() { throw new Error("adjustment reconciliation must not use subscription-only reads"); },
    async retrieveCurrentSubscriptionAdjustmentState() {
      return {
        subscription: {
          id: "sub_fixture",
          customerId: "cus_fixture",
          status: "active",
          productId: "prod_fixture",
          priceId: "price_fixture",
          currentPeriodStartIso: "2026-08-01T00:00:00.000Z",
          currentPeriodEndIso: "2026-09-01T00:00:00.000Z",
          cancelAtPeriodEnd: false,
          latestInvoiceId: "in_fixture"
        },
        invoice: {
          id: "in_fixture",
          customerId: "cus_fixture",
          subscriptionId: "sub_fixture",
          status: "paid",
          paid: true,
          paymentIntentId: "pi_fixture",
          chargeId: "ch_fixture",
          productId: "prod_fixture",
          priceId: "price_fixture"
        },
        paymentAdjustment: { status: "succeeded", successful: true, fullAmount: true, targetsCurrentPeriod: true }
      };
    }
  },
  subscriptionCancelAdapter: {
    async cancelSubscription(request) {
      authoritativeCancellationRequests.push(request);
      return {
        id: request.subscriptionId,
        customerId: "cus_fixture",
        status: "canceled",
        productId: "prod_fixture",
        priceId: "price_fixture",
        currentPeriodStartIso: "2026-08-01T00:00:00.000Z",
        currentPeriodEndIso: "2026-09-01T00:00:00.000Z",
        cancelAtPeriodEnd: false,
        latestInvoiceId: null
      };
    }
  },
  usageStore: {
    async closeBillingPeriod() { return true; },
    async closeUtcMonth() { return true; }
  }
});
await refundActions.refundReconciliation({
  item: { lifecycleId: "fixture-lifecycle", workKind: "refund-reconciliation" },
  opaqueLeaseContext: { lifecycleId: "fixture-lifecycle", reconcileLeaseToken: "opaque-reconcile-lease", reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z" },
  nowIso: "2026-08-14T12:00:00.000Z"
});
assert.equal(authoritativeCancellationRequests.at(-1).prorationBehavior, "none", "full-refund reconciliation requests no-proration cancellation");
assert.equal(authoritativeCancellationRequests.at(-1).idempotencyKey.startsWith("ct-paid-reconcile-refund-cancel-"), true, "full-refund reconciliation uses a durable idempotency key");
const refundProjectionCount = authoritativeCalls.filter(({ name }) => name === "projectEntitlement").length;
const refundGraph = ({ fullAmount, targetsCurrentPeriod, status = "succeeded", successful = true }) => ({
  subscription: {
    id: "sub_fixture", customerId: "cus_fixture", status: "active", productId: "prod_fixture", priceId: "price_fixture",
    currentPeriodStartIso: "2026-08-01T00:00:00.000Z", currentPeriodEndIso: "2026-09-01T00:00:00.000Z",
    cancelAtPeriodEnd: false, latestInvoiceId: "in_fixture"
  },
  invoice: {
    id: "in_fixture", customerId: "cus_fixture", subscriptionId: "sub_fixture", status: "paid", paid: true,
    paymentIntentId: "pi_fixture", chargeId: "ch_fixture", productId: "prod_fixture", priceId: "price_fixture"
  },
  paymentAdjustment: { status, successful, fullAmount, targetsCurrentPeriod }
});
const fullCreditNoteProjectionStatuses = [];
const fullCreditNoteCancellationRequests = [];
const fullCreditNoteActions = reconciler.createCommentTranslatorPaidControlPlaneAuthoritativeActions({
  readBillingLifecycle: async () => ({ ...authoritativeLifecycle, lifecycleState: "refund_reconciliation", paymentFailureStartedAtIso: null }),
  entitlementStore: {
    ...authoritativeEntitlementStore,
    async projectEntitlement(request) {
      fullCreditNoteProjectionStatuses.push(request.status);
      return "fixture-entitlement";
    }
  },
  currentObjectReader: {
    async retrieveCurrentObjectState() { throw new Error("subscription-only graph forbidden"); },
    async retrieveCurrentSubscriptionAdjustmentState() {
      return refundGraph({ fullAmount: true, targetsCurrentPeriod: true, status: "issued", successful: true });
    }
  },
  subscriptionCancelAdapter: {
    async cancelSubscription(request) {
      fullCreditNoteCancellationRequests.push(request);
      return { ...refundGraph({ fullAmount: true, targetsCurrentPeriod: true }).subscription, status: "canceled" };
    }
  },
  usageStore: { async closeBillingPeriod() { return true; }, async closeUtcMonth() { return true; } }
});
await fullCreditNoteActions.refundReconciliation({
  item: { lifecycleId: "fixture-lifecycle", workKind: "refund-reconciliation" },
  opaqueLeaseContext: { lifecycleId: "fixture-lifecycle", reconcileLeaseToken: "opaque-reconcile-lease", reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z" },
  nowIso: "2026-08-14T12:00:00.000Z"
});
assert.deepEqual(fullCreditNoteProjectionStatuses, ["refund_reconciliation", "canceled"], "full current-period Credit Note never restores Paid");
assert.equal(fullCreditNoteCancellationRequests.length, 1, "full current-period Credit Note cancels exactly once");
assert.equal(fullCreditNoteCancellationRequests[0].prorationBehavior, "none", "full Credit Note uses no-proration cancellation");
assert.match(fullCreditNoteCancellationRequests[0].idempotencyKey, /^ct-paid-reconcile-refund-cancel-/, "full Credit Note cancellation is idempotent");
for (const refundCase of [
  { label: "current partial", graph: refundGraph({ fullAmount: false, targetsCurrentPeriod: true }) },
  { label: "past full", graph: refundGraph({ fullAmount: true, targetsCurrentPeriod: false }) },
  { label: "past partial", graph: refundGraph({ fullAmount: false, targetsCurrentPeriod: false }) },
  { label: "unknown adjustment", graph: refundGraph({ fullAmount: false, targetsCurrentPeriod: true, status: "unknown", successful: false }) }
]) {
  const cancellationCount = authoritativeCancellationRequests.length;
  const projectionCount = authoritativeCalls.filter(({ name }) => name === "projectEntitlement").length;
  const nonTerminalRefundActions = reconciler.createCommentTranslatorPaidControlPlaneAuthoritativeActions({
    readBillingLifecycle: async () => ({ ...authoritativeLifecycle, lifecycleState: "refund_reconciliation", paymentFailureStartedAtIso: null }),
    entitlementStore: authoritativeEntitlementStore,
    currentObjectReader: {
      async retrieveCurrentObjectState() { throw new Error("subscription-only graph forbidden"); },
      async retrieveCurrentSubscriptionAdjustmentState() { return refundCase.graph; }
    },
    subscriptionCancelAdapter: { async cancelSubscription() { throw new Error(`${refundCase.label} refund must not cancel`); } },
    usageStore: { async closeBillingPeriod() { return true; }, async closeUtcMonth() { return true; } }
  });
  await nonTerminalRefundActions.refundReconciliation({
    item: { lifecycleId: "fixture-lifecycle", workKind: "refund-reconciliation" },
    opaqueLeaseContext: { lifecycleId: "fixture-lifecycle", reconcileLeaseToken: "opaque-reconcile-lease", reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z" },
    nowIso: "2026-08-14T12:00:00.000Z"
  });
  assert.equal(authoritativeCancellationRequests.length, cancellationCount, `${refundCase.label} refund does not invoke cancellation`);
  assert.equal(authoritativeCalls.filter(({ name }) => name === "projectEntitlement").length, projectionCount + 1, `${refundCase.label} refund projects current subscription state`);
  assert.equal(authoritativeCalls.at(-1).request.status, "active", `${refundCase.label} refund keeps current Paid entitlement`);
  assert.equal(authoritativeCalls.at(-1).request.lifecycleState, "active", `${refundCase.label} refund leaves manual reconciliation state`);
}
assert.ok(authoritativeCalls.filter(({ name }) => name === "projectEntitlement").length >= refundProjectionCount + 4);
const currentDisputeGraph = (status, overrides = {}) => ({
  subscription: {
    id: "sub_fixture", customerId: "cus_fixture", status: "active", productId: "prod_fixture", priceId: "price_fixture",
    currentPeriodStartIso: "2026-08-01T00:00:00.000Z", currentPeriodEndIso: "2026-09-01T00:00:00.000Z",
    cancelAtPeriodEnd: false, latestInvoiceId: "in_fixture"
  },
  invoice: {
    id: "in_fixture", customerId: "cus_fixture", subscriptionId: "sub_fixture", status: "paid", paid: true,
    paymentIntentId: "pi_fixture", chargeId: "ch_fixture", productId: "prod_fixture", priceId: "price_fixture"
  },
  dispute: {
    id: "dp_fixture", status, customerId: "cus_fixture", subscriptionId: "sub_fixture", invoiceId: "in_fixture",
    paymentIntentId: "pi_fixture", chargeId: "ch_fixture", ...overrides
  },
  paymentAdjustment: { status: "unknown", successful: false, fullAmount: false, targetsCurrentPeriod: true }
});
const wonDisputeActions = reconciler.createCommentTranslatorPaidControlPlaneAuthoritativeActions({
  readBillingLifecycle: async () => ({ ...authoritativeLifecycle, lifecycleState: "dispute_reconciliation", disputeState: "investigating", paymentFailureStartedAtIso: null }),
  entitlementStore: authoritativeEntitlementStore,
  currentObjectReader: {
    async retrieveCurrentObjectState() { throw new Error("subscription-only graph forbidden"); },
    async retrieveCurrentSubscriptionAdjustmentState() { return currentDisputeGraph("won"); }
  },
  subscriptionCancelAdapter: { async cancelSubscription() { throw new Error("won dispute must not cancel"); } },
  usageStore: { async closeBillingPeriod() { return true; }, async closeUtcMonth() { return true; } }
});
await wonDisputeActions.disputeReconciliation({
  item: { lifecycleId: "fixture-lifecycle", workKind: "dispute-reconciliation" },
  opaqueLeaseContext: { lifecycleId: "fixture-lifecycle", reconcileLeaseToken: "opaque-reconcile-lease", reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z" },
  nowIso: "2026-08-14T12:00:00.000Z"
});
assert.equal(authoritativeCalls.at(-1).request.disputeState, "won", "won dispute restores only from a bound current-period graph");

const mismatchedDisputeActions = reconciler.createCommentTranslatorPaidControlPlaneAuthoritativeActions({
  readBillingLifecycle: async () => ({ ...authoritativeLifecycle, lifecycleState: "dispute_reconciliation", disputeState: "won", paymentFailureStartedAtIso: null }),
  entitlementStore: authoritativeEntitlementStore,
  currentObjectReader: {
    async retrieveCurrentObjectState() { throw new Error("subscription-only graph forbidden"); },
    async retrieveCurrentSubscriptionAdjustmentState() { return currentDisputeGraph("won", { chargeId: "ch_mismatch" }); }
  },
  subscriptionCancelAdapter: { async cancelSubscription() { throw new Error("mismatched dispute must not cancel"); } },
  usageStore: { async closeBillingPeriod() { return true; }, async closeUtcMonth() { return true; } }
});
await assert.rejects(
  mismatchedDisputeActions.disputeReconciliation({
    item: { lifecycleId: "fixture-lifecycle", workKind: "dispute-reconciliation" },
    opaqueLeaseContext: { lifecycleId: "fixture-lifecycle", reconcileLeaseToken: "opaque-reconcile-lease", reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z" },
    nowIso: "2026-08-14T12:00:00.000Z"
  }),
  (error) => error.reconcileErrorClass === "binding-not-ready",
  "mismatched dispute graph fails closed"
);

const lostDisputeCancellationRequests = [];
const lostDisputeActions = reconciler.createCommentTranslatorPaidControlPlaneAuthoritativeActions({
  readBillingLifecycle: async () => ({ ...authoritativeLifecycle, lifecycleState: "dispute", disputeState: "investigating", paymentFailureStartedAtIso: null }),
  entitlementStore: authoritativeEntitlementStore,
  currentObjectReader: {
    async retrieveCurrentObjectState() { throw new Error("subscription-only graph forbidden"); },
    async retrieveCurrentSubscriptionAdjustmentState() { return currentDisputeGraph("lost"); }
  },
  subscriptionCancelAdapter: {
    async cancelSubscription(request) {
      lostDisputeCancellationRequests.push(request);
      return { ...currentDisputeGraph("lost").subscription, status: "canceled" };
    }
  },
  usageStore: { async closeBillingPeriod() { return true; }, async closeUtcMonth() { return true; } }
});
await lostDisputeActions.disputeReconciliation({
  item: { lifecycleId: "fixture-lifecycle", workKind: "dispute-reconciliation" },
  opaqueLeaseContext: { lifecycleId: "fixture-lifecycle", reconcileLeaseToken: "opaque-reconcile-lease", reconcileLeaseUntilIso: "2026-08-14T12:02:00.000Z" },
  nowIso: "2026-08-14T12:00:00.000Z"
});
assert.equal(lostDisputeCancellationRequests[0].prorationBehavior, "none", "lost dispute requests no-proration cancellation");
assert.match(lostDisputeCancellationRequests[0].idempotencyKey, /^ct-paid-reconcile-dispute-cancel-/, "lost dispute cancellation is idempotent");
assert.ok(authoritativeCalls.some(({ name }) => name === "expireCheckoutHold"), "checkout expiry uses the durable hold release authority");
assert.ok(authoritativeCalls.some(({ name }) => name === "cancelSubscription"), "seven-day payment failure uses idempotent Stripe cancellation");
assert.ok(authoritativeCalls.filter(({ name }) => name === "projectEntitlement").length >= 2, "reconciliation projects current Stripe state through the entitlement authority");
assert.ok(authoritativeCalls.some(({ name }) => name === "closeBillingPeriod"), "personal billing rollover closes the usage period");
assert.ok(authoritativeCalls.some(({ name }) => name === "closeUtcMonth"), "UTC cost rollover closes the global cost month");

const retentionJob = await retention.runCommentTranslatorPaidRetentionJob({
  scheduler: { supabaseCronAvailable: true, cloudflareCronAvailable: false },
  cleanupStore: {
    async runBoundedCleanup() {
      return {
        feedSnapshotDeleted: 2,
        providerHourlyDetailDeleted: 3,
        sessionSummaryDeleted: 1,
        stripeEventDeleted: 4,
        aggregateDeleted: 5,
        endedSubscriptionDeleted: 1,
        attemptLedgerDeleted: 6
      };
    }
  },
  nowIso: "2026-08-14T12:00:00.000Z",
  limit: 500
});
assert.equal(retentionJob.status, "success");
assert.equal(retentionJob.schedulerAuthority, "supabase-cron");
assert.equal(retentionJob.deletedCount, 22);
assert.equal(retentionJob.limit, 500);
assert.doesNotMatch(JSON.stringify(retentionJob), /server-only|ownerUserId|rawComment|providerPayload|secret/i);

let maintenanceCleanupCalls = 0;
let maintenanceReconcileCalls = 0;
const maintenanceSchedulerRecords = [];
const maintenanceRun = await retention.runCommentTranslatorPaidTask9ScheduledMaintenance({
  scheduler: { supabaseCronAvailable: true, cloudflareCronAvailable: false, callerAuthority: "supabase-cron" },
  cleanupStore: {
    async runBoundedCleanup({ limit }) {
      maintenanceCleanupCalls += 1;
      assert.equal(limit, 500);
      return {
        feedSnapshotDeleted: 0,
        providerHourlyDetailDeleted: 0,
        sessionSummaryDeleted: 0,
        stripeEventDeleted: 0,
        aggregateDeleted: 0,
        endedSubscriptionDeleted: 0,
        attemptLedgerDeleted: 0
      };
    },
    async recordSchedulerRun(request) {
      maintenanceSchedulerRecords.push(request);
      return true;
    }
  },
  runReconcile: async ({ limit }) => {
    maintenanceReconcileCalls += 1;
    assert.equal(limit, 50);
    return {
      status: "retry-scheduled",
      claimedCount: 2,
      retryCount: 1,
      staleCount: 0,
      errorClassCounts: { "binding-not-ready": 1, "private-secret-reference": 9 }
    };
  },
  nowIso: "2026-08-14T12:00:00.000Z"
});
assert.equal(maintenanceRun.status, "retry-scheduled");
assert.equal(maintenanceRun.schedulerAuthority, "supabase-cron");
assert.equal(maintenanceRun.claimCount, 2);
assert.equal(maintenanceRun.retryCount, 1);
assert.equal(maintenanceRun.staleCount, 0);
assert.deepEqual(maintenanceRun.errorClassCounts, { "binding-not-ready": 1 });
assert.equal(maintenanceCleanupCalls, 1);
assert.equal(maintenanceReconcileCalls, 1);
assert.equal(maintenanceRun.deploymentStatus, "repository-invocation-seam-only-not-deployed");
assert.equal(maintenanceSchedulerRecords[0].status, "retry-scheduled", "retry reconcile status is not recorded as success");
assert.equal(maintenanceSchedulerRecords[0].lastSuccessAtIso, null, "retry run cannot advance last success");

const staleSchedulerRecords = [];
const staleMaintenanceRun = await retention.runCommentTranslatorPaidTask9ScheduledMaintenance({
  scheduler: { supabaseCronAvailable: true, cloudflareCronAvailable: false, callerAuthority: "supabase-cron" },
  cleanupStore: {
    async runBoundedCleanup() {
      return {
        feedSnapshotDeleted: 0, providerHourlyDetailDeleted: 0, sessionSummaryDeleted: 0, stripeEventDeleted: 0,
        aggregateDeleted: 0, endedSubscriptionDeleted: 0, attemptLedgerDeleted: 0
      };
    },
    async recordSchedulerRun(request) { staleSchedulerRecords.push(request); return true; }
  },
  runReconcile: async () => ({
    status: "stale", claimedCount: 1, retryCount: 0, staleCount: 1, errorClassCounts: {}
  }),
  nowIso: "2026-08-14T12:00:30.000Z"
});
assert.equal(staleMaintenanceRun.status, "stale");
assert.equal(staleSchedulerRecords[0].status, "stale", "stale reconcile status is not recorded as success");
assert.equal(staleSchedulerRecords[0].lastSuccessAtIso, null, "stale run cannot advance last success");

let delayedReconcileCompleted = false;
const partialFailureMaintenance = await retention.runCommentTranslatorPaidTask9ScheduledMaintenance({
  scheduler: { supabaseCronAvailable: true, cloudflareCronAvailable: false },
  cleanupStore: {
    async runBoundedCleanup() {
      throw new Error("private cleanup failure detail");
    }
  },
  runReconcile: async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    delayedReconcileCompleted = true;
    return {
      claimedCount: 4,
      retryCount: 2,
      staleCount: 1,
      errorClassCounts: { "binding-not-ready": 2, "private-secret-reference": 9 }
    };
  },
  nowIso: "2026-08-14T12:00:00.000Z"
});
assert.equal(delayedReconcileCompleted, true, "maintenance awaits the delayed lane after the other lane rejects");
assert.equal(partialFailureMaintenance.status, "failed");
assert.equal(partialFailureMaintenance.deletedCount, 0, "only the failed cleanup lane is zeroed");
assert.equal(partialFailureMaintenance.claimCount, 4, "successful reconcile counts are preserved");
assert.equal(partialFailureMaintenance.retryCount, 2);
assert.equal(partialFailureMaintenance.staleCount, 1);
assert.deepEqual(partialFailureMaintenance.errorClassCounts, { "binding-not-ready": 2 });
assert.equal(partialFailureMaintenance.errorClass, "database-transaction-failed");
assert.equal(partialFailureMaintenance.lastSuccessAtIso, null);
assert.doesNotMatch(JSON.stringify(partialFailureMaintenance), /private cleanup failure detail|private-secret-reference/i);

const ambiguousMaintenance = await retention.runCommentTranslatorPaidTask9ScheduledMaintenance({
  scheduler: { supabaseCronAvailable: true, cloudflareCronAvailable: true },
  cleanupStore: { async runBoundedCleanup() { throw new Error("must not run"); } },
  runReconcile: async () => { throw new Error("must not run"); },
  nowIso: "2026-08-14T12:00:00.000Z"
});
assert.equal(ambiguousMaintenance.status, "unavailable");
assert.equal(ambiguousMaintenance.errorClass, "scheduler-ambiguous");

const adminView = observability.createCommentTranslatorPaidSanitizedAdminView({
  nowIso: "2026-08-14T12:00:00.000Z",
  scheduler: {
    authority: "supabase-cron",
    lastSuccessAtIso: "2026-08-14T11:59:00.000Z",
    runStatus: "success",
    claimCount: 4,
    retryCount: 1,
    staleCount: 0,
    attemptAlertCount: 2,
    errorClassCounts: { "object-retrieval-failed": 1, "private-secret-reference": 3 }
  },
  capacity: { activeCount: 2, heldCount: 1, limit: 20 },
  entitlement: { activeCount: 2, stoppedCount: 1, reconciliationCount: 1 },
  provider: { requestCount: 10, successCount: 9, failureCount: 1, fallbackCount: 1, circuitState: "closed" },
  cost: { reservedMicros: 100, committedMicros: 200, individualLimitMicros: 3_000_000, globalLimitMicros: 25_000_000 },
  infra: { supabaseDbTotalBytes: 100, supabaseDbLimitBytes: 500_000_000, cloudflareDailyRequests: 80_000, cloudflareDailyLimit: 100_000 }
});
assert.equal(adminView.capacity.activeCount, 2);
assert.equal(adminView.entitlement.reconciliationCount, 1);
assert.equal(adminView.provider.failureCount, 1);
assert.equal(adminView.cost.globalLimitMicros, 25_000_000);
assert.equal(adminView.infra.cloudflareDailyRequests, 80_000);
assert.equal(adminView.infra.cloudflareStopCheckoutPercent, 80);
assert.equal(adminView.infra.cloudflareStopNewSessionPercent, 90);
assert.equal(adminView.infra.cloudflareStopActivePollPercent, 95);
assert.equal(adminView.outputBoundary, "sanitized-aggregate-and-reference-only");
assert.equal(adminView.scheduler.attemptAlertCount, 2, "five-or-more attempt alerts remain distinct from scheduler run retry counts");
assert.deepEqual(adminView.scheduler.errorClassCounts, { "object-retrieval-failed": 1 });
const unavailableCloudflareView = observability.createCommentTranslatorPaidSanitizedAdminView({
  ...adminView,
  nowIso: "2026-08-14T12:01:00.000Z",
  infra: { ...adminView.infra, cloudflareDailyRequests: null }
});
assert.equal(unavailableCloudflareView.infra.cloudflareDailyRequests, null, "missing Cloudflare measurement remains explicitly unavailable");
assert.doesNotMatch(JSON.stringify(adminView), /ownerUserId|lifecycleId|stripe_[a-z0-9]+|liveChatId|rawComment|secret|token-value/i);
const disabledCircuitReader = observability.createCommentTranslatorPaidSanitizedAdminVisibilityReader({
  supabase: {
    async rpc() {
      return {
        data: {
          generated_at: "2026-08-14T12:00:00.000Z",
          scheduler_attempt_alert_count: 3,
          provider_circuit_status: "disabled",
          provider_circuit_degraded_count: 0
        },
        error: null
      };
    }
  }
});
const disabledCircuitView = await disabledCircuitReader.read({ nowIso: "2026-08-14T12:00:00.000Z" });
assert.equal(disabledCircuitView?.provider.circuitState, "disabled", "disabled provider circuit is never projected as closed");
assert.equal(disabledCircuitView?.scheduler.attemptAlertCount, 3, "reader projects the sanitized high-attempt aggregate");
const halfOpenCircuitReader = observability.createCommentTranslatorPaidSanitizedAdminVisibilityReader({
  supabase: {
    async rpc() {
      return { data: { provider_circuit_status: "half_open", provider_circuit_degraded_count: 1 }, error: null };
    }
  }
});
assert.equal((await halfOpenCircuitReader.read())?.provider.circuitState, "half_open", "half-open provider circuit keeps priority over degraded compatibility count");

const selectCalls = [];
const upsertRows = [];
let fromCalls = 0;
let singleCalls = 0;
let feedReadback = { id: "server-only-feed-row", display_row_count: 1 };
const query = {
  select(columns) {
    selectCalls.push(columns);
    return query;
  },
  upsert(row) {
    upsertRows.push(row);
    return query;
  },
  delete() {
    return query;
  },
  eq() {
    return query;
  },
  async single() {
    singleCalls += 1;
    return { data: feedReadback, error: null };
  }
};
const feedStoreResult = feedStore.createCommentTranslatorRealCommentsFeedSupabaseDurableStore({
  supabase: {
    from() {
      fromCalls += 1;
      return query;
    }
  },
  nowIso: () => "2026-08-14T12:00:00.000Z"
});
const feedPersistRequest = {
  ownerUserId: "server-only-owner",
  sessionReferenceId: "server-only-session",
  recordedAtIso: "2026-08-14T12:00:00.000Z",
  feed: {
    status: "ready",
    source: "server-owned-live-session-state",
    rows: [{
      id: "private-provider-message-reference",
      provider: "youtube",
      messageReferenceId: "private-provider-message-reference",
      kind: "super-chat",
      timestamp: "21:00 JST",
      publishedAtIso: "2026-08-14T12:00:00.000Z",
      source: "youtube-live-chat",
      sourceAttributionLabel: "Source: YouTube Live Chat",
      role: "member",
      authorLabel: "YouTube viewer",
      authorDisplayName: "Safe Viewer",
      originalText: "hello",
      translatedText: "こんにちは",
      targetLanguage: "ja",
      translationStatus: "translated-f10",
      translationCacheStatus: "miss",
      moderationLabel: "visible",
      deletionPropagation: "not-deleted",
      badgeLabel: "super-chat",
      purchaseLabel: "private-purchase-metadata",
      memberMonthCount: 12,
      rawProviderPayload: "not-returned-by-design",
      rawComments: "not-returned-by-design",
      authorChannelMaterial: "not-returned-by-design",
      providerTargetMetadata: "forbidden",
      serverOnlyCursor: "not-returned-by-design"
    }],
    unavailableReason: null,
    sanitizedSummary: {
      displayRowCount: 1,
      safeRowSource: "f8-browser-safe-projection",
      fixtureFeedAuthority: "disabled",
      manualFeedAuthority: "disabled",
      rawProviderPayload: "not-returned-by-design",
      rawComments: "not-returned-by-design",
      authorChannelMaterial: "not-returned-by-design",
      providerTargetMetadata: "forbidden",
      serverOnlyCursor: "not-returned-by-design",
      liveProviderDiagnostics: null
    },
    rawProviderPayload: "not-returned-by-design",
    rawComments: "not-returned-by-design",
    providerTargetMetadata: "forbidden",
    serverOnlyCursor: "not-returned-by-design",
    browserStorage: "unchanged",
    handoffPayload: "unchanged",
    publicLaunchAllowed: false
  }
};
const feedPersistResult = await feedStoreResult.persistSafeFeed(feedPersistRequest);
assert.equal(feedPersistResult.durableFeedPersistResultLabel, "durable-feed-persisted");
assert.deepEqual(selectCalls, ["id, display_row_count"]);
assert.equal(fromCalls, 1, "feed upsert uses one Supabase write/readback chain");
assert.equal(singleCalls, 1, "feed upsert performs one id/count confirmation");
assert.equal(upsertRows.length, 1);
const persistedFeed = upsertRows[0].feed_snapshot;
assert.deepEqual(
  [...feedStore.commentTranslatorRealCommentsFeedDurableStoreContract.durableFeedSnapshotRowKeys],
  ["originalText", "translatedText", "authorDisplayName", "publishedAtIso"],
  "durable feed rows allow exactly the four approved safe fields"
);
assert.match(sources.feedActions, /resolvePresentationTargetLanguage\(options\.targetLanguage\)/, "restore action validates the presentation target language");
assert.match(sources.feedActions, /readCommentTranslatorRealCommentsFeedForActiveSession\([\s\S]+?targetLanguage/, "restore action passes the presentation target language to the server bridge");
assert.match(sources.feedBridge, /readSafeFeed\([\s\S]+?targetLanguage/, "server bridge passes target language to durable restore");
assert.deepEqual(Object.keys(persistedFeed.rows[0]).sort(), [...feedStore.commentTranslatorRealCommentsFeedDurableStoreContract.durableFeedSnapshotRowKeys].sort());
assert.deepEqual(
  {
    originalText: persistedFeed.rows[0].originalText,
    translatedText: persistedFeed.rows[0].translatedText,
    authorDisplayName: persistedFeed.rows[0].authorDisplayName,
    publishedAtIso: persistedFeed.rows[0].publishedAtIso
  },
  { originalText: "hello", translatedText: "こんにちは", authorDisplayName: "Safe Viewer", publishedAtIso: "2026-08-14T12:00:00.000Z" }
);
assert.doesNotMatch(JSON.stringify(persistedFeed), /private-provider-message-reference|private-purchase-metadata|messageReferenceId|purchaseLabel|memberMonthCount|timestamp|role/i);
assert.ok(retention.measureCommentTranslatorPaidFeedSnapshotBytes(persistedFeed) <= 8 * 1024, "normal non-empty snapshot stays within the 8KB standard");

feedReadback = { id: "", display_row_count: 0 };
const mismatchedFeedPersistResult = await feedStoreResult.persistSafeFeed(feedPersistRequest);
assert.equal(mismatchedFeedPersistResult.durableFeedPersistResultLabel, "durable-feed-persist-failed");
assert.equal(mismatchedFeedPersistResult.durableFeedPersistDiagnostics.persistFailureBucketLabel, "row-write-not-confirmed");
assert.equal(mismatchedFeedPersistResult.durableFeedPersistDiagnostics.readbackLabel, "readback-shape-mismatch");
assert.equal(mismatchedFeedPersistResult.durableFeedPersistDiagnostics.rowsTouchedCount, 0);

const restoredFeed = feedStore.restoreCommentTranslatorRealCommentsFeedState({
  snapshot: persistedFeed,
  restoredAtIso: "2026-08-14T12:05:00.000Z",
  targetLanguage: "en"
});
assert.equal(restoredFeed.rows.length, 1);
assert.equal(restoredFeed.rows[0].originalText, "hello");
assert.equal(restoredFeed.rows[0].translatedText, "こんにちは");
assert.equal(restoredFeed.rows[0].authorDisplayName, "Safe Viewer");
assert.equal(restoredFeed.rows[0].messageReferenceId, "restored-safe-row-0");
assert.equal(restoredFeed.rows[0].publishedAtIso, "2026-08-14T12:00:00.000Z", "restore preserves the original safe published time");
assert.equal(restoredFeed.rows[0].targetLanguage, "en", "restore uses the validated presentation target language without snapshot expansion");
assert.equal(restoredFeed.rows[0].translationStatus, "translated-f10", "restore derives translated status from translated text");
assert.equal(restoredFeed.rows[0].translationCacheStatus, null, "restore does not reconstruct cache metadata");
assert.equal(restoredFeed.rows[0].moderationLabel, "visible", "restore reconstructs visible moderation state");
assert.equal(restoredFeed.rows[0].deletionPropagation, "not-deleted", "restore reconstructs non-deleted state");
assert.doesNotMatch(JSON.stringify(restoredFeed), /private-provider-message-reference|private-purchase-metadata/);
const restoredUntranslatedFeed = feedStore.restoreCommentTranslatorRealCommentsFeedState({
  snapshot: { ...persistedFeed, rows: [{ ...persistedFeed.rows[0], translatedText: null }] },
  restoredAtIso: "2026-08-14T12:05:00.000Z",
  targetLanguage: "en"
});
assert.equal(restoredUntranslatedFeed.rows[0].translationStatus, "not-run-f9", "restore derives not-run status when no translated text was persisted");

const longSafeDisplayName = "Safe Viewer Name That Is Longer Than Thirty Two Characters";
const longNameFeedStore = feedStore.createInMemoryCommentTranslatorRealCommentsFeedDurableStoreForTests();
await longNameFeedStore.persistSafeFeed({
  ...feedPersistRequest,
  feed: {
    ...feedPersistRequest.feed,
    rows: [{ ...feedPersistRequest.feed.rows[0], authorDisplayName: longSafeDisplayName }]
  }
});
const longNameReadback = await longNameFeedStore.readSafeFeed({
  ownerUserId: feedPersistRequest.ownerUserId,
  sessionReferenceId: feedPersistRequest.sessionReferenceId,
  targetLanguage: "ja"
});

const differentlyTimedSameCommentFeed = {
  ...feedPersistRequest.feed,
  rows: [{
    ...feedPersistRequest.feed.rows[0],
    id: "different-time-provider-reference",
    messageReferenceId: "different-time-provider-reference",
    publishedAtIso: "2026-08-14T12:01:00.000Z"
  }]
};
const convergedDifferentlyTimedSameCommentFeed = liveStep.mergeCommentTranslatorPaidFeedRows(
  restoredFeed,
  differentlyTimedSameCommentFeed
);

const firstPollFeed = {
  ...feedPersistRequest.feed,
  rows: [
    {
      ...feedPersistRequest.feed.rows[0],
      id: "current-provider-reference",
      messageReferenceId: "current-provider-reference"
    },
    {
      ...feedPersistRequest.feed.rows[0],
      id: "new-provider-reference",
      messageReferenceId: "new-provider-reference",
      originalText: "second",
      translatedText: "2つ目",
      publishedAtIso: "2026-08-14T12:01:00.000Z"
    }
  ]
};
const convergedFirstPollFeed = liveStep.mergeCommentTranslatorPaidFeedRows(restoredFeed, firstPollFeed);
assert.equal(convergedFirstPollFeed.rows.length, 2, "reload then first poll converges the restored comment without duplication");
assert.deepEqual(
  convergedFirstPollFeed.rows.map((row) => row.originalText),
  ["hello", "second"],
  "first poll preserves restored ordering and appends only genuinely new comments"
);
assert.equal(convergedFirstPollFeed.rows[0].messageReferenceId, "current-provider-reference", "first poll replaces the synthetic reference in memory");
assert.equal(convergedFirstPollFeed.rows[0].publishedAtIso, "2026-08-14T12:00:00.000Z", "first poll keeps the original safe published time");
assert.doesNotMatch(JSON.stringify(persistedFeed), /current-provider-reference|new-provider-reference/, "provider references remain absent from durable storage");

assert.deepEqual(
  {
    wrapperReplacementExists: exists("workers/comment-translator-paid-open-next-wrapper.mjs"),
    legacyTypeScriptWrapperAbsent: !exists("workers/comment-translator-paid-open-next-wrapper.ts"),
    wranglerUsesMjsWrapper: /"main"\s*:\s*"workers\/comment-translator-paid-open-next-wrapper\.mjs"/.test(sources.wrangler),
    wrapperOutsideTsconfigTypeScriptInclude:
      tsconfig.compilerOptions?.allowJs === false
      && tsconfig.include.every((pattern) => !pattern.includes("*.mjs")),
    differentlyTimedSameCommentRowCount: convergedDifferentlyTimedSameCommentFeed.rows.length,
    longSafeDisplayNameReadback: longNameReadback?.rows[0]?.authorDisplayName
  },
  {
    wrapperReplacementExists: true,
    legacyTypeScriptWrapperAbsent: true,
    wranglerUsesMjsWrapper: true,
    wrapperOutsideTsconfigTypeScriptInclude: true,
    differentlyTimedSameCommentRowCount: 2,
    longSafeDisplayNameReadback: longSafeDisplayName
  },
  "Task 9 reviewer regressions remain closed in a clean checkout and durable feed restore"
);

const rejectedProjection = feedStore.projectCommentTranslatorRealCommentsFeedSnapshot({
  ...feedPersistResult,
  rows: [{ originalText: "not-a-valid-live-feed-row" }]
});
assert.equal(rejectedProjection, null, "malformed projection input fails closed");

assert.match(sources.task, /Current Task: Comment Translator Paid Core v1 Task 9/i, "task.md records Task 9");
assert.match(sources.task, /repository-implemented[\s\S]*locally-verified[\s\S]*setup-blocked[\s\S]*externally-unverified[\s\S]*approval-gated/i, "task.md separates evidence classes");
assert.doesNotMatch(
  Object.values(sources).join("\n"),
  /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|BEGIN\s+PRIVATE\s+KEY/i,
  "Task 9 changed source has no credential values"
);

console.log("comment translator Paid Core v1 Task 9 retention contract checks passed");
