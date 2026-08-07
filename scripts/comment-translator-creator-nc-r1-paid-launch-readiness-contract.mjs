import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const readinessPath = "docs/active/COMMENT_TRANSLATOR_CREATOR_NC_R1_PAID_LAUNCH_READINESS.md";
const checklistPath = "docs/active/COMMENT_TRANSLATOR_CREATOR_NC_R1_OPERATOR_CHECKLIST.md";
const ncQ1AuthorityPath = "docs/active/COMMENT_TRANSLATOR_CREATOR_NC_Q1_QA_AUTHORITY.md";
const ncQ1ChecklistPath = "docs/active/COMMENT_TRANSLATOR_CREATOR_NC_Q1_OPERATOR_CHECKLIST.md";
const crosswalkPath = "docs/active/COMMENT_TRANSLATOR_CREATOR_NO_CONTAINER_LEGACY_CROSSWALK.md";
const sourceCheckedAt = "2026-08-06";
const sourceMaxAgeDays = 7;
const sourceFreshnessTimeZone = "Asia/Tokyo";
const canonicalCompletedStripeCostPartialStopSectionSha256 = "31C4EDDF6D1E60F97D7CE876BD72E74E67FD78474B09BD3021364847E4F327EE";
const canonicalCompletedStripeBaseFeePartialStopSectionSha256 = "0226C22B66489BCED742E40B391539C05B29F56CB7730BEB85D272C1AD82875D";
const canonicalCompletedSupportPostureDecisionSectionSha256 = "F9156F7956810F92EFBF92FFA94529D9D88BAA9A99F7C60AE5FCEAD39B7ABE6B";
const completedLocalRevalidationEvidenceIds = [
  "EVID-LOCAL-PUBLIC-ENTITLEMENT-CONTRACT",
  "EVID-LOCAL-SECURITY-PRIVACY-CONTRACT",
  "EVID-WORKER-SIZE"
];
const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const authorityOnlyPaths = new Set([
  "task.md",
  "docs/active/COMMENT_TRANSLATOR_CREATOR_NC_R1_OPERATOR_CHECKLIST.md",
  "docs/active/COMMENT_TRANSLATOR_CREATOR_NC_R1_PAID_LAUNCH_READINESS.md",
  "scripts/comment-translator-creator-nc-r1-paid-launch-readiness-contract.mjs"
]);

function read(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

function sha256File(relativePath) {
  const absolutePath = join(repositoryRoot, ...relativePath.split("/"));
  assert.ok(existsSync(absolutePath), `${relativePath} must exist for current local evidence revalidation`);
  return createHash("sha256").update(readFileSync(absolutePath)).digest("hex").toUpperCase();
}

function computeOpenNextArtifactFingerprint() {
  const artifactRoot = join(repositoryRoot, ".open-next");
  assert.ok(existsSync(artifactRoot), ".open-next must exist while EVID-WORKER-SIZE is satisfied");
  const relativeFiles = [];
  const walk = (absoluteDirectory, relativeDirectory = "") => {
    for (const entry of readdirSync(absoluteDirectory, { withFileTypes: true })) {
      const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
      const absolutePath = join(absoluteDirectory, entry.name);
      if (entry.isDirectory()) walk(absolutePath, relativePath);
      else if (entry.isFile()) relativeFiles.push(relativePath);
    }
  };
  walk(artifactRoot);
  relativeFiles.sort();
  let totalBytes = 0;
  const manifestRows = relativeFiles.map((relativePath) => {
    const content = readFileSync(join(artifactRoot, ...relativePath.split("/")));
    totalBytes += content.length;
    const fileHash = createHash("sha256").update(content).digest("hex");
    return `${relativePath}\t${content.length}\t${fileHash}`;
  });
  return {
    fileCount: relativeFiles.length,
    totalBytes,
    treeManifestSha256: createHash("sha256").update(manifestRows.join("\n")).digest("hex").toUpperCase()
  };
}

function runReadOnlyCommand(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    windowsHide: true,
    ...options
  }).trim();
}

function currentRuntimeSourceChangesOutsideAuthority() {
  const tracked = runReadOnlyCommand("git", ["diff", "--name-only", "HEAD", "--"]);
  const untracked = runReadOnlyCommand("git", ["ls-files", "--others", "--exclude-standard"]);
  return [...new Set(`${tracked}\n${untracked}`.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean))]
    .filter((entry) => !authorityOnlyPaths.has(entry.replaceAll("\\", "/")))
    .sort();
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

function assertBackupPostureDecisionEffectiveDateAndScopeBoundary({ effectiveDate, now = new Date(), exactScopeMatch, exactInputUnchanged, materialChanged, revalidationBoundary }) {
  const effectiveDay = parseUtcDate(effectiveDate);
  const currentDay = parseUtcDate(calendarDateInTimeZone(now));

  assert.ok(effectiveDay.getTime() <= currentDay.getTime(), `Backup posture decision effective date is future-dated: ${effectiveDate}`);
  assert.equal(exactScopeMatch, true, "Backup posture decision requires an exact approved scope match");
  assert.equal(exactInputUnchanged, true, "Backup posture decision requires its exact approved prerequisite input");
  assert.equal(materialChanged, false, "Backup posture decision requires revalidation after a material scope or evidence change");
  assert.equal(revalidationBoundary, humanDecisionFreshnessRule, "Backup posture decision must retain its effective-date-and-scope material-change revalidation boundary");
}

function assertProviderFundingPostureDecisionEffectiveDateAndScopeBoundary({ effectiveDate, now = new Date(), exactScopeMatch, exactInputUnchanged, materialChanged, revalidationBoundary }) {
  const effectiveDay = parseUtcDate(effectiveDate);
  const currentDay = parseUtcDate(calendarDateInTimeZone(now));

  assert.ok(effectiveDay.getTime() <= currentDay.getTime(), `Provider funding-posture decision effective date is future-dated: ${effectiveDate}`);
  assert.equal(exactScopeMatch, true, "Provider funding-posture decision requires an exact approved scope match");
  assert.equal(exactInputUnchanged, true, "Provider funding-posture decision requires its exact approved partial-stop input");
  assert.equal(materialChanged, false, "Provider funding-posture decision requires revalidation after a material scope or input change");
  assert.equal(revalidationBoundary, humanDecisionFreshnessRule, "Provider funding-posture decision must retain its effective-date-and-scope material-change revalidation boundary");
}

function assertSupportPostureDecisionEffectiveDateAndScopeBoundary({ effectiveDate, now = new Date(), exactScopeMatch, materialChanged, revalidationBoundary }) {
  const effectiveDay = parseUtcDate(effectiveDate);
  const currentDay = parseUtcDate(calendarDateInTimeZone(now));

  assert.ok(effectiveDay.getTime() <= currentDay.getTime(), `Support posture decision effective date is future-dated: ${effectiveDate}`);
  assert.equal(exactScopeMatch, true, "Support posture decision requires an exact approved scope match");
  assert.equal(materialChanged, false, "Support posture decision requires revalidation after a material scope or evidence change");
  assert.equal(revalidationBoundary, humanDecisionFreshnessRule, "Support posture decision must retain its effective-date-and-scope material-change revalidation boundary");
}

function deriveSanitizedBackupPrerequisiteInputFingerprint(prerequisiteFields) {
  const serializedMaterialFields = backupPrerequisiteInputReferenceMaterialFields.map((field) => {
    assert.equal(typeof prerequisiteFields[field], "string", `Backup prerequisite input reference requires sanitized ${field}`);
    return `${field}=${prerequisiteFields[field]}`;
  }).join("\n");
  return createHash("sha256").update(serializedMaterialFields, "utf8").digest("hex").toUpperCase();
}

function assertBackupDecisionInputFingerprintBinding(decisionFields, prerequisiteFields) {
  assert.match(decisionFields.decision_input_fingerprint_sha256, /^[A-F0-9]{64}$/, "Backup posture decision must retain its owner-approved sanitized prerequisite input fingerprint");
  const derivedFingerprint = deriveSanitizedBackupPrerequisiteInputFingerprint(prerequisiteFields);
  assert.equal(
    decisionFields.decision_input_fingerprint_sha256,
    derivedFingerprint,
    "Backup posture decision prerequisite input fingerprint must match its owner-approved decision record"
  );
  return derivedFingerprint;
}

function deriveSanitizedProviderCostPartialStopInputFingerprint(prerequisiteFields) {
  const serializedMaterialFields = providerCostPartialStopInputReferenceMaterialFields.map((field) => {
    assert.equal(typeof prerequisiteFields[field], "string", `Provider Cost partial-stop input reference requires sanitized ${field}`);
    return `${field}=${prerequisiteFields[field]}`;
  }).join("\n");
  return createHash("sha256").update(serializedMaterialFields, "utf8").digest("hex").toUpperCase();
}

function assertProviderFundingDecisionInputFingerprintBinding(decisionFields, prerequisiteFields) {
  assert.match(decisionFields.decision_input_fingerprint_sha256, /^[A-F0-9]{64}$/, "Provider funding-posture decision must retain its owner-approved sanitized partial-stop input fingerprint");
  const derivedFingerprint = deriveSanitizedProviderCostPartialStopInputFingerprint(prerequisiteFields);
  assert.equal(
    decisionFields.decision_input_fingerprint_sha256,
    derivedFingerprint,
    "Provider funding-posture decision partial-stop input fingerprint must match its owner-approved decision record"
  );
  return derivedFingerprint;
}

const canonicalEvidenceRows = [
  { id: "EVID-NC-Q1-FIXTURE", evidenceClass: "fixture", freshness: "fresh", target: "not-applicable", approval: "not-required", hardRequirement: "no", productionProof: "no", status: "satisfied" },
  { id: "EVID-NC-Q1-LOCAL", evidenceClass: "local", freshness: "fresh", target: "exact", approval: "not-required", hardRequirement: "no", productionProof: "no", status: "satisfied" },
  { id: "EVID-LOCAL-PUBLIC-ENTITLEMENT-CONTRACT", evidenceClass: "local", freshness: "fresh", target: "exact", approval: "approved", hardRequirement: "yes", productionProof: "no", status: "satisfied" },
  { id: "EVID-LOCAL-SECURITY-PRIVACY-CONTRACT", evidenceClass: "local", freshness: "fresh", target: "exact", approval: "approved", hardRequirement: "yes", productionProof: "no", status: "satisfied" },
  { id: "EVID-WORKER-SOURCE", evidenceClass: "public-source", freshness: "fresh", target: "not-applicable", approval: "not-required", hardRequirement: "no", productionProof: "no", status: "satisfied" },
  { id: "EVID-WORKER-CPU", evidenceClass: "gated", freshness: "fresh", target: "exact", approval: "approved", hardRequirement: "yes", productionProof: "no", status: "incomplete" },
  { id: "EVID-WORKER-SIZE", evidenceClass: "local", freshness: "fresh", target: "exact", approval: "approved", hardRequirement: "yes", productionProof: "no", status: "satisfied" },
  { id: "EVID-WORKER-SIZE-LIMIT-ALIGNMENT", evidenceClass: "local", freshness: "fresh", target: "exact", approval: "not-required", hardRequirement: "yes", productionProof: "no", status: "satisfied" },
  { id: "EVID-WORKER-REQUEST", evidenceClass: "gated", freshness: "fresh", target: "exact", approval: "approved", hardRequirement: "yes", productionProof: "no", status: "satisfied" },
  { id: "EVID-SUPABASE-SOURCE", evidenceClass: "public-source", freshness: "fresh", target: "not-applicable", approval: "not-required", hardRequirement: "no", productionProof: "no", status: "satisfied" },
  { id: "EVID-SUPABASE-SIZE", evidenceClass: "gated", freshness: "fresh", target: "exact", approval: "approved", hardRequirement: "yes", productionProof: "no", status: "satisfied" },
  { id: "EVID-SUPABASE-EGRESS", evidenceClass: "gated", freshness: "fresh", target: "exact", approval: "approved", hardRequirement: "yes", productionProof: "no", status: "satisfied" },
  { id: "EVID-SUPABASE-PAUSE", evidenceClass: "gated", freshness: "fresh", target: "exact", approval: "approved", hardRequirement: "yes", productionProof: "no", status: "satisfied" },
  { id: "EVID-SUPABASE-BACKUP", evidenceClass: "gated", freshness: "fresh", target: "exact", approval: "approved", hardRequirement: "yes", productionProof: "no", status: "satisfied" },
  { id: "EVID-PROVIDER-SOURCE", evidenceClass: "public-source", freshness: "fresh", target: "not-applicable", approval: "not-required", hardRequirement: "no", productionProof: "no", status: "satisfied" },
  { id: "EVID-PROVIDER-COST", evidenceClass: "gated", freshness: "fresh", target: "exact", approval: "approved", hardRequirement: "yes", productionProof: "no", status: "incomplete" },
  { id: "EVID-STRIPE-SOURCE", evidenceClass: "public-source", freshness: "fresh", target: "not-applicable", approval: "not-required", hardRequirement: "no", productionProof: "no", status: "satisfied" },
  { id: "EVID-STRIPE-COST", evidenceClass: "gated", freshness: "fresh", target: "exact", approval: "approved", hardRequirement: "yes", productionProof: "no", status: "incomplete" },
  { id: "EVID-PRODUCT-PRICE", evidenceClass: "gated", freshness: "missing", target: "missing", approval: "unapproved", hardRequirement: "yes", productionProof: "no", status: "missing" },
  { id: "EVID-LEGAL", evidenceClass: "gated", freshness: "missing", target: "missing", approval: "unapproved", hardRequirement: "yes", productionProof: "no", status: "missing" },
  { id: "EVID-COPY", evidenceClass: "gated", freshness: "missing", target: "missing", approval: "unapproved", hardRequirement: "yes", productionProof: "no", status: "missing" },
  { id: "EVID-SUPPORT", evidenceClass: "gated", freshness: "fresh", target: "exact", approval: "approved", hardRequirement: "yes", productionProof: "no", status: "satisfied" },
  { id: "EVID-SLA", evidenceClass: "gated", freshness: "missing", target: "missing", approval: "unapproved", hardRequirement: "yes", productionProof: "no", status: "missing" },
  { id: "EVID-RISK-ACCEPTANCE", evidenceClass: "gated", freshness: "missing", target: "missing", approval: "unapproved", hardRequirement: "yes", productionProof: "no", status: "missing" },
  { id: "EVID-ROLLBACK", evidenceClass: "local", freshness: "fresh", target: "exact", approval: "not-required", hardRequirement: "yes", productionProof: "no", status: "satisfied" },
  { id: "EVID-LIVE-PAID-FLOW", evidenceClass: "live", freshness: "missing", target: "missing", approval: "unapproved", hardRequirement: "yes", productionProof: "no", status: "missing" },
  { id: "EVID-DEPLOYED-TARGET", evidenceClass: "deployed", freshness: "missing", target: "missing", approval: "unapproved", hardRequirement: "yes", productionProof: "no", status: "missing" }
];

