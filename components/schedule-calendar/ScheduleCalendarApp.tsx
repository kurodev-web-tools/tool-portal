"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import {
  buildToolHandoffUrl,
  createScheduleHandoffPayload,
  writeToolHandoff,
  type ToolHandoffTarget
} from "@/lib/tool-handoff";
import {
  addDays,
  addMonths,
  announcementStatusOptions,
  categoryMeta,
  categoryOptions,
  createEmptyEvent,
  defaultHashtagSets,
  defaultScheduleSettings,
  generatePostText,
  getEventDurationMinutes,
  getEventsForDate,
  getEventStartMinutes,
  getLongDateLabel,
  getMonthGrid,
  getPeriodLabel,
  getShortDateLabel,
  mergeHashtags,
  getWeekDays,
  normalizeStoragePayload,
  parseDateKey,
  platformOptions,
  postTemplates,
  postTemplateUsageOptions,
  postTemplateVariableOptions,
  recurrenceOptions,
  clampScheduleText,
  scheduleInputTextLimits,
  scheduleStorageKey,
  scheduleStorageVersion,
  sortEvents,
  toDateKey,
  type AnnouncementStatus,
  type CalendarView,
  type EventCategory,
  type EventPlatform,
  type HashtagSet,
  type PostTemplate,
  type ScheduleStoragePayload,
  type ScheduleSettings,
  type ScheduleEvent
} from "@/lib/schedule-calendar";

type PanelTab = "schedule" | "post" | "events" | "settings";
type CopyStatusKind = "idle" | "success" | "error";
type MobileNavTab = "calendar" | "events" | "settings";
type MobileScheduleMode = "detail" | "edit";
type EventPeriodFilter = "all" | "today" | "week" | "month";
type EventSortOrder = "upcoming" | "dateAsc" | "dateDesc";
type PendingUndo = {
  title: string;
  detail: string;
  actionLabel: string;
  restoreEvent: ScheduleEvent;
};
type DragGuide = {
  dateKey: string;
  startMinutes: number;
  durationMinutes: number;
};
type EventPreviewPlacement = {
  side: "right" | "left" | "center";
  vertical: "below" | "above";
};

const viewLabels: Record<CalendarView, string> = {
  month: "月",
  week: "週",
  day: "日"
};

const timeSlots = Array.from({ length: 48 }, (_, index) => index * 30);
const timelineStartMinutes = 0;
const timelineEndMinutes = 24 * 60;
const timelineMinutes = timelineEndMinutes - timelineStartMinutes;
// Schedule Calendar display ranges:
// - <= 1023px: mobile flow (includes portrait tablet 768-1023px)
// - 1024-1279px: tablet two-pane flow
// - >= 1280px: desktop two-pane flow
const mobileOnlyClassName = "lg:hidden";
const tabletUpClassName = "hidden lg:block";
const tabletUpContentsClassName = "hidden lg:contents";
const mobileSheetMaxHeightClassName = "max-h-[74vh]";
const timeGridMinHeightClassName = "min-h-[1152px]";
const timeSlotHeightClassName = "h-6";
const weekGridTemplateColumns = "48px repeat(7, minmax(84px, 1fr))";
const emptyEventsMessage = "予定はまだありません。";
const emptySearchResultsMessage = "条件に一致する予定はありません。";
const saveFailureMessage = "保存できませんでした。ブラウザの保存領域を確認してください。";
const importFailureMessage = "JSONをインポートできませんでした。形式を確認してください。既存データは変更していません。";
const defaultDurationMinuteOptions = [30, 45, 60, 90, 120, 180];
const importTextMaxLength = 250_000;
const importMaxEvents = 500;
const importMaxTemplates = 50;
const importMaxHashtagSets = 100;
const importMaxTextLengths = {
  title: scheduleInputTextLimits.title,
  memo: 2000,
  templateName: 80,
  templateDescription: 240,
  templateBody: scheduleInputTextLimits.postTemplateBody,
  templateHashtags: scheduleInputTextLimits.announcementHashtags,
  hashtagSetName: 80,
  hashtagSetTags: 1000,
  announcementText: scheduleInputTextLimits.announcementText,
  announcementHashtags: scheduleInputTextLimits.announcementHashtags,
  announcementMemo: 2000
};
const maxRecurrenceCount = 30;
const mobileLayoutQuery = "(max-width: 1023px)";
const calendarViewOptions: Array<{ value: CalendarView; label: string }> = [
  { value: "month", label: "月" },
  { value: "week", label: "週" },
  { value: "day", label: "日" }
];
const weekStartOptions: Array<{ value: 0 | 1; label: string }> = [
  { value: 0, label: "日曜" },
  { value: 1, label: "月曜" }
];
const defaultDurationOptions = defaultDurationMinuteOptions.map((minutes) => ({ value: minutes, label: `${minutes}分` }));
const eventCategoryFilterOptions: Array<{ value: EventCategory | "all"; label: string }> = [
  { value: "all", label: "カテゴリすべて" },
  ...categoryOptions
];
const eventPlatformFilterOptions: Array<{ value: EventPlatform | "all"; label: string }> = [
  { value: "all", label: "媒体すべて" },
  ...platformOptions.map((option) => ({ value: option, label: option || "-" }))
];
const eventPeriodOptions: Array<{ value: EventPeriodFilter; label: string }> = [
  { value: "all", label: "全期間" },
  { value: "today", label: "今日以降" },
  { value: "week", label: "7日以内" },
  { value: "month", label: "30日以内" }
];
const eventSortOptions: Array<{ value: EventSortOrder; label: string }> = [
  { value: "upcoming", label: "直近順" },
  { value: "dateAsc", label: "日付昇順" },
  { value: "dateDesc", label: "日付降順" }
];
const announcementStatusFilterOptions: Array<{ value: AnnouncementStatus | "all"; label: string }> = [
  { value: "all", label: "告知すべて" },
  ...announcementStatusOptions
];
const scheduleStartGuide = "空いている時間をクリック、または右パネルの「新しい予定を追加」から1件作成します。";
const mobileScheduleStartGuide = "空いている時間をタップ、または右下の＋から予定を追加できます。";
const postAssistStartGuide = "予定を選ぶと、告知文コピーと Thumbnail Editor / SNS分割画像メーカーへの受け渡しをここで確認できます。";
const handoffSelectedGuide =
  "Thumbnail Editorには予定テキストを初期値として渡します。SNS分割画像メーカーではメイン画像を選んでから個別PNG/JPEGを書き出します。";
const handoffEmptyGuide = "予定を選ぶと、公開前の配信ワークフロー導線として次ツールへ初期テキストを渡せます。";
const backupHelpText =
  "このブラウザに保存された予定、投稿補助テンプレート、ハッシュタグ、設定をJSONで控えます。復元に失敗した場合、既存データは変更しません。";

function formatSlot(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function handleDateKeyDown(event: KeyboardEvent, onSelect: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onSelect();
  }
}

function isImportableSchedulePayload(value: unknown) {
  if (Array.isArray(value)) {
    return true;
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return "version" in payload || "events" in payload || "settings" in payload || "postTemplates" in payload || "hashtagSets" in payload;
}

function isStringWithinLimit(value: unknown, maxLength: number) {
  return typeof value !== "string" || value.length <= maxLength;
}

function validateImportEvents(value: unknown) {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value) || value.length > importMaxEvents) {
    throw new Error("Import events exceeded limits");
  }

  value.forEach((item) => {
    if (!item || typeof item !== "object") {
      return;
    }

    const event = item as Partial<ScheduleEvent>;
    if (
      !isStringWithinLimit(event.title, importMaxTextLengths.title) ||
      !isStringWithinLimit(event.memo, importMaxTextLengths.memo) ||
      !isStringWithinLimit(event.announcementText, importMaxTextLengths.announcementText) ||
      !isStringWithinLimit(event.announcementHashtags, importMaxTextLengths.announcementHashtags) ||
      !isStringWithinLimit(event.announcementMemo, importMaxTextLengths.announcementMemo)
    ) {
      throw new Error("Import event text exceeded limits");
    }
  });
}

function validateImportTemplates(value: unknown) {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value) || value.length > importMaxTemplates) {
    throw new Error("Import templates exceeded limits");
  }

  value.forEach((item) => {
    if (!item || typeof item !== "object") {
      return;
    }

    const template = item as Partial<PostTemplate>;
    if (
      !isStringWithinLimit(template.name, importMaxTextLengths.templateName) ||
      !isStringWithinLimit(template.description, importMaxTextLengths.templateDescription) ||
      !isStringWithinLimit(template.body, importMaxTextLengths.templateBody) ||
      !isStringWithinLimit(template.hashtags, importMaxTextLengths.templateHashtags)
    ) {
      throw new Error("Import template text exceeded limits");
    }
  });
}

function validateImportHashtagSets(value: unknown) {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value) || value.length > importMaxHashtagSets) {
    throw new Error("Import hashtag sets exceeded limits");
  }

  value.forEach((item) => {
    if (!item || typeof item !== "object") {
      return;
    }

    const hashtagSet = item as Partial<HashtagSet>;
    if (
      !isStringWithinLimit(hashtagSet.name, importMaxTextLengths.hashtagSetName) ||
      !isStringWithinLimit(hashtagSet.hashtags, importMaxTextLengths.hashtagSetTags)
    ) {
      throw new Error("Import hashtag set text exceeded limits");
    }
  });
}

function validateImportPayloadLimits(value: unknown) {
  if (Array.isArray(value)) {
    validateImportEvents(value);
    return;
  }

  if (!value || typeof value !== "object") {
    throw new Error("Unsupported import payload");
  }

  const payload = value as Partial<ScheduleStoragePayload>;
  validateImportEvents(payload.events);
  validateImportTemplates(payload.postTemplates);
  validateImportHashtagSets(payload.hashtagSets);
}

function createEventDraft(dateKey: string, settings: ScheduleSettings) {
  return createEmptyEvent(dateKey, {
    startTime: settings.defaultStartTime,
    durationMinutes: settings.defaultDurationMinutes
  });
}

function createScheduleStoragePayload(
  events: ScheduleEvent[],
  settings: ScheduleSettings,
  templates: PostTemplate[],
  hashtagSets: HashtagSet[]
): ScheduleStoragePayload {
  return {
    version: scheduleStorageVersion,
    events,
    settings,
    postTemplates: templates,
    hashtagSets
  };
}

