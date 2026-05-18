import Link from "next/link";
import { StatusBadge } from "@/components/portal/StatusBadge";
import type { Locale } from "@/lib/locale";
import { getCategoryLabel, getToolCopy, portalCopy } from "@/lib/portal-copy";
import type { ToolDefinition } from "@/lib/tools";

type ToolCardProps = {
  tool: ToolDefinition;
  locale: Locale;
};

export function ToolCard({ tool, locale }: ToolCardProps) {
  const isAvailable = tool.status === "available";
  const toolCopy = getToolCopy(tool.id, locale);
  const copy = portalCopy[locale].toolCard;

  return (
    <article
      className={[
        "panel flex min-h-52 flex-col p-5 shadow-none transition",
        isAvailable ? "border-primary/70" : "border-dashed bg-surface-muted/45"
      ].join(" ")}
    >
      <div className="flex gap-4">
        <div
          className={[
            "grid h-16 w-16 shrink-0 place-items-center rounded-base text-sm font-black",
            isAvailable
              ? "bg-primary-soft text-primary-strong"
              : "bg-surface-muted text-muted"
          ].join(" ")}
        >
          {tool.icon}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-foreground">{toolCopy.name}</h2>
            <StatusBadge status={tool.status} locale={locale} />
          </div>
          <p className="mt-2 text-xs font-semibold text-muted">{getCategoryLabel(tool.category, locale)}</p>
        </div>
      </div>

      <p className="mt-5 flex-1 text-sm leading-6 text-muted">{toolCopy.description}</p>
      {toolCopy.notice ? (
        <p className="mt-3 border-t border-border/70 pt-3 text-[11px] font-semibold leading-5 text-muted">
          {toolCopy.notice}
        </p>
      ) : null}

      {isAvailable ? (
        <Link
          href={tool.href}
          className="mt-5 inline-flex items-center justify-center gap-3 rounded-base bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-strong"
        >
          {copy.open}
          <span aria-hidden="true">→</span>
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className="mt-5 rounded-base border border-border bg-surface px-4 py-2.5 text-sm font-bold text-muted"
        >
          {copy.planned}
        </button>
      )}
    </article>
  );
}
