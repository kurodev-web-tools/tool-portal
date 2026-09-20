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

const privacy = legalDocuments.privacy;
const terms = legalDocuments.terms;

assert.equal(privacy.effectiveDate, "2026年5月30日", "privacy effective date is unchanged");
assert.equal(privacy.updatedDate, "2026年9月20日", "privacy revision date reflects the backup-exception revision");
assert.equal(terms.effectiveDate, "2026年5月30日", "terms effective date is unchanged");
assert.equal(terms.updatedDate, "2026年9月20日", "terms revision date reflects the backup-exception revision");

assert.equal(tokushohoDocuments.ja.updatedDate, "2026年8月15日", "JA tokushoho revision date is not touched");
assert.equal(tokushohoDocuments.en.updatedDate, "August 15, 2026", "EN tokushoho revision date is not touched");

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

const privacyText = documentText(privacy);
const termsText = documentText(terms);

assert.match(
  privacyText,
  /sanitized feed snapshot（表示用コメント本文、翻訳結果、safe author display name）をセッション終了後最大24時間保存/u,
  "live service DB snapshot retains the existing 24-hour statement"
);
assert.match(
  privacyText,
  /バックアップには作成時点で当サービスDBに存在したsanitized feed snapshotその他のデータの写しが含まれることがあります/u,
  "privacy policy names the backup exception for the feed snapshot"
);
assert.match(
  privacyText,
  /バックアップ内の写しは復旧・保全の目的に限定して使用/u,
  "privacy policy limits the backup copy to recovery and preservation"
);
assert.match(
  privacyText,
  /バックアップ内の写しは最大30日以内に消去します/u,
  "privacy policy states the 30-day maximum for the backup copy"
);
assert.match(
  privacyText,
  /アプリ側のデータを削除した後も、障害復旧用バックアップには削除前の写しが一時的に残る場合があります/u,
  "privacy policy reconciles account deletion with backup residue"
);
assert.match(
  privacyText,
  /個別の即時削除ではなく通常のバックアップローテーションにより削除され、最大30日以内に消去します/u,
  "privacy policy states rotation-based deletion rather than immediate purge"
);
assert.match(
  privacyText,
  /バックアップ内のデータを通常のサービス用途へ再利用することはありません/u,
  "privacy policy states the backup copy is not reused for normal service use"
);

assert.match(
  termsText,
  /障害復旧・データ保全のため、本サービスで扱うデータのバックアップを作成することがあります/u,
  "terms of service describes the disaster-recovery backup"
);
assert.match(
  termsText,
  /その写しは復旧・保全の目的に限定して使用し、通常のサービス提供には使用しません/u,
  "terms of service limits the backup copy and excludes normal service use"
);
assert.match(
  termsText,
  /バックアップは通常のローテーションにより管理され、最大30日以内に消去します/u,
  "terms of service states the 30-day maximum for the backup"
);
assert.match(
  termsText,
  /この写しは復旧・保全の目的に限定して使用し、通常のサービス提供や翻訳処理には使用せず、通常のバックアップローテーションにより最大30日以内に消去します/u,
  "terms of service reconciles the live 24-hour snapshot with the backup copy"
);

const backupParagraphs = [...privacy.sections, ...terms.sections]
  .flatMap((section) => section.paragraphs ?? [])
  .filter((paragraph) => paragraph.includes("バックアップ"));

assert.ok(backupParagraphs.length >= 4, "backup exception paragraphs are present in privacy and terms");
for (const paragraph of backupParagraphs) {
  assert.doesNotMatch(
    paragraph,
    /RPO|RTO|SLA|復旧を保証|復元を保証|可用性を保証|必ず復旧|必ず復元/u,
    "backup exception paragraphs do not create new recovery guarantees"
  );
}

const termsStoredData = terms.sections.find((section) => section.heading === "第6条（保存データ）");
assert.ok(
  termsStoredData?.paragraphs?.some((paragraph) => paragraph.includes("障害復旧・データ保全のため、本サービスで扱うデータのバックアップ")),
  "Terms backup exception is placed in the general stored-data section, not a Paid-only section"
);
const privacyCommentHandling = privacy.sections.find(
  (section) => section.heading === "第4条（コメント翻訳機能の情報取扱い）"
);
assert.ok(
  privacyCommentHandling?.paragraphs?.some((paragraph) => paragraph.includes("バックアップには作成時点で当サービスDBに存在したsanitized feed snapshot")),
  "Privacy backup exception is placed in the general comment-handling section"
);
const privacyRights = privacy.sections.find((section) => section.heading === "第9条（開示・訂正・削除）");
assert.ok(
  privacyRights?.paragraphs?.some((paragraph) => paragraph.includes("アプリ側のデータを削除した後も、障害復旧用バックアップには削除前の写し")),
  "Privacy deletion section reconciles deletion with backup residue"
);

for (const relativePath of ["app/privacy/page.tsx", "app/terms/page.tsx"]) {
  const routeSource = fs.readFileSync(path.join(root, relativePath), "utf8");
  assert.match(routeSource, /legalDocuments\.(privacy|terms)/u, `${relativePath} renders the shared Japanese legal document`);
  assert.doesNotMatch(
    routeSource,
    /locale/u,
    `${relativePath} publishes only the Japanese document; adding an EN privacy/terms route requires the same backup wording in EN`
  );
}

console.log("comment-translator-initial-public-backup-legal-copy-contract: PASS");
