import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  createDictionaryStore,
  expectedDictionaryVersion,
  nowIso,
  otherOwnerAuthorization,
  ownerAuthorization,
  unauthenticated
} from "./comment-translator-creator-c9-contract-fixture.mjs";

const runtimeUrl = new URL("../lib/comment-translator-custom-dictionary-runtime.ts", import.meta.url);
assert.equal(fs.existsSync(runtimeUrl), true, "C9 custom dictionary runtime must exist");

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript,export{}" };
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const candidate = `${fileURLToPath(new URL(specifier, context.parentURL))}.ts`;
      if (fs.existsSync(candidate)) return { shortCircuit: true, url: pathToFileURL(candidate).href };
    }
    return nextResolve(specifier, context);
  }
});

const runtime = await import(runtimeUrl);
assert.equal(runtime.commentTranslatorCustomDictionaryContract.maxCurrentTerms, 30);
assert.deepEqual(runtime.commentTranslatorCustomDictionaryContract.sourceLanguages, ["ja", "en", "ko", "zh"]);
assert.deepEqual(runtime.commentTranslatorCustomDictionaryContract.targetLanguages, ["ja", "en"]);
assert.equal(runtime.commentTranslatorCustomDictionaryContract.ownerAuthority, "authenticated-server-derived-caller-only");

const store = createDictionaryStore();
const storeFactory = { status: "ready", store, missingEnvReferences: [] };
const common = { callerAuthorization: ownerAuthorization, dictionaryStore: storeFactory, nowIso: () => nowIso };

assert.deepEqual(await runtime.createCommentTranslatorCustomDictionaryEntry({
  ...common,
  input: { term: " Kuro ", replacement: "クロ", note: "  streamer\n name  ", sourceLanguage: "en", targetLanguage: "ja" }
}), {
  status: "applied",
  operation: "create",
  currentTermCount: 1,
  dictionaryVersion: expectedDictionaryVersion([{
    normalizedTerm: "kuro", replacement: "クロ", sourceLanguage: "en", targetLanguage: "ja"
  }]),
  browserReadableEntryContent: "not-returned-by-design"
});

const firstEntry = store.entriesByOwner.get(ownerAuthorization.ownerUserId)[0];
assert.equal(firstEntry.term, "Kuro");
assert.equal(firstEntry.note, "streamer name");
assert.equal(firstEntry.ownerUserId, ownerAuthorization.ownerUserId);
assert.equal(firstEntry.sourceLanguage, "en");
assert.equal(firstEntry.targetLanguage, "ja");

const firstRead = await runtime.readCommentTranslatorCustomDictionary(common);
assert.equal(firstRead.status, "ready");
assert.equal(firstRead.currentTermCount, 1);
assert.equal(firstRead.entries[0].term, "Kuro");
assert.equal(firstRead.entries[0].replacement, "クロ");
assert.equal(firstRead.entries[0].note, "streamer name");
assert.equal(Object.hasOwn(firstRead.entries[0], "ownerUserId"), false);

const otherOwnerRead = await runtime.readCommentTranslatorCustomDictionary({
  ...common,
  callerAuthorization: otherOwnerAuthorization
});
assert.deepEqual(otherOwnerRead, {
  status: "ready", entries: [], currentTermCount: 0, dictionaryVersion: null,
  browserReadableEntryContent: "not-returned-by-design"
});

assert.equal((await runtime.createCommentTranslatorCustomDictionaryEntry({
  ...common,
  input: { term: "Ｋｕｒｏ", replacement: "クロ", sourceLanguage: "en", targetLanguage: "ja" }
})).reason, "duplicate-entry");
assert.equal((await runtime.createCommentTranslatorCustomDictionaryEntry({
  ...common,
  input: { term: "kuro", replacement: "黒", sourceLanguage: "en", targetLanguage: "ja" }
})).reason, "conflicting-entry");

for (const input of [
  { term: "", replacement: "x", sourceLanguage: "en", targetLanguage: "ja" },
  { term: "x", replacement: "", sourceLanguage: "en", targetLanguage: "ja" },
  { term: "x".repeat(81), replacement: "y", sourceLanguage: "en", targetLanguage: "ja" },
  { term: "x", replacement: "y".repeat(121), sourceLanguage: "en", targetLanguage: "ja" },
  { term: "x", replacement: "y", note: "n".repeat(241), sourceLanguage: "en", targetLanguage: "ja" },
  { term: "x", replacement: "y", sourceLanguage: "fr", targetLanguage: "ja" },
  { term: "x", replacement: "y", sourceLanguage: "en", targetLanguage: "ko" },
  { term: "x", replacement: "y", sourceLanguage: "en", targetLanguage: "en" }
]) {
  const result = await runtime.createCommentTranslatorCustomDictionaryEntry({ ...common, input });
  assert.equal(result.status, "unavailable");
  assert.equal(result.reason, "invalid-entry");
}

