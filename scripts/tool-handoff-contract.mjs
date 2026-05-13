import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const sourcePath = path.join(root, "lib", "tool-handoff.ts");
const fileNameSourcePath = path.join(root, "lib", "file-name.ts");
const thumbnailAppSourcePath = path.join(root, "components", "thumbnail-editor", "ThumbnailEditorApp.tsx");
const source = fs.readFileSync(sourcePath, "utf8");
const thumbnailAppSource = fs.readFileSync(thumbnailAppSourcePath, "utf8");
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
const fileNameSource = fs.readFileSync(fileNameSourcePath, "utf8");
const fileNameCompiled = ts.transpileModule(fileNameSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022
  }
}).outputText;
const fileNameModule = new Module(fileNameSourcePath);
fileNameModule.filename = fileNameSourcePath;
fileNameModule.paths = Module._nodeModulePaths(path.dirname(fileNameSourcePath));
fileNameModule._compile(fileNameCompiled, fileNameSourcePath);
const fileNameLib = fileNameModule.exports;

assert.equal(typeof lib.createThumbnailToSnsHandoffPayload, "function", "thumbnail -> sns payload factory exists");
assert.equal(typeof lib.normalizeThumbnailToSnsHandoffPayload, "function", "thumbnail -> sns normalizer exists");
assert.equal(typeof fileNameLib.sanitizeFileNamePart, "function", "shared filename part sanitizer exists");
assert.equal(typeof fileNameLib.createHandoffFileNameBase, "function", "shared handoff filename base helper exists");
assert.equal(typeof fileNameLib.createNumberedFilePattern, "function", "shared numbered file pattern helper exists");
assert.equal(fileNameLib.sanitizeFileNamePart(" 配信 告知/サムネ? "), "配信-告知-サムネ-", "filename part sanitizer preserves current handoff boundary");
assert.equal(
  fileNameLib.sanitizeFileNamePart("a".repeat(40)),
  "a".repeat(32),
  "filename part sanitizer keeps the existing 32-character candidate cap"
);
assert.equal(fileNameLib.createHandoffFileNameBase("2026-05-05", "配信 告知/サムネ?"), "20260505_配信-告知-サムネ-");
assert.equal(fileNameLib.createHandoffFileNameBase("", ""), "thumbnail", "empty thumbnail -> sns base falls back to thumbnail");
assert.equal(fileNameLib.createNumberedFilePattern(["20260505", "配信 告知/サムネ?"]), "20260505_配信-告知-サムネ-_{n}");
assert.equal(fileNameLib.createNumberedFilePattern([""], "thumbnail_{n}"), "{n}", "schedule -> sns empty candidate keeps the previous token-only boundary");
assert.match(
  thumbnailAppSource,
  /createHandoffFileNameBase/,
  "thumbnail app uses the shared helper for thumbnail -> sns filename candidates"
);
assert.doesNotMatch(thumbnailAppSource, /const sanitizeFilePatternPart =/, "thumbnail app does not keep a local handoff filename sanitizer");

const schedulePayloadInput = {
  eventId: "schedule-event-1",
  title: "定期配信",
  date: "2026-05-05",
  startTime: "20:00",
  endTime: "21:00",
  category: "stream",
  categoryLabel: "配信",
  platform: "YouTube",
  announcementText: "本日20時から配信します。",
  hashtags: "#VTuber #配信告知",
  announcementStatus: "copy-ready",
  announcementStatusLabel: "投稿文準備済み"
};

const scheduleToThumbnailPayload = lib.createScheduleHandoffPayload("thumbnail-editor", schedulePayloadInput);

