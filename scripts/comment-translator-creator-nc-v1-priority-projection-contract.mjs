import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { shortCircuit: true, url: "data:text/javascript,export{}" };
    }
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const candidate = `${fileURLToPath(new URL(specifier, context.parentURL))}.ts`;
      if (fs.existsSync(candidate)) {
        return { shortCircuit: true, url: pathToFileURL(candidate).href };
      }
    }
    return nextResolve(specifier, context);
  }
});

const priority = await import("../lib/comment-translator-priority-classification.ts");
const normalization = await import("../lib/comment-translator-live-message-normalization.ts");
const feedProjection = await import("../lib/comment-translator-real-comments-ui-wiring.ts");
const sharedFeed = await import("../lib/comment-translator-real-comments-feed-shared.ts");
const historyProjection = await import("../lib/comment-translator-creator-history-projection.ts");

const classify = priority.resolveCommentTranslatorPriorityClassification;
const matchingPurchase = (kind) => ({ kind, amountDisplayString: "safe-display", tier: 1 });

const expected = {
  "super-chat": { category: "super-chat", lane: "priority", rank: 0, badgeLabel: "Super Chat" },
  "super-sticker": { category: "super-sticker", lane: "priority", rank: 1, badgeLabel: "Super Sticker" },
  owner: { category: "owner", lane: "priority", rank: 2, badgeLabel: "Owner" },
  moderator: { category: "moderator", lane: "priority", rank: 3, badgeLabel: "Moderator" },
  member: { category: "member", lane: "priority", rank: 4, badgeLabel: "Member" },
  standard: { category: "standard", lane: "standard", rank: 5, badgeLabel: null }
};

assert.deepEqual(classify({ kind: "super-chat", role: "owner", purchase: matchingPurchase("super-chat"), member: null }), expected["super-chat"]);
assert.deepEqual(classify({ kind: "super-sticker", role: "moderator", purchase: matchingPurchase("super-sticker"), member: null }), expected["super-sticker"]);
assert.deepEqual(classify({ kind: "text", role: "owner", purchase: null, member: null }), expected.owner);
assert.deepEqual(classify({ kind: "text", role: "moderator", purchase: null, member: null }), expected.moderator);
assert.deepEqual(classify({ kind: "member", role: "viewer", purchase: null, member: { monthCount: null } }), expected.member);
assert.deepEqual(classify({ kind: "text", role: "member", purchase: null, member: null }), expected.member);
assert.deepEqual(
  classify({ kind: "super-chat", role: "viewer", purchase: matchingPurchase("super-sticker"), member: null }),
  expected.standard,
  "mismatched event metadata cannot invent a paid priority event"
);
assert.deepEqual(
  classify({ kind: "super-chat", role: "owner", purchase: null, member: null }),
  expected.standard,
  "a paid event requires a matching structured purchase signal"
);
assert.deepEqual(
  classify({ kind: "member", role: "viewer", purchase: null, member: {} }),
  expected.standard,
  "a member event requires the normalized structured member signal"
);
assert.deepEqual(
  classify({
    kind: "system",
    role: "viewer",
    purchase: null,
    member: null,
    system: { subtype: "new-sponsor" },
    moderation: { visibility: "system" }
  }),
  expected.member,
  "the normalized new-sponsor system event is a member priority signal"
);
assert.deepEqual(
  classify({
    kind: "system",
    role: "owner",
    purchase: null,
    member: null,
    system: { subtype: "new-sponsor" },
    moderation: { visibility: "system" }
  }),
  expected.owner,
  "higher canonical owner precedence wins over a structured member system event"
);
assert.deepEqual(
  classify({ kind: "deleted", role: "owner", purchase: matchingPurchase("super-chat"), member: {} }),
  expected.standard,
  "deleted rows remain tombstones and never enter the priority lane"
);
assert.deepEqual(
  classify({ kind: "unknown", role: "owner-ish", purchase: matchingPurchase("super-chat"), member: {} }),
  expected.standard,
  "unknown or malformed rows fail safe"
);
assert.deepEqual(priority.readCommentTranslatorProjectedPriority(undefined), expected.standard);
assert.deepEqual(
  priority.readCommentTranslatorProjectedPriority({ category: "owner", lane: "priority", rank: 0, badgeLabel: "Owner" }),
  expected.standard,
  "inconsistent projections downgrade to standard"
);
assert.equal(priority.readCommentTranslatorPriorityFilter("priority"), "priority");
assert.equal(priority.readCommentTranslatorPriorityFilter("owner"), "all", "browser input cannot select a classification");
assert.deepEqual(
  priority.filterCommentTranslatorPriorityRows(
    [{ id: "legacy" }, { id: "malformed", priority: { category: "owner", lane: "priority", rank: 0, badgeLabel: "Owner" } }],
    "priority"
  ),
  [],
  "legacy and malformed projections cannot enter the priority lane"
);

