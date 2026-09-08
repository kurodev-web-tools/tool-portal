import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const PUBLIC_RPC_DECLARATION = /\bcreate\s+(?:or\s+replace\s+)?function\s+public\.(ct_paid_[a-z0-9_]+)\s*\(/gi;
const TYPE_START = new Set([
  "any",
  "anyarray",
  "anycompatible",
  "anycompatiblearray",
  "anyelement",
  "anyenum",
  "anynonarray",
  "anyrange",
  "anycompatiblemultirange",
  "anycompatible nonarray",
  "bigint",
  "bit",
  "bool",
  "boolean",
  "bytea",
  "char",
  "character",
  "citext",
  "date",
  "decimal",
  "double",
  "float",
  "float4",
  "float8",
  "int",
  "int2",
  "int4",
  "int8",
  "integer",
  "interval",
  "json",
  "jsonb",
  "name",
  "numeric",
  "oid",
  "real",
  "record",
  "smallint",
  "text",
  "time",
  "timestamp",
  "timestamptz",
  "trigger",
  "uuid",
  "varbit",
  "varchar",
  "void",
  "xml"
]);

export const DEPENDENCY_CLASSIFICATIONS = Object.freeze([
  "catalog-owned",
  "auto-managed",
  "real function reference",
  "external user dependency"
]);

export const CANONICAL_TABLE_NAMES = Object.freeze([
  "comment_translator_paid_attempt_receipts",
  "comment_translator_paid_azure_fallback_buckets",
  "comment_translator_paid_billing_lifecycles",
  "comment_translator_paid_billing_period_usage",
  "comment_translator_paid_capacity_config",
  "comment_translator_paid_capacity_reservations",
  "comment_translator_paid_checkout_holds",
  "comment_translator_paid_checkout_session_bindings",
  "comment_translator_paid_consents",
  "comment_translator_paid_customers",
  "comment_translator_paid_entitlements",
  "comment_translator_paid_external_id_tombstones",
  "comment_translator_paid_global_cost_buckets",
  "comment_translator_paid_logical_attempts",
  "comment_translator_paid_maintenance_work_items",
  "comment_translator_paid_message_rate_buckets",
  "comment_translator_paid_message_rate_reservation_tombstones",
  "comment_translator_paid_message_rate_reservations",
  "comment_translator_paid_openai_minute_buckets",
  "comment_translator_paid_openai_rate_reservations",
  "comment_translator_paid_openai_slots",
  "comment_translator_paid_owner_cost_buckets",
  "comment_translator_paid_poll_budget_buckets",
  "comment_translator_paid_poll_reservations",
  "comment_translator_paid_provider_circuits",
  "comment_translator_paid_provider_detail_source_receipts",
  "comment_translator_paid_provider_dispatch_claims",
  "comment_translator_paid_provider_hourly_details",
  "comment_translator_paid_scheduler_runs",
  "comment_translator_paid_session_leases",
  "comment_translator_paid_session_summaries",
  "comment_translator_paid_stripe_event_receipts",
  "comment_translator_paid_subscription_bindings"
]);

const CATALOG_STATE_KEYS = ["tables", "functions", "triggers", "dependencyCounts"];
const TABLE_ROW_KEYS = ["schema", "name", "owner", "rlsEnabled", "rowCount", "columns", "constraints", "indexes", "policies", "acls"];
const CANONICAL_TABLE_STRUCTURE_ROW_KEYS = ["schema", "name", "owner", "rlsEnabled", "columns", "constraints", "indexes", "policies", "acls"];
const CANONICAL_COUNT_ROW_KEYS = ["schema", "name", "rowCount"];
const CANONICAL_OBSERVATION_KEYS = ["sourceArtifactSha256", "rows", "aggregateSha256"];
const COLUMN_ROW_KEYS = ["schema", "table", "ordinal", "name", "type", "notNull", "defaultDefinition"];
const CONSTRAINT_ROW_KEYS = ["schema", "table", "name", "type", "definition"];
const INDEX_ROW_KEYS = ["schema", "table", "name", "definition"];
const POLICY_ROW_KEYS = ["schema", "table", "name", "command", "permissive", "roles", "usingDefinition", "checkDefinition"];
const ACL_ROW_KEYS = ["schema", "objectKind", "objectIdentity", "grantee", "privilege", "grantable"];
const FUNCTION_ROW_KEYS = ["schema", "name", "identityArguments", "resultType", "owner", "securityDefiner", "config", "acls", "definitionMd5"];
const TRIGGER_ROW_KEYS = ["tableSchema", "tableName", "name", "enabled", "functionIdentity", "definition"];
const DEPENDENCY_COUNT_KEYS = [
  "inboundForeignKeys",
  "views",
  "materializedViews",
  "rules",
  "policies",
  "userTriggers",
  "eventTriggers",
  "publications",
  "outsideFunctionSourceReferences",
  "unexpectedPgDependEdges"
];

function isLineBreak(character) {
  return character === "\n" || character === "\r";
}

function dollarQuoteAt(source, offset) {
  const match = source.slice(offset).match(/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/);
  return match?.[0] ?? null;
}

/**
 * Masks comments, quoted literals, quoted identifiers, and dollar-quoted SQL
 * while preserving newlines and code punctuation. This makes declaration
 * matching unable to see function-body tokens without retaining their text.
 */
export function maskSql(source) {
  const characters = [...source];
  let offset = 0;
  let blockCommentDepth = 0;

  const blank = (index) => {
    if (!isLineBreak(characters[index])) characters[index] = " ";
  };

  while (offset < characters.length) {
    if (blockCommentDepth > 0) {
      if (characters[offset] === "/" && characters[offset + 1] === "*") {
        blank(offset);
        blank(offset + 1);
        blockCommentDepth += 1;
        offset += 2;
        continue;
      }
      if (characters[offset] === "*" && characters[offset + 1] === "/") {
        blank(offset);
        blank(offset + 1);
        blockCommentDepth -= 1;
        offset += 2;
        continue;
      }
      blank(offset);
      offset += 1;
      continue;
    }

    if (characters[offset] === "-" && characters[offset + 1] === "-") {
      blank(offset);
      blank(offset + 1);
      offset += 2;
      while (offset < characters.length && !isLineBreak(characters[offset])) {
        blank(offset);
        offset += 1;
      }
      continue;
    }

    if (characters[offset] === "/" && characters[offset + 1] === "*") {
      blank(offset);
      blank(offset + 1);
      blockCommentDepth = 1;
      offset += 2;
      continue;
    }

    const dollarQuote = characters[offset] === "$" ? dollarQuoteAt(source, offset) : null;
    if (dollarQuote) {
      const end = source.indexOf(dollarQuote, offset + dollarQuote.length);
      const finish = end < 0 ? characters.length : end + dollarQuote.length;
      for (let index = offset; index < finish; index += 1) blank(index);
      offset = finish;
      continue;
    }

    if (characters[offset] === "'" || characters[offset] === '"') {
      const quote = characters[offset];
      blank(offset);
      offset += 1;
      while (offset < characters.length) {
        if (quote === "'" && characters[offset] === "\\" && offset + 1 < characters.length) {
          blank(offset);
          blank(offset + 1);
          offset += 2;
          continue;
        }
        if (characters[offset] === quote) {
          blank(offset);
          if (characters[offset + 1] === quote) {
            blank(offset + 1);
            offset += 2;
            continue;
          }
          offset += 1;
          break;
        }
        blank(offset);
        offset += 1;
      }
      continue;
    }

    offset += 1;
  }

  return characters.join("");
}

export function validateTargetReadonlySelectStatement(statement, expectedRelationName, target = "target") {
  if (!/^[a-z0-9_]+$/.test(expectedRelationName)) {
    throw new Error(`${target} expected relation name is invalid`);
  }
  const normalized = statement.replace(/\s+/g, " ").trim();
  const expectedShape = new RegExp(
    `^select\\s+'(?:''|[^'])*'\\s+as\\s+relation_label\\s*,\\s*count\\s*\\(\\s*\\*\\s*\\)\\s*::\\s*bigint\\s+as\\s+exact_row_count\\s+from\\s+public\\.${expectedRelationName}$`,
    "i"
  );
  if (!expectedShape.test(normalized)) {
    throw new Error(`${target} SQL statement is not the exact approved single-relation SELECT`);
  }
  return expectedRelationName;
}

function matchingParenthesis(masked, openIndex) {
  let depth = 0;
  for (let index = openIndex; index < masked.length; index += 1) {
    if (masked[index] === "(") depth += 1;
    if (masked[index] === ")") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error("unterminated function parameter list");
}

function topLevelRanges(masked, start, end) {
  const ranges = [];
  let depth = 0;
  let segmentStart = start;
  for (let index = start; index < end; index += 1) {
    if (masked[index] === "(") depth += 1;
    if (masked[index] === ")") depth -= 1;
    if (masked[index] === "," && depth === 0) {
      ranges.push([segmentStart, index]);
      segmentStart = index + 1;
    }
  }
  ranges.push([segmentStart, end]);
  return ranges;
}

function cleanSqlFragment(fragment) {
  return maskSql(fragment).replace(/\s+/g, " ").trim();
}

function removeDefaultValue(fragment) {
  const masked = maskSql(fragment);
  let depth = 0;
  for (let index = 0; index < masked.length; index += 1) {
    if (masked[index] === "(") depth += 1;
    if (masked[index] === ")") depth -= 1;
    if (depth !== 0) continue;
    if (masked[index] === "=") return fragment.slice(0, index).trim();
    const word = masked.slice(index).match(/^default\b/i);
    if (word) return fragment.slice(0, index).trim();
  }
  return fragment.trim();
}

function normalizeType(type) {
  let normalized = type
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ",")
    .replace(/\s*\[\s*\]/g, "[]")
    .replace(/\bpg_catalog\./gi, "")
    .trim()
    .toLowerCase();

  const arraySuffix = normalized.endsWith("[]") ? "[]" : "";
  const base = arraySuffix ? normalized.slice(0, -2).trim() : normalized;
  const aliases = new Map([
    ["bool", "boolean"],
    ["decimal", "numeric"],
    ["float4", "real"],
    ["float8", "double precision"],
    ["int", "integer"],
    ["int2", "smallint"],
    ["int4", "integer"],
    ["int8", "bigint"],
    ["timestamptz", "timestamp with time zone"],
    ["varchar", "character varying"]
  ]);
  return `${aliases.get(base) ?? base}${arraySuffix}`;
}

function parseParameter(fragment) {
  const withoutDefault = cleanSqlFragment(removeDefaultValue(fragment));
  if (!withoutDefault) return null;

  let rest = withoutDefault;
  let mode = "";
  const modeMatch = rest.match(/^(inout|out|in|variadic)\b\s*/i);
  if (modeMatch) {
    mode = modeMatch[1].toLowerCase();
    rest = rest.slice(modeMatch[0].length).trim();
  }
  if (mode === "out") return null;

  let name = "";
  let type = rest;
  const quotedName = rest.match(/^"([^"]+)"\s+(.+)$/);
  const plainName = rest.match(/^([a-z_][a-z0-9_$]*)\s+(.+)$/i);
  if (quotedName) {
    name = quotedName[1];
    type = quotedName[2];
  } else if (plainName && !TYPE_START.has(plainName[1].toLowerCase())) {
    name = plainName[1];
    type = plainName[2];
  }

  const normalizedType = normalizeType(type);
  const normalizedMode = mode === "in" ? "" : mode ? `${mode.toUpperCase()} ` : "";
  return `${normalizedMode}${name ? `${name} ` : ""}${normalizedType}`.trim();
}

