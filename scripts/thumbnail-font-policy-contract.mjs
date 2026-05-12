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

assert.equal(typeof lib.thumbnailFontPolicy, "object", "font policy is exported");
assert.equal(typeof lib.thumbnailFontFallbackFamily, "string", "fallback font family is exported");
assert.ok(Array.isArray(lib.thumbnailCanvasFontFallbackStack), "canvas fallback stack is exported");
assert.equal(typeof lib.normalizeThumbnailFontFamily, "function", "font family fallback helper is exported");
assert.equal(typeof lib.getThumbnailCanvasFontFamily, "function", "canvas font family helper is exported");
assert.equal(typeof lib.getThumbnailCanvasFont, "function", "canvas font shorthand helper is exported");

assert.deepEqual(
  lib.thumbnailFontPolicy,
  {
    owner: "thumbnail-editor",
    source: "system-or-browser-installed",
    allowsExternalNetworkFonts: false,
    allowsGoogleFonts: false,
    allowsCdnFonts: false,
    allowsBundledFontAssetsInThisPr: false,
    fallbackFamily: "Noto Sans JP",
    fallbackStack: ["Noto Sans JP", "BIZ UDPGothic", "Yu Gothic", "Meiryo", "sans-serif"]
  },
  "font policy fixes the no-external-font fallback boundary"
);

assert.equal(lib.thumbnailFontFallbackFamily, "Noto Sans JP", "fallback family stays aligned with existing text defaults");
assert.deepEqual(
  lib.thumbnailCanvasFontFallbackStack,
  ["Noto Sans JP", "BIZ UDPGothic", "Yu Gothic", "Meiryo", "sans-serif"],
  "canvas fallback stack stays local/browser-resolved"
);

for (const font of lib.thumbnailFonts) {
  assert.equal(lib.normalizeThumbnailFontFamily(font), font, `${font} is kept as a known editor font`);
}

assert.equal(lib.normalizeThumbnailFontFamily(" Oswald "), "Oswald", "known fonts are trimmed and preserved");
assert.equal(lib.normalizeThumbnailFontFamily(""), "Noto Sans JP", "empty fontFamily falls back");
assert.equal(lib.normalizeThumbnailFontFamily(null), "Noto Sans JP", "non-string fontFamily falls back");
assert.equal(lib.normalizeThumbnailFontFamily("Unknown Fancy Font"), "Noto Sans JP", "unknown fontFamily falls back");
assert.equal(lib.normalizeThumbnailFontFamily("https://fonts.example/font.css"), "Noto Sans JP", "URL fontFamily falls back");
assert.equal(lib.normalizeThumbnailFontFamily("@import url('https://fonts.example/font.css')"), "Noto Sans JP", "import-like fontFamily falls back");
assert.equal(lib.normalizeThumbnailFontFamily("Noto Sans JP, serif"), "Noto Sans JP", "stack injection falls back to policy family");
assert.equal(lib.normalizeThumbnailFontFamily("\"Oswald\""), "Noto Sans JP", "quoted raw fontFamily falls back before canvas escaping");

assert.equal(
  lib.getThumbnailCanvasFontFamily("Oswald"),
  "\"Oswald\", \"Noto Sans JP\", \"BIZ UDPGothic\", \"Yu Gothic\", \"Meiryo\", sans-serif",
  "known canvas font family includes the requested font and local fallback stack"
);
assert.equal(
  lib.getThumbnailCanvasFontFamily("Unknown Fancy Font"),
  "\"Noto Sans JP\", \"BIZ UDPGothic\", \"Yu Gothic\", \"Meiryo\", sans-serif",
  "unknown canvas font family uses only the fallback stack"
);
assert.equal(
  lib.getThumbnailCanvasFont({ fontFamily: "Oswald", fontSize: 72, bold: true, italic: true }),
  "italic 700 72px \"Oswald\", \"Noto Sans JP\", \"BIZ UDPGothic\", \"Yu Gothic\", \"Meiryo\", sans-serif",
  "canvas font shorthand uses the safe fallback family helper"
);
assert.equal(
  lib.getThumbnailCanvasFont({ fontFamily: "https://fonts.example/font.css", fontSize: 72, bold: false, italic: false }),
  "400 72px \"Noto Sans JP\", \"BIZ UDPGothic\", \"Yu Gothic\", \"Meiryo\", sans-serif",
  "canvas font shorthand cannot carry URL font values into rendering"
);

