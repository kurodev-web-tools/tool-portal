import type { CommentTranslatorPriorityCategory } from "./comment-translator-priority-classification";

export type CommentTranslationStatus = "translated" | "skipped" | "error";
export type CommentCacheStatus = "hit" | "miss" | "none";
export type CommentTranslatorConnectionStateId = "connected" | "syncing" | "offline";
export type CommentTranslatorDockStatus = "ready" | "standby" | "blocked";
export type CommentTranslatorSourceLanguageId = "en" | "ko" | "zh" | "ja";
export type CommentTranslatorTargetLanguageId = "ja" | "en";
export type CommentTranslatorDisplayMode = "both" | "original" | "translated";
export type CommentTranslatorSurfaceMode = "obs-browser-dock" | "narrow-viewport";
export type CommentTranslatorStatusFilter = "all" | "translated" | "skipped" | "error";
export type CommentTranslatorQuotaScenarioId = "normal" | "warning" | "empty" | "error";
export type CommentTranslatorStreamId = "saturday-setup" | "karaoke-preview" | "archive-check";
export type CommentTranslatorCommentSource = "fixture" | "manual" | "server";
export type CommentTranslatorManualResultMode = "translated" | "skipped" | "error";
export type CommentTranslatorOperatorFlowStepId =
  | "credential-status"
  | "target-readiness"
  | "intake-bridge"
  | "explicit-approval";

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
  source?: CommentTranslatorCommentSource;
  sourceLabel?: string;
  sourceLanguage: string;
  targetLanguage: string;
  originalText: string;
  translatedText?: string;
  status: CommentTranslationStatus;
  cacheStatus: CommentCacheStatus;
  skipReason?: string;
  errorMessage?: string;
  badge?: string;
  priorityCategory?: CommentTranslatorPriorityCategory;
  unitCost: number;
};

export type CommentTranslatorManualSample = {
  id: string;
  text: string;
};

export type CommentTranslatorOperatorFlowStep = {
  id: CommentTranslatorOperatorFlowStepId;
  source: "ui-local-status-only";
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
  id: CommentTranslatorStreamId;
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
