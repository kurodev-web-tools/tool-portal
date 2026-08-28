import type { LegalDocument } from "@/lib/legal-content";

type LegalDocumentPageProps = {
  document: LegalDocument;
  dateLabels?: {
    effectiveDate: string;
    updatedDate: string;
  };
};

const defaultDateLabels = {
  effectiveDate: "制定日",
  updatedDate: "最終更新日"
};

export function LegalDocumentPage({ document, dateLabels = defaultDateLabels }: LegalDocumentPageProps) {
  return (
    <article className="mx-auto max-w-4xl">
      <header className="border-b border-border pb-6">
        <p className="text-sm font-bold text-primary-strong">{document.eyebrow}</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{document.title}</h1>
        <p className="mt-4 text-sm leading-7 text-muted sm:text-base">{document.lead}</p>
        <dl className="mt-5 grid gap-2 text-xs text-muted sm:grid-cols-2">
          <div className="rounded-base bg-surface-muted px-3 py-2">
            <dt className="font-bold text-foreground">{dateLabels.effectiveDate}</dt>
            <dd className="mt-1">{document.effectiveDate}</dd>
          </div>
          <div className="rounded-base bg-surface-muted px-3 py-2">
            <dt className="font-bold text-foreground">{dateLabels.updatedDate}</dt>
            <dd className="mt-1">{document.updatedDate}</dd>
          </div>
        </dl>
      </header>

      <div className="space-y-9 py-8">
        {document.sections.map((section, index) => {
          const sectionId = `legal-section-${index}`;

          return (
            <section key={sectionId} aria-labelledby={sectionId} className="space-y-4">
              <h2 id={sectionId} className="text-xl font-bold tracking-tight text-foreground">
                {section.heading}
              </h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="text-sm leading-7 text-muted">
                  {paragraph}
                </p>
              ))}
              {section.list ? (
                <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-muted">
                  {section.list.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              {section.rows ? (
                <dl className="overflow-hidden rounded-base border border-border">
                  {section.rows.map((row) => (
                    <div key={row.label} className="grid gap-2 border-b border-border bg-surface last:border-b-0 sm:grid-cols-[13rem_1fr]">
                      <dt className="bg-surface-muted px-4 py-3 text-sm font-bold text-foreground">{row.label}</dt>
                      <dd className="px-4 py-3 text-sm leading-7 text-muted">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </section>
          );
        })}
      </div>
    </article>
  );
}
