import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  CANONICAL_TABLE_NAMES
} from "./lib/comment-translator-paid-core-v1-gate1-catalog.mjs";
import { comparePostApplyCatalog, inspectPostApplyCatalogArtifact } from "./lib/comment-translator-paid-core-v1-gate1-postapply-catalog.mjs";

const ROOT = process.cwd();
const ARCHIVE_SCHEMA = "comment_translator_paid_legacy_archive";
const EXPECTED_RESULT_KEYS = [
  "status",
  "reason",
  "target",
  "canonicalTableCount",
  "canonicalFunctionCount",
  "archiveTableCount",
  "archiveFunctionCount",
  "sourceEraTableCount",
  "sourceEraFunctionCount",
  "remoteCalls",
  "mutations"
];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
}

function clone(value) {
  return structuredClone(value);
}

function zeroDependencyCounts() {
  return {
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
  };
}

function cleanState(value) {
  return {
    tables: clone(value.tables ?? []),
    functions: clone(value.functions ?? []),
    triggers: clone(value.triggers ?? []),
    dependencyCounts: clone(value.dependencyCounts ?? zeroDependencyCounts())
  };
}

function makeCanonicalTable(name, rowCount) {
  return {
    schema: "public",
    name,
    owner: "postgres",
    rlsEnabled: true,
    rowCount,
    columns: [{
      schema: "public",
      table: name,
      ordinal: 1,
      name: "marker_id",
      type: "text",
      notNull: true,
      defaultDefinition: null
    }],
    constraints: [{
      schema: "public",
      table: name,
      name: name + "_marker_pkey",
      type: "p",
      definition: "PRIMARY KEY (marker_id)"
    }],
    indexes: [{
      schema: "public",
      table: name,
      name: name + "_marker_idx",
      definition: "CREATE INDEX " + name + "_marker_idx ON " + name + " (marker_id)"
    }],
    policies: [{
      schema: "public",
      table: name,
      name: name + "_marker_policy",
      command: "SELECT",
      permissive: true,
      roles: ["service_role"],
      usingDefinition: "true",
      checkDefinition: null
    }],
    acls: [{
      schema: "public",
      objectKind: "table",
      objectIdentity: "public." + name,
      grantee: "postgres",
      privilege: "SELECT",
      grantable: false
    }]
  };
}

function stripCanonicalRowCounts(state) {
  const result = cleanState(state);
  result.tables = result.tables.map(({ rowCount: _rowCount, ...table }) => table);
  return result;
}

function archiveTable(table) {
  return {
    ...table,
    schema: ARCHIVE_SCHEMA,
    acls: [],
    columns: table.columns.map((column) => ({ ...column, schema: ARCHIVE_SCHEMA })),
    constraints: table.constraints.map((constraint) => ({ ...constraint, schema: ARCHIVE_SCHEMA })),
    indexes: table.indexes.map((index) => ({ ...index, schema: ARCHIVE_SCHEMA })),
    policies: table.policies.map((policy) => ({ ...policy, schema: ARCHIVE_SCHEMA }))
  };
}

function archiveFunction(fn) {
  return {
    ...fn,
    schema: ARCHIVE_SCHEMA,
    acls: []
  };
}

function archiveTrigger(trigger) {
  return {
    ...trigger,
    enabled: false,
    tableSchema: ARCHIVE_SCHEMA,
    functionIdentity: trigger.functionIdentity.replace(/^public\./, ARCHIVE_SCHEMA + "."),
    definition: trigger.definition.replace(/public\./g, ARCHIVE_SCHEMA + ".")
  };
}

function makeArchiveState(legacy) {
  const state = cleanState(legacy);
  return {
    tables: state.tables.map(archiveTable),
    functions: state.functions.map(archiveFunction),
    triggers: state.triggers.map(archiveTrigger),
    dependencyCounts: state.dependencyCounts
  };
}

function makeEdge(scope, index = 0) {
  const schema = scope === "archive" ? ARCHIVE_SCHEMA : "public";
  const name = "scope_" + scope + "_seed_" + String(index).padStart(2, "0");
  const endpoint = {
    type: "table",
    schema,
    name,
    identity: schema + "." + name
  };
  return {
    classid: "pg_catalog.pg_class",
    refclassid: "pg_catalog.pg_namespace",
    deptype: "a",
    dependent: endpoint,
    referenced: {
      type: "schema",
      schema: null,
      name: null,
      identity: "pg_catalog." + schema
    }
  };
}

function makeHistory() {
  const rows = [];
  for (let index = 0; index < 56; index += 1) {
    rows.push({
      version: String(20260101000000 + index),
      name: "migration_" + String(index).padStart(2, "0")
    });
  }
  return { rows };
}

