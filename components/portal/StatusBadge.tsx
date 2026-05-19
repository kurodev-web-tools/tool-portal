import type { Locale } from "@/lib/locale";
import { getStatusLabel } from "@/lib/portal-copy";
import type { ToolStatus } from "@/lib/tools";

type StatusBadgeProps = {
  status: ToolStatus;
  locale: Locale;
};

export function StatusBadge({ status, locale }: StatusBadgeProps) {
  const isAvailable = status === "available";

  return (
    <span
      className={[
        "inline-flex items-center rounded-base px-2.5 py-1 text-xs font-semibold",
        isAvailable
          ? "bg-primary-soft text-primary-strong"
          : "bg-surface-muted text-muted"
      ].join(" ")}
    >
      {getStatusLabel(status, locale)}
    </span>
  );
}