function sortRpcInventory(rows) {
  return [...rows].sort((left, right) => {
    const leftKey = `${left.schema}.${left.name}(${left.identityArguments})`;
    const rightKey = `${right.schema}.${right.name}(${right.identityArguments})`;
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });
}

export function parsePublicRpcDeclarations(sql) {
  const masked = maskSql(sql);
  const declarations = [];
  for (const match of masked.matchAll(PUBLIC_RPC_DECLARATION)) {
    const openIndex = match.index + match[0].lastIndexOf("(");
    const closeIndex = matchingParenthesis(masked, openIndex);
    const ranges = topLevelRanges(masked, openIndex + 1, closeIndex);
    const identityArguments = ranges
      .map(([start, end]) => parseParameter(sql.slice(start, end)))
      .filter(Boolean)
      .join(", ");
    declarations.push({
      schema: "public",
      name: match[1].toLowerCase(),
      identityArguments
    });
  }
  return declarations;
}

export function buildRepositoryRpcInventory(migrationsDirectory = path.resolve(process.cwd(), "supabase/migrations")) {
  const identities = new Map();
  const files = fs.readdirSync(migrationsDirectory).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDirectory, file), "utf8");
    for (const declaration of parsePublicRpcDeclarations(sql)) {
      const key = `${declaration.schema}.${declaration.name}(${declaration.identityArguments})`;
      identities.set(key, declaration);
    }
  }
  return sortRpcInventory([...identities.values()]);
}

