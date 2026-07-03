import "server-only";

type CommentTranslatorInitialSourceLanguage = "JA" | "EN" | "KR" | "CN";
type CommentTranslatorInitialTargetLanguage = "JA" | "EN";
type CommentTranslatorLanguageClassification = "single" | "mixed-dominant";
type CommentTranslatorLanguagePolicySkipReason =
  | "emoji-only"
  | "url-only"
  | "symbol-only"
  | "duplicate"
  | "too-short"
  | "low-value-short-reaction"
  | "target-language"
  | "unselected-source-language"
  | "low-confidence";

type CommentTranslatorLanguagePolicyRejectedReason =
  | "same-language-selection"
  | "all-language-auto-mode-excluded"
  | "unsupported-source-language"
  | "unsupported-target-language";

export type CommentTranslatorLanguagePolicyLanguage = {
  publicCode: CommentTranslatorInitialSourceLanguage | CommentTranslatorInitialTargetLanguage;
  providerLanguageCode: "ja" | "en" | "ko" | "zh";
};

export type CommentTranslatorLanguagePolicySelectionResult =
  | {
      status: "ready";
      sourceLanguages: readonly CommentTranslatorLanguagePolicyLanguage[];
      targetLanguage: CommentTranslatorLanguagePolicyLanguage;
    }
  | {
      status: "rejected";
      reason: CommentTranslatorLanguagePolicyRejectedReason;
      clientReadableDetail:
        | "source-target-language-pair-not-allowed"
        | "all-language-auto-mode-not-initial-release"
        | "source-language-not-initial-release"
        | "target-language-not-initial-release";
    };

export type CommentTranslatorLanguagePolicyCommentInput = {
  commentId: string;
  text: string;
  platformLanguageHint?: string | null;
};

export type CommentTranslatorLanguagePolicyDetectedLanguage = CommentTranslatorLanguagePolicyLanguage & {
  confidence: number;
  classification: CommentTranslatorLanguageClassification;
};

export type CommentTranslatorLanguagePolicyAcceptedComment = {
  commentId: string;
  dedupeKey: string;
  detectedLanguage: CommentTranslatorLanguagePolicyDetectedLanguage;
  targetLanguage: CommentTranslatorLanguagePolicyLanguage;
};

export type CommentTranslatorLanguagePolicySkippedComment = {
  commentId: string;
  reason: CommentTranslatorLanguagePolicySkipReason;
};

type CommentTranslatorLanguagePolicySanitizedSummary = {
  acceptedCommentCount: number;
  skippedCommentCount: number;
  rawCommentText: "never-returned-by-design";
  providerTargetMetadata: "forbidden";
};

export type CommentTranslatorLanguagePolicyEvaluationResult =
  | {
      status: "ready";
      acceptedComments: readonly CommentTranslatorLanguagePolicyAcceptedComment[];
      skippedComments: readonly CommentTranslatorLanguagePolicySkippedComment[];
      sanitizedSummary: CommentTranslatorLanguagePolicySanitizedSummary;
    }
  | (Extract<CommentTranslatorLanguagePolicySelectionResult, { status: "rejected" }> & {
      acceptedComments: readonly [];
      skippedComments: readonly CommentTranslatorLanguagePolicySkippedComment[];
      sanitizedSummary: CommentTranslatorLanguagePolicySanitizedSummary;
    });

export type CommentTranslatorLanguagePolicyEvaluationRequest = {
  sourceLanguages?: readonly string[];
  targetLanguage: string;
  comments: readonly CommentTranslatorLanguagePolicyCommentInput[];
  policyVersion?: string;
};

const languageByPublicCode = {
  JA: {
    publicCode: "JA",
    providerLanguageCode: "ja"
  },
  EN: {
    publicCode: "EN",
    providerLanguageCode: "en"
  },
  KR: {
    publicCode: "KR",
    providerLanguageCode: "ko"
  },
  CN: {
    publicCode: "CN",
    providerLanguageCode: "zh"
  }
} as const satisfies Record<CommentTranslatorInitialSourceLanguage, CommentTranslatorLanguagePolicyLanguage>;

const sourceAliasToPublicCode = {
  ja: "JA",
  jp: "JA",
  japanese: "JA",
  en: "EN",
  eng: "EN",
  english: "EN",
  kr: "KR",
  ko: "KR",
  korean: "KR",
  cn: "CN",
  zh: "CN",
  chinese: "CN"
} as const satisfies Record<string, CommentTranslatorInitialSourceLanguage>;

