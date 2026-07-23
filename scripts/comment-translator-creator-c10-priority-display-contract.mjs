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

const classify = priority.resolveCommentTranslatorPriorityClassification;
const matchingPurchase = (kind) => ({ kind, amountDisplayString: "safe-display-label", tier: 1 });

assert.deepEqual(
  classify({
    kind: "super-chat",
    role: "owner",
    purchase: matchingPurchase("super-chat"),
    member: null
  }),
  {
    category: "super-chat",
    lane: "priority",
    rank: 0,
    badgeLabel: "Super Chat"
  },
  "revenue event classification wins over simultaneous role signals"
);
assert.equal(
  classify({
    kind: "super-sticker",
    role: "moderator",
    purchase: matchingPurchase("super-sticker"),
    member: null
  }).category,
  "super-sticker",
  "Super Sticker wins over moderator"
);
assert.equal(
  classify({ kind: "text", role: "owner", purchase: null, member: null }).category,
  "owner",
  "owner wins over lower role signals after server normalization"
);
assert.equal(
  classify({ kind: "text", role: "moderator", purchase: null, member: null }).category,
  "moderator"
);
assert.equal(
  classify({ kind: "member", role: "viewer", purchase: null, member: { monthCount: null } }).category,
  "member"
);
assert.equal(
  classify({ kind: "text", role: "member", purchase: null, member: null }).category,
  "member",
  "validated membership role remains a priority signal"
);
assert.deepEqual(
  classify({
    kind: "super-chat",
    role: "viewer",
    purchase: { kind: "super-sticker", amountDisplayString: "mismatch", tier: 1 },
    member: null
  }),
  {
    category: "standard",
    lane: "standard",
    rank: 5,
    badgeLabel: null
  },
  "mismatched event metadata does not invent revenue status"
);
assert.equal(
  classify({ kind: "unknown-event", role: "owner-ish", purchase: matchingPurchase("super-chat"), member: {} }).category,
  "standard",
  "unknown and malformed metadata fails safe"
);
assert.equal(
  classify({ kind: "deleted", role: "owner", purchase: null, member: null }).category,
  "standard",
  "moderation tombstones do not become priority live comments"
);
assert.equal(
  priority.readCommentTranslatorProjectedPriority(undefined).category,
  "standard",
  "pre-C10 feed rows without a priority projection remain browser-safe"
);
assert.equal(
  priority.readCommentTranslatorProjectedPriority({
    category: "owner",
    lane: "priority",
    rank: 0,
    badgeLabel: "Owner"
  }).category,
  "standard",
  "inconsistent projected metadata fails safe instead of inventing priority"
);
assert.deepEqual(
  priority.filterCommentTranslatorPriorityRows(
    [{ id: "legacy" }, { id: "malformed", priority: { category: "owner", lane: "priority", rank: 0, badgeLabel: "Owner" } }],
    "priority"
  ),
  [],
  "missing or inconsistent browser-visible projections cannot enter the priority lane"
);

const normalized = normalization.normalizeCommentTranslatorLiveMessages({
  providerPayloads: [
    {
      id: "priority-super-chat",
      snippet: {
        type: "superChatEvent",
        publishedAt: "2026-07-23T08:00:00.000Z",
        superChatDetails: {
          userComment: "original super chat",
          amountDisplayString: "safe purchase label",
          tier: 3
        }
      },
      authorDetails: {
        isChatOwner: true,
        isChatModerator: true,
        isChatSponsor: true,
        displayName: "Safe creator"
      }
    },
    {
      id: "malformed-role",
      snippet: {
        type: "textMessageEvent",
        publishedAt: "2026-07-23T08:01:00.000Z",
        textMessageDetails: { messageText: "ordinary comment" }
      },
      authorDetails: {
        isChatOwner: "true",
        isChatModerator: 1,
        isChatSponsor: {},
        displayName: "Safe viewer"
      }
    },
    {
      id: "multiple-role-signals",
      snippet: {
        type: "textMessageEvent",
        publishedAt: "2026-07-23T08:01:30.000Z",
        textMessageDetails: { messageText: "creator comment" }
      },
      authorDetails: {
        isChatOwner: true,
        isChatModerator: true,
        isChatSponsor: true,
        displayName: "Safe creator"
      }
    },
    {
      id: "new-member-event",
      snippet: {
        type: "newSponsorEvent",
        publishedAt: "2026-07-23T08:01:45.000Z",
        displayMessage: "new member",
        newSponsorDetails: {}
      },
      authorDetails: {
        isChatSponsor: true,
        displayName: "Safe member"
      }
    },
    {
      id: "deleted-event",
      snippet: {
        type: "messageDeletedEvent",
        publishedAt: "2026-07-23T08:02:00.000Z",
        messageDeletedDetails: { deletedMessageId: "priority-super-chat" }
      },
      authorDetails: { isChatOwner: true }
    }
  ]
});
const browserRows = normalization.projectCommentTranslatorNormalizedLiveMessagesForBrowser(
  normalized.normalizedMessages
);
assert.equal(browserRows[0].priority.category, "super-chat");
assert.equal(browserRows[1].role, "viewer", "non-boolean role metadata does not grant a role");
assert.equal(browserRows[1].priority.category, "standard");
assert.equal(browserRows[2].role, "owner", "owner wins over simultaneous moderator and member role signals");
assert.equal(browserRows[2].priority.category, "owner");
assert.equal(browserRows[3].priority.category, "member", "new sponsor events use the member priority category");
assert.equal(browserRows[4].moderationLabel, "deleted");
assert.equal(browserRows[4].priority.category, "standard");

