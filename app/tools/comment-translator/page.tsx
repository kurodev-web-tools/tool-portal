import type { Metadata } from "next";
import { CommentTranslatorPrivateLaunchUnavailable } from "@/components/comment-translator/CommentTranslatorPrivateLaunchUnavailable";
import { CommentTranslatorDock } from "@/components/comment-translator/CommentTranslatorDock";
import { PortalShell } from "@/components/portal/PortalShell";
import { readCommentTranslatorPrivateLaunchAccessForAccountSession } from "@/lib/comment-translator-private-launch-access-gate";
import { createUnavailableCommentTranslatorRealCommentsFeedState } from "@/lib/comment-translator-real-comments-ui-wiring";
import { readCommentTranslatorToolCredentialStatusSource } from "@/lib/comment-translator-youtube-tool-credential-source";
import { getAccountSessionState } from "@/lib/supabase/session";

export const metadata: Metadata = {
  title: "Kuro Live Comment Translator",
  description:
    "A YouTube-first comment translation preview that keeps provider reads and AI translation behind explicit session start."
};

export const dynamic = "force-dynamic";

export default async function CommentTranslatorPage() {
  const accountSession = await getAccountSessionState();
  const launchAccess = readCommentTranslatorPrivateLaunchAccessForAccountSession({ accountSession });

  if (launchAccess.status === "blocked") {
    return (
      <PortalShell mode="workspace">
        <CommentTranslatorPrivateLaunchUnavailable surface="tool" access={launchAccess} />
      </PortalShell>
    );
  }

  const youtubeCredentialStatusSource = await readCommentTranslatorToolCredentialStatusSource({ accountSession });
  const initialRealCommentsFeed = createUnavailableCommentTranslatorRealCommentsFeedState({
    reason: "live-provider-polling-not-approved"
  });

  return (
    <PortalShell mode="workspace">
      <CommentTranslatorDock
        youtubeCredentialStatusSource={youtubeCredentialStatusSource}
        initialRealCommentsFeed={initialRealCommentsFeed}
      />
    </PortalShell>
  );
}
