import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  buildRepositoryRpcInventory,
  classifyDependencyGroup,
  computeObjectDigest,
  computeSanitizedDigest,
  dependencyDigestLines,
  legacyFunctionTokenInventory,
  maskSql,
  summarizeDependencyGroups,
  validateTargetReadonlySelectStatement
} from "./lib/comment-translator-paid-core-v1-gate1-catalog.mjs";

const root = process.cwd();
const fixtureRoot = path.join(root, "scripts/fixtures");
const paths = {
  canonicalRpc: path.join(fixtureRoot, "comment-translator-paid-core-v1-gate1-canonical-rpc.json"),
  previewRpc: path.join(fixtureRoot, "comment-translator-paid-core-v1-gate1-preview-rpc-readback.json"),
  dependency: path.join(fixtureRoot, "comment-translator-paid-core-v1-gate1-dependency-contract.json"),
  exactCounts: path.join(fixtureRoot, "comment-translator-paid-core-v1-gate1-exact-counts.json"),
  readonlySql: path.join(fixtureRoot, "comment-translator-paid-core-v1-gate1-catalog-readonly.sql"),
  productionReadonlySql: path.join(fixtureRoot, "comment-translator-paid-core-v1-gate1-catalog-readonly-production.sql"),
  previewReadonlySql: path.join(fixtureRoot, "comment-translator-paid-core-v1-gate1-catalog-readonly-preview.sql")
};

const RPC_EXPECTED_COUNT = 81;
const DEPENDENCY_CLASSIFICATIONS = [
  "catalog-owned",
  "auto-managed",
  "real function reference",
  "external user dependency"
];
const DEPENDENCY_EXPECTATIONS = Object.freeze({
  production: Object.freeze({
    allPublicScopedEdgeCount: 539,
    allPublicDeptypeCounts: Object.freeze({ a: 294, i: 60, n: 185 }),
    unexpectedPgDependEdges: 38,
    nonUnexpectedScopedEdgeCount: 441,
    dependencyDigest: "5751a4e6a27f9b16537a2bca178990341d2659958c6ce2e4259e91edb3041c94",
    externalUserDependencyCount: 0,
    classificationCounts: Object.freeze({
      "catalog-owned": 35,
      "auto-managed": 1,
      "real function reference": 2,
      "external user dependency": 0
    }),
    benignSchemaContractCount: 0,
    excludedDependencySummary: Object.freeze({
      internalDependencyCount: 60,
      benignSchemaContractCount: 0,
      overlapCount: 0,
      totalExcludedCount: 60
    }),
    typeEvidence: Object.freeze({
      scopedTypeEdges: 0,
      compositeRowType: 0,
      systemType: 0,
      publicUserType: 0,
      externalUserType: 0
    })
  }),
  preview: Object.freeze({
    allPublicScopedEdgeCount: 1371,
    allPublicDeptypeCounts: Object.freeze({ a: 672, i: 136, n: 563 }),
    unexpectedPgDependEdges: 204,
    nonUnexpectedScopedEdgeCount: 1031,
    dependencyDigest: "a85dfb04ea062b754d4384a3e3b8a06cd6e363da32c4dc58f56892b5a95315b1",
    externalUserDependencyCount: 0,
    classificationCounts: Object.freeze({
      "catalog-owned": 169,
      "auto-managed": 17,
      "real function reference": 18,
      "external user dependency": 0
    }),
    benignSchemaContractCount: 1,
    excludedDependencySummary: Object.freeze({
      internalDependencyCount: 136,
      benignSchemaContractCount: 1,
      overlapCount: 1,
      totalExcludedCount: 136
    }),
    typeEvidence: Object.freeze({
      scopedTypeEdges: 1,
      compositeRowType: 1,
      systemType: 0,
      publicUserType: 0,
      externalUserType: 0
    })
  })
});
const HIGH_CONFIDENCE_SENSITIVE = /(?:postgres(?:ql)?:\/\/|sb_(?:secret|publishable)_[A-Za-z0-9_-]{20,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}|authorization\s*:|bearer\s+)/i;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assertExactKeys(value, expected, label) {
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), `${label} has the exact fields`);
}

