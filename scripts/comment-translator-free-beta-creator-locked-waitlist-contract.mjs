import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const creatorPath = "lib/comment-translator-free-beta-creator-locked-waitlist.ts";
const actionsPath = "app/tools/comment-translator/actions.ts";
const componentPath = "components/comment-translator/CommentTranslatorDock.tsx";
const copyPath = "lib/comment-translator.ts";
const readinessDocPath = "docs/active/COMMENT_TRANSLATOR_DURABLE_PERSISTENCE_SCHEMA_READINESS.md";
const gapAuditPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md";
const taskPath = "task.md";
const sharedTsModuleCache = new Map();

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
  const sourcePath = path.join(root, relativePath);
  const originalLoad = Module._load;

  function compileTsModule(modulePath) {
    const normalizedModulePath = path.normalize(modulePath);
    if (sharedTsModuleCache.has(normalizedModulePath)) {
      return sharedTsModuleCache.get(normalizedModulePath).exports;
    }

    const source = fs.readFileSync(normalizedModulePath, "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022
      }
    }).outputText;
    const testModule = new Module(normalizedModulePath);
    sharedTsModuleCache.set(normalizedModulePath, testModule);
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

    if (request.startsWith("@/") && parent?.filename) {
      const candidate = path.join(root, `${request.slice(2)}.ts`);
      if (fs.existsSync(candidate)) {
        return compileTsModule(candidate);
      }
      const tsxCandidate = path.join(root, `${request.slice(2)}.tsx`);
      if (fs.existsSync(tsxCandidate)) {
        return compileTsModule(tsxCandidate);
      }
    }

    if (request.startsWith(".") && parent?.filename) {
      const candidate = path.resolve(path.dirname(parent.filename), `${request}.ts`);
      if (fs.existsSync(candidate)) {
        return compileTsModule(candidate);
      }
      const tsxCandidate = path.resolve(path.dirname(parent.filename), `${request}.tsx`);
      if (fs.existsSync(tsxCandidate)) {
        return compileTsModule(tsxCandidate);
      }
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return compileTsModule(sourcePath);
  } finally {
    Module._load = originalLoad;
  }
}

for (const requiredPath of [creatorPath, actionsPath, componentPath, copyPath, readinessDocPath, gapAuditPath, taskPath]) {
  assert.ok(exists(requiredPath), `F14 required file exists: ${requiredPath}`);
}

const creatorSource = read(creatorPath);
const actionsSource = read(actionsPath);
const componentSource = read(componentPath);
const copySource = read(copyPath);
const readinessDoc = read(readinessDocPath);
const gapAudit = read(gapAuditPath);
const taskSource = read(taskPath);

assert.match(creatorSource, /^import "server-only";/m, "F14 resolver is server-only");
assert.match(creatorSource, /commentTranslatorFreeBetaCreatorLockedWaitlistContract/, "F14 exposes a focused contract");
assert.match(creatorSource, /creatorPriceIntent/, "F14 carries Creator price intent");
assert.match(creatorSource, /lockedFeatureCards/, "F14 carries locked feature cards");
assert.match(creatorSource, /waitlist/, "F14 carries waitlist state");
assert.match(creatorSource, /clickTracking/, "F14 carries click tracking state");
assert.match(creatorSource, /publicLaunchAllowed:\s*false/, "F14 does not open public launch gate");
assert.match(actionsSource, /getCommentTranslatorCreatorLockedWaitlistAction/, "server action exposes sanitized Creator locked/waitlist state");
assert.match(actionsSource, /recordCommentTranslatorCreatorLockedClickAction/, "server action exposes sanitized click tracking path");
assert.match(componentSource, /data-comment-translator-creator-locked-waitlist="sanitized-creator-locked-waitlist-only"/, "UI renders sanitized Creator locked/waitlist panel");
assert.match(componentSource, /data-comment-translator-creator-click-tracking="sanitized-local-draft-only"/, "UI marks click tracking as sanitized local draft only");
assert.match(copySource, /creatorLockedWaitlist/, "localized copy includes F14 Creator locked/waitlist copy");
assert.match(readinessDoc, /F14 Creator locked cards \/ waitlist \/ click tracking/i, "durable readiness doc records F14");
assert.match(gapAudit, /F14[\s\S]*Creator locked cards/i, "gap audit keeps F14 visible");
assert.match(taskSource, /F14 Creator locked cards \/ waitlist \/ click tracking/i, "task.md records F14 work");

const creator = loadTsModule(creatorPath);
assert.equal(creator.commentTranslatorFreeBetaCreatorLockedWaitlistContract.implementationStage, "free-public-beta-f14-creator-locked-waitlist");
assert.equal(creator.commentTranslatorFreeBetaCreatorLockedWaitlistContract.runtime, "server-only");
assert.equal(creator.commentTranslatorFreeBetaCreatorLockedWaitlistContract.publicLaunchAllowed, false);
assert.equal(creator.commentTranslatorFreeBetaCreatorLockedWaitlistContract.paidAccessState, "not-live-closed-beta-waitlist-only");
assert.equal(creator.commentTranslatorFreeBetaCreatorLockedWaitlistContract.browserStorage, "unchanged");
assert.equal(creator.commentTranslatorFreeBetaCreatorLockedWaitlistContract.remoteSupabaseMutation, "not-run-by-codex-in-this-thread");

