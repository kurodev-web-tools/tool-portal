import assert from "node:assert/strict";
import fs from "node:fs";
import { verifyGate1Evidence } from "./lib/comment-translator-paid-core-v1-gate1-stage-evidence.mjs";

export const APPROVAL_STATES = Object.freeze([
  "source-implementation",
  "preview-apply",
  "tooling-setup",
  "recovery-cost-capacity",
  "recovery-project-provisioning",
  "recovery-region-extensions-auth",
  "rehearsal-backup-restore",
  "final-backup",
  "bounded-rpo-watchdog",
  "production-migration-apply",
  "vault-write",
  "inactive-cron-configuration",
  "incident-source-pause",
  "pause-confirmation",
  "recovery-restore",
  "endpoint-credential-cutover",
  "client-reauthentication",
  "reopening-writes",
  "source-unpause-deletion",
  "activation"
]);

export const BACKUP_STATES = Object.freeze([
  "PRE_DDL_UNARMED",
  "ABORTED_NO_DDL_NO_PAUSE",
  "ARMED_BEFORE_FIRST_DDL",
  "SUCCESS_DISARMED",
  "PAUSE_REQUESTED",
  "PAUSE_CONFIRMED"
]);

const GO_APPROVAL_STATES = Object.freeze([
  "source-implementation",
  "preview-apply",
  "tooling-setup",
  "recovery-cost-capacity",
  "recovery-project-provisioning",
  "recovery-region-extensions-auth",
  "rehearsal-backup-restore",
  "final-backup",
  "bounded-rpo-watchdog",
  "production-migration-apply",
  "vault-write",
  "inactive-cron-configuration"
]);

const GO_EVIDENCE_KEYS = Object.freeze([
  "sourceCommit",
  "previewReadback",
  "rehearsalBackup",
  "finalBackup",
  "productionReadback",
  "canonicalReadback",
  "vaultReadback",
  "cronReadback",
  "rollbackEvidence"
]);

const EVIDENCE_REASON = "REQUIRED_EVIDENCE_UNAVAILABLE";

const BACKUP_TRANSITIONS = Object.freeze({
  PRE_DDL_UNARMED: Object.freeze(["ABORTED_NO_DDL_NO_PAUSE", "ARMED_BEFORE_FIRST_DDL"]),
  ABORTED_NO_DDL_NO_PAUSE: Object.freeze([]),
  ARMED_BEFORE_FIRST_DDL: Object.freeze(["ABORTED_NO_DDL_NO_PAUSE", "SUCCESS_DISARMED", "PAUSE_REQUESTED"]),
  SUCCESS_DISARMED: Object.freeze([]),
  PAUSE_REQUESTED: Object.freeze(["PAUSE_CONFIRMED"]),
  PAUSE_CONFIRMED: Object.freeze([])
});

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function createApprovalSnapshot(overrides = {}) {
  if (!isPlainObject(overrides)) throw new TypeError("approval overrides must be an object");
  const snapshot = Object.fromEntries(APPROVAL_STATES.map((state) => [state, "unverified"]));
  for (const [state, value] of Object.entries(overrides)) {
    if (!APPROVAL_STATES.includes(state)) throw new TypeError("unknown approval state");
    if (!["unverified", "approved", "rejected"].includes(value)) throw new TypeError("invalid approval state value");
    snapshot[state] = value;
  }
  return snapshot;
}

export function grantApproval(snapshot, state) {
  if (!isPlainObject(snapshot) || !APPROVAL_STATES.includes(state)) throw new TypeError("unknown approval state");
  return { ...snapshot, [state]: "approved" };
}

export function transitionBackupState(current, next) {
  if (!BACKUP_STATES.includes(current) || !BACKUP_STATES.includes(next)) return null;
  return BACKUP_TRANSITIONS[current].includes(next) ? next : null;
}

