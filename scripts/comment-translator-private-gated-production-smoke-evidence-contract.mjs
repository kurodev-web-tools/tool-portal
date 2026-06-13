import assert from "node:assert/strict";
import fs from "node:fs";

const taskPath = "task.md";
const evidenceDocPath = "docs/active/COMMENT_TRANSLATOR_PRIVATE_GATED_PRODUCTION_SMOKE_EVIDENCE.md";
const envReadinessDocPath = "docs/active/COMMENT_TRANSLATOR_PRODUCTION_ENV_READINESS.md";
const archivedReadinessDocPath = "docs/archive/COMMENT_TRANSLATOR_PRIVATE_GATED_MAIN_PROMOTION_READINESS.md";
const archivedPreflightDocPath = "docs/archive/COMMENT_TRANSLATOR_PRIVATE_GATED_MAIN_PROMOTION_EXACT_PREFLIGHT.md";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

assert.ok(fs.existsSync(evidenceDocPath), "Task 28 production smoke evidence doc exists");
assert.ok(fs.existsSync(envReadinessDocPath), "production env readiness doc remains active");
assert.ok(fs.existsSync(archivedReadinessDocPath), "planning readiness doc is archived");
assert.ok(fs.existsSync(archivedPreflightDocPath), "exact preflight doc is archived");

const task = read(taskPath);
const evidence = read(evidenceDocPath);
const envReadiness = read(envReadinessDocPath);
const combined = `${task}\n${evidence}\n${envReadiness}`;

assert.match(evidence, /Task 28 private-gated main promotion \/ production smoke evidence/i, "doc records Task 28 evidence scope");
assert.match(evidence, /Public-release capable: no/i, "doc keeps public-release capable disabled");
assert.match(evidence, /sanitized-metadata-only/i, "doc records sanitized output policy");
assert.match(evidence, /PR state: `MERGED`/i, "doc records merged PR state");
assert.match(evidence, /Base\/head: `main` \/ `codex\/comment-translator-main-promotion-post-pr437`/i, "doc records base and head labels");
assert.match(evidence, /Merge commit: `e8508f59e3dbfa3fa0b61dd52e8346f1d1ef0bda`/i, "doc records main merge commit");
assert.match(evidence, /contained in `origin\/main`/i, "doc records main containment");
assert.match(evidence, /Workers Builds: v-streamer-tools/i, "doc records Workers build evidence");
assert.match(evidence, /conclusion `success`/i, "doc records successful Workers build conclusion");
assert.match(evidence, /Manual Cloudflare upload\/deploy command: not run/i, "doc distinguishes automatic build from manual deploy");
assert.match(evidence, /\| custom domain \| `\/tools\/comment-translator\/` \| GET \| current app route served \| `200` \|/i, "doc records custom tool route smoke");
assert.match(evidence, /\| workers\.dev \| `\/tools\/comment-translator\/` \| GET \| current app route served \| `200` \|/i, "doc records workers.dev tool route smoke");
assert.match(evidence, /`403`, state `stopped`, launch access `private-launch-gated`/i, "doc records session API denial");
assert.match(evidence, /payload status `unavailable`, reason `private-launch-gated`/i, "doc records credential status denial");
assert.match(evidence, /private-launch element absent[\s\S]*Start` \/ `Stop` controls visible/i, "doc records allowed-tester tool rendering");
assert.match(evidence, /YouTube connection controls visible/i, "doc records allowed-tester integrations rendering");
assert.match(evidence, /Free\/Paid plan surface visible/i, "doc records allowed-tester billing rendering");
assert.match(evidence, /lowercase-normalized production Supabase Auth UID/i, "doc records normalized hash resolution without values");
assert.match(evidence, /not fully complete[\s\S]*pressing `Start`/i, "doc does not overclaim session smoke");
assert.match(evidence, /Still not run:[\s\S]*allowed-tester session start smoke/i, "doc records remaining session smoke gate");
assert.match(evidence, /docs\/archive\/COMMENT_TRANSLATOR_PRIVATE_GATED_MAIN_PROMOTION_READINESS\.md/i, "doc points to archived readiness record");
assert.match(evidence, /docs\/archive\/COMMENT_TRANSLATOR_PRIVATE_GATED_MAIN_PROMOTION_EXACT_PREFLIGHT\.md/i, "doc points to archived exact preflight record");
assert.match(evidence, /Width Checks[\s\S]*does not change UI/i, "doc records width-check interpretation");

assert.match(envReadiness, /production env readiness\/reference inventory/i, "env doc is updated as active reference inventory");
assert.match(envReadiness, /COMMENT_TRANSLATOR_PRIVATE_GATED_PRODUCTION_SMOKE_EVIDENCE\.md/i, "env doc links current evidence doc");

assert.match(task, /current evidence doc: `docs\/active\/COMMENT_TRANSLATOR_PRIVATE_GATED_PRODUCTION_SMOKE_EVIDENCE\.md`/i, "task board points to current evidence doc");
assert.match(task, /archived planning docs:/i, "task board records archived planning docs");
assert.match(task, /Task 28 completion criteria: partially met/i, "task board records partial Task 28 completion");
assert.match(task, /allowed-tester session start smoke was not run/i, "task board does not overclaim session smoke");
assert.match(task, /public-release capable: no/i, "task board keeps public-release capable disabled");
assert.match(task, /Continue Task 28 session smoke or begin Task 29 only after/i, "next-session prompt records next gate");

const forbiddenValuePattern =
  /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+|ownerUserId\s*[:=]\s*["'][^"']+|[a-f0-9]{64}/i;

assert.doesNotMatch(combined, forbiddenValuePattern, "Task 28 production evidence avoids secret/private/hash values");

console.log("comment translator private-gated production smoke evidence contract checks passed");
