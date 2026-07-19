import type { StreamPlan } from "@/lib/viewer-engagement-prompt-board-storage";
import { isSameManualOrderBucket, type StreamPlanGroups } from "@/lib/viewer-engagement-prompt-board-stream-plans";
import { useViewerEngagementPromptBoardCopy } from "@/lib/viewer-engagement-prompt-board-copy";

function canMovePlan(plans: readonly StreamPlan[], index: number, offset: -1 | 1): boolean {
  const plan = plans[index];
  const neighbor = plans[index + offset];
  return plan !== undefined && neighbor !== undefined && isSameManualOrderBucket(plan, neighbor);
}

function StreamPlanCard({
  plan,
  derivedLabel,
  canMoveUp,
  canMoveDown,
  onEdit,
  onDuplicate,
  onMove,
  onMakeCurrent,
  onComplete,
  onPrepare,
  onDelete,
  onEditCards,
  onShowLive
}: {
  readonly plan: StreamPlan;
  readonly derivedLabel: string | null;
  readonly canMoveUp: boolean;
  readonly canMoveDown: boolean;
  readonly onEdit: (plan: StreamPlan) => void;
  readonly onDuplicate: (planId: string) => void;
  readonly onMove: (planId: string, direction: "up" | "down") => void;
  readonly onMakeCurrent: (planId: string) => void;
  readonly onComplete: (planId: string) => void;
  readonly onPrepare: (planId: string) => void;
  readonly onDelete: (planId: string) => void;
  readonly onEditCards: (planId: string) => void;
  readonly onShowLive: (planId: string) => void;
}) {
  const copy = useViewerEngagementPromptBoardCopy();
  const statusLabel = copy.status[plan.status];
  const scheduledAt = plan.scheduledAt === null
    ? copy.planList.unscheduled
    : new Intl.DateTimeFormat(copy.dateLocale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(plan.scheduledAt));
  return (
    <article className="rounded-base border border-border bg-surface p-4" data-stream-plan-id={plan.id}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {derivedLabel === null ? null : <span className="rounded-base bg-primary-soft px-2 py-1 text-xs font-black text-primary-strong">{derivedLabel}</span>}
            <span className="rounded-base border border-border bg-surface-muted px-2 py-1 text-xs font-bold text-muted">{statusLabel}</span>
          </div>
          {plan.status === "live" ? (
            <h3 className="mt-2">
              <button
                type="button"
                className="group flex min-h-11 max-w-full flex-col items-start gap-1 rounded-base border border-primary/30 bg-primary-soft/55 px-3 py-2 text-left text-base font-black text-primary-strong transition hover:border-primary hover:bg-primary-soft sm:flex-row sm:items-center sm:gap-2"
                aria-label={copy.planList.openLiveLabel(plan.title)}
                data-open-live-plan={plan.id}
                onClick={() => onShowLive(plan.id)}
              >
                <span className="min-w-0 break-words [word-break:auto-phrase]">{plan.title}</span>
                <span className="flex shrink-0 items-center gap-1 text-xs font-black">
                  {copy.planList.openLive}
                  <svg viewBox="0 0 16 16" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" />
                  </svg>
                </span>
              </button>
            </h3>
          ) : (
            <h3 className="mt-2 break-words text-base font-black text-foreground">{plan.title}</h3>
          )}
        </div>
        <button type="button" className="flat-control min-h-10 px-3 py-2" onClick={() => onEdit(plan)} aria-label={copy.planList.editLabel(plan.title)}>
          {copy.planList.edit}
        </button>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div><dt className="text-xs font-bold text-muted">{copy.planList.scheduledAt}</dt><dd className="mt-1 font-semibold text-foreground">{scheduledAt}</dd></div>
        <div><dt className="text-xs font-bold text-muted">{copy.planList.manualOrder}</dt><dd className="mt-1 font-semibold text-foreground">{plan.manualOrder}</dd></div>
        <div><dt className="text-xs font-bold text-muted">{copy.planList.prompts}</dt><dd className="mt-1 font-semibold text-foreground">{copy.planList.cardCount(plan.promptCards.length)}</dd></div>
      </dl>
      {plan.notes.trim().length === 0 ? null : <p className="mt-3 whitespace-pre-wrap break-words rounded-base bg-surface-muted px-3 py-2 text-sm leading-6 text-muted">{plan.notes}</p>}

      <div className="mt-4 flex flex-wrap gap-2" aria-label={copy.planList.actionsLabel(plan.title)}>
        <button type="button" className="flat-control min-h-10 px-3 py-2" onClick={() => onEditCards(plan.id)}>{copy.planList.editCards}</button>
        <button type="button" className="flat-control min-h-10 px-3 py-2" onClick={() => onDuplicate(plan.id)}>{copy.planList.duplicate}</button>
        <button type="button" className="flat-control min-h-10 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40" disabled={!canMoveUp} onClick={() => onMove(plan.id, "up")}>{copy.planList.moveUp}</button>
        <button type="button" className="flat-control min-h-10 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40" disabled={!canMoveDown} onClick={() => onMove(plan.id, "down")}>{copy.planList.moveDown}</button>
        {plan.status === "idea" ? <button type="button" className="flat-control min-h-10 px-3 py-2" onClick={() => onPrepare(plan.id)}>{copy.planList.prepare}</button> : null}
        {plan.status === "preparing" || plan.status === "idea" ? <button type="button" className="min-h-10 rounded-base bg-primary px-3 py-2 text-sm font-black text-slate-950" onClick={() => onMakeCurrent(plan.id)}>{copy.planList.makeCurrent}</button> : null}
        {plan.status !== "completed" ? <button type="button" className="flat-control min-h-10 px-3 py-2" onClick={() => onComplete(plan.id)}>{copy.planList.complete}</button> : null}
        <button type="button" className="min-h-10 rounded-base border border-red-300 bg-surface px-3 py-2 text-sm font-bold text-red-700 dark:border-red-800 dark:text-red-300" onClick={() => onDelete(plan.id)}>{copy.planList.delete}</button>
      </div>
    </article>
  );
}

