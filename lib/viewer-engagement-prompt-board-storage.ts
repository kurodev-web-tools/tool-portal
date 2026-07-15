export const promptBoardSchemaVersion = 1;
export const promptBoardStorageKey = "v-streamer-tools-viewer-engagement-prompt-board";

export const streamPlanStatuses = ["idea", "preparing", "live", "completed"] as const;
export const promptCardCategories = ["talking-point", "question", "announcement", "reminder", "other"] as const;
export const promptCardSegments = ["opening", "main", "intermission", "closing", "anytime"] as const;
export const promptCardTones = ["neutral", "casual", "energetic", "calm", "serious"] as const;

export type StreamPlanStatus = (typeof streamPlanStatuses)[number];
export type PromptCardCategory = (typeof promptCardCategories)[number];
export type PromptCardSegment = (typeof promptCardSegments)[number];
export type PromptCardTone = (typeof promptCardTones)[number];

export type PromptCard = Readonly<{
  id: string;
  body: string;
  category: PromptCardCategory;
  segment: PromptCardSegment;
  tone: PromptCardTone;
  safetyNotes: string;
  order: number;
}>;

export type StreamPlan = Readonly<{
  id: string;
  title: string;
  scheduledAt: string | null;
  status: StreamPlanStatus;
  manualOrder: number;
  notes: string;
  promptCards: readonly PromptCard[];
  createdAt: string;
  updatedAt: string;
}>;

export type PromptBoardData = Readonly<{
  schemaVersion: typeof promptBoardSchemaVersion;
  streamPlans: readonly StreamPlan[];
}>;

export type PromptBoardParseFailureReason = "malformed-json" | "unsupported-schema" | "invalid-data";
export type PromptBoardParseResult =
  | { readonly ok: true; readonly data: PromptBoardData }
  | { readonly ok: false; readonly reason: PromptBoardParseFailureReason };

export type PromptBoardStorageFailureReason = PromptBoardParseFailureReason | "corrupt-data" | "storage-unavailable" | "write-failed";

export type PromptBoardLoadResult =
  | { readonly kind: "loaded" | "empty"; readonly data: PromptBoardData }
  | { readonly kind: "failure"; readonly reason: PromptBoardStorageFailureReason; readonly data: PromptBoardData };

export type PromptBoardMutationResult =
  | { readonly kind: "saved" | "imported"; readonly data: PromptBoardData }
  | { readonly kind: "failure"; readonly reason: PromptBoardStorageFailureReason; readonly data: PromptBoardData };

export type PromptBoardExportResult = { readonly ok: true; readonly json: string } | { readonly ok: false; readonly reason: "invalid-data" };

export type PromptBoardStorage = Pick<Storage, "getItem" | "setItem">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expectedKeys: readonly string[]): boolean {
  const actualKeys = Object.keys(value);
  return actualKeys.length === expectedKeys.length && actualKeys.every((key) => expectedKeys.includes(key));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStableLocalId(value: unknown, prefix: "plan" | "card"): value is string {
  return typeof value === "string" && value.startsWith(`${prefix}-`) && value.length >= prefix.length + 10 && value.length <= 128;
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function isOrder(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isAllowedValue<T extends string>(value: unknown, allowedValues: readonly T[]): value is T {
  return typeof value === "string" && allowedValues.some((allowedValue) => allowedValue === value);
}

function parsePromptCard(value: unknown): PromptCard | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["id", "body", "category", "segment", "tone", "safetyNotes", "order"]) ||
    !isStableLocalId(value.id, "card") ||
    !isNonEmptyString(value.body) ||
    !isAllowedValue(value.category, promptCardCategories) ||
    !isAllowedValue(value.segment, promptCardSegments) ||
    !isAllowedValue(value.tone, promptCardTones) ||
    typeof value.safetyNotes !== "string" ||
    !isOrder(value.order)
  ) {
    return null;
  }

  return {
    id: value.id,
    body: value.body,
    category: value.category,
    segment: value.segment,
    tone: value.tone,
    safetyNotes: value.safetyNotes,
    order: value.order
  };
}

function parseStreamPlan(value: unknown): StreamPlan | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "id",
      "title",
      "scheduledAt",
      "status",
      "manualOrder",
      "notes",
      "promptCards",
      "createdAt",
      "updatedAt"
    ]) ||
    !isStableLocalId(value.id, "plan") ||
    !isNonEmptyString(value.title) ||
    !(value.scheduledAt === null || isIsoTimestamp(value.scheduledAt)) ||
    !isAllowedValue(value.status, streamPlanStatuses) ||
    !isOrder(value.manualOrder) ||
    typeof value.notes !== "string" ||
    !Array.isArray(value.promptCards) ||
    !isIsoTimestamp(value.createdAt) ||
    !isIsoTimestamp(value.updatedAt) ||
    value.createdAt > value.updatedAt
  ) {
    return null;
  }

  const promptCards = value.promptCards.map(parsePromptCard);
  if (!promptCards.every((card): card is PromptCard => card !== null)) {
    return null;
  }
  const cardIds = new Set(promptCards.map((card) => card.id));
  if (cardIds.size !== promptCards.length) {
    return null;
  }

  return {
    id: value.id,
    title: value.title,
    scheduledAt: value.scheduledAt,
    status: value.status,
    manualOrder: value.manualOrder,
    notes: value.notes,
    promptCards,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt
  };
}

