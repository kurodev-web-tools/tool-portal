import type {
  PromptBoardData,
  PromptCard,
  PromptCardCategory,
  StreamPlan
} from "./viewer-engagement-prompt-board-storage";

export type LiveModeSelection = Readonly<{
  cardId: string;
  category: PromptCardCategory;
  index: number;
}> | null;

export type LiveModeCategoryGroup = Readonly<{
  category: PromptCardCategory;
  cards: readonly PromptCard[];
}>;

export type LiveModeView =
  | { readonly kind: "no-live" }
  | { readonly kind: "empty"; readonly plan: StreamPlan }
  | {
      readonly kind: "ready";
      readonly plan: StreamPlan;
      readonly cards: readonly PromptCard[];
      readonly groups: readonly LiveModeCategoryGroup[];
      readonly currentCard: PromptCard;
      readonly currentIndex: number;
      readonly total: number;
      readonly canPrevious: boolean;
      readonly canNext: boolean;
    };

type ClipboardPort = Readonly<{ writeText: (value: string) => Promise<void> }>;
type OrderPromptCards = (cards: readonly PromptCard[]) => readonly PromptCard[];
const livePromptSummaryLength = 48;
const livePromptPhraseLength = 10;
const livePromptParticlePhraseLength = 8;
const livePromptWordSegmenter = new Intl.Segmenter("ja", { granularity: "word" });
const livePromptParticles = new Set(["の", "を", "へ", "に", "で", "と", "が", "は", "も", "て", "から", "まで", "より"]);
const livePromptPunctuationPattern = /^[。、！？,.!?]+$/;
const livePromptHanPattern = /^[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+$/;
const livePromptContainsHanPattern = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const livePromptHiraganaPattern = /^[\u3040-\u309f]+$/;
const livePromptCategoryOrder = [
  "talking-point",
  "question",
  "announcement",
  "reminder",
  "other"
] as const satisfies readonly PromptCardCategory[];

export type LiveModeCopyResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: "clipboard-unavailable" | "write-failed" };

export function groupLivePromptCards(cards: readonly PromptCard[]): readonly LiveModeCategoryGroup[] {
  return livePromptCategoryOrder.flatMap((category) => {
    const categoryCards = cards.filter((card) => card.category === category);
    return categoryCards.length === 0 ? [] : [{ category, cards: categoryCards }];
  });
}

export function summarizeLivePromptCardBody(body: string): string {
  const normalized = body.trim().replace(/\s+/g, " ");
  const firstSentenceEnd = normalized.search(/[。！？]/);
  const summary = firstSentenceEnd >= 0
    ? normalized.slice(0, firstSentenceEnd + 1)
    : normalized;
  return summary.length <= livePromptSummaryLength
    ? summary
    : `${summary.slice(0, livePromptSummaryLength - 1)}…`;
}

export function splitLivePromptTextPhrases(text: string): readonly string[] {
  const wordSegments = Array.from(livePromptWordSegmenter.segment(text), ({ segment }) => segment);
  const compoundSegments: string[] = [];
  for (const segment of wordSegments) {
    const previous = compoundSegments.at(-1);
    const joinsKanjiCompound = previous !== undefined && livePromptHanPattern.test(previous) && livePromptHanPattern.test(segment);
    const joinsInflection = previous !== undefined &&
      livePromptContainsHanPattern.test(previous) &&
      livePromptHiraganaPattern.test(segment) &&
      !livePromptParticles.has(segment);
    if (joinsKanjiCompound || joinsInflection) {
      compoundSegments[compoundSegments.length - 1] = previous + segment;
    } else {
      compoundSegments.push(segment);
    }
  }

  const phraseUnits: string[] = [];
  for (let index = 0; index < compoundSegments.length; index += 1) {
    const segment = compoundSegments[index] ?? "";
    const next = compoundSegments[index + 1];
    if (livePromptParticles.has(segment) && phraseUnits.length > 0) {
      const previous = phraseUnits.at(-1) ?? "";
      if (
        next !== undefined &&
        !/^\s+$/.test(next) &&
        !livePromptPunctuationPattern.test(next) &&
        previous.length + segment.length + next.length <= (segment === "て" ? livePromptPhraseLength + 2 : livePromptParticlePhraseLength)
      ) {
        phraseUnits[phraseUnits.length - 1] = previous + segment + next;
        index += 1;
      } else {
        phraseUnits[phraseUnits.length - 1] = previous + segment;
      }
    } else {
      phraseUnits.push(segment);
    }
  }

  const phrases: string[] = [];
  let phrase = "";
  const flushPhrase = () => {
    if (phrase.length > 0) {
      phrases.push(phrase);
      phrase = "";
    }
  };
  for (const unit of phraseUnits) {
    if (/^\s+$/.test(unit)) {
      flushPhrase();
      phrases.push(unit);
      continue;
    }
    if (phrase.length > 0 && phrase.length + unit.length > livePromptPhraseLength) {
      flushPhrase();
    }
    phrase += unit;
    if (livePromptPunctuationPattern.test(unit)) {
      flushPhrase();
    }
  }
  flushPhrase();
  return phrases;
}

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
  const groups = groupLivePromptCards(cards);
  const selectedGroup = selection === null
    ? groups.find((group) => group.category === cards[0]?.category)
    : groups.find((group) => group.category === selection.category);
  const fallbackGroup = selectedGroup ?? groups[0];
  if (fallbackGroup === undefined) {
    return { kind: "empty", plan };
  }
  const stableIndex = selection === null
    ? -1
    : fallbackGroup.cards.findIndex((card) => card.id === selection.cardId);
  const currentIndex = stableIndex >= 0
    ? stableIndex
    : selection === null || selectedGroup === undefined
      ? 0
      : Math.min(selection.index, fallbackGroup.cards.length - 1);
  const currentCard = fallbackGroup.cards[currentIndex];
  if (currentCard === undefined) {
    return { kind: "empty", plan };
  }
  return {
    kind: "ready",
    plan,
    cards,
    groups,
    currentCard,
    currentIndex,
    total: fallbackGroup.cards.length,
    canPrevious: currentIndex > 0,
    canNext: currentIndex < fallbackGroup.cards.length - 1
  };
}

export function selectLiveModeCard(
  view: Extract<LiveModeView, { readonly kind: "ready" }>,
  cardId: string
): Exclude<LiveModeSelection, null> {
  for (const group of view.groups) {
    const index = group.cards.findIndex((card) => card.id === cardId);
    if (index >= 0) {
      return { cardId, category: group.category, index };
    }
  }
  return {
    cardId: view.currentCard.id,
    category: view.currentCard.category,
    index: view.currentIndex
  };
}

export function moveLiveModeSelection(
  view: Extract<LiveModeView, { readonly kind: "ready" }>,
  direction: "previous" | "next"
): Exclude<LiveModeSelection, null> {
  const offset = direction === "previous" ? -1 : 1;
  const index = Math.max(0, Math.min(view.currentIndex + offset, view.total - 1));
  const categoryCards = view.groups.find((group) => group.category === view.currentCard.category)?.cards ?? [];
  const card = categoryCards[index] ?? view.currentCard;
  return { cardId: card.id, category: card.category, index };
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
