import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only" || specifier === "@supabase/supabase-js") {
      return { shortCircuit: true, url: `data:text/javascript,export const createClient=()=>({});export default {};#${encodeURIComponent(specifier)}` };
    }
    if (specifier.startsWith("@/")) {
      const candidate = path.join(root, `${specifier.slice(2)}.ts`);
      if (fs.existsSync(candidate)) return { shortCircuit: true, url: pathToFileURL(candidate).href };
    }
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL);
      if (fs.existsSync(candidate)) return { shortCircuit: true, url: candidate.href };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) {
      return {
        format: "module",
        shortCircuit: true,
        source: stripTypeScriptTypes(fs.readFileSync(new URL(url), "utf8"), { mode: "transform", sourceMap: false })
      };
    }
    return nextLoad(url, context);
  }
});

const runtimeSource = read("lib/comment-translator-billing-runtime.ts");
const reconcilerSource = read("lib/comment-translator-paid-control-plane-reconciler.ts");
const regionSource = read("lib/comment-translator-paid-region-gate.ts");
const billingShell = read("components/account/AccountBillingShell.tsx");
const billingActions = read("app/account/billing/actions.ts");
const legalContent = read("lib/legal-content.ts");
const canonicalMetadataSources = [
  [read("app/page.tsx"), "/"],
  [read("app/tools/page.tsx"), "/tools"],
  [read("app/account/billing/page.tsx"), "/account/billing"],
  [read("app/legal/tokushoho/page.tsx"), "/legal/tokushoho/"]
];
const spec = read("docs/active/COMMENT_TRANSLATOR_PAID_V1_REDESIGN_SPEC.md");
const breakdown = read("docs/active/COMMENT_TRANSLATOR_PAID_V1_REDESIGN_TASK_BREAKDOWN.md");
const runbook = read("docs/active/COMMENT_TRANSLATOR_PAID_V1_RUNBOOK.md");
const task = read("task.md");
const publicSurface = `${billingShell}\n${legalContent}`;
const authoritySurface = `${spec}\n${breakdown}\n${runbook}\n${task}`;

for (const [source, canonicalPath] of canonicalMetadataSources) {
  assert.match(
    source,
    new RegExp(`alternates:\\s*{\\s*canonical:\\s*"${canonicalPath}"`),
    `${canonicalPath} publishes an environment-relative canonical URL`
  );
}

for (const marker of [
  "US$6/月（支払総額・USD請求）",
  "US$6/month (total price, billed in USD)",
  "適用される税がある場合はStripe Checkoutで表示されます。",
  "Any applicable tax is shown in Stripe Checkout."
]) {
  assert.ok(publicSurface.includes(marker), `public copy includes canonical marker: ${marker}`);
}
const expectedCheckoutDisclosures = [
  "Checkout直前: US$6/月（支払総額・USD請求）。自動更新です。適用される税がある場合はStripe Checkoutで表示されます。契約更新周期あたり最大500,000入力文字ですが保証値ではなく、解約は次回更新日に反映します。コメント本文は翻訳処理のためOpenAIまたはAzureへ送信されます。",
  "Immediately before Checkout: US$6/month (total price, billed in USD). Automatic renewal applies. Any applicable tax is shown in Stripe Checkout. Up to 500,000 input characters per contract renewal period is not guaranteed, and cancellation takes effect at the next renewal. Comment text is sent to OpenAI or Azure for translation processing."
];
assert.deepEqual(
  expectedCheckoutDisclosures.filter((disclosure) => !billingShell.includes(disclosure)),
  [],
  "JA/EN Checkout disclosures separate automatic renewal from the canonical price"
);
assert.doesNotMatch(publicSurface, /税込|tax inclusive/i, "public Paid copy makes no tax-inclusive claim");
assert.doesNotMatch(publicSurface, /適格請求書|T番号|qualified invoice|registration number/i, "public Paid copy makes no qualified-invoice claim");
assert.match(runtimeSource, /totalPrice:\s*true/, "Free and Paid browser-safe price shapes use totalPrice without a tax claim");
assert.doesNotMatch(runtimeSource, /taxInclusive:\s*true/, "browser-safe price shape no longer exposes taxInclusive=true");

