import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

const paths = {
  billingRuntime: "lib/comment-translator-billing-runtime.ts",
  pollBudgetGate: "lib/comment-translator-paid-poll-budget-gate.ts",
  billingPage: "app/account/billing/page.tsx",
  accountPage: "app/account/page.tsx",
  billingActions: "app/account/billing/actions.ts",
  billingShell: "components/account/AccountBillingShell.tsx",
  accountShell: "components/account/AccountPreferencesShell.tsx",
  usageSidebar: "components/comment-translator/CommentTranslatorUsageSidebar.tsx",
  dockHeader: "components/comment-translator/CommentTranslatorDockHeader.tsx",
  dockModel: "components/comment-translator/comment-translator-dock-model.ts",
  dockFormat: "components/comment-translator/comment-translator-dock-format.ts",
  publicEntitlement: "lib/comment-translator-public-entitlement-baseline.ts",
  usageDisplay: "lib/comment-translator-free-beta-usage-display.ts",
  sessionActions: "app/tools/comment-translator/session-actions.ts",
  feedActions: "app/tools/comment-translator/feed-actions.ts",
  copyJa: "lib/comment-translator-copy-ja.json",
  copyEn: "lib/comment-translator-copy-en.json"
};

for (const [label, relativePath] of Object.entries(paths)) {
  assert.ok(exists(relativePath), `${label} exists: ${relativePath}`);
}

const source = Object.fromEntries(
  Object.entries(paths).map(([label, relativePath]) => [label, read(relativePath)])
);
const copyJa = JSON.parse(source.copyJa);
const copyEn = JSON.parse(source.copyEn);

