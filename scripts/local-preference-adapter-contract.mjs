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

assert.ok(exists("lib/local-preferences.ts"), "local preference adapter exists");

const adapter = read("lib/local-preferences.ts");
const localeProvider = read("components/portal/LocaleProvider.tsx");
const themeToggle = read("components/portal/ThemeToggle.tsx");
const accountShell = read("components/account/AccountPreferencesShell.tsx");

assert.match(adapter, /localePreferenceStorageKey/, "adapter keeps the locale storage key boundary");
assert.match(adapter, /themePreferenceStorageKey = "v-streamer-tools-theme"/, "adapter keeps the theme storage key unchanged");
assert.match(adapter, /readLocalLocalePreference/, "adapter exposes locale read helper");
assert.match(adapter, /writeLocalLocalePreference/, "adapter exposes locale write helper");
assert.match(adapter, /readLocalThemePreference/, "adapter exposes theme read helper");
assert.match(adapter, /writeLocalThemePreference/, "adapter exposes theme write helper");
assert.match(adapter, /FutureLocalPreferenceCandidate/, "adapter keeps future candidates as type placeholders");
assert.match(adapter, /thumbnail-editor/, "thumbnail preference candidates stay placeholder-only");
assert.match(adapter, /schedule-calendar/, "schedule preference candidates stay placeholder-only");
assert.match(adapter, /comment-translator/, "translator preference candidates stay placeholder-only");

assert.match(localeProvider, /readLocalLocalePreference/, "LocaleProvider reads locale through the adapter");
assert.match(localeProvider, /writeLocalLocalePreference/, "LocaleProvider writes locale through the adapter");
assert.match(themeToggle, /readLocalThemePreference/, "ThemeToggle reads theme through the adapter");
assert.match(themeToggle, /writeLocalThemePreference/, "ThemeToggle writes theme through the adapter");
assert.match(accountShell, /localPreferenceStorageKeys/, "account shell displays storage keys from the adapter");

assert.doesNotMatch(localeProvider, /localStorage\.(getItem|setItem|removeItem)/, "LocaleProvider does not touch localStorage directly");
assert.doesNotMatch(themeToggle, /localStorage\.(getItem|setItem|removeItem)/, "ThemeToggle does not touch localStorage directly");

assert.doesNotMatch(adapter, /indexedDB|sessionStorage|fetch\(|\/api\//, "adapter stays local-only and does not add API, IndexedDB, or sessionStorage access");
assert.doesNotMatch(adapter, /removeItem|clear\(/, "adapter does not migrate or delete existing storage");

console.log("local preference adapter contract checks passed");
