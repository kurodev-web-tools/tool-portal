import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const componentPath = path.join(root, "components", "thumbnail-editor", "ThumbnailEditorApp.tsx");
const source = fs.readFileSync(componentPath, "utf8");

assert.ok(source.includes('label: "編集"'), "mobile bottom nav uses a layer-neutral edit label");
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

assert.ok(source.includes("disabled: variant.aspectRatio !== \"16:9\""), "non-16:9 output ratio variants are disabled");
assert.ok(source.includes("後続候補"), "disabled output ratio variants explain they are later candidates");
assert.ok(source.includes("aria-disabled={option.disabled || undefined}"), "disabled listbox options expose disabled state to assistive tech");

assert.ok(source.includes("data-thumbnail-preset-filter-chips"), "preset filter chips have a mobile overflow guard marker");
assert.ok(source.includes("data-thumbnail-preset-card-chips"), "preset card category and usage chips have a mobile overflow guard marker");

console.log("thumbnail responsive control polish contract checks passed");