const noteOnlyUpdate = await runtime.updateCommentTranslatorCustomDictionaryEntry({
  ...common,
  input: {
    entryId: firstEntry.entryId, term: "Kuro", replacement: "クロ", note: "updated note",
    sourceLanguage: "en", targetLanguage: "ja", expectedUpdatedAtIso: firstEntry.updatedAtIso
  }
});
assert.equal(noteOnlyUpdate.status, "applied");
assert.equal(noteOnlyUpdate.dictionaryVersion, firstRead.dictionaryVersion, "note-only edits keep the effective cache version");

const replacementUpdate = await runtime.updateCommentTranslatorCustomDictionaryEntry({
  ...common,
  input: {
    entryId: firstEntry.entryId, term: "Kuro", replacement: "黒", note: "updated note",
    sourceLanguage: "en", targetLanguage: "ja", expectedUpdatedAtIso: nowIso
  }
});
assert.equal(replacementUpdate.status, "applied");
assert.notEqual(replacementUpdate.dictionaryVersion, firstRead.dictionaryVersion);

assert.equal((await runtime.updateCommentTranslatorCustomDictionaryEntry({
  ...common,
  callerAuthorization: otherOwnerAuthorization,
  input: {
    entryId: firstEntry.entryId, term: "Kuro", replacement: "other", sourceLanguage: "en", targetLanguage: "ja",
    expectedUpdatedAtIso: nowIso
  }
})).reason, "entry-missing");
assert.equal((await runtime.deleteCommentTranslatorCustomDictionaryEntry({
  ...common, callerAuthorization: otherOwnerAuthorization, entryId: firstEntry.entryId, expectedUpdatedAtIso: nowIso
})).reason, "entry-missing");

assert.equal((await runtime.updateCommentTranslatorCustomDictionaryEntry({
  ...common,
  input: {
    entryId: firstEntry.entryId, term: "Kuro", replacement: "stale", sourceLanguage: "en", targetLanguage: "ja",
    expectedUpdatedAtIso: "2026-07-23T05:59:59.000Z"
  }
})).reason, "stale-entry");
assert.equal((await runtime.deleteCommentTranslatorCustomDictionaryEntry({
  ...common, entryId: firstEntry.entryId, expectedUpdatedAtIso: "2026-07-23T05:59:59.000Z"
})).reason, "stale-entry");

const deleted = await runtime.deleteCommentTranslatorCustomDictionaryEntry({
  ...common, entryId: firstEntry.entryId, expectedUpdatedAtIso: nowIso
});
assert.deepEqual(deleted, {
  status: "applied", operation: "delete", currentTermCount: 0, dictionaryVersion: null,
  browserReadableEntryContent: "not-returned-by-design"
});

const limitStore = createDictionaryStore();
const limitFactory = { status: "ready", store: limitStore, missingEnvReferences: [] };
for (let index = 0; index < 30; index += 1) {
  const result = await runtime.createCommentTranslatorCustomDictionaryEntry({
    callerAuthorization: ownerAuthorization,
    dictionaryStore: limitFactory,
    nowIso: () => nowIso,
    input: { term: `term-${index}`, replacement: `replacement-${index}`, sourceLanguage: "en", targetLanguage: "ja" }
  });
  assert.equal(result.status, "applied");
}
assert.equal((await runtime.createCommentTranslatorCustomDictionaryEntry({
  callerAuthorization: ownerAuthorization,
  dictionaryStore: limitFactory,
  nowIso: () => nowIso,
  input: { term: "term-over-limit", replacement: "replacement", sourceLanguage: "en", targetLanguage: "ja" }
})).reason, "term-limit-reached");

assert.equal((await runtime.createCommentTranslatorCustomDictionaryEntry({
  ...common, callerAuthorization: unauthenticated,
  input: { term: "private", replacement: "private", sourceLanguage: "en", targetLanguage: "ja" }
})).reason, "auth-unavailable");
assert.equal((await runtime.readCommentTranslatorCustomDictionary({
  callerAuthorization: ownerAuthorization,
  dictionaryStore: { status: "unavailable", store: null, missingEnvReferences: ["SUPABASE_SERVICE_ROLE_KEY"], reason: "trusted-service-role-env-missing" }
})).reason, "dictionary-store-unavailable");
assert.equal((await runtime.readCommentTranslatorCustomDictionary({
  callerAuthorization: ownerAuthorization,
  dictionaryStore: { status: "ready", store: { ...store, async readCurrent() { throw new Error("private-row-detail"); } }, missingEnvReferences: [] }
})).reason, "dictionary-store-unavailable");

const publicResults = JSON.stringify([
  noteOnlyUpdate, replacementUpdate, deleted,
  await runtime.createCommentTranslatorCustomDictionaryEntry({
    ...common,
    input: { term: "Kuro", replacement: "黒", sourceLanguage: "en", targetLanguage: "ja" }
  })
]);
for (const privateValue of [ownerAuthorization.ownerUserId, "Kuro", "黒", "updated note", firstEntry.entryId]) {
  assert.doesNotMatch(publicResults, new RegExp(privateValue), "mutation outputs stay browser-safe and sanitized");
}

console.log("comment translator creator C9 custom dictionary runtime contract passed");
