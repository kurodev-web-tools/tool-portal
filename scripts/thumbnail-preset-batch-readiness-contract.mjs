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

assert.ok(Array.isArray(lib.thumbnailPresetBatchCandidates), "preset batch candidate metadata is exported");
assert.equal(typeof lib.getThumbnailPresetBatchReadiness, "function", "preset batch readiness helper is exported");
assert.equal(typeof lib.getThumbnailPresetBatchReadinessSummary, "function", "preset batch readiness summary helper is exported");
assert.equal(typeof lib.thumbnailPresetBatchReadinessPolicy, "object", "readiness policy is exported");

assert.deepEqual(
  lib.thumbnailPresetBatchReadinessPolicy,
  {
    owner: "thumbnail-editor",
    checksOnly: true,
    allowsAutoFix: false,
    allowsGeneration: false,
    addsPresetBodies: false,
    addsAssets: false,
    addsFontAssets: false,
    changesMaterialRegistration: false
  },
  "readiness helper stays warning-only and does not authorize generation or mutation"
);

const existingPresetIds = [
  "stream_announce",
  "karaoke",
  "chatting",
  "clip",
  "game_live",
  "collaboration",
  "announcement",
  "weekly_schedule",
  "x_announcement"
];
assert.deepEqual(lib.thumbnailPresets.map((preset) => preset.id), existingPresetIds, "existing preset ids remain stable");

const expectedCandidates = [
  {
    id: "first_stream",
    label: "初配信",
    useCase: "初配信や初回自己紹介向け",
    requiredTextLayerRoles: ["見出し", "時刻", "サブ", "ラベル"]
  },
  {
    id: "anniversary_stream",
    label: "記念配信",
    useCase: "周年、登録者記念、誕生日などの告知向け",
    requiredTextLayerRoles: ["見出し", "時刻", "サブ", "ラベル"]
  },
  {
    id: "endurance_stream",
    label: "耐久配信",
    useCase: "耐久企画や長時間配信の目標表示向け",
    requiredTextLayerRoles: ["見出し", "時刻", "サブ", "ラベル"]
  },
  {
    id: "karaoke_stream",
    label: "歌枠",
    useCase: "歌枠や音楽配信の開始告知向け",
    requiredTextLayerRoles: ["見出し", "時刻", "サブ", "ラベル"]
  },
  {
    id: "chat_stream",
    label: "雑談",
    useCase: "雑談配信や近況共有の開始告知向け",
    requiredTextLayerRoles: ["見出し", "時刻", "サブ", "ラベル"]
  },
  {
    id: "gameplay_stream",
    label: "ゲーム実況",
    useCase: "ゲーム実況、参加型、シリーズ配信向け",
    requiredTextLayerRoles: ["見出し", "時刻", "サブ", "ラベル"]
  },
  {
    id: "notice_stream",
    label: "告知",
    useCase: "配信外のお知らせや公開案内向け",
    requiredTextLayerRoles: ["見出し", "時刻", "サブ", "ラベル"]
  },
  {
    id: "highlight_clip",
    label: "切り抜き",
    useCase: "切り抜き、見どころ、公開予定の告知向け",
    requiredTextLayerRoles: ["見出し", "時刻", "サブ", "ラベル"]
  }
];

assert.equal(lib.thumbnailPresetBatchCandidates.length, expectedCandidates.length, "candidate list is the scoped first batch");
assert.deepEqual(
  lib.thumbnailPresetBatchCandidates.map(({ id, label, useCase, requiredTextLayerRoles }) => ({
    id,
    label,
    useCase,
    requiredTextLayerRoles
  })),
  expectedCandidates,
  "candidate ids, use cases, and required text layer roles are fixed before preset bodies are added"
);

const candidateIds = lib.thumbnailPresetBatchCandidates.map((candidate) => candidate.id);
assert.equal(new Set(candidateIds).size, candidateIds.length, "candidate ids are unique");
for (const candidateId of candidateIds) {
  assert.equal(existingPresetIds.includes(candidateId), false, `${candidateId} does not collide with existing preset ids`);
}

const allowedTextRoles = new Set(["見出し", "時刻", "サブ", "ラベル"]);
const expectedDependencies = ["variant", "partial-apply", "font-policy", "material-boundary", "handoff"];
for (const candidate of lib.thumbnailPresetBatchCandidates) {
  assert.equal(candidate.recommendedVariantId, "landscape-16-9", `${candidate.id} starts from the existing landscape variant`);
  assert.deepEqual(candidate.dependsOn, expectedDependencies, `${candidate.id} records prerequisite contracts`);
  assert.ok(Array.isArray(candidate.requiredMaterialCategories), `${candidate.id} lists material category needs without registering assets`);
  assert.ok(candidate.requiredMaterialCategories.length >= 2, `${candidate.id} has lightweight material category needs`);
  for (const role of candidate.requiredTextLayerRoles) {
    assert.ok(allowedTextRoles.has(role), `${candidate.id} uses supported text layer role ${role}`);
  }
}

const existingMaterialIds = lib.thumbnailMaterialLibrary.map((material) => material.id);
assert.equal(existingMaterialIds.length, 41, "material library registration size stays unchanged");
assert.equal(
  existingMaterialIds.some((materialId) => candidateIds.includes(materialId)),
  false,
  "candidate metadata does not register candidate ids as materials"
);