assert.match(
  source.billingRuntime,
  /commentTranslatorPaidV1Task8BillingUiContract/,
  "Task 8 exports the billing UI contract"
);
assert.match(source.billingRuntime, /Kuro Live Comment Translator Plus/, "the only Paid product name is canonical");
assert.match(source.billingRuntime, /monthlyAmount:\s*6/, "the Paid price is six USD per month");
assert.match(source.billingRuntime, /yearlyAmount:\s*null/, "the browser model has no yearly Paid price");
assert.match(source.billingRuntime, /totalPrice:\s*true/, "the model records total price without a tax claim");
assert.doesNotMatch(source.billingRuntime, /taxInclusive:\s*true/, "the browser-safe model does not make a tax-inclusive claim");
assert.match(source.billingRuntime, /automaticRenewal|auto-renew|automatic renewal/, "the model records automatic renewal");
assert.match(source.billingRuntime, /server-derived|serverDerived|server-owned/, "billing gates are server-derived");
for (const marker of [
  "region-unavailable",
  "unsupported-region",
  "capacity-full",
  "settings-stopped",
  "payment-stopped",
  "lifecycle-processing",
  "poll-budget",
  "infra"
]) {
  assert.ok(source.billingRuntime.includes(marker), `billing UI records ${marker}`);
}
for (const marker of ["500_000", "paidBillingPeriod", "individualCost", "globalCost"]) {
  assert.ok(source.billingRuntime.includes(marker), `billing UI records ${marker}`);
}
assert.match(source.billingRuntime, /consentVersions|termsVersion/, "exact consent document versions reach the browser-safe form");
assert.match(source.billingRuntime, /portalAvailable/, "Portal availability remains separate from Checkout consent");
assert.match(source.billingRuntime, /isCommentTranslatorBillingPortalAvailable[\s\S]{0,500}STRIPE_SECRET_KEY/, "Portal availability requires server Stripe configuration");
assert.match(source.billingRuntime, /portal = await stripeAdapter\.createPortalSession[\s\S]{0,500}catch[\s\S]{0,300}portal-payment-method-update/, "Portal adapter failures converge to a sanitized unavailable result");
assert.match(source.billingRuntime, /lifecycle\.lifecycleState === "past_due"[\s\S]{0,1200}catch[\s\S]{0,300}portal-payment-method-update/, "existing past_due convergence also catches Portal adapter failures");
assert.match(source.billingRuntime, /COMMENT_TRANSLATOR_PAID_CHECKOUT_ENABLED/, "Checkout settings are rechecked on the server");
assert.match(source.billingRuntime, /reason:\s*"settings-stopped"/, "server settings can stop Checkout");
assert.match(
  source.billingRuntime,
  /readExplicitBooleanEnv\(env\.COMMENT_TRANSLATOR_PAID_CHECKOUT_ENABLED\)\s*!==\s*true/,
  "Checkout proceeds only when its kill switch is explicitly true"
);
assert.match(source.billingRuntime, /value\s*===\s*"true"/, "Checkout kill switch accepts only the exact explicit true value");
assert.doesNotMatch(source.billingRuntime, /\["true",\s*"1",\s*"on"\]/, "Checkout kill switch does not treat aliases as enabled");
assert.match(source.billingRuntime, /resolveCommentTranslatorPaidPollBudgetGate/, "Checkout reuses the Paid poll-budget gate");
assert.match(source.pollBudgetGate, /ratio\s*>=\s*0\.8/, "the shared gate stops Checkout at the 80 percent threshold");
assert.match(source.pollBudgetGate, /additionalReservedPolls/, "the shared gate accounts for the pending new-session reservation");
assert.match(source.billingRuntime, /additionalReservedPolls:\s*720/, "Checkout projects the full new Paid session reservation before the 80 percent stop");
assert.match(source.billingRuntime, /reason:[\s\S]{0,120}"poll-budget-stop"/, "unreadable or stopped poll authority blocks Checkout");
assert.match(source.billingRuntime, /checkoutSafetyAuthorityReader/, "billing state accepts only a server-side checkout safety authority reader");
assert.match(source.billingRuntime, /createDefaultCommentTranslatorBillingCheckoutSafetyAuthorityReader/, "production billing paths wire the trusted safety reader by default");
assert.match(source.billingRuntime, /comment_translator_paid_capacity_(?:config|reservations)/, "capacity-full state comes from server-side capacity authority");
assert.match(source.billingRuntime, /select\("capacity_limit, poll_limit"\)/, "Checkout safety reads the existing server-side poll limit");
assert.match(
  source.billingRuntime,
  /COMMENT_TRANSLATOR_PAID_POLL_DAILY_BUDGET/,
  "a missing UTC-day poll bucket uses the trusted daily poll-budget configuration"
);
assert.match(
  source.billingRuntime,
  /authority\.dailyBudget\s*===\s*null\s*\?\s*0\s*:\s*authority\.reservedPolls/,
  "a missing UTC-day poll bucket starts with zero reserved polls"
);
assert.doesNotMatch(
  source.billingRuntime,
  /authority\.dailyBudget\s*===\s*null\s*\?\s*pollLimit\s*:\s*authority\.dailyBudget/,
  "a per-session poll limit is not used as the daily poll budget"
);
assert.match(
  source.billingRuntime,
  /checkoutConfig\.status\s*===\s*"missing"[\s\S]{0,500}createCommentTranslatorBillingSnapshotFromDurableState/,
  "missing Checkout settings preserve a confirmed durable Paid billing state"
);
assert.match(
  source.billingRuntime,
  /const reservationCount = capacityReservationsResult\.count;[\s\S]{0,1800}typeof reservationCount !== "number"[\s\S]{0,1200}const effectiveReservationCount = reservationCount - \(capacityReservationAlreadyHeld \? 1 : 0\);[\s\S]{0,300}effectiveReservationCount < capacityLimit/,
  "Supabase nullable count is narrowed locally before the capacity comparison"
);
assert.match(source.billingRuntime, /checkoutRetryAtIso:\s*string\s*\|\s*null/, "browser-safe billing state exposes only a sanitized retry timestamp");
assert.doesNotMatch(source.billingRuntime, /void lastActionReason/, "billing projection does not silently discard an action reason");
const checkoutFunction = source.billingRuntime.slice(source.billingRuntime.indexOf("export async function createCommentTranslatorStripeCheckoutSessionResult"));
assert.ok(
  checkoutFunction.indexOf("readCommentTranslatorBillingCheckoutSafetyGate") < checkoutFunction.indexOf("stripeAdapter.createCustomer"),
  "Checkout safety authority is checked before a Stripe Customer can be created"
);
assert.ok(
  checkoutFunction.indexOf("readCommentTranslatorBillingCheckoutSafetyGate") < checkoutFunction.indexOf("entitlementStore.beginCheckout"),
  "Checkout safety authority is checked before a billing hold can begin"
);
assert.match(source.billingRuntime, /uiState:\s*checkoutSafetyGate\.uiState/, "billing page projection consumes the trusted checkout safety state");
assert.match(
  source.billingRuntime,
  /CommentTranslatorBillingBrowserSafeViewModel\s*=\s*Omit<[\s\S]{0,260}billingUserReferenceId/,
  "private billing identifiers are omitted from the browser-safe view model"
);