const textLayerKeysBefore = JSON.stringify(
  lib.thumbnailPresets.map((preset) =>
    preset.layers
      .filter((layer) => layer.type === "text")
      .map((layer) => Object.keys(layer).sort())
  )
);
const presetFontsBefore = JSON.stringify(
  lib.thumbnailPresets.map((preset) => ({
    id: preset.id,
    fonts: preset.layers.filter((layer) => layer.type === "text").map((layer) => layer.fontFamily)
  }))
);

for (const preset of lib.thumbnailPresets) {
  for (const layer of preset.layers.filter((item) => item.type === "text")) {
    assert.ok(lib.thumbnailFonts.includes(layer.fontFamily), `${preset.id}:${layer.name} keeps a known initial fontFamily`);
  }
}

const unsafeDraft = lib.createDraftFromPreset("stream_announce");
const unsafeTextLayer = unsafeDraft.layers.find((layer) => layer.type === "text");
unsafeTextLayer.fontFamily = "https://fonts.example/font.css";
unsafeTextLayer.extraFontLoader = "@import url('https://fonts.example/font.css')";
const normalizedUnsafeDraft = lib.normalizeThumbnailDraft(unsafeDraft);
assert.ok(normalizedUnsafeDraft, "draft with unsafe fontFamily still normalizes");
const normalizedUnsafeLayer = normalizedUnsafeDraft.layers.find((layer) => layer.id === unsafeTextLayer.id);
assert.equal(normalizedUnsafeLayer.type, "text", "unsafe font draft keeps the text layer schema");
assert.equal(normalizedUnsafeLayer.fontFamily, "Noto Sans JP", "unsafe fontFamily is normalized to fallback");
assert.equal(Object.hasOwn(normalizedUnsafeLayer, "extraFontLoader"), false, "normalizeThumbnailDraft drops external font loader-like keys");
const normalizedBaselineTextLayer = lib.normalizeThumbnailDraft(lib.createDraftFromPreset("stream_announce")).layers.find((layer) => layer.type === "text");
assert.deepEqual(
  Object.keys(normalizedUnsafeLayer).sort(),
  Object.keys(normalizedBaselineTextLayer).sort(),
  "text layer keys stay stable after font normalization"
);

assert.equal(
  JSON.stringify(
    lib.thumbnailPresets.map((preset) =>
      preset.layers
        .filter((layer) => layer.type === "text")
        .map((layer) => Object.keys(layer).sort())
    )
  ),
  textLayerKeysBefore,
  "font policy does not change preset text layer keys"
);
assert.equal(
  JSON.stringify(
    lib.thumbnailPresets.map((preset) => ({
      id: preset.id,
      fonts: preset.layers.filter((layer) => layer.type === "text").map((layer) => layer.fontFamily)
    }))
  ),
  presetFontsBefore,
  "font policy does not rewrite preset initial fontFamily values"
);

const materialIdsBefore = JSON.stringify(lib.thumbnailMaterialLibrary.map((material) => material.id));
lib.normalizeThumbnailDraft(unsafeDraft);
assert.equal(JSON.stringify(lib.thumbnailMaterialLibrary.map((material) => material.id)), materialIdsBefore, "font policy does not mutate material registration");
assert.equal(typeof lib.normalizeThumbnailPresetVariantRefs, "function", "variant ref contract helper remains exported");
assert.equal(typeof lib.applyThumbnailPresetPartial, "function", "partial preset apply contract helper remains exported");
assert.equal(typeof lib.normalizeThumbnailUserMaterialRef, "function", "user material ref contract helper remains exported");
assert.equal(handoffSource.includes("fontFamily"), false, "tool handoff contract does not gain font payloads");
assert.equal(componentSource.includes("fonts.googleapis.com"), false, "component does not add Google Fonts");

const fontNetworkPattern = /fonts\.googleapis|fonts\.gstatic|@import\s+url|https?:\/\/[^"'\s]*(?:font|cdn)/i;
assert.equal(fontNetworkPattern.test(source), false, "thumbnail editor library has no external font URL/import/CDN dependency");
assert.equal(fontNetworkPattern.test(componentSource), false, "thumbnail editor component has no external font URL/import/CDN dependency");
assert.equal(fs.existsSync(path.join(root, "public", "fonts")), false, "this PR does not add bundled font assets");

console.log("thumbnail font policy contract checks passed");
