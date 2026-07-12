import type { CommentTranslatorComment } from "@/lib/comment-translator";
import type { YouTubeOAuthCredentialStatusUiStateId } from "@/lib/comment-translator-youtube-credential-status-ui-wiring";
import type { CommentTranslatorUiCopy, OperatorSessionState } from "./comment-translator-dock-model";

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function statusClassName(status: CommentTranslatorComment["status"]): string {
  if (status === "translated") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "skipped") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-red-200 bg-red-50 text-red-700";
}

export function toneClassName(tone: "normal" | "warning" | "empty" | "error"): string {
  if (tone === "warning") return "border-amber-200 bg-amber-50/45 text-amber-800";
  if (tone === "empty") return "border-border bg-surface-muted/50 text-muted";
  if (tone === "error") return "border-red-200 bg-red-50/45 text-red-700";
  return "border-emerald-200 bg-emerald-50/45 text-emerald-700";
}

export function credentialStatusTone(state: YouTubeOAuthCredentialStatusUiStateId): "normal" | "warning" | "error" {
  if (state === "available") return "normal";
  return state === "unavailable" ? "error" : "warning";
}

export function operatorFlowTone(status: "ready" | "standby" | "blocked"): "normal" | "warning" | "error" {
  if (status === "ready") return "normal";
  return status === "blocked" ? "error" : "warning";
}

export function operatorSessionTone(status: OperatorSessionState["status"]): "normal" | "warning" | "empty" {
  if (status === "active") return "normal";
  return status === "stopped" ? "warning" : "empty";
}

export function statusLabel(comment: CommentTranslatorComment, copy: CommentTranslatorUiCopy): string {
  if (comment.status === "translated") {
    return comment.cacheStatus === "hit" ? copy.statusBadges.reused : copy.statusBadges.fresh;
  }
  return copy.statusBadges[comment.status];
}

export function skipReasonLabel(reason: string, copy: CommentTranslatorUiCopy): string {
  return Object.entries(copy.skipReasonText).find(([key]) => key === reason)?.[1] ?? reason;
}
