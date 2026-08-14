export {};

type CommentTranslatorClientFeed = {
  readonly status: string;
  readonly rows: readonly unknown[];
};

type CommentTranslatorClientSessionState = {
  readonly status: string;
};

export function resolveCommentTranslatorTerminalFeedResponse<Feed extends CommentTranslatorClientFeed>({
  currentFeed,
  refreshedFeed,
  sessionState
}: {
  readonly currentFeed: Feed;
  readonly refreshedFeed: Feed;
  readonly sessionState: CommentTranslatorClientSessionState | null | undefined;
}): Feed {
  const isTerminal = sessionState?.status === "stopped" || sessionState?.status === "fail-closed";
  const responseHasNoReadyRows = refreshedFeed.status !== "ready" && refreshedFeed.rows.length === 0;
  const preserveExistingRows = responseHasNoReadyRows && currentFeed.rows.length > 0
    && (isTerminal || refreshedFeed.status === "unavailable");
  return preserveExistingRows
    ? currentFeed
    : refreshedFeed;
}
