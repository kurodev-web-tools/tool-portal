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
  ["AccountRemoteDisplaySettingsApplier", "accountStatus={accountStatus}"],
  "PortalShell applies remote display settings from the shared account session"
);
assert.match(
  portalShell,
  /<AccountRemoteDisplaySettingsApplier accountStatus=\{accountStatus\} \/>[\s\S]*<PortalSidebar/,
  "PortalShell applies remote display settings before shared navigation controls render"
);

assertIncludes(
  accountPage,
  ["<PortalShell>", "authMessage={authMessage}", "authStatus={accountSession}"],
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
    "Shared display timezone preference slice",
    "node scripts/account-remote-display-settings-contract.mjs",
    "node scripts/comment-translator-shared-timezone-preference-contract.mjs"
  ],
  "task handoff documents implementation and verification"
);

console.log("account remote display settings contract checks passed");
