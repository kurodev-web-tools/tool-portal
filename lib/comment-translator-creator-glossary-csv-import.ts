import "server-only";

import type { CommentTranslatorCreatorGlossaryEntry } from "./comment-translator-creator-glossary-store";

export const commentTranslatorCreatorGlossaryCsvHeaders = [
  "language_scope",
  "term",
  "replacement",
  "note"
] as const;

export const commentTranslatorCreatorGlossaryCsvMaxBytes = 128 * 1024;
export const commentTranslatorCreatorGlossaryCsvMaxRows = 30;

export const commentTranslatorCreatorGlossaryCsvImportContract = {
  runtime: "server-only",
  parser: "dependency-free-deterministic-state-machine",
  encoding: "utf8-only-optional-bom",
  maxBytes: commentTranslatorCreatorGlossaryCsvMaxBytes,
  maxDataRows: commentTranslatorCreatorGlossaryCsvMaxRows,
  header: commentTranslatorCreatorGlossaryCsvHeaders,
  replacement: "all-rows-atomic-replace",
  normalization: "nc-c1-nfkc-whitespace-language",
  formulaCells: "reject-file-not-rewrite",
  collision: "normalized-language-and-term-file-reject",
  blankRows: "reject",
  bareCarriageReturn: "reject"
} as const;

export type CommentTranslatorCreatorGlossaryCsvImportEntry = CommentTranslatorCreatorGlossaryEntry;

export type CommentTranslatorCreatorGlossaryCsvImportRejectionReason =
  | "file-too-large"
  | "invalid-encoding"
  | "invalid-csv"
  | "invalid-header"
  | "empty-data"
  | "blank-row"
  | "row-limit-exceeded"
  | "cell-limit-exceeded"
  | "invalid-cell"
  | "formula-cell"
  | "normalized-term-collision";

export type CommentTranslatorCreatorGlossaryCsvImportResult =
  | {
      readonly status: "ready";
      readonly entries: readonly CommentTranslatorCreatorGlossaryCsvImportEntry[];
    }
  | {
      readonly status: "rejected";
      readonly reason: CommentTranslatorCreatorGlossaryCsvImportRejectionReason;
    };

type CsvRecordResult =
  | { readonly status: "ready"; readonly records: readonly (readonly string[])[] }
  | { readonly status: "rejected"; readonly reason: "invalid-csv" };

const languageAliases: Readonly<Record<string, string>> = {
  jp: "ja",
  japanese: "ja",
  eng: "en",
  english: "en",
  kr: "ko",
  korean: "ko",
  cn: "zh-hans",
  chinese: "zh-hans"
};

export function parseCommentTranslatorCreatorGlossaryCsv(
  input: Uint8Array | ArrayBuffer
): CommentTranslatorCreatorGlossaryCsvImportResult {
  const bytes = readBytes(input);
  if (!bytes || bytes.byteLength > commentTranslatorCreatorGlossaryCsvMaxBytes) {
    return rejected("file-too-large");
  }
  if (hasUtf16OrUtf32Bom(bytes)) return rejected("invalid-encoding");

  let source: string;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return rejected("invalid-encoding");
  }
  if (source.charCodeAt(0) === 0xfeff) source = source.slice(1);
  if (source.includes("\ufeff")) return rejected("invalid-cell");

  const records = parseCsvRecords(source);
  if (records.status === "rejected") return records;
  if (records.records.length === 0 || !sameHeader(records.records[0])) return rejected("invalid-header");
  if (records.records.length === 1) return rejected("empty-data");

  const dataRecords = records.records.slice(1);
  if (dataRecords.length > commentTranslatorCreatorGlossaryCsvMaxRows) return rejected("row-limit-exceeded");

  const entries: CommentTranslatorCreatorGlossaryCsvImportEntry[] = [];
  const collisionKeys = new Set<string>();
  for (const record of dataRecords) {
    if (record.every((cell) => cell.length === 0)) return rejected("blank-row");
    if (record.length !== commentTranslatorCreatorGlossaryCsvHeaders.length) return rejected("invalid-csv");
    for (const cell of record) {
      if (hasDisallowedControl(cell)) return rejected("invalid-cell");
      if (hasFormulaCellPrefix(cell)) return rejected("formula-cell");
    }

    const languageScope = normalizeLanguageScope(record[0]);
    const term = normalizeText(record[1], 100);
    const replacement = normalizeText(record[2], 200);
    const note = normalizeText(record[3], 500, true);
    if (!languageScope || !term || !replacement || note === null) {
      return rejected("cell-limit-exceeded");
    }
    entries.push({
      languageScope,
      term,
      replacement,
      note: note || null,
      normalizedTerm: term.toLowerCase()
    });

    const entry = entries[entries.length - 1];
    const collisionKey = `${entry.languageScope}\u0000${entry.normalizedTerm}`;
    if (collisionKeys.has(collisionKey)) return rejected("normalized-term-collision");
    collisionKeys.add(collisionKey);
  }

  entries.sort((left, right) =>
    left.languageScope.localeCompare(right.languageScope) || left.normalizedTerm.localeCompare(right.normalizedTerm)
  );
  return { status: "ready", entries };
}

