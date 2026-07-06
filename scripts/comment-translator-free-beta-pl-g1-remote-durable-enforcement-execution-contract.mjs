import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const plG1EvidenceDocPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PL_G1_REMOTE_DURABLE_ENFORCEMENT_EXECUTION_EVIDENCE.md";
const fbL2EvidenceDocPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_REMOTE_DURABLE_ENFORCEMENT_EVIDENCE.md";
const fbL2PreflightDocPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_REMOTE_DURABLE_ENFORCEMENT_READY_PREFLIGHT.md";
const publicUsabilityPreflightPath = "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_USABILITY_PREFLIGHT.md";
const launchDecisionEvidencePath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_LAUNCH_GATE_DECISION_EVIDENCE.md";
const launchDecisionPreflightPath =
  "docs/active/COMMENT_TRANSLATOR_FREE_BETA_PUBLIC_LAUNCH_GATE_DECISION_READY_PREFLIGHT.md";
const finalQaPath = "docs/active/COMMENT_TRANSLATOR_FREE_PUBLIC_BETA_FINAL_QA_READINESS.md";
const gapAuditPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_BETA_GAP_AUDIT.md";
const taskPath = "task.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function escaped(fragment) {
  return fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function assertNoSensitiveValues(source, label) {
  assert.doesNotMatch(
    source,
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|\bAuthorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+|SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+/i,
    `${label} does not contain secret values, token values, authorization values, private provider identifiers, live target values, or raw comments`
  );
}

for (const requiredPath of [
  plG1EvidenceDocPath,
  fbL2EvidenceDocPath,
  fbL2PreflightDocPath,
  publicUsabilityPreflightPath,
  launchDecisionEvidencePath,
  launchDecisionPreflightPath,
  finalQaPath,
  gapAuditPath,
  taskPath
]) {
  assert.ok(exists(requiredPath), `PL-G1 required reference exists: ${requiredPath}`);
}

const plG1EvidenceDoc = read(plG1EvidenceDocPath);
const fbL2EvidenceDoc = read(fbL2EvidenceDocPath);
const fbL2PreflightDoc = read(fbL2PreflightDocPath);
const publicUsabilityPreflight = read(publicUsabilityPreflightPath);
const launchDecisionEvidence = read(launchDecisionEvidencePath);
const launchDecisionPreflight = read(launchDecisionPreflightPath);
const finalQa = read(finalQaPath);
const gapAudit = read(gapAuditPath);
const task = read(taskPath);

for (const requiredSection of [
  "## Purpose",
  "## Execution Decision",
  "## Inspected Inputs",
  "## PL-G1 Required Outcome",
  "## Approval Gate Result",
  "## Sanitized Evidence Record",
  "## What This Does Not Prove",
  "## Next Safe Action",
  "## Unchecked Scope And Residual Risk",
  "## Completion Verification"
]) {
  assert.match(plG1EvidenceDoc, new RegExp(`^${escaped(requiredSection)}$`, "m"), `PL-G1 evidence doc includes ${requiredSection}`);
}

for (const requiredFragment of [
  "Status: PL-G1 Execute FB-L2 remote durable enforcement",
  "Execution result: remote-apply-and-deployed-smoke-completed",
  "Public-release capable: no",
  "remote Supabase migration apply: completed",
  "remote mutation outside approved deployed smoke: not-run / approval-gated",
  "deployed durable session/usage smoke: completed",
  "approved-fb-l2-remote-durable-enforcement-apply-and-smoke",
  "same-thread ready preflight",
  "sanitized output review",
  "exact explicit approval",
  "comment_translator_sessions",
  "comment_translator_usage_ledger_events",
  "fail closed",
  "30 minutes per user per day",
  "30 minutes per session",
  "1 active session per user",
  "30 translated messages per minute",
  "20,000 translated characters per month",
  "Paid entitlement C1/C3",
  "Stripe billing",
  "Creator paid limits",
  "counts/status/stop reasons only",
  "COMMENT_TRANSLATOR_DEPLOYED_ORIGIN",
  "COMMENT_TRANSLATOR_ALLOWED_TESTER_COOKIE",
  "COMMENT_TRANSLATOR_CREDENTIAL_REFERENCE",
  "PL-G1_SANITIZED_RESULT failed=migration-list-failed",
  "PL-G1_SANITIZED_DIAGNOSTIC category=blocked-supabase-link cli=present linkedMetadata=missing",
  "PL-G1_SANITIZED_LOCAL_CHECK migrationList=passed linkedMetadata=present dryRun=reviewed-two-migrations-only",
  "PL-G1_SANITIZED_APPLY result=completed",
  "PL-G1_SANITIZED_POST_APPLY migrationList=passed",
  "PL-G1_SANITIZED_SMOKE intent=status http=200 status=not-started stopReason=none",
  "PL-G1_SANITIZED_SMOKE intent=start http=200 status=stopped stopReason=stream-unavailable",
  "PL-G1_SANITIZED_SMOKE intent=stop http=200 status=stopped stopReason=user-stop",
  "no browser storage expansion",
  "no handoff payload expansion",
  "no visible UI/CSS/layout/copy change"
]) {
  assert.match(plG1EvidenceDoc, new RegExp(escaped(requiredFragment), "i"), `PL-G1 evidence doc includes ${requiredFragment}`);
}

