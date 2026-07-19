import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const domainPath = path.join(root, "lib/viewer-engagement-prompt-board-live-mode.ts");
const appPath = path.join(root, "components/viewer-engagement-prompt-board/ViewerEngagementPromptBoardApp.tsx");
const workspacePath = path.join(root, "components/viewer-engagement-prompt-board/LiveModeWorkspace.tsx");
const boardPath = path.join(root, "components/viewer-engagement-prompt-board/LiveModeBoard.tsx");
const detailPath = path.join(root, "components/viewer-engagement-prompt-board/LivePromptDetail.tsx");
const planListPath = path.join(root, "components/viewer-engagement-prompt-board/StreamPlanList.tsx");

assert.ok(fs.existsSync(domainPath), "live-mode domain owner exists");
assert.ok(fs.existsSync(workspacePath), "live-mode workspace owner exists");
assert.ok(fs.existsSync(boardPath), "responsive category board owner exists");
assert.ok(fs.existsSync(detailPath), "shared full-prompt detail owner exists");

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
const cardD = {
  ...cardA,
  id: "card-01JZD0000000000000000000000",
  body: "同じカテゴリで次に追加したカンペ",
  segment: "main",
  order: 30
};
const cardE = {
  ...cardA,
  id: "card-01JZE0000000000000000000000",
  body: "同じカテゴリで最後に追加したカンペ",
  segment: "closing",
  order: 40
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
assert.equal(initial.total, 1, "detail totals are scoped to the first card category");
assert.equal(initial.canPrevious, false);
assert.equal(initial.canNext, false);

const grouped = resolve(data([plan({ promptCards: [cardE, cardC, cardA, cardD, cardB] })]), null);
assert.equal(grouped.kind, "ready");
assert.deepEqual(
  grouped.groups.map((group) => [group.category, group.cards.map((card) => card.id)]),
  [
    ["talking-point", [cardA.id, cardD.id, cardE.id]],
    ["question", [cardB.id]],
    ["reminder", [cardC.id]]
  ],
  "live cards are grouped by localized category order while preserving card order within each category"
);
assert.equal(
  domain.summarizeLivePromptCardBody("  最初の要点です。\n続きの詳しい説明です。  "),
  "最初の要点です。",
  "signboard summaries collapse whitespace and prefer the first complete sentence"
);
assert.equal(
  domain.summarizeLivePromptCardBody("あ".repeat(90)),
  `${"あ".repeat(47)}…`,
  "signboard summaries remain within 48 characters for long CJK prompts"
);
const cjkPhrases = domain.splitLivePromptTextPhrases(
  "最初に来てくれたみんなへ感謝を伝える。今日の見どころを案内する。参加方法を分けて説明する。どこから配信を知ったか聞いてみる。"
);
assert.ok(cjkPhrases.some((phrase) => phrase.includes("感謝を伝える")), "CJK phrase groups keep a particle with its predicate");
assert.ok(cjkPhrases.some((phrase) => phrase.includes("今日の見どころ")), "CJK phrase groups keep genitive noun phrases together");
assert.ok(cjkPhrases.some((phrase) => phrase.includes("参加方法")), "CJK phrase groups keep adjacent kanji compounds together");
assert.ok(cjkPhrases.some((phrase) => phrase.includes("案内する")), "CJK phrase groups keep inflected verbs together");
assert.ok(cjkPhrases.some((phrase) => phrase.includes("分けて説明する")), "CJK phrase groups keep connective verb phrases together");
assert.ok(cjkPhrases.some((phrase) => phrase.includes("知ったか聞いてみる")), "CJK phrase groups keep inflected question phrases together");

const firstTalkingPointSelection = domain.selectLiveModeCard(grouped, cardA.id);
assert.deepEqual(
  firstTalkingPointSelection,
  { cardId: cardA.id, category: "talking-point", index: 0 },
  "selecting a signboard records UI-only category-local position"
);
const firstTalkingPoint = resolve(
  data([plan({ promptCards: [cardE, cardC, cardA, cardD, cardB] })]),
  firstTalkingPointSelection
);
assert.equal(firstTalkingPoint.kind, "ready");
assert.equal(firstTalkingPoint.currentCard.id, cardA.id);
assert.equal(firstTalkingPoint.total, 3, "detail position total is category-local");
assert.equal(firstTalkingPoint.canPrevious, false);
assert.equal(firstTalkingPoint.canNext, true);
assert.deepEqual(
  domain.moveLiveModeSelection(firstTalkingPoint, "next"),
  { cardId: cardD.id, category: "talking-point", index: 1 },
  "next follows addition order inside the selected category"
);
const lastTalkingPoint = resolve(
  data([plan({ promptCards: [cardE, cardC, cardA, cardD, cardB] })]),
  { cardId: cardE.id, category: "talking-point", index: 2 }
);
assert.equal(lastTalkingPoint.canNext, false);
assert.deepEqual(
  domain.moveLiveModeSelection(lastTalkingPoint, "next"),
  { cardId: cardE.id, category: "talking-point", index: 2 },
  "next never crosses from the last card into another category"
);

assert.deepEqual(
  domain.moveLiveModeSelection(initial, "previous"),
  { cardId: cardB.id, category: "question", index: 0 },
  "first previous boundary is a deterministic category-local no-op"
);
assert.deepEqual(
  domain.moveLiveModeSelection(initial, "next"),
  { cardId: cardB.id, category: "question", index: 0 },
  "single-card category next never crosses into another category"
);

const oneCard = resolve(data([plan({ promptCards: [cardA] })]), null);
assert.equal(oneCard.kind, "ready");
assert.equal(oneCard.total, 1);
assert.equal(oneCard.canPrevious, false);
assert.equal(oneCard.canNext, false);
assert.deepEqual(domain.moveLiveModeSelection(oneCard, "previous"), { cardId: cardA.id, category: "talking-point", index: 0 });
assert.deepEqual(domain.moveLiveModeSelection(oneCard, "next"), { cardId: cardA.id, category: "talking-point", index: 0 });

const reordered = resolve(
  data([plan({ promptCards: [{ ...cardA, order: 0 }, { ...cardB, order: 1 }, { ...cardC, order: 2 }] })]),
  firstTalkingPointSelection
);
assert.equal(reordered.kind, "ready");
assert.equal(reordered.currentCard.id, cardA.id, "stable card identity survives reordering");
assert.equal(reordered.currentIndex, 0, "position follows the stable card after reordering");

const deletedMiddle = resolve(
  data([plan({ promptCards: [cardD, cardE, cardB] })]),
  firstTalkingPointSelection
);
assert.equal(deletedMiddle.kind, "ready");
assert.equal(deletedMiddle.currentCard.id, cardD.id, "a deleted selection falls back within its prior category");
const deletedLast = resolve(
  data([plan({ promptCards: [cardB] })]),
  { cardId: cardE.id, category: "talking-point", index: 2 }
);
assert.equal(deletedLast.kind, "ready");
assert.equal(deletedLast.currentCard.id, cardB.id, "an empty prior category falls back to the first remaining category");

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
const boardSource = fs.readFileSync(boardPath, "utf8");
const detailSource = fs.readFileSync(detailPath, "utf8");
const planListSource = fs.readFileSync(planListPath, "utf8");
assert.match(appSource, /LiveModeWorkspace/, "the app renders the real live-mode workspace");
assert.match(appSource, /copy\.app\.tabs\.live/, "tool-local navigation exposes localized live mode only with real behavior");
assert.match(appSource, /min-h-11 whitespace-nowrap border-b-2 border-primary/, "tool-local live navigation remains touch-safe without splitting CJK labels");
assert.match(appSource, /DataManagementWorkspace/, "implemented data management remains a separate real workspace");
assert.match(appSource, /onShowLive=\{showLivePlan\}/, "the current plan title routes directly to live mode");
assert.match(planListSource, /data-open-live-plan=\{plan\.id\}/, "the live plan title is an obvious dedicated control");
assert.match(planListSource, /plan\.status === "live"/, "only the current live plan title exposes direct live navigation");
assert.match(planListSource, /flex-col items-start gap-1[\s\S]*sm:flex-row sm:items-center sm:gap-2/, "the live title and CTA avoid awkward CJK splits on mobile");
assert.match(workspaceSource, /onEditCards\(view\.plan\.id\)/, "empty and ready states return to the selected live plan editor");
assert.match(boardSource, /data-live-mode-layout="signboard"/, "desktop and tablet landscape use the signboard board");
assert.match(boardSource, /hidden min-w-0 gap-4 lg:grid/, "the signboard board begins at 1024 CSS pixels");
assert.doesNotMatch(boardSource, /border-l-4|border-l-primary/, "signboards use the shared card border without a redundant left accent strip");
assert.match(boardSource, /data-live-mode-layout="accordion"/, "mobile and tablet portrait use category accordions");
assert.match(boardSource, /lg:hidden/, "the accordion flow remains below 1024 CSS pixels");
assert.match(boardSource, /aria-expanded=\{expanded\}/, "mobile category accordions expose their state");
assert.match(boardSource, /expanded \? "grid min-w-0 gap-2 border-t border-border p-3" : "hidden"/, "collapsed mobile categories remove their card lists from layout and accessibility flow");
assert.match(boardSource, /summarizeLivePromptCardBody\(card\.body\)/, "signboards and compact lists render concise summaries");
assert.match(boardSource, /LivePromptPhraseText/, "summary cards render semantic CJK phrase groups");
assert.match(boardSource, /copy\.segment\[card\.segment\]/, "every summary card carries a localized stream-segment badge");
assert.match(detailSource, /dialog\.showModal\(\)/, "desktop details use a real modal dialog");
assert.match(detailSource, /onCancel=\{\(event\) =>/, "Escape closes the modal through the native cancel path");
assert.match(detailSource, /event\.target === event\.currentTarget/, "clicking the modal backdrop closes it");
assert.match(detailSource, /aria-modal="true"/, "the desktop detail announces modal semantics");
assert.match(detailSource, /focusCloseOnMount=\{false\}/, "inline detail does not steal focus and scroll beneath the sticky header");
assert.match(detailSource, /scrollIntoView\(\{ block: "start" \}\)/, "inline detail scrolls its heading below the sticky-header-safe scroll margin");
assert.match(detailSource, /scroll-mt-44/, "inline detail clears the full 390px sticky header stack");
assert.match(detailSource, /focusCloseOnMount=\{true\}/, "modal detail receives an explicit initial focus target");
assert.match(detailSource, /aria-live="polite"/, "position and copy changes are announced");
assert.match(detailSource, /disabled=\{!view\.canPrevious\}/, "previous boundary stays visible and disabled");
assert.match(detailSource, /disabled=\{!view\.canNext\}/, "next boundary stays visible and disabled");
assert.match(detailSource, /whitespace-pre-wrap/, "full prompt bodies preserve intentional line breaks");
assert.match(detailSource, /whitespace-pre-wrap break-words text-pretty/, "full CJK prompt bodies avoid orphaned particles at narrow widths");
assert.match(detailSource, /inline-block whitespace-nowrap/, "CJK phrase units stay intact while wrapping between phrases");
assert.match(detailSource, /\[overflow-wrap:anywhere\]/, "long CJK prompt bodies remain inside the viewport");
assert.match(workspaceSource, /resolveLiveModeView\(data, selection, orderPromptCardsForDisplay\)/, "live display reuses prompt-card domain ordering");
assert.match(workspaceSource, /setSelection\(selectLiveModeCard\(view, cardId\)\)/, "signboard selection becomes UI-only category-local state");
assert.doesNotMatch(workspaceSource + boardSource + detailSource, /savePromptBoardData|localStorage|sessionStorage/, "live navigation and clipboard feedback are UI-only");
assert.doesNotMatch(appSource + workspaceSource + boardSource + detailSource, /console\.(?:log|info|warn|error)|clipboardHistory|telemetry|analytics/, "live mode logs or stores no prompt or clipboard metadata");

console.log("viewer engagement prompt board live mode contract passed");
