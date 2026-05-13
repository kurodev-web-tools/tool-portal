import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const sourcePath = path.join(root, "lib", "schedule-calendar.ts");
const source = fs.readFileSync(sourcePath, "utf8");
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

assert.equal(lib.scheduleStorageVersion, 2, "schedule storage version remains stable");
assert.equal(lib.scheduleStorageKey, "v-streamer-tools:schedule-calendar-events:v1", "schedule storage key remains stable");
assert.deepEqual(
  lib.scheduleInputTextLimits,
  {
    title: 120,
    announcementText: 1200,
    announcementHashtags: 300,
    postTemplateBody: 2000
  },
  "schedule input text limits stay small and explicit"
);
assert.equal(lib.clampScheduleText("x".repeat(121), lib.scheduleInputTextLimits.title).length, 120, "title text is clamped at save boundary");

const legacyEvent = {
  id: "legacy-midnight-end",
  title: "深夜枠",
  date: "2026-05-12",
  startTime: "23:30",
  endTime: "24:00",
  category: "stream",
  platform: "YouTube",
  memo: "旧データ由来"
};
const legacyPayload = lib.normalizeStoragePayload([legacyEvent]);
assert.equal(legacyPayload.version, 2, "legacy event arrays migrate into versioned payload");
assert.equal(legacyPayload.events[0].startTime, "23:30", "valid legacy start time is preserved");
assert.equal(legacyPayload.events[0].endTime, "23:59", "legacy 24:00 end time is capped to the last valid time input value");
assert.equal(legacyPayload.events[0].announcementText, "", "missing announcement text is filled safely");
assert.equal(legacyPayload.events[0].announcementStatus, "not-started", "missing announcement status uses the default");

const longLegacyPayload = lib.normalizeStoragePayload([
  {
    ...legacyEvent,
    id: "legacy-long-copy",
    title: "長".repeat(200),
    announcementText: "告".repeat(2000),
    announcementHashtags: "#tag ".repeat(120)
  }
]);
assert.equal(longLegacyPayload.version, 2, "long legacy payload still normalizes into version 2");
assert.equal(longLegacyPayload.events[0].title.length, lib.scheduleInputTextLimits.title, "legacy titles are capped for readable schedule surfaces");
assert.equal(
  longLegacyPayload.events[0].announcementText.length,
  lib.scheduleInputTextLimits.announcementText,
  "legacy announcement text is capped before post assist surfaces"
);
assert.equal(
  longLegacyPayload.events[0].announcementHashtags.length,
  lib.scheduleInputTextLimits.announcementHashtags,
  "legacy hashtags are capped before handoff"
);

const invalidTimePayload = lib.normalizeStoragePayload({
  version: 2,
  events: [
    {
      ...legacyEvent,
      id: "invalid-time",
      startTime: "25:00",
      endTime: "99:99"
    }
  ],
  settings: {
    defaultView: "week",
    weekStartsOn: 0,
    defaultStartTime: "24:00",
    defaultDurationMinutes: 60,
    defaultTemplateId: "stream-notice"
  },
  postTemplates: [],
  hashtagSets: []
});
assert.equal(invalidTimePayload.events[0].startTime, "20:00", "invalid event start time falls back to a safe time input value");
assert.equal(invalidTimePayload.events[0].endTime, "21:00", "invalid event end time falls back to a safe time range");
assert.equal(invalidTimePayload.settings.defaultStartTime, "20:00", "invalid default start time falls back instead of creating an unsaveable draft");

const longTemplatePayload = lib.normalizeStoragePayload({
  version: 2,
  events: [],
  settings: {},
  postTemplates: [
    {
      id: "long-template",
      name: "長文テンプレート",
      description: "境界確認",
      usageCategory: "x-post",
      defaultPlatform: "X",
      body: "本".repeat(2400),
      hashtags: "#tag ".repeat(120)
    }
  ],
  hashtagSets: []
});
assert.equal(
  longTemplatePayload.postTemplates[0].body.length,
  lib.scheduleInputTextLimits.postTemplateBody,
  "template body is capped for readable post assist preview"
);
assert.equal(
  longTemplatePayload.postTemplates[0].hashtags.length,
  lib.scheduleInputTextLimits.announcementHashtags,
  "template hashtags use the same compact hashtag limit"
);

console.log("schedule-calendar storage contract checks passed");
