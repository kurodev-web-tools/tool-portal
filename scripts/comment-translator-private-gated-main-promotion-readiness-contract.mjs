import assert from "node:assert/strict";
import fs from "node:fs";

const taskPath = "task.md";
const readinessDocPath = "docs/active/COMMENT_TRANSLATOR_PRIVATE_GATED_MAIN_PROMOTION_READINESS.md";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

assert.ok(fs.existsSync(readinessDocPath), "Task 28 readiness doc exists");

const task = read(taskPath);
const doc = read(readinessDocPath);
const combined = `${task}\n${doc}`;

assert.match(doc, /Task 28 readiness\/blocker record/i, "doc records Task 28 readiness/blocker state");
assert.match(doc, /Public-release capable: no/i, "doc keeps public-release capable disabled");
assert.match(doc, /not approval for main promotion/i, "doc does not approve main promotion");
assert.match(doc, /deploy\/upload[\s\S]*production\/custom URL smoke/i, "doc gates deploy and production smoke");
assert.match(doc, /Merge commit: `617985d6b56057d40a9fdcf093f9f32846e7e45b`/i, "doc records PR #434 merge commit");
assert.match(doc, /contained in `origin\/codex\/comment-translator-preview`/i, "doc records merge containment");
assert.match(doc, /Cloudflare Pages completed with failure/i, "doc separates Cloudflare Pages check state from local readiness");
assert.match(doc, /Task 28 completion criteria are not met/i, "doc records incomplete completion criteria");
assert.match(doc, /main promotion \| not-run-blocked-pending-explicit-approval/i, "doc blocks main promotion");
assert.match(doc, /deploy\/upload \| not-run-blocked-pending-explicit-approval/i, "doc blocks deploy/upload");
assert.match(doc, /production\/custom URL smoke \| not-run-blocked-pending-approved-deploy-target/i, "doc blocks production smoke");
assert.match(doc, /allowed-tester smoke \| not-run-blocked-pending-production-target-and-approval/i, "doc blocks allowed tester smoke");
assert.match(doc, /non-allowed-user denial smoke \| not-run-blocked-pending-production-target-and-approval/i, "doc blocks non-allowed-user denial smoke");
assert.match(doc, /same-thread ready preflight/i, "doc requires same-thread ready preflight");
assert.match(doc, /sanitized output review/i, "doc requires sanitized output review");
assert.match(doc, /explicit in-thread approval/i, "doc requires explicit approval");
assert.match(doc, /Width checks skipped[\s\S]*docs and a Node contract script only/i, "doc records width-check skip reason");

assert.match(task, /current PR scope: Task 28 readiness\/blocker record/i, "task board points to Task 28 readiness/blocker scope");
assert.match(task, /current readiness doc: `docs\/active\/COMMENT_TRANSLATOR_PRIVATE_GATED_MAIN_PROMOTION_READINESS\.md`/i, "task board points to Task 28 readiness doc");
assert.match(task, /Task 28 completion criteria: not met/i, "task board records Task 28 incomplete state");
assert.match(task, /readiness\/blocker PR approved by release owner/i, "task board records readiness/blocker PR approval");
assert.match(task, /main promotion, deploy\/upload, and production\/custom smoke were not run/i, "task board records blocked execution surfaces");
assert.match(task, /public-release capable: no/i, "task board keeps public-release capable disabled");
assert.match(task, /Task 28 readiness\/blocker PR targeting `codex\/comment-translator-preview`/i, "task board next action points to readiness/blocker PR");
assert.match(task, /Continue Task 28: Private-gated main promotion and production smoke/i, "next-session prompt advances Task 28");
assert.match(task, /This prompt is not approval for main promotion/i, "next-session prompt keeps approval boundary");

const forbiddenValuePattern =
  /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+/i;

assert.doesNotMatch(combined, forbiddenValuePattern, "Task 28 readiness record avoids secret/private values");

console.log("comment translator private-gated main promotion readiness contract checks passed");
