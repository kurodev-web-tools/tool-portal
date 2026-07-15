import type { StreamPlan } from "@/lib/viewer-engagement-prompt-board-storage";
import { isSameManualOrderBucket, type StreamPlanGroups } from "@/lib/viewer-engagement-prompt-board-stream-plans";

const dateFormatter = new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short" });

function formatScheduledAt(value: string | null): string {
  return value === null ? "日付未定" : dateFormatter.format(new Date(value));
}

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
  onDelete
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
}) {
  const statusLabel = plan.status === "live" ? "配信中" : plan.status === "preparing" ? "準備中" : plan.status === "idea" ? "アイデア" : "完了";
  return (
    <article className="rounded-base border border-border bg-surface p-4" data-stream-plan-id={plan.id}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {derivedLabel === null ? null : <span className="rounded-base bg-primary-soft px-2 py-1 text-xs font-black text-primary-strong">{derivedLabel}</span>}
            <span className="rounded-base border border-border bg-surface-muted px-2 py-1 text-xs font-bold text-muted">{statusLabel}</span>
          </div>
          <h3 className="mt-2 break-words text-base font-black text-foreground">{plan.title}</h3>
        </div>
        <button type="button" className="flat-control min-h-10 px-3 py-2" onClick={() => onEdit(plan)} aria-label={`${plan.title}を編集`}>
          編集
        </button>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div><dt className="text-xs font-bold text-muted">予定日時</dt><dd className="mt-1 font-semibold text-foreground">{formatScheduledAt(plan.scheduledAt)}</dd></div>
        <div><dt className="text-xs font-bold text-muted">手動表示順</dt><dd className="mt-1 font-semibold text-foreground">{plan.manualOrder}</dd></div>
        <div><dt className="text-xs font-bold text-muted">カンペ</dt><dd className="mt-1 font-semibold text-foreground">{plan.promptCards.length}枚</dd></div>
      </dl>
      {plan.notes.trim().length === 0 ? null : <p className="mt-3 whitespace-pre-wrap break-words rounded-base bg-surface-muted px-3 py-2 text-sm leading-6 text-muted">{plan.notes}</p>}

      <div className="mt-4 flex flex-wrap gap-2" aria-label={`${plan.title}の操作`}>
        <button type="button" className="flat-control min-h-10 px-3 py-2" onClick={() => onDuplicate(plan.id)}>複製</button>
        <button type="button" className="flat-control min-h-10 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40" disabled={!canMoveUp} onClick={() => onMove(plan.id, "up")}>上へ</button>
        <button type="button" className="flat-control min-h-10 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40" disabled={!canMoveDown} onClick={() => onMove(plan.id, "down")}>下へ</button>
        {plan.status === "idea" ? <button type="button" className="flat-control min-h-10 px-3 py-2" onClick={() => onPrepare(plan.id)}>準備中へ</button> : null}
        {plan.status === "preparing" || plan.status === "idea" ? <button type="button" className="min-h-10 rounded-base bg-primary px-3 py-2 text-sm font-black text-slate-950" onClick={() => onMakeCurrent(plan.id)}>現在の配信にする</button> : null}
        {plan.status !== "completed" ? <button type="button" className="flat-control min-h-10 px-3 py-2" onClick={() => onComplete(plan.id)}>完了</button> : null}
        <button type="button" className="min-h-10 rounded-base border border-red-300 bg-surface px-3 py-2 text-sm font-bold text-red-700 dark:border-red-800 dark:text-red-300" onClick={() => onDelete(plan.id)}>削除</button>
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
  onDelete
}: {
  readonly groups: StreamPlanGroups;
  readonly onEdit: (plan: StreamPlan) => void;
  readonly onDuplicate: (planId: string) => void;
  readonly onMove: (planId: string, direction: "up" | "down") => void;
  readonly onMakeCurrent: (planId: string) => void;
  readonly onComplete: (planId: string) => void;
  readonly onPrepare: (planId: string) => void;
  readonly onDelete: (planId: string) => void;
}) {
  const actions = { onEdit, onDuplicate, onMove, onMakeCurrent, onComplete, onPrepare, onDelete };
  return (
    <div className="grid gap-4">
      <PlanGroup id="current" title="現在の配信" description="同時に1件だけ。切り替えると以前の配信は準備中へ戻ります。" plans={groups.current} emptyMessage="現在の配信はありません。" getDerivedLabel={() => "現在"} actions={actions} />
      <PlanGroup id="upcoming" title="今後の配信" description="予定日時の近い順。同じ日時と日付未定は手動表示順で並びます。" plans={groups.upcoming} emptyMessage="準備中の配信プランはありません。" getDerivedLabel={(index) => index === 0 ? "次回" : index === 1 ? "次々回" : null} actions={actions} />
      <PlanGroup id="ideas" title="日付未定のアイデア" description="日時が決まる前の企画を置いておけます。" plans={groups.ideas} emptyMessage="日付未定のアイデアはありません。" getDerivedLabel={() => null} actions={actions} />
      <PlanGroup id="completed" title="完了済み" description="終わった配信プラン。複製して次の構成に再利用できます。" plans={groups.completed} emptyMessage="完了済みの配信プランはありません。" getDerivedLabel={() => null} actions={actions} />
    </div>
  );
}
