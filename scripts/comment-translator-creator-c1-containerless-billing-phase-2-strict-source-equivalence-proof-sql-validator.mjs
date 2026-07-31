import assert from "node:assert/strict";
import crypto from "node:crypto";

import {
  sqlAllowedCatalogSources,
  sqlKeys,
  sqlMutationVerbs
} from "./comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-fixtures.mjs";
import {
  approvedStrictSqlFunctions,
  criticalStrictSqlCteFingerprints,
  strictSqlFinalProjectionFingerprint,
  strictSqlCallSyntaxTokens,
  unknownMigrationCteFingerprint
} from "./comment-translator-creator-c1-containerless-billing-phase-2-strict-source-equivalence-proof-contract-sql-validator-fixtures.mjs";

function masked(character) {
  return character === "\n" || character === "\r" ? character : " ";
}

function lexSql(sql) {
  let code = "";
  let text = "";
  let state = "code";
  let blockDepth = 0;
  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];
    const next = sql[index + 1];
    if (state === "code" && character === "-" && next === "-") {
      code += "  "; text += "  "; state = "line"; index += 1;
    } else if (state === "code" && character === "/" && next === "*") {
      code += "  "; text += "  "; state = "block"; blockDepth = 1; index += 1;
    } else if (state === "code" && character === "'") {
      if (/[eE]/.test(sql[index - 1] ?? "")
          && !/[a-z0-9_$]/i.test(sql[index - 2] ?? "")) {
        throw new Error("unsupported SQL escape string");
      }
      code += " "; text += character; state = "single";
    } else if (state === "code" && character === "\"") {
      code += " "; text += character; state = "double";
    } else if (state === "line") {
      code += masked(character); text += masked(character);
      if (character === "\n" || character === "\r") state = "code";
    } else if (state === "block" && character === "/" && next === "*") {
      code += "  "; text += "  "; blockDepth += 1; index += 1;
    } else if (state === "block" && character === "*" && next === "/") {
      code += "  "; text += "  "; blockDepth -= 1; index += 1;
      if (blockDepth === 0) state = "code";
    } else if (state === "block") {
      code += masked(character); text += masked(character);
    } else if (state === "single" && character === "'" && next === "'") {
      code += "  "; text += "''"; index += 1;
    } else if (state === "single") {
      code += masked(character); text += character;
      if (character === "'") state = "code";
    } else if (state === "double" && character === "\"" && next === "\"") {
      throw new Error("unsupported escaped SQL quoted identifier");
    } else if (state === "double") {
      text += character;
      if (character === "\"") {
        code += " "; state = "code";
      } else {
        if (!/[a-z0-9_]/.test(character)) {
          throw new Error(`unsupported SQL quoted identifier character: ${character}`);
        }
        code += character;
      }
    } else {
      code += character; text += character;
    }
  }
  if (state === "line") state = "code";
  if (state !== "code") throw new Error(`unterminated SQL lexical state: ${state}`);
  assert.equal(code.length, sql.length);
  assert.equal(text.length, sql.length);
  return { code, text };
}

function parenthesisDepths(code) {
  const depths = new Array(code.length);
  let depth = 0;
  for (let index = 0; index < code.length; index += 1) {
    depths[index] = depth;
    if (code[index] === "(") depth += 1;
    if (code[index] === ")") {
      depth -= 1;
      if (depth < 0) throw new Error("unbalanced SQL parentheses");
    }
  }
  if (depth !== 0) throw new Error("unbalanced SQL parentheses");
  return depths;
}

function findClosingParenthesis(code, open) {
  let depth = 1;
  for (let index = open + 1; index < code.length; index += 1) {
    if (code[index] === "(") depth += 1;
    if (code[index] === ")") depth -= 1;
    if (depth === 0) return index;
  }
  throw new Error("unbalanced SQL parentheses");
}

