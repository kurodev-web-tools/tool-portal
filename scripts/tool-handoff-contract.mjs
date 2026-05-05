import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const sourcePath = path.join(root, "lib", "tool-handoff.ts");
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

assert.equal(typeof lib.createThumbnailToSnsHandoffPayload, "function", "thumbnail -> sns payload factory exists");
assert.equal(typeof lib.normalizeThumbnailToSnsHandoffPayload, "function", "thumbnail -> sns normalizer exists");

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

const normalized = lib.normalizeThumbnailToSnsHandoffPayload(payload, "sns-split-image-maker");
assert.equal(normalized.imageStorageId, "thumbnail-handoff-test");
assert.equal(normalized.announcementText, "本日20時から配信します。");

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

console.log("tool-handoff contract checks passed");
