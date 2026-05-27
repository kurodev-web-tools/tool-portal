import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const componentPath = path.join(root, "components", "thumbnail-editor", "ThumbnailEditorApp.tsx");
const copyPath = path.join(root, "lib", "thumbnail-editor-copy.ts");
const source = fs.readFileSync(componentPath, "utf8");
const copySource = fs.readFileSync(copyPath, "utf8");

assert.ok(copySource.includes('text: "編集"'), "mobile bottom nav uses a layer-neutral edit label");
assert.ok(source.includes('{ id: "text", icon: "T" }'), "mobile bottom nav keeps the edit panel item wired by id");
assert.equal(source.includes('{ id: "text", label: "テキスト"'), false, "mobile bottom nav no longer narrows the property panel to text only");

assert.ok(source.includes("data-thumbnail-responsive-header-controls"), "desktop header controls have a responsive guard marker");
assert.ok(source.includes("flex flex-wrap items-center gap-3"), "desktop header can wrap instead of forcing one clipped row");
assert.ok(source.includes("data-thumbnail-mobile-action-toolbar"), "mobile action toolbar has a responsive guard marker");
assert.ok(source.includes("overflow-x-auto") && source.includes("shrink-0"), "mobile toolbars and chips can scroll without compressing controls");

assert.ok(source.includes("data-thumbnail-menu-root"), "custom menu roots are marked for outside-click handling");
assert.ok(source.includes("handleHeaderMenuPointerDown"), "custom header menus close on outside pointer interaction");
assert.ok(source.includes('event.key === "Escape"'), "custom header menus close on Escape");
assert.ok(source.includes("document.addEventListener(\"pointerdown\", handleHeaderMenuPointerDown)"), "outside click listener is attached while a menu is open");
assert.ok(source.includes("document.addEventListener(\"keydown\", handleHeaderMenuKeyDown)"), "Escape listener is attached while a menu is open");
assert.ok(source.includes("data-thumbnail-header-menu-layer"), "header menu layer has an overlay guard marker");
assert.ok(source.includes("relative z-[80]"), "desktop header sits above the editor canvas stack");
assert.ok(source.includes("absolute left-0 right-0 z-[120]"), "listbox menus render above the editor surface");

assert.ok(source.includes('const disabled = !["landscape-16-9", "square-1-1"].includes(variant.id)'), "square output ratio can be selected while portrait remains disabled");
assert.ok(copySource.includes("後続候補"), "disabled output ratio variants explain they are later candidates");
assert.ok(source.includes("aria-disabled={option.disabled || undefined}"), "disabled listbox options expose disabled state to assistive tech");
assert.ok(
  source.includes("const canvasSizeOptions =") && source.includes('currentVariantId === "landscape-16-9"'),
  "canvas size menu options are scoped by the selected output ratio"
);
assert.ok(source.includes("id: currentVariantId") && source.includes("disabled: true"), "non-landscape canvas size menu exposes only the current fixed variant canvas");
assert.equal(
  (source.match(/options=\{canvasSizeOptions\}/g) ?? []).length,
  2,
  "desktop and mobile canvas size listboxes share the variant-scoped options"
);

assert.ok(source.includes("data-thumbnail-preset-filter-chips"), "preset filter chips have a mobile overflow guard marker");
assert.ok(source.includes("data-thumbnail-preset-card-chips"), "preset card category and usage chips have a mobile overflow guard marker");
assert.ok(copySource.includes("内蔵素材について"), "export panel includes a built-in asset notice heading");
assert.ok(copySource.includes("特定の人物、作家、既存作品、キャラクター素材を読み込ませて改変したものではありません。"), "export panel clarifies generated assets are not based on a specific person's or work's assets");

console.log("thumbnail responsive control polish contract checks passed");
