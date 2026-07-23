"use server";

import {
  disconnectYouTubeOAuthCredentialAction as disconnectYouTubeOAuthCredential,
  getYouTubeOAuthCredentialStatusAction as getYouTubeOAuthCredentialStatus
} from "./account-actions";
import {
  clearCommentTranslatorPreviewFeedAction as clearCommentTranslatorPreviewFeed,
  getCommentTranslatorRealCommentsFeedAction as getCommentTranslatorRealCommentsFeed,
  restoreCommentTranslatorPersistedRealCommentsFeedAction as restoreCommentTranslatorPersistedRealCommentsFeed
} from "./feed-actions";
import {
  getCommentTranslatorCreatorWaitlistAction as getCommentTranslatorCreatorWaitlist,
  registerCommentTranslatorCreatorWaitlistAction as registerCommentTranslatorCreatorWaitlist,
  requestCommentTranslatorDataDeletionAction as requestCommentTranslatorDataDeletion
} from "./retention-waitlist-actions";
import {
  getCommentTranslatorSessionStatusAction as getCommentTranslatorSessionStatus,
  heartbeatCommentTranslatorSessionAction as heartbeatCommentTranslatorSession,
  startCommentTranslatorSessionAction as startCommentTranslatorSession,
  stopCommentTranslatorSessionAction as stopCommentTranslatorSession
} from "./session-actions";
import {
  getCommentTranslatorCreatorHistoryAction as getCommentTranslatorCreatorHistory
} from "./history-actions";

export async function getYouTubeOAuthCredentialStatusAction() {
  return getYouTubeOAuthCredentialStatus();
}

export async function getCommentTranslatorCreatorHistoryAction() {
  return getCommentTranslatorCreatorHistory();
}

export async function disconnectYouTubeOAuthCredentialAction() {
  return disconnectYouTubeOAuthCredential();
}

export async function clearCommentTranslatorPreviewFeedAction(
  ...args: Parameters<typeof clearCommentTranslatorPreviewFeed>
) {
  return clearCommentTranslatorPreviewFeed(...args);
}

export async function restoreCommentTranslatorPersistedRealCommentsFeedAction(
  ...args: Parameters<typeof restoreCommentTranslatorPersistedRealCommentsFeed>
) {
  return restoreCommentTranslatorPersistedRealCommentsFeed(...args);
}

export async function getCommentTranslatorRealCommentsFeedAction(
  ...args: Parameters<typeof getCommentTranslatorRealCommentsFeed>
) {
  return getCommentTranslatorRealCommentsFeed(...args);
}

export async function requestCommentTranslatorDataDeletionAction() {
  return requestCommentTranslatorDataDeletion();
}

export async function getCommentTranslatorCreatorWaitlistAction() {
  return getCommentTranslatorCreatorWaitlist();
}

export async function registerCommentTranslatorCreatorWaitlistAction() {
  return registerCommentTranslatorCreatorWaitlist();
}

export async function getCommentTranslatorSessionStatusAction(
  ...args: Parameters<typeof getCommentTranslatorSessionStatus>
) {
  return getCommentTranslatorSessionStatus(...args);
}

export async function startCommentTranslatorSessionAction(
  ...args: Parameters<typeof startCommentTranslatorSession>
) {
  return startCommentTranslatorSession(...args);
}

export async function stopCommentTranslatorSessionAction() {
  return stopCommentTranslatorSession();
}

export async function heartbeatCommentTranslatorSessionAction(
  ...args: Parameters<typeof heartbeatCommentTranslatorSession>
) {
  return heartbeatCommentTranslatorSession(...args);
}
