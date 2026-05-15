import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const appSourcePath = path.join(root, "components", "schedule-calendar", "ScheduleCalendarApp.tsx");
const scheduleLibSourcePath = path.join(root, "lib", "schedule-calendar.ts");
const handoffSourcePath = path.join(root, "lib", "tool-handoff.ts");
const appSource = fs.readFileSync(appSourcePath, "utf8");
const scheduleLibSource = fs.readFileSync(scheduleLibSourcePath, "utf8");
const handoffSource = fs.readFileSync(handoffSourcePath, "utf8");

assert.match(
  appSource,
  /予定作成から告知文、サムネ、分割画像までつなげます。/,
  "toolbar keeps the public prelaunch workflow visible without a heavy onboarding surface"
);
assert.match(
  appSource,
  /空いている時間をクリック、または右パネルの「新しい予定を追加」から1件作成します。/,
  "desktop empty state explains the first schedule action"
);
assert.match(
  appSource,
  /空いている時間をタップ、または右下の＋から予定を追加できます。/,
  "mobile empty state explains the first schedule action"
);
assert.match(
  appSource,
  /予定を選ぶと、告知文コピーと Thumbnail Editor \/ SNS分割画像メーカーへの受け渡しをここで確認できます。/,
  "post assist empty state explains the next workflow action"
);
assert.match(
  appSource,
  /Thumbnail Editorには予定テキストを初期値として渡します。SNS分割画像メーカーではメイン画像を選んでから個別PNG\/JPEGを書き出します。/,
  "handoff copy keeps Schedule -> Thumbnail -> SNS Split next actions clear"
);
assert.match(
  appSource,
  /このブラウザに保存された予定、投稿補助テンプレート、ハッシュタグ、設定をJSONで控えます。復元に失敗した場合、既存データは変更しません。/,
  "backup and restore copy says what is backed up and why restore is safe"
);
assert.match(
  appSource,
  /投稿前に要点を絞ると、コピーと次ツールへの受け渡しが確認しやすいです。/,
  "input guard copy stays practical and not punitive"
);
assert.match(scheduleLibSource, /export const scheduleStorageVersion = 2;/, "prelaunch polish does not change the schedule storage version");
assert.match(handoffSource, /const handoffTtlMs = 30 \* 60 \* 1000;/, "prelaunch polish does not change the handoff TTL");
assert.doesNotMatch(handoffSource, /imageData|data:image/, "schedule handoff contract does not start carrying image bodies");

console.log("schedule-calendar prelaunch polish contract checks passed");
