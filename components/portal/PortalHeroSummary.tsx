import Link from "next/link";
import {
  implementedToolCount,
  suiteCount
} from "@/lib/suites";

const summaryItems = [
  { label: "使えるツール", value: `${implementedToolCount} 個`, mark: "1", helper: "予定・サムネ・分割画像" },
  { label: "公開導線", value: "3 ステップ", mark: "2", helper: "Schedule -> Thumbnail -> SNS" },
  { label: "探し方", value: `${suiteCount} スイート`, mark: "3", helper: "公開中と準備中を分けて確認" }
];

export function PortalHeroSummary() {
  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_30rem] lg:items-center">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary-strong sm:text-4xl">
          配信準備を、いま使えるツールから。
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-foreground">
          <span className="block">
            Schedule Calendar、Thumbnail Editor、SNS分割画像メーカーで、予定整理から投稿用画像づくりまで進められます。
          </span>
          <span className="block">
            準備中の候補は一覧で分けて表示し、まず使える導線を迷わず開けるようにしています。
          </span>
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/tools"
            className="inline-flex items-center justify-center rounded-base bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-strong"
          >
            ツール一覧を見る
          </Link>
          <Link
            href="/tools/schedule-calendar"
            className="inline-flex items-center justify-center rounded-base border border-primary/50 px-4 py-2 text-sm font-bold text-primary-strong transition hover:bg-primary-soft/50"
          >
            Schedule Calendar を開く
          </Link>
        </div>
      </div>
      <div className="rounded-base border border-border bg-primary-soft/55 p-4 sm:p-6 lg:p-7">
        <div>
          <p className="text-sm font-bold text-primary-strong">公開中の使い方</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            入口では今すぐ使える3ツールを優先し、追加予定の候補は状態を分けて表示します。
          </p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:mt-6 lg:gap-4">
          {summaryItems.map((item) => (
            <div key={item.label} className="grid min-h-20 grid-cols-[2rem_1fr_auto] items-center gap-x-3 rounded-base border border-border bg-surface/80 p-3 sm:block sm:min-h-32 sm:p-4">
              <span className="grid h-7 w-7 place-items-center rounded-base bg-primary text-sm font-bold text-white">{item.mark}</span>
              <p className="text-xs font-semibold text-muted sm:mt-2">{item.label}</p>
              <p className="text-lg font-bold text-foreground sm:mt-1">{item.value}</p>
              <p className="col-start-2 text-xs text-primary-strong sm:col-start-auto">{item.helper}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
