import type { Locale } from "@/lib/locale";

export type CalendarView = "month" | "week" | "day";

export type EventCategory = "stream" | "production" | "post" | "planning" | "prep" | "business";

export type EventPlatform = "YouTube" | "Twitch" | "X" | "TikTok" | "Other" | "";
export type EventRecurrence = "none" | "daily" | "weekly";
export type AnnouncementStatus =
  | "not-started"
  | "preparing"
  | "copy-ready"
  | "image-ready"
  | "announced"
  | "streamed";
export type PostTemplateUsageCategory =
  | "x-post"
  | "youtube-description"
  | "reminder"
  | "after-note"
  | "title-ideas"
  | "custom";

export type ScheduleEvent = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  category: EventCategory;
  platform: EventPlatform;
  memo: string;
  recurrence?: EventRecurrence;
  recurrenceCount?: number;
  announcementText: string;
  announcementHashtags: string;
  announcementMemo: string;
  announcementStatus: AnnouncementStatus;
};

export type ScheduleSettings = {
  defaultView: CalendarView;
  weekStartsOn: 0 | 1;
  defaultStartTime: string;
  defaultDurationMinutes: number;
  defaultTemplateId: string;
};

export type PostTemplate = {
  id: string;
  name: string;
  description: string;
  usageCategory: PostTemplateUsageCategory;
  defaultPlatform: EventPlatform;
  body: string;
  hashtags: string;
};

export type HashtagSet = {
  id: string;
  name: string;
  hashtags: string;
};

export type ScheduleStoragePayload = {
  version: 2;
  events: ScheduleEvent[];
  settings: ScheduleSettings;
  postTemplates: PostTemplate[];
  hashtagSets: HashtagSet[];
};

export const scheduleStorageKey = "v-streamer-tools:schedule-calendar-events:v1";
export const scheduleStorageVersion = 2;
export const scheduleInputTextLimits = {
  title: 120,
  announcementText: 1200,
  announcementHashtags: 300,
  postTemplateBody: 2000
};

export const categoryMeta: Record<EventCategory, { label: string; tone: string; dot: string }> = {
  stream: {
    label: "配信",
    tone: "border-teal-500/45 bg-teal-50 text-teal-900 dark:bg-teal-950/45 dark:text-teal-100",
    dot: "bg-teal-600"
  },
  production: {
    label: "制作",
    tone: "border-blue-500/45 bg-blue-50 text-blue-900 dark:bg-blue-950/45 dark:text-blue-100",
    dot: "bg-blue-600"
  },
  post: {
    label: "投稿",
    tone: "border-amber-500/50 bg-amber-50 text-amber-900 dark:bg-amber-950/45 dark:text-amber-100",
    dot: "bg-amber-500"
  },
  planning: {
    label: "企画",
    tone: "border-cyan-500/45 bg-cyan-50 text-cyan-900 dark:bg-cyan-950/45 dark:text-cyan-100",
    dot: "bg-cyan-600"
  },
  prep: {
    label: "準備",
    tone: "border-emerald-500/45 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/45 dark:text-emerald-100",
    dot: "bg-emerald-600"
  },
  business: {
    label: "ビジネス",
    tone: "border-violet-500/45 bg-violet-50 text-violet-900 dark:bg-violet-950/45 dark:text-violet-100",
    dot: "bg-violet-600"
  }
};

export const categoryOptions: Array<{ value: EventCategory; label: string }> = Object.entries(categoryMeta).map(
  ([value, meta]) => ({
    value: value as EventCategory,
    label: meta.label
  })
);

export const platformOptions: EventPlatform[] = ["YouTube", "Twitch", "X", "TikTok", "Other", ""];
export const recurrenceOptions: Array<{ value: EventRecurrence; label: string }> = [
  { value: "none", label: "繰り返しなし" },
  { value: "daily", label: "毎日" },
  { value: "weekly", label: "毎週" }
];
export const announcementStatusOptions: Array<{ value: AnnouncementStatus; label: string }> = [
  { value: "not-started", label: "未着手" },
  { value: "preparing", label: "準備中" },
  { value: "copy-ready", label: "投稿文準備済み" },
  { value: "image-ready", label: "告知画像作成済み" },
  { value: "announced", label: "告知済み" },
  { value: "streamed", label: "配信済み" }
];
export const postTemplateUsageOptions: Array<{ value: PostTemplateUsageCategory; label: string }> = [
  { value: "x-post", label: "X告知" },
  { value: "youtube-description", label: "YouTube概要欄" },
  { value: "reminder", label: "直前リマインド" },
  { value: "after-note", label: "終了後フォロー" },
  { value: "title-ideas", label: "タイトル候補" },
  { value: "custom", label: "カスタム" }
];
export const postTemplateVariableOptions: Array<{ token: string; label: string }> = [
  { token: "{title}", label: "タイトル" },
  { token: "{date}", label: "日付" },
  { token: "{startTime}", label: "開始時刻" },
  { token: "{endTime}", label: "終了時刻" },
  { token: "{weekday}", label: "曜日" },
  { token: "{category}", label: "カテゴリ" },
  { token: "{platform}", label: "プラットフォーム" },
  { token: "{memo}", label: "メモ" },
  { token: "{announcementText}", label: "告知文" },
  { token: "{hashtags}", label: "ハッシュタグ" }
];