function assertSafeFixtureText(filePath, label) {
  const source = fs.readFileSync(filePath, "utf8");
  assert.doesNotMatch(source, HIGH_CONFIDENCE_SENSITIVE, `${label} has no high-confidence secret or connection material`);
  assert.doesNotMatch(source, /(?:pg_get_functiondef|pg_get_triggerdef|raw[_ -]?payload|decrypted[_ -]?secret)/i, `${label} has no raw definition or payload`);
  return source;
}

function validateRpcRow(row, label) {
  assertExactKeys(row, ["schema", "name", "identityArguments"], label);
  assert.equal(row.schema, "public", `${label} is public-only`);
  assert.match(row.name, /^ct_paid_[a-z0-9_]+$/, `${label} is a canonical public RPC name`);
  assert.equal(typeof row.identityArguments, "string", `${label} has a signature projection`);
  assert.doesNotMatch(row.identityArguments, /\bdefault\b|\b(?:begin|end|select|insert|update|delete)\b/i, `${label} has no function body or default expression`);
}

function validateRpcFixtures() {
  const canonical = readJson(paths.canonicalRpc);
  const preview = readJson(paths.previewRpc);
  assertSafeFixtureText(paths.canonicalRpc, "canonical RPC fixture");
  assertSafeFixtureText(paths.previewRpc, "Preview RPC readback fixture");

  assertExactKeys(canonical, ["aggregateSha256", "expectedCount", "functions", "schemaVersion"], "canonical RPC fixture");
  assertExactKeys(preview, [
    "aggregateSha256",
    "exactIdentityMatchCount",
    "expectedCount",
    "extraCount",
    "functions",
    "transactionIsolation",
    "missingCount",
    "observedCount",
    "schemaVersion",
    "target",
    "transactionReadOnly"
  ], "Preview RPC readback fixture");
  assert.equal(canonical.schemaVersion, 1);
  assert.equal(preview.schemaVersion, 1);
  assert.equal(canonical.expectedCount, RPC_EXPECTED_COUNT);
  assert.equal(preview.expectedCount, RPC_EXPECTED_COUNT);
  assert.equal(preview.target, "preview");
  assert.equal(preview.transactionReadOnly, "on");
  assert.equal(preview.transactionIsolation, "repeatable read");
  assert.equal(canonical.functions.length, RPC_EXPECTED_COUNT);
  assert.equal(preview.observedCount, RPC_EXPECTED_COUNT);
  assert.equal(preview.missingCount, 0);
  assert.equal(preview.extraCount, 0);
  assert.equal(preview.exactIdentityMatchCount, RPC_EXPECTED_COUNT);
  assert.equal(computeObjectDigest(canonical), canonical.aggregateSha256);
  assert.equal(computeObjectDigest(preview), preview.aggregateSha256);

  for (const [index, row] of canonical.functions.entries()) validateRpcRow(row, `canonical RPC row ${index}`);
  for (const [index, row] of preview.functions.entries()) validateRpcRow(row, `Preview RPC row ${index}`);
  assert.deepEqual(preview.functions, canonical.functions, "Preview identity/signature readback equals the expected inventory");

  const inventory = buildRepositoryRpcInventory();
  assert.equal(inventory.length, RPC_EXPECTED_COUNT);
  assert.deepEqual(inventory, canonical.functions, "repository direct declaration inventory equals the expected fixture");
  assert.equal(
    new Set(inventory.map(({ schema, name, identityArguments }) => `${schema}.${name}(${identityArguments})`)).size,
    RPC_EXPECTED_COUNT,
    "repository RPC identities are unique"
  );

  const migrationSql = fs.readdirSync(path.join(root, "supabase/migrations"))
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => fs.readFileSync(path.join(root, "supabase/migrations", file), "utf8"))
    .join("\n");
  const legacyTokens = legacyFunctionTokenInventory(migrationSql);
  assert.ok(legacyTokens.length > RPC_EXPECTED_COUNT, "the legacy token scan is broader than the direct declaration inventory");

  return {
    expected: RPC_EXPECTED_COUNT,
    repository: inventory.length,
    preview: preview.observedCount,
    exact: preview.exactIdentityMatchCount,
    missing: preview.missingCount,
    extra: preview.extraCount,
    digest: canonical.aggregateSha256
  };
}