assert.match(source.billingPage, /readCommentTranslatorPaidRegionFromCloudflareContext/, "the page reads the server region authority");
assert.match(source.billingPage, /readCommentTranslatorBilling.*BrowserSafe|createCommentTranslatorBilling.*ViewModel/, "the page consumes a server-built browser-safe billing view");
assert.doesNotMatch(source.billingPage, /lastActionReason:\s*params\?\.billing/, "browser query parameters are not billing-state authority");
assert.match(source.accountPage, /createCommentTranslatorBillingPageBrowserSafeViewModel/, "the account summary reads the durable browser-safe billing projection");
assert.match(source.accountPage, /readCommentTranslatorPaidRegionFromCloudflareContext/, "the account summary uses the trusted server region authority");
assert.doesNotMatch(source.accountPage, /readCommentTranslatorBillingEntitlementSnapshot|createCommentTranslatorBillingBrowserSafeViewModel/, "the account summary does not use the legacy Free-only billing reader");

assert.match(source.billingActions, /readCommentTranslatorPaidCheckoutConsentInput\(formData\)/, "Checkout action reads the consent form input");
assert.match(source.billingActions, /readCommentTranslatorPaidRegionFromCloudflareContext/, "Checkout action re-checks the server region");
assert.match(source.billingActions, /createCommentTranslatorStripeCheckoutSessionResult/, "Checkout still delegates to the existing server action");
assert.match(source.billingActions, /createCommentTranslatorStripePortalSessionResult/, "Portal still delegates to the existing server action");
assert.doesNotMatch(source.billingActions, /createCommentTranslatorPaidCheckoutConsentInput\(formData\)[\s\S]{0,120}createCommentTranslatorStripePortalSessionResult/, "Portal does not depend on Checkout consent");

