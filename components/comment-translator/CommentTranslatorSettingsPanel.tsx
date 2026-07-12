import { ControlSelect } from "./CommentTranslatorDockAtoms";
import type { CommentTranslatorUiCopy, SelectOption } from "./comment-translator-dock-model";

export function CommentTranslatorSettingsPanel({ locale, copy, sourceLanguage, targetLanguage, displayMode, surfaceMode, sourceLanguageOptions, targetLanguageOptions, displayModeOptions, surfaceModeOptions, viewMode, showStreamSafeAuthorDisplayNames, sourceShortLabel, targetShortLabel, onSourceLanguageChange, onTargetLanguageChange, onDisplayModeChange, onSurfaceModeChange, onViewModeChange, onSafeDisplayNamesChange }: {
  readonly locale: "ja" | "en";
  readonly copy: CommentTranslatorUiCopy;
  readonly sourceLanguage: string;
  readonly targetLanguage: string;
  readonly displayMode: string;
  readonly surfaceMode: string;
  readonly sourceLanguageOptions: readonly SelectOption[];
  readonly targetLanguageOptions: readonly SelectOption[];
  readonly displayModeOptions: readonly SelectOption[];
  readonly surfaceModeOptions: readonly SelectOption[];
  readonly viewMode: "normal" | "comments";
  readonly showStreamSafeAuthorDisplayNames: boolean;
  readonly sourceShortLabel: string;
  readonly targetShortLabel: string;
  readonly onSourceLanguageChange: (value: string) => void;
  readonly onTargetLanguageChange: (value: string) => void;
  readonly onDisplayModeChange: (value: string) => void;
  readonly onSurfaceModeChange: (value: string) => void;
  readonly onViewModeChange: (value: "normal" | "comments") => void;
  readonly onSafeDisplayNamesChange: (value: boolean) => void;
}) {
  return (
    <section className="panel p-4">
      <h2 className="text-base font-black text-foreground">{locale === "ja" ? "翻訳設定" : "Translation settings"}</h2>
      <div className="mt-4 grid gap-3">
        <ControlSelect label={copy.controls.sourceLanguage} value={sourceLanguage} options={sourceLanguageOptions} onChange={onSourceLanguageChange} />
        <ControlSelect label={copy.controls.targetLanguage} value={targetLanguage} options={targetLanguageOptions} onChange={onTargetLanguageChange} />
        <ControlSelect label={copy.controls.commentText} value={displayMode} options={displayModeOptions} onChange={onDisplayModeChange} />
        <ControlSelect label={copy.controls.surface} value={surfaceMode} options={surfaceModeOptions} onChange={onSurfaceModeChange} />
        <div className="grid gap-1.5"><p className="text-xs font-black uppercase tracking-normal text-muted">{locale === "ja" ? "画面モード" : "View mode"}</p><div className="inline-flex w-fit rounded-base border border-border bg-surface-muted p-1">{(["normal", "comments"] as const).map((id) => { const selected = viewMode === id; return <button key={id} type="button" aria-pressed={selected} onClick={() => onViewModeChange(id)} className={["rounded-base px-3 py-1.5 text-xs font-black transition", selected ? "bg-primary text-white" : "text-muted hover:bg-surface hover:text-foreground"].join(" ")}>{id === "normal" ? locale === "ja" ? "通常" : "Normal" : locale === "ja" ? "コメントのみ" : "Comments only"}</button>; })}</div></div>
        <label data-comment-translator-obs-dock-display-name-setting="explicit-toggle" className="flex min-w-0 items-start gap-2 rounded-base border border-border bg-background/65 px-3 py-2 text-xs font-semibold leading-5 text-muted"><input type="checkbox" checked={showStreamSafeAuthorDisplayNames} onChange={(event) => onSafeDisplayNamesChange(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 rounded border-border text-primary" /><span className="min-w-0"><span className="block break-words font-black text-foreground">{copy.displayNamePolicy.streamSafeToggleLabel}</span><span className="mt-1 block break-words">{copy.displayNamePolicy.streamSafeToggleHelper}</span></span></label>
        <div className="rounded-base border border-border bg-background/65 px-3 py-2 text-sm"><div className="flex justify-between gap-3"><span className="text-muted">{copy.controls.currentPair}</span><span className="break-words text-right font-black text-foreground">{sourceShortLabel} → {targetShortLabel}</span></div></div>
      </div>
    </section>
  );
}
