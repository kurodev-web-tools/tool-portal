import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  CommentTranslatorModeratorShare,
  CommentTranslatorModeratorShareUnavailable
} from "@/components/comment-translator/CommentTranslatorModeratorShare";
import { createTrustedCommentTranslatorSessionSupabaseStore } from "@/lib/comment-translator-durable-session-store";
import { commentTranslatorModeratorShareBrowserSessionCookieName } from "@/lib/comment-translator-moderator-share-browser-session-cookie";
import { authorizeCommentTranslatorModeratorShareBrowserSession } from "@/lib/comment-translator-moderator-share-browser-session-runtime";
import { createTrustedCommentTranslatorModeratorShareBrowserSessionStore } from "@/lib/comment-translator-moderator-share-browser-session-store";
import { createCommentTranslatorModeratorShareSessionAuthority } from "@/lib/comment-translator-moderator-share-session-authority";
import { createTrustedCommentTranslatorModeratorShareTokenSupabaseStore } from "@/lib/comment-translator-moderator-share-token-store";
import { createTrustedCommentTranslatorRealCommentsFeedDurableStore } from "@/lib/comment-translator-real-comments-feed-durable-store";
import { readCommentTranslatorRealCommentsFeedForActiveSession } from "@/lib/comment-translator-real-comments-feed-session-bridge";
import type { CommentTranslatorRealCommentsFeedState } from "@/lib/comment-translator-real-comments-feed-shared";

export const metadata: Metadata = {
  title: "Moderator Share | Kuro Live Comment Translator",
  description: "A read-only translated comment feed shared by a creator."
};

export const dynamic = "force-dynamic";

export default async function CommentTranslatorModeratorSharePage() {
  const result = await loadAuthorizedModeratorFeed();
  return result.feed
    ? <CommentTranslatorModeratorShare feed={result.feed} />
    : <CommentTranslatorModeratorShareUnavailable showCredentialForm={result.showCredentialForm} />;
}

type ModeratorFeedLoadResult =
  | { readonly feed: CommentTranslatorRealCommentsFeedState; readonly showCredentialForm: false }
  | { readonly feed: null; readonly showCredentialForm: boolean };

async function loadAuthorizedModeratorFeed(): Promise<ModeratorFeedLoadResult> {
  const cookieStore = await cookies();
  const capability = cookieStore.get(commentTranslatorModeratorShareBrowserSessionCookieName)?.value ?? "";
  const tokenStoreResult = createTrustedCommentTranslatorModeratorShareTokenSupabaseStore();
  const tokenStore = tokenStoreResult.status === "ready" ? tokenStoreResult.store : null;
  const durableSessionStore = createTrustedCommentTranslatorSessionSupabaseStore();
  const sessionAuthority = createCommentTranslatorModeratorShareSessionAuthority({
    durableSessionStore,
    tokenStore
  });
  const authorization = await authorizeCommentTranslatorModeratorShareBrowserSession({
    capability,
    sessionAuthority,
    tokenStore,
    browserSessionStore: createTrustedCommentTranslatorModeratorShareBrowserSessionStore(),
    nowMs: Date.now()
  });
  if (authorization.status !== "authorized") {
    return { feed: null, showCredentialForm: true };
  }
  if (durableSessionStore.status !== "ready") {
    return { feed: null, showCredentialForm: false };
  }

  try {
    const activeSession = await durableSessionStore.store.readActiveSession({
      ownerUserId: authorization.ownerUserId
    });
    if (!activeSession || activeSession.sessionReferenceId !== authorization.sessionReferenceId) {
      return { feed: null, showCredentialForm: false };
    }
    const feed = await readCommentTranslatorRealCommentsFeedForActiveSession({
      callerAuthorization: { status: "authorized", ownerUserId: authorization.ownerUserId },
      activeSession,
      durableFeedStore: createTrustedCommentTranslatorRealCommentsFeedDurableStore()
    });
    return { feed, showCredentialForm: false };
  } catch {
    return { feed: null, showCredentialForm: false };
  }
}
