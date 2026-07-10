"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  clearCommentTranslatorPreviewFeedAction,
  getCommentTranslatorRealCommentsFeedAction,
  getCommentTranslatorSessionStatusAction,
  heartbeatCommentTranslatorSessionAction,
  restoreCommentTranslatorPersistedRealCommentsFeedAction,
  startCommentTranslatorSessionAction,
  stopCommentTranslatorSessionAction
} from "@/app/tools/comment-translator/actions";
import type { CommentTranslatorSourceLanguageId, CommentTranslatorTargetLanguageId } from "@/lib/comment-translator";
import { createUnavailableCommentTranslatorRealCommentsFeedState, type CommentTranslatorRealCommentsFeedState } from "@/lib/comment-translator-real-comments-feed-shared";
import type { OperatorSessionState } from "./comment-translator-dock-model";

const autoRefreshIntervalMs = 15_000;
type RuntimeMode = "live" | "dev-fixture";

export function useCommentTranslatorSessionFeedController({ sourceLanguage, targetLanguage, locale, actionFailedCopy, initialSessionState, initialRealCommentsFeed, runtimeMode }: {
  readonly sourceLanguage: CommentTranslatorSourceLanguageId;
  readonly targetLanguage: CommentTranslatorTargetLanguageId;
  readonly locale: "ja" | "en";
  readonly actionFailedCopy: string;
  readonly initialSessionState: OperatorSessionState;
  readonly initialRealCommentsFeed: CommentTranslatorRealCommentsFeedState;
  readonly runtimeMode: RuntimeMode;
}) {
  const [sessionState, setSessionState] = useState(initialSessionState);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [realCommentsFeed, setRealCommentsFeed] = useState(initialRealCommentsFeed);
  const [realCommentsFeedError, setRealCommentsFeedError] = useState<string | null>(null);
  const [isSessionPending, startSessionTransition] = useTransition();
  const [isRealCommentsFeedPending, startRealCommentsFeedTransition] = useTransition();
  const refreshInFlightRef = useRef(false);

  const runSessionCommand = useCallback((intent: "status" | "start" | "stop" | "heartbeat") => {
    if (runtimeMode === "dev-fixture") return;
    startSessionTransition(async () => {
      try {
        const state = intent === "start" ? await startCommentTranslatorSessionAction({ sourceLanguage, targetLanguage }) : intent === "stop" ? await stopCommentTranslatorSessionAction() : intent === "heartbeat" ? await heartbeatCommentTranslatorSessionAction({ sourceLanguage, targetLanguage }) : await getCommentTranslatorSessionStatusAction({ sourceLanguage, targetLanguage });
        setSessionState(state);
        if (intent === "start" && state.status === "active") {
          setRealCommentsFeed(createUnavailableCommentTranslatorRealCommentsFeedState({ reason: "session-not-active" }));
          setRealCommentsFeedError(null);
        }
        setSessionError(null);
      } catch {
        setSessionError(actionFailedCopy);
      }
    });
  }, [actionFailedCopy, runtimeMode, sourceLanguage, targetLanguage]);

  const refreshSessionState = useCallback(() => {
    runSessionCommand(sessionState.status === "active" ? "heartbeat" : "status");
  }, [runSessionCommand, sessionState.status]);

  useEffect(() => {
    if (runtimeMode === "dev-fixture") return;
    let cancelled = false;
    startSessionTransition(async () => {
      try {
        const state = await getCommentTranslatorSessionStatusAction({ sourceLanguage, targetLanguage });
        if (cancelled) return;
        setSessionState(state);
        if (state.status === "active") {
          const feed = await restoreCommentTranslatorPersistedRealCommentsFeedAction({ sourceLanguage, targetLanguage });
          if (cancelled) return;
          setRealCommentsFeed(feed);
        } else {
          setRealCommentsFeed((current) => current.rows.length > 0 ? current : createUnavailableCommentTranslatorRealCommentsFeedState({ reason: "session-not-active" }));
        }
        setRealCommentsFeedError(null);
        setSessionError(null);
      } catch {
        if (!cancelled) setSessionError(actionFailedCopy);
      }
    });
    return () => { cancelled = true; };
  }, [actionFailedCopy, runtimeMode, sourceLanguage, targetLanguage]);

  const refreshRealCommentsFeed = useCallback(() => {
    if (runtimeMode === "dev-fixture" || refreshInFlightRef.current) return;
    if (sessionState.status !== "active") {
      setRealCommentsFeed((current) => current.rows.length > 0 ? current : createUnavailableCommentTranslatorRealCommentsFeedState({ reason: "session-not-active" }));
      setRealCommentsFeedError(null);
      return;
    }
    refreshInFlightRef.current = true;
    startRealCommentsFeedTransition(async () => {
      try {
        const refreshedSession = await heartbeatCommentTranslatorSessionAction({ sourceLanguage, targetLanguage });
        setSessionState(refreshedSession);
        if (refreshedSession.status !== "active") {
          setRealCommentsFeed((current) => current.rows.length > 0 ? current : createUnavailableCommentTranslatorRealCommentsFeedState({ reason: "session-not-active" }));
          setRealCommentsFeedError(null);
          return;
        }
        setRealCommentsFeed(await getCommentTranslatorRealCommentsFeedAction({ sourceLanguage, targetLanguage }));
        setRealCommentsFeedError(null);
      } catch {
        setRealCommentsFeedError(locale === "ja" ? "コメント状態を更新できませんでした" : "Could not refresh comments");
      } finally {
        refreshInFlightRef.current = false;
      }
    });
  }, [locale, runtimeMode, sessionState.status, sourceLanguage, targetLanguage]);

  const clearRetainedPreviewFeed = useCallback(() => {
    if (runtimeMode === "dev-fixture") return;
    startRealCommentsFeedTransition(async () => {
      try {
        setRealCommentsFeed(await clearCommentTranslatorPreviewFeedAction({ sessionReferenceId: sessionState.sessionReferenceId }));
        setRealCommentsFeedError(null);
      } catch {
        setRealCommentsFeedError(locale === "ja" ? "プレビューをクリアできませんでした" : "Could not clear preview");
      }
    });
  }, [locale, runtimeMode, sessionState.sessionReferenceId]);

  useEffect(() => {
    if (runtimeMode === "dev-fixture" || sessionState.status !== "active") return;
    const intervalId = window.setInterval(refreshRealCommentsFeed, autoRefreshIntervalMs);
    return () => clearInterval(intervalId);
  }, [refreshRealCommentsFeed, runtimeMode, sessionState.status]);

  return { sessionState, sessionError, realCommentsFeed, realCommentsFeedError, isSessionPending, isRealCommentsFeedPending, runSessionCommand, refreshSessionState, refreshRealCommentsFeed, clearRetainedPreviewFeed };
}
