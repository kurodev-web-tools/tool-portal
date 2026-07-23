import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const historyUrl = new URL("../lib/comment-translator-creator-history.ts", import.meta.url);
const storeUrl = new URL("../lib/comment-translator-creator-history-store.ts", import.meta.url);
const migrationUrl = new URL(
  "../supabase/migrations/20260723003000_comment_translator_creator_history.sql",
  import.meta.url
);

assert.equal(fs.existsSync(historyUrl), true, "C11 server-owned history runtime must exist");
assert.equal(fs.existsSync(storeUrl), true, "C11 service-role-only history store must exist");
assert.equal(fs.existsSync(migrationUrl), true, "C11 history migration must exist");

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { shortCircuit: true, url: "data:text/javascript,export{}" };
    }
    if (specifier === "@supabase/supabase-js") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export function createClient(){return {from(){return {}}}}"
      };
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

const historyRuntime = await import(historyUrl);
const history = {
  ...historyRuntime,
  persistCommentTranslatorCreatorHistorySnapshot(request) {
    return historyRuntime.persistCommentTranslatorCreatorHistorySnapshot({
      ...request,
      creatorAccess: "paid-active"
    });
  },
  readCommentTranslatorCreatorHistory(request) {
    return historyRuntime.readCommentTranslatorCreatorHistory({
      ...request,
      creatorAccess: "paid-active"
    });
  }
};
const stores = await import(storeUrl);

const nowMs = Date.parse("2026-07-23T12:00:00.000Z");
const cutoffIso = "2026-07-16T12:00:00.000Z";
const owner = { status: "authorized", ownerUserId: "11111111-1111-4111-8111-111111111111" };
const otherOwner = { status: "authorized", ownerUserId: "22222222-2222-4222-8222-222222222222" };
const unauthenticated = { status: "unauthorized", reason: "caller-not-authenticated" };

assert.equal(history.commentTranslatorCreatorHistoryContract.rollingWindowDays, 7);
assert.equal(
  history.commentTranslatorCreatorHistoryContract.ownerAuthority,
  "authenticated-server-derived-caller-only"
);
assert.equal(
  history.commentTranslatorCreatorHistoryContract.browserInputAuthority,
  "display-refresh-only"
);
assert.equal(
  (
    await historyRuntime.readCommentTranslatorCreatorHistory({
      callerAuthorization: owner,
      creatorAccess: "unavailable",
      nowMs,
      historyStore: { status: "ready", store: {}, missingEnvReferences: [] }
    })
  ).reason,
  "creator-access-unavailable"
);

const priority = {
  category: "super-chat",
  lane: "priority",
  rank: 0,
  badgeLabel: "Super Chat"
};
const safeRow = {
  id: "private-provider-message-reference",
  provider: "youtube",
  messageReferenceId: "private-provider-message-reference",
  kind: "super-chat",
  timestamp: "21:00:00 JST",
  publishedAtIso: "2026-07-23T11:59:00.000Z",
  source: "youtube-live-chat",
  sourceAttributionLabel: "Source: YouTube Live Chat",
  role: "owner",
  authorLabel: "YouTube viewer",
  authorDisplayName: "Safe creator",
  originalText: "original",
  translatedText: "translated",
  targetLanguage: "ja",
  translationStatus: "translated-f10",
  translationCacheStatus: "miss",
  moderationLabel: "visible",
  deletionPropagation: "not-deleted",
  priority,
  badgeLabel: "super-chat",
  purchaseLabel: "safe purchase label",
  memberMonthCount: null,
  rawProviderPayload: "not-returned-by-design",
  rawComments: "not-returned-by-design",
  authorChannelMaterial: "not-returned-by-design",
  providerTargetMetadata: "forbidden",
  serverOnlyCursor: "not-returned-by-design"
};
const readyFeed = {
  status: "ready",
  source: "server-owned-live-session-state",
  rows: [safeRow],
  unavailableReason: null,
  sanitizedSummary: {
    displayRowCount: 1,
    safeRowSource: "f8-browser-safe-projection",
    fixtureFeedAuthority: "disabled",
    manualFeedAuthority: "disabled",
    rawProviderPayload: "not-returned-by-design",
    rawComments: "not-returned-by-design",
    authorChannelMaterial: "not-returned-by-design",
    providerTargetMetadata: "forbidden",
    serverOnlyCursor: "not-returned-by-design",
    liveProviderDiagnostics: null
  },
  rawProviderPayload: "not-returned-by-design",
  rawComments: "not-returned-by-design",
  providerTargetMetadata: "forbidden",
  serverOnlyCursor: "not-returned-by-design",
  browserStorage: "unchanged",
  handoffPayload: "unchanged",
  publicLaunchAllowed: false
};

