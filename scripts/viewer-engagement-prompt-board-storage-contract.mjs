import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const ownerPath = path.join(root, "lib/viewer-engagement-prompt-board-storage.ts");

assert.ok(fs.existsSync(ownerPath), "prompt-board storage/domain owner exists");

const storage = await import(pathToFileURL(ownerPath).href);

const validData = {
  schemaVersion: 1,
  streamPlans: [
    {
      id: "plan-01JZ0000000000000000000000",
      title: "次回の雑談配信",
      scheduledAt: "2026-07-20T10:00:00.000Z",
      status: "preparing",
      manualOrder: 0,
      notes: "告知を最後に入れる",
      promptCards: [
        {
          id: "card-01JZ0000000000000000000000",
          body: "最初に今日のテーマを一言で伝える",
          category: "talking-point",
          segment: "opening",
          tone: "casual",
          safetyNotes: "個人名を出さない",
          order: 0
        }
      ],
      createdAt: "2026-07-15T00:00:00.000Z",
      updatedAt: "2026-07-15T01:00:00.000Z"
    }
  ]
};

function clone(value) {
  return structuredClone(value);
}

function createMemoryStorage(initialValue = null) {
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

assert.equal(storage.promptBoardSchemaVersion, 1, "schema version is explicit and stable");
assert.equal(
  storage.promptBoardStorageKey,
  "v-streamer-tools-viewer-engagement-prompt-board",
  "prompt-board content uses a dedicated localStorage key"
);
assert.deepEqual(storage.streamPlanStatuses, ["idea", "preparing", "live", "completed"]);
assert.deepEqual(storage.promptCardCategories, ["talking-point", "question", "announcement", "reminder", "other"]);
assert.deepEqual(storage.promptCardSegments, ["opening", "main", "intermission", "closing", "anytime"]);
assert.deepEqual(storage.promptCardTones, ["neutral", "casual", "energetic", "calm", "serious"]);

const parsed = storage.parsePromptBoardJson(JSON.stringify(validData));
assert.equal(parsed.ok, true, "valid nested prompt-board JSON parses");
if (parsed.ok) {
  assert.deepEqual(parsed.data, validData, "valid data is preserved without hidden metadata");
}

const invalidCases = [
  ["malformed JSON", "{"],
  ["unknown schema", JSON.stringify({ ...validData, schemaVersion: 2 })],
  ["missing required field", JSON.stringify({ schemaVersion: 1 })],
  ["invalid plan status", JSON.stringify({ ...validData, streamPlans: [{ ...validData.streamPlans[0], status: "draft" }] })],
  [
    "invalid nested category",
    JSON.stringify({
      ...validData,
      streamPlans: [{ ...validData.streamPlans[0], promptCards: [{ ...validData.streamPlans[0].promptCards[0], category: "secret" }] }]
    })
  ],
  [
    "invalid nested segment",
    JSON.stringify({
      ...validData,
      streamPlans: [{ ...validData.streamPlans[0], promptCards: [{ ...validData.streamPlans[0].promptCards[0], segment: "afterparty" }] }]
    })
  ],
  [
    "invalid nested tone",
    JSON.stringify({
      ...validData,
      streamPlans: [{ ...validData.streamPlans[0], promptCards: [{ ...validData.streamPlans[0].promptCards[0], tone: "viral" }] }]
    })
  ],
  ["invalid timestamp", JSON.stringify({ ...validData, streamPlans: [{ ...validData.streamPlans[0], updatedAt: "today" }] })],
  ["invalid order", JSON.stringify({ ...validData, streamPlans: [{ ...validData.streamPlans[0], manualOrder: -1 }] })],
  [
    "duplicate stable plan ID",
    JSON.stringify({ ...validData, streamPlans: [validData.streamPlans[0], clone(validData.streamPlans[0])] })
  ],
  [
    "duplicate stable card ID",
    JSON.stringify({
      ...validData,
      streamPlans: [
        {
          ...validData.streamPlans[0],
          promptCards: [validData.streamPlans[0].promptCards[0], clone(validData.streamPlans[0].promptCards[0])]
        }
      ]
    })
  ],
  [
    "multiple live plans",
    JSON.stringify({
      ...validData,
      streamPlans: [
        { ...validData.streamPlans[0], status: "live" },
        { ...validData.streamPlans[0], id: "plan-01JZ1000000000000000000000", status: "live", promptCards: [] }
      ]
    })
  ],
  ["sensitive top-level field", JSON.stringify({ ...validData, account: { id: "private" } })],
  [
    "sensitive nested field",
    JSON.stringify({ ...validData, streamPlans: [{ ...validData.streamPlans[0], providerTargetMetadata: "private" }] })
  ]
];

for (const [label, raw] of invalidCases) {
  assert.equal(storage.parsePromptBoardJson(raw).ok, false, `${label} fails closed`);
}

const currentData = storage.createEmptyPromptBoardData();

const emptyLoad = storage.loadPromptBoardData(currentData, createMemoryStorage());
assert.deepEqual(emptyLoad, { kind: "empty", data: currentData }, "empty storage preserves current in-memory data");

const corruptLoad = storage.loadPromptBoardData(currentData, createMemoryStorage("not-json"));
assert.deepEqual(
  corruptLoad,
  { kind: "failure", reason: "corrupt-data", data: currentData },
  "corrupt stored data preserves current in-memory data"
);

const unknownLoad = storage.loadPromptBoardData(
  currentData,
  createMemoryStorage(JSON.stringify({ ...validData, schemaVersion: 99 }))
);
assert.deepEqual(
  unknownLoad,
  { kind: "failure", reason: "unsupported-schema", data: currentData },
  "unknown stored schema preserves current in-memory data"
);

const unavailableStorage = {
  getItem() {
    throw new Error("blocked");
  },
  setItem() {
    throw new Error("blocked");
  }
};
assert.deepEqual(
  storage.loadPromptBoardData(currentData, unavailableStorage),
  { kind: "failure", reason: "storage-unavailable", data: currentData },
  "unavailable storage preserves current in-memory data"
);

const quotaStorage = createMemoryStorage(JSON.stringify(currentData));
quotaStorage.setItem = () => {
  throw new DOMException("quota", "QuotaExceededError");
};
assert.deepEqual(
  storage.importPromptBoardJson(JSON.stringify(validData), currentData, quotaStorage),
  { kind: "failure", reason: "write-failed", data: currentData },
  "quota failure keeps the current dataset"
);
assert.equal(quotaStorage.read(), JSON.stringify(currentData), "quota failure does not replace the last valid stored dataset");

const importStorage = createMemoryStorage(JSON.stringify(currentData));
const importResult = storage.importPromptBoardJson(JSON.stringify(validData), currentData, importStorage);
assert.equal(importResult.kind, "imported", "valid import replaces data only after persistence succeeds");
assert.deepEqual(JSON.parse(importStorage.read()), validData, "valid import writes canonical prompt-board content");

const invalidImportStorage = createMemoryStorage(JSON.stringify(validData));
assert.deepEqual(
  storage.importPromptBoardJson("{", validData, invalidImportStorage),
  { kind: "failure", reason: "malformed-json", data: validData },
  "malformed import is atomic"
);
assert.equal(invalidImportStorage.read(), JSON.stringify(validData), "malformed import leaves the last valid storage value untouched");

const exportResult = storage.exportPromptBoardJson(validData);
assert.equal(exportResult.ok, true, "valid data exports to JSON");
if (exportResult.ok) {
  assert.deepEqual(JSON.parse(exportResult.json), validData, "export contains only the canonical prompt-board schema");
  assert.doesNotMatch(
    exportResult.json,
    /account|session|admin|credential|provider|viewer|telemetry|oauth|supabase|stripe|liveChatId/i,
    "export excludes sensitive and external-service metadata"
  );
}

console.log("viewer engagement prompt board storage contract passed");
