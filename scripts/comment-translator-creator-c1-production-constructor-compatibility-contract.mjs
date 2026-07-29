import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const storeSource = fs.readFileSync(
  path.join(root, "lib/comment-translator-paid-entitlement-store.ts"),
  "utf8",
);
const bridgeSource = fs.readFileSync(
  path.join(
    root,
    "scripts/comment-translator-creator-c1-ephemeral-entitlement-bridge.mjs",
  ),
  "utf8",
);
const runnerSource = fs.readFileSync(
  path.join(
    root,
    "scripts/comment-translator-creator-c1-ephemeral-runner.mjs",
  ),
  "utf8",
);
const packageLock = fs.readFileSync(path.join(root, "package-lock.json"), "utf8");
const taskSource = fs.readFileSync(path.join(root, "task.md"), "utf8");
const boardSource = fs.readFileSync(
  path.join(
    root,
    "docs/active/COMMENT_TRANSLATOR_CREATOR_CLOSED_BETA_TASK_BOARD.md",
  ),
  "utf8",
);
const readinessSource = fs.readFileSync(
  path.join(
    root,
    "docs/active/COMMENT_TRANSLATOR_CREATOR_PAID_LAUNCH_READINESS_PREFLIGHT.md",
  ),
  "utf8",
);

function collectProductionSources(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectProductionSources(entryPath);
    }
    return /\.(?:[cm]?[jt]sx?)$/.test(entry.name)
      ? [fs.readFileSync(entryPath, "utf8")]
      : [];
  });
}

function extractFunction(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  return source.slice(start, end);
}

const factoryBoundary = extractFunction(
  storeSource,
  "export function createTrustedCommentTranslatorPaidEntitlementSupabaseStore",
  "export function createCommentTranslatorPaidEntitlementSupabaseStore",
);
const normalizationBoundary = extractFunction(
  storeSource,
  "function readTrustedEnv",
  "function createTrustedSupabaseServiceRoleClient",
);
const clientBoundary = extractFunction(
  storeSource,
  "function createTrustedSupabaseServiceRoleClient",
  "\n}",
);

assert.equal(
  (factoryBoundary.match(/readTrustedEnv\(/g) ?? []).length,
  2,
);
assert.match(normalizationBoundary, /\.trim\(\)/);
assert.match(factoryBoundary, /createSupabaseClient\(url, serviceRoleKey\)/);
assert.match(clientBoundary, /createClient\(url, serviceRoleKey,/);
assert.match(
  bridgeSource,
  /const factoryResult = await createStore\(first, second\)/,
);
assert.match(runnerSource, /input\.fill\(0\)/);
assert.doesNotMatch(bridgeSource, /\.toString\(|TextDecoder|String\(/);
assert.match(
  runnerSource,
  /export async function run\(\{ readAdapter = null \} = \{\}\) \{/,
);
assert.match(
  runnerSource,
  /const state = createEphemeralState\(\{ readAdapter \}\);/,
);
assert.match(runnerSource, /if \(directInvocation\) \{\s+await run\(\);\s+\}/);

const productionSources = [
  ...collectProductionSources(path.join(root, "app")),
  ...collectProductionSources(path.join(root, "components")),
  ...collectProductionSources(path.join(root, "lib")),
].join("\n");
assert.doesNotMatch(
  productionSources,
  /comment-translator-creator-c1-ephemeral|createPaidEntitlementReadBridge/,
);

const syntheticBytes = Buffer.from([0x20, 0x61, 0x20]);
const decodedCopy = syntheticBytes.toString("utf8");
const normalizedCopy = decodedCopy.trim();
syntheticBytes.fill(0);
assert.equal(syntheticBytes.every((byte) => byte === 0), true);
assert.equal(decodedCopy.length, 3);
assert.equal(normalizedCopy.length, 1);
assert.notEqual(decodedCopy.charCodeAt(1), 0);
assert.notEqual(normalizedCopy.charCodeAt(0), 0);

const lockedSdk = JSON.parse(packageLock).packages[
  "node_modules/@supabase/supabase-js"
];
assert.equal(typeof lockedSdk?.version, "string");
assert.equal(
  fs.existsSync(path.join(root, "node_modules/@supabase/supabase-js")),
  false,
);

const requiredAuthorityMarkers = [
  "PR #689 is merged at `2888bb1a60fdd6851688e3e7b323a40b3c21869c`",
  "production_constructor_compatibility_status=blocked-immutable-lifetime-unprovable",
  "production_wiring_status=disconnected-fail-closed",
  "sdk_internal_lifetime_status=dependency-blocked-unverified",
  "required_design_decision=consumed-process-isolation-guarantee-change",
];

for (const source of [taskSource, boardSource, readinessSource]) {
  for (const marker of requiredAuthorityMarkers) {
    assert.match(source, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
}

process.stdout.write(
  "comment-translator-creator-c1-production-constructor-compatibility-contract: pass\n",
);
