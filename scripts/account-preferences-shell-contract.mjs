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

assert.ok(exists("app/account/page.tsx"), "/account route exists");
assert.ok(exists("components/account/AccountPreferencesShell.tsx"), "account preferences shell component exists");

const accountPage = read("app/account/page.tsx");
const accountShell = read("components/account/AccountPreferencesShell.tsx");
const localeLib = read("lib/locale.ts");
const themeToggle = read("components/portal/ThemeToggle.tsx");

assert.match(accountPage, /<PortalShell>/, "/account route uses PortalShell");
assert.match(accountPage, /<AccountPreferencesShell \/>/, "/account route renders account shell");

assert.match(accountShell, /LanguageSwitch/, "account shell exposes language switch");
assert.match(accountShell, /ThemeToggle/, "account shell exposes theme switch");
assert.match(accountShell, /local-only/i, "account shell states local-only boundary");
assert.match(accountShell, /Auth|login|sign-in|ログイン/, "account shell keeps auth as placeholder");
assert.match(accountShell, /plan|プラン/, "account shell includes plan placeholder");
assert.match(accountShell, /preferences|設定/, "account shell includes preferences placeholder");

assert.match(localeLib, /localePreferenceStorageKey = "v-streamer-tools-locale"/, "locale storage key is unchanged");
assert.match(themeToggle, /themePreferenceStorageKey = "v-streamer-tools-theme"/, "theme storage key is unchanged");

assert.doesNotMatch(accountShell, /localStorage\.setItem\((?!themePreferenceStorageKey|localePreferenceStorageKey)/, "account shell does not introduce new localStorage writes");
assert.doesNotMatch(accountShell, /indexedDB|sessionStorage|fetch\(|\/api\//, "account shell does not touch IndexedDB, sessionStorage, or API routes");

console.log("account preferences shell contract checks passed");
