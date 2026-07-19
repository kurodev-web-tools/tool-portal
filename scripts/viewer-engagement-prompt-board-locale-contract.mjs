import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const copyPath = join(root, "lib", "viewer-engagement-prompt-board-copy.ts");
const copySource = readFileSync(copyPath, "utf8");

assert.match(copySource, /export const viewerEngagementPromptBoardCopy/);
assert.match(copySource, /const ja = \{/);
assert.match(copySource, /const en: PromptBoardCopy = \{/);
assert.match(copySource, /export function useViewerEngagementPromptBoardCopy/);
assert.match(copySource, /useLocale\(\)/);

const componentNames = [
  "ViewerEngagementPromptBoardApp.tsx",
  "StreamPlanList.tsx",
  "StreamPlanEditor.tsx",
  "PromptCardPlanSelector.tsx",
  "PromptCardEditor.tsx",
  "PromptCardList.tsx",
  "PromptCardWorkspace.tsx",
  "LiveModeBoard.tsx",
  "LivePromptDetail.tsx",
  "LiveModeWorkspace.tsx",
  "DataManagementWorkspace.tsx"
];

for (const componentName of componentNames) {
  const source = readFileSync(join(root, "components", "viewer-engagement-prompt-board", componentName), "utf8");
  assert.match(source, /useViewerEngagementPromptBoardCopy\(\)/, `${componentName} must consume the shared prompt-board locale owner`);
  assert.doesNotMatch(source, /[ぁ-んァ-ヶ一-龯々]/, `${componentName} must not hard-code Japanese interface copy`);
}

for (const editorName of ["StreamPlanEditor.tsx", "PromptCardEditor.tsx"]) {
  const source = readFileSync(join(root, "components", "viewer-engagement-prompt-board", editorName), "utf8");
  assert.match(source, /<form[^>]*\bnoValidate\b/, `${editorName} must route required-field validation through localized application copy`);
}

assert.match(copySource, /deletePlanConfirm:\s*\(title: string\)/);
assert.match(copySource, /planCount:\s*\(count: number\)/);
assert.match(copySource, /cardCount:\s*\(count: number\)/);
assert.match(copySource, /promptPosition:\s*\(category: string, current: number, total: number\)/);
assert.match(copySource, /scheduledAtPlaceholder:/);
assert.match(copySource, /bodyError:/);

console.log("viewer-engagement prompt-board locale contract passed");
