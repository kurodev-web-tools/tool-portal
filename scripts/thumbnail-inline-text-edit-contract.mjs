import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const componentPath = path.join(root, "components", "thumbnail-editor", "ThumbnailEditorApp.tsx");
const copyPath = path.join(root, "lib", "thumbnail-editor-copy.ts");
const componentSource = fs.readFileSync(componentPath, "utf8");
const copySource = fs.readFileSync(copyPath, "utf8");

assert.match(componentSource, /type InlineTextEditState/, "inline text edit keeps local overlay state");
assert.match(componentSource, /beginInlineTextEdit/, "inline text edit has an explicit start path");
assert.match(componentSource, /commitInlineTextEdit/, "inline text edit has an explicit commit path");
assert.match(componentSource, /cancelInlineTextEdit/, "inline text edit has an explicit cancel path");
assert.match(componentSource, /selectLayerFromEditor/, "layer selection goes through the inline-edit-aware selector");
assert.match(componentSource, /inlineTextEditLayerId && inlineTextEditLayerId !== layerId[\s\S]*commitInlineTextEdit\(\)/, "selecting another layer commits and closes inline text edit");
assert.match(componentSource, /target\.type !== "text" \|\| target\.locked \|\| target\.hidden/, "inline edit is limited to visible unlocked text layers");
assert.match(componentSource, /onDoubleClick=\{handleCanvasDoubleClick\}/, "desktop double click remains wired to the canvas preview");
assert.match(componentSource, /isDoubleTap && target && beginInlineTextEdit\(target\)/, "double tap starts inline edit for eligible text layers");
assert.match(componentSource, /inlinePreviewDraft/, "inline edit keeps a canvas-preview draft while typing");
assert.match(componentSource, /resolvedPreviewDraft/, "inline edit preview goes through the resolved preview draft");
assert.match(componentSource, /drawThumbnail\(buffer,\s*resolvedPreviewDraft/, "canvas preview renders the live inline text value");
assert.match(componentSource, /data-thumbnail-inline-text-editor/, "textarea overlay is rendered above the canvas preview");
assert.match(componentSource, /text-transparent/, "inline textarea text stays visually transparent so the canvas remains the visual preview");
assert.match(componentSource, /caret-primary/, "inline textarea keeps a visible caret");
assert.match(componentSource, /overflow:\s*"hidden"/, "inline textarea avoids its own scrollbar");
assert.match(componentSource, /setSelectionRange\(textarea\.value\.length,\s*textarea\.value\.length\)/, "inline textarea starts with a caret instead of full text selection");
assert.match(componentSource, /onBlur=\{\(\) => commitInlineTextEdit\(\)\}/, "blur commits inline text edits");
assert.match(componentSource, /event\.key === "Escape"[\s\S]*cancelInlineTextEdit\(\)/, "Escape cancels inline text edits");
assert.match(componentSource, /\(event\.metaKey \|\| event\.ctrlKey\) && event\.key === "Enter"[\s\S]*commitInlineTextEdit\(\)/, "Ctrl/Cmd+Enter commits inline text edits");
assert.match(componentSource, /<PropertyPanel[\s\S]*onChange=\{updateSelectedLayer\}/, "existing right-panel selected-layer controls stay wired");
assert.match(componentSource, /layer\.type === "text" && <TextControls[\s\S]*onChange=\{onChange\}/, "existing right-panel text controls stay wired");
assert.match(copySource, /inlineTextEditorAria/, "inline textarea has localized accessible copy");
assert.doesNotMatch(componentSource, /drawThumbnail\([^)]*inlineTextEdit/, "inline editor does not enter the canvas rendering pipeline");

console.log("thumbnail inline text edit contract checks passed");
