import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const sharedPath = "lib/comment-translator-creator-waitlist-shared.ts";
const creatorPath = "lib/comment-translator-free-beta-creator-locked-waitlist.ts";
const storePath = "lib/comment-translator-creator-waitlist-durable-store.ts";
const adminGatePath = "lib/comment-translator-admin-access-gate.ts";
const adminPageStatePath = "lib/comment-translator-creator-waitlist-admin.ts";
const actionsPath = "app/tools/comment-translator/actions.ts";
const routeHarnessPath = "app/api/comment-translator/free-beta/route-api-harness/route.ts";
const componentPath = "components/comment-translator/CommentTranslatorDock.tsx";
const privateLaunchFallbackPath = "components/comment-translator/CommentTranslatorPrivateLaunchUnavailable.tsx";
const adminShortcutSharedPath = "lib/comment-translator-admin-shortcut-shared.ts";
const portalShellPath = "components/portal/PortalShell.tsx";
const portalHeaderPath = "components/portal/PortalHeader.tsx";
const portalSidebarPath = "components/portal/PortalSidebar.tsx";
const copyPath = "lib/comment-translator.ts";
const globalAdminDashboardPath = "app/admin/page.tsx";
const adminDashboardPath = "app/admin/comment-translator/page.tsx";
const adminPagePath = "app/admin/comment-translator/creator-waitlist/page.tsx";
const migrationPath = "supabase/migrations/20260705000000_comment_translator_creator_waitlist_registrations.sql";
const taskPath = "task.md";
const moduleCache = new Map();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function changedFiles() {
  const base = "origin/codex/comment-translator-free-public-beta-integration";
  const committedDiff = execSync(`git diff --name-only ${base}...HEAD`, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  })
    .split(/\r?\n/)
    .filter(Boolean);
  const uncommittedDiff = execSync("git diff --name-only", {
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

  return [...new Set([...committedDiff, ...uncommittedDiff, ...untracked])].map((file) => file.replace(/\\/g, "/"));
}

function loadTsModule(relativePath) {
  const sourcePath = path.join(root, relativePath);
  const originalLoad = Module._load;

  function compileTsModule(modulePath) {
    const normalizedModulePath = path.normalize(modulePath);
    if (moduleCache.has(normalizedModulePath)) {
      return moduleCache.get(normalizedModulePath).exports;
    }

    const source = fs.readFileSync(normalizedModulePath, "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022
      }
    }).outputText;
    const testModule = new Module(normalizedModulePath);
    moduleCache.set(normalizedModulePath, testModule);
    testModule.filename = normalizedModulePath;
    testModule.paths = Module._nodeModulePaths(path.dirname(normalizedModulePath));
    testModule._compile(compiled, normalizedModulePath);
    return testModule.exports;
  }

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "server-only") {
      return {};
    }

    if (request === "@supabase/supabase-js") {
      return {
        createClient(url, key) {
          return { url, key, from: () => ({}) };
        }
      };
    }

    if (request.startsWith("@/") && parent?.filename) {
      const candidate = path.join(root, `${request.slice(2)}.ts`);
      if (fs.existsSync(candidate)) {
        return compileTsModule(candidate);
      }
      const tsxCandidate = path.join(root, `${request.slice(2)}.tsx`);
      if (fs.existsSync(tsxCandidate)) {
        return compileTsModule(tsxCandidate);
      }
    }

    if (request.startsWith(".") && parent?.filename) {
      const candidate = path.resolve(path.dirname(parent.filename), `${request}.ts`);
      if (fs.existsSync(candidate)) {
        return compileTsModule(candidate);
      }
      const tsxCandidate = path.resolve(path.dirname(parent.filename), `${request}.tsx`);
      if (fs.existsSync(tsxCandidate)) {
        return compileTsModule(tsxCandidate);
      }
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return compileTsModule(sourcePath);
  } finally {
    Module._load = originalLoad;
  }
}

