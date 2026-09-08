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
  }],
  ["E", () => {
    const acquisitionSource = fs.readFileSync(
      path.join(process.cwd(), "scripts/comment-translator-paid-core-v1-gate1-catalog-acquire-readonly.ps1"),
      "utf8"
    );
    const readbackContractSource = fs.readFileSync(
      path.join(process.cwd(), "scripts/comment-translator-paid-core-v1-gate1-catalog-readback-contract.mjs"),
      "utf8"
    );
    const absenceSql = acquisitionSource.slice(
      acquisitionSource.indexOf("'absence', jsonb_build_object("),
      acquisitionSource.indexOf("'targetFingerprint',", acquisitionSource.indexOf("'absence', jsonb_build_object("))
    );
    assert.match(absenceSql, /\|\| case when '__TARGET__' = 'preview' then jsonb_build_object\(\s*'sharedPaidEntitlementRelationCount'/,
      "only Preview emits its additional v1 absence field");
    assert.match(absenceSql, /\) else '\{\}'::jsonb end/,
      "Production emits only its three approved v1 absence fields");
    assert.equal((absenceSql.match(/sharedPaidEntitlementRelationCount/g) ?? []).length, 1);
    assert.match(
      acquisitionSource,
      /PGCONNECT_TIMEOUT\s*=\s*["']15["']/,
      "acquisition bounds PostgreSQL connection startup"
    );
    assert.match(
      acquisitionSource,
      /StandardInput\.WriteAsync\(\$StandardInput\)/,
      "acquisition writes captured process input asynchronously"
    );
    assert.match(
      acquisitionSource,
      /\$inputTask\.Wait\([^)]+\)[\s\S]*?StandardInput\.Close\(\)/,
      "acquisition bounds the captured process input write before closing it"
    );
    assert.match(
      acquisitionSource,
      /Get-SanitizedPsqlErrorClass/,
      "acquisition classifies captured PostgreSQL errors without exposing stderr"
    );
    assert.match(
      acquisitionSource,
      /failureDetails[\s\S]*?psqlErrorClass/,
      "acquisition reports a sanitized PostgreSQL failure class"
    );
    for (const errorClass of [
      "SYNTAX_ERROR",
      "RELATION_NOT_FOUND",
      "COLUMN_NOT_FOUND",
      "FUNCTION_NOT_FOUND",
      "TYPE_NOT_FOUND",
      "INVALID_CAST",
      "QUERY_SCOPE",
      "QUERY_AMBIGUOUS"
    ]) {
      assert.match(acquisitionSource, new RegExp(`return\\s+\"${errorClass}\"`), `acquisition recognizes ${errorClass}`);
    }
    assert.match(
      acquisitionSource,
      /\(\s*\(\s*pg_catalog\.xpath\([\s\S]*?\)\)\[1\]::text/,
      "exact row-count extraction parenthesizes the xpath array result"
    );
    assert.match(
      acquisitionSource,
      /pg_catalog\.query_to_xml\([\s\S]*?\,\s*false\s*\,\s*false\s*\,\s*''\s*\)/,
      "exact row-count extraction uses a table XML document for the table XPath"
    );
    assert.match(
      acquisitionSource,
      /\$Row\.identityArguments\s*-isnot\s*\[string\]/,
      "function validation requires identity arguments to be a string"
    );
    assert.doesNotMatch(
      acquisitionSource,
      /IsNullOrWhiteSpace\(\[string\]\$Row\.identityArguments\)/,
      "function validation accepts an empty identity-argument string for no-argument functions"
    );
    assert.match(
      acquisitionSource,
      /validationScope[\s\S]*?validationField/,
      "table validation reports only a sanitized scope and field on failure"
    );
    assert.match(
      acquisitionSource,
      /WaitForExit\(\$processTimeoutMilliseconds\)/,
      "acquisition bounds captured process execution"
    );
    assert.match(
      acquisitionSource,
      /if\s*\(-not\s*\$exited\)[\s\S]*?\.Kill\(/,
      "acquisition terminates a timed-out captured process"
    );
    assert.match(acquisitionSource, /table_scope[\s\S]*'canonical'/i, "acquisition has an explicit canonical table scope");
    assert.match(acquisitionSource, /'canonical'\s*,\s*jsonb_build_object/i, "acquisition returns canonical state");
    for (const field of ["columns", "constraints", "indexes", "policies", "acls", "rlsEnabled", "owner"]) {
      assert.match(acquisitionSource, new RegExp(`'${field}'`), `acquisition captures canonical ${field}`);
    }
    assert.match(acquisitionSource, /dependency_counts[\s\S]*scope_name\s*=\s*'canonical'/i, "acquisition returns canonical dependency counts");
    assert.doesNotMatch(
      acquisitionSource,
      /\$sqlPreviewScoped\s*=\s*@'[\s\S]*?'canonical'[\s\S]*?'tables'\s*,\s*'\[\]'::jsonb/i,
      "Preview canonical state is never fabricated with empty arrays"
    );
    assert.match(readbackContractSource, /inspectCatalogReadbackArtifact/, "readback validation is exposed as an inspection contract");
    assert.match(readbackContractSource, /validation\.missing|result\.missing/i, "readback contract reports validator findings");
    assert.match(readbackContractSource, /489b36c13953b9fa1f508ea7e8bdb9a6ca5cb0aa0998de07cbbbe4189d174a16/, "readback contract pins r13 artifact hash");
    assert.match(readbackContractSource, /createCanonicalObservation/, "readback contract derives a retained count observation");
    assert.match(readbackContractSource, /projectCanonicalStructuralState/, "readback contract derives structural state without rowCount");
    assert.equal(typeof catalogContract.inspectCatalogReadbackArtifact, "function", "readback inspection helper is exported");
    const incompletePreview = {
      schemaVersion: 1,
      target: "preview",
      targetFingerprint: "a".repeat(32),
      readOnly: {
        serverVersionMajor: "17.6",
        transactionReadOnly: "on",
        defaultTransactionReadOnly: "on",
        transactionIsolation: "repeatable read"
      },
      history: { rows: [], count: 0, totalStatements: 0, targetRows: 0, targetMatches: 0 },
      canonicalRpc: { functions: [] },
      paidLegacy: { tables: [], functions: [], triggers: [], dependencyCounts: {} },
      sourceEra: { tables: [], functions: [], triggers: [], dependencyCounts: {} },
      absence: {
        legacyRelationCount: 0,
        sourceEraRelationCount: 0,
        archiveSchemaCount: 0,
        sharedPaidEntitlementRelationCount: 1
      }
    };
    const inspection = catalogContract.inspectCatalogReadbackArtifact(incompletePreview, "preview");
    assert.equal(inspection.valid, false, "incomplete Preview readback is not valid");
    assert.ok(inspection.missing.includes("canonical"), "missing canonical state is reported");
    assert.ok(inspection.missing.includes("canonical.tables"), "missing canonical tables are reported");
    assert.ok(inspection.missing.includes("canonical.functions"), "missing canonical functions are reported");
    assert.ok(inspection.missing.includes("canonical.dependencyCounts"), "missing canonical dependency counts are reported");
  }],
  ["F", () => {
    const bridgeStates = JSON.parse(fs.readFileSync(
      path.join(fixtureRoot, "comment-translator-paid-core-v1-gate1-bridge-states.json"),
      "utf8"
    ));
    const countsByIdentity = new Map(
      bridgeStates.canonicalObservation.rows.map((row) => [`${row.schema}.${row.name}`, row.rowCount])
    );
    const baseline = {
      ...bridgeStates.canonical,
      tables: bridgeStates.canonical.tables.map((table) => ({
        ...table,
        rowCount: countsByIdentity.get(`${table.schema}.${table.name}`)
      }))
    };
    const countVariant = structuredClone(baseline);
    countVariant.tables = countVariant.tables.map((table, index) => ({
      ...table,
      rowCount: table.rowCount + index + 1
    }));

    assert.equal(
      typeof catalogContract.projectCanonicalStructuralState,
      "function",
      "canonical structural projection is exported"
    );
    assert.equal(
      typeof catalogContract.createCanonicalObservation,
      "function",
      "canonical count observation is exported"
    );
    assert.equal(
      typeof catalogContract.assertCanonicalStructuralState,
      "function",
      "canonical structural validator is exported"
    );
    assert.equal(
      typeof catalogContract.assertCanonicalObservation,
      "function",
      "canonical observation validator is exported"
    );

    const baselineStructure = catalogContract.projectCanonicalStructuralState(baseline);
    const variantStructure = catalogContract.projectCanonicalStructuralState(countVariant);
    assert.deepEqual(
      variantStructure,
      baselineStructure,
      "a rowCount-only change does not change canonical structural state"
    );

    const sourceArtifactSha256 = "a".repeat(64);
    const baselineObservation = catalogContract.createCanonicalObservation(baseline, sourceArtifactSha256);
    const variantObservation = catalogContract.createCanonicalObservation(countVariant, sourceArtifactSha256);
    assert.notDeepEqual(
      variantObservation,
      baselineObservation,
      "a rowCount-only change remains a distinct retained observation"
    );
    assert.equal(variantObservation.sourceArtifactSha256, sourceArtifactSha256);
    catalogContract.assertCanonicalStructuralState(baselineStructure);
    catalogContract.assertCanonicalObservation(baselineObservation, baseline, sourceArtifactSha256);

    for (const field of ["owner", "rlsEnabled", "columns", "constraints", "indexes", "policies", "acls"]) {
      const changed = structuredClone(baselineStructure);
      const firstTable = changed.tables[0];
      if (field === "owner") firstTable.owner = `${firstTable.owner}_changed`;
      else if (field === "rlsEnabled") firstTable.rlsEnabled = !firstTable.rlsEnabled;
      else if (Array.isArray(firstTable[field])) firstTable[field] = [...firstTable[field], structuredClone(firstTable[field][0] ?? {})];
      assert.notDeepEqual(
        changed,
        baselineStructure,
        `canonical structural mutation of ${field} is observable`
      );
    }

    for (const mutation of [
      (state) => { state.functions[0].definitionMd5 = "b".repeat(32); },
      (state) => { state.functions[0].securityDefiner = !state.functions[0].securityDefiner; },
      (state) => { state.functions[0].config = [...state.functions[0].config, "jit=off"]; },
      (state) => { state.triggers[0].enabled = !state.triggers[0].enabled; },
      (state) => { state.dependencyCounts.unexpectedPgDependEdges += 1; }
    ]) {
      const changed = structuredClone(baselineStructure);
      mutation(changed);
      assert.notDeepEqual(changed, baselineStructure, "every non-row-count structural field remains comparable");
    }

    const missingCount = structuredClone(baseline);
    delete missingCount.tables[0].rowCount;
    assert.throws(
      () => catalogContract.projectCanonicalStructuralState(missingCount),
      /canonical structural/i,
      "missing raw row counts fail before projection"
    );
    const invalidCount = structuredClone(baseline);
    invalidCount.tables[0].rowCount = -1;
    assert.throws(
      () => catalogContract.projectCanonicalStructuralState(invalidCount),
      /canonical structural/i,
      "invalid raw row counts fail before projection"
    );
    const duplicateTable = structuredClone(baselineStructure);
    duplicateTable.tables.push(structuredClone(duplicateTable.tables[0]));
    assert.throws(
      () => catalogContract.assertCanonicalStructuralState(duplicateTable),
      /duplicate/i,
      "duplicate canonical table identities fail closed"
    );
    const missingFunctionField = structuredClone(baselineStructure);
    delete missingFunctionField.functions[0].definitionMd5;
    assert.throws(
      () => catalogContract.assertCanonicalStructuralState(missingFunctionField),
      /canonical structural/i,
      "missing complete FunctionRow fields fail closed"
    );
    const wrongSource = structuredClone(baselineObservation);
    wrongSource.sourceArtifactSha256 = "b".repeat(64);
    assert.throws(
      () => catalogContract.assertCanonicalObservationAgainstStructure(wrongSource, baselineStructure, sourceArtifactSha256),
      /sourceArtifactSha256/i,
      "observation provenance mismatch fails closed"
    );
    const invalidObservationCount = structuredClone(baselineObservation);
    invalidObservationCount.rows[0].rowCount = -1;
    assert.throws(
      () => catalogContract.assertCanonicalObservationAgainstStructure(invalidObservationCount, baselineStructure, sourceArtifactSha256),
      /canonical observation/i,
      "invalid observation counts fail closed"
    );

    const invalidObservation = structuredClone(baselineObservation);
    invalidObservation.rows = invalidObservation.rows.slice(1);
    assert.throws(
      () => catalogContract.assertCanonicalObservation(invalidObservation, baseline, sourceArtifactSha256),
      /canonical observation/i,
      "missing count identities fail closed"
    );
    const unknownStructureField = { ...baselineStructure, unexpected: true };
    assert.throws(
      () => catalogContract.assertCanonicalStructuralState(unknownStructureField),
      /canonical structural/i,
      "unknown canonical structural fields fail closed"
    );
  }],
  ["G", () => {
    const integrationSource = fs.readFileSync(
      path.join(process.cwd(), "scripts/comment-translator-paid-core-v1-gate1-database-integration-contract.mjs"),
      "utf8"
    );
    assert.match(integrationSource, /projectCanonicalStructuralState/);
    assert.match(integrationSource, /canonicalObservation/);
    assert.match(integrationSource, /canonicalRowFingerprints/);
    assert.match(
      integrationSource,
      /function canonicalRowFingerprints[\s\S]*?jsonb_agg\(jsonb_build_object/,
      "canonical row fingerprints are returned as one JSON array"
    );
    assert.match(integrationSource, /sameCountUpdateDetected/);
    assert.match(integrationSource, /losslessPerTableRowEquality/);
    assert.match(integrationSource, /shell:\s*false/);
    assert.doesNotMatch(integrationSource, /shell:\s*(?:true|process\.platform)/,
      "native integration retains the approved shell-free execution boundary");
    assert.match(integrationSource, /localAdminRole\s*=\s*["']supabase_admin["']/);
    assert.match(integrationSource, /assertLocalPsqlAsRole/);
    assert.match(integrationSource, /options\.username\s*\?\?\s*localObjectRole/);
    assert.match(integrationSource, /function createFreshDatabase/);
    assert.match(integrationSource, /CONNECTION_ERROR/);
    for (const caseId of [
      "partial-objects",
      "mixed-objects",
      "non-empty-legacy-table",
      "wrong-owner",
      "rls-drift",
      "acl-drift",
      "function-identity-drift",
      "function-result-type-drift",
      "function-config-drift",
      "function-security-definer-drift",
      "function-definition-digest-drift",
      "trigger-absent",
      "trigger-disabled",
      "internal-foreign-key-drift",
      "pre-existing-archive-schema",
      "canonical-extra-identity-present-in-legacy",
      "malformed-legacy-object",
      "extra-legacy-object",
      "duplicate-legacy-identity",
      "paid-cron-present",
      "external-view-dependency",
      "external-function-reference",
      "external-constraint-dependency",
      "external-trigger-dependency"
    ]) {
      assert.match(integrationSource, new RegExp(`id: "${caseId}"`), `negative case is implemented: ${caseId}`);
    }
    assert.match(integrationSource, /db", "reset", "--local", "--no-seed"/);
    assert.match(integrationSource, /migration", "list", "--local"/);
    assert.match(integrationSource, /gate1-atomicity-test/);
    assert.match(integrationSource, /classifyLocalCliResult/);
    assert.match(integrationSource, /LOCAL_SUPABASE_RUNTIME_UNAVAILABLE/);
    assert.doesNotMatch(integrationSource, /ATOMICITY_MOVE_NOT_UNIQUE/);
    assert.match(integrationSource, /ATOMICITY_MOVE_NOT_FOUND/);
    assert.match(integrationSource, /REMOTE_CLI_ARGUMENT_REJECTED/);
    assert.doesNotMatch(integrationSource, /db", "push"/);
    assert.doesNotMatch(integrationSource, /\[\s*["']--linked["']/);
  }],
  ["H", () => {
    const authorityPath = path.join(
      fixtureRoot,
      "comment-translator-paid-core-v1-gate1-canonical-authority.json"
    );
    const authority = JSON.parse(fs.readFileSync(authorityPath, "utf8"));
    const bridgeStates = JSON.parse(fs.readFileSync(
      path.join(fixtureRoot, "comment-translator-paid-core-v1-gate1-bridge-states.json"),
      "utf8"
    ));
    const previewArtifact = JSON.parse(fs.readFileSync(
      "C:/ProgramData/Codex/Gate1/catalog-readback-20260903-r13/preview/preview-catalog-readback.json",
      "utf8"
    ));
    const integrationSource = fs.readFileSync(
      path.join(process.cwd(), "scripts/comment-translator-paid-core-v1-gate1-database-integration-contract.mjs"),
      "utf8"
    );
    assert.deepEqual(Object.keys(authority).sort(), [
      "browserExecuteRoles",
      "canonicalSource",
      "definitionDriftExpectedTrueCount",
      "definitionDriftObservation",
      "definitionDriftResolution",
      "lfReplaySource",
      "previewReadbackRole",
      "rawDefinitionMd5Policy",
      "rowCountPolicy",
      "schemaVersion",
      "serviceRolePolicy"
    ]);
    assert.equal(authority.schemaVersion, 1);
    assert.equal(authority.canonicalSource, "repository-migrations+safe-security-contract");
    assert.deepEqual(authority.browserExecuteRoles, ["PUBLIC", "anon", "authenticated"]);
    assert.equal(authority.serviceRolePolicy, "explicit-minimum-only");
    assert.equal(authority.rawDefinitionMd5Policy, "exact-pg-get-functiondef-md5");
    assert.equal(authority.rowCountPolicy, "observation-only");
    assert.equal(authority.previewReadbackRole, "observed-drift-only");
    assert.equal(authority.lfReplaySource, "git-or-deployment-equivalent-source-bytes");
    assert.equal(authority.definitionDriftResolution, "forward-only-migration");
    assert.equal(authority.definitionDriftExpectedTrueCount, 2);
    assert.equal(authority.definitionDriftObservation, "UNVERIFIED_UNTIL_LOCAL_REPLAY");
    assert.equal(
      typeof catalogContract.assertCanonicalPaidRpcSecurityBoundary,
      "function",
      "canonical Paid RPC browser execute boundary is exported"
    );
    const previewStructural = catalogContract.projectCanonicalStructuralState(previewArtifact.canonical);
    assert.notDeepEqual(
      bridgeStates.canonical,
      previewStructural,
      "desired canonical state is not copied from Preview readback"
    );
    catalogContract.assertCanonicalPaidRpcSecurityBoundary(bridgeStates.canonical);
    assert.match(integrationSource, /canonicalMigrationBytes/);
    assert.match(integrationSource, /replace\(\/\\r\\n\?\//);
    assert.match(integrationSource, /["']start["']/);
    assert.match(integrationSource, /project_id/);
    assert.match(integrationSource, /non.?conflict|port/i);
    assert.match(integrationSource, /function createDisposableDatabaseRuntime/);
    assert.match(integrationSource, /["']network["'],\s*["']create["']/);
    assert.match(integrationSource, /["']volume["'],\s*["']create["']/);
    assert.match(integrationSource, /["']--pull=never["']/);
    assert.doesNotMatch(integrationSource, /GATE1_LOCAL_CONTAINER\s*\?\?/);
    assert.doesNotMatch(integrationSource, /GATE1_LOCAL_DATABASE\s*\?\?/);
    assert.match(integrationSource, /definitionDriftClassification/);
    assert.match(integrationSource, /LF_REPLAY_MATCH/);
    assert.match(integrationSource, /TRUE_DEFINITION_DRIFT/);
    assert.match(integrationSource, /definitionDriftExpectedTrueCount/);
    assert.match(integrationSource, /UNVERIFIED_UNTIL_LOCAL_REPLAY/);
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
