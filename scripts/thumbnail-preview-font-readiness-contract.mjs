import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const componentPath = path.join(root, "components", "thumbnail-editor", "ThumbnailEditorApp.tsx");
const source = fs.readFileSync(componentPath, "utf8");

const waitCall = "await waitForThumbnailDraftFonts(resolvedDraft);";
const previewImmediateDrawCall = "void renderThumbnailPreview();";
const previewFontReadyDrawCall = "await renderThumbnailPreview();";
const mobileImmediateDrawCall = "void renderMobileThumbnailPreview();";
const mobileFontReadyDrawCall = "await renderMobileThumbnailPreview();";

const waitCount = source.split(waitCall).length - 1;
assert.ok(waitCount >= 2, "editor preview and mobile preview wait for draft fonts before the second draw");

const previewEffectStart = source.indexOf("const renderThumbnailPreview = async () =>");
const previewEffectEnd = source.indexOf("}, [draft.selectedLayerId, resolvedDraft, showToast]);", previewEffectStart);
const previewEffectSource = source.slice(previewEffectStart, previewEffectEnd);
assert.ok(previewEffectSource.includes(previewImmediateDrawCall), "editor preview keeps the immediate first draw");
assert.ok(
  previewEffectSource.indexOf(waitCall) >= 0 && previewEffectSource.indexOf(previewFontReadyDrawCall) > previewEffectSource.indexOf(waitCall),
  "editor preview redraws after fonts are ready"
);

const mobileEffectStart = source.indexOf("const renderMobileThumbnailPreview = async () =>");
const mobileEffectEnd = source.indexOf("}, [mobilePreviewOpen, resolvedDraft, showToast]);", mobileEffectStart);
const mobileEffectSource = source.slice(mobileEffectStart, mobileEffectEnd);
assert.ok(mobileEffectSource.includes(mobileImmediateDrawCall), "mobile full preview keeps the immediate first draw");
assert.ok(
  mobileEffectSource.indexOf(waitCall) >= 0 && mobileEffectSource.indexOf(mobileFontReadyDrawCall) > mobileEffectSource.indexOf(waitCall),
  "mobile full preview redraws after fonts are ready"
);

assert.ok(
  source.includes("const renderThumbnailPreviewAfterFonts = async () =>") &&
    source.includes("const renderMobileThumbnailPreviewAfterFonts = async () =>"),
  "async preview renderers are invoked without replacing effect cleanup"
);
assert.ok(source.includes("const [canvasAttachVersion, setCanvasAttachVersion]"), "editor preview draw is retriggered when the canvas element attaches");
assert.ok(
  source.includes("const [mobilePreviewCanvasAttachVersion, setMobilePreviewCanvasAttachVersion]"),
  "mobile preview draw is retriggered when the mobile canvas attaches"
);
assert.ok(source.includes("const setCanvasRef = useCallback") && source.includes("ref={setCanvasRef}"), "editor canvas uses a stable callback ref");
assert.ok(
  source.includes("const setMobilePreviewCanvasRef = useCallback") && source.includes("ref={setMobilePreviewCanvasRef}"),
  "mobile preview canvas uses a stable callback ref"
);

console.log("thumbnail preview font readiness contract checks passed");
