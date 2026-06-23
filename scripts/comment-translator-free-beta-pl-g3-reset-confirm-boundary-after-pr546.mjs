#!/usr/bin/env node
import process from "node:process";

const args = new Set(process.argv.slice(2));
const approvalLabel = "approved-pl-g3-test-account-usage-session-reset-after-pr546";
const approvalFlag = "--approved-pl-g3-reset-confirm-boundary-after-pr546";
const commandLabel = "pl-g3-test-account-usage-session-reset-after-pr546";
const sessionTable = "comment_translator_sessions";
const usageLedgerTable = "comment_translator_usage_ledger_events";

const requiredEnvReferences = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "COMMENT_TRANSLATOR_RESET_TEST_ACCOUNT_OWNER_USER_ID"
];

function hasEnvReference(name) {
  return typeof process.env[name] === "string" && process.env[name].trim().length > 0;
}

function envValue(name) {
  return process.env[name]?.trim() ?? "";
}

function isPlaceholderReferenceValue(name) {
  const value = envValue(name);
  return /^<.*>$/.test(value) || /\bdo not paste\b/i.test(value) || /\bset locally\b/i.test(value);
}

function writeJson(payload, exitCode) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exitCode = exitCode;
}

function basePayload() {
  return {
    commandLabel,
    outputPolicy: "sanitized-labels-and-counts-only",
    resetScopeLabel: "test-account-free-beta-session-usage-limiter-state-only",
    sessionLimiterTableLabel: sessionTable,
    usageLimiterTableLabel: usageLedgerTable,
    rawRowsPrintedLabel: "no",
    rawIdsPrintedLabel: "no",
    rawTimesPrintedLabel: "no",
    rawUrlsPrintedLabel: "no",
    quotaValuesPrintedLabel: "no",
    startCommandExecutedLabel: "no",
    stopCommandExecutedLabel: "no",
    liveProviderExecutionLabel: "not-run",
    publicGateStateLabel: "unchanged / blocked",
    publicReleaseCapableLabel: "no"
  };
}

function referenceReport() {
  const missingEnvReferences = requiredEnvReferences.filter((name) => !hasEnvReference(name));
  const placeholderReferences = requiredEnvReferences.filter((name) => isPlaceholderReferenceValue(name));
  return {
    missingEnvReferences,
    placeholderReferences
  };
}

function writeCommandReview() {
  writeJson(
    {
      ...basePayload(),
      resetStatusLabel: "review-only-not-run",
      exactApprovalLabelRequired: approvalLabel,
      requiredFlag: approvalFlag,
      requiredEnvReferences: [
        "NEXT_PUBLIC_SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "COMMENT_TRANSLATOR_RESET_TEST_ACCOUNT_OWNER_USER_ID",
        "PL_G3_TEST_ACCOUNT_USAGE_SESSION_RESET_APPROVAL_LABEL"
      ],
      reviewedCommandShape: [
        "node scripts/comment-translator-free-beta-pl-g3-reset-confirm-boundary-after-pr546.mjs --check-env-only",
        "node scripts/comment-translator-free-beta-pl-g3-reset-confirm-boundary-after-pr546.mjs --print-exact-command-review",
        "node scripts/comment-translator-free-beta-pl-g3-reset-confirm-boundary-after-pr546.mjs --execute --approved-pl-g3-reset-confirm-boundary-after-pr546 --json"
      ],
      resetMutationShape: [
        "delete rows for the test account from comment_translator_usage_ledger_events",
        "delete rows for the test account from comment_translator_sessions"
      ],
      statusOnlyVerificationRequiredAfterReset: true,
      startToTranslationRetryRequiresSeparateApproval: true
    },
    0
  );
}

if (args.has("--print-exact-command-review")) {
  writeCommandReview();
} else {
  const report = referenceReport();

  if (report.missingEnvReferences.length > 0) {
    writeJson(
      {
        ...basePayload(),
        resetStatusLabel: "blocked-missing-env-references",
        missingEnvReferences: report.missingEnvReferences,
        remoteMutationLabel: "not-run"
      },
      2
    );
  } else if (report.placeholderReferences.length > 0) {
    writeJson(
      {
        ...basePayload(),
        resetStatusLabel: "blocked-placeholder-env-references",
        placeholderReferences: report.placeholderReferences,
        remoteMutationLabel: "not-run"
      },
      2
    );
  } else if (args.has("--check-env-only")) {
    writeJson(
      {
        ...basePayload(),
        resetStatusLabel: "ready-for-exact-approval",
        missingEnvReferences: [],
        remoteMutationLabel: "not-run"
      },
      0
    );
  } else if (!args.has("--execute")) {
    writeJson(
      {
        ...basePayload(),
        resetStatusLabel: "blocked-pending-explicit-execute-flag",
        requiredFlag: "--execute",
        remoteMutationLabel: "not-run"
      },
      2
    );
  } else if (!args.has(approvalFlag) || envValue("PL_G3_TEST_ACCOUNT_USAGE_SESSION_RESET_APPROVAL_LABEL") !== approvalLabel) {
    writeJson(
      {
        ...basePayload(),
        resetStatusLabel: "blocked-pending-exact-approval",
        requiredApprovalLabel: approvalLabel,
        requiredFlag: approvalFlag,
        approvalEnvReferenceLabel: "missing-or-mismatched",
        remoteMutationLabel: "not-run"
      },
      2
    );
  } else {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(envValue("NEXT_PUBLIC_SUPABASE_URL"), envValue("SUPABASE_SERVICE_ROLE_KEY"), {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
      const ownerUserId = envValue("COMMENT_TRANSLATOR_RESET_TEST_ACCOUNT_OWNER_USER_ID");
      const usageDelete = await deleteRowsForOwner({
        supabase,
        tableName: usageLedgerTable,
        ownerUserId
      });
      const sessionDelete = await deleteRowsForOwner({
        supabase,
        tableName: sessionTable,
        ownerUserId
      });

      if (usageDelete.status !== "passed" || sessionDelete.status !== "passed") {
        writeJson(
          {
            ...basePayload(),
            resetStatusLabel: "failed-sanitized",
            usageLedgerResetStatusLabel: usageDelete.status,
            sessionResetStatusLabel: sessionDelete.status,
            sessionRowsTouchedCount: sessionDelete.count,
            usageLedgerRowsTouchedCount: usageDelete.count,
            remoteMutationLabel: "attempted-reset-only"
          },
          1
        );
      } else {
        writeJson(
          {
            ...basePayload(),
            resetStatusLabel: "passed",
            usageLedgerResetStatusLabel: "passed",
            sessionResetStatusLabel: "passed",
            sessionRowsTouchedCount: sessionDelete.count,
            usageLedgerRowsTouchedCount: usageDelete.count,
            remoteMutationLabel: "completed-reset-only",
            statusOnlyVerificationRequiredNext: true
          },
          0
        );
      }
    } catch {
      writeJson(
        {
          ...basePayload(),
          resetStatusLabel: "failed-sanitized",
          sessionRowsTouchedCount: 0,
          usageLedgerRowsTouchedCount: 0,
          remoteMutationLabel: "attempted-reset-only"
        },
        1
      );
    }
  }
}

async function deleteRowsForOwner({ supabase, tableName, ownerUserId }) {
  const result = await supabase.from(tableName).delete({ count: "exact" }).eq("owner_user_id", ownerUserId).select("id", {
    count: "exact"
  });
  if (result.error) {
    return {
      status: "failed-sanitized",
      count: 0
    };
  }

  return {
    status: "passed",
    count: typeof result.count === "number" ? result.count : Array.isArray(result.data) ? result.data.length : 0
  };
}
