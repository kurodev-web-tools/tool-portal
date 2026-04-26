export type CalendarView = "month" | "week" | "day";

export type EventCategory = "stream" | "production" | "post" | "planning" | "prep" | "business";

export type EventPlatform = "YouTube" | "Twitch" | "X" | "TikTok" | "Other" | "";

export type ScheduleEvent = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  category: EventCategory;
  platform: EventPlatform;
  memo: string;
};

export type PostTemplate = {
  id: string;
  name: string;
  description: string;
  build: (event: ScheduleEvent | null) => string;
};

export const scheduleStorageKey = "v-streamer-tools:schedule-calendar-events:v1";

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

const dayFormatter = new Intl.DateTimeFormat("ja-JP", { weekday: "short" });
const monthFormatter = new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long" });
const longDateFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short"
});

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

export function startOfWeek(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setDate(next.getDate() - next.getDay());
  return next;
}

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function getMonthGrid(date: Date): Date[] {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const gridStart = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

export function getPeriodLabel(date: Date, view: CalendarView): string {
  if (view === "month") {
    return monthFormatter.format(date);
  }

  if (view === "day") {
    return longDateFormatter.format(date);
  }

  const days = getWeekDays(date);
  const start = days[0];
  const end = days[6];
  return `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日(${dayFormatter.format(start)}) - ${
    end.getMonth() + 1
  }月${end.getDate()}日(${dayFormatter.format(end)})`;
}

export function getShortDateLabel(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()} (${dayFormatter.format(date)})`;
}

export function getLongDateLabel(dateKey: string): string {
  return longDateFormatter.format(parseDateKey(dateKey));
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

export function createEmptyEvent(dateKey: string): ScheduleEvent {
  return {
    id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: "",
    date: dateKey,
    startTime: "20:00",
    endTime: "21:00",
    category: "stream",
    platform: "YouTube",
    memo: ""
  };
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
      return (
        typeof event.id === "string" &&
        typeof event.title === "string" &&
        typeof event.date === "string" &&
        typeof event.startTime === "string" &&
        typeof event.endTime === "string" &&
        typeof event.memo === "string" &&
        Boolean(event.category && event.category in categoryMeta)
      );
    })
  );
}

export function generatePostText(event: ScheduleEvent | null, templateId: string): string {
  const template = postTemplates.find((item) => item.id === templateId) ?? postTemplates[0];
  return template.build(event);
}

export const postTemplates: PostTemplate[] = [
  {
    id: "stream-notice",
    name: "配信告知",
    description: "当日の配信予定を短く告知します。",
    build: (event) => {
      if (!event) {
        return "本日の配信予定を準備中です。\n開始時間や配信ページが決まり次第お知らせします。";
      }

      const platform = event.platform ? ` / ${event.platform}` : "";
      return `【配信予定】\n${getLongDateLabel(event.date)} ${event.startTime} - ${event.endTime}${platform}\n${event.title}\n\nよかったら遊びに来てください。`;
    }
  },
  {
    id: "reminder",
    name: "直前リマインド",
    description: "開始前の軽いリマインドに使います。",
    build: (event) => {
      if (!event) {
        return "まもなく予定の時間です。\n準備ができ次第お知らせします。";
      }

      return `まもなく ${event.startTime} から ${event.title} です。\n${event.platform ? `${event.platform}で` : ""}お待ちしています。`;
    }
  },
  {
    id: "after-note",
    name: "終了後メモ",
    description: "配信や投稿後のフォロー文面です。",
    build: (event) => {
      if (!event) {
        return "本日の予定が完了しました。\n見に来てくれた方、ありがとうございました。";
      }

      return `${event.title}、ありがとうございました。\n次回予定もカレンダーで整理しておきます。`;
    }
  }
];
