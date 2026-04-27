"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  addDays,
  addMonths,
  categoryMeta,
  categoryOptions,
  createEmptyEvent,
  generatePostText,
  getEventDurationMinutes,
  getEventsForDate,
  getEventStartMinutes,
  getLongDateLabel,
  getMonthGrid,
  getPeriodLabel,
  getShortDateLabel,
  getWeekDays,
  normalizeEvents,
  parseDateKey,
  platformOptions,
  postTemplates,
  scheduleStorageKey,
  sortEvents,
  toDateKey,
  type CalendarView,
  type ScheduleEvent
} from "@/lib/schedule-calendar";

type PanelTab = "schedule" | "post";
type CopyStatusKind = "idle" | "success" | "error";

const viewLabels: Record<CalendarView, string> = {
  month: "月",
  week: "週",
  day: "日"
};

const timeSlots = Array.from({ length: 48 }, (_, index) => index * 30);
const timelineStartMinutes = 0;
const timelineEndMinutes = 24 * 60;
const timelineMinutes = timelineEndMinutes - timelineStartMinutes;
const timeGridMinHeightClassName = "min-h-[1344px]";
const timeSlotHeightClassName = "h-7";
const weekGridTemplateColumns = "58px repeat(7, minmax(84px, 1fr))";

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
  onViewChange,
  onToday,
  onMove
}: {
  view: CalendarView;
  cursorDate: Date;
  onViewChange: (view: CalendarView) => void;
  onToday: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">スケジュールカレンダー</h1>
        <p className="mt-1 text-sm text-muted">配信・投稿・制作などの予定を一元管理できます。</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="flat-control px-3 py-2" onClick={onToday}>
          今日
        </button>
        <div className="flex items-center overflow-hidden rounded-base border border-border bg-surface">
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
        <div className="min-w-0 rounded-base border border-border bg-surface-muted px-3 py-2 text-sm font-bold text-foreground">
          {getPeriodLabel(cursorDate, view)}
        </div>
        <div className="flex rounded-base border border-border bg-surface p-1">
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
    <div className="scrollbar-accent flex shrink-0 items-center gap-2 overflow-x-auto border-b border-border px-4 py-2 text-xs font-bold text-muted">
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
  selectedDateKey,
  selectedEventId,
  onSelectDate,
  onSelectEvent
}: {
  events: ScheduleEvent[];
  cursorDate: Date;
  selectedDateKey: string;
  selectedEventId: string | null;
  onSelectDate: (dateKey: string) => void;
  onSelectEvent: (event: ScheduleEvent) => void;
}) {
  const days = getWeekDays(cursorDate);
  const todayKey = toDateKey(new Date());
  const { scrollContainerRef, scrollbarWidth } = useMeasuredScrollbarWidth();

  const weekHeaderGridStyle = {
    gridTemplateColumns: `${weekGridTemplateColumns} ${scrollbarWidth}px`
  };
  const weekBodyGridStyle = {
    gridTemplateColumns: weekGridTemplateColumns
  };

  return (
    <div className="flex h-full min-w-[760px] min-h-0 flex-col">
      <div className="grid shrink-0 border-b border-border bg-surface-muted/70" style={weekHeaderGridStyle}>
        <div className="border-r border-border px-2 py-3 text-xs font-bold text-muted">時刻</div>
        {days.map((day, dayIndex) => {
          const key = toDateKey(day);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(key)}
              className={[
                "px-2 py-3 text-center text-sm transition hover:bg-primary-soft/35",
                dayIndex === days.length - 1 ? "" : "border-r border-border",
                selectedDateKey === key ? "bg-primary-soft text-primary-strong" : "text-foreground"
              ].join(" ")}
            >
              <span className="block text-xs font-bold text-muted">{getShortDateLabel(day).split(" ")[1]}</span>
              <span
                className={[
                  "mt-1 inline-grid h-8 min-w-8 place-items-center rounded-base px-2 font-bold",
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
  selectedDateKey,
  selectedEventId,
  onSelectDate,
  onSelectEvent
}: {
  events: ScheduleEvent[];
  cursorDate: Date;
  selectedDateKey: string;
  selectedEventId: string | null;
  onSelectDate: (dateKey: string) => void;
  onSelectEvent: (event: ScheduleEvent) => void;
}) {
  const days = getMonthGrid(cursorDate);
  const todayKey = toDateKey(new Date());
  const { scrollContainerRef, scrollbarWidth } = useMeasuredScrollbarWidth();
  const monthHeaderGridStyle = {
    gridTemplateColumns: `repeat(7, minmax(0, 1fr)) ${scrollbarWidth}px`
  };

  return (
    <div className="flex h-full min-w-[720px] min-h-0 flex-col">
      <div className="grid shrink-0 border-b border-border bg-surface-muted/70" style={monthHeaderGridStyle}>
        {["日", "月", "火", "水", "木", "金", "土"].map((label, dayIndex) => (
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
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <div>
        <FieldLabel>タイトル</FieldLabel>
        <input
          value={draft.title}
          onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
          className={inputClassName()}
          placeholder="配信企画会議"
          required
        />
      </div>
      <div>
        <FieldLabel>日付</FieldLabel>
        <input
          type="date"
          value={draft.date}
          onChange={(event) => onDraftChange({ ...draft, date: event.target.value })}
          className={inputClassName()}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
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
      <div className="grid grid-cols-2 gap-3">
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
      <div>
        <FieldLabel>メモ・備考</FieldLabel>
        <textarea
          value={draft.memo}
          onChange={(event) => onDraftChange({ ...draft, memo: event.target.value })}
          className={inputClassName("min-h-24 resize-none")}
          placeholder="次回配信のセットリストやコラボ企画案を記録する。"
        />
      </div>
      <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-2">
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
    <div className="space-y-5">
      <section>
        <p className="text-xs font-bold text-muted">選択中の日付</p>
        <p className="mt-1 text-base font-bold text-foreground">{getLongDateLabel(selectedDateKey)}</p>
        <p className="mt-1 text-sm text-muted">予定 {dayEvents.length} 件</p>
      </section>
      <section className="border-t border-border pt-5">
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
                </span>
              </button>
            ))
          )}
        </div>
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
  templateId,
  postText,
  copyStatus,
  copyStatusKind,
  copyFallbackText,
  onTemplateChange,
  onCopy
}: {
  selectedEvent: ScheduleEvent | null;
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
          {postTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
        <p className="mt-2 text-sm leading-6 text-muted">
          {postTemplates.find((template) => template.id === templateId)?.description}
        </p>
      </section>
      <section className="border-t border-border pt-5">
        <h2 className="text-sm font-bold text-foreground">投稿文プレビュー</h2>
        <textarea
          value={postText}
          readOnly
          className="mt-3 min-h-44 w-full resize-none rounded-base border border-border bg-surface-muted px-3 py-3 text-sm leading-6 text-foreground"
        />
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
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
    return "このブラウザでは自動コピーを利用できません。下の文面を選択してコピーしてください。";
  }

  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "クリップボード権限が許可されていません。下の文面を選択してコピーしてください。";
  }

  return "コピーできませんでした。下の文面を選択してコピーしてください。";
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
  const [templateId, setTemplateId] = useState(postTemplates[0].id);
  const [statusMessage, setStatusMessage] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [copyStatusKind, setCopyStatusKind] = useState<CopyStatusKind>("idle");
  const [copyFallbackText, setCopyFallbackText] = useState("");
  const [storageError, setStorageError] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const currentDate = new Date();
    const currentDateKey = toDateKey(currentDate);
    setCursorDate(currentDate);
    setSelectedDateKey(currentDateKey);
    setDraft(createEmptyEvent(currentDateKey));

    try {
      const raw = window.localStorage.getItem(scheduleStorageKey);
      if (raw) {
        setEvents(normalizeEvents(JSON.parse(raw)));
      }
    } catch {
      setStorageError("保存済みデータを読み込めませんでした。");
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    try {
      window.localStorage.setItem(scheduleStorageKey, JSON.stringify(events));
      setStorageError("");
    } catch {
      setStorageError("localStorage に保存できませんでした。");
    }
  }, [events, hydrated]);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );
  const selectedDayEvents = useMemo(() => getEventsForDate(events, selectedDateKey), [events, selectedDateKey]);
  const postText = useMemo(() => generatePostText(selectedEvent, templateId), [selectedEvent, templateId]);
  const visibleEvents = useMemo(() => sortEvents(events), [events]);

  useEffect(() => {
    setCopyStatus("");
    setCopyStatusKind("idle");
    setCopyFallbackText("");
  }, [postText]);

  function selectDate(dateKey: string) {
    setSelectedDateKey(dateKey);
    setCursorDate(parseDateKey(dateKey));
    const firstEvent = getEventsForDate(events, dateKey)[0] ?? null;
    setSelectedEventId(firstEvent?.id ?? null);
    setDraft(firstEvent ? { ...firstEvent } : createEmptyEvent(dateKey));
    setStatusMessage("");
  }

  function selectEvent(event: ScheduleEvent) {
    setSelectedDateKey(event.date);
    setCursorDate(parseDateKey(event.date));
    setSelectedEventId(event.id);
    setDraft({ ...event });
    setStatusMessage("");
  }

  function createNewEvent() {
    const next = createEmptyEvent(selectedDateKey);
    setSelectedEventId(null);
    setDraft(next);
    setActiveTab("schedule");
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
    setStatusMessage("予定を保存しました。");
  }

  function deleteSelectedEvent() {
    if (!selectedEvent) {
      return;
    }

    setEvents((current) => current.filter((event) => event.id !== selectedEvent.id));
    setSelectedEventId(null);
    setDraft(createEmptyEvent(selectedDateKey));
    setStatusMessage("予定を削除しました。");
  }

  function movePeriod(direction: -1 | 1) {
    const nextDate = view === "month" ? addMonths(cursorDate, direction) : addDays(cursorDate, direction * (view === "week" ? 7 : 1));
    const nextKey = toDateKey(nextDate);
    setCursorDate(nextDate);
    setSelectedDateKey(nextKey);
    setSelectedEventId(null);
    setDraft(createEmptyEvent(nextKey));
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
      <CalendarToolbar
        view={view}
        cursorDate={cursorDate}
        onViewChange={setView}
        onToday={() => selectDate(toDateKey(new Date()))}
        onMove={movePeriod}
      />
      <CategoryLegend />
      {storageError ? (
        <div className="shrink-0 border-b border-border bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/35 dark:text-red-200">
          {storageError}
        </div>
      ) : null}
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(280px,42vh)] gap-0 xl:grid-cols-[minmax(0,1fr)_360px] xl:grid-rows-none">
        <div className="min-h-0 min-w-0 border-b border-border xl:border-b-0 xl:border-r">
          <div className="scrollbar-accent h-full overflow-x-auto overflow-y-hidden">
            {view === "week" ? (
              <WeekView
                events={visibleEvents}
                cursorDate={cursorDate}
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
        <aside className="scrollbar-accent min-h-0 overflow-y-auto bg-surface px-4 py-4">
          <div className="mb-5 grid grid-cols-2 rounded-base border border-border bg-surface-muted p-1">
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
          ) : (
            <PostAssistPanel
              selectedEvent={selectedEvent}
              templateId={templateId}
              postText={postText}
              copyStatus={copyStatus}
              copyStatusKind={copyStatusKind}
              copyFallbackText={copyFallbackText}
              onTemplateChange={setTemplateId}
              onCopy={copyPostText}
            />
          )}
        </aside>
      </div>
    </section>
  );
}
