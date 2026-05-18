"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FeedbackNotice } from "@/components/portal/FeedbackNotice";
import { useLocale } from "@/components/portal/LocaleProvider";
import { PortalFilterBar } from "@/components/portal/PortalFilterBar";
import { ToolCard } from "@/components/portal/ToolCard";
import { getSuiteCopy, portalCopy } from "@/lib/portal-copy";
import { tools } from "@/lib/tools";
import { suites, type SuiteKey } from "@/lib/suites";

function isSuiteKey(value: string | null): value is SuiteKey {
  return Boolean(value && suites.some((suite) => suite.key === value));
}

function getDefaultStatusFilter(suite: SuiteKey | "all") {
  if (suite === "all") {
    return "available";
  }

  return tools.some((tool) => tool.suite === suite && tool.status === "available")
    ? "available"
    : "all";
}

export function PortalToolsIndex() {
  const { locale } = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const suiteParam = searchParams.get("suite");
  const suite: SuiteKey | "all" = isSuiteKey(suiteParam) ? suiteParam : "all";
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState(() => getDefaultStatusFilter(suite));

  const handleSuiteChange = (nextSuite: SuiteKey | "all") => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextSuite === "all") {
      params.delete("suite");
    } else {
      params.set("suite", nextSuite);
    }

    const query = params.toString();
    setStatus(getDefaultStatusFilter(nextSuite));
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const copy = portalCopy[locale].tools;
  const currentSuiteName = suite === "all" ? undefined : getSuiteCopy(suite, locale).name;

  const filteredTools = tools.filter((tool) => {
    const suiteMatch = suite === "all" || tool.suite === suite;
    const categoryMatch = category === "all" || tool.category === category;
    const statusMatch = status === "all" || tool.status === status;
    return suiteMatch && categoryMatch && statusMatch;
  });

  return (
    <div className="space-y-5">
      <section className="panel flex flex-col gap-5 p-6 sm:p-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold text-primary-strong">{copy.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">{copy.title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
            {copy.description}
          </p>
          {currentSuiteName ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-base bg-primary-soft px-3 py-2 text-sm font-bold text-primary-strong">
              <span aria-hidden="true">●</span>
              {locale === "ja" ? `${currentSuiteName}${copy.currentSuiteSuffix}` : `${currentSuiteName} ${copy.currentSuiteSuffix}`}
            </div>
          ) : null}
        </div>
        <div className="rounded-base border border-border bg-surface-muted px-4 py-3 text-sm text-muted">
          <span className="font-bold text-foreground">{filteredTools.length}</span>
          <span> / {tools.length} {copy.resultCountSuffix}</span>
        </div>
      </section>
      <PortalFilterBar
        suite={suite}
        category={category}
        status={status}
        locale={locale}
        onSuiteChange={handleSuiteChange}
        onCategoryChange={setCategory}
        onStatusChange={setStatus}
      />
      <FeedbackNotice />
      <section aria-label={copy.listLabel}>
        {filteredTools.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} locale={locale} />
            ))}
          </div>
        ) : (
          <div className="panel p-8 text-center text-sm text-muted">
            {copy.empty}
          </div>
        )}
      </section>
    </div>
  );
}