const presetStructureBefore = JSON.stringify(
  lib.thumbnailPresets.map((preset) => ({
    id: preset.id,
    layerTypes: preset.layers.map((layer) => layer.type),
    textLayerKeys: preset.layers
      .filter((layer) => layer.type === "text")
      .map((layer) => Object.keys(layer).sort()),
    imageLayerKeys: preset.layers
      .filter((layer) => layer.type === "image")
      .map((layer) => Object.keys(layer).sort())
  }))
);
const materialIdsBefore = JSON.stringify(existingMaterialIds);

const readinessItems = lib.thumbnailPresetBatchCandidates.map((candidate) => lib.getThumbnailPresetBatchReadiness(candidate));
assert.equal(readinessItems.length, expectedCandidates.length, "readiness can be checked for each candidate");
for (const item of readinessItems) {
  assert.equal(item.ready, true, `${item.candidateId} is ready for a later preset-body PR`);
  assert.deepEqual(item.warnings, [], `${item.candidateId} has no missing prerequisite warnings`);
  assert.equal(item.policy.checksOnly, true, `${item.candidateId} readiness is checks-only`);
  assert.equal(item.policy.allowsAutoFix, false, `${item.candidateId} readiness does not auto-fix`);
  assert.equal(item.policy.allowsGeneration, false, `${item.candidateId} readiness does not generate assets or presets`);
}

const malformedCandidate = {
  ...lib.thumbnailPresetBatchCandidates[0],
  id: "karaoke",
  recommendedVariantId: "wide-21-9",
  requiredTextLayerRoles: ["見出し", "CTA"],
  dependsOn: ["variant", "font-policy"]
};
const malformedSnapshot = JSON.stringify(malformedCandidate);
const malformedReadiness = lib.getThumbnailPresetBatchReadiness(malformedCandidate);
assert.equal(malformedReadiness.ready, false, "readiness returns warnings instead of approving missing prerequisites");
assert.ok(
  malformedReadiness.warnings.some((warning) => warning.message.includes("既存 preset id")),
  "readiness warns about preset id collisions"
);
assert.ok(
  malformedReadiness.warnings.some((warning) => warning.message.includes("variant")),
  "readiness warns about unsupported variant bodies"
);
assert.ok(
  malformedReadiness.warnings.some((warning) => warning.message.includes("text layer role")),
  "readiness warns about unsupported text layer roles"
);
assert.ok(
  malformedReadiness.warnings.some((warning) => warning.message.includes("partial-apply")),
  "readiness warns about missing prerequisite dependencies"
);
assert.equal(JSON.stringify(malformedCandidate), malformedSnapshot, "readiness helper does not mutate candidate metadata");

const portraitCandidate = {
  ...lib.thumbnailPresetBatchCandidates[0],
  id: "portrait_batch_candidate",
  recommendedVariantId: "portrait-9-16"
};
const portraitReadiness = lib.getThumbnailPresetBatchReadiness(portraitCandidate);
assert.equal(
  portraitReadiness.warnings.some((warning) => warning.id === "unsupported-variant"),
  false,
  "readiness accepts scoped portrait variant bodies after the variant foundation"
);

const summary = lib.getThumbnailPresetBatchReadinessSummary();
assert.equal(summary.total, expectedCandidates.length, "summary covers the scoped candidate set");
assert.equal(summary.readyCount, expectedCandidates.length, "summary marks candidates ready after prerequisite contracts");
assert.equal(summary.warningCount, 0, "summary has no warnings for the scoped candidates");
assert.deepEqual(
  summary.items.map((item) => item.candidateId),
  expectedCandidates.map((candidate) => candidate.id),
  "summary preserves candidate order"
);

assert.equal(
  JSON.stringify(
    lib.thumbnailPresets.map((preset) => ({
      id: preset.id,
      layerTypes: preset.layers.map((layer) => layer.type),
      textLayerKeys: preset.layers
        .filter((layer) => layer.type === "text")
        .map((layer) => Object.keys(layer).sort()),
      imageLayerKeys: preset.layers
        .filter((layer) => layer.type === "image")
        .map((layer) => Object.keys(layer).sort())
    }))
  ),
  presetStructureBefore,
  "readiness helper does not alter preset bodies or text/image layer schemas"
);
assert.equal(JSON.stringify(lib.thumbnailMaterialLibrary.map((material) => material.id)), materialIdsBefore, "readiness helper does not alter material registration");

assert.equal(typeof lib.getThumbnailPresetVariant, "function", "variant contract helper remains exported");
assert.equal(typeof lib.applyThumbnailPresetPartial, "function", "partial apply helper remains exported");
assert.equal(lib.thumbnailFontPolicy.allowsExternalNetworkFonts, false, "font policy remains network-font-free");
assert.equal(lib.thumbnailUserMaterialStoragePolicy.localStorageStoresImageBody, false, "user material storage boundary remains localStorage-image-free");
assert.equal(handoffSource.includes("presetBatch"), false, "tool handoff contract does not gain preset batch payloads");
assert.equal(componentSource.includes("thumbnailPresetBatchCandidates"), false, "UI does not expose batch candidates before preset bodies exist");
assert.equal(componentSource.includes("fonts.googleapis.com"), false, "component still does not add Google Fonts");

console.log("thumbnail preset batch readiness contract checks passed");
