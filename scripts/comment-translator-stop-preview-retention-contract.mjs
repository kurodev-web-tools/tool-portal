import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const actionPath = "app/tools/comment-translator/actions.ts";
const routePath = "app/api/comment-translator/session/route.ts";
const dockPath = "components/comment-translator/CommentTranslatorDock.tsx";
const copyPath = "lib/comment-translator.ts";
const taskPath = "task.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function extractExportedFunction(source, name) {
  const start = source.indexOf(`export async function ${name}`);
  assert.notEqual(start, -1, `${name} export exists`);
  const nextExport = source.indexOf("\nexport ", start + 1);
  return source.slice(start, nextExport === -1 ? source.length : nextExport);
}

function extractStoppedCleanupBlock(source, stateExpression) {
  const start = source.indexOf(`if (${stateExpression}.status === "stopped") {`);
  assert.notEqual(start, -1, `stopped cleanup block exists for ${stateExpression}`);
  const blockStart = source.indexOf("{", start);
  let depth = 0;
  for (let index = blockStart; index < source.length; index += 1) {
    const character = source[index];
    if (character === "{") {
      depth += 1;
    }
    if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }

  throw new Error(`stopped cleanup block was not closed for ${stateExpression}`);
}

const actionSource = read(actionPath);
const routeSource = read(routePath);
const dockSource = read(dockPath);
const copySource = read(copyPath);
const taskSource = read(taskPath);

const actionStoppedCleanup = extractStoppedCleanupBlock(actionSource, "state");
const routeStoppedCleanup = extractStoppedCleanupBlock(routeSource, "state");

for (const stoppedCleanup of [actionStoppedCleanup, routeStoppedCleanup]) {
  assert.match(
    stoppedCleanup,
    /clearCommentTranslatorBoundedLiveChatPollingState/,
    "Stop still clears server-only polling cursor state"
  );
  assert.match(
    stoppedCleanup,
    /clearCommentTranslatorAzureNormalTranslationSessionDedupeState/,
    "Stop still clears translation session dedupe state"
  );
  assert.doesNotMatch(
    stoppedCleanup,
    /clearCommentTranslatorRealCommentsFeedForSession/,
    "Stop retains the last server-owned safe feed rows"
  );
}

const clearPreviewAction = extractExportedFunction(actionSource, "clearCommentTranslatorPreviewFeedAction");
assert.match(
  clearPreviewAction,
  /clearCommentTranslatorRealCommentsFeedForSession/,
  "manual Clear preview uses the server-owned safe feed clear boundary"
);
assert.match(
  clearPreviewAction,
  /createUnavailableCommentTranslatorRealCommentsFeedState\(\{\s*reason:\s*"session-not-active"/,
  "manual Clear preview returns the local empty preview state"
);
assert.doesNotMatch(
  clearPreviewAction,
  /readCommentTranslatorSessionActionResult|runCommentTranslatorLiveProviderSessionStep|readCommentTranslatorBoundedLiveChatPollingTick|resolveCommentTranslatorServerOnlyLiveChatTargetLookupForStart|recordCommentTranslatorDurableSessionLedgerStateOrFailClosed|recordInMemoryCommentTranslatorSessionLedgerState/,
  "manual Clear preview does not run session start-stop, provider polling, target lookup, or usage accounting"
);

assert.match(
  dockSource,
  /clearCommentTranslatorPreviewFeedAction/,
  "dock imports and uses the manual Clear preview action"
);
assert.match(
  dockSource,
  /function clearRetainedPreviewFeed\(\)[\s\S]*clearCommentTranslatorPreviewFeedAction\(\{\s*sessionReferenceId:\s*sessionState\.sessionReferenceId/,
  "Clear preview sends only the browser-safe session reference to the server boundary"
);
assert.match(
  dockSource,
  /setRealCommentsFeed\(clearedFeed\)/,
  "Clear preview replaces retained rows locally"
);
assert.match(
  dockSource,
  /const hasRetainedStoppedPreviewRows = sessionState\.status === "stopped" && feedComments\.length > 0/,
  "dock detects stopped previous-results rows"
);
assert.match(
  dockSource,
  /data-comment-translator-preview-retention="stopped-previous-results"/,
  "dock marks stopped previous-results state for deterministic UI verification"
);
assert.match(
  dockSource,
  /data-comment-translator-preview-clear="manual-safe-feed-clear"/,
  "dock exposes a deterministic manual Clear preview control"
);
assert.match(
  dockSource,
  /if \(intent === "start" && state\.status === "active"\)[\s\S]*createUnavailableCommentTranslatorRealCommentsFeedState/,
  "active Start clears retained rows before the next session feed replaces them"
);
assert.doesNotMatch(
  dockSource,
  /intent === "stop"[\s\S]{0,220}createUnavailableCommentTranslatorRealCommentsFeedState/,
  "Stop does not locally replace retained feed rows with an inactive empty feed"
);

assert.match(copySource, /clearPreview:\s*"プレビューをクリア"/, "Japanese copy includes Clear preview");
assert.match(copySource, /clearPreview:\s*"Clear preview"/, "English copy includes Clear preview");
assert.match(copySource, /previousResultsTitle:/, "copy includes stopped previous-results title");
assert.match(copySource, /previousResultsBody:/, "copy includes stopped previous-results body");
assert.match(taskSource, /Stop preview retention/i, "task.md records this implementation slice");

assert.doesNotMatch(
  `${actionSource}\n${routeSource}\n${dockSource}\n${copySource}`,
  /access_token\s*[:=]\s*["'][^"']+|refresh_token\s*[:=]\s*["'][^"']+|authorization_code\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+|providerTargetMetadata\s*[:=]\s*["'][^"']+|localStorage\.|sessionStorage\.|indexedDB\./i,
  "Stop retention changed source avoids secrets, browser storage, provider target values, and raw credential values"
);

console.log("comment translator stop preview retention contract checks passed");