const runtime = await import(pathToFileURL(path.join(root, "lib/comment-translator-billing-runtime.ts")).href);
assert.equal(typeof runtime.resolveCommentTranslatorPaidTaxConfiguration, "function", "runtime exports one shared tax resolver");
assert.equal(typeof runtime.resolveCommentTranslatorPaidNewCheckoutSettings, "function", "runtime exports one shared new-Checkout settings resolver");

const taxEnv = (automaticTax, registrationReady) => ({
  COMMENT_TRANSLATOR_PAID_AUTOMATIC_TAX_ENABLED: automaticTax,
  COMMENT_TRANSLATOR_PAID_TAX_REGISTRATION_READY: registrationReady
});
assert.deepEqual(
  runtime.resolveCommentTranslatorPaidTaxConfiguration(taxEnv("false", "false")),
  { status: "ready", mode: "monitoring-only", automaticTax: false },
  "monitoring-only mode sends automaticTax=false"
);
assert.deepEqual(
  runtime.resolveCommentTranslatorPaidTaxConfiguration(taxEnv("true", "true")),
  { status: "ready", mode: "registered-ready", automaticTax: true },
  "registered-ready mode sends automaticTax=true"
);
for (const [automaticTax, registrationReady] of [
  ["true", "false"], ["false", "true"], [undefined, "false"], ["false", undefined],
  [" true", "true"], ["true ", "true"], ["TRUE", "true"], ["1", "false"], ["on", "false"], ["", "false"]
]) {
  assert.deepEqual(
    runtime.resolveCommentTranslatorPaidTaxConfiguration(taxEnv(automaticTax, registrationReady)),
    { status: "invalid", reason: "tax-settings-stopped" },
    `invalid tax attestation fails closed: ${String(automaticTax)}/${String(registrationReady)}`
  );
}

const checkoutEnv = {
  COMMENT_TRANSLATOR_PAID_CHECKOUT_ENABLED: "true",
  COMMENT_TRANSLATOR_PAID_US_CHECKOUT_ENABLED: "true",
  ...taxEnv("false", "false")
};
assert.deepEqual(
  runtime.resolveCommentTranslatorPaidNewCheckoutSettings({ regionGate: { status: "allowed", country: "JP" }, env: checkoutEnv }),
  { status: "ready", automaticTax: false },
  "JP Checkout is admitted in monitoring-only mode"
);
assert.deepEqual(
  runtime.resolveCommentTranslatorPaidNewCheckoutSettings({ regionGate: { status: "allowed", country: "US" }, env: checkoutEnv }),
  { status: "ready", automaticTax: false },
  "US Checkout is admitted only with the explicit US switch"
);
for (const value of ["false", undefined, "true ", "1", "on", "TRUE", ""]) {
  const env = { ...checkoutEnv, COMMENT_TRANSLATOR_PAID_US_CHECKOUT_ENABLED: value };
  if (value === undefined) delete env.COMMENT_TRANSLATOR_PAID_US_CHECKOUT_ENABLED;
  assert.deepEqual(
    runtime.resolveCommentTranslatorPaidNewCheckoutSettings({ regionGate: { status: "allowed", country: "US" }, env }),
    { status: "stopped", reason: "us-checkout-stopped" },
    `US switch ${String(value)} stops new US Checkout`
  );
  assert.deepEqual(
    runtime.resolveCommentTranslatorPaidNewCheckoutSettings({ regionGate: { status: "allowed", country: "JP" }, env }),
    { status: "ready", automaticTax: false },
    "the US switch does not affect JP Checkout"
  );
}

