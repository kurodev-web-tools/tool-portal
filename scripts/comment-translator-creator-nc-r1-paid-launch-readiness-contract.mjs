import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const readinessPath = "docs/active/COMMENT_TRANSLATOR_CREATOR_NC_R1_PAID_LAUNCH_READINESS.md";
const checklistPath = "docs/active/COMMENT_TRANSLATOR_CREATOR_NC_R1_OPERATOR_CHECKLIST.md";
const ncQ1AuthorityPath = "docs/active/COMMENT_TRANSLATOR_CREATOR_NC_Q1_QA_AUTHORITY.md";
const ncQ1ChecklistPath = "docs/active/COMMENT_TRANSLATOR_CREATOR_NC_Q1_OPERATOR_CHECKLIST.md";
const crosswalkPath = "docs/active/COMMENT_TRANSLATOR_CREATOR_NO_CONTAINER_LEGACY_CROSSWALK.md";
const historicalTaskPath = "docs/archive/task-board-pre-2026-08-10-current-state-reconciliation.md";
const sourceCheckedAt = "2026-08-06";
const sourceMaxAgeDays = 7;
const sourceFreshnessTimeZone = "Asia/Tokyo";
const parsedResultEvaluationAt = "2026-08-10T23:59:59Z";
const fingerprintCanonicalizationVersion = "nc-r1-sanitized-fingerprint-v1";
const sanitizedFingerprintPattern = /^sha256:[a-f0-9]{64}$/;
const canonicalCompletedStripeCostPartialStopSectionSha256 = "31C4EDDF6D1E60F97D7CE876BD72E74E67FD78474B09BD3021364847E4F327EE";
const canonicalCompletedStripeBaseFeePartialStopSectionSha256 = "0226C22B66489BCED742E40B391539C05B29F56CB7730BEB85D272C1AD82875D";
const canonicalCompletedSupportPostureDecisionSectionSha256 = "F9156F7956810F92EFBF92FFA94529D9D88BAA9A99F7C60AE5FCEAD39B7ABE6B";
const historicalPr750LocalRevalidationEvidenceIds = [
  "EVID-LOCAL-PUBLIC-ENTITLEMENT-CONTRACT",
  "EVID-LOCAL-SECURITY-PRIVACY-CONTRACT",
  "EVID-WORKER-SIZE"
];
const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const authorityOnlyPaths = new Set([
  "task.md",
  "docs/active/COMMENT_TRANSLATOR_CREATOR_NC_R1_OPERATOR_CHECKLIST.md",
  "docs/active/COMMENT_TRANSLATOR_CREATOR_NC_R1_PAID_LAUNCH_READINESS.md",
  "scripts/comment-translator-creator-nc-r1-paid-launch-readiness-contract.mjs",
  "docs/superpowers/specs/2026-08-09-nc-r1-eight-row-staged-resolution-design.md",
  "docs/superpowers/plans/2026-08-09-nc-r1-eight-row-staged-resolution.md"
]);
const operationalAuthorityPaths = new Set([
  "task.md",
  "docs/active/COMMENT_TRANSLATOR_CREATOR_NC_R1_OPERATOR_CHECKLIST.md",
  "docs/active/COMMENT_TRANSLATOR_CREATOR_NC_R1_PAID_LAUNCH_READINESS.md",
  "scripts/comment-translator-creator-nc-r1-paid-launch-readiness-contract.mjs"
]);

function assertChangedPathsForPhase(paths, phase) {
  const normalized = [...new Set(paths)].sort();
  const allowedPaths = phase === "manifest-creation"
    ? authorityOnlyPaths
    : phase === "child-result-run"
      ? operationalAuthorityPaths
      : undefined;
  if (!allowedPaths) {
    assert.fail("unknown changed-path phase");
  }
  const outsideAllowedPaths = normalized.filter((entry) => !allowedPaths.has(entry));
  assert.deepEqual(outsideAllowedPaths, [], `${phase} must not change a path outside its approved allowlist`);
}

function read(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

function runReadOnlyCommand(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    windowsHide: true,
    ...options
  }).trim();
}

function currentChangedPaths() {
  const tracked = runReadOnlyCommand("git", ["diff", "--name-only", "HEAD", "--"]);
  const untracked = runReadOnlyCommand("git", ["ls-files", "--others", "--exclude-standard"]);
  return [...new Set(`${tracked}\n${untracked}`.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean))]
    .map((entry) => entry.replaceAll("\\", "/"))
    .sort();
}

function currentRuntimeSourceChangesOutsideAuthority() {
  return currentChangedPaths()
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
  { id: "EVID-SLA", evidenceClass: "gated", freshness: "fresh", target: "exact", approval: "approved", hardRequirement: "yes", productionProof: "no", status: "satisfied" },
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
const canonicalCompletedWorkerCpuExecutionPathDispositionPacketFields = {
  packet_execution_status: "approved-completed-release-owner-judgment",
  packet_item_count: "1",
  approval_unit: "release-owner-judgment",
  evidence_id: "EVID-WORKER-CPU",
  requested_operation: "release-owner-judgment-worker-cpu-graphql-execution-path-disposition-only",
  command: "<no-command-authorized>",
  external_action: "none",
  required_approver: "kurodev",
  approval_id: "NC-R1-WORKER-CPU-GRAPHQL-PATH-20260809-01",
  scope_alias: "creator-production-worker-graphql-execution-path-disposition",
  effective_date: "2026-08-09",
  decision_input: "completed-graphql-schema-transport-partial-stop-no-data-query",
  owner_decision: "approved-safe-no-secret-execution-path-selected",
  safe_execution_path: "kurodev-operated-cloudflare-graphiql-existing-analytics-read-credential-never-shared-sanitized-result-only",
  credential_creation: "not-authorized",
  credential_retrieval_or_disclosure: "not-authorized",
  next_operation_authorization: "none-separate-authenticated-private-read-packet-required",
  evidence_retention_location: "current-Codex-task-sanitized-report",
  stop_owner: "kurodev",
  rollback_owner: "kurodev",
  default_incremental_spend_jpy: "0",
  stop_before_any_incremental_charge: "yes",
  prohibited_bundle: "credentials,tokens,API-keys,GraphiQL,Chrome,raw-response-output,account-tag-output,token-output,private-script-name-output,Workers-Logs,Trace,Query-Builder,Logpush,Tail,raw-events,raw-requests,settings,configuration,deploy,activation,provider,Stripe,Supabase,Product-or-Price,legal,copy,risk,live,git-publication,cleanup",
  row_closure: "none-this-packet",
  production_proof: "no",
  activation_status: "closed",
  approval_decision: "approved"
};
const nextWorkerCpuSchemaManualRequiredApprovalFields = [
  "packet_execution_status",
  "approval_unit",
  "child_id",
  "evidence_id",
  "requested_operation",
  "command",
  "external_action",
  "approval_id",
  "owner_confirmation",
  "target_alias",
  "operator",
  "execution_surface",
  "permitted_execution_surface",
  "browser_execution_scope",
  "prohibited_operator",
  "data_query_authorization",
  "credential_creation",
  "credential_retrieval_or_disclosure",
  "evidence_retention_location",
  "stop_owner",
  "rollback_owner",
  "approval_decision",
  "separate_explicit_approval_required"
];
const canonicalDecisionSequenceFields = {
  ordinary_row_judgment_ids: "EVID-SUPABASE-BACKUP,EVID-PRODUCT-PRICE,EVID-LEGAL,EVID-COPY,EVID-SUPPORT,EVID-SLA",
  ordinary_row_judgment_precondition: "exact-row-scope-inputs-named-approver-effective-date-retention-stop-rollback-complete",
  ordinary_row_judgment_zero_unresolved_requirement: "not-required",
  risk_acceptance_precondition: "other-8-hard-requirements-satisfied-and-residual-risks-enumerated",
  risk_acceptance_row_effect: "closes-EVID-RISK-ACCEPTANCE-only",
  final_release_go_precondition: "all-9-current-unresolved-hard-requirements-satisfied-zero-unresolved-and-explicit-go",
  final_release_no_go: "recordable-at-any-time",
  final_release_current_state: "missing",
  nc_l1_start_precondition: "explicit-final-release-go-after-zero-unresolved",
  row_closure_activation_effect: "none-activation-remains-closed"
};
const ordinaryRowJudgmentIds = canonicalDecisionSequenceFields.ordinary_row_judgment_ids.split(",");
const canonicalNextApprovalPacketFields = {
  packet_execution_status: "approved-not-started-authenticated-private-read",
  packet_item_count: "1",
  approval_unit: "authenticated-private-read",
  child_id: "A1-worker-cpu-evidence-read",
  evidence_id: "EVID-WORKER-CPU",
  requested_operation: "kurodev-operated-cloudflare-graphiql-schema-capability-only",
  command: "<no-Codex-command-authorized>",
  external_action: "authorized-not-started-kurodev-manual-schema-capability-only",
  target_alias: "creator-production-worker",
  operator: "kurodev-manual-current-task",
  required_approver: "kurodev",
  approval_id: "NC-R1-WORKER-CPU-GRAPHQL-SCHEMA-MANUAL-20260809-01",
  owner_confirmation: "explicit-approval-id-current-Codex-task",
  execution_surface: "kurodev-operated-cloudflare-graphql-client-existing-credential-never-shared",
  permitted_execution_surface: "kurodev-operated-cloudflare-graphql-client-or-graphiql-existing-credential-never-shared-schema-only",
  browser_execution_scope: "kurodev-operated-named-existing-authenticated-client-schema-only-no-Codex-control",
  prohibited_operator: "Codex",
  schema_dataset: "workersInvocationsAdaptive",
  required_schema_fields: "sum.requests,quantiles.cpuTimeP50,quantiles.cpuTimeP99",
  sampling_disclosure: "required",
  confidence_metadata: "required",
  exact_target_scope: "required",
  full_window_aggregation: "required",
  node_limit_pagination_non_truncation: "required",
  schema_capability_only: "yes",
  data_query_authorization: "none",
  credential_creation: "not-authorized",
  credential_retrieval_or_disclosure: "not-authorized",
  evidence_retention_location: "current-Codex-task-sanitized-report",
  stop_owner: "kurodev",
  rollback_owner: "kurodev",
  default_incremental_spend_jpy: "0",
  stop_before_any_incremental_charge: "yes",
  prohibited_bundle: "credentials,tokens,API-keys,Codex-operated-GraphiQL,Codex-operated-Chrome,raw-response-output,account-tag-output,token-output,private-script-name-output,Workers-Logs,Trace,Query-Builder,Logpush,Tail,raw-events,raw-requests,settings,configuration,deploy,activation,provider,Stripe,Supabase,Product-or-Price,legal,copy,risk,live,git-publication,cleanup",
  partial_stop_condition: "auth-or-schema-or-dataset-or-field-or-sampling-or-confidence-or-target-or-limit-or-pagination-or-private-or-paid-gap",
  raw_response_credential_account_tag_private_script_name_retained: "no",
  raw_response_credential_account_tag_private_script_name_shared: "no",
  row_closure: "none-this-packet",
  production_proof: "no",
  activation_status: "closed",
  approval_decision: "approved",
  separate_explicit_approval_required: "satisfied-by-current-owner-message"
};
const canonicalCompletedA0ProvisionalCostModelApprovalFields = {
  packet_execution_status: "approved-completed-release-owner-judgment",
  packet_item_count: "1",
  approval_unit: "release-owner-judgment",
  child_id: "A0-provisional-cost-model-input",
  row_group_references: "EVID-PROVIDER-COST,EVID-STRIPE-COST,EVID-PRODUCT-PRICE",
  requested_operation: "release-owner-judgment-provisional-cost-model-input-only",
  command: "<no-command-authorized>",
  external_action: "none",
  required_approver: "kurodev",
  approval_id: "NC-R1-A0-PROVISIONAL-COST-MODEL-20260809-01",
  exact_target_or_scope: "creator-paid-comment-translator-provisional-cost-model-v1",
  bound_input: "candidate-paid-scope:authenticated-creator-comment-translator-only;provisional-price-posture:no-numeric-price-margin-tax-or-cost-claim-pending-A2-A3;provider-usage-boundary:provider-executed-success-only-cache-hit-skip-failure-and-usage-commit-rejection-excluded;stripe-charge-path:server-owned-checkout-reservation-to-compatible-active-signed-subscription-authority-only;exclusions:provider-funding-payment-tax-legal-copy-risk-deploy-live-final-go-activation",
  effective_date: "2026-08-09",
  cost_model_decision: "approved-provisional-non-closing-input-awaiting-A2-A3-no-spend",
  judgment_output: "approved",
  evidence_retention_location: "current-Codex-task-sanitized-report",
  stop_owner: "kurodev",
  rollback_owner: "kurodev",
  cost_guard: "zero-incremental-spend-and-separate-budget-approval-required",
  default_incremental_spend_jpy: "0",
  stop_before_any_incremental_charge: "yes",
  provider_funding_authorization: "none",
  stripe_payment_or_refund_authorization: "none",
  product_or_price_row_closure: "none",
  row_closure: "none",
  production_proof: "no",
  activation_status: "closed",
  approval_decision: "approved"
};
const canonicalUnapprovedA2ProviderFundingRequirementDispositionFields = {
  packet_execution_status: "unapproved-non-executable",
  packet_item_count: "1",
  approval_unit: "release-owner-judgment",
  decision_record_id: "A2-provider-funding-requirement-disposition",
  dependent_child_id: "A2-provider-funding-external-prerequisite-reference",
  evidence_id: "EVID-PROVIDER-COST",
  requested_operation: "release-owner-judgment-provider-funding-requirement-disposition-only",
  command: "<no-command-authorized>",
  external_action: "none",
  required_approver: "kurodev",
  approval_id: "NC-R1-A2-PROVIDER-FUNDING-REQUIREMENT-DISPOSITION-20260810-01",
  exact_target_or_scope: "creator-paid-primary-openai-provider-funding-requirement-v1",
  bound_a0_approval_id: "NC-R1-A0-PROVISIONAL-COST-MODEL-20260809-01",
  bound_a0_cost_model_input_fingerprint: "sha256:d8f403f21571bc48098f9989394c3bef547455090dc922efaa071d0aa7938531",
  prior_funding_posture_approval_id: "NC-R1-PROVIDER-FUNDING-POSTURE-20260807-01",
  decision_input: "a0-provisional-cost-model-plus-zero-funded-headroom-at-observation",
  effective_date: "2026-08-10",
  proposed_funding_requirement_state: "needed-absent",
  proposed_owner_decision: "retain-no-go-require-separate-external-funding-prerequisite",
  evidence_retention_location: "current-Codex-task-sanitized-report",
  stop_owner: "kurodev",
  rollback_owner: "kurodev",
  cost_guard: "zero-incremental-spend-and-separate-budget-approval-required",
  default_incremental_spend_jpy: "0",
  stop_before_any_incremental_charge: "yes",
  funding_authorization: "none",
  provider_api_authorization: "none",
  payment_or_credit_authorization: "none",
  external_prerequisite_approval: "none",
  dependent_child_status_effect: "none-remains-unapproved",
  row_closure: "none",
  production_proof: "no",
  activation_status: "closed",
  approval_decision: "unapproved"
};
// The owner-approval record is deliberately independent from the disposition result.
// A result can bind this immutable record fingerprint but can never create approval.
const canonicalA2FundingDispositionOwnerApprovalTemplateFields = {
  record_status: "<required-approved-completed-release-owner-judgment>",
  record_type: "sanitized-provider-funding-requirement-disposition-owner-approval",
  evidence_id: "EVID-PROVIDER-COST",
  decision_record_id: "A2-provider-funding-requirement-disposition",
  dependent_child_id: "A2-provider-funding-external-prerequisite-reference",
  approval_id: "<required-exact-approved-A2-funding-disposition-approval-id>",
  approval_decision: "<required-approved>",
  exact_target_or_scope: "<required-exact-approved-target-or-scope>",
  bound_a0_approval_id: "<required-exact-A0-approval-id>",
  bound_a0_cost_model_input_fingerprint: "<required-exact-A0-cost-model-input-fingerprint>",
  prior_funding_posture_approval_id: "<required-exact-prior-funding-posture-approval-id>",
  decision_input: "<required-exact-approved-decision-input>",
  effective_date: "<required-Asia-Tokyo-effective-date>",
  required_approver: "kurodev",
  decision_owner: "kurodev",
  funding_requirement_state: "<required-not-needed-or-already-available-or-needed-absent>",
  owner_decision: "<required-exact-owner-disposition>",
  evidence_retention_location: "<required-sanitized-retention-location>",
  stop_owner: "kurodev",
  rollback_owner: "kurodev",
  cost_guard: "zero-incremental-spend-and-separate-budget-approval-required",
  default_incremental_spend_jpy: "0",
  stop_before_any_incremental_charge: "yes",
  command: "<no-command-authorized>",
  external_action: "none",
  funding_authorization: "none",
  provider_api_authorization: "none",
  payment_or_credit_authorization: "none",
  external_prerequisite_approval: "none",
  row_closure: "none",
  production_proof: "no",
  activation_status: "closed",
  owner_approval_record_fingerprint: "<required-sha256-owner-approval-record-fingerprint>"
};
const canonicalA2FundingRequirementDispositionResultTemplateFields = {
  record_status: "<required-approved-completed-release-owner-judgment>",
  record_type: "sanitized-provider-funding-requirement-disposition-result",
  evidence_id: "EVID-PROVIDER-COST",
  decision_record_id: "A2-provider-funding-requirement-disposition",
  dependent_child_id: "A2-provider-funding-external-prerequisite-reference",
  owner_approval_record_fingerprint: "<required-exact-owner-approval-record-fingerprint>",
  funding_requirement_state: "<required-not-needed-or-already-available-or-needed-absent>",
  owner_decision: "<required-exact-owner-disposition>",
  external_prerequisite_approval: "none",
  row_closure: "none",
  production_proof: "no",
  activation_status: "closed",
  disposition_record_fingerprint: "<required-sha256-disposition-record-fingerprint>"
};
const canonicalUnapprovedA3StripePricingDocumentManualPacketFields = {
  packet_execution_status: "unapproved-non-executable",
  packet_item_count: "1",
  approval_unit: "authenticated-private-read",
  child_id: "A3-stripe-source-applicability-read-or-judgment",
  selected_mode: "read",
  selected_approval_unit: "authenticated-private-read",
  evidence_id: "EVID-STRIPE-COST",
  requested_operation: "kurodev-manual-read-existing-stripe-account-specific-pricing-agreement-or-contract-applicability-only",
  permitted_execution_surface: "kurodev-operated-existing-stripe-account-pricing-agreement-or-contract-document-only",
  command: "<no-Codex-command-authorized>",
  external_action: "none-unapproved-not-started",
  operator: "kurodev-manual-current-task",
  required_approver: "kurodev",
  approval_id: "NC-R1-A3-STRIPE-ACCOUNT-PRICING-DOCUMENT-MANUAL-20260810-01",
  exact_target_or_scope: "creator-paid-primary-stripe-account-pricing-document-scope-v1",
  time_window: "2026-08-10T00:00:00+09:00/2026-08-10T23:59:59+09:00",
  bound_a0_approval_id: "NC-R1-A0-PROVISIONAL-COST-MODEL-20260809-01",
  bound_a0_cost_model_input_fingerprint: "sha256:d8f403f21571bc48098f9989394c3bef547455090dc922efaa071d0aa7938531",
  prior_stripe_cost_approval_ids: "NC-R1-STRIPE-COST-20260807-01,NC-R1-STRIPE-BASE-FEE-20260807-01",
  verification_scope: "source-document-availability-and-exact-base-processing-fee-availability-and-standard-custom-applicability-and-full-cost-model-completeness-only",
  evidence_retention_location: "current-Codex-task-sanitized-report",
  stop_owner: "kurodev",
  rollback_owner: "kurodev",
  cost_guard: "zero-incremental-spend-and-stop-before-any-charge",
  default_incremental_spend_jpy: "0",
  stop_before_any_incremental_charge: "yes",
  payment_refund_client_or_event_settings_api_export_action: "none",
  credential_creation_retrieval_disclosure: "none",
  raw_document_contract_text_url_account_identifier_private_identifier_retention: "none",
  codex_browser_or_stripe_control: "none",
  public_pricing_substitution: "forbidden",
  partial_stop_condition: "source-absent-or-fee-unavailable-or-applicability-unknown-or-full-cost-model-incomplete-or-private-exposure-or-charge-required",
  row_closure: "none-this-packet",
  production_proof: "no",
  activation_status: "closed",
  approval_decision: "unapproved"
};
// This independent record is the only future approval authority for A3.  The
// documented template below remains a non-evidence shape and cannot create it.
const canonicalA3ManualReadOwnerApprovalTemplateFields = {
  record_status: "<required-approved-owner-approval-authenticated-private-read>",
  record_type: "sanitized-a3-stripe-account-pricing-manual-read-owner-approval",
  evidence_id: "EVID-STRIPE-COST",
  child_id: "A3-stripe-source-applicability-read-or-judgment",
  selected_mode: "read",
  selected_approval_unit: "authenticated-private-read",
  requested_operation: "<required-exact-approved-requested-operation>",
  permitted_execution_surface: "<required-exact-approved-permitted-execution-surface>",
  command: "<no-Codex-command-authorized>",
  external_action: "none",
  operator: "kurodev-manual-current-task",
  required_approver: "kurodev",
  approval_id: "<required-exact-approved-A3-approval-id>",
  approval_decision: "approved",
  approval_fingerprint: "<required-exact-approved-A3-approval-fingerprint>",
  exact_target_or_scope: "<required-exact-approved-target-or-scope>",
  time_window: "<required-exact-approved-time-window>",
  bound_a0_approval_id: "<required-exact-A0-approval-id>",
  bound_a0_cost_model_input_fingerprint: "<required-exact-A0-cost-model-input-fingerprint>",
  prior_stripe_cost_approval_ids: "<required-exact-prior-stripe-cost-approval-ids>",
  verification_scope: "<required-exact-approved-verification-scope>",
  evidence_retention_location: "<required-sanitized-retention-location>",
  stop_owner: "kurodev",
  rollback_owner: "kurodev",
  cost_guard: "zero-incremental-spend-and-stop-before-any-charge",
  default_incremental_spend_jpy: "0",
  stop_before_any_incremental_charge: "yes",
  payment_refund_client_or_event_settings_api_export_action: "none",
  credential_creation_retrieval_disclosure: "none",
  raw_document_contract_text_url_account_identifier_private_identifier_retention: "none",
  codex_browser_or_stripe_control: "none",
  public_pricing_substitution: "forbidden",
  partial_stop_condition: "<required-exact-approved-partial-stop-condition>",
  row_closure: "none",
  production_proof: "no",
  activation_status: "closed",
  owner_approval_record_fingerprint: "<required-sha256-owner-approval-record-fingerprint>"
};
const canonicalA3StripePricingDocumentResultTemplateFields = {
  record_status: "<required-approved-completed-or-approved-partial-stop-authenticated-private-read>",
  evidence_id: "EVID-STRIPE-COST",
  child_id: "A3-stripe-source-applicability-read-or-judgment",
  requested_operation: "<required-exact-approved-requested-operation>",
  approval_id: "<required-exact-approved-A3-approval-id>",
  approval_decision: "<required-approved>",
  approval_fingerprint: "<required-sha256-approval-fingerprint>",
  exact_target_or_scope: "<required-exact-approved-target-or-scope>",
  time_window: "<required-exact-approved-time-window>",
  operator: "<required-exact-approved-operator>",
  bound_a0_cost_model_input_fingerprint: "<required-exact-A0-cost-model-input-fingerprint>",
  owner_approval_record_fingerprint: "<required-exact-owner-approval-record-fingerprint>",
  observed_at: "<required-rfc3339-observed-at>",
  target_match: "<required-exact-or-unconfirmed-or-mismatched>",
  source_document_available: "<required-available-or-unavailable-or-unconfirmed>",
  direct_account_specific_base_processing_fee_available: "<required-available-or-unavailable-or-unconfirmed>",
  standard_custom_applicability: "<required-standard-or-custom-or-unknown>",
  full_cost_model_completeness: "<required-complete-or-incomplete-or-unknown>",
  sanitized_exact_cost_classification: "<required-available-or-unavailable-or-unconfirmed>",
  account_specific_pricing_terms_fingerprint: "<required-sha256-sanitized-account-specific-pricing-terms-fingerprint>",
  account_specific_pricing_terms_coverage: "<required-complete-or-incomplete-or-unknown>",
  private_exposure_detected: "<required-yes-or-no-or-unknown>",
  incremental_charge_required: "<required-yes-or-no-or-unknown>",
  base_processing_fee_coverage: "<required-complete-or-not-applicable-or-incomplete-or-unknown>",
  fixed_and_variable_components_coverage: "<required-complete-or-not-applicable-or-incomplete-or-unknown>",
  refunds_disputes_chargebacks_coverage: "<required-complete-or-not-applicable-or-incomplete-or-unknown>",
  international_currency_conversion_coverage: "<required-complete-or-not-applicable-or-incomplete-or-unknown>",
  tax_and_other_account_specific_fee_coverage: "<required-complete-or-not-applicable-or-incomplete-or-unknown>",
  effective_scope_coverage: "<required-complete-or-not-applicable-or-incomplete-or-unknown>",
  raw_document_contract_text_url_account_identifier_private_identifier_retained_or_shared: "no",
  payment_refund_client_or_event_settings_api_export_action: "none",
  credential_creation_retrieval_disclosure: "none",
  codex_browser_or_stripe_control: "none",
  public_pricing_substitution: "no",
  incremental_charge: "no",
  stop_result: "<required-sanitized-stop-result>",
  result_status: "<required-complete-or-partial-stop>",
  row_closure: "<required-EVID-STRIPE-COST-for-complete-or-none-for-partial-stop>",
  a3_result_fingerprint: "<required-sha256-A3-result-fingerprint>",
  observed_record_fingerprint: "<required-sha256-observed-record-fingerprint>"
};
const canonicalA2ProviderCostObservedResultTemplateFields = {
  record_status: "<required-approved-completed-or-approved-partial-stop-authenticated-private-read>",
  evidence_id: "EVID-PROVIDER-COST",
  child_id: "A2-provider-cost-evidence-read",
  approval_id: "<required-exact-approved-A2-approval-id>",
  approval_decision: "<required-approved>",
  approval_fingerprint: "<required-sha256-approval-fingerprint>",
  exact_target_or_scope: "<required-exact-approved-target-or-scope>",
  time_window: "<required-exact-approved-time-window>",
  operator: "<required-exact-approved-operator>",
  bound_a0_cost_model_input_fingerprint: "<required-exact-A0-cost-model-input-fingerprint>",
  funding_prerequisite_fingerprint: "<required-exact-funding-prerequisite-fingerprint>",
  observed_at: "<required-rfc3339-Asia-Tokyo-observed-at>",
  target_match: "<required-exact-or-unconfirmed-or-mismatched>",
  funded_headroom_classification: "<required-positive-funded-headroom-or-zero-funded-headroom-or-unavailable-or-unconfirmed>",
  aggregation_completeness: "<required-complete-or-incomplete-or-unknown>",
  sanitized_exact_cost_classification: "<required-available-or-unavailable-or-unconfirmed>",
  applicability: "<required-applicable-or-not-applicable-or-unknown>",
  provider_api_write_payment_credit_budget_or_settings_action: "none",
  credential_creation_retrieval_disclosure: "none",
  raw_url_org_project_account_identifier_private_identifier_payload_retained_or_shared: "no",
  codex_browser_or_provider_control: "none",
  incremental_charge: "no",
  stop_result: "<required-sanitized-stop-result>",
  result_status: "<required-complete-or-partial-stop>",
  row_closure: "<required-EVID-PROVIDER-COST-for-complete-or-none-for-partial-stop>",
  a2_result_fingerprint: "<required-sha256-A2-result-fingerprint>",
  observed_record_fingerprint: "<required-sha256-observed-record-fingerprint>"
};
const a2ProviderCostObservedResultRecordFields = Object.keys(canonicalA2ProviderCostObservedResultTemplateFields);
const a2FundingDispositionOwnerApprovalRecordFields = Object.keys(canonicalA2FundingDispositionOwnerApprovalTemplateFields);
const a2FundingRequirementDispositionResultRecordFields = Object.keys(canonicalA2FundingRequirementDispositionResultTemplateFields);
const a3ManualReadOwnerApprovalRecordFields = Object.keys(canonicalA3ManualReadOwnerApprovalTemplateFields);
const a3StripeObservedResultRecordFields = Object.keys(canonicalA3StripePricingDocumentResultTemplateFields);
const a4ProductPriceJudgmentResultRecordFields = [
  "record_status", "record_type", "evidence_id", "child_id", "judgment_record_id", "approval_id", "approval_decision", "approval_fingerprint",
  "exact_target_or_scope", "required_approver", "decision_owner", "effective_date", "bound_a2_result_fingerprint", "bound_a3_result_fingerprint",
  "dependency_fingerprint_composite", "product_scope_disposition", "price_posture_disposition", "exclusions_bound", "material_change_revalidation",
  "evidence_retention_location", "stop_owner", "rollback_owner", "legal_tax_copy_risk_deploy_live_go_activation_publication_authorization",
  "judgment_output", "row_closure", "a4_result_fingerprint", "judgment_record_fingerprint"
];
const a5LegalJudgmentResultRecordFields = [
  "record_status", "record_type", "evidence_id", "child_id", "judgment_record_id", "approval_id", "approval_decision", "approval_fingerprint",
  "exact_target_or_scope", "required_approver", "decision_owner", "effective_date", "bound_a4_artifact_fingerprint",
  "legal_scope_disposition", "legal_tax_posture_disposition", "exclusions_bound", "material_change_revalidation",
  "evidence_retention_location", "stop_owner", "rollback_owner", "copy_risk_deploy_live_go_activation_publication_authorization",
  "judgment_output", "row_closure", "a5_result_fingerprint", "judgment_record_fingerprint"
];
const a6CopyJudgmentResultRecordFields = [
  "record_status", "record_type", "evidence_id", "child_id", "judgment_record_id", "approval_id", "approval_decision", "approval_fingerprint",
  "exact_target_or_scope", "required_approver", "decision_owner", "effective_date", "copy_artifact_identifier_or_content_fingerprint", "bound_a4_artifact_fingerprint", "bound_a5_artifact_fingerprint",
  "dependency_fingerprint_composite", "copy_scope_disposition", "copy_posture_disposition", "exclusions_bound", "material_change_revalidation",
  "evidence_retention_location", "stop_owner", "rollback_owner", "publication_public_paid_gate_risk_deploy_live_go_activation_external_action_authorization",
  "judgment_output", "row_closure", "a6_result_fingerprint", "judgment_record_fingerprint"
];
const b1DeployedTargetProofRecordFields = [
  "record_status", "record_type", "evidence_id", "child_id", "proof_record_id", "approval_id", "approval_decision", "approval_fingerprint",
  "exact_target_or_scope", "expected_target_alias", "expected_commit_alias", "requested_operation", "time_window", "operator", "required_approver",
  "evidence_retention_location", "stop_owner", "rollback_owner", "source_timestamp", "observed_deployed_target_binding", "observed_deployed_commit_binding",
  "target_match", "commit_match", "proof_completeness", "freshness", "no_merge_ci_build_local_inference",
  "migration_config_binding_git_merge_deploy_live_public_paid_go_activation_external_authorization_or_execution", "closure_outcome", "proof_record_fingerprint"
];
const b1DeployedTargetProofReadOnlyOperation = "sanitized-deployed-target-proof-read-only";
const b1ExternalPrerequisiteResultRecordFields = ["record_status", "record_type", "external_result_record_id", "reference_child_id", "reference_child_approval_id", "reference_child_approval_fingerprint", "exact_target_or_scope", "external_lane_approval_id", "external_lane_approval_decision", "source", "time_window", "source_timestamp", "completion_status", "outcome", "evidence_retention_location", "stop_owner", "rollback_owner", "nc_r1_execution_or_authorization", "sensitive_configuration_binding_value_retention", "external_result_record_fingerprint"];
const signedEvidenceRecordFields = ["evidence_record_id", "evidence_record_type", "source", "classification", "authority", "fingerprint", "source_timestamp"];
const b2ScenarioResultRecordFields = ["record_status", "scenario_result_id", "b2_child_id", "b2_approval_fingerprint", "b2_execution_id", "target_scope_alias", "time_window", "b1_fingerprint", "signed_evidence_fingerprint", "scenario_id", "canonical_outcome", "sanitized_outcome", "paid_transition_count", "provider_call_count", "usage_commit_count", "checkout_creation_count", "entitlement_write_count", "cross_scope_access_count", "output_state", "success_state", "source_timestamp", "freshness", "result_fingerprint"];
const b2BoundedLivePaidFlowVerificationOperation = "bounded-non-public-live-paid-flow-verification-only";
const b2AggregateLiveOperationResultRecordFields = ["record_status", "record_type", "aggregate_record_id", "evidence_id", "child_id", "approval_id", "approval_fingerprint", "requested_operation", "b2_execution_id", "exact_target_or_scope", "target_scope_alias", "time_window", "b1_deployed_fingerprint", "signed_evidence_record_id", "signed_evidence_source", "signed_evidence_classification", "signed_evidence_authority", "signed_evidence_fingerprint", "ordered_b2_scenario_result_ids", "ordered_b2_scenario_result_fingerprints", "scenario_results_aggregate_fingerprint", "source_timestamp", "freshness", "aggregate_outcome", "side_effect_summary", "positive_paid_result", "compatible_active_signed_subscription", "signed_authority_status", "b1_deployed_binding", "expected_paid_transition_count", "provider_calls_after_budget_quota_rejection", "usage_commits_after_provider_failure", "output_after_post_provider_commit_rejection", "success_after_post_provider_commit_rejection", "final_state", "unexpected_paid_transitions", "closure_eligibility", "nonclosure_reason", "closure_disposition", "evidence_retention_location", "stop_owner", "rollback_owner", "extra_authorization_or_execution", "aggregate_record_fingerprint"];
const workerCpuSchemaManualResultCapabilityFields = [
  "schema_dataset_available",
  "sum_requests_available",
  "quantiles_cpu_time_p50_available",
  "quantiles_cpu_time_p99_available",
  "sampling_disclosure_capability",
  "confidence_metadata_capability",
  "exact_target_filter_capability",
  "full_window_aggregation_capability",
  "node_limit_disclosure",
  "pagination_capability",
  "non_truncation_provable"
];
const workerCpuSchemaManualResultFreshness = {
  time_zone: "Asia/Tokyo",
  window_start: "2026-08-09T00:00:00+09:00",
  anchor: "2026-08-09T23:59:59+09:00",
  window: "2026-08-09T00:00:00+09:00/2026-08-09T23:59:59+09:00"
};
const workerCpuSchemaManualResultProhibitedNoFields = [
  "raw_response_credential_account_tag_private_script_name_retained",
  "raw_response_credential_account_tag_private_script_name_shared",
  "credential_creation_retrieval_disclosure",
  "credential_token_api_key_retained_or_shared",
  "codex_browser_or_graphql_control",
  "workers_logs_trace_query_builder_logpush_tail_opened",
  "raw_events_raw_requests_retained_or_shared"
];
const workerCpuSchemaManualResultProhibitedNoneFields = [
  "settings_configuration_read_action",
  "settings_configuration_write_action",
  "provider_stripe_supabase_product_price_legal_copy_risk_acceptance_live_flow_deploy_activation_git_cleanup_action"
];
const canonicalWorkerCpuSchemaManualResultTemplateFields = {
  template_status: "not-observed-non-evidence",
  observed_at: "<required-rfc3339-observed-at>",
  freshness_time_zone: workerCpuSchemaManualResultFreshness.time_zone,
  freshness_anchor: workerCpuSchemaManualResultFreshness.anchor,
  freshness_window: workerCpuSchemaManualResultFreshness.window,
  target_match: "<required-exact-or-mismatched-or-unconfirmed>",
  authentication_result: "<required-authenticated-or-unavailable-or-unconfirmed>",
  schema_transport_result: "<required-available-or-unavailable-or-unconfirmed>",
  schema_dataset_available: "<required-available-or-unavailable-or-unconfirmed>",
  sum_requests_available: "<required-available-or-unavailable-or-unconfirmed>",
  quantiles_cpu_time_p50_available: "<required-available-or-unavailable-or-unconfirmed>",
  quantiles_cpu_time_p99_available: "<required-available-or-unavailable-or-unconfirmed>",
  sampling_disclosure_capability: "<required-available-or-unavailable-or-unconfirmed>",
  confidence_metadata_capability: "<required-available-or-unavailable-or-unconfirmed>",
  exact_target_filter_capability: "<required-available-or-unavailable-or-unconfirmed>",
  full_window_aggregation_capability: "<required-available-or-unavailable-or-unconfirmed>",
  node_limit_disclosure: "<required-available-or-unavailable-or-unconfirmed>",
  pagination_capability: "<required-available-or-unavailable-or-unconfirmed>",
  non_truncation_provable: "<required-available-or-unavailable-or-unconfirmed>",
  raw_response_credential_account_tag_private_script_name_retained: "no",
  raw_response_credential_account_tag_private_script_name_shared: "no",
  credential_creation_retrieval_disclosure: "no",
  credential_token_api_key_retained_or_shared: "no",
  codex_browser_or_graphql_control: "no",
  workers_logs_trace_query_builder_logpush_tail_opened: "no",
  raw_events_raw_requests_retained_or_shared: "no",
  settings_configuration_read_action: "none",
  settings_configuration_write_action: "none",
  provider_stripe_supabase_product_price_legal_copy_risk_acceptance_live_flow_deploy_activation_git_cleanup_action: "none",
  incremental_charge: "no",
  stop_result: "<required-sanitized-stop-result>",
  result_status: "<required-complete-or-partial-stop>",
  data_query_executed: "no",
  row_closure: "none"
};
const canonicalA1WorkerCpuObservedResultTemplateFields = {
  record_status: "<required-approved-completed-or-approved-partial-stop-authenticated-private-read>",
  evidence_id: "EVID-WORKER-CPU",
  child_id: "A1-worker-cpu-evidence-read",
  approval_id: "<required-exact-approved-A1-approval-id>",
  approval_decision: "<required-approved>",
  approval_fingerprint: "<required-sha256-approval-fingerprint>",
  exact_target_or_scope: "<required-exact-approved-target-or-scope>",
  time_window: "<required-exact-approved-time-window>",
  operator: "<required-exact-approved-operator>",
  source_disposition_fingerprint: "<required-exact-A1-source-disposition-fingerprint>",
  observed_at: "<required-rfc3339-Asia-Tokyo-observed-at>",
  target_match: "<required-exact-or-unconfirmed-or-mismatched>",
  aggregation_complete: "<required-yes-or-no-or-unknown>",
  request_completeness: "<required-complete-or-incomplete-or-unknown>",
  headroom_disposition: "<required-approved-or-insufficient-or-unconfirmed>",
  sampling_confidence_completeness: "<required-complete-or-incomplete-or-unknown>",
  raw_numeric_metrics_response_account_tag_private_script_credential_retained_or_shared: "no",
  trace_logs_dashboard_reopened_outside_exact_approved_surface: "no",
  provider_billing_configuration_or_write_action: "none",
  codex_browser_or_control: "none",
  incremental_charge: "no",
  stop_result: "<required-sanitized-stop-result>",
  result_status: "<required-complete-or-partial-stop>",
  row_closure: "<required-EVID-WORKER-CPU-for-complete-or-none-for-partial-stop>",
  a1_result_fingerprint: "<required-sha256-A1-result-fingerprint>",
  observed_record_fingerprint: "<required-sha256-observed-record-fingerprint>"
};
const a1WorkerCpuObservedResultRecordFields = Object.keys(canonicalA1WorkerCpuObservedResultTemplateFields);
const canonicalTaskOperationalFields = {
  current_approved_boundary: "creator-nc-r1-approved-evid-sla-posture-closure-worker-cpu-reread-partial-stop-a1-source-disposition-satisfied-a1-graphql-transport-partial-stop-completed-and-a1-graphql-execution-path-disposition-approved-and-a1-graphql-schema-manual-approved-not-started",
  implementation_status: "pr751-draft-nc-r1-staged-resolution-control-plane"
};
const canonicalHistoricalPr750LocalApprovalPacketFields = {
  packet_execution_status: "completed-local",
  packet_item_count: "1",
  primary_approval_unit: "local-dependency-setup-blocked",
  evidence_ids: historicalPr750LocalRevalidationEvidenceIds.join(","),
  requested_operation: "lockfile-matched-dependency-install-historical-pr750-worktree-only",
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
const canonicalCompletedWorkerCpuReReadPartialStopPacketFields = {
  packet_execution_status: "approved-partial-stop-authenticated-private-read",
  packet_item_count: "1",
  approval_unit: "authenticated-private-read",
  evidence_ids: "EVID-WORKER-CPU",
  requested_operation: "authenticated-private-re-read-worker-cpu-aggregation-and-request-completeness-only",
  target_alias: "creator-production-worker",
  verification_scope: "sanitized-aggregation-complete-indicator-and-request-level-completeness-only",
  time_window: "2026-08-09-current-Codex-task-only",
  operator: "Codex-root-agent-current-task",
  required_approver: "kurodev",
  approval_id: "NC-R1-WORKER-CPU-REREAD-20260809-01",
  evidence_retention_location: "current-Codex-task-sanitized-report",
  stop_owner: "kurodev",
  rollback_owner: "kurodev",
  partial_stop_result: "required-if-aggregation-or-request-completeness-unavailable",
  prohibited_bundle: "provider,Stripe,Supabase,Product-or-Price,legal,copy,risk,live-paid-flow,deploy,activation,git-publication,cleanup",
  approval_decision: "approved",
  observed_at: "2026-08-09T12:55:12+09:00",
  target_match: "yes",
  authenticated_dashboard_read: "completed-approved-worker-cpu-surface-only",
  percentile_summary_visible: "yes",
  selected_range_visible: "yes",
  explicit_aggregation_completeness: "not-displayed",
  explicit_sampling_disclosure: "not-displayed",
  explicit_request_level_completeness: "not-displayed",
  request_rows_visible: "no",
  request_table_visible: "no",
  trace_log_explorer_logs_raw_requests_other_service_settings_plan_configuration_surface_opened: "no",
  settings_write_plan_deploy_activation_action: "none",
  raw_url_account_service_deployment_version_private_identifier_metric_value_request_data_raw_log_raw_payload_incidental_dashboard_content_retained: "no",
  evidence_class: "gated",
  freshness: "fresh",
  target: "exact",
  approval: "approved",
  hard_requirement: "yes",
  production_proof: "no",
  status: "incomplete",
  row_closure: "none",
  activation_status: "closed",
  result: "partial-stop-completeness-unavailable"
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
const canonicalCompletedSlaPostureDecisionFields = {
  packet_execution_status: "approved-completed-release-owner-judgment",
  packet_item_count: "1",
  approval_unit: "release-owner-judgment",
  evidence_ids: "EVID-SLA",
  requested_operation: "release-owner-judgment-sla-posture-only",
  command: "<no-command-authorized>",
  external_action: "none",
  required_approver: "kurodev",
  approval_id: "NC-R1-SLA-POSTURE-20260807-01",
  scope_alias: "creator-paid-sla-posture",
  effective_date: "2026-08-07",
  decision_input: "independent-sla-posture-only",
  service_owner: "kurodev",
  availability_commitment: "explicit-no-contractual-availability-sla",
  maintenance_exclusion: "best-effort-maintenance-without-advance-notice-guarantee-and-provider-platform-network-exclusions",
  response_or_restoration_target: "explicit-no-guaranteed-response-or-restoration-time",
  measurement_source: "none-no-contractual-sla",
  owner_decision: "approved-no-guaranteed-sla-posture",
  evidence_retention_location: "current-Codex-task-sanitized-report",
  stop_owner: "kurodev",
  rollback_owner: "kurodev",
  prohibited_bundle: "support-reopening,legal-or-copy-or-product-price-or-risk-judgment,external-operation,deploy,activation,git-publication",
  row_closure: "EVID-SLA",
  activation_status: "closed",
  approval_decision: "approved",
  evidence_class: "gated",
  freshness: "fresh",
  target: "exact",
  hard_requirement: "yes",
  production_proof: "no",
  status: "satisfied",
  stop_result: "completed-documentation-only-sla-posture-decision"
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
const canonicalHistoricalPr750LocalVerificationFields = {
  historical_pr750_worktree_node_modules: "present-lockfile-matched",
  historical_pr750_worktree_dependency_checks: "completed-local",
  historical_pr750_worktree_dependency_install: "approved-completed-local",
  historical_pr750_worktree_lint: "passed-local",
  historical_pr750_worktree_strict_typecheck: "passed-local",
  historical_pr750_worktree_next_build: "passed-local",
  historical_pr750_worktree_opennext_build: "passed-local",
  historical_pr750_worktree_public_entitlement_contract: "passed-local",
  historical_pr750_worktree_security_privacy_contract: "passed-local",
  historical_pr750_worktree_product_check_status: "passed-local-no-product-failure-claim",
  historical_pr750_worktree_local_approval_id: "NC-R1-LOCAL-DEPS-20260806-01",
  historical_pr750_worktree_local_approval_status: "completed-local",
  historical_pr750_worktree_local_observed_at: "2026-08-06T19:38+09:00",
  historical_pr750_worktree_local_target_alias: "dcb5-nc-r1-evidence-clearance",
  historical_pr750_worktree_local_operator: "Codex-root-agent-current-task",
  historical_pr750_worktree_local_evidence_retention_location: "current-Codex-task-sanitized-report",
  historical_pr750_worktree_local_required_approver: "kurodev",
  historical_pr750_worktree_local_stop_owner: "kurodev",
  historical_pr750_worktree_local_rollback_owner: "kurodev",
  historical_pr750_worktree_package_json_sha256: "D28E0445B69199FB639E7EE193313D2E82DE15B9300C06CE179A3CD25AE80E91",
  historical_pr750_worktree_package_lock_sha256: "0F3B1074691B8296E1E6C957C469DCB536B6C67B90890170600D7F50AEA138C8",
  historical_pr750_worktree_node_version: "v22.22.2",
  historical_pr750_worktree_npm_version: "10.9.7",
  historical_pr750_worktree_runtime_source_changes_outside_authority_files: "none",
  historical_pr750_worktree_observed_head: "60d8b86f98bfe9465afdf9fa22e7052c0169b993",
  historical_pr750_worktree_wrangler_version: "4.95.0",
  historical_pr750_worktree_worker_dry_run_exit: "0",
  historical_pr750_worktree_worker_reported_total_kib: "9477.99",
  historical_pr750_worktree_worker_reported_gzip_kib: "2046.83",
  historical_pr750_worktree_worker_conservative_upper_bound_bytes: "2095960",
  historical_pr750_worktree_worker_internal_ceiling_bytes: "3000000",
  historical_pr750_worktree_worker_conservative_remaining_bytes: "904040",
  historical_pr750_worktree_opennext_artifact_file_count: "1881",
  historical_pr750_worktree_opennext_artifact_total_bytes: "128538687",
  historical_pr750_worktree_opennext_artifact_tree_manifest_sha256: "A7DDD9243821CD194A217971CECD71534D2CE03731638735D093A30FC1552B07",
  historical_pr750_worktree_opennext_artifact_fingerprint_algorithm: "unicode-code-point-sorted-relative-forward-slash-path-tab-byte-length-tab-lowercase-file-sha256-joined-lf-then-sha256",
  historical_pr750_worktree_worker_entry_sha256: "D05223BF4D44C84108A102AB62AA3BC9C5568F0C3AC2064C37BE5CC65C64BC45",
  historical_pr750_worktree_worker_entry_bytes: "2278",
  historical_pr750_worktree_worker_size_evidence_scope: "local-artifact-acceptance-only-not-account-headroom-deployed-or-production-proof",
  historical_pr750_worktree_command_results_authority: "root-observed-sanitized-historical-snapshot"
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

const canonicalHistoricalPr750LocalRevalidationRows = historicalPr750LocalRevalidationEvidenceIds.map((id) => ({
  id,
  classification: "completed-local-dependency-revalidation"
}));

function parseHistoricalPr750LocalRevalidationRows(markdown) {
  return [...markdown.matchAll(
    /^\| (EVID-[A-Z0-9-]+) \| (completed-local-dependency-revalidation) \| [^|]+ \|$/gm
  )].map((match) => ({ id: match[1], classification: match[2] }));
}

function validateHistoricalPr750LocalRevalidationRows(rows, evidenceRows) {
  assert.deepEqual(rows, canonicalHistoricalPr750LocalRevalidationRows, "historical PR #750 local dependency revalidation rows must retain exact membership and classification");
  for (const row of evidenceRows.filter((entry) => historicalPr750LocalRevalidationEvidenceIds.includes(entry.id))) {
    assert.deepEqual(
      row,
      { id: row.id, evidenceClass: "local", freshness: "fresh", target: "exact", approval: "approved", hardRequirement: "yes", productionProof: "no", status: "satisfied" },
      `${row.id} must retain only historical PR #750 worktree local satisfied evidence`
    );
  }
}

function assertHistoricalReferenceCannotSupersedeHistoricalPr750LocalRow({ evidenceId, historicalAuthority, historicalPr750Status, historicalPr750Verification }) {
  assert.ok(historicalPr750LocalRevalidationEvidenceIds.includes(evidenceId), "historical-reference guard applies only to the three historical PR #750 local rows");
  assert.equal(historicalAuthority, "non-authoritative-reference-only", "historical PR #749 evidence must remain non-authoritative for current closure");
  assert.equal(historicalPr750Status, "satisfied", "completed historical PR #750 worktree local revalidation must retain satisfied status");
  assert.equal(historicalPr750Verification, "historical-pr750-worktree-post-approved-install-local-read-only-revalidation", "historical metadata cannot supersede the exact historical PR #750 local closure record");
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
  assert.equal(otherHardRequirementsSatisfied, true, "EVID-RISK-ACCEPTANCE is forbidden before the other 8 currently unresolved hard requirements are satisfied");
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
  const section = markdown.match(/## Approved-Not-Started Worker CPU Manual Schema-Capability Packet\r?\n([\s\S]*?)(?=\r?\n## |$)/);
  assert.ok(section, "missing approved-not-started Worker CPU manual schema-capability packet section");
  const entries = [...section[1].matchAll(/^([a-z0-9_]+)=([^\r\n]+)$/gm)].map((match) => [match[1], match[2].trim()]);
  assert.equal(new Set(entries.map(([field]) => field)).size, entries.length, "approved-not-started Worker CPU manual schema-capability packet fields must not repeat");
  return { section: section[1], fields: Object.fromEntries(entries) };
}

function parseCompletedA0ProvisionalCostModelApproval(markdown) {
  const section = sectionBody(markdown, "## Completed A0 Provisional Cost-Model Input Approval");
  const fields = parseExactTextBlock(section);
  return { section, fields };
}

function parseUnapprovedA2ProviderFundingRequirementDisposition(markdown) {
  const section = sectionBody(markdown, "## Unapproved A2 Provider Funding-Requirement Disposition Proposal");
  return { section, fields: parseExactTextBlock(section) };
}

function parseA2FundingRequirementDispositionResultTemplate(markdown) {
  const section = sectionBody(markdown, "## Exact Non-Evidence A2 Provider Funding-Requirement Disposition Result Template");
  return { section, fields: parseExactTextBlock(section) };
}

function parseA2FundingDispositionOwnerApprovalTemplate(markdown) {
  const section = sectionBody(markdown, "## Exact Non-Evidence A2 Provider Funding-Requirement Disposition Owner Approval Template");
  return { section, fields: parseExactTextBlock(section) };
}

function parseUnapprovedA3StripePricingDocumentManualPacket(markdown) {
  const section = sectionBody(markdown, "## Unapproved A3 Stripe Account-Pricing Document Manual Packet");
  return { section, fields: parseExactTextBlock(section) };
}

function parseA3StripePricingDocumentResultTemplate(markdown) {
  const section = sectionBody(markdown, "## Exact Non-Evidence A3 Stripe Account-Pricing Document Result Template");
  return { section, fields: parseExactTextBlock(section) };
}

function parseA3ManualReadOwnerApprovalTemplate(markdown) {
  const section = sectionBody(markdown, "## Exact Non-Evidence A3 Stripe Account-Pricing Manual-Read Owner Approval Template");
  return { section, fields: parseExactTextBlock(section) };
}

function parseA2ProviderCostObservedResultTemplate(markdown) {
  const section = sectionBody(markdown, "## Exact Non-Evidence A2 Provider Cost Observed Result Template");
  return { section, fields: parseExactTextBlock(section) };
}

function parseA1WorkerCpuObservedResultTemplate(markdown) {
  const section = sectionBody(markdown, "## Exact Non-Evidence A1 Worker CPU Observed Result Template");
  return { section, fields: parseExactTextBlock(section) };
}

function parseA1WorkerCpuObservedResultRecord(markdown) {
  const section = sectionBody(markdown, "## Completed A1 Worker CPU Sanitized Observed Result");
  const exactFence = section.trim().match(/^```text\r?\n([\s\S]*?)\r?\n```$/);
  assert.ok(exactFence, "A1 observed result must contain nothing outside its single text fence");
  const entries = exactFence[1].split(/\r?\n/).map((line) => {
    const pair = line.match(/^([a-z0-9_]+)=([^\s\r\n](?:[^\r\n]*[^\s\r\n])?)$/);
    assert.ok(pair, "A1 observed result requires every text-fence line to use strict key=value syntax");
    return [pair[1], pair[2].trim()];
  });
  assert.equal(new Set(entries.map(([field]) => field)).size, entries.length, "A1 observed result fields must be unique");
  return { section, fields: Object.fromEntries(entries) };
}

function parseA2ProviderCostObservedResultRecord(markdown) {
  const section = sectionBody(markdown, "## Completed A2 Provider Cost Sanitized Result");
  const exactFence = section.trim().match(/^```text\r?\n([\s\S]*?)\r?\n```$/);
  assert.ok(exactFence, "A2 observed result must contain nothing outside its single text fence");
  const entries = exactFence[1].split(/\r?\n/).map((line) => {
    const pair = line.match(/^([a-z0-9_]+)=([^\r\n]+)$/);
    assert.ok(pair, "A2 observed result requires every text-fence line to use strict key=value syntax");
    return [pair[1], pair[2].trim()];
  });
  assert.equal(new Set(entries.map(([field]) => field)).size, entries.length, "A2 observed result fields must be unique");
  return { section, fields: Object.fromEntries(entries) };
}

function parseA3StripeObservedResultRecord(markdown) {
  const section = markdown.includes("## Completed A3 Stripe Account-Pricing Document Sanitized Result")
    ? sectionBody(markdown, "## Completed A3 Stripe Account-Pricing Document Sanitized Result")
    : markdown;
  const fields = parseStrictExactTextFence(section.trim(), a3StripeObservedResultRecordFields, "A3 observed result");
  assertA3SanitizedRecordValues(fields, "A3 observed result");
  assertA3NonAuthorizingRecordValues(fields, "A3 observed result");
  return { section, fields };
}

function parseA3ManualReadOwnerApprovalRecord(text) {
  const fields = parseStrictExactTextFence(text.trim(), a3ManualReadOwnerApprovalRecordFields, "A3 manual-read owner approval");
  assertA3SanitizedRecordValues(fields, "A3 manual-read owner approval");
  assertA3NonAuthorizingRecordValues(fields, "A3 manual-read owner approval");
  return { fields };
}

function parseA4ProductPriceJudgmentResultRecord(text) {
  const exactFence = text.match(/^```text\r?\n([\s\S]*?)\r?\n```$/);
  assert.ok(exactFence, "A4 owner-judgment result must contain exactly one text fence and nothing outside it");
  const entries = exactFence[1].split(/\r?\n/).map((line) => {
    const pair = line.match(/^([a-z0-9_]+)=([^\s\r\n]+)$/);
    assert.ok(pair, "A4 owner-judgment result requires every text-fence line to use strict key=value syntax without whitespace");
    return [pair[1], pair[2]];
  });
  assert.equal(new Set(entries.map(([field]) => field)).size, entries.length, "A4 owner-judgment result fields must be unique");
  const fields = Object.fromEntries(entries);
  assert.deepEqual(Object.keys(fields).sort(), [...a4ProductPriceJudgmentResultRecordFields].sort(), "A4 owner-judgment result requires the exact closed schema");
  return { fields };
}

function parseA5LegalJudgmentResultRecord(text) {
  const exactFence = text.match(/^```text\r?\n([\s\S]*?)\r?\n```$/);
  assert.ok(exactFence && exactFence[0] === text, "A5 legal/tax owner-judgment result must contain exactly one text fence and nothing outside it");
  const entries = exactFence[1].split(/\r?\n/).map((line) => {
    const pair = line.match(/^([a-z0-9_]+)=([^\s\r\n]+)$/);
    assert.ok(pair, "A5 legal/tax owner-judgment result requires every text-fence line to use strict key=value syntax without whitespace");
    return [pair[1], pair[2]];
  });
  assert.equal(new Set(entries.map(([field]) => field)).size, entries.length, "A5 legal/tax owner-judgment result fields must be unique");
  const fields = Object.fromEntries(entries);
  assert.deepEqual(Object.keys(fields).sort(), [...a5LegalJudgmentResultRecordFields].sort(), "A5 legal/tax owner-judgment result requires the exact closed schema");
  return { fields };
}

function parseA6CopyJudgmentResultRecord(text) {
  const exactFence = text.match(/^```text\r?\n([\s\S]*?)\r?\n```$/);
  assert.ok(exactFence && exactFence[0] === text, "A6 Copy owner-judgment result must contain exactly one text fence and nothing outside it");
  const entries = exactFence[1].split(/\r?\n/).map((line) => {
    const pair = line.match(/^([a-z0-9_]+)=([^\s\r\n]+)$/);
    assert.ok(pair, "A6 Copy owner-judgment result requires every text-fence line to use strict lowercase key=value syntax without whitespace");
    return [pair[1], pair[2]];
  });
  assert.equal(new Set(entries.map(([field]) => field)).size, entries.length, "A6 Copy owner-judgment result fields must be unique");
  const fields = Object.fromEntries(entries);
  assert.deepEqual(Object.keys(fields).sort(), [...a6CopyJudgmentResultRecordFields].sort(), "A6 Copy owner-judgment result requires the exact closed schema");
  return { fields };
}

function parseA2FundingRequirementDispositionResultRecord(text) {
  return { fields: parseStrictExactTextFence(text, a2FundingRequirementDispositionResultRecordFields, "A2 funding-requirement disposition result") };
}

function parseA2FundingDispositionOwnerApprovalRecord(text) {
  return { fields: parseStrictExactTextFence(text, a2FundingDispositionOwnerApprovalRecordFields, "A2 funding-disposition owner approval") };
}

function parseWorkerCpuSchemaManualResultTemplate(markdown) {
  const section = markdown.match(/## Exact Non-Evidence Worker CPU Manual Schema-Capability Result Template\r?\n([\s\S]*?)(?=\r?\n## |$)/);
  assert.ok(section, "missing non-evidence Worker CPU manual schema-capability result template section");
  const entries = [...section[1].matchAll(/^([a-z0-9_]+)=([^\r\n]+)$/gm)].map((match) => [match[1], match[2].trim()]);
  assert.equal(new Set(entries.map(([field]) => field)).size, entries.length, "non-evidence Worker CPU manual schema-capability result template fields must not repeat");
  return { section: section[1], fields: Object.fromEntries(entries) };
}

function parseHistoricalPr750LocalApprovalPacket(markdown) {
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

function parseCompletedWorkerCpuReReadPartialStopPacket(markdown) {
  const section = markdown.match(/## Completed Authenticated-Private Worker CPU Re-Read Partial-Stop Evidence\r?\n([\s\S]*?)(?=\r?\n## |$)/);
  assert.ok(section, "missing completed Worker CPU re-read partial-stop evidence section");
  const entries = [...section[1].matchAll(/^([a-z0-9_]+)=([^\r\n]+)$/gm)].map((match) => [match[1], match[2].trim()]);
  assert.equal(new Set(entries.map(([field]) => field)).size, entries.length, "Worker CPU re-read partial-stop fields must not repeat");
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

function parseCompletedSlaPostureDecision(markdown) {
  const section = markdown.match(/## Completed Release-Owner SLA Posture Decision\r?\n([\s\S]*?)(?=\r?\n## |$)/);
  assert.ok(section, "missing completed release-owner SLA posture decision section");
  const entries = [...section[1].matchAll(/^([a-z0-9_]+)=([^\r\n]+)$/gm)].map((match) => [match[1], match[2].trim()]);
  assert.equal(new Set(entries.map(([field]) => field)).size, entries.length, "completed SLA posture decision fields must not repeat");
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

function assertNoUnsupportedWorkerCpuReReadClaims(section) {
  assertNoUnsupportedWorkerCpuClaims(section);
  assert.doesNotMatch(section, /\b(?:observed\s+)?(?:p50|p90|p99|p999|percentile(?:\s+(?:p50|p90|p99|p999))?)(?:\s*(?:=|:|is|was))?\s*\d+(?:\.\d+)?\s*ms\b/i, "Worker CPU re-read must not retain a percentile metric value");
  const unsafeHeadroomConclusion = String.raw`\b(?:CPU\s+)?(?:headroom|remaining(?:\s+(?:CPU|capacity|headroom))?)\b(?:[^\r\n]{0,60})\b(?:is|was|means|proves|demonstrates|shows|indicates|confirms)\b[^\r\n]{0,60}\b(?:safe|within|sufficient|positive|available|adequate)\b`;
  assert.doesNotMatch(section, new RegExp(unsafeHeadroomConclusion, "i"), "Worker CPU re-read must not retain an unsafe headroom or remaining-capacity conclusion");
  const unsafePercentageConclusion = String.raw`\b(?:CPU\s+)?(?:percentage|percent)\b(?:[^\r\n]{0,60})\b(?:is|was|means|proves|demonstrates|shows|indicates|confirms)\b[^\r\n]{0,60}\b(?:safe|within|sufficient|positive|available|adequate)\b`;
  assert.doesNotMatch(section, new RegExp(unsafePercentageConclusion, "i"), "Worker CPU re-read must not retain an unsafe percentage inference");
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

function validateCompletedWorkerCpuReReadPartialStopPacket(packet) {
  assert.deepEqual(packet.fields, canonicalCompletedWorkerCpuReReadPartialStopPacketFields, "Worker CPU re-read partial-stop evidence must retain the exact approved scope and sanitized incomplete result");
  assert.equal(packet.fields.evidence_ids, "EVID-WORKER-CPU", "Worker CPU re-read partial-stop evidence must retain the exact approved plural evidence_ids field");
  assertAuthenticatedPrivateFreshness(packet.fields.observed_at);
  assert.match(packet.section, /closes no row|row_closure=none/i, "Worker CPU re-read partial-stop evidence must close no row");
  assert.match(packet.section, /aggregation completeness.*not displayed|explicit_aggregation_completeness=not-displayed/i, "Worker CPU re-read must retain missing aggregation completeness");
  assert.match(packet.section, /sampling disclosure.*not displayed|explicit_sampling_disclosure=not-displayed/i, "Worker CPU re-read must retain missing sampling disclosure");
  assert.match(packet.section, /request-level completeness.*not displayed|explicit_request_level_completeness=not-displayed/i, "Worker CPU re-read must retain missing request-level completeness");
  assert.match(packet.section, /request rows.*not displayed|request_rows_visible=no/i, "Worker CPU re-read must retain absent request rows");
  assert.match(packet.section, /request table.*not displayed|request_table_visible=no/i, "Worker CPU re-read must retain absent request table");
  assert.match(packet.section, /No Trace, Log Explorer, logs, raw requests, other service, settings, plan, or configuration surface was opened|trace_log_explorer_logs_raw_requests_other_service_settings_plan_configuration_surface_opened=no/i, "Worker CPU re-read must retain no scope expansion");
  assert.match(packet.section, /No settings, write, plan, deploy, activation, or other external action occurred|settings_write_plan_deploy_activation_action=none/i, "Worker CPU re-read must retain the no-operation boundary");
  assertNoUnsupportedWorkerCpuReReadClaims(packet.section);
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
    unresolvedHardRequirements: 9
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

function validateCompletedSlaPostureDecision(packet) {
  assert.deepEqual(packet.fields, canonicalCompletedSlaPostureDecisionFields, "completed SLA posture decision must retain the exact approved documentation-only judgment and row-only closure");
  assert.equal(packet.fields.evidence_ids, "EVID-SLA", "completed SLA posture decision must close only EVID-SLA");
  assert.equal(packet.fields.approval_unit, "release-owner-judgment", "completed SLA posture decision must remain an owner judgment");
  assert.equal(packet.fields.command, "<no-command-authorized>", "completed SLA posture decision must authorize no command");
  assert.equal(packet.fields.external_action, "none", "completed SLA posture decision must authorize no external action");
  assert.equal(packet.fields.activation_status, "closed", "completed SLA posture decision must preserve closed activation");
  assert.equal(packet.fields.production_proof, "no", "completed SLA posture decision must not become production proof");
  assert.equal(packet.fields.service_owner, "kurodev", "completed SLA posture decision requires kurodev as sole service owner");
  assert.equal(packet.fields.stop_owner, "kurodev", "completed SLA posture decision requires kurodev as sole stop owner");
  assert.equal(packet.fields.rollback_owner, "kurodev", "completed SLA posture decision requires kurodev as sole rollback owner");
  assert.match(packet.section, /closes exactly EVID-SLA and no other row|row_closure=EVID-SLA/i, "completed SLA posture decision must close exactly EVID-SLA");
  assert.doesNotMatch(packet.section, /(?:guaranteed|committed)\s+(?:availability|response|restoration|response time|restoration time)/i, "completed SLA posture decision must not establish a guarantee");
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

function validateHistoricalPr750LocalApprovalPacket(packet) {
  assert.deepEqual(packet.fields, canonicalHistoricalPr750LocalApprovalPacketFields, "historical PR #750 local approval record must retain the exact approved local install scope and sanitized result");
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

function validateCompletedWorkerCpuExecutionPathDisposition(packet) {
  assert.deepEqual(packet.fields, canonicalCompletedWorkerCpuExecutionPathDispositionPacketFields, "completed Worker CPU execution-path disposition must retain exactly the approved documentation-only owner selection");
  assert.match(packet.section, /approved documentation-only release-owner judgment/i, "completed Worker CPU execution-path disposition must remain documentation-only");
  assert.match(packet.section, /does not authorize GraphQL, GraphiQL, Chrome, query, credential, or external action/i, "completed Worker CPU execution-path disposition must not authorize an operation");
  assert.match(packet.section, /closes no row/i, "completed Worker CPU execution-path disposition must close no row");
}

function assertNextSchemaExecutionSurfaceIsNotProhibited(fields) {
  const prohibited = new Set(fields.prohibited_bundle.split(","));
  const requiresGraphiql = /graphiql/i.test(`${fields.requested_operation},${fields.execution_surface}`);
  if (requiresGraphiql) {
    assert.ok(!prohibited.has("GraphiQL"), "approved-not-started Worker CPU manual schema-capability packet cannot require and prohibit GraphiQL");
  }
  assert.ok(!prohibited.has("Chrome"), "approved-not-started Worker CPU manual schema-capability packet must not generically prohibit Chrome when browser use is constrained to its named Kurodev surface");
  assert.equal(fields.permitted_execution_surface, "kurodev-operated-cloudflare-graphql-client-or-graphiql-existing-credential-never-shared-schema-only", "approved-not-started Worker CPU manual schema-capability packet must limit any future execution to the named Kurodev GraphQL-client-or-GraphiQL surface");
  assert.equal(fields.browser_execution_scope, "kurodev-operated-named-existing-authenticated-client-schema-only-no-Codex-control", "approved-not-started Worker CPU manual schema-capability packet must confine any browser use to Kurodev's named schema-only client without Codex control");
  assert.equal(fields.prohibited_operator, "Codex", "approved-not-started Worker CPU manual schema-capability packet must prohibit Codex operation of GraphiQL or Chrome");
  assert.ok(prohibited.has("Codex-operated-GraphiQL"), "approved-not-started Worker CPU manual schema-capability packet must prohibit Codex-operated GraphiQL");
  assert.ok(prohibited.has("Codex-operated-Chrome"), "approved-not-started Worker CPU manual schema-capability packet must prohibit Codex-operated Chrome");
}

function validateNextApprovalPacket(packet) {
  for (const field of nextWorkerCpuSchemaManualRequiredApprovalFields) {
    assert.ok(packet.fields[field], `approved-not-started Worker CPU manual schema-capability packet requires ${field}`);
  }
  assertNextSchemaExecutionSurfaceIsNotProhibited(packet.fields);
  assert.deepEqual(packet.fields, canonicalNextApprovalPacketFields, "approved-not-started Worker CPU manual schema-capability packet must retain the exact owner-approved, not-yet-executed scope");
  assert.equal(packet.fields.required_approver, "kurodev", "approved-not-started Worker CPU manual schema-capability packet must retain kurodev as required approver");
  assert.equal(packet.fields.stop_owner, "kurodev", "approved-not-started Worker CPU manual schema-capability packet must retain kurodev as stop owner");
  assert.equal(packet.fields.rollback_owner, "kurodev", "approved-not-started Worker CPU manual schema-capability packet must retain kurodev as rollback owner");
  assert.equal(packet.fields.command, "<no-Codex-command-authorized>", "approved-not-started Worker CPU manual schema-capability packet must not authorize a Codex command");
  assert.equal(packet.fields.external_action, "authorized-not-started-kurodev-manual-schema-capability-only", "approved-not-started Worker CPU manual schema-capability packet must remain Kurodev-only and not started");
  assert.equal(packet.fields.data_query_authorization, "none", "approved-not-started Worker CPU manual schema-capability packet must not authorize a data query");
  assert.equal(packet.fields.row_closure, "none-this-packet", "approved-not-started Worker CPU manual schema-capability packet must not close EVID-WORKER-CPU");
  assert.equal(packet.fields.separate_explicit_approval_required, "satisfied-by-current-owner-message", "approved-not-started Worker CPU manual schema-capability packet must bind the current explicit owner approval");
  assert.match(packet.section, /approved, not-started, authenticated-private-read schema-capability-only packet/i, "approved-not-started Worker CPU manual schema-capability packet must remain not started");
  assert.match(packet.section, /does not authorize a data query or credential creation, retrieval, or disclosure/i, "approved-not-started Worker CPU manual schema-capability packet must not authorize data or credential access");
  assert.match(packet.section, /schema-only cannot close the row or authorize a data query/i, "approved-not-started Worker CPU manual schema-capability packet must preserve the schema-only closure boundary");
}

function assertNoA0NumericCostModelClaims(fields) {
  const proposalText = `${fields.bound_input}\n${fields.cost_model_decision}`;
  assert.doesNotMatch(
    proposalText,
    /(?:\b(?:numeric[-_])?(?:price|margin|tax|cost)(?:[-_](?:jpy|usd|eur))?\s*(?:=|:)\s*[¥$€]?\d+(?:\.\d+)?\b|(?:\b(?:jpy|usd|eur)\b|[¥$€])\s*\d+(?:\.\d+)?)/i,
    "completed A0 provisional cost-model approval must not include numeric price, margin, tax, or cost claims"
  );
}

function validateCompletedA0ProvisionalCostModelApproval(packet) {
  const expectedFields = Object.keys(canonicalCompletedA0ProvisionalCostModelApprovalFields);
  const unknownFields = Object.keys(packet.fields).filter((field) => !expectedFields.includes(field));
  assert.equal(unknownFields.length, 0, `completed A0 provisional cost-model approval rejects unknown field(s): ${unknownFields.join(",")}`);
  for (const field of expectedFields) {
    assert.ok(Object.prototype.hasOwnProperty.call(packet.fields, field), `completed A0 provisional cost-model approval requires ${field}`);
  }
  assertNoA0NumericCostModelClaims(packet.fields);
  assert.ok(
    packet.fields.bound_input.split(";").includes("provider-usage-boundary:provider-executed-success-only-cache-hit-skip-failure-and-usage-commit-rejection-excluded"),
    "completed A0 provisional cost-model approval must preserve the exact provider usage boundary"
  );
  assert.doesNotMatch(
    packet.fields.bound_input,
    /\b(?:unsigned|redirect)\b/i,
    "completed A0 provisional cost-model approval must not substitute unsigned or redirect authority"
  );
  assert.equal(packet.fields.command, "<no-command-authorized>", "completed A0 provisional cost-model approval must not authorize a command");
  assert.equal(packet.fields.external_action, "none", "completed A0 provisional cost-model approval must not authorize an external action");
  assert.equal(packet.fields.provider_funding_authorization, "none", "completed A0 provisional cost-model approval must not authorize provider funding");
  assert.equal(packet.fields.stripe_payment_or_refund_authorization, "none", "completed A0 provisional cost-model approval must not authorize Stripe payment or refund");
  assert.equal(packet.fields.product_or_price_row_closure, "none", "completed A0 provisional cost-model approval must not close Product or Price");
  assert.equal(packet.fields.row_closure, "none", "completed A0 provisional cost-model approval must not close a row");
  assert.equal(packet.fields.production_proof, "no", "completed A0 provisional cost-model approval cannot claim production proof");
  assert.equal(packet.fields.activation_status, "closed", "completed A0 provisional cost-model approval must preserve closed activation");
  assert.equal(packet.fields.approval_decision, "approved", "completed A0 provisional cost-model approval must bind the explicit owner approval");
  assert.deepEqual(packet.fields, canonicalCompletedA0ProvisionalCostModelApprovalFields, "completed A0 provisional cost-model approval must retain the exact documentation-only scope");
  assert.match(packet.section, /approved, completed, documentation-only/i, "completed A0 provisional cost-model approval must record the documentation-only completion");
  assert.match(packet.section, /does not authorize A2, A3, funding, payment, external action, command execution, row closure, activation, or final GO/i, "completed A0 provisional cost-model approval must retain every authority boundary");
}

function validateUnapprovedA2ProviderFundingRequirementDisposition(packet) {
  const expectedFields = Object.keys(canonicalUnapprovedA2ProviderFundingRequirementDispositionFields);
  const unknownFields = Object.keys(packet.fields).filter((field) => !expectedFields.includes(field));
  assert.equal(unknownFields.length, 0, `unapproved A2 funding-requirement disposition rejects unknown field(s): ${unknownFields.join(",")}`);
  for (const field of expectedFields) assert.ok(Object.prototype.hasOwnProperty.call(packet.fields, field), `unapproved A2 funding-requirement disposition requires ${field}`);
  assert.deepEqual(packet.fields, canonicalUnapprovedA2ProviderFundingRequirementDispositionFields, "unapproved A2 funding-requirement disposition must retain the exact non-executable owner-judgment proposal");
  assert.equal(packet.fields.approval_decision, "unapproved", "A2 funding-requirement disposition must remain unapproved");
  assert.equal(packet.fields.external_action, "none", "A2 funding-requirement disposition must not authorize an external action");
  assert.equal(packet.fields.funding_authorization, "none", "A2 funding-requirement disposition must not authorize funding");
  assert.equal(packet.fields.provider_api_authorization, "none", "A2 funding-requirement disposition must not authorize a provider API action");
  assert.equal(packet.fields.payment_or_credit_authorization, "none", "A2 funding-requirement disposition must not authorize payment or credit");
  assert.equal(packet.fields.external_prerequisite_approval, "none", "A2 funding-requirement disposition must not approve the external prerequisite");
  assert.equal(packet.fields.dependent_child_status_effect, "none-remains-unapproved", "A2 funding-requirement disposition proposal must not change the dependent child");
  assert.equal(packet.fields.row_closure, "none", "A2 funding-requirement disposition must close no row");
  assert.equal(packet.fields.activation_status, "closed", "A2 funding-requirement disposition must retain closed activation");
  assert.equal(packet.fields.default_incremental_spend_jpy, "0", "A2 funding-requirement disposition must retain zero default incremental spend");
  assert.equal(packet.fields.stop_before_any_incremental_charge, "yes", "A2 funding-requirement disposition must stop before any incremental charge");
  assert.match(packet.section, /unapproved, non-executable, documentation-only/i, "A2 funding-requirement disposition must remain an unapproved documentation-only proposal");
  assert.match(packet.section, /does not change the current `undetermined` registry state/i, "A2 funding-requirement disposition proposal must not masquerade as a current decision");
  assert.match(packet.section, /does not authorize funding, payment, credit, provider API access, external prerequisite execution, row closure, activation, or final GO/i, "A2 funding-requirement disposition must retain every authority boundary");
}

function assertA2FundingDispositionEffectiveDate(effectiveDate, context) {
  assert.match(effectiveDate, /^\d{4}-\d{2}-\d{2}$/, `${context} effective_date requires strict YYYY-MM-DD`);
  const dateMs = Date.parse(`${effectiveDate}T00:00:00+09:00`);
  assert.ok(Number.isFinite(dateMs), `${context} effective_date requires a valid Asia/Tokyo calendar day`);
  const [year, month, day] = effectiveDate.split("-").map(Number);
  assert.deepEqual(new Date(dateMs + 9 * 60 * 60 * 1000).toISOString().slice(0, 10).split("-").map(Number), [year, month, day], `${context} effective_date requires a valid Asia/Tokyo calendar day`);
  const evaluationAtMs = Date.parse(assertDateParseValid(parsedResultEvaluationAt, "parsed-result evaluation_at"));
  assert.ok(dateMs <= evaluationAtMs, `${context} effective_date must not be future beyond evaluation_at`);
  assert.ok(evaluationAtMs - dateMs <= sourceMaxAgeDays * 86_400_000, `${context} effective_date is stale beyond source_max_age_days`);
  return effectiveDate;
}

function deriveA2FundingDispositionOwnerApprovalRecordFingerprint(fields) {
  return deriveSanitizedFingerprint("a2-funding-disposition-owner-approval", [
    ["record_status", fields.record_status],
    ["record_type", fields.record_type],
    ["evidence_id", fields.evidence_id],
    ["decision_record_id", fields.decision_record_id],
    ["dependent_child_id", fields.dependent_child_id],
    ["approval_id", fields.approval_id],
    ["approval_decision", fields.approval_decision],
    ["exact_target_or_scope", fields.exact_target_or_scope],
    ["bound_a0_approval_id", fields.bound_a0_approval_id],
    ["bound_a0_cost_model_input_fingerprint", fields.bound_a0_cost_model_input_fingerprint],
    ["prior_funding_posture_approval_id", fields.prior_funding_posture_approval_id],
    ["decision_input", fields.decision_input],
    ["effective_date", fields.effective_date],
    ["required_approver", fields.required_approver],
    ["decision_owner", fields.decision_owner],
    ["funding_requirement_state", fields.funding_requirement_state],
    ["owner_decision", fields.owner_decision],
    ["evidence_retention_location", fields.evidence_retention_location],
    ["stop_owner", fields.stop_owner],
    ["rollback_owner", fields.rollback_owner],
    ["cost_guard", fields.cost_guard],
    ["default_incremental_spend_jpy", fields.default_incremental_spend_jpy],
    ["stop_before_any_incremental_charge", fields.stop_before_any_incremental_charge],
    ["command", fields.command],
    ["external_action", fields.external_action],
    ["funding_authorization", fields.funding_authorization],
    ["provider_api_authorization", fields.provider_api_authorization],
    ["payment_or_credit_authorization", fields.payment_or_credit_authorization],
    ["external_prerequisite_approval", fields.external_prerequisite_approval],
    ["row_closure", fields.row_closure],
    ["production_proof", fields.production_proof],
    ["activation_status", fields.activation_status]
  ]);
}

function deriveA2FundingDispositionRecordFingerprint(fields) {
  return deriveSanitizedFingerprint(
    "a2-funding-disposition-result",
    a2FundingRequirementDispositionResultRecordFields
      .filter((field) => field !== "disposition_record_fingerprint")
      .map((field) => [field, fields[field]])
  );
}

function validateA2FundingDispositionOwnerApprovalRecord(record, a0Child) {
  const fields = record?.fields ?? record;
  const context = "A2 funding-disposition owner approval";
  assert.ok(fields && typeof fields === "object", `${context} requires a separately parsed independent record`);
  assert.deepEqual(Object.keys(fields).sort(), [...a2FundingDispositionOwnerApprovalRecordFields].sort(), `${context} requires the exact closed schema`);
  for (const [field, value] of Object.entries(fields)) assert.match(value, /^[A-Za-z0-9:;=._<>-]+$/, `${context} ${field} must retain a sanitized alias only`);
  assert.equal(fields.record_status, "approved-completed-release-owner-judgment", `${context} must be an approved completed owner judgment`);
  assert.equal(fields.record_type, "sanitized-provider-funding-requirement-disposition-owner-approval");
  assert.equal(fields.evidence_id, "EVID-PROVIDER-COST");
  assert.equal(fields.decision_record_id, "A2-provider-funding-requirement-disposition");
  assert.equal(fields.dependent_child_id, "A2-provider-funding-external-prerequisite-reference");
  assert.equal(fields.approval_id, canonicalUnapprovedA2ProviderFundingRequirementDispositionFields.approval_id, `${context} must bind the exact corrected A2 approval ID`);
  assert.equal(fields.approval_decision, "approved", `${context} requires an explicit approved decision`);
  assert.equal(fields.exact_target_or_scope, canonicalUnapprovedA2ProviderFundingRequirementDispositionFields.exact_target_or_scope, `${context} must bind the exact corrected A2 scope`);
  assert.equal(fields.bound_a0_approval_id, a0Child.approval_id, `${context} must bind the actual A0 approval ID`);
  assert.equal(fields.bound_a0_cost_model_input_fingerprint, a0Child.cost_model_input_fingerprint, `${context} must bind the actual A0 input fingerprint`);
  assert.equal(fields.prior_funding_posture_approval_id, canonicalUnapprovedA2ProviderFundingRequirementDispositionFields.prior_funding_posture_approval_id);
  assert.equal(fields.decision_input, canonicalUnapprovedA2ProviderFundingRequirementDispositionFields.decision_input);
  assert.equal(fields.effective_date, canonicalUnapprovedA2ProviderFundingRequirementDispositionFields.effective_date, `${context} must bind the exact approved effective date`);
  assertA2FundingDispositionEffectiveDate(fields.effective_date, context);
  assert.equal(fields.required_approver, "kurodev"); assert.equal(fields.decision_owner, "kurodev");
  const decisions = {
    "not-needed": "approved-no-external-funding-prerequisite-required",
    "already-available": "approved-existing-funded-headroom-available-no-external-prerequisite-required",
    "needed-absent": "retain-no-go-require-separate-external-funding-prerequisite"
  };
  assert.equal(fields.owner_decision, decisions[fields.funding_requirement_state], `${context} owner decision must exactly match its closed funding state`);
  assert.equal(fields.evidence_retention_location, "current-Codex-task-sanitized-report");
  assert.equal(fields.stop_owner, "kurodev"); assert.equal(fields.rollback_owner, "kurodev");
  assert.equal(fields.cost_guard, "zero-incremental-spend-and-separate-budget-approval-required");
  assert.equal(fields.default_incremental_spend_jpy, "0"); assert.equal(fields.stop_before_any_incremental_charge, "yes");
  assert.equal(fields.command, "<no-command-authorized>"); assert.equal(fields.external_action, "none");
  assert.equal(fields.funding_authorization, "none"); assert.equal(fields.provider_api_authorization, "none"); assert.equal(fields.payment_or_credit_authorization, "none"); assert.equal(fields.external_prerequisite_approval, "none");
  assert.equal(fields.row_closure, "none"); assert.equal(fields.production_proof, "no"); assert.equal(fields.activation_status, "closed");
  assert.equal(fields.owner_approval_record_fingerprint, deriveA2FundingDispositionOwnerApprovalRecordFingerprint(fields), `${context} fingerprint must be deterministic`);
  return fields;
}

function validateA2FundingRequirementDispositionResultRecord(record, fundingReferenceChild, ownerApprovalRecord, a0Child) {
  const fields = record?.fields ?? record;
  const context = "A2 funding-requirement disposition result";
  assert.ok(fields && typeof fields === "object", `${context} requires a separate parsed record`);
  assert.deepEqual(Object.keys(fields).sort(), [...a2FundingRequirementDispositionResultRecordFields].sort(), `${context} requires the exact closed schema`);
  for (const [field, value] of Object.entries(fields)) assert.match(value, /^[A-Za-z0-9:;=._<>-]+$/, `${context} ${field} must retain a sanitized alias only`);
  const owner = validateA2FundingDispositionOwnerApprovalRecord(ownerApprovalRecord, a0Child);
  assert.equal(fields.record_status, "approved-completed-release-owner-judgment", `${context} must be an approved completed owner judgment`);
  assert.equal(fields.record_type, "sanitized-provider-funding-requirement-disposition-result");
  assert.equal(fields.evidence_id, owner.evidence_id);
  assert.equal(fields.decision_record_id, owner.decision_record_id);
  assert.equal(fields.dependent_child_id, owner.dependent_child_id);
  assert.equal(fields.owner_approval_record_fingerprint, owner.owner_approval_record_fingerprint, `${context} must bind the separately parsed owner approval fingerprint`);
  assert.equal(fields.funding_requirement_state, owner.funding_requirement_state, `${context} must retain the owner-approved funding state`);
  assert.equal(fields.owner_decision, owner.owner_decision, `${context} must retain the owner-approved disposition`);
  assert.equal(fields.external_prerequisite_approval, "none", `${context} cannot approve the external lane`);
  assert.equal(fields.row_closure, "none"); assert.equal(fields.production_proof, "no"); assert.equal(fields.activation_status, "closed");
  assert.equal(fields.disposition_record_fingerprint, deriveA2FundingDispositionRecordFingerprint(fields), `${context} record fingerprint must be deterministic`);
  if (fundingReferenceChild) {
    assert.equal(fundingReferenceChild.child_id, "A2-provider-funding-external-prerequisite-reference", `${context} must bind the canonical reference child`);
    assert.equal(fundingReferenceChild.funding_requirement_state, fields.funding_requirement_state, `${context} must bind its recorded state into the external-lane reference`);
    assert.equal(fundingReferenceChild.funding_owner_approval_record_fingerprint, fields.owner_approval_record_fingerprint, `${context} must bind the separately parsed owner approval fingerprint`);
    assert.equal(fundingReferenceChild.funding_disposition_record_fingerprint, fields.disposition_record_fingerprint, `${context} must bind its independent disposition record fingerprint`);
  }
  return fields;
}

function validateA2FundingDispositionOwnerApprovalTemplate(template) {
  assert.deepEqual(template.fields, canonicalA2FundingDispositionOwnerApprovalTemplateFields, "A2 funding-disposition owner approval template must retain the exact non-evidence schema");
  assert.deepEqual(Object.keys(template.fields).sort(), [...a2FundingDispositionOwnerApprovalRecordFields].sort(), "A2 funding-disposition owner approval template must match the exact owner schema");
  assert.match(template.section, /template-only, non-evidence/i, "A2 owner approval template must remain non-evidence");
  assert.match(template.section, /cannot create an approval/i, "A2 owner approval template must not create approval");
}

function validateA2FundingRequirementDispositionResultTemplate(template) {
  assert.deepEqual(template.fields, canonicalA2FundingRequirementDispositionResultTemplateFields, "A2 funding-requirement disposition template must retain the exact non-evidence schema");
  assert.deepEqual(Object.keys(template.fields).sort(), [...a2FundingRequirementDispositionResultRecordFields].sort(), "A2 funding-requirement disposition template must match the exact result schema");
  assert.match(template.section, /template-only, non-evidence/i, "A2 funding-requirement disposition template must remain non-evidence");
  assert.match(template.section, /does not record an approved disposition/i, "A2 funding-requirement disposition template must not masquerade as an approved owner judgment");
  assert.match(template.section, /separately parsed owner approval/i, "A2 funding-requirement disposition template must bind a separately parsed owner approval");
  assert.match(template.section, /cannot close EVID-PROVIDER-COST/i, "A2 funding-requirement disposition template cannot close Provider Cost");
}

function validateUnapprovedA3StripePricingDocumentManualPacket(packet) {
  assert.deepEqual(packet.fields, canonicalUnapprovedA3StripePricingDocumentManualPacketFields, "unapproved A3 Stripe pricing-document manual packet must retain the exact non-executable read-only scope");
  assert.doesNotMatch(
    packet.section,
    /\b(?:reopen|open|access|inspect|revisit)(?:ed|ing|s)?\b[^\r\n]{0,80}\bPlans\/Fees\b|\bPlans\/Fees\b[^\r\n]{0,80}\b(?:reopen|open|access|inspect|revisit)(?:ed|ing|s)?\b/i,
    "A3 Stripe pricing-document manual packet must not reopen the prior Plans/Fees surface"
  );
  assert.doesNotMatch(
    packet.section,
    /https?:\/\/|\b(?:acct|cus|evt|price|prod|sub|whsec|pi|cs_test|cs_live)_[A-Za-z0-9_-]+\b/i,
    "A3 Stripe pricing-document manual packet must not retain a raw URL or private Stripe identifier"
  );
  assert.equal(packet.fields.approval_decision, "unapproved", "A3 Stripe pricing-document manual packet must remain unapproved");
  assert.equal(packet.fields.external_action, "none-unapproved-not-started", "A3 Stripe pricing-document manual packet must remain not started");
  assert.equal(packet.fields.operator, "kurodev-manual-current-task", "A3 Stripe pricing-document manual packet must remain Kurodev-operated");
  assert.equal(packet.fields.command, "<no-Codex-command-authorized>", "A3 Stripe pricing-document manual packet must authorize no Codex command");
  assert.equal(packet.fields.codex_browser_or_stripe_control, "none", "A3 Stripe pricing-document manual packet must give Codex no browser or Stripe control");
  assert.equal(packet.fields.payment_refund_client_or_event_settings_api_export_action, "none", "A3 Stripe pricing-document manual packet must authorize no Stripe side effect or adjacent read");
  assert.equal(packet.fields.credential_creation_retrieval_disclosure, "none", "A3 Stripe pricing-document manual packet must authorize no credential action");
  assert.equal(packet.fields.raw_document_contract_text_url_account_identifier_private_identifier_retention, "none", "A3 Stripe pricing-document manual packet must retain no raw or private material");
  assert.equal(packet.fields.public_pricing_substitution, "forbidden", "A3 Stripe pricing-document manual packet must not substitute public pricing for account applicability");
  assert.equal(packet.fields.default_incremental_spend_jpy, "0", "A3 Stripe pricing-document manual packet must retain zero default incremental spend");
  assert.equal(packet.fields.stop_before_any_incremental_charge, "yes", "A3 Stripe pricing-document manual packet must stop before any charge");
  assert.equal(packet.fields.row_closure, "none-this-packet", "A3 Stripe pricing-document manual packet must close no row");
  assert.equal(packet.fields.activation_status, "closed", "A3 Stripe pricing-document manual packet must retain closed activation");
  assert.match(packet.section, /unapproved, non-executable, authenticated-private-read proposal/i, "A3 Stripe pricing-document manual packet must remain an unapproved proposal");
  assert.match(packet.section, /materially different from the two completed Plans\/Fees partial-stop reads/i, "A3 Stripe pricing-document manual packet must use a materially different source");
  assert.match(packet.section, /does not authorize payment, refund, customer, event, settings, API, export, credential, browser, or Stripe operation/i, "A3 Stripe pricing-document manual packet must retain every prohibited action");
}

function validateA3StripePricingDocumentResultTemplate(template) {
  assert.deepEqual(template.fields, canonicalA3StripePricingDocumentResultTemplateFields, "A3 Stripe pricing-document result template must retain the exact non-evidence schema");
  assert.deepEqual(Object.keys(template.fields).sort(), [...a3StripeObservedResultRecordFields].sort(), "A3 Stripe documented result template keys must exactly match the completed observed-record schema");
  assert.match(template.section, /template-only, non-evidence/i, "A3 Stripe pricing-document result template must remain non-evidence");
  assert.match(template.section, /does not record an observed result/i, "A3 Stripe pricing-document result template must not masquerade as observed evidence");
  assert.match(template.section, /cannot close EVID-STRIPE-COST/i, "A3 Stripe pricing-document result template must not close Stripe Cost");
  assert.match(template.section, /separately parsed observed record bound to the exact approved A3 packet/i, "A3 Stripe pricing-document result template must require an independent parsed observed record");
  assert.match(template.section, /observed-record fingerprint is part of the A3 result fingerprint/i, "A3 Stripe pricing-document result template must bind material observed-result drift into downstream invalidation");
}

function validateA3ManualReadOwnerApprovalTemplate(template) {
  assert.deepEqual(template.fields, canonicalA3ManualReadOwnerApprovalTemplateFields, "A3 manual-read owner approval template must retain the exact non-evidence schema");
  assert.deepEqual(Object.keys(template.fields).sort(), [...a3ManualReadOwnerApprovalRecordFields].sort(), "A3 manual-read owner approval template must match the exact owner schema");
  assert.match(template.section, /template-only, non-evidence/i, "A3 owner approval template must remain non-evidence");
  assert.match(template.section, /cannot create approval/i, "A3 owner approval template must not create approval");
  assert.match(template.section, /current A3 child remains unapproved.*collection is empty/i, "A3 owner approval template must retain the empty current collection");
}

function validateA2ProviderCostObservedResultTemplate(template) {
  assert.deepEqual(template.fields, canonicalA2ProviderCostObservedResultTemplateFields, "A2 Provider Cost result template must retain the exact non-evidence schema");
  assert.deepEqual(Object.keys(template.fields).sort(), [...a2ProviderCostObservedResultRecordFields].sort(), "A2 documented result template keys must exactly match the completed observed-record schema");
  assert.match(template.section, /template-only, non-evidence/i, "A2 Provider Cost result template must remain non-evidence");
  assert.match(template.section, /does not record an observed result/i, "A2 Provider Cost result template must not masquerade as observed evidence");
  assert.match(template.section, /cannot close EVID-PROVIDER-COST/i, "A2 Provider Cost result template must not close Provider Cost");
  assert.match(template.section, /separately parsed observed record bound to the exact approved A2 packet/i, "A2 Provider Cost result template must require an independent parsed observed record");
  assert.match(template.section, /observed-record fingerprint is part of the A2 result fingerprint/i, "A2 Provider Cost result template must bind observed-result drift into downstream invalidation");
}

function validateA1WorkerCpuObservedResultTemplate(template) {
  assert.deepEqual(template.fields, canonicalA1WorkerCpuObservedResultTemplateFields, "A1 Worker CPU result template must retain the exact non-evidence schema");
  assert.deepEqual(Object.keys(template.fields).sort(), [...a1WorkerCpuObservedResultRecordFields].sort(), "A1 documented result template keys must exactly match the completed observed-record schema");
  assert.match(template.section, /template-only, non-evidence/i, "A1 Worker CPU result template must not masquerade as observed evidence");
  assert.match(template.section, /does not record an observed result/i, "A1 Worker CPU result template must not claim an observation");
  assert.match(template.section, /cannot close EVID-WORKER-CPU/i, "A1 Worker CPU result template must not close the evidence row");
  assert.match(template.section, /separately parsed actual sanitized observed record/i, "A1 Worker CPU result template must require an independent parsed actual observed record");
  assert.match(template.section, /observed-record fingerprint is part of the A1 result fingerprint/i, "A1 Worker CPU result template must bind material observed-result drift into downstream invalidation");
}

function validateCompletedA0RegistryState(fields) {
  assert.equal(fields.child_id, "A0-provisional-cost-model-input", "A0 registry state must retain the canonical child ID");
  assert.equal(fields.approval_id, "NC-R1-A0-PROVISIONAL-COST-MODEL-20260809-01", "A0 registry state must bind the exact approved packet");
  assert.equal(fields.explicit_decision, "approved", "A0 registry state must bind the explicit owner decision");
  assert.equal(fields.child_status, "satisfied", "A0 documentation judgment must be satisfied");
  assert.equal(fields.freshness, "fresh", "A0 documentation judgment must be fresh");
  assert.equal(fields.target, "exact", "A0 documentation judgment must retain the exact approved target");
  assert.equal(fields.approval, "approved", "A0 registry state must retain the owner approval");
  assert.equal(fields.fingerprint_bound, "yes", "A0 registry state must retain deterministic fingerprint binding");
  assert.equal(fields.row_closure_effect, "none", "A0 registry state must not change a row status");
  assert.equal(fields.cost_model_decision, canonicalCompletedA0ProvisionalCostModelApprovalFields.cost_model_decision);
  assert.equal(fields.judgment_output, canonicalCompletedA0ProvisionalCostModelApprovalFields.judgment_output);
  assert.equal(fields.judgment_effective_date, canonicalCompletedA0ProvisionalCostModelApprovalFields.effective_date);
  const approvalFingerprint = assertDerivedApprovalFingerprint(fields, "completed A0 registry");
  const inputFingerprint = assertDerivedSanitizedFingerprint(fields, "cost_model_input_fingerprint", "a0-cost-model-input", [
    ["approval_fingerprint", approvalFingerprint],
    ["bound_input", fields.bound_input],
    ["effective_date", fields.effective_date],
    ["required_approver", fields.required_approver],
    ["judgment_output", fields.judgment_output],
    ["cost_model_decision", fields.cost_model_decision]
  ], "completed A0 registry");
  const resultFingerprint = assertDerivedSanitizedFingerprint(fields, "cost_model_result_fingerprint", "a0-cost-model-result", [
    ["cost_model_input_fingerprint", inputFingerprint],
    ["cost_model_decision", fields.cost_model_decision],
    ["judgment_output", fields.judgment_output],
    ["judgment_effective_date", fields.judgment_effective_date]
  ], "completed A0 registry");
  assertDerivedSanitizedFingerprint(fields, "bound_artifact_fingerprint", "a0-bound-artifact", [
    ["cost_model_input_fingerprint", inputFingerprint],
    ["cost_model_result_fingerprint", resultFingerprint],
    ["judgment_output", fields.judgment_output],
    ["judgment_effective_date", fields.judgment_effective_date]
  ], "completed A0 registry");
}

function validateWorkerCpuSchemaManualResultTemplate(template) {
  assert.deepEqual(template.fields, canonicalWorkerCpuSchemaManualResultTemplateFields, "Worker CPU manual schema-capability result template must remain exact, sanitized, and non-evidence");
  assert.match(template.section, /template-only, non-evidence/i, "Worker CPU manual schema-capability result template must not claim an observed result");
  assert.match(template.section, /does not record an observed result/i, "Worker CPU manual schema-capability result template must not be treated as observed evidence");
  assert.match(template.section, /cannot close EVID-WORKER-CPU/i, "Worker CPU manual schema-capability result template must not close the Worker CPU row");
}

function parseWorkerCpuSchemaManualResultObservedAt(value) {
  assert.equal(typeof value, "string", "Worker CPU manual schema-capability result observed_at must be a string");
  const match = value.match(/^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:(?:0\d|1[0-3]):[0-5]\d|14:00))$/);
  assert.ok(match, "Worker CPU manual schema-capability result observed_at must be strict RFC3339 with a timezone");
  parseUtcDate(match[1]);
  const parsed = Date.parse(value);
  assert.ok(Number.isFinite(parsed), "Worker CPU manual schema-capability result observed_at must be Date.parse-valid");
  return parsed;
}

function workerCpuSchemaManualResultPartialStopReasons(fields) {
  const reasonFor = (field, value) => `${field.replace(/_(?:available|capability|result|match|provable)$/, "").replace(/_/g, "-")}-${value}`;
  const reasons = [];
  if (["mismatched", "unconfirmed"].includes(fields.target_match)) reasons.push(reasonFor("target_match", fields.target_match));
  if (["unavailable", "unconfirmed"].includes(fields.authentication_result)) reasons.push(reasonFor("authentication_result", fields.authentication_result));
  if (["unavailable", "unconfirmed"].includes(fields.schema_transport_result)) reasons.push(reasonFor("schema_transport_result", fields.schema_transport_result));
  for (const field of workerCpuSchemaManualResultCapabilityFields) {
    if (["unavailable", "unconfirmed"].includes(fields[field])) reasons.push(reasonFor(field, fields[field]));
  }
  return reasons;
}

function validateWorkerCpuSchemaManualResultRecord(fields) {
  const requiredFields = Object.keys(canonicalWorkerCpuSchemaManualResultTemplateFields).filter((field) => field !== "template_status");
  const allowedFields = new Set(requiredFields);
  const unknownFields = Object.keys(fields).filter((field) => !allowedFields.has(field));
  assert.equal(unknownFields.length, 0, `Worker CPU manual schema-capability result rejects unknown field(s): ${unknownFields.join(",")}`);
  for (const field of requiredFields) {
    assert.ok(Object.prototype.hasOwnProperty.call(fields, field), `Worker CPU manual schema-capability result requires ${field}`);
  }
  assert.equal(fields.freshness_time_zone, workerCpuSchemaManualResultFreshness.time_zone, "Worker CPU manual schema-capability result must retain the exact Asia/Tokyo freshness time zone");
  assert.equal(fields.freshness_anchor, workerCpuSchemaManualResultFreshness.anchor, "Worker CPU manual schema-capability result must retain the exact current-task freshness anchor");
  assert.equal(fields.freshness_window, workerCpuSchemaManualResultFreshness.window, "Worker CPU manual schema-capability result must retain the exact current-task freshness window");
  const observedAt = parseWorkerCpuSchemaManualResultObservedAt(fields.observed_at);
  const freshnessWindowStart = Date.parse(workerCpuSchemaManualResultFreshness.window_start);
  const freshnessAnchor = Date.parse(workerCpuSchemaManualResultFreshness.anchor);
  assert.ok(observedAt <= freshnessAnchor, "Worker CPU manual schema-capability result observed_at must not be future-dated beyond the current-task freshness anchor");
  assert.ok(observedAt >= freshnessWindowStart, "Worker CPU manual schema-capability result observed_at is stale outside the fixed current-task freshness window");
  assert.ok(["exact", "mismatched", "unconfirmed"].includes(fields.target_match), "Worker CPU manual schema-capability result target_match must be exact, mismatched, or unconfirmed");
  assert.ok(["authenticated", "unavailable", "unconfirmed"].includes(fields.authentication_result), "Worker CPU manual schema-capability result authentication_result must be sanitized and classified");
  assert.ok(["available", "unavailable", "unconfirmed"].includes(fields.schema_transport_result), "Worker CPU manual schema-capability result schema_transport_result must be sanitized and classified");
  for (const field of workerCpuSchemaManualResultCapabilityFields) {
    assert.ok(["available", "unavailable", "unconfirmed"].includes(fields[field]), `Worker CPU manual schema-capability result ${field} must be available, unavailable, or unconfirmed`);
  }
  for (const field of workerCpuSchemaManualResultProhibitedNoFields) {
    assert.equal(fields[field], "no", `Worker CPU manual schema-capability result ${field} must be no`);
  }
  for (const field of workerCpuSchemaManualResultProhibitedNoneFields) {
    assert.equal(fields[field], "none", `Worker CPU manual schema-capability result ${field} must be none`);
  }
  assert.equal(fields.incremental_charge, "no", "Worker CPU manual schema-capability result must not accept an incremental charge");
  assert.equal(fields.data_query_executed, "no", "Worker CPU manual schema-capability result must not execute a data query");
  assert.equal(fields.row_closure, "none", "Worker CPU manual schema-capability result cannot close EVID-WORKER-CPU");
  assert.ok(["complete", "partial-stop"].includes(fields.result_status), "Worker CPU manual schema-capability result must be complete or partial-stop");
  assert.match(fields.stop_result, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Worker CPU manual schema-capability result requires a sanitized stop_result");
  const incompleteCapabilities = [
    fields.schema_transport_result,
    ...workerCpuSchemaManualResultCapabilityFields.map((field) => fields[field])
  ].some((value) => value === "unavailable" || value === "unconfirmed");
  const unsafeResultBoundary = fields.target_match !== "exact" || fields.authentication_result !== "authenticated";
  if (incompleteCapabilities || unsafeResultBoundary) {
    assert.equal(fields.result_status, "partial-stop", "Worker CPU manual schema-capability result must partial-stop when a capability, target, or authentication result is unavailable or unconfirmed");
  }
  if (fields.result_status === "complete") {
    assert.ok(!incompleteCapabilities && !unsafeResultBoundary, "Worker CPU manual schema-capability result may be complete only after every capability, target, and authentication result is confirmed");
    assert.equal(fields.stop_result, "completed-schema-capability-only", "Worker CPU manual schema-capability result complete status requires completed-schema-capability-only");
  } else {
    const expectedStopReasons = workerCpuSchemaManualResultPartialStopReasons(fields);
    assert.ok(expectedStopReasons.length > 0, "Worker CPU manual schema-capability result partial-stop requires a non-none truthful stop reason tied to a recorded gap");
    assert.ok(expectedStopReasons.includes(fields.stop_result), `Worker CPU manual schema-capability result partial-stop stop_result must truthfully identify a recorded gap: ${expectedStopReasons.join(",")}`);
  }
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

function runNegativeHelperAssertions(evidenceRows, numericRows, documentedUnresolved, primaryApprovalUnitRows, acquisitionDecisionRows, decisionSequenceFields, historicalPr750LocalApprovalPacket, completedWorkerRequestPacket, completedSupabaseSizePacket, completedSupabasePausePartialStopPacket, completedSupabasePausePostureDecision, completedSupabaseEgressPartialStopPacket, completedSupabaseCachedEgressPacket, completedWorkerCpuPartialStopPacket, completedProviderCostPartialStopPacket, completedProviderFundingPostureDecision, completedStripeCostPartialStopPacket, completedStripeBaseFeePartialStopPacket, completedSupportPostureDecision, completedSupabaseBackupPrerequisiteInputPacket, completedSupabaseBackupPostureDecision, nextApprovalPacket) {
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

  for (const evidenceId of historicalPr750LocalRevalidationEvidenceIds) {
    const revertedLocalRow = cloneRows(evidenceRows);
    const row = revertedLocalRow.find((entry) => entry.id === evidenceId);
    row.evidenceClass = "blocked";
    row.freshness = "missing";
    row.status = "incomplete";
    assert.throws(() => validateEvidenceRows(revertedLocalRow), new RegExp(evidenceId));
    assert.throws(
      () => assertHistoricalReferenceCannotSupersedeHistoricalPr750LocalRow({
        evidenceId,
        historicalAuthority: "non-authoritative-reference-only",
        historicalPr750Status: "satisfied",
        historicalPr750Verification: "historical-pr749-reference"
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
  assert.throws(() => validateNextApprovalPacket(bundledPacket), /approved-not-started Worker CPU manual schema-capability packet/);

  const executableStripeBaseFeePacket = {
    ...nextApprovalPacket,
    fields: { ...nextApprovalPacket.fields, external_action: "stripe-dashboard-read" }
  };
  assert.throws(() => validateNextApprovalPacket(executableStripeBaseFeePacket), /approved-not-started Worker CPU manual schema-capability packet/);

  const bundledStripeBaseFeePacket = {
    ...nextApprovalPacket,
    fields: { ...nextApprovalPacket.fields, prohibited_bundle: "product-or-price-judgment" }
  };
  assert.throws(() => validateNextApprovalPacket(bundledStripeBaseFeePacket), /must prohibit Codex-operated GraphiQL/);

  const closingStripeBaseFeePacket = {
    ...nextApprovalPacket,
    fields: { ...nextApprovalPacket.fields, row_closure: "satisfied" }
  };
  assert.throws(() => validateNextApprovalPacket(closingStripeBaseFeePacket), /approved-not-started Worker CPU manual schema-capability packet/);

  const dataQueryAuthorizationPacket = {
    ...nextApprovalPacket,
    fields: { ...nextApprovalPacket.fields, data_query_authorization: "authorized" }
  };
  assert.throws(() => validateNextApprovalPacket(dataQueryAuthorizationPacket), /approved-not-started Worker CPU manual schema-capability packet/);

  const credentialDisclosurePacket = {
    ...nextApprovalPacket,
    fields: { ...nextApprovalPacket.fields, credential_retrieval_or_disclosure: "authorized" }
  };
  assert.throws(() => validateNextApprovalPacket(credentialDisclosurePacket), /approved-not-started Worker CPU manual schema-capability packet/);

  const requiredGraphiqlButProhibitedPacket = {
    ...nextApprovalPacket,
    fields: { ...nextApprovalPacket.fields, prohibited_bundle: `${nextApprovalPacket.fields.prohibited_bundle},GraphiQL` }
  };
  assert.throws(() => validateNextApprovalPacket(requiredGraphiqlButProhibitedPacket), /cannot require and prohibit GraphiQL/);

  const genericChromeProhibitedPacket = {
    ...nextApprovalPacket,
    fields: { ...nextApprovalPacket.fields, prohibited_bundle: `${nextApprovalPacket.fields.prohibited_bundle},Chrome` }
  };
  assert.throws(() => validateNextApprovalPacket(genericChromeProhibitedPacket), /must not generically prohibit Chrome/);

  const CodexOperatorPacket = {
    ...nextApprovalPacket,
    fields: { ...nextApprovalPacket.fields, prohibited_operator: "none" }
  };
  assert.throws(() => validateNextApprovalPacket(CodexOperatorPacket), /must prohibit Codex operation/);

  const selectedProductPricePacket = {
    ...nextApprovalPacket,
    fields: { ...nextApprovalPacket.fields, product_price_status: "selected" }
  };
  assert.throws(() => validateNextApprovalPacket(selectedProductPricePacket), /approved-not-started Worker CPU manual schema-capability packet/);

  const publicPricingSubstitutionPacket = {
    ...nextApprovalPacket,
    fields: { ...nextApprovalPacket.fields, public_pricing_substitution: "allowed" }
  };
  assert.throws(() => validateNextApprovalPacket(publicPricingSubstitutionPacket), /approved-not-started Worker CPU manual schema-capability packet/);

  const incompletePacket = {
    ...nextApprovalPacket,
    fields: Object.fromEntries(Object.entries(nextApprovalPacket.fields).filter(([field]) => field !== "approval_id"))
  };
  assert.throws(() => validateNextApprovalPacket(incompletePacket), /requires approval_id/);

  const wrongFixedRequiredApprover = {
    ...nextApprovalPacket,
    fields: { ...nextApprovalPacket.fields, required_approver: "not-kurodev" }
  };
  assert.throws(() => validateNextApprovalPacket(wrongFixedRequiredApprover), /approved-not-started Worker CPU manual schema-capability packet/);
  for (const ownerField of ["stop_owner", "rollback_owner"]) {
    assert.throws(
      () => validateNextApprovalPacket({
        ...nextApprovalPacket,
        fields: { ...nextApprovalPacket.fields, [ownerField]: "not-kurodev" }
      }),
      /approved-not-started Worker CPU manual schema-capability packet/
    );
  }

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

  const bundledHistoricalPr750LocalPacket = {
    ...historicalPr750LocalApprovalPacket,
    fields: { ...historicalPr750LocalApprovalPacket.fields, evidence_ids: `${historicalPr750LocalApprovalPacket.fields.evidence_ids},EVID-WORKER-CPU` }
  };
  assert.throws(() => validateHistoricalPr750LocalApprovalPacket(bundledHistoricalPr750LocalPacket), /historical PR #750 local approval record/);

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
    /forbidden before the other 8 currently unresolved/
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
// NC-R1 remains a paused historical control plane. Validate the exact task snapshot
// that accompanied it instead of forcing current task selection to retain old history.
const task = read(historicalTaskPath);
const stagedDesign = read("docs/superpowers/specs/2026-08-09-nc-r1-eight-row-staged-resolution-design.md");
const stagedPlan = read("docs/superpowers/plans/2026-08-09-nc-r1-eight-row-staged-resolution.md");
assert.doesNotThrow(
  () => assertFullTextNonAuthorizing("This manifest proceeds without authorizing deployment."),
  "full-text guard must retain explicit without-authorizing deployment denial"
);
assert.doesNotThrow(
  () => assertFullTextNonAuthorizing("This is a non-authorizing deployment reference."),
  "full-text guard must retain explicit non-authorizing deployment reference"
);
for (const authorityText of [readiness, checklist, task, stagedDesign, stagedPlan]) assertFullTextNonAuthorizing(authorityText);
assert.match(task, /post-PR continuation uses one fresh task for one evidence row or one prerequisite child step at a time/i, "task board must retain the row-by-row post-PR continuation policy");
assert.match(stagedDesign, /one fresh task covers exactly one evidence row or one prerequisite child step/i, "staged design must retain the row-by-row post-PR execution model");
assert.match(stagedPlan, /Do not use a persistent multi-row goal for post-PR execution/i, "staged plan must prevent another persistent multi-row execution goal");
for (const operation of ["deployment", "activation", "funding", "migration", "configuration", "binding", "Git publication", "public Paid gate", "cleanup"]) assert.throws(() => assertFullTextNonAuthorizing(`${readiness}\nThis manifest authorizes ${operation}.`), /must not directly authorize/);
assert.throws(() => assertFullTextNonAuthorizing(`${readiness}\nManifest authorizes deployment.`), /must not directly authorize/);
assert.throws(() => assertFullTextNonAuthorizing(`${readiness}\nThis manifest authorizes only deployment.`), /must not directly authorize/);
for (const authorizationBypass of [
  "Manifest authorizes deployment.",
  "```text\nManifest authorizes deployment.\n```",
  "Deployment is not prohibited; this manifest authorizes deployment.",
  "```text\nDeployment is not prohibited; this manifest authorizes deployment.\n```",
  "Deployment is not authorized; this manifest authorizes deployment."
]) {
  assert.throws(() => assertFullTextNonAuthorizing(`${readiness}\n${authorizationBypass}`), /must not directly authorize/);
}
for (const authorityAlias of ["funding_permission=approved", "funding_approval=approved", "provider_funding_consent=approved"]) {
  assert.throws(() => assertFullTextNonAuthorizing(`${readiness}\n${authorityAlias}`), /must not directly grant authority/);
  assert.throws(() => assertFullTextNonAuthorizing(`${readiness}\n\`\`\`text\n${authorityAlias}\n\`\`\``), /must not directly grant authority/);
}
assert.doesNotThrow(() => assertFullTextNonAuthorizing("funding_decision_basis_approval=approved\nrow_approval=approved"), "factual decision and row approval classifications must not be mistaken for new operation authority");
assert.throws(
  () => assertFullTextNonAuthorizing(`${readiness}\nThis manifest authorized deployment.`),
  /must not directly authorize/,
  "full-text guard must reject past-tense active deployment authorization"
);
assert.throws(
  () => assertFullTextNonAuthorizing([readiness, "```text", "This manifest authorized deployment.", "```"].join("\n")),
  /must not directly authorize/,
  "full-text guard must reject fenced past-tense active deployment authorization"
);
for (const activeAuthorization of [
  "This manifest permit deployment.",
  "This manifest permits deployment.",
  "This manifest permitted deployment.",
  "This manifest is permitting deployment.",
  "This manifest allow deployment.",
  "This manifest allows deployment.",
  "This manifest allowed deployment.",
  "This manifest is allowing deployment."
]) {
  assert.throws(() => assertFullTextNonAuthorizing(`${readiness}\n${activeAuthorization}`), /must not directly authorize/, `full-text guard must reject active permission verb: ${activeAuthorization}`);
}
assert.throws(
  () => assertFullTextNonAuthorizing(`${readiness}\nThis manifest permits deployment.`),
  /must not directly authorize/,
  "full-text guard must reject unfenced permit deployment"
);
assert.throws(
  () => assertFullTextNonAuthorizing([readiness, "```text", "This manifest permits deployment.", "```"].join("\n")),
  /must not directly authorize/,
  "full-text guard must reject fenced permit deployment"
);
for (const modal of ["may", "can", "shall"]) {
  assert.throws(() => assertFullTextNonAuthorizing(`${readiness}\nDeployment ${modal} proceed under this manifest.`), /must not directly authorize/, `full-text guard must reject ${modal}-proceed deployment permission`);
}
assert.throws(
  () => assertFullTextNonAuthorizing(`${readiness}\nDeployment may proceed under this manifest.`),
  /must not directly authorize/,
  "full-text guard must reject unfenced may-proceed deployment permission"
);
assert.throws(
  () => assertFullTextNonAuthorizing([readiness, "```text", "Deployment may proceed under this manifest.", "```"].join("\n")),
  /must not directly authorize/,
  "full-text guard must reject fenced may-proceed deployment permission"
);
assert.doesNotThrow(() => assertFullTextNonAuthorizing("This manifest does not permit deployment."));
assert.doesNotThrow(() => assertFullTextNonAuthorizing("Deployment may not proceed under this manifest."));
assert.doesNotThrow(() => assertFullTextNonAuthorizing("```text\nprohibited_operation=deployment\npayment_authorization=none\n```"));
assert.doesNotThrow(() => assertFullTextNonAuthorizing("- [ ] **Step 1: Add adversarial negative fixtures**\n```text\nmanifest authorizes deploy\n```"));
assert.throws(() => assertFullTextNonAuthorizing("```text\ndeployment_authorization=approved\n```"), /must not directly authorize|must not directly grant authority/);
for (const protectedAuthoritySentence of [
  "This manifest authorizes legal approval.",
  "This manifest authorizes tax action.",
  "This manifest authorizes copy approval.",
  "This manifest authorizes risk acceptance.",
  "This manifest authorizes final GO.",
  "This manifest authorizes publication.",
  "This manifest authorizes external action."
]) {
  assert.throws(
    () => assertFullTextNonAuthorizing(`${readiness}\n${protectedAuthoritySentence}`),
    /must not directly authorize/,
    `full-text guard must reject protected authority prose: ${protectedAuthoritySentence}`
  );
  assert.throws(
    () => assertFullTextNonAuthorizing([readiness, "```text", protectedAuthoritySentence, "```"].join("\n")),
    /must not directly authorize/,
    `full-text guard must reject protected authority fence: ${protectedAuthoritySentence}`
  );
}
assert.doesNotThrow(() => assertFullTextNonAuthorizing("This manifest authorizes no copy, risk, deploy, live, GO, activation, or publication action."));
assert.doesNotThrow(() => assertFullTextNonAuthorizing("This template contains no legal conclusion."));

const staleHistoricalLocalEvidencePhrases = [
  "current" + "-worktree",
  "current" + " worktree",
  "This continuation" + " worktree",
  "completed current" + "-worktree local revalidation",
  "current local" + " revalidation"
];
for (const [documentName, documentText] of [
  ["task.md", task],
  ["NC-R1 readiness authority", readiness],
  ["NC-R1 operator checklist", checklist]
]) {
  for (const phrase of staleHistoricalLocalEvidencePhrases) {
    assert.doesNotMatch(
      documentText,
      new RegExp(escapeRegExp(phrase), "i"),
      `${documentName} must describe prior dependency-present evidence only as historical PR #750 worktree evidence, while fresh isolated worktree state remains setup-blocked`
    );
  }
}

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
  "historical_pr750_worktree_node_modules=present-lockfile-matched",
  "historical_pr750_worktree_dependency_checks=completed-local",
  "historical_pr750_worktree_dependency_install=approved-completed-local",
  "## Evidence Class Contract",
  "## Evidence Ledger",
  "## Primary Approval-Unit Classification",
  "## Acquisition And Decision Contract",
  "## Ordered Judgment And Final Release Decision Sequence",
  "## Public Official Source Ledger",
  "## Supported Numeric Claims",
  "## Historical PR #750 Worktree Local Revalidation",
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
assert.equal(readTextField(readiness, "evaluation_at"), "2026-08-10T23:59:59Z", "readiness must retain the sanitized parsed-result evaluation anchor");
assert.equal(readTextField(readiness, "source_freshness_timezone"), sourceFreshnessTimeZone, "source freshness timezone must retain the repository policy");
assertSourceFreshness(sourceCheckedAt);
assert.equal(readTextField(readiness, "current_unresolved_hard_requirement_count"), "9", "readiness status must retain the current 9-row unresolved count after approved SLA posture closure");
assert.match(checklist, /source_max_age_days=7/, "operator checklist must retain the source freshness policy");
assert.match(checklist, /evaluation_at=2026-08-10T23:59:59Z/, "operator checklist must retain the sanitized parsed-result evaluation anchor");
assert.match(checklist, /source_freshness_timezone=Asia\/Tokyo/, "operator checklist must retain the source freshness timezone");
assert.match(checklist, /current_unresolved_hard_requirement_count=9/, "operator checklist must retain the current 9-row unresolved count after approved SLA posture closure");
assert.equal(readUniqueTextField(readiness, "continuation_pr"), "749", "continuation PR must retain the exact intake number");
assert.equal(readUniqueTextField(readiness, "continuation_pr_state"), "merged", "continuation PR must retain its merged containment state");
assert.equal(readUniqueTextField(readiness, "continuation_pr_final_head"), "742165b0fb67bb2e47f3d7f9db37e2ac774579ff", "continuation PR must retain its exact final head");
assert.equal(readUniqueTextField(readiness, "continuation_merge_integration_tip"), "60d8b86f98bfe9465afdf9fa22e7052c0169b993", "continuation PR must retain its exact integration tip");
assert.equal(readUniqueTextField(readiness, "continuation_deployment_status"), "not-confirmed", "continuation merge must not become deployment proof");
assert.equal(readUniqueTextField(readiness, "sla_posture_pr"), "750", "PR #750 must be recorded as the SLA posture documentation layer");
assert.equal(readUniqueTextField(readiness, "sla_posture_pr_state"), "merged", "PR #750 must be recorded as merged");
assert.equal(readUniqueTextField(readiness, "sla_posture_pr_final_head"), "80e97d42812d8cb30fc75535aab375676a6fad61", "PR #750 final head must remain exact");
assert.equal(readUniqueTextField(readiness, "sla_posture_merge_integration_tip"), "78ab5908df8bf39427b6a929d375d7df93bf13a9", "PR #750 integration tip must remain exact");
assert.equal(readUniqueTextField(readiness, "sla_posture_deployment_status"), "not-confirmed", "PR #750 merge must not become deployment proof");
assert.equal(readUniqueTextField(readiness, "current_fresh_isolated_worktree_node_modules"), "absent", "fresh isolated worktree must report absent dependencies");

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
assert.equal(unresolvedHardRequirements.length, 9, "current NC-R1 must retain exactly 9 unresolved hard requirements after the approved EVID-SLA posture decision");
assert.equal(readTextField(readiness, "decision"), "no-go", "unresolved hard requirements must produce NO-GO");
assert.equal(readTextField(readiness, "conditional-go"), "forbidden-while-hard-requirement-unresolved");
const historicalPr750LocalRevalidationRows = parseHistoricalPr750LocalRevalidationRows(readiness);
validateHistoricalPr750LocalRevalidationRows(historicalPr750LocalRevalidationRows, evidenceRows);
const primaryApprovalUnitRows = parsePrimaryApprovalUnitRows(readiness);
validatePrimaryApprovalUnitRows(primaryApprovalUnitRows);
const acquisitionDecisionRows = parseAcquisitionDecisionRows(readiness);
validateAcquisitionDecisionRows(acquisitionDecisionRows);
assert.equal(readUniqueTextField(readiness, "original_external_owner_live_deployed_16"), "exact", "the original 16 external/owner/live/deployed rows must remain a distinct exact classification set");
assert.equal(readUniqueTextField(readiness, "original_external_owner_live_deployed_16_label"), "original-external-owner-live-deployed-16", "the original 16 classification set must retain its exact label");
assert.equal(readUniqueTextField(readiness, "original_external_owner_live_deployed_16_composition"), "7-authenticated-private-read,7-release-owner-judgment,1-live-operation,1-deploy-deployed-proof", "the original 16 classification composition must remain exact");
assert.equal(readUniqueTextField(readiness, "original_external_owner_live_deployed_16_public_closeable_hard_requirement_count"), "0", "public sources must close none of the original 16 rows");
assert.equal(readUniqueTextField(readiness, "current_unresolved_hard_requirements_count"), "9", "the current unresolved subset must contain exactly 9 rows");
assert.equal(readUniqueTextField(readiness, "current_unresolved_hard_requirements_composition"), "3-authenticated-private-read,4-release-owner-judgment,1-live-operation,1-deploy-deployed-proof", "the current unresolved 9 composition must remain exact");
assert.doesNotMatch(readiness, /current-12 composition/i, "readiness must not retain the obsolete pre-closure current-12 composition wording");
const decisionSequenceFields = readDecisionSequenceFields(readiness);
validateDecisionSequenceFields(decisionSequenceFields);
assert.equal(readUniqueTextField(readiness, "final_release_owner_decision"), "missing", "final release owner decision must remain missing while NO-GO is current");
assertOrdinaryRowJudgmentEligible({
  evidenceId: "EVID-PRODUCT-PRICE",
  rowContractComplete: true,
  closureIds: ["EVID-PRODUCT-PRICE"],
  closureResult: "satisfied",
  activationStatus: "closed",
  unresolvedHardRequirements: 9
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
const historicalPr750LocalApprovalPacket = parseHistoricalPr750LocalApprovalPacket(checklist);
validateHistoricalPr750LocalApprovalPacket(historicalPr750LocalApprovalPacket);
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
const completedWorkerCpuReReadPartialStopReadinessPacket = parseCompletedWorkerCpuReReadPartialStopPacket(readiness);
const completedWorkerCpuReReadPartialStopChecklistPacket = parseCompletedWorkerCpuReReadPartialStopPacket(checklist);
validateCompletedWorkerCpuReReadPartialStopPacket(completedWorkerCpuReReadPartialStopReadinessPacket);
validateCompletedWorkerCpuReReadPartialStopPacket(completedWorkerCpuReReadPartialStopChecklistPacket);
assert.deepEqual(
  completedWorkerCpuReReadPartialStopChecklistPacket.fields,
  completedWorkerCpuReReadPartialStopReadinessPacket.fields,
  "Worker CPU re-read partial-stop authority and operator checklist records must remain identical"
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
const completedSlaPostureDecisionReadinessPacket = parseCompletedSlaPostureDecision(readiness);
const completedSlaPostureDecisionChecklistPacket = parseCompletedSlaPostureDecision(checklist);
validateCompletedSlaPostureDecision(completedSlaPostureDecisionReadinessPacket);
validateCompletedSlaPostureDecision(completedSlaPostureDecisionChecklistPacket);
assert.deepEqual(
  completedSlaPostureDecisionChecklistPacket.fields,
  completedSlaPostureDecisionReadinessPacket.fields,
  "completed SLA posture decision authority and operator checklist records must remain identical"
);
assert.equal((`${readiness}\n${checklist}`.match(/sla_status=separate-unapproved/g) ?? []).length, 2, "historical Support packet may retain its SLA-separation field only once per matching authority/checklist record");
for (const [overrides, expectedError] of [
  [{ row_closure: "EVID-RISK-ACCEPTANCE" }, /completed SLA posture decision/],
  [{ external_action: "dashboard-read" }, /completed SLA posture decision/],
  [{ activation_status: "open" }, /completed SLA posture decision/],
  [{ availability_commitment: "guaranteed-availability" }, /completed SLA posture decision/]
]) {
  assert.throws(
    () => validateCompletedSlaPostureDecision({
      ...completedSlaPostureDecisionReadinessPacket,
      fields: { ...completedSlaPostureDecisionReadinessPacket.fields, ...overrides }
    }),
    expectedError
  );
}
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
for (const [overrides, expectedError] of [
  [{ evidence_ids: "EVID-WORKER-CPU,EVID-PROVIDER-COST" }, /Worker CPU re-read partial-stop evidence/],
  [{ evidence_id: "EVID-WORKER-CPU" }, /Worker CPU re-read partial-stop evidence/],
  [{ result: "satisfied" }, /Worker CPU re-read partial-stop evidence/],
  [{ row_closure: "EVID-WORKER-CPU" }, /Worker CPU re-read partial-stop evidence/],
  [{ explicit_aggregation_completeness: "yes" }, /Worker CPU re-read partial-stop evidence/],
  [{ request_rows_visible: "yes" }, /Worker CPU re-read partial-stop evidence/],
  [{ trace_log_explorer_logs_raw_requests_other_service_settings_plan_configuration_surface_opened: "yes" }, /Worker CPU re-read partial-stop evidence/],
  [{ settings_write_plan_deploy_activation_action: "performed" }, /Worker CPU re-read partial-stop evidence/]
]) {
  assert.throws(
    () => validateCompletedWorkerCpuReReadPartialStopPacket({
      ...completedWorkerCpuReReadPartialStopReadinessPacket,
      fields: { ...completedWorkerCpuReReadPartialStopReadinessPacket.fields, ...overrides }
    }),
    expectedError
  );
}
for (const [unsafeProse, expectedError] of [
  ["Observed P50 223ms", /must not retain a percentile metric value/],
  ["Worker CPU is safe", /must not retain an unsafe no-exceedance or CPU-safe conclusion/],
  ["CPU headroom is sufficient", /must not retain an unsafe headroom or remaining-capacity conclusion/],
  ["CPU headroom 50%", /must not retain a percentage inference/],
  ["remaining capacity is available", /must not retain an unsafe headroom or remaining-capacity conclusion/],
  ["CPU percentage is safe", /must not retain an unsafe percentage inference/]
]) {
  assert.throws(
    () => validateCompletedWorkerCpuReReadPartialStopPacket({
      ...completedWorkerCpuReReadPartialStopReadinessPacket,
      section: `${completedWorkerCpuReReadPartialStopReadinessPacket.section}\n${unsafeProse}`
    }),
    expectedError
  );
}
const completedWorkerCpuExecutionPathDispositionPacket = {
  fields: parseExactTextBlock(sectionBody(checklist, "## Completed A1 Worker CPU GraphQL Execution-Path Disposition Approval")),
  section: sectionBody(checklist, "## Completed A1 Worker CPU GraphQL Execution-Path Disposition Approval")
};
validateCompletedWorkerCpuExecutionPathDisposition(completedWorkerCpuExecutionPathDispositionPacket);
const nextApprovalPacket = parseNextApprovalPacket(checklist);
validateNextApprovalPacket(nextApprovalPacket);
assert.match(nextApprovalPacket.section, /kurodev-operated-cloudflare-graphiql-schema-capability-only/, "approved-not-started packet must be limited to the Worker CPU schema-capability surface");
assert.match(nextApprovalPacket.section, /does not authorize a data query or credential creation, retrieval, or disclosure/i, "approved-not-started packet must not authorize data or credential access");
assert.match(nextApprovalPacket.section, /schema-only cannot close the row or authorize a data query/i, "approved-not-started packet must preserve the schema-only closure boundary");
const completedA0ProvisionalCostModelApproval = parseCompletedA0ProvisionalCostModelApproval(checklist);
validateCompletedA0ProvisionalCostModelApproval(completedA0ProvisionalCostModelApproval);
const completedA0ProvisionalCostModelApprovalReadiness = parseCompletedA0ProvisionalCostModelApproval(readiness);
validateCompletedA0ProvisionalCostModelApproval(completedA0ProvisionalCostModelApprovalReadiness);
assert.deepEqual(
  completedA0ProvisionalCostModelApprovalReadiness.fields,
  completedA0ProvisionalCostModelApproval.fields,
  "readiness and checklist must retain the same exact completed A0 provisional cost-model approval"
);
assert.match(task, /NC-R1-A0-PROVISIONAL-COST-MODEL-20260809-01/, "task board must retain the completed A0 provisional cost-model approval identifier");
assert.match(task, /A0.*approved.*documentation-only|approved.*documentation-only.*A0/i, "task board must retain the A0 approval as completed documentation-only judgment");
for (const [overrides, expectedError] of [
  [{ raw_payload: "synthetic" }, /rejects unknown field/],
  [{ cost_model_input_fingerprint: "sha256:synthetic" }, /rejects unknown field/],
  [{ bound_input: `${canonicalCompletedA0ProvisionalCostModelApprovalFields.bound_input};numeric-price-jpy=100` }, /must not include numeric price/],
  [{ bound_input: canonicalCompletedA0ProvisionalCostModelApprovalFields.bound_input.replace("cache-hit-skip", "cache-hit-counted") }, /exact provider usage boundary/],
  [{ bound_input: canonicalCompletedA0ProvisionalCostModelApprovalFields.bound_input.replace("signed-subscription-authority", "unsigned-subscription-authority") }, /unsigned or redirect authority/],
  [{ provider_funding_authorization: "approved" }, /completed A0 provisional cost-model approval/],
  [{ stripe_payment_or_refund_authorization: "approved" }, /completed A0 provisional cost-model approval/],
  [{ external_action: "executed" }, /completed A0 provisional cost-model approval/],
  [{ command: "external-command" }, /completed A0 provisional cost-model approval/],
  [{ row_closure: "EVID-PRODUCT-PRICE" }, /completed A0 provisional cost-model approval/],
  [{ activation_status: "open" }, /completed A0 provisional cost-model approval/],
  [{ approval_decision: "unapproved" }, /explicit owner approval/],
  [{ final_go: "approved" }, /rejects unknown field/]
]) {
  assert.throws(
    () => validateCompletedA0ProvisionalCostModelApproval({
      ...completedA0ProvisionalCostModelApproval,
      fields: { ...completedA0ProvisionalCostModelApproval.fields, ...overrides }
    }),
    expectedError
  );
}
const unapprovedA2FundingDisposition = parseUnapprovedA2ProviderFundingRequirementDisposition(checklist);
validateUnapprovedA2ProviderFundingRequirementDisposition(unapprovedA2FundingDisposition);
const unapprovedA2FundingDispositionReadiness = parseUnapprovedA2ProviderFundingRequirementDisposition(readiness);
validateUnapprovedA2ProviderFundingRequirementDisposition(unapprovedA2FundingDispositionReadiness);
assert.deepEqual(unapprovedA2FundingDispositionReadiness.fields, unapprovedA2FundingDisposition.fields, "readiness and checklist must retain the same exact unapproved A2 funding-requirement disposition proposal");
assert.match(task, /NC-R1-A2-PROVIDER-FUNDING-REQUIREMENT-DISPOSITION-20260810-01/, "task board must retain the corrected unapproved A2 funding-requirement disposition proposal identifier");
assert.match(task, /A2.*unapproved.*non-executable|unapproved.*non-executable.*A2/i, "task board must retain the A2 funding-requirement disposition as unapproved and non-executable");
for (const [overrides, expectedError] of [
  [{ raw_payload: "synthetic" }, /rejects unknown field/],
  [{ approval_decision: "approved" }, /must remain unapproved|exact non-executable/],
  [{ proposed_funding_requirement_state: "already-available" }, /exact non-executable/],
  [{ funding_authorization: "approved" }, /exact non-executable|must not authorize funding/],
  [{ provider_api_authorization: "approved" }, /exact non-executable|must not authorize a provider API/],
  [{ payment_or_credit_authorization: "approved" }, /exact non-executable|must not authorize payment or credit/],
  [{ external_action: "performed" }, /exact non-executable|must not authorize an external action/],
  [{ external_prerequisite_approval: "approved" }, /exact non-executable|must not approve the external prerequisite/],
  [{ dependent_child_status_effect: "approved-not-started" }, /exact non-executable|must not change the dependent child/],
  [{ row_closure: "EVID-PROVIDER-COST" }, /exact non-executable|must close no row/],
  [{ activation_status: "open" }, /exact non-executable|closed activation/],
  [{ bound_a0_cost_model_input_fingerprint: fixtureFingerprint("a0-input-drift") }, /exact non-executable/],
  [{ final_go: "approved" }, /rejects unknown field/]
]) {
  assert.throws(
    () => validateUnapprovedA2ProviderFundingRequirementDisposition({ ...unapprovedA2FundingDisposition, fields: { ...unapprovedA2FundingDisposition.fields, ...overrides } }),
    expectedError
  );
}
const a2FundingDispositionResultTemplate = parseA2FundingRequirementDispositionResultTemplate(checklist);
validateA2FundingRequirementDispositionResultTemplate(a2FundingDispositionResultTemplate);
const a2FundingDispositionResultTemplateReadiness = parseA2FundingRequirementDispositionResultTemplate(readiness);
validateA2FundingRequirementDispositionResultTemplate(a2FundingDispositionResultTemplateReadiness);
assert.deepEqual(a2FundingDispositionResultTemplateReadiness.fields, a2FundingDispositionResultTemplate.fields, "readiness and checklist must retain the same exact non-evidence A2 funding disposition template");
const a2FundingDispositionOwnerApprovalTemplate = parseA2FundingDispositionOwnerApprovalTemplate(checklist);
validateA2FundingDispositionOwnerApprovalTemplate(a2FundingDispositionOwnerApprovalTemplate);
const a2FundingDispositionOwnerApprovalTemplateReadiness = parseA2FundingDispositionOwnerApprovalTemplate(readiness);
validateA2FundingDispositionOwnerApprovalTemplate(a2FundingDispositionOwnerApprovalTemplateReadiness);
assert.deepEqual(a2FundingDispositionOwnerApprovalTemplateReadiness.fields, a2FundingDispositionOwnerApprovalTemplate.fields, "readiness and checklist must retain the same exact non-evidence A2 owner-approval template");
const unapprovedA3StripePricingDocumentPacket = parseUnapprovedA3StripePricingDocumentManualPacket(checklist);
validateUnapprovedA3StripePricingDocumentManualPacket(unapprovedA3StripePricingDocumentPacket);
const unapprovedA3StripePricingDocumentPacketReadiness = parseUnapprovedA3StripePricingDocumentManualPacket(readiness);
validateUnapprovedA3StripePricingDocumentManualPacket(unapprovedA3StripePricingDocumentPacketReadiness);
assert.deepEqual(unapprovedA3StripePricingDocumentPacketReadiness.fields, unapprovedA3StripePricingDocumentPacket.fields, "readiness and checklist must retain the same exact unapproved A3 Stripe pricing-document manual packet");
const a2ProviderCostObservedResultTemplate = parseA2ProviderCostObservedResultTemplate(checklist);
validateA2ProviderCostObservedResultTemplate(a2ProviderCostObservedResultTemplate);
const a2ProviderCostObservedResultTemplateReadiness = parseA2ProviderCostObservedResultTemplate(readiness);
validateA2ProviderCostObservedResultTemplate(a2ProviderCostObservedResultTemplateReadiness);
assert.deepEqual(a2ProviderCostObservedResultTemplateReadiness.fields, a2ProviderCostObservedResultTemplate.fields, "readiness and checklist must retain the same exact non-evidence A2 Provider Cost result template");
const a3StripePricingDocumentResultTemplate = parseA3StripePricingDocumentResultTemplate(checklist);
validateA3StripePricingDocumentResultTemplate(a3StripePricingDocumentResultTemplate);
const a3StripePricingDocumentResultTemplateReadiness = parseA3StripePricingDocumentResultTemplate(readiness);
validateA3StripePricingDocumentResultTemplate(a3StripePricingDocumentResultTemplateReadiness);
assert.deepEqual(a3StripePricingDocumentResultTemplateReadiness.fields, a3StripePricingDocumentResultTemplate.fields, "readiness and checklist must retain the same exact non-evidence A3 Stripe pricing-document result template");
const a3ManualReadOwnerApprovalTemplate = parseA3ManualReadOwnerApprovalTemplate(checklist);
validateA3ManualReadOwnerApprovalTemplate(a3ManualReadOwnerApprovalTemplate);
const a3ManualReadOwnerApprovalTemplateReadiness = parseA3ManualReadOwnerApprovalTemplate(readiness);
validateA3ManualReadOwnerApprovalTemplate(a3ManualReadOwnerApprovalTemplateReadiness);
assert.deepEqual(a3ManualReadOwnerApprovalTemplateReadiness.fields, a3ManualReadOwnerApprovalTemplate.fields, "readiness and checklist must retain the same exact non-evidence A3 owner approval template");
assert.match(task, /NC-R1-A3-STRIPE-ACCOUNT-PRICING-DOCUMENT-MANUAL-20260810-01/, "task board must retain the corrected unapproved A3 Stripe pricing-document manual packet identifier");
assert.match(task, /A3.*unapproved.*non-executable|unapproved.*non-executable.*A3/i, "task board must retain the A3 Stripe pricing-document manual packet as unapproved and non-executable");
for (const [overrides, expectedError] of [
  [{ raw_payload: "synthetic" }, /exact non-executable/],
  [{ approval_decision: "approved" }, /must remain unapproved|exact non-executable/],
  [{ external_action: "started" }, /must remain not started|exact non-executable/],
  [{ operator: "Codex-root-agent-current-task" }, /Kurodev-operated|exact non-executable/],
  [{ command: "stripe-command" }, /no Codex command|exact non-executable/],
  [{ codex_browser_or_stripe_control: "approved" }, /no browser or Stripe control|exact non-executable/],
  [{ payment_refund_client_or_event_settings_api_export_action: "performed" }, /no Stripe side effect|exact non-executable/],
  [{ credential_creation_retrieval_disclosure: "performed" }, /no credential action|exact non-executable/],
  [{ raw_document_contract_text_url_account_identifier_private_identifier_retention: "retained" }, /no raw or private material|exact non-executable/],
  [{ public_pricing_substitution: "allowed" }, /must not substitute public pricing|exact non-executable/],
  [{ default_incremental_spend_jpy: "1" }, /zero default incremental spend|exact non-executable/],
  [{ row_closure: "EVID-STRIPE-COST" }, /close no row|exact non-executable/],
  [{ activation_status: "open" }, /closed activation|exact non-executable/],
  [{ bound_a0_cost_model_input_fingerprint: fixtureFingerprint("a0-input-drift") }, /exact non-executable/]
]) {
  assert.throws(() => validateUnapprovedA3StripePricingDocumentManualPacket({ ...unapprovedA3StripePricingDocumentPacket, fields: { ...unapprovedA3StripePricingDocumentPacket.fields, ...overrides } }), expectedError);
}
for (const [appendedProse, expectedError] of [
  ["\nReopen the Stripe Plans/Fees surface for this packet.", /must not reopen the prior Plans\/Fees surface/],
  ["\nPrivate Stripe account identifier: acct_private_fixture.", /must not retain a raw URL or private Stripe identifier/],
  ["\nPrivate Stripe subscription identifier: sub_private_fixture.", /must not retain a raw URL or private Stripe identifier/],
  ["\nPrivate Stripe webhook secret: whsec_private_fixture.", /must not retain a raw URL or private Stripe identifier/],
  ["\nPrivate Stripe PaymentIntent identifier: pi_private_fixture.", /must not retain a raw URL or private Stripe identifier/],
  ["\nPrivate Stripe test Checkout identifier: cs_test_private_fixture.", /must not retain a raw URL or private Stripe identifier/],
  ["\nPrivate Stripe live Checkout identifier: cs_live_private_fixture.", /must not retain a raw URL or private Stripe identifier/]
]) {
  assert.throws(
    () => validateUnapprovedA3StripePricingDocumentManualPacket({
      ...unapprovedA3StripePricingDocumentPacket,
      section: `${unapprovedA3StripePricingDocumentPacket.section}${appendedProse}`
    }),
    expectedError
  );
}
const workerCpuSchemaManualResultTemplate = parseWorkerCpuSchemaManualResultTemplate(checklist);
validateWorkerCpuSchemaManualResultTemplate(workerCpuSchemaManualResultTemplate);
const workerCpuSchemaManualResultTemplateReadiness = parseWorkerCpuSchemaManualResultTemplate(readiness);
validateWorkerCpuSchemaManualResultTemplate(workerCpuSchemaManualResultTemplateReadiness);
assert.deepEqual(
  workerCpuSchemaManualResultTemplateReadiness.fields,
  workerCpuSchemaManualResultTemplate.fields,
  "readiness and checklist must retain the same exact non-evidence Worker CPU manual schema-capability result template"
);
const a1WorkerCpuObservedResultTemplate = parseA1WorkerCpuObservedResultTemplate(checklist);
validateA1WorkerCpuObservedResultTemplate(a1WorkerCpuObservedResultTemplate);
const a1WorkerCpuObservedResultTemplateReadiness = parseA1WorkerCpuObservedResultTemplate(readiness);
validateA1WorkerCpuObservedResultTemplate(a1WorkerCpuObservedResultTemplateReadiness);
assert.deepEqual(
  a1WorkerCpuObservedResultTemplateReadiness.fields,
  a1WorkerCpuObservedResultTemplate.fields,
  "readiness and checklist must retain the same exact non-evidence A1 Worker CPU observed-result template"
);
// Contract-only synthetic fixtures; they are not parsed documentation or observed Worker CPU evidence.
const completeWorkerCpuSchemaManualResultFixture = {
  observed_at: "2026-08-09T20:00:00+09:00",
  freshness_time_zone: "Asia/Tokyo",
  freshness_anchor: "2026-08-09T23:59:59+09:00",
  freshness_window: "2026-08-09T00:00:00+09:00/2026-08-09T23:59:59+09:00",
  target_match: "exact",
  authentication_result: "authenticated",
  schema_transport_result: "available",
  schema_dataset_available: "available",
  sum_requests_available: "available",
  quantiles_cpu_time_p50_available: "available",
  quantiles_cpu_time_p99_available: "available",
  sampling_disclosure_capability: "available",
  confidence_metadata_capability: "available",
  exact_target_filter_capability: "available",
  full_window_aggregation_capability: "available",
  node_limit_disclosure: "available",
  pagination_capability: "available",
  non_truncation_provable: "available",
  raw_response_credential_account_tag_private_script_name_retained: "no",
  raw_response_credential_account_tag_private_script_name_shared: "no",
  credential_creation_retrieval_disclosure: "no",
  credential_token_api_key_retained_or_shared: "no",
  codex_browser_or_graphql_control: "no",
  workers_logs_trace_query_builder_logpush_tail_opened: "no",
  raw_events_raw_requests_retained_or_shared: "no",
  settings_configuration_read_action: "none",
  settings_configuration_write_action: "none",
  provider_stripe_supabase_product_price_legal_copy_risk_acceptance_live_flow_deploy_activation_git_cleanup_action: "none",
  incremental_charge: "no",
  stop_result: "completed-schema-capability-only",
  result_status: "complete",
  data_query_executed: "no",
  row_closure: "none"
};
assert.doesNotThrow(() => validateWorkerCpuSchemaManualResultRecord(completeWorkerCpuSchemaManualResultFixture));
const partialStopWorkerCpuSchemaManualResultFixture = {
  ...completeWorkerCpuSchemaManualResultFixture,
  schema_dataset_available: "unconfirmed",
  stop_result: "schema-dataset-unconfirmed",
  result_status: "partial-stop"
};
assert.doesNotThrow(() => validateWorkerCpuSchemaManualResultRecord(partialStopWorkerCpuSchemaManualResultFixture));
for (const field of Object.keys(completeWorkerCpuSchemaManualResultFixture)) {
  const missingFieldFixture = { ...completeWorkerCpuSchemaManualResultFixture };
  delete missingFieldFixture[field];
  assert.throws(() => validateWorkerCpuSchemaManualResultRecord(missingFieldFixture), new RegExp(`requires ${escapeRegExp(field)}`));
}
for (const [field, value] of [
  ["data_query_executed", "yes"],
  ["incremental_charge", "yes"],
  ["row_closure", "EVID-WORKER-CPU"]
]) {
  assert.throws(
    () => validateWorkerCpuSchemaManualResultRecord({ ...completeWorkerCpuSchemaManualResultFixture, [field]: value }),
    /must not|cannot close/
  );
}
for (const field of workerCpuSchemaManualResultProhibitedNoFields) {
  assert.throws(
    () => validateWorkerCpuSchemaManualResultRecord({ ...completeWorkerCpuSchemaManualResultFixture, [field]: "yes" }),
    /must be no/
  );
}
for (const field of workerCpuSchemaManualResultProhibitedNoneFields) {
  assert.throws(
    () => validateWorkerCpuSchemaManualResultRecord({ ...completeWorkerCpuSchemaManualResultFixture, [field]: "performed" }),
    /must be none/
  );
}
for (const unknownField of ["raw_payload", "private_identifier"]) {
  assert.throws(
    () => validateWorkerCpuSchemaManualResultRecord({ ...completeWorkerCpuSchemaManualResultFixture, [unknownField]: "synthetic" }),
    /rejects unknown field/
  );
}
for (const [observedAt, expectedError] of [
  ["2026-08-09T20:00:00", /strict RFC3339 with a timezone/],
  ["2026-02-30T20:00:00+09:00", /non-canonical UTC date/],
  ["2026-08-08T23:59:59+09:00", /stale outside the fixed current-task freshness window/],
  ["2026-08-10T00:00:00+09:00", /must not be future-dated/]
]) {
  assert.throws(
    () => validateWorkerCpuSchemaManualResultRecord({ ...completeWorkerCpuSchemaManualResultFixture, observed_at: observedAt }),
    expectedError
  );
}
assert.throws(
  () => validateWorkerCpuSchemaManualResultRecord({ ...completeWorkerCpuSchemaManualResultFixture, stop_result: "none" }),
  /complete status requires completed-schema-capability-only/
);
assert.throws(
  () => validateWorkerCpuSchemaManualResultRecord({ ...partialStopWorkerCpuSchemaManualResultFixture, stop_result: "none" }),
  /must truthfully identify a recorded gap/
);
for (const field of workerCpuSchemaManualResultCapabilityFields) {
  for (const unavailableValue of ["unavailable", "unconfirmed"]) {
    assert.throws(
      () => validateWorkerCpuSchemaManualResultRecord({ ...completeWorkerCpuSchemaManualResultFixture, [field]: unavailableValue }),
      /must partial-stop/
    );
  }
}
for (const unavailableValue of ["unavailable", "unconfirmed"]) {
  assert.throws(
    () => validateWorkerCpuSchemaManualResultRecord({ ...completeWorkerCpuSchemaManualResultFixture, schema_transport_result: unavailableValue }),
    /must partial-stop/
  );
}

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
  local_class_historical_pr750_execution_claim: "allowed-only-for-explicitly-bound-historical-pr750-local-target",
  local_class_invalidation: "target-artifact-hash-source-or-freshness-drift",
  local_class_non_claims: "not-live-deployed-production-or-account-headroom-proof"
};
for (const [field, expected] of Object.entries(canonicalLocalClassFields)) {
  assert.equal(readUniqueTextField(readiness, field), expected, `${field} must retain the exact local evidence boundary`);
}
assert.match(readiness, /^\| `local` \| explicitly named exact local checkout\/snapshot\/artifact target/m, "local evidence must be scoped to an explicit exact target");
assert.doesNotMatch(readiness, /^\| `local` \| この checkout/m, "local evidence must not be limited to this fresh checkout");
assert.match(readiness, /explicitly bound exact local target についてはcommand executionを証明できる/, "local evidence must permit execution claims only for an explicitly bound exact local target");
assert.doesNotMatch(readiness, /current continuation command execution、live\/deployed\/production state、account headroom は証明しない/, "historical evidence must not be described as current continuation execution");
assert.match(readiness, /Historical PR #749 worktree results are non-authoritative reference only for current closure/);
assert.match(readiness, /Historical dependency-backed public-entitlement and security\/privacy contracts likewise do not prove results in this fresh isolated worktree/);
assert.match(task, /does not retain PR #749 dependency-backed results as closure evidence/);
assert.doesNotMatch(task, /keeps exact-snapshot PR #749 local evidence only/);
assert.doesNotMatch(task, new RegExp("This continuation" + " worktree"));
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
for (const row of evidenceRows.filter((entry) => historicalPr750LocalRevalidationEvidenceIds.includes(entry.id))) {
  assertHistoricalReferenceCannotSupersedeHistoricalPr750LocalRow({
    evidenceId: row.id,
    historicalAuthority: canonicalHistoricalPr749EvidenceFields.historical_pr749_current_closure_authority,
    historicalPr750Status: row.status,
    historicalPr750Verification: "historical-pr750-worktree-post-approved-install-local-read-only-revalidation"
  });
}
assert.match(readiness, /does not prove an exact actual byte count/);
assert.match(readiness, /does not claim that the commit alone reproduces the result/);
assert.match(readiness, /non-authoritative reference only for current closure/, "historical PR #749 evidence must be non-authoritative for current closure");
assert.match(readiness, /dirty snapshot runtime-input equality to final head is unproven/, "historical PR #749 evidence must record incomplete runtime binding");
assert.match(readiness, /Node\/npm\/toolchain identity is missing/, "historical PR #749 evidence must record missing toolchain identity");
assert.match(readiness, /source and release-window drift are not derivable/, "historical PR #749 evidence must not invent drift validation");
for (const [field, expected] of Object.entries(canonicalHistoricalPr750LocalVerificationFields)) {
  assert.equal(readUniqueTextField(readiness, field), expected, `${field} must retain the completed historical PR #750 worktree local verification record`);
}
assert.deepEqual(
  currentRuntimeSourceChangesOutsideAuthority(),
  [],
  "runtime source or untracked input drift outside the exact six staged-resolution authority paths invalidates the documentation-only transition"
);
assert.equal(existsSync(join(repositoryRoot, "node_modules")), false, "fresh isolated worktree must not hide absent dependencies");
assert.match(readiness, /current_fresh_isolated_worktree_dependency_backed_checks=setup-blocked-no-install-authorized/, "fresh isolated worktree must classify dependency-backed checks as setup-blocked");
assert.match(readiness, /prior local evidence.*fresh isolated worktree/i, "prior local evidence must not become fresh isolated worktree proof");

const numericRows = parseNumericRows(readiness);
validateNumericRows(numericRows);
assert.match(readiness, /unsupported-numeric-claim=forbidden/);
assert.match(readiness, /public-source-is-not-account-headroom-or-production-proof/);

runNegativeHelperAssertions(evidenceRows, numericRows, documentedUnresolvedHardRequirements, primaryApprovalUnitRows, acquisitionDecisionRows, decisionSequenceFields, historicalPr750LocalApprovalPacket, completedWorkerRequestReadinessPacket, completedSupabaseSizeReadinessPacket, completedSupabasePausePartialStopReadinessPacket, completedSupabasePausePostureDecisionReadiness, completedSupabaseEgressPartialStopReadinessPacket, completedSupabaseCachedEgressReadinessPacket, completedWorkerCpuPartialStopReadinessPacket, completedProviderCostPartialStopReadinessPacket, completedProviderFundingPostureDecisionReadinessPacket, completedStripeCostPartialStopReadinessPacket, completedStripeBaseFeePartialStopReadinessPacket, completedSupportPostureDecisionReadinessPacket, completedSupabaseBackupPrerequisiteInputReadinessPacket, completedSupabaseBackupPostureDecisionReadinessPacket, nextApprovalPacket);

for (const invariant of [
  "Free behavior remains permanent",
  "all billing/provider/Creator/public activation gates remain fixed closed",
  "only compatible signed subscription evidence may authorize Paid",
  "Checkout redirect/completion is not Paid evidence",
  "fixture, local, and public-source evidence are not production proof",
  "Product/Price/tax/legal/copy/risk acceptance are not inferred",
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
  "current_pr=751",
  "current_pr_state=draft-open",
  "current_pr_implementation_head=f95399e67e73cdb9a86ab830dac9f5865b585226",
  "current_pr_final_head=pending-final-review",
  "current_pr_deployment_status=not-applicable-unmerged",
  "previous_pr=750",
  "previous_pr_state=merged",
  "previous_pr_merge_integration_tip=78ab5908df8bf39427b6a929d375d7df93bf13a9",
  "previous_pr_final_head=80e97d42812d8cb30fc75535aab375676a6fad61",
  "current_base=codex/comment-translator-free-public-beta-integration",
  "current_worktree=isolated-feature-branch-codex-comment-translator-creator-nc-r1-staged-resolution",
  "current_lane=NC-R1",
  "launch_readiness_decision=no-go",
  "publication_status=draft-pr-open",
  "deploy_status=not-confirmed-for-pr750",
  "current_dependencies=absent-setup-blocked-no-install-authorized",
  "unresolved_hard_requirements=9",
  "nc_l1_status=not-started",
  "nc_l1_start_condition=nc-r1-explicit-go-after-zero-unresolved-hard-requirements",
  readinessPath,
  checklistPath
]) {
  assert.match(task, new RegExp(escapeRegExp(marker)), `missing current task marker: ${marker}`);
}
validateTaskOperationalFields(task);
assert.doesNotMatch(
  task,
  /next unapproved unit is exactly one non-executable EVID-WORKER-CPU documentation-only release-owner Worker CPU GraphQL execution-path disposition/i,
  "task must not retain the completed Worker CPU execution-path disposition as the next unit"
);
assert.match(
  task,
  /approved-not-started EVID-WORKER-CPU authenticated-private-read Worker CPU GraphQL schema-capability-only packet/i,
  "task must identify the owner-approved, not-started Worker CPU schema-capability-only packet"
);
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
  "## Historical PR #750 Worktree Local Revalidation",
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
  "## Approved-Not-Started Worker CPU Manual Schema-Capability Packet",
  "## Completed A0 Provisional Cost-Model Input Approval",
  "## Unapproved A2 Provider Funding-Requirement Disposition Proposal",
  "## Unapproved A3 Stripe Account-Pricing Document Manual Packet",
  "## Exact Non-Evidence A2 Provider Cost Observed Result Template",
  "## Exact Non-Evidence A3 Stripe Account-Pricing Document Result Template",
  "## Exact Non-Evidence Worker CPU Manual Schema-Capability Result Template",
  "## Ordered Judgment And Final Release Decision Sequence",
  "## Release Owner Decisions",
  "## Stop Conditions",
  "## Rollback Packet",
  "## Go Or No-Go Record",
  "current_decision=no-go",
  "current_unresolved_hard_requirement_count=9",
  "activation_status=closed",
  "no external operation is authorized by this checklist"
]) {
  assert.match(checklist, new RegExp(escapeRegExp(marker)), `missing operator marker: ${marker}`);
}
assert.match(checklist, /non-authoritative reference only for current closure/, "checklist must reject historical evidence as current closure authority");
assert.match(checklist, /dirty snapshot runtime-input equality to final head is unproven/, "checklist must disclose incomplete historical runtime binding");
assert.match(checklist, /Node\/npm\/toolchain identity は missing/, "checklist must disclose missing historical toolchain identity");
assert.match(checklist, /source\/release-window drift は not derivable/, "checklist must not invent historical drift validation");
assert.match(checklist, /Historical PR #750 Worktree Local Revalidation/, "checklist must record the historical PR #750 local verification without promoting it to current execution");
assert.match(checklist, /EVID-WORKER-SIZE only as local artifact acceptance/, "checklist must reject Worker size promotion to account or deployed proof");
assert.match(checklist, /Completed Release-Owner Supabase Pause-Posture Decision/, "checklist must retain the completed accepted Pause posture decision");
assert.match(checklist, /decision_owner=kurodev/, "checklist must retain the named accepted Pause posture decision owner");
assert.match(checklist, /decision=accepted/, "checklist must retain the accepted Pause posture decision result");
assert.match(checklist, /residual auto-pause risk.*EVID-RISK-ACCEPTANCE/i, "checklist must carry accepted residual auto-pause risk to EVID-RISK-ACCEPTANCE");
assert.match(checklist, /Completed Authenticated-Private Worker CPU Re-Read Partial-Stop Evidence/, "checklist must retain the completed Worker CPU re-read partial stop");
assert.match(checklist, /approval_id=NC-R1-WORKER-CPU-REREAD-20260809-01/, "checklist must retain the exact approved Worker CPU re-read identifier");
assert.match(checklist, /explicit_aggregation_completeness=not-displayed/, "checklist must retain the Worker CPU completeness gap");
assert.match(checklist, /row_closure=none/, "checklist must retain no Worker CPU row closure");
assert.match(checklist, /release-owner-judgment-worker-cpu-evidence-source-disposition-only/, "checklist must retain the completed Worker CPU documentation-only disposition scope");
assert.match(checklist, /approval_id=NC-R1-WORKER-CPU-GRAPHQL-PATH-20260809-01/, "checklist must retain the completed Worker CPU execution-path disposition identifier");
assert.match(checklist, /does not authorize a data query or credential creation, retrieval, or disclosure/i, "checklist must retain the next CPU schema-only non-execution boundary");
assert.equal(readUniqueTextField(checklist, "unresolved_hard_requirements"), "9", "checklist final Go Or No-Go Record must retain exactly 9 unresolved hard requirements");
assert.match(checklist, /upgrade_authorization=none/, "checklist must prohibit actual upgrade authorization in the completed Backup owner judgment");
assert.match(checklist, /npm\.cmd clean-install --progress=false/, "checklist must retain the exact approved install command");
assert.match(checklist, /unapproved, non-executable/i, "checklist must preserve the unapproved next CPU packet status");
assert.match(checklist, /fresh_isolated_worktree_node_modules=absent/, "checklist must retain the fresh isolated dependency state");
assert.doesNotMatch(checklist, /このfresh worktree/, "checklist must not present historical evidence as fresh isolated worktree evidence");

for (const approvalUnit of [
  "APPROVAL-CLOUDFLARE-READ",
  "APPROVAL-SUPABASE-READ",
  "APPROVAL-PRODUCT-PRICE",
  "APPROVAL-LEGAL",
  "APPROVAL-COPY",
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
assert.match(checklist, /^\| APPROVAL-SLA \| approved-completed-documentation-only \|/m, "SLA posture approval must be recorded as completed without opening external gates");
assert.equal((checklist.match(/^\| APPROVAL-SUPPORT \|/gm) ?? []).length, 1, "Support approval registry row must be unique");
assert.equal((checklist.match(/^\| APPROVAL-SLA \|/gm) ?? []).length, 1, "SLA approval registry row must be unique");
assert.doesNotMatch(checklist, /^\| APPROVAL-SUPPORT \| unapproved \|/m, "completed Support approval must not retain a contradictory unapproved registry row");
assert.doesNotMatch(checklist, /APPROVAL-SLA-RISK/, "legacy bundled SLA-risk approval unit must not return");
for (const staleCurrentTaskPhrase of [
  /10 current unresolved hard requirements/i,
  /next (?:minimum |unapproved )?(?:packet|unit).*EVID-SLA/i,
  /EVID-SLA `release-owner-judgment-sla-posture-only`/i,
  /SLA still separate and unapproved/i,
  /node_modules=present-lockfile-matched/i
]) {
  assert.doesNotMatch(task, staleCurrentTaskPhrase, "task current operational prose must not retain a stale pre-SLA state");
}
assert.match(checklist, /A documentation-only release-owner judgment instead must state its exact scope, decision input or posture, effective date, named decision owner\/approver, evidence retention location, stop owner, and rollback owner; it has no executable operator or operation time window\./, "documentation-only owner judgments must use their own non-executable completeness rule");
assert.match(checklist, /No documentation-only judgment authorizes an external operation\./, "documentation-only owner judgments must not authorize external operations");
assert.match(checklist, /^\| APPROVAL-PROVIDER-READ \| approved-partial-stop-read-plus-documentation-only-judgment \|/m, "Provider Cost partial-stop read and documentation-only judgment must be recorded without row closure");
assert.match(checklist, /^\| APPROVAL-STRIPE-READ \| approved-partial-stop-authenticated-private-read \|/m, "Stripe Cost partial-stop read must be recorded without row closure");
assert.doesNotMatch(checklist, /APPROVAL-WORKER-LIMIT-ALIGNMENT/);

assert.doesNotMatch(`${readiness}\n${checklist}`, /(?:sk_(?:live|test)_|whsec_|bearer\s|authorization:|password=|cookie=|localstorage|sessionstorage|indexeddb|livechatid|customer_[a-z0-9]|subscription_[a-z0-9])/i);
assertNoSupabasePrivateIdentifiers(`${readiness}\n${checklist}\n${task}`);
assert.doesNotMatch(`${readiness}\n${checklist}`, /(?:dockerfile|container binding|container-backed)/i);

const stagedManifestFields = {
  manifest_execution_status: "unapproved-non-executable",
  manifest_phase: "manifest-creation",
  manifest_type: "multi-unit-staged-resolution-control-plane",
  approval_effect: "none",
  row_group_count: "8",
  row_groups: "EVID-WORKER-CPU,EVID-PROVIDER-COST,EVID-STRIPE-COST,EVID-PRODUCT-PRICE,EVID-LEGAL,EVID-COPY,EVID-DEPLOYED-TARGET,EVID-LIVE-PAID-FLOW",
  row_isolation: "required",
  closure_rule: "per-row-only-after-fresh-exact-approved-complete-target-matched-evidence",
  cross_row_approval: "forbidden",
  cross_row_closure: "forbidden",
  dependency_skip: "forbidden",
  partial_stop_rule: "stop-current-row-and-all-dependent-child-units",
  global_stop_rule: "private-exposure,target-mismatch,scope-expansion,unsigned-paid-transition,activation-drift,migration-drift,unapproved-cost-bearing-action,rollback-unavailable",
  default_incremental_spend_jpy: "0",
  stop_before_any_incremental_charge: "yes",
  unapproved_cost_bearing_action: "partial-stop-and-request-separate-budget-approval",
  risk_acceptance: "excluded",
  final_release_go: "excluded",
  activation_status: "closed",
  free_behavior: "permanent",
  nc_l1_status: "not-started",
  child_approval_unit: "required-per-child",
  child_approval_id: "required-unique-per-child",
  child_explicit_decision: "required-per-child",
  child_target_scope_stop_rollback: "required-exact-per-child"
};
const stagedRows = [
  ["EVID-WORKER-CPU", "authenticated-private-read", "A1-worker-cpu-source-disposition", "A1-worker-cpu-source-disposition,A1-worker-cpu-evidence-read", "A1-worker-cpu-evidence-read", "executable"],
  ["EVID-PROVIDER-COST", "authenticated-private-read", "A0-provisional-cost-model-input", "A0-provisional-cost-model-input,A2-provider-funding-external-prerequisite-reference,A2-provider-cost-evidence-read", "A2-provider-cost-evidence-read", "executable"],
  ["EVID-STRIPE-COST", "authenticated-private-read", "A0-provisional-cost-model-input", "A0-provisional-cost-model-input,A3-stripe-source-applicability-read-or-judgment", "A3-stripe-source-applicability-read-or-judgment", "mixed"],
  ["EVID-PRODUCT-PRICE", "release-owner-judgment", "A0-provisional-cost-model-input,A2-provider-cost-evidence-read,A3-stripe-source-applicability-read-or-judgment", "A0-provisional-cost-model-input,A2-provider-cost-evidence-read,A3-stripe-source-applicability-read-or-judgment,A4-product-price-judgment", "A4-product-price-judgment", "judgment"],
  ["EVID-LEGAL", "release-owner-judgment", "A4-product-price-judgment", "A4-product-price-judgment,A5-legal-judgment", "A5-legal-judgment", "judgment"],
  ["EVID-COPY", "release-owner-judgment", "A4-product-price-judgment,A5-legal-judgment", "A4-product-price-judgment,A5-legal-judgment,A6-copy-judgment", "A6-copy-judgment", "judgment"],
  ["EVID-DEPLOYED-TARGET", "deploy-deployed-proof", "A1-worker-cpu-evidence-read,A4-product-price-judgment,A5-legal-judgment,A6-copy-judgment,B1-external-prerequisite-sanitized-result-reference", "A1-worker-cpu-evidence-read,A4-product-price-judgment,A5-legal-judgment,A6-copy-judgment,B1-external-prerequisite-sanitized-result-reference,B1-deployed-target-proof", "B1-deployed-target-proof", "executable"],
  ["EVID-LIVE-PAID-FLOW", "live-operation", "B1-deployed-target-proof", "B1-deployed-target-proof,B2-live-paid-flow-evidence", "B2-live-paid-flow-evidence", "executable"]
].map(([id, approvalUnit, prerequisites, childIds, closingChild, kind]) => ({ id, approvalUnit, prerequisites, childIds, closingChild, kind }));

function sectionBody(markdown, heading) {
  const section = markdown.match(new RegExp(`^${escapeRegExp(heading)}\\r?\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, "m"));
  assert.ok(section, `missing staged section: ${heading}`);
  return section[1];
}

function parseExactTextBlock(section) {
  const block = section.match(/```text\r?\n([\s\S]*?)```/);
  assert.ok(block, "staged section requires a text field block");
  const pairs = [...block[1].matchAll(/^([a-z0-9_]+)=([^\r\n]+)$/gm)];
  assert.equal(new Set(pairs.map((pair) => pair[1])).size, pairs.length, "staged text fields must be unique");
  return Object.fromEntries(pairs.map((pair) => [pair[1], pair[2].trim()]));
}

function assertRequiredParsedTextField(fields, field, context) {
  const value = fields?.[field];
  assert.equal(typeof value, "string", `${context} requires ${field}`);
  assert.match(value, /^(?!<required|N\/A).+$/, `${context} requires ${field}`);
  return value;
}

function assertDateParseValid(value, context) {
  assert.equal(typeof value, "string", `${context} requires a Date.parse-valid timestamp`);
  assert.match(value, /^(?!<required|N\/A).+$/, `${context} requires a Date.parse-valid timestamp`);
  assert.ok(Number.isFinite(Date.parse(value)), `${context} requires a Date.parse-valid timestamp`);
  return value;
}

function assertStrictAsiaTokyoCalendarTimestamp(value, context) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\+09:00$/);
  assert.ok(match, `${context} requires a strict RFC3339 Asia/Tokyo calendar timestamp`);
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
  const [year, month, day, hour, minute, second] = [yearText, monthText, dayText, hourText, minuteText, secondText].map(Number);
  assert.ok(hour <= 23 && minute <= 59 && second <= 59, `${context} requires a strict RFC3339 Asia/Tokyo calendar timestamp`);
  const calendarProbe = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  assert.ok(
    calendarProbe.getUTCFullYear() === year
      && calendarProbe.getUTCMonth() === month - 1
      && calendarProbe.getUTCDate() === day
      && calendarProbe.getUTCHours() === hour
      && calendarProbe.getUTCMinutes() === minute
      && calendarProbe.getUTCSeconds() === second,
    `${context} requires a strict RFC3339 Asia/Tokyo calendar timestamp`
  );
  return value;
}

function canonicalFingerprintValue(value, context) {
  assert.equal(typeof value, "string", `${context} requires a sanitized canonical string`);
  assert.match(value, /^(?!<required).+$/, `${context} requires a non-placeholder canonical string`);
  assert.equal(/[\r\n]/.test(value), false, `${context} canonical strings cannot contain newlines`);
  return value;
}

function deriveSanitizedFingerprint(kind, entries) {
  assert.match(kind, /^[A-Za-z0-9-]+$/, "fingerprint kind must be canonical");
  const seen = new Set();
  const serializedEntries = entries.map(([field, value]) => {
    assert.match(field, /^[a-z0-9_]+$/, "fingerprint field must be canonical");
    assert.equal(/secret|token|password|private|raw/i.test(field), false, "fingerprint canonicalization must not include secret or private fields");
    assert.equal(seen.has(field), false, "fingerprint canonicalization fields must be unique");
    seen.add(field);
    return `${field}=${canonicalFingerprintValue(value, `${kind} ${field}`)}`;
  });
  const payload = [`fingerprint_version=${fingerprintCanonicalizationVersion}`, `kind=${kind}`, ...serializedEntries].join("\n");
  return `sha256:${createHash("sha256").update(payload, "utf8").digest("hex")}`;
}

function assertDerivedSanitizedFingerprint(fields, field, kind, entries, context) {
  const expected = deriveSanitizedFingerprint(kind, entries);
  assert.equal(assertRequiredParsedTextField(fields, field, context), expected, `${context} ${field} must exactly match the deterministic sanitized ${kind} fingerprint`);
  return expected;
}

function fixtureFingerprint(label) {
  return deriveSanitizedFingerprint("fixture", [["label", label]]);
}

function deriveB2ApprovedTargetScopeBinding(fields) {
  const exactTargetOrScope = assertRequiredParsedTextField(fields, "exact_target_or_scope", "B2 target mapping");
  const targetScopeAlias = assertRequiredParsedTextField(fields, "target_scope_alias", "B2 target mapping");
  assert.equal(exactTargetOrScope, "sanitized-b2-live-flow-scope", "B2 target mapping requires the exact approved non-public scope");
  assert.equal(targetScopeAlias, "sanitized-b2-live-flow-target", "B2 target mapping requires the exact approved target alias");
  return `target_scope_alias=${targetScopeAlias};exact_target_or_scope=${exactTargetOrScope}`;
}

function deriveB2ApprovedSignedEvidenceBinding(fields) {
  return ["signed_evidence_record_id", "signed_evidence_source", "signed_evidence_classification", "signed_evidence_authority"].map((field) => `${field}=${assertRequiredParsedTextField(fields, field, "B2 signed-evidence approval binding")}`).join(";");
}

function canonicalApprovalFingerprintEntries(fields) {
  const childId = assertRequiredParsedTextField(fields, "child_id", "parsed child approval fingerprint");
  const approvalUnit = fields.selected_approval_unit && fields.selected_approval_unit !== "N/A"
    ? assertRequiredParsedTextField(fields, "selected_approval_unit", `${childId} approval fingerprint`)
    : assertRequiredParsedTextField(fields, "canonical_child_approval_unit", `${childId} approval fingerprint`);
  const entries = [
    ["child_id", childId],
    ["approval_id", assertRequiredParsedTextField(fields, "approval_id", `${childId} approval fingerprint`)],
    ["approval_decision", assertRequiredParsedTextField(fields, "explicit_decision", `${childId} approval fingerprint`)],
    ["approval_unit", approvalUnit],
    ["exact_target_or_scope", assertRequiredParsedTextField(fields, "exact_target_or_scope", `${childId} approval fingerprint`)],
    ["evidence_retention_location", assertRequiredParsedTextField(fields, "evidence_retention_location", `${childId} approval fingerprint`)],
    ["stop_owner", assertRequiredParsedTextField(fields, "stop_owner", `${childId} approval fingerprint`)],
    ["rollback_owner", assertRequiredParsedTextField(fields, "rollback_owner", `${childId} approval fingerprint`)],
    ["cost_guard", assertRequiredParsedTextField(fields, "cost_guard", `${childId} approval fingerprint`)]
  ];
  if (fields.selected_mode && fields.selected_mode !== "unselected") entries.push(["selected_mode", canonicalFingerprintValue(fields.selected_mode, `${childId} approval fingerprint`)]);
  if (childId === "B1-deployed-target-proof") {
    entries.push(
      ["expected_target_alias", assertRequiredParsedTextField(fields, "expected_target_alias", `${childId} approval fingerprint`)],
      ["expected_commit_alias", assertRequiredParsedTextField(fields, "expected_commit_alias", `${childId} approval fingerprint`)]
    );
  }
  if (childId === "B2-live-paid-flow-evidence" && fields.requested_operation !== "N/A") {
    entries.push(
      ["target_scope_alias", assertRequiredParsedTextField(fields, "target_scope_alias", `${childId} approval fingerprint`)],
      ["approved_target_scope_binding", assertRequiredParsedTextField(fields, "approved_target_scope_binding", `${childId} approval fingerprint`)],
      ["approved_signed_evidence_binding", assertRequiredParsedTextField(fields, "approved_signed_evidence_binding", `${childId} approval fingerprint`)],
      ["b2_parsed_scenarios", assertRequiredParsedTextField(fields, "b2_parsed_scenarios", `${childId} approval fingerprint`)],
      ["signed_evidence_record_id", assertRequiredParsedTextField(fields, "signed_evidence_record_id", `${childId} approval fingerprint`)],
      ["signed_evidence_source", assertRequiredParsedTextField(fields, "signed_evidence_source", `${childId} approval fingerprint`)],
      ["signed_evidence_classification", assertRequiredParsedTextField(fields, "signed_evidence_classification", `${childId} approval fingerprint`)],
      ["signed_evidence_authority", assertRequiredParsedTextField(fields, "signed_evidence_authority", `${childId} approval fingerprint`)]
    );
  }
  if (fields.requested_operation && fields.requested_operation !== "N/A") {
    entries.push(
      ["requested_operation", assertRequiredParsedTextField(fields, "requested_operation", `${childId} approval fingerprint`)],
      ["time_window", assertRequiredParsedTextField(fields, "time_window", `${childId} approval fingerprint`)],
      ["operator", assertRequiredParsedTextField(fields, "operator", `${childId} approval fingerprint`)]
    );
  } else if (fields.bound_input && fields.bound_input !== "N/A") {
    entries.push(
      ["bound_input", assertRequiredParsedTextField(fields, "bound_input", `${childId} approval fingerprint`)],
      ["effective_date", assertRequiredParsedTextField(fields, "effective_date", `${childId} approval fingerprint`)],
      ["required_approver", assertRequiredParsedTextField(fields, "required_approver", `${childId} approval fingerprint`)]
    );
  } else {
    entries.push(["child_type", assertRequiredParsedTextField(fields, "child_type", `${childId} approval fingerprint`)]);
  }
  return entries;
}

function deriveApprovalFingerprint(fields) {
  return deriveSanitizedFingerprint("child-approval", canonicalApprovalFingerprintEntries(fields));
}

function assertDerivedApprovalFingerprint(fields, context) {
  return assertDerivedSanitizedFingerprint(fields, "approval_fingerprint", "child-approval", canonicalApprovalFingerprintEntries(fields), context);
}

function assertStrictRfc3339Timestamp(value, context) {
  assert.equal(typeof value, "string", `${context} requires a strict RFC3339 timestamp with timezone`);
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|([+-])(\d{2}):(\d{2}))$/);
  assert.ok(match, `${context} requires a strict RFC3339 timestamp with Z or explicit offset`);
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, offsetSign, offsetHourText, offsetMinuteText] = match;
  const [year, month, day, hour, minute, second] = [yearText, monthText, dayText, hourText, minuteText, secondText].map(Number);
  assert.ok(month >= 1 && month <= 12, `${context} requires a valid RFC3339 calendar month`);
  assert.ok(day >= 1 && day <= new Date(Date.UTC(year, month, 0)).getUTCDate(), `${context} requires a valid RFC3339 calendar day`);
  assert.ok(hour <= 23 && minute <= 59 && second <= 59, `${context} requires a valid RFC3339 clock time`);
  if (offsetSign) assert.ok(Number(offsetHourText) <= 23 && Number(offsetMinuteText) <= 59, `${context} requires a valid RFC3339 offset`);
  const timestampMs = Date.parse(value);
  assert.ok(Number.isFinite(timestampMs), `${context} requires a Date.parse-valid strict RFC3339 timestamp`);
  return timestampMs;
}

function assertSourceTimestampWithinExactOperationWindow(fields, context, { requireFresh = true } = {}) {
  const sourceTimestamp = assertRequiredParsedTextField(fields, "source_timestamp", context);
  const sourceTimestampMs = assertStrictRfc3339Timestamp(sourceTimestamp, `${context} source timestamp`);
  const timeWindow = assertRequiredParsedTextField(fields, "time_window", context);
  const windowParts = timeWindow.split("/");
  assert.equal(windowParts.length, 2, `${context} requires one exact operation window start/end pair`);
  const [windowStart, windowEnd] = windowParts;
  const windowStartMs = assertStrictRfc3339Timestamp(windowStart, `${context} operation-window start`);
  const windowEndMs = assertStrictRfc3339Timestamp(windowEnd, `${context} operation-window end`);
  const evaluationAtMs = assertStrictRfc3339Timestamp(parsedResultEvaluationAt, "parsed-result evaluation_at");
  assert.ok(windowStartMs <= windowEndMs, `${context} exact operation window must not be reversed`);
  assert.ok(windowStartMs <= evaluationAtMs && windowEndMs <= evaluationAtMs, `${context} operation window must not be future beyond evaluation_at`);
  assert.ok(sourceTimestampMs >= windowStartMs && sourceTimestampMs <= windowEndMs, `${context} source timestamp must fall within its exact operation window`);
  assert.ok(sourceTimestampMs <= evaluationAtMs, `${context} source timestamp must not be future beyond evaluation_at`);
  const freshness = evaluationAtMs - sourceTimestampMs <= sourceMaxAgeDays * 86_400_000 ? "fresh" : "stale";
  if (requireFresh) assert.equal(freshness, "fresh", `${context} source timestamp is stale beyond source_max_age_days`);
  return { sourceTimestamp, sourceTimestampMs, freshness };
}

function assertJudgmentEffectiveDateBinding(fields) {
  const context = fields.child_id;
  const judgmentEffectiveDate = assertRequiredParsedTextField(fields, "judgment_effective_date", context);
  const childEffectiveDate = assertRequiredParsedTextField(fields, "effective_date", context);
  assert.match(judgmentEffectiveDate, /^\d{4}-\d{2}-\d{2}$/, `${context} judgment effective date requires strict YYYY-MM-DD`);
  assert.match(childEffectiveDate, /^\d{4}-\d{2}-\d{2}$/, `${context} child effective date requires strict YYYY-MM-DD`);
  const [year, month, day] = judgmentEffectiveDate.split("-").map(Number);
  const judgmentEffectiveDateMs = Date.parse(`${judgmentEffectiveDate}T00:00:00+09:00`);
  assert.ok(Number.isFinite(judgmentEffectiveDateMs), `${context} judgment effective date requires a valid Asia/Tokyo calendar day`);
  const roundTrippedJstDate = new Date(judgmentEffectiveDateMs + 9 * 60 * 60 * 1000).toISOString().slice(0, 10).split("-").map(Number);
  assert.deepEqual(roundTrippedJstDate, [year, month, day], `${context} judgment effective date requires a valid Asia/Tokyo calendar day`);
  const evaluationAtMs = Date.parse(assertDateParseValid(parsedResultEvaluationAt, "parsed-result evaluation_at"));
  assert.equal(judgmentEffectiveDate, childEffectiveDate, `${context} judgment effective date must exactly match its child effective date`);
  assert.ok(judgmentEffectiveDateMs <= evaluationAtMs, `${context} judgment effective date must not be future beyond evaluation_at`);
  assert.ok(evaluationAtMs - judgmentEffectiveDateMs <= sourceMaxAgeDays * 86_400_000, `${context} judgment effective date is stale beyond source_max_age_days`);
  return judgmentEffectiveDate;
}

function deriveB1ProofRecordFingerprint(fields) {
  return deriveSanitizedFingerprint("b1-deployed-target-proof-record", b1DeployedTargetProofRecordFields
    .filter((field) => field !== "proof_record_fingerprint")
    .map((field) => [field, fields[field]]));
}

function deriveB1ExternalPrerequisiteResultRecordFingerprint(fields) {
  return deriveSanitizedFingerprint("b1-external-prerequisite-completed-result", b1ExternalPrerequisiteResultRecordFields
    .filter((field) => field !== "external_result_record_fingerprint")
    .map((field) => [field, fields[field]]));
}

function parseB1ExternalPrerequisiteResultRecord(section) {
  return validateB1ExternalPrerequisiteResultRecord(parseStrictExactTextFence(section, b1ExternalPrerequisiteResultRecordFields, "B1 external prerequisite result"));
}

function validateB1ExternalPrerequisiteResultRecord(record, childFields = undefined, reservedApprovalIds = []) {
  const fields = record?.fields ?? record;
  const context = "B1 external prerequisite result";
  assert.ok(fields && typeof fields === "object", `${context} requires a separate parsed record`);
  assert.deepEqual(Object.keys(fields).sort(), [...b1ExternalPrerequisiteResultRecordFields].sort(), `${context} requires the exact closed schema`);
  assert.equal(fields.record_status, "approved-completed-external-prerequisite-result");
  assert.equal(fields.record_type, "sanitized-external-prerequisite-completed-result");
  assert.match(fields.external_result_record_id, /^NC-R1-B1-EXTERNAL-[A-Za-z0-9-]+$/);
  assert.equal(fields.reference_child_id, "B1-external-prerequisite-sanitized-result-reference");
  assert.equal(fields.external_lane_approval_decision, "approved");
  assert.equal(fields.external_lane_approval_id === fields.reference_child_approval_id, false, `${context} external lane approval must be separate from the reference child approval`);
  assert.equal(reservedApprovalIds.includes(fields.external_lane_approval_id), false, `${context} external lane approval must be unique and cannot reuse a staged child approval`);
  assert.equal(fields.source, "independently-authorized-external-lane-sanitized-result");
  assert.equal(fields.completion_status, "complete");
  assert.equal(fields.outcome, "sanitized-external-result-approved");
  assert.equal(fields.stop_owner, "kurodev"); assert.equal(fields.rollback_owner, "kurodev");
  assert.equal(fields.nc_r1_execution_or_authorization, "none");
  assert.equal(fields.sensitive_configuration_binding_value_retention, "none");
  for (const field of ["reference_child_approval_id", "reference_child_approval_fingerprint", "exact_target_or_scope", "external_lane_approval_id", "time_window", "evidence_retention_location"]) assertRequiredParsedTextField(fields, field, context);
  assert.match(fields.reference_child_approval_fingerprint, sanitizedFingerprintPattern);
  assertSourceTimestampWithinExactOperationWindow(fields, context);
  assert.equal(fields.external_result_record_fingerprint, deriveB1ExternalPrerequisiteResultRecordFingerprint(fields), `${context} fingerprint must be deterministic`);
  if (childFields) {
    assert.equal(fields.reference_child_approval_id, childFields.approval_id, `${context} requires the exact external-reference child approval`);
    assert.equal(fields.reference_child_approval_fingerprint, childFields.approval_fingerprint, `${context} requires the exact external-reference child approval fingerprint`);
    assert.equal(fields.exact_target_or_scope, childFields.exact_target_or_scope, `${context} requires the exact external-reference scope`);
    assert.equal(fields.evidence_retention_location, childFields.evidence_retention_location, `${context} requires the exact external-reference retention`);
    assert.equal(fields.stop_owner, childFields.stop_owner); assert.equal(fields.rollback_owner, childFields.rollback_owner);
  }
  return fields;
}

function validateB1ParsedEvidenceRecord(record, childFields = undefined) {
  const fields = record?.fields ?? record;
  assert.ok(fields && typeof fields === "object", "B1 record requires a separate parsed B1 deployed-target proof record");
  assert.deepEqual(Object.keys(fields).sort(), [...b1DeployedTargetProofRecordFields].sort(), "B1 deployed-target proof record requires the exact closed schema");
  assert.ok(["approved-completed-deployed-target-proof", "approved-complete-not-closure-eligible-deployed-target-proof"].includes(assertRequiredParsedTextField(fields, "record_status", "B1 deployed-target proof record")), "B1 proof record requires a terminal truthful record status");
  assert.equal(assertRequiredParsedTextField(fields, "record_type", "B1 deployed-target proof record"), "sanitized-deployed-target-proof-result");
  assert.equal(assertRequiredParsedTextField(fields, "evidence_id", "B1 deployed-target proof record"), "EVID-DEPLOYED-TARGET");
  assert.equal(assertRequiredParsedTextField(fields, "child_id", "B1 deployed-target proof record"), "B1-deployed-target-proof");
  assert.match(assertRequiredParsedTextField(fields, "proof_record_id", "B1 deployed-target proof record"), /^NC-R1-B1-PROOF-[A-Za-z0-9-]+$/);
  assert.equal(assertRequiredParsedTextField(fields, "approval_decision", "B1 deployed-target proof record"), "approved");
  assert.equal(assertRequiredParsedTextField(fields, "required_approver", "B1 deployed-target proof record"), "kurodev");
  assert.equal(assertRequiredParsedTextField(fields, "requested_operation", "B1 deployed-target proof record"), b1DeployedTargetProofReadOnlyOperation, "B1 proof record requested operation must be exact read-only proof collection");
  for (const field of ["approval_id", "approval_fingerprint", "exact_target_or_scope", "expected_target_alias", "expected_commit_alias", "requested_operation", "time_window", "operator", "evidence_retention_location", "stop_owner", "rollback_owner", "observed_deployed_target_binding", "observed_deployed_commit_binding", "closure_outcome"]) assertRequiredParsedTextField(fields, field, "B1 deployed-target proof record");
  assert.match(fields.approval_fingerprint, sanitizedFingerprintPattern);
  assert.match(fields.expected_target_alias, /^approved-deployed-target-[A-Za-z0-9-]+$/);
  assert.match(fields.expected_commit_alias, /^approved-deployed-commit-[A-Za-z0-9-]+$/);
  assert.ok(["exact", "mismatched", "unconfirmed"].includes(fields.target_match), "B1 proof record target_match must be canonical");
  assert.ok(["exact", "mismatched", "unconfirmed"].includes(fields.commit_match), "B1 proof record commit_match must be canonical");
  assert.ok(["complete", "incomplete"].includes(fields.proof_completeness), "B1 proof record completeness must be canonical");
  assert.ok(["fresh", "stale"].includes(fields.freshness), "B1 proof record freshness must be canonical");
  assert.equal(fields.no_merge_ci_build_local_inference, "yes");
  assert.equal(fields.migration_config_binding_git_merge_deploy_live_public_paid_go_activation_external_authorization_or_execution, "none");
  assert.ok(["EVID-DEPLOYED-TARGET-only", "none"].includes(fields.closure_outcome), "B1 proof record closure outcome must be canonical");
  const sourceMetadata = assertSourceTimestampWithinExactOperationWindow(fields, "B1 record", { requireFresh: false });
  assert.equal(fields.freshness, sourceMetadata.freshness, "B1 proof record freshness must be derived from its source timestamp and evaluation window");
  const assertObservedBinding = (matchField, observedField, expectedField, kind) => {
    const match = fields[matchField];
    const observed = assertRequiredParsedTextField(fields, observedField, "B1 deployed-target proof record");
    const expected = fields[expectedField];
    if (match === "exact") assert.equal(observed, expected, `B1 ${kind} exact match requires the observed approved alias`);
    else if (match === "mismatched") {
      assert.match(observed, kind === "target" ? /^approved-deployed-target-[A-Za-z0-9-]+$/ : /^approved-deployed-commit-[A-Za-z0-9-]+$/, `B1 ${kind} mismatch requires a sanitized observed alias`);
      assert.notEqual(observed, expected, `B1 ${kind} mismatch cannot retain the expected alias`);
    } else assert.equal(observed, "unconfirmed", `B1 ${kind} unconfirmed match requires observed binding=unconfirmed`);
  };
  assertObservedBinding("target_match", "observed_deployed_target_binding", "expected_target_alias", "target");
  assertObservedBinding("commit_match", "observed_deployed_commit_binding", "expected_commit_alias", "commit");
  assert.equal(fields.proof_record_fingerprint, deriveB1ProofRecordFingerprint(fields), "B1 deployed-target proof record fingerprint must be deterministic");
  if (childFields) {
    assert.equal(fields.approval_id, childFields.approval_id, "B1 proof record requires the exact B1 approval ID");
    assert.equal(fields.approval_fingerprint, childFields.approval_fingerprint, "B1 proof record requires the exact B1 approval fingerprint");
    assert.equal(fields.exact_target_or_scope, childFields.exact_target_or_scope, "B1 proof record requires the exact B1 approved scope");
    assert.equal(fields.expected_target_alias, childFields.expected_target_alias, "B1 proof record requires the exact B1 approved expected target alias");
    assert.equal(fields.expected_commit_alias, childFields.expected_commit_alias, "B1 proof record requires the exact B1 approved expected commit alias");
    assert.equal(fields.requested_operation, childFields.requested_operation, "B1 proof record requires the exact B1 approved operation");
    assert.equal(fields.time_window, childFields.time_window, "B1 proof record requires the exact B1 approved window");
    assert.equal(fields.operator, childFields.operator, "B1 proof record requires the exact B1 approved operator");
    assert.equal(fields.evidence_retention_location, childFields.evidence_retention_location, "B1 proof record requires the exact B1 approved retention");
    assert.equal(fields.stop_owner, childFields.stop_owner, "B1 proof record requires the exact B1 stop owner");
    assert.equal(fields.rollback_owner, childFields.rollback_owner, "B1 proof record requires the exact B1 rollback owner");
    if (childFields.child_status === "satisfied") {
      assert.equal(fields.record_status, "approved-completed-deployed-target-proof");
      assert.equal(fields.target_match, "exact"); assert.equal(fields.commit_match, "exact"); assert.equal(fields.proof_completeness, "complete"); assert.equal(fields.freshness, "fresh"); assert.equal(fields.closure_outcome, "EVID-DEPLOYED-TARGET-only");
    } else if (childFields.child_status === "complete-not-closure-eligible") {
      assert.equal(fields.record_status, "approved-complete-not-closure-eligible-deployed-target-proof");
      assert.equal(fields.closure_outcome, "none");
      assert.ok(fields.target_match !== "exact" || fields.commit_match !== "exact" || fields.proof_completeness !== "complete" || fields.freshness !== "fresh", "B1 non-closing proof requires a truthful rejected, incomplete, stale, or mismatched outcome");
    }
  }
  return fields;
}

function parseB1DeployedTargetProofRecord(section) {
  assert.equal(typeof section, "string", "B1 strict parser requires fenced text input");
  const blocks = [...section.matchAll(/```text\r?\n([\s\S]*?)```/g)];
  assert.equal(blocks.length, 1, "B1 strict parser requires exactly one fenced text block");
  assert.equal(section.trim(), blocks[0][0].trim(), "B1 strict parser rejects content outside its one fenced text block");
  const entries = [];
  for (const line of blocks[0][1].split(/\r?\n/)) {
    if (line === "") continue;
    assert.equal(/\s/.test(line), false, "B1 strict parser rejects whitespace or malformed lines");
    const match = line.match(/^([a-z0-9_]+)=([^=]+)$/);
    assert.ok(match, "B1 strict parser requires every nonempty line to be strict key=value");
    entries.push([match[1], match[2]]);
  }
  assert.equal(new Set(entries.map(([field]) => field)).size, entries.length, "B1 strict parser rejects duplicate fields");
  const fields = Object.fromEntries(entries);
  assert.deepEqual(Object.keys(fields).sort(), [...b1DeployedTargetProofRecordFields].sort(), "B1 strict parser requires the exact closed record schema");
  return validateB1ParsedEvidenceRecord(fields);
}

function extractExactB1DeployedTargetProofResultTemplate(markdown, path) {
  const matches = [...markdown.matchAll(/^(?:##|###) Exact Non-Evidence B1 Deployed-Target Proof Result Template\r?\n[\s\S]*?^(```text\r?\n[\s\S]*?^```)/gm)];
  assert.equal(matches.length, 1, `${path} must contain exactly one B1 deployed-target proof result template`);
  return { fencedBlock: matches[0][1] };
}

function parseStrictExactTextFence(section, expectedFields, context) {
  assert.equal(typeof section, "string", `${context} requires fenced text input`);
  const blocks = [...section.matchAll(/```text\r?\n([\s\S]*?)```/g)];
  assert.equal(blocks.length, 1, `${context} requires exactly one fenced text block`);
  assert.equal(section.trim(), blocks[0][0].trim(), `${context} rejects content outside its one fenced text block`);
  const entries = [];
  for (const line of blocks[0][1].split(/\r?\n/)) {
    if (line === "") continue;
    assert.equal(/\s/.test(line), false, `${context} rejects whitespace or malformed lines`);
    const match = line.match(/^([a-z0-9_]+)=([^=]+)$/);
    assert.ok(match, `${context} requires every nonempty line to be strict key=value`);
    entries.push([match[1], match[2]]);
  }
  assert.equal(new Set(entries.map(([field]) => field)).size, entries.length, `${context} rejects duplicate fields`);
  const fields = Object.fromEntries(entries);
  assert.deepEqual(Object.keys(fields).sort(), [...expectedFields].sort(), `${context} requires the exact closed schema`);
  return fields;
}

function validateSignedEvidenceRecord(record) {
  const fields = record?.fields ?? record;
  assert.ok(fields && typeof fields === "object", "signed evidence record requires a separate parsed record");
  assert.deepEqual(Object.keys(fields).sort(), [...signedEvidenceRecordFields].sort(), "signed evidence record requires the exact closed schema");
  assert.match(assertRequiredParsedTextField(fields, "evidence_record_id", "signed evidence record"), /^NC-R1-[A-Za-z0-9-]+$/);
  assert.equal(assertRequiredParsedTextField(fields, "evidence_record_type", "signed evidence record"), "signed-compatible-subscription-evidence");
  assert.equal(assertRequiredParsedTextField(fields, "source", "signed evidence record"), "signed-subscription-evidence");
  assert.equal(assertRequiredParsedTextField(fields, "classification", "signed evidence record"), "active-compatible");
  assert.equal(assertRequiredParsedTextField(fields, "authority", "signed evidence record"), "complete-unambiguous");
  assert.match(assertRequiredParsedTextField(fields, "fingerprint", "signed evidence record"), sanitizedFingerprintPattern);
  const sourceTimestamp = assertRequiredParsedTextField(fields, "source_timestamp", "signed evidence record");
  assert.match(sourceTimestamp, /^\d{4}-\d{2}-\d{2}T/, "signed evidence record source timestamp must be ISO-like");
  assertDateParseValid(sourceTimestamp, "signed evidence record source timestamp");
  return fields;
}

function parseSignedEvidenceRecord(section) {
  return validateSignedEvidenceRecord(parseStrictExactTextFence(section, signedEvidenceRecordFields, "signed evidence record"));
}

function parseStagedRows(markdown) {
  const section = sectionBody(markdown, "## NC-R1 Eight-Row Staged Resolution Skeletons");
  return [...section.matchAll(/^### Row Group: (EVID-[A-Z-]+)\r?\n\r?\n([\s\S]*?)(?=^### Row Group:|(?![\s\S]))/gm)].map((match) => ({
    headingId: match[1],
    fields: parseExactTextBlock(match[2])
  }));
}

function validateStagedChild(child, seenApprovalIds) {
  assert.ok(child.approvalUnit, "child requires canonical approval unit");
  assert.match(child.approvalId, /^<required-unique-approval-id-[A-Za-z0-9-]+>$/, "child requires an independent unique approval ID placeholder");
  assert.equal(seenApprovalIds.has(child.approvalId), false, "batch approval cannot substitute for independent child approvals");
  seenApprovalIds.add(child.approvalId);
  assert.match(child.decision, /^<required-explicit-approved-or-rejected-decision>$/, "child requires an explicit decision placeholder");
  assert.match(child.targetScope, /^<required-exact-/, "child requires exact target or scope placeholder");
  assert.equal(child.retention, "<required-sanitized-retention-location>", "child requires sanitized retention location");
  assert.equal(child.stopOwner, "kurodev", "child stop owner must be kurodev");
  assert.equal(child.rollbackOwner, "kurodev", "child rollback owner must be kurodev");
  if (child.kind === "executable") {
    assert.match(child.execution, /^<required-exact-operation-window-operator>$/, "executable child requires operation, window, and operator");
    assert.equal(child.judgment, "N/A", "executable child must not substitute judgment inputs");
  } else if (child.kind === "judgment") {
    assert.equal(child.execution, "N/A", "judgment child is non-executable");
    assert.match(child.judgment, /^<required-bound-input-effective-date-named-approver>$/, "judgment child requires bound input, effective date, and named approver");
  } else {
    assert.match(child.execution, /^<required-exact-operation-window-operator-or-N-A>$/, "mixed child requires its execution alternative");
    assert.match(child.judgment, /^<required-bound-input-effective-date-named-approver-or-N-A>$/, "mixed child requires its judgment alternative");
  }
}

function validateStagedRows(rows) {
  assert.equal(rows.length, 8, "staged checklist must contain exactly eight row-group skeletons");
  assert.equal(new Set(rows.map((row) => row.headingId)).size, 8, "staged row-group skeleton IDs must be unique");
  const seenApprovalIds = new Set();
  const normalized = rows.map((row) => {
    const fields = row.fields;
    const canonical = stagedRows.find((candidate) => candidate.id === row.headingId);
    assert.ok(canonical, `unexpected staged row group: ${row.headingId}`);
    assert.equal(fields.row_group_id, row.headingId, "row group heading and field must match");
    assert.equal(fields.canonical_primary_approval_unit, canonical.approvalUnit, "row must keep canonical primary approval unit");
    validateStagedRowRecord(fields, canonical);
    assert.equal(fields.prerequisite_children, canonical.prerequisites, "row prerequisites must retain canonical order");
    if (canonical.id === "EVID-PROVIDER-COST") assert.equal(fields.conditional_prerequisite_children, "A2-provider-funding-external-prerequisite-reference-when-funding-requirement-state-needed-absent", "Provider funding prerequisite must remain conditional");
    assert.equal(fields.row_child_ids, canonical.childIds, "row must reference exact independently registered child IDs");
    assert.equal(fields.row_closing_child, canonical.closingChild, "row closing child must remain exact");
    assert.equal(fields.row_closure, fields.row_group_status === "satisfied" ? `${canonical.id}-only-after-satisfied` : "none", "row closure must follow the lifecycle state");
    assert.equal(seenApprovalIds.has(fields.child_approval_id), false, "row closing approvals must not batch across row groups");
    seenApprovalIds.add(fields.child_approval_id);
    return {
      id: fields.row_group_id,
      approvalUnit: fields.canonical_primary_approval_unit,
      prerequisites: fields.prerequisite_children,
      childIds: fields.row_child_ids,
      closingChild: fields.row_closing_child,
      kind: canonical.kind
    };
  });
  assert.deepEqual(normalized, stagedRows, "staged rows must be exactly eight, ordered, and canonical");
  return normalized;
}

function validateStagedRowRecord(fields, canonical) {
  const state = fields.row_group_status;
  assert.ok(["unapproved", "approved-not-started", "running", "partial-stop", "complete-not-closure-eligible", "satisfied", "stale", "invalidated", "incomplete"].includes(state), "row status must be a canonical lifecycle state");
  if (state === "unapproved") {
    assert.match(fields.child_approval_id, /^<required-unique-approval-id-[A-Za-z0-9-]+>$/);
    assert.equal(fields.child_explicit_approval_decision, "<required-explicit-approved-or-rejected-decision>");
    assert.match(fields.child_exact_target_or_scope, /^<required-exact-/);
    assert.equal(fields.child_evidence_retention_location, "<required-sanitized-retention-location>");
    assert.equal(fields.row_freshness, "missing"); assert.equal(fields.row_target, "missing"); assert.equal(fields.row_approval, "unapproved"); assert.equal(fields.row_fingerprint_bound, "no");
    assert.equal(fields.row_closure, "none");
    assert.equal(fields.row_dependent_stop_result, "not-applicable");
  } else if (["approved-not-started", "running", "complete-not-closure-eligible", "satisfied"].includes(state)) {
    assert.match(fields.child_approval_id, /^(?!<required)[A-Za-z0-9-]+$/, "future row requires non-placeholder approval ID");
    assert.equal(fields.child_explicit_approval_decision, "approved", "future row requires explicit approved decision");
    assert.match(fields.child_exact_target_or_scope, /^(?!<required).+$/);
    assert.match(fields.child_evidence_retention_location, /^(?!<required).+$/);
    assert.equal(fields.row_approval, "approved"); assert.equal(fields.row_target, "exact"); assert.equal(fields.row_fingerprint_bound, "yes");
    if (["approved-not-started", "running", "satisfied"].includes(state)) assert.equal(fields.row_freshness, "fresh");
    if (state === "satisfied") assert.equal(fields.row_closure, `${canonical.id}-only-after-satisfied`);
    else assert.equal(fields.row_closure, "none");
    assert.equal(fields.row_dependent_stop_result, ["partial-stop", "stale", "invalidated"].includes(state) ? "derived-canonical-reverse-dependency-graph" : "not-applicable", "row dependent-stop result must follow the lifecycle state");
  } else {
    assert.equal(fields.row_prior_approved_or_started, "yes", "degraded row must retain its prior approval/start metadata");
    assert.match(fields.child_approval_id, /^(?!<required)[A-Za-z0-9-]+$/);
    assert.equal(fields.child_explicit_approval_decision, "approved");
    assert.match(fields.child_exact_target_or_scope, /^(?!<required).+$/);
    assert.match(fields.child_evidence_retention_location, /^(?!<required).+$/);
    assert.match(fields.row_stop_or_drift_cause, /^(?!<required|N\/A).+$/, "degraded row state requires a truthful stop or drift cause");
    assert.equal(fields.row_closure, "none");
    assert.equal(fields.row_dependent_stop_result, ["partial-stop", "stale", "invalidated"].includes(state) ? "derived-canonical-reverse-dependency-graph" : "not-applicable");
  }
}

function assertStagedTransition(from, to, previousCanonicalStatus = "incomplete") {
  const allowed = {
    unapproved: ["approved-not-started"],
    "approved-not-started": ["running"],
    running: ["partial-stop", "complete-not-closure-eligible", "satisfied"],
    satisfied: ["stale", "invalidated"],
    stale: ["incomplete", "unapproved"],
    invalidated: ["incomplete", "unapproved"],
    incomplete: ["unapproved"]
  };
  assert.ok(allowed[from]?.includes(to), `invalid staged transition ${from} -> ${to}`);
  return to === "partial-stop" ? previousCanonicalStatus : to;
}

function invalidateDependentRows(changed) {
  const graph = {
    A0: ["A2", "A3", "A4", "A5", "A6", "B1", "B2"],
    A1: ["B1", "B2"], A2: ["A4", "A5", "A6", "B1", "B2"], A3: ["A4", "A5", "A6", "B1", "B2"],
    A4: ["A5", "A6", "B1", "B2"], A5: ["A6", "B1", "B2"], A6: ["B1", "B2"], external: ["B1", "B2"], B1: ["B2"], signedEntitlement: ["B2"], approvalInput: ["A2", "A3", "A4", "A5", "A6", "B1", "B2"]
  };
  return new Set(graph[changed] ?? []);
}

const stagedChildDefinitions = [
  ["A0-provisional-cost-model-input", "EVID-PROVIDER-COST,EVID-STRIPE-COST,EVID-PRODUCT-PRICE", "release-owner-judgment", "judgment", "none"],
  ["A1-worker-cpu-source-disposition", "EVID-WORKER-CPU", "release-owner-judgment", "judgment", "none"],
  ["A1-worker-cpu-evidence-read", "EVID-WORKER-CPU", "authenticated-private-read", "executable", "EVID-WORKER-CPU-only-after-satisfied"],
  ["A2-provider-funding-external-prerequisite-reference", "EVID-PROVIDER-COST", "external-lane-reference", "external-prerequisite-reference", "none"],
  ["A2-provider-cost-evidence-read", "EVID-PROVIDER-COST", "authenticated-private-read", "executable", "EVID-PROVIDER-COST-only-after-satisfied"],
  ["A3-stripe-source-applicability-read-or-judgment", "EVID-STRIPE-COST", "authenticated-private-read", "executable-or-judgment", "EVID-STRIPE-COST-only-after-satisfied"],
  ["A4-product-price-judgment", "EVID-PRODUCT-PRICE", "release-owner-judgment", "judgment", "EVID-PRODUCT-PRICE-only-after-satisfied"],
  ["A5-legal-judgment", "EVID-LEGAL", "release-owner-judgment", "judgment", "EVID-LEGAL-only-after-satisfied"],
  ["A6-copy-judgment", "EVID-COPY", "release-owner-judgment", "judgment", "EVID-COPY-only-after-satisfied"],
  ["B1-external-prerequisite-sanitized-result-reference", "EVID-DEPLOYED-TARGET", "external-lane-reference", "external-prerequisite-reference", "none"],
  ["B1-deployed-target-proof", "EVID-DEPLOYED-TARGET", "deploy-deployed-proof", "executable", "EVID-DEPLOYED-TARGET-only-after-satisfied"],
  ["B2-live-paid-flow-evidence", "EVID-LIVE-PAID-FLOW", "live-operation", "executable", "EVID-LIVE-PAID-FLOW-only-after-satisfied"]
].map(([id, rows, approvalUnit, type, closure]) => ({ id, rows, approvalUnit, type, closure }));

const stagedChildCommonAllowedFields = [
  "child_id", "row_group_references", "canonical_child_approval_unit", "child_type", "approval_id", "explicit_decision",
  "exact_target_or_scope", "requested_operation", "time_window", "operator", "bound_input", "effective_date", "required_approver",
  "evidence_retention_location", "approval_fingerprint", "stop_owner", "rollback_owner", "cost_guard", "child_status", "freshness",
  "target", "approval", "fingerprint_bound", "prior_approved_or_started", "stop_or_drift_cause", "satisfied_result", "row_closure_effect", "dependent_stop_result"
];
const stagedChildAllowedExtraFields = {
  "A0-provisional-cost-model-input": ["cost_model_input_fingerprint", "cost_model_result_fingerprint", "cost_model_decision", "judgment_output", "bound_artifact_fingerprint", "judgment_effective_date"],
  "A1-worker-cpu-source-disposition": ["source_disposition_outcome", "result_fingerprint"],
  "A1-worker-cpu-evidence-read": ["observed_at", "source_timestamp", "credential_account_worker_env_path", "cloudflare_connector", "authenticated_in_app_dashboard_session", "schema_capability_query_attempt_count", "account_tag_or_worker_script_identifier_retained", "transport_result", "schema_type_dataset_capability", "data_query_execution", "cpu_request_sampling_confidence_metrics_observed", "query_completeness", "target_verification", "raw_response_credential_token_account_tag_private_script_name_retained", "prohibited_surfaces_opened", "incremental_charge_authorized", "incremental_charge_accepted", "stop_condition", "source_disposition_fingerprint", "observed_record_fingerprint", "result_fingerprint", "aggregation_complete", "request_completeness", "headroom_disposition"],
  "A2-provider-funding-external-prerequisite-reference": ["funding_requirement_state", "funding_decision_basis_child", "funding_decision_basis_status", "funding_decision_basis_freshness", "funding_decision_basis_target", "funding_decision_basis_approval", "funding_decision_basis_fingerprint_bound", "funding_owner_approval_record_fingerprint", "funding_disposition_record_fingerprint", "funding_external_result_fingerprint", "funding_prerequisite_fingerprint", "conditional_required_when"],
  "A2-provider-cost-evidence-read": ["source_timestamp", "sanitized_exact_cost", "applicability", "dependency_fingerprint", "funding_prerequisite_fingerprint", "cost_model_fingerprint", "observed_record_fingerprint", "result_fingerprint"],
  "A3-stripe-source-applicability-read-or-judgment": ["selected_mode", "selected_approval_unit", "source_timestamp", "sanitized_exact_cost", "applicability", "cost_model_fingerprint", "judgment_output", "bound_artifact_fingerprint", "judgment_effective_date", "dependency_fingerprint", "owner_approval_record_fingerprint", "observed_record_fingerprint", "result_fingerprint"],
  "A4-product-price-judgment": ["judgment_output", "bound_artifact_fingerprint", "judgment_effective_date", "a2_result_fingerprint", "a3_result_fingerprint", "dependency_fingerprint_composite", "judgment_record_fingerprint"],
  "A5-legal-judgment": ["judgment_output", "bound_artifact_fingerprint", "judgment_effective_date", "a4_artifact_fingerprint", "judgment_record_fingerprint"],
  "A6-copy-judgment": ["judgment_output", "bound_artifact_fingerprint", "judgment_effective_date", "a4_artifact_fingerprint", "a5_artifact_fingerprint", "judgment_record_fingerprint"],
  "B1-external-prerequisite-sanitized-result-reference": ["external_result_record_fingerprint", "external_result_fingerprint"],
  "B1-deployed-target-proof": ["expected_target_alias", "expected_commit_alias", "proof_record_fingerprint", "source_timestamp", "deployed_target_binding", "deployed_commit_binding", "deployed_fingerprint", "a1_result_fingerprint", "a4_artifact_fingerprint", "a5_artifact_fingerprint", "a6_artifact_fingerprint", "external_prerequisite_fingerprint"],
  "B2-live-paid-flow-evidence": ["source_timestamp", "b2_execution_id", "target_scope_alias", "approved_target_scope_binding", "approved_signed_evidence_binding", "b2_parsed_scenarios", "b1_deployed_target_binding", "b1_deployed_commit_binding", "b1_deployed_fingerprint", "signed_evidence_record_id", "signed_evidence_source", "signed_evidence_classification", "signed_evidence_authority", "signed_evidence_fingerprint", "signed_evidence_source_timestamp", "b2_scenario_result_ids", "b2_aggregate_record_fingerprint", "result_fingerprint"]
};

function assertStagedChildClosedSchema(childId, fields) {
  const allowedFields = new Set([...stagedChildCommonAllowedFields, ...(stagedChildAllowedExtraFields[childId] ?? [])]);
  const unknownFields = Object.keys(fields).filter((field) => !allowedFields.has(field));
  assert.equal(unknownFields.length, 0, `${childId} staged child registry rejects unknown field(s): ${unknownFields.join(",")}`);
}

function parseStagedChildren(markdown) {
  const section = sectionBody(markdown, "## NC-R1 Staged Child-Unit Registry");
  return [...section.matchAll(/^### Child Unit: ([A-Za-z0-9-]+)\r?\n([\s\S]*?)(?=^### Child Unit:|(?![\s\S]))/gm)].map((match) => ({
    headingId: match[1], fields: parseExactTextBlock(match[2])
  }));
}

function parseB2ScenarioResultRecords(markdownOrSection) {
  const section = /^## NC-R1 Future B2 Parsed Scenario Result Records$/m.test(markdownOrSection)
    ? sectionBody(markdownOrSection, "## NC-R1 Future B2 Parsed Scenario Result Records")
    : markdownOrSection;
  const records = [];
  let remaining = section.trim();
  while (remaining !== "") {
    const match = remaining.match(/^### B2 Scenario Result: ([a-z0-9-]+)\r?\n\r?\n(```text\r?\n[\s\S]*?\r?\n```)(?:\r?\n[ \t]*)*/);
    assert.ok(match, "B2 scenario parser rejects outside prose, malformed headings, and extra fences");
    const fields = parseStrictExactTextFence(match[2], b2ScenarioResultRecordFields, "B2 scenario result");
    assert.equal(fields.scenario_id, match[1], "B2 scenario result heading and scenario_id must match");
    records.push({ headingId: match[1], fields });
    remaining = remaining.slice(match[0].length).trim();
  }
  return records;
}

function validateStagedChildren(children, rows, rowApprovalIds = new Map(parseStagedRows(checklist).map((row) => [row.fields.row_group_id, row.fields.child_approval_id]))) {
  assert.deepEqual(children.map((child) => child.headingId), stagedChildDefinitions.map((child) => child.id), "child registry must be exact and ordered");
  const seenApprovalIds = new Set();
  for (const [index, child] of children.entries()) {
    const expected = stagedChildDefinitions[index];
    const fields = child.fields;
    assertStagedChildClosedSchema(expected.id, fields);
    assert.equal(fields.child_id, expected.id, "child heading and ID must match");
    assert.equal(fields.row_group_references, expected.rows, "child must retain exact row-group references");
    assert.equal(fields.canonical_child_approval_unit, expected.approvalUnit, "child canonical approval unit must be exact");
    assert.equal(fields.child_type, expected.type, "child type must be exact");
    assert.equal(fields.row_closure_effect, expected.closure, "child row-closure effect must be exact");
    assert.equal(seenApprovalIds.has(fields.approval_id), false, "batch approval cannot substitute for child approval");
    seenApprovalIds.add(fields.approval_id);
    assert.equal(fields.stop_owner, "kurodev");
    assert.equal(fields.rollback_owner, "kurodev");
    assert.match(fields.cost_guard, /(?:no-cost-bearing-action-authorized|zero-incremental-spend-and-separate-budget-approval-required|separate-(?:budget-)?approved-external-lane-required)/);
    validateStagedChildRecord(fields, expected);
    if (expected.closure !== "none") {
      assert.equal(rowApprovalIds.get(expected.rows), fields.approval_id, "row closing child approval ID must exactly match its registry child approval ID");
    }
  }
  const childIds = new Set(children.map((child) => child.headingId));
  for (const row of rows) {
    for (const childId of row.childIds.split(",")) assert.equal(childIds.has(childId), true, `row ${row.id} references an unregistered child ${childId}`);
    for (const prerequisiteId of row.prerequisites === "none" ? [] : row.prerequisites.split(",")) assert.equal(childIds.has(prerequisiteId), true, `row ${row.id} prerequisite must be an exact child ID`);
    assert.equal(childIds.has(row.closingChild), true, `row ${row.id} closing child must be registered`);
  }
  return children;
}

const satisfiedResultSchemas = {
  "A1-worker-cpu-evidence-read": "aggregation-complete-request-completeness-complete-headroom-disposition-approved",
  "A2-provider-cost-evidence-read": "exact-provider-cost-and-applicability-approved",
  "A3-stripe-source-applicability-read-or-judgment": "exact-stripe-cost-applicability-approved",
  "A4-product-price-judgment": "approved-product-price-judgment-output",
  "A5-legal-judgment": "approved-legal-judgment-output",
  "A6-copy-judgment": "approved-copy-judgment-output",
  "B1-deployed-target-proof": "exact-deployed-target-proof-approved"
};
const satisfiedStructuredFields = {
  "A1-worker-cpu-evidence-read": ["aggregation_complete", "request_completeness", "headroom_disposition", "source_timestamp", "observed_record_fingerprint"],
  "A2-provider-cost-evidence-read": ["sanitized_exact_cost", "applicability", "source_timestamp", "cost_model_fingerprint"],
  "A3-stripe-source-applicability-read-or-judgment": [],
  "A4-product-price-judgment": ["judgment_output", "bound_artifact_fingerprint", "judgment_effective_date", "judgment_record_fingerprint"],
  "A5-legal-judgment": ["judgment_output", "bound_artifact_fingerprint", "judgment_effective_date", "judgment_record_fingerprint"],
  "A6-copy-judgment": ["judgment_output", "bound_artifact_fingerprint", "judgment_effective_date", "judgment_record_fingerprint"],
  "B1-deployed-target-proof": ["expected_target_alias", "expected_commit_alias", "proof_record_fingerprint", "deployed_fingerprint"]
};

function assertAbsentOrNotApplicable(fields, fieldNames, context) {
  for (const field of fieldNames) {
    if (fields[field] !== undefined) assert.equal(fields[field], "N/A", `${context} must not include ${field}`);
  }
}

function validateA3StructuredResult(fields) {
  const context = "A3 Stripe satisfied result";
  const mode = assertRequiredParsedTextField(fields, "selected_mode", context);
  assert.ok(["read", "judgment"].includes(mode), `${context} requires exactly one read or judgment mode`);
  if (mode === "read") {
    assert.equal(assertRequiredParsedTextField(fields, "selected_approval_unit", context), "authenticated-private-read", `${context} read mode requires authenticated-private-read`);
    for (const field of ["requested_operation", "time_window", "operator"]) assertRequiredParsedTextField(fields, field, context);
    for (const field of ["bound_input", "effective_date", "required_approver"]) assert.equal(fields[field], "N/A", `${context} read mode requires ${field}=N/A`);
    assertAbsentOrNotApplicable(fields, ["judgment_output", "bound_artifact_fingerprint", "judgment_effective_date"], `${context} read mode`);
    assert.equal(assertRequiredParsedTextField(fields, "sanitized_exact_cost", context), "sanitized-exact-cost-classified");
    assert.equal(assertRequiredParsedTextField(fields, "applicability", context), "applicable");
    assertSourceTimestampWithinExactOperationWindow(fields, context);
    assert.match(assertRequiredParsedTextField(fields, "observed_record_fingerprint", context), sanitizedFingerprintPattern);
    assert.match(assertRequiredParsedTextField(fields, "cost_model_fingerprint", context), sanitizedFingerprintPattern);
    assert.match(assertRequiredParsedTextField(fields, "dependency_fingerprint", context), sanitizedFingerprintPattern);
    assert.equal(assertRequiredParsedTextField(fields, "result_fingerprint", context), fields.cost_model_fingerprint, `${context} read mode must retain its actual result fingerprint`);
    return;
  }
  assert.equal(assertRequiredParsedTextField(fields, "selected_approval_unit", context), "release-owner-judgment", `${context} judgment mode requires release-owner-judgment`);
  for (const field of ["requested_operation", "time_window", "operator"]) assert.equal(fields[field], "N/A", `${context} judgment mode requires ${field}=N/A`);
  for (const field of ["bound_input", "effective_date", "required_approver"]) assertRequiredParsedTextField(fields, field, context);
  assertAbsentOrNotApplicable(fields, ["sanitized_exact_cost", "applicability", "source_timestamp", "cost_model_fingerprint", "observed_record_fingerprint"], `${context} judgment mode`);
  assert.ok(["approved", "accepted"].includes(assertRequiredParsedTextField(fields, "judgment_output", context)));
  assert.match(assertRequiredParsedTextField(fields, "bound_artifact_fingerprint", context), sanitizedFingerprintPattern);
  assert.match(assertRequiredParsedTextField(fields, "dependency_fingerprint", context), sanitizedFingerprintPattern);
  assert.equal(assertRequiredParsedTextField(fields, "result_fingerprint", context), fields.bound_artifact_fingerprint, `${context} judgment mode must retain its actual result fingerprint`);
  assertJudgmentEffectiveDateBinding(fields);
}

function validateSatisfiedStructuredResult(fields) {
  for (const field of satisfiedStructuredFields[fields.child_id] ?? []) assertRequiredParsedTextField(fields, field, `${fields.child_id} satisfied result`);
  if (["A1-worker-cpu-evidence-read", "A2-provider-cost-evidence-read"].includes(fields.child_id)) {
    assertSourceTimestampWithinExactOperationWindow(fields, `${fields.child_id} satisfied result`);
  }
  if (fields.child_id === "A3-stripe-source-applicability-read-or-judgment") {
    validateA3StructuredResult(fields);
    return;
  }
  if (fields.child_id === "A1-worker-cpu-evidence-read") {
    assert.equal(fields.aggregation_complete, "yes");
    assert.equal(fields.request_completeness, "complete");
    assert.equal(fields.headroom_disposition, "approved");
  }
  if (fields.child_id === "A2-provider-cost-evidence-read") {
    assert.equal(fields.sanitized_exact_cost, "sanitized-exact-cost-classified");
    assert.equal(fields.applicability, "applicable");
    assert.match(fields.cost_model_fingerprint, sanitizedFingerprintPattern);
    assert.match(assertRequiredParsedTextField(fields, "dependency_fingerprint", "A2 provider-cost satisfied result"), sanitizedFingerprintPattern);
    assert.equal(assertRequiredParsedTextField(fields, "result_fingerprint", "A2 provider-cost satisfied result"), fields.cost_model_fingerprint, "cost result must retain its actual result fingerprint");
  }
  if (["A4-product-price-judgment", "A5-legal-judgment", "A6-copy-judgment"].includes(fields.child_id)) {
    assert.ok(["approved", "accepted"].includes(fields.judgment_output));
    assert.match(fields.bound_artifact_fingerprint, sanitizedFingerprintPattern);
    assert.match(fields.judgment_effective_date, /^\d{4}-\d{2}-\d{2}$/);
    assertJudgmentEffectiveDateBinding(fields);
  }
  if (fields.child_id === "B1-deployed-target-proof") {
    assert.equal(fields.source_timestamp, "N/A", "B1 child must not synthesize proof timestamp");
    assert.equal(fields.deployed_target_binding, "N/A", "B1 child must not synthesize deployed target proof");
    assert.equal(fields.deployed_commit_binding, "N/A", "B1 child must not synthesize deployed commit proof");
    assert.match(fields.deployed_fingerprint, sanitizedFingerprintPattern);
    assert.match(fields.proof_record_fingerprint, sanitizedFingerprintPattern);
  }
}

function deriveB2ScenarioResultFingerprint(fields) {
  return deriveSanitizedFingerprint("b2-scenario-result", [
    ["record_status", fields.record_status],
    ["scenario_result_id", fields.scenario_result_id],
    ["b2_child_id", fields.b2_child_id],
    ["b2_approval_fingerprint", fields.b2_approval_fingerprint],
    ["b2_execution_id", fields.b2_execution_id],
    ["target_scope_alias", fields.target_scope_alias],
    ["time_window", fields.time_window],
    ["b1_fingerprint", fields.b1_fingerprint],
    ["signed_evidence_fingerprint", fields.signed_evidence_fingerprint],
    ["scenario_id", fields.scenario_id],
    ["canonical_outcome", fields.canonical_outcome],
    ["sanitized_outcome", fields.sanitized_outcome],
    ["paid_transition_count", fields.paid_transition_count],
    ["provider_call_count", fields.provider_call_count],
    ["usage_commit_count", fields.usage_commit_count],
    ["checkout_creation_count", fields.checkout_creation_count],
    ["entitlement_write_count", fields.entitlement_write_count],
    ["cross_scope_access_count", fields.cross_scope_access_count],
    ["output_state", fields.output_state],
    ["success_state", fields.success_state],
    ["source_timestamp", fields.source_timestamp],
    ["freshness", fields.freshness]
  ]);
}

function validateB2ParsedScenarioResultRecords(scenarioResultRecords, b2Fields, b1ChildRecord, b1ProofRecord, signedEvidenceRecord) {
  assert.equal(Array.isArray(scenarioResultRecords), true, "B2 requires parsed scenario result records");
  assert.ok(scenarioResultRecords.length > 0, "B2 requires parsed scenario result records");
  const b1Fields = b1ChildRecord?.fields ?? b1ChildRecord;
  assert.equal(b1Fields?.child_id, "B1-deployed-target-proof", "B2 requires the exact B1 child");
  const b1ProofFields = validateB1ParsedEvidenceRecord(b1ProofRecord, b1Fields);
  const signedEvidenceFields = validateSignedEvidenceRecord(signedEvidenceRecord);
  const actualB2ChildId = assertRequiredParsedTextField(b2Fields, "child_id", "B2 parsed scenario binding");
  assert.equal(actualB2ChildId, "B2-live-paid-flow-evidence", "B2 scenario records must bind the B2 child");
  const actualB2ApprovalFingerprint = assertSanitizedParsedFingerprint(b2Fields, "approval_fingerprint", "B2 parsed scenario binding");
  const actualB2ExecutionId = assertRequiredParsedTextField(b2Fields, "b2_execution_id", "B2 parsed scenario binding");
  const actualTargetScopeAlias = assertRequiredParsedTextField(b2Fields, "target_scope_alias", "B2 parsed scenario binding");
  const actualTimeWindow = assertRequiredParsedTextField(b2Fields, "time_window", "B2 parsed scenario binding");
  const actualB1Fingerprint = assertSanitizedParsedFingerprint(b2Fields, "b1_deployed_fingerprint", "B2 parsed scenario binding");
  const actualSignedEvidenceFingerprint = assertSanitizedParsedFingerprint(b2Fields, "signed_evidence_fingerprint", "B2 parsed scenario binding");
  assert.equal(actualB1Fingerprint, b1Fields.deployed_fingerprint, "B2 scenario records require B2 to bind the record-derived B1 fingerprint");
  assert.equal(actualSignedEvidenceFingerprint, signedEvidenceFields.fingerprint, "B2 scenario records require B2 to bind the actual signed-evidence fingerprint");
  const recordsByScenarioId = new Map();
  const seenResultIds = new Set();
  for (const record of scenarioResultRecords) {
    const recordFields = record?.fields ?? record;
    assert.deepEqual(Object.keys(recordFields).sort(), [...b2ScenarioResultRecordFields].sort(), "B2 parsed scenario result requires the exact closed schema");
    const scenarioId = assertRequiredParsedTextField(recordFields, "scenario_id", "B2 parsed scenario result");
    const scenarioResultId = assertRequiredParsedTextField(recordFields, "scenario_result_id", `B2 parsed scenario ${scenarioId}`);
    assert.equal(recordsByScenarioId.has(scenarioId), false, "B2 parsed scenario result IDs must be unique");
    assert.equal(seenResultIds.has(scenarioResultId), false, "B2 parsed scenario result IDs must be unique");
    recordsByScenarioId.set(scenarioId, recordFields);
    seenResultIds.add(scenarioResultId);
    assert.equal(assertRequiredParsedTextField(recordFields, "record_status", `B2 parsed scenario ${scenarioId}`), "complete-unambiguous", `B2 parsed scenario ${scenarioId} requires a complete-unambiguous record`);
    assert.equal(assertRequiredParsedTextField(recordFields, "b2_child_id", `B2 parsed scenario ${scenarioId}`), actualB2ChildId, `B2 parsed scenario ${scenarioId} must bind the actual B2 child`);
    assert.equal(assertSanitizedParsedFingerprint(recordFields, "b2_approval_fingerprint", `B2 parsed scenario ${scenarioId}`), actualB2ApprovalFingerprint, `B2 parsed scenario ${scenarioId} must bind the actual B2 approval fingerprint`);
    assert.equal(assertRequiredParsedTextField(recordFields, "b2_execution_id", `B2 parsed scenario ${scenarioId}`), actualB2ExecutionId, `B2 parsed scenario ${scenarioId} must bind the actual b2_execution_id`);
    assert.equal(assertRequiredParsedTextField(recordFields, "target_scope_alias", `B2 parsed scenario ${scenarioId}`), actualTargetScopeAlias, `B2 parsed scenario ${scenarioId} must bind the actual target_scope_alias`);
    assert.equal(assertRequiredParsedTextField(recordFields, "time_window", `B2 parsed scenario ${scenarioId}`), actualTimeWindow, `B2 parsed scenario ${scenarioId} must bind the actual time_window`);
    assert.equal(assertSanitizedParsedFingerprint(recordFields, "b1_fingerprint", `B2 parsed scenario ${scenarioId}`), actualB1Fingerprint, `B2 parsed scenario ${scenarioId} must bind the actual B1 fingerprint`);
    assert.equal(assertSanitizedParsedFingerprint(recordFields, "signed_evidence_fingerprint", `B2 parsed scenario ${scenarioId}`), actualSignedEvidenceFingerprint, `B2 parsed scenario ${scenarioId} must bind the actual signed-evidence fingerprint`);
    assert.equal(assertRequiredParsedTextField(recordFields, "freshness", `B2 parsed scenario ${scenarioId}`), "fresh", `B2 parsed scenario ${scenarioId} requires fresh evidence`);
    assertSourceTimestampWithinExactOperationWindow(recordFields, `B2 parsed scenario ${scenarioId}`);
    assertDerivedSanitizedFingerprint(recordFields, "result_fingerprint", "b2-scenario-result", [
      ["record_status", recordFields.record_status],
      ["scenario_result_id", scenarioResultId],
      ["b2_child_id", recordFields.b2_child_id],
      ["b2_approval_fingerprint", recordFields.b2_approval_fingerprint],
      ["b2_execution_id", recordFields.b2_execution_id],
      ["target_scope_alias", recordFields.target_scope_alias],
      ["time_window", recordFields.time_window],
      ["b1_fingerprint", recordFields.b1_fingerprint],
      ["signed_evidence_fingerprint", recordFields.signed_evidence_fingerprint],
      ["scenario_id", scenarioId],
      ["canonical_outcome", recordFields.canonical_outcome],
      ["sanitized_outcome", recordFields.sanitized_outcome],
      ["paid_transition_count", recordFields.paid_transition_count],
      ["provider_call_count", recordFields.provider_call_count],
      ["usage_commit_count", recordFields.usage_commit_count],
      ["checkout_creation_count", recordFields.checkout_creation_count],
      ["entitlement_write_count", recordFields.entitlement_write_count],
      ["cross_scope_access_count", recordFields.cross_scope_access_count],
      ["output_state", recordFields.output_state],
      ["success_state", recordFields.success_state],
      ["source_timestamp", recordFields.source_timestamp],
      ["freshness", recordFields.freshness]
    ], `B2 parsed scenario ${scenarioId}`);
  }
  assert.equal(scenarioResultRecords.length, canonicalB2ScenarioContracts.length, "B2 requires one parsed result for every canonical scenario");
  for (const expected of canonicalB2ScenarioContracts) {
    const recordFields = recordsByScenarioId.get(expected.scenario_id);
    assert.ok(recordFields, `B2 requires one parsed result for ${expected.scenario_id}`);
    for (const field of [
      "scenario_result_id",
      "canonical_outcome",
      "sanitized_outcome",
      "paid_transition_count",
      "provider_call_count",
      "usage_commit_count",
      "checkout_creation_count",
      "entitlement_write_count",
      "cross_scope_access_count",
      "output_state",
      "success_state"
    ]) {
      assert.equal(assertRequiredParsedTextField(recordFields, field, `B2 parsed scenario ${expected.scenario_id}`), expected[field], `B2 parsed scenario ${expected.scenario_id} requires exact ${field}`);
    }
  }
  return recordsByScenarioId;
}

function deriveB2ScenarioResultsAggregateFingerprint(recordsByScenarioId) {
  return deriveSanitizedFingerprint("b2-scenario-results-aggregate", canonicalB2ScenarioContracts.map((contract, index) => [
    `scenario_${String(index + 1).padStart(2, "0")}_result_fingerprint`,
    recordsByScenarioId.get(contract.scenario_id).result_fingerprint
  ]));
}

function deriveB2AggregateLiveOperationResultRecordFingerprint(fields) {
  return deriveSanitizedFingerprint("b2-aggregate-live-operation-result", b2AggregateLiveOperationResultRecordFields
    .filter((field) => field !== "aggregate_record_fingerprint")
    .map((field) => [field, fields[field]]));
}

function parseB2AggregateLiveOperationResultRecord(section) {
  return validateB2AggregateLiveOperationResultRecord(parseStrictExactTextFence(section, b2AggregateLiveOperationResultRecordFields, "B2 aggregate live-operation result"));
}

function validateB2AggregateLiveOperationResultRecord(record, b2Fields = undefined, b1ChildRecord = undefined, b1ProofRecord = undefined, signedEvidenceRecord = undefined, scenarioResultRecords = [], { requireComplete = false } = {}) {
  const fields = record?.fields ?? record;
  const context = "B2 aggregate live-operation result";
  assert.ok(fields && typeof fields === "object", `${context} requires a separate parsed record`);
  assert.deepEqual(Object.keys(fields).sort(), [...b2AggregateLiveOperationResultRecordFields].sort(), `${context} requires the exact closed schema`);
  assert.ok(["approved-completed-live-operation-result", "approved-complete-not-closure-eligible-live-operation-result"].includes(assertRequiredParsedTextField(fields, "record_status", context)), `${context} requires a terminal truthful record status`);
  assert.equal(assertRequiredParsedTextField(fields, "record_type", context), "sanitized-aggregate-live-operation-result");
  assert.equal(assertRequiredParsedTextField(fields, "evidence_id", context), "EVID-LIVE-PAID-FLOW");
  assert.equal(assertRequiredParsedTextField(fields, "child_id", context), "B2-live-paid-flow-evidence");
  assert.match(assertRequiredParsedTextField(fields, "aggregate_record_id", context), /^NC-R1-B2-AGGREGATE-[A-Za-z0-9-]+$/);
  assert.equal(assertRequiredParsedTextField(fields, "freshness", context), "fresh");
  assert.equal(assertRequiredParsedTextField(fields, "extra_authorization_or_execution", context), "none");
  assert.equal(assertRequiredParsedTextField(fields, "stop_owner", context), "kurodev"); assert.equal(assertRequiredParsedTextField(fields, "rollback_owner", context), "kurodev");
  for (const field of ["approval_id", "approval_fingerprint", "requested_operation", "b2_execution_id", "exact_target_or_scope", "target_scope_alias", "time_window", "b1_deployed_fingerprint", "signed_evidence_record_id", "signed_evidence_source", "signed_evidence_classification", "signed_evidence_authority", "signed_evidence_fingerprint", "ordered_b2_scenario_result_ids", "ordered_b2_scenario_result_fingerprints", "scenario_results_aggregate_fingerprint", "source_timestamp", "aggregate_outcome", "side_effect_summary", "positive_paid_result", "compatible_active_signed_subscription", "signed_authority_status", "b1_deployed_binding", "expected_paid_transition_count", "provider_calls_after_budget_quota_rejection", "usage_commits_after_provider_failure", "output_after_post_provider_commit_rejection", "success_after_post_provider_commit_rejection", "final_state", "unexpected_paid_transitions", "closure_eligibility", "nonclosure_reason", "closure_disposition", "evidence_retention_location"]) assertRequiredParsedTextField(fields, field, context);
  for (const field of ["approval_fingerprint", "b1_deployed_fingerprint", "signed_evidence_fingerprint", "scenario_results_aggregate_fingerprint", "aggregate_record_fingerprint"]) assert.match(fields[field], sanitizedFingerprintPattern, `${context} requires a sanitized ${field}`);
  assertSourceTimestampWithinExactOperationWindow(fields, context);
  assert.equal(fields.aggregate_record_fingerprint, deriveB2AggregateLiveOperationResultRecordFingerprint(fields), `${context} fingerprint must be deterministic`);
  if (!b2Fields) return fields;
  const b1Fields = b1ChildRecord?.fields ?? b1ChildRecord;
  const b1ProofFields = validateB1ParsedEvidenceRecord(b1ProofRecord, b1Fields);
  const signedEvidenceFields = validateSignedEvidenceRecord(signedEvidenceRecord);
  const recordsByScenarioId = validateB2ParsedScenarioResultRecords(scenarioResultRecords, b2Fields, b1Fields, b1ProofFields, signedEvidenceFields);
  assert.equal(fields.approval_id, b2Fields.approval_id, `${context} requires the exact B2 approval ID`);
  assert.equal(fields.approval_fingerprint, b2Fields.approval_fingerprint, `${context} requires the exact B2 approval fingerprint`);
  assert.equal(fields.requested_operation, b2BoundedLivePaidFlowVerificationOperation, `${context} requires the exact bounded B2 operation`);
  assert.equal(fields.requested_operation, b2Fields.requested_operation, `${context} requires the exact B2 operation binding`);
  assert.equal(fields.b2_execution_id, b2Fields.b2_execution_id, `${context} requires the exact B2 execution ID`);
  assert.equal(fields.exact_target_or_scope, b2Fields.exact_target_or_scope, `${context} requires the exact B2 target scope`);
  assert.equal(fields.target_scope_alias, b2Fields.target_scope_alias, `${context} requires the exact B2 target alias`);
  assert.equal(fields.time_window, b2Fields.time_window, `${context} requires the exact B2 time window`);
  assert.equal(fields.b1_deployed_fingerprint, b1Fields.deployed_fingerprint, `${context} requires the validated B1 deployed fingerprint`);
  assert.equal(fields.signed_evidence_record_id, signedEvidenceFields.evidence_record_id, `${context} requires the exact separate signed-evidence ID`);
  assert.equal(fields.signed_evidence_source, signedEvidenceFields.source, `${context} requires the exact separate signed-evidence source`);
  assert.equal(fields.signed_evidence_classification, signedEvidenceFields.classification, `${context} requires the exact separate signed-evidence classification`);
  assert.equal(fields.signed_evidence_authority, signedEvidenceFields.authority, `${context} requires the exact separate signed-evidence authority`);
  assert.equal(fields.signed_evidence_fingerprint, signedEvidenceFields.fingerprint, `${context} requires the exact separate signed-evidence fingerprint`);
  const expectedScenarioIds = canonicalB2ScenarioContracts.map((contract) => contract.scenario_result_id);
  const expectedScenarioFingerprints = canonicalB2ScenarioContracts.map((contract) => recordsByScenarioId.get(contract.scenario_id).result_fingerprint);
  assert.deepEqual(fields.ordered_b2_scenario_result_ids.split(","), expectedScenarioIds, `${context} requires the ordered 19 scenario result IDs`);
  assert.deepEqual(fields.ordered_b2_scenario_result_fingerprints.split(","), expectedScenarioFingerprints, `${context} requires the ordered 19 scenario result fingerprints`);
  assert.equal(fields.scenario_results_aggregate_fingerprint, deriveB2ScenarioResultsAggregateFingerprint(recordsByScenarioId), `${context} requires the deterministic aggregate of all 19 scenario fingerprints`);
  assert.equal(fields.evidence_retention_location, b2Fields.evidence_retention_location, `${context} requires the exact B2 retention location`);
  assert.equal(fields.stop_owner, b2Fields.stop_owner); assert.equal(fields.rollback_owner, b2Fields.rollback_owner);
  if (requireComplete || b2Fields.child_status === "satisfied") {
    assert.equal(fields.record_status, "approved-completed-live-operation-result");
    assert.equal(fields.aggregate_outcome, "paid-authority-only-and-free-fail-closed-otherwise");
    assert.equal(fields.side_effect_summary, "canonical-19-scenario-side-effects-exact");
    assert.equal(fields.positive_paid_result, "Paid");
    assert.equal(fields.compatible_active_signed_subscription, "compatible-active-signed-subscription");
    assert.equal(fields.signed_authority_status, "complete-unambiguous");
    assert.equal(fields.b1_deployed_binding, "approved-deployed-target-and-commit");
    assert.equal(fields.expected_paid_transition_count, "1");
    assert.equal(fields.provider_calls_after_budget_quota_rejection, "0");
    assert.equal(fields.usage_commits_after_provider_failure, "0");
    assert.equal(fields.output_after_post_provider_commit_rejection, "suppressed");
    assert.equal(fields.success_after_post_provider_commit_rejection, "absent");
    assert.equal(fields.final_state, "Free-fail-closed");
    assert.equal(fields.unexpected_paid_transitions, "0");
    assert.equal(fields.closure_eligibility, "eligible");
    assert.equal(fields.nonclosure_reason, "none");
    assert.equal(fields.closure_disposition, "EVID-LIVE-PAID-FLOW-only");
  } else {
    assert.equal(fields.record_status, "approved-complete-not-closure-eligible-live-operation-result");
    assert.equal(fields.aggregate_outcome, "aggregate-unambiguous-nonclosing");
    assert.equal(fields.side_effect_summary, "canonical-19-scenario-side-effects-exact");
    assert.equal(fields.closure_eligibility, "ineligible");
    assert.equal(fields.nonclosure_reason, "bound-approval-withholds-row-closure");
    assert.equal(fields.closure_disposition, "none");
  }
  return fields;
}

function validateB2ParsedResult(fields, b1ChildRecord, b1ProofRecord, signedEvidenceRecord, scenarioResultRecords = [], aggregateResultRecord = undefined) {
  assert.equal(assertRequiredParsedTextField(fields, "requested_operation", "B2 satisfied result"), b2BoundedLivePaidFlowVerificationOperation, "B2 satisfied result requires the exact bounded non-public operation");
  assert.equal(assertRequiredParsedTextField(fields, "approved_target_scope_binding", "B2 satisfied result"), deriveB2ApprovedTargetScopeBinding(fields), "B2 satisfied result requires its deterministic approval-bound target mapping");
  const requiredScenarios = canonicalB2ScenarioContracts.map((contract) => contract.scenario_id);
  const scenarios = fields.b2_parsed_scenarios?.split(",") ?? [];
  assert.deepEqual(scenarios, requiredScenarios, "B2 satisfied result must be parsed with every canonical adversarial scenario");
  assert.equal(new Set(scenarios).size, scenarios.length, "B2 parsed scenarios must be unique");
  const expectedScenarioResultIds = canonicalB2ScenarioContracts.map((contract) => contract.scenario_result_id);
  assert.deepEqual(assertRequiredParsedTextField(fields, "b2_scenario_result_ids", "B2 satisfied result").split(","), expectedScenarioResultIds, "B2 satisfied result must bind every canonical parsed scenario result ID");
  assertSourceTimestampWithinExactOperationWindow(fields, "B2 satisfied result");
  const b1Fields = b1ChildRecord?.fields ?? b1ChildRecord;
  assert.equal(b1Fields?.child_id, "B1-deployed-target-proof", "B2 requires the exact B1 child");
  const b1ProofFields = validateB1ParsedEvidenceRecord(b1ProofRecord, b1Fields);
  const signedEvidenceFields = validateSignedEvidenceRecord(signedEvidenceRecord);
  assert.equal(assertRequiredParsedTextField(fields, "b1_deployed_target_binding", "B2 satisfied result"), b1ProofFields.observed_deployed_target_binding);
  assert.equal(assertRequiredParsedTextField(fields, "b1_deployed_commit_binding", "B2 satisfied result"), b1ProofFields.observed_deployed_commit_binding);
  assert.equal(assertRequiredParsedTextField(fields, "b1_deployed_fingerprint", "B2 satisfied result"), b1Fields.deployed_fingerprint);
  assert.equal(assertRequiredParsedTextField(fields, "signed_evidence_record_id", "B2 satisfied result"), signedEvidenceFields.evidence_record_id);
  assert.equal(assertRequiredParsedTextField(fields, "signed_evidence_source", "B2 satisfied result"), signedEvidenceFields.source);
  assert.equal(assertRequiredParsedTextField(fields, "signed_evidence_classification", "B2 satisfied result"), signedEvidenceFields.classification);
  assert.equal(assertRequiredParsedTextField(fields, "signed_evidence_authority", "B2 satisfied result"), signedEvidenceFields.authority);
  assert.equal(assertRequiredParsedTextField(fields, "signed_evidence_fingerprint", "B2 satisfied result"), signedEvidenceFields.fingerprint);
  assert.equal(assertRequiredParsedTextField(fields, "signed_evidence_source_timestamp", "B2 satisfied result"), signedEvidenceFields.source_timestamp);
  const aggregateFields = validateB2AggregateLiveOperationResultRecord(aggregateResultRecord, fields, b1Fields, b1ProofFields, signedEvidenceFields, scenarioResultRecords, { requireComplete: true });
  assert.equal(assertRequiredParsedTextField(fields, "b2_aggregate_record_fingerprint", "B2 satisfied result"), aggregateFields.aggregate_record_fingerprint, "B2 satisfied result must bind the independently parsed aggregate record fingerprint");
  assertSourceTimestampWithinExactOperationWindow({ source_timestamp: signedEvidenceFields.source_timestamp, time_window: fields.time_window }, "B2 signed evidence record");
}

function validateB2RunningPreflight(fields, b1ChildRecord, b1ProofRecord, signedEvidenceRecord) {
  const context = "B2 running preflight";
  validateApprovedB2ApprovalScope(fields, context);
  assert.equal(assertRequiredParsedTextField(fields, "requested_operation", context), b2BoundedLivePaidFlowVerificationOperation, `${context} requires the exact bounded non-public operation`);
  assert.equal(assertRequiredParsedTextField(fields, "approved_target_scope_binding", context), deriveB2ApprovedTargetScopeBinding(fields), `${context} requires its deterministic approval-bound target mapping`);
  assertDerivedApprovalFingerprint(fields, context);
  assert.deepEqual(assertRequiredParsedTextField(fields, "b2_parsed_scenarios", context).split(","), canonicalB2ScenarioContracts.map((contract) => contract.scenario_id), `${context} requires the canonical ordered 19 scenarios`);
  assert.equal(fields.b2_scenario_result_ids, "N/A", `${context} cannot claim completed scenario results`);
  assert.equal(fields.b2_aggregate_record_fingerprint, "N/A", `${context} cannot claim a completed aggregate record`);
  assert.equal(fields.result_fingerprint, "N/A", `${context} cannot claim a completed result fingerprint`);
  const b1Fields = b1ChildRecord?.fields ?? b1ChildRecord;
  const proof = validateB1ParsedEvidenceRecord(b1ProofRecord, b1Fields);
  assert.equal(fields.b1_deployed_target_binding, proof.observed_deployed_target_binding, `${context} requires the exact validated B1 target`);
  assert.equal(fields.b1_deployed_commit_binding, proof.observed_deployed_commit_binding, `${context} requires the exact validated B1 commit`);
  assert.equal(fields.b1_deployed_fingerprint, b1Fields.deployed_fingerprint, `${context} requires the exact validated B1 fingerprint`);
  const signed = validateSignedEvidenceRecord(signedEvidenceRecord);
  for (const [field, expected] of [["signed_evidence_record_id", signed.evidence_record_id], ["signed_evidence_source", signed.source], ["signed_evidence_classification", signed.classification], ["signed_evidence_authority", signed.authority], ["signed_evidence_fingerprint", signed.fingerprint], ["signed_evidence_source_timestamp", signed.source_timestamp]]) assert.equal(fields[field], expected, `${context} requires exact ${field}`);
  assertSourceTimestampWithinExactOperationWindow({ source_timestamp: signed.source_timestamp, time_window: fields.time_window }, `${context} signed evidence`);
}

function validateApprovedB2ApprovalScope(fields, context = "B2 approved scope") {
  assert.equal(assertRequiredParsedTextField(fields, "requested_operation", context), b2BoundedLivePaidFlowVerificationOperation, `${context} requires the exact bounded non-public operation`);
  assert.equal(assertRequiredParsedTextField(fields, "approved_target_scope_binding", context), deriveB2ApprovedTargetScopeBinding(fields), `${context} requires the deterministic approved target pair`);
  assert.equal(assertRequiredParsedTextField(fields, "approved_signed_evidence_binding", context), deriveB2ApprovedSignedEvidenceBinding(fields), `${context} requires the deterministic approved signed-evidence binding`);
  assert.deepEqual(assertRequiredParsedTextField(fields, "b2_parsed_scenarios", context).split(","), canonicalB2ScenarioContracts.map((contract) => contract.scenario_id), `${context} requires the exact canonical 19-scenario specification`);
  for (const field of ["signed_evidence_record_id", "signed_evidence_source", "signed_evidence_classification", "signed_evidence_authority", "time_window", "operator", "evidence_retention_location"]) assertRequiredParsedTextField(fields, field, context);
  assert.equal(fields.signed_evidence_classification, "active-compatible", `${context} requires the approved signed-evidence classification`);
  assert.equal(fields.signed_evidence_authority, "complete-unambiguous", `${context} requires the approved signed-evidence authority`);
  assert.equal(fields.stop_owner, "kurodev"); assert.equal(fields.rollback_owner, "kurodev");
  assertDerivedApprovalFingerprint(fields, context);
}

function assertSanitizedParsedFingerprint(fields, field, context) {
  const fingerprint = assertRequiredParsedTextField(fields, field, context);
  assert.match(fingerprint, sanitizedFingerprintPattern, `${context} requires a sanitized sha256 ${field}`);
  return fingerprint;
}

function assertExactParsedFingerprintBinding(fields, field, expectedFingerprint, context) {
  assert.equal(assertSanitizedParsedFingerprint(fields, field, context), expectedFingerprint, `${context} requires ${field} to exactly bind the actual upstream fingerprint`);
  return expectedFingerprint;
}

function deriveA0CostModelInputFingerprint(fields, approvalFingerprint) {
  return deriveSanitizedFingerprint("a0-cost-model-input", [
    ["approval_fingerprint", approvalFingerprint],
    ["bound_input", fields.bound_input],
    ["effective_date", fields.effective_date],
    ["required_approver", fields.required_approver],
    ["judgment_output", fields.judgment_output],
    ["cost_model_decision", fields.cost_model_decision]
  ]);
}

function deriveA0CostModelResultFingerprint(fields, costModelInputFingerprint) {
  return deriveSanitizedFingerprint("a0-cost-model-result", [
    ["cost_model_input_fingerprint", costModelInputFingerprint],
    ["cost_model_decision", fields.cost_model_decision],
    ["judgment_output", fields.judgment_output],
    ["judgment_effective_date", fields.judgment_effective_date]
  ]);
}

function deriveA0BoundArtifactFingerprint(fields, costModelInputFingerprint, costModelResultFingerprint) {
  return deriveSanitizedFingerprint("a0-bound-artifact", [
    ["cost_model_input_fingerprint", costModelInputFingerprint],
    ["cost_model_result_fingerprint", costModelResultFingerprint],
    ["judgment_output", fields.judgment_output],
    ["judgment_effective_date", fields.judgment_effective_date]
  ]);
}

function deriveA1SourceDispositionFingerprint(fields, approvalFingerprint) {
  return deriveSanitizedFingerprint("a1-source-disposition", [
    ["approval_fingerprint", approvalFingerprint],
    ["source_disposition_outcome", fields.source_disposition_outcome]
  ]);
}

function deriveA1EvidenceFingerprint(fields, approvalFingerprint, sourceDispositionFingerprint) {
  return deriveSanitizedFingerprint("a1-worker-cpu-result", [
    ["approval_fingerprint", approvalFingerprint],
    ["source_disposition_fingerprint", sourceDispositionFingerprint],
    ["aggregation_complete", fields.aggregation_complete],
    ["request_completeness", fields.request_completeness],
    ["headroom_disposition", fields.headroom_disposition],
    ["source_timestamp", fields.source_timestamp],
    ["observed_record_fingerprint", fields.observed_record_fingerprint]
  ]);
}

function deriveA1ObservedRecordFingerprint(fields) {
  const aliases = {
    raw_numeric_metrics_response_account_tag_private_script_credential_retained_or_shared: "sensitive_material_retention"
  };
  return deriveSanitizedFingerprint(
    "a1-worker-cpu-observed-result",
    a1WorkerCpuObservedResultRecordFields
      .filter((field) => !["a1_result_fingerprint", "observed_record_fingerprint"].includes(field))
      .map((field) => [aliases[field] ?? field, fields[field]])
  );
}

function canonicalA1PartialStopResult(fields) {
  const reasons = [];
  if (fields.target_match !== "exact") reasons.push(`target_match-${fields.target_match}`);
  if (fields.aggregation_complete !== "yes") reasons.push(`aggregation_complete-${fields.aggregation_complete}`);
  if (fields.request_completeness !== "complete") reasons.push(`request_completeness-${fields.request_completeness}`);
  if (fields.headroom_disposition !== "approved") reasons.push(`headroom_disposition-${fields.headroom_disposition}`);
  if (fields.sampling_confidence_completeness !== "complete") reasons.push(`sampling_confidence_completeness-${fields.sampling_confidence_completeness}`);
  assert.ok(reasons.length > 0, "A1 partial-stop requires at least one incomplete signal");
  return reasons.join("--");
}

function validateA1WorkerCpuObservedResultRecord(record, closingChild, { requireComplete = false } = {}) {
  const fields = record?.fields ?? record;
  const context = "A1 Worker CPU observed result";
  assert.ok(fields && typeof fields === "object", `${context} requires parsed fields`);
  assert.deepEqual(Object.keys(fields).sort(), [...a1WorkerCpuObservedResultRecordFields].sort(), `${context} requires the exact closed schema`);
  assert.equal(fields.evidence_id, "EVID-WORKER-CPU", `${context} must bind only EVID-WORKER-CPU`);
  assert.equal(fields.child_id, "A1-worker-cpu-evidence-read", `${context} must bind the A1 closing child`);
  assert.equal(fields.approval_decision, "approved", `${context} requires an explicit approved decision`);
  assert.equal(closingChild.canonical_child_approval_unit, "authenticated-private-read", `${context} requires authenticated-private-read authority`);
  for (const field of ["approval_id", "approval_fingerprint", "exact_target_or_scope", "time_window", "operator", "source_disposition_fingerprint"]) {
    assert.equal(fields[field], closingChild[field], `${context} ${field} must exactly match the approved A1 child`);
  }
  assertStrictAsiaTokyoCalendarTimestamp(fields.observed_at, `${context} observed_at`);
  const [windowStart, windowEnd] = fields.time_window.split("/");
  assertStrictAsiaTokyoCalendarTimestamp(windowStart, `${context} window start`);
  assertStrictAsiaTokyoCalendarTimestamp(windowEnd, `${context} window end`);
  assertObservationWithinApprovedWindow(fields.observed_at, fields.time_window);
  assert.ok(["exact", "unconfirmed", "mismatched"].includes(fields.target_match), `${context} target_match must be closed`);
  assert.ok(["yes", "no", "unknown"].includes(fields.aggregation_complete), `${context} aggregation_complete must be closed`);
  assert.ok(["complete", "incomplete", "unknown"].includes(fields.request_completeness), `${context} request_completeness must be closed`);
  assert.ok(["approved", "insufficient", "unconfirmed"].includes(fields.headroom_disposition), `${context} headroom_disposition must be closed`);
  assert.ok(["complete", "incomplete", "unknown"].includes(fields.sampling_confidence_completeness), `${context} sampling_confidence_completeness must be closed`);
  assert.equal(fields.raw_numeric_metrics_response_account_tag_private_script_credential_retained_or_shared, "no", `${context} must retain no raw numeric or private material`);
  assert.equal(fields.trace_logs_dashboard_reopened_outside_exact_approved_surface, "no", `${context} must not reopen Trace, logs, or dashboard surfaces`);
  assert.equal(fields.provider_billing_configuration_or_write_action, "none", `${context} must record no provider, billing, configuration, or write action`);
  assert.equal(fields.codex_browser_or_control, "none", `${context} must give Codex no browser or control`);
  assert.equal(fields.incremental_charge, "no", `${context} must record no incremental charge`);
  const complete = fields.target_match === "exact"
    && fields.aggregation_complete === "yes"
    && fields.request_completeness === "complete"
    && fields.headroom_disposition === "approved"
    && fields.sampling_confidence_completeness === "complete";
  if (fields.result_status === "complete") {
    assert.equal(complete, true, `${context} complete status requires every exact completeness signal`);
    assert.equal(fields.record_status, "approved-completed-authenticated-private-read", `${context} complete status requires the completed record status`);
    assert.equal(fields.stop_result, "none-complete", `${context} complete status requires the exact no-stop result`);
    assert.equal(fields.row_closure, "EVID-WORKER-CPU", `${context} complete status closes only EVID-WORKER-CPU`);
  } else {
    assert.equal(fields.result_status, "partial-stop", `${context} result_status must be complete or partial-stop`);
    assert.equal(complete, false, `${context} partial-stop must retain at least one incomplete signal`);
    assert.equal(fields.record_status, "approved-partial-stop-authenticated-private-read", `${context} partial-stop requires the partial-stop record status`);
    assert.equal(fields.stop_result, canonicalA1PartialStopResult(fields), `${context} partial-stop requires the exact canonical stop result`);
    assert.equal(fields.row_closure, "none", `${context} partial-stop closes no row`);
  }
  if (requireComplete) assert.equal(fields.result_status, "complete", "A1 satisfied state requires a complete observed result record");
  assert.equal(fields.a1_result_fingerprint, closingChild.result_fingerprint, `${context} must bind the exact A1 result fingerprint`);
  const observedRecordFingerprint = deriveA1ObservedRecordFingerprint(fields);
  assert.equal(fields.observed_record_fingerprint, observedRecordFingerprint, `${context} observed-record fingerprint must be deterministically derived`);
  assert.equal(closingChild.observed_record_fingerprint, observedRecordFingerprint, `${context} must bind the closing child to the observed record`);
  if (fields.result_status === "complete") {
    assert.equal(closingChild.source_timestamp, fields.observed_at, `${context} observed_at must bind the A1 source timestamp`);
    assert.equal(closingChild.aggregation_complete, "yes", `${context} complete result requires complete aggregation`);
    assert.equal(closingChild.request_completeness, "complete", `${context} complete result requires complete requests`);
    assert.equal(closingChild.headroom_disposition, "approved", `${context} complete result requires approved headroom`);
  }
  return fields;
}

function deriveFundingPrerequisiteFingerprint(fields, a0CostModelInputFingerprint, fundingOwnerApprovalRecordFingerprint, fundingDispositionRecordFingerprint) {
  const entries = [
    ["a0_cost_model_input_fingerprint", a0CostModelInputFingerprint],
    ["funding_owner_approval_record_fingerprint", fundingOwnerApprovalRecordFingerprint],
    ["funding_disposition_record_fingerprint", fundingDispositionRecordFingerprint],
    ["funding_requirement_state", fields.funding_requirement_state]
  ];
  if (fields.funding_requirement_state === "needed-absent") entries.push(["funding_external_result_fingerprint", fields.funding_external_result_fingerprint]);
  return deriveSanitizedFingerprint("a2-funding-prerequisite", entries);
}

function deriveA2ResultFingerprint(fields, approvalFingerprint, a0CostModelInputFingerprint, fundingPrerequisiteFingerprint) {
  return deriveSanitizedFingerprint("a2-provider-cost-result", [
    ["approval_fingerprint", approvalFingerprint],
    ["dependency_fingerprint", a0CostModelInputFingerprint],
    ["funding_prerequisite_fingerprint", fundingPrerequisiteFingerprint],
    ["sanitized_exact_cost", fields.sanitized_exact_cost],
    ["applicability", fields.applicability],
    ["source_timestamp", fields.source_timestamp],
    ["observed_record_fingerprint", fields.observed_record_fingerprint]
  ]);
}

function deriveA2ObservedRecordFingerprint(fields) {
  const aliases = {
    raw_url_org_project_account_identifier_private_identifier_payload_retained_or_shared: "sensitive_material_retention"
  };
  return deriveSanitizedFingerprint(
    "a2-provider-cost-observed-result",
    a2ProviderCostObservedResultRecordFields
      .filter((field) => !["a2_result_fingerprint", "observed_record_fingerprint"].includes(field))
      .map((field) => [aliases[field] ?? field, fields[field]])
  );
}

function validateA2ProviderCostObservedResultRecord(record, closingChild, { requireComplete = false } = {}) {
  const fields = record?.fields ?? record;
  const context = "A2 Provider Cost observed result";
  assert.ok(fields && typeof fields === "object", `${context} requires parsed fields`);
  assert.deepEqual(Object.keys(fields).sort(), [...a2ProviderCostObservedResultRecordFields].sort(), `${context} requires the exact closed schema`);
  assert.equal(fields.evidence_id, "EVID-PROVIDER-COST", `${context} must bind only EVID-PROVIDER-COST`);
  assert.equal(fields.child_id, "A2-provider-cost-evidence-read", `${context} must bind the A2 closing child`);
  assert.equal(fields.approval_decision, "approved", `${context} requires an explicit approved decision`);
  assert.equal(closingChild.canonical_child_approval_unit, "authenticated-private-read", `${context} requires authenticated-private-read authority`);
  for (const field of ["approval_id", "approval_fingerprint", "exact_target_or_scope", "time_window", "operator"]) {
    assert.equal(fields[field], closingChild[field], `${context} ${field} must exactly match the approved A2 child`);
  }
  assert.equal(fields.bound_a0_cost_model_input_fingerprint, closingChild.dependency_fingerprint, `${context} must bind the exact A0 input fingerprint`);
  assert.equal(fields.funding_prerequisite_fingerprint, closingChild.funding_prerequisite_fingerprint, `${context} must bind the exact funding prerequisite fingerprint`);
  assertStrictAsiaTokyoCalendarTimestamp(fields.observed_at, `${context} observed_at`);
  const [windowStart, windowEnd] = fields.time_window.split("/");
  assertStrictAsiaTokyoCalendarTimestamp(windowStart, `${context} window start`);
  assertStrictAsiaTokyoCalendarTimestamp(windowEnd, `${context} window end`);
  assertObservationWithinApprovedWindow(fields.observed_at, fields.time_window);
  assert.ok(["exact", "unconfirmed", "mismatched"].includes(fields.target_match), `${context} target_match must be closed`);
  assert.ok(["positive-funded-headroom", "zero-funded-headroom", "unavailable", "unconfirmed"].includes(fields.funded_headroom_classification), `${context} funded headroom must be closed`);
  assert.ok(["complete", "incomplete", "unknown"].includes(fields.aggregation_completeness), `${context} aggregation completeness must be closed`);
  assert.ok(["available", "unavailable", "unconfirmed"].includes(fields.sanitized_exact_cost_classification), `${context} exact-cost classification must be closed`);
  assert.ok(["applicable", "not-applicable", "unknown"].includes(fields.applicability), `${context} applicability must be closed`);
  assert.equal(fields.provider_api_write_payment_credit_budget_or_settings_action, "none", `${context} must record no provider or funding side effect`);
  assert.equal(fields.credential_creation_retrieval_disclosure, "none", `${context} must record no credential action`);
  assert.equal(fields.raw_url_org_project_account_identifier_private_identifier_payload_retained_or_shared, "no", `${context} must retain no raw or private material`);
  assert.equal(fields.codex_browser_or_provider_control, "none", `${context} must give Codex no browser or provider control`);
  assert.equal(fields.incremental_charge, "no", `${context} must record no incremental charge`);
  const complete = fields.target_match === "exact"
    && fields.funded_headroom_classification === "positive-funded-headroom"
    && fields.aggregation_completeness === "complete"
    && fields.sanitized_exact_cost_classification === "available"
    && fields.applicability === "applicable";
  if (fields.result_status === "complete") {
    assert.equal(complete, true, `${context} complete status requires positive funded headroom and every exact completeness signal`);
    assert.equal(fields.record_status, "approved-completed-authenticated-private-read", `${context} complete status requires the completed record status`);
    assert.equal(fields.stop_result, "none-complete", `${context} complete status requires the exact no-stop result`);
    assert.equal(fields.row_closure, "EVID-PROVIDER-COST", `${context} complete status closes only EVID-PROVIDER-COST`);
  } else {
    assert.equal(fields.result_status, "partial-stop", `${context} result_status must be complete or partial-stop`);
    assert.equal(complete, false, `${context} partial-stop must retain at least one incomplete signal`);
    assert.equal(fields.record_status, "approved-partial-stop-authenticated-private-read", `${context} partial-stop requires the partial-stop record status`);
    assert.match(fields.stop_result, /^(?!none-complete$)[a-z0-9-]+$/, `${context} partial-stop requires a truthful sanitized stop result`);
    assert.equal(fields.row_closure, "none", `${context} partial-stop closes no row`);
  }
  if (requireComplete) assert.equal(fields.result_status, "complete", "A2 satisfied state requires a complete observed result record");
  assert.equal(fields.a2_result_fingerprint, closingChild.result_fingerprint, `${context} must bind the exact A2 result fingerprint`);
  const observedRecordFingerprint = deriveA2ObservedRecordFingerprint(fields);
  assert.equal(fields.observed_record_fingerprint, observedRecordFingerprint, `${context} observed-record fingerprint must be deterministically derived`);
  assert.equal(closingChild.observed_record_fingerprint, observedRecordFingerprint, `${context} must bind the closing child to the observed record`);
  if (fields.result_status === "complete") {
    assert.equal(closingChild.source_timestamp, fields.observed_at, `${context} observed_at must bind the A2 source timestamp`);
    assert.equal(closingChild.sanitized_exact_cost, "sanitized-exact-cost-classified", `${context} complete result requires the sanitized exact-cost classification`);
    assert.equal(closingChild.applicability, "applicable", `${context} complete result requires applicable classification`);
  }
  return fields;
}

function deriveA3ManualReadOwnerApprovalRecordFingerprint(fields) {
  const fingerprintFieldAliases = {
    raw_document_contract_text_url_account_identifier_private_identifier_retention: "sensitive_material_retention"
  };
  return deriveSanitizedFingerprint(
    "a3-stripe-account-pricing-manual-read-owner-approval",
    a3ManualReadOwnerApprovalRecordFields
      .filter((field) => field !== "owner_approval_record_fingerprint")
      .map((field) => [fingerprintFieldAliases[field] ?? field, fields[field]])
  );
}

function assertA3SanitizedRecordValues(fields, context) {
  for (const [field, value] of Object.entries(fields)) {
    assert.match(value, /^[A-Za-z0-9:;=,_<>/+.-]+$/, `${context} ${field} must retain a whitespace-free sanitized alias only`);
    assert.doesNotMatch(value, /[a-z][a-z0-9+.-]*:\/\//i, `${context} ${field} must not retain a URL scheme`);
    assert.doesNotMatch(value, /@|[{}\[\]"']|\b(?:acct|cus|evt|price|prod|sub|whsec|pi|pm|cs_test|cs_live|seti|in|tok|sk|rk|pk|btok|src)_[A-Za-z0-9_-]+\b/i, `${context} ${field} must not retain email, private Stripe ID, JSON, or raw payload material`);
    assert.doesNotMatch(value, /\b(?:browser|query|log|config|migration)\b/i, `${context} ${field} must not retain browser, query, log, config, or migration material`);
  }
}

function assertA3NonAuthorizingRecordValues(fields, context) {
  const exactDeniedValues = {
    external_action: ["none"],
    payment_refund_client_or_event_settings_api_export_action: ["none"],
    credential_creation_retrieval_disclosure: ["none"],
    codex_browser_or_stripe_control: ["none"],
    public_pricing_substitution: ["forbidden", "no"],
    incremental_charge: ["no"]
  };
  for (const [field, allowed] of Object.entries(exactDeniedValues)) {
    if (Object.hasOwn(fields, field)) assert.ok(allowed.includes(fields[field]), `${context} ${field} must deny payment, refund, API, export, credential, browser, Stripe, public-pricing, and incremental-charge authority`);
  }
}

function validateActualA3ReadChild(a3Child, context) {
  assert.ok(a3Child && typeof a3Child === "object", `${context} requires the actual A3 child`);
  for (const field of ["child_id", "selected_mode", "selected_approval_unit", "requested_operation", "operator", "approval_id", "exact_target_or_scope", "time_window"]) {
    assert.equal(a3Child[field], canonicalUnapprovedA3StripePricingDocumentManualPacketFields[field], `${context} ${field} must retain the canonical corrected A3 packet field`);
  }
  const approvalFingerprint = assertDerivedApprovalFingerprint(a3Child, `${context} actual A3 child`);
  assert.match(approvalFingerprint, sanitizedFingerprintPattern, `${context} actual A3 child requires a deterministic sanitized approval fingerprint`);
  return approvalFingerprint;
}

function deriveA3CanonicalPartialStopResult(fields) {
  const signals = [
    ["target-match", fields.target_match, (value) => value !== "exact"],
    ["source-document", fields.source_document_available, (value) => value !== "available"],
    ["direct-account-specific-base-processing-fee", fields.direct_account_specific_base_processing_fee_available, (value) => value !== "available"],
    ["standard-custom-applicability", fields.standard_custom_applicability, (value) => !["standard", "custom"].includes(value)],
    ["full-cost-model-completeness", fields.full_cost_model_completeness, (value) => value !== "complete"],
    ["sanitized-exact-cost-classification", fields.sanitized_exact_cost_classification, (value) => value !== "available"],
    ["account-specific-pricing-terms-coverage", fields.account_specific_pricing_terms_coverage, (value) => value !== "complete"],
    ["private-exposure-detected", fields.private_exposure_detected, (value) => value !== "no"],
    ["incremental-charge-required", fields.incremental_charge_required, (value) => value !== "no"],
    ["base-processing-fee-coverage", fields.base_processing_fee_coverage, (value) => value !== "complete"],
    ["fixed-and-variable-components-coverage", fields.fixed_and_variable_components_coverage, (value) => value !== "complete"],
    ["refunds-disputes-chargebacks-coverage", fields.refunds_disputes_chargebacks_coverage, (value) => !["complete", "not-applicable"].includes(value)],
    ["international-currency-conversion-coverage", fields.international_currency_conversion_coverage, (value) => !["complete", "not-applicable"].includes(value)],
    ["tax-and-other-account-specific-fee-coverage", fields.tax_and_other_account_specific_fee_coverage, (value) => !["complete", "not-applicable"].includes(value)],
    ["effective-scope-coverage", fields.effective_scope_coverage, (value) => value !== "complete"]
  ];
  const reasons = signals.filter(([, value, isIncomplete]) => isIncomplete(value)).map(([name, value]) => `${name}-${value}`);
  assert.ok(reasons.length > 0, "A3 partial-stop requires at least one exact incomplete or unconfirmed source, fee, applicability, terms, or coverage signal");
  return reasons.join("--");
}

function assertA3SafePartialStopAliases(stopResult, context) {
  const safeCanonicalReasons = new Set(["incremental-charge-required-yes", "incremental-charge-required-unknown"]);
  for (const reason of stopResult.split("--")) {
    if (safeCanonicalReasons.has(reason)) continue;
    assert.doesNotMatch(reason, /(?:deploy|activation|permission|authoriz|allow|payment(?:-|$)|refund(?:-|$)|api(?:-|$)|export|credential|browser|live|(?:^|-)go(?:-|$)|(?:^|-)charge(?:-|$))/i, `${context} partial-stop stop_result must not contain deployment, activation, charge, permission, or authority aliases`);
  }
}

function validateA3ManualReadOwnerApprovalRecord(record, a3Child, a0Child) {
  const fields = record?.fields ?? record;
  const context = "A3 manual-read owner approval";
  assert.ok(fields && typeof fields === "object", `${context} requires a separately parsed independent record`);
  assert.deepEqual(Object.keys(fields).sort(), [...a3ManualReadOwnerApprovalRecordFields].sort(), `${context} requires the exact closed schema`);
  assertA3SanitizedRecordValues(fields, context);
  assertA3NonAuthorizingRecordValues(fields, context);
  const approvalFingerprint = validateActualA3ReadChild(a3Child, context);
  validateCompletedA0RegistryState(a0Child);
  assert.equal(fields.record_status, "approved-owner-approval-authenticated-private-read", `${context} requires an approved independent owner record`);
  assert.equal(fields.record_type, "sanitized-a3-stripe-account-pricing-manual-read-owner-approval");
  for (const field of [
    "evidence_id", "child_id", "selected_mode", "selected_approval_unit", "requested_operation", "permitted_execution_surface", "command", "operator", "required_approver",
    "approval_id", "exact_target_or_scope", "time_window", "bound_a0_approval_id", "prior_stripe_cost_approval_ids", "verification_scope", "evidence_retention_location",
    "stop_owner", "rollback_owner", "cost_guard", "default_incremental_spend_jpy", "stop_before_any_incremental_charge",
    "payment_refund_client_or_event_settings_api_export_action", "credential_creation_retrieval_disclosure", "raw_document_contract_text_url_account_identifier_private_identifier_retention",
    "codex_browser_or_stripe_control", "public_pricing_substitution", "partial_stop_condition", "production_proof", "activation_status"
  ]) assert.equal(fields[field], canonicalUnapprovedA3StripePricingDocumentManualPacketFields[field], `${context} ${field} must bind the exact corrected packet field`);
  assert.equal(fields.approval_decision, "approved", `${context} requires explicit owner approval`);
  assert.equal(fields.external_action, "none", `${context} cannot execute an external action`);
  for (const field of ["requested_operation", "approval_id", "exact_target_or_scope", "time_window", "operator"]) assert.equal(fields[field], a3Child[field], `${context} ${field} must exactly match the actual A3 child`);
  assert.equal(fields.approval_fingerprint, approvalFingerprint, `${context} approval_fingerprint must exactly match the actual A3 child`);
  assert.equal(fields.bound_a0_cost_model_input_fingerprint, a0Child.cost_model_input_fingerprint, `${context} must bind the actual A0 input fingerprint`);
  assert.equal(fields.row_closure, "none", `${context} cannot close EVID-STRIPE-COST`);
  assert.equal(fields.owner_approval_record_fingerprint, deriveA3ManualReadOwnerApprovalRecordFingerprint(fields), `${context} fingerprint must be deterministic`);
  return fields;
}

function validateA3ManualReadOwnerApprovalCollection(a3Child, records, a0Child, observedRecords = []) {
  assert.ok(a3Child && typeof a3Child === "object", "A3 owner approval collection requires the actual A3 child");
  assert.equal(Array.isArray(records), true, "A3 owner approval collection requires parsed records");
  assert.equal(Array.isArray(observedRecords), true, "A3 observed result collection requires parsed records");
  const status = a3Child.child_status;
  const requiresOwner = ["approved-not-started", "running", "partial-stop", "complete-not-closure-eligible", "satisfied"].includes(status);
  const terminal = ["partial-stop", "complete-not-closure-eligible", "satisfied"].includes(status);
  assert.equal(records.length, requiresOwner ? 1 : 0, requiresOwner ? "A3 requires exactly one independent A3 owner approval record" : "unapproved A3 requires an empty owner approval record collection");
  const owners = records.map((record) => validateA3ManualReadOwnerApprovalRecord(record, a3Child, a0Child));
  assert.equal(new Set(owners.map((owner) => owner.owner_approval_record_fingerprint)).size, owners.length, "A3 owner approval records must keep unique independent fingerprints");
  assert.equal(observedRecords.length, terminal ? 1 : 0, terminal ? "terminal A3 requires exactly one separate parsed observed result record" : "approved-not-started or running A3 requires no observed result record");
  if (terminal) validateA3StripeObservedResultRecord(observedRecords[0], a3Child, owners[0], a0Child, { requireComplete: status === "satisfied", requirePartialStop: ["partial-stop", "complete-not-closure-eligible"].includes(status), partialStopLifecycle: status === "partial-stop" });
  return owners;
}

function deriveA3ResultFingerprint(fields, approvalFingerprint, a0CostModelInputFingerprint, ownerApprovalRecordFingerprint) {
  const entries = [
    ["approval_fingerprint", approvalFingerprint],
    ["dependency_fingerprint", a0CostModelInputFingerprint],
    ["owner_approval_record_fingerprint", ownerApprovalRecordFingerprint],
    ["selected_mode", fields.selected_mode]
  ];
  if (fields.selected_mode === "read") {
    entries.push(
      ["sanitized_exact_cost", fields.sanitized_exact_cost],
      ["applicability", fields.applicability],
      ["source_timestamp", fields.source_timestamp],
      ["observed_record_fingerprint", fields.observed_record_fingerprint]
    );
  } else {
    entries.push(
      ["judgment_output", fields.judgment_output],
      ["bound_input", fields.bound_input],
      ["judgment_effective_date", fields.judgment_effective_date]
    );
  }
  return deriveSanitizedFingerprint("a3-stripe-result", entries);
}

function deriveA3ObservedRecordFingerprint(fields) {
  const fingerprintFieldAliases = {
    raw_document_contract_text_url_account_identifier_private_identifier_retained_or_shared: "sensitive_material_retention",
    private_exposure_detected: "privacy_exposure_classification"
  };
  return deriveSanitizedFingerprint(
    "a3-stripe-account-pricing-observed-result",
    a3StripeObservedResultRecordFields
      .filter((field) => !["a3_result_fingerprint", "observed_record_fingerprint"].includes(field))
      .map((field) => [fingerprintFieldAliases[field] ?? field, fields[field]])
  );
}

function validateA3StripeObservedResultRecord(record, closingChild, ownerApprovalRecord, a0Child, { requireComplete = false, requirePartialStop = false, partialStopLifecycle = false } = {}) {
  const fields = record?.fields ?? record;
  const context = "A3 Stripe observed result";
  assert.ok(fields && typeof fields === "object", `${context} requires parsed fields`);
  assert.deepEqual(Object.keys(fields).sort(), [...a3StripeObservedResultRecordFields].sort(), `${context} requires the exact closed schema`);
  assertA3SanitizedRecordValues(fields, context);
  assertA3NonAuthorizingRecordValues(fields, context);
  const approvalFingerprint = validateActualA3ReadChild(closingChild, context);
  const owner = validateA3ManualReadOwnerApprovalRecord(ownerApprovalRecord, closingChild, a0Child);
  assert.equal(fields.evidence_id, "EVID-STRIPE-COST", `${context} must bind only EVID-STRIPE-COST`);
  assert.equal(fields.child_id, "A3-stripe-source-applicability-read-or-judgment", `${context} must bind the A3 closing child`);
  assert.equal(fields.approval_decision, "approved", `${context} requires an explicit approved decision`);
  assert.equal(closingChild.selected_mode, "read", `${context} applies only to the authenticated-private-read mode`);
  assert.equal(closingChild.selected_approval_unit, "authenticated-private-read", `${context} requires authenticated-private-read authority`);
  for (const field of ["requested_operation", "approval_id", "exact_target_or_scope", "time_window", "operator"]) {
    assert.equal(fields[field], closingChild[field], `${context} ${field} must exactly match the approved A3 child`);
    assert.equal(fields[field], owner[field], `${context} ${field} must exactly match the independent owner approval`);
  }
  assert.match(fields.approval_fingerprint, sanitizedFingerprintPattern, `${context} approval_fingerprint must be a deterministic sanitized fingerprint`);
  assert.equal(fields.approval_fingerprint, approvalFingerprint, `${context} approval_fingerprint must exactly match the actual A3 child`);
  assert.equal(fields.approval_fingerprint, owner.approval_fingerprint, `${context} approval_fingerprint must exactly match the independent owner approval`);
  assert.equal(fields.owner_approval_record_fingerprint, owner.owner_approval_record_fingerprint, `${context} must bind the separate owner approval record fingerprint`);
  assert.equal(fields.approval_decision, owner.approval_decision, `${context} cannot self-authorize by changing approval_decision`);
  assert.equal(fields.bound_a0_cost_model_input_fingerprint, closingChild.dependency_fingerprint, `${context} must bind the exact A0 input fingerprint`);
  assert.equal(fields.bound_a0_cost_model_input_fingerprint, a0Child.cost_model_input_fingerprint, `${context} must bind the actual A0 input fingerprint`);
  assertStrictAsiaTokyoCalendarTimestamp(fields.observed_at, `${context} observed_at`);
  const [windowStart, windowEnd] = fields.time_window.split("/");
  assertStrictAsiaTokyoCalendarTimestamp(windowStart, `${context} window start`);
  assertStrictAsiaTokyoCalendarTimestamp(windowEnd, `${context} window end`);
  assertObservationWithinApprovedWindow(fields.observed_at, fields.time_window);
  assert.ok(["exact", "unconfirmed", "mismatched"].includes(fields.target_match), `${context} target_match must be closed`);
  assert.ok(["available", "unavailable", "unconfirmed"].includes(fields.source_document_available), `${context} source availability must be closed`);
  assert.ok(["available", "unavailable", "unconfirmed"].includes(fields.direct_account_specific_base_processing_fee_available), `${context} base-fee availability must be closed`);
  assert.ok(["standard", "custom", "unknown"].includes(fields.standard_custom_applicability), `${context} pricing applicability must be closed`);
  assert.ok(["complete", "incomplete", "unknown"].includes(fields.full_cost_model_completeness), `${context} cost-model completeness must be closed`);
  assert.ok(["available", "unavailable", "unconfirmed"].includes(fields.sanitized_exact_cost_classification), `${context} exact-cost classification must be closed`);
  assert.match(fields.account_specific_pricing_terms_fingerprint, sanitizedFingerprintPattern, `${context} requires a deterministic sanitized terms fingerprint`);
  assert.ok(["complete", "incomplete", "unknown"].includes(fields.account_specific_pricing_terms_coverage), `${context} terms coverage must be a closed classification`);
  assert.ok(["yes", "no", "unknown"].includes(fields.private_exposure_detected), `${context} private exposure must be a closed sanitized classification`);
  assert.ok(["yes", "no", "unknown"].includes(fields.incremental_charge_required), `${context} incremental charge requirement must be a closed sanitized classification`);
  const coverageFields = ["base_processing_fee_coverage", "fixed_and_variable_components_coverage", "refunds_disputes_chargebacks_coverage", "international_currency_conversion_coverage", "tax_and_other_account_specific_fee_coverage", "effective_scope_coverage"];
  for (const field of coverageFields) assert.ok(["complete", "not-applicable", "incomplete", "unknown"].includes(fields[field]), `${context} ${field} must be a closed coverage classification`);
  assert.equal(fields.raw_document_contract_text_url_account_identifier_private_identifier_retained_or_shared, "no", `${context} must retain no raw or private material`);
  assert.equal(fields.payment_refund_client_or_event_settings_api_export_action, "none", `${context} must record no Stripe side effect`);
  assert.equal(fields.credential_creation_retrieval_disclosure, "none", `${context} must record no credential action`);
  assert.equal(fields.codex_browser_or_stripe_control, "none", `${context} must give Codex no browser or Stripe control`);
  assert.equal(fields.public_pricing_substitution, "no", `${context} must not substitute public pricing`);
  assert.equal(fields.incremental_charge, "no", `${context} must record no incremental charge`);
  const coverageComplete = fields.base_processing_fee_coverage === "complete"
    && fields.fixed_and_variable_components_coverage === "complete"
    && fields.effective_scope_coverage === "complete"
    && [fields.refunds_disputes_chargebacks_coverage, fields.international_currency_conversion_coverage, fields.tax_and_other_account_specific_fee_coverage].every((value) => ["complete", "not-applicable"].includes(value));
  const complete = fields.target_match === "exact"
    && fields.source_document_available === "available"
    && fields.direct_account_specific_base_processing_fee_available === "available"
    && ["standard", "custom"].includes(fields.standard_custom_applicability)
    && fields.full_cost_model_completeness === "complete"
    && fields.sanitized_exact_cost_classification === "available"
    && fields.account_specific_pricing_terms_coverage === "complete"
    && fields.private_exposure_detected === "no"
    && fields.incremental_charge_required === "no"
    && coverageComplete;
  if (fields.result_status === "complete") {
    assert.equal(complete, true, `${context} complete status requires every exact applicability and completeness signal`);
    assert.equal(fields.record_status, "approved-completed-authenticated-private-read", `${context} complete status requires the completed record status`);
    assert.equal(fields.stop_result, "none-complete", `${context} complete status requires the exact no-stop result`);
    assert.equal(fields.row_closure, "EVID-STRIPE-COST", `${context} complete status closes only EVID-STRIPE-COST`);
  } else {
    assert.equal(fields.result_status, "partial-stop", `${context} result_status must be complete or partial-stop`);
    assert.equal(complete, false, `${context} partial-stop must retain at least one incomplete signal`);
    assert.equal(fields.record_status, "approved-partial-stop-authenticated-private-read", `${context} partial-stop requires the partial-stop record status`);
    assertA3SafePartialStopAliases(fields.stop_result, context);
    assert.equal(fields.stop_result, deriveA3CanonicalPartialStopResult(fields), `${context} partial-stop requires the exact canonical truthful stop result`);
    assert.equal(fields.row_closure, "none", `${context} partial-stop closes no row`);
  }
  if (requireComplete) assert.equal(fields.result_status, "complete", "A3 satisfied state requires a complete observed result record");
  if (requirePartialStop) {
    const lifecycle = partialStopLifecycle ? "A3 partial-stop lifecycle" : "A3 complete-not-closure-eligible state";
    assert.equal(fields.result_status, "partial-stop", `${lifecycle} requires a nonclosing partial-stop observed result`);
    assert.equal(fields.row_closure, "none", `${lifecycle} must retain row_closure=none`);
  }
  assert.equal(fields.a3_result_fingerprint, closingChild.result_fingerprint, `${context} must bind the exact A3 result fingerprint`);
  const observedRecordFingerprint = deriveA3ObservedRecordFingerprint(fields);
  assert.equal(fields.observed_record_fingerprint, observedRecordFingerprint, `${context} observed-record fingerprint must be deterministically derived`);
  assert.equal(closingChild.observed_record_fingerprint, observedRecordFingerprint, `${context} must bind the closing child to the observed record`);
  if (fields.result_status === "complete") {
    assert.equal(closingChild.source_timestamp, fields.observed_at, `${context} observed_at must bind the A3 source timestamp`);
    assert.equal(closingChild.sanitized_exact_cost, "sanitized-exact-cost-classified", `${context} complete result requires the sanitized exact-cost classification`);
    assert.equal(closingChild.applicability, "applicable", `${context} complete result requires applicable classification`);
  }
  return fields;
}

function deriveA4ArtifactFingerprint(fields, approvalFingerprint, a2ResultFingerprint, a3ResultFingerprint, judgmentRecordFingerprint) {
  return deriveSanitizedFingerprint("a4-product-price-artifact", [
    ["approval_fingerprint", approvalFingerprint],
    ["a2_result_fingerprint", a2ResultFingerprint],
    ["a3_result_fingerprint", a3ResultFingerprint],
    ["dependency_fingerprint_composite", `a2=${a2ResultFingerprint};a3=${a3ResultFingerprint}`],
    ["judgment_record_fingerprint", judgmentRecordFingerprint],
    ["judgment_output", fields.judgment_output],
    ["judgment_effective_date", fields.judgment_effective_date]
  ]);
}

function deriveA4JudgmentRecordFingerprint(fields) {
  return deriveSanitizedFingerprint(
    "a4-product-price-owner-judgment-result",
    a4ProductPriceJudgmentResultRecordFields
      .filter((field) => !["a4_result_fingerprint", "judgment_record_fingerprint"].includes(field))
      .map((field) => [field, fields[field]])
  );
}

function validateA4ProductPriceJudgmentResultRecord(record, closingChild, a2Record, a3Record, a2ClosingChild, a3ClosingChild, a3OwnerApprovalRecord, a0Child, { requireComplete = false } = {}) {
  const fields = record?.fields ?? record;
  const context = "A4 Product/Price owner-judgment result";
  assert.ok(fields && typeof fields === "object", `${context} requires parsed fields`);
  assert.deepEqual(Object.keys(fields).sort(), [...a4ProductPriceJudgmentResultRecordFields].sort(), `${context} requires the exact closed schema`);
  for (const [field, value] of Object.entries(fields)) {
    assert.match(value, /^[A-Za-z0-9:;=._-]+$/, `${context} ${field} must retain a sanitized alias only`);
  }
  assert.equal(fields.record_status, "approved-completed-release-owner-judgment", `${context} requires an approved completed release-owner judgment`);
  assert.equal(fields.record_type, "product-price-release-owner-judgment-result", `${context} requires the exact result type`);
  assert.equal(fields.evidence_id, "EVID-PRODUCT-PRICE", `${context} closes only EVID-PRODUCT-PRICE`);
  assert.equal(fields.child_id, "A4-product-price-judgment", `${context} must bind the A4 child`);
  assert.match(fields.judgment_record_id, /^NC-R1-A4-JUDGMENT-[A-Za-z0-9-]+$/, `${context} requires a unique sanitized judgment_record_id`);
  assert.equal(closingChild.child_status, "satisfied", `${context} requires a satisfied A4 child`);
  assert.equal(closingChild.canonical_child_approval_unit, "release-owner-judgment", `${context} requires release-owner authority`);
  for (const field of ["approval_id", "approval_fingerprint", "exact_target_or_scope", "required_approver", "effective_date", "evidence_retention_location", "stop_owner", "rollback_owner"]) {
    assert.equal(fields[field], closingChild[field], `${context} ${field} must exactly match the approved A4 child`);
  }
  assert.equal(fields.required_approver, "kurodev", `${context} requires approved Kurodev release-owner authority`);
  assert.equal(fields.decision_owner, "kurodev", `${context} requires Kurodev as decision owner`);
  assert.equal(fields.stop_owner, "kurodev", `${context} requires Kurodev stop ownership`);
  assert.equal(fields.rollback_owner, "kurodev", `${context} requires Kurodev rollback ownership`);
  assert.equal(fields.approval_decision, "approved", `${context} requires approval_decision=approved`);
  assert.equal(fields.product_scope_disposition, "approved-exact-scope", `${context} requires approved exact product scope`);
  assert.equal(fields.price_posture_disposition, "approved-exact-posture", `${context} requires approved exact price posture`);
  assert.equal(fields.exclusions_bound, "yes", `${context} requires exclusions_bound=yes`);
  assert.equal(fields.material_change_revalidation, "required", `${context} requires material-change revalidation`);
  assert.equal(fields.legal_tax_copy_risk_deploy_live_go_activation_publication_authorization, "none", `${context} must not authorize legal/tax/copy/risk/deploy/live/GO/activation/publication`);
  assert.equal(fields.judgment_output, "approved", `${context} requires approved judgment output`);
  assert.equal(fields.row_closure, "EVID-PRODUCT-PRICE-only", `${context} must close EVID-PRODUCT-PRICE only`);
  assertJudgmentEffectiveDateBinding(closingChild);
  assert.equal(fields.effective_date, closingChild.judgment_effective_date, `${context} effective date must bind the exact final A4 judgment date`);
  const a2Fields = a2Record?.fields ?? a2Record;
  const a3Fields = a3Record?.fields ?? a3Record;
  assert.ok(a2Fields && a3Fields, `${context} requires separate parsed A2/A3 prerequisite records`);
  validateA2ProviderCostObservedResultRecord(a2Fields, a2ClosingChild, { requireComplete: true });
  validateA3StripeObservedResultRecord(a3Fields, a3ClosingChild, a3OwnerApprovalRecord, a0Child, { requireComplete: true });
  assert.equal(fields.bound_a2_result_fingerprint, a2Fields.a2_result_fingerprint, `${context} must bind the actual A2 result fingerprint`);
  assert.equal(fields.bound_a3_result_fingerprint, a3Fields.a3_result_fingerprint, `${context} must bind the actual A3 result fingerprint`);
  assert.equal(fields.dependency_fingerprint_composite, `a2=${a2Fields.a2_result_fingerprint};a3=${a3Fields.a3_result_fingerprint}`, `${context} must bind the exact A2/A3 composite`);
  assert.equal(fields.a4_result_fingerprint, closingChild.bound_artifact_fingerprint, `${context} must bind the exact final A4 result fingerprint`);
  assert.equal(fields.judgment_record_fingerprint, deriveA4JudgmentRecordFingerprint(fields), `${context} judgment_record_fingerprint must be deterministic`);
  if (requireComplete) assert.equal(fields.record_status, "approved-completed-release-owner-judgment", `${context} satisfied state requires an approved completed record`);
  return fields;
}

function deriveA5ArtifactFingerprint(fields, approvalFingerprint, a4ArtifactFingerprint, judgmentRecordFingerprint) {
  return deriveSanitizedFingerprint("a5-legal-artifact", [
    ["approval_fingerprint", approvalFingerprint],
    ["a4_artifact_fingerprint", a4ArtifactFingerprint],
    ["judgment_record_fingerprint", judgmentRecordFingerprint],
    ["judgment_output", fields.judgment_output],
    ["judgment_effective_date", fields.judgment_effective_date]
  ]);
}

function deriveA5LegalJudgmentRecordFingerprint(fields) {
  return deriveSanitizedFingerprint(
    "a5-legal-tax-owner-judgment-result",
    a5LegalJudgmentResultRecordFields
      .filter((field) => !["a5_result_fingerprint", "judgment_record_fingerprint"].includes(field))
      .map((field) => [field, fields[field]])
  );
}

function validateA5LegalJudgmentResultRecord(record, closingChild, a4Record, a4ClosingChild, { requireComplete = false } = {}) {
  const fields = record?.fields ?? record;
  const context = "A5 Legal/Tax owner-judgment result";
  assert.ok(fields && typeof fields === "object", `${context} requires parsed fields`);
  assert.deepEqual(Object.keys(fields).sort(), [...a5LegalJudgmentResultRecordFields].sort(), `${context} requires the exact closed schema`);
  for (const [field, value] of Object.entries(fields)) assert.match(value, /^[A-Za-z0-9:;=._-]+$/, `${context} ${field} must retain a sanitized alias only`);
  assert.equal(fields.record_status, "approved-completed-release-owner-judgment", `${context} requires an approved completed release-owner judgment`);
  assert.equal(fields.record_type, "legal-tax-release-owner-judgment-result", `${context} requires the exact result type`);
  assert.equal(fields.evidence_id, "EVID-LEGAL", `${context} closes only EVID-LEGAL`);
  assert.equal(fields.child_id, "A5-legal-judgment", `${context} must bind the A5 child`);
  assert.match(fields.judgment_record_id, /^NC-R1-A5-JUDGMENT-[A-Za-z0-9-]+$/, `${context} requires a unique sanitized judgment_record_id`);
  assert.ok(["satisfied", "complete-not-closure-eligible"].includes(closingChild.child_status), `${context} requires a terminal A5 result state`);
  assert.equal(closingChild.canonical_child_approval_unit, "release-owner-judgment", `${context} requires release-owner authority`);
  for (const field of ["approval_id", "approval_fingerprint", "exact_target_or_scope", "required_approver", "effective_date", "evidence_retention_location", "stop_owner", "rollback_owner"]) {
    assert.equal(fields[field], closingChild[field], `${context} ${field} must exactly match the approved A5 child`);
  }
  assert.equal(fields.required_approver, "kurodev", `${context} requires approved Kurodev release-owner authority`);
  assert.equal(fields.decision_owner, "kurodev", `${context} requires Kurodev as decision owner`);
  assert.equal(fields.stop_owner, "kurodev", `${context} requires Kurodev stop ownership`);
  assert.equal(fields.rollback_owner, "kurodev", `${context} requires Kurodev rollback ownership`);
  assert.equal(fields.approval_decision, "approved", `${context} requires approval_decision=approved`);
  if (closingChild.child_status === "satisfied") {
    assert.equal(fields.legal_scope_disposition, "approved-exact-scope", `${context} requires approved exact legal scope`);
    assert.equal(fields.legal_tax_posture_disposition, "approved-exact-posture", `${context} requires approved exact legal/tax posture`);
    assert.equal(fields.judgment_output, "approved", `${context} requires approved judgment output`);
    assert.equal(fields.row_closure, "EVID-LEGAL-only", `${context} must close EVID-LEGAL only`);
  } else {
    assert.equal(fields.legal_scope_disposition, "reviewed-exact-scope", `${context} non-closing result requires reviewed exact legal scope`);
    assert.equal(fields.legal_tax_posture_disposition, "rejected-exact-posture", `${context} non-closing result requires rejected exact legal/tax posture`);
    assert.equal(fields.judgment_output, "rejected", `${context} non-closing result requires rejected judgment output`);
    assert.equal(fields.row_closure, "none", `${context} complete-not-closure-eligible result closes no row`);
  }
  assert.equal(fields.exclusions_bound, "yes", `${context} requires exclusions_bound=yes`);
  assert.equal(fields.material_change_revalidation, "required", `${context} requires material-change revalidation`);
  assert.equal(fields.copy_risk_deploy_live_go_activation_publication_authorization, "none", `${context} must not authorize copy/risk/deploy/live/GO/activation/publication`);
  assertJudgmentEffectiveDateBinding(closingChild);
  assert.equal(fields.effective_date, closingChild.judgment_effective_date, `${context} effective date must bind the exact final A5 judgment date`);
  const a4Fields = a4Record?.fields ?? a4Record;
  assert.ok(a4Fields, `${context} requires a separate parsed A4 owner-judgment result record`);
  assert.equal(a4ClosingChild?.child_status, "satisfied", `${context} requires a satisfied independent A4 child`);
  assert.equal(a4Fields.record_status, "approved-completed-release-owner-judgment", `${context} requires an approved completed independent A4 record`);
  assert.equal(a4Fields.record_type, "product-price-release-owner-judgment-result", `${context} requires the exact independent A4 result type`);
  assert.equal(a4Fields.evidence_id, "EVID-PRODUCT-PRICE", `${context} requires the independent A4 Product/Price evidence record`);
  assert.equal(a4Fields.child_id, "A4-product-price-judgment", `${context} requires the independent A4 child record`);
  assert.equal(a4Fields.a4_result_fingerprint, a4ClosingChild.bound_artifact_fingerprint, `${context} requires the actual independent A4 artifact`);
  assert.equal(closingChild.bound_input, a4Fields.a4_result_fingerprint, `${context} bound_input must exactly equal the actual A4 artifact`);
  assert.equal(fields.bound_a4_artifact_fingerprint, a4Fields.a4_result_fingerprint, `${context} must bind the actual A4 artifact fingerprint`);
  assert.equal(fields.a5_result_fingerprint, closingChild.bound_artifact_fingerprint, `${context} must bind the exact final A5 result fingerprint`);
  assert.equal(fields.judgment_record_fingerprint, deriveA5LegalJudgmentRecordFingerprint(fields), `${context} judgment_record_fingerprint must be deterministic`);
  if (requireComplete) assert.equal(closingChild.child_status, "satisfied", `${context} consuming child requires a satisfied A5 result`);
  return fields;
}

function deriveA6ArtifactFingerprint(fields, approvalFingerprint, a4ArtifactFingerprint, a5ArtifactFingerprint, judgmentRecordFingerprint) {
  return deriveSanitizedFingerprint("a6-copy-artifact", [
    ["approval_fingerprint", approvalFingerprint],
    ["a4_artifact_fingerprint", a4ArtifactFingerprint],
    ["a5_artifact_fingerprint", a5ArtifactFingerprint],
    ["judgment_record_fingerprint", judgmentRecordFingerprint],
    ["judgment_output", fields.judgment_output],
    ["judgment_effective_date", fields.judgment_effective_date]
  ]);
}

function deriveA6CopyJudgmentRecordFingerprint(fields) {
  return deriveSanitizedFingerprint(
    "a6-copy-release-owner-judgment-result",
    a6CopyJudgmentResultRecordFields
      .filter((field) => !["a6_result_fingerprint", "judgment_record_fingerprint"].includes(field))
      .map((field) => [field, fields[field]])
  );
}

function validateA6CopyJudgmentResultRecord(record, closingChild, a4Record, a5Record, a4ClosingChild, a5ClosingChild, { requireComplete = false } = {}) {
  const fields = record?.fields ?? record;
  const context = "A6 Copy owner-judgment result";
  assert.ok(fields && typeof fields === "object", `${context} requires parsed fields`);
  assert.deepEqual(Object.keys(fields).sort(), [...a6CopyJudgmentResultRecordFields].sort(), `${context} requires the exact closed schema`);
  for (const [field, value] of Object.entries(fields)) assert.match(value, /^[A-Za-z0-9:;=._-]+$/, `${context} ${field} must retain a sanitized alias only`);
  assert.equal(fields.record_status, "approved-completed-release-owner-judgment", `${context} requires an approved completed release-owner judgment`);
  assert.equal(fields.record_type, "copy-release-owner-judgment-result", `${context} requires the exact result type`);
  assert.equal(fields.evidence_id, "EVID-COPY", `${context} closes only EVID-COPY`);
  assert.equal(fields.child_id, "A6-copy-judgment", `${context} must bind the A6 child`);
  assert.match(fields.judgment_record_id, /^NC-R1-A6-JUDGMENT-[A-Za-z0-9-]+$/, `${context} requires a unique sanitized judgment_record_id`);
  assert.ok(["satisfied", "complete-not-closure-eligible"].includes(closingChild.child_status), `${context} requires a terminal A6 result state`);
  assert.equal(closingChild.canonical_child_approval_unit, "release-owner-judgment", `${context} requires release-owner authority`);
  for (const field of ["approval_id", "approval_fingerprint", "exact_target_or_scope", "required_approver", "effective_date", "evidence_retention_location", "stop_owner", "rollback_owner"]) {
    assert.equal(fields[field], closingChild[field], `${context} ${field} must exactly match the approved A6 child`);
  }
  assert.equal(fields.required_approver, "kurodev", `${context} requires approved Kurodev release-owner authority`);
  assert.equal(fields.decision_owner, "kurodev", `${context} requires Kurodev as decision owner`);
  assert.equal(fields.stop_owner, "kurodev", `${context} requires Kurodev stop ownership`);
  assert.equal(fields.rollback_owner, "kurodev", `${context} requires Kurodev rollback ownership`);
  assert.equal(fields.approval_decision, "approved", `${context} requires approval_decision=approved`);
  assert.equal(fields.copy_artifact_identifier_or_content_fingerprint, closingChild.exact_target_or_scope, `${context} copy artifact identifier or content fingerprint must exactly match the approved A6 scope`);
  const a4Fields = a4Record?.fields ?? a4Record;
  const a5Fields = a5Record?.fields ?? a5Record;
  assert.ok(a4Fields && a5Fields, `${context} requires separate parsed A4 Product/Price and A5 Legal/Tax owner-judgment result records`);
  assert.equal(a4ClosingChild?.child_status, "satisfied", `${context} requires a satisfied independent A4 child`);
  assert.equal(a5ClosingChild?.child_status, "satisfied", `${context} requires a satisfied independent A5 child`);
  assert.equal(a4Fields.a4_result_fingerprint, a4ClosingChild.bound_artifact_fingerprint, `${context} requires the actual independent A4 artifact`);
  assert.equal(a5Fields.a5_result_fingerprint, a5ClosingChild.bound_artifact_fingerprint, `${context} requires the actual independent A5 artifact`);
  assert.equal(closingChild.bound_input, `copy=${fields.copy_artifact_identifier_or_content_fingerprint};a4=${a4Fields.a4_result_fingerprint};a5=${a5Fields.a5_result_fingerprint}`, `${context} bound_input must exactly equal the actual copy/A4/A5 composite`);
  assert.equal(fields.bound_a4_artifact_fingerprint, a4Fields.a4_result_fingerprint, `${context} must bind the actual A4 artifact fingerprint`);
  assert.equal(fields.bound_a5_artifact_fingerprint, a5Fields.a5_result_fingerprint, `${context} must bind the actual A5 artifact fingerprint`);
  assert.equal(fields.dependency_fingerprint_composite, `copy=${fields.copy_artifact_identifier_or_content_fingerprint};a4=${a4Fields.a4_result_fingerprint};a5=${a5Fields.a5_result_fingerprint}`, `${context} must bind the exact copy/A4/A5 composite`);
  if (closingChild.child_status === "satisfied") {
    assert.equal(fields.copy_scope_disposition, "approved-exact-scope", `${context} requires approved exact copy scope`);
    assert.equal(fields.copy_posture_disposition, "approved-exact-posture", `${context} requires approved exact copy posture`);
    assert.equal(fields.judgment_output, "approved", `${context} requires approved judgment output`);
    assert.equal(fields.row_closure, "EVID-COPY-only", `${context} must close EVID-COPY only`);
  } else {
    assert.equal(fields.copy_scope_disposition, "reviewed-exact-scope", `${context} non-closing result requires reviewed exact copy scope`);
    assert.equal(fields.copy_posture_disposition, "rejected-exact-posture", `${context} non-closing result requires rejected exact copy posture`);
    assert.equal(fields.judgment_output, "rejected", `${context} non-closing result requires rejected judgment output`);
    assert.equal(fields.row_closure, "none", `${context} complete-not-closure-eligible result closes no row`);
  }
  assert.equal(fields.exclusions_bound, "yes", `${context} requires exclusions_bound=yes`);
  assert.equal(fields.material_change_revalidation, "required", `${context} requires material-change revalidation`);
  assert.equal(fields.publication_public_paid_gate_risk_deploy_live_go_activation_external_action_authorization, "none", `${context} must not authorize publication/public Paid/gate/risk/deploy/live/GO/activation/external action`);
  assertJudgmentEffectiveDateBinding(closingChild);
  assert.equal(fields.effective_date, closingChild.judgment_effective_date, `${context} effective date must bind the exact final A6 judgment date`);
  assert.equal(fields.a6_result_fingerprint, closingChild.bound_artifact_fingerprint, `${context} must bind the exact final A6 result fingerprint`);
  assert.equal(fields.judgment_record_fingerprint, deriveA6CopyJudgmentRecordFingerprint(fields), `${context} judgment_record_fingerprint must be deterministic`);
  if (requireComplete) assert.equal(closingChild.child_status, "satisfied", `${context} consuming child requires a satisfied A6 result`);
  return fields;
}

function deriveExternalPrerequisiteFingerprint(fields, approvalFingerprint, externalResultRecordFingerprint) {
  return deriveSanitizedFingerprint("b1-external-prerequisite-result", [
    ["approval_fingerprint", approvalFingerprint],
    ["external_result_record_fingerprint", externalResultRecordFingerprint ?? fields.external_result_record_fingerprint]
  ]);
}

function deriveB1DeployedFingerprint(fields, approvalFingerprint, upstreamFingerprints) {
  return deriveSanitizedFingerprint("b1-deployed-target-result", [
    ["approval_fingerprint", approvalFingerprint],
    ["a1_result_fingerprint", upstreamFingerprints.a1],
    ["a4_artifact_fingerprint", upstreamFingerprints.a4],
    ["a5_artifact_fingerprint", upstreamFingerprints.a5],
    ["a6_artifact_fingerprint", upstreamFingerprints.a6],
    ["external_prerequisite_fingerprint", upstreamFingerprints.external],
    ["proof_record_fingerprint", upstreamFingerprints.proofRecord ?? fields.proof_record_fingerprint]
  ]);
}

function deriveSignedEvidenceFingerprint(fields) {
  return deriveSanitizedFingerprint("b2-signed-evidence", [
    ["evidence_record_id", fields.evidence_record_id],
    ["evidence_record_type", fields.evidence_record_type],
    ["source", fields.source],
    ["classification", fields.classification],
    ["authority", fields.authority],
    ["source_timestamp", fields.source_timestamp]
  ]);
}

function deriveB2ResultFingerprint(fields, approvalFingerprint, b1DeployedFingerprint, signedEvidenceFingerprint, aggregateRecordFingerprint) {
  const boundAggregateRecordFingerprint = aggregateRecordFingerprint ?? fields.b2_aggregate_record_fingerprint ?? "N/A";
  return deriveSanitizedFingerprint("b2-live-flow-result", [
    ["approval_fingerprint", approvalFingerprint],
    ["b2_execution_id", fields.b2_execution_id],
    ["target_scope_alias", fields.target_scope_alias],
    ["time_window", fields.time_window],
    ["b1_deployed_fingerprint", b1DeployedFingerprint],
    ["signed_evidence_fingerprint", signedEvidenceFingerprint],
    ["b2_aggregate_record_fingerprint", boundAggregateRecordFingerprint]
  ]);
}

function assertParsedFingerprintGraph(closingChildId, childRecordById, signedEvidenceById, a4JudgmentRecordByChildId = new Map(), a5LegalJudgmentRecordByChildId = new Map(), a6CopyJudgmentRecordByChildId = new Map(), b1ProofRecordById = new Map(), b1ExternalPrerequisiteResultRecordById = new Map(), b2AggregateLiveOperationResultRecordByFingerprint = new Map(), a2FundingDispositionRecordByFingerprint = new Map(), a2FundingDispositionOwnerApprovalByFingerprint = new Map(), a3ManualReadOwnerApprovalByFingerprint = new Map()) {
  const fieldsFor = (childId) => {
    const record = childRecordById.get(childId);
    const fields = record?.fields ?? record;
    assert.ok(fields && typeof fields === "object", `${closingChildId} requires parsed ${childId} fingerprint evidence`);
    assert.equal(fields.child_id, childId, `${closingChildId} requires the exact parsed ${childId} record`);
    return fields;
  };
  const a0 = () => {
    const fields = fieldsFor("A0-provisional-cost-model-input");
    const approvalFingerprint = assertDerivedApprovalFingerprint(fields, "A0 parsed cost-model result");
    const input = assertDerivedSanitizedFingerprint(
      fields,
      "cost_model_input_fingerprint",
      "a0-cost-model-input",
      [
        ["approval_fingerprint", approvalFingerprint],
        ["bound_input", fields.bound_input],
        ["effective_date", fields.effective_date],
        ["required_approver", fields.required_approver],
        ["judgment_output", fields.judgment_output],
        ["cost_model_decision", fields.cost_model_decision]
      ],
      "A0 parsed cost-model result"
    );
    const result = assertDerivedSanitizedFingerprint(
      fields,
      "cost_model_result_fingerprint",
      "a0-cost-model-result",
      [
        ["cost_model_input_fingerprint", input],
        ["cost_model_decision", fields.cost_model_decision],
        ["judgment_output", fields.judgment_output],
        ["judgment_effective_date", fields.judgment_effective_date]
      ],
      "A0 parsed cost-model result"
    );
    const artifact = assertDerivedSanitizedFingerprint(
      fields,
      "bound_artifact_fingerprint",
      "a0-bound-artifact",
      [
        ["cost_model_input_fingerprint", input],
        ["cost_model_result_fingerprint", result],
        ["judgment_output", fields.judgment_output],
        ["judgment_effective_date", fields.judgment_effective_date]
      ],
      "A0 parsed cost-model result"
    );
    return {
      input,
      result,
      artifact
    };
  };
  const a1SourceDisposition = () => {
    const fields = fieldsFor("A1-worker-cpu-source-disposition");
    const approvalFingerprint = assertDerivedApprovalFingerprint(fields, "A1 parsed source-disposition result");
    return assertDerivedSanitizedFingerprint(
      fields,
      "result_fingerprint",
      "a1-source-disposition",
      [["approval_fingerprint", approvalFingerprint], ["source_disposition_outcome", fields.source_disposition_outcome]],
      "A1 parsed source-disposition result"
    );
  };
  const a1 = () => {
    const sourceDispositionFingerprint = a1SourceDisposition();
    const fields = fieldsFor("A1-worker-cpu-evidence-read");
    const approvalFingerprint = assertDerivedApprovalFingerprint(fields, "A1 parsed evidence result");
    assertExactParsedFingerprintBinding(fields, "source_disposition_fingerprint", sourceDispositionFingerprint, "A1 parsed evidence result");
    return assertDerivedSanitizedFingerprint(
      fields,
      "result_fingerprint",
      "a1-worker-cpu-result",
      [
        ["approval_fingerprint", approvalFingerprint],
        ["source_disposition_fingerprint", sourceDispositionFingerprint],
        ["aggregation_complete", fields.aggregation_complete],
        ["request_completeness", fields.request_completeness],
        ["headroom_disposition", fields.headroom_disposition],
        ["source_timestamp", fields.source_timestamp],
        ["observed_record_fingerprint", fields.observed_record_fingerprint]
      ],
      "A1 parsed evidence result"
    );
  };
  const funding = () => {
    const upstream = a0();
    const fields = fieldsFor("A2-provider-funding-external-prerequisite-reference");
    const dispositionFingerprint = assertSanitizedParsedFingerprint(fields, "funding_disposition_record_fingerprint", "A2 parsed funding prerequisite result");
    const dispositionRecord = a2FundingDispositionRecordByFingerprint.get(dispositionFingerprint);
    assert.ok(dispositionRecord, "A2 parsed funding prerequisite result requires a separate parsed funding disposition record");
    const ownerApprovalFingerprint = assertSanitizedParsedFingerprint(fields, "funding_owner_approval_record_fingerprint", "A2 parsed funding prerequisite result");
    const ownerApprovalRecord = a2FundingDispositionOwnerApprovalByFingerprint.get(ownerApprovalFingerprint);
    assert.ok(ownerApprovalRecord, "A2 parsed funding prerequisite result requires a separately parsed owner approval record");
    validateA2FundingRequirementDispositionResultRecord(dispositionRecord, fields, ownerApprovalRecord, fieldsFor("A0-provisional-cost-model-input"));
    const entries = [
      ["a0_cost_model_input_fingerprint", upstream.input],
      ["funding_owner_approval_record_fingerprint", ownerApprovalFingerprint],
      ["funding_disposition_record_fingerprint", dispositionFingerprint],
      ["funding_requirement_state", fields.funding_requirement_state]
    ];
    if (fields.funding_requirement_state === "needed-absent") entries.push(["funding_external_result_fingerprint", fields.funding_external_result_fingerprint]);
    return assertDerivedSanitizedFingerprint(fields, "funding_prerequisite_fingerprint", "a2-funding-prerequisite", entries, "A2 parsed funding prerequisite result");
  };
  const a2 = () => {
    const upstream = a0();
    const fields = fieldsFor("A2-provider-cost-evidence-read");
    const approvalFingerprint = assertDerivedApprovalFingerprint(fields, "A2 parsed cost result");
    const fundingFingerprint = funding();
    assertExactParsedFingerprintBinding(fields, "dependency_fingerprint", upstream.input, "A2 parsed cost result");
    assertExactParsedFingerprintBinding(fields, "funding_prerequisite_fingerprint", fundingFingerprint, "A2 parsed cost result");
    const result = assertDerivedSanitizedFingerprint(
      fields,
      "result_fingerprint",
      "a2-provider-cost-result",
      [
        ["approval_fingerprint", approvalFingerprint],
        ["dependency_fingerprint", upstream.input],
        ["funding_prerequisite_fingerprint", fundingFingerprint],
        ["sanitized_exact_cost", fields.sanitized_exact_cost],
        ["applicability", fields.applicability],
        ["source_timestamp", fields.source_timestamp],
        ["observed_record_fingerprint", fields.observed_record_fingerprint]
      ],
      "A2 parsed cost result"
    );
    assertExactParsedFingerprintBinding(fields, "cost_model_fingerprint", result, "A2 parsed cost result");
    return result;
  };
  const a3 = () => {
    const upstream = a0();
    const fields = fieldsFor("A3-stripe-source-applicability-read-or-judgment");
    const approvalFingerprint = assertDerivedApprovalFingerprint(fields, "A3 parsed Stripe result");
    assertExactParsedFingerprintBinding(fields, "dependency_fingerprint", upstream.input, "A3 parsed Stripe result");
    const ownerApprovalRecordFingerprint = assertSanitizedParsedFingerprint(fields, "owner_approval_record_fingerprint", "A3 parsed Stripe result");
    const ownerApprovalRecord = a3ManualReadOwnerApprovalByFingerprint.get(ownerApprovalRecordFingerprint);
    assert.ok(ownerApprovalRecord, "A3 parsed Stripe result requires an independent owner approval record");
    validateA3ManualReadOwnerApprovalRecord(ownerApprovalRecord, fields, fieldsFor("A0-provisional-cost-model-input"));
    const entries = [["approval_fingerprint", approvalFingerprint], ["dependency_fingerprint", upstream.input], ["owner_approval_record_fingerprint", ownerApprovalRecordFingerprint], ["selected_mode", fields.selected_mode]];
    if (fields.selected_mode === "read") {
      entries.push(["sanitized_exact_cost", fields.sanitized_exact_cost], ["applicability", fields.applicability], ["source_timestamp", fields.source_timestamp], ["observed_record_fingerprint", fields.observed_record_fingerprint]);
    } else if (fields.selected_mode === "judgment") {
      entries.push(["judgment_output", fields.judgment_output], ["bound_input", fields.bound_input], ["judgment_effective_date", fields.judgment_effective_date]);
    } else assert.fail("A3 parsed Stripe result requires exactly one read or judgment mode");
    const result = assertDerivedSanitizedFingerprint(fields, "result_fingerprint", "a3-stripe-result", entries, "A3 parsed Stripe result");
    if (fields.selected_mode === "read") assertExactParsedFingerprintBinding(fields, "cost_model_fingerprint", result, "A3 parsed Stripe read result");
    else assertExactParsedFingerprintBinding(fields, "bound_artifact_fingerprint", result, "A3 parsed Stripe judgment result");
    return result;
  };
  const a4 = () => {
    const a2Result = a2();
    const a3Result = a3();
    const fields = fieldsFor("A4-product-price-judgment");
    const approvalFingerprint = assertDerivedApprovalFingerprint(fields, "A4 parsed product-price result");
    assertExactParsedFingerprintBinding(fields, "a2_result_fingerprint", a2Result, "A4 parsed product-price result");
    assertExactParsedFingerprintBinding(fields, "a3_result_fingerprint", a3Result, "A4 parsed product-price result");
    assert.equal(assertRequiredParsedTextField(fields, "dependency_fingerprint_composite", "A4 parsed product-price result"), `a2=${a2Result};a3=${a3Result}`, "A4 parsed product-price result requires the exact composite of its actual A2 and A3 result fingerprints");
    if (closingChildId === "A4-product-price-judgment" && fields.child_status !== "satisfied") return undefined;
    const judgmentRecord = a4JudgmentRecordByChildId.get("A4-product-price-judgment");
    const judgmentRecordFields = judgmentRecord?.fields ?? judgmentRecord;
    assert.ok(judgmentRecordFields, `${closingChildId} requires a separate parsed A4 owner-judgment result record`);
    const judgmentRecordFingerprint = assertSanitizedParsedFingerprint(judgmentRecordFields, "judgment_record_fingerprint", "A4 parsed product-price result");
    assertExactParsedFingerprintBinding(fields, "judgment_record_fingerprint", judgmentRecordFingerprint, "A4 parsed product-price result");
    return assertDerivedSanitizedFingerprint(
      fields,
      "bound_artifact_fingerprint",
      "a4-product-price-artifact",
      [
        ["approval_fingerprint", approvalFingerprint],
        ["a2_result_fingerprint", a2Result],
        ["a3_result_fingerprint", a3Result],
        ["dependency_fingerprint_composite", `a2=${a2Result};a3=${a3Result}`],
        ["judgment_record_fingerprint", judgmentRecordFingerprint],
        ["judgment_output", fields.judgment_output],
        ["judgment_effective_date", fields.judgment_effective_date]
      ],
      "A4 parsed product-price result"
    );
  };
  const a5 = () => {
    const a4Artifact = a4();
    const fields = fieldsFor("A5-legal-judgment");
    const approvalFingerprint = assertDerivedApprovalFingerprint(fields, "A5 parsed legal result");
    assert.equal(assertRequiredParsedTextField(fields, "bound_input", "A5 parsed legal result"), a4Artifact, "A5 parsed legal result bound_input must exactly equal the actual A4 artifact");
    assertExactParsedFingerprintBinding(fields, "a4_artifact_fingerprint", a4Artifact, "A5 parsed legal result");
    if (closingChildId === "A5-legal-judgment" && !["satisfied", "complete-not-closure-eligible"].includes(fields.child_status)) return undefined;
    const judgmentRecord = a5LegalJudgmentRecordByChildId.get("A5-legal-judgment");
    const judgmentRecordFields = judgmentRecord?.fields ?? judgmentRecord;
    assert.ok(judgmentRecordFields, `${closingChildId} requires a separate parsed A5 legal/tax owner-judgment result record`);
    const judgmentRecordFingerprint = assertSanitizedParsedFingerprint(judgmentRecordFields, "judgment_record_fingerprint", "A5 parsed legal result");
    assertExactParsedFingerprintBinding(fields, "judgment_record_fingerprint", judgmentRecordFingerprint, "A5 parsed legal result");
    return assertDerivedSanitizedFingerprint(
      fields,
      "bound_artifact_fingerprint",
      "a5-legal-artifact",
      [
        ["approval_fingerprint", approvalFingerprint],
        ["a4_artifact_fingerprint", a4Artifact],
        ["judgment_record_fingerprint", judgmentRecordFingerprint],
        ["judgment_output", fields.judgment_output],
        ["judgment_effective_date", fields.judgment_effective_date]
      ],
      "A5 parsed legal result"
    );
  };
  const a6 = () => {
    const a4Artifact = a4();
    const a5Artifact = a5();
    const fields = fieldsFor("A6-copy-judgment");
    const approvalFingerprint = assertDerivedApprovalFingerprint(fields, "A6 parsed copy result");
    assertExactParsedFingerprintBinding(fields, "a4_artifact_fingerprint", a4Artifact, "A6 parsed copy result");
    assertExactParsedFingerprintBinding(fields, "a5_artifact_fingerprint", a5Artifact, "A6 parsed copy result");
    assert.equal(assertRequiredParsedTextField(fields, "bound_input", "A6 parsed copy result"), `copy=${fields.exact_target_or_scope};a4=${a4Artifact};a5=${a5Artifact}`, "A6 parsed copy result bound_input must exactly equal the actual copy/A4/A5 composite");
    if (closingChildId === "A6-copy-judgment" && !["satisfied", "complete-not-closure-eligible"].includes(fields.child_status)) return undefined;
    const judgmentRecord = a6CopyJudgmentRecordByChildId.get("A6-copy-judgment");
    const judgmentRecordFields = judgmentRecord?.fields ?? judgmentRecord;
    assert.ok(judgmentRecordFields, `${closingChildId} requires a separate parsed A6 Copy owner-judgment result record`);
    const judgmentRecordFingerprint = assertSanitizedParsedFingerprint(judgmentRecordFields, "judgment_record_fingerprint", "A6 parsed copy result");
    assertExactParsedFingerprintBinding(fields, "judgment_record_fingerprint", judgmentRecordFingerprint, "A6 parsed copy result");
    return assertDerivedSanitizedFingerprint(
      fields,
      "bound_artifact_fingerprint",
      "a6-copy-artifact",
      [
        ["approval_fingerprint", approvalFingerprint],
        ["a4_artifact_fingerprint", a4Artifact],
        ["a5_artifact_fingerprint", a5Artifact],
        ["judgment_record_fingerprint", judgmentRecordFingerprint],
        ["judgment_output", fields.judgment_output],
        ["judgment_effective_date", fields.judgment_effective_date]
      ],
      "A6 parsed copy result"
    );
  };
  const b1 = () => {
    const a1Result = a1();
    const a4Artifact = a4();
    const a5Artifact = a5();
    const a6Artifact = a6();
    const externalFields = fieldsFor("B1-external-prerequisite-sanitized-result-reference");
    const externalApprovalFingerprint = assertDerivedApprovalFingerprint(externalFields, "B1 parsed external prerequisite result");
    assert.equal(externalFields.child_status, "satisfied", "B1 requires a satisfied independent external prerequisite child");
    assert.equal(b1ExternalPrerequisiteResultRecordById.size, 1, "B1 requires exactly one independent external prerequisite result record");
    const externalRecord = [...b1ExternalPrerequisiteResultRecordById.values()][0];
    validateB1ExternalPrerequisiteResultRecord(externalRecord, externalFields);
    assertExactParsedFingerprintBinding(externalFields, "external_result_record_fingerprint", externalRecord.external_result_record_fingerprint, "B1 parsed external prerequisite result");
    const externalResult = assertDerivedSanitizedFingerprint(
      externalFields,
      "external_result_fingerprint",
      "b1-external-prerequisite-result",
      [["approval_fingerprint", externalApprovalFingerprint], ["external_result_record_fingerprint", externalRecord.external_result_record_fingerprint]],
      "B1 parsed external prerequisite result"
    );
    const fields = fieldsFor("B1-deployed-target-proof");
    const approvalFingerprint = assertDerivedApprovalFingerprint(fields, "B1 parsed deployed-target result");
    const proofRecord = b1ProofRecordById.get(assertRequiredParsedTextField(fields, "proof_record_fingerprint", "B1 parsed deployed-target result"));
    assertExactParsedFingerprintBinding(fields, "a1_result_fingerprint", a1Result, "B1 parsed deployed-target result");
    assertExactParsedFingerprintBinding(fields, "a4_artifact_fingerprint", a4Artifact, "B1 parsed deployed-target result");
    assertExactParsedFingerprintBinding(fields, "a5_artifact_fingerprint", a5Artifact, "B1 parsed deployed-target result");
    assertExactParsedFingerprintBinding(fields, "a6_artifact_fingerprint", a6Artifact, "B1 parsed deployed-target result");
    assertExactParsedFingerprintBinding(fields, "external_prerequisite_fingerprint", externalResult, "B1 parsed deployed-target result");
    if (!proofRecord) {
      assert.equal(fields.child_status, "running", `${closingChildId} requires a separate parsed B1 deployed-target proof record once B1 is terminal`);
      return undefined;
    }
    const proofFields = validateB1ParsedEvidenceRecord(proofRecord, fields);
    const deployedFingerprint = assertDerivedSanitizedFingerprint(
      fields,
      "deployed_fingerprint",
      "b1-deployed-target-result",
      [
        ["approval_fingerprint", approvalFingerprint],
        ["a1_result_fingerprint", a1Result],
        ["a4_artifact_fingerprint", a4Artifact],
        ["a5_artifact_fingerprint", a5Artifact],
        ["a6_artifact_fingerprint", a6Artifact],
        ["external_prerequisite_fingerprint", externalResult],
        ["proof_record_fingerprint", proofFields.proof_record_fingerprint]
      ],
      "B1 parsed deployed-target result"
    );
    return { deployedFingerprint, proofFields };
  };
  if (closingChildId === "A1-worker-cpu-evidence-read") {
    a1();
    return;
  }
  if (closingChildId === "A2-provider-cost-evidence-read") {
    a2();
    return;
  }
  if (closingChildId === "A3-stripe-source-applicability-read-or-judgment") {
    a3();
    return;
  }
  if (closingChildId === "A4-product-price-judgment") {
    a4();
    return;
  }
  if (closingChildId === "A5-legal-judgment") {
    a5();
    return;
  }
  if (closingChildId === "A6-copy-judgment") {
    a6();
    return;
  }
  if (closingChildId === "B1-deployed-target-proof") {
    b1();
    return;
  }
  if (closingChildId === "B2-live-paid-flow-evidence") {
    const { deployedFingerprint, proofFields } = b1();
    const fields = fieldsFor("B2-live-paid-flow-evidence");
    const approvalFingerprint = assertDerivedApprovalFingerprint(fields, "B2 parsed live-flow result");
    assertExactParsedFingerprintBinding(fields, "b1_deployed_fingerprint", deployedFingerprint, "B2 parsed live-flow result");
    assert.equal(assertRequiredParsedTextField(fields, "b1_deployed_target_binding", "B2 parsed live-flow result"), proofFields.observed_deployed_target_binding, "B2 parsed live-flow result must bind the validated B1 proof-record target");
    assert.equal(assertRequiredParsedTextField(fields, "b1_deployed_commit_binding", "B2 parsed live-flow result"), proofFields.observed_deployed_commit_binding, "B2 parsed live-flow result must bind the validated B1 proof-record commit");
    const signedEvidenceRecordId = assertRequiredParsedTextField(fields, "signed_evidence_record_id", "B2 parsed live-flow result");
    const signedEvidenceFields = signedEvidenceById.get(signedEvidenceRecordId);
    assert.ok(signedEvidenceFields, "B2 requires a separate parsed signed evidence record");
    const signedEvidenceFingerprint = assertDerivedSanitizedFingerprint(
      signedEvidenceFields,
      "fingerprint",
      "b2-signed-evidence",
      [
        ["evidence_record_id", signedEvidenceFields.evidence_record_id],
        ["evidence_record_type", signedEvidenceFields.evidence_record_type],
        ["source", signedEvidenceFields.source],
        ["classification", signedEvidenceFields.classification],
        ["authority", signedEvidenceFields.authority],
        ["source_timestamp", signedEvidenceFields.source_timestamp]
      ],
      "B2 separate signed evidence record"
    );
    assertExactParsedFingerprintBinding(fields, "signed_evidence_fingerprint", signedEvidenceFingerprint, "B2 parsed live-flow result");
    const aggregateRecordFingerprint = assertSanitizedParsedFingerprint(fields, "b2_aggregate_record_fingerprint", "B2 parsed live-flow result");
    assert.ok(b2AggregateLiveOperationResultRecordByFingerprint.has(aggregateRecordFingerprint), "B2 requires a separate parsed aggregate live-operation result record");
    assertDerivedSanitizedFingerprint(
      fields,
      "result_fingerprint",
      "b2-live-flow-result",
      [
        ["approval_fingerprint", approvalFingerprint],
        ["b2_execution_id", fields.b2_execution_id],
        ["target_scope_alias", fields.target_scope_alias],
        ["time_window", fields.time_window],
        ["b1_deployed_fingerprint", deployedFingerprint],
        ["signed_evidence_fingerprint", signedEvidenceFingerprint],
        ["b2_aggregate_record_fingerprint", aggregateRecordFingerprint]
      ],
      "B2 parsed live-flow result"
    );
    assertSourceTimestampWithinExactOperationWindow({ source_timestamp: signedEvidenceFields.source_timestamp, time_window: assertRequiredParsedTextField(fields, "time_window", "B2 parsed live-flow result") }, "B2 separate signed evidence record");
  }
}

function nonAuthorizingOperationPatternSource() {
  return [
    "funding",
    "payment",
    "deploy(?:ment)?",
    "live[-_ ]?flow",
    "activation",
    "migration",
    "config(?:uration)?",
    "binding",
    "git[-_ ]?publication",
    "public[-_ ]?paid[-_ ]?gate",
    "cleanup",
    "legal(?:[-_ ]?(?:approval|action))?",
    "tax(?:[-_ ]?(?:approval|action))?",
    "copy(?:[-_ ]?approval)?",
    "public[-_ ]?copy",
    "risk(?:[-_ ]?acceptance)?",
    "final[-_ ]?go",
    "go",
    "publication",
    "external[-_ ]?action"
  ].join("|");
}

function nonAuthorizingOperationPattern() {
  return new RegExp(nonAuthorizingOperationPatternSource(), "i");
}

function assertParsedNonAuthorizingControlPlane(manifestFields, rows, children) {
  const fields = [manifestFields, ...rows.map((row) => row.fields), ...children.map((child) => child.fields)];
  for (const record of fields) {
    for (const [key, value] of Object.entries(record)) {
      if (key === "bound_input" && value === canonicalCompletedA0ProvisionalCostModelApprovalFields.bound_input) continue;
      const text = `${key}=${value}`;
      const namesOperation = nonAuthorizingOperationPattern().test(text);
      const assertsAuthority = /authoriz(?:e|es|ed|ation)|execut(?:e|es|ed|ion)/i.test(text);
      const authorityBearingKey = /authoriz/i.test(key);
      const exactDeniedAuthorityValue = /^(?:no|none|unapproved|forbidden|never|not-authorized|not-executed|<no[^>]*authorized>)$/i.test(String(value));
      if (namesOperation && authorityBearingKey) {
        assert.ok(exactDeniedAuthorityValue, `control plane must not directly authorize ${key}`);
        continue;
      }
      const deniesAuthority = /(?:^|[-_ =])(no|none|not|forbidden|unapproved|never)(?:$|[-_ =])/i.test(text);
      assert.ok(!(namesOperation && assertsAuthority && !deniesAuthority), `control plane must not directly authorize ${key}`);
    }
  }
}

function isKnownNonAuthorizingFencedSchemaLine(line) {
  return new Set([
    "funding_authorization=none",
    "payment_authorization=none",
    "payment_or_credit_authorization=none",
    "provider_api_authorization=none",
    "provider_architecture_change_authorization=none",
    "provider_funding_authorization=none",
    "stripe_payment_or_refund_authorization=none",
    "legal_tax_copy_risk_deploy_live_go_activation_publication_authorization=none",
    "copy_risk_deploy_live_go_activation_publication_authorization=none",
    "publication_public_paid_gate_risk_deploy_live_go_activation_external_action_authorization=none"
  ]).has(line);
}

function isKnownNegativeAuthorizationFixtureLine(line) {
  return new Set([
    "manifest authorizes provider funding",
    "manifest authorizes deploy"
  ]).has(line);
}

function isStructuralAuthorizationDenial(line) {
  return /\b(?:does|do|did) not\b[^.;]*\b(?:authoriz(?:e|es|ed|ing)|permit(?:s|ted|ting)?|allow(?:s|ed|ing)?)\b/i.test(line)
    || /\b(?:cannot|must not) (?:authoriz(?:e|es|ed|ing)|permit(?:s|ted|ting)?|allow(?:s|ed|ing)?)\b/i.test(line)
    || /\bnever\b[^.;]*\b(?:authoriz(?:e|es|ed|ing)|permit(?:s|ted|ting)?|allow(?:s|ed|ing)?)\b/i.test(line)
    || /\b(?:authoriz(?:e|es|ed|ing)|permit(?:s|ted|ting)?|allow(?:s|ed|ing)?) no\b/i.test(line)
    || /\b(?:authoriz(?:e|es|ed|ing)|permit(?:s|ted|ting)?|allow(?:s|ed|ing)?) neither\b/i.test(line)
    || /\bneither\b[\s\S]*\bnor (?:authoriz(?:e|es|ed|ing)|permit(?:s|ted|ting)?|allow(?:s|ed|ing)?)\b/i.test(line)
    || /\bwithout\s+(?:authoriz(?:e|es|ed|ing)|permit(?:s|ted|ting)?|allow(?:s|ed|ing)?)\b/i.test(line)
    || /\bnon[- ](?:authoriz(?:e|es|ed|ing)|permit(?:s|ted|ting)?|allow(?:s|ed|ing)?)\b/i.test(line)
    || /\bno\b[^.;]*\b(?:is|are) (?:authorized|permitted|allowed)\b/i.test(line)
    || /\bno\b[^.;]*\b(?:is|are) needed or (?:authorized|permitted|allowed)\b/i.test(line)
    || /\bnot (?:authoriz(?:e|es|ed|ing)|permit(?:s|ted|ting)?|allow(?:s|ed|ing)?)\b/i.test(line)
    || /\b(?:may|can|shall) not proceed\b/i.test(line)
    || /^\s*Reject manifest language that directly (?:authorizes|permits|allows)\b/i.test(line);
}

function assertFullTextNonAuthorizing(text) {
  let fenced = false;
  let negativeFixtureSection = false;
  let fencedNegativeFixtureSection = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^- \[[ x]\] \*\*Step \d+: Add adversarial negative fixtures\*\*$/i.test(line.trim())) negativeFixtureSection = true;
    else if (/^#{1,6}\s/.test(line)) negativeFixtureSection = false;
    if (/^```/.test(line)) {
      if (!fenced) fencedNegativeFixtureSection = negativeFixtureSection;
      fenced = !fenced;
      if (!fenced) fencedNegativeFixtureSection = false;
      continue;
    }
    const authorityAssignment = line.trim().match(/^([a-z0-9_]+_(?:authorization|permission|approval|consent))=([^\s]+)$/i);
    if (authorityAssignment && !/^(?:funding_decision_basis_approval|row_approval)$/i.test(authorityAssignment[1])) {
      assert.match(
        authorityAssignment[2],
        /^(?:no|none(?:-[A-Za-z0-9-]+)*|unapproved|forbidden|never|not-authorized|not-executed|<no[^>]*authorized>)$/i,
        `control-plane assignment must not directly grant authority: ${line}`
      );
    }
    for (const clause of line.split(/(?<=[.!?;])\s+/)) {
      const namesOperation = nonAuthorizingOperationPattern().test(clause);
      const fencedSchemaAuthority = fenced
        && /^[a-z0-9_]+_(?:authorization|permission|approval|consent)=/i.test(clause.trim())
        && !/^(?:funding_decision_basis_approval|row_approval)=/i.test(clause.trim());
      const directPassiveAuthorization = new RegExp(`\\b(?:${nonAuthorizingOperationPatternSource()})\\b[^.!?]{0,64}\\b(?:is|are|was|were|be|been) (?:authorized|permitted|allowed)\\b`, "i").test(clause);
      const directActiveAuthorization = new RegExp(`\\b(?:authoriz(?:e|es|ed|ing)|permit(?:s|ted|ting)?|allow(?:s|ed|ing)?)\\b(?!\\s+(?:no|neither)\\b)[^.!?]{0,64}\\b(?:${nonAuthorizingOperationPatternSource()})\\b`, "i").test(clause);
      const directProceedAuthorization = new RegExp(`\\b(?:${nonAuthorizingOperationPatternSource()})\\b[^.!?]{0,64}\\b(?:may|can|shall) proceed\\b`, "i").test(clause);
      const assertsAuthority = directActiveAuthorization || directPassiveAuthorization || directProceedAuthorization || fencedSchemaAuthority;
      if (!(namesOperation && assertsAuthority)) continue;
      const hasPositiveDirectManifestAuthorization = new RegExp(`\\b(?:this\\s+)?(?:manifest|control-plane|checklist|record|plan)\\s+(?:(?:is|are|was|were|be|been)\\s+)?(?:authoriz(?:e|es|ed|ing)|permit(?:s|ted|ting)?|allow(?:s|ed|ing)?)\\b(?!\\s+(?:no|neither)\\b)[^.!?]{0,64}\\b(?:${nonAuthorizingOperationPatternSource()})\\b`, "i").test(clause);
      const exactFencedSchemaLine = fenced && isKnownNonAuthorizingFencedSchemaLine(clause.trim());
      const explicitNegativeFixtureLine = fenced && fencedNegativeFixtureSection && isKnownNegativeAuthorizationFixtureLine(clause.trim());
      assert.ok((isStructuralAuthorizationDenial(clause) && !hasPositiveDirectManifestAuthorization) || exactFencedSchemaLine || explicitNegativeFixtureLine, `control-plane prose must not directly authorize an operation: ${line}`);
    }
  }
}

function validateStagedLedgerCrossValidation(rowRecords, childRecords, ledger, signedEvidenceRecords = [], b2ScenarioResultRecords = [], a3ObservedResultRecords = [], a2ObservedResultRecords = [], a1ObservedResultRecords = [], a4JudgmentResultRecords = [], a5LegalJudgmentResultRecords = [], a6CopyJudgmentResultRecords = [], b1DeployedTargetProofRecords = childRecords.b1DeployedTargetProofRecords ?? [], b1ExternalPrerequisiteResultRecords = childRecords.b1ExternalPrerequisiteResultRecords ?? [], b2AggregateLiveOperationResultRecords = childRecords.b2AggregateLiveOperationResultRecords ?? [], a2FundingRequirementDispositionResultRecords = childRecords.a2FundingRequirementDispositionResultRecords ?? [], a2FundingDispositionOwnerApprovalRecords = childRecords.a2FundingDispositionOwnerApprovalRecords ?? [], a3ManualReadOwnerApprovalRecords = childRecords.a3ManualReadOwnerApprovalRecords ?? []) {
  const ledgerById = new Map(ledger.map((row) => [row.id, row]));
  const childRecordById = new Map(childRecords.map((child) => [child.fields.child_id, child]));
  const childById = new Map(childRecords.map((child) => [child.fields.child_id, child.fields]));
  const fundingReferenceChild = childById.get("A2-provider-funding-external-prerequisite-reference");
  const a0Child = childById.get("A0-provisional-cost-model-input");
  const a3Child = childById.get("A3-stripe-source-applicability-read-or-judgment");
  assert.equal(Array.isArray(a2FundingDispositionOwnerApprovalRecords), true, "A2 funding owner-approval collection requires parsed records");
  assert.equal(Array.isArray(a2FundingRequirementDispositionResultRecords), true, "A2 funding disposition collection requires parsed records");
  const a2FundingDispositionRecordByFingerprint = new Map();
  const a2FundingDispositionOwnerApprovalByFingerprint = new Map();
  const a2FundingDispositionRecordIds = new Set();
  if (fundingReferenceChild?.funding_requirement_state === "undetermined") {
    assert.equal(a2FundingDispositionOwnerApprovalRecords.length, 0, "undetermined A2 funding state requires an empty owner-approval record collection");
    assert.equal(a2FundingRequirementDispositionResultRecords.length, 0, "undetermined A2 funding state requires an empty disposition record collection");
  } else {
    assert.equal(a2FundingDispositionOwnerApprovalRecords.length, 1, "a factual A2 funding state requires exactly one separate parsed owner-approval record");
    assert.equal(a2FundingRequirementDispositionResultRecords.length, 1, "a factual A2 funding state requires exactly one separate parsed disposition record");
  }
  for (const record of a2FundingDispositionOwnerApprovalRecords) {
    const fields = validateA2FundingDispositionOwnerApprovalRecord(record, a0Child);
    assert.equal(a2FundingDispositionOwnerApprovalByFingerprint.has(fields.owner_approval_record_fingerprint), false, "A2 funding owner-approval collection requires a unique record fingerprint");
    a2FundingDispositionOwnerApprovalByFingerprint.set(fields.owner_approval_record_fingerprint, fields);
  }
  for (const record of a2FundingRequirementDispositionResultRecords) {
    const fields0 = record?.fields ?? record;
    const owner = a2FundingDispositionOwnerApprovalByFingerprint.get(fields0.owner_approval_record_fingerprint);
    assert.ok(owner, "A2 funding disposition result requires a separately parsed owner approval record");
    const fields = validateA2FundingRequirementDispositionResultRecord(record, fundingReferenceChild, owner, a0Child);
    assert.equal(a2FundingDispositionRecordIds.has(fields.decision_record_id), false, "A2 funding disposition collection requires a unique decision record ID");
    assert.equal(a2FundingDispositionRecordByFingerprint.has(fields.disposition_record_fingerprint), false, "A2 funding disposition collection requires a unique record fingerprint");
    a2FundingDispositionRecordIds.add(fields.decision_record_id);
    a2FundingDispositionRecordByFingerprint.set(fields.disposition_record_fingerprint, fields);
  }
  assert.equal(Array.isArray(a3ManualReadOwnerApprovalRecords), true, "A3 owner approval collection requires parsed records");
  const a3ManualReadOwnerApprovalByFingerprint = new Map();
  const a3Owners = validateA3ManualReadOwnerApprovalCollection(a3Child, a3ManualReadOwnerApprovalRecords, a0Child, a3ObservedResultRecords);
  for (const fields of a3Owners) {
    assert.equal(a3ManualReadOwnerApprovalByFingerprint.has(fields.owner_approval_record_fingerprint), false, "A3 owner approval collection requires unique independent fingerprints");
    a3ManualReadOwnerApprovalByFingerprint.set(fields.owner_approval_record_fingerprint, fields);
  }
  const signedEvidenceById = new Map(signedEvidenceRecords.map((record) => {
    const fields = validateSignedEvidenceRecord(record);
    assert.equal(fields.evidence_record_id, record?.fields?.evidence_record_id ?? record?.evidence_record_id, "signed evidence record ID must be stable after parsing");
    return [fields.evidence_record_id, fields];
  }));
  assert.equal(signedEvidenceById.size, signedEvidenceRecords.length, "signed evidence records must keep unique independent IDs");
  assert.equal(Array.isArray(b1DeployedTargetProofRecords), true, "B1 deployed-target proof collection requires parsed records");
  const b1ProofRecordById = new Map();
  const b1ProofRecordIds = new Set();
  for (const record of b1DeployedTargetProofRecords) {
    const fields = record?.fields ?? record;
    assert.ok(fields && typeof fields === "object", "B1 deployed-target proof collection requires parsed fields");
    assert.deepEqual(Object.keys(fields).sort(), [...b1DeployedTargetProofRecordFields].sort(), "B1 deployed-target proof collection rejects template, foreign, and unknown records");
    const proofRecordId = assertRequiredParsedTextField(fields, "proof_record_id", "B1 deployed-target proof collection");
    const proofRecordFingerprint = assertRequiredParsedTextField(fields, "proof_record_fingerprint", "B1 deployed-target proof collection");
    assert.equal(b1ProofRecordIds.has(proofRecordId), false, "B1 deployed-target proof collection requires unique proof record IDs");
    assert.equal(b1ProofRecordById.has(proofRecordFingerprint), false, "B1 deployed-target proof collection requires unique proof record fingerprints");
    b1ProofRecordIds.add(proofRecordId);
    b1ProofRecordById.set(proofRecordFingerprint, record);
  }
  const b1Child = childById.get("B1-deployed-target-proof");
  const b2Child = childById.get("B2-live-paid-flow-evidence");
  const externalChild = childById.get("B1-external-prerequisite-sanitized-result-reference");
  assert.equal(Array.isArray(b1ExternalPrerequisiteResultRecords), true, "B1 external prerequisite collection requires parsed records");
  if (externalChild?.child_status === "satisfied") assert.equal(b1ExternalPrerequisiteResultRecords.length, 1, "satisfied B1 external prerequisite requires exactly one separate parsed external result record");
  else assert.equal(b1ExternalPrerequisiteResultRecords.length, 0, "nonterminal B1 external prerequisite requires an empty external result collection");
  const externalRecordById = new Map();
  for (const record of b1ExternalPrerequisiteResultRecords) {
    const fields = validateB1ExternalPrerequisiteResultRecord(record, externalChild, childRecords.map((child) => child.fields.approval_id));
    assert.equal(externalRecordById.has(fields.external_result_record_id), false, "B1 external prerequisite result IDs must be unique");
    externalRecordById.set(fields.external_result_record_id, fields);
  }
  const b1Terminal = ["satisfied", "complete-not-closure-eligible"].includes(b1Child?.child_status);
  if (b1Terminal) assert.equal(b1DeployedTargetProofRecords.length, 1, "terminal B1 requires exactly one separate parsed B1 deployed-target proof record");
  else assert.equal(b1DeployedTargetProofRecords.length, 0, "B1 proof collection must be empty while B1 is nonterminal");
  assert.equal(Array.isArray(b2AggregateLiveOperationResultRecords), true, "B2 aggregate live-operation result collection requires parsed records");
  const b2Terminal = ["satisfied", "complete-not-closure-eligible"].includes(b2Child?.child_status);
  if (b2Terminal) assert.equal(b2AggregateLiveOperationResultRecords.length, 1, "terminal B2 requires exactly one separate parsed B2 aggregate live-operation result record");
  else assert.equal(b2AggregateLiveOperationResultRecords.length, 0, "B2 aggregate live-operation result collection must be empty while B2 is nonterminal");
  assert.equal(Array.isArray(b2ScenarioResultRecords), true, "B2 scenario result collection requires parsed records");
  if (b2Terminal) assert.equal(b2ScenarioResultRecords.length, canonicalB2ScenarioContracts.length, "terminal B2 requires exactly the canonical 19 scenario result records");
  else assert.equal(b2ScenarioResultRecords.length, 0, "B2 scenario result collection must be empty while B2 is nonterminal");
  const b2AggregateLiveOperationResultRecordByFingerprint = new Map();
  const b2AggregateLiveOperationResultRecordIds = new Set();
  for (const record of b2AggregateLiveOperationResultRecords) {
    const fields = record?.fields ?? record;
    assert.ok(fields && typeof fields === "object", "B2 aggregate live-operation result collection requires parsed fields");
    assert.deepEqual(Object.keys(fields).sort(), [...b2AggregateLiveOperationResultRecordFields].sort(), "B2 aggregate live-operation result collection rejects template, foreign, and unknown records");
    const recordId = assertRequiredParsedTextField(fields, "aggregate_record_id", "B2 aggregate live-operation result collection");
    const fingerprint = assertSanitizedParsedFingerprint(fields, "aggregate_record_fingerprint", "B2 aggregate live-operation result collection");
    assert.equal(b2AggregateLiveOperationResultRecordIds.has(recordId), false, "B2 aggregate live-operation result collection requires unique record IDs");
    assert.equal(b2AggregateLiveOperationResultRecordByFingerprint.has(fingerprint), false, "B2 aggregate live-operation result collection requires unique record fingerprints");
    b2AggregateLiveOperationResultRecordIds.add(recordId);
    b2AggregateLiveOperationResultRecordByFingerprint.set(fingerprint, record);
  }
  const a3ObservedResultByChildId = new Map(a3ObservedResultRecords.map((record) => {
    const fields = record?.fields ?? record;
    const childId = assertRequiredParsedTextField(fields, "child_id", "A3 parsed observed result record");
    return [childId, record];
  }));
  assert.equal(a3ObservedResultByChildId.size, a3ObservedResultRecords.length, "A3 observed result records must keep unique independent child IDs");
  const a2ObservedResultByChildId = new Map(a2ObservedResultRecords.map((record) => {
    const fields = record?.fields ?? record;
    const childId = assertRequiredParsedTextField(fields, "child_id", "A2 parsed observed result record");
    return [childId, record];
  }));
  assert.equal(a2ObservedResultByChildId.size, a2ObservedResultRecords.length, "A2 observed result records must keep unique independent child IDs");
  const a1ObservedResultByChildId = new Map(a1ObservedResultRecords.map((record) => {
    const fields = record?.fields ?? record;
    const childId = assertRequiredParsedTextField(fields, "child_id", "A1 parsed observed result record");
    return [childId, record];
  }));
  assert.equal(a1ObservedResultByChildId.size, a1ObservedResultRecords.length, "A1 observed result records must keep unique independent child IDs");
  const a4JudgmentRecordByChildId = new Map(a4JudgmentResultRecords.map((record) => {
    const fields = record?.fields ?? record;
    const childId = assertRequiredParsedTextField(fields, "child_id", "A4 parsed owner-judgment result record");
    return [childId, record];
  }));
  const a4JudgmentRecordById = new Map(a4JudgmentResultRecords.map((record) => {
    const fields = record?.fields ?? record;
    return [assertRequiredParsedTextField(fields, "judgment_record_id", "A4 parsed owner-judgment result record"), record];
  }));
  assert.equal(a4JudgmentRecordByChildId.size, a4JudgmentResultRecords.length, "A4 owner-judgment result records must keep unique independent child IDs");
  assert.equal(a4JudgmentRecordById.size, a4JudgmentResultRecords.length, "A4 owner-judgment result records must keep unique independent record IDs");
  const a5LegalJudgmentRecordByChildId = new Map(a5LegalJudgmentResultRecords.map((record) => {
    const fields = record?.fields ?? record;
    const childId = assertRequiredParsedTextField(fields, "child_id", "A5 parsed legal/tax owner-judgment result record");
    return [childId, record];
  }));
  const a5LegalJudgmentRecordById = new Map(a5LegalJudgmentResultRecords.map((record) => {
    const fields = record?.fields ?? record;
    return [assertRequiredParsedTextField(fields, "judgment_record_id", "A5 parsed legal/tax owner-judgment result record"), record];
  }));
  assert.equal(a5LegalJudgmentRecordByChildId.size, a5LegalJudgmentResultRecords.length, "A5 legal/tax owner-judgment result records must keep unique independent child IDs");
  assert.equal(a5LegalJudgmentRecordById.size, a5LegalJudgmentResultRecords.length, "A5 legal/tax owner-judgment result records must keep unique independent record IDs");
  for (const record of a5LegalJudgmentResultRecords) {
    const fields = record?.fields ?? record;
    assert.ok(fields && typeof fields === "object", "A5 legal/tax owner-judgment collection requires parsed fields");
    assert.deepEqual(Object.keys(fields).sort(), [...a5LegalJudgmentResultRecordFields].sort(), "A5 legal/tax owner-judgment collection requires an exact closed A5 legal/tax record");
    assert.equal(fields.child_id, "A5-legal-judgment", "A5 legal/tax owner-judgment collection requires the exact A5 child");
  }
  if (a5LegalJudgmentResultRecords.length > 0) {
    assert.equal(a5LegalJudgmentResultRecords.length, 1, "A5 legal/tax owner-judgment collection requires exactly one independent record");
    const a5Child = childById.get("A5-legal-judgment");
    assert.ok(["satisfied", "complete-not-closure-eligible"].includes(a5Child?.child_status), "A5 legal/tax owner-judgment collection requires a terminal A5 child");
    const a4Child = childById.get("A4-product-price-judgment");
    const a4Record = a4JudgmentRecordByChildId.get("A4-product-price-judgment");
    assert.ok(a4Record, "A5 legal/tax owner-judgment collection requires a separate parsed A4 owner-judgment result record");
    const a2Record = a2ObservedResultByChildId.get("A2-provider-cost-evidence-read");
    const a3Record = a3ObservedResultByChildId.get("A3-stripe-source-applicability-read-or-judgment");
    const a2Child = childById.get("A2-provider-cost-evidence-read");
    const a3Child = childById.get("A3-stripe-source-applicability-read-or-judgment");
    assert.ok(a2Record && a3Record, "A5 legal/tax owner-judgment collection requires separate parsed A2/A3 prerequisite result records");
    assert.ok(a2Child && a3Child, "A5 legal/tax owner-judgment collection requires exact A2/A3 prerequisite children");
    validateA4ProductPriceJudgmentResultRecord(a4Record, a4Child, a2Record, a3Record, a2Child, a3Child, a3ManualReadOwnerApprovalByFingerprint.get(a3Child.owner_approval_record_fingerprint), a0Child, { requireComplete: true });
    validateA5LegalJudgmentResultRecord(a5LegalJudgmentResultRecords[0], a5Child, a4Record, a4Child, { requireComplete: a5Child.child_status === "satisfied" });
  }
  const a6CopyJudgmentRecordByChildId = new Map(a6CopyJudgmentResultRecords.map((record) => {
    const fields = record?.fields ?? record;
    const childId = assertRequiredParsedTextField(fields, "child_id", "A6 parsed Copy owner-judgment result record");
    return [childId, record];
  }));
  const a6CopyJudgmentRecordById = new Map(a6CopyJudgmentResultRecords.map((record) => {
    const fields = record?.fields ?? record;
    return [assertRequiredParsedTextField(fields, "judgment_record_id", "A6 parsed Copy owner-judgment result record"), record];
  }));
  assert.equal(a6CopyJudgmentRecordByChildId.size, a6CopyJudgmentResultRecords.length, "A6 Copy owner-judgment result records must keep unique independent child IDs");
  assert.equal(a6CopyJudgmentRecordById.size, a6CopyJudgmentResultRecords.length, "A6 Copy owner-judgment result records must keep unique independent record IDs");
  for (const record of a6CopyJudgmentResultRecords) {
    const fields = record?.fields ?? record;
    assert.ok(fields && typeof fields === "object", "A6 Copy owner-judgment collection requires parsed fields");
    assert.deepEqual(Object.keys(fields).sort(), [...a6CopyJudgmentResultRecordFields].sort(), "A6 Copy owner-judgment collection requires an exact closed A6 Copy record");
    assert.equal(fields.child_id, "A6-copy-judgment", "A6 Copy owner-judgment collection requires the exact A6 child");
  }
  if (a6CopyJudgmentResultRecords.length > 0) {
    assert.equal(a6CopyJudgmentResultRecords.length, 1, "A6 Copy owner-judgment collection requires exactly one independent record");
    const a6Child = childById.get("A6-copy-judgment");
    assert.ok(["satisfied", "complete-not-closure-eligible"].includes(a6Child?.child_status), "A6 Copy owner-judgment collection requires a terminal A6 child");
    const a4Child = childById.get("A4-product-price-judgment");
    const a5Child = childById.get("A5-legal-judgment");
    const a4Record = a4JudgmentRecordByChildId.get("A4-product-price-judgment");
    const a5Record = a5LegalJudgmentRecordByChildId.get("A5-legal-judgment");
    const a2Record = a2ObservedResultByChildId.get("A2-provider-cost-evidence-read");
    const a3Record = a3ObservedResultByChildId.get("A3-stripe-source-applicability-read-or-judgment");
    const a2Child = childById.get("A2-provider-cost-evidence-read");
    const a3Child = childById.get("A3-stripe-source-applicability-read-or-judgment");
    assert.ok(a2Record && a3Record && a4Record && a5Record, "A6 Copy owner-judgment collection requires separate parsed A2/A3/A4/A5 prerequisite result records");
    assert.ok(a2Child && a3Child && a4Child && a5Child, "A6 Copy owner-judgment collection requires exact A2/A3/A4/A5 prerequisite children");
    validateA4ProductPriceJudgmentResultRecord(a4Record, a4Child, a2Record, a3Record, a2Child, a3Child, a3ManualReadOwnerApprovalByFingerprint.get(a3Child.owner_approval_record_fingerprint), a0Child, { requireComplete: true });
    validateA5LegalJudgmentResultRecord(a5Record, a5Child, a4Record, a4Child, { requireComplete: true });
    validateA6CopyJudgmentResultRecord(a6CopyJudgmentResultRecords[0], a6Child, a4Record, a5Record, a4Child, a5Child, { requireComplete: a6Child.child_status === "satisfied" });
  }
  const assertA4JudgmentRecordForConsumer = (consumerChildId) => {
    if (!["A4-product-price-judgment", "A5-legal-judgment", "A6-copy-judgment", "B1-deployed-target-proof", "B2-live-paid-flow-evidence"].includes(consumerChildId)) return;
    const a4Child = childById.get("A4-product-price-judgment");
    if (consumerChildId === "A4-product-price-judgment" && a4Child?.child_status !== "satisfied") return;
    assert.equal(a4Child?.child_status, "satisfied", `${consumerChildId} requires a satisfied A4 child before consuming its fingerprint`);
    const a4Record = a4JudgmentRecordByChildId.get("A4-product-price-judgment");
    assert.ok(a4Record, `${consumerChildId} requires a separate parsed A4 owner-judgment result record`);
    const a2Record = a2ObservedResultByChildId.get("A2-provider-cost-evidence-read");
    const a3Record = a3ObservedResultByChildId.get("A3-stripe-source-applicability-read-or-judgment");
    assert.ok(a2Record && a3Record, `${consumerChildId} requires separate parsed A2/A3 prerequisite result records`);
    const a3Child = childById.get("A3-stripe-source-applicability-read-or-judgment");
    validateA4ProductPriceJudgmentResultRecord(a4Record, a4Child, a2Record, a3Record, childById.get("A2-provider-cost-evidence-read"), a3Child, a3ManualReadOwnerApprovalByFingerprint.get(a3Child.owner_approval_record_fingerprint), a0Child, { requireComplete: true });
  };
  const assertA1ObservedRecordForConsumer = (consumerChildId) => {
    if (!["B1-deployed-target-proof", "B2-live-paid-flow-evidence"].includes(consumerChildId)) return;
    const a1Child = childById.get("A1-worker-cpu-evidence-read");
    assert.equal(a1Child?.child_status, "satisfied", `${consumerChildId} requires a satisfied A1 child before consuming its fingerprint`);
    const observedResultRecord = a1ObservedResultByChildId.get("A1-worker-cpu-evidence-read");
    assert.ok(observedResultRecord, `${consumerChildId} requires a separate parsed A1 observed result record`);
    validateA1WorkerCpuObservedResultRecord(observedResultRecord, a1Child, { requireComplete: true });
  };
  const assertA5LegalJudgmentRecordForConsumer = (consumerChildId) => {
    if (!["A5-legal-judgment", "A6-copy-judgment", "B1-deployed-target-proof", "B2-live-paid-flow-evidence"].includes(consumerChildId)) return;
    const a5Child = childById.get("A5-legal-judgment");
    if (consumerChildId === "A5-legal-judgment" && !["satisfied", "complete-not-closure-eligible"].includes(a5Child?.child_status)) return;
    if (consumerChildId === "A5-legal-judgment") assert.ok(["satisfied", "complete-not-closure-eligible"].includes(a5Child?.child_status), `${consumerChildId} requires a terminal A5 child before consuming its fingerprint`);
    else assert.equal(a5Child?.child_status, "satisfied", `${consumerChildId} requires a satisfied A5 child before consuming its fingerprint`);
    const a5Record = a5LegalJudgmentRecordByChildId.get("A5-legal-judgment");
    assert.ok(a5Record, `${consumerChildId} requires a separate parsed A5 legal/tax owner-judgment result record`);
    const a4Record = a4JudgmentRecordByChildId.get("A4-product-price-judgment");
    const a4Child = childById.get("A4-product-price-judgment");
    assert.ok(a4Record, `${consumerChildId} requires a separate parsed A4 owner-judgment result record`);
    validateA5LegalJudgmentResultRecord(a5Record, a5Child, a4Record, a4Child, { requireComplete: consumerChildId !== "A5-legal-judgment" || a5Child.child_status === "satisfied" });
  };
  const assertA6CopyJudgmentRecordForConsumer = (consumerChildId) => {
    if (!["A6-copy-judgment", "B1-deployed-target-proof", "B2-live-paid-flow-evidence"].includes(consumerChildId)) return;
    const a6Child = childById.get("A6-copy-judgment");
    if (consumerChildId === "A6-copy-judgment" && !["satisfied", "complete-not-closure-eligible"].includes(a6Child?.child_status)) return;
    if (consumerChildId === "A6-copy-judgment") assert.ok(["satisfied", "complete-not-closure-eligible"].includes(a6Child?.child_status), `${consumerChildId} requires a terminal A6 child before consuming its fingerprint`);
    else assert.equal(a6Child?.child_status, "satisfied", `${consumerChildId} requires a satisfied A6 child before consuming its fingerprint`);
    const a6Record = a6CopyJudgmentRecordByChildId.get("A6-copy-judgment");
    assert.ok(a6Record, `${consumerChildId} requires a separate parsed A6 Copy owner-judgment result record`);
    const a4Record = a4JudgmentRecordByChildId.get("A4-product-price-judgment");
    const a5Record = a5LegalJudgmentRecordByChildId.get("A5-legal-judgment");
    const a4Child = childById.get("A4-product-price-judgment");
    const a5Child = childById.get("A5-legal-judgment");
    assert.ok(a4Record && a5Record, `${consumerChildId} requires separate parsed A4 Product/Price and A5 Legal/Tax owner-judgment result records`);
    validateA6CopyJudgmentResultRecord(a6Record, a6Child, a4Record, a5Record, a4Child, a5Child, { requireComplete: consumerChildId !== "A6-copy-judgment" || a6Child.child_status === "satisfied" });
  };
  if (b1DeployedTargetProofRecords.length > 0) {
    const proofRecord = b1DeployedTargetProofRecords[0];
    validateB1ParsedEvidenceRecord(proofRecord, b1Child);
    assertParsedFingerprintGraph("B1-deployed-target-proof", childRecordById, signedEvidenceById, a4JudgmentRecordByChildId, a5LegalJudgmentRecordByChildId, a6CopyJudgmentRecordByChildId, b1ProofRecordById, externalRecordById, b2AggregateLiveOperationResultRecordByFingerprint, a2FundingDispositionRecordByFingerprint, a2FundingDispositionOwnerApprovalByFingerprint, a3ManualReadOwnerApprovalByFingerprint);
  }
  if (b2Terminal) {
    const signedEvidenceRecordId = assertRequiredParsedTextField(b2Child, "signed_evidence_record_id", "terminal B2 aggregate collection");
    const signedEvidenceRecord = signedEvidenceById.get(signedEvidenceRecordId);
    assert.ok(signedEvidenceRecord, "terminal B2 aggregate collection requires a separate parsed signed evidence record");
    validateB2AggregateLiveOperationResultRecord(b2AggregateLiveOperationResultRecords[0], b2Child, b1Child, b1DeployedTargetProofRecords[0], signedEvidenceRecord, b2ScenarioResultRecords, { requireComplete: b2Child.child_status === "satisfied" });
  }
  const prerequisiteStates = new Map([...childById.entries()].map(([id, fields]) => [id, { status: fields.child_status, freshness: fields.freshness, target: fields.target, approval: fields.approval, fingerprint_bound: fields.fingerprint_bound, stale: fields.child_status === "stale", invalidated: fields.child_status === "invalidated", source_disposition_outcome: fields.source_disposition_outcome }]));
  for (const row of rowRecords) {
    const closingChild = childById.get(row.fields.row_closing_child);
    assert.ok(closingChild, "staged row requires its canonical closing child");
    const lifecycleRequiresPrerequisiteEligibility = ["running", "complete-not-closure-eligible", "satisfied"].includes(closingChild.child_status);
    const fundingRequirementState = lifecycleRequiresPrerequisiteEligibility && closingChild.child_id === "A2-provider-cost-evidence-read"
      ? fundingRequirementStateFromParsedChild(childRecordById.get("A2-provider-funding-external-prerequisite-reference"))
      : undefined;
    if (lifecycleRequiresPrerequisiteEligibility) {
      assertStateObjectPrerequisites(closingChild.child_id, prerequisiteStates, fundingRequirementState);
      assertA1ObservedRecordForConsumer(closingChild.child_id);
      assertA4JudgmentRecordForConsumer(closingChild.child_id);
      assertA5LegalJudgmentRecordForConsumer(closingChild.child_id);
      assertA6CopyJudgmentRecordForConsumer(closingChild.child_id);
      if ((closingChild.child_id !== "A1-worker-cpu-evidence-read" || closingChild.child_status === "satisfied") && (closingChild.child_id !== "B2-live-paid-flow-evidence" || ["satisfied", "complete-not-closure-eligible"].includes(closingChild.child_status))) {
        assertParsedFingerprintGraph(closingChild.child_id, childRecordById, signedEvidenceById, a4JudgmentRecordByChildId, a5LegalJudgmentRecordByChildId, a6CopyJudgmentRecordByChildId, b1ProofRecordById, externalRecordById, b2AggregateLiveOperationResultRecordByFingerprint, a2FundingDispositionRecordByFingerprint, a2FundingDispositionOwnerApprovalByFingerprint, a3ManualReadOwnerApprovalByFingerprint);
      }
      if (closingChild.child_id === "B2-live-paid-flow-evidence" && closingChild.child_status === "running") {
        const signedEvidenceRecordId = assertRequiredParsedTextField(closingChild, "signed_evidence_record_id", "B2 running signed preflight");
        const signedEvidenceRecord = signedEvidenceById.get(signedEvidenceRecordId);
        assert.ok(signedEvidenceRecord, "B2 running signed preflight requires a separate parsed signed evidence record");
        validateB2RunningPreflight(closingChild, b1Child, b1DeployedTargetProofRecords[0], signedEvidenceRecord);
      }
    }
    const ledgerRow = ledgerById.get(row.fields.row_group_id);
    assert.ok(ledgerRow, "staged row requires its canonical ledger");
    if (closingChild.child_status === "satisfied") {
      assert.equal(ledgerRow.status, "satisfied", "future satisfied child cannot contradict the canonical evidence ledger");
      assert.equal(row.fields.row_group_status, "satisfied");
      if (closingChild.child_id === "B2-live-paid-flow-evidence") {
        const signedEvidenceRecordId = assertRequiredParsedTextField(closingChild, "signed_evidence_record_id", "B2 satisfied result");
        const signedEvidenceRecord = signedEvidenceById.get(signedEvidenceRecordId);
        assert.ok(signedEvidenceRecord, "B2 requires a separate parsed signed evidence record");
        const aggregateRecordFingerprint = assertSanitizedParsedFingerprint(closingChild, "b2_aggregate_record_fingerprint", "B2 satisfied result");
        const aggregateResultRecord = b2AggregateLiveOperationResultRecordByFingerprint.get(aggregateRecordFingerprint);
        assert.ok(aggregateResultRecord, "B2 requires a separate parsed aggregate live-operation result record");
        validateB2ParsedResult(closingChild, childRecordById.get("B1-deployed-target-proof"), b1DeployedTargetProofRecords[0], signedEvidenceRecord, b2ScenarioResultRecords, aggregateResultRecord);
      } else {
        assert.equal(closingChild.satisfied_result, satisfiedResultSchemas[closingChild.child_id], "satisfied child requires its exact result schema");
        validateSatisfiedStructuredResult(closingChild);
        if (closingChild.child_id === "A1-worker-cpu-evidence-read") {
          const observedResultRecord = a1ObservedResultByChildId.get(closingChild.child_id);
          assert.ok(observedResultRecord, "A1 requires a separate parsed observed result record");
          validateA1WorkerCpuObservedResultRecord(observedResultRecord, closingChild, { requireComplete: true });
        }
        if (closingChild.child_id === "A2-provider-cost-evidence-read") {
          const observedResultRecord = a2ObservedResultByChildId.get(closingChild.child_id);
          assert.ok(observedResultRecord, "A2 requires a separate parsed observed result record");
          validateA2ProviderCostObservedResultRecord(observedResultRecord, closingChild, { requireComplete: true });
        }
        if (closingChild.child_id === "A3-stripe-source-applicability-read-or-judgment" && closingChild.selected_mode === "read") {
          const observedResultRecord = a3ObservedResultByChildId.get(closingChild.child_id);
          assert.ok(observedResultRecord, "A3 requires a separate parsed observed result record");
          const owner = a3ManualReadOwnerApprovalByFingerprint.get(closingChild.owner_approval_record_fingerprint);
          assert.ok(owner, "A3 requires the independent owner approval record bound by its child fingerprint");
          validateA3StripeObservedResultRecord(observedResultRecord, closingChild, owner, a0Child, { requireComplete: true });
        }
      }
    } else {
      assert.notEqual(ledgerRow.status, "satisfied", "incomplete current ledger cannot coexist with a non-satisfied staged closing child");
      if (closingChild.child_id === "B2-live-paid-flow-evidence" && closingChild.child_status === "complete-not-closure-eligible") {
        const aggregateRecordFingerprint = assertSanitizedParsedFingerprint(closingChild, "b2_aggregate_record_fingerprint", "B2 non-closing result");
        const aggregateResultRecord = b2AggregateLiveOperationResultRecordByFingerprint.get(aggregateRecordFingerprint);
        assert.ok(aggregateResultRecord, "B2 requires a separate parsed aggregate live-operation result record");
        const signedEvidenceRecordId = assertRequiredParsedTextField(closingChild, "signed_evidence_record_id", "B2 non-closing result");
        const signedEvidenceRecord = signedEvidenceById.get(signedEvidenceRecordId);
        assert.ok(signedEvidenceRecord, "B2 non-closing result requires a separate parsed signed evidence record");
        validateB2AggregateLiveOperationResultRecord(aggregateResultRecord, closingChild, childRecordById.get("B1-deployed-target-proof"), b1DeployedTargetProofRecords[0], signedEvidenceRecord, b2ScenarioResultRecords);
      }
    }
  }
}

function validateParsedStagedFixture(rowRecords, childRecords, ledger = evidenceRows, signedEvidenceRecords = [], b2ScenarioResultRecords = [], a3ObservedResultRecords = [], a2ObservedResultRecords = [], a1ObservedResultRecords = [], a4JudgmentResultRecords = [], a5LegalJudgmentResultRecords = [], a6CopyJudgmentResultRecords = [], b1DeployedTargetProofRecords = []) {
  const rows = validateStagedRows(rowRecords);
  const rowApprovalIds = new Map(rowRecords.map((row) => [row.fields.row_group_id, row.fields.child_approval_id]));
  const childrenById = new Map(childRecords.map((child) => [child.fields.child_id, child.fields]));
  for (const row of rowRecords) {
    const closingChild = childrenById.get(row.fields.row_closing_child);
    assert.equal(closingChild?.child_status, row.fields.row_group_status, "row and closing-child lifecycle states must match");
    assert.equal(closingChild?.dependent_stop_result, row.fields.row_dependent_stop_result, "row and closing-child dependent-stop results must match");
  }
  const validated = validateStagedChildren(childRecords, rows, rowApprovalIds);
  validateStagedLedgerCrossValidation(rowRecords, validated, ledger, signedEvidenceRecords, b2ScenarioResultRecords, a3ObservedResultRecords, a2ObservedResultRecords, a1ObservedResultRecords, a4JudgmentResultRecords, a5LegalJudgmentResultRecords, a6CopyJudgmentResultRecords, b1DeployedTargetProofRecords);
  return validated;
}

function validateStagedChildRecord(fields, expected) {
  const state = fields.child_status;
  assert.ok(["unapproved", "approved-not-started", "running", "partial-stop", "complete-not-closure-eligible", "satisfied", "stale", "invalidated", "incomplete"].includes(state), "child status must be a canonical lifecycle state");
  if (state === "unapproved") {
    assert.match(fields.approval_id, /^<required-unique-approval-id-[A-Za-z0-9-]+>$/, "unapproved child requires approval ID placeholder");
    assert.equal(fields.explicit_decision, "<required-explicit-approved-or-rejected-decision>");
    assert.match(fields.exact_target_or_scope, /^<required-exact-/);
    assert.equal(fields.evidence_retention_location, "<required-sanitized-retention-location>");
    assert.equal(fields.freshness, "missing"); assert.equal(fields.target, "missing"); assert.equal(fields.approval, "unapproved"); assert.equal(fields.fingerprint_bound, "no");
    assert.equal(fields.dependent_stop_result, "not-applicable");
  } else if (["approved-not-started", "running", "complete-not-closure-eligible", "satisfied"].includes(state)) {
    assert.match(fields.approval_id, /^(?!<required)[A-Za-z0-9-]+$/, "approved lifecycle child requires exact non-placeholder approval ID");
    assert.equal(fields.explicit_decision, "approved", "approved lifecycle child requires explicit approved decision");
    assert.match(fields.exact_target_or_scope, /^(?!<required).+$/, "approved lifecycle child requires exact non-placeholder target/scope");
    assert.match(fields.evidence_retention_location, /^(?!<required).+$/, "approved lifecycle child requires exact non-placeholder retention");
    assert.equal(fields.approval, "approved", "future approved child requires approved authority");
    assert.equal(fields.target, "exact", "future approved child requires exact target/scope");
    assert.equal(fields.fingerprint_bound, "yes", "future approved child requires fingerprint binding");
    if (["approved-not-started", "running", "satisfied"].includes(state)) assert.equal(fields.freshness, "fresh", "eligible lifecycle state requires fresh evidence");
    assert.equal(fields.dependent_stop_result, ["partial-stop", "stale", "invalidated"].includes(state) ? "derived-canonical-reverse-dependency-graph" : "not-applicable", "child dependent-stop result must follow the lifecycle state");
  } else {
    assert.equal(fields.prior_approved_or_started, "yes", "degraded child must retain its prior approval/start metadata");
    assert.match(fields.approval_id, /^(?!<required)[A-Za-z0-9-]+$/);
    assert.equal(fields.explicit_decision, "approved");
    assert.match(fields.exact_target_or_scope, /^(?!<required).+$/);
    assert.match(fields.evidence_retention_location, /^(?!<required).+$/);
    assert.match(fields.stop_or_drift_cause, /^(?!<required|N\/A).+$/, "degraded child state requires a truthful stop or drift cause");
    assert.equal(fields.dependent_stop_result, ["partial-stop", "stale", "invalidated"].includes(state) ? "derived-canonical-reverse-dependency-graph" : "not-applicable");
  }
  assert.ok(fields.requested_operation && fields.time_window && fields.operator && fields.bound_input && fields.effective_date && fields.required_approver, "child must expose individual operation and judgment fields");
  if (expected.id === "A2-provider-funding-external-prerequisite-reference") {
    assert.ok(["undetermined", "not-needed", "already-available", "needed-absent"].includes(fields.funding_requirement_state), "provider funding state must be explicit");
    assert.equal(fields.conditional_required_when, "positive-funded-headroom-required-and-absent");
    assert.equal(fields.funding_decision_basis_child, "A0-provisional-cost-model-input");
    if (state === "unapproved") {
      assert.ok(["undetermined", "not-needed", "already-available", "needed-absent"].includes(fields.funding_requirement_state), "unapproved external-lane reference requires a closed or undetermined funding state");
      if (fields.funding_requirement_state === "undetermined") {
        assert.equal(fields.funding_owner_approval_record_fingerprint, "N/A", "undetermined funding reference cannot bind an owner approval record");
        assert.equal(fields.funding_disposition_record_fingerprint, "N/A", "undetermined funding reference cannot bind a disposition record");
        assert.equal(fields.funding_external_result_fingerprint, "N/A", "undetermined funding reference cannot bind an external result");
      } else {
        assert.match(fields.funding_owner_approval_record_fingerprint, sanitizedFingerprintPattern, "a factual disposition on an unapproved external lane requires a separate owner approval fingerprint");
        assert.match(fields.funding_disposition_record_fingerprint, sanitizedFingerprintPattern, "a factual disposition on an unapproved external lane requires a separate disposition record fingerprint");
        assert.equal(fields.funding_external_result_fingerprint, "N/A", "an unapproved external lane cannot claim an external result");
      }
    }
    else if (["approved-not-started", "running", "complete-not-closure-eligible", "satisfied"].includes(state)) {
      assertFundingDecisionBinding(fields);
    }
  }
  if (expected.id === "A1-worker-cpu-source-disposition") {
    if (state === "unapproved") assert.equal(fields.source_disposition_outcome, "<required-approved-safe-source-selected-or-retain-no-go>");
    else if (["approved-not-started", "running", "complete-not-closure-eligible", "satisfied"].includes(state)) assert.ok(["approved-safe-source-selected", "retain-no-go"].includes(fields.source_disposition_outcome), "source disposition requires an explicit safe-source or retain-no-go outcome");
  }
  if (expected.id === "B1-deployed-target-proof") {
    const placeholder = state === "unapproved";
    assert.match(fields.expected_target_alias, placeholder ? /^<required-approved-deployed-target-alias>$/ : /^approved-deployed-target-[A-Za-z0-9-]+$/, "B1 requires an exact approved expected target alias");
    assert.match(fields.expected_commit_alias, placeholder ? /^<required-approved-deployed-commit-alias>$/ : /^approved-deployed-commit-[A-Za-z0-9-]+$/, "B1 requires an exact approved expected commit alias");
    assert.match(fields.proof_record_fingerprint, placeholder ? /^<required-sha256-proof-record-fingerprint>$/ : sanitizedFingerprintPattern, "B1 requires an independent proof-record fingerprint binding");
    assert.equal(fields.requested_operation, b1DeployedTargetProofReadOnlyOperation, "B1 approval requested operation must be exact read-only proof collection");
    if (["running", "complete-not-closure-eligible", "satisfied"].includes(state)) {
      for (const field of ["source_timestamp", "deployed_target_binding", "deployed_commit_binding"]) assert.equal(fields[field], "N/A", `B1 child must not synthesize ${field} from itself`);
    }
  }
  if (expected.id === "B2-live-paid-flow-evidence") {
    const placeholder = state === "unapproved";
    if (!placeholder && fields.explicit_decision === "approved" && (fields.approval === "approved" || fields.prior_approved_or_started === "yes")) validateApprovedB2ApprovalScope(fields, `B2 ${state} approval scope`);
    assert.match(fields.b2_aggregate_record_fingerprint, placeholder ? /^<required-sha256-aggregate-record-fingerprint>$/ : ["approved-not-started", "running", "partial-stop", "stale", "invalidated", "incomplete"].includes(state) ? /^N\/A$/ : sanitizedFingerprintPattern, "B2 requires an independently parsed aggregate-record fingerprint binding");
    if (["approved-not-started", "running", "partial-stop", "stale", "invalidated", "incomplete"].includes(state)) {
      assert.equal(fields.b2_scenario_result_ids, "N/A", "running B2 must not claim completed scenario results");
      assert.equal(fields.result_fingerprint, "N/A", "running B2 must not claim a completed aggregate result fingerprint");
    }
  }
  if (["A5-legal-judgment", "A6-copy-judgment"].includes(expected.id)) {
    assert.match(fields.judgment_record_fingerprint, state === "unapproved" ? /^<required-sha256-judgment-record-fingerprint>$/ : sanitizedFingerprintPattern, `${expected.id} child requires its exact non-evidence or actual judgment-record fingerprint`);
  }
  if (expected.type === "judgment") {
    assert.equal(fields.requested_operation, "N/A"); assert.equal(fields.time_window, "N/A"); assert.equal(fields.operator, "N/A");
    assert.match(fields.bound_input, state === "unapproved"
      ? (fields.child_id === "A5-legal-judgment" ? /^<required-exact-A4-artifact-fingerprint>$/ : fields.child_id === "A6-copy-judgment" ? /^<required-exact-copy-A4-A5-artifact-composite>$/ : /^<required-bound-input>$/)
      : /^(?!<required)/);
    assert.match(fields.effective_date, state === "unapproved" ? /^<required-effective-date>$/ : /^(?!<required)/);
    assert.match(fields.required_approver, state === "unapproved" ? /^<required-named-approver>$/ : /^(?!<required)/);
  } else if (expected.type === "executable") {
    assert.equal(fields.bound_input, "N/A"); assert.equal(fields.effective_date, "N/A"); assert.equal(fields.required_approver, "N/A");
    if (expected.id !== "B1-deployed-target-proof") assert.match(fields.requested_operation, state === "unapproved" ? /^<required-exact-requested-operation>$/ : /^(?!<required)/);
    assert.match(fields.time_window, state === "unapproved" ? /^<required-exact-time-window>$/ : /^(?!<required)/);
    assert.match(fields.operator, state === "unapproved" ? /^<required-exact-operator>$/ : /^(?!<required)/);
  } else if (expected.type === "external-prerequisite-reference") {
    for (const field of ["requested_operation", "time_window", "operator", "bound_input", "effective_date", "required_approver"]) assert.equal(fields[field], "N/A");
    assert.equal(fields.row_closure_effect, "none", "external reference cannot close a row");
  } else if (expected.type === "executable-or-judgment") {
    if (state === "unapproved") {
      assert.equal(fields.selected_mode, "unselected"); assert.equal(fields.selected_approval_unit, "N/A");
      for (const field of ["requested_operation", "time_window", "operator", "bound_input", "effective_date", "required_approver"]) assert.match(fields[field], /^<required-.*-or-N-A>$/);
    } else if (fields.selected_mode === "read") {
      assert.equal(fields.selected_approval_unit, "authenticated-private-read");
      for (const field of ["requested_operation", "time_window", "operator"]) assert.match(fields[field], /^(?!<required|N\/A).+$/);
      for (const field of ["bound_input", "effective_date", "required_approver"]) assert.equal(fields[field], "N/A");
    } else if (fields.selected_mode === "judgment") {
      assert.equal(fields.selected_approval_unit, "release-owner-judgment");
      for (const field of ["requested_operation", "time_window", "operator"]) assert.equal(fields[field], "N/A");
      for (const field of ["bound_input", "effective_date", "required_approver"]) assert.match(fields[field], /^(?!<required|N\/A).+$/);
    } else {
      assert.fail("Stripe child requires exactly one read or judgment mode");
    }
  }
}

function satisfiedPrerequisite(overrides = {}) {
  return { status: "satisfied", freshness: "fresh", target: "exact", approval: "approved", fingerprint_bound: "yes", stale: false, invalidated: false, ...overrides };
}

function assertPrerequisiteState(childId, state) {
  assert.ok(state, `${childId} prerequisite state is required`);
  assert.equal(state.status, "satisfied", `${childId} must be satisfied`);
  assert.equal(state.freshness, "fresh", `${childId} must be fresh`);
  assert.equal(state.target, "exact", `${childId} must be exact`);
  assert.equal(state.approval, "approved", `${childId} must be approved`);
  assert.equal(state.fingerprint_bound, "yes", `${childId} must be fingerprint-bound`);
  assert.equal(state.stale, false, `${childId} must not be stale`);
  assert.equal(state.invalidated, false, `${childId} must not be invalidated`);
}

function assertStateObjectPrerequisites(child, prerequisiteStates, fundingRequirementState) {
  if (child === "A2-provider-cost-evidence-read") assert.ok(["not-needed", "already-available", "needed-absent"].includes(fundingRequirementState), "funding requirement state must be explicit for eligibility");
  const prerequisites = (canonicalChildDependencies[child] ?? []).filter((prerequisite) => !(child === "A2-provider-cost-evidence-read" && prerequisite === "A2-provider-funding-external-prerequisite-reference" && fundingRequirementState !== "needed-absent"));
  for (const prerequisite of prerequisites) assertPrerequisiteState(prerequisite, prerequisiteStates.get(prerequisite));
  if (child === "A1-worker-cpu-evidence-read") assert.equal(prerequisiteStates.get("A1-worker-cpu-source-disposition").source_disposition_outcome, "approved-safe-source-selected", "retain-no-go source disposition must not unlock the CPU read");
}

const canonicalChildDependencies = {
  "A1-worker-cpu-evidence-read": ["A1-worker-cpu-source-disposition"],
  "A2-provider-cost-evidence-read": ["A0-provisional-cost-model-input", "A2-provider-funding-external-prerequisite-reference"],
  "A3-stripe-source-applicability-read-or-judgment": ["A0-provisional-cost-model-input"],
  "A4-product-price-judgment": ["A2-provider-cost-evidence-read", "A3-stripe-source-applicability-read-or-judgment"],
  "A5-legal-judgment": ["A4-product-price-judgment"],
  "A6-copy-judgment": ["A4-product-price-judgment", "A5-legal-judgment"],
  "B1-deployed-target-proof": ["A1-worker-cpu-evidence-read", "A4-product-price-judgment", "A5-legal-judgment", "A6-copy-judgment", "B1-external-prerequisite-sanitized-result-reference"],
  "B2-live-paid-flow-evidence": ["B1-deployed-target-proof"]
};

function canonicalDependentChildren(childId, fundingRequirementState) {
  if (childId === "A2-provider-funding-external-prerequisite-reference") assert.ok(["not-needed", "already-available", "needed-absent"].includes(fundingRequirementState), "funding state is required for funding-reference invalidation");
  const stopped = new Set();
  const visit = (id) => {
    for (const [candidate, prerequisites] of Object.entries(canonicalChildDependencies)) {
      if (prerequisites.includes(id) && !stopped.has(candidate)) { stopped.add(candidate); visit(candidate); }
    }
  };
  visit(childId);
  return [...stopped].sort();
}

function assertFundingDecisionBinding(fields) {
  assert.equal(fields?.child_id, "A2-provider-funding-external-prerequisite-reference", "A2 closure requires the parsed provider-funding prerequisite record");
  assert.equal(fields.funding_decision_basis_child, "A0-provisional-cost-model-input");
  assert.equal(fields.funding_decision_basis_status, "satisfied");
  assert.equal(fields.funding_decision_basis_freshness, "fresh");
  assert.equal(fields.funding_decision_basis_target, "exact");
  assert.equal(fields.funding_decision_basis_approval, "approved");
  assert.equal(fields.funding_decision_basis_fingerprint_bound, "yes");
}

function fundingRequirementStateFromParsedChild(fundingPrerequisiteRecord) {
  const fields = fundingPrerequisiteRecord?.fields ?? fundingPrerequisiteRecord;
  assert.equal(fields?.child_id, "A2-provider-funding-external-prerequisite-reference", "A2 closure requires the parsed provider-funding prerequisite record");
  assert.ok(["not-needed", "already-available", "needed-absent"].includes(fields.funding_requirement_state), "A2 closure requires an explicit parsed funding state");
  assertFundingDecisionBinding(fields);
  return fields.funding_requirement_state;
}

function transitionChildLifecycle({ child, rowStatus, to, prerequisiteStates, fundingPrerequisiteRecord, fundingDispositionOwnerApprovalRecord, fundingDispositionResultRecord, fundingDispositionA0Child }) {
  const nextStatus = assertStagedTransition(child.child_status, to, rowStatus);
  const requiresParsedFundingState =
    (child.child_id === "A2-provider-cost-evidence-read" && ["running", "complete-not-closure-eligible", "satisfied"].includes(to)) ||
    (child.child_id === "A2-provider-funding-external-prerequisite-reference" && ["partial-stop", "stale", "invalidated"].includes(to));
  const fundingRequirementState = requiresParsedFundingState ? fundingRequirementStateFromParsedChild(fundingPrerequisiteRecord) : undefined;
  if (child.child_id === "A2-provider-cost-evidence-read" && ["running", "complete-not-closure-eligible", "satisfied"].includes(to)) {
    assert.ok(fundingDispositionOwnerApprovalRecord, "A2 lifecycle requires a separate parsed A2 funding-disposition owner approval");
    assert.ok(fundingDispositionResultRecord, "A2 lifecycle requires a separate parsed A2 funding-disposition result");
    assert.ok(fundingDispositionA0Child, "A2 lifecycle requires the actual completed A0 child");
    validateCompletedA0RegistryState(fundingDispositionA0Child);
    validateA2FundingRequirementDispositionResultRecord(
      fundingDispositionResultRecord,
      fundingPrerequisiteRecord?.fields ?? fundingPrerequisiteRecord,
      fundingDispositionOwnerApprovalRecord,
      fundingDispositionA0Child
    );
  }
  const dependentChildren = canonicalDependentChildren(child.child_id, fundingRequirementState).map((id) => ({ id, status: "stopped" }));
  if (to === "partial-stop") return { childStatus: "partial-stop", rowStatus, dependentChildren, rowClosure: "none" };
  if (to === "running" || to === "complete-not-closure-eligible") {
    assertStateObjectPrerequisites(child.child_id, prerequisiteStates, fundingRequirementState);
    return { childStatus: nextStatus, rowStatus, dependentChildren: [], rowClosure: "none" };
  }
  if (to === "satisfied") {
    assertStateObjectPrerequisites(child.child_id, prerequisiteStates, fundingRequirementState);
    assertPrerequisiteState(child.child_id, child);
    assert.match(child.row_closure_effect, /^EVID-[A-Z-]+-only-after-satisfied$/);
    return { childStatus: "satisfied", rowStatus: "satisfied", dependentChildren: [], rowClosure: child.row_closure_effect };
  }
  if (to === "stale" || to === "invalidated") return { childStatus: nextStatus, rowStatus: "incomplete", dependentChildren, rowClosure: "none" };
  return { childStatus: nextStatus, rowStatus, dependentChildren: [], rowClosure: "none" };
}

function assertFirstGoalBoundary(fullLedger) {
  const unresolved = fullLedger.filter((row) => row.hardRequirement === "yes" && row.status !== "satisfied").map((row) => row.id);
  assert.deepEqual(unresolved, ["EVID-RISK-ACCEPTANCE"], "first-goal full ledger must leave Risk Acceptance alone unresolved");
  return { unresolved, count: unresolved.length, decision: "no-go", activation: "closed", free: "permanent", ncL1: "not-started" };
}

const stagedManifestSection = sectionBody(readiness, "## NC-R1 Eight-Row Staged Resolution Control-Plane Manifest");
const parsedManifestFields = parseExactTextBlock(stagedManifestSection);
assert.deepEqual(parsedManifestFields, stagedManifestFields, "readiness manifest fields must be exact");
assert.equal(parsedManifestFields.manifest_phase, "manifest-creation");
assert.match(checklist, /manifest_phase=manifest-creation/, "checklist must retain the readiness manifest phase");
assert.throws(() => assertChangedPathsForPhase([
  ...currentChangedPaths(),
  "docs/superpowers/specs/2026-08-09-nc-r1-eight-row-staged-resolution-design.md"
], "child-result-run"), /outside its approved allowlist/);
assert.match(stagedManifestSection, /approval effect `none`, closes no evidence row, and authorizes no operation/i, "manifest must retain zero-effect boundary");
assert.match(stagedManifestSection, /Migration, configuration\/binding, Git, merge, and deploy execution remain outside NC-R1/, "external execution must remain outside NC-R1");
assert.match(stagedManifestSection, /A1-worker-cpu-source-disposition.*required prerequisite child.*A1-worker-cpu-evidence-read/, "manifest must bind Worker CPU source disposition before read");
assert.match(stagedManifestSection, /required only when positive funded headroom is required and absent/, "manifest must retain conditional provider funding reference");
const parsedStagedRows = validateStagedRows(parseStagedRows(checklist));
assert.equal(parsedStagedRows.length, 8);
assertParsedNonAuthorizingControlPlane(parsedManifestFields, parseStagedRows(checklist), parseStagedChildren(checklist));
assert.throws(() => {
  const mutatedChecklist = checklist.replace("funding_requirement_state=undetermined", "funding_requirement_state=undetermined\nfunding_authorizes=approved");
  assertParsedNonAuthorizingControlPlane(parsedManifestFields, parseStagedRows(mutatedChecklist), parseStagedChildren(mutatedChecklist));
}, /must not directly authorize/);
for (const operation of ["deploy", "live_flow", "activation", "migration", "config", "binding", "git_publication", "public_paid_gate", "cleanup"]) {
  assert.throws(() => {
    const mutatedChecklist = checklist.replace("funding_requirement_state=undetermined", `funding_requirement_state=undetermined\n${operation}_authorizes=approved`);
    assertParsedNonAuthorizingControlPlane(parsedManifestFields, parseStagedRows(mutatedChecklist), parseStagedChildren(mutatedChecklist));
  }, /must not directly authorize/);
}
assert.throws(() => {
  const mutatedChecklist = checklist.replace("funding_requirement_state=undetermined", "funding_requirement_state=undetermined\nfunding_authorizes=approved-not-started");
  assertParsedNonAuthorizingControlPlane(parsedManifestFields, parseStagedRows(mutatedChecklist), parseStagedChildren(mutatedChecklist));
}, /must not directly authorize/, "parsed control plane must reject approved-not-started authority disguised by a not token");
assert.throws(() => {
  const mutatedChildren = parseStagedChildren(checklist.replace("funding_requirement_state=undetermined", "funding_requirement_state=undetermined\nfunding_permission=approved"));
  validateStagedChildren(mutatedChildren, parsedStagedRows);
}, /unknown field/, "staged child registry must reject authority-expanding unknown fields regardless of synonym");
assert.doesNotThrow(() => validateStagedRows(parseStagedRows(checklist).map((row) => row.headingId === "EVID-WORKER-CPU" ? { ...row, fields: { ...row.fields, row_group_status: "approved-not-started", child_approval_id: "NC-R1-FUTURE-A1-01", child_explicit_approval_decision: "approved", child_exact_target_or_scope: "exact-worker-cpu-scope", child_evidence_retention_location: "sanitized-retention", row_freshness: "fresh", row_target: "exact", row_approval: "approved", row_fingerprint_bound: "yes", row_dependent_stop_result: "not-applicable" } } : row)));
const parsedStagedChildren = validateStagedChildren(parseStagedChildren(checklist), parsedStagedRows);
assert.equal(parsedStagedChildren.length, 12, "every prerequisite and closing child must have its own record");
const completedA0RegistryChild = parsedStagedChildren.find((child) => child.headingId === "A0-provisional-cost-model-input").fields;
validateCompletedA0RegistryState(completedA0RegistryChild);
assert.throws(
  () => validateCompletedA0RegistryState({ ...completedA0RegistryChild, child_status: "approved-not-started" }),
  /must be satisfied/
);
assert.throws(
  () => validateCompletedA0RegistryState({ ...completedA0RegistryChild, fingerprint_bound: "no" }),
  /must retain deterministic fingerprint binding/
);
for (const field of ["approval_fingerprint", "cost_model_input_fingerprint", "cost_model_result_fingerprint", "bound_artifact_fingerprint"]) {
  assert.throws(
    () => validateCompletedA0RegistryState({ ...completedA0RegistryChild, [field]: fixtureFingerprint(`mutated-${field}`) }),
    /deterministic sanitized/,
    `completed A0 registry must reject ${field} drift`
  );
}
function assertParsedRegistrySchema(childId, expectedFields) {
  const fields = parsedStagedChildren.find((child) => child.headingId === childId)?.fields;
  assert.ok(fields, `registry requires ${childId}`);
  for (const [field, expectedValue] of Object.entries(expectedFields)) assert.equal(fields[field], expectedValue, `${childId} registry schema must retain ${field}`);
}
const completedA1SourceDispositionPacket = parseExactTextBlock(sectionBody(checklist, "## Completed A1 Worker CPU Source-Disposition Approval"));
assert.deepEqual(completedA1SourceDispositionPacket, {
  packet_execution_status: "approved-completed-release-owner-judgment",
  packet_item_count: "1",
  approval_unit: "release-owner-judgment",
  child_id: "A1-worker-cpu-source-disposition",
  evidence_id: "EVID-WORKER-CPU",
  requested_operation: "release-owner-judgment-worker-cpu-evidence-source-disposition-only",
  command: "<no-command-authorized>",
  external_action: "none",
  required_approver: "kurodev",
  approval_id: "NC-R1-WORKER-CPU-SOURCE-DISPOSITION-20260809-01",
  scope_alias: "creator-production-worker-cpu-source-disposition",
  effective_date: "2026-08-09",
  decision_input: "completed-worker-cpu-reread-partial-stop-plus-official-cloudflare-public-source-assessment",
  owner_decision: "approved-safe-source-selected",
  next_evidence_source: "cloudflare-graphql-workersInvocationsAdaptive-aggregated-only",
  target_alias: "creator-production-worker",
  sampling_posture: "adaptive-sampling-disclosure-required",
  request_completeness_posture: "partial-stop-unless-explicit-completeness-is-provable",
  evidence_retention_location: "current-Codex-task-sanitized-report",
  stop_owner: "kurodev",
  rollback_owner: "kurodev",
  default_incremental_spend_jpy: "0",
  stop_before_any_incremental_charge: "yes",
  prohibited_bundle: "Trace,Workers-Logs,raw-requests,private-identifiers,provider,Stripe,Supabase,Product-or-Price,legal,copy,risk,live,deploy,activation,git-publication,cleanup",
  row_closure: "none-this-packet",
  production_proof: "no",
  activation_status: "closed",
  approval_decision: "approved"
}, "A1 source-disposition approval packet must remain exact and one-item-only");
assert.deepEqual(
  parseExactTextBlock(sectionBody(readiness, "## Completed A1 Worker CPU Source-Disposition Approval")),
  completedA1SourceDispositionPacket,
  "readiness and checklist must retain the same exact completed A1 source-disposition approval packet"
);
const completedA1WorkerCpuGraphqlPartialStopPacket = parseExactTextBlock(sectionBody(checklist, "## Completed Approved Worker CPU GraphQL Partial-Stop"));
assert.deepEqual(completedA1WorkerCpuGraphqlPartialStopPacket, {
  packet_execution_status: "approved-partial-stop-authenticated-private-read",
  packet_item_count: "1",
  approval_unit: "authenticated-private-read",
  child_id: "A1-worker-cpu-evidence-read",
  evidence_id: "EVID-WORKER-CPU",
  requested_operation: "cloudflare-graphql-schema-capability-and-one-workersInvocationsAdaptive-aggregated-query-only",
  target_alias: "creator-production-worker",
  verification_scope: "cpuTimeP50,cpuTimeP99,sum.requests,sampling-metadata,confidence-metadata,response-errors-and-query-completeness-only",
  query_time_range: "2026-08-08T00:00:00+09:00/2026-08-08T23:59:59+09:00",
  operator: "Codex-root-agent-current-task",
  required_approver: "kurodev",
  approval_id: "NC-R1-WORKER-CPU-GRAPHQL-20260809-01",
  evidence_retention_location: "current-Codex-task-sanitized-report",
  stop_owner: "kurodev",
  rollback_owner: "kurodev",
  default_incremental_spend_jpy: "0",
  stop_before_any_incremental_charge: "yes",
  observed_at: "2026-08-09T19:53:27+09:00",
  credential_account_worker_env_path: "absent-boolean-only",
  cloudflare_connector: "unavailable",
  authenticated_in_app_dashboard_session: "available",
  schema_capability_query_attempt_count: "1",
  account_tag_or_worker_script_identifier_retained: "no",
  transport_result: "failed-before-http-or-graphql-response-classification",
  schema_type_dataset_capability: "unconfirmed",
  data_query_execution: "not-executed",
  cpu_request_sampling_confidence_metrics_observed: "none",
  query_completeness: "unavailable",
  raw_response_credential_token_account_tag_private_script_name_retained: "no",
  prohibited_surfaces_opened: "none",
  incremental_charge_authorized: "no",
  incremental_charge_accepted: "no",
  stop_condition: "schema-unavailable-response-unavailable",
  row_closure: "none",
  production_proof: "no",
  activation_status: "closed",
  result: "partial-stop-no-data-query"
}, "approved Worker CPU GraphQL packet must retain exactly one sanitized partial-stop result");
assert.deepEqual(
  parseExactTextBlock(sectionBody(readiness, "## Completed Approved Worker CPU GraphQL Partial-Stop")),
  completedA1WorkerCpuGraphqlPartialStopPacket,
  "readiness and checklist must retain the same exact Worker CPU GraphQL partial-stop packet"
);
assert.deepEqual(
  completedWorkerCpuExecutionPathDispositionPacket.fields,
  canonicalCompletedWorkerCpuExecutionPathDispositionPacketFields,
  "completed A1 Worker CPU execution-path disposition must retain the exact approved owner selection"
);
assert.deepEqual(
  parseExactTextBlock(sectionBody(readiness, "## Completed A1 Worker CPU GraphQL Execution-Path Disposition Approval")),
  completedWorkerCpuExecutionPathDispositionPacket.fields,
  "readiness and checklist must retain the same exact completed Worker CPU execution-path disposition"
);
const approvedNotStartedA1WorkerCpuSchemaManualPacket = parseExactTextBlock(sectionBody(checklist, "## Approved-Not-Started Worker CPU Manual Schema-Capability Packet"));
assert.deepEqual(
  approvedNotStartedA1WorkerCpuSchemaManualPacket,
  canonicalNextApprovalPacketFields,
  "approved-not-started A1 Worker CPU schema-capability-only packet must remain exact and owner-approved without an observed result"
);
assert.deepEqual(
  parseExactTextBlock(sectionBody(readiness, "## Approved-Not-Started Worker CPU Manual Schema-Capability Packet")),
  approvedNotStartedA1WorkerCpuSchemaManualPacket,
  "readiness and checklist must retain the same exact approved-not-started Worker CPU schema-capability packet"
);
assert.deepEqual(
  parseExactTextBlock(sectionBody(checklist, "## Exact Non-Evidence Worker CPU Manual Schema-Capability Result Template")),
  canonicalWorkerCpuSchemaManualResultTemplateFields,
  "checklist must retain the exact non-evidence Worker CPU manual schema-capability result template"
);
assert.deepEqual(
  parseExactTextBlock(sectionBody(readiness, "## Exact Non-Evidence Worker CPU Manual Schema-Capability Result Template")),
  canonicalWorkerCpuSchemaManualResultTemplateFields,
  "readiness must retain the exact non-evidence Worker CPU manual schema-capability result template"
);
assert.deepEqual(
  parseExactTextBlock(sectionBody(checklist, "## Exact Non-Evidence A1 Worker CPU Observed Result Template")),
  canonicalA1WorkerCpuObservedResultTemplateFields,
  "checklist must retain the exact non-evidence A1 Worker CPU observed-result template"
);
assert.deepEqual(
  parseExactTextBlock(sectionBody(readiness, "## Exact Non-Evidence A1 Worker CPU Observed Result Template")),
  canonicalA1WorkerCpuObservedResultTemplateFields,
  "readiness must retain the exact non-evidence A1 Worker CPU observed-result template"
);
const completedA1SourceDispositionChild = parsedStagedChildren.find((child) => child.headingId === "A1-worker-cpu-source-disposition").fields;
assert.deepEqual({
  child_status: completedA1SourceDispositionChild.child_status,
  freshness: completedA1SourceDispositionChild.freshness,
  target: completedA1SourceDispositionChild.target,
  approval: completedA1SourceDispositionChild.approval,
  fingerprint_bound: completedA1SourceDispositionChild.fingerprint_bound,
  approval_id: completedA1SourceDispositionChild.approval_id,
  explicit_decision: completedA1SourceDispositionChild.explicit_decision,
  exact_target_or_scope: completedA1SourceDispositionChild.exact_target_or_scope,
  bound_input: completedA1SourceDispositionChild.bound_input,
  effective_date: completedA1SourceDispositionChild.effective_date,
  required_approver: completedA1SourceDispositionChild.required_approver,
  source_disposition_outcome: completedA1SourceDispositionChild.source_disposition_outcome,
  evidence_retention_location: completedA1SourceDispositionChild.evidence_retention_location,
  stop_owner: completedA1SourceDispositionChild.stop_owner,
  rollback_owner: completedA1SourceDispositionChild.rollback_owner
}, {
  child_status: "satisfied",
  freshness: "fresh",
  target: "exact",
  approval: "approved",
  fingerprint_bound: "yes",
  approval_id: "NC-R1-WORKER-CPU-SOURCE-DISPOSITION-20260809-01",
  explicit_decision: "approved",
  exact_target_or_scope: "creator-production-worker-cpu-source-disposition",
  bound_input: "completed-worker-cpu-reread-partial-stop-plus-official-cloudflare-public-source-assessment",
  effective_date: "2026-08-09",
  required_approver: "kurodev",
  source_disposition_outcome: "approved-safe-source-selected",
  evidence_retention_location: "current-Codex-task-sanitized-report",
  stop_owner: "kurodev",
  rollback_owner: "kurodev"
}, "only the approved A1 source-disposition child may become satisfied");
assert.equal(completedA1SourceDispositionChild.approval_fingerprint, deriveApprovalFingerprint(completedA1SourceDispositionChild), "A1 source-disposition approval fingerprint must be deterministically derived");
assert.equal(completedA1SourceDispositionChild.result_fingerprint, deriveA1SourceDispositionFingerprint(completedA1SourceDispositionChild, completedA1SourceDispositionChild.approval_fingerprint), "A1 source-disposition result fingerprint must be deterministically derived");
const completedA1WorkerCpuGraphqlPartialStopChild = parsedStagedChildren.find((child) => child.headingId === "A1-worker-cpu-evidence-read").fields;
assert.deepEqual({
  child_status: completedA1WorkerCpuGraphqlPartialStopChild.child_status,
  freshness: completedA1WorkerCpuGraphqlPartialStopChild.freshness,
  target: completedA1WorkerCpuGraphqlPartialStopChild.target,
  approval: completedA1WorkerCpuGraphqlPartialStopChild.approval,
  fingerprint_bound: completedA1WorkerCpuGraphqlPartialStopChild.fingerprint_bound,
  approval_id: completedA1WorkerCpuGraphqlPartialStopChild.approval_id,
  explicit_decision: completedA1WorkerCpuGraphqlPartialStopChild.explicit_decision,
  exact_target_or_scope: completedA1WorkerCpuGraphqlPartialStopChild.exact_target_or_scope,
  requested_operation: completedA1WorkerCpuGraphqlPartialStopChild.requested_operation,
  time_window: completedA1WorkerCpuGraphqlPartialStopChild.time_window,
  operator: completedA1WorkerCpuGraphqlPartialStopChild.operator,
  observed_at: completedA1WorkerCpuGraphqlPartialStopChild.observed_at,
  transport_result: completedA1WorkerCpuGraphqlPartialStopChild.transport_result,
  data_query_execution: completedA1WorkerCpuGraphqlPartialStopChild.data_query_execution,
  query_completeness: completedA1WorkerCpuGraphqlPartialStopChild.query_completeness,
  stop_or_drift_cause: completedA1WorkerCpuGraphqlPartialStopChild.stop_or_drift_cause,
  row_closure_effect: completedA1WorkerCpuGraphqlPartialStopChild.row_closure_effect,
  dependent_stop_result: completedA1WorkerCpuGraphqlPartialStopChild.dependent_stop_result
}, {
  child_status: "partial-stop",
  freshness: "fresh",
  target: "unconfirmed",
  approval: "approved",
  fingerprint_bound: "yes",
  approval_id: "NC-R1-WORKER-CPU-GRAPHQL-20260809-01",
  explicit_decision: "approved",
  exact_target_or_scope: "creator-production-worker-graphql-schema-capability-and-workersInvocationsAdaptive-aggregated-query-scope",
  requested_operation: "cloudflare-graphql-schema-capability-and-one-workersInvocationsAdaptive-aggregated-query-only",
  time_window: "2026-08-08T00:00:00+09:00/2026-08-08T23:59:59+09:00",
  operator: "Codex-root-agent-current-task",
  observed_at: "2026-08-09T19:53:27+09:00",
  transport_result: "failed-before-http-or-graphql-response-classification",
  data_query_execution: "not-executed",
  query_completeness: "unavailable",
  stop_or_drift_cause: "schema-unavailable-response-unavailable-before-data-query",
  row_closure_effect: "EVID-WORKER-CPU-only-after-satisfied",
  dependent_stop_result: "derived-canonical-reverse-dependency-graph"
}, "Worker CPU GraphQL child must retain the approved partial-stop lifecycle without claiming result completion");
for (const satisfiedOnlyField of ["satisfied_result", "aggregation_complete", "request_completeness", "headroom_disposition"]) {
  assert.equal(completedA1WorkerCpuGraphqlPartialStopChild[satisfiedOnlyField], undefined, `Worker CPU GraphQL partial stop must not retain satisfied-result field ${satisfiedOnlyField}`);
}
assert.equal(completedA1WorkerCpuGraphqlPartialStopChild.approval_fingerprint, deriveApprovalFingerprint(completedA1WorkerCpuGraphqlPartialStopChild), "Worker CPU GraphQL partial stop approval fingerprint must bind the exact approved packet");
assert.equal(completedA1WorkerCpuGraphqlPartialStopChild.source_disposition_fingerprint, completedA1SourceDispositionChild.result_fingerprint, "Worker CPU GraphQL partial stop must bind the completed source-disposition fingerprint");
assert.equal(completedA1WorkerCpuGraphqlPartialStopChild.result_fingerprint, deriveSanitizedFingerprint("a1-worker-cpu-partial-stop", [
  ["approval_fingerprint", completedA1WorkerCpuGraphqlPartialStopChild.approval_fingerprint],
  ["source_disposition_fingerprint", completedA1WorkerCpuGraphqlPartialStopChild.source_disposition_fingerprint],
  ["observed_at", completedA1WorkerCpuGraphqlPartialStopChild.observed_at],
  ["credential_account_worker_env_path", completedA1WorkerCpuGraphqlPartialStopChild.credential_account_worker_env_path],
  ["cloudflare_connector", completedA1WorkerCpuGraphqlPartialStopChild.cloudflare_connector],
  ["authenticated_in_app_dashboard_session", completedA1WorkerCpuGraphqlPartialStopChild.authenticated_in_app_dashboard_session],
  ["schema_capability_query_attempt_count", completedA1WorkerCpuGraphqlPartialStopChild.schema_capability_query_attempt_count],
  ["transport_result", completedA1WorkerCpuGraphqlPartialStopChild.transport_result],
  ["schema_type_dataset_capability", completedA1WorkerCpuGraphqlPartialStopChild.schema_type_dataset_capability],
  ["data_query_execution", completedA1WorkerCpuGraphqlPartialStopChild.data_query_execution],
  ["cpu_request_sampling_confidence_metrics_observed", completedA1WorkerCpuGraphqlPartialStopChild.cpu_request_sampling_confidence_metrics_observed],
  ["query_completeness", completedA1WorkerCpuGraphqlPartialStopChild.query_completeness],
  ["stop_condition", completedA1WorkerCpuGraphqlPartialStopChild.stop_condition],
  ["target_verification", completedA1WorkerCpuGraphqlPartialStopChild.target_verification]
]), "Worker CPU GraphQL partial-stop result fingerprint must be deterministic and sanitized");
assertParsedRegistrySchema("A0-provisional-cost-model-input", {
  approval_id: "NC-R1-A0-PROVISIONAL-COST-MODEL-20260809-01",
  child_status: "satisfied",
  freshness: "fresh",
  target: "exact",
  approval: "approved",
  fingerprint_bound: "yes",
  judgment_effective_date: "2026-08-09"
});
assertParsedRegistrySchema("A2-provider-funding-external-prerequisite-reference", {
  funding_requirement_state: "undetermined",
  funding_decision_basis_child: "A0-provisional-cost-model-input",
  funding_decision_basis_status: "satisfied",
  funding_decision_basis_freshness: "fresh",
  funding_decision_basis_target: "exact",
  funding_decision_basis_approval: "approved",
  funding_decision_basis_fingerprint_bound: "yes",
  child_status: "unapproved",
  approval: "unapproved",
  fingerprint_bound: "no"
});
assertParsedRegistrySchema("A1-worker-cpu-evidence-read", {
  observed_at: "2026-08-09T19:53:27+09:00",
  source_timestamp: "2026-08-09T19:53:27+09:00",
  credential_account_worker_env_path: "absent-boolean-only",
  cloudflare_connector: "unavailable",
  authenticated_in_app_dashboard_session: "available",
  schema_capability_query_attempt_count: "1",
  transport_result: "failed-before-http-or-graphql-response-classification",
  schema_type_dataset_capability: "unconfirmed",
  data_query_execution: "not-executed",
  cpu_request_sampling_confidence_metrics_observed: "none",
  query_completeness: "unavailable",
  target_verification: "not-confirmed-no-account-tag-or-worker-script-identifier",
  stop_condition: "schema-unavailable-response-unavailable",
  observed_record_fingerprint: "N/A",
  result_fingerprint: "sha256:d883c19953a44d979e89bd2790ae03ea0a04527d309063478c4ed64a47cf6c7e"
});
assertParsedRegistrySchema("A2-provider-cost-evidence-read", {
  source_timestamp: "<required-date-parse-valid-source-timestamp>",
  dependency_fingerprint: "<required-sha256-fingerprint>",
  funding_prerequisite_fingerprint: "<required-sha256-fingerprint>",
  cost_model_fingerprint: "<required-sha256-fingerprint>",
  observed_record_fingerprint: "<required-sha256-fingerprint>",
  result_fingerprint: "<required-sha256-fingerprint>"
});
assertParsedRegistrySchema("A3-stripe-source-applicability-read-or-judgment", {
  source_timestamp: "<required-date-parse-valid-source-timestamp-or-N-A>",
  cost_model_fingerprint: "<required-sha256-fingerprint-or-N-A>",
  judgment_output: "<required-approved-or-accepted-judgment-output-or-N-A>",
  bound_artifact_fingerprint: "<required-sha256-fingerprint-or-N-A>",
  judgment_effective_date: "<required-effective-date-or-N-A>",
  dependency_fingerprint: "<required-sha256-fingerprint>",
  observed_record_fingerprint: "<required-sha256-fingerprint>",
  result_fingerprint: "<required-sha256-fingerprint>"
});
assertParsedRegistrySchema("A4-product-price-judgment", {
  a2_result_fingerprint: "<required-sha256-fingerprint>",
  a3_result_fingerprint: "<required-sha256-fingerprint>",
  dependency_fingerprint_composite: "<required-exact-a2-result-a3-result-composite>"
});
assertParsedRegistrySchema("A5-legal-judgment", { a4_artifact_fingerprint: "<required-sha256-fingerprint>" });
assertParsedRegistrySchema("A6-copy-judgment", {
  a4_artifact_fingerprint: "<required-sha256-fingerprint>",
  a5_artifact_fingerprint: "<required-sha256-fingerprint>",
  judgment_record_fingerprint: "<required-sha256-judgment-record-fingerprint>"
});
assertParsedRegistrySchema("B1-external-prerequisite-sanitized-result-reference", { external_result_fingerprint: "<required-sha256-fingerprint>" });
assertParsedRegistrySchema("B1-deployed-target-proof", {
  deployed_fingerprint: "<required-sha256-fingerprint>",
  a1_result_fingerprint: "<required-sha256-fingerprint>",
  a4_artifact_fingerprint: "<required-sha256-fingerprint>",
  a5_artifact_fingerprint: "<required-sha256-fingerprint>",
  a6_artifact_fingerprint: "<required-sha256-fingerprint>",
  external_prerequisite_fingerprint: "<required-sha256-fingerprint>"
});
assertParsedRegistrySchema("B2-live-paid-flow-evidence", {
  b2_parsed_scenarios: "<required-exact-19-canonical-scenario-ids>",
  b1_deployed_fingerprint: "<required-sha256-fingerprint>",
  signed_evidence_fingerprint: "<required-sha256-fingerprint>",
  b2_scenario_result_ids: "<required-exact-19-unique-scenario-result-ids>"
});
assert.doesNotThrow(() => validateParsedStagedFixture(parseStagedRows(checklist), parseStagedChildren(checklist)));
const fundingReferenceExpected = stagedChildDefinitions.find((child) => child.id === "A2-provider-funding-external-prerequisite-reference");
const unapprovedFundingReference = parsedStagedChildren.find((child) => child.headingId === "A2-provider-funding-external-prerequisite-reference").fields;
assert.throws(() => validateStagedChildRecord({ ...unapprovedFundingReference, funding_requirement_state: "not-needed" }, fundingReferenceExpected), /separate owner approval fingerprint|separate disposition record fingerprint/);
// RED: the A2 owner disposition may be complete while the separately authorized external lane is still unapproved.
const futureNeededAbsentDispositionWithUnapprovedExternalReference = {
  ...unapprovedFundingReference,
  funding_requirement_state: "needed-absent",
  funding_owner_approval_record_fingerprint: fixtureFingerprint("future-a2-needed-absent-owner-approval"),
  funding_disposition_record_fingerprint: fixtureFingerprint("future-a2-needed-absent-disposition"),
  funding_external_result_fingerprint: "N/A"
};
assert.doesNotThrow(
  () => validateStagedChildRecord(futureNeededAbsentDispositionWithUnapprovedExternalReference, fundingReferenceExpected),
  "an approved A2 disposition must be representable without promoting its separately approved external-lane child"
);
const sourceDispositionExpected = stagedChildDefinitions.find((child) => child.id === "A1-worker-cpu-source-disposition");
const futureSourceDisposition = { ...parsedStagedChildren.find((child) => child.headingId === "A1-worker-cpu-source-disposition").fields, child_status: "satisfied", approval_id: "NC-R1-FUTURE-A1-SOURCE-01", explicit_decision: "approved", exact_target_or_scope: "exact-safe-source-scope", evidence_retention_location: "sanitized-retention", freshness: "fresh", target: "exact", approval: "approved", fingerprint_bound: "yes", bound_input: "approved-safe-source-input", effective_date: "2026-08-09", required_approver: "release-owner", source_disposition_outcome: "retain-no-go" };
assert.doesNotThrow(() => validateStagedChildRecord(futureSourceDisposition, sourceDispositionExpected));
const futureApprovedChildRecord = {
  ...parsedStagedChildren.find((child) => child.headingId === "A1-worker-cpu-evidence-read").fields,
  child_status: "approved-not-started", freshness: "fresh", target: "exact", approval: "approved", fingerprint_bound: "yes",
  approval_id: "NC-R1-FUTURE-A1-01", explicit_decision: "approved", exact_target_or_scope: "exact-worker-cpu-scope", evidence_retention_location: "sanitized-retention",
  requested_operation: "authenticated-private-read-cpu-completeness-only", time_window: "2026-08-09T00:00:00Z/2026-08-09T01:00:00Z", operator: "approved-operator",
  dependent_stop_result: "not-applicable"
};
validateStagedChildRecord(futureApprovedChildRecord, stagedChildDefinitions.find((child) => child.id === "A1-worker-cpu-evidence-read"));
assert.throws(() => validateStagedChildRecord({ ...futureApprovedChildRecord, operator: "<required-exact-operator>" }, stagedChildDefinitions.find((child) => child.id === "A1-worker-cpu-evidence-read")), /required/);
const futureRegistryEquivalent = parsedStagedChildren.map((child) => child.headingId === "A1-worker-cpu-evidence-read" ? { ...child, fields: { ...futureApprovedChildRecord } } : child);
const futureRowRegistryEquivalent = parseStagedRows(checklist).map((row) => row.headingId === "EVID-WORKER-CPU" ? { ...row, fields: { ...row.fields, row_group_status: "approved-not-started", child_approval_id: "NC-R1-FUTURE-A1-01", child_explicit_approval_decision: "approved", child_exact_target_or_scope: "exact-worker-cpu-scope", child_evidence_retention_location: "sanitized-retention", row_freshness: "fresh", row_target: "exact", row_approval: "approved", row_fingerprint_bound: "yes", row_dependent_stop_result: "not-applicable" } } : row);
assert.doesNotThrow(() => validateParsedStagedFixture(futureRowRegistryEquivalent, futureRegistryEquivalent));
assert.throws(() => validateParsedStagedFixture(futureRowRegistryEquivalent.map((row) => row.headingId === "EVID-WORKER-CPU" ? { ...row, fields: { ...row.fields, child_approval_id: "<required-unique-approval-id-A1-worker-cpu-evidence-read>" } } : row), futureRegistryEquivalent), /non-placeholder approval ID/);
assert.throws(() => validateParsedStagedFixture(futureRowRegistryEquivalent.map((row) => row.headingId === "EVID-WORKER-CPU" ? { ...row, fields: { ...row.fields, row_group_status: "running" } } : row), futureRegistryEquivalent), /lifecycle states must match/);
assert.throws(() => validateParsedStagedFixture(futureRowRegistryEquivalent.map((row) => row.headingId === "EVID-WORKER-CPU" ? { ...row, fields: { ...row.fields, row_dependent_stop_result: "derived-canonical-reverse-dependency-graph" } } : row), futureRegistryEquivalent), /row dependent-stop result/);
for (const lifecycleState of ["approved-not-started", "running", "partial-stop", "complete-not-closure-eligible"]) {
  const stopsDependents = ["partial-stop", "stale", "invalidated"].includes(lifecycleState);
  const futureRows = futureRowRegistryEquivalent.map((row) => row.headingId === "EVID-WORKER-CPU" ? {
    ...row,
    fields: {
      ...row.fields,
      row_group_status: lifecycleState,
      row_closure: lifecycleState === "satisfied" ? "EVID-WORKER-CPU-only-after-satisfied" : "none",
      row_dependent_stop_result: stopsDependents ? "derived-canonical-reverse-dependency-graph" : "not-applicable",
      row_prior_approved_or_started: stopsDependents ? "yes" : undefined,
      row_stop_or_drift_cause: stopsDependents ? "target-mismatch-observed" : undefined
    }
  } : row);
  const futureChildren = futureRegistryEquivalent.map((child) => child.headingId === "A1-worker-cpu-evidence-read" ? {
    ...child,
    fields: {
      ...child.fields,
      child_status: lifecycleState,
      dependent_stop_result: stopsDependents ? "derived-canonical-reverse-dependency-graph" : "not-applicable",
      prior_approved_or_started: stopsDependents ? "yes" : undefined,
      satisfied_result: lifecycleState === "satisfied" ? satisfiedResultSchemas["A1-worker-cpu-evidence-read"] : undefined,
      aggregation_complete: lifecycleState === "satisfied" ? "yes" : undefined,
      request_completeness: lifecycleState === "satisfied" ? "complete" : undefined,
      headroom_disposition: lifecycleState === "satisfied" ? "approved" : undefined,
      source_timestamp: lifecycleState === "satisfied" ? "2026-08-09T00:00:00Z" : undefined,
      stop_or_drift_cause: stopsDependents ? "target-mismatch-observed" : undefined
    }
  } : child.headingId === "A1-worker-cpu-source-disposition" && ["running", "complete-not-closure-eligible", "satisfied"].includes(lifecycleState) ? {
    ...child,
    fields: { ...futureSourceDisposition, source_disposition_outcome: "approved-safe-source-selected" }
  } : child);
  const fixtureLedger = cloneRows(evidenceRows);
  assert.doesNotThrow(() => validateParsedStagedFixture(futureRows, futureChildren, fixtureLedger), `parsed row and registry fixture must accept future ${lifecycleState}`);
}
const futureRowApprovalIds = new Map(parseStagedRows(checklist).map((row) => [row.fields.row_group_id, row.fields.child_approval_id]));
futureRowApprovalIds.set("EVID-WORKER-CPU", "NC-R1-FUTURE-A1-01");
assert.doesNotThrow(() => validateStagedChildren(futureRegistryEquivalent, parsedStagedRows, futureRowApprovalIds));
for (const lifecycleState of ["running", "partial-stop", "complete-not-closure-eligible", "satisfied"]) {
  assert.doesNotThrow(() => validateStagedChildren(futureRegistryEquivalent.map((child) => child.headingId === "A1-worker-cpu-evidence-read" ? { ...child, fields: { ...child.fields, child_status: lifecycleState, dependent_stop_result: lifecycleState === "partial-stop" ? "derived-canonical-reverse-dependency-graph" : "not-applicable", prior_approved_or_started: lifecycleState === "partial-stop" ? "yes" : undefined, stop_or_drift_cause: lifecycleState === "partial-stop" ? "target-mismatch-observed" : undefined } } : child), parsedStagedRows, futureRowApprovalIds), `wrapper must accept future ${lifecycleState} child record`);
}
for (const [lifecycleState, drift] of [["stale", { target: "target-mismatched", approval: "approved", fingerprint_bound: "yes" }], ["invalidated", { target: "exact", approval: "unapproved", fingerprint_bound: "yes" }], ["incomplete", { target: "exact", approval: "approved", fingerprint_bound: "no" }]]) {
  const stopsDependents = ["stale", "invalidated"].includes(lifecycleState);
  const degradedRows = futureRowRegistryEquivalent.map((row) => row.headingId === "EVID-WORKER-CPU" ? { ...row, fields: { ...row.fields, row_group_status: lifecycleState, row_freshness: lifecycleState === "stale" ? "stale" : "fresh", row_target: drift.target, row_approval: drift.approval, row_fingerprint_bound: drift.fingerprint_bound, row_closure: "none", row_prior_approved_or_started: "yes", row_stop_or_drift_cause: lifecycleState === "stale" ? "evidence-stale" : lifecycleState === "invalidated" ? "approval-drift" : "fingerprint-broken", row_dependent_stop_result: stopsDependents ? "derived-canonical-reverse-dependency-graph" : "not-applicable" } } : row);
  const degradedChildren = futureRegistryEquivalent.map((child) => child.headingId === "A1-worker-cpu-evidence-read" ? { ...child, fields: { ...child.fields, child_status: lifecycleState, freshness: lifecycleState === "stale" ? "stale" : "fresh", ...drift, prior_approved_or_started: "yes", stop_or_drift_cause: lifecycleState === "stale" ? "evidence-stale" : lifecycleState === "invalidated" ? "approval-drift" : "fingerprint-broken", dependent_stop_result: stopsDependents ? "derived-canonical-reverse-dependency-graph" : "not-applicable" } } : child);
  assert.doesNotThrow(() => validateParsedStagedFixture(degradedRows, degradedChildren), `${lifecycleState} parser round-trip must retain its truthful drift state`);
}
assert.throws(() => validateStagedChildren(futureRegistryEquivalent.map((child) => child.headingId === "A1-worker-cpu-evidence-read" ? { ...child, fields: { ...child.fields, approval_id: "<required-unique-approval-id-A1-worker-cpu-evidence-read>" } } : child), parsedStagedRows, futureRowApprovalIds), /non-placeholder approval ID/);
const mismatchedRowApprovalIds = new Map(parseStagedRows(checklist).map((row) => [row.fields.row_group_id, row.fields.child_approval_id]));
mismatchedRowApprovalIds.set("EVID-STRIPE-COST", "NC-R1-WRONG-A3-01");
assert.throws(() => validateStagedChildren(parsedStagedChildren, parsedStagedRows, mismatchedRowApprovalIds), /row closing child approval ID/);
const stripeExpected = stagedChildDefinitions.find((child) => child.id === "A3-stripe-source-applicability-read-or-judgment");
const futureStripeRead = {
  ...parsedStagedChildren.find((child) => child.headingId === stripeExpected.id).fields,
  child_status: "approved-not-started", approval_id: "NC-R1-FUTURE-A3-READ-01", explicit_decision: "approved", exact_target_or_scope: "exact-stripe-scope", evidence_retention_location: "sanitized-retention", freshness: "fresh", target: "exact", approval: "approved", fingerprint_bound: "yes",
  selected_mode: "read", selected_approval_unit: "authenticated-private-read", requested_operation: "approved-stripe-read", time_window: "approved-window", operator: "approved-operator", bound_input: "N/A", effective_date: "N/A", required_approver: "N/A"
};
assert.doesNotThrow(() => validateStagedChildRecord(futureStripeRead, stripeExpected));
assert.throws(() => validateStagedChildRecord({ ...futureStripeRead, selected_approval_unit: "release-owner-judgment" }, stripeExpected), /authenticated-private-read/);
assert.throws(() => validateStagedChildRecord({ ...futureStripeRead, selected_mode: "unselected" }, stripeExpected), /exactly one/);
assert.throws(() => validateStagedChildRecord({ ...futureStripeRead, bound_input: "also-a-judgment-input", effective_date: "effective", required_approver: "approver" }, stripeExpected), /N\/A/);
assert.throws(() => validateStagedChildRecord({ ...futureStripeRead, selected_mode: "judgment", selected_approval_unit: "release-owner-judgment", requested_operation: "approved-stripe-read" }, stripeExpected), /N\/A/);
const validA3ReadStructuredResult = {
  child_id: "A3-stripe-source-applicability-read-or-judgment",
  selected_mode: "read",
  selected_approval_unit: "authenticated-private-read",
  requested_operation: "approved-stripe-read",
  time_window: "2026-08-09T00:00:00Z/2026-08-09T01:00:00Z",
  operator: "approved-operator",
  bound_input: "N/A",
  effective_date: "N/A",
  required_approver: "N/A",
  sanitized_exact_cost: "sanitized-exact-cost-classified",
  applicability: "applicable",
  source_timestamp: "2026-08-09T00:15:00Z",
  observed_record_fingerprint: fixtureFingerprint("a3-read-observed-record"),
  cost_model_fingerprint: fixtureFingerprint("a3-read-result"),
  dependency_fingerprint: fixtureFingerprint("a3-read-a0-input"),
  result_fingerprint: fixtureFingerprint("a3-read-result")
};
const validA3JudgmentStructuredResult = {
  child_id: "A3-stripe-source-applicability-read-or-judgment",
  selected_mode: "judgment",
  selected_approval_unit: "release-owner-judgment",
  requested_operation: "N/A",
  time_window: "N/A",
  operator: "N/A",
  bound_input: "approved-stripe-judgment-input",
  effective_date: "2026-08-09",
  required_approver: "release-owner",
  judgment_output: "approved",
  bound_artifact_fingerprint: fixtureFingerprint("a3-judgment-result"),
  judgment_effective_date: "2026-08-09",
  dependency_fingerprint: fixtureFingerprint("a3-judgment-a0-input"),
  observed_record_fingerprint: "N/A",
  result_fingerprint: fixtureFingerprint("a3-judgment-result")
};
assert.doesNotThrow(() => validateSatisfiedStructuredResult(validA3ReadStructuredResult), "A3 authenticated-private-read result must accept its source timestamp and exact operation window");
assert.doesNotThrow(() => validateSatisfiedStructuredResult(validA3JudgmentStructuredResult), "A3 release-owner judgment result must accept its bound artifact and exact effective date");
assert.throws(() => validateSatisfiedStructuredResult({ ...validA3ReadStructuredResult, judgment_output: "approved", bound_artifact_fingerprint: fixtureFingerprint("unexpected-read-judgment"), judgment_effective_date: "2026-08-09" }), /read mode must not include judgment/);
assert.throws(() => validateSatisfiedStructuredResult({ ...validA3ReadStructuredResult, source_timestamp: undefined }), /requires source_timestamp/);
assert.throws(() => validateSatisfiedStructuredResult({ ...validA3ReadStructuredResult, selected_approval_unit: "release-owner-judgment" }), /authenticated-private-read/);
assert.throws(() => validateSatisfiedStructuredResult({ ...validA3JudgmentStructuredResult, source_timestamp: "2026-08-09T00:15:00Z" }), /judgment mode must not include source/);
assert.throws(() => validateSatisfiedStructuredResult({ ...validA3JudgmentStructuredResult, effective_date: "2026-08-12", judgment_effective_date: "2026-08-12" }), /future/);
const parsedB2EvidenceResult = parseExactTextBlock("```text\nb2_parsed_scenarios=positive-compatible-active-signed-subscription-paid,unauthenticated,authenticated-free,paid-inactive,missing-incomplete-ambiguous-unreadable-authority,checkout-redirect-without-signed-entitlement,checkout-completion-without-signed-entitlement,incompatible-or-inactive-signed-evidence,duplicate-checkout-prevention,signed-webhook-idempotency,stale-replay-out-of-order-events,owner-price-subscription-mismatch,pre-provider-budget-quota-rejection,provider-failure,post-provider-usage-commit-rejection,cross-owner-input,cross-capability-input,rollback-free-fallback,authority-unavailable-free-fallback\nsource_timestamp=2026-08-09T00:30:00Z\ntime_window=2026-08-09T00:00:00Z/2026-08-09T01:00:00Z\n```");
const parsedB1EvidenceResult = {
  child_id: "B1-deployed-target-proof",
  approval_id: "NC-R1-B1-PARSED-FIXTURE-01",
  approval_fingerprint: fixtureFingerprint("parsed-b1-approval"),
  exact_target_or_scope: "sanitized-b1-parsed-scope",
  expected_target_alias: "approved-deployed-target-nonpublic",
  expected_commit_alias: "approved-deployed-commit-bound",
  requested_operation: b1DeployedTargetProofReadOnlyOperation,
  time_window: "2026-08-09T00:00:00Z/2026-08-09T01:00:00Z",
  operator: "approved-operator",
  evidence_retention_location: "sanitized-retention",
  stop_owner: "kurodev",
  rollback_owner: "kurodev",
  deployed_fingerprint: fixtureFingerprint("parsed-b1-evidence")
};
const parsedB1ProofRecord = {
  record_status: "approved-completed-deployed-target-proof",
  record_type: "sanitized-deployed-target-proof-result",
  evidence_id: "EVID-DEPLOYED-TARGET",
  child_id: "B1-deployed-target-proof",
  proof_record_id: "NC-R1-B1-PROOF-PARSED-01",
  approval_id: parsedB1EvidenceResult.approval_id,
  approval_decision: "approved",
  approval_fingerprint: parsedB1EvidenceResult.approval_fingerprint,
  exact_target_or_scope: parsedB1EvidenceResult.exact_target_or_scope,
  expected_target_alias: parsedB1EvidenceResult.expected_target_alias,
  expected_commit_alias: parsedB1EvidenceResult.expected_commit_alias,
  requested_operation: parsedB1EvidenceResult.requested_operation,
  time_window: parsedB1EvidenceResult.time_window,
  operator: parsedB1EvidenceResult.operator,
  required_approver: "kurodev",
  evidence_retention_location: parsedB1EvidenceResult.evidence_retention_location,
  stop_owner: "kurodev",
  rollback_owner: "kurodev",
  source_timestamp: "2026-08-09T00:15:00Z",
  observed_deployed_target_binding: parsedB1EvidenceResult.expected_target_alias,
  observed_deployed_commit_binding: parsedB1EvidenceResult.expected_commit_alias,
  target_match: "exact",
  commit_match: "exact",
  proof_completeness: "complete",
  freshness: "fresh",
  no_merge_ci_build_local_inference: "yes",
  migration_config_binding_git_merge_deploy_live_public_paid_go_activation_external_authorization_or_execution: "none",
  closure_outcome: "EVID-DEPLOYED-TARGET-only",
  proof_record_fingerprint: "pending"
};
parsedB1ProofRecord.proof_record_fingerprint = deriveB1ProofRecordFingerprint(parsedB1ProofRecord);
parsedB1EvidenceResult.proof_record_fingerprint = parsedB1ProofRecord.proof_record_fingerprint;
function b1ProofRecordFence(fields) {
  return `\`\`\`text\n${b1DeployedTargetProofRecordFields.map((field) => `${field}=${fields[field]}`).join("\n")}\n\`\`\``;
}
function b1NonClosingProofRecord(overrides = {}) {
  const fields = {
    ...parsedB1ProofRecord,
    record_status: "approved-complete-not-closure-eligible-deployed-target-proof",
    target_match: "mismatched",
    observed_deployed_target_binding: "approved-deployed-target-other",
    closure_outcome: "none",
    ...overrides
  };
  fields.proof_record_fingerprint = deriveB1ProofRecordFingerprint(fields);
  return fields;
}
const validB1NonClosingMismatchChild = { ...parsedB1EvidenceResult, child_status: "complete-not-closure-eligible" };
assert.doesNotThrow(() => validateB1ParsedEvidenceRecord(b1NonClosingProofRecord(), validB1NonClosingMismatchChild), "truthful mismatched complete-not-closure B1 proof must be accepted");
const validB1NonClosingUnconfirmed = b1NonClosingProofRecord({
  target_match: "unconfirmed", observed_deployed_target_binding: "unconfirmed",
  commit_match: "unconfirmed", observed_deployed_commit_binding: "unconfirmed"
});
assert.doesNotThrow(() => validateB1ParsedEvidenceRecord(validB1NonClosingUnconfirmed, validB1NonClosingMismatchChild), "truthful unconfirmed complete-not-closure B1 proof must be accepted");
const validB1NonClosingStale = b1NonClosingProofRecord({
  source_timestamp: "2026-08-01T00:15:00Z", time_window: "2026-08-01T00:00:00Z/2026-08-01T01:00:00Z", freshness: "stale"
});
const validB1NonClosingStaleChild = { ...validB1NonClosingMismatchChild, time_window: validB1NonClosingStale.time_window };
assert.doesNotThrow(() => validateB1ParsedEvidenceRecord(validB1NonClosingStale, validB1NonClosingStaleChild), "truthful stale complete-not-closure B1 proof must be accepted");
for (const contradictoryProof of [
  b1NonClosingProofRecord({ target_match: "exact", observed_deployed_target_binding: "approved-deployed-target-other" }),
  b1NonClosingProofRecord({ target_match: "mismatched", observed_deployed_target_binding: parsedB1ProofRecord.expected_target_alias }),
  b1NonClosingProofRecord({ target_match: "unconfirmed", observed_deployed_target_binding: parsedB1ProofRecord.expected_target_alias })
]) assert.throws(() => validateB1ParsedEvidenceRecord(contradictoryProof, validB1NonClosingMismatchChild), /exact match|mismatch cannot|unconfirmed match|freshness must be derived/, "B1 proof declarations must match their observed bindings and deterministic freshness");
assert.throws(() => validateB1ParsedEvidenceRecord(b1NonClosingProofRecord({ freshness: "fresh", source_timestamp: "2026-08-01T00:15:00Z", time_window: "2026-08-01T00:00:00Z/2026-08-01T01:00:00Z" }), validB1NonClosingStaleChild), /freshness must be derived/, "B1 stale source cannot self-declare fresh");
assert.doesNotThrow(() => parseB1DeployedTargetProofRecord(b1ProofRecordFence(parsedB1ProofRecord)), "B1 strict parser must accept one complete fenced actual record");
assert.throws(() => parseB1DeployedTargetProofRecord(`${b1ProofRecordFence(parsedB1ProofRecord)}\nunknown=value`), /strict|closed schema|unknown/, "B1 strict parser must reject malformed trailing content");
assert.throws(() => parseB1DeployedTargetProofRecord(b1ProofRecordFence(parsedB1ProofRecord).replace("record_type=", "record_status=duplicate\nrecord_type=")), /duplicate/, "B1 strict parser must reject duplicate fields");
assert.throws(() => parseB1DeployedTargetProofRecord(b1ProofRecordFence({ ...parsedB1ProofRecord, record_status: "<required-approved-completed-deployed-target-proof>" })), /requires record_status|terminal truthful record status/, "B1 strict parser must reject its non-evidence template as an actual result");
assert.throws(() => parseB1DeployedTargetProofRecord(b1ProofRecordFence(parsedB1ProofRecord).replace("\nproof_record_fingerprint=", "\nforbidden_sanitized_placeholder=none\nproof_record_fingerprint=")), /closed schema|strict/, "B1 strict parser must reject sanitized forbidden malformed lines");
const readinessB1ProofResultTemplate = extractExactB1DeployedTargetProofResultTemplate(readiness, readinessPath);
const checklistB1ProofResultTemplate = extractExactB1DeployedTargetProofResultTemplate(checklist, checklistPath);
assert.equal(readinessB1ProofResultTemplate.fencedBlock, checklistB1ProofResultTemplate.fencedBlock, "readiness and checklist B1 non-evidence proof templates must retain identical fenced bodies");
for (const [path, template] of [[readinessPath, readinessB1ProofResultTemplate], [checklistPath, checklistB1ProofResultTemplate]]) {
  assert.throws(() => parseB1DeployedTargetProofRecord(template.fencedBlock), /record_status|terminal truthful record status/, `${path} actual B1 non-evidence template must not substitute for a parsed proof record`);
}
assert.throws(() => parseB1DeployedTargetProofRecord(b1ProofRecordFence(parsedB1ProofRecord).replace("\nproof_record_fingerprint=", "\nmalformed_sanitized_placeholder:none\nproof_record_fingerprint=")), /strict key=value/, "B1 strict parser must reject a colon-form sanitized placeholder line");
assert.throws(() => validateB1ParsedEvidenceRecord({ ...parsedB1ProofRecord, source_timestamp: "2026-08-09T00:15:00" }, parsedB1EvidenceResult), /timezone|RFC3339|offset/, "B1 timestamps must reject timezone-less input");
assert.throws(() => validateB1ParsedEvidenceRecord({ ...parsedB1ProofRecord, source_timestamp: "2026-08-09T00:15:00+99:99" }, parsedB1EvidenceResult), /offset|RFC3339/, "B1 timestamps must reject invalid RFC3339 offsets");
const parsedSignedEvidenceResult = parseSignedEvidenceRecord(`\`\`\`text\nevidence_record_id=NC-R1-FUTURE-B2-SIGNED-BASE-01\nevidence_record_type=signed-compatible-subscription-evidence\nsource=signed-subscription-evidence\nclassification=active-compatible\nauthority=complete-unambiguous\nfingerprint=${fixtureFingerprint("parsed-signed-base")}\nsource_timestamp=2026-08-09T00:20:00Z\n\`\`\``);
const canonicalB2ScenarioContracts = [
  ["positive-compatible-active-signed-subscription-paid", "Paid", "compatible-active-signed-subscription-paid", "1", "1", "1", "0", "0", "0", "emitted", "present"],
  ["unauthenticated", "Free-denied-unauthenticated", "unauthenticated-denied", "0", "0", "0", "0", "0", "0", "suppressed", "absent"],
  ["authenticated-free", "Free-authenticated-free", "authenticated-free-fallback", "0", "0", "0", "0", "0", "0", "suppressed", "absent"],
  ["paid-inactive", "Free-paid-inactive", "paid-inactive-fallback", "0", "0", "0", "0", "0", "0", "suppressed", "absent"],
  ["missing-incomplete-ambiguous-unreadable-authority", "Free-fail-closed-authority", "authority-fail-closed", "0", "0", "0", "0", "0", "0", "suppressed", "absent"],
  ["checkout-redirect-without-signed-entitlement", "Free-redirect-without-signed-entitlement", "redirect-not-entitlement", "0", "0", "0", "0", "0", "0", "suppressed", "absent"],
  ["checkout-completion-without-signed-entitlement", "Free-completion-without-signed-entitlement", "completion-not-entitlement", "0", "0", "0", "0", "0", "0", "suppressed", "absent"],
  ["incompatible-or-inactive-signed-evidence", "Free-incompatible-or-inactive-signed-evidence", "incompatible-signed-evidence-denied", "0", "0", "0", "0", "0", "0", "suppressed", "absent"],
  ["duplicate-checkout-prevention", "Free-duplicate-checkout-prevented", "duplicate-checkout-side-effect-denied", "0", "0", "0", "0", "0", "0", "suppressed", "absent"],
  ["signed-webhook-idempotency", "Free-signed-webhook-idempotent", "duplicate-webhook-no-side-effect", "0", "0", "0", "0", "0", "0", "suppressed", "absent"],
  ["stale-replay-out-of-order-events", "Free-stale-replay-out-of-order-denied", "stale-replay-denied", "0", "0", "0", "0", "0", "0", "suppressed", "absent"],
  ["owner-price-subscription-mismatch", "Free-owner-price-subscription-mismatch-denied", "owner-price-subscription-mismatch-denied", "0", "0", "0", "0", "0", "0", "suppressed", "absent"],
  ["pre-provider-budget-quota-rejection", "Free-budget-quota-denied", "pre-provider-budget-quota-denied", "0", "0", "0", "0", "0", "0", "suppressed", "absent"],
  ["provider-failure", "Free-provider-failure", "provider-failure-no-usage-commit", "0", "1", "0", "0", "0", "0", "suppressed", "absent"],
  ["post-provider-usage-commit-rejection", "Free-post-provider-usage-commit-rejected", "post-provider-usage-commit-rejected", "0", "1", "0", "0", "0", "0", "suppressed", "absent"],
  ["cross-owner-input", "Free-cross-owner-denied", "cross-owner-access-denied", "0", "0", "0", "0", "0", "0", "suppressed", "absent"],
  ["cross-capability-input", "Free-cross-capability-denied", "cross-capability-access-denied", "0", "0", "0", "0", "0", "0", "suppressed", "absent"],
  ["rollback-free-fallback", "Free-rollback-fallback", "rollback-free-fallback", "0", "0", "0", "0", "0", "0", "suppressed", "absent"],
  ["authority-unavailable-free-fallback", "Free-authority-unavailable-fallback", "authority-unavailable-free-fallback", "0", "0", "0", "0", "0", "0", "suppressed", "absent"]
].map(([scenario_id, canonical_outcome, sanitized_outcome, paid_transition_count, provider_call_count, usage_commit_count, checkout_creation_count, entitlement_write_count, cross_scope_access_count, output_state, success_state], index) => ({
  scenario_id,
  scenario_result_id: `NC-R1-B2-SCENARIO-${String(index + 1).padStart(2, "0")}`,
  canonical_outcome,
  sanitized_outcome,
  paid_transition_count,
  provider_call_count,
  usage_commit_count,
  checkout_creation_count,
  entitlement_write_count,
  cross_scope_access_count,
  output_state,
  success_state
}));
const b2ScenarioParserRedFixture = "### B2 Scenario Result: parser-red\n\n```text\nscenario_id=parser-red\n```";
assert.throws(() => parseB2ScenarioResultRecords(b2ScenarioParserRedFixture), /closed schema/, "B2 scenario parser must reject a partial record rather than silently parsing it");
const b2ScenarioBindingFixture = {
  child_id: "B2-live-paid-flow-evidence",
  approval_fingerprint: fixtureFingerprint("future-b2-approval"),
  b2_execution_id: "NC-R1-FUTURE-B2-EXECUTION-01",
  target_scope_alias: "sanitized-b2-live-flow-target",
  time_window: "2026-08-09T00:00:00Z/2026-08-09T01:00:00Z",
  b1_deployed_fingerprint: parsedB1EvidenceResult.deployed_fingerprint,
  signed_evidence_fingerprint: parsedSignedEvidenceResult.fingerprint
};
Object.assign(parsedB2EvidenceResult, {
  ...b2ScenarioBindingFixture,
  b1_deployed_target_binding: "approved-deployed-target-nonpublic",
  b1_deployed_commit_binding: "approved-deployed-commit-bound",
  signed_evidence_record_id: "NC-R1-FUTURE-B2-SIGNED-BASE-01",
  signed_evidence_source: "signed-subscription-evidence",
  signed_evidence_classification: "active-compatible",
  signed_evidence_authority: "complete-unambiguous",
  signed_evidence_source_timestamp: "2026-08-09T00:20:00Z",
  b2_scenario_result_ids: canonicalB2ScenarioContracts.map((contract) => contract.scenario_result_id).join(",")
});
const futureB2ScenarioFixtureRows = [
  ["NC-R1-B2-SCENARIO-01", "positive-compatible-active-signed-subscription-paid", "Paid", "compatible-active-signed-subscription-paid", "1", "1", "1", "0", "0", "0", "emitted", "present"],
  ["NC-R1-B2-SCENARIO-02", "unauthenticated", "Free-denied-unauthenticated", "unauthenticated-denied", "0", "0", "0", "0", "0", "0", "suppressed", "absent"],
  ["NC-R1-B2-SCENARIO-03", "authenticated-free", "Free-authenticated-free", "authenticated-free-fallback", "0", "0", "0", "0", "0", "0", "suppressed", "absent"],
  ["NC-R1-B2-SCENARIO-04", "paid-inactive", "Free-paid-inactive", "paid-inactive-fallback", "0", "0", "0", "0", "0", "0", "suppressed", "absent"],
  ["NC-R1-B2-SCENARIO-05", "missing-incomplete-ambiguous-unreadable-authority", "Free-fail-closed-authority", "authority-fail-closed", "0", "0", "0", "0", "0", "0", "suppressed", "absent"],
  ["NC-R1-B2-SCENARIO-06", "checkout-redirect-without-signed-entitlement", "Free-redirect-without-signed-entitlement", "redirect-not-entitlement", "0", "0", "0", "0", "0", "0", "suppressed", "absent"],
  ["NC-R1-B2-SCENARIO-07", "checkout-completion-without-signed-entitlement", "Free-completion-without-signed-entitlement", "completion-not-entitlement", "0", "0", "0", "0", "0", "0", "suppressed", "absent"],
  ["NC-R1-B2-SCENARIO-08", "incompatible-or-inactive-signed-evidence", "Free-incompatible-or-inactive-signed-evidence", "incompatible-signed-evidence-denied", "0", "0", "0", "0", "0", "0", "suppressed", "absent"],
  ["NC-R1-B2-SCENARIO-09", "duplicate-checkout-prevention", "Free-duplicate-checkout-prevented", "duplicate-checkout-side-effect-denied", "0", "0", "0", "0", "0", "0", "suppressed", "absent"],
  ["NC-R1-B2-SCENARIO-10", "signed-webhook-idempotency", "Free-signed-webhook-idempotent", "duplicate-webhook-no-side-effect", "0", "0", "0", "0", "0", "0", "suppressed", "absent"],
  ["NC-R1-B2-SCENARIO-11", "stale-replay-out-of-order-events", "Free-stale-replay-out-of-order-denied", "stale-replay-denied", "0", "0", "0", "0", "0", "0", "suppressed", "absent"],
  ["NC-R1-B2-SCENARIO-12", "owner-price-subscription-mismatch", "Free-owner-price-subscription-mismatch-denied", "owner-price-subscription-mismatch-denied", "0", "0", "0", "0", "0", "0", "suppressed", "absent"],
  ["NC-R1-B2-SCENARIO-13", "pre-provider-budget-quota-rejection", "Free-budget-quota-denied", "pre-provider-budget-quota-denied", "0", "0", "0", "0", "0", "0", "suppressed", "absent"],
  ["NC-R1-B2-SCENARIO-14", "provider-failure", "Free-provider-failure", "provider-failure-no-usage-commit", "0", "1", "0", "0", "0", "0", "suppressed", "absent"],
  ["NC-R1-B2-SCENARIO-15", "post-provider-usage-commit-rejection", "Free-post-provider-usage-commit-rejected", "post-provider-usage-commit-rejected", "0", "1", "0", "0", "0", "0", "suppressed", "absent"],
  ["NC-R1-B2-SCENARIO-16", "cross-owner-input", "Free-cross-owner-denied", "cross-owner-access-denied", "0", "0", "0", "0", "0", "0", "suppressed", "absent"],
  ["NC-R1-B2-SCENARIO-17", "cross-capability-input", "Free-cross-capability-denied", "cross-capability-access-denied", "0", "0", "0", "0", "0", "0", "suppressed", "absent"],
  ["NC-R1-B2-SCENARIO-18", "rollback-free-fallback", "Free-rollback-fallback", "rollback-free-fallback", "0", "0", "0", "0", "0", "0", "suppressed", "absent"],
  ["NC-R1-B2-SCENARIO-19", "authority-unavailable-free-fallback", "Free-authority-unavailable-fallback", "authority-unavailable-free-fallback", "0", "0", "0", "0", "0", "0", "suppressed", "absent"]
];
function futureB2ScenarioResultFixtureText(bindings = b2ScenarioBindingFixture) {
  return futureB2ScenarioFixtureRows.map(([scenarioResultId, scenarioId, canonicalOutcome, sanitizedOutcome, paidTransitionCount, providerCallCount, usageCommitCount, checkoutCreationCount, entitlementWriteCount, crossScopeAccessCount, outputState, successState]) => {
    const fields = {
      record_status: "complete-unambiguous",
      scenario_result_id: scenarioResultId,
      b2_child_id: bindings.child_id,
      b2_approval_fingerprint: bindings.approval_fingerprint,
      b2_execution_id: bindings.b2_execution_id,
      target_scope_alias: bindings.target_scope_alias,
      time_window: bindings.time_window,
      b1_fingerprint: bindings.b1_deployed_fingerprint,
      signed_evidence_fingerprint: bindings.signed_evidence_fingerprint,
      scenario_id: scenarioId,
      canonical_outcome: canonicalOutcome,
      sanitized_outcome: sanitizedOutcome,
      paid_transition_count: paidTransitionCount,
      provider_call_count: providerCallCount,
      usage_commit_count: usageCommitCount,
      checkout_creation_count: checkoutCreationCount,
      entitlement_write_count: entitlementWriteCount,
      cross_scope_access_count: crossScopeAccessCount,
      output_state: outputState,
      success_state: successState,
      source_timestamp: "2026-08-09T00:30:00Z",
      freshness: "fresh"
    };
    fields.result_fingerprint = deriveB2ScenarioResultFingerprint(fields);
    return `### B2 Scenario Result: ${scenarioId}\n\n\`\`\`text\n${Object.entries(fields).map(([key, value]) => `${key}=${value}`).join("\n")}\n\`\`\``;
  }).join("\n\n");
}
function parseFutureB2ScenarioResultRecordsFor(fields) {
  return parseB2ScenarioResultRecords(futureB2ScenarioResultFixtureText({
    child_id: fields.child_id,
    approval_fingerprint: fields.approval_fingerprint,
    b2_execution_id: fields.b2_execution_id,
    target_scope_alias: fields.target_scope_alias,
    time_window: fields.time_window,
    b1_deployed_fingerprint: fields.b1_deployed_fingerprint,
    signed_evidence_fingerprint: fields.signed_evidence_fingerprint
  }));
}
const parsedFutureB2ScenarioRecords = parseB2ScenarioResultRecords(futureB2ScenarioResultFixtureText());
const parsedB2ScenarioRecords = parsedFutureB2ScenarioRecords;
Object.assign(parsedB2EvidenceResult, {
  approval_id: "NC-R1-FUTURE-B2-AGGREGATE-01",
  exact_target_or_scope: "sanitized-b2-live-flow-scope",
  evidence_retention_location: "current-Codex-task-sanitized-report",
  stop_owner: "kurodev",
  rollback_owner: "kurodev",
  child_status: "satisfied"
});
const parsedB2ScenarioRecordsById = new Map(parsedB2ScenarioRecords.map((record) => [record.fields.scenario_id, record.fields]));
parsedB2EvidenceResult.requested_operation = b2BoundedLivePaidFlowVerificationOperation;
parsedB2EvidenceResult.approved_target_scope_binding = deriveB2ApprovedTargetScopeBinding(parsedB2EvidenceResult);
parsedB2EvidenceResult.approved_signed_evidence_binding = deriveB2ApprovedSignedEvidenceBinding(parsedB2EvidenceResult);
const parsedB2AggregateLiveOperationResultRecordFields = {
  record_status: "approved-completed-live-operation-result",
  record_type: "sanitized-aggregate-live-operation-result",
  aggregate_record_id: "NC-R1-B2-AGGREGATE-FIXTURE-01",
  evidence_id: "EVID-LIVE-PAID-FLOW",
  child_id: parsedB2EvidenceResult.child_id,
  approval_id: parsedB2EvidenceResult.approval_id,
  approval_fingerprint: parsedB2EvidenceResult.approval_fingerprint,
  requested_operation: b2BoundedLivePaidFlowVerificationOperation,
  b2_execution_id: parsedB2EvidenceResult.b2_execution_id,
  exact_target_or_scope: parsedB2EvidenceResult.exact_target_or_scope,
  target_scope_alias: parsedB2EvidenceResult.target_scope_alias,
  time_window: parsedB2EvidenceResult.time_window,
  b1_deployed_fingerprint: parsedB2EvidenceResult.b1_deployed_fingerprint,
  signed_evidence_record_id: parsedB2EvidenceResult.signed_evidence_record_id,
  signed_evidence_source: parsedB2EvidenceResult.signed_evidence_source,
  signed_evidence_classification: parsedB2EvidenceResult.signed_evidence_classification,
  signed_evidence_authority: parsedB2EvidenceResult.signed_evidence_authority,
  signed_evidence_fingerprint: parsedB2EvidenceResult.signed_evidence_fingerprint,
  ordered_b2_scenario_result_ids: canonicalB2ScenarioContracts.map((contract) => contract.scenario_result_id).join(","),
  ordered_b2_scenario_result_fingerprints: canonicalB2ScenarioContracts.map((contract) => parsedB2ScenarioRecordsById.get(contract.scenario_id).result_fingerprint).join(","),
  scenario_results_aggregate_fingerprint: deriveB2ScenarioResultsAggregateFingerprint(parsedB2ScenarioRecordsById),
  source_timestamp: "2026-08-09T00:30:00Z",
  freshness: "fresh",
  aggregate_outcome: "paid-authority-only-and-free-fail-closed-otherwise",
  side_effect_summary: "canonical-19-scenario-side-effects-exact",
  positive_paid_result: "Paid",
  compatible_active_signed_subscription: "compatible-active-signed-subscription",
  signed_authority_status: "complete-unambiguous",
  b1_deployed_binding: "approved-deployed-target-and-commit",
  expected_paid_transition_count: "1",
  provider_calls_after_budget_quota_rejection: "0",
  usage_commits_after_provider_failure: "0",
  output_after_post_provider_commit_rejection: "suppressed",
  success_after_post_provider_commit_rejection: "absent",
  final_state: "Free-fail-closed",
  unexpected_paid_transitions: "0",
  closure_eligibility: "eligible",
  nonclosure_reason: "none",
  closure_disposition: "EVID-LIVE-PAID-FLOW-only",
  evidence_retention_location: parsedB2EvidenceResult.evidence_retention_location,
  stop_owner: "kurodev",
  rollback_owner: "kurodev",
  extra_authorization_or_execution: "none",
  aggregate_record_fingerprint: "pending"
};
parsedB2AggregateLiveOperationResultRecordFields.aggregate_record_fingerprint = deriveB2AggregateLiveOperationResultRecordFingerprint(parsedB2AggregateLiveOperationResultRecordFields);
parsedB2EvidenceResult.b2_aggregate_record_fingerprint = parsedB2AggregateLiveOperationResultRecordFields.aggregate_record_fingerprint;
const parsedB2AggregateLiveOperationResultRecord = { fields: parsedB2AggregateLiveOperationResultRecordFields };
function extractExactSingleTextFence(markdown, heading, context) {
  const section = markdown.match(new RegExp(`^${escapeRegExp(heading)}\\r?\\n([\\s\\S]*?)(?=^#{1,3} |(?![\\s\\S]))`, "m"));
  assert.ok(section, `${context} requires its exact checked-in heading`);
  const blocks = [...section[1].matchAll(/```[\s\S]*?```/g)];
  assert.equal(blocks.length, 1, `${context} requires exactly one fenced block`);
  assert.match(blocks[0][0], /^```text\r?\n[\s\S]*?\r?\n```$/, `${context} requires one text fence`);
  return blocks[0][0];
}
const b2AggregateTemplateRawChecklist = extractExactSingleTextFence(checklist, "### Exact Non-Evidence B2 Aggregate Live-Operation Result Template", "B2 aggregate checklist template");
const b2AggregateTemplateRawReadiness = extractExactSingleTextFence(readiness, "## Exact Non-Evidence B2 Aggregate Live-Operation Result Template", "B2 aggregate readiness template");
assert.equal(b2AggregateTemplateRawReadiness, b2AggregateTemplateRawChecklist, "readiness and checklist must retain byte-identical ordered B2 aggregate fenced templates");
const b2AggregateTemplateFields = parseExactTextBlock(b2AggregateTemplateRawChecklist);
const b2AggregateTemplateFieldsReadiness = parseExactTextBlock(b2AggregateTemplateRawReadiness);
assert.deepEqual(b2AggregateTemplateFieldsReadiness, b2AggregateTemplateFields, "readiness and checklist must retain the identical exact non-evidence B2 aggregate live-operation template");
assert.deepEqual(Object.keys(b2AggregateTemplateFields).sort(), [...b2AggregateLiveOperationResultRecordFields].sort(), "B2 aggregate non-evidence template must retain the exact closed result schema");
assert.throws(() => parseB2AggregateLiveOperationResultRecord(b2AggregateTemplateRawChecklist), /requires record_status|terminal truthful|approved-completed|sanitized alias|fingerprint/, "B2 aggregate non-evidence template must not substitute for an actual aggregate record");
for (const malformedCheckedInTemplate of [
  `${b2AggregateTemplateRawChecklist}\noutside-prose`,
  `${b2AggregateTemplateRawChecklist}\n\`\`\`text\nrecord_status=extra\n\`\`\``,
  b2AggregateTemplateRawChecklist.replace("\nrecord_type=", "\nnot_a_schema_field=value\nrecord_type="),
  b2AggregateTemplateRawChecklist.replace("\nrecord_type=", "\nrecord_type malformed\nrecord_type=")
]) assert.throws(() => parseB2AggregateLiveOperationResultRecord(malformedCheckedInTemplate), /fence|strict key=value|whitespace or malformed lines|closed schema|requires record_status/, "B2 aggregate checked-in template parser must reject outside content, a second fence, or malformed content inside the fence");
const parsedB2AggregateRaw = `\`\`\`text\n${b2AggregateLiveOperationResultRecordFields.map((field) => `${field}=${parsedB2AggregateLiveOperationResultRecordFields[field]}`).join("\n")}\n\`\`\``;
assert.deepEqual(parseB2AggregateLiveOperationResultRecord(parsedB2AggregateRaw), parsedB2AggregateLiveOperationResultRecordFields, "B2 aggregate parser must retain the exact closed sanitized record");
for (const malformedB2AggregateRaw of [
  `${parsedB2AggregateRaw}\noutside-prose`,
  parsedB2AggregateRaw.replace("\nrecord_type=", "\nunknown_key=value\nrecord_type="),
  parsedB2AggregateRaw.replace("\nrecord_type=", "\nrecord_status=duplicate\nrecord_type="),
  parsedB2AggregateRaw.replace("record_status=", "record_status= approved-")
]) assert.throws(() => parseB2AggregateLiveOperationResultRecord(malformedB2AggregateRaw), /fence|strict key=value|unique|duplicate fields|whitespace or malformed lines|closed schema/, "B2 aggregate parser must reject outside, unknown, duplicate, or malformed content");
assert.equal(parsedFutureB2ScenarioRecords.length, 19, "future B2 fixture must be built as 19 fenced records and then parsed");
assert.doesNotThrow(() => validateB2ParsedScenarioResultRecords(parsedFutureB2ScenarioRecords, b2ScenarioBindingFixture, parsedB1EvidenceResult, parsedB1ProofRecord, parsedSignedEvidenceResult));
const replayedB2ScenarioRecords = parsedFutureB2ScenarioRecords.map((record) => ({ ...record, fields: { ...record.fields } }));
replayedB2ScenarioRecords[0].fields.b2_execution_id = "NC-R1-FUTURE-B2-EXECUTION-REPLAY";
assert.throws(() => validateB2ParsedScenarioResultRecords(replayedB2ScenarioRecords, b2ScenarioBindingFixture, parsedB1EvidenceResult, parsedB1ProofRecord, parsedSignedEvidenceResult), /b2_execution_id/, "B2 scenario records must reject an execution replay binding");
assert.doesNotThrow(() => validateB2ParsedResult(parsedB2EvidenceResult, parsedB1EvidenceResult, parsedB1ProofRecord, parsedSignedEvidenceResult, parsedB2ScenarioRecords, parsedB2AggregateLiveOperationResultRecord));
assert.throws(() => validateB2ParsedResult(parsedB2EvidenceResult, parsedB1EvidenceResult, parsedB1ProofRecord, parsedSignedEvidenceResult, [], parsedB2AggregateLiveOperationResultRecord), /parsed scenario result records/);
assert.doesNotThrow(() => validateB2ParsedResult(parsedB2EvidenceResult, parsedB1EvidenceResult, parsedB1ProofRecord, parsedSignedEvidenceResult, parsedB2ScenarioRecords, parsedB2AggregateLiveOperationResultRecord));
const wrongB2ScenarioOutcomeRecords = parsedB2ScenarioRecords.map((record) => ({ fields: { ...record.fields } }));
wrongB2ScenarioOutcomeRecords.find((record) => record.fields.scenario_id === "cross-owner-input").fields.canonical_outcome = "Paid";
assert.throws(() => validateB2ParsedResult(parsedB2EvidenceResult, parsedB1EvidenceResult, parsedB1ProofRecord, parsedSignedEvidenceResult, wrongB2ScenarioOutcomeRecords, parsedB2AggregateLiveOperationResultRecord), /result_fingerprint|canonical_outcome/);
assert.throws(() => validateB2ParsedResult(parsedB2EvidenceResult, parsedB1EvidenceResult, parsedB1ProofRecord, parsedSignedEvidenceResult, parsedB2ScenarioRecords.slice(1), parsedB2AggregateLiveOperationResultRecord), /requires one parsed result/);
assert.throws(() => validateB2ParsedResult(parsedB2EvidenceResult, parsedB1EvidenceResult, parsedB1ProofRecord, parsedSignedEvidenceResult, [...parsedB2ScenarioRecords, { fields: { ...parsedB2ScenarioRecords[0].fields } }], parsedB2AggregateLiveOperationResultRecord), /unique/);
for (const [scenarioId, field, wrongValue] of [
  ["duplicate-checkout-prevention", "checkout_creation_count", "1"],
  ["signed-webhook-idempotency", "entitlement_write_count", "1"],
  ["stale-replay-out-of-order-events", "entitlement_write_count", "1"],
  ["owner-price-subscription-mismatch", "cross_scope_access_count", "1"],
  ["cross-owner-input", "cross_scope_access_count", "1"],
  ["cross-capability-input", "cross_scope_access_count", "1"]
]) {
  const mutatedRecords = parsedB2ScenarioRecords.map((record) => ({ fields: { ...record.fields } }));
  mutatedRecords.find((record) => record.fields.scenario_id === scenarioId).fields[field] = wrongValue;
  assert.throws(() => validateB2ParsedResult(parsedB2EvidenceResult, parsedB1EvidenceResult, parsedB1ProofRecord, parsedSignedEvidenceResult, mutatedRecords, parsedB2AggregateLiveOperationResultRecord), new RegExp(`${field}|result_fingerprint`));
}
const parsedB2UnsafeAggregateRecordFields = { ...parsedB2AggregateLiveOperationResultRecordFields, success_after_post_provider_commit_rejection: "present" };
parsedB2UnsafeAggregateRecordFields.aggregate_record_fingerprint = deriveB2AggregateLiveOperationResultRecordFingerprint(parsedB2UnsafeAggregateRecordFields);
assert.throws(() => validateB2ParsedResult(parsedB2EvidenceResult, parsedB1EvidenceResult, parsedB1ProofRecord, parsedSignedEvidenceResult, parsedB2ScenarioRecords, { fields: parsedB2UnsafeAggregateRecordFields }), /absent/);
assert.throws(() => validateB2ParsedResult({ ...parsedB2EvidenceResult, b1_deployed_fingerprint: fixtureFingerprint("b1-mismatch") }, parsedB1EvidenceResult, parsedB1ProofRecord, parsedSignedEvidenceResult, parsedB2ScenarioRecords, parsedB2AggregateLiveOperationResultRecord), /strictly equal/);
const validB1StructuredResult = { ...parsedB1EvidenceResult, source_timestamp: "N/A", deployed_target_binding: "N/A", deployed_commit_binding: "N/A", deployed_fingerprint: fixtureFingerprint("valid-b1-structured-result") };
const validB1ProofRecord = { ...parsedB1ProofRecord };
assert.doesNotThrow(() => validateSatisfiedStructuredResult(validB1StructuredResult));
assert.throws(() => validateSatisfiedStructuredResult({ ...validB1StructuredResult, deployed_fingerprint: undefined }), /requires deployed_fingerprint/);
assert.throws(() => validateB1ParsedEvidenceRecord({ ...validB1ProofRecord, source_timestamp: "2026-08-99T00:15:00Z" }, validB1StructuredResult), /RFC3339 calendar day|Date\.parse/);
assert.throws(() => validateB1ParsedEvidenceRecord({ ...validB1ProofRecord, source_timestamp: "2026-08-09T02:15:00Z" }, validB1StructuredResult), /exact operation window/);
assert.throws(() => validateB1ParsedEvidenceRecord({ ...validB1ProofRecord, source_timestamp: "2026-08-01T00:15:00Z", time_window: "2026-08-01T00:00:00Z/2026-08-01T01:00:00Z" }, validB1StructuredResult), /stale/);
assert.throws(() => validateB1ParsedEvidenceRecord({ ...validB1ProofRecord, source_timestamp: "2026-08-11T00:15:00Z", time_window: "2026-08-11T00:00:00Z/2026-08-11T01:00:00Z" }, validB1StructuredResult), /future/);
for (const judgmentChildId of ["A4-product-price-judgment", "A5-legal-judgment", "A6-copy-judgment"]) {
  const judgmentResult = {
    child_id: judgmentChildId,
    judgment_output: "approved",
    bound_artifact_fingerprint: fixtureFingerprint(`judgment-${judgmentChildId}`),
    judgment_effective_date: "2026-08-09",
    effective_date: "2026-08-09",
    ...(["A4-product-price-judgment", "A5-legal-judgment", "A6-copy-judgment"].includes(judgmentChildId) ? { judgment_record_fingerprint: fixtureFingerprint(`judgment-record-${judgmentChildId}`) } : {})
  };
  assert.doesNotThrow(() => validateSatisfiedStructuredResult(judgmentResult));
  if (judgmentChildId === "A6-copy-judgment") assert.throws(() => validateSatisfiedStructuredResult({ ...judgmentResult, judgment_record_fingerprint: undefined }), /requires judgment_record_fingerprint/, "A6 satisfied result must require its independent judgment-record fingerprint");
  assert.throws(() => validateSatisfiedStructuredResult({ ...judgmentResult, judgment_effective_date: "2026-08-10" }), /effective date/);
}
assert.throws(() => validateSatisfiedStructuredResult({ child_id: "A4-product-price-judgment", judgment_output: "approved", bound_artifact_fingerprint: fixtureFingerprint("a4-stale"), judgment_record_fingerprint: fixtureFingerprint("a4-stale-record"), judgment_effective_date: "2026-08-01", effective_date: "2026-08-01" }), /stale/);
assert.throws(() => validateSatisfiedStructuredResult({ child_id: "A4-product-price-judgment", judgment_output: "approved", bound_artifact_fingerprint: fixtureFingerprint("a4-future"), judgment_record_fingerprint: fixtureFingerprint("a4-future-record"), judgment_effective_date: "2026-08-12", effective_date: "2026-08-12" }), /future/);
const jstDateBoundaryJudgment = { child_id: "A4-product-price-judgment", judgment_output: "approved", bound_artifact_fingerprint: fixtureFingerprint("a4-jst-date-boundary"), judgment_record_fingerprint: fixtureFingerprint("a4-jst-date-boundary-record"), judgment_effective_date: "2026-08-10", effective_date: "2026-08-10" };
assert.doesNotThrow(() => validateSatisfiedStructuredResult(jstDateBoundaryJudgment), "a JST judgment effective date of 2026-08-10 must remain fresh at the fixed evaluation anchor");
assert.throws(() => validateSatisfiedStructuredResult({ ...jstDateBoundaryJudgment, judgment_effective_date: "2026-08-12", effective_date: "2026-08-12" }), /future/, "a later JST judgment effective date must be future-dated at the fixed evaluation anchor");
for (const invalidJstCalendarDate of ["2026-02-30", "2026-02-29"]) {
  assert.throws(() => validateSatisfiedStructuredResult({ ...jstDateBoundaryJudgment, judgment_effective_date: invalidJstCalendarDate, effective_date: invalidJstCalendarDate }), /valid Asia\/Tokyo calendar day/, `${invalidJstCalendarDate} must reject instead of Date.parse normalization`);
}
const parsedSeparateSignedEvidenceRecord = parseSignedEvidenceRecord(`\`\`\`text\nevidence_record_id=NC-R1-FUTURE-B2-SIGNED-01\nevidence_record_type=signed-compatible-subscription-evidence\nsource=signed-subscription-evidence\nclassification=active-compatible\nauthority=complete-unambiguous\nfingerprint=${fixtureFingerprint("parsed-signed-separate")}\nsource_timestamp=2026-08-09T00:20:00Z\n\`\`\``);
assert.throws(() => parseSignedEvidenceRecord(`\`\`\`text\nevidence_record_id=NC-R1-FUTURE-B2-SIGNED-01\nevidence_record_type=signed-compatible-subscription-evidence\nsource=signed-subscription-evidence\nclassification=active-compatible\nauthority=complete-unambiguous\nfingerprint=${fixtureFingerprint("parsed-signed-separate")}\nsource_timestamp=2026-08-09T00:20:00Z\nraw_private_like_placeholder=none\n\`\`\``), /closed schema|unknown|strict/, "signed evidence parser must reject a sanitized unknown private-like field");
assert.throws(() => parseSignedEvidenceRecord(`\`\`\`text\nevidence_record_id=NC-R1-FUTURE-B2-SIGNED-01\nevidence_record_type=signed-compatible-subscription-evidence\nsource=signed-subscription-evidence\nclassification=active-compatible\nauthority=complete-unambiguous\nfingerprint=${fixtureFingerprint("parsed-signed-separate")}\nsource_timestamp=2026-08-09T00:20:00Z\nmalformed_sanitized_placeholder:none\n\`\`\``), /strict key=value/, "signed evidence parser must reject a colon-form sanitized placeholder");
assert.throws(() => parseB2ScenarioResultRecords(`outside-prose\n${futureB2ScenarioResultFixtureText()}`), /outside|strict/, "B2 scenario parser must reject outside prose");
const parsedB2IndependentEvidenceResult = {
  ...parsedB2EvidenceResult,
  requested_operation: b2BoundedLivePaidFlowVerificationOperation,
  source_timestamp: "2026-08-09T00:30:00Z",
  time_window: "2026-08-09T00:00:00Z/2026-08-09T01:00:00Z",
  b1_deployed_target_binding: validB1ProofRecord.observed_deployed_target_binding,
  b1_deployed_commit_binding: validB1ProofRecord.observed_deployed_commit_binding,
  b1_deployed_fingerprint: validB1StructuredResult.deployed_fingerprint,
  signed_evidence_record_id: parsedSeparateSignedEvidenceRecord.evidence_record_id,
  signed_evidence_source: parsedSeparateSignedEvidenceRecord.source,
  signed_evidence_classification: parsedSeparateSignedEvidenceRecord.classification,
  signed_evidence_authority: parsedSeparateSignedEvidenceRecord.authority,
  signed_evidence_fingerprint: parsedSeparateSignedEvidenceRecord.fingerprint,
  signed_evidence_source_timestamp: parsedSeparateSignedEvidenceRecord.source_timestamp
};
const parsedB2IndependentScenarioRecords = parseFutureB2ScenarioResultRecordsFor(parsedB2IndependentEvidenceResult);
const parsedB2IndependentScenarioRecordsById = new Map(parsedB2IndependentScenarioRecords.map((record) => [record.fields.scenario_id, record.fields]));
const parsedB2IndependentAggregateFields = {
  ...parsedB2AggregateLiveOperationResultRecordFields,
  approval_id: parsedB2IndependentEvidenceResult.approval_id,
  approval_fingerprint: parsedB2IndependentEvidenceResult.approval_fingerprint,
  requested_operation: b2BoundedLivePaidFlowVerificationOperation,
  b2_execution_id: parsedB2IndependentEvidenceResult.b2_execution_id,
  exact_target_or_scope: parsedB2IndependentEvidenceResult.exact_target_or_scope,
  target_scope_alias: parsedB2IndependentEvidenceResult.target_scope_alias,
  time_window: parsedB2IndependentEvidenceResult.time_window,
  b1_deployed_fingerprint: parsedB2IndependentEvidenceResult.b1_deployed_fingerprint,
  signed_evidence_record_id: parsedB2IndependentEvidenceResult.signed_evidence_record_id,
  signed_evidence_source: parsedB2IndependentEvidenceResult.signed_evidence_source,
  signed_evidence_classification: parsedB2IndependentEvidenceResult.signed_evidence_classification,
  signed_evidence_authority: parsedB2IndependentEvidenceResult.signed_evidence_authority,
  signed_evidence_fingerprint: parsedB2IndependentEvidenceResult.signed_evidence_fingerprint,
  ordered_b2_scenario_result_fingerprints: canonicalB2ScenarioContracts.map((contract) => parsedB2IndependentScenarioRecordsById.get(contract.scenario_id).result_fingerprint).join(","),
  scenario_results_aggregate_fingerprint: deriveB2ScenarioResultsAggregateFingerprint(parsedB2IndependentScenarioRecordsById),
  evidence_retention_location: parsedB2IndependentEvidenceResult.evidence_retention_location,
  aggregate_record_fingerprint: "pending"
};
parsedB2IndependentAggregateFields.aggregate_record_fingerprint = deriveB2AggregateLiveOperationResultRecordFingerprint(parsedB2IndependentAggregateFields);
parsedB2IndependentEvidenceResult.b2_aggregate_record_fingerprint = parsedB2IndependentAggregateFields.aggregate_record_fingerprint;
const parsedB2IndependentAggregateRecord = { fields: parsedB2IndependentAggregateFields };
assert.doesNotThrow(() => validateB2ParsedResult(parsedB2IndependentEvidenceResult, validB1StructuredResult, validB1ProofRecord, parsedSeparateSignedEvidenceRecord, parsedB2IndependentScenarioRecords, parsedB2IndependentAggregateRecord));
const { b1_deployed_target_binding: omittedB1TargetBinding, b1_deployed_commit_binding: omittedB1CommitBinding, b1_deployed_fingerprint: omittedB1Fingerprint, ...b2WithoutB1Bindings } = parsedB2IndependentEvidenceResult;
assert.throws(() => validateB2ParsedResult(b2WithoutB1Bindings, validB1StructuredResult, validB1ProofRecord, parsedSeparateSignedEvidenceRecord, parsedB2IndependentScenarioRecords, parsedB2IndependentAggregateRecord), /B2 satisfied result requires b1_deployed_target_binding/);
assert.throws(() => validateB2ParsedResult(parsedB2IndependentEvidenceResult, { child_id: "B1-deployed-target-proof" }, validB1ProofRecord, parsedSeparateSignedEvidenceRecord, parsedB2IndependentScenarioRecords, parsedB2IndependentAggregateRecord), /exact B1 approval ID/);
const { signed_evidence_record_id: omittedSignedEvidenceRecordId, signed_evidence_source: omittedSignedEvidenceSource, signed_evidence_classification: omittedSignedEvidenceClassification, signed_evidence_authority: omittedSignedEvidenceAuthority, signed_evidence_fingerprint: omittedSignedEvidenceFingerprint, signed_evidence_source_timestamp: omittedSignedEvidenceTimestamp, ...b2WithoutSignedEvidenceBindings } = parsedB2IndependentEvidenceResult;
assert.throws(() => validateB2ParsedResult(b2WithoutSignedEvidenceBindings, validB1StructuredResult, validB1ProofRecord, parsedSeparateSignedEvidenceRecord, parsedB2IndependentScenarioRecords, parsedB2IndependentAggregateRecord), /B2 satisfied result requires signed_evidence_record_id/);
assert.throws(() => validateB2ParsedResult(parsedB2IndependentEvidenceResult, validB1StructuredResult, validB1ProofRecord, { evidence_record_id: parsedSeparateSignedEvidenceRecord.evidence_record_id, evidence_record_type: parsedSeparateSignedEvidenceRecord.evidence_record_type }, parsedB2IndependentScenarioRecords, parsedB2IndependentAggregateRecord), /signed evidence record requires/);
assert.throws(() => validateB2ParsedResult({ ...parsedB2IndependentEvidenceResult, source_timestamp: "2026-08-09T02:30:00Z" }, validB1StructuredResult, validB1ProofRecord, parsedSeparateSignedEvidenceRecord, parsedB2IndependentScenarioRecords, parsedB2IndependentAggregateRecord), /exact operation window/);
assert.throws(() => validateB2ParsedResult({ ...parsedB2IndependentEvidenceResult, signed_evidence_source_timestamp: "2026-08-09T02:20:00Z" }, validB1StructuredResult, validB1ProofRecord, { ...parsedSeparateSignedEvidenceRecord, source_timestamp: "2026-08-09T02:20:00Z" }, parsedB2IndependentScenarioRecords, parsedB2IndependentAggregateRecord), /exact operation window/);
const b2CrossValidationFixture = parsedFingerprintGraphFixture("B2-live-paid-flow-evidence", "satisfied");
const b2CrossValidationRows = b2CrossValidationFixture.rowRecords;
const b2CrossValidationChildren = b2CrossValidationFixture.childRecords;
const b2CrossValidationLedger = b2CrossValidationFixture.ledger;
assert.throws(() => validateStagedLedgerCrossValidation(b2CrossValidationRows, b2CrossValidationChildren, b2CrossValidationLedger, [], b2CrossValidationFixture.b2ScenarioResultRecords, b2CrossValidationFixture.a3ObservedResultRecords, b2CrossValidationFixture.a2ObservedResultRecords, b2CrossValidationFixture.a1ObservedResultRecords, b2CrossValidationFixture.a4JudgmentResultRecords, b2CrossValidationFixture.a5LegalJudgmentResultRecords, b2CrossValidationFixture.a6CopyJudgmentResultRecords), /separate parsed signed evidence/);
assert.doesNotThrow(() => validateStagedLedgerCrossValidation(b2CrossValidationRows, b2CrossValidationChildren, b2CrossValidationLedger, b2CrossValidationFixture.signedEvidenceRecords, b2CrossValidationFixture.b2ScenarioResultRecords, b2CrossValidationFixture.a3ObservedResultRecords, b2CrossValidationFixture.a2ObservedResultRecords, b2CrossValidationFixture.a1ObservedResultRecords, b2CrossValidationFixture.a4JudgmentResultRecords, b2CrossValidationFixture.a5LegalJudgmentResultRecords, b2CrossValidationFixture.a6CopyJudgmentResultRecords));
const a3MissingObservedResultFixture = parsedFingerprintGraphFixture("A3-stripe-source-applicability-read-or-judgment", "satisfied");
assert.throws(
  () => validateStagedLedgerCrossValidation(
    a3MissingObservedResultFixture.rowRecords,
    a3MissingObservedResultFixture.childRecords,
    a3MissingObservedResultFixture.ledger,
    a3MissingObservedResultFixture.signedEvidenceRecords,
    a3MissingObservedResultFixture.b2ScenarioResultRecords
  ),
  /terminal A3 requires exactly one separate parsed observed result record/
);
const a2MissingObservedResultFixture = parsedFingerprintGraphFixture("A2-provider-cost-evidence-read", "satisfied");
assert.throws(
  () => validateStagedLedgerCrossValidation(
    a2MissingObservedResultFixture.rowRecords,
    a2MissingObservedResultFixture.childRecords,
    a2MissingObservedResultFixture.ledger,
    a2MissingObservedResultFixture.signedEvidenceRecords,
    a2MissingObservedResultFixture.b2ScenarioResultRecords,
    a2MissingObservedResultFixture.a3ObservedResultRecords
  ),
  /A2 requires a separate parsed observed result record/
);
function parsedFingerprintGraphFixture(closingChildId, childStatus) {
  const exactWindow = "2026-08-09T00:00:00Z/2026-08-09T01:00:00Z";
  const childRecords = parsedStagedChildren.map((child, index) => {
    const fields = {
      ...child.fields,
      child_status: "satisfied",
      freshness: "fresh",
      target: "exact",
      approval: "approved",
      fingerprint_bound: "yes",
      approval_id: `NC-R1-FUTURE-FINGERPRINT-${String(index + 1).padStart(2, "0")}`,
      explicit_decision: "approved",
      exact_target_or_scope: `sanitized-${child.fields.child_id}-scope`,
      evidence_retention_location: "sanitized-retention",
      dependent_stop_result: "not-applicable"
    };
    if (fields.child_type === "executable") {
      Object.assign(fields, {
        requested_operation: `sanitized-${fields.child_id}-operation`,
        time_window: exactWindow,
        operator: "approved-operator",
        bound_input: "N/A",
        effective_date: "N/A",
        required_approver: "N/A"
      });
    } else if (fields.child_type === "judgment") {
      Object.assign(fields, {
        requested_operation: "N/A",
        time_window: "N/A",
        operator: "N/A",
        bound_input: `sanitized-${fields.child_id}-input`,
        effective_date: "2026-08-09",
        required_approver: "release-owner"
      });
    } else if (fields.child_type === "external-prerequisite-reference") {
      Object.assign(fields, {
        requested_operation: "N/A",
        time_window: "N/A",
        operator: "N/A",
        bound_input: "N/A",
        effective_date: "N/A",
        required_approver: "N/A"
      });
    }
    return { ...child, fields };
  });
  const fieldsByChildId = new Map(childRecords.map((child) => [child.fields.child_id, child.fields]));
  Object.assign(fieldsByChildId.get("A0-provisional-cost-model-input"), {
    cost_model_decision: canonicalCompletedA0ProvisionalCostModelApprovalFields.cost_model_decision,
    judgment_output: "approved",
    effective_date: "2026-08-09",
    judgment_effective_date: "2026-08-09"
  });
  Object.assign(fieldsByChildId.get("A1-worker-cpu-source-disposition"), {
    source_disposition_outcome: "approved-safe-source-selected",
    judgment_output: "approved",
    judgment_effective_date: "2026-08-09"
  });
  Object.assign(fieldsByChildId.get("A1-worker-cpu-evidence-read"), {
    satisfied_result: satisfiedResultSchemas["A1-worker-cpu-evidence-read"],
    aggregation_complete: "yes",
    request_completeness: "complete",
    headroom_disposition: "approved",
    source_timestamp: "2026-08-09T09:15:00+09:00",
    time_window: "2026-08-09T09:00:00+09:00/2026-08-09T10:00:00+09:00"
  });
  Object.assign(fieldsByChildId.get("A2-provider-funding-external-prerequisite-reference"), {
    funding_requirement_state: "not-needed",
    funding_decision_basis_child: "A0-provisional-cost-model-input",
    funding_decision_basis_status: "satisfied",
    funding_decision_basis_freshness: "fresh",
    funding_decision_basis_target: "exact",
    funding_decision_basis_approval: "approved",
    funding_decision_basis_fingerprint_bound: "yes",
    funding_external_result_fingerprint: "N/A"
  });
  Object.assign(fieldsByChildId.get("A2-provider-cost-evidence-read"), {
    satisfied_result: satisfiedResultSchemas["A2-provider-cost-evidence-read"],
    sanitized_exact_cost: "sanitized-exact-cost-classified",
    applicability: "applicable",
    source_timestamp: "2026-08-09T00:15:00+09:00",
    time_window: "2026-08-09T00:00:00+09:00/2026-08-09T01:00:00+09:00"
  });
  Object.assign(fieldsByChildId.get("A3-stripe-source-applicability-read-or-judgment"), {
    ...validA3ReadStructuredResult,
    approval_id: canonicalUnapprovedA3StripePricingDocumentManualPacketFields.approval_id,
    exact_target_or_scope: canonicalUnapprovedA3StripePricingDocumentManualPacketFields.exact_target_or_scope,
    requested_operation: canonicalUnapprovedA3StripePricingDocumentManualPacketFields.requested_operation,
    operator: canonicalUnapprovedA3StripePricingDocumentManualPacketFields.operator,
    time_window: canonicalUnapprovedA3StripePricingDocumentManualPacketFields.time_window,
    source_timestamp: "2026-08-10T00:15:00+09:00",
    evidence_retention_location: canonicalUnapprovedA3StripePricingDocumentManualPacketFields.evidence_retention_location,
    satisfied_result: satisfiedResultSchemas["A3-stripe-source-applicability-read-or-judgment"],
    judgment_output: "N/A",
    bound_artifact_fingerprint: "N/A",
    judgment_effective_date: "N/A"
  });
  Object.assign(fieldsByChildId.get("A4-product-price-judgment"), {
    satisfied_result: satisfiedResultSchemas["A4-product-price-judgment"],
    judgment_output: "approved",
    effective_date: "2026-08-09",
    judgment_effective_date: "2026-08-09",
    required_approver: "kurodev"
  });
  Object.assign(fieldsByChildId.get("A5-legal-judgment"), {
    satisfied_result: satisfiedResultSchemas["A5-legal-judgment"],
    judgment_output: "approved",
    effective_date: "2026-08-09",
    judgment_effective_date: "2026-08-09",
    required_approver: "kurodev"
  });
  Object.assign(fieldsByChildId.get("A6-copy-judgment"), {
    satisfied_result: satisfiedResultSchemas["A6-copy-judgment"],
    judgment_output: "approved",
    effective_date: "2026-08-09",
    judgment_effective_date: "2026-08-09"
  });
  Object.assign(fieldsByChildId.get("B1-external-prerequisite-sanitized-result-reference"), {
    external_result_outcome: "sanitized-external-result-approved"
  });
  Object.assign(fieldsByChildId.get("B1-deployed-target-proof"), {
    ...validB1StructuredResult,
    satisfied_result: satisfiedResultSchemas["B1-deployed-target-proof"],
    source_timestamp: "2026-08-09T00:15:00Z",
    time_window: exactWindow
  });
  Object.assign(fieldsByChildId.get("B2-live-paid-flow-evidence"), {
    ...parsedB2IndependentEvidenceResult,
    child_id: "B2-live-paid-flow-evidence",
    source_timestamp: "2026-08-09T00:30:00Z",
    time_window: exactWindow,
    b2_execution_id: "NC-R1-FUTURE-B2-EXECUTION-01",
    target_scope_alias: "sanitized-b2-live-flow-target"
  });
  const preparedB2Fields = fieldsByChildId.get("B2-live-paid-flow-evidence");
  preparedB2Fields.approved_target_scope_binding = deriveB2ApprovedTargetScopeBinding(preparedB2Fields);
  preparedB2Fields.approved_signed_evidence_binding = deriveB2ApprovedSignedEvidenceBinding(preparedB2Fields);
  const a0Fields = fieldsByChildId.get("A0-provisional-cost-model-input");
  a0Fields.approval_id = canonicalCompletedA0ProvisionalCostModelApprovalFields.approval_id;
  for (const fields of fieldsByChildId.values()) fields.approval_fingerprint = deriveApprovalFingerprint(fields);
  const a0ApprovalFingerprint = a0Fields.approval_fingerprint;
  a0Fields.cost_model_input_fingerprint = deriveA0CostModelInputFingerprint(a0Fields, a0ApprovalFingerprint);
  a0Fields.cost_model_result_fingerprint = deriveA0CostModelResultFingerprint(a0Fields, a0Fields.cost_model_input_fingerprint);
  a0Fields.bound_artifact_fingerprint = deriveA0BoundArtifactFingerprint(a0Fields, a0Fields.cost_model_input_fingerprint, a0Fields.cost_model_result_fingerprint);
  const sourceDispositionFields = fieldsByChildId.get("A1-worker-cpu-source-disposition");
  sourceDispositionFields.result_fingerprint = deriveA1SourceDispositionFingerprint(sourceDispositionFields, sourceDispositionFields.approval_fingerprint);
  const a1Fields = fieldsByChildId.get("A1-worker-cpu-evidence-read");
  a1Fields.source_disposition_fingerprint = sourceDispositionFields.result_fingerprint;
  const a1ObservedResultFields = {
    record_status: "approved-completed-authenticated-private-read",
    evidence_id: "EVID-WORKER-CPU",
    child_id: a1Fields.child_id,
    approval_id: a1Fields.approval_id,
    approval_decision: "approved",
    approval_fingerprint: a1Fields.approval_fingerprint,
    exact_target_or_scope: a1Fields.exact_target_or_scope,
    time_window: a1Fields.time_window,
    operator: a1Fields.operator,
    source_disposition_fingerprint: sourceDispositionFields.result_fingerprint,
    observed_at: a1Fields.source_timestamp,
    target_match: "exact",
    aggregation_complete: "yes",
    request_completeness: "complete",
    headroom_disposition: "approved",
    sampling_confidence_completeness: "complete",
    raw_numeric_metrics_response_account_tag_private_script_credential_retained_or_shared: "no",
    trace_logs_dashboard_reopened_outside_exact_approved_surface: "no",
    provider_billing_configuration_or_write_action: "none",
    codex_browser_or_control: "none",
    incremental_charge: "no",
    stop_result: "none-complete",
    result_status: "complete",
    row_closure: "EVID-WORKER-CPU",
    a1_result_fingerprint: "pending-derived-A1-result",
    observed_record_fingerprint: "pending-derived-observed-record"
  };
  a1ObservedResultFields.observed_record_fingerprint = deriveA1ObservedRecordFingerprint(a1ObservedResultFields);
  a1Fields.observed_record_fingerprint = a1ObservedResultFields.observed_record_fingerprint;
  a1Fields.result_fingerprint = deriveA1EvidenceFingerprint(a1Fields, a1Fields.approval_fingerprint, sourceDispositionFields.result_fingerprint);
  a1ObservedResultFields.a1_result_fingerprint = a1Fields.result_fingerprint;
  const fundingFields = fieldsByChildId.get("A2-provider-funding-external-prerequisite-reference");
  Object.assign(fundingFields, {
    approval_id: "<required-unique-approval-id-A2-provider-funding-external-prerequisite-reference>",
    explicit_decision: "<required-explicit-approved-or-rejected-decision>",
    exact_target_or_scope: "<required-exact-sanitized-provider-funding-result-scope>",
    evidence_retention_location: "<required-sanitized-retention-location>",
    approval_fingerprint: "<required-sha256-fingerprint>",
    child_status: "unapproved",
    freshness: "missing",
    target: "missing",
    approval: "unapproved",
    fingerprint_bound: "no",
    funding_requirement_state: "not-needed",
    funding_external_result_fingerprint: "N/A",
    dependent_stop_result: "not-applicable"
  });
  const a2FundingDispositionResultFields = {
    record_status: "approved-completed-release-owner-judgment",
    record_type: "sanitized-provider-funding-requirement-disposition-result",
    evidence_id: "EVID-PROVIDER-COST",
    decision_record_id: "A2-provider-funding-requirement-disposition",
    dependent_child_id: fundingFields.child_id,
    owner_approval_record_fingerprint: "pending",
    funding_requirement_state: fundingFields.funding_requirement_state,
    owner_decision: "approved-no-external-funding-prerequisite-required",
    external_prerequisite_approval: "none",
    row_closure: "none",
    production_proof: "no",
    activation_status: "closed",
    disposition_record_fingerprint: "pending"
  };
  const a2FundingDispositionOwnerApprovalFields = {
    record_status: "approved-completed-release-owner-judgment",
    record_type: "sanitized-provider-funding-requirement-disposition-owner-approval",
    evidence_id: "EVID-PROVIDER-COST",
    decision_record_id: "A2-provider-funding-requirement-disposition",
    dependent_child_id: fundingFields.child_id,
    approval_id: canonicalUnapprovedA2ProviderFundingRequirementDispositionFields.approval_id,
    approval_decision: "approved",
    exact_target_or_scope: canonicalUnapprovedA2ProviderFundingRequirementDispositionFields.exact_target_or_scope,
    bound_a0_approval_id: a0Fields.approval_id,
    bound_a0_cost_model_input_fingerprint: a0Fields.cost_model_input_fingerprint,
    prior_funding_posture_approval_id: canonicalUnapprovedA2ProviderFundingRequirementDispositionFields.prior_funding_posture_approval_id,
    decision_input: canonicalUnapprovedA2ProviderFundingRequirementDispositionFields.decision_input,
    effective_date: canonicalUnapprovedA2ProviderFundingRequirementDispositionFields.effective_date,
    required_approver: "kurodev", decision_owner: "kurodev",
    funding_requirement_state: fundingFields.funding_requirement_state,
    owner_decision: "approved-no-external-funding-prerequisite-required",
    evidence_retention_location: "current-Codex-task-sanitized-report", stop_owner: "kurodev", rollback_owner: "kurodev",
    cost_guard: "zero-incremental-spend-and-separate-budget-approval-required", default_incremental_spend_jpy: "0", stop_before_any_incremental_charge: "yes",
    command: "<no-command-authorized>", external_action: "none", funding_authorization: "none", provider_api_authorization: "none", payment_or_credit_authorization: "none", external_prerequisite_approval: "none",
    row_closure: "none", production_proof: "no", activation_status: "closed", owner_approval_record_fingerprint: "pending"
  };
  a2FundingDispositionOwnerApprovalFields.owner_approval_record_fingerprint = deriveA2FundingDispositionOwnerApprovalRecordFingerprint(a2FundingDispositionOwnerApprovalFields);
  a2FundingDispositionResultFields.owner_approval_record_fingerprint = a2FundingDispositionOwnerApprovalFields.owner_approval_record_fingerprint;
  a2FundingDispositionResultFields.disposition_record_fingerprint = deriveA2FundingDispositionRecordFingerprint(a2FundingDispositionResultFields);
  fundingFields.funding_owner_approval_record_fingerprint = a2FundingDispositionOwnerApprovalFields.owner_approval_record_fingerprint;
  fundingFields.funding_disposition_record_fingerprint = a2FundingDispositionResultFields.disposition_record_fingerprint;
  fundingFields.funding_prerequisite_fingerprint = deriveFundingPrerequisiteFingerprint(fundingFields, a0Fields.cost_model_input_fingerprint, a2FundingDispositionOwnerApprovalFields.owner_approval_record_fingerprint, a2FundingDispositionResultFields.disposition_record_fingerprint);
  const a2Fields = fieldsByChildId.get("A2-provider-cost-evidence-read");
  a2Fields.dependency_fingerprint = a0Fields.cost_model_input_fingerprint;
  a2Fields.funding_prerequisite_fingerprint = fundingFields.funding_prerequisite_fingerprint;
  const a2ObservedResultFields = {
    record_status: "approved-completed-authenticated-private-read",
    evidence_id: "EVID-PROVIDER-COST",
    child_id: a2Fields.child_id,
    approval_id: a2Fields.approval_id,
    approval_decision: "approved",
    approval_fingerprint: a2Fields.approval_fingerprint,
    exact_target_or_scope: a2Fields.exact_target_or_scope,
    time_window: a2Fields.time_window,
    operator: a2Fields.operator,
    bound_a0_cost_model_input_fingerprint: a0Fields.cost_model_input_fingerprint,
    funding_prerequisite_fingerprint: fundingFields.funding_prerequisite_fingerprint,
    observed_at: a2Fields.source_timestamp,
    target_match: "exact",
    funded_headroom_classification: "positive-funded-headroom",
    aggregation_completeness: "complete",
    sanitized_exact_cost_classification: "available",
    applicability: "applicable",
    provider_api_write_payment_credit_budget_or_settings_action: "none",
    credential_creation_retrieval_disclosure: "none",
    raw_url_org_project_account_identifier_private_identifier_payload_retained_or_shared: "no",
    codex_browser_or_provider_control: "none",
    incremental_charge: "no",
    stop_result: "none-complete",
    result_status: "complete",
    row_closure: "EVID-PROVIDER-COST",
    a2_result_fingerprint: "pending-derived-A2-result",
    observed_record_fingerprint: "pending-derived-observed-record"
  };
  a2ObservedResultFields.observed_record_fingerprint = deriveA2ObservedRecordFingerprint(a2ObservedResultFields);
  a2Fields.observed_record_fingerprint = a2ObservedResultFields.observed_record_fingerprint;
  a2Fields.result_fingerprint = deriveA2ResultFingerprint(a2Fields, a2Fields.approval_fingerprint, a0Fields.cost_model_input_fingerprint, fundingFields.funding_prerequisite_fingerprint);
  a2Fields.cost_model_fingerprint = a2Fields.result_fingerprint;
  a2ObservedResultFields.a2_result_fingerprint = a2Fields.result_fingerprint;
  const a3Fields = fieldsByChildId.get("A3-stripe-source-applicability-read-or-judgment");
  a3Fields.dependency_fingerprint = a0Fields.cost_model_input_fingerprint;
  const a3ManualReadOwnerApprovalFields = {
    record_status: "approved-owner-approval-authenticated-private-read",
    record_type: "sanitized-a3-stripe-account-pricing-manual-read-owner-approval",
    evidence_id: "EVID-STRIPE-COST",
    child_id: a3Fields.child_id,
    selected_mode: "read",
    selected_approval_unit: "authenticated-private-read",
    requested_operation: canonicalUnapprovedA3StripePricingDocumentManualPacketFields.requested_operation,
    permitted_execution_surface: canonicalUnapprovedA3StripePricingDocumentManualPacketFields.permitted_execution_surface,
    command: "<no-Codex-command-authorized>", external_action: "none",
    operator: canonicalUnapprovedA3StripePricingDocumentManualPacketFields.operator,
    required_approver: "kurodev",
    approval_id: canonicalUnapprovedA3StripePricingDocumentManualPacketFields.approval_id,
    approval_decision: "approved",
    approval_fingerprint: a3Fields.approval_fingerprint,
    exact_target_or_scope: canonicalUnapprovedA3StripePricingDocumentManualPacketFields.exact_target_or_scope,
    time_window: canonicalUnapprovedA3StripePricingDocumentManualPacketFields.time_window,
    bound_a0_approval_id: a0Fields.approval_id,
    bound_a0_cost_model_input_fingerprint: a0Fields.cost_model_input_fingerprint,
    prior_stripe_cost_approval_ids: canonicalUnapprovedA3StripePricingDocumentManualPacketFields.prior_stripe_cost_approval_ids,
    verification_scope: canonicalUnapprovedA3StripePricingDocumentManualPacketFields.verification_scope,
    evidence_retention_location: canonicalUnapprovedA3StripePricingDocumentManualPacketFields.evidence_retention_location,
    stop_owner: "kurodev", rollback_owner: "kurodev",
    cost_guard: canonicalUnapprovedA3StripePricingDocumentManualPacketFields.cost_guard,
    default_incremental_spend_jpy: "0", stop_before_any_incremental_charge: "yes",
    payment_refund_client_or_event_settings_api_export_action: "none",
    credential_creation_retrieval_disclosure: "none",
    raw_document_contract_text_url_account_identifier_private_identifier_retention: "none",
    codex_browser_or_stripe_control: "none", public_pricing_substitution: "forbidden",
    partial_stop_condition: canonicalUnapprovedA3StripePricingDocumentManualPacketFields.partial_stop_condition,
    row_closure: "none", production_proof: "no", activation_status: "closed",
    owner_approval_record_fingerprint: "pending"
  };
  a3ManualReadOwnerApprovalFields.owner_approval_record_fingerprint = deriveA3ManualReadOwnerApprovalRecordFingerprint(a3ManualReadOwnerApprovalFields);
  a3Fields.owner_approval_record_fingerprint = a3ManualReadOwnerApprovalFields.owner_approval_record_fingerprint;
  const a3ObservedResultFields = {
    record_status: "approved-completed-authenticated-private-read",
    evidence_id: "EVID-STRIPE-COST",
    child_id: a3Fields.child_id,
    requested_operation: a3Fields.requested_operation,
    approval_id: a3Fields.approval_id,
    approval_decision: "approved",
    approval_fingerprint: a3Fields.approval_fingerprint,
    exact_target_or_scope: a3Fields.exact_target_or_scope,
    time_window: a3Fields.time_window,
    operator: a3Fields.operator,
    bound_a0_cost_model_input_fingerprint: a0Fields.cost_model_input_fingerprint,
    owner_approval_record_fingerprint: a3ManualReadOwnerApprovalFields.owner_approval_record_fingerprint,
    observed_at: a3Fields.source_timestamp,
    target_match: "exact",
    source_document_available: "available",
    direct_account_specific_base_processing_fee_available: "available",
    standard_custom_applicability: "custom",
    full_cost_model_completeness: "complete",
    sanitized_exact_cost_classification: "available",
    account_specific_pricing_terms_fingerprint: fixtureFingerprint("a3-account-specific-pricing-terms"),
    account_specific_pricing_terms_coverage: "complete",
    private_exposure_detected: "no",
    incremental_charge_required: "no",
    base_processing_fee_coverage: "complete",
    fixed_and_variable_components_coverage: "complete",
    refunds_disputes_chargebacks_coverage: "not-applicable",
    international_currency_conversion_coverage: "not-applicable",
    tax_and_other_account_specific_fee_coverage: "not-applicable",
    effective_scope_coverage: "complete",
    raw_document_contract_text_url_account_identifier_private_identifier_retained_or_shared: "no",
    payment_refund_client_or_event_settings_api_export_action: "none",
    credential_creation_retrieval_disclosure: "none",
    codex_browser_or_stripe_control: "none",
    public_pricing_substitution: "no",
    incremental_charge: "no",
    stop_result: "none-complete",
    result_status: "complete",
    row_closure: "EVID-STRIPE-COST",
    a3_result_fingerprint: "pending-derived-A3-result",
    observed_record_fingerprint: "pending-derived-observed-record"
  };
  a3ObservedResultFields.observed_record_fingerprint = deriveA3ObservedRecordFingerprint(a3ObservedResultFields);
  a3Fields.observed_record_fingerprint = a3ObservedResultFields.observed_record_fingerprint;
  a3Fields.result_fingerprint = deriveA3ResultFingerprint(a3Fields, a3Fields.approval_fingerprint, a0Fields.cost_model_input_fingerprint, a3ManualReadOwnerApprovalFields.owner_approval_record_fingerprint);
  a3Fields.cost_model_fingerprint = a3Fields.result_fingerprint;
  a3ObservedResultFields.a3_result_fingerprint = a3Fields.result_fingerprint;
  const a4Fields = fieldsByChildId.get("A4-product-price-judgment");
  a4Fields.a2_result_fingerprint = a2Fields.result_fingerprint;
  a4Fields.a3_result_fingerprint = a3Fields.result_fingerprint;
  a4Fields.dependency_fingerprint_composite = `a2=${a2Fields.result_fingerprint};a3=${a3Fields.result_fingerprint}`;
  const a4JudgmentResultFields = {
    record_status: "approved-completed-release-owner-judgment",
    record_type: "product-price-release-owner-judgment-result",
    evidence_id: "EVID-PRODUCT-PRICE",
    child_id: a4Fields.child_id,
    judgment_record_id: "NC-R1-A4-JUDGMENT-FIXTURE-01",
    approval_id: a4Fields.approval_id,
    approval_decision: "approved",
    approval_fingerprint: a4Fields.approval_fingerprint,
    exact_target_or_scope: a4Fields.exact_target_or_scope,
    required_approver: a4Fields.required_approver,
    decision_owner: "kurodev",
    effective_date: a4Fields.effective_date,
    bound_a2_result_fingerprint: a2Fields.result_fingerprint,
    bound_a3_result_fingerprint: a3Fields.result_fingerprint,
    dependency_fingerprint_composite: a4Fields.dependency_fingerprint_composite,
    product_scope_disposition: "approved-exact-scope",
    price_posture_disposition: "approved-exact-posture",
    exclusions_bound: "yes",
    material_change_revalidation: "required",
    evidence_retention_location: a4Fields.evidence_retention_location,
    stop_owner: "kurodev",
    rollback_owner: "kurodev",
    legal_tax_copy_risk_deploy_live_go_activation_publication_authorization: "none",
    judgment_output: "approved",
    row_closure: "EVID-PRODUCT-PRICE-only",
    a4_result_fingerprint: "pending-derived-A4-result",
    judgment_record_fingerprint: "pending-derived-judgment-record"
  };
  a4JudgmentResultFields.judgment_record_fingerprint = deriveA4JudgmentRecordFingerprint(a4JudgmentResultFields);
  a4Fields.judgment_record_fingerprint = a4JudgmentResultFields.judgment_record_fingerprint;
  a4Fields.bound_artifact_fingerprint = deriveA4ArtifactFingerprint(a4Fields, a4Fields.approval_fingerprint, a2Fields.result_fingerprint, a3Fields.result_fingerprint, a4Fields.judgment_record_fingerprint);
  a4JudgmentResultFields.a4_result_fingerprint = a4Fields.bound_artifact_fingerprint;
  const a5Fields = fieldsByChildId.get("A5-legal-judgment");
  const a5NonClosing = closingChildId === "A5-legal-judgment" && childStatus === "complete-not-closure-eligible";
  if (a5NonClosing) a5Fields.judgment_output = "rejected";
  a5Fields.bound_input = a4Fields.bound_artifact_fingerprint;
  a5Fields.approval_fingerprint = deriveApprovalFingerprint(a5Fields);
  a5Fields.a4_artifact_fingerprint = a4Fields.bound_artifact_fingerprint;
  const a5LegalJudgmentResultFields = {
    record_status: "approved-completed-release-owner-judgment",
    record_type: "legal-tax-release-owner-judgment-result",
    evidence_id: "EVID-LEGAL",
    child_id: a5Fields.child_id,
    judgment_record_id: "NC-R1-A5-JUDGMENT-FIXTURE-01",
    approval_id: a5Fields.approval_id,
    approval_decision: "approved",
    approval_fingerprint: a5Fields.approval_fingerprint,
    exact_target_or_scope: a5Fields.exact_target_or_scope,
    required_approver: a5Fields.required_approver,
    decision_owner: "kurodev",
    effective_date: a5Fields.effective_date,
    bound_a4_artifact_fingerprint: a4Fields.bound_artifact_fingerprint,
    legal_scope_disposition: a5NonClosing ? "reviewed-exact-scope" : "approved-exact-scope",
    legal_tax_posture_disposition: a5NonClosing ? "rejected-exact-posture" : "approved-exact-posture",
    exclusions_bound: "yes",
    material_change_revalidation: "required",
    evidence_retention_location: a5Fields.evidence_retention_location,
    stop_owner: "kurodev",
    rollback_owner: "kurodev",
    copy_risk_deploy_live_go_activation_publication_authorization: "none",
    judgment_output: a5NonClosing ? "rejected" : "approved",
    row_closure: a5NonClosing ? "none" : "EVID-LEGAL-only",
    a5_result_fingerprint: "pending-derived-A5-result",
    judgment_record_fingerprint: "pending-derived-judgment-record"
  };
  a5LegalJudgmentResultFields.judgment_record_fingerprint = deriveA5LegalJudgmentRecordFingerprint(a5LegalJudgmentResultFields);
  a5Fields.judgment_record_fingerprint = a5LegalJudgmentResultFields.judgment_record_fingerprint;
  a5Fields.bound_artifact_fingerprint = deriveA5ArtifactFingerprint(a5Fields, a5Fields.approval_fingerprint, a4Fields.bound_artifact_fingerprint, a5Fields.judgment_record_fingerprint);
  a5LegalJudgmentResultFields.a5_result_fingerprint = a5Fields.bound_artifact_fingerprint;
  const a6Fields = fieldsByChildId.get("A6-copy-judgment");
  const a6NonClosing = closingChildId === "A6-copy-judgment" && childStatus === "complete-not-closure-eligible";
  if (a6NonClosing) a6Fields.judgment_output = "rejected";
  a6Fields.required_approver = "kurodev";
  a6Fields.a4_artifact_fingerprint = a4Fields.bound_artifact_fingerprint;
  a6Fields.a5_artifact_fingerprint = a5Fields.bound_artifact_fingerprint;
  a6Fields.bound_input = `copy=${a6Fields.exact_target_or_scope};a4=${a4Fields.bound_artifact_fingerprint};a5=${a5Fields.bound_artifact_fingerprint}`;
  a6Fields.approval_fingerprint = deriveApprovalFingerprint(a6Fields);
  const a6CopyJudgmentResultFields = {
    record_status: "approved-completed-release-owner-judgment",
    record_type: "copy-release-owner-judgment-result",
    evidence_id: "EVID-COPY",
    child_id: a6Fields.child_id,
    judgment_record_id: "NC-R1-A6-JUDGMENT-FIXTURE-01",
    approval_id: a6Fields.approval_id,
    approval_decision: "approved",
    approval_fingerprint: a6Fields.approval_fingerprint,
    exact_target_or_scope: a6Fields.exact_target_or_scope,
    required_approver: a6Fields.required_approver,
    decision_owner: "kurodev",
    effective_date: a6Fields.effective_date,
    copy_artifact_identifier_or_content_fingerprint: a6Fields.exact_target_or_scope,
    bound_a4_artifact_fingerprint: a4Fields.bound_artifact_fingerprint,
    bound_a5_artifact_fingerprint: a5Fields.bound_artifact_fingerprint,
    dependency_fingerprint_composite: a6Fields.bound_input,
    copy_scope_disposition: a6NonClosing ? "reviewed-exact-scope" : "approved-exact-scope",
    copy_posture_disposition: a6NonClosing ? "rejected-exact-posture" : "approved-exact-posture",
    exclusions_bound: "yes",
    material_change_revalidation: "required",
    evidence_retention_location: a6Fields.evidence_retention_location,
    stop_owner: "kurodev",
    rollback_owner: "kurodev",
    publication_public_paid_gate_risk_deploy_live_go_activation_external_action_authorization: "none",
    judgment_output: a6NonClosing ? "rejected" : "approved",
    row_closure: a6NonClosing ? "none" : "EVID-COPY-only",
    a6_result_fingerprint: "pending-derived-A6-result",
    judgment_record_fingerprint: "pending-derived-judgment-record"
  };
  a6CopyJudgmentResultFields.judgment_record_fingerprint = deriveA6CopyJudgmentRecordFingerprint(a6CopyJudgmentResultFields);
  a6Fields.judgment_record_fingerprint = a6CopyJudgmentResultFields.judgment_record_fingerprint;
  a6Fields.bound_artifact_fingerprint = deriveA6ArtifactFingerprint(a6Fields, a6Fields.approval_fingerprint, a4Fields.bound_artifact_fingerprint, a5Fields.bound_artifact_fingerprint, a6Fields.judgment_record_fingerprint);
  a6CopyJudgmentResultFields.a6_result_fingerprint = a6Fields.bound_artifact_fingerprint;
  const externalFields = fieldsByChildId.get("B1-external-prerequisite-sanitized-result-reference");
  const b1ExternalPrerequisiteResultRecordFields = {
    record_status: "approved-completed-external-prerequisite-result",
    record_type: "sanitized-external-prerequisite-completed-result",
    external_result_record_id: "NC-R1-B1-EXTERNAL-FIXTURE-01",
    reference_child_id: externalFields.child_id,
    reference_child_approval_id: externalFields.approval_id,
    reference_child_approval_fingerprint: externalFields.approval_fingerprint,
    exact_target_or_scope: externalFields.exact_target_or_scope,
    external_lane_approval_id: "NC-R1-EXTERNAL-LANE-FIXTURE-01",
    external_lane_approval_decision: "approved",
    source: "independently-authorized-external-lane-sanitized-result",
    time_window: "2026-08-09T00:00:00Z/2026-08-09T01:00:00Z",
    source_timestamp: "2026-08-09T00:15:00Z",
    completion_status: "complete",
    outcome: "sanitized-external-result-approved",
    evidence_retention_location: externalFields.evidence_retention_location,
    stop_owner: "kurodev",
    rollback_owner: "kurodev",
    nc_r1_execution_or_authorization: "none",
    sensitive_configuration_binding_value_retention: "none",
    external_result_record_fingerprint: "pending"
  };
  b1ExternalPrerequisiteResultRecordFields.external_result_record_fingerprint = deriveB1ExternalPrerequisiteResultRecordFingerprint(b1ExternalPrerequisiteResultRecordFields);
  externalFields.external_result_record_fingerprint = b1ExternalPrerequisiteResultRecordFields.external_result_record_fingerprint;
  externalFields.external_result_fingerprint = deriveExternalPrerequisiteFingerprint(externalFields, externalFields.approval_fingerprint);
  const b1Fields = fieldsByChildId.get("B1-deployed-target-proof");
  b1Fields.a1_result_fingerprint = a1Fields.result_fingerprint;
  b1Fields.a4_artifact_fingerprint = a4Fields.bound_artifact_fingerprint;
  b1Fields.a5_artifact_fingerprint = a5Fields.bound_artifact_fingerprint;
  b1Fields.a6_artifact_fingerprint = a6Fields.bound_artifact_fingerprint;
  b1Fields.external_prerequisite_fingerprint = externalFields.external_result_fingerprint;
  b1Fields.expected_target_alias = "approved-deployed-target-nonpublic";
  b1Fields.expected_commit_alias = "approved-deployed-commit-bound";
  b1Fields.source_timestamp = "N/A";
  b1Fields.deployed_target_binding = "N/A";
  b1Fields.deployed_commit_binding = "N/A";
  b1Fields.approval_fingerprint = deriveApprovalFingerprint(b1Fields);
  const b1ProofRecordFields = {
    record_status: "approved-completed-deployed-target-proof",
    record_type: "sanitized-deployed-target-proof-result",
    evidence_id: "EVID-DEPLOYED-TARGET",
    child_id: b1Fields.child_id,
    proof_record_id: "NC-R1-B1-PROOF-FIXTURE-01",
    approval_id: b1Fields.approval_id,
    approval_decision: "approved",
    approval_fingerprint: b1Fields.approval_fingerprint,
    exact_target_or_scope: b1Fields.exact_target_or_scope,
    expected_target_alias: b1Fields.expected_target_alias,
    expected_commit_alias: b1Fields.expected_commit_alias,
    requested_operation: b1Fields.requested_operation,
    time_window: b1Fields.time_window,
    operator: b1Fields.operator,
    required_approver: "kurodev",
    evidence_retention_location: b1Fields.evidence_retention_location,
    stop_owner: "kurodev",
    rollback_owner: "kurodev",
    source_timestamp: "2026-08-09T00:15:00Z",
    observed_deployed_target_binding: b1Fields.expected_target_alias,
    observed_deployed_commit_binding: b1Fields.expected_commit_alias,
    target_match: "exact",
    commit_match: "exact",
    proof_completeness: "complete",
    freshness: "fresh",
    no_merge_ci_build_local_inference: "yes",
    migration_config_binding_git_merge_deploy_live_public_paid_go_activation_external_authorization_or_execution: "none",
    closure_outcome: "EVID-DEPLOYED-TARGET-only",
    proof_record_fingerprint: "pending"
  };
  b1ProofRecordFields.proof_record_fingerprint = deriveB1ProofRecordFingerprint(b1ProofRecordFields);
  b1Fields.proof_record_fingerprint = b1ProofRecordFields.proof_record_fingerprint;
  b1Fields.deployed_fingerprint = deriveB1DeployedFingerprint(b1Fields, b1Fields.approval_fingerprint, {
    a1: a1Fields.result_fingerprint,
    a4: a4Fields.bound_artifact_fingerprint,
    a5: a5Fields.bound_artifact_fingerprint,
    a6: a6Fields.bound_artifact_fingerprint,
    external: externalFields.external_result_fingerprint,
    proofRecord: b1ProofRecordFields.proof_record_fingerprint
  });
  const signedEvidenceRecord = { ...parsedSeparateSignedEvidenceRecord };
  signedEvidenceRecord.fingerprint = deriveSignedEvidenceFingerprint(signedEvidenceRecord);
  const b2Fields = fieldsByChildId.get("B2-live-paid-flow-evidence");
  const closingChild = fieldsByChildId.get(closingChildId);
  closingChild.child_status = childStatus;
  let b2ScenarioResultRecords = [];
  let b2AggregateLiveOperationResultRecords = [];
  if (closingChildId === "B2-live-paid-flow-evidence") {
    b2Fields.b1_deployed_target_binding = b1ProofRecordFields.observed_deployed_target_binding;
    b2Fields.b1_deployed_commit_binding = b1ProofRecordFields.observed_deployed_commit_binding;
    b2Fields.b1_deployed_fingerprint = b1Fields.deployed_fingerprint;
    b2Fields.signed_evidence_record_id = signedEvidenceRecord.evidence_record_id;
    b2Fields.signed_evidence_source = signedEvidenceRecord.source;
    b2Fields.signed_evidence_classification = signedEvidenceRecord.classification;
    b2Fields.signed_evidence_authority = signedEvidenceRecord.authority;
    b2Fields.signed_evidence_fingerprint = signedEvidenceRecord.fingerprint;
    b2Fields.signed_evidence_source_timestamp = signedEvidenceRecord.source_timestamp;
    if (["satisfied", "complete-not-closure-eligible"].includes(childStatus)) {
      b2ScenarioResultRecords = parseFutureB2ScenarioResultRecordsFor(b2Fields);
      const scenarioRecordsById = new Map(b2ScenarioResultRecords.map((record) => [record.fields.scenario_id, record.fields]));
      const nonClosing = childStatus === "complete-not-closure-eligible";
      const aggregateFields = {
        record_status: nonClosing ? "approved-complete-not-closure-eligible-live-operation-result" : "approved-completed-live-operation-result",
        record_type: "sanitized-aggregate-live-operation-result",
        aggregate_record_id: "NC-R1-B2-AGGREGATE-FIXTURE-01",
        evidence_id: "EVID-LIVE-PAID-FLOW",
        child_id: b2Fields.child_id,
        approval_id: b2Fields.approval_id,
        approval_fingerprint: b2Fields.approval_fingerprint,
        requested_operation: b2Fields.requested_operation,
        b2_execution_id: b2Fields.b2_execution_id,
        exact_target_or_scope: b2Fields.exact_target_or_scope,
        target_scope_alias: b2Fields.target_scope_alias,
        time_window: b2Fields.time_window,
        b1_deployed_fingerprint: b1Fields.deployed_fingerprint,
        signed_evidence_record_id: signedEvidenceRecord.evidence_record_id,
        signed_evidence_source: signedEvidenceRecord.source,
        signed_evidence_classification: signedEvidenceRecord.classification,
        signed_evidence_authority: signedEvidenceRecord.authority,
        signed_evidence_fingerprint: signedEvidenceRecord.fingerprint,
        ordered_b2_scenario_result_ids: canonicalB2ScenarioContracts.map((contract) => contract.scenario_result_id).join(","),
        ordered_b2_scenario_result_fingerprints: canonicalB2ScenarioContracts.map((contract) => scenarioRecordsById.get(contract.scenario_id).result_fingerprint).join(","),
        scenario_results_aggregate_fingerprint: deriveB2ScenarioResultsAggregateFingerprint(scenarioRecordsById),
        source_timestamp: "2026-08-09T00:30:00Z",
        freshness: "fresh",
        aggregate_outcome: nonClosing ? "aggregate-unambiguous-nonclosing" : "paid-authority-only-and-free-fail-closed-otherwise",
        side_effect_summary: "canonical-19-scenario-side-effects-exact",
        positive_paid_result: "Paid",
        compatible_active_signed_subscription: "compatible-active-signed-subscription",
        signed_authority_status: "complete-unambiguous",
        b1_deployed_binding: "approved-deployed-target-and-commit",
        expected_paid_transition_count: "1",
        provider_calls_after_budget_quota_rejection: "0",
        usage_commits_after_provider_failure: "0",
        output_after_post_provider_commit_rejection: "suppressed",
        success_after_post_provider_commit_rejection: "absent",
        final_state: "Free-fail-closed",
        unexpected_paid_transitions: "0",
        closure_eligibility: nonClosing ? "ineligible" : "eligible",
        nonclosure_reason: nonClosing ? "bound-approval-withholds-row-closure" : "none",
        closure_disposition: nonClosing ? "none" : "EVID-LIVE-PAID-FLOW-only",
        evidence_retention_location: b2Fields.evidence_retention_location,
        stop_owner: "kurodev",
        rollback_owner: "kurodev",
        extra_authorization_or_execution: "none",
        aggregate_record_fingerprint: "pending"
      };
      aggregateFields.aggregate_record_fingerprint = deriveB2AggregateLiveOperationResultRecordFingerprint(aggregateFields);
      b2Fields.b2_aggregate_record_fingerprint = aggregateFields.aggregate_record_fingerprint;
      b2Fields.result_fingerprint = deriveB2ResultFingerprint(b2Fields, b2Fields.approval_fingerprint, b1Fields.deployed_fingerprint, signedEvidenceRecord.fingerprint, aggregateFields.aggregate_record_fingerprint);
      b2AggregateLiveOperationResultRecords = [{ fields: aggregateFields }];
    } else if (["approved-not-started", "running", "partial-stop"].includes(childStatus)) {
      b2Fields.b2_aggregate_record_fingerprint = "N/A";
      b2Fields.b2_scenario_result_ids = "N/A";
      b2Fields.result_fingerprint = "N/A";
      b2Fields.approval_fingerprint = deriveApprovalFingerprint(b2Fields);
    }
  }
  if (closingChildId === "B1-deployed-target-proof" && childStatus === "complete-not-closure-eligible") {
    b1ProofRecordFields.record_status = "approved-complete-not-closure-eligible-deployed-target-proof";
    b1ProofRecordFields.proof_completeness = "incomplete";
    b1ProofRecordFields.closure_outcome = "none";
    b1ProofRecordFields.proof_record_fingerprint = deriveB1ProofRecordFingerprint(b1ProofRecordFields);
    b1Fields.proof_record_fingerprint = b1ProofRecordFields.proof_record_fingerprint;
    b1Fields.deployed_fingerprint = deriveB1DeployedFingerprint(b1Fields, b1Fields.approval_fingerprint, {
      a1: a1Fields.result_fingerprint, a4: a4Fields.bound_artifact_fingerprint, a5: a5Fields.bound_artifact_fingerprint, a6: a6Fields.bound_artifact_fingerprint,
      external: externalFields.external_result_fingerprint, proofRecord: b1ProofRecordFields.proof_record_fingerprint
    });
  }
  if (!["B1-deployed-target-proof", "B2-live-paid-flow-evidence"].includes(closingChildId)) {
    b1Fields.child_status = "approved-not-started";
  }
  if (closingChildId !== "B2-live-paid-flow-evidence") {
    b2Fields.child_status = "approved-not-started";
    b2Fields.b2_aggregate_record_fingerprint = "N/A";
    b2Fields.b2_scenario_result_ids = "N/A";
    b2Fields.result_fingerprint = "N/A";
  }
  const row = parseStagedRows(checklist).find((candidate) => candidate.fields.row_closing_child === closingChildId);
  const rowRecords = [{ ...row, fields: { ...row.fields, row_group_status: childStatus } }];
  const ledger = cloneRows(evidenceRows);
  if (childStatus === "satisfied") ledger.find((entry) => entry.id === row.fields.row_group_id).status = "satisfied";
  const a5LegalJudgmentResultRecords = a4Fields.child_status === "satisfied" && ["satisfied", "complete-not-closure-eligible"].includes(a5Fields.child_status)
    ? [{ fields: a5LegalJudgmentResultFields }]
    : [];
  const a6CopyJudgmentResultRecords = a4Fields.child_status === "satisfied" && a5Fields.child_status === "satisfied" && ["satisfied", "complete-not-closure-eligible"].includes(a6Fields.child_status)
    ? [{ fields: a6CopyJudgmentResultFields }]
    : [];
  Object.defineProperty(childRecords, "b1DeployedTargetProofRecords", { value: ["satisfied", "complete-not-closure-eligible"].includes(b1Fields.child_status) ? [{ fields: b1ProofRecordFields }] : [], enumerable: false });
  Object.defineProperty(childRecords, "b1ExternalPrerequisiteResultRecords", { value: externalFields.child_status === "satisfied" ? [{ fields: b1ExternalPrerequisiteResultRecordFields }] : [], enumerable: false });
  Object.defineProperty(childRecords, "b2AggregateLiveOperationResultRecords", { value: b2AggregateLiveOperationResultRecords, enumerable: false });
  Object.defineProperty(childRecords, "a2FundingDispositionOwnerApprovalRecords", { value: [{ fields: a2FundingDispositionOwnerApprovalFields }], enumerable: false });
  Object.defineProperty(childRecords, "a2FundingRequirementDispositionResultRecords", { value: [{ fields: a2FundingDispositionResultFields }], enumerable: false });
  Object.defineProperty(childRecords, "a3ManualReadOwnerApprovalRecords", { value: [{ fields: a3ManualReadOwnerApprovalFields }], enumerable: false });
  return { rowRecords, childRecords, ledger, signedEvidenceRecords: [signedEvidenceRecord], b2ScenarioResultRecords, a3ObservedResultRecords: [{ fields: a3ObservedResultFields }], a2ObservedResultRecords: [{ fields: a2ObservedResultFields }], a1ObservedResultRecords: [{ fields: a1ObservedResultFields }], a4JudgmentResultRecords: [{ fields: a4JudgmentResultFields }], a5LegalJudgmentResultRecords, a6CopyJudgmentResultRecords, b1DeployedTargetProofRecords: childRecords.b1DeployedTargetProofRecords, b1ExternalPrerequisiteResultRecords: childRecords.b1ExternalPrerequisiteResultRecords, b2AggregateLiveOperationResultRecords: childRecords.b2AggregateLiveOperationResultRecords, a2FundingDispositionOwnerApprovalRecords: childRecords.a2FundingDispositionOwnerApprovalRecords, a2FundingRequirementDispositionResultRecords: childRecords.a2FundingRequirementDispositionResultRecords, a3ManualReadOwnerApprovalRecords: childRecords.a3ManualReadOwnerApprovalRecords };
}

const a2FundingDispositionValidationFixture = parsedFingerprintGraphFixture("A2-provider-cost-evidence-read", "running");
const a2FundingDispositionValidationRecord = a2FundingDispositionValidationFixture.a2FundingRequirementDispositionResultRecords[0].fields;
const a2FundingDispositionValidationOwnerApproval = a2FundingDispositionValidationFixture.a2FundingDispositionOwnerApprovalRecords[0].fields;
const a2FundingDispositionValidationReference = a2FundingDispositionValidationFixture.childRecords.find((child) => child.fields.child_id === "A2-provider-funding-external-prerequisite-reference").fields;
const a2FundingDispositionValidationA0 = a2FundingDispositionValidationFixture.childRecords.find((child) => child.fields.child_id === "A0-provisional-cost-model-input").fields;
function a2TransitionDispositionBundle(fundingRequirementState) {
  const ownerDecisions = {
    "not-needed": "approved-no-external-funding-prerequisite-required",
    "already-available": "approved-existing-funded-headroom-available-no-external-prerequisite-required",
    "needed-absent": "retain-no-go-require-separate-external-funding-prerequisite"
  };
  const ownerApprovalRecord = {
    ...a2FundingDispositionValidationOwnerApproval,
    funding_requirement_state: fundingRequirementState,
    owner_decision: ownerDecisions[fundingRequirementState]
  };
  ownerApprovalRecord.owner_approval_record_fingerprint = deriveA2FundingDispositionOwnerApprovalRecordFingerprint(ownerApprovalRecord);
  const dispositionResultRecord = {
    ...a2FundingDispositionValidationRecord,
    owner_approval_record_fingerprint: ownerApprovalRecord.owner_approval_record_fingerprint,
    funding_requirement_state: fundingRequirementState,
    owner_decision: ownerApprovalRecord.owner_decision
  };
  dispositionResultRecord.disposition_record_fingerprint = deriveA2FundingDispositionRecordFingerprint(dispositionResultRecord);
  const fundingPrerequisiteRecord = {
    fields: {
      ...a2FundingDispositionValidationReference,
      funding_requirement_state: fundingRequirementState,
      funding_owner_approval_record_fingerprint: ownerApprovalRecord.owner_approval_record_fingerprint,
      funding_disposition_record_fingerprint: dispositionResultRecord.disposition_record_fingerprint,
      funding_external_result_fingerprint: fundingRequirementState === "needed-absent" ? fixtureFingerprint("future-a2-external-funding-result") : "N/A"
    }
  };
  return { fundingPrerequisiteRecord, ownerApprovalRecord, dispositionResultRecord, a0Child: a2FundingDispositionValidationA0 };
}
const a2FundingDispositionValidationFence = `\`\`\`text\n${a2FundingRequirementDispositionResultRecordFields.map((field) => `${field}=${a2FundingDispositionValidationRecord[field]}`).join("\n")}\n\`\`\``;
const parsedA2FundingDispositionValidationRecord = parseA2FundingRequirementDispositionResultRecord(a2FundingDispositionValidationFence);
assert.deepEqual(parsedA2FundingDispositionValidationRecord.fields, a2FundingDispositionValidationRecord, "A2 funding disposition parser must retain the exact closed sanitized record");
assert.doesNotThrow(() => validateA2FundingRequirementDispositionResultRecord(parsedA2FundingDispositionValidationRecord, a2FundingDispositionValidationReference, a2FundingDispositionValidationOwnerApproval, a2FundingDispositionValidationA0));
for (const malformed of [
  `outside-prose\n${a2FundingDispositionValidationFence}`,
  a2FundingDispositionValidationFence.replace("\nrecord_type=", "\nunknown_authority_field=none\nrecord_type="),
  a2FundingDispositionValidationFence.replace("\nrecord_type=", "\nrecord_type=sanitized-provider-funding-requirement-disposition-result\nrecord_type=")
]) assert.throws(() => parseA2FundingRequirementDispositionResultRecord(malformed), /outside|closed schema|duplicate|strict/, "A2 funding disposition parser must reject outside prose, unknown fields, and duplicates");
const a2FundingDispositionTemplateRaw = `\`\`\`text\n${a2FundingRequirementDispositionResultRecordFields.map((field) => `${field}=${a2FundingDispositionResultTemplate.fields[field]}`).join("\n")}\n\`\`\``;
assert.throws(() => validateA2FundingRequirementDispositionResultRecord(parseA2FundingRequirementDispositionResultRecord(a2FundingDispositionTemplateRaw), a2FundingDispositionValidationReference, a2FundingDispositionValidationOwnerApproval, a2FundingDispositionValidationA0), /sanitized alias|approved completed/, "A2 non-evidence disposition template must not substitute for an actual owner disposition");
for (const [field, value, expected] of [
  ["bound_a0_cost_model_input_fingerprint", fixtureFingerprint("wrong-a0-input"), /actual A0 input fingerprint/],
  ["approval_id", "NC-R1-A2-PROVIDER-FUNDING-REQUIREMENT-DISPOSITION-OTHER", /corrected A2 approval ID/],
  ["effective_date", "2026-08-11", /exact approved effective date|future/],
  ["effective_date", "2026-08-01", /exact approved effective date|stale/],
  ["effective_date", "2026-02-30", /exact approved effective date|valid Asia\/Tokyo calendar day/],
  ["decision_owner", "other-owner", /kurodev/],
  ["funding_authorization", "approved", /must retain a sanitized alias|none/],
  ["provider_api_authorization", "approved", /must retain a sanitized alias|none/],
  ["payment_or_credit_authorization", "approved", /must retain a sanitized alias|none/],
  ["external_action", "performed", /must retain a sanitized alias|none/],
  ["row_closure", "EVID-PROVIDER-COST", /must retain a sanitized alias|none/]
]) {
  const mutated = { ...a2FundingDispositionValidationOwnerApproval, [field]: value };
  mutated.owner_approval_record_fingerprint = deriveA2FundingDispositionOwnerApprovalRecordFingerprint(mutated);
  assert.throws(() => validateA2FundingDispositionOwnerApprovalRecord(mutated, a2FundingDispositionValidationA0), expected, `A2 owner approval record must reject ${field} even after rehash`);
}
for (const closingChildId of ["A2-provider-cost-evidence-read", "A4-product-price-judgment", "A5-legal-judgment", "A6-copy-judgment", "B1-deployed-target-proof", "B2-live-paid-flow-evidence"]) {
  const fixture = parsedFingerprintGraphFixture(closingChildId, "running");
  const owner = fixture.a2FundingDispositionOwnerApprovalRecords[0].fields;
  const record = fixture.a2FundingRequirementDispositionResultRecords[0].fields;
  owner.owner_decision = "approved-existing-funded-headroom-available-no-external-prerequisite-required";
  owner.funding_requirement_state = "already-available";
  owner.owner_approval_record_fingerprint = deriveA2FundingDispositionOwnerApprovalRecordFingerprint(owner);
  record.owner_approval_record_fingerprint = owner.owner_approval_record_fingerprint;
  record.owner_decision = owner.owner_decision;
  record.funding_requirement_state = owner.funding_requirement_state;
  record.disposition_record_fingerprint = deriveA2FundingDispositionRecordFingerprint(record);
  assert.throws(
    () => validateStagedLedgerCrossValidation(fixture.rowRecords, fixture.childRecords, fixture.ledger, fixture.signedEvidenceRecords, fixture.b2ScenarioResultRecords, fixture.a3ObservedResultRecords, fixture.a2ObservedResultRecords, fixture.a1ObservedResultRecords, fixture.a4JudgmentResultRecords, fixture.a5LegalJudgmentResultRecords, fixture.a6CopyJudgmentResultRecords, fixture.b1DeployedTargetProofRecords, fixture.b1ExternalPrerequisiteResultRecords, fixture.b2AggregateLiveOperationResultRecords, fixture.a2FundingRequirementDispositionResultRecords),
    /recorded state|disposition record fingerprint|fingerprint/,
    `${closingChildId} must reject a rehashed A2 disposition record while its downstream binding remains stale`
  );
}
assert.throws(
  () => validateStagedLedgerCrossValidation(a2FundingDispositionValidationFixture.rowRecords, a2FundingDispositionValidationFixture.childRecords, a2FundingDispositionValidationFixture.ledger, a2FundingDispositionValidationFixture.signedEvidenceRecords, a2FundingDispositionValidationFixture.b2ScenarioResultRecords, a2FundingDispositionValidationFixture.a3ObservedResultRecords, a2FundingDispositionValidationFixture.a2ObservedResultRecords, a2FundingDispositionValidationFixture.a1ObservedResultRecords, a2FundingDispositionValidationFixture.a4JudgmentResultRecords, a2FundingDispositionValidationFixture.a5LegalJudgmentResultRecords, a2FundingDispositionValidationFixture.a6CopyJudgmentResultRecords, a2FundingDispositionValidationFixture.b1DeployedTargetProofRecords, a2FundingDispositionValidationFixture.b1ExternalPrerequisiteResultRecords, a2FundingDispositionValidationFixture.b2AggregateLiveOperationResultRecords, []),
  /exactly one separate parsed disposition record/,
  "a factual A2 funding state must reject a missing independent disposition record"
);
assert.throws(
  () => validateStagedLedgerCrossValidation(a2FundingDispositionValidationFixture.rowRecords, a2FundingDispositionValidationFixture.childRecords, a2FundingDispositionValidationFixture.ledger, a2FundingDispositionValidationFixture.signedEvidenceRecords, a2FundingDispositionValidationFixture.b2ScenarioResultRecords, a2FundingDispositionValidationFixture.a3ObservedResultRecords, a2FundingDispositionValidationFixture.a2ObservedResultRecords, a2FundingDispositionValidationFixture.a1ObservedResultRecords, a2FundingDispositionValidationFixture.a4JudgmentResultRecords, a2FundingDispositionValidationFixture.a5LegalJudgmentResultRecords, a2FundingDispositionValidationFixture.a6CopyJudgmentResultRecords, a2FundingDispositionValidationFixture.b1DeployedTargetProofRecords, a2FundingDispositionValidationFixture.b1ExternalPrerequisiteResultRecords, a2FundingDispositionValidationFixture.b2AggregateLiveOperationResultRecords, [a2FundingDispositionValidationFixture.a2FundingRequirementDispositionResultRecords[0], a2FundingDispositionValidationFixture.a2FundingRequirementDispositionResultRecords[0]]),
  /exactly one separate parsed disposition record/,
  "A2 funding disposition collection must reject duplicate records"
);
const unapprovedExternalFundingState = { status: "unapproved", freshness: "missing", target: "missing", approval: "unapproved", fingerprint_bound: "no", stale: false, invalidated: false };
const a2FutureStart = { child_id: "A2-provider-cost-evidence-read", child_status: "approved-not-started", row_closure_effect: "EVID-PROVIDER-COST-only-after-satisfied" };
assert.throws(() => transitionChildLifecycle({ child: a2FutureStart, rowStatus: "incomplete", to: "running", prerequisiteStates: new Map([["A0-provisional-cost-model-input", satisfiedPrerequisite()], ["A2-provider-funding-external-prerequisite-reference", unapprovedExternalFundingState]]), fundingPrerequisiteRecord: { fields: { ...futureNeededAbsentDispositionWithUnapprovedExternalReference, funding_requirement_state: "not-needed" } } }), /separate parsed A2 funding-disposition owner approval/, "state-only A2 funding disposition must not start without a separately parsed owner approval record");
const alreadyAvailableTransitionBundle = a2TransitionDispositionBundle("already-available");
assert.doesNotThrow(() => transitionChildLifecycle({ child: a2FutureStart, rowStatus: "incomplete", to: "running", prerequisiteStates: new Map([["A0-provisional-cost-model-input", satisfiedPrerequisite()], ["A2-provider-funding-external-prerequisite-reference", unapprovedExternalFundingState]]), fundingPrerequisiteRecord: alreadyAvailableTransitionBundle.fundingPrerequisiteRecord, fundingDispositionOwnerApprovalRecord: alreadyAvailableTransitionBundle.ownerApprovalRecord, fundingDispositionResultRecord: alreadyAvailableTransitionBundle.dispositionResultRecord, fundingDispositionA0Child: alreadyAvailableTransitionBundle.a0Child }), "already-available A2 disposition may proceed when all non-funding prerequisites are satisfied");
const neededAbsentTransitionBundle = a2TransitionDispositionBundle("needed-absent");
assert.throws(() => transitionChildLifecycle({ child: a2FutureStart, rowStatus: "incomplete", to: "running", prerequisiteStates: new Map([["A0-provisional-cost-model-input", satisfiedPrerequisite()], ["A2-provider-funding-external-prerequisite-reference", unapprovedExternalFundingState]]), fundingPrerequisiteRecord: neededAbsentTransitionBundle.fundingPrerequisiteRecord, fundingDispositionOwnerApprovalRecord: neededAbsentTransitionBundle.ownerApprovalRecord, fundingDispositionResultRecord: neededAbsentTransitionBundle.dispositionResultRecord, fundingDispositionA0Child: neededAbsentTransitionBundle.a0Child }), /must be satisfied/, "needed-absent A2 disposition cannot start before a separately approved external-lane result exists");
const forgedA0TransitionBundle = a2TransitionDispositionBundle("not-needed");
const forgedA0Child = { ...forgedA0TransitionBundle.a0Child, cost_model_input_fingerprint: fixtureFingerprint("forged-a0-input") };
const forgedA0OwnerApproval = { ...forgedA0TransitionBundle.ownerApprovalRecord, bound_a0_cost_model_input_fingerprint: forgedA0Child.cost_model_input_fingerprint };
forgedA0OwnerApproval.owner_approval_record_fingerprint = deriveA2FundingDispositionOwnerApprovalRecordFingerprint(forgedA0OwnerApproval);
const forgedA0DispositionResult = { ...forgedA0TransitionBundle.dispositionResultRecord, owner_approval_record_fingerprint: forgedA0OwnerApproval.owner_approval_record_fingerprint };
forgedA0DispositionResult.disposition_record_fingerprint = deriveA2FundingDispositionRecordFingerprint(forgedA0DispositionResult);
const forgedA0FundingReference = { fields: { ...forgedA0TransitionBundle.fundingPrerequisiteRecord.fields, funding_owner_approval_record_fingerprint: forgedA0OwnerApproval.owner_approval_record_fingerprint, funding_disposition_record_fingerprint: forgedA0DispositionResult.disposition_record_fingerprint } };
assert.throws(() => transitionChildLifecycle({ child: a2FutureStart, rowStatus: "incomplete", to: "running", prerequisiteStates: new Map([["A0-provisional-cost-model-input", satisfiedPrerequisite()], ["A2-provider-funding-external-prerequisite-reference", unapprovedExternalFundingState]]), fundingPrerequisiteRecord: forgedA0FundingReference, fundingDispositionOwnerApprovalRecord: forgedA0OwnerApproval, fundingDispositionResultRecord: forgedA0DispositionResult, fundingDispositionA0Child: forgedA0Child }), /A0.*fingerprint|deterministic/i, "standalone A2 lifecycle must reject a forged A0 child even when every downstream fingerprint is recomputed");
const b1MissingSeparateProofRecordRedFixture = parsedFingerprintGraphFixture("B1-deployed-target-proof", "satisfied");
assert.throws(
  () => validateStagedLedgerCrossValidation(
    b1MissingSeparateProofRecordRedFixture.rowRecords,
    b1MissingSeparateProofRecordRedFixture.childRecords,
    b1MissingSeparateProofRecordRedFixture.ledger,
    b1MissingSeparateProofRecordRedFixture.signedEvidenceRecords,
    b1MissingSeparateProofRecordRedFixture.b2ScenarioResultRecords,
    b1MissingSeparateProofRecordRedFixture.a3ObservedResultRecords,
    b1MissingSeparateProofRecordRedFixture.a2ObservedResultRecords,
    b1MissingSeparateProofRecordRedFixture.a1ObservedResultRecords,
    b1MissingSeparateProofRecordRedFixture.a4JudgmentResultRecords,
    b1MissingSeparateProofRecordRedFixture.a5LegalJudgmentResultRecords,
    b1MissingSeparateProofRecordRedFixture.a6CopyJudgmentResultRecords,
    []
  ),
  /separate parsed B1 deployed-target proof record/,
  "terminal B1 must reject a missing separately parsed deployed-target proof record"
);
function validateB1ProofFixture(fixture, proofRecords = fixture.b1DeployedTargetProofRecords, externalRecords = fixture.b1ExternalPrerequisiteResultRecords, aggregateRecords = fixture.b2AggregateLiveOperationResultRecords) {
  return validateStagedLedgerCrossValidation(fixture.rowRecords, fixture.childRecords, fixture.ledger, fixture.signedEvidenceRecords, fixture.b2ScenarioResultRecords, fixture.a3ObservedResultRecords, fixture.a2ObservedResultRecords, fixture.a1ObservedResultRecords, fixture.a4JudgmentResultRecords, fixture.a5LegalJudgmentResultRecords, fixture.a6CopyJudgmentResultRecords, proofRecords, externalRecords, aggregateRecords);
}
// RED: signed entitlement and all 19 scenarios do not self-authenticate the aggregate B2 live-operation result.
const b2MissingSeparateAggregateRecordRedFixture = parsedFingerprintGraphFixture("B2-live-paid-flow-evidence", "satisfied");
assert.throws(
  () => validateB1ProofFixture(b2MissingSeparateAggregateRecordRedFixture, undefined, undefined, []),
  /separate parsed B2 aggregate live-operation result record/,
  "terminal B2 must reject missing independently parsed aggregate live-operation result"
);
const b2CompleteWithoutSeparateAggregateRecordFixture = parsedFingerprintGraphFixture("B2-live-paid-flow-evidence", "complete-not-closure-eligible");
assert.throws(
  () => validateB1ProofFixture(b2CompleteWithoutSeparateAggregateRecordFixture, undefined, undefined, []),
  /separate parsed B2 aggregate live-operation result record/,
  "complete-not-closure-eligible B2 must reject missing independently parsed aggregate live-operation result"
);
const b2NonclosingEligibilityRedFixture = parsedFingerprintGraphFixture("B2-live-paid-flow-evidence", "complete-not-closure-eligible");
assert.doesNotThrow(() => validateB1ProofFixture(b2NonclosingEligibilityRedFixture), "complete-not-closure-eligible B2 must accept its exact approval-bound nonclosing aggregate record");
const b2NonclosingEligibleRecord = { ...b2NonclosingEligibilityRedFixture.b2AggregateLiveOperationResultRecords[0].fields, closure_eligibility: "eligible", nonclosure_reason: "none" };
b2NonclosingEligibleRecord.aggregate_record_fingerprint = deriveB2AggregateLiveOperationResultRecordFingerprint(b2NonclosingEligibleRecord);
assert.throws(
  () => validateB1ProofFixture(b2NonclosingEligibilityRedFixture, undefined, undefined, [{ fields: b2NonclosingEligibleRecord }]),
  /eligible|ineligible|nonclosure_reason/,
  "complete-not-closure-eligible B2 must retain an approval-bound ineligible closure disposition"
);
const b2RunningAggregateCollectionFixture = parsedFingerprintGraphFixture("B2-live-paid-flow-evidence", "running");
assert.throws(
  () => validateB1ProofFixture(b2RunningAggregateCollectionFixture, undefined, undefined, b2MissingSeparateAggregateRecordRedFixture.b2AggregateLiveOperationResultRecords),
  /collection must be empty while B2 is nonterminal/,
  "running B2 must reject aggregate result collection"
);
const b2RunningScenarioCollectionRedFixture = parsedFingerprintGraphFixture("B2-live-paid-flow-evidence", "running");
b2RunningScenarioCollectionRedFixture.b2ScenarioResultRecords = b2MissingSeparateAggregateRecordRedFixture.b2ScenarioResultRecords;
assert.throws(
  () => validateB1ProofFixture(b2RunningScenarioCollectionRedFixture),
  /scenario result collection must be empty while B2 is nonterminal/,
  "running B2 must reject a completed 19-scenario collection"
);
const b2NotStartedScenarioCollectionRedFixture = parsedFingerprintGraphFixture("B2-live-paid-flow-evidence", "approved-not-started");
b2NotStartedScenarioCollectionRedFixture.b2ScenarioResultRecords = b2MissingSeparateAggregateRecordRedFixture.b2ScenarioResultRecords;
assert.throws(
  () => validateB1ProofFixture(b2NotStartedScenarioCollectionRedFixture),
  /scenario result collection must be empty while B2 is nonterminal/,
  "approved-not-started B2 must reject a completed 19-scenario collection"
);
const b2AggregateRecordDriftFixture = parsedFingerprintGraphFixture("B2-live-paid-flow-evidence", "satisfied");
const b2AggregateRecordDrifted = { ...b2AggregateRecordDriftFixture.b2AggregateLiveOperationResultRecords[0].fields, aggregate_record_id: "NC-R1-B2-AGGREGATE-FIXTURE-DRIFT" };
b2AggregateRecordDrifted.aggregate_record_fingerprint = deriveB2AggregateLiveOperationResultRecordFingerprint(b2AggregateRecordDrifted);
assert.throws(
  () => validateB1ProofFixture(b2AggregateRecordDriftFixture, undefined, undefined, [{ fields: b2AggregateRecordDrifted }]),
  /separate parsed aggregate live-operation result record|b2_aggregate_record_fingerprint/,
  "rehashed aggregate-record drift must invalidate the stale B2 child binding"
);
const b1CompleteWithoutSeparateProofFixture = parsedFingerprintGraphFixture("B1-deployed-target-proof", "complete-not-closure-eligible");
assert.throws(() => validateB1ProofFixture(b1CompleteWithoutSeparateProofFixture, []), /exactly one separate parsed B1 deployed-target proof record/, "complete-not-closure-eligible B1 must reject a missing separate proof record");
const b1RunningWithProofFixture = parsedFingerprintGraphFixture("B1-deployed-target-proof", "running");
const b1TerminalProofFixture = parsedFingerprintGraphFixture("B1-deployed-target-proof", "satisfied");
const b1ExternalApprovalIds = b1TerminalProofFixture.childRecords.map((child) => child.fields.approval_id);
for (const reusedExternalLaneApprovalId of [
  b1TerminalProofFixture.b1ExternalPrerequisiteResultRecords[0].fields.reference_child_approval_id,
  b1TerminalProofFixture.childRecords.find((child) => child.fields.child_id === "B1-deployed-target-proof").fields.approval_id
]) {
  const rehashedExternalRecord = { ...b1TerminalProofFixture.b1ExternalPrerequisiteResultRecords[0].fields, external_lane_approval_id: reusedExternalLaneApprovalId };
  rehashedExternalRecord.external_result_record_fingerprint = deriveB1ExternalPrerequisiteResultRecordFingerprint(rehashedExternalRecord);
  assert.throws(() => validateB1ExternalPrerequisiteResultRecord(rehashedExternalRecord, b1TerminalProofFixture.childRecords.find((child) => child.fields.child_id === "B1-external-prerequisite-sanitized-result-reference").fields, b1ExternalApprovalIds), /separate|unique/, "external lane approval must remain separate from every staged child approval");
}
assert.throws(() => validateB1ProofFixture(b1TerminalProofFixture, undefined, []), /external prerequisite requires exactly one separate parsed external result record/, "satisfied independent external prerequisite must reject a missing result record");
for (const invalidExternalRecords of [
  [{ fields: { ...b1TerminalProofFixture.b1ExternalPrerequisiteResultRecords[0].fields, unknown_sanitized_placeholder: "none" } }],
  [...b1TerminalProofFixture.b1ExternalPrerequisiteResultRecords, { fields: { ...b1TerminalProofFixture.b1ExternalPrerequisiteResultRecords[0].fields } }]
]) assert.throws(() => validateB1ProofFixture(b1TerminalProofFixture, undefined, invalidExternalRecords), /closed schema|exactly one|unique/, "B1 external prerequisite collection must reject unknown or duplicate records");
for (const forbiddenRequestedOperation of ["manual-production-deploy", "migration-config-write"]) {
  const child = { ...b1TerminalProofFixture.childRecords.find((record) => record.fields.child_id === "B1-deployed-target-proof").fields, requested_operation: forbiddenRequestedOperation };
  child.approval_fingerprint = deriveApprovalFingerprint(child);
  const proof = { ...b1TerminalProofFixture.b1DeployedTargetProofRecords[0].fields, requested_operation: forbiddenRequestedOperation, approval_fingerprint: child.approval_fingerprint };
  proof.proof_record_fingerprint = deriveB1ProofRecordFingerprint(proof);
  child.proof_record_fingerprint = proof.proof_record_fingerprint;
  assert.throws(() => validateB1ParsedEvidenceRecord(proof, child), /requested operation|read-only/, `B1 must reject rehashed forbidden requested_operation ${forbiddenRequestedOperation}`);
}
assert.throws(() => validateB1ProofFixture(b1RunningWithProofFixture, b1TerminalProofFixture.b1DeployedTargetProofRecords), /B1 proof collection must be empty while B1 is nonterminal/, "running B1 must reject an independently parsed proof collection");
for (const invalidProofRecords of [
  [{ fields: { ...b1TerminalProofFixture.b1DeployedTargetProofRecords[0].fields, template_status: "not-observed-non-evidence" } }],
  [...b1TerminalProofFixture.b1DeployedTargetProofRecords, { fields: { ...b1TerminalProofFixture.b1DeployedTargetProofRecords[0].fields } }],
  [{ fields: { ...b1TerminalProofFixture.b1DeployedTargetProofRecords[0].fields, child_id: "B2-live-paid-flow-evidence" } }]
]) assert.throws(() => validateB1ProofFixture(b1TerminalProofFixture, invalidProofRecords), /closed schema|unique|exact B1 child|rejects template|B1-deployed-target-proof/, "B1 collection must reject template, duplicate, or foreign proof records");
for (const [field, value] of [["expected_target_alias", "approved-deployed-target-drift"], ["expected_commit_alias", "approved-deployed-commit-drift"], ["exact_target_or_scope", "sanitized-scope-drift"], ["time_window", "2026-08-09T00:00:00Z/2026-08-09T00:30:00Z"], ["operator", "other-operator"], ["evidence_retention_location", "retention-drift"], ["required_approver", "other-owner"], ["target_match", "mismatched"], ["commit_match", "mismatched"], ["proof_completeness", "incomplete"], ["no_merge_ci_build_local_inference", "no"], ["migration_config_binding_git_merge_deploy_live_public_paid_go_activation_external_authorization_or_execution", "deploy"]]) {
  const proof = { ...b1TerminalProofFixture.b1DeployedTargetProofRecords[0].fields, [field]: value };
  proof.proof_record_fingerprint = deriveB1ProofRecordFingerprint(proof);
  assert.throws(() => validateB1ParsedEvidenceRecord(proof, b1TerminalProofFixture.childRecords.find((child) => child.fields.child_id === "B1-deployed-target-proof").fields), /exact|complete|fresh|kurodev|none|yes|approval|scope|window|operator|retention|owner|match|inference|authorization/, `B1 proof must reject ${field} drift`);
}
const b1ChildMismatchProof = { ...b1TerminalProofFixture.b1DeployedTargetProofRecords[0].fields, expected_target_alias: "approved-deployed-target-mismatch" };
b1ChildMismatchProof.proof_record_fingerprint = deriveB1ProofRecordFingerprint(b1ChildMismatchProof);
assert.throws(() => validateB1ParsedEvidenceRecord(b1ChildMismatchProof, b1TerminalProofFixture.childRecords.find((child) => child.fields.child_id === "B1-deployed-target-proof").fields), /expected target alias|observed exact approved target alias|exact match requires/, "B1 proof must reject child-to-record target mismatch");
assert.throws(() => validateB1ParsedEvidenceRecord({ ...b1TerminalProofFixture.b1DeployedTargetProofRecords[0].fields, proof_record_fingerprint: undefined }, b1TerminalProofFixture.childRecords.find((child) => child.fields.child_id === "B1-deployed-target-proof").fields), /proof[_ -]?record[_ -]?fingerprint|fingerprint must be deterministic/, "B1 proof must require its deterministic record fingerprint");
const b1RecordDriftPropagatesToB2Fixture = parsedFingerprintGraphFixture("B2-live-paid-flow-evidence", "satisfied");
const b1RecordDriftedProof = { ...b1RecordDriftPropagatesToB2Fixture.b1DeployedTargetProofRecords[0].fields, source_timestamp: "2026-08-09T00:20:00Z" };
b1RecordDriftedProof.proof_record_fingerprint = deriveB1ProofRecordFingerprint(b1RecordDriftedProof);
const b1RecordDriftedChild = b1RecordDriftPropagatesToB2Fixture.childRecords.find((child) => child.fields.child_id === "B1-deployed-target-proof").fields;
b1RecordDriftedChild.proof_record_fingerprint = b1RecordDriftedProof.proof_record_fingerprint;
b1RecordDriftedChild.deployed_fingerprint = deriveB1DeployedFingerprint(b1RecordDriftedChild, b1RecordDriftedChild.approval_fingerprint, {
  a1: b1RecordDriftedChild.a1_result_fingerprint, a4: b1RecordDriftedChild.a4_artifact_fingerprint, a5: b1RecordDriftedChild.a5_artifact_fingerprint,
  a6: b1RecordDriftedChild.a6_artifact_fingerprint, external: b1RecordDriftedChild.external_prerequisite_fingerprint, proofRecord: b1RecordDriftedProof.proof_record_fingerprint
});
assert.throws(() => validateB1ProofFixture(b1RecordDriftPropagatesToB2Fixture, [{ fields: b1RecordDriftedProof }]), /b1_deployed_fingerprint|B2 parsed live-flow result|B2 scenario records require/, "recomputed B1 proof-record drift must invalidate stale B2 bindings");
const b1ExternalOutcomeDriftFixture = parsedFingerprintGraphFixture("B1-deployed-target-proof", "satisfied");
const b1ExternalOutcomeDriftChild = b1ExternalOutcomeDriftFixture.childRecords.find((child) => child.fields.child_id === "B1-deployed-target-proof").fields;
const b1ExternalOutcomeDriftReference = b1ExternalOutcomeDriftFixture.childRecords.find((child) => child.fields.child_id === "B1-external-prerequisite-sanitized-result-reference").fields;
const b1ExternalOutcomeDriftRecord = { ...b1ExternalOutcomeDriftFixture.b1ExternalPrerequisiteResultRecords[0].fields, outcome: "sanitized-external-result-rejected" };
b1ExternalOutcomeDriftRecord.external_result_record_fingerprint = deriveB1ExternalPrerequisiteResultRecordFingerprint(b1ExternalOutcomeDriftRecord);
b1ExternalOutcomeDriftReference.external_result_record_fingerprint = b1ExternalOutcomeDriftRecord.external_result_record_fingerprint;
b1ExternalOutcomeDriftReference.external_result_fingerprint = deriveExternalPrerequisiteFingerprint(b1ExternalOutcomeDriftReference, b1ExternalOutcomeDriftReference.approval_fingerprint);
b1ExternalOutcomeDriftChild.external_prerequisite_fingerprint = b1ExternalOutcomeDriftReference.external_result_fingerprint;
b1ExternalOutcomeDriftChild.deployed_fingerprint = deriveB1DeployedFingerprint(b1ExternalOutcomeDriftChild, b1ExternalOutcomeDriftChild.approval_fingerprint, {
  a1: b1ExternalOutcomeDriftChild.a1_result_fingerprint, a4: b1ExternalOutcomeDriftChild.a4_artifact_fingerprint, a5: b1ExternalOutcomeDriftChild.a5_artifact_fingerprint,
  a6: b1ExternalOutcomeDriftChild.a6_artifact_fingerprint, external: b1ExternalOutcomeDriftReference.external_result_fingerprint, proofRecord: b1ExternalOutcomeDriftChild.proof_record_fingerprint
});
assert.throws(() => validateB1ProofFixture(b1ExternalOutcomeDriftFixture, undefined, [{ fields: b1ExternalOutcomeDriftRecord }]), /outcome|sanitized-external-result-approved/, "rehashed non-approved independent external prerequisite outcome must reject terminal B1 consumption");
const a4JudgmentValidationFixture = parsedFingerprintGraphFixture("A4-product-price-judgment", "satisfied");
const a4JudgmentValidationFields = a4JudgmentValidationFixture.a4JudgmentResultRecords[0].fields;
const a4JudgmentValidationChild = a4JudgmentValidationFixture.childRecords.find((child) => child.fields.child_id === "A4-product-price-judgment").fields;
const a4JudgmentValidationA2Child = a4JudgmentValidationFixture.childRecords.find((child) => child.fields.child_id === "A2-provider-cost-evidence-read").fields;
const a4JudgmentValidationA3Child = a4JudgmentValidationFixture.childRecords.find((child) => child.fields.child_id === "A3-stripe-source-applicability-read-or-judgment").fields;
const a4JudgmentValidationA2Record = a4JudgmentValidationFixture.a2ObservedResultRecords[0];
const a4JudgmentValidationA3Record = a4JudgmentValidationFixture.a3ObservedResultRecords[0];
const a4JudgmentValidationA3OwnerApproval = a4JudgmentValidationFixture.a3ManualReadOwnerApprovalRecords[0];
const a4JudgmentValidationA0Child = a4JudgmentValidationFixture.childRecords.find((child) => child.fields.child_id === "A0-provisional-cost-model-input").fields;
const a4JudgmentValidationRaw = `\`\`\`text\n${a4ProductPriceJudgmentResultRecordFields.map((field) => `${field}=${a4JudgmentValidationFields[field]}`).join("\n")}\n\`\`\``;
const parsedA4JudgmentValidationRecord = parseA4ProductPriceJudgmentResultRecord(a4JudgmentValidationRaw);
assert.deepEqual(parsedA4JudgmentValidationRecord.fields, a4JudgmentValidationFields, "A4 owner-judgment parser must retain the exact closed sanitized record");
assert.doesNotThrow(() => validateA4ProductPriceJudgmentResultRecord(parsedA4JudgmentValidationRecord, a4JudgmentValidationChild, a4JudgmentValidationA2Record, a4JudgmentValidationA3Record, a4JudgmentValidationA2Child, a4JudgmentValidationA3Child, a4JudgmentValidationA3OwnerApproval, a4JudgmentValidationA0Child, { requireComplete: true }));
assert.throws(
  () => validateStagedLedgerCrossValidation(a4JudgmentValidationFixture.rowRecords, a4JudgmentValidationFixture.childRecords, a4JudgmentValidationFixture.ledger, a4JudgmentValidationFixture.signedEvidenceRecords, a4JudgmentValidationFixture.b2ScenarioResultRecords, a4JudgmentValidationFixture.a3ObservedResultRecords, a4JudgmentValidationFixture.a2ObservedResultRecords, a4JudgmentValidationFixture.a1ObservedResultRecords, [...a4JudgmentValidationFixture.a4JudgmentResultRecords, { fields: { ...a4JudgmentValidationFields, judgment_record_id: "NC-R1-A4-JUDGMENT-FIXTURE-02" } }]),
  /unique independent child IDs/,
  "A4 owner-judgment record collection must reject more than one record for its child"
);
const a4TemplateFields = parseExactTextBlock(sectionBody(checklist, "## Exact Non-Evidence A4 Product/Price Judgment Result Template"));
const a4TemplateFieldsReadiness = parseExactTextBlock(sectionBody(readiness, "## Exact Non-Evidence A4 Product/Price Judgment Result Template"));
assert.deepEqual(a4TemplateFieldsReadiness, a4TemplateFields, "readiness and checklist must retain the identical exact non-evidence A4 Product/Price judgment template");
assert.deepEqual(Object.keys(a4TemplateFields).sort(), [...a4ProductPriceJudgmentResultRecordFields].sort(), "A4 non-evidence template must retain the exact closed result schema");
const a4TemplateRaw = `\`\`\`text\n${a4ProductPriceJudgmentResultRecordFields.map((field) => `${field}=${a4TemplateFields[field]}`).join("\n")}\n\`\`\``;
assert.throws(() => validateA4ProductPriceJudgmentResultRecord(parseA4ProductPriceJudgmentResultRecord(a4TemplateRaw), a4JudgmentValidationChild, a4JudgmentValidationA2Record, a4JudgmentValidationA3Record, a4JudgmentValidationA2Child, a4JudgmentValidationA3Child, a4JudgmentValidationA3OwnerApproval, a4JudgmentValidationA0Child, { requireComplete: true }), /sanitized alias|approved completed/, "A4 non-evidence template must not substitute for an actual owner-judgment record");
const a5JudgmentValidationFixture = parsedFingerprintGraphFixture("A5-legal-judgment", "satisfied");
const a5JudgmentValidationFields = a5JudgmentValidationFixture.a5LegalJudgmentResultRecords[0].fields;
const a5JudgmentValidationChild = a5JudgmentValidationFixture.childRecords.find((child) => child.fields.child_id === "A5-legal-judgment").fields;
const a5JudgmentValidationA4Child = a5JudgmentValidationFixture.childRecords.find((child) => child.fields.child_id === "A4-product-price-judgment").fields;
const a5JudgmentValidationA4Record = a5JudgmentValidationFixture.a4JudgmentResultRecords[0];
const a5JudgmentValidationRaw = `\`\`\`text\n${a5LegalJudgmentResultRecordFields.map((field) => `${field}=${a5JudgmentValidationFields[field]}`).join("\n")}\n\`\`\``;
const parsedA5JudgmentValidationRecord = parseA5LegalJudgmentResultRecord(a5JudgmentValidationRaw);
assert.deepEqual(parsedA5JudgmentValidationRecord.fields, a5JudgmentValidationFields, "A5 legal/tax owner-judgment parser must retain the exact closed sanitized record");
assert.doesNotThrow(() => validateA5LegalJudgmentResultRecord(parsedA5JudgmentValidationRecord, a5JudgmentValidationChild, a5JudgmentValidationA4Record, a5JudgmentValidationA4Child, { requireComplete: true }));
const a5TemplateFields = parseExactTextBlock(sectionBody(checklist, "## Exact Non-Evidence A5 Legal/Tax Judgment Result Template"));
const a5TemplateFieldsReadiness = parseExactTextBlock(sectionBody(readiness, "## Exact Non-Evidence A5 Legal/Tax Judgment Result Template"));
const a5RegistryPlaceholderFields = parseStagedChildren(checklist).find((child) => child.headingId === "A5-legal-judgment").fields;
assert.equal(a5RegistryPlaceholderFields.judgment_record_fingerprint, "<required-sha256-judgment-record-fingerprint>", "A5 unapproved registry child must retain its non-evidence judgment-record fingerprint placeholder");
assert.deepEqual(a5TemplateFieldsReadiness, a5TemplateFields, "readiness and checklist must retain the identical exact non-evidence A5 Legal/Tax judgment template");
assert.deepEqual(Object.keys(a5TemplateFields).sort(), [...a5LegalJudgmentResultRecordFields].sort(), "A5 non-evidence template must retain the exact closed result schema");
const a5TemplateRaw = `\`\`\`text\n${a5LegalJudgmentResultRecordFields.map((field) => `${field}=${a5TemplateFields[field]}`).join("\n")}\n\`\`\``;
assert.throws(() => validateA5LegalJudgmentResultRecord(parseA5LegalJudgmentResultRecord(a5TemplateRaw), a5JudgmentValidationChild, a5JudgmentValidationA4Record, a5JudgmentValidationA4Child, { requireComplete: true }), /sanitized alias|approved completed/, "A5 non-evidence template must not substitute for an actual legal/tax owner-judgment record");
for (const malformed of [
  `${a5JudgmentValidationRaw}\n${["https:", "", "private.invalid", "record"].join("/")}`,
  `${a5JudgmentValidationRaw}\n`,
  a5JudgmentValidationRaw.replace("record_status=", " record_status="),
  a5JudgmentValidationRaw.replace("record_status=approved-completed-release-owner-judgment", "record_status=approved completed-release-owner-judgment"),
  a5JudgmentValidationRaw.replace("record_status=approved-completed-release-owner-judgment", "record_status=approved\tcompleted-release-owner-judgment"),
  a5JudgmentValidationRaw.replace("\nrecord_type=", "\nrecord_status=duplicate\nrecord_type="),
  a5JudgmentValidationRaw.replace("\nrecord_type=", "\nunknown_key=value\nrecord_type="),
  a5JudgmentValidationRaw.replace("record_status=", "record_status= approved-")
]) assert.throws(() => parseA5LegalJudgmentResultRecord(malformed), /fence|strict key=value|unique|exact closed schema/);
for (const [field, value, expectedError] of [
  ["approval_id", "NC-R1-A5-MISMATCH", /approval_id must exactly match/],
  ["approval_fingerprint", fixtureFingerprint("a5-approval-mismatch"), /approval_fingerprint must exactly match/],
  ["exact_target_or_scope", "sanitized-a5-scope-mismatch", /exact_target_or_scope must exactly match/],
  ["required_approver", "other-owner", /required_approver must exactly match|Kurodev/],
  ["decision_owner", "other-owner", /decision owner/],
  ["effective_date", "2026-08-08", /effective_date must exactly match/],
  ["evidence_retention_location", "sanitized-retention-mismatch", /evidence_retention_location must exactly match/],
  ["stop_owner", "other-owner", /stop_owner must exactly match|stop ownership/],
  ["rollback_owner", "other-owner", /rollback_owner must exactly match|rollback ownership/],
  ["bound_a4_artifact_fingerprint", fixtureFingerprint("a4-mismatch"), /actual A4 artifact/],
  ["legal_scope_disposition", "rejected", /approved exact legal scope/],
  ["legal_tax_posture_disposition", "partial", /approved exact legal\/tax posture/],
  ["exclusions_bound", "no", /exclusions_bound/],
  ["material_change_revalidation", "not-required", /material-change revalidation/],
  ["copy_risk_deploy_live_go_activation_publication_authorization", "approved", /must not authorize/],
  ["judgment_output", "rejected", /approved judgment output/],
  ["row_closure", "EVID-COPY-only", /EVID-LEGAL only/],
  ["a5_result_fingerprint", fixtureFingerprint("a5-result-mismatch"), /exact final A5/],
  ["judgment_record_fingerprint", fixtureFingerprint("a5-record-mismatch"), /deterministic/]
]) assert.throws(() => validateA5LegalJudgmentResultRecord({ fields: { ...a5JudgmentValidationFields, [field]: value } }, a5JudgmentValidationChild, a5JudgmentValidationA4Record, a5JudgmentValidationA4Child, { requireComplete: true }), expectedError, `A5 legal/tax owner-judgment record must reject ${field} drift`);
assert.throws(
  () => validateStagedLedgerCrossValidation(a5JudgmentValidationFixture.rowRecords, a5JudgmentValidationFixture.childRecords, a5JudgmentValidationFixture.ledger, a5JudgmentValidationFixture.signedEvidenceRecords, a5JudgmentValidationFixture.b2ScenarioResultRecords, a5JudgmentValidationFixture.a3ObservedResultRecords, a5JudgmentValidationFixture.a2ObservedResultRecords, a5JudgmentValidationFixture.a1ObservedResultRecords, a5JudgmentValidationFixture.a4JudgmentResultRecords, [...a5JudgmentValidationFixture.a5LegalJudgmentResultRecords, { fields: { ...a5JudgmentValidationFields, judgment_record_id: "NC-R1-A5-JUDGMENT-FIXTURE-02" } }]),
  /unique independent child IDs/,
  "A5 legal/tax owner-judgment record collection must reject more than one record for its child"
);
// RED: every A5 collection element must itself be an exact A5 legal/tax result, never an ignored foreign record.
assert.throws(
  () => validateStagedLedgerCrossValidation(a5JudgmentValidationFixture.rowRecords, a5JudgmentValidationFixture.childRecords, a5JudgmentValidationFixture.ledger, a5JudgmentValidationFixture.signedEvidenceRecords, a5JudgmentValidationFixture.b2ScenarioResultRecords, a5JudgmentValidationFixture.a3ObservedResultRecords, a5JudgmentValidationFixture.a2ObservedResultRecords, a5JudgmentValidationFixture.a1ObservedResultRecords, a5JudgmentValidationFixture.a4JudgmentResultRecords, [...a5JudgmentValidationFixture.a5LegalJudgmentResultRecords, { fields: { child_id: "A6-copy-judgment", judgment_record_id: "NC-R1-A5-JUDGMENT-FOREIGN-01" } }]),
  /exact closed A5 legal\/tax record|exact A5 child/,
  "A5 legal/tax owner-judgment collection must reject a foreign or incomplete record"
);
// RED: a recomputed A5 approval cannot replace the actual A4 artifact as its approved bound input.
const a5ApprovalInputDriftFixture = parsedFingerprintGraphFixture("A5-legal-judgment", "satisfied");
const a5ApprovalInputDriftChild = a5ApprovalInputDriftFixture.childRecords.find((child) => child.fields.child_id === "A5-legal-judgment").fields;
const a5ApprovalInputDriftRecord = a5ApprovalInputDriftFixture.a5LegalJudgmentResultRecords[0].fields;
a5ApprovalInputDriftChild.bound_input = fixtureFingerprint("a5-non-a4-approval-input");
a5ApprovalInputDriftChild.approval_fingerprint = deriveApprovalFingerprint(a5ApprovalInputDriftChild);
a5ApprovalInputDriftRecord.approval_fingerprint = a5ApprovalInputDriftChild.approval_fingerprint;
a5ApprovalInputDriftRecord.judgment_record_fingerprint = deriveA5LegalJudgmentRecordFingerprint(a5ApprovalInputDriftRecord);
a5ApprovalInputDriftChild.judgment_record_fingerprint = a5ApprovalInputDriftRecord.judgment_record_fingerprint;
a5ApprovalInputDriftChild.bound_artifact_fingerprint = deriveA5ArtifactFingerprint(a5ApprovalInputDriftChild, a5ApprovalInputDriftChild.approval_fingerprint, a5ApprovalInputDriftChild.a4_artifact_fingerprint, a5ApprovalInputDriftChild.judgment_record_fingerprint);
a5ApprovalInputDriftRecord.a5_result_fingerprint = a5ApprovalInputDriftChild.bound_artifact_fingerprint;
assert.throws(
  () => validateStagedLedgerCrossValidation(a5ApprovalInputDriftFixture.rowRecords, a5ApprovalInputDriftFixture.childRecords, a5ApprovalInputDriftFixture.ledger, a5ApprovalInputDriftFixture.signedEvidenceRecords, a5ApprovalInputDriftFixture.b2ScenarioResultRecords, a5ApprovalInputDriftFixture.a3ObservedResultRecords, a5ApprovalInputDriftFixture.a2ObservedResultRecords, a5ApprovalInputDriftFixture.a1ObservedResultRecords, a5ApprovalInputDriftFixture.a4JudgmentResultRecords, a5ApprovalInputDriftFixture.a5LegalJudgmentResultRecords),
  /bound_input.*actual A4 artifact/,
  "A5 must reject a recomputed approval whose bound input is not the actual A4 artifact"
);
const a6JudgmentValidationFixture = parsedFingerprintGraphFixture("A6-copy-judgment", "satisfied");
const a6JudgmentValidationFields = a6JudgmentValidationFixture.a6CopyJudgmentResultRecords[0].fields;
const a6JudgmentValidationChild = a6JudgmentValidationFixture.childRecords.find((child) => child.fields.child_id === "A6-copy-judgment").fields;
const a6JudgmentValidationA4Child = a6JudgmentValidationFixture.childRecords.find((child) => child.fields.child_id === "A4-product-price-judgment").fields;
const a6JudgmentValidationA5Child = a6JudgmentValidationFixture.childRecords.find((child) => child.fields.child_id === "A5-legal-judgment").fields;
const a6JudgmentValidationA4Record = a6JudgmentValidationFixture.a4JudgmentResultRecords[0];
const a6JudgmentValidationA5Record = a6JudgmentValidationFixture.a5LegalJudgmentResultRecords[0];
const a6JudgmentValidationRaw = `\`\`\`text\n${a6CopyJudgmentResultRecordFields.map((field) => `${field}=${a6JudgmentValidationFields[field]}`).join("\n")}\n\`\`\``;
const parsedA6JudgmentValidationRecord = parseA6CopyJudgmentResultRecord(a6JudgmentValidationRaw);
assert.deepEqual(parsedA6JudgmentValidationRecord.fields, a6JudgmentValidationFields, "A6 Copy owner-judgment parser must retain the exact closed sanitized record");
assert.doesNotThrow(() => validateA6CopyJudgmentResultRecord(parsedA6JudgmentValidationRecord, a6JudgmentValidationChild, a6JudgmentValidationA4Record, a6JudgmentValidationA5Record, a6JudgmentValidationA4Child, a6JudgmentValidationA5Child, { requireComplete: true }));
const a6TemplateFields = parseExactTextBlock(sectionBody(checklist, "## Exact Non-Evidence A6 Copy Judgment Result Template"));
const a6TemplateFieldsReadiness = parseExactTextBlock(sectionBody(readiness, "## Exact Non-Evidence A6 Copy Judgment Result Template"));
const a6RegistryPlaceholderFields = parseStagedChildren(checklist).find((child) => child.headingId === "A6-copy-judgment").fields;
assert.equal(a6RegistryPlaceholderFields.judgment_record_fingerprint, "<required-sha256-judgment-record-fingerprint>", "A6 unapproved registry child must retain its non-evidence judgment-record fingerprint placeholder");
assert.deepEqual(a6TemplateFieldsReadiness, a6TemplateFields, "readiness and checklist must retain the identical exact non-evidence A6 Copy judgment template");
assert.deepEqual(Object.keys(a6TemplateFields).sort(), [...a6CopyJudgmentResultRecordFields].sort(), "A6 non-evidence template must retain the exact closed result schema");
const a6TemplateRaw = `\`\`\`text\n${a6CopyJudgmentResultRecordFields.map((field) => `${field}=${a6TemplateFields[field]}`).join("\n")}\n\`\`\``;
assert.throws(() => validateA6CopyJudgmentResultRecord(parseA6CopyJudgmentResultRecord(a6TemplateRaw), a6JudgmentValidationChild, a6JudgmentValidationA4Record, a6JudgmentValidationA5Record, a6JudgmentValidationA4Child, a6JudgmentValidationA5Child, { requireComplete: true }), /sanitized alias|approved completed/, "A6 non-evidence template must not substitute for an actual Copy owner-judgment record");
for (const malformed of [
  `${a6JudgmentValidationRaw}\n${["https:", "", "private.invalid", "record"].join("/")}`,
  `${a6JudgmentValidationRaw}\n`,
  a6JudgmentValidationRaw.replace("record_status=", " record_status="),
  a6JudgmentValidationRaw.replace("record_status=approved-completed-release-owner-judgment", "record_status=approved completed-release-owner-judgment"),
  a6JudgmentValidationRaw.replace("record_status=approved-completed-release-owner-judgment", "record_status=approved\tcompleted-release-owner-judgment"),
  a6JudgmentValidationRaw.replace("\nrecord_type=", "\nrecord_status=duplicate\nrecord_type="),
  a6JudgmentValidationRaw.replace("\nrecord_type=", "\nforeign_key=value\nrecord_type="),
  a6JudgmentValidationRaw.replace("record_status=", "record_status= approved-")
]) assert.throws(() => parseA6CopyJudgmentResultRecord(malformed), /fence|strict lowercase key=value|unique|exact closed schema/);
for (const [field, value, expectedError] of [
  ["approval_id", "NC-R1-A6-MISMATCH", /approval_id must exactly match/],
  ["approval_fingerprint", fixtureFingerprint("a6-approval-mismatch"), /approval_fingerprint must exactly match/],
  ["exact_target_or_scope", "sanitized-a6-scope-mismatch", /exact_target_or_scope must exactly match/],
  ["required_approver", "other-owner", /required_approver must exactly match|Kurodev/],
  ["decision_owner", "other-owner", /decision owner/],
  ["effective_date", "2026-08-08", /effective_date must exactly match/],
  ["evidence_retention_location", "sanitized-retention-mismatch", /evidence_retention_location must exactly match/],
  ["stop_owner", "other-owner", /stop_owner must exactly match|stop ownership/],
  ["rollback_owner", "other-owner", /rollback_owner must exactly match|rollback ownership/],
  ["copy_artifact_identifier_or_content_fingerprint", "copy-mismatch", /copy artifact identifier or content fingerprint/],
  ["bound_a4_artifact_fingerprint", fixtureFingerprint("a4-mismatch"), /actual A4 artifact/],
  ["bound_a5_artifact_fingerprint", fixtureFingerprint("a5-mismatch"), /actual A5 artifact/],
  ["dependency_fingerprint_composite", "copy=wrong;a4=wrong;a5=wrong", /exact copy\/A4\/A5 composite/],
  ["copy_scope_disposition", "rejected", /approved exact copy scope/],
  ["copy_posture_disposition", "rejected", /approved exact copy posture/],
  ["exclusions_bound", "no", /exclusions_bound/],
  ["material_change_revalidation", "not-required", /material-change revalidation/],
  ["publication_public_paid_gate_risk_deploy_live_go_activation_external_action_authorization", "approved", /must not authorize/],
  ["judgment_output", "rejected", /approved judgment output/],
  ["row_closure", "none", /EVID-COPY only/],
  ["a6_result_fingerprint", fixtureFingerprint("a6-result-mismatch"), /exact final A6/],
  ["judgment_record_fingerprint", fixtureFingerprint("a6-record-mismatch"), /deterministic/]
]) assert.throws(() => validateA6CopyJudgmentResultRecord({ fields: { ...a6JudgmentValidationFields, [field]: value } }, a6JudgmentValidationChild, a6JudgmentValidationA4Record, a6JudgmentValidationA5Record, a6JudgmentValidationA4Child, a6JudgmentValidationA5Child, { requireComplete: true }), expectedError, `A6 Copy owner-judgment record must reject ${field} drift`);
for (const childStatus of ["running", "complete-not-closure-eligible"]) {
  const fixture = parsedFingerprintGraphFixture("A2-provider-cost-evidence-read", "satisfied");
  fixture.childRecords.find((child) => child.fields.child_id === "A6-copy-judgment").fields.child_status = childStatus;
  assert.throws(
    () => validateStagedLedgerCrossValidation(fixture.rowRecords, fixture.childRecords, fixture.ledger, fixture.signedEvidenceRecords, fixture.b2ScenarioResultRecords, fixture.a3ObservedResultRecords, fixture.a2ObservedResultRecords, fixture.a1ObservedResultRecords, fixture.a4JudgmentResultRecords, fixture.a5LegalJudgmentResultRecords, fixture.a6CopyJudgmentResultRecords),
    childStatus === "running" ? /terminal A6 child/ : /non-closing result/,
    `A6 ${childStatus} collection must reject a record outside its exact terminal semantics`
  );
}
assert.throws(
  () => validateStagedLedgerCrossValidation(a6JudgmentValidationFixture.rowRecords, a6JudgmentValidationFixture.childRecords, a6JudgmentValidationFixture.ledger, a6JudgmentValidationFixture.signedEvidenceRecords, a6JudgmentValidationFixture.b2ScenarioResultRecords, a6JudgmentValidationFixture.a3ObservedResultRecords, a6JudgmentValidationFixture.a2ObservedResultRecords, a6JudgmentValidationFixture.a1ObservedResultRecords, a6JudgmentValidationFixture.a4JudgmentResultRecords, a6JudgmentValidationFixture.a5LegalJudgmentResultRecords, [...a6JudgmentValidationFixture.a6CopyJudgmentResultRecords, { fields: { ...a6JudgmentValidationFields, judgment_record_id: "NC-R1-A6-JUDGMENT-FIXTURE-02" } }]),
  /unique independent child IDs/,
  "A6 Copy owner-judgment record collection must reject more than one record for its child"
);
assert.throws(
  () => validateStagedLedgerCrossValidation(a6JudgmentValidationFixture.rowRecords, a6JudgmentValidationFixture.childRecords, a6JudgmentValidationFixture.ledger, a6JudgmentValidationFixture.signedEvidenceRecords, a6JudgmentValidationFixture.b2ScenarioResultRecords, a6JudgmentValidationFixture.a3ObservedResultRecords, a6JudgmentValidationFixture.a2ObservedResultRecords, a6JudgmentValidationFixture.a1ObservedResultRecords, a6JudgmentValidationFixture.a4JudgmentResultRecords, a6JudgmentValidationFixture.a5LegalJudgmentResultRecords, [{ fields: { child_id: "A5-legal-judgment", judgment_record_id: "NC-R1-A6-JUDGMENT-FOREIGN-01" } }]),
  /exact closed A6 Copy record|exact A6 child/,
  "A6 Copy owner-judgment collection must reject a foreign or incomplete record"
);
const a6NonClosingValidationFixture = parsedFingerprintGraphFixture("A6-copy-judgment", "complete-not-closure-eligible");
assert.doesNotThrow(
  () => validateStagedLedgerCrossValidation(a6NonClosingValidationFixture.rowRecords, a6NonClosingValidationFixture.childRecords, a6NonClosingValidationFixture.ledger, a6NonClosingValidationFixture.signedEvidenceRecords, a6NonClosingValidationFixture.b2ScenarioResultRecords, a6NonClosingValidationFixture.a3ObservedResultRecords, a6NonClosingValidationFixture.a2ObservedResultRecords, a6NonClosingValidationFixture.a1ObservedResultRecords, a6NonClosingValidationFixture.a4JudgmentResultRecords, a6NonClosingValidationFixture.a5LegalJudgmentResultRecords, a6NonClosingValidationFixture.a6CopyJudgmentResultRecords),
  "A6 complete-not-closure-eligible must accept its exact separate rejected non-closing Copy record"
);
const a6ApprovalInputDriftFixture = parsedFingerprintGraphFixture("A6-copy-judgment", "satisfied");
const a6ApprovalInputDriftChild = a6ApprovalInputDriftFixture.childRecords.find((child) => child.fields.child_id === "A6-copy-judgment").fields;
const a6ApprovalInputDriftRecord = a6ApprovalInputDriftFixture.a6CopyJudgmentResultRecords[0].fields;
a6ApprovalInputDriftChild.bound_input = `copy=${a6ApprovalInputDriftChild.exact_target_or_scope};a4=${fixtureFingerprint("a6-non-a4-approval-input")};a5=${a6ApprovalInputDriftChild.a5_artifact_fingerprint}`;
a6ApprovalInputDriftChild.approval_fingerprint = deriveApprovalFingerprint(a6ApprovalInputDriftChild);
a6ApprovalInputDriftRecord.approval_fingerprint = a6ApprovalInputDriftChild.approval_fingerprint;
a6ApprovalInputDriftRecord.judgment_record_fingerprint = deriveA6CopyJudgmentRecordFingerprint(a6ApprovalInputDriftRecord);
a6ApprovalInputDriftChild.judgment_record_fingerprint = a6ApprovalInputDriftRecord.judgment_record_fingerprint;
a6ApprovalInputDriftChild.bound_artifact_fingerprint = deriveA6ArtifactFingerprint(a6ApprovalInputDriftChild, a6ApprovalInputDriftChild.approval_fingerprint, a6ApprovalInputDriftChild.a4_artifact_fingerprint, a6ApprovalInputDriftChild.a5_artifact_fingerprint, a6ApprovalInputDriftChild.judgment_record_fingerprint);
a6ApprovalInputDriftRecord.a6_result_fingerprint = a6ApprovalInputDriftChild.bound_artifact_fingerprint;
assert.throws(
  () => validateStagedLedgerCrossValidation(a6ApprovalInputDriftFixture.rowRecords, a6ApprovalInputDriftFixture.childRecords, a6ApprovalInputDriftFixture.ledger, a6ApprovalInputDriftFixture.signedEvidenceRecords, a6ApprovalInputDriftFixture.b2ScenarioResultRecords, a6ApprovalInputDriftFixture.a3ObservedResultRecords, a6ApprovalInputDriftFixture.a2ObservedResultRecords, a6ApprovalInputDriftFixture.a1ObservedResultRecords, a6ApprovalInputDriftFixture.a4JudgmentResultRecords, a6ApprovalInputDriftFixture.a5LegalJudgmentResultRecords, a6ApprovalInputDriftFixture.a6CopyJudgmentResultRecords),
  /bound_input.*actual copy\/A4\/A5 composite/,
  "A6 must reject a recomputed approval whose bound input is not the actual copy/A4/A5 composite"
);
for (const downstreamChildId of ["B1-deployed-target-proof", "B2-live-paid-flow-evidence"]) {
  const staleA6BindingFixture = parsedFingerprintGraphFixture(downstreamChildId, "satisfied");
  const a6Child = staleA6BindingFixture.childRecords.find((child) => child.fields.child_id === "A6-copy-judgment").fields;
  const a6Record = staleA6BindingFixture.a6CopyJudgmentResultRecords[0].fields;
  const b1Child = staleA6BindingFixture.childRecords.find((child) => child.fields.child_id === "B1-deployed-target-proof").fields;
  a6Record.judgment_record_id = `NC-R1-A6-JUDGMENT-FIXTURE-DRIFT-${downstreamChildId}`;
  a6Record.judgment_record_fingerprint = deriveA6CopyJudgmentRecordFingerprint(a6Record);
  a6Child.judgment_record_fingerprint = a6Record.judgment_record_fingerprint;
  a6Child.bound_artifact_fingerprint = deriveA6ArtifactFingerprint(a6Child, a6Child.approval_fingerprint, a6Child.a4_artifact_fingerprint, a6Child.a5_artifact_fingerprint, a6Child.judgment_record_fingerprint);
  a6Record.a6_result_fingerprint = a6Child.bound_artifact_fingerprint;
  assert.throws(
    () => validateStagedLedgerCrossValidation(staleA6BindingFixture.rowRecords, staleA6BindingFixture.childRecords, staleA6BindingFixture.ledger, staleA6BindingFixture.signedEvidenceRecords, staleA6BindingFixture.b2ScenarioResultRecords, staleA6BindingFixture.a3ObservedResultRecords, staleA6BindingFixture.a2ObservedResultRecords, staleA6BindingFixture.a1ObservedResultRecords, staleA6BindingFixture.a4JudgmentResultRecords, staleA6BindingFixture.a5LegalJudgmentResultRecords, staleA6BindingFixture.a6CopyJudgmentResultRecords),
    /a6_artifact_fingerprint|fingerprint/,
    `${downstreamChildId} must reject a semantically valid recomputed A6 record after its stale A6 binding`
  );
  assert.notEqual(b1Child.a6_artifact_fingerprint, a6Child.bound_artifact_fingerprint, "A6 record drift fixture must retain the stale B1 A6 binding");
}
for (const malformed of [
  `${a4JudgmentValidationRaw}\n${["https:", "", "private.invalid", "record"].join("/")}`,
  a4JudgmentValidationRaw.replace("record_status=", " record_status="),
  a4JudgmentValidationRaw.replace("record_status=approved-completed-release-owner-judgment", "record_status=approved completed-release-owner-judgment"),
  a4JudgmentValidationRaw.replace("record_status=approved-completed-release-owner-judgment", "record_status=approved\tcompleted-release-owner-judgment"),
  a4JudgmentValidationRaw.replace("\nrecord_type=", "\nrecord_status=duplicate\nrecord_type="),
  a4JudgmentValidationRaw.replace("\nrecord_type=", "\nunknown_key=value\nrecord_type="),
  a4JudgmentValidationRaw.replace("record_status=", "record_status= approved-")
]) {
  assert.throws(() => parseA4ProductPriceJudgmentResultRecord(malformed), /fence|strict key=value|unique|exact closed schema/);
}
for (const [field, value, expectedError] of [
  ["approval_id", "NC-R1-A4-MISMATCH", /approval_id must exactly match/],
  ["approval_fingerprint", fixtureFingerprint("a4-approval-mismatch"), /approval_fingerprint must exactly match/],
  ["exact_target_or_scope", "sanitized-a4-scope-mismatch", /exact_target_or_scope must exactly match/],
  ["required_approver", "other-owner", /required_approver must exactly match|Kurodev/],
  ["decision_owner", "other-owner", /decision owner/],
  ["effective_date", "2026-08-08", /effective_date must exactly match/],
  ["bound_a2_result_fingerprint", fixtureFingerprint("a2-mismatch"), /actual A2/],
  ["bound_a3_result_fingerprint", fixtureFingerprint("a3-mismatch"), /actual A3/],
  ["dependency_fingerprint_composite", "a2=wrong;a3=wrong", /exact A2\/A3 composite/],
  ["evidence_retention_location", "sanitized-retention-mismatch", /evidence_retention_location must exactly match/],
  ["product_scope_disposition", "rejected", /approved exact product scope/],
  ["price_posture_disposition", "partial", /approved exact price posture/],
  ["exclusions_bound", "no", /exclusions_bound/],
  ["material_change_revalidation", "not-required", /material-change revalidation/],
  ["judgment_output", "rejected", /approved judgment output/],
  ["legal_tax_copy_risk_deploy_live_go_activation_publication_authorization", "approved", /must not authorize/],
  ["row_closure", "EVID-LEGAL-only", /EVID-PRODUCT-PRICE only/],
  ["a4_result_fingerprint", fixtureFingerprint("a4-result-mismatch"), /exact final A4/],
  ["judgment_record_fingerprint", fixtureFingerprint("a4-record-mismatch"), /deterministic/]
]) {
  assert.throws(() => validateA4ProductPriceJudgmentResultRecord({ fields: { ...a4JudgmentValidationFields, [field]: value } }, a4JudgmentValidationChild, a4JudgmentValidationA2Record, a4JudgmentValidationA3Record, a4JudgmentValidationA2Child, a4JudgmentValidationA3Child, a4JudgmentValidationA3OwnerApproval, a4JudgmentValidationA0Child, { requireComplete: true }), expectedError, `A4 owner-judgment record must reject ${field} drift`);
}
for (const downstreamChildId of ["A5-legal-judgment", "A6-copy-judgment", "B1-deployed-target-proof", "B2-live-paid-flow-evidence"]) {
  const fixture = parsedFingerprintGraphFixture(downstreamChildId, "satisfied");
  fixture.a4JudgmentResultRecords[0].fields.product_scope_disposition = "rejected";
  assert.throws(() => validateStagedLedgerCrossValidation(fixture.rowRecords, fixture.childRecords, fixture.ledger, fixture.signedEvidenceRecords, fixture.b2ScenarioResultRecords, fixture.a3ObservedResultRecords, fixture.a2ObservedResultRecords, fixture.a1ObservedResultRecords, fixture.a4JudgmentResultRecords, fixture.a5LegalJudgmentResultRecords, fixture.a6CopyJudgmentResultRecords), /approved exact product scope/, `${downstreamChildId} must reject A4 material judgment-record drift`);
}
for (const downstreamChildId of ["A5-legal-judgment", "A6-copy-judgment", "B1-deployed-target-proof", "B2-live-paid-flow-evidence"]) {
  const fixture = parsedFingerprintGraphFixture(downstreamChildId, "satisfied");
  const a4Child = fixture.childRecords.find((child) => child.fields.child_id === "A4-product-price-judgment").fields;
  const a4Record = fixture.a4JudgmentResultRecords[0].fields;
  const unchangedA2 = fixture.a2ObservedResultRecords[0].fields.a2_result_fingerprint;
  const unchangedA3 = fixture.a3ObservedResultRecords[0].fields.a3_result_fingerprint;
  a4Record.judgment_record_id = `NC-R1-A4-JUDGMENT-FIXTURE-DRIFT-${downstreamChildId}`;
  a4Record.judgment_record_fingerprint = deriveA4JudgmentRecordFingerprint(a4Record);
  a4Child.judgment_record_fingerprint = a4Record.judgment_record_fingerprint;
  a4Child.bound_artifact_fingerprint = deriveA4ArtifactFingerprint(a4Child, a4Child.approval_fingerprint, a4Child.a2_result_fingerprint, a4Child.a3_result_fingerprint, a4Child.judgment_record_fingerprint);
  a4Record.a4_result_fingerprint = a4Child.bound_artifact_fingerprint;
  assert.equal(fixture.a2ObservedResultRecords[0].fields.a2_result_fingerprint, unchangedA2, "material A4 record drift must not alter the independent A2 input");
  assert.equal(fixture.a3ObservedResultRecords[0].fields.a3_result_fingerprint, unchangedA3, "material A4 record drift must not alter the independent A3 input");
  assert.throws(
    () => validateStagedLedgerCrossValidation(fixture.rowRecords, fixture.childRecords, fixture.ledger, fixture.signedEvidenceRecords, fixture.b2ScenarioResultRecords, fixture.a3ObservedResultRecords, fixture.a2ObservedResultRecords, fixture.a1ObservedResultRecords, fixture.a4JudgmentResultRecords, fixture.a5LegalJudgmentResultRecords, fixture.a6CopyJudgmentResultRecords),
    /bound_input.*actual A4 artifact|a4_artifact_fingerprint|fingerprint/,
    `${downstreamChildId} must reject a semantically valid recomputed A4 record after its own stale A4 fingerprint binding`
  );
}
for (const downstreamChildId of ["A5-legal-judgment", "A6-copy-judgment", "B1-deployed-target-proof", "B2-live-paid-flow-evidence"]) {
  for (const childStatus of ["running", "satisfied"]) {
    const fixture = parsedFingerprintGraphFixture(downstreamChildId, childStatus);
    if (downstreamChildId === "A3-stripe-source-applicability-read-or-judgment" && childStatus === "running") {
      assert.throws(
        () => validateStagedLedgerCrossValidation(fixture.rowRecords, fixture.childRecords, fixture.ledger, fixture.signedEvidenceRecords, fixture.b2ScenarioResultRecords, fixture.a3ObservedResultRecords, fixture.a2ObservedResultRecords, fixture.a1ObservedResultRecords, fixture.a4JudgmentResultRecords, fixture.a5LegalJudgmentResultRecords, fixture.a6CopyJudgmentResultRecords),
        /approved-not-started or running A3 requires no observed result record/,
        "running A3 must reject an observed result before its terminal state"
      );
      continue;
    }
    assert.throws(
      () => validateStagedLedgerCrossValidation(fixture.rowRecords, fixture.childRecords, fixture.ledger, fixture.signedEvidenceRecords, fixture.b2ScenarioResultRecords, fixture.a3ObservedResultRecords, fixture.a2ObservedResultRecords, fixture.a1ObservedResultRecords),
      /separate parsed A4 owner-judgment result record/,
      `${downstreamChildId} ${childStatus} must reject consumption of satisfied A4 without its separate parsed record`
    );
  }
}
const a2ObservedValidationFixture = parsedFingerprintGraphFixture("A2-provider-cost-evidence-read", "satisfied");
// RED: an A4 child self-claim cannot substitute for a separately parsed owner-judgment result record.
const a4MissingJudgmentRecordFixture = parsedFingerprintGraphFixture("A4-product-price-judgment", "satisfied");
assert.throws(
  () => validateStagedLedgerCrossValidation(
    a4MissingJudgmentRecordFixture.rowRecords,
    a4MissingJudgmentRecordFixture.childRecords,
    a4MissingJudgmentRecordFixture.ledger,
    a4MissingJudgmentRecordFixture.signedEvidenceRecords,
    a4MissingJudgmentRecordFixture.b2ScenarioResultRecords,
    a4MissingJudgmentRecordFixture.a3ObservedResultRecords,
    a4MissingJudgmentRecordFixture.a2ObservedResultRecords,
    a4MissingJudgmentRecordFixture.a1ObservedResultRecords
  ),
  /separate parsed A4 owner-judgment result record/,
  "A4 satisfied must reject its child self-claim without a separately parsed owner-judgment result record"
);
// RED: an A5 child self-claim cannot substitute for a separately parsed legal/tax owner-judgment result record.
const a5MissingJudgmentRecordFixture = parsedFingerprintGraphFixture("A5-legal-judgment", "satisfied");
assert.throws(
  () => validateStagedLedgerCrossValidation(
    a5MissingJudgmentRecordFixture.rowRecords,
    a5MissingJudgmentRecordFixture.childRecords,
    a5MissingJudgmentRecordFixture.ledger,
    a5MissingJudgmentRecordFixture.signedEvidenceRecords,
    a5MissingJudgmentRecordFixture.b2ScenarioResultRecords,
    a5MissingJudgmentRecordFixture.a3ObservedResultRecords,
    a5MissingJudgmentRecordFixture.a2ObservedResultRecords,
    a5MissingJudgmentRecordFixture.a1ObservedResultRecords,
    a5MissingJudgmentRecordFixture.a4JudgmentResultRecords
  ),
  /separate parsed A5 legal\/tax owner-judgment result record/,
  "A5 satisfied must reject its child self-claim without a separately parsed legal/tax owner-judgment result record"
);
// RED: a complete-but-non-closing A5 result must still bind a separate legal/tax owner-judgment record.
const a5CompleteWithoutJudgmentRecordFixture = parsedFingerprintGraphFixture("A5-legal-judgment", "complete-not-closure-eligible");
assert.throws(
  () => validateStagedLedgerCrossValidation(
    a5CompleteWithoutJudgmentRecordFixture.rowRecords,
    a5CompleteWithoutJudgmentRecordFixture.childRecords,
    a5CompleteWithoutJudgmentRecordFixture.ledger,
    a5CompleteWithoutJudgmentRecordFixture.signedEvidenceRecords,
    a5CompleteWithoutJudgmentRecordFixture.b2ScenarioResultRecords,
    a5CompleteWithoutJudgmentRecordFixture.a3ObservedResultRecords,
    a5CompleteWithoutJudgmentRecordFixture.a2ObservedResultRecords,
    a5CompleteWithoutJudgmentRecordFixture.a1ObservedResultRecords,
    a5CompleteWithoutJudgmentRecordFixture.a4JudgmentResultRecords
  ),
  /separate parsed A5 legal\/tax owner-judgment result record/,
  "A5 complete-not-closure-eligible must reject its child self-claim without a separately parsed legal/tax owner-judgment result record"
);
assert.doesNotThrow(
  () => validateStagedLedgerCrossValidation(
    a5CompleteWithoutJudgmentRecordFixture.rowRecords,
    a5CompleteWithoutJudgmentRecordFixture.childRecords,
    a5CompleteWithoutJudgmentRecordFixture.ledger,
    a5CompleteWithoutJudgmentRecordFixture.signedEvidenceRecords,
    a5CompleteWithoutJudgmentRecordFixture.b2ScenarioResultRecords,
    a5CompleteWithoutJudgmentRecordFixture.a3ObservedResultRecords,
    a5CompleteWithoutJudgmentRecordFixture.a2ObservedResultRecords,
    a5CompleteWithoutJudgmentRecordFixture.a1ObservedResultRecords,
    a5CompleteWithoutJudgmentRecordFixture.a4JudgmentResultRecords,
    a5CompleteWithoutJudgmentRecordFixture.a5LegalJudgmentResultRecords
  ),
  "A5 complete-not-closure-eligible must accept its exact separate rejected non-closing record"
);
// RED: neither terminal A6 child self-claim can substitute for a separately parsed Copy owner-judgment result record.
for (const childStatus of ["satisfied", "complete-not-closure-eligible"]) {
  const a6MissingJudgmentRecordFixture = parsedFingerprintGraphFixture("A6-copy-judgment", childStatus);
  assert.throws(
    () => validateStagedLedgerCrossValidation(
      a6MissingJudgmentRecordFixture.rowRecords,
      a6MissingJudgmentRecordFixture.childRecords,
      a6MissingJudgmentRecordFixture.ledger,
      a6MissingJudgmentRecordFixture.signedEvidenceRecords,
      a6MissingJudgmentRecordFixture.b2ScenarioResultRecords,
      a6MissingJudgmentRecordFixture.a3ObservedResultRecords,
      a6MissingJudgmentRecordFixture.a2ObservedResultRecords,
      a6MissingJudgmentRecordFixture.a1ObservedResultRecords,
      a6MissingJudgmentRecordFixture.a4JudgmentResultRecords,
      a6MissingJudgmentRecordFixture.a5LegalJudgmentResultRecords
    ),
    /requires a separate parsed A6 Copy owner-judgment result record/,
    `A6 ${childStatus} must reject its child self-claim without a separately parsed Copy owner-judgment result record`
  );
}
for (const downstreamChildId of ["B1-deployed-target-proof", "B2-live-paid-flow-evidence"]) {
  for (const childStatus of ["running", "complete-not-closure-eligible", "satisfied"]) {
    const missingA6RecordFixture = parsedFingerprintGraphFixture(downstreamChildId, childStatus);
    assert.throws(
      () => validateStagedLedgerCrossValidation(missingA6RecordFixture.rowRecords, missingA6RecordFixture.childRecords, missingA6RecordFixture.ledger, missingA6RecordFixture.signedEvidenceRecords, missingA6RecordFixture.b2ScenarioResultRecords, missingA6RecordFixture.a3ObservedResultRecords, missingA6RecordFixture.a2ObservedResultRecords, missingA6RecordFixture.a1ObservedResultRecords, missingA6RecordFixture.a4JudgmentResultRecords, missingA6RecordFixture.a5LegalJudgmentResultRecords),
      /requires a separate parsed A6 Copy owner-judgment result record/,
      `${downstreamChildId} ${childStatus} must reject a satisfied A6 self-claim without its separate parsed Copy owner-judgment record`
    );
  }
}
// RED: a terminal A5 collection record must validate its closed semantic bindings, not merely its identity.
const a5InvalidOwnerCollectionFixture = parsedFingerprintGraphFixture("A2-provider-cost-evidence-read", "satisfied");
a5InvalidOwnerCollectionFixture.a5LegalJudgmentResultRecords[0].fields.decision_owner = "other-owner";
assert.throws(
  () => validateStagedLedgerCrossValidation(
    a5InvalidOwnerCollectionFixture.rowRecords,
    a5InvalidOwnerCollectionFixture.childRecords,
    a5InvalidOwnerCollectionFixture.ledger,
    a5InvalidOwnerCollectionFixture.signedEvidenceRecords,
    a5InvalidOwnerCollectionFixture.b2ScenarioResultRecords,
    a5InvalidOwnerCollectionFixture.a3ObservedResultRecords,
    a5InvalidOwnerCollectionFixture.a2ObservedResultRecords,
    a5InvalidOwnerCollectionFixture.a1ObservedResultRecords,
    a5InvalidOwnerCollectionFixture.a4JudgmentResultRecords,
    a5InvalidOwnerCollectionFixture.a5LegalJudgmentResultRecords
  ),
  /decision owner/,
  "A5 collection must reject an exact-shape record with a wrong decision owner"
);
// RED: an A5 collection must validate its referenced A4 record even when the iterated row is A2.
const a5CollectionWithInvalidA4Fixture = parsedFingerprintGraphFixture("A2-provider-cost-evidence-read", "satisfied");
a5CollectionWithInvalidA4Fixture.a4JudgmentResultRecords[0].fields.decision_owner = "other-owner";
assert.throws(
  () => validateStagedLedgerCrossValidation(
    a5CollectionWithInvalidA4Fixture.rowRecords,
    a5CollectionWithInvalidA4Fixture.childRecords,
    a5CollectionWithInvalidA4Fixture.ledger,
    a5CollectionWithInvalidA4Fixture.signedEvidenceRecords,
    a5CollectionWithInvalidA4Fixture.b2ScenarioResultRecords,
    a5CollectionWithInvalidA4Fixture.a3ObservedResultRecords,
    a5CollectionWithInvalidA4Fixture.a2ObservedResultRecords,
    a5CollectionWithInvalidA4Fixture.a1ObservedResultRecords,
    a5CollectionWithInvalidA4Fixture.a4JudgmentResultRecords,
    a5CollectionWithInvalidA4Fixture.a5LegalJudgmentResultRecords
  ),
  /decision owner/,
  "A5 collection must reject a semantically invalid referenced A4 record before its A5 validation"
);
const a5UnapprovedCollectionFixture = parsedFingerprintGraphFixture("A2-provider-cost-evidence-read", "satisfied");
a5UnapprovedCollectionFixture.childRecords.find((child) => child.fields.child_id === "A5-legal-judgment").fields.child_status = "unapproved";
assert.throws(
  () => validateStagedLedgerCrossValidation(
    a5UnapprovedCollectionFixture.rowRecords,
    a5UnapprovedCollectionFixture.childRecords,
    a5UnapprovedCollectionFixture.ledger,
    a5UnapprovedCollectionFixture.signedEvidenceRecords,
    a5UnapprovedCollectionFixture.b2ScenarioResultRecords,
    a5UnapprovedCollectionFixture.a3ObservedResultRecords,
    a5UnapprovedCollectionFixture.a2ObservedResultRecords,
    a5UnapprovedCollectionFixture.a1ObservedResultRecords,
    a5UnapprovedCollectionFixture.a4JudgmentResultRecords,
    a5UnapprovedCollectionFixture.a5LegalJudgmentResultRecords
  ),
  /terminal A5 child/,
  "A5 collection must reject a completed record while A5 is unapproved"
);
for (const downstreamChildId of ["A6-copy-judgment", "B1-deployed-target-proof", "B2-live-paid-flow-evidence"]) {
  for (const childStatus of ["running", "complete-not-closure-eligible", "satisfied"]) {
    const fixture = parsedFingerprintGraphFixture(downstreamChildId, childStatus);
    assert.throws(
      () => validateStagedLedgerCrossValidation(fixture.rowRecords, fixture.childRecords, fixture.ledger, fixture.signedEvidenceRecords, fixture.b2ScenarioResultRecords, fixture.a3ObservedResultRecords, fixture.a2ObservedResultRecords, fixture.a1ObservedResultRecords, fixture.a4JudgmentResultRecords),
      /requires a separate parsed A5 legal\/tax owner-judgment result record/,
      `${downstreamChildId} ${childStatus} must reject consumption of satisfied A5 without its separate parsed record`
    );
  }
}
for (const downstreamChildId of ["A6-copy-judgment", "B1-deployed-target-proof", "B2-live-paid-flow-evidence"]) {
  const fixture = parsedFingerprintGraphFixture(downstreamChildId, "satisfied");
  const a5Child = fixture.childRecords.find((child) => child.fields.child_id === "A5-legal-judgment").fields;
  const a5Record = fixture.a5LegalJudgmentResultRecords[0].fields;
  const unchangedA4 = fixture.a4JudgmentResultRecords[0].fields.a4_result_fingerprint;
  a5Record.judgment_record_id = `NC-R1-A5-JUDGMENT-FIXTURE-DRIFT-${downstreamChildId}`;
  a5Record.judgment_record_fingerprint = deriveA5LegalJudgmentRecordFingerprint(a5Record);
  a5Child.judgment_record_fingerprint = a5Record.judgment_record_fingerprint;
  a5Child.bound_artifact_fingerprint = deriveA5ArtifactFingerprint(a5Child, a5Child.approval_fingerprint, a5Child.a4_artifact_fingerprint, a5Child.judgment_record_fingerprint);
  a5Record.a5_result_fingerprint = a5Child.bound_artifact_fingerprint;
  assert.equal(fixture.a4JudgmentResultRecords[0].fields.a4_result_fingerprint, unchangedA4, "material A5 record drift must not alter the independent A4 artifact");
  assert.throws(
    () => validateStagedLedgerCrossValidation(fixture.rowRecords, fixture.childRecords, fixture.ledger, fixture.signedEvidenceRecords, fixture.b2ScenarioResultRecords, fixture.a3ObservedResultRecords, fixture.a2ObservedResultRecords, fixture.a1ObservedResultRecords, fixture.a4JudgmentResultRecords, fixture.a5LegalJudgmentResultRecords, fixture.a6CopyJudgmentResultRecords),
    /bound_input|a5_artifact_fingerprint|fingerprint/,
    `${downstreamChildId} must reject a semantically valid recomputed A5 record after its own stale A5 fingerprint binding`
  );
}
const a1MissingObservedRecordFixture = parsedFingerprintGraphFixture("A1-worker-cpu-evidence-read", "satisfied");
assert.throws(
  () => validateStagedLedgerCrossValidation(
    a1MissingObservedRecordFixture.rowRecords,
    a1MissingObservedRecordFixture.childRecords,
    a1MissingObservedRecordFixture.ledger,
    a1MissingObservedRecordFixture.signedEvidenceRecords,
    a1MissingObservedRecordFixture.b2ScenarioResultRecords,
    a1MissingObservedRecordFixture.a3ObservedResultRecords,
    a1MissingObservedRecordFixture.a2ObservedResultRecords
  ),
  /A1 requires a separate parsed observed result record/,
  "A1 satisfied must reject a schema-capability-only child without an independent observed record"
);
for (const downstreamChildId of ["B1-deployed-target-proof", "B2-live-paid-flow-evidence"]) {
  const missingA1ObservedRecordFixture = parsedFingerprintGraphFixture(downstreamChildId, "satisfied");
  assert.throws(
    () => validateStagedLedgerCrossValidation(
      missingA1ObservedRecordFixture.rowRecords,
      missingA1ObservedRecordFixture.childRecords,
      missingA1ObservedRecordFixture.ledger,
      missingA1ObservedRecordFixture.signedEvidenceRecords,
      missingA1ObservedRecordFixture.b2ScenarioResultRecords,
      missingA1ObservedRecordFixture.a3ObservedResultRecords,
      missingA1ObservedRecordFixture.a2ObservedResultRecords
    ),
    /requires a separate parsed (?:A1 observed result|A4 owner-judgment result) record/,
    `${downstreamChildId} must not consume a satisfied A1 self-claim without an independent parsed observed record`
  );
}
const a1ObservedValidationFixture = parsedFingerprintGraphFixture("A1-worker-cpu-evidence-read", "satisfied");
const a1ObservedValidationChild = a1ObservedValidationFixture.childRecords.find((child) => child.fields.child_id === "A1-worker-cpu-evidence-read").fields;
const a1ObservedValidationFields = a1ObservedValidationFixture.a1ObservedResultRecords[0].fields;
const a1ObservedValidationMarkdown = `## Completed A1 Worker CPU Sanitized Observed Result\n\n\`\`\`text\n${a1WorkerCpuObservedResultRecordFields.map((field) => `${field}=${a1ObservedValidationFields[field]}`).join("\n")}\n\`\`\`\n`;
const parsedA1ObservedValidationRecord = parseA1WorkerCpuObservedResultRecord(a1ObservedValidationMarkdown);
assert.deepEqual(parsedA1ObservedValidationRecord.fields, a1ObservedValidationFields, "A1 observed result parser must retain the exact closed sanitized record");
assert.throws(
  () => parseA1WorkerCpuObservedResultRecord(a1ObservedValidationMarkdown.replace("record_status=", "record_status = invalid\n")),
  /strict key=value/
);
assert.throws(
  () => parseA1WorkerCpuObservedResultRecord(a1ObservedValidationMarkdown.replace("approval_decision=approved", "approval_decision= approved ")),
  /strict key=value/
);
const syntheticA1RawUrl = ["https:", "", "private.invalid", "synthetic"].join("/");
assert.throws(
  () => parseA1WorkerCpuObservedResultRecord(`${a1ObservedValidationMarkdown.trimEnd()}\n${syntheticA1RawUrl}\n`),
  /outside its single text fence/
);
assert.throws(
  () => validateA1WorkerCpuObservedResultRecord({ fields: workerCpuSchemaManualResultTemplate.fields }, a1ObservedValidationChild, { requireComplete: true }),
  /exact closed schema/,
  "A1 complete evidence must not be derived from the schema-capability-only template"
);
assert.doesNotThrow(() => validateA1WorkerCpuObservedResultRecord(parsedA1ObservedValidationRecord, a1ObservedValidationChild, { requireComplete: true }));
for (const [overrides, expectedError] of [
  [{ unexpected_private_field: "none" }, /exact closed schema/],
  [{ approval_id: "NC-R1-A1-MISMATCH" }, /approval_id must exactly match/],
  [{ approval_fingerprint: fixtureFingerprint("a1-approval-mismatch") }, /approval_fingerprint must exactly match/],
  [{ exact_target_or_scope: "sanitized-target-mismatch" }, /exact_target_or_scope must exactly match/],
  [{ time_window: "2026-08-09T10:00:00+09:00/2026-08-09T11:00:00+09:00" }, /time_window must exactly match/],
  [{ operator: "sanitized-operator-mismatch" }, /operator must exactly match/],
  [{ source_disposition_fingerprint: fixtureFingerprint("source-disposition-mismatch") }, /source_disposition_fingerprint must exactly match/],
  [{ observed_at: "2026-08-09T00:15:00Z" }, /strict RFC3339 Asia\/Tokyo calendar timestamp/],
  [{ observed_at: "2026-08-09T24:00:00+09:00" }, /strict RFC3339 Asia\/Tokyo calendar timestamp/],
  [{ observed_at: "2026-08-09T10:15:00+09:00" }, /must not follow the approved time window/],
  [{ target_match: "unconfirmed" }, /complete status requires every exact completeness signal/],
  [{ aggregation_complete: "no" }, /complete status requires every exact completeness signal/],
  [{ request_completeness: "incomplete" }, /complete status requires every exact completeness signal/],
  [{ headroom_disposition: "insufficient" }, /complete status requires every exact completeness signal/],
  [{ sampling_confidence_completeness: "incomplete" }, /complete status requires every exact completeness signal/],
  [{ raw_numeric_metrics_response_account_tag_private_script_credential_retained_or_shared: "yes" }, /must retain no raw numeric or private material/],
  [{ trace_logs_dashboard_reopened_outside_exact_approved_surface: "yes" }, /must not reopen Trace, logs, or dashboard surfaces/],
  [{ provider_billing_configuration_or_write_action: "performed" }, /must record no provider, billing, configuration, or write action/],
  [{ codex_browser_or_control: "performed" }, /must give Codex no browser or control/],
  [{ incremental_charge: "yes" }, /must record no incremental charge/],
  [{ row_closure: "none" }, /closes only EVID-WORKER-CPU/],
  [{ observed_record_fingerprint: fixtureFingerprint("observed-record-mismatch") }, /deterministically derived/],
  [{ a1_result_fingerprint: fixtureFingerprint("a1-result-mismatch") }, /exact A1 result fingerprint/]
]) {
  assert.throws(
    () => validateA1WorkerCpuObservedResultRecord({ fields: { ...a1ObservedValidationFields, ...overrides } }, a1ObservedValidationChild, { requireComplete: true }),
    expectedError
  );
}
const a1PartialObservedFields = {
  ...a1ObservedValidationFields,
  record_status: "approved-partial-stop-authenticated-private-read",
  sampling_confidence_completeness: "unknown",
  stop_result: "sampling_confidence_completeness-unknown",
  result_status: "partial-stop",
  row_closure: "none",
  a1_result_fingerprint: "pending-derived-A1-result",
  observed_record_fingerprint: "pending-derived-observed-record"
};
a1PartialObservedFields.observed_record_fingerprint = deriveA1ObservedRecordFingerprint(a1PartialObservedFields);
const a1PartialObservedChild = { ...a1ObservedValidationChild, observed_record_fingerprint: a1PartialObservedFields.observed_record_fingerprint };
a1PartialObservedChild.result_fingerprint = deriveA1EvidenceFingerprint(a1PartialObservedChild, a1PartialObservedChild.approval_fingerprint, a1PartialObservedChild.source_disposition_fingerprint);
a1PartialObservedFields.a1_result_fingerprint = a1PartialObservedChild.result_fingerprint;
assert.doesNotThrow(() => validateA1WorkerCpuObservedResultRecord({ fields: a1PartialObservedFields }, a1PartialObservedChild));
assert.throws(() => validateA1WorkerCpuObservedResultRecord({ fields: a1PartialObservedFields }, a1PartialObservedChild, { requireComplete: true }), /requires a complete observed result/);
assert.equal(
  canonicalA1PartialStopResult({ ...a1ObservedValidationFields, target_match: "unconfirmed" }),
  "target_match-unconfirmed",
  "A1 canonical partial-stop reasons must use documented exact field names"
);
for (const [field, value] of [
  ["target_match", "unconfirmed"],
  ["aggregation_complete", "no"],
  ["request_completeness", "incomplete"],
  ["headroom_disposition", "insufficient"],
  ["sampling_confidence_completeness", "unknown"]
]) {
  const mismatchedStopFields = {
    ...a1ObservedValidationFields,
    record_status: "approved-partial-stop-authenticated-private-read",
    [field]: value,
    stop_result: "wrong-canonical-reason",
    result_status: "partial-stop",
    row_closure: "none",
    a1_result_fingerprint: "pending-derived-A1-result",
    observed_record_fingerprint: "pending-derived-observed-record"
  };
  mismatchedStopFields.observed_record_fingerprint = deriveA1ObservedRecordFingerprint(mismatchedStopFields);
  const mismatchedStopChild = { ...a1ObservedValidationChild, observed_record_fingerprint: mismatchedStopFields.observed_record_fingerprint };
  mismatchedStopChild.result_fingerprint = deriveA1EvidenceFingerprint(mismatchedStopChild, mismatchedStopChild.approval_fingerprint, mismatchedStopChild.source_disposition_fingerprint);
  mismatchedStopFields.a1_result_fingerprint = mismatchedStopChild.result_fingerprint;
  assert.throws(
    () => validateA1WorkerCpuObservedResultRecord({ fields: mismatchedStopFields }, mismatchedStopChild),
    /canonical stop result/,
    `A1 partial-stop ${field} must retain its deterministic canonical stop reason`
  );
}
const b1A1ObservedDriftFixture = parsedFingerprintGraphFixture("B1-deployed-target-proof", "satisfied");
const b1A1ObservedDriftRecord = b1A1ObservedDriftFixture.a1ObservedResultRecords[0].fields;
const b1A1ObservedDriftChild = b1A1ObservedDriftFixture.childRecords.find((child) => child.fields.child_id === "A1-worker-cpu-evidence-read").fields;
b1A1ObservedDriftRecord.observed_at = "2026-08-09T09:20:00+09:00";
b1A1ObservedDriftChild.source_timestamp = b1A1ObservedDriftRecord.observed_at;
b1A1ObservedDriftRecord.observed_record_fingerprint = deriveA1ObservedRecordFingerprint(b1A1ObservedDriftRecord);
b1A1ObservedDriftChild.observed_record_fingerprint = b1A1ObservedDriftRecord.observed_record_fingerprint;
b1A1ObservedDriftChild.result_fingerprint = deriveA1EvidenceFingerprint(b1A1ObservedDriftChild, b1A1ObservedDriftChild.approval_fingerprint, b1A1ObservedDriftChild.source_disposition_fingerprint);
b1A1ObservedDriftRecord.a1_result_fingerprint = b1A1ObservedDriftChild.result_fingerprint;
assert.throws(
  () => validateStagedLedgerCrossValidation(
    b1A1ObservedDriftFixture.rowRecords,
    b1A1ObservedDriftFixture.childRecords,
    b1A1ObservedDriftFixture.ledger,
    b1A1ObservedDriftFixture.signedEvidenceRecords,
    b1A1ObservedDriftFixture.b2ScenarioResultRecords,
    b1A1ObservedDriftFixture.a3ObservedResultRecords,
    b1A1ObservedDriftFixture.a2ObservedResultRecords,
    b1A1ObservedDriftFixture.a1ObservedResultRecords,
    b1A1ObservedDriftFixture.a4JudgmentResultRecords,
    b1A1ObservedDriftFixture.a5LegalJudgmentResultRecords,
    b1A1ObservedDriftFixture.a6CopyJudgmentResultRecords
  ),
  /fingerprint/,
  "A1 observed-record material drift must invalidate the bound B1 result graph"
);
function recomputedA1SourceDispositionMutationFixture(closingChildId) {
  const fixture = parsedFingerprintGraphFixture(closingChildId, "satisfied");
  const observedRecord = fixture.a1ObservedResultRecords[0].fields;
  const a1Child = fixture.childRecords.find((child) => child.fields.child_id === "A1-worker-cpu-evidence-read").fields;
  const actualSourceDispositionFingerprint = fixture.childRecords.find((child) => child.fields.child_id === "A1-worker-cpu-source-disposition").fields.result_fingerprint;
  const arbitrarySourceDispositionFingerprint = fixtureFingerprint(`arbitrary-source-disposition-${closingChildId}`);
  a1Child.source_disposition_fingerprint = arbitrarySourceDispositionFingerprint;
  observedRecord.source_disposition_fingerprint = arbitrarySourceDispositionFingerprint;
  observedRecord.observed_record_fingerprint = deriveA1ObservedRecordFingerprint(observedRecord);
  a1Child.observed_record_fingerprint = observedRecord.observed_record_fingerprint;
  a1Child.result_fingerprint = deriveA1EvidenceFingerprint(a1Child, a1Child.approval_fingerprint, actualSourceDispositionFingerprint);
  observedRecord.a1_result_fingerprint = a1Child.result_fingerprint;
  if (["B1-deployed-target-proof", "B2-live-paid-flow-evidence"].includes(closingChildId)) {
    const b1 = fixture.childRecords.find((child) => child.fields.child_id === "B1-deployed-target-proof").fields;
    b1.a1_result_fingerprint = a1Child.result_fingerprint;
    b1.deployed_fingerprint = deriveB1DeployedFingerprint(b1, b1.approval_fingerprint, {
      a1: a1Child.result_fingerprint,
      a4: b1.a4_artifact_fingerprint,
      a5: b1.a5_artifact_fingerprint,
      a6: b1.a6_artifact_fingerprint,
      external: b1.external_prerequisite_fingerprint
    });
    if (closingChildId === "B2-live-paid-flow-evidence") {
      const b2 = fixture.childRecords.find((child) => child.fields.child_id === "B2-live-paid-flow-evidence").fields;
      b2.b1_deployed_fingerprint = b1.deployed_fingerprint;
      b2.result_fingerprint = deriveB2ResultFingerprint(b2, b2.approval_fingerprint, b1.deployed_fingerprint, b2.signed_evidence_fingerprint);
    }
  }
  return fixture;
}
for (const closingChildId of ["A1-worker-cpu-evidence-read", "B1-deployed-target-proof", "B2-live-paid-flow-evidence"]) {
  const sourceDispositionDriftFixture = recomputedA1SourceDispositionMutationFixture(closingChildId);
  assert.throws(
    () => validateStagedLedgerCrossValidation(
      sourceDispositionDriftFixture.rowRecords,
      sourceDispositionDriftFixture.childRecords,
      sourceDispositionDriftFixture.ledger,
      sourceDispositionDriftFixture.signedEvidenceRecords,
      sourceDispositionDriftFixture.b2ScenarioResultRecords,
      sourceDispositionDriftFixture.a3ObservedResultRecords,
      sourceDispositionDriftFixture.a2ObservedResultRecords,
      sourceDispositionDriftFixture.a1ObservedResultRecords,
      sourceDispositionDriftFixture.a4JudgmentResultRecords,
      sourceDispositionDriftFixture.a5LegalJudgmentResultRecords,
      sourceDispositionDriftFixture.a6CopyJudgmentResultRecords
    ),
    /source_disposition_fingerprint/,
    `${closingChildId} must reject an A1 source-disposition field that is not the actual upstream fingerprint`
  );
}
const a2ObservedValidationChild = a2ObservedValidationFixture.childRecords.find((child) => child.fields.child_id === "A2-provider-cost-evidence-read").fields;
const a2ObservedValidationFields = a2ObservedValidationFixture.a2ObservedResultRecords[0].fields;
const a2ObservedValidationMarkdown = `## Completed A2 Provider Cost Sanitized Result\n\n\`\`\`text\n${a2ProviderCostObservedResultRecordFields.map((field) => `${field}=${a2ObservedValidationFields[field]}`).join("\n")}\n\`\`\`\n`;
const parsedA2ObservedValidationRecord = parseA2ProviderCostObservedResultRecord(a2ObservedValidationMarkdown);
assert.deepEqual(parsedA2ObservedValidationRecord.fields, a2ObservedValidationFields, "A2 observed result parser must retain the exact closed sanitized record");
assert.throws(
  () => parseA2ProviderCostObservedResultRecord(a2ObservedValidationMarkdown.replace("record_status=", "raw_payload = SYNTHETIC_PRIVATE_VALUE\nrecord_status=")),
  /strict key=value/
);
const syntheticA2RawUrl = ["https:", "", "private.invalid", "synthetic"].join("/");
assert.throws(
  () => parseA2ProviderCostObservedResultRecord(`${a2ObservedValidationMarkdown.trimEnd()}\n${syntheticA2RawUrl}\n`),
  /outside its single text fence/
);
assert.doesNotThrow(() => validateA2ProviderCostObservedResultRecord(parsedA2ObservedValidationRecord, a2ObservedValidationChild, { requireComplete: true }));
for (const [overrides, expectedError] of [
  [{ unexpected_private_field: "none" }, /exact closed schema/],
  [{ approval_id: "NC-R1-A2-MISMATCH" }, /approval_id must exactly match/],
  [{ exact_target_or_scope: "sanitized-target-mismatch" }, /exact_target_or_scope must exactly match/],
  [{ time_window: "2026-08-09T02:00:00+09:00\/2026-08-09T03:00:00+09:00" }, /time_window must exactly match/],
  [{ operator: "sanitized-operator-mismatch" }, /operator must exactly match/],
  [{ bound_a0_cost_model_input_fingerprint: fixtureFingerprint("a0-mismatch") }, /exact A0 input fingerprint/],
  [{ funding_prerequisite_fingerprint: fixtureFingerprint("funding-mismatch") }, /exact funding prerequisite fingerprint/],
  [{ observed_at: "2026-08-08T15:15:00Z" }, /strict RFC3339 Asia\/Tokyo calendar timestamp/],
  [{ observed_at: "2026-08-09T24:00:00+09:00" }, /strict RFC3339 Asia\/Tokyo calendar timestamp/],
  [{ observed_at: "2026-08-09T02:00:00+09:00" }, /must not precede|must not follow the approved time window/],
  [{ funded_headroom_classification: "zero-funded-headroom" }, /complete status requires positive funded headroom/],
  [{ aggregation_completeness: "incomplete" }, /complete status requires positive funded headroom/],
  [{ sanitized_exact_cost_classification: "unavailable" }, /complete status requires positive funded headroom/],
  [{ applicability: "not-applicable" }, /complete status requires positive funded headroom/],
  [{ provider_api_write_payment_credit_budget_or_settings_action: "performed" }, /must record no provider or funding side effect/],
  [{ credential_creation_retrieval_disclosure: "performed" }, /must record no credential action/],
  [{ raw_url_org_project_account_identifier_private_identifier_payload_retained_or_shared: "yes" }, /must retain no raw or private material/],
  [{ codex_browser_or_provider_control: "approved" }, /must give Codex no browser or provider control/],
  [{ incremental_charge: "yes" }, /must record no incremental charge/],
  [{ row_closure: "none" }, /closes only EVID-PROVIDER-COST/],
  [{ observed_record_fingerprint: fixtureFingerprint("observed-record-mismatch") }, /deterministically derived/],
  [{ a2_result_fingerprint: fixtureFingerprint("a2-result-mismatch") }, /exact A2 result fingerprint/]
]) {
  assert.throws(
    () => validateA2ProviderCostObservedResultRecord({ fields: { ...a2ObservedValidationFields, ...overrides } }, a2ObservedValidationChild, { requireComplete: true }),
    expectedError
  );
}
const a2PartialObservedFields = {
  ...a2ObservedValidationFields,
  record_status: "approved-partial-stop-authenticated-private-read",
  funded_headroom_classification: "unavailable",
  stop_result: "funded-headroom-unavailable",
  result_status: "partial-stop",
  row_closure: "none",
  a2_result_fingerprint: "pending-derived-A2-result",
  observed_record_fingerprint: "pending-derived-observed-record"
};
a2PartialObservedFields.observed_record_fingerprint = deriveA2ObservedRecordFingerprint(a2PartialObservedFields);
const a2PartialObservedChild = { ...a2ObservedValidationChild, observed_record_fingerprint: a2PartialObservedFields.observed_record_fingerprint };
a2PartialObservedChild.result_fingerprint = deriveA2ResultFingerprint(a2PartialObservedChild, a2PartialObservedChild.approval_fingerprint, a2PartialObservedChild.dependency_fingerprint, a2PartialObservedChild.funding_prerequisite_fingerprint);
a2PartialObservedChild.cost_model_fingerprint = a2PartialObservedChild.result_fingerprint;
a2PartialObservedFields.a2_result_fingerprint = a2PartialObservedChild.result_fingerprint;
assert.doesNotThrow(() => validateA2ProviderCostObservedResultRecord({ fields: a2PartialObservedFields }, a2PartialObservedChild));
assert.throws(() => validateA2ProviderCostObservedResultRecord({ fields: a2PartialObservedFields }, a2PartialObservedChild, { requireComplete: true }), /requires a complete observed result/);
const a4A2ObservedDriftFixture = parsedFingerprintGraphFixture("A4-product-price-judgment", "satisfied");
const a4A2ObservedDriftRecord = a4A2ObservedDriftFixture.a2ObservedResultRecords[0].fields;
const a4A2ObservedDriftChild = a4A2ObservedDriftFixture.childRecords.find((child) => child.fields.child_id === "A2-provider-cost-evidence-read").fields;
a4A2ObservedDriftRecord.aggregation_completeness = "incomplete";
a4A2ObservedDriftRecord.result_status = "partial-stop";
a4A2ObservedDriftRecord.record_status = "approved-partial-stop-authenticated-private-read";
a4A2ObservedDriftRecord.stop_result = "aggregation-incomplete";
a4A2ObservedDriftRecord.row_closure = "none";
a4A2ObservedDriftRecord.observed_record_fingerprint = deriveA2ObservedRecordFingerprint(a4A2ObservedDriftRecord);
a4A2ObservedDriftChild.observed_record_fingerprint = a4A2ObservedDriftRecord.observed_record_fingerprint;
a4A2ObservedDriftChild.result_fingerprint = deriveA2ResultFingerprint(a4A2ObservedDriftChild, a4A2ObservedDriftChild.approval_fingerprint, a4A2ObservedDriftChild.dependency_fingerprint, a4A2ObservedDriftChild.funding_prerequisite_fingerprint);
a4A2ObservedDriftChild.cost_model_fingerprint = a4A2ObservedDriftChild.result_fingerprint;
a4A2ObservedDriftRecord.a2_result_fingerprint = a4A2ObservedDriftChild.result_fingerprint;
assert.throws(
  () => validateStagedLedgerCrossValidation(
    a4A2ObservedDriftFixture.rowRecords,
    a4A2ObservedDriftFixture.childRecords,
    a4A2ObservedDriftFixture.ledger,
    a4A2ObservedDriftFixture.signedEvidenceRecords,
    a4A2ObservedDriftFixture.b2ScenarioResultRecords,
    a4A2ObservedDriftFixture.a3ObservedResultRecords,
    a4A2ObservedDriftFixture.a2ObservedResultRecords,
    a4A2ObservedDriftFixture.a1ObservedResultRecords,
    a4A2ObservedDriftFixture.a4JudgmentResultRecords,
    a4A2ObservedDriftFixture.a5LegalJudgmentResultRecords
  ),
  /complete observed|fingerprint/,
  "A2 observed-record material drift must invalidate the bound A4 result graph"
);
const a3ObservedValidationFixture = parsedFingerprintGraphFixture("A3-stripe-source-applicability-read-or-judgment", "satisfied");
const a3ObservedValidationChild = a3ObservedValidationFixture.childRecords.find((child) => child.fields.child_id === "A3-stripe-source-applicability-read-or-judgment").fields;
const a3ObservedValidationFields = a3ObservedValidationFixture.a3ObservedResultRecords[0].fields;
const a3ObservedValidationOwnerApproval = a3ObservedValidationFixture.a3ManualReadOwnerApprovalRecords[0];
const a3ObservedValidationA0Child = a3ObservedValidationFixture.childRecords.find((child) => child.fields.child_id === "A0-provisional-cost-model-input").fields;
const a3RehashedOperationDriftChild = { ...a3ObservedValidationChild, requested_operation: "rehashed-foreign-a3-operation" };
a3RehashedOperationDriftChild.approval_fingerprint = deriveApprovalFingerprint(a3RehashedOperationDriftChild);
const a3RehashedOperationDriftObservedFields = { ...a3ObservedValidationFields, approval_fingerprint: a3RehashedOperationDriftChild.approval_fingerprint, a3_result_fingerprint: "pending-derived-A3-result", observed_record_fingerprint: "pending-derived-observed-record" };
a3RehashedOperationDriftObservedFields.observed_record_fingerprint = deriveA3ObservedRecordFingerprint(a3RehashedOperationDriftObservedFields);
a3RehashedOperationDriftChild.observed_record_fingerprint = a3RehashedOperationDriftObservedFields.observed_record_fingerprint;
a3RehashedOperationDriftChild.result_fingerprint = deriveA3ResultFingerprint(a3RehashedOperationDriftChild, a3RehashedOperationDriftChild.approval_fingerprint, a3RehashedOperationDriftChild.dependency_fingerprint, a3ObservedValidationOwnerApproval.fields.owner_approval_record_fingerprint);
a3RehashedOperationDriftChild.cost_model_fingerprint = a3RehashedOperationDriftChild.result_fingerprint;
a3RehashedOperationDriftObservedFields.a3_result_fingerprint = a3RehashedOperationDriftChild.result_fingerprint;
assert.throws(
  () => validateA3StripeObservedResultRecord({ fields: a3RehashedOperationDriftObservedFields }, a3RehashedOperationDriftChild, a3ObservedValidationOwnerApproval, a3ObservedValidationA0Child, { requireComplete: true }),
  /requested_operation must retain the canonical corrected A3 packet field|requested_operation must exactly match the actual A3 child/,
  "A3 must reject a rehashed child requested-operation drift"
);
const a3RehashedRunningOperationDriftChild = { ...a3RehashedOperationDriftChild, child_status: "running", result_fingerprint: "N/A", cost_model_fingerprint: "N/A", observed_record_fingerprint: "N/A" };
assert.throws(
  () => validateA3ManualReadOwnerApprovalCollection(a3RehashedRunningOperationDriftChild, [a3ObservedValidationOwnerApproval], a3ObservedValidationA0Child, []),
  /requested_operation must retain the canonical corrected A3 packet field/,
  "running A3 must reject a rehashed child requested-operation drift"
);
const a3RehashedApprovalFingerprintDriftChild = { ...a3ObservedValidationChild, cost_guard: "foreign-cost-guard" };
a3RehashedApprovalFingerprintDriftChild.approval_fingerprint = deriveApprovalFingerprint(a3RehashedApprovalFingerprintDriftChild);
const a3RehashedApprovalFingerprintDriftObservedFields = { ...a3ObservedValidationFields, approval_fingerprint: a3RehashedApprovalFingerprintDriftChild.approval_fingerprint, a3_result_fingerprint: "pending-derived-A3-result", observed_record_fingerprint: "pending-derived-observed-record" };
a3RehashedApprovalFingerprintDriftObservedFields.observed_record_fingerprint = deriveA3ObservedRecordFingerprint(a3RehashedApprovalFingerprintDriftObservedFields);
a3RehashedApprovalFingerprintDriftChild.observed_record_fingerprint = a3RehashedApprovalFingerprintDriftObservedFields.observed_record_fingerprint;
a3RehashedApprovalFingerprintDriftChild.result_fingerprint = deriveA3ResultFingerprint(a3RehashedApprovalFingerprintDriftChild, a3RehashedApprovalFingerprintDriftChild.approval_fingerprint, a3RehashedApprovalFingerprintDriftChild.dependency_fingerprint, a3ObservedValidationOwnerApproval.fields.owner_approval_record_fingerprint);
a3RehashedApprovalFingerprintDriftChild.cost_model_fingerprint = a3RehashedApprovalFingerprintDriftChild.result_fingerprint;
a3RehashedApprovalFingerprintDriftObservedFields.a3_result_fingerprint = a3RehashedApprovalFingerprintDriftChild.result_fingerprint;
assert.throws(
  () => validateA3ManualReadOwnerApprovalCollection({ ...a3RehashedApprovalFingerprintDriftChild, child_status: "running", result_fingerprint: "N/A", cost_model_fingerprint: "N/A", observed_record_fingerprint: "N/A" }, [a3ObservedValidationOwnerApproval], a3ObservedValidationA0Child, []),
  /approval_fingerprint must exactly match the actual A3 child/,
  "running A3 must reject a rehashed child approval-fingerprint drift"
);
assert.throws(
  () => validateA3StripeObservedResultRecord({ fields: a3RehashedApprovalFingerprintDriftObservedFields }, a3RehashedApprovalFingerprintDriftChild, a3ObservedValidationOwnerApproval, a3ObservedValidationA0Child, { requireComplete: true }),
  /approval_fingerprint must exactly match the actual A3 child/,
  "terminal A3 must reject a rehashed child approval-fingerprint drift"
);
const a3OwnerApprovalValidationFence = `\`\`\`text\n${a3ManualReadOwnerApprovalRecordFields.map((field) => `${field}=${a3ObservedValidationOwnerApproval.fields[field]}`).join("\n")}\n\`\`\``;
const parsedA3OwnerApprovalValidationRecord = parseA3ManualReadOwnerApprovalRecord(a3OwnerApprovalValidationFence);
assert.deepEqual(parsedA3OwnerApprovalValidationRecord.fields, a3ObservedValidationOwnerApproval.fields, "A3 owner approval parser must retain the exact closed sanitized record");
const syntheticA3OwnerRawUrl = ["https:", "", "private.invalid", "synthetic"].join("/");
const syntheticA3OwnerPrivateStripePattern = ["acct", "SYNTHETIC", "PRIVATE", "VALUE"].join("_");
const syntheticA3OwnerFtpUrl = ["ftp:", "", "private.invalid", "synthetic"].join("/");
const syntheticA3OwnerPaymentMethodPattern = ["pm", "SYNTHETIC", "PRIVATE", "VALUE"].join("_");
assert.throws(() => parseA3ManualReadOwnerApprovalRecord(a3OwnerApprovalValidationFence.replace("verification_scope=", `verification_scope=${syntheticA3OwnerRawUrl}`)), /URL scheme|private Stripe ID|raw payload/, "A3 owner approval parser must reject a raw URL");
assert.throws(() => parseA3ManualReadOwnerApprovalRecord(a3OwnerApprovalValidationFence.replace("verification_scope=", `verification_scope=${syntheticA3OwnerPrivateStripePattern}`)), /private Stripe ID/, "A3 owner approval parser must reject a private Stripe-pattern ID");
assert.throws(() => parseA3ManualReadOwnerApprovalRecord(a3OwnerApprovalValidationFence.replace("verification_scope=", `verification_scope=${syntheticA3OwnerFtpUrl}`)), /URL scheme/, "A3 owner approval parser must reject every URL scheme");
assert.throws(() => parseA3ManualReadOwnerApprovalRecord(a3OwnerApprovalValidationFence.replace("verification_scope=", `verification_scope=${syntheticA3OwnerPaymentMethodPattern}`)), /private Stripe ID/, "A3 owner approval parser must reject a payment-method private ID");
const syntheticA3OwnerSingleCharacterScheme = ["x:", "", "private.invalid", "synthetic"].join("/");
const syntheticA3OwnerEmbeddedScheme = ["safe-prefix_x:", "", "private.invalid", "synthetic"].join("/");
assert.throws(() => parseA3ManualReadOwnerApprovalRecord(a3OwnerApprovalValidationFence.replace("verification_scope=", `verification_scope=${syntheticA3OwnerSingleCharacterScheme}`)), /URL scheme/, "A3 owner approval parser must reject a one-character URL scheme");
assert.throws(() => parseA3ManualReadOwnerApprovalRecord(a3OwnerApprovalValidationFence.replace("verification_scope=", `verification_scope=${syntheticA3OwnerEmbeddedScheme}`)), /URL scheme/, "A3 owner approval parser must reject an embedded URL scheme");
assert.throws(() => parseA3ManualReadOwnerApprovalRecord(a3OwnerApprovalValidationFence.replace("verification_scope=", "verification_scope=browser-query-log")), /browser, query, log, config, or migration material/, "A3 owner approval parser must reject browser or query material");
assert.throws(() => parseA3ManualReadOwnerApprovalRecord(a3OwnerApprovalValidationFence.replace("codex_browser_or_stripe_control=none", "codex_browser_or_stripe_control=approved")), /must deny payment, refund, API, export, credential, browser, Stripe, public-pricing, and incremental-charge authority/, "A3 owner approval parser must reject positive browser or Stripe authority");
assert.throws(() => parseA3ManualReadOwnerApprovalRecord(a3OwnerApprovalValidationFence.replace("record_status=", "record_status =")), /whitespace or malformed/, "A3 owner approval parser must reject malformed whitespace");
assert.throws(() => parseA3ManualReadOwnerApprovalRecord(`${a3OwnerApprovalValidationFence}\n\`\`\`text\nrecord_status=approved\n\`\`\``), /one fenced text block|content outside/, "A3 owner approval parser must reject a second fence");
assert.doesNotThrow(() => validateA3ManualReadOwnerApprovalCollection({ ...a3ObservedValidationChild, child_status: "running" }, [parsedA3OwnerApprovalValidationRecord], a3ObservedValidationA0Child, []), "running A3 requires exactly one independent owner approval and no observed result");
assert.throws(() => validateA3ManualReadOwnerApprovalCollection({ ...a3ObservedValidationChild, child_status: "running" }, [], a3ObservedValidationA0Child, []), /exactly one independent A3 owner approval record/, "running A3 must reject a missing owner approval");
assert.throws(() => validateA3ManualReadOwnerApprovalCollection({ ...a3ObservedValidationChild, child_status: "running" }, [parsedA3OwnerApprovalValidationRecord, parsedA3OwnerApprovalValidationRecord], a3ObservedValidationA0Child, []), /exactly one independent A3 owner approval record/, "running A3 must reject duplicate owner approvals");
const a3ForeignOwnerApprovalFields = { ...a3ObservedValidationOwnerApproval.fields, approval_id: "NC-R1-A3-FOREIGN" };
a3ForeignOwnerApprovalFields.owner_approval_record_fingerprint = deriveA3ManualReadOwnerApprovalRecordFingerprint(a3ForeignOwnerApprovalFields);
assert.throws(() => validateA3ManualReadOwnerApprovalCollection({ ...a3ObservedValidationChild, child_status: "running" }, [{ fields: a3ForeignOwnerApprovalFields }], a3ObservedValidationA0Child, []), /exact corrected packet field/, "A3 must reject a foreign owner approval even when it is rehashed");
const a3ForgedA0Child = { ...a3ObservedValidationA0Child, cost_model_input_fingerprint: fixtureFingerprint("forged-a0-input-for-a3") };
const a3ForgedA0OwnerApproval = { ...a3ObservedValidationOwnerApproval.fields, bound_a0_cost_model_input_fingerprint: a3ForgedA0Child.cost_model_input_fingerprint };
a3ForgedA0OwnerApproval.owner_approval_record_fingerprint = deriveA3ManualReadOwnerApprovalRecordFingerprint(a3ForgedA0OwnerApproval);
const a3ForgedA0ObservedFields = { ...a3ObservedValidationFields, bound_a0_cost_model_input_fingerprint: a3ForgedA0Child.cost_model_input_fingerprint, owner_approval_record_fingerprint: a3ForgedA0OwnerApproval.owner_approval_record_fingerprint };
a3ForgedA0ObservedFields.observed_record_fingerprint = deriveA3ObservedRecordFingerprint(a3ForgedA0ObservedFields);
const a3ForgedA0ResultChild = { ...a3ObservedValidationChild, dependency_fingerprint: a3ForgedA0Child.cost_model_input_fingerprint, owner_approval_record_fingerprint: a3ForgedA0OwnerApproval.owner_approval_record_fingerprint, observed_record_fingerprint: a3ForgedA0ObservedFields.observed_record_fingerprint };
a3ForgedA0ResultChild.result_fingerprint = deriveA3ResultFingerprint(a3ForgedA0ResultChild, a3ForgedA0ResultChild.approval_fingerprint, a3ForgedA0ResultChild.dependency_fingerprint, a3ForgedA0OwnerApproval.owner_approval_record_fingerprint);
a3ForgedA0ResultChild.cost_model_fingerprint = a3ForgedA0ResultChild.result_fingerprint;
a3ForgedA0ObservedFields.a3_result_fingerprint = a3ForgedA0ResultChild.result_fingerprint;
assert.throws(
  () => validateA3ManualReadOwnerApprovalCollection(a3ForgedA0ResultChild, [{ fields: a3ForgedA0OwnerApproval }], a3ForgedA0Child, [{ fields: a3ForgedA0ObservedFields }]),
  /A0.*fingerprint|deterministic/i,
  "A3 must reject a forged A0 child even when owner and observed downstream fingerprints are recomputed"
);
const a3ObservedValidationMarkdown = `## Completed A3 Stripe Account-Pricing Document Sanitized Result\n\n\`\`\`text\n${a3StripeObservedResultRecordFields.map((field) => `${field}=${a3ObservedValidationFields[field]}`).join("\n")}\n\`\`\`\n`;
const parsedA3ObservedValidationRecord = parseA3StripeObservedResultRecord(a3ObservedValidationMarkdown);
assert.deepEqual(parsedA3ObservedValidationRecord.fields, a3ObservedValidationFields, "A3 observed result parser must retain the exact closed sanitized record");
const syntheticA3ObservedFtpUrl = ["ftp:", "", "private.invalid", "synthetic"].join("/");
const syntheticA3ObservedPaymentMethodPattern = ["pm", "SYNTHETIC", "PRIVATE", "VALUE"].join("_");
assert.throws(() => parseA3StripeObservedResultRecord(a3ObservedValidationMarkdown.replace("requested_operation=", `requested_operation=${syntheticA3ObservedFtpUrl}`)), /URL scheme/, "A3 observed result parser must reject every URL scheme");
assert.throws(() => parseA3StripeObservedResultRecord(a3ObservedValidationMarkdown.replace("requested_operation=", `requested_operation=${syntheticA3ObservedPaymentMethodPattern}`)), /private Stripe ID/, "A3 observed result parser must reject a payment-method private ID");
assert.throws(() => parseA3StripeObservedResultRecord(a3ObservedValidationMarkdown.replace("payment_refund_client_or_event_settings_api_export_action=none", "payment_refund_client_or_event_settings_api_export_action=performed")), /must deny payment, refund, API, export, credential, browser, Stripe, public-pricing, and incremental-charge authority/, "A3 observed result parser must reject positive payment, refund, API, or export authority");
assert.throws(
  () => validateA3StripeObservedResultRecord({ fields: { ...a3ObservedValidationFields, owner_approval_record_fingerprint: fixtureFingerprint("a3-owner-result-mismatch") } }, a3ObservedValidationChild, a3ObservedValidationOwnerApproval, a3ObservedValidationA0Child, { requireComplete: true }),
  /separate owner approval record fingerprint/,
  "A3 observed result cannot self-authorize with an unrelated owner approval fingerprint"
);
assert.throws(
  () => parseA3StripeObservedResultRecord(a3ObservedValidationMarkdown.replace("record_status=", "raw_payload = SYNTHETIC_PRIVATE_VALUE\nrecord_status=")),
  /whitespace or malformed/
);
const syntheticA3RawUrl = ["https:", "", "private.invalid", "synthetic"].join("/");
assert.throws(
  () => parseA3StripeObservedResultRecord(`${a3ObservedValidationMarkdown.trimEnd()}\n${syntheticA3RawUrl}\n`),
  /content outside/
);
assert.doesNotThrow(() => validateA3StripeObservedResultRecord(parsedA3ObservedValidationRecord, a3ObservedValidationChild, a3ObservedValidationOwnerApproval, a3ObservedValidationA0Child, { requireComplete: true }));
assert.doesNotThrow(() => validateA3ManualReadOwnerApprovalCollection(a3ObservedValidationChild, [a3ObservedValidationOwnerApproval], a3ObservedValidationA0Child, [parsedA3ObservedValidationRecord]), "only satisfied A3 may retain the complete EVID-STRIPE-COST closure result");
const a3InvalidCalendarChild = {
  ...a3ObservedValidationChild,
  time_window: "2026-08-09T23:00:00+09:00/2026-08-09T24:00:00+09:00",
  source_timestamp: "2026-08-09T24:00:00+09:00"
};
const a3InvalidCalendarFields = {
  ...a3ObservedValidationFields,
  time_window: a3InvalidCalendarChild.time_window,
  observed_at: a3InvalidCalendarChild.source_timestamp,
  a3_result_fingerprint: "pending-derived-A3-result",
  observed_record_fingerprint: "pending-derived-observed-record"
};
a3InvalidCalendarFields.observed_record_fingerprint = deriveA3ObservedRecordFingerprint(a3InvalidCalendarFields);
a3InvalidCalendarChild.observed_record_fingerprint = a3InvalidCalendarFields.observed_record_fingerprint;
a3InvalidCalendarChild.result_fingerprint = deriveA3ResultFingerprint(a3InvalidCalendarChild, a3InvalidCalendarChild.approval_fingerprint, a3InvalidCalendarChild.dependency_fingerprint, a3ObservedValidationOwnerApproval.fields.owner_approval_record_fingerprint);
a3InvalidCalendarChild.cost_model_fingerprint = a3InvalidCalendarChild.result_fingerprint;
a3InvalidCalendarFields.a3_result_fingerprint = a3InvalidCalendarChild.result_fingerprint;
assert.throws(
  () => validateA3StripeObservedResultRecord({ fields: a3InvalidCalendarFields }, a3InvalidCalendarChild, a3ObservedValidationOwnerApproval, a3ObservedValidationA0Child, { requireComplete: true }),
  /time_window must retain the canonical corrected A3 packet field|time_window must exactly match|strict RFC3339 Asia\/Tokyo calendar timestamp/
);
for (const [overrides, expectedError] of [
  [{ unexpected_private_field: "none" }, /exact closed schema/],
  [{ requested_operation: "foreign-a3-operation" }, /requested_operation must exactly match the approved A3 child/],
  [{ approval_id: "NC-R1-A3-MISMATCH" }, /approval_id must exactly match/],
  [{ approval_fingerprint: "not-a-sha256-fingerprint" }, /approval_fingerprint must be a deterministic sanitized fingerprint/],
  [{ bound_a0_cost_model_input_fingerprint: fixtureFingerprint("a0-mismatch") }, /exact A0 input fingerprint/],
  [{ observed_at: "2026-08-08T15:15:00Z" }, /strict RFC3339 Asia\/Tokyo calendar timestamp/],
  [{ observed_at: "2026-08-09T02:00:00+09:00" }, /must not precede|must not follow the approved time window/],
  [{ source_document_available: "unavailable" }, /complete status requires every exact applicability/],
  [{ account_specific_pricing_terms_coverage: "incomplete" }, /complete status requires every exact applicability/],
  [{ private_exposure_detected: "yes" }, /complete status requires every exact applicability/],
  [{ incremental_charge_required: "yes" }, /complete status requires every exact applicability/],
  [{ base_processing_fee_coverage: "incomplete" }, /complete status requires every exact applicability/],
  [{ raw_document_contract_text_url_account_identifier_private_identifier_retained_or_shared: "yes" }, /must retain no raw or private material/],
  [{ payment_refund_client_or_event_settings_api_export_action: "performed" }, /must record no Stripe side effect|must deny payment, refund, API, export, credential, browser, Stripe, public-pricing, and incremental-charge authority/],
  [{ credential_creation_retrieval_disclosure: "performed" }, /must record no credential action|must deny payment, refund, API, export, credential, browser, Stripe, public-pricing, and incremental-charge authority/],
  [{ codex_browser_or_stripe_control: "approved" }, /must give Codex no browser or Stripe control|must deny payment, refund, API, export, credential, browser, Stripe, public-pricing, and incremental-charge authority/],
  [{ public_pricing_substitution: "yes" }, /must not substitute public pricing|must deny payment, refund, API, export, credential, browser, Stripe, public-pricing, and incremental-charge authority/],
  [{ incremental_charge: "yes" }, /must record no incremental charge|must deny payment, refund, API, export, credential, browser, Stripe, public-pricing, and incremental-charge authority/],
  [{ row_closure: "none" }, /closes only EVID-STRIPE-COST/],
  [{ observed_record_fingerprint: fixtureFingerprint("observed-record-mismatch") }, /deterministically derived/],
  [{ a3_result_fingerprint: fixtureFingerprint("a3-result-mismatch") }, /exact A3 result fingerprint/]
]) {
  assert.throws(
    () => validateA3StripeObservedResultRecord({ fields: { ...a3ObservedValidationFields, ...overrides } }, a3ObservedValidationChild, a3ObservedValidationOwnerApproval, a3ObservedValidationA0Child, { requireComplete: true }),
    expectedError
  );
}
const a3PartialObservedFields = {
  ...a3ObservedValidationFields,
  record_status: "approved-partial-stop-authenticated-private-read",
  source_document_available: "unavailable",
  stop_result: "source-document-unavailable",
  result_status: "partial-stop",
  row_closure: "none",
  a3_result_fingerprint: "pending-derived-A3-result",
  observed_record_fingerprint: "pending-derived-observed-record"
};
a3PartialObservedFields.observed_record_fingerprint = deriveA3ObservedRecordFingerprint(a3PartialObservedFields);
const a3PartialObservedChild = { ...a3ObservedValidationChild, observed_record_fingerprint: a3PartialObservedFields.observed_record_fingerprint };
a3PartialObservedChild.result_fingerprint = deriveA3ResultFingerprint(a3PartialObservedChild, a3PartialObservedChild.approval_fingerprint, a3PartialObservedChild.dependency_fingerprint, a3ObservedValidationOwnerApproval.fields.owner_approval_record_fingerprint);
a3PartialObservedChild.cost_model_fingerprint = a3PartialObservedChild.result_fingerprint;
a3PartialObservedFields.a3_result_fingerprint = a3PartialObservedChild.result_fingerprint;
assert.doesNotThrow(() => validateA3StripeObservedResultRecord({ fields: a3PartialObservedFields }, a3PartialObservedChild, a3ObservedValidationOwnerApproval, a3ObservedValidationA0Child));
assert.equal(a3PartialObservedFields.stop_result, deriveA3CanonicalPartialStopResult(a3PartialObservedFields), "A3 partial-stop must keep the exact canonical source, fee, applicability, terms, and coverage reason order");
assert.throws(() => validateA3StripeObservedResultRecord({ fields: { ...a3PartialObservedFields, stop_result: "source-document-unconfirmed" } }, a3PartialObservedChild, a3ObservedValidationOwnerApproval, a3ObservedValidationA0Child), /exact canonical truthful stop result/, "A3 partial-stop must reject a mismatched canonical reason");
assert.throws(() => validateA3StripeObservedResultRecord({ fields: { ...a3PartialObservedFields, stop_result: "deploy-authorized" } }, a3PartialObservedChild, a3ObservedValidationOwnerApproval, a3ObservedValidationA0Child), /must not contain deployment, activation, charge, permission, or authority aliases/, "A3 partial-stop must reject deployment or authorization aliases");
assert.throws(() => validateA3StripeObservedResultRecord({ fields: a3PartialObservedFields }, a3PartialObservedChild, a3ObservedValidationOwnerApproval, a3ObservedValidationA0Child, { requireComplete: true }), /requires a complete observed result/);
const a3NonclosingPartialChild = { ...a3PartialObservedChild, child_status: "complete-not-closure-eligible" };
assert.doesNotThrow(() => validateA3ManualReadOwnerApprovalCollection(a3NonclosingPartialChild, [a3ObservedValidationOwnerApproval], a3ObservedValidationA0Child, [{ fields: a3PartialObservedFields }]), "A3 complete-not-closure-eligible must accept exactly one nonclosing partial-stop observed result");
assert.throws(() => validateA3ManualReadOwnerApprovalCollection({ ...a3ObservedValidationChild, child_status: "complete-not-closure-eligible" }, [a3ObservedValidationOwnerApproval], a3ObservedValidationA0Child, [{ fields: a3ObservedValidationFields }]), /requires a nonclosing partial-stop observed result/, "A3 complete-not-closure-eligible must reject a complete EVID-STRIPE-COST closure");
const a3PartialStopLifecycleChild = { ...a3PartialObservedChild, child_status: "partial-stop" };
assert.doesNotThrow(() => validateA3ManualReadOwnerApprovalCollection(a3PartialStopLifecycleChild, [a3ObservedValidationOwnerApproval], a3ObservedValidationA0Child, [{ fields: a3PartialObservedFields }]), "A3 partial-stop child must accept its exact nonclosing partial-stop observed result");
assert.throws(() => validateA3ManualReadOwnerApprovalCollection({ ...a3ObservedValidationChild, child_status: "partial-stop" }, [a3ObservedValidationOwnerApproval], a3ObservedValidationA0Child, [{ fields: a3ObservedValidationFields }]), /partial-stop lifecycle requires a nonclosing partial-stop observed result/, "A3 partial-stop child must reject a complete EVID-STRIPE-COST closure");
assert.throws(() => validateA3ManualReadOwnerApprovalCollection(a3PartialStopLifecycleChild, [a3ObservedValidationOwnerApproval], a3ObservedValidationA0Child, [{ fields: { ...a3PartialObservedFields, row_closure: "EVID-STRIPE-COST" } }]), /partial-stop closes no row/, "A3 partial-stop child must reject any EVID-STRIPE-COST closure");
assert.equal(deriveA3CanonicalPartialStopResult({ ...a3PartialObservedFields, private_exposure_detected: "yes" }), "source-document-unavailable--private-exposure-detected-yes", "A3 private exposure must contribute its exact safe canonical partial-stop reason");
const a3PrivateExposurePartialFields = {
  ...a3ObservedValidationFields,
  record_status: "approved-partial-stop-authenticated-private-read",
  private_exposure_detected: "yes",
  stop_result: "private-exposure-detected-yes",
  result_status: "partial-stop",
  row_closure: "none",
  a3_result_fingerprint: "pending-derived-A3-result",
  observed_record_fingerprint: "pending-derived-observed-record"
};
a3PrivateExposurePartialFields.observed_record_fingerprint = deriveA3ObservedRecordFingerprint(a3PrivateExposurePartialFields);
const a3PrivateExposurePartialChild = { ...a3ObservedValidationChild, child_status: "partial-stop", observed_record_fingerprint: a3PrivateExposurePartialFields.observed_record_fingerprint };
a3PrivateExposurePartialChild.result_fingerprint = deriveA3ResultFingerprint(a3PrivateExposurePartialChild, a3PrivateExposurePartialChild.approval_fingerprint, a3PrivateExposurePartialChild.dependency_fingerprint, a3ObservedValidationOwnerApproval.fields.owner_approval_record_fingerprint);
a3PrivateExposurePartialChild.cost_model_fingerprint = a3PrivateExposurePartialChild.result_fingerprint;
a3PrivateExposurePartialFields.a3_result_fingerprint = a3PrivateExposurePartialChild.result_fingerprint;
assert.doesNotThrow(() => validateA3ManualReadOwnerApprovalCollection(a3PrivateExposurePartialChild, [a3ObservedValidationOwnerApproval], a3ObservedValidationA0Child, [{ fields: a3PrivateExposurePartialFields }]), "A3 private exposure must remain a sanitized nonclosing partial-stop without retaining private material");
assert.throws(() => validateA3StripeObservedResultRecord({ fields: { ...a3PrivateExposurePartialFields, stop_result: "private-exposure-detected-unknown" } }, a3PrivateExposurePartialChild, a3ObservedValidationOwnerApproval, a3ObservedValidationA0Child), /exact canonical truthful stop result/, "A3 private exposure partial-stop must reject a mismatched safe reason");
const a3IncrementalChargeRequiredPartialFields = {
  ...a3ObservedValidationFields,
  record_status: "approved-partial-stop-authenticated-private-read",
  incremental_charge_required: "yes",
  stop_result: "incremental-charge-required-yes",
  result_status: "partial-stop",
  row_closure: "none",
  a3_result_fingerprint: "pending-derived-A3-result",
  observed_record_fingerprint: "pending-derived-observed-record"
};
a3IncrementalChargeRequiredPartialFields.observed_record_fingerprint = deriveA3ObservedRecordFingerprint(a3IncrementalChargeRequiredPartialFields);
const a3IncrementalChargeRequiredPartialChild = { ...a3ObservedValidationChild, child_status: "partial-stop", observed_record_fingerprint: a3IncrementalChargeRequiredPartialFields.observed_record_fingerprint };
a3IncrementalChargeRequiredPartialChild.result_fingerprint = deriveA3ResultFingerprint(a3IncrementalChargeRequiredPartialChild, a3IncrementalChargeRequiredPartialChild.approval_fingerprint, a3IncrementalChargeRequiredPartialChild.dependency_fingerprint, a3ObservedValidationOwnerApproval.fields.owner_approval_record_fingerprint);
a3IncrementalChargeRequiredPartialChild.cost_model_fingerprint = a3IncrementalChargeRequiredPartialChild.result_fingerprint;
a3IncrementalChargeRequiredPartialFields.a3_result_fingerprint = a3IncrementalChargeRequiredPartialChild.result_fingerprint;
assert.doesNotThrow(() => validateA3ManualReadOwnerApprovalCollection(a3IncrementalChargeRequiredPartialChild, [a3ObservedValidationOwnerApproval], a3ObservedValidationA0Child, [{ fields: a3IncrementalChargeRequiredPartialFields }]), "A3 incremental-charge-required signal must remain a sanitized nonauthorizing partial-stop");
assert.throws(() => validateA3StripeObservedResultRecord({ fields: { ...a3IncrementalChargeRequiredPartialFields, stop_result: "incremental-charge-required-unknown" } }, a3IncrementalChargeRequiredPartialChild, a3ObservedValidationOwnerApproval, a3ObservedValidationA0Child), /exact canonical truthful stop result/, "A3 incremental-charge-required partial-stop must reject a mismatched safe reason");
assert.throws(() => validateA3StripeObservedResultRecord({ fields: { ...a3IncrementalChargeRequiredPartialFields, stop_result: "incremental-charge-authorized" } }, a3IncrementalChargeRequiredPartialChild, a3ObservedValidationOwnerApproval, a3ObservedValidationA0Child), /must not contain deployment, activation, charge, permission, or authority aliases/, "A3 incremental-charge-required must not authorize a charge");
const a4A3ObservedDriftFixture = parsedFingerprintGraphFixture("A4-product-price-judgment", "satisfied");
const a4A3ObservedDriftRecord = a4A3ObservedDriftFixture.a3ObservedResultRecords[0].fields;
const a4A3ObservedDriftChild = a4A3ObservedDriftFixture.childRecords.find((child) => child.fields.child_id === "A3-stripe-source-applicability-read-or-judgment").fields;
a4A3ObservedDriftRecord.account_specific_pricing_terms_fingerprint = fixtureFingerprint("a3-account-specific-pricing-terms-drift");
a4A3ObservedDriftRecord.observed_record_fingerprint = deriveA3ObservedRecordFingerprint(a4A3ObservedDriftRecord);
a4A3ObservedDriftChild.observed_record_fingerprint = a4A3ObservedDriftRecord.observed_record_fingerprint;
a4A3ObservedDriftChild.result_fingerprint = deriveA3ResultFingerprint(a4A3ObservedDriftChild, a4A3ObservedDriftChild.approval_fingerprint, a4A3ObservedDriftChild.dependency_fingerprint, a4A3ObservedDriftFixture.a3ManualReadOwnerApprovalRecords[0].fields.owner_approval_record_fingerprint);
a4A3ObservedDriftChild.cost_model_fingerprint = a4A3ObservedDriftChild.result_fingerprint;
a4A3ObservedDriftRecord.a3_result_fingerprint = a4A3ObservedDriftChild.result_fingerprint;
assert.throws(
  () => validateStagedLedgerCrossValidation(
    a4A3ObservedDriftFixture.rowRecords,
    a4A3ObservedDriftFixture.childRecords,
    a4A3ObservedDriftFixture.ledger,
    a4A3ObservedDriftFixture.signedEvidenceRecords,
    a4A3ObservedDriftFixture.b2ScenarioResultRecords,
    a4A3ObservedDriftFixture.a3ObservedResultRecords,
    a4A3ObservedDriftFixture.a2ObservedResultRecords,
    a4A3ObservedDriftFixture.a1ObservedResultRecords,
    a4A3ObservedDriftFixture.a4JudgmentResultRecords,
    a4A3ObservedDriftFixture.a5LegalJudgmentResultRecords
  ),
  /fingerprint/,
  "A3 account-specific terms-fingerprint drift must invalidate the bound A4 result graph"
);
const a4A3CoverageDriftFixture = parsedFingerprintGraphFixture("A4-product-price-judgment", "satisfied");
const a4A3CoverageDriftRecord = a4A3CoverageDriftFixture.a3ObservedResultRecords[0].fields;
const a4A3CoverageDriftChild = a4A3CoverageDriftFixture.childRecords.find((child) => child.fields.child_id === "A3-stripe-source-applicability-read-or-judgment").fields;
a4A3CoverageDriftRecord.effective_scope_coverage = "incomplete";
a4A3CoverageDriftRecord.record_status = "approved-partial-stop-authenticated-private-read";
a4A3CoverageDriftRecord.result_status = "partial-stop";
a4A3CoverageDriftRecord.stop_result = "effective-scope-coverage-incomplete";
a4A3CoverageDriftRecord.row_closure = "none";
a4A3CoverageDriftRecord.observed_record_fingerprint = deriveA3ObservedRecordFingerprint(a4A3CoverageDriftRecord);
a4A3CoverageDriftChild.observed_record_fingerprint = a4A3CoverageDriftRecord.observed_record_fingerprint;
a4A3CoverageDriftChild.result_fingerprint = deriveA3ResultFingerprint(a4A3CoverageDriftChild, a4A3CoverageDriftChild.approval_fingerprint, a4A3CoverageDriftChild.dependency_fingerprint, a4A3CoverageDriftFixture.a3ManualReadOwnerApprovalRecords[0].fields.owner_approval_record_fingerprint);
a4A3CoverageDriftChild.cost_model_fingerprint = a4A3CoverageDriftChild.result_fingerprint;
a4A3CoverageDriftRecord.a3_result_fingerprint = a4A3CoverageDriftChild.result_fingerprint;
assert.throws(
  () => validateStagedLedgerCrossValidation(
    a4A3CoverageDriftFixture.rowRecords,
    a4A3CoverageDriftFixture.childRecords,
    a4A3CoverageDriftFixture.ledger,
    a4A3CoverageDriftFixture.signedEvidenceRecords,
    a4A3CoverageDriftFixture.b2ScenarioResultRecords,
    a4A3CoverageDriftFixture.a3ObservedResultRecords,
    a4A3CoverageDriftFixture.a2ObservedResultRecords,
    a4A3CoverageDriftFixture.a1ObservedResultRecords,
    a4A3CoverageDriftFixture.a4JudgmentResultRecords,
    a4A3CoverageDriftFixture.a5LegalJudgmentResultRecords
  ),
  /complete observed|fingerprint/,
  "A3 incomplete coverage must remain a partial stop and invalidate the bound A4 result graph"
);
for (const downstreamChildId of ["A2-provider-cost-evidence-read", "A3-stripe-source-applicability-read-or-judgment", "A4-product-price-judgment", "A5-legal-judgment", "A6-copy-judgment", "B1-deployed-target-proof", "B2-live-paid-flow-evidence"]) {
  for (const childStatus of ["running", "satisfied"]) {
    const fixture = parsedFingerprintGraphFixture(downstreamChildId, childStatus);
    if (downstreamChildId === "A3-stripe-source-applicability-read-or-judgment" && childStatus === "running") {
      assert.throws(
        () => validateStagedLedgerCrossValidation(fixture.rowRecords, fixture.childRecords, fixture.ledger, fixture.signedEvidenceRecords, fixture.b2ScenarioResultRecords, fixture.a3ObservedResultRecords, fixture.a2ObservedResultRecords, fixture.a1ObservedResultRecords, fixture.a4JudgmentResultRecords, fixture.a5LegalJudgmentResultRecords, fixture.a6CopyJudgmentResultRecords),
        /approved-not-started or running A3 requires no observed result record/,
        "running A3 must reject an observed result before its terminal state"
      );
      continue;
    }
    assert.doesNotThrow(() => validateStagedLedgerCrossValidation(fixture.rowRecords, fixture.childRecords, fixture.ledger, fixture.signedEvidenceRecords, fixture.b2ScenarioResultRecords, fixture.a3ObservedResultRecords, fixture.a2ObservedResultRecords, fixture.a1ObservedResultRecords, fixture.a4JudgmentResultRecords, fixture.a5LegalJudgmentResultRecords, fixture.a6CopyJudgmentResultRecords), `${downstreamChildId} ${childStatus} must accept a complete parsed fingerprint graph`);
    fixture.childRecords.find((child) => child.fields.child_id === "A0-provisional-cost-model-input").fields.cost_model_input_fingerprint = fixtureFingerprint("a0-input-mutated");
    assert.throws(() => validateStagedLedgerCrossValidation(fixture.rowRecords, fixture.childRecords, fixture.ledger, fixture.signedEvidenceRecords, fixture.b2ScenarioResultRecords, fixture.a3ObservedResultRecords, fixture.a2ObservedResultRecords, fixture.a1ObservedResultRecords, fixture.a4JudgmentResultRecords, fixture.a5LegalJudgmentResultRecords, fixture.a6CopyJudgmentResultRecords), /fingerprint/, `${downstreamChildId} ${childStatus} must reject a material upstream fingerprint mutation`);
  }
}
const b2RunningSignedTimestampFixture = parsedFingerprintGraphFixture("B2-live-paid-flow-evidence", "running");
const b2RunningSignedTimestampRecord = { ...b2RunningSignedTimestampFixture.signedEvidenceRecords[0], source_timestamp: "2026-08-09T02:20:00Z" };
b2RunningSignedTimestampRecord.fingerprint = deriveSignedEvidenceFingerprint(b2RunningSignedTimestampRecord);
const b2RunningSignedTimestampFields = b2RunningSignedTimestampFixture.childRecords.find((child) => child.fields.child_id === "B2-live-paid-flow-evidence").fields;
b2RunningSignedTimestampFields.signed_evidence_fingerprint = b2RunningSignedTimestampRecord.fingerprint;
b2RunningSignedTimestampFields.result_fingerprint = "N/A";
b2RunningSignedTimestampFields.approval_fingerprint = deriveApprovalFingerprint(b2RunningSignedTimestampFields);
assert.throws(() => validateStagedLedgerCrossValidation(
  b2RunningSignedTimestampFixture.rowRecords,
  b2RunningSignedTimestampFixture.childRecords,
  b2RunningSignedTimestampFixture.ledger,
  [b2RunningSignedTimestampRecord],
  b2RunningSignedTimestampFixture.b2ScenarioResultRecords,
  b2RunningSignedTimestampFixture.a3ObservedResultRecords,
  b2RunningSignedTimestampFixture.a2ObservedResultRecords,
  b2RunningSignedTimestampFixture.a1ObservedResultRecords,
  b2RunningSignedTimestampFixture.a4JudgmentResultRecords,
  b2RunningSignedTimestampFixture.a5LegalJudgmentResultRecords,
  b2RunningSignedTimestampFixture.a6CopyJudgmentResultRecords
), /signed_evidence_source_timestamp|exact operation window/, "B2 running must bind the separate signed source timestamp to its exact operation window");
for (const [field, mutatedValue, expected] of [
  ["b1_deployed_target_binding", "sanitized-b1-target-mutated", /B1 target/],
  ["b1_deployed_commit_binding", "sanitized-b1-commit-mutated", /B1 commit/],
  ["b1_deployed_fingerprint", fixtureFingerprint("b1-running-mutated"), /B1 fingerprint/],
  ["signed_evidence_record_id", "NC-R1-FUTURE-B2-SIGNED-MISSING", /signed evidence record/],
  ["signed_evidence_source", "signed-source-mutated", /signed_evidence_source/],
  ["signed_evidence_fingerprint", fixtureFingerprint("signed-running-mutated"), /signed_evidence_fingerprint/]
]) {
  const fixture = parsedFingerprintGraphFixture("B2-live-paid-flow-evidence", "running");
  const fields = fixture.childRecords.find((child) => child.fields.child_id === "B2-live-paid-flow-evidence").fields;
  fields[field] = mutatedValue;
  fields.approval_fingerprint = deriveApprovalFingerprint(fields);
  assert.throws(
    () => validateStagedLedgerCrossValidation(fixture.rowRecords, fixture.childRecords, fixture.ledger, fixture.signedEvidenceRecords, fixture.b2ScenarioResultRecords, fixture.a3ObservedResultRecords, fixture.a2ObservedResultRecords, fixture.a1ObservedResultRecords, fixture.a4JudgmentResultRecords, fixture.a5LegalJudgmentResultRecords, fixture.a6CopyJudgmentResultRecords),
    expected,
    `B2 running preflight must reject rehashed ${field} drift before any live operation`
  );
}
const b2TerminalRegistryFixture = parsedFingerprintGraphFixture("B2-live-paid-flow-evidence", "satisfied");
const b2TerminalRegistryChildren = parsedStagedChildren.map((child) => child.headingId === "B2-live-paid-flow-evidence"
  ? { ...child, fields: { ...b2TerminalRegistryFixture.childRecords.find((candidate) => candidate.fields.child_id === "B2-live-paid-flow-evidence").fields } }
  : { ...child, fields: { ...child.fields } });
const b2TerminalRegistryRows = parsedStagedRows;
const b2TerminalRegistryApprovalIds = new Map(stagedChildDefinitions.map((definition) => [definition.rows, b2TerminalRegistryChildren.find((child) => child.fields.child_id === definition.id).fields.approval_id]));
assert.doesNotThrow(
  () => validateStagedChildren(b2TerminalRegistryChildren, b2TerminalRegistryRows, b2TerminalRegistryApprovalIds),
  "terminal B2 child must reach and pass the actual closed staged-child registry before cross-validation"
);
const b2TerminalRegistryUnknownFieldFixture = b2TerminalRegistryChildren.map((child) => child.fields.child_id === "B2-live-paid-flow-evidence" ? { ...child, fields: { ...child.fields, disallowed_self_claimed_outcome: "Paid" } } : child);
assert.throws(
  () => validateStagedChildren(b2TerminalRegistryUnknownFieldFixture, b2TerminalRegistryRows, b2TerminalRegistryApprovalIds),
  /rejects unknown field/,
  "terminal B2 closed registry must reject a disallowed self-claimed outcome field before cross-validation"
);
const b2ApprovalLifecycleIdentity = ["approved-not-started", "running", "partial-stop", "stale", "invalidated", "satisfied"].map((status) => {
  const fixture = parsedFingerprintGraphFixture("B2-live-paid-flow-evidence", status);
  return fixture.childRecords.find((child) => child.fields.child_id === "B2-live-paid-flow-evidence").fields.approval_fingerprint;
});
assert.equal(new Set(b2ApprovalLifecycleIdentity).size, 1, "one B2 approval ID and preapproved scope must retain one immutable approval fingerprint across lifecycle states");
const b2ApprovedNotStartedRegistryFixture = parsedFingerprintGraphFixture("B2-live-paid-flow-evidence", "approved-not-started");
const b2ApprovedNotStartedRegistryChildren = parsedStagedChildren.map((child) => child.headingId === "B2-live-paid-flow-evidence"
  ? { ...child, fields: { ...b2ApprovedNotStartedRegistryFixture.childRecords.find((candidate) => candidate.fields.child_id === "B2-live-paid-flow-evidence").fields } }
  : { ...child, fields: { ...child.fields } });
const b2ApprovedNotStartedApprovalIds = new Map(stagedChildDefinitions.map((definition) => [definition.rows, b2ApprovedNotStartedRegistryChildren.find((child) => child.fields.child_id === definition.id).fields.approval_id]));
assert.doesNotThrow(() => validateStagedChildren(b2ApprovedNotStartedRegistryChildren, parsedStagedRows, b2ApprovedNotStartedApprovalIds), "approved-not-started B2 must validate its complete approval scope before running");
for (const [field, value, expected] of [
  ["requested_operation", "deploy-activation-write", /bounded non-public operation/],
  ["target_scope_alias", "sanitized-target-alias-mutated", /target mapping/],
  ["signed_evidence_record_id", "NC-R1-FUTURE-B2-SIGNED-MUTATED", /signed-evidence binding/],
  ["signed_evidence_source", "signed-source-mutated", /signed-evidence binding/],
  ["b2_parsed_scenarios", canonicalB2ScenarioContracts.slice().reverse().map((contract) => contract.scenario_id).join(","), /canonical 19-scenario specification/]
]) {
  const children = b2ApprovedNotStartedRegistryChildren.map((child) => ({ ...child, fields: { ...child.fields } }));
  const fields = children.find((child) => child.headingId === "B2-live-paid-flow-evidence").fields;
  fields[field] = value;
  fields.approval_fingerprint = deriveApprovalFingerprint(fields);
  assert.throws(() => validateStagedChildren(children, parsedStagedRows, new Map(stagedChildDefinitions.map((definition) => [definition.rows, children.find((child) => child.headingId === definition.id).fields.approval_id]))), expected, `approved-not-started B2 must reject rehashed ${field} before running`);
}
const b2PostExecutionResultIdFixture = parsedFingerprintGraphFixture("B2-live-paid-flow-evidence", "satisfied");
const b2PostExecutionResultIdFields = b2PostExecutionResultIdFixture.childRecords.find((child) => child.fields.child_id === "B2-live-paid-flow-evidence").fields;
const b2PreapprovedFingerprint = deriveApprovalFingerprint(b2PostExecutionResultIdFields);
b2PostExecutionResultIdFields.b2_scenario_result_ids = canonicalB2ScenarioContracts.slice().reverse().map((contract) => contract.scenario_result_id).join(",");
assert.equal(deriveApprovalFingerprint(b2PostExecutionResultIdFields), b2PreapprovedFingerprint, "post-execution scenario result IDs cannot alter B2 approval authority");
assert.throws(() => validateB1ProofFixture(b2PostExecutionResultIdFixture), /scenario result ID/, "post-execution scenario result IDs remain independently bound and cannot expand terminal authority");
function b2ApprovedHistoryRegistry(status) {
  const fixture = parsedFingerprintGraphFixture("B2-live-paid-flow-evidence", status);
  const children = parsedStagedChildren.map((child) => child.headingId === "B2-live-paid-flow-evidence"
    ? { ...child, fields: { ...fixture.childRecords.find((candidate) => candidate.fields.child_id === "B2-live-paid-flow-evidence").fields } }
    : { ...child, fields: { ...child.fields } });
  const b2Fields = children.find((child) => child.headingId === "B2-live-paid-flow-evidence").fields;
  if (["partial-stop", "stale", "invalidated", "incomplete"].includes(status)) Object.assign(b2Fields, { prior_approved_or_started: "yes", stop_or_drift_cause: "target-mismatch-observed", dependent_stop_result: status === "incomplete" ? "not-applicable" : "derived-canonical-reverse-dependency-graph", b2_aggregate_record_fingerprint: "N/A", b2_scenario_result_ids: "N/A", result_fingerprint: "N/A" });
  return { children, approvalIds: new Map(stagedChildDefinitions.map((definition) => [definition.rows, children.find((child) => child.headingId === definition.id).fields.approval_id])) };
}
const b2PartialStopScopeRed = b2ApprovedHistoryRegistry("partial-stop");
const b2PartialStopScopeRedFields = b2PartialStopScopeRed.children.find((child) => child.headingId === "B2-live-paid-flow-evidence").fields;
b2PartialStopScopeRedFields.requested_operation = "deploy-activation-write";
b2PartialStopScopeRedFields.approval_fingerprint = deriveApprovalFingerprint(b2PartialStopScopeRedFields);
assert.throws(() => validateStagedChildren(b2PartialStopScopeRed.children, parsedStagedRows, b2PartialStopScopeRed.approvalIds), /bounded non-public operation/, "partial-stop B2 must retain and enforce its approved scope after rehash");
for (const [status, field, value] of [["stale", "signed_evidence_source", "signed-source-mutated"], ["invalidated", "b2_parsed_scenarios", canonicalB2ScenarioContracts.slice().reverse().map((contract) => contract.scenario_id).join(",")]]) {
  const fixture = b2ApprovedHistoryRegistry(status);
  const fields = fixture.children.find((child) => child.headingId === "B2-live-paid-flow-evidence").fields;
  fields[field] = value;
  fields.approval_fingerprint = deriveApprovalFingerprint(fields);
  assert.throws(() => validateStagedChildren(fixture.children, parsedStagedRows, fixture.approvalIds), /signed-evidence binding|canonical 19-scenario specification/, `${status} B2 must retain approved scope validation`);
}
const b2InvalidatedDowngradedApprovalRed = b2ApprovedHistoryRegistry("invalidated");
const b2InvalidatedDowngradedApprovalRedFields = b2InvalidatedDowngradedApprovalRed.children.find((child) => child.headingId === "B2-live-paid-flow-evidence").fields;
b2InvalidatedDowngradedApprovalRedFields.approval = "unapproved";
b2InvalidatedDowngradedApprovalRedFields.requested_operation = "deploy-activation-write";
b2InvalidatedDowngradedApprovalRedFields.approval_fingerprint = deriveApprovalFingerprint(b2InvalidatedDowngradedApprovalRedFields);
assert.throws(() => validateStagedChildren(b2InvalidatedDowngradedApprovalRed.children, parsedStagedRows, b2InvalidatedDowngradedApprovalRed.approvalIds), /bounded non-public operation/, "invalidated B2 with downgraded current approval must still retain its prior approved scope");
for (const [status, field, value, expected] of [
  ["stale", "signed_evidence_source", "signed-source-mutated", /signed-evidence binding/],
  ["incomplete", "requested_operation", "deploy-activation-write", /bounded non-public operation/]
]) {
  const fixture = b2ApprovedHistoryRegistry(status);
  const fields = fixture.children.find((child) => child.headingId === "B2-live-paid-flow-evidence").fields;
  fields.approval = "unapproved";
  assert.doesNotThrow(() => validateStagedChildren(fixture.children, parsedStagedRows, fixture.approvalIds), `${status} B2 may retain an unchanged prior approved scope after current approval downgrade`);
  fields[field] = value;
  fields.approval_fingerprint = deriveApprovalFingerprint(fields);
  assert.throws(() => validateStagedChildren(fixture.children, parsedStagedRows, fixture.approvalIds), expected, `${status} B2 must revalidate its historical approved scope after current approval downgrade`);
}
for (const status of ["stale", "invalidated", "incomplete"]) {
  const fixture = b2ApprovedHistoryRegistry(status);
  const fields = fixture.children.find((child) => child.headingId === "B2-live-paid-flow-evidence").fields;
  fields.b2_aggregate_record_fingerprint = fixtureFingerprint(`dangling-${status}-aggregate`);
  assert.throws(() => validateStagedChildren(fixture.children, parsedStagedRows, fixture.approvalIds), /aggregate-record fingerprint binding/, `${status} B2 must reject a dangling completed aggregate fingerprint`);
}
for (const status of ["stale", "invalidated", "incomplete"]) {
  const fixture = parsedFingerprintGraphFixture("B2-live-paid-flow-evidence", status);
  const terminalFixture = parsedFingerprintGraphFixture("B2-live-paid-flow-evidence", "satisfied");
  assert.throws(() => validateB1ProofFixture(fixture, undefined, undefined, terminalFixture.b2AggregateLiveOperationResultRecords), /aggregate live-operation result collection must be empty/, `${status} B2 must keep the aggregate record collection empty`);
  assert.throws(() => validateStagedLedgerCrossValidation(fixture.rowRecords, fixture.childRecords, fixture.ledger, fixture.signedEvidenceRecords, terminalFixture.b2ScenarioResultRecords, fixture.a3ObservedResultRecords, fixture.a2ObservedResultRecords, fixture.a1ObservedResultRecords, fixture.a4JudgmentResultRecords, fixture.a5LegalJudgmentResultRecords, fixture.a6CopyJudgmentResultRecords, fixture.b1DeployedTargetProofRecords, fixture.b1ExternalPrerequisiteResultRecords, fixture.b2AggregateLiveOperationResultRecords), /scenario result collection must be empty/, `${status} B2 must keep the scenario result collection empty`);
}
for (const [field, mutatedValue, expected] of [
  ["requested_operation", "deploy-activation-migration-write", /bounded non-public operation/],
  ["target_scope_alias", "sanitized-target-alias-mutated", /target mapping|fingerprint/],
  ["signed_evidence_record_id", "NC-R1-FUTURE-B2-SIGNED-MISSING", /signed evidence record/],
  ["signed_evidence_source", "signed-source-mutated", /signed_evidence_source/],
  ["b2_parsed_scenarios", canonicalB2ScenarioContracts.slice().reverse().map((contract) => contract.scenario_id).join(","), /canonical (ordered )?19-scenario specification/]
]) {
  const fixture = parsedFingerprintGraphFixture("B2-live-paid-flow-evidence", "running");
  const fields = fixture.childRecords.find((child) => child.fields.child_id === "B2-live-paid-flow-evidence").fields;
  fields[field] = mutatedValue;
  if (field !== "target_scope_alias") fields.approval_fingerprint = deriveApprovalFingerprint(fields);
  assert.throws(
    () => validateStagedLedgerCrossValidation(fixture.rowRecords, fixture.childRecords, fixture.ledger, fixture.signedEvidenceRecords, fixture.b2ScenarioResultRecords, fixture.a3ObservedResultRecords, fixture.a2ObservedResultRecords, fixture.a1ObservedResultRecords, fixture.a4JudgmentResultRecords, fixture.a5LegalJudgmentResultRecords, fixture.a6CopyJudgmentResultRecords),
    expected,
    `B2 approval scope must reject rehashed ${field} drift`
  );
}
for (const [targetChildId, mutatedChildId, field, mutatedValue] of [
  ["A2-provider-cost-evidence-read", "A0-provisional-cost-model-input", "approval_id", "NC-R1-FUTURE-A0-APPROVAL-MUTATED"],
  ["A2-provider-cost-evidence-read", "A0-provisional-cost-model-input", "exact_target_or_scope", "sanitized-a0-target-mutated"],
  ["A2-provider-cost-evidence-read", "A0-provisional-cost-model-input", "bound_input", "sanitized-a0-input-mutated"],
  ["A2-provider-cost-evidence-read", "A0-provisional-cost-model-input", "evidence_retention_location", "sanitized-retention-mutated"],
  ["A2-provider-cost-evidence-read", "A0-provisional-cost-model-input", "stop_owner", "sanitized-stop-owner-mutated"],
  ["A2-provider-cost-evidence-read", "A0-provisional-cost-model-input", "rollback_owner", "sanitized-rollback-owner-mutated"],
  ["A2-provider-cost-evidence-read", "A0-provisional-cost-model-input", "cost_guard", "sanitized-cost-guard-mutated"],
  ["B1-deployed-target-proof", "A1-worker-cpu-source-disposition", "source_disposition_outcome", "retain-no-go"],
  ["A2-provider-cost-evidence-read", "A2-provider-funding-external-prerequisite-reference", "funding_requirement_state", "already-available"]
]) {
  const fixture = parsedFingerprintGraphFixture(targetChildId, "running");
  fixture.childRecords.find((child) => child.fields.child_id === mutatedChildId).fields[field] = mutatedValue;
  assert.throws(
    () => validateStagedLedgerCrossValidation(fixture.rowRecords, fixture.childRecords, fixture.ledger, fixture.signedEvidenceRecords, fixture.b2ScenarioResultRecords, fixture.a3ObservedResultRecords, fixture.a2ObservedResultRecords, fixture.a1ObservedResultRecords, fixture.a4JudgmentResultRecords, fixture.a5LegalJudgmentResultRecords, fixture.a6CopyJudgmentResultRecords),
    /fingerprint|actual A0 approval ID|recorded state/,
    `${targetChildId} must reject a ${mutatedChildId} ${field} mutation while declared fingerprints remain unchanged`
  );
}
function parsedPrerequisiteMutation(childId, childStatus) {
  const row = parseStagedRows(checklist).find((candidate) => candidate.fields.row_closing_child === childId);
  const fixture = parsedFingerprintGraphFixture(childId, childStatus);
  const childRecords = fixture.childRecords.map((child) => ({ ...child, fields: { ...child.fields } }));
  Object.defineProperty(childRecords, "b1DeployedTargetProofRecords", { value: fixture.b1DeployedTargetProofRecords, enumerable: false });
  Object.defineProperty(childRecords, "b1ExternalPrerequisiteResultRecords", { value: fixture.b1ExternalPrerequisiteResultRecords, enumerable: false });
  Object.defineProperty(childRecords, "a2FundingRequirementDispositionResultRecords", { value: fixture.a2FundingRequirementDispositionResultRecords, enumerable: false });
  const closingChild = childRecords.find((child) => child.fields.child_id === childId).fields;
  closingChild.child_status = childStatus;
  if (childId === "A2-provider-cost-evidence-read") {
    Object.assign(childRecords.find((child) => child.fields.child_id === "A2-provider-funding-external-prerequisite-reference").fields, {
      child_status: "satisfied",
      freshness: "fresh",
      target: "exact",
      approval: "approved",
      fingerprint_bound: "yes",
      funding_requirement_state: "needed-absent",
      funding_decision_basis_child: "A0-provisional-cost-model-input",
      funding_decision_basis_status: "satisfied",
      funding_decision_basis_freshness: "fresh",
      funding_decision_basis_target: "exact",
      funding_decision_basis_approval: "approved",
      funding_decision_basis_fingerprint_bound: "yes"
    });
  }
  const unmetPrerequisiteByClosingChild = {
    "A1-worker-cpu-evidence-read": "A1-worker-cpu-source-disposition",
    "A2-provider-cost-evidence-read": "A0-provisional-cost-model-input",
    "B1-deployed-target-proof": "A1-worker-cpu-evidence-read",
    "B2-live-paid-flow-evidence": "B1-deployed-target-proof"
  };
  const unmetPrerequisite = childRecords.find((child) => child.fields.child_id === unmetPrerequisiteByClosingChild[childId])?.fields;
  assert.ok(unmetPrerequisite, `${childId} negative fixture requires a concrete parsed prerequisite`);
  Object.assign(unmetPrerequisite, {
    child_status: "unapproved",
    freshness: "missing",
    target: "missing",
    approval: "unapproved",
    fingerprint_bound: "no"
  });
  return { rowRecords: [row], childRecords };
}
for (const childId of ["A1-worker-cpu-evidence-read", "A2-provider-cost-evidence-read", "B1-deployed-target-proof", "B2-live-paid-flow-evidence"]) {
  for (const childStatus of ["running", "complete-not-closure-eligible"]) {
    const fixture = parsedPrerequisiteMutation(childId, childStatus);
    assert.throws(() => validateStagedLedgerCrossValidation(fixture.rowRecords, fixture.childRecords, evidenceRows), /must be satisfied|separate parsed A4 owner-judgment result record|B1 proof collection must be empty|recorded state|owner-approval record/, `${childId} ${childStatus} must reject an unmet parsed prerequisite before ledger handling`);
  }
}
assert.deepEqual([...authorityOnlyPaths].sort(), [
  "docs/active/COMMENT_TRANSLATOR_CREATOR_NC_R1_OPERATOR_CHECKLIST.md",
  "docs/active/COMMENT_TRANSLATOR_CREATOR_NC_R1_PAID_LAUNCH_READINESS.md",
  "docs/superpowers/plans/2026-08-09-nc-r1-eight-row-staged-resolution.md",
  "docs/superpowers/specs/2026-08-09-nc-r1-eight-row-staged-resolution-design.md",
  "scripts/comment-translator-creator-nc-r1-paid-launch-readiness-contract.mjs",
  "task.md"
], "changed-path allowlist must be exact six paths");
assertChangedPathsForPhase(currentChangedPaths(), parsedManifestFields.manifest_phase);
assert.doesNotThrow(() => assertChangedPathsForPhase([], "manifest-creation"), "a clean committed checkout must remain contract-runnable");
assert.doesNotThrow(() => assertChangedPathsForPhase(["task.md", "scripts/comment-translator-creator-nc-r1-paid-launch-readiness-contract.mjs"], "manifest-creation"), "a publication follow-up may change an approved subset");
assert.doesNotThrow(() => assertChangedPathsForPhase([...operationalAuthorityPaths], "child-result-run"));
assert.doesNotThrow(() => assertChangedPathsForPhase(["task.md", "scripts/comment-translator-creator-nc-r1-paid-launch-readiness-contract.mjs"], "child-result-run"));
assert.throws(() => assertChangedPathsForPhase([...operationalAuthorityPaths, "docs/superpowers/specs/2026-08-09-nc-r1-eight-row-staged-resolution-design.md"], "child-result-run"), /outside its approved allowlist/);
assert.throws(() => assertChangedPathsForPhase(currentChangedPaths(), "invalid-phase"), /unknown changed-path phase/);
assert.throws(() => assertChangedPathsForPhase([...authorityOnlyPaths, "src/unrelated-runtime-change.ts"], "manifest-creation"), /outside its approved allowlist/);
assert.throws(() => validateStagedRows(parseStagedRows(checklist).slice(0, 7)), /exactly eight/);
assert.throws(() => validateStagedChild({ approvalUnit: "authenticated-private-read", approvalId: "<required-unique-approval-id-A1-worker-cpu-evidence-read>", decision: "<required-explicit-approved-or-rejected-decision>", targetScope: "<required-exact-worker-cpu-target-and-scope>", execution: "<required-exact-operation-window-operator>", judgment: "N/A", kind: "executable", stopOwner: "kurodev", rollbackOwner: "kurodev", retention: "<required-sanitized-retention-location>" }, new Set(["<required-unique-approval-id-A1-worker-cpu-evidence-read>"])), /batch approval/);
const prerequisiteStateMap = new Map(stagedChildDefinitions.map((child) => [child.id, satisfiedPrerequisite()]));
prerequisiteStateMap.set("A1-worker-cpu-source-disposition", satisfiedPrerequisite({ source_disposition_outcome: "approved-safe-source-selected" }));
assert.throws(() => assertStateObjectPrerequisites("A2-provider-cost-evidence-read", new Map(), "needed-absent"), /A0/);
assert.throws(() => assertStateObjectPrerequisites("A2-provider-cost-evidence-read", new Map([["A0-provisional-cost-model-input", satisfiedPrerequisite()]]), "needed-absent"), /funding-external-prerequisite/);
assert.doesNotThrow(() => assertStateObjectPrerequisites("A2-provider-cost-evidence-read", new Map([["A0-provisional-cost-model-input", satisfiedPrerequisite()]]), "not-needed"));
assert.doesNotThrow(() => assertStateObjectPrerequisites("A2-provider-cost-evidence-read", new Map([["A0-provisional-cost-model-input", satisfiedPrerequisite()]]), "already-available"));
assert.throws(() => assertStateObjectPrerequisites("A2-provider-cost-evidence-read", new Map([["A0-provisional-cost-model-input", satisfiedPrerequisite()]]), "needed-absent"), /funding-external-prerequisite/);
assert.throws(() => assertStateObjectPrerequisites("A4-product-price-judgment", new Map([["A2-provider-cost-evidence-read", satisfiedPrerequisite()]])), /A3/);
assert.throws(() => assertStateObjectPrerequisites("B1-deployed-target-proof", new Map([["A1-worker-cpu-evidence-read", satisfiedPrerequisite()], ["A4-product-price-judgment", satisfiedPrerequisite()], ["A5-legal-judgment", satisfiedPrerequisite()], ["A6-copy-judgment", satisfiedPrerequisite()]])), /external/);
assert.throws(() => assertStateObjectPrerequisites("B2-live-paid-flow-evidence", new Map()), /B1/);
assert.throws(() => assertStateObjectPrerequisites("A6-copy-judgment", new Map([["A4-product-price-judgment", satisfiedPrerequisite()]])), /A5-legal/);
assert.throws(() => assertStateObjectPrerequisites("A1-worker-cpu-evidence-read", new Map([["A1-worker-cpu-source-disposition", satisfiedPrerequisite({ source_disposition_outcome: "retain-no-go" })]])), /retain-no-go/);
for (const [field, value] of [["status", "incomplete"], ["freshness", "stale"], ["target", "target-mismatched"], ["approval", "unapproved"], ["fingerprint_bound", "no"]]) {
  const invalid = new Map(prerequisiteStateMap);
  invalid.set("B1-external-prerequisite-sanitized-result-reference", { ...satisfiedPrerequisite(), [field]: value });
  assert.throws(() => assertStateObjectPrerequisites("B1-deployed-target-proof", invalid), new RegExp(field === "status" ? "satisfied" : field === "freshness" ? "fresh" : field === "target" ? "exact" : field === "approval" ? "approved" : "fingerprint-bound"));
}
for (const [child, prerequisite] of [
  ["A2-provider-cost-evidence-read", "A0-provisional-cost-model-input"],
  ["A3-stripe-source-applicability-read-or-judgment", "A0-provisional-cost-model-input"],
  ["A4-product-price-judgment", "A2-provider-cost-evidence-read"],
  ["A5-legal-judgment", "A4-product-price-judgment"],
  ["A6-copy-judgment", "A4-product-price-judgment"],
  ["B1-deployed-target-proof", "A1-worker-cpu-evidence-read"],
  ["B2-live-paid-flow-evidence", "B1-deployed-target-proof"]
]) {
  for (const [field, value] of [["status", "incomplete"], ["freshness", "stale"], ["target", "target-mismatched"], ["approval", "unapproved"], ["fingerprint_bound", "no"]]) {
    const invalid = new Map(prerequisiteStateMap);
    invalid.set(prerequisite, { ...satisfiedPrerequisite(), [field]: value });
    assert.throws(() => assertStateObjectPrerequisites(child, invalid), /must be|required/);
  }
}
assertStateObjectPrerequisites("A2-provider-cost-evidence-read", prerequisiteStateMap, "needed-absent");
assertStateObjectPrerequisites("A3-stripe-source-applicability-read-or-judgment", prerequisiteStateMap);
assertStateObjectPrerequisites("A4-product-price-judgment", prerequisiteStateMap);
assertStateObjectPrerequisites("A5-legal-judgment", prerequisiteStateMap);
assertStateObjectPrerequisites("A6-copy-judgment", prerequisiteStateMap);
assertStateObjectPrerequisites("B1-deployed-target-proof", prerequisiteStateMap);
assertStateObjectPrerequisites("B2-live-paid-flow-evidence", prerequisiteStateMap);
const futureBaseChild = {
  child_id: "A1-worker-cpu-evidence-read", child_status: "approved-not-started", status: "satisfied", freshness: "fresh", target: "exact", approval: "approved", fingerprint_bound: "yes", stale: false, invalidated: false,
  row_closure_effect: "EVID-WORKER-CPU-only-after-satisfied"
};
assert.deepEqual(transitionChildLifecycle({ child: futureBaseChild, rowStatus: "incomplete", to: "running", prerequisiteStates: prerequisiteStateMap }), { childStatus: "running", rowStatus: "incomplete", dependentChildren: [], rowClosure: "none" });
const futureRunning = { ...futureBaseChild, child_status: "running" };
assert.deepEqual(transitionChildLifecycle({ child: futureRunning, rowStatus: "incomplete", to: "partial-stop" }), { childStatus: "partial-stop", rowStatus: "incomplete", dependentChildren: [{ id: "B1-deployed-target-proof", status: "stopped" }, { id: "B2-live-paid-flow-evidence", status: "stopped" }], rowClosure: "none" });
assert.deepEqual(transitionChildLifecycle({ child: futureRunning, rowStatus: "incomplete", to: "complete-not-closure-eligible", prerequisiteStates: prerequisiteStateMap }), { childStatus: "complete-not-closure-eligible", rowStatus: "incomplete", dependentChildren: [], rowClosure: "none" });
assert.throws(() => transitionChildLifecycle({ child: futureBaseChild, rowStatus: "incomplete", to: "running", prerequisiteStates: new Map([["A1-worker-cpu-source-disposition", satisfiedPrerequisite({ source_disposition_outcome: "retain-no-go" })]]) }), /retain-no-go/);
assert.deepEqual(transitionChildLifecycle({ child: futureRunning, rowStatus: "incomplete", to: "satisfied", prerequisiteStates: prerequisiteStateMap }), { childStatus: "satisfied", rowStatus: "satisfied", dependentChildren: [], rowClosure: "EVID-WORKER-CPU-only-after-satisfied" });
assert.deepEqual(transitionChildLifecycle({ child: { ...futureBaseChild, child_status: "satisfied" }, rowStatus: "satisfied", to: "invalidated" }), { childStatus: "invalidated", rowStatus: "incomplete", dependentChildren: [{ id: "B1-deployed-target-proof", status: "stopped" }, { id: "B2-live-paid-flow-evidence", status: "stopped" }], rowClosure: "none" });
assert.throws(() => transitionChildLifecycle({ child: futureBaseChild, rowStatus: "incomplete", to: "satisfied", prerequisiteStates: prerequisiteStateMap }), /invalid staged transition/);
const futureA2Running = { ...futureBaseChild, child_id: "A2-provider-cost-evidence-read", child_status: "running", row_closure_effect: "EVID-PROVIDER-COST-only-after-satisfied" };
assert.throws(() => transitionChildLifecycle({ child: futureA2Running, rowStatus: "incomplete", to: "satisfied", prerequisiteStates: prerequisiteStateMap }), /parsed provider-funding prerequisite/);
const parsedFundingReference = (fundingRequirementState) => {
  const record = parseStagedChildren(checklist).find((child) => child.headingId === "A2-provider-funding-external-prerequisite-reference");
  return { ...record, fields: { ...record.fields, child_status: "approved-not-started", approval_id: "NC-R1-FUTURE-A2-FUNDING-01", explicit_decision: "approved", exact_target_or_scope: "exact-sanitized-funding-result", evidence_retention_location: "sanitized-retention", freshness: "fresh", target: "exact", approval: "approved", fingerprint_bound: "yes", funding_requirement_state: fundingRequirementState, funding_decision_basis_status: "satisfied", funding_decision_basis_freshness: "fresh", funding_decision_basis_target: "exact", funding_decision_basis_approval: "approved", funding_decision_basis_fingerprint_bound: "yes" } };
};
for (const fundingRequirementState of ["not-needed", "already-available", "needed-absent"]) {
  const transitionBundle = a2TransitionDispositionBundle(fundingRequirementState);
  const fundingPrerequisiteRecord = transitionBundle.fundingPrerequisiteRecord;
  assert.equal(fundingRequirementStateFromParsedChild(fundingPrerequisiteRecord), fundingRequirementState, "A2 must read its funding condition from the parsed child record");
  assert.doesNotThrow(() => transitionChildLifecycle({ child: futureA2Running, rowStatus: "incomplete", to: "satisfied", prerequisiteStates: prerequisiteStateMap, fundingPrerequisiteRecord, fundingDispositionOwnerApprovalRecord: transitionBundle.ownerApprovalRecord, fundingDispositionResultRecord: transitionBundle.dispositionResultRecord, fundingDispositionA0Child: transitionBundle.a0Child }), `A2 closure must support parsed ${fundingRequirementState} state`);
  const reverseDependents = canonicalDependentChildren("A2-provider-funding-external-prerequisite-reference", fundingRequirementState);
  assert.deepEqual(reverseDependents, ["A2-provider-cost-evidence-read", "A4-product-price-judgment", "A5-legal-judgment", "A6-copy-judgment", "B1-deployed-target-proof", "B2-live-paid-flow-evidence"], `${fundingRequirementState} funding disposition drift must stop A2 and every downstream consumer`);
}
const futureFundingReferenceRunning = { ...futureBaseChild, child_id: "A2-provider-funding-external-prerequisite-reference", child_status: "running", row_closure_effect: "none" };
const futureFundingReferenceSatisfied = { ...futureFundingReferenceRunning, child_status: "satisfied" };
for (const [transition, child, rowStatus] of [["partial-stop", futureFundingReferenceRunning, "incomplete"], ["invalidated", futureFundingReferenceSatisfied, "satisfied"], ["stale", futureFundingReferenceSatisfied, "satisfied"]]) {
  assert.throws(() => transitionChildLifecycle({ child, rowStatus, to: transition }), /parsed provider-funding prerequisite/, `funding-reference ${transition} must reject an omitted parsed funding record`);
  for (const fundingRequirementState of ["not-needed", "already-available", "needed-absent"]) {
    const result = transitionChildLifecycle({ child, rowStatus, to: transition, fundingPrerequisiteRecord: parsedFundingReference(fundingRequirementState) });
    const expectedDependents = canonicalDependentChildren("A2-provider-funding-external-prerequisite-reference", fundingRequirementState).map((id) => ({ id, status: "stopped" }));
    assert.deepEqual(result.dependentChildren, expectedDependents, `funding-reference ${transition} must derive ${fundingRequirementState} canonical stops`);
  }
}
for (const fundingRequirementState of ["not-needed", "already-available", "needed-absent"]) {
  assert.deepEqual(canonicalDependentChildren("A2-provider-funding-external-prerequisite-reference", fundingRequirementState), ["A2-provider-cost-evidence-read", "A4-product-price-judgment", "A5-legal-judgment", "A6-copy-judgment", "B1-deployed-target-proof", "B2-live-paid-flow-evidence"]);
}
for (const [root, expectedFirst] of [["A0-provisional-cost-model-input", "A2-provider-cost-evidence-read"], ["A2-provider-cost-evidence-read", "A4-product-price-judgment"], ["A3-stripe-source-applicability-read-or-judgment", "A4-product-price-judgment"], ["A4-product-price-judgment", "A5-legal-judgment"], ["B1-external-prerequisite-sanitized-result-reference", "B1-deployed-target-proof"]]) {
  const stopped = canonicalDependentChildren(root);
  assert.ok(stopped.includes(expectedFirst), `${root} drift must stop its canonical downstream child`);
  assert.deepEqual(transitionChildLifecycle({ child: { ...futureBaseChild, child_id: root, child_status: "satisfied" }, rowStatus: "satisfied", to: "invalidated" }).dependentChildren.map((entry) => entry.id), stopped, `${root} invalidation must derive—not accept—dependent stops`);
}
const firstGoalLedger = cloneRows(evidenceRows);
for (const id of stagedRows.map((row) => row.id)) {
  const row = firstGoalLedger.find((candidate) => candidate.id === id);
  row.status = "satisfied"; row.freshness = "fresh"; row.target = "exact"; row.approval = "approved";
}
assert.deepEqual(assertFirstGoalBoundary(firstGoalLedger), { unresolved: ["EVID-RISK-ACCEPTANCE"], count: 1, decision: "no-go", activation: "closed", free: "permanent", ncL1: "not-started" });
const lostRiskLedger = firstGoalLedger.filter((row) => row.id !== "EVID-RISK-ACCEPTANCE");
assert.throws(() => assertFirstGoalBoundary(lostRiskLedger), /Risk Acceptance/);
const zeroUnresolvedLedger = cloneRows(firstGoalLedger);
zeroUnresolvedLedger.find((row) => row.id === "EVID-RISK-ACCEPTANCE").status = "satisfied";
assert.throws(() => assertFirstGoalBoundary(zeroUnresolvedLedger), /Risk Acceptance/);
assert.equal(assertStagedTransition("running", "partial-stop", "incomplete"), "incomplete", "partial stop preserves prior canonical status");
assert.equal(assertStagedTransition("running", "complete-not-closure-eligible"), "complete-not-closure-eligible", "complete-not-closure-eligible closes no row");
assert.equal(assertStagedTransition("stale", "incomplete"), "incomplete", "stale must return to incomplete");
assert.equal(assertStagedTransition("invalidated", "unapproved"), "unapproved", "invalidated must support reset to unapproved");
assert.throws(() => assertStagedTransition("unapproved", "running"), /invalid staged transition/);
assert.deepEqual([...invalidateDependentRows("A0")], ["A2", "A3", "A4", "A5", "A6", "B1", "B2"]);
assert.deepEqual([...invalidateDependentRows("A5")], ["A6", "B1", "B2"], "A5 material drift must invalidate A6 and both downstream release gates");
assert.deepEqual([...invalidateDependentRows("B1")], ["B2"]);
for (const drift of ["A1", "A2", "A3", "A4", "A5", "A6", "external", "signedEntitlement", "approvalInput"]) assert.ok(invalidateDependentRows(drift).size > 0, `${drift} drift must invalidate dependents`);
assert.match(checklist, /exactly one uniquely identified result for each of the 19 canonical scenarios/, "B2 scenarios must be complete");
assert.match(checklist, /all six side-effect counts, so duplicate Checkout, signed-webhook idempotency, stale\/replay, owner\/price\/subscription mismatch, cross-owner, and cross-capability cannot be proved by a scenario name alone/, "B2 side effects must remain independently parsed and fail-closed");
assert.match(checklist, /only Paid row is `positive-compatible-active-signed-subscription-paid`; all other rows carry their scenario-specific canonical Free\/denied\/fail-closed outcome/, "B2 must distinguish its positive and negative canonical outcomes");
assert.match(checklist, /final_state=Free-fail-closed.*unexpected_paid_transitions=0/, "B2 must retain final Free state and zero unexpected Paid transitions");
assert.match(checklist, /A0 must be complete with actual parsed `cost_model_input_fingerprint`, `cost_model_result_fingerprint`, and `bound_artifact_fingerprint` before A2 or A3 starts or closes; `fingerprint_bound=yes` alone is never sufficient/, "A0 fingerprint boundary must gate A2 and A3");
assert.match(checklist, /B1 binds actual A1\/A4\/A5\/A6 and external-prerequisite fingerprints before it can start or close/, "B1 prerequisite boundary must be exact");
assert.match(checklist, /every source timestamp and exact operation-window endpoint is `Date\.parse`-valid, no later than evaluation_at, and a source timestamp is no older than `source_max_age_days=7`/, "source-result timestamps must use the documented evaluation-anchor and exact-window binding rule");
assert.match(checklist, /selected_mode=read.*source timestamp, and exact operation window.*selected_mode=judgment.*judgment_effective_date.*exactly equal to child `effective_date`/s, "A3 must retain mutually exclusive mode-aware source and judgment schemas");
assert.match(checklist, /B1 binds A1\/A4\/A5\/A6\/external fingerprints before emitting its deployed fingerprint/, "B1 must require independent deployed target, commit, fingerprint, and timestamp fields");
assert.match(checklist, /one separately parsed signed-evidence record—not fields synthesized from B2 itself—with its own record ID, source, fingerprint, `Date\.parse`-valid source timestamp inside B2’s exact approved time window, `classification=active-compatible`, and `authority=complete-unambiguous`/, "B2 must bind a separate parsed signed-evidence record");
assert.match(readiness, /A0\/A2\/A3\/A4\/A5\/A6\/B1\/B2 retain the exact actual-fingerprint graph defined in the checklist, so `fingerprint_bound=yes` alone cannot start or close a dependent child/, "readiness authority must retain the exact parsed fingerprint graph");
assert.match(task, /8-row manifest itself is `unapproved-non-executable` with `approval_effect=none`/, "task must record the manifest is unapproved and non-executable");
assert.match(task, /A1 actual Worker CPU observed-result bridge is contract-only preparation/, "task must preserve the A1 observed-result bridge as contract-only preparation");

function assertControlPlaneAuthorization({ action = "none", incrementalSpendJpy = "0", stopBeforeCharge = "yes", approvalEffect = "none" }) {
  assert.equal(approvalEffect, "none", "control-plane manifest has no approval effect");
  assert.equal(incrementalSpendJpy, "0", "control-plane manifest defaults to zero incremental spend");
  assert.equal(stopBeforeCharge, "yes", "control-plane manifest stops before an incremental charge");
  assert.equal(action, "none", "control-plane manifest cannot directly authorize an operation");
}

function recomputeStagedReadiness(rowStates) {
  const unresolved = [...rowStates.entries()].filter(([, state]) => state !== "satisfied").map(([id]) => id);
  return { unresolved, decision: unresolved.length === 0 ? "not-evaluated" : "no-go", activation: "closed" };
}

function assertB2SideEffects({ preProviderProviderCalls, providerFailureUsageCommits, postProviderOutput, postProviderSuccess, finalState, unexpectedPaidTransitions }) {
  assert.equal(preProviderProviderCalls, 0, "pre-provider budget/quota rejection must make zero provider calls");
  assert.equal(providerFailureUsageCommits, 0, "provider failure must make zero usage commits");
  assert.equal(postProviderOutput, "suppressed", "post-provider commit rejection must suppress output");
  assert.equal(postProviderSuccess, false, "post-provider commit rejection must not record success");
  assert.equal(finalState, "Free-fail-closed", "B2 must preserve final Free fail-closed state");
  assert.equal(unexpectedPaidTransitions, 0, "B2 must record zero unexpected Paid transitions");
}

assert.throws(() => assertControlPlaneAuthorization({ action: "provider-funding" }), /cannot directly authorize/);
assert.throws(() => assertControlPlaneAuthorization({ action: "payment" }), /cannot directly authorize/);
assert.throws(() => assertControlPlaneAuthorization({ action: "deploy" }), /cannot directly authorize/);
assert.throws(() => assertControlPlaneAuthorization({ action: "migration" }), /cannot directly authorize/);
assert.throws(() => assertControlPlaneAuthorization({ action: "configuration-binding" }), /cannot directly authorize/);
assert.throws(() => assertControlPlaneAuthorization({ action: "git-publication" }), /cannot directly authorize/);
assert.throws(() => assertControlPlaneAuthorization({ action: "live-flow" }), /cannot directly authorize/);
assert.throws(() => assertControlPlaneAuthorization({ action: "activation" }), /cannot directly authorize/);
assert.throws(() => assertControlPlaneAuthorization({ action: "public-gate" }), /cannot directly authorize/);
assert.throws(() => assertControlPlaneAuthorization({ action: "cleanup" }), /cannot directly authorize/);
assert.throws(() => assertControlPlaneAuthorization({ incrementalSpendJpy: "1" }), /zero incremental spend/);
assert.throws(() => assertControlPlaneAuthorization({ stopBeforeCharge: "no" }), /stops before/);
assert.throws(() => validateStagedRows([...parseStagedRows(checklist), parseStagedRows(checklist)[0]]), /exactly eight/);
assert.throws(() => validateStagedRows([...parseStagedRows(checklist)].reverse()), /exactly eight, ordered, and canonical/);
const duplicateRowFixture = parseStagedRows(checklist).map((row) => ({ ...row, fields: { ...row.fields } }));
duplicateRowFixture[1].headingId = duplicateRowFixture[0].headingId;
assert.throws(() => validateStagedRows(duplicateRowFixture), /unique/);
assert.throws(() => validateStagedChild({ approvalUnit: "release-owner-judgment", approvalId: "<required-unique-approval-id-x>", decision: "<required-explicit-approved-or-rejected-decision>", targetScope: "<required-exact-x>", execution: "N/A", judgment: "N/A", kind: "judgment", stopOwner: "kurodev", rollbackOwner: "kurodev", retention: "<required-sanitized-retention-location>" }, new Set()), /bound input/);
const staleReadiness = recomputeStagedReadiness(new Map([["EVID-WORKER-CPU", "stale"], ["EVID-RISK-ACCEPTANCE", "incomplete"]]));
assert.deepEqual(staleReadiness, { unresolved: ["EVID-WORKER-CPU", "EVID-RISK-ACCEPTANCE"], decision: "no-go", activation: "closed" }, "stale or invalidated rows must return to unresolved NO-GO");
assert.equal(assertStagedTransition("satisfied", "stale"), "stale");
assert.equal(assertStagedTransition("stale", "incomplete"), "incomplete");
assert.equal(assertStagedTransition("satisfied", "invalidated"), "invalidated");
assert.equal(assertStagedTransition("invalidated", "unapproved"), "unapproved");
assert.throws(() => assertB2SideEffects({ preProviderProviderCalls: 1, providerFailureUsageCommits: 0, postProviderOutput: "suppressed", postProviderSuccess: false, finalState: "Free-fail-closed", unexpectedPaidTransitions: 0 }), /zero provider calls/);
assert.throws(() => assertB2SideEffects({ preProviderProviderCalls: 0, providerFailureUsageCommits: 1, postProviderOutput: "suppressed", postProviderSuccess: false, finalState: "Free-fail-closed", unexpectedPaidTransitions: 0 }), /zero usage commits/);
assert.throws(() => assertB2SideEffects({ preProviderProviderCalls: 0, providerFailureUsageCommits: 0, postProviderOutput: "returned", postProviderSuccess: false, finalState: "Free-fail-closed", unexpectedPaidTransitions: 0 }), /suppress output/);
assert.throws(() => assertB2SideEffects({ preProviderProviderCalls: 0, providerFailureUsageCommits: 0, postProviderOutput: "suppressed", postProviderSuccess: true, finalState: "Free-fail-closed", unexpectedPaidTransitions: 0 }), /not record success/);
assert.throws(() => assertB2SideEffects({ preProviderProviderCalls: 0, providerFailureUsageCommits: 0, postProviderOutput: "suppressed", postProviderSuccess: false, finalState: "Paid", unexpectedPaidTransitions: 0 }), /final Free/);
assert.throws(() => assertB2SideEffects({ preProviderProviderCalls: 0, providerFailureUsageCommits: 0, postProviderOutput: "suppressed", postProviderSuccess: false, finalState: "Free-fail-closed", unexpectedPaidTransitions: 1 }), /zero unexpected Paid transitions/);
assertB2SideEffects({ preProviderProviderCalls: 0, providerFailureUsageCommits: 0, postProviderOutput: "suppressed", postProviderSuccess: false, finalState: "Free-fail-closed", unexpectedPaidTransitions: 0 });

// RED: each prerequisite and closing action needs its own parsed child record.
assert.match(checklist, /^## NC-R1 Staged Child-Unit Registry$/m);
assert.throws(() => assertStateObjectPrerequisites("A1-worker-cpu-evidence-read", new Map()), /source-disposition/);

// RED: an A3 approved lifecycle cannot self-authorize without one independent owner record.
assert.throws(
  () => validateA3ManualReadOwnerApprovalCollection({ child_status: "approved-not-started" }, [], completedA0RegistryChild),
  /exactly one independent A3 owner approval record/
);

process.stdout.write(
  `comment translator Creator NC-R1 paid launch readiness contract passed (decision=no-go; unresolved-hard=${unresolvedHardRequirements.length}; activation=closed)\n`
);
