import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      for (const extension of [".ts", ".tsx"]) {
        const candidate = path.join(root, `${specifier.slice(2)}${extension}`);
        if (fs.existsSync(candidate)) return { shortCircuit: true, url: pathToFileURL(candidate).href };
      }
    }
    if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
      for (const extension of [".ts", ".tsx"]) {
        const candidate = new URL(`${specifier}${extension}`, context.parentURL);
        if (fs.existsSync(candidate)) return { shortCircuit: true, url: candidate.href };
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith(".ts") || url.endsWith(".tsx")) {
      return {
        format: "module",
        shortCircuit: true,
        source: stripTypeScriptTypes(fs.readFileSync(new URL(url), "utf8"), { mode: "transform", sourceMap: false })
      };
    }
    return nextLoad(url, context);
  }
});

const legalModule = await import(pathToFileURL(path.join(root, "lib/legal-content.ts")).href);
const { legalDocuments, tokushohoDocuments } = legalModule;

assert.ok(tokushohoDocuments, "legal-content exports tokushohoDocuments");
assert.deepEqual(Object.keys(tokushohoDocuments).sort(), ["en", "ja"], "tokushohoDocuments has exactly ja and en locales");
assert.ok(legalDocuments, "legal-content exports legalDocuments");

const japaneseDocument = tokushohoDocuments.ja;
const englishDocument = tokushohoDocuments.en;
assert.ok(japaneseDocument, "Japanese Tokushoho document exists");
assert.ok(englishDocument, "English Tokushoho document exists");
assert.equal(legalDocuments.tokushoho, japaneseDocument, "legacy Tokushoho export aliases the Japanese document");

function sectionShape(section) {
  const kinds = ["rows", "paragraphs", "list"].filter((key) => Array.isArray(section[key]));
  return {
    kind: kinds[0] ?? "empty",
    rowCount: section.rows?.length ?? 0,
    paragraphCount: section.paragraphs?.length ?? 0,
    listCount: section.list?.length ?? 0
  };
}

assert.deepEqual(
  englishDocument.sections.map(sectionShape),
  japaneseDocument.sections.map(sectionShape),
  "Japanese and English section kinds and row/paragraph cardinalities match"
);

function documentText(document) {
  return [
    document.eyebrow,
    document.title,
    document.lead,
    document.effectiveDate,
    document.updatedDate,
    ...document.sections.flatMap((section) => [
      section.heading,
      ...(section.paragraphs ?? []),
      ...(section.list ?? []),
      ...(section.rows ?? []).flatMap((row) => [row.label, row.value])
    ])
  ].join("\n");
}

const japaneseText = documentText(japaneseDocument);
for (const marker of [
  "US$6/月（支払総額・USD請求）",
  "適用される税がある場合はStripe Checkoutで表示されます。",
  "署名済みWebhook",
  "コメント本文は翻訳処理のためOpenAIまたはAzureへ送信されます。",
  "解約は次回更新日から有効",
  "dispute利用者勝訴時",
  "セッション終了後最大24時間",
  "OpenAIは最大30日保持される可能性",
  "Freeは引き続き利用できます。",
  "別の承認ゲートに従います。"
]) {
  assert.ok(japaneseText.includes(marker), `established Japanese legal marker remains: ${marker}`);
}

function sectionByHeading(document, heading) {
  const section = document.sections.find((candidate) => candidate.heading === heading);
  assert.ok(section, `document includes section: ${heading}`);
  return section;
}

function rowByLabel(document, sectionHeading, label) {
  const section = sectionByHeading(document, sectionHeading);
  const row = section.rows?.find((candidate) => candidate.label === label);
  assert.ok(row, `${sectionHeading} includes row: ${label}`);
  return row;
}

function assertRowMarkers(sectionHeading, label, markers) {
  const row = rowByLabel(englishDocument, sectionHeading, label);
  for (const marker of markers) {
    assert.ok(row.value.includes(marker), `English ${label} row includes direct marker: ${marker}`);
  }
}

assert.equal(englishDocument.eyebrow, "Specified Commercial Transactions Act");
assert.equal(englishDocument.title, "Disclosure under the Specified Commercial Transactions Act");
assert.equal(englishDocument.effectiveDate, "May 30, 2026");
assert.equal(englishDocument.updatedDate, "August 15, 2026");

