import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const libPath = "lib/comment-translator.ts";
const componentPath = "components/comment-translator/CommentTranslatorDock.tsx";
const actionPath = "app/tools/comment-translator/actions.ts";
const routePath = "app/api/comment-translator/session/route.ts";
const requirementsPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_RELEASE_REQUIREMENTS.md";
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

const lib = loadTsModule(libPath);
const libSource = read(libPath);
const componentSource = read(componentPath);
const actionSource = read(actionPath);
const routeSource = read(routePath);
const requirementsSource = read(requirementsPath);
const taskSource = read(taskPath);

assert.match(requirementsSource, /Public UI must show enough usage state/, "canonical requirements define public usage display");
assert.match(requirementsSource, /active\/stopped state/, "canonical requirements require session active and stopped state");
assert.match(actionSource, /getCommentTranslatorSessionStatusAction/, "server action exposes sanitized session status for UI refresh");
assert.match(actionSource, /startCommentTranslatorSessionAction/, "server action exposes session start");
assert.match(actionSource, /stopCommentTranslatorSessionAction/, "server action exposes session stop");
assert.match(actionSource, /heartbeatCommentTranslatorSessionAction/, "server action exposes session heartbeat");
assert.match(routeSource, /readInMemoryCommentTranslatorUsageSnapshot/, "route keeps usage read server-owned");

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

assert.match(componentSource, /data-public-operator-session-ui="sanitized-session-usage-only"/, "dock renders the Task 12 public operator session panel");
assert.match(componentSource, /startCommentTranslatorSessionAction/, "dock wires the Start control to the server action");
assert.match(componentSource, /stopCommentTranslatorSessionAction/, "dock wires the Stop control to the server action");
assert.match(componentSource, /heartbeatCommentTranslatorSessionAction/, "dock wires a heartbeat/status refresh control");
assert.match(componentSource, /sessionState\.elapsedSeconds/, "dock displays current elapsed session time");
assert.match(componentSource, /sessionDailyUsedSeconds/, "dock derives daily used time from sanitized session state");
assert.match(componentSource, /sessionState\.remainingDailySeconds/, "dock displays daily remaining time from sanitized session state");
assert.match(componentSource, /sessionState\.stopReason/, "dock displays sanitized stop reason");
assert.match(componentSource, /credentialStatusState/, "dock displays provider connection state from sanitized credential status");
assert.match(componentSource, /copy\.operatorSession\.reconnectGuidance/, "dock renders reconnect guidance without provider target metadata");

assert.doesNotMatch(
  `${libSource}\n${componentSource}\n${actionSource}\n${routeSource}`,
  /localStorage\.|indexedDB\.|sessionStorage\.|window\.localStorage|window\.sessionStorage|youtube\.googleapis|OAuth2Client|GoogleAuth|from\s+["']googleapis["']|require\(["']googleapis["']\)|liveChatId\s*[:=]\s*["'][^"']+|providerChannelId\s*[:=]\s*["'][^"']+|providerTargetMetadata\s*[:=]\s*["'][^"']+|Authorization\s*[:=]\s*["'][^"']+|SUPABASE_SERVICE_ROLE_KEY\s*[:=]|SERVICE_ROLE_KEY\s*[:=]|BEGIN\s+PRIVATE\s+KEY/i,
  "Task 12 UI/action source avoids browser storage, provider calls, target metadata values, auth header values, and service-role key values"
);

assert.match(taskSource, /Public Release Roadmap Task 12/i, "task board records Task 12 completion state");

console.log("comment translator public operator session UI contract checks passed");
