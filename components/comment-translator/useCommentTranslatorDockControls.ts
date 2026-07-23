"use client";

import { useState } from "react";
import {
  commentTranslatorUiCopy,
  findCommentTranslatorOption,
  mockTranslationProvider,
  type CommentTranslatorDisplayMode,
  type CommentTranslatorSourceLanguageId,
  type CommentTranslatorStatusFilter,
  type CommentTranslatorSurfaceMode,
  type CommentTranslatorTargetLanguageId
} from "@/lib/comment-translator";
import { resolveCommentTranslatorAuthorDisplayNamePolicy } from "@/lib/comment-translator-real-comments-feed-shared";
import type { CommentTranslatorPriorityFilter } from "@/lib/comment-translator-priority-classification";

export function useCommentTranslatorDockControls(locale: "ja" | "en") {
  const snapshot = mockTranslationProvider.getSnapshot();
  const copy = commentTranslatorUiCopy[locale];
  const [sourceLanguage, setSourceLanguage] = useState<CommentTranslatorSourceLanguageId>(snapshot.settings.sourceLanguage);
  const [targetLanguage, setTargetLanguage] = useState<CommentTranslatorTargetLanguageId>(snapshot.settings.targetLanguage);
  const [displayMode, setDisplayMode] = useState<CommentTranslatorDisplayMode>(snapshot.settings.displayMode);
  const [surfaceMode, setSurfaceMode] = useState<CommentTranslatorSurfaceMode>(snapshot.settings.surfaceMode);
  const [showStreamSafeAuthorDisplayNames, setShowStreamSafeAuthorDisplayNames] = useState(false);
  const [statusFilter, setStatusFilter] = useState<CommentTranslatorStatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<CommentTranslatorPriorityFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"normal" | "comments">("normal");
  const selectedConnection = findCommentTranslatorOption(snapshot.connectionStates, "connected");
  const selectedStream = findCommentTranslatorOption(snapshot.streams, snapshot.streams[0].id);
  const selectedSourceLanguage = findCommentTranslatorOption(snapshot.sourceLanguages, sourceLanguage);
  const selectedTargetLanguage = findCommentTranslatorOption(snapshot.targetLanguages, targetLanguage);
  const selectedSurface = findCommentTranslatorOption(snapshot.surfaceOptions, surfaceMode);
  const localizedConnection = { ...selectedConnection, label: copy.connections[selectedConnection.id], statusLabel: copy.connectionStatus[selectedConnection.id], dockStatusLabel: copy.connectionDockStatus[selectedConnection.id] };
  const localizedStream = { ...selectedStream, title: copy.streams[selectedStream.id].label, scheduledLabel: copy.streams[selectedStream.id].helper, dockStatusLabel: copy.dockStatus[selectedStream.dockStatus] };
  const localizedSourceLanguage = { ...selectedSourceLanguage, label: copy.languages[selectedSourceLanguage.id] };
  const localizedTargetLanguage = { ...selectedTargetLanguage, label: copy.languages[selectedTargetLanguage.id] };
  const localizedSurface = { ...selectedSurface, label: copy.surfaces[selectedSurface.id].label, helper: copy.surfaces[selectedSurface.id].helper };
  const sourceLanguageOptions = snapshot.sourceLanguages.map((language) => ({ id: language.id, label: copy.languages[language.id], shortLabel: language.shortLabel }));
  const targetLanguageOptions = snapshot.targetLanguages.map((language) => ({ id: language.id, label: copy.languages[language.id], shortLabel: language.shortLabel }));
  const displayModeOptions = snapshot.displayModes.map((mode) => ({ id: mode.id, label: copy.displayModes[mode.id].label, helper: copy.displayModes[mode.id].helper }));
  const surfaceModeOptions = snapshot.surfaceOptions.map((surface) => ({ id: surface.id, label: copy.surfaces[surface.id].label, helper: copy.surfaces[surface.id].helper }));
  const authorDisplayNamePolicy = resolveCommentTranslatorAuthorDisplayNamePolicy({ surfaceMode, viewMode, showSafeAuthorDisplayNamesInStreamSafeMode: showStreamSafeAuthorDisplayNames });
  return {
    ...snapshot,
    copy,
    sourceLanguage, setSourceLanguage,
    targetLanguage, setTargetLanguage,
    displayMode, setDisplayMode,
    surfaceMode, setSurfaceMode,
    showStreamSafeAuthorDisplayNames, setShowStreamSafeAuthorDisplayNames,
    statusFilter, setStatusFilter,
    priorityFilter, setPriorityFilter,
    searchQuery, setSearchQuery,
    viewMode, setViewMode,
    localizedConnection, localizedStream, localizedSourceLanguage, localizedTargetLanguage, localizedSurface,
    sourceLanguageOptions, targetLanguageOptions, displayModeOptions, surfaceModeOptions,
    authorDisplayNamePolicy
  };
}