const localeFormatterNames: Record<Locale, string> = {
  ja: "ja-JP",
  en: "en-US"
};
const dayFormatters: Record<Locale, Intl.DateTimeFormat> = {
  ja: new Intl.DateTimeFormat(localeFormatterNames.ja, { weekday: "short" }),
  en: new Intl.DateTimeFormat(localeFormatterNames.en, { weekday: "short" })
};
const monthFormatters: Record<Locale, Intl.DateTimeFormat> = {
  ja: new Intl.DateTimeFormat(localeFormatterNames.ja, { year: "numeric", month: "long" }),
  en: new Intl.DateTimeFormat(localeFormatterNames.en, { year: "numeric", month: "long" })
};
const longDateFormatters: Record<Locale, Intl.DateTimeFormat> = {
  ja: new Intl.DateTimeFormat(localeFormatterNames.ja, {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short"
  }),
  en: new Intl.DateTimeFormat(localeFormatterNames.en, {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short"
  })
};

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function addMonths(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
}

export function startOfWeek(date: Date, weekStartsOn: 0 | 1 = 0): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  const offset = (next.getDay() - weekStartsOn + 7) % 7;
  next.setDate(next.getDate() - offset);
  return next;
}

export function getWeekDays(date: Date, weekStartsOn: 0 | 1 = 0): Date[] {
  const start = startOfWeek(date, weekStartsOn);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function getMonthGrid(date: Date, weekStartsOn: 0 | 1 = 0): Date[] {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const gridStart = startOfWeek(first, weekStartsOn);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

export function getPeriodLabel(date: Date, view: CalendarView, weekStartsOn: 0 | 1 = 0, locale: Locale = "ja"): string {
  const dayFormatter = dayFormatters[locale];

  if (view === "month") {
    return monthFormatters[locale].format(date);
  }

  if (view === "day") {
    return longDateFormatters[locale].format(date);
  }

  const days = getWeekDays(date, weekStartsOn);
  const start = days[0];
  const end = days[6];
  if (locale === "en") {
    return `${start.toLocaleDateString(localeFormatterNames.en, { month: "short", day: "numeric", year: "numeric" })} (${dayFormatter.format(start)}) - ${end.toLocaleDateString(localeFormatterNames.en, { month: "short", day: "numeric" })} (${dayFormatter.format(end)})`;
  }

  return `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日(${dayFormatter.format(start)}) - ${
    end.getMonth() + 1
  }月${end.getDate()}日(${dayFormatter.format(end)})`;
}

export function getShortDateLabel(date: Date, locale: Locale = "ja"): string {
  return `${date.getMonth() + 1}/${date.getDate()} (${dayFormatters[locale].format(date)})`;
}

export function getLongDateLabel(dateKey: string, locale: Locale = "ja"): string {
  return longDateFormatters[locale].format(parseDateKey(dateKey));
}

export function sortEvents(events: ScheduleEvent[]): ScheduleEvent[] {
  return [...events].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) {
      return dateCompare;
    }

    return a.startTime.localeCompare(b.startTime);
  });
}

export function getEventsForDate(events: ScheduleEvent[], dateKey: string): ScheduleEvent[] {
  return sortEvents(events.filter((event) => event.date === dateKey));
}

export function getEventDurationMinutes(event: ScheduleEvent): number {
  const [startHour, startMinute] = event.startTime.split(":").map(Number);
  const [endHour, endMinute] = event.endTime.split(":").map(Number);
  return Math.max(30, endHour * 60 + endMinute - (startHour * 60 + startMinute));
}

