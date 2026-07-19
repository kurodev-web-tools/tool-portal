import type {
  PromptBoardData,
  PromptCard,
  PromptCardCategory,
  PromptCardSegment,
  PromptCardTone,
  StreamPlan
} from "./viewer-engagement-prompt-board-storage";

export type PromptCardInput = Readonly<{
  body: string;
  category: PromptCardCategory;
  segment: PromptCardSegment;
  tone: PromptCardTone;
  safetyNotes: string;
}>;

export type PromptCardMutationContext = Readonly<{
  now: string;
  createId: () => string;
}>;

type CardLocation = Readonly<{ planId: string; cardId: string }>;
type CreatePromptCardCommand = Readonly<{ planId: string; input: PromptCardInput }>;
type UpdatePromptCardCommand = Readonly<CardLocation & { input: PromptCardInput }>;
type ReorderPromptCardCommand = Readonly<CardLocation & { direction: "up" | "down" }>;
type MovePromptCardCommand = Readonly<{
  sourcePlanId: string;
  cardId: string;
  destinationPlanId: string;
}>;

export type PromptCardMutationFailureReason = "invalid-input" | "not-found";
export type PromptCardMutationResult =
  | { readonly ok: true; readonly data: PromptBoardData }
  | { readonly ok: false; readonly reason: PromptCardMutationFailureReason; readonly data: PromptBoardData };

function success(data: PromptBoardData, streamPlans: readonly StreamPlan[]): PromptCardMutationResult {
  return { ok: true, data: streamPlans === data.streamPlans ? data : { ...data, streamPlans } };
}

function failure(data: PromptBoardData, reason: PromptCardMutationFailureReason): PromptCardMutationResult {
  return { ok: false, reason, data };
}

function isIsoTimestamp(value: string): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function normalizeInput(input: PromptCardInput): PromptCardInput | null {
  const body = input.body.trim();
  if (
    body.length === 0 ||
    !isCategory(input.category) ||
    !isSegment(input.segment) ||
    !isTone(input.tone)
  ) {
    return null;
  }
  return { ...input, body, safetyNotes: input.safetyNotes.trim() };
}

function isCategory(value: PromptCardCategory): boolean {
  return value === "talking-point" || value === "question" || value === "announcement" || value === "reminder" || value === "other";
}

function isSegment(value: PromptCardSegment): boolean {
  return value === "opening" || value === "main" || value === "intermission" || value === "closing" || value === "anytime";
}

function isTone(value: PromptCardTone): boolean {
  return value === "neutral" || value === "casual" || value === "energetic" || value === "calm" || value === "serious";
}

export function orderPromptCardsForDisplay(cards: readonly PromptCard[]): readonly PromptCard[] {
  return [...cards].sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
}

function normalizeCards(cards: readonly PromptCard[]): readonly PromptCard[] {
  return orderPromptCardsForDisplay(cards)
    .map((card, order) => card.order === order ? card : { ...card, order });
}

function hasNormalizedOrder(cards: readonly PromptCard[]): boolean {
  return cards.every((card, index) => card.order === index);
}

function replacePlan(data: PromptBoardData, planId: string, promptCards: readonly PromptCard[], now: string): PromptCardMutationResult {
  return success(
    data,
    data.streamPlans.map((plan) => plan.id === planId ? { ...plan, promptCards, updatedAt: now } : plan)
  );
}

function findPlan(data: PromptBoardData, planId: string): StreamPlan | null {
  return data.streamPlans.find((plan) => plan.id === planId) ?? null;
}

function hasCard(data: PromptBoardData, cardId: string): boolean {
  return data.streamPlans.some((plan) => plan.promptCards.some((card) => card.id === cardId));
}

function isValidContext(context: PromptCardMutationContext): boolean {
  return isIsoTimestamp(context.now);
}

export function createPromptCard(
  data: PromptBoardData,
  command: CreatePromptCardCommand,
  context: PromptCardMutationContext
): PromptCardMutationResult {
  const plan = findPlan(data, command.planId);
  if (plan === null) {
    return failure(data, "not-found");
  }
  const input = normalizeInput(command.input);
  if (input === null || !isValidContext(context)) {
    return failure(data, "invalid-input");
  }
  const id = context.createId();
  if (hasCard(data, id)) {
    return failure(data, "invalid-input");
  }
  const normalized = normalizeCards(plan.promptCards);
  return replacePlan(data, plan.id, [...normalized, { id, ...input, order: normalized.length }], context.now);
}

