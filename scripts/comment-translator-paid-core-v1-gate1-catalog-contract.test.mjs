import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  buildRepositoryRpcInventory,
  classifyDependencyGroup,
  computeSanitizedDigest,
  legacyFunctionTokenInventory,
  parsePublicRpcDeclarations
} from "./lib/comment-translator-paid-core-v1-gate1-catalog.mjs";
import * as catalogContract from "./lib/comment-translator-paid-core-v1-gate1-catalog.mjs";

const sampleSql = `
-- A body reference must never become an inventory entry.
create or replace function public.ct_paid_alpha(p_owner_id uuid, p_amount numeric default 1)
returns void
language plpgsql
as $body$
begin
  perform public.ct_paid_body_reference(p_owner_id);
end;
$body$;

select public.ct_paid_from_a_string('create function public.ct_paid_string_fake()');
create function private.ct_paid_private()
returns void
language sql
as $$ select 1 $$;

create function public.ct_paid_beta()
returns void
language sql
as $$ select 1 $$;
`;

assert.deepEqual(parsePublicRpcDeclarations(sampleSql), [
  {
    schema: "public",
    name: "ct_paid_alpha",
    identityArguments: "p_owner_id uuid, p_amount numeric"
  },
  {
    schema: "public",
    name: "ct_paid_beta",
    identityArguments: ""
  }
]);

const legacyInventory = legacyFunctionTokenInventory(sampleSql);
assert.ok(legacyInventory.includes("ct_paid_body_reference"), "legacy token scan sees a body reference");
assert.ok(legacyInventory.includes("ct_paid_private"), "legacy token scan sees a non-canonical schema function");
assert.notDeepEqual(legacyInventory, ["ct_paid_alpha", "ct_paid_beta"], "legacy token scan is not a canonical inventory");

assert.equal(
  classifyDependencyGroup({
    classid: "pg_proc",
    refclassid: "pg_language",
    deptype: "n",
    dependentCategory: "function",
    referencedCategory: "catalog-object"
  }),
  "catalog-owned"
);
assert.equal(
  classifyDependencyGroup({
    classid: "pg_trigger",
    refclassid: "pg_proc",
    deptype: "n",
    dependentCategory: "trigger",
    referencedCategory: "function"
  }),
  "real function reference"
);
assert.equal(
  classifyDependencyGroup({
    classid: "pg_attrdef",
    refclassid: "pg_class",
    deptype: "a",
    dependentCategory: "column-default",
    referencedCategory: "table"
  }),
  "auto-managed"
);
assert.equal(
  classifyDependencyGroup({
    classid: "pg_class",
    refclassid: "pg_class",
    deptype: "i",
    dependentCategory: "nonpublic-relation",
    referencedCategory: "table"
  }),
  "catalog-owned"
);
assert.equal(
  classifyDependencyGroup({
    classid: "pg_proc",
    refclassid: "pg_type",
    deptype: "n",
    dependentCategory: "function",
    referencedCategory: "type"
  }),
  "catalog-owned"
);
assert.equal(
  classifyDependencyGroup({
    classid: "pg_class",
    refclassid: "pg_class",
    deptype: "n",
    dependentCategory: "external-user-object",
    referencedCategory: "table"
  }),
  "external user dependency"
);

assert.equal(
  typeof catalogContract.evaluateDependencyGroupEligibility,
  "function",
  "dependency eligibility helper is exported"
);
assert.deepEqual(
  catalogContract.evaluateDependencyGroupEligibility({
    classid: "pg_class",
    refclassid: "pg_class",
    deptype: "i",
    dependentCategory: "nonpublic-relation",
    referencedCategory: "table"
  }),
  {
    classification: "catalog-owned",
    noGoEligible: false,
    exclusion: "internal-dependency"
  }
);
assert.deepEqual(
  catalogContract.evaluateDependencyGroupEligibility({
    classid: "pg_type",
    refclassid: "pg_class",
    deptype: "i",
    dependentCategory: "type",
    referencedCategory: "table"
  }),
  {
    classification: "catalog-owned",
    noGoEligible: false,
    exclusion: "benign-schema-contract"
  }
);
assert.deepEqual(
  catalogContract.evaluateDependencyGroupEligibility({
    classid: "pg_trigger",
    refclassid: "pg_proc",
    deptype: "n",
    dependentCategory: "trigger",
    referencedCategory: "function"
  }),
  {
    classification: "real function reference",
    noGoEligible: true,
    exclusion: null
  }
);

