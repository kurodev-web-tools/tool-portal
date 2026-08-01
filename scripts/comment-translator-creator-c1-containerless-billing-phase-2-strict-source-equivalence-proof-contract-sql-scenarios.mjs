import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  knownMigrationVersions,
  manifests,
  sqlAllowedCatalogSources,
  sqlCanonicalTruncatedIdentifiers,
  sqlFixedCatalogRenderings,
  sqlForbiddenOverlengthIdentifiers,
  sqlKeys,
  sqlMutationVerbs,
  sqlPredicateIdsByVersion,
  strictSourceEquivalenceSqlPath
} from "./comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-fixtures.mjs";
import {
  validateStrictSourceEquivalenceProofSql
} from "./comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-sql-validator.mjs";

function stripCommentsAndLiterals(sql) {
  return sql
    .replace(/--[^\r\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/'(?:''|[^'])*'/g, "''");
}

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `SQL includes ${startMarker}`);
  assert.notEqual(end, -1, `SQL includes ${endMarker} after ${startMarker}`);
  return source.slice(start, end);
}

function toSqlLiteral(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function assertStatementBoundary(sql) {
  const executable = stripCommentsAndLiterals(sql);
  assert.match(executable, /^\s*with\b/i);
  assert.equal((executable.match(/;/g) ?? []).length, 1);
  assert.match(executable, /;\s*$/);
  assert.doesNotMatch(
    executable,
    new RegExp(`\\b(?:${sqlMutationVerbs.join("|")})\\b`, "i")
  );
}

function assertKnownMigrationManifest(sql) {
  const section = sliceBetween(sql, "known_migrations", "candidate_manifest");
  const actual = [...section.matchAll(/\('(\d{14})',\s*\d+\)/g)].map(
    ([, version]) => version
  );
  assert.deepEqual(actual, knownMigrationVersions);
}

function assertCandidateManifest(sql) {
  const section = sliceBetween(sql, "candidate_manifest", "predicate_manifest");
  const actual = [...section.matchAll(
    /\('(\d{14})',\s*(\d+),\s*'(canonical|not-applicable)',\s*(\d+)\)/g
  )].map(([, version, ordinal, relationState, length]) => ({
    version,
    ordinal: Number(ordinal),
    relationState,
    length: Number(length)
  }));
  assert.deepEqual(
    actual,
    manifests.map(({ version, relationState, length }, index) => ({
      version,
      ordinal: index + 1,
      relationState,
      length
    }))
  );
}

function assertPredicateManifest(sql) {
  const section = sliceBetween(sql, "predicate_manifest", "expected_relations");
  const rows = [...section.matchAll(
    /\('(\d{14})',\s*(\d+),\s*'(m\d{2}_[a-z_]+_\d{2})'\)/g
  )].map(([, version, ordinal, id]) => ({
    version,
    ordinal: Number(ordinal),
    id
  }));
  for (const expected of sqlPredicateIdsByVersion) {
    const actual = rows.filter(({ version }) => version === expected.version);
    assert.deepEqual(
      actual.map(({ ordinal }) => ordinal),
      expected.ids.map((_, index) => index + 1)
    );
    assert.deepEqual(actual.map(({ id }) => id), expected.ids);
  }
  assert.equal(
    rows.length,
    sqlPredicateIdsByVersion.reduce((sum, { ids }) => sum + ids.length, 0)
  );
}

function assertCatalogSources(sql) {
  const executable = stripCommentsAndLiterals(sql);
  const sources = [...executable.matchAll(
    /\b(?:from|join)\s+([a-z_][a-z0-9_.]*)/gi
  )].map(([, source]) => source.toLowerCase());
  const catalogs = [...new Set(
    sources.filter((source) => source.startsWith("pg_") || source.includes("."))
  )].sort();
  assert.deepEqual(catalogs, [...sqlAllowedCatalogSources].sort());
  assert.doesNotMatch(executable, /\binformation_schema\b/i);
  assert.doesNotMatch(
    executable,
    /\b(?:from|join)\s+(?:public|auth|storage|realtime|graphql_public)\./i
  );
  assert.match(executable, /\bcross\s+join\s+lateral\s+aclexplode\s*\(/i);
  assert.match(executable, /\bacldefault\s*\(/i);
}

function assertFixedRenderings(sql) {
  for (const rendering of sqlFixedCatalogRenderings) {
    assert.ok(
      sql.includes(toSqlLiteral(rendering)),
      `SQL contains fixed rendering ${rendering}`
    );
  }
  assert.match(sql, /\bformat_type\s*\(/);
  assert.match(sql, /\bpg_get_expr\s*\(/);
  assert.match(sql, /\bpg_get_constraintdef\s*\(/);
  assert.match(sql, /\bpg_get_indexdef\s*\(/);
  assert.match(
    sql,
    /case\s+when\s+index_relation\.relkind::text\s*=\s*'i'[\s\S]*?then\s+pg_get_indexdef\s*\(index_relation\.oid,\s*0,\s*false\)[\s\S]*?else\s+null[\s\S]*?end\s+as\s+observed_definition/
  );
  assert.match(
    sql,
    /when\s+observation\.observed_index_kind\s*<>\s*'i'\s+then\s+'f'/
  );
  assert.doesNotMatch(
    sql,
    /\b(?:regexp_replace|replace|translate)\s*\(\s*pg_get_/i
  );
  for (const identifier of sqlCanonicalTruncatedIdentifiers) {
    assert.ok(sql.includes(identifier), `SQL includes catalog identifier ${identifier}`);
  }
  for (const identifier of sqlForbiddenOverlengthIdentifiers) {
    assert.equal(
      sql.includes(identifier),
      false,
      `SQL excludes overlength identifier ${identifier}`
    );
  }
}

function assertFinalProjection(sql) {
  const finalSelectStart = sql.lastIndexOf("\nselect\n");
  assert.notEqual(finalSelectStart, -1);
  const finalSelect = sql.slice(finalSelectStart);
  const aliases = [...finalSelect.matchAll(/\bas\s+([a-z][a-z0-9_]*)/g)].map(
    ([, alias]) => alias
  );
  assert.deepEqual(aliases, sqlKeys);
  assert.match(
    finalSelect,
    /version\s*\|\|\s*':'\s*\|\|\s*relation_state\s*\|\|\s*':'\s*\|\|\s*conflict_state\s*\|\|\s*':'\s*\|\|\s*predicate_vector/
  );
  assert.match(finalSelect, /'\|'\s+order\s+by\s+candidate_ordinal/);
  assert.match(finalSelect, /::text\s+as\s+strict_source_equivalence_matrix/);
  for (const alias of sqlKeys.slice(1)) {
    assert.match(finalSelect, new RegExp(`::integer\\s+as\\s+${alias}`));
  }
  assert.doesNotMatch(
    finalSelect,
    /\b(?:predicate_id|definition|oid|object_name|role_name|remote\.version)\b/
  );
  assert.match(finalSelect, /\bfrom\s+classified\b/);
  assert.match(finalSelect, /\bcross\s+join\s+unknown_count\b/);
}

function assertUnknownVersionBoundary(sql) {
  assert.match(
    sql,
    /count\s*\(\s*distinct\s+remote\.version\s*\)::integer\s+as\s+unknown_remote_migration_count/i
  );
  assert.match(
    sql,
    /from\s+supabase_migrations\.schema_migrations\s+remote/i
  );
  assert.doesNotMatch(sql, /string_agg\s*\([^)]*remote\.version/i);
}

export function assertStrictSourceEquivalenceProofSqlContract(sql) {
  validateStrictSourceEquivalenceProofSql(sql);
  assertStatementBoundary(sql);
  assertKnownMigrationManifest(sql);
  assertCandidateManifest(sql);
  assertPredicateManifest(sql);
  assertCatalogSources(sql);
  assertFixedRenderings(sql);
  assertFinalProjection(sql);
  assertUnknownVersionBoundary(sql);
}

export function runStrictSourceEquivalenceProofSqlContract() {
  const absolutePath = path.join(process.cwd(), strictSourceEquivalenceSqlPath);
  assert.ok(
    fs.existsSync(absolutePath),
    `strict source equivalence SQL exists: ${strictSourceEquivalenceSqlPath}`
  );
  assertStrictSourceEquivalenceProofSqlContract(
    fs.readFileSync(absolutePath, "utf8").replace(/\r\n/g, "\n")
  );
}
