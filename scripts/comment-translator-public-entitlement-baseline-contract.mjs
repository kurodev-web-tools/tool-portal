import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const entitlementPath = "lib/comment-translator-public-entitlement-baseline.ts";
const sessionRuntimePath = "lib/comment-translator-session-runtime.ts";
const usageLedgerPath = "lib/comment-translator-usage-ledger-runtime.ts";
const durableUsagePath = "lib/comment-translator-durable-usage-counter-store.ts";
const routePath = "app/api/comment-translator/session/route.ts";
const actionPath = "app/tools/comment-translator/actions.ts";
const readinessDocPath = "docs/active/COMMENT_TRANSLATOR_DURABLE_PERSISTENCE_SCHEMA_READINESS.md";
const gapAuditPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md";
const taskPath = "task.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function changedFiles() {
  const base = "origin/codex/comment-translator-free-public-beta-integration";
  const committedDiff = execSync(`git diff --name-only ${base}...HEAD`, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  })
    .split(/\r?\n/)
    .filter(Boolean);
  const uncommittedDiff = execSync("git diff --name-only", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  })
    .split(/\r?\n/)
    .filter(Boolean);
  const untracked = execSync("git ls-files --others --exclude-standard", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  })
    .split(/\r?\n/)
    .filter(Boolean);

  return [...new Set([...committedDiff, ...uncommittedDiff, ...untracked])].map((file) => file.replace(/\\/g, "/"));
}

function loadTsModule(relativePath) {
  const moduleCache = new Map();
  const originalLoad = Module._load;

  function compileTsModule(modulePath) {
    const normalizedModulePath = path.normalize(modulePath);
    if (moduleCache.has(normalizedModulePath)) {
      return moduleCache.get(normalizedModulePath).exports;
    }

    const source = fs.readFileSync(normalizedModulePath, "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022
      }
    }).outputText;

    const testModule = new Module(normalizedModulePath);
    moduleCache.set(normalizedModulePath, testModule);
    testModule.filename = normalizedModulePath;
    testModule.paths = Module._nodeModulePaths(path.dirname(normalizedModulePath));
    testModule._compile(compiled, normalizedModulePath);
    return testModule.exports;
  }

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "server-only") {
      return {};
    }

    if (request === "@supabase/supabase-js") {
      return {
        createClient(url, key) {
          return { url, key, from: () => ({}) };
        }
      };
    }

    if (request === "stripe") {
      return class Stripe {
        constructor() {
          this.checkout = { sessions: { create: async () => ({ url: null }) } };
          this.billingPortal = { sessions: { create: async () => ({ url: null }) } };
          this.webhooks = { constructEventAsync: async () => ({ type: "unsupported", data: { object: {} } }) };
        }
      };
    }

    if (request.startsWith("@/") && parent?.filename) {
      const candidate = path.join(root, `${request.slice(2)}.ts`);
      if (fs.existsSync(candidate)) {
        return compileTsModule(candidate);
      }
    }

    if (request.startsWith(".") && parent?.filename) {
      const candidate = path.resolve(path.dirname(parent.filename), `${request}.ts`);
      if (fs.existsSync(candidate)) {
        return compileTsModule(candidate);
      }
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return compileTsModule(path.join(root, relativePath));
  } finally {
    Module._load = originalLoad;
  }
}

for (const requiredPath of [
  entitlementPath,
  sessionRuntimePath,
  usageLedgerPath,
  durableUsagePath,
  routePath,
  actionPath,
  readinessDocPath,
  gapAuditPath
]) {
  assert.ok(exists(requiredPath), `F5 required file exists: ${requiredPath}`);
}

const entitlementSource = read(entitlementPath);
const sessionRuntimeSource = read(sessionRuntimePath);
const usageLedgerSource = read(usageLedgerPath);
const durableUsageSource = read(durableUsagePath);
const routeSource = read(routePath);
const actionSource = read(actionPath);
const readinessDoc = read(readinessDocPath);
const gapAudit = read(gapAuditPath);
const taskSource = read(taskPath);

assert.match(entitlementSource, /^import "server-only";/m, "public entitlement resolver is server-only");
assert.match(entitlementSource, /commentTranslatorPublicEntitlementBaselineContract/, "resolver exposes F5 contract");
assert.match(entitlementSource, /resolveCommentTranslatorPublicEntitlementBaseline/, "resolver exports Free public beta baseline resolver");
assert.match(entitlementSource, /monthlyTranslatedCharacterLimit/, "resolver carries monthly translated character limit");
assert.match(entitlementSource, /20_000/, "resolver encodes the 20,000 characters/month Free cap");
assert.match(entitlementSource, /degradedFrom/, "resolver records safe Free degradation source");
assert.match(entitlementSource, /publicLaunchAllowed:\s*false/, "resolver does not open public launch gate");