assert.doesNotMatch(source.billingShell, /Free \/ Paid Core v1 unavailable|Paid Core v1 unavailable/, "the obsolete Paid name is removed from billing UI");
assert.doesNotMatch(source.accountShell, /Free \/ Paid Core v1 unavailable|Paid Core v1 unavailable/, "the obsolete Paid name is removed from account UI");
assert.match(source.accountShell, /Kuro Live Comment Translator Plus/, "the account UI uses the canonical Paid product name");
assert.match(source.accountShell, /status:\s*billingStatusLabel/, "the account summary preserves paid-inactive instead of mapping it back to Free");
for (const marker of [
  "Kuro Live Comment Translator Plus",
  "US$6",
  "支払総額",
  "USD",
  "自動更新",
  "500,000",
  "個人",
  "全体",
  "円換算",
  "termsChecked",
  "termsVersion",
  "paidConditionsChecked",
  "href=\"/terms\"",
  "href=\"/privacy\"",
  "comment-translator-paid-conditions",
  "OpenAI",
  "Azure",
  "支払い方法",
  "請求履歴",
  "期間終了"
]) {
  assert.ok(source.billingShell.includes(marker), `billing UI includes ${marker}`);
}
for (const marker of ["capacity-full", "region-unavailable", "settings-stopped", "us-checkout-stopped", "tax-settings-stopped", "payment-stopped", "lifecycle-processing", "poll-budget"]) {
  assert.ok(source.billingShell.includes(marker), `billing UI distinguishes ${marker}`);
}
assert.match(source.billingRuntime, /finalCheckoutSafetyGate/, "Checkout has a final server-side safety recheck before Stripe");
assert.match(source.billingRuntime, /resolvedCheckoutSafetyAuthorityReader/, "Checkout reuses one server-side safety authority for the final recheck");
for (const marker of [
  "sanitized feed snapshot",
  "セッション終了後最大24時間",
  "Provider request detail",
  "Provider側では各社の処理・保持方針"
]) {
  assert.ok(source.billingShell.includes(marker), `billing consent copy discloses ${marker}`);
}
assert.match(source.billingShell, /billing\.billingState\s*===\s*["']paid-active["']/, "active Paid billing state has a distinct non-purchase status projection");

assert.match(source.usageSidebar, /data-comment-translator-paid-usage/, "usage sidebar has a Paid-specific safe display boundary");
for (const marker of ["paid", "nextResetAtIso", "providerRoute", "azure", "individual", "global", "billingPeriod"]) {
  assert.ok(source.usageSidebar.includes(marker), `usage sidebar includes ${marker}`);
}
assert.match(source.dockModel, /nextResetAtIso/, "Dock state carries a server-derived reset timestamp");
assert.match(source.dockModel, /CommentTranslatorPaidUsageDisplay|providerRoute|fallback/, "Dock usage state carries the provider route boundary");
assert.match(source.dockFormat, /UTC|reset/i, "Dock formatting keeps reset time sanitized and explicit");
assert.match(source.dockFormat, /timeZoneName/, "Dock reset formatting includes the browser user's timezone");
assert.doesNotMatch(source.dockFormat, /timeZone:\s*"UTC"/, "Paid reset formatting does not force UTC in the browser display");
assert.doesNotMatch(source.dockHeader, /\bPro\b/, "the obsolete Pro label is removed from the Dock");
assert.match(source.dockHeader, /Kuro Live Comment Translator Plus/, "the Dock uses the canonical Paid product name");

for (const [label, copy] of [["JA", copyJa], ["EN", copyEn]]) {
  assert.ok(copy.operatorSession?.paidUsage, `${label} includes Paid usage copy`);
  for (const key of ["usageTitle", "billingPeriod", "remaining", "nextReset", "azureFallback", "safetyStop", "pollBudgetStop"]) {
    assert.ok(copy.operatorSession.paidUsage[key], `${label} Paid copy includes ${key}`);
  }
}
assert.doesNotMatch(
  `${JSON.stringify(copyJa.operatorSession)}\n${JSON.stringify(copyEn.operatorSession)}`,
  /月額980円|JPY 980|旧plan|Paid Core v1 unavailable/i,
  "operator Paid copy does not reuse the obsolete plan presentation"
);
assert.doesNotMatch(
  `${source.billingShell}\n${JSON.stringify(copyJa.operatorSession)}\n${JSON.stringify(copyEn.operatorSession)}`,
  /US\$3|US\$25|個人US\$3|全体US\$25|Individual US\$3|global US\$25/i,
  "user-facing Paid safety copy does not expose internal cost caps"
);

assert.match(source.publicEntitlement, /readPollBudget/, "Paid usage reads trusted poll-budget authority when a session context exists");
assert.match(source.publicEntitlement, /createCommentTranslatorPaidPreSessionPollBudgetReference/, "Paid usage exposes a server-only pre-session poll-budget reference helper");
assert.match(source.publicEntitlement, /createHash\("sha256"\)/, "the pre-session poll-budget reference is deterministic and opaque");
assert.match(source.publicEntitlement, /allowEmptyPollBudgetInitialization/, "a new Paid Start may initialize an absent UTC poll bucket through the atomic reservation");
assert.match(
  source.publicEntitlement,
  /authority\.dailyBudget\s*===\s*null[\s\S]{0,500}authority\.reservedPolls\s*===\s*0/,
  "an absent UTC poll bucket is only initialized when no reservation exists"
);
assert.match(source.usageDisplay, /paidAuthorityReadable\s*!==\s*true/, "Paid usage fails closed when authority readability is not explicitly true");
assert.match(
  source.publicEntitlement,
  /paidAuthorityReadable:\s*paidAuthorityReadable/,
  "browser-safe Paid authority reflects the combined server authority state"
);
assert.match(
  source.publicEntitlement,
  /paidAuthorityReadable\s*=\s*paidPollAuthorityReadable\s*&&\s*providerAuthorityAvailable/,
  "unreadable poll authority keeps Paid provider-call policy fail-closed"
);
assert.doesNotMatch(
  source.publicEntitlement,
  /reservedPolls:\s*0,[\s\S]{0,180}activeAutoPollAllowed:\s*true/,
  "Paid usage does not project the placeholder poll authority as allowed"
);
assert.match(
  source.sessionActions,
  /pollBudgetSessionReferenceId:\s*activeSession\?\.sessionReferenceId\s*\?\?\s*createCommentTranslatorPaidPreSessionPollBudgetReference\(callerAuthorization\)/,
  "session actions prefer the active reference and use an opaque pre-session reference for new Paid Start or status"
);
assert.match(source.feedActions, /pollBudgetSessionReferenceId:\s*activeSession\.sessionReferenceId/, "feed actions read poll authority for the active Paid session");
assert.doesNotMatch(
  `${JSON.stringify(copyJa)}\n${JSON.stringify(copyEn)}`,
  /\bPro\b|Paid plans are planned|有料プランは準備中/i,
  "Translator copy does not retain the obsolete Paid product label"
);
assert.doesNotMatch(
  `${source.billingShell}\n${source.usageSidebar}\n${source.dockHeader}`,
  /localStorage\.|sessionStorage\.|indexedDB\.|sk_(?:live|test)_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|liveChatId\s*[:=]\s*["'][^"']+/i,
  "billing and usage UI do not persist browser authority or expose private values"
);

console.log("comment translator paid core v1 Task 8 UI/action contract checks passed");
