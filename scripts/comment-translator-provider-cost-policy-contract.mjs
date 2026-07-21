import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const policyPath = "docs/active/COMMENT_TRANSLATOR_PROVIDER_COST_POLICY.md";
const taskPath = "task.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function changedFiles() {
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
}

function assertNoSensitiveValues(relativePath) {
  const source = read(relativePath);
  assert.doesNotMatch(
    source,
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*:\s*Bearer\s+\S+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+|SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|ownerUserId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+/i,
    `${relativePath} does not contain committed secret, token, authorization, private key, or private provider target values`
  );
}

assert.ok(exists(policyPath), "Task 19 provider cost policy document exists");

const policy = read(policyPath);
const task = read(taskPath);

for (const section of [
  "## Initial Recommendation",
  "## Provider Comparison",
  "## Language Coverage",
  "## Fallback And Stop Policy",
  "## Budget Controls",
  "## Provider Environment Names",
  "## No-Live-Call Boundary",
  "## Official Source Notes",
  "## Task 20 Handoff"
]) {
  assert.match(policy, new RegExp(`^${section}$`, "m"), `policy includes ${section}`);
}

for (const provider of ["DeepL", "Azure Translator", "OpenAI mini", "Gemini Flash/Lite", "Cloudflare Workers AI"]) {
  assert.match(policy, new RegExp(provider.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `policy compares ${provider}`);
}

for (const fragment of [
  "Free plan primary: Azure Translator",
  "Paid plan primary: OpenAI mini",
  "Do not silently fail over Free traffic to a paid LLM",
  "cap exhaustion stops translation instead of provider hopping",
  "same-language selections remain invalid",
  "JA / EN / KR / CN",
  "target JA / EN",
  "monthly budget",
  "soft stop",
  "hard stop",
  "no provider API call was made"
]) {
  assert.match(policy, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `policy records: ${fragment}`);
}

for (const envName of [
  "COMMENT_TRANSLATOR_FREE_TRANSLATION_PROVIDER",
  "COMMENT_TRANSLATOR_PAID_TRANSLATION_PROVIDER",
  "COMMENT_TRANSLATOR_TRANSLATION_MONTHLY_BUDGET_USD",
  "COMMENT_TRANSLATOR_TRANSLATION_BUDGET_SOFT_STOP_RATIO",
  "COMMENT_TRANSLATOR_TRANSLATION_BUDGET_HARD_STOP_RATIO",
  "AZURE_TRANSLATOR_KEY",
  "AZURE_TRANSLATOR_ENDPOINT",
  "AZURE_TRANSLATOR_REGION",
  "OPENAI_API_KEY",
  "OPENAI_TRANSLATION_MODEL",
  "GEMINI_API_KEY",
  "GEMINI_TRANSLATION_MODEL",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_WORKERS_AI_MODEL",
  "DEEPL_AUTH_KEY",
  "DEEPL_API_BASE_URL"
]) {
  assert.match(policy, new RegExp(`\\b${envName}\\b`), `policy lists env name only: ${envName}`);
}

assert.match(policy, /https:\/\/developers\.deepl\.com\/docs\/getting-started\/supported-languages/i, "policy cites DeepL language docs");
assert.match(policy, /https:\/\/www\.deepl\.com\/en\/pro-data-security/i, "policy cites DeepL data security docs");
assert.match(policy, /https:\/\/learn\.microsoft\.com\/en-us\/azure\/ai-services\/translator\/language-support/i, "policy cites Azure language support");
assert.match(policy, /https:\/\/www\.microsoft\.com\/en-us\/translator\/business\/faq/i, "policy cites Azure free-tier behavior");
assert.match(policy, /https:\/\/developers\.openai\.com\/api\/docs\/models\/gpt-4o-mini/i, "policy cites OpenAI mini model pricing");
assert.match(policy, /https:\/\/openai\.com\/policies\/how-your-data-is-used-to-improve-model-performance/i, "policy cites OpenAI data-use policy");
assert.match(policy, /https:\/\/ai\.google\.dev\/gemini-api\/docs\/pricing/i, "policy cites Gemini pricing");
assert.match(policy, /https:\/\/ai\.google\.dev\/gemini-api\/terms/i, "policy cites Gemini terms");
assert.match(policy, /https:\/\/developers\.cloudflare\.com\/workers-ai\/platform\/pricing/i, "policy cites Workers AI pricing");
assert.match(policy, /https:\/\/developers\.cloudflare\.com\/workers-ai\/platform\/limits/i, "policy cites Workers AI limits");

assert.match(task, /Task 19[\s\S]*Translation provider and cost policy finalization[\s\S]*Status: complete/i, "task.md marks Task 19 complete");
assert.match(task, /COMMENT_TRANSLATOR_PROVIDER_COST_POLICY\.md/i, "task.md points to provider policy doc");
assert.match(task, /provider policy contract/i, "task.md records provider policy contract verification");
assert.match(task, /width checks skipped/i, "task.md records why width checks were skipped");
assert.match(task, /public-release capable: no/i, "task.md does not overclaim public release capability");

for (const file of [policyPath, taskPath, "scripts/comment-translator-provider-cost-policy-contract.mjs"]) {
  assertNoSensitiveValues(file);
}

const allowedChangedFiles = new Set([policyPath, taskPath, "scripts/comment-translator-provider-cost-policy-contract.mjs"]);
for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `Task 19 remains docs/contract-only; unexpected changed file: ${file}`);
}

console.log("comment translator provider cost policy contract checks passed");
