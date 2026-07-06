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

function assertExcludes(source, snippets, label) {
  for (const snippet of snippets) {
    assert.equal(source.includes(snippet), false, `${label} excludes ${snippet}`);
  }
}

assert.ok(
  exists("components/account/AccountRemoteDisplaySettingsApplier.tsx"),
  "remote display settings applier client component exists"
);

const applier = read("components/account/AccountRemoteDisplaySettingsApplier.tsx");
const portalShell = read("components/portal/PortalShell.tsx");
const accountPage = read("app/account/page.tsx");
const localPreferenceAdapter = read("lib/local-preferences.ts");
const sessionSource = read("lib/supabase/session.ts");
const task = read("task.md");

assertIncludes(
  applier,
  [
    '"use client"',
    "AccountSessionBrowserSafeViewModel",
    "remotePreferences",
    "readLocalPreferenceSnapshot",
    "writeLocalLocalePreference",
    "writeLocalThemePreference",
    "writeLocalTimeZonePreference",
    "themePreferenceChangeEvent",
    "setLocale",
    'auth") === "signed-in"',
    "document.documentElement.classList.toggle",
    "timeZone"
  ],
  "remote display settings applier"
);
assertExcludes(
  applier,
  [
    "AccountSessionState",
    "user?.id",
    "user.id",
    "@supabase/ssr",
    "@supabase/supabase-js",
    "SUPABASE_SECRET_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "service_role",
    "localStorage.setItem",
    "indexedDB",
    "sessionStorage"
  ],
  "remote display settings applier scope"
);

assertIncludes(
  portalShell,
  [
    "createBrowserSafeAccountSessionViewModel",
    "const browserSafeAccountStatus = createBrowserSafeAccountSessionViewModel(accountStatus);",
    "AccountRemoteDisplaySettingsApplier",
    "accountStatus={browserSafeAccountStatus}"
  ],
  "PortalShell applies remote display settings from the browser-safe account session view model"
);
assert.match(
  portalShell,
  /<AccountRemoteDisplaySettingsApplier accountStatus=\{browserSafeAccountStatus\} \/>[\s\S]*<PortalSidebar/,
  "PortalShell applies browser-safe remote display settings before shared navigation controls render"
);

assertIncludes(
  accountPage,
  ["<PortalShell>", "authMessage={authMessage}", "authStatus={browserSafeAccountSession}"],
  "/account still uses the shared PortalShell and account shell"
);
assertIncludes(
  sessionSource,
  [".from(\"user_preferences\")", ".select(\"locale,theme,time_zone,updated_at\")", "normalizeLocale", "normalizeThemePreference", "normalizeTimeZonePreference"],
  "server session limits remote preference read to shared display settings"
);
assertIncludes(
  localPreferenceAdapter,
  [
    'locale: localePreferenceStorageKey',
    'theme: themePreferenceStorageKey',
    'timeZone: timeZonePreferenceStorageKey',
    'themePreferenceStorageKey = "v-streamer-tools-theme"',
    'timeZonePreferenceStorageKey = "v-streamer-tools-time-zone"'
  ],
  "shared local preference keys are explicit"
);

assertIncludes(
  task,
  [
    "Browser-safe account session view model",
    "node scripts/account-browser-safe-session-view-model-contract.mjs",
    "node scripts/account-remote-display-settings-contract.mjs",
    "npx tsc --noEmit --pretty false"
  ],
  "task handoff documents implementation and verification"
);

console.log("account remote display settings contract checks passed");
