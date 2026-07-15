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

const categoryLabels: Readonly<Record<PromptCardCategory, string>> = {
  "talking-point": "トークポイント",
  question: "質問",
  announcement: "お知らせ",
  reminder: "注意・確認",
  other: "その他"
};
const segmentLabels: Readonly<Record<PromptCardSegment, string>> = {
  opening: "オープニング",
  main: "本編",
  intermission: "中休み",
  closing: "クロージング",
  anytime: "いつでも"
};
const toneLabels: Readonly<Record<PromptCardTone, string>> = {
  neutral: "ニュートラル",
  casual: "カジュアル",
  energetic: "元気",
  calm: "落ち着き",
  serious: "真剣"
};

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
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState(card?.body ?? "");
  const [category, setCategory] = useState<PromptCardCategory>(card?.category ?? "talking-point");
  const [segment, setSegment] = useState<PromptCardSegment>(card?.segment ?? "anytime");
  const [tone, setTone] = useState<PromptCardTone>(card?.tone ?? "neutral");
  const [safetyNotes, setSafetyNotes] = useState(card?.safetyNotes ?? "");

  useEffect(() => {
    bodyRef.current?.focus();
  }, []);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({ body, category, segment, tone, safetyNotes });
  };

  return (
    <section className="panel p-4 sm:p-5" aria-labelledby="prompt-card-editor-title">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-primary-strong">カンペカード</p>
          <h3 id="prompt-card-editor-title" className="mt-1 text-lg font-black text-foreground">
            {card === null ? "カンペを追加" : "カンペを編集"}
          </h3>
        </div>
        <button type="button" className="flat-control min-h-10 px-3 py-2" onClick={onCancel}>閉じる</button>
      </div>
      <form className="grid gap-4" onSubmit={submit} data-prompt-card-editor={card === null ? "create" : "edit"}>
        <label className="grid gap-1.5 text-sm font-bold text-foreground">
          本文 <span className="text-red-600">必須</span>
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
            カテゴリ
            <select className="flat-input min-h-11 px-3 py-2" value={category} onChange={(event) => setCategory(readCategory(event.target.value))}>
              {promptCardCategories.map((value) => <option key={value} value={value}>{categoryLabels[value]}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-foreground">
            配信セグメント
            <select className="flat-input min-h-11 px-3 py-2" value={segment} onChange={(event) => setSegment(readSegment(event.target.value))}>
              {promptCardSegments.map((value) => <option key={value} value={value}>{segmentLabels[value]}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-bold text-foreground">
            トーン
            <select className="flat-input min-h-11 px-3 py-2" value={tone} onChange={(event) => setTone(readTone(event.target.value))}>
              {promptCardTones.map((value) => <option key={value} value={value}>{toneLabels[value]}</option>)}
            </select>
          </label>
        </div>
        <label className="grid gap-1.5 text-sm font-bold text-foreground">
          注意事項
          <textarea
            className="flat-input min-h-20 resize-y px-3 py-2 leading-6"
            value={safetyNotes}
            maxLength={300}
            placeholder="固有名詞や避けたい表現など"
            onChange={(event) => setSafetyNotes(event.target.value)}
          />
        </label>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="flat-control min-h-11 px-4 py-2" onClick={onCancel}>キャンセル</button>
          <button type="submit" className="min-h-11 rounded-base bg-primary px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-primary-strong">
            {card === null ? "追加する" : "更新する"}
          </button>
        </div>
      </form>
    </section>
  );
}
