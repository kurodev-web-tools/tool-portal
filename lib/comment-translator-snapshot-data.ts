import type {
  CommentTranslatorConnectionState,
  CommentTranslatorControlOption,
  CommentTranslatorDisplayMode,
  CommentTranslatorLanguageOption,
  CommentTranslatorManualSample,
  CommentTranslatorOperatorFlowStep,
  CommentTranslatorPlatform,
  CommentTranslatorQuotaPreview,
  CommentTranslatorSettings,
  CommentTranslatorSkipReason,
  CommentTranslatorSourceLanguageId,
  CommentTranslatorStatusFilter,
  CommentTranslatorStreamOption,
  CommentTranslatorSurfaceMode,
  CommentTranslatorTargetLanguageId
} from "./comment-translator-types";

export const commentTranslatorConnectionStates: CommentTranslatorConnectionState[] = [
  {
    id: "connected",
    platformId: "youtube",
    label: "Connection checked",
    statusLabel: "Before start",
    dockStatus: "ready",
    dockStatusLabel: "Reads only after Start",
    channelName: "Server-only target",
    helper: "Ready state only"
  },
  {
    id: "syncing",
    platformId: "youtube",
    label: "Checking connection",
    statusLabel: "Syncing",
    dockStatus: "standby",
    dockStatusLabel: "Connection alone does not monitor",
    channelName: "Server-only target",
    helper: "Target metadata stays server-only"
  },
  {
    id: "offline",
    platformId: "youtube",
    label: "Disconnected",
    statusLabel: "Offline",
    dockStatus: "blocked",
    dockStatusLabel: "Dock paused",
    channelName: "Server-only target",
    helper: "No provider or AI usage starts"
  }
];
export const commentTranslatorStreamOptions: CommentTranslatorStreamOption[] = [
  {
    id: "saturday-setup",
    title: "Start target stream",
    channelName: "Server-only target",
    scheduledLabel: "Ready state only",
    dockStatus: "ready",
    dockStatusLabel: "Ready",
    viewerMode: "broadcaster-read-only"
  },
  {
    id: "karaoke-preview",
    title: "Pre-start stream",
    channelName: "Server-only target",
    scheduledLabel: "Standby state only",
    dockStatus: "standby",
    dockStatusLabel: "Standby",
    viewerMode: "broadcaster-read-only"
  },
  {
    id: "archive-check",
    title: "Ended stream",
    channelName: "Server-only target",
    scheduledLabel: "Target values are not shown",
    dockStatus: "blocked",
    dockStatusLabel: "Read review only",
    viewerMode: "broadcaster-read-only"
  }
];

export const commentTranslatorSourceLanguageOptions: CommentTranslatorLanguageOption<CommentTranslatorSourceLanguageId>[] = [
  { id: "en", label: "English", shortLabel: "EN" },
  { id: "ko", label: "Korean", shortLabel: "KO" },
  { id: "zh", label: "Chinese", shortLabel: "CN" },
  { id: "ja", label: "Japanese", shortLabel: "JA" }
];

export const commentTranslatorTargetLanguageOptions: CommentTranslatorLanguageOption<CommentTranslatorTargetLanguageId>[] = [
  { id: "ja", label: "Japanese", shortLabel: "JA" },
  { id: "en", label: "English", shortLabel: "EN" }
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
  { id: "all", label: "All", helper: "Every preview row" },
  { id: "translated", label: "Translated", helper: "Completed rows" },
  { id: "error", label: "Error", helper: "Recoverable failures" }
];

export const commentTranslatorPlatform: CommentTranslatorPlatform = {
  id: "youtube",
  name: "YouTube",
  mode: "read-only-dock",
  statusLabel: "Before start",
  channelName: "Server-only target",
  streamTitle: "Start target stream"
};

export const commentTranslatorSettings: CommentTranslatorSettings = {
  sourceLanguage: "en",
  targetLanguage: "ja",
  targetLanguageLabel: "日本語",
  displayMode: "both",
  surfaceMode: "obs-browser-dock"
};

export const commentTranslatorQuotaScenarios: CommentTranslatorQuotaPreview[] = [
  {
    id: "normal",
    label: "Free limit preview",
    tone: "normal",
    usedUnits: 12,
    limitUnits: 30,
    cacheHits: 218,
    cacheMisses: 61,
    cacheHitRate: 78,
    translatedCount: 11,
    skippedCount: 3,
    errorCount: 1,
    statusLabel: "Healthy",
    helper: "Shows the initial Free limit preview"
  },
  {
    id: "warning",
    label: "Near limit",
    tone: "warning",
    usedUnits: 27,
    limitUnits: 30,
    cacheHits: 232,
    cacheMisses: 102,
    cacheHitRate: 69,
    translatedCount: 16,
    skippedCount: 4,
    errorCount: 1,
    statusLabel: "Warning",
    helper: "Usage is close to the Free or shared service budget limit"
  },
  {
    id: "empty",
    label: "Before start",
    tone: "empty",
    usedUnits: 0,
    limitUnits: 30,
    cacheHits: 0,
    cacheMisses: 0,
    cacheHitRate: 0,
    translatedCount: 0,
    skippedCount: 0,
    errorCount: 0,
    statusLabel: "No rows",
    helper: "No provider or AI usage starts before an explicit Start"
  },
  {
    id: "error",
    label: "Diagnostic limited",
    tone: "error",
    usedUnits: 12,
    limitUnits: 30,
    cacheHits: 218,
    cacheMisses: 61,
    cacheHitRate: 78,
    translatedCount: 11,
    skippedCount: 3,
    errorCount: 2,
    statusLabel: "Cache warning",
    helper: "Diagnostics stay short-lived and sanitized"
  }
];

export const commentTranslatorQuotaPreview = commentTranslatorQuotaScenarios[0];

export const commentTranslatorSkipReasons: CommentTranslatorSkipReason[] = [
  { id: "same-language", label: "Same language", count: 2 },
  { id: "too-short", label: "Too short", count: 1 },
  { id: "spam-filter", label: "Spam filter", count: 1 }
];

export const commentTranslatorManualSamples: CommentTranslatorManualSample[] = [
  { id: "sample-hello", text: "Hello from the manual preview!" },
  { id: "sample-zh", text: "今天的直播很开心!" },
  { id: "sample-ja", text: "日本語コメントはスキップ確認にも使えます" }
];

export const commentTranslatorOperatorFlowSteps: CommentTranslatorOperatorFlowStep[] = [
  { id: "credential-status", source: "ui-local-status-only" },
  { id: "target-readiness", source: "ui-local-status-only" },
  { id: "intake-bridge", source: "ui-local-status-only" },
  { id: "explicit-approval", source: "ui-local-status-only" }
];
