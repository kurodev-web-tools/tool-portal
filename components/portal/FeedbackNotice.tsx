const feedbackLinks = {
  email: "mailto:feedback@kuro-lab.com?subject=V%20Streamer%20Tools%20feedback",
  x: "https://x.com/kurodev_v",
  discord: "https://discord.gg/35rjbPfxz5"
};

function DiscordMark() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path
        d="M7.7 8.4c1.1-.5 2.6-.8 4.3-.8s3.2.3 4.3.8c1.3 1.7 1.8 3.6 1.7 5.9-1.2 1-2.5 1.6-4 1.9l-.5-.9c.7-.2 1.3-.5 1.9-.9-.5.2-1.5.6-3.4.6s-2.9-.4-3.4-.6c.6.4 1.2.7 1.9.9l-.5.9c-1.5-.3-2.8-.9-4-1.9-.1-2.3.4-4.2 1.7-5.9Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <path d="M9.8 12.3h.1M14.1 12.3h.1" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
    </svg>
  );
}

export function FeedbackNotice() {
  return (
    <section className="panel flex flex-col gap-4 p-5 shadow-none sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-bold text-foreground">不具合報告 / 要望</p>
        <p className="mt-2 text-sm leading-6 text-muted">
          表示崩れ、操作不具合、欲しい改善点はメール、X、Discord で受け付けています。
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <a
          href={feedbackLinks.email}
          className="inline-flex min-h-10 items-center justify-center rounded-base border border-primary/50 px-4 py-2.5 text-sm font-bold text-primary-strong transition hover:bg-primary-soft/50"
        >
          メールで送る
        </a>
        <a
          href={feedbackLinks.x}
          target="_blank"
          rel="noreferrer"
          aria-label="Xでkurodevを開く"
          title="X"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-sm font-black text-foreground transition hover:border-primary/60 hover:bg-primary-soft/40"
        >
          X
        </a>
        <a
          href={feedbackLinks.discord}
          target="_blank"
          rel="noreferrer"
          aria-label="Discordのツールポータル受付を開く"
          title="Discord"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-foreground transition hover:border-primary/60 hover:bg-primary-soft/40"
        >
          <DiscordMark />
        </a>
      </div>
    </section>
  );
}