const normalized = normalization.normalizeCommentTranslatorLiveMessages({
  providerPayloads: [
    {
      id: "super-chat-owner",
      snippet: {
        type: "superChatEvent",
        publishedAt: "2026-08-03T00:00:00.000Z",
        superChatDetails: { userComment: "safe original", amountDisplayString: "safe purchase", tier: 3 }
      },
      authorDetails: { isChatOwner: true, isChatModerator: true, isChatSponsor: true, displayName: "Safe creator" }
    },
    {
      id: "malformed-booleans",
      snippet: { type: "textMessageEvent", publishedAt: "2026-08-03T00:01:00.000Z", textMessageDetails: { messageText: "ordinary" } },
      authorDetails: { isChatOwner: "true", isChatModerator: 1, isChatSponsor: {}, displayName: "Safe viewer" }
    },
    {
      id: "new-member",
      snippet: { type: "newSponsorEvent", publishedAt: "2026-08-03T00:02:00.000Z", displayMessage: "new member", newSponsorDetails: {} },
      authorDetails: { isChatSponsor: true, displayName: "Safe member" }
    },
    {
      id: "deleted-super-chat",
      snippet: { type: "messageDeletedEvent", publishedAt: "2026-08-03T00:03:00.000Z", messageDeletedDetails: { deletedMessageId: "super-chat-owner" } },
      authorDetails: { isChatOwner: true }
    }
  ]
});
const browserRows = normalization.projectCommentTranslatorNormalizedLiveMessagesForBrowser(normalized.normalizedMessages);
assert.equal(browserRows[0].priority.category, "super-chat");
assert.equal(browserRows[1].role, "viewer", "only literal true role signals are accepted");
assert.equal(browserRows[1].priority.category, "standard");
assert.equal(browserRows[2].priority.category, "member");
assert.equal(browserRows[3].moderationLabel, "deleted");
assert.equal(browserRows[3].text, null);
assert.equal(browserRows[3].priority.category, "standard");

const malformedProviderRows = normalization.projectCommentTranslatorNormalizedLiveMessagesForBrowser(
  normalization.normalizeCommentTranslatorLiveMessages({
    providerPayloads: [
      {
        id: "unknown-owner-event",
        snippet: { type: "futureProviderEvent", publishedAt: "2026-08-03T00:04:00.000Z", displayMessage: "unknown" },
        authorDetails: { isChatOwner: true }
      },
      {
        id: "missing-text-details",
        snippet: { type: "textMessageEvent", publishedAt: "2026-08-03T00:04:30.000Z", displayMessage: "malformed text" },
        authorDetails: { isChatOwner: true }
      },
      {
        id: "missing-super-chat-details",
        snippet: { type: "superChatEvent", publishedAt: "2026-08-03T00:05:00.000Z", displayMessage: "malformed super chat" },
        authorDetails: { isChatOwner: true }
      },
      {
        id: "missing-member-details",
        snippet: { type: "memberMilestoneChatEvent", publishedAt: "2026-08-03T00:06:00.000Z", displayMessage: "malformed member" },
        authorDetails: { isChatSponsor: true }
      },
      {
        id: "missing-new-sponsor-details",
        snippet: { type: "newSponsorEvent", publishedAt: "2026-08-03T00:07:00.000Z", displayMessage: "malformed sponsor" },
        authorDetails: { isChatSponsor: true }
      }
    ]
  }).normalizedMessages
);
assert.deepEqual(
  malformedProviderRows.map((row) => row.priority.category),
  ["standard", "standard", "standard", "standard", "standard"],
  "unknown or structurally incomplete provider events cannot gain priority through normalization fallbacks"
);