function makeFixture(target) {
  const legacy = readJson("scripts/fixtures/comment-translator-paid-core-v1-gate1-paid-legacy-catalog.json");
  const sourceEraFixture = readJson("scripts/fixtures/comment-translator-paid-core-v1-gate1-source-era-catalog.json");
  const manifest = readJson("scripts/fixtures/comment-translator-paid-core-v1-gate1-canonical-function-manifest.json");

  const canonical = {
    tables: CANONICAL_TABLE_NAMES.map((name, index) => makeCanonicalTable(name, index === 0 ? 4 : 0)),
    functions: clone(manifest.functions),
    triggers: [{
      tableSchema: "public",
      tableName: CANONICAL_TABLE_NAMES[0],
      name: "comment_translator_paid_marker_trigger",
      enabled: true,
      functionIdentity: "public.ct_paid_marker_trigger()",
      definition: "CREATE TRIGGER comment_translator_paid_marker_trigger"
    }],
    dependencyCounts: zeroDependencyCounts()
  };
  const archive = target === "production" ? makeArchiveState(legacy) : {
    tables: [],
    functions: [],
    triggers: [],
    dependencyCounts: zeroDependencyCounts()
  };
  const sourceEra = target === "production" ? cleanState(sourceEraFixture) : {
    tables: [],
    functions: [],
    triggers: [],
    dependencyCounts: zeroDependencyCounts()
  };
  const edges = {
    canonical: [0, 1].map((index) => makeEdge("canonical", index)),
    archive: target === "production" ? [0, 1].map((index) => makeEdge("archive", index)) : [],
    sourceEra: target === "production" ? [0, 1].map((index) => makeEdge("sourceEra", index)) : []
  };
  const history = makeHistory();
  const metadata = {
    schemaVersion: 2,
    target,
    sourceCommit: "0123456789abcdef0123456789abcdef01234567",
    migrationCorpusSha256: "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
    targetBindingSha256: "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    edgeScopeVersion: 1
  };
  const artifact = {
    ...metadata,
    readOnly: {
      serverVersionMajor: "17",
      transactionReadOnly: "on",
      defaultTransactionReadOnly: "on",
      transactionIsolation: "repeatable read"
    },
    history: clone(history),
    canonical: clone(canonical),
    archive: clone(archive),
    sourceEra: clone(sourceEra),
    pgDependEdges: clone(edges)
  };
  const expectations = {
    ...metadata,
    history: clone(history),
    canonical: stripCanonicalRowCounts(canonical),
    archive: clone(archive),
    sourceEra: clone(sourceEra),
    pgDependEdges: clone(edges)
  };
  return { artifact, expectations };
}

function assertMatch(input, label) {
  const result = comparePostApplyCatalog(input);
  assert.equal(result.status, "POSTAPPLY_CATALOG_MATCH", label);
  assert.deepEqual(Object.keys(result), EXPECTED_RESULT_KEYS, label + " result keys");
  assert.equal(result.reason, null, label + " reason");
  assert.equal(result.remoteCalls, 0, label + " remoteCalls");
  assert.equal(result.mutations, 0, label + " mutations");
  return result;
}

function assertMismatch(input, label, expectedReason) {
  const result = comparePostApplyCatalog(input);
  assert.equal(result.status, "POSTAPPLY_CATALOG_MISMATCH", label);
  assert.ok(["invalid-input", "metadata-mismatch", "read-only-mismatch", "history-mismatch", "canonical-mismatch", "archive-mismatch", "source-era-mismatch", "pg-depend-edge-mismatch"].includes(result.reason), label + " sanitized reason");
  if (expectedReason) assert.equal(result.reason, expectedReason, label + " reason");
  assert.equal(result.remoteCalls, 0, label + " remoteCalls");
  assert.equal(result.mutations, 0, label + " mutations");
}

function reorderObject(value, keys) {
  return Object.fromEntries([...keys].reverse().map((key) => [key, value[key]]));
}

function reorderEdgeProperties(input) {
  for (const location of [input.artifact]) {
    for (const scope of ["canonical", "archive", "sourceEra"]) {
      location.pgDependEdges[scope] = location.pgDependEdges[scope].map((edge) => {
        const reordered = { ...edge };
        reordered.dependent = reorderObject(edge.dependent, ["type", "schema", "name", "identity"]);
        reordered.referenced = reorderObject(edge.referenced, ["type", "schema", "name", "identity"]);
        return reorderObject(reordered, ["classid", "refclassid", "deptype", "dependent", "referenced"]);
      });
    }
  }
}

