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

const actionSource = read("app/account/actions.ts");
assertIncludes(
  actionSource,
  [
    "allowedAuthNextPaths",
    "getAuthRedirectOrigin",
    "NEXT_PUBLIC_SITE_URL",
    "NEXT_PUBLIC_AUTH_REDIRECT_ORIGINS",
    "isTrustedRequestOrigin",
    "x-forwarded-host",
    "host",
    "new URL(value, \"http://localhost\")"
  ],
  "auth redirect origin and next-path hardening"
);
assertExcludes(
  actionSource,
  [
    "headerStore.get(\"origin\") ?? process.env.NEXT_PUBLIC_SITE_URL",
    "process.env.NEXT_PUBLIC_SITE_URL ?? \"http://localhost:3000\""
  ],
  "auth redirect origin does not blindly trust arbitrary Origin"
);
assertIncludes(
  actionSource,
  [
    "emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}`",
    "redirectTo: `${origin}/auth/confirm?next=/account/security`",
    "auth.getUser"
  ],
  "auth actions keep email redirects and server-side user guards"
);
assertExcludes(
  actionSource,
  ["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY", "service_role", "localStorage.setItem", "indexedDB.open"],
  "auth actions exclude elevated keys and browser storage writes"
);

const securityPage = read("app/account/security/page.tsx");
assertIncludes(
  securityPage,
  [
    "getAccountSessionState",
    "redirect",
    "/login?next=/account/security",
    "accountSession.authStatus !== \"signed-in\"",
    "updatePasswordAction"
  ],
  "account security page-level signed-in gate"
);

const browserAndUiSources = [
  "lib/supabase/browser.ts",
  "components/account/AuthFlowShell.tsx",
  "components/account/AccountPreferencesShell.tsx",
  "components/account/AccountRemoteDisplaySettingsApplier.tsx"
].map(read).join("\n");
assertExcludes(
  browserAndUiSources,
  ["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY", "service_role"],
  "browser/account UI sources exclude elevated Supabase keys"
);

console.log("auth security hardening contract checks passed");
