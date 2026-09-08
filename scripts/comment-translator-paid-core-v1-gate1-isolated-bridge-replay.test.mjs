import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const integrationPath = path.join(
  process.cwd(),
  "scripts",
  "comment-translator-paid-core-v1-gate1-database-integration-contract.mjs"
);
const integrationSource = fs.readFileSync(integrationPath, "utf8");

assert.match(integrationSource, /function runCliIsolatedBridgeReplayCase\b/);
assert.match(integrationSource, /function repositoryMigrationNamesBeforeBridge\b/);
assert.match(integrationSource, /function runStreamedDockerInput\b/);
assert.match(integrationSource, /runStreamedDockerInput\([\s\S]*bridgePath/);
assert.match(integrationSource, /--single-transaction/);
assert.match(integrationSource, /bridgeAssertionCode/);
assert.match(integrationSource, /isolated-bridge-replay/);
assert.match(integrationSource, /phase=isolated-bridge-replay/);

const isolatedStart = integrationSource.indexOf("function runCliIsolatedBridgeReplayCase");
const isolatedEnd = integrationSource.indexOf("function runCliRollbackHistoryAtomicCase", isolatedStart);
const isolatedBody = integrationSource.slice(isolatedStart, isolatedEnd);
const bootstrapIndex = isolatedBody.indexOf('phase = "BOOTSTRAP_CLI_EXTERNAL_DEPENDENCY"');
const resetIndex = isolatedBody.indexOf('phase = "CLI_PRE_BRIDGE_RESET"');
const bridgeIndex = isolatedBody.indexOf('phase = "APPLY_ORIGINAL_BRIDGE_SINGLE_TRANSACTION"');
assert.ok(resetIndex >= 0 && bootstrapIndex > resetIndex && bridgeIndex > bootstrapIndex, "external dependency bootstrap follows pre-bridge reset");

console.log("comment-translator-paid-core-v1-gate1 isolated bridge replay contract: PASS");