function validateDependencyEnvironment(environment, label, expected) {
  assertExactKeys(environment, [
    "allPublicDeptypeCounts",
    "allPublicScopedEdgeCount",
    "benignSchemaContractCount",
    "dependencyDigest",
    "excludedDependencySummary",
    "externalUserDependencyCount",
    "groups",
    "nonUnexpectedScopedEdgeCount",
    "unexpectedPgDependEdges",
    "typeEvidence"
  ], `${label} dependency environment`);
  assert.equal(environment.allPublicScopedEdgeCount, expected.allPublicScopedEdgeCount);
  assert.deepEqual(environment.allPublicDeptypeCounts, expected.allPublicDeptypeCounts);
  assert.equal(environment.unexpectedPgDependEdges, expected.unexpectedPgDependEdges);
  assert.equal(environment.nonUnexpectedScopedEdgeCount, expected.nonUnexpectedScopedEdgeCount);
  assert.equal(environment.dependencyDigest, expected.dependencyDigest);
  assert.equal(environment.externalUserDependencyCount, expected.externalUserDependencyCount);
  assert.equal(environment.benignSchemaContractCount, expected.benignSchemaContractCount);
  assert.deepEqual(environment.typeEvidence, expected.typeEvidence);
  assert.deepEqual(environment.excludedDependencySummary, expected.excludedDependencySummary);
  assertExactKeys(environment.allPublicDeptypeCounts, ["a", "i", "n"], `${label} deptype counts`);
  assert.equal(
    Object.values(environment.allPublicDeptypeCounts).reduce((sum, count) => sum + count, 0),
    environment.allPublicScopedEdgeCount,
    `${label} deptype counts cover the scoped catalog edges`
  );
  assertExactKeys(environment.typeEvidence, [
    "compositeRowType",
    "externalUserType",
    "publicUserType",
    "scopedTypeEdges",
    "systemType"
  ], `${label} type evidence`);
  assert.equal(environment.typeEvidence.externalUserType, 0);
  assert.equal(
    Object.entries(environment.typeEvidence)
      .filter(([key]) => key !== "scopedTypeEdges")
      .reduce((sum, [, count]) => sum + count, 0),
    environment.typeEvidence.scopedTypeEdges,
    `${label} type evidence categories cover the scoped type edges`
  );
  assert.equal(
    environment.benignSchemaContractCount,
    environment.typeEvidence.compositeRowType,
    `${label} benign schema contract count is derived from composite row type evidence`
  );
  const internalDependencyCount = environment.allPublicDeptypeCounts.i;
  const benignSchemaContractCount = environment.typeEvidence.compositeRowType;
  const overlapCount = benignSchemaContractCount;
  const recalculatedExcludedDependencySummary = {
    internalDependencyCount,
    benignSchemaContractCount,
    overlapCount,
    totalExcludedCount: internalDependencyCount + benignSchemaContractCount - overlapCount
  };
  assertExactKeys(environment.excludedDependencySummary, [
    "benignSchemaContractCount",
    "internalDependencyCount",
    "overlapCount",
    "totalExcludedCount"
  ], `${label} excluded dependency summary`);
  assert.deepEqual(
    environment.excludedDependencySummary,
    recalculatedExcludedDependencySummary,
    `${label} excluded dependency summary is recomputed from sanitized catalog evidence`
  );
  assert.deepEqual(
    recalculatedExcludedDependencySummary,
    expected.excludedDependencySummary,
    `${label} recomputed exclusions equal the independent expected aggregate`
  );

  for (const [index, group] of environment.groups.entries()) {
    assertExactKeys(group, [
      "classid",
      "classification",
      "count",
      "dependentCategory",
      "deptype",
      "refclassid",
      "referencedCategory"
    ], `${label} dependency group ${index}`);
    assert.match(group.classid, /^[a-z_]+$/);
    assert.match(group.refclassid, /^[a-z_]+$/);
    assert.ok(["a", "i", "n"].includes(group.deptype));
    assert.equal(Number.isInteger(group.count) && group.count >= 0, true);
    assert.ok(DEPENDENCY_CLASSIFICATIONS.includes(group.classification));
    assert.equal(group.classification, classifyDependencyGroup(group));
  }
  const dependencySummary = summarizeDependencyGroups(environment.groups);
  assert.equal(
    dependencySummary.noGoEligibleEdgeCount,
    expected.unexpectedPgDependEdges,
    `${label} NO-GO eligible dependency groups sum exactly`
  );
  assert.deepEqual(
    dependencySummary.classificationCounts,
    expected.classificationCounts,
    `${label} eligible dependency classifications equal independent expectations`
  );
  const eligibleDigest = computeSanitizedDigest(dependencyDigestLines(dependencySummary.eligibleGroups));
  assert.equal(
    eligibleDigest,
    expected.dependencyDigest,
    `${label} eligible dependency digest equals the independent expectation`
  );
  assert.equal(
    eligibleDigest,
    environment.dependencyDigest,
    `${label} eligible dependency digest matches the fixture`
  );
  assert.equal(
    dependencySummary.externalEligibleCount,
    expected.externalUserDependencyCount,
    `${label} eligible external dependency count equals the independent expectation`
  );
  assert.equal(
    environment.externalUserDependencyCount,
    dependencySummary.externalEligibleCount,
    `${label} external user dependency count matches eligible classified groups`
  );
  assert.ok(
    dependencySummary.excludedDependencySummary.internalDependencyCount
      <= recalculatedExcludedDependencySummary.internalDependencyCount,
    `${label} grouped internal exclusions do not exceed aggregate deptype evidence`
  );
  assert.ok(
    dependencySummary.excludedDependencySummary.benignSchemaContractCount
      <= recalculatedExcludedDependencySummary.benignSchemaContractCount,
    `${label} grouped benign exclusions do not exceed aggregate type evidence`
  );
  assert.ok(
    dependencySummary.excludedDependencySummary.overlapCount
      <= recalculatedExcludedDependencySummary.overlapCount,
    `${label} grouped exclusion overlap does not exceed aggregate overlap evidence`
  );
  assert.ok(
    dependencySummary.excludedDependencySummary.totalExcludedCount
      <= recalculatedExcludedDependencySummary.totalExcludedCount,
    `${label} grouped excluded edges do not exceed aggregate excluded evidence`
  );
  assert.equal(
    dependencySummary.noGoEligibleEdgeCount
      + recalculatedExcludedDependencySummary.totalExcludedCount
      + environment.nonUnexpectedScopedEdgeCount,
    environment.allPublicScopedEdgeCount,
    `${label} eligible, excluded, and non-unexpected edges completely partition the scoped catalog`
  );
  const calculatedNonUnexpectedScopedEdgeCount = expected.allPublicScopedEdgeCount
    - dependencySummary.noGoEligibleEdgeCount
    - recalculatedExcludedDependencySummary.totalExcludedCount;
  assert.equal(
    calculatedNonUnexpectedScopedEdgeCount,
    expected.nonUnexpectedScopedEdgeCount,
    `${label} calculated non-unexpected count equals the independent expectation`
  );
  assert.equal(
    environment.nonUnexpectedScopedEdgeCount,
    calculatedNonUnexpectedScopedEdgeCount,
    `${label} fixture non-unexpected count equals the calculated partition remainder`
  );

  return {
    unexpected: environment.unexpectedPgDependEdges,
    classifications: dependencySummary.classificationCounts,
    externalUserDependency: environment.externalUserDependencyCount,
    internalDeptype: environment.allPublicDeptypeCounts.i,
    excluded: recalculatedExcludedDependencySummary,
    digest: environment.dependencyDigest
  };
}

