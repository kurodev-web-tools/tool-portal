export type PromptBoardNoticeValue = Readonly<{
  kind: "success" | "error";
  message: string;
}>;

export function PromptBoardNotice({ notice }: { readonly notice: PromptBoardNoticeValue | null }) {
  if (notice === null) {
    return null;
  }

  return (
    <div
      role={notice.kind === "error" ? "alert" : "status"}
      className={[
        "mb-5 rounded-base border px-4 py-3 text-sm font-bold",
        notice.kind === "error"
          ? "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
          : "border-primary/30 bg-primary-soft/70 text-primary-strong"
      ].join(" ")}
    >
      {notice.message}
    </div>
  );
}
