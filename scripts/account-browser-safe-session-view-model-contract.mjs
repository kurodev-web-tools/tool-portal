import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertIncludes(source, snippets, label) {
  for (const snippet of snippets) {
    assert.ok(source.includes(snippet), `${label} includes ${snippet}`);
  }
}

function assertExcludes(source, snippets, label) {
  for (const snippet of snippets) {
    assert.equal(source.includes(snippet), false, `${label} excludes ${snippet}`);
  }
}

function extractBrowserSafeType(source) {
  const marker = "export type AccountSessionBrowserSafeViewModel";
  const start = source.indexOf(marker);
  const end = source.indexOf("export function createBrowserSafeAccountSessionViewModel");
  assert.notEqual(start, -1, "browser-safe account session view model type is declared");
  assert.notEqual(end, -1, "browser-safe account session view model factory is declared");
  assert.ok(start < end, "browser-safe account session type is declared before its factory");
  return source.slice(start, end);
}

const sessionSource = read("lib/supabase/session.ts");
const browserSafeType = extractBrowserSafeType(sessionSource);

assertIncludes(
  sessionSource,
  [
    "export type AccountSessionState",
    "export type AccountSessionBrowserSafeViewModel",
    "export function createBrowserSafeAccountSessionViewModel(accountSession: AccountSessionState): AccountSessionBrowserSafeViewModel"
  ],
  "session boundary keeps server state and browser-safe view model separate"
);
assertIncludes(
  browserSafeType,
  [
    "readonly authStatus:",
    "readonly user:",
    "readonly email: string | null;",
    "readonly remotePreferences:",
    "readonly remotePreferenceStatus:"
  ],
  "browser-safe account session shape"
);
assertExcludes(
  browserSafeType,
  ["readonly id:", "ownerUserId", "callerUserId", "accountSessionUserId", "owner_id", "account_id"],
  "browser-safe account session shape"
);
assertIncludes(
  sessionSource,
  ["email: accountSession.user.email", ": null"],
  "browser-safe account session factory preserves intentionally visible account UI fields only"
);
assert.match(
  sessionSource,
  /user:\s*accountSession\.user\s*\?\s*\{\s*email:\s*accountSession\.user\.email\s*\}\s*:\s*null/s,
  "browser-safe account session factory maps only signed-in email from account user"
);
assertExcludes(
  sessionSource.slice(sessionSource.indexOf("export function createBrowserSafeAccountSessionViewModel")),
  ["id: accountSession.user.id", "ownerUserId: accountSession.user.id", "callerUserId: accountSession.user.id"],
  "browser-safe account session factory"
);

const clientAccountSessionComponents = [
  "components/account/AccountRemoteDisplaySettingsApplier.tsx",
  "components/account/AccountPreferencesShell.tsx",
  "components/account/AccountIntegrationsShell.tsx",
  "components/account/AccountBillingShell.tsx",
  "components/portal/PortalHome.tsx",
  "components/portal/PortalHeroSummary.tsx",
  "components/portal/PortalHeader.tsx",
  "components/portal/PortalSidebar.tsx"
];

for (const componentPath of clientAccountSessionComponents) {
  const source = read(componentPath);
  assert.match(source, /^"use client";/m, `${componentPath} is a client component`);
  assert.match(
    source,
    /AccountSessionBrowserSafeViewModel/,
    `${componentPath} uses the browser-safe account session view model`
  );
  assertExcludes(
    source,
    [
      "AccountSessionState",
      "user?.id",
      "user.id",
      "ownerUserId",
      "callerUserId",
      "accountSessionUserId",
      "owner_id",
      "account_id"
    ],
    `${componentPath} client-readable account session props`
  );
}

const portalShellSource = read("components/portal/PortalShell.tsx");
assertIncludes(
  portalShellSource,
  [
    "createBrowserSafeAccountSessionViewModel",
    "const browserSafeAccountStatus = createBrowserSafeAccountSessionViewModel(accountStatus);",
    "<AccountRemoteDisplaySettingsApplier accountStatus={browserSafeAccountStatus} />",
    "<PortalSidebar mode={mode} accountStatus={browserSafeAccountStatus} adminShortcut={adminShortcut} />",
    "<PortalHeader mode={mode} accountStatus={browserSafeAccountStatus} adminShortcut={adminShortcut} />"
  ],
  "PortalShell maps server session to browser-safe client props"
);
assertExcludes(
  portalShellSource,
  [
    "<AccountRemoteDisplaySettingsApplier accountStatus={accountStatus} />",
    "<PortalSidebar mode={mode} accountStatus={accountStatus} adminShortcut={adminShortcut} />",
    "<PortalHeader mode={mode} accountStatus={accountStatus} adminShortcut={adminShortcut} />"
  ],
  "PortalShell raw account session client props"
);

const directClientPropPages = [
  {
    path: "app/page.tsx",
    snippets: ["const browserSafeAccountStatus = createBrowserSafeAccountSessionViewModel(accountStatus);", "<PortalHome accountStatus={browserSafeAccountStatus} />"]
  },
  {
    path: "app/account/page.tsx",
    snippets: ["const browserSafeAccountSession = createBrowserSafeAccountSessionViewModel(accountSession);", "authStatus={browserSafeAccountSession}"]
  },
  {
    path: "app/account/integrations/page.tsx",
    snippets: ["const browserSafeAccountSession = createBrowserSafeAccountSessionViewModel(accountSession);", "accountStatus={browserSafeAccountSession}"]
  },
  {
    path: "app/account/billing/page.tsx",
    snippets: ["const browserSafeAccountSession = createBrowserSafeAccountSessionViewModel(accountSession);", "accountStatus={browserSafeAccountSession}"]
  }
];

for (const page of directClientPropPages) {
  const source = read(page.path);
  assert.match(source, /createBrowserSafeAccountSessionViewModel/, `${page.path} imports the browser-safe account session factory`);
  assertIncludes(source, page.snippets, `${page.path} passes browser-safe account props to client components`);
}

const serverOnlyAccountIdCallers = [
  "lib/comment-translator-admin-access-gate.ts",
  "lib/comment-translator-private-launch-access-gate.ts",
  "lib/comment-translator-youtube-account-integration-status.ts",
  "lib/comment-translator-youtube-tool-credential-source.ts",
  "app/account/actions.ts",
  "app/account/billing/actions.ts",
  "app/api/comment-translator/youtube/oauth/callback/route.ts"
];

for (const serverOnlyPath of serverOnlyAccountIdCallers) {
  const source = read(serverOnlyPath);
  assert.match(source, /getAccountSessionState|AccountSessionState|accountSession\.user\?\.id|accountSession\.user\.id|user\.id/, `${serverOnlyPath} keeps server-derived account id usage`);
  assert.doesNotMatch(source, /AccountSessionBrowserSafeViewModel/, `${serverOnlyPath} does not use browser-safe view models for authorization`);
}

console.log("account browser-safe session view model contract checks passed");
