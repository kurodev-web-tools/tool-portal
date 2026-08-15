import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertIncludes(source, snippets, label) {
  for (const snippet of snippets) {
    assert.ok(source.includes(snippet), `${label} includes ${snippet}`);
  }
}

const paths = {
  legalContent: "lib/legal-content.ts",
  billingShell: "components/account/AccountBillingShell.tsx",
  privacyRoute: "app/privacy/page.tsx",
  termsRoute: "app/terms/page.tsx",
  tokushohoRoute: "app/legal/tokushoho/page.tsx",
  runbook: "docs/active/COMMENT_TRANSLATOR_PAID_V1_RUNBOOK.md",
  billingRuntime: "lib/comment-translator-billing-runtime.ts",
  webhookRoute: "app/api/comment-translator/billing/webhook/route.ts",
  providerRuntime: "lib/comment-translator-provider-execution-runtime.ts",
  feedStore: "lib/comment-translator-real-comments-feed-durable-store.ts",
  retentionRuntime: "lib/comment-translator-paid-retention.ts",
  reconcilerRuntime: "lib/comment-translator-paid-control-plane-reconciler.ts",
  maintenanceRoute: "app/api/comment-translator/paid-maintenance/route.ts"
};

for (const [label, relativePath] of Object.entries(paths)) {
  assert.ok(exists(relativePath), `${label} exists: ${relativePath}`);
}

const source = Object.fromEntries(
  Object.entries(paths).map(([label, relativePath]) => [label, read(relativePath)])
);
const publicLegalSurface = `${source.legalContent}\n${source.billingShell}`;
const routeSurface = `${source.privacyRoute}\n${source.termsRoute}\n${source.tokushohoRoute}`;

assertIncludes(
  publicLegalSurface,
  [
    "US$6／月（税込・USD請求）",
    "自動更新",
    "契約更新周期あたり最大50万入力文字（500,000文字）",
    "保証文字数ではありません",
    "個人・全体の安全上限や運用上限により先に停止する場合があります",
    "解約は次回更新日から有効",
    "返金",
    "コメント本文は翻訳処理のためOpenAIまたはAzureへ送信",
    "日本（JP）および米国（US）",
    "クレジットカード、デビットカード",
    "振込には対応しません"
  ],
  "Japanese Paid legal copy"
);

assertIncludes(
  publicLegalSurface,
  [
    "US$6/month (tax inclusive, billed in USD), automatic renewal",
    "Up to 500,000 input characters per contract renewal period",
    "is not a guaranteed character allowance",
    "Individual, global, or operational safety caps may stop earlier",
    "cancellation takes effect at the next renewal",
    "Comment text is sent to OpenAI or Azure",
    "Japan (JP) and the United States (US)",
    "credit cards and debit cards",
    "Bank transfer is not supported"
  ],
  "English Paid billing copy"
);

assertIncludes(
  publicLegalSurface,
  [
    "sanitized feed snapshot",
    "セッション終了後最大24時間",
    "Provider request detail、ログ、集計、冪等台帳にはコメント本文を複製しません",
    "Provider側では各社の処理・保持方針が適用されます",
    "OpenAI",
    "最大30日保持される可能性",
    "Azure Translator",
    "No-Trace"
  ],
  "canonical data-retention boundary"
);

assertIncludes(
  source.legalContent,
  [
    "OpenAIは標準のabuse monitoringにより最大30日保持される可能性があり、Azure TranslatorはMicrosoftのNo-Trace方針を前提とします。これは当サービスDBの24時間snapshotとは別のProvider側の処理・保持方針です。"
  ],
  "Terms distinguishes provider retention from service DB retention"
);

assertIncludes(
  publicLegalSurface,
  [
    "アカウント削除",
    "dispute",
    "利用者勝訴",
    "運営勝訴",
    "Paid即時停止",
    "canceled確認後",
    "現在Subscription/periodが有効",
    "他の停止理由がない"
  ],
  "account deletion and dispute copy"
);

assertIncludes(
  publicLegalSurface,
  [
    "current Subscription/period is valid",
    "no other stop reason exists"
  ],
  "English operator-win restoration copy"
);

for (const forbidden of [
  /有料プランは準備中です/u,
  /将来(?:提供される)?有料プラン/u,
  /コメント本文の恒久的なログ保存は初期公開版では標準で無効です/u,
  /コメント本文を一切保存しない/u,
  /当サービスDBに保存しない/u,
  /自サービス非保存/u,
  /Paid plans are planned/i,
  /comment text is not stored in (?:our|the) (?:service )?DB/i
]) {
  assert.doesNotMatch(publicLegalSurface, forbidden, "public legal copy has no stale or false no-storage claim");
}

for (const route of [source.privacyRoute, source.termsRoute, source.tokushohoRoute]) {
  assert.match(route, /LegalDocumentPage/);
  assert.match(route, /legalDocuments/);
}
assert.match(routeSurface, /legalDocuments\.privacy/);
assert.match(routeSurface, /legalDocuments\.terms/);
assert.match(routeSurface, /legalDocuments\.tokushoho/);

assertIncludes(
  source.runbook,
  [
    "repository-implemented",
    "locally-verified",
    "externally-unverified",
    "approval-gated",
    "dispute",
    "対象owner",
    "グローバル停止へ拡大しない",
    "Paid即時停止",
    "idempotent",
    "canceled確認後",
    "capacity",
    "manual reconciliation",
    "運営勝訴",
    "現在Subscription",
    "他の停止理由がない",
    "checkout_enabled",
    "paid_translation_enabled",
    "openai_enabled",
    "azure_fallback_enabled",
    "Provider障害",
    "Webhook backlog",
    "容量逼迫",
    "rollback",
    "税務",
    "特商法",
    "privacy",
    "未確認",
    "Gate 0",
    "Task 11"
  ],
  "Paid operations runbook"
);

for (const runtime of [
  source.billingRuntime,
  source.webhookRoute,
  source.providerRuntime,
  source.feedStore,
  source.retentionRuntime,
  source.reconcilerRuntime,
  source.maintenanceRoute
]) {
  assert.doesNotMatch(runtime, /console\.(?:log|error|warn|info|debug)\s*\(/u, "reviewed runtime has no direct console logging");
}

const reviewedSurface = Object.values(source).join("\n");
for (const forbidden of [
  /sk_(?:live|test)_[A-Za-z0-9]+/iu,
  /whsec_[A-Za-z0-9]+/iu,
  /BEGIN\s+PRIVATE\s+KEY/iu,
  /(?:access_token|refresh_token|authorization_code)\s*[:=]\s*["'][^"']+["']/iu,
  /(?:liveChatId|providerChannelId|providerTargetMetadata|ownerUserId)\s*[:=]\s*["'](?!(?:forbidden|server-only-not-displayed|never-returned-by-design)["'])[^"']+["']/iu,
  /Authorization\s*[:=]\s*["'][^"']+["']/iu,
  /\b(?:STRIPE|SUPABASE)[A-Z_]*(?:SECRET|SERVICE_ROLE)[A-Z_]*\s*[:=]\s*["'][^"']+["']/u
]) {
  assert.doesNotMatch(reviewedSurface, forbidden, "Task 10 reviewed surface has no secret or private identifier value");
}

assert.doesNotMatch(
  `${source.billingShell}\n${source.legalContent}`,
  /localStorage\.|sessionStorage\.|indexedDB\.|document\.cookie/iu,
  "Paid legal and billing copy adds no browser storage authority"
);

console.log("comment translator Paid Core v1 Task 10 legal/security/privacy contract checks passed");
