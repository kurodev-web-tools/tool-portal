import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const policyPath = "lib/comment-translator-public-beta-access-gate-policy.ts";
const privateLaunchPath = "lib/comment-translator-private-launch-access-gate.ts";
const taskPath = "task.md";
const taskBoardPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_REMAINING_TASK_BOARD.md";
const decisionDocPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_ACCESS_GATE_DECISION.md";

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

function changedFiles() {
  const committedDiff = execSync("git diff --name-only origin/codex/comment-translator-free-public-beta-integration...HEAD", {
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
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|\bAuthorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+|SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+|ownerUserId\s*[:=]\s*["'][^"']+|providerTargetMetadata\s*[:=]\s*["'](?!forbidden["'])[^"']+|rawComment(?:Text|s)?\s*[:=]\s*["'][^"']+/i,
    `${label} does not expose secret, private account, provider, target, or raw comment values`
  );
}

for (const requiredPath of [policyPath, privateLaunchPath, taskPath, taskBoardPath, decisionDocPath]) {
  assert.ok(exists(requiredPath), `required Step 9 path exists: ${requiredPath}`);
}

const policySource = read(policyPath);
const privateLaunchSource = read(privateLaunchPath);
const task = read(taskPath);
const taskBoard = read(taskBoardPath);
const decisionDoc = read(decisionDocPath);
const combinedDocs = [task, taskBoard, decisionDoc].join("\n");
const policy = loadTsModule(policyPath);

assert.match(policySource, /^import "server-only";/m, "public beta access gate policy is server-only");
assert.match(privateLaunchSource, /allowedTesterPolicy:\s*"sha256-owner-user-id-allowlist"/, "current private launch gate remains hash allowlist based");
assert.equal(policy.commentTranslatorPublicBetaAccessGateDecisionContract.step, "public-launch-next-flow-step-9");
assert.equal(policy.commentTranslatorPublicBetaAccessGateDecisionContract.selectedGate, "login-only");
assert.equal(policy.commentTranslatorPublicBetaAccessGateDecisionContract.rejectedGate, "waitlist-approved-for-free-public-beta");
assert.equal(policy.commentTranslatorPublicBetaAccessGateDecisionContract.waitlistBoundary, "creator-paid-beta-only");
assert.equal(policy.commentTranslatorPublicBetaAccessGateDecisionContract.currentRuntimeGate, "server-owned-exact-activation-with-private-launch-default");
assert.equal(policy.commentTranslatorPublicBetaAccessGateDecisionContract.runtimeGateChange, "implemented-not-activated");
assert.equal(policy.commentTranslatorPublicBetaAccessGateDecisionContract.publicGateFlip, "not-run");
assert.equal(policy.commentTranslatorPublicBetaAccessGateDecisionContract.deployUpload, "not-run");
assert.equal(policy.commentTranslatorPublicBetaAccessGateDecisionContract.remoteMutation, "not-run");
assert.equal(policy.commentTranslatorPublicBetaAccessGateDecisionContract.browserStorage, "forbidden");
assert.equal(policy.commentTranslatorPublicBetaAccessGateDecisionContract.publicReleaseCapable, "no");

for (const marker of [
  "public_beta_access_gate_decision_status=complete",
  "public_beta_access_gate_selected=login-only",
  "login-only",
  "waitlist-approved",
  "creator-paid-beta-only",
  "current runtime gate unchanged",
  "public_release_capable=no",
  "public_gate_flip_status=not-run",
  "deploy/upload: not-run",
  "remote mutation: not-run",
  "width checks skipped"
]) {
  assert.match(combinedDocs, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `Step 9 docs record ${marker}`);
}

assert.doesNotMatch(
  combinedDocs,
  /public_beta_access_gate_selected=waitlist-approved/i,
  "Step 9 does not select waitlist-approved for Free public beta"
);
assert.doesNotMatch(combinedDocs, /public_release_capable=yes/i, "Step 9 does not mark public release capable");
assert.doesNotMatch(combinedDocs, /public gate flip: completed|deploy\/upload: completed|remote mutation: completed/i, "Step 9 does not record external mutation completion");

for (const [label, source] of [
  [policyPath, policySource],
  [privateLaunchPath, privateLaunchSource],
  [taskPath, task],
  [taskBoardPath, taskBoard],
  [decisionDocPath, decisionDoc]
]) {
  assertNoSensitiveValues(source, label);
}

const allowedChangedFiles = new Set([
  "app/account/actions.ts",
  "app/account/integrations/page.tsx",
  "app/api/comment-translator/session/route.ts",
  "app/api/comment-translator/youtube/credential-status/route.ts",
  "app/api/comment-translator/youtube/disconnect/route.ts",
  "app/api/comment-translator/youtube/oauth/callback/route.ts",
  "app/tools/comment-translator/account-actions.ts",
  "app/tools/comment-translator/page.tsx",
  "app/tools/comment-translator/session-actions.ts",
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6_PUBLIC_ACCESS_CHANGE_PREFLIGHT.md",
  "docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_OPERATOR_QA_CHECKLIST.md",
  "lib/comment-translator-private-launch-access-gate.ts",
  "scripts/comment-translator-login-only-runtime-access-contract.mjs",
  "scripts/comment-translator-private-launch-access-gate-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g6-public-access-change-preflight-contract.mjs",
  "scripts/comment-translator-session-start-stop-contract.mjs",
  "scripts/comment-translator-free-beta-usage-display-contract.mjs",
  policyPath,
  taskPath,
  taskBoardPath,
  decisionDocPath,
  "scripts/comment-translator-public-beta-access-gate-decision-contract.mjs",
  "scripts/comment-translator-public-launch-remaining-task-board-contract.mjs"
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `Step 9 change stays in allowed files: ${file}`);
  if (file.endsWith(".mjs")) continue;
  assertNoSensitiveValues(read(file), `changed file ${file}`);
}

console.log("comment translator public beta access gate decision contract checks passed");
