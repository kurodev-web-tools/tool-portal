import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const toolsSource = read("lib/tools.ts");
const suitesSource = read("lib/suites.ts");
const portalCopySource = read("lib/portal-copy.ts");
const portalMetadataSource = read("lib/portal-metadata.ts");
const portalHeroSummarySource = read("components/portal/PortalHeroSummary.tsx");
const portalHeaderSource = read("components/portal/PortalHeader.tsx");
const portalSidebarSource = read("components/portal/PortalSidebar.tsx");

const promptBoardToolBlock = toolsSource.match(
  /\{\s*id: "viewer-engagement-prompt-board"[\s\S]*?\n\s*\},/
)?.[0];

assert.ok(promptBoardToolBlock, "prompt board is registered in the canonical tool registry");
assert.match(promptBoardToolBlock, /name: "配信カンペボード"/, "registry keeps the Japanese product name");
assert.match(promptBoardToolBlock, /category: "stream"/, "prompt board uses the stream category");
assert.match(promptBoardToolBlock, /status: "available"/, "prompt board is publicly discoverable");
assert.match(promptBoardToolBlock, /suite: "stream-workflow"/, "prompt board belongs to Stream Workflow");
assert.match(
  promptBoardToolBlock,
  /href: "\/tools\/viewer-engagement-prompt-board"/,
  "prompt board uses the canonical public route"
);
assert.match(promptBoardToolBlock, /sidebar: true/, "prompt board appears in the shared workspace sidebar");
assert.match(promptBoardToolBlock, /icon: "PB"/, "prompt board uses the approved short icon label");

assert.match(
  portalCopySource,
  /"viewer-engagement-prompt-board":\s*\{\s*name: "配信カンペボード",[\s\S]*?description: "[^"]+"/,
  "Japanese Portal copy names and describes the prompt board"
);
assert.match(
  portalCopySource,
  /"viewer-engagement-prompt-board":\s*\{\s*name: "Stream Prompt Board",[\s\S]*?description: "[^"]+"/,
  "English Portal copy names and describes the prompt board"
);

for (const label of [
  "Schedule Calendar",
  "Kuro Live Comment Translator",
  "Thumbnail Editor",
  "SNS分割画像メーカー",
  "配信カンペボード"
]) {
  assert.match(portalCopySource, new RegExp(label), `Japanese public Portal copy includes ${label}`);
}

for (const label of [
  "Schedule Calendar",
  "Kuro Live Comment Translator",
  "Thumbnail Editor",
  "SNS Split Image Maker",
  "Stream Prompt Board"
]) {
  assert.match(portalCopySource, new RegExp(label), `English public Portal copy includes ${label}`);
}

assert.doesNotMatch(portalCopySource, /4ツール|4 ツール|four public tools|4 tools/, "public copy no longer claims four available tools");
assert.match(portalCopySource, /value: "5 ツール"/, "Japanese hero summary reports five public tools");
assert.match(portalCopySource, /value: "5 tools"/, "English hero summary reports five public tools");
assert.match(
  portalCopySource,
  /"stream-workflow"[\s\S]*?配信カンペボード/,
  "Japanese Stream Workflow copy includes the prompt board"
);
assert.match(
  portalCopySource,
  /"stream-workflow"[\s\S]*?Stream Prompt Board/,
  "English Stream Workflow copy includes the prompt board"
);
assert.match(suitesSource, /tags: \[[^\]]*"配信カンペボード"/, "suite seed tags include the prompt board");
assert.match(
  suitesSource,
  /tool\.suite === suite\.key && tool\.status === suite\.status/,
  "suite cards count available tools separately from planned candidates"
);

assert.match(portalMetadataSource, /配信カンペボード/, "Japanese metadata includes the prompt board");
assert.match(portalMetadataSource, /Stream Prompt Board/, "English metadata includes the prompt board");
assert.match(
  portalCopySource,
  /titleSegments: \["配信準備を、", "いま使える", "ツールから。"\]/,
  "Japanese hero heading exposes phrase-safe segments"
);
assert.match(portalHeroSummarySource, /copy\.titleSegments\.map/, "home hero renders localized title segments");
assert.match(portalHeroSummarySource, /className="inline-block whitespace-nowrap"/, "home hero keeps each title phrase together at intermediate widths");
assert.match(portalHeroSummarySource, /xl:grid-cols-\[minmax\(0,1fr\)_30rem\]/, "home hero delays the fixed summary column until the content width can support it");
assert.match(portalHeroSummarySource, /locale === "ja" \? "xl:break-keep" : ""/, "Japanese hero copy avoids breaking inside tool names and words only in the constrained two-column layout");
assert.match(portalHeroSummarySource, /whitespace-nowrap rounded-base bg-primary/, "home hero primary CTA avoids orphaned words");
assert.match(portalHeroSummarySource, /whitespace-nowrap rounded-base border border-primary\/50/, "home hero secondary CTA avoids orphaned words");
assert.match(portalCopySource, /accountNoteNoBreakPhrase: "handoff payload は"/, "Japanese account note exposes the particle-bound phrase through the copy owner");
assert.match(portalHeroSummarySource, /whitespace-nowrap">\{copy\.accountNoteNoBreakPhrase\}<\/span>/, "home hero keeps the account-note phrase and particle on one line");
assert.match(portalHeroSummarySource, /locale === "en" \? "gap-x-\[0\.28em\]" : ""/, "English hero title preserves visible spacing between segments");
assert.doesNotMatch(portalHeroSummarySource, /\{segment\}\{locale === "en" \? " " : null\}/, "English spacing is not hidden inside an inline-block segment");

assert.match(portalHeaderSource, /sidebarTools\.map/, "mobile drawer continues to derive tools from the shared registry");
assert.match(
  portalHeaderSource,
  /pathname\.startsWith\("\/tools\/viewer-engagement-prompt-board"\)[\s\S]*?copy\.toolTitles\["viewer-engagement-prompt-board"\]/,
  "mobile workspace header uses the localized prompt board title"
);
assert.match(portalSidebarSource, /sidebarTools\.map/, "desktop sidebar continues to derive tools from the shared registry");
assert.ok(
  fs.existsSync(path.join(root, "app", "tools", "viewer-engagement-prompt-board", "page.tsx")),
  "the registered prompt board route exists"
);

console.log("viewer engagement prompt board public entry contract checks passed");
