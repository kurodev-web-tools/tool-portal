import type { PromptBoardData, PromptCard, StreamPlan } from "./viewer-engagement-prompt-board-storage";

export type LiveModeSelection = Readonly<{ cardId: string; index: number }> | null;

export type LiveModeView =
  | { readonly kind: "no-live" }
  | { readonly kind: "empty"; readonly plan: StreamPlan }
  | {
      readonly kind: "ready";
      readonly plan: StreamPlan;
      readonly cards: readonly PromptCard[];
      readonly currentCard: PromptCard;
      readonly currentIndex: number;
      readonly total: number;
      readonly canPrevious: boolean;
      readonly canNext: boolean;
    };

type ClipboardPort = Readonly<{ writeText: (value: string) => Promise<void> }>;
type OrderPromptCards = (cards: readonly PromptCard[]) => readonly PromptCard[];

export type LiveModeCopyResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: "clipboard-unavailable" | "write-failed" };

export function resolveLiveModeView(
  data: PromptBoardData,
  selection: LiveModeSelection,
  orderPromptCards: OrderPromptCards
): LiveModeView {
  const plan = data.streamPlans.find((candidate) => candidate.status === "live");
  if (plan === undefined) {
    return { kind: "no-live" };
  }
  const cards = orderPromptCards(plan.promptCards);
  if (cards.length === 0) {
    return { kind: "empty", plan };
  }
  const stableIndex = selection === null ? -1 : cards.findIndex((card) => card.id === selection.cardId);
  const currentIndex = stableIndex >= 0
    ? stableIndex
    : selection === null ? 0 : Math.min(selection.index, cards.length - 1);
  const currentCard = cards[currentIndex];
  if (currentCard === undefined) {
    return { kind: "empty", plan };
  }
  return {
    kind: "ready",
    plan,
    cards,
    currentCard,
    currentIndex,
    total: cards.length,
    canPrevious: currentIndex > 0,
    canNext: currentIndex < cards.length - 1
  };
}

export function moveLiveModeSelection(
  view: Extract<LiveModeView, { readonly kind: "ready" }>,
  direction: "previous" | "next"
): Exclude<LiveModeSelection, null> {
  const offset = direction === "previous" ? -1 : 1;
  const index = Math.max(0, Math.min(view.currentIndex + offset, view.total - 1));
  const card = view.cards[index] ?? view.currentCard;
  return { cardId: card.id, index };
}

export async function copyLivePromptCardBody(
  body: string,
  clipboard: ClipboardPort | null
): Promise<LiveModeCopyResult> {
  if (clipboard === null) {
    return { ok: false, reason: "clipboard-unavailable" };
  }
  try {
    await clipboard.writeText(body);
    return { ok: true };
  } catch {
    return { ok: false, reason: "write-failed" };
  }
}
