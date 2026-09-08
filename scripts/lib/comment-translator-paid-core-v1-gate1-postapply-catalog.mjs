import {
  CANONICAL_TABLE_NAMES,
  assertCanonicalPaidRpcSecurityBoundary,
  assertCanonicalStructuralState,
  canonicalStructuralEqual,
  projectCanonicalStructuralState,
  sortKeysDeep
} from "./comment-translator-paid-core-v1-gate1-catalog.mjs";

const ARTIFACT_KEYS = Object.freeze([
  "schemaVersion",
  "target",
  "sourceCommit",
  "migrationCorpusSha256",
  "targetBindingSha256",
  "readOnly",
  "history",
  "canonical",
  "archive",
  "sourceEra",
  "edgeScopeVersion",
  "pgDependEdges"
]);
const EXPECTATION_KEYS = Object.freeze(ARTIFACT_KEYS.filter((key) => key !== "readOnly"));
const READ_ONLY_KEYS = Object.freeze([
  "serverVersionMajor",
  "transactionReadOnly",
  "defaultTransactionReadOnly",
  "transactionIsolation"
]);
const HISTORY_KEYS = Object.freeze(["rows"]);
const CATALOG_STATE_KEYS = Object.freeze(["tables", "functions", "triggers", "dependencyCounts"]);
const DEPENDENCY_COUNT_KEYS = Object.freeze(["inboundForeignKeys", "views", "materializedViews", "rules", "policies", "userTriggers", "eventTriggers", "publications", "outsideFunctionSourceReferences", "unexpectedPgDependEdges"]);
const EDGE_SCOPES = Object.freeze(["canonical", "archive", "sourceEra"]);
const EDGE_KEYS = Object.freeze(["classid", "refclassid", "deptype", "dependent", "referenced"]);
const ENDPOINT_KEYS = Object.freeze(["type", "schema", "name", "identity"]);
const ZERO_DEPENDENCY_COUNTS = Object.freeze({
  inboundForeignKeys: 0,
  views: 0,
  materializedViews: 0,
  rules: 0,
  policies: 0,
  userTriggers: 0,
  eventTriggers: 0,
  publications: 0,
  outsideFunctionSourceReferences: 0,
  unexpectedPgDependEdges: 0
});
const ARCHIVE_SCHEMA = "comment_translator_paid_legacy_archive";
const FORBIDDEN_ARCHIVE_GRANTEES = new Set(["public", "anon", "authenticated", "service_role"]);
const HASH40 = /^[a-f0-9]{40}$/;
const HASH64 = /^[a-f0-9]{64}$/;
const SAFE_HISTORY_VERSION = /^\d{14}$/;
const SAFE_HISTORY_NAME = /^[a-z0-9_]+$/;
const SAFE_CLASS_NAME = /^pg_catalog\.pg_[a-z0-9_]+$/;
const SAFE_DEPTYPE = /^[A-Za-z]$/;
const FIXED_REASONS = new Set([
  "invalid-input",
  "metadata-mismatch",
  "read-only-mismatch",
  "history-mismatch",
  "canonical-mismatch",
  "archive-mismatch",
  "source-era-mismatch",
  "pg-depend-edge-mismatch"
]);

class ComparisonFailure extends Error {
  constructor(reason) {
    super();
    this.reason = FIXED_REASONS.has(reason) ? reason : "invalid-input";
  }
}

function fail(reason) {
  throw new ComparisonFailure(reason);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value, expectedKeys) {
  if (!isRecord(value)) return false;
  const expected = new Set(expectedKeys);
  const actual = Object.keys(value);
  return actual.length === expectedKeys.length
    && expectedKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key))
    && actual.every((key) => expected.has(key));
}

function sameValue(left, right) {
  return JSON.stringify(sortKeysDeep(left)) === JSON.stringify(sortKeysDeep(right));
}