export function getEventStartMinutes(event: ScheduleEvent): number {
  const [hour, minute] = event.startTime.split(":").map(Number);
  return hour * 60 + minute;
}

export function createEmptyEvent(
  dateKey: string,
  options: { startTime?: string; durationMinutes?: number } = {}
): ScheduleEvent {
  const startTime = options.startTime ?? "20:00";
  const durationMinutes = options.durationMinutes ?? 60;
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const endTotalMinutes = Math.min(24 * 60 - 1, startHour * 60 + startMinute + durationMinutes);
  const endHour = Math.floor(endTotalMinutes / 60);
  const endMinute = endTotalMinutes % 60;

  return {
    id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: "",
    date: dateKey,
    startTime,
    endTime: `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`,
    category: "stream",
    platform: "YouTube",
    memo: "",
    recurrence: "none",
    recurrenceCount: 1,
    announcementText: "",
    announcementHashtags: "",
    announcementMemo: "",
    announcementStatus: "not-started"
  };
}

export function normalizeRecurrence(value: unknown): EventRecurrence {
  return value === "daily" || value === "weekly" ? value : "none";
}

export function normalizeRecurrenceCount(value: unknown): number {
  const count = Number(value);
  if (!Number.isFinite(count)) {
    return 1;
  }

  return Math.min(30, Math.max(1, Math.floor(count)));
}

export function normalizeAnnouncementStatus(value: unknown): AnnouncementStatus {
  return announcementStatusOptions.some((option) => option.value === value)
    ? value as AnnouncementStatus
    : "not-started";
}

function normalizePlatform(value: unknown): EventPlatform {
  return platformOptions.includes(value as EventPlatform) ? value as EventPlatform : "";
}

function normalizeTemplateUsageCategory(value: unknown): PostTemplateUsageCategory {
  return postTemplateUsageOptions.some((option) => option.value === value)
    ? value as PostTemplateUsageCategory
    : "custom";
}

export function clampScheduleText(value: string, maxLength: number): string {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function normalizeText(value: unknown, maxLength?: number): string {
  if (typeof value !== "string") {
    return "";
  }

  return typeof maxLength === "number" ? clampScheduleText(value, maxLength) : value;
}

function getTimeMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function getTimeAfter(startTime: string, durationMinutes: number): string {
  const totalMinutes = Math.min(24 * 60 - 1, getTimeMinutes(startTime) + durationMinutes);
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function normalizeTime(value: unknown, fallback: string, options: { allowEndOfDay?: boolean } = {}): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return fallback;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (options.allowEndOfDay && hour === 24 && minute === 0) {
    return "23:59";
  }

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return fallback;
  }

  return value;
}

function normalizeEventTimeRange(startValue: unknown, endValue: unknown): { startTime: string; endTime: string } {
  const fallbackStartTime = "20:00";
  const fallbackEndTime = "21:00";
  const startTime = normalizeTime(startValue, fallbackStartTime);
  const endTime = normalizeTime(endValue, getTimeAfter(startTime, 60), { allowEndOfDay: true });

  if (getTimeMinutes(endTime) <= getTimeMinutes(startTime)) {
    return { startTime: fallbackStartTime, endTime: fallbackEndTime };
  }

  return { startTime, endTime };
}

export function normalizeEvents(value: unknown): ScheduleEvent[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return sortEvents(
    value.filter((item): item is ScheduleEvent => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const event = item as Partial<ScheduleEvent>;
      const valid = (
        typeof event.id === "string" &&
        typeof event.title === "string" &&
        typeof event.date === "string" &&
        typeof event.startTime === "string" &&
        typeof event.endTime === "string" &&
        typeof event.memo === "string" &&
        Boolean(event.category && event.category in categoryMeta)
      );

      if (!valid) {
        return false;
      }

      const normalizedTimeRange = normalizeEventTimeRange(event.startTime, event.endTime);
      event.startTime = normalizedTimeRange.startTime;
      event.endTime = normalizedTimeRange.endTime;
      event.recurrence = normalizeRecurrence(event.recurrence);
      event.recurrenceCount = normalizeRecurrenceCount(event.recurrenceCount);
      event.title = clampScheduleText(event.title ?? "", scheduleInputTextLimits.title);
      event.announcementText = normalizeText(event.announcementText, scheduleInputTextLimits.announcementText);
      event.announcementHashtags = normalizeText(event.announcementHashtags, scheduleInputTextLimits.announcementHashtags);
      event.announcementMemo = normalizeText(event.announcementMemo);
      event.announcementStatus = normalizeAnnouncementStatus(event.announcementStatus);
      return true;
    })
  );
}

