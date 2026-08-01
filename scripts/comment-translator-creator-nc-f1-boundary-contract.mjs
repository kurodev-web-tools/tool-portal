import assert from "node:assert/strict";
import fs from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import path from "node:path";

const root = process.cwd();
const boundaryPath = "lib/comment-translator-creator-boundary.ts";

assert.ok(fs.existsSync(path.join(root, boundaryPath)), "NC-F1 Creator boundary exists");

const source = fs.readFileSync(path.join(root, boundaryPath), "utf8");
assert.match(source, /^import "server-only";/, "Creator boundary is server-only");
assert.doesNotMatch(
  source,
  /\bfetch\s*\(|createClient\s*\(|localStorage|sessionStorage|indexedDB|process\.env/,
  "unavailable adapter has no provider, persistence, browser storage, or configuration side effect"
);

const executableSource = stripTypeScriptTypes(source.replace('import "server-only";', ""), { mode: "transform" });
const moduleUrl = `data:text/javascript;base64,${Buffer.from(executableSource).toString("base64")}`;
const boundary = await import(moduleUrl);
const adapter = boundary.createUnavailableCommentTranslatorCreatorBoundary();

assert.deepEqual(Object.keys(adapter).sort(), ["authorize", "mode"], "unavailable adapter exposes no mutation or provider operation");
assert.equal(adapter.mode, "unavailable");

const expected = {
  status: "unavailable",
  reason: "creator-authority-unavailable",
  plan: "free",
  creatorAccess: false,
  providerExecutionAllowed: false,
  persistenceAllowed: false,
  browserAuthority: "ignored"
};

for (const status of ["authenticated", "unauthenticated", "unavailable"]) {
  assert.deepEqual(
    await adapter.authorize({ status }),
    expected,
    `Creator remains unavailable for caller authorization status: ${status}`
  );
}

assert.deepEqual(boundary.commentTranslatorCreatorBoundaryContract, {
  implementationStage: "nc-f1-disabled-creator-boundary",
  runtime: "server-only",
  authorization: "caller-derived-server-only",
  authority: "unavailable-fail-closed",
  failClosedAuthorityStates: ["missing", "unreadable", "inactive"],
  providerExecution: "forbidden",
  persistence: "forbidden",
  browserAuthority: "ignored",
  freeBehavior: "unchanged",
  containerFallback: "forbidden"
});

process.stdout.write("comment translator NC-F1 Creator boundary contract passed\n");