export function legacyFunctionTokenInventory(sql) {
  return [...new Set([...sql.matchAll(/\bct_paid_[a-z0-9_]+\b/gi)].map(([token]) => token.toLowerCase()))].sort();
}

export function classifyDependencyGroup(group) {
  const { classid, refclassid, deptype, dependentCategory, referencedCategory } = group;
  if (!["a", "i", "n"].includes(deptype)) throw new Error(`unsupported dependency type: ${deptype}`);
  if (!classid || !refclassid || !dependentCategory || !referencedCategory) {
    throw new Error("dependency group is missing a sanitized category");
  }
  const hasExternalUserCategory = [dependentCategory, referencedCategory]
    .some((category) => category === "user-object" || category === "external-user-object");
  if (hasExternalUserCategory) {
    return "external user dependency";
  }
  if (deptype === "a") return "auto-managed";
  if (deptype === "n" && refclassid === "pg_proc" && referencedCategory === "function") {
    return "real function reference";
  }
  if (classid.startsWith("pg_") && refclassid.startsWith("pg_")) return "catalog-owned";
  return "external user dependency";
}

export function evaluateDependencyGroupEligibility(group) {
  const classification = classifyDependencyGroup(group);
  const isBenignSchemaContract = group.deptype === "i"
    && group.classid === "pg_type"
    && group.refclassid === "pg_class"
    && group.dependentCategory === "type"
    && group.referencedCategory === "table";
  if (isBenignSchemaContract) {
    return { classification, noGoEligible: false, exclusion: "benign-schema-contract" };
  }
  if (group.deptype === "i") {
    return { classification, noGoEligible: false, exclusion: "internal-dependency" };
  }
  return { classification, noGoEligible: true, exclusion: null };
}

export function summarizeDependencyGroups(groups) {
  const classificationCounts = Object.fromEntries(
    DEPENDENCY_CLASSIFICATIONS.map((classification) => [classification, 0])
  );
  const eligibleGroups = [];
  let noGoEligibleEdgeCount = 0;
  let internalDependencyCount = 0;
  let benignSchemaContractCount = 0;
  let overlapCount = 0;

  for (const group of groups) {
    const evaluation = evaluateDependencyGroupEligibility(group);
    const classifiedGroup = { ...group, classification: evaluation.classification };
    if (group.deptype === "i") internalDependencyCount += group.count;
    if (evaluation.exclusion === "benign-schema-contract") {
      benignSchemaContractCount += group.count;
      if (group.deptype === "i") overlapCount += group.count;
    }
    if (evaluation.noGoEligible) {
      eligibleGroups.push(classifiedGroup);
      noGoEligibleEdgeCount += group.count;
      classificationCounts[evaluation.classification] += group.count;
    }
  }

  return {
    noGoEligibleEdgeCount,
    classificationCounts,
    externalEligibleCount: classificationCounts["external user dependency"],
    excludedDependencySummary: {
      internalDependencyCount,
      benignSchemaContractCount,
      overlapCount,
      totalExcludedCount: internalDependencyCount + benignSchemaContractCount - overlapCount
    },
    eligibleGroups
  };
}

export function computeSanitizedDigest(lines) {
  if (!Array.isArray(lines) || lines.some((line) => typeof line !== "string")) {
    throw new Error("digest input must be sanitized string lines");
  }
  return crypto.createHash("sha256").update([...lines].sort().join("\n"), "utf8").digest("hex");
}

export function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeysDeep(value[key])]));
}