const targetAliasToPublicCode = {
  ja: "JA",
  jp: "JA",
  japanese: "JA",
  en: "EN",
  eng: "EN",
  english: "EN"
} as const satisfies Record<string, CommentTranslatorInitialTargetLanguage>;

const spanishLanguageAliases = new Set(["es", "esp", "spanish"]);
const allLanguageAutoAliases = new Set(["auto", "all", "all-language", "all_languages"]);
const defaultSourceLanguages: readonly CommentTranslatorInitialSourceLanguage[] = ["EN", "KR", "CN"];
const defaultPolicyVersion = "language-policy-v1";
const minimumSignalCharacters = 3;
const minimumLanguageConfidence = 0.6;
const lowValueShortReactionTexts = new Set([
  "lol",
  "lmao",
  "nice",
  "gg",
  "ok",
  "okay",
  "thanks",
  "thank you",
  "thx",
  "hi",
  "hello",
  "hey",
  "wow",
  "cool",
  "great",
  "good",
  "ww",
  "www",
  "ナイス",
  "ありがとう",
  "こんにちは",
  "こんばんは",
  "草",
  "おつ",
  "お疲れ",
  "いいね",
  "かわいい",
  "すごい",
  "最高",
  "ㅋㅋ",
  "ㅋㅋㅋ",
  "ㅎㅎ",
  "ㅎㅎㅎ",
  "감사",
  "고마워",
  "안녕",
  "좋아",
  "굿",
  "대박",
  "哈哈",
  "哈哈哈",
  "謝謝",
  "谢谢",
  "你好",
  "好",
  "可以",
  "厉害",
  "厲害"
]);
const meaningfulShortLatinWordPattern = /\b(help|heal|reload|stop|wait|run|hide|behind|left|right|danger|careful)\b/;
const meaningfulShortCjkMarkers = [
  "どこ",
  "なに",
  "何",
  "どう",
  "お願い",
  "助け",
  "回復",
  "後ろ",
  "危険",
  "逃げ",
  "뭐",
  "어디",
  "어떻게",
  "왜",
  "도와",
  "위험",
  "뒤",
  "회복",
  "什么",
  "哪",
  "哪里",
  "怎么",
  "为什么",
  "救",
  "小心",
  "后面",
  "後面",
  "危险",
  "危險",
  "回血"
] as const;

export const commentTranslatorLanguagePolicyRuntimeContract = {
  implementationStage: "server-owned-filtering-language-policy-runtime",
  runtime: "server-only",
  initialSourceCandidates: ["JA", "EN", "KR", "CN"],
  initialTargetCandidates: ["JA", "EN"],
  sameLanguageSelection: "server-policy-rejected",
  spanishInitialRelease: "excluded-unless-explicitly-approved",
  allLanguageAutoMode: "excluded-unless-explicitly-approved",
  mixedCommentClassification: "dominant-language",
  outputBoundary: "sanitized-metadata-only-except-server-only-provider-input",
  skipReasons: [
    "emoji-only",
    "url-only",
    "symbol-only",
    "duplicate",
    "too-short",
    "low-value-short-reaction",
    "target-language",
    "unselected-source-language",
    "low-confidence"
  ],
  cacheDedupeExcludedMaterial: [
    "oauth-token-value",
    "refresh-token-value",
    "authorization-code-value",
    "provider-target-identifier",
    "polling-cursor",
    "owner-identifier",
    "authorization-header-value",
    "service-role-key-value",
    "browser-local-handoff-material",
    "liveChatId-value",
    "provider-channel-id-value",
    "raw-provider-target-metadata"
  ],
  browserStorage: "forbidden",
  handoffPayload: "unchanged",
  liveProviderExecution: "not-run-in-task-9",
  remoteMutation: "not-run-in-task-9"
} as const;

