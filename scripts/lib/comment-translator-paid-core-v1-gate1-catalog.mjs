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