const available = creator.createCommentTranslatorFreeBetaCreatorLockedWaitlistState({
  durableSessionState: "ready",
  durableUsageState: "ready",
  entitlementState: "ready",
  providerReadinessState: "ready",
  nowMs: Date.parse("2026-06-16T00:00:00.000Z")
});
assert.equal(available.status, "locked");
assert.equal(available.unavailableReason, null);
assert.equal(available.creatorPriceIntent.currency, "JPY");
assert.equal(available.creatorPriceIntent.monthlyAmount, 980);
assert.equal(available.creatorPriceIntent.availability, "planned-closed-beta-not-live");
assert.equal(available.lockedFeatureCards.length >= 4, true);
assert.ok(available.lockedFeatureCards.every((card) => card.state === "locked"));
assert.equal(available.waitlist.status, "available");
assert.equal(available.waitlist.actionState, "enabled");
assert.equal(available.clickTracking.status, "local-draft-ready");
assert.equal(available.clickTracking.rawProviderPayload, "not-recorded-by-design");
assert.equal(available.clickTracking.browserStorage, "unchanged");
assert.equal(available.publicLaunchAllowed, false);

const unavailable = creator.createCommentTranslatorFreeBetaCreatorLockedWaitlistState({
  durableSessionState: "unreadable",
  durableUsageState: "ready",
  entitlementState: "ready",
  providerReadinessState: "ready",
  nowMs: Date.parse("2026-06-16T00:00:00.000Z")
});
assert.equal(unavailable.status, "unavailable");
assert.equal(unavailable.unavailableReason, "durable-session-unreadable");
assert.equal(unavailable.waitlist.status, "unavailable");
assert.equal(unavailable.waitlist.actionState, "disabled");
assert.equal(unavailable.clickTracking.status, "unavailable");
assert.equal(unavailable.clickTracking.recording, "not-run");
assert.equal(unavailable.publicLaunchAllowed, false);

const missingEntitlement = creator.createCommentTranslatorFreeBetaCreatorLockedWaitlistState({
  durableSessionState: "ready",
  durableUsageState: "ready",
  entitlementState: "missing",
  providerReadinessState: "ready",
  nowMs: Date.parse("2026-06-16T00:00:00.000Z")
});
assert.equal(missingEntitlement.status, "unavailable");
assert.equal(missingEntitlement.unavailableReason, "missing-entitlement");
assert.equal(missingEntitlement.clickTracking.recording, "not-run");

const clickDraft = creator.createCommentTranslatorFreeBetaCreatorClickDraft({
  state: available,
  intent: "waitlist-click",
  featureId: "creator-ai-natural-translation",
  nowMs: Date.parse("2026-06-16T00:00:01.000Z")
});
assert.equal(clickDraft.status, "recorded-local-draft");
assert.equal(clickDraft.persistence, "not-run-remote-mutation-requires-explicit-approval");
assert.equal(clickDraft.intent, "waitlist-click");
assert.equal(clickDraft.featureId, "creator-ai-natural-translation");
assert.equal(clickDraft.browserStorage, "unchanged");

const blockedClickDraft = creator.createCommentTranslatorFreeBetaCreatorClickDraft({
  state: unavailable,
  intent: "feature-card-click",
  featureId: "creator-obs-overlay",
  nowMs: Date.parse("2026-06-16T00:00:01.000Z")
});
assert.equal(blockedClickDraft.status, "unavailable");
assert.equal(blockedClickDraft.unavailableReason, "durable-session-unreadable");
assert.equal(blockedClickDraft.persistence, "not-run");

for (const payload of [available, unavailable, missingEntitlement, clickDraft, blockedClickDraft]) {
  const serialized = JSON.stringify(payload);
  for (const forbiddenValue of [
    "access_token",
    "refresh_token",
    "authorization_code",
    "service_role",
    "Authorization",
    "liveChatId",
    "providerChannelId",
    "provider-target-metadata",
    "nextPageToken",
    "authorChannelId",
    "profileImageUrl",
    "raw comment",
    "raw-provider"
  ]) {
    assert.doesNotMatch(serialized, new RegExp(forbiddenValue, "i"), `F14 sanitized output excludes ${forbiddenValue}`);
  }
}

const allowedChangedFiles = new Set([
  creatorPath,
  actionsPath,
  componentPath,
  copyPath,
  readinessDocPath,
  gapAuditPath,
  "scripts/comment-translator-free-beta-creator-locked-waitlist-contract.mjs",
  taskPath
]);
for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `F14 change stays in allowed files: ${file}`);

  if (file.endsWith(".mjs")) {
    continue;
  }

  const source = read(file);
  assert.doesNotMatch(
    source,
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+/i,
    `${file} does not contain secret values, token values, authorization values, or private provider identifiers`
  );
}

console.log("comment translator Free beta Creator locked waitlist contract checks passed");