export function createEmptyPromptBoardData(): PromptBoardData {
  return { schemaVersion: promptBoardSchemaVersion, streamPlans: [] };
}

export function parsePromptBoardValue(value: unknown): PromptBoardParseResult {
  if (isRecord(value) && "schemaVersion" in value && value.schemaVersion !== promptBoardSchemaVersion) {
    return { ok: false, reason: "unsupported-schema" };
  }
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["schemaVersion", "streamPlans"]) ||
    value.schemaVersion !== promptBoardSchemaVersion ||
    !Array.isArray(value.streamPlans)
  ) {
    return { ok: false, reason: "invalid-data" };
  }

  const streamPlans = value.streamPlans.map(parseStreamPlan);
  if (!streamPlans.every((plan): plan is StreamPlan => plan !== null)) {
    return { ok: false, reason: "invalid-data" };
  }
  const planIds = new Set(streamPlans.map((plan) => plan.id));
  const cardIds = streamPlans.flatMap((plan) => plan.promptCards.map((card) => card.id));
  const livePlanCount = streamPlans.filter((plan) => plan.status === "live").length;
  if (planIds.size !== streamPlans.length || new Set(cardIds).size !== cardIds.length || livePlanCount > 1) {
    return { ok: false, reason: "invalid-data" };
  }

  return { ok: true, data: { schemaVersion: promptBoardSchemaVersion, streamPlans } };
}

export function parsePromptBoardJson(raw: string): PromptBoardParseResult {
  try {
    const value: unknown = JSON.parse(raw);
    return parsePromptBoardValue(value);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { ok: false, reason: "malformed-json" };
    }
    throw error;
  }
}

function getBrowserPromptBoardStorage(): PromptBoardStorage | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadPromptBoardData(currentData: PromptBoardData, storage: PromptBoardStorage | null = getBrowserPromptBoardStorage()): PromptBoardLoadResult {
  if (storage === null) {
    return { kind: "failure", reason: "storage-unavailable", data: currentData };
  }
  let raw: string | null;
  try {
    raw = storage.getItem(promptBoardStorageKey);
  } catch {
    return { kind: "failure", reason: "storage-unavailable", data: currentData };
  }
  if (raw === null) {
    return { kind: "empty", data: currentData };
  }
  const parsed = parsePromptBoardJson(raw);
  if (!parsed.ok) {
    return {
      kind: "failure",
      reason: parsed.reason === "unsupported-schema" ? "unsupported-schema" : "corrupt-data",
      data: currentData
    };
  }
  return { kind: "loaded", data: parsed.data };
}

export function savePromptBoardData(candidateData: PromptBoardData, currentData: PromptBoardData, storage: PromptBoardStorage | null = getBrowserPromptBoardStorage()): PromptBoardMutationResult {
  const parsed = parsePromptBoardValue(candidateData);
  if (!parsed.ok) {
    return { kind: "failure", reason: "invalid-data", data: currentData };
  }
  if (storage === null) {
    return { kind: "failure", reason: "storage-unavailable", data: currentData };
  }
  try {
    storage.setItem(promptBoardStorageKey, JSON.stringify(parsed.data));
  } catch {
    return { kind: "failure", reason: "write-failed", data: currentData };
  }
  return { kind: "saved", data: parsed.data };
}

export function importPromptBoardJson(raw: string, currentData: PromptBoardData, storage: PromptBoardStorage | null = getBrowserPromptBoardStorage()): PromptBoardMutationResult {
  const parsed = parsePromptBoardJson(raw);
  if (!parsed.ok) {
    return { kind: "failure", reason: parsed.reason, data: currentData };
  }
  const saved = savePromptBoardData(parsed.data, currentData, storage);
  return saved.kind === "saved" ? { kind: "imported", data: saved.data } : saved;
}

export function exportPromptBoardJson(data: PromptBoardData): PromptBoardExportResult {
  const parsed = parsePromptBoardValue(data);
  return parsed.ok
    ? { ok: true, json: JSON.stringify(parsed.data, null, 2) }
    : { ok: false, reason: "invalid-data" };
}
