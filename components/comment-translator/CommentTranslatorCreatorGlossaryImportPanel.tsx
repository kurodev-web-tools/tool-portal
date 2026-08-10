"use client";

import { useRef, useState, type ChangeEvent } from "react";
import {
  applyCommentTranslatorCreatorGlossaryImportAction,
  previewCommentTranslatorCreatorGlossaryImportAction,
  type CommentTranslatorCreatorGlossaryImportPreviewResult
} from "@/app/tools/comment-translator/glossary-actions";

export const commentTranslatorCreatorGlossaryImportPanelContract = {
  dataBoundary: "file-bytes-and-server-preview-only",
  persistence: "component-memory-only",
  lifecycle: "explicit-preview-cancel-apply",
  applyGate: "ready-preview-only",
  authority: "server-derived-caller-only",
  productionWiring: "fixed-closed"
} as const;

type PanelPhase = "idle" | "reading" | "selected" | "previewing" | "ready" | "applying" | "applied" | "stale";

export function CommentTranslatorCreatorGlossaryImportPanel() {
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<Extract<
    CommentTranslatorCreatorGlossaryImportPreviewResult,
    { readonly status: "ready" }
  > | null>(null);
  const [phase, setPhase] = useState<PanelPhase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isPending = phase === "reading" || phase === "previewing" || phase === "applying";
  const canApply = Boolean(bytes && preview && phase === "ready");

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    setBytes(null);
    setPreview(null);
    setMessage(null);
    if (!file) {
      setFileName(null);
      setPhase("idle");
      return;
    }
    setFileName(file.name || "Selected CSV");
    setPhase("reading");
    try {
      const fileBytes = new Uint8Array(await file.arrayBuffer());
      setBytes(fileBytes);
      setPhase("selected");
    } catch {
      setFileName(null);
      setPhase("idle");
      setMessage("The selected file could not be read.");
    }
  }

  async function handlePreview() {
    if (!bytes || isPending) return;
    setPhase("previewing");
    setPreview(null);
    setMessage(null);
    try {
      const result = await previewCommentTranslatorCreatorGlossaryImportAction(bytes);
      if (result.status === "ready") {
        setPreview(result);
        setPhase("ready");
        setMessage("Preview ready. Review the rows before applying.");
      } else {
        setPhase("selected");
        setMessage(readActionMessage(result));
      }
    } catch {
      setPhase("selected");
      setMessage("Glossary import is unavailable.");
    }
  }

  async function handleApply() {
    if (!bytes || !preview || phase !== "ready" || isPending) return;
    setPhase("applying");
    setMessage(null);
    try {
      const result = await applyCommentTranslatorCreatorGlossaryImportAction({
        bytes,
        expectedVersion: preview.expectedVersion
      });
      if (result.status === "applied") {
        setPhase("applied");
        setMessage("Glossary applied.");
      } else if (result.status === "stale") {
        setPreview(null);
        setPhase("stale");
        setMessage("The glossary changed. Preview the file again before applying.");
      } else {
        setPhase("selected");
        setMessage(readActionMessage(result));
      }
    } catch {
      setPhase("selected");
      setMessage("Glossary import is unavailable.");
    }
  }

  function handleCancel() {
    setBytes(null);
    setFileName(null);
    setPreview(null);
    setPhase("idle");
    setMessage(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <section className="w-full max-w-3xl rounded-lg border border-slate-200 bg-white p-4 text-slate-900" aria-labelledby="creator-glossary-import-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-600">Creator</p>
          <h2 id="creator-glossary-import-title" className="text-lg font-semibold">Import glossary CSV</h2>
        </div>
        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">Preview first</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Use the exact columns language_scope, term, replacement, note. Import replaces the current glossary after the server confirms the version.
      </p>
      <div className="mt-4 rounded-md bg-slate-50 p-3">
        <label htmlFor="creator-glossary-csv-file" className="block text-sm font-medium text-slate-800">CSV file</label>
        <input
          ref={inputRef}
          id="creator-glossary-csv-file"
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          disabled={isPending}
          className="mt-2 block w-full text-sm text-slate-700"
        />
        {fileName ? <p className="mt-2 break-words text-xs text-slate-600">Selected: {fileName}</p> : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={handlePreview} disabled={!bytes || isPending} className="min-h-10 rounded-md bg-indigo-700 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300">Preview</button>
        <button type="button" onClick={handleCancel} disabled={(!bytes && !preview) || isPending} className="min-h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 disabled:cursor-not-allowed disabled:text-slate-400">Cancel</button>
      </div>
      {preview ? (
        <div className="mt-4 rounded-md border border-slate-200 p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold">Normalized preview</h3>
            <span className="text-sm text-slate-600">{preview.termCount} terms</span>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th scope="col" className="px-2 py-2 font-medium">Language</th>
                  <th scope="col" className="px-2 py-2 font-medium">Term</th>
                  <th scope="col" className="px-2 py-2 font-medium">Replacement</th>
                  <th scope="col" className="px-2 py-2 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, index) => (
                  <tr key={`${row.languageScope}-${row.term}-${index}`} className="border-b border-slate-100 align-top last:border-0">
                    <td className="max-w-32 break-words px-2 py-2">{row.languageScope}</td>
                    <td className="max-w-48 break-words px-2 py-2">{row.term}</td>
                    <td className="max-w-48 break-words px-2 py-2">{row.replacement}</td>
                    <td className="max-w-56 break-words px-2 py-2">{row.note ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={handleApply} disabled={!canApply || isPending} className="mt-4 min-h-10 rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300">Apply</button>
        </div>
      ) : null}
      {message ? <p className="mt-3 text-sm text-slate-700" aria-live="polite">{message}</p> : null}
    </section>
  );
}

function readActionMessage(result: { readonly status: "invalid" | "unavailable"; readonly reason: string }): string {
  if (result.status === "invalid") return "The CSV file does not match the glossary import contract.";
  if (result.reason === "authentication-required") return "Sign in to import a glossary.";
  return "Glossary import is unavailable.";
}
