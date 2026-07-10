import type { SelectOption } from "./comment-translator-dock-model";

export function ControlSelect({ label, value, options, onChange }: {
  readonly label: string;
  readonly value: string;
  readonly options: readonly SelectOption[];
  readonly onChange: (value: string) => void;
}) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm">
      <span className="text-xs font-black uppercase tracking-normal text-muted">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-10 w-full min-w-0 rounded-base border border-border bg-surface px-3 py-2 text-sm font-bold text-foreground shadow-sm transition hover:border-primary/60 focus:border-primary"
      >
        {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </label>
  );
}

export function StatTile({ label, value, helper }: {
  readonly label: string;
  readonly value: string;
  readonly helper: string;
}) {
  return (
    <div className="rounded-base border border-border bg-surface p-3">
      <p className="text-xs font-bold text-muted">{label}</p>
      <p className="mt-2 break-words text-2xl font-black tracking-normal text-foreground">{value}</p>
      <p className="mt-1 break-words text-xs font-semibold text-primary-strong">{helper}</p>
    </div>
  );
}
