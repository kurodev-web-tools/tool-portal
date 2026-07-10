"use client";

import { CommentTranslatorDockHeader } from "./CommentTranslatorDockHeader";
import { CommentTranslatorFeedPanel } from "./CommentTranslatorFeedPanel";
import { CommentTranslatorSessionPanel } from "./CommentTranslatorSessionPanel";
import { CommentTranslatorSettingsPanel } from "./CommentTranslatorSettingsPanel";
import { CommentTranslatorUsageSidebar } from "./CommentTranslatorUsageSidebar";
import { useLocale } from "@/components/portal/LocaleProvider";
import { filterCommentTranslatorComments } from "@/lib/comment-translator";
import {
  mapCommentTranslatorRealCommentsFeedRowsToUiComments,
  type CommentTranslatorRealCommentsFeedState
} from "@/lib/comment-translator-real-comments-feed-shared";
import type { CommentTranslatorToolCredentialStatusSource } from "@/lib/comment-translator-youtube-tool-credential-source";
import { initialOperatorSessionState, initialOperatorSessionUsageDisplay, type CommentTranslatorDockInitialSessionState } from "./comment-translator-dock-model";
import { useCommentTranslatorBrowserTimeZone } from "./useCommentTranslatorBrowserTimeZone";
import { useCommentTranslatorCreatorWaitlist } from "./useCommentTranslatorCreatorWaitlist";
import { useCommentTranslatorDockControls } from "./useCommentTranslatorDockControls";
import { useCommentTranslatorSessionFeedController } from "./useCommentTranslatorSessionFeedController";

export type { CommentTranslatorDockInitialSessionState } from "./comment-translator-dock-model";

