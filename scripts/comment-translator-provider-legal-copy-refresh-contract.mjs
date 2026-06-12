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

function assertIncludes(source, snippets, label) {
  for (const snippet of snippets) {
    assert.ok(source.includes(snippet), `${label} includes ${snippet}`);
  }
}

const legalContentPath = "lib/legal-content.ts";
const toolCopyPath = "lib/comment-translator.ts";
const integrationsShellPath = "components/account/AccountIntegrationsShell.tsx";
const billingShellPath = "components/account/AccountBillingShell.tsx";
const privateLaunchPath = "components/comment-translator/CommentTranslatorPrivateLaunchUnavailable.tsx";
const providerPolicyPath = "docs/active/COMMENT_TRANSLATOR_PROVIDER_COST_POLICY.md";
const stripeReadinessPath = "docs/active/COMMENT_TRANSLATOR_STRIPE_LIVE_READINESS.md";
const monitoringReadinessPath = "docs/active/COMMENT_TRANSLATOR_MONITORING_INCIDENT_READINESS.md";
const legalRefreshDocPath = "docs/active/COMMENT_TRANSLATOR_PROVIDER_LEGAL_COPY_REFRESH.md";
const taskPath = "task.md";

for (const requiredPath of [
  legalContentPath,
  toolCopyPath,
  integrationsShellPath,
  billingShellPath,
  privateLaunchPath,
  providerPolicyPath,
  stripeReadinessPath,
  monitoringReadinessPath,
  taskPath
]) {
  assert.ok(exists(requiredPath), `${requiredPath} exists`);
}

const legalContent = read(legalContentPath);
const toolCopy = read(toolCopyPath);
const integrationsShell = read(integrationsShellPath);
const billingShell = read(billingShellPath);
const privateLaunch = read(privateLaunchPath);
const providerPolicy = read(providerPolicyPath);
const stripeReadiness = read(stripeReadinessPath);
const monitoringReadiness = read(monitoringReadinessPath);
const task = read(taskPath);

assertIncludes(
  providerPolicy,
  [
    "Free plan primary: Azure Translator",
    "Paid plan primary: OpenAI mini",
    "Paid deterministic fallback: Azure Translator",
    "Cost comparison candidates only for initial launch: Gemini Flash/Lite and Cloudflare Workers AI",
    "Optional quality/comparison provider: DeepL"
  ],
  "Task 19 provider policy"
);
assert.match(stripeReadiness, /Stripe live-mode or dashboard actions require all of the following/, "Stripe readiness remains approval gated");
assert.match(monitoringReadiness, /Support Escalation Path/, "monitoring readiness keeps support escalation context");

assertIncludes(
  legalContent,
  [
    "Free plan は Azure Translator を主な翻訳 provider として利用します。",
    "Paid plan は OpenAI mini model を主な翻訳 provider とし、復帰可能な provider error の場合のみ Azure Translator fallback を使います。",
    "DeepL、Gemini Flash/Lite、Cloudflare Workers AI は初期公開時点の production translation provider ではありません。",
    "provider policy の説明は処理先とfallback方針の開示に限定し、provider target metadata、liveChatId、owner値、OAuth値、Authorization header、Stripe secret、service-role値は表示しません。",
    "API/business data は標準ではモデル学習に使用されない"
  ],
  "legal provider processing copy"
);
assertIncludes(
  legalContent,
  [
    "有料プランは、Comment Translator の利用上限拡張から開始する予定です。",
    "Free は引き続き利用できます。",
    "Stripe の Product、Price、Checkout、Customer Portal、webhook 登録、billing setting mutation は承認ゲート付きです。"
  ],
  "legal paid-plan copy"
);

