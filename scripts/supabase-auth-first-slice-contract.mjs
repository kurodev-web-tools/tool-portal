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

const packageJson = JSON.parse(read("package.json"));

assert.equal(
  typeof packageJson.dependencies["@supabase/supabase-js"],
  "string",
  "Supabase JS SDK dependency is added intentionally"
);
assert.equal(typeof packageJson.dependencies["@supabase/ssr"], "string", "Supabase SSR dependency is added intentionally");

const requiredFiles = [
  "lib/supabase/env.ts",
  "lib/supabase/browser.ts",
  "lib/supabase/server.ts",
  "lib/supabase/session.ts",
  "app/account/actions.ts",
  "app/auth/confirm/route.ts",
  "proxy.ts",
  "next.config.mjs",
  "supabase/migrations/20260527000000_account_preferences_foundation.sql"
];

for (const file of requiredFiles) {
  assertFile(file);
}

const envSource = read("lib/supabase/env.ts");
assertIncludes(
  envSource,
  [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SECRET_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "getSupabasePublicConfig"
  ],
  "Supabase env boundary"
);
assertExcludes(envSource, ["sb_secret_", "service_role="], "Supabase env boundary real secret values");

const browserSource = read("lib/supabase/browser.ts");
assertIncludes(browserSource, ["createBrowserClient", "getSupabasePublicConfig"], "browser Supabase client");
assertExcludes(browserSource, ["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"], "browser Supabase client");

const serverSource = read("lib/supabase/server.ts");
assertIncludes(serverSource, ["createServerClient", "cookies", "getSupabasePublicConfig"], "server Supabase client");
assertExcludes(serverSource, ["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"], "server Supabase client first slice");

const sessionSource = read("lib/supabase/session.ts");
assertIncludes(
  sessionSource,
  ["auth.getUser", "user_preferences", "locale", "theme", "configStatus"],
  "account session and locale/theme preference read boundary"
);
assertExcludes(sessionSource, ["tool_preferences", "usage_quotas", "localStorage", "indexedDB"], "session first slice scope");

const actionSource = read("app/account/actions.ts");
assertIncludes(
  actionSource,
  ["use server", "signInWithOtp", "auth.signOut", "saveLocaleThemePreferenceAction", "user_preferences"],
  "account auth actions"
);
assertExcludes(
  actionSource,
  ["tool_preferences", "usage_quotas", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY", "localStorage.setItem", "indexedDB.open"],
  "account action first slice scope"
);

const confirmRoute = read("app/auth/confirm/route.ts");
assertIncludes(confirmRoute, ["verifyOtp", "token_hash", "type", "NextResponse.redirect"], "auth confirm route");

const proxySource = read("proxy.ts");
assertIncludes(proxySource, ["createServerClient", "auth.getClaims", "request.cookies", "response.cookies"], "SSR cookie refresh proxy");
assertExcludes(proxySource, ["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"], "proxy public-key boundary");

const nextConfig = read("next.config.mjs");
assertExcludes(nextConfig, ["output: \"export\""], "server runtime config boundary");

const accountPage = read("app/account/page.tsx");
assertIncludes(
  accountPage,
  ["getAccountSessionState", "signInWithEmailAction", "signOutAction", "saveLocaleThemePreferenceAction"],
  "account page server wiring"
);

const accountShell = read("components/account/AccountPreferencesShell.tsx");
assertIncludes(
  accountShell,
  ["signInAction", "signOutAction", "saveLocaleThemePreferenceAction", "authStatus", "remotePreferences"],
  "account shell auth UI"
);
assertExcludes(
  accountShell,
  ["@supabase/ssr", "@supabase/supabase-js", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY", "localStorage.setItem"],
  "account shell keeps SDK/session writes out of client UI"
);

const migration = read("supabase/migrations/20260527000000_account_preferences_foundation.sql");
assertIncludes(
  migration,
  [
    "create table if not exists public.user_profiles",
    "create table if not exists public.user_preferences",
    "create table if not exists public.tool_preferences",
    "create table if not exists public.usage_quotas",
    "enable row level security",
    "grant select, insert, update on table public.user_preferences to authenticated",
    "grant select on table public.usage_quotas to authenticated",
    "quota writes are trusted-server-only"
  ],
  "Supabase migration boundary"
);
assertExcludes(
  migration,
  [
    "grant all",
    "grant insert, update on table public.usage_quotas to authenticated",
    "grant update on table public.usage_quotas to authenticated",
    "security definer"
  ],
  "Supabase migration avoids broad/browser quota writes"
);

const task = read("task.md");
assertIncludes(
  task,
  [
    "Supabase Auth first slice",
    "node scripts/supabase-auth-first-slice-contract.mjs",
    "secret / service_role key は要求・表示・保存していない"
  ],
  "task handoff"
);

console.log("supabase auth first slice contract checks passed");
