import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const domainPath = path.join(root, "lib/viewer-engagement-prompt-board-live-mode.ts");
const appPath = path.join(root, "components/viewer-engagement-prompt-board/ViewerEngagementPromptBoardApp.tsx");
const workspacePath = path.join(root, "components/viewer-engagement-prompt-board/LiveModeWorkspace.tsx");

assert.ok(fs.existsSync(domainPath), "live-mode domain owner exists");
assert.ok(fs.existsSync(workspacePath), "live-mode workspace owner exists");

const domain = await import(pathToFileURL(domainPath).href);
const promptCards = await import(pathToFileURL(path.join(root, "lib/viewer-engagement-prompt-board-prompt-cards.ts")).href);
const resolve = (value, selection) => domain.resolveLiveModeView(
  value,
  selection,
  promptCards.orderPromptCardsForDisplay
);

const cardA = {
  id: "card-01JZA0000000000000000000000",
  body: "最初に読むカンペ",
  category: "talking-point",
  segment: "opening",
  tone: "calm",
  safetyNotes: "固有名詞を確認",
  order: 10
};
const cardB = {
  id: "card-01JZB0000000000000000000000",
  body: "次に読むカンペ\n改行もそのままコピー",
  category: "question",
  segment: "main",
  tone: "energetic",
  safetyNotes: "",
  order: 0
};
const cardC = {
  id: "card-01JZC0000000000000000000000",
  body: "最後に読むカンペ",
  category: "reminder",
  segment: "closing",
  tone: "neutral",
  safetyNotes: "",
  order: 20
};

function plan(overrides = {}) {
  return {
    id: "plan-01JZA0000000000000000000000",
    title: "現在の配信",
    scheduledAt: "2026-07-20T10:00:00.000Z",
    status: "live",
    manualOrder: 0,
    notes: "配信メモ",
    promptCards: [cardA, cardB, cardC],
    createdAt: "2026-07-15T00:00:00.000Z",
    updatedAt: "2026-07-15T01:00:00.000Z",
    ...overrides
  };
}

function data(streamPlans) {
  return { schemaVersion: 1, streamPlans };
}

const noLive = resolve(data([{ ...plan(), status: "preparing" }]), null);
assert.deepEqual(noLive, { kind: "no-live" }, "no live plan produces the dedicated empty state");

const emptyLive = resolve(data([plan({ promptCards: [] })]), null);
assert.equal(emptyLive.kind, "empty", "a live plan with zero cards produces the card empty state");
assert.equal(emptyLive.plan.id, plan().id, "the empty state retains editor return context");

const initial = resolve(data([plan()]), null);
assert.equal(initial.kind, "ready");
assert.deepEqual(initial.cards.map((card) => card.id), [cardB.id, cardA.id, cardC.id], "display reuses persisted prompt-card ordering");
assert.equal(initial.currentCard.id, cardB.id, "initial and reload state starts at the first ordered card");
assert.equal(initial.currentIndex, 0);
assert.equal(initial.total, 3);
assert.equal(initial.canPrevious, false);
assert.equal(initial.canNext, true);

const afterNext = domain.moveLiveModeSelection(initial, "next");
assert.deepEqual(afterNext, { cardId: cardA.id, index: 1 }, "next selects the following ordered card");
const middle = resolve(data([plan()]), afterNext);
assert.equal(middle.kind, "ready");
assert.equal(middle.currentCard.id, cardA.id);
assert.equal(middle.canPrevious, true);
assert.equal(middle.canNext, true);
assert.deepEqual(domain.moveLiveModeSelection(middle, "previous"), { cardId: cardB.id, index: 0 });

assert.deepEqual(domain.moveLiveModeSelection(initial, "previous"), { cardId: cardB.id, index: 0 }, "first previous boundary is a deterministic no-op");
const last = resolve(data([plan()]), { cardId: cardC.id, index: 2 });
assert.equal(last.kind, "ready");
assert.deepEqual(domain.moveLiveModeSelection(last, "next"), { cardId: cardC.id, index: 2 }, "last next boundary is a deterministic no-op");

