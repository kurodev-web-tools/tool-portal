import assert from "node:assert/strict";
import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const policyPath = "lib/comment-translator-public-traffic-rate-limit-backing-policy.ts";
const abuseRuntimePath = "lib/comment-translator-abuse-rate-limit-runtime.ts";
const taskPath = "task.md";
const taskBoardPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_REMAINING_TASK_BOARD.md";
const decisionDocPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_TRAFFIC_RATE_LIMIT_BACKING_DECISION.md";
const checklistPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_OPERATOR_QA_CHECKLIST.md";
const operationsDocPath = "docs/active/COMMENT_TRANSLATOR_CLOUDFLARE_CUSTOM_RULE_OPERATIONS.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
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

function isAncestor(ancestor, descendant) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", ancestor, descendant], {
      cwd: root,
      stdio: "ignore"
    });
    return true;
  } catch (error) {
    if (error && typeof error === "object" && error.status === 1) return false;
    throw error;
  }
}

function selectCommittedDiffBase(integrationIsPromoted, branchContainsMain, integrationDiffBase) {
  return integrationIsPromoted && branchContainsMain ? "origin/main" : integrationDiffBase;
}

function changedFiles() {
  const integrationDiffBase = "origin/codex/comment-translator-free-public-beta-integration";
  assert.equal(
    selectCommittedDiffBase(false, true, integrationDiffBase),
    integrationDiffBase,
    "a pre-promotion integration branch retains the integration diff base"
  );
  assert.equal(
    selectCommittedDiffBase(true, false, integrationDiffBase),
    integrationDiffBase,
    "a branch not containing promoted main retains the integration diff base"
  );
  assert.equal(
    selectCommittedDiffBase(true, true, integrationDiffBase),
    "origin/main",
    "a post-promotion branch based on main uses the main diff base"
  );
  const integrationIsPromoted = isAncestor(integrationDiffBase, "origin/main");
  const branchContainsMain = isAncestor("origin/main", "HEAD");
  const committedDiffBase = selectCommittedDiffBase(
    integrationIsPromoted,
    branchContainsMain,
    integrationDiffBase
  );
  const committedDiff = execSync(`git diff --name-only ${committedDiffBase}...HEAD`, {
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

function assertNoSensitiveValues(source, label) {
  assert.doesNotMatch(
    source,
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|\bAuthorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+|SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+|ownerUserId\s*[:=]\s*["'](?!server-only-owner-value["'])[^"']+|providerTargetMetadata\s*[:=]\s*["'](?!forbidden["'])[^"']+|rawComment(?:Text|s)?\s*[:=]\s*["'][^"']+/i,
    `${label} does not expose secret, private account, provider, target, or raw comment values`
  );
}

for (const requiredPath of [policyPath, abuseRuntimePath, taskPath, taskBoardPath, decisionDocPath, operationsDocPath]) {
  assert.ok(exists(requiredPath), `required Step 10 path exists: ${requiredPath}`);
}

const policySource = read(policyPath);
const abuseRuntimeSource = read(abuseRuntimePath);
const task = read(taskPath);
const taskBoard = read(taskBoardPath);
const decisionDoc = read(decisionDocPath);
const operationsDoc = read(operationsDocPath);
const combinedDocs = [task, taskBoard, decisionDoc, operationsDoc].join("\n");
const policy = loadTsModule(policyPath);
const abuseRuntime = loadTsModule(abuseRuntimePath);

assert.match(policySource, /^import "server-only";/m, "public traffic rate-limit backing policy is server-only");
assert.match(abuseRuntimeSource, /COMMENT_TRANSLATOR_EDGE_RATE_LIMITING/, "existing abuse runtime keeps Cloudflare edge control reference");
assert.equal(policy.commentTranslatorPublicTrafficRateLimitBackingContract.step, "public-launch-next-flow-step-10");
assert.equal(policy.commentTranslatorPublicTrafficRateLimitBackingContract.selectedBacking, "cloudflare-edge");
assert.equal(policy.commentTranslatorPublicTrafficRateLimitBackingContract.rejectedBacking, "supabase-durable-rate-limit-table");
assert.equal(policy.commentTranslatorPublicTrafficRateLimitBackingContract.riskAcceptance, "not-selected");
assert.equal(policy.commentTranslatorPublicTrafficRateLimitBackingContract.currentInAppGuardRole, "defense-in-depth");
assert.equal(policy.commentTranslatorPublicTrafficRateLimitBackingContract.edgeActivationStatus, "not-run-approval-gated");
assert.equal(policy.commentTranslatorPublicTrafficRateLimitBackingContract.deployUpload, "not-run");
assert.equal(policy.commentTranslatorPublicTrafficRateLimitBackingContract.remoteMutation, "not-run");
assert.equal(policy.commentTranslatorPublicTrafficRateLimitBackingContract.publicReleaseCapable, "no");
assert.equal(abuseRuntime.commentTranslatorAbuseRateLimitContract.edgeControlReference, "COMMENT_TRANSLATOR_EDGE_RATE_LIMITING");

for (const marker of [
  "public_traffic_rate_limit_backing_status=complete",
  "public_traffic_rate_limit_backing_selected=cloudflare-edge",
  "supabase_rate_limit_table_status=not-created",
  "rate_limit_risk_acceptance_status=not-selected",
  "edge_activation_status=not-run-approval-gated",
  "in_app_rate_limit_guard_role=defense-in-depth",
  "public_release_capable=no",
  "public_gate_flip_status=not-run",
  "deploy/upload: not-run",
  "remote mutation: not-run",
  "width checks skipped",
  "COMMENT_TRANSLATOR_CLOUDFLARE_CUSTOM_RULE_OPERATIONS.md",
  "api_protection_preference_order=app-quotas-session-caps-rate-guards-then-cloudflare-rate-limiting-then-managed-challenge-emergency-or-html-only",
  "operator_production_api_managed_challenge_status=not-selected"
]) {
  assert.match(combinedDocs, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `Step 10 docs record ${marker}`);
}

assert.doesNotMatch(combinedDocs, /public_traffic_rate_limit_backing_selected=supabase/i, "Step 10 does not select Supabase durable backing");
assert.doesNotMatch(combinedDocs, /rate_limit_risk_acceptance_status=accepted/i, "Step 10 does not accept abuse-control risk");
assert.doesNotMatch(combinedDocs, /public_release_capable=yes/i, "Step 10 does not mark public release capable");
assert.doesNotMatch(combinedDocs, /Cloudflare edge activation: completed|public gate flip: completed|deploy\/upload: completed|remote mutation: completed/i, "Step 10 does not record external mutation completion");

for (const [label, source] of [
  [policyPath, policySource],
  [abuseRuntimePath, abuseRuntimeSource],
  [taskPath, task],
  [taskBoardPath, taskBoard],
  [decisionDocPath, decisionDoc],
  [operationsDocPath, operationsDoc]
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  policyPath,
  taskPath,
  taskBoardPath,
  decisionDocPath,
  operationsDocPath,
  checklistPath,
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G5_PUBLIC_LAUNCH_GATE_DECISION.md",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6_PUBLIC_ACCESS_CHANGE_PREFLIGHT.md",
  "app/api/comment-translator/free-beta/route-api-harness/route.ts",
  "scripts/comment-translator-cloudflare-custom-rule-operations-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g2a-server-action-route-api-harness-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g5-public-launch-gate-decision-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g6-public-access-change-preflight-contract.mjs",
  "scripts/comment-translator-monthly-input-character-accounting-contract.mjs",
  "scripts/comment-translator-per-minute-auto-resume-contract.mjs",
  "scripts/comment-translator-public-traffic-rate-limit-backing-contract.mjs",
  "scripts/comment-translator-session-start-stop-contract.mjs",
  "scripts/comment-translator-abuse-rate-limit-hardening-contract.mjs",
  "scripts/comment-translator-public-launch-remaining-task-board-contract.mjs",
  "scripts/comment-translator-public-launch-operator-qa-checklist-contract.mjs",
  "docs/active/COMMENT_TRANSLATOR_YOUTUBE_OAUTH_ALLOWED_TESTER_CONNECTION_SMOKE_READINESS.md"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `Step 10 change stays in allowed files: ${file}`);
  if (file.endsWith(".mjs")) continue;
  if (file !== "scripts/comment-translator-abuse-rate-limit-hardening-contract.mjs") {
    assertNoSensitiveValues(read(file), `changed file ${file}`);
  }
}

console.log("comment translator public traffic rate-limit backing contract checks passed");
