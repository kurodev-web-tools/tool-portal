import { activeCategories, categoryLabels } from "@/lib/tools";
import { suites, type SuiteKey } from "@/lib/suites";

type PortalFilterBarProps = {
  suite: SuiteKey | "all";
  category: string;
  status: string;
  onSuiteChange: (suite: SuiteKey | "all") => void;
  onCategoryChange: (category: string) => void;
  onStatusChange: (status: string) => void;
};

const statusFilters = [
  { value: "all", label: "すべて" },
  { value: "available", label: "利用可能" },
  { value: "planned", label: "準備中" }
];

export function PortalFilterBar({
  suite,
  category,
  status,
  onSuiteChange,
  onCategoryChange,
  onStatusChange
}: PortalFilterBarProps) {
  const suiteFilters: Array<{ value: SuiteKey | "all"; label: string }> = [
    { value: "all", label: "すべて" },
    ...suites.map((item) => ({ value: item.key, label: item.name }))
  ];
  const categoryFilters = [
    { value: "all", label: "すべて" },
    ...activeCategories.map((value) => ({ value, label: categoryLabels[value] }))
  ];

  return (
    <section className="panel grid gap-5 p-5 xl:grid-cols-[1.15fr_1fr_auto]">
      <div>
        <p className="mb-3 text-sm font-bold text-foreground">スイートで絞り込む</p>
        <div className="scrollbar-accent flex gap-3 overflow-x-auto pb-3">
          {suiteFilters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onSuiteChange(item.value)}
              className={[
                "shrink-0 rounded-base px-4 py-2 text-sm font-semibold transition",
                suite === item.value
                  ? "bg-primary text-white"
                  : "border border-border bg-surface text-muted hover:border-primary/50 hover:text-foreground"
              ].join(" ")}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-3 text-sm font-bold text-foreground">カテゴリで絞り込む</p>
        <div className="scrollbar-accent flex gap-3 overflow-x-auto pb-3">
          {categoryFilters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onCategoryChange(item.value)}
              className={[
                "shrink-0 rounded-base px-4 py-2 text-sm font-semibold transition",
                category === item.value
                  ? "bg-primary text-white"
                  : "border border-border bg-surface text-muted hover:border-primary/50 hover:text-foreground"
              ].join(" ")}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-3 text-sm font-bold text-foreground">実装状態で絞り込む</p>
        <div className="scrollbar-accent flex gap-3 overflow-x-auto pb-3">
          {statusFilters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onStatusChange(item.value)}
              className={[
                "shrink-0 rounded-base px-4 py-2 text-sm font-semibold transition",
                status === item.value
                  ? "bg-primary text-white"
                  : "border border-border bg-surface text-muted hover:border-primary/50 hover:text-foreground"
              ].join(" ")}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
