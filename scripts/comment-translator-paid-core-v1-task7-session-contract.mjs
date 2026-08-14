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
  sessionActions: "app/tools/comment-translator/session-actions.ts",
  feedActions: "app/tools/comment-translator/feed-actions.ts",
  durableSessionStore: "lib/comment-translator-durable-session-store.ts",
  liveStep: "lib/comment-translator-live-provider-session-step.ts",
  liveStepResult: "lib/comment-translator-live-provider-session-step-result.ts",
  feedBridge: "lib/comment-translator-real-comments-feed-session-bridge.ts",
  commandExecution: "lib/comment-translator-session-command-execution.ts",
  entitlement: "lib/comment-translator-public-entitlement-baseline.ts",
  paidProviderRuntime: "lib/comment-translator-provider-execution-runtime.ts",
  paidUsageStore: "lib/comment-translator-paid-usage-store.ts",
  pollingPolicy: "lib/comment-translator-bounded-live-chat-polling-terminal-policy.ts",
  paidMigration: "supabase/migrations/20260814100000_comment_translator_paid_task7_runtime_authority.sql",
  sessionTypes: "lib/comment-translator-session-types.ts",
  pollingTypes: "lib/comment-translator-bounded-live-chat-polling-types.ts",
  sessionFeedController: "components/comment-translator/useCommentTranslatorSessionFeedController.ts",
  terminalFeedResponse: "components/comment-translator/comment-translator-terminal-feed-response.ts",
  sessionResponseGeneration: "lib/comment-translator-session-response-generation.ts",
  preAuthorityRateLimitProjection: "components/comment-translator/comment-translator-pre-authority-rate-limit-projection.ts",
  autoPollingDisposition: "lib/comment-translator-session-auto-polling-disposition.ts",
  dockModel: "components/comment-translator/comment-translator-dock-model.ts",
  dock: "components/comment-translator/CommentTranslatorDock.tsx",
  sessionPanel: "components/comment-translator/CommentTranslatorSessionPanel.tsx",
  reasonUx: "lib/comment-translator-start-stop-reason-ux.ts",
  copyJa: "lib/comment-translator-copy-ja.json",
  copyEn: "lib/comment-translator-copy-en.json"
};

for (const [label, relativePath] of Object.entries(sourcePaths)) {
  assert.ok(exists(relativePath), `Task 7 ${label} exists: ${relativePath}`);
}

const sources = Object.fromEntries(
  Object.entries(sourcePaths).map(([label, relativePath]) => [label, read(relativePath)])
);

assert.match(
  sources.entitlement,
  /commentTranslatorPaidSessionIntegrationContract/,
  "Task 7 exposes the Paid session integration contract"
);
assert.match(
  sources.entitlement,
  /readCommentTranslatorPaidSessionAuthority/,
  "Paid entitlement, usage, cost, provider, and poll authority have one server-only reader"
);
assert.match(
  sources.entitlement,
  /paidDailyTimeLimit:\s*"none"|dailyTimeLimit:\s*"none"/,
  "Paid session integration does not introduce a Paid daily time cap"
);
assert.match(sources.entitlement, /translatedMessagesPerMinute:\s*60/, "Paid integration keeps the 60 messages/minute limit");
assert.match(sources.entitlement, /paidSessionLimitMs\s*=|paidSessionLimitMs\s*\S*\s*=\s*3\s*\*\s*60\s*\*\s*60\s*1_000|sessionLimitMs[\s\S]{0,120}3\s*\*\s*60\s*\*\s*60\s*1_000/, "Paid integration keeps the three-hour session limit");
assert.match(sources.entitlement, /paidBillingPeriodCharacterLimit|500[_]?000/, "Paid integration keeps the 500,000-character period cap");
assert.match(sources.entitlement, /activeSessionsPerUser:\s*1/, "Paid integration keeps one active session per owner");
assert.match(sources.entitlement, /pollsPerSession:\s*720|maximumPollsPerSession:\s*720/, "Paid integration records the 720 poll reservation cap");
assert.match(sources.entitlement, /paidPollIntervalMs\s*\S*\s*=\s*15_000|pollIntervalMs:\s*15_000|pollIntervalMillis:\s*15_000/, "Paid integration records the 15-second poll interval");
assert.match(sources.entitlement, /checkoutStopPercent:\s*80|checkoutStopPercent:\s*0\.8/, "Paid integration records the 80 percent checkout stop");
assert.match(sources.entitlement, /newSessionStopPercent:\s*90|newSessionStopPercent:\s*0\.9/, "Paid integration records the 90 percent new-session stop");
assert.match(sources.entitlement, /activeAutoPollStopPercent:\s*95|activeAutoPollStopPercent:\s*0\.95/, "Paid integration records the 95 percent active auto-poll stop");

