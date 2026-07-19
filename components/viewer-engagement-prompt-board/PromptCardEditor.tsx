"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  promptCardCategories,
  promptCardSegments,
  promptCardTones,
  type PromptCard,
  type PromptCardCategory,
  type PromptCardSegment,
  type PromptCardTone
} from "@/lib/viewer-engagement-prompt-board-storage";
import type { PromptCardInput } from "@/lib/viewer-engagement-prompt-board-prompt-cards";
import { useViewerEngagementPromptBoardCopy } from "@/lib/viewer-engagement-prompt-board-copy";

function readCategory(value: string): PromptCardCategory {
  return promptCardCategories.find((category) => category === value) ?? "talking-point";
}

function readSegment(value: string): PromptCardSegment {
  return promptCardSegments.find((segment) => segment === value) ?? "anytime";
}

function readTone(value: string): PromptCardTone {
  return promptCardTones.find((tone) => tone === value) ?? "neutral";
}

export function PromptCardEditor({
  card,
  onSubmit,
  onCancel
}: {
  readonly card: PromptCard | null;
  readonly onSubmit: (input: PromptCardInput) => void;
  readonly onCancel: () => void;
}) {
  const copy = useViewerEngagementPromptBoardCopy();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState(card?.body ?? "");
  const [category, setCategory] = useState<PromptCardCategory>(card?.category ?? "talking-point");
  const [segment, setSegment] = useState<PromptCardSegment>(card?.segment ?? "anytime");
  const [tone, setTone] = useState<PromptCardTone>(card?.tone ?? "neutral");
  const [safetyNotes, setSafetyNotes] = useState(card?.safetyNotes ?? "");
  const [bodyError, setBodyError] = useState(false);

  useEffect(() => {
    bodyRef.current?.focus();
  }, []);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (body.trim().length === 0) {
      setBodyError(true);
      bodyRef.current?.focus();
      return;
    }
    setBodyError(false);
    onSubmit({ body, category, segment, tone, safetyNotes });
  };

  return (
    <section className="panel p-4 sm:p-5" aria-labelledby="prompt-card-editor-title">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-primary-strong">{copy.cardEditor.eyebrow}</p>
          <h3 id="prompt-card-editor-title" className="mt-1 text-lg font-black text-foreground">
            {card === null ? copy.cardEditor.createTitle : copy.cardEditor.editTitle}
          </h3>
        </div>
        <button type="button" className="flat-control min-h-10 px-3 py-2" onClick={onCancel}>{copy.cardEditor.close}</button>
      </div>
      <form className="grid gap-4" onSubmit={submit} noValidate data-prompt-card-editor={card === null ? "create" : "edit"}>
        <label className="grid gap-1.5 text-sm font-bold text-foreground">
          {copy.cardEditor.body} <span className="text-red-600">{copy.cardEditor.required}</span>
          <textarea
            ref={bodyRef}
            className="flat-input min-h-28 resize-y px-3 py-2 leading-6"
            value={body}
            required
            maxLength={500}
            onChange={(event) => setBody(event.target.value)}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="grid gap-1.5 text-sm font-bold text-foreground">
            {copy.cardEditor.category}
            <select className="flat-input min-h-11 px-3 py-2" value={category} onChange={(event) => setCategory(readCategory(event.target.value))}>
              {promptCardCategories.map((value) => <option key={value} value={value}>{copy.category[value]}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-foreground">
            {copy.cardEditor.segment}
            <select className="flat-input min-h-11 px-3 py-2" value={segment} onChange={(event) => setSegment(readSegment(event.target.value))}>
              {promptCardSegments.map((value) => <option key={value} value={value}>{copy.segment[value]}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-foreground">
            {copy.cardEditor.tone}
            <select className="flat-input min-h-11 px-3 py-2" value={tone} onChange={(event) => setTone(readTone(event.target.value))}>
              {promptCardTones.map((value) => <option key={value} value={value}>{copy.tone[value]}</option>)}
            </select>
          </label>
        </div>
        <label className="grid gap-1.5 text-sm font-bold text-foreground">
          {copy.cardEditor.safetyNotes}
          <textarea
            className="flat-input min-h-20 resize-y px-3 py-2 leading-6"
            value={safetyNotes}
            maxLength={300}
            placeholder={copy.cardEditor.safetyPlaceholder}
            onChange={(event) => setSafetyNotes(event.target.value)}
          />
        </label>
        {bodyError ? <p role="alert" className="text-sm font-bold text-red-700 dark:text-red-300">{copy.cardEditor.bodyError}</p> : null}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="flat-control min-h-11 px-4 py-2" onClick={onCancel}>{copy.cardEditor.cancel}</button>
          <button type="submit" className="min-h-11 rounded-base bg-primary px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-primary-strong">
            {card === null ? copy.cardEditor.create : copy.cardEditor.save}
          </button>
        </div>
      </form>
    </section>
  );
}
