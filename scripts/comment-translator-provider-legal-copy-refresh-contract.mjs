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
const toolCopyPaths = [
  "lib/comment-translator.ts",
  "lib/comment-translator-copy-en.json",
  "lib/comment-translator-copy-ja.json"
];
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
  ...toolCopyPaths,
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
const toolCopy = toolCopyPaths.map(read).join("\n");
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
    "1日最大30分",
    "1セッション最大30分",
    "30翻訳メッセージ/分",
    "月20,000入力文字",
    "月間上限は翻訳 provider に送る入力/ソース文字を基準に扱います。",
    "provider policy の説明は処理先とfallback方針の開示に限定し、provider target metadata、liveChatId、owner値、OAuth値、Authorization header、Stripe secret、service-role値は表示しません。",
    "API/business data は標準ではモデル学習に使用されない"
  ],
  "legal provider processing copy"
);
assertIncludes(
  legalContent,
  [
    "月額US$6（税込・USD請求）",
    "自動更新",
    "契約更新周期あたり最大50万入力文字（500,000文字）",
    "保証文字数ではありません",
    "Freeは引き続き利用できます。",
    "実際の公開・設定・提供可否、StripeやProviderのlive操作、デプロイ、activationは別の承認ゲートに従います。"
  ],
  "legal paid-plan copy"
);

assertIncludes(
  toolCopy,
  [
    "Free uses Azure Translator. Kuro Live Comment Translator Plus uses the OpenAI mini model first, with Azure fallback only for recoverable provider errors.",
    "DeepL, Gemini, and Workers AI are comparison-only for the initial launch.",
    "FreeはAzure Translator、Kuro Live Comment Translator PlusはOpenAI miniを優先し、復帰可能なprovider errorだけAzure fallbackを使います。",
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
    "Free remains available.",
    "The existing Free translation and session/feed paths remain unchanged.",
    "Freeは常に利用できます。",
    "Freeの通常翻訳と既存session/feed経路は従来どおりです。",
    "Provider-specific processing and retention policies apply."
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

assert.match(
  task,
  /Task 25 provider terms, privacy, and legal copy refresh|Free limits public copy/i,
  "task.md records current legal/public copy work"
);
assert.match(task, /width checks skipped|browser\/width verification/i, "task.md records width-check decision");

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
