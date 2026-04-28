"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import {
  addDays,
  addMonths,
  categoryMeta,
  categoryOptions,
  createEmptyEvent,
  defaultScheduleSettings,
  generatePostText,
  getEventDurationMinutes,
  getEventsForDate,
  getEventStartMinutes,
  getLongDateLabel,
  getMonthGrid,
  getPeriodLabel,
  getShortDateLabel,
  getWeekDays,
  normalizeStoragePayload,
  parseDateKey,
  platformOptions,
  postTemplates,
  scheduleStorageKey,
  scheduleStorageVersion,
  sortEvents,
  toDateKey,
  type CalendarView,
  type EventCategory,
  type EventPlatform,
  type PostTemplate,
  type ScheduleStoragePayload,
  type ScheduleSettings,
  type ScheduleEvent
} from "@/lib/schedule-calendar";

type PanelTab = "schedule" | "post" | "events" | "settings";
type CopyStatusKind = "idle" | "success" | "error";
type MobileNavTab = "calendar" | "events" | "settings";
type EventPeriodFilter = "all" | "today" | "week" | "month";
type EventSortOrder = "upcoming" | "dateAsc" | "dateDesc";

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
const timeGridMinHeightClassName = "min-h-[1248px] lg:min-h-[1152px] xl:min-h-[1248px]";
const timeSlotHeightClassName = "h-6";
const weekGridTemplateColumns = "48px repeat(7, minmax(84px, 1fr))";
const emptyEventsMessage = "予定はまだありません。";
const emptySearchResultsMessage = "条件に一致する予定はありません。";
const saveFailureMessage = "保存できませんでした。ブラウザの保存領域を確認してください。";
const importFailureMessage = "JSONをインポートできませんでした。形式を確認してください。既存データは変更していません。";
const defaultDurationMinuteOptions = [30, 45, 60, 90, 120, 180];

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
  return "version" in payload || "events" in payload || "settings" in payload || "postTemplates" in payload;
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
  templates: PostTemplate[]
): ScheduleStoragePayload {
  return {
    version: scheduleStorageVersion,
    events,
    settings,
    postTemplates: templates
  };
}