for (const requiredPath of [
  sharedPath,
  creatorPath,
  storePath,
  adminGatePath,
  adminPageStatePath,
  actionsPath,
  routeHarnessPath,
  componentPath,
  privateLaunchFallbackPath,
  adminShortcutSharedPath,
  portalShellPath,
  portalHeaderPath,
  portalSidebarPath,
  copyPath,
  globalAdminDashboardPath,
  adminDashboardPath,
  adminPagePath,
  migrationPath,
  taskPath
]) {
  assert.ok(exists(requiredPath), `Creator waitlist required file exists: ${requiredPath}`);
}

const sharedSource = read(sharedPath);
const creatorSource = read(creatorPath);
const storeSource = read(storePath);
const adminGateSource = read(adminGatePath);
const adminPageStateSource = read(adminPageStatePath);
const actionsSource = read(actionsPath);
const routeHarnessSource = read(routeHarnessPath);
const componentSource = read(componentPath);
const copySource = read(copyPath);
const adminShortcutSharedSource = read(adminShortcutSharedPath);
const portalShellSource = read(portalShellPath);
const globalAdminDashboardSource = read(globalAdminDashboardPath);
const adminPageSource = read(adminPagePath);
const adminDashboardSource = read(adminDashboardPath);
const portalHeaderSource = read(portalHeaderPath);
const portalSidebarSource = read(portalSidebarPath);
const migrationSource = read(migrationPath);
const taskSource = read(taskPath);

assert.match(sharedSource, /creator_closed_beta_2026/, "shared waitlist contract uses the current Creator closed beta campaign");
assert.match(sharedSource, /first_month_discount/, "shared waitlist contract stores first-month discount intent only");
assert.match(creatorSource, /^import "server-only";/m, "Creator waitlist domain remains server-only");
assert.match(creatorSource, /commentTranslatorCreatorWaitlistCampaign/, "waitlist domain uses the shared Creator closed beta campaign");
assert.match(creatorSource, /commentTranslatorCreatorWaitlistDiscountIntent/, "waitlist domain uses the shared first-month discount intent");
assert.match(creatorSource, /registerCommentTranslatorCreatorWaitlistWithStore/, "domain owns registration action semantics");
assert.match(creatorSource, /readCommentTranslatorCreatorWaitlistStateWithStore/, "domain owns per-user state semantics");
assert.match(creatorSource, /duplicatePrevented/, "domain reports duplicate prevention without duplicate writes");
assert.doesNotMatch(creatorSource, /recorded-local-draft|clickTracking|local-deterministic-draft-only/, "old click draft model is removed");

assert.match(storeSource, /^import "server-only";/m, "durable waitlist store is server-only");
assert.match(storeSource, /comment_translator_creator_waitlist_registrations/, "store targets the durable waitlist table");
assert.match(storeSource, /SUPABASE_SERVICE_ROLE_KEY/, "store uses existing service-role env plumbing");
assert.match(storeSource, /trusted-server-service-role-only/, "store contract is trusted server only");
assert.match(storeSource, /on delete cascade/, "migration keeps owner cleanup tied to auth user deletion");

