import { cookies } from "next/headers";
import {
  CommentTranslatorObsOverlay,
  CommentTranslatorObsOverlayUnavailable
} from "@/components/comment-translator/CommentTranslatorObsOverlay";
import { createTrustedCommentTranslatorSessionSupabaseStore } from "@/lib/comment-translator-durable-session-store";
import {
  commentTranslatorObsOverlayBrowserSessionCookieName
} from "@/lib/comment-translator-obs-overlay-browser-session-cookie";
import { authorizeCommentTranslatorObsOverlayBrowserSession } from "@/lib/comment-translator-obs-overlay-browser-session-runtime";
import { createTrustedCommentTranslatorObsOverlayBrowserSessionStore } from "@/lib/comment-translator-obs-overlay-browser-session-store";
import { createCommentTranslatorObsOverlaySessionAuthority } from "@/lib/comment-translator-obs-overlay-session-authority";
import { createTrustedCommentTranslatorObsOverlayTokenSupabaseStore } from "@/lib/comment-translator-obs-overlay-token-store";
import { createTrustedCommentTranslatorRealCommentsFeedDurableStore } from "@/lib/comment-translator-real-comments-feed-durable-store";
import { readCommentTranslatorRealCommentsFeedForActiveSession } from "@/lib/comment-translator-real-comments-feed-session-bridge";
import type { CommentTranslatorRealCommentsFeedState } from "@/lib/comment-translator-real-comments-feed-shared";

export const dynamic = "force-dynamic";

export default async function CommentTranslatorObsOverlayPage() {
  const result = await loadAuthorizedOverlayFeed();
  return result.feed
    ? <CommentTranslatorObsOverlay feed={result.feed} />
    : <CommentTranslatorObsOverlayUnavailable showCredentialForm={result.showCredentialForm} />;
}

type OverlayFeedLoadResult =
  | { readonly feed: CommentTranslatorRealCommentsFeedState; readonly showCredentialForm: false }
  | { readonly feed: null; readonly showCredentialForm: boolean };

async function loadAuthorizedOverlayFeed(): Promise<OverlayFeedLoadResult> {
  const cookieStore = await cookies();
  const capability = cookieStore.get(commentTranslatorObsOverlayBrowserSessionCookieName)?.value ?? "";
  const tokenStoreResult = createTrustedCommentTranslatorObsOverlayTokenSupabaseStore();
  const tokenStore = tokenStoreResult.status === "ready" ? tokenStoreResult.store : null;
  const durableSessionStore = createTrustedCommentTranslatorSessionSupabaseStore();
  const sessionAuthority = createCommentTranslatorObsOverlaySessionAuthority({ durableSessionStore, tokenStore });
  const authorization = await authorizeCommentTranslatorObsOverlayBrowserSession({
    capability,
    sessionAuthority,
    tokenStore,
    browserSessionStore: createTrustedCommentTranslatorObsOverlayBrowserSessionStore(),
    nowMs: currentTimeMs()
  });
  if (authorization.status !== "authorized") {
    return { feed: null, showCredentialForm: true };
  }
  const callerAuthorization = { status: "authorized", ownerUserId: authorization.ownerUserId } as const;
  if (durableSessionStore.status !== "ready") {
    return { feed: null, showCredentialForm: false };
  }
  try {
    const activeSession = await durableSessionStore.store.readActiveSession({ ownerUserId: authorization.ownerUserId });
    if (!activeSession || activeSession.sessionReferenceId !== authorization.sessionReferenceId) {
      return { feed: null, showCredentialForm: false };
    }
    const feed = await readCommentTranslatorRealCommentsFeedForActiveSession({
      callerAuthorization,
      activeSession,
      durableFeedStore: createTrustedCommentTranslatorRealCommentsFeedDurableStore()
    });
    return { feed, showCredentialForm: false };
  } catch {
    return { feed: null, showCredentialForm: false };
  }
}

function currentTimeMs(): number {
  return Date.now();
}