assert.match(sources.sessionActions, /readCommentTranslatorPaidSessionAuthority/, "session actions read durable Paid authority");
assert.match(sources.sessionActions, /paidEntitlement/, "session actions pass the durable Paid entitlement into usage read");
assert.match(sources.sessionActions, /paidSessionAuthority/, "session actions pass Paid authority into command execution");
assert.match(sources.sessionActions, /activePaidSession|plan === "paid"/, "session actions preserve Paid plan on authority failure");
assert.match(
  sources.sessionActions,
  /const abuseCheck = assertCommentTranslatorAbuseRequestAllowed\([\s\S]{0,500}if \(abuseCheck\.status === "blocked"\)[\s\S]{0,300}createCommentTranslatorPreAuthorityRateLimitResult/,
  "session actions fail closed with a plan-neutral result when the initial abuse check is blocked"
);
const initialAbuseCheckIndex = sources.sessionActions.indexOf("const abuseCheck = assertCommentTranslatorAbuseRequestAllowed");
const durableStoreCreateIndex = sources.sessionActions.indexOf("const durableSessionStore = createTrustedCommentTranslatorSessionSupabaseStore");
const durableSessionReadIndex = sources.sessionActions.indexOf("await readCommentTranslatorDurableActiveSessionOrFailClosed");
assert.ok(initialAbuseCheckIndex >= 0, "session actions contain the initial abuse check");
assert.ok(initialAbuseCheckIndex < durableStoreCreateIndex, "initial abuse check precedes durable service-role store creation");
assert.ok(initialAbuseCheckIndex < durableSessionReadIndex, "initial abuse check precedes durable session read");
const initialBlockedBranch = sources.sessionActions.slice(
  sources.sessionActions.indexOf('if (abuseCheck.status === "blocked")'),
  sources.sessionActions.indexOf("const durableSessionStore = createTrustedCommentTranslatorSessionSupabaseStore")
);
assert.doesNotMatch(initialBlockedBranch, /plan:\s*"free"|createCommentTranslatorAbuseRateLimitedSessionState|readCommentTranslatorDurableActiveSessionOrFailClosed/, "initial blocked path has no Free fallback or durable read");
assert.match(
  sources.sessionActions,
  /createCommentTranslatorPreAuthorityFailClosedResult/,
  "pre-authority early exits use the shared sanitized fail-closed projection"
);
assert.equal(
  (sources.sessionActions.match(/return resolveCommentTranslatorPreAuthorityBlockedResult\(\{/g) ?? []).length,
  2,
  "post-authority private-launch blocked results still preserve the durable active plan"
);
const paidAuthorityFailClosedGuardIndex = sources.sessionActions.indexOf(
  'if (intent !== "stop" && paidSessionAuthorityRead.status === "fail-closed")'
);
assert.ok(paidAuthorityFailClosedGuardIndex >= 0, "every non-Stop Paid authority read failure has an explicit fail-closed guard");
const paidAuthorityFailClosedGuard = sources.sessionActions.slice(
  paidAuthorityFailClosedGuardIndex,
  sources.sessionActions.indexOf("const paidSessionAuthority =", paidAuthorityFailClosedGuardIndex)
);
assert.match(
  paidAuthorityFailClosedGuard,
  /paidSessionAuthorityRead\.entitlement[\s\S]{0,320}createCommentTranslatorDurableSessionFailClosedState\(\{ nowMs, plan: "paid", reason: "paid-authority-unreadable" \}\)/,
  "a confirmed Paid entitlement keeps the existing Paid fail-closed result"
);
assert.match(
  paidAuthorityFailClosedGuard,
  /return createCommentTranslatorPreAuthorityFailClosedResult\(\{ durableActiveSessionRead \}\)/,
  "an unreadable authority without an entitlement returns the plan-neutral pre-authority fail-closed result"
);
assert.doesNotMatch(
  paidAuthorityFailClosedGuard,
  /plan:\s*"free"|readCommentTranslatorDurableUsageSnapshotOrFailClosed|readCommentTranslatorActionCredentialReadiness|executeCommentTranslatorSessionCommand/,
  "an unreadable authority without an entitlement cannot fall through to Free usage, credentials, target, or Provider execution"
);
const sessionActionBodyStart = sources.sessionActions.indexOf("async function readCommentTranslatorSessionActionResult");
assert.ok(
  paidAuthorityFailClosedGuardIndex < sources.sessionActions.indexOf("readCommentTranslatorDurableUsageSnapshotOrFailClosed", sessionActionBodyStart),
  "Paid authority failure stops before a Free usage baseline can be selected"
);
assert.ok(
  paidAuthorityFailClosedGuardIndex < sources.sessionActions.indexOf("readCommentTranslatorActionCredentialReadiness", sessionActionBodyStart),
  "Paid authority failure stops before credential, target, or Provider paths"
);
assert.match(
  sources.commandExecution,
  /input\.plan === "paid"[\s\S]{0,180}state\.status === "stopped"[\s\S]{0,300}createCommentTranslatorPaidStopPersistenceFailure\([\s\S]{0,180}stopReason:\s*state\.stopReason/,
  "every Paid stopped-state persistence failure returns an unconfirmed durable stop using the actual sanitized reason"
);
assert.match(sources.feedActions, /readCommentTranslatorPaidSessionAuthority/, "feed action reads durable Paid authority");
assert.match(sources.feedActions, /paidSessionAuthority/, "feed action passes Paid authority into the live step");
const feedActionBodyIndex = sources.feedActions.indexOf("export async function getCommentTranslatorRealCommentsFeedAction");
const restoreFeedActionBodyIndex = sources.feedActions.indexOf("export async function restoreCommentTranslatorPersistedRealCommentsFeedAction");
const restoreFeedActionBody = sources.feedActions.slice(restoreFeedActionBodyIndex, feedActionBodyIndex);
const activeFeedActionBody = sources.feedActions.slice(feedActionBodyIndex);
assert.match(
  restoreFeedActionBody,
  /readCommentTranslatorRealCommentsFeedForActiveSession/,
  "explicit restore remains the durable feed snapshot read path"
);
assert.doesNotMatch(
  activeFeedActionBody,
  /readCommentTranslatorRealCommentsFeedForActiveSession/,
  "active feed polling never reads a durable feed snapshot"
);
const feedCallerAuthorizationIndex = sources.feedActions.indexOf("await readCommentTranslatorActionCallerAuthorization", feedActionBodyIndex);
const feedNowIndex = sources.feedActions.indexOf("Date.now()", feedCallerAuthorizationIndex);
const feedAbuseCheckIndex = sources.feedActions.indexOf("assertCommentTranslatorAbuseRequestAllowed", feedNowIndex);
const feedDurableStoreIndex = sources.feedActions.indexOf("createTrustedCommentTranslatorSessionSupabaseStore", feedAbuseCheckIndex);
const feedDurableReadIndex = sources.feedActions.indexOf("readCommentTranslatorDurableActiveSessionOrFailClosed", feedAbuseCheckIndex);
const feedProviderIndex = sources.feedActions.indexOf("runCommentTranslatorLiveProviderSessionStep", feedAbuseCheckIndex);
assert.ok(feedCallerAuthorizationIndex >= 0 && feedCallerAuthorizationIndex < feedNowIndex, "feed action reads caller authorization before its request clock");
assert.ok(feedNowIndex < feedAbuseCheckIndex, "feed action performs the abuse check immediately after caller authorization and request clock capture");
assert.ok(feedAbuseCheckIndex < feedDurableStoreIndex, "feed abuse check precedes durable service-role store creation");
assert.ok(feedAbuseCheckIndex < feedDurableReadIndex, "feed abuse check precedes durable session read");
assert.match(
  sources.feedActions.slice(feedAbuseCheckIndex, feedDurableStoreIndex),
  /surface:\s*"comment-translator-server-actions"[\s\S]{0,160}action:\s*"session-heartbeat"[\s\S]{0,500}createCommentTranslatorPreAuthorityRateLimitResult/,
  "feed rapid polling shares the session-heartbeat abuse bucket and returns plan-neutral retry metadata"
);
const feedBlockedBranch = sources.feedActions.slice(
  sources.feedActions.indexOf('if (abuseCheck.status === "blocked")', feedAbuseCheckIndex),
  feedDurableStoreIndex
);
assert.match(feedBlockedBranch, /createUnavailableCommentTranslatorRealCommentsFeedState/, "blocked feed returns a safe unavailable feed");
assert.doesNotMatch(feedBlockedBranch, /createTrusted|readCommentTranslator|Provider|target|ledger/i, "blocked feed performs no durable read, Provider, target, or ledger work");
assert.ok(feedAbuseCheckIndex < feedProviderIndex, "feed abuse check precedes Provider work");
assert.match(
  sources.sessionActions,
  /activePaidSession[\s\S]{0,900}stopCommentTranslatorActivePaidSessionForUnreadableAuthority/,
  "active Paid session action authority failure preserves and stops the known durable session"
);
assert.match(
  sources.sessionActions,
  /activePaidSession[\s\S]{0,260}paidSessionAuthorityRead\.status !== "ready"[\s\S]{0,360}stopCommentTranslatorActivePaidSessionForUnreadableAuthority/,
  "active Paid session cannot downgrade to Free when its durable entitlement is not ready"
);
assert.match(
  sources.sessionActions,
  /entitlementBaseline\.status === "fail-closed"[\s\S]{0,500}activePaidSession[\s\S]{0,500}stopCommentTranslatorActivePaidSessionForUnreadableAuthority/,
  "active Paid session action baseline failure uses the same durable authority stop"
);
assert.match(
  sources.feedActions,
  /paidSessionAuthorityRead\.status !== "ready"[\s\S]{0,500}stopCommentTranslatorActivePaidSessionForUnreadableAuthority/,
  "active Paid feed authority failure durably stops the known session"
);
assert.match(
  sources.feedActions,
  /entitlementBaseline\.status !== "ready"[\s\S]{0,500}stopCommentTranslatorActivePaidSessionForUnreadableAuthority/,
  "active Paid feed baseline failure durably stops the known session"
);
for (const [actionSource, bodyMarker] of [
  [sources.sessionActions, "async function readCommentTranslatorSessionActionResult"],
  [sources.feedActions, "export async function getCommentTranslatorRealCommentsFeedAction"]
]) {
  const actionBodyIndex = actionSource.indexOf(bodyMarker);
  const authorityReadIndex = actionSource.indexOf("readCommentTranslatorPaidSessionAuthority", actionBodyIndex);
  const authorityStopIndex = actionSource.indexOf("stopCommentTranslatorActivePaidSessionForUnreadableAuthority", authorityReadIndex);
  assert.ok(authorityStopIndex >= 0, "active Paid authority stop helper is reachable from the action");
  assert.ok(
    authorityStopIndex < actionSource.indexOf("readCommentTranslatorActionCredentialReadiness", authorityReadIndex),
    "active Paid authority failure stops before credential, target, or Provider paths"
  );
}
assert.match(sources.liveStep, /executeCommentTranslatorPaidNormalTranslationForProviderSafeComments/, "live step uses the Task 6 Paid provider runtime");
assert.match(sources.liveStep, /planEntitlement\.plan\s*===\s*"paid"|usage\.planEntitlement\.plan\s*===\s*"paid"/, "live step branches Paid and Free provider paths explicitly");
assert.match(sources.liveStep, /paidProviderStopReason|paid-character-quota-stop|paid-global-cost-stop/, "live step preserves sanitized Paid stop reasons");
assert.match(sources.liveStep, /createQuotaBudgetStopHandoff\(paidProviderStopReason(?:,[\s\S]{0,120})?\)/, "Paid provider limit stops the polling handoff");
assert.match(sources.liveStep, /provider-capacity-paused[\s\S]{0,260}return null/, "non-consuming Provider backpressure keeps the Paid session active for recovery");
assert.match(sources.paidProviderRuntime, /enforceMessageRate/, "Task 7 enables the durable message-rate seam at the Paid provider boundary");
assert.match(sources.paidProviderRuntime, /reserveMessageRate/, "Paid provider execution reserves message-rate capacity before Provider execution");
assert.match(sources.paidProviderRuntime, /finalizeMessageRate/, "Paid provider execution settles message-rate capacity after Provider execution");
for (const operation of ["reserveMessageRate", "recordMessageRateSuccess", "finalizeMessageRate"]) {
  const operationIndex = sources.paidProviderRuntime.indexOf(operation);
  assert.ok(operationIndex >= 0, `Paid provider runtime uses ${operation}`);
  assert.match(
    sources.paidProviderRuntime.slice(operationIndex, operationIndex + 700),
    /sessionReferenceId:\s*request\.sessionReferenceId/,
    `${operation} carries the exact server-only session reference`
  );
}
assert.match(sources.commandExecution, /startPaidSessionAndReservePollBudget/, "session command atomically starts Paid session and reserves poll budget");
assert.match(sources.commandExecution, /touchActivePaidSessionHeartbeat/, "active Paid heartbeat uses the database-clock durable touch seam");
assert.match(
  sources.durableSessionStore,
  /CommentTranslatorPaidHeartbeatTouchResult[\s\S]{0,320}status:\s*"touched"[\s\S]{0,160}heartbeatAtIso:\s*string[\s\S]{0,240}status:\s*"missing-heartbeat"[\s\S]{0,240}status:\s*"expired"/,
  "Paid heartbeat touch has typed touched, missing-heartbeat, and expired results"
);
assert.match(
  sources.durableSessionStore,
  /result\.data\.status\s*===\s*"missing-heartbeat"[\s\S]{0,160}status:\s*"missing-heartbeat"[\s\S]{0,320}result\.data\.status\s*===\s*"expired"[\s\S]{0,160}status:\s*"expired"[\s\S]{0,500}status:\s*"touched"[\s\S]{0,160}heartbeatAtIso/,
  "the durable store parses every typed heartbeat RPC result without treating missing-heartbeat as failure"
);
assert.ok(
  sources.commandExecution.indexOf("touchActivePaidSessionHeartbeat")
    < sources.commandExecution.indexOf("liveProviderRuntime = runtime.createLiveProviderRuntime"),
  "active Paid heartbeat touches database authority before target or Provider runtime work"
);
assert.match(
  sources.commandExecution,
  /paidHeartbeatPersistedByDatabaseClock[\s\S]{0,2200}state\.status === "active"/,
  "database-clock Paid heartbeat marks the active durable state as authoritative"
);
assert.match(
  sources.commandExecution,
  /paidAtomicActiveStartPersistedByDatabaseClock/,
  "Paid atomic start marks the database clock as authoritative for the durable active state"
);
assert.match(
  sources.commandExecution,
  /createPaidStartPostReservationStopState/,
  "post-commit reservation count or authority-read failure durably stops the already-created Paid session"
);
assert.doesNotMatch(
  sources.commandExecution,
  /persistCommentTranslatorDurableSessionStateOrFailClosed\([\s\S]{0,420}reservePollBudget/,
  "Paid start has no separate active persist followed by poll reservation"
);
assert.match(sources.commandExecution, /readPollBudget/, "session command reads current Paid poll budget authority");
assert.match(sources.commandExecution, /UTC|utc/i, "session command handles UTC bucket boundaries");
assert.match(sources.commandExecution, /nextResetAtIso|utcResetAtIso|resetAtIso/, "poll-budget stop returns a sanitized UTC reset timestamp");
assert.match(sources.commandExecution, /no.*poll|poll.*stop|autoPoll/i, "session command has a no-auto-poll stop boundary");
assert.match(sources.paidUsageStore, /ct_paid_read_runtime_authority|readRuntimeAuthority/, "Paid usage adapter reads cost/provider runtime authority");
assert.match(sources.paidUsageStore, /ct_paid_read_poll_budget|readPollBudget/, "Paid usage adapter reads poll bucket authority");
assert.match(sources.paidUsageStore, /reserveMessageRate/, "Paid usage adapter atomically reserves the 60-message minute budget");
assert.match(sources.paidUsageStore, /finalizeMessageRate/, "Paid usage adapter finalizes or releases the message-rate reservation");
assert.match(
  sources.paidProviderRuntime,
  /!request\.usageStore\?\.reserveMessageRate\s*\|\|\s*!request\.usageStore\.recordMessageRateSuccess\s*\|\|\s*!request\.usageStore\.finalizeMessageRate/,
  "Paid Provider boundary requires reserve, record-success, and finalize authority before Provider execution"
);
for (const [operation, rpcName] of [
  ["async reserveMessageRate", "ct_paid_reserve_message_rate"],
  ["async recordMessageRateSuccess", "ct_paid_record_message_rate_success"],
  ["async finalizeMessageRate", "ct_paid_finalize_message_rate"]
]) {
  const adapterStart = sources.paidUsageStore.indexOf(operation);
  const adapterSource = sources.paidUsageStore.slice(adapterStart, adapterStart + 900);
  assert.match(adapterSource, new RegExp(`rpc\\("${rpcName}"`), `${rpcName} is called by the adapter`);
  assert.match(
    adapterSource,
    /p_session_reference_id:\s*request\.sessionReferenceId/,
    `${rpcName} adapter carries the opaque server-only session binding`
  );
}
assert.match(sources.liveStep, /enforceMessageRate:\s*true/, "Paid live step enables durable message-rate enforcement at the Provider seam");
const paidPollBudgetSource = sources.liveStep.slice(sources.liveStep.indexOf("async function ensurePaidPollBudget"));
assert.ok(
  paidPollBudgetSource.indexOf("reservePollBudget") < paidPollBudgetSource.indexOf("readPollBudget"),
  "Paid heartbeat reserves the authoritative current UTC bucket before reading/polling"
);
const paidPollBudgetRpcSource = sources.paidMigration.slice(
  sources.paidMigration.indexOf("create or replace function public.ct_paid_read_poll_budget"),
  sources.paidMigration.indexOf("create or replace function public.ct_paid_reserve_message_rate")
);
assert.match(paidPollBudgetRpcSource, /v_now\s*:=\s*statement_timestamp\(\)/, "poll-budget read uses the database clock for UTC day authority");
const paidMessageRateRpcSource = sources.paidMigration.slice(
  sources.paidMigration.indexOf("create or replace function public.ct_paid_reserve_message_rate"),
  sources.paidMigration.indexOf("revoke all on function public.ct_paid_reserve_message_rate")
);
for (const rpcName of [
  "ct_paid_reserve_message_rate",
  "ct_paid_record_message_rate_success",
  "ct_paid_finalize_message_rate"
]) {
  const rpcStart = sources.paidMigration.indexOf(`create or replace function public.${rpcName}`);
  assert.ok(rpcStart >= 0, `${rpcName} is defined by the Task 7 migration`);
  assert.match(
    sources.paidMigration.slice(rpcStart, rpcStart + 500),
    /p_session_reference_id\s+text/,
    `${rpcName} requires an explicit session reference`
  );
}
assert.doesNotMatch(
  sources.paidMigration,
  /grant execute on function public\.ct_paid_(?:reserve|record|finalize)_message_rate\(uuid, text, integer, timestamptz\)/,
  "Task 7 migration leaves no insecure old callable message-rate signature"
);
assert.match(
  paidMessageRateRpcSource,
  /where owner_user_id\s*=\s*p_owner_user_id[\s\S]{0,180}session_reference_id\s*=\s*p_session_reference_id[\s\S]{0,180}status\s*=\s*'active'[\s\S]{0,180}plan\s*=\s*'paid'/,
  "old-session delayed requests cannot bind to the owner's newer active Paid session"
);
assert.match(
  paidMessageRateRpcSource,
  /v_now\s*>=\s*v_session\.started_at\s*\+\s*interval '3 hours'/,
  "message-rate reserve rejects an over-three-hour requested session using the DB clock"
);
assert.match(
  paidMessageRateRpcSource,
  /v_reservation\.session_reference_id\s*<>\s*p_session_reference_id[\s\S]{0,120}v_reservation\.expires_at\s*<=\s*v_now/,
  "expired or cross-session receipts reject before a fresh allowance can be reserved"
);
const recordMessageRateRpcSource = sources.paidMigration.slice(
  sources.paidMigration.indexOf("create or replace function public.ct_paid_record_message_rate_success"),
  sources.paidMigration.indexOf("create or replace function public.ct_paid_finalize_message_rate")
);
const finalizeMessageRateRpcSource = sources.paidMigration.slice(
  sources.paidMigration.indexOf("create or replace function public.ct_paid_finalize_message_rate"),
  sources.paidMigration.indexOf("revoke all on function public.ct_paid_reserve_message_rate")
);
for (const [label, rpcSource] of [
  ["record", recordMessageRateRpcSource],
  ["finalize", finalizeMessageRateRpcSource]
]) {
  assert.match(rpcSource, /v_now\s*:=\s*statement_timestamp\(\)/, `${label} settlement uses the DB clock`);
  assert.match(
    rpcSource,
    /v_reservation\.owner_user_id\s*<>\s*p_owner_user_id[\s\S]{0,180}v_reservation\.session_reference_id\s*<>\s*p_session_reference_id[\s\S]{0,180}v_reservation\.expires_at\s*<=\s*v_now/,
    `${label} requires exact owner/session binding and an unexpired same-session receipt`
  );
  assert.match(
    rpcSource,
    /from public\.comment_translator_sessions[\s\S]{0,240}owner_user_id\s*=\s*p_owner_user_id[\s\S]{0,180}session_reference_id\s*=\s*p_session_reference_id[\s\S]{0,180}status\s*=\s*'active'[\s\S]{0,180}plan\s*=\s*'paid'/,
    `${label} requires the exact session to remain active and Paid`
  );
  assert.match(
    rpcSource,
    /v_now\s*>=\s*v_session\.started_at\s*\+\s*interval '3 hours'/,
    `${label} rejects settlement at or beyond the Paid three-hour limit using the DB clock`
  );
}
assert.match(
  paidMessageRateRpcSource,
  /v_now\s*:=\s*statement_timestamp\(\)/,
  "message-rate reservation and settlement use the database clock for minute authority"
);
assert.match(
  sources.paidMigration,
  /minute_start\s*=\s*date_trunc\('minute',\s*statement_timestamp\(\)\)/,
  "runtime message-rate read uses the same database minute authority"
);
const messageRateReservationKeySource = sources.paidProviderRuntime.slice(
  sources.paidProviderRuntime.indexOf("function createPaidMessageRateReservationKey"),
  sources.paidProviderRuntime.indexOf("function createPaidItemAttemptId")
);
assert.doesNotMatch(
  messageRateReservationKeySource,
  /minuteStartMs|message-rate:\$\{minuteStartMs\}/,
  "message-rate reservation identity does not depend on Worker minute arithmetic"
);
assert.match(
  messageRateReservationKeySource,
  /providerMessageId:\s*`message-rate:\$\{canonicalCommentIds\}`/,
  "message-rate reservation identity is stable for the logical bounded batch"
);
const messageRateExistingReservationSource = paidMessageRateRpcSource.slice(
  paidMessageRateRpcSource.indexOf("if v_reservation.reservation_key is not null"),
  paidMessageRateRpcSource.indexOf("insert into public.comment_translator_paid_message_rate_buckets", paidMessageRateRpcSource.indexOf("if v_reservation.reservation_key is not null"))
);
assert.doesNotMatch(
  messageRateExistingReservationSource,
  /v_reservation\.minute_start\s*<>\s*v_minute_start/,
  "existing message-rate reservations are not rejected at a Worker minute boundary"
);
assert.match(
  messageRateExistingReservationSource,
  /reservation_state\s*=\s*'committed'[\s\S]*?minute_start\s*=\s*v_reservation\.minute_start/,
  "committed message-rate replays use their original database bucket"
);
assert.match(
  messageRateExistingReservationSource,
  /reservation_state\s*=\s*'reserved'[\s\S]*?minute_start\s*=\s*v_reservation\.minute_start/,
  "reserved message-rate retries use their original database bucket"
);
assert.match(sources.pollingPolicy, /planEntitlement\?\.plan\s*!==\s*"paid"/, "Paid polling has no daily time-limit stop");
assert.match(sources.sessionFeedController, /sessionState\.status\s*!==\s*"active"/, "client auto-poll stops after a non-active session response");
assert.match(sources.sessionFeedController, /clearInterval\(intervalId\)/, "client clears the 15-second auto-poll interval");
assert.match(sources.sessionFeedController, /resolveCommentTranslatorAutoPollingDisposition/, "client uses the sanitized fail-closed polling disposition");
assert.doesNotMatch(
  sources.sessionFeedController,
  /from\s+["']@\/lib\/comment-translator-session-runtime["']/,
  "client controller does not import the server-only session runtime"
);
assert.match(
  sources.sessionFeedController,
  /from\s+["']@\/lib\/comment-translator-session-auto-polling-disposition["']/,
  "client controller imports the polling disposition from the client-safe module"
);
assert.match(
  sources.sessionFeedController,
  /from\s+["']@\/lib\/comment-translator-session-response-generation["']/,
  "client controller imports the response generation from the client-safe module"
);
assert.match(
  sources.sessionFeedController,
  /tryBeginSessionCommand\("user-command"\)[\s\S]{0,3000}tryBeginSessionCommand\("initial-status"\)/,
  "client controller distinguishes user-command and supersedable initial-status leases"
);
assert.doesNotMatch(sources.sessionResponseGeneration, /server-only/, "client-safe response generation has no server-only import");
assert.doesNotMatch(sources.autoPollingDisposition, /server-only/, "client-safe polling disposition has no server-only import");
assert.doesNotMatch(
  sources.autoPollingDisposition,
  /comment-translator-session-runtime|comment-translator-session-types/,
  "client-safe polling disposition has no server-owned module import"
);
assert.doesNotMatch(sources.preAuthorityRateLimitProjection, /server-only|comment-translator-durable-session-store|comment-translator-session-runtime/, "client-safe rate-limit projection imports no server-only module");
assert.match(sources.sessionFeedController, /projectCommentTranslatorPreAuthorityFailClosedSessionState/, "client controller applies the client-safe pre-authority projection");
assert.match(sources.sessionFeedController, /refreshRealCommentsFeed[\s\S]{0,500}autoPollingDisposition[\s\S]{0,240}halted/, "a fail-closed disposition prevents the next poll execution");
assert.match(sources.sessionFeedController, /useEffect\([\s\S]{0,500}autoPollingDisposition[\s\S]{0,240}halted[\s\S]{0,240}setInterval/, "a fail-closed disposition prevents the next poll schedule");
const paidFeedActionSource = sources.feedActions.slice(
  sources.feedActions.indexOf("export async function getCommentTranslatorRealCommentsFeedAction")
);
assert.match(
  paidFeedActionSource,
  /durableActiveSessionRead\.status\s*!==\s*"ready"[\s\S]{0,300}sessionState:\s*createCommentTranslatorPreAuthorityFailClosedResult\(\{\s*durableActiveSessionRead\s*\}\)/,
  "durable feed-session read failure returns a sanitized plan-neutral fail-closed sessionState"
);
assert.match(
  sources.preAuthorityRateLimitProjection,
  /projectActivePaidFailClosedSessionState[\s\S]{0,900}status:\s*"stopped"[\s\S]{0,240}stopReason:\s*"paid-authority-unreadable"[\s\S]{0,240}nextAction:\s*"session-stopped"/,
  "the client-safe controller projection stops the current active Paid UI state with sanitized authority metadata"
);
assert.doesNotMatch(
  sources.preAuthorityRateLimitProjection,
  /projectActivePaidFailClosedSessionState[\s\S]{0,500}comment-translator-session-runtime|from\s+["']@\/lib\/comment-translator-session-runtime["']/,
  "the Paid fail-closed UI projection has no server-only runtime dependency"
);
assert.match(
  sources.sessionFeedController,
  /if \(state\.status === "fail-closed"\) \{[\s\S]{0,300}projectCommentTranslatorPreAuthorityFailClosedSessionState[\s\S]{0,240}setSessionError\(actionFailedCopy\)/,
  "command and status fail-closed responses project safe Paid or Free UI state and surface the session error"
);
assert.match(
  sources.sessionFeedController,
  /refreshedFeed\.sessionState\.status === "fail-closed"[\s\S]{0,300}projectCommentTranslatorPreAuthorityFailClosedSessionState[\s\S]{0,240}setSessionError\(actionFailedCopy\)/,
  "Paid feed fail-closed projects the stopped UI state and surfaces the session error"
);
assert.match(sources.feedActions, /executeCommentTranslatorSessionCommand/, "Paid feed refresh reuses the session-command heartbeat integration inside one server boundary");
assert.match(sources.feedActions, /intent:\s*["']heartbeat["']/, "Paid feed refresh executes one heartbeat/live step inside the combined server boundary");
assert.match(sources.commandExecution, /onSafeFeed[\s\S]{0,600}pollingStep\.safeFeed/, "session command exposes the same Worker-safe feed through a server-only sink");
assert.match(sources.liveStepResult, /readonly safeFeed\?/, "live step result can carry an optional browser-safe feed");
assert.match(sources.feedActions, /let workerFeed[\s\S]{0,900}onSafeFeed[\s\S]{0,700}workerFeed\s*\?\?\s*createUnavailableCommentTranslatorRealCommentsFeedState/, "Paid feed action returns only the Worker feed or a safe unavailable baseline");
assert.match(sources.feedBridge, /peekCommentTranslatorRealCommentsFeedForActiveSession/, "the live step can peek at an in-memory safe feed without a durable snapshot read");
assert.match(sources.liveStep, /peekCommentTranslatorRealCommentsFeedForActiveSession/, "empty live polls reuse only the in-memory safe feed");
assert.doesNotMatch(
  sources.liveStep,
  /readCommentTranslatorRealCommentsFeedForActiveSession/,
  "active live polling never reads a durable feed snapshot"
);
assert.match(sources.feedActions, /return\s*\{\s*\.\.\.feed,\s*sessionState\s*\}/, "Paid feed refresh returns browser-safe session state with the feed");
assert.match(sources.sessionFeedController, /sessionState\.plan\s*===\s*"paid"[\s\S]{0,500}getCommentTranslatorRealCommentsFeedAction/, "Paid client polling uses the combined feed server boundary");
assert.match(sources.sessionFeedController, /"sessionState"\s+in\s+refreshedFeed[\s\S]{0,520}status\s*===\s*"fail-closed"[\s\S]{0,360}else\s*\{[\s\S]{0,120}applySessionState\(refreshedFeed\.sessionState\)/, "a confirmed stopped Paid response updates session state before the next interval");
assert.match(sources.sessionFeedController, /else\s*\{[\s\S]{0,900}heartbeatCommentTranslatorSessionAction[\s\S]{0,1200}getCommentTranslatorRealCommentsFeedAction/, "Free polling retains the existing heartbeat then feed path");
assert.match(
  sources.sessionFeedController,
  /else\s*\{[\s\S]{0,900}heartbeatCommentTranslatorSessionAction[\s\S]{0,1200}getCommentTranslatorRealCommentsFeedAction[\s\S]{0,300}setRealCommentsFeed\(\(current\)\s*=>\s*resolveCommentTranslatorTerminalFeedResponse\(\{[\s\S]{0,240}currentFeed:\s*current,[\s\S]{0,160}refreshedFeed,[\s\S]{0,160}sessionState:\s*refreshedSession/,
  "Free active polling resolves an unavailable empty feed against the currently displayed safe feed"
);
assert.match(
  sources.sessionFeedController,
  /refreshSessionState[\s\S]{0,240}sessionState\.status === "active" && sessionState\.plan !== "paid" \? "heartbeat" : "status"/,
  "active Paid manual refresh is read-only status while active Free refresh retains heartbeat"
);
assert.match(
  sources.sessionFeedController,
  /failActivePaidAction[\s\S]{0,500}current\.status !== "active" \|\| current\.plan !== "paid"[\s\S]{0,300}projectActivePaidFailClosedSessionState[\s\S]{0,200}setAutoPollingDisposition\("halted"\)[\s\S]{0,160}setSessionError\(actionFailedCopy\)/,
  "active Paid action exceptions project the safe stopped state, halt polling, and surface safe copy"
);
assert.equal(
  (sources.sessionFeedController.match(/failActivePaidAction\(\);|failActivePaidAction\(\)\) setSessionError/g) ?? []).length,
  3,
  "command, initial status, and Paid feed catch paths all invoke the active Paid failure projection"
);
assert.match(sources.dock, /const \{[\s\S]{0,300}sessionState,\s*sessionError,/, "Dock reads sessionError from the controller");
assert.match(sources.dock, /<CommentTranslatorSessionPanel[\s\S]{0,500}sessionError=\{sessionError\}/, "Dock passes sessionError to SessionPanel");
assert.match(sources.sessionPanel, /readonly sessionError: string \| null;/, "SessionPanel accepts only the safe session error string");
assert.match(sources.sessionPanel, /sessionError \? <p data-comment-translator-session-error="sanitized-action-failure-only"[^>]*>\{sessionError\}<\/p> : null/, "SessionPanel renders only the safe session action failure copy with a sanitized marker");
assert.match(sources.entitlement, /resolveCommentTranslatorPaidStopNextResetAtIso/, "Paid quota and cost stops use a shared browser-safe reset projection");
assert.match(sources.liveStep, /paidProviderNextResetAtIso/, "Provider Paid stop results carry the next reset timestamp");
assert.match(sources.commandExecution, /preflightPaidNextResetAtIso/, "preflight Paid stop results carry the next reset timestamp");
assert.match(sources.paidMigration, /create or replace function public\.ct_paid_read_runtime_authority/i, "Task 7 adds an additive runtime authority read RPC");
assert.match(sources.paidMigration, /create or replace function public\.ct_paid_read_poll_budget/i, "Task 7 adds an additive poll-budget read RPC");
const paidAtomicStartRpcSource = sources.paidMigration.slice(
  sources.paidMigration.indexOf("create or replace function public.ct_paid_start_session_and_reserve_poll_budget"),
  sources.paidMigration.indexOf("revoke all on function public.ct_paid_start_session_and_reserve_poll_budget")
);
assert.ok(paidAtomicStartRpcSource.length > 0, "Task 7 defines the atomic Paid start and initial poll reservation RPC");
assert.match(paidAtomicStartRpcSource, /v_now\s*:=\s*statement_timestamp\(\)/, "atomic Paid start uses the database clock");
assert.match(
  paidAtomicStartRpcSource,
  /insert into public\.comment_translator_sessions[\s\S]{0,1000}ct_paid_reserve_poll_budget/,
  "atomic Paid start inserts the active session before reserving its initial poll budget in one RPC transaction"
);
assert.match(
  sources.paidMigration,
  /revoke all on function public\.ct_paid_start_session_and_reserve_poll_budget\([^)]+\)\s+from public, anon, authenticated, service_role[\s\S]{0,180}grant execute on function public\.ct_paid_start_session_and_reserve_poll_budget\([^)]+\)\s+to service_role/i,
  "atomic Paid start RPC is callable only by service_role"
);
assert.match(sources.durableSessionStore, /startPaidSessionAndReservePollBudget\?/, "durable session stores expose an optional fail-closed Paid atomic-start seam");
assert.match(sources.durableSessionStore, /ct_paid_start_session_and_reserve_poll_budget/, "trusted durable session adapter calls the atomic Paid start RPC");
const paidPollReservationRpcSource = sources.paidMigration.slice(
  sources.paidMigration.indexOf("create or replace function public.ct_paid_reserve_poll_budget"),
  sources.paidMigration.indexOf("revoke all on function public.ct_paid_reserve_poll_budget")
);
assert.ok(paidPollReservationRpcSource.length > 0, "Task 7 replaces the existing poll reservation signature additively");
assert.match(paidPollReservationRpcSource, /v_now\s*:=\s*statement_timestamp\(\)/, "poll reservation uses the database clock");
assert.match(
  paidPollReservationRpcSource,
  /not\s+v_had_prior_reservation[\s\S]{0,240}>=\s*floor\(v_bucket\.daily_budget\s*\*\s*0\.90\)/,
  "new Paid sessions are rejected atomically when the reservation candidate reaches 90 percent"
);
assert.match(
  paidPollReservationRpcSource,
  /v_had_prior_reservation[\s\S]{0,240}>=\s*floor\(v_bucket\.daily_budget\s*\*\s*0\.95\)/,
  "UTC-rollover active Paid sessions are rejected atomically when the reservation candidate reaches 95 percent"
);
const pollThresholdGuardIndex = paidPollReservationRpcSource.indexOf("v_had_prior_reservation");
const pollReservationInsertIndex = paidPollReservationRpcSource.indexOf("insert into public.comment_translator_paid_poll_reservations");
assert.ok(
  pollThresholdGuardIndex >= 0 && pollThresholdGuardIndex < pollReservationInsertIndex,
  "threshold refusal occurs before a crossing reservation can be persisted"
);
assert.match(
  paidPollReservationRpcSource,
  /if v_existing\.id is not null[\s\S]{0,520}return v_existing\.reserved_polls/,
  "current-day poll reservation remains idempotent"
);
assert.match(sources.paidMigration, /comment_translator_paid_message_rate_buckets/i, "Task 7 adds a durable Paid message-rate bucket");
assert.match(sources.paidMigration, /create or replace function public\.ct_paid_reserve_message_rate/i, "Task 7 adds an atomic Paid message-rate reservation RPC");
assert.match(sources.paidMigration, /create or replace function public\.ct_paid_finalize_message_rate/i, "Task 7 adds an idempotent Paid message-rate finalize RPC");
assert.match(
  sources.paidMigration,
  /create table if not exists public\.comment_translator_paid_message_rate_reservations[\s\S]{0,900}expires_at timestamptz not null/i,
  "message-rate receipts have authoritative bounded expiry metadata"
);
assert.match(
  sources.paidMigration,
  /expires_at[\s\S]{0,500}interval '3 hours'[\s\S]{0,120}interval '24 hours'/i,
  "message-rate receipt TTL is no later than the maximum Paid session end plus 24 hours"
);
const task7CleanupSource = sources.paidMigration.slice(
  sources.paidMigration.indexOf("create or replace function public.ct_paid_cleanup_attempt_ledgers"),
  sources.paidMigration.indexOf("revoke all on function public.ct_paid_cleanup_attempt_ledgers")
);
assert.match(task7CleanupSource, /p_limit < 1 or p_limit > 500/i, "existing cleanup RPC remains bounded to 500 rows");
assert.match(task7CleanupSource, /comment_translator_paid_message_rate_reservations[\s\S]{0,500}expires_at <= p_now/i, "existing cleanup RPC removes expired message-rate receipts");
assert.match(task7CleanupSource, /reservation_state in \('reserved', 'committed', 'released'\)/i, "cleanup retains every message-rate receipt state until its TTL");
assert.match(task7CleanupSource, /limit v_remaining/i, "message-rate cleanup shares the existing bounded batch allowance");
assert.match(task7CleanupSource, /limit v_bucket_remaining[\s\S]{0,120}skip locked/i, "message-rate bucket cleanup also stays inside the shared bounded batch allowance");
const reservationKeyLockMarker = /pg_advisory_xact_lock\(hashtextextended\((?:p_reservation_key|v_reservation_key),\s*47290113\)\)/i;
const reserveReservationKeyLockIndex = paidMessageRateRpcSource.search(reservationKeyLockMarker);
const reserveTombstoneCheckIndex = paidMessageRateRpcSource.indexOf("comment_translator_paid_message_rate_reservation_tombstones");
const reserveReceiptLockIndex = paidMessageRateRpcSource.indexOf("from public.comment_translator_paid_message_rate_reservations");
assert.ok(
  reserveReservationKeyLockIndex >= 0
    && reserveReservationKeyLockIndex < reserveTombstoneCheckIndex
    && reserveReservationKeyLockIndex < reserveReceiptLockIndex,
  "reserve acquires the deterministic reservation-key lock before tombstone and receipt checks"
);
const cleanupReservationKeyLockIndex = task7CleanupSource.search(reservationKeyLockMarker);
const cleanupReceiptLockIndex = task7CleanupSource.indexOf("for update", cleanupReservationKeyLockIndex);
const cleanupReceiptDeleteIndex = task7CleanupSource.indexOf("delete from public.comment_translator_paid_message_rate_reservations");
assert.ok(
  cleanupReservationKeyLockIndex >= 0
    && cleanupReservationKeyLockIndex < cleanupReceiptLockIndex
    && cleanupReservationKeyLockIndex < cleanupReceiptDeleteIndex,
  "cleanup acquires the same deterministic reservation-key lock before receipt lock and delete"
);
assert.match(
  sources.paidMigration,
  /create table if not exists public\.comment_translator_paid_message_rate_reservation_tombstones\s*\([\s\S]{0,500}reservation_key text primary key[\s\S]{0,500}expires_at timestamptz not null/i,
  "cleaned opaque message-rate reservation keys retain a deterministically expiring tombstone"
);
assert.match(
  paidMessageRateRpcSource,
  /comment_translator_paid_message_rate_reservation_tombstones[\s\S]{0,240}reservation_key\s*=\s*p_reservation_key[\s\S]{0,160}expires_at\s*>\s*v_now[\s\S]{0,240}raise exception/i,
  "message-rate reserve rejects only an unexpired tombstoned reservation key before creating a receipt"
);
assert.match(
  task7CleanupSource,
  /insert into public\.comment_translator_paid_message_rate_reservation_tombstones[\s\S]{0,500}expires_at[\s\S]{0,500}p_now \+ interval '7 days'[\s\S]{0,500}delete from public\.comment_translator_paid_message_rate_reservations/i,
  "cleanup gives tombstones a deterministic seven-day retention beyond the receipt TTL and retry window before deleting receipts"
);
assert.match(
  task7CleanupSource,
  /comment_translator_paid_message_rate_reservation_tombstones[\s\S]{0,500}expires_at <= p_now[\s\S]{0,500}limit v_tombstone_remaining[\s\S]{0,1000}delete from public\.comment_translator_paid_message_rate_reservation_tombstones/i,
  "cleanup deletes only expired tombstones inside the shared bounded batch allowance"
);
assert.match(task7CleanupSource, /v_bucket_remaining := p_limit - v_deleted - v_rate_deleted - v_tombstone_deleted/i, "tombstone cleanup consumes the existing shared batch budget before bucket cleanup");
assert.match(sources.paidMigration, /comment_translator_paid_message_rate_reservation_tombstones_expiry_idx[\s\S]{0,160}\(expires_at\)/i, "expired tombstone cleanup has a bounded expiry index");
assert.doesNotMatch(
  task7CleanupSource.slice(0, cleanupReservationKeyLockIndex),
  /for update of rate_receipt/i,
  "cleanup candidate selection never locks a receipt before the reservation-key advisory lock"
);
assert.match(sources.paidMigration, /grant execute on function public\.ct_paid_cleanup_attempt_ledgers\(timestamptz, integer\)\s+to service_role/i, "existing cleanup service-role grant is retained");
const paidHeartbeatTouchRpcSource = sources.paidMigration.slice(
  sources.paidMigration.indexOf("drop function if exists public.ct_paid_touch_active_paid_session_heartbeat"),
  sources.paidMigration.indexOf("create or replace function public.ct_paid_reserve_message_rate")
);
assert.match(paidHeartbeatTouchRpcSource, /v_now\s*:=\s*statement_timestamp\(\)/i, "Paid heartbeat touch uses only the database clock");
assert.match(paidHeartbeatTouchRpcSource, /drop function if exists public\.ct_paid_touch_active_paid_session_heartbeat\(uuid, text\)[\s\S]{0,240}returns jsonb/i, "heartbeat RPC drops the old timestamptz signature before creating its typed JSON result");
assert.match(
  paidHeartbeatTouchRpcSource,
  /if v_last_heartbeat_at \+ interval '1 minute' <= v_now then[\s\S]{0,240}update public\.comment_translator_sessions[\s\S]{0,500}last_heartbeat_at\s*=\s*v_now[\s\S]{0,160}updated_at\s*=\s*v_now[\s\S]{0,500}end if/i,
  "Paid heartbeat touch coalesces repeated writes to at most one per rolling minute and updates only heartbeat timestamps"
);
assert.match(
  paidHeartbeatTouchRpcSource,
  /select started_at, last_heartbeat_at[\s\S]{0,400}owner_user_id\s*=\s*p_owner_user_id[\s\S]{0,160}session_reference_id\s*=\s*p_session_reference_id[\s\S]{0,160}status\s*=\s*'active'[\s\S]{0,160}plan\s*=\s*'paid'[\s\S]{0,160}for update/i,
  "Paid heartbeat touch locks the exact active Paid owner/session row and reads both authority timestamps"
);
assert.match(
  paidHeartbeatTouchRpcSource,
  /v_last_heartbeat_at\s*\+\s*interval '1 minute'\s*\+\s*interval '45 seconds'\s*<\s*v_now/i,
  "coalesced Paid heartbeat retains the existing 45-second missing-heartbeat grace after the one-minute durable write window"
);
const missingHeartbeatSqlIndex = paidHeartbeatTouchRpcSource.indexOf("interval '45 seconds'");
const expiredHeartbeatSqlIndex = paidHeartbeatTouchRpcSource.indexOf("interval '3 hours'");
const heartbeatUpdateSqlIndex = paidHeartbeatTouchRpcSource.indexOf("update public.comment_translator_sessions");
assert.ok(missingHeartbeatSqlIndex >= 0 && missingHeartbeatSqlIndex < expiredHeartbeatSqlIndex, "45-second missing-heartbeat is evaluated before the three-hour expiry");
assert.ok(expiredHeartbeatSqlIndex < heartbeatUpdateSqlIndex, "both terminal heartbeat statuses are returned before the DB touch update");
assert.match(
  paidHeartbeatTouchRpcSource,
  /jsonb_build_object\(\s*'status',\s*'missing-heartbeat'\s*\)[\s\S]{0,320}jsonb_build_object\(\s*'status',\s*'expired'\s*\)[\s\S]{0,700}jsonb_build_object\([\s\S]{0,160}'status',\s*'touched'[\s\S]{0,160}'heartbeatAtIso'/i,
  "heartbeat RPC returns distinct typed missing-heartbeat, expired, and touched results"
);
assert.match(
  sources.durableSessionStore,
  /row\.status === "stopped" && row\.plan === "paid"[\s\S]{0,260}last_heartbeat_at[\s\S]{0,80}:\s*row\.last_heartbeat_at/,
  "Paid stopped persistence conditionally omits last_heartbeat_at while Free stopped persistence retains it"
);
assert.match(
  sources.paidMigration,
  /revoke all on function public\.ct_paid_touch_active_paid_session_heartbeat\(uuid, text\)[\s\S]{0,160}from public, anon, authenticated[\s\S]{0,160}grant execute on function public\.ct_paid_touch_active_paid_session_heartbeat\(uuid, text\)[\s\S]{0,120}to service_role/i,
  "Paid heartbeat touch is service-role only"
);
assert.doesNotMatch(
  sources.paidMigration,
  /\b(?:provider_message_id|raw_comment|comment_hash|target_metadata|live_chat_id)\b/i,
  "message-rate retention stores no provider message, raw comment, comment hash, or target metadata"
);
assert.match(sources.paidMigration, /comment_translator_sessions_stop_reason_check[\s\S]{0,1600}paid-authority-unreadable/i, "Task 7 widens the durable session stop-reason check for Paid authority stops");
assert.match(sources.paidMigration, /comment_translator_usage_ledger_events_stop_reason_check[\s\S]{0,1800}paid-global-cost-stop/i, "Task 7 widens the usage-ledger stop-reason check for Paid authority stops");
assert.match(sources.paidMigration, /p_owner_user_id\s+is null[\s\S]{0,160}p_session_reference_id\s+is null/i, "poll-budget authority rejects a missing session reference");
assert.doesNotMatch(sources.paidMigration, /\b(?:drop\s+table|truncate\s+table)\b/i, "Task 7 migration is additive");
assert.match(sources.pollingTypes, /nextResetAtIso|utcResetAtIso|resetAtIso/, "polling stop can carry a UTC reset without exposing cursors");
for (const stopReason of [
  "paid-authority-unreadable",
  "paid-character-quota-stop",
  "paid-individual-cost-stop",
  "paid-global-cost-stop"
]) {
  assert.ok(JSON.parse(sources.copyJa).operatorSession.stopReasons[stopReason], `JA copy includes ${stopReason}`);
  assert.ok(JSON.parse(sources.copyEn).operatorSession.stopReasons[stopReason], `EN copy includes ${stopReason}`);
}
assert.match(sources.dockModel, /nextResetAtIso\?:\s*string\s*\|\s*null/, "dock state accepts the browser-safe UTC reset");
assert.match(sources.dock, /browserTimeZone/, "dock passes the user's browser timezone to reset formatting");
assert.match(sources.dock, /formatCommentTranslatorResetAt/, "dock formats the reset timestamp through the shared formatter");
assert.match(sources.sessionPanel, /sessionNextResetLabel/, "stopped Session panel displays the sanitized reset label");
assert.match(sources.paidMigration, /billing_period_available\s+boolean/i, "runtime authority RPC returns billing-period availability");
assert.match(sources.paidMigration, /period_usage\.period_state\s+is\s+null[\s\S]{0,120}period_usage\.period_state\s*=\s*'open'/i, "missing or open billing periods are available");
assert.match(
  sources.paidMigration,
  /reservation_state\s*<>\s*'reserved'[\s\S]{0,240}p_translated_message_count\s*<>\s*v_reservation\.committed_messages[\s\S]{0,240}raise exception/i,
  "finalize exact replay rejects a different translated count before returning an existing settlement"
);
assert.match(sources.paidUsageStore, /billingPeriodAvailable:\s*boolean/, "TypeScript runtime authority includes billing-period availability");
assert.match(sources.paidUsageStore, /billing_period_available/, "Paid usage parser reads billing-period availability");

const entitlement = await import(pathToFileURL(path.join(repoRoot, sourcePaths.entitlement)).href);
const durableSessionStore = await import(pathToFileURL(path.join(repoRoot, sourcePaths.durableSessionStore)).href);
const sessionPolicy = await import(pathToFileURL(path.join(repoRoot, "lib/comment-translator-session-policy.ts")).href);
const sessionState = await import(pathToFileURL(path.join(repoRoot, "lib/comment-translator-session-state.ts")).href);
const sessionExecution = await import(pathToFileURL(path.join(repoRoot, "lib/comment-translator-session-command-execution.ts")).href);
const paidProviderRuntime = await import(pathToFileURL(path.join(repoRoot, "lib/comment-translator-provider-execution-runtime.ts")).href);
const autoPollingDisposition = await import(pathToFileURL(path.join(repoRoot, sourcePaths.autoPollingDisposition)).href);
const sessionResponseGeneration = await import(pathToFileURL(path.join(repoRoot, sourcePaths.sessionResponseGeneration)).href);
const preAuthorityRateLimitProjection = await import(pathToFileURL(path.join(repoRoot, sourcePaths.preAuthorityRateLimitProjection)).href);
const terminalFeedResponse = await import(pathToFileURL(path.join(repoRoot, sourcePaths.terminalFeedResponse)).href);
const paidUsageStoreModule = await import(pathToFileURL(path.join(repoRoot, sourcePaths.paidUsageStore)).href);
const liveStep = await import(pathToFileURL(path.join(repoRoot, sourcePaths.liveStep)).href);
const pollingWiring = await import(pathToFileURL(path.join(repoRoot, "lib/comment-translator-bounded-live-chat-polling-wiring.ts")).href);
const circuitRuntime = await import(pathToFileURL(path.join(repoRoot, "lib/comment-translator-provider-circuit-breaker.ts")).href);
const feedBridge = await import(pathToFileURL(path.join(repoRoot, "lib/comment-translator-real-comments-feed-session-bridge.ts")).href);
const reasonUx = await import(pathToFileURL(path.join(repoRoot, sourcePaths.reasonUx)).href);

const retainedReadyFeed = {
  status: "ready",
  rows: [{ messageReferenceId: "retained-safe-row", translatedText: "retained translation" }]
};
const terminalUnavailableFeed = {
  status: "unavailable",
  rows: [],
  sessionState: {
    status: "stopped",
    plan: "paid",
    stopReason: "paid-authority-unreadable",
    nextAction: "session-stopped"
  }
};
const terminalFeedFixtureState = {
  feed: terminalFeedResponse.resolveCommentTranslatorTerminalFeedResponse({
    currentFeed: retainedReadyFeed,
    refreshedFeed: terminalUnavailableFeed,
    sessionState: terminalUnavailableFeed.sessionState
  }),
  autoPollingDisposition: autoPollingDisposition.resolveCommentTranslatorAutoPollingDisposition(
    terminalUnavailableFeed.sessionState
  )
};
assert.deepEqual(terminalFeedFixtureState.feed.rows, retainedReadyFeed.rows, "terminal unavailable feed retains already displayed safe rows");
assert.equal(terminalFeedFixtureState.autoPollingDisposition, "halted", "terminal unavailable feed halts auto-polling");

const freeActiveSessionState = {
  status: "active",
  plan: "free"
};
const freeNoWorkerFeed = {
  status: "unavailable",
  rows: []
};
const retainedFreeSafeFeed = {
  status: "ready",
  rows: [{ translationStatus: "translated-f10" }]
};
const freeActiveResolvedFeed = terminalFeedResponse.resolveCommentTranslatorTerminalFeedResponse({
  currentFeed: retainedFreeSafeFeed,
  refreshedFeed: freeNoWorkerFeed,
  sessionState: freeActiveSessionState
});
assert.deepEqual(
  freeActiveResolvedFeed,
  retainedFreeSafeFeed,
  "Free active unavailable no-Worker empty feed retains already displayed safe rows"
);

const singleFlightGeneration = sessionResponseGeneration.createCommentTranslatorSessionResponseGeneration();
let singleFlightState = {
  status: "not-started",
  plan: "free",
  stopReason: null,
  reasonUx: null,
  nextAction: "press-start"
};
let singleFlightAutoPollingDisposition = "continue";
let singleFlightCommandCalls = 0;
let losingFailClosedApplied = false;
let resolveFirstStart;
const firstStartResponse = new Promise((resolve) => {
  resolveFirstStart = resolve;
});
const losingFailClosedResponse = Promise.resolve({
  status: "fail-closed",
  authority: "unconfirmed",
  durableStop: "unconfirmed",
  clientReadableDetail: "sanitized-stop-reason-only"
});
const runSingleFlightStart = (responsePromise, responseLabel) => {
  const command = singleFlightGeneration.tryBeginSessionCommand("user-command");
  if (!command) return { accepted: false, completion: Promise.resolve(false) };
  singleFlightCommandCalls += 1;
  const completion = responsePromise.then((response) => {
    if (!singleFlightGeneration.isCurrent(command.responseGeneration)) return false;
    if (response.status === "fail-closed") losingFailClosedApplied = responseLabel === "losing-fail-closed";
    singleFlightState = response;
    singleFlightAutoPollingDisposition = autoPollingDisposition.resolveCommentTranslatorAutoPollingDisposition(response);
    return true;
  }).finally(() => {
    singleFlightGeneration.finishSessionCommand(command.requestId);
  });
  return { accepted: true, command, completion };
};

const firstStart = runSingleFlightStart(firstStartResponse, "first-paid-success");
assert.equal(firstStart.accepted, true, "the first Start is accepted and becomes the in-flight session command");
assert.equal(singleFlightGeneration.isSessionCommandInFlight(), true, "the first Start remains in flight until its response settles");
const secondStart = runSingleFlightStart(losingFailClosedResponse, "losing-fail-closed");
assert.equal(secondStart.accepted, false, "the same controller gate rejects a second Start while the first is in flight");
assert.equal(singleFlightCommandCalls, 1, "the rejected Start does not issue a second session command");
assert.equal(singleFlightGeneration.capture(), firstStart.command.responseGeneration, "the rejected Start does not advance the response generation");
resolveFirstStart({
  status: "active",
  plan: "paid",
  stopReason: null,
  reasonUx: null,
  nextAction: "send-heartbeat-or-stop"
});
assert.equal(await firstStart.completion, true, "the first Start Paid response remains current and is applied");
assert.equal(losingFailClosedApplied, false, "no losing fail-closed response is applied");
assert.equal(singleFlightState.plan, "paid");
assert.equal(singleFlightState.status, "active");
assert.equal(singleFlightAutoPollingDisposition, "continue");
assert.equal(singleFlightGeneration.isSessionCommandInFlight(), false, "the accepted Start releases its own in-flight lease");
const nextCommand = singleFlightGeneration.tryBeginSessionCommand("user-command");
assert.ok(nextCommand, "a new session command can begin after the accepted Start finishes");
assert.equal(
  singleFlightGeneration.finishSessionCommand(firstStart.command.requestId),
  false,
  "an old command cleanup cannot clear a newer command lease"
);
assert.equal(singleFlightGeneration.isSessionCommandInFlight(), true, "the newer session command remains in flight after stale cleanup");
assert.equal(singleFlightGeneration.finishSessionCommand(nextCommand.requestId), true, "the newer command clears only its own lease");

const initialStatusGeneration = sessionResponseGeneration.createCommentTranslatorSessionResponseGeneration();
const oldInitialStatus = initialStatusGeneration.tryBeginSessionCommand("initial-status");
assert.ok(oldInitialStatus, "the first initial status acquires an initial-status lease");
const newInitialStatus = initialStatusGeneration.tryBeginSessionCommand("initial-status");
assert.ok(newInitialStatus, "a new initial status supersedes an old initial-status lease after dependency cleanup");
assert.notEqual(newInitialStatus.requestId, oldInitialStatus.requestId, "the replacement initial status receives a new request id");
assert.equal(initialStatusGeneration.isCurrent(oldInitialStatus.responseGeneration), false, "the cancelled old initial response is stale after supersession");
assert.equal(initialStatusGeneration.isCurrent(newInitialStatus.responseGeneration), true, "the replacement initial response remains current");
assert.equal(
  initialStatusGeneration.finishSessionCommand(oldInitialStatus.requestId),
  false,
  "old initial cleanup cannot clear the replacement initial-status lease"
);
assert.equal(initialStatusGeneration.isSessionCommandInFlight(), true, "the replacement initial-status lease survives stale cleanup");
assert.equal(initialStatusGeneration.finishSessionCommand(newInitialStatus.requestId), true, "the replacement initial status clears its own lease");

const protectedUserCommandGeneration = sessionResponseGeneration.createCommentTranslatorSessionResponseGeneration();
const protectedUserCommand = protectedUserCommandGeneration.tryBeginSessionCommand("user-command");
assert.ok(protectedUserCommand, "a user command acquires the shared command lease");
assert.equal(
  protectedUserCommandGeneration.tryBeginSessionCommand("initial-status"),
  null,
  "an initial effect cannot supersede Start, status, heartbeat, or Stop user work"
);
assert.equal(protectedUserCommandGeneration.isCurrent(protectedUserCommand.responseGeneration), true, "the protected user command remains current");
assert.equal(protectedUserCommandGeneration.finishSessionCommand(protectedUserCommand.requestId), true);

const responseGeneration = sessionResponseGeneration.createCommentTranslatorSessionResponseGeneration();
const activeCommandGeneration = responseGeneration.advance();
assert.equal(activeCommandGeneration, 1, "the active session command establishes generation 1");
const pendingFeedGeneration = responseGeneration.capture();
let responseOrderingState = { sessionStatus: "active", autoPollingDisposition: "continue" };
let resolveOldActiveFeed;
const oldActiveFeed = new Promise((resolve) => {
  resolveOldActiveFeed = resolve;
});
const pendingFeedApplication = oldActiveFeed.then((feedResponse) => {
  const accepted = responseGeneration.isCurrent(pendingFeedGeneration);
  if (accepted) responseOrderingState = feedResponse;
  return accepted;
});
const stopGeneration = responseGeneration.advance();
assert.equal(stopGeneration, 2, "stop advances the session response generation to 2");
if (responseGeneration.isCurrent(stopGeneration)) {
  responseOrderingState = { sessionStatus: "stopped", autoPollingDisposition: "halted" };
}
resolveOldActiveFeed({ sessionStatus: "active", autoPollingDisposition: "continue" });
const oldActiveFeedAccepted = await pendingFeedApplication;
assert.equal(oldActiveFeedAccepted, false, "the generation 1 feed completion is rejected after stop advances to generation 2");
assert.deepEqual(
  responseOrderingState,
  { sessionStatus: "stopped", autoPollingDisposition: "halted" },
  "an old active feed response cannot overwrite the completed stop response"
);

for (const [rpcData, expected] of [
  [{ status: "missing-heartbeat" }, { status: "missing-heartbeat" }],
  [{ status: "expired" }, { status: "expired" }],
  [{ status: "touched", heartbeatAtIso: "2026-08-14T10:00:00.000Z" }, { status: "touched", heartbeatAtIso: "2026-08-14T10:00:00.000Z" }]
]) {
  const adapter = durableSessionStore.createCommentTranslatorDurableSessionSupabaseStore({
    supabase: {
      rpc: async () => ({ data: rpcData, error: null }),
      from: () => { throw new Error("heartbeat parser fixture must not read a table"); }
    },
    nowIso: () => "2026-08-14T10:00:00.000Z"
  });
  assert.deepEqual(
    await adapter.touchActivePaidSessionHeartbeat({ ownerUserId: "fixture-owner", sessionReferenceId: "fixture-session" }),
    expected,
    `heartbeat adapter parses ${expected.status} as a typed non-error result`
  );
}

const preAuthorityFixtures = [
  ["abuse-blocked-active-paid", { status: "ready", activeSession: { sessionReferenceId: "cts_paid_abuse", startedAtMs: 1, lastHeartbeatAtMs: 2, plan: "paid" } }],
  ["launch-blocked-active-paid", { status: "ready", activeSession: { sessionReferenceId: "cts_paid_launch", startedAtMs: 1, lastHeartbeatAtMs: 2, plan: "paid" } }],
  ["durable-session-unreadable", { status: "fail-closed", reason: "durable-session-read-unavailable" }]
];
for (const [fixtureName, durableActiveSessionRead] of preAuthorityFixtures) {
  const result = durableSessionStore.createCommentTranslatorPreAuthorityFailClosedResult({ durableActiveSessionRead });
  assert.equal(result.status, "fail-closed", `${fixtureName} fails closed`);
  assert.equal(result.durableStop, "unconfirmed", `${fixtureName} does not claim a durable stop`);
  assert.equal(result.authority, "unconfirmed", `${fixtureName} remains non-terminal and unconfirmed`);
  assert.notEqual(result.plan, "free", `${fixtureName} never installs a Free projection`);
  assert.equal(autoPollingDisposition.resolveCommentTranslatorAutoPollingDisposition(result), "halted", `${fixtureName} halts auto-polling`);
  assert.doesNotMatch(JSON.stringify(result), /cts_paid_|owner|credential|provider|comment|target|liveChatId/i, `${fixtureName} remains sanitized`);
}
const freePreAuthorityFixture = durableSessionStore.resolveCommentTranslatorPreAuthorityBlockedResult({
  durableActiveSessionRead: { status: "ready", activeSession: null },
  blockedResult: { status: "stopped", plan: "free", marker: "existing-free-result" }
});
assert.deepEqual(
  freePreAuthorityFixture,
  { status: "stopped", plan: "free", marker: "existing-free-result" },
  "normal Free pre-authority blocked behavior remains unchanged"
);
const neutralRateLimitFixture = durableSessionStore.createCommentTranslatorPreAuthorityRateLimitResult({
  check: { status: "blocked", reason: "rate-limit-exceeded", rateLimit: "exceeded", retryAfterSeconds: 17 }
});
assert.deepEqual(
  neutralRateLimitFixture,
  {
    status: "fail-closed",
    authority: "unconfirmed",
    durableStop: "unconfirmed",
    clientReadableDetail: "sanitized-stop-reason-only",
    rateLimit: "exceeded",
    rateLimitReason: "rate-limit-exceeded",
    retryAfterSeconds: 17
  },
  "initial abuse denial exposes only plan-neutral sanitized retry metadata"
);
assert.equal(Object.hasOwn(neutralRateLimitFixture, "plan"), false, "pre-authority rate limit never guesses Free or Paid");
const freeRateLimitProjection = preAuthorityRateLimitProjection.projectCommentTranslatorPreAuthorityFailClosedSessionState({
  current: {
    status: "not-started",
    plan: "free",
    stopReason: null,
    reasonUx: null,
    nextAction: "press-start",
    rateLimit: undefined,
    rateLimitReason: undefined,
    retryAfterSeconds: null
  },
  failClosed: neutralRateLimitFixture
});
assert.equal(freeRateLimitProjection.status, "stopped", "plan-neutral denial restores the Free-safe stopped UI");
assert.equal(freeRateLimitProjection.plan, "free", "plan-neutral denial preserves the current Free plan");
assert.equal(freeRateLimitProjection.rateLimit, "exceeded");
assert.equal(freeRateLimitProjection.rateLimitReason, "rate-limit-exceeded");
assert.equal(freeRateLimitProjection.retryAfterSeconds, 17);
assert.equal(freeRateLimitProjection.nextAction, "wait-for-limit-reset");
assert.equal(autoPollingDisposition.resolveCommentTranslatorAutoPollingDisposition(freeRateLimitProjection), "halted", "Free rate-limit projection halts auto-polling");
const activePaidRateLimitProjection = preAuthorityRateLimitProjection.projectCommentTranslatorPreAuthorityFailClosedSessionState({
  current: {
    status: "active",
    plan: "paid",
    stopReason: null,
    reasonUx: null,
    nextAction: "send-heartbeat-or-stop"
  },
  failClosed: neutralRateLimitFixture
});
assert.equal(activePaidRateLimitProjection.status, "stopped");
assert.equal(activePaidRateLimitProjection.plan, "paid");
assert.equal(activePaidRateLimitProjection.stopReason, "paid-authority-unreadable", "active Paid fail-closed takes priority over plan-neutral rate-limit UI");
assert.equal(activePaidRateLimitProjection.rateLimit, undefined, "active Paid projection does not replace authority failure with a Free-style rate-limit stop");

const unreadableAuthorityPersistEvents = [];
let unreadableAuthorityPersistRequest = null;
const unreadableAuthorityStoppedState = await durableSessionStore.stopCommentTranslatorActivePaidSessionForUnreadableAuthority({
  callerAuthorization: { status: "authorized", ownerUserId: "server-only-owner-reference" },
  durableSessionStore: {
    status: "ready",
    store: {
      async readActiveSession() { return null; },
      async persistSessionState(request) {
        unreadableAuthorityPersistEvents.push("persist");
        unreadableAuthorityPersistRequest = request;
      }
    },
    missingEnvReferences: [],
    failClosed: false
  },
  activeSession: {
    sessionReferenceId: "cts_paid_authority_unreadable",
    credentialReferenceId: "server-only-credential-reference",
    startedAtMs: Date.parse("2026-08-14T09:00:00.000Z"),
    lastHeartbeatAtMs: Date.parse("2026-08-14T09:59:45.000Z"),
    plan: "paid"
  },
  nowMs: Date.parse("2026-08-14T10:00:00.000Z")
});
assert.deepEqual(unreadableAuthorityPersistEvents, ["persist"], "active Paid authority failure persists a durable stop before returning");
assert.equal(unreadableAuthorityStoppedState.status, "stopped");
assert.equal(unreadableAuthorityStoppedState.sessionReferenceId, "cts_paid_authority_unreadable");
assert.equal(unreadableAuthorityStoppedState.stopReason, "paid-authority-unreadable");
assert.equal(unreadableAuthorityStoppedState.credentialReferenceId, null, "authority stop does not expose OAuth credential metadata");
assert.equal(unreadableAuthorityPersistRequest.state.sessionReferenceId, "cts_paid_authority_unreadable");
assert.equal(unreadableAuthorityPersistRequest.state.stopReason, "paid-authority-unreadable");
assert.equal(unreadableAuthorityPersistRequest.planEntitlementReferenceId, "comment-translator-paid-core-v1");
assert.doesNotMatch(
  JSON.stringify(unreadableAuthorityStoppedState),
  /server-only-owner-reference|server-only-credential-reference|liveChatId|provider target/i,
  "authority stop output contains no owner, OAuth, or target metadata"
);
const unconfirmedAuthorityStop = await durableSessionStore.stopCommentTranslatorActivePaidSessionForUnreadableAuthority({
    callerAuthorization: { status: "authorized", ownerUserId: "server-only-owner-reference" },
    durableSessionStore: {
      status: "ready",
      store: {
        async readActiveSession() { return null; },
        async persistSessionState() { throw new Error("fixture durable write failure"); }
      },
      missingEnvReferences: [],
      failClosed: false
    },
    activeSession: {
      sessionReferenceId: "cts_paid_authority_unconfirmed_stop",
      startedAtMs: Date.parse("2026-08-14T09:00:00.000Z"),
      lastHeartbeatAtMs: Date.parse("2026-08-14T09:59:45.000Z"),
      plan: "paid"
    },
    nowMs: Date.parse("2026-08-14T10:00:00.000Z")
  });
assert.equal(unconfirmedAuthorityStop.status, "fail-closed", "stop-write failure returns a sanitized fail-closed outcome");
assert.equal(unconfirmedAuthorityStop.plan, "paid");
assert.equal(unconfirmedAuthorityStop.stopReason, "paid-authority-unreadable");
assert.equal(unconfirmedAuthorityStop.durableStop, "unconfirmed", "stop-write failure does not claim a durable terminal stop");
assert.equal(unconfirmedAuthorityStop.clientReadableDetail, "sanitized-stop-reason-only");
assert.doesNotMatch(
  JSON.stringify(unconfirmedAuthorityStop),
  /fixture durable write failure|server-only-owner-reference|sessionReferenceId|credential|liveChatId|provider target/i,
  "unconfirmed stop outcome contains no raw error or private authority metadata"
);
const failedStopPollingDisposition = autoPollingDisposition.resolveCommentTranslatorAutoPollingDisposition(unconfirmedAuthorityStop);
assert.equal(failedStopPollingDisposition, "halted", "unconfirmed Paid stop persistence halts auto-polling");
let failedStopScheduledPolls = 0;
let failedStopPerformedPolls = 0;
if (failedStopPollingDisposition !== "halted") {
  failedStopScheduledPolls += 1;
  failedStopPerformedPolls += 1;
}
assert.equal(failedStopScheduledPolls, 0, "failed stop persistence does not schedule the next poll");
assert.equal(failedStopPerformedPolls, 0, "failed stop persistence does not perform the next poll");

for (const [fixtureName, stopReason] of [
  ["95-percent-poll-budget", "global-budget-stop"],
  ["paid-character-quota", "paid-character-quota-stop"],
  ["paid-cost", "paid-individual-cost-stop"],
  ["paid-provider", "terminal-provider-error"],
  ["start-reservation", "global-budget-stop"]
]) {
  const unconfirmedStop = durableSessionStore.createCommentTranslatorPaidStopPersistenceFailure({ stopReason });
  assert.equal(unconfirmedStop.status, "fail-closed", `${fixtureName} stop-write failure fails closed`);
  assert.equal(unconfirmedStop.plan, "paid");
  assert.equal(unconfirmedStop.stopReason, stopReason, `${fixtureName} keeps only the sanitized stop reason`);
  assert.equal(unconfirmedStop.durableStop, "unconfirmed", `${fixtureName} does not claim a durable stop`);
  assert.equal(
    autoPollingDisposition.resolveCommentTranslatorAutoPollingDisposition(unconfirmedStop),
    "halted",
    `${fixtureName} stop-write failure halts client polling`
  );
  assert.doesNotMatch(JSON.stringify(unconfirmedStop), /fixture-owner|sessionReferenceId|credential|raw provider payload|private/i);
}

for (const stopReason of [
  "paid-authority-unreadable",
  "paid-character-quota-stop",
  "paid-individual-cost-stop",
  "paid-global-cost-stop"
]) {
  assert.equal(
    reasonUx.resolveCommentTranslatorStopReasonUxCode({ stopReason }),
    "quota-or-budget-stop",
    `${stopReason} uses quota/budget UX instead of target-unavailable UX`
  );
}

assert.equal(
  entitlement.commentTranslatorPaidSessionIntegrationContract.paidLimits.translatedMessagesPerMinute,
  60,
  "fixture contract fixes Paid rate at 60/min"
);
assert.equal(
  entitlement.commentTranslatorPaidSessionIntegrationContract.paidLimits.sessionLimitMs,
  3 * 60 * 60 * 1_000,
  "fixture contract fixes Paid session duration at three hours"
);

const freePlanEntitlement = sessionPolicy.createCommentTranslatorSessionPlanEntitlement({ plan: "free" });
const baseUsage = {
  dailyUsedMs: 0,
  currentSessionElapsedMs: 0,
  translatedMessagesInCurrentMinute: 0,
  translatedMessageCapacityAvailableAtMs: null,
  monthlyProviderInputCharacterEstimate: 0,
  providerBudgetAvailable: true,
  globalBudgetAvailable: true,
  aiBudgetAvailable: true,
  translationProviderAvailable: true,
  planEntitlement: freePlanEntitlement,
  providerRequestEstimate: { requestEstimateCount: 0, quotaUnitEstimate: 0, providerTargetMetadata: "forbidden" },
  aiUsageEstimate: {
    translatedMessageEstimate: 0,
    providerInputCharacterEstimate: 0,
    translatedCharacterEstimate: 0,
    estimatedCostMicros: 0,
    rawCommentText: "never-recorded-by-design"
  }
};

const paidEntitlement = {
  id: "fixture-paid-entitlement",
  lifecycleId: "fixture-paid-lifecycle",
  ownerUserId: "fixture-owner",
  customerBindingId: "fixture-customer",
  subscriptionBindingId: "fixture-subscription",
  productId: "fixture-product",
  priceId: "fixture-price",
  status: "active",
  currentPeriodStartIso: "2026-08-01T00:00:00.000Z",
  currentPeriodEndIso: "2026-09-01T00:00:00.000Z",
  cancelAtPeriodEnd: false,
  disputeState: "none",
  paymentFailureStartedAtIso: null,
  projectedAtIso: "2026-08-01T00:00:00.000Z",
  updatedAtIso: "2026-08-01T00:00:00.000Z"
};

const paidAuthority = {
  status: "ready",
  entitlement: paidEntitlement,
  costAuthority: {
    billingPeriodAvailable: true,
    billingPeriodInputCharacters: 12_345,
    billingPeriodCharacterLimit: 500_000,
    individualCostAvailable: true,
    globalCostAvailable: true,
    translatedMessagesInCurrentMinute: 12,
    translatedMessageCapacityAvailableAtIso: null
  },
  providerAuthority: {
    openAiAvailable: true,
    azureFallbackAvailable: false,
    effectiveRoute: "openai"
  },
  pollBudget: {
    dailyBudget: 90_000,
    reservedPolls: 12_000,
    sessionReservedPolls: 720,
    utcDay: "2026-08-14",
    nextResetAtIso: "2026-08-15T00:00:00.000Z",
    activeAutoPollAllowed: true,
    authorityReadable: true
  }
};

const parsedClosedRuntimeAuthority = await paidUsageStoreModule.createCommentTranslatorPaidUsageStore({
  supabase: {
    rpc: async () => ({
      data: {
        billing_period_available: false,
        billing_period_input_characters: 12_345,
        billing_period_character_limit: 500_000,
        individual_cost_available: true,
        global_cost_available: true,
        translated_messages_in_current_minute: 12,
        translated_message_capacity_available_at: null
      },
      error: null
    })
  }
}).readRuntimeAuthority({
  ownerUserId: "fixture-owner",
  periodStartIso: "2026-08-01T00:00:00.000Z",
  periodEndIso: "2026-09-01T00:00:00.000Z",
  utcMonth: "2026-08-01",
  nowIso: "2026-08-14T10:00:00.000Z"
});
assert.equal(parsedClosedRuntimeAuthority.billingPeriodAvailable, false, "runtime authority parser preserves a closed billing period");

const paidBaseline = entitlement.resolveCommentTranslatorPublicEntitlementBaseline({
  durableUsageRead: { status: "ready", snapshot: baseUsage, authority: "durable-store" },
  paidAuthority
});
assert.equal(paidBaseline.status, "ready");
assert.equal(paidBaseline.plan, "paid");
assert.equal(paidBaseline.planEntitlement.translatedMessagesPerMinute, 60);
assert.equal(paidBaseline.planEntitlement.sessionLimitMs, 3 * 60 * 60 * 1_000);
assert.equal(paidBaseline.planEntitlement.activeSessionsPerUser, 1);
assert.equal(paidBaseline.planEntitlement.monthlyProviderInputCharacterLimit, 500_000);
assert.equal(paidBaseline.planEntitlement.dailyLimitMs, Number.MAX_SAFE_INTEGER);
assert.equal(paidBaseline.usage.paidAuthorityReadable, true);
assert.equal(paidBaseline.usage.paidBillingPeriodInputCharacters, 12_345);
assert.equal(paidBaseline.usage.paidBillingPeriodCharacterLimit, 500_000);
assert.equal(paidBaseline.usage.paidIndividualCostAvailable, true);
assert.equal(paidBaseline.usage.paidGlobalCostAvailable, true);
assert.equal(paidBaseline.usage.translationProviderAvailable, true);
assert.equal(paidAuthority.providerAuthority.effectiveRoute, "openai", "normal Paid authority keeps the OpenAI route");
assert.equal(
  entitlement.resolveCommentTranslatorPaidStopNextResetAtIso({
    reason: "paid-character-quota-stop",
    paidSessionAuthority: paidAuthority,
    nowMs: Date.parse("2026-08-14T10:00:00.000Z")
  }),
  paidEntitlement.currentPeriodEndIso,
  "Paid character quota resets at the durable billing-period end"
);
assert.equal(
  entitlement.resolveCommentTranslatorPaidStopNextResetAtIso({
    reason: "paid-individual-cost-stop",
    paidSessionAuthority: paidAuthority,
    nowMs: Date.parse("2026-08-14T10:00:00.000Z")
  }),
  paidEntitlement.currentPeriodEndIso,
  "Paid individual cost resets at the durable billing-period end"
);
assert.equal(
  entitlement.resolveCommentTranslatorPaidStopNextResetAtIso({
    reason: "paid-global-cost-stop",
    paidSessionAuthority: paidAuthority,
    nowMs: Date.parse("2026-08-14T10:00:00.000Z")
  }),
  "2026-09-01T00:00:00.000Z",
  "Paid global cost resets at the next UTC month"
);
assert.equal(
  entitlement.resolveCommentTranslatorPaidStopNextResetAtIso({
    reason: "translated-message-cap",
    paidSessionAuthority: paidAuthority,
    nowMs: Date.parse("2026-08-14T10:00:12.000Z")
  }),
  "2026-08-14T10:01:00.000Z",
  "Paid message cap resets at the next UTC minute"
);
const paidStopEntitlement = entitlement.createCommentTranslatorPaidSessionStopPlanEntitlement();
assert.equal(paidStopEntitlement.plan, "paid", "Paid Stop remains on the Paid plan");
assert.equal(paidStopEntitlement.paidAuthorityReadable, false, "Paid Stop does not re-grant authority");
assert.equal(paidStopEntitlement.dailyLimitMs, Number.MAX_SAFE_INTEGER, "Paid Stop has no daily hard time cap");
const paidNotStarted = sessionState.createCommentTranslatorNotStartedSessionState({
  nowMs: Date.parse("2026-08-14T10:00:00.000Z"),
  plan: "paid",
  usage: paidBaseline.usage
});
assert.equal(paidNotStarted.remainingSessionSeconds, 3 * 60 * 60, "Paid status shows the three-hour session allowance");
assert.equal(paidNotStarted.remainingDailySeconds, Math.ceil(Number.MAX_SAFE_INTEGER / 1_000), "Paid status has no daily time cap");
assert.equal(
  sessionPolicy.assessCommentTranslatorUsageStopReason({
    ...paidBaseline.usage,
    dailyUsedMs: Number.MAX_SAFE_INTEGER
  }, "paid"),
  null,
  "Paid session has no daily time-limit stop"
);

const authorityCircuitReads = [];
const fixtureProviderRuntime = {
  usageStore: {},
  circuitAuthority: {},
  serverSecret: "server-only-fixture-secret",
  attemptKeyVersion: "fixture-v1",
  killSwitches: {
    checkout_enabled: true,
    paid_translation_enabled: true,
    openai_enabled: true,
    azure_fallback_enabled: true
  },
  openAi: { apiKey: "fixture-provider-key", endpoint: "https://provider.invalid" },
  azureProvider: {},
  dailyPollBudget: 90_000
};
const fixtureAuthorityDependencies = {
  paidEntitlementStore: {
    status: "ready",
    store: { readEntitlement: async () => paidEntitlement }
  },
  paidUsageStore: {
    status: "ready",
    store: {
      readRuntimeAuthority: async () => paidAuthority.costAuthority,
      readPollBudget: async () => ({
        utcDay: "2026-08-14",
        dailyBudget: null,
        reservedPolls: 0,
        sessionReservedPolls: 0,
        sessionReservationPresent: false,
        nextResetAtIso: "2026-08-15T00:00:00.000Z"
      })
    }
  },
  providerCircuitAuthority: {
    read: async (provider) => {
      authorityCircuitReads.push(provider);
      return { provider, state: "closed" };
    }
  },
  providerRuntime: fixtureProviderRuntime
};
const emptyPollBucketPaidStartAuthority = await entitlement.readCommentTranslatorPaidSessionAuthority({
  callerAuthorization: { status: "authorized", ownerUserId: "fixture-owner" },
  nowMs: Date.parse("2026-08-14T10:00:00.000Z"),
  pollBudgetSessionReferenceId: "ctpps_fixture_pre_session",
  allowEmptyPollBudgetInitialization: true,
  dependencies: fixtureAuthorityDependencies
});
assert.equal(emptyPollBucketPaidStartAuthority.status, "ready", "new Paid Start can reach the atomic reservation when the UTC poll bucket is absent");
assert.equal(emptyPollBucketPaidStartAuthority.pollBudget.dailyBudget, 90_000, "new Paid Start uses the trusted configured poll budget for an empty bucket");
assert.equal(emptyPollBucketPaidStartAuthority.pollBudget.authorityReadable, true, "empty-bucket initialization remains server-derived and readable");
const emptyPollBucketWithoutInitialization = await entitlement.readCommentTranslatorPaidSessionAuthority({
  callerAuthorization: { status: "authorized", ownerUserId: "fixture-owner" },
  nowMs: Date.parse("2026-08-14T10:00:00.000Z"),
  pollBudgetSessionReferenceId: "cts_existing_without_reservation",
  dependencies: fixtureAuthorityDependencies
});
assert.equal(emptyPollBucketWithoutInitialization.status, "fail-closed", "an existing session cannot treat an absent poll bucket as usable authority");
const malformedEmptyPollBucketAuthority = await entitlement.readCommentTranslatorPaidSessionAuthority({
  callerAuthorization: { status: "authorized", ownerUserId: "fixture-owner" },
  nowMs: Date.parse("2026-08-14T10:00:00.000Z"),
  pollBudgetSessionReferenceId: "ctpps_fixture_malformed",
  allowEmptyPollBudgetInitialization: true,
  dependencies: {
    ...fixtureAuthorityDependencies,
    paidUsageStore: {
      status: "ready",
      store: {
        readRuntimeAuthority: async () => paidAuthority.costAuthority,
        readPollBudget: async () => ({
          utcDay: "2026-08-14",
          dailyBudget: null,
          reservedPolls: 1,
          sessionReservedPolls: 0,
          sessionReservationPresent: false,
          nextResetAtIso: "2026-08-15T00:00:00.000Z"
        })
      }
    }
  }
});
assert.equal(malformedEmptyPollBucketAuthority.status, "fail-closed", "an absent bucket with reservations remains fail-closed");
const noEntitlementPaidBoundaryEvents = [];
const noEntitlementAuthorityFailure = await entitlement.readCommentTranslatorPaidSessionAuthority({
  callerAuthorization: { status: "authorized", ownerUserId: "fixture-owner" },
  nowMs: Date.parse("2026-08-14T10:00:00.000Z"),
  dependencies: {
    ...fixtureAuthorityDependencies,
    paidEntitlementStore: {
      status: "ready",
      store: {
        readEntitlement: async () => {
          noEntitlementPaidBoundaryEvents.push("entitlement-query");
          throw new Error("fixture Paid entitlement query failure");
        }
      }
    },
    paidUsageStore: {
      status: "ready",
      store: {
        readRuntimeAuthority: async () => {
          noEntitlementPaidBoundaryEvents.push("paid-usage");
          throw new Error("Paid usage must not be read without a confirmed entitlement");
        }
      }
    },
    providerCircuitAuthority: {
      read: async () => {
        noEntitlementPaidBoundaryEvents.push("provider-circuit");
        throw new Error("Provider authority must not be read without a confirmed entitlement");
      }
    }
  }
});
assert.equal(noEntitlementAuthorityFailure.status, "fail-closed");
assert.equal(noEntitlementAuthorityFailure.entitlement, undefined, "failed entitlement query confirms no current Paid entitlement");
assert.deepEqual(noEntitlementPaidBoundaryEvents, ["entitlement-query"], "no-entitlement failure makes no Paid usage or Provider call");
const noActiveFreeBaseline = entitlement.resolveCommentTranslatorPublicEntitlementBaseline({
  durableUsageRead: { status: "ready", snapshot: baseUsage, authority: "durable-store" },
  paidAuthority: noEntitlementAuthorityFailure.entitlement ? noEntitlementAuthorityFailure : undefined
});
assert.equal(noActiveFreeBaseline.status, "ready", "no-active authority failure without an entitlement preserves the Free baseline");
assert.equal(noActiveFreeBaseline.plan, "free");
assert.equal(noActiveFreeBaseline.entitlementSource, "free-public-beta-baseline");
authorityCircuitReads.length = 0;
const authorityRead = await entitlement.readCommentTranslatorPaidSessionAuthority({
  callerAuthorization: { status: "authorized", ownerUserId: "fixture-owner" },
  nowMs: Date.parse("2026-08-14T10:00:00.000Z"),
  dependencies: fixtureAuthorityDependencies
});
assert.equal(authorityRead.status, "ready", "fixture session authority read is ready");
assert.deepEqual(authorityCircuitReads, ["openai", "azure_fallback"], "fixture reads both Paid circuit authorities");
assert.equal(authorityRead.providerAuthority.effectiveRoute, "openai", "closed OpenAI circuit keeps the normal OpenAI route");
assert.equal(authorityRead.providerAuthority.azureFallbackAvailable, false, "Azure direct is not available on the normal OpenAI route");

const closedOpenAiMissingRead = await entitlement.readCommentTranslatorPaidSessionAuthority({
  callerAuthorization: { status: "authorized", ownerUserId: "fixture-owner" },
  nowMs: Date.parse("2026-08-14T10:00:00.000Z"),
  dependencies: {
    ...fixtureAuthorityDependencies,
    providerRuntime: {
      ...fixtureProviderRuntime,
      openAi: { apiKey: null, endpoint: null }
    }
  }
});
assert.equal(closedOpenAiMissingRead.status, "fail-closed", "configured Azure cannot authorize direct fallback while the OpenAI circuit is not degraded");

const disabledOpenAiRead = await entitlement.readCommentTranslatorPaidSessionAuthority({
  callerAuthorization: { status: "authorized", ownerUserId: "fixture-owner" },
  nowMs: Date.parse("2026-08-14T10:00:00.000Z"),
  dependencies: {
    ...fixtureAuthorityDependencies,
    providerRuntime: {
      ...fixtureProviderRuntime,
      killSwitches: { ...fixtureProviderRuntime.killSwitches, openai_enabled: false }
    }
  }
});
assert.equal(disabledOpenAiRead.status, "fail-closed", "disabled OpenAI fails closed outside temporary circuit degradation");

const degradedOpenAiRead = await entitlement.readCommentTranslatorPaidSessionAuthority({
  callerAuthorization: { status: "authorized", ownerUserId: "fixture-owner" },
  nowMs: Date.parse("2026-08-14T10:00:00.000Z"),
  dependencies: {
    ...fixtureAuthorityDependencies,
    providerCircuitAuthority: {
      read: async (provider) => provider === "openai"
        ? { provider, state: "degraded", degradedUntilMs: Date.parse("2026-08-14T10:05:00.000Z") }
        : { provider, state: "closed" }
    }
  }
});
assert.equal(degradedOpenAiRead.status, "ready", "temporary OpenAI circuit degradation permits the configured Azure direct route");
assert.equal(degradedOpenAiRead.providerAuthority.effectiveRoute, "azure-direct");
assert.equal(degradedOpenAiRead.providerAuthority.azureFallbackAvailable, true);

const expiredDegradedNowMs = Date.parse("2026-08-14T10:00:00.000Z");
const expiredDegradedCircuitAuthority = circuitRuntime.createInMemoryCommentTranslatorProviderCircuitAuthority({
  snapshots: {
    openai: {
      ...circuitRuntime.createCommentTranslatorProviderCircuitSnapshot("openai", "degraded"),
      failureCount: 5,
      degradedUntilMs: expiredDegradedNowMs - 1
    }
  }
});
const expiredDegradedProviderRuntime = {
  ...fixtureProviderRuntime,
  circuitAuthority: expiredDegradedCircuitAuthority,
  killSwitches: {
    ...fixtureProviderRuntime.killSwitches,
    azure_fallback_enabled: false
  },
  azureProvider: null
};
const expiredDegradedAuthorityRead = await entitlement.readCommentTranslatorPaidSessionAuthority({
  callerAuthorization: { status: "authorized", ownerUserId: "fixture-owner" },
  nowMs: expiredDegradedNowMs,
  dependencies: {
    ...fixtureAuthorityDependencies,
    providerCircuitAuthority: expiredDegradedCircuitAuthority,
    providerRuntime: expiredDegradedProviderRuntime
  }
});
assert.equal(expiredDegradedAuthorityRead.status, "ready", "expired degradation remains eligible for the existing OpenAI half-open probe");
assert.equal(expiredDegradedAuthorityRead.providerAuthority.effectiveRoute, "openai", "expired degradation projects the probe-eligible OpenAI route");

const authorityFailureCircuitReads = [];
const unreadableAuthorityRead = await entitlement.readCommentTranslatorPaidSessionAuthority({
  callerAuthorization: { status: "authorized", ownerUserId: "fixture-owner" },
  nowMs: Date.parse("2026-08-14T10:00:00.000Z"),
  dependencies: {
    ...fixtureAuthorityDependencies,
    paidUsageStore: {
      status: "ready",
      store: { readRuntimeAuthority: async () => { throw new Error("fixture authority read failed"); } }
    },
    providerCircuitAuthority: {
      read: async (provider) => {
        authorityFailureCircuitReads.push(provider);
        return { provider, state: "closed" };
      }
    }
  }
});
assert.equal(unreadableAuthorityRead.status, "fail-closed", "unreadable Paid authority fails closed");
assert.deepEqual(authorityFailureCircuitReads, [], "authority failure does not advance to Provider circuit reads");

const closedPeriodCircuitReads = [];
const closedPeriodAuthorityRead = await entitlement.readCommentTranslatorPaidSessionAuthority({
  callerAuthorization: { status: "authorized", ownerUserId: "fixture-owner" },
  nowMs: Date.parse("2026-08-14T10:00:00.000Z"),
  dependencies: {
    ...fixtureAuthorityDependencies,
    paidUsageStore: {
      status: "ready",
      store: {
        readRuntimeAuthority: async () => ({
          ...paidAuthority.costAuthority,
          billingPeriodAvailable: false
        })
      }
    },
    providerCircuitAuthority: {
      read: async (provider) => {
        closedPeriodCircuitReads.push(provider);
        return { provider, state: "closed" };
      }
    }
  }
});
assert.equal(closedPeriodAuthorityRead.status, "fail-closed", "closed Paid billing period fails closed");
assert.equal(closedPeriodAuthorityRead.reason, "cost-authority-unreadable");
assert.equal(closedPeriodAuthorityRead.entitlement?.id, "fixture-paid-entitlement", "closed period keeps the known Paid entitlement");
assert.deepEqual(closedPeriodCircuitReads, [], "closed period does not advance to Provider circuit reads");

const knownEntitlementAuthorityFailure = await entitlement.readCommentTranslatorPaidSessionAuthority({
  callerAuthorization: { status: "authorized", ownerUserId: "fixture-owner" },
  nowMs: Date.parse("2026-08-14T10:00:00.000Z"),
  dependencies: {
    ...fixtureAuthorityDependencies,
    providerRuntime: null
  }
});
assert.equal(knownEntitlementAuthorityFailure.status, "fail-closed");
assert.equal(knownEntitlementAuthorityFailure.entitlement?.id, "fixture-paid-entitlement", "known Paid entitlement cannot degrade into Free");

const resetStop = sessionState.createCommentTranslatorStoppedSessionState({
  activeSession: {
    sessionReferenceId: "cts_fixture",
    startedAtMs: Date.parse("2026-08-14T10:00:00.000Z"),
    lastHeartbeatAtMs: Date.parse("2026-08-14T10:00:00.000Z")
  },
  nowMs: Date.parse("2026-08-14T10:30:00.000Z"),
  plan: "paid",
  usage: {
    ...paidBaseline.usage,
    paidBillingPeriodInputCharacters: paidBaseline.usage.paidBillingPeriodCharacterLimit
  },
  reason: "global-budget-stop",
  nextAction: "wait-for-limit-reset",
  nextResetAtIso: "2026-08-15T00:00:00.000Z"
});
assert.equal(resetStop.status, "stopped");
assert.equal(resetStop.nextResetAtIso, "2026-08-15T00:00:00.000Z", "Paid stop returns only the sanitized UTC reset");
const freeStop = sessionState.createCommentTranslatorStoppedSessionState({
  activeSession: null,
  nowMs: Date.parse("2026-08-14T10:30:00.000Z"),
  plan: "free",
  usage: baseUsage,
  reason: "user-stop",
  nextAction: "session-stopped"
});
assert.equal(Object.hasOwn(freeStop, "nextResetAtIso"), false, "Free stop response shape remains unchanged");

const commandEvents = [];
const commandPaidUsageStore = {
  ...fixtureProviderRuntime.usageStore,
  reservePollBudget: async () => {
    throw new Error("Paid start must not use the separate poll reservation seam");
  },
  readPollBudget: async () => {
    commandEvents.push("read");
    return {
      utcDay: "2026-08-14",
      dailyBudget: 90_000,
      reservedPolls: 720,
      sessionReservedPolls: 720,
      sessionReservationPresent: true,
      nextResetAtIso: "2026-08-15T00:00:00.000Z"
    };
  }
};
const commandAuthority = {
  ...paidAuthority,
  providerRuntime: {
    ...fixtureProviderRuntime,
    usageStore: commandPaidUsageStore
  }
};
const commandTarget = {
  status: "ready",
  provider: "youtube",
  serverOnlyTarget: {
    liveChatId: "server-only-live-chat-fixture",
    broadcastId: "server-only-broadcast-fixture",
    targetMetadata: "server-only-internal",
    clientReadable: "forbidden"
  },
  clientReadableTargetMetadata: "forbidden",
  providerAccess: "deterministic-local-adapter-only",
  providerTargetLookupExecution: "not-run-in-this-thread",
  liveChatIdLookupExecution: "not-run-in-this-thread",
  publicLaunchAllowed: false
};
const paidStartState = await sessionExecution.executeCommentTranslatorSessionCommand({
  intent: "start",
  nowMs: Date.parse("2026-08-14T10:00:00.000Z"),
  plan: "paid",
  callerAuthorization: { status: "authorized", ownerUserId: "fixture-owner" },
  credentialReferenceId: "fixture-credential",
  credentialReadiness: {
    status: "ready",
    provider: "youtube",
    credentialReferenceId: "fixture-credential",
    translatorStartAllowed: true,
    reconnectGuidance: "none"
  },
  activeSession: null,
  usage: paidBaseline.usage,
  durableSessionStore: {
    status: "ready",
    store: {
      startPaidSessionAndReservePollBudget: async () => {
        commandEvents.push("atomic-start-and-reserve");
        return 720;
      },
      persistSessionState: async ({ state }) => {
        commandEvents.push(`persist:${state.status}`);
      }
    },
    missingEnvReferences: [],
    failClosed: false
  },
  durableUsageCounterStore: {
    status: "ready",
    store: { persistUsageEvent: async () => {} },
    missingEnvReferences: [],
    failClosed: false
  },
  browserConnected: true,
  targetLanguage: "ja",
  paidSessionAuthority: commandAuthority
}, {
  createLiveProviderRuntime: () => {
    commandEvents.push("provider-runtime");
    return { targetLookupAdapter: {}, pollingAdapter: {} };
  },
  resolveLiveChatTarget: async () => {
    commandEvents.push("target");
    return commandTarget;
  },
  readPhaseResolution: () => ({
    status: "ready",
    projection: {
      activePhase: "running",
      ratePauseReason: null,
      retryAfterSeconds: null,
      automaticResumeExpected: false
    }
  })
});
assert.equal(paidStartState.status, "active", "Paid fixture session starts only after poll reservation");
assert.deepEqual(
  commandEvents,
  ["atomic-start-and-reserve", "read", "provider-runtime", "target"],
  "Paid start keeps the database-clock active row authoritative after target setup"
);
assert.equal(commandEvents.includes("persist:active"), false, "atomic Paid start never overwrites database-authoritative active timestamps");
assert.doesNotMatch(JSON.stringify(paidStartState), /server-only-live-chat-fixture|fixture-owner/i, "Paid browser state omits private target and owner values");

const paidStatusCoalescingGraceEvents = [];
const paidStatusAuthoritativeHeartbeatAtIso = "2026-08-14T10:00:00.000Z";
const paidStatusCoalescingGraceState = await sessionExecution.executeCommentTranslatorSessionCommand({
  intent: "status",
  nowMs: Date.parse("2026-08-14T10:00:46.000Z"),
  plan: "paid",
  callerAuthorization: { status: "authorized", ownerUserId: "fixture-owner" },
  credentialReferenceId: "fixture-credential",
  credentialReadiness: null,
  activeSession: {
    sessionReferenceId: "cts_paid_status_coalescing_grace",
    credentialReferenceId: "fixture-credential",
    startedAtMs: Date.parse("2026-08-14T09:00:00.000Z"),
    lastHeartbeatAtMs: Date.parse(paidStatusAuthoritativeHeartbeatAtIso),
    plan: "paid"
  },
  usage: paidBaseline.usage,
  durableSessionStore: {
    status: "ready",
    store: {
      async persistSessionState({ state }) {
        paidStatusCoalescingGraceEvents.push(`persist:${state.status}:${state.stopReason ?? "none"}`);
      }
    },
    missingEnvReferences: [],
    failClosed: false
  },
  durableUsageCounterStore: {
    status: "ready",
    store: { persistUsageEvent: async () => paidStatusCoalescingGraceEvents.push("ledger") },
    missingEnvReferences: [],
    failClosed: false
  },
  browserConnected: true,
  targetLanguage: "ja",
  paidSessionAuthority: commandAuthority
}, {
  createLiveProviderRuntime: () => {
    paidStatusCoalescingGraceEvents.push("provider-runtime");
    return { targetLookupAdapter: {}, pollingAdapter: {} };
  },
  resolveLiveChatTarget: async () => {
    paidStatusCoalescingGraceEvents.push("target");
    return commandTarget;
  },
  readPhaseResolution: () => ({
    status: "ready",
    projection: { activePhase: "running", ratePauseReason: null, retryAfterSeconds: null, automaticResumeExpected: false }
  })
});
assert.equal(paidStatusCoalescingGraceState.status, "active", "Paid read-only status stays active inside the DB heartbeat coalescing grace window");
assert.equal(paidStatusCoalescingGraceState.stopReason, null, "healthy coalesced Paid status does not produce missing-heartbeat");
assert.equal(
  paidStatusCoalescingGraceState.heartbeat.lastHeartbeatAtIso,
  paidStatusAuthoritativeHeartbeatAtIso,
  "Paid read-only status preserves the authoritative DB heartbeat timestamp"
);
assert.deepEqual(paidStatusCoalescingGraceEvents, [], "healthy Paid read-only status performs no stop persistence, Provider, target, or ledger work");
assert.doesNotMatch(JSON.stringify(paidStatusCoalescingGraceState), /fixture-owner/i, "healthy Paid status remains browser-safe");

const paidStatusEvents = [];
let paidStatusDurableActiveSession = {
  sessionReferenceId: "cts_paid_status_terminal",
  credentialReferenceId: "fixture-credential",
  startedAtMs: Date.parse("2026-08-14T09:00:00.000Z"),
  lastHeartbeatAtMs: Date.parse("2026-08-14T09:58:14.000Z"),
  plan: "paid"
};
const paidStatusDurableStore = {
  status: "ready",
  store: {
    async readActiveSession() { return paidStatusDurableActiveSession; },
    async persistSessionState({ state }) {
      paidStatusEvents.push(`persist:${state.status}`);
      if (state.status === "stopped") paidStatusDurableActiveSession = null;
    },
    async startPaidSessionAndReservePollBudget({ state }) {
      paidStatusEvents.push("atomic-start-and-reserve");
      paidStatusDurableActiveSession = {
        sessionReferenceId: state.sessionReferenceId,
        credentialReferenceId: state.credentialReferenceId ?? undefined,
        startedAtMs: Date.parse(state.startedAtIso),
        lastHeartbeatAtMs: Date.parse(state.heartbeat.lastHeartbeatAtIso),
        plan: "paid"
      };
      return 720;
    }
  },
  missingEnvReferences: [],
  failClosed: false
};
const paidStatusRuntime = {
  createLiveProviderRuntime: () => {
    paidStatusEvents.push("provider-runtime");
    return { targetLookupAdapter: {}, pollingAdapter: {} };
  },
  resolveLiveChatTarget: async () => {
    paidStatusEvents.push("target");
    return commandTarget;
  },
  readPhaseResolution: () => ({
    status: "ready",
    projection: { activePhase: "running", ratePauseReason: null, retryAfterSeconds: null, automaticResumeExpected: false }
  })
};
const paidStatusTerminalState = await sessionExecution.executeCommentTranslatorSessionCommand({
  intent: "status",
  nowMs: Date.parse("2026-08-14T10:00:00.000Z"),
  plan: "paid",
  callerAuthorization: { status: "authorized", ownerUserId: "fixture-owner" },
  credentialReferenceId: "fixture-credential",
  credentialReadiness: null,
  activeSession: paidStatusDurableActiveSession,
  usage: paidBaseline.usage,
  durableSessionStore: paidStatusDurableStore,
  durableUsageCounterStore: {
    status: "ready",
    store: { persistUsageEvent: async () => paidStatusEvents.push("ledger") },
    missingEnvReferences: [],
    failClosed: false
  },
  browserConnected: true,
  targetLanguage: "ja",
  paidSessionAuthority: commandAuthority
}, paidStatusRuntime);
assert.equal(paidStatusTerminalState.status, "stopped", "Paid status computes the terminal missing-heartbeat stop");
assert.equal(paidStatusTerminalState.stopReason, "missing-heartbeat");
assert.deepEqual(paidStatusEvents, ["persist:stopped"], "Paid status persists before returning without Provider, target, or ledger work");
assert.equal(await paidStatusDurableStore.store.readActiveSession(), null, "durable Paid state is no longer active after status stop");

const paidRestartAfterStatus = await sessionExecution.executeCommentTranslatorSessionCommand({
  intent: "start",
  nowMs: Date.parse("2026-08-14T10:00:01.000Z"),
  plan: "paid",
  callerAuthorization: { status: "authorized", ownerUserId: "fixture-owner" },
  credentialReferenceId: "fixture-credential",
  credentialReadiness: {
    status: "ready",
    provider: "youtube",
    credentialReferenceId: "fixture-credential",
    translatorStartAllowed: true,
    reconnectGuidance: "none"
  },
  activeSession: await paidStatusDurableStore.store.readActiveSession(),
  usage: paidBaseline.usage,
  durableSessionStore: paidStatusDurableStore,
  durableUsageCounterStore: {
    status: "ready",
    store: { persistUsageEvent: async () => {} },
    missingEnvReferences: [],
    failClosed: false
  },
  browserConnected: true,
  targetLanguage: "ja",
  paidSessionAuthority: commandAuthority
}, paidStatusRuntime);
assert.equal(paidRestartAfterStatus.status, "active", "a later Paid start is eligible after the durable status stop");
assert.ok(paidStatusEvents.includes("atomic-start-and-reserve"), "later Paid start reaches the atomic start authority");

const paidHeartbeatEvents = [];
const paidHeartbeatNowMs = Date.parse("2026-08-14T10:00:15.000Z");
const paidHeartbeatPollingAdapter = pollingWiring.createDeterministicCommentTranslatorBoundedLiveChatPollingAdapter({
  pollSteps: [{
    type: "messages",
    receivedAtMs: paidHeartbeatNowMs,
    nextPageToken: "server-only-heartbeat-cursor",
    pollingIntervalMillis: 15_000,
    comments: []
  }]
});
const paidHeartbeatAuthority = {
  ...commandAuthority,
  providerRuntime: {
    ...commandAuthority.providerRuntime,
    usageStore: {
      ...commandAuthority.providerRuntime.usageStore,
      reservePollBudget: async () => {
        paidHeartbeatEvents.push("poll-reserve");
        return 720;
      },
      readPollBudget: async () => {
        paidHeartbeatEvents.push("poll-read");
        return {
          utcDay: "2026-08-14",
          dailyBudget: 90_000,
          reservedPolls: 720,
          sessionReservedPolls: 720,
          sessionReservationPresent: true,
          nextResetAtIso: "2026-08-15T00:00:00.000Z"
        };
      }
    }
  }
};
const paidHeartbeatInput = {
  intent: "heartbeat",
  nowMs: paidHeartbeatNowMs,
  plan: "paid",
  callerAuthorization: { status: "authorized", ownerUserId: "fixture-owner" },
  credentialReferenceId: "fixture-credential",
  credentialReadiness: {
    status: "ready",
    provider: "youtube",
    credentialReferenceId: "fixture-credential",
    translatorStartAllowed: true,
    reconnectGuidance: "none"
  },
  activeSession: {
    sessionReferenceId: paidStartState.sessionReferenceId,
    startedAtMs: Date.parse(paidStartState.startedAtIso),
    lastHeartbeatAtMs: Date.parse(paidStartState.heartbeat.lastHeartbeatAtIso),
    plan: "paid"
  },
  usage: paidBaseline.usage,
  durableSessionStore: {
    status: "ready",
    store: {
      touchActivePaidSessionHeartbeat: async () => {
        paidHeartbeatEvents.push("touch");
        return { status: "touched", heartbeatAtIso: "2026-08-14T10:00:00.000Z" };
      },
      persistSessionState: async ({ state }) => paidHeartbeatEvents.push(`persist:${state.status}`)
    },
    missingEnvReferences: [],
    failClosed: false
  },
  durableUsageCounterStore: {
    status: "ready",
    store: { persistUsageEvent: async () => paidHeartbeatEvents.push("ledger") },
    missingEnvReferences: [],
    failClosed: false
  },
  browserConnected: true,
  targetLanguage: "ja",
  paidSessionAuthority: paidHeartbeatAuthority
};
const paidHeartbeatState = await sessionExecution.executeCommentTranslatorSessionCommand(paidHeartbeatInput, {
  createLiveProviderRuntime: () => {
    paidHeartbeatEvents.push("provider-runtime");
    return { targetLookupAdapter: {}, pollingAdapter: paidHeartbeatPollingAdapter };
  },
  resolveLiveChatTarget: async () => {
    paidHeartbeatEvents.push("target");
    return commandTarget;
  },
  readPhaseResolution: () => ({
    status: "ready",
    projection: {
      activePhase: "running",
      ratePauseReason: null,
      retryAfterSeconds: null,
      automaticResumeExpected: false
    }
  })
});
assert.equal(paidHeartbeatState.status, "active", "Paid heartbeat remains active after DB-clock touch");
assert.equal(paidHeartbeatEvents[0], "touch", "Paid heartbeat touches DB-clock authority before Provider runtime work");
assert.ok(
  paidHeartbeatEvents.indexOf("touch") < paidHeartbeatEvents.indexOf("provider-runtime"),
  "Paid heartbeat DB-clock touch completes before Provider runtime construction"
);
assert.equal(paidHeartbeatEvents.includes("persist:active"), false, "Paid heartbeat never overwrites DB-authoritative active timestamps");

const paidHeartbeatCoalesceBoundaryEvents = [];
const paidHeartbeatCoalesceBoundaryNowMs = Date.parse("2026-08-14T10:01:00.000Z");
const paidHeartbeatCoalesceBoundaryPollingAdapter = pollingWiring.createDeterministicCommentTranslatorBoundedLiveChatPollingAdapter({
  pollSteps: [{
    type: "messages",
    receivedAtMs: paidHeartbeatCoalesceBoundaryNowMs,
    nextPageToken: "server-only-heartbeat-coalesce-boundary-cursor",
    pollingIntervalMillis: 15_000,
    comments: []
  }]
});
const paidHeartbeatCoalesceBoundaryState = await sessionExecution.executeCommentTranslatorSessionCommand({
  ...paidHeartbeatInput,
  nowMs: paidHeartbeatCoalesceBoundaryNowMs,
  activeSession: {
    ...paidHeartbeatInput.activeSession,
    lastHeartbeatAtMs: Date.parse("2026-08-14T10:00:00.000Z")
  },
  durableSessionStore: {
    status: "ready",
    store: {
      touchActivePaidSessionHeartbeat: async () => {
        paidHeartbeatCoalesceBoundaryEvents.push("touch");
        return { status: "touched", heartbeatAtIso: "2026-08-14T10:01:00.000Z" };
      },
      persistSessionState: async ({ state }) => paidHeartbeatCoalesceBoundaryEvents.push(`persist:${state.status}`)
    },
    missingEnvReferences: [],
    failClosed: false
  },
  durableUsageCounterStore: {
    status: "ready",
    store: { persistUsageEvent: async () => paidHeartbeatCoalesceBoundaryEvents.push("ledger") },
    missingEnvReferences: [],
    failClosed: false
  }
}, {
  createLiveProviderRuntime: () => ({ targetLookupAdapter: {}, pollingAdapter: paidHeartbeatCoalesceBoundaryPollingAdapter }),
  resolveLiveChatTarget: async () => commandTarget,
  readPhaseResolution: () => ({
    status: "ready",
    projection: { activePhase: "running", ratePauseReason: null, retryAfterSeconds: null, automaticResumeExpected: false }
  })
});
assert.equal(paidHeartbeatCoalesceBoundaryState.status, "active", "healthy Paid heartbeat remains active at the first one-minute coalesce boundary");
assert.equal(paidHeartbeatCoalesceBoundaryState.stopReason, null, "healthy coalesce-boundary heartbeat does not produce missing-heartbeat");
assert.equal(
  paidHeartbeatCoalesceBoundaryState.heartbeat.lastHeartbeatAtIso,
  "2026-08-14T10:01:00.000Z",
  "coalesce-boundary browser-safe heartbeat reflects the authoritative DB timestamp"
);
assert.equal(paidHeartbeatCoalesceBoundaryEvents.includes("persist:active"), false, "coalesce-boundary heartbeat does not overwrite DB-authoritative active timestamps");

const invalidPaidHeartbeatTimestampEvents = [];
const invalidPaidHeartbeatTimestampState = await sessionExecution.executeCommentTranslatorSessionCommand({
  ...paidHeartbeatInput,
  durableSessionStore: {
    status: "ready",
    store: {
      touchActivePaidSessionHeartbeat: async () => ({ status: "touched", heartbeatAtIso: "invalid-heartbeat-timestamp" }),
      persistSessionState: async () => invalidPaidHeartbeatTimestampEvents.push("persist")
    },
    missingEnvReferences: [],
    failClosed: false
  },
  durableUsageCounterStore: {
    status: "ready",
    store: { persistUsageEvent: async () => invalidPaidHeartbeatTimestampEvents.push("ledger") },
    missingEnvReferences: [],
    failClosed: false
  }
}, {
  createLiveProviderRuntime: () => {
    invalidPaidHeartbeatTimestampEvents.push("provider-runtime");
    return { targetLookupAdapter: {}, pollingAdapter: paidHeartbeatPollingAdapter };
  },
  resolveLiveChatTarget: async () => commandTarget,
  readPhaseResolution: () => ({ status: "ready", projection: { activePhase: "running", ratePauseReason: null, retryAfterSeconds: null, automaticResumeExpected: false } })
});
assert.equal(invalidPaidHeartbeatTimestampState.status, "fail-closed", "invalid trusted Paid heartbeat timestamp fails closed");
assert.equal(invalidPaidHeartbeatTimestampState.stopReason, "paid-authority-unreadable");
assert.deepEqual(invalidPaidHeartbeatTimestampEvents, [], "invalid heartbeat timestamp stops before Provider, persistence, or ledger work");

const startLedgerFailureEvents = [];
let startLedgerFailureDurableActive = null;
const startLedgerFailureState = await sessionExecution.executeCommentTranslatorSessionCommand({
  intent: "start",
  nowMs: Date.parse("2026-08-14T10:01:00.000Z"),
  plan: "paid",
  callerAuthorization: { status: "authorized", ownerUserId: "fixture-owner" },
  credentialReferenceId: "fixture-credential",
  credentialReadiness: {
    status: "ready",
    provider: "youtube",
    credentialReferenceId: "fixture-credential",
    translatorStartAllowed: true,
    reconnectGuidance: "none"
  },
  activeSession: null,
  usage: paidBaseline.usage,
  durableSessionStore: {
    status: "ready",
    store: {
      startPaidSessionAndReservePollBudget: async ({ state }) => {
        startLedgerFailureEvents.push("atomic-start-and-reserve");
        startLedgerFailureDurableActive = state.sessionReferenceId;
        return 720;
      },
      persistSessionState: async ({ state }) => {
        startLedgerFailureEvents.push(`persist:${state.status}:${state.stopReason}`);
        if (state.status === "stopped") startLedgerFailureDurableActive = null;
      }
    },
    missingEnvReferences: [],
    failClosed: false
  },
  durableUsageCounterStore: {
    status: "ready",
    store: {
      persistUsageEvent: async () => {
        startLedgerFailureEvents.push("ledger:failed");
        throw new Error("fixture usage ledger unavailable after atomic Paid start");
      }
    },
    missingEnvReferences: [],
    failClosed: false
  },
  browserConnected: true,
  targetLanguage: "ja",
  paidSessionAuthority: {
    ...commandAuthority,
    providerRuntime: {
      ...commandAuthority.providerRuntime,
      usageStore: {
        ...commandAuthority.providerRuntime.usageStore,
        readPollBudget: async () => {
          startLedgerFailureEvents.push("poll-budget-read");
          return {
            utcDay: "2026-08-14",
            dailyBudget: 90_000,
            reservedPolls: 720,
            sessionReservedPolls: 720,
            sessionReservationPresent: true,
            nextResetAtIso: "2026-08-15T00:00:00.000Z"
          };
        }
      }
    }
  }
}, {
  createLiveProviderRuntime: () => ({ targetLookupAdapter: {}, pollingAdapter: {} }),
  resolveLiveChatTarget: async () => commandTarget,
  readPhaseResolution: () => ({
    status: "ready",
    projection: { activePhase: "running", ratePauseReason: null, retryAfterSeconds: null, automaticResumeExpected: false }
  })
});
assert.equal(startLedgerFailureState.status, "stopped", "atomic Paid start ledger failure returns only after a durable stop succeeds");
assert.equal(startLedgerFailureState.stopReason, "paid-authority-unreadable");
assert.equal(startLedgerFailureDurableActive, null, "atomic Paid start ledger failure releases the durable active row, 720 reservation, and owner slot");
assert.deepEqual(
  startLedgerFailureEvents.slice(-2),
  ["ledger:failed", "persist:stopped:paid-authority-unreadable"],
  "atomic Paid start ledger failure attempts the sanitized durable stop and records no successful ledger event"
);

const heartbeatLedgerFailureEvents = [];
let heartbeatLedgerFailureDurableActive = paidHeartbeatInput.activeSession.sessionReferenceId;
const heartbeatLedgerFailurePollingAdapter = pollingWiring.createDeterministicCommentTranslatorBoundedLiveChatPollingAdapter({
  pollSteps: [{
    type: "messages",
    receivedAtMs: Date.parse("2026-08-14T10:01:15.000Z"),
    nextPageToken: "server-only-ledger-failure-cursor",
    pollingIntervalMillis: 15_000,
    comments: []
  }]
});
const heartbeatLedgerFailureState = await sessionExecution.executeCommentTranslatorSessionCommand({
  ...paidHeartbeatInput,
  nowMs: Date.parse("2026-08-14T10:01:15.000Z"),
  usage: {
    ...paidBaseline.usage,
    paidBillingPeriodInputCharacters: paidBaseline.usage.paidBillingPeriodCharacterLimit
  },
  activeSession: {
    ...paidHeartbeatInput.activeSession,
    lastHeartbeatAtMs: Date.parse("2026-08-14T10:01:00.000Z")
  },
  durableSessionStore: {
    status: "ready",
    store: {
      touchActivePaidSessionHeartbeat: async () => {
        heartbeatLedgerFailureEvents.push("touch");
        return { status: "touched", heartbeatAtIso: "2026-08-14T10:01:15.000Z" };
      },
      persistSessionState: async ({ state }) => {
        heartbeatLedgerFailureEvents.push(`persist:${state.status}:${state.stopReason}`);
        if (state.status === "stopped") heartbeatLedgerFailureDurableActive = null;
      }
    },
    missingEnvReferences: [],
    failClosed: false
  },
  durableUsageCounterStore: {
    status: "ready",
    store: {
      persistUsageEvent: async () => {
        heartbeatLedgerFailureEvents.push("ledger:failed");
        throw new Error("fixture usage ledger unavailable after DB-clock Paid heartbeat");
      }
    },
    missingEnvReferences: [],
    failClosed: false
  }
}, {
  createLiveProviderRuntime: () => ({ targetLookupAdapter: {}, pollingAdapter: heartbeatLedgerFailurePollingAdapter }),
  resolveLiveChatTarget: async () => commandTarget,
  readPhaseResolution: () => ({
    status: "ready",
    projection: { activePhase: "running", ratePauseReason: null, retryAfterSeconds: null, automaticResumeExpected: false }
  })
});
assert.equal(heartbeatLedgerFailureState.status, "fail-closed", "DB-clock Paid heartbeat stop-ledger failure remains fail-closed after the durable stop");
assert.equal(heartbeatLedgerFailureState.stopReason, "paid-character-quota-stop");
assert.equal(heartbeatLedgerFailureDurableActive, null, "DB-clock Paid heartbeat ledger failure leaves no active durable session");
assert.deepEqual(
  heartbeatLedgerFailureEvents.slice(-2),
  ["persist:stopped:paid-character-quota-stop", "ledger:failed"],
  "DB-clock Paid heartbeat stop-ledger failure retains the durable stop and records no successful ledger event"
);

const expiredHeartbeatEvents = [];
let expiredHeartbeatPersistedState = null;
const expiredHeartbeatState = await sessionExecution.executeCommentTranslatorSessionCommand({
  ...paidHeartbeatInput,
  nowMs: Date.parse("2026-08-14T12:00:00.000Z"),
  activeSession: {
    ...paidHeartbeatInput.activeSession,
    startedAtMs: Date.parse("2026-08-14T09:00:00.000Z"),
    lastHeartbeatAtMs: Date.parse("2026-08-14T11:59:45.000Z")
  },
  durableSessionStore: {
    status: "ready",
    store: {
      touchActivePaidSessionHeartbeat: async () => {
        expiredHeartbeatEvents.push("touch");
        return { status: "expired" };
      },
      persistSessionState: async ({ state }) => {
        expiredHeartbeatEvents.push(`persist:${state.status}`);
        expiredHeartbeatPersistedState = state;
      }
    },
    missingEnvReferences: [],
    failClosed: false
  },
  durableUsageCounterStore: {
    status: "ready",
    store: { persistUsageEvent: async () => expiredHeartbeatEvents.push("ledger") },
    missingEnvReferences: [],
    failClosed: false
  }
}, {
  createLiveProviderRuntime: () => {
    expiredHeartbeatEvents.push("provider-runtime");
    return { targetLookupAdapter: {}, pollingAdapter: paidHeartbeatPollingAdapter };
  },
  resolveLiveChatTarget: async () => {
    expiredHeartbeatEvents.push("target");
    return commandTarget;
  },
  readPhaseResolution: () => ({ status: "ready", projection: { activePhase: "running", ratePauseReason: null, retryAfterSeconds: null, automaticResumeExpected: false } })
});
assert.equal(expiredHeartbeatState.status, "stopped", "an exact expired Paid heartbeat is durably stopped instead of failing as unreadable");
assert.equal(expiredHeartbeatState.stopReason, "session-time-limit", "expired Paid heartbeat uses the sanitized session limit reason");
assert.equal(expiredHeartbeatPersistedState?.stopReason, "session-time-limit", "the expired Paid stop is persisted through the existing durable path");
assert.deepEqual(expiredHeartbeatEvents.slice(0, 2), ["touch", "persist:stopped"], "expired Paid heartbeat persists the stop immediately after the trusted touch result");
assert.equal(expiredHeartbeatEvents.includes("provider-runtime"), false, "expired Paid heartbeat does not construct Provider runtime");
assert.equal(expiredHeartbeatEvents.includes("target"), false, "expired Paid heartbeat does not resolve a target");

const staleHeartbeatEvents = [];
let staleHeartbeatPersistedState = null;
const staleHeartbeatState = await sessionExecution.executeCommentTranslatorSessionCommand({
  ...paidHeartbeatInput,
  durableSessionStore: {
    status: "ready",
    store: {
      touchActivePaidSessionHeartbeat: async () => {
        staleHeartbeatEvents.push("touch");
        return { status: "missing-heartbeat" };
      },
      persistSessionState: async ({ state }) => {
        staleHeartbeatEvents.push(`persist:${state.status}`);
        staleHeartbeatPersistedState = state;
      }
    },
    missingEnvReferences: [],
    failClosed: false
  },
  durableUsageCounterStore: {
    status: "ready",
    store: { persistUsageEvent: async () => staleHeartbeatEvents.push("ledger") },
    missingEnvReferences: [],
    failClosed: false
  }
}, {
  createLiveProviderRuntime: () => {
    staleHeartbeatEvents.push("provider-runtime");
    return { targetLookupAdapter: {}, pollingAdapter: paidHeartbeatPollingAdapter };
  },
  resolveLiveChatTarget: async () => {
    staleHeartbeatEvents.push("target");
    return commandTarget;
  },
  readPhaseResolution: () => ({ status: "ready", projection: { activePhase: "running", ratePauseReason: null, retryAfterSeconds: null, automaticResumeExpected: false } })
});
assert.equal(staleHeartbeatState.status, "stopped", "DB-confirmed stale heartbeat returns a stopped state");
assert.equal(staleHeartbeatState.stopReason, "missing-heartbeat", "DB-confirmed stale heartbeat keeps its distinct sanitized reason");
assert.equal(staleHeartbeatPersistedState?.stopReason, "missing-heartbeat", "missing-heartbeat stop is durably persisted");
assert.deepEqual(staleHeartbeatEvents, ["touch", "persist:stopped"], "missing-heartbeat persists its stop without Provider, target, or ledger work");

const missingHeartbeatTouchEvents = [];
const missingHeartbeatTouchState = await sessionExecution.executeCommentTranslatorSessionCommand({
  ...paidHeartbeatInput,
  durableSessionStore: {
    status: "ready",
    store: { persistSessionState: async () => missingHeartbeatTouchEvents.push("persist") },
    missingEnvReferences: [],
    failClosed: false
  },
  durableUsageCounterStore: {
    status: "ready",
    store: { persistUsageEvent: async () => missingHeartbeatTouchEvents.push("ledger") },
    missingEnvReferences: [],
    failClosed: false
  }
}, {
  createLiveProviderRuntime: () => {
    missingHeartbeatTouchEvents.push("provider-runtime");
    return { targetLookupAdapter: {}, pollingAdapter: paidHeartbeatPollingAdapter };
  },
  resolveLiveChatTarget: async () => {
    missingHeartbeatTouchEvents.push("target");
    return commandTarget;
  },
  readPhaseResolution: () => ({ status: "ready", projection: { activePhase: "running", ratePauseReason: null, retryAfterSeconds: null, automaticResumeExpected: false } })
});
assert.equal(missingHeartbeatTouchState.status, "fail-closed", "missing Paid heartbeat touch fails closed");
assert.equal(missingHeartbeatTouchState.stopReason, "paid-authority-unreadable", "missing Paid heartbeat touch returns a sanitized authority stop");
assert.deepEqual(missingHeartbeatTouchEvents, [], "missing Paid heartbeat touch fails before persist, target, Provider, or ledger work");

const failedHeartbeatTouchEvents = [];
const failedHeartbeatTouchState = await sessionExecution.executeCommentTranslatorSessionCommand({
  ...paidHeartbeatInput,
  durableSessionStore: {
    status: "ready",
    store: {
      touchActivePaidSessionHeartbeat: async () => {
        failedHeartbeatTouchEvents.push("touch");
        throw new Error("private heartbeat touch failure");
      },
      persistSessionState: async () => failedHeartbeatTouchEvents.push("persist")
    },
    missingEnvReferences: [],
    failClosed: false
  }
}, {
  createLiveProviderRuntime: () => {
    failedHeartbeatTouchEvents.push("provider-runtime");
    return { targetLookupAdapter: {}, pollingAdapter: paidHeartbeatPollingAdapter };
  },
  resolveLiveChatTarget: async () => {
    failedHeartbeatTouchEvents.push("target");
    return commandTarget;
  },
  readPhaseResolution: () => ({ status: "ready", projection: { activePhase: "running", ratePauseReason: null, retryAfterSeconds: null, automaticResumeExpected: false } })
});
assert.equal(failedHeartbeatTouchState.status, "fail-closed", "failed Paid heartbeat touch fails closed");
assert.equal(failedHeartbeatTouchState.stopReason, "paid-authority-unreadable", "failed Paid heartbeat touch returns only the sanitized authority stop");
assert.deepEqual(failedHeartbeatTouchEvents, ["touch"], "failed Paid heartbeat touch stops before persist, target, Provider, or ledger work");
assert.doesNotMatch(JSON.stringify(failedHeartbeatTouchState), /private|fixture-owner|credential|sessionReferenceId|raw provider payload/i);

const missingAtomicSeamEvents = [];
const missingAtomicSeamState = await sessionExecution.executeCommentTranslatorSessionCommand({
  intent: "start",
  nowMs: Date.parse("2026-08-14T10:00:00.000Z"),
  plan: "paid",
  callerAuthorization: { status: "authorized", ownerUserId: "fixture-owner" },
  credentialReferenceId: "fixture-credential",
  credentialReadiness: {
    status: "ready",
    provider: "youtube",
    credentialReferenceId: "fixture-credential",
    translatorStartAllowed: true,
    reconnectGuidance: "none"
  },
  activeSession: null,
  usage: paidBaseline.usage,
  durableSessionStore: {
    status: "ready",
    store: { persistSessionState: async () => missingAtomicSeamEvents.push("persist") },
    missingEnvReferences: [],
    failClosed: false
  },
  durableUsageCounterStore: {
    status: "ready",
    store: { persistUsageEvent: async () => missingAtomicSeamEvents.push("ledger") },
    missingEnvReferences: [],
    failClosed: false
  },
  browserConnected: true,
  targetLanguage: "ja",
  paidSessionAuthority: commandAuthority
}, {
  createLiveProviderRuntime: () => {
    missingAtomicSeamEvents.push("provider-runtime");
    return { targetLookupAdapter: {}, pollingAdapter: {} };
  },
  resolveLiveChatTarget: async () => {
    missingAtomicSeamEvents.push("target");
    return commandTarget;
  },
  readPhaseResolution: () => ({
    status: "ready",
    projection: {
      activePhase: "running",
      ratePauseReason: null,
      retryAfterSeconds: null,
      automaticResumeExpected: false
    }
  })
});
assert.equal(missingAtomicSeamState.status, "fail-closed", "Paid start fails closed when an existing store lacks the optional atomic seam");
assert.deepEqual(missingAtomicSeamEvents, [], "missing atomic seam cannot persist, reserve, resolve a target, call a Provider, or write usage");

async function runActivePaidStopWriteFailureFixture({ fixtureName, usage, paidSessionAuthority, expectedStopReason }) {
  const events = [];
  const result = await sessionExecution.executeCommentTranslatorSessionCommand({
    intent: "heartbeat",
    nowMs: Date.parse("2026-08-14T10:00:00.000Z"),
    plan: "paid",
    callerAuthorization: { status: "authorized", ownerUserId: "fixture-owner" },
    credentialReferenceId: "fixture-credential",
    credentialReadiness: {
      status: "ready",
      provider: "youtube",
      credentialReferenceId: "fixture-credential",
      translatorStartAllowed: true,
      reconnectGuidance: "none"
    },
    activeSession: {
      sessionReferenceId: `cts_${fixtureName}`,
      startedAtMs: Date.parse("2026-08-14T09:00:00.000Z"),
      lastHeartbeatAtMs: Date.parse("2026-08-14T09:59:45.000Z"),
      plan: "paid"
    },
    usage,
    durableSessionStore: {
      status: "ready",
      store: {
        touchActivePaidSessionHeartbeat: async () => {
          events.push("touch");
          return { status: "touched", heartbeatAtIso: "2026-08-14T10:00:00.000Z" };
        },
        persistSessionState: async ({ state }) => {
          events.push(`persist:${state.status}`);
          throw new Error(`private ${fixtureName} stop-write fixture`);
        }
      },
      missingEnvReferences: [],
      failClosed: false
    },
    durableUsageCounterStore: {
      status: "ready",
      store: { persistUsageEvent: async () => events.push("ledger") },
      missingEnvReferences: [],
      failClosed: false
    },
    browserConnected: true,
    targetLanguage: "ja",
    paidSessionAuthority
  }, {
    createLiveProviderRuntime: () => ({ targetLookupAdapter: {}, pollingAdapter: {} }),
    resolveLiveChatTarget: async () => {
      events.push("target");
      throw new Error("stopping Paid fixture must not resolve a target");
    },
    readPhaseResolution: () => ({
      status: "ready",
      projection: {
        activePhase: "running",
        ratePauseReason: null,
        retryAfterSeconds: null,
        automaticResumeExpected: false
      }
    })
  });
  assert.equal(result.status, "fail-closed", `${fixtureName} stop-write failure fails closed`);
  assert.equal(result.stopReason, expectedStopReason, `${fixtureName} keeps the sanitized stop reason`);
  assert.equal(result.durableStop, "unconfirmed", `${fixtureName} does not claim a durable stop`);
  assert.equal(autoPollingDisposition.resolveCommentTranslatorAutoPollingDisposition(result), "halted");
  assert.deepEqual(events, ["touch", "persist:stopped"], `${fixtureName} touches DB time, then halts before ledger, target, or Provider work`);
  assert.doesNotMatch(JSON.stringify(result), /private|fixture-owner|credential|sessionReferenceId|raw provider payload/i);
}

await runActivePaidStopWriteFailureFixture({
  fixtureName: "paid-character-quota",
  usage: {
    ...paidBaseline.usage,
    paidBillingPeriodInputCharacters: paidBaseline.usage.paidBillingPeriodCharacterLimit
  },
  paidSessionAuthority: commandAuthority,
  expectedStopReason: "paid-character-quota-stop"
});
await runActivePaidStopWriteFailureFixture({
  fixtureName: "paid-cost",
  usage: { ...paidBaseline.usage, paidIndividualCostAvailable: false },
  paidSessionAuthority: commandAuthority,
  expectedStopReason: "paid-individual-cost-stop"
});
await runActivePaidStopWriteFailureFixture({
  fixtureName: "paid-provider",
  usage: { ...paidBaseline.usage, providerBudgetAvailable: false },
  paidSessionAuthority: commandAuthority,
  expectedStopReason: "provider-quota-stop"
});
await runActivePaidStopWriteFailureFixture({
  fixtureName: "paid-infra",
  usage: { ...paidBaseline.usage, globalBudgetAvailable: false },
  paidSessionAuthority: commandAuthority,
  expectedStopReason: "global-budget-stop"
});
await runActivePaidStopWriteFailureFixture({
  fixtureName: "95-percent-poll-budget",
  usage: paidBaseline.usage,
  paidSessionAuthority: {
    ...commandAuthority,
    providerRuntime: {
      ...commandAuthority.providerRuntime,
      usageStore: {
        ...commandAuthority.providerRuntime.usageStore,
        reservePollBudget: async () => 720,
        readPollBudget: async () => ({
          utcDay: "2026-08-14",
          dailyBudget: 90_000,
          reservedPolls: 85_500,
          sessionReservedPolls: 720,
          sessionReservationPresent: true,
          nextResetAtIso: "2026-08-15T00:00:00.000Z"
        })
      }
    }
  },
  expectedStopReason: "global-budget-stop"
});

const losingStartEvents = [];
const losingPaidStartState = await sessionExecution.executeCommentTranslatorSessionCommand({
  intent: "start",
  nowMs: Date.parse("2026-08-14T10:00:00.000Z"),
  plan: "paid",
  callerAuthorization: { status: "authorized", ownerUserId: "fixture-owner" },
  credentialReferenceId: "fixture-credential",
  credentialReadiness: {
    status: "ready",
    provider: "youtube",
    credentialReferenceId: "fixture-credential",
    translatorStartAllowed: true,
    reconnectGuidance: "none"
  },
  activeSession: null,
  usage: paidBaseline.usage,
  durableSessionStore: {
    status: "ready",
    store: {
      startPaidSessionAndReservePollBudget: async () => {
        losingStartEvents.push("atomic-start-and-reserve");
        throw new Error("fixture unique active-session conflict");
      },
      persistSessionState: async ({ state }) => {
        losingStartEvents.push(`persist:${state.status}`);
        throw new Error("fixture unique active-session conflict");
      }
    },
    missingEnvReferences: [],
    failClosed: false
  },
  durableUsageCounterStore: {
    status: "ready",
    store: { persistUsageEvent: async () => losingStartEvents.push("ledger") },
    missingEnvReferences: [],
    failClosed: false
  },
  browserConnected: true,
  targetLanguage: "ja",
  paidSessionAuthority: {
    ...commandAuthority,
    providerRuntime: {
      ...commandAuthority.providerRuntime,
      usageStore: {
        ...commandAuthority.providerRuntime.usageStore,
        reservePollBudget: async () => {
          losingStartEvents.push("reserve");
          throw new Error("losing start must not reserve");
        }
      }
    }
  }
}, {
  createLiveProviderRuntime: () => {
    losingStartEvents.push("provider-runtime");
    return { targetLookupAdapter: {}, pollingAdapter: {} };
  },
  resolveLiveChatTarget: async () => {
    losingStartEvents.push("target");
    throw new Error("losing start must not resolve a Provider target");
  },
  readPhaseResolution: () => ({
    status: "ready",
    projection: {
      activePhase: "running",
      ratePauseReason: null,
      retryAfterSeconds: null,
      automaticResumeExpected: false
    }
  })
});
assert.equal(losingPaidStartState.status, "fail-closed", "the losing concurrent Paid start fails closed without claiming a durable stop");
assert.equal(losingPaidStartState.durableStop, "unconfirmed");
assert.deepEqual(
  losingStartEvents,
  ["atomic-start-and-reserve"],
  "a losing concurrent Paid start cannot reserve 720 polls, resolve a target, call a Provider, or write usage"
);

const reservationFailureEvents = [];
const reservationFailureState = await sessionExecution.executeCommentTranslatorSessionCommand({
  intent: "start",
  nowMs: Date.parse("2026-08-14T10:00:00.000Z"),
  plan: "paid",
  callerAuthorization: { status: "authorized", ownerUserId: "fixture-owner" },
  credentialReferenceId: "fixture-credential",
  credentialReadiness: {
    status: "ready",
    provider: "youtube",
    credentialReferenceId: "fixture-credential",
    translatorStartAllowed: true,
    reconnectGuidance: "none"
  },
  activeSession: null,
  usage: paidBaseline.usage,
  durableSessionStore: {
    status: "ready",
    store: {
      startPaidSessionAndReservePollBudget: async () => {
        reservationFailureEvents.push("atomic-start-and-reserve:rolled-back");
        throw new Error("fixture atomic start and reservation rollback");
      },
      persistSessionState: async ({ state }) => {
        reservationFailureEvents.push(`persist:${state.status}`);
        if (state.status === "stopped") throw new Error("fixture start-reservation stop persistence failure");
      }
    },
    missingEnvReferences: [],
    failClosed: false
  },
  durableUsageCounterStore: {
    status: "ready",
    store: { persistUsageEvent: async () => reservationFailureEvents.push("ledger") },
    missingEnvReferences: [],
    failClosed: false
  },
  browserConnected: true,
  targetLanguage: "ja",
  paidSessionAuthority: {
    ...commandAuthority,
    providerRuntime: {
      ...commandAuthority.providerRuntime,
      usageStore: {
        ...commandAuthority.providerRuntime.usageStore,
        reservePollBudget: async () => {
          reservationFailureEvents.push("reserve");
          throw new Error("fixture poll reservation failure");
        }
      }
    }
  }
}, {
  createLiveProviderRuntime: () => {
    reservationFailureEvents.push("provider-runtime");
    return { targetLookupAdapter: {}, pollingAdapter: {} };
  },
  resolveLiveChatTarget: async () => {
    reservationFailureEvents.push("target");
    throw new Error("reservation failure must stop before target lookup");
  },
  readPhaseResolution: () => ({
    status: "ready",
    projection: {
      activePhase: "running",
      ratePauseReason: null,
      retryAfterSeconds: null,
      automaticResumeExpected: false
    }
  })
});
assert.equal(reservationFailureState.status, "fail-closed", "Paid reservation stop-write failure fails closed");
assert.equal(reservationFailureState.stopReason, "global-budget-stop");
assert.equal(reservationFailureState.durableStop, "unconfirmed", "Paid reservation failure does not claim a durable stop");
assert.equal(autoPollingDisposition.resolveCommentTranslatorAutoPollingDisposition(reservationFailureState), "halted");
assert.deepEqual(
  reservationFailureEvents,
  ["atomic-start-and-reserve:rolled-back"],
  "Paid atomic-start failure leaves no active session to stop and performs no target, Provider, or ledger work"
);
assert.equal(reservationFailureEvents.includes("target"), false, "Paid reservation failure never reaches target or Provider setup");

const targetFailureEvents = [];
const targetFailureState = await sessionExecution.executeCommentTranslatorSessionCommand({
  intent: "start",
  nowMs: Date.parse("2026-08-14T10:00:00.000Z"),
  plan: "paid",
  callerAuthorization: { status: "authorized", ownerUserId: "fixture-owner" },
  credentialReferenceId: "fixture-credential",
  credentialReadiness: {
    status: "ready",
    provider: "youtube",
    credentialReferenceId: "fixture-credential",
    translatorStartAllowed: true,
    reconnectGuidance: "none"
  },
  activeSession: null,
  usage: paidBaseline.usage,
  durableSessionStore: {
    status: "ready",
    store: {
      startPaidSessionAndReservePollBudget: async () => {
        targetFailureEvents.push("atomic-start-and-reserve");
        return 720;
      },
      persistSessionState: async ({ state }) => targetFailureEvents.push(`persist:${state.status}`)
    },
    missingEnvReferences: [],
    failClosed: false
  },
  durableUsageCounterStore: {
    status: "ready",
    store: { persistUsageEvent: async () => targetFailureEvents.push("ledger") },
    missingEnvReferences: [],
    failClosed: false
  },
  browserConnected: true,
  targetLanguage: "ja",
  paidSessionAuthority: {
    ...commandAuthority,
    providerRuntime: {
      ...commandAuthority.providerRuntime,
      usageStore: {
        ...commandAuthority.providerRuntime.usageStore,
        reservePollBudget: async () => {
          targetFailureEvents.push("reserve");
          return 720;
        },
        readPollBudget: async () => {
          targetFailureEvents.push("read");
          return {
            utcDay: "2026-08-14",
            dailyBudget: 90_000,
            reservedPolls: 720,
            sessionReservedPolls: 720,
            sessionReservationPresent: true,
            nextResetAtIso: "2026-08-15T00:00:00.000Z"
          };
        }
      }
    }
  }
}, {
  createLiveProviderRuntime: () => {
    targetFailureEvents.push("provider-runtime");
    return { targetLookupAdapter: {}, pollingAdapter: {} };
  },
  resolveLiveChatTarget: async () => {
    targetFailureEvents.push("target");
    throw new Error("fixture target setup failure");
  },
  readPhaseResolution: () => ({
    status: "ready",
    projection: {
      activePhase: "running",
      ratePauseReason: null,
      retryAfterSeconds: null,
      automaticResumeExpected: false
    }
  })
});
assert.equal(targetFailureState.status, "stopped", "Paid target setup failure returns a stopped state");
assert.deepEqual(
  targetFailureEvents.slice(0, 5),
  ["atomic-start-and-reserve", "read", "provider-runtime", "target", "persist:stopped"],
  "Paid target setup failure durably stops the claimed session"
);

const exhaustedPaidBaseline = entitlement.resolveCommentTranslatorPublicEntitlementBaseline({
  durableUsageRead: { status: "ready", snapshot: baseUsage, authority: "durable-store" },
  paidAuthority: {
    ...paidAuthority,
    costAuthority: { ...paidAuthority.costAuthority, billingPeriodInputCharacters: 500_000 }
  }
});
assert.equal(exhaustedPaidBaseline.status, "ready");
assert.equal(exhaustedPaidBaseline.plan, "paid");
assert.equal(
  sessionPolicy.assessCommentTranslatorUsageStopReason(exhaustedPaidBaseline.usage, "paid"),
  "paid-character-quota-stop",
  "Paid character exhaustion stops Paid instead of falling back to Free"
);

const unavailableAuthorityBaseline = entitlement.resolveCommentTranslatorPublicEntitlementBaseline({
  durableUsageRead: { status: "ready", snapshot: baseUsage, authority: "durable-store" },
  paidAuthority: { status: "fail-closed", reason: "cost-authority-unreadable" }
});
assert.equal(unavailableAuthorityBaseline.status, "fail-closed");
assert.equal(unavailableAuthorityBaseline.publicLaunchAllowed, false);

const serializedPaidOutput = JSON.stringify(paidBaseline);
for (const forbidden of [
  "fixture-owner",
  "fixture-customer",
  "fixture-subscription",
  "liveChatId",
  "oauthAccessToken",
  "serviceRoleKey",
  "rawProviderPayload",
  "rawCommentText"
]) {
  assert.doesNotMatch(serializedPaidOutput, new RegExp(forbidden, "i"), `Paid browser-safe baseline omits ${forbidden}`);
}

const pollGate = entitlement.resolveCommentTranslatorPaidPollBudgetGate;
assert.equal(typeof pollGate, "function", "poll budget gate is deterministic and fixture-testable");
assert.equal(
  pollGate({ dailyBudget: 90_000, reservedPolls: 80_000, isNewSession: false, nowMs: Date.parse("2026-08-14T10:00:00.000Z") }).status,
  "allowed",
  "80 percent does not stop an active poll"
);
assert.equal(
  pollGate({ dailyBudget: 90_000, reservedPolls: 85_500, isNewSession: false, nowMs: Date.parse("2026-08-14T10:00:00.000Z") }).status,
  "stop-active-auto-poll",
  "95 percent stops active auto-poll"
);
assert.equal(
  pollGate({ dailyBudget: 90_000, reservedPolls: 81_000, isNewSession: true, nowMs: Date.parse("2026-08-14T10:00:00.000Z") }).status,
  "stop-new-session",
  "90 percent stops new Paid sessions"
);
assert.match(
  pollGate({ dailyBudget: 90_000, reservedPolls: 85_500, isNewSession: false, nowMs: Date.parse("2026-08-14T10:00:00.000Z") }).nextResetAtIso,
  /^2026-08-15T00:00:00\.000Z$/,
  "active auto-poll stop returns the UTC reset"
);

assert.equal(
  entitlement.resolveCommentTranslatorPaidMessageRateGate({ usedMessages: 59, candidateMessages: 1, nowMs: Date.parse("2026-08-14T10:00:00.000Z") }).status,
  "allowed",
  "Paid message-rate gate admits the final message in a minute"
);
assert.equal(
  entitlement.resolveCommentTranslatorPaidMessageRateGate({ usedMessages: 59, candidateMessages: 2, nowMs: Date.parse("2026-08-14T10:00:00.000Z") }).status,
  "rate-limit-paused",
  "Paid message-rate gate refuses an atomic over-cap batch"
);
assert.equal(
  entitlement.resolveCommentTranslatorPaidMessageRateGate({ usedMessages: 60, candidateMessages: 1, nowMs: Date.parse("2026-08-14T10:00:00.000Z") }).status,
  "rate-limit-paused",
  "Paid message-rate gate pauses at the durable 60-message cap"
);

assert.match(sources.commandExecution, /resolveCommentTranslatorPaidStopNextResetAtIso/, "session-command preflight propagates the same Paid reset authority");

const messageRateFixtureRequest = {
  comments: [{
    commentId: "comment-fixture-1",
    publishedAt: "2026-08-14T10:00:00.000Z",
    text: "hello world",
    platformLanguageHint: "en"
  }],
  targetLanguage: "ja",
  sourceLanguages: ["EN"],
  callerAuthorization: { status: "authorized", ownerUserId: "fixture-owner" },
  ownerUserId: "fixture-owner",
  sessionReferenceId: "cts_fixture",
  occurredAtMs: Date.parse("2026-08-14T10:00:00.000Z"),
  periodStartIso: "2026-08-01T00:00:00.000Z",
  periodEndIso: "2026-09-01T00:00:00.000Z",
  utcMonth: "2026-08-01",
  serverSecret: "fixture-server-secret",
  attemptKeyVersion: "fixture-v1",
  circuitAuthority: { read: async (provider) => ({ provider, state: "closed" }) },
  killSwitches: {
    checkout_enabled: true,
    paid_translation_enabled: true,
    openai_enabled: true,
    azure_fallback_enabled: true
  },
  enforceMessageRate: true
};

const topLevelDuplicateEvents = [];
const topLevelDuplicateResult = await paidProviderRuntime.executeCommentTranslatorPaidProviderBatch({
  ...messageRateFixtureRequest,
  duplicateSessionBatch: true,
  usageStore: {
    reserveMessageRate: async () => {
      topLevelDuplicateEvents.push("reserve");
      throw new Error("top-level duplicate must not reserve");
    },
    finalizeMessageRate: async () => {
      topLevelDuplicateEvents.push("finalize");
      throw new Error("top-level duplicate must not finalize");
    }
  },
  openAi: {
    apiKey: "fixture-provider-key",
    executeBatch: async () => {
      topLevelDuplicateEvents.push("provider");
      throw new Error("top-level duplicate must not call Provider");
    }
  }
});
assert.equal(topLevelDuplicateResult.paidProviderStopReason, "duplicate-session-batch", "top-level duplicate behavior remains a stop");
assert.deepEqual(topLevelDuplicateEvents, [], "top-level duplicate stops before reservation, finalize, or Provider");

const missingRecordSuccessEvents = [];
let missingRecordSuccessProviderCalls = 0;
const missingRecordSuccessResult = await paidProviderRuntime.executeCommentTranslatorPaidProviderBatch({
  ...messageRateFixtureRequest,
  usageStore: {
    reserveMessageRate: async () => {
      missingRecordSuccessEvents.push("reserve");
      throw new Error("missing record-success authority must fail before reserve");
    },
    finalizeMessageRate: async () => {
      missingRecordSuccessEvents.push("finalize");
      throw new Error("missing record-success authority must fail before finalize");
    }
  },
  openAi: {
    apiKey: "fixture-provider-key",
    executeBatch: async () => {
      missingRecordSuccessProviderCalls += 1;
      throw new Error("missing record-success authority must fail before Provider");
    }
  }
});
assert.equal(missingRecordSuccessResult.paidProviderStopReason, "authority-unreadable");
assert.deepEqual(missingRecordSuccessEvents, [], "missing record-success authority fails before reserve or finalize");
assert.equal(missingRecordSuccessProviderCalls, 0, "missing record-success authority fails before Provider execution");

const rateLimitEvents = [];
let rateLimitedProviderCalls = 0;
const rateLimitedResult = await paidProviderRuntime.executeCommentTranslatorPaidProviderBatch({
  ...messageRateFixtureRequest,
  usageStore: {
    reserveMessageRate: async () => {
      rateLimitEvents.push("reserve");
      return {
        reservationStatus: "rate-limited",
        minuteStartIso: "2026-08-14T10:00:00.000Z",
        reservedMessages: 0,
        committedMessages: 0,
        capacityRemaining: 0
      };
    },
    recordMessageRateSuccess: async () => {
      throw new Error("rate-limited fixture must not record success");
    },
    finalizeMessageRate: async () => {
      rateLimitEvents.push("finalize");
      throw new Error("rate-limited fixture must not finalize");
    }
  },
  openAi: {
    apiKey: "fixture-provider-key",
    executeBatch: async () => {
      rateLimitedProviderCalls += 1;
      throw new Error("Provider must not be called after a rate stop");
    }
  }
});
assert.equal(rateLimitedResult.paidProviderStopReason, "paid-message-rate-stop", "durable rate refusal stops the Paid batch");
assert.deepEqual(rateLimitEvents, ["reserve"], "rate refusal does not finalize or call Provider");
assert.equal(rateLimitedProviderCalls, 0, "durable rate refusal prevents Provider execution");

const crossMinuteReservationKeys = [];
const crossMinuteReservationEvents = [];
const crossMinuteReservationUsageStore = {
  reserveMessageRate: async ({ reservationKey }) => {
    crossMinuteReservationKeys.push(reservationKey);
    crossMinuteReservationEvents.push("reserve");
    return {
      reservationStatus: "rate-limited",
      minuteStartIso: "2026-08-14T10:00:00.000Z",
      reservedMessages: 0,
      committedMessages: 0,
      capacityRemaining: 0
    };
  },
  recordMessageRateSuccess: async () => {
    throw new Error("cross-minute rate refusal must not record success");
  },
  finalizeMessageRate: async () => {
    crossMinuteReservationEvents.push("finalize");
    throw new Error("cross-minute rate refusal must not finalize");
  }
};
for (const occurredAtMs of [
  Date.parse("2026-08-14T10:00:59.000Z"),
  Date.parse("2026-08-14T10:01:01.000Z")
]) {
  const crossMinuteResult = await paidProviderRuntime.executeCommentTranslatorPaidProviderBatch({
    ...messageRateFixtureRequest,
    occurredAtMs,
    usageStore: crossMinuteReservationUsageStore,
    openAi: {
      apiKey: "fixture-provider-key",
      executeBatch: async () => {
        throw new Error("cross-minute rate refusal must stop before Provider execution");
      }
    }
  });
  assert.equal(crossMinuteResult.paidProviderStopReason, "paid-message-rate-stop");
}
assert.equal(crossMinuteReservationKeys.length, 2, "cross-minute fixture performs two authority reservations");
assert.equal(
  crossMinuteReservationKeys[0],
  crossMinuteReservationKeys[1],
  "the same logical Paid batch keeps one reservation identity across a Worker minute boundary"
);
assert.deepEqual(crossMinuteReservationEvents, ["reserve", "reserve"], "cross-minute rate refusal never finalizes or calls Provider");

let committedReplayProviderCalls = 0;
const committedReplayEvents = [];
const committedReplayResult = await paidProviderRuntime.executeCommentTranslatorPaidProviderBatch({
  ...messageRateFixtureRequest,
  usageStore: {
    reserveMessageRate: async () => {
      committedReplayEvents.push("reserve");
      return {
        reservationStatus: "committed",
        minuteStartIso: "2026-08-14T10:00:00.000Z",
         reservedMessages: 1,
         committedMessages: 1,
         successfulMessageCount: 1,
         capacityRemaining: 59
      };
    },
    recordMessageRateSuccess: async () => {
      throw new Error("committed replay must not record success");
    },
    finalizeMessageRate: async () => {
      committedReplayEvents.push("finalize");
      throw new Error("committed replay must not finalize");
    }
  },
  openAi: {
    apiKey: "fixture-provider-key",
    executeBatch: async () => {
      committedReplayProviderCalls += 1;
      throw new Error("committed replay must not call Provider");
    }
  }
});
assert.equal(committedReplayResult.status, "completed", "settled message reservation replay is a completed no-op");
assert.equal(committedReplayResult.paidProviderStopReason, undefined, "settled message reservation replay has no stop reason");
for (const field of [
  "providerRequestCount",
  "providerCallCount",
  "translatedCount",
  "skippedCount",
  "cacheHitCount",
  "cacheMissCount",
  "retryCount",
  "estimatedCostMicros"
]) {
  assert.equal(committedReplayResult[field], 0, `settled replay keeps ${field} at zero`);
}
assert.deepEqual(committedReplayResult.skipsByReason, { languagePolicy: 0, perMinuteCap: 0, providerUnavailable: 0 });
assert.deepEqual(committedReplayResult.errorCounts, { recoverable: 0, terminal: 0 });
assert.deepEqual(committedReplayResult.usageRecorded, { providerRequestEstimate: false, aiUsageEstimate: false });
assert.deepEqual(committedReplayResult.batches, []);
assert.deepEqual(committedReplayResult.translations, []);
assert.equal(committedReplayResult.paidCommittedReplaySuccessfulCount, 1, "settled message reservation replay preserves its durable successful count internally");
assert.deepEqual(committedReplayEvents, ["reserve"], "settled replay does not finalize again");
assert.equal(committedReplayProviderCalls, 0, "settled replay prevents a second Provider call");
assert.equal(
  await paidProviderRuntime.settleCommentTranslatorPaidMessageRateExecution(committedReplayResult, 0),
  "no-reservation",
  "committed replay exposes no settlement work"
);
assert.deepEqual(committedReplayEvents, ["reserve"], "committed replay still does not finalize after settlement handoff");

const finalizationEvents = [];
const finalizationResult = await paidProviderRuntime.executeCommentTranslatorPaidProviderBatch({
  ...messageRateFixtureRequest,
  usageStore: {
    reserveMessageRate: async ({ sessionReferenceId }) => {
      assert.equal(sessionReferenceId, messageRateFixtureRequest.sessionReferenceId, "reserve fixture receives the requested session binding");
      finalizationEvents.push("reserve");
      return {
        reservationStatus: "reserved",
        minuteStartIso: "2026-08-14T10:00:00.000Z",
        reservedMessages: 1,
        committedMessages: 0,
        capacityRemaining: 59
      };
    },
    recordMessageRateSuccess: async ({ successfulMessageCount }) => successfulMessageCount,
    finalizeMessageRate: async ({ sessionReferenceId, translatedMessageCount }) => {
      assert.equal(sessionReferenceId, messageRateFixtureRequest.sessionReferenceId, "finalize fixture receives the requested session binding");
      finalizationEvents.push(`finalize:${translatedMessageCount}`);
      return {
        reservationStatus: "released",
        minuteStartIso: "2026-08-14T10:00:00.000Z",
        reservedMessages: 1,
        committedMessages: translatedMessageCount,
        releasedMessages: 1 - translatedMessageCount
      };
    }
  },
  openAi: { apiKey: null }
});
assert.equal(finalizationResult.paidProviderStopReason, "configuration-unreadable", "message-rate reservation still fails closed before missing Provider configuration");
assert.deepEqual(finalizationEvents, ["reserve"], "reserved message capacity remains held until the caller confirms feed persistence");
assert.equal(
  Object.keys(finalizationResult).some((key) => /settlement|reservation/i.test(key)),
  false,
  "settlement state is not browser-enumerable"
);
assert.doesNotMatch(JSON.stringify(finalizationResult), /reservation|settlement|fixture-owner/i, "settlement state and private authority are absent from browser-safe serialization");
assert.equal(
  await paidProviderRuntime.settleCommentTranslatorPaidMessageRateExecution(finalizationResult, 0),
  "settled",
  "reserved stop outcome can release held message capacity"
);
assert.equal(
  await paidProviderRuntime.settleCommentTranslatorPaidMessageRateExecution(finalizationResult, 0),
  "already-settled",
  "reserved message settlement is idempotent in-process"
);
assert.deepEqual(finalizationEvents, ["reserve", "finalize:0"], "reserved message capacity settles exactly once");

const finalizeFailureReplayState = {
  successfulMessageCount: 0,
  reservationState: "reserved",
  providerReceipt: null
};
const finalizeFailureReplayEvents = [];
let finalizeFailureReplayProviderCalls = 0;
function createFinalizeFailureReplayUsageStore({ failFinalize }) {
  return {
    async reserveMessageRate() {
      finalizeFailureReplayEvents.push(`reserve:${finalizeFailureReplayState.reservationState}:${finalizeFailureReplayState.successfulMessageCount}`);
      return {
        reservationStatus: finalizeFailureReplayState.reservationState,
        minuteStartIso: "2026-08-14T10:00:00.000Z",
        reservedMessages: 1,
        committedMessages: finalizeFailureReplayState.reservationState === "committed" ? finalizeFailureReplayState.successfulMessageCount : 0,
        successfulMessageCount: finalizeFailureReplayState.successfulMessageCount,
        capacityRemaining: 59
      };
    },
    async recordMessageRateSuccess({ sessionReferenceId, successfulMessageCount }) {
      assert.equal(sessionReferenceId, messageRateFixtureRequest.sessionReferenceId, "record-success fixture receives the requested session binding");
      finalizeFailureReplayEvents.push(`record-success:${successfulMessageCount}`);
      finalizeFailureReplayState.successfulMessageCount = Math.max(
        finalizeFailureReplayState.successfulMessageCount,
        successfulMessageCount
      );
      return finalizeFailureReplayState.successfulMessageCount;
    },
    async finalizeMessageRate({ sessionReferenceId, translatedMessageCount }) {
      assert.equal(sessionReferenceId, messageRateFixtureRequest.sessionReferenceId, "replay finalize fixture receives the requested session binding");
      finalizeFailureReplayEvents.push(`finalize:${translatedMessageCount}${failFinalize ? ":failed" : ""}`);
      if (failFinalize) throw new Error("fixture finalize failure");
      const committedMessageCount = Math.max(
        translatedMessageCount,
        finalizeFailureReplayState.successfulMessageCount
      );
      finalizeFailureReplayState.reservationState = committedMessageCount > 0 ? "committed" : "released";
      return {
        reservationStatus: finalizeFailureReplayState.reservationState,
        minuteStartIso: "2026-08-14T10:00:00.000Z",
        reservedMessages: 1,
        committedMessages: committedMessageCount,
        releasedMessages: 1 - committedMessageCount
      };
    },
    async openaiAttempt() {
      return finalizeFailureReplayState.providerReceipt
        ? { reservationStatus: "committed", sessionLeaseToken: null, openAiSlotToken: null }
        : { reservationStatus: "reserved", sessionLeaseToken: "fixture-lease", openAiSlotToken: "fixture-slot" };
    },
    async claimProviderDispatch() {
      finalizeFailureReplayEvents.push("provider-claim");
      return "claimed";
    },
    async finalizeOpenAiAttempt(request) {
      finalizeFailureReplayState.providerReceipt = {
        attemptState: "committed",
        providerFailureClass: request.providerFailureClass,
        successfulItemAttemptIds: [...request.successfulItemAttemptIds],
        successfulInputCharacters: request.successfulInputCharacters,
        fallbackEligible: request.fallbackEligible,
        circuitFailureState: request.circuitFailureState,
        circuitSuccessState: request.circuitSuccessState,
        providerKind: "openai_attempt"
      };
      return true;
    },
    async readOpenAiAttempt() { return finalizeFailureReplayState.providerReceipt; },
    async readProviderAttemptReplayMetadata() { return finalizeFailureReplayState.providerReceipt; },
    async abandonLogicalAttempt() { return 0; }
  };
}
const finalizeFailureExecution = await paidProviderRuntime.executeCommentTranslatorPaidProviderBatch({
  ...messageRateFixtureRequest,
  usageStore: createFinalizeFailureReplayUsageStore({ failFinalize: true }),
  openAi: {
    apiKey: "fixture-provider-key",
    executeBatch: async ({ items }) => {
      finalizeFailureReplayProviderCalls += 1;
      return {
        status: "completed",
        items: items.map((item) => ({ attemptId: item.attemptId, translatedText: "fixture translation" })),
        providerCallCount: 1,
        subsetRetryCount: 0,
        inputCodePoints: 11,
        inputTokens: 10,
        outputTokens: 2,
        estimatedCostMicros: 1,
        retryAttemptIds: [],
        providerFailureClass: null,
        fallbackEligible: false,
        uncertainInflight: false,
        providerReached: true
      };
    }
  }
});
assert.equal(finalizeFailureExecution.translatedCount, 1, "first process observes one successful Provider translation");
assert.equal(
  await paidProviderRuntime.settleCommentTranslatorPaidMessageRateExecution(finalizeFailureExecution, 1),
  "failed",
  "first process reports durable finalize failure"
);
assert.equal(finalizeFailureReplayState.successfulMessageCount, 1, "successful Provider count survives finalize failure durably");
assert.deepEqual(
  finalizeFailureReplayEvents.slice(-2),
  ["record-success:1", "finalize:1:failed"],
  "first process durably records Provider success before finalize fails"
);

// Model a fresh process that can read only the durable message-rate authority
// receipt. It must not depend on the prior process's Provider-attempt replay
// metadata to suppress a second Provider execution.
finalizeFailureReplayState.providerReceipt = null;

const finalizeFailureFreshRetry = await paidProviderRuntime.executeCommentTranslatorPaidProviderBatch({
  ...messageRateFixtureRequest,
  usageStore: createFinalizeFailureReplayUsageStore({ failFinalize: false }),
  openAi: {
    apiKey: "fixture-provider-key",
    executeBatch: async () => {
      finalizeFailureReplayProviderCalls += 1;
      throw new Error("fresh retry must not call Provider");
    }
  }
});
assert.equal(finalizeFailureFreshRetry.providerCallCount, 0, "fresh retry replays the durable Provider receipt");
assert.equal(finalizeFailureFreshRetry.paidCommittedReplaySuccessfulCount, 1, "reserved durable-success replay preserves its successful count internally");
assert.equal(
  await paidProviderRuntime.settleCommentTranslatorPaidMessageRateExecution(finalizeFailureFreshRetry, 0),
  "settled",
  "fresh retry commits the recovered successful count"
);
assert.equal(finalizeFailureReplayProviderCalls, 1, "fresh retry never calls Provider a second time");
assert.equal(
  finalizeFailureReplayEvents.filter((event) => event === "provider-claim").length,
  1,
  "fresh retry never claims Provider dispatch a second time"
);
assert.equal(finalizeFailureReplayState.reservationState, "committed", "fresh retry does not release successful allowance");
assert.equal(finalizeFailureReplayState.successfulMessageCount, 1, "fresh retry never downgrades the successful count to zero");
assert.deepEqual(
  finalizeFailureReplayEvents.filter((event) => event.startsWith("finalize:")),
  ["finalize:1:failed", "finalize:1"],
  "fresh retry eventually finalizes the durable successful count without a zero finalize or release"
);
assert.deepEqual(
  finalizeFailureReplayEvents.filter((event) => event.startsWith("reserve:")),
  ["reserve:reserved:0", "reserve:reserved:1"],
  "fresh retry reuses the original still-reserved allowance instead of obtaining a released/fresh allowance"
);
assert.equal(
  finalizeFailureReplayEvents.some((event) => event === "finalize:0"),
  false,
  "fresh retry cannot finalize the successful reservation as zero"
);

const unexpectedRuntimeEvents = [];
await assert.rejects(
  paidProviderRuntime.executeCommentTranslatorPaidProviderBatch({
    ...messageRateFixtureRequest,
    usageStore: {
      reserveMessageRate: async () => {
        unexpectedRuntimeEvents.push("reserve");
        return {
          reservationStatus: "reserved",
          minuteStartIso: "2026-08-14T10:00:00.000Z",
          reservedMessages: 1,
          committedMessages: 0,
          capacityRemaining: 59
        };
      },
      recordMessageRateSuccess: async ({ successfulMessageCount }) => successfulMessageCount,
      finalizeMessageRate: async ({ translatedMessageCount }) => {
        unexpectedRuntimeEvents.push(`finalize:${translatedMessageCount}`);
        return {
          reservationStatus: "released",
          minuteStartIso: "2026-08-14T10:00:00.000Z",
          reservedMessages: 1,
          committedMessages: translatedMessageCount,
          releasedMessages: 1 - translatedMessageCount
        };
      },
      openaiAttempt: async () => ({
        reservationStatus: "reserved",
        sessionLeaseToken: "fixture-lease",
        openAiSlotToken: "fixture-slot"
      }),
      claimProviderDispatch: async () => "claimed",
      finalizeOpenAiAttempt: async () => true
    },
    openAi: {
      apiKey: "fixture-provider-key",
      executeBatch: async () => null
    }
  }),
  "an unexpected Paid runtime exception still rejects instead of fabricating a browser result"
);
assert.deepEqual(
  unexpectedRuntimeEvents,
  ["reserve", "finalize:0"],
  "an unexpected runtime exception releases reserved message capacity with zero translations"
);

function createPaidLiveFixtureUsageStore(events, {
  replayAttempt = false,
  partialReplayAttempt = false,
  partialReplayLaterOutcome = "success",
  messageRateCommittedReplay = false
} = {}) {
  const attemptReceipts = new Map();
  let committedMessages = messageRateCommittedReplay ? 1 : 0;
  let successfulMessageCount = messageRateCommittedReplay ? 1 : 0;
  let reservedMessages = 1;
  let openAiAttemptCount = 0;
  return {
    async readPollBudget() {
      return {
        utcDay: "2026-08-14",
        dailyBudget: 90_000,
        reservedPolls: 720,
        sessionReservedPolls: 720,
        sessionReservationPresent: true,
        nextResetAtIso: "2026-08-15T00:00:00.000Z"
      };
    },
    async reservePollBudget() { return 720; },
    async reserveMessageRate({ messageCount }) {
      reservedMessages = messageCount;
      events.push(committedMessages > 0 ? "reserve:committed" : "reserve");
      return {
        reservationStatus: committedMessages > 0 ? "committed" : "reserved",
        minuteStartIso: "2026-08-14T10:00:00.000Z",
        reservedMessages,
        committedMessages,
        successfulMessageCount,
        capacityRemaining: 60 - reservedMessages
      };
    },
    async recordMessageRateSuccess({ successfulMessageCount: nextSuccessfulMessageCount }) {
      successfulMessageCount = Math.max(successfulMessageCount, nextSuccessfulMessageCount);
      events.push(`record-success:${successfulMessageCount}`);
      return successfulMessageCount;
    },
    async finalizeMessageRate({ translatedMessageCount }) {
      events.push(`finalize:${translatedMessageCount}`);
      committedMessages = translatedMessageCount;
      return {
        reservationStatus: translatedMessageCount > 0 ? "committed" : "released",
        minuteStartIso: "2026-08-14T10:00:00.000Z",
        reservedMessages: 1,
        committedMessages: translatedMessageCount,
        releasedMessages: reservedMessages - translatedMessageCount
      };
    },
    async openaiAttempt({ providerAttempt }) {
      openAiAttemptCount += 1;
      if (partialReplayAttempt && openAiAttemptCount === 2 && partialReplayLaterOutcome === "stop") {
        throw new Error("fixture authority stop after committed replay");
      }
      const committedReplay = replayAttempt || (partialReplayAttempt && openAiAttemptCount === 1);
      attemptReceipts.set(providerAttempt, {
        attemptState: committedReplay ? "committed" : "reserved",
        providerFailureClass: null,
        successfulItemAttemptIds: committedReplay ? ["server-only-replayed-item-attempt"] : [],
        successfulInputCharacters: committedReplay ? 18 : 0,
        fallbackEligible: false,
        circuitFailureState: "not-required",
        circuitSuccessState: "not-required",
        providerKind: "openai_attempt"
      });
      return committedReplay
        ? { reservationStatus: "committed", sessionLeaseToken: null, openAiSlotToken: null }
        : { reservationStatus: "reserved", sessionLeaseToken: "fixture-lease", openAiSlotToken: "fixture-slot" };
    },
    async finalizeOpenAiAttempt(request) {
      attemptReceipts.set(request.providerAttempt, {
        attemptState: "committed",
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
    async claimProviderDispatch() {
      events.push("provider-claim");
      return "claimed";
    },
    async readOpenAiAttempt({ providerAttempt }) { return attemptReceipts.get(providerAttempt) ?? null; },
    async readProviderAttemptReplayMetadata({ providerAttempt }) { return attemptReceipts.get(providerAttempt) ?? null; },
    async abandonLogicalAttempt() { return 0; }
  };
}

const partialReplayStopExecutionEvents = [];
const partialReplayStopExecution = await paidProviderRuntime.executeCommentTranslatorPaidProviderBatch({
  ...messageRateFixtureRequest,
  comments: [
    messageRateFixtureRequest.comments[0],
    {
      commentId: "partial-replay-stop-second-comment",
      publishedAt: "2026-08-14T10:00:01.000Z",
      text: "second microbatch fixture",
      platformLanguageHint: "ko"
    }
  ],
  sourceLanguages: ["EN", "KO"],
  usageStore: createPaidLiveFixtureUsageStore(partialReplayStopExecutionEvents, {
    partialReplayAttempt: true,
    partialReplayLaterOutcome: "stop"
  }),
  openAi: {
    apiKey: "fixture-provider-key",
    executeBatch: async () => {
      throw new Error("later authority stop must occur before Provider dispatch");
    }
  }
});
assert.equal(partialReplayStopExecution.paidCommittedReplay, true, "Paid stop result preserves its internal committed replay marker");
assert.equal(partialReplayStopExecution.paidCommittedReplaySuccessfulCount, 1, "Paid stop result preserves the successful committed replay count");
assert.equal(partialReplayStopExecution.paidProviderStopReason, "authority-unreadable", "later microbatch authority failure remains a Paid stop");
assert.doesNotMatch(
  JSON.stringify(partialReplayStopExecution),
  /server-only-replayed-item-attempt|fixture-owner|liveChatId|reservationKey|provider-key|server-secret|partial-replay-stop-second-comment/i,
  "Paid stop execution exposes no replay receipt or private identifier metadata"
);
assert.equal(
  await paidProviderRuntime.settleCommentTranslatorPaidMessageRateExecution(
    partialReplayStopExecution,
    partialReplayStopExecution.translatedCount + partialReplayStopExecution.paidCommittedReplaySuccessfulCount
  ),
  "settled",
  "Paid stop execution settles its preserved replay success"
);
assert.deepEqual(
  partialReplayStopExecutionEvents,
  ["reserve", "record-success:1", "finalize:1"],
  "Paid stop execution records and finalizes the preserved replay count"
);

const expiredDegradedRecoveryEvents = [];
const expiredDegradedRecoveryResult = await paidProviderRuntime.executeCommentTranslatorPaidProviderBatch({
  ...messageRateFixtureRequest,
  occurredAtMs: expiredDegradedNowMs,
  circuitAuthority: expiredDegradedCircuitAuthority,
  usageStore: createPaidLiveFixtureUsageStore(expiredDegradedRecoveryEvents),
  killSwitches: expiredDegradedProviderRuntime.killSwitches,
  openAi: {
    apiKey: "fixture-provider-key",
    executeBatch: async ({ items }) => {
      expiredDegradedRecoveryEvents.push("provider");
      return {
        status: "completed",
        items: items.map((item) => ({ attemptId: item.attemptId, translatedText: "fixture translation" })),
        providerCallCount: 1,
        subsetRetryCount: 0,
        inputCodePoints: items.reduce((total, item) => total + Array.from(item.text).length, 0),
        inputTokens: 10,
        outputTokens: 2,
        estimatedCostMicros: 1,
        retryAttemptIds: [],
        providerFailureClass: null,
        fallbackEligible: false,
        uncertainInflight: false,
        providerReached: true
      };
    }
  },
  azureProvider: null
});
assert.equal(expiredDegradedRecoveryResult.status, "completed", "same-session expired-degradation probe completes on OpenAI");
assert.equal(expiredDegradedRecoveryResult.translations.length, 1, "same-session probe returns one browser-safe translation result");
assert.deepEqual(
  expiredDegradedRecoveryEvents.filter((event) => event === "provider-claim" || event === "provider"),
  ["provider-claim", "provider"],
  "same-session recovery claims and executes OpenAI exactly once"
);
assert.equal((await expiredDegradedCircuitAuthority.read("openai")).state, "closed", "committed successful probe closes the OpenAI circuit");

function createPaidLiveFixtureAuthority(events, {
  replayAttempt = false,
  partialReplayAttempt = false,
  partialReplayLaterOutcome = "success",
  messageRateCommittedReplay = false
} = {}) {
  return {
    ...paidAuthority,
    providerRuntime: {
      usageStore: createPaidLiveFixtureUsageStore(events, {
        replayAttempt,
        partialReplayAttempt,
        partialReplayLaterOutcome,
        messageRateCommittedReplay
      }),
      circuitAuthority: circuitRuntime.createInMemoryCommentTranslatorProviderCircuitAuthority(),
      serverSecret: "server-only-fixture-secret",
      attemptKeyVersion: "fixture-v1",
      killSwitches: {
        checkout_enabled: true,
        paid_translation_enabled: true,
        openai_enabled: true,
        azure_fallback_enabled: false
      },
      openAi: {
        apiKey: "fixture-provider-key",
        executeBatch: async ({ items }) => {
          if (replayAttempt) throw new Error("committed attempt replay must not call Provider");
          events.push("provider");
          if (partialReplayAttempt && partialReplayLaterOutcome === "throw") return null;
          return {
            status: "completed",
            items: items.map((item) => ({ attemptId: item.attemptId, translatedText: "fixture translation" })),
            providerCallCount: 1,
            subsetRetryCount: 0,
            inputCodePoints: items.reduce((total, item) => total + Array.from(item.text).length, 0),
            inputTokens: 10,
            outputTokens: 2,
            estimatedCostMicros: 1,
            retryAttemptIds: [],
            providerFailureClass: null,
            fallbackEligible: false,
            uncertainInflight: false,
            providerReached: true
          };
        }
      },
      azureProvider: null,
      dailyPollBudget: 90_000
    }
  };
}

async function runPaidLiveFeedSettlementFixture({ persistSucceeds, replayAttempt = false, partialReplayAttempt = false, partialReplayLaterOutcome = "success", messageRateCommittedReplay = false, existingFeed = null, seedInMemoryFeed = false, emptyPollOnly = false, fixtureAuthority = null, fixtureEvents = null }) {
  const events = fixtureEvents ?? [];
  let persistedFeed = null;
  let durableFeedReadCount = 0;
  const nowMs = Date.parse("2026-08-14T10:00:15.000Z");
  const messageReferenceId = replayAttempt
    ? existingFeed?.rows.find((row) => row.translationStatus === "translated-f10")?.messageReferenceId
    : partialReplayAttempt ? "paid-feed-partial-replay-comment"
    : persistSucceeds ? "paid-feed-success-comment" : "paid-feed-failure-comment";
  assert.ok(messageReferenceId, "reentry fixture requires an existing translated safe row");
  const activeSession = {
    sessionReferenceId: replayAttempt ? "cts_paid_feed_reentry" : persistSucceeds ? "cts_paid_feed_success" : "cts_paid_feed_failure",
    credentialReferenceId: "fixture-credential",
    startedAtMs: nowMs - 30_000,
    lastHeartbeatAtMs: nowMs - 30_000
  };
  pollingWiring.resetCommentTranslatorBoundedLiveChatPollingStateForTests();
  feedBridge.resetCommentTranslatorRealCommentsFeedSessionBridgeForTests();
  if (seedInMemoryFeed && existingFeed) {
    await feedBridge.persistCommentTranslatorRealCommentsFeedForActiveSession({
      callerAuthorization: { status: "authorized", ownerUserId: "fixture-owner" },
      sessionReferenceId: activeSession.sessionReferenceId,
      feed: existingFeed,
      recordedAtMs: nowMs - 30_000,
      durableFeedStore: { status: "unavailable", missingEnvReferences: [], failClosed: true }
    });
  }
  pollingWiring.seedCommentTranslatorBoundedLiveChatPollingStateForActiveSession({
    state: {
      ...paidStartState,
      sessionReferenceId: activeSession.sessionReferenceId,
      startedAtIso: new Date(activeSession.startedAtMs).toISOString(),
      heartbeat: {
        ...paidStartState.heartbeat,
        lastHeartbeatAtIso: new Date(activeSession.lastHeartbeatAtMs).toISOString()
      }
    },
    liveChatTargetReadiness: commandTarget,
    nowMs: activeSession.startedAtMs
  });
  const pollingAdapter = pollingWiring.createDeterministicCommentTranslatorBoundedLiveChatPollingAdapter({
    pollSteps: emptyPollOnly ? [{
      type: "messages",
      receivedAtMs: nowMs,
      nextPageToken: "server-only-empty-cross-isolate-cursor",
      pollingIntervalMillis: 15_000,
      comments: []
    }] : [
      {
        type: "messages",
        receivedAtMs: nowMs - 15_000,
        nextPageToken: "server-only-prime-cursor",
        pollingIntervalMillis: 15_000,
        comments: []
      },
      {
        type: "messages",
        receivedAtMs: nowMs,
        nextPageToken: "server-only-fixture-cursor",
        pollingIntervalMillis: 15_000,
        comments: [{
          id: messageReferenceId,
          publishedAt: new Date(nowMs).toISOString(),
          text: "hello from fixture",
          platformLanguageHint: "en"
        }, ...(partialReplayAttempt ? [{
          id: "paid-feed-fresh-second-microbatch-comment",
          publishedAt: new Date(nowMs).toISOString(),
          text: "second microbatch fixture",
          platformLanguageHint: "ko"
        }] : [])]
      }
    ]
  });
  const liveStepInput = {
    activeSession,
    usage: paidBaseline.usage,
    callerAuthorization: { status: "authorized", ownerUserId: "fixture-owner" },
    credentialReadiness: {
      status: "ready",
      provider: "youtube",
      credentialReferenceId: "fixture-credential",
      translatorStartAllowed: true,
      reconnectGuidance: "none"
    },
    targetLookupAdapter: { status: "unavailable", providerAccess: "not-run", reason: "target-lookup-not-approved" },
    pollingAdapter,
    paidSessionAuthority: fixtureAuthority ?? createPaidLiveFixtureAuthority(events, {
      replayAttempt,
      partialReplayAttempt,
      partialReplayLaterOutcome,
      messageRateCommittedReplay
    }),
    durableFeedStore: {
      status: "ready",
      store: {
        async persistSafeFeed(request) {
          events.push("feed");
          persistedFeed = request.feed;
          return {
            durableFeedPersistResultLabel: persistSucceeds ? "durable-feed-persisted" : "durable-feed-persist-failed",
            durableFeedPersistDiagnostics: {
              storeReadyLabel: "ready",
              tableShapeLabel: "available",
              persistOperationLabel: "upsert-select-single",
              persistFailureBucketLabel: persistSucceeds ? "none" : "write-failed",
              rowsTouchedCount: persistSucceeds ? 1 : 0,
              readbackLabel: persistSucceeds ? "readback-ready" : "not-run-persist-failed"
            }
          };
        },
        async readSafeFeed() {
          durableFeedReadCount += 1;
          return existingFeed;
        },
        async clearSafeFeed() {}
      },
      missingEnvReferences: [],
      failClosed: false
    },
    targetLanguage: "ja",
    sourceLanguages: partialReplayAttempt ? ["EN", "KO"] : ["EN"]
  };
  await liveStep.runCommentTranslatorLiveProviderSessionStep({ ...liveStepInput, nowMs: nowMs - 15_000 });
  const result = await liveStep.runCommentTranslatorLiveProviderSessionStep({ ...liveStepInput, nowMs });
  return {
    events,
    result,
    persistedFeed,
    fixtureAuthority: liveStepInput.paidSessionAuthority,
    liveStepInput,
    readDurableFeedCount: () => durableFeedReadCount
  };
}

const paidLivePersisted = await runPaidLiveFeedSettlementFixture({ persistSucceeds: true });
assert.deepEqual(
  paidLivePersisted.events,
  ["reserve", "provider-claim", "provider", "feed", "record-success:1", "finalize:1"],
  "Paid live path durably persists the browser-safe feed before committing message-rate settlement"
);
assert.equal(paidLivePersisted.result.translationStatus, "completed");
assert.equal(paidLivePersisted.result.translatedCount, 1);
assert.deepEqual(paidLivePersisted.result.safeFeed, paidLivePersisted.persistedFeed, "Paid live step returns the exact safe feed it persisted");
assert.doesNotMatch(
  JSON.stringify(paidLivePersisted.result.safeFeed),
  /server-only-fixture|fixture-owner|liveChatId|reservationKey|provider-key|server-secret/i,
  "Worker feed reuse exposes only the browser-safe feed shape"
);
const durableReadsBeforeEmptyPoll = paidLivePersisted.readDurableFeedCount();
const emptyPollNowMs = Date.parse("2026-08-14T10:00:30.000Z");
const emptyPollResult = await liveStep.runCommentTranslatorLiveProviderSessionStep({
  ...paidLivePersisted.liveStepInput,
  nowMs: emptyPollNowMs,
  pollingAdapter: pollingWiring.createDeterministicCommentTranslatorBoundedLiveChatPollingAdapter({
    pollSteps: [{
      type: "messages",
      receivedAtMs: emptyPollNowMs,
      nextPageToken: "server-only-empty-cursor",
      pollingIntervalMillis: 15_000,
      comments: []
    }]
  })
});
assert.deepEqual(emptyPollResult.safeFeed, paidLivePersisted.persistedFeed, "empty poll reuses the in-memory safe feed");
assert.equal(
  paidLivePersisted.readDurableFeedCount(),
  durableReadsBeforeEmptyPoll,
  "empty poll does not read the durable snapshot when an in-memory safe feed exists"
);

const paidLiveInMemoryReplay = await runPaidLiveFeedSettlementFixture({
  persistSucceeds: true,
  replayAttempt: true,
  existingFeed: paidLivePersisted.persistedFeed,
  seedInMemoryFeed: true
});
assert.deepEqual(
  paidLiveInMemoryReplay.events,
  ["reserve", "record-success:1", "finalize:1"],
  "same-Worker replay returns the in-memory translated row and commits rate settlement without a second Provider claim or feed write"
);
const reentryTranslatedRow = paidLiveInMemoryReplay.result.safeFeed.rows.find(
  (row) => row.messageReferenceId === paidLivePersisted.persistedFeed.rows[0].messageReferenceId
);
assert.equal(reentryTranslatedRow.translationStatus, "translated-f10", "empty replay execution cannot downgrade an existing translated safe row");
assert.equal(reentryTranslatedRow.translatedText, "fixture translation", "empty replay execution preserves existing browser-safe translated text");
assert.equal(paidLiveInMemoryReplay.result.translatedCount, 0, "attempt replay does not claim a second Provider translation");
assert.doesNotMatch(
  JSON.stringify(paidLiveInMemoryReplay.result.safeFeed),
  /server-only-fixture|fixture-owner|liveChatId|reservationKey|provider-key|server-secret/i,
  "reentry returns only the existing browser-safe feed row"
);
assert.equal(paidLiveInMemoryReplay.persistedFeed, null, "same-Worker committed replay does not rewrite its translated snapshot");

// Active polling must stay snapshot-read-free across isolates. Explicit
// restore/reconnect remains responsible for reading the prior durable row.
const paidLiveCrossIsolateReplay = await runPaidLiveFeedSettlementFixture({
  persistSucceeds: true,
  replayAttempt: true,
  existingFeed: paidLivePersisted.persistedFeed,
  messageRateCommittedReplay: true
});
assert.equal(paidLiveCrossIsolateReplay.readDurableFeedCount(), 0, "cross-isolate active replay performs zero durable feed reads");
assert.equal(
  paidLiveCrossIsolateReplay.events.filter((event) => event === "provider-claim" || event === "provider").length,
  0,
  "cross-isolate committed replay does not call Provider again"
);
assert.equal(paidLiveCrossIsolateReplay.result.safeFeed.status, "unavailable", "cross-isolate committed replay returns a safe unavailable baseline without an in-memory feed");
assert.equal(
  Object.hasOwn(paidLiveCrossIsolateReplay.result, "paidCommittedReplaySuccessfulCount"),
  false,
  "browser-safe live-step projection omits the internal committed replay count"
);
assert.equal(paidLiveCrossIsolateReplay.persistedFeed, null, "cross-isolate committed replay does not persist a degraded feed");
assert.equal(paidLiveCrossIsolateReplay.events.filter((event) => event === "feed").length, 0, "cross-isolate committed replay performs zero feed writes");
assert.doesNotMatch(
  JSON.stringify(paidLiveCrossIsolateReplay.result.safeFeed),
  /server-only-fixture|fixture-owner|liveChatId|reservationKey|provider-key|server-secret/i,
  "cross-isolate replay unavailable baseline remains privacy-safe"
);

const paidLivePartialCrossIsolateReplay = await runPaidLiveFeedSettlementFixture({
  persistSucceeds: true,
  partialReplayAttempt: true
});
assert.deepEqual(
  paidLivePartialCrossIsolateReplay.events,
  ["reserve", "provider-claim", "provider", "record-success:2", "finalize:2"],
  "partial multi-microbatch replay executes only the fresh microbatch and settles both durable successes without a feed write"
);
assert.equal(paidLivePartialCrossIsolateReplay.readDurableFeedCount(), 0, "partial cross-isolate replay performs zero durable feed reads");
assert.equal(paidLivePartialCrossIsolateReplay.persistedFeed, null, "partial committed replay never persists a degraded feed");
assert.equal(paidLivePartialCrossIsolateReplay.result.safeFeed.status, "unavailable", "partial cross-isolate replay fails safe without same-Worker translated rows");
assert.equal(
  paidLivePartialCrossIsolateReplay.events.filter((event) => event === "provider-claim" || event === "provider").length,
  2,
  "partial replay performs exactly one claim and one Provider call for the fresh microbatch"
);
assert.doesNotMatch(
  JSON.stringify(paidLivePartialCrossIsolateReplay.result),
  /server-only-replayed-item-attempt|fixture-owner|liveChatId|reservationKey|provider-key|server-secret|partial-replay-comment/i,
  "partial replay returns no server-only receipt or private identifier metadata"
);

const paidLivePartialReplayThenStop = await runPaidLiveFeedSettlementFixture({
  persistSucceeds: true,
  partialReplayAttempt: true,
  partialReplayLaterOutcome: "stop"
});
assert.deepEqual(
  paidLivePartialReplayThenStop.events,
  ["reserve", "record-success:1", "finalize:1"],
  "partial replay followed by a Paid authority stop settles the replayed success without Provider or feed writes"
);
assert.equal(paidLivePartialReplayThenStop.readDurableFeedCount(), 0, "replay-bearing Paid stop performs zero durable feed reads");
assert.equal(paidLivePartialReplayThenStop.persistedFeed, null, "replay-bearing Paid stop performs zero durable feed writes");
assert.equal(paidLivePartialReplayThenStop.result.safeFeed.status, "unavailable", "cross-isolate replay-bearing Paid stop preserves the unavailable baseline");
assert.equal(paidLivePartialReplayThenStop.result.translationStatus, "provider-unavailable", "replay-bearing Paid stop preserves browser-safe stop behavior");
assert.equal(paidLivePartialReplayThenStop.result.pollingTick.stopReason, "paid-authority-unreadable", "replay-bearing Paid stop maps through the existing safe stop helper");
assert.doesNotMatch(
  JSON.stringify(paidLivePartialReplayThenStop.result),
  /paidCommittedReplay|server-only-replayed-item-attempt|fixture-owner|liveChatId|reservationKey|provider-key|server-secret|partial-replay-comment/i,
  "replay-bearing Paid stop exposes neither internal replay fields nor private identifiers"
);

const paidLivePartialReplayThenException = await runPaidLiveFeedSettlementFixture({
  persistSucceeds: true,
  partialReplayAttempt: true,
  partialReplayLaterOutcome: "throw"
});
assert.deepEqual(
  paidLivePartialReplayThenException.events,
  ["reserve", "provider-claim", "provider", "record-success:1", "finalize:1"],
  "unexpected later exception finalizes the replayed success instead of releasing it"
);
assert.equal(paidLivePartialReplayThenException.readDurableFeedCount(), 0, "exception after committed replay performs zero durable feed reads");
assert.equal(paidLivePartialReplayThenException.persistedFeed, null, "exception after committed replay performs zero durable feed writes");
assert.equal(paidLivePartialReplayThenException.result.translationStatus, "provider-unavailable", "exception after committed replay remains browser-safe and stopped");
assert.doesNotMatch(
  JSON.stringify(paidLivePartialReplayThenException.result),
  /paidCommittedReplay|server-only-replayed-item-attempt|fixture-owner|liveChatId|reservationKey|provider-key|server-secret|partial-replay-comment/i,
  "exception after committed replay exposes no internal replay field or private identifier"
);

const paidLiveCrossIsolateEmptyPoll = await runPaidLiveFeedSettlementFixture({
  persistSucceeds: true,
  emptyPollOnly: true,
  existingFeed: paidLivePersisted.persistedFeed
});
assert.equal(paidLiveCrossIsolateEmptyPoll.readDurableFeedCount(), 0, "cross-isolate empty active poll performs zero durable feed reads");
assert.equal(paidLiveCrossIsolateEmptyPoll.result.safeFeed.status, "unavailable", "cross-isolate empty poll returns a safe unavailable baseline");
assert.equal(
  paidLiveCrossIsolateEmptyPoll.events.filter((event) => event === "provider-claim" || event === "provider").length,
  0,
  "cross-isolate empty poll does not call Provider"
);

const paidLivePersistFailed = await runPaidLiveFeedSettlementFixture({ persistSucceeds: false });
assert.deepEqual(
  paidLivePersistFailed.events.filter((event) => event.startsWith("finalize:")),
  ["finalize:1"],
  "durable feed failure commits the successful Provider receipt instead of releasing its allowance"
);
assert.equal(
  paidLivePersistFailed.events.filter((event) => event === "provider-claim").length,
  1,
  "durable feed failure does not claim a second Provider call"
);
assert.equal(paidLivePersistFailed.result.translationStatus, "provider-unavailable", "durable feed failure returns a fail-closed stopped result");
assert.equal(paidLivePersistFailed.result.translatedCount, 0, "durable feed failure does not claim browser-visible translations");
assert.doesNotMatch(
  JSON.stringify(paidLivePersistFailed.result),
  /server-only-fixture|fixture-owner|liveChatId|reservationKey|hello from fixture|paid-feed-failure-comment/i,
  "durable feed failure result remains sanitized"
);
const failedFeedRetryEventOffset = paidLivePersistFailed.events.length;
const paidLivePersistFailureRetry = await runPaidLiveFeedSettlementFixture({
  persistSucceeds: true,
  fixtureAuthority: paidLivePersistFailed.fixtureAuthority,
  fixtureEvents: paidLivePersistFailed.events
});
assert.deepEqual(
  paidLivePersistFailureRetry.events.slice(failedFeedRetryEventOffset),
  ["reserve:committed"],
  "retry observes the committed message-rate receipt without a Provider call or degraded feed write"
);
assert.equal(
  paidLivePersistFailureRetry.events.filter((event) => event === "provider-claim").length,
  1,
  "feed persistence retry does not claim or execute Provider a second time"
);
assert.equal(paidLivePersistFailureRetry.persistedFeed, null, "committed persistence retry does not overwrite the prior translated snapshot");
assert.equal(paidLivePersistFailureRetry.result.safeFeed.status, "unavailable", "committed persistence retry without in-memory state returns safe unavailable");

console.log("comment-translator-paid-core-v1-task7-session-contract: PASS");
