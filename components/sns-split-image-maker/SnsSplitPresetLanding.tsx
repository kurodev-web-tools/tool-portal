"use client";

import type { SnsSplitPreset } from "@/lib/sns-split-image-maker";
import { useLocale } from "@/components/portal/LocaleProvider";
import { getSnsSplitImageMakerCopy, getSnsSplitPresetCards } from "@/lib/sns-split-image-maker-copy";

export function SnsSplitPresetLanding({
  hasStoredDraft,
  storedPreset,
  onOpenPreset
}: {
  hasStoredDraft: boolean;
  storedPreset: SnsSplitPreset;
  onOpenPreset: (preset: SnsSplitPreset) => void;
}) {
  const { locale } = useLocale();
  const copy = getSnsSplitImageMakerCopy(locale);
  const presetCards = getSnsSplitPresetCards(locale);

  return (
    <div className="h-full overflow-y-auto bg-background/72 text-foreground scrollbar-accent">
      <div className="mx-auto flex min-h-full w-full max-w-[1320px] flex-col gap-6 px-4 py-5 lg:px-6 xl:px-8">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
          <div className="min-w-0">
            <p className="text-xs font-bold text-primary-strong">{copy.header.category}</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-foreground lg:text-3xl">{copy.header.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              {copy.header.description}
            </p>
          </div>
          {hasStoredDraft ? (
            <button type="button" onClick={() => onOpenPreset(storedPreset)} className="min-h-11 rounded-base bg-primary px-5 py-2 text-sm font-black text-white shadow-panel">
              {copy.header.openStoredDraft}
            </button>
          ) : null}
        </header>

        <main className="grid gap-4 md:grid-cols-3">
          {presetCards.map((preset) => (
            <article key={preset.id} className="panel flex min-h-[260px] flex-col justify-between gap-5 p-5 shadow-none">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-primary-strong">{preset.status}</p>
                    <h2 className="mt-1 text-xl font-black text-foreground">{preset.title}</h2>
                  </div>
                  <span className="rounded-full border border-border bg-surface-muted px-3 py-1 text-xs font-black text-muted">{preset.id}</span>
                </div>
                <p className="mt-4 text-sm leading-6 text-muted">{preset.description}</p>
                <ul className="mt-4 grid gap-2 text-sm font-bold text-foreground">
                  {preset.details.map((detail) => (
                    <li key={detail} className="rounded-base border border-border bg-surface-muted/60 px-3 py-2">
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                onClick={() => onOpenPreset(preset.id)}
                disabled={!preset.available}
                className={[
                  "min-h-12 rounded-base px-4 py-2 text-sm font-black transition",
                  preset.available ? "bg-primary text-white shadow-panel hover:opacity-90" : "cursor-not-allowed border border-border bg-surface-muted text-muted"
                ].join(" ")}
              >
                {preset.available ? copy.common.openEditor : copy.common.unavailable}
              </button>
            </article>
          ))}
        </main>
      </div>
    </div>
  );
}
