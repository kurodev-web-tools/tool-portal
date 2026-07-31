import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  assertSqlDefaultAclObservedDomain,
  assertSqlForeignKeySourceBinding,
  assertSqlNormalizationBindings
} from "./comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-sql-binding-scenarios.mjs";
import {
  assertStrictSourceEquivalenceProofSqlContract
} from "./comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-sql-scenarios.mjs";
import {
  strictSourceEquivalenceSqlPath
} from "./comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-fixtures.mjs";
import {
  validateStrictSourceEquivalenceProofSql
} from "./comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-sql-validator.mjs";

function replaceOnce(sql, current, replacement, mutantName) {
  assert.ok(sql.includes(current), `${mutantName} mutation target exists`);
  return sql.replace(current, replacement);
}

function replaceSection(sql, startMarker, endMarker, transform, mutantName) {
  const start = sql.indexOf(startMarker);
  const end = sql.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `${mutantName} start exists`);
  assert.notEqual(end, -1, `${mutantName} end exists`);
  return sql.slice(0, start) + transform(sql.slice(start, end)) + sql.slice(end);
}

export function createStrictSqlMutants(sql) {
  return [
    {
      name: "unqualified_application_source",
      expectedReason: /unapproved SQL source/,
      sql: replaceOnce(
        sql,
        "from expected_relations expected\n  left join pg_namespace",
        "from comment_translator_real_comments_feed_snapshots expected\n  left join pg_namespace",
        "unqualified application source"
      )
    },
    {
      name: "unapproved_nextval_function",
      expectedReason: /unapproved SQL function/,
      sql: replaceOnce(
        sql,
        "identity_state.*,\n    count(observed_default_acl.oid)",
        "identity_state.*,\n    nextval('synthetic_sequence') as synthetic_nextval,\n    count(observed_default_acl.oid)",
        "nextval"
      )
    },
    {
      name: "raw_unknown_version_aggregation",
      expectedReason: /unknown migration remote\.version boundary: raw aggregation/,
      sql: replaceOnce(
        sql,
        "count(distinct remote.version)::integer\n      as unknown_remote_migration_count",
        "count(distinct remote.version)::integer\n      as unknown_remote_migration_count,\n    array_agg(remote.version) as raw_unknown_versions",
        "raw unknown version aggregation"
      )
    },
    {
      name: "critical_comparison_tautology",
      expectedReason: /critical CTE fingerprint mismatch: key_results/,
      sql: replaceOnce(
        sql,
        "and observation.observed_definition = observation.expected_definition\n        and observation.observed_source_schema_name",
        "and true\n        and observation.observed_source_schema_name",
        "critical comparison tautology"
      )
    },
    {
      name: "unmatched_extra_parenthesis",
      expectedReason: /unbalanced SQL parentheses/,
      sql: replaceOnce(sql, "unknown_count.unknown_remote_migration_count;", "unknown_count.unknown_remote_migration_count);", "unmatched parenthesis")
    }
  ];
}

export function createSupplementalStrictSqlMutants(sql) {
  const quotedSource = replaceSection(
    sql,
    "relation_matches as (",
    "relation_observations as (",
    (section) => replaceOnce(
      section.replaceAll("expected.", "expected_relations."),
      "from expected_relations expected\n",
      "from \"comment_translator_real_comments_feed_snapshots\" expected_relations\n",
      "quoted application source"
    ),
    "quoted application source"
  );
  let quotedRemote = replaceOnce(
    sql,
    "unknown_count as (",
    "remote as (\n  select \"remote\".\"version\"\n  from supabase_migrations.schema_migrations remote\n),\nunknown_count as (",
    "quoted remote version"
  );
  quotedRemote = replaceOnce(
    quotedRemote,
    "version || ':' || relation_state || ':' || conflict_state || ':' || predicate_vector,",
    "version || ':' || relation_state || ':' || conflict_state || ':' || predicate_vector || ':' || \"remote\".\"version\",",
    "quoted remote version"
  );
  quotedRemote = replaceOnce(
    quotedRemote,
    "cross join unknown_count\ngroup by",
    "cross join unknown_count\ncross join remote\ngroup by",
    "quoted remote version"
  );
  let remoteAlias = replaceOnce(
    sql,
    "unknown_count as (",
    "raw_versions as (\n  select string_agg(x.version::text, ',' order by x.version) as value\n  from supabase_migrations.schema_migrations x\n),\nunknown_count as (",
    "remote alias raw output"
  );
  remoteAlias = replaceOnce(
    remoteAlias,
    "version || ':' || relation_state || ':' || conflict_state || ':' || predicate_vector,",
    "version || ':' || relation_state || ':' || conflict_state || ':' || predicate_vector || ':' || raw_versions.value,",
    "remote alias raw output"
  );
  remoteAlias = replaceOnce(
    remoteAlias,
    "cross join unknown_count\ngroup by",
    "cross join unknown_count\ncross join raw_versions\ngroup by",
    "remote alias raw output"
  );
  const withUnreferencedTableSource = (source) => replaceOnce(sql, "unknown_count as (", `unreferenced_table_source as (\n  table ${source}\n),\nunknown_count as (`, "TABLE application source");
  return [
    {
      name: "quoted_nextval_function",
      expectedReason: /unapproved SQL function: nextval/,
      sql: replaceOnce(
        sql,
        "min(relation.oid::bigint)::oid as relation_oid\n  from expected_relations expected",
        "min(relation.oid::bigint)::oid as relation_oid,\n    1 + \"nextval\"('synthetic_sequence') > 0 as quoted_nextval_effect\n  from expected_relations expected",
        "quoted nextval"
      )
    },
    {
      name: "quoted_application_source",
      expectedReason: /unapproved SQL source: comment_translator_real_comments_feed_snapshots/,
      sql: quotedSource
    },
    {
      name: "quoted_remote_version_output",
      expectedReason: /unknown migration remote\.version boundary/,
      sql: quotedRemote
    },
    {
      name: "output_alias_literal_spoof",
      expectedReason: /SQL has exact seven outputs in order/,
      sql: replaceOnce(
        replaceOnce(
          sql,
          "  )::text as strict_source_equivalence_matrix,",
          "  )::text,",
          "output alias literal spoof"
        ),
        "where status = 'canonical-effect-equivalent'",
        "where status = 'canonical-effect-equivalent ::text as strict_source_equivalence_matrix'",
        "output alias literal spoof"
      )
    },
    {
      name: "remote_alias_x_raw_output",
      expectedReason: /unknown migration remote\.version boundary: source count 2\/1/,
      sql: remoteAlias
    },
    {
      name: "select_into_mutation",
      expectedReason: /SQL is read-only/,
      sql: replaceOnce(
        sql,
        "from classified\ncross join unknown_count",
        "into temporary strict_proof_leak\nfrom classified\ncross join unknown_count",
        "select into mutation"
      )
    },
    {
      name: "comma_separated_application_source",
      expectedReason: /comma-separated SQL sources are forbidden/,
      sql: replaceOnce(
        replaceOnce(
          sql,
          "version || ':' || relation_state || ':' || conflict_state || ':' || predicate_vector,",
          "version || ':' || relation_state || ':' || conflict_state || ':' || predicate_vector || ':' || leaked.owner_user_id::text,",
          "comma-separated application source"
        ),
        "from classified\ncross join unknown_count",
        "from classified, comment_translator_real_comments_feed_snapshots leaked\ncross join unknown_count",
        "comma-separated application source"
      )
    },
    { name: "table_unqualified_application_source", expectedReason: /unapproved SQL source: comment_translator_real_comments_feed_snapshots/, sql: withUnreferencedTableSource("comment_translator_real_comments_feed_snapshots") },
    { name: "table_quoted_qualified_application_source", expectedReason: /unapproved SQL source: public\.comment_translator_real_comments_feed_snapshots/, sql: withUnreferencedTableSource("\"public\".\"comment_translator_real_comments_feed_snapshots\"") }
  ];
}

