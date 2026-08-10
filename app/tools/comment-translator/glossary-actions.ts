"use server";

import {
  parseCommentTranslatorCreatorGlossaryCsv,
  type CommentTranslatorCreatorGlossaryCsvImportRejectionReason
} from "@/lib/comment-translator-creator-glossary-csv-import";
import { createCommentTranslatorCreatorGlossaryRuntime } from "@/lib/comment-translator-creator-glossary-runtime";
import { createTrustedCommentTranslatorCreatorGlossaryStore } from "@/lib/comment-translator-creator-glossary-store";
import { readCommentTranslatorCreatorActionCallerAuthority } from "./action-context";

type GlossaryImportPreviewRow = {
  readonly languageScope: string;
  readonly term: string;
  readonly replacement: string;
  readonly note: string | null;
};

type GlossaryImportUnavailableReason = "authentication-required" | "glossary-unavailable";

export type CommentTranslatorCreatorGlossaryImportPreviewResult =
  | {
      readonly status: "ready";
      readonly expectedVersion: number;
      readonly termCount: number;
      readonly rows: readonly GlossaryImportPreviewRow[];
    }
  | { readonly status: "invalid"; readonly reason: CommentTranslatorCreatorGlossaryCsvImportRejectionReason | "invalid-request" }
  | { readonly status: "unavailable"; readonly reason: GlossaryImportUnavailableReason };

export type CommentTranslatorCreatorGlossaryImportApplyResult =
  | {
      readonly status: "applied";
      readonly version: number;
      readonly effectiveVersion: string;
      readonly termCount: number;
    }
  | { readonly status: "stale"; readonly requiresPreview: true }
  | { readonly status: "invalid"; readonly reason: CommentTranslatorCreatorGlossaryCsvImportRejectionReason | "invalid-request" }
  | { readonly status: "unavailable"; readonly reason: GlossaryImportUnavailableReason };

export async function previewCommentTranslatorCreatorGlossaryImportAction(
  bytes: Uint8Array
): Promise<CommentTranslatorCreatorGlossaryImportPreviewResult> {
  const context = await readGlossaryImportActionContext();
  if (context.status !== "ready") return context.result;

  const current = await readGlossaryStatus(context.runtime, context.callerAuthority);
  if (current.status === "unavailable") return current.result;
  const parsed = parseCommentTranslatorCreatorGlossaryCsv(bytes);
  if (parsed.status !== "ready") return { status: "invalid", reason: parsed.reason };
  return {
    status: "ready",
    expectedVersion: current.expectedVersion,
    termCount: parsed.entries.length,
    rows: parsed.entries.map(({ languageScope, term, replacement, note }) => ({ languageScope, term, replacement, note }))
  };
}

export async function applyCommentTranslatorCreatorGlossaryImportAction({
  bytes,
  expectedVersion
}: {
  readonly bytes: Uint8Array;
  readonly expectedVersion: number;
}): Promise<CommentTranslatorCreatorGlossaryImportApplyResult> {
  if (!isExpectedVersion(expectedVersion)) return { status: "invalid", reason: "invalid-request" };

  const context = await readGlossaryImportActionContext();
  if (context.status !== "ready") return context.result;

  const current = await readGlossaryStatus(context.runtime, context.callerAuthority);
  if (current.status === "unavailable") return current.result;
  const parsed = parseCommentTranslatorCreatorGlossaryCsv(bytes);
  if (parsed.status !== "ready") return { status: "invalid", reason: parsed.reason };
  if (current.expectedVersion !== expectedVersion) return { status: "stale", requiresPreview: true };

  let result: Awaited<ReturnType<typeof context.runtime.replace>>;
  try {
    result = await context.runtime.replace({
      callerAuthority: context.callerAuthority,
      expectedVersion,
      entries: parsed.entries
    });
  } catch {
    return { status: "unavailable", reason: "glossary-unavailable" };
  }
  if (result.status === "updated") {
    return {
      status: "applied",
      version: result.version,
      effectiveVersion: result.effectiveVersion,
      termCount: result.termCount
    };
  }
  if (result.reason === "expected-version-stale") return { status: "stale", requiresPreview: true };
  if (result.reason === "term-limit-exceeded" || result.reason === "normalized-term-collision" || result.reason === "malformed-entry") {
    return { status: "invalid", reason: "invalid-request" };
  }
  return { status: "unavailable", reason: "glossary-unavailable" };
}

async function readGlossaryImportActionContext() {
  let callerAuthority: Awaited<ReturnType<typeof readCommentTranslatorCreatorActionCallerAuthority>>;
  try {
    callerAuthority = await readCommentTranslatorCreatorActionCallerAuthority();
  } catch {
    return { status: "unavailable" as const, result: { status: "unavailable" as const, reason: "authentication-required" as const } };
  }
  if (callerAuthority.status !== "authenticated") {
    return {
      status: "unavailable" as const,
      result: {
        status: "unavailable" as const,
        reason: callerAuthority.status === "unauthenticated" ? "authentication-required" as const : "glossary-unavailable" as const
      }
    };
  }

  let trustedStore: ReturnType<typeof createTrustedCommentTranslatorCreatorGlossaryStore>;
  try {
    trustedStore = createTrustedCommentTranslatorCreatorGlossaryStore();
  } catch {
    return { status: "unavailable" as const, result: { status: "unavailable" as const, reason: "glossary-unavailable" as const } };
  }
  if (trustedStore.status !== "ready") {
    return { status: "unavailable" as const, result: { status: "unavailable" as const, reason: "glossary-unavailable" as const } };
  }
  return {
    status: "ready" as const,
    callerAuthority,
    runtime: createCommentTranslatorCreatorGlossaryRuntime({ glossaryStore: trustedStore.store })
  };
}

async function readGlossaryStatus(runtime: ReturnType<typeof createCommentTranslatorCreatorGlossaryRuntime>, callerAuthority: Awaited<ReturnType<typeof readCommentTranslatorCreatorActionCallerAuthority>>) {
  try {
    const status = await runtime.readStatus({ callerAuthority });
    if (status.status === "ready") return { status: "ready" as const, expectedVersion: status.version };
    if (status.reason === "glossary-missing") return { status: "ready" as const, expectedVersion: 0 };
  } catch {
    return { status: "unavailable" as const, result: { status: "unavailable" as const, reason: "glossary-unavailable" as const } };
  }
  return { status: "unavailable" as const, result: { status: "unavailable" as const, reason: "glossary-unavailable" as const } };
}

function isExpectedVersion(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
