import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();

const globalAdminPagePath = "app/admin/page.tsx";
const commentTranslatorAdminPagePath = "app/admin/comment-translator/page.tsx";
const creatorWaitlistAdminPagePath = "app/admin/comment-translator/creator-waitlist/page.tsx";
const adminGatePath = "lib/comment-translator-admin-access-gate.ts";
const adminShortcutSharedPath = "lib/comment-translator-admin-shortcut-shared.ts";
const portalCopyPath = "lib/portal-copy.ts";
const portalHeaderPath = "components/portal/PortalHeader.tsx";
const portalSidebarPath = "components/portal/PortalSidebar.tsx";
const portalShellPath = "components/portal/PortalShell.tsx";
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

    const compiled = ts.transpileModule(fs.readFileSync(normalizedModulePath, "utf8"), {
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
  globalAdminPagePath,
  commentTranslatorAdminPagePath,
  creatorWaitlistAdminPagePath,
  adminGatePath,
  adminShortcutSharedPath,
  portalCopyPath,
  portalHeaderPath,
  portalSidebarPath,
  portalShellPath,
  taskPath
]) {
  assert.ok(exists(requiredPath), `portal admin navigation required file exists: ${requiredPath}`);
}

const globalAdminPageSource = read(globalAdminPagePath);
const commentTranslatorAdminPageSource = read(commentTranslatorAdminPagePath);
const creatorWaitlistAdminPageSource = read(creatorWaitlistAdminPagePath);
const adminGateSource = read(adminGatePath);
const adminShortcutSharedSource = read(adminShortcutSharedPath);
const portalCopySource = read(portalCopyPath);
const portalHeaderSource = read(portalHeaderPath);
const portalSidebarSource = read(portalSidebarPath);
const portalShellSource = read(portalShellPath);
const taskSource = read(taskPath);

assert.match(adminShortcutSharedSource, /globalAdminDashboardPath = "\/admin"/, "shared shortcut contract defines the global admin dashboard route");
assert.match(
  adminShortcutSharedSource,
  /commentTranslatorAdminDashboardPath = "\/admin\/comment-translator"/,
  "shared shortcut contract keeps the Comment Translator admin dashboard route"
);
assert.match(adminShortcutSharedSource, /href: globalAdminDashboardPath/, "admin shortcut points to the global dashboard");
assert.match(adminShortcutSharedSource, /label: "Admin dashboard"/, "admin shortcut labels the global management dashboard");
assert.doesNotMatch(adminShortcutSharedSource, /label: "Comment Translator admin"/, "admin shortcut is no longer scoped to a single tool");

assert.match(adminGateSource, /^import "server-only";/m, "admin allowlist gate remains server-only");
assert.match(adminGateSource, /readCommentTranslatorAdminAccessForAccountSession/, "admin gate exposes a session-to-access helper");
assert.match(adminGateSource, /gatedSurfaces: \["\/admin", "\/admin\/comment-translator", "\/admin\/comment-translator\/creator-waitlist"\]/, "admin gate records the full admin hierarchy");

const adminGate = loadTsModule(adminGatePath);
const allowedHash = adminGate.createCommentTranslatorAdminUserHash("owner-1");
assert.equal(
  adminGate.readCommentTranslatorAdminShortcutStateForAccountSession({
    accountSession: {
      configStatus: "ready",
      missingEnv: [],
      authStatus: "signed-in",
      user: { id: "owner-1", email: "admin@example.test" },
      remotePreferences: null,
      remotePreferenceStatus: "loaded"
    },
    env: { COMMENT_TRANSLATOR_ADMIN_ALLOWED_USER_HASHES: allowedHash }
  }).href,
  "/admin",
  "allowlisted admins receive the global admin dashboard shortcut"
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
    env: { COMMENT_TRANSLATOR_ADMIN_ALLOWED_USER_HASHES: allowedHash }
  }).status,
  "hidden",
  "normal signed-in users do not receive admin navigation"
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
    env: { COMMENT_TRANSLATOR_ADMIN_ALLOWED_USER_HASHES: allowedHash }
  }).status,
  "hidden",
  "unauthenticated users do not receive admin navigation"
);

