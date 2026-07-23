import assert from "node:assert/strict";
import fs from "node:fs";

for (const relativePath of [
  "../app/tools/comment-translator/history-actions.ts",
  "../components/comment-translator/CommentTranslatorCreatorHistoryPanel.tsx"
]) {
  assert.equal(
    fs.existsSync(new URL(relativePath, import.meta.url)),
    true,
    `C11 browser-visible history surface must exist: ${relativePath}`
  );
}

const actionSource = fs.readFileSync(
  new URL("../app/tools/comment-translator/history-actions.ts", import.meta.url),
  "utf8"
);
const sharedActionsSource = fs.readFileSync(
  new URL("../app/tools/comment-translator/actions.ts", import.meta.url),
  "utf8"
);
const panelSource = fs.readFileSync(
  new URL("../components/comment-translator/CommentTranslatorCreatorHistoryPanel.tsx", import.meta.url),
  "utf8"
);
const dockSource = fs.readFileSync(
  new URL("../components/comment-translator/CommentTranslatorDock.tsx", import.meta.url),
  "utf8"
);
const bridgeSource = fs.readFileSync(
  new URL("../lib/comment-translator-real-comments-feed-session-bridge.ts", import.meta.url),
  "utf8"
);
const translationExecutionSource = fs.readFileSync(
  new URL("../lib/comment-translator-azure-normal-translation-execution.ts", import.meta.url),
  "utf8"
);
const pageSource = fs.readFileSync(
  new URL("../app/tools/comment-translator/page.tsx", import.meta.url),
  "utf8"
);
const toolDisconnectSource = fs.readFileSync(
  new URL("../app/tools/comment-translator/account-actions.ts", import.meta.url),
  "utf8"
);
const accountDisconnectSource = fs.readFileSync(
  new URL("../app/account/actions.ts", import.meta.url),
  "utf8"
);

assert.match(actionSource, /readCommentTranslatorActionCallerAuthorization/);
assert.match(actionSource, /readCommentTranslatorCreatorHistory/);
assert.match(actionSource, /readCommentTranslatorBillingEntitlementSnapshot/);
assert.match(actionSource, /billingSnapshot\.plan === "paid"/);
assert.match(actionSource, /billingSnapshot\.billingState === "paid-active"/);
assert.doesNotMatch(
  actionSource,
  /ownerUserId\s*[:}]|sessionReferenceId\s*[:}]/,
  "history action accepts no browser-selected owner or session authority"
);
assert.match(sharedActionsSource, /getCommentTranslatorCreatorHistoryAction/);
assert.match(panelSource, /getCommentTranslatorCreatorHistoryAction/);
assert.match(panelSource, /7-day history/);
assert.match(panelSource, /Source: YouTube Live Chat/);
assert.match(panelSource, /priority/);
assert.match(panelSource, /moderationLabel/);
assert.match(panelSource, /entry\.recordedAtIso}-\${entryIndex}/);
assert.doesNotMatch(
  panelSource,
  /ownerUserId|sessionReferenceId|providerChannelId|liveChatId|credentialReferenceId|tokenDigest/
);
assert.match(dockSource, /CommentTranslatorCreatorHistoryPanel/);
assert.match(dockSource, /creatorHistoryAvailable/);
assert.match(pageSource, /readCommentTranslatorBillingEntitlementSnapshot/);
assert.match(pageSource, /creatorHistoryAvailable=/);
assert.match(bridgeSource, /persistCommentTranslatorCreatorHistorySnapshot/);
assert.match(bridgeSource, /creatorHistoryAccess/);
assert.match(
  translationExecutionSource,
  /creatorHistoryAccess:\s*request\.usage\.plan === "paid" \? "paid-active" : "unavailable"/
);
assert.match(toolDisconnectSource, /cleanupCommentTranslatorCreatorHistoryForOwner/);
assert.match(toolDisconnectSource, /oauth-disconnect/);
assert.match(accountDisconnectSource, /cleanupCommentTranslatorCreatorHistoryForOwner/);
assert.match(accountDisconnectSource, /oauth-disconnect/);
assert.ok(
  accountDisconnectSource.indexOf("readYouTubeOAuthCredentialDisconnectResult") <
    accountDisconnectSource.lastIndexOf("cleanupCommentTranslatorCreatorHistoryForOwner"),
  "account integration cleanup runs only after the credential disconnect result"
);

console.log("comment translator creator C11 history UI contract passed");