const feed = feedProjection.createCommentTranslatorRealCommentsFeedStateFromBrowserSafeRows({
  rows: browserRows,
  sessionStatus: "active",
  targetLanguage: "ja"
});
assert.equal(feed.rows[0].priority.category, "super-chat");
assert.equal(feed.rows[0].originalText, "original super chat");
assert.equal(feed.rows[0].sourceAttributionLabel, "Source: YouTube Live Chat");
assert.equal(feed.rows[4].moderationLabel, "deleted");
assert.equal(feed.rows[4].deletionPropagation, "message-reference-tombstone-only");
assert.deepEqual(
  priority.filterCommentTranslatorPriorityRows(feed.rows, "priority").map((row) => row.id),
  ["priority-super-chat", "multiple-role-signals", "new-member-event"],
  "priority filter consumes the server-owned browser-safe classification"
);
assert.equal(priority.filterCommentTranslatorPriorityRows(feed.rows, "all").length, 5);
const { priority: omittedPriority, ...preC10Row } = feed.rows[0];
assert.equal(omittedPriority.category, "super-chat");
assert.equal(
  sharedFeed.mapCommentTranslatorRealCommentsFeedRowsToUiComments({
    feed: { ...feed, rows: [preC10Row] },
    targetLanguageLabel: "Japanese"
  })[0].priorityCategory,
  "standard",
  "pre-C10 safe-feed rows remain displayable without inferring priority"
);

const serializedFeed = JSON.stringify(feed);
for (const forbiddenKey of [
  "ownerUserId",
  "providerChannelId",
  "liveChatId",
  "oauth",
  "token",
  "secret",
  "rawProviderBody"
]) {
  assert.equal(serializedFeed.includes(forbiddenKey), false, `browser-safe priority feed excludes ${forbiddenKey}`);
}

const sharedSource = fs.readFileSync(
  new URL("../lib/comment-translator-real-comments-feed-shared.ts", import.meta.url),
  "utf8"
);
const azureSource = fs.readFileSync(
  new URL("../lib/comment-translator-azure-normal-translation-execution.ts", import.meta.url),
  "utf8"
);
const creatorSource = fs.readFileSync(
  new URL("../components/comment-translator/CommentTranslatorFeedPanel.tsx", import.meta.url),
  "utf8"
);
const obsSource = fs.readFileSync(
  new URL("../components/comment-translator/CommentTranslatorObsOverlay.tsx", import.meta.url),
  "utf8"
);
const moderatorSource = fs.readFileSync(
  new URL("../components/comment-translator/CommentTranslatorModeratorShare.tsx", import.meta.url),
  "utf8"
);

assert.match(sharedSource, /priorityCategory/, "Creator display rows preserve the priority category");
assert.match(azureSource, /\.\.\.row/, "translation projection preserves classified safe-row fields");
assert.match(creatorSource, /priorityFilter/, "Creator feed reuses the existing filter controls");
assert.match(obsSource, /readCommentTranslatorProjectedPriority/, "OBS fail-safely reads the shared category");
assert.match(obsSource, /priority\.badgeLabel/, "OBS renders the validated shared category badge");
assert.match(moderatorSource, /priorityFilter/, "moderator view exposes the bounded priority filter");
assert.doesNotMatch(
  [creatorSource, obsSource, moderatorSource].join("\n"),
  /ownerUserId|providerChannelId|providerTargetMetadata|liveChatId|tokenDigest|capabilityDigest/
);

console.log("comment translator creator C10 priority display contract passed");