assert.match(globalAdminPageSource, /readCommentTranslatorAdminAccessForAccountSession/, "global admin dashboard uses the server-only session gate");
assert.match(globalAdminPageSource, /redirect\(`\/login\?next=\$\{globalAdminDashboardPath\}`\)/, "global admin login redirect returns to /admin");
assert.match(globalAdminPageSource, /data-admin-dashboard="server-allowlisted-admin-only"/, "global admin dashboard records a server-gated marker");
assert.match(globalAdminPageSource, /href=\{commentTranslatorAdminDashboardPath\}/, "global admin dashboard links to the Comment Translator admin dashboard");
assert.doesNotMatch(
  globalAdminPageSource,
  /form action|unblockCommentTranslator|resetCommentTranslator|rateLimitResetAction|rateLimitUnblockAction|fetch\(/,
  "global admin dashboard does not expose mutation controls"
);

assert.match(commentTranslatorAdminPageSource, /readCommentTranslatorAdminAccessForAccountSession/, "Comment Translator admin page uses the same session gate helper");
assert.match(commentTranslatorAdminPageSource, /href=\{globalAdminDashboardPath\}/, "Comment Translator admin page links back to the global admin dashboard");
assert.match(commentTranslatorAdminPageSource, /href=\{creatorWaitlistAdminPath\}/, "Comment Translator admin page keeps the Creator waitlist link");
assert.match(commentTranslatorAdminPageSource, /data-comment-translator-admin-dashboard="server-allowlisted-admin-only"/, "Comment Translator admin dashboard remains server-gated");
assert.doesNotMatch(
  commentTranslatorAdminPageSource,
  /form action|unblockCommentTranslator|resetCommentTranslator|rateLimitResetAction|rateLimitUnblockAction|fetch\(/,
  "Comment Translator admin dashboard remains non-mutating"
);

assert.match(creatorWaitlistAdminPageSource, /const adminDashboardPath = "\/admin\/comment-translator"/, "Creator waitlist links through the tool admin dashboard");
assert.match(creatorWaitlistAdminPageSource, /href=\{adminDashboardPath\}/, "Creator waitlist keeps an admin hierarchy back link");
assert.doesNotMatch(creatorWaitlistAdminPageSource, /owner_user_id|providerChannelId|liveChatId/, "Creator waitlist admin page does not render private identifiers");

assert.match(portalShellSource, /readCommentTranslatorAdminShortcutStateForAccountSession/, "PortalShell resolves admin shortcut state on the server");
assert.match(portalShellSource, /adminShortcut=.+adminShortcut/s, "PortalShell passes only sanitized admin shortcut state to client navigation");

assert.doesNotMatch(portalSidebarSource, /copy\.fixed/, "desktop sidebar no longer renders a fixed-nav heading");
assert.doesNotMatch(portalSidebarSource, /copy\.futureItems|copy\.future|copy\.comingSoon/, "persistent sidebar does not render future placeholder clutter");
assert.match(portalSidebarSource, /min-h-0 flex-1 overflow-y-auto/, "desktop sidebar middle navigation region is independently scrollable");
assert.match(portalSidebarSource, /shrink-0 border-t border-border/, "desktop sidebar bottom account/settings region is stable");
assert.match(portalSidebarSource, /data-portal-sidebar-tools="all-tools-in-every-rail"[\s\S]*sidebarTools\.map/, "implemented tool list stays available in expanded and compact sidebars");
assert.match(portalSidebarSource, /data-comment-translator-admin-shortcut="server-allowlisted-admin-only"/, "sidebar admin entry stays server-state driven");
assert.doesNotMatch(
  portalSidebarSource,
  /COMMENT_TRANSLATOR_ADMIN_ALLOWED_USER_HASHES|createCommentTranslatorAdminUserHash|ownerUserId|owner_user_id/,
  "sidebar does not implement client-side admin checks"
);

assert.match(portalHeaderSource, /sidebarTools\.map/, "mobile drawer enumerates every implemented sidebar tool");
assert.match(portalHeaderSource, /getToolCopy\(tool\.id, locale\)\.name/, "mobile drawer localizes implemented tool names");
assert.match(portalHeaderSource, /const navItems = \[[\s\S]*href: "\/"[\s\S]*href: "\/tools"[\s\S]*\]/, "mobile drawer uses top-level destinations");
assert.match(portalHeaderSource, /pathname\.startsWith\("\/admin"\)/, "header title recognizes admin routes");
assert.match(portalHeaderSource, /data-comment-translator-admin-shortcut="server-allowlisted-admin-only"/, "mobile drawer admin entry stays server-state driven");
assert.doesNotMatch(
  portalHeaderSource,
  /COMMENT_TRANSLATOR_ADMIN_ALLOWED_USER_HASHES|createCommentTranslatorAdminUserHash|ownerUserId|owner_user_id/,
  "header does not implement client-side admin checks"
);

assert.match(portalCopySource, /adminDashboard: "管理ダッシュボード"/, "Japanese navigation copy names the admin dashboard");
assert.match(portalCopySource, /adminDashboard: "Admin dashboard"/, "English navigation copy names the admin dashboard");

for (const [label, source] of [
  [globalAdminPagePath, globalAdminPageSource],
  [commentTranslatorAdminPagePath, commentTranslatorAdminPageSource],
  [creatorWaitlistAdminPagePath, creatorWaitlistAdminPageSource],
  [portalHeaderPath, portalHeaderSource],
  [portalSidebarPath, portalSidebarSource]
]) {
  assert.doesNotMatch(
    source,
    /owner id|internal user id|provider private|provider target metadata|liveChatId|access_token|refresh_token|Authorization header|browser storage payload|raw response|raw comment/i,
    `${label} keeps browser-readable copy sanitized`
  );
}

assert.match(taskSource, /Portal sidebar navigation resilience \+ global admin dashboard/i, "task.md records this PR slice");
assert.match(taskSource, /rate-limit mutation actions: not implemented/i, "task.md records rate-limit mutations are still out of scope");

const allowedChangedFiles = new Set([
  globalAdminPagePath,
  commentTranslatorAdminPagePath,
  creatorWaitlistAdminPagePath,
  adminGatePath,
  adminShortcutSharedPath,
  portalCopyPath,
  portalHeaderPath,
  portalSidebarPath,
  portalShellPath,
  "scripts/comment-translator-creator-waitlist-admin-contract.mjs",
  "scripts/comment-translator-free-beta-allowed-tester-route-api-smoke-contract.mjs",
  "scripts/comment-translator-real-comments-ui-wiring-contract.mjs",
  "scripts/comment-translator-portal-admin-navigation-contract.mjs",
  taskPath
]);

for (const file of changedFiles()) {
  assert.ok(allowedChangedFiles.has(file), `portal admin navigation change stays in allowed files: ${file}`);

  if (file.endsWith(".mjs")) {
    continue;
  }

  assert.doesNotMatch(
    read(file),
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+/i,
    `${file} does not contain secret values, token values, authorization values, or private provider identifiers`
  );
}

console.log("comment translator portal admin navigation contract checks passed");
