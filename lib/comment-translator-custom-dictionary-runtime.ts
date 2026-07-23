import "server-only";

import { createHash, randomUUID } from "node:crypto";
import {
  commentTranslatorCustomDictionarySourceLanguages,
  commentTranslatorCustomDictionaryTargetLanguages,
  type CommentTranslatorCustomDictionaryEntryRecord,
  type CommentTranslatorCustomDictionaryEntryWrite,
  type CommentTranslatorCustomDictionaryInput,
  type CommentTranslatorCustomDictionaryMutationResult,
  type CommentTranslatorCustomDictionaryRuntimeAuthority,
  type CommentTranslatorCustomDictionarySourceLanguage,
  type CommentTranslatorCustomDictionaryStore,
  type CommentTranslatorCustomDictionaryStoreMutationResult,
  type CommentTranslatorCustomDictionaryTargetLanguage,
  type CommentTranslatorCustomDictionaryUpdateInput
} from "./comment-translator-custom-dictionary-types";

const maxTermLength = 80;
const maxReplacementLength = 120;
const maxNoteLength = 240;
const entryIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const forbiddenControlCharacterPattern = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u;

type ParsedDictionaryEntry = Omit<CommentTranslatorCustomDictionaryEntryWrite, "entryId" | "createdAtIso" | "updatedAtIso">;

export const commentTranslatorCustomDictionaryContract = {
  implementationStage: "creator-closed-beta-c9-custom-dictionary-minimum",
  runtime: "server-only",
  ownerAuthority: "authenticated-server-derived-caller-only",
  maxCurrentTerms: 30,
  sourceLanguages: commentTranslatorCustomDictionarySourceLanguages,
  targetLanguages: commentTranslatorCustomDictionaryTargetLanguages,
  termMaxCharacters: maxTermLength,
  replacementMaxCharacters: maxReplacementLength,
  noteMaxCharacters: maxNoteLength,
  versionAuthority: "sha256-of-sorted-effective-language-scoped-entries",
  providerExecutionDuringCrud: "forbidden",
  browserReadableEntryContent: "not-returned-by-design"
} as const;

export async function readCommentTranslatorCustomDictionary(request: CommentTranslatorCustomDictionaryRuntimeAuthority) {
  const authority = resolveAuthority(request);
  if (authority.status === "unavailable") return authority.result;
  try {
    const entries = await authority.store.readCurrent({ ownerUserId: authority.ownerUserId });
    return {
      status: "ready" as const,
      entries: entries.map(({ ownerUserId: _ownerUserId, ...entry }) => entry),
      currentTermCount: entries.length,
      dictionaryVersion: createDictionaryVersion(entries),
      browserReadableEntryContent: "not-returned-by-design" as const
    };
  } catch {
    return unavailable("dictionary-store-unavailable", true);
  }
}

export async function readCommentTranslatorCustomDictionaryGlossary({
  sourceLanguages,
  targetLanguage,
  ...request
}: CommentTranslatorCustomDictionaryRuntimeAuthority & {
  readonly sourceLanguages?: readonly string[];
  readonly targetLanguage: string;
}) {
  const dictionary = await readCommentTranslatorCustomDictionary(request);
  if (dictionary.status !== "ready") return dictionary;
  const sourceLanguageSet = new Set(
    sourceLanguages?.filter(isSourceLanguage) ?? commentTranslatorCustomDictionarySourceLanguages
  );
  if (!isTargetLanguage(targetLanguage)) return unavailable("invalid-entry", false);
  const entries = dictionary.entries.filter((entry) =>
    sourceLanguageSet.has(entry.sourceLanguage) && entry.targetLanguage === targetLanguage
  );
  return {
    status: "ready" as const,
    glossaryTerms: entries
      .slice()
      .sort(compareEntries)
      .map((entry) => `[${entry.sourceLanguage}->${entry.targetLanguage}] ${entry.term} => ${entry.replacement}`),
    glossaryVersion: createDictionaryVersion(entries),
    browserReadableEntryContent: "not-returned-by-design" as const
  };
}

