import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const componentPath = path.join(root, "components", "thumbnail-editor", "ThumbnailEditorApp.tsx");
const source = fs.readFileSync(componentPath, "utf8");

assert.ok(source.includes("type DraftHistoryState"), "Thumbnail Editor defines draft-only undo/redo history state");
assert.ok(source.includes("draftHistoryRef") && source.includes("pushDraftHistory"), "Undo/redo uses a bounded draft history stack");
assert.ok(source.includes("undoDraft") && source.includes("redoDraft"), "Undo and redo commands are implemented");
assert.ok(source.includes("Ctrl+Z") && source.includes("Ctrl+Y") && source.includes("Ctrl+Shift+Z"), "Keyboard shortcuts are documented in button titles");
assert.ok(source.includes("const key = event.key.toLowerCase()") && source.includes("key === \"z\"") && source.includes("key === \"y\""), "Keyboard shortcuts handle undo and redo");
assert.ok(source.includes("showCenterGuide") && source.includes("setShowCenterGuide"), "Center guide visibility is controlled by local UI state");
assert.ok(source.includes("showCenterGuide ? <CanvasCenterGuideOverlay /> : null"), "Center guide overlay is conditionally rendered");
assert.ok(source.includes("resetZoom") && source.includes("fitZoomToViewport"), "Preview toolbar can reset and fit the canvas zoom");
assert.ok(source.includes("PreviewControlToolbar"), "Preview controls are grouped in a toolbar near zoom controls");
assert.ok(source.includes("\"中央ガイドを表示\"") && source.includes("\"中央ガイドを非表示\""), "Guide toggle has explicit accessible labels");
assert.ok(source.includes("aria-label=\"元に戻す\"") && source.includes("aria-label=\"やり直す\""), "Undo and redo buttons have explicit accessible labels");
assert.ok(source.includes("LayerQuickAdjustPanel"), "Selected-layer rescue controls are exposed in the property panel");
assert.ok(source.includes("サイズ +") && source.includes("サイズ -") && source.includes("回転 -5") && source.includes("回転 +5") && source.includes("中央へ"), "Layer rescue controls include size, rotation, and centering actions");
assert.equal(source.includes("includeCenterGuide"), false, "Guide toggle is not passed into drawThumbnail or export options");

console.log("thumbnail preview controls contract checks passed");
