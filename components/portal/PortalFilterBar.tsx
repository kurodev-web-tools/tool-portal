import type { Locale } from "@/lib/locale";
import { getCategoryLabel, getStatusLabel, getSuiteCopy, portalCopy } from "@/lib/portal-copy";
import { activeCategories } from "@/lib/tools";
import { suites, type SuiteKey } from "@/lib/suites";

type PortalFilterBarProps = {
  suite: SuiteKey | "all";
  category: string;
  status: string;
  locale: Locale;
  onSuiteChange: (suite: SuiteKey | "all") => void;
  onCategoryChange: (category: string) => void;
  onStatusChange: (status: string) => void;
};

export function PortalFilterBar({
  suite,
  category,
  status,
  locale,
  onSuiteChange,
  onCategoryChange,
  onStatusChange
}: PortalFilterBarProps) {
  const copy = portalCopy[locale].filters;
  const suiteFilters: Array<{ value: SuiteKey | "all"; label: string }> = [
    { value: "all", label: copy.all },
    ...suites.map((item) => ({ value: item.key, label: getSuiteCopy(item.key, locale).name }))
  ];
  const categoryFilters = [
    { value: "all", label: copy.all },
    ...activeCategories.map((value) => ({ value, label: getCategoryLabel(value, locale) }))
  ];
  const statusFilters = [
    { value: "all", label: copy.all },
    { value: "available", label: getStatusLabel("available", locale) },
    { value: "planned", label: getStatusLabel("planned", locale) }
  ];
  const chipWrapClass = "scrollbar-accent flex gap-3 overflow-x-auto pb-3 lg:flex-wrap lg:overflow-visible lg:pb-0";

  return (
    <section className="panel space-y-5 p-5">
      <div className="grid gap-3 lg:grid-cols-[10rem_1fr] lg:items-start">
        <p className="pt-2 text-sm font-bold text-foreground">{copy.suite}</p>
        <div className={chipWrapClass}>
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
      <div className="grid gap-3 border-t border-border pt-5 lg:grid-cols-[10rem_1fr] lg:items-start">
        <p className="pt-2 text-sm font-bold text-foreground">{copy.category}</p>
        <div className={chipWrapClass}>
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
      <div className="grid gap-3 border-t border-border pt-5 lg:grid-cols-[10rem_1fr] lg:items-start">
        <p className="pt-2 text-sm font-bold text-foreground">{copy.status}</p>
        <div className={chipWrapClass}>
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
