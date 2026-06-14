import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const dockPath = "components/comment-translator/CommentTranslatorDock.tsx";
const toolCopyPath = "lib/comment-translator.ts";
const integrationsShellPath = "components/account/AccountIntegrationsShell.tsx";
const billingShellPath = "components/account/AccountBillingShell.tsx";
const accountPagePath = "app/account/page.tsx";
const accountPreferencesShellPath = "components/account/AccountPreferencesShell.tsx";
const themeTogglePath = "components/portal/ThemeToggle.tsx";
const privateLaunchPath = "components/comment-translator/CommentTranslatorPrivateLaunchUnavailable.tsx";
const taskPath = "task.md";
const thisScriptPath = "scripts/comment-translator-youtube-oauth-ui-polish-contract.mjs";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function changedFiles() {
  const committedDiff = execSync(
    "git diff --name-only origin/codex/comment-translator-youtube-oauth-integration...HEAD",
    { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
  )
    .split(/\r?\n/)
    .filter(Boolean);
  const workingTreeDiff = execSync("git diff --name-only", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  })
    .split(/\r?\n/)
    .filter(Boolean);
  const stagedDiff = execSync("git diff --cached --name-only", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  })
    .split(/\r?\n/)
    .filter(Boolean);
  const untracked = execSync("git ls-files --others --exclude-standard", {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  })
    .split(/\r?\n/)
    .filter(Boolean);

  return [...new Set([...committedDiff, ...workingTreeDiff, ...stagedDiff, ...untracked])].map((file) =>
    file.replace(/\\/g, "/")
  );
}

function assertIncludes(source, snippets, label) {
  for (const snippet of snippets) {
    assert.ok(source.includes(snippet), `${label} includes ${snippet}`);
  }
}

for (const requiredPath of [
  dockPath,
  toolCopyPath,
  integrationsShellPath,
  billingShellPath,
  accountPagePath,
  accountPreferencesShellPath,
  themeTogglePath,
  privateLaunchPath,
  taskPath
]) {
  assert.ok(exists(requiredPath), `${requiredPath} exists`);
}

const dock = read(dockPath);
const toolCopy = read(toolCopyPath);
const integrationsShell = read(integrationsShellPath);
const billingShell = read(billingShellPath);
const accountPage = read(accountPagePath);
const accountPreferencesShell = read(accountPreferencesShellPath);
const themeToggle = read(themeTogglePath);
const privateLaunch = read(privateLaunchPath);
const task = read(taskPath);

assertIncludes(
  toolCopy,
  [
    "Start readiness",
    "YouTube connection",
    "Start stays disabled until YouTube is available through the server-owned credential check.",
    "接続確認",
    "Start は server-owned credential check で YouTube が利用可能になるまで無効です。"
  ],
  "translator tool start/readiness contrast copy"
);
assertIncludes(
  dock,
  [
    "viewMode",
    "commentOnly",
    "詳細確認とテスト入力",
    "コメントのみ",
    "今日の状態",
    "data-comment-translator-start-contrast=\"youtube-vs-session\"",
    "data-public-operator-session-ui=\"sanitized-session-usage-only\"",
    "data-credential-status-display-wiring=\"sanitized-metadata-only\"",
    "data-operator-ui-flow=\"local-status-only\"",
    "data-comment-translator-billing-entry=\"stripe-paid-plan\"",
    "copy.operatorSession.readinessTitle",
    "copy.operatorSession.connectionReadiness",
    "copy.operatorSession.startReadiness"
  ],
  "translator dock renders simplified start/settings/comments/today layout with gated detail surfaces"
);

assertIncludes(
  integrationsShell,
  [
    "nextStepLabel",
    "nextStep",
    "Connection is ready. Open the translator and press Start only when you want polling and translation to begin.",
    "YouTube is disconnected. Connect YouTube here; no background monitoring starts from connection alone.",
    "Connection cannot be used safely yet. Reconnect YouTube before starting a session.",
    "接続済みです。翻訳ツールを開き、ポーリングと翻訳を始めたい時だけ Start してください。",
    "未接続です。この画面で YouTube を接続できます。接続だけではバックグラウンド監視は開始しません。",
    "安全に利用できない接続状態です。セッション開始前に YouTube を再接続してください。"
  ],
  "account integrations next-action contrast copy"
);

