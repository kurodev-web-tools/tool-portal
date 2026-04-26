import { activeCategories, availableTools, plannedTools } from "@/lib/tools";

const summaryItems = [
  { label: "実装済みツール", value: availableTools.length, mark: "✓" },
  { label: "準備中のツール", value: plannedTools.length, mark: "○" },
  { label: "カテゴリ", value: activeCategories.length, mark: "□" }
];

export function PortalHeroSummary() {
  return (
    <section className="panel grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          V Streamer Tools へようこそ
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-muted sm:text-base">
          配信活動をもっとスムーズに、もっと楽しく。クリエイターのための便利なツールをひとつの場所に集めました。
        </p>
      </div>
      <div className="grid gap-3 rounded-base border border-border bg-surface px-5 py-4 sm:grid-cols-3 sm:gap-0">
        {summaryItems.map((item, index) => (
          <div
            key={item.label}
            className={[
              "flex min-w-36 items-center gap-3 px-2 py-2",
              index > 0 ? "sm:border-l sm:border-border sm:pl-5" : ""
            ].join(" ")}
          >
            <span className="grid h-9 w-9 place-items-center rounded-full border border-primary/50 text-sm font-bold text-primary-strong">
              {item.mark}
            </span>
            <div>
              <p className="text-xs font-semibold text-muted">{item.label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
