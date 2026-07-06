"use client";

import { PortalHeroSummary } from "@/components/portal/PortalHeroSummary";
import { FeedbackNotice } from "@/components/portal/FeedbackNotice";
import { useLocale } from "@/components/portal/LocaleProvider";
import { SuiteCard } from "@/components/portal/SuiteCard";
import { portalCopy } from "@/lib/portal-copy";
import type { AccountSessionBrowserSafeViewModel } from "@/lib/supabase/session";
import { suites } from "@/lib/suites";

export function PortalHome({ accountStatus }: { accountStatus: AccountSessionBrowserSafeViewModel }) {
  const { locale } = useLocale();
  const copy = portalCopy[locale].home;

  return (
    <div className="space-y-7 lg:space-y-8">
      <section className="panel p-5 sm:p-7 lg:p-8">
        <PortalHeroSummary accountStatus={accountStatus} />
      </section>

      <section aria-labelledby="suite-heading" className="space-y-4">
        <div>
          <h2 id="suite-heading" className="text-2xl font-bold tracking-tight text-primary-strong">
            {copy.suiteHeading}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {copy.suiteLead}
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
          {suites.map((suite) => (
            <SuiteCard key={suite.key} suite={suite} locale={locale} />
          ))}
        </div>
      </section>

      <FeedbackNotice />

      <p className="text-center text-sm text-muted">
        {copy.footer}
      </p>
    </div>
  );
}