export function computeObjectDigest(value, digestKey = "aggregateSha256") {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("object digest input must be a top-level object");
  }
  const projection = Object.fromEntries(Object.entries(value).filter(([key]) => key !== digestKey));
  return crypto.createHash("sha256").update(JSON.stringify(sortKeysDeep(projection)), "utf8").digest("hex");
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function missingKeys(value, expectedKeys, prefix, missing) {
  if (!isObject(value)) {
    missing.add(prefix);
    return false;
  }
  for (const key of expectedKeys) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) missing.add(`${prefix}.${key}`);
  }
  return true;
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function inspectAclRow(row, prefix, missing) {
  if (!missingKeys(row, ACL_ROW_KEYS, prefix, missing)) return;
  if (typeof row.schema !== "string") missing.add(`${prefix}.schema`);
  if (typeof row.objectKind !== "string") missing.add(`${prefix}.objectKind`);
  if (typeof row.objectIdentity !== "string") missing.add(`${prefix}.objectIdentity`);
  if (typeof row.grantee !== "string") missing.add(`${prefix}.grantee`);
  if (typeof row.privilege !== "string") missing.add(`${prefix}.privilege`);
  if (typeof row.grantable !== "boolean") missing.add(`${prefix}.grantable`);
}

function inspectTableRow(row, prefix, missing) {
  if (!missingKeys(row, TABLE_ROW_KEYS, prefix, missing)) return;
  if (typeof row.schema !== "string") missing.add(`${prefix}.schema`);
  if (typeof row.name !== "string") missing.add(`${prefix}.name`);
  if (typeof row.owner !== "string") missing.add(`${prefix}.owner`);
  if (typeof row.rlsEnabled !== "boolean") missing.add(`${prefix}.rlsEnabled`);
  if (!isNonNegativeInteger(row.rowCount)) missing.add(`${prefix}.rowCount`);
  for (const [field, rowKeys] of [["columns", COLUMN_ROW_KEYS], ["constraints", CONSTRAINT_ROW_KEYS], ["indexes", INDEX_ROW_KEYS], ["policies", POLICY_ROW_KEYS], ["acls", ACL_ROW_KEYS]]) {
    const values = row[field];
    if (!Array.isArray(values)) {
      missing.add(`${prefix}.${field}`);
      continue;
    }
    for (const [index, nested] of values.entries()) {
      const nestedPrefix = `${prefix}.${field}[${index}]`;
      if (field === "acls") inspectAclRow(nested, nestedPrefix, missing);
      else if (!missingKeys(nested, rowKeys, nestedPrefix, missing)) continue;
      if (field === "columns" && isObject(nested)) {
        if (!Number.isInteger(nested.ordinal) || nested.ordinal <= 0) missing.add(`${nestedPrefix}.ordinal`);
        if (typeof nested.notNull !== "boolean") missing.add(`${nestedPrefix}.notNull`);
        if (nested.defaultDefinition !== null && typeof nested.defaultDefinition !== "string") missing.add(`${nestedPrefix}.defaultDefinition`);
      }
      if (["constraints", "indexes", "policies"].includes(field) && isObject(nested) && typeof nested.name !== "string") {
        missing.add(`${nestedPrefix}.name`);
      }
      if (field === "policies" && isObject(nested)) {
        if (typeof nested.permissive !== "boolean") missing.add(`${nestedPrefix}.permissive`);
        if (!Array.isArray(nested.roles) || nested.roles.some((role) => typeof role !== "string")) missing.add(`${nestedPrefix}.roles`);
        for (const definition of ["usingDefinition", "checkDefinition"]) {
          if (nested[definition] !== null && typeof nested[definition] !== "string") missing.add(`${nestedPrefix}.${definition}`);
        }
      }
    }
  }
}

function inspectFunctionRow(row, prefix, missing) {
  if (!missingKeys(row, FUNCTION_ROW_KEYS, prefix, missing)) return;
  if (typeof row.schema !== "string") missing.add(`${prefix}.schema`);
  if (typeof row.name !== "string") missing.add(`${prefix}.name`);
  if (typeof row.identityArguments !== "string") missing.add(`${prefix}.identityArguments`);
  if (typeof row.resultType !== "string") missing.add(`${prefix}.resultType`);
  if (typeof row.owner !== "string") missing.add(`${prefix}.owner`);
  if (typeof row.securityDefiner !== "boolean") missing.add(`${prefix}.securityDefiner`);
  if (!Array.isArray(row.config) || row.config.some((value) => typeof value !== "string")) missing.add(`${prefix}.config`);
  if (!Array.isArray(row.acls)) missing.add(`${prefix}.acls`);
  else for (const [index, acl] of row.acls.entries()) inspectAclRow(acl, `${prefix}.acls[${index}]`, missing);
  if (typeof row.definitionMd5 !== "string" || !/^[0-9a-f]{32}$/.test(row.definitionMd5)) missing.add(`${prefix}.definitionMd5`);
}

function inspectTriggerRow(row, prefix, missing) {
  if (!missingKeys(row, TRIGGER_ROW_KEYS, prefix, missing)) return;
  for (const key of ["tableSchema", "tableName", "name", "functionIdentity", "definition"]) {
    if (typeof row[key] !== "string") missing.add(`${prefix}.${key}`);
  }
  if (typeof row.enabled !== "boolean") missing.add(`${prefix}.enabled`);
}

function inspectDependencyCounts(value, prefix, missing) {
  if (!missingKeys(value, DEPENDENCY_COUNT_KEYS, prefix, missing)) return;
  for (const key of DEPENDENCY_COUNT_KEYS) {
    if (!isNonNegativeInteger(value[key])) missing.add(`${prefix}.${key}`);
  }
}

function inspectCatalogState(state, prefix, missing) {
  if (!missingKeys(state, CATALOG_STATE_KEYS, prefix, missing)) {
    for (const key of CATALOG_STATE_KEYS) missing.add(`${prefix}.${key}`);
    return;
  }
  for (const [field, inspector] of [["tables", inspectTableRow], ["functions", inspectFunctionRow], ["triggers", inspectTriggerRow]]) {
    if (!Array.isArray(state[field])) {
      missing.add(`${prefix}.${field}`);
      continue;
    }
    for (const [index, row] of state[field].entries()) inspector(row, `${prefix}.${field}[${index}]`, missing);
  }
  inspectDependencyCounts(state.dependencyCounts, `${prefix}.dependencyCounts`, missing);
}

