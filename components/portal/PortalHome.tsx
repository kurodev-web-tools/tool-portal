import { PortalHeroSummary } from "@/components/portal/PortalHeroSummary";
import { SuiteCard } from "@/components/portal/SuiteCard";
import { suites } from "@/lib/suites";

export function PortalHome() {
  return (
    <div className="space-y-8">
      <section className="panel p-6 sm:p-8">
        <PortalHeroSummary />
      </section>

      <section aria-labelledby="suite-heading" className="space-y-4">
        <div>
          <h2 id="suite-heading" className="text-2xl font-bold tracking-tight text-primary-strong">
            スイートから探す
          </h2>
          <p className="mt-2 text-sm text-muted">
            あなたの活動を支えるツール群を、目的に合わせてまとめました。
          </p>
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          {suites.map((suite) => (
            <SuiteCard key={suite.key} suite={suite} />
          ))}
        </div>
      </section>

      <p className="text-center text-sm text-muted">
        ツールは今後も順次追加されていきます。最新情報はお知らせでご確認ください。
      </p>
    </div>
  );
}