assert.match(adminGateSource, /^import "server-only";/m, "admin allowlist gate is server-only");
assert.match(adminGateSource, /COMMENT_TRANSLATOR_ADMIN_ALLOWED_USER_HASHES/, "admin gate uses a hash allowlist env");
assert.match(adminGateSource, /createHash\("sha256"\)/, "admin gate hashes account ids before allowlist comparison");
assert.match(adminGateSource, /readCommentTranslatorAdminShortcutStateForAccountSession/, "admin shortcut state is resolved by a server-only allowlist helper");
assert.match(adminGateSource, /gatedSurfaces: \["\/admin", "\/admin\/comment-translator", "\/admin\/comment-translator\/creator-waitlist"\]/, "admin gate covers the full admin hierarchy");
assert.match(adminPageStateSource, /readCommentTranslatorCreatorWaitlistAdminPageState/, "admin state reader is centralized");
assert.match(adminPageStateSource, /listRegistrations/, "admin state reads registrations through the durable store");
assert.match(adminShortcutSharedSource, /globalAdminDashboardPath = "\/admin"/, "admin shortcut shared contract points to the global admin dashboard");
assert.match(adminShortcutSharedSource, /commentTranslatorAdminDashboardPath = "\/admin\/comment-translator"/, "admin shortcut shared contract keeps the tool dashboard path");
assert.match(adminShortcutSharedSource, /server-allowlisted-admin-only/, "admin shortcut shared contract records server allowlist visibility");
assert.match(portalShellSource, /readCommentTranslatorAdminShortcutStateForAccountSession/, "PortalShell resolves admin shortcut state on the server");
assert.match(portalShellSource, /adminShortcut=.+adminShortcut/s, "PortalShell passes only sanitized admin shortcut state to client navigation");
for (const clientNavSource of [portalHeaderSource, portalSidebarSource]) {
  assert.match(
    clientNavSource,
    /data-comment-translator-admin-shortcut="server-allowlisted-admin-only"/,
    "client navigation renders the admin shortcut only from server-provided shortcut state"
  );
  assert.match(clientNavSource, /adminShortcut\.status === "available"/, "client navigation checks the server-provided shortcut state");
  assert.doesNotMatch(
    clientNavSource,
    /COMMENT_TRANSLATOR_ADMIN_ALLOWED_USER_HASHES|createCommentTranslatorAdminUserHash|ownerUserId|owner_user_id|user\.email/,
    "client navigation does not implement email/id/env-based admin checks"
  );
}
assert.match(globalAdminDashboardSource, /readCommentTranslatorAdminAccessForAccountSession/, "global admin dashboard uses the existing server-only admin gate");
assert.match(globalAdminDashboardSource, /href=\{commentTranslatorAdminDashboardPath\}/, "global admin dashboard links to the Comment Translator admin dashboard");
assert.match(globalAdminDashboardSource, /data-admin-dashboard="server-allowlisted-admin-only"/, "global admin dashboard records the server-gated shell marker");
assert.doesNotMatch(
  globalAdminDashboardSource,
  /form action|unblockCommentTranslator|resetCommentTranslator|rateLimitResetAction|rateLimitUnblockAction|fetch\(/,
  "global admin dashboard does not expose or implement future mutation actions"
);
assert.match(adminDashboardSource, /readCommentTranslatorAdminAccess/, "admin dashboard uses the existing server-only admin gate");
assert.match(adminDashboardSource, /\/admin\/comment-translator\/creator-waitlist/, "admin dashboard links to the Creator waitlist admin page");
assert.match(adminDashboardSource, /data-comment-translator-admin-dashboard="server-allowlisted-admin-only"/, "admin dashboard records the server-gated shell marker");
assert.match(adminDashboardSource, /data-comment-translator-admin-planned-tool="disabled-rate-limit-tools"/, "future rate-limit tools are clearly disabled/planned");
assert.doesNotMatch(
  adminDashboardSource,
  /form action|unblockCommentTranslator|resetCommentTranslator|rateLimitResetAction|rateLimitUnblockAction|fetch\(/,
  "dashboard shell does not expose or implement future mutation actions"
);
assert.match(adminPageSource, /const waitlistAdminPath = "\/admin\/comment-translator\/creator-waitlist"/, "admin page defines a safe next path");
assert.match(adminPageSource, /redirect\(`\/login\?next=\$\{waitlistAdminPath\}`\)/, "admin page login gate uses the safe next path");
assert.match(adminPageSource, /const adminDashboardPath = "\/admin\/comment-translator"/, "waitlist admin page defines the dashboard shell path");
assert.match(adminPageSource, /href=\{adminDashboardPath\}/, "waitlist admin page links back to the dashboard shell");
assert.match(adminPageSource, /COMMENT_TRANSLATOR_ADMIN_ALLOWED_USER_HASHES/, "admin page documents the allowlist env without values");
assert.doesNotMatch(adminPageSource, /owner_user_id|providerChannelId|liveChatId/, "admin page does not render owner or provider identifiers");

assert.match(actionsSource, /getCommentTranslatorCreatorWaitlistAction/, "server action exposes current user waitlist state");
assert.match(actionsSource, /registerCommentTranslatorCreatorWaitlistAction/, "server action exposes durable pre-registration");
assert.doesNotMatch(actionsSource, /recordCommentTranslatorCreatorLockedClickAction/, "old Creator click tracking action is removed");
assert.match(routeHarnessSource, /getCommentTranslatorCreatorWaitlistAction/, "route API harness exposes current user waitlist state");
assert.doesNotMatch(
  routeHarnessSource,
  /registerCommentTranslatorCreatorWaitlistAction|getCommentTranslatorCreatorLockedWaitlistAction|recordCommentTranslatorCreatorLockedClickAction/,
  "route API harness removes mutating Creator registration and old locked click actions"
);

assert.match(
  componentSource,
  /data-comment-translator-creator-waitlist="creator-closed-beta-preregistration"/,
  "normal UI renders a Creator pre-registration card"
);
assert.match(componentSource, /registerCommentTranslatorCreatorWaitlistAction/, "UI calls the registration action");
assert.doesNotMatch(
  componentSource,
  /data-comment-translator-creator-click-tracking|sanitized-local-draft-only|recordCommentTranslatorCreatorLockedClickAction/,
  "normal UI no longer exposes click tracking draft language"
);
assert.doesNotMatch(
  componentSource,
  /singleCommentDraft|multilinePasteDraft|manualComments|createManualCommentRows|splitManualCommentInput|Manual \/ Paste Input|Details and test input|詳細確認とテスト入力/,
  "normal public manual input and bottom details/test-input surfaces are removed"
);

assert.match(copySource, /creatorWaitlist/, "localized copy has real waitlist card copy");
assert.match(copySource, /registered|登録済み/, "localized copy covers registered state");
assert.match(copySource, /login|ログイン/, "localized copy covers unauthenticated state");
assert.doesNotMatch(copySource, /sanitized local draft|local draft|click tracking|クリックはsanitized local draft/i, "localized copy removes click tracking draft language");
assert.doesNotMatch(
  `${componentSource}\n${read(privateLaunchFallbackPath)}\n${portalHeaderSource}\n${portalSidebarSource}`,
  /ownerUserId|owner_user_id|internal user id|providerChannelId|liveChatId\s*[:=]|providerTargetMetadata|normalized text hash|cache key/i,
  "normal public/account/tool UI does not expose owner ids, internal ids, provider identifier values, hashes, or cache keys"
);

assert.match(migrationSource, /create table if not exists public\.comment_translator_creator_waitlist_registrations/, "migration creates waitlist table");
assert.match(migrationSource, /status in \('registered', 'invited', 'discount_eligible', 'discount_used', 'cancelled'\)/, "migration constrains waitlist status");
assert.match(migrationSource, /discount_intent text not null default 'first_month_discount'/, "migration stores future discount intent only");
assert.match(migrationSource, /unique index if not exists[\s\S]*owner_user_id, campaign/, "migration prevents duplicate user/campaign registrations");
assert.match(migrationSource, /revoke all on table public\.comment_translator_creator_waitlist_registrations from anon/, "migration blocks anonymous table access");
assert.match(migrationSource, /revoke all on table public\.comment_translator_creator_waitlist_registrations from authenticated/, "migration blocks direct authenticated table access");
assert.match(migrationSource, /grant all on table public\.comment_translator_creator_waitlist_registrations to service_role/, "migration grants service-role access");

const creator = loadTsModule(creatorPath);
const adminGate = loadTsModule(adminGatePath);

assert.equal(creator.commentTranslatorCreatorWaitlistContract.campaign, "creator_closed_beta_2026");
assert.equal(creator.commentTranslatorCreatorWaitlistContract.discountIntent, "first_month_discount");
assert.equal(creator.commentTranslatorCreatorWaitlistContract.stripeLiveAction, "not-run-in-this-slice");
assert.equal(creator.commentTranslatorCreatorWaitlistContract.publicLaunchAllowed, false);

const unregisteredState = await creator.readCommentTranslatorCreatorWaitlistStateWithStore({
  account: { status: "authenticated", ownerUserId: "user-1" },
  store: { readRegistration: async () => null }
});
assert.equal(unregisteredState.status, "unregistered");
assert.equal(unregisteredState.actionState, "enabled");
assert.equal(unregisteredState.registration, null);

const unauthenticatedState = await creator.readCommentTranslatorCreatorWaitlistStateWithStore({
  account: { status: "unauthenticated", reason: "caller-not-authenticated" },
  store: null
});
assert.equal(unauthenticatedState.status, "unauthenticated");
assert.equal(unauthenticatedState.actionState, "login-required");
assert.equal(unauthenticatedState.loginHref, "/login?next=/tools/comment-translator");

const rows = [];
const fakeStore = {
  async readRegistration(request) {
    return rows.find((row) => row.ownerUserId === request.ownerUserId && row.campaign === request.campaign) ?? null;
  },
  async insertRegistration(draft) {
    rows.push(draft);
    return draft;
  }
};
const firstRegistration = await creator.registerCommentTranslatorCreatorWaitlistWithStore({
  account: {
    status: "authenticated",
    ownerUserId: "user-1",
    email: "creator@example.test",
    displayName: "Creator"
  },
  store: fakeStore,
  nowMs: Date.parse("2026-07-05T00:00:00.000Z")
});
assert.equal(firstRegistration.status, "registered");
assert.equal(firstRegistration.duplicatePrevented, false);
assert.equal(firstRegistration.registration.campaign, "creator_closed_beta_2026");
assert.equal(firstRegistration.registration.discountIntent, "first_month_discount");
assert.equal(rows.length, 1, "first registration writes one durable row");

const duplicateRegistration = await creator.registerCommentTranslatorCreatorWaitlistWithStore({
  account: {
    status: "authenticated",
    ownerUserId: "user-1",
    email: "creator@example.test",
    displayName: "Creator"
  },
  store: fakeStore,
  nowMs: Date.parse("2026-07-05T00:01:00.000Z")
});
assert.equal(duplicateRegistration.status, "already-registered");
assert.equal(duplicateRegistration.duplicatePrevented, true);
assert.equal(duplicateRegistration.registration.registeredAtIso, "2026-07-05T00:00:00.000Z");
assert.equal(rows.length, 1, "duplicate registration does not write another row");

const raceDuplicateRegistration = await creator.registerCommentTranslatorCreatorWaitlistWithStore({
  account: {
    status: "authenticated",
    ownerUserId: "user-1",
    email: "creator@example.test",
    displayName: "Creator"
  },
  store: {
    async readRegistration() {
      return null;
    },
    async insertRegistration() {
      return { ...rows[0], duplicatePrevented: true };
    }
  },
  nowMs: Date.parse("2026-07-05T00:02:00.000Z")
});
assert.equal(raceDuplicateRegistration.status, "already-registered");
assert.equal(raceDuplicateRegistration.duplicatePrevented, true);
assert.equal(raceDuplicateRegistration.registration.registeredAtIso, "2026-07-05T00:00:00.000Z");

assert.equal(
  adminGate.readCommentTranslatorAdminAccess({
    account: { status: "authenticated", ownerUserId: "owner-1" },
    env: { COMMENT_TRANSLATOR_ADMIN_ALLOWED_USER_HASHES: adminGate.createCommentTranslatorAdminUserHash("owner-1") }
  }).status,
  "allowed"
);
assert.equal(
  adminGate.readCommentTranslatorAdminAccess({
    account: { status: "authenticated", ownerUserId: "owner-2" },
    env: { COMMENT_TRANSLATOR_ADMIN_ALLOWED_USER_HASHES: adminGate.createCommentTranslatorAdminUserHash("owner-1") }
  }).status,
  "blocked"
);
assert.deepEqual(
  adminGate.readCommentTranslatorAdminShortcutStateForAccountSession({
    accountSession: {
      configStatus: "ready",
      missingEnv: [],
      authStatus: "signed-in",
      user: { id: "owner-1", email: "admin@example.test" },
      remotePreferences: null,
      remotePreferenceStatus: "loaded"
    },
    env: { COMMENT_TRANSLATOR_ADMIN_ALLOWED_USER_HASHES: adminGate.createCommentTranslatorAdminUserHash("owner-1") }
  }),
  {
    status: "available",
    href: "/admin",
    label: "Admin dashboard",
    visibility: "server-allowlisted-admin-only",
    clientReadableDetail: "sanitized-admin-shortcut-only"
  },
  "allowlisted admins receive a sanitized admin dashboard shortcut"
);
assert.equal(
  adminGate.readCommentTranslatorAdminShortcutStateForAccountSession({
    accountSession: {
      configStatus: "ready",
      missingEnv: [],
      authStatus: "signed-in",
      user: { id: "owner-2", email: "user@example.test" },
      remotePreferences: null,
      remotePreferenceStatus: "loaded"
    },
    env: { COMMENT_TRANSLATOR_ADMIN_ALLOWED_USER_HASHES: adminGate.createCommentTranslatorAdminUserHash("owner-1") }
  }).status,
  "hidden",
  "normal signed-in users do not receive admin shortcut state"
);
assert.equal(
  adminGate.readCommentTranslatorAdminShortcutStateForAccountSession({
    accountSession: {
      configStatus: "ready",
      missingEnv: [],
      authStatus: "signed-out",
      user: null,
      remotePreferences: null,
      remotePreferenceStatus: "not-signed-in"
    },
    env: { COMMENT_TRANSLATOR_ADMIN_ALLOWED_USER_HASHES: adminGate.createCommentTranslatorAdminUserHash("owner-1") }
  }).status,
  "hidden",
  "unauthenticated users do not receive admin shortcut state"
);

for (const payload of [
  unregisteredState,
  unauthenticatedState,
  firstRegistration,
  duplicateRegistration,
  raceDuplicateRegistration
]) {
  const serialized = JSON.stringify(payload);
  for (const forbiddenValue of [
    "access_token",
    "refresh_token",
    "authorization_code",
    "service_role",
    "Authorization",
    "liveChatId",
    "providerChannelId",
    "provider-target-metadata",
    "raw-provider",
    "raw comment",
    "ownerUserId",
    "owner_user_id",
    "user-1"
  ]) {
    assert.doesNotMatch(serialized, new RegExp(forbiddenValue, "i"), `Creator waitlist browser/admin-safe output excludes ${forbiddenValue}`);
  }
}

assert.match(taskSource, /Portal sidebar navigation resilience \+ global admin dashboard/i, "task.md records this PR slice");
assert.match(taskSource, /rate-limit mutation actions: not implemented/i, "task.md records rate-limit operations were not implemented");
assert.match(taskSource, /remote migration apply: not-run/i, "task.md records migration apply was not run");

const allowedChangedFiles = new Set([
  sharedPath,
  creatorPath,
  storePath,
  adminGatePath,
  adminPageStatePath,
  actionsPath,
  routeHarnessPath,
  componentPath,
  privateLaunchFallbackPath,
  globalAdminDashboardPath,
  adminShortcutSharedPath,
  portalShellPath,
  portalHeaderPath,
  portalSidebarPath,
  "lib/portal-copy.ts",
  copyPath,
  adminDashboardPath,
  adminPagePath,
  migrationPath,
  "scripts/comment-translator-creator-waitlist-admin-contract.mjs",
  "scripts/comment-translator-portal-admin-navigation-contract.mjs",
  "scripts/comment-translator-free-beta-creator-locked-waitlist-contract.mjs",
  "scripts/comment-translator-public-ui-cleanup-contract.mjs",
  "scripts/comment-translator-free-beta-allowed-tester-route-api-smoke-contract.mjs",
  "scripts/comment-translator-free-beta-pl-g3-feed-bridge-session-persistence-contract.mjs",
  "scripts/comment-translator-public-operator-session-ui-contract.mjs",
  "scripts/comment-translator-real-comments-ui-wiring-contract.mjs",
  "scripts/comment-translator-public-preview-feed-ux-contract.mjs",
  "scripts/comment-translator-stop-preview-retention-contract.mjs",
  "scripts/comment-translator-ui-live-provider-runtime-contract.mjs",
  taskPath
]);
for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `Creator waitlist change stays in allowed files: ${file}`);

  if (file.endsWith(".mjs") || file.endsWith(".sql")) {
    continue;
  }

  const source = read(file);
  assert.doesNotMatch(
    source,
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+/i,
    `${file} does not contain secret values, token values, authorization values, or private provider identifiers`
  );
}

console.log("comment translator Creator waitlist admin contract checks passed");