function extractCtes({ code, text }, depths) {
  const ctes = new Map();
  const pattern = /(?:\bwith|,)\s*([a-z_][a-z0-9_]*)\s*(?:\([^)]*\))?\s+as\s*\(/gi;
  for (const match of code.matchAll(pattern)) {
    if (depths[match.index] !== 0) continue;
    const name = match[1].toLowerCase();
    if (ctes.has(name)) throw new Error(`duplicate SQL CTE: ${name}`);
    const declarationStart = match.index + match[0].indexOf(match[1]);
    const open = match.index + match[0].lastIndexOf("(");
    const close = findClosingParenthesis(code, open);
    const normalized = text.slice(open + 1, close).replace(/\s+/g, " ").trim();
    ctes.set(name, {
      code: code.slice(open + 1, close),
      declarationStart,
      normalized,
      close
    });
  }
  assert.ok(ctes.size > 0, "SQL declares named CTEs");
  return ctes;
}

function fingerprint(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function assertSizeHeader(sql) {
  const header = sql.split(/\r?\n/, 4).join("\n");
  assert.match(header, /^-- SIZE_OK: one immutable read-only statement with 84 source-bound predicate rows\./);
  assert.match(header, /CTE index: manifests\/normalizations -> catalog observations -> predicates\/vectors -> classification -> seven outputs/);
  assert.match(header, /execution boundary cannot be split; named CTEs are the internal decomposition/);
  assert.match(header, /static validator and fixed CTE fingerprints own structural regression checks/);
}

function assertStatement(code) {
  assert.match(code, /^\s*with\b/i);
  assert.doesNotMatch(code, /[^\x00-\x7f]/, "SQL code uses the supported ASCII grammar");
  assert.doesNotMatch(code, /\$[a-z_0-9]*\$/i, "SQL excludes unsupported dollar quoting");
  assert.equal((code.match(/;/g) ?? []).length, 1, "SQL has one statement");
  assert.match(code, /;\s*$/, "SQL statement ends at its sole semicolon");
  const mutation = new RegExp(`\\b(?:${[...sqlMutationVerbs, "into"].join("|")})\\b`, "i");
  assert.doesNotMatch(code, mutation, "SQL is read-only");
}

function assertSources(code, ctes, depths) {
  const approved = new Set([
    ...sqlAllowedCatalogSources.map((source) => source.toLowerCase()),
    ...ctes.keys()
  ]);
  const pattern = /\b(?:from|join|table)\s+(?:lateral\s+)?([a-z_][a-z0-9_$]*(?:\s*\.\s*[a-z_][a-z0-9_$]*)*)/gi;
  for (const match of code.matchAll(pattern)) {
    const source = match[1].replace(/\s/g, "").toLowerCase();
    const following = code.slice(match.index + match[0].length);
    if (/^\s*\(/.test(following)) continue;
    if (!approved.has(source)) throw new Error(`unapproved SQL source: ${source}`);
  }
  const clauseToken = /\b(?:where|group|order|having|limit|offset|fetch|for|window|union|except|intersect)\b|[,;]/gi;
  for (const match of code.matchAll(/\bfrom\b/gi)) {
    const start = match.index + match[0].length;
    if (!/^\s*(?:lateral\s+)?(?:\(|[a-z_])/i.test(code.slice(start))) continue;
    const baseDepth = depths[match.index];
    clauseToken.lastIndex = start;
    for (let token = clauseToken.exec(code); token; token = clauseToken.exec(code)) {
      if (depths[token.index] < baseDepth) break;
      if (depths[token.index] !== baseDepth) continue;
      if (token[0] === ",") {
        throw new Error("comma-separated SQL sources are forbidden");
      }
      break;
    }
  }
}

function isExpectedAliasColumnList(code, match, name, afterOpen) {
  if (name !== "expected") return false;
  return code.slice(0, match.index).trimEnd().endsWith(")")
    && /^\s*role_name\s*\)/i.test(code.slice(afterOpen));
}

function assertFunctions(code, ctes) {
  const approved = new Set(approvedStrictSqlFunctions);
  const syntax = new Set(strictSqlCallSyntaxTokens);
  const observed = new Set();
  const pattern = /\b([a-z_][a-z0-9_$]*(?:\s*\.\s*[a-z_][a-z0-9_$]*)*)\s*\(/gi;
  for (const match of code.matchAll(pattern)) {
    const name = match[1].replace(/\s/g, "").toLowerCase();
    if (ctes.get(name)?.declarationStart === match.index || syntax.has(name)) continue;
    if (isExpectedAliasColumnList(code, match, name, match.index + match[0].length)) continue;
    if (!approved.has(name)) throw new Error(`unapproved SQL function: ${name}`);
    observed.add(name);
  }
  assert.deepEqual([...observed].sort(), [...approved].sort(), "SQL function allowlist is exact");
}

function assertUnknownVersionBoundary(code, ctes) {
  const unknown = ctes.get("unknown_count");
  if (!unknown) throw new Error("unknown migration remote.version boundary: missing CTE");
  if (/\b(?:array_agg|string_agg)\s*\(/i.test(unknown.code)) {
    throw new Error("unknown migration remote.version boundary: raw aggregation");
  }
  const versionPattern = /\bremote\s*\.\s*version\b/gi;
  const sourcePattern = /\bsupabase_migrations\s*\.\s*schema_migrations\b/gi;
  const globalUses = code.match(versionPattern) ?? [];
  const localUses = unknown.code.match(versionPattern) ?? [];
  if (globalUses.length !== 2 || localUses.length !== 2) {
    throw new Error(`unknown migration remote.version boundary: occurrence count ${globalUses.length}/${localUses.length}`);
  }
  const globalSources = code.match(sourcePattern) ?? [];
  const localSources = unknown.code.match(sourcePattern) ?? [];
  if (globalSources.length !== 1 || localSources.length !== 1) {
    throw new Error(`unknown migration remote.version boundary: source count ${globalSources.length}/${localSources.length}`);
  }
  if (fingerprint(unknown.normalized) !== unknownMigrationCteFingerprint) {
    throw new Error(`unknown migration remote.version boundary: fingerprint ${fingerprint(unknown.normalized)}`);
  }
}

function assertCriticalCtes(ctes) {
  for (const [name, expected] of Object.entries(criticalStrictSqlCteFingerprints)) {
    const actual = ctes.has(name) ? fingerprint(ctes.get(name).normalized) : null;
    if (actual !== expected) throw new Error(`critical CTE fingerprint mismatch: ${name}`);
  }
}

function assertFinalOutput({ code, text }, ctes, depths) {
  const lastClose = Math.max(...[...ctes.values()].map(({ close }) => close));
  const finalCode = code.slice(lastClose + 1);
  const select = /^\s*select\b/i.exec(finalCode);
  assert.ok(select, "SQL has a final SELECT");
  const finalFrom = [...finalCode.matchAll(/\bfrom\b/gi)]
    .find((match) => depths[lastClose + 1 + match.index] === 0);
  assert.ok(finalFrom, "SQL has a top-level final FROM");
  const projection = finalCode.slice(select[0].length, finalFrom.index);
  const outputCount = 1 + [...projection.matchAll(/,/g)]
    .filter((match) => depths[lastClose + 1 + select[0].length + match.index] === 0)
    .length;
  assert.equal(outputCount, 7, "SQL has exact seven top-level outputs");
  const aliases = [...finalCode.matchAll(/\bas\s+([a-z][a-z0-9_]*)/gi)]
    .filter((match) => depths[lastClose + 1 + match.index] === 0)
    .map(([, alias]) => alias.toLowerCase());
  assert.deepEqual(aliases, sqlKeys, "SQL has exact seven outputs in order");
  assert.doesNotMatch(finalCode, /\bremote\.version\b/i);
  if (fingerprint(text.slice(lastClose + 1).replace(/\s+/g, " ").trim())
      !== strictSqlFinalProjectionFingerprint) {
    throw new Error("final projection fingerprint mismatch");
  }
}

export function validateStrictSourceEquivalenceProofSql(sql) {
  assert.equal(typeof sql, "string");
  assert.ok(sql.length > 0);
  assertSizeHeader(sql);
  const lexed = lexSql(sql);
  const depths = parenthesisDepths(lexed.code);
  assertStatement(lexed.code);
  const ctes = extractCtes(lexed, depths);
  assertSources(lexed.code, ctes, depths);
  assertUnknownVersionBoundary(lexed.code, ctes);
  assertFunctions(lexed.code, ctes);
  assertCriticalCtes(ctes);
  assertFinalOutput(lexed, ctes, depths);
}