export function assertCurrentStrictSqlContract(sql) {
  assertStrictSourceEquivalenceProofSqlContract(sql);
  assertSqlForeignKeySourceBinding(sql);
  assertSqlDefaultAclObservedDomain(sql);
  assertSqlNormalizationBindings(sql);
}

export function runStrictSourceEquivalenceProofSqlValidatorContract() {
  const sql = fs.readFileSync(
    path.join(process.cwd(), strictSourceEquivalenceSqlPath),
    "utf8"
  );
  for (const mutant of createStrictSqlMutants(sql)) {
    assert.throws(
      () => assertCurrentStrictSqlContract(mutant.sql),
      mutant.expectedReason,
      `${mutant.name} is rejected`
    );
  }
  for (const mutant of createSupplementalStrictSqlMutants(sql)) {
    assert.throws(
      () => assertCurrentStrictSqlContract(mutant.sql),
      mutant.expectedReason,
      `${mutant.name} is rejected`
    );
  }
  assert.doesNotThrow(() => validateStrictSourceEquivalenceProofSql(
    sql.replace("\nwith known_migrations", "\n/* outer /* nextval('ignored'); FROM ignored_table */ still-comment */\nwith known_migrations")
  ));
  assert.throws(
    () => validateStrictSourceEquivalenceProofSql(`${sql}\n/* unterminated`),
    /unterminated SQL lexical state: block/
  );
  assert.throws(
    () => validateStrictSourceEquivalenceProofSql(sql.replace(/;\s*$/, "'unterminated;")),
    /unterminated SQL lexical state: single/
  );
  assert.throws(() => validateStrictSourceEquivalenceProofSql(
    sql.replace(/;\s*$/, "\"unterminated")
  ), /unterminated SQL lexical state: double/);
  assert.throws(() => validateStrictSourceEquivalenceProofSql(
    `${sql}\nselect 1;`
  ), /SQL has one statement/);
  assert.throws(() => validateStrictSourceEquivalenceProofSql(
    sql.replace("'canonical'", "$$canonical$$")
  ), /SQL excludes unsupported dollar quoting/);
  assert.throws(() => validateStrictSourceEquivalenceProofSql(sql.replace("'canonical'", "E'canonical'")), /unsupported SQL escape string/);
  const finalSelect = sql.lastIndexOf("\nselect\n"); assert.notEqual(finalSelect, -1);
  assert.throws(() => assertCurrentStrictSqlContract(sql.slice(0, finalSelect)
    + sql.slice(finalSelect).replace("\nselect\n", "\nselect\n  42,\n")), /SQL has exact seven top-level outputs/);
  assert.throws(() => assertCurrentStrictSqlContract(sql.replace("when matrix.conflict_state = 'conflict'", "when matrix.conflict_state = 'clear'")), /critical CTE fingerprint mismatch: classified/);
  assert.throws(() => assertCurrentStrictSqlContract(sql.replace("= observation.expected_relation_kind", "<> observation.expected_relation_kind")), /critical CTE fingerprint mismatch: relation_states/);
  assert.throws(() => assertCurrentStrictSqlContract(sql.replace("filter (where status = 'absent')", "filter (where status = 'partial')")), /final projection fingerprint mismatch/);
}