export function evaluateGate1Decision({ approvals, evidenceRequest, mutationCounts = {} } = {}) {
  const safeApprovals = isPlainObject(approvals) ? approvals : {};
  const missingApprovals = GO_APPROVAL_STATES.filter((state) => safeApprovals[state] !== "approved");
  const outOfScopeApproval = safeApprovals.activation === "approved" || safeApprovals["source-unpause-deletion"] === "approved";
  const hasMutation = !isPlainObject(mutationCounts) || Object.values(mutationCounts).some((value) => value !== 0);
  // Only this native invocation can supply validity. Caller PASS labels and
  // caller-created verifier results are deliberately not accepted as inputs.
  const verified = missingApprovals.length === 0 && !outOfScopeApproval && !hasMutation
    ? verifyGate1Evidence(evidenceRequest) : null;
  const missingEvidence = verified?.status === "GATE1_EVIDENCE_VALID" ? [] : [...GO_EVIDENCE_KEYS];
  if (missingApprovals.length > 0 || missingEvidence.length > 0 || outOfScopeApproval || hasMutation) {
    return {
      decision: "NO-GO",
      reason: EVIDENCE_REASON,
      missingApprovals,
      missingEvidence,
      remoteCalls: 0,
      mutations: 0
    };
  }
  return {
    decision: "GO",
    reason: null,
    missingApprovals: [],
    missingEvidence: [],
    remoteCalls: 0,
    mutations: 0
  };
}

function freshEvidence() {
  return Object.fromEntries(GO_EVIDENCE_KEYS.map((key) => [key, {
    status: "PASS",
    provenance: "fresh-external-readback",
    freshness: "current",
    synthetic: false
  }]));
}

function sourceOnlyEvidence() {
  return {
    sourceCommit: {
      status: "PASS",
      provenance: "local-source",
      freshness: "current",
      synthetic: true
    },
    previewReadback: {
      status: "PASS",
      provenance: "fixture",
      freshness: "saved",
      synthetic: true
    }
  };
}

const RUNBOOK_CURRENT_READINESS_START = "<!-- gate1-current-readiness:start -->";
const RUNBOOK_CURRENT_READINESS_END = "<!-- gate1-current-readiness:end -->";
const RUNBOOK_AUTHORITY_LINK = "[Production Supabase readiness](COMMENT_TRANSLATOR_PAID_V1_GATE1_PRODUCTION_SUPABASE_READINESS.md)";
const RUNBOOK_CURRENT_MARKERS = Object.freeze([
  "`gate1_status=NO-GO`",
  "`source_artifact=UNCOMMITTED/UNKNOWN`",
  "`verification=pending-review`",
  "`activation-closed`"
]);
const AUTHORITY_CURRENT_MARKERS = Object.freeze([
  "`gate1_status=NO-GO`",
  "`source_artifact=UNCOMMITTED/UNKNOWN`",
  "`activation-closed`"
]);
const RUNBOOK_CURRENT_BOUNDARIES = Object.freeze([
  "source readinessはPreview/Production apply、実backup/restore、Vault、Cron、deploy、activationの完了証拠ではない。",
  "既存Task 11のclosed証拠は保持し、Gate 1の外部証跡へ代用しない。",
  "必要操作の包括承認も、費用発生の許可や未取得証拠のPASS化を含まない。"
]);
const RUNBOOK_CURRENT_POSITIVE_CLAIMS = Object.freeze([
  Object.freeze({ classification: "DOC_RUNBOOK_PREMATURE_GO", pattern: /^\s*GO\s*$/im }),
  Object.freeze({ classification: "DOC_RUNBOOK_PREMATURE_GO", pattern: /\b(?:gate1(?:[-_ ]status)?|gate[-_ ]1(?:[-_ ]status)?|source[-_ ]readiness|decision)\s*[:=]\s*GO\b/i }),
  Object.freeze({ classification: "DOC_RUNBOOK_PRODUCTION_APPLIED", pattern: /\bproduction[-_ ]applied\b|\bproduction[-_ ]apply\s*[:=]\s*(?:PASS|DONE|COMPLETE|TRUE)\b/i }),
  Object.freeze({ classification: "DOC_RUNBOOK_BACKUP_PASS", pattern: /\bbackup[-_ ]pass\b|\bbackup(?:[-_ ]status)?\s*[:=]\s*(?:PASS|DONE|COMPLETE|TRUE)\b/i }),
  Object.freeze({ classification: "DOC_RUNBOOK_VAULT_CONFIGURED", pattern: /\bvault(?:[-_ ]configured|\s+configured)\b|\bvault(?:[-_ ]status)?\s*[:=]\s*(?:CONFIGURED|PASS|READY|DONE|COMPLETE|TRUE)\b/i }),
  Object.freeze({ classification: "DOC_RUNBOOK_CRON_CONFIGURED", pattern: /\bcron(?:[-_ ]configured|\s+configured)\b|\bcron(?:[-_ ]status)?\s*[:=]\s*(?:CONFIGURED|PASS|READY|DONE|COMPLETE|TRUE)\b/i })
]);
const TASK_STATUS_FIXTURE_FIELDS = Object.freeze([
  "branch=codex/comment-translator-paid-v1-gate1-source-readiness",
  "source-scope=gate1-source-readiness",
  "verification=pending-review",
  "pending-evidence-scopes=Preview-apply,Production-apply,backup,Vault,Cron,hosted"
]);

