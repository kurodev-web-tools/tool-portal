export const PROPOSED_APPROVAL_ID =
  "C1-CONTAINERLESS-BILLING-PHASE2-STRICT-SOURCE-EQUIVALENCE-PROOF-3";
export const APPROVAL_ENV =
  "C1_PHASE2_STRICT_SOURCE_EQUIVALENCE_APPROVAL_ID";
export const AUTHORITY_ENV =
  "C1_PHASE2_MIGRATION_HISTORY_CURRENT_AUTHORITY";
export const CURRENT_AUTHORITY = "current-confirmed";
export const REVIEWED_BASE =
  "06a26c74bf0f7c910e3f79df97f260d3ce364090";
export const INTEGRATION_REF =
  "origin/codex/comment-translator-free-public-beta-integration";
export const CLI_VERSION = "2.109.0";
export const AUTHORITY_PROJECT_REF =
  "D:/V_streamer_tools/supabase/.temp/project-ref";
export const SQL_PATH =
  "scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof.sql";
export const SQL_BYTES = 60_706;
export const SQL_SHA256 =
  "f3448f70416bb87cce2e4a94bd75b76bf5e217e231a52edf1cd868c948e7e3f0";
export const CONTRACT_PATH =
  "scripts/comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract.mjs";
export const LOCAL_PROCESS_TIMEOUT_MS = 10_000;
export const TIMEOUT_MS = 60_000;
export const MAX_BUFFER = 1024 * 1024;

export const CANDIDATES = Object.freeze([
  Object.freeze({ order: "05", version: "20260623000000", path: "supabase/migrations/20260623000000_comment_translator_real_comments_feed_snapshots.sql", blob: "cead8d52e3361149f8476f3852263aabdc38b369", sha256: "618233207efc605f70d2c806ad2fc705052ec8db7eeed361defc3dfb0cca0522", bytes: 3474 }),
  Object.freeze({ order: "06", version: "20260624000000", path: "supabase/migrations/20260624000000_account_display_timezone_preference.sql", blob: "01352c948683ddffbc246b7ea26bb220e4465b3c", sha256: "e027e146d5094b5010fe35ba6201c66fb42a537daa7bf63c1f223e407418aae2", bytes: 701 }),
  Object.freeze({ order: "07", version: "20260705000000", path: "supabase/migrations/20260705000000_comment_translator_creator_waitlist_registrations.sql", blob: "86253c3d8751d01df1359dc6e407553d31419902", sha256: "037e3a72b20502e26e8c45e4d4227e25a1e4405b6bd28c39fcd246e4b7ddcfd0", bytes: 3318 }),
  Object.freeze({ order: "08", version: "20260706073204", path: "supabase/migrations/20260706073204_supabase_default_privileges_guard.sql", blob: "761e3e740c8e317a76da4c5bb9505060b7746ce5", sha256: "5454fc4ed5381eb29e11d573d0655b4c62172b6f46429d7a3222ebe03184291e", bytes: 1135 })
]);

export const TARGET = Object.freeze({
  version: "20260730000000",
  path: "supabase/migrations/20260730000000_comment_translator_c1_containerless_billing_read.sql",
  blob: "331db8095fc2ec09332718e9a5d05f62f26d18e8",
  sha256: "27c116aa8872c9c1a04d0a3d0accd2a214e3c28a961ca92c6cb3ba6d3115cd15",
  bytes: 22041
});

export const GATE_ABORTS = Object.freeze({
  "approval-gate": "triggered-approval-gate",
  "base-ref": "triggered-base-ref-mismatch",
  "candidate-identity": "triggered-candidate-identity-mismatch",
  "target-identity": "triggered-target-identity-mismatch",
  "cli-version": "triggered-cli-version-mismatch",
  "linked-metadata": "triggered-linked-metadata-mismatch",
  "linked-target": "triggered-linked-target-mismatch",
  "local-contract": "triggered-local-contract-failed"
});
export const LOCAL_GATE_IDS = Object.freeze(Object.keys(GATE_ABORTS).slice(1));

export const RUNNER_PRINT_KEYS = Object.freeze([
  "approval_id", "approval_gate_status", "reviewed_base_status",
  "candidate_identity_status", "target_binding_status", "cli_version_status",
  "linked_metadata_status", "linked_target_status", "local_contract_status",
  "strict_source_equivalence_matrix", "canonical_effect_equivalent_count",
  "absent_count", "partial_count", "conflicting_count", "unverifiable_count",
  "unknown_remote_migration_count", "default_privileges_security_goal_status",
  "remote_read_attempt_count", "remote_mutation_attempt_count",
  "migration_repair_attempt_count", "migration_apply_attempt_count",
  "execution_status", "sanitized_output_review_status", "abort_status",
  "unchecked_scope_status"
]);

export class GateFailure extends Error {
  constructor(gateId) {
    if (!Object.hasOwn(GATE_ABORTS, gateId)) {
      throw new TypeError("unknown local gate");
    }
    super("local gate failed");
    this.name = "GateFailure";
    this.gateId = gateId;
  }
}

export function createFutureCommand(file) {
  return {
    file,
    args: [
      "db", "query", "--linked", "--file", SQL_PATH,
      "--output-format", "json", "--agent", "no", "--log-level", "error"
    ]
  };
}

export function hasExactApproval(argv, env) {
  return argv.length === 3
    && argv[2] === "--execute-approved"
    && env[APPROVAL_ENV] === PROPOSED_APPROVAL_ID
    && env[AUTHORITY_ENV] === CURRENT_AUTHORITY;
}

export function createSanitizedContractEnv(env) {
  const sanitized = { ...env };
  delete sanitized[APPROVAL_ENV];
  delete sanitized[AUTHORITY_ENV];
  return sanitized;
}

export function createLocalContractInvocation(root, env) {
  return {
    file: process.execPath,
    args: [CONTRACT_PATH],
    options: {
      cwd: root,
      encoding: "utf8",
      env: createSanitizedContractEnv(env),
      timeout: TIMEOUT_MS,
      maxBuffer: MAX_BUFFER,
      windowsHide: true,
      stdio: "ignore"
    }
  };
}

export function runLocalContract(root, env, spawn) {
  const invocation = createLocalContractInvocation(root, env);
  let result;
  try {
    result = spawn(invocation.file, invocation.args, invocation.options);
  } catch (error) {
    if (error instanceof GateFailure) throw error;
    throw new GateFailure("local-contract");
  }
  if (
    result?.status !== 0
    || result.error !== undefined
    || result.signal != null
  ) {
    throw new GateFailure("local-contract");
  }
}

export function runOrderedLocalGates(checks) {
  for (const gateId of LOCAL_GATE_IDS) {
    try {
      if (checks[gateId]?.() !== true) throw new GateFailure(gateId);
    } catch (error) {
      if (error instanceof GateFailure) throw error;
      throw new GateFailure(gateId);
    }
  }
}
