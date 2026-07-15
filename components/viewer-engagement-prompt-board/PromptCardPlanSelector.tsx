import type { StreamPlan } from "@/lib/viewer-engagement-prompt-board-storage";
import { groupStreamPlans } from "@/lib/viewer-engagement-prompt-board-stream-plans";

const statusLabels = {
  live: "配信中",
  preparing: "準備中",
  idea: "アイデア",
  completed: "完了"
} as const;

export function PromptCardPlanSelector({
  plans,
  selectedPlanId,
  onSelect
}: {
  readonly plans: readonly StreamPlan[];
  readonly selectedPlanId: string | null;
  readonly onSelect: (planId: string) => void;
}) {
  const groups = groupStreamPlans(plans);
  const orderedPlans = [...groups.current, ...groups.upcoming, ...groups.ideas, ...groups.completed];

  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-bold text-foreground">
      編集する配信プラン
      <select
        className="flat-input min-h-11 w-full min-w-0 px-3 py-2"
        value={selectedPlanId ?? ""}
        disabled={orderedPlans.length === 0}
        onChange={(event) => onSelect(event.target.value)}
      >
        {orderedPlans.length === 0 ? <option value="">配信プランがありません</option> : null}
        {orderedPlans.map((plan) => (
          <option key={plan.id} value={plan.id}>
            {statusLabels[plan.status]}: {plan.title}
          </option>
        ))}
      </select>
    </label>
  );
}
