const ALLOWED_RESULTS = new Set(["available", "missing", "unavailable"]);
const ALLOWED_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "paused",
]);
const SELECT_COLUMNS = [
  "stripe_customer_reference_id",
  "stripe_subscription_reference_id",
  "subscription_status",
  "billing_state",
  "current_period_end",
  "evidence_source",
  "evidence_event_reference_id",
  "evidence_created_at",
  "evidence_recorded_at",
  "updated_at",
].join(",");
let activeController = null;

process.once("message", async (message) => {
  if (!isInputMessage(message)) {
    if (message !== null && typeof message === "object") {
      for (const value of Object.values(message)) {
        if (Buffer.isBuffer(value)) value.fill(0);
      }
    }
    process.exit(1);
  }

  const inputs = [message.endpoint, message.credential, message.billingReference];
  let constructionCount = 0;
  let readCount = 0;
  let resultStatus = "unavailable";
  let billingState = null;

  const wipeAndExit = (exitCode) => {
    for (const input of inputs) input.fill(0);
    process.exitCode = exitCode;
    process.disconnect();
  };

  process.once("SIGTERM", () => {
    activeController?.abort();
    for (const input of inputs) input.fill(0);
    process.exit(1);
  });

  try {
    constructionCount = 1;
    const reader = createReader(inputs);
    readCount = 1;
    const result = await reader.read();
    resultStatus = result.resultStatus;
    billingState = result.billingState;
  } catch {
    resultStatus = "unavailable";
  }

  const exitCode = resultStatus === "unavailable" ? 1 : 0;
  process.send?.({
    executionStatus: exitCode === 0 ? "pass" : "fail-closed",
    resultStatus,
    billingState: billingState ?? null,
    childBufferZeroFillCount: 3,
    childConstructionAttemptCount: constructionCount,
    childReadAttemptCount: readCount,
  }, () => wipeAndExit(exitCode));
});

function createReader(inputs) {
  const configured = process.env.C1_SYNTHETIC_RESULT;
  if (ALLOWED_RESULTS.has(configured)) {
    return Object.freeze({
      async read() {
        return {
          resultStatus: configured,
          billingState: configured === "available" ? "paid-active" : null,
        };
      },
    });
  }
  return createProductionReader(inputs);
}

function createProductionReader([endpoint, credential, billingReference]) {
  return Object.freeze({
    async read() {
      activeController = new AbortController();
      const baseUrl = new TextDecoder().decode(endpoint);
      const serviceRoleKey = new TextDecoder().decode(credential);
      const reference = new TextDecoder().decode(billingReference);
      const url = new URL("/rest/v1/comment_translator_paid_entitlements", baseUrl);
      url.searchParams.set("billing_user_reference_id", `eq.${reference}`);
      url.searchParams.set(
        "select",
        SELECT_COLUMNS,
      );
      url.searchParams.set("limit", "1");
      const response = await fetch(url, {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        signal: activeController.signal,
      });
      if (!response.ok) throw new Error();
      const rows = await response.json();
      if (!Array.isArray(rows) || rows.length > 1) throw new Error();
      if (rows.length === 0) {
        return { resultStatus: "missing", billingState: null };
      }
      const row = rows[0];
      const billingState = projectBillingState(row);
      if (!billingState) throw new Error();
      return {
        resultStatus: "available",
        billingState,
      };
    },
  });
}

function projectBillingState(row) {
  if (
    row === null
    || typeof row !== "object"
    || row.evidence_source !== "signed-stripe-webhook"
    || !nonempty(row.evidence_event_reference_id)
    || !validDate(row.evidence_created_at)
    || !nonempty(row.evidence_recorded_at)
    || !nonempty(row.updated_at)
    || !ALLOWED_SUBSCRIPTION_STATUSES.has(row.subscription_status)
    || !["paid-active", "paid-inactive"].includes(row.billing_state)
  ) return null;

  if (row.billing_state === "paid-inactive") return "paid-inactive";
  if (
    !["active", "trialing"].includes(row.subscription_status)
    || !nonempty(row.stripe_customer_reference_id)
    || !nonempty(row.stripe_subscription_reference_id)
    || !validDate(row.current_period_end)
  ) return null;
  return row.subscription_status === "active"
    && Date.parse(row.current_period_end) > Date.now()
    ? "paid-active"
    : "paid-inactive";
}

function nonempty(value) {
  return typeof value === "string" && value.length > 0;
}

function validDate(value) {
  return nonempty(value) && !Number.isNaN(Date.parse(value));
}

function isInputMessage(message) {
  return message !== null
    && typeof message === "object"
    && Object.keys(message).sort().join(",") === "billingReference,credential,endpoint"
    && [message.endpoint, message.credential, message.billingReference]
      .every((input) => Buffer.isBuffer(input) && input.length > 0);
}
