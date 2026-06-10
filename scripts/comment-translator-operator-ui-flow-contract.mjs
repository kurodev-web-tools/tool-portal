import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const libPath = "lib/comment-translator.ts";
const componentPath = "components/comment-translator/CommentTranslatorDock.tsx";
const pagePath = "app/tools/comment-translator/page.tsx";
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
const pageSource = read(pagePath);
const taskSource = read(taskPath);

assert.equal(
  lib.commentTranslatorUiCopy.en.sections.operatorFlow,
  "Operator Flow",
  "English copy includes the operator flow section"
);
assert.equal(
  lib.commentTranslatorUiCopy.ja.sections.operatorFlow,
  "オペレーター確認フロー",
  "Japanese copy includes the operator flow section"
);
assert.equal(
  lib.commentTranslatorUiCopy.en.operatorFlow.noLiveExecution,
  "This screen does not run live provider commands.",
  "English copy states the UI cannot run live provider commands"
);
assert.equal(
  lib.commentTranslatorUiCopy.ja.operatorFlow.noLiveExecution,
  "この画面からlive/provider commandは実行しません。",
  "Japanese copy states the UI cannot run live provider commands"
);
assert.deepEqual(
  lib.commentTranslatorOperatorFlowSteps.map((step) => step.id),
  ["credential-status", "target-readiness", "intake-bridge", "explicit-approval"],
  "operator flow exposes the expected local-only checklist steps"
);
assert.ok(
  lib.commentTranslatorOperatorFlowSteps.every((step) => step.source === "ui-local-status-only"),
  "operator flow steps are UI-local status only"
);

assert.match(componentSource, /data-operator-ui-flow="local-status-only"/, "dock renders a local-only operator flow panel");
assert.match(componentSource, /operatorFlowStatus/, "dock derives a local operator flow status");
assert.match(componentSource, /operatorFlowChecklist/, "dock renders the operator flow checklist");
assert.match(componentSource, /copy\.operatorFlow\.noLiveExecution/, "dock renders the no-live-execution copy");
assert.match(componentSource, /credentialStatusState === "available"/, "operator flow reacts to sanitized credential status");
assert.match(componentSource, /selectedStream\.dockStatus === "ready"/, "operator flow reacts to selected stream readiness");
assert.match(componentSource, /localizedConnection\.dockStatus !== "blocked"/, "operator flow reacts to operator connection state");

assert.doesNotMatch(
  `${libSource}\n${componentSource}\n${pageSource}`,
  /comment-translator-youtube-live-comment-intake-pipeline|liveChatMessages|liveBroadcasts\.list|fetch\s*\(|XMLHttpRequest|EventSource|WebSocket|setInterval|setTimeout|localStorage|indexedDB|sessionStorage|window\.localStorage|window\.sessionStorage|navigator\.clipboard/i,
  "operator UI flow does not run provider calls, add polling loops, or touch browser storage"
);
assert.doesNotMatch(
  `${libSource}\n${componentSource}\n${pageSource}`,
  /oauthAccessToken|oauthRefreshToken|authorizationCodeValue|service_role|SUPABASE_SERVICE_ROLE_KEY|Authorization\s*[:=]|providerChannelIdValue|ownerUserIdValue|liveChatIdValue/i,
  "operator UI flow source does not introduce secret-bearing values or identifier values"
);
assert.match(
  taskSource,
  /Task 7 operator UI flow/i,
  "task board records the Task 7 operator UI flow slice"
);

console.log("comment translator operator UI flow contract checks passed");