function exactKeys(value, expectedKeys, label) {
  if (!isObject(value)) throw new Error(`canonical structural invalid:${label}`);
  const expected = new Set(expectedKeys);
  const actual = Object.keys(value);
  const missing = expectedKeys.filter((key) => !Object.prototype.hasOwnProperty.call(value, key));
  const unknown = actual.filter((key) => !expected.has(key));
  if (missing.length > 0 || unknown.length > 0) {
    const details = [
      missing.length > 0 ? `missing=${missing.join(",")}` : null,
      unknown.length > 0 ? `unknown=${unknown.join(",")}` : null
    ].filter(Boolean).join(" ");
    throw new Error(`canonical structural invalid:${label}:${details}`);
  }
}

function requireString(value, label) {
  if (typeof value !== "string") throw new Error(`canonical structural invalid:${label}`);
}

function requireBoolean(value, label) {
  if (typeof value !== "boolean") throw new Error(`canonical structural invalid:${label}`);
}

function requireCount(value, label) {
  if (!isNonNegativeInteger(value)) throw new Error(`canonical structural invalid:${label}`);
}

function requireNullableString(value, label) {
  if (value !== null && typeof value !== "string") throw new Error(`canonical structural invalid:${label}`);
}

function validateStrictAclRow(row, label) {
  exactKeys(row, ACL_ROW_KEYS, label);
  for (const key of ["schema", "objectKind", "objectIdentity", "grantee", "privilege"]) {
    requireString(row[key], `${label}.${key}`);
  }
  requireBoolean(row.grantable, `${label}.grantable`);
}

function validateStrictTableChildren(row, label) {
  if (!Array.isArray(row.columns)) throw new Error(`canonical structural invalid:${label}.columns`);
  for (const [index, child] of row.columns.entries()) {
    const childLabel = `${label}.columns[${index}]`;
    exactKeys(child, COLUMN_ROW_KEYS, childLabel);
    for (const key of ["schema", "table", "name", "type"]) requireString(child[key], `${childLabel}.${key}`);
    if (!Number.isInteger(child.ordinal) || child.ordinal <= 0) throw new Error(`canonical structural invalid:${childLabel}.ordinal`);
    requireBoolean(child.notNull, `${childLabel}.notNull`);
    requireNullableString(child.defaultDefinition, `${childLabel}.defaultDefinition`);
  }

  if (!Array.isArray(row.constraints)) throw new Error(`canonical structural invalid:${label}.constraints`);
  for (const [index, child] of row.constraints.entries()) {
    const childLabel = `${label}.constraints[${index}]`;
    exactKeys(child, CONSTRAINT_ROW_KEYS, childLabel);
    for (const key of CONSTRAINT_ROW_KEYS) requireString(child[key], `${childLabel}.${key}`);
  }

  if (!Array.isArray(row.indexes)) throw new Error(`canonical structural invalid:${label}.indexes`);
  for (const [index, child] of row.indexes.entries()) {
    const childLabel = `${label}.indexes[${index}]`;
    exactKeys(child, INDEX_ROW_KEYS, childLabel);
    for (const key of INDEX_ROW_KEYS) requireString(child[key], `${childLabel}.${key}`);
  }

  if (!Array.isArray(row.policies)) throw new Error(`canonical structural invalid:${label}.policies`);
  for (const [index, child] of row.policies.entries()) {
    const childLabel = `${label}.policies[${index}]`;
    exactKeys(child, POLICY_ROW_KEYS, childLabel);
    for (const key of ["schema", "table", "name", "command"]) requireString(child[key], `${childLabel}.${key}`);
    requireBoolean(child.permissive, `${childLabel}.permissive`);
    if (!Array.isArray(child.roles) || child.roles.some((role) => typeof role !== "string")) {
      throw new Error(`canonical structural invalid:${childLabel}.roles`);
    }
    requireNullableString(child.usingDefinition, `${childLabel}.usingDefinition`);
    requireNullableString(child.checkDefinition, `${childLabel}.checkDefinition`);
  }

  if (!Array.isArray(row.acls)) throw new Error(`canonical structural invalid:${label}.acls`);
  for (const [index, child] of row.acls.entries()) validateStrictAclRow(child, `${label}.acls[${index}]`);
}

function validateStrictTableRow(row, label, includeRowCount) {
  exactKeys(row, includeRowCount ? TABLE_ROW_KEYS : CANONICAL_TABLE_STRUCTURE_ROW_KEYS, label);
  for (const key of ["schema", "name", "owner"]) requireString(row[key], `${label}.${key}`);
  requireBoolean(row.rlsEnabled, `${label}.rlsEnabled`);
  if (includeRowCount) requireCount(row.rowCount, `${label}.rowCount`);
  validateStrictTableChildren(row, label);
}

function validateStrictFunctionRow(row, label) {
  exactKeys(row, FUNCTION_ROW_KEYS, label);
  for (const key of ["schema", "name", "identityArguments", "resultType", "owner"]) {
    requireString(row[key], `${label}.${key}`);
  }
  requireBoolean(row.securityDefiner, `${label}.securityDefiner`);
  if (!Array.isArray(row.config) || row.config.some((value) => typeof value !== "string")) {
    throw new Error(`canonical structural invalid:${label}.config`);
  }
  if (!Array.isArray(row.acls)) throw new Error(`canonical structural invalid:${label}.acls`);
  for (const [index, child] of row.acls.entries()) validateStrictAclRow(child, `${label}.acls[${index}]`);
  if (typeof row.definitionMd5 !== "string" || !/^[0-9a-f]{32}$/.test(row.definitionMd5)) {
    throw new Error(`canonical structural invalid:${label}.definitionMd5`);
  }
}

