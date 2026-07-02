"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import {
  getCommentTranslatorSessionStatusAction,
  getCommentTranslatorRealCommentsFeedAction,
  getYouTubeOAuthCredentialStatusAction,
  getCommentTranslatorCreatorLockedWaitlistAction,
  heartbeatCommentTranslatorSessionAction,
  recordCommentTranslatorCreatorLockedClickAction,
  requestCommentTranslatorDataDeletionAction,
  restoreCommentTranslatorPersistedRealCommentsFeedAction,
  startCommentTranslatorSessionAction,
  stopCommentTranslatorSessionAction
} from "@/app/tools/comment-translator/actions";
import { useLocale } from "@/components/portal/LocaleProvider";
import {
  commentTranslatorManualSamples,
  commentTranslatorOperatorFlowSteps,
  commentTranslatorUiCopy,
  createManualCommentRows,
  filterCommentTranslatorComments,
  findCommentTranslatorOption,
  mockTranslationProvider,
  splitManualCommentInput,
  type CommentTranslatorComment,
  type CommentTranslatorConnectionStateId,
  type CommentTranslatorDisplayMode,
  type CommentTranslatorManualResultMode,
  type CommentTranslatorQuotaScenarioId,
  type CommentTranslatorSourceLanguageId,
  type CommentTranslatorStatusFilter,
  type CommentTranslatorStreamId,
  type CommentTranslatorSurfaceMode,
  type CommentTranslatorTargetLanguageId
} from "@/lib/comment-translator";
import {
  createUnavailableCommentTranslatorRealCommentsFeedState,
  mapCommentTranslatorRealCommentsFeedRowsToUiComments,
  resolveCommentTranslatorBrowserTimeZone,
  type CommentTranslatorRealCommentsFeedState
} from "@/lib/comment-translator-real-comments-feed-shared";
import { readLocalTimeZonePreference, timeZonePreferenceChangeEvent, timeZonePreferenceStorageKey } from "@/lib/local-preferences";
import type { CommentTranslatorToolCredentialStatusSource } from "@/lib/comment-translator-youtube-tool-credential-source";
import {
  createYouTubeOAuthCredentialStatusUiWiring,
  type YouTubeOAuthCredentialStatusUiStateId,
  type YouTubeOAuthCredentialStatusUiWiringViewModel
} from "@/lib/comment-translator-youtube-credential-status-ui-wiring";

type SelectOption = {
  id: string;
  label: string;
  helper?: string;
  shortLabel?: string;
};

type CommentTranslatorUiCopy = (typeof commentTranslatorUiCopy)[keyof typeof commentTranslatorUiCopy];
type OperatorFlowChecklistState = "done" | "waiting" | "gated";
type OperatorSessionStopReason = keyof CommentTranslatorUiCopy["operatorSession"]["stopReasons"];
type OperatorSessionNextAction = keyof CommentTranslatorUiCopy["operatorSession"]["nextActions"];
type OperatorSessionReasonCode = keyof CommentTranslatorUiCopy["operatorSession"]["reasonMessages"];
type OperatorSessionReasonGroup = keyof CommentTranslatorUiCopy["operatorSession"]["reasonGroups"];
type OperatorSessionRecommendedAction = keyof CommentTranslatorUiCopy["operatorSession"]["recommendedActions"];
type OperatorSessionUsageDisplay = {
  status: "available" | "over-limit" | "unavailable";
  session: {
    usedSeconds: number;
    limitSeconds: number;
    remainingSeconds: number;
  };
  daily: {
    usedSeconds: number;
    limitSeconds: number;
    remainingSeconds: number;
  };
  perMinute: {
    used: number;
    limit: number;
    remaining: number;
  };
  monthlyCharacterCap: {
    used: number;
    limit: number;
    remaining: number;
  };
  unavailableReason: "durable-usage-unreadable" | "missing-entitlement" | "missing-provider-readiness" | null;
  providerCallPolicy: {
    status: "allowed" | "blocked-over-limit" | "blocked-unavailable";
    stopReason: OperatorSessionStopReason | null;
    clientReadableDetail: "sanitized-usage-only";
  };
  noProviderCallWhenOverLimit: true;
  clientReadableDetail: "sanitized-usage-only";
};
type OperatorSessionState = {
  status: keyof CommentTranslatorUiCopy["operatorSession"]["states"];
  plan: "free" | "paid";
  elapsedSeconds: number;
  remainingSessionSeconds: number;
  remainingDailySeconds: number;
  stopReason: OperatorSessionStopReason | null;
  reasonUx: {
    code: OperatorSessionReasonCode;
    group: OperatorSessionReasonGroup;
    recommendedAction: OperatorSessionRecommendedAction;
    clientReadableDetail: "sanitized-reason-only";
  } | null;
  usageDisplay: OperatorSessionUsageDisplay;
  nextAction: OperatorSessionNextAction;
  rateLimit?: "exceeded";
  rateLimitReason?: "rate-limit-exceeded";
  retryAfterSeconds?: number;
};
type RetentionAttributionState = {
  status: "available" | "unavailable";
  unavailableReason:
    | "durable-session-unreadable"
    | "durable-usage-unreadable"
    | "missing-entitlement"
    | "missing-provider-readiness"
    | null;
  dataDeletion: {
    requestPath: "server-action:requestCommentTranslatorDataDeletionAction";
    buttonState: "enabled" | "disabled";
    clientReadableDetail: "sanitized-request-status-only" | "sanitized-unavailable-only";
  };
  retentionJob: {
    status: "ready" | "unavailable";
    clientReadableDetail: "sanitized-retention-readiness-only" | "sanitized-unavailable-only";
  };
  deletedMessagePropagation: {
    strategy: "message-reference-tombstone-only";
    browserReadableText: "tombstone-only";
  };
  sourceAttribution: {
    label: "Source: YouTube Live Chat";
  };
  clientReadableDetail: "sanitized-retention-attribution-only";
  publicLaunchAllowed: false;
};
type CreatorLockedFeatureId =
  | "creator-ai-natural-translation"
  | "creator-obs-overlay"
  | "creator-moderator-share"
  | "creator-custom-dictionary";
type CreatorLockedWaitlistState = {
  status: "locked" | "unavailable";
  unavailableReason:
    | "durable-session-unreadable"
    | "durable-usage-unreadable"
    | "missing-entitlement"
    | "missing-provider-readiness"
    | null;
  creatorPriceIntent: {
    currency: "JPY";
    monthlyAmount: 980;
    availability: "planned-closed-beta-not-live";
    paidAccessLive: false;
    checkoutAvailable: false;
    clientReadableDetail: "sanitized-price-intent-only";
  };
  lockedFeatureCards: readonly {
    id: CreatorLockedFeatureId;
    state: "locked";
    availability: "closed-beta-waitlist";
    clientReadableDetail: "sanitized-feature-label-only";
  }[];
  waitlist: {
    status: "available" | "unavailable";
    actionState: "enabled" | "disabled";
    clientReadableDetail: "sanitized-waitlist-intent-only" | "sanitized-unavailable-only";
  };
  clickTracking: {
    status: "local-draft-ready" | "unavailable";
    recording: "local-deterministic-draft-only" | "not-run";
    clientReadableDetail: "sanitized-local-draft-only" | "sanitized-unavailable-only";
  };
  clientReadableDetail: "sanitized-creator-locked-waitlist-only";
  publicLaunchAllowed: false;
};

