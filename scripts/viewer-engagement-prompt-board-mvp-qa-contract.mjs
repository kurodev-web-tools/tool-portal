import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const appPath = path.join(root, "components/viewer-engagement-prompt-board/ViewerEngagementPromptBoardApp.tsx");
const workspacePath = path.join(root, "components/viewer-engagement-prompt-board/DataManagementWorkspace.tsx");
const storagePath = path.join(root, "lib/viewer-engagement-prompt-board-storage.ts");

assert.ok(fs.existsSync(workspacePath), "data-management workspace owner exists before navigation is exposed");

const appSource = fs.readFileSync(appPath, "utf8");
const workspaceSource = fs.readFileSync(workspacePath, "utf8");
const storage = await import(pathToFileURL(storagePath).href);

const currentData = {
  schemaVersion: 1,
  streamPlans: [
    {
      id: "plan-01JZ0000000000000000000000",
      title: "現在の配信データ",
      scheduledAt: "2026-07-20T10:00:00.000Z",
      status: "live",
      manualOrder: 0,
      notes: "現在データを維持",
      promptCards: [
        {
          id: "card-01JZ0000000000000000000000",
          body: "現在のカンペ本文",
          category: "talking-point",
          segment: "opening",
          tone: "calm",
          safetyNotes: "",
          order: 0
        }
      ],
      createdAt: "2026-07-15T00:00:00.000Z",
      updatedAt: "2026-07-15T01:00:00.000Z"
    }
  ]
};
const restoredData = {
  schemaVersion: 1,
  streamPlans: [
    {
      ...currentData.streamPlans[0],
      id: "plan-01JZ1000000000000000000000",
      title: "復元した配信データ",
      status: "preparing",
      promptCards: []
    }
  ]
};

function createMemoryStorage(initialValue) {
  let storedValue = initialValue;
  return {
    getItem() {
      return storedValue;
    },
    setItem(_key, value) {
      storedValue = value;
    },
    read() {
      return storedValue;
    }
  };
}

const backup = storage.exportPromptBoardJson(currentData);
assert.equal(backup.ok, true, "valid current data creates a JSON backup");
if (backup.ok) {
  assert.equal(backup.json, JSON.stringify(currentData, null, 2), "backup content is the exact canonical pretty JSON");
}

for (const [label, raw, expectedReason] of [
  ["malformed JSON", "{", "malformed-json"],
  ["unknown schema", JSON.stringify({ ...restoredData, schemaVersion: 99 }), "unsupported-schema"],
  ["invalid data", JSON.stringify({ ...restoredData, streamPlans: [{ ...restoredData.streamPlans[0], title: "" }] }), "invalid-data"]
]) {
  const browserStorage = createMemoryStorage(JSON.stringify(currentData));
  const result = storage.importPromptBoardJson(raw, currentData, browserStorage);
  assert.deepEqual(result, { kind: "failure", reason: expectedReason, data: currentData }, `${label} preserves current data`);
  assert.equal(browserStorage.read(), JSON.stringify(currentData), `${label} preserves persisted data`);
}

const unavailableResult = storage.importPromptBoardJson(JSON.stringify(restoredData), currentData, null);
assert.deepEqual(
  unavailableResult,
  { kind: "failure", reason: "storage-unavailable", data: currentData },
  "storage unavailable preserves current data"
);

const writeFailureStorage = createMemoryStorage(JSON.stringify(currentData));
writeFailureStorage.setItem = () => {
  throw new DOMException("quota", "QuotaExceededError");
};
assert.deepEqual(
  storage.importPromptBoardJson(JSON.stringify(restoredData), currentData, writeFailureStorage),
  { kind: "failure", reason: "write-failed", data: currentData },
  "write failure preserves current data"
);
assert.equal(writeFailureStorage.read(), JSON.stringify(currentData), "write failure preserves persisted data");

const successfulStorage = createMemoryStorage(JSON.stringify(currentData));
const successfulRestore = storage.importPromptBoardJson(JSON.stringify(restoredData), currentData, successfulStorage);
assert.deepEqual(successfulRestore, { kind: "imported", data: restoredData }, "valid restore returns replacement only after persistence");
assert.equal(successfulStorage.read(), JSON.stringify(restoredData), "valid restore persists the exact canonical data");

assert.match(appSource, /type ActiveSection = "plans" \| "cards" \| "live" \| "data"/, "data management is a real app section");
assert.match(appSource, /<DataManagementWorkspace/, "the app renders the data-management workspace");
assert.match(appSource, /onRestore=\{restoreData\}/, "successful restore uses the app-level state reset owner");
assert.match(
  appSource,
  /const restoreData = \(restoredData: PromptBoardData\) => \{[\s\S]*?setData\(restoredData\);[\s\S]*?setEditor\(null\);[\s\S]*?\};/,
  "successful restore closes stale plan editor state"
);
assert.match(appSource, /データ管理/, "tool-local navigation exposes the implemented data-management destination");
assert.match(appSource, /grid-cols-4/, "four local destinations share the mobile width evenly");
assert.match(appSource, /whitespace-nowrap/, "Japanese local-navigation labels do not split mid-phrase");
assert.match(appSource, /px-1 py-2 text-xs/, "mobile local navigation fits without shrinking the touch target");
assert.match(workspaceSource, /exportPromptBoardJson\(data\)/, "backup uses the existing export owner");
assert.match(workspaceSource, /importPromptBoardJson\(restoreJson, data\)/, "restore uses the existing import owner");
assert.match(workspaceSource, /onRestore\(result\.data\)/, "current UI state changes only after successful import");
assert.match(workspaceSource, /aria-describedby="prompt-board-restore-help"/, "restore input has accessible instructions");
assert.match(workspaceSource, /role=\{notice\.kind === "error" \? "alert" : "status"\}/, "sanitized restore feedback is announced");
assert.match(workspaceSource, /\[overflow-wrap:anywhere\]|break-words/, "long CJK and JSON text stay inside the viewport");
assert.match(workspaceSource, /className="block">形式とバージョンを検証します。<\/span>/, "restore guidance keeps semantic Japanese clauses together");
assert.match(appSource, /className="whitespace-nowrap">まずプラン単位で整理します。<\/span>/, "prompt-board summary keeps its compact semantic phrase together");
assert.match(appSource, /className="whitespace-nowrap">JSONでバックアップ・復元します。<\/span>/, "data-management summary keeps its compact semantic phrase together");
assert.match(workspaceSource, /className="whitespace-nowrap">JSONファイルとして保存します。<\/span>/, "backup guidance keeps its compact semantic phrase together");
assert.match(workspaceSource, /className="whitespace-nowrap">現在のデータを置き換えます。<\/span>/, "restore guidance keeps its final semantic phrase together");
assert.doesNotMatch(
  appSource + workspaceSource,
  /console\.(?:log|info|warn|error)|fetch\s*\(|XMLHttpRequest|WebSocket|EventSource|supabase|stripe|oauth|accountId|sessionId|liveChatId/i,
  "data management adds no logging, server, account, session, or external-service integration"
);
assert.doesNotMatch(workspaceSource, /localStorage|sessionStorage|indexedDB/, "the UI does not duplicate the storage owner");

console.log("viewer engagement prompt board MVP QA contract passed");
