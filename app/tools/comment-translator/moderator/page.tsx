import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  CommentTranslatorModeratorShare,
  type CommentTranslatorModeratorShareFeed
} from "@/components/comment-translator/CommentTranslatorModeratorShare";
import {
  commentTranslatorCreatorModeratorBrowserSessionCookieName
} from "@/lib/comment-translator-creator-moderator-browser-session-cookie";
import {
  authorizeCommentTranslatorCreatorModeratorBrowserSession
} from "@/lib/comment-translator-creator-moderator-browser-session-runtime";
import {
  createTrustedCommentTranslatorCreatorModeratorBrowserSessionStore
} from "@/lib/comment-translator-creator-moderator-browser-session-store";
import {
  createCommentTranslatorCreatorModeratorSessionAuthority,
  isCommentTranslatorCreatorModeratorBrowserRouteClosed
} from "@/lib/comment-translator-creator-moderator-session-authority";
import {
  createCommentTranslatorCreatorModeratorTokenRuntime
} from "@/lib/comment-translator-creator-moderator-token-runtime";
import {
  createTrustedCommentTranslatorCreatorModeratorTokenStore
} from "@/lib/comment-translator-creator-moderator-token-store";
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
  type CommentTranslatorRealCommentsFeedState
} from "@/lib/comment-translator-real-comments-feed-shared";
import { readCommentTranslatorProjectedPriority } from "@/lib/comment-translator-priority-classification";

export const metadata: Metadata = {
  title: "Comment Translator Moderator Share",
  robots: { index: false, follow: false }
};

export const dynamic = "force-dynamic";

export default async function CommentTranslatorModeratorSharePage() {
  const result = await loadAuthorizedModeratorFeed();
  return <CommentTranslatorModeratorShare feed={result.feed} showCredentialForm={result.showCredentialForm} />;
}

type ModeratorFeedLoadResult = {
  readonly feed: CommentTranslatorModeratorShareFeed;
  readonly showCredentialForm: boolean;
};

async function loadAuthorizedModeratorFeed(): Promise<ModeratorFeedLoadResult> {
  if (isCommentTranslatorCreatorModeratorBrowserRouteClosed()) return unavailable(false);
  const browserSessionStoreResult = createTrustedCommentTranslatorCreatorModeratorBrowserSessionStore();
  const tokenStoreResult = createTrustedCommentTranslatorCreatorModeratorTokenStore();
  const durableSessionStore = createTrustedCommentTranslatorSessionSupabaseStore();
  const sessionAuthority = createCommentTranslatorCreatorModeratorSessionAuthority({ durableSessionStore });
  const tokenRuntime = createCommentTranslatorCreatorModeratorTokenRuntime({
    tokenStore: tokenStoreResult.status === "ready" ? tokenStoreResult.store : null,
    sessionAuthority
  });
  const cookieStore = await cookies();
  const authorization = await authorizeCommentTranslatorCreatorModeratorBrowserSession({
    capability: cookieStore.get(commentTranslatorCreatorModeratorBrowserSessionCookieName)?.value ?? "",
    tokenRuntime,
    browserSessionStore: browserSessionStoreResult.status === "ready" ? browserSessionStoreResult.store : null,
    nowMs: Date.now()
  });
  if (authorization.status !== "authorized") {
    return unavailable(authorization.reason === "invalid-credential");
  }
  if (durableSessionStore.status !== "ready") return unavailable(false);
  const durableFeedStore = createTrustedCommentTranslatorRealCommentsFeedDurableStore();
  if (durableFeedStore.status !== "ready") return unavailable(false);

  try {
    const activeSession = await durableSessionStore.store.readActiveSession({
      ownerUserId: authorization.ownerUserId
    });
    if (!activeSession || activeSession.sessionReferenceId !== authorization.sessionReferenceId) return unavailable(false);
    const feed = await readCommentTranslatorRealCommentsFeedForActiveSession({
      callerAuthorization: { status: "authorized", ownerUserId: authorization.ownerUserId },
      activeSession,
      durableFeedStore
    });
    return { feed: projectModeratorSafeFeed(feed), showCredentialForm: false };
  } catch {
    return unavailable(false);
  }
}

function unavailable(showCredentialForm: boolean): ModeratorFeedLoadResult {
  return {
    feed: { status: "unavailable" },
    showCredentialForm
  };
}

function projectModeratorSafeFeed(feed: CommentTranslatorRealCommentsFeedState): CommentTranslatorModeratorShareFeed {
  if (feed.status !== "ready") return { status: "unavailable" };
  return {
    status: "ready",
    rows: feed.rows.map((row) => ({
      authorLabel: row.authorLabel,
      authorDisplayName: row.authorDisplayName,
      originalText: row.originalText,
      translatedText: row.translatedText,
      badgeLabel: row.badgeLabel,
      purchaseLabel: row.purchaseLabel,
      sourceAttributionLabel: row.sourceAttributionLabel,
      translationStatus: row.translationStatus,
      moderationLabel: row.moderationLabel,
      priority: readCommentTranslatorProjectedPriority(row.priority)
    }))
  };
}
