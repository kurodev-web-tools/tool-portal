import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
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

assert.ok(exists("components/portal/SiteTipsDialog.tsx"), "site tips dialog component exists");

const dialog = read("components/portal/SiteTipsDialog.tsx");
assertIncludes(
  dialog,
  [
    "export function SiteTipsDialog",
    "defaultTab = \"page\"",
    "このページ",
    "アカウント",
    "Schedule -> Thumbnail -> SNS",
    "公開中 / 準備中",
    "予定入力",
    "立ち絵 / 画像差し替え",
    "分割数",
    "別ブラウザやスマホでも引き継げる",
    "自動アップロードされない",
    "ツールごとの軽い設定だけ",
    "/tools/schedule-calendar",
    "/tools/thumbnail-editor",
    "/tools/sns-split-image-maker"
  ],
  "site tips dialog public copy and route tips"
);

assertIncludes(
  dialog,
  [
    "hiddenRoutePrefixes",
    "\"/account\"",
    "\"/login\"",
    "\"/signup\"",
    "\"/reset-password\"",
    "isTipsSupportedRoute",
    "role=\"dialog\"",
    "aria-modal=\"true\""
  ],
  "site tips dialog route gate and modal semantics"
);

assertExcludes(
  dialog,
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
  "tips dialog avoids auth flow, storage payload, and schema changes"
);

const header = read("components/portal/PortalHeader.tsx");
assertIncludes(header, ["SiteTipsDialog", "variant=\"header\"", "showTipsButton"], "portal header tips trigger");

const sidebar = read("components/portal/PortalSidebar.tsx");
assertIncludes(sidebar, ["SiteTipsDialog", "variant=\"rail\"", "variant=\"panel\""], "workspace sidebar tips trigger");

const task = read("task.md");
assertIncludes(
  task,
  ["Portal tips modal follow-up", "PR #243", "PR #234 main merge", "site-tips-dialog-contract"],
  "task handoff records tips modal follow-up"
);

console.log("site tips dialog contract checks passed");
