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

const publicPortalRoutes = [
  "app/page.tsx",
  "app/tools/page.tsx",
  "app/tools/schedule-calendar/page.tsx",
  "app/tools/thumbnail-editor/page.tsx",
  "app/tools/sns-split-image-maker/page.tsx"
];

for (const route of publicPortalRoutes) {
  const source = read(route);
  assertIncludes(source, ['export const dynamic = "force-dynamic";'], `${route} Workers SSR route mode`);
}

const sidebar = read("components/portal/PortalSidebar.tsx");
const settingsPanel = read("components/portal/PortalSettingsPanel.tsx");
assertExcludes(sidebar, ['{ label: copy.account, href: "/account", icon: "A" }'], "wide sidebar fixed nav account duplicate");
assertIncludes(sidebar, ["accountRailLabel", "href={accountHref}", "aria-label={accountRailLabel}"], "collapsed rail compact account CTA");
assertIncludes(settingsPanel, ["<details", "<summary", "localeLabel", "themeLabel"], "workspace desktop settings panel defaults to a compact summary");
assertIncludes(settingsPanel, ['<LanguageSwitch variant="rail" />', '<ThemeToggle variant="compact" />'], "collapsed rail settings controls remain compact");
assertIncludes(settingsPanel, ['variant === "drawer"', '<LanguageSwitch variant={variant === "drawer" ? "drawer" : "default"} />'], "drawer settings controls remain expanded");

const header = read("components/portal/PortalHeader.tsx");
assertIncludes(header, ["showSettingsControls", "isAccountRoute"], "account/login header settings control gate");
assertExcludes(header, ['{ href: "/account", label: copy.account },'], "drawer fixed account duplicate");

console.log("workers route smoke and account nav contract checks passed");
