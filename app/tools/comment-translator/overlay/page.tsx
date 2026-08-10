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
import {
  commentTranslatorCreatorObsOverlayTemplateCookieName,
  commentTranslatorCreatorObsOverlayTemplateDefault,
  readCommentTranslatorCreatorObsOverlayTemplate
} from "@/lib/comment-translator-creator-obs-overlay-template";

export const metadata: Metadata = {
  title: "Comment Translator OBS Overlay",
  robots: { index: false, follow: false }
};

export const dynamic = "force-dynamic";

export default async function CommentTranslatorObsOverlayPage() {
  const routeClosed = isCommentTranslatorCreatorObsOverlayBrowserRouteClosed();
  const feed = await loadAuthorizedObsFeed();
  const template = routeClosed
    ? commentTranslatorCreatorObsOverlayTemplateDefault
    : readCommentTranslatorCreatorObsOverlayTemplate((await cookies()).get(commentTranslatorCreatorObsOverlayTemplateCookieName)?.value);
  return <CommentTranslatorObsOverlay feed={feed} template={template} />;
}

async function loadAuthorizedObsFeed() {
  if (isCommentTranslatorCreatorObsOverlayBrowserRouteClosed()) {
    return unavailableFeed();
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
    return unavailableFeed();
  }

  const durableSessionStore = createTrustedCommentTranslatorSessionSupabaseStore();
  const durableFeedStore = createTrustedCommentTranslatorRealCommentsFeedDurableStore();
  if (durableSessionStore.status !== "ready" || durableFeedStore.status !== "ready") {
    return unavailableFeed();
  }

  try {
    const activeSession = await durableSessionStore.store.readActiveSession({
      ownerUserId: authorization.ownerUserId
    });
    if (!activeSession || activeSession.sessionReferenceId !== authorization.sessionReferenceId) {
      return unavailableFeed();
    }
    const feed = await readCommentTranslatorRealCommentsFeedForActiveSession({
      callerAuthorization: { status: "authorized", ownerUserId: authorization.ownerUserId },
      activeSession,
      durableFeedStore
    });
    return feed.status === "ready" ? feed : unavailableFeed();
  } catch {
    return unavailableFeed();
  }
}

function unavailableFeed() {
  return createUnavailableCommentTranslatorRealCommentsFeedState({
    reason: "session-not-active"
  });
}
