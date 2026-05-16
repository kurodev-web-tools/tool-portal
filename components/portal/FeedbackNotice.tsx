export function FeedbackNotice() {
  return (
    <section className="panel flex flex-col gap-4 p-5 shadow-none sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-bold text-foreground">不具合報告 / 要望</p>
        <p className="mt-2 text-sm leading-6 text-muted">
          表示崩れ、操作不具合、欲しい改善点はメールで受け付けています。X / Discord も受付窓口として準備予定です。
        </p>
      </div>
      <a
        href="mailto:?subject=V%20Streamer%20Tools%20feedback"
        className="inline-flex shrink-0 items-center justify-center rounded-base border border-primary/50 px-4 py-2.5 text-sm font-bold text-primary-strong transition hover:bg-primary-soft/50"
      >
        メールで送る
      </a>
    </section>
  );
}
