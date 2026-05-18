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

const copyModule = loadTsModule("lib/schedule-calendar-copy.ts");
const appSource = read("components/schedule-calendar/ScheduleCalendarApp.tsx");
const scheduleLibSource = read("lib/schedule-calendar.ts");

assert.ok(copyModule.scheduleCalendarCopy.ja, "Schedule Calendar copy exposes Japanese strings");
assert.ok(copyModule.scheduleCalendarCopy.en, "Schedule Calendar copy exposes English strings");

assert.equal(copyModule.getScheduleCalendarCopy("ja").toolbar.title, "予定・配信管理", "Japanese toolbar title stays unchanged");
assert.equal(copyModule.getScheduleCalendarCopy("en").toolbar.title, "Schedule & stream planning", "English toolbar title is available");
assert.equal(copyModule.getScheduleCalendarCopy("ja").tabs.schedule, "予定管理", "Japanese schedule tab stays unchanged");
assert.equal(copyModule.getScheduleCalendarCopy("en").tabs.schedule, "Schedule", "English schedule tab is available");
assert.equal(copyModule.getScheduleCalendarCopy("ja").empty.events, "予定はまだありません。", "Japanese empty state stays unchanged");
assert.equal(copyModule.getScheduleCalendarCopy("en").empty.events, "No events yet.", "English empty state is available");
assert.match(
  copyModule.getScheduleCalendarCopy("en").postAssist.startGuide,
  /Select an event/i,
  "English post assist empty state explains the first action"
);
assert.match(
  copyModule.getScheduleCalendarCopy("en").handoff.selectedGuide,
  /Thumbnail Editor/i,
  "English handoff copy keeps the next-tool flow visible"
);
assert.match(
  copyModule.getScheduleCalendarCopy("en").settings.backupHelp,
  /JSON backup/i,
  "English backup and restore copy explains the data boundary"
);
assert.doesNotMatch(
  JSON.stringify(copyModule.scheduleCalendarCopy.en),
  /Google Calendar|external posting|IndexedDB|localStorage key/i,
  "English Schedule Calendar copy does not promise out-of-scope integrations or storage changes"
);

assert.match(appSource, /useLocale\(\)/, "Schedule Calendar reads the active locale");
assert.match(appSource, /getScheduleCalendarCopy\(locale\)/, "Schedule Calendar resolves copy from the active locale");
assert.match(appSource, /scheduleCopy/, "Schedule Calendar passes localized copy into panels");
assert.match(scheduleLibSource, /export const scheduleStorageVersion = 2;/, "Schedule Calendar copy work does not change storage version");
assert.match(scheduleLibSource, /v-streamer-tools:schedule-calendar-events:v1/, "Schedule Calendar copy work does not change the storage key");

console.log("schedule-calendar copy locale contract checks passed");
