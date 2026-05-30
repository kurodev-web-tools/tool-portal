export type CommentTranslationStatus = "translated" | "skipped" | "error";
export type CommentCacheStatus = "hit" | "miss" | "none";
export type CommentTranslatorConnectionStateId = "connected" | "syncing" | "offline";
export type CommentTranslatorDockStatus = "ready" | "standby" | "blocked";
export type CommentTranslatorSourceLanguageId = "auto" | "en" | "es" | "ko" | "ja";
export type CommentTranslatorTargetLanguageId = "ja" | "en" | "ko" | "es";
export type CommentTranslatorDisplayMode = "both" | "original" | "translated";
export type CommentTranslatorSurfaceMode = "obs-browser-dock" | "narrow-viewport";
export type CommentTranslatorStatusFilter = "all" | "translated" | "skipped" | "error";
export type CommentTranslatorQuotaScenarioId = "normal" | "warning" | "empty" | "error";

export type CommentTranslatorPlatform = {
  id: "youtube";
  name: "YouTube";
  mode: "read-only-dock";
  statusLabel: string;
  channelName: string;
  streamTitle: string;
};

export type CommentTranslatorSettings = {
  sourceLanguage: CommentTranslatorSourceLanguageId;
  targetLanguage: CommentTranslatorTargetLanguageId;
  targetLanguageLabel: string;
  displayMode: CommentTranslatorDisplayMode;
  surfaceMode: CommentTranslatorSurfaceMode;
};

export type CommentTranslatorQuotaPreview = {
  id: CommentTranslatorQuotaScenarioId;
  label: string;
  tone: "normal" | "warning" | "empty" | "error";
  usedUnits: number;
  limitUnits: number;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
  translatedCount: number;
  skippedCount: number;
  errorCount: number;
  statusLabel: string;
  helper: string;
};

export type CommentTranslatorSkipReason = {
  id: string;
  label: string;
  count: number;
};

export type CommentTranslatorComment = {
  id: string;
  timestamp: string;
  authorName: string;
  sourceLanguage: string;
  targetLanguage: string;
  originalText: string;
  translatedText?: string;
  status: CommentTranslationStatus;
  cacheStatus: CommentCacheStatus;
  skipReason?: string;
  errorMessage?: string;
  badge?: string;
  unitCost: number;
};

export type CommentTranslatorConnectionState = {
  id: CommentTranslatorConnectionStateId;
  platformId: "youtube";
  label: string;
  statusLabel: string;
  dockStatus: CommentTranslatorDockStatus;
  dockStatusLabel: string;
  channelName: string;
  helper: string;
};

export type CommentTranslatorStreamOption = {
  id: string;
  title: string;
  channelName: string;
  scheduledLabel: string;
  dockStatus: CommentTranslatorDockStatus;
  dockStatusLabel: string;
  viewerMode: "broadcaster-read-only";
};

export type CommentTranslatorLanguageOption<TId extends string> = {
  id: TId;
  label: string;
  shortLabel: string;
};

export type CommentTranslatorControlOption<TId extends string> = {
  id: TId;
  label: string;
  helper: string;
};

export const commentTranslatorConnectionStates: CommentTranslatorConnectionState[] = [
  {
    id: "connected",
    platformId: "youtube",
    label: "Connected mock",
    statusLabel: "Live mock",
    dockStatus: "ready",
    dockStatusLabel: "Broadcaster dock ready",
    channelName: "Kuro Channel",
    helper: "Fixture feed is active"
  },
  {
    id: "syncing",
    platformId: "youtube",
    label: "Syncing fixture",
    statusLabel: "Syncing",
    dockStatus: "standby",
    dockStatusLabel: "Dock waiting",
    channelName: "Kuro Channel",
    helper: "Stream metadata is refreshing"
  },
  {
    id: "offline",
    platformId: "youtube",
    label: "Disconnected fixture",
    statusLabel: "Offline mock",
    dockStatus: "blocked",
    dockStatusLabel: "Dock paused",
    channelName: "Kuro Channel",
    helper: "No live fixture is selected"
  }
];

export const commentTranslatorStreamOptions: CommentTranslatorStreamOption[] = [
  {
    id: "saturday-setup",
    title: "Saturday stream setup",
    channelName: "Kuro Channel",
    scheduledLabel: "Live now",
    dockStatus: "ready",
    dockStatusLabel: "Ready",
    viewerMode: "broadcaster-read-only"
  },
  {
    id: "karaoke-preview",
    title: "Karaoke practice preview",
    channelName: "Kuro Channel",
    scheduledLabel: "Starts in 20 min",
    dockStatus: "standby",
    dockStatusLabel: "Standby",
    viewerMode: "broadcaster-read-only"
  },
  {
    id: "archive-check",
    title: "Archive chat review",
    channelName: "Kuro Channel",
    scheduledLabel: "Ended fixture",
    dockStatus: "blocked",
    dockStatusLabel: "Read review only",
    viewerMode: "broadcaster-read-only"
  }
];

