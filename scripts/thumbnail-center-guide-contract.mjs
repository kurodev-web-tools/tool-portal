import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const componentPath = path.join(root, "components", "thumbnail-editor", "ThumbnailEditorApp.tsx");
const componentSource = fs.readFileSync(componentPath, "utf8");

assert.ok(
  componentSource.includes("function CanvasCenterGuideOverlay"),
  "Thumbnail Editor exposes a preview-only center guide overlay component"
);
assert.ok(
  componentSource.includes('aria-hidden="true"') && componentSource.includes('data-thumbnail-preview-guide="center"'),
  "center guide overlay stays decorative and hidden from assistive tech"
);
assert.ok(
  componentSource.includes("pointer-events-none") && componentSource.includes("left-1/2") && componentSource.includes("top-1/2"),
  "center guide overlay draws non-interactive vertical and horizontal center lines"
);
assert.ok(
  componentSource.includes("showCenterGuide ? <CanvasCenterGuideOverlay /> : null"),
  "center guide overlay is rendered over the editable preview canvas"
);
assert.ok(
  componentSource.match(/showCenterGuide \? <CanvasCenterGuideOverlay \/> : null/g)?.length >= 2,
  "center guide overlay is also rendered in the mobile full-preview dialog"
);
assert.equal(
  componentSource.includes("includeCenterGuide"),
  false,
  "center guide is not added to drawThumbnail or export options"
);

console.log("thumbnail center guide contract checks passed");