assert.match(sessionRuntimeSource, /monthlyTranslatedCharacterLimit/, "session entitlement type carries monthly character cap");
assert.match(sessionRuntimeSource, /monthlyTranslatedCharacters:\s*20_000/, "session contract records the Free monthly character cap");
assert.match(usageLedgerSource, /monthlyTranslatedCharacterEstimate/, "usage ledger exposes monthly translated character estimate");
assert.match(durableUsageSource, /monthlyTranslatedCharacterEstimate/, "durable usage adapter exposes monthly translated character estimate");

assert.match(routeSource, /resolveCommentTranslatorPublicEntitlementBaseline/, "session route resolves F5 public entitlement baseline");
assert.match(routeSource, /entitlementBaseline\.plan/, "session route uses resolver plan");
assert.match(routeSource, /entitlementBaseline\.usage/, "session route uses resolver usage");
assert.match(actionSource, /resolveCommentTranslatorPublicEntitlementBaseline/, "server actions resolve F5 public entitlement baseline");
assert.match(actionSource, /entitlementBaseline\.plan/, "server actions use resolver plan");
assert.match(actionSource, /entitlementBaseline\.usage/, "server actions use resolver usage");

assert.match(readinessDoc, /F5 public entitlement baseline/i, "durable readiness doc records F5 baseline");
assert.match(readinessDoc, /20,000 characters\/month/i, "durable readiness doc records monthly character cap");
assert.match(gapAudit, /F5[\s\S]*monthly character cap/i, "gap audit F5 requirement remains visible");

const entitlement = loadTsModule(entitlementPath);
const session = loadTsModule(sessionRuntimePath);

assert.equal(
  entitlement.commentTranslatorPublicEntitlementBaselineContract.implementationStage,
  "free-public-beta-f5-public-entitlement-baseline"
);
assert.equal(entitlement.commentTranslatorPublicEntitlementBaselineContract.runtime, "server-only");
assert.equal(entitlement.commentTranslatorPublicEntitlementBaselineContract.publicLaunchAllowed, false);
assert.equal(entitlement.commentTranslatorPublicEntitlementBaselineContract.freePlanLimits.dailyMinutes, 30);
assert.equal(entitlement.commentTranslatorPublicEntitlementBaselineContract.freePlanLimits.sessionMinutes, 30);
assert.equal(entitlement.commentTranslatorPublicEntitlementBaselineContract.freePlanLimits.translatedMessagesPerMinute, 30);
assert.equal(entitlement.commentTranslatorPublicEntitlementBaselineContract.freePlanLimits.activeSessionsPerUser, 1);
assert.equal(entitlement.commentTranslatorPublicEntitlementBaselineContract.freePlanLimits.monthlyTranslatedCharacters, 20_000);

const freeEntitlement = session.createCommentTranslatorSessionPlanEntitlement({ plan: "free" });
assert.equal(freeEntitlement.dailyLimitMs, 1_800_000);
assert.equal(freeEntitlement.sessionLimitMs, 1_800_000);
assert.equal(freeEntitlement.translatedMessagesPerMinute, 30);
assert.equal(freeEntitlement.activeSessionsPerUser, 1);
assert.equal(freeEntitlement.monthlyTranslatedCharacterLimit, 20_000);

const baseUsage = {
  dailyUsedMs: 0,
  currentSessionElapsedMs: 0,
  translatedMessagesInCurrentMinute: 0,
  monthlyTranslatedCharacterEstimate: 19_999,
  providerBudgetAvailable: true,
  globalBudgetAvailable: true,
  aiBudgetAvailable: true,
  translationProviderAvailable: true,
  planEntitlement: freeEntitlement,
  providerRequestEstimate: {
    requestEstimateCount: 0,
    quotaUnitEstimate: 0,
    providerTargetMetadata: "forbidden"
  },
  aiUsageEstimate: {
    translatedMessageEstimate: 0,
    translatedCharacterEstimate: 0,
    estimatedCostMicros: 0,
    rawCommentText: "never-recorded-by-design"
  }
};

const freeBaseline = entitlement.resolveCommentTranslatorPublicEntitlementBaseline({
  billingSnapshot: {
    plan: "free",
    billingState: "free",
    planEntitlement: freeEntitlement
  },
  durableUsageRead: {
    status: "ready",
    snapshot: baseUsage,
    authority: "durable-store"
  }
});
assert.equal(freeBaseline.status, "ready");
assert.equal(freeBaseline.plan, "free");
assert.equal(freeBaseline.monthlyTranslatedCharacterLimit, 20_000);
assert.equal(freeBaseline.monthlyTranslatedCharacterRemaining, 1);
assert.equal(freeBaseline.usage.aiBudgetAvailable, true);
assert.equal(freeBaseline.usage.planEntitlement.monthlyTranslatedCharacterLimit, 20_000);
assert.equal(freeBaseline.degradedFrom, null);