function compareLexical(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function assertSortedUnique(rows, keyOf, reason) {
  if (!Array.isArray(rows)) fail(reason);
  let previous = null;
  const seen = new Set();
  for (const row of rows) {
    const key = keyOf(row);
    if (typeof key !== "string" || seen.has(key) || (previous !== null && compareLexical(previous, key) >= 0)) {
      fail(reason);
    }
    seen.add(key);
    previous = key;
  }
}

function assertCatalogListsSorted(state, reason) {
  assertSortedUnique(state.tables, (row) => row.schema + "." + row.name, reason);
  assertSortedUnique(state.functions, (row) => row.schema + "." + row.name + "(" + row.identityArguments + ")", reason);
  assertSortedUnique(state.triggers, (row) => row.tableSchema + "." + row.tableName + "." + row.name, reason);
}

function assertSafeCatalogCounts(state, reason, includeRowCounts) {
  if (!isRecord(state) || !isRecord(state.dependencyCounts) || !exactKeys(state.dependencyCounts, DEPENDENCY_COUNT_KEYS)) fail(reason);
  for (const value of Object.values(state.dependencyCounts)) {
    if (!Number.isSafeInteger(value) || value < 0) fail(reason);
  }
  if (includeRowCounts) {
    if (!Array.isArray(state.tables)) fail(reason);
    for (const row of state.tables) {
      if (!isRecord(row) || !Number.isSafeInteger(row.rowCount) || row.rowCount < 0) fail(reason);
    }
  }
}

function assertFullCatalogState(state, reason) {
  if (!exactKeys(state, CATALOG_STATE_KEYS)) fail(reason);
  assertSafeCatalogCounts(state, reason, true);
  let structural;
  try {
    structural = projectCanonicalStructuralState(state);
  } catch {
    fail(reason);
  }
  assertCatalogListsSorted(state, reason);
  return structural;
}

function assertStructuralCatalogState(state, reason) {
  if (!exactKeys(state, CATALOG_STATE_KEYS)) fail(reason);
  assertSafeCatalogCounts(state, reason, false);
  try {
    assertCanonicalStructuralState(state);
  } catch {
    fail(reason);
  }
  assertCatalogListsSorted(state, reason);
  return state;
}

function assertReadOnly(value) {
  if (!exactKeys(value, READ_ONLY_KEYS)
    || value.serverVersionMajor !== "17"
    || value.transactionReadOnly !== "on"
    || value.defaultTransactionReadOnly !== "on"
    || value.transactionIsolation !== "repeatable read") {
    fail("read-only-mismatch");
  }
}

function assertHistory(value) {
  if (!exactKeys(value, HISTORY_KEYS) || !Array.isArray(value.rows) || value.rows.length !== 56) {
    fail("history-mismatch");
  }
  let previous = null;
  const seen = new Set();
  for (const row of value.rows) {
    if (!exactKeys(row, ["version", "name"])
      || typeof row.version !== "string"
      || typeof row.name !== "string"
      || !SAFE_HISTORY_VERSION.test(row.version)
      || !SAFE_HISTORY_NAME.test(row.name)
      || seen.has(row.version + "\u0000" + row.name)
      || (previous !== null && compareLexical(previous, row.version) > 0)) {
      fail("history-mismatch");
    }
    seen.add(row.version + "\u0000" + row.name);
    previous = row.version;
  }
}

function assertCanonicalPolicy(state, reason, full) {
  const structural = full ? assertFullCatalogState(state, reason) : assertStructuralCatalogState(state, reason);
  if (state.tables.length !== CANONICAL_TABLE_NAMES.length || state.tables.length !== 33) fail(reason);
  const expectedNames = new Set(CANONICAL_TABLE_NAMES);
  const actualNames = new Set();
  for (const row of state.tables) {
    if (row.schema !== "public" || row.owner !== "postgres" || row.rlsEnabled !== true || actualNames.has(row.name)) fail(reason);
    actualNames.add(row.name);
  }
  if (actualNames.size !== expectedNames.size || CANONICAL_TABLE_NAMES.some((name) => !actualNames.has(name))) fail(reason);
  if (state.functions.length !== 81) fail(reason);
  for (const row of state.functions) {
    if (row.schema !== "public" || row.owner !== "postgres" || !/^ct_paid_[a-z0-9_]+$/.test(row.name)) fail(reason);
  }
  try {
    assertCanonicalPaidRpcSecurityBoundary(structural);
  } catch {
    fail(reason);
  }
}

function assertEmptyCompanionState(state, reason) {
  assertFullCatalogState(state, reason);
  if (state.tables.length !== 0 || state.functions.length !== 0 || state.triggers.length !== 0
    || !sameValue(state.dependencyCounts, ZERO_DEPENDENCY_COUNTS)) {
    fail(reason);
  }
}

function assertArchivePolicy(state, reason, target) {
  assertFullCatalogState(state, reason);
  if (target === "preview") {
    assertEmptyCompanionState(state, reason);
    return;
  }
  if (state.tables.length !== 3 || state.functions.length !== 3 || state.triggers.length !== 1) fail(reason);
  for (const row of state.tables) {
    if (row.schema !== ARCHIVE_SCHEMA || row.owner !== "postgres" || row.rlsEnabled !== true || row.rowCount !== 0) fail(reason);
    if (row.acls.some((acl) => typeof acl.grantee === "string" && FORBIDDEN_ARCHIVE_GRANTEES.has(acl.grantee.toLowerCase()))) fail(reason);
  }
  for (const row of state.functions) {
    if (row.schema !== ARCHIVE_SCHEMA || row.owner !== "postgres") fail(reason);
    if (row.acls.some((acl) => typeof acl.grantee === "string" && FORBIDDEN_ARCHIVE_GRANTEES.has(acl.grantee.toLowerCase()))) fail(reason);
  }
  const trigger = state.triggers[0];
  if (trigger.enabled !== false || trigger.tableSchema !== ARCHIVE_SCHEMA) fail(reason);
}

function assertSourceEraPolicy(state, reason, target) {
  assertFullCatalogState(state, reason);
  if (target === "preview") {
    assertEmptyCompanionState(state, reason);
    return;
  }
  if (state.tables.length !== 6 || state.functions.length !== 7) fail(reason);
  for (const row of state.tables) {
    if (row.schema !== "public" || row.owner !== "postgres" || row.rlsEnabled !== true || row.rowCount !== 0) fail(reason);
  }
  for (const row of state.functions) {
    if (row.schema !== "public" || row.owner !== "postgres") fail(reason);
  }
}

function assertEndpoint(endpoint, reason) {
  if (!exactKeys(endpoint, ENDPOINT_KEYS)
    || typeof endpoint.type !== "string" || endpoint.type.length === 0
    || typeof endpoint.identity !== "string" || endpoint.identity.length === 0
    || (endpoint.schema !== null && (typeof endpoint.schema !== "string" || endpoint.schema.length === 0))
    || (endpoint.name !== null && (typeof endpoint.name !== "string" || endpoint.name.length === 0))) {
    fail(reason);
  }
}

function edgeKey(edge) {
  return JSON.stringify({
    classid: edge.classid,
    refclassid: edge.refclassid,
    deptype: edge.deptype,
    dependent: {
      type: edge.dependent.type,
      schema: edge.dependent.schema,
      name: edge.dependent.name,
      identity: edge.dependent.identity
    },
    referenced: {
      type: edge.referenced.type,
      schema: edge.referenced.schema,
      name: edge.referenced.name,
      identity: edge.referenced.identity
    }
  });
}

function assertEdgeArray(rows, reason) {
  if (!Array.isArray(rows)) fail(reason);
  let previous = null;
  const seen = new Set();
  for (const edge of rows) {
    if (!exactKeys(edge, EDGE_KEYS)
      || typeof edge.classid !== "string" || !SAFE_CLASS_NAME.test(edge.classid)
      || typeof edge.refclassid !== "string" || !SAFE_CLASS_NAME.test(edge.refclassid)
      || typeof edge.deptype !== "string" || !SAFE_DEPTYPE.test(edge.deptype)) {
      fail(reason);
    }
    assertEndpoint(edge.dependent, reason);
    assertEndpoint(edge.referenced, reason);
    const key = edgeKey(edge);
    if (seen.has(key) || (previous !== null && compareLexical(previous, key) >= 0)) fail(reason);
    seen.add(key);
    previous = key;
  }
}

function assertEdges(value, target) {
  const reason = "pg-depend-edge-mismatch";
  if (!exactKeys(value, EDGE_SCOPES)) fail(reason);
  for (const scope of EDGE_SCOPES) assertEdgeArray(value[scope], reason);
  if (value.canonical.length === 0
    || (target === "production" && (value.archive.length === 0 || value.sourceEra.length === 0))
    || (target === "preview" && (value.archive.length !== 0 || value.sourceEra.length !== 0))) {
    fail(reason);
  }
}

function summary(artifact) {
  const value = isRecord(artifact) ? artifact : {};
  const target = value.target === "preview" || value.target === "production" ? value.target : "unknown";
  const count = (scope, field) => isRecord(value[scope]) && Array.isArray(value[scope][field]) ? value[scope][field].length : 0;
  return {
    target,
    canonicalTableCount: count("canonical", "tables"),
    canonicalFunctionCount: count("canonical", "functions"),
    archiveTableCount: count("archive", "tables"),
    archiveFunctionCount: count("archive", "functions"),
    sourceEraTableCount: count("sourceEra", "tables"),
    sourceEraFunctionCount: count("sourceEra", "functions")
  };
}

function makeResult(status, reason, artifact, rowCounts) {
  const result = {
    status,
    reason,
    ...summary(artifact),
    remoteCalls: 0,
    mutations: 0
  };
  Object.defineProperty(result, "canonicalRowCounts", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: Array.isArray(rowCounts) ? rowCounts.map((row) => ({ ...row })) : []
  });
  return result;
}

