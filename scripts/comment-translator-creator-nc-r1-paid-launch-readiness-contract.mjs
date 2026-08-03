import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const readinessPath = "docs/active/COMMENT_TRANSLATOR_CREATOR_NC_R1_PAID_LAUNCH_READINESS.md";
const checklistPath = "docs/active/COMMENT_TRANSLATOR_CREATOR_NC_R1_OPERATOR_CHECKLIST.md";
const ncQ1AuthorityPath = "docs/active/COMMENT_TRANSLATOR_CREATOR_NC_Q1_QA_AUTHORITY.md";
const ncQ1ChecklistPath = "docs/active/COMMENT_TRANSLATOR_CREATOR_NC_Q1_OPERATOR_CHECKLIST.md";
const crosswalkPath = "docs/active/COMMENT_TRANSLATOR_CREATOR_NO_CONTAINER_LEGACY_CROSSWALK.md";
const sourceCheckedAt = "2026-08-04";
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
  { id: "EVID-WORKER-SOURCE", evidenceClass: "public-source", freshness: "fresh", target: "not-applicable", approval: "not-required", hardRequirement: "no", productionProof: "no", status: "satisfied" },
  { id: "EVID-WORKER-CPU", evidenceClass: "gated", freshness: "missing", target: "missing", approval: "unapproved", hardRequirement: "yes", productionProof: "no", status: "unapproved" },
  { id: "EVID-WORKER-SIZE", evidenceClass: "blocked", freshness: "missing", target: "exact", approval: "approved", hardRequirement: "yes", productionProof: "no", status: "incomplete" },
  { id: "EVID-WORKER-SIZE-LIMIT-ALIGNMENT", evidenceClass: "gated", freshness: "fresh", target: "target-mismatched", approval: "unapproved", hardRequirement: "yes", productionProof: "no", status: "target-mismatched" },
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
  { id: "EVID-LEGAL", evidenceClass: "gated", freshness: "missing", target: "missing", approval: "unapproved", hardRequirement: "yes", productionProof: "no", status: "missing" },
  { id: "EVID-COPY", evidenceClass: "gated", freshness: "missing", target: "missing", approval: "unapproved", hardRequirement: "yes", productionProof: "no", status: "missing" },
  { id: "EVID-SUPPORT", evidenceClass: "gated", freshness: "missing", target: "missing", approval: "unapproved", hardRequirement: "yes", productionProof: "no", status: "missing" },
  { id: "EVID-SLA", evidenceClass: "gated", freshness: "missing", target: "missing", approval: "unapproved", hardRequirement: "yes", productionProof: "no", status: "missing" },
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
  { id: "NUM-SUPABASE-PAUSE", observation: "Low-activity Supabase Free projects may pause after a 7-day window", sourceId: "SRC-SUPABASE-PAUSE", checked: sourceCheckedAt, evidenceClass: "public-source", productionProof: "no" },
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

  const weakenedWorkerLimitAlignment = cloneRows(evidenceRows);
  const workerLimitAlignment = weakenedWorkerLimitAlignment.find((row) => row.id === "EVID-WORKER-SIZE-LIMIT-ALIGNMENT");
  workerLimitAlignment.target = "exact";
  workerLimitAlignment.approval = "approved";
  workerLimitAlignment.status = "satisfied";
  assert.throws(() => validateEvidenceRows(weakenedWorkerLimitAlignment), /EVID-WORKER-SIZE-LIMIT-ALIGNMENT/);

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

  const boundaryNow = new Date("2026-08-11T12:00:00.000Z");
  assert.doesNotThrow(() => assertSourceFreshness("2026-08-04", boundaryNow));
  assert.throws(() => assertSourceFreshness("2026-08-03", boundaryNow), /stale/);
  const tokyoFourth = new Date("2026-08-03T18:32:00.000Z");
  assert.equal(calendarDateInTimeZone(tokyoFourth), "2026-08-04");
  assert.throws(() => assertSourceFreshness("2026-08-05", tokyoFourth), /future-dated/);
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
  "base_merge_commit=16eb30f09ae19216eafc34e124ac12ab885dbe5e",
  "base_final_head=df1a92f123d5cd3ec30b1d43e5eb0d0efacb6a71",
  "base_deployment_status=not-confirmed",
  "source_checked_at=2026-08-04",
  "source_max_age_days=7",
  "source_freshness_timezone=Asia/Tokyo",
  "decision=no-go",
  "activation_status=closed",
  "release_owner_decision=missing",
  "production_proof_status=incomplete",
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
assert.deepEqual(workerLimitAlignment, canonicalEvidenceById.get("EVID-WORKER-SIZE-LIMIT-ALIGNMENT"), "Worker size-limit alignment must remain an explicit mismatch gate");

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
  "Product/Price/tax/legal/copy/support/SLA/risk acceptance are not inferred"
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
  "current_pr=none",
  "current_pr_state=not-created",
  "previous_pr=747",
  "previous_pr_state=merged",
  "previous_pr_merge_commit=16eb30f09ae19216eafc34e124ac12ab885dbe5e",
  "previous_pr_final_head=df1a92f123d5cd3ec30b1d43e5eb0d0efacb6a71",
  "current_branch=codex/comment-translator-creator-nc-r1",
  "current_lane=NC-R1",
  "launch_readiness_decision=no-go",
  "base_deploy_status=not-confirmed-for-pr-747-integration-tip",
  readinessPath,
  checklistPath
]) {
  assert.match(task, new RegExp(escapeRegExp(marker)), `missing current task marker: ${marker}`);
}
assert.doesNotMatch(task, /current_pr_state=draft-open/, "task.md must not retain PR #747 as the current Draft PR");

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
  "activation_status=closed",
  "no external operation is authorized by this checklist"
]) {
  assert.match(checklist, new RegExp(escapeRegExp(marker)), `missing operator marker: ${marker}`);
}

for (const approvalUnit of [
  "APPROVAL-CLOUDFLARE-READ",
  "APPROVAL-WORKER-LIMIT-ALIGNMENT",
  "APPROVAL-SUPABASE-READ",
  "APPROVAL-SUPABASE-BACKUP-RISK",
  "APPROVAL-PROVIDER-READ",
  "APPROVAL-STRIPE-READ",
  "APPROVAL-LEGAL",
  "APPROVAL-COPY",
  "APPROVAL-SUPPORT",
  "APPROVAL-SLA-RISK",
  "APPROVAL-LIVE-PAID-FLOW",
  "APPROVAL-AUTH-BROWSER",
  "APPROVAL-DEPLOY",
  "APPROVAL-ACTIVATION",
  "APPROVAL-PUBLIC-PAID-GATE"
]) {
  assert.match(checklist, new RegExp(`^\\| ${approvalUnit} \\| unapproved \\|`, "m"), `missing closed approval unit: ${approvalUnit}`);
}

assert.doesNotMatch(`${readiness}\n${checklist}`, /(?:sk_(?:live|test)_|whsec_|bearer\s|authorization:|password=|cookie=|localstorage|sessionstorage|indexeddb|livechatid|customer_[a-z0-9]|subscription_[a-z0-9])/i);
assert.doesNotMatch(`${readiness}\n${checklist}`, /(?:dockerfile|container binding|container-backed)/i);

process.stdout.write(
  `comment translator Creator NC-R1 paid launch readiness contract passed (decision=no-go; unresolved-hard=${unresolvedHardRequirements.length}; activation=closed)\n`
);
