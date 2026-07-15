import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const taskPath = "task.md";
const mvpPath = "docs/active/VIEWER_ENGAGEMENT_PROMPT_BOARD_MVP.md";
const workflowPath = "docs/active/TOOL_PREVIEW_DEVELOPMENT_WORKFLOW.md";
const catalogPath = "docs/future/FUTURE_TOOL_MOCK_CATALOG.md";
const designPath = "docs/superpowers/specs/2026-07-15-viewer-engagement-prompt-board-governance-design.md";
const mockReadmePath = "docs/mockups/future-tools/viewer-engagement-prompt-board/README.md";
const approvedMockPaths = [
  "docs/mockups/future-tools/viewer-engagement-prompt-board/stream-plan-list-and-live-workspace.png",
  "docs/mockups/future-tools/viewer-engagement-prompt-board/stream-plan-edit.png"
];
const translatorBoardPath = "docs/active/COMMENT_TRANSLATOR_PUBLIC_LAUNCH_REMAINING_TASK_BOARD.md";

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  assert.ok(fs.existsSync(absolutePath), `${relativePath} exists`);
  return fs.readFileSync(absolutePath, "utf8");
}

const task = read(taskPath);
const mvp = read(mvpPath);
const workflow = read(workflowPath);
const catalog = read(catalogPath);
const design = read(designPath);
const mockReadme = read(mockReadmePath);
const translatorBoard = read(translatorBoardPath);

for (const mockPath of approvedMockPaths) {
  const absolutePath = path.join(root, mockPath);
  assert.ok(fs.existsSync(absolutePath), `${mockPath} exists`);
  const signature = fs.readFileSync(absolutePath).subarray(0, 8);
  assert.deepEqual(
    [...signature],
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    `${mockPath} has a PNG signature`
  );
}

for (const marker of [
  "## Current Task Index",
  "P0",
  "Comment Translator",
  "P1",
  "配信カンペボード",
  mvpPath,
  workflowPath,
  translatorBoardPath,
  "## Legacy Contract Compatibility Ledger",
  "169"
]) {
  assert.ok(task.includes(marker), `${taskPath} includes ${marker}`);
}

for (const marker of [
  "配信カンペボード",
  "viewer-engagement-prompt-board",
  "無料",
  "ログイン不要",
  "## Approved UI Mock Reference",
  "stream-plan-list-and-live-workspace.png",
  "stream-plan-edit.png",
  "`localStorage`",
  "versioned JSON",
  "予定日時（任意）",
  "`idea`",
  "`preparing`",
  "`live`",
  "`completed`",
  "次回",
  "次々回",
  "配信中モード",
  "## Shared Portal Workspace Sidebar",
  "PortalShell mode=\"workspace\"",
  "`expanded`",
  "`rail`",
  "`hidden`",
  "mobile",
  "default mode",
  "JSONバックアップ",
  "Schedule Calendar",
  "## MVP対象外",
  "AI",
  "OAuth",
  "YouTube",
  "Supabase",
  "OBS",
  "共同編集"
]) {
  assert.ok(mvp.includes(marker), `${mvpPath} includes ${marker}`);
}

for (const marker of [
  "### 承認済みUIモック",
  "配信プラン一覧 -> 配信プラン編集 -> 配信中ワークスペース",
  ...approvedMockPaths.map((mockPath) => path.basename(mockPath))
]) {
  assert.ok(design.includes(marker), `${designPath} includes ${marker}`);
}

for (const mockPath of approvedMockPaths) {
  const filename = path.basename(mockPath);
  assert.ok(mockReadme.includes(filename), `${mockReadmePath} includes ${filename}`);
}

for (const marker of [
  "codex/viewer-engagement-prompt-board-preview",
  "codex/viewer-engagement-prompt-board-portal-sidebar",
  "PortalShell",
  "task branch",
  "preview branch",
  "PR target",
  "shared preview branch",
  "rebase",
  "force-push",
  "promotion PR",
  "`main`",
  "Comment Translator",
  "P0"
]) {
  assert.ok(workflow.includes(marker), `${workflowPath} includes ${marker}`);
}

for (const marker of [
  "## Current Selected Tool",
  "配信カンペボード",
  "Viewer Engagement Prompt Board",
  "2026-07-15",
  "Schedule Calendar",
  "runtime未実装"
]) {
  assert.ok(catalog.includes(marker), `${catalogPath} includes ${marker}`);
}

for (const marker of [
  "`google_auth_verification_status` | `submitted-pending`",
  "`public_release_capable_status` | `no`"
]) {
  assert.ok(translatorBoard.includes(marker), `${translatorBoardPath} preserves ${marker}`);
}

const combined = [task, mvp, workflow, catalog, design, mockReadme].join("\n");
for (const pattern of [
  /Authorization\s*:\s*Bearer\s+\S+/i,
  /client_secret\s*[:=]\s*["'][^"']+["']/i,
  /private_key\s*[:=]\s*["'][^"']+["']/i,
  /(?:access|refresh)_token\s*[:=]\s*["'][^"']+["']/i,
  /liveChatId\s*[:=]\s*["'][^"']+["']/i,
  /providerMetadata\s*[:=]\s*["'][^"']+["']/i
]) {
  assert.doesNotMatch(combined, pattern, `governance docs do not expose ${pattern}`);
}

console.log(
  "viewer engagement prompt board governance contract passed (translator_priority=P0, next_tool_priority=P1, storage_foundation=yes, ui_implemented=no)"
);
