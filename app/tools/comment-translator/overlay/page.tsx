import type { Metadata } from "next";
import { cookies } from "next/headers";
import { CommentTranslatorObsOverlay } from "@/components/comment-translator/CommentTranslatorObsOverlay";
import {
  commentTranslatorCreatorObsOverlayBrowserSessionCookieName
} from "@/lib/comment-translator-creator-obs-overlay-browser-session-cookie";
import {
  authorizeCommentTranslatorCreatorObsOverlayBrowserSession
} from "@/lib/comment-translator-creator-obs-overlay-browser-session-runtime";
import {
  createTrustedCommentTranslatorCreatorObsOverlayBrowserSessionStore
} from "@/lib/comment-translator-creator-obs-overlay-browser-session-store";
import {
  createCommentTranslatorCreatorObsOverlaySessionAuthority,
  isCommentTranslatorCreatorObsOverlayBrowserRouteClosed
} from "@/lib/comment-translator-creator-obs-overlay-session-authority";
import {
  createCommentTranslatorCreatorObsTokenRuntime
} from "@/lib/comment-translator-creator-obs-token-runtime";
import {
  createTrustedCommentTranslatorCreatorObsTokenStore
} from "@/lib/comment-translator-creator-obs-token-store";
import {
  createTrustedCommentTranslatorSessionSupabaseStore
} from "@/lib/comment-translator-durable-session-store";
import {
  createTrustedCommentTranslatorRealCommentsFeedDurableStore
} from "@/lib/comment-translator-real-comments-feed-durable-store";
import {
  readCommentTranslatorRealCommentsFeedForActiveSession
} from "@/lib/comment-translator-real-comments-feed-session-bridge";
import {
  createUnavailableCommentTranslatorRealCommentsFeedState
} from "@/lib/comment-translator-real-comments-feed-shared";

export const metadata: Metadata = {
  title: "Comment Translator OBS Overlay",
  robots: { index: false, follow: false }
};

export const dynamic = "force-dynamic";

export default async function CommentTranslatorObsOverlayPage() {
  if (isCommentTranslatorCreatorObsOverlayBrowserRouteClosed()) {
    return <CommentTranslatorObsOverlay feed={unavailableFeed()} />;
  }
  const browserSessionStoreResult = createTrustedCommentTranslatorCreatorObsOverlayBrowserSessionStore();
  const tokenStoreResult = createTrustedCommentTranslatorCreatorObsTokenStore();
  const sessionAuthority = createCommentTranslatorCreatorObsOverlaySessionAuthority();
  const tokenRuntime = createCommentTranslatorCreatorObsTokenRuntime({
    tokenStore: tokenStoreResult.status === "ready" ? tokenStoreResult.store : null,
    sessionAuthority
  });
  const cookieStore = await cookies();
  const authorization = await authorizeCommentTranslatorCreatorObsOverlayBrowserSession({
    capability: cookieStore.get(commentTranslatorCreatorObsOverlayBrowserSessionCookieName)?.value ?? "",
    tokenRuntime,
    browserSessionStore: browserSessionStoreResult.status === "ready" ? browserSessionStoreResult.store : null,
    nowMs: Date.now()
  });
  if (authorization.status !== "authorized") {
    return <CommentTranslatorObsOverlay feed={unavailableFeed()} />;
  }

  const durableSessionStore = createTrustedCommentTranslatorSessionSupabaseStore();
  const durableFeedStore = createTrustedCommentTranslatorRealCommentsFeedDurableStore();
  if (durableSessionStore.status !== "ready" || durableFeedStore.status !== "ready") {
    return <CommentTranslatorObsOverlay feed={unavailableFeed()} />;
  }

  try {
    const activeSession = await durableSessionStore.store.readActiveSession({
      ownerUserId: authorization.ownerUserId
    });
    if (!activeSession || activeSession.sessionReferenceId !== authorization.sessionReferenceId) {
      return <CommentTranslatorObsOverlay feed={unavailableFeed()} />;
    }
    const feed = await readCommentTranslatorRealCommentsFeedForActiveSession({
      callerAuthorization: { status: "authorized", ownerUserId: authorization.ownerUserId },
      activeSession,
      durableFeedStore
    });
    return <CommentTranslatorObsOverlay feed={feed.status === "ready" ? feed : unavailableFeed()} />;
  } catch {
    return <CommentTranslatorObsOverlay feed={unavailableFeed()} />;
  }
}

function unavailableFeed() {
  return createUnavailableCommentTranslatorRealCommentsFeedState({
    reason: "session-not-active"
  });
}