function mutate(base, location, mutation) {
  const input = clone(base);
  mutation(input[location]);
  return input;
}

function runSharedHashReferenceCases(base) {
  for (const key of ["sourceCommit", "migrationCorpusSha256", "targetBindingSha256"]) {
    const input = clone(base);
    const shared = [input.artifact[key]];
    input.artifact[key] = shared;
    input.expectations[key] = shared;
    assertMismatch(input, "shared array hash reference " + key, "metadata-mismatch");
  }
}

function runCatalogDriftCases(base) {
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.canonical.functions[0].definitionMd5 = "00000000000000000000000000000000";
  }), "canonical definitionMd5 drift", "canonical-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.canonical.tables[0].owner = "other";
  }), "canonical owner drift", "canonical-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.canonical.dependencyCounts.policies = 1;
  }), "canonical dependency count drift", "canonical-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.canonical.tables.push(clone(artifact.canonical.tables[0]));
  }), "canonical duplicate identity", "canonical-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.canonical.tables[0].name = "unknown_table";
  }), "canonical unknown identity", "canonical-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.canonical.tables.shift();
  }), "canonical missing table identity", "canonical-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.canonical.functions.pop();
  }), "canonical missing function identity", "canonical-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.canonical.functions[0].securityDefiner = "true";
  }), "canonical type drift", "canonical-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.canonical.tables[0].rlsEnabled = false;
  }), "canonical RLS drift", "canonical-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.canonical.tables[0].acls[0].privilege = "UPDATE";
  }), "canonical ACL drift", "canonical-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.canonical.tables[0].columns[0].type = "uuid";
  }), "canonical column drift", "canonical-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.canonical.tables[0].constraints[0].definition = "PRIMARY KEY (other_id)";
  }), "canonical constraint drift", "canonical-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.canonical.tables[0].indexes[0].definition = "CREATE INDEX changed";
  }), "canonical index drift", "canonical-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.canonical.tables[0].policies[0].command = "UPDATE";
  }), "canonical policy drift", "canonical-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.canonical.triggers[0].definition = "CREATE TRIGGER changed";
  }), "canonical trigger drift", "canonical-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.canonical.functions[0].config[0] = "search_path=changed";
  }), "canonical function config drift", "canonical-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.canonical.functions[0].resultType = "text";
  }), "canonical function return type drift", "canonical-mismatch");
  if (base.artifact.archive.tables.length > 0) {
    assertMismatch(mutate(base, "artifact", (artifact) => {
      artifact.archive.tables[0].rowCount = 1;
    }), "archive rowCount drift", "archive-mismatch");
    assertMismatch(mutate(base, "artifact", (artifact) => {
      artifact.archive.dependencyCounts.policies += 1;
    }), "archive dependency count drift", "archive-mismatch");
    assertMismatch(mutate(base, "expectations", (expectations) => {
      expectations.archive.dependencyCounts.policies = Number.MAX_SAFE_INTEGER + 1;
    }), "unsafe archive dependency count", "archive-mismatch");
    assertMismatch(mutate(base, "artifact", (artifact) => {
      artifact.archive.triggers[0].enabled = true;
    }), "archive trigger enabled drift", "archive-mismatch");
  }
  if (base.artifact.sourceEra.tables.length > 0) {
    assertMismatch(mutate(base, "artifact", (artifact) => {
      artifact.sourceEra.tables[0].rowCount = 1;
    }), "source era rowCount drift", "source-era-mismatch");
    assertMismatch(mutate(base, "artifact", (artifact) => {
      artifact.sourceEra.tables[0].rowCount = Number.MAX_SAFE_INTEGER + 1;
    }), "unsafe source era rowCount", "source-era-mismatch");
    assertMismatch(mutate(base, "artifact", (artifact) => {
      artifact.sourceEra.functions.pop();
    }), "source era function count drift", "source-era-mismatch");
  }
}

function runMetadataCases(base) {
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.schemaVersion = 1;
  }), "schema version drift", "metadata-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.sourceCommit = "fedcba9876543210fedcba9876543210fedcba98";
  }), "source commit drift", "metadata-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.migrationCorpusSha256 = "0".repeat(64);
  }), "migration corpus binding drift", "metadata-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.targetBindingSha256 = "f".repeat(64);
  }), "target binding drift", "metadata-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.edgeScopeVersion = 2;
  }), "edge scope version drift", "metadata-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.readOnly.serverVersionMajor = "16";
  }), "server major drift", "read-only-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.readOnly.transactionReadOnly = "off";
  }), "transaction read only drift", "read-only-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.readOnly.defaultTransactionReadOnly = "off";
  }), "default transaction read only drift", "read-only-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.readOnly.transactionIsolation = "read committed";
  }), "transaction isolation drift", "read-only-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.history.rows[0].name = "different_name";
  }), "history row drift", "history-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.history.rows[0].version = 123;
  }), "history type drift", "history-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.history.rows.reverse();
  }), "history order drift", "history-mismatch");
  assertMismatch(mutate(base, "expectations", (expectations) => {
    expectations.history.rows[1] = clone(expectations.history.rows[0]);
  }), "history duplicate drift", "history-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.history.rows.pop();
  }), "history cardinality drift", "history-mismatch");
}