const requiredEvidenceIds = canonicalEvidenceRows.map((row) => row.id);
const canonicalEvidenceById = new Map(canonicalEvidenceRows.map((row) => [row.id, row]));
const canonicalPrimaryApprovalUnitRows = [
  { id: "EVID-WORKER-CPU", primaryApprovalUnit: "authenticated-private-read" },
  { id: "EVID-WORKER-REQUEST", primaryApprovalUnit: "authenticated-private-read" },
  { id: "EVID-SUPABASE-SIZE", primaryApprovalUnit: "authenticated-private-read" },
  { id: "EVID-SUPABASE-EGRESS", primaryApprovalUnit: "authenticated-private-read" },
  { id: "EVID-SUPABASE-PAUSE", primaryApprovalUnit: "authenticated-private-read" },
  { id: "EVID-PROVIDER-COST", primaryApprovalUnit: "authenticated-private-read" },
  { id: "EVID-STRIPE-COST", primaryApprovalUnit: "authenticated-private-read" },
  { id: "EVID-SUPABASE-BACKUP", primaryApprovalUnit: "release-owner-judgment" },
  { id: "EVID-PRODUCT-PRICE", primaryApprovalUnit: "release-owner-judgment" },
  { id: "EVID-LEGAL", primaryApprovalUnit: "release-owner-judgment" },
  { id: "EVID-COPY", primaryApprovalUnit: "release-owner-judgment" },
  { id: "EVID-SUPPORT", primaryApprovalUnit: "release-owner-judgment" },
  { id: "EVID-SLA", primaryApprovalUnit: "release-owner-judgment" },
  { id: "EVID-RISK-ACCEPTANCE", primaryApprovalUnit: "release-owner-judgment" },
  { id: "EVID-LIVE-PAID-FLOW", primaryApprovalUnit: "live-operation" },
  { id: "EVID-DEPLOYED-TARGET", primaryApprovalUnit: "deploy-deployed-proof" }
];
const externalFreshnessRule = "within-7-days-of-final-release-decision-or-stricter-approved-window";
const humanDecisionFreshnessRule = "effective-date-and-scope-match-revalidate-on-material-scope-or-evidence-change";
const externalStopCondition = "target-mismatch,incomplete-or-stale-evidence,unapproved-access,exposure-risk-or-scope-expansion";
const humanDecisionStopCondition = "missing-named-owner,effective-date-or-scope-mismatch,material-change-or-exposure-risk";
const rollbackOwnerRequirement = "named-release-owner-and-rollback-owner-required";
const evidenceRetentionRequirement = "named-sanitized-evidence-retention-location-required";
const canonicalAcquisitionDecisionRows = [
  { id: "EVID-WORKER-CPU", targetAlias: "release-owner-approved-worker-target-alias", method: "authenticated-private-read-cpu-metric-only", freshnessRule: externalFreshnessRule, sanitizedResult: "sanitized-cpu-usage-limit-headroom-classification", stopCondition: externalStopCondition, rollbackOwner: rollbackOwnerRequirement, evidenceRetention: evidenceRetentionRequirement, requiredApprover: "named-cloudflare-account-owner-and-release-owner-required" },
  { id: "EVID-WORKER-REQUEST", targetAlias: "release-owner-approved-worker-target-alias", method: "authenticated-private-read-request-metric", freshnessRule: externalFreshnessRule, sanitizedResult: "sanitized-request-usage-limit-headroom-classification", stopCondition: externalStopCondition, rollbackOwner: rollbackOwnerRequirement, evidenceRetention: evidenceRetentionRequirement, requiredApprover: "named-cloudflare-account-owner-and-release-owner-required" },
  { id: "EVID-SUPABASE-SIZE", targetAlias: "release-owner-approved-supabase-target-alias", method: "authenticated-private-read-database-size-metric", freshnessRule: externalFreshnessRule, sanitizedResult: "sanitized-database-size-limit-headroom-classification", stopCondition: externalStopCondition, rollbackOwner: rollbackOwnerRequirement, evidenceRetention: evidenceRetentionRequirement, requiredApprover: "named-supabase-account-owner-and-release-owner-required" },
  { id: "EVID-SUPABASE-EGRESS", targetAlias: "release-owner-approved-supabase-target-alias", method: "authenticated-private-read-egress-metric", freshnessRule: externalFreshnessRule, sanitizedResult: "sanitized-egress-usage-limit-headroom-classification", stopCondition: externalStopCondition, rollbackOwner: rollbackOwnerRequirement, evidenceRetention: evidenceRetentionRequirement, requiredApprover: "named-supabase-account-owner-and-release-owner-required" },
  { id: "EVID-SUPABASE-PAUSE", targetAlias: "release-owner-approved-supabase-target-alias", method: "authenticated-private-read-pause-state", freshnessRule: externalFreshnessRule, sanitizedResult: "sanitized-pause-state-and-headroom-classification", stopCondition: externalStopCondition, rollbackOwner: rollbackOwnerRequirement, evidenceRetention: evidenceRetentionRequirement, requiredApprover: "named-supabase-account-owner-and-release-owner-required" },
  { id: "EVID-PROVIDER-COST", targetAlias: "release-owner-approved-provider-account-scope-alias", method: "authenticated-private-read-provider-consumption-cost", freshnessRule: externalFreshnessRule, sanitizedResult: "sanitized-provider-consumption-cost-headroom-classification", stopCondition: externalStopCondition, rollbackOwner: rollbackOwnerRequirement, evidenceRetention: evidenceRetentionRequirement, requiredApprover: "named-provider-account-owner-and-release-owner-required" },
  { id: "EVID-STRIPE-COST", targetAlias: "release-owner-approved-stripe-account-cost-scope-alias", method: "authenticated-private-read-stripe-cost-configuration", freshnessRule: externalFreshnessRule, sanitizedResult: "sanitized-stripe-cost-configuration-headroom-classification", stopCondition: externalStopCondition, rollbackOwner: rollbackOwnerRequirement, evidenceRetention: evidenceRetentionRequirement, requiredApprover: "named-stripe-account-owner-and-release-owner-required" },
  { id: "EVID-SUPABASE-BACKUP", targetAlias: "release-owner-approved-supabase-posture-scope-alias", method: "named-accept-upgrade-decision-after-target-posture-input-only", freshnessRule: humanDecisionFreshnessRule, sanitizedResult: "sanitized-accept-upgrade-decision-and-posture-classification", stopCondition: humanDecisionStopCondition, rollbackOwner: rollbackOwnerRequirement, evidenceRetention: evidenceRetentionRequirement, requiredApprover: "named-release-owner-required" },
  { id: "EVID-PRODUCT-PRICE", targetAlias: "release-owner-approved-product-price-scope-alias", method: "named-product-price-decision", freshnessRule: humanDecisionFreshnessRule, sanitizedResult: "sanitized-product-price-decision-and-effective-scope", stopCondition: humanDecisionStopCondition, rollbackOwner: rollbackOwnerRequirement, evidenceRetention: evidenceRetentionRequirement, requiredApprover: "named-product-owner-and-release-owner-required" },
  { id: "EVID-LEGAL", targetAlias: "release-owner-approved-legal-tax-scope-alias", method: "named-legal-tax-decision", freshnessRule: humanDecisionFreshnessRule, sanitizedResult: "sanitized-legal-tax-decision-and-effective-scope", stopCondition: humanDecisionStopCondition, rollbackOwner: rollbackOwnerRequirement, evidenceRetention: evidenceRetentionRequirement, requiredApprover: "named-legal-owner-and-release-owner-required" },
  { id: "EVID-COPY", targetAlias: "release-owner-approved-public-copy-scope-alias", method: "named-public-copy-decision", freshnessRule: humanDecisionFreshnessRule, sanitizedResult: "sanitized-copy-decision-and-effective-scope", stopCondition: humanDecisionStopCondition, rollbackOwner: rollbackOwnerRequirement, evidenceRetention: evidenceRetentionRequirement, requiredApprover: "named-copy-owner-and-release-owner-required" },
  { id: "EVID-SUPPORT", targetAlias: "release-owner-approved-support-scope-alias", method: "named-support-escalation-decision", freshnessRule: humanDecisionFreshnessRule, sanitizedResult: "sanitized-support-decision-and-effective-scope", stopCondition: humanDecisionStopCondition, rollbackOwner: rollbackOwnerRequirement, evidenceRetention: evidenceRetentionRequirement, requiredApprover: "named-support-owner-and-release-owner-required" },
  { id: "EVID-SLA", targetAlias: "release-owner-approved-sla-scope-alias", method: "named-sla-position-decision", freshnessRule: humanDecisionFreshnessRule, sanitizedResult: "sanitized-sla-decision-and-effective-scope", stopCondition: humanDecisionStopCondition, rollbackOwner: rollbackOwnerRequirement, evidenceRetention: evidenceRetentionRequirement, requiredApprover: "named-service-owner-and-release-owner-required" },
  { id: "EVID-RISK-ACCEPTANCE", targetAlias: "release-owner-approved-residual-risk-scope-alias", method: "named-residual-risk-acceptance-decision", freshnessRule: humanDecisionFreshnessRule, sanitizedResult: "sanitized-residual-risk-decision-and-effective-scope", stopCondition: humanDecisionStopCondition, rollbackOwner: rollbackOwnerRequirement, evidenceRetention: evidenceRetentionRequirement, requiredApprover: "named-release-owner-required" },
  { id: "EVID-LIVE-PAID-FLOW", targetAlias: "release-owner-approved-live-paid-flow-target-alias", method: "separately-approved-live-operation-with-signed-compatible-subscription-evidence", freshnessRule: externalFreshnessRule, sanitizedResult: "sanitized-live-flow-result-free-fallback-and-entitlement-classification", stopCondition: externalStopCondition, rollbackOwner: rollbackOwnerRequirement, evidenceRetention: evidenceRetentionRequirement, requiredApprover: "named-live-operation-owner-and-release-owner-required" },
  { id: "EVID-DEPLOYED-TARGET", targetAlias: "release-owner-approved-deployed-target-commit-alias", method: "separately-approved-deploy-deployed-target-proof", freshnessRule: externalFreshnessRule, sanitizedResult: "sanitized-deployed-target-commit-and-proof-classification", stopCondition: externalStopCondition, rollbackOwner: rollbackOwnerRequirement, evidenceRetention: evidenceRetentionRequirement, requiredApprover: "named-deploy-owner-and-release-owner-required" }
];
const nextSlaPostureJudgmentRequiredCompletionFields = [
  "approval_id",
  "scope_alias",
  "effective_date",
  "evidence_retention_location",
  "stop_owner",
  "rollback_owner",
  "required_approver",
  "availability_commitment",
  "maintenance_exclusion",
  "response_or_restoration_target",
  "measurement_source",
  "service_owner"
];
const canonicalDecisionSequenceFields = {
  ordinary_row_judgment_ids: "EVID-SUPABASE-BACKUP,EVID-PRODUCT-PRICE,EVID-LEGAL,EVID-COPY,EVID-SUPPORT,EVID-SLA",
  ordinary_row_judgment_precondition: "exact-row-scope-inputs-named-approver-effective-date-retention-stop-rollback-complete",
  ordinary_row_judgment_zero_unresolved_requirement: "not-required",
  risk_acceptance_precondition: "other-9-hard-requirements-satisfied-and-residual-risks-enumerated",
  risk_acceptance_row_effect: "closes-EVID-RISK-ACCEPTANCE-only",
  final_release_go_precondition: "all-10-current-unresolved-hard-requirements-satisfied-zero-unresolved-and-explicit-go",
  final_release_no_go: "recordable-at-any-time",
  final_release_current_state: "missing",
  nc_l1_start_precondition: "explicit-final-release-go-after-zero-unresolved",
  row_closure_activation_effect: "none-activation-remains-closed"
};
const ordinaryRowJudgmentIds = canonicalDecisionSequenceFields.ordinary_row_judgment_ids.split(",");
const canonicalNextApprovalPacketFields = {
  packet_execution_status: "not-executable-until-required-fields-complete",
  packet_item_count: "1",
  approval_unit: "release-owner-judgment",
  evidence_row_primary_approval_unit: "release-owner-judgment",
  evidence_id: "EVID-SLA",
  requested_operation: "release-owner-judgment-sla-posture-only",
  command: "<no-command-authorized>",
  browser_scope: "none",
  external_action: "none",
  decision_input: "sla-posture-only-independent-of-support-legal-copy-product-price-and-risk-decisions",
  verification_scope: "sanitized-availability-commitment-maintenance-exclusion-response-restoration-or-explicit-no-sla-measurement-source-owner-effective-scope-stop-result",
  required_approver: "<named-service-owner-and-release-owner-required>",
  approval_id: "<required-approval-id>",
  scope_alias: "<release-owner-approved-sla-posture-effective-scope-alias-required>",
  effective_date: "<required-effective-date>",
  evidence_retention_location: "<required-evidence-retention-location>",
  stop_owner: "<required-stop-owner>",
  rollback_owner: "<required-rollback-owner>",
  availability_commitment: "<required-availability-commitment-or-explicit-no-sla-posture>",
  maintenance_exclusion: "<required-maintenance-and-exclusion-position>",
  response_or_restoration_target: "<required-response-restoration-target-or-explicit-no-sla-posture>",
  measurement_source: "<required-measurement-and-source-boundary>",
  service_owner: "<required-named-service-owner>",
  prohibited_bundle: "support-reopening-or-messaging-or-channel-account-mutation,legal-or-copy-or-product-or-price-or-risk-judgment,provider-or-stripe-or-other-read,deploy-or-activation-or-public-gate,git-publication-or-cleanup",
  result_record_fields: "sanitized-sla-posture-owner-decision-effective-scope-stop-result",
  raw_log_retention: "not-applicable-no-command-authorized",
  stop_on: "missing-availability-maintenance-response-restoration-or-no-sla-position-measurement-source-owner-or-effective-scope,private-exposure,scope-expansion,unapproved-access,prohibited-bundle-or-action",
  closure_authority: "release-owner-judgment-after-complete-approved-exact-sla-posture-effective-scope",
  row_closure: "forbidden-until-complete-approved-exact-sla-posture-effective-scope",
  owner_decision: "<required-sla-posture-decision>",
  production_proof: "no",
  activation_status: "closed",
  documentation_authorization: "none"
};
const canonicalTaskOperationalFields = {
  current_approved_boundary: "creator-nc-r1-completed-local-dependency-install-and-post-install-read-only-revalidation-plus-evid-worker-request-supabase-size-supabase-egress-supabase-pause-worker-cpu-supabase-backup-provider-cost-and-stripe-cost-authenticated-private-reads-with-pause-worker-cpu-provider-cost-and-stripe-cost-partial-stops-supabase-backup-completed-prerequisite-input-and-approved-backup-provider-funding-pause-and-support-posture-judgments-then-next-sla-release-owner-judgment-packet-preparation-only",
  implementation_status: "approved-local-dependency-install-and-post-install-read-only-revalidation-plus-evid-worker-request-supabase-size-and-supabase-egress-reads-completed-supabase-pause-read-partial-stop-and-pause-posture-judgment-accepted-row-satisfied-worker-cpu-provider-cost-and-stripe-cost-reads-post-read-partial-stop-incomplete-supabase-backup-prerequisite-input-completed-and-backup-posture-judgment-accepted-row-satisfied-provider-funding-posture-judgment-completed-row-incomplete-support-posture-judgment-completed-row-satisfied-next-sla-release-owner-judgment-unapproved"
};
const canonicalCompletedLocalApprovalPacketFields = {
  packet_execution_status: "completed-local",
  packet_item_count: "1",
  primary_approval_unit: "local-dependency-setup-blocked",
  evidence_ids: completedLocalRevalidationEvidenceIds.join(","),
  requested_operation: "lockfile-matched-dependency-install-current-worktree-only",
  command: "npm.cmd clean-install --progress=false",
  required_approver: "kurodev",
  approval_id: "NC-R1-LOCAL-DEPS-20260806-01",
  target_alias: "dcb5-nc-r1-evidence-clearance",
  time_window: "2026-08-06T19:35+09:00/2026-08-06T23:59+09:00",
  operator: "Codex-root-agent-current-task",
  evidence_retention_location: "current-Codex-task-sanitized-report",
  stop_owner: "kurodev",
  rollback_owner: "kurodev",
  install_exit: "0",
  installed_package_count: "691",
  package_json_sha256_pre_post_equal: "yes",
  package_lock_sha256_pre_post_equal: "yes",
  stop_result: "none-completed-within-approved-scope"
};
const canonicalCompletedWorkerRequestPacketFields = {
  packet_execution_status: "approved-completed-authenticated-private-read",
  packet_item_count: "1",
  primary_approval_unit: "authenticated-private-read",
  evidence_id: "EVID-WORKER-REQUEST",
  requested_operation: "authenticated-private-read-request-metric-only",
  approval_id: "NC-R1-WORKER-REQUEST-20260806-01",
  required_approver: "kurodev",
  operator: "Codex-root-agent-current-task",
  time_window: "current-Codex-turn-only-completed-2026-08-06T20:31:38+09:00",
  evidence_retention_location: "current-Codex-task-sanitized-report",
  stop_owner: "kurodev",
  rollback_owner: "kurodev",
  target_alias: "creator-production-worker",
  target_match: "yes",
  observed_at: "2026-08-06T20:31:38+09:00",
  observation_window: "dashboard-last-7-days-ending-at-observation",
  worker_invocations_total: "76",
  workers_free_public_limit_requests_per_day: "100000",
  per_day_upper_bound_from_window_total: "76",
  daily_limit_satisfied_by_necessary_upper_bound: "yes",
  percentage_inference: "forbidden",
  ui_ready_state: "complete",
  ui_aria_busy_true_count: "0",
  ui_visible_loading_count: "0",
  evidence_class: "gated",
  freshness: "fresh",
  target: "exact",
  approval: "approved",
  hard_requirement: "yes",
  production_proof: "no",
  status: "satisfied",
  raw_url_account_id_private_target_identifier_request_logs_retained: "no",
  stop_result: "none-completed-within-approved-scope"
};
const canonicalCompletedSupabaseSizePacketFields = {
  packet_execution_status: "approved-completed-authenticated-private-read",
  packet_item_count: "1",
  primary_approval_unit: "authenticated-private-read",
  evidence_id: "EVID-SUPABASE-SIZE",
  requested_operation: "authenticated-private-read-database-size-metric-only",
  approval_id: "NC-R1-SUPABASE-SIZE-20260806-01",
  required_approver: "kurodev",
  operator: "Codex-root-agent-current-task",
  time_window: "2026-08-06T20:57:40+09:00/2026-08-06T23:59:00+09:00",
  evidence_retention_location: "current-Codex-task-sanitized-report",
  stop_owner: "kurodev",
  rollback_owner: "kurodev",
  target_alias: "creator-production-supabase",
  target_match: "yes",
  observed_at: "2026-08-06T21:13:06+09:00",
  dashboard_navigation_scope: "minimal-database-size-metric-only",
  ui_ready_state: "complete",
  ui_aria_busy_true_count: "0",
  ui_visible_loading_count: "0",
  current_database_size_mb: "26.97",
  summary_display_gb: "0.028",
  max_database_size_gb: "0.5",
  limit_classification: "under-max",
  headroom_classification: "positive-headroom-at-observation",
  exact_remaining_bytes_inference: "forbidden",
  percentage_inference: "forbidden",
  unit_conversion_inference: "forbidden",
  evidence_class: "gated",
  freshness: "fresh",
  target: "exact",
  approval: "approved",
  hard_requirement: "yes",
  production_proof: "no",
  status: "satisfied",
  raw_url_project_ref_org_id_private_identifiers_raw_payload_other_usage_metrics_retained: "no",
  command_sql_write_settings_mutation: "none",
  stop_result: "none-completed-within-approved-scope"
};
const canonicalCompletedSupabaseEgressPartialStopPacketFields = {
  packet_execution_status: "approved-partial-stop-authenticated-private-read",
  packet_item_count: "1",
  primary_approval_unit: "authenticated-private-read",
  evidence_id: "EVID-SUPABASE-EGRESS",
  requested_operation: "authenticated-private-read-egress-metric-only",
  approval_id: "NC-R1-SUPABASE-EGRESS-20260806-01",
  required_approver: "kurodev",
  operator: "Codex-root-agent-current-task",
  time_window: "2026-08-06T21:39:00+09:00/2026-08-06T23:59:00+09:00",
  evidence_retention_location: "current-Codex-task-sanitized-report",
  stop_owner: "kurodev",
  rollback_owner: "kurodev",
  target_alias: "creator-production-supabase",
  target_match: "yes",
  observed_at: "2026-08-06T21:41:16+09:00",
  dashboard_navigation_scope: "minimal-egress-summary-only-stop-before-cached-egress-read",
  ui_ready_state: "complete",
  ui_aria_busy_true_count: "0",
  ui_visible_loading_count: "0",
  egress_summary_display_gb: "0",
  public_source_egress_limit_gb: "5",
  public_source_egress_limit_source: "SRC-SUPABASE-BILLING",
  cached_egress_disclosed_as_separate_metric_and_separately_billed: "yes",
  cached_egress_value_read: "no",
  daily_breakdown_and_incidental_values_retained: "no",
  other_usage_metric_values_retained: "no",
  remaining_capacity_inference: "forbidden",
  percentage_inference: "forbidden",
  rounding_inference: "forbidden",
  evidence_class: "gated",
  freshness: "fresh",
  target: "exact",
  approval: "approved",
  hard_requirement: "yes",
  production_proof: "no",
  status: "incomplete",
  raw_url_project_ref_org_id_private_identifiers_raw_payload_retained: "no",
  command_sql_write_settings_mutation: "none",
  stop_result: "predeclared-stop-applied-cached-egress-not-read"
};
const canonicalCompletedSupabaseCachedEgressPacketFields = {
  packet_execution_status: "approved-completed-authenticated-private-read",
  packet_item_count: "1",
  primary_approval_unit: "authenticated-private-read",
  evidence_id: "EVID-SUPABASE-EGRESS",
  requested_operation: "authenticated-private-read-cached-egress-metric-only",
  approval_id: "NC-R1-SUPABASE-CACHED-EGRESS-20260806-01",
  required_approver: "kurodev",
  operator: "Codex-root-agent-current-task",
  time_window: "2026-08-06T21:57:12+09:00/2026-08-06T23:59:00+09:00",
  evidence_retention_location: "current-Codex-task-sanitized-report",
  stop_owner: "kurodev",
  rollback_owner: "kurodev",
  target_alias: "creator-production-supabase",
  target_match: "yes",
  observed_at: "2026-08-06T21:59:06+09:00",
  dashboard_navigation_scope: "minimal-cached-egress-metric-only",
  ui_ready_state: "complete",
  ui_aria_busy_true_count: "0",
  ui_visible_loading_count: "0",
  uncached_egress_summary_display_gb: "0",
  uncached_egress_public_limit_gb: "5",
  uncached_egress_public_limit_source: "SRC-SUPABASE-BILLING",
  uncached_egress_limit_classification: "under-public-limit",
  uncached_egress_headroom_classification: "positive-headroom-at-observation",
  cached_egress_summary_display_gb: "0",
  cached_egress_public_limit_gb: "5",
  cached_egress_public_limit_source: "SRC-SUPABASE-STORAGE-BANDWIDTH",
  cached_egress_limit_classification: "under-public-limit",
  cached_egress_headroom_classification: "positive-headroom-at-observation",
  cached_egress_dashboard_max_display: "not-displayed",
  cross_unit_sum_inference: "forbidden",
  remaining_capacity_inference: "forbidden",
  percentage_inference: "forbidden",
  rounding_inference: "forbidden",
  daily_breakdown_and_incidental_values_retained: "no",
  other_usage_metric_values_retained: "no",
  evidence_class: "gated",
  freshness: "fresh",
  target: "exact",
  approval: "approved",
  hard_requirement: "yes",
  production_proof: "no",
  status: "satisfied",
  raw_url_project_ref_org_id_private_identifiers_raw_payload_retained: "no",
  command_sql_write_settings_mutation: "none",
  stop_result: "none-completed-within-approved-scope"
};
const canonicalCompletedSupabasePausePartialStopPacketFields = {
  packet_execution_status: "approved-partial-stop-authenticated-private-read",
  packet_item_count: "1",
  primary_approval_unit: "authenticated-private-read",
  evidence_id: "EVID-SUPABASE-PAUSE",
  requested_operation: "authenticated-private-read-pause-state-only",
  approval_id: "NC-R1-SUPABASE-PAUSE-20260806-01",
  required_approver: "kurodev",
  operator: "Codex-root-agent-current-task",
  time_window: "2026-08-06T22:20:49+09:00/2026-08-06T23:59:00+09:00",
  evidence_retention_location: "current-Codex-task-sanitized-report",
  stop_owner: "kurodev",
  rollback_owner: "kurodev",
  target_alias: "creator-production-supabase",
  target_match: "yes",
  observed_at: "2026-08-06T22:22:10+09:00",
  dashboard_navigation_scope: "minimal-settings-general-pause-state-only",
  ui_ready_state: "complete",
  ui_aria_busy_true_count: "0",
  ui_visible_loading_count: "0",
  pause_button_visible_enabled_count: "1",
  restart_locator_count: "2",
  restart_current_state_signal: "not-reliable-current-state-signal",
  pause_state_classification: "active-at-observation",
  last_activity_display: "not-displayed",
  pause_countdown_display: "not-displayed",
  future_pause_headroom_display: "not-displayed",
  future_pause_headroom_classification: "unknown-not-quantifiable",
  free_auto_pause_risk: "present",
  free_auto_pause_public_source: "SRC-SUPABASE-PAUSE",
  button_clicked: "no",
  evidence_class: "gated",
  freshness: "fresh",
  target: "exact",
  approval: "approved",
  hard_requirement: "yes",
  production_proof: "no",
  status: "incomplete",
  raw_url_project_ref_org_id_private_identifiers_raw_payload_retained: "no",
  command_sql_write_settings_mutation_backup_usage_retained: "no",
  stop_result: "predeclared-partial-stop-active-at-observation-only"
};
const canonicalCompletedSupabasePausePostureDecisionFields = {
  packet_execution_status: "approved-completed-release-owner-judgment",
  packet_item_count: "1",
  primary_approval_unit: "authenticated-private-read",
  evidence_id: "EVID-SUPABASE-PAUSE",
  supplemental_decision_unit: "release-owner-judgment-pause-posture-only",
  decision_input: "active-at-observation,unknown-not-quantifiable-future-pause-headroom,free-auto-pause-risk-present",
  decision_input_record_status: "complete-for-posture-judgment",
  decision_scope: "whether-pause-posture-is-acceptable-for-evid-supabase-pause-only",
  decision_owner: "kurodev",
  owner_confirmation: "explicit-full-packet-approval-current-codex-task",
  approval_id: "NC-R1-SUPABASE-PAUSE-POSTURE-20260806-01",
  scope_alias: "creator-production-supabase-free-pause-posture",
  effective_date: "2026-08-06",
  retention: "current-Codex-task-sanitized-report",
  stop_owner: "kurodev",
  rollback_owner: "kurodev",
  decision: "accepted",
  closure_limit: "at-most-EVID-SUPABASE-PAUSE-only",
  residual_auto_pause_risk: "carried-to-EVID-RISK-ACCEPTANCE",
  external_browser_action: "none",
  final_risk_acceptance: "none",
  final_release_go: "none",
  activation_status: "closed",
  evidence_class: "gated",
  freshness: "fresh",
  target: "exact",
  approval: "approved",
  hard_requirement: "yes",
  production_proof: "no",
  status: "satisfied",
  raw_url_project_ref_org_id_private_identifiers_raw_payload_retained: "no",
  command_sql_write_settings_mutation: "none",
  stop_result: "none-completed-within-approved-documentation-only-scope"
};
const canonicalCompletedWorkerCpuPartialStopPacketFields = {
  packet_execution_status: "approved-partial-stop-authenticated-private-read",
  packet_item_count: "1",
  primary_approval_unit: "authenticated-private-read",
  evidence_id: "EVID-WORKER-CPU",
  requested_operation: "authenticated-private-read-cpu-metric-only",
  approval_id: "NC-R1-WORKER-CPU-20260806-01",
  required_approver: "kurodev",
  operator: "Codex-root-agent-current-task",
  time_window: "2026-08-06T23:20:51+09:00/2026-08-06T23:59:00+09:00",
  evidence_retention_location: "current-Codex-task-sanitized-report",
  stop_owner: "kurodev",
  rollback_owner: "kurodev",
  target_alias: "creator-production-worker",
  target_match: "yes",
  observed_at: "2026-08-06T23:24:15+09:00",
  dashboard_range: "last-7-days",
  effective_free_custom_cpu_limit_ms_per_request: "10",
  cpu_p50_ms: "223",
  cpu_p90_ms: "295",
  cpu_p99_ms: "317",
  cpu_p999_ms: "317",
  cpu_time_limit_exceeded_displayed_count: "0",
  overview_cpu_time_limit_exceeded_displayed_count: "0",
  expanded_cpu_detail_percentile_values: "cpu_p50_ms,cpu_p90_ms,cpu_p99_ms,cpu_p999_ms",
  aggregation_complete: "unknown",
  request_level_completeness: "not-displayed",
  headroom_classification: "insufficient-not-demonstrated",
  satisfaction_signal_reconciliation: "signals-not-reconcilable-for-satisfaction",
  percentage_inference: "forbidden",
  remaining_capacity_inference: "forbidden",
  zero_exceeded_count_explanation_inference: "forbidden",
  evidence_class: "gated",
  freshness: "fresh",
  target: "exact",
  approval: "approved",
  hard_requirement: "yes",
  production_proof: "no",
  status: "incomplete",
  workers_paid_upgrade_authorization: "none",
  raw_url_account_deployment_version_private_identifier_subrequest_host_retained: "no",
  raw_logs_retained: "no",
  other_metrics_retained: "no",
  command_sql_write_settings_mutation: "none",
  stop_result: "predeclared-partial-stop-aggregation-and-request-completeness-not-displayed"
};
const canonicalCompletedProviderCostPartialStopPacketFields = {
  packet_execution_status: "approved-partial-stop-authenticated-private-read",
  packet_item_count: "1",
  primary_approval_unit: "authenticated-private-read",
  evidence_id: "EVID-PROVIDER-COST",
  requested_operation: "authenticated-private-read-provider-consumption-cost-only",
  approval_id: "NC-R1-PROVIDER-COST-OPENAI-20260807-01",
  required_approver: "kurodev",
  operator: "Codex-root-agent-current-task",
  time_window: "2026-08-07T13:05:35+09:00/2026-08-07T23:59:00+09:00",
  evidence_retention_location: "current-Codex-task-sanitized-report",
  stop_owner: "kurodev",
  rollback_owner: "kurodev",
  target_alias: "creator-paid-primary-openai-provider-account",
  target_match: "yes",
  observed_at: "2026-08-07T13:09:44+09:00",
  period: "2026-07-23/2026-08-07",
  total_spend_usd: "0.00",
  total_tokens: "0",
  total_requests: "0",
  billing_posture: "free-trial",
  credit_remaining_usd: "0.00",
  payment_details_status: "not-added-at-observation",
  funded_headroom_classification: "zero-funded-headroom-at-observation",
  dashboard_summary_displayed_selected_period: "yes",
  broader_aggregation_display_completeness: "unknown",
  provider_api_call: "no",
  provider_write_action: "no",
  payment_credit_budget_settings_action: "no",
  evidence_class: "gated",
  freshness: "fresh",
  target: "exact",
  approval: "approved",
  hard_requirement: "yes",
  production_proof: "no",
  status: "incomplete",
  row_closure: "none",
  activation_status: "closed",
  raw_url_organization_project_id_private_identifier_raw_payload_retained: "no",
  stop_result: "predeclared-partial-stop-zero-funded-headroom-at-observation"
};
const canonicalCompletedStripeCostPartialStopPacketFields = {
  packet_execution_status: "approved-partial-stop-authenticated-private-read",
  packet_item_count: "1",
  primary_approval_unit: "authenticated-private-read",
  evidence_id: "EVID-STRIPE-COST",
  requested_operation: "authenticated-private-read-stripe-cost-configuration-only",
  approval_id: "NC-R1-STRIPE-COST-20260807-01",
  required_approver: "kurodev",
  operator: "Codex-root-agent-current-task",
  time_window: "2026-08-07T13:51:13+09:00/2026-08-07T23:59:00+09:00",
  evidence_retention_location: "current-Codex-task-sanitized-report",
  stop_owner: "kurodev",
  rollback_owner: "kurodev",
  target_alias: "creator-paid-primary-stripe-account-cost-scope",
  target_match: "yes",
  observed_at: "2026-08-07T14:02:22+09:00",
  radar_standard_fee_jpy_per_screened_transaction: "0",
  billing_metered_fee_percent_of_billing_processed_volume: "0.7",
  invoicing_starter_fee_percent_per_one_time_invoice_payment: "0.4",
  workflows_metered_fee_jpy_per_step: "2.81",
  workflows_first_steps_per_month_included_free: "10000",
  fees_aggregate_default_period: "2026-07-01/2026-07-31",
  fees_aggregate_result: "no-fees-available-within-default-filter",
  export_details_client_or_event_raw_payload_access: "no",
  base_payment_processing_fee_exact_paid_flow_display: "not-displayed",
  full_cost_model_completeness: "unknown",
  standard_custom_pricing_inference: "forbidden",
  sums_conversions_rounding_inference: "forbidden",
  future_cost_remaining_margin_inference: "forbidden",
  payment_refund_settings_write_action: "no",
  evidence_class: "gated",
  freshness: "fresh",
  target: "exact",
  approval: "approved",
  hard_requirement: "yes",
  production_proof: "no",
  status: "incomplete",
  row_closure: "none",
  activation_status: "closed",
  raw_url_account_identifier_name_client_or_event_private_identifier_raw_payload_retained: "no",
  stop_result: "predeclared-partial-stop-base-payment-processing-fee-not-displayed"
};
const canonicalCompletedStripeBaseFeePartialStopPacketFields = {
  packet_execution_status: "approved-post-read-partial-stop-authenticated-private-read",
  packet_item_count: "1",
  primary_approval_unit: "authenticated-private-read",
  evidence_id: "EVID-STRIPE-COST",
  requested_operation: "authenticated-private-read-stripe-paid-flow-base-processing-fee-configuration-only",
  approval_id: "NC-R1-STRIPE-BASE-FEE-20260807-01",
  required_approver: "kurodev",
  operator: "Codex-root-agent-current-task",
  time_window: "2026-08-07T14:39:08+09:00/2026-08-07T23:59:00+09:00",
  evidence_retention_location: "current-Codex-task-sanitized-report",
  stop_owner: "kurodev",
  rollback_owner: "kurodev",
  target_alias: "creator-paid-primary-stripe-account-cost-scope",
  target_match: "yes",
  observed_at: "2026-08-07T14:44:24+09:00",
  account_specific_plans_fees_inspected: "yes",
  dashboard_search_scope: "japanese-payment-fee-concept-only",
  direct_account_specific_base_payment_processing_fee_display: "not-displayed",
  direct_account_specific_base_payment_processing_fee_result: "not-displayed",
  standard_custom_applicability: "unknown",
  targeted_result_completeness: "incomplete",
  public_pricing_opened_or_substituted: "no",
  all_results_opened: "no",
  client_or_event_details_export_raw_payload_access: "no",
  payment_refund_settings_write_provider_or_other_read_action: "no",
  evidence_class: "gated",
  freshness: "fresh",
  target: "exact",
  approval: "approved",
  hard_requirement: "yes",
  production_proof: "no",
  status: "incomplete",
  row_closure: "none",
  activation_status: "closed",
  raw_url_account_identifier_name_client_or_event_private_identifier_raw_payload_retained: "no",
  stop_result: "post-read-partial-stop-base-fee-remains-not-displayed-and-applicability-unknown"
};
const canonicalCompletedSupportPostureDecisionFields = {
  packet_execution_status: "approved-completed-release-owner-judgment",
  packet_item_count: "1",
  approval_unit: "release-owner-judgment",
  evidence_id: "EVID-SUPPORT",
  requested_operation: "release-owner-judgment-support-posture-only",
  approval_id: "NC-R1-SUPPORT-POSTURE-20260807-01",
  scope_alias: "creator-paid-support-posture",
  effective_date: "2026-08-07",
  decision_owner: "kurodev",
  approver: "kurodev",
  stop_owner: "kurodev",
  rollback_owner: "kurodev",
  support_owner: "kurodev",
  support_channel_primary: "existing-owner-controlled-email-channel",
  support_channel_supplemental: "x-and-discord",
  support_channel_operational_status: "owner-confirmed-existing",
  responsibility: "bug-report-feature-request-and-paid-user-incident-intake",
  coverage_hours: "best-effort-no-fixed-business-hours",
  response_expectation: "best-effort-no-guaranteed-response-time",
  escalation_path: "x-or-discord-to-email-then-kurodev-owner-review",
  owner_decision: "approved-best-effort-support-posture",
  evidence_retention_location: "current-Codex-task-sanitized-report",
  channel_creation_authorization: "none",
  messaging_authorization: "none",
  sla_status: "separate-unapproved",
  material_change_revalidation_boundary: "effective-date-and-scope-match-revalidate-on-material-scope-or-evidence-change",
  evidence_class: "gated",
  freshness: "fresh",
  target: "exact",
  approval: "approved",
  hard_requirement: "yes",
  production_proof: "no",
  status: "satisfied",
  row_closure: "EVID-SUPPORT",
  activation_status: "closed",
  owner_confirmation: "explicit-okay-to-full-immediately-preceding-packet-current-codex-task",
  stop_result: "completed-documentation-only-support-posture-decision",
  raw_email_address_account_url_private_identifier_retained: "no"
};
const providerCostPartialStopInputReferenceMaterialFields = [
  "activation_status",
  "approval",
  "approval_id",
  "billing_posture",
  "broader_aggregation_display_completeness",
  "credit_remaining_usd",
  "dashboard_summary_displayed_selected_period",
  "evidence_class",
  "evidence_id",
  "freshness",
  "funded_headroom_classification",
  "hard_requirement",
  "observed_at",
  "payment_credit_budget_settings_action",
  "payment_details_status",
  "period",
  "production_proof",
  "provider_api_call",
  "provider_write_action",
  "row_closure",
  "status",
  "target",
  "target_alias",
  "target_match",
  "total_requests",
  "total_spend_usd",
  "total_tokens"
];
const canonicalProviderCostPartialStopInputReference = "zero-funded-headroom-at-observation";
const canonicalCompletedProviderFundingPostureDecisionFields = {
  packet_execution_status: "approved-completed-release-owner-judgment",
  packet_item_count: "1",
  approval_unit: "release-owner-judgment",
  primary_approval_unit: "authenticated-private-read",
  evidence_id: "EVID-PROVIDER-COST",
  requested_operation: "release-owner-judgment-provider-funding-posture-only",
  command: "no-command",
  browser_action: "none",
  external_action: "none",
  decision_input: "zero-funded-headroom-at-observation",
  decision_input_fingerprint_sha256: "7B93FE3AB25148E5092D47F4A77CCCFD978715EE838F775EDEAB9DEDE84DC259",
  decision_input_record_status: "complete-for-provider-funding-posture-judgment",
  input_fresh_at_decision: "yes",
  material_change_revalidation: "effective-date-and-scope-match-revalidate-on-material-scope-or-evidence-change",
  decision_scope: "whether-zero-funded-provider-cost-posture-keeps-evid-provider-cost-blocked-only",
  decision_owner: "kurodev",
  required_approver: "kurodev",
  owner_confirmation: "explicit-full-packet-approval-current-codex-task",
  approval_id: "NC-R1-PROVIDER-FUNDING-POSTURE-20260807-01",
  scope_alias: "creator-paid-primary-openai-provider-funding-posture",
  effective_date: "2026-08-07",
  retention: "current-Codex-task-sanitized-report",
  stop_owner: "kurodev",
  rollback_owner: "kurodev",
  owner_decision: "keep-blocker-until-product-price-and-cost-model-ready",
  closure_limit: "none",
  row_closure: "none",
  payment_authorization: "none",
  provider_api_authorization: "none",
  provider_architecture_change_authorization: "none",
  final_risk_acceptance: "none",
  final_release_go: "none",
  activation_status: "closed",
  evidence_class: "gated",
  freshness: "fresh",
  target: "exact",
  approval: "approved",
  hard_requirement: "yes",
  production_proof: "no",
  status: "incomplete",
  raw_url_organization_project_id_private_identifier_raw_payload_retained: "no",
  stop_result: "none-completed-within-approved-documentation-only-scope"
};
const canonicalCompletedSupabaseBackupPrerequisiteInputPacketFields = {
  packet_execution_status: "approved-completed-authenticated-private-prerequisite-input",
  packet_item_count: "1",
  primary_approval_unit: "release-owner-judgment",
  prerequisite_approval_unit: "authenticated-private-read",
  evidence_id: "EVID-SUPABASE-BACKUP",
  requested_operation: "authenticated-private-read-backup-recovery-posture-input-only",
  approval_id: "NC-R1-SUPABASE-BACKUP-INPUT-20260806-01",
  required_approver: "kurodev",
  operator: "Codex-root-agent-current-task",
  time_window: "2026-08-06T23:49:10+09:00/2026-08-07T01:00:00+09:00",
  evidence_retention_location: "current-Codex-task-sanitized-report",
  stop_owner: "kurodev",
  rollback_owner: "kurodev",
  target_alias: "creator-production-supabase",
  target_match: "yes",
  observed_at: "2026-08-06T23:51:11+09:00",
  free_plan_visible: "yes",
  scheduled_project_backups: "not-included-on-Free",
  paid_upgrade_option: "Pro-up-to-7-days-scheduled-backups",
  general_scheduled_backup_restore_wording: "daily-around-project-region-midnight-general-restore-wording",
  free_note_precedence: "explicit-Free-note-controls-not-general-wording",
  actual_free_backup_classification: "not-included-on-Free",
  pitr_tab_read: "no",
  restore_download_action: "no",
  upgrade_action: "no",
  command_sql_write_settings_mutation: "none",
  evidence_class: "gated",
  freshness: "fresh",
  target: "exact",
  approval: "approved",
  hard_requirement: "yes",
  production_proof: "no",
  status: "incomplete",
  target_posture_input_status: "complete-for-owner-judgment",
  closure_authority: "release-owner-judgment",
  row_closure: "forbidden-pending-separate-accept-or-upgrade-decision",
  owner_decision: "forbidden",
  raw_url_project_ref_org_id_private_identifiers_raw_payload_retained: "no",
  incidental_schema_table_field_content_retained: "no",
  stop_result: "none-completed-prerequisite-input-only"
};
const canonicalCompletedSupabaseBackupPostureDecisionFields = {
  packet_execution_status: "approved-completed-release-owner-judgment",
  packet_item_count: "1",
  primary_approval_unit: "release-owner-judgment",
  evidence_id: "EVID-SUPABASE-BACKUP",
  requested_operation: "release-owner-accept-or-upgrade-backup-recovery-posture-judgment-only",
  command: "no-command",
  browser_action: "none",
  external_action: "none",
  decision_input: "approved-authenticated-private-backup-recovery-posture-input-only",
  decision_input_fingerprint_sha256: "6D90B9D6225BB7708998063E7546C06F982ACF336D05981D34916023140F6883",
  decision_input_record_status: "complete-for-owner-judgment",
  decision_scope: "whether-current-free-backup-recovery-posture-is-acceptable-for-evid-supabase-backup-only",
  decision_owner: "kurodev",
  required_approver: "kurodev",
  owner_confirmation: "explicit-full-packet-approval-current-codex-task",
  approval_id: "NC-R1-SUPABASE-BACKUP-POSTURE-20260807-01",
  scope_alias: "creator-production-supabase-free-backup-recovery-posture",
  effective_date: "2026-08-07",
  retention: "current-Codex-task-sanitized-report",
  stop_owner: "kurodev",
  rollback_owner: "kurodev",
  owner_decision: "accept-current-free-posture",
  closure_limit: "at-most-EVID-SUPABASE-BACKUP-only",
  row_closure: "EVID-SUPABASE-BACKUP",
  accepted_no_scheduled_backup_recovery_risk: "carried-to-EVID-RISK-ACCEPTANCE",
  upgrade_authorization: "none",
  final_risk_acceptance: "none",
  final_release_go: "none",
  activation_status: "closed",
  evidence_class: "gated",
  freshness: "fresh",
  target: "exact",
  approval: "approved",
  hard_requirement: "yes",
  production_proof: "no",
  status: "satisfied",
  raw_url_project_ref_org_id_private_identifiers_raw_payload_retained: "no",
  incidental_schema_table_field_content_retained: "no",
  stop_result: "none-completed-within-approved-documentation-only-scope"
};
const backupPrerequisiteInputReferenceMaterialFields = [
  "actual_free_backup_classification",
  "approval",
  "approval_id",
  "closure_authority",
  "evidence_class",
  "evidence_id",
  "free_note_precedence",
  "free_plan_visible",
  "freshness",
  "general_scheduled_backup_restore_wording",
  "hard_requirement",
  "observed_at",
  "paid_upgrade_option",
  "pitr_tab_read",
  "production_proof",
  "restore_download_action",
  "row_closure",
  "scheduled_project_backups",
  "status",
  "target",
  "target_alias",
  "target_match",
  "target_posture_input_status",
  "upgrade_action"
];
const canonicalBackupPrerequisiteInputReference = "approved-authenticated-private-backup-recovery-posture-input-only";
const canonicalCurrentContinuationLocalVerificationFields = {
  current_continuation_worktree_node_modules: "present-lockfile-matched",
  current_continuation_worktree_dependency_checks: "completed-current-local",
  current_continuation_worktree_dependency_install: "approved-completed-local",
  current_continuation_worktree_lint: "passed-local",
  current_continuation_worktree_strict_typecheck: "passed-local",
  current_continuation_worktree_next_build: "passed-local",
  current_continuation_worktree_opennext_build: "passed-local",
  current_continuation_worktree_public_entitlement_contract: "passed-local",
  current_continuation_worktree_security_privacy_contract: "passed-local",
  current_continuation_worktree_product_check_status: "passed-local-no-product-failure-claim",
  current_continuation_worktree_local_approval_id: "NC-R1-LOCAL-DEPS-20260806-01",
  current_continuation_worktree_local_approval_status: "completed-local",
  current_continuation_worktree_local_observed_at: "2026-08-06T19:38+09:00",
  current_continuation_worktree_local_target_alias: "dcb5-nc-r1-evidence-clearance",
  current_continuation_worktree_local_operator: "Codex-root-agent-current-task",
  current_continuation_worktree_local_evidence_retention_location: "current-Codex-task-sanitized-report",
  current_continuation_worktree_local_required_approver: "kurodev",
  current_continuation_worktree_local_stop_owner: "kurodev",
  current_continuation_worktree_local_rollback_owner: "kurodev",
  current_continuation_worktree_package_json_sha256: "D28E0445B69199FB639E7EE193313D2E82DE15B9300C06CE179A3CD25AE80E91",
  current_continuation_worktree_package_lock_sha256: "0F3B1074691B8296E1E6C957C469DCB536B6C67B90890170600D7F50AEA138C8",
  current_continuation_worktree_node_version: "v22.22.2",
  current_continuation_worktree_npm_version: "10.9.7",
  current_continuation_worktree_runtime_source_changes_outside_authority_files: "none",
  current_continuation_worktree_observed_head: "60d8b86f98bfe9465afdf9fa22e7052c0169b993",
  current_continuation_worktree_wrangler_version: "4.95.0",
  current_continuation_worktree_worker_dry_run_exit: "0",
  current_continuation_worktree_worker_reported_total_kib: "9477.99",
  current_continuation_worktree_worker_reported_gzip_kib: "2046.83",
  current_continuation_worktree_worker_conservative_upper_bound_bytes: "2095960",
  current_continuation_worktree_worker_internal_ceiling_bytes: "3000000",
  current_continuation_worktree_worker_conservative_remaining_bytes: "904040",
  current_continuation_worktree_opennext_artifact_file_count: "1881",
  current_continuation_worktree_opennext_artifact_total_bytes: "128538687",
  current_continuation_worktree_opennext_artifact_tree_manifest_sha256: "EFD15C472669EF6DE17241FDE5BF9954CD59DE3E2688D01CB9F161D30CD9E6F7",
  current_continuation_worktree_opennext_artifact_fingerprint_algorithm: "unicode-code-point-sorted-relative-forward-slash-path-tab-byte-length-tab-lowercase-file-sha256-joined-lf-then-sha256",
  current_continuation_worktree_worker_entry_sha256: "D05223BF4D44C84108A102AB62AA3BC9C5568F0C3AC2064C37BE5CC65C64BC45",
  current_continuation_worktree_worker_entry_bytes: "2278",
  current_continuation_worktree_worker_size_evidence_scope: "local-artifact-acceptance-only-not-account-headroom-deployed-or-production-proof",
  current_continuation_worktree_command_results_authority: "root-observed-sanitized-snapshot-with-contract-enforced-source-toolchain-manifest-and-artifact-drift"
};
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

