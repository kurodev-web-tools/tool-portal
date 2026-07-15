import type {
  PromptBoardData,
  PromptCard,
  StreamPlan,
  StreamPlanStatus
} from "./viewer-engagement-prompt-board-storage";

export type StreamPlanMetadataInput = Readonly<{
  title: string;
  scheduledAt: string | null;
  notes: string;
  status: StreamPlanStatus;
  manualOrder: number;
}>;

export type StreamPlanMutationContext = Readonly<{
  now: string;
  createId: (kind: "plan" | "card") => string;
}>;

export type StreamPlanMutationFailureReason = "invalid-input" | "not-found" | "invalid-transition";
export type StreamPlanMutationResult =
  | { readonly ok: true; readonly data: PromptBoardData }
  | { readonly ok: false; readonly reason: StreamPlanMutationFailureReason; readonly data: PromptBoardData };

export type StreamPlanGroups = Readonly<{
  current: readonly StreamPlan[];
  upcoming: readonly StreamPlan[];
  ideas: readonly StreamPlan[];
  completed: readonly StreamPlan[];
}>;

function success(data: PromptBoardData, streamPlans: readonly StreamPlan[]): StreamPlanMutationResult {
  return { ok: true, data: { schemaVersion: data.schemaVersion, streamPlans } };
}

function failure(data: PromptBoardData, reason: StreamPlanMutationFailureReason): StreamPlanMutationResult {
  return { ok: false, reason, data };
}

function isIsoTimestamp(value: string): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function normalizeMetadata(input: StreamPlanMetadataInput): StreamPlanMetadataInput | null {
  const title = input.title.trim();
  if (
    title.length === 0 ||
    !(input.scheduledAt === null || isIsoTimestamp(input.scheduledAt)) ||
    !Number.isSafeInteger(input.manualOrder) ||
    input.manualOrder < 0
  ) {
    return null;
  }
  return { ...input, title };
}

function compareManualOrder(left: StreamPlan, right: StreamPlan): number {
  return left.manualOrder - right.manualOrder || left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id);
}

function compareUpcoming(left: StreamPlan, right: StreamPlan): number {
  if (left.scheduledAt !== null && right.scheduledAt !== null) {
    return left.scheduledAt.localeCompare(right.scheduledAt) || compareManualOrder(left, right);
  }
  if (left.scheduledAt !== null) {
    return -1;
  }
  if (right.scheduledAt !== null) {
    return 1;
  }
  return compareManualOrder(left, right);
}

export function isSameManualOrderBucket(left: StreamPlan, right: StreamPlan): boolean {
  return left.status === right.status && (left.status !== "preparing" || left.scheduledAt === right.scheduledAt);
}

function sortStatusPlans(plans: readonly StreamPlan[], status: StreamPlanStatus): readonly StreamPlan[] {
  return [...plans].sort(status === "preparing" ? compareUpcoming : compareManualOrder);
}

function nextManualOrder(plans: readonly StreamPlan[], status: StreamPlanStatus): number {
  const orders = plans.filter((plan) => plan.status === status).map((plan) => plan.manualOrder);
  return orders.length === 0 ? 0 : Math.max(...orders) + 1;
}

export function groupStreamPlans(plans: readonly StreamPlan[]): StreamPlanGroups {
  return {
    current: sortStatusPlans(plans.filter((plan) => plan.status === "live"), "live"),
    upcoming: sortStatusPlans(plans.filter((plan) => plan.status === "preparing"), "preparing"),
    ideas: sortStatusPlans(plans.filter((plan) => plan.status === "idea"), "idea"),
    completed: sortStatusPlans(plans.filter((plan) => plan.status === "completed"), "completed")
  };
}

export function createStreamPlan(
  data: PromptBoardData,
  input: StreamPlanMetadataInput,
  context: StreamPlanMutationContext
): StreamPlanMutationResult {
  const metadata = normalizeMetadata(input);
  if (metadata === null) {
    return failure(data, "invalid-input");
  }
  const plan: StreamPlan = {
    id: context.createId("plan"),
    ...metadata,
    promptCards: [],
    createdAt: context.now,
    updatedAt: context.now
  };
  const withPlan = { ...data, streamPlans: [...data.streamPlans, plan] };
  return metadata.status === "live" ? switchCurrentStreamPlan(withPlan, plan.id, context) : success(data, withPlan.streamPlans);
}

