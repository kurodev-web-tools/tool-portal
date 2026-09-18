import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

const acquisitionPath = path.join(process.cwd(), "scripts/comment-translator-paid-core-v1-gate1-catalog-acquire-readonly.ps1");
const source = fs.readFileSync(acquisitionPath, "utf8");

const post57Guard = /if \(\$ReadbackKind -eq "Catalog" -and \$BackupPhase -eq "post57"\) \{([\s\S]*?)\n\}/.exec(source);

test("post57 full catalog alone raises the capture bound to the existing 4MiB safety value", () => {
  assert.ok(post57Guard, "post57 Catalog guard exists");
  const guard = post57Guard[1];
  assert.match(guard, /\$maxOutputBytes = 4 \* 1024 \* 1024/, "post57 Catalog raises the bound to 4MiB");
  assert.match(source, /\$maxOutputBytes = 1024 \* 1024\n/, "the shared default bound stays 1MiB");
  assert.equal((source.match(/\$maxOutputBytes\s*=/g) ?? []).length, 2, "only the default and the post57 override assign the bound");
  for (const forbidden of ["5 \* 1024 \* 1024", "8 \* 1024 \* 1024", "16 \* 1024 \* 1024"]) {
    assert.equal(source.includes(forbidden), false, "no new bound constant is introduced: " + forbidden);
  }
  assert.match(source, /POSTAPPLY_MAX_OUTPUT_BYTES/, "the change points at the existing 4MiB post-apply bound");
});

test("waitlist, pre22 and post56 readbacks keep the 1MiB bound", () => {
  assert.ok(post57Guard, "post57 Catalog guard exists");
  const guardIndex = source.indexOf(post57Guard[0]);
  const defaultIndex = source.indexOf("$maxOutputBytes = 1024 * 1024");
  assert.ok(defaultIndex >= 0 && defaultIndex < guardIndex, "the 1MiB default is assigned before the post57 override");
  assert.match(source, /WAITLIST_TARGET_OR_PHASE_REJECTED/, "WaitlistChecks stays bound to the pre22 phase");
  assert.equal(/-not \$BackupPhase/.test(source), false, "the raise is not inverted across phases");
});

test("post57 catalog carries the function definition and its newline-normalised digest", () => {
  const guard = post57Guard[1];
  assert.match(guard, /'definition', pg_catalog\.pg_get_functiondef\(fc\.oid\)/, "definition body is captured");
  assert.match(guard, /'definitionLfNormalizedMd5', pg_catalog\.md5\(pg_catalog\.replace\(pg_catalog\.pg_get_functiondef\(fc\.oid\), E'\\r\\n', E'\\n'\)\)/, "normalisation is CRLF to LF only");
  assert.equal(/regexp_replace|regexp_replace|trim\(|translate\(|lower\(/.test(guard), false, "no stronger normalisation is applied");
  assert.equal((source.match(/'definitionMd5', pg_catalog\.md5\(pg_catalog\.pg_get_functiondef\(fc\.oid\)\)__FUNCTION_DEFINITION_FIELDS__/g) ?? []).length, 2, "both function projections keep the raw md5 and the placeholder");
  assert.match(source, /\$sql\.Replace\("__FUNCTION_DEFINITION_FIELDS__", \$post57FunctionDefinitionFields\)/, "the placeholder is filled with the post57 fragment only");
});

test("function row validation accepts the post57 keys only when they are emitted", () => {
  assert.match(source, /\$script:functionRowExpectedKeys = @\("schema", "name", "identityArguments", "resultType", "owner", "securityDefiner", "config", "acls", "definitionMd5"\)/, "the base key set is unchanged");
  assert.match(source, /\$script:functionRowExpectedKeys \+= @\("definition", "definitionLfNormalizedMd5"\)/, "the post57 keys are added inside the guard");
  assert.match(source, /Assert-ExactPropertyNames -Value \$Row -Expected \$script:functionRowExpectedKeys/, "validation uses the resolved key set");
  assert.match(source, /\$Row\.definitionLfNormalizedMd5 -notmatch "\^\[0-9a-f\]\{32\}\$"/, "the normalised digest must be an md5");
});

test("the unchanged read-only safety contract is still present", () => {
  for (const marker of ["ProtectedStdin", "TARGET_TLS_CONTEXT_REJECTED", "ON_ERROR_STOP=1", "rollback;", "UNSAFE_OUTPUT_SHAPE", "TARGET_BINDING_MISMATCH", "PSQL_OUTPUT_BOUND_FAILED"]) {
    assert.ok(source.includes(marker), "acquisition still contains " + marker);
  }
  assert.equal(/automatic retry|retryCount|Retry-After/i.test(source), false, "no retry behaviour is added");
});