function assertMetadata(artifact, expectations) {
  const hashValues = [
    artifact.sourceCommit,
    expectations.sourceCommit,
    artifact.migrationCorpusSha256,
    expectations.migrationCorpusSha256,
    artifact.targetBindingSha256,
    expectations.targetBindingSha256
  ];
  if (hashValues.some((value) => typeof value !== "string")) fail("metadata-mismatch");
  if (artifact.schemaVersion !== 2 || expectations.schemaVersion !== 2
    || artifact.target !== expectations.target
    || (artifact.target !== "preview" && artifact.target !== "production")
    || artifact.edgeScopeVersion !== 1 || expectations.edgeScopeVersion !== 1
    || artifact.sourceCommit !== expectations.sourceCommit
    || artifact.migrationCorpusSha256 !== expectations.migrationCorpusSha256
    || artifact.targetBindingSha256 !== expectations.targetBindingSha256
    || !HASH40.test(artifact.sourceCommit)
    || !HASH40.test(expectations.sourceCommit)
    || !HASH64.test(artifact.migrationCorpusSha256)
    || !HASH64.test(expectations.migrationCorpusSha256)
    || !HASH64.test(artifact.targetBindingSha256)
    || !HASH64.test(expectations.targetBindingSha256)) {
    fail("metadata-mismatch");
  }
}