assert.equal(scheduleToThumbnailPayload.version, 1);
assert.equal(scheduleToThumbnailPayload.source, "schedule-calendar");
assert.equal(scheduleToThumbnailPayload.target, "thumbnail-editor");
assert.equal(scheduleToThumbnailPayload.title, "定期配信");
assert.equal(scheduleToThumbnailPayload.announcementText, "本日20時から配信します。");
assert.equal("imageStorageId" in scheduleToThumbnailPayload, false, "schedule handoff does not carry image body refs");
assert.equal(lib.normalizeScheduleHandoffPayload(scheduleToThumbnailPayload, "thumbnail-editor").eventId, "schedule-event-1");
assert.equal(
  lib.normalizeScheduleHandoffPayload({ ...scheduleToThumbnailPayload, target: "sns-split-image-maker" }, "thumbnail-editor"),
  null,
  "schedule target mismatch is ignored"
);
assert.equal(
  lib.normalizeScheduleHandoffPayload({ ...scheduleToThumbnailPayload, expiresAt: "2020-01-01T00:00:00.000Z" }, "thumbnail-editor"),
  null,
  "expired schedule payload is ignored"
);

const longScheduleHandoffPayload = lib.createScheduleHandoffPayload("thumbnail-editor", {
  ...schedulePayloadInput,
  title: "長".repeat(200),
  announcementText: "告".repeat(2000),
  hashtags: "#tag ".repeat(120)
});
assert.equal(longScheduleHandoffPayload.title.length, 120, "schedule handoff title is capped before sessionStorage write");
assert.equal(longScheduleHandoffPayload.announcementText.length, 1200, "schedule handoff announcement text is capped before sessionStorage write");
assert.equal(longScheduleHandoffPayload.hashtags.length, 300, "schedule handoff hashtags are capped before sessionStorage write");
assert.equal(
  lib.normalizeScheduleHandoffPayload(longScheduleHandoffPayload, "thumbnail-editor").announcementText.length,
  1200,
  "schedule handoff normalizer preserves the compact announcement limit"
);
assert.ok(
  JSON.stringify(longScheduleHandoffPayload).length < 2500,
  "schedule handoff payload stays compact even with long copy input"
);

const scheduleToSnsPayload = lib.createScheduleHandoffPayload("sns-split-image-maker", schedulePayloadInput);
assert.equal(scheduleToSnsPayload.target, "sns-split-image-maker");
assert.equal(lib.normalizeScheduleHandoffPayload(scheduleToSnsPayload, "sns-split-image-maker").title, "定期配信");

const payload = lib.createThumbnailToSnsHandoffPayload({
  imageStorageId: "thumbnail-handoff-test",
  title: "配信告知サムネ",
  date: "2026-05-05",
  categoryLabel: "配信",
  platform: "YouTube",
  announcementText: "本日20時から配信します。",
  hashtags: "#VTuber #配信告知",
  fileNameBase: "20260505-stream"
});

assert.equal(payload.version, 1);
assert.equal(payload.source, "thumbnail-editor");
assert.equal(payload.target, "sns-split-image-maker");
assert.equal(payload.imageStorageId, "thumbnail-handoff-test");
assert.equal(payload.title, "配信告知サムネ");
assert.equal(payload.fileNameBase, "20260505-stream");
assert.equal("userMaterialRefs" in payload, false, "thumbnail -> sns payload does not carry user material metadata");
assert.equal(JSON.stringify(payload).includes("data:image"), false, "thumbnail -> sns payload does not carry image bodies");

const longThumbnailPayload = lib.createThumbnailToSnsHandoffPayload({
  imageStorageId: `thumbnail-handoff-${"id".repeat(90)}`,
  title: "長".repeat(200),
  date: "2026-05-05-extra-date-text-that-should-not-grow",
  categoryLabel: "カテゴリ".repeat(40),
  platform: "YouTube".repeat(20),
  announcementText: "告".repeat(2000),
  hashtags: "#tag ".repeat(120),
  fileNameBase: "thumbnail-file-name-base-".repeat(8),
  userMaterialRefs: [{ storageId: "user-material-storage", name: "ロゴ" }],
  materialRef: { storageId: "user-material-storage" },
  imageData: "data:image/png;base64,should-not-survive"
});
assert.equal(longThumbnailPayload.imageStorageId.length, 120, "thumbnail -> sns image storage id is capped before sessionStorage write");
assert.equal(longThumbnailPayload.title.length, 120, "thumbnail -> sns title is capped before sessionStorage write");
assert.equal(longThumbnailPayload.announcementText.length, 1200, "thumbnail -> sns announcement text is capped before sessionStorage write");
assert.equal(longThumbnailPayload.hashtags.length, 300, "thumbnail -> sns hashtags are capped before sessionStorage write");
assert.equal(longThumbnailPayload.fileNameBase.length, 80, "thumbnail -> sns filename base is capped before sessionStorage write");
assert.equal("userMaterialRefs" in longThumbnailPayload, false, "thumbnail -> sns factory drops user material metadata");
assert.equal("materialRef" in longThumbnailPayload, false, "thumbnail -> sns factory drops material refs");
assert.equal(JSON.stringify(longThumbnailPayload).includes("data:image"), false, "thumbnail -> sns factory drops image bodies");
assert.ok(JSON.stringify(longThumbnailPayload).length < 2500, "thumbnail -> sns payload stays compact even with long copy input");

