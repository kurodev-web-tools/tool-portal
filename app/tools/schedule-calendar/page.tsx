import Link from "next/link";
import { PortalShell } from "@/components/portal/PortalShell";

export default function ScheduleCalendarPage() {
  return (
    <PortalShell>
      <section className="panel p-6 sm:p-8">
        <div className="mb-6 inline-flex rounded-base bg-primary-soft px-3 py-1 text-sm font-semibold text-primary-strong">
          利用可能
        </div>
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Schedule Calendar
          </h1>
          <p className="mt-4 text-base leading-7 text-muted">
            配信スケジュールを作成・管理するためのカレンダーツール入口です。
            Phase 1 ではポータル導線のみを確定し、カレンダー本体、localStorage
            保存、投稿補助UIは次フェーズで実装します。
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {["週表示カレンダー", "予定管理", "投稿補助"].map((item) => (
            <div key={item} className="rounded-base border border-border bg-surface-muted p-4">
              <p className="text-sm font-semibold text-foreground">{item}</p>
              <p className="mt-2 text-sm text-muted">Phase 2 で実装予定</p>
            </div>
          ))}
        </div>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-base border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary/60 hover:bg-primary-soft/40"
        >
          ポータルへ戻る
        </Link>
      </section>
    </PortalShell>
  );
}
