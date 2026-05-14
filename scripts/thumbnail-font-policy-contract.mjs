import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const sourcePath = path.join(root, "lib", "thumbnail-editor.ts");
const componentSourcePath = path.join(root, "components", "thumbnail-editor", "ThumbnailEditorApp.tsx");
const thumbnailFontCssPath = path.join(root, "components", "thumbnail-editor", "thumbnailFontAssets.module.css");
const handoffSourcePath = path.join(root, "lib", "tool-handoff.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const componentSource = fs.readFileSync(componentSourcePath, "utf8");
const thumbnailFontCssSource = fs.readFileSync(thumbnailFontCssPath, "utf8");
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
assert.ok(Array.isArray(lib.thumbnailFontManifest), "font manifest metadata is exported");
assert.equal(typeof lib.getThumbnailFontManifestEntry, "function", "font manifest lookup helper is exported");
assert.equal(typeof lib.getThumbnailFontLoadRequests, "function", "font load request helper is exported");
assert.equal(typeof lib.waitForThumbnailFontLoadRequests, "function", "safe font load helper is exported");
assert.equal(typeof lib.waitForThumbnailDraftFonts, "function", "draft font readiness helper is exported");
assert.equal(typeof lib.thumbnailFontLoadTimeoutMs, "number", "font load timeout is exported");

assert.deepEqual(
  lib.thumbnailFontPolicy,
  {
    owner: "thumbnail-editor",
    source: "self-hosted-thumbnail-editor-assets",
    allowsExternalNetworkFonts: false,
    allowsGoogleFonts: false,
    allowsCdnFonts: false,
    allowsBundledFontAssetsInThisPr: true,
    fallbackFamily: "Noto Sans JP",
    fallbackStack: ["Noto Sans JP", "BIZ UDPGothic", "Yu Gothic", "Meiryo", "sans-serif"]
  },
  "font policy fixes the self-hosted no-external-font fallback boundary"
);

assert.equal(lib.thumbnailFontFallbackFamily, "Noto Sans JP", "fallback family stays aligned with existing text defaults");
assert.deepEqual(
  lib.thumbnailCanvasFontFallbackStack,
  ["Noto Sans JP", "BIZ UDPGothic", "Yu Gothic", "Meiryo", "sans-serif"],
  "canvas fallback stack stays local/browser-resolved"
);

assert.equal(lib.thumbnailFontManifest.length, 24, "planning PR's 24 font candidates are available as metadata");
assert.equal(lib.thumbnailFontManifest.filter((font) => font.language === "ja").length, 12, "manifest keeps 12 Japanese candidates");
assert.equal(lib.thumbnailFontManifest.filter((font) => font.language === "en").length, 12, "manifest keeps 12 English candidates");
for (const font of lib.thumbnailFontManifest) {
  assert.equal(typeof font.family, "string", "manifest font family is a string");
  assert.ok(["ja", "en"].includes(font.language), `${font.family} has a supported language`);
  assert.equal(typeof font.category, "string", `${font.family} has a UI category`);
  assert.equal(typeof font.mood, "string", `${font.family} has a thumbnail mood`);
  assert.equal(typeof font.bestFor, "string", `${font.family} has recommended usage`);
  assert.equal(typeof font.caution, "string", `${font.family} has caution copy`);
  assert.match(font.sourceUrl, /^https:\/\/fonts\.google\.com\/specimen\//, `${font.family} source URL is specimen metadata only`);
}

const japaneseFontManifest = lib.thumbnailFontManifest.filter((font) => font.language === "ja");
const englishFontManifest = lib.thumbnailFontManifest.filter((font) => font.language === "en");
for (const font of japaneseFontManifest) {
  assert.equal(font.assetBasePath.startsWith("/fonts/thumbnail-editor/"), true, `${font.family} asset path is tool-scoped`);
  assert.equal(font.assetSubset, "thumbnail-editor-ja-seed-v1", `${font.family} records the Japanese seed subset`);
  assert.match(font.license, /SIL Open Font License 1\.1/, `${font.family} records the license note`);
  assert.ok(Array.isArray(font.assets) && font.assets.length > 0, `${font.family} has self-hosted asset files`);
  for (const asset of font.assets) {
    assert.ok([400, 500, 700, 900].includes(asset.weight), `${font.family} asset weight is intentionally limited`);
    assert.equal(asset.format, "woff2", `${font.family} uses woff2 self-host assets`);
    assert.equal(asset.path.startsWith(font.assetBasePath), true, `${font.family} asset stays under its family directory`);
    assert.equal(fs.existsSync(path.join(root, "public", asset.path)), true, `${font.family} asset exists: ${asset.path}`);
  }
}
assert.deepEqual(
  Object.fromEntries(japaneseFontManifest.map((font) => [font.family, font.assets.map((asset) => asset.weight)])),
  {
    "Noto Sans JP": [400, 700, 900],
    "M PLUS 1p": [400, 700, 900],
    "BIZ UDPGothic": [400, 700],
    "Zen Kaku Gothic New": [400, 700, 900],
    "M PLUS Rounded 1c": [400, 700, 900],
    "Kosugi Maru": [400],
    "Noto Serif JP": [400, 700, 900],
    "Kiwi Maru": [400, 500],
    Yomogi: [400],
    "Hachi Maru Pop": [400],
    "RocknRoll One": [400],
    DotGothic16: [400]
  },
  "Japanese batch keeps only the selected weight set"
);
for (const font of englishFontManifest) {
  assert.equal(font.assets, undefined, `${font.family} English asset batch stays out of scope`);
}
assert.deepEqual(
  lib.thumbnailFontManifest.map((font) => font.family),
  [
    "Noto Sans JP",
    "M PLUS 1p",
    "BIZ UDPGothic",
    "Zen Kaku Gothic New",
    "M PLUS Rounded 1c",
    "Kosugi Maru",
    "Noto Serif JP",
    "Kiwi Maru",
    "Yomogi",
    "Hachi Maru Pop",
    "RocknRoll One",
    "DotGothic16",
    "Anton",
    "Bebas Neue",
    "Oswald",
    "Montserrat",
    "Poppins",
    "Rubik",
    "Fredoka",
    "Bangers",
    "Playfair Display",
    "Pacifico",
    "Orbitron",
    "Press Start 2P"
  ],
  "manifest preserves the planned candidate order"
);
assert.equal(lib.getThumbnailFontManifestEntry(" Oswald ").family, "Oswald", "manifest lookup trims known values");
assert.equal(lib.getThumbnailFontManifestEntry("Unknown Fancy Font"), null, "manifest lookup rejects unknown values");
assert.deepEqual(lib.thumbnailFontGroups.map((group) => group.fonts.length), [10, 10], "existing UI font groups stay unchanged in this foundation PR");

for (const font of lib.thumbnailFonts) {
  assert.equal(lib.normalizeThumbnailFontFamily(font), font, `${font} is kept as a known editor font`);
}

assert.equal(lib.normalizeThumbnailFontFamily(" Oswald "), "Oswald", "known fonts are trimmed and preserved");
assert.equal(lib.normalizeThumbnailFontFamily(""), "Noto Sans JP", "empty fontFamily falls back");
assert.equal(lib.normalizeThumbnailFontFamily(null), "Noto Sans JP", "non-string fontFamily falls back");
assert.equal(lib.normalizeThumbnailFontFamily("Unknown Fancy Font"), "Noto Sans JP", "unknown fontFamily falls back");
assert.equal(lib.normalizeThumbnailFontFamily("RocknRoll One"), "RocknRoll One", "self-hosted Japanese manifest fonts are accepted without changing the UI groups");
assert.equal(lib.normalizeThumbnailFontFamily("DotGothic16"), "DotGothic16", "self-hosted Japanese display fonts are accepted without changing the UI groups");
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

const fontLoadDraft = lib.createDraftFromPreset("stream_announce");
for (const layer of fontLoadDraft.layers.filter((layer) => layer.type === "text")) {
  layer.hidden = true;
}
const fontLoadTextLayer = fontLoadDraft.layers.find((layer) => layer.type === "text");
fontLoadTextLayer.hidden = false;
fontLoadTextLayer.fontFamily = "Oswald";
const fontLoadRequests = lib.getThumbnailFontLoadRequests(fontLoadDraft);
assert.ok(fontLoadRequests.some((request) => request.fontFamily === "Oswald"), "font load requests include used visible text layer fonts");
assert.ok(fontLoadRequests.every((request) => request.canvasFont.includes("Noto Sans JP")), "font load requests keep canvas fallback stack");

const selfHostedJapaneseFontDraft = lib.createDraftFromPreset("stream_announce");
for (const layer of selfHostedJapaneseFontDraft.layers.filter((layer) => layer.type === "text")) {
  layer.hidden = true;
}
const japaneseFontLayer = selfHostedJapaneseFontDraft.layers.find((layer) => layer.type === "text");
japaneseFontLayer.hidden = false;
japaneseFontLayer.fontFamily = "RocknRoll One";
japaneseFontLayer.bold = true;
const selfHostedJapaneseFontRequests = lib.getThumbnailFontLoadRequests(selfHostedJapaneseFontDraft);
assert.deepEqual(
  selfHostedJapaneseFontRequests.map((request) => request.fontFamily),
  ["RocknRoll One"],
  "font load requests include self-hosted Japanese manifest fonts"
);
const selfHostedLoadedCalls = [];
const selfHostedJapaneseFontResult = await lib.waitForThumbnailDraftFonts(selfHostedJapaneseFontDraft, {
  fontFaceSet: {
    load: async (font) => {
      selfHostedLoadedCalls.push(font);
      return [];
    },
    ready: Promise.resolve()
  },
  timeoutMs: 50
});
assert.equal(selfHostedJapaneseFontResult.status, "loaded", "draft font wait resolves for self-hosted Japanese manifest fonts");
assert.ok(selfHostedLoadedCalls[0].includes("\"RocknRoll One\""), "export wait calls document.fonts.load for self-hosted Japanese fonts");

const unsupportedFontResult = await lib.waitForThumbnailFontLoadRequests(fontLoadRequests, { fontFaceSet: null, timeoutMs: 20 });
assert.deepEqual(
  unsupportedFontResult,
  {
    status: "unsupported",
    attemptedFonts: ["Oswald"],
    loadedFonts: [],
    failedFonts: [],
    timedOut: false,
    usedFallback: true
  },
  "font load helper is safe when document.fonts is unavailable"
);

const loadedCalls = [];
const loadedFontResult = await lib.waitForThumbnailDraftFonts(fontLoadDraft, {
  fontFaceSet: {
    load: async (font) => {
      loadedCalls.push(font);
      return [];
    },
    ready: Promise.resolve()
  },
  timeoutMs: 50
});
assert.equal(loadedFontResult.status, "loaded", "draft font wait resolves when fontFaceSet.load and ready resolve");
assert.deepEqual(loadedFontResult.attemptedFonts, ["Oswald"], "draft font wait de-duplicates font families");
assert.equal(loadedFontResult.usedFallback, false, "loaded font result does not mark fallback");
assert.ok(loadedCalls[0].includes("\"Oswald\""), "fontFaceSet.load receives canvas font shorthand");

const timeoutFontResult = await lib.waitForThumbnailFontLoadRequests(fontLoadRequests, {
  fontFaceSet: {
    load: () => new Promise(() => {}),
    ready: new Promise(() => {})
  },
  timeoutMs: 5
});
assert.equal(timeoutFontResult.status, "timeout", "font load helper times out instead of blocking export");
assert.equal(timeoutFontResult.timedOut, true, "timeout result is explicit");
assert.equal(timeoutFontResult.usedFallback, true, "timeout continues through fallback stack");

const failedFontResult = await lib.waitForThumbnailFontLoadRequests(fontLoadRequests, {
  fontFaceSet: {
    load: () => {
      throw new Error("font load failed");
    },
    ready: Promise.resolve()
  },
  timeoutMs: 50
});
assert.equal(failedFontResult.status, "failed", "font load helper catches load failures");
assert.deepEqual(failedFontResult.failedFonts, ["Oswald"], "font load failure reports the affected family");
assert.equal(failedFontResult.usedFallback, true, "font load failure continues through fallback stack");

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
assert.equal(componentSource.includes("thumbnailFontAssets.module.css"), true, "Thumbnail Editor imports tool-scoped font asset CSS");
assert.equal(componentSource.includes("thumbnailFontAssets.thumbnailFontAssetScope"), true, "Thumbnail Editor attaches the font asset CSS module to the tool root");
assert.equal(thumbnailFontCssSource.includes("@font-face"), true, "tool-scoped font CSS declares self-hosted font faces");
assert.equal(thumbnailFontCssSource.includes("fonts.googleapis.com"), false, "tool-scoped font CSS does not use Google Fonts CSS");
assert.equal(thumbnailFontCssSource.includes("fonts.gstatic.com"), false, "tool-scoped font CSS does not use Google font CDN URLs");
for (const font of japaneseFontManifest) {
  for (const asset of font.assets) {
    assert.equal(thumbnailFontCssSource.includes(asset.path), true, `tool-scoped font CSS references ${asset.path}`);
  }
}
assert.equal(fs.existsSync(path.join(root, "public", "fonts", "thumbnail-editor", "LICENSES.md")), true, "self-hosted fonts include license notes");

const fontNetworkPattern = /fonts\.googleapis|fonts\.gstatic|@import\s+url|https?:\/\/[^"'\s]*(?:font|cdn)/i;
assert.equal(/fonts\.googleapis|fonts\.gstatic|@import\s+url/i.test(source), false, "thumbnail editor library has no external font runtime import/CDN dependency");
assert.equal(fontNetworkPattern.test(componentSource), false, "thumbnail editor component has no external font URL/import/CDN dependency");
assert.equal(fs.existsSync(path.join(root, "public", "fonts", "thumbnail-editor")), true, "Japanese font batch adds self-hosted thumbnail editor font assets");

console.log("thumbnail font policy contract checks passed");