const freeDailyLimitSeconds = 30 * 60;
const commentTranslatorPreviewFeedAutoRefreshIntervalMs = 15000;
const initialOperatorSessionUsageDisplay: OperatorSessionUsageDisplay = {
  status: "available",
  session: {
    usedSeconds: 0,
    limitSeconds: freeDailyLimitSeconds,
    remainingSeconds: freeDailyLimitSeconds
  },
  daily: {
    usedSeconds: 0,
    limitSeconds: freeDailyLimitSeconds,
    remainingSeconds: freeDailyLimitSeconds
  },
  perMinute: {
    used: 0,
    limit: 30,
    remaining: 30
  },
  monthlyCharacterCap: {
    used: 0,
    limit: 20_000,
    remaining: 20_000
  },
  unavailableReason: null,
  providerCallPolicy: {
    status: "allowed",
    stopReason: null,
    clientReadableDetail: "sanitized-usage-only"
  },
  noProviderCallWhenOverLimit: true,
  clientReadableDetail: "sanitized-usage-only"
};
const initialOperatorSessionState: OperatorSessionState = {
  status: "not-started",
  plan: "free",
  elapsedSeconds: 0,
  remainingSessionSeconds: freeDailyLimitSeconds,
  remainingDailySeconds: freeDailyLimitSeconds,
  stopReason: null,
  reasonUx: null,
  usageDisplay: initialOperatorSessionUsageDisplay,
  nextAction: "press-start"
};
const initialRetentionAttributionState: RetentionAttributionState = {
  status: "unavailable",
  unavailableReason: "missing-provider-readiness",
  dataDeletion: {
    requestPath: "server-action:requestCommentTranslatorDataDeletionAction",
    buttonState: "enabled",
    clientReadableDetail: "sanitized-request-status-only"
  },
  retentionJob: {
    status: "unavailable",
    clientReadableDetail: "sanitized-unavailable-only"
  },
  deletedMessagePropagation: {
    strategy: "message-reference-tombstone-only",
    browserReadableText: "tombstone-only"
  },
  sourceAttribution: {
    label: "Source: YouTube Live Chat"
  },
  clientReadableDetail: "sanitized-retention-attribution-only",
  publicLaunchAllowed: false
};
const initialCreatorLockedWaitlistState: CreatorLockedWaitlistState = {
  status: "unavailable",
  unavailableReason: "missing-provider-readiness",
  creatorPriceIntent: {
    currency: "JPY",
    monthlyAmount: 980,
    availability: "planned-closed-beta-not-live",
    paidAccessLive: false,
    checkoutAvailable: false,
    clientReadableDetail: "sanitized-price-intent-only"
  },
  lockedFeatureCards: [
    {
      id: "creator-ai-natural-translation",
      state: "locked",
      availability: "closed-beta-waitlist",
      clientReadableDetail: "sanitized-feature-label-only"
    },
    {
      id: "creator-obs-overlay",
      state: "locked",
      availability: "closed-beta-waitlist",
      clientReadableDetail: "sanitized-feature-label-only"
    },
    {
      id: "creator-moderator-share",
      state: "locked",
      availability: "closed-beta-waitlist",
      clientReadableDetail: "sanitized-feature-label-only"
    },
    {
      id: "creator-custom-dictionary",
      state: "locked",
      availability: "closed-beta-waitlist",
      clientReadableDetail: "sanitized-feature-label-only"
    }
  ],
  waitlist: {
    status: "unavailable",
    actionState: "disabled",
    clientReadableDetail: "sanitized-unavailable-only"
  },
  clickTracking: {
    status: "unavailable",
    recording: "not-run",
    clientReadableDetail: "sanitized-unavailable-only"
  },
  clientReadableDetail: "sanitized-creator-locked-waitlist-only",
  publicLaunchAllowed: false
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function statusClassName(status: CommentTranslatorComment["status"]) {
  if (status === "translated") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "skipped") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-red-200 bg-red-50 text-red-700";
}

function toneClassName(tone: "normal" | "warning" | "empty" | "error") {
  if (tone === "warning") {
    return "border-amber-200 bg-amber-50/45 text-amber-800";
  }

  if (tone === "empty") {
    return "border-border bg-surface-muted/50 text-muted";
  }

  if (tone === "error") {
    return "border-red-200 bg-red-50/45 text-red-700";
  }

  return "border-emerald-200 bg-emerald-50/45 text-emerald-700";
}

function credentialStatusTone(state: YouTubeOAuthCredentialStatusUiStateId) {
  if (state === "available") {
    return "normal";
  }

  if (state === "unavailable") {
    return "error";
  }

  return "warning";
}

function operatorFlowTone(status: "ready" | "standby" | "blocked") {
  if (status === "ready") {
    return "normal";
  }

  if (status === "blocked") {
    return "error";
  }

  return "warning";
}

function operatorSessionTone(status: OperatorSessionState["status"]) {
  if (status === "active") {
    return "normal";
  }

  if (status === "stopped") {
    return "warning";
  }

  return "empty";
}

function statusLabel(comment: CommentTranslatorComment, copy: CommentTranslatorUiCopy) {
  if (comment.status === "translated") {
    return comment.cacheStatus === "hit" ? copy.statusBadges.cached : copy.statusBadges.translated;
  }

  return copy.statusBadges[comment.status];
}

function skipReasonLabel(reason: string, copy: CommentTranslatorUiCopy) {
  return copy.skipReasonText[reason as keyof typeof copy.skipReasonText] ?? reason;
}

function ControlSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm">
      <span className="text-xs font-black uppercase tracking-normal text-muted">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-10 w-full min-w-0 rounded-base border border-border bg-surface px-3 py-2 text-sm font-bold text-foreground shadow-sm transition hover:border-primary/60 focus:border-primary"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatTile({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-base border border-border bg-surface p-3">
      <p className="text-xs font-bold text-muted">{label}</p>
      <p className="mt-2 break-words text-2xl font-black tracking-normal text-foreground">{value}</p>
      <p className="mt-1 break-words text-xs font-semibold text-primary-strong">{helper}</p>
    </div>
  );
}

function CredentialStatusRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid min-w-0 gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:gap-3">
      <dt className="min-w-0 break-words text-muted">{label}</dt>
      <dd className="min-w-0 break-all font-semibold text-foreground sm:text-right">{value ?? "-"}</dd>
    </div>
  );
}

