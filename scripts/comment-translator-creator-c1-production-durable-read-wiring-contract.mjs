import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const billingPath = "lib/comment-translator-billing-runtime.ts";
const billingSource = fs.readFileSync(path.join(root, billingPath), "utf8");

assert.match(
  billingSource,
  /readCommentTranslatorC1ProductionBillingState/,
  "the server-owned billing snapshot reaches the C1 production read seam",
);

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { shortCircuit: true, url: "data:text/javascript,export{}" };
    }
    if (specifier === "./comment-translator-c1-container-boundary") {
      return {
        shortCircuit: true,
        url: pathToFileURL(
          path.join(root, "lib/comment-translator-c1-container-boundary.ts"),
        ).href,
      };
    }
    return nextResolve(specifier, context);
  },
});

const productionRead = await import(
  "../lib/comment-translator-c1-production-read.ts"
);
const syntheticEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL: "https://synthetic.invalid",
  SUPABASE_SERVICE_ROLE_KEY: "synthetic-service-role",
};
let bindingCount = 0;
let invocationCount = 0;
const namespace = {
  getByName(name) {
    bindingCount += 1;
    assert.equal(name, "creator-billing-entitlement-read-v1");
    return {
      async runAttempt(attemptKey, input) {
        invocationCount += 1;
        assert.match(attemptKey, /^[a-f0-9]{64}$/);
        const bytes = new Uint8Array(await new Response(input).arrayBuffer());
        assert.ok(bytes.byteLength > 12);
        return {
          executionStatus: "pass",
          resultStatus: "available",
          billingState: "paid-active",
          terminationStatus: "parent-and-child-exited-zero",
          parentExitCodeObserved: true,
          childExitCodeObserved: true,
          parentBufferZeroFillCount: 3,
          childBufferZeroFillCount: 3,
          childConstructionAttemptCount: 1,
          childReadAttemptCount: 1,
        };
      },
    };
  },
};

const active = await productionRead.readCommentTranslatorC1ProductionBillingState({
  billingUserReferenceId: `ctbill_${"a".repeat(24)}`,
  environment: syntheticEnvironment,
  containerNamespace: namespace,
});
assert.equal(active, "paid-active");
assert.deepEqual({ bindingCount, invocationCount }, { bindingCount: 1, invocationCount: 1 });

const missingInput = await productionRead.readCommentTranslatorC1ProductionBillingState({
  billingUserReferenceId: `ctbill_${"b".repeat(24)}`,
  environment: {},
  containerNamespace: namespace,
});
assert.equal(missingInput, "unavailable");
assert.deepEqual({ bindingCount, invocationCount }, { bindingCount: 1, invocationCount: 1 });

process.stdout.write(
  "comment_translator_creator_c1_production_durable_read_wiring_contract=pass\n",
);
