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

const routeFiles = [
  "app/login/page.tsx",
  "app/signup/page.tsx",
  "app/reset-password/page.tsx",
  "app/account/security/page.tsx"
];

for (const file of routeFiles) {
  assertFile(file);
}

const actionSource = read("app/account/actions.ts");
assertIncludes(
  actionSource,
  [
    "signInWithPassword",
    "signUp",
    "resetPasswordForEmail",
    "updateUser",
    "password",
    "next"
  ],
  "email/password auth actions"
);
assertExcludes(actionSource, ["signInWithOtp"], "public auth actions remove magic-link primary flow");
assertExcludes(
  actionSource,
  ["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY", "localStorage.setItem", "indexedDB.open"],
  "auth actions stay inside public-key and no-local-payload boundary"
);

const loginPage = read("app/login/page.tsx");
const authFlowShell = read("components/account/AuthFlowShell.tsx");
assertIncludes(loginPage, ["signInWithPasswordAction", "AuthFlowShell", "mode=\"login\""], "login page");
assertIncludes(authFlowShell, ["email", "password", "/signup", "/reset-password"], "shared login form");

const signupPage = read("app/signup/page.tsx");
assertIncludes(signupPage, ["signUpWithPasswordAction", "AuthFlowShell", "mode=\"signup\""], "signup page");
assertIncludes(authFlowShell, ["email", "password", "/login"], "shared signup form");

const resetPage = read("app/reset-password/page.tsx");
assertIncludes(resetPage, ["resetPasswordEmailAction", "AuthFlowShell", "mode=\"reset\""], "reset password request page");
assertIncludes(authFlowShell, ["email", "/login"], "shared reset password form");

const securityPage = read("app/account/security/page.tsx");
assertIncludes(securityPage, ["updatePasswordAction", "AuthFlowShell", "mode=\"update-password\""], "account security password page");
assertIncludes(authFlowShell, ["password", "/account"], "shared account security form");

const accountPage = read("app/account/page.tsx");
assertIncludes(accountPage, ["redirect", "/login?next=/account", "AccountPreferencesShell"], "account signed-out redirect");

const accountShell = read("components/account/AccountPreferencesShell.tsx");
assertIncludes(accountShell, ["signOutAction", "saveLocaleThemePreferenceAction", "remotePreferences"], "account settings shell");
assertExcludes(
  accountShell,
  [
    "signInAction",
    "Email magic link",
    "magic-link",
    "Supabase Auth",
    "Auth / DB boundary",
    "publishable key",
    "migration / RLS / GRANT",
    "Local Free",
    "trusted server only"
  ],
  "account shell removes implementation-facing public copy"
);

const portalCopy = read("lib/portal-copy.ts");
assertIncludes(
  portalCopy,
  [
    "アカウントで設定を保存",
    "ログイン / 登録",
    "アカウント設定",
    "Save settings with an account",
    "Log in / Sign up",
    "Account settings"
  ],
  "portal account CTA copy"
);
assertExcludes(portalCopy, ["ログイン予定", "Sign-in planned"], "portal account CTA is no longer planned-only");

const portalSidebar = read("components/portal/PortalSidebar.tsx");
assertIncludes(portalSidebar, ["href={accountHref}", "accountCta"], "desktop sidebar account CTA uses real auth destination");

const portalHeader = read("components/portal/PortalHeader.tsx");
assertIncludes(portalHeader, ["accountCta", "href={accountHref}"], "mobile drawer account CTA uses real auth destination");

const authConfirmRoute = read("app/auth/confirm/route.ts");
assertIncludes(authConfirmRoute, ["/account/security", "recovery"], "auth confirm allows password recovery redirect");

console.log("account auth public readiness contract checks passed");
