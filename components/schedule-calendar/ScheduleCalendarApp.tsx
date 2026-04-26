"use client";

import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
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

const viewLabels: Record<CalendarView, string> = {
  month: "月",
  week: "週",
  day: "日"
};

const hourRows = Array.from({ length: 17 }, (_, index) => index + 7);
const timelineStartMinutes = 7 * 60;
const timelineEndMinutes = 24 * 60;
const timelineMinutes = timelineEndMinutes - timelineStartMinutes;

function formatHour(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function handleDateKeyDown(event: KeyboardEvent, onSelect: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onSelect();
  }
}

function getEventStyle(event: ScheduleEvent) {
  const start = Math.max(timelineStartMinutes, getEventStartMinutes(event));
  const duration = Math.min(timelineEndMinutes - start, getEventDurationMinutes(event));
  return {
    top: `${((start - timelineStartMinutes) / timelineMinutes) * 100}%`,
    height: `${Math.max(5, (duration / timelineMinutes) * 100)}%`
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
    <div className="flex flex-col gap-3 border-b border-border px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
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
        "w-full rounded-base border px-2 py-1 text-left transition hover:border-primary/70 hover:shadow-sm",
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

  return (
    <div className="min-w-[860px]">
      <div className="grid grid-cols-[64px_repeat(7,minmax(96px,1fr))] border-b border-border bg-surface-muted/70">
        <div className="border-r border-border px-2 py-3 text-xs font-bold text-muted">時刻</div>
        {days.map((day) => {
          const key = toDateKey(day);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(key)}
              className={[
                "border-r border-border px-2 py-3 text-center text-sm transition last:border-r-0 hover:bg-primary-soft/35",
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
      </div>
      <div className="grid grid-cols-[64px_repeat(7,minmax(96px,1fr))]">
        <div className="border-r border-border">
          {hourRows.map((hour) => (
            <div key={hour} className="h-16 border-b border-border px-2 pt-1 text-[11px] font-bold text-muted">
              {formatHour(hour)}
            </div>
          ))}
        </div>
        {days.map((day) => {
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
                "relative min-h-[1088px] border-r border-border text-left last:border-r-0",
                selectedDateKey === key ? "bg-primary-soft/20" : "bg-surface"
              ].join(" ")}
            >
              {hourRows.map((hour) => (
                <span key={hour} className="pointer-events-none block h-16 border-b border-border/80" />
              ))}
              {dayEvents.length === 0 ? (
                <span className="absolute left-2 right-2 top-4 rounded-base border border-dashed border-border px-2 py-2 text-center text-xs text-muted">
                  予定なし
                </span>
              ) : null}
              {dayEvents.map((event) => (
                <span
                  key={event.id}
                  className="absolute left-2 right-2 block"
                  style={getEventStyle(event)}
                >
                  <EventPill
                    event={event}
                    selected={selectedEventId === event.id}
                    onSelect={onSelectEvent}
                  />
                </span>
              ))}
            </div>
          );
        })}
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

  return (
    <div className="min-w-[760px]">
      <div className="grid grid-cols-7 border-b border-border bg-surface-muted/70">
        {["日", "月", "火", "水", "木", "金", "土"].map((label) => (
          <div key={label} className="border-r border-border px-2 py-2 text-center text-xs font-bold text-muted last:border-r-0">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
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
                "min-h-32 border-b border-r border-border p-2 text-left transition last:border-r-0 hover:bg-primary-soft/25",
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
                {dayEvents.slice(0, 3).map((event) => (
                  <EventPill
                    key={event.id}
                    event={event}
                    selected={selectedEventId === event.id}
                    compact
                    onSelect={onSelectEvent}
                  />
                ))}
                {dayEvents.length > 3 ? (
                  <span className="text-xs font-bold text-muted">+{dayEvents.length - 3}件</span>
                ) : null}
              </span>
            </div>
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
    <div className="min-w-[640px]">
      <div className="border-b border-border bg-surface-muted/70 px-4 py-3 text-sm font-bold text-foreground">
        {getLongDateLabel(selectedDateKey)}
      </div>
      <div className="grid grid-cols-[72px_1fr]">
        <div className="border-r border-border">
          {hourRows.map((hour) => (
            <div key={hour} className="h-16 border-b border-border px-3 pt-1 text-[11px] font-bold text-muted">
              {formatHour(hour)}
            </div>
          ))}
        </div>
        <div className="relative min-h-[1088px] bg-surface">
          {hourRows.map((hour) => (
            <span key={hour} className="pointer-events-none block h-16 border-b border-border/80" />
          ))}
          {dayEvents.length === 0 ? (
            <div className="absolute left-4 right-4 top-5 rounded-base border border-dashed border-border bg-surface-muted/55 px-4 py-5 text-center text-sm text-muted">
              この日の予定はまだありません。
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
      <div className="flex gap-2 pt-2">
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
  onTemplateChange,
  onCopy
}: {
  selectedEvent: ScheduleEvent | null;
  templateId: string;
  postText: string;
  copyStatus: string;
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
        <div className="mt-3 flex gap-2">
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
        {copyStatus ? <p className="mt-3 text-sm font-semibold text-primary-strong">{copyStatus}</p> : null}
      </section>
    </div>
  );
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
      await navigator.clipboard.writeText(postText);
      setCopyStatus("投稿文をコピーしました。");
    } catch {
      setCopyStatus("コピーできませんでした。手動で選択してコピーしてください。");
    }
  }

  if (!hydrated) {
    return <div className="panel p-8 text-sm text-muted">スケジュールカレンダーを読み込んでいます。</div>;
  }

  return (
    <div className="space-y-4">
      <section className="panel overflow-hidden">
        <CalendarToolbar
          view={view}
          cursorDate={cursorDate}
          onViewChange={setView}
          onToday={() => selectDate(toDateKey(new Date()))}
          onMove={movePeriod}
        />
        {storageError ? (
          <div className="border-b border-border bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/35 dark:text-red-200">
            {storageError}
          </div>
        ) : null}
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 border-b border-border xl:border-b-0 xl:border-r">
            <div className="scrollbar-accent overflow-x-auto">
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
          <aside className="bg-surface px-4 py-4 xl:min-h-[720px]">
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
                onTemplateChange={setTemplateId}
                onCopy={copyPostText}
              />
            )}
          </aside>
        </div>
      </section>
      <div className="flex flex-wrap gap-2 text-xs font-bold text-muted">
        <span className="mr-1 py-1">カテゴリ</span>
        {categoryOptions.map((option) => (
          <span
            key={option.value}
            className={["rounded-base border px-2 py-1", categoryMeta[option.value].tone].join(" ")}
          >
            {option.label}
          </span>
        ))}
      </div>
    </div>
  );
}
