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
const localPreferenceAdapter = read("lib/local-preferences.ts");

assert.match(accountPage, /<PortalShell>/, "/account route uses PortalShell");
assert.match(accountPage, /redirect\("\/login\?next=\/account"\)/, "/account redirects signed-out users to login");
assert.match(accountPage, /<AccountPreferencesShell[\s\S]*saveLocaleThemePreferenceAction={saveLocaleThemePreferenceAction}[\s\S]*signOutAction={signOutAction}[\s\S]*\/>/, "/account route renders signed-in account shell");

assert.match(accountShell, /LanguageSwitch/, "account shell exposes language switch");
assert.match(accountShell, /ThemeToggle/, "account shell exposes theme switch");
assert.match(accountShell, /ログイン中|Signed in|account/i, "account shell keeps signed-in account state");
assert.match(accountShell, /Free \/ Pro/, "account shell includes restrained plan note");
assert.match(accountShell, /表示設定/, "Japanese account shell uses user-facing display settings copy");
assert.match(accountShell, /アカウント状況/, "Japanese account shell labels the top card as account status");
assert.match(accountShell, /Account status/, "English account shell labels the top card as account status");
assert.match(accountShell, /アカウントに保存済みの設定/, "Japanese account shell labels saved account settings for users");
assert.match(accountShell, /今後保存できるようにする項目/, "Japanese account shell avoids implementation-facing sync candidate copy");
assert.match(accountShell, /表示言語/, "Japanese account shell labels locale as display language");
assert.match(accountShell, /テーマ/, "Japanese account shell labels theme as theme");
assert.match(accountShell, /タイムゾーン/, "Japanese account shell labels timezone as timezone");
assert.match(accountShell, /このブラウザに保存/, "Japanese account shell explains local-first settings without local-only wording");
assert.match(accountShell, /role="status"[\s\S]*fixed/, "account save result is shown as a transient toast status");
assert.match(accountShell, /<form action={signOutAction} className="flex justify-end">/, "account sign out control is moved to the bottom end of the page");
assert.doesNotMatch(accountShell, /lg:grid-cols-\[minmax\(0,1fr\)_18rem\]/, "account hero no longer keeps a top-right signed-in card");
assert.match(accountShell, /<TimeZoneSelect \/>/, "account shell exposes shared timezone selector");
assert.match(accountShell, /sm:grid-cols-3/, "display setting controls keep language theme timezone in one responsive grid");
assert.doesNotMatch(accountShell, /<StatusPill>{copy\.localOnly}<\/StatusPill>/, "local-only badge is not shown in the public account UI");
assert.doesNotMatch(accountShell, /locale \/ theme|account preference|sync候補|将来の sync 候補|local-only/, "Japanese-facing implementation terms are not present in account shell source");

assert.match(localeLib, /localePreferenceStorageKey = "v-streamer-tools-locale"/, "locale storage key is unchanged");
assert.match(localPreferenceAdapter, /themePreferenceStorageKey = "v-streamer-tools-theme"/, "theme storage key is unchanged");
assert.match(accountShell, /localPreferenceStorageKeys/, "account shell reads storage key labels through local preference adapter");
assert.match(accountShell, /const hiddenLocale = locale;/, "account save form uses the current locale context");
assert.match(accountShell, /themePreferenceChangeEvent/, "account save form observes theme changes before submitting");
assert.match(accountShell, /name="locale" type="hidden" value={hiddenLocale}/, "account save form submits the live locale value");
assert.match(accountShell, /name="timeZone" type="hidden" value={hiddenTimeZone}/, "account save form submits the live timezone value");

assert.doesNotMatch(accountShell, /localStorage\.setItem\((?!themePreferenceStorageKey|localePreferenceStorageKey|timeZonePreferenceStorageKey)/, "account shell does not introduce untracked localStorage writes");
assert.doesNotMatch(accountShell, /indexedDB\.|sessionStorage\.|window\.sessionStorage|fetch\(|\/api\//, "account shell does not touch IndexedDB, sessionStorage, or API routes");

console.log("account preferences shell contract checks passed");