function PlanGroup({
  id,
  title,
  description,
  plans,
  emptyMessage,
  getDerivedLabel,
  actions
}: {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly plans: readonly StreamPlan[];
  readonly emptyMessage: string;
  readonly getDerivedLabel: (index: number) => string | null;
  readonly actions: Omit<Parameters<typeof StreamPlanCard>[0], "plan" | "derivedLabel" | "canMoveUp" | "canMoveDown">;
}) {
  return (
    <section className="panel p-4 sm:p-5" aria-labelledby={`${id}-title`} data-stream-plan-group={id}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id={`${id}-title`} className="text-lg font-black text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted [word-break:auto-phrase]">{description}</p>
        </div>
        <span className="rounded-base bg-surface-muted px-2.5 py-1 text-sm font-black text-primary-strong">{plans.length}</span>
      </div>
      {plans.length === 0 ? (
        <p className="rounded-base border border-dashed border-border px-4 py-6 text-center text-sm text-muted">{emptyMessage}</p>
      ) : (
        <div className="grid gap-3">
          {plans.map((plan, index) => (
            <StreamPlanCard
              key={plan.id}
              plan={plan}
              derivedLabel={getDerivedLabel(index)}
              canMoveUp={canMovePlan(plans, index, -1)}
              canMoveDown={canMovePlan(plans, index, 1)}
              {...actions}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function StreamPlanList({
  groups,
  onEdit,
  onDuplicate,
  onMove,
  onMakeCurrent,
  onComplete,
  onPrepare,
  onDelete,
  onEditCards,
  onShowLive
}: {
  readonly groups: StreamPlanGroups;
  readonly onEdit: (plan: StreamPlan) => void;
  readonly onDuplicate: (planId: string) => void;
  readonly onMove: (planId: string, direction: "up" | "down") => void;
  readonly onMakeCurrent: (planId: string) => void;
  readonly onComplete: (planId: string) => void;
  readonly onPrepare: (planId: string) => void;
  readonly onDelete: (planId: string) => void;
  readonly onEditCards: (planId: string) => void;
  readonly onShowLive: (planId: string) => void;
}) {
  const copy = useViewerEngagementPromptBoardCopy();
  const actions = { onEdit, onDuplicate, onMove, onMakeCurrent, onComplete, onPrepare, onDelete, onEditCards, onShowLive };
  return (
    <div className="grid gap-4">
      <PlanGroup id="current" {...copy.planList.groups.current} plans={groups.current} emptyMessage={copy.planList.groups.current.empty} getDerivedLabel={() => copy.planList.derived.current} actions={actions} />
      <PlanGroup id="upcoming" {...copy.planList.groups.upcoming} plans={groups.upcoming} emptyMessage={copy.planList.groups.upcoming.empty} getDerivedLabel={(index) => index === 0 ? copy.planList.derived.next : index === 1 ? copy.planList.derived.afterNext : null} actions={actions} />
      <PlanGroup id="ideas" {...copy.planList.groups.ideas} plans={groups.ideas} emptyMessage={copy.planList.groups.ideas.empty} getDerivedLabel={() => null} actions={actions} />
      <PlanGroup id="completed" {...copy.planList.groups.completed} plans={groups.completed} emptyMessage={copy.planList.groups.completed.empty} getDerivedLabel={() => null} actions={actions} />
    </div>
  );
}
