import Link from "next/link";
import { StatusBadge } from "@/components/portal/StatusBadge";
import type { SuiteDefinition } from "@/lib/suites";

type SuiteCardProps = {
  suite: SuiteDefinition;
};

export function SuiteCard({ suite }: SuiteCardProps) {
  const isAvailable = suite.status === "available";

  return (
    <article className="panel relative grid gap-5 p-5 shadow-none transition hover:border-primary/45 sm:grid-cols-[7rem_1fr]">
      <div className="absolute right-5 top-5">
        <StatusBadge status={suite.status} />
      </div>
      <div
        className={[
          "grid h-28 w-28 place-items-center rounded-base text-4xl font-black max-sm:h-24 max-sm:w-24",
          isAvailable
            ? "bg-primary-soft text-primary-strong"
            : "bg-surface-muted text-muted"
        ].join(" ")}
      >
        {suite.icon}
      </div>

      <div className="flex min-w-0 flex-col">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold tracking-tight text-primary-strong">
              {suite.name}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-foreground">{suite.description}</p>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs font-bold text-muted">代表的な候補</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {suite.tags.map((tag) => (
              <span key={tag} className="rounded-base bg-surface-muted px-3 py-1 text-xs font-semibold text-muted">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="font-semibold text-foreground">ツール数</span>
            <span className="font-bold text-foreground">{suite.toolCount} 個</span>
          </div>
          <Link
            href={`/tools?suite=${suite.key}`}
            className={[
              "inline-flex w-full items-center justify-center gap-2 rounded-base px-3 py-2.5 text-sm font-bold transition sm:w-fit sm:min-w-28",
              isAvailable
                ? "bg-primary text-white hover:bg-primary-strong"
                : "border border-primary/60 text-primary-strong hover:bg-primary-soft/50"
            ].join(" ")}
          >
            {isAvailable ? "開く" : "準備中を見る"}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