export function updateStreamPlanMetadata(
  data: PromptBoardData,
  planId: string,
  input: StreamPlanMetadataInput,
  context: StreamPlanMutationContext
): StreamPlanMutationResult {
  const metadata = normalizeMetadata(input);
  if (metadata === null) {
    return failure(data, "invalid-input");
  }
  if (!data.streamPlans.some((plan) => plan.id === planId)) {
    return failure(data, "not-found");
  }
  const updatedPlans = data.streamPlans.map((plan) =>
    plan.id === planId ? { ...plan, ...metadata, updatedAt: context.now } : plan
  );
  const updatedData = { ...data, streamPlans: updatedPlans };
  return metadata.status === "live" ? switchCurrentStreamPlan(updatedData, planId, context) : success(data, updatedPlans);
}

export function switchCurrentStreamPlan(
  data: PromptBoardData,
  planId: string,
  context: StreamPlanMutationContext
): StreamPlanMutationResult {
  const target = data.streamPlans.find((plan) => plan.id === planId);
  if (target === undefined) {
    return failure(data, "not-found");
  }
  const streamPlans = data.streamPlans.map((plan) => {
    if (plan.id === planId) {
      return { ...plan, status: "live" as const, updatedAt: context.now };
    }
    return plan.status === "live" ? { ...plan, status: "preparing" as const, updatedAt: context.now } : plan;
  });
  return success(data, streamPlans);
}

export function completeStreamPlan(
  data: PromptBoardData,
  planId: string,
  context: StreamPlanMutationContext
): StreamPlanMutationResult {
  if (!data.streamPlans.some((plan) => plan.id === planId)) {
    return failure(data, "not-found");
  }
  return success(
    data,
    data.streamPlans.map((plan) =>
      plan.id === planId ? { ...plan, status: "completed" as const, updatedAt: context.now } : plan
    )
  );
}

export function moveIdeaToPreparing(
  data: PromptBoardData,
  planId: string,
  context: StreamPlanMutationContext
): StreamPlanMutationResult {
  const target = data.streamPlans.find((plan) => plan.id === planId);
  if (target === undefined) {
    return failure(data, "not-found");
  }
  if (target.status !== "idea") {
    return failure(data, "invalid-transition");
  }
  return success(
    data,
    data.streamPlans.map((plan) =>
      plan.id === planId ? { ...plan, status: "preparing" as const, updatedAt: context.now } : plan
    )
  );
}

function duplicateCards(cards: readonly PromptCard[], context: StreamPlanMutationContext): readonly PromptCard[] {
  return cards.map((card) => ({ ...card, id: context.createId("card") }));
}

export function duplicateStreamPlan(
  data: PromptBoardData,
  planId: string,
  context: StreamPlanMutationContext
): StreamPlanMutationResult {
  const source = data.streamPlans.find((plan) => plan.id === planId);
  if (source === undefined) {
    return failure(data, "not-found");
  }
  const status = source.status === "live" || source.status === "completed"
    ? source.scheduledAt === null ? "idea" : "preparing"
    : source.status;
  const duplicate: StreamPlan = {
    ...source,
    id: context.createId("plan"),
    title: `${source.title} のコピー`,
    status,
    manualOrder: nextManualOrder(data.streamPlans, status),
    promptCards: duplicateCards(source.promptCards, context),
    createdAt: context.now,
    updatedAt: context.now
  };
  return success(data, [...data.streamPlans, duplicate]);
}

export function reorderStreamPlan(
  data: PromptBoardData,
  planId: string,
  direction: "up" | "down",
  context: StreamPlanMutationContext
): StreamPlanMutationResult {
  const target = data.streamPlans.find((plan) => plan.id === planId);
  if (target === undefined) {
    return failure(data, "not-found");
  }
  const statusPlans = sortStatusPlans(data.streamPlans.filter((plan) => plan.status === target.status), target.status);
  const currentIndex = statusPlans.findIndex((plan) => plan.id === planId);
  const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (nextIndex < 0 || nextIndex >= statusPlans.length) {
    return success(data, data.streamPlans);
  }
  const reordered = [...statusPlans];
  const neighbor = reordered[nextIndex];
  if (neighbor === undefined) {
    return success(data, data.streamPlans);
  }
  if (!isSameManualOrderBucket(target, neighbor)) {
    return failure(data, "invalid-transition");
  }
  reordered[currentIndex] = neighbor;
  reordered[nextIndex] = target;
  const orderById = new Map(reordered.map((plan, index) => [plan.id, index]));
  return success(
    data,
    data.streamPlans.map((plan) => {
      const manualOrder = orderById.get(plan.id);
      return manualOrder === undefined || manualOrder === plan.manualOrder
        ? plan
        : { ...plan, manualOrder, updatedAt: context.now };
    })
  );
}

export function deleteStreamPlan(data: PromptBoardData, planId: string): StreamPlanMutationResult {
  if (!data.streamPlans.some((plan) => plan.id === planId)) {
    return failure(data, "not-found");
  }
  return success(data, data.streamPlans.filter((plan) => plan.id !== planId));
}
