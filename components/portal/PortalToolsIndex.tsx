"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PortalFilterBar } from "@/components/portal/PortalFilterBar";
import { ToolCard } from "@/components/portal/ToolCard";
import { tools } from "@/lib/tools";
import { suiteLabels, suites, type SuiteKey } from "@/lib/suites";

function isSuiteKey(value: string | null): value is SuiteKey {
  return Boolean(value && suites.some((suite) => suite.key === value));
}

export function PortalToolsIndex() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const suiteParam = searchParams.get("suite");
  const initialSuite = isSuiteKey(suiteParam) ? suiteParam : "all";
  const [suite, setSuite] = useState<SuiteKey | "all">(initialSuite);
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    setSuite(initialSuite);
  }, [initialSuite]);

  const handleSuiteChange = (nextSuite: SuiteKey | "all") => {
    setSuite(nextSuite);

    const params = new URLSearchParams(searchParams.toString());
    if (nextSuite === "all") {
      params.delete("suite");
    } else {
      params.set("suite", nextSuite);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const currentSuiteName = suite === "all" ? undefined : suiteLabels[suite];

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
          <p className="text-sm font-bold text-primary-strong">Tools</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">ツール一覧</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
            利用可能なツールや準備中の機能を、スイート・カテゴリ・実装状況で絞り込んで探せます。
          </p>
          {currentSuiteName ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-base bg-primary-soft px-3 py-2 text-sm font-bold text-primary-strong">
              <span aria-hidden="true">●</span>
              {currentSuiteName}を表示中
            </div>
          ) : null}
        </div>
        <div className="rounded-base border border-border bg-surface-muted px-4 py-3 text-sm text-muted">
          <span className="font-bold text-foreground">{filteredTools.length}</span>
          <span> / {tools.length} 件を表示中</span>
        </div>
      </section>
      <PortalFilterBar
        suite={suite}
        category={category}
        status={status}
        onSuiteChange={handleSuiteChange}
        onCategoryChange={setCategory}
        onStatusChange={setStatus}
      />
      <section aria-label="ツール一覧">
        {filteredTools.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        ) : (
          <div className="panel p-8 text-center text-sm text-muted">
            条件に一致するツールはまだありません。
          </div>
        )}
      </section>
    </div>
  );
}
