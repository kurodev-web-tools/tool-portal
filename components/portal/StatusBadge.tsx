import { statusLabels, type ToolStatus } from "@/lib/tools";

type StatusBadgeProps = {
  status: ToolStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
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
      {statusLabels[status]}
    </span>
  );
}
