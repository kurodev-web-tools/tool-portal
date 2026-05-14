import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const sourcePath = path.join(root, "lib", "thumbnail-editor.ts");
const componentSourcePath = path.join(root, "components", "thumbnail-editor", "ThumbnailEditorApp.tsx");
const handoffSourcePath = path.join(root, "lib", "tool-handoff.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const componentSource = fs.readFileSync(componentSourcePath, "utf8");
const handoffSource = fs.readFileSync(handoffSourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022
  }
}).outputText;

const testModule = new Module(sourcePath);
testModule.filename = sourcePath;
testModule.paths = Module._nodeModulePaths(path.dirname(sourcePath));
testModule._compile(compiled, sourcePath);
const lib = testModule.exports;

assert.equal(typeof lib.thumbnailPresetVariants, "object", "variant metadata catalog is exported");
assert.equal(typeof lib.thumbnailPresetVariantRelations, "object", "preset to variant relation map is exported");
assert.equal(typeof lib.getDefaultThumbnailPresetVariantRef, "function", "default variant ref helper is exported");
assert.equal(typeof lib.getThumbnailPresetVariant, "function", "variant metadata resolver is exported");
assert.equal(typeof lib.getThumbnailPresetCanvasFromVariant, "function", "variant canvas resolver is exported");
assert.equal(typeof lib.createDraftFromPresetVariant, "function", "variant body draft helper is exported");
assert.equal(typeof lib.normalizeThumbnailPresetVariantRefs, "function", "variant ref normalizer is exported");

const presetIds = lib.thumbnailPresets.map((preset) => preset.id);
assert.deepEqual(
  presetIds,
  [
    "stream_announce",
    "first_stream",
    "anniversary_stream",
    "endurance_stream",
    "karaoke",
    "chatting",
    "clip",
    "game_live",
    "collaboration",
    "announcement",
    "weekly_schedule",
    "x_announcement"
  ],
  "existing preset ids remain stable"
);

assert.deepEqual(
  Object.keys(lib.thumbnailPresetVariants),
  ["landscape-16-9", "portrait-9-16", "square-1-1"],
  "variant catalog covers the minimum output families without adding preset bodies"
);

assert.deepEqual(
  lib.thumbnailPresetVariants["landscape-16-9"],
  {
    id: "landscape-16-9",
    label: "横長 16:9",
    canvas: { width: 1280, height: 720 },
    aspectRatio: "16:9",
    intendedUse: "YouTube配信サムネ / 通常告知"
  },
  "landscape variant keeps the existing canvas boundary"
);
assert.equal(lib.thumbnailPresetVariants["portrait-9-16"].aspectRatio, "9:16", "portrait variant metadata is readable");
assert.deepEqual(lib.thumbnailPresetVariants["square-1-1"].canvas, { width: 1080, height: 1080 }, "square variant canvas metadata is readable");

for (const preset of lib.thumbnailPresets) {
  const relation = lib.thumbnailPresetVariantRelations[preset.id];
  assert.ok(relation, `${preset.id} has variant relation metadata`);
  assert.equal(relation.presetId, preset.id, `${preset.id} relation keeps existing preset id`);
  assert.equal(relation.defaultVariantId, "landscape-16-9", `${preset.id} defaults to existing landscape output`);
  assert.deepEqual(
    relation.variantIds,
    ["landscape-16-9", "portrait-9-16", "square-1-1"],
    `${preset.id} exposes only the scoped variant bodies`
  );
  assert.equal(typeof relation.familyId, "string", `${preset.id} has a family id for future batches`);
  assert.equal(
    lib.getDefaultThumbnailPresetVariantRef(preset.id).presetId,
    preset.id,
    `${preset.id} default variant ref is anchored by preset id`
  );
  assert.equal(
    lib.getDefaultThumbnailPresetVariantRef(preset.id).variantId,
    "landscape-16-9",
    `${preset.id} default variant ref resolves to landscape`
  );
  assert.deepEqual(
    lib.getThumbnailPresetCanvasFromVariant(preset.id),
    { width: 1280, height: 720 },
    `${preset.id} canvas can be read from its default variant`
  );
}

