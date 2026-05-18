import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function loadTsModule(relativePath) {
  const sourcePath = path.join(root, relativePath);
  const compiled = ts.transpileModule(read(relativePath), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;

  const testModule = new Module(sourcePath);
  testModule.filename = sourcePath;
  testModule.paths = Module._nodeModulePaths(path.dirname(sourcePath));
  testModule._compile(compiled, sourcePath);
  return testModule.exports;
}

const localeLib = loadTsModule("lib/locale.ts");
const localeProviderSource = read("components/portal/LocaleProvider.tsx");
const languageSwitchSource = read("components/portal/LanguageSwitch.tsx");
const portalHeaderSource = read("components/portal/PortalHeader.tsx");
const portalSidebarSource = read("components/portal/PortalSidebar.tsx");
const appLayoutSource = read("app/layout.tsx");

assert.deepEqual(localeLib.supportedLocales, ["ja", "en"], "locale foundation exposes ja/en only");
assert.equal(localeLib.localePreferenceStorageKey, "v-streamer-tools-locale", "locale preference uses a dedicated new localStorage key");
assert.equal(localeLib.normalizeLocale("ja"), "ja", "ja storage value is accepted");
assert.equal(localeLib.normalizeLocale("en"), "en", "en storage value is accepted");
assert.equal(localeLib.normalizeLocale("en-US"), null, "storage values do not accept browser subtags");
assert.equal(localeLib.normalizeLocale("fr"), null, "unsupported storage value is ignored");
assert.equal(localeLib.getBrowserPreferredLocale(["en-US", "ja-JP"]), "en", "first en* browser language starts in English");
assert.equal(localeLib.getBrowserPreferredLocale(["ja-JP", "en-US"]), "ja", "non-en first browser language starts in Japanese");
assert.equal(localeLib.getBrowserPreferredLocale([]), "ja", "missing browser language falls back to Japanese");
assert.equal(localeLib.resolveInitialLocale("ja", ["en-US"]), "ja", "manual Japanese preference wins over browser English");
assert.equal(localeLib.resolveInitialLocale("en", ["ja-JP"]), "en", "manual English preference wins over browser Japanese");
assert.equal(localeLib.resolveInitialLocale(null, ["en-GB"]), "en", "browser English is used when no saved preference exists");

assert.match(localeProviderSource, /document\.documentElement\.lang\s*=\s*locale/, "locale provider syncs html lang after hydration");
assert.match(localeProviderSource, /window\.localStorage\.getItem\(localePreferenceStorageKey\)/, "locale provider reads only the locale preference key");
assert.match(localeProviderSource, /window\.localStorage\.setItem\(localePreferenceStorageKey,\s*locale\)/, "locale provider saves manual/current locale to the locale preference key");
assert.match(localeProviderSource, /navigator\.languages/, "locale provider checks navigator.languages for first visit");
assert.match(languageSwitchSource, /aria-pressed=\{locale === item\}/, "language switch exposes selected locale state");
assert.match(languageSwitchSource, /日本語/, "language switch keeps a Japanese label");
assert.match(languageSwitchSource, /English/, "language switch keeps an English label");
assert.match(languageSwitchSource, /const isDrawer = variant === "drawer"/, "language switch treats drawer spacing separately");
assert.match(languageSwitchSource, /isDrawer \? "shrink-0 gap-1"/, "drawer language switch keeps a compact non-wrapping width");
assert.match(languageSwitchSource, /isDrawer\s*\?\s*"min-w-14 px-2 py-1\.5 text-xs"/, "drawer language buttons stay narrower than desktop buttons");
assert.doesNotMatch(languageSwitchSource, /variant === "drawer" \? "w-full justify-between"/, "drawer language switch does not force a full-width segmented control");
assert.match(portalHeaderSource, /<LanguageSwitch\s*\/>/, "desktop header places the language switch near the theme toggle");
assert.match(portalHeaderSource, /<LanguageSwitch variant="drawer"\s*\/>/, "mobile drawer places the language switch inside the menu");
assert.match(
  portalHeaderSource,
  /<div className="flex items-center justify-between gap-3">\s*<span className="text-sm font-bold text-foreground">表示言語<\/span>\s*<LanguageSwitch variant="drawer" \/>\s*<\/div>/,
  "mobile drawer language row stays on one line like the theme row"
);
assert.match(portalSidebarSource, /<LanguageSwitch variant="compact"\s*\/>/, "workspace sidebar keeps language access near compact theme control");
assert.match(appLayoutSource, /<LocaleProvider>/, "root layout wraps the app in the locale provider");
assert.doesNotMatch(appLayoutSource, /<html lang="\{/, "root html lang remains SSR-stable and is updated client-side");

console.log("portal-locale-foundation contract checks passed");