export function updatePromptCard(
  data: PromptBoardData,
  command: UpdatePromptCardCommand,
  context: PromptCardMutationContext
): PromptCardMutationResult {
  const plan = findPlan(data, command.planId);
  if (plan === null || !plan.promptCards.some((card) => card.id === command.cardId)) {
    return failure(data, "not-found");
  }
  const input = normalizeInput(command.input);
  if (input === null || !isValidContext(context)) {
    return failure(data, "invalid-input");
  }
  const promptCards = normalizeCards(plan.promptCards).map((card) =>
    card.id === command.cardId ? { ...card, ...input } : card
  );
  return replacePlan(data, plan.id, promptCards, context.now);
}

export function deletePromptCard(
  data: PromptBoardData,
  command: CardLocation,
  context: PromptCardMutationContext
): PromptCardMutationResult {
  const plan = findPlan(data, command.planId);
  if (plan === null || !plan.promptCards.some((card) => card.id === command.cardId)) {
    return failure(data, "not-found");
  }
  if (!isValidContext(context)) {
    return failure(data, "invalid-input");
  }
  return replacePlan(
    data,
    plan.id,
    normalizeCards(plan.promptCards.filter((card) => card.id !== command.cardId)),
    context.now
  );
}

export function reorderPromptCard(
  data: PromptBoardData,
  command: ReorderPromptCardCommand,
  context: PromptCardMutationContext
): PromptCardMutationResult {
  const plan = findPlan(data, command.planId);
  if (plan === null) {
    return failure(data, "not-found");
  }
  if (!isValidContext(context)) {
    return failure(data, "invalid-input");
  }
  const normalized = normalizeCards(plan.promptCards);
  const currentIndex = normalized.findIndex((card) => card.id === command.cardId);
  if (currentIndex < 0) {
    return failure(data, "not-found");
  }
  const nextIndex = command.direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (nextIndex < 0 || nextIndex >= normalized.length) {
    return hasNormalizedOrder(plan.promptCards) ? success(data, data.streamPlans) : replacePlan(data, plan.id, normalized, context.now);
  }
  const neighbor = normalized[nextIndex];
  if (neighbor === undefined) {
    return success(data, data.streamPlans);
  }
  const reordered = [...normalized];
  reordered[currentIndex] = neighbor;
  reordered[nextIndex] = normalized[currentIndex];
  return replacePlan(data, plan.id, reordered.map((card, order) => ({ ...card, order })), context.now);
}

export function movePromptCard(
  data: PromptBoardData,
  command: MovePromptCardCommand,
  context: PromptCardMutationContext
): PromptCardMutationResult {
  const source = findPlan(data, command.sourcePlanId);
  const destination = findPlan(data, command.destinationPlanId);
  const card = source?.promptCards.find((candidate) => candidate.id === command.cardId);
  if (source === null || destination === null || card === undefined) {
    return failure(data, "not-found");
  }
  if (!isValidContext(context)) {
    return failure(data, "invalid-input");
  }
  if (source.id === destination.id) {
    return hasNormalizedOrder(source.promptCards)
      ? success(data, data.streamPlans)
      : replacePlan(data, source.id, normalizeCards(source.promptCards), context.now);
  }
  const sourceCards = normalizeCards(source.promptCards.filter((candidate) => candidate.id !== card.id));
  const destinationCards = normalizeCards([
    ...normalizeCards(destination.promptCards),
    { ...card, order: destination.promptCards.length }
  ]);
  return success(
    data,
    data.streamPlans.map((plan) => {
      if (plan.id === source.id) {
        return { ...plan, promptCards: sourceCards, updatedAt: context.now };
      }
      if (plan.id === destination.id) {
        return { ...plan, promptCards: destinationCards, updatedAt: context.now };
      }
      return plan;
    })
  );
}

export function resolvePromptCardPlanId(data: PromptBoardData, requestedPlanId: string | null): string | null {
  if (requestedPlanId !== null && data.streamPlans.some((plan) => plan.id === requestedPlanId)) {
    return requestedPlanId;
  }
  const statusOrder: Readonly<Record<StreamPlan["status"], number>> = { live: 0, preparing: 1, idea: 2, completed: 3 };
  const plans = [...data.streamPlans].sort((left, right) => {
    const statusDifference = statusOrder[left.status] - statusOrder[right.status];
    if (statusDifference !== 0) {
      return statusDifference;
    }
    if (left.status === "preparing" && right.status === "preparing" && left.scheduledAt !== right.scheduledAt) {
      if (left.scheduledAt === null) return 1;
      if (right.scheduledAt === null) return -1;
      return left.scheduledAt.localeCompare(right.scheduledAt);
    }
    return left.manualOrder - right.manualOrder || left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id);
  });
  return plans[0]?.id ?? null;
}
