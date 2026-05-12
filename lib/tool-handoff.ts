export type ToolHandoffTarget = "thumbnail-editor" | "sns-split-image-maker";

export type ScheduleHandoffPayload = {
  version: 1;
  source: "schedule-calendar";
  target: ToolHandoffTarget;
  createdAt: string;
  expiresAt: string;
  eventId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  category: string;
  categoryLabel: string;
  platform: string;
  announcementText: string;
  hashtags: string;
  announcementStatus: string;
  announcementStatusLabel: string;
};

export type ThumbnailToSnsHandoffPayload = {
  version: 1;
  source: "thumbnail-editor";
  target: "sns-split-image-maker";
  createdAt: string;
  expiresAt: string;
  imageStorageId: string;
  title: string;
  date: string;
  categoryLabel: string;
  platform: string;
  announcementText: string;
  hashtags: string;
  fileNameBase: string;
};

export type SnsSplitToolHandoffPayload = ScheduleHandoffPayload | ThumbnailToSnsHandoffPayload;
export type ToolHandoffPayload = ScheduleHandoffPayload | ThumbnailToSnsHandoffPayload;

export const toolHandoffQueryParam = "handoff";
const toolHandoffStoragePrefix = "v-streamer-tools:tool-handoff:v1:";
const handoffTtlMs = 30 * 60 * 1000;

const maxTextLengths = {
  eventId: 160,
  title: 160,
  date: 24,
  time: 8,
  category: 64,
  categoryLabel: 64,
  platform: 64,
  announcementText: 4000,
  hashtags: 1000,
  announcementStatus: 64,
  announcementStatusLabel: 64,
  imageStorageId: 120,
  fileNameBase: 80
};

function createHandoffToken() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function safeString(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

function isTarget(value: unknown): value is ToolHandoffTarget {
  return value === "thumbnail-editor" || value === "sns-split-image-maker";
}

function isValidDateTime(value: string) {
  const expiresAt = Date.parse(value);
  return Number.isFinite(expiresAt);
}

export function createScheduleHandoffPayload(
  target: ToolHandoffTarget,
  input: Omit<ScheduleHandoffPayload, "version" | "source" | "target" | "createdAt" | "expiresAt">
): ScheduleHandoffPayload {
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + handoffTtlMs);

  return {
    version: 1,
    source: "schedule-calendar",
    target,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    eventId: input.eventId,
    title: input.title,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    category: input.category,
    categoryLabel: input.categoryLabel,
    platform: input.platform,
    announcementText: input.announcementText,
    hashtags: input.hashtags,
    announcementStatus: input.announcementStatus,
    announcementStatusLabel: input.announcementStatusLabel
  };
}

export function createThumbnailToSnsHandoffPayload(
  input: Omit<ThumbnailToSnsHandoffPayload, "version" | "source" | "target" | "createdAt" | "expiresAt">
): ThumbnailToSnsHandoffPayload {
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + handoffTtlMs);

  return {
    version: 1,
    source: "thumbnail-editor",
    target: "sns-split-image-maker",
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    imageStorageId: input.imageStorageId,
    title: input.title,
    date: input.date,
    categoryLabel: input.categoryLabel,
    platform: input.platform,
    announcementText: input.announcementText,
    hashtags: input.hashtags,
    fileNameBase: input.fileNameBase
  };
}

export function writeToolHandoff(payload: ToolHandoffPayload) {
  if (typeof window === "undefined") {
    return null;
  }

  const token = createHandoffToken();
  try {
    window.sessionStorage.setItem(`${toolHandoffStoragePrefix}${token}`, JSON.stringify(payload));
    return token;
  } catch {
    return null;
  }
}

export function buildToolHandoffUrl(target: ToolHandoffTarget, token: string) {
  const pathname = target === "thumbnail-editor" ? "/tools/thumbnail-editor" : "/tools/sns-split-image-maker";
  const params = new URLSearchParams({ [toolHandoffQueryParam]: token });

  if (target === "sns-split-image-maker") {
    params.set("preset", "split-4");
  }

  return `${pathname}?${params.toString()}`;
}

