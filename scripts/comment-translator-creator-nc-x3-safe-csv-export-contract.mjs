import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const historyActionMockKey = "comment-translator-creator-nc-x3-safe-history-action-mock";
const historyActionMockUrl = `data:text/javascript,${encodeURIComponent(`
export async function readCommentTranslatorCreatorSafeHistoryAction(...args) {
  const implementation = globalThis[Symbol.for(${JSON.stringify(historyActionMockKey)})];
  if (typeof implementation !== "function") throw new Error("safe history action mock unavailable");
  return implementation(...args);
}
`)}`;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { shortCircuit: true, url: "data:text/javascript,export{}" };
    if (specifier === "@/app/tools/comment-translator/history-actions") {
      return { shortCircuit: true, url: historyActionMockUrl };
    }
    if (specifier === "@/lib/comment-translator-creator-history-csv") {
      return {
        shortCircuit: true,
        url: pathToFileURL(path.join(process.cwd(), "lib/comment-translator-creator-history-csv.ts")).href
      };
    }
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      const candidate = fileURLToPath(new URL(specifier, context.parentURL));
      if (fs.existsSync(`${candidate}.ts`)) return { shortCircuit: true, url: pathToFileURL(`${candidate}.ts`).href };
    }
    return nextResolve(specifier, context);
  }
});

const root = process.cwd();
const serializerPath = "lib/comment-translator-creator-history-csv.ts";
const routePath = "app/api/comment-translator/history/export/route.ts";
const panelPath = "components/comment-translator/CommentTranslatorCreatorHistoryPanel.tsx";
const historyActionsPath = "app/tools/comment-translator/history-actions.ts";

const serializerSource = readIfPresent(serializerPath);
const routeSource = readIfPresent(routePath);
const panelSource = read(panelPath);
const historyActionsSource = read(historyActionsPath);

