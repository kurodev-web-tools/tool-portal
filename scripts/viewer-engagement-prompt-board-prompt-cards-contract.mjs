import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const domainPath = path.join(root, "lib/viewer-engagement-prompt-board-prompt-cards.ts");
const appPath = path.join(root, "components/viewer-engagement-prompt-board/ViewerEngagementPromptBoardApp.tsx");
const workspacePath = path.join(root, "components/viewer-engagement-prompt-board/PromptCardWorkspace.tsx");
const editorPath = path.join(root, "components/viewer-engagement-prompt-board/PromptCardEditor.tsx");
const listPath = path.join(root, "components/viewer-engagement-prompt-board/PromptCardList.tsx");
const selectorPath = path.join(root, "components/viewer-engagement-prompt-board/PromptCardPlanSelector.tsx");

assert.ok(fs.existsSync(domainPath), "prompt-card domain owner exists");
assert.ok(fs.existsSync(workspacePath), "prompt-card workspace owner exists");
assert.ok(fs.existsSync(editorPath), "prompt-card editor owner exists");
assert.ok(fs.existsSync(listPath), "prompt-card list owner exists");
assert.ok(fs.existsSync(selectorPath), "prompt-card plan-selection owner exists");

const domain = await import(pathToFileURL(domainPath).href);
const storage = await import(pathToFileURL(path.join(root, "lib/viewer-engagement-prompt-board-storage.ts")).href);

assert.equal(typeof domain.orderPromptCardsForDisplay, "function", "domain owns deterministic persisted-card display order");

const cardA = {
  id: "card-01JZA0000000000000000000000",
  body: "最初の話題",
  category: "talking-point",
  segment: "opening",
  tone: "casual",
  safetyNotes: "個人名を出さない",
  order: 4
};
const cardB = {
  id: "card-01JZB0000000000000000000000",
  body: "質問を投げる",
  category: "question",
  segment: "main",
  tone: "energetic",
  safetyNotes: "",
  order: 9
};
const seededData = {
  schemaVersion: 1,
  streamPlans: [
    {
      id: "plan-01JZA0000000000000000000000",
      title: "配信中",
      scheduledAt: "2026-07-20T10:00:00.000Z",
      status: "live",
      manualOrder: 0,
      notes: "",
      promptCards: [cardA, cardB],
      createdAt: "2026-07-15T00:00:00.000Z",
      updatedAt: "2026-07-15T01:00:00.000Z"
    },
    {
      id: "plan-01JZB0000000000000000000000",
      title: "次回配信",
      scheduledAt: "2026-07-21T10:00:00.000Z",
      status: "preparing",
      manualOrder: 1,
      notes: "",
      promptCards: [],
      createdAt: "2026-07-15T00:00:00.000Z",
      updatedAt: "2026-07-15T01:00:00.000Z"
    },
    {
      id: "plan-01JZC0000000000000000000000",
      title: "アイデア",
      scheduledAt: null,
      status: "idea",
      manualOrder: 2,
      notes: "",
      promptCards: [],
      createdAt: "2026-07-15T00:00:00.000Z",
      updatedAt: "2026-07-15T01:00:00.000Z"
    }
  ]
};

const reversedPersistedCards = [{ ...cardA, order: 1 }, { ...cardB, order: 0 }];
assert.deepEqual(
  domain.orderPromptCardsForDisplay(reversedPersistedCards).map((card) => card.id),
  [cardB.id, cardA.id],
  "reload display follows order even when persisted array order differs"
);

function context(now = "2026-07-16T01:00:00.000Z") {
  return { now, createId: () => "card-01JZD0000000000000000000000" };
}

const created = domain.createPromptCard(
  seededData,
  {
    planId: seededData.streamPlans[0].id,
    input: {
      body: "  お知らせを読む  ",
      category: "announcement",
      segment: "closing",
      tone: "calm",
      safetyNotes: "  URLを確認  "
    }
  },
  context()
);
assert.equal(created.ok, true, "a valid prompt card is added");
assert.deepEqual(created.data.streamPlans[0].promptCards.map((card) => card.order), [0, 1, 2], "add normalizes order");
assert.deepEqual(created.data.streamPlans[0].promptCards[2], {
  id: "card-01JZD0000000000000000000000",
  body: "お知らせを読む",
  category: "announcement",
  segment: "closing",
  tone: "calm",
  safetyNotes: "URLを確認",
  order: 2
});
assert.equal(created.data.streamPlans[0].updatedAt, "2026-07-16T01:00:00.000Z");

