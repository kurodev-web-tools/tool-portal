import { PortalHeroSummary } from "@/components/portal/PortalHeroSummary";
import { FeedbackNotice } from "@/components/portal/FeedbackNotice";
import { SuiteCard } from "@/components/portal/SuiteCard";
import { suites } from "@/lib/suites";

export function PortalHome() {
  return (
    <div className="space-y-7 lg:space-y-8">
      <section className="panel p-5 sm:p-7 lg:p-8">
        <PortalHeroSummary />
      </section>

      <section aria-labelledby="suite-heading" className="space-y-4">
        <div>
          <h2 id="suite-heading" className="text-2xl font-bold tracking-tight text-primary-strong">
            スイートから探す
          </h2>
          <p className="mt-2 text-sm text-muted">
            いま使えるスイートと、追加予定の候補を分けて確認できます。
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
          {suites.map((suite) => (
            <SuiteCard key={suite.key} suite={suite} />
          ))}
        </div>
      </section>

      <FeedbackNotice />

      <p className="text-center text-sm text-muted">
        今すぐ使える個別ツールは Schedule Calendar / Thumbnail Editor / SNS分割画像メーカーです。
      </p>
    </div>
  );
}
