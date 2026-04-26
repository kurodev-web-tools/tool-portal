"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { PortalFilterBar } from "@/components/portal/PortalFilterBar";
import { ToolCard } from "@/components/portal/ToolCard";
import { tools } from "@/lib/tools";
import { suites, type SuiteKey } from "@/lib/suites";

function isSuiteKey(value: string | null): value is SuiteKey {
  return Boolean(value && suites.some((suite) => suite.key === value));
}

export function PortalToolsIndex() {
  const searchParams = useSearchParams();
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const suiteParam = searchParams.get("suite");
  const initialSuite = isSuiteKey(suiteParam) ? suiteParam : undefined;

  const filteredTools = tools.filter((tool) => {
    const suiteMatch = !initialSuite || tool.suite === initialSuite;
    const categoryMatch = category === "all" || tool.category === category;
    const statusMatch = status === "all" || tool.status === status;
    return suiteMatch && categoryMatch && statusMatch;
  });

  return (
    <div className="space-y-5">
      <PortalFilterBar
        category={category}
        status={status}
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
