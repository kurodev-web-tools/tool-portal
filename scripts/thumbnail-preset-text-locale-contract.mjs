import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function loadTsModule(relativePath) {
  const sourcePath = path.join(root, relativePath);
  const compiled = ts.transpileModule(read(relativePath), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;

  const testModule = new Module(sourcePath);
  testModule.filename = sourcePath;
  testModule.paths = Module._nodeModulePaths(path.dirname(sourcePath));
  testModule._compile(compiled, sourcePath);
  return testModule.exports;
}

const thumbnailLib = loadTsModule("lib/thumbnail-editor.ts");
const thumbnailCopy = loadTsModule("lib/thumbnail-editor-copy.ts");
const thumbnailSource = read("lib/thumbnail-editor.ts");
const thumbnailCopySource = read("lib/thumbnail-editor-copy.ts");
const thumbnailAppSource = read("components/thumbnail-editor/ThumbnailEditorApp.tsx");
const handoffSource = read("lib/tool-handoff.ts");

const containsJapanese = (value) => /[\u3040-\u30ff\u3400-\u9fff]/.test(value);
const textLayers = (draft) => draft.layers.filter((layer) => layer.type === "text");

assert.equal(
  typeof thumbnailCopy.localizeThumbnailPresetTextLayerBodies,
  "function",
  "Thumbnail preset text body locale helper is exported from copy layer"
);
assert.equal(
  typeof thumbnailCopy.getThumbnailPresetTextLayerVisualAdjustment,
  "function",
  "Thumbnail preset text visual adjustment helper is exported from copy layer"
);

assert.match(
  thumbnailCopySource,
  /thumbnailPresetTextBodyCopy/,
  "Thumbnail preset text body copy stays in the copy dictionary layer"
);
assert.match(
  thumbnailCopySource,
  /thumbnailPresetTextLayerVisualAdjustments/,
  "English-only preset text visual adjustments stay in the copy helper layer"
);
assert.doesNotMatch(
  thumbnailSource,
  /text:\s*"FIRST TIME HERE|text:\s*"Welcome stream|text:\s*"Weekly stream plan|text:\s*"Karaoke\\nLive/,
  "Base preset definitions are not replaced with English body copy"
);

const expectedPresetIds = [
  "stream_announce",
  "first_stream",
  "anniversary_stream",
  "endurance_stream",
  "project_stream",
  "cover_song_notice",
  "event_notice",
  "privacy_notice",
  "whiteboard_plan",
  "karaoke",
  "chatting",
  "clip",
  "game_live",
  "collaboration",
  "announcement",
  "weekly_schedule",
  "x_announcement"
];
assert.deepEqual(
  thumbnailLib.thumbnailPresets.map((preset) => preset.id),
  expectedPresetIds,
  "Preset ids remain stable"
);

const layoutSnapshot = (draft) =>
  textLayers(draft).map((layer) => ({
    name: layer.name,
    x: layer.x,
    y: layer.y,
    width: layer.width,
    height: layer.height,
    fontSize: layer.fontSize,
    lineHeight: layer.lineHeight,
    align: layer.align
  }));
const estimateAsciiTextWidth = (line, layer) => {
  const fontWidthRatio =
    layer.fontFamily === "Bebas Neue"
      ? 0.28
      : layer.fontFamily === "Orbitron" || layer.fontFamily === "Montserrat"
        ? 0.42
        : layer.fontFamily === "M PLUS Rounded 1c"
          ? 0.49
          : 0.55;
  return Array.from(line).reduce((total, character) => total + (/[ -~]/.test(character) ? fontWidthRatio : 1), 0) * layer.fontSize * 0.9;
};
const maxEstimatedTextWidthRatio = (layer) =>
  Math.max(...layer.text.split("\n").map((line) => (line.trim() ? estimateAsciiTextWidth(line.trim(), layer) / layer.width : 0)));
const visualAdjustmentTargets = new Set([
  "stream_announce/テキスト 1（見出し）",
  "first_stream/テキスト 1（見出し）",
  "first_stream/テキスト 2（時刻）",
  "first_stream/テキスト 3（サブ）",
  "anniversary_stream/テキスト 1（見出し）",
  "anniversary_stream/テキスト 2（時刻）",
  "anniversary_stream/テキスト 3（サブ）",
  "endurance_stream/テキスト 4（ラベル）",
  "endurance_stream/テキスト 1（見出し）",
  "endurance_stream/テキスト 5（目標）",
  "endurance_stream/テキスト 3（サブ）",
  "endurance_stream/テキスト 2（時刻）",
  "project_stream/テキスト 5（英字）",
  "project_stream/テキスト 1（見出し）",
  "project_stream/テキスト 3（サブ）",
  "cover_song_notice/テキスト 4（ラベル）",
  "cover_song_notice/テキスト 1（見出し）",
  "karaoke/テキスト 1（見出し）"
]);

for (const preset of thumbnailLib.thumbnailPresets) {
  const jaDraft = thumbnailLib.createDraftFromPreset(preset.id);
  const localizedJaDraft = thumbnailCopy.localizeThumbnailPresetTextLayerBodies(jaDraft, "ja");
  assert.deepEqual(
    textLayers(localizedJaDraft).map((layer) => ({ name: layer.name, text: layer.text })),
    textLayers(jaDraft).map((layer) => ({ name: layer.name, text: layer.text })),
    `${preset.id} keeps Japanese preset text body unchanged`
  );
  assert.deepEqual(
    layoutSnapshot(localizedJaDraft),
    layoutSnapshot(jaDraft),
    `${preset.id} keeps Japanese preset text layout unchanged`
  );

  const enDraft = thumbnailCopy.localizeThumbnailPresetTextLayerBodies(jaDraft, "en");
  assert.deepEqual(
    enDraft.layers.map((layer) => layer.name),
    jaDraft.layers.map((layer) => layer.name),
    `${preset.id} keeps layer.name stable when localizing text bodies`
  );
  assert.deepEqual(
    enDraft.layers.map((layer) => layer.id),
    jaDraft.layers.map((layer) => layer.id),
    `${preset.id} keeps layer ids stable when localizing text bodies`
  );
  for (const layer of textLayers(enDraft)) {
    assert.equal(containsJapanese(layer.text), false, `${preset.id}/${layer.name} has English initial text in English mode`);
    assert.ok(layer.text.length > 0, `${preset.id}/${layer.name} keeps non-empty English initial text`);
    assert.ok(layer.text.length <= 40, `${preset.id}/${layer.name} keeps English initial text compact`);
    assert.ok(maxEstimatedTextWidthRatio(layer) <= 0.92, `${preset.id}/${layer.name} keeps English text within the visual balance threshold`);
  }

  for (const layer of textLayers(jaDraft)) {
    const adjustmentKey = `${preset.id}/${layer.name}`;
    const adjustment = thumbnailCopy.getThumbnailPresetTextLayerVisualAdjustment(preset.id, layer.name, "en");
    if (visualAdjustmentTargets.has(adjustmentKey)) {
      assert.ok(adjustment, `${adjustmentKey} has an English-only visual adjustment`);
    } else {
      assert.equal(adjustment, null, `${adjustmentKey} does not carry unnecessary English layout adjustment`);
    }
    assert.equal(
      thumbnailCopy.getThumbnailPresetTextLayerVisualAdjustment(preset.id, layer.name, "ja"),
      null,
      `${adjustmentKey} has no Japanese visual adjustment`
    );
  }

  const variantDraft = thumbnailLib.createDraftFromPresetVariant(preset.id, "square-1-1");
  const enVariantDraft = thumbnailCopy.localizeThumbnailPresetTextLayerBodies(variantDraft, "en");
  assert.equal(enVariantDraft.presetId, preset.id, `${preset.id} variant localization keeps preset id`);
  assert.deepEqual(enVariantDraft.canvas, { width: 1080, height: 1080 }, `${preset.id} variant localization keeps canvas`);
  for (const layer of textLayers(enVariantDraft)) {
    assert.equal(containsJapanese(layer.text), false, `${preset.id}/${layer.name} variant text is English in English mode`);
  }
}

const enStreamDraft = thumbnailCopy.localizeThumbnailPresetTextLayerBodies(thumbnailLib.createDraftFromPreset("stream_announce"), "en");
assert.equal(
  textLayers(enStreamDraft).find((layer) => layer.name === "テキスト 2（時刻）")?.text,
  "21:00 START",
  "Stream Announcement time copy follows the supplied English visual draft"
);
const enStreamHeadline = textLayers(enStreamDraft).find((layer) => layer.name === "テキスト 1（見出し）");
assert.equal(
  enStreamHeadline?.x,
  116.33322030449972,
  "Stream Announcement headline x follows the supplied English visual draft"
);
assert.equal(
  enStreamHeadline?.y,
  145.33348404014833,
  "Stream Announcement headline y follows the supplied English visual draft"
);
const enFirstStreamDraft = thumbnailCopy.localizeThumbnailPresetTextLayerBodies(thumbnailLib.createDraftFromPreset("first_stream"), "en");
const enFirstHeadline = textLayers(enFirstStreamDraft).find((layer) => layer.name === "テキスト 1（見出し）");
assert.equal(
  enFirstHeadline?.x,
  106.72245769895892,
  "First Stream headline x follows the supplied English visual draft"
);
assert.equal(
  enFirstHeadline?.y,
  175.77737589293787,
  "First Stream headline y follows the supplied English visual draft"
);
const enFirstTime = textLayers(enFirstStreamDraft).find((layer) => layer.name === "テキスト 2（時刻）");
assert.equal(
  enFirstTime?.x,
  140.83330507612487,
  "First Stream time x follows the supplied English visual draft"
);
assert.equal(
  enFirstTime?.y,
  528.3343882810381,
  "First Stream time y follows the supplied English visual draft"
);
const enFirstSub = textLayers(enFirstStreamDraft).find((layer) => layer.name === "テキスト 3（サブ）");
assert.equal(
  enFirstSub?.x,
  86.83313553287445,
  "First Stream sub x follows the supplied English visual draft"
);
assert.equal(
  enFirstSub?.y,
  608.3884618862465,
  "First Stream sub y follows the supplied English visual draft"
);
const enAnniversaryDraft = thumbnailCopy.localizeThumbnailPresetTextLayerBodies(
  thumbnailLib.createDraftFromPreset("anniversary_stream"),
  "en"
);
const enAnniversaryHeadline = textLayers(enAnniversaryDraft).find((layer) => layer.name === "テキスト 1（見出し）");
assert.equal(
  enAnniversaryHeadline?.text,
  "1st Anniv.",
  "Anniversary Stream headline copy follows the supplied English visual draft"
);
assert.equal(
  enAnniversaryHeadline?.x,
  73.66627106574896,
  "Anniversary Stream headline x follows the supplied English visual draft"
);
assert.equal(
  enAnniversaryHeadline?.y,
  214.6669680802966,
  "Anniversary Stream headline y follows the supplied English visual draft"
);
assert.equal(
  enAnniversaryHeadline?.align,
  "center",
  "Anniversary Stream headline align follows the supplied English visual draft"
);
const enAnniversarySub = textLayers(enAnniversaryDraft).find((layer) => layer.name === "テキスト 3（サブ）");
assert.equal(
  enAnniversarySub?.x,
  103.55559323183354,
  "Anniversary Stream sub x follows the supplied English visual draft"
);
assert.equal(
  enAnniversarySub?.y,
  477.77737589293787,
  "Anniversary Stream sub y follows the supplied English visual draft"
);
const enAnniversaryTime = textLayers(enAnniversaryDraft).find((layer) => layer.name === "テキスト 2（時刻）");
assert.equal(
  enAnniversaryTime?.text,
  "21:00 START",
  "Anniversary Stream time copy follows the supplied English visual draft"
);
assert.equal(
  enAnniversaryTime?.x,
  276.61110169204164,
  "Anniversary Stream time x follows the supplied English visual draft"
);
assert.equal(
  enAnniversaryTime?.y,
  588.3889140066914,
  "Anniversary Stream time y follows the supplied English visual draft"
);
const enEnduranceDraft = thumbnailCopy.localizeThumbnailPresetTextLayerBodies(
  thumbnailLib.createDraftFromPreset("endurance_stream"),
  "en"
);
const enEnduranceLabel = textLayers(enEnduranceDraft).find((layer) => layer.name === "テキスト 4（ラベル）");
assert.equal(
  enEnduranceLabel?.x,
  733.555762775084,
  "Endurance Stream label x follows the supplied English visual draft"
);
assert.equal(
  enEnduranceLabel?.y,
  116.05452572565329,
  "Endurance Stream label y follows the supplied English visual draft"
);
const enEnduranceHeadline = textLayers(enEnduranceDraft).find((layer) => layer.name === "テキスト 1（見出し）");
assert.equal(
  enEnduranceHeadline?.x,
  61.222203384083286,
  "Endurance Stream headline x follows the supplied English visual draft"
);
assert.equal(
  enEnduranceHeadline?.y,
  182.72194592639477,
  "Endurance Stream headline y follows the supplied English visual draft"
);
assert.equal(
  enEnduranceHeadline?.fontSize,
  140,
  "Endurance Stream headline keeps the English-only font size adjustment"
);
const enEnduranceGoal = textLayers(enEnduranceDraft).find((layer) => layer.name === "テキスト 5（目標）");
assert.equal(
  enEnduranceGoal?.x,
  180.94449153979178,
  "Endurance Stream goal x follows the supplied English visual draft"
);
assert.equal(
  enEnduranceGoal?.y,
  522.0567863278777,
  "Endurance Stream goal y follows the supplied English visual draft"
);
const enEnduranceSub = textLayers(enEnduranceDraft).find((layer) => layer.name === "テキスト 3（サブ）");
assert.equal(
  enEnduranceSub?.x,
  50.944152453290826,
  "Endurance Stream sub x follows the supplied English visual draft"
);
assert.equal(
  enEnduranceSub?.y,
  655.3348404014829,
  "Endurance Stream sub y follows the supplied English visual draft"
);
const enEnduranceTime = textLayers(enEnduranceDraft).find((layer) => layer.name === "テキスト 2（時刻）");
assert.equal(
  enEnduranceTime?.text,
  "19:00 START",
  "Endurance Stream time copy follows the supplied English visual draft"
);
assert.equal(
  enEnduranceTime?.x,
  107.66677969550031,
  "Endurance Stream time x follows the supplied English visual draft"
);
assert.equal(
  enEnduranceTime?.y,
  106.38891400669138,
  "Endurance Stream time y follows the supplied English visual draft"
);
const enProjectDraft = thumbnailCopy.localizeThumbnailPresetTextLayerBodies(
  thumbnailLib.createDraftFromPreset("project_stream"),
  "en"
);
const enProjectEnglish = textLayers(enProjectDraft).find((layer) => layer.name === "テキスト 5（英字）");
assert.equal(
  enProjectEnglish?.x,
  70.72194906920748,
  "Project Stream English label x follows the supplied English visual draft"
);
assert.equal(
  enProjectEnglish?.y,
  43.83235373903608,
  "Project Stream English label y follows the supplied English visual draft"
);
const enProjectHeadline = textLayers(enProjectDraft).find((layer) => layer.name === "テキスト 1（見出し）");
assert.equal(
  enProjectHeadline?.x,
  152.27771184429145,
  "Project Stream headline x follows the supplied English visual draft"
);
assert.equal(
  enProjectHeadline?.y,
  91.05362148476354,
  "Project Stream headline y follows the supplied English visual draft"
);
const enProjectSub = textLayers(enProjectDraft).find((layer) => layer.name === "テキスト 3（サブ）");
assert.equal(
  enProjectSub?.x,
  169.72228815570855,
  "Project Stream sub x follows the supplied English visual draft"
);
assert.equal(
  enProjectSub?.y,
  497.0004521204449,
  "Project Stream sub y follows the supplied English visual draft"
);
assert.equal(
  textLayers(enProjectDraft).find((layer) => layer.name === "テキスト 2（時刻）")?.text,
  "20:30 START",
  "Project Stream time copy follows the supplied English visual draft"
);
const enCoverSongDraft = thumbnailCopy.localizeThumbnailPresetTextLayerBodies(
  thumbnailLib.createDraftFromPreset("cover_song_notice"),
  "en"
);
const enCoverSongLabel = textLayers(enCoverSongDraft).find((layer) => layer.name === "テキスト 4（ラベル）");
assert.equal(
  enCoverSongLabel?.x,
  258.3120469977875,
  "Cover Song Notice label x follows the supplied English visual draft"
);
const enCoverSongHeadline = textLayers(enCoverSongDraft).find((layer) => layer.name === "テキスト 1（見出し）");
assert.equal(
  enCoverSongHeadline?.text,
  "Cover Song",
  "Cover Song Notice headline copy follows the supplied English visual draft"
);
assert.equal(
  enCoverSongHeadline?.x,
  18.186999313344018,
  "Cover Song Notice headline x follows the supplied English visual draft"
);
assert.equal(
  enCoverSongHeadline?.y,
  241.06307222787393,
  "Cover Song Notice headline y follows the supplied English visual draft"
);
assert.equal(
  textLayers(enCoverSongDraft).find((layer) => layer.name === "テキスト 2（時刻）")?.text,
  "20:00 public",
  "Cover Song Notice time copy follows the supplied English visual draft"
);
const enKaraokeDraft = thumbnailCopy.localizeThumbnailPresetTextLayerBodies(thumbnailLib.createDraftFromPreset("karaoke"), "en");
assert.equal(
  textLayers(enKaraokeDraft).find((layer) => layer.name === "テキスト 3（サブ）")?.text,
  "Requests welcome",
  "Karaoke sub copy is shortened for English visual balance"
);
assert.equal(
  textLayers(enKaraokeDraft).find((layer) => layer.name === "テキスト 1（見出し）")?.fontSize,
  166,
  "Karaoke headline gets an English-only font size adjustment"
);

for (const target of thumbnailLib.thumbnailMainTextCarryoverTargets) {
  assert.ok(["見出し", "時刻", "サブ", "ラベル"].includes(target.namePart), `${target.id} matching key remains Japanese namePart`);
}

const weekly = thumbnailLib.thumbnailPresets.find((preset) => preset.id === "weekly_schedule");
for (const dayName of ["月曜", "火曜", "水曜", "木曜", "金曜", "土曜", "日曜"]) {
  for (const columnName of ["曜日", "時間", "予定"]) {
    assert.ok(
      weekly.layers.some((layer) => layer.type === "text" && layer.name === `${dayName} / ${columnName}`),
      `weekly grouping key ${dayName} / ${columnName} remains stable`
    );
  }
}

assert.match(thumbnailSource, /v-streamer-tools:thumbnail-editor:draft:v1/, "Thumbnail draft storage key remains unchanged");
assert.match(thumbnailSource, /v-streamer-tools:thumbnail-editor:preset-discovery:v1/, "Thumbnail preset discovery storage key remains unchanged");
assert.match(handoffSource, /source: "schedule-calendar"/, "Schedule handoff source remains unchanged");
assert.match(handoffSource, /target: "thumbnail-editor"/, "Schedule handoff target remains unchanged");
assert.doesNotMatch(handoffSource, /presetTextLocale|localizedPresetText|variantId/, "Handoff payload does not gain preset locale/schema fields");

assert.match(
  thumbnailAppSource,
  /localizeThumbnailPresetTextLayerBodies\(createDraftFromPreset\(/,
  "Thumbnail Editor localizes preset text bodies only at draft creation/apply time"
);
assert.doesNotMatch(
  thumbnailAppSource,
  /getThumbnailPresetTextLayerVisualAdjustment/,
  "Thumbnail Editor does not apply visual adjustments outside the draft creation helper"
);
assert.match(
  thumbnailAppSource,
  /applyScheduleHandoffToThumbnailDraft\(next, handoffPayload\)/,
  "Schedule Calendar handoff text still overrides localized preset initial text"
);

console.log("thumbnail preset text locale contract checks passed");