export function validateCommentTranslatorLanguagePolicySelection({
  sourceLanguages,
  targetLanguage
}: {
  sourceLanguages?: readonly string[];
  targetLanguage: string;
}): CommentTranslatorLanguagePolicySelectionResult {
  const normalizedTarget = normalizeTargetLanguage(targetLanguage);
  if (normalizedTarget.status === "rejected") {
    return normalizedTarget;
  }

  const normalizedSources: CommentTranslatorInitialSourceLanguage[] = [];
  for (const sourceLanguage of sourceLanguages?.length ? sourceLanguages : defaultSourceLanguages) {
    const normalizedSource = normalizeSourceLanguage(sourceLanguage);
    if (normalizedSource.status === "rejected") {
      return normalizedSource;
    }

    if (!normalizedSources.includes(normalizedSource.publicCode)) {
      normalizedSources.push(normalizedSource.publicCode);
    }
  }

  if (normalizedSources.includes(normalizedTarget.targetLanguage.publicCode)) {
    return {
      status: "rejected",
      reason: "same-language-selection",
      clientReadableDetail: "source-target-language-pair-not-allowed"
    };
  }

  return {
    status: "ready",
    sourceLanguages: normalizedSources.map((publicCode) => languageByPublicCode[publicCode]),
    targetLanguage: normalizedTarget.targetLanguage
  };
}

export function evaluateCommentTranslatorLanguagePolicy(
  request: CommentTranslatorLanguagePolicyEvaluationRequest
): CommentTranslatorLanguagePolicyEvaluationResult {
  const selection = validateCommentTranslatorLanguagePolicySelection({
    sourceLanguages: request.sourceLanguages,
    targetLanguage: request.targetLanguage
  });

  if (selection.status === "rejected") {
    return {
      ...selection,
      acceptedComments: [],
      skippedComments: request.comments.map((comment) => ({
        commentId: comment.commentId,
        reason: "unselected-source-language"
      })),
      sanitizedSummary: createSanitizedSummary(0, request.comments.length)
    };
  }

  const acceptedComments: CommentTranslatorLanguagePolicyAcceptedComment[] = [];
  const skippedComments: CommentTranslatorLanguagePolicySkippedComment[] = [];
  const selectedSourceCodes = new Set(selection.sourceLanguages.map((sourceLanguage) => sourceLanguage.publicCode));
  const seenDedupeKeys = new Set<string>();

  for (const comment of request.comments) {
    const normalizedText = comment.text.trim();
    const basicSkipReason = evaluateBasicSkipReason(normalizedText);
    if (basicSkipReason) {
      skippedComments.push({ commentId: comment.commentId, reason: basicSkipReason });
      continue;
    }

    if (hasUnsupportedLanguageHint(comment.platformLanguageHint)) {
      skippedComments.push({ commentId: comment.commentId, reason: "unselected-source-language" });
      continue;
    }

    const detectedLanguage = classifyCommentTranslatorDominantLanguage({
      text: normalizedText,
      platformLanguageHint: comment.platformLanguageHint ?? null
    });
    const dedupeKey = createCommentTranslatorLanguagePolicyDedupeKey({
      text: normalizedText,
      sourceLanguage: detectedLanguage.publicCode,
      targetLanguage: selection.targetLanguage.publicCode,
      policyVersion: request.policyVersion ?? defaultPolicyVersion
    });

    if (seenDedupeKeys.has(dedupeKey)) {
      skippedComments.push({ commentId: comment.commentId, reason: "duplicate" });
      continue;
    }
    seenDedupeKeys.add(dedupeKey);

    if (detectedLanguage.confidence < minimumLanguageConfidence) {
      skippedComments.push({ commentId: comment.commentId, reason: "low-confidence" });
      continue;
    }

    if (detectedLanguage.publicCode === selection.targetLanguage.publicCode) {
      skippedComments.push({ commentId: comment.commentId, reason: "target-language" });
      continue;
    }

    if (!selectedSourceCodes.has(detectedLanguage.publicCode)) {
      skippedComments.push({ commentId: comment.commentId, reason: "unselected-source-language" });
      continue;
    }

    acceptedComments.push({
      commentId: comment.commentId,
      dedupeKey,
      detectedLanguage,
      targetLanguage: selection.targetLanguage
    });
  }

  return {
    status: "ready",
    acceptedComments,
    skippedComments,
    sanitizedSummary: createSanitizedSummary(acceptedComments.length, skippedComments.length)
  };
}