function createEventId() {
  return `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createRecurringEvents(event: ScheduleEvent) {
  const recurrence = event.recurrence ?? "none";
  const count = recurrence === "none" ? 1 : Math.min(maxRecurrenceCount, Math.max(1, Math.floor(event.recurrenceCount ?? 1)));
  const stepDays = recurrence === "weekly" ? 7 : 1;

  return Array.from({ length: count }, (_, index) => {
    const date = index === 0 ? event.date : toDateKey(addDays(parseDateKey(event.date), stepDays * index));
    return {
      ...event,
      id: index === 0 ? event.id : createEventId(),
      date,
      recurrence,
      recurrenceCount: count
    };
  });
}

function hasActiveEventListFilters(filters: EventListFilters) {
  return (
    Boolean(filters.query.trim()) ||
    filters.category !== "all" ||
    filters.platform !== "all" ||
    filters.announcementStatus !== "all" ||
    filters.period !== "all"
  );
}

function useMeasuredScrollbarWidth() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);

  useLayoutEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) {
      return;
    }

    const measureScrollbar = () => {
      setScrollbarWidth(Math.max(0, scrollContainer.offsetWidth - scrollContainer.clientWidth));
    };

    measureScrollbar();

    const resizeObserver = new ResizeObserver(measureScrollbar);
    resizeObserver.observe(scrollContainer);
    window.addEventListener("resize", measureScrollbar);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measureScrollbar);
    };
  }, []);

  return { scrollContainerRef, scrollbarWidth };
}

function getTimelineBlockStyle(startMinutes: number, durationMinutes: number) {
  const start = Math.max(timelineStartMinutes, startMinutes);
  const duration = Math.min(timelineEndMinutes - start, durationMinutes);
  return {
    top: `${((start - timelineStartMinutes) / timelineMinutes) * 100}%`,
    height: `${(duration / timelineMinutes) * 100}%`
  };
}

function getEventStyle(event: ScheduleEvent) {
  return getTimelineBlockStyle(getEventStartMinutes(event), getEventDurationMinutes(event));
}

function getPreviewVerticalPlacement(event: ScheduleEvent): EventPreviewPlacement["vertical"] {
  return getEventStartMinutes(event) >= 18 * 60 ? "above" : "below";
}

function getPreviewSidePlacement(index: number, total: number): EventPreviewPlacement["side"] {
  if (index <= 1) {
    return "right";
  }

  if (index >= total - 2) {
    return "left";
  }

  return "center";
}

function getMonthPreviewVerticalPlacement(dayIndex: number): EventPreviewPlacement["vertical"] {
  return Math.floor(dayIndex / 7) < 3 ? "below" : "above";
}

function clampTimelineStartMinutes(minutes: number) {
  return Math.min(timelineEndMinutes - 30, Math.max(timelineStartMinutes, minutes));
}

function getDropStartMinutes(detail: DragEvent<HTMLElement>) {
  const rect = detail.currentTarget.getBoundingClientRect();
  const ratio = rect.height > 0 ? (detail.clientY - rect.top) / rect.height : 0;
  const rawMinutes = timelineStartMinutes + ratio * timelineMinutes;
  return clampTimelineStartMinutes(Math.round(rawMinutes / 30) * 30);
}

function getEndTimeFromStart(startMinutes: number, durationMinutes: number) {
  return formatSlot(Math.min(timelineEndMinutes - 1, startMinutes + durationMinutes));
}

function DragMoveGuide({ guide }: { guide: DragGuide }) {
  return (
    <div
      className="pointer-events-none absolute left-2 right-2 z-20 rounded-base border-2 border-dashed border-primary bg-primary-soft/55 px-2 py-1 text-xs font-black text-primary-strong shadow-sm"
      style={getTimelineBlockStyle(guide.startMinutes, Math.max(30, guide.durationMinutes))}
    >
      <span className="block truncate">
        ここに移動 {formatSlot(guide.startMinutes)} - {getEndTimeFromStart(guide.startMinutes, guide.durationMinutes)}
      </span>
    </div>
  );
}

function getEventRecurrenceLabel(event: ScheduleEvent) {
  return recurrenceOptions.find((option) => option.value === event.recurrence)?.label ?? "繰り返しなし";
}

function getAnnouncementStatusLabel(status: AnnouncementStatus) {
  return announcementStatusOptions.find((option) => option.value === status)?.label ?? "未着手";
}

function getTemplateUsageLabel(template: PostTemplate) {
  return postTemplateUsageOptions.find((option) => option.value === template.usageCategory)?.label ?? "カスタム";
}

function EventDetailContent({ event, compact = false }: { event: ScheduleEvent; compact?: boolean }) {
  return (
    <div className={compact ? "space-y-2" : "space-y-4"}>
      <div>
        <p className={compact ? "text-xs font-bold text-primary-strong" : "text-xs font-bold text-muted"}>{getLongDateLabel(event.date)}</p>
        <h3 className={compact ? "mt-1 text-sm font-bold text-foreground" : "mt-1 text-lg font-bold text-foreground"}>
          {event.title || "無題の予定"}
        </h3>
      </div>
      <dl className={compact ? "grid gap-1.5 text-xs" : "grid gap-3 text-sm"}>
        <div className="flex items-center justify-between gap-3">
          <dt className="font-bold text-muted">時間</dt>
          <dd className="font-bold text-foreground">
            {event.startTime} - {event.endTime}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="font-bold text-muted">カテゴリ</dt>
          <dd className="font-bold text-foreground">{categoryMeta[event.category].label}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="font-bold text-muted">プラットフォーム</dt>
          <dd className="font-bold text-foreground">{event.platform || "-"}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="font-bold text-muted">繰り返し</dt>
          <dd className="font-bold text-foreground">{getEventRecurrenceLabel(event)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="font-bold text-muted">告知準備</dt>
          <dd className="font-bold text-foreground">{getAnnouncementStatusLabel(event.announcementStatus)}</dd>
        </div>
      </dl>
      <div>
        <p className="text-xs font-bold text-muted">メモ</p>
        <p className={compact ? "mt-1 whitespace-pre-wrap text-xs leading-5 text-foreground" : "mt-2 whitespace-pre-wrap rounded-base border border-border bg-surface-muted/45 px-3 py-3 text-sm leading-6 text-foreground"}>
          {event.memo.trim() || "メモはありません。"}
        </p>
      </div>
      {!compact ? (
        <div>
          <p className="text-xs font-bold text-muted">告知準備メモ</p>
          <p className="mt-2 whitespace-pre-wrap rounded-base border border-border bg-surface-muted/45 px-3 py-3 text-sm leading-6 text-foreground">
            {event.announcementMemo.trim() || "告知準備メモはありません。"}
          </p>
          {event.announcementHashtags.trim() ? (
            <p className="mt-2 text-xs font-bold text-primary-strong">{event.announcementHashtags}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function EventHoverPreview({
  event,
  placement = { side: "center", vertical: "below" }
}: {
  event: ScheduleEvent;
  placement?: EventPreviewPlacement;
}) {
  const sideClassName =
    placement.side === "right"
      ? "left-full ml-2"
      : placement.side === "left"
        ? "right-full mr-2"
        : "left-1/2 -translate-x-1/2";
  const verticalClassName = placement.vertical === "above" ? "bottom-full mb-2" : "top-full mt-2";

  return (
    <div
      className={[
        "pointer-events-none absolute z-50 hidden w-80 rounded-base border border-border bg-surface p-4 text-left shadow-panel",
        "lg:group-hover:block lg:group-focus-within:block",
        sideClassName,
        verticalClassName
      ].join(" ")}
    >
      <EventDetailContent event={event} compact />
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs font-bold text-muted">{children}</p>;
}

function TextLimitCounter({
  value,
  maxLength,
  warning
}: {
  value: string;
  maxLength: number;
  warning: string;
}) {
  const nearLimit = value.length >= Math.floor(maxLength * 0.9);

  return (
    <p className={["mt-2 text-xs leading-5", nearLimit ? "font-bold text-amber-700 dark:text-amber-300" : "text-muted"].join(" ")}>
      {value.length} / {maxLength}
      {nearLimit ? ` ${warning}` : ""}
    </p>
  );
}

function setDraggedEvent(detail: DragEvent, event: ScheduleEvent) {
  detail.dataTransfer.setData("text/plain", event.id);
  detail.dataTransfer.effectAllowed = "move";
}

function getDraggedEventId(detail: DragEvent) {
  return detail.dataTransfer.getData("text/plain");
}

function inputClassName(extra = "") {
  return [
    "mt-1 w-full rounded-base border border-border bg-surface px-3 py-2 text-sm text-foreground",
    "transition placeholder:text-muted/70 focus:border-primary focus:outline-none",
    extra
  ].join(" ");
}

function SelectMenuControl<TValue extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
  disabled = false,
  className = ""
}: {
  value: TValue;
  options: Array<{ value: TValue; label: string; detail?: string }>;
  onChange: (value: TValue) => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: globalThis.PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className={["relative mt-1", className].join(" ")}>
      <button
        type="button"
        className={[
          "flex w-full items-center justify-between gap-3 rounded-base border border-border bg-surface px-3 py-2 text-left text-sm font-bold text-foreground transition",
          "hover:border-primary focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        ].join(" ")}
        aria-label={ariaLabel}
        aria-expanded={open}
        disabled={disabled || options.length === 0}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="min-w-0 truncate">{selectedOption?.label ?? "-"}</span>
        <span className="shrink-0 text-xs text-muted">{open ? "▲" : "▼"}</span>
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-56 overflow-y-auto rounded-base border border-border bg-surface p-1.5 shadow-panel">
          {options.map((option) => {
            const selected = option.value === value;

            return (
              <button
                key={String(option.value || "none")}
                type="button"
                className={[
                  "block w-full rounded-base px-2.5 py-2 text-left text-sm font-bold transition",
                  selected ? "bg-primary text-white" : "text-foreground hover:bg-primary-soft"
                ].join(" ")}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span className="block truncate">{option.label}</span>
                {option.detail ? (
                  <span className={["mt-0.5 block line-clamp-2 text-xs leading-5", selected ? "text-white/80" : "text-muted"].join(" ")}>
                    {option.detail}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function splitTimeValue(time: string) {
  const [hour, minute] = time.split(":").map((value) => Number(value));
  return {
    hour: Number.isFinite(hour) ? Math.min(23, Math.max(0, hour)) : 0,
    minute: Number.isFinite(minute) ? Math.min(59, Math.max(0, minute)) : 0
  };
}

function composeTimeValue(hour: number, minute: number) {
  return `${String(Math.min(23, Math.max(0, hour))).padStart(2, "0")}:${String(Math.min(59, Math.max(0, minute))).padStart(2, "0")}`;
}

function scrollToMiddleOption(element: HTMLDivElement | null, optionIndex: number, optionCount: number) {
  if (!element || optionIndex < 0 || optionCount === 0) {
    return;
  }

  const itemHeight = element.scrollHeight / optionCount;
  element.scrollTop = itemHeight * optionIndex - element.clientHeight / 2 + itemHeight / 2;
}

function DateSelectControl({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => parseDateKey(value));
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedDate = parseDateKey(value);
  const monthDays = getMonthGrid(visibleMonth, 0);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: globalThis.PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative mt-1">
      <button
        type="button"
        className="w-full rounded-base border border-border bg-surface px-3 py-2 text-left text-sm font-bold text-foreground transition hover:border-primary focus:border-primary focus:outline-none"
        aria-expanded={open}
        onClick={() => {
          setVisibleMonth(selectedDate);
          setOpen((current) => !current);
        }}
      >
        {getLongDateLabel(value)}
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-40 mt-2 rounded-base border border-border bg-surface p-2.5 shadow-panel sm:p-3">
          <div className="flex items-center justify-between gap-2">
            <button type="button" className="flat-control px-2 py-1" aria-label="前の月" onClick={() => setVisibleMonth((current) => addMonths(current, -1))}>
              ‹
            </button>
            <p className="text-sm font-bold text-foreground">
              {visibleMonth.getFullYear()}年{visibleMonth.getMonth() + 1}月
            </p>
            <button type="button" className="flat-control px-2 py-1" aria-label="次の月" onClick={() => setVisibleMonth((current) => addMonths(current, 1))}>
              ›
            </button>
          </div>
          <div className="mt-2 grid grid-cols-7 gap-0.5 text-center text-[10px] font-bold text-muted sm:mt-3 sm:gap-1 sm:text-[11px]">
            {["日", "月", "火", "水", "木", "金", "土"].map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-0.5 sm:gap-1">
            {monthDays.map((day) => {
              const dateKey = toDateKey(day);
              const inMonth = day.getMonth() === visibleMonth.getMonth();
              const selected = dateKey === value;

              return (
                <button
                  key={dateKey}
                  type="button"
                  className={[
                    "grid h-8 place-items-center rounded-base text-[11px] font-bold transition sm:h-9 sm:text-xs",
                    selected ? "bg-primary text-white" : inMonth ? "text-foreground hover:bg-primary-soft" : "text-muted/45 hover:bg-surface-muted"
                  ].join(" ")}
                  onClick={() => {
                    onChange(dateKey);
                    setOpen(false);
                  }}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TimeSelectControl({
  value,
  onChange,
  align = "end"
}: {
  value: string;
  onChange: (value: string) => void;
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hourListRef = useRef<HTMLDivElement>(null);
  const minuteListRef = useRef<HTMLDivElement>(null);
  const { hour, minute } = splitTimeValue(value);
  const hourOptions = useMemo(() => Array.from({ length: 24 }, (_, index) => index), []);
  const minuteOptions = useMemo(
    () => Array.from(new Set([...Array.from({ length: 12 }, (_, index) => index * 5), minute])).sort((a, b) => a - b),
    [minute]
  );
  const panelAlignmentClassName = align === "start" ? "xl:left-0" : "xl:right-0";

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: globalThis.PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    requestAnimationFrame(() => {
      scrollToMiddleOption(hourListRef.current, hourOptions.indexOf(hour), hourOptions.length);
      scrollToMiddleOption(minuteListRef.current, minuteOptions.indexOf(minute), minuteOptions.length);
    });
  }, [hour, hourOptions, minute, minuteOptions, open]);

  return (
    <div ref={containerRef} className="relative mt-1">
      <button
        type="button"
        className="w-full rounded-base border border-border bg-surface px-3 py-2 text-left text-sm font-bold text-foreground transition hover:border-primary focus:border-primary focus:outline-none"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {composeTimeValue(hour, minute)}
      </button>
      {open ? (
        <div className={["relative z-40 mt-2 w-full rounded-base border border-border bg-surface p-3 shadow-panel xl:absolute xl:top-full xl:w-[19rem] xl:max-w-[calc(100vw-2rem)] xl:p-4", panelAlignmentClassName].join(" ")}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold text-muted">時刻を選択</p>
            <p className="rounded-base bg-primary-soft px-2 py-1 text-xs font-bold text-primary-strong">{composeTimeValue(hour, minute)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mt-3 text-xs font-bold text-muted">時</p>
              <div ref={hourListRef} className="scrollbar-accent mt-2 max-h-40 snap-y overflow-y-auto rounded-base border border-border bg-surface-muted/45 p-1 sm:max-h-44 xl:max-h-56">
                {hourOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={[
                      "block w-full snap-center rounded-base px-2 py-2 text-center text-xs font-bold transition sm:text-sm lg:px-3 lg:py-2.5",
                      option === hour ? "bg-primary text-white" : "text-foreground hover:bg-primary-soft"
                    ].join(" ")}
                    onClick={() => onChange(composeTimeValue(option, minute))}
                  >
                    {String(option).padStart(2, "0")}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mt-3 text-xs font-bold text-muted">分</p>
              <div ref={minuteListRef} className="scrollbar-accent mt-2 max-h-40 snap-y overflow-y-auto rounded-base border border-border bg-surface-muted/45 p-1 sm:max-h-44 xl:max-h-56">
                {minuteOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={[
                      "block w-full snap-center rounded-base px-2 py-2 text-center text-xs font-bold transition sm:text-sm lg:px-3 lg:py-2.5",
                      option === minute ? "bg-primary text-white" : "text-foreground hover:bg-primary-soft"
                    ].join(" ")}
                    onClick={() => onChange(composeTimeValue(hour, option))}
                  >
                    {String(option).padStart(2, "0")}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="mt-3 w-full rounded-base bg-primary px-3 py-2 text-sm font-bold text-white transition hover:bg-primary-strong"
            onClick={() => setOpen(false)}
          >
            決定
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CalendarToolbar({
  view,
  cursorDate,
  weekStartsOn,
  onViewChange,
  onToday,
  onMove
}: {
  view: CalendarView;
  cursorDate: Date;
  weekStartsOn: 0 | 1;
  onViewChange: (view: CalendarView) => void;
  onToday: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="hidden min-w-[13rem] lg:block">
        <p className="text-xs font-bold text-primary-strong">予定・配信管理</p>
        <h1 className="truncate text-xl font-black tracking-tight text-foreground">Schedule Calendar</h1>
        <p className="mt-1 text-xs font-semibold text-muted">予定作成から告知文、サムネ、分割画像までつなげます。</p>
      </div>
      <div className="grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-2 md:flex md:flex-wrap md:justify-end">
        <button type="button" className="flat-control shrink-0 px-3 py-2" onClick={onToday}>
          今日
        </button>
        <div className="flex shrink-0 items-center overflow-hidden rounded-base border border-border bg-surface">
          <button
            type="button"
            className="px-3 py-2 text-sm font-bold text-muted transition hover:bg-surface-muted hover:text-foreground"
            aria-label="前の期間へ"
            onClick={() => onMove(-1)}
          >
            ‹
          </button>
          <button
            type="button"
            className="border-l border-border px-3 py-2 text-sm font-bold text-muted transition hover:bg-surface-muted hover:text-foreground"
            aria-label="次の期間へ"
            onClick={() => onMove(1)}
          >
            ›
          </button>
        </div>
        <div className="min-w-0 rounded-base border border-border bg-surface-muted px-3 py-2 text-center text-xs font-bold text-foreground md:min-w-[13.5rem] md:flex-1 md:text-sm lg:flex-none">
          {getPeriodLabel(cursorDate, view, weekStartsOn)}
        </div>
        <div className="col-span-3 grid grid-cols-3 rounded-base border border-border bg-surface p-1 md:col-span-1 md:flex md:shrink-0">
          {(Object.keys(viewLabels) as CalendarView[]).map((item) => (
            <button
              key={item}
              type="button"
              className={[
                "rounded-base px-3 py-1.5 text-sm font-bold transition",
                view === item ? "bg-primary text-white" : "text-muted hover:bg-surface-muted hover:text-foreground"
              ].join(" ")}
              onClick={() => onViewChange(item)}
            >
              {viewLabels[item]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CategoryLegend() {
  return (
    <div className="scrollbar-accent hidden shrink-0 items-center gap-2 overflow-x-auto border-b border-border px-4 py-2 text-xs font-bold text-muted lg:flex">
      <span className="whitespace-nowrap">カテゴリ</span>
      {categoryOptions.map((option) => (
        <span
          key={option.value}
          className={["whitespace-nowrap rounded-base border px-2 py-1", categoryMeta[option.value].tone].join(" ")}
        >
          {option.label}
        </span>
      ))}
    </div>
  );
}

function TimeLabelColumn() {
  return (
    <div className="border-r border-border">
      {timeSlots.map((minutes) => {
        const isHour = minutes % 60 === 0;
        return (
          <div
            key={minutes}
            className={[
              timeSlotHeightClassName,
              "border-t px-2 pt-1 text-[11px] font-bold",
              minutes === timelineEndMinutes - 30 ? "border-b" : "",
              isHour ? "border-border/80 text-muted" : "border-border/35 text-muted/55"
            ].join(" ")}
          >
            {isHour ? formatSlot(minutes) : null}
          </div>
        );
      })}
    </div>
  );
}

function TimeSlotLines() {
  return (
    <>
      {timeSlots.map((minutes) => (
        <span
          key={minutes}
          className={[
            "pointer-events-none block border-t",
            timeSlotHeightClassName,
            minutes === timelineEndMinutes - 30 ? "border-b" : "",
            minutes % 60 === 0 ? "border-border/80" : "border-border/35"
          ].join(" ")}
        />
      ))}
    </>
  );
}

function EventPill({
  event,
  selected,
  compact = false,
  previewPlacement,
  onSelect,
  onDragStart,
  onDragEnd
}: {
  event: ScheduleEvent;
  selected: boolean;
  compact?: boolean;
  previewPlacement?: EventPreviewPlacement;
  onSelect: (event: ScheduleEvent) => void;
  onDragStart?: (event: ScheduleEvent, detail: DragEvent<HTMLButtonElement>) => void;
  onDragEnd?: () => void;
}) {
  const meta = categoryMeta[event.category];

  return (
    <div className="group relative h-full w-full">
      <button
        type="button"
        draggable={Boolean(onDragStart)}
        onDragStart={(detail) => onDragStart?.(event, detail)}
        onDragEnd={onDragEnd}
        onClick={(detail) => {
          detail.stopPropagation();
          onSelect(event);
        }}
        className={[
          "h-full w-full overflow-hidden rounded-base border px-2 py-1 text-left transition hover:border-primary/70 hover:shadow-sm",
          meta.tone,
          selected ? "ring-2 ring-primary/45" : ""
        ].join(" ")}
      >
        <span className="flex items-center gap-1.5 text-[11px] font-bold">
          <span className={["h-1.5 w-1.5 rounded-full", meta.dot].join(" ")} />
          {event.startTime}
          {!compact ? ` - ${event.endTime}` : ""}
        </span>
        <span className="mt-0.5 block truncate text-xs font-bold">{event.title || "無題の予定"}</span>
      </button>
      <EventHoverPreview event={event} placement={previewPlacement ?? { side: "center", vertical: getPreviewVerticalPlacement(event) }} />
    </div>
  );
}

function MonthEventRow({
  event,
  selected,
  previewPlacement,
  onSelect,
  onDragStart
}: {
  event: ScheduleEvent;
  selected: boolean;
  previewPlacement?: EventPreviewPlacement;
  onSelect: (event: ScheduleEvent) => void;
  onDragStart?: (event: ScheduleEvent, detail: DragEvent<HTMLButtonElement>) => void;
}) {
  const meta = categoryMeta[event.category];

  return (
    <div className="group relative">
      <button
        type="button"
        draggable={Boolean(onDragStart)}
        onDragStart={(detail) => onDragStart?.(event, detail)}
        onClick={(detail) => {
          detail.stopPropagation();
          onSelect(event);
        }}
        className={[
          "flex h-6 w-full items-center gap-1.5 rounded-base border px-1.5 text-left text-[11px] font-bold transition",
          "hover:border-primary/70 hover:bg-surface-muted",
          selected ? "border-primary bg-primary-soft/45" : "border-border bg-surface-muted/70"
        ].join(" ")}
      >
        <span className={["h-1.5 w-1.5 shrink-0 rounded-full", meta.dot].join(" ")} />
        <span className="shrink-0 text-muted">{event.startTime}</span>
        <span className="min-w-0 truncate text-foreground">{event.title || "無題の予定"}</span>
      </button>
      <EventHoverPreview event={event} placement={previewPlacement ?? { side: "center", vertical: "below" }} />
    </div>
  );
}

function WeekView({
  events,
  cursorDate,
  weekStartsOn,
  selectedDateKey,
  selectedEventId,
  onSelectDate,
  onSelectEvent,
  onMoveEventDate
}: {
  events: ScheduleEvent[];
  cursorDate: Date;
  weekStartsOn: 0 | 1;
  selectedDateKey: string;
  selectedEventId: string | null;
  onSelectDate: (dateKey: string) => void;
  onSelectEvent: (event: ScheduleEvent) => void;
  onMoveEventDate: (event: ScheduleEvent, dateKey: string, startMinutes?: number) => void;
}) {
  const days = getWeekDays(cursorDate, weekStartsOn);
  const todayKey = toDateKey(new Date());
  const { scrollContainerRef, scrollbarWidth } = useMeasuredScrollbarWidth();
  const [dragGuide, setDragGuide] = useState<DragGuide | null>(null);

  const weekHeaderGridStyle = {
    gridTemplateColumns: `${weekGridTemplateColumns} ${scrollbarWidth}px`
  };
  const weekBodyGridStyle = {
    gridTemplateColumns: weekGridTemplateColumns
  };

  return (
    <div className="flex h-full min-w-[636px] min-h-0 flex-col">
      <div className="grid shrink-0 border-b border-border bg-surface-muted/70" style={weekHeaderGridStyle}>
        <div className="border-r border-border px-1.5 py-3 text-center text-xs font-bold text-muted">時刻</div>
        {days.map((day, dayIndex) => {
          const key = toDateKey(day);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(key)}
              className={[
                "px-1.5 py-3 text-center text-sm transition hover:bg-primary-soft/35",
                dayIndex === days.length - 1 ? "" : "border-r border-border",
                selectedDateKey === key ? "bg-primary-soft text-primary-strong" : "text-foreground"
              ].join(" ")}
            >
              <span className="block text-xs font-bold text-muted">{getShortDateLabel(day).split(" ")[1]}</span>
              <span
                className={[
                  "mt-1 inline-grid h-8 min-w-8 place-items-center rounded-base px-1.5 font-bold",
                  todayKey === key ? "bg-primary text-white" : ""
                ].join(" ")}
              >
                {day.getMonth() + 1}/{day.getDate()}
              </span>
            </button>
          );
        })}
        <div aria-hidden="true" />
      </div>
      <div ref={scrollContainerRef} className="scrollbar-accent min-h-0 flex-1 overflow-y-auto">
        <div className="grid" style={weekBodyGridStyle}>
          <TimeLabelColumn />
          {days.map((day, dayIndex) => {
            const key = toDateKey(day);
            const dayEvents = getEventsForDate(events, key);
            const guideEvent = events.find((event) => event.id === selectedEventId);
            return (
              <div
                key={key}
                role="button"
                tabIndex={0}
                onClick={() => onSelectDate(key)}
                onDragOver={(detail) => {
                  detail.preventDefault();
                  if (!guideEvent) {
                    return;
                  }

                  setDragGuide({
                    dateKey: key,
                    startMinutes: getDropStartMinutes(detail),
                    durationMinutes: getEventDurationMinutes(guideEvent)
                  });
                }}
                onDragLeave={() => setDragGuide((current) => (current?.dateKey === key ? null : current))}
                onDrop={(detail) => {
                  detail.preventDefault();
                  const draggedEventId = getDraggedEventId(detail);
                  const draggedEvent = events.find((event) => event.id === draggedEventId);
                  if (draggedEvent) {
                    onMoveEventDate(draggedEvent, key, getDropStartMinutes(detail));
                  }
                  setDragGuide(null);
                }}
                onKeyDown={(event) => handleDateKeyDown(event, () => onSelectDate(key))}
                className={[
                  "relative text-left",
                  dayIndex === days.length - 1 ? "" : "border-r border-border",
                  timeGridMinHeightClassName,
                  selectedDateKey === key ? "bg-primary-soft/20" : "bg-surface"
                ].join(" ")}
              >
                <TimeSlotLines />
                {dragGuide?.dateKey === key ? <DragMoveGuide guide={dragGuide} /> : null}
                {dayEvents.length === 0 ? (
                  <span className="absolute left-2 right-2 top-1 flex h-6 items-center justify-center rounded-base border border-dashed border-border bg-surface-muted/55 px-2 text-center text-[11px] font-bold text-muted">
                    予定なし
                  </span>
                ) : null}
                {dayEvents.map((event) => (
                  <span key={event.id} className="absolute left-2 right-2 block" style={getEventStyle(event)}>
                    <EventPill
                      event={event}
                      selected={selectedEventId === event.id}
                      previewPlacement={{
                        side: getPreviewSidePlacement(dayIndex, days.length),
                        vertical: getPreviewVerticalPlacement(event)
                      }}
                      onSelect={onSelectEvent}
                      onDragStart={(draggedEvent, detail) => {
                        setDraggedEvent(detail, draggedEvent);
                        onSelectEvent(draggedEvent);
                      }}
                      onDragEnd={() => setDragGuide(null)}
                    />
                  </span>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MonthView({
  events,
  cursorDate,
  weekStartsOn,
  selectedDateKey,
  selectedEventId,
  onSelectDate,
  onSelectEvent,
  onMoveEventDate
}: {
  events: ScheduleEvent[];
  cursorDate: Date;
  weekStartsOn: 0 | 1;
  selectedDateKey: string;
  selectedEventId: string | null;
  onSelectDate: (dateKey: string) => void;
  onSelectEvent: (event: ScheduleEvent) => void;
  onMoveEventDate: (event: ScheduleEvent, dateKey: string) => void;
}) {
  const days = getMonthGrid(cursorDate, weekStartsOn);
  const todayKey = toDateKey(new Date());
  const { scrollContainerRef, scrollbarWidth } = useMeasuredScrollbarWidth();
  const monthHeaderGridStyle = {
    gridTemplateColumns: `repeat(7, minmax(0, 1fr)) ${scrollbarWidth}px`
  };
  const weekdayLabels = weekStartsOn === 1 ? ["月", "火", "水", "木", "金", "土", "日"] : ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <div className="flex h-full min-w-[720px] min-h-0 flex-col">
      <div className="grid shrink-0 border-b border-border bg-surface-muted/70" style={monthHeaderGridStyle}>
        {weekdayLabels.map((label, dayIndex) => (
          <div
            key={label}
            className={[
              "px-2 py-2 text-center text-xs font-bold text-muted",
              dayIndex === 6 ? "" : "border-r border-border"
            ].join(" ")}
          >
            {label}
          </div>
        ))}
        <div aria-hidden="true" />
      </div>
      <div ref={scrollContainerRef} className="scrollbar-accent min-h-0 flex-1 overflow-y-auto">
        <div className="grid grid-cols-7">
          {days.map((day, dayIndex) => {
            const key = toDateKey(day);
            const dayEvents = getEventsForDate(events, key);
            const inCurrentMonth = day.getMonth() === cursorDate.getMonth();
            return (
              <div
                key={key}
                role="button"
                tabIndex={0}
                onClick={() => onSelectDate(key)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(detail) => {
                  const draggedEventId = getDraggedEventId(detail);
                  const draggedEvent = events.find((event) => event.id === draggedEventId);
                  if (draggedEvent) {
                    onMoveEventDate(draggedEvent, key);
                  }
                }}
                onKeyDown={(event) => handleDateKeyDown(event, () => onSelectDate(key))}
                className={[
                  "min-h-28 border-b border-border p-2 text-left transition hover:bg-primary-soft/25",
                  dayIndex % 7 === 6 ? "" : "border-r",
                  selectedDateKey === key ? "bg-primary-soft/35" : "bg-surface",
                  inCurrentMonth ? "" : "text-muted/65"
                ].join(" ")}
              >
                <span
                  className={[
                    "inline-grid h-7 min-w-7 place-items-center rounded-base px-1 text-xs font-bold",
                    todayKey === key ? "bg-primary text-white" : "text-foreground"
                  ].join(" ")}
                >
                  {day.getDate()}
                </span>
                <span className="mt-2 flex flex-col gap-1">
                  {dayEvents.slice(0, 2).map((event) => (
                    <MonthEventRow
                      key={event.id}
                      event={event}
                      selected={selectedEventId === event.id}
                      previewPlacement={{
                        side: getPreviewSidePlacement(dayIndex % 7, 7),
                        vertical: getMonthPreviewVerticalPlacement(dayIndex)
                      }}
                      onSelect={onSelectEvent}
                      onDragStart={(draggedEvent, detail) => {
                        setDraggedEvent(detail, draggedEvent);
                        onSelectEvent(draggedEvent);
                      }}
                    />
                  ))}
                  {dayEvents.length > 2 ? (
                    <span className="rounded-base bg-surface-muted/70 px-1.5 py-1 text-[11px] font-bold text-muted">
                      他 {dayEvents.length - 2} 件
                    </span>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MobileMonthView({
  events,
  cursorDate,
  weekStartsOn,
  selectedDateKey,
  onSelectDate
}: {
  events: ScheduleEvent[];
  cursorDate: Date;
  weekStartsOn: 0 | 1;
  selectedDateKey: string;
  onSelectDate: (dateKey: string) => void;
}) {
  const days = getMonthGrid(cursorDate, weekStartsOn);
  const todayKey = toDateKey(new Date());

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-surface">
      <div className="grid grid-cols-7 border-b border-border bg-surface-muted/70 text-center text-[11px] font-bold text-muted">
        {(weekStartsOn === 1 ? ["月", "火", "水", "木", "金", "土", "日"] : ["日", "月", "火", "水", "木", "金", "土"]).map((label) => (
          <span key={label} className="py-2">
            {label}
          </span>
        ))}
      </div>
      <div className="scrollbar-accent grid min-h-0 flex-1 grid-cols-7 auto-rows-[minmax(4.65rem,1fr)] overflow-x-hidden overflow-y-auto">
        {days.map((day) => {
          const key = toDateKey(day);
          const dayEvents = getEventsForDate(events, key);
          const firstEvent = dayEvents[0];
          const inCurrentMonth = day.getMonth() === cursorDate.getMonth();
          const selected = selectedDateKey === key;
          const today = todayKey === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(key)}
              className={[
                "min-h-[4.65rem] min-w-0 overflow-hidden border-b border-r border-border p-1.5 text-left transition",
                selected ? "bg-primary-soft/55" : "bg-surface",
                inCurrentMonth ? "text-foreground" : "text-muted/45"
              ].join(" ")}
              aria-label={`${getLongDateLabel(key)}を選択`}
            >
              <span
                className={[
                  "grid h-6 w-6 place-items-center rounded-base text-xs font-black",
                  today ? "bg-primary text-white" : "",
                  selected && !today ? "border border-primary text-primary-strong" : ""
                ].join(" ")}
              >
                {day.getDate()}
              </span>
              {firstEvent ? (
                <span className="mt-1 block min-w-0 overflow-hidden rounded-base border border-primary/35 bg-primary-soft/50 px-1.5 py-1 text-[10px] font-bold leading-4 text-foreground">
                  <span className="block truncate">{firstEvent.startTime}</span>
                  <span className="block truncate">{firstEvent.title || "無題の予定"}</span>
                </span>
              ) : null}
              {dayEvents.length > 1 ? (
                <span className="mt-1 block text-[10px] font-bold text-primary-strong">+{dayEvents.length - 1}件</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DayView({
  events,
  selectedDateKey,
  selectedEventId,
  onSelectEvent,
  onMoveEventDate
}: {
  events: ScheduleEvent[];
  selectedDateKey: string;
  selectedEventId: string | null;
  onSelectEvent: (event: ScheduleEvent) => void;
  onMoveEventDate: (event: ScheduleEvent, dateKey: string, startMinutes?: number) => void;
}) {
  const dayEvents = getEventsForDate(events, selectedDateKey);
  const [dragGuide, setDragGuide] = useState<DragGuide | null>(null);
  const guideEvent = events.find((event) => event.id === selectedEventId);

  return (
    <div className="flex h-full min-w-[620px] min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface-muted/70 px-4 py-3 text-sm font-bold text-foreground [scrollbar-gutter:stable]">
        <span>{getLongDateLabel(selectedDateKey)}</span>
        <span className="rounded-base border border-border bg-surface px-2 py-1 text-xs text-muted">予定 {dayEvents.length} 件</span>
      </div>
      <div className="scrollbar-accent min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        <div className="grid grid-cols-[64px_1fr]">
          <TimeLabelColumn />
          <div
            className={["relative bg-surface", timeGridMinHeightClassName].join(" ")}
            onDragOver={(detail) => {
              detail.preventDefault();
              if (!guideEvent) {
                return;
              }

              setDragGuide({
                dateKey: selectedDateKey,
                startMinutes: getDropStartMinutes(detail),
                durationMinutes: getEventDurationMinutes(guideEvent)
              });
            }}
            onDragLeave={() => setDragGuide(null)}
            onDrop={(detail) => {
              detail.preventDefault();
              const draggedEventId = getDraggedEventId(detail);
              const draggedEvent = events.find((event) => event.id === draggedEventId);
              if (draggedEvent) {
                onMoveEventDate(draggedEvent, selectedDateKey, getDropStartMinutes(detail));
              }
              setDragGuide(null);
            }}
          >
            <TimeSlotLines />
            {dragGuide ? <DragMoveGuide guide={dragGuide} /> : null}
            {dayEvents.length === 0 ? (
              <div className="absolute left-3 right-3 top-1 flex min-h-8 items-center justify-center rounded-base border border-dashed border-border bg-surface-muted/55 px-3 py-1 text-center text-[11px] font-bold leading-4 text-muted">
                {scheduleStartGuide}
              </div>
            ) : null}
            {dayEvents.map((event) => (
              <div key={event.id} className="absolute left-4 right-4" style={getEventStyle(event)}>
                <EventPill
                  event={event}
                  selected={selectedEventId === event.id}
                  previewPlacement={{
                    side: "center",
                    vertical: getPreviewVerticalPlacement(event)
                  }}
                  onSelect={onSelectEvent}
                  onDragStart={(draggedEvent, detail) => {
                    setDraggedEvent(detail, draggedEvent);
                    onSelectEvent(draggedEvent);
                  }}
                  onDragEnd={() => setDragGuide(null)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileDateStrip({
  cursorDate,
  weekStartsOn,
  selectedDateKey,
  events,
  onSelectDate
}: {
  cursorDate: Date;
  weekStartsOn: 0 | 1;
  selectedDateKey: string;
  events: ScheduleEvent[];
  onSelectDate: (dateKey: string) => void;
}) {
  const days = getWeekDays(cursorDate, weekStartsOn);
  const todayKey = toDateKey(new Date());

  return (
    <div className="scrollbar-accent flex gap-2 overflow-x-auto border-b border-border bg-surface px-4 py-3">
      {days.map((day) => {
        const key = toDateKey(day);
        const eventCount = getEventsForDate(events, key).length;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelectDate(key)}
            className={[
              "grid min-w-14 place-items-center rounded-base border px-2 py-2 text-center transition",
              selectedDateKey === key ? "border-primary bg-primary text-white" : "border-border bg-surface-muted text-foreground"
            ].join(" ")}
            aria-label={`${getLongDateLabel(key)}を表示`}
          >
            <span className={["text-[11px] font-bold", selectedDateKey === key ? "text-white/80" : "text-muted"].join(" ")}>
              {getShortDateLabel(day).split(" ")[1]}
            </span>
            <span className="mt-1 text-base font-black">{day.getDate()}</span>
            <span
              className={[
                "mt-1 h-1.5 w-1.5 rounded-full",
                eventCount > 0 ? (selectedDateKey === key ? "bg-white" : "bg-primary") : "bg-transparent",
                todayKey === key && eventCount === 0 ? "ring-2 ring-primary" : ""
              ].join(" ")}
            />
          </button>
        );
      })}
    </div>
  );
}

function MobileDayTimeline({
  events,
  selectedDateKey,
  selectedEventId,
  onSelectEvent,
  onSelectTime
}: {
  events: ScheduleEvent[];
  selectedDateKey: string;
  selectedEventId: string | null;
  onSelectEvent: (event: ScheduleEvent) => void;
  onSelectTime: (minutes: number) => void;
}) {
  const dayEvents = getEventsForDate(events, selectedDateKey);

  return (
    <div className="min-h-0 flex-1 overflow-hidden bg-surface">
      <div className="flex items-center justify-between border-b border-border bg-surface-muted/70 px-4 py-3 text-sm font-bold text-foreground">
        <span>{getLongDateLabel(selectedDateKey)}</span>
        <span className="rounded-base border border-border bg-surface px-2 py-1 text-xs text-muted">予定 {dayEvents.length} 件</span>
      </div>
      <div className="scrollbar-accent h-full overflow-y-auto pb-20">
        <div className="grid grid-cols-[52px_1fr]">
          <TimeLabelColumn />
          <div className="relative min-h-[1152px] bg-surface">
            <TimeSlotLines />
            <div className="absolute inset-0 grid">
              {timeSlots.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  className={timeSlotHeightClassName}
                  aria-label={`${formatSlot(minutes)}に新規予定を作成`}
                  onClick={() => onSelectTime(minutes)}
                />
              ))}
            </div>
            {dayEvents.length === 0 ? (
              <div className="absolute left-3 right-3 top-2 rounded-base border border-dashed border-border bg-surface-muted/70 px-3 py-3 text-center text-sm font-bold text-muted">
                {mobileScheduleStartGuide}
              </div>
            ) : null}
            {dayEvents.map((event) => (
              <div key={event.id} className="absolute left-3 right-3" style={getEventStyle(event)}>
                <EventPill event={event} selected={selectedEventId === event.id} onSelect={onSelectEvent} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileCalendarSurface({
  view,
  events,
  cursorDate,
  weekStartsOn,
  selectedDateKey,
  selectedEventId,
  onSelectDate,
  onSelectMonthDate,
  onSelectEvent,
  onSelectTime
}: {
  view: CalendarView;
  events: ScheduleEvent[];
  cursorDate: Date;
  weekStartsOn: 0 | 1;
  selectedDateKey: string;
  selectedEventId: string | null;
  onSelectDate: (dateKey: string) => void;
  onSelectMonthDate: (dateKey: string) => void;
  onSelectEvent: (event: ScheduleEvent) => void;
  onSelectTime: (minutes: number) => void;
}) {
  if (view === "month") {
    return (
      <MobileMonthView
        events={events}
        cursorDate={cursorDate}
        weekStartsOn={weekStartsOn}
        selectedDateKey={selectedDateKey}
        onSelectDate={onSelectMonthDate}
      />
    );
  }

  return (
    <>
      {view === "week" ? (
        <MobileDateStrip
          cursorDate={cursorDate}
          weekStartsOn={weekStartsOn}
          selectedDateKey={selectedDateKey}
          events={events}
          onSelectDate={onSelectDate}
        />
      ) : null}
      <MobileDayTimeline
        events={events}
        selectedDateKey={selectedDateKey}
        selectedEventId={selectedEventId}
        onSelectEvent={onSelectEvent}
        onSelectTime={onSelectTime}
      />
    </>
  );
}

type EventListFilters = {
  query: string;
  category: EventCategory | "all";
  platform: EventPlatform | "all";
  announcementStatus: AnnouncementStatus | "all";
  period: EventPeriodFilter;
  sortOrder: EventSortOrder;
};

type SettingsSectionId = "display" | "defaults" | "data" | "templates" | "hashtags";

function MobileEventList({
  events,
  filters,
  selectedEventId,
  onFilterChange,
  onSelectEvent
}: {
  events: ScheduleEvent[];
  filters: EventListFilters;
  selectedEventId: string | null;
  onFilterChange: (filters: EventListFilters) => void;
  onSelectEvent: (event: ScheduleEvent) => void;
}) {
  return (
    <div className={["scrollbar-accent min-h-0 flex-1 overflow-y-auto bg-surface px-4 pb-24 pt-4", mobileOnlyClassName].join(" ")}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-foreground">予定一覧</h2>
        <span className="rounded-base border border-border bg-surface-muted px-2 py-1 text-xs font-bold text-muted">
          {events.length} 件
        </span>
      </div>
      <div className="mt-4 space-y-3 rounded-base border border-border bg-surface-muted/35 p-3">
        <input
          value={filters.query}
          onChange={(event) => onFilterChange({ ...filters, query: event.target.value })}
          className={inputClassName("mt-0")}
          placeholder="タイトルを検索"
        />
        <div className="grid grid-cols-2 gap-2">
          <SelectMenuControl
            value={filters.category}
            options={eventCategoryFilterOptions}
            onChange={(category) => onFilterChange({ ...filters, category })}
            ariaLabel="カテゴリで絞り込み"
            className="mt-0"
          />
          <SelectMenuControl
            value={filters.platform}
            options={eventPlatformFilterOptions}
            onChange={(platform) => onFilterChange({ ...filters, platform })}
            ariaLabel="プラットフォームで絞り込み"
            className="mt-0"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <SelectMenuControl
            value={filters.period}
            options={eventPeriodOptions}
            onChange={(period) => onFilterChange({ ...filters, period })}
            ariaLabel="期間で絞り込み"
            className="mt-0"
          />
          <SelectMenuControl
            value={filters.announcementStatus}
            options={announcementStatusFilterOptions}
            onChange={(announcementStatus) => onFilterChange({ ...filters, announcementStatus })}
            ariaLabel="告知ステータスで絞り込み"
            className="mt-0"
          />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {events.length === 0 ? (
          <div className="rounded-base border border-dashed border-border bg-surface-muted/65 px-3 py-8 text-center text-sm font-bold text-muted">
            {hasActiveEventListFilters(filters) ? emptySearchResultsMessage : emptyEventsMessage}
          </div>
        ) : (
          events.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => onSelectEvent(event)}
              className={[
                "w-full rounded-base border px-3 py-3 text-left transition",
                selectedEventId === event.id ? "border-primary bg-primary-soft/55" : "border-border bg-surface-muted/45"
              ].join(" ")}
            >
              <span className="text-xs font-bold text-primary-strong">{getLongDateLabel(event.date)}</span>
              <span className="mt-1 block text-xs font-bold text-muted">
                {event.startTime} - {event.endTime}
              </span>
              <span className="mt-1 block text-sm font-bold text-foreground">{event.title || "無題の予定"}</span>
              <span className="mt-2 inline-flex rounded-base bg-surface px-2 py-1 text-xs font-bold text-muted">
                {categoryMeta[event.category].label}
                {event.platform ? ` / ${event.platform}` : ""}
                {` / ${getAnnouncementStatusLabel(event.announcementStatus)}`}
                {event.recurrence && event.recurrence !== "none" ? ` / ${recurrenceOptions.find((option) => option.value === event.recurrence)?.label}` : ""}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function SettingsAccordionSection({
  id,
  title,
  summary,
  open,
  onToggle,
  children
}: {
  id: SettingsSectionId;
  title: string;
  summary: string;
  open: boolean;
  onToggle: (id: SettingsSectionId) => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-base border border-border bg-surface-muted/35">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
        onClick={() => onToggle(id)}
      >
        <span className="min-w-0">
          <span className="block text-sm font-bold text-foreground">{title}</span>
          <span className="mt-1 block truncate text-xs font-bold text-muted">{summary}</span>
        </span>
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-base border border-border bg-surface text-lg leading-none text-muted">
          {open ? "-" : "+"}
        </span>
      </button>
      {open ? <div className="space-y-3 border-t border-border px-4 py-4">{children}</div> : null}
    </section>
  );
}

function TemplateDraftEditor({
  templateDraft,
  onTemplateDraftChange,
  onSave
}: {
  templateDraft: PostTemplate;
  onTemplateDraftChange: (template: PostTemplate) => void;
  onSave: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  function insertVariable(token: string) {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? templateDraft.body.length;
    const end = textarea?.selectionEnd ?? templateDraft.body.length;
    const nextBody = clampScheduleText(
      `${templateDraft.body.slice(0, start)}${token}${templateDraft.body.slice(end)}`,
      scheduleInputTextLimits.postTemplateBody
    );
    onTemplateDraftChange({ ...templateDraft, body: nextBody });

    window.setTimeout(() => {
      textarea?.focus();
      const nextPosition = Math.min(start + token.length, nextBody.length);
      textarea?.setSelectionRange(nextPosition, nextPosition);
    }, 0);
  }

  return (
    <div className="rounded-base border border-border bg-surface px-3 py-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <div>
          <FieldLabel>テンプレ名</FieldLabel>
          <input value={templateDraft.name} onChange={(event) => onTemplateDraftChange({ ...templateDraft, name: event.target.value })} className={inputClassName()} />
        </div>
        <div>
          <FieldLabel>用途カテゴリ</FieldLabel>
          <SelectMenuControl
            value={templateDraft.usageCategory}
            options={postTemplateUsageOptions}
            onChange={(usageCategory) => onTemplateDraftChange({ ...templateDraft, usageCategory })}
            ariaLabel="用途カテゴリ"
          />
        </div>
        <div>
          <FieldLabel>既定プラットフォーム</FieldLabel>
          <SelectMenuControl
            value={templateDraft.defaultPlatform}
            options={platformOptions.map((option) => ({ value: option, label: option || "-" }))}
            onChange={(defaultPlatform) => onTemplateDraftChange({ ...templateDraft, defaultPlatform })}
            ariaLabel="既定プラットフォーム"
          />
        </div>
        <div>
          <FieldLabel>説明</FieldLabel>
          <input value={templateDraft.description} onChange={(event) => onTemplateDraftChange({ ...templateDraft, description: event.target.value })} className={inputClassName()} />
        </div>
      </div>
      <div className="mt-3">
        <FieldLabel>本文</FieldLabel>
        <textarea
          ref={textareaRef}
          value={templateDraft.body}
          onChange={(event) =>
            onTemplateDraftChange({
              ...templateDraft,
              body: clampScheduleText(event.target.value, scheduleInputTextLimits.postTemplateBody)
            })
          }
          className={inputClassName("min-h-32 resize-none")}
          maxLength={scheduleInputTextLimits.postTemplateBody}
        />
        <TextLimitCounter
          value={templateDraft.body}
          maxLength={scheduleInputTextLimits.postTemplateBody}
          warning="長文テンプレートはプレビューとコピーの見通しが悪くなります。"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {postTemplateVariableOptions.map((option) => (
            <button key={option.token} type="button" onClick={() => insertVariable(option.token)} className="flat-control px-2 py-1 text-xs">
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3">
        <FieldLabel>ハッシュタグ</FieldLabel>
        <textarea
          value={templateDraft.hashtags}
          onChange={(event) =>
            onTemplateDraftChange({
              ...templateDraft,
              hashtags: clampScheduleText(event.target.value, scheduleInputTextLimits.announcementHashtags)
            })
          }
          className={inputClassName("min-h-20 resize-none")}
          placeholder="#VTuber #配信告知"
          maxLength={scheduleInputTextLimits.announcementHashtags}
        />
        <TextLimitCounter
          value={templateDraft.hashtags}
          maxLength={scheduleInputTextLimits.announcementHashtags}
          warning="タグが多いと投稿補助とhandoffが読みにくくなります。"
        />
        <p className="mt-2 text-xs leading-5 text-muted">本文とは別に保存し、コピー時に予定側のハッシュタグと結合します。</p>
      </div>
      <button type="button" onClick={onSave} className="mt-3 w-full rounded-base bg-primary px-3 py-2 text-sm font-bold text-white">
        テンプレートを保存
      </button>
    </div>
  );
}

function HashtagSetDraftEditor({
  hashtagSetDraft,
  onHashtagSetDraftChange,
  onSave
}: {
  hashtagSetDraft: HashtagSet;
  onHashtagSetDraftChange: (hashtagSet: HashtagSet) => void;
  onSave: () => void;
}) {
  return (
    <div className="rounded-base border border-border bg-surface px-3 py-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <div>
          <FieldLabel>セット名</FieldLabel>
          <input
            value={hashtagSetDraft.name}
            onChange={(event) => onHashtagSetDraftChange({ ...hashtagSetDraft, name: event.target.value })}
            className={inputClassName()}
            placeholder="ゲーム配信"
          />
        </div>
        <div>
          <FieldLabel>ハッシュタグ</FieldLabel>
          <input
            value={hashtagSetDraft.hashtags}
            onChange={(event) => onHashtagSetDraftChange({ ...hashtagSetDraft, hashtags: event.target.value })}
            className={inputClassName()}
            placeholder="#ゲーム配信 #VTuber"
          />
        </div>
      </div>
      <p className="mt-2 text-xs leading-5 text-muted">よく使う組み合わせを保存し、投稿補助プレビューで任意に追加できます。</p>
      <button type="button" onClick={onSave} className="mt-3 w-full rounded-base bg-primary px-3 py-2 text-sm font-bold text-white">
        ハッシュタグセットを保存
      </button>
    </div>
  );
}

function MobileSettingsPanel({
  settings,
  templates,
  hashtagSets = [],
  templateDraft,
  hashtagSetDraft,
  importText,
  settingsStatus,
  onSettingsChange,
  onTemplateDraftChange,
  onHashtagSetDraftChange,
  onAddTemplate,
  onAddHashtagSet,
  onEditTemplate,
  onEditHashtagSet,
  onDeleteTemplate,
  onDeleteHashtagSet,
  onExport,
  onImportTextChange,
  onImport,
  onResetAll
}: {
  settings: ScheduleSettings;
  templates: PostTemplate[];
  hashtagSets: HashtagSet[];
  templateDraft: PostTemplate;
  hashtagSetDraft: HashtagSet;
  importText: string;
  settingsStatus: string;
  onSettingsChange: (settings: ScheduleSettings) => void;
  onTemplateDraftChange: (template: PostTemplate) => void;
  onHashtagSetDraftChange: (hashtagSet: HashtagSet) => void;
  onAddTemplate: () => void;
  onAddHashtagSet: () => void;
  onEditTemplate: (template: PostTemplate) => void;
  onEditHashtagSet: (hashtagSet: HashtagSet) => void;
  onDeleteTemplate: (templateId: string) => void;
  onDeleteHashtagSet: (hashtagSetId: string) => void;
  onExport: () => void;
  onImportTextChange: (value: string) => void;
  onImport: () => void;
  onResetAll: () => void;
}) {
  const [openSections, setOpenSections] = useState<Record<SettingsSectionId, boolean>>({
    display: true,
    defaults: true,
    data: false,
    templates: false,
    hashtags: false
  });
  const defaultTemplateName = templates.find((template) => template.id === settings.defaultTemplateId)?.name ?? "未設定";
  const defaultViewLabel = viewLabels[settings.defaultView];
  const weekStartsOnLabel = settings.weekStartsOn === 1 ? "月曜開始" : "日曜開始";

  function toggleSection(sectionId: SettingsSectionId) {
    setOpenSections((current) => ({ ...current, [sectionId]: !current[sectionId] }));
  }

  return (
    <div className={["scrollbar-accent min-h-0 flex-1 overflow-y-auto bg-surface px-4 pb-24 pt-4", mobileOnlyClassName].join(" ")}>
      <h2 className="text-base font-bold text-foreground">設定</h2>
      {settingsStatus ? <p className="mt-3 rounded-base border border-border bg-surface-muted/55 px-3 py-2 text-sm font-bold text-primary-strong">{settingsStatus}</p> : null}
      <div className="mt-4 space-y-3">
      <SettingsAccordionSection
        id="defaults"
        title="表示・既定値"
        summary={`${defaultViewLabel} / ${weekStartsOnLabel} / ${settings.defaultStartTime} / ${settings.defaultDurationMinutes}分`}
        open={openSections.defaults}
        onToggle={toggleSection}
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>初期表示ビュー</FieldLabel>
            <SelectMenuControl
              value={settings.defaultView}
              options={calendarViewOptions}
              onChange={(defaultView) => onSettingsChange({ ...settings, defaultView })}
              ariaLabel="初期表示ビュー"
            />
          </div>
          <div>
            <FieldLabel>週開始曜日</FieldLabel>
            <SelectMenuControl
              value={settings.weekStartsOn}
              options={weekStartOptions}
              onChange={(weekStartsOn) => onSettingsChange({ ...settings, weekStartsOn })}
              ariaLabel="週開始曜日"
            />
          </div>
          <div>
            <FieldLabel>既定開始時刻</FieldLabel>
            <TimeSelectControl value={settings.defaultStartTime} onChange={(defaultStartTime) => onSettingsChange({ ...settings, defaultStartTime })} />
          </div>
          <div>
            <FieldLabel>既定予定時間</FieldLabel>
            <SelectMenuControl
              value={settings.defaultDurationMinutes}
              options={defaultDurationOptions}
              onChange={(defaultDurationMinutes) => onSettingsChange({ ...settings, defaultDurationMinutes })}
              ariaLabel="既定予定時間"
            />
          </div>
        </div>
      </SettingsAccordionSection>
      <SettingsAccordionSection
        id="data"
        title="データ管理"
        summary="JSONバックアップ / 復元 / 初期化"
        open={openSections.data}
        onToggle={toggleSection}
      >
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onExport} className="flat-control px-3 py-2">
            バックアップ作成
          </button>
          <button type="button" onClick={onImport} className="flat-control px-3 py-2">
            バックアップ復元
          </button>
        </div>
        <p className="text-xs leading-5 text-muted">
          {backupHelpText}
        </p>
        <textarea value={importText} onChange={(event) => onImportTextChange(event.target.value)} className={inputClassName("min-h-24 resize-none")} placeholder="復元するバックアップJSONを貼り付け" />
        <button type="button" onClick={onResetAll} className="w-full rounded-base border border-red-300 px-3 py-2 text-sm font-bold text-red-600">
          全データ初期化
        </button>
      </SettingsAccordionSection>
      <SettingsAccordionSection
        id="hashtags"
        title="保存済みハッシュタグ"
        summary={`${hashtagSets.length}件`}
        open={openSections.hashtags}
        onToggle={toggleSection}
      >
        <div className="space-y-2">
          {hashtagSets.length === 0 ? (
            <p className="rounded-base border border-dashed border-border bg-surface-muted/55 px-3 py-4 text-center text-sm font-bold text-muted">
              保存済みハッシュタグはありません。
            </p>
          ) : (
            hashtagSets.map((hashtagSet) => (
              <div key={hashtagSet.id} className="rounded-base border border-border bg-surface px-3 py-3">
                <p className="text-sm font-bold text-foreground">{hashtagSet.name}</p>
                <p className="mt-1 text-xs leading-5 text-muted">{hashtagSet.hashtags}</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => onEditHashtagSet(hashtagSet)} className="flat-control px-3 py-1.5">
                    編集
                  </button>
                  <button type="button" onClick={() => onDeleteHashtagSet(hashtagSet.id)} className="flat-control border-red-300 px-3 py-1.5 text-red-600">
                    削除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <HashtagSetDraftEditor hashtagSetDraft={hashtagSetDraft} onHashtagSetDraftChange={onHashtagSetDraftChange} onSave={onAddHashtagSet} />
      </SettingsAccordionSection>
      <SettingsAccordionSection
        id="templates"
        title="投稿補助テンプレート"
        summary={`${templates.length}件 / 既定: ${defaultTemplateName}`}
        open={openSections.templates}
        onToggle={toggleSection}
      >
        <div>
          <FieldLabel>既定テンプレート</FieldLabel>
          <SelectMenuControl
            value={settings.defaultTemplateId}
            options={templates.map((template) => ({ value: template.id, label: template.name }))}
            onChange={(defaultTemplateId) => onSettingsChange({ ...settings, defaultTemplateId })}
            ariaLabel="既定テンプレート"
          />
        </div>
        <div className="space-y-2">
          {templates.map((template) => (
            <div key={template.id} className="rounded-base border border-border bg-surface px-3 py-3">
              <p className="text-sm font-bold text-foreground">{template.name}</p>
              <p className="mt-1 text-xs text-muted">{template.description}</p>
              <p className="mt-1 text-xs font-bold text-primary-strong">
                {getTemplateUsageLabel(template)}
                {template.defaultPlatform ? ` / ${template.defaultPlatform}` : ""}
              </p>
              {template.hashtags.trim() ? <p className="mt-1 text-xs leading-5 text-muted">{template.hashtags}</p> : null}
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => onEditTemplate(template)} className="flat-control px-3 py-1.5">
                  編集
                </button>
                <button type="button" onClick={() => onDeleteTemplate(template.id)} className="flat-control border-red-300 px-3 py-1.5 text-red-600">
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
        <TemplateDraftEditor templateDraft={templateDraft} onTemplateDraftChange={onTemplateDraftChange} onSave={onAddTemplate} />
      </SettingsAccordionSection>
      </div>
    </div>
  );
}

function DesktopEventListPanel({
  events,
  filters,
  selectedEventId,
  onFilterChange,
  onSelectEvent
}: {
  events: ScheduleEvent[];
  filters: EventListFilters;
  selectedEventId: string | null;
  onFilterChange: (filters: EventListFilters) => void;
  onSelectEvent: (event: ScheduleEvent) => void;
}) {
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  function toggleExpandedEvent(eventId: string) {
    setExpandedEventId((current) => (current === eventId ? null : eventId));
  }

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-base border border-border bg-surface-muted/35 p-3">
        <FieldLabel>検索</FieldLabel>
        <input
          value={filters.query}
          onChange={(event) => onFilterChange({ ...filters, query: event.target.value })}
          className={inputClassName("mt-0")}
          placeholder="タイトルを検索"
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <FieldLabel>カテゴリ</FieldLabel>
            <SelectMenuControl
              value={filters.category}
              options={eventCategoryFilterOptions}
              onChange={(category) => onFilterChange({ ...filters, category })}
              ariaLabel="カテゴリ"
            />
          </div>
          <div>
            <FieldLabel>媒体</FieldLabel>
            <SelectMenuControl
              value={filters.platform}
              options={eventPlatformFilterOptions}
              onChange={(platform) => onFilterChange({ ...filters, platform })}
              ariaLabel="媒体"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <FieldLabel>期間</FieldLabel>
            <SelectMenuControl
              value={filters.period}
              options={eventPeriodOptions}
              onChange={(period) => onFilterChange({ ...filters, period })}
              ariaLabel="期間"
            />
          </div>
          <div>
            <FieldLabel>並び順</FieldLabel>
            <SelectMenuControl
              value={filters.sortOrder}
              options={eventSortOptions}
              onChange={(sortOrder) => onFilterChange({ ...filters, sortOrder })}
              ariaLabel="並び順"
            />
          </div>
        </div>
        <div>
          <FieldLabel>告知ステータス</FieldLabel>
          <SelectMenuControl
            value={filters.announcementStatus}
            options={announcementStatusFilterOptions}
            onChange={(announcementStatus) => onFilterChange({ ...filters, announcementStatus })}
            ariaLabel="告知ステータス"
          />
        </div>
      </section>
      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-foreground">予定一覧</h2>
          <span className="rounded-base border border-border bg-surface-muted px-2 py-1 text-xs font-bold text-muted">{events.length} 件</span>
        </div>
        <div className="mt-3 space-y-2">
          {events.length === 0 ? (
            <div className="rounded-base border border-dashed border-border bg-surface-muted/60 px-3 py-8 text-center text-sm font-bold text-muted">
              {hasActiveEventListFilters(filters) ? emptySearchResultsMessage : emptyEventsMessage}
            </div>
          ) : (
            events.map((event) => {
              const expanded = expandedEventId === event.id;

              return (
                <article
                  key={event.id}
                  className={[
                    "rounded-base border px-3 py-3 transition",
                    selectedEventId === event.id ? "border-primary bg-primary-soft/55" : "border-border bg-surface"
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-primary-strong">{getLongDateLabel(event.date)}</span>
                      <span className="mt-1 block text-xs font-bold text-muted">
                        {event.startTime} - {event.endTime}
                      </span>
                      <h3 className="mt-1 truncate text-sm font-bold text-foreground">{event.title || "無題の予定"}</h3>
                      <span className="mt-2 inline-flex rounded-base bg-surface-muted px-2 py-1 text-xs font-bold text-muted">
                        {categoryMeta[event.category].label}
                        {event.platform ? ` / ${event.platform}` : ""}
                        {` / ${getAnnouncementStatusLabel(event.announcementStatus)}`}
                        {event.recurrence && event.recurrence !== "none" ? ` / ${getEventRecurrenceLabel(event)}` : ""}
                      </span>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        className="flat-control px-2.5 py-1.5 text-xs"
                        aria-expanded={expanded}
                        onClick={() => toggleExpandedEvent(event.id)}
                      >
                        {expanded ? "閉じる" : "詳細"}
                      </button>
                      <button
                        type="button"
                        className="rounded-base bg-primary px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-primary-strong"
                        onClick={() => onSelectEvent(event)}
                      >
                        編集
                      </button>
                    </div>
                  </div>
                  {expanded ? (
                    <div className="mt-3 border-t border-border pt-3">
                      <EventDetailContent event={event} compact />
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

function DesktopSettingsPanel({
  settings,
  templates,
  hashtagSets = [],
  templateDraft,
  hashtagSetDraft,
  importText,
  settingsStatus,
  storageError,
  onSettingsChange,
  onTemplateDraftChange,
  onHashtagSetDraftChange,
  onAddTemplate,
  onAddHashtagSet,
  onEditTemplate,
  onEditHashtagSet,
  onDeleteTemplate,
  onDeleteHashtagSet,
  onExport,
  onImportTextChange,
  onImport,
  onResetAll
}: {
  settings: ScheduleSettings;
  templates: PostTemplate[];
  hashtagSets: HashtagSet[];
  templateDraft: PostTemplate;
  hashtagSetDraft: HashtagSet;
  importText: string;
  settingsStatus: string;
  storageError: string;
  onSettingsChange: (settings: ScheduleSettings) => void;
  onTemplateDraftChange: (template: PostTemplate) => void;
  onHashtagSetDraftChange: (hashtagSet: HashtagSet) => void;
  onAddTemplate: () => void;
  onAddHashtagSet: () => void;
  onEditTemplate: (template: PostTemplate) => void;
  onEditHashtagSet: (hashtagSet: HashtagSet) => void;
  onDeleteTemplate: (templateId: string) => void;
  onDeleteHashtagSet: (hashtagSetId: string) => void;
  onExport: () => void;
  onImportTextChange: (value: string) => void;
  onImport: () => void;
  onResetAll: () => void;
}) {
  const [openSections, setOpenSections] = useState<Record<SettingsSectionId, boolean>>({
    display: true,
    defaults: true,
    data: false,
    templates: false,
    hashtags: false
  });
  const defaultTemplateName = templates.find((template) => template.id === settings.defaultTemplateId)?.name ?? "未設定";
  const settingsStatusIsError = settingsStatus.includes("できません") || settingsStatus.includes("読み込めません");

  function toggleSection(sectionId: SettingsSectionId) {
    setOpenSections((current) => ({ ...current, [sectionId]: !current[sectionId] }));
  }

  return (
    <div className="space-y-4">
      {settingsStatus || storageError ? (
        <p
          className={[
            "rounded-base border px-3 py-2 text-sm font-bold",
            storageError || settingsStatusIsError
              ? "border-red-300 bg-red-50 text-red-700 dark:bg-red-950/35 dark:text-red-200"
              : "border-border bg-surface-muted/55 text-primary-strong"
          ].join(" ")}
        >
          {storageError || settingsStatus}
        </p>
      ) : null}
      <SettingsAccordionSection
        id="display"
        title="表示設定"
        summary={`${viewLabels[settings.defaultView]} / ${settings.weekStartsOn === 1 ? "月曜開始" : "日曜開始"}`}
        open={openSections.display}
        onToggle={toggleSection}
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>初期表示ビュー</FieldLabel>
            <SelectMenuControl
              value={settings.defaultView}
              options={calendarViewOptions}
              onChange={(defaultView) => onSettingsChange({ ...settings, defaultView })}
              ariaLabel="初期表示ビュー"
            />
          </div>
          <div>
            <FieldLabel>週開始曜日</FieldLabel>
            <SelectMenuControl
              value={settings.weekStartsOn}
              options={weekStartOptions}
              onChange={(weekStartsOn) => onSettingsChange({ ...settings, weekStartsOn })}
              ariaLabel="週開始曜日"
            />
          </div>
        </div>
      </SettingsAccordionSection>
      <SettingsAccordionSection
        id="defaults"
        title="既定値"
        summary={`${settings.defaultStartTime} / ${settings.defaultDurationMinutes}分`}
        open={openSections.defaults}
        onToggle={toggleSection}
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>既定開始時刻</FieldLabel>
            <TimeSelectControl value={settings.defaultStartTime} onChange={(defaultStartTime) => onSettingsChange({ ...settings, defaultStartTime })} />
          </div>
          <div>
            <FieldLabel>既定所要時間</FieldLabel>
            <SelectMenuControl
              value={settings.defaultDurationMinutes}
              options={defaultDurationOptions}
              onChange={(defaultDurationMinutes) => onSettingsChange({ ...settings, defaultDurationMinutes })}
              ariaLabel="既定所要時間"
            />
          </div>
        </div>
      </SettingsAccordionSection>
      <SettingsAccordionSection
        id="hashtags"
        title="保存済みハッシュタグ"
        summary={`${hashtagSets.length}件`}
        open={openSections.hashtags}
        onToggle={toggleSection}
      >
        <div className="space-y-2">
          {hashtagSets.length === 0 ? (
            <p className="rounded-base border border-dashed border-border bg-surface-muted/55 px-3 py-4 text-center text-sm font-bold text-muted">
              保存済みハッシュタグはありません。
            </p>
          ) : (
            hashtagSets.map((hashtagSet) => (
              <div key={hashtagSet.id} className="rounded-base border border-border bg-surface px-3 py-3">
                <p className="text-sm font-bold text-foreground">{hashtagSet.name}</p>
                <p className="mt-1 text-xs leading-5 text-muted">{hashtagSet.hashtags}</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => onEditHashtagSet(hashtagSet)} className="flat-control px-3 py-1.5">
                    編集
                  </button>
                  <button type="button" onClick={() => onDeleteHashtagSet(hashtagSet.id)} className="flat-control border-red-300 px-3 py-1.5 text-red-600">
                    削除
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <HashtagSetDraftEditor hashtagSetDraft={hashtagSetDraft} onHashtagSetDraftChange={onHashtagSetDraftChange} onSave={onAddHashtagSet} />
      </SettingsAccordionSection>
      <SettingsAccordionSection
        id="templates"
        title="投稿補助設定"
        summary={`${templates.length}件 / 既定: ${defaultTemplateName}`}
        open={openSections.templates}
        onToggle={toggleSection}
      >
        <div>
          <FieldLabel>既定テンプレート</FieldLabel>
          <SelectMenuControl
            value={settings.defaultTemplateId}
            options={templates.map((template) => ({ value: template.id, label: template.name }))}
            onChange={(defaultTemplateId) => onSettingsChange({ ...settings, defaultTemplateId })}
            ariaLabel="既定テンプレート"
          />
        </div>
        <div className="space-y-2">
          {templates.map((template) => (
            <div key={template.id} className="rounded-base border border-border bg-surface px-3 py-3">
              <p className="text-sm font-bold text-foreground">{template.name}</p>
              <p className="mt-1 text-xs leading-5 text-muted">{template.description}</p>
              <p className="mt-1 text-xs font-bold text-primary-strong">
                {getTemplateUsageLabel(template)}
                {template.defaultPlatform ? ` / ${template.defaultPlatform}` : ""}
              </p>
              {template.hashtags.trim() ? <p className="mt-1 text-xs leading-5 text-muted">{template.hashtags}</p> : null}
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => onEditTemplate(template)} className="flat-control px-3 py-1.5">
                  編集
                </button>
                <button type="button" onClick={() => onDeleteTemplate(template.id)} className="flat-control border-red-300 px-3 py-1.5 text-red-600">
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
        <TemplateDraftEditor templateDraft={templateDraft} onTemplateDraftChange={onTemplateDraftChange} onSave={onAddTemplate} />
      </SettingsAccordionSection>
      <SettingsAccordionSection
        id="data"
        title="データ管理"
        summary="JSONバックアップ / 復元 / 初期化"
        open={openSections.data}
        onToggle={toggleSection}
      >
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onExport} className="flat-control px-3 py-2">
            バックアップ作成
          </button>
          <button type="button" onClick={onImport} className="flat-control px-3 py-2">
            バックアップ復元
          </button>
        </div>
        <p className="text-xs leading-5 text-muted">
          {backupHelpText}
        </p>
        <textarea value={importText} onChange={(event) => onImportTextChange(event.target.value)} className={inputClassName("min-h-28 resize-none")} placeholder="復元するバックアップJSONを貼り付け" />
        <button type="button" onClick={onResetAll} className="w-full rounded-base border border-red-300 px-3 py-2 text-sm font-bold text-red-600">
          全データ初期化
        </button>
      </SettingsAccordionSection>
    </div>
  );
}

function MobileBottomTabs({
  activeTab,
  onTabChange
}: {
  activeTab: MobileNavTab;
  onTabChange: (tab: MobileNavTab) => void;
}) {
  const items: Array<{ id: MobileNavTab; label: string; icon: string }> = [
    { id: "calendar", label: "カレンダー", icon: "□" },
    { id: "events", label: "予定一覧", icon: "☷" },
    { id: "settings", label: "設定", icon: "⚙" }
  ];

  return (
    <nav className={["fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-3 border-t border-border bg-surface/95 backdrop-blur", mobileOnlyClassName].join(" ")}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onTabChange(item.id)}
          className={[
            "grid place-items-center gap-0.5 text-xs font-bold transition",
            activeTab === item.id ? "text-primary-strong" : "text-muted"
          ].join(" ")}
        >
          <span className="text-lg leading-none">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function ScheduleForm({
  draft,
  hashtagSets = [],
  onDraftChange,
  onSave,
  onDelete,
  onDuplicate,
  onCancel,
  canDelete
}: {
  draft: ScheduleEvent;
  hashtagSets: HashtagSet[];
  onDraftChange: (event: ScheduleEvent) => void;
  onSave: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onCancel: () => void;
  canDelete: boolean;
}) {
  const eventHashtagSets = hashtagSets ?? [];
  const [selectedEventHashtagSetId, setSelectedEventHashtagSetId] = useState("");
  const activeEventHashtagSetId = selectedEventHashtagSetId || eventHashtagSets[0]?.id || "";
  const categorySelectOptions = categoryOptions.map((option) => ({ value: option.value, label: option.label }));
  const platformSelectOptions = platformOptions.map((option) => ({ value: option, label: option || "-" }));
  const hashtagSetSelectOptions = eventHashtagSets.map((hashtagSet) => ({
    value: hashtagSet.id,
    label: hashtagSet.name,
    detail: hashtagSet.hashtags
  }));

  function addHashtagSetToDraft(hashtagSet: HashtagSet) {
    onDraftChange({
      ...draft,
      announcementHashtags: clampScheduleText(
        mergeHashtags(draft.announcementHashtags, hashtagSet.hashtags),
        scheduleInputTextLimits.announcementHashtags
      )
    });
  }

  function addSelectedHashtagSetToDraft() {
    const hashtagSet = eventHashtagSets.find((item) => item.id === activeEventHashtagSetId);
    if (!hashtagSet) {
      return;
    }

    addHashtagSetToDraft(hashtagSet);
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <div className="rounded-base border border-border bg-surface-muted/35 p-3">
        <FieldLabel>タイトル</FieldLabel>
        <input
          value={draft.title}
          onChange={(event) => onDraftChange({ ...draft, title: clampScheduleText(event.target.value, scheduleInputTextLimits.title) })}
          className={inputClassName()}
          placeholder="配信企画会議"
          maxLength={scheduleInputTextLimits.title}
          required
        />
        <TextLimitCounter
          value={draft.title}
          maxLength={scheduleInputTextLimits.title}
          warning="一覧と次ツールで見切れないよう、短めに整えると扱いやすいです。"
        />
      </div>
      <div className="rounded-base border border-border bg-surface-muted/35 p-3">
        <FieldLabel>日付</FieldLabel>
        <DateSelectControl value={draft.date} onChange={(date) => onDraftChange({ ...draft, date })} />
      </div>
      <div className="grid grid-cols-1 gap-3 rounded-base border border-border bg-surface-muted/35 p-3 xl:grid-cols-2">
        <div>
          <FieldLabel>開始時間</FieldLabel>
          <TimeSelectControl value={draft.startTime} onChange={(startTime) => onDraftChange({ ...draft, startTime })} align="start" />
        </div>
        <div>
          <FieldLabel>終了時間</FieldLabel>
          <TimeSelectControl value={draft.endTime} onChange={(endTime) => onDraftChange({ ...draft, endTime })} align="end" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 rounded-base border border-border bg-surface-muted/35 p-3">
        <div>
          <FieldLabel>カテゴリ</FieldLabel>
          <SelectMenuControl
            value={draft.category}
            options={categorySelectOptions}
            onChange={(category) => onDraftChange({ ...draft, category })}
            ariaLabel="カテゴリ"
          />
        </div>
        <div>
          <FieldLabel>プラットフォーム</FieldLabel>
          <SelectMenuControl
            value={draft.platform}
            options={platformSelectOptions}
            onChange={(platform) => onDraftChange({ ...draft, platform })}
            ariaLabel="プラットフォーム"
          />
        </div>
      </div>
      <div className="rounded-base border border-border bg-surface-muted/35 p-3">
        <FieldLabel>メモ・備考</FieldLabel>
        <textarea
          value={draft.memo}
          onChange={(event) => onDraftChange({ ...draft, memo: event.target.value })}
          className={inputClassName("min-h-24 resize-none")}
          placeholder="次回配信のセットリストやコラボ企画案を記録する。"
        />
      </div>
      <div className="space-y-3 rounded-base border border-border bg-surface-muted/35 p-3">
        <div className="grid gap-3">
          <div>
            <FieldLabel>告知ステータス</FieldLabel>
            <SelectMenuControl
              value={draft.announcementStatus}
              options={announcementStatusOptions}
              onChange={(announcementStatus) => onDraftChange({ ...draft, announcementStatus })}
              ariaLabel="告知ステータス"
            />
          </div>
          <div>
            <FieldLabel>告知ハッシュタグ</FieldLabel>
            <input
              value={draft.announcementHashtags}
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  announcementHashtags: clampScheduleText(event.target.value, scheduleInputTextLimits.announcementHashtags)
                })
              }
              className={inputClassName()}
              placeholder="#VTuber #配信告知"
              maxLength={scheduleInputTextLimits.announcementHashtags}
            />
            <TextLimitCounter
              value={draft.announcementHashtags}
              maxLength={scheduleInputTextLimits.announcementHashtags}
              warning="投稿文と次ツールで確認しやすい量に整えると扱いやすいです。"
            />
            {eventHashtagSets.length > 0 ? (
              <div className="mt-2">
                <p className="text-xs font-bold text-muted">保存済みセットから追加</p>
                <div className="mt-1.5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <SelectMenuControl
                    value={activeEventHashtagSetId}
                    options={hashtagSetSelectOptions}
                    onChange={setSelectedEventHashtagSetId}
                    ariaLabel="予定に追加する保存済みハッシュタグセット"
                    className="mt-0"
                  />
                  <button type="button" onClick={addSelectedHashtagSetToDraft} className="flat-control px-3 py-2 text-sm">
                    追加
                  </button>
                </div>
                {activeEventHashtagSetId ? (
                  <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted">
                    {eventHashtagSets.find((hashtagSet) => hashtagSet.id === activeEventHashtagSetId)?.hashtags}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
        <div>
          <FieldLabel>告知文メモ</FieldLabel>
          <textarea
            value={draft.announcementText}
            onChange={(event) =>
              onDraftChange({
                ...draft,
                announcementText: clampScheduleText(event.target.value, scheduleInputTextLimits.announcementText)
              })
            }
            className={inputClassName("min-h-24 resize-none")}
            placeholder="予定固有の告知文や、テンプレートの {announcementText} に差し込む文面。"
            maxLength={scheduleInputTextLimits.announcementText}
          />
          <TextLimitCounter
            value={draft.announcementText}
            maxLength={scheduleInputTextLimits.announcementText}
            warning="投稿前に要点を絞ると、コピーと次ツールへの受け渡しが確認しやすいです。"
          />
        </div>
        <div>
          <FieldLabel>準備メモ</FieldLabel>
          <textarea
            value={draft.announcementMemo}
            onChange={(event) => onDraftChange({ ...draft, announcementMemo: event.target.value })}
            className={inputClassName("min-h-20 resize-none")}
            placeholder="サムネ素材、告知画像、投稿タイミングなど。"
          />
        </div>
      </div>
      <div className="rounded-base border border-border bg-surface-muted/35 p-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>繰り返し</FieldLabel>
            <SelectMenuControl
              value={draft.recurrence ?? "none"}
              options={recurrenceOptions}
              onChange={(recurrence) =>
                onDraftChange({
                  ...draft,
                  recurrence,
                  recurrenceCount: recurrence === "none" ? 1 : Math.max(2, draft.recurrenceCount ?? 4)
                })
              }
              ariaLabel="繰り返し"
            />
          </div>
          <div>
            <FieldLabel>作成回数</FieldLabel>
            <input
              type="number"
              min={1}
              max={maxRecurrenceCount}
              value={draft.recurrenceCount ?? 1}
              onChange={(event) => onDraftChange({ ...draft, recurrenceCount: Number(event.target.value) })}
              className={inputClassName()}
              disabled={(draft.recurrence ?? "none") === "none"}
            />
          </div>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted">
          毎日 / 毎週のみ対応。例外日やシリーズ一括編集は未対応です。
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 rounded-base border border-border bg-surface-muted/35 p-3">
        <button type="button" onClick={onDuplicate} disabled={!canDelete} className="flat-control px-3 py-2 disabled:cursor-not-allowed disabled:opacity-45">
          複製
        </button>
        <button type="button" onClick={onCancel} className="flat-control px-3 py-2">
          リセット
        </button>
      </div>
      <div className="sticky bottom-0 z-20 -mx-3 grid grid-cols-2 gap-2 border-t border-border bg-surface/95 px-3 py-3 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
        <button type="button" onClick={onDelete} disabled={!canDelete} className="flat-control flex-1 border-red-300 px-3 py-2 text-red-600 disabled:cursor-not-allowed disabled:opacity-45">
          削除
        </button>
        <button type="submit" className="flex-1 rounded-base bg-primary px-3 py-2 text-sm font-bold text-white transition hover:bg-primary-strong">
          保存
        </button>
      </div>
    </form>
  );
}

function MobileEventDetailView({
  event,
  onEdit
}: {
  event: ScheduleEvent;
  onEdit: () => void;
}) {
  return (
    <section className={["space-y-4", mobileOnlyClassName].join(" ")}>
      <div>
        <p className="text-xs font-bold text-muted">予定詳細</p>
        <EventDetailContent event={event} />
      </div>
      <div className="sticky bottom-0 z-20 -mx-3 border-t border-border bg-surface/95 px-3 py-3 backdrop-blur">
        <button
          type="button"
          className="w-full rounded-base bg-primary px-3 py-3 text-sm font-bold text-white transition hover:bg-primary-strong"
          onClick={onEdit}
        >
          編集する
        </button>
      </div>
    </section>
  );
}

function SchedulePanel({
  selectedDateKey,
  selectedEvent,
  dayEvents,
  draft,
  hashtagSets,
  statusMessage,
  mobileMode,
  onDraftChange,
  onNew,
  onSelectEvent,
  onEditSelectedEvent,
  onSave,
  onDelete,
  onDuplicate,
  onCancel
}: {
  selectedDateKey: string;
  selectedEvent: ScheduleEvent | null;
  dayEvents: ScheduleEvent[];
  draft: ScheduleEvent;
  hashtagSets: HashtagSet[];
  statusMessage: string;
  mobileMode: MobileScheduleMode;
  onDraftChange: (event: ScheduleEvent) => void;
  onNew: () => void;
  onSelectEvent: (event: ScheduleEvent) => void;
  onEditSelectedEvent: () => void;
  onSave: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      {selectedEvent && mobileMode === "detail" ? (
        <MobileEventDetailView event={selectedEvent} onEdit={onEditSelectedEvent} />
      ) : null}
      <section className={tabletUpClassName}>
        <p className="text-xs font-bold text-muted">選択中の日付</p>
        <p className="mt-1 text-base font-bold text-foreground">{getLongDateLabel(selectedDateKey)}</p>
        <p className="mt-1 text-sm text-muted">予定 {dayEvents.length} 件</p>
        <p className="mt-3 rounded-base border border-border bg-surface-muted/55 px-3 py-2 text-xs font-semibold leading-5 text-muted">
          {dayEvents.length === 0 ? scheduleStartGuide : "予定を選ぶと編集できます。告知文やサムネ導線は投稿補助タブで確認します。"}
        </p>
      </section>
      <section className={[mobileMode === "detail" && selectedEvent ? "hidden lg:block" : "", "lg:border-t lg:border-border lg:pt-5"].join(" ")}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-foreground">この日の予定一覧</h2>
          <button type="button" className="text-sm font-bold text-primary-strong hover:underline" onClick={onNew}>
            + 新規
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {dayEvents.length === 0 ? (
            <button
              type="button"
              onClick={onNew}
              className="w-full rounded-base border border-dashed border-border bg-surface-muted/60 px-3 py-4 text-center text-sm text-muted transition hover:border-primary/60 hover:text-foreground"
            >
              この日に新しい予定を追加
            </button>
          ) : (
            dayEvents.map((event) => (
              <div key={event.id} className="group relative">
                <button
                  type="button"
                  onClick={() => onSelectEvent(event)}
                  className={[
                    "w-full rounded-base border px-3 py-3 text-left transition hover:border-primary/60",
                    selectedEvent?.id === event.id ? "border-primary bg-primary-soft/55" : "border-border bg-surface"
                  ].join(" ")}
                >
                  <span className="text-xs font-bold text-primary-strong">
                    {event.startTime} - {event.endTime}
                  </span>
                  <span className="mt-1 block text-sm font-bold text-foreground">{event.title || "無題の予定"}</span>
                  <span className="mt-1 inline-flex rounded-base bg-surface-muted px-2 py-1 text-xs font-bold text-muted">
                    {categoryMeta[event.category].label}
                    {event.platform ? ` / ${event.platform}` : ""}
                    {` / ${getAnnouncementStatusLabel(event.announcementStatus)}`}
                    {event.recurrence && event.recurrence !== "none" ? ` / ${getEventRecurrenceLabel(event)}` : ""}
                  </span>
                </button>
                <EventHoverPreview event={event} />
              </div>
            ))
          )}
        </div>
        <button type="button" className={["mt-3 w-full rounded-base bg-primary px-3 py-3 text-sm font-bold text-white transition hover:bg-primary-strong", mobileOnlyClassName].join(" ")} onClick={onNew}>
          新しい予定を追加
        </button>
      </section>
      <section className={[mobileMode === "detail" && selectedEvent ? "hidden lg:block" : "", "border-t border-border pt-5"].join(" ")}>
        <h2 className="text-sm font-bold text-foreground">{selectedEvent ? "予定の編集" : "新しい予定"}</h2>
        <div className="mt-3">
          <ScheduleForm
            draft={draft}
            hashtagSets={hashtagSets}
            onDraftChange={onDraftChange}
            onSave={onSave}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onCancel={onCancel}
            canDelete={Boolean(selectedEvent)}
          />
        </div>
        {statusMessage ? <p className="mt-3 text-sm font-semibold text-primary-strong">{statusMessage}</p> : null}
      </section>
    </div>
  );
}

function PostAssistPanel({
  selectedEvent,
  templates,
  hashtagSets = [],
  templateId,
  selectedHashtagSetIds = [],
  postText,
  copyStatus,
  copyStatusKind,
  copyFallbackText,
  onTemplateChange,
  onSelectedHashtagSetIdsChange,
  onCopy,
  onCreateThumbnail,
  onCreateSnsSplit
}: {
  selectedEvent: ScheduleEvent | null;
  templates: PostTemplate[];
  hashtagSets: HashtagSet[];
  templateId: string;
  selectedHashtagSetIds: string[];
  postText: string;
  copyStatus: string;
  copyStatusKind: CopyStatusKind;
  copyFallbackText: string;
  onTemplateChange: (id: string) => void;
  onSelectedHashtagSetIdsChange: (ids: string[]) => void;
  onCopy: () => void;
  onCreateThumbnail: () => void;
  onCreateSnsSplit: () => void;
}) {
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(postText)}`;
  const selectedTemplate = templates.find((template) => template.id === templateId);
  const selectedHashtagSetIdSet = new Set(selectedHashtagSetIds);
  const canCreateHandoff = Boolean(selectedEvent);

  function toggleHashtagSet(hashtagSetId: string) {
    onSelectedHashtagSetIdsChange(
      selectedHashtagSetIdSet.has(hashtagSetId)
        ? selectedHashtagSetIds.filter((id) => id !== hashtagSetId)
        : [...selectedHashtagSetIds, hashtagSetId]
    );
  }

  return (
    <div className="space-y-5">
      <section>
        <p className="text-xs font-bold text-muted">対象予定</p>
        <p className="mt-1 text-base font-bold text-foreground">{selectedEvent?.title || "予定未選択"}</p>
        <p className="mt-1 text-sm text-muted">
          {selectedEvent ? `${getLongDateLabel(selectedEvent.date)} ${selectedEvent.startTime}` : postAssistStartGuide}
        </p>
      </section>
      <section className="border-t border-border pt-5">
        <FieldLabel>テンプレート</FieldLabel>
        <SelectMenuControl
          value={templateId}
          options={templates.map((template) => ({ value: template.id, label: template.name }))}
          onChange={onTemplateChange}
          ariaLabel="テンプレート"
        />
        <p className="mt-2 text-sm leading-6 text-muted">
          {selectedTemplate?.description}
        </p>
        {selectedTemplate ? (
          <p className="mt-1 text-xs font-bold text-primary-strong">
            {getTemplateUsageLabel(selectedTemplate)}
            {selectedTemplate.defaultPlatform ? ` / ${selectedTemplate.defaultPlatform}` : ""}
          </p>
        ) : null}
        {selectedTemplate?.hashtags.trim() ? (
          <p className="mt-2 text-xs leading-5 text-muted">テンプレートタグ: {selectedTemplate.hashtags}</p>
        ) : null}
      </section>
      <section className="border-t border-border pt-5">
        <div className="flex items-center justify-between gap-3">
          <FieldLabel>保存済みハッシュタグ</FieldLabel>
          {selectedHashtagSetIds.length > 0 ? (
            <button
              type="button"
              onClick={() => onSelectedHashtagSetIdsChange([])}
              className="rounded-base border border-border px-2 py-1 text-xs font-bold text-muted transition hover:bg-surface-muted"
            >
              選択解除
            </button>
          ) : null}
        </div>
        {hashtagSets.length === 0 ? (
          <p className="mt-2 rounded-base border border-dashed border-border bg-surface-muted/55 px-3 py-3 text-center text-xs font-bold text-muted">
            設定でハッシュタグセットを追加できます。
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {hashtagSets.map((hashtagSet) => {
              const selected = selectedHashtagSetIdSet.has(hashtagSet.id);

              return (
                <button
                  key={hashtagSet.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleHashtagSet(hashtagSet.id)}
                  className={[
                    "rounded-base border px-2.5 py-1.5 text-left text-xs font-bold transition",
                    selected ? "border-primary bg-primary-soft text-primary-strong" : "border-border bg-surface text-muted hover:bg-surface-muted"
                  ].join(" ")}
                  title={hashtagSet.hashtags}
                >
                  {hashtagSet.name}
                </button>
              );
            })}
          </div>
        )}
        {selectedHashtagSetIds.length > 0 ? (
          <p className="mt-2 text-xs leading-5 text-muted">
            選択したセットはテンプレートタグ、予定タグと重複排除してプレビューへ追加します。
          </p>
        ) : null}
      </section>
      {selectedEvent ? (
        <section className="rounded-base border border-border bg-surface-muted/45 p-3">
          <div className="flex items-center justify-between gap-3">
            <FieldLabel>告知ステータス</FieldLabel>
            <span className="text-xs font-bold text-primary-strong">{getAnnouncementStatusLabel(selectedEvent.announcementStatus)}</span>
          </div>
          {selectedEvent.announcementText.trim() ? (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{selectedEvent.announcementText}</p>
          ) : null}
          {selectedEvent.announcementHashtags.trim() ? (
            <p className="mt-2 text-xs font-bold text-muted">予定タグ: {selectedEvent.announcementHashtags}</p>
          ) : null}
        </section>
      ) : null}
      <section className="border-t border-border pt-5">
        <h2 className="text-sm font-bold text-foreground">投稿文プレビュー</h2>
        <textarea
          value={postText}
          readOnly
          className="mt-3 min-h-44 w-full resize-none rounded-base border border-border bg-surface-muted px-3 py-3 text-sm leading-6 text-foreground lg:text-[13px]"
        />
        <TextLimitCounter
          value={postText}
          maxLength={scheduleInputTextLimits.announcementText}
          warning="X投稿や次ツールで確認しやすいよう、コピー前に要点を絞ると扱いやすいです。"
        />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={onCopy} className="flat-control flex-1 px-3 py-2">
            告知文をコピー
          </button>
          <a
            href={tweetUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 rounded-base bg-primary px-3 py-2 text-center text-sm font-bold text-white transition hover:bg-primary-strong"
          >
            Xで開く
          </a>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={!canCreateHandoff}
            onClick={onCreateThumbnail}
            className="flat-control px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-45"
          >
            サムネを作る
          </button>
          <button
            type="button"
            disabled={!canCreateHandoff}
            onClick={onCreateSnsSplit}
            className="flat-control px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-45"
          >
            分割画像を作る
          </button>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted">
          {selectedEvent ? handoffSelectedGuide : handoffEmptyGuide}
        </p>
        {copyStatus ? (
          <p
            className={[
              "mt-3 text-sm font-semibold",
              copyStatusKind === "error" ? "text-red-600 dark:text-red-300" : "text-primary-strong"
            ].join(" ")}
          >
            {copyStatus}
          </p>
        ) : null}
        {copyFallbackText ? (
          <div className="mt-3 rounded-base border border-dashed border-border bg-surface-muted/55 p-3">
            <p className="text-xs font-bold text-muted">手動コピー用</p>
            <textarea
              value={copyFallbackText}
              readOnly
              onFocus={(event) => event.currentTarget.select()}
              className="mt-2 min-h-28 w-full resize-none rounded-base border border-border bg-surface px-3 py-2 text-sm leading-6 text-foreground"
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}

function getClipboardFailureMessage(error: unknown) {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return "コピーできませんでした。下の文面を選択して手動でコピーしてください。";
  }

  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "コピーできませんでした。下の文面を選択して手動でコピーしてください。";
  }

  return "コピーできませんでした。下の文面を選択して手動でコピーしてください。";
}

function createTemplateDraft(): PostTemplate {
  return {
    id: `template-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    description: "",
    usageCategory: "custom",
    defaultPlatform: "X",
    body: "【告知】\n{date} {startTime} - {endTime}\n{title}",
    hashtags: ""
  };
}

function createHashtagSetDraft(): HashtagSet {
  return {
    id: `hashtag-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    hashtags: ""
  };
}

export function ScheduleCalendarApp() {
  const fallbackDateKey = "2026-01-01";
  const [view, setView] = useState<CalendarView>("week");
  const [cursorDate, setCursorDate] = useState(() => parseDateKey(fallbackDateKey));
  const [selectedDateKey, setSelectedDateKey] = useState(fallbackDateKey);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ScheduleEvent>(() => createEmptyEvent(fallbackDateKey));
  const [activeTab, setActiveTab] = useState<PanelTab>("schedule");
  const [settings, setSettings] = useState<ScheduleSettings>(defaultScheduleSettings);
  const [userPostTemplates, setUserPostTemplates] = useState<PostTemplate[]>(postTemplates);
  const [userHashtagSets, setUserHashtagSets] = useState<HashtagSet[]>(defaultHashtagSets);
  const [templateDraft, setTemplateDraft] = useState<PostTemplate>(() => createTemplateDraft());
  const [hashtagSetDraft, setHashtagSetDraft] = useState<HashtagSet>(() => createHashtagSetDraft());
  const [templateId, setTemplateId] = useState(defaultScheduleSettings.defaultTemplateId);
  const [selectedHashtagSetIds, setSelectedHashtagSetIds] = useState<string[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [settingsStatus, setSettingsStatus] = useState("");
  const [importText, setImportText] = useState("");
  const [eventFilters, setEventFilters] = useState<EventListFilters>({
    query: "",
    category: "all",
    platform: "all",
    announcementStatus: "all",
    period: "today",
    sortOrder: "upcoming"
  });
  const [copyStatus, setCopyStatus] = useState("");
  const [copyStatusKind, setCopyStatusKind] = useState<CopyStatusKind>("idle");
  const [copyFallbackText, setCopyFallbackText] = useState("");
  const [storageError, setStorageError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [mobileSheetDragOffset, setMobileSheetDragOffset] = useState(0);
  const [mobileNavTab, setMobileNavTab] = useState<MobileNavTab>("calendar");
  const [mobileScheduleMode, setMobileScheduleMode] = useState<MobileScheduleMode>("edit");
  const [pendingUndo, setPendingUndo] = useState<PendingUndo | null>(null);
  const mobileSheetDragStartYRef = useRef<number | null>(null);
  const skipNextStorageWriteRef = useRef(false);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const currentDate = new Date();
    const currentDateKey = toDateKey(currentDate);
    setCursorDate(currentDate);
    setSelectedDateKey(currentDateKey);

    try {
      const raw = window.localStorage.getItem(scheduleStorageKey);
      const payload = normalizeStoragePayload(raw ? JSON.parse(raw) : null);
      setEvents(payload.events);
      setSettings(payload.settings);
      setUserPostTemplates(payload.postTemplates);
      setUserHashtagSets(payload.hashtagSets);
      setTemplateId(payload.settings.defaultTemplateId);
      setView(payload.settings.defaultView);
      setDraft(createEventDraft(currentDateKey, payload.settings));
      if (raw) {
        window.localStorage.setItem(scheduleStorageKey, JSON.stringify(payload));
      }
    } catch {
      skipNextStorageWriteRef.current = true;
      setStorageError("保存済みデータを読み込めませんでした。既存データは保持しています。");
      setDraft(createEmptyEvent(currentDateKey));
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (skipNextStorageWriteRef.current) {
      skipNextStorageWriteRef.current = false;
      return;
    }

    try {
      window.localStorage.setItem(
        scheduleStorageKey,
        JSON.stringify(createScheduleStoragePayload(events, settings, userPostTemplates, userHashtagSets))
      );
      setStorageError("");
    } catch {
      setStorageError(saveFailureMessage);
    }
  }, [events, hydrated, settings, userHashtagSets, userPostTemplates]);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );
  const selectedDayEvents = useMemo(() => getEventsForDate(events, selectedDateKey), [events, selectedDateKey]);
  const selectedHashtagSets = useMemo(
    () => userHashtagSets.filter((hashtagSet) => selectedHashtagSetIds.includes(hashtagSet.id)),
    [selectedHashtagSetIds, userHashtagSets]
  );
  const postText = useMemo(
    () => generatePostText(selectedEvent, templateId, userPostTemplates, { extraHashtags: selectedHashtagSets.map((hashtagSet) => hashtagSet.hashtags) }),
    [selectedEvent, selectedHashtagSets, templateId, userPostTemplates]
  );
  const visibleEvents = useMemo(() => sortEvents(events), [events]);
  const filteredListEvents = useMemo(() => {
    const todayKey = toDateKey(new Date());
    const query = eventFilters.query.trim().toLowerCase();
    const periodEndDate = new Date();
    if (eventFilters.period === "week") {
      periodEndDate.setDate(periodEndDate.getDate() + 7);
    }
    if (eventFilters.period === "month") {
      periodEndDate.setDate(periodEndDate.getDate() + 30);
    }
    const periodEndKey = toDateKey(periodEndDate);

    const sortByDateAsc = (a: ScheduleEvent, b: ScheduleEvent) => {
      const dateCompare = a.date.localeCompare(b.date);
      return dateCompare !== 0 ? dateCompare : a.startTime.localeCompare(b.startTime);
    };

    return [...visibleEvents]
      .sort((a, b) => {
        if (eventFilters.sortOrder === "dateAsc") {
          return sortByDateAsc(a, b);
        }

        if (eventFilters.sortOrder === "dateDesc") {
          return -sortByDateAsc(a, b);
        }

        const aUpcoming = a.date >= todayKey;
        const bUpcoming = b.date >= todayKey;
        if (aUpcoming !== bUpcoming) {
          return aUpcoming ? -1 : 1;
        }

        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) {
          return aUpcoming ? dateCompare : -dateCompare;
        }

        return a.startTime.localeCompare(b.startTime);
      })
      .filter((event) => {
        if (eventFilters.category !== "all" && event.category !== eventFilters.category) {
          return false;
        }

        if (eventFilters.platform !== "all" && event.platform !== eventFilters.platform) {
          return false;
        }

        if (eventFilters.announcementStatus !== "all" && event.announcementStatus !== eventFilters.announcementStatus) {
          return false;
        }

        if (eventFilters.period !== "all") {
          if (event.date < todayKey) {
            return false;
          }

          if ((eventFilters.period === "week" || eventFilters.period === "month") && event.date > periodEndKey) {
            return false;
          }
        }

        if (!query) {
          return true;
        }

        return event.title.toLowerCase().includes(query);
      });
  }, [eventFilters, visibleEvents]);

  useEffect(() => {
    setCopyStatus("");
    setCopyStatusKind("idle");
    setCopyFallbackText("");
  }, [postText]);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  function clearUndoTimer() {
    if (!undoTimerRef.current) {
      return;
    }

    clearTimeout(undoTimerRef.current);
    undoTimerRef.current = null;
  }

  function showUndoToast(undo: PendingUndo) {
    clearUndoTimer();
    setPendingUndo(undo);
    undoTimerRef.current = setTimeout(() => {
      setPendingUndo(null);
      undoTimerRef.current = null;
    }, 8000);
  }

  function closeUndoToast() {
    clearUndoTimer();
    setPendingUndo(null);
  }

  function isMobileLayout() {
    return typeof window !== "undefined" && window.matchMedia(mobileLayoutQuery).matches;
  }

  function isFineDesktopPointer() {
    return (
      typeof window !== "undefined" &&
      !window.matchMedia(mobileLayoutQuery).matches &&
      window.matchMedia("(pointer: fine)").matches
    );
  }

  function restoreUndoEvent() {
    if (!pendingUndo) {
      return;
    }

    const restoredEvent = pendingUndo.restoreEvent;
    clearUndoTimer();
    setEvents((current) => {
      const exists = current.some((event) => event.id === restoredEvent.id);
      return sortEvents(exists ? current.map((event) => (event.id === restoredEvent.id ? restoredEvent : event)) : [...current, restoredEvent]);
    });
    setPendingUndo(null);
    setSelectedDateKey(restoredEvent.date);
    setCursorDate(parseDateKey(restoredEvent.date));
    setSelectedEventId(restoredEvent.id);
    setDraft({ ...restoredEvent });
    setActiveTab("schedule");
    setMobileScheduleMode("edit");
    setMobileSheetOpen(false);
    setStatusMessage("予定を元に戻しました。");
  }

  function selectDate(dateKey: string) {
    setSelectedDateKey(dateKey);
    setCursorDate(parseDateKey(dateKey));
    const firstEvent = getEventsForDate(events, dateKey)[0] ?? null;
    setSelectedEventId(firstEvent?.id ?? null);
    setDraft(
      firstEvent
        ? { ...firstEvent }
        : createEventDraft(dateKey, settings)
    );
    setMobileScheduleMode(firstEvent ? "detail" : "edit");
    setStatusMessage("");
  }

  function selectDateAndOpenSheet(dateKey: string) {
    selectDate(dateKey);
    setActiveTab("schedule");
    setMobileSheetOpen(true);
  }

  function selectEvent(event: ScheduleEvent) {
    setSelectedDateKey(event.date);
    setCursorDate(parseDateKey(event.date));
    setSelectedEventId(event.id);
    setDraft({ ...event });
    setActiveTab("schedule");
    setMobileScheduleMode(isMobileLayout() ? "detail" : "edit");
    setMobileSheetOpen(true);
    setStatusMessage("");
  }

  function selectEventForCalendar(event: ScheduleEvent) {
    setSelectedDateKey(event.date);
    setCursorDate(parseDateKey(event.date));
    setSelectedEventId(event.id);
    setDraft({ ...event });
    setStatusMessage("");

    if (isFineDesktopPointer()) {
      setMobileSheetOpen(false);
      return;
    }

    setActiveTab("schedule");
    setMobileScheduleMode(isMobileLayout() ? "detail" : "edit");
    setMobileSheetOpen(true);
  }

  function editSelectedEvent() {
    if (selectedEvent) {
      setDraft({ ...selectedEvent });
      setSelectedDateKey(selectedEvent.date);
      setCursorDate(parseDateKey(selectedEvent.date));
    }

    setActiveTab("schedule");
    setMobileScheduleMode("edit");
    setMobileSheetOpen(true);
    setStatusMessage("");
  }

  function createNewEvent() {
    const next = createEventDraft(selectedDateKey, settings);
    setSelectedEventId(null);
    setDraft(next);
    setActiveTab("schedule");
    setMobileScheduleMode("edit");
    setMobileSheetOpen(true);
    setStatusMessage("");
  }

  function createEventAt(minutes: number) {
    const startHour = Math.floor(minutes / 60);
    const startMinute = minutes % 60;
    const endMinutes = Math.min(timelineEndMinutes - 1, minutes + settings.defaultDurationMinutes);
    const endHour = Math.floor(endMinutes / 60);
    const endMinute = endMinutes % 60;
    const next = {
      ...createEventDraft(selectedDateKey, settings),
      startTime: `${String(startHour).padStart(2, "0")}:${String(startMinute).padStart(2, "0")}`,
      endTime: `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`
    };
    setSelectedEventId(null);
    setDraft(next);
    setActiveTab("schedule");
    setMobileScheduleMode("edit");
    setMobileSheetOpen(true);
    setStatusMessage("");
  }

  function saveDraft() {
    if (draft.endTime <= draft.startTime) {
      setStatusMessage("終了時間は開始時間より後にしてください。");
      return;
    }

    const normalizedRecurrence = draft.recurrence ?? "none";
    const nextDraft = {
      ...draft,
      title: clampScheduleText(draft.title.trim(), scheduleInputTextLimits.title) || "無題の予定",
      memo: draft.memo.trim(),
      announcementText: clampScheduleText(draft.announcementText.trim(), scheduleInputTextLimits.announcementText),
      announcementHashtags: clampScheduleText(draft.announcementHashtags.trim(), scheduleInputTextLimits.announcementHashtags),
      announcementMemo: draft.announcementMemo.trim(),
      recurrence: normalizedRecurrence,
      recurrenceCount: normalizedRecurrence === "none" ? 1 : Math.min(maxRecurrenceCount, Math.max(2, Math.floor(draft.recurrenceCount ?? 4)))
    };
    const previousEvent = events.find((event) => event.id === nextDraft.id) ?? null;
    setEvents((current) => {
      const exists = current.some((event) => event.id === nextDraft.id);
      if (exists) {
        return sortEvents(current.map((event) => (event.id === nextDraft.id ? nextDraft : event)));
      }

      return sortEvents([...current, ...createRecurringEvents(nextDraft)]);
    });
    setSelectedDateKey(nextDraft.date);
    setCursorDate(parseDateKey(nextDraft.date));
    setSelectedEventId(nextDraft.id);
    setDraft(nextDraft);
    setMobileScheduleMode("edit");
    if (previousEvent) {
      setMobileSheetOpen(!isMobileLayout());
      const moved =
        previousEvent.date !== nextDraft.date ||
        previousEvent.startTime !== nextDraft.startTime ||
        previousEvent.endTime !== nextDraft.endTime;
      showUndoToast({
        title: moved ? "予定を移動しました。" : "予定を更新しました。",
        detail: nextDraft.title || "無題の予定",
        actionLabel: "元に戻す",
        restoreEvent: previousEvent
      });
      setStatusMessage(moved ? "予定を移動しました。" : "予定を保存しました。");
      return;
    }

    setMobileSheetOpen(!isMobileLayout());
    setStatusMessage(nextDraft.recurrence !== "none" ? `${nextDraft.recurrenceCount}件の繰り返し予定を作成しました。` : "予定を保存しました。");
  }

  function deleteSelectedEvent() {
    if (!selectedEvent) {
      return;
    }

    const deletedEvent = selectedEvent;
    setEvents((current) => current.filter((event) => event.id !== selectedEvent.id));
    showUndoToast({
      title: "予定を削除しました。",
      detail: deletedEvent.title || "無題の予定",
      actionLabel: "元に戻す",
      restoreEvent: deletedEvent
    });
    setSelectedEventId(null);
    setDraft(createEventDraft(selectedDateKey, settings));
    setMobileScheduleMode("edit");
    setMobileSheetOpen(false);
    setStatusMessage("予定を削除しました。");
  }

  function duplicateSelectedEvent() {
    if (!selectedEvent) {
      return;
    }

    const duplicatedEvent = {
      ...selectedEvent,
      id: createEventId(),
      title: clampScheduleText(`${selectedEvent.title || "無題の予定"} コピー`, scheduleInputTextLimits.title),
      recurrence: "none" as const,
      recurrenceCount: 1
    };
    setEvents((current) => sortEvents([...current, duplicatedEvent]));
    setSelectedDateKey(duplicatedEvent.date);
    setCursorDate(parseDateKey(duplicatedEvent.date));
    setSelectedEventId(duplicatedEvent.id);
    setDraft(duplicatedEvent);
    setActiveTab("schedule");
    setMobileScheduleMode("edit");
    setMobileSheetOpen(true);
    setStatusMessage("予定を複製しました。");
  }

  function moveEventDate(event: ScheduleEvent, dateKey: string, startMinutes?: number) {
    const hasTimeMove = typeof startMinutes === "number";
    const nextStartTime = hasTimeMove ? formatSlot(clampTimelineStartMinutes(startMinutes)) : event.startTime;
    const nextEndTime = hasTimeMove
      ? getEndTimeFromStart(clampTimelineStartMinutes(startMinutes), getEventDurationMinutes(event))
      : event.endTime;

    if (event.date === dateKey && event.startTime === nextStartTime && event.endTime === nextEndTime) {
      return;
    }

    const nextEvent = { ...event, date: dateKey, startTime: nextStartTime, endTime: nextEndTime };
    setEvents((current) => sortEvents(current.map((item) => (item.id === event.id ? nextEvent : item))));
    setSelectedDateKey(dateKey);
    setCursorDate(parseDateKey(dateKey));
    setSelectedEventId(event.id);
    setDraft(nextEvent);
    setActiveTab("schedule");
    setMobileScheduleMode("edit");
    setMobileSheetOpen(true);
    showUndoToast({
      title: "予定を移動しました。",
      detail: nextEvent.title || "無題の予定",
      actionLabel: "元に戻す",
      restoreEvent: event
    });
    setStatusMessage("予定を移動しました。");
  }

  function cancelDraftEdit() {
    if (selectedEvent) {
      setDraft({ ...selectedEvent });
      setSelectedDateKey(selectedEvent.date);
      setCursorDate(parseDateKey(selectedEvent.date));
      setStatusMessage("編集内容を破棄しました。");
      return;
    }

    setDraft(createEventDraft(selectedDateKey, settings));
    setStatusMessage("新規作成を取り消しました。");
  }

  function closeMobileSheet() {
    setMobileSheetOpen(false);
    setMobileSheetDragOffset(0);
    mobileSheetDragStartYRef.current = null;
  }

  function changeMobileNavTab(tab: MobileNavTab) {
    setMobileNavTab(tab);
    setMobileSheetOpen(false);
  }

  function updateSettings(nextSettings: ScheduleSettings) {
    setSettings(nextSettings);
    setTemplateId(nextSettings.defaultTemplateId);
    setView(nextSettings.defaultView);
    setSettingsStatus("設定を更新しました。");
  }

  function saveTemplateDraft() {
    const nextTemplate = {
      ...templateDraft,
      name: templateDraft.name.trim() || "新しいテンプレート",
      description: templateDraft.description.trim() || "カスタムテンプレート",
      usageCategory: templateDraft.usageCategory,
      defaultPlatform: templateDraft.defaultPlatform,
      body: clampScheduleText(templateDraft.body.trim(), scheduleInputTextLimits.postTemplateBody) || "{title}",
      hashtags: clampScheduleText(templateDraft.hashtags.trim(), scheduleInputTextLimits.announcementHashtags)
    };
    setUserPostTemplates((current) => {
      const exists = current.some((template) => template.id === nextTemplate.id);
      return exists ? current.map((template) => (template.id === nextTemplate.id ? nextTemplate : template)) : [...current, nextTemplate];
    });
    setSettings((current) => ({
      ...current,
      defaultTemplateId: current.defaultTemplateId || nextTemplate.id
    }));
    setTemplateDraft(createTemplateDraft());
    setSettingsStatus("テンプレートを保存しました。");
  }

  function editTemplate(template: PostTemplate) {
    setTemplateDraft({ ...template });
    setSettingsStatus("テンプレートを編集中です。");
  }

  function deleteTemplate(templateIdToDelete: string) {
    setUserPostTemplates((current) => {
      const next = current.filter((template) => template.id !== templateIdToDelete);
      return next.length > 0 ? next : postTemplates;
    });
    setSettings((current) => {
      if (current.defaultTemplateId !== templateIdToDelete) {
        return current;
      }

      const fallbackTemplateId = userPostTemplates.find((template) => template.id !== templateIdToDelete)?.id ?? postTemplates[0].id;
      setTemplateId(fallbackTemplateId);
      return { ...current, defaultTemplateId: fallbackTemplateId };
    });
    setSettingsStatus("テンプレートを削除しました。");
  }

  function saveHashtagSetDraft() {
    const nextHashtagSet = {
      ...hashtagSetDraft,
      name: hashtagSetDraft.name.trim() || "新しいハッシュタグセット",
      hashtags: hashtagSetDraft.hashtags.trim()
    };

    setUserHashtagSets((current) => {
      const exists = current.some((hashtagSet) => hashtagSet.id === nextHashtagSet.id);
      return exists
        ? current.map((hashtagSet) => (hashtagSet.id === nextHashtagSet.id ? nextHashtagSet : hashtagSet))
        : [...current, nextHashtagSet];
    });
    setHashtagSetDraft(createHashtagSetDraft());
    setSettingsStatus("ハッシュタグセットを保存しました。");
  }

  function editHashtagSet(hashtagSet: HashtagSet) {
    setHashtagSetDraft({ ...hashtagSet });
    setSettingsStatus("ハッシュタグセットを編集中です。");
  }

  function deleteHashtagSet(hashtagSetIdToDelete: string) {
    setUserHashtagSets((current) => current.filter((hashtagSet) => hashtagSet.id !== hashtagSetIdToDelete));
    setSelectedHashtagSetIds((current) => current.filter((hashtagSetId) => hashtagSetId !== hashtagSetIdToDelete));
    if (hashtagSetDraft.id === hashtagSetIdToDelete) {
      setHashtagSetDraft(createHashtagSetDraft());
    }
    setSettingsStatus("ハッシュタグセットを削除しました。");
  }

  function exportJson() {
    const payload = createScheduleStoragePayload(events, settings, userPostTemplates, userHashtagSets);
    setImportText(JSON.stringify(payload, null, 2));
    setSettingsStatus("バックアップJSONを作成しました。必要な場所に保管してください。");
  }

  function importJson() {
    try {
      if (importText.length > importTextMaxLength) {
        throw new Error("Import text exceeded limits");
      }

      const parsedPayload = JSON.parse(importText);
      if (!isImportableSchedulePayload(parsedPayload)) {
        throw new Error("Unsupported import payload");
      }

      validateImportPayloadLimits(parsedPayload);
      const payload = normalizeStoragePayload(parsedPayload);
      setEvents(payload.events);
      setSettings(payload.settings);
      setUserPostTemplates(payload.postTemplates);
      setUserHashtagSets(payload.hashtagSets);
      setSelectedHashtagSetIds((current) => current.filter((hashtagSetId) => payload.hashtagSets.some((hashtagSet) => hashtagSet.id === hashtagSetId)));
      setTemplateId(payload.settings.defaultTemplateId);
      setView(payload.settings.defaultView);
      setSelectedEventId(null);
      setDraft(createEventDraft(selectedDateKey, payload.settings));
      setSettingsStatus("バックアップJSONを復元しました。");
      setStorageError("");
    } catch {
      setSettingsStatus(importFailureMessage);
    }
  }

  function resetAllData() {
    const confirmed = window.confirm("予定、設定、投稿補助テンプレート、保存済みハッシュタグをすべて初期化します。この操作は元に戻せません。");
    if (!confirmed) {
      return;
    }

    const currentDateKey = toDateKey(new Date());
    setEvents([]);
    setSettings(defaultScheduleSettings);
    setUserPostTemplates(postTemplates);
    setUserHashtagSets(defaultHashtagSets);
    setSelectedHashtagSetIds([]);
    setHashtagSetDraft(createHashtagSetDraft());
    setTemplateId(defaultScheduleSettings.defaultTemplateId);
    setView(defaultScheduleSettings.defaultView);
    setSelectedDateKey(currentDateKey);
    setCursorDate(parseDateKey(currentDateKey));
    setSelectedEventId(null);
    setDraft(createEmptyEvent(currentDateKey));
    setImportText("");
    setSettingsStatus("全データを初期化しました。");
  }

  function startMobileSheetDrag(event: PointerEvent<HTMLDivElement>) {
    mobileSheetDragStartYRef.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveMobileSheetDrag(event: PointerEvent<HTMLDivElement>) {
    if (mobileSheetDragStartYRef.current === null) {
      return;
    }

    setMobileSheetDragOffset(Math.max(0, event.clientY - mobileSheetDragStartYRef.current));
  }

  function endMobileSheetDrag() {
    if (mobileSheetDragOffset > 72) {
      closeMobileSheet();
      return;
    }

    setMobileSheetDragOffset(0);
    mobileSheetDragStartYRef.current = null;
  }

  function movePeriod(direction: -1 | 1) {
    const nextDate = view === "month" ? addMonths(cursorDate, direction) : addDays(cursorDate, direction * (view === "week" ? 7 : 1));
    const nextKey = toDateKey(nextDate);
    setCursorDate(nextDate);
    setSelectedDateKey(nextKey);
    setSelectedEventId(null);
    setDraft(createEventDraft(nextKey, settings));
    setStatusMessage("");
  }

  async function copyPostText() {
    try {
      const clipboard = navigator.clipboard;

      if (!clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }

      await clipboard.writeText(postText);
      setCopyStatus("投稿文をコピーしました。");
      setCopyStatusKind("success");
      setCopyFallbackText("");
    } catch (error) {
      setCopyStatus(getClipboardFailureMessage(error));
      setCopyStatusKind("error");
      setCopyFallbackText(postText);
    }
  }

  function openHandoffTarget(target: ToolHandoffTarget) {
    if (!selectedEvent) {
      setCopyStatus("予定を選ぶと、サムネ作成や分割画像作成へ初期テキストを渡せます。");
      setCopyStatusKind("error");
      return;
    }

    const selectedTemplate = userPostTemplates.find((template) => template.id === templateId);
    const handoffHashtags = mergeHashtags(
      selectedTemplate?.hashtags ?? "",
      ...selectedHashtagSets.map((hashtagSet) => hashtagSet.hashtags),
      selectedEvent.announcementHashtags
    );
    const payload = createScheduleHandoffPayload(target, {
      eventId: selectedEvent.id,
      title: selectedEvent.title.trim() || "無題の予定",
      date: selectedEvent.date,
      startTime: selectedEvent.startTime,
      endTime: selectedEvent.endTime,
      category: selectedEvent.category,
      categoryLabel: categoryMeta[selectedEvent.category].label,
      platform: selectedEvent.platform,
      announcementText: postText.trim() || selectedEvent.announcementText.trim(),
      hashtags: handoffHashtags,
      announcementStatus: selectedEvent.announcementStatus,
      announcementStatusLabel: getAnnouncementStatusLabel(selectedEvent.announcementStatus)
    });
    const token = writeToolHandoff(payload);

    if (!token) {
      setCopyStatus("次ツールへ渡す一時データを保存できませんでした。予定内容はこの画面に残っています。");
      setCopyStatusKind("error");
      return;
    }

    window.location.assign(buildToolHandoffUrl(target, token));
  }

  if (!hydrated) {
    return (
      <div className="grid h-full place-items-center border border-border bg-surface text-sm text-muted">
        スケジュールカレンダーを読み込んでいます。
      </div>
    );
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden border-b border-r border-border bg-surface">
      <div className={mobileNavTab === "calendar" ? "contents" : tabletUpContentsClassName}>
        <CalendarToolbar
          view={view}
          cursorDate={cursorDate}
          weekStartsOn={settings.weekStartsOn}
          onViewChange={setView}
          onToday={() => selectDate(toDateKey(new Date()))}
          onMove={movePeriod}
        />
        <CategoryLegend />
      </div>
      {storageError ? (
        <div className="shrink-0 border-b border-border bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/35 dark:text-red-200">
          {storageError}
        </div>
      ) : null}
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] gap-0 lg:grid-cols-[minmax(0,1fr)_300px] lg:grid-rows-none xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="hidden min-h-0 min-w-0 border-r border-border lg:block">
          <div className="scrollbar-accent h-full overflow-x-auto overflow-y-hidden">
            {view === "week" ? (
              <WeekView
                events={visibleEvents}
                cursorDate={cursorDate}
                weekStartsOn={settings.weekStartsOn}
                selectedDateKey={selectedDateKey}
                selectedEventId={selectedEventId}
                onSelectDate={selectDate}
                onSelectEvent={selectEventForCalendar}
                onMoveEventDate={moveEventDate}
              />
            ) : null}
            {view === "month" ? (
              <MonthView
                events={visibleEvents}
                cursorDate={cursorDate}
                weekStartsOn={settings.weekStartsOn}
                selectedDateKey={selectedDateKey}
                selectedEventId={selectedEventId}
                onSelectDate={selectDate}
                onSelectEvent={selectEventForCalendar}
                onMoveEventDate={moveEventDate}
              />
            ) : null}
            {view === "day" ? (
              <DayView
                events={visibleEvents}
                selectedDateKey={selectedDateKey}
                selectedEventId={selectedEventId}
                onSelectEvent={selectEventForCalendar}
                onMoveEventDate={moveEventDate}
              />
            ) : null}
          </div>
        </div>
        <div className={["relative min-h-0 min-w-0 flex-col border-b border-border", mobileOnlyClassName, "flex"].join(" ")}>
          {mobileNavTab === "calendar" ? (
            <>
              <MobileCalendarSurface
                view={view}
                events={visibleEvents}
                cursorDate={cursorDate}
                weekStartsOn={settings.weekStartsOn}
                selectedDateKey={selectedDateKey}
                selectedEventId={selectedEventId}
                onSelectDate={selectDate}
                onSelectMonthDate={selectDateAndOpenSheet}
                onSelectEvent={selectEventForCalendar}
                onSelectTime={createEventAt}
              />
              <button
                type="button"
                onClick={createNewEvent}
                className="absolute bottom-20 right-4 z-30 grid h-14 w-14 place-items-center rounded-full bg-primary text-3xl font-light leading-none text-white shadow-panel transition hover:bg-primary-strong"
                aria-label="新しい予定を追加"
              >
                +
              </button>
            </>
          ) : null}
          {mobileNavTab === "events" ? (
            <MobileEventList
              events={filteredListEvents}
              filters={eventFilters}
              selectedEventId={selectedEventId}
              onFilterChange={setEventFilters}
              onSelectEvent={selectEvent}
            />
          ) : null}
          {mobileNavTab === "settings" ? (
            <MobileSettingsPanel
              settings={settings}
              templates={userPostTemplates}
              hashtagSets={userHashtagSets}
              templateDraft={templateDraft}
              hashtagSetDraft={hashtagSetDraft}
              importText={importText}
              settingsStatus={settingsStatus}
              onSettingsChange={updateSettings}
              onTemplateDraftChange={setTemplateDraft}
              onHashtagSetDraftChange={setHashtagSetDraft}
              onAddTemplate={saveTemplateDraft}
              onAddHashtagSet={saveHashtagSetDraft}
              onEditTemplate={editTemplate}
              onEditHashtagSet={editHashtagSet}
              onDeleteTemplate={deleteTemplate}
              onDeleteHashtagSet={deleteHashtagSet}
              onExport={exportJson}
              onImportTextChange={setImportText}
              onImport={importJson}
              onResetAll={resetAllData}
            />
          ) : null}
        </div>
        {mobileSheetOpen ? (
          <button
            type="button"
            aria-label="予定パネルを閉じる"
            className={["fixed inset-0 z-30 bg-black/35", mobileOnlyClassName].join(" ")}
            onClick={closeMobileSheet}
          />
        ) : null}
        <aside
          className={[
            "scrollbar-accent min-h-0 overflow-y-auto bg-surface px-3 pb-3 pt-0 transition-transform lg:[scrollbar-gutter:stable] xl:px-4 xl:pb-4 xl:pt-0",
            mobileSheetOpen
              ? [
                  "fixed inset-x-0 bottom-16 z-40 rounded-t-[18px] border border-b-0 border-border !px-0 !py-0 shadow-panel",
                  mobileSheetMaxHeightClassName,
                  "lg:static lg:z-auto lg:max-h-none lg:rounded-none lg:border-0 lg:!px-3 lg:!py-3 lg:shadow-none"
                ].join(" ")
              : tabletUpClassName
          ].join(" ")}
          style={mobileSheetDragOffset ? { transform: `translateY(${mobileSheetDragOffset}px)` } : undefined}
        >
          <div className="sticky top-0 z-20 border-b border-border bg-surface shadow-sm after:pointer-events-none after:absolute after:inset-x-0 after:-top-24 after:h-24 after:bg-surface lg:-mx-3 lg:mb-2 xl:-mx-4">
            <div className={["relative mb-3 min-h-9 items-center justify-center", mobileOnlyClassName, "flex"].join(" ")}>
              <div
                className="grid h-9 w-24 touch-none place-items-center rounded-base text-muted"
                aria-label="下にスワイプして予定パネルを閉じる"
                role="separator"
                onPointerDown={startMobileSheetDrag}
                onPointerMove={moveMobileSheetDrag}
                onPointerUp={endMobileSheetDrag}
                onPointerCancel={endMobileSheetDrag}
              >
                <span className="h-1 w-12 rounded-full bg-border" />
              </div>
              <button
                type="button"
                className="absolute right-0 top-0 grid h-9 w-9 place-items-center rounded-base text-xl font-light text-muted transition hover:bg-surface-muted"
                aria-label="予定パネルを閉じる"
                onClick={closeMobileSheet}
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-2 border-t border-border bg-surface-muted lg:hidden">
              {[
                { id: "schedule" as PanelTab, label: "予定管理" },
                { id: "post" as PanelTab, label: "投稿補助" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    "border-r border-border px-3 py-[0.5625rem] text-sm font-bold transition last:border-r-0",
                    activeTab === tab.id ? "bg-surface text-primary-strong" : "text-muted hover:bg-surface hover:text-foreground"
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="hidden grid-cols-2 bg-surface-muted lg:grid">
              {[
                { id: "schedule" as PanelTab, label: "予定管理" },
                { id: "post" as PanelTab, label: "投稿補助" },
                { id: "events" as PanelTab, label: "予定一覧" },
                { id: "settings" as PanelTab, label: "設定" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    "border-r border-b border-border px-3 py-[0.5625rem] text-sm font-bold transition even:border-r-0",
                    activeTab === tab.id ? "bg-surface text-primary-strong" : "text-muted hover:bg-surface hover:text-foreground"
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="px-3 py-4 pb-6 lg:p-0">
            {activeTab === "schedule" ? (
              <SchedulePanel
                selectedDateKey={selectedDateKey}
                selectedEvent={selectedEvent}
                dayEvents={selectedDayEvents}
                draft={draft}
                hashtagSets={userHashtagSets}
                statusMessage={statusMessage}
                mobileMode={mobileScheduleMode}
                onDraftChange={setDraft}
                onNew={createNewEvent}
                onSelectEvent={selectEvent}
                onEditSelectedEvent={editSelectedEvent}
                onSave={saveDraft}
                onDelete={deleteSelectedEvent}
                onDuplicate={duplicateSelectedEvent}
                onCancel={cancelDraftEdit}
              />
            ) : null}
            {activeTab === "post" ? (
              <PostAssistPanel
                selectedEvent={selectedEvent}
                templates={userPostTemplates}
                hashtagSets={userHashtagSets}
                templateId={templateId}
                selectedHashtagSetIds={selectedHashtagSetIds}
                postText={postText}
                copyStatus={copyStatus}
                copyStatusKind={copyStatusKind}
                copyFallbackText={copyFallbackText}
                onTemplateChange={setTemplateId}
                onSelectedHashtagSetIdsChange={setSelectedHashtagSetIds}
                onCopy={copyPostText}
                onCreateThumbnail={() => openHandoffTarget("thumbnail-editor")}
                onCreateSnsSplit={() => openHandoffTarget("sns-split-image-maker")}
              />
            ) : null}
            {activeTab === "events" ? (
              <div className={tabletUpClassName}>
                <DesktopEventListPanel
                  events={filteredListEvents}
                  filters={eventFilters}
                  selectedEventId={selectedEventId}
                  onFilterChange={setEventFilters}
                  onSelectEvent={selectEvent}
                />
              </div>
            ) : null}
            {activeTab === "settings" ? (
              <div className={tabletUpClassName}>
                <DesktopSettingsPanel
                  settings={settings}
                  templates={userPostTemplates}
                  hashtagSets={userHashtagSets}
                  templateDraft={templateDraft}
                  hashtagSetDraft={hashtagSetDraft}
                  importText={importText}
                  settingsStatus={settingsStatus}
                  storageError={storageError}
                  onSettingsChange={updateSettings}
                  onTemplateDraftChange={setTemplateDraft}
                  onHashtagSetDraftChange={setHashtagSetDraft}
                  onAddTemplate={saveTemplateDraft}
                  onAddHashtagSet={saveHashtagSetDraft}
                  onEditTemplate={editTemplate}
                  onEditHashtagSet={editHashtagSet}
                  onDeleteTemplate={deleteTemplate}
                  onDeleteHashtagSet={deleteHashtagSet}
                  onExport={exportJson}
                  onImportTextChange={setImportText}
                  onImport={importJson}
                  onResetAll={resetAllData}
                />
              </div>
            ) : null}
          </div>
        </aside>
        {pendingUndo ? (
          <div
            className="fixed inset-x-4 bottom-20 z-50 rounded-base border border-border bg-surface px-3 py-3 shadow-panel lg:bottom-6 lg:left-auto lg:right-6 lg:w-[22rem]"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">{pendingUndo.title}</p>
                <p className="mt-1 truncate text-xs font-bold text-muted">{pendingUndo.detail}</p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-base border border-border px-2.5 py-1.5 text-xs font-bold text-primary-strong transition hover:bg-surface-muted"
                onClick={restoreUndoEvent}
              >
                {pendingUndo.actionLabel}
              </button>
              <button
                type="button"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-base text-lg leading-none text-muted transition hover:bg-surface-muted"
                aria-label="Undo通知を閉じる"
                onClick={closeUndoToast}
              >
                ×
              </button>
            </div>
          </div>
        ) : null}
        <MobileBottomTabs activeTab={mobileNavTab} onTabChange={changeMobileNavTab} />
      </div>
    </section>
  );
}
