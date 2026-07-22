import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const stateOwnerPath = "components/portal/PortalWorkspaceSidebarState.ts";
const stateOwnerSource = read(stateOwnerPath);
const portalSidebarSource = read("components/portal/PortalSidebar.tsx");
const portalShellSource = read("components/portal/PortalShell.tsx");
const portalHeaderSource = read("components/portal/PortalHeader.tsx");
const portalCopySource = read("lib/portal-copy.ts");

assert.match(
  stateOwnerSource,
  /workspaceSidebarStates\s*=\s*\["expanded",\s*"rail"\]\s*as const/,
  "workspace sidebar state owner defines the approved expanded/compact union"
);
assert.match(
  stateOwnerSource,
  /portalWorkspaceSidebarStorageKey\s*=\s*"v-streamer-tools-portal-workspace-sidebar"/,
  "workspace tools share one dedicated browser-local preference key"
);
assert.match(
  stateOwnerSource,
  /portalWorkspaceSidebarStorageVersion\s*=\s*2/,
  "the two-state workspace sidebar preference uses storage version 2"
);
assert.match(
  stateOwnerSource,
  /defaultPortalWorkspaceSidebarState[^=]*=\s*"expanded"/,
  "missing, malformed, or unknown stored values fall back to expanded"
);
assert.match(
  stateOwnerSource,
  /parsePortalWorkspaceSidebarState/,
  "workspace sidebar storage is parsed at its browser boundary"
);
assert.match(
  stateOwnerSource,
  /payload\.version\s*!==\s*portalWorkspaceSidebarStorageVersion/,
  "unknown storage versions fail closed to the default state"
);
assert.match(
  stateOwnerSource,
  /payload\.version\s*===\s*1[\s\S]{0,360}payload\.state\s*===\s*"hidden"[\s\S]{0,120}return\s+"rail"/,
  "legacy version 1 hidden preferences migrate to the compact rail"
);
assert.match(
  stateOwnerSource,
  /window\.localStorage\.getItem\(portalWorkspaceSidebarStorageKey\)/,
  "workspace mode restores the shared preference from localStorage"
);
assert.match(
  stateOwnerSource,
  /window\.localStorage\.setItem\(\s*portalWorkspaceSidebarStorageKey/,
  "workspace mode persists state changes to the shared preference key"
);
assert.doesNotMatch(
  stateOwnerSource,
  /account|session|email|admin|user|token|credential/i,
  "workspace sidebar storage owner contains no account, session, admin, or credential data"
);

assert.match(
  portalSidebarSource,
  /usePortalWorkspaceSidebarState\(mode === "workspace"\)/,
  "browser-local state logic is enabled only for workspace mode"
);
assert.doesNotMatch(portalSidebarSource, /workspaceSidebarState === "hidden"/, "workspace sidebar no longer has a hidden display state");
assert.match(
  portalSidebarSource,
  /data-portal-workspace-sidebar-state=\{workspaceSidebarState\}/,
  "the current desktop state is observable for behavior and browser QA"
);
assert.match(
  portalSidebarSource,
  /data-portal-workspace-sidebar-toggle="expanded-compact-only"/,
  "the desktop preference is exposed as one expanded/compact action toggle"
);
assert.match(
  portalSidebarSource,
  /data-portal-workspace-sidebar-toggle="expanded-compact-only"[\s\S]{0,500}aria-expanded=\{state === "expanded"\}/,
  "the action toggle exposes the current expanded state"
);
assert.match(
  portalSidebarSource,
  /data-portal-workspace-sidebar-toggle-wrapper="desktop-only"[\s\S]{0,220}hidden[\s\S]{0,80}xl:flex/,
  "the action toggle stays hidden below the 1280px desktop breakpoint"
);
assert.doesNotMatch(portalSidebarSource, /data-portal-workspace-sidebar-reopen/, "the removed hidden state leaves no separate reopen control");
assert.doesNotMatch(portalSidebarSource, /data-portal-workspace-sidebar-control=/, "the old three-button selector is removed");
assert.match(portalSidebarSource, /state === "expanded" \? "rail" : "expanded"/, "the single control toggles only between expanded and compact");
assert.match(portalSidebarSource, /aria-label=\{label\}/, "the icon-only action keeps its localized accessible name");
assert.match(portalSidebarSource, /title=\{label\}/, "the icon-only action reveals localized help on hover");
assert.match(portalCopySource, /workspaceSidebarExpand:\s*"サイドバーを展開"/, "Japanese expand help uses the approved action wording");
assert.match(portalCopySource, /workspaceSidebarRail:\s*"サイドバーをコンパクト表示"/, "Japanese compact help uses the approved action wording");
assert.match(portalCopySource, /workspaceSidebarExpand:\s*"Expand sidebar"/, "English expand help is localized");
assert.match(portalCopySource, /workspaceSidebarRail:\s*"Collapse sidebar"/, "English compact help is localized");
assert.match(
  portalSidebarSource,
  /aria-label=\{label\}/,
  "rail navigation links retain their full accessible names when visible labels are hidden"
);
assert.match(
  portalSidebarSource,
  /data-portal-sidebar-tools="all-tools-in-every-rail"/,
  "the implemented-tools section remains observable in every compact rail"
);
assert.doesNotMatch(
  portalSidebarSource,
  /data-portal-sidebar-tools="all-tools-in-every-rail"[\s\S]{0,180}layout === "rail" \? "hidden"/,
  "rail layout must not hide the implemented-tools section"
);
assert.match(
  portalSidebarSource,
  /layout === "expanded" \? "hidden xl:inline"/,
  "an expanded desktop preference still renders as icon-only below 1280px"
);
assert.match(
  portalSidebarSource,
  /layout === "expanded" \? "lg:w-20 lg:px-2 lg:py-5 xl:w-72 xl:px-4 xl:py-6"/,
  "the expanded preference is forced to an 80px rail from 1024px through 1279px"
);
assert.match(
  portalSidebarSource,
  /data-comment-translator-admin-shortcut="server-allowlisted-admin-only"[\s\S]{0,520}layout === "expanded" \? "justify-center px-2 xl:justify-start xl:px-3"/,
  "the optional admin shortcut follows the tablet rail alignment"
);
assert.match(
  portalSidebarSource,
  /data-comment-translator-admin-shortcut="server-allowlisted-admin-only"[\s\S]{0,1600}layout === "expanded" \? "hidden min-w-0 truncate xl:inline"/,
  "the optional admin shortcut keeps its label hidden in the tablet rail"
);
assert.doesNotMatch(
  portalSidebarSource,
  /aria-pressed=/,
  "the action toggle is not exposed as a selected-state button"
);
assert.match(
  portalSidebarSource,
  /lg:flex|lg:block/,
  "workspace state controls remain desktop-only"
);

assert.match(portalShellSource, /mode === "workspace" \? "lg:hidden"/, "workspace keeps the mobile header path");
assert.match(portalHeaderSource, /lg:hidden/, "mobile drawer remains isolated from desktop sidebar state");
assert.match(
  portalHeaderSource,
  /data-portal-mobile-implemented-tools="shared-sidebar-tools"/,
  "mobile drawer exposes the implemented-tools section for browser QA"
);
assert.match(portalHeaderSource, /sidebarTools\.map/, "mobile drawer reuses the shared implemented-tools source");
assert.match(portalHeaderSource, /getToolCopy\(tool\.id, locale\)\.name/, "mobile drawer localizes every implemented tool name");
assert.match(
  portalHeaderSource,
  /sidebarTools\.map[\s\S]{0,1200}onClick=\{\(\) => setDrawerOpen\(false\)\}/,
  "mobile tool links close the drawer after navigation"
);
assert.doesNotMatch(portalShellSource, /localStorage|workspaceSidebarState/, "server PortalShell owns no browser storage state");
assert.match(portalShellSource, /mode !== "workspace" \? <PortalLegalFooter \/>/, "default-mode footer behavior stays unchanged");

for (const routePath of [
  "app/tools/schedule-calendar/page.tsx",
  "app/tools/thumbnail-editor/page.tsx",
  "app/tools/sns-split-image-maker/page.tsx",
  "app/tools/comment-translator/page.tsx",
  "app/admin/page.tsx",
  "app/admin/comment-translator/page.tsx"
]) {
  assert.match(read(routePath), /<PortalShell mode="workspace"/, `${routePath} still uses the shared workspace shell`);
}

console.log("portal workspace sidebar state contract checks passed");
