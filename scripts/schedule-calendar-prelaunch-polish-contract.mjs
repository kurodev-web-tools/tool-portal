import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const appSourcePath = path.join(root, "components", "schedule-calendar", "ScheduleCalendarApp.tsx");
const scheduleLibSourcePath = path.join(root, "lib", "schedule-calendar.ts");
const scheduleCopySourcePath = path.join(root, "lib", "schedule-calendar-copy.ts");
const handoffSourcePath = path.join(root, "lib", "tool-handoff.ts");
const appSource = fs.readFileSync(appSourcePath, "utf8");
const scheduleLibSource = fs.readFileSync(scheduleLibSourcePath, "utf8");
const scheduleCopySource = fs.readFileSync(scheduleCopySourcePath, "utf8");
const handoffSource = fs.readFileSync(handoffSourcePath, "utf8");

assert.match(
  scheduleCopySource,
  /予定作成から告知文、サムネ、分割画像までつなげます。/,
  "toolbar keeps the public prelaunch workflow visible without a heavy onboarding surface"
);
assert.match(
  scheduleCopySource,
  /Select an event to edit it\. Announcement copy and next-tool handoff stay in Post assist\./,
  "desktop empty state explains the first schedule action"
);
assert.match(
  scheduleCopySource,
  /Add event/,
  "mobile empty state explains the first schedule action"
);
assert.match(
  scheduleCopySource,
  /予定を選ぶと、告知文コピーと Thumbnail Editor \/ SNS分割画像メーカーへの受け渡しをここで確認できます。/,
  "post assist empty state explains the next workflow action"
);
assert.match(
  scheduleCopySource,
  /Thumbnail Editorには予定テキストを初期値として渡します。SNS分割画像メーカーではメイン画像を選んでから個別PNG\/JPEGを書き出します。/,
  "handoff copy keeps Schedule -> Thumbnail -> SNS Split next actions clear"
);
assert.match(
  scheduleCopySource,
  /このブラウザに保存された予定、投稿補助テンプレート、ハッシュタグ、設定をJSONで控えます。復元に失敗した場合、既存データは変更しません。/,
  "backup and restore copy says what is backed up and why restore is safe"
);
assert.match(
  scheduleCopySource,
  /投稿前に要点を絞ると、コピーと次ツールへの受け渡しが確認しやすいです。/,
  "input guard copy stays practical and not punitive"
);
assert.match(appSource, /getScheduleCalendarCopy\(locale\)/, "schedule app resolves localized copy through the active locale");
assert.match(appSource, /schedulePanelScrollRef/, "schedule panel owns an explicit scroll ref for action-driven reset");
assert.match(
  appSource,
  /schedulePanelScrollRef\.current\?\.scrollTo\(\{ top: 0 \}\)/,
  "new-event actions reset the right panel scroll position instead of leaving focus-induced top whitespace"
);
assert.match(scheduleLibSource, /export const scheduleStorageVersion = 2;/, "prelaunch polish does not change the schedule storage version");
assert.match(handoffSource, /const handoffTtlMs = 30 \* 60 \* 1000;/, "prelaunch polish does not change the handoff TTL");
assert.doesNotMatch(handoffSource, /imageData|data:image/, "schedule handoff contract does not start carrying image bodies");

console.log("schedule-calendar prelaunch polish contract checks passed");