function runEdgeCases(base) {
  // PostgreSQL may store the same complete dependency address more than once
  // (for example, an index key also referenced by its partial predicate).
  // Keep every occurrence; compare against the independently bound multiset.
  const repeated = clone(base);
  for (const location of [repeated.artifact, repeated.expectations]) {
    for (const rows of Object.values(location.pgDependEdges)) {
      if (rows.length > 0) rows.splice(0, 0, clone(rows[0]));
    }
  }
  assert.equal(inspectPostApplyCatalogArtifact(repeated.artifact).status, "POSTAPPLY_CATALOG_SHAPE_VALID", "native repeated dependency rows retain a valid shape");
  assertMatch(repeated, "identical dependency multiplicities");
  for (const scope of Object.keys(repeated.artifact.pgDependEdges)) {
    if (repeated.artifact.pgDependEdges[scope].length === 0) continue;
    for (const side of ["artifact", "expectations"]) {
      assertMismatch(mutate(repeated, side, (value) => {
        value.pgDependEdges[scope].shift();
      }), `${side} ${scope} missing repeated edge`, "pg-depend-edge-mismatch");
      assertMismatch(mutate(repeated, side, (value) => {
        value.pgDependEdges[scope].splice(0, 0, clone(value.pgDependEdges[scope][0]));
      }), `${side} ${scope} extra repeated edge`, "pg-depend-edge-mismatch");
      if (repeated[side].pgDependEdges[scope].length > 2) {
        assertMismatch(mutate(repeated, side, (value) => {
          const rows = value.pgDependEdges[scope];
          rows.shift();
          rows.push(clone(rows.at(-1)));
        }), `${side} ${scope} same count different multiplicities`, "pg-depend-edge-mismatch");
      }
    }
  }
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.pgDependEdges.canonical[0].dependent.identity = "public.replaced";
  }), "same count edge identity replacement", "pg-depend-edge-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.pgDependEdges.canonical[0].deptype = "i";
  }), "same count edge deptype replacement", "pg-depend-edge-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.pgDependEdges.canonical[0].dependent.type = "function";
  }), "same count edge kind replacement", "pg-depend-edge-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.pgDependEdges.canonical.reverse();
  }), "reversed multiple edge ordering", "pg-depend-edge-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    delete artifact.pgDependEdges.canonical[0].classid;
  }), "missing required edge field", "pg-depend-edge-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    delete artifact.pgDependEdges.canonical[0].dependent.identity;
  }), "missing required endpoint field", "pg-depend-edge-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.pgDependEdges.canonical[0].deptype = "1";
  }), "invalid deptype", "pg-depend-edge-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.pgDependEdges.canonical[0].dependent.type = 7;
  }), "invalid endpoint type", "pg-depend-edge-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.pgDependEdges.canonical = [];
  }), "required canonical edges empty", "pg-depend-edge-mismatch");
  if (base.artifact.target === "production") {
    assertMismatch(mutate(base, "artifact", (artifact) => {
      artifact.pgDependEdges.archive = [];
    }), "required production archive edges empty", "pg-depend-edge-mismatch");
    assertMismatch(mutate(base, "artifact", (artifact) => {
      artifact.pgDependEdges.sourceEra = [];
    }), "required production source era edges empty", "pg-depend-edge-mismatch");
  } else {
    assertMismatch(mutate(base, "artifact", (artifact) => {
      artifact.pgDependEdges.archive = [makeEdge("archive")];
    }), "preview excluded archive edges nonempty", "pg-depend-edge-mismatch");
    assertMismatch(mutate(base, "artifact", (artifact) => {
      artifact.pgDependEdges.sourceEra = [makeEdge("sourceEra")];
    }), "preview excluded source era edges nonempty", "pg-depend-edge-mismatch");
  }
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.pgDependEdges.canonical.push(clone(artifact.pgDependEdges.canonical[0]));
  }), "duplicate edge", "pg-depend-edge-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.pgDependEdges.canonical[0].classid = "1234";
  }), "numeric class id", "pg-depend-edge-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.pgDependEdges.canonical[0].dependent = { type: "table", schema: "public", name: "x", identity: "public.x", extra: true };
  }), "endpoint unknown field", "pg-depend-edge-mismatch");
}