for (const marker of ["tax-settings-stopped", "us-checkout-stopped"]) {
  assert.ok(runtimeSource.includes(marker), `runtime exposes sanitized state ${marker}`);
  assert.ok(billingShell.includes(marker), `billing UI explains sanitized state ${marker}`);
}
const checkoutFunction = runtimeSource.slice(runtimeSource.indexOf("export async function createCommentTranslatorStripeCheckoutSessionResult"));
assert.ok(
  checkoutFunction.indexOf("resolveCommentTranslatorPaidTaxConfiguration") < checkoutFunction.indexOf("stripeAdapter.createCustomer"),
  "tax configuration stops before Stripe Customer creation"
);
assert.ok(
  checkoutFunction.indexOf("resolveCommentTranslatorPaidTaxConfiguration") < checkoutFunction.indexOf("entitlementStore.beginCheckout"),
  "tax configuration stops before hold creation"
);
assert.match(runtimeSource, /automaticTax:\s*boolean/, "Checkout parameters carry a boolean automaticTax value");
assert.match(runtimeSource, /automatic_tax\[enabled\][\s\S]{0,120}String\(params\.automaticTax\)/, "Stripe adapter forwards automaticTax as true or false");
assert.doesNotMatch(runtimeSource, /params\.automaticTax\s*!==\s*true/, "Stripe adapter no longer rejects automaticTax=false");
assert.match(reconcilerSource, /resolveCommentTranslatorPaidTaxConfiguration/, "unbound recovery reuses the shared tax resolver");
assert.match(reconcilerSource, /tax-settings-stopped|binding-not-ready/, "invalid tax settings stop unbound Session creation retryably");

assert.match(spec, /tax_behavior=inclusive|tax_behavior`?\s*[:=]?\s*`?inclusive/i, "USD 600 monthly Price retains inclusive tax behavior");
assert.match(billingActions, /createCommentTranslatorStripePortalSessionResult/, "Portal remains a separate action");
const portalFunction = runtimeSource.slice(runtimeSource.indexOf("export async function createCommentTranslatorStripePortalSessionResult"));
assert.doesNotMatch(portalFunction, /US_CHECKOUT_ENABLED|AUTOMATIC_TAX_ENABLED|TAX_REGISTRATION_READY/, "Portal is not gated by new-Checkout tax settings");

for (const marker of ["normal", "approaching", "needs-attention", "legal-review-required", "monitoring-unavailable-or-stale"]) {
  assert.ok(runbook.includes(marker), `runbook includes monitoring state ${marker}`);
}
assert.match(runbook, /最大7日|up to 7 days/i, "runbook records Monitoring delay of up to seven days");
assert.match(runbook, /threshold exceeded|閾値超過/i, "runbook forbids waiting for threshold exceeded");
assert.match(runbook, /US.*新規Checkout.*停止|新規Checkout.*US.*停止/i, "runbook stops all new US Checkout conservatively");
assert.match(runbook, /既存.*Subscription|existing subscription/i, "runbook preserves existing subscriptions");
assert.match(runbook, /自動解約|自動.*返金|automatic cancel|automatic refund/i, "runbook forbids automatic cancel/refund");
assert.match(runbook, /発行済み.*Checkout|in-flight/i, "runbook records the issued Session and in-flight hold residual");

assert.match(regionSource, /persistence:\s*"forbidden"/, "country authority remains non-persistent");
assert.doesNotMatch(`${runtimeSource}\n${regionSource}`, /localStorage|sessionStorage|indexedDB/i, "billing runtime does not persist country or address in browser storage");
assert.match(authoritySurface, /Gate 0[\s\S]{0,120}Task 11|G0\s*->\s*T11/, "Gate 0 overall remains the Task 11 dependency");
assert.match(authoritySurface, /entry=false|成立扱いにしない|未成立/, "Task 11 entry remains false until implementation, Preview apply, and re-verification");

console.log("comment translator Paid Core v1 Task 11 tax/Checkout policy contract checks passed");
