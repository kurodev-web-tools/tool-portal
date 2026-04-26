import Link from "next/link";
import {
  implementedToolCount,
  plannedToolCount,
  suiteCount
} from "@/lib/suites";

const summaryItems = [
  { label: "利用できるツール", value: `${implementedToolCount} 個`, mark: "□", helper: "実装済み" },
  { label: "開発中のツール", value: `${plannedToolCount} 個`, mark: "◇", helper: "準備中" },
  { label: "スイート数", value: `${suiteCount}`, mark: "☆", helper: "カテゴリ" }
];

export function PortalHeroSummary() {
  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_30rem] lg:items-center">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary-strong sm:text-4xl">
          ようこそ、V Streamer Tools へ！
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-foreground">
          <span className="block">
            配信活動を支えるツールを、スイートごとにまとめてご用意しました。
          </span>
          <span className="block">
            まずは、自分の活動に合ったスイートから始めてみましょう。
          </span>
        </p>
        <Link
          href="/tools"
          className="mt-6 inline-flex rounded-base border border-primary/50 px-4 py-2 text-sm font-bold text-primary-strong transition hover:bg-primary-soft/50"
        >
          個別ツール一覧を見る
        </Link>
      </div>
      <div className="hidden min-h-52 rounded-base border border-border bg-primary-soft/55 p-7 lg:block">
        <div className="mx-auto grid h-28 w-28 place-items-center rounded-base border border-primary/30 bg-surface text-6xl font-black text-primary-strong shadow-panel">
          V
        </div>
        <div className="mt-6 grid grid-cols-3 gap-4">
          {summaryItems.map((item) => (
            <div key={item.label} className="min-h-32 rounded-base border border-border bg-surface/80 p-4">
              <span className="text-lg font-bold text-primary-strong">{item.mark}</span>
              <p className="mt-2 text-xs font-semibold text-muted">{item.label}</p>
              <p className="mt-1 text-lg font-bold text-foreground">{item.value}</p>
              <p className="text-xs text-primary-strong">{item.helper}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