export const commentTranslatorSourceLanguageOptions: CommentTranslatorLanguageOption<CommentTranslatorSourceLanguageId>[] = [
  { id: "auto", label: "Auto detect", shortLabel: "AUTO" },
  { id: "en", label: "English", shortLabel: "EN" },
  { id: "es", label: "Spanish", shortLabel: "ES" },
  { id: "ko", label: "Korean", shortLabel: "KO" },
  { id: "ja", label: "Japanese", shortLabel: "JA" }
];

export const commentTranslatorTargetLanguageOptions: CommentTranslatorLanguageOption<CommentTranslatorTargetLanguageId>[] = [
  { id: "ja", label: "Japanese", shortLabel: "JA" },
  { id: "en", label: "English", shortLabel: "EN" },
  { id: "ko", label: "Korean", shortLabel: "KO" },
  { id: "es", label: "Spanish", shortLabel: "ES" }
];

export const commentTranslatorDisplayModeOptions: CommentTranslatorControlOption<CommentTranslatorDisplayMode>[] = [
  { id: "both", label: "Both", helper: "Original and translated" },
  { id: "original", label: "Original", helper: "Source comments only" },
  { id: "translated", label: "Translated", helper: "Translated rows first" }
];

export const commentTranslatorSurfaceOptions: CommentTranslatorControlOption<CommentTranslatorSurfaceMode>[] = [
  { id: "obs-browser-dock", label: "OBS Browser Dock", helper: "Dense broadcaster view" },
  { id: "narrow-viewport", label: "Narrow Viewport", helper: "Single-column review" }
];

export const commentTranslatorStatusFilters: CommentTranslatorControlOption<CommentTranslatorStatusFilter>[] = [
  { id: "all", label: "All", helper: "Every fixture row" },
  { id: "translated", label: "Translated", helper: "Completed rows" },
  { id: "skipped", label: "Skipped", helper: "Skipped states" },
  { id: "error", label: "Error", helper: "Recoverable failures" }
];

export const commentTranslatorPlatform: CommentTranslatorPlatform = {
  id: "youtube",
  name: "YouTube",
  mode: "read-only-dock",
  statusLabel: "Connected mock",
  channelName: "Kuro Channel",
  streamTitle: "Saturday stream setup"
};

export const commentTranslatorSettings: CommentTranslatorSettings = {
  sourceLanguage: "auto",
  targetLanguage: "ja",
  targetLanguageLabel: "日本語",
  displayMode: "both",
  surfaceMode: "obs-browser-dock"
};

export const commentTranslatorQuotaScenarios: CommentTranslatorQuotaPreview[] = [
  {
    id: "normal",
    label: "Normal cache mix",
    tone: "normal",
    usedUnits: 1240,
    limitUnits: 2000,
    cacheHits: 218,
    cacheMisses: 61,
    cacheHitRate: 78,
    translatedCount: 11,
    skippedCount: 3,
    errorCount: 1,
    statusLabel: "Healthy",
    helper: "Hit and miss rows are visible in the fixture feed"
  },
  {
    id: "warning",
    label: "Quota warning",
    tone: "warning",
    usedUnits: 1840,
    limitUnits: 2000,
    cacheHits: 232,
    cacheMisses: 102,
    cacheHitRate: 69,
    translatedCount: 16,
    skippedCount: 4,
    errorCount: 1,
    statusLabel: "Warning",
    helper: "Usage is close to the preview limit"
  },
  {
    id: "empty",
    label: "Empty session",
    tone: "empty",
    usedUnits: 0,
    limitUnits: 2000,
    cacheHits: 0,
    cacheMisses: 0,
    cacheHitRate: 0,
    translatedCount: 0,
    skippedCount: 0,
    errorCount: 0,
    statusLabel: "No rows",
    helper: "No comments have reached the fixture cache"
  },
  {
    id: "error",
    label: "Cache unavailable",
    tone: "error",
    usedUnits: 1240,
    limitUnits: 2000,
    cacheHits: 218,
    cacheMisses: 61,
    cacheHitRate: 78,
    translatedCount: 11,
    skippedCount: 3,
    errorCount: 2,
    statusLabel: "Cache warning",
    helper: "Preview keeps reading fixtures while cache stats are unavailable"
  }
];

export const commentTranslatorQuotaPreview = commentTranslatorQuotaScenarios[0];

export const commentTranslatorSkipReasons: CommentTranslatorSkipReason[] = [
  { id: "same-language", label: "Same language", count: 2 },
  { id: "too-short", label: "Too short", count: 1 },
  { id: "spam-filter", label: "Spam filter", count: 1 }
];

