import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const domainPath = path.join(root, "lib/viewer-engagement-prompt-board-stream-plans.ts");
const storagePath = path.join(root, "lib/viewer-engagement-prompt-board-storage.ts");
const editorPath = path.join(root, "components/viewer-engagement-prompt-board/StreamPlanEditor.tsx");
const appPath = path.join(root, "components/viewer-engagement-prompt-board/ViewerEngagementPromptBoardApp.tsx");

assert.ok(fs.existsSync(domainPath), "stream-plan domain owner exists");

const domain = await import(pathToFileURL(domainPath).href);
const storage = await import(pathToFileURL(storagePath).href);
const editorSource = fs.readFileSync(editorPath, "utf8");
const appSource = fs.readFileSync(appPath, "utf8");

assert.match(editorSource, /manualOrder\.trim\(\) === ""/, "an empty manual order is rejected instead of coercing to zero");
assert.match(editorSource, /value=\{manualOrder\}[\s\S]{0,220}required/, "manual order is a required input");
assert.match(appSource, /requestAnimationFrame\(\(\) => createButtonRef\.current\?\.focus\(\)\)/, "closing the editor restores focus");

const createContext = (now, ids) => {
  let index = 0;
  return {
    now,
    createId(kind) {
      const id = ids[index];
      index += 1;
      assert.ok(id, `a deterministic ${kind} ID is available`);
      return id;
    }
  };
};

const planId = "plan-01JZ1000000000000000000000";
const created = domain.createStreamPlan(
  storage.createEmptyPromptBoardData(),
  {
    title: "  次回の雑談配信  ",
    scheduledAt: "2026-07-20T10:00:00.000Z",
    notes: "告知を最後に入れる",
    status: "preparing",
    manualOrder: 4
  },
  createContext("2026-07-15T01:00:00.000Z", [planId])
);
assert.equal(created.ok, true, "a stream plan is created");
assert.deepEqual(created.data.streamPlans[0], {
  id: planId,
  title: "次回の雑談配信",
  scheduledAt: "2026-07-20T10:00:00.000Z",
  status: "preparing",
  manualOrder: 4,
  notes: "告知を最後に入れる",
  promptCards: [],
  createdAt: "2026-07-15T01:00:00.000Z",
  updatedAt: "2026-07-15T01:00:00.000Z"
});

const edited = domain.updateStreamPlanMetadata(
  created.data,
  planId,
  {
    title: "ゲーム配信",
    scheduledAt: null,
    notes: "ネタバレ注意",
    status: "idea",
    manualOrder: 2
  },
  createContext("2026-07-15T02:00:00.000Z", [])
);
assert.equal(edited.ok, true, "plan metadata is editable");
assert.deepEqual(
  {
    title: edited.data.streamPlans[0].title,
    scheduledAt: edited.data.streamPlans[0].scheduledAt,
    notes: edited.data.streamPlans[0].notes,
    status: edited.data.streamPlans[0].status,
    manualOrder: edited.data.streamPlans[0].manualOrder,
    updatedAt: edited.data.streamPlans[0].updatedAt
  },
  {
    title: "ゲーム配信",
    scheduledAt: null,
    notes: "ネタバレ注意",
    status: "idea",
    manualOrder: 2,
    updatedAt: "2026-07-15T02:00:00.000Z"
  }
);

