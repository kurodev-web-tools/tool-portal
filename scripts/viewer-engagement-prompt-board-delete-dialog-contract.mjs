import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const componentRoot = join(root, "components", "viewer-engagement-prompt-board");
const dialogSource = readFileSync(join(componentRoot, "DeleteConfirmationDialog.tsx"), "utf8");
const appSource = readFileSync(join(componentRoot, "ViewerEngagementPromptBoardApp.tsx"), "utf8");
const workspaceSource = readFileSync(join(componentRoot, "PromptCardWorkspace.tsx"), "utf8");
const copySource = readFileSync(join(root, "lib", "viewer-engagement-prompt-board-copy.ts"), "utf8");

assert.doesNotMatch(appSource, /window\.confirm|\bconfirm\(/, "plan deletion must not use the browser confirmation UI");
assert.doesNotMatch(workspaceSource, /window\.confirm|\bconfirm\(/, "prompt deletion must not use the browser confirmation UI");
assert.match(dialogSource, /<dialog/);
assert.match(dialogSource, /aria-modal="true"/);
assert.match(dialogSource, /\.showModal\(\)/);
assert.match(dialogSource, /onCancel=/);
assert.match(dialogSource, /cancelButtonRef\.current\?\.focus\(\)/);
assert.match(dialogSource, /returnFocus\?\.isConnected/);
assert.match(appSource, /<DeleteConfirmationDialog/);
assert.match(workspaceSource, /<DeleteConfirmationDialog/);
assert.match(appSource, /const deleted = persistMutation\([\s\S]*?if \(deleted\) \{[\s\S]*?createButtonRef\.current\?\.focus\(\)/);
assert.match(copySource, /deleteDialog:/);
assert.match(copySource, /confirm:\s*"削除する"/);
assert.match(copySource, /confirm:\s*"Delete"/);

console.log("viewer-engagement prompt-board delete-dialog contract passed");