export const commentTranslatorComments: CommentTranslatorComment[] = [
  {
    id: "c-001",
    timestamp: "12:34:50",
    authorName: "StreamLover88",
    sourceLanguage: "EN",
    targetLanguage: "JA",
    originalText: "This stream is awesome!",
    translatedText: "この配信、最高です！",
    status: "translated",
    cacheStatus: "hit",
    badge: "first chat",
    unitCost: 1
  },
  {
    id: "c-002",
    timestamp: "12:35:02",
    authorName: "KuroFan",
    sourceLanguage: "EN",
    targetLanguage: "JA",
    originalText: "Love your content! Keep it up!",
    translatedText: "いつも楽しい配信をありがとう！応援しています！",
    status: "translated",
    cacheStatus: "miss",
    badge: "support",
    unitCost: 1
  },
  {
    id: "c-003",
    timestamp: "12:35:07",
    authorName: "Mika",
    sourceLanguage: "JA",
    targetLanguage: "JA",
    originalText: "がんばってください！",
    status: "skipped",
    cacheStatus: "none",
    skipReason: "Same language",
    unitCost: 0
  },
  {
    id: "c-004",
    timestamp: "12:35:12",
    authorName: "Mariposa_88",
    sourceLanguage: "ES",
    targetLanguage: "JA",
    originalText: "Saludos desde Espana! Me encanta tu directo!",
    translatedText: "スペインからこんにちは！あなたの配信が大好きです！",
    status: "translated",
    cacheStatus: "hit",
    unitCost: 1
  },
  {
    id: "c-005",
    timestamp: "12:35:18",
    authorName: "KimchiLover",
    sourceLanguage: "KO",
    targetLanguage: "JA",
    originalText: "오늘 방송도 너무 재밌어요!",
    translatedText: "今日の配信もとても面白いです！",
    status: "translated",
    cacheStatus: "hit",
    unitCost: 1
  },
  {
    id: "c-006",
    timestamp: "12:35:21",
    authorName: "user_zzzz",
    sourceLanguage: "EN",
    targetLanguage: "JA",
    originalText: "hi",
    status: "skipped",
    cacheStatus: "none",
    skipReason: "Too short",
    unitCost: 0
  },
  {
    id: "c-007",
    timestamp: "12:35:24",
    authorName: "Xx_SPAM_xX",
    sourceLanguage: "EN",
    targetLanguage: "JA",
    originalText: "Check out my channel!!! sub 4 sub!!!",
    status: "skipped",
    cacheStatus: "none",
    skipReason: "Spam filter",
    unitCost: 0
  },
  {
    id: "c-008",
    timestamp: "12:35:27",
    authorName: "StreamRookie",
    sourceLanguage: "EN",
    targetLanguage: "JA",
    originalText: "Why is the boss so strong?!",
    status: "error",
    cacheStatus: "none",
    errorMessage: "Translation failed in mock state",
    unitCost: 0
  }
];

export function findCommentTranslatorOption<TOption extends { id: string }>(
  options: TOption[],
  id: string,
  fallback = options[0]
) {
  return options.find((option) => option.id === id) ?? fallback;
}

export function filterCommentTranslatorComments(
  comments: CommentTranslatorComment[],
  {
    statusFilter,
    searchQuery
  }: {
    statusFilter: CommentTranslatorStatusFilter;
    searchQuery: string;
  }
) {
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();

  return comments.filter((comment) => {
    const statusMatches = statusFilter === "all" || comment.status === statusFilter;
    if (!statusMatches) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [
      comment.authorName,
      comment.sourceLanguage,
      comment.targetLanguage,
      comment.originalText,
      comment.translatedText ?? "",
      comment.skipReason ?? "",
      comment.errorMessage ?? ""
    ]
      .join(" ")
      .toLocaleLowerCase()
      .includes(normalizedQuery);
  });
}

export class MockTranslationProvider {
  readonly name = "MockTranslationProvider";

  getSnapshot() {
    return {
      platform: commentTranslatorPlatform,
      settings: commentTranslatorSettings,
      quota: commentTranslatorQuotaPreview,
      connectionStates: commentTranslatorConnectionStates,
      streams: commentTranslatorStreamOptions,
      sourceLanguages: commentTranslatorSourceLanguageOptions,
      targetLanguages: commentTranslatorTargetLanguageOptions,
      displayModes: commentTranslatorDisplayModeOptions,
      surfaceOptions: commentTranslatorSurfaceOptions,
      statusFilters: commentTranslatorStatusFilters,
      quotaScenarios: commentTranslatorQuotaScenarios,
      skipReasons: commentTranslatorSkipReasons,
      comments: commentTranslatorComments
    };
  }
}

export const mockTranslationProvider = new MockTranslationProvider();
