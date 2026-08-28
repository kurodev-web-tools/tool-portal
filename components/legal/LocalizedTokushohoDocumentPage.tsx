"use client";

import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import { useLocale } from "@/components/portal/LocaleProvider";
import { tokushohoDocuments } from "@/lib/legal-content";

export function LocalizedTokushohoDocumentPage() {
  const { locale, isLocaleReady } = useLocale();
  const document = isLocaleReady ? tokushohoDocuments[locale] : tokushohoDocuments.ja;
  const dateLabels =
    isLocaleReady && locale === "en"
      ? { effectiveDate: "Effective date", updatedDate: "Last updated" }
      : { effectiveDate: "制定日", updatedDate: "最終更新日" };

  return <LegalDocumentPage document={document} dateLabels={dateLabels} />;
}
