import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  assert.ok(fs.existsSync(absolutePath), `source exists: ${relativePath}`);
  return fs.readFileSync(absolutePath, "utf8");
}

const wrapperSource = read("components/legal/LocalizedTokushohoDocumentPage.tsx");
const legalDocumentPageSource = read("components/legal/LegalDocumentPage.tsx");
const tokushohoRouteSource = read("app/legal/tokushoho/page.tsx");
const termsRouteSource = read("app/terms/page.tsx");
const privacyRouteSource = read("app/privacy/page.tsx");

assert.match(wrapperSource, /^"use client";\s*$/mu, "Tokushoho wrapper is a client component");
assert.match(
  wrapperSource,
  /import\s+\{\s*useLocale\s*\}\s+from\s+["']@\/components\/portal\/LocaleProvider["']/u,
  "Tokushoho wrapper imports useLocale"
);
assert.match(
  wrapperSource,
  /const\s+\{\s*locale\s*,\s*isLocaleReady\s*\}\s*=\s*useLocale\(\)/u,
  "Tokushoho wrapper reads locale readiness"
);
assert.match(
  wrapperSource,
  /import\s+\{\s*tokushohoDocuments\s*\}\s+from\s+["']@\/lib\/legal-content["']/u,
  "Tokushoho wrapper imports the locale-indexed legal authority"
);

assert.match(
  wrapperSource,
  /const\s+document\s*=\s*isLocaleReady\s*\?\s*tokushohoDocuments\[locale\]\s*:\s*tokushohoDocuments\.ja;/u,
  "Tokushoho wrapper uses a complete Japanese document before locale readiness and the active locale after readiness"
);
assert.match(
  wrapperSource,
  /const\s+dateLabels\s*=\s*isLocaleReady\s*&&\s*locale\s*===\s*["']en["'][\s\S]*?effectiveDate:\s*["']Effective date["'][\s\S]*?updatedDate:\s*["']Last updated["'][\s\S]*?effectiveDate:\s*["']制定日["'][\s\S]*?updatedDate:\s*["']最終更新日["']/u,
  "Tokushoho wrapper defines matching English and Japanese date labels for the atomic document selection"
);
assert.match(
  wrapperSource,
  /<LegalDocumentPage\s+document=\{document\}\s+dateLabels=\{dateLabels\}\s*\/>/u,
  "Tokushoho wrapper passes the selected complete document and matching labels to LegalDocumentPage"
);

assert.match(
  legalDocumentPageSource,
  /dateLabels\?\s*:\s*\{\s*effectiveDate:\s*string;\s*updatedDate:\s*string;\s*\}/su,
  "LegalDocumentPage accepts optional dateLabels"
);
assert.match(
  legalDocumentPageSource,
  /const\s+defaultDateLabels\s*=\s*\{\s*effectiveDate:\s*["']制定日["'],\s*updatedDate:\s*["']最終更新日["']\s*\}/su,
  "LegalDocumentPage keeps the exact Japanese default date labels"
);
assert.match(
  legalDocumentPageSource,
  /dateLabels\s*=\s*defaultDateLabels/u,
  "LegalDocumentPage applies the Japanese labels when dateLabels is omitted"
);
assert.match(legalDocumentPageSource, /\{dateLabels\.effectiveDate\}/u, "effective date label is rendered");
assert.match(legalDocumentPageSource, /\{dateLabels\.updatedDate\}/u, "updated date label is rendered");
assert.match(
  legalDocumentPageSource,
  /document\.sections\.map\(\(section,\s*index\)\s*=>\s*\{\s*const\s+sectionId\s*=\s*`legal-section-\$\{index\}`;/su,
  "LegalDocumentPage derives a stable whitespace-free section ID from the map index"
);
assert.match(legalDocumentPageSource, /<section\s+key=\{sectionId\}\s+aria-labelledby=\{sectionId\}/u, "section references the stable ID");
assert.match(legalDocumentPageSource, /<h2\s+id=\{sectionId\}/u, "heading uses the same stable ID");
assert.doesNotMatch(legalDocumentPageSource, /(?:id|aria-labelledby)=\{section\.heading\}/u, "heading text is not used as an ARIA IDREF");

assert.match(
  tokushohoRouteSource,
  /import\s+\{\s*LocalizedTokushohoDocumentPage\s*\}\s+from\s+["']@\/components\/legal\/LocalizedTokushohoDocumentPage["']/u,
  "Tokushoho route imports its localized wrapper"
);
assert.match(tokushohoRouteSource, /<LocalizedTokushohoDocumentPage\s*\/>/u, "Tokushoho route renders its localized wrapper");
assert.doesNotMatch(tokushohoRouteSource, /<LegalDocumentPage\b/u, "Tokushoho route no longer renders the shared page directly");

function assertUnchangedDirectRoute(source, documentName, label) {
  assert.match(source, /import\s+\{\s*LegalDocumentPage\s*\}/u, `${label} imports LegalDocumentPage directly`);
  assert.match(
    source,
    new RegExp(`<LegalDocumentPage\\s+document=\\{legalDocuments\\.${documentName}\\}\\s*\\/>`, "u"),
    `${label} passes legalDocuments.${documentName} directly to LegalDocumentPage`
  );
  assert.doesNotMatch(source, /LocalizedTokushohoDocumentPage|dateLabels/u, `${label} remains outside Tokushoho localization`);
}

assertUnchangedDirectRoute(termsRouteSource, "terms", "Terms route");
assertUnchangedDirectRoute(privacyRouteSource, "privacy", "Privacy route");

console.log("comment translator Tokushoho rendering contract checks passed");