assertIncludes(
  toolCopy,
  [
    "Free uses Azure Translator. Pro uses an OpenAI mini model first, with Azure fallback only for recoverable provider errors.",
    "DeepL, Gemini, and Workers AI are comparison-only for the initial launch.",
    "FreeはAzure Translator、ProはOpenAI miniを優先し、復帰可能なprovider errorだけAzure fallbackを使います。",
    "DeepL、Gemini、Workers AIは初期公開では比較用です。"
  ],
  "translator tool provider copy"
);
assertIncludes(
  integrationsShell,
  [
    "Translation provider routing is decided later by server-side Free/Paid policy.",
    "This screen does not choose Azure, OpenAI mini, or fallback providers.",
    "翻訳providerの切り替えは後続のserver-side Free/Paid policyで決まります。",
    "この画面でAzure、OpenAI mini、fallback providerは選択しません。"
  ],
  "account integrations provider routing copy"
);
assertIncludes(
  billingShell,
  [
    "Free routes to Azure Translator. Pro routes to OpenAI mini with Azure fallback only for recoverable provider errors.",
    "DeepL, Gemini, and Workers AI remain comparison-only and are not included in current production routing.",
    "FreeはAzure Translator、ProはOpenAI miniを優先し、復帰可能なprovider errorだけAzure fallbackを使います。",
    "DeepL、Gemini、Workers AIは比較用で、現行production routingには含めません。"
  ],
  "billing provider and paid-plan copy"
);
assertIncludes(
  privateLaunch,
  [
    "Provider and billing setup remain approval-gated; public release is not enabled yet.",
    "provider / billing 設定は承認ゲート付きで、公開提供はまだ有効化していません。"
  ],
  "private launch support copy"
);

assert.ok(exists(legalRefreshDocPath), "Task 25 provider legal copy refresh doc exists");
const legalRefreshDoc = read(legalRefreshDocPath);
assertIncludes(
  legalRefreshDoc,
  [
    "Task 25 provider terms, privacy, and legal copy refresh",
    "/terms",
    "/privacy",
    "/legal/tokushoho",
    "/tools/comment-translator",
    "/account/integrations",
    "/account/billing",
    "Free plan primary: Azure Translator",
    "Paid plan primary: OpenAI mini",
    "Paid recoverable fallback: Azure Translator",
    "DeepL / Gemini Flash/Lite / Cloudflare Workers AI: comparison-only",
    "No live/provider execution, deploy/upload, remote mutation, Stripe live-mode action, or remote schema migration was run."
  ],
  "Task 25 active doc"
);

assert.match(task, /Task 25 provider terms, privacy, and legal copy refresh/i, "task.md records Task 25 work");
assert.match(task, /width checks skipped/i, "task.md records width-check decision");

const combinedChangedSurface = [
  legalContent,
  toolCopy,
  integrationsShell,
  billingShell,
  privateLaunch,
  legalRefreshDoc,
  task
].join("\n");

for (const forbidden of [
  /sk_live_[A-Za-z0-9]+/i,
  /sk_test_[A-Za-z0-9]+/i,
  /whsec_[A-Za-z0-9]+/i,
  /access_token\s*[:=]\s*["'][^"']+/i,
  /refresh_token\s*[:=]\s*["'][^"']+/i,
  /authorization_code\s*[:=]\s*["'][^"']+/i,
  /Authorization\s*[:=]\s*["'][^"']+/i,
  /SUPABASE_SERVICE_ROLE_KEY\s*[:=]/i,
  /SERVICE_ROLE_KEY\s*[:=]/i,
  /BEGIN\s+PRIVATE\s+KEY/i,
  /liveChatId\s*[:=]\s*["'][^"']+/i,
  /providerChannelId\s*[:=]\s*["'][^"']+/i,
  /ownerUserId\s*[:=]\s*["'][^"']+/i,
  /providerTargetMetadata\s*[:=]\s*["'][^"']+/i
]) {
  assert.doesNotMatch(combinedChangedSurface, forbidden, "Task 25 copy does not include sensitive values or private identifiers");
}

assert.doesNotMatch(
  combinedChangedSurface,
  /Gemini(?: Flash\/Lite)? (?:routes|routes translation|is a production|primary)|Workers AI (?:routes|routes translation|is a production|primary)|DeepL (?:routes|routes translation|is a production|primary)/i,
  "comparison-only providers are not overclaimed as production routing"
);

console.log("comment translator provider legal copy refresh contract checks passed");