function hasActiveEventListFilters(filters: EventListFilters) {
  return (
    Boolean(filters.query.trim()) ||
    filters.category !== "all" ||
    filters.platform !== "all" ||
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

function getEventStyle(event: ScheduleEvent) {
  const start = Math.max(timelineStartMinutes, getEventStartMinutes(event));
  const duration = Math.min(timelineEndMinutes - start, getEventDurationMinutes(event));
  return {
    top: `${((start - timelineStartMinutes) / timelineMinutes) * 100}%`,
    height: `${(duration / timelineMinutes) * 100}%`
  };
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs font-bold text-muted">{children}</p>;
}

function inputClassName(extra = "") {
  return [
    "mt-1 w-full rounded-base border border-border bg-surface px-3 py-2 text-sm text-foreground",
    "transition placeholder:text-muted/70 focus:border-primary focus:outline-none",
    extra
  ].join(" ");
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
    <div className="flex flex-col gap-3 border-b border-border px-4 py-3 xl:flex-row xl:items-center xl:justify-end">
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
            {isHour ? formatSlot(minutes) : <span className="text-[10px]">30</span>}
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
  onSelect
}: {
  event: ScheduleEvent;
  selected: boolean;
  compact?: boolean;
  onSelect: (event: ScheduleEvent) => void;
}) {
  const meta = categoryMeta[event.category];

  return (
    <button
      type="button"
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
  );
}

function MonthEventRow({
  event,
  selected,
  onSelect
}: {
  event: ScheduleEvent;
  selected: boolean;
  onSelect: (event: ScheduleEvent) => void;
}) {
  const meta = categoryMeta[event.category];

  return (
    <button
      type="button"
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
  );
}

function WeekView({
  events,
  cursorDate,
  weekStartsOn,
  selectedDateKey,
  selectedEventId,
  onSelectDate,
  onSelectEvent
}: {
  events: ScheduleEvent[];
  cursorDate: Date;
  weekStartsOn: 0 | 1;
  selectedDateKey: string;
  selectedEventId: string | null;
  onSelectDate: (dateKey: string) => void;
  onSelectEvent: (event: ScheduleEvent) => void;
}) {
  const days = getWeekDays(cursorDate, weekStartsOn);
  const todayKey = toDateKey(new Date());
  const { scrollContainerRef, scrollbarWidth } = useMeasuredScrollbarWidth();

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
            return (
              <div
                key={key}
                role="button"
                tabIndex={0}
                onClick={() => onSelectDate(key)}
                onKeyDown={(event) => handleDateKeyDown(event, () => onSelectDate(key))}
                className={[
                  "relative text-left",
                  dayIndex === days.length - 1 ? "" : "border-r border-border",
                  timeGridMinHeightClassName,
                  selectedDateKey === key ? "bg-primary-soft/20" : "bg-surface"
                ].join(" ")}
              >
                <TimeSlotLines />
                {dayEvents.length === 0 ? (
                  <span className="absolute left-2 right-2 top-1 flex h-6 items-center justify-center rounded-base border border-dashed border-border bg-surface-muted/55 px-2 text-center text-[11px] font-bold text-muted">
                    予定なし
                  </span>
                ) : null}
                {dayEvents.map((event) => (
                  <span key={event.id} className="absolute left-2 right-2 block" style={getEventStyle(event)}>
                    <EventPill event={event} selected={selectedEventId === event.id} onSelect={onSelectEvent} />
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
  onSelectEvent
}: {
  events: ScheduleEvent[];
  cursorDate: Date;
  weekStartsOn: 0 | 1;
  selectedDateKey: string;
  selectedEventId: string | null;
  onSelectDate: (dateKey: string) => void;
  onSelectEvent: (event: ScheduleEvent) => void;
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
                      onSelect={onSelectEvent}
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
    <div className="flex min-h-0 flex-1 flex-col bg-surface">
      <div className="grid grid-cols-7 border-b border-border bg-surface-muted/70 text-center text-[11px] font-bold text-muted">
        {(weekStartsOn === 1 ? ["月", "火", "水", "木", "金", "土", "日"] : ["日", "月", "火", "水", "木", "金", "土"]).map((label) => (
          <span key={label} className="py-2">
            {label}
          </span>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7 auto-rows-fr overflow-hidden">
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
                "min-h-[4.65rem] border-b border-r border-border p-1.5 text-left transition",
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
                <span className="mt-1 block rounded-base border border-primary/35 bg-primary-soft/50 px-1.5 py-1 text-[10px] font-bold leading-4 text-foreground">
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
  onSelectEvent
}: {
  events: ScheduleEvent[];
  selectedDateKey: string;
  selectedEventId: string | null;
  onSelectEvent: (event: ScheduleEvent) => void;
}) {
  const dayEvents = getEventsForDate(events, selectedDateKey);

  return (
    <div className="flex h-full min-w-[620px] min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-surface-muted/70 px-4 py-3 text-sm font-bold text-foreground [scrollbar-gutter:stable]">
        <span>{getLongDateLabel(selectedDateKey)}</span>
        <span className="rounded-base border border-border bg-surface px-2 py-1 text-xs text-muted">予定 {dayEvents.length} 件</span>
      </div>
      <div className="scrollbar-accent min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        <div className="grid grid-cols-[64px_1fr]">
          <TimeLabelColumn />
          <div className={["relative bg-surface", timeGridMinHeightClassName].join(" ")}>
            <TimeSlotLines />
            {dayEvents.length === 0 ? (
              <div className="absolute left-3 right-3 top-1 flex h-6 items-center justify-center rounded-base border border-dashed border-border bg-surface-muted/55 px-3 text-center text-[11px] font-bold text-muted">
                この日の予定はまだありません。右パネルから追加できます。
              </div>
            ) : null}
            {dayEvents.map((event) => (
              <div key={event.id} className="absolute left-4 right-4" style={getEventStyle(event)}>
                <EventPill event={event} selected={selectedEventId === event.id} onSelect={onSelectEvent} />
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
                この日の予定はまだありません。下のパネルから追加できます。
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
  period: EventPeriodFilter;
  sortOrder: EventSortOrder;
};

type SettingsSectionId = "display" | "defaults" | "data" | "templates";

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
          placeholder="タイトル・メモを検索"
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={filters.category}
            onChange={(event) => onFilterChange({ ...filters, category: event.target.value as EventCategory | "all" })}
            className={inputClassName("mt-0")}
            aria-label="カテゴリで絞り込み"
          >
            <option value="all">カテゴリすべて</option>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={filters.platform}
            onChange={(event) => onFilterChange({ ...filters, platform: event.target.value as EventPlatform | "all" })}
            className={inputClassName("mt-0")}
            aria-label="プラットフォームで絞り込み"
          >
            <option value="all">媒体すべて</option>
            {platformOptions.map((option) => (
              <option key={option || "none"} value={option}>
                {option || "-"}
              </option>
            ))}
          </select>
        </div>
        <select
          value={filters.period}
          onChange={(event) => onFilterChange({ ...filters, period: event.target.value as EventPeriodFilter })}
          className={inputClassName("mt-0")}
          aria-label="期間で絞り込み"
        >
          <option value="all">全期間</option>
          <option value="today">今日以降</option>
          <option value="week">7日以内</option>
          <option value="month">30日以内</option>
        </select>
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

function MobileSettingsPanel({
  settings,
  templates,
  templateDraft,
  importText,
  settingsStatus,
  onSettingsChange,
  onTemplateDraftChange,
  onAddTemplate,
  onEditTemplate,
  onDeleteTemplate,
  onExport,
  onImportTextChange,
  onImport,
  onResetAll
}: {
  settings: ScheduleSettings;
  templates: PostTemplate[];
  templateDraft: PostTemplate;
  importText: string;
  settingsStatus: string;
  onSettingsChange: (settings: ScheduleSettings) => void;
  onTemplateDraftChange: (template: PostTemplate) => void;
  onAddTemplate: () => void;
  onEditTemplate: (template: PostTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  onExport: () => void;
  onImportTextChange: (value: string) => void;
  onImport: () => void;
  onResetAll: () => void;
}) {
  const [openSections, setOpenSections] = useState<Record<SettingsSectionId, boolean>>({
    display: true,
    defaults: true,
    data: false,
    templates: false
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
            <select value={settings.defaultView} onChange={(event) => onSettingsChange({ ...settings, defaultView: event.target.value as CalendarView })} className={inputClassName()}>
              <option value="month">月</option>
              <option value="week">週</option>
              <option value="day">日</option>
            </select>
          </div>
          <div>
            <FieldLabel>週開始曜日</FieldLabel>
            <select value={settings.weekStartsOn} onChange={(event) => onSettingsChange({ ...settings, weekStartsOn: Number(event.target.value) as 0 | 1 })} className={inputClassName()}>
              <option value={0}>日曜</option>
              <option value={1}>月曜</option>
            </select>
          </div>
          <div>
            <FieldLabel>既定開始時刻</FieldLabel>
            <input type="time" value={settings.defaultStartTime} onChange={(event) => onSettingsChange({ ...settings, defaultStartTime: event.target.value })} className={inputClassName()} />
          </div>
          <div>
            <FieldLabel>既定予定時間</FieldLabel>
            <select value={settings.defaultDurationMinutes} onChange={(event) => onSettingsChange({ ...settings, defaultDurationMinutes: Number(event.target.value) })} className={inputClassName()}>
              {defaultDurationMinuteOptions.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes}分
                </option>
              ))}
            </select>
          </div>
        </div>
      </SettingsAccordionSection>
      <SettingsAccordionSection
        id="data"
        title="データ管理"
        summary="JSON保存・復元 / 全データ初期化"
        open={openSections.data}
        onToggle={toggleSection}
      >
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onExport} className="flat-control px-3 py-2">
            JSONエクスポート
          </button>
          <button type="button" onClick={onImport} className="flat-control px-3 py-2">
            JSONインポート
          </button>
        </div>
        <textarea value={importText} onChange={(event) => onImportTextChange(event.target.value)} className={inputClassName("min-h-24 resize-none")} placeholder="インポートする JSON を貼り付け" />
        <button type="button" onClick={onResetAll} className="w-full rounded-base border border-red-300 px-3 py-2 text-sm font-bold text-red-600">
          全データ初期化
        </button>
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
          <select value={settings.defaultTemplateId} onChange={(event) => onSettingsChange({ ...settings, defaultTemplateId: event.target.value })} className={inputClassName()}>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          {templates.map((template) => (
            <div key={template.id} className="rounded-base border border-border bg-surface px-3 py-3">
              <p className="text-sm font-bold text-foreground">{template.name}</p>
              <p className="mt-1 text-xs text-muted">{template.description}</p>
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
        <div className="rounded-base border border-border bg-surface px-3 py-3">
          <FieldLabel>テンプレ名</FieldLabel>
          <input value={templateDraft.name} onChange={(event) => onTemplateDraftChange({ ...templateDraft, name: event.target.value })} className={inputClassName()} />
          <FieldLabel>説明</FieldLabel>
          <input value={templateDraft.description} onChange={(event) => onTemplateDraftChange({ ...templateDraft, description: event.target.value })} className={inputClassName()} />
          <FieldLabel>本文</FieldLabel>
          <textarea value={templateDraft.body} onChange={(event) => onTemplateDraftChange({ ...templateDraft, body: event.target.value })} className={inputClassName("min-h-28 resize-none")} />
          <p className="mt-2 text-xs leading-5 text-muted">使用可: {"{date} {startTime} {endTime} {title} {platform} {category} {memo}"}</p>
          <button type="button" onClick={onAddTemplate} className="mt-3 w-full rounded-base bg-primary px-3 py-2 text-sm font-bold text-white">
            テンプレートを保存
          </button>
        </div>
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
  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-base border border-border bg-surface-muted/35 p-3">
        <FieldLabel>検索</FieldLabel>
        <input
          value={filters.query}
          onChange={(event) => onFilterChange({ ...filters, query: event.target.value })}
          className={inputClassName("mt-0")}
          placeholder="タイトル・メモを検索"
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <FieldLabel>カテゴリ</FieldLabel>
            <select
              value={filters.category}
              onChange={(event) => onFilterChange({ ...filters, category: event.target.value as EventCategory | "all" })}
              className={inputClassName()}
            >
              <option value="all">すべて</option>
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <FieldLabel>媒体</FieldLabel>
            <select
              value={filters.platform}
              onChange={(event) => onFilterChange({ ...filters, platform: event.target.value as EventPlatform | "all" })}
              className={inputClassName()}
            >
              <option value="all">すべて</option>
              {platformOptions.map((option) => (
                <option key={option || "none"} value={option}>
                  {option || "-"}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <FieldLabel>期間</FieldLabel>
            <select
              value={filters.period}
              onChange={(event) => onFilterChange({ ...filters, period: event.target.value as EventPeriodFilter })}
              className={inputClassName()}
            >
              <option value="all">全期間</option>
              <option value="today">今日以降</option>
              <option value="week">7日以内</option>
              <option value="month">30日以内</option>
            </select>
          </div>
          <div>
            <FieldLabel>並び順</FieldLabel>
            <select
              value={filters.sortOrder}
              onChange={(event) => onFilterChange({ ...filters, sortOrder: event.target.value as EventSortOrder })}
              className={inputClassName()}
            >
              <option value="upcoming">直近順</option>
              <option value="dateAsc">日付昇順</option>
              <option value="dateDesc">日付降順</option>
            </select>
          </div>
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
            events.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => onSelectEvent(event)}
                className={[
                  "w-full rounded-base border px-3 py-3 text-left transition hover:border-primary/60",
                  selectedEventId === event.id ? "border-primary bg-primary-soft/55" : "border-border bg-surface"
                ].join(" ")}
              >
                <span className="text-xs font-bold text-primary-strong">{getLongDateLabel(event.date)}</span>
                <span className="mt-1 block text-xs font-bold text-muted">
                  {event.startTime} - {event.endTime}
                </span>
                <span className="mt-1 block truncate text-sm font-bold text-foreground">{event.title || "無題の予定"}</span>
                <span className="mt-2 inline-flex rounded-base bg-surface-muted px-2 py-1 text-xs font-bold text-muted">
                  {categoryMeta[event.category].label}
                  {event.platform ? ` / ${event.platform}` : ""}
                </span>
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function DesktopSettingsPanel({
  settings,
  templates,
  templateDraft,
  importText,
  settingsStatus,
  storageError,
  onSettingsChange,
  onTemplateDraftChange,
  onAddTemplate,
  onEditTemplate,
  onDeleteTemplate,
  onExport,
  onImportTextChange,
  onImport,
  onResetAll
}: {
  settings: ScheduleSettings;
  templates: PostTemplate[];
  templateDraft: PostTemplate;
  importText: string;
  settingsStatus: string;
  storageError: string;
  onSettingsChange: (settings: ScheduleSettings) => void;
  onTemplateDraftChange: (template: PostTemplate) => void;
  onAddTemplate: () => void;
  onEditTemplate: (template: PostTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  onExport: () => void;
  onImportTextChange: (value: string) => void;
  onImport: () => void;
  onResetAll: () => void;
}) {
  const [openSections, setOpenSections] = useState<Record<SettingsSectionId, boolean>>({
    display: true,
    defaults: true,
    data: false,
    templates: false
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
            <select value={settings.defaultView} onChange={(event) => onSettingsChange({ ...settings, defaultView: event.target.value as CalendarView })} className={inputClassName()}>
              <option value="month">月</option>
              <option value="week">週</option>
              <option value="day">日</option>
            </select>
          </div>
          <div>
            <FieldLabel>週開始曜日</FieldLabel>
            <select value={settings.weekStartsOn} onChange={(event) => onSettingsChange({ ...settings, weekStartsOn: Number(event.target.value) as 0 | 1 })} className={inputClassName()}>
              <option value={0}>日曜</option>
              <option value={1}>月曜</option>
            </select>
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
            <input type="time" value={settings.defaultStartTime} onChange={(event) => onSettingsChange({ ...settings, defaultStartTime: event.target.value })} className={inputClassName()} />
          </div>
          <div>
            <FieldLabel>既定所要時間</FieldLabel>
            <select value={settings.defaultDurationMinutes} onChange={(event) => onSettingsChange({ ...settings, defaultDurationMinutes: Number(event.target.value) })} className={inputClassName()}>
              {defaultDurationMinuteOptions.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {minutes}分
                </option>
              ))}
            </select>
          </div>
        </div>
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
          <select value={settings.defaultTemplateId} onChange={(event) => onSettingsChange({ ...settings, defaultTemplateId: event.target.value })} className={inputClassName()}>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          {templates.map((template) => (
            <div key={template.id} className="rounded-base border border-border bg-surface px-3 py-3">
              <p className="text-sm font-bold text-foreground">{template.name}</p>
              <p className="mt-1 text-xs leading-5 text-muted">{template.description}</p>
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
        <div className="rounded-base border border-border bg-surface px-3 py-3">
          <FieldLabel>テンプレ名</FieldLabel>
          <input value={templateDraft.name} onChange={(event) => onTemplateDraftChange({ ...templateDraft, name: event.target.value })} className={inputClassName()} />
          <FieldLabel>説明</FieldLabel>
          <input value={templateDraft.description} onChange={(event) => onTemplateDraftChange({ ...templateDraft, description: event.target.value })} className={inputClassName()} />
          <FieldLabel>本文</FieldLabel>
          <textarea value={templateDraft.body} onChange={(event) => onTemplateDraftChange({ ...templateDraft, body: event.target.value })} className={inputClassName("min-h-28 resize-none")} />
          <p className="mt-2 text-xs leading-5 text-muted">使用可: {"{date} {startTime} {endTime} {title} {platform} {category} {memo}"}</p>
          <button type="button" onClick={onAddTemplate} className="mt-3 w-full rounded-base bg-primary px-3 py-2 text-sm font-bold text-white">
            テンプレートを保存
          </button>
        </div>
      </SettingsAccordionSection>
      <SettingsAccordionSection
        id="data"
        title="データ管理"
        summary="JSON保存・復元 / 全データ削除"
        open={openSections.data}
        onToggle={toggleSection}
      >
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onExport} className="flat-control px-3 py-2">
            JSONエクスポート
          </button>
          <button type="button" onClick={onImport} className="flat-control px-3 py-2">
            JSONインポート
          </button>
        </div>
        <textarea value={importText} onChange={(event) => onImportTextChange(event.target.value)} className={inputClassName("min-h-28 resize-none")} placeholder="インポートする JSON を貼り付け" />
        <button type="button" onClick={onResetAll} className="w-full rounded-base border border-red-300 px-3 py-2 text-sm font-bold text-red-600">
          全データ削除
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
  onDraftChange,
  onSave,
  onDelete,
  canDelete
}: {
  draft: ScheduleEvent;
  onDraftChange: (event: ScheduleEvent) => void;
  onSave: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
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
          onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
          className={inputClassName()}
          placeholder="配信企画会議"
          required
        />
      </div>
      <div className="rounded-base border border-border bg-surface-muted/35 p-3">
        <FieldLabel>日付</FieldLabel>
        <input
          type="date"
          value={draft.date}
          onChange={(event) => onDraftChange({ ...draft, date: event.target.value })}
          className={inputClassName()}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3 rounded-base border border-border bg-surface-muted/35 p-3">
        <div>
          <FieldLabel>開始時間</FieldLabel>
          <input
            type="time"
            value={draft.startTime}
            onChange={(event) => onDraftChange({ ...draft, startTime: event.target.value })}
            className={inputClassName()}
            required
          />
        </div>
        <div>
          <FieldLabel>終了時間</FieldLabel>
          <input
            type="time"
            value={draft.endTime}
            onChange={(event) => onDraftChange({ ...draft, endTime: event.target.value })}
            className={inputClassName()}
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 rounded-base border border-border bg-surface-muted/35 p-3">
        <div>
          <FieldLabel>カテゴリ</FieldLabel>
          <select
            value={draft.category}
            onChange={(event) => onDraftChange({ ...draft, category: event.target.value as ScheduleEvent["category"] })}
            className={inputClassName()}
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel>プラットフォーム</FieldLabel>
          <select
            value={draft.platform}
            onChange={(event) => onDraftChange({ ...draft, platform: event.target.value as ScheduleEvent["platform"] })}
            className={inputClassName()}
          >
            {platformOptions.map((option) => (
              <option key={option || "none"} value={option}>
                {option || "-"}
              </option>
            ))}
          </select>
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

function SchedulePanel({
  selectedDateKey,
  selectedEvent,
  dayEvents,
  draft,
  statusMessage,
  onDraftChange,
  onNew,
  onSelectEvent,
  onSave,
  onDelete
}: {
  selectedDateKey: string;
  selectedEvent: ScheduleEvent | null;
  dayEvents: ScheduleEvent[];
  draft: ScheduleEvent;
  statusMessage: string;
  onDraftChange: (event: ScheduleEvent) => void;
  onNew: () => void;
  onSelectEvent: (event: ScheduleEvent) => void;
  onSave: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-4">
      <section className={tabletUpClassName}>
        <p className="text-xs font-bold text-muted">選択中の日付</p>
        <p className="mt-1 text-base font-bold text-foreground">{getLongDateLabel(selectedDateKey)}</p>
        <p className="mt-1 text-sm text-muted">予定 {dayEvents.length} 件</p>
      </section>
      <section className="lg:border-t lg:border-border lg:pt-5">
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
              <button
                key={event.id}
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
                </span>
              </button>
            ))
          )}
        </div>
        <button type="button" className={["mt-3 w-full rounded-base bg-primary px-3 py-3 text-sm font-bold text-white transition hover:bg-primary-strong", mobileOnlyClassName].join(" ")} onClick={onNew}>
          新しい予定を追加
        </button>
      </section>
      <section className="border-t border-border pt-5">
        <h2 className="text-sm font-bold text-foreground">{selectedEvent ? "予定の編集" : "新しい予定"}</h2>
        <div className="mt-3">
          <ScheduleForm
            draft={draft}
            onDraftChange={onDraftChange}
            onSave={onSave}
            onDelete={onDelete}
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
  templateId,
  postText,
  copyStatus,
  copyStatusKind,
  copyFallbackText,
  onTemplateChange,
  onCopy
}: {
  selectedEvent: ScheduleEvent | null;
  templates: PostTemplate[];
  templateId: string;
  postText: string;
  copyStatus: string;
  copyStatusKind: CopyStatusKind;
  copyFallbackText: string;
  onTemplateChange: (id: string) => void;
  onCopy: () => void;
}) {
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(postText)}`;

  return (
    <div className="space-y-5">
      <section>
        <p className="text-xs font-bold text-muted">対象予定</p>
        <p className="mt-1 text-base font-bold text-foreground">{selectedEvent?.title || "予定未選択"}</p>
        <p className="mt-1 text-sm text-muted">
          {selectedEvent ? `${getLongDateLabel(selectedEvent.date)} ${selectedEvent.startTime}` : "予定を選ぶと文面に反映されます。"}
        </p>
      </section>
      <section className="border-t border-border pt-5">
        <FieldLabel>テンプレート</FieldLabel>
        <select value={templateId} onChange={(event) => onTemplateChange(event.target.value)} className={inputClassName()}>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
        <p className="mt-2 text-sm leading-6 text-muted">
          {templates.find((template) => template.id === templateId)?.description}
        </p>
      </section>
      <section className="border-t border-border pt-5">
        <h2 className="text-sm font-bold text-foreground">投稿文プレビュー</h2>
        <textarea
          value={postText}
          readOnly
          className="mt-3 min-h-44 w-full resize-none rounded-base border border-border bg-surface-muted px-3 py-3 text-sm leading-6 text-foreground lg:text-[13px]"
        />
        <div className="sticky bottom-0 z-20 -mx-3 mt-3 grid grid-cols-2 gap-2 border-t border-border bg-surface/95 px-3 py-3 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
          <button type="button" onClick={onCopy} className="flat-control flex-1 px-3 py-2">
            コピー
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
    body: "【告知】\n{date} {startTime} - {endTime}\n{title}"
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
  const [templateDraft, setTemplateDraft] = useState<PostTemplate>(() => createTemplateDraft());
  const [templateId, setTemplateId] = useState(defaultScheduleSettings.defaultTemplateId);
  const [statusMessage, setStatusMessage] = useState("");
  const [settingsStatus, setSettingsStatus] = useState("");
  const [importText, setImportText] = useState("");
  const [eventFilters, setEventFilters] = useState<EventListFilters>({
    query: "",
    category: "all",
    platform: "all",
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
  const [pendingDeletedEvent, setPendingDeletedEvent] = useState<ScheduleEvent | null>(null);
  const mobileSheetDragStartYRef = useRef<number | null>(null);
  const skipNextStorageWriteRef = useRef(false);
  const undoDeleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        JSON.stringify(createScheduleStoragePayload(events, settings, userPostTemplates))
      );
      setStorageError("");
    } catch {
      setStorageError(saveFailureMessage);
    }
  }, [events, hydrated, settings, userPostTemplates]);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );
  const selectedDayEvents = useMemo(() => getEventsForDate(events, selectedDateKey), [events, selectedDateKey]);
  const postText = useMemo(() => generatePostText(selectedEvent, templateId, userPostTemplates), [selectedEvent, templateId, userPostTemplates]);
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

        return `${event.title} ${event.memo}`.toLowerCase().includes(query);
      });
  }, [eventFilters, visibleEvents]);

  useEffect(() => {
    setCopyStatus("");
    setCopyStatusKind("idle");
    setCopyFallbackText("");
  }, [postText]);

  useEffect(() => {
    return () => {
      if (undoDeleteTimerRef.current) {
        clearTimeout(undoDeleteTimerRef.current);
      }
    };
  }, []);

  function clearUndoDeleteTimer() {
    if (!undoDeleteTimerRef.current) {
      return;
    }

    clearTimeout(undoDeleteTimerRef.current);
    undoDeleteTimerRef.current = null;
  }

  function showDeleteUndoToast(event: ScheduleEvent) {
    clearUndoDeleteTimer();
    setPendingDeletedEvent(event);
    undoDeleteTimerRef.current = setTimeout(() => {
      setPendingDeletedEvent(null);
      undoDeleteTimerRef.current = null;
    }, 8000);
  }

  function closeDeleteUndoToast() {
    clearUndoDeleteTimer();
    setPendingDeletedEvent(null);
  }

  function restoreDeletedEvent() {
    if (!pendingDeletedEvent) {
      return;
    }

    const restoredEvent = pendingDeletedEvent;
    clearUndoDeleteTimer();
    setEvents((current) => {
      if (current.some((event) => event.id === restoredEvent.id)) {
        return current;
      }

      return sortEvents([...current, restoredEvent]);
    });
    setPendingDeletedEvent(null);
    setSelectedDateKey(restoredEvent.date);
    setCursorDate(parseDateKey(restoredEvent.date));
    setSelectedEventId(restoredEvent.id);
    setDraft({ ...restoredEvent });
    setActiveTab("schedule");
    setMobileSheetOpen(true);
    setStatusMessage("削除した予定を元に戻しました。");
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
    setMobileSheetOpen(true);
    setStatusMessage("");
  }

  function createNewEvent() {
    const next = createEventDraft(selectedDateKey, settings);
    setSelectedEventId(null);
    setDraft(next);
    setActiveTab("schedule");
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
    setMobileSheetOpen(true);
    setStatusMessage("");
  }

  function saveDraft() {
    if (draft.endTime <= draft.startTime) {
      setStatusMessage("終了時間は開始時間より後にしてください。");
      return;
    }

    const nextDraft = { ...draft, title: draft.title.trim() || "無題の予定" };
    setEvents((current) => {
      const exists = current.some((event) => event.id === nextDraft.id);
      return sortEvents(exists ? current.map((event) => (event.id === nextDraft.id ? nextDraft : event)) : [...current, nextDraft]);
    });
    setSelectedDateKey(nextDraft.date);
    setCursorDate(parseDateKey(nextDraft.date));
    setSelectedEventId(nextDraft.id);
    setDraft(nextDraft);
    setMobileSheetOpen(true);
    setStatusMessage("予定を保存しました。");
  }

  function deleteSelectedEvent() {
    if (!selectedEvent) {
      return;
    }

    const deletedEvent = selectedEvent;
    setEvents((current) => current.filter((event) => event.id !== selectedEvent.id));
    showDeleteUndoToast(deletedEvent);
    setSelectedEventId(null);
    setDraft(createEventDraft(selectedDateKey, settings));
    setMobileSheetOpen(false);
    setStatusMessage("予定を削除しました。");
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
      body: templateDraft.body.trim() || "{title}"
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

  function exportJson() {
    const payload = createScheduleStoragePayload(events, settings, userPostTemplates);
    setImportText(JSON.stringify(payload, null, 2));
    setSettingsStatus("JSONを出力しました。");
  }

  function importJson() {
    try {
      const parsedPayload = JSON.parse(importText);
      if (!isImportableSchedulePayload(parsedPayload)) {
        throw new Error("Unsupported import payload");
      }

      const payload = normalizeStoragePayload(parsedPayload);
      setEvents(payload.events);
      setSettings(payload.settings);
      setUserPostTemplates(payload.postTemplates);
      setTemplateId(payload.settings.defaultTemplateId);
      setView(payload.settings.defaultView);
      setSelectedEventId(null);
      setDraft(createEventDraft(selectedDateKey, payload.settings));
      setSettingsStatus("JSONをインポートしました。");
      setStorageError("");
    } catch {
      setSettingsStatus(importFailureMessage);
    }
  }

  function resetAllData() {
    const currentDateKey = toDateKey(new Date());
    setEvents([]);
    setSettings(defaultScheduleSettings);
    setUserPostTemplates(postTemplates);
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
                onSelectEvent={selectEvent}
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
                onSelectEvent={selectEvent}
              />
            ) : null}
            {view === "day" ? (
              <DayView
                events={visibleEvents}
                selectedDateKey={selectedDateKey}
                selectedEventId={selectedEventId}
                onSelectEvent={selectEvent}
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
                onSelectEvent={selectEvent}
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
              templateDraft={templateDraft}
              importText={importText}
              settingsStatus={settingsStatus}
              onSettingsChange={updateSettings}
              onTemplateDraftChange={setTemplateDraft}
              onAddTemplate={saveTemplateDraft}
              onEditTemplate={editTemplate}
              onDeleteTemplate={deleteTemplate}
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
            "scrollbar-accent min-h-0 overflow-y-auto bg-surface px-3 py-3 transition-transform lg:[scrollbar-gutter:stable] xl:px-4 xl:py-4",
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
          <div className="sticky top-0 z-20 border-b border-border bg-surface px-3 pb-3 pt-3 shadow-sm lg:mb-4 lg:border-b-0 lg:bg-transparent lg:p-0 lg:pb-0 lg:shadow-none">
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
            <div className="grid grid-cols-2 rounded-base border border-border bg-surface-muted p-1 shadow-sm lg:hidden">
              {[
                { id: "schedule" as PanelTab, label: "予定管理" },
                { id: "post" as PanelTab, label: "投稿補助" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    "rounded-base px-3 py-2 text-sm font-bold transition",
                    activeTab === tab.id ? "bg-surface text-primary-strong shadow-sm" : "text-muted hover:text-foreground"
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="hidden grid-cols-2 rounded-base border border-border bg-surface-muted p-1 shadow-sm lg:grid">
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
                    "rounded-base px-3 py-2 text-sm font-bold transition",
                    activeTab === tab.id ? "bg-surface text-primary-strong shadow-sm" : "text-muted hover:text-foreground"
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
                statusMessage={statusMessage}
                onDraftChange={setDraft}
                onNew={createNewEvent}
                onSelectEvent={selectEvent}
                onSave={saveDraft}
                onDelete={deleteSelectedEvent}
              />
            ) : null}
            {activeTab === "post" ? (
              <PostAssistPanel
                selectedEvent={selectedEvent}
                templates={userPostTemplates}
                templateId={templateId}
                postText={postText}
                copyStatus={copyStatus}
                copyStatusKind={copyStatusKind}
                copyFallbackText={copyFallbackText}
                onTemplateChange={setTemplateId}
                onCopy={copyPostText}
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
                  templateDraft={templateDraft}
                  importText={importText}
                  settingsStatus={settingsStatus}
                  storageError={storageError}
                  onSettingsChange={updateSettings}
                  onTemplateDraftChange={setTemplateDraft}
                  onAddTemplate={saveTemplateDraft}
                  onEditTemplate={editTemplate}
                  onDeleteTemplate={deleteTemplate}
                  onExport={exportJson}
                  onImportTextChange={setImportText}
                  onImport={importJson}
                  onResetAll={resetAllData}
                />
              </div>
            ) : null}
          </div>
        </aside>
        {pendingDeletedEvent ? (
          <div
            className="fixed inset-x-4 bottom-20 z-50 rounded-base border border-border bg-surface px-3 py-3 shadow-panel lg:bottom-6 lg:left-auto lg:right-6 lg:w-[22rem]"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">予定を削除しました。</p>
                <p className="mt-1 truncate text-xs font-bold text-muted">{pendingDeletedEvent.title || "無題の予定"}</p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-base border border-border px-2.5 py-1.5 text-xs font-bold text-primary-strong transition hover:bg-surface-muted"
                onClick={restoreDeletedEvent}
              >
                元に戻す
              </button>
              <button
                type="button"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-base text-lg leading-none text-muted transition hover:bg-surface-muted"
                aria-label="削除通知を閉じる"
                onClick={closeDeleteUndoToast}
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
