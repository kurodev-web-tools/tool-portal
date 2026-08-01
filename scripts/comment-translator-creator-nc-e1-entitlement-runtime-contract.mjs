import assert from "node:assert/strict";
import fs from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import path from "node:path";

const root = process.cwd();
const runtimePath = "lib/comment-translator-creator-entitlement-runtime.ts";
const actionContextPath = "app/tools/comment-translator/action-context.ts";
const storePath = "lib/comment-translator-creator-entitlement-store.ts";

assert.ok(fs.existsSync(path.join(root, runtimePath)), "NC-E1 entitlement runtime exists");

const runtimeSource = read(runtimePath);
const actionContextSource = read(actionContextPath);
const storeSource = read(storePath);

assert.match(runtimeSource, /^import "server-only";/, "NC-E1 runtime is server-only");
assert.match(
  runtimeSource,
  /CommentTranslatorCreatorEntitlementStore/,
  "NC-E1 runtime consumes the NC-D1 store contract"
);
assert.doesNotMatch(
  runtimeSource,
  /\bnew Map\b|\bMap<|localStorage|sessionStorage|indexedDB|createClient\s*\(|fetch\s*\(|applySignedEvidence|process\.env|console\./,
  "NC-E1 adds no in-memory, browser, provider, write, configuration, or logging authority"
);
assert.match(
  actionContextSource,
  /export async function readCommentTranslatorCreatorActionCallerAuthority\(\)/,
  "action context derives Creator caller authority without browser input"
);
assert.match(
  actionContextSource,
  /readCommentTranslatorActionCallerAuthorization\(\)/,
  "Creator caller authority reuses the existing server-side auth read"
);
assert.doesNotMatch(
  readAppRuntimeSources(),
  /createTrustedCommentTranslatorCreatorEntitlementStore\s*\(|createCommentTranslatorCreatorEntitlementRuntime\s*\(/,
  "existing app routes do not invoke the unapplied NC-D1 production store"
);
assert.match(storeSource, /product_compatibility_key !== "comment_translator_creator_v1"/, "NC-D1 rejects product mismatch");
assert.match(storeSource, /price_compatibility_key !== "creator_monthly_jpy_980_v1"/, "NC-D1 rejects price mismatch");
assert.match(storeSource, /return createPaidInactiveRead\("malformed"\)/, "NC-D1 normalizes malformed or mismatched rows fail-closed");

const executableSource = stripTypeScriptTypes(runtimeSource.replace('import "server-only";', ""), {
  mode: "transform"
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(executableSource).toString("base64")}`;
const runtimeModule = await import(moduleUrl);

const unauthenticatedStore = createFixtureStore({
  status: "paid-inactive",
  entitlement: null,
  authority: "fail-closed",
  reason: "missing"
});
const unauthenticatedRuntime = runtimeModule.createCommentTranslatorCreatorEntitlementRuntime({
  entitlementStore: unauthenticatedStore.store
});
assert.deepEqual(
  await unauthenticatedRuntime.resolve(
    runtimeModule.authorizeCommentTranslatorCreatorCaller({ callerUserId: null })
  ),
  expectedFree("caller-not-authenticated")
);
assert.equal(unauthenticatedStore.readCount(), 0, "unauthenticated callers cannot read paid authority");

const unavailableRuntime = runtimeModule.createCommentTranslatorCreatorEntitlementRuntime({
  entitlementStore: unauthenticatedStore.store
});
assert.deepEqual(
  await unavailableRuntime.resolve(
    runtimeModule.authorizeCommentTranslatorCreatorCaller({ callerUserId: null, authUnavailable: true })
  ),
  expectedFree("auth-unavailable")
);
assert.equal(unauthenticatedStore.readCount(), 0, "unavailable auth cannot read paid authority");

const privateReferences = ["fixture-private-entitlement"];
const activeStore = createFixtureStore({
  status: "ready",
  entitlement: {
    entitlementReferenceId: privateReferences[0],
    plan: "creator",
    status: "active",
    periodStartIso: "2026-08-01T00:00:00.000Z",
    periodEndIso: "2026-09-01T00:00:00.000Z",
    lastEvidenceAtIso: "2026-08-01T00:00:00.000Z"
  },
  authority: "signed-stripe-evidence"
});
const activeProjection = await runtimeModule
  .createCommentTranslatorCreatorEntitlementRuntime({ entitlementStore: activeStore.store })
  .resolve(runtimeModule.authorizeCommentTranslatorCreatorCaller({ callerUserId: "fixture-server-derived-owner" }));
assert.deepEqual(activeProjection, expectedPaidInactive("activation-closed"));
assert.equal(activeStore.ownerUserId(), "fixture-server-derived-owner", "store read uses only server-derived owner authority");
for (const privateReference of privateReferences) {
  assert.doesNotMatch(JSON.stringify(activeProjection), new RegExp(privateReference), "private references stay server-only");
}

for (const fixture of [
  ["missing", "missing", "entitlement-missing"],
  ["unreadable", "unreadable", "entitlement-unreadable"],
  ["malformed", "malformed", "entitlement-invalid"],
  ["mismatched", "malformed", "entitlement-invalid"],
  ["inactive", "inactive", "entitlement-inactive"],
  ["expired", "stale", "entitlement-expired"]
]) {
  const fixtureStore = createFixtureStore({
    status: "paid-inactive",
    entitlement: null,
    authority: "fail-closed",
    reason: fixture[1]
  });
  const projection = await runtimeModule
    .createCommentTranslatorCreatorEntitlementRuntime({ entitlementStore: fixtureStore.store })
    .resolve(runtimeModule.authorizeCommentTranslatorCreatorCaller({ callerUserId: "fixture-server-derived-owner" }));
  assert.deepEqual(projection, expectedPaidInactive(fixture[2]), `${fixture[0]} entitlement fails closed`);
}

assert.deepEqual(runtimeModule.commentTranslatorCreatorEntitlementRuntimeContract, {
  implementationStage: "nc-e1-local-entitlement-runtime",
  runtime: "server-only",
  callerAuthority: "server-derived-action-context-only",
  paidAuthority: "nc-d1-durable-store-only",
  writeAuthority: "signed-stripe-webhook-evidence-only",
  activationPolicy: "fixed-closed",
  productionStoreWiring: "disconnected-until-migration-apply-approved",
  browserAuthority: "ignored",
  browserProjection: "sanitized-free-or-paid-inactive-only",
  providerExecution: "forbidden",
  containerFallback: "forbidden"
});

process.stdout.write("comment translator NC-E1 entitlement runtime contract passed\n");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function readAppRuntimeSources() {
  return fs
    .readdirSync(path.join(root, "app"), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(?:ts|tsx)$/.test(entry.name))
    .map((entry) => fs.readFileSync(path.join(entry.parentPath, entry.name), "utf8"))
    .join("\n");
}

function createFixtureStore(readResult) {
  let reads = 0;
  let requestedOwnerUserId = null;
  return {
    store: {
      async readEntitlement({ ownerUserId }) {
        reads += 1;
        requestedOwnerUserId = ownerUserId;
        return readResult;
      },
      async applySignedEvidence() {
        throw new Error("NC-E1 fixture must never write entitlement evidence");
      }
    },
    readCount: () => reads,
    ownerUserId: () => requestedOwnerUserId
  };
}

function expectedFree(reason) {
  return {
    status: "free",
    reason,
    plan: "free",
    creatorAccess: false,
    paidActivation: "closed",
    entitlementAuthority: "not-read",
    providerExecutionAllowed: false,
    persistenceAllowed: false,
    browserAuthority: "ignored"
  };
}

function expectedPaidInactive(reason) {
  return {
    status: "paid-inactive",
    reason,
    plan: "free",
    creatorAccess: false,
    paidActivation: "closed",
    entitlementAuthority: "nc-d1-durable-store",
    providerExecutionAllowed: false,
    persistenceAllowed: false,
    browserAuthority: "ignored"
  };
}
