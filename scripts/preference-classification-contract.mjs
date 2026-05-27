import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const planPath = path.join(root, "docs", "future", "USER_ACCOUNT_PREFERENCES_FOUNDATION_PLAN.md");
const taskPath = path.join(root, "task.md");
const plan = fs.readFileSync(planPath, "utf8");
const task = fs.readFileSync(taskPath, "utf8");

function section(title) {
  const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = plan.match(new RegExp(`^### ${escapedTitle}\\s*$([\\s\\S]*?)(?=^### |^## |$(?![\\s\\S]))`, "m"));
  assert.ok(match, `plan contains Data Classification section: ${title}`);
  return match[1];
}

function assertContainsAll(source, snippets, label) {
  for (const snippet of snippets) {
    assert.ok(source.includes(snippet), `${label} includes ${snippet}`);
  }
}

function assertExcludes(source, forbiddenSnippets, label) {
  for (const snippet of forbiddenSnippets) {
    assert.equal(source.includes(snippet), false, `${label} does not include ${snippet}`);
  }
}

assertContainsAll(
  plan,
  [
    "## Current Local-Only Inventory",
    "## Data Classification",
    "## Migration Principles",
    "## Suggested Implementation Slices",
    "node scripts/preference-classification-contract.mjs"
  ],
  "preference foundation plan"
);

const syncCandidate = section("Sync Candidate");
assertContainsAll(
  syncCandidate,
  [
    "横断 locale、theme",
    "recent / favorite preset ids",
    "recent font families",
    "default view",
    "week start",
    "target translation language",
    "user-selected local font family"
  ],
  "sync candidate classification"
);
assertExcludes(
  syncCandidate,
  ["OAuth", "raw credentials", "font binary", "IndexedDB image blobs", "Tool handoff payload"],
  "sync candidate classification"
);

const explicitOnly = section("Store With Explicit User Action Only");
assertContainsAll(
  explicitOnly,
  [
    "Thumbnail draft",
    "server asset library",
    "Schedule events",
    "post templates",
    "hashtag sets",
    "glossary",
    "Translation history / session logs"
  ],
  "explicit user action classification"
);

const localOnly = section("Keep Local-Only");
assertContainsAll(
  localOnly,
  [
    "Tool handoff payload",
    "IndexedDB image blobs",
    "local IndexedDB storage",
    "Undo history",
    "Local Font Access permission state",
    "missing IndexedDB image recovery state"
  ],
  "local-only classification"
);

const doNotStore = section("Do Not Store");
assertContainsAll(
  doNotStore,
  [
    "OAuth access token / refresh token in `localStorage`",
    "Raw platform credentials",
    "Font file binary",
    "Full comment logs by default",
    "Viewer IDs",
    "Tool handoff payload after TTL expiration"
  ],
  "do-not-store classification"
);

const cannotAssumeServerSync = section("Cannot Assume Server Sync");
assertContainsAll(
  cannotAssumeServerSync,
  [
    "Local Font Access results",
    "IndexedDB-only blobs",
    "Schedule Calendar legacy localStorage payload",
    "Thumbnail draft with local user material refs",
    "Handoff payload",
    "Kuro translator live session state"
  ],
  "cannot-assume-server-sync classification"
);

assertContainsAll(
  plan,
  [
    "No login UI, DB, API, billing, or tool UI changes.",
    "Contract should assert that handoff, IndexedDB blobs, OAuth tokens, and local font binaries are not sync candidates.",
    "Existing localStorage remains source of truth until the user signs in and explicitly opts into import/sync.",
    "Account sync must never silently upload drafts, schedules, images, comments, or font inventory.",
    "Handoff stays browser-local and ephemeral even after account login exists."
  ],
  "migration and implementation boundaries"
);

assert.match(
  task,
  /node scripts\/preference-classification-contract\.mjs/,
  "task.md records the preference classification contract check"
);

console.log("preference classification contract checks passed");