assert.match(
  serializerSource,
  /export function serializeCommentTranslatorCreatorSafeHistoryCsv\s*\(/,
  "NC-X3 RED: the server-only safe-history CSV serializer behavior is missing"
);
assert.match(
  routeSource,
  /export async function GET\s*\(\s*\)/,
  "NC-X3 RED: the fixed GET export route behavior is missing"
);

assert.match(serializerSource, /^import "server-only";/, "CSV serialization stays server-only");
assert.match(
  serializerSource,
  /readCommentTranslatorProjectedPriority\s*\(\s*row\.priority\s*\)/,
  "CSV badge output reuses the panel priority projection"
);
for (const header of ["author", "badge", "purchase", "translated_text", "original_text", "moderation", "source"]) {
  assert.match(serializerSource, new RegExp(`['\"]${header}['\"]`), `safe CSV header is present: ${header}`);
}
assert.match(serializerSource, /500/, "CSV serializer declares the 500-row bound");
assert.doesNotMatch(
  serializerSource,
  /ownerUserId|sessionReferenceId|messageCorrelationDigest|sourcePublishedAtIso|recordedAtIso|translationStatus|rawProvider|providerPayload|localStorage|sessionStorage|indexedDB|console\./i,
  "serializer has no private, timestamp, raw-provider, browser-storage, or log path"
);

const serializer = await import(pathToFileURL(path.join(root, serializerPath)).href);
assert.deepEqual(
  serializer.commentTranslatorCreatorSafeHistoryCsvHeaders,
  ["author", "badge", "purchase", "translated_text", "original_text", "moderation", "source"],
  "serializer exposes the fixed seven-column order"
);
assert.equal(serializer.commentTranslatorCreatorSafeHistoryCsvMaxRows, 500, "serializer exposes the fixed row bound");

const safeRow = (overrides = {}) => ({
  sourceAttributionLabel: "Source: YouTube Live Chat",
  authorLabel: "YouTube viewer",
  authorDisplayName: "Fixture viewer",
  originalText: "Original text",
  translatedText: "Translated text",
  translationStatus: "translated-f10",
  moderationLabel: "visible",
  priority: { category: "member", lane: "priority", rank: 4, badgeLabel: "Member" },
  badgeLabel: "member",
  purchaseLabel: "Purchase label",
  sourcePublishedAtIso: "2026-08-10T11:59:59.000Z",
  recordedAtIso: "2026-08-10T12:00:00.000Z",
  ...overrides
});

const orderedCsv = serializer.serializeCommentTranslatorCreatorSafeHistoryCsv([
  safeRow({ authorDisplayName: "first", originalText: null }),
  safeRow({ authorDisplayName: null, translatedText: "second" })
]);
assert.equal(typeof orderedCsv, "string", "valid safe history serializes");
assert.equal(orderedCsv.charCodeAt(0), 0xfeff, "CSV starts with a UTF-8 BOM");
assert.equal(orderedCsv.endsWith("\r\n"), true, "CSV records end with CRLF");
assert.deepEqual(
  parseCsv(orderedCsv.slice(1)),
  [
    ["author", "badge", "purchase", "translated_text", "original_text", "moderation", "source"],
    ["first", "Member", "Purchase label", "Translated text", "", "Visible", "Source: YouTube Live Chat"],
    ["YouTube viewer", "Member", "Purchase label", "second", "Original text", "Visible", "Source: YouTube Live Chat"]
  ],
  "CSV uses the safe allowlist, panel labels, null-as-empty cells, and server row order"
);

const quotedCsv = serializer.serializeCommentTranslatorCreatorSafeHistoryCsv([
  safeRow({
    authorDisplayName: "山田 😀",
    purchaseLabel: 'Gold, "level"',
    translatedText: "翻訳\n二行目",
    originalText: "original\r\nline"
  })
]);
assert.deepEqual(
  parseCsv(quotedCsv.slice(1))[1],
  ["山田 😀", "Member", 'Gold, "level"', "翻訳\n二行目", "original\r\nline", "Visible", "Source: YouTube Live Chat"],
  "CSV preserves Unicode, embedded commas, doubled quotes, and embedded newlines"
);

const formulaCsv = serializer.serializeCommentTranslatorCreatorSafeHistoryCsv([
  safeRow({
    authorDisplayName: " \t=author",
    purchaseLabel: "\u0000+purchase",
    translatedText: "\u000b-translation",
    originalText: "\r\n@original"
  })
]);
const formulaCells = parseCsv(formulaCsv.slice(1))[1];
assert.deepEqual(
  formulaCells.slice(0, 5),
  ["' \t=author", "Member", "'\u0000+purchase", "'\u000b-translation", "'\r\n@original"],
  "formula guard prefixes =, +, -, and @ after leading whitespace/control characters"
);

const privateValueCsv = serializer.serializeCommentTranslatorCreatorSafeHistoryCsv([
  safeRow({ ownerUserId: "private-owner", messageCorrelationDigest: "private-digest", rawProviderPayload: "private-payload" })
]);
assert.equal(privateValueCsv.includes("private-owner"), false, "owner identifiers are not exported");
assert.equal(privateValueCsv.includes("private-digest"), false, "correlation digests are not exported");
assert.equal(privateValueCsv.includes("private-payload"), false, "raw/provider values are not exported");

assert.equal(
  serializer.serializeCommentTranslatorCreatorSafeHistoryCsv(Array.from({ length: 500 }, (_, index) => safeRow({ authorDisplayName: `row-${index}` })) ) !== null,
  true,
  "exactly 500 rows are accepted"
);
assert.equal(
  serializer.serializeCommentTranslatorCreatorSafeHistoryCsv(Array.from({ length: 501 }, () => safeRow())),
  null,
  "more than 500 rows fails closed instead of truncating"
);
assert.equal(serializer.serializeCommentTranslatorCreatorSafeHistoryCsv(null), null, "malformed result rows fail closed");
assert.equal(serializer.serializeCommentTranslatorCreatorSafeHistoryCsv([null]), null, "malformed result row fails closed");
assert.equal(
  serializer.serializeCommentTranslatorCreatorSafeHistoryCsv([safeRow({ moderationLabel: "unknown" })]),
  null,
  "malformed moderation state fails closed"
);
assert.equal(
  serializer.serializeCommentTranslatorCreatorSafeHistoryCsv([safeRow({ moderationLabel: "deleted", originalText: "must not export" })]),
  null,
  "tombstones carrying text fail closed"
);

assert.match(routeSource, /readCommentTranslatorCreatorSafeHistoryAction\s*\(\s*\)/, "route delegates to the existing no-argument NC-H1 action");
assert.match(routeSource, /serializeCommentTranslatorCreatorSafeHistoryCsv\s*\(/, "route delegates serialization to the server-only serializer");
assert.match(routeSource, /result\.status\s*!==\s*["']ready["']/, "unavailable action result fails closed");
assert.match(routeSource, /Array\.isArray\s*\(\s*result\.rows\s*\)/, "malformed action result fails closed");
assert.match(routeSource, /catch\s*\{[\s\S]*return unavailableResponse\(\)/, "action exceptions fail closed");
assert.match(routeSource, /text\/csv;\s*charset=utf-8/, "success uses the stable CSV content type");
assert.match(routeSource, /attachment;\s*filename=["']comment-translator-safe-history\.csv["']/, "success uses the stable attachment filename");
assert.match(routeSource, /Cache-Control["']\s*:\s*["']no-store["']/, "success and failure responses are no-store");
assert.match(routeSource, /X-Content-Type-Options["']\s*:\s*["']nosniff["']/, "responses may use safe nosniff protection");
const unavailableBody = extractFunctionBody(routeSource, "unavailableResponse");
assert.match(unavailableBody, /Safe history export unavailable\./, "failure body is sanitized and stable");
assert.match(unavailableBody, /text\/plain;\s*charset=utf-8/, "failure is non-CSV");
assert.doesNotMatch(unavailableBody, /text\/csv|reason|owner|session|entitlement|provider/i, "failure does not expose internal authority reasons");
assert.doesNotMatch(
  routeSource,
  /request|cookies|searchParams|localStorage|sessionStorage|indexedDB|fetch\s*\(|console\.|process\.env|ownerUserId|sessionReferenceId|entitlement|supabase|authorizeCommentTranslatorCreatorPaid/i,
  "fixed GET route has no browser/query/storage/log or duplicate authority path"
);
assert.match(historyActionsSource, /export async function readCommentTranslatorCreatorSafeHistoryAction\s*\(\s*\)/, "route reuses the existing zero-input history action");

const route = await import(pathToFileURL(path.join(root, routePath)).href);
const privateSentinels = ["private-owner", "private-digest", "private-payload", "private-reason", "private-error"];
let receivedActionArguments = null;
setHistoryActionMock(async (...args) => {
  receivedActionArguments = args;
  return {
    status: "ready",
    rows: [
      safeRow({
        authorDisplayName: "route viewer",
        ownerUserId: privateSentinels[0],
        messageCorrelationDigest: privateSentinels[1],
        rawProviderPayload: privateSentinels[2]
      })
    ]
  };
});
const readyResponse = await route.GET();
assert.equal(readyResponse.status, 200, "GET returns success for ready safe history");
assert.equal(readyResponse.headers.get("content-type"), "text/csv; charset=utf-8", "GET success is UTF-8 CSV");
assert.equal(
  readyResponse.headers.get("content-disposition"),
  'attachment; filename="comment-translator-safe-history.csv"',
  "GET success uses the fixed attachment filename"
);
assert.equal(readyResponse.headers.get("cache-control"), "no-store", "GET success is not cached");
assert.deepEqual(receivedActionArguments, [], "GET invokes the existing history action without arguments");
const readyBody = Buffer.from(await readyResponse.arrayBuffer()).toString("utf8");
assert.equal(
  readyBody,
  serializer.serializeCommentTranslatorCreatorSafeHistoryCsv([
    safeRow({
      authorDisplayName: "route viewer",
      ownerUserId: privateSentinels[0],
      messageCorrelationDigest: privateSentinels[1],
      rawProviderPayload: privateSentinels[2]
    })
  ]),
  "GET returns the serializer's bounded safe CSV body"
);
for (const sentinel of privateSentinels.slice(0, 3)) {
  assert.equal(readyBody.includes(sentinel), false, `GET CSV body excludes ${sentinel}`);
}

setHistoryActionMock(async () => ({ status: "unavailable", reason: privateSentinels[3] }));
await assertUnavailableResponse(await route.GET(), "action unavailable", privateSentinels);

setHistoryActionMock(async () => {
  throw new Error(privateSentinels[4]);
});
await assertUnavailableResponse(await route.GET(), "action throw", privateSentinels);

setHistoryActionMock(async () => ({
  status: "ready",
  rows: Array.from({ length: 501 }, () => safeRow({ ownerUserId: privateSentinels[0] }))
}));
await assertUnavailableResponse(await route.GET(), "501 rows", privateSentinels);

setHistoryActionMock(async () => ({ status: "ready", rows: [null, { rawProviderPayload: privateSentinels[2] }] }));
await assertUnavailableResponse(await route.GET(), "malformed row", privateSentinels);
delete globalThis[Symbol.for(historyActionMockKey)];

assert.match(panelSource, /<a\s+[^>]*href=["']\/api\/comment-translator\/history\/export["']/, "panel uses a fixed native download anchor");
assert.match(panelSource, /Only the existing thirty-day safe-history window is exported\./, "panel states the effective thirty-day export window");
assert.match(panelSource, /Current retention and deletion rules continue to apply\./, "panel states the current retention/deletion rules");
assert.match(panelSource, /Downloading does not delete server history or local copies\./, "panel states downloading is non-destructive");
assert.doesNotMatch(panelSource, /fetch\s*\(|useEffect|localStorage|sessionStorage|indexedDB|searchParams|console\./, "panel remains deterministic-props-only without new authority");

process.stdout.write("comment translator Creator NC-X3 safe CSV export contract passed\n");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function readIfPresent(relativePath) {
  const absolutePath = path.join(root, relativePath);
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : "";
}

function setHistoryActionMock(implementation) {
  globalThis[Symbol.for(historyActionMockKey)] = implementation;
}

async function assertUnavailableResponse(response, scenario, forbiddenValues) {
  assert.equal(response.status, 503, `${scenario} fails closed with 503`);
  assert.equal(response.headers.get("content-type"), "text/plain; charset=utf-8", `${scenario} failure is plain text`);
  assert.equal(response.headers.get("cache-control"), "no-store", `${scenario} failure is not cached`);
  assert.equal(response.headers.get("content-disposition"), null, `${scenario} failure is not a CSV attachment`);
  const body = await response.text();
  assert.equal(body, "Safe history export unavailable.", `${scenario} failure body is sanitized and stable`);
  for (const forbiddenValue of forbiddenValues) {
    assert.equal(body.includes(forbiddenValue), false, `${scenario} failure body excludes ${forbiddenValue}`);
  }
  assert.equal(body.includes("author,badge,purchase"), false, `${scenario} failure body does not expose CSV content`);
}

function parseCsv(source) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field === "") {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\r" && source[index + 1] === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      index += 1;
    } else if (character === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  assert.equal(quoted, false, "CSV parser sees balanced quotes");
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function extractFunctionBody(source, name) {
  const markerIndex = source.indexOf(`function ${name}`);
  assert.ok(markerIndex >= 0, `route function exists: ${name}`);
  const openBraceIndex = source.indexOf("{", markerIndex);
  assert.ok(openBraceIndex >= 0, `route function opens a block: ${name}`);
  let depth = 1;
  for (let index = openBraceIndex + 1; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(openBraceIndex + 1, index);
  }
  assert.fail(`route function has a balanced block: ${name}`);
}
