import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const libPath = "lib/comment-translator.ts";
const sessionPanelVisibilityPath = "components/comment-translator/comment-translator-session-panel-visibility.ts";
const componentPath = "components/comment-translator/CommentTranslatorDock.tsx";
const sessionPanelPath = "components/comment-translator/CommentTranslatorSessionPanel.tsx";
const feedPanelPath = "components/comment-translator/CommentTranslatorFeedPanel.tsx";
const usageSidebarPath = "components/comment-translator/CommentTranslatorUsageSidebar.tsx";
const sessionFeedControllerPath = "components/comment-translator/useCommentTranslatorSessionFeedController.ts";
const actionPath = "app/tools/comment-translator/actions.ts";
const feedActionsPath = "app/tools/comment-translator/feed-actions.ts";
const sessionActionsPath = "app/tools/comment-translator/session-actions.ts";
const commandExecutionPath = "lib/comment-translator-session-command-execution.ts";
const routePath = "app/api/comment-translator/session/route.ts";
const requirementsPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_RELEASE_REQUIREMENTS.md";
const taskPath = "task.md";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function loadTsModule(relativePath) {
  const sourcePath = path.join(root, relativePath);
  const moduleCache = new Map();
  const originalLoad = Module._load;
  function compileTsModule(modulePath) {
    const normalizedPath = path.normalize(modulePath);
    if (moduleCache.has(normalizedPath)) return moduleCache.get(normalizedPath).exports;
    const compiled = ts.transpileModule(fs.readFileSync(normalizedPath, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
    }).outputText;
    const testModule = new Module(normalizedPath);
    moduleCache.set(normalizedPath, testModule);
    testModule.filename = normalizedPath;
    testModule.paths = Module._nodeModulePaths(path.dirname(normalizedPath));
    testModule._compile(compiled, normalizedPath);
    return testModule.exports;
  }
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request.startsWith(".") && parent?.filename) {
      const candidate = path.resolve(path.dirname(parent.filename), `${request}.ts`);
      if (fs.existsSync(candidate)) return compileTsModule(candidate);
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try { return compileTsModule(sourcePath); }
  finally { Module._load = originalLoad; }
}

const lib = loadTsModule(libPath);
const sessionPanelVisibility = loadTsModule(sessionPanelVisibilityPath);
const libSource = read(libPath);
const componentSource = [componentPath, sessionPanelPath, feedPanelPath, usageSidebarPath, sessionFeedControllerPath].map(read).join("\n");
const actionSource = read(actionPath);
const feedActionsSource = read(feedActionsPath);
const sessionActionsSource = read(sessionActionsPath);
const commandExecutionSource = read(commandExecutionPath);
const routeSource = read(routePath);
const requirementsSource = read(requirementsPath);
const taskSource = read(taskPath);

assert.match(requirementsSource, /Public UI must show enough usage state/, "canonical requirements define public usage display");
assert.match(requirementsSource, /active\/stopped state/, "canonical requirements require session active and stopped state");
assert.match(actionSource, /getCommentTranslatorSessionStatusAction/, "server action exposes sanitized session status for UI refresh");
assert.match(actionSource, /startCommentTranslatorSessionAction/, "server action exposes session start");
assert.match(actionSource, /stopCommentTranslatorSessionAction/, "server action exposes session stop");
assert.match(actionSource, /heartbeatCommentTranslatorSessionAction/, "server action exposes session heartbeat");
assert.match(routeSource, /readCommentTranslatorDurableUsageSnapshotOrFailClosed/, "route keeps usage read server-owned");

assert.equal(
  sessionPanelVisibility.shouldShowCommentTranslatorStartReadiness("not-started"),
  true,
  "not-started sessions show Start readiness"
);
assert.equal(
  sessionPanelVisibility.shouldShowCommentTranslatorStartReadiness("active"),
  false,
  "active sessions hide Start readiness"
);
assert.equal(
  sessionPanelVisibility.shouldShowCommentTranslatorStartReadiness("stopped"),
  true,
  "stopped sessions show Start readiness"
);