function validateStrictTriggerRow(row, label) {
  exactKeys(row, TRIGGER_ROW_KEYS, label);
  for (const key of ["tableSchema", "tableName", "name", "functionIdentity", "definition"]) {
    requireString(row[key], `${label}.${key}`);
  }
  requireBoolean(row.enabled, `${label}.enabled`);
}

function validateStrictCatalogState(state, label, includeRowCount) {
  exactKeys(state, CATALOG_STATE_KEYS, label);
  if (!Array.isArray(state.tables)) throw new Error(`canonical structural invalid:${label}.tables`);
  const tableIdentities = new Set();
  for (const [index, row] of state.tables.entries()) {
    const rowLabel = `${label}.tables[${index}]`;
    validateStrictTableRow(row, rowLabel, includeRowCount);
    const identity = `${row.schema}.${row.name}`;
    if (tableIdentities.has(identity)) throw new Error(`canonical structural invalid:${label}.tables.duplicate`);
    tableIdentities.add(identity);
  }

  if (!Array.isArray(state.functions)) throw new Error(`canonical structural invalid:${label}.functions`);
  const functionIdentities = new Set();
  for (const [index, row] of state.functions.entries()) {
    const rowLabel = `${label}.functions[${index}]`;
    validateStrictFunctionRow(row, rowLabel);
    const identity = identityKey(row);
    if (functionIdentities.has(identity)) throw new Error(`canonical structural invalid:${label}.functions.duplicate`);
    functionIdentities.add(identity);
  }

  if (!Array.isArray(state.triggers)) throw new Error(`canonical structural invalid:${label}.triggers`);
  const triggerIdentities = new Set();
  for (const [index, row] of state.triggers.entries()) {
    const rowLabel = `${label}.triggers[${index}]`;
    validateStrictTriggerRow(row, rowLabel);
    const identity = `${row.tableSchema}.${row.tableName}.${row.name}`;
    if (triggerIdentities.has(identity)) throw new Error(`canonical structural invalid:${label}.triggers.duplicate`);
    triggerIdentities.add(identity);
  }

  exactKeys(state.dependencyCounts, DEPENDENCY_COUNT_KEYS, `${label}.dependencyCounts`);
  for (const key of DEPENDENCY_COUNT_KEYS) requireCount(state.dependencyCounts[key], `${label}.dependencyCounts.${key}`);
  return state;
}

function canonicalTableStructureFromRow(row) {
  const { rowCount: _rowCount, ...structure } = row;
  return structure;
}

/**
 * Derive the v2 canonical structural state by removing only the table rowCount
 * observation. All other catalog fields, including complete FunctionRow data,
 * ACLs, and dependency counts, remain exact and are validated strictly.
 */
export function projectCanonicalStructuralState(state) {
  validateStrictCatalogState(state, "canonical", true);
  const projected = {
    tables: state.tables.map(canonicalTableStructureFromRow),
    functions: state.functions.map((row) => ({ ...row, config: [...row.config], acls: row.acls.map((acl) => ({ ...acl })) })),
    triggers: state.triggers.map((row) => ({ ...row })),
    dependencyCounts: { ...state.dependencyCounts }
  };
  return assertCanonicalStructuralState(projected);
}

export function assertCanonicalStructuralState(state) {
  return validateStrictCatalogState(state, "canonical structural", false);
}

const CANONICAL_BROWSER_EXECUTE_ROLES = Object.freeze(["PUBLIC", "anon", "authenticated"]);

export function inspectCanonicalPaidRpcSecurityBoundary(state, options = {}) {
  assertCanonicalStructuralState(state);
  const browserExecuteRoles = new Set(options.browserExecuteRoles ?? CANONICAL_BROWSER_EXECUTE_ROLES);
  const violations = state.functions.flatMap((row) => row.acls
    .filter((acl) => acl.objectKind === "function"
      && acl.privilege === "EXECUTE"
      && browserExecuteRoles.has(acl.grantee))
    .map((acl) => ({
      functionIdentity: `${row.schema}.${row.name}(${row.identityArguments})`,
      grantee: acl.grantee,
      privilege: acl.privilege
    })));
  return {
    browserExecuteRoles: [...browserExecuteRoles],
    browserExecuteCount: violations.length,
    valid: violations.length === 0,
    violations
  };
}

export function assertCanonicalPaidRpcSecurityBoundary(state, options = {}) {
  const report = inspectCanonicalPaidRpcSecurityBoundary(state, options);
  if (!report.valid) {
    throw new Error(`canonical security contract invalid:browser-execute:${report.browserExecuteCount}`);
  }
  return state;
}

export function createCanonicalObservation(state, sourceArtifactSha256) {
  validateStrictCatalogState(state, "canonical", true);
  if (typeof sourceArtifactSha256 !== "string" || !/^[0-9a-f]{64}$/.test(sourceArtifactSha256)) {
    throw new Error("canonical observation invalid:sourceArtifactSha256");
  }
  const observation = {
    sourceArtifactSha256,
    rows: state.tables
      .map(({ schema, name, rowCount }) => ({ schema, name, rowCount }))
      .sort((left, right) => `${left.schema}.${left.name}`.localeCompare(`${right.schema}.${right.name}`)),
    aggregateSha256: ""
  };
  observation.aggregateSha256 = computeObjectDigest(observation);
  return assertCanonicalObservation(observation, state, sourceArtifactSha256);
}