for (const [label, input] of [
  ["empty body", { body: " ", category: "other", segment: "anytime", tone: "neutral", safetyNotes: "" }],
  ["invalid category", { body: "本文", category: "template", segment: "anytime", tone: "neutral", safetyNotes: "" }],
  ["invalid segment", { body: "本文", category: "other", segment: "afterparty", tone: "neutral", safetyNotes: "" }],
  ["invalid tone", { body: "本文", category: "other", segment: "anytime", tone: "viral", safetyNotes: "" }]
]) {
  const result = domain.createPromptCard(seededData, { planId: seededData.streamPlans[0].id, input }, context());
  assert.deepEqual(result, { ok: false, reason: "invalid-input", data: seededData }, `${label} fails atomically`);
}

const edited = domain.updatePromptCard(
  created.data,
  {
    planId: seededData.streamPlans[0].id,
    cardId: cardA.id,
    input: { body: "修正した話題", category: "reminder", segment: "intermission", tone: "serious", safetyNotes: "再確認" }
  },
  context("2026-07-16T02:00:00.000Z")
);
assert.equal(edited.ok, true, "a prompt card is edited");
assert.equal(edited.data.streamPlans[0].promptCards[0].id, cardA.id, "edit preserves stable identity");
assert.equal(edited.data.streamPlans[0].promptCards[0].order, 0, "edit preserves normalized position");
assert.equal(edited.data.streamPlans[0].updatedAt, "2026-07-16T02:00:00.000Z");

const reordered = domain.reorderPromptCard(
  seededData,
  { planId: seededData.streamPlans[0].id, cardId: cardB.id, direction: "up" },
  context("2026-07-16T03:00:00.000Z")
);
assert.deepEqual(reordered.data.streamPlans[0].promptCards.map((card) => [card.id, card.order]), [[cardB.id, 0], [cardA.id, 1]]);
assert.equal(reordered.data.streamPlans[0].updatedAt, "2026-07-16T03:00:00.000Z");

const firstBoundary = domain.reorderPromptCard(reordered.data, { planId: seededData.streamPlans[0].id, cardId: cardB.id, direction: "up" }, context("2026-07-16T03:30:00.000Z"));
assert.strictEqual(firstBoundary.data, reordered.data, "first boundary is a timestamp-stable no-op");
const lastBoundary = domain.reorderPromptCard(reordered.data, { planId: seededData.streamPlans[0].id, cardId: cardA.id, direction: "down" }, context("2026-07-16T03:30:00.000Z"));
assert.strictEqual(lastBoundary.data, reordered.data, "last boundary is a timestamp-stable no-op");

const moved = domain.movePromptCard(
  seededData,
  { sourcePlanId: seededData.streamPlans[0].id, cardId: cardA.id, destinationPlanId: seededData.streamPlans[1].id },
  context("2026-07-16T04:00:00.000Z")
);
assert.equal(moved.ok, true, "a prompt card moves across plans");
const movedSource = moved.data.streamPlans[0];
const movedDestination = moved.data.streamPlans[1];
assert.deepEqual(movedSource.promptCards.map((card) => [card.id, card.order]), [[cardB.id, 0]], "source order normalizes");
assert.deepEqual(movedDestination.promptCards.map((card) => [card.id, card.order]), [[cardA.id, 0]], "destination order normalizes");
assert.equal(movedDestination.promptCards[0].id, cardA.id, "cross-plan move preserves stable identity");
assert.deepEqual({ ...movedDestination.promptCards[0], order: cardA.order }, cardA, "cross-plan move preserves card content");
assert.notStrictEqual(movedDestination.promptCards[0], cardA, "cross-plan move avoids shared object references");
assert.notStrictEqual(movedSource.promptCards, seededData.streamPlans[0].promptCards, "source avoids shared array references");
assert.equal(movedSource.updatedAt, "2026-07-16T04:00:00.000Z");
assert.equal(movedDestination.updatedAt, "2026-07-16T04:00:00.000Z");

const samePlanMove = domain.movePromptCard(
  seededData,
  { sourcePlanId: seededData.streamPlans[0].id, cardId: cardA.id, destinationPlanId: seededData.streamPlans[0].id },
  context("2026-07-16T04:30:00.000Z")
);
assert.deepEqual(samePlanMove.data.streamPlans[0].promptCards.map((card) => [card.id, card.order]), [[cardA.id, 0], [cardB.id, 1]], "same-plan move normalizes non-canonical order");
assert.equal(samePlanMove.data.streamPlans[0].updatedAt, "2026-07-16T04:30:00.000Z", "same-plan normalization updates the affected plan timestamp");
const canonicalSamePlanMove = domain.movePromptCard(
  samePlanMove.data,
  { sourcePlanId: seededData.streamPlans[0].id, cardId: cardA.id, destinationPlanId: seededData.streamPlans[0].id },
  context("2026-07-16T04:45:00.000Z")
);
assert.strictEqual(canonicalSamePlanMove.data, samePlanMove.data, "canonical same-plan move is a timestamp-stable no-op");