export function readToolHandoff(target: "thumbnail-editor"): ScheduleHandoffPayload | null;
export function readToolHandoff(target: "sns-split-image-maker"): SnsSplitToolHandoffPayload | null;
export function readToolHandoff(target: ToolHandoffTarget): ToolHandoffPayload | null {
  if (typeof window === "undefined") {
    return null;
  }

  const token = new URLSearchParams(window.location.search).get(toolHandoffQueryParam);
  if (!token) {
    return null;
  }

  const storageKey = `${toolHandoffStoragePrefix}${token}`;
  const rawPayload = window.sessionStorage.getItem(storageKey);
  window.sessionStorage.removeItem(storageKey);

  if (!rawPayload) {
    return null;
  }

  try {
    return normalizeToolHandoffPayload(JSON.parse(rawPayload), target);
  } catch {
    return null;
  }
}

function normalizeToolHandoffPayload(value: unknown, target: ToolHandoffTarget): ToolHandoffPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Partial<ToolHandoffPayload>;
  if (payload.source === "schedule-calendar") {
    return normalizeScheduleHandoffPayload(value, target);
  }
  if (payload.source === "thumbnail-editor") {
    return normalizeThumbnailToSnsHandoffPayload(value, target);
  }
  return null;
}

export function normalizeScheduleHandoffPayload(value: unknown, target: ToolHandoffTarget): ScheduleHandoffPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Partial<ScheduleHandoffPayload>;
  const expiresAt = safeString(payload.expiresAt, 64);
  const createdAt = safeString(payload.createdAt, 64);
  if (
    payload.version !== 1 ||
    payload.source !== "schedule-calendar" ||
    !isTarget(payload.target) ||
    payload.target !== target ||
    !isValidDateTime(expiresAt) ||
    Date.parse(expiresAt) < Date.now()
  ) {
    return null;
  }

  return {
    version: 1,
    source: "schedule-calendar",
    target,
    createdAt: isValidDateTime(createdAt) ? createdAt : new Date().toISOString(),
    expiresAt,
    eventId: safeString(payload.eventId, maxTextLengths.eventId),
    title: safeString(payload.title, maxTextLengths.title),
    date: safeString(payload.date, maxTextLengths.date),
    startTime: safeString(payload.startTime, maxTextLengths.time),
    endTime: safeString(payload.endTime, maxTextLengths.time),
    category: safeString(payload.category, maxTextLengths.category),
    categoryLabel: safeString(payload.categoryLabel, maxTextLengths.categoryLabel),
    platform: safeString(payload.platform, maxTextLengths.platform),
    announcementText: safeString(payload.announcementText, maxTextLengths.announcementText),
    hashtags: safeString(payload.hashtags, maxTextLengths.hashtags),
    announcementStatus: safeString(payload.announcementStatus, maxTextLengths.announcementStatus),
    announcementStatusLabel: safeString(payload.announcementStatusLabel, maxTextLengths.announcementStatusLabel)
  };
}

export function normalizeThumbnailToSnsHandoffPayload(value: unknown, target: ToolHandoffTarget): ThumbnailToSnsHandoffPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Partial<ThumbnailToSnsHandoffPayload>;
  const expiresAt = safeString(payload.expiresAt, 64);
  const createdAt = safeString(payload.createdAt, 64);
  if (
    payload.version !== 1 ||
    payload.source !== "thumbnail-editor" ||
    payload.target !== "sns-split-image-maker" ||
    target !== "sns-split-image-maker" ||
    !isValidDateTime(expiresAt) ||
    Date.parse(expiresAt) < Date.now()
  ) {
    return null;
  }

  const imageStorageId = safeString(payload.imageStorageId, maxTextLengths.imageStorageId);
  if (!imageStorageId) {
    return null;
  }

  return {
    version: 1,
    source: "thumbnail-editor",
    target: "sns-split-image-maker",
    createdAt: isValidDateTime(createdAt) ? createdAt : new Date().toISOString(),
    expiresAt,
    imageStorageId,
    title: safeString(payload.title, maxTextLengths.title),
    date: safeString(payload.date, maxTextLengths.date),
    categoryLabel: safeString(payload.categoryLabel, maxTextLengths.categoryLabel),
    platform: safeString(payload.platform, maxTextLengths.platform),
    announcementText: safeString(payload.announcementText, maxTextLengths.announcementText),
    hashtags: safeString(payload.hashtags, maxTextLengths.hashtags),
    fileNameBase: safeString(payload.fileNameBase, maxTextLengths.fileNameBase)
  };
}