function runEdgePropertyOrderCase(base) {
  const reordered = clone(base);
  reorderEdgeProperties(reordered);
  assertMatch(reordered, "edge and endpoint property order is insignificant");
}

function makeArchiveAcl(kind, grantee, table) {
  return {
    schema: ARCHIVE_SCHEMA,
    objectKind: kind,
    objectIdentity: ARCHIVE_SCHEMA + "." + table,
    grantee,
    privilege: kind === "function" ? "EXECUTE" : "SELECT",
    grantable: false
  };
}

function runArchiveAclCases(base) {
  for (const grantee of ["PUBLIC", "anon", "authenticated", "service_role"]) {
    const tableInput = clone(base);
    tableInput.artifact.archive.tables[0].acls.push(makeArchiveAcl("table", grantee, tableInput.artifact.archive.tables[0].name));
    tableInput.expectations.archive.tables[0].acls.push(makeArchiveAcl("table", grantee, tableInput.expectations.archive.tables[0].name));
    assertMismatch(tableInput, "identical forbidden archive table ACL " + grantee, "archive-mismatch");

    const functionInput = clone(base);
    functionInput.artifact.archive.functions[0].acls.push(makeArchiveAcl("function", grantee, functionInput.artifact.archive.functions[0].name));
    functionInput.expectations.archive.functions[0].acls.push(makeArchiveAcl("function", grantee, functionInput.expectations.archive.functions[0].name));
    assertMismatch(functionInput, "identical forbidden archive function ACL " + grantee, "archive-mismatch");
  }
}

function runShapeCases(base) {
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.unexpected = true;
  }), "unknown artifact key", "invalid-input");
  assertMismatch(mutate(base, "expectations", (expectations) => {
    delete expectations.archive;
  }), "missing expectation key", "invalid-input");
  assertMismatch(mutate(base, "expectations", (expectations) => {
    expectations.canonical.tables[0].rowCount = 0;
  }), "rowCount in structural expectation", "canonical-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.canonical.tables[0].rowCount = -1;
  }), "negative canonical rowCount", "canonical-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.canonical.tables[0].rowCount = Number.MAX_SAFE_INTEGER + 1;
  }), "unsafe canonical rowCount", "canonical-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.canonical.dependencyCounts.policies = Number.MAX_SAFE_INTEGER + 1;
  }), "unsafe canonical dependency count", "canonical-mismatch");

}

function runPreviewCases() {
  const base = makeFixture("preview");
  const result = assertMatch(base, "valid preview");
  assert.equal(Object.prototype.propertyIsEnumerable.call(result, "canonicalRowCounts"), false, "row counts are nonenumerable");
  assert.deepEqual(result.canonicalRowCounts[0], { schema: "public", name: CANONICAL_TABLE_NAMES[0], rowCount: 4 }, "nonzero canonical observation retained");
  assert.equal(JSON.stringify(result).includes("canonicalRowCounts"), false, "row counts omitted from output");
  runCatalogDriftCases(base);
  runMetadataCases(base);
  runSharedHashReferenceCases(base);
  runEdgeCases({ artifact: clone(base.artifact), expectations: clone(base.expectations) });
  runEdgePropertyOrderCase(base);
  runShapeCases(base);

  const before = clone(base);
  assertMatch(base, "preview repeat");
  assert.deepEqual(base, before, "input immutability");

  const originalReadFileSync = fs.readFileSync;
  try {
    fs.readFileSync = () => {
      throw new Error("unexpected filesystem access");
    };
    assertMatch(base, "preview no I/O");
  } finally {
    fs.readFileSync = originalReadFileSync;
  }
}

function runProductionCases() {
  const base = makeFixture("production");
  assertMatch(base, "valid production");
  runCatalogDriftCases(base);
  runShapeCases(base);
  runArchiveAclCases(base);
  runEdgeCases(base);
  runEdgePropertyOrderCase(base);
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.archive.tables[0].schema = "public";
  }), "archive schema drift", "archive-mismatch");
  assertMismatch(mutate(base, "artifact", (artifact) => {
    artifact.sourceEra.tables[0].owner = "owner_drift";
  }), "source era owner drift", "source-era-mismatch");
}

runPreviewCases();
runProductionCases();
console.log("postapply catalog contract passed (preview=match, production=match, rowCount_observation=retained, drift_cases=covered, edge_cases=covered, io=0)");
