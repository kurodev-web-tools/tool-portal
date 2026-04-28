# Schedule Calendar Stability Check 2026-04-28

## Scope

- Target: `/tools/schedule-calendar`
- Purpose: regression prevention, localStorage migration check, and freeze-readiness confirmation.
- Out of scope: API integration, authentication, server persistence, and large UI redesign.

## Width Regression Checklist

| Width | Layout | Add / Edit / Delete | Copy | Open X | Events Tab | Settings Tab | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 390 | Blocked | Blocked | Blocked | Blocked | Blocked | Blocked | Dev server could not be started because Next/TS CLI fails in the local Node runtime. |
| 820 | Blocked | Blocked | Blocked | Blocked | Blocked | Blocked | Dev server could not be started because Next/TS CLI fails in the local Node runtime. |
| 1024 | Blocked | Blocked | Blocked | Blocked | Blocked | Blocked | Dev server could not be started because Next/TS CLI fails in the local Node runtime. |
| 1180 | Blocked | Blocked | Blocked | Blocked | Blocked | Blocked | Dev server could not be started because Next/TS CLI fails in the local Node runtime. |
| 1366 | Blocked | Blocked | Blocked | Blocked | Blocked | Blocked | Dev server could not be started because Next/TS CLI fails in the local Node runtime. |

## localStorage / Import Checklist

| Case | Expected Result | Result |
| --- | --- | --- |
| Legacy event array exists in localStorage | It is normalized into versioned payload with `version`, `events`, `settings`, and `postTemplates`. | Pending |
| Broken JSON exists in localStorage | The app shows a load error and does not overwrite the broken value during initial hydration. | Confirmed by code path: load failure sets `skipNextStorageWriteRef` before hydration completes. |
| Import JSON is invalid | Import is rejected and current events/settings/templates remain unchanged. | Confirmed by code path: state replacement only occurs after parse and payload validation succeed. |
| Import payload is not a schedule payload | Import is rejected and current events/settings/templates remain unchanged. | Confirmed by code path: non-array values without schedule keys are rejected before normalization. |
| Export runs | The textarea receives a versioned JSON payload. | Confirmed by code path: export uses `scheduleStorageVersion` and includes events/settings/postTemplates. |

## Verification Attempts

- `npm run lint`: blocked by Node native assertion before lint starts.
- `npx tsc --noEmit`: blocked by Node native assertion before type-check starts.
- `node node_modules/typescript/bin/tsc --noEmit`: blocked by the same Node native assertion.
- `node node_modules/next/dist/bin/next dev -p 3000`: blocked by the same Node native assertion.
- `node -v`: passed, so the failure is triggered when loading project CLI dependencies, not by launching Node itself.

## Empty / Error Text Policy

- Empty events: `予定はまだありません。`
- Empty search results: `条件に一致する予定はありません。`
- Save failure: `保存できませんでした。ブラウザの保存領域を確認してください。`
- Import failure: `JSONをインポートできませんでした。形式を確認してください。既存データは変更していません。`
- Copy failure: `コピーできませんでした。下の文面を選択して手動でコピーしてください。`