assert.equal(
  typeof catalogContract.summarizeDependencyGroups,
  "function",
  "dependency summary helper is exported"
);
const mixedDependencySummary = catalogContract.summarizeDependencyGroups([
  {
    classid: "pg_class",
    refclassid: "pg_class",
    deptype: "i",
    dependentCategory: "nonpublic-relation",
    referencedCategory: "table",
    count: 60
  },
  {
    classid: "pg_type",
    refclassid: "pg_class",
    deptype: "i",
    dependentCategory: "type",
    referencedCategory: "table",
    count: 1
  },
  {
    classid: "pg_trigger",
    refclassid: "pg_proc",
    deptype: "n",
    dependentCategory: "trigger",
    referencedCategory: "function",
    count: 2
  }
]);
assert.equal(60 + 1 + 2, 63, "legacy all-group sum includes excluded evidence");
assert.deepEqual(mixedDependencySummary, {
  noGoEligibleEdgeCount: 2,
  classificationCounts: {
    "catalog-owned": 0,
    "auto-managed": 0,
    "real function reference": 2,
    "external user dependency": 0
  },
  externalEligibleCount: 0,
  excludedDependencySummary: {
    internalDependencyCount: 61,
    benignSchemaContractCount: 1,
    overlapCount: 1,
    totalExcludedCount: 61
  },
  eligibleGroups: [
    {
      classid: "pg_trigger",
      refclassid: "pg_proc",
      deptype: "n",
      dependentCategory: "trigger",
      referencedCategory: "function",
      count: 2,
      classification: "real function reference"
    }
  ]
});
assert.equal(
  mixedDependencySummary.excludedDependencySummary.totalExcludedCount
    + mixedDependencySummary.noGoEligibleEdgeCount,
  63,
  "excluded and eligible counts partition the legacy all-group sum without dropping overlap"
);

assert.equal(
  computeSanitizedDigest([
    "pg_trigger|pg_proc|n|trigger|function|real function reference|1",
    "pg_proc|pg_language|n|function|catalog-object|catalog-owned|11"
  ]),
  "64904c3af51c1e65f3aca4144e5f3744c9f6dc5ff8cf02e352efa0df56ec0136"
);

const repositoryInventory = buildRepositoryRpcInventory();
assert.equal(repositoryInventory.length, 81, "repository direct public RPC inventory has 81 unique identities");
assert.equal(new Set(repositoryInventory.map(({ schema, name, identityArguments }) => `${schema}.${name}(${identityArguments})`)).size, 81);