export const defaultScheduleSettings: ScheduleSettings = {
  defaultView: "week",
  weekStartsOn: 0,
  defaultStartTime: "20:00",
  defaultDurationMinutes: 60,
  defaultTemplateId: "stream-notice"
};

export const defaultHashtagSets: HashtagSet[] = [
  { id: "hashtag-vtuber-basic", name: "VTuber基本", hashtags: "#VTuber #配信告知" },
  { id: "hashtag-stream-notice", name: "配信告知", hashtags: "#配信 #生配信" },
  { id: "hashtag-youtube-basic", name: "YouTube", hashtags: "#YouTube" }
];

function isCalendarView(value: unknown): value is CalendarView {
  return value === "month" || value === "week" || value === "day";
}

export function normalizeSettings(value: unknown): ScheduleSettings {
  if (!value || typeof value !== "object") {
    return { ...defaultScheduleSettings };
  }

  const input = value as Partial<ScheduleSettings>;
  const duration = Number(input.defaultDurationMinutes);

  return {
    defaultView: isCalendarView(input.defaultView) ? input.defaultView : defaultScheduleSettings.defaultView,
    weekStartsOn: input.weekStartsOn === 1 ? 1 : 0,
    defaultStartTime: normalizeTime(input.defaultStartTime, defaultScheduleSettings.defaultStartTime),
    defaultDurationMinutes: [30, 45, 60, 90, 120, 180].includes(duration) ? duration : defaultScheduleSettings.defaultDurationMinutes,
    defaultTemplateId: typeof input.defaultTemplateId === "string" ? input.defaultTemplateId : defaultScheduleSettings.defaultTemplateId
  };
}

export function normalizePostTemplates(value: unknown): PostTemplate[] {
  if (!Array.isArray(value)) {
    return postTemplates;
  }

  const templates = value.reduce<PostTemplate[]>((result, item) => {
    if (!item || typeof item !== "object") {
      return result;
    }

    const template = item as Partial<PostTemplate>;
    const valid = (
      typeof template.id === "string" &&
      typeof template.name === "string" &&
      typeof template.description === "string" &&
      typeof template.body === "string"
    );

    if (!valid) {
      return result;
    }

    result.push({
      id: template.id ?? "",
      name: template.name ?? "",
      description: template.description ?? "",
      usageCategory: normalizeTemplateUsageCategory(template.usageCategory),
      defaultPlatform: normalizePlatform(template.defaultPlatform),
      body: clampScheduleText(template.body ?? "", scheduleInputTextLimits.postTemplateBody),
      hashtags: normalizeText(template.hashtags, scheduleInputTextLimits.announcementHashtags)
    });
    return result;
  }, []);

  return templates.length > 0 ? templates : postTemplates;
}

export function normalizeHashtagSets(value: unknown): HashtagSet[] {
  if (value === undefined) {
    return defaultHashtagSets;
  }

  if (!Array.isArray(value)) {
    return defaultHashtagSets;
  }

  return value.reduce<HashtagSet[]>((result, item) => {
    if (!item || typeof item !== "object") {
      return result;
    }

    const hashtagSet = item as Partial<HashtagSet>;
    if (
      typeof hashtagSet.id !== "string" ||
      typeof hashtagSet.name !== "string" ||
      typeof hashtagSet.hashtags !== "string"
    ) {
      return result;
    }

    result.push({
      id: hashtagSet.id,
      name: hashtagSet.name,
      hashtags: normalizeText(hashtagSet.hashtags)
    });
    return result;
  }, []);
}

export function normalizeStoragePayload(value: unknown): ScheduleStoragePayload {
  if (Array.isArray(value)) {
    return {
      version: scheduleStorageVersion,
      events: normalizeEvents(value),
      settings: { ...defaultScheduleSettings },
      postTemplates,
      hashtagSets: defaultHashtagSets
    };
  }

  if (!value || typeof value !== "object") {
    return {
      version: scheduleStorageVersion,
      events: [],
      settings: { ...defaultScheduleSettings },
      postTemplates,
      hashtagSets: defaultHashtagSets
    };
  }

  const input = value as Partial<ScheduleStoragePayload>;
  const templates = normalizePostTemplates(input.postTemplates);
  const settings = normalizeSettings(input.settings);
  const hashtagSets = normalizeHashtagSets(input.hashtagSets);
  const defaultTemplateExists = templates.some((template) => template.id === settings.defaultTemplateId);

  return {
    version: scheduleStorageVersion,
    events: normalizeEvents(input.events),
    settings: {
      ...settings,
      defaultTemplateId: defaultTemplateExists ? settings.defaultTemplateId : templates[0]?.id ?? defaultScheduleSettings.defaultTemplateId
    },
    postTemplates: templates,
    hashtagSets
  };
}

