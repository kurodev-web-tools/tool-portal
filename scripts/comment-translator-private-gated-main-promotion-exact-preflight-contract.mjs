import assert from "node:assert/strict";
import fs from "node:fs";

const taskPath = "task.md";
const preflightDocPath = "docs/active/COMMENT_TRANSLATOR_PRIVATE_GATED_MAIN_PROMOTION_EXACT_PREFLIGHT.md";
const readinessDocPath = "docs/active/COMMENT_TRANSLATOR_PRIVATE_GATED_MAIN_PROMOTION_READINESS.md";
const envReadinessDocPath = "docs/active/COMMENT_TRANSLATOR_PRODUCTION_ENV_READINESS.md";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

assert.ok(fs.existsSync(preflightDocPath), "Task 28 exact preflight doc exists");

const task = read(taskPath);
const doc = read(preflightDocPath);
const readinessDoc = read(readinessDocPath);
const envReadinessDoc = read(envReadinessDocPath);
const combined = `${task}\n${doc}\n${readinessDoc}\n${envReadinessDoc}`;

assert.match(doc, /Task 28 exact preflight\/blocker record after PR #436/i, "doc records exact preflight scope");
assert.match(doc, /Public-release capable: no/i, "doc keeps public-release capable disabled");
assert.match(doc, /not approval for main promotion/i, "doc does not approve main promotion");
assert.match(doc, /deploy\/upload[\s\S]*production\/custom URL smoke/i, "doc gates deploy and production smoke");
assert.match(doc, /PR #436 `\[codex\] Record Task 28 production env readiness`: merged/i, "doc records PR #436 merge");
assert.match(doc, /3b508071b5f188c8006a39d2f83bc284a3bce068/i, "doc records PR #436 merge commit");
assert.match(doc, /Cloudflare Pages completed with failure/i, "doc separates Cloudflare Pages check state");
assert.match(doc, /Operator-Reported Env Presence/i, "doc records operator-reported env presence");
assert.match(doc, /private launch allowlist/i, "doc records private launch allowlist presence");
assert.match(doc, /Supabase public auth vars/i, "doc records Supabase public auth presence");
assert.match(doc, /Supabase service role secret/i, "doc records Supabase service role presence by label only");
assert.match(doc, /Stripe test mode secret, webhook secret, and paid price reference/i, "doc records Stripe test-mode limitation");
assert.match(doc, /Azure Translator key, endpoint, and region/i, "doc records Azure reference presence");
assert.match(doc, /OpenAI \/ DeepL \/ Gemini \/ Workers AI[\s\S]*Not set/i, "doc records unset optional providers");
assert.match(doc, /Task 28 completion criteria are still not met/i, "doc records incomplete Task 28");
assert.match(doc, /main promotion \| not-run-blocked-pending-explicit-approval/i, "doc blocks main promotion");
assert.match(doc, /deploy\/upload \| not-run-blocked-pending-explicit-approval/i, "doc blocks deploy/upload");
assert.match(doc, /Stripe billing smoke \| not-run-blocked-test-mode-and-approval-gated/i, "doc blocks Stripe billing smoke");
assert.match(doc, /provider translation smoke \| not-run-blocked-pending-explicit-provider-approval/i, "doc blocks provider execution");
assert.match(doc, /Phase 0: Local Readiness, No External Mutation/i, "doc defines local-only phase");
assert.match(doc, /Phase 1: Main Promotion/i, "doc defines main promotion phase");
assert.match(doc, /Phase 2: Deploy \/ Upload/i, "doc defines deploy phase");
assert.match(doc, /Phase 3: Production \/ Custom URL Smoke/i, "doc defines production smoke phase");
assert.match(doc, /Separate approval required for each category/i, "doc keeps follow-up smokes separately approved");
assert.match(doc, /Width checks skipped[\s\S]*docs, a Node contract script, and task-board notes only/i, "doc records width-check skip reason");

assert.match(task, /current exact preflight doc: `docs\/active\/COMMENT_TRANSLATOR_PRIVATE_GATED_MAIN_PROMOTION_EXACT_PREFLIGHT\.md`/i, "task board points to exact preflight doc");
assert.match(task, /operator-reported production env presence/i, "task board records operator-reported env presence");
assert.match(task, /Task 28 completion criteria: not met/i, "task board keeps Task 28 incomplete");
assert.match(task, /main promotion, deploy\/upload, and production\/custom smoke were not run/i, "task board records blocked execution surfaces");
assert.match(task, /public-release capable: no/i, "task board keeps public-release capable disabled");

const forbiddenValuePattern =
  /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+/i;

assert.doesNotMatch(combined, forbiddenValuePattern, "exact preflight record avoids secret/private values");

console.log("comment translator private-gated main promotion exact preflight contract checks passed");
