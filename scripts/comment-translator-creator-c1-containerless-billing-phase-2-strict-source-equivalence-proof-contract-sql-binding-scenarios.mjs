import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  sqlDefaultAclObjectTypeCases,
  sqlDefaultAclStateCases,
  sqlForeignKeySourceBindings,
  sqlNormalizationBindings
} from "./comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-sql-binding-fixtures.mjs";
import {
  strictSourceEquivalenceSqlPath
} from "./comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-fixtures.mjs";

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `SQL includes ${startMarker}`);
  assert.notEqual(end, -1, `SQL includes ${endMarker} after ${startMarker}`);
  return source.slice(start, end);
}

function parseSqlString(token) {
  assert.match(token, /^'(?:''|[^'])*'$/);
  return token.slice(1, -1).replaceAll("''", "'");
}

function splitSqlValues(row) {
  const values = [];
  let start = 0;
  let quoted = false;
  for (let index = 0; index < row.length; index += 1) {
    if (row[index] === "'") {
      if (quoted && row[index + 1] === "'") {
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (row[index] === "," && !quoted) {
      values.push(row.slice(start, index).trim());
      start = index + 1;
    }
  }
  values.push(row.slice(start).trim());
  return values.map((token) => {
    if (/^null$/i.test(token)) return null;
    if (/^\d+$/.test(token)) return Number(token);
    return parseSqlString(token);
  });
}

function parseValuesRows(section) {
  const valuesStart = section.search(/\bvalues\b/i);
  assert.notEqual(valuesStart, -1, "SQL values CTE includes VALUES");
  const source = section.slice(valuesStart + "values".length);
  const rows = [];
  let depth = 0;
  let quoted = false;
  let start = -1;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === "'") {
      if (quoted && source[index + 1] === "'") {
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && character === "(") {
      if (depth === 0) start = index + 1;
      depth += 1;
    } else if (!quoted && character === ")" && depth > 0) {
      depth -= 1;
      if (depth === 0) rows.push(splitSqlValues(source.slice(start, index)));
    }
  }
  assert.equal(depth, 0, "SQL values tuples are balanced");
  return rows;
}

export function assertSqlForeignKeySourceBinding(sql) {
  const expected = sliceBetween(sql, "expected_keys(", "key_observations as (");
  assert.match(
    expected,
    /\bsource_schema_name\b[\s\S]*\breferenced_column_name\b/,
    "FK expectations bind canonical source and referenced names"
  );
  assert.doesNotMatch(expected, /\bexpected_(?:local|remote)_keys\b/);
  assert.doesNotMatch(expected, /'\{\d+\}'/);
  const rows = parseValuesRows(expected);
  assert.equal(rows.length, 4);
  for (const row of rows) assert.equal(row.length, 14);
  const actual = rows
    .filter((row) => row[4] === "f")
    .map((row) => ({
      version: row[0],
      predicateOrdinal: row[1],
      predicateId: row[2],
      constraintName: row[3],
      sourceSchema: row[5],
      sourceRelation: row[6],
      sourceColumn: row[7],
      referencedSchema: row[8],
      referencedRelation: row[9],
      referencedColumn: row[10],
      updateAction: row[11],
      deleteAction: row[12],
      matchType: row[13]
    }));
  assert.deepEqual(actual, sqlForeignKeySourceBindings);

  const observations = sliceBetween(sql, "key_observations as (", "key_results as (");
  assert.doesNotMatch(observations, /\b(?:conkey|confkey)::text\b/);
  assert.match(observations, /array_length\(constraint_record\.conkey,\s*1\)/);
  assert.match(observations, /array_length\(constraint_record\.confkey,\s*1\)/);
  assert.match(observations, /source_key_attribute\.attrelid\s*=\s*constraint_record\.conrelid/);
  assert.match(observations, /source_key_attribute\.attnum\s*=\s*constraint_record\.conkey\[1\]/);
  assert.match(observations, /referenced_key_attribute\.attrelid\s*=\s*constraint_record\.confrelid/);
  assert.match(observations, /referenced_key_attribute\.attnum\s*=\s*constraint_record\.confkey\[1\]/);
  const results = sliceBetween(sql, "key_results as (", "key_predicates as (");
  for (const [observed, canonical] of [
    ["observed_source_schema_name", "source_schema_name"],
    ["observed_source_relation_name", "source_relation_name"],
    ["observed_source_column_name", "source_column_name"],
    ["observed_referenced_schema_name", "referenced_schema_name"],
    ["observed_referenced_relation_name", "referenced_relation_name"],
    ["observed_referenced_column_name", "referenced_column_name"],
    ["observed_update_action", "expected_update_action"],
    ["observed_delete_action", "expected_delete_action"],
    ["observed_match_type", "expected_match_type"]
  ]) {
    assert.match(
      results,
      new RegExp(`observation\\.${observed}\\s*=\\s*observation\\.${canonical}`)
    );
  }
  assert.match(results, /constraint_count\s*>\s*1[\s\S]*then\s+'u'/);
  assert.match(results, /observed_local_key_count\s*<>\s*1\s+then\s+'f'/);
  assert.match(results, /observed_source_column_name\s+is\s+null[\s\S]*then\s+'u'/);
  assert.match(results, /observed_referenced_column_name\s+is\s+null[\s\S]*then\s+'u'/);
}

export function assertSqlDefaultAclObservedDomain(sql) {
  const domain = sliceBetween(
    sql,
    "default_acl_domain_observations as (",
    "default_acl_classes"
  );
  assert.match(domain, /\bleft join\s+pg_default_acl\s+observed_default_acl\b/);
  assert.match(domain, /observed_default_acl\.defaclrole\s*=\s*identity_state\.owner_oid/);
  assert.match(domain, /observed_default_acl\.defaclnamespace\s*=\s*identity_state\.namespace_oid/);
  assert.doesNotMatch(domain, /object_class|defaclobjtype::text\s*=/);
  assert.doesNotMatch(domain, /\b(?:acldefault|aclexplode)\s*\(/);
  const knownTypesMatch = domain.match(/defaclobjtype\s+is\s+null[\s\S]*defaclobjtype::text\s+not\s+in\s*\(([^)]+)\)/);
  assert.ok(knownTypesMatch, "default ACL domain has an explicit known-type boundary");
  const knownTypes = [...knownTypesMatch[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
  const expectedKnownTypes = sqlDefaultAclObjectTypeCases.filter(({ incrementsUnknownCount }) => !incrementsUnknownCount).map(({ objectType }) => objectType);
  assert.deepEqual(knownTypes, expectedKnownTypes);
  for (const fixture of sqlDefaultAclObjectTypeCases) {
    const observedUnknown = fixture.objectType === null || !knownTypes.includes(fixture.objectType);
    assert.equal(observedUnknown, fixture.incrementsUnknownCount, `${fixture.objectType ?? "NULL"} unknown-count behavior`);
  }
  const classes = sliceBetween(sql, "default_acl_classes", "default_acl_row_counts");
  const evaluatedTypes = [...classes.matchAll(/\('([^']+)'\)/g)].map((match) => match[1]);
  const canonicalTypes = sqlDefaultAclObjectTypeCases.filter(({ domain }) => domain === "canonical-evaluated").map(({ objectType }) => objectType);
  assert.deepEqual(evaluatedTypes, canonicalTypes);
  const readability = sliceBetween(
    sql,
    "default_acl_readability as (",
    "default_acl_entries as ("
  );
  assert.match(readability, /owner_count\s*<>\s*1/);
  assert.match(readability, /namespace_count\s*<>\s*1/);
  assert.match(readability, /unknown_object_type_count\s*>\s*0[\s\S]*then\s+'unverifiable'/);
  const states = sliceBetween(sql, "default_acl_states as (", "default_acl_readability as (");
  assert.match(states, /from\s+default_acl_row_counts\s+row_count/);
  const entries = sliceBetween(sql, "default_acl_entries as (", "default_acl_predicates as (");
  assert.match(entries, /from\s+default_acl_readability\s+state[\s\S]*aclexplode\(state\.effective_acl\)/);
  for (const fixture of sqlDefaultAclStateCases) {
    if (fixture.rowCount === 0) {
      assert.match(states, /default_acl_row_count\s*=\s*0[\s\S]*then\s+acldefault\s*\(/);
    } else if (fixture.rowCount === 1) {
      assert.match(states, /default_acl_row_count\s*=\s*1\s+then\s+selected\.defaclacl/);
    } else {
      assert.match(readability, /default_acl_row_count\s*>\s*1[\s\S]*then\s+'unverifiable'/);
    }
  }
}

function assertNormalizationConsumer(sql, start, end, aliases) {
  const section = sliceBetween(sql, start, end);
  for (const [alias, slot, normalizer] of aliases) {
    assert.match(section, new RegExp(`join\\s+expected_normalizations\\s+${alias}`));
    assert.match(section, new RegExp(`${alias}\\.version\\s*=\\s*expected\\.version`));
    assert.match(section, new RegExp(`${alias}\\.predicate_id\\s*=\\s*expected\\.predicate_id`));
    assert.match(section, new RegExp(`${alias}\\.normalization_slot\\s*=\\s*'${slot}'`));
    assert.match(section, new RegExp(`${alias}\\.normalizer\\s*=\\s*'${normalizer}'`));
    assert.match(section, new RegExp(`${alias}\\.expected_rendering`));
    assert.match(section, new RegExp(`\\b${normalizer}\\s*\\(`));
  }
}

export function assertSqlNormalizationBindings(sql) {
  const section = sliceBetween(sql, "expected_normalizations(", "expected_relations");
  const actual = parseValuesRows(section).map((row) => ({
    version: row[0],
    predicateId: row[1],
    slot: row[2],
    normalizer: row[3],
    rendering: row[4]
  }));
  assert.deepEqual(actual, sqlNormalizationBindings);
  assertNormalizationConsumer(sql, "column_observations as (", "column_results as (", [
    ["default_normalization", "column_default", "pg_get_expr"]
  ]);
  assertNormalizationConsumer(sql, "key_observations as (", "key_results as (", [
    ["definition_normalization", "constraint_definition", "pg_get_constraintdef"]
  ]);
  assertNormalizationConsumer(sql, "check_observations as (", "check_results as (", [
    ["definition_normalization", "constraint_definition", "pg_get_constraintdef"]
  ]);
  assertNormalizationConsumer(sql, "policy_observations as (", "policy_results as (", [
    ["using_normalization", "policy_using", "pg_get_expr"],
    ["check_normalization", "policy_check", "pg_get_expr"]
  ]);
  assertNormalizationConsumer(sql, "index_observations as (", "index_results as (", [
    ["definition_normalization", "index_definition", "pg_get_indexdef"]
  ]);

  const scopedBindings = [
    ["column_observations as (", "column_results as (", /attribute\.attname\s*=\s*expected\.column_name/],
    ["key_observations as (", "key_results as (", /constraint_candidate\.conname\s*=\s*expected\.constraint_name/],
    ["check_observations as (", "check_results as (", /constraint_record\.conname\s*=\s*expected\.constraint_name/],
    ["policy_observations as (", "policy_results as (", /policy_record\.polname\s*=\s*expected\.policy_name/],
    ["index_observations as (", "index_results as (", /index_relation\.relname\s*=\s*expected\.index_name/]
  ];
  for (const [start, end, binding] of scopedBindings) {
    assert.match(sliceBetween(sql, start, end), binding);
  }
  for (const [start, end, identity] of [
    ["column_predicates as (", "expected_keys(", "observed_column_ordinal"],
    ["key_predicates as (", "expected_checks", "constraint_oid"],
    ["check_predicates as (", "expected_rls", "constraint_oid"],
    ["policy_predicates as (", "expected_indexes", "policy_oid"],
    ["index_predicates as (", "expected_comments", "index_oid"]
  ]) {
    const predicates = sliceBetween(sql, start, end);
    assert.match(
      predicates,
      new RegExp(`${identity}\\s+is\\s+not\\s+null[\\s\\S]*predicate_result\\s*=\\s*'f'`)
    );
  }
}

export function runStrictSourceEquivalenceProofSqlBindingContract() {
  const sql = fs.readFileSync(
    path.join(process.cwd(), strictSourceEquivalenceSqlPath),
    "utf8"
  );
  assertSqlForeignKeySourceBinding(sql);
  assertSqlDefaultAclObservedDomain(sql);
  assertSqlNormalizationBindings(sql);
}
