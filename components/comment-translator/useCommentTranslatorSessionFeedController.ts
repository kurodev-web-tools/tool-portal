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
import { resolveCommentTranslatorAutoPollingDisposition } from "@/lib/comment-translator-session-auto-polling-disposition";
import { createCommentTranslatorSessionResponseGeneration } from "@/lib/comment-translator-session-response-generation";
import type { OperatorSessionState } from "./comment-translator-dock-model";
import { resolveCommentTranslatorTerminalFeedResponse } from "./comment-translator-terminal-feed-response";
import {
  projectActivePaidFailClosedSessionState,
  projectCommentTranslatorPreAuthorityFailClosedSessionState
} from "./comment-translator-pre-authority-rate-limit-projection";

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
  const feedRequestIdRef = useRef(0);
  const sessionCommandInFlightRef = useRef(false);
  const sessionCommandRequestIdRef = useRef(0);
  const sessionResponseGenerationRef = useRef(createCommentTranslatorSessionResponseGeneration());
  const sessionStateRef = useRef(sessionState);
  const [autoPollingDisposition, setAutoPollingDisposition] = useState<"continue" | "halted">(
    resolveCommentTranslatorAutoPollingDisposition(initialSessionState)
  );
  const autoPollingDispositionRef = useRef(autoPollingDisposition);

  const applySessionState = useCallback((state: OperatorSessionState) => {
    sessionStateRef.current = state;
    setSessionState(state);
  }, []);

  const failActivePaidAction = useCallback(() => {
    const current = sessionStateRef.current;
    if (current.status !== "active" || current.plan !== "paid") return false;
    applySessionState(projectActivePaidFailClosedSessionState(current));
    autoPollingDispositionRef.current = "halted";
    setAutoPollingDisposition("halted");
    setSessionError(actionFailedCopy);
    return true;
  }, [actionFailedCopy, applySessionState]);

  const runSessionCommand = useCallback((intent: "status" | "start" | "stop" | "heartbeat") => {
    if (runtimeMode === "dev-fixture") return;
    const sessionCommand = sessionResponseGenerationRef.current.tryBeginSessionCommand("user-command");
    if (!sessionCommand) return;
    const { responseGeneration, requestId: sessionCommandRequestId } = sessionCommand;
    sessionCommandRequestIdRef.current = sessionCommandRequestId;
    sessionCommandInFlightRef.current = true;
    feedRequestIdRef.current += 1;
    refreshInFlightRef.current = false;
    startSessionTransition(async () => {
      try {
        const state = intent === "start" ? await startCommentTranslatorSessionAction({ sourceLanguage, targetLanguage }) : intent === "stop" ? await stopCommentTranslatorSessionAction() : intent === "heartbeat" ? await heartbeatCommentTranslatorSessionAction({ sourceLanguage, targetLanguage }) : await getCommentTranslatorSessionStatusAction({ sourceLanguage, targetLanguage });
        if (!sessionResponseGenerationRef.current.isCurrent(responseGeneration)) return;
        const nextAutoPollingDisposition = resolveCommentTranslatorAutoPollingDisposition(state);
        autoPollingDispositionRef.current = nextAutoPollingDisposition;
        setAutoPollingDisposition(nextAutoPollingDisposition);
        if (state.status === "fail-closed") {
          applySessionState(projectCommentTranslatorPreAuthorityFailClosedSessionState({
            current: sessionStateRef.current,
            failClosed: state
          }));
          setSessionError(actionFailedCopy);
          return;
        }
        applySessionState(state);
        if (intent === "start" && state.status === "active") {
          setRealCommentsFeed(createUnavailableCommentTranslatorRealCommentsFeedState({ reason: "session-not-active" }));
          setRealCommentsFeedError(null);
        }
        setSessionError(null);
      } catch {
        if (!sessionResponseGenerationRef.current.isCurrent(responseGeneration)) return;
        if (!failActivePaidAction()) setSessionError(actionFailedCopy);
      } finally {
        if (
          sessionResponseGenerationRef.current.finishSessionCommand(sessionCommandRequestId)
          && sessionCommandRequestIdRef.current === sessionCommandRequestId
        ) {
          sessionCommandInFlightRef.current = false;
        }
      }
    });
  }, [actionFailedCopy, applySessionState, failActivePaidAction, runtimeMode, sourceLanguage, targetLanguage]);

  const refreshSessionState = useCallback(() => {
    runSessionCommand(sessionState.status === "active" && sessionState.plan !== "paid" ? "heartbeat" : "status");
  }, [runSessionCommand, sessionState.plan, sessionState.status]);

  useEffect(() => {
    if (runtimeMode === "dev-fixture") return;
    let cancelled = false;
    const sessionCommand = sessionResponseGenerationRef.current.tryBeginSessionCommand("initial-status");
    if (!sessionCommand) return;
    const { responseGeneration, requestId: sessionCommandRequestId } = sessionCommand;
    sessionCommandRequestIdRef.current = sessionCommandRequestId;
    sessionCommandInFlightRef.current = true;
    feedRequestIdRef.current += 1;
    refreshInFlightRef.current = false;
    startSessionTransition(async () => {
      try {
        const state = await getCommentTranslatorSessionStatusAction({ sourceLanguage, targetLanguage });
        if (cancelled || !sessionResponseGenerationRef.current.isCurrent(responseGeneration)) return;
        const nextAutoPollingDisposition = resolveCommentTranslatorAutoPollingDisposition(state);
        autoPollingDispositionRef.current = nextAutoPollingDisposition;
        setAutoPollingDisposition(nextAutoPollingDisposition);
        if (state.status === "fail-closed") {
          applySessionState(projectCommentTranslatorPreAuthorityFailClosedSessionState({
            current: sessionStateRef.current,
            failClosed: state
          }));
          setSessionError(actionFailedCopy);
          return;
        }
        applySessionState(state);
        if (state.status === "active") {
          const feed = await restoreCommentTranslatorPersistedRealCommentsFeedAction({ sourceLanguage, targetLanguage });
          if (cancelled || !sessionResponseGenerationRef.current.isCurrent(responseGeneration)) return;
          setRealCommentsFeed(feed);
        } else {
          setRealCommentsFeed((current) => current.rows.length > 0 ? current : createUnavailableCommentTranslatorRealCommentsFeedState({ reason: "session-not-active" }));
        }
        setRealCommentsFeedError(null);
        setSessionError(null);
      } catch {
        if (!cancelled && sessionResponseGenerationRef.current.isCurrent(responseGeneration) && !failActivePaidAction()) setSessionError(actionFailedCopy);
      } finally {
        if (
          sessionResponseGenerationRef.current.finishSessionCommand(sessionCommandRequestId)
          && sessionCommandRequestIdRef.current === sessionCommandRequestId
        ) {
          sessionCommandInFlightRef.current = false;
        }
      }
    });
    return () => { cancelled = true; };
  }, [actionFailedCopy, applySessionState, failActivePaidAction, runtimeMode, sourceLanguage, targetLanguage]);

  const refreshRealCommentsFeed = useCallback(() => {
    if (runtimeMode === "dev-fixture" || autoPollingDispositionRef.current === "halted" || sessionCommandInFlightRef.current || refreshInFlightRef.current) return;
    if (sessionState.status !== "active") {
      setRealCommentsFeed((current) => current.rows.length > 0 ? current : createUnavailableCommentTranslatorRealCommentsFeedState({ reason: "session-not-active" }));
      setRealCommentsFeedError(null);
      return;
    }
    const responseGeneration = sessionResponseGenerationRef.current.capture();
    const feedRequestId = feedRequestIdRef.current + 1;
    feedRequestIdRef.current = feedRequestId;
    refreshInFlightRef.current = true;
    startRealCommentsFeedTransition(async () => {
      try {
        if (sessionState.plan === "paid") {
          // The Paid feed action owns the single heartbeat/live-poll server
          // boundary for this 15-second cycle. Do not add a second Worker
          // request before reading the feed.
          const refreshedFeed = await getCommentTranslatorRealCommentsFeedAction({ sourceLanguage, targetLanguage });
          if (!sessionResponseGenerationRef.current.isCurrent(responseGeneration)) return;
          const refreshedSessionState = "sessionState" in refreshedFeed ? refreshedFeed.sessionState : null;
          setRealCommentsFeed((current) => resolveCommentTranslatorTerminalFeedResponse({
            currentFeed: current,
            refreshedFeed,
            sessionState: refreshedSessionState
          }));
          if ("sessionState" in refreshedFeed && refreshedFeed.sessionState) {
            const nextAutoPollingDisposition = resolveCommentTranslatorAutoPollingDisposition(refreshedFeed.sessionState);
            autoPollingDispositionRef.current = nextAutoPollingDisposition;
            setAutoPollingDisposition(nextAutoPollingDisposition);
            if (refreshedFeed.sessionState.status === "fail-closed") {
              applySessionState(projectCommentTranslatorPreAuthorityFailClosedSessionState({
                current: sessionStateRef.current,
                failClosed: refreshedFeed.sessionState
              }));
              setSessionError(actionFailedCopy);
            } else {
              applySessionState(refreshedFeed.sessionState);
            }
            if (nextAutoPollingDisposition === "halted") {
              setRealCommentsFeedError(null);
              return;
            }
          }
        } else {
          const refreshedSession = await heartbeatCommentTranslatorSessionAction({ sourceLanguage, targetLanguage });
          if (!sessionResponseGenerationRef.current.isCurrent(responseGeneration)) return;
          const nextAutoPollingDisposition = resolveCommentTranslatorAutoPollingDisposition(refreshedSession);
          autoPollingDispositionRef.current = nextAutoPollingDisposition;
          setAutoPollingDisposition(nextAutoPollingDisposition);
          if (refreshedSession.status === "fail-closed") {
            applySessionState(projectCommentTranslatorPreAuthorityFailClosedSessionState({
              current: sessionStateRef.current,
              failClosed: refreshedSession
            }));
            setSessionError(actionFailedCopy);
            setRealCommentsFeedError(null);
            return;
          }
          applySessionState(refreshedSession);
          if (refreshedSession.status !== "active") {
            setRealCommentsFeed((current) => current.rows.length > 0 ? current : createUnavailableCommentTranslatorRealCommentsFeedState({ reason: "session-not-active" }));
            setRealCommentsFeedError(null);
            return;
          }
          const refreshedFeed = await getCommentTranslatorRealCommentsFeedAction({ sourceLanguage, targetLanguage });
          if (!sessionResponseGenerationRef.current.isCurrent(responseGeneration)) return;
          setRealCommentsFeed((current) => resolveCommentTranslatorTerminalFeedResponse({
            currentFeed: current,
            refreshedFeed,
            sessionState: refreshedSession
          }));
        }
        setRealCommentsFeedError(null);
      } catch {
        if (!sessionResponseGenerationRef.current.isCurrent(responseGeneration)) return;
        failActivePaidAction();
        setRealCommentsFeedError(locale === "ja" ? "コメント状態を更新できませんでした" : "Could not refresh comments");
      } finally {
        if (feedRequestIdRef.current === feedRequestId) {
          refreshInFlightRef.current = false;
        }
      }
    });
  }, [actionFailedCopy, applySessionState, autoPollingDisposition, failActivePaidAction, locale, runtimeMode, sessionState.plan, sessionState.status, sourceLanguage, targetLanguage]);

  const clearRetainedPreviewFeed = useCallback(() => {
    if (runtimeMode === "dev-fixture") return;
    const responseGeneration = sessionResponseGenerationRef.current.capture();
    startRealCommentsFeedTransition(async () => {
      try {
        const clearedFeed = await clearCommentTranslatorPreviewFeedAction({ sessionReferenceId: sessionState.sessionReferenceId });
        if (!sessionResponseGenerationRef.current.isCurrent(responseGeneration)) return;
        setRealCommentsFeed(clearedFeed);
        setRealCommentsFeedError(null);
      } catch {
        if (!sessionResponseGenerationRef.current.isCurrent(responseGeneration)) return;
        setRealCommentsFeedError(locale === "ja" ? "プレビューをクリアできませんでした" : "Could not clear preview");
      }
    });
  }, [locale, runtimeMode, sessionState.sessionReferenceId]);

  useEffect(() => {
    if (runtimeMode === "dev-fixture" || autoPollingDisposition === "halted" || sessionState.status !== "active") return;
    const intervalId = window.setInterval(refreshRealCommentsFeed, autoRefreshIntervalMs);
    return () => clearInterval(intervalId);
  }, [autoPollingDisposition, refreshRealCommentsFeed, runtimeMode, sessionState.status]);

  return { sessionState, sessionError, realCommentsFeed, realCommentsFeedError, isSessionPending, isRealCommentsFeedPending, runSessionCommand, refreshSessionState, refreshRealCommentsFeed, clearRetainedPreviewFeed };
}