assert.match(fbL2EvidenceDoc, /blocked-no-approval/i, "FB-L2 evidence remains blocked without approval");
assert.match(fbL2EvidenceDoc, /remote Supabase migration apply[\s\S]*not-run \/ approval-gated/i, "FB-L2 remote apply remains not-run");
assert.match(fbL2EvidenceDoc, /comment_translator_sessions[\s\S]*comment_translator_usage_ledger_events/i, "FB-L2 durable authority tables remain documented");
assert.match(fbL2PreflightDoc, /Approval label: `approved-fb-l2-remote-durable-enforcement-apply-and-smoke`/i, "FB-L2 exact approval label remains documented");
assert.match(fbL2PreflightDoc, /npx supabase db push --linked[\s\S]*approval-gated/i, "FB-L2 remote apply command remains approval-gated");
assert.match(publicUsabilityPreflight, /FB-L2[\s\S]*remote\/deployed durable enforcement/i, "FB-L1 preflight keeps FB-L2 as the first durable execution gate");
assert.match(launchDecisionEvidence, /FB-L2 remote durable enforcement: not-run \/ approval-gated/i, "FB-L6 evidence still records FB-L2 as not-run");
assert.match(launchDecisionPreflight, /FB-L2 remote durable enforcement must be approved and recorded/i, "FB-L6 preflight still requires FB-L2 evidence");
assert.match(finalQa, /Remote Supabase migration\/apply and deployed durable session\/usage enforcement are not verified/i, "F15 final QA still blocks on durable remote enforcement");
assert.match(gapAudit, /FB-L2 remains blocked until same-thread ready preflight, sanitized output review, and exact explicit approval exist/i, "gap audit still blocks FB-L2 until approval");

assert.match(task, /PL-G1 Remote durable enforcement[\s\S]*complete/i, "task.md records durable enforcement complete");
assert.match(task, /PL-G2 Allowed-tester route\/API smoke[\s\S]*complete/i, "task.md records route/API smoke complete");
assert.match(task, /PL-G5 Release-owner public launch decision[\s\S]*pending/i, "task.md keeps release-owner decision pending");
assert.match(task, /Current public-launch decision: `public-release capable: no`/i, "task.md keeps public release blocked");
assert.match(task, /remote schema migration \/ Supabase migration apply/i, "task.md keeps remote migration apply approval-gated");
assert.match(task, /same-thread \/ operator-local same-command-process ready preflight/i, "task.md keeps live/provider preflight approval gate");

for (const [label, source] of [
  [plG1EvidenceDocPath, plG1EvidenceDoc],
  [fbL2EvidenceDocPath, fbL2EvidenceDoc],
  [fbL2PreflightDocPath, fbL2PreflightDoc],
  [publicUsabilityPreflightPath, publicUsabilityPreflight],
  [launchDecisionEvidencePath, launchDecisionEvidence],
  [launchDecisionPreflightPath, launchDecisionPreflight],
  [finalQaPath, finalQa],
  [gapAuditPath, gapAudit],
  [taskPath, task]
]) {
  assertNoSensitiveValues(source, label);
}

console.log("comment translator Free beta PL-G1 remote durable enforcement execution contract checks passed");