function assertArtifactMetadataShape(artifact) {
  const hashValues = [artifact.sourceCommit, artifact.migrationCorpusSha256, artifact.targetBindingSha256];
  if (hashValues.some((value) => typeof value !== "string")) fail("metadata-mismatch");
  if (artifact.schemaVersion !== 2
    || (artifact.target !== "preview" && artifact.target !== "production")
    || artifact.edgeScopeVersion !== 1
    || !HASH40.test(artifact.sourceCommit)
    || !HASH64.test(artifact.migrationCorpusSha256)
    || !HASH64.test(artifact.targetBindingSha256)) {
    fail("metadata-mismatch");
  }
}

/**
 * Validate one acquired artifact without comparing it to caller-supplied
 * expectations. This is deliberately an observation-shape check: it does
 * not establish provenance, readiness, or a stage decision.
 */
export function inspectPostApplyCatalogArtifact(artifact) {
  const rowCounts = isRecord(artifact) && isRecord(artifact.canonical) && Array.isArray(artifact.canonical.tables)
    ? artifact.canonical.tables
      .filter((row) => isRecord(row) && typeof row.schema === "string" && typeof row.name === "string" && Number.isSafeInteger(row.rowCount) && row.rowCount >= 0)
      .map(({ schema, name, rowCount }) => ({ schema, name, rowCount }))
    : [];
  try {
    if (!isRecord(artifact) || !exactKeys(artifact, ARTIFACT_KEYS)) fail("invalid-input");
    assertArtifactMetadataShape(artifact);
    assertReadOnly(artifact.readOnly);
    assertHistory(artifact.history);
    assertCanonicalPolicy(artifact.canonical, "canonical-mismatch", true);
    assertArchivePolicy(artifact.archive, "archive-mismatch", artifact.target);
    assertSourceEraPolicy(artifact.sourceEra, "source-era-mismatch", artifact.target);
    assertEdges(artifact.pgDependEdges, artifact.target);
    return makeResult("POSTAPPLY_CATALOG_SHAPE_VALID", null, artifact, rowCounts);
  } catch (error) {
    const reason = error instanceof ComparisonFailure ? error.reason : "invalid-input";
    return makeResult("POSTAPPLY_CATALOG_SHAPE_INVALID", reason, artifact, rowCounts);
  }
}

