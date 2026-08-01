import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertIncludes(source, fragments, label) {
  for (const fragment of fragments) {
    assert.match(source, new RegExp(escapeRegExp(fragment)), `${label}: ${fragment}`);
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const actionContext = read("app/tools/comment-translator/action-context.ts");
const sessionRoute = read("app/api/comment-translator/session/route.ts");
const entitlement = read("lib/comment-translator-public-entitlement-baseline.ts");
const sessionRuntime = read("lib/comment-translator-session-runtime.ts");
const providerPolicy = read("lib/comment-translator-provider-policy-runtime.ts");
const providerExecution = read("lib/comment-translator-provider-execution-runtime.ts");
const browserSafeFeed = read("lib/comment-translator-real-comments-feed-shared.ts");
const sessionState = read("lib/comment-translator-session-state.ts");

assertIncludes(
  actionContext,
  ['import "server-only";', "supabase.auth.getUser()", "callerUserId: error ? null : user?.id ?? null", "authUnavailable: Boolean(error)"],
  "Free auth remains server-owned and caller-derived"
);

assert.ok(
  sessionRoute.indexOf("readCommentTranslatorRouteCallerAuthorization()") <
    sessionRoute.indexOf("readCommentTranslatorFreeBetaRuntimeAccess({ callerAuthorization })"),
  "Free route derives caller authorization before evaluating runtime access"
);
assertIncludes(
  sessionRoute,
  [
    "readCommentTranslatorDurableActiveSessionOrFailClosed",
    'durableActiveSessionRead.status === "fail-closed"',
    "readCommentTranslatorDurableUsageSnapshotOrFailClosed",
    'entitlementBaseline.status === "fail-closed"'
  ],
  "Free durable session and usage authority remain fail-closed"
);

assertIncludes(
  `${entitlement}\n${sessionRuntime}`,
  [
    'runtime: "server-only"',
    "dailyMinutes: 30",
    "sessionMinutes: 30",
    "translatedMessagesPerMinute: 30",
    "activeSessionsPerUser: 1",
    "monthlyProviderInputCharacters: 20_000",
    'plan: "free"',
    'authority: "durable-usage-store-unavailable"'
  ],
  "Free limits and entitlement fallback remain fixed"
);

assertIncludes(
  providerPolicy,
  ['freeFallbackToPaidLlm: "forbidden"', 'fallbackProvider: null', 'fallbackBehavior: "free-no-paid-llm-fallback"'],
  "Free provider policy cannot fall back to a paid LLM"
);
assertIncludes(
  providerExecution,
  [
    "filterProviderExecutedTranslations(translations)",
    'translation.cacheOutcome !== "hit"',
    "providerExecutedTranslations.length > 0"
  ],
  "cache hits remain visible but excluded from provider-executed usage"
);

assertIncludes(
  `${browserSafeFeed}\n${sessionState}`,
  [
    'safeRowSource: "f8-browser-safe-projection"',
    'rawProviderPayload: "not-returned-by-design"',
    'providerTargetMetadata: "forbidden"',
    'tokenValue: "never-returned-by-design"'
  ],
  "Free browser projections remain sanitized"
);

process.stdout.write("comment translator NC-F1 Free invariant characterization passed\n");