assert.equal(
  lib.commentTranslatorUiCopy.en.sections.operatorSession,
  "Session Controls",
  "English copy includes public session controls"
);
assert.equal(
  lib.commentTranslatorUiCopy.ja.sections.operatorSession,
  "セッション操作",
  "Japanese copy includes public session controls"
);
assert.equal(
  lib.commentTranslatorUiCopy.en.operatorSession.reconnectGuidance,
  "Reconnect YouTube from account integrations, then check credential status again.",
  "English reconnect guidance stays sanitized and actionable"
);
assert.equal(
  lib.commentTranslatorUiCopy.ja.operatorSession.reconnectGuidance,
  "アカウント連携でYouTubeを再接続してから、認証ステータスを再確認してください。",
  "Japanese reconnect guidance stays sanitized and actionable"
);
assert.equal(
  lib.commentTranslatorUiCopy.ja.operatorSession.rateLimitStartBlockedTitle,
  "Start操作が短時間に集中しています",
  "Japanese rate-limit copy is separate from usage-limit copy"
);
assert.equal(
  lib.commentTranslatorUiCopy.en.operatorSession.rateLimitStartBlockedTitle,
  "Too many Start attempts",
  "English rate-limit copy is separate from usage-limit copy"
);
assert.equal(
  lib.commentTranslatorUiCopy.ja.operatorSession.ratePausedTitle,
  "分速上限のため一時休止中",
  "Japanese active rate-pause title is stable"
);
assert.equal(
  lib.commentTranslatorUiCopy.en.operatorSession.ratePausedTitle,
  "Paused at the per-minute limit",
  "English active rate-pause title is stable"
);
assert.equal(
  lib.commentTranslatorUiCopy.ja.operatorSession.ratePausedBody,
  "約{seconds}秒後に、新着コメントから自動再開します",
  "Japanese rate-pause countdown copy is stable"
);
assert.equal(
  lib.commentTranslatorUiCopy.en.operatorSession.ratePausedBody,
  "Translation will resume automatically from new comments in about {seconds} seconds.",
  "English rate-pause countdown copy is stable"
);
assert.equal(
  lib.commentTranslatorUiCopy.ja.operatorSession.ratePausedSkipped,
  "休止中に投稿されたコメントは翻訳されません",
  "Japanese no-backlog warning is stable"
);
assert.equal(
  lib.commentTranslatorUiCopy.en.operatorSession.ratePausedSkipped,
  "Comments posted during the pause will not be translated.",
  "English no-backlog warning is stable"
);
assert.equal(
  lib.commentTranslatorUiCopy.ja.operatorSession.resyncingTitle,
  "コメント取得の再開を準備中",
  "Japanese resync title is stable"
);
assert.equal(
  lib.commentTranslatorUiCopy.en.operatorSession.resyncingTitle,
  "Preparing to resume comment retrieval",
  "English resync title is stable"
);