const canonicalCompletedLocalRevalidationRows = completedLocalRevalidationEvidenceIds.map((id) => ({
  id,
  classification: "completed-local-dependency-revalidation"
}));

function parseCompletedLocalRevalidationRows(markdown) {
  return [...markdown.matchAll(
    /^\| (EVID-[A-Z0-9-]+) \| (completed-local-dependency-revalidation) \| [^|]+ \|$/gm
  )].map((match) => ({ id: match[1], classification: match[2] }));
}

function validateCompletedLocalRevalidationRows(rows, evidenceRows) {
  assert.deepEqual(rows, canonicalCompletedLocalRevalidationRows, "completed local dependency revalidation rows must retain exact membership and classification");
  for (const row of evidenceRows.filter((entry) => completedLocalRevalidationEvidenceIds.includes(entry.id))) {
    assert.deepEqual(
      row,
      { id: row.id, evidenceClass: "local", freshness: "fresh", target: "exact", approval: "approved", hardRequirement: "yes", productionProof: "no", status: "satisfied" },
      `${row.id} must retain only current-worktree local satisfied evidence`
    );
  }
}

function assertHistoricalReferenceCannotSupersedeCurrentLocalRow({ evidenceId, historicalAuthority, currentStatus, currentVerification }) {
  assert.ok(completedLocalRevalidationEvidenceIds.includes(evidenceId), "historical-reference guard applies only to the three completed local rows");
  assert.equal(historicalAuthority, "non-authoritative-reference-only", "historical PR #749 evidence must remain non-authoritative for current closure");
  assert.equal(currentStatus, "satisfied", "completed current-worktree local revalidation must retain satisfied status");
  assert.equal(currentVerification, "current-worktree-post-approved-install-local-read-only-revalidation", "historical metadata cannot supersede current local closure evidence");
}

function parsePrimaryApprovalUnitRows(markdown) {
  return [...markdown.matchAll(
    /^\| (EVID-[A-Z0-9-]+) \| (authenticated-private-read|release-owner-judgment|live-operation|deploy-deployed-proof) \|$/gm
  )].map((match) => ({ id: match[1], primaryApprovalUnit: match[2] }));
}

function validatePrimaryApprovalUnitRows(rows) {
  assert.equal(rows.length, 16, "primary approval-unit mapping must retain the exact remaining external/owner/live/deployed 16 rows");
  assert.deepEqual(rows, canonicalPrimaryApprovalUnitRows, "primary approval-unit mapping must retain exact cardinality, membership, and order");
  assert.equal(rows.filter((row) => row.primaryApprovalUnit === "authenticated-private-read").length, 7, "authenticated-private-read membership must remain exact");
  assert.equal(rows.filter((row) => row.primaryApprovalUnit === "release-owner-judgment").length, 7, "release-owner-judgment membership must remain exact");
  assert.equal(rows.filter((row) => row.primaryApprovalUnit === "live-operation").length, 1, "live-operation membership must remain exact");
  assert.equal(rows.filter((row) => row.primaryApprovalUnit === "deploy-deployed-proof").length, 1, "deploy-deployed-proof membership must remain exact");
}

