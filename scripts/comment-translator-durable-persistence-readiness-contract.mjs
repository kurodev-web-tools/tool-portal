import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const readinessRuntimePath = "lib/comment-translator-durable-persistence-readiness.ts";
const readinessDocPath = "docs/active/COMMENT_TRANSLATOR_DURABLE_PERSISTENCE_SCHEMA_READINESS.md";
const usageLedgerPath = "lib/comment-translator-usage-ledger-runtime.ts";
const sessionRuntimePath = "lib/comment-translator-session-runtime.ts";
const adminVisibilityPath = "lib/comment-translator-admin-operational-visibility.ts";
const abuseRuntimePath = "lib/comment-translator-abuse-rate-limit-runtime.ts";
const billingRuntimePath = "lib/comment-translator-billing-runtime.ts";
const stripeReadinessPath = "lib/comment-translator-stripe-live-readiness-runtime.ts";
const taskPath = "task.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function changedFiles() {
  const committedDiff = execSync("git diff --name-only origin/codex/comment-translator-preview...HEAD", {
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
    if (request === "server-only" || request === "stripe") {
      return {};
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

assert.ok(exists(readinessRuntimePath), "Task 23 durable persistence readiness runtime exists");
assert.ok(exists(readinessDocPath), "Task 23 durable persistence readiness doc exists");
assert.ok(exists(usageLedgerPath), "usage ledger runtime remains available");
assert.ok(exists(sessionRuntimePath), "session runtime remains available");
assert.ok(exists(adminVisibilityPath), "admin operational visibility runtime remains available");
assert.ok(exists(abuseRuntimePath), "abuse/rate-limit runtime remains available");
assert.ok(exists(stripeReadinessPath), "Stripe live readiness runtime remains available");

const readinessSource = read(readinessRuntimePath);
const readinessDoc = read(readinessDocPath);
const usageLedgerSource = read(usageLedgerPath);
const sessionRuntimeSource = read(sessionRuntimePath);
const adminVisibilitySource = read(adminVisibilityPath);
const abuseRuntimeSource = read(abuseRuntimePath);
const billingRuntimeSource = read(billingRuntimePath);
const stripeReadinessSource = read(stripeReadinessPath);
const taskSource = read(taskPath);

assert.match(readinessSource, /^import "server-only";/m, "Task 23 readiness runtime is server-only");
assert.match(readinessSource, /pre-main-task-23-durable-persistence-schema-readiness/, "runtime records Task 23 stage");
assert.match(readinessDoc, /^# Kuro Live Comment Translator Durable Persistence And Schema Migration Readiness$/m);

for (const requiredSection of [
  "## Purpose",
  "## Durable Decisions",
  "## Required Before Public Operation",
  "## In-Memory Fallback Boundaries",
  "## Approval-Gated Schema Proposal",
  "## Migration Ordering",
  "## Rollback Plan",
  "## Public Launch Blockers"
]) {
  assert.match(readinessDoc, new RegExp(`^${requiredSection}$`, "m"), `readiness doc includes ${requiredSection}`);
}

for (const requiredFragment of [
  "usage ledger durability",
  "session history",
  "entitlement persistence",
  "admin aggregates",
  "abuse/rate-limit buckets",
  "reference-only schema proposal",
  "same-thread/operator-local ready preflight",
  "sanitized output review",
  "explicit in-thread approval",
  "remote Supabase migration apply",
  "not run",
  "public-release capable: no"
]) {
  assert.match(readinessDoc, new RegExp(requiredFragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `readiness doc includes ${requiredFragment}`);
}

assert.match(usageLedgerSource, /storageStage:\s*"in-process-contract-foundation"/, "usage ledger still documents in-process storage");
assert.match(sessionRuntimeSource, /activeSessionsByOwner\s*=\s*new Map/, "session runtime still has in-memory active session state");
assert.match(abuseRuntimeSource, /createInMemoryCommentTranslatorAbuseRateLimitStoreForTests/, "abuse guard still has in-memory fallback store");
assert.match(adminVisibilitySource, /aggregate-and-reference-only/, "admin visibility remains aggregate/reference-only");
assert.match(stripeReadinessSource, /not-run-without-explicit-same-thread-approval/, "Stripe live actions remain approval-gated");

const readiness = loadTsModule(readinessRuntimePath);

assert.equal(
  readiness.commentTranslatorDurablePersistenceReadinessContract.implementationStage,
  "pre-main-task-23-durable-persistence-schema-readiness",
  "Task 23 readiness contract records implementation stage"
);
assert.equal(readiness.commentTranslatorDurablePersistenceReadinessContract.runtime, "server-only");
assert.equal(readiness.commentTranslatorDurablePersistenceReadinessContract.remoteSupabaseMigrationApply, "not-run-by-contract");
assert.equal(readiness.commentTranslatorDurablePersistenceReadinessContract.schemaProposal, "reference-only-approval-gated");
assert.equal(readiness.commentTranslatorDurablePersistenceReadinessContract.browserStorage, "unchanged-forbidden-for-private-values");
assert.equal(readiness.commentTranslatorDurablePersistenceReadinessContract.publicLaunchCapability, "blocked-until-approved-durable-store");

const decisions = readiness.commentTranslatorDurablePersistenceDecisions;
const decisionIds = decisions.map((decision) => decision.id).sort();
assert.deepEqual(
  decisionIds,
  [
    "abuse-rate-limit-buckets",
    "active-session-state",
    "admin-aggregates",
    "entitlement-state",
    "provider-target-metadata",
    "session-history",
    "usage-ledger"
  ].sort(),
  "Task 23 records every durable/in-memory decision"
);

for (const id of ["usage-ledger", "active-session-state", "session-history", "entitlement-state", "admin-aggregates", "abuse-rate-limit-buckets"]) {
  const decision = decisions.find((item) => item.id === id);
  assert.equal(decision.requiredForPublicOperation, true, `${id} is required before public operation`);
  assert.equal(decision.publicLaunchBlocker, true, `${id} remains a public launch blocker until durable backing is approved`);
}

const providerTargetDecision = decisions.find((item) => item.id === "provider-target-metadata");
assert.equal(providerTargetDecision.requiredForPublicOperation, false, "provider target metadata is not required as durable app state");
assert.equal(providerTargetDecision.persistenceDecision, "operator-local-server-only-consumption", "provider target metadata stays operator-local/server-only");
assert.equal(providerTargetDecision.clientReadableOutput, "forbidden", "provider target metadata never becomes client-readable");

const blockedReport = readiness.createCommentTranslatorDurablePersistenceReadinessReport({
  approvalGate: {
    finalSchemaReview: false,
    rollbackReview: false,
    explicitInThreadApproval: false,
    sanitizedOutputReview: false,
    remoteApplyPreflight: false
  }
});
assert.equal(blockedReport.overallStatus, "blocked-pending-approved-durable-store");
assert.equal(blockedReport.remoteSupabaseMigrationApplyStatus, "not-run");
assert.equal(blockedReport.publicLaunchAllowed, false);
assert.ok(blockedReport.publicLaunchBlockers.length >= 6, "blocked report keeps required durable blockers visible");
assert.doesNotMatch(
  JSON.stringify(blockedReport),
  /access_token|refresh_token|authorization_code|Bearer\s+\S+|service_role|liveChatId|providerChannelId|ownerUserId|sk_live|whsec/i,
  "readiness report excludes secret values and private identifiers"
);

const approvedReport = readiness.createCommentTranslatorDurablePersistenceReadinessReport({
  approvalGate: {
    finalSchemaReview: true,
    rollbackReview: true,
    explicitInThreadApproval: true,
    sanitizedOutputReview: true,
    remoteApplyPreflight: true
  }
});
assert.equal(
  approvedReport.remoteSupabaseMigrationApplyStatus,
  "approval-gate-complete-but-not-run-in-this-pr",
  "approval gate can become complete without this PR applying the migration"
);
assert.equal(approvedReport.publicLaunchAllowed, false, "Task 23 does not flip public launch state");

for (const requiredPhase of [
  "freeze-new-public-sessions",
  "create-durable-tables-and-policies",
  "dual-write-server-owned-events",
  "backfill-sanitized-history-from-available-local-evidence",
  "switch-enforcement-reads-to-durable-store",
  "keep-in-memory-fallback-fail-closed",
  "operator-verified-cutover"
]) {
  assert.ok(
    readiness.commentTranslatorDurablePersistenceMigrationOrdering.includes(requiredPhase),
    `migration ordering includes ${requiredPhase}`
  );
}

for (const source of [
  readinessSource,
  readinessDoc,
  taskSource,
  usageLedgerSource,
  sessionRuntimeSource,
  adminVisibilitySource,
  abuseRuntimeSource,
  billingRuntimeSource,
  stripeReadinessSource
]) {
  assert.doesNotMatch(
    source,
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+/i,
    "Task 23 inspected source does not contain secret values, token values, authorization values, or private provider identifiers"
  );
}

const allowedChangedFiles = new Set([
  readinessRuntimePath,
  readinessDocPath,
  "scripts/comment-translator-durable-persistence-readiness-contract.mjs",
  taskPath
]);
for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `Task 23 change stays in allowed files: ${file}`);
}

assert.match(taskSource, /Task 23[\s\S]*Durable persistence and schema migration readiness[\s\S]*Status: complete/i, "task.md records Task 23 completion");
assert.match(taskSource, /width checks skipped[\s\S]*no visible UI\/CSS\/layout change/i, "task.md records width-check skip reason");
assert.match(taskSource, /remote Supabase migration apply readiness.*not-applied-readiness-only/i, "task.md records remote schema apply as readiness only");

console.log("comment translator durable persistence readiness contract checks passed");