export function CommentTranslatorDock({
  youtubeCredentialStatusSource,
  initialRealCommentsFeed,
  initialSessionState,
  runtimeMode = "live"
}: {
  youtubeCredentialStatusSource: CommentTranslatorToolCredentialStatusSource;
  initialRealCommentsFeed: CommentTranslatorRealCommentsFeedState;
  initialSessionState?: CommentTranslatorDockInitialSessionState;
  runtimeMode?: "live" | "dev-fixture";
}) {
  const { locale } = useLocale();
  const {
    platform,
    sourceLanguages,
    targetLanguages,
    displayModes,
    surfaceOptions,
    statusFilters,
    copy,
    sourceLanguage, setSourceLanguage,
    targetLanguage, setTargetLanguage,
    displayMode, setDisplayMode,
    surfaceMode, setSurfaceMode,
    showStreamSafeAuthorDisplayNames, setShowStreamSafeAuthorDisplayNames,
    statusFilter, setStatusFilter,
    searchQuery, setSearchQuery,
    viewMode, setViewMode,
    localizedConnection,
    localizedStream,
    localizedSourceLanguage,
    localizedTargetLanguage,
    localizedSurface,
    sourceLanguageOptions,
    targetLanguageOptions,
    displayModeOptions,
    surfaceModeOptions,
    authorDisplayNamePolicy
  } = useCommentTranslatorDockControls(locale);
  const {
    sessionState,
    realCommentsFeed,
    realCommentsFeedError,
    isSessionPending,
    isRealCommentsFeedPending,
    runSessionCommand,
    refreshSessionState,
    refreshRealCommentsFeed,
    clearRetainedPreviewFeed
  } = useCommentTranslatorSessionFeedController({
    sourceLanguage,
    targetLanguage,
    locale,
    actionFailedCopy: copy.operatorSession.actionFailed,
    initialSessionState: initialSessionState ?? initialOperatorSessionState,
    initialRealCommentsFeed,
    runtimeMode
  });
  const browserTimeZone = useCommentTranslatorBrowserTimeZone(runtimeMode);
  const {
    state: creatorWaitlistState,
    isPending: isCreatorWaitlistPending,
    refresh: refreshCreatorWaitlist,
    register: registerCreatorWaitlist
  } = useCommentTranslatorCreatorWaitlist(runtimeMode);

  const feedComments = mapCommentTranslatorRealCommentsFeedRowsToUiComments({
    feed: realCommentsFeed,
    targetLanguageLabel: localizedTargetLanguage.label,
    locale,
    timeZone: browserTimeZone,
    authorDisplayNamePolicy
  });
  const commentOnly = viewMode === "comments";
  const publicFeedComments = feedComments.filter((comment) => comment.status !== "skipped");
  const filteredComments = filterCommentTranslatorComments(publicFeedComments, { statusFilter, searchQuery });
  const liveStats = {
    translated: publicFeedComments.filter((comment) => comment.status === "translated").length,
    errors: publicFeedComments.filter((comment) => comment.status === "error").length
  };
  const shellIsNarrow = surfaceMode === "narrow-viewport";
  const dockStatusLabel = localizedConnection.dockStatus === "blocked" ? localizedConnection.dockStatusLabel : localizedStream.dockStatusLabel;
  const credentialStatusMetadata = youtubeCredentialStatusSource.statusMetadata;
  const credentialStatusState = credentialStatusMetadata.status;
  const credentialStatusLabel = copy.credentialStatus.states[credentialStatusState];
  const operatorFlowCredentialReady = credentialStatusState === "available";
  const operatorFlowTargetReady = localizedStream.dockStatus === "ready" && localizedConnection.dockStatus !== "blocked";
  const operatorFlowStatus = operatorFlowCredentialReady ? (operatorFlowTargetReady ? "ready" : "standby") : "blocked";
  const sessionStopReason = sessionState.stopReason ? copy.operatorSession.stopReasons[sessionState.stopReason] : "-";
  const sessionReasonUx = sessionState.reasonUx;
  const usageDisplay = sessionState.usageDisplay ?? initialOperatorSessionUsageDisplay;
  const usagePolicyStopReason = usageDisplay.providerCallPolicy.stopReason
    ? copy.operatorSession.stopReasons[usageDisplay.providerCallPolicy.stopReason]
    : null;
  const usagePolicyLabel =
    usageDisplay.providerCallPolicy.status === "allowed"
      ? copy.operatorSession.usageProviderAllowed
      : usageDisplay.providerCallPolicy.status === "blocked-over-limit"
        ? copy.operatorSession.usageProviderBlockedOverLimit
        : copy.operatorSession.usageProviderUnavailable;
  const sessionReasonGroup = sessionReasonUx ? copy.operatorSession.reasonGroups[sessionReasonUx.group] : null;
  const sessionReasonMessage = sessionReasonUx
    ? copy.operatorSession.reasonMessages[sessionReasonUx.code]
    : sessionStopReason;
  const sessionRecommendedAction = sessionReasonUx
    ? copy.operatorSession.recommendedActions[sessionReasonUx.recommendedAction]
    : null;
  const sessionNextAction = copy.operatorSession.nextActions[sessionState.nextAction];
  const realCommentsFeedUnavailableMessage = realCommentsFeed.unavailableReason
    ? `unavailableReason: ${realCommentsFeed.unavailableReason}`
    : null;
  const hasRetainedStoppedPreviewRows = sessionState.status === "stopped" && feedComments.length > 0;
  const startBlockedByRateLimit = sessionState.rateLimit === "exceeded";
  const showReconnectGuidance =
    credentialStatusState !== "available" ||
    sessionState.nextAction === "reconnect-or-sign-in" ||
    sessionState.stopReason === "auth-failed" ||
    sessionState.stopReason === "token-refresh-failed" ||
    sessionState.stopReason === "reconnect-required";
  const startBlockedByCredentialStatus = credentialStatusState !== "available";
  const startBlockedByUsagePolicy = !startBlockedByRateLimit && usageDisplay.providerCallPolicy.status !== "allowed";


  return (
    <div className="h-full min-h-0 overflow-auto bg-background px-3 py-3 sm:px-4 lg:px-5">
      <div className={["mx-auto grid min-h-full w-full gap-3", shellIsNarrow ? "max-w-[42rem]" : "max-w-none"].join(" ")}>
        {!commentOnly ? (
          <CommentTranslatorDockHeader
            locale={locale}
            platformName={platform.name}
            surfaceLabel={localizedSurface.label}
            credentialStatusLabel={credentialStatusLabel}
            credentialStatusState={credentialStatusState}
            connectionStatusLabel={localizedConnection.statusLabel}
            streamTitle={localizedStream.title}
            streamDockStatus={localizedStream.dockStatus}
            dockStatusLabel={dockStatusLabel}
            plan={sessionState.plan}
          />
        ) : null}
        <section className={commentOnly || shellIsNarrow ? "grid gap-3" : "grid gap-3 xl:grid-cols-[22rem_minmax(0,1fr)_20rem]"}>
          {!commentOnly ? (
            <aside className="grid min-w-0 content-start gap-3 md:grid-cols-2 xl:grid-cols-1">
              <CommentTranslatorSessionPanel
                locale={locale}
                copy={copy}
                operatorFlowStatus={operatorFlowStatus}
                sessionState={sessionState}
                usageDisplay={usageDisplay}
                credentialStatusLabel={credentialStatusLabel}
                sessionReasonGroup={sessionReasonGroup}
                sessionStopReason={sessionStopReason}
                sessionReasonMessage={sessionReasonMessage}
                sessionRecommendedAction={sessionRecommendedAction}
                usagePolicyStopReason={usagePolicyStopReason}
                isSessionPending={isSessionPending}
                startBlockedByCredentialStatus={startBlockedByCredentialStatus}
                startBlockedByUsagePolicy={startBlockedByUsagePolicy}
                startBlockedByRateLimit={startBlockedByRateLimit}
                showReconnectGuidance={showReconnectGuidance}
                onStart={() => runSessionCommand("start")}
                onStop={() => runSessionCommand("stop")}
                onRefresh={refreshSessionState}
              />
              <CommentTranslatorSettingsPanel
                locale={locale}
                copy={copy}
                sourceLanguage={sourceLanguage}
                targetLanguage={targetLanguage}
                displayMode={displayMode}
                surfaceMode={surfaceMode}
                sourceLanguageOptions={sourceLanguageOptions}
                targetLanguageOptions={targetLanguageOptions}
                displayModeOptions={displayModeOptions}
                surfaceModeOptions={surfaceModeOptions}
                viewMode={viewMode}
                showStreamSafeAuthorDisplayNames={showStreamSafeAuthorDisplayNames}
                sourceShortLabel={localizedSourceLanguage.shortLabel}
                targetShortLabel={localizedTargetLanguage.shortLabel}
                onSourceLanguageChange={(value) => setSourceLanguage(sourceLanguages.find((item) => item.id === value)?.id ?? sourceLanguage)}
                onTargetLanguageChange={(value) => setTargetLanguage(targetLanguages.find((item) => item.id === value)?.id ?? targetLanguage)}
                onDisplayModeChange={(value) => setDisplayMode(displayModes.find((item) => item.id === value)?.id ?? displayMode)}
                onSurfaceModeChange={(value) => setSurfaceMode(surfaceOptions.find((item) => item.id === value)?.id ?? surfaceMode)}
                onViewModeChange={setViewMode}
                onSafeDisplayNamesChange={setShowStreamSafeAuthorDisplayNames}
              />
            </aside>
          ) : null}
          <CommentTranslatorFeedPanel
            locale={locale}
            copy={copy}
            commentOnly={commentOnly}
            sessionStatus={sessionState.status}
            authorDisplayNamePolicy={authorDisplayNamePolicy}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            statusFilters={statusFilters}
            filteredComments={filteredComments}
            publicCommentCount={publicFeedComments.length}
            translatedCount={liveStats.translated}
            displayMode={displayMode}
            targetLanguageLabel={localizedTargetLanguage.label}
            isPending={isRealCommentsFeedPending}
            hasRetainedRows={hasRetainedStoppedPreviewRows}
            errorMessage={realCommentsFeedError}
            unavailableMessage={realCommentsFeedUnavailableMessage}
            onNormalView={() => setViewMode("normal")}
            onSearchQueryChange={setSearchQuery}
            onStatusFilterChange={setStatusFilter}
            onRefresh={refreshRealCommentsFeed}
            onClear={clearRetainedPreviewFeed}
          />
          {!commentOnly ? (
            <CommentTranslatorUsageSidebar
              copy={copy}
              usageDisplay={usageDisplay}
              usagePolicyLabel={usagePolicyLabel}
              usagePolicyStopReason={usagePolicyStopReason}
              waitlistState={creatorWaitlistState}
              isWaitlistPending={isCreatorWaitlistPending}
              onRefreshWaitlist={refreshCreatorWaitlist}
              onRegisterWaitlist={registerCreatorWaitlist}
            />
          ) : null}
        </section>
      </div>
    </div>
  );
}
