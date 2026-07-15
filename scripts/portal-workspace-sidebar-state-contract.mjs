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

assert.match(
  stateOwnerSource,
  /workspaceSidebarStates\s*=\s*\["expanded",\s*"rail",\s*"hidden"\]\s*as const/,
  "workspace sidebar state owner defines the approved three-state union"
);
assert.match(
  stateOwnerSource,
  /portalWorkspaceSidebarStorageKey\s*=\s*"v-streamer-tools-portal-workspace-sidebar"/,
  "workspace tools share one dedicated browser-local preference key"
);
assert.match(
  stateOwnerSource,
  /portalWorkspaceSidebarStorageVersion\s*=\s*1/,
  "workspace sidebar preference format is explicitly versioned"
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
assert.match(
  portalSidebarSource,
  /workspaceSidebarState === "hidden"/,
  "desktop workspace sidebar can be hidden"
);
assert.match(
  portalSidebarSource,
  /data-portal-workspace-sidebar-state=\{workspaceSidebarState\}/,
  "the current desktop state is observable for behavior and browser QA"
);
assert.match(
  portalSidebarSource,
  /data-portal-workspace-sidebar-control=\{control\.state\}/,
  "each desktop state control is observable without depending on localized copy"
);
assert.match(
  portalSidebarSource,
  /data-portal-workspace-sidebar-reopen="visible-when-hidden"/,
  "hidden workspace mode keeps a dedicated reopen control"
);
assert.match(
  portalSidebarSource,
  /aria-label=\{copy\.workspaceSidebarExpand\}/,
  "the reopen control has a localized accessible name"
);
assert.match(
  portalSidebarSource,
  /aria-expanded=\{workspaceSidebarState !== "hidden"\}/,
  "the reopen control exposes the sidebar visibility state"
);
assert.match(
  portalSidebarSource,
  /aria-label=\{label\}/,
  "rail navigation links retain their full accessible names when visible labels are hidden"
);
assert.match(
  portalSidebarSource,
  /focusTargetRef\.current\s*=\s*"reopen"/,
  "hiding the sidebar schedules focus transfer to the persistent reopen control"
);
assert.match(
  portalSidebarSource,
  /focusTargetRef\.current\s*=\s*"expanded"/,
  "reopening the sidebar schedules focus transfer to the restored expanded-state control"
);
assert.doesNotMatch(
  portalSidebarSource,
  /aria-pressed=\{state === control\.state\}[\s\S]{0,120}aria-expanded=/,
  "three-state selection buttons use aria-pressed without a misleading shared aria-expanded value"
);
assert.match(
  portalSidebarSource,
  /lg:flex|lg:block/,
  "workspace state controls remain desktop-only"
);

assert.match(portalShellSource, /mode === "workspace" \? "lg:hidden"/, "workspace keeps the mobile header path");
assert.match(portalHeaderSource, /lg:hidden/, "mobile drawer remains isolated from desktop sidebar state");
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