assertIncludes(
  billingShell,
  [
    "planContrastTitle",
    "Free baseline",
    "Paid contrast",
    "Stripe readiness",
    "Free remains usable even when Paid checkout is pending.",
    "Paid expands Comment Translator limits after server-side entitlement sync.",
    "Checkout, Portal, webhook, and billing setting mutation remain approval-gated.",
    "Free 基本枠",
    "Paid との差分",
    "Stripe readiness",
    "Paid checkout 準備中でも Free は利用できます。",
    "Paid は server-side entitlement sync 後に Comment Translator の上限を拡張します。"
  ],
  "billing Free/Paid/Stripe contrast copy"
);

assertIncludes(
  accountPage,
  [
    "readYouTubeAccountIntegrationStatusViewModel",
    "readCommentTranslatorBillingEntitlementSnapshot",
    "createCommentTranslatorBillingBrowserSafeViewModel",
    "AccountPreferencesShell"
  ],
  "account page passes sanitized integration and billing status to account settings"
);

assertIncludes(
  accountPreferencesShell,
  [
    "accountStatusTitle",
    "youtubeIntegration",
    "currentPlan",
    "backToTools",
    "signOut",
    "ThemeToggle variant=\"segmented\"",
    "manageIntegrations",
    "manageBilling",
    "tokenやprovider target値は画面に表示しない",
    "No token or provider target values in UI"
  ],
  "account preferences consolidates account status, display settings, integrations, and billing entry points"
);

assertIncludes(
  themeToggle,
  [
    "type ThemeToggleVariant = \"default\" | \"compact\" | \"segmented\"",
    "variant === \"segmented\"",
    "aria-pressed={theme === option.value}",
    "writeLocalThemePreference(theme)"
  ],
  "theme toggle supports account settings segmented control without adding new storage keys"
);

assertIncludes(
  privateLaunch,
  [
    "statusLabel",
    "availableNow",
    "nextStep",
    "Private launch gate active",
    "Available now",
    "Next safe step",
    "No connect, billing, polling, provider execution, or quota use starts from this fallback.",
    "private launch gate 有効",
    "現在できること",
    "次の安全な操作",
    "この fallback から接続、支払い、ポーリング、provider execution、クォータ消費は開始しません。"
  ],
  "private-launch fallback contrast copy"
);

assert.match(task, /10\. UI polish for private launch \/ integration \/ billing contrast[\s\S]*Status: complete/i, "task.md records Task 10 completion");
assert.match(task, /width checks for Task 10/i, "task.md records Task 10 width checks");
assert.match(task, /Google OAuth live connect execution, YouTube OAuth live connect execution[\s\S]*were not run/i, "task.md records gated OAuth execution was not run");
assert.match(task, /public-release capable: no/i, "task.md keeps public release closed");

const allowedChangedFiles = new Set([
  accountPagePath,
  accountPreferencesShellPath,
  billingShellPath,
  dockPath,
  integrationsShellPath,
  privateLaunchPath,
  themeTogglePath,
  toolCopyPath,
  taskPath,
  thisScriptPath
]);
for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `Task 10 UI polish does not change unexpected file: ${file}`);
}

const changedSource = changedFiles()
  .map((file) => `${file}\n${read(file)}`)
  .join("\n");

for (const forbiddenSecretPattern of [
  /access_token\s*[:=]\s*["'][^"']+["']/i,
  /refresh_token\s*[:=]\s*["'][^"']+["']/i,
  /authorization_code\s*[:=]\s*["'][^"']+["']/i,
  /Authorization:\s*Bearer\s+\S+/i,
  /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"']+["']/i,
  /STRIPE_SECRET_KEY\s*[:=]\s*["'][^"']+["']/i,
  /STRIPE_WEBHOOK_SECRET\s*[:=]\s*["'][^"']+["']/i,
  /liveChatId\s*[:=]\s*["'][^"']+["']/i,
  /providerChannelId\s*[:=]\s*["'][UC][^"']+["']/i,
  /ownerUserId\s*[:=]\s*["'][0-9a-f-]{20,}["']/i,
  /providerTargetMetadata\s*[:=]\s*\{/i,
  /localStorage\.|indexedDB\.|sessionStorage\./i
]) {
  assert.doesNotMatch(changedSource, forbiddenSecretPattern, `changed files avoid forbidden pattern: ${forbiddenSecretPattern}`);
}

console.log("comment translator YouTube OAuth UI polish contract checks passed");