export async function createCommentTranslatorCustomDictionaryEntry(
  request: CommentTranslatorCustomDictionaryRuntimeAuthority & {
    readonly input: CommentTranslatorCustomDictionaryInput;
    readonly nowIso?: () => string;
  }
): Promise<CommentTranslatorCustomDictionaryMutationResult> {
  const authority = resolveAuthority(request);
  if (authority.status === "unavailable") return authority.result;
  const parsed = parseEntry(request.input);
  const timestamp = readTimestamp(request.nowIso);
  if (!parsed || !timestamp) return unavailable("invalid-entry", false);
  try {
    const result = await authority.store.createEntry({
      ownerUserId: authority.ownerUserId,
      entry: { entryId: randomUUID(), ...parsed, createdAtIso: timestamp, updatedAtIso: timestamp }
    });
    return finishMutation({ operation: "create", result, store: authority.store, ownerUserId: authority.ownerUserId });
  } catch {
    return unavailable("dictionary-store-unavailable", true);
  }
}

export async function updateCommentTranslatorCustomDictionaryEntry(
  request: CommentTranslatorCustomDictionaryRuntimeAuthority & {
    readonly input: CommentTranslatorCustomDictionaryUpdateInput;
    readonly nowIso?: () => string;
  }
): Promise<CommentTranslatorCustomDictionaryMutationResult> {
  const authority = resolveAuthority(request);
  if (authority.status === "unavailable") return authority.result;
  const parsed = parseEntry(request.input);
  const timestamp = readTimestamp(request.nowIso);
  if (
    !parsed || !entryIdPattern.test(request.input.entryId) ||
    Number.isNaN(Date.parse(request.input.expectedUpdatedAtIso)) || !timestamp
  ) return unavailable("invalid-entry", false);
  try {
    const current = await authority.store.readCurrent({ ownerUserId: authority.ownerUserId });
    const existing = current.find((entry) => entry.entryId === request.input.entryId);
    if (!existing) return unavailable("entry-missing", false);
    const result = await authority.store.updateEntry({
      ownerUserId: authority.ownerUserId,
      entryId: request.input.entryId,
      expectedUpdatedAtIso: request.input.expectedUpdatedAtIso,
      entry: { entryId: existing.entryId, ...parsed, createdAtIso: existing.createdAtIso, updatedAtIso: timestamp }
    });
    return finishMutation({ operation: "update", result, store: authority.store, ownerUserId: authority.ownerUserId });
  } catch {
    return unavailable("dictionary-store-unavailable", true);
  }
}

export async function deleteCommentTranslatorCustomDictionaryEntry(
  request: CommentTranslatorCustomDictionaryRuntimeAuthority & {
    readonly entryId: string;
    readonly expectedUpdatedAtIso: string;
  }
): Promise<CommentTranslatorCustomDictionaryMutationResult> {
  const authority = resolveAuthority(request);
  if (authority.status === "unavailable") return authority.result;
  if (!entryIdPattern.test(request.entryId) || Number.isNaN(Date.parse(request.expectedUpdatedAtIso))) {
    return unavailable("invalid-entry", false);
  }
  try {
    const result = await authority.store.deleteEntry({
      ownerUserId: authority.ownerUserId,
      entryId: request.entryId,
      expectedUpdatedAtIso: request.expectedUpdatedAtIso
    });
    return finishMutation({ operation: "delete", result, store: authority.store, ownerUserId: authority.ownerUserId });
  } catch {
    return unavailable("dictionary-store-unavailable", true);
  }
}

async function finishMutation({
  operation,
  result,
  store,
  ownerUserId
}: {
  readonly operation: "create" | "update" | "delete";
  readonly result: CommentTranslatorCustomDictionaryStoreMutationResult;
  readonly store: CommentTranslatorCustomDictionaryStore;
  readonly ownerUserId: string;
}): Promise<CommentTranslatorCustomDictionaryMutationResult> {
  if (result !== "applied" && result !== "unchanged") return unavailable(result, false);
  const entries = await store.readCurrent({ ownerUserId });
  return {
    status: "applied",
    operation,
    currentTermCount: entries.length,
    dictionaryVersion: createDictionaryVersion(entries),
    browserReadableEntryContent: "not-returned-by-design"
  };
}