const store = stores.createInMemoryCommentTranslatorCreatorHistoryStoreForTests();
const storeFactory = { status: "ready", store, missingEnvReferences: [] };
assert.equal(
  stores.createTrustedCommentTranslatorCreatorHistoryStore({
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "not-a-valid-url",
      SUPABASE_SERVICE_ROLE_KEY: "test-only-placeholder"
    },
    createSupabaseClient() {
      throw new Error("invalid client configuration");
    }
  }).status,
  "unavailable",
  "trusted store construction failures fail closed"
);
assert.equal(
  (
    await historyRuntime.persistCommentTranslatorCreatorHistorySnapshot({
      callerAuthorization: owner,
      creatorAccess: "unavailable",
      sessionReferenceId: "free-plan-session",
      feed: readyFeed,
      recordedAtMs: nowMs,
      historyStore: storeFactory
    })
  ).status,
  "skipped-creator-access-unavailable",
  "non-Creator sessions are never retained in Creator history"
);

assert.equal(
  (
    await history.persistCommentTranslatorCreatorHistorySnapshot({
      callerAuthorization: unauthenticated,
      sessionReferenceId: "session-unauthorized",
      feed: readyFeed,
      recordedAtMs: nowMs,
      historyStore: storeFactory
    })
  ).status,
  "skipped-caller-not-authorized"
);

assert.equal(
  (
    await history.persistCommentTranslatorCreatorHistorySnapshot({
      callerAuthorization: owner,
      sessionReferenceId: "session-cutoff",
      feed: readyFeed,
      recordedAtMs: Date.parse(cutoffIso),
      historyStore: storeFactory
    })
  ).status,
  "persisted"
);
await history.persistCommentTranslatorCreatorHistorySnapshot({
  callerAuthorization: owner,
  sessionReferenceId: "session-too-old",
  feed: readyFeed,
  recordedAtMs: Date.parse(cutoffIso) - 1,
  historyStore: storeFactory
});
await history.persistCommentTranslatorCreatorHistorySnapshot({
  callerAuthorization: otherOwner,
  sessionReferenceId: "other-owner-session",
  feed: readyFeed,
  recordedAtMs: nowMs,
  historyStore: storeFactory
});

const exactBoundary = await history.readCommentTranslatorCreatorHistory({
  callerAuthorization: owner,
  nowMs,
  historyStore: storeFactory
});
assert.equal(exactBoundary.status, "ready");
assert.equal(exactBoundary.windowStartedAtIso, cutoffIso);
assert.equal(exactBoundary.windowEndedAtIso, "2026-07-23T12:00:00.000Z");
assert.equal(exactBoundary.entries.length, 1, "exact cutoff is included and older history is purged");
assert.equal(exactBoundary.entries[0].recordedAtIso, cutoffIso);
assert.equal(exactBoundary.entries[0].rows[0].originalText, "original");
assert.equal(exactBoundary.entries[0].rows[0].translatedText, "translated");
assert.equal(exactBoundary.entries[0].rows[0].translationStatus, "translated-f10");
assert.equal(exactBoundary.entries[0].rows[0].sourceAttributionLabel, "Source: YouTube Live Chat");
assert.deepEqual(exactBoundary.entries[0].rows[0].priority, priority);
assert.equal(Object.hasOwn(exactBoundary.entries[0], "sessionReferenceId"), false);
assert.equal(Object.hasOwn(exactBoundary.entries[0].rows[0], "messageReferenceId"), false);
assert.equal(Object.hasOwn(exactBoundary.entries[0].rows[0], "id"), false);

