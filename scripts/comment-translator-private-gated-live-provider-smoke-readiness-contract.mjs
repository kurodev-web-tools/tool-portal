import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const taskPath = "task.md";
const readinessDocPath = "docs/active/COMMENT_TRANSLATOR_PRIVATE_GATED_LIVE_PROVIDER_SMOKE_READINESS.md";
const pollingCommandPath = "scripts/comment-translator-youtube-live-chat-polling-smoke-command.mjs";
const targetLookupCommandPath = "scripts/comment-translator-youtube-live-chat-target-lookup-command.mjs";
const providerExecutionPath = "lib/comment-translator-provider-execution-runtime.ts";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function sanitizedEnv() {
  return {
    Path: process.env.Path ?? process.env.PATH ?? "",
    PATH: process.env.PATH ?? process.env.Path ?? "",
    SystemRoot: process.env.SystemRoot ?? "",
    WINDIR: process.env.WINDIR ?? "",
    TEMP: process.env.TEMP ?? "",
    TMP: process.env.TMP ?? ""
  };
}

function runSanitizedPreflight(commandPath) {
  const result = spawnSync(process.execPath, [commandPath, "--check-env-only"], {
    cwd: root,
    encoding: "utf8",
    env: sanitizedEnv()
  });
  assert.equal(result.status, 2, `${commandPath} blocks without operator-local references`);
  assert.equal(result.stderr, "", `${commandPath} does not write stderr for expected blocker`);
  return JSON.parse(result.stdout);
}

assert.ok(exists(readinessDocPath), "Task 27 readiness/blocker active doc exists");
assert.ok(exists(pollingCommandPath), "Live Chat polling smoke command exists");
assert.ok(exists(targetLookupCommandPath), "Live Chat target lookup command exists");
assert.ok(exists(providerExecutionPath), "translation provider execution runtime exists");

const task = read(taskPath);
const readinessDoc = read(readinessDocPath);
const pollingCommand = read(pollingCommandPath);
const targetLookupCommand = read(targetLookupCommandPath);
const providerExecution = read(providerExecutionPath);

assert.match(task, /Task 27 exact-command approval gate PR/i, "task.md records Task 27 exact-command approval gate PR scope");
assert.match(task, /completion criteria.*not met/i, "task.md records Task 27 completion criteria are not met");
assert.match(task, /operator-local adapter wiring.*implemented-sanitized-summary-only/i, "task.md records Task 27 adapter wiring state");
assert.match(task, /exact-command review output.*implemented-sanitized-output-only/i, "task.md records Task 27 exact-command review state");
assert.match(task, /width checks skipped/i, "task.md records width-check decision for non-UI slice");

assert.match(
  readinessDoc,
  /Status: Task 27 execution harness, operator-local adapter wiring, and exact-command approval gate readiness/i,
  "readiness doc records status"
);
assert.match(readinessDoc, /Completion decision: not complete/i, "readiness doc does not overclaim Task 27 completion");
assert.match(readinessDoc, /live\/provider execution: not-run/i, "readiness doc records live/provider execution was not run");
assert.match(readinessDoc, /provider target lookup: not-run/i, "readiness doc records provider target lookup was not run");
assert.match(readinessDoc, /liveChatId lookup: not-run/i, "readiness doc records liveChatId lookup was not run");
assert.match(readinessDoc, /translation provider API execution: not-run/i, "readiness doc records translation provider API execution was not run");
assert.match(readinessDoc, /operator-local adapter wiring: implemented-sanitized-summary-only/i, "readiness doc records Task 27 adapter wiring");
assert.match(readinessDoc, /exact-command review output: implemented-sanitized-output-only/i, "readiness doc records Task 27 exact-command review output");
assert.match(readinessDoc, /sanitized-metadata-only/i, "readiness doc records sanitized output policy");
assert.doesNotMatch(readinessDoc, /Bearer\s+[A-Za-z0-9._-]+/, "readiness doc does not contain Authorization bearer values");

assert.match(pollingCommand, /--approved-live-chat-polling-smoke/, "polling command requires explicit polling approval flag");
assert.match(targetLookupCommand, /--approved-live-chat-target-lookup/, "target lookup command requires explicit target lookup approval flag");
assert.match(providerExecution, /not-run-without-same-thread-preflight-sanitized-output-and-explicit-approval/, "provider execution remains approval-gated");

const targetLookupPreflight = runSanitizedPreflight(targetLookupCommandPath);
assert.equal(targetLookupPreflight.outputPolicy, "sanitized-metadata-only", "target lookup blocker output is sanitized");
assert.equal(targetLookupPreflight.liveChatTargetLookup, "not-run", "target lookup does not run without references and approval");
assert.equal(targetLookupPreflight.providerAccess, "not-run", "target lookup preflight does not access provider");
assert.equal(targetLookupPreflight.tokenValue, "never-returned-by-design", "target lookup does not return token values");
assert.equal(targetLookupPreflight.refreshTokenValue, "never-returned-by-design", "target lookup does not return refresh token values");

const pollingPreflight = runSanitizedPreflight(pollingCommandPath);
assert.equal(pollingPreflight.outputPolicy, "sanitized-metadata-only", "polling blocker output is sanitized");
assert.equal(pollingPreflight.liveChatPollingSmoke, "not-run", "polling smoke does not run without references and approval");
assert.equal(pollingPreflight.providerAccess, "not-run", "polling preflight does not access provider");
assert.equal(pollingPreflight.tokenValue, "never-returned-by-design", "polling does not return token values");
assert.equal(pollingPreflight.refreshTokenValue, "never-returned-by-design", "polling does not return refresh token values");
assert.equal(pollingPreflight.authorizationHandling, "server-only-header-consumed-never-returned", "polling keeps Authorization header server-only");
assert.equal(pollingPreflight.translatorPipelineWiring, "not-implemented", "polling smoke cannot prove translation path yet");

console.log("comment translator Task 27 private-gated live/provider smoke readiness blocker contract checks passed");
