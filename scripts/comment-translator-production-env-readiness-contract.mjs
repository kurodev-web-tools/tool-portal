import assert from "node:assert/strict";
import fs from "node:fs";

const taskPath = "task.md";
const mainReadinessDocPath = "docs/active/COMMENT_TRANSLATOR_PRIVATE_GATED_MAIN_PROMOTION_READINESS.md";
const envReadinessDocPath = "docs/active/COMMENT_TRANSLATOR_PRODUCTION_ENV_READINESS.md";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

assert.ok(fs.existsSync(envReadinessDocPath), "production env readiness doc exists");

const task = read(taskPath);
const mainReadinessDoc = read(mainReadinessDocPath);
const envDoc = read(envReadinessDocPath);
const combined = `${task}\n${mainReadinessDoc}\n${envDoc}`;

assert.match(envDoc, /Task 28 production env readiness\/blocker record/i, "doc records Task 28 env readiness scope");
assert.match(envDoc, /Public-release capable: no/i, "doc keeps public-release capable disabled");
assert.match(envDoc, /reference-name-only/i, "doc is reference-name-only");
assert.match(envDoc, /not approval for main promotion/i, "doc does not approve main promotion");
assert.match(envDoc, /deploy\/upload[\s\S]*production\/custom URL smoke/i, "doc gates deploy and production smoke");
assert.match(envDoc, /sanitized-metadata-only/i, "doc records sanitized output policy");
assert.match(envDoc, /`required`[\s\S]*`optional`[\s\S]*`smoke-only`/i, "doc defines required optional smoke-only classes");

const requiredRows = [
  ["NEXT_PUBLIC_SITE_URL", "required"],
  ["NEXT_PUBLIC_SUPABASE_URL", "required"],
  ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "required"],
  ["COMMENT_TRANSLATOR_PRIVATE_LAUNCH_ALLOWED_USER_HASHES", "required"]
];

for (const [name, classification] of requiredRows) {
  assert.match(
    envDoc,
    new RegExp(`\\| \`${name}\` \\| ${classification} \\|`, "i"),
    `${name} is classified as ${classification}`
  );
}

const smokeOnlyRows = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "COMMENT_TRANSLATOR_STRIPE_PAID_PRICE_ID",
  "AZURE_TRANSLATOR_KEY",
  "OPENAI_API_KEY",
  "OPENAI_TRANSLATION_MODEL",
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN",
  "YOUTUBE_OAUTH_SMOKE_CREDENTIAL_REFERENCE_ID",
  "YOUTUBE_LIVE_CHAT_POLLING_SMOKE_LIVE_CHAT_ID"
];

for (const name of smokeOnlyRows) {
  assert.match(envDoc, new RegExp(`\\| \`${name}\` \\| smoke-only \\|`, "i"), `${name} is smoke-only`);
}

const optionalRows = [
  "NEXT_PUBLIC_AUTH_REDIRECT_ORIGINS",
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
  "DEEPL_AUTH_KEY",
  "GEMINI_API_KEY",
  "CLOUDFLARE_WORKERS_AI_MODEL",
  "COMMENT_TRANSLATOR_EDGE_RATE_LIMITING"
];

for (const name of optionalRows) {
  assert.match(envDoc, new RegExp(`\\| \`${name}\` \\| optional \\|`, "i"), `${name} is optional`);
}

assert.match(envDoc, /empty allowlist[\s\S]*fail-closed/i, "doc records private launch allowlist fail-closed behavior");
assert.match(envDoc, /returns `missing-config`/i, "doc records Stripe missing-config behavior");
assert.match(envDoc, /credential-missing/i, "doc records provider credential-missing behavior");
assert.match(envDoc, /Auth redirect falls back/i, "doc records site URL missing behavior");
assert.match(envDoc, /route\/session caller auth becomes unavailable/i, "doc records Supabase auth missing behavior");
assert.match(envDoc, /Token material availability stays operator-local/i, "doc records operator-local token material boundary");
assert.match(envDoc, /does not approve Cloudflare mutation/i, "doc does not approve deploy mutation");
assert.match(envDoc, /Width checks skipped[\s\S]*docs, a Node contract script, and task-board notes only/i, "doc records width-check skip reason");

assert.match(task, /current env readiness doc: `docs\/active\/COMMENT_TRANSLATOR_PRODUCTION_ENV_READINESS\.md`/i, "task board points to env readiness doc");
assert.match(task, /production env readiness\/blocker/i, "task board records env readiness scope");
assert.match(task, /reference-name-only env inventory/i, "task board records reference-name-only inventory");
assert.match(task, /main promotion, deploy\/upload, and production\/custom smoke were not run/i, "task board keeps external actions blocked");
assert.match(task, /public-release capable: no/i, "task board keeps public-release capable disabled");
assert.match(mainReadinessDoc, /Production Env Readiness/i, "Task 28 readiness doc links env readiness");

const forbiddenValuePattern =
  /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+/i;

assert.doesNotMatch(combined, forbiddenValuePattern, "production env readiness record avoids secret/private values");

console.log("comment translator production env readiness contract checks passed");