const fixtureRoot = path.join(process.cwd(), "scripts/fixtures");
const focusedRegressionCases = [
  ["A", () => {
    const readonlySql = fs.readFileSync(
      path.join(fixtureRoot, "comment-translator-paid-core-v1-gate1-catalog-readonly.sql"),
      "utf8"
    );
    const contractSource = fs.readFileSync(
      path.join(process.cwd(), "scripts/comment-translator-paid-core-v1-gate1-catalog-contract.mjs"),
      "utf8"
    );
    assert.match(readonlySql, /join\s+pg_catalog\.pg_type\s+as\s+dependent_type/i);
    assert.match(readonlySql, /join\s+pg_catalog\.pg_type\s+as\s+referenced_type/i);
    assert.match(readonlySql, /join\s+pg_catalog\.pg_constraint\s+as\s+dependent_constraint/i);
    assert.match(readonlySql, /join\s+pg_catalog\.pg_constraint\s+as\s+referenced_constraint/i);
    assert.match(readonlySql, /join\s+pg_catalog\.pg_namespace\s+as\s+dependent_constraint_namespace/i);
    assert.match(readonlySql, /join\s+pg_catalog\.pg_namespace\s+as\s+referenced_constraint_namespace/i);
    assert.match(readonlySql, /join\s+pg_catalog\.pg_trigger\s+as\s+dependent_trigger/i);
    assert.match(readonlySql, /join\s+pg_catalog\.pg_trigger\s+as\s+referenced_trigger/i);
    assert.match(readonlySql, /join\s+pg_catalog\.pg_namespace\s+as\s+dependent_trigger_namespace/i);
    assert.match(readonlySql, /join\s+pg_catalog\.pg_namespace\s+as\s+referenced_trigger_namespace/i);
    assert.match(readonlySql, /dependent_type_namespace\.nspname\s*=\s*'public'[\s\S]*?'type'/i);
    assert.match(readonlySql, /referenced_type_namespace\.nspname[\s\S]*?'external-user-object'/i);
    assert.match(readonlySql, /dependent_constraint_namespace\.nspname\s*=\s*'public'[\s\S]*?'constraint'[\s\S]*?'external-user-object'/i);
    assert.match(readonlySql, /referenced_constraint_namespace\.nspname\s*=\s*'public'[\s\S]*?'constraint'[\s\S]*?'external-user-object'/i);
    assert.match(readonlySql, /dependent_trigger_namespace\.nspname\s*=\s*'public'[\s\S]*?'trigger'[\s\S]*?'external-user-object'/i);
    assert.match(readonlySql, /referenced_trigger_namespace\.nspname\s*=\s*'public'[\s\S]*?'trigger'[\s\S]*?'external-user-object'/i);
    assert.match(readonlySql, /dependent_constraint_namespace\.nspname\s*=\s*'public'/i);
    assert.match(readonlySql, /referenced_constraint_namespace\.nspname\s*=\s*'public'/i);
    assert.match(readonlySql, /dependent_trigger_namespace\.nspname\s*=\s*'public'/i);
    assert.match(readonlySql, /referenced_trigger_namespace\.nspname\s*=\s*'public'/i);
    assert.match(
      contractSource,
      /assert\.equal\(\s*environment\.externalUserDependencyCount,\s*dependencySummary\.externalEligibleCount/
    );
    assert.equal(
      classifyDependencyGroup({
        classid: "pg_proc",
        refclassid: "pg_type",
        deptype: "n",
        dependentCategory: "function",
        referencedCategory: "external-user-object"
      }),
      "external user dependency"
    );
    assert.equal(
      classifyDependencyGroup({
        classid: "pg_type",
        refclassid: "pg_class",
        deptype: "i",
        dependentCategory: "type",
        referencedCategory: "table"
      }),
      "catalog-owned"
    );
    assert.equal(
      classifyDependencyGroup({
        classid: "pg_constraint",
        refclassid: "pg_class",
        deptype: "n",
        dependentCategory: "external-user-object",
        referencedCategory: "table"
      }),
      "external user dependency"
    );
    assert.equal(
      classifyDependencyGroup({
        classid: "pg_trigger",
        refclassid: "pg_proc",
        deptype: "n",
        dependentCategory: "external-user-object",
        referencedCategory: "function"
      }),
      "external user dependency"
    );
  }],
  ["B", () => {
    const escapedLiteralSql = String.raw`
select E'escaped quote: \' create function public.ct_paid_escape_fake() returns void';
create function public.ct_paid_escape_real() returns void language sql as $$ select 1 $$;
`;
    assert.deepEqual(
      parsePublicRpcDeclarations(escapedLiteralSql).map(({ name }) => name),
      ["ct_paid_escape_real"]
    );
  }],
  ["C", () => {
    const commonPath = path.join(fixtureRoot, "comment-translator-paid-core-v1-gate1-catalog-readonly.sql");
    const productionPath = path.join(fixtureRoot, "comment-translator-paid-core-v1-gate1-catalog-readonly-production.sql");
    const previewPath = path.join(fixtureRoot, "comment-translator-paid-core-v1-gate1-catalog-readonly-preview.sql");
    assert.equal(fs.existsSync(productionPath), true, "Production target SQL exists");
    assert.equal(fs.existsSync(previewPath), true, "Preview target SQL exists");
    const commonSql = fs.readFileSync(commonPath, "utf8");
    const productionSql = fs.readFileSync(productionPath, "utf8");
    const previewSql = fs.readFileSync(previewPath, "utf8");
    const contractSource = fs.readFileSync(
      path.join(process.cwd(), "scripts/comment-translator-paid-core-v1-gate1-catalog-contract.mjs"),
      "utf8"
    );
    const extractPublicRelations = (sql) => [...sql.matchAll(/from\s+public\.([a-z0-9_]+)/gi)].map((match) => match[1]);
    const productionRelations = [
      "comment_translator_paid_entitlements",
      "comment_translator_paid_usage_counters",
      "comment_translator_paid_usage_events"
    ];
    const previewRelations = ["comment_translator_paid_entitlements"];
    assert.doesNotMatch(commonSql, /from\s+public\./i);
    assert.deepEqual(extractPublicRelations(productionSql), productionRelations);
    assert.deepEqual(extractPublicRelations(previewSql), previewRelations);
    assert.match(contractSource, /validateTargetReadonlySql\([^)]*productionRelations[^)]*\)/s);
    assert.match(contractSource, /validateTargetReadonlySql\([^)]*previewRelations[^)]*\)/s);
    assert.match(contractSource, /assert\.deepEqual\(\s*relationNames,\s*expectedRelationNames/);
    assert.doesNotMatch(previewSql, /comment_translator_paid_(?:usage_counters|usage_events)/i);

    assert.equal(
      typeof catalogContract.validateTargetReadonlySelectStatement,
      "function",
      "target read-only SQL uses an exported strict statement-shape validator"
    );
    const expectedRelation = "comment_translator_paid_entitlements";
    const validStatement = `select 'critical-entitlement-relation' as relation_label,
       count(*)::bigint as exact_row_count
from public.${expectedRelation}`;
    assert.equal(
      catalogContract.validateTargetReadonlySelectStatement(validStatement, expectedRelation, "preview"),
      expectedRelation
    );
    const relationContaminations = [
      validStatement.replace(`from public.${expectedRelation}`, "from private.audit_log"),
      validStatement.replace(`from public.${expectedRelation}`, "from audit_log"),
      `${validStatement} join private.audit_log on true`,
      `${validStatement} join public.comment_translator_paid_usage_events on true`,
      `${validStatement} join audit_log on true`,
      `${validStatement}, public.comment_translator_paid_usage_events`,
      validStatement.replace(expectedRelation, "comment_translator_paid_usage_events")
    ];
    for (const contaminatedStatement of relationContaminations) {
      assert.throws(
        () => catalogContract.validateTargetReadonlySelectStatement(
          contaminatedStatement,
          expectedRelation,
          "preview"
        ),
        /exact approved single-relation SELECT/,
        "target SQL rejects any additional or replacement relation"
      );
    }
  }],
  ["D", () => {
    const dependencyFixture = JSON.parse(fs.readFileSync(
      path.join(fixtureRoot, "comment-translator-paid-core-v1-gate1-dependency-contract.json"),
      "utf8"
    ));
    const contractSource = fs.readFileSync(
      path.join(process.cwd(), "scripts/comment-translator-paid-core-v1-gate1-catalog-contract.mjs"),
      "utf8"
    );
    const expected = {
      production: { unexpected: 38, excluded: 60, nonUnexpected: 441, scoped: 539 },
      preview: { unexpected: 204, excluded: 136, nonUnexpected: 1031, scoped: 1371 }
    };
    for (const [target, counts] of Object.entries(expected)) {
      const environment = dependencyFixture.environments[target];
      assert.equal(environment.nonUnexpectedScopedEdgeCount, counts.nonUnexpected);
      assert.equal(
        counts.unexpected + counts.excluded + environment.nonUnexpectedScopedEdgeCount,
        counts.scoped,
        `${target} fixture has an independently expected complete scoped-edge partition`
      );
    }
    assert.match(contractSource, /const DEPENDENCY_EXPECTATIONS\s*=\s*Object\.freeze/);
    assert.match(contractSource, /5751a4e6a27f9b16537a2bca178990341d2659958c6ce2e4259e91edb3041c94/);
    assert.match(contractSource, /a85dfb04ea062b754d4384a3e3b8a06cd6e363da32c4dc58f56892b5a95315b1/);
    assert.match(
      contractSource,
      /dependencySummary\.noGoEligibleEdgeCount\s*\+\s*recalculatedExcludedDependencySummary\.totalExcludedCount\s*\+\s*environment\.nonUnexpectedScopedEdgeCount/
    );
  }]
];

const focusedFailures = [];
for (const [label, regressionCase] of focusedRegressionCases) {
  try {
    regressionCase();
  } catch (error) {
    focusedFailures.push(label);
  }
}
assert.deepEqual(focusedFailures, [], `focused regression failures: ${focusedFailures.join(",")}`);

console.log("comment-translator-paid-core-v1-gate1-catalog focused contract: PASS");
