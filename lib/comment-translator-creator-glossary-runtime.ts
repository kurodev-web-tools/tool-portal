import "server-only";

import type { CommentTranslatorCreatorCallerAuthority } from "./comment-translator-creator-entitlement-runtime";
import type {
  CommentTranslatorCreatorGlossaryEntry,
  CommentTranslatorCreatorGlossaryRead,
  CommentTranslatorCreatorGlossaryStore
} from "./comment-translator-creator-glossary-store";

type GlossaryInputEntry = {
  readonly term: string;
  readonly replacement: string;
  readonly note: string | null;
  readonly languageScope: string;
};

type GlossaryStatus =
  | { readonly status: "ready"; readonly termCount: number; readonly version: number; readonly effectiveVersion: string }
  | {
      readonly status: "fail-closed";
      readonly reason: "caller-unavailable" | "glossary-missing" | "glossary-unreadable";
      readonly termCount: 0;
      readonly version: null;
      readonly effectiveVersion: null;
    };

type GlossaryReplaceResult =
  | { readonly status: "updated"; readonly termCount: number; readonly version: number; readonly effectiveVersion: string }
  | {
      readonly status: "rejected";
      readonly reason:
        | "caller-unavailable"
        | "expected-version-stale"
        | "term-limit-exceeded"
        | "normalized-term-collision"
        | "malformed-entry"
        | "glossary-unreadable";
      readonly termCount: number;
      readonly version: number | null;
      readonly effectiveVersion: string | null;
    };

export const commentTranslatorCreatorGlossaryRuntimeContract = {
  implementationStage: "nc-c1-local-glossary-runtime",
  runtime: "server-only",
  callerAuthority: "server-derived-owner-only",
  maximumTermCount: 30,
  normalization: "nfkc-casefold-language-tag",
  providerProjection: "term-and-replacement-only-note-forbidden",
  cacheIdentity: "effective-glossary-content-version",
  missingOrUnreadable: "fail-closed",
  browserAuthority: "forbidden",
  inMemoryAuthority: "forbidden",
  creatorActivation: "fixed-closed",
  productionRouteWiring: "disconnected"
} as const;

export function createCommentTranslatorCreatorGlossaryRuntime({
  glossaryStore
}: {
  readonly glossaryStore: CommentTranslatorCreatorGlossaryStore;
}) {
  return {
    async readStatus({ callerAuthority }: { readonly callerAuthority: CommentTranslatorCreatorCallerAuthority }): Promise<GlossaryStatus> {
      const read = await readForCaller(glossaryStore, callerAuthority);
      return projectStatus(read);
    },
    async replace({
      callerAuthority,
      expectedVersion,
      entries
    }: {
      readonly callerAuthority: CommentTranslatorCreatorCallerAuthority;
      readonly expectedVersion: number;
      readonly entries: readonly GlossaryInputEntry[];
    }): Promise<GlossaryReplaceResult> {
      const current = await readForCaller(glossaryStore, callerAuthority);
      if (callerAuthority.status !== "authenticated") return rejected("caller-unavailable", current);
      if (entries.length > commentTranslatorCreatorGlossaryRuntimeContract.maximumTermCount) {
        return rejected("term-limit-exceeded", current);
      }
      if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) return rejected("malformed-entry", current);
      const normalized = normalizeEntries(entries);
      if (normalized.status === "rejected") return rejected(normalized.reason, current);
      const result = await glossaryStore.replaceGlossary({
        ownerUserId: callerAuthority.ownerUserId,
        expectedVersion,
        entries: normalized.entries
      });
      if (result.status === "updated") return result;
      return rejected(mapStoreReason(result.reason), current);
    },
    async resolveProviderContext({
      callerAuthority,
      targetLanguage
    }: {
      readonly callerAuthority: CommentTranslatorCreatorCallerAuthority;
      readonly targetLanguage: string;
    }) {
      const normalizedTargetLanguage = normalizeLanguageScope(targetLanguage);
      const read = await readForCaller(glossaryStore, callerAuthority);
      if (read.status !== "ready") {
        const status = projectStatus(read);
        return {
          status: "fail-closed" as const,
          reason: status.status === "fail-closed" ? status.reason : "glossary-unreadable",
          glossaryTerms: [] as readonly string[],
          glossaryVersion: null
        };
      }
      if (!normalizedTargetLanguage) {
        return {
          status: "fail-closed" as const,
          reason: "glossary-unreadable" as const,
          glossaryTerms: [] as readonly string[],
          glossaryVersion: null
        };
      }
      return {
        status: "ready" as const,
        glossaryTerms: read.entries
          .filter((entry) => entry.languageScope === "*" || entry.languageScope === normalizedTargetLanguage)
          .map((entry) => `${entry.term}=>${entry.replacement}`),
        glossaryVersion: read.effectiveVersion
      };
    }
  };
}