export function classifyCommentTranslatorDominantLanguage({
  text,
  platformLanguageHint
}: {
  text: string;
  platformLanguageHint?: string | null;
}): CommentTranslatorLanguagePolicyDetectedLanguage {
  const hintedLanguage = normalizeClassifierHint(platformLanguageHint);
  if (hintedLanguage) {
    return {
      ...languageByPublicCode[hintedLanguage],
      confidence: 0.95,
      classification: "single"
    };
  }

  const scores = scoreLanguageUnits(text);
  const rankedScores = Object.entries(scores)
    .filter((entry): entry is [CommentTranslatorInitialSourceLanguage, number] => entry[1] > 0)
    .sort((left, right) => right[1] - left[1]);

  if (rankedScores.length === 0) {
    return {
      ...languageByPublicCode.EN,
      confidence: 0,
      classification: "single"
    };
  }

  const [publicCode, score] = rankedScores[0];
  const total = rankedScores.reduce((sum, [, value]) => sum + value, 0);

  return {
    ...languageByPublicCode[publicCode],
    confidence: total > 0 ? score / total : 0,
    classification: rankedScores.length > 1 ? "mixed-dominant" : "single"
  };
}

export function createCommentTranslatorLanguagePolicyDedupeKey({
  text,
  sourceLanguage,
  targetLanguage,
  policyVersion = defaultPolicyVersion
}: {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  policyVersion?: string;
}) {
  const normalizedTextHash = createStableTextHash(text);
  return [
    "comment-translator-language-policy",
    normalizedTextHash,
    normalizeDedupeLanguage(sourceLanguage),
    normalizeDedupeLanguage(targetLanguage),
    policyVersion
  ].join(":");
}

export function normalizeCommentTranslatorTextForPolicyDedupe(text: string): string {
  const normalizedText = text.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
  return stripTrailingDedupePunctuation(normalizedText);
}

function normalizeSourceLanguage(language: string):
  | {
      status: "ready";
      publicCode: CommentTranslatorInitialSourceLanguage;
    }
  | Extract<CommentTranslatorLanguagePolicySelectionResult, { status: "rejected" }> {
  const normalized = language.trim().toLocaleLowerCase();

  if (allLanguageAutoAliases.has(normalized)) {
    return {
      status: "rejected",
      reason: "all-language-auto-mode-excluded",
      clientReadableDetail: "all-language-auto-mode-not-initial-release"
    };
  }

  if (spanishLanguageAliases.has(normalized)) {
    return {
      status: "rejected",
      reason: "unsupported-source-language",
      clientReadableDetail: "source-language-not-initial-release"
    };
  }

  const publicCode = sourceAliasToPublicCode[normalized as keyof typeof sourceAliasToPublicCode];
  if (!publicCode) {
    return {
      status: "rejected",
      reason: "unsupported-source-language",
      clientReadableDetail: "source-language-not-initial-release"
    };
  }

  return {
    status: "ready",
    publicCode
  };
}

function normalizeTargetLanguage(language: string):
  | {
      status: "ready";
      targetLanguage: CommentTranslatorLanguagePolicyLanguage;
    }
  | Extract<CommentTranslatorLanguagePolicySelectionResult, { status: "rejected" }> {
  const normalized = language.trim().toLocaleLowerCase();
  const publicCode = targetAliasToPublicCode[normalized as keyof typeof targetAliasToPublicCode];
  if (!publicCode || spanishLanguageAliases.has(normalized) || allLanguageAutoAliases.has(normalized)) {
    return {
      status: "rejected",
      reason: "unsupported-target-language",
      clientReadableDetail: "target-language-not-initial-release"
    };
  }

  return {
    status: "ready",
    targetLanguage: languageByPublicCode[publicCode]
  };
}

function normalizeClassifierHint(platformLanguageHint?: string | null): CommentTranslatorInitialSourceLanguage | null {
  const normalized = platformLanguageHint?.trim().toLocaleLowerCase();
  if (!normalized || spanishLanguageAliases.has(normalized) || allLanguageAutoAliases.has(normalized)) {
    return null;
  }

  return sourceAliasToPublicCode[normalized as keyof typeof sourceAliasToPublicCode] ?? null;
}

function hasUnsupportedLanguageHint(platformLanguageHint?: string | null) {
  const normalized = platformLanguageHint?.trim().toLocaleLowerCase();
  return Boolean(normalized && spanishLanguageAliases.has(normalized));
}

