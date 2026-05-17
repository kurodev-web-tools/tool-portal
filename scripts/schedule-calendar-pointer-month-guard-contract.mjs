import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const appSourcePath = path.join(root, "components", "schedule-calendar", "ScheduleCalendarApp.tsx");
const scheduleLibSourcePath = path.join(root, "lib", "schedule-calendar.ts");
const appSource = fs.readFileSync(appSourcePath, "utf8");
const scheduleLibSource = fs.readFileSync(scheduleLibSourcePath, "utf8");

assert.match(appSource, /function isFineDesktopPointer\(\)/, "desktop pointer behavior is explicitly detected");
assert.match(
  appSource,
  /window\.matchMedia\("\(pointer: fine\)"\)\.matches/,
  "fine pointer detection uses pointer media query"
);
assert.match(
  appSource,
  /const desktopPointerLayoutQuery = "\(\s*min-width:\s*1280px\s*\)";/,
  "desktop click suppression starts at the 1280px desktop range"
);
assert.match(
  appSource,
  /window\.matchMedia\(desktopPointerLayoutQuery\)\.matches[\s\S]*?window\.matchMedia\("\(pointer: fine\)"\)\.matches/,
  "tablet landscape keeps click detail while 1280px+ fine pointer uses hover-first behavior"
);
assert.match(
  appSource,
  /forceTabletVisible = false/,
  "calendar event preview can be forced visible for tablet landscape selection"
);
assert.match(
  appSource,
  /forceTabletVisible \? "lg:block xl:hidden" : ""/,
  "forced calendar preview is limited to 1024-1279px tablet landscape widths"
);
assert.match(
  appSource,
  /const \[tabletPreviewDismissed, setTabletPreviewDismissed\] = useState\(true\);/,
  "tablet click preview has dismiss state separate from selected event state"
);
assert.match(
  appSource,
  /forceTabletPreview\?: boolean;/,
  "calendar event rows accept explicit tablet preview visibility"
);
assert.match(
  appSource,
  /<EventHoverPreview event=\{event\} placement=\{previewPlacement \?\? \{ side: "center", vertical: getPreviewVerticalPlacement\(event\) \}\} forceTabletVisible=\{forceTabletPreview\} \/>/,
  "week/day calendar pills show selected event preview on tablet landscape click"
);
assert.match(
  appSource,
  /<EventHoverPreview event=\{event\} placement=\{previewPlacement \?\? \{ side: "center", vertical: "below" \}\} forceTabletVisible=\{forceTabletPreview\} \/>/,
  "month calendar rows show selected event preview on tablet landscape click"
);
assert.match(
  appSource,
  /forceSelectedEventPreview=\{!tabletPreviewDismissed\}/,
  "calendar surfaces only force the selected preview while it has not been dismissed"
);
assert.match(
  appSource,
  /setTabletPreviewDismissed\(false\);[\s\S]*?setActiveTab\("schedule"\);[\s\S]*?setMobileScheduleMode\(mobileLayout \? "detail" : "edit"\);/,
  "calendar event click opens tablet preview before switching the right panel to the selected event"
);
assert.match(
  appSource,
  /onPointerDown=\{\(\) => setTabletPreviewDismissed\(true\)\}/,
  "right panel interaction dismisses the tablet calendar preview without closing the detail panel"
);
assert.match(
  appSource,
  /function selectEvent\(event: ScheduleEvent\) \{[\s\S]*?setTabletPreviewDismissed\(true\);/,
  "right panel event selection dismisses calendar preview state"
);
assert.match(
  appSource,
  /function selectEventForCalendar\(event: ScheduleEvent\)/,
  "calendar event selection has a dedicated handler"
);
assert.match(
  appSource,
  /if \(isFineDesktopPointer\(\)\) \{[\s\S]*?setMobileSheetOpen\(false\);[\s\S]*?return;/,
  "fine desktop click selects without forcing the schedule detail panel open"
);
assert.match(
  appSource,
  /const mobileLayout = isMobileLayout\(\);[\s\S]*?setMobileScheduleMode\(mobileLayout \? "detail" : "edit"\);[\s\S]*?setMobileSheetOpen\(mobileLayout\);/,
  "tablet landscape and mobile taps keep the detail/edit panel behavior without forcing a desktop sheet state"
);
assert.match(
  appSource,
  /const mobileLayout = isMobileLayout\(\);[\s\S]*?setMobileScheduleMode\(mobileLayout \? "detail" : "edit"\);[\s\S]*?setMobileSheetOpen\(mobileLayout\);/,
  "right panel event selection only opens the mobile sheet on mobile layouts"
);
assert.match(
  appSource,
  /lg:group-hover:block/,
  "desktop hover preview remains available"
);
assert.equal(
  appSource.includes("lg:group-focus-within:block"),
  false,
  "desktop preview is not pinned by mouse click focus"
);
assert.doesNotMatch(
  appSource,
  /dayEvents\.map\(\(event\) => \([\s\S]*?<EventHoverPreview event=\{event\} \/>[\s\S]*?\)\)/,
  "right panel day event list does not add a persistent preview popover"
);
assert.match(
  appSource,
  /scrollbar-accent grid min-h-0 flex-1 grid-cols-7 auto-rows-\[minmax\(4\.65rem,1fr\)\] overflow-x-hidden overflow-y-auto/,
  "mobile month grid scrolls inside the calendar and guards horizontal overflow"
);
assert.match(
  appSource,
  /min-w-0 overflow-hidden rounded-base border border-primary\/35/,
  "mobile month event chip is clipped inside the day cell instead of widening the body"
);
assert.match(scheduleLibSource, /export const scheduleStorageVersion = 2;/, "pointer/month guard does not change schedule storage version");

console.log("schedule-calendar pointer/month guard contract checks passed");