const paidDegraded = entitlement.resolveCommentTranslatorPublicEntitlementBaseline({
  billingSnapshot: {
    plan: "paid",
    billingState: "paid-active",
    planEntitlement: {
      ...freeEntitlement,
      plan: "paid",
      planEntitlementReferenceId: "comment-translator-paid-public-v1",
      dailyLimitMs: 7_200_000,
      sessionLimitMs: 3_600_000,
      translatedMessagesPerMinute: 90
    }
  },
  durableUsageRead: {
    status: "ready",
    snapshot: {
      ...baseUsage,
      planEntitlement: {
        ...freeEntitlement,
        plan: "paid",
        planEntitlementReferenceId: "comment-translator-paid-public-v1",
        dailyLimitMs: 7_200_000,
        sessionLimitMs: 3_600_000,
        translatedMessagesPerMinute: 90
      }
    },
    authority: "durable-store"
  }
});
assert.equal(paidDegraded.status, "ready");
assert.equal(paidDegraded.plan, "free", "paid snapshot safely degrades to Free until durable paid entitlement exists");
assert.equal(paidDegraded.usage.planEntitlement.plan, "free");
assert.equal(paidDegraded.usage.planEntitlement.dailyLimitMs, 1_800_000);
assert.equal(paidDegraded.degradedFrom, "non-durable-paid-entitlement");

const cappedBaseline = entitlement.resolveCommentTranslatorPublicEntitlementBaseline({
  billingSnapshot: {
    plan: "free",
    billingState: "free",
    planEntitlement: freeEntitlement
  },
  durableUsageRead: {
    status: "ready",
    snapshot: {
      ...baseUsage,
      monthlyTranslatedCharacterEstimate: 20_000
    },
    authority: "durable-store"
  }
});
assert.equal(cappedBaseline.status, "ready");
assert.equal(cappedBaseline.monthlyTranslatedCharacterRemaining, 0);
assert.equal(cappedBaseline.usage.aiBudgetAvailable, false, "monthly character cap disables AI budget availability");

const failClosed = entitlement.resolveCommentTranslatorPublicEntitlementBaseline({
  billingSnapshot: {
    plan: "free",
    billingState: "free",
    planEntitlement: freeEntitlement
  },
  durableUsageRead: {
    status: "fail-closed",
    snapshot: null,
    stopReason: "global-budget-stop",
    authority: "durable-store-unavailable",
    reason: "query-failed",
    clientReadableDetail: "sanitized-stop-reason-only"
  }
});
assert.equal(failClosed.status, "fail-closed");
assert.equal(failClosed.stopReason, "global-budget-stop");
assert.equal(failClosed.clientReadableDetail, "sanitized-stop-reason-only");
assert.doesNotMatch(JSON.stringify(failClosed), /owner|providerChannelId|liveChatId|access_token|refresh_token|Authorization|service_role/i);

const overCapStart = session.startCommentTranslatorSession({
  nowMs: Date.parse("2026-06-15T00:00:00.000Z"),
  plan: cappedBaseline.plan,
  callerAuthorization: {
    status: "authorized",
    ownerUserId: "server-only-owner-reference"
  },
  credentialReadiness: {
    status: "ready",
    credentialReferenceId: "ytcred_public_entitlement_reference"
  },
  activeSession: null,
  usage: cappedBaseline.usage,
  createSessionReferenceId: () => "cts_public_entitlement_reference"
});
assert.equal(overCapStart.status, "stopped");
assert.equal(overCapStart.stopReason, "ai-budget-stop");
assert.equal(overCapStart.providerTargetMetadata, "forbidden");
assert.equal(overCapStart.tokenValue, "never-returned-by-design");

assert.match(taskSource, /F5 public entitlement baseline/i, "task.md records F5 work");
assert.match(taskSource, /20,000 characters\/month/i, "task.md records the monthly cap as additive");
assert.match(taskSource, /Width checks skipped[\s\S]*no UI\/CSS\/rendered route\/visible layout change/i, "task.md records width-check skip reason");

for (const source of [entitlementSource, sessionRuntimeSource, usageLedgerSource, durableUsageSource, routeSource, actionSource, readinessDoc, gapAudit, taskSource]) {
  assert.doesNotMatch(
    source,
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+/i,
    "F5 inspected source excludes secret values, token values, authorization values, and private provider identifiers"
  );
}

const allowedChangedFiles = new Set([
  entitlementPath,
  sessionRuntimePath,
  routePath,
  actionPath,
  readinessDocPath,
  "scripts/comment-translator-public-entitlement-baseline-contract.mjs",
  taskPath
]);
for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `F5 change stays in allowed files: ${file}`);
}

console.log("comment translator public entitlement baseline contract checks passed");