function evaluateBasicSkipReason(text: string): CommentTranslatorLanguagePolicySkipReason | null {
  if (isUrlOnly(text)) {
    return "url-only";
  }

  if (isEmojiOnly(text)) {
    return "emoji-only";
  }

  if (isLowValueShortReaction(text)) {
    return "low-value-short-reaction";
  }

  if (isSymbolOnly(text)) {
    return "symbol-only";
  }

  if (hasMeaningfulShortCommentSignal(text)) {
    return null;
  }

  if (countSignalCharacters(text) < minimumSignalCharacters) {
    return "too-short";
  }

  return null;
}

function isUrlOnly(text: string) {
  const withoutUrls = text.replace(/https?:\/\/\S+|www\.\S+/gi, "").trim();
  return withoutUrls.length === 0 && /https?:\/\/|www\./i.test(text);
}

function isEmojiOnly(text: string) {
  const visibleCharacters = Array.from(text).filter((character) => character.trim() && character !== "\uFE0F");
  return visibleCharacters.length > 0 && visibleCharacters.every((character) => isEmojiLikeCodePoint(character.codePointAt(0) ?? 0));
}

function isSymbolOnly(text: string) {
  return text.length > 0 && !/[A-Za-z0-9\u3040-\u30FF\uFF66-\uFF9F\u4E00-\u9FFF\uAC00-\uD7AF]/.test(text);
}

function hasMeaningfulShortCommentSignal(text: string) {
  const normalizedText = text.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
  if (normalizedText.includes("?") || text.includes("？")) {
    return true;
  }

  if (meaningfulShortLatinWordPattern.test(normalizedText)) {
    return true;
  }

  const compactText = normalizedText.replace(/\s+/g, "");
  return meaningfulShortCjkMarkers.some((marker) => compactText.includes(marker));
}

function isLowValueShortReaction(text: string) {
  const normalizedText = normalizeCommentTranslatorTextForPolicyDedupe(text);
  if (lowValueShortReactionTexts.has(normalizedText)) {
    return true;
  }

  return /^(w|ㅋ|ㅎ|\u110F|\u1112|哈){2,}$/.test(normalizedText);
}

function stripTrailingDedupePunctuation(text: string) {
  return text.replace(/[\s.!?,;:~\u3001\u3002\u30FB\u2026\uFF0C\uFF1A\uFF1B\uFF5E]+$/g, "").trim();
}

function countSignalCharacters(text: string) {
  return Array.from(text).filter((character) =>
    /[A-Za-z0-9\u3040-\u30FF\uFF66-\uFF9F\u4E00-\u9FFF\uAC00-\uD7AF]/.test(character)
  ).length;
}

function scoreLanguageUnits(text: string): Record<CommentTranslatorInitialSourceLanguage, number> {
  const latinWords = text.match(/\b[A-Za-z]+\b/g) ?? [];
  const hangulRuns = text.match(/[\uAC00-\uD7AF]+/g) ?? [];
  const kanaRuns = text.match(/[\u3040-\u30FF\uFF66-\uFF9F]+/g) ?? [];
  const hanRuns = text.match(/[\u4E00-\u9FFF]+/g) ?? [];

  return {
    JA: kanaRuns.length + (kanaRuns.length > 0 ? hanRuns.length : 0),
    EN: latinWords.length,
    KR: hangulRuns.length,
    CN: kanaRuns.length > 0 ? 0 : hanRuns.length
  };
}

function isEmojiLikeCodePoint(codePoint: number) {
  return (
    (codePoint >= 0x1f000 && codePoint <= 0x1faff) ||
    (codePoint >= 0x2600 && codePoint <= 0x27bf) ||
    codePoint === 0x200d
  );
}

function normalizeDedupeLanguage(language: string) {
  const normalized = language.trim().toLocaleUpperCase();
  if (normalized === "KO") {
    return "KR";
  }
  if (normalized === "ZH") {
    return "CN";
  }
  return normalized;
}

function createStableTextHash(text: string): string {
  const normalizedText = normalizeCommentTranslatorTextForPolicyDedupe(text);
  let hash = 0x811c9dc5;
  for (let index = 0; index < normalizedText.length; index += 1) {
    hash ^= normalizedText.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function createSanitizedSummary(
  acceptedCommentCount: number,
  skippedCommentCount: number
): CommentTranslatorLanguagePolicySanitizedSummary {
  return {
    acceptedCommentCount,
    skippedCommentCount,
    rawCommentText: "never-returned-by-design",
    providerTargetMetadata: "forbidden"
  };
}