function readBytes(input: Uint8Array | ArrayBuffer): Uint8Array | null {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  return null;
}

function hasUtf16OrUtf32Bom(bytes: Uint8Array): boolean {
  return (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xfe && bytes[2] === 0x00 && bytes[3] === 0x00) ||
    (bytes.length >= 4 && bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0xfe && bytes[3] === 0xff) ||
    (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) ||
    (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff);
}

function parseCsvRecords(source: string): CsvRecordResult {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;
  let closedQuote = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
          closedQuote = true;
        }
      } else if (character === "\r") {
        if (source[index + 1] !== "\n") return { status: "rejected", reason: "invalid-csv" };
        field += "\r\n";
        index += 1;
      } else {
        field += character;
      }
      continue;
    }

    if (closedQuote) {
      if (character === ",") {
        record.push(field);
        field = "";
        closedQuote = false;
        continue;
      }
      if (character === "\r") {
        if (source[index + 1] !== "\n") return { status: "rejected", reason: "invalid-csv" };
        record.push(field);
        records.push(record);
        record = [];
        field = "";
        closedQuote = false;
        index += 1;
        continue;
      }
      if (character === "\n") {
        record.push(field);
        records.push(record);
        record = [];
        field = "";
        closedQuote = false;
        continue;
      }
      return { status: "rejected", reason: "invalid-csv" };
    }
    if (character === '"') {
      if (field.length !== 0) return { status: "rejected", reason: "invalid-csv" };
      quoted = true;
      continue;
    }
    if (character === ",") {
      record.push(field);
      field = "";
      continue;
    }
    if (character === "\r") {
      if (source[index + 1] !== "\n") return { status: "rejected", reason: "invalid-csv" };
      record.push(field);
      records.push(record);
      record = [];
      field = "";
      index += 1;
      continue;
    }
    if (character === "\n") {
      record.push(field);
      records.push(record);
      record = [];
      field = "";
      continue;
    }
    field += character;
  }

  if (quoted) return { status: "rejected", reason: "invalid-csv" };
  if (field.length > 0 || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  return { status: "ready", records };
}

function sameHeader(record: readonly string[]): boolean {
  return record.length === commentTranslatorCreatorGlossaryCsvHeaders.length &&
    record.every((cell, index) => cell === commentTranslatorCreatorGlossaryCsvHeaders[index]);
}

function normalizeText(value: string, maximumLength: number, allowEmpty = false): string | null {
  const normalized = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (!normalized && !allowEmpty) return null;
  if (Array.from(normalized).length > maximumLength) return null;
  return normalized;
}

function normalizeLanguageScope(value: string): string | null {
  const normalized = value.normalize("NFKC").trim().toLowerCase().replace(/_/g, "-");
  if (Array.from(normalized).length < 1 || Array.from(normalized).length > 35) return null;
  const canonical = languageAliases[normalized] ?? normalized;
  return canonical === "*" || /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(canonical) ? canonical : null;
}

function hasDisallowedControl(value: string): boolean {
  for (const character of Array.from(value)) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint === 0 || (codePoint >= 1 && codePoint <= 8) || codePoint === 11 || codePoint === 12 ||
      (codePoint >= 14 && codePoint <= 31) || codePoint === 127 || (codePoint >= 128 && codePoint <= 159)) {
      return true;
    }
  }
  return false;
}

function hasFormulaCellPrefix(value: string): boolean {
  const normalized = value.normalize("NFKC");
  const characters = Array.from(normalized);
  let index = 0;
  while (index < characters.length && isLeadingWhitespaceOrControl(characters[index])) index += 1;
  if (index === characters.length) return false;
  return characters[index] === "=" || characters[index] === "+" || characters[index] === "-" || characters[index] === "@";
}

function isLeadingWhitespaceOrControl(character: string): boolean {
  const codePoint = character.codePointAt(0) ?? 0;
  return /\s/.test(character) || codePoint <= 31 || codePoint === 127 || (codePoint >= 128 && codePoint <= 159);
}

function rejected(reason: CommentTranslatorCreatorGlossaryCsvImportRejectionReason): CommentTranslatorCreatorGlossaryCsvImportResult {
  return { status: "rejected", reason };
}
