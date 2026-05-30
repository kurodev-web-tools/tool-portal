import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function assertIncludes(source, needles, label) {
  for (const needle of needles) {
    assert.ok(source.includes(needle), `${label} includes ${needle}`);
  }
}

function assertExcludes(source, needles, label) {
  for (const needle of needles) {
    assert.ok(!source.includes(needle), `${label} excludes ${needle}`);
  }
}

function changedFilesAgainstMain() {
  try {
    execFileSync("git", ["rev-parse", "--verify", "origin/main"], { cwd: root, stdio: "ignore" });
    return execFileSync("git", ["diff", "--name-only", "--diff-filter=ACMRTUXB", "origin/main...HEAD"], {
      cwd: root,
      encoding: "utf8"
    }).split(/\r?\n/).filter(Boolean);
  } catch {
    return [];
  }
}

const requiredPages = [
  "app/terms/page.tsx",
  "app/privacy/page.tsx",
  "app/legal/tokushoho/page.tsx"
];

for (const pagePath of requiredPages) {
  assert.ok(exists(pagePath), `${pagePath} exists`);
}

const legalContent = read("lib/legal-content.ts");
const legalFooter = read("components/portal/PortalLegalFooter.tsx");
const portalShell = read("components/portal/PortalShell.tsx");

assertIncludes(legalFooter, ['href="/terms"', 'href="/privacy"', 'href="/legal/tokushoho"'], "legal footer");
assertIncludes(portalShell, ["PortalLegalFooter", 'mode !== "workspace"'], "portal shell footer boundary");

assertIncludes(
  legalContent,
  [
    "Kuro Stream Kit",
    "禁止事項",
    "アカウント停止",
    "出力物",
    "保存データ",
    "免責",
    "ベータ",
    "有料プラン",
    "解約",
    "返金",
    "日本法"
  ],
  "terms content"
);

assertIncludes(
  legalContent,
  [
    "Supabase Auth",
    "メールアドレス",
    "表示設定",
    "Cloudflare",
    "Stripe",
    "GA4",
    "Cookie",
    "ブラウザ内保存",
    "既存 storage key",
    "IndexedDB",
    "handoff payload",
    "AIモデルの学習目的で使用しない",
    "外部サービスへ送信される場合"
  ],
  "privacy content"
);

assertIncludes(
  legalContent,
  [
    "KuroDev",
    "運営責任者",
    "所在地",
    "電話番号",
    "請求があった場合には遅滞なく開示",
    "feedback@kuro-lab.com",
    "各有料プランまたは購入画面に表示",
    "現在、有料プランは準備中です"
  ],
  "tokushoho content"
);

assertExcludes(
  legalContent,
  ["ホームページテンプレート", "テンプレート販売", "Webサイト制作", "制作代行", "フルオーダー", "納品"],
  "Kuro Stream Kit legal content"
);

const changedFiles = changedFilesAgainstMain();
const forbiddenChangedPatterns = [
  /^supabase\//,
  /migration/i,
  /rls/i,
  /storage/i,
  /indexeddb/i,
  /localstorage/i,
  /handoff/i,
  /^lib\/local-preferences\.ts$/,
  /^app\/account\/actions\.ts$/
];

for (const changedFile of changedFiles) {
  assert.ok(
    !forbiddenChangedPatterns.some((pattern) => pattern.test(changedFile)),
    `legal foundation PR must not change storage/schema/payload boundary file: ${changedFile}`
  );
}

console.log("legal foundation contract checks passed");