assert.equal(
  lib.getThumbnailPresetVariant("karaoke", "portrait-9-16").label,
  "縦長 9:16",
  "portrait variant body support resolves through relation metadata"
);
assert.equal(lib.getThumbnailPresetVariant("karaoke", "landscape-16-9").label, "横長 16:9", "supported variant resolves");
assert.deepEqual(
  lib.getThumbnailPresetCanvasFromVariant("karaoke", "portrait-9-16"),
  { width: 1080, height: 1920 },
  "portrait variant canvas resolves without changing the preset id"
);

assert.deepEqual(
  lib.normalizeThumbnailPresetVariantRefs(
    [
      { presetId: "karaoke", variantId: "landscape-16-9", draft: { layers: [] } },
      { presetId: "karaoke", variantId: "landscape-16-9" },
      { presetId: "clip", variantId: "square-1-1" },
      { presetId: "missing", variantId: "landscape-16-9" },
      { presetId: "x_announcement", variantId: "landscape-16-9", image: "data:image/png;base64,should-not-survive" }
    ],
    6
  ),
  [
    { presetId: "karaoke", variantId: "landscape-16-9" },
    { presetId: "clip", variantId: "square-1-1" },
    { presetId: "x_announcement", variantId: "landscape-16-9" }
  ],
  "recent and favorite variant refs stay lightweight and only keep supported preset/variant ids"
);

const discoveryState = lib.normalizeThumbnailPresetDiscoveryState({
  version: 1,
  recentPresetIds: ["karaoke", "karaoke", "missing"],
  favoritePresetIds: ["announcement", "unknown"],
  recentPresetVariantRefs: [
    { presetId: "karaoke", variantId: "landscape-16-9", image: "data:image/png;base64,should-not-survive" },
    { presetId: "announcement", variantId: "square-1-1" }
  ],
  favoritePresetVariantRefs: [{ presetId: "announcement", variantId: "landscape-16-9", draft: { version: 1 } }],
  draft: { version: 1 },
  image: "data:image/png;base64,should-not-survive"
});
assert.deepEqual(discoveryState.recentPresetIds, ["karaoke"], "existing recent preset ids stay compatible");
assert.deepEqual(discoveryState.favoritePresetIds, ["announcement"], "existing favorite preset ids stay compatible");
assert.deepEqual(
  discoveryState.recentPresetVariantRefs,
  [
    { presetId: "karaoke", variantId: "landscape-16-9" },
    { presetId: "announcement", variantId: "square-1-1" }
  ],
  "recent variant refs keep only lightweight supported refs"
);
assert.deepEqual(
  discoveryState.favoritePresetVariantRefs,
  [{ presetId: "announcement", variantId: "landscape-16-9" }],
  "favorite variant refs keep only lightweight supported refs"
);
assert.equal(Object.hasOwn(discoveryState, "image"), false, "discovery state does not keep image bodies");
assert.equal(Object.hasOwn(discoveryState, "draft"), false, "discovery state does not keep drafts");

const presetStructureBefore = JSON.stringify(
  lib.thumbnailPresets.map((preset) => ({
    id: preset.id,
    category: preset.category,
    usageLabel: preset.usageLabel,
    layerTypes: preset.layers.map((layer) => layer.type),
    textLayerKeys: preset.layers
      .filter((layer) => layer.type === "text")
      .map((layer) =>
        Object.keys(layer)
          .sort()
          .join(",")
      ),
    imageLayerKeys: preset.layers
      .filter((layer) => layer.type === "image")
      .map((layer) =>
        Object.keys(layer)
          .sort()
          .join(",")
      )
  }))
);
const materialIdsBefore = JSON.stringify(lib.thumbnailMaterialLibrary.map((material) => material.id));

