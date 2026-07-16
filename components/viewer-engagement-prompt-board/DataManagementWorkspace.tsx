"use client";

import { useState } from "react";
import {
  exportPromptBoardJson,
  importPromptBoardJson,
  type PromptBoardData,
  type PromptBoardStorageFailureReason
} from "@/lib/viewer-engagement-prompt-board-storage";

type Notice = Readonly<{ kind: "success" | "error"; message: string }> | null;

export function getPromptBoardStorageFailureMessage(reason: PromptBoardStorageFailureReason): string {
  switch (reason) {
    case "malformed-json":
      return "JSONの形式を確認してください。現在のデータは置き換えていません。";
    case "corrupt-data":
    case "invalid-data":
      return "復元データの内容が正しくありません。現在のデータは置き換えていません。";
    case "unsupported-schema":
      return "このバックアップは未対応のバージョンです。現在のデータは置き換えていません。";
    case "storage-unavailable":
      return "ブラウザ保存を利用できません。現在のデータは置き換えていません。";
    case "write-failed":
      return "保存に失敗しました。直前までのデータを維持しています。ブラウザの空き容量を確認してください。";
  }
}

export function DataManagementWorkspace({
  data,
  onRestore
}: {
  readonly data: PromptBoardData;
  readonly onRestore: (restoredData: PromptBoardData) => void;
}) {
  const [restoreJson, setRestoreJson] = useState("");
  const [notice, setNotice] = useState<Notice>(null);

  const createBackup = () => {
    const result = exportPromptBoardJson(data);
    if (!result.ok) {
      setNotice({ kind: "error", message: "現在のデータをバックアップできませんでした。データ内容を確認してください。" });
      return;
    }
    const objectUrl = URL.createObjectURL(new Blob([result.json], { type: "application/json" }));
    const download = document.createElement("a");
    download.href = objectUrl;
    download.download = "viewer-engagement-prompt-board-backup.json";
    download.click();
    URL.revokeObjectURL(objectUrl);
    setNotice({ kind: "success", message: "JSONバックアップを作成しました。" });
  };

  const restoreBackup = () => {
    const result = importPromptBoardJson(restoreJson, data);
    if (result.kind === "failure") {
      setNotice({ kind: "error", message: getPromptBoardStorageFailureMessage(result.reason) });
      return;
    }
    onRestore(result.data);
    setRestoreJson("");
    setNotice({ kind: "success", message: "JSONバックアップを復元しました。" });
  };

  return (
    <div className="grid min-w-0 gap-5" data-prompt-board-data-management>
      {notice === null ? null : (
        <p
          role={notice.kind === "error" ? "alert" : "status"}
          className={notice.kind === "error"
            ? "rounded-base border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
            : "rounded-base border border-primary/30 bg-primary-soft/70 px-4 py-3 text-sm font-bold text-primary-strong"}
        >
          {notice.message}
        </p>
      )}

      <section className="panel min-w-0 p-4 sm:p-5" aria-labelledby="prompt-board-backup-title">
        <h3 id="prompt-board-backup-title" className="text-lg font-black text-foreground">JSONバックアップ</h3>
        <p className="mt-2 max-w-3xl text-sm text-muted [word-break:auto-phrase]">
          <span className="block">配信プランとカンペカードをJSONファイルとして保存します。</span>
          <span className="block">アカウントや外部サービスの情報は含みません。</span>
        </p>
        <button
          type="button"
          className="mt-4 min-h-11 rounded-base bg-primary px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-primary-strong"
          onClick={createBackup}
        >
          JSONバックアップを作成
        </button>
      </section>

      <section className="panel min-w-0 p-4 sm:p-5" aria-labelledby="prompt-board-restore-title">
        <h3 id="prompt-board-restore-title" className="text-lg font-black text-foreground">JSONから復元</h3>
        <p id="prompt-board-restore-help" className="mt-2 max-w-3xl text-sm text-muted [word-break:auto-phrase]">
          <span className="block">バックアップJSONを貼り付けて復元します。</span>
          <span className="block">形式とバージョンを検証します。</span>
          <span className="block">ブラウザへの保存後に、現在のデータを置き換えます。</span>
        </p>
        <label htmlFor="prompt-board-restore-json" className="mt-4 block text-sm font-black text-foreground">
          バックアップJSON
        </label>
        <textarea
          id="prompt-board-restore-json"
          aria-describedby="prompt-board-restore-help"
          className="mt-2 min-h-48 w-full resize-y rounded-base border border-border bg-surface px-3 py-3 font-mono text-sm text-foreground outline-none [overflow-wrap:anywhere] focus:border-primary focus:ring-2 focus:ring-primary/30"
          value={restoreJson}
          onChange={(event) => setRestoreJson(event.target.value)}
          spellCheck={false}
        />
        <button
          type="button"
          className="mt-4 min-h-11 rounded-base border border-border bg-surface px-4 py-2 text-sm font-black text-foreground transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
          disabled={restoreJson.trim().length === 0}
          onClick={restoreBackup}
        >
          JSONから復元
        </button>
      </section>
    </div>
  );
}
