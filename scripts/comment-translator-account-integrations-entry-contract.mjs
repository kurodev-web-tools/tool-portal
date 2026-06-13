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

const routePath = "app/account/integrations/page.tsx";
const shellPath = "components/account/AccountIntegrationsShell.tsx";
const boundaryPath = "lib/comment-translator-youtube-account-integration.ts";
const accountPagePath = "components/account/AccountPreferencesShell.tsx";
const accountActionsPath = "app/account/actions.ts";
const taskPath = "task.md";

assert.ok(exists(routePath), "/account/integrations route exists");
assert.ok(exists(shellPath), "account integrations shell exists");
assert.ok(exists(boundaryPath), "YouTube account integration view boundary exists");

const route = read(routePath);
const shell = read(shellPath);
const boundary = read(boundaryPath);
const accountPage = read(accountPagePath);
const accountActions = read(accountActionsPath);
const task = read(taskPath);

assert.match(route, /redirect\("\/login\?next=\/account\/integrations"\)/, "signed-out users are redirected with the integrations next path");
assert.match(route, /<PortalShell>/, "integrations route uses the account PortalShell");
assert.match(route, /<AccountIntegrationsShell/, "integrations route renders the integrations shell");
assert.match(route, /createYouTubeAccountIntegrationViewModel/, "route builds a sanitized YouTube integration view model");

assertIncludes(
  shell,
  [
    "YouTube integration",
    "接続だけではバックグラウンド監視、ポーリング、AI翻訳、クォータ消費は開始しません",
    "Connect YouTube",
    "Reconnect",
    "Disconnect",
    "data-account-integrations=\"youtube-sanitized-status\""
  ],
  "account integrations shell copy and affordances"
);
assert.match(accountPage, /href="\/account\/integrations"/, "/account links to integrations");
assert.match(accountActions, /"\/account\/integrations"/, "auth next path allows account integrations");

assertIncludes(
  boundary,
  [
    'clientReadableStatus: "sanitized-connection-readiness-only"',
    'provider: "youtube"',
    'backgroundMonitoring: "not-started-by-connection"',
    'liveProviderExecution: "forbidden-in-account-integrations-entry"',
    'browserStorage: "no-localStorage-indexedDB-sessionStorage-or-handoff-payload-change"',
    'providerTargetMetadata: "server-only-not-displayed"',
    "createYouTubeAccountIntegrationViewModel"
  ],
  "account integration boundary"
);

const changedSurface = `${route}\n${shell}\n${boundary}\n${accountPage}\n${accountActions}`;

assert.doesNotMatch(
  changedSurface,
  /oauthAccessToken|oauthRefreshToken|authorizationCodeValue|ownerUserIdValue|providerChannelIdValue|liveChatIdValue|service_role|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|Authorization\s*[:=]|providerTargetMetadataValue|secretValue/i,
  "Task 4 surface does not contain secret, token, owner, provider target, liveChatId, service-role, or authorization header values"
);
assert.doesNotMatch(
  changedSurface,
  /localStorage\.|indexedDB\.|sessionStorage\.|youtube\.googleapis|OAuth2Client|GoogleAuth|from\s+["']googleapis["']|require\(["']googleapis["']\)|liveChatMessages|setInterval|EventSource|WebSocket/i,
  "Task 4 surface does not add browser storage, live provider execution, or background monitoring"
);
assert.match(task, /4\. Account integrations entry point/i, "task.md records Task 4 completion context");

console.log("comment translator account integrations entry contract checks passed");
