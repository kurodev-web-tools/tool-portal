import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertFile(relativePath) {
  assert.ok(fs.existsSync(path.join(root, relativePath)), `file exists: ${relativePath}`);
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

assertFile("lib/supabase/recovery-session.ts");

const recoverySessionSource = read("lib/supabase/recovery-session.ts");
assertIncludes(
  recoverySessionSource,
  [
    "authRecoverySessionCookieName",
    "v-streamer-tools-auth-recovery-pending",
    "markRecoverySessionPending",
    "clearRecoverySessionPending",
    "clearRecoverySessionResponse",
    "isRecoverySessionPending",
    "httpOnly: true",
    "sameSite: \"lax\"",
    "maxAge: 60 * 60"
  ],
  "recovery pending cookie boundary"
);
assertExcludes(
  recoverySessionSource,
  ["localStorage", "indexedDB", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY", "service_role"],
  "recovery pending state avoids browser storage and elevated keys"
);

const confirmRoute = read("app/auth/confirm/route.ts");
assertIncludes(
  confirmRoute,
  [
    "passwordRecoveryOtpType",
    "markRecoverySessionPending",
    "clearRecoverySessionResponse",
    "type === passwordRecoveryOtpType",
    "auth\", \"recovery-pending\"",
    "auth\", \"signed-in\""
  ],
  "auth confirm separates recovery from normal sign-in"
);

const middleware = read("middleware.ts");
assertIncludes(
  middleware,
  [
    "authRecoverySessionCookieName",
    "request.nextUrl.pathname",
    "pathname.startsWith(\"/account\")",
    "pathname !== \"/account/security\"",
    "/account/security",
    "recovery-pending"
  ],
  "middleware keeps recovery pending sessions out of normal account pages"
);

const accountPage = read("app/account/page.tsx");
assertIncludes(
  accountPage,
  ["isRecoverySessionPending", "/account/security?auth=recovery-pending", "AccountPreferencesShell"],
  "account page blocks recovery pending sessions"
);

const securityPage = read("app/account/security/page.tsx");
assertIncludes(
  securityPage,
  ["isRecoverySessionPending", "passwordFlow={recoveryPending ? \"recovery\" : \"signed-in\"}", "updatePasswordAction"],
  "account security page tells UI which password flow is active"
);

const authFlowShell = read("components/account/AuthFlowShell.tsx");
assertIncludes(
  authFlowShell,
  [
    "type PasswordFlow = \"recovery\" | \"signed-in\"",
    "currentPasswordLabel",
    "showCurrentPassword",
    "name=\"currentPassword\"",
    "autoComplete=\"current-password\"",
    "recovery-pending"
  ],
  "password form distinguishes recovery reset from signed-in password change"
);

const actionSource = read("app/account/actions.ts");
assertIncludes(
  actionSource,
  [
    "isRecoverySessionPending",
    "clearRecoverySessionPending",
    "const recoveryPending = await isRecoverySessionPending()",
    "readRequiredString(formData, \"currentPassword\")",
    "current-password-required",
    "passwordAttributes.current_password = currentPassword",
    "await supabase.auth.signOut()",
    "redirectWithAuth(\"/login\", \"password-updated\")",
    "redirectWithAuth(\"/account\", \"password-updated\")"
  ],
  "password update action separates recovery reset from signed-in password change"
);
assertExcludes(
  actionSource,
  ["tool_preferences", "usage_quotas", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY", "localStorage.setItem", "indexedDB.open"],
  "password hardening stays inside auth action and storage boundary"
);

const accountShell = read("components/account/AccountPreferencesShell.tsx");
assertIncludes(
  accountShell,
  ["securityTitle", "securityBody", "changePassword", "href=\"/account/security\""],
  "account page exposes signed-in password change entry point"
);

const task = read("task.md");
assertIncludes(
  task,
  [
    "Auth recovery-session hardening follow-up",
    "node scripts/auth-recovery-session-hardening-contract.mjs",
    "recovery pending",
    "currentPassword"
  ],
  "task records recovery hardening verification and behavior"
);

console.log("auth recovery session hardening contract checks passed");