function validateDependencyFixture() {
  const fixture = readJson(paths.dependency);
  assertSafeFixtureText(paths.dependency, "dependency fixture");
  assertExactKeys(fixture, ["aggregateSha256", "classifications", "environments", "schemaVersion"], "dependency fixture");
  assert.equal(fixture.schemaVersion, 1);
  assert.deepEqual(fixture.classifications, DEPENDENCY_CLASSIFICATIONS);
  assertExactKeys(fixture.environments, ["production", "preview"], "dependency environments");
  assert.equal(computeObjectDigest(fixture), fixture.aggregateSha256);

  const production = validateDependencyEnvironment(
    fixture.environments.production,
    "production",
    DEPENDENCY_EXPECTATIONS.production
  );
  const preview = validateDependencyEnvironment(
    fixture.environments.preview,
    "preview",
    DEPENDENCY_EXPECTATIONS.preview
  );
  assert.equal(production.classifications["external user dependency"], 0);
  assert.equal(preview.classifications["external user dependency"], 0);
  assert.equal(fixture.environments.production.benignSchemaContractCount, 0);
  assert.equal(fixture.environments.preview.benignSchemaContractCount, 1);

  return { production, preview, aggregateDigest: fixture.aggregateSha256 };
}

function validateExactCountFixture() {
  const fixture = readJson(paths.exactCounts);
  assertSafeFixtureText(paths.exactCounts, "exact-count fixture");
  assertExactKeys(fixture, ["aggregateSha256", "environments", "payloadsStored", "rawRowsStored", "schemaVersion", "transaction"], "exact-count fixture");
  assert.equal(fixture.schemaVersion, 1);
  assertExactKeys(fixture.transaction, ["isolation", "readOnly"], "exact-count transaction");
  assert.equal(fixture.transaction.readOnly, "on");
  assert.equal(fixture.transaction.isolation, "repeatable read");
  assert.equal(fixture.rawRowsStored, 0);
  assert.equal(fixture.payloadsStored, 0);
  assert.equal(computeObjectDigest(fixture), fixture.aggregateSha256);
  assertExactKeys(fixture.environments, ["production", "preview"], "exact-count environments");

  const results = {};
  for (const [target, environment] of Object.entries(fixture.environments)) {
    assertExactKeys(environment, ["bridgeRelations", "criticalRelation", "reltuplesNonZeroCandidateCount"], `${target} exact-count environment`);
    assert.equal(Number.isInteger(environment.reltuplesNonZeroCandidateCount), true);
    assertExactKeys(environment.criticalRelation, ["exactRowCount", "present", "selectPrivilege"], `${target} critical exact-count evidence`);
    assert.equal(environment.criticalRelation.present, true);
    assert.equal(environment.criticalRelation.selectPrivilege, true);
    assert.equal(Number.isInteger(environment.criticalRelation.exactRowCount), true);
    assertExactKeys(environment.bridgeRelations, ["exactCountStatus", "fixedSelectCount", "nonEmptyRelationCount", "totalRowCount"], `${target} bridge exact-count evidence`);
    assert.equal(environment.bridgeRelations.exactCountStatus, "pass");
    assert.ok(environment.bridgeRelations.fixedSelectCount > 0);
    assert.equal(Number.isInteger(environment.bridgeRelations.nonEmptyRelationCount), true);
    assert.equal(Number.isInteger(environment.bridgeRelations.totalRowCount), true);
    results[target] = {
      reltuplesNonZeroCandidates: environment.reltuplesNonZeroCandidateCount,
      criticalExactCount: environment.criticalRelation.exactRowCount,
      bridgeFixedSelectCount: environment.bridgeRelations.fixedSelectCount,
      bridgeNonEmpty: environment.bridgeRelations.nonEmptyRelationCount,
      bridgeTotal: environment.bridgeRelations.totalRowCount
    };
  }
  assert.deepEqual(results.production, {
    reltuplesNonZeroCandidates: 0,
    criticalExactCount: 0,
    bridgeFixedSelectCount: 3,
    bridgeNonEmpty: 0,
    bridgeTotal: 0
  });
  assert.deepEqual(results.preview, {
    reltuplesNonZeroCandidates: 2,
    criticalExactCount: 2,
    bridgeFixedSelectCount: 1,
    bridgeNonEmpty: 1,
    bridgeTotal: 2
  });
  return { ...results, digest: fixture.aggregateSha256 };
}

