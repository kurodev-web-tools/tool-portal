import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function changedFiles() {
  try {
    const committedDiff = execSync("git diff --name-only archive/comment-translator-preview-2026-07-21...HEAD", {
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

    return [...new Set([...committedDiff, ...untracked])].map((file) => file.replace(/\\/g, "/"));
  } catch {
    return [];
  }
}

assert.ok(exists("lib/comment-translator-provider-boundary.ts"), "server-only provider boundary module exists");
assert.ok(
  exists("docs/future/COMMENT_TRANSLATOR_PROVIDER_BOUNDARY_DESIGN.md"),
  "provider boundary design memo exists"
);

const providerSource = read("lib/comment-translator-provider-boundary.ts");
const designDoc = read("docs/future/COMMENT_TRANSLATOR_PROVIDER_BOUNDARY_DESIGN.md");
const mockLibSource = read("lib/comment-translator.ts");
const componentSource = read("components/comment-translator/CommentTranslatorDock.tsx");
const taskSource = read("task.md");

assert.match(providerSource, /^import "server-only";/m, "provider boundary is server-only");
assert.match(providerSource, /export interface CommentTranslationProvider\b/, "provider interface is exported");
assert.match(providerSource, /export type CommentTranslationProviderRequest\b/, "provider request type is exported");
assert.match(providerSource, /export type CommentTranslationProviderResponse\b/, "provider success response type is exported");
assert.match(
  providerSource,
  /export type CommentTranslationProviderRecoverableError\b/,
  "recoverable provider error type is exported"
);
assert.match(
  providerSource,
  /export type CommentTranslationProviderTerminalError\b/,
  "terminal provider error type is exported"
);
assert.match(
  providerSource,
  /export type CommentTranslationUsageHandoff\b/,
  "quota, billing, and usage logging handoff type is exported"
);
assert.match(providerSource, /server-runtime-only/, "provider scope is server runtime only");
assert.match(providerSource, /clientBundle:\s*"forbidden"/, "client bundle secret access is forbidden");
assert.match(providerSource, /fixtures:\s*"forbidden"/, "fixture secret access is forbidden");
assert.match(providerSource, /docsAndTaskNotes:\s*"no-secret-values"/, "task docs must not carry secret values");
assert.match(providerSource, /enforcement:\s*"not-implemented"/, "quota enforcement is a future boundary");
assert.match(providerSource, /databaseWrite:\s*"not-implemented"/, "quota database writes are a future boundary");
assert.match(providerSource, /youtube|oauth|owner|poll/i, "input separation is documented explicitly in source notes");

for (const axis of [
  "latency",
  "cost",
  "language-coverage",
  "streaming-suitability",
  "glossary-support",
  "rate-limit",
  "data-retention",
  "failure-semantics"
]) {
  assert.match(providerSource, new RegExp(`id:\\s*"${axis}"`), `provider comparison axis is present: ${axis}`);
  assert.match(designDoc, new RegExp(axis, "i"), `design doc records provider comparison axis: ${axis}`);
}

for (const requiredDocFragment of [
  "server-only",
  "server runtime env",
  "quota / billing / usage logging handoff",
  "No database write",
  "No YouTube OAuth",
  "No Live Chat polling",
  "short-lived",
  "PII minimization",
  "moderation skip reason",
  "cache key"
]) {
  assert.match(designDoc, new RegExp(requiredDocFragment, "i"), `design doc records: ${requiredDocFragment}`);
}

assert.match(mockLibSource, /MockTranslationProvider/, "fixture mock provider boundary remains in place");
assert.doesNotMatch(componentSource, /comment-translator-provider-boundary/, "client UI does not import the server-only boundary");

const forbiddenProviderRuntimePatterns = [
  /fetch\s*\(/,
  /XMLHttpRequest/,
  /EventSource/,
  /WebSocket/,
  /process\.env/,
  /createClient/,
  /from\(["']usage_quotas["']\)/,
  /insert\s*\(/,
  /upsert\s*\(/,
  /update\s*\(/,
  /stripe|checkout|gtag|GA4|cookie consent/i,
  /liveChatMessages|youtube\.googleapis/i,
  /OPENAI|DEEPL|GEMINI|GOOGLE_API|GOOGLE_CLOUD|API[_ -]?KEY|SERVICE_ROLE/i
];

const forbiddenClientRuntimePatterns = [
  ...forbiddenProviderRuntimePatterns.filter((pattern) => pattern.source !== "stripe|checkout|gtag|GA4|cookie consent")
];

for (const pattern of forbiddenProviderRuntimePatterns) {
  assert.doesNotMatch(
    providerSource,
    pattern,
    `provider boundary keeps this design slice free of runtime integrations: ${pattern}`
  );
}

for (const [label, source] of [
  ["mock provider", mockLibSource],
  ["client component", componentSource]
]) {
  for (const pattern of forbiddenClientRuntimePatterns) {
    if (label === "client component" && pattern.source === "oauth|owner verification|polling") {
      assert.match(
        taskSource,
        /PR #321.*credential status display UI wiring/i,
        "post-PR #321 display wiring may reference the existing OAuth-named sanitized status action"
      );
      continue;
    }
    assert.doesNotMatch(source, pattern, `${label} keeps this design slice free of runtime integrations: ${pattern}`);
  }
}

const forbiddenPathPatterns = [
  /^supabase\//,
  /^migrations?\//,
  /^app\/api\//,
  /^lib\/supabase\//,
  /^lib\/tool-handoff/,
  /^lib\/.*storage/i,
  /^components\/comment-translator\//,
  /^app\/tools\/comment-translator\//
];

const separateImplementationFiles = new Set([
  "lib/comment-translator-language-policy-runtime.ts",
  "app/tools/comment-translator/page.tsx",
  "components/comment-translator/CommentTranslatorDock.tsx",
  "lib/comment-translator.ts",
  "lib/comment-translator-provider-boundary.ts",
  "lib/comment-translator-youtube-live-comment-intake-pipeline.ts",
  "lib/comment-translator-youtube-token-store-runtime.ts",
  "lib/comment-translator-youtube-credential-status-ui-wiring.ts",
  "app/api/comment-translator/youtube/credential-status/route.ts",
  "app/tools/comment-translator/actions.ts",
  "scripts/comment-translator-filter-language-policy-runtime-contract.mjs",
  "scripts/comment-translator-provider-boundary-contract.mjs",
  "scripts/comment-translator-youtube-live-comment-intake-pipeline-contract.mjs",
  "supabase/migrations/20260601000000_youtube_oauth_credentials.sql",
  "scripts/comment-translator-youtube-token-store-separate-approved-migration-pr-contract.mjs"
]);

for (const file of changedFiles()) {
  for (const pattern of forbiddenPathPatterns) {
    if (!separateImplementationFiles.has(file)) {
      assert.doesNotMatch(file, pattern, `provider boundary design slice does not change forbidden path: ${file}`);
    }
  }
}

assert.match(
  taskSource,
  /Public Release Roadmap Task 9/i,
  "task.md records the current filtering/language policy scope"
);

console.log("comment translator provider boundary contract checks passed");
