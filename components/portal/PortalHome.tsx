"use client";

import { useState } from "react";
import { PortalFilterBar } from "@/components/portal/PortalFilterBar";
import { PortalHeroSummary } from "@/components/portal/PortalHeroSummary";
import { ToolCard } from "@/components/portal/ToolCard";
import { tools } from "@/lib/tools";

export function PortalHome() {
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");

  const filteredTools = tools.filter((tool) => {
    const categoryMatch = category === "all" || tool.category === category;
    const statusMatch = status === "all" || tool.status === status;
    return categoryMatch && statusMatch;
  });

  return (
    <div className="space-y-5">
      <PortalHeroSummary />
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