function countOccurrences(value, needle) {
  if (typeof value !== "string" || typeof needle !== "string" || needle.length === 0) return 0;
  return value.split(needle).length - 1;
}

function currentReadinessBlock(markdown) {
  if (typeof markdown !== "string") return { classification: "DOC_RUNBOOK_INPUT" };
  if (
    countOccurrences(markdown, RUNBOOK_CURRENT_READINESS_START) !== 1
    || countOccurrences(markdown, RUNBOOK_CURRENT_READINESS_END) !== 1
  ) {
    return { classification: "DOC_RUNBOOK_BOUNDARY_MARKERS" };
  }
  const start = markdown.indexOf(RUNBOOK_CURRENT_READINESS_START);
  const contentStart = start + RUNBOOK_CURRENT_READINESS_START.length;
  const end = markdown.indexOf(RUNBOOK_CURRENT_READINESS_END);
  if (start < 0 || end < contentStart) return { classification: "DOC_RUNBOOK_BOUNDARY_MARKERS" };
  return { classification: null, block: markdown.slice(contentStart, end) };
}

function validateRunbookCurrentReadiness(markdown) {
  const extracted = currentReadinessBlock(markdown);
  if (extracted.classification !== null) return extracted.classification;
  if (
    countOccurrences(markdown, RUNBOOK_AUTHORITY_LINK) !== 1
    || countOccurrences(extracted.block, RUNBOOK_AUTHORITY_LINK) !== 1
  ) {
    return "DOC_RUNBOOK_AUTHORITY_LINK";
  }
  // Normalize only the bounded current block; retain raw checks for identifiers.
  const normalizedBlock = extracted.block
    .replace(/`+|\*+/g, "")
    .replace(/(?<!\w)_{1,2}(?=\S)(.+?)(?<=\S)_{1,2}(?!\w)/g, "$1")
    .replace(/^\s{0,3}(?:#{1,6}\s+|[-+]\s+|\d+[.)]\s+)/gm, "");
  for (const claim of RUNBOOK_CURRENT_POSITIVE_CLAIMS) {
    if (claim.pattern.test(extracted.block) || claim.pattern.test(normalizedBlock)) return claim.classification;
  }
  for (const marker of RUNBOOK_CURRENT_MARKERS) {
    if (countOccurrences(extracted.block, marker) !== 1) return "DOC_RUNBOOK_REQUIRED_MARKER";
  }
  for (const boundary of RUNBOOK_CURRENT_BOUNDARIES) {
    if (countOccurrences(extracted.block, boundary) !== 1) return "DOC_RUNBOOK_BOUNDARY_SEMANTICS";
  }
  return null;
}

function validateAuthorityDocument(markdown) {
  if (typeof markdown !== "string") return "DOC_AUTHORITY_INPUT";
  const required = ["# Paid Core v1 Gate 1 — Production Supabase readiness", ...AUTHORITY_CURRENT_MARKERS];
  for (const marker of required) {
    if (countOccurrences(markdown, marker) !== 1) return "DOC_AUTHORITY_STATUS";
  }
  if (/\bgate1_status\s*=\s*GO\b/i.test(markdown)) return "DOC_AUTHORITY_STATUS";
  return null;
}

function validateTaskBoardDocument(markdown) {
  if (typeof markdown !== "string") return "DOC_TASK_BOARD_INPUT";
  if (!/^## Current Task Index\s*$/m.test(markdown)) return "DOC_TASK_BOARD_CURRENT_MARKER";
  if (!/^-\s+Gate 1 GO objective\b[^\r\n]*Current branch remains `codex\/comment-translator-paid-v1-gate1-source-readiness`[^\r\n]*source identity `UNCOMMITTED\/UNKNOWN`[^\r\n]*$/m.test(markdown)) {
    return "DOC_TASK_BOARD_GOAL_CHECKPOINT";
  }
  return null;
}

function validateTaskStatusFixture(line) {
  if (typeof line !== "string" || line.length === 0 || line !== line.trim() || /[\r\n]/.test(line)) {
    return "DOC_TASK_FIXTURE_LINE";
  }
  for (const field of TASK_STATUS_FIXTURE_FIELDS) {
    if (countOccurrences(line, field) !== 1) return "DOC_TASK_FIXTURE_FIELD";
  }
  return line === TASK_STATUS_FIXTURE_FIELDS.join(" ") ? null : "DOC_TASK_FIXTURE_VALUE";
}

function runContract() {
  assert.equal(APPROVAL_STATES.length, 20, "every approval gate is represented independently");
  assert.deepEqual(BACKUP_STATES, [
    "PRE_DDL_UNARMED",
    "ABORTED_NO_DDL_NO_PAUSE",
    "ARMED_BEFORE_FIRST_DDL",
    "SUCCESS_DISARMED",
    "PAUSE_REQUESTED",
    "PAUSE_CONFIRMED"
  ], "backup/watchdog states are exact");
  assert.equal(transitionBackupState("PRE_DDL_UNARMED", "ARMED_BEFORE_FIRST_DDL"), "ARMED_BEFORE_FIRST_DDL");
  assert.equal(transitionBackupState("PRE_DDL_UNARMED", "SUCCESS_DISARMED"), null, "backup cannot skip its arm state");
  assert.equal(transitionBackupState("PAUSE_REQUESTED", "PAUSE_CONFIRMED"), "PAUSE_CONFIRMED");
  assert.equal(transitionBackupState("PAUSE_CONFIRMED", "SUCCESS_DISARMED"), null, "confirmed pause cannot become success");

  const sourceOnlyApprovals = createApprovalSnapshot({ "source-implementation": "approved" });
  const sourceOnlyDecision = evaluateGate1Decision({ approvals: sourceOnlyApprovals, evidence: sourceOnlyEvidence() });
  assert.equal(sourceOnlyDecision.decision, "NO-GO", "source approval cannot promote Gate 1");
  assert.equal(sourceOnlyDecision.reason, EVIDENCE_REASON);
  assert.ok(sourceOnlyDecision.missingApprovals.includes("preview-apply"));
  assert.ok(sourceOnlyDecision.missingEvidence.includes("finalBackup"));
  assert.ok(sourceOnlyDecision.missingEvidence.includes("vaultReadback"));
  assert.ok(sourceOnlyDecision.missingEvidence.includes("productionReadback"));
  assert.equal(sourceOnlyDecision.remoteCalls, 0);
  assert.equal(sourceOnlyDecision.mutations, 0);

  for (const state of GO_APPROVAL_STATES) {
    const isolated = evaluateGate1Decision({
      approvals: createApprovalSnapshot({ [state]: "approved" }),
      evidence: {}
    });
    assert.equal(isolated.decision, "NO-GO", `${state} approval remains isolated`);
    assert.ok(isolated.missingApprovals.some((missing) => missing !== state), `${state} does not satisfy another approval`);
  }

  const allApprovals = createApprovalSnapshot(Object.fromEntries(GO_APPROVAL_STATES.map((state) => [state, "approved"])));
  const labelOnlyDecision = evaluateGate1Decision({ approvals: allApprovals, evidence: freshEvidence() });
  assert.equal(labelOnlyDecision.decision, "NO-GO", "plausible labels without actual values cannot promote Gate 1");
  assert.deepEqual(labelOnlyDecision.missingApprovals, []);
  assert.deepEqual(labelOnlyDecision.missingEvidence, GO_EVIDENCE_KEYS);

  for (const actual of [null, {}, { migration: { status: "PASS" } }, { canonicalRpc: { status: "PASS" } }]) {
    const invalidActual = freshEvidence();
    invalidActual.productionReadback = { ...invalidActual.productionReadback, actual };
    const decision = evaluateGate1Decision({ approvals: allApprovals, evidence: invalidActual });
    assert.equal(decision.decision, "NO-GO", "missing or invalid actual values cannot promote Gate 1");
    assert.ok(decision.missingEvidence.includes("productionReadback"));
  }

  for (const missing of ["finalBackup", "vaultReadback", "productionReadback", "previewReadback", "cronReadback"]) {
    const incomplete = freshEvidence();
    delete incomplete[missing];
    const decision = evaluateGate1Decision({ approvals: allApprovals, evidence: incomplete });
    assert.equal(decision.decision, "NO-GO", `${missing} absence cannot become GO`);
    assert.ok(decision.missingEvidence.includes(missing));
  }

  const synthetic = freshEvidence();
  synthetic.finalBackup = { status: "PASS", provenance: "fixture", freshness: "saved", synthetic: true };
  assert.equal(evaluateGate1Decision({ approvals: allApprovals, evidence: synthetic }).decision, "NO-GO", "fixture evidence is not hosted evidence");
  assert.equal(
    evaluateGate1Decision({ approvals: allApprovals, evidence: freshEvidence(), mutationCounts: { remote: 1 } }).decision,
    "NO-GO",
    "remote mutation evidence cannot be normalized into a source-only pass"
  );
  assert.throws(() => createApprovalSnapshot({ unknown: "approved" }), /unknown approval state/);
  assert.equal(grantApproval(sourceOnlyApprovals, "preview-apply")["source-implementation"], "approved");
  assert.equal(grantApproval(sourceOnlyApprovals, "preview-apply")["preview-apply"], "approved");

  const source = fs.readFileSync(new URL("./comment-translator-paid-core-v1-gate1-operator-contract.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\b(?:spawn|exec|fetch|connect)\s*\(/i, "operator contract has no transport side effect");
  assert.match(source, /NO-GO/);
  assert.match(source, /REQUIRED_EVIDENCE_UNAVAILABLE/);

  const runbookPath = new URL("../docs/active/COMMENT_TRANSLATOR_PAID_V1_RUNBOOK.md", import.meta.url);
  const authorityPath = new URL("../docs/active/COMMENT_TRANSLATOR_PAID_V1_GATE1_PRODUCTION_SUPABASE_READINESS.md", import.meta.url);
  const taskPath = new URL("../task.md", import.meta.url);
  assert.equal(fs.existsSync(runbookPath), true, "DOC_RUNBOOK_PRESENT");
  assert.equal(fs.existsSync(authorityPath), true, "DOC_AUTHORITY_PRESENT");
  assert.equal(fs.existsSync(taskPath), true, "DOC_TASK_BOARD_PRESENT");
  const runbook = fs.readFileSync(runbookPath, "utf8");
  const authority = fs.readFileSync(authorityPath, "utf8");
  const task = fs.readFileSync(taskPath, "utf8");
  const currentEndMarker = "<!-- gate1-current-readiness:end -->";
  const currentStartMarker = "<!-- gate1-current-readiness:start -->";
  const taskStatusFixture = "branch=codex/comment-translator-paid-v1-gate1-source-readiness source-scope=gate1-source-readiness verification=pending-review pending-evidence-scopes=Preview-apply,Production-apply,backup,Vault,Cron,hosted";

  assert.equal(validateRunbookCurrentReadiness(runbook), null, "DOC_RUNBOOK_VALID");
  for (const declaration of [
    "`GO`", "Gate 1: **GO**", "**GO**", "*GO*", "__GO__", "_GO_",
    "``GO``", "### GO", "- GO", "1. GO", "- **GO**",
    "`gate1_status=GO`", "**gate1_status**: **GO**"
  ]) {
    assert.equal(
      validateRunbookCurrentReadiness(runbook.replace(currentEndMarker, `\n${declaration}\n${currentEndMarker}`)),
      "DOC_RUNBOOK_PREMATURE_GO",
      "DOC_RUNBOOK_REJECTS_MARKDOWN_GO_APPEND"
    );
  }
  for (const boundary of [
    "`NO-GO`", "Gate 1: **NO-GO**", "### NO-GO", "- **NO-GO**",
    ...RUNBOOK_CURRENT_BOUNDARIES.map((value) => `**${value}**`)
  ]) {
    // Format existing boundary prose in place to keep required occurrences exact.
    const candidate = RUNBOOK_CURRENT_BOUNDARIES.some((value) => boundary === `**${value}**`)
      ? runbook.replace(boundary.slice(2, -2), boundary)
      : runbook.replace(currentEndMarker, `\n${boundary}\n${currentEndMarker}`);
    assert.equal(validateRunbookCurrentReadiness(candidate), null, "DOC_RUNBOOK_PRESERVES_NEGATIVE_BOUNDARY");
  }
  assert.equal(
    validateRunbookCurrentReadiness(`${runbook}\nTask 11 history: Gate 1: **GO**\n\`GO\``),
    null,
    "DOC_RUNBOOK_IGNORES_MARKDOWN_HISTORY_OUTSIDE_BLOCK"
  );
  assert.equal(
    validateRunbookCurrentReadiness(runbook.replace(currentStartMarker, "")),
    "DOC_RUNBOOK_BOUNDARY_MARKERS",
    "DOC_RUNBOOK_MISSING_START"
  );
  assert.equal(
    validateRunbookCurrentReadiness(runbook.replace(currentEndMarker, "")),
    "DOC_RUNBOOK_BOUNDARY_MARKERS",
    "DOC_RUNBOOK_MISSING_END"
  );
  assert.equal(
    validateRunbookCurrentReadiness(runbook.replace(currentStartMarker, `${currentStartMarker}\n${currentStartMarker}`)),
    "DOC_RUNBOOK_BOUNDARY_MARKERS",
    "DOC_RUNBOOK_DUPLICATE_START"
  );
  assert.equal(
    validateRunbookCurrentReadiness(runbook.replace("`gate1_status=NO-GO`", "")),
    "DOC_RUNBOOK_REQUIRED_MARKER",
    "DOC_RUNBOOK_MISSING_STATUS"
  );
  assert.equal(
    validateRunbookCurrentReadiness(runbook.replace("`gate1_status=NO-GO`", "`gate1_status=NO-GO` `gate1_status=NO-GO`")),
    "DOC_RUNBOOK_REQUIRED_MARKER",
    "DOC_RUNBOOK_DUPLICATE_STATUS"
  );
  assert.equal(
    validateRunbookCurrentReadiness(runbook.replace(currentStartMarker, "<!-- gate1-current-readiness:begin -->")),
    "DOC_RUNBOOK_BOUNDARY_MARKERS",
    "DOC_RUNBOOK_MALFORMED_START"
  );
  assert.equal(
    validateRunbookCurrentReadiness(runbook.replace("[Production Supabase readiness](COMMENT_TRANSLATOR_PAID_V1_GATE1_PRODUCTION_SUPABASE_READINESS.md)", "")),
    "DOC_RUNBOOK_AUTHORITY_LINK",
    "DOC_RUNBOOK_MISSING_LINK"
  );
  assert.equal(
    validateRunbookCurrentReadiness(runbook.replace(
      "[Production Supabase readiness](COMMENT_TRANSLATOR_PAID_V1_GATE1_PRODUCTION_SUPABASE_READINESS.md)",
      "[Production Supabase readiness](COMMENT_TRANSLATOR_PAID_V1_GATE1_PRODUCTION_SUPABASE_READINESS.md) [Production Supabase readiness](COMMENT_TRANSLATOR_PAID_V1_GATE1_PRODUCTION_SUPABASE_READINESS.md)"
    )),
    "DOC_RUNBOOK_AUTHORITY_LINK",
    "DOC_RUNBOOK_DUPLICATE_LINK"
  );
  assert.equal(
    validateRunbookCurrentReadiness(runbook.replace("gate1_status=NO-GO", "gate1_status=GO")),
    "DOC_RUNBOOK_PREMATURE_GO",
    "DOC_RUNBOOK_REJECTS_PREMATURE_GO"
  );
  assert.equal(
    validateRunbookCurrentReadiness(runbook.replace(currentEndMarker, "production-applied\n" + currentEndMarker)),
    "DOC_RUNBOOK_PRODUCTION_APPLIED",
    "DOC_RUNBOOK_REJECTS_PRODUCTION_APPLIED"
  );
  assert.equal(
    validateRunbookCurrentReadiness(runbook.replace(currentEndMarker, "backup-pass\n" + currentEndMarker)),
    "DOC_RUNBOOK_BACKUP_PASS",
    "DOC_RUNBOOK_REJECTS_BACKUP_PASS"
  );
  assert.equal(
    validateRunbookCurrentReadiness(runbook.replace(currentEndMarker, "Vault-configured\n" + currentEndMarker)),
    "DOC_RUNBOOK_VAULT_CONFIGURED",
    "DOC_RUNBOOK_REJECTS_VAULT_CONFIGURED"
  );
  assert.equal(
    validateRunbookCurrentReadiness(runbook.replace(currentEndMarker, "Cron-configured\n" + currentEndMarker)),
    "DOC_RUNBOOK_CRON_CONFIGURED",
    "DOC_RUNBOOK_REJECTS_CRON_CONFIGURED"
  );
  assert.equal(
    validateRunbookCurrentReadiness(`${runbook}\nTask 11 historical: GO production-applied backup-pass Vault-configured Cron-configured were not Gate 1 current evidence.`),
    null,
    "DOC_RUNBOOK_IGNORES_HISTORICAL_OUTSIDE_BLOCK"
  );
  assert.equal(
    validateRunbookCurrentReadiness(`${runbook}\nTask 11 history: task11_status=CLOSED task11_full_acceptance=PASS; this is not current Gate 1 evidence.`),
    null,
    "DOC_RUNBOOK_PRESERVES_TASK11_HISTORY"
  );
  assert.equal(validateAuthorityDocument(authority), null, "DOC_AUTHORITY_VALID");
  assert.equal(
    validateAuthorityDocument(authority.replace("gate1_status=NO-GO", "gate1_status=GO")),
    "DOC_AUTHORITY_STATUS",
    "DOC_AUTHORITY_REJECTS_POSITIVE_STATUS"
  );
  assert.equal(
    validateAuthorityDocument(authority.replace("source_artifact=UNCOMMITTED/UNKNOWN", "source_artifact=COMMITTED")),
    "DOC_AUTHORITY_STATUS",
    "DOC_AUTHORITY_REQUIRES_PENDING_SOURCE_ARTIFACT"
  );
  assert.equal(validateTaskBoardDocument(task), null, "DOC_TASK_BOARD_VALID");
  assert.equal(
    validateTaskBoardDocument(`${task}\nTask 11 history: task11_status=CLOSED task11_full_acceptance=PASS.`),
    null,
    "DOC_TASK_BOARD_IGNORES_HISTORICAL_TASK11"
  );
  assert.equal(validateTaskStatusFixture(taskStatusFixture), null, "DOC_TASK_FIXTURE_VALID");
  assert.equal(
    validateTaskStatusFixture(taskStatusFixture.replace("verification=pending-review ", "")),
    "DOC_TASK_FIXTURE_FIELD",
    "DOC_TASK_FIXTURE_REJECTS_MISSING_STATUS"
  );
  assert.equal(
    validateTaskStatusFixture(`${taskStatusFixture} verification=pending-review`),
    "DOC_TASK_FIXTURE_FIELD",
    "DOC_TASK_FIXTURE_REJECTS_DUPLICATE_STATUS"
  );

  console.log("operator-contract=pass approval-states=isolated remote-calls=0 mutations=0");
}

if (process.argv[1] && new URL(`file://${process.argv[1].replaceAll("\\", "/")}`).href === import.meta.url) runContract();