const feed = feedProjection.createCommentTranslatorRealCommentsFeedStateFromBrowserSafeRows({
  rows: browserRows,
  sessionStatus: "active",
  targetLanguage: "ja"
});
assert.equal(feed.rows[0].priority.category, "super-chat");
assert.equal(feed.rows[0].originalText, "safe original");
assert.equal(feed.rows[0].sourceAttributionLabel, "Source: YouTube Live Chat");
assert.equal(feed.rows[3].moderationLabel, "deleted");
assert.equal(feed.rows[3].originalText, null);
assert.equal(feed.rows[3].translatedText, null);
assert.deepEqual(priority.filterCommentTranslatorPriorityRows(feed.rows, "priority").map((row) => row.id), ["super-chat-owner", "new-member"]);

const translatedFeed = {
  ...feed,
  rows: feed.rows.map((row, index) => index === 0 ? { ...row, translatedText: "safe translation", translationStatus: "translated-f10" } : row)
};
const uiComments = sharedFeed.mapCommentTranslatorRealCommentsFeedRowsToUiComments({
  feed: translatedFeed,
  targetLanguageLabel: "Japanese",
  locale: "en",
  timeZone: "UTC"
});
const superChatUiComment = uiComments.find((comment) => comment.priority?.category === "super-chat");
assert.ok(superChatUiComment, "the sorted UI projection retains the Super Chat classification");
assert.equal(superChatUiComment.translatedText, "safe translation");
assert.equal(superChatUiComment.originalText, "safe original");

const history = historyProjection.projectCommentTranslatorCreatorSafeHistoryRow({
  row: translatedFeed.rows[0],
  ownerUserId: "fixture-owner",
  sessionReferenceId: "fixture-session",
  nowMs: Date.parse("2026-08-03T00:05:00.000Z")
});
assert.equal(history.priority.category, "super-chat");
assert.equal(history.translatedText, "safe translation");
assert.equal(history.originalText, "safe original");
assert.equal(history.sourceAttributionLabel, "Source: YouTube Live Chat");

const serialized = JSON.stringify({ feed, history });
for (const forbiddenKey of ["ownerUserId", "sessionReferenceId", "providerChannelId", "liveChatId", "oauth", "token", "secret", "rawProviderBody", "revenueTotal"]) {
  assert.equal(serialized.includes(forbiddenKey), false, `safe projections exclude ${forbiddenKey}`);
}

const sourcePaths = [
  "../components/comment-translator/CommentTranslatorFeedPanel.tsx",
  "../components/comment-translator/CommentTranslatorCreatorHistoryPanel.tsx",
  "../components/comment-translator/CommentTranslatorObsOverlay.tsx",
  "../components/comment-translator/CommentTranslatorModeratorShare.tsx"
];
const surfaceSources = sourcePaths.map((path) => fs.readFileSync(new URL(path, import.meta.url), "utf8"));
for (const source of surfaceSources) {
  assert.match(source, /priority/i, "every safe surface consumes the shared priority projection");
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|searchParams|revenueTotal|ownerUserId|liveChatId|providerChannelId|tokenDigest|capabilityDigest|console\./i);
}
assert.match(surfaceSources[0], /priorityFilter/, "Creator feed has a presentation-only filter");
assert.match(surfaceSources[0], /priorityFilteredCommentCount/, "Creator feed distinguishes priority-empty from later search or status filtering");
assert.match(surfaceSources[1], /priorityFilter/, "history has a presentation-only filter");
assert.match(surfaceSources[2], /readCommentTranslatorProjectedPriority/, "OBS renders only validated shared classification");
assert.match(surfaceSources[3], /priorityFilter/, "moderator view has a presentation-only filter");

console.log("comment translator Creator NC-V1 priority projection contract passed");