const seededData = {
  schemaVersion: 1,
  streamPlans: [
    {
      id: "plan-01JZ2000000000000000000000",
      title: "配信中A",
      scheduledAt: "2026-07-18T12:00:00.000Z",
      status: "live",
      manualOrder: 0,
      notes: "",
      promptCards: [],
      createdAt: "2026-07-10T00:00:00.000Z",
      updatedAt: "2026-07-15T00:00:00.000Z"
    },
    {
      id: "plan-01JZ3000000000000000000000",
      title: "予定B",
      scheduledAt: "2026-07-19T12:00:00.000Z",
      status: "preparing",
      manualOrder: 1,
      notes: "",
      promptCards: [],
      createdAt: "2026-07-11T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z"
    },
    {
      id: "plan-01JZ4000000000000000000000",
      title: "同時刻C",
      scheduledAt: "2026-07-21T12:00:00.000Z",
      status: "preparing",
      manualOrder: 8,
      notes: "",
      promptCards: [],
      createdAt: "2026-07-12T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z"
    },
    {
      id: "plan-01JZ5000000000000000000000",
      title: "同時刻D",
      scheduledAt: "2026-07-21T12:00:00.000Z",
      status: "preparing",
      manualOrder: 3,
      notes: "",
      promptCards: [
        {
          id: "card-01JZ5000000000000000000000",
          body: "挨拶",
          category: "talking-point",
          segment: "opening",
          tone: "casual",
          safetyNotes: "",
          order: 0
        }
      ],
      createdAt: "2026-07-13T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z"
    },
    {
      id: "plan-01JZ6000000000000000000000",
      title: "未定E",
      scheduledAt: null,
      status: "preparing",
      manualOrder: 0,
      notes: "",
      promptCards: [],
      createdAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z"
    },
    {
      id: "plan-01JZ7000000000000000000000",
      title: "アイデアF",
      scheduledAt: null,
      status: "idea",
      manualOrder: 0,
      notes: "",
      promptCards: [],
      createdAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z"
    },
    {
      id: "plan-01JZ8000000000000000000000",
      title: "完了G",
      scheduledAt: "2026-07-10T12:00:00.000Z",
      status: "completed",
      manualOrder: 0,
      notes: "",
      promptCards: [],
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-10T13:00:00.000Z"
    }
  ]
};

const groups = domain.groupStreamPlans(seededData.streamPlans);
assert.deepEqual(groups.current.map((plan) => plan.title), ["配信中A"]);
assert.deepEqual(
  groups.upcoming.map((plan) => plan.title),
  ["予定B", "同時刻D", "同時刻C", "未定E"],
  "upcoming plans sort by scheduledAt, then manualOrder, with undated plans last"
);
assert.deepEqual(groups.ideas.map((plan) => plan.title), ["アイデアF"]);
assert.deepEqual(groups.completed.map((plan) => plan.title), ["完了G"]);

const switched = domain.switchCurrentStreamPlan(
  seededData,
  "plan-01JZ3000000000000000000000",
  createContext("2026-07-15T03:00:00.000Z", [])
);
assert.equal(switched.ok, true, "a preparing plan can become current");
assert.equal(switched.data.streamPlans.filter((plan) => plan.status === "live").length, 1, "only one current plan remains");
assert.equal(switched.data.streamPlans.find((plan) => plan.id === "plan-01JZ2000000000000000000000").status, "preparing");
assert.equal(switched.data.streamPlans.find((plan) => plan.id === "plan-01JZ3000000000000000000000").status, "live");

const createdLive = domain.createStreamPlan(
  seededData,
  { title: "新しい配信中", scheduledAt: null, notes: "", status: "live", manualOrder: 10 },
  createContext("2026-07-15T03:10:00.000Z", ["plan-01JZB0000000000000000000000"])
);
assert.equal(createdLive.data.streamPlans.filter((plan) => plan.status === "live").length, 1, "creating live also preserves single-current");
assert.equal(createdLive.data.streamPlans.at(-1).status, "live");

const editedLive = domain.updateStreamPlanMetadata(
  seededData,
  "plan-01JZ3000000000000000000000",
  { title: "予定B", scheduledAt: "2026-07-20T10:00:00.000Z", notes: "", status: "live", manualOrder: 8 },
  createContext("2026-07-15T03:20:00.000Z", [])
);
assert.equal(editedLive.data.streamPlans.filter((plan) => plan.status === "live").length, 1, "editing status to live preserves single-current");
assert.equal(editedLive.data.streamPlans.find((plan) => plan.id === "plan-01JZ3000000000000000000000").status, "live");

const reordered = domain.reorderStreamPlan(
  seededData,
  "plan-01JZ4000000000000000000000",
  "up",
  createContext("2026-07-15T04:00:00.000Z", [])
);
assert.equal(reordered.ok, true, "manual reorder succeeds");
assert.deepEqual(
  domain.groupStreamPlans(reordered.data.streamPlans).upcoming.map((plan) => plan.title),
  ["予定B", "同時刻C", "同時刻D", "未定E"],
  "manual reorder changes equal-datetime order"
);