function getTemplateValue(
  event: ScheduleEvent | null,
  key: string,
  options: { locale?: Locale; categoryLabel?: string } = {}
): string {
  if (!event) {
    return "";
  }

  if (key === "date") {
    return getLongDateLabel(event.date, options.locale ?? "ja");
  }

  if (key === "weekday") {
    return dayFormatters[options.locale ?? "ja"].format(parseDateKey(event.date));
  }

  if (key === "category") {
    return options.categoryLabel ?? categoryMeta[event.category].label;
  }

  if (key === "hashtags") {
    return event.announcementHashtags;
  }

  return String(event[key as keyof ScheduleEvent] ?? "");
}

function normalizeHashtag(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

export function mergeHashtags(...values: string[]): string {
  const seen = new Set<string>();
  const tags = values
    .flatMap((value) => value.split(/[\s,、]+/))
    .map(normalizeHashtag)
    .filter((tag) => {
      if (!tag || seen.has(tag)) {
        return false;
      }

      seen.add(tag);
      return true;
    });

  return tags.join(" ");
}

export function renderPostTemplate(
  event: ScheduleEvent | null,
  template: PostTemplate,
  includeHashtags = true,
  extraHashtags: string[] = [],
  options: { locale?: Locale; categoryLabel?: string } = {}
): string {
  if (!event) {
    return "予定を選ぶと、ここに投稿文プレビューが表示されます。";
  }

  const hashtags = includeHashtags ? mergeHashtags(template.hashtags, ...extraHashtags, event.announcementHashtags) : "";
  const body = template.body.replace(/\{(date|startTime|endTime|title|platform|category|memo|weekday|announcementText|hashtags)\}/g, (_, key: string) =>
    key === "hashtags" ? hashtags : getTemplateValue(event, key, options)
  );
  const shouldAppendHashtags = includeHashtags && hashtags && !template.body.includes("{hashtags}");

  return [body.trimEnd(), shouldAppendHashtags ? hashtags : ""].filter(Boolean).join("\n\n");
}

export function generatePostText(
  event: ScheduleEvent | null,
  templateId: string,
  templates: PostTemplate[] = postTemplates,
  options: { includeHashtags?: boolean; extraHashtags?: string[]; locale?: Locale; categoryLabel?: string } = {}
): string {
  const normalizedTemplates = normalizePostTemplates(templates);
  const template = normalizedTemplates.find((item) => item.id === templateId) ?? normalizedTemplates[0];
  return renderPostTemplate(event, template, options.includeHashtags ?? true, options.extraHashtags ?? [], {
    locale: options.locale,
    categoryLabel: options.categoryLabel
  });
}

export const postTemplates: PostTemplate[] = [
  {
    id: "stream-notice",
    name: "配信告知",
    description: "当日の配信予定を短く告知します。",
    usageCategory: "x-post",
    defaultPlatform: "X",
    body: "【配信予定】\n{date} {startTime} - {endTime} / {platform}\n{title}\n\nよかったら遊びに来てください。",
    hashtags: "#VTuber #配信告知"
  },
  {
    id: "reminder",
    name: "直前リマインド",
    description: "開始前の軽いリマインドに使います。",
    usageCategory: "reminder",
    defaultPlatform: "X",
    body: "まもなく {startTime} から {title} です。\n{platform}でお待ちしています。",
    hashtags: "#VTuber"
  },
  {
    id: "after-note",
    name: "終了後メモ",
    description: "配信や投稿後のフォロー文面です。",
    usageCategory: "after-note",
    defaultPlatform: "X",
    body: "{title}、ありがとうございました。\n次回予定もカレンダーで整理しておきます。",
    hashtags: "#VTuber"
  },
  {
    id: "youtube-description",
    name: "YouTube概要欄メモ",
    description: "概要欄に転記する日時と補足メモをまとめます。",
    usageCategory: "youtube-description",
    defaultPlatform: "YouTube",
    body: "配信予定: {date} {startTime} - {endTime}\nタイトル: {title}\nカテゴリ: {category}\n\n{memo}",
    hashtags: ""
  }
];
