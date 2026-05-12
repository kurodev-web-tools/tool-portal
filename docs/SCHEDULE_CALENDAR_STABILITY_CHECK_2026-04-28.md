# Schedule Calendar Stability Check 2026-04-28

## Scope

- Target: `/tools/schedule-calendar`
- Purpose: regression prevention, localStorage migration check, and freeze-readiness confirmation.
- Out of scope: API integration, authentication, server persistence, and large UI redesign.

## Width Regression Checklist

| Width | Layout | Add / Edit / Delete | Copy | Open X | Events Tab | Settings Tab | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 390 | Confirmed | Confirmed | Confirmed | Confirmed | Confirmed | Confirmed | Mobile integrated UI is used. Bottom tabs and FAB are visible; desktop right panel tabs are hidden. |
| 820 | Confirmed | Confirmed | Confirmed | Confirmed | Confirmed | Confirmed | Mobile integrated UI is maintained for portrait tablet width; bottom tabs and FAB are visible. |
| 1024 | Confirmed | Confirmed | Confirmed | Confirmed | Confirmed | Confirmed | Tablet two-pane layout is used. Right panel shows 4 tabs in a 2x2 grid. |
| 1180 | Confirmed | Confirmed | Confirmed | Confirmed | Confirmed | Confirmed | Tablet two-pane layout is maintained. Right panel width remains 300px. |
| 1366 | Confirmed | Confirmed | Confirmed | Confirmed | Confirmed | Confirmed | Desktop two-pane layout is used. Right panel width expands to 360px. |

## localStorage / Import Checklist

| Case | Expected Result | Result |
| --- | --- | --- |
| Legacy event array exists in localStorage | It is normalized into versioned payload with `version`, `events`, `settings`, and `postTemplates`. | Confirmed in browser. |
| Broken JSON exists in localStorage | The app shows a load error and does not overwrite the broken value during initial hydration. | Confirmed in browser and by code path: load failure sets `skipNextStorageWriteRef` before hydration completes. |
| Import JSON is invalid | Import is rejected and current events/settings/templates remain unchanged. | Confirmed in browser and by code path: state replacement only occurs after parse and payload validation succeed. |
| Import payload is not a schedule payload | Import is rejected and current events/settings/templates remain unchanged. | Confirmed by code path: non-array values without schedule keys are rejected before normalization. |
| Export runs | The textarea receives a versioned JSON payload. | Confirmed by code path: export uses `scheduleStorageVersion` and includes events/settings/postTemplates. |

## Verification Attempts

- Browser regression on `http://localhost:3001/tools/schedule-calendar/`: passed for 390 / 820 / 1024 / 1180 / 1366 widths.
- Browser localStorage checks: legacy array migration, broken JSON protection, and invalid import protection passed.
- Browser CRUD/post assist/settings checks: add/edit, template selection, copy, X intent URL, event list filters/sort/selection, and default setting reflection passed.
- `npm run lint`: blocked by Node native assertion before lint starts.
- `npx tsc --noEmit`: blocked by Node native assertion before type-check starts.
- `node node_modules/typescript/bin/tsc --noEmit`: blocked by the same Node native assertion.
- `node node_modules/next/dist/bin/next dev -p 3000`: blocked by the same Node native assertion.
- `node -v`: passed, so the failure is triggered when loading project CLI dependencies, not by launching Node itself.

## Fixes From PR-Readiness Review

- Capped generated event end times at `23:59` instead of `24:00`, because `input type="time"` does not display `24:00`.

## 2026-05-12 Freeze Readiness Pass

- Base: PR #81 `[codex] Add thumbnail quality guard expansion` is merged into `main` / `origin/main` at merge commit `c83649c`.
- Branch / worktree: `codex/schedule-calendar-freeze-readiness` / `.worktrees/schedule-calendar-freeze-readiness` from `origin/main`.
- Scope: Schedule Calendar stability / freeze readiness only. Thumbnail Editor and SNS Split Image Maker implementation were not changed.

### Storage / Migration Result

| Case | Result |
| --- | --- |
| Legacy event array | Migrates through `normalizeStoragePayload()` into version `2` payload. |
| Existing event with `endTime: "24:00"` | Normalized to `23:59` so the time picker and save validation keep a displayable value. |
| Invalid event time such as `25:00` / `99:99` | Falls back to safe `20:00 - 21:00` range during normalization. |
| Invalid default start time such as `24:00` | Falls back to `20:00` so new drafts do not start in an unsaveable state. |
| Storage key / version | `v-streamer-tools:schedule-calendar-events:v1` and version `2` unchanged. |
| Broken JSON / failed import | Existing guard remains unchanged: load/import failure does not replace current data. |

### Width / Input Route Result

| Width | Result |
| --- | --- |
| 390 | Mobile integrated UI confirmed. Bottom tabs visible, desktop right tabs hidden, FAB opens the schedule form. Title, memo, category, platform, and save controls become visible. Console errors: 0. |
| 820 | Mobile integrated UI confirmed. Bottom tabs visible, desktop right tabs hidden, FAB opens the schedule form. Title, memo, category, platform, and save controls become visible. Console errors: 0. |
| 1024 | Tablet two-pane UI confirmed. Desktop right-panel tabs visible. Title, memo, category, and platform inputs visible in the schedule panel. Console errors: 0. |
| 1280 | Desktop two-pane UI confirmed. Desktop right-panel tabs visible. Title, memo, category, and platform inputs visible in the schedule panel. Console errors: 0. |
| 1366 | Desktop two-pane UI confirmed. Desktop right-panel tabs visible. Title, memo, category, and platform inputs visible in the schedule panel. Console errors: 0. |

### Verification Attempts

- `node scripts/schedule-calendar-storage-contract.mjs`: PASS.
- Browser regression on `http://localhost:3002/tools/schedule-calendar/`: passed for `390 / 820 / 1024 / 1280 / 1366` widths.
- `npm run lint`: PASS.
- `npx tsc --noEmit`: PASS.
- `git diff --check`: PASS. LF -> CRLF warnings only.
- UI source / layout was not changed; width checks were still run as freeze-readiness evidence.

## Empty / Error Text Policy

- Empty events: `予定はまだありません。`
- Empty search results: `条件に一致する予定はありません。`
- Save failure: `保存できませんでした。ブラウザの保存領域を確認してください。`
- Import failure: `JSONをインポートできませんでした。形式を確認してください。既存データは変更していません。`
- Copy failure: `コピーできませんでした。下の文面を選択して手動でコピーしてください。`