const equivalentOffsetBoundary = await history.readCommentTranslatorCreatorHistory({
  callerAuthorization: owner,
  nowMs,
  historyStore: {
    status: "ready",
    missingEnvReferences: [],
    store: {
      async persistSnapshot() {},
      async deleteExpiredForOwner() {},
      async deleteAllForOwner() {},
      async readHistorySince() {
        return [{
          ownerUserId: owner.ownerUserId,
          sessionReferenceId: "session-offset-cutoff",
          recordedAtIso: "2026-07-16T07:00:00.000-05:00",
          rows: [exactBoundary.entries[0].rows[0]]
        }];
      }
    }
  }
});
assert.equal(
  equivalentOffsetBoundary.status,
  "ready",
  "an equivalent timezone-offset timestamp at the exact cutoff is included"
);

const deletedFeed = {
  ...readyFeed,
  rows: [
    {
      ...safeRow,
      kind: "deleted",
      originalText: null,
      translatedText: null,
      translationStatus: "skipped-f10-non-translatable",
      moderationLabel: "deleted",
      deletionPropagation: "message-reference-tombstone-only",
      priority: { category: "standard", lane: "standard", rank: 5, badgeLabel: null },
      badgeLabel: null,
      purchaseLabel: null
    }
  ]
};
await history.persistCommentTranslatorCreatorHistorySnapshot({
  callerAuthorization: owner,
  sessionReferenceId: "session-cutoff",
  feed: deletedFeed,
  recordedAtMs: nowMs,
  historyStore: storeFactory
});
const deletedHistory = await history.readCommentTranslatorCreatorHistory({
  callerAuthorization: owner,
  nowMs,
  historyStore: storeFactory
});
assert.equal(deletedHistory.status, "ready");
assert.equal(deletedHistory.entries[0].rows[0].moderationLabel, "deleted");
assert.equal(
  deletedHistory.entries[0].rows[0].deletionPropagation,
  "message-reference-tombstone-only"
);
assert.equal(deletedHistory.entries[0].rows[0].originalText, null);
assert.equal(deletedHistory.entries[0].rows[0].translatedText, null);

const otherOwnerHistory = await history.readCommentTranslatorCreatorHistory({
  callerAuthorization: otherOwner,
  nowMs,
  historyStore: storeFactory
});
assert.equal(otherOwnerHistory.status, "ready");
assert.equal(otherOwnerHistory.entries.length, 1, "history reads remain owner isolated");