function validateReadonlySql() {
  const source = assertSafeFixtureText(paths.readonlySql, "read-only SQL fixture");
  const executable = maskSql(source);
  const statements = executable.split(";").map((statement) => statement.trim()).filter(Boolean);
  assert.ok(statements.length >= 6, "read-only SQL fixture has the bounded catalog SELECT statements");
  assert.match(statements[0], /^begin\s+isolation\s+level\s+repeatable\s+read\s+read\s+only$/i);
  assert.equal(statements.at(-1), "commit", "read-only SQL fixture closes its transaction");
  for (const statement of statements.slice(1, -1)) {
    assert.match(statement, /^(?:select|with)\b/i, "every catalog operation is SELECT-only");
  }
  assert.doesNotMatch(executable, /\b(?:create|alter|drop|insert|update|delete|truncate|grant|revoke|do|execute|call)\b/i, "read-only SQL fixture has no mutation or invocation statement");
  assert.doesNotMatch(executable, /pg_get_functiondef|pg_get_triggerdef|decrypted|raw[_ -]?payload/i, "read-only SQL fixture does not select definitions or payloads");
  assert.match(executable, /pg_get_function_identity_arguments/i, "RPC query uses identity arguments only");
  assert.match(source, /external-user-object/i, "dependency query has an explicit external-user category");
  assert.equal((executable.match(/from\s+public\./gi) ?? []).length, 0, "common catalog SQL has no target relation SELECT");

  const productionRelations = [
    "comment_translator_paid_entitlements",
    "comment_translator_paid_usage_counters",
    "comment_translator_paid_usage_events"
  ];
  const previewRelations = ["comment_translator_paid_entitlements"];
  const production = validateTargetReadonlySql(paths.productionReadonlySql, "production", productionRelations);
  const preview = validateTargetReadonlySql(paths.previewReadonlySql, "preview", previewRelations);
  assert.doesNotMatch(
    preview.executable,
    /comment_translator_paid_(?:usage_counters|usage_events)/i,
    "Preview SQL does not reference Production-only relations"
  );
  return {
    statements: statements.length,
    mutationStatements: 0,
    productionFixedSelects: production.fixedSelects,
    previewFixedSelects: preview.fixedSelects
  };
}