type CallerRead = CommentTranslatorCreatorGlossaryRead | { readonly status: "caller-unavailable" };

async function readForCaller(
  glossaryStore: CommentTranslatorCreatorGlossaryStore,
  callerAuthority: CommentTranslatorCreatorCallerAuthority
): Promise<CallerRead> {
  if (callerAuthority.status !== "authenticated") return { status: "caller-unavailable" };
  try {
    return await glossaryStore.readGlossary({ ownerUserId: callerAuthority.ownerUserId });
  } catch (error) {
    if (error instanceof Error) return { status: "fail-closed", reason: "unreadable" };
    return { status: "fail-closed", reason: "unreadable" };
  }
}

function normalizeEntries(entries: readonly GlossaryInputEntry[]):
  | { readonly status: "ready"; readonly entries: readonly CommentTranslatorCreatorGlossaryEntry[] }
  | { readonly status: "rejected"; readonly reason: "malformed-entry" | "normalized-term-collision" } {
  const normalizedEntries: CommentTranslatorCreatorGlossaryEntry[] = [];
  const collisionKeys = new Set<string>();
  for (const entry of entries) {
    const term = normalizeText(entry.term, 100);
    const replacement = normalizeText(entry.replacement, 200);
    const note = entry.note === null ? null : normalizeText(entry.note, 500, true);
    const languageScope = normalizeLanguageScope(entry.languageScope);
    if (!term || !replacement || !languageScope || (entry.note !== null && note === null)) {
      return { status: "rejected", reason: "malformed-entry" };
    }
    const normalizedTerm = term.toLowerCase();
    const collisionKey = `${languageScope}:${normalizedTerm}`;
    if (collisionKeys.has(collisionKey)) return { status: "rejected", reason: "normalized-term-collision" };
    collisionKeys.add(collisionKey);
    normalizedEntries.push({ term, replacement, note, languageScope, normalizedTerm });
  }
  normalizedEntries.sort((left, right) =>
    left.languageScope.localeCompare(right.languageScope) || left.normalizedTerm.localeCompare(right.normalizedTerm)
  );
  return { status: "ready", entries: normalizedEntries };
}

function normalizeText(value: string, maximumLength: number, allowEmpty = false): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if ((!normalized && !allowEmpty) || Array.from(normalized).length > maximumLength) return null;
  return normalized;
}

function normalizeLanguageScope(value: string): string | null {
  const normalized = value.normalize("NFKC").trim().toLowerCase().replace(/_/g, "-");
  const aliases: Readonly<Record<string, string>> = { jp: "ja", japanese: "ja", eng: "en", english: "en", kr: "ko", korean: "ko", cn: "zh-hans", chinese: "zh-hans" };
  const canonical = aliases[normalized] ?? normalized;
  return canonical === "*" || /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(canonical) ? canonical : null;
}

function projectStatus(read: CallerRead): GlossaryStatus {
  if (read.status === "ready") {
    return { status: "ready", termCount: read.termCount, version: read.version, effectiveVersion: read.effectiveVersion };
  }
  const reason = read.status === "caller-unavailable"
    ? "caller-unavailable"
    : read.reason === "missing" ? "glossary-missing" : "glossary-unreadable";
  return { status: "fail-closed", reason, termCount: 0, version: null, effectiveVersion: null };
}

function rejected(reason: GlossaryReplaceResult["reason"], read: CallerRead): GlossaryReplaceResult {
  const status = projectStatus(read);
  return {
    status: "rejected",
    reason,
    termCount: status.termCount,
    version: status.version,
    effectiveVersion: status.effectiveVersion
  };
}

function mapStoreReason(reason: "expected-version-stale" | "term-limit-exceeded" | "normalized-term-collision" | "malformed" | "unreadable"): GlossaryReplaceResult["reason"] {
  return reason === "malformed" ? "malformed-entry" : reason === "unreadable" ? "glossary-unreadable" : reason;
}
