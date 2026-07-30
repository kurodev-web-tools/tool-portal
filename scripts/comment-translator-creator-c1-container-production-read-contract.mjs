import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";

const parentPath = path.join(
  process.cwd(),
  "containers/comment-translator-c1/parent.mjs",
);

for (const fixture of [
  {
    label: "paid-active",
    rows: [validRow({
      subscriptionStatus: "active",
      billingState: "paid-active",
      currentPeriodEnd: "2999-01-01T00:00:00.000Z",
    })],
    expectedResultStatus: "available",
    expectedBillingState: "paid-active",
  },
  {
    label: "paid-inactive",
    rows: [validRow({
      subscriptionStatus: "past_due",
      billingState: "paid-inactive",
      currentPeriodEnd: null,
    })],
    expectedResultStatus: "available",
    expectedBillingState: "paid-inactive",
  },
  {
    label: "missing",
    rows: [],
    expectedResultStatus: "missing",
    expectedBillingState: null,
  },
  {
    label: "unsigned-malformed",
    rows: [{
      subscription_status: "active",
      billing_state: "paid-active",
      current_period_end: "2999-01-01T00:00:00.000Z",
    }],
    expectedResultStatus: "unavailable",
    expectedBillingState: null,
  },
]) {
  let requestCount = 0;
  const server = http.createServer((request, response) => {
    requestCount += 1;
    assert.equal(request.method, "GET");
    assert.equal(request.headers.apikey !== undefined, true);
    assert.equal(request.headers.authorization !== undefined, true);
    const url = new URL(request.url ?? "/", "http://localhost");
    assert.equal(
      url.searchParams.get("select"),
      "stripe_customer_reference_id,stripe_subscription_reference_id,"
        + "subscription_status,billing_state,current_period_end,evidence_source,"
        + "evidence_event_reference_id,evidence_created_at,"
        + "evidence_recorded_at,updated_at",
    );
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(fixture.rows));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.notEqual(address, null);
  assert.equal(typeof address, "object");

  const result = await runParent(
    frame([
      `http://127.0.0.1:${address.port}`,
      "synthetic-service-role",
      `ctbill_${"a".repeat(24)}`,
    ]),
  );
  await new Promise((resolve) => server.close(resolve));

  assert.equal(
    result.exitCode,
    fixture.expectedResultStatus === "unavailable" ? 1 : 0,
    fixture.label,
  );
  assert.equal(requestCount, 1, fixture.label);
  assert.deepEqual(result.output, fixture.expectedResultStatus === "unavailable" ? {
    executionStatus: "fail-closed",
    resultStatus: "unavailable",
    billingState: null,
    terminationStatus: "child-failed",
    childExitCodeObserved: true,
    parentBufferZeroFillCount: 3,
    childBufferZeroFillCount: 3,
    childConstructionAttemptCount: 1,
    childReadAttemptCount: 1,
  } : {
    executionStatus: "pass",
    resultStatus: fixture.expectedResultStatus,
    billingState: fixture.expectedBillingState,
    terminationStatus: "child-exited-zero-parent-ready",
    childExitCodeObserved: true,
    parentBufferZeroFillCount: 3,
    childBufferZeroFillCount: 3,
    childConstructionAttemptCount: 1,
    childReadAttemptCount: 1,
  });
}

process.stdout.write(
  "comment_translator_creator_c1_container_production_read_contract=pass\n",
);

function runParent(input) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [parentPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    const stdout = [];
    const stderr = [];
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.once("error", reject);
    child.once("exit", (exitCode) => {
      assert.equal(Buffer.concat(stderr).length, 0);
      resolve({
        exitCode,
        output: JSON.parse(Buffer.concat(stdout).toString("utf8")),
      });
    });
    child.stdin.end(input);
  });
}

function frame(values) {
  return Buffer.concat(values.flatMap((value) => {
    const bytes = Buffer.from(value);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(bytes.length);
    return [length, bytes];
  }));
}

function validRow({ subscriptionStatus, billingState, currentPeriodEnd }) {
  return {
    stripe_customer_reference_id: "synthetic-customer",
    stripe_subscription_reference_id: "synthetic-subscription",
    subscription_status: subscriptionStatus,
    billing_state: billingState,
    current_period_end: currentPeriodEnd,
    evidence_source: "signed-stripe-webhook",
    evidence_event_reference_id: "synthetic-event",
    evidence_created_at: "2026-01-01T00:00:00.000Z",
    evidence_recorded_at: "2026-01-01T00:00:01.000Z",
    updated_at: "2026-01-01T00:00:02.000Z",
  };
}
