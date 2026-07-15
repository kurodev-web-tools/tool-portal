import type {
  PromptCard,
  PromptCardCategory,
  PromptCardSegment,
  PromptCardTone,
  StreamPlan
} from "@/lib/viewer-engagement-prompt-board-storage";

const categoryLabels: Readonly<Record<PromptCardCategory, string>> = {
  "talking-point": "トークポイント",
  question: "質問",
  announcement: "お知らせ",
  reminder: "注意・確認",
  other: "その他"
};
const segmentLabels: Readonly<Record<PromptCardSegment, string>> = {
  opening: "オープニング",
  main: "本編",
  intermission: "中休み",
  closing: "クロージング",
  anytime: "いつでも"
};
const toneLabels: Readonly<Record<PromptCardTone, string>> = {
  neutral: "ニュートラル",
  casual: "カジュアル",
  energetic: "元気",
  calm: "落ち着き",
  serious: "真剣"
};

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
  const destinations = plans.filter((plan) => plan.id !== currentPlanId);
  return (
    <article className="min-w-0 rounded-base border border-border bg-surface p-4" data-prompt-card-id={card.id}>
      <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs font-bold">
        <span className="rounded-base bg-primary-soft px-2 py-1 text-primary-strong">#{card.order + 1}</span>
        <span className="rounded-base border border-border bg-surface-muted px-2 py-1 text-foreground">{categoryLabels[card.category]}</span>
        <span className="text-muted">{segmentLabels[card.segment]}</span>
        <span className="text-muted">{toneLabels[card.tone]}</span>
      </div>
      <p className="mt-3 whitespace-pre-wrap break-words text-base font-bold leading-7 text-foreground [word-break:auto-phrase]">{card.body}</p>
      {card.safetyNotes.length === 0 ? null : (
        <p className="mt-3 whitespace-pre-wrap break-words rounded-base border border-amber-300/70 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
          <span className="font-black">注意:</span> {card.safetyNotes}
        </p>
      )}
      <div className="mt-4 flex min-w-0 flex-wrap gap-2" aria-label={`${card.body}の操作`}>
        <button type="button" className="flat-control min-h-10 px-3 py-2" onClick={() => onEdit(card)}>編集</button>
        <button type="button" className="flat-control min-h-10 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40" disabled={!canMoveUp} onClick={() => onReorder(card.id, "up")}>上へ</button>
        <button type="button" className="flat-control min-h-10 px-3 py-2 disabled:cursor-not-allowed disabled:opacity-40" disabled={!canMoveDown} onClick={() => onReorder(card.id, "down")}>下へ</button>
        <label className="flex min-w-48 flex-1 items-center gap-2 text-sm font-bold text-muted sm:max-w-sm">
          移動先
          <select
            className="flat-input min-h-10 min-w-0 flex-1 px-2 py-1.5"
            defaultValue=""
            disabled={destinations.length === 0}
            aria-label={`${card.body}の移動先`}
            onChange={(event) => {
              if (event.target.value.length > 0) {
                onMove(card.id, event.target.value);
                event.target.value = "";
              }
            }}
          >
            <option value="">別の配信プランへ</option>
            {destinations.map((plan) => <option key={plan.id} value={plan.id}>{plan.title}</option>)}
          </select>
        </label>
        <button type="button" className="min-h-10 rounded-base border border-red-300 bg-surface px-3 py-2 text-sm font-bold text-red-700 dark:border-red-800 dark:text-red-300" onClick={() => onDelete(card)}>削除</button>
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
  if (cards.length === 0) {
    return <p className="rounded-base border border-dashed border-border px-4 py-10 text-center text-sm text-muted">この配信プランにはカンペがありません。「カンペを追加」から準備できます。</p>;
  }
  return (
    <div className="grid min-w-0 gap-3" aria-label="カンペカード一覧">
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