assert.equal(
  (
    await history.readCommentTranslatorCreatorHistory({
      callerAuthorization: unauthenticated,
      nowMs,
      historyStore: storeFactory
    })
  ).reason,
  "auth-unavailable"
);
assert.equal(
  (
    await history.readCommentTranslatorCreatorHistory({
      callerAuthorization: owner,
      nowMs,
      historyStore: {
        status: "unavailable",
        store: null,
        missingEnvReferences: ["SUPABASE_SERVICE_ROLE_KEY"],
        reason: "trusted-service-role-env-missing"
      }
    })
  ).reason,
  "history-store-unavailable"
);
assert.equal(
  (
    await history.readCommentTranslatorCreatorHistory({
      callerAuthorization: owner,
      nowMs,
      historyStore: {
        status: "ready",
        missingEnvReferences: [],
        store: {
          ...store,
          async readHistorySince() {
            return [
              {
                ownerUserId: otherOwner.ownerUserId,
                sessionReferenceId: "cross-owner",
                recordedAtIso: "2026-07-23T11:00:00.000Z",
                rows: [safeRow]
              }
            ];
          }
        }
      }
    })
  ).reason,
  "history-unreadable",
  "cross-owner durable rows fail closed"
);
assert.equal(
  (
    await history.readCommentTranslatorCreatorHistory({
      callerAuthorization: owner,
      nowMs,
      historyStore: {
        status: "ready",
        missingEnvReferences: [],
        store: {
          ...store,
          async readHistorySince() {
            return [
              {
                ownerUserId: owner.ownerUserId,
                sessionReferenceId: "malformed",
                recordedAtIso: "not-a-date",
                rows: [safeRow]
              }
            ];
          }
        }
      }
    })
  ).reason,
  "history-unreadable",
  "malformed durable rows fail closed"
);
assert.equal(
  (
    await history.readCommentTranslatorCreatorHistory({
      callerAuthorization: owner,
      nowMs,
      historyStore: {
        status: "ready",
        missingEnvReferences: [],
        store: {
          ...store,
          async readHistorySince() {
            return [{
              ownerUserId: owner.ownerUserId,
              sessionReferenceId: "malformed-deleted-message",
              recordedAtIso: "2026-07-23T11:00:00.000Z",
              rows: [{
                ...safeRow,
                moderationLabel: "deleted",
                deletionPropagation: "message-reference-tombstone-only"
              }]
            }];
          }
        }
      }
    })
  ).reason,
  "history-unreadable",
  "deleted tombstones containing message text fail closed"
);

const firstCleanup = await history.cleanupCommentTranslatorCreatorHistoryForOwner({
  callerAuthorization: owner,
  trigger: "oauth-disconnect",
  historyStore: storeFactory
});
const secondCleanup = await history.cleanupCommentTranslatorCreatorHistoryForOwner({
  callerAuthorization: owner,
  trigger: "oauth-disconnect",
  historyStore: storeFactory
});
assert.deepEqual(firstCleanup, {
  status: "completed",
  trigger: "oauth-disconnect",
  ownerScoped: true,
  idempotent: true
});
assert.deepEqual(secondCleanup, firstCleanup, "owner cleanup is idempotent");
assert.equal(
  (
    await history.readCommentTranslatorCreatorHistory({
      callerAuthorization: owner,
      nowMs,
      historyStore: storeFactory
    })
  ).entries.length,
  0
);
assert.equal(
  (
    await history.readCommentTranslatorCreatorHistory({
      callerAuthorization: otherOwner,
      nowMs,
      historyStore: storeFactory
    })
  ).entries.length,
  1,
  "cleanup never deletes another owner's history"
);

const serializedBrowserHistory = JSON.stringify([exactBoundary, deletedHistory]);
for (const forbiddenValue of [
  owner.ownerUserId,
  otherOwner.ownerUserId,
  "private-provider-message-reference",
  "session-cutoff"
]) {
  assert.equal(
    serializedBrowserHistory.includes(forbiddenValue),
    false,
    "browser history excludes private identifiers"
  );
}
for (const forbiddenKey of [
  "ownerUserId",
  "sessionReferenceId",
  "providerChannelId",
  "liveChatId",
  "credentialReferenceId",
  "token",
  "secret",
  "rawProviderPayload",
  "rawComments"
]) {
  assert.equal(serializedBrowserHistory.includes(forbiddenKey), false);
}

const migration = fs.readFileSync(migrationUrl, "utf8");
assert.match(migration, /owner_user_id uuid not null references auth\.users\(id\) on delete cascade/i);
assert.match(migration, /unique \(owner_user_id, session_reference_id\)/i);
assert.match(migration, /recorded_at timestamptz not null/i);
assert.match(migration, /enable row level security/i);
assert.match(migration, /revoke all .* from anon/is);
assert.match(migration, /revoke all .* from authenticated/is);
assert.match(migration, /grant all .* to service_role/is);
assert.match(migration, /owner_user_id, recorded_at desc/i);
assert.doesNotMatch(migration, /grant .* to anon|grant .* to authenticated/i);

console.log("comment translator creator C11 history contract passed");
