import type { StreamPlan } from "@/lib/viewer-engagement-prompt-board-storage";
import { groupStreamPlans } from "@/lib/viewer-engagement-prompt-board-stream-plans";
import { useViewerEngagementPromptBoardCopy } from "@/lib/viewer-engagement-prompt-board-copy";

export function PromptCardPlanSelector({
  plans,
  selectedPlanId,
  onSelect
}: {
  readonly plans: readonly StreamPlan[];
  readonly selectedPlanId: string | null;
  readonly onSelect: (planId: string) => void;
}) {
  const copy = useViewerEngagementPromptBoardCopy();
  const groups = groupStreamPlans(plans);
  const orderedPlans = [...groups.current, ...groups.upcoming, ...groups.ideas, ...groups.completed];

  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-bold text-foreground">
      {copy.planSelector.label}
      <select
        className="flat-input min-h-11 w-full min-w-0 px-3 py-2"
        value={selectedPlanId ?? ""}
        disabled={orderedPlans.length === 0}
        onChange={(event) => onSelect(event.target.value)}
      >
        {orderedPlans.length === 0 ? <option value="">{copy.planSelector.empty}</option> : null}
        {orderedPlans.map((plan) => (
          <option key={plan.id} value={plan.id}>
            {copy.status[plan.status]}: {plan.title}
          </option>
        ))}
      </select>
    </label>
  );
}
