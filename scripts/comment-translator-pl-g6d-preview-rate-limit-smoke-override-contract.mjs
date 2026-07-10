import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";

const root = process.cwd();
const overridePath = "lib/comment-translator-free-beta-preview-rate-limit-smoke-override.ts";
const accessGatePath = "lib/comment-translator-private-launch-access-gate.ts";
const entitlementPath = "lib/comment-translator-public-entitlement-baseline.ts";
const usageDisplayPath = "lib/comment-translator-free-beta-usage-display.ts";
const usageLedgerPath = "lib/comment-translator-usage-ledger-runtime.ts";
const providerRuntimePath = "lib/comment-translator-provider-execution-runtime.ts";
const operatorDocPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G6D_PREVIEW_RATE_LIMIT_SMOKE_OVERRIDE.md";
const taskPath = "task.md";

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function loadTsModule(relativePath) {
  const moduleCache = new Map();
  const originalLoad = Module._load;

  function compileTsModule(modulePath) {
    const normalizedModulePath = path.normalize(modulePath);
    const cached = moduleCache.get(normalizedModulePath);
    if (cached) {
      return cached.exports;
    }

    let compiled = Module.stripTypeScriptTypes(fs.readFileSync(normalizedModulePath, "utf8"), {
      mode: "transform",
      sourceMap: false
    });
    const exportedNames = [];
    compiled = compiled.replace(/^import\s+"[^"]+";\s*$/gm, "");
    compiled = compiled.replace(/import\s+\{([\s\S]*?)\}\s+from\s+"([^"]+)";/g, "const {$1} = require(\"$2\");");
    compiled = compiled.replace(/import\s+(\w+)\s+from\s+"([^"]+)";/g, "const $1 = require(\"$2\");");
    compiled = compiled.replace(/export\s+const\s+(\w+)/g, (_, name) => {
      exportedNames.push(name);
      return `const ${name}`;
    });
    compiled = compiled.replace(/export\s+function\s+(\w+)/g, (_, name) => {
      exportedNames.push(name);
      return `function ${name}`;
    });
    compiled += `\nObject.assign(exports, { ${exportedNames.join(", ")} });\n`;
    const testModule = new Module(normalizedModulePath.replace(/\.ts$/, ".cjs"));
    moduleCache.set(normalizedModulePath, testModule);
    testModule.filename = normalizedModulePath.replace(/\.ts$/, ".cjs");
    testModule.paths = Module._nodeModulePaths(path.dirname(normalizedModulePath));
    testModule._compile(compiled, testModule.filename);
    return testModule.exports;
  }

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "server-only") {
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

for (const requiredPath of [
  overridePath,
  accessGatePath,
  entitlementPath,
  usageDisplayPath,
  usageLedgerPath,
  providerRuntimePath,
  operatorDocPath,
  taskPath
]) {
  assert.ok(exists(requiredPath), `PL-G6D required file exists: ${requiredPath}`);
}

const override = loadTsModule(overridePath);
const entitlementSource = fs.readFileSync(path.join(root, entitlementPath), "utf8");
const usageDisplaySource = fs.readFileSync(path.join(root, usageDisplayPath), "utf8");
const usageLedgerSource = fs.readFileSync(path.join(root, usageLedgerPath), "utf8");
const providerRuntimeSource = fs.readFileSync(path.join(root, providerRuntimePath), "utf8");
const operatorDocSource = fs.readFileSync(path.join(root, operatorDocPath), "utf8");
const taskSource = fs.readFileSync(path.join(root, taskPath), "utf8");
const allowedAccess = {
  status: "allowed",
  access: "allowed-tester",
  browserReadableOutput: "sanitized-private-launch-access-metadata-only"
};
const blockedAccess = {
  status: "blocked",
  reason: "private-launch-gate",
  access: "blocked",
  launchAccess: "private-launch-gated",
  browserReadableOutput: "sanitized-private-launch-access-metadata-only",
  tokenValue: "never-returned-by-design",
  providerTargetMetadata: "forbidden"
};

assert.equal(override.commentTranslatorFreeBetaPreviewRateLimitSmokeOverrideContract.runtime, "server-only");
assert.equal(override.commentTranslatorFreeBetaPreviewRateLimitSmokeOverrideContract.defaultTranslatedMessagesPerMinute, 30);
assert.equal(override.commentTranslatorFreeBetaPreviewRateLimitSmokeOverrideContract.smokeTranslatedMessagesPerMinute, 5);

for (const env of [
  {},
  { COMMENT_TRANSLATOR_FREE_BETA_PREVIEW_RATE_LIMIT_SMOKE: "5" },
  { COMMENT_TRANSLATOR_FREE_BETA_PREVIEW_RATE_LIMIT_SMOKE: "malformed-marker" },
  {
    COMMENT_TRANSLATOR_FREE_BETA_PREVIEW_RATE_LIMIT_SMOKE: override.commentTranslatorFreeBetaPreviewRateLimitSmokeOverrideContract.markerLabel,
    COMMENT_TRANSLATOR_CLOUDFLARE_RUNTIME_CHANNEL: "production"
  }
]) {
  const inactive = override.resolveCommentTranslatorFreeBetaPreviewRateLimitSmokeOverride({
    env,
    privateLaunchAccess: allowedAccess
  });
  assert.equal(inactive.status, "inactive", "unset, malformed, numeric-only, and production marker states stay inactive");
  assert.equal(inactive.translatedMessagesPerMinute, 30, "inactive state keeps the normal Free limit");
}

const active = override.resolveCommentTranslatorFreeBetaPreviewRateLimitSmokeOverride({
  env: {
    COMMENT_TRANSLATOR_FREE_BETA_PREVIEW_RATE_LIMIT_SMOKE: override.commentTranslatorFreeBetaPreviewRateLimitSmokeOverrideContract.markerLabel,
    COMMENT_TRANSLATOR_CLOUDFLARE_RUNTIME_CHANNEL: "cloudflare-preview"
  },
  privateLaunchAccess: allowedAccess
});
assert.equal(active.status, "active", "exact marker, Cloudflare preview channel, and allowed tester activate the bounded override");
assert.equal(active.translatedMessagesPerMinute, 5);

const unauthorized = override.resolveCommentTranslatorFreeBetaPreviewRateLimitSmokeOverride({
  env: {
    COMMENT_TRANSLATOR_FREE_BETA_PREVIEW_RATE_LIMIT_SMOKE: override.commentTranslatorFreeBetaPreviewRateLimitSmokeOverrideContract.markerLabel,
    COMMENT_TRANSLATOR_CLOUDFLARE_RUNTIME_CHANNEL: "cloudflare-preview"
  },
  privateLaunchAccess: blockedAccess
});
assert.equal(unauthorized.status, "inactive", "non-allowed callers cannot activate the smoke override");
assert.equal(unauthorized.translatedMessagesPerMinute, 30);

assert.match(entitlementSource, /previewRateLimitSmokeOverride/, "entitlement baseline consumes the smoke override");
assert.match(entitlementSource, /translatedMessagesPerMinute/, "entitlement baseline remains the per-minute limit authority");
assert.match(usageDisplaySource, /usage\.planEntitlement\.translatedMessagesPerMinute/, "usage display reads the server-owned entitlement limit");
assert.match(providerRuntimeSource, /remainingMinuteCapacity/, "provider runtime derives pre-provider capacity from the entitlement");
assert.match(providerRuntimeSource, /if \(remainingMinuteCapacity <= 0\)/, "cap-overflow eligible translations stop before provider execution");
assert.match(providerRuntimeSource, /cacheHitCount \+= 1/, "cache hits remain distinct from provider-executed usage");
assert.match(usageLedgerSource, /record\.type === "ai-usage-estimated"/, "rolling usage counts provider-executed translation estimates only");
assert.match(usageLedgerSource, /record\.occurredAtMs >= currentMinuteStartedAtMs/, "rolling-window recovery uses a fake-time-compatible sixty-second boundary");
assert.match(operatorDocSource, /COMMENT_TRANSLATOR_CLOUDFLARE_RUNTIME_CHANNEL/, "operator docs name the preview runtime channel binding");
assert.match(operatorDocSource, /COMMENT_TRANSLATOR_FREE_BETA_PREVIEW_RATE_LIMIT_SMOKE/, "operator docs name the exact marker binding");
assert.match(operatorDocSource, /Cloudflare preview only/, "operator docs limit bindings to Cloudflare preview");
assert.match(taskSource, /boundary_status=inconclusive-window-not-saturated/, "task records the production boundary attempt as inconclusive");

console.log("comment-translator PL-G6D preview rate-limit smoke override contract: PASS");