const normalized = lib.normalizeThumbnailToSnsHandoffPayload(payload, "sns-split-image-maker");
assert.equal(normalized.imageStorageId, "thumbnail-handoff-test");
assert.equal(normalized.announcementText, "本日20時から配信します。");
const normalizedWithExtraUserMaterialFields = lib.normalizeThumbnailToSnsHandoffPayload(
  {
    ...payload,
    userMaterialRefs: [{ storageId: "user-material-storage", name: "ロゴ" }],
    materialRef: { storageId: "user-material-storage" },
    imageData: "data:image/png;base64,should-not-survive"
  },
  "sns-split-image-maker"
);
assert.equal("userMaterialRefs" in normalizedWithExtraUserMaterialFields, false, "thumbnail -> sns normalizer drops user material metadata");
assert.equal("materialRef" in normalizedWithExtraUserMaterialFields, false, "thumbnail -> sns normalizer drops user material refs");
assert.equal(JSON.stringify(normalizedWithExtraUserMaterialFields).includes("data:image"), false, "thumbnail -> sns normalizer drops image bodies");

assert.equal(
  lib.normalizeThumbnailToSnsHandoffPayload({ ...payload, target: "thumbnail-editor" }, "sns-split-image-maker"),
  null,
  "target mismatch is ignored"
);
assert.equal(
  lib.normalizeThumbnailToSnsHandoffPayload({ ...payload, source: "schedule-calendar" }, "sns-split-image-maker"),
  null,
  "source mismatch is ignored"
);
assert.equal(
  lib.normalizeThumbnailToSnsHandoffPayload({ ...payload, expiresAt: "2020-01-01T00:00:00.000Z" }, "sns-split-image-maker"),
  null,
  "expired payload is ignored"
);

const url = lib.buildToolHandoffUrl("sns-split-image-maker", "short-token");
assert.equal(url, "/tools/sns-split-image-maker?handoff=short-token&preset=split-4");
assert.equal(url.includes("配信告知サムネ"), false, "handoff url does not contain title text");
assert.equal(url.includes("data:image"), false, "handoff url does not contain image data");

const storage = new Map();
global.window = {
  location: { search: "?handoff=ok-token" },
  sessionStorage: {
    setItem: (key, value) => storage.set(key, value),
    getItem: (key) => storage.get(key) ?? null,
    removeItem: (key) => storage.delete(key)
  }
};
const token = lib.writeToolHandoff(scheduleToThumbnailPayload);
assert.equal(typeof token, "string", "writeToolHandoff returns a token");
global.window.location.search = `?handoff=${token}`;
assert.equal(lib.readToolHandoff("thumbnail-editor").title, "定期配信");
assert.equal(lib.readToolHandoff("thumbnail-editor"), null, "handoff payload is single-use");
global.window.location.search = "?handoff=missing-token";
assert.equal(lib.readToolHandoff("thumbnail-editor"), null, "missing token returns normal startup fallback");

global.window = {
  sessionStorage: {
    setItem: () => {
      throw new Error("quota exceeded");
    }
  }
};
assert.equal(lib.writeToolHandoff(scheduleToThumbnailPayload), null, "sessionStorage write failure returns null");
delete global.window;

console.log("tool-handoff contract checks passed");
