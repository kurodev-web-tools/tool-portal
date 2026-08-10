import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = process.cwd();
const parserPath = "lib/comment-translator-creator-glossary-csv-import.ts";
const actionPath = "app/tools/comment-translator/glossary-actions.ts";
const panelPath = "components/comment-translator/CommentTranslatorCreatorGlossaryImportPanel.tsx";
const parserSource = readIfPresent(parserPath);
const actionSource = readIfPresent(actionPath);
const panelSource = readIfPresent(panelPath);

assert.ok(fs.existsSync(path.join(root, parserPath)), "NC-X5 RED: glossary CSV parser is missing");
assert.ok(fs.existsSync(path.join(root, actionPath)), "NC-X5 RED: glossary import actions are missing");
assert.ok(fs.existsSync(path.join(root, panelPath)), "NC-X5 RED: glossary import panel is missing");

assert.match(parserSource, /^import "server-only";/, "parser is server-only");
assert.match(parserSource, /TextDecoder\s*\(\s*["']utf-8["']/i, "parser uses strict UTF-8 decoding");
assert.match(parserSource, /128\s*\*\s*1024|131072/, "parser declares the pre-decode byte bound");
assert.match(parserSource, /language_scope/);
assert.match(parserSource, /normalizedTerm/);
assert.match(parserSource, /NFKC/);
assert.match(parserSource, /collision/i);
assert.match(parserSource, /formula|injection/i);
assert.doesNotMatch(parserSource, /papaparse|csv-parse|fast-csv|lodash|fetch\s*\(|localStorage|sessionStorage|indexedDB|console\./i);

assert.match(actionSource, /^"use server";/, "actions are server actions");
assert.match(actionSource, /readCommentTranslatorCreatorActionCallerAuthority\s*\(/, "actions use the exact caller authority seam");
assert.match(actionSource, /createTrustedCommentTranslatorCreatorGlossaryStore\s*\(/, "actions use the trusted glossary store only");
assert.match(actionSource, /createCommentTranslatorCreatorGlossaryRuntime\s*\(/, "actions use the existing glossary runtime");
assert.match(actionSource, /previewCommentTranslatorCreatorGlossaryImportAction/);
assert.match(actionSource, /applyCommentTranslatorCreatorGlossaryImportAction/);
assert.doesNotMatch(actionSource, /readCommentTranslatorActionCallerAuthorization|createClient|supabase|alternateStore|fetch\s*\(|localStorage|sessionStorage|indexedDB|console\.|ownerUserId\s*:/i);
assert.doesNotMatch(actionSource, /suggest|provider|stripe|entitlement|paid|R2|migration|rpc|cookies|headers|searchParams/i);

assert.match(panelSource, /^"use client";/, "panel is a client component");
assert.match(panelSource, /previewCommentTranslatorCreatorGlossaryImportAction/);
assert.match(panelSource, /applyCommentTranslatorCreatorGlossaryImportAction/);
assert.match(panelSource, /Cancel/i, "panel has a cancel control");
assert.match(panelSource, /Apply/i, "panel has an explicit apply control");
assert.match(panelSource, /disabled=/, "panel gates Apply before ready preview");
assert.match(panelSource, /expectedVersion:\s*preview\.expectedVersion/, "Apply resends the previewed version only");
assert.match(panelSource, /phase === "ready"/, "Apply is gated by a ready preview");
assert.match(panelSource, /catch\s*\{\s*setFileName\(null\);\s*setPhase\("idle"\);\s*setMessage\("The selected file could not be read\."\);\s*\}/, "read failure clears selected-file memory");
assert.match(panelSource, /function handleCancel\(\)\s*\{\s*setBytes\(null\);\s*setFileName\(null\);\s*setPreview\(null\);\s*setPhase\("idle"\);\s*setMessage\(null\);/, "Cancel clears component-memory state");
assert.doesNotMatch(panelSource, /useEffect|localStorage|sessionStorage|indexedDB|fetch\s*\(|searchParams|useRouter|router\.|console\.|ownerUserId|plan|provider|storage|entitlement|paid|suggest/i);
assert.doesNotMatch(panelSource, /onSubmit|<form/i, "panel has no automatic form submit");

const actionMockKeys = {
  caller: "comment-translator-creator-nc-x5-caller",
  store: "comment-translator-creator-nc-x5-store",
  runtime: "comment-translator-creator-nc-x5-runtime"
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript,export{}" };
    if (specifier === "@/app/tools/comment-translator/action-context" || (specifier === "./action-context" && context.parentURL?.endsWith("/app/tools/comment-translator/glossary-actions.ts"))) {
      return { shortCircuit: true, url: dataModule(`
        export async function readCommentTranslatorCreatorActionCallerAuthority() {
          return globalThis[Symbol.for(${JSON.stringify(actionMockKeys.caller)})]();
        }
      `) };
    }
    if (specifier === "@/lib/comment-translator-creator-glossary-store") {
      return { shortCircuit: true, url: dataModule(`
        export function createTrustedCommentTranslatorCreatorGlossaryStore() {
          return globalThis[Symbol.for(${JSON.stringify(actionMockKeys.store)})]();
        }
      `) };
    }
    if (specifier === "@/lib/comment-translator-creator-glossary-runtime") {
      return { shortCircuit: true, url: dataModule(`
        export function createCommentTranslatorCreatorGlossaryRuntime(options) {
          return globalThis[Symbol.for(${JSON.stringify(actionMockKeys.runtime)})](options);
        }
      `) };
    }
    if (specifier === "@/lib/comment-translator-creator-glossary-csv-import") {
      return { shortCircuit: true, url: pathToFileURL(path.join(root, parserPath)).href };
    }
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const candidate = fileURLToPath(new URL(specifier, context.parentURL));
      if (fs.existsSync(`${candidate}.ts`)) return { shortCircuit: true, url: pathToFileURL(`${candidate}.ts`).href };
    }
    return nextResolve(specifier, context);
  }
});

const parser = await import(pathToFileURL(path.join(root, parserPath)).href);
const action = await import(pathToFileURL(path.join(root, actionPath)).href);
let callerAuthority = { status: "authenticated", ownerUserId: "server-owned-owner" };
let currentStatus = { status: "ready", termCount: 1, version: 7, effectiveVersion: "glossary-v7" };
let replaceCalls = [];
let readCalls = [];
let actionStore = { status: "ready", store: {} };

globalThis[Symbol.for(actionMockKeys.caller)] = async () => callerAuthority;
globalThis[Symbol.for(actionMockKeys.store)] = () => actionStore;
globalThis[Symbol.for(actionMockKeys.runtime)] = () => ({
  async readStatus({ callerAuthority: authority }) {
    readCalls.push({ authority });
    return currentStatus;
  },
  async replace(request) {
    replaceCalls.push(request);
    return { status: "updated", termCount: request.entries.length, version: 8, effectiveVersion: "glossary-v8" };
  }
});

const validCsv = (lineEnding = "\r\n") => [
  "language_scope,term,replacement,note",
  `JA_jp,ＯＢＳ,OBS Studio,`,
  `en,"a,b","x""y 😀","line1${lineEnding}line2"`
].join(lineEnding) + lineEnding;

assert.equal(parser.commentTranslatorCreatorGlossaryCsvMaxBytes, 128 * 1024, "CSV byte bound is 128 KiB");
assert.equal(parser.commentTranslatorCreatorGlossaryCsvMaxRows, 30, "CSV row bound is 30");
assert.deepEqual(parser.commentTranslatorCreatorGlossaryCsvHeaders, ["language_scope", "term", "replacement", "note"]);

const parsedBom = parser.parseCommentTranslatorCreatorGlossaryCsv(utf8(`\ufeff${validCsv()}`));
assert.equal(parsedBom.status, "ready", `valid UTF-8 BOM CSV parses: ${JSON.stringify(parsedBom)}`);
assert.equal(parsedBom.entries.length, 2);
assert.deepEqual(parsedBom.entries[1], {
  languageScope: "ja-jp",
  term: "OBS",
  replacement: "OBS Studio",
  note: null,
  normalizedTerm: "obs"
});
assert.deepEqual(parsedBom.entries[0], {
  languageScope: "en",
  term: "a,b",
  replacement: "x\"y 😀",
  note: "line1 line2",
  normalizedTerm: "a,b"
});
assert.equal(parser.parseCommentTranslatorCreatorGlossaryCsv(utf8(validCsv("\n"))).status, "ready", "LF CSV parses");
assert.equal(parser.parseCommentTranslatorCreatorGlossaryCsv(utf8(validCsv())).entries[1].note, null, "empty note becomes null");

for (const [label, bytes] of [
  ["invalid UTF-8", Uint8Array.from([0xff, 0xfe, 0xfd])],
  ["UTF-16 LE BOM", Uint8Array.from([0xff, 0xfe, 0x61])],
  ["UTF-16 BE BOM", Uint8Array.from([0xfe, 0xff, 0x61])],
  ["UTF-32 LE BOM", Uint8Array.from([0xff, 0xfe, 0x00, 0x00, 0x61])],
  ["UTF-32 BE BOM", Uint8Array.from([0x00, 0x00, 0xfe, 0xff, 0x61])],
  ["NUL", utf8(`language_scope,term,replacement,note\r\nja,a\u0000,b,\r\n`)],
  ["disallowed control", utf8(`language_scope,term,replacement,note\r\nja,a\u0007,b,\r\n`)],
  ["bare CR", utf8(`language_scope,term,replacement,note\r\nja,a,b,note\rc\r\n`)],
  ["unclosed quote", utf8(`language_scope,term,replacement,note\r\nja,"a,b,c\r\n`)],
  ["trailing quote data", utf8(`language_scope,term,replacement,note\r\nja,"a"oops,b,c\r\n`)],
  ["header only", utf8("language_scope,term,replacement,note\r\n")],
  ["blank logical row", utf8("language_scope,term,replacement,note\r\n,,,\r\n")],
  ["too many rows", utf8(["language_scope,term,replacement,note", ...Array.from({ length: 31 }, (_, index) => `ja,term-${index},replacement,`)].join("\r\n") + "\r\n")],
  ["collision", utf8("language_scope,term,replacement,note\r\nJA_jp,ＯＢＳ,a,\r\nja_jp,obs,b,\r\n")],
  ["language bound", utf8(`language_scope,term,replacement,note\r\n${"a".repeat(36)},term,replacement,\r\n`)],
  ["term bound", utf8(`language_scope,term,replacement,note\r\nja,${"a".repeat(101)},replacement,\r\n`)],
  ["replacement bound", utf8(`language_scope,term,replacement,note\r\nja,term,${"a".repeat(201)},\r\n`)],
  ["note bound", utf8(`language_scope,term,replacement,note\r\nja,term,replacement,${"a".repeat(501)}\r\n`)]
]) {
  const result = parser.parseCommentTranslatorCreatorGlossaryCsv(bytes);
  assert.equal(result.status, "rejected", `${label} is rejected`);
}

for (const prefix of ["=", "+", "-", "@"] ) {
  for (const leading of [" ", "\t"]) {
    const result = parser.parseCommentTranslatorCreatorGlossaryCsv(
      utf8(`language_scope,term,replacement,note\r\nja,${leading}${prefix}formula,replacement,\r\n`)
    );
    assert.equal(result.status, "rejected", `formula prefix rejected after leading whitespace: ${leading}${prefix}`);
  }
}
assert.equal(
  parser.parseCommentTranslatorCreatorGlossaryCsv(utf8("language_scope,term,replacement,note\r\nja,\u3000＝SUM(A1),replacement,\r\n")).status,
  "rejected",
  "NFKC formula prefix is rejected"
);

for (const header of [
  "term,language_scope,replacement,note",
  "language_scope,term,replacement",
  "language_scope,term,replacement,note,unexpected",
  "language_scope,term,term,note"
]) {
  assert.equal(parser.parseCommentTranslatorCreatorGlossaryCsv(utf8(`${header}\r\nja,term,replacement,\r\n`)).status, "rejected", `header variant rejected: ${header}`);
}

const exactThirty = parser.parseCommentTranslatorCreatorGlossaryCsv(utf8([
  "language_scope,term,replacement,note",
  ...Array.from({ length: 30 }, (_, index) => `ja,term-${index},replacement-${index},`)
].join("\r\n") + "\r\n"));
assert.equal(exactThirty.status, "ready", "exactly 30 data rows are accepted");
const oversizedBytes = new Uint8Array(128 * 1024 + 1);
assert.equal(parser.parseCommentTranslatorCreatorGlossaryCsv(oversizedBytes).status, "rejected", "over-bound bytes reject before decode");

replaceCalls = [];
readCalls = [];
currentStatus = { status: "ready", termCount: 1, version: 7, effectiveVersion: "glossary-v7" };
const preview = await action.previewCommentTranslatorCreatorGlossaryImportAction(utf8(validCsv()));
assert.equal(preview.status, "ready", "preview succeeds for authenticated existing glossary");
assert.equal(preview.expectedVersion, 7, "preview uses existing glossary version");
assert.equal(preview.rows.length, 2);
assert.equal(replaceCalls.length, 0, "preview performs zero writes");
assert.equal(JSON.stringify(preview).includes("server-owned-owner"), false, "preview excludes owner identity");
assert.equal(readCalls.at(-1).authority.ownerUserId, "server-owned-owner", "caller owner is server-derived");

replaceCalls = [];
const invalidPreview = await action.previewCommentTranslatorCreatorGlossaryImportAction(utf8("language_scope,term,replacement,note\r\nja,\u0000,b,\r\n"));
assert.equal(invalidPreview.status, "invalid", "invalid preview is rejected with a fixed class");
assert.equal(replaceCalls.length, 0, "invalid preview performs zero writes");
const invalidApply = await action.applyCommentTranslatorCreatorGlossaryImportAction({
  bytes: utf8("language_scope,term,replacement,note\r\nja,\u0000,b,\r\n"),
  expectedVersion: 7
});
assert.equal(invalidApply.status, "invalid", "invalid apply is rejected with a fixed class");
assert.equal(replaceCalls.length, 0, "invalid apply performs zero writes");

replaceCalls = [];
const applyBytes = utf8("language_scope,term,replacement,note\r\nja,second,changed,\r\n");
const applied = await action.applyCommentTranslatorCreatorGlossaryImportAction({ bytes: applyBytes, expectedVersion: 7 });
assert.deepEqual(applied, { status: "applied", termCount: 1, version: 8, effectiveVersion: "glossary-v8" });
assert.equal(replaceCalls.length, 1, "valid apply performs exactly one replace");
assert.equal(replaceCalls[0].ownerUserId, undefined, "action does not choose a client owner field");
assert.equal(replaceCalls[0].callerAuthority.ownerUserId, "server-owned-owner", "runtime receives server-derived caller");
assert.equal(replaceCalls[0].entries[0].term, "second", "apply reparses the original apply bytes");

replaceCalls = [];
currentStatus = { status: "ready", termCount: 1, version: 8, effectiveVersion: "glossary-v8" };
const stale = await action.applyCommentTranslatorCreatorGlossaryImportAction({ bytes: applyBytes, expectedVersion: 7 });
assert.deepEqual(stale, { status: "stale", requiresPreview: true }, "stale apply requests a fresh preview");
assert.equal(replaceCalls.length, 0, "stale apply performs zero writes");

replaceCalls = [];
currentStatus = { status: "fail-closed", reason: "glossary-missing", termCount: 0, version: null, effectiveVersion: null };
const missingPreview = await action.previewCommentTranslatorCreatorGlossaryImportAction(utf8(validCsv()));
assert.equal(missingPreview.status, "ready");
assert.equal(missingPreview.expectedVersion, 0, "missing glossary preview uses expectedVersion zero");
const missingApplied = await action.applyCommentTranslatorCreatorGlossaryImportAction({ bytes: applyBytes, expectedVersion: 0 });
assert.equal(missingApplied.status, "applied", "missing glossary can be created with expectedVersion zero");
assert.equal(replaceCalls.length, 1, "missing glossary fresh apply has one replace");

for (const [label, caller, store, status] of [
  ["unauthenticated", { status: "unauthenticated" }, actionStore, currentStatus],
  ["auth unavailable", { status: "unavailable" }, actionStore, currentStatus],
  ["store unavailable", { status: "authenticated", ownerUserId: "server-owned-owner" }, { status: "unavailable", store: null, reason: "trusted-service-role-env-missing" }, currentStatus],
  ["glossary unreadable", { status: "authenticated", ownerUserId: "server-owned-owner" }, actionStore, { status: "fail-closed", reason: "glossary-unreadable", termCount: 0, version: null, effectiveVersion: null }]
]) {
  replaceCalls = [];
  callerAuthority = caller;
  actionStore = store;
  currentStatus = status;
  const previewFailure = await action.previewCommentTranslatorCreatorGlossaryImportAction(utf8(validCsv()));
  assert.notEqual(previewFailure.status, "ready", `${label} preview fails closed`);
  const applyFailure = await action.applyCommentTranslatorCreatorGlossaryImportAction({ bytes: applyBytes, expectedVersion: 0 });
  assert.notEqual(applyFailure.status, "applied", `${label} apply fails closed`);
  assert.equal(replaceCalls.length, 0, `${label} performs zero writes`);
}

assert.equal(actionSource.includes("previewedRows"), false, "apply has no preview-row authority input");
process.stdout.write("comment translator Creator NC-X5 bounded CSV import contract passed\n");

function readIfPresent(relativePath) {
  const absolutePath = path.join(root, relativePath);
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : "";
}

function utf8(value) {
  return new TextEncoder().encode(value);
}

function dataModule(source) {
  return `data:text/javascript,${encodeURIComponent(source)}`;
}