const oneCard = resolve(data([plan({ promptCards: [cardA] })]), null);
assert.equal(oneCard.kind, "ready");
assert.equal(oneCard.total, 1);
assert.equal(oneCard.canPrevious, false);
assert.equal(oneCard.canNext, false);
assert.deepEqual(domain.moveLiveModeSelection(oneCard, "previous"), { cardId: cardA.id, index: 0 });
assert.deepEqual(domain.moveLiveModeSelection(oneCard, "next"), { cardId: cardA.id, index: 0 });

const reordered = resolve(
  data([plan({ promptCards: [{ ...cardA, order: 0 }, { ...cardB, order: 1 }, { ...cardC, order: 2 }] })]),
  afterNext
);
assert.equal(reordered.kind, "ready");
assert.equal(reordered.currentCard.id, cardA.id, "stable card identity survives reordering");
assert.equal(reordered.currentIndex, 0, "position follows the stable card after reordering");

const deletedMiddle = resolve(
  data([plan({ promptCards: [cardB, cardC] })]),
  afterNext
);
assert.equal(deletedMiddle.kind, "ready");
assert.equal(deletedMiddle.currentCard.id, cardC.id, "a deleted selection falls back to its prior bounded index");
const deletedLast = resolve(
  data([plan({ promptCards: [cardB] })]),
  { cardId: cardC.id, index: 2 }
);
assert.equal(deletedLast.kind, "ready");
assert.equal(deletedLast.currentCard.id, cardB.id, "an out-of-range deleted selection clamps to the last card");

let copiedText = null;
const copied = await domain.copyLivePromptCardBody(cardB.body, {
  async writeText(value) {
    copiedText = value;
  }
});
assert.deepEqual(copied, { ok: true });
assert.equal(copiedText, cardB.body, "copy writes the exact prompt-card body");
assert.deepEqual(await domain.copyLivePromptCardBody(cardB.body, null), { ok: false, reason: "clipboard-unavailable" });
assert.deepEqual(
  await domain.copyLivePromptCardBody(cardB.body, { async writeText() { throw new DOMException("denied", "NotAllowedError"); } }),
  { ok: false, reason: "write-failed" },
  "clipboard rejection returns sanitized failure without content state"
);

const appSource = fs.readFileSync(appPath, "utf8");
const workspaceSource = fs.readFileSync(workspacePath, "utf8");
assert.match(appSource, /LiveModeWorkspace/, "the app renders the real live-mode workspace");
assert.match(appSource, /配信中/, "tool-local navigation exposes live mode only with real behavior");
assert.match(appSource, /min-h-11 whitespace-nowrap border-b-2 border-primary/, "tool-local live navigation remains touch-safe without splitting CJK labels");
assert.match(appSource, /DataManagementWorkspace/, "implemented data management remains a separate real workspace");
assert.match(workspaceSource, /onEditCards\(view\.plan\.id\)/, "empty and ready states return to the selected live plan editor");
assert.match(workspaceSource, /aria-live="polite"/, "position and copy changes are announced");
assert.match(workspaceSource, /disabled=\{!view\.canPrevious\}/, "previous boundary is explicitly disabled");
assert.match(workspaceSource, /disabled=\{!view\.canNext\}/, "next boundary is explicitly disabled");
assert.match(workspaceSource, /whitespace-pre-wrap/, "prompt bodies preserve intentional line breaks");
assert.match(workspaceSource, /\[overflow-wrap:anywhere\]/, "long CJK prompt bodies remain inside the viewport");
assert.match(workspaceSource, /resolveLiveModeView\(data, selection, orderPromptCardsForDisplay\)/, "live display reuses prompt-card domain ordering");
assert.match(workspaceSource, /setSelection\(\{ cardId: view\.currentCard\.id, index: view\.currentIndex \}\)/, "resolved identity and bounded fallback become current UI-only state");
assert.doesNotMatch(workspaceSource, /savePromptBoardData|localStorage|sessionStorage/, "live navigation and clipboard feedback are UI-only");
assert.doesNotMatch(appSource + workspaceSource, /console\.(?:log|info|warn|error)|clipboardHistory|telemetry|analytics/, "live mode logs or stores no prompt or clipboard metadata");

console.log("viewer engagement prompt board live mode contract passed");