export function assertCanonicalObservation(observation, state, sourceArtifactSha256) {
  validateStrictCatalogState(state, "canonical", true);
  const structuralState = projectCanonicalStructuralState(state);
  assertCanonicalObservationAgainstStructure(observation, structuralState, sourceArtifactSha256);
  const expectedRows = state.tables
    .map(({ schema, name, rowCount }) => ({ schema, name, rowCount }))
    .sort((left, right) => `${left.schema}.${left.name}`.localeCompare(`${right.schema}.${right.name}`));
  if (JSON.stringify(observation.rows) !== JSON.stringify(expectedRows)) {
    throw new Error("canonical observation invalid:coverage");
  }
  return observation;
}

export function assertCanonicalObservationAgainstStructure(observation, structuralState, sourceArtifactSha256) {
  assertCanonicalStructuralState(structuralState);
  if (typeof sourceArtifactSha256 !== "string" || !/^[0-9a-f]{64}$/.test(sourceArtifactSha256)) {
    throw new Error("canonical observation invalid:sourceArtifactSha256");
  }
  exactKeys(observation, CANONICAL_OBSERVATION_KEYS, "canonical observation");
  if (observation.sourceArtifactSha256 !== sourceArtifactSha256) {
    throw new Error("canonical observation invalid:sourceArtifactSha256");
  }
  if (!Array.isArray(observation.rows)) throw new Error("canonical observation invalid:rows");
  const identitySet = new Set();
  for (const [index, row] of observation.rows.entries()) {
    const label = `canonical observation.rows[${index}]`;
    exactKeys(row, CANONICAL_COUNT_ROW_KEYS, label);
    requireString(row.schema, `${label}.schema`);
    requireString(row.name, `${label}.name`);
    requireCount(row.rowCount, `${label}.rowCount`);
    const identity = `${row.schema}.${row.name}`;
    if (identitySet.has(identity)) throw new Error("canonical observation invalid:duplicate");
    identitySet.add(identity);
  }
  const expectedRows = structuralState.tables
    .map(({ schema, name }) => ({ schema, name }))
    .sort((left, right) => `${left.schema}.${left.name}`.localeCompare(`${right.schema}.${right.name}`));
  const observedIdentities = observation.rows.map(({ schema, name }) => ({ schema, name }));
  if (JSON.stringify(observedIdentities) !== JSON.stringify(expectedRows)) {
    throw new Error("canonical observation invalid:coverage");
  }
  if (typeof observation.aggregateSha256 !== "string" || !/^[0-9a-f]{64}$/.test(observation.aggregateSha256)) {
    throw new Error("canonical observation invalid:aggregateSha256");
  }
  if (computeObjectDigest(observation) !== observation.aggregateSha256) {
    throw new Error("canonical observation invalid:aggregateSha256");
  }
  return observation;
}

export function canonicalStructuralEqual(left, right) {
  assertCanonicalStructuralState(left);
  assertCanonicalStructuralState(right);
  return JSON.stringify(sortKeysDeep(left)) === JSON.stringify(sortKeysDeep(right));
}

function identityKey(row) {
  return `${row.schema}.${row.name}(${row.identityArguments})`;
}

