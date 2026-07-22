"use client";

import { useEffect, useRef } from "react";
import { useViewerEngagementPromptBoardCopy } from "@/lib/viewer-engagement-prompt-board-copy";

export function DeleteConfirmationDialog({
  message,
  onCancel,
  onConfirm
}: {
  readonly message: string;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}) {
  const copy = useViewerEngagementPromptBoardCopy();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (dialog !== null && !dialog.open) {
      dialog.showModal();
      cancelButtonRef.current?.focus();
    }
    return () => {
      if (dialog?.open) {
        dialog.close();
      }
      if (returnFocus?.isConnected) {
        returnFocus.focus();
      }
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-base border border-border bg-surface p-0 text-foreground shadow-panel backdrop:bg-slate-950/70"
      aria-labelledby="prompt-board-delete-title"
      aria-describedby="prompt-board-delete-description"
      aria-modal="true"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div className="border-b border-border px-4 py-4 sm:px-5">
        <p className="text-xs font-black uppercase tracking-wide text-red-700 dark:text-red-300">{copy.deleteDialog.eyebrow}</p>
        <h2 id="prompt-board-delete-title" className="mt-1 text-lg font-black text-foreground">{copy.deleteDialog.title}</h2>
        <p id="prompt-board-delete-description" className="mt-2 text-sm leading-6 text-muted [word-break:auto-phrase]">{message}</p>
      </div>
      <div className="flex flex-col-reverse gap-2 px-4 py-4 sm:flex-row sm:justify-end sm:px-5">
        <button ref={cancelButtonRef} type="button" className="flat-control min-h-11 px-4 py-2" onClick={onCancel}>{copy.deleteDialog.cancel}</button>
        <button type="button" className="min-h-11 rounded-base border border-red-700 bg-red-700 px-4 py-2 text-sm font-black text-white transition hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface dark:border-red-500 dark:bg-red-600 dark:hover:bg-red-500" onClick={onConfirm}>{copy.deleteDialog.confirm}</button>
      </div>
    </dialog>
  );
}