function parseAcquisitionDecisionRows(markdown) {
  return [...markdown.matchAll(
    /^\| (EVID-[A-Z0-9-]+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \| ([^|]+) \|$/gm
  )].map((match) => ({
    id: match[1],
    targetAlias: match[2].trim(),
    method: match[3].trim(),
    freshnessRule: match[4].trim(),
    sanitizedResult: match[5].trim(),
    stopCondition: match[6].trim(),
    rollbackOwner: match[7].trim(),
    evidenceRetention: match[8].trim(),
    requiredApprover: match[9].trim()
  }));
}

function validateAcquisitionDecisionRows(rows) {
  assert.equal(rows.length, 16, "acquisition/decision contract must retain the exact remaining external/owner/live/deployed 16 rows");
  for (const row of rows) {
    for (const dimension of ["targetAlias", "method", "freshnessRule", "sanitizedResult", "stopCondition", "rollbackOwner", "evidenceRetention", "requiredApprover"]) {
      assert.ok(row[dimension], `${row.id} acquisition/decision contract requires ${dimension}`);
    }
  }
  assert.deepEqual(rows, canonicalAcquisitionDecisionRows, "acquisition/decision contract must retain exact hard-requirement membership and dimensions");

  for (const row of rows) {
    const expectedFreshness = row.id === "EVID-SUPABASE-BACKUP" || canonicalPrimaryApprovalUnitRows.find((entry) => entry.id === row.id)?.primaryApprovalUnit === "release-owner-judgment"
      ? humanDecisionFreshnessRule
      : externalFreshnessRule;
    assert.equal(row.freshnessRule, expectedFreshness, `${row.id} must retain the applicable external freshness or human-decision revalidation boundary`);
  }

  const backup = rows.find((row) => row.id === "EVID-SUPABASE-BACKUP");
  assert.equal(backup?.method, "named-accept-upgrade-decision-after-target-posture-input-only", "Supabase backup closure must remain a named accept/upgrade decision with posture as input only");
  assert.equal(backup?.requiredApprover, "named-release-owner-required", "Supabase backup closure must retain named release-owner approval");
}

function readDecisionSequenceFields(markdown) {
  return Object.fromEntries(
    Object.keys(canonicalDecisionSequenceFields).map((field) => [field, readUniqueTextField(markdown, field)])
  );
}

function validateDecisionSequenceFields(fields) {
  assert.deepEqual(fields, canonicalDecisionSequenceFields, "row-level judgment and final release decision sequence must retain exact authority boundaries");
}

function validateTaskOperationalFields(markdown) {
  for (const [field, expected] of Object.entries(canonicalTaskOperationalFields)) {
    assert.equal(readUniqueTextField(markdown, field), expected, `${field} must retain its exact current operational state`);
  }
}

function assertOrdinaryRowJudgmentEligible({ evidenceId, rowContractComplete, closureIds, closureResult, activationStatus, unresolvedHardRequirements }) {
  assert.ok(ordinaryRowJudgmentIds.includes(evidenceId), "ordinary row-level judgment allows only its six designated evidence IDs");
  assert.equal(rowContractComplete, true, "ordinary row-level judgment requires its complete row contract");
  assert.deepEqual(closureIds, [evidenceId], "ordinary row-level judgment may close exactly its own row");
  assert.equal(closureResult, "satisfied", "ordinary row-level judgment requires a satisfied closure result for its own row");
  assert.equal(activationStatus, "closed", "ordinary row-level judgment must preserve closed activation");
  assert.ok(Number.isInteger(unresolvedHardRequirements) && unresolvedHardRequirements >= 0, "ordinary row-level judgment requires a non-negative unresolved count");
}

function assertRiskAcceptanceEligible({ otherHardRequirementsSatisfied, residualRisksEnumerated }) {
  assert.equal(otherHardRequirementsSatisfied, true, "EVID-RISK-ACCEPTANCE is forbidden before the other 9 currently unresolved hard requirements are satisfied");
  assert.equal(residualRisksEnumerated, true, "EVID-RISK-ACCEPTANCE requires enumerated residual risks");
}

function assertFinalReleaseGoEligible({ unresolvedHardRequirements, explicitGo }) {
  assert.equal(unresolvedHardRequirements, 0, "final release GO is forbidden before zero unresolved hard requirements");
  assert.equal(explicitGo, true, "final release GO requires an explicit GO decision");
}

function assertRowClosurePreservesClosedActivation({ activationStatus }) {
  assert.equal(activationStatus, "closed", "row closure must not open activation");
}

function assertPausePostureSupplementEligible({ pauseObservationStatus, judgmentInputComplete, freshness, decisionContractComplete, approvalStatus, decisionOwner, decisionOutcome, closureIds, residualAutoPauseRiskCarriedTo, finalRiskAcceptance, finalReleaseGo, activationStatus }) {
  assert.equal(pauseObservationStatus, "incomplete", "pause-posture supplemental judgment must retain the partial-stop evidence row as incomplete until judgment");
  assert.equal(judgmentInputComplete, true, "pause-posture supplemental judgment requires complete factual posture inputs");
  assert.equal(freshness, "fresh", "pause-posture supplemental judgment requires fresh factual posture inputs");
  assert.ok(closureIds.length <= 1, "pause-posture supplemental judgment may close at most one row");
  if (closureIds.length === 1) {
    assert.deepEqual(closureIds, ["EVID-SUPABASE-PAUSE"], "pause-posture supplemental judgment may close only EVID-SUPABASE-PAUSE");
  }
  assert.equal(residualAutoPauseRiskCarriedTo, "EVID-RISK-ACCEPTANCE", "accepted pause posture must carry residual auto-pause risk to EVID-RISK-ACCEPTANCE");
  assert.equal(finalRiskAcceptance, false, "pause-posture supplemental judgment is not final risk acceptance");
  assert.equal(finalReleaseGo, false, "pause-posture supplemental judgment is not final release GO");
  assert.equal(activationStatus, "closed", "pause-posture supplemental judgment must preserve closed activation");
  assert.equal(decisionContractComplete, true, "pause-posture row closure requires a complete owner-decision contract");
  assert.equal(approvalStatus, "approved", "pause-posture row closure requires explicit approval");
  assert.match(decisionOwner, /^(?!<)[A-Za-z0-9][A-Za-z0-9._-]*$/, "pause-posture row closure requires a named decision owner");
  assert.equal(decisionOutcome, "accepted", "pause-posture row closure requires an accepted posture decision");
}

function assertBackupPostureDecisionEligible({ inputStatus, approvalStatus, decisionOwner, ownerConfirmation, decisionOutcome, closureIds, residualRiskCarriedTo, upgradeAuthorization, finalRiskAcceptance, finalReleaseGo, activationStatus }) {
  assert.equal(inputStatus, "complete-for-owner-judgment", "Backup posture decision requires the completed prerequisite input");
  assert.equal(approvalStatus, "approved", "Backup posture decision requires explicit approval");
  assert.equal(decisionOwner, "kurodev", "Backup posture decision requires the approved named owner");
  assert.equal(ownerConfirmation, "explicit-full-packet-approval-current-codex-task", "Backup posture decision requires explicit full-packet owner confirmation");
  assert.equal(decisionOutcome, "accept-current-free-posture", "Backup posture decision requires the approved current-Free posture outcome");
  assert.deepEqual(closureIds, ["EVID-SUPABASE-BACKUP"], "Backup posture decision may close exactly EVID-SUPABASE-BACKUP");
  assert.equal(residualRiskCarriedTo, "EVID-RISK-ACCEPTANCE", "Backup posture decision must carry no-scheduled-backup/recovery risk to EVID-RISK-ACCEPTANCE");
  assert.equal(upgradeAuthorization, "none", "Backup posture decision must not authorize an actual upgrade");
  assert.equal(finalRiskAcceptance, false, "Backup posture decision is not final risk acceptance");
  assert.equal(finalReleaseGo, false, "Backup posture decision is not final release GO");
  assert.equal(activationStatus, "closed", "Backup posture decision must preserve closed activation");
}

function parseNextApprovalPacket(markdown) {
  const section = markdown.match(/## Next Minimum Single Approval Packet\r?\n([\s\S]*?)(?=\r?\n## |$)/);
  assert.ok(section, "missing copy-ready next single approval packet section");
  const entries = [...section[1].matchAll(/^([a-z0-9_]+)=([^\r\n]+)$/gm)].map((match) => [match[1], match[2].trim()]);
  assert.equal(new Set(entries.map(([field]) => field)).size, entries.length, "next single approval packet fields must not repeat");
  return { section: section[1], fields: Object.fromEntries(entries) };
}

function parseCompletedLocalApprovalPacket(markdown) {
  const section = markdown.match(/## Completed Local Dependency Approval Record\r?\n([\s\S]*?)(?=\r?\n## |$)/);
  assert.ok(section, "missing completed local dependency approval record section");
  const entries = [...section[1].matchAll(/^([a-z0-9_]+)=([^\r\n]+)$/gm)].map((match) => [match[1], match[2].trim()]);
  assert.equal(new Set(entries.map(([field]) => field)).size, entries.length, "completed local approval record fields must not repeat");
  return { section: section[1], fields: Object.fromEntries(entries) };
}

function parseCompletedWorkerRequestPacket(markdown) {
  const section = markdown.match(/## Completed Authenticated-Private Worker Request Evidence\r?\n([\s\S]*?)(?=\r?\n## |$)/);
  assert.ok(section, "missing completed Worker Request evidence section");
  const entries = [...section[1].matchAll(/^([a-z0-9_]+)=([^\r\n]+)$/gm)].map((match) => [match[1], match[2].trim()]);
  assert.equal(new Set(entries.map(([field]) => field)).size, entries.length, "completed Worker Request evidence fields must not repeat");
  return { section: section[1], fields: Object.fromEntries(entries) };
}

function parseCompletedSupabaseSizePacket(markdown) {
  const section = markdown.match(/## Completed Authenticated-Private Supabase Size Evidence\r?\n([\s\S]*?)(?=\r?\n## |$)/);
  assert.ok(section, "missing completed Supabase Size evidence section");
  const entries = [...section[1].matchAll(/^([a-z0-9_]+)=([^\r\n]+)$/gm)].map((match) => [match[1], match[2].trim()]);
  assert.equal(new Set(entries.map(([field]) => field)).size, entries.length, "completed Supabase Size evidence fields must not repeat");
  return { section: section[1], fields: Object.fromEntries(entries) };
}

function parseCompletedSupabasePausePartialStopPacket(markdown) {
  const section = markdown.match(/## Approved Partial-Stop Authenticated-Private Supabase Pause Evidence\r?\n([\s\S]*?)(?=\r?\n## |$)/);
  assert.ok(section, "missing approved partial-stop Supabase Pause evidence section");
  const entries = [...section[1].matchAll(/^([a-z0-9_]+)=([^\r\n]+)$/gm)].map((match) => [match[1], match[2].trim()]);
  assert.equal(new Set(entries.map(([field]) => field)).size, entries.length, "partial-stop Supabase Pause evidence fields must not repeat");
  return { section: section[1], fields: Object.fromEntries(entries) };
}

function parseCompletedSupabasePausePostureDecision(markdown) {
  const section = markdown.match(/## Completed Release-Owner Supabase Pause-Posture Decision\r?\n([\s\S]*?)(?=\r?\n## |$)/);
  assert.ok(section, "missing completed release-owner Supabase Pause-posture decision section");
  const entries = [...section[1].matchAll(/^([a-z0-9_]+)=([^\r\n]+)$/gm)].map((match) => [match[1], match[2].trim()]);
  assert.equal(new Set(entries.map(([field]) => field)).size, entries.length, "completed Supabase Pause-posture decision fields must not repeat");
  return { section: section[1], fields: Object.fromEntries(entries) };
}

function parseCompletedSupabaseEgressPartialStopPacket(markdown) {
  const section = markdown.match(/## Approved Partial-Stop Authenticated-Private Supabase Egress Evidence\r?\n([\s\S]*?)(?=\r?\n## |$)/);
  assert.ok(section, "missing approved partial-stop Supabase Egress evidence section");
  const entries = [...section[1].matchAll(/^([a-z0-9_]+)=([^\r\n]+)$/gm)].map((match) => [match[1], match[2].trim()]);
  assert.equal(new Set(entries.map(([field]) => field)).size, entries.length, "partial-stop Supabase Egress evidence fields must not repeat");
  return { section: section[1], fields: Object.fromEntries(entries) };
}

function parseCompletedSupabaseCachedEgressPacket(markdown) {
  const section = markdown.match(/## Completed Authenticated-Private Supabase Cached Egress Evidence\r?\n([\s\S]*?)(?=\r?\n## |$)/);
  assert.ok(section, "missing completed Supabase Cached Egress evidence section");
  const entries = [...section[1].matchAll(/^([a-z0-9_]+)=([^\r\n]+)$/gm)].map((match) => [match[1], match[2].trim()]);
  assert.equal(new Set(entries.map(([field]) => field)).size, entries.length, "completed Supabase Cached Egress evidence fields must not repeat");
  return { section: section[1], fields: Object.fromEntries(entries) };
}

function validateCompletedWorkerRequestPacket(packet) {
  assert.deepEqual(packet.fields, canonicalCompletedWorkerRequestPacketFields, "completed Worker Request evidence must retain the exact approved scope and sanitized result");
  assertAuthenticatedPrivateFreshness(packet.fields.observed_at);
  assert.equal(packet.fields.time_window, `current-Codex-turn-only-completed-${packet.fields.observed_at}`, "Worker Request's turn-scoped approval window must match its exact completed observation timestamp");
  assert.match(packet.section, /closes exactly EVID-WORKER-REQUEST|EVID-WORKER-REQUEST alone/, "completed Worker Request evidence must close exactly one row");
  assert.match(packet.section, /does not establish deployment or activation|deploy、activation/, "completed Worker Request evidence must not become deployment or activation proof");
}

function validateCompletedSupabaseSizePacket(packet) {
  assert.deepEqual(packet.fields, canonicalCompletedSupabaseSizePacketFields, "completed Supabase Size evidence must retain the exact approved scope and sanitized result");
  assertAuthenticatedPrivateFreshness(packet.fields.observed_at);
  assertObservationWithinApprovedWindow(packet.fields.observed_at, packet.fields.time_window);
  assert.match(packet.section, /closes exactly EVID-SUPABASE-SIZE|EVID-SUPABASE-SIZE alone/, "completed Supabase Size evidence must close exactly one row");
  assert.match(packet.section, /does not establish deployment or activation|deploy、activation/, "completed Supabase Size evidence must not become deployment or activation proof");
  assert.match(packet.section, /exact remaining bytes.*percentage.*unit conversion.*forbidden|exact remaining bytes、percentage、unit conversion.*forbidden/, "completed Supabase Size evidence must forbid unobserved capacity or conversion inferences");
  assertNoUnsupportedSupabaseSizeClaims(packet.section);
}

function validateCompletedSupabasePausePartialStopPacket(packet) {
  assert.deepEqual(packet.fields, canonicalCompletedSupabasePausePartialStopPacketFields, "partial-stop Supabase Pause evidence must retain the exact approved scope and sanitized result");
  assertAuthenticatedPrivateFreshness(packet.fields.observed_at);
  assertObservationWithinApprovedWindow(packet.fields.observed_at, packet.fields.time_window);
  assert.match(packet.section, /support(?:s|ed) active\/not-paused-at-observation only|active-at-observation only/, "partial-stop Supabase Pause evidence must limit the result to active-at-observation");
  assert.match(packet.section, /historical partial stop/i, "partial-stop Supabase Pause evidence must describe its observation as historical");
  assert.match(packet.section, /was `incomplete` at observation and is now superseded for EVID-SUPABASE-PAUSE row status only by the separately approved completed accepted posture decision/i, "partial-stop Supabase Pause evidence must retain its historical incomplete state and the bounded supersession");
  assert.doesNotMatch(packet.section, /EVID-SUPABASE-PAUSE remains `incomplete`/, "partial-stop Supabase Pause evidence must not retain stale current incomplete wording");
  assert.doesNotMatch(packet.section, /later release-owner pause-posture judgment may decide/i, "partial-stop Supabase Pause evidence must not retain stale future judgment wording");
  assert.doesNotMatch(packet.section, /If that later judgment accepts/i, "partial-stop Supabase Pause evidence must not retain stale conditional acceptance wording");
  assert.match(packet.section, /Restart locator count 2.*reliable current-state signal|restart locator count 2.*not reliable/i, "partial-stop Supabase Pause evidence must not promote the Restart locator to a state signal");
  assert.match(packet.section, /last_activity_display=not-displayed/, "partial-stop Supabase Pause evidence must retain the unavailable last-activity display");
  assert.match(packet.section, /pause_countdown_display=not-displayed/, "partial-stop Supabase Pause evidence must retain the unavailable pause countdown display");
  assert.match(packet.section, /future_pause_headroom_display=not-displayed/, "partial-stop Supabase Pause evidence must retain the unavailable future-pause headroom display");
  assert.match(packet.section, /button was not clicked|button_clicked=no/, "partial-stop Supabase Pause evidence must prohibit Pause button execution");
  assert.match(packet.section, /does not establish deployment or activation|deployment or activation/, "partial-stop Supabase Pause evidence must not become deployment or activation proof");
  assertNoUnsupportedSupabasePauseClaims(packet.section);
}

function validateCompletedSupabasePausePostureDecision(packet) {
  assert.deepEqual(packet.fields, canonicalCompletedSupabasePausePostureDecisionFields, "completed Supabase Pause-posture decision must retain the exact approved owner judgment and bounded closure");
  assertSourceFreshness(packet.fields.effective_date);
  assertPausePostureSupplementEligible({
    pauseObservationStatus: "incomplete",
    judgmentInputComplete: packet.fields.decision_input_record_status === "complete-for-posture-judgment",
    freshness: packet.fields.freshness,
    decisionContractComplete: true,
    approvalStatus: packet.fields.approval,
    decisionOwner: packet.fields.decision_owner,
    decisionOutcome: packet.fields.decision,
    closureIds: [packet.fields.evidence_id],
    residualAutoPauseRiskCarriedTo: packet.fields.residual_auto_pause_risk.replace("carried-to-", ""),
    finalRiskAcceptance: packet.fields.final_risk_acceptance !== "none",
    finalReleaseGo: packet.fields.final_release_go !== "none",
    activationStatus: packet.fields.activation_status
  });
  assert.match(packet.section, /closes exactly EVID-SUPABASE-PAUSE/, "completed Supabase Pause-posture decision must close exactly EVID-SUPABASE-PAUSE");
  assert.match(packet.section, /no external or browser action|external_browser_action=none/i, "completed Supabase Pause-posture decision must retain the no-action boundary");
  assert.match(packet.section, /not final risk acceptance|final_risk_acceptance=none/i, "completed Supabase Pause-posture decision must not become final risk acceptance");
  assert.match(packet.section, /not final release GO|final_release_go=none/i, "completed Supabase Pause-posture decision must not become final release GO");
  assert.match(packet.section, /activation.*closed|activation_status=closed/i, "completed Supabase Pause-posture decision must preserve closed activation");
  assert.match(packet.section, /residual auto-pause risk.*EVID-RISK-ACCEPTANCE/i, "completed Supabase Pause-posture decision must carry residual auto-pause risk to EVID-RISK-ACCEPTANCE");
  assert.match(packet.section, /owner_confirmation=explicit-full-packet-approval-current-codex-task/, "completed Supabase Pause-posture decision must retain explicit full-packet owner confirmation");
}

function validateCompletedSupabaseEgressPartialStopPacket(packet) {
  assert.deepEqual(packet.fields, canonicalCompletedSupabaseEgressPartialStopPacketFields, "partial-stop Supabase Egress evidence must retain the exact approved scope and sanitized result");
  assertAuthenticatedPrivateFreshness(packet.fields.observed_at);
  assertObservationWithinApprovedWindow(packet.fields.observed_at, packet.fields.time_window);
  assert.match(packet.section, /closed no row|closes no row|remains `incomplete`/, "partial-stop Supabase Egress evidence must not close EVID-SUPABASE-EGRESS");
  assert.match(packet.section, /Cached Egress.*(?:not read|was not read)|no Cached Egress value was read|cached egress.*not read/i, "partial-stop Supabase Egress evidence must retain the unread Cached Egress stop");
  assert.match(packet.section, /does not establish deployment or activation|deployment or activation/, "partial-stop Supabase Egress evidence must not become deployment or activation proof");
  assert.match(packet.section, /Remaining capacity, percentage, and rounding inferences are forbidden|remaining capacity, percentage, or rounding/, "partial-stop Supabase Egress evidence must forbid remaining-capacity, percentage, and rounding inferences");
  assertNoUnsupportedSupabaseEgressClaims(packet.section);
}

function validateCompletedSupabaseCachedEgressPacket(packet) {
  assert.deepEqual(packet.fields, canonicalCompletedSupabaseCachedEgressPacketFields, "completed Supabase Cached Egress evidence must retain the exact separately approved cached-only scope and sanitized result");
  assertAuthenticatedPrivateFreshness(packet.fields.observed_at);
  assertObservationWithinApprovedWindow(packet.fields.observed_at, packet.fields.time_window);
  assert.match(packet.section, /closes exactly EVID-SUPABASE-EGRESS/, "completed Supabase Cached Egress evidence must close exactly EVID-SUPABASE-EGRESS");
  assert.match(packet.section, /does not establish deployment or activation|deployment or activation/, "completed Supabase Cached Egress evidence must not become deployment or activation proof");
  assert.match(packet.section, /independently[\s\S]*under-public-limit[\s\S]*positive-headroom-at-observation|under their respective public limits/i, "completed Supabase Cached Egress evidence must classify uncached and cached metrics independently");
  assert.match(packet.section, /no Cached Egress max was displayed|displayed no Cached Egress max/i, "completed Supabase Cached Egress evidence must record the absent cached maximum without inventing a value");
  assertNoUnsupportedSupabaseCachedEgressClaims(packet.section);
}

function assertNoSupabasePrivateIdentifiers(markdown) {
  assert.doesNotMatch(
    markdown,
    /https?:\/\/supabase\.com\/dashboard\/(?:project|org)\/[a-z0-9_-]{8,}|\/dashboard\/(?:project|org)\/[a-z0-9_-]{8,}|(?:project[_ -]?ref|org[_ -]?id)\s*[=:]\s*[a-z0-9_-]{8,}/i,
    "Supabase authority must not retain raw dashboard routes, project refs, or organization IDs"
  );
}

function assertNoUnsafeSupabaseBackupFreeClaims(section) {
  assert.doesNotMatch(
    section,
    /\bFree(?:\s+(?:Plan|projects?|target))?\s+(?:includes?|has|provides?|offers?)\s+(?:(?:daily|scheduled|automatic|project)\s+)*(?:backups?|restores?)\b/i,
    "Supabase Backup prerequisite input must not retain an unsafe actual-Free backup or restore claim"
  );
  assert.doesNotMatch(
    section,
    /\bFree\s+projects?\s+(?:are|is)\s+backed\s+up(?:\s+(?:daily|scheduled|automatically|at\s+midnight))?\b/i,
    "Supabase Backup prerequisite input must not retain an unsafe actual-Free backup or restore claim"
  );
  assert.doesNotMatch(
    section,
    /\bFree\s+(?:can|may)\s+be\s+restored\s+(?:at\s+any\s+time|daily|automatically)\b/i,
    "Supabase Backup prerequisite input must not retain an unsafe actual-Free backup or restore claim"
  );
  assert.doesNotMatch(
    section,
    /\b(?:general\s+)?(?:daily|midnight|restore)(?:[^\r\n]{0,80})\b(?:applies?|is\s+actual(?:ly)?\s+(?:for|on)|is\s+available\s+(?:for|on))\b(?:[^\r\n]{0,80})\bFree(?:\s+(?:Plan|projects?|target))?\b/i,
    "Supabase Backup prerequisite input must not retain an unsafe actual-Free backup or restore claim"
  );
  assert.doesNotMatch(
    section,
    /\bFree(?:\s+(?:Plan|projects?|target))?(?:[^\r\n]{0,80})\b(?:daily|midnight|restore)(?:[^\r\n]{0,80})\b(?:applies?|is\s+actual(?:ly)?\s+(?:for|on)|is\s+available\s+(?:for|on))\b/i,
    "Supabase Backup prerequisite input must not retain an unsafe actual-Free backup or restore claim"
  );
}

function assertNoSupabaseBackupPrivateOrIncidentalRetention(section) {
  assert.doesNotMatch(section, /https?:\/\/[^\s)\]}>]+/i, "Supabase Backup prerequisite input must not retain a raw URL");
  assert.doesNotMatch(section, /\/dashboard\/(?:project|org)\/[a-z0-9_-]{8,}/i, "Supabase Backup prerequisite input must not retain a raw dashboard route");
  assert.doesNotMatch(section, /\b(?:project|org)[_ -]?(?:ref|id)\s*[=:]\s*[a-z0-9_-]{8,}\b/i, "Supabase Backup prerequisite input must not retain a raw project or organization reference");
  assert.doesNotMatch(section, /\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/i, "Supabase Backup prerequisite input must not retain a UUID");
  assert.doesNotMatch(section, /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}\b/i, "Supabase Backup prerequisite input must not retain a bare hostname or domain");
  assert.doesNotMatch(
    section,
    /\b(?:schema|table|field|column)\s+(?!no\b|not\b|none\b|any\b|content\b|identifier\b)[a-z][a-z0-9_]*\b/i,
    "Supabase Backup prerequisite input must not retain a named schema, table, field, or column identifier"
  );
}

function assertNoUnsupportedSupabaseSizeClaims(section) {
  assert.doesNotMatch(section, /\b\d+(?:\.\d+)?\s*%/, "Supabase Size authority must not retain an inferred percentage");
  assert.doesNotMatch(
    section,
    /(?:(?:remaining|available|unused)(?:[^\r\n]{0,60})\b\d+(?:\.\d+)?\s*(?:bytes?|kib|mib|gib|kb|mb|gb|tb)\b|\b\d+(?:\.\d+)?\s*(?:bytes?|kib|mib|gib|kb|mb|gb|tb)\b(?:[^\r\n]{0,60})(?:remaining|available|unused))/i,
    "Supabase Size authority must not retain inferred remaining capacity"
  );
  assert.doesNotMatch(
    section,
    /\b\d+(?:\.\d+)?\s*(?:kib|mib|gib|kb|mb|gb|tb)\s*(?:=|equals|is|converts?\s+to|converted\s+to|->|→)\s*\d+(?:\.\d+)?\s*(?:kib|mib|gib|kb|mb|gb|tb)\b/i,
    "Supabase Size authority must not retain a unit-conversion inference"
  );
  assert.doesNotMatch(
    section,
    /(?:(?:egress|bandwidth|storage size|monthly active users?|\bmau\b|realtime messages?|edge function invocations?)(?:[^\r\n]{0,60})\b\d+(?:\.\d+)?\s*(?:%|bytes?|kib|mib|gib|kb|mb|gb|tb|requests?|messages?|users?)\b|\b\d+(?:\.\d+)?\s*(?:%|bytes?|kib|mib|gib|kb|mb|gb|tb|requests?|messages?|users?)\b(?:[^\r\n]{0,60})(?:egress|bandwidth|storage size|monthly active users?|\bmau\b|realtime messages?|edge function invocations?))/i,
    "Supabase Size authority must not retain another Usage metric value"
  );
}

function assertNoUnsupportedSupabaseEgressClaims(section) {
  assert.doesNotMatch(section, /(?:(?:cached[ _-]?egress|daily[ _-]?breakdown|incidental|other[ _-]?usage(?:[ _-]?metric)?(?:[ _-]?values?)?)(?:[^\r\n]{0,80})\b\d+(?:\.\d+)?\s*(?:bytes?|kib|mib|gib|kb|mb|gb|tb|%|requests?|messages?|users?)\b|\b\d+(?:\.\d+)?\s*(?:bytes?|kib|mib|gib|kb|mb|gb|tb|%|requests?|messages?|users?)\b(?:[^\r\n]{0,80})(?:cached[ _-]?egress|daily[ _-]?breakdown|incidental|other[ _-]?usage(?:[ _-]?metric)?(?:[ _-]?values?)?))/i, "partial-stop Supabase Egress evidence must not retain Cached Egress, daily-breakdown, incidental, or other Usage values");
  assert.doesNotMatch(section, /(?:(?:remaining|available|unused)(?:[^\r\n]{0,60})\b\d+(?:\.\d+)?\s*(?:bytes?|kib|mib|gib|kb|mb|gb|tb)\b|\b\d+(?:\.\d+)?\s*(?:bytes?|kib|mib|gib|kb|mb|gb|tb)\b(?:[^\r\n]{0,60})(?:remaining|available|unused))/i, "partial-stop Supabase Egress evidence must not retain inferred remaining capacity");
  assert.doesNotMatch(section, /\b\d+(?:\.\d+)?\s*%/, "partial-stop Supabase Egress evidence must not retain an inferred percentage");
}

function assertNoUnsupportedSupabaseCachedEgressClaims(section) {
  assert.doesNotMatch(
    section,
    /(?:(?:daily[ _-]?breakdown|incidental|other[ _-]?usage(?:[ _-]?metric)?(?:[ _-]?values?)?)(?:[^\r\n]{0,80})\b\d+(?:\.\d+)?\s*(?:bytes?|kib|mib|gib|kb|mb|gb|tb|%|requests?|messages?|users?)\b|\b\d+(?:\.\d+)?\s*(?:bytes?|kib|mib|gib|kb|mb|gb|tb|%|requests?|messages?|users?)\b(?:[^\r\n]{0,80})(?:daily[ _-]?breakdown|incidental|other[ _-]?usage(?:[ _-]?metric)?(?:[ _-]?values?)?))/i,
    "completed Supabase Cached Egress evidence must not retain daily-breakdown, incidental, or other Usage values"
  );
  assert.doesNotMatch(section, /(?:\bcross[ _-]?unit\b|\bcombined\b|\bsum\b|\btotal\b|\badd(?:ed|ition)?\b)(?:[^\r\n]{0,60})\b\d+(?:\.\d+)?\s*(?:bytes?|kib|mib|gib|kb|mb|gb|tb)\b/i, "completed Supabase Cached Egress evidence must not retain a cross-unit sum or total");
  assert.doesNotMatch(section, /(?:remaining|available|unused)(?:[^\r\n]{0,60})\b\d+(?:\.\d+)?\s*(?:bytes?|kib|mib|gib|kb|mb|gb|tb)\b/i, "completed Supabase Cached Egress evidence must not retain inferred remaining capacity");
  assert.doesNotMatch(section, /\b\d+(?:\.\d+)?\s*%/, "completed Supabase Cached Egress evidence must not retain an inferred percentage");
  assert.doesNotMatch(section, /\b\d+(?:\.\d+)?\s*(?:kib|mib|gib|kb|mb|gb|tb)\s*(?:=|equals|is|converts?\s+to|converted\s+to|->|→)\s*\d+(?:\.\d+)?\s*(?:kib|mib|gib|kb|mb|gb|tb)\b/i, "completed Supabase Cached Egress evidence must not retain a unit-conversion inference");
  assert.doesNotMatch(section, /(?:round(?:ing|ed)?(?:[^\r\n]{0,60})\b\d+(?:\.\d+)?\s*(?:bytes?|kib|mib|gib|kb|mb|gb|tb)\b|\b\d+(?:\.\d+)?\s*(?:bytes?|kib|mib|gib|kb|mb|gb|tb)\b(?:[^\r\n]{0,60})round(?:ing|ed)?)/i, "completed Supabase Cached Egress evidence must not retain a rounding inference");
}

function assertNoUnsupportedSupabasePauseClaims(section) {
  assert.doesNotMatch(section, /(?:future[- ]?pause[- ]?headroom|headroom)(?:[^\r\n]{0,60})\b\d+(?:\.\d+)?\s*(?:%|days?|hours?|minutes?|bytes?|kib|mib|gib|kb|mb|gb)\b/i, "partial-stop Supabase Pause evidence must not invent quantifiable future-pause headroom");
  assert.doesNotMatch(section, /(?:last activity|pause countdown)(?:[^\r\n]{0,60})\b\d+(?:\.\d+)?\s*(?:days?|hours?|minutes?)\b/i, "partial-stop Supabase Pause evidence must not invent unavailable pause timing");
  assert.doesNotMatch(section, /(?:restart locator|restart)(?:[^\r\n]{0,60})(?:proves?|establishes?|confirms?)(?:[^\r\n]{0,60})(?:current state|not paused|active)/i, "partial-stop Supabase Pause evidence must not promote a Restart locator to a current-state signal");
}

function assertAuthenticatedPrivateFreshness(observedAt, now = new Date()) {
  assert.match(observedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/, "authenticated-private observation must retain an explicit Asia/Tokyo timestamp");
  const observed = new Date(observedAt);
  assert.equal(Number.isNaN(observed.getTime()), false, "authenticated-private observation timestamp must be valid");
  const observedDay = parseUtcDate(calendarDateInTimeZone(observed));
  const currentDay = parseUtcDate(calendarDateInTimeZone(now));
  const ageDays = (currentDay.getTime() - observedDay.getTime()) / 86_400_000;
  assert.ok(ageDays >= 0, `authenticated-private observation is future-dated: ${observedAt}`);
  assert.ok(ageDays <= 7, `authenticated-private observation is stale after 7 days: ${observedAt}`);
}

function assertObservationWithinApprovedWindow(observedAt, timeWindow) {
  assert.match(timeWindow, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00\/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/, "approved time window must retain two explicit Asia/Tokyo timestamps");
  const [startAt, endAt] = timeWindow.split("/");
  const observed = new Date(observedAt);
  const start = new Date(startAt);
  const end = new Date(endAt);
  assert.equal(Number.isNaN(observed.getTime()), false, "approved-window observation timestamp must be valid");
  assert.equal(Number.isNaN(start.getTime()), false, "approved-window start timestamp must be valid");
  assert.equal(Number.isNaN(end.getTime()), false, "approved-window end timestamp must be valid");
  assert.ok(start.getTime() <= end.getTime(), "approved time window start must not be after end");
  assert.ok(start.getTime() <= observed.getTime(), "authenticated-private observation must not precede the approved time window");
  assert.ok(observed.getTime() <= end.getTime(), "authenticated-private observation must not follow the approved time window");
}

function parseCompletedWorkerCpuPartialStopPacket(markdown) {
  const section = markdown.match(/## Approved Partial-Stop Authenticated-Private Worker CPU Evidence\r?\n([\s\S]*?)(?=\r?\n## |$)/);
  assert.ok(section, "missing approved partial-stop Worker CPU evidence section");
  const entries = [...section[1].matchAll(/^([a-z0-9_]+)=([^\r\n]+)$/gm)].map((match) => [match[1], match[2].trim()]);
  assert.equal(new Set(entries.map(([field]) => field)).size, entries.length, "partial-stop Worker CPU fields must not repeat");
  return { section: section[1], fields: Object.fromEntries(entries) };
}

function parseCompletedProviderCostPartialStopPacket(markdown) {
  const section = markdown.match(/## Approved Partial-Stop Authenticated-Private Provider Cost Evidence\r?\n([\s\S]*?)(?=\r?\n## |$)/);
  assert.ok(section, "missing approved partial-stop Provider Cost evidence section");
  const entries = [...section[1].matchAll(/^([a-z0-9_]+)=([^\r\n]+)$/gm)].map((match) => [match[1], match[2].trim()]);
  assert.equal(new Set(entries.map(([field]) => field)).size, entries.length, "partial-stop Provider Cost fields must not repeat");
  return { section: section[1], fields: Object.fromEntries(entries) };
}

function parseCompletedProviderFundingPostureDecision(markdown) {
  const section = markdown.match(/## Completed Release-Owner Provider Funding-Posture Decision\r?\n([\s\S]*?)(?=\r?\n## |$)/);
  assert.ok(section, "missing completed release-owner Provider funding-posture decision section");
  const entries = [...section[1].matchAll(/^([a-z0-9_]+)=([^\r\n]+)$/gm)].map((match) => [match[1], match[2].trim()]);
  assert.equal(new Set(entries.map(([field]) => field)).size, entries.length, "completed Provider funding-posture decision fields must not repeat");
  return { section: section[1], fields: Object.fromEntries(entries) };
}

function parseCompletedStripeCostPartialStopPacket(markdown) {
  const section = markdown.match(/## Approved Partial-Stop Authenticated-Private Stripe Cost Evidence\r?\n([\s\S]*?)(?=\r?\n## |$)/);
  assert.ok(section, "missing approved partial-stop Stripe Cost evidence section");
  const entries = [...section[1].matchAll(/^([a-z0-9_]+)=([^\r\n]+)$/gm)].map((match) => [match[1], match[2].trim()]);
  assert.equal(new Set(entries.map(([field]) => field)).size, entries.length, "partial-stop Stripe Cost fields must not repeat");
  return { section: section[1], fields: Object.fromEntries(entries) };
}

function parseCompletedStripeBaseFeePartialStopPacket(markdown) {
  const section = markdown.match(/## Approved Post-Read Partial-Stop Authenticated-Private Stripe Base-Fee Evidence\r?\n([\s\S]*?)(?=\r?\n## |$)/);
  assert.ok(section, "missing approved post-read partial-stop Stripe Base-Fee evidence section");
  const entries = [...section[1].matchAll(/^([a-z0-9_]+)=([^\r\n]+)$/gm)].map((match) => [match[1], match[2].trim()]);
  assert.equal(new Set(entries.map(([field]) => field)).size, entries.length, "post-read partial-stop Stripe Base-Fee fields must not repeat");
  return { section: section[1], fields: Object.fromEntries(entries) };
}

function parseCompletedSupportPostureDecision(markdown) {
  const section = markdown.match(/## Completed Release-Owner Support Posture Decision\r?\n([\s\S]*?)(?=\r?\n## |$)/);
  assert.ok(section, "missing completed release-owner Support posture decision section");
  const entries = [...section[1].matchAll(/^([a-z0-9_]+)=([^\r\n]+)$/gm)].map((match) => [match[1], match[2].trim()]);
  assert.equal(new Set(entries.map(([field]) => field)).size, entries.length, "completed Support posture decision fields must not repeat");
  return { section: section[1], fields: Object.fromEntries(entries) };
}

function normalizeCompletedStripeCostPartialStopSection(section) {
  return section.replaceAll("\r\n", "\n").trim();
}

function completedStripeCostPartialStopSectionFingerprint(section) {
  return createHash("sha256")
    .update(normalizeCompletedStripeCostPartialStopSection(section), "utf8")
    .digest("hex")
    .toUpperCase();
}

function assertCompletedStripeCostPartialStopSectionAnchor(section) {
  assert.equal(
    completedStripeCostPartialStopSectionFingerprint(section),
    canonicalCompletedStripeCostPartialStopSectionSha256,
    "partial-stop Stripe Cost evidence must retain the exact owner-approved normalized section fingerprint"
  );
}

function assertCompletedStripeBaseFeePartialStopSectionAnchor(section) {
  assert.equal(
    completedStripeCostPartialStopSectionFingerprint(section),
    canonicalCompletedStripeBaseFeePartialStopSectionSha256,
    "post-read partial-stop Stripe Base-Fee evidence must retain the exact normalized section fingerprint"
  );
}

function normalizeCompletedSupportPostureDecisionSection(section) {
  return section.replaceAll("\r\n", "\n").trim();
}

function completedSupportPostureDecisionSectionFingerprint(section) {
  return createHash("sha256")
    .update(normalizeCompletedSupportPostureDecisionSection(section), "utf8")
    .digest("hex")
    .toUpperCase();
}

function assertCompletedSupportPostureDecisionSectionAnchor(section) {
  assert.equal(
    completedSupportPostureDecisionSectionFingerprint(section),
    canonicalCompletedSupportPostureDecisionSectionSha256,
    "completed Support posture decision must retain the exact owner-approved normalized section fingerprint"
  );
}

function parseCompletedSupabaseBackupPrerequisiteInputPacket(markdown) {
  const section = markdown.match(/## Completed Authenticated-Private Supabase Backup Prerequisite Input\r?\n([\s\S]*?)(?=\r?\n## |$)/);
  assert.ok(section, "missing completed Supabase Backup prerequisite input section");
  const entries = [...section[1].matchAll(/^([a-z0-9_]+)=([^\r\n]+)$/gm)].map((match) => [match[1], match[2].trim()]);
  assert.equal(new Set(entries.map(([field]) => field)).size, entries.length, "completed Supabase Backup prerequisite input fields must not repeat");
  return { section: section[1], fields: Object.fromEntries(entries) };
}

function parseCompletedSupabaseBackupPostureDecision(markdown) {
  const section = markdown.match(/## Completed Release-Owner Supabase Backup-Recovery Posture Decision\r?\n([\s\S]*?)(?=\r?\n## |$)/);
  assert.ok(section, "missing completed release-owner Supabase Backup-recovery posture decision section");
  const entries = [...section[1].matchAll(/^([a-z0-9_]+)=([^\r\n]+)$/gm)].map((match) => [match[1], match[2].trim()]);
  assert.equal(new Set(entries.map(([field]) => field)).size, entries.length, "completed Supabase Backup-recovery posture decision fields must not repeat");
  return { section: section[1], fields: Object.fromEntries(entries) };
}

function assertNoUnsupportedWorkerCpuClaims(section) {
  assert.doesNotMatch(section, /\b\d+(?:\.\d+)?\s*%/, "partial-stop Worker CPU evidence must not retain a percentage inference");
  assert.doesNotMatch(section, /(?:remaining(?:\s+(?:CPU|capacity|headroom))?|headroom)(?:[^\r\n]{0,60})\b\d+(?:\.\d+)?\s*(?:ms|seconds?|minutes?|hours?|bytes?|kib|mib|gib|kb|mb|gb)\b/i, "partial-stop Worker CPU evidence must not retain inferred remaining capacity");
  const unsafeCpuConclusion = String.raw`(?:no\s+(?:request|requests|invocation|invocations|execution|executions)\s+(?:(?:has|have|had)\s+)?exceeded\s+(?:the\s+)?(?:CPU(?:[- ]?time)?\s+)?limit|(?:CPU|worker\s+CPU|the\s+CPU)\s+(?:is|was)\s+(?:safe|within\s+(?:the\s+)?(?:CPU(?:[- ]?time)?\s+)?limit))`;
  assert.doesNotMatch(section, new RegExp(unsafeCpuConclusion, "i"), "partial-stop Worker CPU evidence must not retain an unsafe no-exceedance or CPU-safe conclusion");
}

function assertNoWorkerCpuPrivateIdentifiers(section) {
  assert.doesNotMatch(section, /https?:\/\/|workers\.dev|cloudflare\.com\//i, "partial-stop Worker CPU evidence must not retain a raw URL or subrequest host");
  assert.doesNotMatch(section, /\b[a-f0-9]{32}\b/i, "partial-stop Worker CPU evidence must not retain a raw account or deployment identifier");
  assert.doesNotMatch(section, /\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/i, "partial-stop Worker CPU evidence must not retain a UUID deployment or version identifier");
  assert.doesNotMatch(section, /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}\b/i, "partial-stop Worker CPU evidence must not retain a bare hostname or domain-like token");
  assert.doesNotMatch(section, /^(?:(?:worker_)?(?:deployment|version)(?:_id)?|deployment_version_id)\s*=\s*(?!no(?:\s|$)|none(?:\s|$)|not-(?:displayed|retained)(?:\s|$))[^\r\n]+$/gmi, "partial-stop Worker CPU evidence must not retain an explicit deployment or version identifier field");
}

function validateCompletedWorkerCpuPartialStopPacket(packet) {
  assert.deepEqual(packet.fields, canonicalCompletedWorkerCpuPartialStopPacketFields, "partial-stop Worker CPU evidence must retain the exact approved scope and sanitized incomplete result");
  assertAuthenticatedPrivateFreshness(packet.fields.observed_at);
  assertObservationWithinApprovedWindow(packet.fields.observed_at, packet.fields.time_window);
  assert.match(packet.section, /closes no row|does not close EVID-WORKER-CPU|rowをcloseしない/i, "partial-stop Worker CPU evidence must not close EVID-WORKER-CPU");
  assert.match(packet.section, /aggregation[- ]?complete indicator.*not displayed|aggregation_complete=unknown/i, "partial-stop Worker CPU evidence must retain unknown aggregation completeness");
  assert.match(packet.section, /request-level completeness.*not displayed|request_level_completeness=not-displayed/i, "partial-stop Worker CPU evidence must retain unavailable request-level completeness");
  assert.match(packet.section, /signals.*not reconciled.*satisfaction|signals-not-reconcilable-for-satisfaction/i, "partial-stop Worker CPU evidence must not reconcile the CPU signals into satisfaction");
  assert.match(packet.section, /no Workers Paid plan upgrade is authorized|workers_paid_upgrade_authorization=none/i, "partial-stop Worker CPU evidence must retain no Paid upgrade authorization");
  assert.match(packet.section, /does not establish deployment or activation|deploy[\/、]activation/i, "partial-stop Worker CPU evidence must not become deployment or activation proof");
  assertNoUnsupportedWorkerCpuClaims(packet.section);
  assertNoWorkerCpuPrivateIdentifiers(packet.section);
}

function assertNoUnsupportedProviderCostClaims(section) {
  assert.doesNotMatch(section, /\b\d+(?:\.\d+)?\s*%/, "partial-stop Provider Cost evidence must not retain a percentage inference");
  assert.doesNotMatch(section, /\b(?:remaining(?:[ -]capacity)?|(?:funded )?headroom)\s*(?:=|is|equals)\s*(?:[$€¥]\s*)?\d+(?:\.\d+)?(?:\s*(?:%|USD|JPY|EUR|GBP))?/i, "partial-stop Provider Cost evidence must not fabricate numeric remaining capacity or funded headroom");
  assert.doesNotMatch(section, /zero (?:usage|spend|tokens|requests|credit)\s+(?:is|means|proves|demonstrates|suggests|indicates|implies|shows)\s+(?!not\s)(?:(?:sufficient|positive|available)\s+)?funded headroom/i, "partial-stop Provider Cost evidence must not treat zero activity or credit as funded headroom");
  assert.doesNotMatch(section, /zero credit\s+(?:can\s+)?(?:satisfy|close)/i, "partial-stop Provider Cost evidence must not close the row from zero credit");
  assert.doesNotMatch(section, /(?:redirect|zero usage)\s+(?:proves|establishes|is)\s+(?!not\s)(?:paid entitlement|deployment|deployed proof|production proof)/i, "partial-stop Provider Cost evidence must not treat redirects or zero usage as entitlement or deployment proof");
}

function assertNoProviderCostPrivateIdentifiers(section) {
  assert.doesNotMatch(section, /https?:\/\//i, "partial-stop Provider Cost evidence must not retain a raw URL");
  assert.doesNotMatch(section, /\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/i, "partial-stop Provider Cost evidence must not retain a UUID private identifier");
  assert.doesNotMatch(section, /\b(?:org-[A-Za-z0-9_-]+|proj_[A-Za-z0-9_-]+)\b/, "partial-stop Provider Cost evidence must not retain a raw provider organization or project identifier");
  assert.doesNotMatch(section, /^(?:(?:organization|org|project|account)(?:_id|_name|_ref)?|private_identifier|raw_payload)\s*=\s*(?!no(?:\s|$)|none(?:\s|$)|not-(?:displayed|retained)(?:\s|$))[^\r\n]+$/gmi, "partial-stop Provider Cost evidence must not retain raw organization, project, account, private-identifier, or payload fields");
  assert.doesNotMatch(section, /\b(?:organization|org|project|account)(?:[ _-]+(?:name|id|ref))?\s*(?::|=|\bis\b)\s*[^\r\n]+/i, "partial-stop Provider Cost evidence must not retain bare or name/id/ref organization, project, or account prose labels");
}

function validateCompletedProviderCostPartialStopPacket(packet, freshnessReferenceTime = new Date()) {
  assert.deepEqual(packet.fields, canonicalCompletedProviderCostPartialStopPacketFields, "partial-stop Provider Cost evidence must retain the exact approved scope and sanitized incomplete result");
  assertAuthenticatedPrivateFreshness(packet.fields.observed_at, freshnessReferenceTime);
  assertObservationWithinApprovedWindow(packet.fields.observed_at, packet.fields.time_window);
  assert.match(packet.section, /closes no row|row_closure=none/i, "partial-stop Provider Cost evidence must close no row");
  assert.match(packet.section, /zero (?:usage|spend|tokens|requests|credit).*not funded headroom|funded_headroom_classification=zero-funded-headroom-at-observation/i, "partial-stop Provider Cost evidence must retain zero-funded-headroom classification");
  assert.match(packet.section, /broader.*(?:aggregation|display).*unknown|broader_aggregation_display_completeness=unknown/i, "partial-stop Provider Cost evidence must retain unknown broader aggregation/display completeness");
  assert.match(packet.section, /does not establish paid entitlement, deployment, or activation|paid entitlement, deployment, or production proof/i, "partial-stop Provider Cost evidence must not become entitlement, deployment, or activation proof");
  assert.match(packet.section, /No provider API call, write, payment, credit, budget, or settings action occurred|provider_api_call=no/i, "partial-stop Provider Cost evidence must retain the no-provider-operation boundary");
  assertNoUnsupportedProviderCostClaims(packet.section);
  assertNoProviderCostPrivateIdentifiers(packet.section);
  return packet;
}

function validateCompletedProviderFundingPostureDecision(packet, partialStopInputPacket) {
  assert.deepEqual(packet.fields, canonicalCompletedProviderFundingPostureDecisionFields, "completed Provider funding-posture decision must retain the exact approved owner judgment and incomplete row state");
  const decisionDayFreshnessReference = new Date(`${packet.fields.effective_date}T23:59:59+09:00`);
  const validatedPartialStopInputPacket = validateCompletedProviderCostPartialStopPacket(partialStopInputPacket, decisionDayFreshnessReference);
  const partialStopInputFingerprint = assertProviderFundingDecisionInputFingerprintBinding(packet.fields, validatedPartialStopInputPacket.fields);
  const exactApprovedInputReference = packet.fields.decision_input === canonicalProviderCostPartialStopInputReference;
  const exactInputFingerprintMatch = partialStopInputFingerprint === packet.fields.decision_input_fingerprint_sha256;
  assertProviderFundingPostureDecisionEffectiveDateAndScopeBoundary({
    effectiveDate: packet.fields.effective_date,
    exactScopeMatch: packet.fields.scope_alias === canonicalCompletedProviderFundingPostureDecisionFields.scope_alias
      && packet.fields.decision_scope === canonicalCompletedProviderFundingPostureDecisionFields.decision_scope,
    exactInputUnchanged: exactApprovedInputReference
      && exactInputFingerprintMatch
      && packet.fields.decision_input_record_status === "complete-for-provider-funding-posture-judgment"
      && packet.fields.input_fresh_at_decision === "yes",
    materialChanged: !exactInputFingerprintMatch,
    revalidationBoundary: packet.fields.material_change_revalidation
  });
  assert.equal(exactApprovedInputReference, true, "Provider funding-posture decision must retain its explicit approved partial-stop input reference");
  assert.equal(exactInputFingerprintMatch, true, "Provider funding-posture decision partial-stop fingerprint must match its explicit approved input reference");
  assert.equal(packet.fields.decision_owner, "kurodev", "Provider funding-posture decision requires the approved named owner");
  assert.equal(packet.fields.owner_decision, "keep-blocker-until-product-price-and-cost-model-ready", "Provider funding-posture decision must keep EVID-PROVIDER-COST blocked");
  assert.equal(packet.fields.row_closure, "none", "Provider funding-posture decision must not close EVID-PROVIDER-COST");
  assert.equal(packet.fields.payment_authorization, "none", "Provider funding-posture decision must not authorize payment");
  assert.equal(packet.fields.provider_api_authorization, "none", "Provider funding-posture decision must not authorize a provider API action");
  assert.equal(packet.fields.provider_architecture_change_authorization, "none", "Provider funding-posture decision must not authorize a provider architecture change");
  assert.equal(packet.fields.activation_status, "closed", "Provider funding-posture decision must preserve closed activation");
  assert.match(packet.section, /keeps EVID-PROVIDER-COST blocked|row_closure=none/i, "completed Provider funding-posture decision must preserve the Provider Cost blocker");
  assert.match(packet.section, /no payment, provider API, or provider architecture change is authorized|payment_authorization=none/i, "completed Provider funding-posture decision must retain no-operation authorization");
  assertNoUnsupportedProviderCostClaims(packet.section);
  assertNoProviderCostPrivateIdentifiers(packet.section);
}

function assertNoUnsupportedStripeCostClaims(section) {
  assert.doesNotMatch(section, /base payment[- ]processing fee(?:\s+(?:is|equals|=|costs))?\s*(?:JPY|USD|EUR|GBP|[$€¥]|\d)/i, "partial-stop Stripe Cost evidence must not retain an unsupported exact-Paid-flow base payment-processing fee");
  assert.doesNotMatch(section, /no fees available(?:[^\r\n]{0,80})\b(?:means|proves|establishes|implies|suggests|indicates|shows|equals?)\b(?:[^\r\n]{0,80})\bfuture (?:fees?|costs?)(?:\s+(?:remain|are|is|equal(?:s)?))?\s+zero/i, "partial-stop Stripe Cost evidence must not infer future zero fees from the default aggregate filter");
  assert.doesNotMatch(section, /(?:standard|custom) pricing\s+(?:applies|is|equals|=)/i, "partial-stop Stripe Cost evidence must not infer standard or custom pricing");
  assert.doesNotMatch(section, /\b(?:account|selected account|this account)\s+(?:uses|has|is on|runs on)\s+(?:standard|custom) pricing\b/i, "partial-stop Stripe Cost evidence must not infer account pricing posture");
  assert.doesNotMatch(section, /\bfuture (?:fees?|costs?)(?:[^\r\n]{0,80})\b(?:is|are|equals?|=|costs?|suggests|indicates|implies|shows|means)\b(?:[^\r\n]{0,40})(?:JPY|USD|EUR|GBP|[$€¥]|\d+(?:\.\d+)?\s*(?:%|percent)?)/i, "partial-stop Stripe Cost evidence must not retain a numeric or percentage future cost inference");
  assert.doesNotMatch(section, /\b(?:the\s+)?(?:fees?|costs?)\s+(?:add|adds)\s+up\s+to\s*(?:JPY|USD|EUR|GBP|[$€¥]|\d+(?:\.\d+)?\s*(?:%|percent)?)/i, "partial-stop Stripe Cost evidence must not retain an inferred fee or cost sum");
  assert.doesNotMatch(section, /\b(?:converted|converts?)\s+to\s*(?:JPY|USD|EUR|GBP|[$€¥]|\d+(?:\.\d+)?\s*(?:%|percent)?)/i, "partial-stop Stripe Cost evidence must not retain a converted cost or percentage inference");
  assert.doesNotMatch(section, /(?:total cost|fee total|sum|converted|rounded)\s*(?:is|equals|=|totals?)\s*(?:JPY|USD|EUR|GBP|[$€¥]|\d)/i, "partial-stop Stripe Cost evidence must not retain an inferred sum, conversion, or rounded cost");
  assert.doesNotMatch(section, /(?:remaining|margin)\s*(?:cost|capacity|headroom|amount)?\s*(?:is|equals|=)\s*(?:JPY|USD|EUR|GBP|[$€¥]|\d)/i, "partial-stop Stripe Cost evidence must not retain an inferred remaining amount or margin");
  assert.doesNotMatch(section, /(?:public(?:-source)?|fixture|deployment|deployed|production proof)\s+(?:proves|establishes|satisfies|promotes)/i, "partial-stop Stripe Cost evidence must not promote public, fixture, or deployment claims");
  assert.doesNotMatch(section, /\bexport(?:\s+(?:was|is|has been))?\s+performed\b|\bexported\b/i, "partial-stop Stripe Cost evidence must not retain an export action");
  assert.doesNotMatch(section, /\bdetails?\s+(?:(?:were|was|are|is|have been|has been)\s+)?(?:opened|accessed)\b/i, "partial-stop Stripe Cost evidence must not retain a details access action");
  assert.doesNotMatch(section, /\b(?:payment|refund)\s+(?:(?:was|were|is|are|has been|have been)\s+)?(?:made|performed)\b/i, "partial-stop Stripe Cost evidence must not retain a payment or refund action");
  assert.doesNotMatch(section, /\bsettings?\s+(?:(?:were|was|are|is|have been|has been)\s+)?(?:changed|updated)\b/i, "partial-stop Stripe Cost evidence must not retain a settings mutation");
  assert.doesNotMatch(section, /\bwrite\s+(?:(?:was|were|is|are|has been|have been)\s+)?performed\b/i, "partial-stop Stripe Cost evidence must not retain a write action");
  assert.doesNotMatch(section, /\b(?:customer|event|raw payload)\s+(?:(?:was|were|is|are|has been|have been)\s+)?(?:accessed|exported)\b/i, "partial-stop Stripe Cost evidence must not retain customer, event, or raw-payload access");
}

function assertNoStripeCostPrivateIdentifiers(section) {
  assert.doesNotMatch(section, /https?:\/\//i, "partial-stop Stripe Cost evidence must not retain a raw URL");
  assert.doesNotMatch(section, /\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/i, "partial-stop Stripe Cost evidence must not retain a UUID private identifier");
  assert.doesNotMatch(section, /\b(?:acct|cus|evt|price|prod)_[A-Za-z0-9_-]+\b/, "partial-stop Stripe Cost evidence must not retain a raw Stripe account, customer, event, Product, or Price identifier");
  assert.doesNotMatch(section, /\b(?:account|customer|event|product|price)(?:[ _-]+(?:name|id|ref))?\s*(?::|=|\bis\b)\s*[^\r\n]+/i, "partial-stop Stripe Cost evidence must not retain private account, customer, event, Product, or Price prose labels");
}

function validateCompletedStripeCostPartialStopPacket(packet) {
  assertCompletedStripeCostPartialStopSectionAnchor(packet.section);
  assert.deepEqual(packet.fields, canonicalCompletedStripeCostPartialStopPacketFields, "partial-stop Stripe Cost evidence must retain the exact approved scope and sanitized incomplete result");
  assertAuthenticatedPrivateFreshness(packet.fields.observed_at);
  assertObservationWithinApprovedWindow(packet.fields.observed_at, packet.fields.time_window);
  assert.match(packet.section, /closes no row|row_closure=none/i, "partial-stop Stripe Cost evidence must close no row");
  assert.match(packet.section, /base payment[- ]processing fee.*not displayed|base_payment_processing_fee_exact_paid_flow_display=not-displayed/i, "partial-stop Stripe Cost evidence must retain the exact Paid-flow base-fee incompleteness");
  assert.match(packet.section, /full cost[- ]model completeness.*unknown|full_cost_model_completeness=unknown/i, "partial-stop Stripe Cost evidence must retain unknown full cost-model completeness");
  assert.match(packet.section, /no fees available.*does not establish future zero fees|fees_aggregate_result=no-fees-available-within-default-filter/i, "partial-stop Stripe Cost evidence must not infer future zero fees from the aggregate filter");
  assert.match(packet.section, /export.*details.*customer.*event.*raw payload.*not accessed|export_details_client_or_event_raw_payload_access=no/i, "partial-stop Stripe Cost evidence must retain the no-export/details/customer/event/raw-payload boundary");
  assert.match(packet.section, /does not establish public, fixture, deployment, or production proof|production_proof=no/i, "partial-stop Stripe Cost evidence must not become public, fixture, deployment, or production proof");
  assertNoUnsupportedStripeCostClaims(packet.section);
  assertNoStripeCostPrivateIdentifiers(packet.section);
  return packet;
}

function validateCompletedStripeBaseFeePartialStopPacket(packet) {
  assertCompletedStripeBaseFeePartialStopSectionAnchor(packet.section);
  assert.deepEqual(packet.fields, canonicalCompletedStripeBaseFeePartialStopPacketFields, "post-read partial-stop Stripe Base-Fee evidence must retain the exact approved sanitized incomplete result");
  assertAuthenticatedPrivateFreshness(packet.fields.observed_at);
  assertObservationWithinApprovedWindow(packet.fields.observed_at, packet.fields.time_window);
  assert.match(packet.section, /no direct account-specific base payment-processing fee display or result was available|direct_account_specific_base_payment_processing_fee_display=not-displayed/i, "post-read partial-stop Stripe Base-Fee evidence must retain the missing direct result");
  assert.match(packet.section, /standard\/custom applicability remains unknown|standard_custom_applicability=unknown/i, "post-read partial-stop Stripe Base-Fee evidence must retain unknown applicability");
  assert.match(packet.section, /public pricing was not opened or substituted|public_pricing_opened_or_substituted=no/i, "post-read partial-stop Stripe Base-Fee evidence must not substitute public pricing");
  assert.match(packet.section, /closes no row|row_closure=none/i, "post-read partial-stop Stripe Base-Fee evidence must close no row");
  assertNoUnsupportedStripeCostClaims(packet.section);
  assertNoStripeCostPrivateIdentifiers(packet.section);
}

function assertNoSupportPosturePrivateOrUnauthorizedClaims(section) {
  assert.doesNotMatch(section, /https?:\/\//i, "completed Support posture decision must not retain a raw URL");
  assert.doesNotMatch(section, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, "completed Support posture decision must not retain a raw email address");
  assert.doesNotMatch(section, /\b(?:email|e-mail|support|mailing)\s+address\s*(?::|=|\bis\b)\s*[^\r\n]+/i, "completed Support posture decision must not retain an email or mailing address label");
  assert.doesNotMatch(section, /\baccount(?:[ _-]+(?:name|id|ref))?\s*(?::|=|\bis\b)\s*[^\r\n]+/i, "completed Support posture decision must not retain a raw account label");
  assert.doesNotMatch(section, /\b(?:SLA|service level agreement)\s*(?::|=|\bis\b)?\s*(?:guaranteed|committed|\d)/i, "completed Support posture decision must not establish an SLA guarantee");
  assert.doesNotMatch(section, /\b(?:guaranteed|committed)\s+(?:availability|response|restoration|response time|restoration time)\b/i, "completed Support posture decision must not establish an availability, response, or restoration guarantee");
  assert.doesNotMatch(section, /\b(?:channel|account)\s+(?:(?:was|were|is|are|has been|have been)\s+)?(?:created|changed|configured|modified)\b/i, "completed Support posture decision must not retain a channel or account mutation");
  assert.doesNotMatch(section, /\b(?:message|messaging)\s+(?:(?:was|were|is|are|has been|have been)\s+)?(?:sent|performed|authorized)\b/i, "completed Support posture decision must not retain a messaging action");
}

function validateCompletedSupportPostureDecision(packet) {
  assertCompletedSupportPostureDecisionSectionAnchor(packet.section);
  assert.deepEqual(packet.fields, canonicalCompletedSupportPostureDecisionFields, "completed Support posture decision must retain the exact approved documentation-only judgment and bounded closure");
  assertSupportPostureDecisionEffectiveDateAndScopeBoundary({
    effectiveDate: packet.fields.effective_date,
    exactScopeMatch: packet.fields.scope_alias === canonicalCompletedSupportPostureDecisionFields.scope_alias,
    materialChanged: false,
    revalidationBoundary: packet.fields.material_change_revalidation_boundary
  });
  assertOrdinaryRowJudgmentEligible({
    evidenceId: packet.fields.evidence_id,
    rowContractComplete: true,
    closureIds: [packet.fields.row_closure],
    closureResult: packet.fields.status,
    activationStatus: packet.fields.activation_status,
    unresolvedHardRequirements: 10
  });
  assert.equal(packet.fields.decision_owner, "kurodev", "completed Support posture decision requires the named decision owner");
  assert.equal(packet.fields.approver, "kurodev", "completed Support posture decision requires the named approver");
  assert.equal(packet.fields.support_owner, "kurodev", "completed Support posture decision requires the named support owner");
  assert.equal(packet.fields.owner_confirmation, "explicit-okay-to-full-immediately-preceding-packet-current-codex-task", "completed Support posture decision requires the explicit immediate full-packet owner confirmation");
  assert.equal(packet.fields.sla_status, "separate-unapproved", "completed Support posture decision must leave SLA separately unapproved");
  assert.equal(packet.fields.channel_creation_authorization, "none", "completed Support posture decision must not authorize channel creation");
  assert.equal(packet.fields.messaging_authorization, "none", "completed Support posture decision must not authorize messaging");
  assert.match(packet.section, /closes exactly EVID-SUPPORT and no other row|row_closure=EVID-SUPPORT/i, "completed Support posture decision must close exactly EVID-SUPPORT");
  assert.match(packet.section, /does not establish an SLA|sla_status=separate-unapproved/i, "completed Support posture decision must keep SLA separate and unapproved");
  assert.match(packet.section, /neither creates nor changes a channel or account, sends no message|channel_creation_authorization=none/i, "completed Support posture decision must preserve no channel creation or messaging action");
  assertNoSupportPosturePrivateOrUnauthorizedClaims(packet.section);
}

function validateCompletedSupabaseBackupPrerequisiteInputPacket(packet, freshnessReferenceTime = new Date()) {
  assert.deepEqual(packet.fields, canonicalCompletedSupabaseBackupPrerequisiteInputPacketFields, "completed Supabase Backup prerequisite input must retain the exact approved input scope and sanitized incomplete row result");
  assertAuthenticatedPrivateFreshness(packet.fields.observed_at, freshnessReferenceTime);
  assertObservationWithinApprovedWindow(packet.fields.observed_at, packet.fields.time_window);
  assert.match(packet.section, /closes no row|does not close EVID-SUPABASE-BACKUP|row.*not.*close/i, "completed Supabase Backup prerequisite input must not close EVID-SUPABASE-BACKUP");
  assert.match(packet.section, /explicit Free note.*controls.*general|free_note_precedence=explicit-Free-note-controls-not-general-wording/i, "Supabase Backup prerequisite input must give the explicit Free note precedence over general wording");
  assert.match(packet.section, /general.*not.*actual Free backup|actual_free_backup_classification=not-included-on-Free/i, "Supabase Backup prerequisite input must not promote general backup wording to an actual Free backup");
  assert.match(packet.section, /PITR.*not read|pitr_tab_read=no/i, "Supabase Backup prerequisite input must retain the no-PITR-read boundary");
  assert.match(packet.section, /restore.*download.*not.*action|restore_download_action=no/i, "Supabase Backup prerequisite input must retain the no-restore/download boundary");
  assert.match(packet.section, /upgrade.*not.*action|upgrade_action=no/i, "Supabase Backup prerequisite input must retain the no-upgrade-action boundary");
  assert.match(packet.section, /does not establish deployment or activation|production_proof=no/i, "Supabase Backup prerequisite input must not become deployment or activation proof");
  assertNoUnsafeSupabaseBackupFreeClaims(packet.section);
  assertNoSupabaseBackupPrivateOrIncidentalRetention(packet.section);
  assertNoSupabasePrivateIdentifiers(packet.section);
  return packet;
}

function validateCompletedSupabaseBackupPostureDecision(packet, prerequisiteInputPacket) {
  assert.deepEqual(packet.fields, canonicalCompletedSupabaseBackupPostureDecisionFields, "completed Supabase Backup-recovery posture decision must retain the exact approved owner judgment and bounded closure");
  const decisionDayFreshnessReference = new Date(`${packet.fields.effective_date}T23:59:59+09:00`);
  const validatedPrerequisiteInputPacket = validateCompletedSupabaseBackupPrerequisiteInputPacket(prerequisiteInputPacket, decisionDayFreshnessReference);
  const prerequisiteInputFingerprint = assertBackupDecisionInputFingerprintBinding(packet.fields, validatedPrerequisiteInputPacket.fields);
  const exactApprovedInputReference = packet.fields.decision_input === canonicalBackupPrerequisiteInputReference;
  const exactInputFingerprintMatch = prerequisiteInputFingerprint === packet.fields.decision_input_fingerprint_sha256;
  const backupAcquisitionDecision = canonicalAcquisitionDecisionRows.find((row) => row.id === "EVID-SUPABASE-BACKUP");
  assertBackupPostureDecisionEffectiveDateAndScopeBoundary({
    effectiveDate: packet.fields.effective_date,
    exactScopeMatch: packet.fields.scope_alias === canonicalCompletedSupabaseBackupPostureDecisionFields.scope_alias
      && packet.fields.decision_scope === canonicalCompletedSupabaseBackupPostureDecisionFields.decision_scope,
    exactInputUnchanged: exactApprovedInputReference
      && exactInputFingerprintMatch
      && packet.fields.decision_input_record_status === "complete-for-owner-judgment",
    materialChanged: !exactInputFingerprintMatch,
    revalidationBoundary: backupAcquisitionDecision?.freshnessRule
  });
  assert.equal(exactApprovedInputReference, true, "Backup posture decision must retain its explicit approved prerequisite input reference");
  assert.equal(exactInputFingerprintMatch, true, "Backup posture decision prerequisite input fingerprint must match its explicit approved input reference");
  assertBackupPostureDecisionEligible({
    inputStatus: packet.fields.decision_input_record_status,
    approvalStatus: packet.fields.approval,
    decisionOwner: packet.fields.decision_owner,
    ownerConfirmation: packet.fields.owner_confirmation,
    decisionOutcome: packet.fields.owner_decision,
    closureIds: [packet.fields.row_closure],
    residualRiskCarriedTo: packet.fields.accepted_no_scheduled_backup_recovery_risk.replace("carried-to-", ""),
    upgradeAuthorization: packet.fields.upgrade_authorization,
    finalRiskAcceptance: packet.fields.final_risk_acceptance !== "none",
    finalReleaseGo: packet.fields.final_release_go !== "none",
    activationStatus: packet.fields.activation_status
  });
  assert.match(packet.section, /closes exactly EVID-SUPABASE-BACKUP/, "completed Supabase Backup-recovery posture decision must close only Backup");
  assert.match(packet.section, /no actual upgrade is authorized|upgrade_authorization=none/i, "completed Supabase Backup-recovery posture decision must not authorize an actual upgrade");
  assert.match(packet.section, /no-scheduled-backup\/recovery risk.*EVID-RISK-ACCEPTANCE|accepted_no_scheduled_backup_recovery_risk=carried-to-EVID-RISK-ACCEPTANCE/i, "completed Supabase Backup-recovery posture decision must carry the residual risk forward");
  assertNoUnsafeSupabaseBackupFreeClaims(packet.section);
  assertNoSupabaseBackupPrivateOrIncidentalRetention(packet.section);
  assertNoSupabasePrivateIdentifiers(packet.section);
}

function validateCompletedLocalApprovalPacket(packet) {
  assert.deepEqual(packet.fields, canonicalCompletedLocalApprovalPacketFields, "completed local approval record must retain the exact approved local install scope and sanitized result");
  assert.match(packet.section, /dependency install だけを許可/, "completed local approval must authorize the dependency install only");
  assert.match(packet.section, /既存タスクのverification authority/, "post-install local checks must remain ordinary task verification rather than approval-scope expansion");
  assert.match(packet.section, /no raw install log retained in authority/, "completed local approval record must prohibit raw install-log retention");
  assert.match(packet.section, /does not authorize external\/private\/live\/deployed operation/, "completed local approval record must preserve external-operation closure");
}

function assertNextStripePaidFlowBaseFeeReadPreReadEligible({ approvalStatus, requiredFieldsComplete, exactTargetMatch, approvedWindowValid, operatorPresent, ownerPresent, privateExposure, scopeExpanded, unapprovedAccess, prohibitedBundleOrAction }) {
  assert.equal(approvalStatus, "approved", "next Stripe paid-flow base-fee read requires approved authorization before execution");
  assert.equal(requiredFieldsComplete, true, "next Stripe paid-flow base-fee read requires complete approved packet fields before execution");
  assert.equal(exactTargetMatch, true, "next Stripe paid-flow base-fee read requires an exact approved target");
  assert.equal(approvedWindowValid, true, "next Stripe paid-flow base-fee read requires a valid approved time window");
  assert.equal(operatorPresent, true, "next Stripe paid-flow base-fee read requires a named operator");
  assert.equal(ownerPresent, true, "next Stripe paid-flow base-fee read requires a named owner");
  assert.equal(privateExposure, false, "next Stripe paid-flow base-fee read must stop on private exposure");
  assert.equal(scopeExpanded, false, "next Stripe paid-flow base-fee read must stop on scope expansion");
  assert.equal(unapprovedAccess, false, "next Stripe paid-flow base-fee read must stop on unapproved access");
  assert.equal(prohibitedBundleOrAction, false, "next Stripe paid-flow base-fee read must stop on a prohibited bundle or action");
}

function assertNextStripePaidFlowBaseFeePostReadClosureEligible({ approvalStatus, freshness, exactTargetMatch, baseFeeDisplayed, standardCustomApplicabilityComplete, targetedResultComplete }) {
  assert.equal(approvalStatus, "approved", "post-read Stripe Cost closure requires approved evidence");
  assert.equal(freshness, "fresh", "post-read Stripe Cost closure requires fresh evidence");
  assert.equal(exactTargetMatch, true, "post-read Stripe Cost closure requires an exact target");
  assert.equal(baseFeeDisplayed, true, "post-read Stripe Cost partial-stop: base fee remains not displayed");
  assert.equal(standardCustomApplicabilityComplete, true, "post-read Stripe Cost partial-stop: standard/custom applicability or completeness remains unknown");
  assert.equal(targetedResultComplete, true, "post-read Stripe Cost partial-stop: targeted result is incomplete");
}

function validateNextApprovalPacket(packet) {
  for (const field of nextSlaPostureJudgmentRequiredCompletionFields) {
    assert.ok(packet.fields[field], `next SLA posture judgment packet requires ${field}`);
    assert.match(packet.fields[field], /^<[^>]+>$/, `next SLA posture judgment packet must remain not executable while ${field} is a required placeholder`);
  }
  assert.deepEqual(packet.fields, canonicalNextApprovalPacketFields, "next SLA posture judgment packet must retain exactly one release-owner request and required fields");
  assert.match(packet.section, /No remote operation is authorized by this checklist\./, "next SLA posture judgment packet must remain non-executable");
  assert.match(packet.section, /EVID-SLA only/, "next SLA posture judgment packet must isolate SLA from every other hard requirement");
  assert.match(packet.section, /no SLA claim is invented/i, "next SLA posture judgment packet must prohibit invented SLA claims");
  assert.match(packet.section, /Support reopening.*legal.*copy.*Product\/Price.*risk/i, "next SLA posture judgment packet must prohibit Support reopening and bundled decisions");
  assert.match(packet.section, /no command is authorized/, "next SLA posture judgment packet must remain non-executable");
}

const canonicalSourceRows = [
  { id: "SRC-WORKER-PRICING", url: "https://developers.cloudflare.com/workers/platform/pricing/", checked: sourceCheckedAt, evidenceClass: "public-source", productionProof: "no" },
  { id: "SRC-WORKER-LIMITS", url: "https://developers.cloudflare.com/workers/platform/limits/", checked: sourceCheckedAt, evidenceClass: "public-source", productionProof: "no" },
  { id: "SRC-SUPABASE-BILLING", url: "https://supabase.com/docs/guides/platform/billing-on-supabase", checked: sourceCheckedAt, evidenceClass: "public-source", productionProof: "no" },
  { id: "SRC-SUPABASE-STORAGE-BANDWIDTH", url: "https://supabase.com/docs/guides/storage/serving/bandwidth", checked: sourceCheckedAt, evidenceClass: "public-source", productionProof: "no" },
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
  { id: "NUM-SUPABASE-CACHED-EGRESS", observation: "Supabase Free: 5 GB cached bandwidth, separate from 5 GB uncached bandwidth", sourceId: "SRC-SUPABASE-STORAGE-BANDWIDTH", checked: sourceCheckedAt, evidenceClass: "public-source", productionProof: "no" },
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

function runNegativeHelperAssertions(evidenceRows, numericRows, documentedUnresolved, primaryApprovalUnitRows, acquisitionDecisionRows, decisionSequenceFields, completedLocalApprovalPacket, completedWorkerRequestPacket, completedSupabaseSizePacket, completedSupabasePausePartialStopPacket, completedSupabasePausePostureDecision, completedSupabaseEgressPartialStopPacket, completedSupabaseCachedEgressPacket, completedWorkerCpuPartialStopPacket, completedProviderCostPartialStopPacket, completedProviderFundingPostureDecision, completedStripeCostPartialStopPacket, completedStripeBaseFeePartialStopPacket, completedSupportPostureDecision, completedSupabaseBackupPrerequisiteInputPacket, completedSupabaseBackupPostureDecision, nextApprovalPacket) {
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
  const invalidSatisfiedRow = invalidSatisfied.find((row) => row.id === "EVID-WORKER-CPU");
  invalidSatisfiedRow.status = "satisfied";
  invalidSatisfiedRow.approval = "approved";
  invalidSatisfiedRow.target = "exact";
  invalidSatisfiedRow.freshness = "missing";
  assert.throws(() => validateEvidenceRows(invalidSatisfied), /satisfied evidence must have fresh or not-applicable freshness/);

  const revertedEgress = cloneRows(evidenceRows);
  revertedEgress.find((row) => row.id === "EVID-SUPABASE-EGRESS").status = "incomplete";
  assert.throws(() => validateEvidenceRows(revertedEgress), /EVID-SUPABASE-EGRESS/);

  const revertedPause = cloneRows(evidenceRows);
  revertedPause.find((row) => row.id === "EVID-SUPABASE-PAUSE").status = "incomplete";
  assert.throws(() => validateEvidenceRows(revertedPause), /EVID-SUPABASE-PAUSE/);

  for (const evidenceId of completedLocalRevalidationEvidenceIds) {
    const revertedLocalRow = cloneRows(evidenceRows);
    const row = revertedLocalRow.find((entry) => entry.id === evidenceId);
    row.evidenceClass = "blocked";
    row.freshness = "missing";
    row.status = "incomplete";
    assert.throws(() => validateEvidenceRows(revertedLocalRow), new RegExp(evidenceId));
    assert.throws(
      () => assertHistoricalReferenceCannotSupersedeCurrentLocalRow({
        evidenceId,
        historicalAuthority: "non-authoritative-reference-only",
        currentStatus: "satisfied",
        currentVerification: "historical-pr749-reference"
      }),
      /cannot supersede/
    );
  }

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

  const changedCachedEgressNumericValue = cloneRows(numericRows);
  changedCachedEgressNumericValue.find((row) => row.id === "NUM-SUPABASE-CACHED-EGRESS").observation = "Supabase Free: 6 GB cached bandwidth";
  assert.throws(() => validateNumericRows(changedCachedEgressNumericValue), /numeric claims must exactly match canonical/);

  const changedCachedEgressNumericSource = cloneRows(numericRows);
  changedCachedEgressNumericSource.find((row) => row.id === "NUM-SUPABASE-CACHED-EGRESS").sourceId = "SRC-SUPABASE-BILLING";
  assert.throws(() => validateNumericRows(changedCachedEgressNumericSource), /numeric claims must exactly match canonical/);

  const wrongPrimaryApprovalUnit = cloneRows(primaryApprovalUnitRows);
  wrongPrimaryApprovalUnit.find((row) => row.id === "EVID-WORKER-CPU").primaryApprovalUnit = "release-owner-judgment";
  assert.throws(() => validatePrimaryApprovalUnitRows(wrongPrimaryApprovalUnit), /primary approval-unit mapping/);

  assert.throws(
    () => validatePrimaryApprovalUnitRows(primaryApprovalUnitRows.slice(1)),
    /remaining external\/owner\/live\/deployed 16 rows/
  );

  const missingAcquisitionDimension = cloneRows(acquisitionDecisionRows);
  delete missingAcquisitionDimension.find((row) => row.id === "EVID-WORKER-CPU").evidenceRetention;
  assert.throws(() => validateAcquisitionDecisionRows(missingAcquisitionDimension), /EVID-WORKER-CPU acquisition\/decision contract requires evidenceRetention/);

  const bundledPacket = {
    ...nextApprovalPacket,
    fields: { ...nextApprovalPacket.fields, packet_item_count: "2" }
  };
  assert.throws(() => validateNextApprovalPacket(bundledPacket), /SLA posture judgment/);

  const executableStripeBaseFeePacket = {
    ...nextApprovalPacket,
    fields: { ...nextApprovalPacket.fields, external_action: "stripe-dashboard-read" }
  };
  assert.throws(() => validateNextApprovalPacket(executableStripeBaseFeePacket), /SLA posture judgment/);

  const bundledStripeBaseFeePacket = {
    ...nextApprovalPacket,
    fields: { ...nextApprovalPacket.fields, prohibited_bundle: "product-or-price-judgment" }
  };
  assert.throws(() => validateNextApprovalPacket(bundledStripeBaseFeePacket), /SLA posture judgment/);

  const closingStripeBaseFeePacket = {
    ...nextApprovalPacket,
    fields: { ...nextApprovalPacket.fields, row_closure: "satisfied" }
  };
  assert.throws(() => validateNextApprovalPacket(closingStripeBaseFeePacket), /SLA posture judgment/);

  const selectedProductPricePacket = {
    ...nextApprovalPacket,
    fields: { ...nextApprovalPacket.fields, product_price_status: "selected" }
  };
  assert.throws(() => validateNextApprovalPacket(selectedProductPricePacket), /SLA posture judgment/);

  const publicPricingSubstitutionPacket = {
    ...nextApprovalPacket,
    fields: { ...nextApprovalPacket.fields, public_pricing_substitution: "allowed" }
  };
  assert.throws(() => validateNextApprovalPacket(publicPricingSubstitutionPacket), /SLA posture judgment/);

  const incompletePacket = {
    ...nextApprovalPacket,
    fields: Object.fromEntries(Object.entries(nextApprovalPacket.fields).filter(([field]) => field !== "approval_id"))
  };
  assert.throws(() => validateNextApprovalPacket(incompletePacket), /requires approval_id/);

  const missingRequiredApprover = {
    ...nextApprovalPacket,
    fields: { ...nextApprovalPacket.fields, required_approver: "" }
  };
  assert.throws(() => validateNextApprovalPacket(missingRequiredApprover), /requires required_approver/);

  const currentBaseFeeGapPreReadState = {
    approvalStatus: "approved",
    requiredFieldsComplete: true,
    exactTargetMatch: true,
    approvedWindowValid: true,
    operatorPresent: true,
    ownerPresent: true,
    privateExposure: false,
    scopeExpanded: false,
    unapprovedAccess: false,
    prohibitedBundleOrAction: false,
    baseFeeDisplayed: false,
    standardCustomApplicabilityComplete: false,
    targetedResultComplete: false
  };
  assert.doesNotThrow(
    () => assertNextStripePaidFlowBaseFeeReadPreReadEligible(currentBaseFeeGapPreReadState),
    "current base-fee and applicability gaps must not self-stop an otherwise approved bounded read"
  );
  for (const [overrides, expectedError] of [
    [{ exactTargetMatch: false }, /exact approved target/],
    [{ approvalStatus: "unapproved" }, /approved authorization/],
    [{ approvedWindowValid: false }, /approved time window/],
    [{ operatorPresent: false }, /named operator/],
    [{ ownerPresent: false }, /named owner/],
    [{ privateExposure: true }, /private exposure/],
    [{ scopeExpanded: true }, /scope expansion/],
    [{ unapprovedAccess: true }, /unapproved access/],
    [{ prohibitedBundleOrAction: true }, /prohibited bundle or action/]
  ]) {
    assert.throws(
      () => assertNextStripePaidFlowBaseFeeReadPreReadEligible({ ...currentBaseFeeGapPreReadState, ...overrides }),
      expectedError
    );
  }
  for (const [overrides, expectedError] of [
    [{ baseFeeDisplayed: false }, /post-read Stripe Cost partial-stop/],
    [{ standardCustomApplicabilityComplete: false }, /post-read Stripe Cost partial-stop/],
    [{ targetedResultComplete: false }, /post-read Stripe Cost partial-stop/]
  ]) {
    assert.throws(
      () => assertNextStripePaidFlowBaseFeePostReadClosureEligible({
        approvalStatus: "approved",
        freshness: "fresh",
        exactTargetMatch: true,
        baseFeeDisplayed: true,
        standardCustomApplicabilityComplete: true,
        targetedResultComplete: true,
        ...overrides
      }),
      expectedError
    );
  }
  assert.doesNotThrow(
    () => assertNextStripePaidFlowBaseFeePostReadClosureEligible({
      approvalStatus: "approved",
      freshness: "fresh",
      exactTargetMatch: true,
      baseFeeDisplayed: true,
      standardCustomApplicabilityComplete: true,
      targetedResultComplete: true
    }),
    "only complete fresh exact approved displayed and applicable evidence may be closure-eligible"
  );

  for (const [overrides, expectedError] of [
    [{ status: "satisfied" }, /partial-stop Provider Cost evidence/],
    [{ row_closure: "EVID-PROVIDER-COST" }, /partial-stop Provider Cost evidence/],
    [{ credit_remaining_usd: "1.00" }, /partial-stop Provider Cost evidence/],
    [{ funded_headroom_classification: "positive-funded-headroom-at-observation" }, /partial-stop Provider Cost evidence/],
    [{ provider_api_call: "yes" }, /partial-stop Provider Cost evidence/],
    [{ production_proof: "yes" }, /partial-stop Provider Cost evidence/]
  ]) {
    assert.throws(
      () => validateCompletedProviderCostPartialStopPacket({
        ...completedProviderCostPartialStopPacket,
        fields: { ...completedProviderCostPartialStopPacket.fields, ...overrides }
      }),
      expectedError
    );
  }
  for (const unsafeProviderCostClaim of [
    "zero credit can satisfy EVID-PROVIDER-COST",
    "zero credit can close EVID-PROVIDER-COST",
    "zero usage is funded headroom",
    "zero usage suggests sufficient funded headroom",
    "zero requests indicates funded headroom",
    "remaining funded headroom=1.00",
    "funded headroom=50%",
    "remaining capacity is 100 USD",
    "funded headroom is 10 USD",
    "https://provider.example.com/dashboard/private",
    "organization_id=private-provider-identifier",
    "org-private-provider-identifier",
    "organization name: private-team",
    "project id: private-project",
    "account name: customer-prod",
    "account name is customer-prod",
    "Organization: private-team",
    "Project is private-project",
    "Account: customer-prod",
    "zero usage proves paid entitlement",
    "redirect proves deployment"
  ]) {
    assert.throws(
      () => validateCompletedProviderCostPartialStopPacket({
        ...completedProviderCostPartialStopPacket,
        section: `${completedProviderCostPartialStopPacket.section}\n${unsafeProviderCostClaim}`
      }),
      /partial-stop Provider Cost evidence must not/
    );
  }

  for (const [overrides, expectedError] of [
    [{ status: "satisfied" }, /partial-stop Stripe Cost evidence/],
    [{ row_closure: "EVID-STRIPE-COST" }, /partial-stop Stripe Cost evidence/],
    [{ base_payment_processing_fee_exact_paid_flow_display: "displayed" }, /partial-stop Stripe Cost evidence/],
    [{ full_cost_model_completeness: "complete" }, /partial-stop Stripe Cost evidence/],
    [{ payment_refund_settings_write_action: "yes" }, /partial-stop Stripe Cost evidence/],
    [{ production_proof: "yes" }, /partial-stop Stripe Cost evidence/]
  ]) {
    assert.throws(
      () => validateCompletedStripeCostPartialStopPacket({
        ...completedStripeCostPartialStopPacket,
        fields: { ...completedStripeCostPartialStopPacket.fields, ...overrides }
      }),
      expectedError
    );
  }
  for (const unsafeStripeCostClaim of [
    "base payment-processing fee is JPY 3.6",
    "base payment-processing fee costs JPY 3.6",
    "no fees available means future fees are zero",
    "no fees available shows future fees remain zero",
    "standard pricing applies",
    "account uses standard pricing",
    "account uses custom pricing",
    "fee total=JPY 10",
    "the fees add up to JPY 10",
    "converted to JPY 10",
    "future cost is JPY 10",
    "remaining margin=JPY 10",
    "https://dashboard.stripe.com/acct_private",
    "acct_private",
    "Account: private-stripe-account",
    "public-source proves paid cost readiness",
    "fixture establishes deployment",
    "export was performed",
    "exported",
    "details were opened",
    "details were accessed",
    "payment was made",
    "refund was performed",
    "settings were changed",
    "settings were updated",
    "write was performed",
    "customer was accessed",
    "event was exported",
    "raw payload was accessed"
  ]) {
    assert.throws(
      () => validateCompletedStripeCostPartialStopPacket({
        ...completedStripeCostPartialStopPacket,
        section: `${completedStripeCostPartialStopPacket.section}\n${unsafeStripeCostClaim}`
      }),
      /partial-stop Stripe Cost evidence/
    );
  }
  for (const appendedStripeCostProse of [
    "cosmetic operator note retained outside canonical packet fields",
    "combined fees are JPY10",
    "next month's cost is JPY 10",
    "pricing tier is standard",
    "base fee is JPY 3.6",
    "export completed",
    "payment processed",
    "settings modified",
    "customer data viewed"
  ]) {
    assert.throws(
      () => validateCompletedStripeCostPartialStopPacket({
        ...completedStripeCostPartialStopPacket,
        section: `${completedStripeCostPartialStopPacket.section}\n${appendedStripeCostProse}`
      }),
      /partial-stop Stripe Cost evidence/
    );
  }

  for (const [overrides, expectedError] of [
    [{ status: "satisfied" }, /post-read partial-stop Stripe Base-Fee evidence/],
    [{ row_closure: "EVID-STRIPE-COST" }, /post-read partial-stop Stripe Base-Fee evidence/],
    [{ direct_account_specific_base_payment_processing_fee_display: "displayed" }, /post-read partial-stop Stripe Base-Fee evidence/],
    [{ standard_custom_applicability: "standard" }, /post-read partial-stop Stripe Base-Fee evidence/],
    [{ targeted_result_completeness: "complete" }, /post-read partial-stop Stripe Base-Fee evidence/],
    [{ public_pricing_opened_or_substituted: "yes" }, /post-read partial-stop Stripe Base-Fee evidence/],
    [{ all_results_opened: "yes" }, /post-read partial-stop Stripe Base-Fee evidence/],
    [{ payment_refund_settings_write_provider_or_other_read_action: "yes" }, /post-read partial-stop Stripe Base-Fee evidence/],
    [{ production_proof: "yes" }, /post-read partial-stop Stripe Base-Fee evidence/]
  ]) {
    assert.throws(
      () => validateCompletedStripeBaseFeePartialStopPacket({
        ...completedStripeBaseFeePartialStopPacket,
        fields: { ...completedStripeBaseFeePartialStopPacket.fields, ...overrides }
      }),
      expectedError
    );
  }
  for (const unsafeStripeBaseFeeClaim of [
    "base payment-processing fee is JPY 3.6",
    "future cost is JPY 10",
    "the fees add up to JPY 10",
    "account uses standard pricing",
    "public pricing was substituted",
    "all results were opened",
    "payment was made",
    "https://dashboard.stripe.com/acct_private",
    "Account: private-stripe-account",
    "customer was accessed",
    "raw payload was accessed"
  ]) {
    assert.throws(
      () => validateCompletedStripeBaseFeePartialStopPacket({
        ...completedStripeBaseFeePartialStopPacket,
        section: `${completedStripeBaseFeePartialStopPacket.section}\n${unsafeStripeBaseFeeClaim}`
      }),
      /post-read partial-stop Stripe Base-Fee evidence/
    );
  }

  for (const [overrides, expectedError] of [
    [{ approval: "unapproved" }, /completed Support posture decision/],
    [{ status: "incomplete" }, /completed Support posture decision/],
    [{ row_closure: "EVID-SLA" }, /completed Support posture decision/],
    [{ channel_creation_authorization: "approved" }, /completed Support posture decision/],
    [{ messaging_authorization: "approved" }, /completed Support posture decision/],
    [{ sla_status: "approved" }, /completed Support posture decision/],
    [{ activation_status: "open" }, /completed Support posture decision/]
  ]) {
    assert.throws(
      () => validateCompletedSupportPostureDecision({
        ...completedSupportPostureDecision,
        fields: { ...completedSupportPostureDecision.fields, ...overrides }
      }),
      expectedError
    );
  }
  for (const unsafeSupportPostureContent of [
    "support@example.com",
    "support address: private inbox",
    "account: customer-prod",
    "https://support.example.com/private",
    "SLA guaranteed response within 4 hours",
    "guaranteed restoration time",
    "channel was created",
    "message was sent"
  ]) {
    assert.throws(
      () => validateCompletedSupportPostureDecision({
        ...completedSupportPostureDecision,
        section: `${completedSupportPostureDecision.section}\n${unsafeSupportPostureContent}`
      }),
      /completed Support posture decision/
    );
  }

  for (const [overrides, expectedError] of [
    [{ row_closure: "EVID-PROVIDER-COST" }, /completed Provider funding-posture decision/],
    [{ status: "satisfied" }, /completed Provider funding-posture decision/],
    [{ payment_authorization: "approved" }, /completed Provider funding-posture decision/],
    [{ provider_api_authorization: "approved" }, /completed Provider funding-posture decision/],
    [{ provider_architecture_change_authorization: "approved" }, /completed Provider funding-posture decision/],
    [{ owner_decision: "fund-exact-openai-account" }, /completed Provider funding-posture decision/]
  ]) {
    assert.throws(
      () => validateCompletedProviderFundingPostureDecision({
        ...completedProviderFundingPostureDecision,
        fields: { ...completedProviderFundingPostureDecision.fields, ...overrides }
      }, completedProviderCostPartialStopPacket),
      expectedError
    );
  }
  for (const privateProviderFundingDecisionContent of [
    "https://provider.example.com/dashboard/private",
    "Organization: private-team",
    "org-private-provider-identifier"
  ]) {
    assert.throws(
      () => validateCompletedProviderFundingPostureDecision({
        ...completedProviderFundingPostureDecision,
        section: `${completedProviderFundingPostureDecision.section}\n${privateProviderFundingDecisionContent}`
      }, completedProviderCostPartialStopPacket),
      /must not retain/
    );
  }

  for (const [overrides, expectedError] of [
    [{ status: "satisfied" }, /completed Supabase Backup prerequisite input/],
    [{ target_match: "no" }, /completed Supabase Backup prerequisite input/],
    [{ approval: "unapproved" }, /completed Supabase Backup prerequisite input/],
    [{ pitr_tab_read: "yes" }, /completed Supabase Backup prerequisite input/],
    [{ restore_download_action: "yes" }, /completed Supabase Backup prerequisite input/],
    [{ upgrade_action: "yes" }, /completed Supabase Backup prerequisite input/],
    [{ owner_decision: "accepted" }, /completed Supabase Backup prerequisite input/],
    [{ incidental_schema_table_field_content_retained: "yes" }, /completed Supabase Backup prerequisite input/]
  ]) {
    assert.throws(
      () => validateCompletedSupabaseBackupPrerequisiteInputPacket({
        ...completedSupabaseBackupPrerequisiteInputPacket,
        fields: { ...completedSupabaseBackupPrerequisiteInputPacket.fields, ...overrides }
      }),
      expectedError
    );
  }

  const systemDate = globalThis.Date;
  class MaterialScopeUnchangedEightDayLaterDate extends systemDate {
    constructor(...args) {
      return args.length === 0 ? new systemDate("2026-08-15T12:00:00+09:00") : new systemDate(...args);
    }

    static now() {
      return new systemDate("2026-08-15T12:00:00+09:00").getTime();
    }
  }
  globalThis.Date = MaterialScopeUnchangedEightDayLaterDate;
  try {
    assert.doesNotThrow(
      () => validateCompletedSupabaseBackupPostureDecision(completedSupabaseBackupPostureDecision, completedSupabaseBackupPrerequisiteInputPacket),
      "a current-Free Backup decision must remain valid eight days later when its scope and input are unchanged"
    );
  } finally {
    globalThis.Date = systemDate;
  }
  const backupDecisionBoundary = canonicalAcquisitionDecisionRows.find((row) => row.id === "EVID-SUPABASE-BACKUP")?.freshnessRule;
  assert.doesNotThrow(
    () => assertBackupPostureDecisionEffectiveDateAndScopeBoundary({
      effectiveDate: "2026-08-07",
      now: new systemDate("2026-08-15T12:00:00+09:00"),
      exactScopeMatch: true,
      exactInputUnchanged: true,
      materialChanged: false,
      revalidationBoundary: backupDecisionBoundary
    }),
    "a current-Free Backup decision remains valid eight days later when materialChanged=false and exact scope/input are unchanged"
  );
  for (const [boundary, expectedError] of [
    [{ effectiveDate: "2026-08-32", exactScopeMatch: true, exactInputUnchanged: true, materialChanged: false }, /invalid UTC date/],
    [{ effectiveDate: "2026-08-16", exactScopeMatch: true, exactInputUnchanged: true, materialChanged: false }, /future-dated/],
    [{ effectiveDate: "2026-08-07", exactScopeMatch: false, exactInputUnchanged: true, materialChanged: false }, /exact approved scope match/],
    [{ effectiveDate: "2026-08-07", exactScopeMatch: true, exactInputUnchanged: true, materialChanged: true }, /requires revalidation after a material scope or evidence change/]
  ]) {
    assert.throws(
      () => assertBackupPostureDecisionEffectiveDateAndScopeBoundary({
        ...boundary,
        now: new systemDate("2026-08-15T12:00:00+09:00"),
        revalidationBoundary: backupDecisionBoundary
      }),
      expectedError
    );
  }
  for (const unsafeFreeBackupClaim of [
    "Free includes daily scheduled backups",
    "Free projects are backed up daily",
    "Free can be restored at any time"
  ]) {
    assert.throws(
      () => validateCompletedSupabaseBackupPrerequisiteInputPacket({
        ...completedSupabaseBackupPrerequisiteInputPacket,
        section: `${completedSupabaseBackupPrerequisiteInputPacket.section}\n${unsafeFreeBackupClaim}`
      }),
      /must not retain an unsafe actual-Free backup or restore claim/
    );
  }

  for (const [overrides, expectedError] of [
    [{ owner_decision: "rejected" }, /completed Supabase Backup-recovery posture decision/],
    [{ approval: "unapproved" }, /completed Supabase Backup-recovery posture decision/],
    [{ decision_owner: "<required-owner>" }, /completed Supabase Backup-recovery posture decision/],
    [{ upgrade_authorization: "actual-upgrade-authorized" }, /completed Supabase Backup-recovery posture decision/],
    [{ row_closure: "EVID-RISK-ACCEPTANCE" }, /completed Supabase Backup-recovery posture decision/]
  ]) {
    assert.throws(
      () => validateCompletedSupabaseBackupPostureDecision({
        ...completedSupabaseBackupPostureDecision,
        fields: { ...completedSupabaseBackupPostureDecision.fields, ...overrides }
      }, completedSupabaseBackupPrerequisiteInputPacket),
      expectedError
    );
  }
  for (const privateOrIncidentalBackupContent of [
    "123e4567-e89b-12d3-a456-426614174000",
    "https://example.supabase.co/dashboard/project/exampleprivateprojectref",
    "/dashboard/org/exampleprivateorg",
    "project_ref=exampleprivateprojectref",
    "private.example.com",
    "table customer_events",
    "schema public",
    "field email",
    "column user_id"
  ]) {
    assert.throws(
      () => validateCompletedSupabaseBackupPrerequisiteInputPacket({
        ...completedSupabaseBackupPrerequisiteInputPacket,
        section: `${completedSupabaseBackupPrerequisiteInputPacket.section}\n${privateOrIncidentalBackupContent}`
      }),
      /must not retain (?:a UUID|a raw URL|a raw dashboard route|a raw project or organization reference|a bare hostname or domain|a named schema, table, field, or column identifier)/
    );
  }
  assert.doesNotThrow(
    () => validateCompletedSupabaseBackupPrerequisiteInputPacket({
      ...completedSupabaseBackupPrerequisiteInputPacket,
      section: `${completedSupabaseBackupPrerequisiteInputPacket.section}\nNo incidental schema/table/field content was retained.`
    }),
    "generic no-retention prose must remain allowed for the Backup input"
  );
  assert.throws(
    () => assertNoSupabasePrivateIdentifiers(`${completedSupabaseBackupPrerequisiteInputPacket.section}\nhttps://supabase.com/dashboard/project/exampleprivateprojectref`),
    /must not retain raw dashboard routes/
  );
  assert.throws(
    () => assertAuthenticatedPrivateFreshness(completedSupabaseBackupPrerequisiteInputPacket.fields.observed_at, new Date("2026-08-14T00:00:00+09:00")),
    /authenticated-private observation is stale after 7 days/
  );
  assert.throws(
    () => assertObservationWithinApprovedWindow("2026-08-06T23:49:09+09:00", completedSupabaseBackupPrerequisiteInputPacket.fields.time_window),
    /must not precede the approved time window/
  );

  const bundledCompletedLocalPacket = {
    ...completedLocalApprovalPacket,
    fields: { ...completedLocalApprovalPacket.fields, evidence_ids: `${completedLocalApprovalPacket.fields.evidence_ids},EVID-WORKER-CPU` }
  };
  assert.throws(() => validateCompletedLocalApprovalPacket(bundledCompletedLocalPacket), /completed local approval record/);

  const changedWorkerRequestTotal = {
    ...completedWorkerRequestPacket,
    fields: { ...completedWorkerRequestPacket.fields, worker_invocations_total: "77" }
  };
  assert.throws(() => validateCompletedWorkerRequestPacket(changedWorkerRequestTotal), /completed Worker Request evidence/);
  assert.throws(
    () => assertAuthenticatedPrivateFreshness(completedWorkerRequestPacket.fields.observed_at, new Date("2026-08-14T00:00:00+09:00")),
    /authenticated-private observation is stale after 7 days/
  );

  const changedSupabaseSizeValue = {
    ...completedSupabaseSizePacket,
    fields: { ...completedSupabaseSizePacket.fields, current_database_size_mb: "26.98" }
  };
  assert.throws(() => validateCompletedSupabaseSizePacket(changedSupabaseSizeValue), /completed Supabase Size evidence/);

  const targetMismatchedSupabaseSize = {
    ...completedSupabaseSizePacket,
    fields: { ...completedSupabaseSizePacket.fields, target_match: "no" }
  };
  assert.throws(() => validateCompletedSupabaseSizePacket(targetMismatchedSupabaseSize), /completed Supabase Size evidence/);

  const approvalDowngradedSupabaseSize = {
    ...completedSupabaseSizePacket,
    fields: { ...completedSupabaseSizePacket.fields, approval: "unapproved" }
  };
  assert.throws(() => validateCompletedSupabaseSizePacket(approvalDowngradedSupabaseSize), /completed Supabase Size evidence/);

  const productionPromotedSupabaseSize = {
    ...completedSupabaseSizePacket,
    fields: { ...completedSupabaseSizePacket.fields, production_proof: "yes" }
  };
  assert.throws(() => validateCompletedSupabaseSizePacket(productionPromotedSupabaseSize), /completed Supabase Size evidence/);
  assert.throws(
    () => assertNoSupabasePrivateIdentifiers(["https://supabase.com/dashboard", "project", "exampleprivateprojectref"].join("/")),
    /must not retain raw dashboard routes/
  );
  assert.throws(
    () => assertNoUnsupportedSupabaseSizeClaims(`${completedSupabaseSizePacket.section}\nremaining capacity 473.03 MB`),
    /must not retain inferred remaining capacity/
  );
  assert.throws(
    () => assertNoUnsupportedSupabaseSizeClaims(`${completedSupabaseSizePacket.section}\nheadroom 94.6%`),
    /must not retain an inferred percentage/
  );
  assert.throws(
    () => assertNoUnsupportedSupabaseSizeClaims(`${completedSupabaseSizePacket.section}\n0.5 GB = 500 MB`),
    /must not retain a unit-conversion inference/
  );
  assert.throws(
    () => assertNoUnsupportedSupabaseSizeClaims(`${completedSupabaseSizePacket.section}\nEgress 1 GB`),
    /must not retain another Usage metric value/
  );
  assert.throws(
    () => assertNoUnsupportedSupabaseSizeClaims(`${completedSupabaseSizePacket.section}\n473.03 MB remaining`),
    /must not retain inferred remaining capacity/
  );
  assert.throws(
    () => assertNoUnsupportedSupabaseSizeClaims(`${completedSupabaseSizePacket.section}\n0.5 GB converts to 500 MB`),
    /must not retain a unit-conversion inference/
  );
  assert.throws(
    () => assertNoUnsupportedSupabaseSizeClaims(`${completedSupabaseSizePacket.section}\n1 GB Egress`),
    /must not retain another Usage metric value/
  );

  assert.throws(
    () => assertAuthenticatedPrivateFreshness(completedSupabaseSizePacket.fields.observed_at, new Date("2026-08-14T00:00:00+09:00")),
    /authenticated-private observation is stale after 7 days/
  );

  const accidentalSatisfiedPausePacket = {
    ...completedSupabasePausePartialStopPacket,
    fields: { ...completedSupabasePausePartialStopPacket.fields, status: "satisfied" }
  };
  assert.throws(() => validateCompletedSupabasePausePartialStopPacket(accidentalSatisfiedPausePacket), /partial-stop Supabase Pause evidence/);

  const targetMismatchedPausePacket = {
    ...completedSupabasePausePartialStopPacket,
    fields: { ...completedSupabasePausePartialStopPacket.fields, target_match: "no" }
  };
  assert.throws(() => validateCompletedSupabasePausePartialStopPacket(targetMismatchedPausePacket), /partial-stop Supabase Pause evidence/);

  const approvalDowngradedPausePacket = {
    ...completedSupabasePausePartialStopPacket,
    fields: { ...completedSupabasePausePartialStopPacket.fields, approval: "unapproved" }
  };
  assert.throws(() => validateCompletedSupabasePausePartialStopPacket(approvalDowngradedPausePacket), /partial-stop Supabase Pause evidence/);

  const productionPromotedPausePacket = {
    ...completedSupabasePausePartialStopPacket,
    fields: { ...completedSupabasePausePartialStopPacket.fields, production_proof: "yes" }
  };
  assert.throws(() => validateCompletedSupabasePausePartialStopPacket(productionPromotedPausePacket), /partial-stop Supabase Pause evidence/);

  const clickedPauseButtonPacket = {
    ...completedSupabasePausePartialStopPacket,
    fields: { ...completedSupabasePausePartialStopPacket.fields, button_clicked: "yes" }
  };
  assert.throws(() => validateCompletedSupabasePausePartialStopPacket(clickedPauseButtonPacket), /partial-stop Supabase Pause evidence/);

  const inventedPauseHeadroomPacket = {
    ...completedSupabasePausePartialStopPacket,
    fields: { ...completedSupabasePausePartialStopPacket.fields, future_pause_headroom_classification: "positive-headroom-at-observation" }
  };
  assert.throws(() => validateCompletedSupabasePausePartialStopPacket(inventedPauseHeadroomPacket), /partial-stop Supabase Pause evidence/);
  assert.throws(
    () => assertNoUnsupportedSupabasePauseClaims(`${completedSupabasePausePartialStopPacket.section}\nfuture pause headroom 3 days`),
    /must not invent quantifiable future-pause headroom/
  );
  assert.throws(
    () => assertNoUnsupportedSupabasePauseClaims(`${completedSupabasePausePartialStopPacket.section}\nRestart locator proves current state active`),
    /must not promote a Restart locator/
  );
  assert.throws(
    () => assertNoSupabasePrivateIdentifiers(["https://supabase.com/dashboard", "project", "exampleprivateprojectref"].join("/")),
    /must not retain raw dashboard routes/
  );
  assert.throws(
    () => assertAuthenticatedPrivateFreshness(completedSupabasePausePartialStopPacket.fields.observed_at, new Date("2026-08-14T00:00:00+09:00")),
    /authenticated-private observation is stale after 7 days/
  );
  assert.throws(
    () => assertObservationWithinApprovedWindow("2026-08-06T22:20:48+09:00", completedSupabasePausePartialStopPacket.fields.time_window),
    /must not precede the approved time window/
  );
  assert.throws(
    () => assertObservationWithinApprovedWindow("2026-08-06T23:59:01+09:00", completedSupabasePausePartialStopPacket.fields.time_window),
    /must not follow the approved time window/
  );
  for (const [staleNarrative, expectedError] of [
    ["EVID-SUPABASE-PAUSE remains `incomplete`.", /stale current incomplete wording/],
    ["A later release-owner pause-posture judgment may decide the row.", /stale future judgment wording/],
    ["If that later judgment accepts the row, it may close it.", /stale conditional acceptance wording/]
  ]) {
    assert.throws(
      () => validateCompletedSupabasePausePartialStopPacket({
        ...completedSupabasePausePartialStopPacket,
        section: `${completedSupabasePausePartialStopPacket.section}\n${staleNarrative}`
      }),
      expectedError
    );
  }

  for (const [overrides, expectedError] of [
    [{ decision: "rejected" }, /completed Supabase Pause-posture decision/],
    [{ approval: "unapproved" }, /completed Supabase Pause-posture decision/],
    [{ decision_owner: "<named-release-owner-required>" }, /completed Supabase Pause-posture decision/],
    [{ owner_confirmation: "missing" }, /completed Supabase Pause-posture decision/],
    [{ decision_input_record_status: "incomplete" }, /completed Supabase Pause-posture decision/],
    [{ closure_limit: "at-most-EVID-SUPABASE-PAUSE-and-EVID-LEGAL" }, /completed Supabase Pause-posture decision/],
    [{ external_browser_action: "browser-action" }, /completed Supabase Pause-posture decision/],
    [{ production_proof: "yes" }, /completed Supabase Pause-posture decision/]
  ]) {
    assert.throws(
      () => validateCompletedSupabasePausePostureDecision({
        ...completedSupabasePausePostureDecision,
        fields: { ...completedSupabasePausePostureDecision.fields, ...overrides }
      }),
      expectedError
    );
  }

  const accidentalSatisfiedEgressPacket = {
    ...completedSupabaseEgressPartialStopPacket,
    fields: { ...completedSupabaseEgressPartialStopPacket.fields, status: "satisfied" }
  };
  assert.throws(() => validateCompletedSupabaseEgressPartialStopPacket(accidentalSatisfiedEgressPacket), /partial-stop Supabase Egress evidence/);

  const cachedReadEgressPacket = {
    ...completedSupabaseEgressPartialStopPacket,
    fields: { ...completedSupabaseEgressPartialStopPacket.fields, cached_egress_value_read: "yes" }
  };
  assert.throws(() => validateCompletedSupabaseEgressPartialStopPacket(cachedReadEgressPacket), /partial-stop Supabase Egress evidence/);

  const otherUsageValueEgressPacket = {
    ...completedSupabaseEgressPartialStopPacket,
    fields: { ...completedSupabaseEgressPartialStopPacket.fields, other_usage_metric_values_retained: "yes" }
  };
  assert.throws(() => validateCompletedSupabaseEgressPartialStopPacket(otherUsageValueEgressPacket), /partial-stop Supabase Egress evidence/);

  const targetMismatchedEgressPacket = {
    ...completedSupabaseEgressPartialStopPacket,
    fields: { ...completedSupabaseEgressPartialStopPacket.fields, target_match: "no" }
  };
  assert.throws(() => validateCompletedSupabaseEgressPartialStopPacket(targetMismatchedEgressPacket), /partial-stop Supabase Egress evidence/);

  const approvalDowngradedEgressPacket = {
    ...completedSupabaseEgressPartialStopPacket,
    fields: { ...completedSupabaseEgressPartialStopPacket.fields, approval: "unapproved" }
  };
  assert.throws(() => validateCompletedSupabaseEgressPartialStopPacket(approvalDowngradedEgressPacket), /partial-stop Supabase Egress evidence/);

  const productionPromotedEgressPacket = {
    ...completedSupabaseEgressPartialStopPacket,
    fields: { ...completedSupabaseEgressPartialStopPacket.fields, production_proof: "yes" }
  };
  assert.throws(() => validateCompletedSupabaseEgressPartialStopPacket(productionPromotedEgressPacket), /partial-stop Supabase Egress evidence/);
  assert.throws(
    () => assertNoUnsupportedSupabaseEgressClaims(`${completedSupabaseEgressPartialStopPacket.section}\nCached Egress 1 GB`),
    /must not retain Cached Egress/
  );
  assert.throws(
    () => assertNoUnsupportedSupabaseEgressClaims(`${completedSupabaseEgressPartialStopPacket.section}\nDaily breakdown 1 GB`),
    /must not retain Cached Egress/
  );
  assert.throws(
    () => assertNoUnsupportedSupabaseEgressClaims(`${completedSupabaseEgressPartialStopPacket.section}\nOther Usage 1 GB`),
    /must not retain Cached Egress/
  );
  assert.throws(
    () => assertNoSupabasePrivateIdentifiers(["https://supabase.com/dashboard", "project", "exampleprivateprojectref"].join("/")),
    /must not retain raw dashboard routes/
  );
  assert.throws(
    () => assertAuthenticatedPrivateFreshness(completedSupabaseEgressPartialStopPacket.fields.observed_at, new Date("2026-08-14T00:00:00+09:00")),
    /authenticated-private observation is stale after 7 days/
  );

  const changedCachedEgressValue = {
    ...completedSupabaseCachedEgressPacket,
    fields: { ...completedSupabaseCachedEgressPacket.fields, cached_egress_summary_display_gb: "1" }
  };
  assert.throws(() => validateCompletedSupabaseCachedEgressPacket(changedCachedEgressValue), /completed Supabase Cached Egress evidence/);

  const inventedCachedEgressMax = {
    ...completedSupabaseCachedEgressPacket,
    fields: { ...completedSupabaseCachedEgressPacket.fields, cached_egress_dashboard_max_display: "5" }
  };
  assert.throws(() => validateCompletedSupabaseCachedEgressPacket(inventedCachedEgressMax), /completed Supabase Cached Egress evidence/);

  const targetMismatchedCachedEgress = {
    ...completedSupabaseCachedEgressPacket,
    fields: { ...completedSupabaseCachedEgressPacket.fields, target_match: "no" }
  };
  assert.throws(() => validateCompletedSupabaseCachedEgressPacket(targetMismatchedCachedEgress), /completed Supabase Cached Egress evidence/);

  const approvalDowngradedCachedEgress = {
    ...completedSupabaseCachedEgressPacket,
    fields: { ...completedSupabaseCachedEgressPacket.fields, approval: "unapproved" }
  };
  assert.throws(() => validateCompletedSupabaseCachedEgressPacket(approvalDowngradedCachedEgress), /completed Supabase Cached Egress evidence/);

  const productionPromotedCachedEgress = {
    ...completedSupabaseCachedEgressPacket,
    fields: { ...completedSupabaseCachedEgressPacket.fields, production_proof: "yes" }
  };
  assert.throws(() => validateCompletedSupabaseCachedEgressPacket(productionPromotedCachedEgress), /completed Supabase Cached Egress evidence/);

  assert.throws(
    () => assertNoUnsupportedSupabaseCachedEgressClaims(`${completedSupabaseCachedEgressPacket.section}\ncross-unit total 10 GB`),
    /must not retain a cross-unit sum or total/
  );
  assert.throws(
    () => assertNoUnsupportedSupabaseCachedEgressClaims(`${completedSupabaseCachedEgressPacket.section}\nremaining capacity 5 GB`),
    /must not retain inferred remaining capacity/
  );
  assert.throws(
    () => assertNoUnsupportedSupabaseCachedEgressClaims(`${completedSupabaseCachedEgressPacket.section}\nheadroom 50%`),
    /must not retain an inferred percentage/
  );
  assert.throws(
    () => assertNoUnsupportedSupabaseCachedEgressClaims(`${completedSupabaseCachedEgressPacket.section}\n0 GB = 0 MB`),
    /must not retain a unit-conversion inference/
  );
  assert.throws(
    () => assertNoUnsupportedSupabaseCachedEgressClaims(`${completedSupabaseCachedEgressPacket.section}\nrounded cached Egress 0 GB`),
    /must not retain a rounding inference/
  );
  assert.throws(
    () => assertNoUnsupportedSupabaseCachedEgressClaims(`${completedSupabaseCachedEgressPacket.section}\nDaily breakdown 1 GB`),
    /must not retain daily-breakdown, incidental, or other Usage values/
  );
  assert.throws(
    () => assertNoSupabasePrivateIdentifiers(["https://supabase.com/dashboard", "project", "exampleprivateprojectref"].join("/")),
    /must not retain raw dashboard routes/
  );
  assert.throws(
    () => assertAuthenticatedPrivateFreshness(completedSupabaseCachedEgressPacket.fields.observed_at, new Date("2026-08-14T00:00:00+09:00")),
    /authenticated-private observation is stale after 7 days/
  );

  for (const [overrides, expectedError] of [
    [{ status: "satisfied" }, /partial-stop Worker CPU evidence/],
    [{ approval: "unapproved" }, /partial-stop Worker CPU evidence/],
    [{ target_match: "no" }, /partial-stop Worker CPU evidence/],
    [{ aggregation_complete: "yes" }, /partial-stop Worker CPU evidence/],
    [{ percentage_inference: "allowed" }, /partial-stop Worker CPU evidence/],
    [{ remaining_capacity_inference: "allowed" }, /partial-stop Worker CPU evidence/],
    [{ other_metrics_retained: "yes" }, /partial-stop Worker CPU evidence/]
  ]) {
    assert.throws(
      () => validateCompletedWorkerCpuPartialStopPacket({
        ...completedWorkerCpuPartialStopPacket,
        fields: { ...completedWorkerCpuPartialStopPacket.fields, ...overrides }
      }),
      expectedError
    );
  }
  assert.throws(
    () => assertNoUnsupportedWorkerCpuClaims(`${completedWorkerCpuPartialStopPacket.section}\nremaining CPU headroom 10 ms`),
    /must not retain inferred remaining capacity/
  );
  assert.throws(
    () => assertNoUnsupportedWorkerCpuClaims(`${completedWorkerCpuPartialStopPacket.section}\nCPU headroom 50%`),
    /must not retain a percentage inference/
  );
  assert.throws(
    () => assertNoWorkerCpuPrivateIdentifiers(`${completedWorkerCpuPartialStopPacket.section}\nhttps://example.workers.dev`),
    /must not retain a raw URL or subrequest host/
  );
  assert.throws(
    () => assertNoWorkerCpuPrivateIdentifiers(`${completedWorkerCpuPartialStopPacket.section}\n0123456789abcdef0123456789abcdef`),
    /must not retain a raw account or deployment identifier/
  );
  assert.throws(
    () => assertNoWorkerCpuPrivateIdentifiers(`${completedWorkerCpuPartialStopPacket.section}\n123e4567-e89b-12d3-a456-426614174000`),
    /must not retain a UUID deployment or version identifier/
  );
  assert.throws(
    () => assertNoWorkerCpuPrivateIdentifiers(`${completedWorkerCpuPartialStopPacket.section}\nabcdefghijklmnopqrst.supabase.co`),
    /must not retain a bare hostname or domain-like token/
  );
  assert.throws(
    () => assertNoWorkerCpuPrivateIdentifiers(`${completedWorkerCpuPartialStopPacket.section}\napi.private.example.com`),
    /must not retain a bare hostname or domain-like token/
  );
  assert.throws(
    () => assertNoWorkerCpuPrivateIdentifiers(`${completedWorkerCpuPartialStopPacket.section}\ncustom.internal.example`),
    /must not retain a bare hostname or domain-like token/
  );
  assert.throws(
    () => assertNoWorkerCpuPrivateIdentifiers(`${completedWorkerCpuPartialStopPacket.section}\ndeployment_id=deployment-private-alpha`),
    /must not retain an explicit deployment or version identifier field/
  );
  assert.throws(
    () => assertNoWorkerCpuPrivateIdentifiers(`${completedWorkerCpuPartialStopPacket.section}\nversion_id=release-2026-08-06-private`),
    /must not retain an explicit deployment or version identifier field/
  );
  assert.throws(
    () => assertNoUnsupportedWorkerCpuClaims(`${completedWorkerCpuPartialStopPacket.section}\nThe displayed zero means no request exceeded the limit`),
    /must not retain an unsafe no-exceedance or CPU-safe conclusion/
  );
  assert.throws(
    () => assertNoUnsupportedWorkerCpuClaims(`${completedWorkerCpuPartialStopPacket.section}\nNo requests have exceeded the CPU limit`),
    /must not retain an unsafe no-exceedance or CPU-safe conclusion/
  );
  assert.throws(
    () => assertNoUnsupportedWorkerCpuClaims(`${completedWorkerCpuPartialStopPacket.section}\nWorker CPU is within limit`),
    /must not retain an unsafe no-exceedance or CPU-safe conclusion/
  );
  assert.throws(
    () => assertNoUnsupportedWorkerCpuClaims(`${completedWorkerCpuPartialStopPacket.section}\nThe displayed zero suggests no requests have exceeded the CPU limit`),
    /must not retain an unsafe no-exceedance or CPU-safe conclusion/
  );
  assert.throws(
    () => assertNoUnsupportedWorkerCpuClaims(`${completedWorkerCpuPartialStopPacket.section}\nThe displayed zero is evidence that CPU is safe`),
    /must not retain an unsafe no-exceedance or CPU-safe conclusion/
  );
  assert.throws(
    () => assertNoUnsupportedWorkerCpuClaims(`${completedWorkerCpuPartialStopPacket.section}\nNo request exceeded the limit; the displayed zero confirms this`),
    /must not retain an unsafe no-exceedance or CPU-safe conclusion/
  );
  assert.throws(
    () => assertNoUnsupportedWorkerCpuClaims(`${completedWorkerCpuPartialStopPacket.section}\nCPU is safe because the displayed zero`),
    /must not retain an unsafe no-exceedance or CPU-safe conclusion/
  );
  assert.throws(
    () => assertNoUnsupportedWorkerCpuClaims(`${completedWorkerCpuPartialStopPacket.section}\nNo request exceeded the limit.\nThe displayed zero\nconfirms this.`),
    /must not retain an unsafe no-exceedance or CPU-safe conclusion/
  );
  assert.doesNotThrow(
    () => assertNoWorkerCpuPrivateIdentifiers(`${completedWorkerCpuPartialStopPacket.section}\ncreator-production-worker ordinary-hyphen-words`),
    "sanitized aliases and ordinary hyphen words must remain allowed"
  );
  assert.throws(
    () => assertAuthenticatedPrivateFreshness(completedWorkerCpuPartialStopPacket.fields.observed_at, new Date("2026-08-14T00:00:00+09:00")),
    /authenticated-private observation is stale after 7 days/
  );
  assert.throws(
    () => assertObservationWithinApprovedWindow("2026-08-06T23:20:50+09:00", completedWorkerCpuPartialStopPacket.fields.time_window),
    /must not precede the approved time window/
  );
  assert.throws(
    () => assertObservationWithinApprovedWindow("2026-08-07T00:00:00+09:00", completedWorkerCpuPartialStopPacket.fields.time_window),
    /must not follow the approved time window/
  );

  assert.doesNotThrow(
    () => assertOrdinaryRowJudgmentEligible({
      evidenceId: "EVID-PRODUCT-PRICE",
      rowContractComplete: true,
      closureIds: ["EVID-PRODUCT-PRICE"],
      closureResult: "satisfied",
      activationStatus: "closed",
      unresolvedHardRequirements: 11
    }),
    "ordinary row-level judgment must not wait for zero unresolved hard requirements"
  );
  assert.throws(
    () => assertOrdinaryRowJudgmentEligible({
      evidenceId: "EVID-PRODUCT-PRICE",
      rowContractComplete: true,
      closureIds: ["EVID-LEGAL"],
      closureResult: "satisfied",
      activationStatus: "closed",
      unresolvedHardRequirements: 11
    }),
    /exactly its own row/
  );
  assert.throws(
    () => assertOrdinaryRowJudgmentEligible({
      evidenceId: "EVID-PRODUCT-PRICE",
      rowContractComplete: true,
      closureIds: ["EVID-PRODUCT-PRICE", "EVID-LEGAL"],
      closureResult: "satisfied",
      activationStatus: "closed",
      unresolvedHardRequirements: 12
    }),
    /exactly its own row/
  );
  assert.throws(
    () => assertOrdinaryRowJudgmentEligible({
      evidenceId: "EVID-PRODUCT-PRICE",
      rowContractComplete: true,
      closureIds: ["EVID-PRODUCT-PRICE"],
      closureResult: "satisfied",
      activationStatus: "open",
      unresolvedHardRequirements: 12
    }),
    /preserve closed activation/
  );
  assert.throws(
    () => assertOrdinaryRowJudgmentEligible({
      evidenceId: "EVID-PRODUCT-PRICE",
      rowContractComplete: false,
      closureIds: ["EVID-PRODUCT-PRICE"],
      closureResult: "satisfied",
      activationStatus: "closed",
      unresolvedHardRequirements: 12
    }),
    /requires its complete row contract/
  );
  assert.throws(
    () => assertOrdinaryRowJudgmentEligible({
      evidenceId: "EVID-RISK-ACCEPTANCE",
      rowContractComplete: true,
      closureIds: ["EVID-RISK-ACCEPTANCE"],
      closureResult: "satisfied",
      activationStatus: "closed",
      unresolvedHardRequirements: 12
    }),
    /allows only its six designated evidence IDs/
  );
  assert.throws(
    () => assertRiskAcceptanceEligible({ otherHardRequirementsSatisfied: false, residualRisksEnumerated: true }),
    /forbidden before the other 9 currently unresolved/
  );
  assert.throws(
    () => assertFinalReleaseGoEligible({ unresolvedHardRequirements: 1, explicitGo: true }),
    /forbidden before zero unresolved/
  );
  assert.throws(
    () => assertRowClosurePreservesClosedActivation({ activationStatus: "open" }),
    /must not open activation/
  );
  assert.throws(
    () => assertPausePostureSupplementEligible({
      pauseObservationStatus: "incomplete",
      judgmentInputComplete: true,
      freshness: "fresh",
      closureIds: ["EVID-SUPABASE-PAUSE", "EVID-LEGAL"],
      residualAutoPauseRiskCarriedTo: "EVID-RISK-ACCEPTANCE",
      finalRiskAcceptance: false,
      finalReleaseGo: false,
      activationStatus: "closed"
    }),
    /at most one row/
  );
  assert.throws(
    () => assertPausePostureSupplementEligible({
      pauseObservationStatus: "incomplete",
      judgmentInputComplete: true,
      freshness: "fresh",
      closureIds: ["EVID-LEGAL"],
      residualAutoPauseRiskCarriedTo: "EVID-RISK-ACCEPTANCE",
      finalRiskAcceptance: false,
      finalReleaseGo: false,
      activationStatus: "closed"
    }),
    /only EVID-SUPABASE-PAUSE/
  );
  assert.throws(
    () => assertPausePostureSupplementEligible({
      pauseObservationStatus: "incomplete",
      judgmentInputComplete: true,
      freshness: "fresh",
      closureIds: ["EVID-SUPABASE-PAUSE"],
      residualAutoPauseRiskCarriedTo: "EVID-RISK-ACCEPTANCE",
      finalRiskAcceptance: true,
      finalReleaseGo: false,
      activationStatus: "closed"
    }),
    /not final risk acceptance/
  );
  assert.throws(
    () => assertPausePostureSupplementEligible({
      pauseObservationStatus: "incomplete",
      judgmentInputComplete: true,
      freshness: "fresh",
      closureIds: ["EVID-SUPABASE-PAUSE"],
      residualAutoPauseRiskCarriedTo: "EVID-RISK-ACCEPTANCE",
      finalRiskAcceptance: false,
      finalReleaseGo: true,
      activationStatus: "closed"
    }),
    /not final release GO/
  );
  assert.throws(
    () => assertPausePostureSupplementEligible({
      pauseObservationStatus: "incomplete",
      judgmentInputComplete: true,
      freshness: "fresh",
      closureIds: ["EVID-SUPABASE-PAUSE"],
      residualAutoPauseRiskCarriedTo: "EVID-RISK-ACCEPTANCE",
      finalRiskAcceptance: false,
      finalReleaseGo: false,
      activationStatus: "open"
    }),
    /preserve closed activation/
  );
  assert.throws(
    () => assertPausePostureSupplementEligible({
      pauseObservationStatus: "incomplete",
      judgmentInputComplete: false,
      freshness: "fresh",
      closureIds: ["EVID-SUPABASE-PAUSE"],
      residualAutoPauseRiskCarriedTo: "EVID-RISK-ACCEPTANCE",
      finalRiskAcceptance: false,
      finalReleaseGo: false,
      activationStatus: "closed"
    }),
    /requires complete factual posture inputs/
  );
  assert.throws(
    () => assertPausePostureSupplementEligible({
      pauseObservationStatus: "incomplete",
      judgmentInputComplete: true,
      freshness: "stale",
      closureIds: ["EVID-SUPABASE-PAUSE"],
      residualAutoPauseRiskCarriedTo: "EVID-RISK-ACCEPTANCE",
      finalRiskAcceptance: false,
      finalReleaseGo: false,
      activationStatus: "closed"
    }),
    /requires fresh factual posture inputs/
  );
  for (const [overrides, expectedError] of [
    [{ decisionContractComplete: false, approvalStatus: "approved", decisionOwner: "kurodev", decisionOutcome: "accepted" }, /requires a complete owner-decision contract/],
    [{ decisionContractComplete: true, approvalStatus: "unapproved", decisionOwner: "kurodev", decisionOutcome: "accepted" }, /requires explicit approval/],
    [{ decisionContractComplete: true, approvalStatus: "approved", decisionOwner: "<named-release-owner-required>", decisionOutcome: "accepted" }, /requires a named decision owner/],
    [{ decisionContractComplete: true, approvalStatus: "approved", decisionOwner: "kurodev", decisionOutcome: "rejected" }, /requires an accepted posture decision/]
  ]) {
    assert.throws(
      () => assertPausePostureSupplementEligible({
        pauseObservationStatus: "incomplete",
        judgmentInputComplete: true,
        freshness: "fresh",
        ...overrides,
        closureIds: ["EVID-SUPABASE-PAUSE"],
        residualAutoPauseRiskCarriedTo: "EVID-RISK-ACCEPTANCE",
        finalRiskAcceptance: false,
        finalReleaseGo: false,
        activationStatus: "closed"
      }),
      expectedError
    );
  }
  assert.deepEqual(decisionSequenceFields, canonicalDecisionSequenceFields, "decision sequence negative tests must use the canonical authority boundary");

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
  "continuation_pr=749",
  "continuation_pr_state=merged",
  "continuation_pr_final_head=742165b0fb67bb2e47f3d7f9db37e2ac774579ff",
  "continuation_merge_integration_tip=60d8b86f98bfe9465afdf9fa22e7052c0169b993",
  "continuation_deployment_status=not-confirmed",
  "source_checked_at=2026-08-06",
  "source_max_age_days=7",
  "source_freshness_timezone=Asia/Tokyo",
  "decision=no-go",
  "activation_status=closed",
  "release_owner_decision=missing",
  "final_release_owner_decision=missing",
  "production_proof_status=incomplete",
  "historical_pr749_worktree_dependencies=present-lockfile-installed",
  "historical_pr749_worktree_lint=passed",
  "historical_pr749_worktree_strict_typecheck=passed",
  "historical_pr749_worktree_next_build=passed",
  "historical_pr749_worktree_opennext_build=passed",
  "historical_pr749_worktree_worker_bundle_measurement=passed-wrangler-reported-gzip-2032.88-kib",
  "current_continuation_worktree_node_modules=present-lockfile-matched",
  "current_continuation_worktree_dependency_checks=completed-current-local",
  "current_continuation_worktree_dependency_install=approved-completed-local",
  "## Evidence Class Contract",
  "## Evidence Ledger",
  "## Primary Approval-Unit Classification",
  "## Acquisition And Decision Contract",
  "## Ordered Judgment And Final Release Decision Sequence",
  "## Public Official Source Ledger",
  "## Supported Numeric Claims",
  "## Completed Current Continuation Local Revalidation",
  "## Completed Authenticated-Private Supabase Size Evidence",
  "## Approved Partial-Stop Authenticated-Private Supabase Pause Evidence",
  "## Approved Partial-Stop Authenticated-Private Supabase Egress Evidence",
  "## Completed Authenticated-Private Supabase Cached Egress Evidence",
  "## Completed Authenticated-Private Supabase Backup Prerequisite Input",
  "## Approved Partial-Stop Authenticated-Private Provider Cost Evidence",
  "## Completed Release-Owner Provider Funding-Posture Decision",
  "## Approved Partial-Stop Authenticated-Private Stripe Cost Evidence",
  "## Approved Post-Read Partial-Stop Authenticated-Private Stripe Base-Fee Evidence",
  "## Completed Release-Owner Support Posture Decision",
  "## Completed Release-Owner Supabase Backup-Recovery Posture Decision",
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
assert.equal(readTextField(readiness, "current_unresolved_hard_requirement_count"), "10", "readiness status must retain the current 10-row unresolved count after accepted Support posture closure");
assert.match(checklist, /source_max_age_days=7/, "operator checklist must retain the source freshness policy");
assert.match(checklist, /source_freshness_timezone=Asia\/Tokyo/, "operator checklist must retain the source freshness timezone");
assert.match(checklist, /current_unresolved_hard_requirement_count=10/, "operator checklist must retain the current 10-row unresolved count after accepted Support posture closure");
assert.equal(readUniqueTextField(readiness, "continuation_pr"), "749", "continuation PR must retain the exact intake number");
assert.equal(readUniqueTextField(readiness, "continuation_pr_state"), "merged", "continuation PR must retain its merged containment state");
assert.equal(readUniqueTextField(readiness, "continuation_pr_final_head"), "742165b0fb67bb2e47f3d7f9db37e2ac774579ff", "continuation PR must retain its exact final head");
assert.equal(readUniqueTextField(readiness, "continuation_merge_integration_tip"), "60d8b86f98bfe9465afdf9fa22e7052c0169b993", "continuation PR must retain its exact integration tip");
assert.equal(readUniqueTextField(readiness, "continuation_deployment_status"), "not-confirmed", "continuation merge must not become deployment proof");

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
assert.equal(unresolvedHardRequirements.length, 10, "current NC-R1 must retain exactly 10 unresolved hard requirements after the accepted EVID-SUPPORT posture decision");
assert.equal(readTextField(readiness, "decision"), "no-go", "unresolved hard requirements must produce NO-GO");
assert.equal(readTextField(readiness, "conditional-go"), "forbidden-while-hard-requirement-unresolved");
const completedLocalRevalidationRows = parseCompletedLocalRevalidationRows(readiness);
validateCompletedLocalRevalidationRows(completedLocalRevalidationRows, evidenceRows);
const primaryApprovalUnitRows = parsePrimaryApprovalUnitRows(readiness);
validatePrimaryApprovalUnitRows(primaryApprovalUnitRows);
const acquisitionDecisionRows = parseAcquisitionDecisionRows(readiness);
validateAcquisitionDecisionRows(acquisitionDecisionRows);
assert.equal(readUniqueTextField(readiness, "original_external_owner_live_deployed_16"), "exact", "the original 16 external/owner/live/deployed rows must remain a distinct exact classification set");
assert.equal(readUniqueTextField(readiness, "original_external_owner_live_deployed_16_label"), "original-external-owner-live-deployed-16", "the original 16 classification set must retain its exact label");
assert.equal(readUniqueTextField(readiness, "original_external_owner_live_deployed_16_composition"), "7-authenticated-private-read,7-release-owner-judgment,1-live-operation,1-deploy-deployed-proof", "the original 16 classification composition must remain exact");
assert.equal(readUniqueTextField(readiness, "original_external_owner_live_deployed_16_public_closeable_hard_requirement_count"), "0", "public sources must close none of the original 16 rows");
assert.equal(readUniqueTextField(readiness, "current_unresolved_hard_requirements_count"), "10", "the current unresolved subset must contain exactly 10 rows");
assert.equal(readUniqueTextField(readiness, "current_unresolved_hard_requirements_composition"), "3-authenticated-private-read,5-release-owner-judgment,1-live-operation,1-deploy-deployed-proof", "the current unresolved 10 composition must remain exact");
const decisionSequenceFields = readDecisionSequenceFields(readiness);
validateDecisionSequenceFields(decisionSequenceFields);
assert.equal(readUniqueTextField(readiness, "final_release_owner_decision"), "missing", "final release owner decision must remain missing while NO-GO is current");
assertOrdinaryRowJudgmentEligible({
  evidenceId: "EVID-PRODUCT-PRICE",
  rowContractComplete: true,
  closureIds: ["EVID-PRODUCT-PRICE"],
  closureResult: "satisfied",
  activationStatus: "closed",
  unresolvedHardRequirements: 10
});
assertRiskAcceptanceEligible({ otherHardRequirementsSatisfied: true, residualRisksEnumerated: true });
assertFinalReleaseGoEligible({ unresolvedHardRequirements: 0, explicitGo: true });
assertRowClosurePreservesClosedActivation({ activationStatus: "closed" });
assertPausePostureSupplementEligible({
  pauseObservationStatus: "incomplete",
  judgmentInputComplete: true,
  freshness: "fresh",
  decisionContractComplete: true,
  approvalStatus: "approved",
  decisionOwner: "kurodev",
  decisionOutcome: "accepted",
  closureIds: ["EVID-SUPABASE-PAUSE"],
  residualAutoPauseRiskCarriedTo: "EVID-RISK-ACCEPTANCE",
  finalRiskAcceptance: false,
  finalReleaseGo: false,
  activationStatus: "closed"
});
assert.equal(readUniqueTextField(readiness, "public_read_only_closeable_hard_requirement_count"), "0", "public read-only sources must close no hard requirement");
assert.equal(readUniqueTextField(readiness, "public_read_only_closeable_hard_requirements"), "none", "public read-only closeable hard requirements must remain none");
assert.match(readiness, /public-source refresh supports Worker\/Supabase\/provider\/Stripe source rows only and closes none of the original external\/owner\/live\/deployed 16 hard rows/, "public-source support boundary must remain explicit");
const completedLocalApprovalPacket = parseCompletedLocalApprovalPacket(checklist);
validateCompletedLocalApprovalPacket(completedLocalApprovalPacket);
const completedWorkerRequestReadinessPacket = parseCompletedWorkerRequestPacket(readiness);
const completedWorkerRequestChecklistPacket = parseCompletedWorkerRequestPacket(checklist);
validateCompletedWorkerRequestPacket(completedWorkerRequestReadinessPacket);
validateCompletedWorkerRequestPacket(completedWorkerRequestChecklistPacket);
assert.deepEqual(
  completedWorkerRequestChecklistPacket.fields,
  completedWorkerRequestReadinessPacket.fields,
  "completed Worker Request authority and operator checklist records must remain identical"
);
const completedSupabaseSizeReadinessPacket = parseCompletedSupabaseSizePacket(readiness);
const completedSupabaseSizeChecklistPacket = parseCompletedSupabaseSizePacket(checklist);
validateCompletedSupabaseSizePacket(completedSupabaseSizeReadinessPacket);
validateCompletedSupabaseSizePacket(completedSupabaseSizeChecklistPacket);
assert.deepEqual(
  completedSupabaseSizeChecklistPacket.fields,
  completedSupabaseSizeReadinessPacket.fields,
  "completed Supabase Size authority and operator checklist records must remain identical"
);
const completedSupabasePausePartialStopReadinessPacket = parseCompletedSupabasePausePartialStopPacket(readiness);
const completedSupabasePausePartialStopChecklistPacket = parseCompletedSupabasePausePartialStopPacket(checklist);
validateCompletedSupabasePausePartialStopPacket(completedSupabasePausePartialStopReadinessPacket);
validateCompletedSupabasePausePartialStopPacket(completedSupabasePausePartialStopChecklistPacket);
assert.deepEqual(
  completedSupabasePausePartialStopChecklistPacket.fields,
  completedSupabasePausePartialStopReadinessPacket.fields,
  "partial-stop Supabase Pause authority and operator checklist records must remain identical"
);
const completedSupabasePausePostureDecisionReadiness = parseCompletedSupabasePausePostureDecision(readiness);
const completedSupabasePausePostureDecisionChecklist = parseCompletedSupabasePausePostureDecision(checklist);
validateCompletedSupabasePausePostureDecision(completedSupabasePausePostureDecisionReadiness);
validateCompletedSupabasePausePostureDecision(completedSupabasePausePostureDecisionChecklist);
assert.deepEqual(
  completedSupabasePausePostureDecisionChecklist.fields,
  completedSupabasePausePostureDecisionReadiness.fields,
  "completed Supabase Pause-posture decision authority and operator checklist records must remain identical"
);
const completedSupabaseEgressPartialStopReadinessPacket = parseCompletedSupabaseEgressPartialStopPacket(readiness);
const completedSupabaseEgressPartialStopChecklistPacket = parseCompletedSupabaseEgressPartialStopPacket(checklist);
validateCompletedSupabaseEgressPartialStopPacket(completedSupabaseEgressPartialStopReadinessPacket);
validateCompletedSupabaseEgressPartialStopPacket(completedSupabaseEgressPartialStopChecklistPacket);
assert.deepEqual(
  completedSupabaseEgressPartialStopChecklistPacket.fields,
  completedSupabaseEgressPartialStopReadinessPacket.fields,
  "partial-stop Supabase Egress authority and operator checklist records must remain identical"
);
const completedSupabaseCachedEgressReadinessPacket = parseCompletedSupabaseCachedEgressPacket(readiness);
const completedSupabaseCachedEgressChecklistPacket = parseCompletedSupabaseCachedEgressPacket(checklist);
validateCompletedSupabaseCachedEgressPacket(completedSupabaseCachedEgressReadinessPacket);
validateCompletedSupabaseCachedEgressPacket(completedSupabaseCachedEgressChecklistPacket);
assert.deepEqual(
  completedSupabaseCachedEgressChecklistPacket.fields,
  completedSupabaseCachedEgressReadinessPacket.fields,
  "completed Supabase Cached Egress authority and operator checklist records must remain identical"
);
const completedWorkerCpuPartialStopReadinessPacket = parseCompletedWorkerCpuPartialStopPacket(readiness);
const completedWorkerCpuPartialStopChecklistPacket = parseCompletedWorkerCpuPartialStopPacket(checklist);
validateCompletedWorkerCpuPartialStopPacket(completedWorkerCpuPartialStopReadinessPacket);
validateCompletedWorkerCpuPartialStopPacket(completedWorkerCpuPartialStopChecklistPacket);
assert.deepEqual(
  completedWorkerCpuPartialStopChecklistPacket.fields,
  completedWorkerCpuPartialStopReadinessPacket.fields,
  "partial-stop Worker CPU authority and operator checklist records must remain identical"
);
const completedProviderCostPartialStopReadinessPacket = parseCompletedProviderCostPartialStopPacket(readiness);
const completedProviderCostPartialStopChecklistPacket = parseCompletedProviderCostPartialStopPacket(checklist);
validateCompletedProviderCostPartialStopPacket(completedProviderCostPartialStopReadinessPacket);
validateCompletedProviderCostPartialStopPacket(completedProviderCostPartialStopChecklistPacket);
assert.deepEqual(
  completedProviderCostPartialStopChecklistPacket.fields,
  completedProviderCostPartialStopReadinessPacket.fields,
  "partial-stop Provider Cost authority and operator checklist records must remain identical"
);
const completedProviderFundingPostureDecisionReadinessPacket = parseCompletedProviderFundingPostureDecision(readiness);
const completedProviderFundingPostureDecisionChecklistPacket = parseCompletedProviderFundingPostureDecision(checklist);
validateCompletedProviderFundingPostureDecision(completedProviderFundingPostureDecisionReadinessPacket, completedProviderCostPartialStopReadinessPacket);
validateCompletedProviderFundingPostureDecision(completedProviderFundingPostureDecisionChecklistPacket, completedProviderCostPartialStopChecklistPacket);
assert.deepEqual(
  completedProviderFundingPostureDecisionChecklistPacket.fields,
  completedProviderFundingPostureDecisionReadinessPacket.fields,
  "completed Provider funding-posture decision authority and operator checklist records must remain identical"
);
const completedStripeCostPartialStopReadinessPacket = parseCompletedStripeCostPartialStopPacket(readiness);
const completedStripeCostPartialStopChecklistPacket = parseCompletedStripeCostPartialStopPacket(checklist);
validateCompletedStripeCostPartialStopPacket(completedStripeCostPartialStopReadinessPacket);
validateCompletedStripeCostPartialStopPacket(completedStripeCostPartialStopChecklistPacket);
assert.equal(
  normalizeCompletedStripeCostPartialStopSection(completedStripeCostPartialStopChecklistPacket.section),
  normalizeCompletedStripeCostPartialStopSection(completedStripeCostPartialStopReadinessPacket.section),
  "partial-stop Stripe Cost readiness and operator checklist sections must remain byte-equivalent after CRLF normalization and trim"
);
assert.equal(
  completedStripeCostPartialStopSectionFingerprint(completedStripeCostPartialStopReadinessPacket.section),
  canonicalCompletedStripeCostPartialStopSectionSha256,
  "partial-stop Stripe Cost readiness section must retain the exact owner-approved fingerprint"
);
assert.equal(
  completedStripeCostPartialStopSectionFingerprint(completedStripeCostPartialStopChecklistPacket.section),
  canonicalCompletedStripeCostPartialStopSectionSha256,
  "partial-stop Stripe Cost operator checklist section must retain the exact owner-approved fingerprint"
);
const completedStripeBaseFeePartialStopReadinessPacket = parseCompletedStripeBaseFeePartialStopPacket(readiness);
const completedStripeBaseFeePartialStopChecklistPacket = parseCompletedStripeBaseFeePartialStopPacket(checklist);
validateCompletedStripeBaseFeePartialStopPacket(completedStripeBaseFeePartialStopReadinessPacket);
validateCompletedStripeBaseFeePartialStopPacket(completedStripeBaseFeePartialStopChecklistPacket);
assert.equal(
  normalizeCompletedStripeCostPartialStopSection(completedStripeBaseFeePartialStopChecklistPacket.section),
  normalizeCompletedStripeCostPartialStopSection(completedStripeBaseFeePartialStopReadinessPacket.section),
  "post-read partial-stop Stripe Base-Fee readiness and operator checklist sections must remain byte-equivalent after CRLF normalization and trim"
);
assert.equal(completedStripeCostPartialStopSectionFingerprint(completedStripeBaseFeePartialStopReadinessPacket.section), canonicalCompletedStripeBaseFeePartialStopSectionSha256, "post-read partial-stop Stripe Base-Fee readiness section must retain the exact fingerprint");
assert.equal(completedStripeCostPartialStopSectionFingerprint(completedStripeBaseFeePartialStopChecklistPacket.section), canonicalCompletedStripeBaseFeePartialStopSectionSha256, "post-read partial-stop Stripe Base-Fee operator checklist section must retain the exact fingerprint");
const completedSupportPostureDecisionReadinessPacket = parseCompletedSupportPostureDecision(readiness);
const completedSupportPostureDecisionChecklistPacket = parseCompletedSupportPostureDecision(checklist);
validateCompletedSupportPostureDecision(completedSupportPostureDecisionReadinessPacket);
validateCompletedSupportPostureDecision(completedSupportPostureDecisionChecklistPacket);
assert.equal(
  normalizeCompletedSupportPostureDecisionSection(completedSupportPostureDecisionChecklistPacket.section),
  normalizeCompletedSupportPostureDecisionSection(completedSupportPostureDecisionReadinessPacket.section),
  "completed Support posture decision readiness and operator checklist sections must remain byte-equivalent after CRLF normalization and trim"
);
assert.equal(completedSupportPostureDecisionSectionFingerprint(completedSupportPostureDecisionReadinessPacket.section), canonicalCompletedSupportPostureDecisionSectionSha256, "completed Support posture decision readiness section must retain the exact owner-approved fingerprint");
assert.equal(completedSupportPostureDecisionSectionFingerprint(completedSupportPostureDecisionChecklistPacket.section), canonicalCompletedSupportPostureDecisionSectionSha256, "completed Support posture decision operator checklist section must retain the exact owner-approved fingerprint");
assert.deepEqual(
  completedSupportPostureDecisionChecklistPacket.fields,
  completedSupportPostureDecisionReadinessPacket.fields,
  "completed Support posture decision authority and operator checklist records must remain identical"
);
assert.deepEqual(
  completedStripeCostPartialStopChecklistPacket.fields,
  completedStripeCostPartialStopReadinessPacket.fields,
  "partial-stop Stripe Cost authority and operator checklist records must remain identical"
);
const materiallyChangedProviderCostPartialStopInput = {
  ...completedProviderCostPartialStopReadinessPacket,
  fields: {
    ...completedProviderCostPartialStopReadinessPacket.fields,
    funded_headroom_classification: "zero-funded-headroom-material-change"
  }
};
assert.throws(
  () => validateCompletedProviderFundingPostureDecision(completedProviderFundingPostureDecisionReadinessPacket, materiallyChangedProviderCostPartialStopInput),
  /partial-stop Provider Cost evidence/
);
assert.throws(
  () => assertProviderFundingDecisionInputFingerprintBinding(
    completedProviderFundingPostureDecisionReadinessPacket.fields,
    materiallyChangedProviderCostPartialStopInput.fields
  ),
  /owner-approved decision record/,
  "a material Provider Cost partial-stop rebaseline must invalidate the fingerprint retained in the owner-approved decision record"
);
assert.doesNotThrow(
  () => validateCompletedProviderFundingPostureDecision(
    completedProviderFundingPostureDecisionReadinessPacket,
    { ...completedProviderCostPartialStopReadinessPacket, section: `${completedProviderCostPartialStopReadinessPacket.section}\ncosmetic operator note retained outside canonical packet fields` }
  ),
  "cosmetic Provider Cost partial-stop prose outside canonical packet fields must not invalidate the funding-posture decision"
);
const providerFundingDecisionSystemDate = globalThis.Date;
class ProviderFundingDecisionMaterialScopeUnchangedEightDayLaterDate extends providerFundingDecisionSystemDate {
  constructor(...args) {
    return args.length === 0 ? new providerFundingDecisionSystemDate("2026-08-15T12:00:00+09:00") : new providerFundingDecisionSystemDate(...args);
  }

  static now() {
    return new providerFundingDecisionSystemDate("2026-08-15T12:00:00+09:00").getTime();
  }
}
globalThis.Date = ProviderFundingDecisionMaterialScopeUnchangedEightDayLaterDate;
try {
  assert.doesNotThrow(
    () => validateCompletedProviderFundingPostureDecision(completedProviderFundingPostureDecisionReadinessPacket, completedProviderCostPartialStopReadinessPacket),
    "a Provider funding-posture decision remains valid eight days later when its scope and partial-stop input are unchanged"
  );
} finally {
  globalThis.Date = providerFundingDecisionSystemDate;
}
assert.doesNotThrow(
  () => assertProviderFundingPostureDecisionEffectiveDateAndScopeBoundary({
    effectiveDate: "2026-08-07",
    now: new providerFundingDecisionSystemDate("2026-08-15T12:00:00+09:00"),
    exactScopeMatch: true,
    exactInputUnchanged: true,
    materialChanged: false,
    revalidationBoundary: humanDecisionFreshnessRule
  }),
  "a Provider funding-posture decision remains valid without an arbitrary maximum age when the effective date, scope, and partial-stop input are unchanged"
);
for (const [boundary, revalidationBoundary, expectedError] of [
  [{ effectiveDate: "2026-08-32", exactScopeMatch: true, exactInputUnchanged: true, materialChanged: false }, humanDecisionFreshnessRule, /invalid UTC date/],
  [{ effectiveDate: "2026-08-16", exactScopeMatch: true, exactInputUnchanged: true, materialChanged: false }, humanDecisionFreshnessRule, /future-dated/],
  [{ effectiveDate: "2026-08-07", exactScopeMatch: false, exactInputUnchanged: true, materialChanged: false }, humanDecisionFreshnessRule, /exact approved scope match/],
  [{ effectiveDate: "2026-08-07", exactScopeMatch: true, exactInputUnchanged: false, materialChanged: false }, humanDecisionFreshnessRule, /exact approved partial-stop input/],
  [{ effectiveDate: "2026-08-07", exactScopeMatch: true, exactInputUnchanged: true, materialChanged: true }, humanDecisionFreshnessRule, /requires revalidation after a material scope or input change/],
  [{ effectiveDate: "2026-08-07", exactScopeMatch: true, exactInputUnchanged: true, materialChanged: false }, "within-7-days-of-final-release-decision", /material-change revalidation boundary/]
]) {
  assert.throws(
    () => assertProviderFundingPostureDecisionEffectiveDateAndScopeBoundary({
      ...boundary,
      now: new providerFundingDecisionSystemDate("2026-08-15T12:00:00+09:00"),
      revalidationBoundary
    }),
    expectedError
  );
}
const completedSupabaseBackupPrerequisiteInputReadinessPacket = parseCompletedSupabaseBackupPrerequisiteInputPacket(readiness);
const completedSupabaseBackupPrerequisiteInputChecklistPacket = parseCompletedSupabaseBackupPrerequisiteInputPacket(checklist);
validateCompletedSupabaseBackupPrerequisiteInputPacket(completedSupabaseBackupPrerequisiteInputReadinessPacket);
validateCompletedSupabaseBackupPrerequisiteInputPacket(completedSupabaseBackupPrerequisiteInputChecklistPacket);
assert.deepEqual(
  completedSupabaseBackupPrerequisiteInputChecklistPacket.fields,
  completedSupabaseBackupPrerequisiteInputReadinessPacket.fields,
  "completed Supabase Backup prerequisite input authority and operator checklist records must remain identical"
);
const completedSupabaseBackupPostureDecisionReadinessPacket = parseCompletedSupabaseBackupPostureDecision(readiness);
const completedSupabaseBackupPostureDecisionChecklistPacket = parseCompletedSupabaseBackupPostureDecision(checklist);
validateCompletedSupabaseBackupPostureDecision(completedSupabaseBackupPostureDecisionReadinessPacket, completedSupabaseBackupPrerequisiteInputReadinessPacket);
validateCompletedSupabaseBackupPostureDecision(completedSupabaseBackupPostureDecisionChecklistPacket, completedSupabaseBackupPrerequisiteInputChecklistPacket);
assert.deepEqual(
  completedSupabaseBackupPostureDecisionChecklistPacket.fields,
  completedSupabaseBackupPostureDecisionReadinessPacket.fields,
  "completed Supabase Backup posture-decision authority and operator checklist records must remain identical"
);
const materiallyChangedBackupPrerequisiteInput = {
  ...completedSupabaseBackupPrerequisiteInputReadinessPacket,
  fields: {
    ...completedSupabaseBackupPrerequisiteInputReadinessPacket.fields,
    actual_free_backup_classification: "not-included-on-Free-material-change"
  }
};
assert.throws(
  () => validateCompletedSupabaseBackupPostureDecision(completedSupabaseBackupPostureDecisionReadinessPacket, materiallyChangedBackupPrerequisiteInput),
  /completed Supabase Backup prerequisite input/
);
assert.throws(
  () => assertBackupDecisionInputFingerprintBinding(
    completedSupabaseBackupPostureDecisionReadinessPacket.fields,
    materiallyChangedBackupPrerequisiteInput.fields
  ),
  /owner-approved decision record/,
  "a material prerequisite rebaseline must invalidate the fingerprint retained in the owner-approved decision record"
);
assert.doesNotThrow(
  () => validateCompletedSupabaseBackupPostureDecision(
    completedSupabaseBackupPostureDecisionReadinessPacket,
    { ...completedSupabaseBackupPrerequisiteInputReadinessPacket, section: `${completedSupabaseBackupPrerequisiteInputReadinessPacket.section}\ncosmetic operator note retained outside canonical packet fields` }
  ),
  "cosmetic prerequisite prose outside canonical packet fields must not invalidate the Backup decision"
);
assert.match(
  checklist,
  /EVID-WORKER-CPU.*P50=223ms.*P90=295ms.*P99=317ms.*P999=317ms.*aggregation complete.*unknown.*Workers Paid.*許可しない/i,
  "operator checklist must retain the exact partial-stop Worker CPU evidence and no-upgrade boundary"
);
const nextApprovalPacket = parseNextApprovalPacket(checklist);
validateNextApprovalPacket(nextApprovalPacket);
assert.match(nextApprovalPacket.section, /EVID-SLA only/, "next packet must be limited to the independent SLA posture judgment");
assert.match(nextApprovalPacket.section, /No SLA claim is invented/i, "next packet must not invent SLA claims");
assert.match(nextApprovalPacket.section, /Support reopening.*legal.*copy.*Product\/Price.*risk/i, "next packet must prohibit Support reopening and bundled decisions");

const ncQ1Fixture = evidenceRows.find((row) => row.id === "EVID-NC-Q1-FIXTURE");
const ncQ1Local = evidenceRows.find((row) => row.id === "EVID-NC-Q1-LOCAL");
const workerLimitAlignment = evidenceRows.find((row) => row.id === "EVID-WORKER-SIZE-LIMIT-ALIGNMENT");
assert.equal(ncQ1Fixture?.evidenceClass, "fixture");
assert.equal(ncQ1Fixture?.productionProof, "no");
assert.equal(ncQ1Local?.evidenceClass, "local");
assert.equal(ncQ1Local?.productionProof, "no");
assert.deepEqual(workerLimitAlignment, canonicalEvidenceById.get("EVID-WORKER-SIZE-LIMIT-ALIGNMENT"), "Worker size-limit alignment must retain the exact local internal-ceiling acceptance evidence");
assert.match(readiness, /Worker size is separately satisfied as local artifact acceptance only/, "Worker size must not be described as a remaining unresolved input");
assert.doesNotMatch(readiness, /remaining required measurements are Worker size/, "satisfied Worker size must not reappear in the remaining unresolved measurements");
assert.match(readiness, /worker_bundle_internal_acceptance_ceiling_bytes=3000000/);
assert.match(readiness, /official public wording `3 MB after compression`/);
assert.match(readiness, /provider binary\/decimal semantics を主張せず/);
assert.doesNotMatch(`${readiness}\n${checklist}`, /\b3MiB\b/);
const canonicalLocalClassFields = {
  local_class_scope: "explicitly-named-exact-local-checkout-snapshot-or-artifact-target",
  local_class_retention: "exact-target-applicable-artifact-hashes-source-and-freshness-remain-valid",
  local_class_current_continuation_execution_claim: "allowed-only-for-explicitly-bound-current-local-target",
  local_class_invalidation: "target-artifact-hash-source-or-freshness-drift",
  local_class_non_claims: "not-live-deployed-production-or-account-headroom-proof"
};
for (const [field, expected] of Object.entries(canonicalLocalClassFields)) {
  assert.equal(readUniqueTextField(readiness, field), expected, `${field} must retain the exact local evidence boundary`);
}
assert.match(readiness, /^\| `local` \| explicitly named exact local checkout\/snapshot\/artifact target/m, "local evidence must be scoped to an explicit exact target");
assert.doesNotMatch(readiness, /^\| `local` \| この checkout/m, "local evidence must not be limited to this continuation checkout");
assert.match(readiness, /explicitly bound current local target についてはcommand executionを証明できる/, "local evidence must permit execution claims only for an explicitly bound current local target");
assert.doesNotMatch(readiness, /current continuation command execution、live\/deployed\/production state、account headroom は証明しない/, "local evidence must not contradict the current-worktree execution record");
assert.match(readiness, /Historical PR #749 worktree results are non-authoritative reference only for current closure/);
assert.match(readiness, /Historical dependency-backed public-entitlement and security\/privacy contracts likewise do not prove their current-worktree results/);
assert.match(task, /does not retain PR #749 dependency-backed results as closure evidence/);
assert.doesNotMatch(task, /keeps exact-snapshot PR #749 local evidence only/);
assert.doesNotMatch(task, /This continuation worktree has no `node_modules`/);
assert.doesNotMatch(task, /Keep public-entitlement, security\/privacy, Worker size, lint, strict TypeScript, Next\/OpenNext, and Wrangler checks `setup-blocked`/);
assert.match(checklist, /historical result record only/);
assert.doesNotMatch(checklist, /exact named snapshot\/artifactに限る local evidence/);
const canonicalHistoricalPr749EvidenceFields = {
  historical_pr749_evidence_recorded_at: "2026-08-06T15:49:21+09:00",
  historical_pr749_final_head: "742165b0fb67bb2e47f3d7f9db37e2ac774579ff",
  historical_pr749_tree_fingerprint: "5ec7aa36c09d13ef8ea600090037884642bebc1c",
  historical_pr749_evidence_target_commit: "1b98aa28429cb82a188dee628cf71ea0a4d50c16",
  historical_pr749_evidence_target_kind: "dirty-worktree-snapshot-not-clean-commit",
  historical_pr749_evidence_pre_record_diff_sha256: "C1B149E7BBD189E470004F081FAEC307119FA1D5B20D157047320426BF1F5532",
  historical_pr749_evidence_approval_scope: "historical-pr749-worktree-lockfile-install-local-regression-fix-and-local-verification",
  historical_pr749_current_closure_authority: "non-authoritative-reference-only",
  historical_pr749_binding_status: "incomplete",
  historical_pr749_dirty_snapshot_runtime_input_equality_to_final_head: "unproven",
  historical_pr749_bundle_artifact_retained: "no",
  historical_pr749_bundle_artifact_hash: "missing-not-recorded",
  historical_pr749_node_npm_toolchain_identity: "missing-not-recorded",
  historical_pr749_source_release_window_drift: "not-derivable",
  historical_pr749_retention_scope: "non-authoritative-reference-only-not-current-closure-proof",
  historical_pr749_package_json_sha256: "D28E0445B69199FB639E7EE193313D2E82DE15B9300C06CE179A3CD25AE80E91",
  historical_pr749_package_lock_sha256: "0F3B1074691B8296E1E6C957C469DCB536B6C67B90890170600D7F50AEA138C8",
  historical_pr749_installed_package_count: "691",
  historical_pr749_install_command: "npm.cmd clean-install --progress=false",
  historical_pr749_install_exit: "0",
  historical_pr749_lint_command: "npm.cmd run lint",
  historical_pr749_lint_exit: "0",
  historical_pr749_typecheck_command: "node_modules/.bin/tsc.cmd --noEmit",
  historical_pr749_typecheck_exit: "0",
  historical_pr749_next_build_command: "npm.cmd run build",
  historical_pr749_next_build_exit: "0",
  historical_pr749_opennext_build_command: "npm.cmd run build:cloudflare",
  historical_pr749_opennext_build_exit: "0",
  historical_pr749_bundle_command: "node_modules/.bin/wrangler.cmd deploy --dry-run",
  historical_pr749_bundle_exit: "0",
  historical_pr749_bundle_reported_total_kib: "9477.87",
  historical_pr749_bundle_reported_gzip_kib: "2032.88",
  historical_pr749_bundle_conservative_upper_bound_bytes: "2081675",
  historical_pr749_bundle_internal_ceiling_bytes: "3000000",
  historical_pr749_public_entitlement_contract_command: "node scripts/comment-translator-public-entitlement-baseline-contract.mjs",
  historical_pr749_public_entitlement_contract_exit: "0",
  historical_pr749_security_privacy_contract_command: "node scripts/comment-translator-security-privacy-final-review-contract.mjs",
  historical_pr749_security_privacy_contract_exit: "0"
};
for (const [field, expected] of Object.entries(canonicalHistoricalPr749EvidenceFields)) {
  assert.equal(readUniqueTextField(readiness, field), expected, `${field} must retain its exact canonical value`);
}
const sourceRows = parseSourceRows(readiness);
validateSourceRows(sourceRows);
for (const row of evidenceRows.filter((entry) => completedLocalRevalidationEvidenceIds.includes(entry.id))) {
  assertHistoricalReferenceCannotSupersedeCurrentLocalRow({
    evidenceId: row.id,
    historicalAuthority: canonicalHistoricalPr749EvidenceFields.historical_pr749_current_closure_authority,
    currentStatus: row.status,
    currentVerification: "current-worktree-post-approved-install-local-read-only-revalidation"
  });
}
assert.match(readiness, /does not prove an exact actual byte count/);
assert.match(readiness, /does not claim that the commit alone reproduces the result/);
assert.match(readiness, /non-authoritative reference only for current closure/, "historical PR #749 evidence must be non-authoritative for current closure");
assert.match(readiness, /dirty snapshot runtime-input equality to final head is unproven/, "historical PR #749 evidence must record incomplete runtime binding");
assert.match(readiness, /Node\/npm\/toolchain identity is missing/, "historical PR #749 evidence must record missing toolchain identity");
assert.match(readiness, /source and release-window drift are not derivable/, "historical PR #749 evidence must not invent drift validation");
for (const [field, expected] of Object.entries(canonicalCurrentContinuationLocalVerificationFields)) {
  assert.equal(readUniqueTextField(readiness, field), expected, `${field} must retain the completed current-worktree local verification record`);
}
assert.equal(
  runReadOnlyCommand("git", ["rev-parse", "HEAD"]),
  canonicalCurrentContinuationLocalVerificationFields.current_continuation_worktree_observed_head,
  "current Git HEAD must retain the source binding used by local evidence"
);
assert.deepEqual(
  currentRuntimeSourceChangesOutsideAuthority(),
  [],
  "runtime source or untracked input drift outside the four authority files invalidates current local evidence"
);
assert.equal(
  process.version,
  canonicalCurrentContinuationLocalVerificationFields.current_continuation_worktree_node_version,
  "current Node version must retain the recorded toolchain binding"
);
const currentNpmVersion = process.platform === "win32"
  ? runReadOnlyCommand("cmd.exe", ["/d", "/s", "/c", "npm.cmd --version"])
  : runReadOnlyCommand("npm", ["--version"]);
assert.equal(
  currentNpmVersion,
  canonicalCurrentContinuationLocalVerificationFields.current_continuation_worktree_npm_version,
  "current npm version must retain the recorded toolchain binding"
);
assert.equal(
  runReadOnlyCommand(process.execPath, [join(repositoryRoot, "node_modules", "wrangler", "bin", "wrangler.js"), "--version"]),
  canonicalCurrentContinuationLocalVerificationFields.current_continuation_worktree_wrangler_version,
  "current Wrangler version must retain the recorded toolchain binding"
);
assert.equal(
  sha256File("package.json"),
  canonicalCurrentContinuationLocalVerificationFields.current_continuation_worktree_package_json_sha256,
  "current package.json must retain the approved local evidence hash"
);
assert.equal(
  sha256File("package-lock.json"),
  canonicalCurrentContinuationLocalVerificationFields.current_continuation_worktree_package_lock_sha256,
  "current package-lock.json must retain the approved local evidence hash"
);
const currentOpenNextFingerprint = computeOpenNextArtifactFingerprint();
assert.deepEqual(
  currentOpenNextFingerprint,
  {
    fileCount: Number(canonicalCurrentContinuationLocalVerificationFields.current_continuation_worktree_opennext_artifact_file_count),
    totalBytes: Number(canonicalCurrentContinuationLocalVerificationFields.current_continuation_worktree_opennext_artifact_total_bytes),
    treeManifestSha256: canonicalCurrentContinuationLocalVerificationFields.current_continuation_worktree_opennext_artifact_tree_manifest_sha256
  },
  "current .open-next artifact must retain the recorded file count, bytes, and deterministic tree fingerprint"
);
assert.equal(
  sha256File(".open-next/worker.js"),
  canonicalCurrentContinuationLocalVerificationFields.current_continuation_worktree_worker_entry_sha256,
  "current OpenNext worker entry must retain the recorded hash"
);
assert.equal(
  readFileSync(join(repositoryRoot, ".open-next", "worker.js")).length,
  Number(canonicalCurrentContinuationLocalVerificationFields.current_continuation_worktree_worker_entry_bytes),
  "current OpenNext worker entry must retain the recorded byte length"
);
assert.match(readiness, /Command exit labels are root-observed sanitized snapshot records/, "command results must be scoped as retained root-observed snapshot evidence");
assert.match(readiness, /current Git HEAD, authority-only diff isolation including untracked files, Node\/npm\/Wrangler toolchain versions/, "the executable drift contract must disclose its current source and toolchain checks");
assert.match(readiness, /not account headroom, deployed, or production proof/, "current local verification must not become production evidence");

const numericRows = parseNumericRows(readiness);
validateNumericRows(numericRows);
assert.match(readiness, /unsupported-numeric-claim=forbidden/);
assert.match(readiness, /public-source-is-not-account-headroom-or-production-proof/);

runNegativeHelperAssertions(evidenceRows, numericRows, documentedUnresolvedHardRequirements, primaryApprovalUnitRows, acquisitionDecisionRows, decisionSequenceFields, completedLocalApprovalPacket, completedWorkerRequestReadinessPacket, completedSupabaseSizeReadinessPacket, completedSupabasePausePartialStopReadinessPacket, completedSupabasePausePostureDecisionReadiness, completedSupabaseEgressPartialStopReadinessPacket, completedSupabaseCachedEgressReadinessPacket, completedWorkerCpuPartialStopReadinessPacket, completedProviderCostPartialStopReadinessPacket, completedProviderFundingPostureDecisionReadinessPacket, completedStripeCostPartialStopReadinessPacket, completedStripeBaseFeePartialStopReadinessPacket, completedSupportPostureDecisionReadinessPacket, completedSupabaseBackupPrerequisiteInputReadinessPacket, completedSupabaseBackupPostureDecisionReadinessPacket, nextApprovalPacket);

for (const invariant of [
  "Free behavior remains permanent",
  "all billing/provider/Creator/public activation gates remain fixed closed",
  "only compatible signed subscription evidence may authorize Paid",
  "Checkout redirect/completion is not Paid evidence",
  "fixture, local, and public-source evidence are not production proof",
  "Product/Price/tax/legal/copy/SLA/risk acceptance are not inferred",
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
  "current_pr=none",
  "current_pr_state=not-created-unapproved",
  "previous_pr=749",
  "previous_pr_state=merged",
  "previous_pr_merge_commit=60d8b86f98bfe9465afdf9fa22e7052c0169b993",
  "previous_pr_final_head=742165b0fb67bb2e47f3d7f9db37e2ac774579ff",
  "current_base=codex/comment-translator-free-public-beta-integration",
  "current_branch=codex/comment-translator-creator-nc-r1-evidence-clearance",
  "current_lane=NC-R1",
  "launch_readiness_decision=no-go",
  "publication_status=not-requested",
  "deploy_status=not-confirmed-for-pr-749",
  "current_dependencies=present-lockfile-matched",
  "unresolved_hard_requirements=10",
  "nc_l1_status=not-started",
  "nc_l1_start_condition=nc-r1-explicit-go-after-zero-unresolved-hard-requirements",
  readinessPath,
  checklistPath
]) {
  assert.match(task, new RegExp(escapeRegExp(marker)), `missing current task marker: ${marker}`);
}
validateTaskOperationalFields(task);
assert.throws(
  () => validateTaskOperationalFields(`${task}\ncurrent_approved_boundary=${canonicalTaskOperationalFields.current_approved_boundary}`),
  /current_approved_boundary must appear exactly once/
);
assert.throws(
  () => validateTaskOperationalFields(task.replace(
    `implementation_status=${canonicalTaskOperationalFields.implementation_status}`,
    `implementation_status=${canonicalTaskOperationalFields.implementation_status}-stale`
  )),
  /implementation_status must retain its exact current operational state/
);

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
  "continuation PR #749 final head",
  "60d8b86f98bfe9465afdf9fa22e7052c0169b993",
  "## Historical PR #749 Worktree Dependency Verification",
  "## Completed Current Continuation Local Revalidation",
  "## Completed Authenticated-Private Supabase Size Evidence",
  "## Approved Partial-Stop Authenticated-Private Supabase Pause Evidence",
  "## Completed Release-Owner Supabase Pause-Posture Decision",
  "## Approved Partial-Stop Authenticated-Private Supabase Egress Evidence",
  "## Completed Authenticated-Private Supabase Cached Egress Evidence",
  "## Completed Authenticated-Private Supabase Backup Prerequisite Input",
  "## Approved Partial-Stop Authenticated-Private Provider Cost Evidence",
  "## Completed Release-Owner Provider Funding-Posture Decision",
  "## Approved Partial-Stop Authenticated-Private Stripe Cost Evidence",
  "## Approved Post-Read Partial-Stop Authenticated-Private Stripe Base-Fee Evidence",
  "## Completed Release-Owner Support Posture Decision",
  "## Completed Release-Owner Supabase Backup-Recovery Posture Decision",
  "## Read-Only Public Source Refresh",
  "## Separately Approved Evidence Units",
  "## Next Minimum Single Approval Packet",
  "## Ordered Judgment And Final Release Decision Sequence",
  "## Release Owner Decisions",
  "## Stop Conditions",
  "## Rollback Packet",
  "## Go Or No-Go Record",
  "current_decision=no-go",
  "unresolved_hard_requirements=10",
  "activation_status=closed",
  "no external operation is authorized by this checklist"
]) {
  assert.match(checklist, new RegExp(escapeRegExp(marker)), `missing operator marker: ${marker}`);
}
assert.match(checklist, /non-authoritative reference only for current closure/, "checklist must reject historical evidence as current closure authority");
assert.match(checklist, /dirty snapshot runtime-input equality to final head is unproven/, "checklist must disclose incomplete historical runtime binding");
assert.match(checklist, /Node\/npm\/toolchain identity は missing/, "checklist must disclose missing historical toolchain identity");
assert.match(checklist, /source\/release-window drift は not derivable/, "checklist must not invent historical drift validation");
assert.match(checklist, /Completed Current Continuation Local Revalidation/, "checklist must record the completed current-worktree local verification");
assert.match(checklist, /EVID-WORKER-SIZE only as local artifact acceptance/, "checklist must reject Worker size promotion to account or deployed proof");
assert.match(checklist, /Completed Release-Owner Supabase Pause-Posture Decision/, "checklist must retain the completed accepted Pause posture decision");
assert.match(checklist, /decision_owner=kurodev/, "checklist must retain the named accepted Pause posture decision owner");
assert.match(checklist, /decision=accepted/, "checklist must retain the accepted Pause posture decision result");
assert.match(checklist, /residual auto-pause risk.*EVID-RISK-ACCEPTANCE/i, "checklist must carry accepted residual auto-pause risk to EVID-RISK-ACCEPTANCE");
assert.match(checklist, /EVID-SLA only/, "checklist must isolate the next SLA posture judgment");
assert.match(checklist, /availability_commitment=<required-availability-commitment-or-explicit-no-sla-posture>/, "checklist must retain the next SLA availability placeholder");
assert.match(checklist, /No SLA claim is invented/i, "checklist must prohibit invented SLA claims");
assert.match(checklist, /no command is authorized/, "checklist must retain the next SLA non-execution boundary");
assert.match(checklist, /upgrade_authorization=none/, "checklist must prohibit actual upgrade authorization in the completed Backup owner judgment");
assert.match(checklist, /npm\.cmd clean-install --progress=false/, "checklist must retain the exact approved install command");
assert.match(checklist, /not executable and no command is authorized/, "checklist must preserve the unapproved next SLA posture judgment packet status");
assert.match(checklist, /current continuation worktree has lockfile-matched node_modules/, "checklist must retain current local dependency state");
assert.doesNotMatch(checklist, /このfresh worktree/, "checklist must not present historical PR #749 evidence as current worktree evidence");

for (const approvalUnit of [
  "APPROVAL-CLOUDFLARE-READ",
  "APPROVAL-SUPABASE-READ",
  "APPROVAL-PRODUCT-PRICE",
  "APPROVAL-LEGAL",
  "APPROVAL-COPY",
  "APPROVAL-SLA",
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
assert.match(checklist, /^\| APPROVAL-SUPABASE-BACKUP-RISK \| approved-completed-documentation-only \|/m, "Backup posture approval must be recorded as completed without opening external gates");
assert.match(checklist, /^\| APPROVAL-SUPPORT \| approved-completed-documentation-only \|/m, "Support posture approval must be recorded as completed without opening SLA or external gates");
assert.equal((checklist.match(/^\| APPROVAL-SUPPORT \|/gm) ?? []).length, 1, "Support approval registry row must be unique");
assert.doesNotMatch(checklist, /^\| APPROVAL-SUPPORT \| unapproved \|/m, "completed Support approval must not retain a contradictory unapproved registry row");
assert.doesNotMatch(checklist, /APPROVAL-SLA-RISK/, "legacy bundled SLA-risk approval unit must not return");
assert.match(checklist, /A documentation-only release-owner judgment instead must state its exact scope, decision input or posture, effective date, named decision owner\/approver, evidence retention location, stop owner, and rollback owner; it has no executable operator or operation time window\./, "documentation-only owner judgments must use their own non-executable completeness rule");
assert.match(checklist, /No documentation-only judgment authorizes an external operation\./, "documentation-only owner judgments must not authorize external operations");
assert.match(checklist, /^\| APPROVAL-PROVIDER-READ \| approved-partial-stop-read-plus-documentation-only-judgment \|/m, "Provider Cost partial-stop read and documentation-only judgment must be recorded without row closure");
assert.match(checklist, /^\| APPROVAL-STRIPE-READ \| approved-partial-stop-authenticated-private-read \|/m, "Stripe Cost partial-stop read must be recorded without row closure");
assert.doesNotMatch(checklist, /APPROVAL-WORKER-LIMIT-ALIGNMENT/);

assert.doesNotMatch(`${readiness}\n${checklist}`, /(?:sk_(?:live|test)_|whsec_|bearer\s|authorization:|password=|cookie=|localstorage|sessionstorage|indexeddb|livechatid|customer_[a-z0-9]|subscription_[a-z0-9])/i);
assertNoSupabasePrivateIdentifiers(`${readiness}\n${checklist}\n${task}`);
assert.doesNotMatch(`${readiness}\n${checklist}`, /(?:dockerfile|container binding|container-backed)/i);

process.stdout.write(
  `comment translator Creator NC-R1 paid launch readiness contract passed (decision=no-go; unresolved-hard=${unresolvedHardRequirements.length}; activation=closed)\n`
);