const crossScheduleReorder = domain.reorderStreamPlan(
  seededData,
  "plan-01JZ3000000000000000000000",
  "down",
  createContext("2026-07-15T04:30:00.000Z", [])
);
assert.equal(crossScheduleReorder.ok, false, "manual reorder rejects a move across scheduled-time buckets");
assert.deepEqual(crossScheduleReorder.data, seededData, "a rejected cross-schedule move preserves the current dataset");
assert.equal(
  domain.isSameManualOrderBucket(seededData.streamPlans[2], seededData.streamPlans[4]),
  false,
  "scheduled plans with different timestamps cannot expose manual reordering"
);

const duplicated = domain.duplicateStreamPlan(
  seededData,
  "plan-01JZ5000000000000000000000",
  createContext("2026-07-15T05:00:00.000Z", [
    "plan-01JZ9000000000000000000000",
    "card-01JZ9000000000000000000000"
  ])
);
assert.equal(duplicated.ok, true, "a plan is duplicated");
const duplicate = duplicated.data.streamPlans.at(-1);
const source = seededData.streamPlans.find((plan) => plan.id === "plan-01JZ5000000000000000000000");
assert.equal(duplicate.id, "plan-01JZ9000000000000000000000");
assert.equal(duplicate.title, "同時刻D のコピー");
assert.equal(duplicate.createdAt, "2026-07-15T05:00:00.000Z");
assert.equal(duplicate.updatedAt, "2026-07-15T05:00:00.000Z");
assert.notEqual(duplicate.promptCards, source.promptCards, "prompt cards do not share an array reference");
assert.notEqual(duplicate.promptCards[0], source.promptCards[0], "prompt cards do not share object references");
assert.equal(duplicate.promptCards[0].id, "card-01JZ9000000000000000000000", "nested cards receive fresh IDs");

const ideaDuplicate = domain.duplicateStreamPlan(
  seededData,
  "plan-01JZ2000000000000000000000",
  createContext("2026-07-15T06:00:00.000Z", ["plan-01JZA0000000000000000000000"])
);
assert.equal(ideaDuplicate.data.streamPlans.at(-1).status, "preparing", "a live duplicate cannot become a second current plan");

const preparedIdea = domain.moveIdeaToPreparing(
  seededData,
  "plan-01JZ7000000000000000000000",
  createContext("2026-07-15T07:00:00.000Z", [])
);
assert.equal(preparedIdea.data.streamPlans.find((plan) => plan.id === "plan-01JZ7000000000000000000000").status, "preparing");

const completed = domain.completeStreamPlan(
  seededData,
  "plan-01JZ3000000000000000000000",
  createContext("2026-07-15T08:00:00.000Z", [])
);
assert.equal(completed.data.streamPlans.find((plan) => plan.id === "plan-01JZ3000000000000000000000").status, "completed");

const deleted = domain.deleteStreamPlan(seededData, "plan-01JZ8000000000000000000000");
assert.equal(deleted.ok, true, "a plan is deleted");
assert.equal(deleted.data.streamPlans.some((plan) => plan.id === "plan-01JZ8000000000000000000000"), false);

let storedValue = null;
const memoryStorage = {
  getItem() {
    return storedValue;
  },
  setItem(_key, value) {
    storedValue = value;
  }
};
const saved = storage.savePromptBoardData(switched.data, seededData, memoryStorage);
assert.equal(saved.kind, "saved", "a domain mutation persists through the only storage boundary");
const reloaded = storage.loadPromptBoardData(storage.createEmptyPromptBoardData(), memoryStorage);
assert.equal(reloaded.kind, "loaded", "persisted stream-plan state reloads");
assert.deepEqual(reloaded.data, switched.data);

const failingStorage = {
  getItem() {
    return storedValue;
  },
  setItem() {
    throw new DOMException("quota", "QuotaExceededError");
  }
};
const failedSave = storage.savePromptBoardData(completed.data, switched.data, failingStorage);
assert.deepEqual(
  failedSave,
  { kind: "failure", reason: "write-failed", data: switched.data },
  "write failure preserves the last valid current dataset"
);
assert.deepEqual(storage.loadPromptBoardData(storage.createEmptyPromptBoardData(), memoryStorage).data, switched.data);

console.log("viewer engagement prompt board stream plans contract passed");
