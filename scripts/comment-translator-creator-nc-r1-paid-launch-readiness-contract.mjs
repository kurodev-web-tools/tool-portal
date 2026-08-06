import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const readinessPath = "docs/active/COMMENT_TRANSLATOR_CREATOR_NC_R1_PAID_LAUNCH_READINESS.md";
const checklistPath = "docs/active/COMMENT_TRANSLATOR_CREATOR_NC_R1_OPERATOR_CHECKLIST.md";
const ncQ1AuthorityPath = "docs/active/COMMENT_TRANSLATOR_CREATOR_NC_Q1_QA_AUTHORITY.md";
const ncQ1ChecklistPath = "docs/active/COMMENT_TRANSLATOR_CREATOR_NC_Q1_OPERATOR_CHECKLIST.md";
const crosswalkPath = "docs/active/COMMENT_TRANSLATOR_CREATOR_NO_CONTAINER_LEGACY_CROSSWALK.md";
const sourceCheckedAt = "2026-08-06";
const sourceMaxAgeDays = 7;
const sourceFreshnessTimeZone = "Asia/Tokyo";

function read(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readTextField(markdown, field) {
  const match = markdown.match(new RegExp(`^${escapeRegExp(field)}=([^\r\n]+)$`, "m"));
  assert.ok(match, `missing ${field}`);
  return match[1].trim();
}

function readUniqueTextField(markdown, field) {
  const matches = [...markdown.matchAll(new RegExp(`^${escapeRegExp(field)}=([^\r\n]+)$`, "gm"))];
  assert.equal(matches.length, 1, `${field} must appear exactly once`);
  return matches[0][1].trim();
}

function sha256(relativePath) {
  return createHash("sha256")
    .update(readFileSync(new URL(`../${relativePath}`, import.meta.url)))
    .digest("hex")
    .toUpperCase();
}

function parseUtcDate(value) {
  assert.match(value, /^\d{4}-\d{2}-\d{2}$/, `invalid ISO date: ${value}`);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  assert.equal(Number.isNaN(parsed.getTime()), false, `invalid UTC date: ${value}`);
  assert.equal(parsed.toISOString().slice(0, 10), value, `non-canonical UTC date: ${value}`);
  return parsed;
}

function calendarDateInTimeZone(value, timeZone = sourceFreshnessTimeZone) {
  assert.equal(Number.isNaN(value.getTime()), false, "now must be a valid date");
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(value);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function assertSourceFreshness(checkedAt, now = new Date()) {
  const checkedDay = parseUtcDate(checkedAt);
  const currentDay = parseUtcDate(calendarDateInTimeZone(now));
  const ageDays = (currentDay.getTime() - checkedDay.getTime()) / 86_400_000;

  assert.ok(ageDays >= 0, `source freshness date is future-dated: ${checkedAt}`);
  assert.ok(ageDays <= sourceMaxAgeDays, `source freshness is stale after ${sourceMaxAgeDays} days: ${checkedAt}`);
}

const canonicalEvidenceRows = [
  { id: "EVID-NC-Q1-FIXTURE", evidenceClass: "fixture", freshness: "fresh", target: "not-applicable", approval: "not-required", hardRequirement: "no", productionProof: "no", status: "satisfied" },
  { id: "EVID-NC-Q1-LOCAL", evidenceClass: "local", freshness: "fresh", target: "exact", approval: "not-required", hardRequirement: "no", productionProof: "no", status: "satisfied" },
  { id: "EVID-LOCAL-PUBLIC-ENTITLEMENT-CONTRACT", evidenceClass: "local", freshness: "fresh", target: "exact", approval: "approved", hardRequirement: "yes", productionProof: "no", status: "satisfied" },
  { id: "EVID-LOCAL-SECURITY-PRIVACY-CONTRACT", evidenceClass: "local", freshness: "fresh", target: "exact", approval: "approved", hardRequirement: "yes", productionProof: "no", status: "satisfied" },
  { id: "EVID-WORKER-SOURCE", evidenceClass: "public-source", freshness: "fresh", target: "not-applicable", approval: "not-required", hardRequirement: "no", productionProof: "no", status: "satisfied" },
  { id: "EVID-WORKER-CPU", evidenceClass: "gated", freshness: "missing", target: "missing", approval: "unapproved", hardRequirement: "yes", productionProof: "no", status: "unapproved" },
  { id: "EVID-WORKER-SIZE", evidenceClass: "local", freshness: "fresh", target: "exact", approval: "approved", hardRequirement: "yes", productionProof: "no", status: "satisfied" },
  { id: "EVID-WORKER-SIZE-LIMIT-ALIGNMENT", evidenceClass: "local", freshness: "fresh", target: "exact", approval: "not-required", hardRequirement: "yes", productionProof: "no", status: "satisfied" },
  { id: "EVID-WORKER-REQUEST", evidenceClass: "gated", freshness: "missing", target: "missing", approval: "unapproved", hardRequirement: "yes", productionProof: "no", status: "unapproved" },
  { id: "EVID-SUPABASE-SOURCE", evidenceClass: "public-source", freshness: "fresh", target: "not-applicable", approval: "not-required", hardRequirement: "no", productionProof: "no", status: "satisfied" },
  { id: "EVID-SUPABASE-SIZE", evidenceClass: "gated", freshness: "missing", target: "missing", approval: "unapproved", hardRequirement: "yes", productionProof: "no", status: "unapproved" },
  { id: "EVID-SUPABASE-EGRESS", evidenceClass: "gated", freshness: "missing", target: "missing", approval: "unapproved", hardRequirement: "yes", productionProof: "no", status: "unapproved" },
  { id: "EVID-SUPABASE-PAUSE", evidenceClass: "gated", freshness: "missing", target: "missing", approval: "unapproved", hardRequirement: "yes", productionProof: "no", status: "unapproved" },
  { id: "EVID-SUPABASE-BACKUP", evidenceClass: "gated", freshness: "missing", target: "missing", approval: "unapproved", hardRequirement: "yes", productionProof: "no", status: "missing" },
  { id: "EVID-PROVIDER-SOURCE", evidenceClass: "public-source", freshness: "fresh", target: "not-applicable", approval: "not-required", hardRequirement: "no", productionProof: "no", status: "satisfied" },
  { id: "EVID-PROVIDER-COST", evidenceClass: "gated", freshness: "missing", target: "missing", approval: "unapproved", hardRequirement: "yes", productionProof: "no", status: "unapproved" },
  { id: "EVID-STRIPE-SOURCE", evidenceClass: "public-source", freshness: "fresh", target: "not-applicable", approval: "not-required", hardRequirement: "no", productionProof: "no", status: "satisfied" },
  { id: "EVID-STRIPE-COST", evidenceClass: "gated", freshness: "missing", target: "missing", approval: "unapproved", hardRequirement: "yes", productionProof: "no", status: "unapproved" },
  { id: "EVID-PRODUCT-PRICE", evidenceClass: "gated", freshness: "missing", target: "missing", approval: "unapproved", hardRequirement: "yes", productionProof: "no", status: "missing" },
  { id: "EVID-LEGAL", evidenceClass: "gated", freshness: "missing", target: "missing", approval: "unapproved", hardRequirement: "yes", productionProof: "no", status: "missing" },
  { id: "EVID-COPY", evidenceClass: "gated", freshness: "missing", target: "missing", approval: "unapproved", hardRequirement: "yes", productionProof: "no", status: "missing" },
  { id: "EVID-SUPPORT", evidenceClass: "gated", freshness: "missing", target: "missing", approval: "unapproved", hardRequirement: "yes", productionProof: "no", status: "missing" },
  { id: "EVID-SLA", evidenceClass: "gated", freshness: "missing", target: "missing", approval: "unapproved", hardRequirement: "yes", productionProof: "no", status: "missing" },
  { id: "EVID-RISK-ACCEPTANCE", evidenceClass: "gated", freshness: "missing", target: "missing", approval: "unapproved", hardRequirement: "yes", productionProof: "no", status: "missing" },
  { id: "EVID-ROLLBACK", evidenceClass: "local", freshness: "fresh", target: "exact", approval: "not-required", hardRequirement: "yes", productionProof: "no", status: "satisfied" },
  { id: "EVID-LIVE-PAID-FLOW", evidenceClass: "live", freshness: "missing", target: "missing", approval: "unapproved", hardRequirement: "yes", productionProof: "no", status: "missing" },
  { id: "EVID-DEPLOYED-TARGET", evidenceClass: "deployed", freshness: "missing", target: "missing", approval: "unapproved", hardRequirement: "yes", productionProof: "no", status: "missing" }
];

const requiredEvidenceIds = canonicalEvidenceRows.map((row) => row.id);
const canonicalEvidenceById = new Map(canonicalEvidenceRows.map((row) => [row.id, row]));
const evidenceClasses = new Set(["fixture", "local", "public-source", "gated", "blocked", "live", "deployed"]);
const allowedStatuses = new Set(["missing", "stale", "incomplete", "target-mismatched", "unapproved", "satisfied"]);
const allowedFreshness = new Set(["fresh", "stale", "missing", "not-applicable"]);
const allowedTargets = new Set(["exact", "missing", "target-mismatched", "not-applicable"]);
const allowedApprovals = new Set(["approved", "unapproved", "not-required"]);

function parseEvidenceRows(markdown) {
  return [...markdown.matchAll(
    /^\| (EVID-[A-Z0-9-]+) \| ([a-z-]+) \| ([a-z-]+) \| ([a-z-]+) \| ([a-z-]+) \| (yes|no) \| (yes|no) \| ([a-z-]+) \|$/gm
  )].map((match) => ({
    id: match[1],
    evidenceClass: match[2],
    freshness: match[3],
    target: match[4],
    approval: match[5],
    hardRequirement: match[6],
    productionProof: match[7],
    status: match[8]
  }));
}

function validateEvidenceRows(rows) {
  assert.deepEqual(
    rows.map((row) => row.id),
    requiredEvidenceIds,
    "the evidence ledger must retain the complete canonical NC-R1 release order"
  );

  for (const row of rows) {
    assert.ok(evidenceClasses.has(row.evidenceClass), `${row.id} has an unknown evidence class`);
    assert.ok(allowedFreshness.has(row.freshness), `${row.id} has an unknown freshness state`);
    assert.ok(allowedTargets.has(row.target), `${row.id} has an unknown target state`);
    assert.ok(allowedApprovals.has(row.approval), `${row.id} has an unknown approval state`);
    assert.ok(allowedStatuses.has(row.status), `${row.id} has an unknown fail-closed status`);

    if (["fixture", "local", "public-source", "gated", "blocked"].includes(row.evidenceClass)) {
      assert.equal(row.productionProof, "no", `${row.id} cannot be production proof`);
    }
    if (row.status === "satisfied") {
      assert.ok(["fresh", "not-applicable"].includes(row.freshness), `${row.id} satisfied evidence must have fresh or not-applicable freshness`);
      assert.ok(["exact", "not-applicable"].includes(row.target), `${row.id} satisfied evidence must have exact or not-applicable target`);
      assert.ok(["approved", "not-required"].includes(row.approval), `${row.id} satisfied evidence must have approved or not-required approval`);
    }

    assert.deepEqual(row, canonicalEvidenceById.get(row.id), `${row.id} must retain its canonical class, hard requirement, and state`);
  }

  return rows.filter((row) => row.hardRequirement === "yes" && row.status !== "satisfied").map((row) => row.id);
}

function parseUnresolvedHardRequirements(markdown) {
  const value = readTextField(markdown, "unresolved_hard_requirements");
  assert.notEqual(value, "", "unresolved_hard_requirements must not be empty");
  return value.split(",");
}

function validateUnresolvedHardRequirements(rows, documentedIds) {
  const calculatedIds = rows
    .filter((row) => row.hardRequirement === "yes" && row.status !== "satisfied")
    .map((row) => row.id);
  assert.deepEqual(
    documentedIds,
    calculatedIds,
    "unresolved_hard_requirements must exactly equal the calculated non-satisfied hard rows"
  );
  return calculatedIds;
}

const canonicalSourceRows = [
  { id: "SRC-WORKER-PRICING", url: "https://developers.cloudflare.com/workers/platform/pricing/", checked: sourceCheckedAt, evidenceClass: "public-source", productionProof: "no" },
  { id: "SRC-WORKER-LIMITS", url: "https://developers.cloudflare.com/workers/platform/limits/", checked: sourceCheckedAt, evidenceClass: "public-source", productionProof: "no" },
  { id: "SRC-SUPABASE-BILLING", url: "https://supabase.com/docs/guides/platform/billing-on-supabase", checked: sourceCheckedAt, evidenceClass: "public-source", productionProof: "no" },
  { id: "SRC-SUPABASE-SIZE", url: "https://supabase.com/docs/guides/platform/database-size", checked: sourceCheckedAt, evidenceClass: "public-source", productionProof: "no" },
  { id: "SRC-SUPABASE-PAUSE", url: "https://supabase.com/docs/guides/platform/free-project-pausing", checked: sourceCheckedAt, evidenceClass: "public-source", productionProof: "no" },
  { id: "SRC-SUPABASE-BACKUP", url: "https://supabase.com/docs/guides/deployment/going-into-prod", checked: sourceCheckedAt, evidenceClass: "public-source", productionProof: "no" },
  { id: "SRC-AZURE-PRICING", url: "https://azure.microsoft.com/en-us/pricing/details/translator/", checked: sourceCheckedAt, evidenceClass: "public-source", productionProof: "no" },
  { id: "SRC-AZURE-LIMITS", url: "https://learn.microsoft.com/en-us/azure/ai-services/translator/service-limits", checked: sourceCheckedAt, evidenceClass: "public-source", productionProof: "no" },
  { id: "SRC-DEEPL-LIMITS", url: "https://developers.deepl.com/docs/resources/usage-limits", checked: sourceCheckedAt, evidenceClass: "public-source", productionProof: "no" },
  { id: "SRC-OPENAI-PRICING", url: "https://developers.openai.com/api/docs/pricing", checked: sourceCheckedAt, evidenceClass: "public-source", productionProof: "no" },
  { id: "SRC-STRIPE-JP", url: "https://stripe.com/jp/pricing", checked: sourceCheckedAt, evidenceClass: "public-source", productionProof: "no" }
];

function parseSourceRows(markdown) {
  return [...markdown.matchAll(
    /^\| (SRC-[A-Z0-9-]+) \| (https:\/\/[^ |]+) \| (\d{4}-\d{2}-\d{2}) \| (public-source) \| (no) \|$/gm
  )].map((match) => ({
    id: match[1],
    url: match[2],
    checked: match[3],
    evidenceClass: match[4],
    productionProof: match[5]
  }));
}

function validateSourceRows(rows, now = new Date()) {
  assert.deepEqual(rows, canonicalSourceRows, "official public source ledger must retain canonical IDs, URLs, dates, class, and proof");
  for (const row of rows) {
    assertSourceFreshness(row.checked, now);
  }
}

const canonicalNumericRows = [
  { id: "NUM-WORKER-REQUEST", observation: "Workers Free: 100,000 requests/day", sourceId: "SRC-WORKER-PRICING", checked: sourceCheckedAt, evidenceClass: "public-source", productionProof: "no" },
  { id: "NUM-WORKER-CPU", observation: "Workers Free: 10 ms CPU/invocation", sourceId: "SRC-WORKER-LIMITS", checked: sourceCheckedAt, evidenceClass: "public-source", productionProof: "no" },
  { id: "NUM-WORKER-MEMORY", observation: "Workers Free: 128 MB memory", sourceId: "SRC-WORKER-LIMITS", checked: sourceCheckedAt, evidenceClass: "public-source", productionProof: "no" },
  { id: "NUM-WORKER-SUBREQUEST", observation: "Workers Free: 50 subrequests/invocation", sourceId: "SRC-WORKER-LIMITS", checked: sourceCheckedAt, evidenceClass: "public-source", productionProof: "no" },
  { id: "NUM-WORKER-SIZE", observation: "Workers Free: 3 MB after compression", sourceId: "SRC-WORKER-LIMITS", checked: sourceCheckedAt, evidenceClass: "public-source", productionProof: "no" },
  { id: "NUM-SUPABASE-ACTIVE", observation: "Supabase Free: 2 active projects", sourceId: "SRC-SUPABASE-BILLING", checked: sourceCheckedAt, evidenceClass: "public-source", productionProof: "no" },
  { id: "NUM-SUPABASE-SIZE", observation: "Supabase Free: 500 MB database/project", sourceId: "SRC-SUPABASE-SIZE", checked: sourceCheckedAt, evidenceClass: "public-source", productionProof: "no" },
  { id: "NUM-SUPABASE-EGRESS", observation: "Supabase Free: 5 GB egress", sourceId: "SRC-SUPABASE-BILLING", checked: sourceCheckedAt, evidenceClass: "public-source", productionProof: "no" },
  { id: "NUM-SUPABASE-STORAGE", observation: "Supabase Free: 1 GB storage", sourceId: "SRC-SUPABASE-BILLING", checked: sourceCheckedAt, evidenceClass: "public-source", productionProof: "no" },
  { id: "NUM-SUPABASE-MAU", observation: "Supabase Free: 50,000 MAU", sourceId: "SRC-SUPABASE-BILLING", checked: sourceCheckedAt, evidenceClass: "public-source", productionProof: "no" },
  { id: "NUM-SUPABASE-READONLY", observation: "Supabase database over 500 MB enters read-only", sourceId: "SRC-SUPABASE-SIZE", checked: sourceCheckedAt, evidenceClass: "public-source", productionProof: "no" },
  { id: "NUM-SUPABASE-PAUSE", observation: "Low-activity Supabase Free projects may pause over a 7-day period", sourceId: "SRC-SUPABASE-PAUSE", checked: sourceCheckedAt, evidenceClass: "public-source", productionProof: "no" },
  { id: "NUM-AZURE-MONTHLY", observation: "Azure Translator F0: 2 million characters/month", sourceId: "SRC-AZURE-PRICING", checked: sourceCheckedAt, evidenceClass: "public-source", productionProof: "no" },
  { id: "NUM-AZURE-HOURLY", observation: "Azure Translator service limit: 2 million characters/hour", sourceId: "SRC-AZURE-LIMITS", checked: sourceCheckedAt, evidenceClass: "public-source", productionProof: "no" },
  { id: "NUM-DEEPL-MONTHLY", observation: "DeepL API Free: 500,000 characters/month", sourceId: "SRC-DEEPL-LIMITS", checked: sourceCheckedAt, evidenceClass: "public-source", productionProof: "no" },
  { id: "NUM-STRIPE-DOMESTIC", observation: "Stripe Japan domestic card successful charge: 3.6%", sourceId: "SRC-STRIPE-JP", checked: sourceCheckedAt, evidenceClass: "public-source", productionProof: "no" },
  { id: "NUM-STRIPE-BILLING", observation: "Stripe Billing: 0.7% of Billing volume", sourceId: "SRC-STRIPE-JP", checked: sourceCheckedAt, evidenceClass: "public-source", productionProof: "no" }
];

function parseNumericRows(markdown) {
  return [...markdown.matchAll(
    /^\| (NUM-[A-Z0-9-]+) \| ([^|]+?) \| (SRC-[A-Z0-9-]+) \| (\d{4}-\d{2}-\d{2}) \| (public-source) \| (no) \|$/gm
  )].map((match) => ({
    id: match[1],
    observation: match[2],
    sourceId: match[3],
    checked: match[4],
    evidenceClass: match[5],
    productionProof: match[6]
  }));
}

function validateNumericRows(rows) {
  assert.deepEqual(
    rows,
    canonicalNumericRows,
    "numeric claims must exactly match canonical ID, observation, source, date, class, and proof"
  );
}

function cloneRows(rows) {
  return rows.map((row) => ({ ...row }));
}

function runNegativeHelperAssertions(evidenceRows, numericRows, documentedUnresolved) {
  const hardDowngrade = cloneRows(evidenceRows);
  hardDowngrade.find((row) => row.id === "EVID-WORKER-CPU").hardRequirement = "no";
  assert.throws(() => validateEvidenceRows(hardDowngrade), /EVID-WORKER-CPU/);

  const invalidWorkerLimitAlignment = cloneRows(evidenceRows);
  const workerLimitAlignment = invalidWorkerLimitAlignment.find((row) => row.id === "EVID-WORKER-SIZE-LIMIT-ALIGNMENT");
  workerLimitAlignment.target = "target-mismatched";
  workerLimitAlignment.approval = "unapproved";
  workerLimitAlignment.status = "target-mismatched";
  assert.throws(() => validateEvidenceRows(invalidWorkerLimitAlignment), /EVID-WORKER-SIZE-LIMIT-ALIGNMENT/);

  const invalidSatisfied = cloneRows(evidenceRows);
  invalidSatisfied.find((row) => row.id === "EVID-WORKER-CPU").status = "satisfied";
  assert.throws(() => validateEvidenceRows(invalidSatisfied), /satisfied evidence must have fresh or not-applicable freshness/);

  assert.throws(
    () => validateUnresolvedHardRequirements(evidenceRows, documentedUnresolved.slice(1)),
    /unresolved_hard_requirements must exactly equal/
  );

  const changedNumericValue = cloneRows(numericRows);
  changedNumericValue.find((row) => row.id === "NUM-WORKER-CPU").observation = "Workers Free: 11 ms CPU/invocation";
  assert.throws(() => validateNumericRows(changedNumericValue), /numeric claims must exactly match canonical/);

  const changedNumericSource = cloneRows(numericRows);
  changedNumericSource.find((row) => row.id === "NUM-WORKER-CPU").sourceId = "SRC-WORKER-PRICING";
  assert.throws(() => validateNumericRows(changedNumericSource), /numeric claims must exactly match canonical/);

  const boundaryNow = new Date("2026-08-13T12:00:00.000Z");
  assert.doesNotThrow(() => assertSourceFreshness("2026-08-06", boundaryNow));
  assert.throws(() => assertSourceFreshness("2026-08-05", boundaryNow), /stale/);
  const tokyoSixth = new Date("2026-08-05T18:32:00.000Z");
  assert.equal(calendarDateInTimeZone(tokyoSixth), "2026-08-06");
  assert.throws(() => assertSourceFreshness("2026-08-07", tokyoSixth), /future-dated/);
}

const readiness = read(readinessPath);
const checklist = read(checklistPath);
const ncQ1Authority = read(ncQ1AuthorityPath);
const ncQ1Checklist = read(ncQ1ChecklistPath);
const crosswalk = read(crosswalkPath);
const task = read("task.md");

for (const marker of [
  "lane=NC-R1",
  "base=codex/comment-translator-free-public-beta-integration",
  "pr=748",
  "pr_state=merged",
  "pr_final_head=9aeaf4de5fbcb7264014464f1dca4fec1da4681e",
  "pr_merged_at=2026-08-03T20:40:36Z",
  "merge_integration_tip=1b98aa28429cb82a188dee628cf71ea0a4d50c16",
  "pr_deployment_status=not-confirmed",
  "source_checked_at=2026-08-06",
  "source_max_age_days=7",
  "source_freshness_timezone=Asia/Tokyo",
  "decision=no-go",
  "activation_status=closed",
  "release_owner_decision=missing",
  "production_proof_status=incomplete",
  "local_dependencies=present-lockfile-installed",
  "local_lint=passed",
  "local_strict_typecheck=passed",
  "local_next_build=passed",
  "local_opennext_build=passed",
  "local_worker_bundle_measurement=passed-wrangler-reported-gzip-2032.88-kib",
  "## Evidence Class Contract",
  "## Evidence Ledger",
  "## Public Official Source Ledger",
  "## Supported Numeric Claims",
  "## Risk Acceptance",
  "## Go Or No-Go Decision",
  "## Rollback And Stop Conditions",
  "## Non-Claims"
]) {
  assert.match(readiness, new RegExp(escapeRegExp(marker)), `missing readiness marker: ${marker}`);
}

assert.equal(readTextField(readiness, "source_checked_at"), sourceCheckedAt, "source_checked_at must retain the task-time source check");
assert.equal(readTextField(readiness, "source_max_age_days"), String(sourceMaxAgeDays), "source_max_age_days must retain the bounded policy");
assert.equal(readTextField(readiness, "source_freshness_timezone"), sourceFreshnessTimeZone, "source freshness timezone must retain the repository policy");
assertSourceFreshness(sourceCheckedAt);
assert.match(checklist, /source_max_age_days=7/, "operator checklist must retain the source freshness policy");
assert.match(checklist, /source_freshness_timezone=Asia\/Tokyo/, "operator checklist must retain the source freshness timezone");

for (const evidenceClass of evidenceClasses) {
  assert.match(
    readiness,
    new RegExp("^\\| `" + escapeRegExp(evidenceClass) + "` \\|", "m"),
    `missing evidence-class definition: ${evidenceClass}`
  );
}

const evidenceRows = parseEvidenceRows(readiness);
const unresolvedHardRequirements = validateEvidenceRows(evidenceRows);
const documentedUnresolvedHardRequirements = parseUnresolvedHardRequirements(readiness);
assert.deepEqual(
  unresolvedHardRequirements,
  validateUnresolvedHardRequirements(evidenceRows, documentedUnresolvedHardRequirements),
  "calculated unresolved hard requirements must match the documented list"
);
assert.equal(unresolvedHardRequirements.length, 16, "current NC-R1 must retain exactly 16 unresolved hard requirements");
assert.equal(readTextField(readiness, "decision"), "no-go", "unresolved hard requirements must produce NO-GO");
assert.equal(readTextField(readiness, "conditional-go"), "forbidden-while-hard-requirement-unresolved");

const ncQ1Fixture = evidenceRows.find((row) => row.id === "EVID-NC-Q1-FIXTURE");
const ncQ1Local = evidenceRows.find((row) => row.id === "EVID-NC-Q1-LOCAL");
const workerLimitAlignment = evidenceRows.find((row) => row.id === "EVID-WORKER-SIZE-LIMIT-ALIGNMENT");
assert.equal(ncQ1Fixture?.evidenceClass, "fixture");
assert.equal(ncQ1Fixture?.productionProof, "no");
assert.equal(ncQ1Local?.evidenceClass, "local");
assert.equal(ncQ1Local?.productionProof, "no");
assert.deepEqual(workerLimitAlignment, canonicalEvidenceById.get("EVID-WORKER-SIZE-LIMIT-ALIGNMENT"), "Worker size-limit alignment must retain the exact local internal-ceiling acceptance evidence");
assert.match(readiness, /worker_bundle_internal_acceptance_ceiling_bytes=3000000/);
assert.match(readiness, /official public wording `3 MB after compression`/);
assert.match(readiness, /provider binary\/decimal semantics を主張せず/);
assert.doesNotMatch(`${readiness}\n${checklist}`, /\b3MiB\b/);
assert.match(readiness, /lint, strict TypeScript, Next build, and OpenNext build now pass/);
assert.match(readiness, /historical changed-file allowlists were not widened/);
const canonicalLocalEvidenceFields = {
  local_evidence_recorded_at: "2026-08-06T15:49:21+09:00",
  local_evidence_target_commit: "1b98aa28429cb82a188dee628cf71ea0a4d50c16",
  local_evidence_target_kind: "dirty-worktree-snapshot-not-clean-commit",
  local_evidence_pre_record_diff_sha256: "C1B149E7BBD189E470004F081FAEC307119FA1D5B20D157047320426BF1F5532",
  local_evidence_approval_scope: "fresh-worktree-lockfile-install-local-regression-fix-and-local-verification",
  local_package_json_sha256: "D28E0445B69199FB639E7EE193313D2E82DE15B9300C06CE179A3CD25AE80E91",
  local_package_lock_sha256: "0F3B1074691B8296E1E6C957C469DCB536B6C67B90890170600D7F50AEA138C8",
  local_installed_package_count: "691",
  local_install_command: "npm.cmd clean-install --progress=false",
  local_install_exit: "0",
  local_lint_command: "npm.cmd run lint",
  local_lint_exit: "0",
  local_typecheck_command: "node_modules/.bin/tsc.cmd --noEmit",
  local_typecheck_exit: "0",
  local_next_build_command: "npm.cmd run build",
  local_next_build_exit: "0",
  local_opennext_build_command: "npm.cmd run build:cloudflare",
  local_opennext_build_exit: "0",
  local_bundle_command: "node_modules/.bin/wrangler.cmd deploy --dry-run",
  local_bundle_exit: "0",
  local_bundle_reported_total_kib: "9477.87",
  local_bundle_reported_gzip_kib: "2032.88",
  local_bundle_conservative_upper_bound_bytes: "2081675",
  local_bundle_internal_ceiling_bytes: "3000000",
  local_public_entitlement_contract_command: "node scripts/comment-translator-public-entitlement-baseline-contract.mjs",
  local_public_entitlement_contract_exit: "0",
  local_security_privacy_contract_command: "node scripts/comment-translator-security-privacy-final-review-contract.mjs",
  local_security_privacy_contract_exit: "0"
};
for (const [field, expected] of Object.entries(canonicalLocalEvidenceFields)) {
  assert.equal(readUniqueTextField(readiness, field), expected, `${field} must retain its exact canonical value`);
}
assert.equal(sha256("package.json"), canonicalLocalEvidenceFields.local_package_json_sha256, "package.json hash must match the recorded local evidence");
assert.equal(sha256("package-lock.json"), canonicalLocalEvidenceFields.local_package_lock_sha256, "package-lock.json hash must match the recorded local evidence");
assert.ok(
  Number(canonicalLocalEvidenceFields.local_bundle_conservative_upper_bound_bytes) < Number(canonicalLocalEvidenceFields.local_bundle_internal_ceiling_bytes),
  "the conservative rounded bundle upper bound must remain below the local internal ceiling"
);
assert.match(readiness, /does not prove an exact actual byte count/);
assert.match(readiness, /does not claim that the commit alone reproduces the result/);
assert.match(readiness, /SHA-256 of `git diff --binary` captured immediately before the rerun/);

const sourceRows = parseSourceRows(readiness);
validateSourceRows(sourceRows);

const numericRows = parseNumericRows(readiness);
validateNumericRows(numericRows);
assert.match(readiness, /unsupported-numeric-claim=forbidden/);
assert.match(readiness, /public-source-is-not-account-headroom-or-production-proof/);

runNegativeHelperAssertions(evidenceRows, numericRows, documentedUnresolvedHardRequirements);

for (const invariant of [
  "Free behavior remains permanent",
  "all billing/provider/Creator/public activation gates remain fixed closed",
  "only compatible signed subscription evidence may authorize Paid",
  "Checkout redirect/completion is not Paid evidence",
  "fixture, local, and public-source evidence are not production proof",
  "Product/Price/tax/legal/copy/support/SLA/risk acceptance are not inferred",
  "EVID-PRODUCT-PRICE",
  "EVID-RISK-ACCEPTANCE"
]) {
  assert.match(readiness, new RegExp(escapeRegExp(invariant)), `missing readiness invariant: ${invariant}`);
}

for (const reference of [ncQ1AuthorityPath, ncQ1ChecklistPath, crosswalkPath]) {
  assert.match(`${readiness}\n${checklist}`, new RegExp(escapeRegExp(reference)), `missing authority reference: ${reference}`);
}
assert.match(ncQ1Authority, /Fixture or local success never satisfies/);
assert.match(ncQ1Checklist, /Keep activation closed/);

for (const marker of [
  "current_goal=comment-translator-creator-nc-r1-paid-launch-readiness",
  "current_pr=748",
  "current_pr_state=merged",
  "current_pr_final_head=9aeaf4de5fbcb7264014464f1dca4fec1da4681e",
  "current_pr_merge_commit=1b98aa28429cb82a188dee628cf71ea0a4d50c16",
  "current_base=codex/comment-translator-free-public-beta-integration",
  "current_lane=NC-R1",
  "launch_readiness_decision=no-go",
  "publication_status=pr-748-merged",
  "deploy_status=not-confirmed-for-pr-748",
  "nc_l1_status=not-started",
  "nc_l1_start_condition=nc-r1-explicit-go-after-zero-unresolved-hard-requirements",
  readinessPath,
  checklistPath
]) {
  assert.match(task, new RegExp(escapeRegExp(marker)), `missing current task marker: ${marker}`);
}

const legacyIds = [
  ...Array.from({ length: 12 }, (_, index) => `C${index + 1}`),
  "CP1",
  "CP2",
  ...Array.from({ length: 9 }, (_, index) => `P1-${index + 1}`)
];
const actualLegacyIds = [...crosswalk.matchAll(/^\| (C(?:[1-9]|1[0-2])|CP[12]|P1-[1-9]) \|/gm)].map((match) => match[1]);
assert.deepEqual(actualLegacyIds, legacyIds, "legacy 23 reference integrity must remain exact");

for (const marker of [
  "## Preconditions",
  "## Read-Only Public Source Refresh",
  "## Separately Approved Evidence Units",
  "## Release Owner Decisions",
  "## Stop Conditions",
  "## Rollback Packet",
  "## Go Or No-Go Record",
  "current_decision=no-go",
  "unresolved_hard_requirements=16",
  "activation_status=closed",
  "no external operation is authorized by this checklist"
]) {
  assert.match(checklist, new RegExp(escapeRegExp(marker)), `missing operator marker: ${marker}`);
}

for (const approvalUnit of [
  "APPROVAL-CLOUDFLARE-READ",
  "APPROVAL-SUPABASE-READ",
  "APPROVAL-SUPABASE-BACKUP-RISK",
  "APPROVAL-PROVIDER-READ",
  "APPROVAL-STRIPE-READ",
  "APPROVAL-PRODUCT-PRICE",
  "APPROVAL-LEGAL",
  "APPROVAL-COPY",
  "APPROVAL-SUPPORT",
  "APPROVAL-SLA-RISK",
  "APPROVAL-RISK-ACCEPTANCE",
  "APPROVAL-LIVE-PAID-FLOW",
  "APPROVAL-AUTH-BROWSER",
  "APPROVAL-DEPLOY",
  "APPROVAL-ACTIVATION",
  "APPROVAL-PUBLIC-PAID-GATE"
]) {
  assert.match(checklist, new RegExp(`^\\| ${approvalUnit} \\| unapproved \\|`, "m"), `missing closed approval unit: ${approvalUnit}`);
}
assert.match(checklist, /^\| APPROVAL-LOCAL-REGRESSION-FIX \| approved-completed-local \|/m, "local regression approval must be recorded as completed without opening external gates");
assert.doesNotMatch(checklist, /APPROVAL-WORKER-LIMIT-ALIGNMENT/);

assert.doesNotMatch(`${readiness}\n${checklist}`, /(?:sk_(?:live|test)_|whsec_|bearer\s|authorization:|password=|cookie=|localstorage|sessionstorage|indexeddb|livechatid|customer_[a-z0-9]|subscription_[a-z0-9])/i);
assert.doesNotMatch(`${readiness}\n${checklist}`, /(?:dockerfile|container binding|container-backed)/i);

process.stdout.write(
  `comment translator Creator NC-R1 paid launch readiness contract passed (decision=no-go; unresolved-hard=${unresolvedHardRequirements.length}; activation=closed)\n`
);
