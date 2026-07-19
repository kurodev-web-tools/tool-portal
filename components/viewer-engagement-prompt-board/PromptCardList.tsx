import type {
  PromptCard,
  StreamPlan
} from "@/lib/viewer-engagement-prompt-board-storage";
import { useViewerEngagementPromptBoardCopy } from "@/lib/viewer-engagement-prompt-board-copy";

function PromptCardRow({
  card,
  plans,
  currentPlanId,
  canMoveUp,
  canMoveDown,
  onEdit,
  onReorder,
  onMove,
  onDelete
}: {
  readonly card: PromptCard;
  readonly plans: readonly StreamPlan[];
  readonly currentPlanId: string;
  readonly canMoveUp: boolean;
  readonly canMoveDown: boolean;
  readonly onEdit: (card: PromptCard) => void;
  readonly onReorder: (cardId: string, direction: "up" | "down") => void;
  readonly onMove: (cardId: string, destinationPlanId: string) => void;
  readonly onDelete: (card: PromptCard) => void;
}) {
  const copy = useViewerEngagementPromptBoardCopy();
  const destinations = plans.filter((plan) => plan.id !== currentPlanId);
  return (
    <article className="min-w-0 rounded-base border border-border bg-surface p-4" data-prompt-card-id={card.id}>
      <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs font-bold">
        <span className="rounded-base bg-primary-soft px-2 py-1 text-primary-strong">#{card.order + 1}</span>
        <span className="rounded-base border border-border bg-surface-muted px-2 py-1 text-foreground">{copy.category[card.category]}</span>
        <span className="text-muted">{copy.segment[card.segment]}</span>
        <span className="text-muted">{copy.tone[card.tone]}</span>
      </div>
      <p className="mt-3 whitespace-pre-wrap break-words text-base font-bold leading-7 text-foreground [word-break:auto-phrase]">{card.body}</p>
      {card.safetyNotes.length === 0 ? null : (
        <p className="mt-3 whitespace-pre-wrap break-words rounded-base border border-amber-300/70 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
          <span className="font-black">{copy.cardList.safety}</span> {card.safetyNotes}
        </p>
      )}
      <div className="mt-4 flex min-w-0 flex-wrap gap-2" aria-label={copy.cardList.actionsLabel(card.body)}>
        <button type="button" className="flat-control min-h-10 px-3 py-2" onClick={() => onEdit(card)}>{copy.cardList.edit}</button>
        <button type="button" className="flat-control min-h-10 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40" disabled={!canMoveUp} onClick={() => onReorder(card.id, "up")}>{copy.cardList.moveUp}</button>
        <button type="button" className="flat-control min-h-10 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40" disabled={!canMoveDown} onClick={() => onReorder(card.id, "down")}>{copy.cardList.moveDown}</button>
        <label className="flex min-w-48 flex-1 items-center gap-2 text-sm font-bold text-muted sm:max-w-sm">
          {copy.cardList.moveDestination}
          <select
            className="flat-input min-h-10 min-w-0 flex-1 px-2 py-1.5"
            defaultValue=""
            disabled={destinations.length === 0}
            aria-label={copy.cardList.moveDestinationLabel(card.body)}
            onChange={(event) => {
              if (event.target.value.length > 0) {
                onMove(card.id, event.target.value);
                event.target.value = "";
              }
            }}
          >
            <option value="">{copy.cardList.moveToAnotherPlan}</option>
            {destinations.map((plan) => <option key={plan.id} value={plan.id}>{plan.title}</option>)}
          </select>
        </label>
        <button type="button" className="min-h-10 rounded-base border border-red-300 bg-surface px-3 py-2 text-sm font-bold text-red-700 dark:border-red-800 dark:text-red-300" onClick={() => onDelete(card)}>{copy.cardList.delete}</button>
      </div>
    </article>
  );
}

export function PromptCardList({
  cards,
  plans,
  currentPlanId,
  onEdit,
  onReorder,
  onMove,
  onDelete
}: {
  readonly cards: readonly PromptCard[];
  readonly plans: readonly StreamPlan[];
  readonly currentPlanId: string;
  readonly onEdit: (card: PromptCard) => void;
  readonly onReorder: (cardId: string, direction: "up" | "down") => void;
  readonly onMove: (cardId: string, destinationPlanId: string) => void;
  readonly onDelete: (card: PromptCard) => void;
}) {
  const copy = useViewerEngagementPromptBoardCopy();
  if (cards.length === 0) {
    return <p className="rounded-base border border-dashed border-border px-4 py-10 text-center text-sm text-muted">{copy.cardList.empty}</p>;
  }
  return (
    <div className="grid min-w-0 gap-3" aria-label={copy.cardList.listLabel}>
      {cards.map((card, index) => (
        <PromptCardRow
          key={card.id}
          card={card}
          plans={plans}
          currentPlanId={currentPlanId}
          canMoveUp={index > 0}
          canMoveDown={index < cards.length - 1}
          onEdit={onEdit}
          onReorder={onReorder}
          onMove={onMove}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