export function comparePostApplyCatalog(input) {
  const artifact = isRecord(input) ? input.artifact : null;
  const expectations = isRecord(input) ? input.expectations : null;
  const rowCounts = isRecord(artifact) && isRecord(artifact.canonical) && Array.isArray(artifact.canonical.tables)
    ? artifact.canonical.tables
      .filter((row) => isRecord(row) && typeof row.schema === "string" && typeof row.name === "string" && Number.isSafeInteger(row.rowCount) && row.rowCount >= 0)
      .map(({ schema, name, rowCount }) => ({ schema, name, rowCount }))
    : [];
  try {
    if (!isRecord(artifact) || !isRecord(expectations)
      || !exactKeys(artifact, ARTIFACT_KEYS) || !exactKeys(expectations, EXPECTATION_KEYS)) {
      fail("invalid-input");
    }
    assertMetadata(artifact, expectations);
    assertReadOnly(artifact.readOnly);
    assertHistory(artifact.history);
    assertHistory(expectations.history);
    if (!sameValue(artifact.history, expectations.history)) fail("history-mismatch");

    assertCanonicalPolicy(artifact.canonical, "canonical-mismatch", true);
    assertCanonicalPolicy(expectations.canonical, "canonical-mismatch", false);
    if (!canonicalStructuralEqual(projectCanonicalStructuralState(artifact.canonical), expectations.canonical)) {
      fail("canonical-mismatch");
    }

    assertArchivePolicy(artifact.archive, "archive-mismatch", artifact.target);
    assertArchivePolicy(expectations.archive, "archive-mismatch", artifact.target);
    if (!sameValue(artifact.archive, expectations.archive)) fail("archive-mismatch");

    assertSourceEraPolicy(artifact.sourceEra, "source-era-mismatch", artifact.target);
    assertSourceEraPolicy(expectations.sourceEra, "source-era-mismatch", artifact.target);
    if (!sameValue(artifact.sourceEra, expectations.sourceEra)) fail("source-era-mismatch");

    assertEdges(artifact.pgDependEdges, artifact.target);
    assertEdges(expectations.pgDependEdges, artifact.target);
    if (!sameValue(artifact.pgDependEdges, expectations.pgDependEdges)) fail("pg-depend-edge-mismatch");

    return makeResult("POSTAPPLY_CATALOG_MATCH", null, artifact, rowCounts);
  } catch (error) {
    const reason = error instanceof ComparisonFailure ? error.reason : "invalid-input";
    return makeResult("POSTAPPLY_CATALOG_MISMATCH", reason, artifact, rowCounts);
  }
}
