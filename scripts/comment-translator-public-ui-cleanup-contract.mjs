import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const libPath = "lib/comment-translator.ts";
const componentPath = "components/comment-translator/CommentTranslatorDock.tsx";
const taskPath = "task.md";

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

for (const requiredPath of [libPath, componentPath, taskPath]) {
  assert.ok(fs.existsSync(path.join(root, requiredPath)), `required file exists: ${requiredPath}`);
}

const lib = loadTsModule(libPath);
const libSource = read(libPath);
const componentSource = read(componentPath);
const taskSource = read(taskPath);

assert.deepEqual(
  lib.commentTranslatorStatusFilters.map((filter) => filter.id),
  ["all", "translated", "error"],
  "normal public preview filters hide skipped rows"
);
assert.ok(
  !lib.commentTranslatorStatusFilters.some((filter) => filter.id === "skipped"),
  "skipped filter is not available in normal public UI"
);

assert.equal(lib.commentTranslatorUiCopy.en.statusBadges.reused, "Reused translation");
assert.equal(lib.commentTranslatorUiCopy.en.statusBadges.fresh, "New translation");
assert.equal(lib.commentTranslatorUiCopy.ja.statusBadges.reused, "再利用した翻訳");
assert.equal(lib.commentTranslatorUiCopy.ja.statusBadges.fresh, "新しく翻訳");
assert.doesNotMatch(
  JSON.stringify({
    en: {
      statusBadges: lib.commentTranslatorUiCopy.en.statusBadges,
      stats: lib.commentTranslatorUiCopy.en.stats,
      sections: lib.commentTranslatorUiCopy.en.sections,
      quotaScenarios: lib.commentTranslatorUiCopy.en.quotaScenarios
    },
    ja: {
      statusBadges: lib.commentTranslatorUiCopy.ja.statusBadges,
      stats: lib.commentTranslatorUiCopy.ja.stats,
      sections: lib.commentTranslatorUiCopy.ja.sections,
      quotaScenarios: lib.commentTranslatorUiCopy.ja.quotaScenarios
    }
  }),
  /cache hit|cache miss|cached|キャッシュhit|キャッシュmiss/i,
  "localized normal UI copy avoids raw cache terminology"
);

assert.match(
  componentSource,
  /const publicFeedComments = feedComments\.filter\(\(comment\) => comment\.status !== "skipped"\)/,
  "normal public preview rows exclude skipped comments before filtering and counting"
);
assert.match(
  componentSource,
  /const filteredComments = filterCommentTranslatorComments\(publicFeedComments,/,
  "normal public filtering uses the public feed subset"
);
assert.doesNotMatch(
  componentSource,
  /liveStats\.skipped|copy\.stats\.skipped|comment\.cacheStatus\}/,
  "normal public UI does not render skipped counts or raw cache status values"
);

assert.match(
  componentSource,
  /data-comment-translator-free-beta-usage-display="right-authoritative-sanitized-usage-only"/,
  "right side owns the authoritative Free beta usage/status area"
);
assert.doesNotMatch(
  componentSource,
  /<h2[^>]*>\{locale === "ja" \? "今日の状態" : "Today"\}<\/h2>/,
  "duplicate Today usage panels are removed"
);
assert.doesNotMatch(
  componentSource,
  /data-comment-translator-pre-public-diagnostics="count-only"/,
  "pre-public diagnostics are not rendered in normal public UI"
);
assert.doesNotMatch(
  componentSource,
  /copy\.stats\.cacheHit|copy\.stats\.cacheMiss|effectiveCacheHitRate/,
  "quota/cache preview tiles are removed from normal public UI"
);

assert.match(
  componentSource,
  /data-comment-translator-creator-locked-waitlist="compact-creator-closed-beta"/,
  "Creator closed beta renders as one compact public panel"
);
assert.match(
  componentSource,
  /copy\.creatorLockedWaitlist\.featureSummary/,
  "Creator closed beta summarizes planned features in localized copy"
);
assert.doesNotMatch(
  componentSource,
  /state\.lockedFeatureCards\.map/,
  "Creator closed beta no longer renders multiple locked feature cards"
);

assert.doesNotMatch(
  `${libSource}\n${componentSource}`,
  /liveChatId|providerChannelId|ownerUserId|access_token|refresh_token|authorization_code|Authorization\s*[:=]\s*["'][^"']+|normalized text hash|cache key/i,
  "public UI cleanup does not expose provider/private identifiers or cache key material"
);
assert.match(taskSource, /public-release capable: no/i, "public gate remains blocked");

console.log("comment translator public UI cleanup contract checks passed");
