import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const billingRuntimePath = "lib/comment-translator-billing-runtime.ts";
const billingShellPath = "components/account/AccountBillingShell.tsx";
const integrationsShellPath = "components/account/AccountIntegrationsShell.tsx";
const accountShellPath = "components/account/AccountPreferencesShell.tsx";
const dockPath = "components/comment-translator/CommentTranslatorDock.tsx";
const sessionPanelPath = "components/comment-translator/CommentTranslatorSessionPanel.tsx";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function loadTsModule(relativePath) {
  const moduleCache = new Map();
  const originalLoad = Module._load;

  function resolveAlias(request) {
    if (request.startsWith("@/")) {
      const withoutAlias = request.slice(2);
      for (const extension of [".ts", ".tsx"]) {
        const candidate = path.join(root, `${withoutAlias}${extension}`);
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      }
    }

    return null;
  }

  function compileTsModule(modulePath) {
    const normalizedModulePath = path.normalize(modulePath);
    if (moduleCache.has(normalizedModulePath)) {
      return moduleCache.get(normalizedModulePath).exports;
    }

    const compiled = ts.transpileModule(fs.readFileSync(normalizedModulePath, "utf8"), {
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
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
    if (request === "server-only" || request === "next/navigation" || request === "next/headers") {
      return {};
    }

    const aliasPath = resolveAlias(request);
    if (aliasPath) {
      return compileTsModule(aliasPath);
    }

    if (request.startsWith(".") && parent?.filename) {
      for (const extension of [".ts", ".tsx"]) {
        const candidate = path.resolve(path.dirname(parent.filename), `${request}${extension}`);
        if (fs.existsSync(candidate)) {
          return compileTsModule(candidate);
        }
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

const billingRuntime = loadTsModule(billingRuntimePath);
const billingSource = read(billingRuntimePath);
const billingShellSource = read(billingShellPath);
const integrationsShellSource = read(integrationsShellPath);
const accountShellSource = read(accountShellPath);
const dockSource = read(dockPath);
const sessionPanelSource = read(sessionPanelPath);

assert.match(billingSource, /^import "server-only";/m, "billing runtime remains server-only");
assert.equal(
  billingRuntime.commentTranslatorOperatorUxReadinessContract?.implementationStage,
  "comment-translator-paid-v1-task1-free-baseline-isolation",
  "Task 1 Free baseline isolation contract is exported"
);
assert.equal(
  billingRuntime.commentTranslatorOperatorUxReadinessContract?.implementationEntitlementShape,
  "free-only-until-durable-paid-entitlement",
  "operator UX stays Free-only until durable Paid entitlement exists"
);
assert.equal(
  billingRuntime.commentTranslatorOperatorUxReadinessContract?.stripeLiveModeActions,
  "not-run",
  "Task 1 does not run Stripe live-mode actions"
);

const planComparison = billingRuntime.createCommentTranslatorPlanComparisonViewModel({
  billingState: "free",
  planEntitlement: billingRuntime.createCommentTranslatorBillingBrowserSafeViewModel({
    snapshot: billingRuntime.readCommentTranslatorBillingEntitlementSnapshot({
      callerAuthorization: { status: "unauthenticated" }
    }),
    env: {}
  }).planEntitlement
});
assert.equal(planComparison.currentPlanId, "free", "free users see Free as current plan");
assert.equal(planComparison.planOptions.length, 1, "billing comparison exposes Free only");
assert.deepEqual(
  planComparison.planOptions.map((option) => option.id),
  ["free"],
  "Free-only plan option is stable"
);
assert.equal(planComparison.planOptions[0].productName, "Free");
assert.equal(planComparison.planOptions[0].implementationEntitlement, "free");
assert.match(
  planComparison.advanceNoticeCopy.ja,
  /Paid Core v1[\s\S]*利用不可/,
  "plan copy explicitly records Paid Core v1 as unavailable"
);
assert.doesNotMatch(
  `${planComparison.advanceNoticeCopy.ja}\n${planComparison.advanceNoticeCopy.en}`,
  /永久|forever|all future tools/i,
  "plan copy does not promise all future tools forever"
);

assert.match(billingShellSource, /data-comment-translator-plan-comparison="free-only-paid-unavailable"/, "billing page renders Free-only and Paid-unavailable comparison");
assert.match(billingShellSource, /paidCoreV1Availability/, "billing page renders the browser-safe Paid Core v1 availability boundary");
assert.doesNotMatch(billingShellSource, /Kuro Stream Kit Pro|Free \/ Pro|Pro inactive|月額|年額|OpenAI mini|¥0/, "billing page removes old Paid presentation");
assert.match(billingShellSource, /paid-core-v1-availability/, "billing page includes the Paid Core v1 availability notice");

assert.match(sessionPanelSource, /data-comment-translator-start-blocked="youtube-connection-required"/, "translator renders explicit Start blocked surface");
assert.match(sessionPanelSource, /href="\/account\/integrations"/, "translator links blocked YouTube state to account integrations");
assert.match(sessionPanelSource, /startBlockedByCredentialStatus/, "translator derives disabled Start state from credential readiness");
assert.match(sessionPanelSource, /disabled=\{isSessionPending \|\| sessionState\.status === "active" \|\| startBlockedByCredentialStatus \|\| startBlockedByUsagePolicy \|\| startBlockedByRateLimit\}/, "Start button is disabled when credential, usage policy, or rate limit readiness blocks it");

assert.match(integrationsShellSource, /Start が使えない場合|Start is unavailable/, "integrations copy explains it fixes Start availability");
assert.match(accountShellSource, /Free \/ Paid Core v1 unavailable/, "account entry copy points to Free and explicit Paid unavailability");
assert.doesNotMatch(accountShellSource, /Kuro Stream Kit Pro|Free \/ Pro|Pro inactive|月額|年額/, "account entry removes old Paid presentation");

const changedSurface = `${billingSource}\n${billingShellSource}\n${integrationsShellSource}\n${accountShellSource}\n${dockSource}\n${sessionPanelSource}`;

assert.doesNotMatch(
  changedSurface,
  /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+/i,
  "Task 18 source does not contain Stripe secret values, provider credentials, provider targets, authorization values, or private keys"
);
assert.doesNotMatch(
  changedSurface,
  /localStorage\.|indexedDB\.|sessionStorage\.|youtube\.googleapis|OAuth2Client|GoogleAuth|from\s+["']googleapis["']|require\(["']googleapis["']\)|liveChatMessages|setInterval|EventSource|WebSocket/i,
  "Task 18 source does not add browser storage, live provider execution, or background monitoring"
);

console.log("comment translator operator UX readiness polish contract checks passed");