export function inspectCatalogReadbackArtifact(artifact, target, options = {}) {
  const missing = new Set();
  const expectedTarget = String(target).toLowerCase();
  if (!isObject(artifact)) return { valid: false, target: expectedTarget, missing: ["artifact"] };

  const requiredKeys = [
    "schemaVersion",
    "target",
    "targetFingerprint",
    "readOnly",
    "history",
    "canonicalRpc",
    "canonical",
    "paidLegacy",
    "sourceEra",
    "absence"
  ];
  for (const key of requiredKeys) if (!Object.prototype.hasOwnProperty.call(artifact, key)) missing.add(key);
  for (const key of Object.keys(artifact)) {
    if (!requiredKeys.includes(key)) missing.add(`artifact.unknown.${key}`);
  }
  if (artifact.schemaVersion !== 1) missing.add("schemaVersion");
  if (artifact.target !== expectedTarget) missing.add("target");
  if (typeof artifact.targetFingerprint !== "string" || !/^[0-9a-f]{32}$/.test(artifact.targetFingerprint)) missing.add("targetFingerprint");

  const readOnly = artifact.readOnly;
  if (missingKeys(readOnly, ["serverVersionMajor", "transactionReadOnly", "defaultTransactionReadOnly", "transactionIsolation"], "readOnly", missing)) {
    for (const key of Object.keys(readOnly)) {
      if (!["serverVersionMajor", "transactionReadOnly", "defaultTransactionReadOnly", "transactionIsolation"].includes(key)) missing.add(`readOnly.unknown.${key}`);
    }
    if (readOnly.transactionReadOnly !== "on") missing.add("readOnly.transactionReadOnly");
    if (readOnly.defaultTransactionReadOnly !== "on") missing.add("readOnly.defaultTransactionReadOnly");
    if (readOnly.transactionIsolation !== "repeatable read") missing.add("readOnly.transactionIsolation");
    if (typeof readOnly.serverVersionMajor !== "string") missing.add("readOnly.serverVersionMajor");
  }

  const history = artifact.history;
  if (missingKeys(history, ["count", "totalStatements", "targetRows", "targetMatches", "rows"], "history", missing)) {
    for (const key of Object.keys(history)) {
      if (!["count", "totalStatements", "targetRows", "targetMatches", "rows"].includes(key)) missing.add(`history.unknown.${key}`);
    }
    for (const key of ["count", "totalStatements", "targetRows", "targetMatches"]) {
      if (!isNonNegativeInteger(history[key])) missing.add(`history.${key}`);
    }
    if (!Array.isArray(history.rows)) missing.add("history.rows");
    else for (const [index, row] of history.rows.entries()) {
      if (!missingKeys(row, ["version", "name"], `history.rows[${index}]`, missing)) continue;
      for (const key of Object.keys(row)) {
        if (!["version", "name"].includes(key)) missing.add(`history.rows[${index}].unknown.${key}`);
      }
      if (typeof row.version !== "string" || typeof row.name !== "string") missing.add(`history.rows[${index}]`);
    }
  }

  const canonicalRpc = artifact.canonicalRpc;
  if (missingKeys(canonicalRpc, ["functions"], "canonicalRpc", missing)) {
    for (const key of Object.keys(canonicalRpc)) if (key !== "functions") missing.add(`canonicalRpc.unknown.${key}`);
    if (!Array.isArray(canonicalRpc.functions)) missing.add("canonicalRpc.functions");
    else for (const [index, row] of canonicalRpc.functions.entries()) inspectFunctionRow(row, `canonicalRpc.functions[${index}]`, missing);
  }
  inspectCatalogState(artifact.canonical, "canonical", missing);
  inspectCatalogState(artifact.paidLegacy, "paidLegacy", missing);
  inspectCatalogState(artifact.sourceEra, "sourceEra", missing);

  const absenceKeys = expectedTarget === "preview"
    ? ["legacyRelationCount", "sourceEraRelationCount", "archiveSchemaCount", "sharedPaidEntitlementRelationCount"]
    : ["legacyRelationCount", "sourceEraRelationCount", "archiveSchemaCount"];
  if (missingKeys(artifact.absence, absenceKeys, "absence", missing)) {
    for (const key of Object.keys(artifact.absence)) if (!absenceKeys.includes(key)) missing.add(`absence.unknown.${key}`);
    for (const key of absenceKeys) if (!isNonNegativeInteger(artifact.absence[key])) missing.add(`absence.${key}`);
  }

  for (const [state, prefix] of [[artifact.canonical, "canonical"], [artifact.paidLegacy, "paidLegacy"], [artifact.sourceEra, "sourceEra"]]) {
    if (!isObject(state)) continue;
    try {
      validateStrictCatalogState(state, prefix, true);
    } catch {
      missing.add(`${prefix}.strict`);
    }
  }

  const canonicalTables = isObject(artifact.canonical) && Array.isArray(artifact.canonical.tables) ? artifact.canonical.tables : [];
  const canonicalFunctions = isObject(artifact.canonical) && Array.isArray(artifact.canonical.functions) ? artifact.canonical.functions : [];
  const rpcFunctions = isObject(canonicalRpc) && Array.isArray(canonicalRpc.functions) ? canonicalRpc.functions : [];
  const tableNames = new Set(canonicalTables.map((row) => row?.name).filter((name) => typeof name === "string"));
  const expectedCanonicalTableNames = options.expectedCanonicalTableNames ?? CANONICAL_TABLE_NAMES;
  const expectedRpcIdentities = options.expectedRpcIdentities ?? buildRepositoryRpcInventory();
  const expectedRpcKeys = new Set(expectedRpcIdentities.map(identityKey));
  const canonicalRpcKeys = new Set(rpcFunctions.map(identityKey));
  const canonicalStateKeys = new Set(canonicalFunctions.map(identityKey));

  if (expectedTarget === "preview") {
    if (canonicalTables.length !== expectedCanonicalTableNames.length) missing.add("canonical.tables.count");
    if (expectedCanonicalTableNames.some((name) => !tableNames.has(name))) missing.add("canonical.tables.missing");
    if (tableNames.size !== canonicalTables.length) missing.add("canonical.tables.duplicate");
    if (rpcFunctions.length !== expectedRpcIdentities.length) missing.add("canonicalRpc.functions.count");
    if ([...expectedRpcKeys].some((key) => !canonicalRpcKeys.has(key))) missing.add("canonicalRpc.functions.missing");
    if ([...canonicalRpcKeys].some((key) => !expectedRpcKeys.has(key))) missing.add("canonicalRpc.functions.extra");
    if (canonicalFunctions.length !== rpcFunctions.length) missing.add("canonical.functions.count");
    if ([...canonicalRpcKeys].some((key) => !canonicalStateKeys.has(key))) missing.add("canonical.functions.missing");
    if ([...canonicalStateKeys].some((key) => !canonicalRpcKeys.has(key))) missing.add("canonical.functions.extra");
  }
  if (canonicalFunctions.length === rpcFunctions.length && canonicalFunctions.length > 0) {
    const canonicalJson = JSON.stringify(sortKeysDeep(canonicalFunctions));
    const rpcJson = JSON.stringify(sortKeysDeep(rpcFunctions));
    if (canonicalJson !== rpcJson) missing.add("canonical.functions.rowEquality");
  }

  return {
    valid: missing.size === 0,
    target: expectedTarget,
    missing: [...missing].sort(),
    observed: {
      canonicalTableCount: canonicalTables.length,
      canonicalFunctionCount: canonicalFunctions.length,
      canonicalRpcFunctionCount: rpcFunctions.length,
      historyRowCount: isObject(history) && Array.isArray(history.rows) ? history.rows.length : 0
    }
  };
}

export function assertCatalogReadbackArtifact(artifact, target, options = {}) {
  const report = inspectCatalogReadbackArtifact(artifact, target, options);
  if (!report.valid) throw new Error(`catalog-readback-invalid:${report.missing.join(",")}`);
  return report;
}

export function dependencyDigestLines(groups) {
  return groups
    .map((group) => {
      const classification = group.classification ?? classifyDependencyGroup(group);
      return [
        group.classid,
        group.refclassid,
        group.deptype,
        group.dependentCategory,
        group.referencedCategory,
        classification,
        group.count
      ].join("|");
    })
    .sort();
}

export function classifyDependencyGroups(groups) {
  return groups.map((group) => ({
    ...group,
    classification: classifyDependencyGroup(group)
  }));
}