assert.deepEqual(
  sectionByHeading(englishDocument, "Business Information").rows.map((row) => row.label),
  ["Seller", "Operator", "Address", "Phone number", "Email address"],
  "English business-information rows are complete and ordered"
);
assertRowMarkers("Business Information", "Seller", ["KuroDev"]);
assertRowMarkers("Business Information", "Operator", ["disclosed without delay upon request"]);
assertRowMarkers("Business Information", "Address", ["disclosed without delay upon request"]);
assertRowMarkers("Business Information", "Phone number", ["disclosed without delay upon request"]);
assertRowMarkers("Business Information", "Email address", ["feedback@kuro-lab.com"]);

assert.deepEqual(
  sectionByHeading(englishDocument, "Sales Conditions").rows.map((row) => row.label),
  [
    "Sales price",
    "Additional costs",
    "Sales regions",
    "Payment methods",
    "Payment timing",
    "Availability timing",
    "Usage limit and transmission",
    "Cancellation",
    "Refunds and disputes",
    "Account deletion",
    "Data and Providers",
    "Supported environment"
  ],
  "English sales-condition rows are complete and ordered"
);
assertRowMarkers("Sales Conditions", "Sales price", [
  "US$6/month (total price, billed in USD)",
  "Any applicable tax is shown in Stripe Checkout.",
  "Automatic renewal"
]);
assertRowMarkers("Sales Conditions", "Additional costs", [
  "Internet connection",
  "fees incurred by the user during payment"
]);
assertRowMarkers("Sales Conditions", "Sales regions", [
  "Japan (JP) and the United States (US)",
  "country of residence is not determined solely from an IP address"
]);
assertRowMarkers("Sales Conditions", "Payment methods", [
  "credit cards, debit cards",
  "Bank transfer is not supported",
  "Stripe"
]);
assertRowMarkers("Sales Conditions", "Payment timing", [
  "at application and at each contract renewal",
  "before the next renewal date"
]);
assertRowMarkers("Sales Conditions", "Availability timing", [
  "server-side confirmation",
  "signed Webhook",
  "Checkout completion screen alone does not activate Paid access"
]);
assertRowMarkers("Sales Conditions", "Usage limit and transmission", [
  "Up to 500,000 input characters per contract renewal period",
  "not a guaranteed character allowance",
  "Comment text is sent to OpenAI or Azure for translation processing"
]);
assertRowMarkers("Sales Conditions", "Cancellation", [
  "Cancellation is available",
  "Cancellation takes effect at the next renewal date"
]);
assertRowMarkers("Sales Conditions", "Refunds and disputes", [
  "Refunds are not automatic",
  "user wins a dispute",
  "idempotent cancellation",
  "current Subscription and period are valid",
  "no other stop reason exists"
]);
assertRowMarkers("Sales Conditions", "Account deletion", [
  "account deletion",
  "cancel at the end of the period",
  "after the paid period ends",
  "Stripe's retention policy"
]);
assertRowMarkers("Sales Conditions", "Data and Providers", [
  "sanitized feed snapshot",
  "up to 24 hours after the session ends",
  "Provider request details, logs, aggregates, or the idempotency ledger",
  "OpenAI may retain data for up to 30 days",
  "Comment text submitted to Azure Translator is handled under Microsoft's No-Trace policy."
]);
assertRowMarkers("Sales Conditions", "Supported environment", [
  "latest major browsers",
  "PCs, tablets, and smartphones"
]);

const availabilitySection = sectionByHeading(englishDocument, "Current Availability");
assert.ok(
  availabilitySection.paragraphs.some((paragraph) =>
    paragraph.includes("final expert review of tax, the Specified Commercial Transactions Act, and privacy matters")
  ),
  "English availability copy includes the expert-review boundary"
);
assert.ok(
  availabilitySection.paragraphs.some((paragraph) => paragraph.includes("Free remains available.")),
  "English availability copy preserves Free availability"
);
assert.ok(
  availabilitySection.paragraphs.some((paragraph) => paragraph.includes("separate approval gates")),
  "English availability copy preserves separate approval gates"
);

console.log("comment translator Tokushoho content localization contract checks passed");