function validateTargetReadonlySql(filePath, target, expectedRelationNames) {
  const source = assertSafeFixtureText(filePath, `${target} read-only SQL fixture`);
  const executable = maskSql(source);
  const statements = source.split(";").map((statement) => statement.trim()).filter((statement) => maskSql(statement).trim());
  const executableStatements = statements.map((statement) => maskSql(statement).trim());
  const expectedFixedSelects = expectedRelationNames.length;
  assert.equal(statements.length, expectedFixedSelects + 2, `${target} SQL has only transaction and fixed SELECT statements`);
  assert.match(executableStatements[0], /^begin\s+isolation\s+level\s+repeatable\s+read\s+read\s+only$/i);
  assert.equal(executableStatements.at(-1), "commit", `${target} SQL closes its transaction`);
  for (const statement of executableStatements.slice(1, -1)) {
    assert.match(statement, /^select\b/i, `${target} exact-count operation is SELECT-only`);
  }
  assert.doesNotMatch(executable, /\b(?:create|alter|drop|insert|update|delete|truncate|grant|revoke|do|execute|call)\b/i);
  const relationNames = statements.slice(1, -1).map((statement, index) =>
    validateTargetReadonlySelectStatement(statement, expectedRelationNames[index], target)
  );
  assert.deepEqual(relationNames, expectedRelationNames, `${target} SQL has the exact approved relation list`);
  const fixedSelects = relationNames.length;
  assert.equal(fixedSelects, expectedFixedSelects, `${target} SQL has the required fixed SELECT count`);
  return { executable, fixedSelects };
}

function runStage(name, callback) {
  try {
    return callback();
  } catch {
    throw new Error(`stage:${name}`);
  }
}

function run() {
  const rpc = runStage("rpc", validateRpcFixtures);
  const dependency = runStage("dependency", validateDependencyFixture);
  const exactCounts = runStage("exact-counts", validateExactCountFixture);
  const readonlySql = runStage("readonly-sql", validateReadonlySql);
  return {
    status: "PASS",
    rpc,
    dependency,
    exactCounts,
    readonlySql,
    readOnlyTransaction: { readOnly: "on", isolation: "repeatable read" },
    rawBodyOutput: false
  };
}

try {
  console.log(JSON.stringify(run()));
} catch (error) {
  const reason = error instanceof Error && /^stage:[a-z-]+$/.test(error.message)
    ? error.message.slice("stage:".length)
    : "contract-mismatch";
  console.error(`comment-translator-paid-core-v1-gate1-catalog-contract: FAIL reason=${reason}`);
  process.exitCode = 1;
}