assert.match(componentSource, /data-public-operator-session-ui="sanitized-session-usage-only"/, "dock renders the Task 12 public operator session panel");
assert.match(componentSource, /startCommentTranslatorSessionAction/, "dock wires the Start control to the server action");
assert.match(componentSource, /stopCommentTranslatorSessionAction/, "dock wires the Stop control to the server action");
assert.match(componentSource, /heartbeatCommentTranslatorSessionAction/, "dock wires a heartbeat/status refresh control");
assert.match(componentSource, /clearCommentTranslatorPreviewFeedAction/, "dock wires manual Clear preview to a server action");
assert.match(
  componentSource,
  /data-comment-translator-session-refresh-on-mount="server-status-restore"/,
  "dock restores active session usage display from server status after page refresh"
);
assert.match(
  componentSource,
  /getCommentTranslatorSessionStatusAction\(\{ sourceLanguage, targetLanguage \}\)[\s\S]*setSessionState\(state\)/,
  "mount refresh replaces the initial 30 minute fallback with server-owned session usage for the selected language pair"
);
assert.match(
  componentSource,
  /restoreCommentTranslatorPersistedRealCommentsFeedAction/,
  "mount refresh can hydrate persisted server-owned safe feed rows after active-session restore"
);
assert.match(
  componentSource,
  /state\.status === "active"[\s\S]*restoreCommentTranslatorPersistedRealCommentsFeedAction\(\{ sourceLanguage, targetLanguage \}\)[\s\S]*setRealCommentsFeed\(feed\)/,
  "active-session mount restore hydrates persisted feed rows immediately from a read-only action for the selected language pair"
);
assert.match(componentSource, /usageDisplay\.session\.usedSeconds/, "dock displays current used session time from sanitized session usage display");
assert.match(componentSource, /usageDisplay\.daily\.usedSeconds/, "dock derives daily used time from sanitized session usage display");
assert.match(componentSource, /usageDisplay\.daily\.remainingSeconds/, "dock displays daily remaining time from sanitized session usage display");
assert.match(componentSource, /sessionState\.stopReason/, "dock displays sanitized stop reason");
assert.match(
  componentSource,
  /copy\.operatorSession\.helper[\s\S]*data-comment-translator-start-stop-reason-ux="sanitized-reason-only"[\s\S]*copy\.operatorSession\.readinessTitle/,
  "dock surfaces sanitized stopped-session reason in the first operator panel"
);
assert.match(componentSource, /startBlockedByUsagePolicy/, "dock derives disabled Start state from sanitized usage provider policy");
assert.match(componentSource, /startBlockedByRateLimit/, "dock derives disabled Start state from sanitized rate-limit metadata");
assert.match(componentSource, /sessionState\.rateLimit === "exceeded"/, "dock detects rate-limit state separately from usage policy");
assert.match(
  componentSource,
  /if \(intent === "start" && state\.status === "active"\)[\s\S]*createUnavailableCommentTranslatorRealCommentsFeedState\(\{\s*reason:\s*"session-not-active"/,
  "dock clears retained previous results when the next Start becomes active"
);
assert.match(
  componentSource,
  /sessionState\.status !== "active"[\s\S]*current(?:Feed)?\.rows\.length > 0[\s\S]*return;/,
  "manual feed refresh preserves retained rows and does not call provider polling while session is stopped"
);
assert.match(
  componentSource,
  /data-comment-translator-preview-retention="stopped-previous-results"/,
  "dock marks stopped previous-results rows in the preview"
);
assert.match(
  componentSource,
  /data-comment-translator-preview-clear="manual-safe-feed-clear"/,
  "dock exposes manual Clear preview only through the safe feed boundary"
);
assert.match(
  componentSource,
  /startBlockedByCredentialStatus[\s\S]*startBlockedByUsagePolicy[\s\S]*startBlockedByRateLimit/,
  "Start button is disabled when sanitized usage policy or rate-limit metadata is blocked"
);
assert.match(
  componentSource,
  /data-comment-translator-start-blocked="usage-policy"/,
  "dock renders a sanitized Start blocker panel for usage policy"
);
assert.match(componentSource, /copy\.operatorSession\.usageStartBlockedTitle/, "dock renders localized usage Start blocker copy");
assert.match(
  componentSource,
  /data-comment-translator-start-blocked="rate-limit"[\s\S]*copy\.operatorSession\.rateLimitStartBlockedTitle/,
  "dock renders a separate sanitized rate-limit Start blocker panel"
);
assert.match(componentSource, /credentialStatusState/, "dock displays provider connection state from sanitized credential status");
assert.match(componentSource, /copy\.operatorSession\.reconnectGuidance/, "dock renders reconnect guidance without provider target metadata");
assert.match(
  componentSource,
  /data-comment-translator-active-phase=\{sessionState\.activePhase\}/,
  "dock exposes the exact active-phase projection marker"
);
assert.match(
  componentSource,
  /data-comment-translator-rate-pause="auto-resume-current-cursor"/,
  "dock marks automatic current-cursor recovery"
);
assert.match(
  componentSource,
  /copy\.operatorSession\.ratePausedTitle[\s\S]*copy\.operatorSession\.ratePausedBody[\s\S]*copy\.operatorSession\.ratePausedSkipped/,
  "dock renders the localized pause title, bounded countdown, and no-backlog warning"
);
assert.match(componentSource, /copy\.operatorSession\.resyncingTitle/, "dock renders localized resync guidance");
assert.match(
  componentSource,
  /sessionState\.status === "active"[\s\S]*sessionState\.status !== "active"/,
  "active phases keep Start unavailable and Stop available through the existing top-level session controls"
);
assert.match(
  componentSource,
  /if \(sessionState\.status !== "active"\)[\s\S]*setInterval\([\s\S]*refreshRealCommentsFeed/,
  "active pause and resync phases keep heartbeat/feed refresh enabled"
);
const restoreActionMatch = feedActionsSource.match(
  /export async function restoreCommentTranslatorPersistedRealCommentsFeedAction[\s\S]*?\r?\n}\r?\n\r?\nexport async function getCommentTranslatorRealCommentsFeedAction/
);
assert.ok(restoreActionMatch, "server action exposes a narrowly named persisted-feed restore action");
assert.match(
  restoreActionMatch[0],
  /readCommentTranslatorRealCommentsFeedForActiveSession/,
  "persisted-feed restore action reads existing server-owned feed state"
);
assert.doesNotMatch(
  restoreActionMatch[0],
  /runCommentTranslatorLiveProviderSessionStep|readCommentTranslatorBoundedLiveChatPollingTick|resolveCommentTranslatorServerOnlyLiveChatTargetLookupForStart|createTrustedCommentTranslatorYouTubeLiveProviderRuntimeAdapter/,
  "persisted-feed restore action is read-only and does not run provider polling or target lookup"
);
const clearPreviewActionMatch = feedActionsSource.match(
  /export async function clearCommentTranslatorPreviewFeedAction[\s\S]*?\r?\n}\r?\n\r?\nexport async function restoreCommentTranslatorPersistedRealCommentsFeedAction/
);
assert.ok(clearPreviewActionMatch, "server action exposes a narrowly named manual preview clear action");
assert.match(
  clearPreviewActionMatch[0],
  /clearCommentTranslatorRealCommentsFeedForSession/,
  "manual preview clear uses the server-owned safe feed boundary"
);
assert.doesNotMatch(
  clearPreviewActionMatch[0],
  /readCommentTranslatorSessionActionResult|runCommentTranslatorLiveProviderSessionStep|readCommentTranslatorBoundedLiveChatPollingTick|resolveCommentTranslatorServerOnlyLiveChatTargetLookupForStart|recordCommentTranslatorDurableSessionLedgerStateOrFailClosed|recordInMemoryCommentTranslatorSessionLedgerState/,
  "manual preview clear does not start/stop a session, poll, target-lookup, translate, or write usage accounting"
);
assert.doesNotMatch(
  sessionActionsSource,
  /intent === "heartbeat" \|\| intent === "status"[\s\S]*runCommentTranslatorLiveProviderSessionStep/,
  "server action status restore does not run live provider polling or translation"
);
assert.doesNotMatch(
  commandExecutionSource,
  /command\.intent === "heartbeat" \|\| command\.intent === "status"[\s\S]*runCommentTranslatorLiveProviderSessionStep/,
  "route status restore does not run live provider polling or translation"
);
assert.ok(
  commandExecutionSource.indexOf('if (input.intent !== "status")') <
    commandExecutionSource.indexOf("runtime.createLiveProviderRuntime"),
  "shared route/action execution branches status before live provider runtime creation"
);
assert.ok(
  commandExecutionSource.indexOf('if (input.intent === "status") return state') <
    commandExecutionSource.indexOf("const durablePersistResult = await persistCommentTranslatorDurableSessionStateOrFailClosed"),
  "status restore returns before session or usage persistence"
);

assert.doesNotMatch(
  `${libSource}\n${componentSource}\n${actionSource}\n${feedActionsSource}\n${sessionActionsSource}\n${commandExecutionSource}\n${routeSource}`,
  /localStorage\.|indexedDB\.|sessionStorage\.|window\.localStorage|window\.sessionStorage|youtube\.googleapis|OAuth2Client|GoogleAuth|from\s+["']googleapis["']|require\(["']googleapis["']\)|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+|providerTargetMetadata\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY/i,
  "Task 12 UI/action source avoids browser storage, provider calls, target metadata values, auth header values, and service-role key values"
);

assert.match(taskSource, /PL-G3/i, "task board keeps the active comment translator PL-G3 state visible");

console.log("comment translator public operator session UI contract checks passed");