function CommentCard({
  comment,
  displayMode,
  targetLanguageLabel,
  copy
}: {
  comment: CommentTranslatorComment;
  displayMode: CommentTranslatorDisplayMode;
  targetLanguageLabel: string;
  copy: CommentTranslatorUiCopy;
}) {
  const showOriginal = displayMode === "both" || displayMode === "original";
  const showTranslated = (displayMode === "both" || displayMode === "translated") && Boolean(comment.translatedText);
  const showTranslatedFallback = displayMode === "translated" && !comment.translatedText;

  return (
    <article
      className={[
        "rounded-base border bg-surface p-3 shadow-sm sm:p-4",
        comment.badge === "support" ? "border-amber-200 bg-amber-50/35" : "border-border",
        comment.status === "error" ? "border-red-200 bg-red-50/35" : ""
      ].join(" ")}
    >
      <div className="grid gap-3 sm:grid-cols-[2.25rem_minmax(0,1fr)_auto] sm:items-start">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-base bg-primary-soft text-sm font-black text-primary-strong">
          {comment.authorName.slice(0, 1)}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-sm font-black text-foreground">{comment.authorName}</h3>
            <span className="rounded-base bg-surface-muted px-2 py-1 text-[11px] font-bold text-muted">
              {comment.timestamp}
            </span>
            {comment.source === "manual" ? (
              <span className="rounded-base border border-cyan-200 bg-cyan-50 px-2 py-1 text-[11px] font-bold text-cyan-700">
                {copy.manualInput.sourceBadge}
              </span>
            ) : null}
            {comment.source === "server" && comment.sourceLabel ? (
              <span className="rounded-base border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-700">
                {comment.sourceLabel}
              </span>
            ) : null}
            {comment.badge && comment.source !== "manual" ? (
              <span className="rounded-base border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">
                {comment.badge}
              </span>
            ) : null}
            <span className="rounded-base border border-border bg-background px-2 py-1 text-[11px] font-bold text-muted">
              {copy.commentMeta.cache} {comment.cacheStatus}
            </span>
          </div>

          <div className="mt-3 grid gap-2">
            {showOriginal ? (
              <div className="grid min-w-0 gap-2 rounded-base border border-border/70 bg-background/60 p-2.5 sm:grid-cols-[3.5rem_minmax(0,1fr)]">
                <span className="w-fit rounded-base bg-blue-50 px-2 py-1 text-[11px] font-black text-blue-700">
                  {comment.sourceLanguage}
                </span>
                <p className="min-w-0 break-words text-sm leading-6 text-foreground">{comment.originalText}</p>
              </div>
            ) : null}
            {showTranslated ? (
              <div className="grid min-w-0 gap-2 rounded-base border border-emerald-200 bg-emerald-50/60 p-2.5 sm:grid-cols-[3.5rem_minmax(0,1fr)]">
                <span className="w-fit rounded-base bg-emerald-100 px-2 py-1 text-[11px] font-black text-emerald-800">
                  {comment.targetLanguage}
                </span>
                <p className="min-w-0 break-words text-sm font-semibold leading-6 text-foreground">
                  {comment.translatedText}
                </p>
              </div>
            ) : null}
            {showTranslatedFallback ? (
              <div className="rounded-base border border-dashed border-border bg-surface-muted/50 p-2.5">
                <p className="text-sm font-bold leading-6 text-muted">
                  {copy.commentMeta.noTranslatedText} {targetLanguageLabel}
                </p>
              </div>
            ) : null}
          </div>

          {comment.skipReason || comment.errorMessage ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {comment.skipReason ? (
                <span className="rounded-base border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
                  {copy.commentMeta.skipped}: {skipReasonLabel(comment.skipReason, copy)}
                </span>
              ) : null}
              {comment.errorMessage ? (
                <span className="rounded-base border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
                  {copy.commentMeta.error}: {comment.errorMessage}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        <span className={["w-fit rounded-base border px-2.5 py-1 text-xs font-black", statusClassName(comment.status)].join(" ")}>
          {statusLabel(comment, copy)}
        </span>
      </div>
    </article>
  );
}

function CreatorLockedWaitlistPanel({
  copy,
  state,
  clickStatus,
  isPending,
  onRefresh,
  onTrackClick
}: {
  copy: CommentTranslatorUiCopy;
  state: CreatorLockedWaitlistState;
  clickStatus: string | null;
  isPending: boolean;
  onRefresh: () => void;
  onTrackClick: (featureId: CreatorLockedFeatureId, intent: "waitlist-click" | "feature-card-click") => void;
}) {
  const ready = state.status === "locked" && state.waitlist.status === "available";

  return (
    <div
      data-comment-translator-creator-locked-waitlist="sanitized-creator-locked-waitlist-only"
      className="rounded-base border border-primary/25 bg-primary-soft/25 px-3 py-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words text-sm font-black text-foreground">{copy.creatorLockedWaitlist.title}</p>
          <p className="mt-1 break-words text-xs font-semibold leading-5 text-muted">
            {copy.creatorLockedWaitlist.priceIntent}
          </p>
        </div>
        <span className="rounded-base border border-primary/30 bg-surface px-2 py-1 text-xs font-black text-primary-strong">
          {copy.creatorLockedWaitlist.lockedBadge}
        </span>
      </div>
      <p className="mt-2 break-words text-xs font-semibold leading-5 text-muted">
        {ready ? copy.creatorLockedWaitlist.helper : copy.creatorLockedWaitlist.unavailable}
      </p>
      <div className="mt-3 grid gap-2">
        {state.lockedFeatureCards.map((card) => {
          const featureCopy = copy.creatorLockedWaitlist.features[card.id];

          return (
            <button
              key={card.id}
              type="button"
              data-comment-translator-creator-click-tracking="sanitized-local-draft-only"
              onClick={() => onTrackClick(card.id, "feature-card-click")}
              disabled={isPending || state.clickTracking.status !== "local-draft-ready"}
              className="grid min-w-0 gap-1 rounded-base border border-border bg-surface px-3 py-2 text-left transition hover:border-primary/60 hover:bg-background disabled:cursor-not-allowed disabled:bg-surface-muted/70"
            >
              <span className="break-words text-xs font-black text-foreground">{featureCopy.title}</span>
              <span className="break-words text-xs font-semibold leading-5 text-muted">{featureCopy.body}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        <button
          type="button"
          data-comment-translator-creator-click-tracking="sanitized-local-draft-only"
          onClick={() => onTrackClick("creator-ai-natural-translation", "waitlist-click")}
          disabled={isPending || state.waitlist.actionState !== "enabled"}
          className="min-h-10 rounded-base border border-primary bg-primary px-3 py-2 text-sm font-black text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-muted disabled:text-muted/70"
        >
          {isPending ? copy.creatorLockedWaitlist.pending : copy.creatorLockedWaitlist.joinWaitlist}
        </button>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isPending}
          className="min-h-10 rounded-base border border-border bg-surface px-3 py-2 text-sm font-black text-muted transition hover:border-primary/60 hover:bg-primary-soft/40 disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-muted disabled:text-muted/70"
        >
          {copy.creatorLockedWaitlist.refresh}
        </button>
      </div>
      <p className="mt-2 break-words text-xs font-semibold leading-5 text-muted">
        {clickStatus ?? copy.creatorLockedWaitlist.clickBoundary}
      </p>
    </div>
  );
}

export function CommentTranslatorDock({
  youtubeCredentialStatusSource,
  initialRealCommentsFeed
}: {
  youtubeCredentialStatusSource: CommentTranslatorToolCredentialStatusSource;
  initialRealCommentsFeed: CommentTranslatorRealCommentsFeedState;
}) {
  const { locale } = useLocale();
  const {
    platform,
    settings,
    quota,
    connectionStates,
    streams,
    sourceLanguages,
    targetLanguages,
    displayModes,
    surfaceOptions,
    statusFilters,
    quotaScenarios,
    skipReasons
  } = mockTranslationProvider.getSnapshot();
  const copy = commentTranslatorUiCopy[locale];
  const [connectionId, setConnectionId] = useState<CommentTranslatorConnectionStateId>("connected");
  const [streamId, setStreamId] = useState(streams[0].id);
  const [sourceLanguage, setSourceLanguage] = useState<CommentTranslatorSourceLanguageId>(settings.sourceLanguage);
  const [targetLanguage, setTargetLanguage] = useState<CommentTranslatorTargetLanguageId>(settings.targetLanguage);
  const [displayMode, setDisplayMode] = useState<CommentTranslatorDisplayMode>(settings.displayMode);
  const [surfaceMode, setSurfaceMode] = useState<CommentTranslatorSurfaceMode>(settings.surfaceMode);
  const [statusFilter, setStatusFilter] = useState<CommentTranslatorStatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [quotaScenarioId, setQuotaScenarioId] = useState<CommentTranslatorQuotaScenarioId>(quota.id);
  const [singleCommentDraft, setSingleCommentDraft] = useState("");
  const [multilinePasteDraft, setMultilinePasteDraft] = useState("");
  const [manualResultMode, setManualResultMode] = useState<CommentTranslatorManualResultMode>("translated");
  const [manualComments, setManualComments] = useState<CommentTranslatorComment[]>([]);
  const [viewMode, setViewMode] = useState<"normal" | "comments">("normal");
  const [credentialStatusView, setCredentialStatusView] = useState<YouTubeOAuthCredentialStatusUiWiringViewModel | null>(
    null
  );
  const [credentialStatusError, setCredentialStatusError] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<OperatorSessionState>(initialOperatorSessionState);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [retentionAttributionState, setRetentionAttributionState] = useState<RetentionAttributionState>(
    initialRetentionAttributionState
  );
  const [retentionAttributionError, setRetentionAttributionError] = useState<string | null>(null);
  const [creatorLockedWaitlistState, setCreatorLockedWaitlistState] = useState<CreatorLockedWaitlistState>(
    initialCreatorLockedWaitlistState
  );
  const [creatorLockedClickStatus, setCreatorLockedClickStatus] = useState<string | null>(null);
  const [realCommentsFeed, setRealCommentsFeed] = useState<CommentTranslatorRealCommentsFeedState>(initialRealCommentsFeed);
  const [realCommentsFeedError, setRealCommentsFeedError] = useState<string | null>(null);
  const [browserTimeZone, setBrowserTimeZone] = useState("UTC");
  const [isCredentialStatusPending, startCredentialStatusTransition] = useTransition();
  const [isSessionPending, startSessionTransition] = useTransition();
  const [isDataDeletionPending, startDataDeletionTransition] = useTransition();
  const [isCreatorLockedPending, startCreatorLockedTransition] = useTransition();
  const [isRealCommentsFeedPending, startRealCommentsFeedTransition] = useTransition();
  const singleCommentInputRef = useRef<HTMLInputElement>(null);
  const multilinePasteInputRef = useRef<HTMLTextAreaElement>(null);
  const realCommentsFeedRefreshInFlightRef = useRef(false);

  const selectedConnection = findCommentTranslatorOption(connectionStates, connectionId);
  const selectedStream = findCommentTranslatorOption(streams, streamId);
  const selectedSourceLanguage = findCommentTranslatorOption(sourceLanguages, sourceLanguage);
  const selectedTargetLanguage = findCommentTranslatorOption(targetLanguages, targetLanguage);
  const selectedSurface = findCommentTranslatorOption(surfaceOptions, surfaceMode);
  const quotaPreview = findCommentTranslatorOption(quotaScenarios, quotaScenarioId, quota);
  const localizedConnection = {
    ...selectedConnection,
    label: copy.connections[selectedConnection.id],
    statusLabel: copy.connectionStatus[selectedConnection.id],
    dockStatusLabel: copy.connectionDockStatus[selectedConnection.id]
  };
  const localizedStream = {
    ...selectedStream,
    title: copy.streams[selectedStream.id].label,
    scheduledLabel: copy.streams[selectedStream.id].helper,
    dockStatusLabel: copy.dockStatus[selectedStream.dockStatus]
  };
  const localizedSourceLanguage = {
    ...selectedSourceLanguage,
    label: copy.languages[selectedSourceLanguage.id]
  };
  const localizedTargetLanguage = {
    ...selectedTargetLanguage,
    label: copy.languages[selectedTargetLanguage.id]
  };
  const localizedSurface = {
    ...selectedSurface,
    label: copy.surfaces[selectedSurface.id].label,
    helper: copy.surfaces[selectedSurface.id].helper
  };
  const localizedQuotaPreview = {
    ...quotaPreview,
    label: copy.quotaScenarios[quotaPreview.id].label,
    statusLabel: copy.quotaScenarios[quotaPreview.id].status,
    helper: copy.quotaScenarios[quotaPreview.id].helper
  };
  const connectionOptions = connectionStates.map((state) => ({
    id: state.id,
    label: copy.connections[state.id],
    helper: copy.connectionDockStatus[state.id]
  }));
  const streamOptions = streams.map((stream) => ({
    id: stream.id,
    label: copy.streams[stream.id].label,
    helper: copy.streams[stream.id].helper
  }));
  const sourceLanguageOptions = sourceLanguages.map((language) => ({
    id: language.id,
    label: copy.languages[language.id],
    shortLabel: language.shortLabel
  }));
  const targetLanguageOptions = targetLanguages.map((language) => ({
    id: language.id,
    label: copy.languages[language.id],
    shortLabel: language.shortLabel
  }));
  const displayModeOptions = displayModes.map((mode) => ({
    id: mode.id,
    label: copy.displayModes[mode.id].label,
    helper: copy.displayModes[mode.id].helper
  }));
  const surfaceModeOptions = surfaceOptions.map((surface) => ({
    id: surface.id,
    label: copy.surfaces[surface.id].label,
    helper: copy.surfaces[surface.id].helper
  }));
  const quotaScenarioOptions = quotaScenarios.map((scenario) => ({
    id: scenario.id,
    label: copy.quotaScenarios[scenario.id].label,
    helper: copy.quotaScenarios[scenario.id].helper
  }));
  const manualResultOptions = (["translated", "skipped", "error"] as const).map((mode) => ({
    id: mode,
    label: copy.manualResults[mode].label,
    helper: copy.manualResults[mode].helper
  }));
  const feedComments = mapCommentTranslatorRealCommentsFeedRowsToUiComments({
    feed: realCommentsFeed,
    targetLanguageLabel: localizedTargetLanguage.label,
    locale,
    timeZone: browserTimeZone
  });
  const liveProviderDiagnostics = realCommentsFeed.sanitizedSummary.liveProviderDiagnostics;
  const filteredComments = filterCommentTranslatorComments(feedComments, { statusFilter, searchQuery });
  const liveStats = {
    translated: feedComments.filter((comment) => comment.status === "translated").length,
    skipped: feedComments.filter((comment) => comment.status === "skipped").length,
    errors: feedComments.filter((comment) => comment.status === "error").length,
    cacheHits: feedComments.filter((comment) => comment.cacheStatus === "hit").length,
    cacheMisses: feedComments.filter((comment) => comment.cacheStatus === "miss").length,
    manualRows: manualComments.length
  };
  const prePublicDiagnosticCounts = [
    {
      label: "providerCallCount",
      value: liveProviderDiagnostics?.providerCallCount ?? 0
    },
    {
      label: "cacheHitCount",
      value: liveProviderDiagnostics?.cacheHitCount ?? 0
    },
    {
      label: "cacheMissCount",
      value: liveProviderDiagnostics?.cacheMissCount ?? 0
    },
    {
      label: "duplicateTextCacheHitCount",
      value: liveProviderDiagnostics?.duplicateTextCacheHitCount ?? 0
    },
    {
      label: "duplicateTextSkippedCount",
      value: liveProviderDiagnostics?.duplicateTextSkippedCount ?? 0
    },
    {
      label: "languagePolicySkippedCount",
      value: liveProviderDiagnostics?.languagePolicySkippedCount ?? 0
    },
    {
      label: "translatedCount",
      value: liveProviderDiagnostics?.translatedCount ?? 0
    },
    {
      label: "persistedFeedRowCount",
      value: liveProviderDiagnostics?.persistedFeedRowCount ?? 0
    }
  ];
  const skipReasonCounts = skipReasons.map((reason) => ({
    ...reason,
    count: feedComments.filter((comment) => comment.skipReason === reason.label).length
  }));
  const effectiveUsedUnits = Math.min(
    localizedQuotaPreview.limitUnits,
    localizedQuotaPreview.usedUnits
  );
  const effectiveCacheTotal = liveStats.cacheHits + liveStats.cacheMisses;
  const effectiveCacheHitRate = effectiveCacheTotal > 0 ? Math.round((liveStats.cacheHits / effectiveCacheTotal) * 100) : 0;
  const quotaPercent = localizedQuotaPreview.limitUnits > 0 ? Math.min(100, Math.round((effectiveUsedUnits / localizedQuotaPreview.limitUnits) * 100)) : 0;
  const shellIsNarrow = surfaceMode === "narrow-viewport";
  const dockStatusLabel = localizedConnection.dockStatus === "blocked" ? localizedConnection.dockStatusLabel : localizedStream.dockStatusLabel;
  const credentialStatusMetadata = youtubeCredentialStatusSource.statusMetadata;
  const credentialStatusState = credentialStatusView?.state ?? credentialStatusMetadata.status;
  const credentialStatusLabel = copy.credentialStatus.states[credentialStatusState];
  const credentialStatusScopeLabel = credentialStatusView?.scopeLabel ?? credentialStatusMetadata.scopeLabel;
  const credentialStatusExpiresAtIso = credentialStatusView?.expiresAtIso ?? credentialStatusMetadata.expiresAtIso;
  const credentialStatusReason =
    credentialStatusError ?? credentialStatusView?.reason ?? credentialStatusMetadata.reason ?? null;
  const operatorFlowCredentialReady = credentialStatusState === "available";
  const operatorFlowTargetReady = selectedStream.dockStatus === "ready" && localizedConnection.dockStatus !== "blocked";
  const operatorFlowStatus = operatorFlowCredentialReady ? (operatorFlowTargetReady ? "ready" : "standby") : "blocked";
  const operatorFlowSummary =
    operatorFlowStatus === "ready"
      ? copy.operatorFlow.summaryReady
      : operatorFlowStatus === "standby"
        ? copy.operatorFlow.summaryStandby
        : copy.operatorFlow.summaryBlocked;
  const operatorFlowChecklist = commentTranslatorOperatorFlowSteps.map((step) => {
    const state: OperatorFlowChecklistState =
      step.id === "credential-status"
        ? operatorFlowCredentialReady
          ? "done"
          : "waiting"
        : step.id === "target-readiness"
          ? operatorFlowTargetReady
            ? "done"
            : "waiting"
          : step.id === "intake-bridge"
            ? "done"
            : "gated";

    return {
      ...step,
      state,
      copy: copy.operatorFlow.steps[step.id]
    };
  });
  const sessionDailyUsedSeconds = Math.max(0, freeDailyLimitSeconds - sessionState.remainingDailySeconds);
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
  const retentionAttributionReady = retentionAttributionState.status === "available";
  const retentionAttributionStatusLabel = retentionAttributionReady
    ? copy.retentionAttribution.statusReady
    : copy.retentionAttribution.statusUnavailable;
  const retentionAttributionHelper = retentionAttributionReady
    ? copy.retentionAttribution.retentionReady
    : copy.retentionAttribution.retentionUnavailable;
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
  const startBlockedByRateLimit = sessionState.rateLimit === "exceeded";
  const showReconnectGuidance =
    credentialStatusState !== "available" ||
    sessionState.nextAction === "reconnect-or-sign-in" ||
    sessionState.stopReason === "auth-failed" ||
    sessionState.stopReason === "token-refresh-failed" ||
    sessionState.stopReason === "reconnect-required";
  const startBlockedByCredentialStatus = credentialStatusState !== "available";
  const startBlockedByUsagePolicy = !startBlockedByRateLimit && usageDisplay.providerCallPolicy.status !== "allowed";
  const commentOnly = viewMode === "comments";

  function refreshCredentialStatus() {
    startCredentialStatusTransition(async () => {
      try {
        const status = await getYouTubeOAuthCredentialStatusAction();
        setCredentialStatusView(createYouTubeOAuthCredentialStatusUiWiring(status));
        setCredentialStatusError(null);
      } catch {
        setCredentialStatusError(copy.credentialStatus.refreshFailed);
      }
    });
  }

  function runSessionCommand(intent: "status" | "start" | "stop" | "heartbeat") {
    startSessionTransition(async () => {
      try {
        const state =
          intent === "start"
            ? await startCommentTranslatorSessionAction({ sourceLanguage, targetLanguage })
            : intent === "stop"
              ? await stopCommentTranslatorSessionAction()
              : intent === "heartbeat"
                ? await heartbeatCommentTranslatorSessionAction({ sourceLanguage, targetLanguage })
                : await getCommentTranslatorSessionStatusAction({ sourceLanguage, targetLanguage });
        setSessionState(state);
        if (state.status !== "active") {
          setRealCommentsFeed(
            createUnavailableCommentTranslatorRealCommentsFeedState({
              reason: "session-not-active"
            })
          );
        }
        setSessionError(null);
      } catch {
        setSessionError(copy.operatorSession.actionFailed);
      }
    });
  }

  function refreshSessionState() {
    runSessionCommand(sessionState.status === "active" ? "heartbeat" : "status");
  }

  useEffect(() => {
    let cancelled = false;

    startSessionTransition(async () => {
      try {
        const state = await getCommentTranslatorSessionStatusAction({ sourceLanguage, targetLanguage });
        if (cancelled) {
          return;
        }

        setSessionState(state);
        if (state.status === "active") {
          const feed = await restoreCommentTranslatorPersistedRealCommentsFeedAction({ sourceLanguage, targetLanguage });
          if (cancelled) {
            return;
          }
          setRealCommentsFeed(feed);
          setRealCommentsFeedError(null);
        } else {
          setRealCommentsFeed(
            createUnavailableCommentTranslatorRealCommentsFeedState({
              reason: "session-not-active"
            })
          );
          setRealCommentsFeedError(null);
        }
        setSessionError(null);
      } catch {
        if (!cancelled) {
          setSessionError(copy.operatorSession.actionFailed);
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [copy.operatorSession.actionFailed, sourceLanguage, startSessionTransition, targetLanguage]);

  const refreshRealCommentsFeed = useCallback(() => {
    if (realCommentsFeedRefreshInFlightRef.current) {
      return;
    }

    if (sessionState.status !== "active") {
      setRealCommentsFeed(
        createUnavailableCommentTranslatorRealCommentsFeedState({
          reason: "session-not-active"
        })
      );
      setRealCommentsFeedError(null);
      return;
    }

    realCommentsFeedRefreshInFlightRef.current = true;
    startRealCommentsFeedTransition(async () => {
      try {
        const refreshedSession = await heartbeatCommentTranslatorSessionAction({ sourceLanguage, targetLanguage });
        setSessionState(refreshedSession);
        if (refreshedSession.status !== "active") {
          setRealCommentsFeed(
            createUnavailableCommentTranslatorRealCommentsFeedState({
              reason: "session-not-active"
            })
          );
          setRealCommentsFeedError(null);
          return;
        }

        const feed = await getCommentTranslatorRealCommentsFeedAction({ sourceLanguage, targetLanguage });
        setRealCommentsFeed(feed);
        setRealCommentsFeedError(null);
      } catch {
        setRealCommentsFeedError(locale === "ja" ? "コメント状態を更新できませんでした" : "Could not refresh comments");
      } finally {
        realCommentsFeedRefreshInFlightRef.current = false;
      }
    });
  }, [locale, sessionState.status, sourceLanguage, targetLanguage]);

  useEffect(() => {
    function refreshTimeZonePreference() {
      setBrowserTimeZone(readLocalTimeZonePreference() ?? resolveCommentTranslatorBrowserTimeZone());
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === timeZonePreferenceStorageKey) {
        refreshTimeZonePreference();
      }
    }

    refreshTimeZonePreference();
    window.addEventListener(timeZonePreferenceChangeEvent, refreshTimeZonePreference);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener(timeZonePreferenceChangeEvent, refreshTimeZonePreference);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (sessionState.status !== "active") {
      return;
    }

    const intervalId = window.setInterval(() => {
      refreshRealCommentsFeed();
    }, commentTranslatorPreviewFeedAutoRefreshIntervalMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [refreshRealCommentsFeed, sessionState.status]);

  function requestDataDeletion() {
    startDataDeletionTransition(async () => {
      try {
        const state = await requestCommentTranslatorDataDeletionAction();
        setRetentionAttributionState(state);
        setRetentionAttributionError(null);
      } catch {
        setRetentionAttributionError(
          locale === "ja" ? "データ削除状態を確認できませんでした" : "Could not check data deletion state"
        );
      }
    });
  }

  function refreshCreatorLockedWaitlist() {
    startCreatorLockedTransition(async () => {
      try {
        const state = await getCommentTranslatorCreatorLockedWaitlistAction();
        setCreatorLockedWaitlistState(state);
        setCreatorLockedClickStatus(null);
      } catch {
        setCreatorLockedClickStatus(copy.creatorLockedWaitlist.actionFailed);
      }
    });
  }

  function trackCreatorLockedClick(featureId: CreatorLockedFeatureId, intent: "waitlist-click" | "feature-card-click") {
    startCreatorLockedTransition(async () => {
      try {
        const draft = await recordCommentTranslatorCreatorLockedClickAction({
          featureId,
          intent
        });
        setCreatorLockedClickStatus(
          draft.status === "recorded-local-draft"
            ? copy.creatorLockedWaitlist.clickRecorded
            : copy.creatorLockedWaitlist.clickUnavailable
        );
      } catch {
        setCreatorLockedClickStatus(copy.creatorLockedWaitlist.actionFailed);
      }
    });
  }

  function clearManualDraft() {
    setSingleCommentDraft("");
    setMultilinePasteDraft("");
    if (singleCommentInputRef.current) {
      singleCommentInputRef.current.value = "";
    }
    if (multilinePasteInputRef.current) {
      multilinePasteInputRef.current.value = "";
    }
  }

  function clearManualSession() {
    setManualComments([]);
  }

  function insertManualSamples() {
    const sampleText = commentTranslatorManualSamples.map((sample) => sample.text).join("\n");
    setMultilinePasteDraft(sampleText);
    if (multilinePasteInputRef.current) {
      multilinePasteInputRef.current.value = sampleText;
    }
  }

  function addManualComments() {
    const texts = splitManualCommentInput({
      singleComment: singleCommentDraft || singleCommentInputRef.current?.value || "",
      multilinePaste: multilinePasteDraft || multilinePasteInputRef.current?.value || ""
    });

    if (texts.length === 0) {
      return;
    }

    const rows = createManualCommentRows({
      texts,
      resultMode: manualResultMode,
      targetLanguage,
      targetLanguageLabel: localizedTargetLanguage.label,
      startIndex: manualComments.length + 1
    });

    setManualComments((currentComments) => [...rows, ...currentComments]);
    clearManualDraft();
  }

  return (
    <div className="h-full min-h-0 overflow-auto bg-background px-3 py-3 sm:px-4 lg:px-5">
      <div className={["mx-auto grid min-h-full w-full gap-3", shellIsNarrow ? "max-w-[42rem]" : "max-w-none"].join(" ")}>
        {!commentOnly ? (
          <section className="panel p-4 shadow-sm sm:p-5">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-widest text-primary-strong">Live translator</p>
                <h1 className="mt-2 break-words text-2xl font-black tracking-tight text-foreground">
                  {locale === "ja" ? "配信コメント翻訳" : "Live Comment Translator"}
                </h1>
                <p className="mt-1 break-words text-xs font-semibold text-muted">
                  {platform.name} / {localizedSurface.label}
                </p>
                <p className="mt-2 max-w-3xl break-words text-sm font-semibold leading-6 text-muted">
                  {locale === "ja"
                    ? "YouTube連携と配信を確認してから、翻訳を始めるときだけ Start してください。接続だけでは監視や翻訳は始まりません。"
                    : "Check YouTube and stream readiness, then press Start only when you want translation to begin. Connecting alone does not start monitoring or translation."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <Link
                  href="/account/integrations"
                  className="inline-flex min-h-10 items-center justify-center rounded-base border border-border bg-surface px-4 py-2 text-sm font-bold text-foreground transition hover:border-primary hover:bg-primary-soft"
                >
                  {locale === "ja" ? "接続を確認" : "Check connection"}
                </Link>
                <Link
                  href="/account/billing"
                  className="inline-flex min-h-10 items-center justify-center rounded-base border border-border bg-surface px-4 py-2 text-sm font-bold text-foreground transition hover:border-primary hover:bg-primary-soft"
                >
                  {locale === "ja" ? "プラン" : "Plan"}
                </Link>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-base border border-border bg-surface px-4 py-3">
                <p className="text-xs font-black text-primary-strong">YouTube</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="break-words text-base font-black text-foreground">{credentialStatusLabel}</p>
                  <span className={["rounded-base border px-2.5 py-1 text-xs font-black", toneClassName(credentialStatusTone(credentialStatusState))].join(" ")}>
                    {isCredentialStatusPending ? copy.credentialStatus.pending : localizedConnection.statusLabel}
                  </span>
                </div>
              </div>
              <div className="rounded-base border border-border bg-surface px-4 py-3">
                <p className="text-xs font-black text-primary-strong">{locale === "ja" ? "配信" : "Stream"}</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="break-words text-base font-black text-foreground">{localizedStream.title}</p>
                  <span className={["rounded-base border px-2.5 py-1 text-xs font-black", toneClassName(operatorFlowTone(localizedStream.dockStatus))].join(" ")}>
                    {dockStatusLabel}
                  </span>
                </div>
              </div>
              <div className="rounded-base border border-border bg-surface px-4 py-3">
                <p className="text-xs font-black text-primary-strong">{locale === "ja" ? "プラン" : "Plan"}</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="break-words text-base font-black text-foreground">{sessionState.plan === "paid" ? "Pro" : "Free"}</p>
                  <span className="rounded-base border border-primary/30 bg-primary-soft px-2.5 py-1 text-xs font-black text-primary-strong">
                    {locale === "ja" ? "利用可" : "Available"}
                  </span>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section
          className={
            commentOnly
              ? "grid gap-3"
              : shellIsNarrow
                ? "grid gap-3"
                : "grid gap-3 xl:grid-cols-[22rem_minmax(0,1fr)] 2xl:grid-cols-[22rem_minmax(34rem,1fr)_20rem]"
          }
        >
          {!commentOnly ? (
            <aside className="grid min-w-0 content-start gap-3 md:grid-cols-2 xl:grid-cols-1">
              <section
                data-public-operator-session-ui="sanitized-session-usage-only"
                data-comment-translator-session-refresh-on-mount="server-status-restore"
                className="panel p-4 md:col-span-2 xl:col-span-1"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-widest text-primary-strong">
                      {operatorFlowStatus === "ready" ? "Ready" : "Check"}
                    </p>
                    <h2 className="mt-2 break-words text-xl font-black text-foreground">
                      {operatorFlowStatus === "ready"
                        ? locale === "ja"
                          ? "翻訳を開始できます"
                          : "Ready to start"
                        : copy.operatorSession.startBlockedTitle}
                    </h2>
                  </div>
                  <span className={["rounded-base border px-2 py-1 text-xs font-black", toneClassName(operatorSessionTone(sessionState.status))].join(" ")}>
                    {isSessionPending ? copy.operatorSession.pending : copy.operatorSession.states[sessionState.status]}
                  </span>
                </div>
                <p className="mt-2 break-words text-sm font-semibold leading-6 text-muted">
                  {copy.operatorSession.helper}
                </p>
                {sessionState.status === "stopped" && sessionReasonUx ? (
                  <div
                    data-comment-translator-start-stop-reason-ux="sanitized-reason-only"
                    className="mt-3 rounded-base border border-border bg-background/70 p-3 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-black text-foreground">{sessionReasonGroup}</span>
                      <span className="rounded-base border border-border bg-surface px-2 py-1 font-black text-muted">
                        {sessionStopReason}
                      </span>
                    </div>
                    <p className="mt-2 break-words font-semibold leading-5 text-muted">{sessionReasonMessage}</p>
                    {sessionRecommendedAction ? (
                      <p className="mt-1 break-words font-black leading-5 text-primary-strong">{sessionRecommendedAction}</p>
                    ) : null}
                  </div>
                ) : null}
                <div className="mt-4 grid gap-2">
                  <button
                    type="button"
                    onClick={() => runSessionCommand("start")}
                    disabled={
                      isSessionPending ||
                      sessionState.status === "active" ||
                      startBlockedByCredentialStatus ||
                      startBlockedByUsagePolicy ||
                      startBlockedByRateLimit
                    }
                    className="min-h-12 rounded-base border border-primary bg-primary px-4 py-3 text-base font-black text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-muted disabled:text-muted/70"
                  >
                    {isSessionPending ? copy.operatorSession.pending : copy.actions.startSession}
                  </button>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                    <button
                      type="button"
                      onClick={() => runSessionCommand("stop")}
                      disabled={isSessionPending || sessionState.status !== "active"}
                      className="min-h-10 rounded-base border border-border bg-surface px-3 py-2 text-sm font-black text-muted transition hover:border-primary/60 hover:bg-primary-soft/40 disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-muted disabled:text-muted/70"
                    >
                      {copy.actions.stopSession}
                    </button>
                    <button
                      type="button"
                      onClick={refreshSessionState}
                      disabled={isSessionPending}
                      className="min-h-10 rounded-base border border-border bg-surface px-3 py-2 text-sm font-black text-muted transition hover:border-primary/60 hover:bg-primary-soft/40 disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-muted disabled:text-muted/70"
                    >
                      {copy.actions.refreshSession}
                    </button>
                  </div>
                </div>
                <div
                  data-comment-translator-start-contrast="youtube-vs-session"
                  className="mt-3 rounded-base border border-border bg-surface/80 p-3 text-xs"
                >
                  <p className="font-black text-foreground">{copy.operatorSession.readinessTitle}</p>
                  <div className="mt-2 grid gap-2">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-bold text-muted">{copy.operatorSession.connectionReadiness}</span>
                      <span className="font-black text-foreground">{credentialStatusLabel}</span>
                    </div>
                    <p className="break-words font-semibold leading-5 text-muted">{copy.operatorSession.startReadiness}</p>
                    {startBlockedByUsagePolicy ? (
                      <div
                        data-comment-translator-start-blocked="usage-policy"
                        className="rounded-base border border-amber-200 bg-amber-50/80 px-3 py-2"
                      >
                        <p className="break-words font-black text-amber-900">{copy.operatorSession.usageStartBlockedTitle}</p>
                        <p className="mt-1 break-words font-semibold leading-5 text-amber-800">
                          {copy.operatorSession.usageStartBlockedBody}
                          {usagePolicyStopReason ? ` ${usagePolicyStopReason}` : ""}
                        </p>
                      </div>
                    ) : null}
                    {startBlockedByRateLimit ? (
                      <div
                        data-comment-translator-start-blocked="rate-limit"
                        className="rounded-base border border-amber-200 bg-amber-50/80 px-3 py-2"
                      >
                        <p className="break-words font-black text-amber-900">{copy.operatorSession.rateLimitStartBlockedTitle}</p>
                        <p className="mt-1 break-words font-semibold leading-5 text-amber-800">
                          {copy.operatorSession.rateLimitStartBlockedBody}
                          {typeof sessionState.retryAfterSeconds === "number" ? ` ${sessionState.retryAfterSeconds}s` : ""}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
                {startBlockedByCredentialStatus ? (
                  <div
                    data-comment-translator-start-blocked="youtube-connection-required"
                    className="mt-3 rounded-base border border-amber-200 bg-amber-50/80 p-3"
                  >
                    <p className="break-words text-sm font-black text-amber-900">{copy.operatorSession.startBlockedTitle}</p>
                    <p className="mt-1 break-words text-xs font-semibold leading-5 text-amber-800">
                      {copy.operatorSession.startBlockedBody}
                    </p>
                    <Link
                      href="/account/integrations"
                      className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-base border border-primary bg-primary px-3 py-2 text-sm font-black text-white transition hover:bg-primary-strong"
                    >
                      {copy.operatorSession.openIntegrations}
                    </Link>
                  </div>
                ) : null}
                {showReconnectGuidance ? (
                  <p className="mt-3 break-words rounded-base border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-800">
                    {copy.operatorSession.reconnectGuidance}
                  </p>
                ) : null}
                <div
                  data-comment-translator-free-beta-usage-display="sanitized-usage-only"
                  className="mt-3 rounded-base border border-border bg-background/70 p-3 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-black text-foreground">{copy.operatorSession.usageTitle}</p>
                    <span className={["rounded-base border px-2 py-1 font-black", toneClassName(usageDisplay.status === "over-limit" ? "warning" : usageDisplay.status === "unavailable" ? "error" : "normal")].join(" ")}>
                      {copy.operatorSession.usageStates[usageDisplay.status]}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <StatTile
                      label={copy.fields.sessionRemaining}
                      value={formatDuration(usageDisplay.session.remainingSeconds)}
                      helper={`${formatDuration(usageDisplay.session.usedSeconds)} ${copy.stats.used}`}
                    />
                    <StatTile
                      label={copy.fields.dailyRemaining}
                      value={formatDuration(usageDisplay.daily.remainingSeconds)}
                      helper={`${formatDuration(usageDisplay.daily.usedSeconds)} ${copy.stats.used}`}
                    />
                    <StatTile
                      label={copy.fields.monthlyCharacterCap}
                      value={`${formatNumber(usageDisplay.monthlyCharacterCap.used)} / ${formatNumber(usageDisplay.monthlyCharacterCap.limit)}`}
                      helper={`${formatNumber(usageDisplay.monthlyCharacterCap.remaining)} ${copy.fields.monthlyRemaining}`}
                    />
                    <StatTile
                      label={copy.fields.perMinuteCap}
                      value={`${formatNumber(usageDisplay.perMinute.used)} / ${formatNumber(usageDisplay.perMinute.limit)}`}
                      helper={`${formatNumber(usageDisplay.perMinute.remaining)} ${copy.operatorSession.perMinuteRemaining}`}
                    />
                  </div>
                  <p className="mt-3 break-words font-semibold leading-5 text-muted">
                    {usagePolicyLabel}
                    {usagePolicyStopReason ? ` / ${usagePolicyStopReason}` : ""}
                  </p>
                </div>
                <div
                  data-comment-translator-retention-attribution="sanitized-retention-attribution-only"
                  className="mt-3 rounded-base border border-border bg-background/70 p-3 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-black text-foreground">{copy.retentionAttribution.title}</p>
                    <span
                      className={[
                        "rounded-base border px-2 py-1 font-black",
                        toneClassName(retentionAttributionReady ? "normal" : "error")
                      ].join(" ")}
                    >
                      {retentionAttributionStatusLabel}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 rounded-base border border-border bg-surface/70 p-3">
                    <p className="break-words font-semibold leading-5 text-muted">
                      {retentionAttributionHelper}
                    </p>
                    <p className="break-words font-semibold leading-5 text-muted">
                      {copy.retentionAttribution.deletedPropagation}
                    </p>
                    <p className="break-words font-black leading-5 text-foreground">
                      {retentionAttributionState.sourceAttribution.label}
                    </p>
                    {retentionAttributionError ? (
                      <p className="break-words font-semibold leading-5 text-red-700">{retentionAttributionError}</p>
                    ) : null}
                    {retentionAttributionState.unavailableReason ? (
                      <p className="break-words font-semibold leading-5 text-amber-800">
                        {retentionAttributionState.unavailableReason}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={requestDataDeletion}
                    disabled={isDataDeletionPending || retentionAttributionState.dataDeletion.buttonState === "disabled"}
                    className="mt-3 min-h-10 w-full rounded-base border border-red-200 bg-red-50 px-3 py-2 text-sm font-black text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-muted disabled:text-muted/70"
                  >
                    {isDataDeletionPending ? copy.retentionAttribution.deletionPending : copy.retentionAttribution.deletionButton}
                  </button>
                  <p className="mt-2 break-words font-semibold leading-5 text-muted">
                    {copy.retentionAttribution.deletionHelper}
                  </p>
                </div>
              </section>

              <section className="panel p-4">
                <h2 className="text-base font-black text-foreground">{locale === "ja" ? "翻訳設定" : "Translation settings"}</h2>
                <div className="mt-4 grid gap-3">
                  <ControlSelect
                    label={copy.controls.sourceLanguage}
                    value={sourceLanguage}
                    options={sourceLanguageOptions}
                    onChange={(value) => setSourceLanguage(value as CommentTranslatorSourceLanguageId)}
                  />
                  <ControlSelect
                    label={copy.controls.targetLanguage}
                    value={targetLanguage}
                    options={targetLanguageOptions}
                    onChange={(value) => setTargetLanguage(value as CommentTranslatorTargetLanguageId)}
                  />
                  <ControlSelect
                    label={copy.controls.commentText}
                    value={displayMode}
                    options={displayModeOptions}
                    onChange={(value) => setDisplayMode(value as CommentTranslatorDisplayMode)}
                  />
                  <ControlSelect
                    label={copy.controls.surface}
                    value={surfaceMode}
                    options={surfaceModeOptions}
                    onChange={(value) => setSurfaceMode(value as CommentTranslatorSurfaceMode)}
                  />
                  <div className="grid gap-1.5">
                    <p className="text-xs font-black uppercase tracking-normal text-muted">
                      {locale === "ja" ? "画面モード" : "View mode"}
                    </p>
                    <div className="inline-flex w-fit rounded-base border border-border bg-surface-muted p-1">
                      {[
                        { id: "normal", label: locale === "ja" ? "通常" : "Normal" },
                        { id: "comments", label: locale === "ja" ? "コメントのみ" : "Comments only" }
                      ].map((option) => {
                        const selected = viewMode === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => setViewMode(option.id as "normal" | "comments")}
                            className={[
                              "rounded-base px-3 py-1.5 text-xs font-black transition",
                              selected ? "bg-primary text-white" : "text-muted hover:bg-surface hover:text-foreground"
                            ].join(" ")}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="rounded-base border border-border bg-background/65 px-3 py-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-muted">{copy.controls.currentPair}</span>
                      <span className="break-words text-right font-black text-foreground">
                        {localizedSourceLanguage.shortLabel} → {localizedTargetLanguage.shortLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <section className={shellIsNarrow ? "" : "xl:hidden"}>
                <div className="panel p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-base font-black text-foreground">{locale === "ja" ? "今日の状態" : "Today"}</h2>
                    <span className="rounded-base border border-primary/30 bg-primary-soft px-2 py-1 text-xs font-black text-primary-strong">
                      {sessionState.plan === "paid" ? "Pro" : "Free"}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <StatTile label={copy.fields.sessionRemaining} value={formatDuration(sessionState.remainingSessionSeconds)} helper={copy.fields.dailyRemaining} />
                    <StatTile label={copy.fields.perMinuteCap} value="30" helper={copy.operatorSession.perMinuteCapHelper} />
                  </div>
                  <div className="mt-4">
                    <CreatorLockedWaitlistPanel
                      copy={copy}
                      state={creatorLockedWaitlistState}
                      clickStatus={creatorLockedClickStatus}
                      isPending={isCreatorLockedPending}
                      onRefresh={refreshCreatorLockedWaitlist}
                      onTrackClick={trackCreatorLockedClick}
                    />
                  </div>
                </div>
              </section>
            </aside>
          ) : null}

          <main
            data-comment-translator-real-comments-feed="server-owned-safe-rows"
            className="panel flex min-h-[34rem] min-w-0 flex-col overflow-hidden"
          >
            <div data-layout="live-header-two-row" className="grid gap-3 border-b border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-primary-strong">{copy.sections.comments}</p>
                  <h2 className="mt-1 break-words text-xl font-black tracking-tight text-foreground">
                    {commentOnly ? (locale === "ja" ? "コメントのみ表示" : "Comments only") : copy.header.feedTitle}
                  </h2>
                </div>
                {commentOnly ? (
                  <button
                    type="button"
                    onClick={() => setViewMode("normal")}
                    className="min-h-10 rounded-base border border-border bg-surface px-3 py-2 text-sm font-bold text-foreground transition hover:border-primary hover:bg-primary-soft"
                  >
                    {locale === "ja" ? "通常表示へ戻る" : "Back to normal"}
                  </button>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-base border border-primary/30 bg-primary-soft px-2.5 py-1 text-xs font-black text-primary-strong">
                      {liveStats.translated} {copy.stats.translated}
                    </span>
                    <span className="rounded-base border border-border bg-surface px-2.5 py-1 text-xs font-black text-muted">
                      {liveStats.skipped} {copy.stats.skipped}
                    </span>
                  </div>
                )}
              </div>
              {!commentOnly ? (
                <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <label className="min-w-0">
                    <span className="sr-only">{copy.controls.searchPlaceholder}</span>
                    <input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder={copy.controls.searchPlaceholder}
                      className="min-h-10 w-full min-w-0 rounded-base border border-border bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-sm placeholder:text-muted hover:border-primary/60 focus:border-primary"
                    />
                  </label>
                  <div className="flex min-w-0 flex-wrap gap-2">
                    <span
                      data-comment-translator-preview-feed-auto-refresh="active-session-safe-periodic"
                      className="inline-flex min-h-10 items-center rounded-base border border-border bg-surface px-3 py-2 text-xs font-black text-muted"
                    >
                      {sessionState.status === "active" ? (locale === "ja" ? "自動更新中" : "Auto refresh on") : locale === "ja" ? "自動更新停止中" : "Auto refresh off"}
                    </span>
                    <button
                      type="button"
                      onClick={refreshRealCommentsFeed}
                      disabled={isRealCommentsFeedPending}
                      className="min-h-10 rounded-base border border-primary bg-primary px-3 py-2 text-xs font-black text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-muted disabled:text-muted/70"
                    >
                      {isRealCommentsFeedPending ? (locale === "ja" ? "更新中" : "Refreshing") : locale === "ja" ? "コメント更新" : "Refresh"}
                    </button>
                    {statusFilters.map((filter) => {
                      const selected = filter.id === statusFilter;
                      return (
                        <button
                          key={filter.id}
                          type="button"
                          onClick={() => setStatusFilter(filter.id)}
                          className={[
                            "min-h-10 rounded-base border px-3 py-2 text-xs font-black transition",
                            selected
                              ? "border-primary bg-primary-soft text-primary-strong"
                              : "border-border bg-surface text-muted hover:border-primary/60 hover:bg-primary-soft/40"
                          ].join(" ")}
                        >
                          {copy.filters[filter.id]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            {!commentOnly ? (
              <div className="grid grid-cols-2 gap-2 border-b border-border bg-surface-muted/30 p-3 text-center text-xs font-bold text-muted sm:grid-cols-4">
                <span className="rounded-base bg-surface px-2 py-2">{filteredComments.length} {copy.stats.shown}</span>
                <span className="rounded-base bg-surface px-2 py-2">{feedComments.length} {copy.stats.total}</span>
                <span className="rounded-base bg-emerald-50 px-2 py-2 text-emerald-700">{liveStats.translated} {copy.stats.translated}</span>
                <span className="rounded-base bg-amber-50 px-2 py-2 text-amber-700">{liveStats.skipped} {copy.stats.skipped}</span>
              </div>
            ) : null}

            <div className="scrollbar-accent min-h-0 flex-1 space-y-3 overflow-auto p-3 sm:p-4">
              {filteredComments.length > 0 ? (
                filteredComments.map((comment) => (
                  <CommentCard
                    key={comment.id}
                    comment={comment}
                    displayMode={displayMode}
                    targetLanguageLabel={localizedTargetLanguage.label}
                    copy={copy}
                  />
                ))
              ) : (
                <div className="grid min-h-72 place-items-center rounded-base border border-dashed border-border bg-background/70 p-4 text-center">
                  <div>
                    <div className="mx-auto grid h-12 w-12 place-items-center rounded-base bg-surface-muted text-2xl text-muted">
                      ...
                    </div>
                    <p className="mt-3 text-sm font-black text-foreground">{copy.empty.title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      {realCommentsFeedError ?? realCommentsFeedUnavailableMessage ?? copy.empty.body}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </main>

          {!commentOnly && !shellIsNarrow ? (
            <aside className="hidden min-w-0 content-start gap-3 2xl:grid">
              <section className="panel p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-base font-black text-foreground">{locale === "ja" ? "今日の状態" : "Today"}</h2>
                  <span className="rounded-base border border-primary/30 bg-primary-soft px-2 py-1 text-xs font-black text-primary-strong">
                    {sessionState.plan === "paid" ? "Pro" : "Free"}
                  </span>
                </div>
                <div className="mt-4 grid gap-3">
                  <StatTile label={copy.fields.sessionRemaining} value={formatDuration(sessionState.remainingSessionSeconds)} helper={copy.fields.dailyRemaining} />
                  <StatTile label={copy.fields.perMinuteCap} value="30" helper={copy.operatorSession.perMinuteCapHelper} />
                </div>
                <div className="mt-4">
                  <CreatorLockedWaitlistPanel
                    copy={copy}
                    state={creatorLockedWaitlistState}
                    clickStatus={creatorLockedClickStatus}
                    isPending={isCreatorLockedPending}
                    onRefresh={refreshCreatorLockedWaitlist}
                    onTrackClick={trackCreatorLockedClick}
                  />
                </div>
              </section>
            </aside>
          ) : null}
        </section>

        {!commentOnly ? (
          <details className="panel p-4">
            <summary className="cursor-pointer text-sm font-black text-foreground">
              {locale === "ja" ? "詳細確認とテスト入力" : "Details and test input"}
            </summary>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <section data-credential-status-display-wiring="sanitized-metadata-only" className="rounded-base border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-base font-black text-foreground">{copy.sections.credentialStatus}</h2>
                  <span className={["rounded-base border px-2 py-1 text-xs font-black", toneClassName(credentialStatusTone(credentialStatusState))].join(" ")}>
                    {isCredentialStatusPending ? copy.credentialStatus.pending : credentialStatusLabel}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <ControlSelect
                    label={copy.controls.connection}
                    value={connectionId}
                    options={connectionOptions}
                    onChange={(value) => setConnectionId(value as CommentTranslatorConnectionStateId)}
                  />
                  <ControlSelect
                    label={copy.controls.stream}
                    value={streamId}
                    options={streamOptions}
                    onChange={(value) => setStreamId(value as CommentTranslatorStreamId)}
                  />
                </div>
                <dl className="mt-3 grid gap-2 text-sm">
                  <CredentialStatusRow label={copy.fields.scope} value={credentialStatusScopeLabel} />
                  <CredentialStatusRow label={copy.fields.expires} value={credentialStatusExpiresAtIso} />
                  <CredentialStatusRow label={copy.fields.reason} value={credentialStatusReason} />
                  <CredentialStatusRow label={copy.fields.elapsed} value={formatDuration(sessionState.elapsedSeconds)} />
                  <CredentialStatusRow label={copy.fields.stopReason} value={sessionError ?? sessionReasonMessage} />
                  <CredentialStatusRow label={copy.fields.nextAction} value={sessionNextAction} />
                </dl>
                <button
                  type="button"
                  onClick={refreshCredentialStatus}
                  disabled={isCredentialStatusPending}
                  className="mt-3 min-h-10 w-full rounded-base border border-primary bg-primary px-3 py-2 text-sm font-black text-white transition hover:bg-primary-strong disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-muted disabled:text-muted/70"
                >
                  {isCredentialStatusPending ? copy.credentialStatus.pending : copy.actions.refreshCredentialStatus}
                </button>
                <p className="mt-2 break-words text-xs font-semibold leading-5 text-muted">
                  {copy.credentialStatus.safeBoundary}
                </p>
              </section>

              <section data-operator-ui-flow="local-status-only" className="rounded-base border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-base font-black text-foreground">{copy.sections.operatorFlow}</h2>
                  <span className={["rounded-base border px-2 py-1 text-xs font-black", toneClassName(operatorFlowTone(operatorFlowStatus))].join(" ")}>
                    {copy.operatorFlow[operatorFlowStatus]}
                  </span>
                </div>
                <p className="mt-3 break-words text-sm font-semibold leading-6 text-foreground">
                  {operatorFlowSummary}
                </p>
                <div className="mt-4 grid gap-2">
                  {operatorFlowChecklist.map((step) => (
                    <div key={step.id} className="grid min-w-0 gap-2 rounded-base border border-border bg-background/70 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-black text-foreground">{step.copy.label}</p>
                        <p className="mt-1 break-words text-xs font-semibold leading-5 text-muted">{step.copy.helper}</p>
                      </div>
                      <span className={["w-fit rounded-base border px-2 py-1 text-xs font-black", toneClassName(step.state === "done" ? "normal" : step.state === "gated" ? "warning" : "empty")].join(" ")}>
                        {copy.operatorFlow.stepState[step.state]}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid gap-2 rounded-base border border-border bg-background/70 p-3 text-xs font-semibold leading-5 text-muted">
                  <p className="break-words">{copy.operatorFlow.noLiveExecution}</p>
                  <p className="break-words">{copy.operatorFlow.commandBoundary}</p>
                </div>
              </section>

              <section data-comment-translator-pre-public-diagnostics="count-only" className="rounded-base border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-base font-black text-foreground">
                    {locale === "ja" ? "Pre-public diagnostics" : "Pre-public diagnostics"}
                  </h2>
                  <span className="rounded-base border border-border bg-background px-2 py-1 text-xs font-black text-muted">
                    count-only
                  </span>
                </div>
                <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  {prePublicDiagnosticCounts.map((item) => (
                    <div key={item.label} className="grid min-w-0 gap-1 rounded-base border border-border bg-background/70 p-2">
                      <dt className="min-w-0 break-words text-xs font-bold text-muted">{item.label}</dt>
                      <dd className="min-w-0 break-words text-base font-black text-foreground">{formatNumber(item.value)}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section className="rounded-base border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-base font-black text-foreground">{copy.sections.quota}</h2>
                  <span className={["rounded-base border px-2 py-1 text-xs font-black", toneClassName(localizedQuotaPreview.tone)].join(" ")}>
                    {localizedQuotaPreview.statusLabel}
                  </span>
                </div>
                <div className="mt-4 grid gap-3">
                  <ControlSelect
                    label={copy.controls.mockState}
                    value={quotaScenarioId}
                    options={quotaScenarioOptions}
                    onChange={(value) => setQuotaScenarioId(value as CommentTranslatorQuotaScenarioId)}
                  />
                  <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${quotaPercent}%` }} />
                  </div>
                  <p className="break-words text-xs font-semibold leading-5 text-muted">{localizedQuotaPreview.helper}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <StatTile label={copy.stats.quota} value={`${formatNumber(effectiveUsedUnits)} / ${formatNumber(localizedQuotaPreview.limitUnits)}`} helper={`${quotaPercent}% ${copy.stats.used}`} />
                    <StatTile label={copy.stats.cacheHit} value={`${effectiveCacheHitRate}%`} helper={`${formatNumber(liveStats.cacheHits)} ${copy.stats.hits}`} />
                    <StatTile label={copy.stats.cacheMiss} value={formatNumber(liveStats.cacheMisses)} helper={copy.stats.fixtureMisses} />
                    <StatTile label={copy.stats.errorRows} value={formatNumber(liveStats.errors)} helper={copy.stats.recoverable} />
                  </div>
                </div>
              </section>

              <section className="rounded-base border border-border bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-black text-foreground">{copy.sections.manualInput}</h2>
                    <p className="mt-1 break-words text-xs font-semibold leading-5 text-muted">
                      {copy.manualInput.helper}
                    </p>
                  </div>
                  <span className="rounded-base border border-cyan-200 bg-cyan-50 px-2 py-1 text-xs font-black text-cyan-700">
                    {manualComments.length} {copy.stats.manualRows}
                  </span>
                </div>
                <form
                  className="mt-4 grid gap-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    addManualComments();
                  }}
                >
                  <label className="grid min-w-0 gap-1.5 text-sm">
                    <span className="text-xs font-black uppercase tracking-normal text-muted">
                      {copy.controls.singleComment}
                    </span>
                    <input
                      ref={singleCommentInputRef}
                      value={singleCommentDraft}
                      onChange={(event) => setSingleCommentDraft(event.target.value)}
                      placeholder={copy.manualInput.singlePlaceholder}
                      className="min-h-10 w-full min-w-0 rounded-base border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground shadow-sm placeholder:text-muted hover:border-primary/60 focus:border-primary"
                    />
                  </label>
                  <label className="grid min-w-0 gap-1.5 text-sm">
                    <span className="text-xs font-black uppercase tracking-normal text-muted">
                      {copy.controls.multilinePaste}
                    </span>
                    <textarea
                      ref={multilinePasteInputRef}
                      rows={4}
                      value={multilinePasteDraft}
                      onChange={(event) => setMultilinePasteDraft(event.target.value)}
                      placeholder={copy.manualInput.pastePlaceholder}
                      className="w-full min-w-0 resize-y rounded-base border border-border bg-background px-3 py-2 text-sm font-semibold leading-6 text-foreground shadow-sm placeholder:text-muted hover:border-primary/60 focus:border-primary"
                    />
                  </label>
                  <ControlSelect
                    label={copy.controls.manualResult}
                    value={manualResultMode}
                    options={manualResultOptions}
                    onChange={(value) => setManualResultMode(value as CommentTranslatorManualResultMode)}
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button type="submit" className="min-h-10 rounded-base border border-primary bg-primary px-3 py-2 text-sm font-black text-white transition hover:bg-primary-strong">
                      {copy.actions.addManualComments}
                    </button>
                    <button type="button" onClick={insertManualSamples} className="min-h-10 rounded-base border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-black text-cyan-700 transition hover:border-cyan-300 hover:bg-cyan-100">
                      {copy.actions.insertSample}
                    </button>
                    <button type="button" onClick={clearManualDraft} className="min-h-10 rounded-base border border-border bg-background px-3 py-2 text-sm font-black text-muted transition hover:border-primary/60 hover:bg-primary-soft/40">
                      {copy.actions.clearDraft}
                    </button>
                    <button
                      type="button"
                      onClick={clearManualSession}
                      disabled={manualComments.length === 0}
                      className="min-h-10 rounded-base border border-red-200 bg-red-50 px-3 py-2 text-sm font-black text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-muted disabled:text-muted/70"
                    >
                      {copy.actions.clearManualSession}
                    </button>
                  </div>
                </form>
              </section>
            </div>
          </details>
        ) : null}
      </div>
    </div>
  );
}