const deleted = domain.deletePromptCard(seededData, { planId: seededData.streamPlans[0].id, cardId: cardA.id }, context("2026-07-16T05:00:00.000Z"));
assert.deepEqual(deleted.data.streamPlans[0].promptCards, [{ ...cardB, order: 0 }], "delete normalizes remaining order");
assert.equal(deleted.data.streamPlans[0].updatedAt, "2026-07-16T05:00:00.000Z");
const emptied = domain.deletePromptCard(deleted.data, { planId: seededData.streamPlans[0].id, cardId: cardB.id }, context("2026-07-16T05:30:00.000Z"));
assert.deepEqual(emptied.data.streamPlans[0].promptCards, [], "deleting the last card leaves a valid empty plan");

for (const result of [
  domain.deletePromptCard(seededData, { planId: "plan-missing000000", cardId: cardA.id }, context()),
  domain.deletePromptCard(seededData, { planId: seededData.streamPlans[0].id, cardId: "card-missing000000" }, context()),
  domain.movePromptCard(seededData, { sourcePlanId: seededData.streamPlans[0].id, cardId: cardA.id, destinationPlanId: "plan-missing000000" }, context())
]) {
  assert.deepEqual(result, { ok: false, reason: "not-found", data: seededData }, "missing IDs fail atomically");
}

assert.equal(domain.resolvePromptCardPlanId(seededData, seededData.streamPlans[1].id), seededData.streamPlans[1].id, "existing selection survives reload");
assert.equal(domain.resolvePromptCardPlanId(seededData, "plan-deleted000000"), seededData.streamPlans[0].id, "missing selection falls back to current plan");
assert.equal(domain.resolvePromptCardPlanId({ ...seededData, streamPlans: seededData.streamPlans.slice(1) }, seededData.streamPlans[0].id), seededData.streamPlans[1].id, "deleted current plan falls back to upcoming plan");
assert.equal(domain.resolvePromptCardPlanId(storage.createEmptyPromptBoardData(), null), null, "empty data has no selected plan");

let storedValue = null;
const memoryStorage = {
  getItem() { return storedValue; },
  setItem(_key, value) { storedValue = value; }
};
const saved = storage.savePromptBoardData(moved.data, seededData, memoryStorage);
assert.equal(saved.kind, "saved", "card mutations persist through the storage owner");
assert.deepEqual(storage.loadPromptBoardData(storage.createEmptyPromptBoardData(), memoryStorage).data, moved.data, "card mutations survive reload");
const failedSave = storage.savePromptBoardData(moved.data, seededData, {
  getItem() { return storedValue; },
  setItem() { throw new DOMException("quota", "QuotaExceededError"); }
});
assert.deepEqual(failedSave, { kind: "failure", reason: "write-failed", data: seededData }, "write failure preserves the current dataset");

const appSource = fs.readFileSync(appPath, "utf8");
const workspaceSource = fs.readFileSync(workspacePath, "utf8");
const listSource = fs.readFileSync(listPath, "utf8");
assert.match(appSource, /PromptCardWorkspace/, "the app exposes the real prompt-card workspace");
assert.match(appSource, /copy\.app\.tabs\.cards/, "tool-local navigation exposes the localized real card editor");
assert.match(workspaceSource, /focusAfterListMutation/, "successful row removal restores focus to a stable card action");
assert.match(workspaceSource, /editor\?\.kind === "edit" && editor\.cardId === cardId/, "moving the edited card closes stale editor state only after save");
assert.match(workspaceSource, /panel min-w-0 p-4 sm:p-5/, "workspace panels can shrink below native select intrinsic width on mobile");
assert.match(listSource, /grid min-w-0 gap-3/, "card rows do not impose a hidden grid min-content width on mobile");
assert.match(workspaceSource, /orderPromptCardsForDisplay\(selectedPlan\.promptCards\)/, "UI boundaries and display consume domain-owned persisted order");
assert.doesNotMatch(appSource + workspaceSource, /account|session|credential|provider|viewerId|telemetry|analytics|templateMetadata|externalService/i, "prompt-card UI adds no external metadata");

console.log("viewer engagement prompt board prompt cards contract passed");