for (const presetId of presetIds) {
  lib.createDraftFromPreset(presetId);
  for (const variantId of Object.keys(lib.thumbnailPresetVariants)) {
    const variantDraft = lib.createDraftFromPresetVariant(presetId, variantId);
    const variant = lib.thumbnailPresetVariants[variantId];
    assert.equal(variantDraft.version, 1, `${presetId}/${variantId} keeps draft schema version`);
    assert.equal(variantDraft.presetId, presetId, `${presetId}/${variantId} keeps existing preset id`);
    assert.deepEqual(variantDraft.canvas, variant.canvas, `${presetId}/${variantId} uses variant canvas`);
    assert.equal(Object.hasOwn(variantDraft, "variantId"), false, `${presetId}/${variantId} does not add variantId to draft schema`);
    assert.ok(variantDraft.layers.length > 0, `${presetId}/${variantId} creates a non-empty body`);
    assert.ok(variantDraft.layers.some((layer) => layer.type === "text" && layer.name.includes("見出し")), `${presetId}/${variantId} keeps a headline text layer`);
    for (const layer of variantDraft.layers) {
      assert.ok(Number.isFinite(layer.x), `${presetId}/${variantId}/${layer.name} has finite x`);
      assert.ok(Number.isFinite(layer.y), `${presetId}/${variantId}/${layer.name} has finite y`);
      assert.ok(layer.width > 0, `${presetId}/${variantId}/${layer.name} keeps a positive width`);
      assert.ok(layer.height > 0, `${presetId}/${variantId}/${layer.name} keeps a positive height`);
      assert.ok(layer.x >= -variant.canvas.width && layer.x <= variant.canvas.width * 2, `${presetId}/${variantId}/${layer.name} stays within draft normalize x bounds`);
      assert.ok(layer.y >= -variant.canvas.height && layer.y <= variant.canvas.height * 2, `${presetId}/${variantId}/${layer.name} stays within draft normalize y bounds`);
    }
    const normalizedVariantDraft = lib.normalizeThumbnailDraft(variantDraft);
    assert.ok(normalizedVariantDraft, `${presetId}/${variantId} normalizes as a storable draft`);
    assert.deepEqual(normalizedVariantDraft.canvas, variant.canvas, `${presetId}/${variantId} keeps variant canvas after normalize`);
  }
}

assert.equal(
  JSON.stringify(
    lib.thumbnailPresets.map((preset) => ({
      id: preset.id,
      category: preset.category,
      usageLabel: preset.usageLabel,
      layerTypes: preset.layers.map((layer) => layer.type),
      textLayerKeys: preset.layers
        .filter((layer) => layer.type === "text")
        .map((layer) =>
          Object.keys(layer)
            .sort()
            .join(",")
        ),
      imageLayerKeys: preset.layers
        .filter((layer) => layer.type === "image")
        .map((layer) =>
          Object.keys(layer)
            .sort()
            .join(",")
        )
    }))
  ),
  presetStructureBefore,
  "variant metadata does not alter preset initial layers or text/image schemas"
);
assert.equal(JSON.stringify(lib.thumbnailMaterialLibrary.map((material) => material.id)), materialIdsBefore, "variant metadata does not alter material library registration");
assert.ok(source.includes("crop?: ThumbnailImageCrop"), "crop schema remains owned by image layer only");
assert.ok(componentSource.includes("createDraftFromPresetVariant"), "UI variant route uses the scoped draft helper instead of adding preset bodies");
assert.ok(componentSource.includes('headerMenuOpen === "variant"'), "UI exposes variant choices through the existing lightweight listbox boundary");
assert.ok(
  componentSource.includes("createDraftFromPresetVariant(draft.presetId, variantId)"),
  "UI variant selection creates the current preset body for the selected variant"
);
assert.equal(handoffSource.includes("variantId"), false, "Schedule Calendar / SNS Split Image Maker handoff contract is unchanged");

console.log("thumbnail-preset-variants contract checks passed");
