"use client";

import Link from "next/link";
import { useLocale } from "@/components/portal/LocaleProvider";
import {
  implementedToolCount,
  suiteCount
} from "@/lib/suites";
import { portalCopy } from "@/lib/portal-copy";

export function PortalHeroSummary() {
  const { locale } = useLocale();
  const copy = portalCopy[locale].home.hero;
  const summaryItems = [
    {
      label: copy.summary.availableTools.label,
      value: `${implementedToolCount} ${copy.summary.availableTools.unit}`,
      mark: "1",
      helper: copy.summary.availableTools.helper
    },
    { label: copy.summary.publicFlow.label, value: copy.summary.publicFlow.value, mark: "2", helper: copy.summary.publicFlow.helper },
    {
      label: copy.summary.suites.label,
      value: `${suiteCount} ${copy.summary.suites.unit}`,
      mark: "3",
      helper: copy.summary.suites.helper
    }
  ];

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_30rem] lg:items-center">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary-strong sm:text-4xl">
          {copy.title}
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-foreground">
          {copy.paragraphs.map((paragraph) => (
            <span key={paragraph} className="block">
              {paragraph}
            </span>
          ))}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/tools"
            className="inline-flex items-center justify-center rounded-base bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-strong"
          >
            {copy.primaryCta}
          </Link>
          <Link
            href="/tools/schedule-calendar"
            className="inline-flex items-center justify-center rounded-base border border-primary/50 px-4 py-2 text-sm font-bold text-primary-strong transition hover:bg-primary-soft/50"
          >
            {copy.secondaryCta}
          </Link>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
          {copy.accountNote}
          <Link href="/login" className="ml-2 font-bold text-primary-strong underline-offset-4 hover:underline">
            {copy.accountCta}
          </Link>
        </p>
      </div>
      <div className="rounded-base border border-border bg-primary-soft/55 p-4 sm:p-6 lg:p-7">
        <div>
          <p className="text-sm font-bold text-primary-strong">{copy.panelTitle}</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            {copy.panelLead}
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
