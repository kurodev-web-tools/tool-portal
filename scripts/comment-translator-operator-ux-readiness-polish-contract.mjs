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
const taskPath = "task.md";

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
const taskSource = read(taskPath);

assert.match(billingSource, /^import "server-only";/m, "billing runtime remains server-only");
assert.equal(
  billingRuntime.commentTranslatorOperatorUxReadinessContract?.implementationStage,
  "pre-main-task-18-operator-ux-readiness-polish",
  "Task 18 operator UX readiness contract is exported"
);
assert.equal(
  billingRuntime.commentTranslatorOperatorUxReadinessContract?.implementationEntitlementShape,
  "free-or-paid-only",
  "monthly/yearly presentation does not change server entitlement shape"
);
assert.equal(
  billingRuntime.commentTranslatorOperatorUxReadinessContract?.stripeLiveModeActions,
  "not-run-in-task-18",
  "Task 18 does not run Stripe live-mode actions"
);

const signedOutBillingSnapshot = await billingRuntime.readCommentTranslatorBillingEntitlementSnapshot({
  callerAuthorization: { status: "unauthenticated" }
});
const planComparison = billingRuntime.createCommentTranslatorPlanComparisonViewModel({
  billingState: "free",
  planEntitlement: billingRuntime.createCommentTranslatorBillingBrowserSafeViewModel({
    snapshot: signedOutBillingSnapshot,
    env: {}
  }).planEntitlement
});
assert.equal(planComparison.currentPlanId, "free", "free users see Free as current plan");
assert.equal(planComparison.planOptions.length, 3, "billing comparison exposes Free, Pro monthly, and Pro yearly");
assert.deepEqual(
  planComparison.planOptions.map((option) => option.id),
  ["free", "pro-monthly", "pro-yearly"],
  "plan option order is stable"
);
assert.equal(planComparison.planOptions[1].productName, "Kuro Stream Kit Pro");
assert.equal(planComparison.planOptions[1].badge.en, "Paid monthly");
assert.equal(planComparison.planOptions[2].badge.en, "Best value");
assert.equal(planComparison.planOptions[1].implementationEntitlement, "paid");
assert.equal(planComparison.planOptions[2].implementationEntitlement, "paid");
assert.ok(
  planComparison.planOptions[2].displayPrice.yearlyAmount < planComparison.planOptions[1].displayPrice.monthlyAmount * 12,
  "yearly display price is cheaper than 12 monthly payments"
);
assert.match(
  planComparison.advanceNoticeCopy.ja,
  /事前にお知らせします/,
  "plan copy records advance notice for price or content changes"
);
assert.doesNotMatch(
  `${planComparison.advanceNoticeCopy.ja}\n${planComparison.advanceNoticeCopy.en}`,
  /永久|forever|all future tools/i,
  "plan copy does not promise all future tools forever"
);

assert.match(billingShellSource, /data-comment-translator-plan-comparison="free-pro-monthly-yearly"/, "billing page renders plan comparison cards");
assert.match(billingShellSource, /Kuro Stream Kit Pro/, "billing page uses integrated Kuro Stream Kit Pro naming");
assert.match(billingShellSource, /price-content-advance-notice/, "billing page includes price/content change notice");

assert.match(dockSource, /data-comment-translator-start-blocked="youtube-connection-required"/, "translator renders explicit Start blocked surface");
assert.match(dockSource, /href="\/account\/integrations"/, "translator links blocked YouTube state to account integrations");
assert.match(dockSource, /startBlockedByCredentialStatus/, "translator derives disabled Start state from credential readiness");
assert.match(dockSource, /disabled=\{isSessionPending \|\| sessionState\.status === "active" \|\| startBlockedByCredentialStatus\}/, "Start button is disabled when YouTube is not ready");
assert.match(dockSource, /data-comment-translator-billing-entry="free-pro-plan-state"/, "translator plan entry shows Free/Pro plan state");

assert.match(integrationsShellSource, /Start が使えない場合|Start is unavailable/, "integrations copy explains it fixes Start availability");
assert.match(accountShellSource, /Kuro Stream Kit Pro|Free \/ Pro/, "account entry copy points to integrated plan naming");
assert.match(taskSource, /18\. Operator UX readiness polish/, "task board keeps Task 18 as the active implementation target");

const changedSurface = `${billingSource}\n${billingShellSource}\n${integrationsShellSource}\n${accountShellSource}\n${dockSource}`;

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