function parseEntry(input: CommentTranslatorCustomDictionaryInput): ParsedDictionaryEntry | null {
  const term = parseRequiredText(input.term, maxTermLength);
  const replacement = parseRequiredText(input.replacement, maxReplacementLength);
  const note = parseNote(input.note);
  if (!term || !replacement || note === undefined || !isSourceLanguage(input.sourceLanguage) ||
    !isTargetLanguage(input.targetLanguage) || input.sourceLanguage === input.targetLanguage) return null;
  return {
    term,
    normalizedTerm: term.normalize("NFKC").toLocaleLowerCase().replace(/\s+/gu, " "),
    replacement,
    note,
    sourceLanguage: input.sourceLanguage,
    targetLanguage: input.targetLanguage
  };
}

function parseRequiredText(value: string, maxLength: number): string | null {
  const normalized = value.normalize("NFKC").trim().replace(/\s+/gu, " ");
  if (!normalized || forbiddenControlCharacterPattern.test(normalized) || Array.from(normalized).length > maxLength) return null;
  return normalized;
}

function parseNote(value: string | null | undefined): string | null | undefined {
  if (value === null || value === undefined || !value.trim()) return null;
  const sanitized = value.normalize("NFKC").replace(/[\u0000-\u001f\u007f-\u009f\s]+/gu, " ").trim();
  if (Array.from(sanitized).length > maxNoteLength) return undefined;
  return sanitized || null;
}

function createDictionaryVersion(entries: readonly Pick<
  CommentTranslatorCustomDictionaryEntryRecord,
  "normalizedTerm" | "replacement" | "sourceLanguage" | "targetLanguage"
>[]): string | null {
  if (entries.length === 0) return null;
  const canonical = entries.map((entry) =>
    [entry.sourceLanguage, entry.targetLanguage, entry.normalizedTerm, entry.replacement].join("\u0000")
  ).sort().join("\u0001");
  return `ctdict-${createHash("sha256").update(canonical, "utf8").digest("hex")}`;
}

function resolveAuthority(request: CommentTranslatorCustomDictionaryRuntimeAuthority) {
  if (request.callerAuthorization.status !== "authorized") {
    return { status: "unavailable" as const, result: unavailable("auth-unavailable", false) };
  }
  if (request.dictionaryStore?.status !== "ready") {
    return { status: "unavailable" as const, result: unavailable("dictionary-store-unavailable", true) };
  }
  return {
    status: "ready" as const,
    ownerUserId: request.callerAuthorization.ownerUserId,
    store: request.dictionaryStore.store
  };
}

function unavailable(
  reason: Extract<CommentTranslatorCustomDictionaryMutationResult, { status: "unavailable" }>["reason"],
  retryable: boolean
): Extract<CommentTranslatorCustomDictionaryMutationResult, { status: "unavailable" }> {
  return { status: "unavailable", reason, retryable, browserReadableEntryContent: "not-returned-by-design" };
}

function isSourceLanguage(value: string): value is CommentTranslatorCustomDictionarySourceLanguage {
  return value === "ja" || value === "en" || value === "ko" || value === "zh";
}

function isTargetLanguage(value: string): value is CommentTranslatorCustomDictionaryTargetLanguage {
  return value === "ja" || value === "en";
}

function readTimestamp(nowIso: (() => string) | undefined): string | null {
  const value = (nowIso ?? (() => new Date().toISOString()))();
  return Number.isNaN(Date.parse(value)) ? null : value;
}

function compareEntries(
  left: Pick<CommentTranslatorCustomDictionaryEntryRecord, "sourceLanguage" | "targetLanguage" | "normalizedTerm">,
  right: Pick<CommentTranslatorCustomDictionaryEntryRecord, "sourceLanguage" | "targetLanguage" | "normalizedTerm">
): number {
  return `${left.sourceLanguage}\u0000${left.targetLanguage}\u0000${left.normalizedTerm}`
    .localeCompare(`${right.sourceLanguage}\u0000${right.targetLanguage}\u0000${right.normalizedTerm}`);
}
