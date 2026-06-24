import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const localPreferencesPath = "lib/local-preferences.ts";
const sharedFeedPath = "lib/comment-translator-real-comments-feed-shared.ts";
const dockPath = "components/comment-translator/CommentTranslatorDock.tsx";
const sessionPath = "lib/supabase/session.ts";
const accountActionsPath = "app/account/actions.ts";
const migrationPath = "supabase/migrations/20260624000000_account_display_timezone_preference.sql";
const taskPath = "task.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function loadTsModule(relativePath) {
  const moduleCache = new Map();
  const originalLoad = Module._load;

  function compileTsModule(modulePath) {
    const normalizedModulePath = path.normalize(modulePath);
    if (moduleCache.has(normalizedModulePath)) {
      return moduleCache.get(normalizedModulePath).exports;
    }

    const source = fs.readFileSync(normalizedModulePath, "utf8");
    const compiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022
      }
    }).outputText;

    const testModule = new Module(normalizedModulePath);
    moduleCache.set(normalizedModulePath, testModule);
    testModule.filename = normalizedModulePath;
    testModule.paths = Module._nodeModulePaths(path.dirname(normalizedModulePath));
    testModule._compile(compiled, normalizedModulePath);
    return testModule.exports;
  }

  Module._load = function patchedLoad(request, parent, isMain) {
    if (request.startsWith("@/") && parent?.filename) {
      const candidate = path.join(root, `${request.slice(2)}.ts`);
      if (fs.existsSync(candidate)) {
        return compileTsModule(candidate);
      }
      const tsxCandidate = path.join(root, `${request.slice(2)}.tsx`);
      if (fs.existsSync(tsxCandidate)) {
        return compileTsModule(tsxCandidate);
      }
    }

    if (request.startsWith(".") && parent?.filename) {
      const candidate = path.resolve(path.dirname(parent.filename), `${request}.ts`);
      if (fs.existsSync(candidate)) {
        return compileTsModule(candidate);
      }
      const tsxCandidate = path.resolve(path.dirname(parent.filename), `${request}.tsx`);
      if (fs.existsSync(tsxCandidate)) {
        return compileTsModule(tsxCandidate);
      }
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return compileTsModule(path.join(root, relativePath));
  } finally {
    Module._load = originalLoad;
  }
}

for (const requiredPath of [
  localPreferencesPath,
  sharedFeedPath,
  dockPath,
  sessionPath,
  accountActionsPath,
  migrationPath,
  taskPath
]) {
  assert.ok(exists(requiredPath), `required file exists: ${requiredPath}`);
}

const localPreferencesSource = read(localPreferencesPath);
const dockSource = read(dockPath);
const sharedFeedSource = read(sharedFeedPath);
const sessionSource = read(sessionPath);
const accountActionsSource = read(accountActionsPath);
const migrationSource = read(migrationPath);
const taskSource = read(taskPath);

assert.match(localPreferencesSource, /timeZonePreferenceStorageKey = "v-streamer-tools-time-zone"/, "shared timezone key is stable");
assert.match(localPreferencesSource, /normalizeTimeZonePreference/, "timezone preference is normalized");
assert.match(localPreferencesSource, /readLocalTimeZonePreference/, "timezone preference can be read locally");
assert.match(localPreferencesSource, /writeLocalTimeZonePreference/, "timezone preference can be written locally");
assert.match(localPreferencesSource, /resolveInitialLocalTimeZonePreference/, "timezone preference falls back to browser timezone");
assert.match(dockSource, /readLocalTimeZonePreference/, "Comment Translator reads shared local timezone preference");
assert.match(dockSource, /timeZonePreferenceChangeEvent/, "Comment Translator observes shared timezone changes");
assert.match(sharedFeedSource, /formatCommentTranslatorBrowserLocalTimestamp/, "Comment Translator timestamp formatter remains shared");
assert.match(sessionSource, /\.select\("locale,theme,time_zone,updated_at"\)/, "account session reads timezone from user_preferences");
assert.match(accountActionsSource, /normalizeTimeZonePreference\(readRequiredString\(formData, "timeZone"\)\)/, "account save action normalizes timezone");
assert.match(accountActionsSource, /time_zone: timeZone/, "account save action persists timezone");
assert.match(migrationSource, /alter table public\.user_preferences[\s\S]*add column if not exists time_zone text/, "migration adds user_preferences time_zone");
assert.match(migrationSource, /time_zone_format/, "migration documents format validation constraint");
assert.match(taskSource, /shared display timezone preference/i, "task board records shared timezone preference slice");

const localPreferences = loadTsModule(localPreferencesPath);
assert.equal(localPreferences.normalizeTimeZonePreference("Asia/Tokyo"), "Asia/Tokyo");
assert.equal(localPreferences.normalizeTimeZonePreference("UTC"), "UTC");
assert.equal(localPreferences.normalizeTimeZonePreference("Invalid/Timezone"), null);
assert.equal(localPreferences.normalizeTimeZonePreference(""), null);

const memoryStorage = new Map();
const storage = {
  getItem(key) {
    return memoryStorage.has(key) ? memoryStorage.get(key) : null;
  },
  setItem(key, value) {
    memoryStorage.set(key, value);
  }
};
localPreferences.writeLocalTimeZonePreference("Asia/Tokyo", storage);
assert.equal(memoryStorage.get(localPreferences.timeZonePreferenceStorageKey), "Asia/Tokyo");
assert.equal(localPreferences.readLocalTimeZonePreference(storage), "Asia/Tokyo");

for (const source of [localPreferencesSource, dockSource, sharedFeedSource, sessionSource, accountActionsSource, migrationSource, taskSource]) {
  assert.doesNotMatch(
    source,
    /sk_live_[A-Za-z0-9]+|sk_test_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+/i,
    "timezone preference slice does not add secret or private provider output"
  );
}

console.log("comment translator shared timezone preference contract checks passed");
