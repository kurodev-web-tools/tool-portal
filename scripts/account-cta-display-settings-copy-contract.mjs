import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertIncludes(source, snippets, label) {
  for (const snippet of snippets) {
    assert.ok(source.includes(snippet), `${label} includes ${snippet}`);
  }
}

function assertExcludes(source, snippets, label) {
  for (const snippet of snippets) {
    assert.equal(source.includes(snippet), false, `${label} excludes ${snippet}`);
  }
}

const portalCopy = read("lib/portal-copy.ts");
assertIncludes(
  portalCopy,
  [
    "別ブラウザやスマホでも引き継げます",
    "下書き、予定本文、画像、handoff payload は自動アップロードしません",
    "Carry language and theme across browsers and phones",
    "Drafts, schedule text, images, and handoff payloads are not uploaded automatically"
  ],
  "portal account CTA display-settings copy"
);

const portalHero = read("components/portal/PortalHeroSummary.tsx");
assertIncludes(
  portalHero,
  ["copy.accountCta", "href=\"/login\"", "copy.accountNote"],
  "home account CTA"
);

const portalSidebar = read("components/portal/PortalSidebar.tsx");
assertIncludes(portalSidebar, ["accountCta.title", "accountCta.body", "accountCta.button"], "sidebar account CTA");

const portalHeader = read("components/portal/PortalHeader.tsx");
assertIncludes(portalHeader, ["accountCta.title", "accountCta.body", "accountCta.button"], "drawer account CTA");

const accountShell = read("components/account/AccountPreferencesShell.tsx");
assertIncludes(
  accountShell,
  [
    "別ブラウザやスマホでも引き継げます",
    "下書き、予定本文、画像、handoff payload は自動アップロードしません",
    "across browsers and phones",
    "handoff payloads are not uploaded automatically"
  ],
  "account page display-settings value and upload boundary copy"
);

const authFlowShell = read("components/account/AuthFlowShell.tsx");
assertIncludes(
  authFlowShell,
  [
    "別ブラウザやスマホでも引き継げます",
    "下書き、予定本文、画像、handoff payload は自動アップロードしません",
    "across browsers and phones",
    "handoff payloads are not uploaded automatically"
  ],
  "auth flow account CTA copy"
);

const forbiddenSources = [portalCopy, accountShell, authFlowShell].join("\n");
assertExcludes(
  forbiddenSources,
  [
    "SUPABASE_SECRET_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "service_role",
    "localStorage.setItem",
    "indexedDB.open",
    "sessionStorage.setItem",
    "create table",
    "alter table"
  ],
  "CTA copy slice avoids auth flow, storage payload, and schema changes"
);

console.log("account CTA display-settings copy contract checks passed");
